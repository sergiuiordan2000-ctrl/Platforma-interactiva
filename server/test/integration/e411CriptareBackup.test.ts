// E4.11 (planul r3.2 §3, §5, §6, §7.2–§7.4; registrul §24): copiile criptate în formatul age.
// - structura copiei criptate și fluxul fără fișiere în clar;
// - staging fără cheie: copii în clar, ca înainte (P3);
// - `backup:verify` / `backup:decrypt` și `binding.json.age` (fișiere lipsă, în plus, redenumite, schimbate,
//   aduse din altă copie; manifest sau marcaje modificate; identitate sau frază-parolă greșită);
// - copia decriptată `civic-restore-<UTC>` (cele 8 teste din §7.3) și ciclul complet de restaurare;
// - rotația, BACKUP_DIR mixt, R18 cu copii criptate, copia criptată nedecriptată;
// - comenzile reale (procese): ieșirile conțin numai diagnostice, niciodată date în clar (§24.4);
// - `strace`: în timpul `backup:db` se scrie numai în lista EXACTĂ de căi permise (§7.2, §24.4).

import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { after, before, describe, it } from 'node:test';
import { Decrypter, Encrypter, generateX25519Identity, identityToRecipient } from 'age-encryption';
import {
  BACKUP_ROTATION_DAYS,
  RestoreRefusedError,
  createBackup,
  formatRestoreInspection,
  inspectRestore,
  listBackups,
  recreateAccountMarkers,
  restoreBackup,
  rotateBackups,
} from '../../src/db/backup.ts';
import {
  BINDING_FILE,
  DECRYPTED_COPY_FILE,
  ENCRYPTED_DB_FILE,
  decryptCopy,
  purgeStaleRestoreCopies,
  verifyEncryptedCopy,
} from '../../src/db/backupCrypto.ts';
import type { DbHandle } from '../../src/db/client.ts';
import {
  ACCOUNT_DELETIONS_DIR,
  ACCOUNT_DELETIONS_PENDING_DIR,
  accountMarkersEvidence,
  accountMarkersLost,
  readAccountDeletionMarkers,
  recordAccountDeletionIntent,
  recordReportCounter,
  recordReportDeletions,
  takeMarkerSnapshot,
  writeMissingAccountDeletionEntries,
} from '../../src/db/markers.ts';
import { migrate } from '../../src/db/migrations.ts';
import { seedConfig } from '../../src/db/seeds.ts';
import { APP_ROOT, MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { openTestDb, resetTestDb, testDatabaseUrl } from '../helpers/db.ts';
import { testEnv } from '../helpers/env.ts';

const DAY = 86_400_000;
const NOW = new Date('2026-11-01T03:17:00.000Z');
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);
const later = (ms: number) => new Date(NOW.getTime() + ms);
const id = (n: number) => `01E411${String(n).padStart(20, '0')}`;
const sha = (b: Uint8Array | string) => createHash('sha256').update(b).digest('hex');

// date în clar care nu au voie să apară în niciun fișier criptat și în nicio ieșire de comandă
const SECRET_TEXT = 'TEXT-SECRET-E411-descriere-in-clar';
const SECRET_EMAIL = 'cetatean-e411@exemplu.test';
const SECRET_PHOTO = 'FOTO-SECRET-E411-continut-in-clar';
const PASSPHRASE = 'fraza-parola-de-test-e411';

let h: DbHandle;
let root: string;
let storageDir: string;
let identity: string;
let recipient: string;
let identityFile: string;
const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await h.pool.query(sql, params))[0] as T[];
const n = async (sql: string, params: unknown[] = []) => Number(((await q<{ n: number }>(sql, params))[0]!).n);

function freshDir(label: string): string {
  return mkdtempSync(join(root, `${label}-`));
}

/** Un BACKUP_DIR nou, cu marcajul contorului TM (A1: baza are deja numere emise, deci marcajul se scrie explicit). */
function bdir(label: string): string {
  const d = freshDir(label);
  recordReportCounter(d, 3);
  return d;
}

const opts = (backupDir: string, extra: Record<string, unknown> = {}) => ({
  databaseUrl: testDatabaseUrl(),
  backupDir,
  storageDir,
  migrationsDir: MIGRATIONS_DIR,
  retentionDays: 45,
  adminRetentionMonths: 6,
  ...extra,
});

/**
 * Ținta unei restaurări: baza de test golită, cu schema la zi (ca în celelalte teste de restaurare: utilizatorul
 * de test are drepturi numai pe baza lui). Datele-sursă se refac după aceea cu `populate()`.
 */
async function emptyTarget(): Promise<string> {
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  return testDatabaseUrl();
}

/** Datele-sursă: un cont, trei sesizări cu fotografii, contorul TM = 3 (baza golită și refăcută). */
async function populate(): Promise<void> {
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  await h.pool.query(
    "INSERT INTO citizen_accounts (id, email, email_normalized, status, policy_version, policy_accepted_at, created_at) VALUES (?, ?, ?, 'active', 'v1', ?, ?)",
    [id(1), SECRET_EMAIL, SECRET_EMAIL, ago(60), ago(60)],
  );
  await addReport(10, 'TM-001', ago(3));
  await addReport(11, 'TM-002', ago(2));
  await addReport(12, 'TM-003', ago(1));
  await h.pool.query('UPDATE report_counter SET `last_value` = 3 WHERE id = 1');
}

async function addReport(k: number, ref: string, createdAt: Date) {
  await h.pool.query(
    "INSERT INTO reports (id, author_account_id, reference_number, category_id, description, location_text, lat, lng, location_source, created_at, updated_at) VALUES (?, ?, ?, 'drumuri', ?, 'Str. Test', 43.75, 24.87, 'pin', ?, ?)",
    [id(k), id(1), ref, `${SECRET_TEXT} ${ref}`, createdAt, createdAt],
  );
  const key = `r/${id(k)}.webp`;
  mkdirSync(join(storageDir, 'r'), { recursive: true });
  writeFileSync(join(storageDir, key), `${SECRET_PHOTO}-${ref}`);
  await h.pool.query(
    "INSERT INTO report_photos (id, report_id, ordinal, storage_key, mime, size_bytes, width, height, sha256, created_at) VALUES (?, ?, 1, ?, 'image/webp', 10, 1, 1, REPEAT('e', 64), ?)",
    [id(k + 100), id(k), key, createdAt],
  );
}

