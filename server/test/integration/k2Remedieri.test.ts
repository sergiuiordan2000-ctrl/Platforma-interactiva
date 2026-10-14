// K2 (auditul independent, deciziile proprietarului din 14.10.2026):
// - RA-6: un JPEG fără marcajul EOI (trunchiat, eventual cu date lipite) se respinge și prin ruta reală de depunere;
//   nu se salvează nici sesizarea, nici fotografia;
// - CL-5: la eșecul definitiv al trimiterii, în modul `live`, codul de autentificare al cetățeanului nu rămâne în
//   clar în coadă (`body_text` = NULL); la reîncercări corpul rămâne; în `allowlist` (staging) corpul rămâne.

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { CITIZEN_POLICY_VERSION } from '@tmc/shared';
import { LIMITS, type AppContext } from '../../src/context.ts';
import type { DbHandle } from '../../src/db/client.ts';
import { migrate } from '../../src/db/migrations.ts';
import { initBackupMarkers } from '../../src/db/reportCounter.ts';
import { seedConfig } from '../../src/db/seeds.ts';
import { MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { processDue } from '../../src/reports/outbox.ts';
import { loadUatBoundary } from '../../src/uat.ts';
import { Client, Clock, makeApp } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb } from '../helpers/db.ts';
import { V1, reportFlow, type Flow } from '../helpers/reportFlow.ts';

const JPEG = readFileSync(join(import.meta.dirname, '..', 'fixtures', 'exif.jpg'));
const SECRET = 'DATE-ATASATE-K2';

let h: DbHandle;
let root: string;
let storage: string;
let app: FastifyInstance;
let flow: Flow;
let liveApp: FastifyInstance;
let liveCtx: AppContext;
let allowApp: FastifyInstance;
let allowCtx: AppContext;
const clock = new Clock();
const q = async <T>(sql: string, p: unknown[] = []) => (await h.pool.query(sql, p))[0] as T[];
let ipSeq = 1;
/** Adrese IP deterministe (testul nu depinde de aleatoriu); limitele pe IP sunt oricum oprite în aceste aplicații. */
const nextIp = () => `10.66.0.${ipSeq++}`;

const failing = { send: async () => { throw new Error('SMTP indisponibil (test)'); } };
const smtpEnv = {
  SMTP_HOST: '127.0.0.1', SMTP_USER: 'civic-test', SMTP_PASS: 'parola-de-test-smtp',
  MAIL_FROM: 'notificari@civic-test.example', CIVIC_MAIL_DOMAIN: 'civic-test.example',
};

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  root = mkdtempSync(join(tmpdir(), 'civic-k2-'));
  storage = join(root, 'storage');
  const backupDir = join(root, 'backups');
  await initBackupMarkers(h.pool, backupDir);
  mkdirSync(storage, { recursive: true });
  ({ app } = await makeApp(h, clock, { IP_RATE_LIMITS: 'off', STORAGE_DIR: storage, BACKUP_DIR: backupDir }, { uat: loadUatBoundary() }));
  flow = reportFlow(() => app, () => h.pool, clock);
  let cfg;
  ({ app: liveApp, ctx: liveCtx, config: cfg } = await makeApp(h, clock, { IP_RATE_LIMITS: 'off', EMAIL_MODE: 'live', ...smtpEnv }, { mailTransport: failing }));
  assert.equal(cfg.email.mode, 'live', JSON.stringify(cfg.email.problems));
  ({ app: allowApp, ctx: allowCtx, config: cfg } = await makeApp(
    h, clock, { IP_RATE_LIMITS: 'off', EMAIL_MODE: 'allowlist', EMAIL_ALLOWLIST: 'k2.staging@exemplu.test', ...smtpEnv }, { mailTransport: failing },
  ));
  assert.equal(cfg.email.mode, 'allowlist', JSON.stringify(cfg.email.problems));
});

