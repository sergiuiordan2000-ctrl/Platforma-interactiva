// Verificarea de după audit (09.10.2026): furnizorul de identitate fals nu poate fi activat pe staging sau în
// producție, nici printr-o configurație greșită. Aici se pornește procesul real al aplicației (`main.ts`), nu numai
// funcția de validare: cu setarea de test prezentă, procesul trebuie să se oprească înainte de a atinge baza de date.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { APP_ROOT } from '../../src/paths.ts';
import { testEnv } from '../helpers/env.ts';

const FAKE = 'http://localhost:6199';
const PUBLIC = 'https://civic.exemplu.test';
/** O bază de date la care nu se poate ajunge: dacă procesul trece de configurare, se oprește aici, cu alt mesaj. */
const NO_DB = 'mysql://nimeni:nimic@127.0.0.1:1/civic_test';
const DB_MESSAGE = /Baza de date nu este accesibilă/;
const tmp = mkdtempSync(join(tmpdir(), 'civic-dev-oidc-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

function startApp(env: Record<string, string | undefined>, base: NodeJS.ProcessEnv = testEnv({ DATABASE_URL: NO_DB, ...env })) {
  const res = spawnSync(process.execPath, ['--import', 'tsx', join(APP_ROOT, 'server', 'src', 'main.ts')], {
    env: { ...base, PATH: process.env.PATH ?? '' },
    cwd: join(APP_ROOT, 'server'),
    encoding: 'utf8',
    timeout: 60_000,
  });
  return { status: res.status, out: `${res.stdout}\n${res.stderr}` };
}

function assertRefusedForSetting(r: { status: number | null; out: string }, reason: RegExp) {
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /Configurare invalidă; aplicația nu pornește/);
  assert.match(r.out, /DEV_OIDC_PROVIDER_URL/);
  assert.match(r.out, reason);
  assert.doesNotMatch(r.out, DB_MESSAGE, 'oprirea are loc la configurare, înainte de baza de date');
  assert.ok(!r.out.includes(FAKE), 'mesajul nu repetă valoarea setării');
}

describe('pornirea aplicației cu setarea de test (proces real): refuz pe staging și în producție', () => {
  it('martor: fără setarea de test, aceeași configurare de staging trece de validare (se oprește abia la baza de date)', () => {
    const r = startApp({ APP_ENV: 'staging', PUBLIC_BASE_URL: PUBLIC });
    assert.equal(r.status, 1);
    assert.match(r.out, DB_MESSAGE);
    assert.doesNotMatch(r.out, /DEV_OIDC_PROVIDER_URL/);
  });

  for (const appEnv of ['staging', 'production']) {
    it(`APP_ENV=${appEnv} + DEV_OIDC_PROVIDER_URL → procesul se oprește la configurare`, () => {
      assertRefusedForSetting(startApp({ APP_ENV: appEnv, PUBLIC_BASE_URL: PUBLIC, DEV_OIDC_PROVIDER_URL: FAKE }), /numai cu APP_ENV=development/);
    });

    it(`APP_ENV=${appEnv}, setarea ajunsă în fișierul de setări (CIVIC_ENV_FILE) → procesul se oprește la configurare`, () => {
      const file = join(tmp, `civic-${appEnv}.env`);
      const env = testEnv({ DATABASE_URL: NO_DB, APP_ENV: appEnv, PUBLIC_BASE_URL: PUBLIC, DEV_OIDC_PROVIDER_URL: FAKE,
        GOOGLE_OAUTH_CLIENT_ID: 'client.apps.exemplu', GOOGLE_OAUTH_CLIENT_SECRET: 'secret-de-test-0123456789' });
      writeFileSync(file, Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
      chmodSync(file, 0o600);
      assertRefusedForSetting(startApp({}, { CIVIC_ENV_FILE: file }), /numai cu APP_ENV=development/);
    });
  }

  it('configurație greșită: APP_ENV=development pe un server cu adresă publică → procesul se oprește la configurare', () => {
    assertRefusedForSetting(startApp({ APP_ENV: 'development', PUBLIC_BASE_URL: PUBLIC, DEV_OIDC_PROVIDER_URL: FAKE }), /PUBLIC_BASE_URL este o adresă locală/);
  });

  it('configurație greșită: APP_ENV scris greșit (de exemplu „Development”) → procesul nu pornește deloc', () => {
    const r = startApp({ APP_ENV: 'Development', PUBLIC_BASE_URL: PUBLIC, DEV_OIDC_PROVIDER_URL: FAKE });
    assert.equal(r.status, 1);
    assert.match(r.out, /APP_ENV/);
    assert.doesNotMatch(r.out, DB_MESSAGE);
  });
});
