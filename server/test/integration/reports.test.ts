// Sesizările pe server (Faza 5.4; B10 §6: sesizări, proiecția publică, stadii / asumare, e-mail `simulated`,
// drepturi exclusive `super_admin`, retenție). Fără moderare (2.3).

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, beforeEach, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { createChallenge, solveChallenge } from 'altcha-lib';
import { deriveKey as shaDeriveKey } from 'altcha-lib/algorithms/sha';
import { CITIZEN_POLICY_VERSION } from '@tmc/shared';
import { bootstrapAdmin } from '../../src/accounts.ts';
import { decryptSecret } from '../../src/auth/crypto.ts';
import { totpCodeAt } from '../../src/auth/totp.ts';
import type { AppContext } from '../../src/context.ts';
import type { DbHandle } from '../../src/db/client.ts';
import { migrate } from '../../src/db/migrations.ts';
import { seedConfig } from '../../src/db/seeds.ts';
import { purgeRetention } from '../../src/maintenance.ts';
import { MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { processDue, type MailMessage } from '../../src/reports/outbox.ts';
import { REPORT_POW_KEY, setSetting } from '../../src/settings.ts';
import { loadUatBoundary } from '../../src/uat.ts';
import { Client, Clock, makeApp } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb } from '../helpers/db.ts';

const V1 = '/api/v1';
const FIX = join(import.meta.dirname, '..', 'fixtures');
const JPEG = readFileSync(join(FIX, 'exif.jpg'));
const WEBP = readFileSync(join(FIX, 'exif.webp'));
const BIG_PX = readFileSync(join(FIX, 'big-5000px.jpg'));
/** În UAT (centrul orașului, nodul OSM „Turnu Măgurele”). */
const IN = { lat: 43.7518306, lng: 24.8691717 };
/** Nikopol, Bulgaria: în afara UAT. */
const OUT = { lat: 43.705, lng: 24.895 };

let h: DbHandle;
let app: FastifyInstance;
let ctx: AppContext;
let storage: string;
const clock = new Clock();
const sent: MailMessage[] = [];
let transportOn = false;
let geocodeResult: Array<{ lat: number; lng: number }> | 'down' = [];
const q = async <T>(sql: string, p: unknown[] = []) => (await h.pool.query(sql, p))[0] as T[];
let ipSeq = 1;
const nextIp = () => `10.0.${Math.floor(ipSeq / 250)}.${(ipSeq++ % 250) + 1}`;

// ——— conturi ———

async function citizen(email: string): Promise<Client> {
  const c = new Client(app, undefined, nextIp());
  const start = await c.post(`${V1}/citizen/auth/start`, { email, policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION });
  assert.equal(start.statusCode, 202);
  const [row] = await q<{ b: string }>(
    "SELECT body_text AS b FROM email_outbox WHERE kind = 'citizen_login_code' AND recipient = ? ORDER BY created_at DESC, id DESC LIMIT 1",
    [email.toLowerCase()],
  );
  const code = row!.b.match(/\b(\d{6})\b/)![1]!;
  assert.equal((await c.post(`${V1}/citizen/auth/verify`, { email, code })).statusCode, 200);
  return c;
}

async function adminLogin(email: string, temp: string, pw: string): Promise<Client> {
  const c = new Client(app, undefined, nextIp());
  const res = await c.post(`${V1}/auth/login`, { email, password: temp });
  if (res.json().mfa === 'enroll') {
    const secret = (await c.post(`${V1}/auth/mfa/enroll/start`)).json().secretBase32;
    await c.post(`${V1}/auth/mfa/enroll/confirm`, { code: totpCodeAt(secret, clock.now()) });
  } else if (res.json().mfa === 'required') {
    const [row] = await q<{ s: Buffer }>('SELECT totp_secret_enc AS s FROM admin_users WHERE email = ?', [email]);
    await c.post(`${V1}/auth/mfa/verify`, { code: totpCodeAt(decryptSecret(ctx.config.secrets.totpEncKey, row!.s), clock.now()) });
  }
  if (temp !== pw) {
    assert.equal((await c.post(`${V1}/auth/change-password`, { currentPassword: temp, newPassword: pw })).statusCode, 204);
  }
  clock.advanceMinutes(1);
  return c;
}

// ——— depunerea ———