/** Toate fișierele (căi relative) și conținutul lor concatenat, pentru căutarea datelor în clar. */
function allBytes(dir: string): { files: string[]; blob: Buffer } {
  const files: string[] = [];
  const parts: Buffer[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else {
        files.push(relative(dir, p));
        parts.push(readFileSync(p));
      }
    }
  };
  walk(dir);
  return { files: files.sort(), blob: Buffer.concat(parts) };
}

function assertNoPlaintext(text: string | Buffer, where: string) {
  const s = Buffer.isBuffer(text) ? text.toString('latin1') : text;
  for (const secret of [SECRET_TEXT, SECRET_EMAIL, SECRET_PHOTO, identity, PASSPHRASE]) {
    assert.ok(!s.includes(secret), `${where}: conține date în clar („${secret.slice(0, 12)}…”)`);
  }
}

before(async () => {
  h = openTestDb();
  root = mkdtempSync(join(tmpdir(), 'civic-e411-'));
  storageDir = join(root, 'storage');
  mkdirSync(storageDir, { recursive: true });
  identity = await generateX25519Identity();
  recipient = await identityToRecipient(identity);
  // identitatea pe „USB”: criptată cu fraza-parolă (planul §4.2); scrypt redus numai în test, pentru viteză
  const e = new Encrypter();
  e.setPassphrase(PASSPHRASE);
  e.setScryptWorkFactor(12);
  identityFile = join(root, 'identitate.age');
  writeFileSync(identityFile, await e.encrypt(`# created: test\n${identity}\n`), { mode: 0o600 });
  await populate();
});

after(async () => {
  await h.close();
});

describe('E4.11 §3: backup:db cu cheia publică — copia criptată', () => {
  let backupDir: string;
  let copy: string;

  before(async () => {
    backupDir = bdir('struct');
    const res = await createBackup(opts(backupDir, { recipient, now: NOW }));
    copy = res.dir;
  });

  it('structura exactă: manifest și marcaje în clar, binding, baza și fotografiile criptate; nimic altceva', () => {
    const { files, blob } = allBytes(copy);
    assert.deepEqual(files, [
      BINDING_FILE,
      ENCRYPTED_DB_FILE,
      'manifest.json',
      'markers.json',
      `photos/r/${id(10)}.webp.age`,
      `photos/r/${id(11)}.webp.age`,
      `photos/r/${id(12)}.webp.age`,
    ]);
    assertNoPlaintext(blob, 'copia criptată');
    const manifest = JSON.parse(readFileSync(join(copy, 'manifest.json'), 'utf8'));
    assert.deepEqual(manifest.encryption, { scheme: 'age-x25519', recipient });
    assert.equal(manifest.format, 'civic-backup/2');
    assert.equal(manifest.photos, 3);
    assert.equal(readFileSync(join(copy, 'markers.json'), 'utf8'), JSON.stringify(takeMarkerSnapshot(backupDir)) + '\n');
  });

  it('SHA-256 din manifest = baza comprimată în clar; conținutul decriptat este cel din bază', async () => {
    const manifest = JSON.parse(readFileSync(join(copy, 'manifest.json'), 'utf8'));
    const d = new Decrypter();
    d.addIdentity(identity);
    const gz = await d.decrypt(readFileSync(join(copy, ENCRYPTED_DB_FILE)));
    assert.equal(sha(gz), manifest.dbSha256);
    assert.match(gunzipSync(gz).toString(), new RegExp(SECRET_TEXT));
    const photo = await d.decrypt(readFileSync(join(copy, 'photos', 'r', `${id(10)}.webp.age`)), 'text');
    assert.equal(photo, `${SECRET_PHOTO}-TM-001`);
  });

  it('backup:verify (funcția): copia întreagă și consecventă', async () => {
    const v = await verifyEncryptedCopy(copy, identity);
    assert.deepEqual(v.problems, []);
    assert.equal(v.filesChecked, 4);
    assert.equal(v.photos, 3);
  });

  it('fără cheie (staging, P3): copie în clar, ca înainte, fără binding și fără criptare', async () => {
    const plainDir = bdir('plain');
    const res = await createBackup(opts(plainDir, { now: NOW }));
    const { files } = allBytes(res.dir);
    assert.ok(files.includes('db.jsonl.gz') && !files.some((f) => f.endsWith('.age')));
    assert.equal(JSON.parse(readFileSync(join(res.dir, 'manifest.json'), 'utf8')).encryption, undefined);
  });

  it('o eroare la criptare: nicio copie nouă, niciun director temporar, copiile existente neatinse', async () => {
    const before = readdirSync(backupDir).sort();
    await assert.rejects(createBackup(opts(backupDir, { recipient: 'age1invalid', now: later(60_000) })));
    assert.deepEqual(readdirSync(backupDir).sort(), before);
  });
});

