// Faza 6, varianta B (deciziile D-B2…D-B5 din 13.10.2026; docs/faza6/FAZA_6_ANTIABUZ_FARA_IP.md):
// protecția anti-abuz fără adresa IP a vizitatorului.
// - D-B2: cu limitele pe IP oprite (implicit pe staging și în producție), același IP nu mai împarte o limită comună;
// - D-B3: ALTCHA obligatoriu la cererea de cod;
// - D-B4: cel mult 2 verificări de parolă Admin simultane;
// - D-B5: cel mult 20 de căutări de adresă pe cont, pe oră.

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { CITIZEN_POLICY_VERSION } from '@tmc/shared';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LIMITS } from '../../src/context.ts';
import { loadUatBoundary } from '../../src/uat.ts';
import type { DbHandle } from '../../src/db/client.ts';
import { migrate } from '../../src/db/migrations.ts';
import { seedConfig } from '../../src/db/seeds.ts';
import { MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { Client, Clock, makeApp } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb } from '../helpers/db.ts';

const V1 = '/api/v1';
const SAME_IP = '10.77.0.1';
const POLICY = { policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION };

let h: DbHandle;
let appOn: FastifyInstance; // limitele pe IP pornite (implicit în dezvoltare)
let appOff: FastifyInstance; // limitele pe IP oprite (ca pe staging și în producție)
let appReports: FastifyInstance; // oprite + granița UAT (depunerile cer poziția în municipiu)
let storage: string;
const clock = new Clock();
const q = async <T>(sql: string, p: unknown[] = []) => (await h.pool.query(sql, p))[0] as T[];

async function citizen(app: FastifyInstance, email: string, ip: string): Promise<Client> {
  const c = new Client(app, undefined, ip);
  assert.equal((await c.post(`${V1}/citizen/auth/start`, { email, ...POLICY })).statusCode, 202);
  const [row] = await q<{ b: string }>(
    "SELECT body_text AS b FROM email_outbox WHERE kind = 'citizen_login_code' AND recipient = ? ORDER BY created_at DESC, id DESC LIMIT 1",
    [email],
  );
  const code = row!.b.match(/\b(\d{6})\b/)![1]!;
  assert.equal((await c.post(`${V1}/citizen/auth/verify`, { email, code })).statusCode, 200);
  return c;
}

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  ({ app: appOn } = await makeApp(h, clock));
  ({ app: appOff } = await makeApp(h, clock, { IP_RATE_LIMITS: 'off' }));
  storage = mkdtempSync(join(tmpdir(), 'civic-b-'));
  ({ app: appReports } = await makeApp(h, clock, { IP_RATE_LIMITS: 'off', STORAGE_DIR: storage }, { uat: loadUatBoundary() }));
});

after(async () => {
  await appOn?.close();
  await appOff?.close();
  await appReports?.close();
  await h?.close();
  if (storage) rmSync(storage, { recursive: true, force: true });
});

