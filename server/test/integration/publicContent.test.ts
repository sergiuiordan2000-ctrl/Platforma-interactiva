// API public, numai citire (B2 §3): comunicate, Ghidul Primăriei, Apelul rapid (Faza 5.3.2).

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import type { DbHandle } from '../../src/db/client.ts';
import { migrate } from '../../src/db/migrations.ts';
import { seedConfig, seedDemo } from '../../src/db/seeds.ts';
import { MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { Client, Clock, makeApp } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb } from '../helpers/db.ts';

const V1 = '/api/v1';
let h: DbHandle;
let app: FastifyInstance;
let c: Client;
const clock = new Clock(new Date('2026-10-01T09:00:00.000Z'));
const DRAFT = '01M3JMZC00Y9CTNMQ1MBDR4ZZ1';
const EXPIRED = '01M3JMZC00Y9CTNMQ1MBDR4ZZ2';
const PUBLISHED = '01M3JMZC00Y9CTNMQ1MBDR40WZ';

async function addAnnouncement(id: string, status: string, expiresAt: Date | null) {
  const now = clock.now();
  await h.pool.query(
    `INSERT INTO announcements (id, type, title, summary, content, published_at, author, category, status,
       expires_at, is_demo, created_at, updated_at)
     VALUES (?, 'news', ?, 'r', 'c', ?, 'a', 'Administrație', ?, ?, true, ?, ?)`,
    [id, `test ${status}`, new Date('2026-09-30T10:00:00Z'), status, expiresAt, now, now],
  );
}

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  await seedDemo(h.pool, SEEDS_DIR, 'development');
  await addAnnouncement(DRAFT, 'draft', null);
  await addAnnouncement(EXPIRED, 'published', new Date('2026-09-30T12:00:00Z'));
  // un element inactiv în fiecare colecție a Ghidului și a Apelului rapid
  await h.pool.query("UPDATE directory_departments SET is_active = false WHERE id LIKE '%0X8'");
  await h.pool.query("UPDATE directory_links SET is_active = false ORDER BY sort_order DESC LIMIT 1");
  await h.pool.query("UPDATE quickdial_contacts SET is_active = false ORDER BY sort_order DESC LIMIT 2");
  ({ app } = await makeApp(h, clock));
  c = new Client(app);
});

after(async () => {
  await app.close();
  await h.close();
});

