// API Admin pentru conținutul public (B2 §6.2, §6.3; B4): permisiuni, validare, 404 / 409 / 422, audit (5.3.3–5.3.4).

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { bootstrapAdmin, createAdminAccount } from '../../src/accounts.ts';
import { totpCodeAt } from '../../src/auth/totp.ts';
import type { AppContext } from '../../src/context.ts';
import type { DbHandle } from '../../src/db/client.ts';
import { migrate } from '../../src/db/migrations.ts';
import { seedConfig, seedDemo } from '../../src/db/seeds.ts';
import { MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { Client, Clock, makeApp } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb } from '../helpers/db.ts';

const V1 = '/api/v1';
let h: DbHandle;
let app: FastifyInstance;
let ctx: AppContext;
const clock = new Clock();
let sa: Client;
let op: Client;
let anon: Client;
const q = async <T>(sql: string, p: unknown[] = []) => (await h.pool.query(sql, p))[0] as T[];
const auditCount = async (action: string) => Number((await q<{ n: number }>('SELECT COUNT(*) AS n FROM audit_log WHERE action = ?', [action]))[0]!.n);

async function loginNew(email: string, temp: string, newPw: string): Promise<Client> {
  const c = new Client(app);
  const res = await c.post(`${V1}/auth/login`, { email, password: temp });
  if (res.json().mfa === 'enroll') {
    const secret = (await c.post(`${V1}/auth/mfa/enroll/start`)).json().secretBase32;
    await c.post(`${V1}/auth/mfa/enroll/confirm`, { code: totpCodeAt(secret, clock.now()) });
  }
  assert.equal((await c.post(`${V1}/auth/change-password`, { currentPassword: temp, newPassword: newPw })).statusCode, 204);
  clock.advanceMinutes(1);
  return c;
}

const ann = { type: 'news', title: 'Știre de test', summary: 'Rezumat', content: 'Conținut', author: 'Primăria', category: 'Administrație' };

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  await seedDemo(h.pool, SEEDS_DIR, 'development');
  ({ app, ctx } = await makeApp(h, clock));
  ctx.announcementImages = new Set(['/images/comunicate/test.webp']);
  const b = await bootstrapAdmin(h.pool, clock.now(), 'sa@exemplu.test', 'SA');
  sa = await loginNew('sa@exemplu.test', b.temporaryPassword, 'parola-super-admin-2026');
  const o = await createAdminAccount(h.pool, clock.now(), { email: 'op@exemplu.test', displayName: 'Operator', role: 'primarie_operator', createdBy: null });
  op = await loginNew('op@exemplu.test', o.temporaryPassword, 'parola-operatorului-2026');
  anon = new Client(app);
});

after(async () => {
  await app.close();
  await h.close();
});