describe('E4.11 §7.4: backup:verify / backup:decrypt și binding.json.age', () => {
  let backupDir: string;
  let copy: string;
  let other: string;

  before(async () => {
    backupDir = bdir('bind');
    copy = (await createBackup(opts(backupDir, { recipient, now: NOW }))).dir;
    other = (await createBackup(opts(bdir('bind-other'), { recipient, now: NOW }))).dir;
  });

  /** O copie a copiei, cu același nume, modificată de `mutate`. */
  function tampered(label: string, mutate: (dir: string) => void): string {
    const dir = join(freshDir(`t-${label}`), listBackups(backupDir)[0]!);
    cpSync(copy, dir, { recursive: true });
    mutate(dir);
    return dir;
  }
  const photo = (dir: string, k: number) => join(dir, 'photos', 'r', `${id(k)}.webp.age`);

  const cases: Array<[string, (dir: string) => void, RegExp]> = [
    ['fișier .age lipsă', (d) => rmSync(photo(d, 11)), /fișier lipsă/],
    ['fișier .age în plus', (d) => writeFileSync(join(d, 'photos', 'r', 'in-plus.webp.age'), readFileSync(photo(d, 10))), /fișier neașteptat/],
    ['fișier redenumit', (d) => renameSync(photo(d, 11), join(d, 'photos', 'r', 'redenumit.webp.age')), /fișier/],
    [
      'fotografii schimbate între ele',
      (d) => {
        const a = readFileSync(photo(d, 10));
        writeFileSync(photo(d, 10), readFileSync(photo(d, 11)));
        writeFileSync(photo(d, 11), a);
      },
      /nu corespunde asocierii/,
    ],
    ['fișier adus din altă copie', (d) => writeFileSync(photo(d, 12), readFileSync(photo(other, 12))), /nu corespunde asocierii/],
    [
      'manifest modificat',
      (d) => {
        const m = JSON.parse(readFileSync(join(d, 'manifest.json'), 'utf8'));
        m.counts.reports += 1;
        writeFileSync(join(d, 'manifest.json'), JSON.stringify(m, null, 2) + '\n');
      },
      /manifest\.json” a fost modificat/,
    ],
    ['marcaje modificate', (d) => writeFileSync(join(d, 'markers.json'), readFileSync(join(d, 'markers.json'), 'utf8').replace('}', ' }')), /markers\.json/],
    [
      'un octet modificat în baza criptată',
      (d) => {
        const b = readFileSync(join(d, ENCRYPTED_DB_FILE));
        b[b.length - 20]! ^= 1;
        writeFileSync(join(d, ENCRYPTED_DB_FILE), b);
      },
      /db\.jsonl\.gz\.age/,
    ],
    ['binding lipsă', (d) => rmSync(join(d, BINDING_FILE)), /binding\.json\.age.*lipsește/],
  ];

  for (const [label, mutate, expected] of cases) {
    it(`${label} → refuz; backup:decrypt nu lasă niciun fișier parțial`, async () => {
      const dir = tampered(label.replace(/\W+/g, '-'), mutate);
      const v = await verifyEncryptedCopy(dir, identity);
      assert.ok(v.problems.length > 0, `${label}: trebuia refuzat`);
      assert.match(v.problems.join('\n'), expected);
      const out = freshDir('out');
      const r = await decryptCopy(dir, identity, out, NOW);
      assert.equal(r.out, null);
      assert.deepEqual(readdirSync(out), [], 'niciun fișier parțial');
    });
  }

  it('copia redenumită (numele nu corespunde) → refuz', async () => {
    const dir = join(freshDir('rename'), 'civic-backup-20261031T031700000Z');
    cpSync(copy, dir, { recursive: true });
    assert.match((await verifyEncryptedCopy(dir, identity)).problems.join('\n'), /Numele copiei/);
  });

  it('identitate greșită → refuz clar, fără fișiere parțiale', async () => {
    const wrong = await generateX25519Identity();
    const v = await verifyEncryptedCopy(copy, wrong);
    assert.match(v.problems.join('\n'), /identitatea nu corespunde/);
    const out = freshDir('out-wrong');
    assert.equal((await decryptCopy(copy, wrong, out, NOW)).out, null);
    assert.deepEqual(readdirSync(out), []);
  });

  it('copia originală rămâne neschimbată după toate verificările', async () => {
    assert.deepEqual((await verifyEncryptedCopy(copy, identity)).problems, []);
  });
});

