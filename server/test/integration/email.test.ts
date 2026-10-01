// Faza 5.5a: e-mailul real prin SMTP (B6), testat cu un server SMTP local (`smtp-server`, numai în teste).
// Modul `allowlist` (E-5, G3-c5), TLS obligatoriu, expeditorul pe domeniul Civic (N3-4), fără Reply-To (A17-6),
// atașamentele către Primărie (N3-7), codurile de cont trimise imediat, retenția de 45 de zile (B6 §6).

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { SMTPServer } from 'smtp-server';
import { CITIZEN_POLICY_VERSION } from '@tmc/shared';
import { bootstrapAdmin } from '../../src/accounts.ts';
import { totpCodeAt } from '../../src/auth/totp.ts';
import { loadConfig } from '../../src/config.ts';
import type { AppContext } from '../../src/context.ts';
import type { DbHandle } from '../../src/db/client.ts';
import { migrate } from '../../src/db/migrations.ts';
import { seedConfig } from '../../src/db/seeds.ts';
import { purgeRetention } from '../../src/maintenance.ts';
import { MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { processDue } from '../../src/reports/outbox.ts';
import { createSmtpTransport } from '../../src/reports/smtp.ts';
import { setSetting } from '../../src/settings.ts';
import { loadUatBoundary } from '../../src/uat.ts';
import { Client, Clock, makeApp } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb, testDatabaseUrl } from '../helpers/db.ts';
import { testEnv } from '../helpers/env.ts';

const V1 = '/api/v1';
const JPEG = readFileSync(join(import.meta.dirname, '..', 'fixtures', 'exif.jpg'));
const IN = { lat: 43.7518306, lng: 24.8691717 };
const SMTP_USER = 'civic-test';
const SMTP_PASS = `parola-smtp-${randomUUID()}`;
const ALLOWED = 'ana@exemplu.test';
const REGISTRY = 'registratura-test@exemplu.test';

// certificat TLS pentru serverul SMTP local, generat la rulare (fără chei în repository)
const certDir = mkdtempSync(join(tmpdir(), 'civic-smtp-'));
const ssl = spawnSync('openssl', [
  'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2', '-subj', '/CN=localhost',
  '-addext', 'subjectAltName=IP:127.0.0.1,DNS:localhost',
  '-keyout', join(certDir, 'key.pem'), '-out', join(certDir, 'cert.pem'),
], { encoding: 'utf8' });
const NO_OPENSSL = ssl.status !== 0 ? 'openssl indisponibil: testele SMTP cu TLS nu pot rula pe acest calculator (rulează în CI)' : false;
const KEY = NO_OPENSSL ? '' : readFileSync(join(certDir, 'key.pem'));
const CERT = NO_OPENSSL ? '' : readFileSync(join(certDir, 'cert.pem'));

type Received = { from: string; to: string[]; raw: string };
const received: Received[] = [];

function smtpServer(opts: { noTls?: boolean } = {}): Promise<{ server: SMTPServer; port: number }> {
  const server = new SMTPServer({
    secure: false,
    key: KEY,
    cert: CERT,
    // fără TLS: STARTTLS dezactivat, autentificarea permisă și fără TLS → singurul motiv de refuz este cerința de TLS a clientului
    ...(opts.noTls ? { disabledCommands: ['STARTTLS'], allowInsecureAuth: true } : {}),
    authMethods: ['PLAIN', 'LOGIN'],
    logger: false,
    onAuth(auth, _session, cb) {
      if (auth.username === SMTP_USER && auth.password === SMTP_PASS) return cb(null, { user: SMTP_USER });
      return cb(new Error('Autentificare refuzată'));
    },
    onData(stream, session, cb) {
      const chunks: Buffer[] = [];
      stream.on('data', (c: Buffer) => chunks.push(c));
      stream.on('end', () => {
        received.push({
          from: session.envelope.mailFrom ? session.envelope.mailFrom.address : '',
          to: session.envelope.rcptTo.map((r) => r.address),
          raw: Buffer.concat(chunks).toString('utf8'),
        });
        cb();
      });
    },
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: (server.server.address() as AddressInfo).port })));
}