describe('comunicate (Admin)', () => {
  let id = '';

  it('fără sesiune → 401; lista Admin include ciornele', async () => {
    assert.equal((await anon.get(`${V1}/admin/announcements`)).statusCode, 401);
    assert.equal((await anon.send('POST', `${V1}/admin/announcements`, ann)).statusCode, 401);
    const res = await op.get(`${V1}/admin/announcements?limit=100`);
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().items.length, 7);
    assert.ok('status' in res.json().items[0]);
  });

  it('creare (operator): 201, publicat, vizibil public; audit', async () => {
    const res = await op.post(`${V1}/admin/announcements`, ann);
    assert.equal(res.statusCode, 201);
    id = res.json().id;
    const pub = await anon.get(`${V1}/public/announcements/${id}`);
    assert.equal(pub.statusCode, 200);
    assert.equal(pub.json().publishedAt, clock.now().toISOString());
    assert.equal(await auditCount('announcement.create'), 1);
  });

  it('validare: câmp necunoscut → 400; eveniment fără dată → 422; imagine nepublicată → 422; imagine din listă → OK', async () => {
    assert.equal((await op.post(`${V1}/admin/announcements`, { ...ann, isDemo: true })).statusCode, 400);
    assert.equal((await op.post(`${V1}/admin/announcements`, { ...ann, type: 'event' })).statusCode, 422);
    const bad = await op.post(`${V1}/admin/announcements`, { ...ann, imageUrl: '/images/comunicate/lipsa.webp' });
    assert.equal(bad.statusCode, 422);
    assert.ok(bad.json().error.fields.imageUrl);
    assert.equal((await op.post(`${V1}/admin/announcements`, { ...ann, imageUrl: 'https://images.unsplash.com/x.jpg' })).statusCode, 422);
    assert.equal((await op.send('PATCH', `${V1}/admin/announcements/${id}`, { imageUrl: '/images/comunicate/test.webp' })).statusCode, 204);
    assert.deepEqual((await op.get(`${V1}/admin/announcements/images`)).json().items, ['/images/comunicate/test.webp']);
  });

  it('editare: câmpurile tipului sunt normalizate; `event` fără dată rezultată → 422', async () => {
    assert.equal((await op.send('PATCH', `${V1}/admin/announcements/${id}`, { type: 'event' })).statusCode, 422);
    assert.equal((await op.send('PATCH', `${V1}/admin/announcements/${id}`, { type: 'event', eventDate: '2026-11-01', eventTime: '18:00' })).statusCode, 204);
    assert.equal((await op.send('PATCH', `${V1}/admin/announcements/${id}`, { type: 'news' })).statusCode, 204);
    const [r] = await q<{ event_date: unknown; is_urgent: number }>('SELECT event_date, is_urgent FROM announcements WHERE id = ?', [id]);
    assert.equal(r!.event_date, null);
    assert.equal((await op.send('PATCH', `${V1}/admin/announcements/${id}`, {})).statusCode, 422);
    assert.equal((await op.send('PATCH', `${V1}/admin/announcements/01M3JMZC00Y9CTNMQ1MBDR4ZZ9`, { title: 'X' })).statusCode, 404);
    assert.equal((await op.send('PATCH', `${V1}/admin/announcements/abc`, { title: 'X' })).statusCode, 404);
  });

  it('dezactivare → dispare din public (404); publicare → reapare; fără ștergere (D4)', async () => {
    assert.equal((await op.send('PATCH', `${V1}/admin/announcements/${id}/status`, { status: 'draft' })).statusCode, 204);
    assert.equal((await anon.get(`${V1}/public/announcements/${id}`)).statusCode, 404);
    assert.equal((await op.send('PATCH', `${V1}/admin/announcements/${id}/status`, { status: 'published' })).statusCode, 204);
    assert.equal((await anon.get(`${V1}/public/announcements/${id}`)).statusCode, 200);
    assert.equal(await auditCount('announcement.status'), 2);
    assert.equal((await op.send('DELETE', `${V1}/admin/announcements/${id}`)).statusCode, 404);
  });

  it('CSRF: fără antet sau cu altă origine → 403', async () => {
    const noHeader = await app.inject({ method: 'POST', url: `${V1}/admin/announcements`, payload: ann, headers: { cookie: op.cookie!, origin: 'http://localhost:3000' } });
    assert.equal(noHeader.statusCode, 403);
    const other = await op.send('POST', `${V1}/admin/announcements`, ann, { origin: 'https://evil.example' });
    assert.equal(other.statusCode, 403);
  });
});