describe('E4.11 §7.3: copia decriptată civic-restore-<UTC> și ciclul complet', () => {
  let backupDir: string;
  let encrypted: string;
  let second: string;
  let rotDir: string;
  let withAccount: string;
  let withAccountCopy: string;

  // toate copiile-sursă se fac înaintea restaurărilor (ținta restaurărilor este baza de test, golită)
  before(async () => {
    backupDir = bdir('restore');
    encrypted = (await createBackup(opts(backupDir, { recipient, now: NOW }))).dir;
    second = (await createBackup(opts(backupDir, { recipient, now: later(DAY) }))).dir;
    rotDir = bdir('rot-restore');
    await createBackup(opts(rotDir, { recipient, now: NOW }));
    // o ștergere de cont notată înaintea copiei (contul nu există în bază): apare în fotografia marcajelor
    withAccount = bdir('b-src');
    await createBackup(opts(withAccount, { recipient, now: NOW })); // inițializează directoarele de marcaje
    writeMissingAccountDeletionEntries(withAccount, [{ accountId: id(900), deletedAt: ago(5).toISOString() }]);
    withAccountCopy = (await createBackup(opts(withAccount, { recipient, now: later(5_000) }))).dir;
  });

  after(populate);

  async function decryptedIn(dir: string, from: string, at: Date): Promise<string> {
    const r = await decryptCopy(from, identity, dir, at);
    assert.deepEqual(r.problems, []);
    return r.out!;
  }
  const decryptedInBackupDir = (at: Date) => decryptedIn(backupDir, encrypted, at);

  it('8. plasa de siguranță: > 24 h → ștearsă la backup:db, raportat; < 24 h → neatinsă', async () => {
    const dir = bdir('plasa');
    const enc = (await createBackup(opts(dir, { recipient, now: NOW }))).dir;
    const old = await decryptedIn(dir, enc, later(7));
    const fresh = await decryptedIn(dir, enc, later(25 * 3_600_000));
    const res = await createBackup(opts(dir, { recipient, now: later(25 * 3_600_000 + 60_000) }));
    assert.deepEqual(res.restoreCopiesRemoved, [old.split('/').pop()]);
    assert.ok(!existsSync(old));
    assert.ok(existsSync(fresh));
    assert.deepEqual(purgeStaleRestoreCopies(dir, later(26 * 3_600_000)), { removed: [], failed: [] });
    assert.deepEqual(res.restoreCopiesFailed, []);
  });

  it('o copie criptată nedecriptată → refuz explicit, fără nicio scriere', async () => {
    const i = await inspectRestore({ ...opts(backupDir), storageDir: join(freshDir('stenc'), 'x'), source: encrypted });
    assert.match(i.problems.join('\n'), /copie criptată.*backup:decrypt/);
    await assert.rejects(restoreBackup({ ...opts(backupDir), storageDir: join(freshDir('stenc2'), 'x'), source: encrypted }), RestoreRefusedError);
    assert.ok(existsSync(join(encrypted, ENCRYPTED_DB_FILE)));
    assert.equal(await n('SELECT COUNT(*) AS n FROM reports'), 3, 'nimic scris în bază');
  });

  it('refuz fără excepție (auditul checkpointului): fișier criptat + fișier în clar; numai indicatorul din manifest; copie decriptată cu un fișier .age rămas', async () => {
    const dir = bdir('variante');
    const enc = (await createBackup(opts(dir, { recipient, now: later(100) }))).dir;
    const plain = (await createBackup(opts(dir, { now: later(200) }))).dir;
    const variants: Array<[string, string]> = [];
    // a. copia criptată, cu baza în clar pusă lângă ea (fișierul în clar NU trebuie folosit)
    const mixed = join(freshDir('v-a'), enc.split('/').pop()!);
    cpSync(enc, mixed, { recursive: true });
    cpSync(join(plain, 'db.jsonl.gz'), join(mixed, 'db.jsonl.gz'));
    variants.push(['criptat + în clar', mixed]);
    // b. o copie în clar al cărei manifest declară criptarea (fără niciun fișier .age)
    const flagged = join(freshDir('v-b'), plain.split('/').pop()!);
    cpSync(plain, flagged, { recursive: true });
    const m = JSON.parse(readFileSync(join(flagged, 'manifest.json'), 'utf8'));
    m.encryption = { scheme: 'age-x25519', recipient };
    writeFileSync(join(flagged, 'manifest.json'), JSON.stringify(m, null, 2) + '\n');
    variants.push(['numai indicatorul din manifest', flagged]);
    // c. o copie decriptată validă, cu o fotografie criptată rămasă în ea
    const dec = (await decryptCopy(enc, identity, freshDir('v-c'), later(300))).out!;
    cpSync(join(enc, 'photos', 'r', `${id(10)}.webp.age`), join(dec, 'photos', 'r', `${id(10)}.webp.age`));
    variants.push(['copie decriptată cu un .age rămas', dec]);
    for (const [label, src] of variants) {
      const i = await inspectRestore({ ...opts(dir), storageDir: join(freshDir('stv'), 'x'), source: src });
      assert.match(i.problems.join('\n'), /Sursa este o copie criptată/, label);
      await assert.rejects(restoreBackup({ ...opts(dir), storageDir: join(freshDir('stv2'), 'x'), source: src }), RestoreRefusedError, label);
    }
    assert.equal(await n('SELECT COUNT(*) AS n FROM reports'), 3, 'nimic scris în bază');
    // controlul: aceeași copie decriptată, fără fișierul .age, nu este tratată ca o copie criptată
    rmSync(join(dec, 'photos', 'r', `${id(10)}.webp.age`));
    const ok = await inspectRestore({ ...opts(dir), storageDir: join(freshDir('stv3'), 'x'), source: dec });
    assert.ok(!ok.problems.some((p) => /copie criptată|copie decriptată/.test(p)), ok.problems.join('\n'));
  });

  it('C1.b: o copie care se prezintă drept decriptată, dar cu marcajul nevalid → refuz înaintea execuției; copia păstrată', async () => {
    const dir = bdir('marcaj');
    const enc = (await createBackup(opts(dir, { recipient, now: later(400) }))).dir;
    const cases: Array<[string, (d: string) => void, RegExp]> = [
      ['marcaj lipsă', (d) => rmSync(join(d, DECRYPTED_COPY_FILE)), /lipsește „DECRYPTED-COPY\.json”/],
      ['JSON invalid', (d) => writeFileSync(join(d, DECRYPTED_COPY_FILE), '{nu este json'), /nu este un JSON valid/],
      ['format greșit', (d) => writeFileSync(join(d, DECRYPTED_COPY_FILE), JSON.stringify({ ...JSON.parse(readFileSync(join(d, DECRYPTED_COPY_FILE), 'utf8')), format: 'altceva/1' })), /format necunoscut/],
      ['sursă nevalidă', (d) => writeFileSync(join(d, DECRYPTED_COPY_FILE), JSON.stringify({ ...JSON.parse(readFileSync(join(d, DECRYPTED_COPY_FILE), 'utf8')), source: 'oricare' })), /sursa nu este numele/],
    ];
    let k = 0;
    for (const [label, mutate, expected] of cases) {
      const src = (await decryptCopy(enc, identity, dir, later(500 + k++))).out!;
      mutate(src);
      const i = await inspectRestore({ ...opts(dir), storageDir: join(freshDir('stm'), 'x'), source: src });
      // refuzul vine din oricare dintre cele două verificări (manifestul copiei declară criptarea), cu motivul concret
      assert.match(i.problems.join('\n'), /nu este o copie decriptată validă|se prezintă drept copie decriptată, dar nu este validă/, label);
      assert.match(i.problems.join('\n'), expected, label);
      assert.equal(i.source.decryptedCopy, false, label);
      await assert.rejects(restoreBackup({ ...opts(dir), storageDir: join(freshDir('stm2'), 'x'), source: src }), RestoreRefusedError, label);
      assert.ok(existsSync(src), `${label}: copia păstrată (refuz înaintea execuției)`);
    }
    assert.equal(await n('SELECT COUNT(*) AS n FROM reports'), 3, 'nimic scris în bază');
  });

  it('3. listBackups și rotația nu listează și nu șterg copia decriptată', async () => {
    const enc = join(rotDir, listBackups(rotDir)[0]!);
    const src = await decryptedIn(rotDir, enc, later(2));
    assert.ok(!listBackups(rotDir).some((x) => x.startsWith('civic-restore-')));
    const removed = rotateBackups(rotDir, later(30 * DAY));
    assert.deepEqual(removed, [enc.split('/').pop()], 'rotația șterge numai copia criptată veche');
    assert.ok(existsSync(src), 'rotația nu atinge civic-restore-*');
  });

  it('4. detecția R18 nu este influențată de prezența copiei decriptate', async () => {
    const before = accountMarkersEvidence(backupDir);
    const src = await decryptedInBackupDir(later(3));
    assert.deepEqual(accountMarkersEvidence(backupDir), before);
    rmSync(src, { recursive: true });
  });

  it('1. restore:db --check acceptă copia decriptată ca sursă și o raportează ca atare', async () => {
    const src = await decryptedInBackupDir(later(1));
    assert.ok(existsSync(join(src, DECRYPTED_COPY_FILE)));
    const target = await emptyTarget();
    const i = await inspectRestore({ ...opts(backupDir), databaseUrl: target, storageDir: join(freshDir('st1'), 'x'), source: src });
    assert.deepEqual(i.problems, []);
    assert.equal(i.source.decryptedCopy, true);
    assert.match(formatRestoreInspection(i).join('\n'), /copie decriptată/);
    assert.ok(existsSync(src), '--check nu șterge niciodată');
    rmSync(src, { recursive: true });
  });

  it('2. reuniunea marcajelor include sursa decriptată și toate copiile criptate', async () => {
    const src = await decryptedInBackupDir(later(DAY + 1));
    const i = await inspectRestore({ ...opts(backupDir), databaseUrl: await emptyTarget(), storageDir: join(freshDir('st2'), 'x'), source: src });
    for (const c of [encrypted, second, src]) assert.ok(i.markers.snapshotCopies.includes(c.split('/').pop()!), `${c} în reuniune`);
    rmSync(src, { recursive: true });
  });

  it('5. scenariul B (BACKUP_DIR gol): restaurarea reușește; marcajele de cont se refac din fotografia sursei', async () => {
    const emptyBackupDir = freshDir('b-empty');
    const src = await decryptedIn(emptyBackupDir, withAccountCopy, later(6_000));
    const res = await restoreBackup({
      ...opts(emptyBackupDir),
      databaseUrl: await emptyTarget(),
      storageDir: join(freshDir('st5'), 'x'),
      source: src,
      allowMissingMarkers: true,
      atLeast: 3,
      now: later(7_000),
    });
    assert.equal(res.reportCounter, 3);
    assert.ok(readAccountDeletionMarkers(emptyBackupDir).entries.some((e) => e.accountId === id(900)));
    assert.equal(res.decryptedCopyRemoved, src);
    assert.ok(!existsSync(src));
  });

  it('6. refuz înaintea execuției → copia decriptată se păstrează, cu motivul raportat', async () => {
    const src = await decryptedInBackupDir(later(4));
    const st = join(freshDir('st6'), 'x');
    mkdirSync(st, { recursive: true });
    writeFileSync(join(st, 'ocupat'), 'x'); // STORAGE_DIR nu este gol → refuz înainte de prima scriere
    await assert.rejects(restoreBackup({ ...opts(backupDir), databaseUrl: await emptyTarget(), storageDir: st, source: src }), (err) => {
      assert.ok(err instanceof RestoreRefusedError);
      assert.match(err.message, /STORAGE_DIR nu este gol/);
      return true;
    });
    assert.ok(existsSync(src), 'copia păstrată pentru investigare');
    rmSync(src, { recursive: true });
  });

  it('7a. restaurare executată, reușită → copia ștearsă; ștergerea raportată; ciclul complet corect', async () => {
    // o ștergere după copie: sesizarea nu reapare
    recordReportDeletions(backupDir, [{ id: id(12), createdAt: ago(1) }], later(10));
    const src = await decryptedInBackupDir(later(5));
    const st = join(freshDir('st7a'), 'x');
    const res = await restoreBackup({ ...opts(backupDir), databaseUrl: await emptyTarget(), storageDir: st, source: src, now: later(20) });
    assert.equal(res.decryptedCopyRemoved, src);
    assert.equal(res.decryptedCopyRemoveFailed, null);
    assert.ok(!existsSync(src));
    assert.equal(res.deletedFromList, 1);
    assert.equal(res.photosRestored, 2);
    assert.equal(readFileSync(join(st, 'r', `${id(10)}.webp`), 'utf8'), `${SECRET_PHOTO}-TM-001`);
    const rows = await q<{ r: string }>('SELECT reference_number AS r FROM reports ORDER BY r');
    assert.deepEqual(rows.map((x) => x.r), ['TM-001', 'TM-002']);
    assert.equal(await n("SELECT COUNT(*) AS n FROM citizen_accounts WHERE id = ?", [id(1)]), 1);
  });

  it('7b. restaurare executată, eșuată în tranzacție → copia ștearsă; ștergerea raportată în eroare', async () => {
    const src = await decryptedInBackupDir(later(6));
    // numărul de rânduri din manifest nu mai corespunde: eșec DUPĂ începerea tranzacției (verificarea rândurilor)
    const m = JSON.parse(readFileSync(join(src, 'manifest.json'), 'utf8'));
    m.counts.reports += 1;
    writeFileSync(join(src, 'manifest.json'), JSON.stringify(m, null, 2) + '\n');
    await assert.rejects(
      restoreBackup({ ...opts(backupDir), databaseUrl: await emptyTarget(), storageDir: join(freshDir('st7b'), 'x'), source: src }),
      /Restaurare incompletă[\s\S]*copia decriptată .* a fost ștearsă/i,
    );
    assert.ok(!existsSync(src));
    assert.equal(await n('SELECT COUNT(*) AS n FROM reports'), 0, 'tranzacția anulată: baza țintă goală');
  });
});

