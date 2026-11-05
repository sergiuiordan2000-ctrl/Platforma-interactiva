// V3 (propunerea r4, aprobată la 05.11.2026): fișierul țintei și protecțiile dinaintea oricărei scrieri (§2.4).
// Fără bază de date: citirea și validarea `restore-target.env`, comparația cu baza activă, căile reale, copia sursă.

import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import {
  RESTORE_TARGET_FILE,
  RestoreTargetError,
  checkRestoreTarget,
  dbIdentity,
  findSingleRestoreCopy,
  readRestoreTarget,
  type ActivePaths,
} from '../../src/db/restoreTarget.ts';

let root: string;
let envDir: string;
let envFile: string;
let active: ActivePaths;

const TARGET_URL = 'mysql://tgt_user:parola-tinta@localhost/cont_civic_v3';
const ACTIVE_URL = 'mysql://cont_civic:parola-activa@localhost/cont_civic';

function writeTarget(content: string, mode = 0o600): string {
  const f = join(envDir, RESTORE_TARGET_FILE);
  rmSync(f, { force: true });
  writeFileSync(f, content);
  chmodSync(f, mode);
  return f;
}
function refused(fn: () => unknown, re: RegExp): void {
  assert.throws(fn, (err: unknown) => err instanceof RestoreTargetError && re.test(err.message));
}
const target = (storageDir: string, databaseUrl = TARGET_URL) => ({ file: 'x', configDir: envDir, databaseUrl, storageDir });

before(() => {
  root = mkdtempSync(join(tmpdir(), 'civic-v3-unit-'));
  envDir = join(root, 'data');
  mkdirSync(envDir);
  envFile = join(envDir, 'civic.env');
  writeFileSync(envFile, 'X=1\n');
  chmodSync(envFile, 0o600);
  mkdirSync(join(root, 'storage'));
  mkdirSync(join(envDir, 'backups'));
  mkdirSync(join(root, 'app'));
  active = { databaseUrl: ACTIVE_URL, storageDir: join(root, 'storage'), backupDir: join(envDir, 'backups'), appRoot: join(root, 'app') };
});
after(() => rmSync(root, { recursive: true, force: true }));

describe('V3: fișierul țintei (protecția 1)', () => {
  it('un fișier corect este citit, cu ghilimele și comentarii, fără să atingă process.env', () => {
    const before = JSON.stringify(process.env);
    writeTarget(`# baza de test\nDATABASE_URL="${TARGET_URL}"\n\nSTORAGE_DIR=${join(root, 'v3-storage')}\n`);
    const t = readRestoreTarget(envFile);
    assert.equal(t.databaseUrl, TARGET_URL);
    assert.equal(t.storageDir, join(root, 'v3-storage'));
    assert.equal(t.configDir, envDir);
    assert.equal(JSON.stringify(process.env), before);
  });
  it('fără CIVIC_ENV_FILE: refuz', () => {
    refused(() => readRestoreTarget(undefined), /CIVIC_ENV_FILE lipsește/);
    refused(() => readRestoreTarget(join(root, 'nu-exista.env')), /nu poate fi găsit/);
  });
  it('fișier lipsă, legătură simbolică, drepturi largi: refuz', () => {
    rmSync(join(envDir, RESTORE_TARGET_FILE), { force: true });
    refused(() => readRestoreTarget(envFile), /nu există/);
    const elsewhere = join(root, 'alt.env');
    writeFileSync(elsewhere, `DATABASE_URL=${TARGET_URL}\nSTORAGE_DIR=/tmp/x\n`);
    chmodSync(elsewhere, 0o600);
    symlinkSync(elsewhere, join(envDir, RESTORE_TARGET_FILE));
    refused(() => readRestoreTarget(envFile), /legătură simbolică/);
    writeTarget(`DATABASE_URL=${TARGET_URL}\nSTORAGE_DIR=/tmp/x\n`, 0o644);
    refused(() => readRestoreTarget(envFile), /drepturi 644/);
  });
  it('variabile în plus, duble, lipsă sau goale: refuz', () => {
    writeTarget(`DATABASE_URL=${TARGET_URL}\nSTORAGE_DIR=/tmp/x\nBACKUP_DIR=/tmp/y\n`);
    refused(() => readRestoreTarget(envFile), /rândul 3: se acceptă numai/);
    writeTarget(`DATABASE_URL=${TARGET_URL}\nDATABASE_URL=${TARGET_URL}\nSTORAGE_DIR=/tmp/x\n`);
    refused(() => readRestoreTarget(envFile), /de mai multe ori/);
    writeTarget(`DATABASE_URL=${TARGET_URL}\n`);
    refused(() => readRestoreTarget(envFile), /lipsește STORAGE_DIR/);
    writeTarget(`DATABASE_URL=\nSTORAGE_DIR=/tmp/x\n`);
    refused(() => readRestoreTarget(envFile), /DATABASE_URL este gol/);
    writeTarget(`export DATABASE_URL=${TARGET_URL}\nSTORAGE_DIR=/tmp/x\n`);
    refused(() => readRestoreTarget(envFile), /se acceptă numai/);
  });
  it('mesajele de refuz nu conțin parola', () => {
    writeTarget(`DATABASE_URL=${TARGET_URL}\nSTORAGE_DIR=/tmp/x\nALTCEVA=parola-tinta\n`);
    try {
      readRestoreTarget(envFile);
      assert.fail('trebuia refuzat');
    } catch (err) {
      assert.ok(!(err as Error).message.includes('parola-tinta'));
    }
  });
});