let h: DbHandle;
let app: FastifyInstance;
let ctx: AppContext;
let storage: string;
let smtp: SMTPServer;
let smtpPort = 0;
let superAdmin: Client;
const clock = new Clock();
const q = async <T>(sql: string, p: unknown[] = []) => (await h.pool.query(sql, p))[0] as T[];
let ipSeq = 1;
const nextIp = () => `10.9.0.${ipSeq++}`;
const smtpEnv = () => ({
  STORAGE_DIR: storage,
  EMAIL_MODE: 'allowlist',
  EMAIL_ALLOWLIST: `${ALLOWED}, ${REGISTRY}`,
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: String(smtpPort),
  SMTP_SECURE: 'false',
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM: 'notificari@civic-test.example',
  CIVIC_MAIL_DOMAIN: 'civic-test.example',
});

async function waitFor<T>(fn: () => Promise<T | undefined> | T | undefined, what: string): Promise<T> {
  for (let i = 0; i < 100; i++) {
    const v = await fn();
    if (v !== undefined) return v;
    await new Promise((r) => setTimeout(r, 30));
  }
  throw new Error(`timp depășit: ${what}`);
}

async function drain(): Promise<void> {
  for (let i = 0; i < 100; i++) {
    await new Promise((r) => setTimeout(r, 30));
    await processDue(ctx);
    const [x] = await q<{ n: number }>("SELECT COUNT(*) AS n FROM email_outbox WHERE status IN ('sending', 'queued')");
    if (Number(x!.n) === 0) return;
  }
  throw new Error('coada nu s-a golit');
}

async function citizen(email: string): Promise<Client> {
  const c = new Client(app, undefined, nextIp());
  assert.equal((await c.post(`${V1}/citizen/auth/start`, { email, policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION })).statusCode, 202);
  const [row] = await q<{ b: string }>(
    "SELECT body_text AS b FROM email_outbox WHERE kind = 'citizen_login_code' AND recipient = ? ORDER BY created_at DESC, id DESC LIMIT 1",
    [email],
  );
  assert.ok(row, 'codul de cont este în coadă');
  assert.equal((await c.post(`${V1}/citizen/auth/verify`, { email, code: row.b.match(/\b(\d{6})\b/)![1]! })).statusCode, 200);
  return c;
}

async function submit(c: Client, transmit: boolean, notify: boolean) {
  const token = (await c.get(`${V1}/citizen/reports/form-token`)).json().formStartedAt;
  clock.advanceMinutes(0.2);
  const boundary = `----civic${randomUUID()}`;
  const data = {
    categoryId: 'iluminat',
    description: 'Lampa de pe stâlp nu mai funcționează.',
    location: { text: 'Centru, lângă Primărie', ...IN, source: 'pin' },
    notifyOptIn: notify,
    transmitToCityHall: transmit,
    hp: '',
    formStartedAt: token,
  };
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="data"\r\n\r\n${JSON.stringify(data)}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photos"; filename="f.jpg"\r\nContent-Type: application/octet-stream\r\n\r\n`),
    JPEG,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const res = await c.send('POST', `${V1}/citizen/reports`, body, { 'content-type': `multipart/form-data; boundary=${boundary}`, 'idempotency-key': randomUUID() });
  assert.equal(res.statusCode, 201, res.body);
  return res.json().referenceNumber as string;
}