after(async () => {
  await app?.close();
  await liveApp?.close();
  await allowApp?.close();
  await h?.close();
  if (root) rmSync(root, { recursive: true, force: true });
});

const photoFiles = () => {
  try { return readdirSync(join(storage, 'photos')).length; } catch { return 0; }
};

describe('RA-6 (K2): JPEG fără EOI, prin ruta reală de depunere', () => {
  it('trunchiat, cu date lipite (fără EOI) → 422; nicio sesizare și nicio fotografie salvată; JPEG-ul întreg trece', async () => {
    const c = await flow.citizen('k2.foto@exemplu.test');
    const [before] = await q<{ n: number }>('SELECT COUNT(*) AS n FROM reports');
    const filesBefore = photoFiles();

    const bad = Buffer.concat([JPEG.subarray(0, -2), Buffer.from(`PK\u0003\u0004${SECRET}`, 'latin1')]);
    const res = await flow.submit(c, { photos: [bad] });
    assert.equal(res.statusCode, 422, res.body);
    assert.equal(res.json().error.code, 'VALIDATION');
    assert.ok(res.json().error.fields?.photos, 'eroarea este la fotografii');
    const [afterBad] = await q<{ n: number }>('SELECT COUNT(*) AS n FROM reports');
    assert.equal(Number(afterBad!.n), Number(before!.n), 'nicio sesizare salvată');
    assert.equal(photoFiles(), filesBefore, 'niciun fișier de fotografie scris');

    clock.advanceMinutes(1);
    const ok = await flow.submitOk(c, [JPEG]);
    assert.equal(ok.photoKeys.length, 1, 'martor: același JPEG, întreg, este acceptat');
  });
});

describe('CL-5 (K2): codul de autentificare la eșecul definitiv al trimiterii', () => {
  async function requestCode(appX: FastifyInstance, email: string) {
    const c = new Client(appX, undefined, nextIp());
    assert.equal((await c.post(`${V1}/citizen/auth/start`, { email, policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION })).statusCode, 202);
  }
  async function row(email: string) {
    const [r] = await q<{ status: string; attempts: number; body: string | null }>(
      "SELECT status, attempts, body_text AS body FROM email_outbox WHERE kind = 'citizen_login_code' AND recipient = ? ORDER BY created_at DESC, id DESC LIMIT 1",
      [email],
    );
    return r!;
  }
  /** Rulează coada până la eșecul definitiv; verifică pe drum că, la reîncercări, corpul rămâne. */
  async function untilFailed(ctx: AppContext, email: string) {
    let sawRetryWithBody = false;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 20)); // trimiterea imediată (kickOutbox) se termină
      clock.advanceMinutes(LIMITS.emailRetryMinutes.at(-1)! + 1);
      await processDue(ctx);
      const r = await row(email);
      if (r.status === 'queued' && r.attempts > 0 && r.body) sawRetryWithBody = true;
      if (r.status === 'failed') return { r, sawRetryWithBody };
    }
    throw new Error('mesajul nu a ajuns la eșecul definitiv');
  }

  it('live: la reîncercări corpul rămâne; la eșecul definitiv body_text devine NULL', async () => {
    const email = 'k2.live@exemplu.test';
    await requestCode(liveApp, email);
    const { r, sawRetryWithBody } = await untilFailed(liveCtx, email);
    assert.ok(sawRetryWithBody, 'pe parcursul reîncercărilor, corpul a rămas (mesajul putea pleca)');
    assert.equal(r.attempts, LIMITS.emailRetryMinutes.length);
    assert.equal(r.body, null, 'codul nu rămâne în clar');
  });

  it('allowlist (staging): la eșecul definitiv corpul rămâne (pentru dev:show-code)', async () => {
    const email = 'k2.staging@exemplu.test';
    await requestCode(allowApp, email);
    const { r } = await untilFailed(allowCtx, email);
    assert.match(r.body ?? '', /\b\d{6}\b/);
  });
});