function multipart(data: unknown, photos: Buffer[] = [], extraParts: Array<{ name: string; value: string }> = []) {
  const boundary = `----civic${randomUUID()}`;
  const chunks: Buffer[] = [];
  const text = (name: string, value: string) =>
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  text('data', typeof data === 'string' ? data : JSON.stringify(data));
  for (const p of extraParts) text(p.name, p.value);
  photos.forEach((buf, i) => {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="photos"; filename="f${i}.bin"\r\nContent-Type: application/octet-stream\r\n\r\n`,
      ),
      buf,
      Buffer.from('\r\n'),
    );
  });
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return { body: Buffer.concat(chunks), type: `multipart/form-data; boundary=${boundary}` };
}

type Loc = { text: string; lat?: number; lng?: number; source: 'pin' | 'gps_pin' | 'geocoded' | 'text'; approximate?: boolean };

async function formToken(c: Client): Promise<string> {
  const res = await c.get(`${V1}/citizen/reports/form-token`);
  assert.equal(res.statusCode, 200);
  return res.json().formStartedAt;
}

async function submit(
  c: Client,
  opts: {
    location?: Loc;
    photos?: Buffer[];
    transmit?: boolean;
    notify?: boolean;
    key?: string;
    extra?: Record<string, unknown>;
    token?: string;
    wait?: boolean;
    pow?: string;
    description?: string;
  } = {},
) {
  const token = opts.token ?? (await formToken(c));
  if (opts.wait !== false) clock.advanceMinutes(0.2); // 12 s > timpul minim de 8 s
  const data = {
    categoryId: 'iluminat',
    description: opts.description ?? 'Lampa de pe stâlp nu mai funcționează de o săptămână.',
    location: opts.location ?? { text: 'Centru, lângă Primărie', ...IN, source: 'pin' },
    notifyOptIn: opts.notify ?? false,
    transmitToCityHall: opts.transmit ?? false,
    hp: '',
    formStartedAt: token,
    ...(opts.pow ? { pow: opts.pow } : {}),
    ...(opts.extra ?? {}),
  };
  const mp = multipart(data, opts.photos ?? []);
  return c.send('POST', `${V1}/citizen/reports`, mp.body, {
    'content-type': mp.type,
    'idempotency-key': opts.key ?? randomUUID(),
  });
}

async function reportId(ref: string): Promise<string> {
  const [r] = await q<{ id: string }>('SELECT id FROM reports WHERE reference_number = ?', [ref]);
  return r!.id;
}

async function registry(flowEnabled: boolean, primariaMode = 'platform') {
  const res = await superAdmin.send('PUT', `${V1}/admin/settings/registry`, {
    recipientEmail: 'registratura-test@exemplu.test',
    flowEnabled,
    primariaMode,
    agreementReference: 'ACORD-TEST-1',
  });
  assert.equal(res.statusCode, 200, res.body);
  return res.json();
}

let superAdmin: Client;
let operator: Client;

/**
 * Coada: după depunere, `kickOutbox` procesează mesajul neblocant, în paralel cu `processDue`.
 * Se așteaptă până nu mai există rânduri `sending`, apoi se mai rulează o dată procesarea.
 */
async function drain(): Promise<void> {
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 20));
    await processDue(ctx);
    const [x] = await q<{ n: number }>("SELECT COUNT(*) AS n FROM email_outbox WHERE status = 'sending'");
    if (Number(x!.n) === 0) return;
  }
  throw new Error('coada nu s-a golit');
}

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  storage = mkdtempSync(join(tmpdir(), 'civic-reports-'));
  ({ app, ctx } = await makeApp(h, clock, { STORAGE_DIR: storage }, {
    uat: loadUatBoundary(),
    geocode: async () => {
      if (geocodeResult === 'down') {
        const { GeocoderUnavailableError } = await import('../../src/reports/geocoder.ts');
        throw new GeocoderUnavailableError('test');
      }
      return geocodeResult;
    },
  }));
  const b = await bootstrapAdmin(h.pool, clock.now(), 'sa@exemplu.test', 'Super Admin');
  superAdmin = await adminLogin('sa@exemplu.test', b.temporaryPassword, 'parola-super-admin-2026');
  const op = await superAdmin.post(`${V1}/admin/accounts`, { email: 'op@exemplu.test', displayName: 'Operator', role: 'primarie_operator' });
  assert.equal(op.statusCode, 201, op.body);
  operator = await adminLogin('op@exemplu.test', op.json().temporaryPassword, 'parola-operator-2026-x');
});
after(async () => {
  await app.close();
  await h.close();
  rmSync(storage, { recursive: true, force: true });
});
beforeEach(() => {
  ctx.mailTransport = transportOn
    ? { send: async (m) => { sent.push(m); return { providerMessageId: `test-${sent.length}` }; } }
    : undefined;
});

// ——————————————————————————————————————————————

describe('depunerea (B5 §1) și proiecția publică (B5 §3)', () => {
  it('depunere validă → 201 TM-001, publică imediat, fără ID / contact / autor; coordonate cu 4 zecimale', async () => {
    const c = await citizen('ana@exemplu.test');
    const res = await submit(c, { photos: [WEBP, JPEG], location: { text: 'Centru', lat: 43.75183061, lng: 24.86917171, source: 'pin' } });
    assert.equal(res.statusCode, 201, res.body);
    assert.equal(res.json().referenceNumber, 'TM-001');
    const map = (await new Client(app).get(`${V1}/public/map-reports`)).json();
    assert.equal(map.length, 1);
    const r = map[0];
    assert.deepEqual(Object.keys(r).sort(), [
      'categoryId', 'categoryName', 'createdAt', 'locationApproximate', 'photoUrl', 'publicDescription',
      'publicLocation', 'referenceNumber', 'status',
    ]);
    assert.equal(r.publicLocation.lat, 43.7518);
    assert.equal(r.publicLocation.lng, 24.8692);
    assert.equal(r.status, 'new');
    assert.equal(r.locationApproximate, false);
    assert.doesNotMatch(JSON.stringify(map), /ana@|isAnonymous|author|assign|contact/i);
  });

  it('fotografia publică: numai principala, fără EXIF / XMP (T-UPL-3); celelalte → 404', async () => {
    const map = (await new Client(app).get(`${V1}/public/map-reports`)).json();
    const photo = await new Client(app).get(map[0].photoUrl);
    assert.equal(photo.statusCode, 200);
    assert.equal(photo.headers['content-type'], 'image/webp');
    assert.ok(!photo.rawPayload.toString('latin1').includes('SecretCam'));
    assert.ok(!photo.rawPayload.toString('latin1').includes('xmpmeta'));
    const [second] = await q<{ id: string; k: string }>('SELECT id, storage_key AS k FROM report_photos WHERE ordinal = 2');
    assert.equal((await new Client(app).get(`${V1}/public/photos/${second!.id}`)).statusCode, 404);
    assert.ok(!readFileSync(join(storage, second!.k)).toString('latin1').includes('SecretCam'), 'nici fișierul JPEG stocat nu are EXIF');
  });

  it('fără sesiune → 401; cont `pending` → 401', async () => {
    const anon = new Client(app, undefined, nextIp());
    const mp = multipart({});
    assert.equal((await anon.send('POST', `${V1}/citizen/reports`, mp.body, { 'content-type': mp.type, 'idempotency-key': randomUUID() })).statusCode, 401);
    const pending = new Client(app, undefined, nextIp());
    await pending.post(`${V1}/citizen/auth/start`, { email: 'pending@exemplu.test', policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION });
    assert.equal((await pending.get(`${V1}/citizen/reports`)).statusCode, 401);
  });

  it('Idempotency-Key: lipsă → 400; repetat → aceeași sesizare, fără rând nou', async () => {
    const c = await citizen('idem@exemplu.test');
    const token = await formToken(c);
    clock.advanceMinutes(0.2);
    const mp = multipart({ categoryId: 'iluminat', description: 'Lampa de pe stâlp nu merge deloc.', location: { text: 'Centru', ...IN, source: 'pin' }, notifyOptIn: false, transmitToCityHall: false, hp: '', formStartedAt: token });
    assert.equal((await c.send('POST', `${V1}/citizen/reports`, mp.body, { 'content-type': mp.type })).statusCode, 400);
    const key = randomUUID();
    const a = await submit(c, { key, token });
    const b = await submit(c, { key, token });
    assert.equal(a.statusCode, 201);
    assert.equal(b.statusCode, 201);
    assert.equal(a.json().referenceNumber, b.json().referenceNumber);
    const [n] = await q<{ n: number }>('SELECT COUNT(*) AS n FROM reports WHERE idempotency_key = ?', [key]);
    assert.equal(Number(n!.n), 1);
  });

  it('limitele fotografiilor: a 5-a → 413; tip fals → 415; > 3 MB → 413; > 4096 px → 422', async () => {
    const c = await citizen('foto@exemplu.test');
    assert.equal((await submit(c, { photos: [WEBP, WEBP, WEBP, WEBP, WEBP] })).statusCode, 413);
    assert.equal((await submit(c, { photos: [Buffer.from('GIF89a' + 'x'.repeat(200))] })).statusCode, 415);
    const huge = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(3 * 1024 * 1024 + 10)]);
    assert.equal((await submit(c, { photos: [huge] })).statusCode, 413);
    assert.equal((await submit(c, { photos: [BIG_PX] })).statusCode, 422);
    const [n] = await q<{ n: number }>("SELECT COUNT(*) AS n FROM reports r JOIN citizen_accounts a ON a.id = r.author_account_id WHERE a.email_normalized = 'foto@exemplu.test'");
    assert.equal(Number(n!.n), 0, 'nicio sesizare salvată');
  });

  it('câmpuri interzise: `publicationPreference` (2.8) și `email` (A-9) → 400', async () => {
    const c = await citizen('campuri@exemplu.test');
    assert.equal((await submit(c, { extra: { publicationPreference: 'public' } })).statusCode, 400);
    assert.equal((await submit(c, { extra: { email: 'x@y.ro' } })).statusCode, 400);
  });

  it('anti-abuz (B7): capcana și timpul minim → 422 generic, contorizate în rejected_attempts', async () => {
    const c = await citizen('robot@exemplu.test');
    assert.equal((await submit(c, { extra: { hp: 'http://spam' } })).statusCode, 422);
    assert.equal((await submit(c, { wait: false })).statusCode, 422);
    assert.equal((await submit(c, { token: 'falsificat.xx.00' })).statusCode, 422);
    const rows = await q<{ reason: string }>("SELECT reason FROM rejected_attempts WHERE area = 'report'");
    const reasons = new Set(rows.map((r) => r.reason));
    for (const r of ['honeypot', 'too_fast', 'invalid']) assert.ok(reasons.has(r), r);
  });
});

describe('locația (2.4, 2.12, D6-2)', () => {
  it('coordonate în afara UAT → 422', async () => {
    const c = await citizen('out@exemplu.test');
    const res = await submit(c, { location: { text: 'Nikopol', ...OUT, source: 'pin' } });
    assert.equal(res.statusCode, 422);
    assert.equal(res.json().error.code, 'OUTSIDE_UAT');
  });

  it('numai text: se salvează (201), lipsește de pe hartă, apare în lista proprie; corectarea super_admin o aduce pe hartă', async () => {
    const c = await citizen('text@exemplu.test');
    const res = await submit(c, { location: { text: 'Undeva pe Strada Libertății', source: 'text' } });
    assert.equal(res.statusCode, 201);
    const ref = res.json().referenceNumber;
    const map = (await new Client(app).get(`${V1}/public/map-reports`)).json() as Array<{ referenceNumber: string }>;
    assert.ok(!map.some((m) => m.referenceNumber === ref));
    const own = (await c.get(`${V1}/citizen/reports`)).json();
    assert.equal(own[0].referenceNumber, ref);
    assert.equal(own[0].publicLocation.lat, null);
    const id = await reportId(ref);
    assert.equal((await operator.send('PATCH', `${V1}/admin/reports/${id}/location`, { ...IN, reason: 'poziție verificată' })).statusCode, 403);
    assert.equal((await superAdmin.send('PATCH', `${V1}/admin/reports/${id}/location`, { ...OUT, reason: 'test' })).statusCode, 422);
    assert.equal((await superAdmin.send('PATCH', `${V1}/admin/reports/${id}/location`, { ...IN, reason: 'poziție verificată la fața locului' })).statusCode, 204);
    const map2 = (await new Client(app).get(`${V1}/public/map-reports`)).json() as Array<{ referenceNumber: string }>;
    assert.ok(map2.some((m) => m.referenceNumber === ref));
    const [audit] = await q<{ details: unknown }>("SELECT details FROM audit_log WHERE action = 'report.location.correct' AND target_id = ?", [id]);
    const d = (typeof audit!.details === 'string' ? JSON.parse(audit!.details) : audit!.details) as { before: { lat: unknown } };
    assert.equal(d.before.lat, null, 'auditul păstrează valorile inițiale (D6-5)');
  });

  it('geocodarea: în UAT → pin aproximativ; în afara UAT → 404; serviciu căzut → 503; sesizarea geocodată = zonă', async () => {
    const c = await citizen('geo@exemplu.test');
    geocodeResult = [OUT, { lat: 43.7535, lng: 24.8702 }];
    const g = await c.post(`${V1}/citizen/geocode`, { address: 'Strada 1 Mai, Turnu Măgurele' });
    assert.equal(g.statusCode, 200);
    assert.deepEqual(g.json(), { lat: 43.7535, lng: 24.8702, approximate: true });
    geocodeResult = [OUT];
    assert.equal((await c.post(`${V1}/citizen/geocode`, { address: 'Nikopol' })).statusCode, 404);
    geocodeResult = 'down';
    assert.equal((await c.post(`${V1}/citizen/geocode`, { address: 'Strada 1 Mai' })).statusCode, 503);
    assert.equal((await c.post(`${V1}/citizen/geocode`, { address: 'x', extra: 1 })).statusCode, 400);
    const res = await submit(c, { location: { text: 'Strada 1 Mai', lat: 43.7535, lng: 24.8702, source: 'geocoded', approximate: true } });
    assert.equal(res.statusCode, 201);
    const map = (await new Client(app).get(`${V1}/public/map-reports`)).json() as Array<{ referenceNumber: string; locationApproximate: boolean }>;
    assert.equal(map.find((m) => m.referenceNumber === res.json().referenceNumber)!.locationApproximate, true);
  });

  it('D6-6: precizia GPS brută nu se păstrează', async () => {
    const [n] = await q<{ n: number }>('SELECT COUNT(*) AS n FROM reports WHERE gps_accuracy_m IS NOT NULL');
    assert.equal(Number(n!.n), 0);
  });
});

describe('numerotarea TM-XXX (3B, D25–D26)', () => {
  it('concurență: N depuneri simultane → N numere distincte și consecutive', async () => {
    const [before_] = await q<{ v: number }>('SELECT `last_value` AS v FROM report_counter WHERE id = 1');
    const clients = await Promise.all(Array.from({ length: 8 }, (_, i) => citizen(`conc${i}@exemplu.test`)));
    const tokens = await Promise.all(clients.map(formToken));
    clock.advanceMinutes(0.2);
    const results = await Promise.all(clients.map((c, i) => submit(c, { token: tokens[i], wait: false })));
    for (const r of results) assert.equal(r.statusCode, 201, r.body);
    const nums = results.map((r) => Number(r.json().referenceNumber.slice(3))).sort((a, b) => a - b);
    const start = Number(before_!.v) + 1;
    assert.deepEqual(nums, Array.from({ length: 8 }, (_, i) => start + i));
  });

  it('rollback → numărul nu este consumat', async () => {
    const c = await citizen('rollback@exemplu.test');
    const [v0] = await q<{ v: number }>('SELECT `last_value` AS v FROM report_counter WHERE id = 1');
    // eșec forțat ÎN tranzacție, după incrementarea contorului: tabelul fotografiilor lipsește temporar
    await h.pool.query('RENAME TABLE report_photos TO report_photos_off');
    try {
      const res = await submit(c, { photos: [WEBP] });
      assert.equal(res.statusCode, 500);
    } finally {
      await h.pool.query('RENAME TABLE report_photos_off TO report_photos');
    }
    const [v1] = await q<{ v: number }>('SELECT `last_value` AS v FROM report_counter WHERE id = 1');
    assert.equal(Number(v1!.v), Number(v0!.v));
    const tmp = join(storage, 'tmp');
    assert.equal(existsSync(tmp) ? readdirSync(tmp).length : 0, 0, 'fișierele temporare au fost șterse');
    const ok = await submit(c);
    assert.equal(ok.json().referenceNumber, `TM-${String(Number(v0!.v) + 1).padStart(3, '0')}`);
  });

  it('ultima sesizare ștearsă → următoarea primește numărul următor (TM-015 șters → TM-016)', async () => {
    const c = await citizen('seq@exemplu.test');
    const a = (await submit(c)).json().referenceNumber as string;
    assert.equal((await c.send('DELETE', `${V1}/citizen/reports/${a}`)).statusCode, 204);
    const b = (await submit(c)).json().referenceNumber as string;
    assert.equal(Number(b.slice(3)), Number(a.slice(3)) + 1);
  });
});

describe('ștergerea definitivă (A-1, D10–D12, D19–D24, B-7)', () => {
  it('autorul: propria sesizare în orice stare → 204; a altuia → 404', async () => {
    const a = await citizen('autor1@exemplu.test');
    const b = await citizen('autor2@exemplu.test');
    const ref = (await submit(a)).json().referenceNumber;
    assert.equal((await b.send('DELETE', `${V1}/citizen/reports/${ref}`)).statusCode, 404);
    assert.equal((await b.get(`${V1}/citizen/reports/${ref}`)).statusCode, 404);
    await h.pool.query("UPDATE reports SET resolution_status = 'resolved' WHERE reference_number = ?", [ref]);
    assert.equal((await a.send('DELETE', `${V1}/citizen/reports/${ref}`)).statusCode, 204);
  });

  it('super_admin: orice sesizare → 204; operator → 403; după ștergere: 404 peste tot, fișiere, coadă și audit șterse', async () => {
    const c = await citizen('sterge@exemplu.test');
    await registry(false);
    const ref = (await submit(c, { photos: [WEBP, JPEG], transmit: true, notify: true })).json().referenceNumber;
    const id = await reportId(ref);
    await superAdmin.send('PATCH', `${V1}/admin/reports/${id}/location`, { ...IN, reason: 'audit de test' });
    await operator.post(`${V1}/admin/reports/${id}/takeover`);
    const photos = await q<{ id: string; k: string }>('SELECT id, storage_key AS k FROM report_photos WHERE report_id = ?', [id]);
    assert.equal(photos.length, 2);
    const [auditBefore] = await q<{ n: number }>('SELECT COUNT(*) AS n FROM audit_log');

    assert.equal((await operator.send('DELETE', `${V1}/admin/reports/${id}`)).statusCode, 403);
    assert.equal((await superAdmin.send('DELETE', `${V1}/admin/reports/${id}`)).statusCode, 204);

    assert.equal((await superAdmin.get(`${V1}/admin/reports/${id}`)).statusCode, 404);
    assert.equal((await c.get(`${V1}/citizen/reports/${ref}`)).statusCode, 404);
    assert.equal((await new Client(app).get(`${V1}/public/photos/${photos[0]!.id}`)).statusCode, 404);
    for (const p of photos) assert.equal(existsSync(join(storage, p.k)), false);
    const [ob] = await q<{ n: number }>('SELECT COUNT(*) AS n FROM email_outbox WHERE report_id = ?', [id]);
    assert.equal(Number(ob!.n), 0, 'A05-4: niciun rând e-mail rămas');
    const [au] = await q<{ n: number }>("SELECT COUNT(*) AS n FROM audit_log WHERE target_type = 'report' AND target_id = ?", [id]);
    assert.equal(Number(au!.n), 0, 'B-7: nicio urmă în audit');
    const [auditAfter] = await q<{ n: number }>('SELECT COUNT(*) AS n FROM audit_log');
    assert.ok(Number(auditAfter!.n) < Number(auditBefore!.n), 'niciun rând nou la ștergere');
  });

  it('cont blocat → 403 la depunere, dar lista proprie și ștergerea proprie funcționează (D15–D18)', async () => {
    const c = await citizen('blocat@exemplu.test');
    const ref = (await submit(c)).json().referenceNumber;
    const [acc] = await q<{ id: string }>("SELECT id FROM citizen_accounts WHERE email_normalized = 'blocat@exemplu.test'");
    assert.equal((await superAdmin.post(`${V1}/admin/citizens/${acc!.id}/blocks`, { kind: 'temporary' })).statusCode, 201);
    assert.equal((await submit(c)).statusCode, 403);
    assert.equal((await c.get(`${V1}/citizen/reports`)).statusCode, 200);
    assert.equal((await c.send('DELETE', `${V1}/citizen/reports/${ref}`)).statusCode, 204);
  });
});

describe('fluxul către Primărie și coada (B6, 2.1, 2.13, 2.14, pct. 7)', () => {
  it('fără cerere de transmitere → niciun rând `registry_notification`, starea rămâne `new`', async () => {
    const c = await citizen('fara@exemplu.test');
    const id = await reportId((await submit(c)).json().referenceNumber);
    const [n] = await q<{ n: number }>("SELECT COUNT(*) AS n FROM email_outbox WHERE report_id = ? AND kind = 'registry_notification'", [id]);
    assert.equal(Number(n!.n), 0);
    const detail = (await operator.get(`${V1}/admin/reports/${id}`)).json();
    assert.equal(detail.transmission, 'not_requested');
  });

  it('flux oprit → `on_hold`; reactivare → `queued`; `simulated` → starea rămâne `new`', async () => {
    await registry(false);
    const c = await citizen('flux@exemplu.test');
    const id = await reportId((await submit(c, { transmit: true })).json().referenceNumber);
    await processDue(ctx);
    const status = async () =>
      (await q<{ s: string }>("SELECT status AS s FROM email_outbox WHERE report_id = ? AND kind = 'registry_notification'", [id]))[0]!.s;
    assert.equal(await status(), 'on_hold');
    assert.equal((await operator.get(`${V1}/admin/reports/${id}`)).json().transmission, 'on_hold');
    const put = await registry(true);
    assert.ok(put.releasedFromHold >= 1);
    assert.equal(await status(), 'queued');
    await processDue(ctx);
    assert.equal(await status(), 'simulated');
    const [r] = await q<{ s: string }>('SELECT resolution_status AS s FROM reports WHERE id = ?', [id]);
    assert.equal(r!.s, 'new', 'în simulated nu se trece în „în analiză” (2.1)');
  });

  it('2.14: a 4-a transmitere în 24 h → 429', async () => {
    const c = await citizen('trei@exemplu.test');
    for (let i = 0; i < 3; i++) assert.equal((await submit(c, { transmit: true })).statusCode, 201);
    assert.equal((await submit(c, { transmit: true })).statusCode, 429);
    assert.equal((await submit(c, { transmit: false })).statusCode, 201, 'fără transmitere, depunerea merge');
  });

  it('limita pe cont: 5 sesizări / 24 h', async () => {
    const c = await citizen('cinci@exemplu.test');
    for (let i = 0; i < 5; i++) {
      c.ip = nextIp(); // alt IP la fiecare depunere: se verifică limita pe cont, nu pe IP
      assert.equal((await submit(c)).statusCode, 201);
    }
    c.ip = nextIp();
    const res = await submit(c);
    assert.equal(res.statusCode, 429);
    assert.match(res.json().error.message, /Un cont/);
  });

  it('transport care acceptă (captare) → `sent` → `in_analysis` + notificarea autorului; apoi `resolved` numai de Primărie', async () => {
    transportOn = true;
    ctx.mailTransport = { send: async (m) => { sent.push(m); return { providerMessageId: `test-${sent.length}` }; } };
    const cfg = ctx.config.email;
    const saved = cfg.mode;
    (cfg as { mode: string }).mode = 'live';
    try {
      const c = await citizen('notif@exemplu.test');
      const ref = (await submit(c, { transmit: true, notify: true, photos: [JPEG] })).json().referenceNumber;
      const id = await reportId(ref);
      await drain();
      const toCityHall = sent.find((m) => m.subject.includes(ref) && m.to === 'registratura-test@exemplu.test')!;
      assert.ok(toCityHall, 'mesajul către Primărie');
      assert.match(toCityHall.text, /notif@exemplu\.test/);
      assert.match(toCityHall.text, /nu un număr de înregistrare oficial/);
      assert.equal(toCityHall.attachments?.length, 1);
      const [r] = await q<{ s: string }>('SELECT resolution_status AS s FROM reports WHERE id = ?', [id]);
      assert.equal(r!.s, 'in_analysis');
      await drain();
      const toCitizen = sent.find((m) => m.to === 'notif@exemplu.test' && /în analiză/.test(m.subject))!;
      assert.ok(toCitizen, 'notificarea D9');
      assert.doesNotMatch(toCitizen.text, /Lampa/, 'fără descriere (D9-7)');
      assert.ok(toCitizen.headers?.['List-Unsubscribe']);

      assert.equal((await operator.send('PATCH', `${V1}/admin/reports/${id}/resolution`, { status: 'in_analysis' })).statusCode, 409);
      assert.equal((await superAdmin.send('PATCH', `${V1}/admin/reports/${id}/resolution`, { status: 'resolved' })).statusCode, 403);
      await registry(true, 'email_only');
      assert.equal((await operator.send('PATCH', `${V1}/admin/reports/${id}/resolution`, { status: 'resolved' })).statusCode, 403);
      await registry(true, 'platform');
      assert.equal((await operator.send('PATCH', `${V1}/admin/reports/${id}/resolution`, { status: 'resolved' })).statusCode, 200);
      assert.equal((await operator.send('PATCH', `${V1}/admin/reports/${id}/resolution`, { status: 'resolved' })).statusCode, 409);
      const own = (await c.get(`${V1}/citizen/reports/${ref}`)).json();
      assert.equal(own.status, 'resolved');

      // dezabonarea (D9-2)
      const token = toCitizen.text.match(/token=([A-Za-z0-9_-]{43})/)![1]!;
      assert.equal((await new Client(app).post(`${V1}/public/notifications/unsubscribe`, { token })).statusCode, 204);
      assert.equal((await new Client(app).post(`${V1}/public/notifications/unsubscribe`, { token: 'A'.repeat(43) })).statusCode, 404);
    } finally {
      (cfg as { mode: string }).mode = saved;
      transportOn = false;
    }
  });

  it('sesizare netransmisă → `resolved` refuzat (409)', async () => {
    const c = await citizen('netrans@exemplu.test');
    const id = await reportId((await submit(c)).json().referenceNumber);
    assert.equal((await operator.send('PATCH', `${V1}/admin/reports/${id}/resolution`, { status: 'resolved' })).statusCode, 409);
  });

  it('staging (`allowlist`): destinatar în afara listei → `blocked`, sesizarea rămâne `new`', async () => {
    const c = await citizen('allow@exemplu.test'); // contul, înainte de `allowlist` (G3-c5: codurile numai pentru listă)
    const cfg = ctx.config.email;
    const saved = { mode: cfg.mode, allow: cfg.allowlist };
    (cfg as { mode: string }).mode = 'allowlist';
    (cfg as { allowlist: string[] }).allowlist = ['alt@exemplu.test'];
    transportOn = true;
    ctx.mailTransport = { send: async (m) => { sent.push(m); return { providerMessageId: 'x' }; } };
    try {
      const id = await reportId((await submit(c, { transmit: true })).json().referenceNumber);
      await drain();
      const [e] = await q<{ s: string }>("SELECT status AS s FROM email_outbox WHERE report_id = ? AND kind = 'registry_notification'", [id]);
      assert.equal(e!.s, 'blocked');
      const [r] = await q<{ s: string }>('SELECT resolution_status AS s FROM reports WHERE id = ?', [id]);
      assert.equal(r!.s, 'new');
    } finally {
      (cfg as { mode: string }).mode = saved.mode;
      (cfg as { allowlist: string[] }).allowlist = saved.allow;
      transportOn = false;
    }
  });
});

describe('Admin: stadii, asumare / preluare, date personale (6.6, C-3, DN-02, A-8, 2.11, 2.3)', () => {
  let id = '';
  let ref = '';
  before(async () => {
    const c = await citizen('admin-view@exemplu.test');
    ref = (await submit(c)).json().referenceNumber;
    id = await reportId(ref);
  });

  it('asumarea: super_admin (idempotentă), fără audit, fără schimbarea stării; operator → 403', async () => {
    const [a0] = await q<{ n: number }>('SELECT COUNT(*) AS n FROM audit_log');
    assert.equal((await superAdmin.post(`${V1}/admin/reports/${id}/assume`)).json().changed, true);
    assert.equal((await superAdmin.post(`${V1}/admin/reports/${id}/assume`)).json().changed, false);
    assert.equal((await operator.post(`${V1}/admin/reports/${id}/assume`)).statusCode, 403);
    const list = (await superAdmin.get(`${V1}/admin/reports?resolution=new&q=${ref}`)).json();
    const item = list.items.find((i: { id: string }) => i.id === id);
    assert.equal(item.assignees[0].displayName, 'Super Admin');
    assert.equal(item.status, 'new');
    assert.equal((await superAdmin.send('DELETE', `${V1}/admin/reports/${id}/assume`)).statusCode, 204);
    assert.equal((await superAdmin.send('DELETE', `${V1}/admin/reports/${id}/assume`)).statusCode, 409);
    const [a1] = await q<{ n: number }>('SELECT COUNT(*) AS n FROM audit_log');
    assert.equal(Number(a1!.n), Number(a0!.n), 'DN-02');
  });

  it('preluarea: numai operatorul, ireversibilă și idempotentă; starea nu se schimbă; are prioritate în listă', async () => {
    assert.equal((await superAdmin.post(`${V1}/admin/reports/${id}/takeover`)).statusCode, 403);
    assert.equal((await operator.post(`${V1}/admin/reports/${id}/takeover`)).json().changed, true);
    assert.equal((await operator.post(`${V1}/admin/reports/${id}/takeover`)).json().changed, false);
    const list = (await operator.get(`${V1}/admin/reports`)).json();
    assert.equal(list.items[0].cityHallTakenOver, true);
    assert.equal(list.items[0].status, 'new');
  });

  it('A-8 / 2.11: e-mailul autorului și jurnalul e-mail numai pentru super_admin; lista fără contact', async () => {
    const op = (await operator.get(`${V1}/admin/reports/${id}`)).json();
    assert.equal('authorEmail' in op, false);
    assert.equal('emails' in op, false);
    const sa = (await superAdmin.get(`${V1}/admin/reports/${id}`)).json();
    assert.equal(sa.authorEmail, 'admin-view@exemplu.test');
    assert.ok(Array.isArray(sa.emails));
    const list = await superAdmin.get(`${V1}/admin/reports`);
    assert.doesNotMatch(list.body, /@exemplu\.test/);
    assert.equal((await operator.get(`${V1}/admin/email-log`)).statusCode, 403);
    assert.equal((await superAdmin.get(`${V1}/admin/email-log`)).statusCode, 200);
    assert.equal((await operator.get(`${V1}/admin/settings/registry`)).statusCode, 403);
  });

  it('note interne: 201, fără e-mail; moderarea nu există (404)', async () => {
    const [e0] = await q<{ n: number }>('SELECT COUNT(*) AS n FROM email_outbox');
    assert.equal((await operator.post(`${V1}/admin/reports/${id}/responses`, { message: 'Verificat pe teren.' })).statusCode, 201);
    const [e1] = await q<{ n: number }>('SELECT COUNT(*) AS n FROM email_outbox');
    assert.equal(Number(e1!.n), Number(e0!.n));
    assert.equal((await superAdmin.send('PATCH', `${V1}/admin/reports/${id}/moderation`, { status: 'approved' })).statusCode, 404);
  });
});

describe('ALTCHA la sesizări (decizia A1, 30.09.2026)', () => {
  it('oprit: provocarea → 404, depunerea fără `pow` trece; pornit: fără soluție → 422, cu soluție → 201, reluată → 422', async () => {
    const c = await citizen('pow@exemplu.test');
    assert.equal((await c.get(`${V1}/citizen/reports/pow-challenge`)).statusCode, 404);
    assert.equal((await submit(c)).statusCode, 201);
    await setSetting(h.pool, REPORT_POW_KEY, true, clock.now(), null);
    try {
      assert.equal((await submit(c)).statusCode, 422);
      const challenge = (await c.get(`${V1}/citizen/reports/pow-challenge`)).json();
      const solution = await solveChallenge({ challenge, deriveKey: shaDeriveKey });
      const pow = Buffer.from(JSON.stringify({ challenge, solution })).toString('base64');
      assert.equal((await submit(c, { pow })).statusCode, 201);
      assert.equal((await submit(c, { pow })).statusCode, 422, 'anti-reluare');
      const foreign = await createChallenge({ algorithm: 'SHA-256', cost: 1, counter: 3, keyPrefixLength: 16, hmacSignatureSecret: 'alt-secret', deriveKey: shaDeriveKey, expiresAt: new Date(clock.now().getTime() + 60_000) });
      const fsol = await solveChallenge({ challenge: foreign, deriveKey: shaDeriveKey });
      assert.equal((await submit(c, { pow: Buffer.from(JSON.stringify({ challenge: foreign, solution: fsol })).toString('base64') })).statusCode, 422, 'semnătură străină');
    } finally {
      await setSetting(h.pool, REPORT_POW_KEY, false, clock.now(), null);
    }
  });
});

describe('retenția (K-A02-3, REC-01, B-7)', () => {
  it('ziua 44 există; ziua 45 dispare cu fotografii, coadă și audit; contul rămâne (A04-2)', async () => {
    const c = await citizen('retentie@exemplu.test');
    await registry(false);
    const ref = (await submit(c, { photos: [WEBP], transmit: true })).json().referenceNumber;
    const id = await reportId(ref);
    await superAdmin.send('PATCH', `${V1}/admin/reports/${id}/location`, { ...IN, reason: 'audit pentru retenție' });
    const [photo] = await q<{ k: string }>('SELECT storage_key AS k FROM report_photos WHERE report_id = ?', [id]);
    const saved = clock.current;
    try {
      clock.current = new Date(saved.getTime() + 44 * 86_400_000);
      await purgeRetention(ctx);
      assert.equal((await q('SELECT id FROM reports WHERE id = ?', [id])).length, 1);
      clock.current = new Date(saved.getTime() + 45 * 86_400_000 + 60_000);
      await purgeRetention(ctx);
      assert.equal((await q('SELECT id FROM reports WHERE id = ?', [id])).length, 0);
      assert.equal(existsSync(join(storage, photo!.k)), false);
      assert.equal((await q('SELECT id FROM email_outbox WHERE report_id = ?', [id])).length, 0);
      assert.equal((await q("SELECT id FROM audit_log WHERE target_type = 'report' AND target_id = ?", [id])).length, 0);
      assert.equal((await q("SELECT id FROM citizen_accounts WHERE email_normalized = 'retentie@exemplu.test'")).length, 1);
      const [counter] = await q<{ v: number }>('SELECT `last_value` AS v FROM report_counter WHERE id = 1');
      assert.ok(Number(counter!.v) >= Number(ref.slice(3)), 'TM-XXX rămâne rezervat');
    } finally {
      clock.current = saved;
    }
  });
});

describe('sesizările demo (decizia A, 30.09.2026)', () => {
  it('seed:demo: pe hartă, în UAT, is_demo; a doua rulare nu adaugă; după ștergere revin cu numere TM noi', async () => {
    const { seedDemo } = await import('../../src/db/seeds.ts');
    await h.pool.query('DELETE FROM reports');
    await seedDemo(h.pool, SEEDS_DIR, 'development');
    const first = await q<{ id: string; ref: string; demo: number }>('SELECT id, reference_number AS ref, is_demo AS demo FROM reports ORDER BY reference_number');
    assert.equal(first.length, 4);
    assert.ok(first.every((r) => r.demo));
    const map = (await new Client(app).get(`${V1}/public/map-reports`)).json();
    assert.equal(map.length, 4);
    await seedDemo(h.pool, SEEDS_DIR, 'development');
    assert.equal((await q('SELECT id FROM reports')).length, 4);
    await superAdmin.send('DELETE', `${V1}/admin/reports/${first[0]!.id}`);
    await seedDemo(h.pool, SEEDS_DIR, 'development');
    const again = await q<{ id: string; ref: string }>('SELECT id, reference_number AS ref FROM reports WHERE id = ?', [first[0]!.id]);
    assert.notEqual(again[0]!.ref, first[0]!.ref, 'D25–D26: numărul vechi rămâne rezervat');
  });
});