describe('Ghidul Primăriei (Admin)', () => {
  let depId = '';
  let srvId = '';

  it('operatorul vede, dar nu poate modifica (B4) → 403', async () => {
    assert.equal((await op.get(`${V1}/admin/directory`)).statusCode, 200);
    assert.equal((await op.send('PATCH', `${V1}/admin/directory/institution`, { shortName: 'X' })).statusCode, 403);
    assert.equal((await op.post(`${V1}/admin/directory/departments`, { name: 'D', description: 'd' })).statusCode, 403);
  });

  it('instituția: modificare parțială + verificare (D10-6); program și audiențe', async () => {
    const res = await sa.send('PATCH', `${V1}/admin/directory/institution`, {
      primaryPhone: '0247 000 111', verifiedAt: '2026-09-30T10:00:00Z', verifiedSource: 'site oficial',
    });
    assert.equal(res.statusCode, 204);
    const d = (await anon.get(`${V1}/public/directory`)).json();
    assert.equal(d.institution.primaryPhone, '0247 000 111');
    assert.equal(d.institution.verifiedSource, 'site oficial');
    assert.equal((await sa.send('PUT', `${V1}/admin/directory/schedule`, { items: [{ day: 'Luni', hours: '08–16' }] })).statusCode, 204);
    assert.deepEqual((await anon.get(`${V1}/public/directory`)).json().institution.schedule, [{ day: 'Luni', hours: '08–16' }]);
    assert.equal((await sa.send('PUT', `${V1}/admin/directory/audience`, { items: [{ role: 'Primar', schedule: 'Marți', registrationNote: '' }] })).statusCode, 204);
    assert.equal(await auditCount('directory.institution.update'), 1);
  });

  it('direcție + serviciu: creare, serviciu cu direcție inexistentă → 422, ștergerea direcției cu servicii → 409', async () => {
    const d = await sa.post(`${V1}/admin/directory/departments`, { name: 'Direcție nouă', description: 'Descriere' });
    assert.equal(d.statusCode, 201);
    depId = d.json().id;
    assert.equal((await sa.post(`${V1}/admin/directory/services`, { departmentId: '01M3JMZC00Y9CTNMQ1MBDR4ZZ9', title: 'S', description: 'D' })).statusCode, 422);
    const s = await sa.post(`${V1}/admin/directory/services`, { departmentId: depId, title: 'Serviciu', description: 'D', documentsRequired: ['CI'] });
    assert.equal(s.statusCode, 201);
    srvId = s.json().id;
    const pub = (await anon.get(`${V1}/public/directory`)).json();
    const srv = pub.services.find((x: { id: string }) => x.id === srvId);
    assert.equal(srv.departmentName, 'Direcție nouă');
    assert.deepEqual(srv.documentsRequired, ['CI']);
    assert.equal((await sa.send('DELETE', `${V1}/admin/directory/departments/${depId}`)).statusCode, 409);
  });

  it('dezactivare → dispare din public; ștergere în ordinea corectă → 204', async () => {
    assert.equal((await sa.send('PATCH', `${V1}/admin/directory/services/${srvId}/toggle`, { isActive: false })).statusCode, 204);
    assert.ok(!(await anon.get(`${V1}/public/directory`)).json().services.some((x: { id: string }) => x.id === srvId));
    assert.ok((await sa.get(`${V1}/admin/directory`)).json().services.some((x: { id: string }) => x.id === srvId));
    assert.equal((await sa.send('DELETE', `${V1}/admin/directory/services/${srvId}`)).statusCode, 204);
    assert.equal((await sa.send('DELETE', `${V1}/admin/directory/departments/${depId}`)).statusCode, 204);
    assert.equal((await sa.send('DELETE', `${V1}/admin/directory/departments/${depId}`)).statusCode, 404);
  });

  it('ordonare: lista completă → noua ordine publică; listă incompletă → 422', async () => {
    const links = (await sa.get(`${V1}/admin/directory`)).json().links.map((l: { id: string }) => l.id);
    const reversed = [...links].reverse();
    assert.equal((await sa.send('PUT', `${V1}/admin/directory/links/order`, { ids: reversed })).statusCode, 204);
    assert.deepEqual((await anon.get(`${V1}/public/directory`)).json().links.map((l: { id: string }) => l.id), reversed);
    assert.equal((await sa.send('PUT', `${V1}/admin/directory/links/order`, { ids: reversed.slice(1) })).statusCode, 422);
    assert.equal((await sa.send('PUT', `${V1}/admin/directory/links/order`, { ids: [reversed[0], reversed[0], ...reversed.slice(2)] })).statusCode, 422);
  });

  it('link cu URL nesigur → 422', async () => {
    const res = await sa.post(`${V1}/admin/directory/links`, { title: 'L', description: 'D', url: 'javascript:alert(1)', category: 'Plăți & Taxe' });
    assert.equal(res.statusCode, 422);
  });
});

describe('Apelul rapid (Admin)', () => {
  it('operatorul vede, dar nu poate modifica → 403', async () => {
    assert.equal((await op.get(`${V1}/admin/quickdial`)).statusCode, 200);
    assert.equal((await op.post(`${V1}/admin/quickdial/categories`, { name: 'C', description: '' })).statusCode, 403);
  });

  it('categorie + contact; ștergerea categoriei cu contacte → 409; countsByCategory (E-7)', async () => {
    const cat = await sa.post(`${V1}/admin/quickdial/categories`, { name: 'Categorie nouă', description: '' });
    assert.equal(cat.statusCode, 201);
    const catId = cat.json().id;
    const con = await sa.post(`${V1}/admin/quickdial/contacts`, {
      categoryId: catId, name: 'Contact', phone: '0247 111 222', formattedPhone: '0247 111 222', availability: '24/7', isEmergency: true,
    });
    assert.equal(con.statusCode, 201);
    const pub = (await anon.get(`${V1}/public/quickdial`)).json();
    assert.equal(pub.countsByCategory[catId], 1);
    assert.equal(pub.contacts.find((x: { id: string }) => x.id === con.json().id).categoryName, 'Categorie nouă');
    assert.equal((await sa.send('DELETE', `${V1}/admin/quickdial/categories/${catId}`)).statusCode, 409);
    assert.equal((await sa.send('DELETE', `${V1}/admin/quickdial/contacts/${con.json().id}`)).statusCode, 204);
    assert.equal((await sa.send('DELETE', `${V1}/admin/quickdial/categories/${catId}`)).statusCode, 204);
    assert.equal(await auditCount('quickdial_category.delete'), 1);
  });

  it('contact cu categorie inexistentă → 422; telefon gol → 422', async () => {
    const base = { name: 'X', phone: '0247', formattedPhone: '0247', availability: '24/7' };
    assert.equal((await sa.post(`${V1}/admin/quickdial/contacts`, { ...base, categoryId: '01M3JMZC00Y9CTNMQ1MBDR4ZZ9' })).statusCode, 422);
    const catId = (await sa.get(`${V1}/admin/quickdial`)).json().categories[0].id;
    assert.equal((await sa.post(`${V1}/admin/quickdial/contacts`, { ...base, categoryId: catId, phone: '' })).statusCode, 422);
  });
});