describe('E4.11 §7.4: rotația, BACKUP_DIR mixt, R18 cu copii criptate', () => {
  it('rotația de 7 zile șterge și copiile criptate mai vechi', async () => {
    const dir = bdir('rot');
    const c = (await createBackup(opts(dir, { recipient, now: NOW }))).dir;
    const removed = rotateBackups(dir, later((BACKUP_ROTATION_DAYS + 1) * DAY));
    assert.deepEqual(removed, [c.split('/').pop()]);
  });

  it('restore:db --check cu BACKUP_DIR mixt (copie în clar + copie criptată): fotografiile marcajelor se citesc din ambele', async () => {
    const dir = bdir('mixt');
    const plain = (await createBackup(opts(dir, { now: NOW }))).dir;
    const enc = (await createBackup(opts(dir, { recipient, now: later(1_000) }))).dir;
    try {
      const i = await inspectRestore({ ...opts(dir), databaseUrl: await emptyTarget(), storageDir: join(freshDir('stm'), 'x'), source: plain });
      assert.deepEqual(i.problems, []);
      assert.ok(i.markers.snapshotCopies.includes(enc.split('/').pop()!));
      assert.equal(i.source.decryptedCopy, false);
    } finally {
      await populate();
    }
  });

  it('R18: copiile criptate dovedesc inițializarea; refacerea marcajelor de cont citește fotografiile lor', async () => {
    const dir = bdir('r18');
    await createBackup(opts(dir, { recipient, now: NOW }));
    writeMissingAccountDeletionEntries(dir, [{ accountId: id(901), deletedAt: ago(2).toISOString() }]);
    await createBackup(opts(dir, { recipient, now: later(1_000) }));
    rmSync(join(dir, ACCOUNT_DELETIONS_DIR), { recursive: true });
    rmSync(join(dir, ACCOUNT_DELETIONS_PENDING_DIR), { recursive: true });
    rmSync(join(dir, 'account-markers-initialized.json'));
    assert.equal(accountMarkersLost(dir), true, 'copiile criptate (markers.json în clar) sunt dovada inițializării');
    const r = recreateAccountMarkers(dir);
    assert.equal(r.copiesRead, 2);
    assert.ok(readAccountDeletionMarkers(dir).entries.some((e) => e.accountId === id(901)));
  });
});