describe('e-mail real prin SMTP (5.5a)', { skip: NO_OPENSSL }, () => {
  before(async () => {
    ({ server: smtp, port: smtpPort } = await smtpServer());
    h = openTestDb();
    await resetTestDb(h.pool);
    await migrate(h.pool, MIGRATIONS_DIR);
    await seedConfig(h.pool, SEEDS_DIR);
    storage = mkdtempSync(join(tmpdir(), 'civic-email-'));
    const config = loadConfig(testEnv({ DATABASE_URL: testDatabaseUrl(), ...smtpEnv() }));
    assert.equal(config.email.mode, 'allowlist', JSON.stringify(config.email.problems));
    ({ app, ctx } = await makeApp(h, clock, smtpEnv(), { uat: loadUatBoundary(), mailTransport: createSmtpTransport(config, { tlsCa: CERT }) }));
    const b = await bootstrapAdmin(h.pool, clock.now(), 'sa@exemplu.test', 'Super Admin');
    superAdmin = new Client(app, undefined, nextIp());
    const res = await superAdmin.post(`${V1}/auth/login`, { email: 'sa@exemplu.test', password: b.temporaryPassword });
    assert.equal(res.json().mfa, 'enroll');
    const secret = (await superAdmin.post(`${V1}/auth/mfa/enroll/start`)).json().secretBase32;
    await superAdmin.post(`${V1}/auth/mfa/enroll/confirm`, { code: totpCodeAt(secret, clock.now()) });
    await superAdmin.post(`${V1}/auth/change-password`, { currentPassword: b.temporaryPassword, newPassword: 'parola-super-admin-2026' });
  });
  after(async () => {
    await app?.close();
    await h?.close();
    await new Promise<void>((r) => (smtp ? smtp.close(() => r()) : r()));
    rmSync(storage, { recursive: true, force: true });
    rmSync(certDir, { recursive: true, force: true });
  });

  it('codul de cont pleacă imediat (fără cron), prin TLS, de pe MAIL_FROM, fără Reply-To; rândul devine `sent`', async () => {
    received.length = 0;
    await citizen(ALLOWED);
    const msg = await waitFor(() => received.find((m) => m.to.includes(ALLOWED)), 'codul de cont');
    assert.equal(msg.from, 'notificari@civic-test.example');
    assert.match(msg.raw, /^From: notificari@civic-test\.example/m);
    assert.doesNotMatch(msg.raw, /^Reply-To:/im);
    assert.match(msg.raw, /\b\d{6}\b/);
    const row = await waitFor(async () => {
      const [r] = await q<{ status: string; transport: string; provider_message_id: string | null }>(
        "SELECT status, transport, provider_message_id FROM email_outbox WHERE kind = 'citizen_login_code' AND recipient = ? ORDER BY created_at DESC LIMIT 1",
        [ALLOWED],
      );
      return r?.status === 'sent' ? r : undefined;
    }, 'rândul `sent`');
    assert.equal(row!.status, 'sent');
    assert.equal(row!.transport, 'smtp');
    assert.ok(row!.provider_message_id);
  });

  it('allowlist: o adresă din afara listei nu primește cod (G3-c5) și nu apare în coadă', async () => {
    received.length = 0;
    const c = new Client(app, undefined, nextIp());
    assert.equal((await c.post(`${V1}/citizen/auth/start`, { email: 'strain@exemplu.test', policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION })).statusCode, 202);
    await new Promise((r) => setTimeout(r, 200));
    assert.equal(received.length, 0);
    assert.equal((await q("SELECT id FROM email_outbox WHERE recipient = 'strain@exemplu.test'")).length, 0);
  });

  it('fluxul către Primărie: mesaj real cu fotografia atașată → `sent` → „în analiză” → notificarea autorului (fără List-Unsubscribe-Post)', async () => {
    const put = await superAdmin.send('PUT', `${V1}/admin/settings/registry`, {
      recipientEmail: REGISTRY, flowEnabled: true, primariaMode: 'platform', agreementReference: 'ACORD-TEST-1',
    });
    assert.equal(put.statusCode, 200, put.body);
    received.length = 0;
    const c = await citizen(ALLOWED);
    const ref = await submit(c, true, true);
    await drain();
    const toRegistry = received.find((m) => m.to.includes(REGISTRY));
    assert.ok(toRegistry, 'mesajul către Primărie');
    assert.match(toRegistry.raw, /Content-Disposition: attachment; filename=foto-1\.jpg/);
    assert.doesNotMatch(toRegistry.raw, /^Reply-To:/im);
    const [rep] = await q<{ s: string }>('SELECT resolution_status AS s FROM reports WHERE reference_number = ?', [ref]);
    assert.equal(rep!.s, 'in_analysis', '2.1: trimis → în analiză');
    const toAuthor = received.find((m) => m.to.includes(ALLOWED) && /List-Unsubscribe:/i.test(m.raw));
    assert.ok(toAuthor, 'notificarea autorului (opt-in, 2.2)');
    assert.match(toAuthor.raw, /^List-Unsubscribe:\s*<https?:\/\/[^>]+#dezabonare\?token=/m);
    assert.doesNotMatch(toAuthor.raw, /List-Unsubscribe-Post/i, 'decizia din 01.10.2026');
  });

  it('allowlist: destinatarul Primăriei din afara listei → refuzat la salvare (422); dacă lista se schimbă ulterior → `blocked`, fără trimitere și fără schimbarea stadiului (E-5)', async () => {
    const put = await superAdmin.send('PUT', `${V1}/admin/settings/registry`, {
      recipientEmail: 'primaria-reala@exemplu.test', flowEnabled: true, primariaMode: 'platform', agreementReference: 'ACORD-TEST-1',
    });
    assert.equal(put.statusCode, 422, 'protecția din setări (E-5)');
    // destinatar salvat anterior, scos apoi din EMAIL_ALLOWLIST (simulat direct în setări)
    await setSetting(h.pool, 'registry.recipient_email', 'primaria-reala@exemplu.test', clock.now(), null);
    const c = await citizen(ALLOWED);
    await drain();
    received.length = 0;
    const ref = await submit(c, true, false);
    await drain();
    assert.deepEqual(received.map((m) => m.to), []);
    const [row] = await q<{ status: string }>(
      "SELECT o.status FROM email_outbox o JOIN reports r ON r.id = o.report_id WHERE r.reference_number = ? AND o.kind = 'registry_notification'",
      [ref],
    );
    assert.equal(row!.status, 'blocked');
    const [rep] = await q<{ s: string }>('SELECT resolution_status AS s FROM reports WHERE reference_number = ?', [ref]);
    assert.equal(rep!.s, 'new');
    await setSetting(h.pool, 'registry.recipient_email', REGISTRY, clock.now(), null);
  });

  it('TLS obligatoriu: un server fără STARTTLS este refuzat; parola greșită → eroare; parola nu apare în mesajul de eroare', async () => {
    const plain = await smtpServer({ noTls: true });
    try {
      const cfg = loadConfig(testEnv({ DATABASE_URL: testDatabaseUrl(), ...smtpEnv(), SMTP_PORT: String(plain.port) }));
      await assert.rejects(createSmtpTransport(cfg, { tlsCa: CERT }).send({ to: ALLOWED, subject: 'x', text: 'x' }), (e: Error) => {
        assert.ok(!e.message.includes(SMTP_PASS));
        return true;
      });
    } finally {
      await new Promise<void>((r) => plain.server.close(() => r()));
    }
    const bad = loadConfig(testEnv({ DATABASE_URL: testDatabaseUrl(), ...smtpEnv(), SMTP_PASS: 'parola-gresita-123' }));
    await assert.rejects(createSmtpTransport(bad, { tlsCa: CERT }).send({ to: ALLOWED, subject: 'x', text: 'x' }), (e: Error) => {
      assert.ok(!e.message.includes('parola-gresita-123'), 'parola nu ajunge în last_error');
      return true;
    });
    // certificat neverificat (fără CA-ul de test) → refuz
    const cfg = loadConfig(testEnv({ DATABASE_URL: testDatabaseUrl(), ...smtpEnv() }));
    await assert.rejects(createSmtpTransport(cfg).send({ to: ALLOWED, subject: 'x', text: 'x' }));
  });

  it('retenția (B6 §6): e-mailurile de cont dispar la 45 de zile; cele legate de o sesizare rămân cu sesizarea', async () => {
    const old = new Date(clock.now().getTime() - 46 * 86_400_000);
    const recent = new Date(clock.now().getTime() - 44 * 86_400_000);
    for (const [id, at] of [['01JRETENTIEVECHE000000000A', old], ['01JRETENTIERECENTA0000000A', recent]] as const) {
      await h.pool.query(
        `INSERT INTO email_outbox (id, kind, recipient, subject, body_text, status, attempts, created_at)
         VALUES (?, 'citizen_login_code', 'x@exemplu.test', 'Cod', 'Codul dumneavoastră este: 123456', 'sent', 1, ?)`,
        [id, at],
      );
    }
    const linkedBefore = (await q("SELECT id FROM email_outbox WHERE report_id IS NOT NULL")).length;
    const res = await purgeRetention(ctx);
    assert.ok(res.accountEmails >= 1);
    assert.equal((await q("SELECT id FROM email_outbox WHERE id = '01JRETENTIEVECHE000000000A'")).length, 0);
    assert.equal((await q("SELECT id FROM email_outbox WHERE id = '01JRETENTIERECENTA0000000A'")).length, 1);
    assert.equal((await q("SELECT id FROM email_outbox WHERE report_id IS NOT NULL")).length, linkedBefore);
  });
});