describe('D-B2: limitele pe IP oprite → același IP nu mai împarte o limită comună', () => {
  it('cereri de cod: peste limita pe IP, de la același IP, pentru adrese diferite → toate 202; cu limitele pornite → 429', async () => {
    const n = LIMITS.citizenStartPerIpPerHour + 1;
    for (let i = 0; i < n; i++) {
      const r = await new Client(appOff, undefined, SAME_IP).post(`${V1}/citizen/auth/start`, { email: `ip.off.${i}@exemplu.test`, ...POLICY });
      assert.equal(r.statusCode, 202, `cererea ${i + 1}`);
    }
    assert.equal((await q("SELECT bucket_key FROM rate_limits WHERE bucket_key LIKE 'citizen:start:ip:%'")).length, 0, 'nimic numărat pe IP');
    const other = '10.77.0.2';
    let last = 0;
    for (let i = 0; i < n; i++) {
      last = (await new Client(appOn, undefined, other).post(`${V1}/citizen/auth/start`, { email: `ip.on.${i}@exemplu.test`, ...POLICY })).statusCode;
    }
    assert.equal(last, 429, 'cu limitele pornite, a 21-a cerere de la același IP');
  });

  it('sesizări: mai multe decât limita pe IP pe oră, de la același IP, din conturi diferite → toate 201', async () => {
    const ip = '10.77.1.1';
    const total = LIMITS.reportsPerIpPerHour + 1;
    const accounts = await Promise.all([citizen(appReports, 'rep.a@exemplu.test', ip), citizen(appReports, 'rep.b@exemplu.test', ip)]);
    for (let i = 0; i < total; i++) {
      const c = accounts[i % 2]!;
      const token = (await c.get(`${V1}/citizen/reports/form-token`)).json().formStartedAt;
      clock.advanceMinutes(0.2);
      const pow = await c.pow(`${V1}/citizen/reports/pow-challenge`);
      const data = {
        categoryId: 'iluminat', description: `Lampa nu funcționează (${i}).`,
        location: { text: 'Centru', lat: 43.7518306, lng: 24.8691717, source: 'pin' },
        notifyOptIn: false, transmitToCityHall: false, hp: '', formStartedAt: token, pow,
      };
      const boundary = `----civic-b-${i}`;
      const body = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="data"\r\n\r\n${JSON.stringify(data)}\r\n--${boundary}--\r\n`);
      const r = await c.send('POST', `${V1}/citizen/reports`, body, { 'content-type': `multipart/form-data; boundary=${boundary}`, 'idempotency-key': randomUUID() });
      assert.equal(r.statusCode, 201, `sesizarea ${i + 1}: ${r.body}`);
    }
  });

  it('autentificare Admin: peste limita pe IP, de la același IP → 401, niciodată RATE_LIMITED', async () => {
    for (let i = 0; i < LIMITS.loginPerIp + 1; i++) {
      const r = await new Client(appOff, undefined, '10.77.2.1').post(`${V1}/auth/login`, { email: 'nimeni@exemplu.test', password: 'parola-gresita-123' });
      assert.equal(r.statusCode, 401, `încercarea ${i + 1}`);
    }
  });
});

describe('D-B3: ALTCHA obligatoriu la cererea de cod', () => {
  it('fără soluție → 400 POW_INVALID, fără cod și fără cont; soluția reluată → 400; bifa lipsă are întâietate (422)', async () => {
    const email = 'fara.pow@exemplu.test';
    const c = new Client(appOff, undefined, '10.77.3.1');
    const r = await c.post(`${V1}/citizen/auth/start`, { email, ...POLICY, pow: undefined });
    assert.equal(r.statusCode, 400);
    assert.equal(r.json().error.code, 'POW_INVALID');
    assert.equal((await q('SELECT id FROM citizen_accounts WHERE email_normalized = ?', [email])).length, 0, 'fără cont');
    assert.equal((await q('SELECT id FROM email_outbox WHERE recipient = ?', [email])).length, 0, 'fără cod');
    const pow = await c.pow(`${V1}/citizen/auth/pow-challenge`);
    assert.equal((await c.post(`${V1}/citizen/auth/start`, { email, ...POLICY, pow })).statusCode, 202);
    assert.equal((await c.post(`${V1}/citizen/auth/start`, { email, ...POLICY, pow })).statusCode, 400, 'anti-reluare');
    assert.equal((await c.post(`${V1}/citizen/auth/start`, { email, pow: undefined })).statusCode, 422, 'bifa se verifică întâi');
  });
});

describe('D-B4: cel mult 2 verificări de parolă Admin simultane', () => {
  it('8 autentificări simultane → unele 429 BUSY cu Retry-After; niciodată mai multe de 2 în curs; după aceea, normal', async () => {
    const all = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        new Client(appOff, undefined, `10.77.4.${i + 1}`).post(`${V1}/auth/login`, { email: 'nimeni2@exemplu.test', password: 'parola-gresita-123' })),
    );
    const busy = all.filter((r) => r.statusCode === 429);
    assert.ok(busy.length >= 1, 'cel puțin o cerere amânată');
    assert.ok(busy.every((r) => r.json().error.code === 'BUSY' && r.headers['retry-after'] === '5'));
    assert.ok(all.filter((r) => r.statusCode === 401).length >= 2, 'două verificări au rulat');
    assert.equal(all.length, busy.length + all.filter((r) => r.statusCode === 401).length);
    const later = await new Client(appOff, undefined, '10.77.4.99').post(`${V1}/auth/login`, { email: 'nimeni2@exemplu.test', password: 'parola-gresita-123' });
    assert.equal(later.statusCode, 401, 'locurile s-au eliberat');
  });
});

describe('D-B5: cel mult 20 de căutări de adresă pe cont, pe oră', () => {
  it('a 21-a căutare a aceluiași cont → 429; alt cont caută normal', async () => {
    const a = await citizen(appOff, 'geo.a@exemplu.test', '10.77.5.1');
    for (let i = 0; i < LIMITS.geocodePerAccountPerHour; i++) {
      const r = await a.post(`${V1}/citizen/geocode`, { address: `Strada ${i}` });
      assert.notEqual(r.statusCode, 429, `căutarea ${i + 1}`);
    }
    assert.equal((await a.post(`${V1}/citizen/geocode`, { address: 'Strada 99' })).statusCode, 429);
    const b = await citizen(appOff, 'geo.b@exemplu.test', '10.77.5.1');
    assert.notEqual((await b.post(`${V1}/citizen/geocode`, { address: 'Strada 1' })).statusCode, 429, 'limita este pe cont, nu pe IP');
  });
});