// ---- comenzile reale (procese separate) ----

const MAIN = join(APP_ROOT, 'server', 'src', 'main.ts');

function cli(args: string[], env: Record<string, string | undefined>, input?: string) {
  return spawnSync(process.execPath, ['--import', 'tsx', MAIN, ...args], {
    env: { ...env, PATH: process.env.PATH ?? '', TSX_DISABLE_CACHE: '1' },
    input,
    encoding: 'utf8',
    timeout: 120_000,
  });
}

describe('E4.11: comenzile reale — ieșirile conțin numai diagnostice (§24.4)', () => {
  let backupDir: string;
  let copy: string;
  const env = () => testEnv({ DATABASE_URL: testDatabaseUrl(), BACKUP_DIR: backupDir, STORAGE_DIR: storageDir, BACKUP_AGE_RECIPIENT: recipient });

  before(() => {
    backupDir = bdir('cli');
  });

  it('backup:db cu cheia: copie criptată; ieșirea fără date în clar', () => {
    const r = cli(['backup:db'], env());
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /criptată \(age\)/);
    assertNoPlaintext(r.stdout + r.stderr, 'backup:db');
    copy = join(backupDir, listBackups(backupDir).pop()!);
    assert.ok(existsSync(join(copy, ENCRYPTED_DB_FILE)));
  });

  it('backup:verify pe calculator (fără civic.env, fără bază): cod 0; fraza-parolă de la intrarea standard', () => {
    const r = cli(['backup:verify', copy, '--identity', identityFile], { HOME: root }, `${PASSPHRASE}\n`);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /copia este întreagă și consecventă/);
    assertNoPlaintext(r.stdout + r.stderr, 'backup:verify');
  });

  it('backup:verify cu frază-parolă greșită → cod 1, mesaj clar', () => {
    const r = cli(['backup:verify', copy, '--identity', identityFile], { HOME: root }, 'altă frază\n');
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Fraza-parolă este greșită/);
    assertNoPlaintext(r.stdout + r.stderr, 'backup:verify (frază greșită)');
  });

  it('backup:decrypt, apoi restore:db --check și --confirm prin CLI: ieșirile fără date în clar; copia ștearsă după restaurare', async () => {
    const d = cli(['backup:decrypt', copy, '--identity', identityFile, '--out', backupDir], { HOME: root }, `${PASSPHRASE}\n`);
    assert.equal(d.status, 0, d.stderr);
    assertNoPlaintext(d.stdout + d.stderr, 'backup:decrypt');
    const src = readdirSync(backupDir).find((x) => x.startsWith('civic-restore-'))!;
    assert.ok(src, d.stdout);
    const target = await emptyTarget();
    const st = join(freshDir('stcli'), 'x');
    const renv = { ...env(), DATABASE_URL: target, STORAGE_DIR: st };
    const c = cli(['restore:db', join(backupDir, src), '--check'], renv);
    assert.equal(c.status, 0, c.stdout + c.stderr);
    assert.match(c.stdout, /copie decriptată/);
    assertNoPlaintext(c.stdout + c.stderr, 'restore:db --check');
    const ok = cli(['restore:db', join(backupDir, src), '--confirm'], renv);
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.match(ok.stdout, /copia decriptată .* a fost ștearsă/);
    assertNoPlaintext(ok.stdout + ok.stderr, 'restore:db --confirm');
    assert.ok(!existsSync(join(backupDir, src)));
  });

  it('producție fără BACKUP_AGE_RECIPIENT: pornirea și comenzile sunt refuzate (P3)', () => {
    const r = cli(['migrate:status'], testEnv({ APP_ENV: 'production', PUBLIC_BASE_URL: 'https://exemplu.test', DATABASE_URL: testDatabaseUrl(), BACKUP_AGE_RECIPIENT: undefined }));
    assert.equal(r.status, 1);
    assert.match(r.stderr, /BACKUP_AGE_RECIPIENT/);
  });

  it('plasa de siguranță la pornire: copia decriptată > 24 h ștearsă și raportată; < 24 h neatinsă', async () => {
    const dir = bdir('start');
    const enc = (await createBackup(opts(dir, { recipient, now: NOW }))).dir;
    const oldCopy = (await decryptCopy(enc, identity, dir, new Date(Date.now() - 48 * 3_600_000))).out!;
    const freshCopy = (await decryptCopy(enc, identity, dir, new Date())).out!;
    const port = 3950 + Math.floor(Math.random() * 40);
    const child = spawn(process.execPath, ['--import', 'tsx', MAIN], {
      env: { ...testEnv({ DATABASE_URL: testDatabaseUrl(), BACKUP_DIR: dir, STORAGE_DIR: storageDir, PORT: String(port), LOG_LEVEL: 'info' }), PATH: process.env.PATH ?? '', TSX_DISABLE_CACHE: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (b) => (out += b));
    child.stderr.on('data', (b) => (out += b));
    try {
      const deadline = Date.now() + 60_000;
      while (!/Turnu Măgurele Civic pornit/.test(out) && Date.now() < deadline && child.exitCode === null) {
        await new Promise((r) => setTimeout(r, 200));
      }
      assert.match(out, /Turnu Măgurele Civic pornit/, out);
      assert.match(out, /copii decriptate mai vechi de 24 de ore, șterse/i);
      assert.ok(!existsSync(oldCopy));
      assert.ok(existsSync(freshCopy));
      assertNoPlaintext(out, 'pornirea');
    } finally {
      child.kill('SIGTERM');
    }
  });
});

