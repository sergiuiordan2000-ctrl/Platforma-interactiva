// Faza 7C, P8 (DEC-14): textele e-mailurilor după redenumirea „Turnu Măgurele Civic” → „Urbis Activ”.
// RN-3: subiectul mesajului cu codul de autentificare. RN-4: subiectul anunțului de blocare.
// RN-5: corpul mesajului generat pentru Primărie; se verifică mesajul generat, fără nicio trimitere.
// Criteriile: docs/faza7/FAZA_7_E0_REGISTRU_DECIZII.md, Anexa A.4.

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { CITIZEN_POLICY_VERSION } from '@tmc/shared';
import { bootstrapAdmin } from '../../src/accounts.ts';
import { totpCodeAt } from '../../src/auth/totp.ts';
import type { DbHandle } from '../../src/db/client.ts';
import { migrate } from '../../src/db/migrations.ts';
import { seedConfig } from '../../src/db/seeds.ts';
import { MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { registryTemplate } from '../../src/reports/outbox.ts';
import { Client, Clock, makeApp } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb } from '../helpers/db.ts';

const V1 = '/api/v1';
const OLD = 'Turnu Măgurele Civic';
let h: DbHandle;
let app: FastifyInstance;
const clock = new Clock();
let admin: Client;
const q = async <T>(sql: string, p: unknown[] = []) => (await h.pool.query(sql, p))[0] as T[];
const start = (email: string) =>
  new Client(app).post(`${V1}/citizen/auth/start`, { email, policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION });

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  ({ app } = await makeApp(h, clock));
  const b = await bootstrapAdmin(h.pool, clock.now(), 'sa1@exemplu.test', 'SA 1');
  admin = new Client(app);
  await admin.post(`${V1}/auth/login`, { email: 'sa1@exemplu.test', password: b.temporaryPassword });
  const secret = (await admin.post(`${V1}/auth/mfa/enroll/start`)).json().secretBase32;
  await admin.post(`${V1}/auth/mfa/enroll/confirm`, { code: totpCodeAt(secret, clock.now()) });
  assert.equal(
    (await admin.post(`${V1}/auth/change-password`, { currentPassword: b.temporaryPassword, newPassword: 'parola-sa1-lunga-2026' })).statusCode,
    204,
  );
});

after(async () => {
  await app.close();
  await h.close();
});

describe('textele e-mailurilor după redenumire (7C, P8)', () => {
  it('RN-3: subiectul mesajului cu codul de autentificare este exact „Codul de autentificare — Urbis Activ”', async () => {
    assert.equal((await start('cod@exemplu.test')).statusCode, 202);
    const rows = await q<{ subject: string; body: string }>(
      "SELECT subject, body_text AS body FROM email_outbox WHERE kind = 'citizen_login_code' AND recipient = 'cod@exemplu.test'",
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.subject, 'Codul de autentificare — Urbis Activ');
    assert.ok(!rows[0]!.body.includes(OLD));
  });

  it('RN-4: subiectul anunțului de blocare este exact „Urbis Activ”', async () => {
    const email = 'blocat@exemplu.test';
    const c = new Client(app);
    assert.equal((await c.post(`${V1}/citizen/auth/start`, { email, policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION })).statusCode, 202);
    const [codeRow] = await q<{ b: string }>(
      "SELECT body_text AS b FROM email_outbox WHERE kind = 'citizen_login_code' AND recipient = ? ORDER BY created_at DESC, id DESC LIMIT 1",
      [email],
    );
    assert.equal((await c.post(`${V1}/citizen/auth/verify`, { email, code: codeRow!.b.match(/\b(\d{6})\b/)![1]! })).statusCode, 200);
    const [acc] = await q<{ id: string }>('SELECT id FROM citizen_accounts WHERE email_normalized = ?', [email]);
    assert.equal((await admin.post(`${V1}/admin/citizens/${acc!.id}/blocks`, { kind: 'permanent' })).statusCode, 201);
    assert.equal((await c.send('DELETE', `${V1}/citizen/account`)).statusCode, 204);
    assert.equal((await start(email)).statusCode, 202);
    const rows = await q<{ subject: string }>("SELECT subject FROM email_outbox WHERE kind = 'citizen_account_blocked' AND recipient = ?", [email]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.subject, 'Urbis Activ');
  });

  it('RN-5: corpul mesajului generat pentru Primărie conține „platforma independentă Urbis Activ”, fără numele vechi', () => {
    const msg = registryTemplate({
      referenceNumber: 'TM-001',
      categoryName: 'Iluminat public',
      description: 'Bec ars pe strada de test.',
      locationText: 'Strada de test',
      lat: 43.75,
      lng: 24.87,
      createdAt: new Date('2026-10-26T08:00:00Z'),
      authorEmail: null,
    });
    assert.ok(msg.text.includes('platforma independentă Urbis Activ'), msg.text);
    assert.ok(!msg.text.includes(OLD), msg.text);
    assert.ok(!msg.subject.includes(OLD), msg.subject);
  });
});