describe('V3: baza țintă față de baza activă (protecția 2)', () => {
  it('altă bază și alt utilizator: permis', () => {
    assert.deepEqual(checkRestoreTarget(target(join(root, 'v3-storage')), active).problems, []);
  });
  it('același nume de bază: refuz, indiferent de gazdă, port sau litere mari / mici', () => {
    for (const url of [
      'mysql://tgt_user:p@localhost/cont_civic',
      'mysql://tgt_user:p@127.0.0.1:3307/cont_civic',
      'mysql://tgt_user:p@alt-server.exemplu.test/CONT_CIVIC',
    ]) {
      const p = checkRestoreTarget(target(join(root, 'v3-storage'), url), active).problems;
      assert.ok(p.some((x) => /același nume ca baza activă/.test(x)), url);
    }
  });
  it('același utilizator: refuz', () => {
    const p = checkRestoreTarget(target(join(root, 'v3-storage'), 'mysql://cont_civic:p@localhost/cont_civic_v3'), active).problems;
    assert.ok(p.some((x) => /același utilizator/.test(x)));
  });
  it('URL invalid, alt protocol, fără nume de bază: refuz', () => {
    assert.throws(() => checkRestoreTarget(target(join(root, 's'), 'nu-e-url'), active), RestoreTargetError);
    assert.throws(() => checkRestoreTarget(target(join(root, 's'), 'postgres://u:p@h/b'), active), RestoreTargetError);
    assert.ok(checkRestoreTarget(target(join(root, 's'), 'mysql://u:p@localhost/'), active).problems.some((x) => /nu are nume/.test(x)));
  });
  it('identitatea afișabilă nu conține parola; portul implicit este completat', () => {
    const id = dbIdentity('mysql://u%40x:secret@LocalHost/baz%C4%83');
    assert.deepEqual(id, { host: 'localhost', port: '3306', user: 'u@x', database: 'bază' });
    assert.ok(!JSON.stringify(id).includes('secret'));
  });
});

describe('V3: directorul țintă, căile reale (protecția 3)', () => {
  const problems = (s: string) => checkRestoreTarget(target(s), active).problems;
  it('cale relativă sau cu „.” / „..”: refuz', () => {
    assert.ok(problems('v3-storage').some((x) => /absolută/.test(x)));
    assert.ok(problems(`${root}/x/../storage`).some((x) => /„\.\.”/.test(x)));
    assert.ok(problems(`${root}/./v3`).some((x) => /„\.\.”/.test(x)));
  });
  it('identic, în interiorul sau părinte pentru STORAGE_DIR activ, BACKUP_DIR, directorul aplicației: refuz', () => {
    assert.ok(problems(join(root, 'storage')).some((x) => /STORAGE_DIR activ/.test(x)));
    assert.ok(problems(join(root, 'storage', 'sub')).some((x) => /STORAGE_DIR activ/.test(x)));
    assert.ok(problems(root).some((x) => /STORAGE_DIR activ/.test(x)));
    assert.ok(problems(join(envDir, 'backups', 'v3')).some((x) => /BACKUP_DIR/.test(x)));
    assert.ok(problems(join(root, 'app', 'v3')).some((x) => /directorul aplicației/.test(x)));
    // directorul configurației active (civic.env și restore-target.env): identic, în interior sau părinte
    assert.ok(problems(envDir).some((x) => /fișierului de setări activ/.test(x)));
    assert.ok(problems(join(envDir, 'v3-foto')).some((x) => /fișierului de setări activ/.test(x)));
  });
  it('legătură simbolică spre directorul activ sau spre BACKUP_DIR, inclusiv un subdirector încă inexistent: refuz', () => {
    symlinkSync(join(root, 'storage'), join(root, 'link-storage'));
    symlinkSync(join(envDir, 'backups'), join(root, 'link-backups'));
    assert.ok(problems(join(root, 'link-storage')).some((x) => /STORAGE_DIR activ/.test(x)));
    assert.ok(problems(join(root, 'link-backups', 'nou', 'v3')).some((x) => /BACKUP_DIR/.test(x)));
  });
  it('un director separat, încă inexistent: permis; calea reală este întoarsă', () => {
    const r = checkRestoreTarget(target(join(root, 'v3-nou', 'foto')), active);
    assert.deepEqual(r.problems, []);
    assert.equal(r.storageReal, join(root, 'v3-nou', 'foto'));
  });
});

describe('V3: copia sursă (protecția 4, D-V3-2 = A)', () => {
  it('zero copii, două copii, o legătură simbolică: refuz; exact una: aleasă', () => {
    const b = mkdtempSync(join(root, 'b-'));
    refused(() => findSingleRestoreCopy(b), /nu există nicio copie/);
    mkdirSync(join(b, 'civic-backup-20261105T011702381Z'));
    mkdirSync(join(b, 'civic-restore-x'));
    refused(() => findSingleRestoreCopy(b), /nu există nicio copie/);
    mkdirSync(join(b, 'civic-restore-20261106T080000000Z'));
    assert.equal(findSingleRestoreCopy(b), join(b, 'civic-restore-20261106T080000000Z'));
    mkdirSync(join(b, 'civic-restore-20261106T090000000Z'));
    refused(() => findSingleRestoreCopy(b), /2 copii decriptate/);
    rmSync(join(b, 'civic-restore-20261106T090000000Z'), { recursive: true });
    symlinkSync(join(root, 'storage'), join(b, 'civic-restore-20261106T100000000Z'));
    assert.equal(findSingleRestoreCopy(b), join(b, 'civic-restore-20261106T080000000Z'));
    refused(() => findSingleRestoreCopy(join(root, 'nu-exista')), /nu poate fi citit/);
  });
});