describe('E4.11 §7.2: strace — backup:db scrie numai în lista exactă de căi permise', () => {
  it('nicio altă cale deschisă pentru scriere, redenumită, legată, trunchiată sau copiată', async () => {
    const probe = spawnSync('strace', ['-V'], { encoding: 'utf8' });
    assert.equal(probe.status, 0, '„strace” lipsește: testul este obligatoriu (îl instalează jobul CI)');
    const dir = freshDir('strace');
    const backupDir = join(dir, 'backups');
    mkdirSync(backupDir);
    recordReportCounter(backupDir, 3);
    const log = join(dir, 'strace.log');
    const env = { ...testEnv({ DATABASE_URL: testDatabaseUrl(), BACKUP_DIR: backupDir, STORAGE_DIR: storageDir, BACKUP_AGE_RECIPIENT: recipient }), PATH: process.env.PATH ?? '', TSX_DISABLE_CACHE: '1' };
    // a doua rulare (directoarele de marcaje există deja) se urmărește separat de prima (inițializare)
    for (const pass of ['init', 'zi-obisnuita']) {
      // a doua rulare: o intenție de ștergere a unui cont (cont inexistent în bază) se reconciliază în timpul backup-ului
      if (pass === 'zi-obisnuita') recordAccountDeletionIntent(backupDir, id(950), new Date());
      const r = spawnSync(
        'strace',
        [
          '-f', '-qq', '-s', '4096', '-o', log,
          '-e', 'trace=open,openat,openat2,creat,rename,renameat,renameat2,link,linkat,symlink,symlinkat,truncate,ftruncate,copy_file_range,sendfile,mkdir,mkdirat',
          process.execPath, '--import', 'tsx', MAIN, 'backup:db',
        ],
        { env, encoding: 'utf8', timeout: 120_000 },
      );
      assert.equal(r.status, 0, `${pass}: ${r.stderr}`);
      const lines = readFileSync(log, 'utf8').split('\n').filter(Boolean);
      const violations = straceViolations(lines, backupDir);
      assert.deepEqual(violations, [], `${pass}: scrieri în afara listei permise:\n${violations.join('\n')}`);
      // dovada că urmărirea funcționează: fișierele copiei apar în jurnal
      assert.ok(lines.some((l) => l.includes(`/${ENCRYPTED_DB_FILE}"`) && /O_CREAT/.test(l)), `${pass}: jurnalul strace nu conține scrierea copiei`);
      // mulțimea exactă a căilor scrise (normalizate: marcaj de timp, PID, sufixe aleatoare), pentru jurnalul CI
      console.log(`E4.11 strace (${pass}): căi scrise în BACKUP_DIR:\n  ${observedWrites(lines, backupDir).join('\n  ')}`);
      if (pass === 'zi-obisnuita') {
        assert.ok(lines.some((l) => /^\d+\s+rename/.test(l) && l.includes(`account-deletions/${id(950)}.json`)), 'promovarea intenției a fost urmărită');
      }
      await new Promise((res) => setTimeout(res, 5)); // nume de copie diferit (marcajul de timp în milisecunde)
    }
  });

  it('controlul negativ al analizorului: scrierile interzise sintetice sunt detectate', () => {
    const b = '/x/backups';
    const bad = [
      `1 openat(AT_FDCWD, "/tmp/civic-plain.bin", O_WRONLY|O_CREAT|O_TRUNC|O_CLOEXEC, 0666) = 21`,
      `1 openat(AT_FDCWD, "${b}/.tmp-civic-backup-20261101T031700000Z/db.jsonl.gz", O_WRONLY|O_CREAT|O_TRUNC|O_CLOEXEC, 0666) = 21`,
      `1 openat(AT_FDCWD, "${b}/.tmp-civic-backup-20261101T031700000Z/photos/r/a.webp", O_WRONLY|O_CREAT|O_EXCL|O_CLOEXEC, 0600) = 22`,
      `1 copy_file_range(20, NULL, 21, NULL, 9223372036854775807, 0) = 10`,
      `1 rename("${b}/x.json", "${b}/deletions/../../evil") = 0`,
      `1 openat(AT_FDCWD, "${b}/deletions/01ABC.json", O_WRONLY|O_CREAT|O_EXCL, 0600) = 23`,
    ];
    const v = straceViolations(bad, b);
    assert.equal(new Set(v).size, bad.length, `linii detectate ${new Set(v).size} din ${bad.length}:\n${v.join('\n')}`);
    const good = [
      `1 openat(AT_FDCWD, "${b}/.tmp-civic-backup-20261101T031700000Z/db.jsonl.gz.age", O_WRONLY|O_CREAT|O_EXCL|O_CLOEXEC, 0600) = 21`,
      `1 openat(AT_FDCWD, "${b}/.tmp-civic-backup-20261101T031700000Z/photos/r/a.webp.age", O_WRONLY|O_CREAT|O_EXCL|O_CLOEXEC, 0600) = 22`,
      `1 rename("${b}/.tmp-civic-backup-20261101T031700000Z", "${b}/civic-backup-20261101T031700000Z") = 0`,
      `1 openat(AT_FDCWD, "/etc/hosts", O_RDONLY|O_CLOEXEC) = 3`,
      `1 openat(AT_FDCWD, "/tmp/nu-exista", O_WRONLY|O_CREAT, 0666) = -1 ENOENT (No such file or directory)`,
    ];
    assert.deepEqual(straceViolations(good, b), []);
  });
});