describe('comunicate publice', () => {
  it('lista: numai publicate și neexpirate, cele mai noi primele; fără stare internă', async () => {
    const res = await c.get(`${V1}/public/announcements`);
    assert.equal(res.statusCode, 200);
    const { items, nextCursor } = res.json();
    const ids = items.map((a: { id: string }) => a.id);
    assert.equal(items.length, 7);
    assert.ok(!ids.includes(DRAFT) && !ids.includes(EXPIRED));
    assert.equal(nextCursor, null);
    const dates = items.map((a: { publishedAt: string }) => a.publishedAt);
    assert.deepEqual(dates, [...dates].sort().reverse());
    assert.ok(!('status' in items[0]) && !('createdBy' in items[0]));
  });

  it('paginare: pagini de 3, fără dubluri, până la capăt; cursor invalid → 400', async () => {
    const seen: string[] = [];
    let url = `${V1}/public/announcements?limit=3`;
    for (let i = 0; i < 5; i++) {
      const page = (await c.get(url)).json();
      seen.push(...page.items.map((a: { id: string }) => a.id));
      if (!page.nextCursor) break;
      url = `${V1}/public/announcements?limit=3&cursor=${page.nextCursor}`;
    }
    assert.equal(seen.length, 7);
    assert.equal(new Set(seen).size, 7);
    assert.equal((await c.get(`${V1}/public/announcements?cursor=xyz`)).statusCode, 400);
    assert.equal((await c.get(`${V1}/public/announcements?necunoscut=1`)).statusCode, 400);
    assert.equal((await c.get(`${V1}/public/announcements?limit=101`)).statusCode, 400);
  });

  it('filtru pe tip și sortarea după data evenimentului', async () => {
    const ev = (await c.get(`${V1}/public/announcements?type=event&sort=event_date_asc`)).json().items;
    assert.deepEqual(ev.map((a: { eventDate: string }) => a.eventDate), ['2026-09-30', '2026-10-10', '2026-10-18']);
    const paged = (await c.get(`${V1}/public/announcements?type=event&sort=event_date_asc&limit=2`)).json();
    const rest = (await c.get(`${V1}/public/announcements?type=event&sort=event_date_asc&limit=2&cursor=${paged.nextCursor}`)).json();
    assert.deepEqual([...paged.items, ...rest.items].map((a: { eventDate: string }) => a.eventDate), ['2026-09-30', '2026-10-10', '2026-10-18']);
  });

  it('highlights: ultimul, ultimul eveniment, alerta urgentă, contoarele', async () => {
    const hl = (await c.get(`${V1}/public/announcements/highlights`)).json();
    assert.equal(hl.latest.id, '01M3JMZC00Y9CTNMQ1MBDR40WX');
    assert.equal(hl.latestEvent.type, 'event');
    assert.equal(hl.urgentAlert.isUrgent, true);
    assert.deepEqual(hl.counts, { all: 7, notification: 1, announcement: 1, news: 2, event: 3 });
  });

  it('detaliu: publicat → 200; ciornă, expirat, inexistent, ID invalid → 404', async () => {
    const ok = await c.get(`${V1}/public/announcements/${PUBLISHED}`);
    assert.equal(ok.statusCode, 200);
    assert.equal(ok.json().id, PUBLISHED);
    for (const id of [DRAFT, EXPIRED, '01M3JMZC00Y9CTNMQ1MBDR4ZZ9', 'abc']) {
      assert.equal((await c.get(`${V1}/public/announcements/${id}`)).statusCode, 404, id);
    }
  });

  it('expirarea contează la momentul cererii (ceasul aplicației)', async () => {
    const LATER = '01M3JMZC00Y9CTNMQ1MBDR4ZZ3';
    await addAnnouncement(LATER, 'published', new Date(clock.now().getTime() + 60 * 60_000));
    assert.equal((await c.get(`${V1}/public/announcements/${LATER}`)).statusCode, 200);
    clock.advanceMinutes(61);
    assert.equal((await c.get(`${V1}/public/announcements/${LATER}`)).statusCode, 404);
  });
});

describe('Ghidul Primăriei și Apelul rapid (public)', () => {
  it('ghid: instituția, numai elementele active, serviciile cu numele direcției', async () => {
    const res = await c.get(`${V1}/public/directory`);
    assert.equal(res.statusCode, 200);
    const d = res.json();
    assert.ok(d.institution.institutionName);
    assert.ok(Array.isArray(d.institution.schedule) && d.institution.schedule.length > 0);
    assert.equal(d.departments.length, 4);
    assert.ok(d.departments.every((x: { isActive: boolean }) => x.isActive));
    assert.equal(d.links.length, 3);
    assert.ok(d.services.every((s: { departmentName: string }) => s.departmentName.length > 0));
    const orders = d.departments.map((x: { order: number }) => x.order);
    assert.deepEqual(orders, [...orders].sort((a: number, b: number) => a - b));
  });

  it('apel rapid: numai contactele active; countsByCategory corespunde listei (E-7)', async () => {
    const qd = (await c.get(`${V1}/public/quickdial`)).json();
    assert.equal(qd.contacts.length, 16);
    assert.equal(qd.categories.length, 5);
    const total = Object.values(qd.countsByCategory as Record<string, number>).reduce((a, b) => a + b, 0);
    assert.equal(total, qd.contacts.length);
    assert.ok(qd.contacts.every((x: { categoryName: string; isActive: boolean }) => x.categoryName && x.isActive));
  });

  it('nicio metodă de scriere pe rutele publice', async () => {
    assert.equal((await c.send('POST', `${V1}/public/announcements`, {})).statusCode, 404);
    assert.equal((await c.send('PATCH', `${V1}/public/directory`, {})).statusCode, 404);
  });
});