/** Căile scrise, relative la BACKUP_DIR și normalizate (pentru raport). */
function observedWrites(lines: string[], backupDir: string): string[] {
  const set = new Set<string>();
  for (const line of lines) {
    const body = line.replace(/^\d+\s+/, '');
    const m = /^(\w+)\((.*)/.exec(body);
    if (!m) continue;
    const call = m[1]!;
    const isWriteOpen = /^open/.test(call) && /O_WRONLY|O_RDWR|O_CREAT|O_TRUNC|O_APPEND/.test(m[2]!);
    if (!isWriteOpen && !/^(rename|mkdir|link|creat|truncate)/.test(call)) continue;
    if (/=\s+-\d+/.test(body)) continue;
    for (const [, p] of m[2]!.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
      if (!p!.startsWith(backupDir)) continue;
      const rel = p!.slice(backupDir.length + 1) || '.';
      set.add(
        `${call}: ` +
          rel
            .replace(/\d{8}T\d{9}Z/g, '<UTC>')
            .replace(/\.\d+\.[0-9a-f]{12}/g, '.<pid>.<aleator>')
            .replace(/photos\/.+\.age$/, 'photos/<cheie>.age'),
      );
    }
  }
  return [...set].sort();
}

const HEX = '[0-9a-f]{12}';
const PID = '\\d+';
const STAMP = '\\d{8}T\\d{9}Z';
const MARKER_DIRS = '(deletions|account-deletions|account-deletions-pending)';
const ULID = '[0-9A-HJKMNP-TV-Z]{26}';
/** Lista EXACTĂ a căilor permise (relative la BACKUP_DIR), pentru scriere, creare, redenumire sau directoare. */
const ALLOWED = [
  // directorul însuși și directorul temporar al copiei, cu fișierele copiei criptate (planul §3.2)
  '',
  `\\.tmp-civic-backup-${STAMP}`,
  `\\.tmp-civic-backup-${STAMP}/(manifest\\.json|markers\\.json|binding\\.json\\.age|db\\.jsonl\\.gz\\.age)`,
  `\\.tmp-civic-backup-${STAMP}/photos(/[A-Za-z0-9_-][A-Za-z0-9._-]*)*`,
  `civic-backup-${STAMP}`,
  // marcajele aplicației (markers.ts): proba de scriere, marcajul contorului, directoarele și martorul R18
  `\\.probe\\.${PID}\\.${HEX}`,
  `\\.tmp-\\.probe\\.${PID}\\.${HEX}\\.${PID}\\.${HEX}`,
  'report-counter-watermark\\.json',
  `\\.tmp-report-counter-watermark\\.json\\.${PID}\\.${HEX}`,
  MARKER_DIRS,
  `${MARKER_DIRS}/\\.probe\\.${PID}\\.${HEX}`,
  `${MARKER_DIRS}/\\.tmp-\\.probe\\.${PID}\\.${HEX}\\.${PID}\\.${HEX}`,
  'account-markers-initialized\\.json',
  // R18: reconcilierea unei intenții de ștergere a unui cont (promovarea: redenumirea intenției în marcaj)
  `account-deletions-pending/${ULID}\\.json`,
  `account-deletions/${ULID}\\.json`,
  `\\.tmp-account-markers-initialized\\.json\\.${PID}\\.${HEX}`,
].map((p) => new RegExp(`^${p}$`));
const PHOTO_FILE_RE = new RegExp(`^\\.tmp-civic-backup-${STAMP}/photos(/[A-Za-z0-9_-][A-Za-z0-9._-]*)+$`);

/**
 * Scrierile găsite în jurnalul strace, în afara listei. Se iau în considerare: deschiderile cu acces de
 * scriere / creare / trunchiere, `creat`, redenumirile, legăturile, trunchierile, copierile între fișiere
 * (`copy_file_range`, `sendfile`: nicio copiere în clar nu este permisă) și crearea directoarelor.
 * Ieșirile standard (descriptorii 1 și 2) nu se deschid, deci nu apar.
 */
function straceViolations(lines: string[], backupDir: string): string[] {
  const out: string[] = [];
  const base = backupDir.replace(/\/$/, '');
  const check = (path: string, line: string, isFile: boolean) => {
    if (path === base) return;
    if (!path.startsWith(base + '/')) {
      out.push(line);
      return;
    }
    const rel = path.slice(base.length + 1);
    if (rel.startsWith('.tmp-civic-backup-') && rel.includes('/photos/') && isFile) {
      if (!PHOTO_FILE_RE.test(rel) || !rel.endsWith('.age')) out.push(line);
      return;
    }
    if (!ALLOWED.some((re) => re.test(rel))) out.push(line);
  };
  for (const line of lines) {
    const body = line.replace(/^\d+\s+/, '');
    if (/^(\+\+\+|---)/.test(body) || /resumed>/.test(body) && !/"/.test(body)) continue;
    const m = /^(\w+)\((.*)\)\s+=\s+(-?\d+|\?)/.exec(body) ?? /^(\w+)\((.*)$/.exec(body);
    if (!m) continue;
    const [, call, argsRaw] = m as unknown as [string, string, string];
    const result = /=\s+(-?\d+)/.exec(body)?.[1];
    if (result !== undefined && Number(result) < 0) continue; // apel eșuat: nimic scris
    const paths = [...argsRaw!.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1]!);
    switch (call) {
      case 'open':
      case 'openat':
      case 'openat2': {
        if (!/O_WRONLY|O_RDWR|O_CREAT|O_TRUNC|O_APPEND/.test(argsRaw!)) break;
        const p = paths[0];
        if (p === undefined) break;
        if (p === '/dev/null' || p === '/dev/tty') break;
        check(p, line, true);
        break;
      }
      case 'creat':
      case 'truncate':
        if (paths[0] !== undefined) check(paths[0], line, true);
        break;
      case 'mkdir':
      case 'mkdirat':
        if (paths[0] !== undefined) check(paths[0], line, false);
        break;
      case 'rename':
      case 'renameat':
      case 'renameat2':
      case 'link':
      case 'linkat':
        for (const p of paths) check(p, line, true);
        break;
      case 'symlink':
      case 'symlinkat':
      case 'copy_file_range':
      case 'sendfile':
        out.push(line); // nicio legătură simbolică și nicio copiere între fișiere în timpul backup-ului criptat
        break;
      case 'ftruncate':
        break; // pe un descriptor deja deschis: deschiderea lui este verificată mai sus
    }
  }
  return out;
}
