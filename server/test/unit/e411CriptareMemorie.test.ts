// E4.11 (planul r3.2 §7.2; registrul §24.4): testul de memorie al criptării în flux.
// Este un test de REGRESIE pentru comportamentul în flux, nu o garanție absolută a limitei de memorie:
// eșantionarea la 10 ms poate rata un vârf foarte scurt (§24.4).
//
// Metodologia (planul §7.2): proces Node separat, cu --expose-gc; fișier de 512 MiB generat înaintea
// pornirii procesului de măsurare; încălzire pe 64 MiB (planul: 1 MiB; abaterea A11, vezi mai jos); referința după două colectări forțate; RSS
// eșantionat la 10 ms, reținut maximul; criteriul: maxim − referință < 64 MiB; control negativ: citirea
// întregului fișier în memorie trebuie să depășească 480 MiB peste referință (altfel testul este nesensibil);
// trei repetări, toate trebuie să treacă; valorile se scriu în jurnal.
//
// Al doilea grup (auditul checkpointului): fluxul COMPLET al bazei, `encryptDbLines` (rânduri → gzip → age), cu
// rândurile produse de un generator (~300 MiB de text). Controlul negativ al acestui grup este exact colectarea
// rândurilor într-un tablou, ca în `backup:db` (planul §3.2, pasul 1: „rândurile din tranzacția de citire, în
// memorie, ca azi”). Rezultatul trebuie citit separat:
// - gzip + criptarea NU acumulează baza comprimată în memorie (criteriul < 64 MiB);
// - întregul proces `backup:db` NU are memorie constantă: rândurile citite din bază sunt ținute în memorie înaintea
//   compresiei, deci consumul total crește cu dimensiunea bazei. Testul o măsoară și o consemnează; nu o ascunde.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, rmSync, writeSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { after, before, describe, it } from 'node:test';
import { APP_ROOT } from '../../src/paths.ts';

const MIB = 1024 * 1024;
// A11 (CI 41289728463, 01.11.2026): pe Node 24, primul flux mare dintr-un proces face o alocare UNICĂ de circa
// 35 MiB (constantă: aceeași pentru fișiere de 64 MiB … 1 GiB), care nu apare pe Node 20 / 22. Cu încălzirea de
// 1 MiB din plan, această alocare cădea în măsurătoare (64–68 MiB). Încălzirea pe 64 MiB o mută înaintea referinței;
// pragul (< 64 MiB) și controlul negativ (> 480 MiB) rămân neschimbate.
const WARMUP_MIB = 64;
const LIMIT_MIB = 64;
const NEGATIVE_MIN_MIB = 480;
let dir: string;
let big: string;
let warm: string;

function writeRandom(path: string, bytes: number) {
  const fd = openSync(path, 'w');
  try {
    for (let left = bytes; left > 0; left -= 8 * MIB) writeSync(fd, randomBytes(Math.min(8 * MIB, left)));
  } finally {
    closeSync(fd);
  }
}

const moduleUrl = pathToFileURL(join(APP_ROOT, 'server', 'src', 'db', 'backupCrypto.ts')).href;
const DB_LINES = 2_000_000; // ~150 de caractere pe rând: ~300 MiB de text JSON

/** Procesul de măsurare pentru fluxul bazei: `db` = encryptDbLines(generator); `rows` = tabloul rândurilor. */
const dbScript = `
import { createHash } from 'node:crypto';
import { generateX25519Identity, identityToRecipient } from 'age-encryption';
import { encryptDbLines } from ${JSON.stringify(moduleUrl)};
const [mode, out, count] = process.argv.slice(-3);
const N = Number(count);
// rânduri deterministe, puțin compresibile (ca datele reale: identificatori, texte, valori)
function* lines(n) {
  let h = Buffer.from('e411');
  for (let i = 0; i < n; i++) {
    h = createHash('sha256').update(h).digest();
    yield JSON.stringify({ t: 'reports', v: [i, h.toString('base64'), h.toString('hex'), 'Str. Test ' + (i % 997)] });
  }
}
const recipient = await identityToRecipient(await generateX25519Identity());
await encryptDbLines(lines(1000), out + '.warm', recipient);
global.gc(); global.gc();
const base = process.memoryUsage().rss;
let max = base;
const t = setInterval(() => { const r = process.memoryUsage().rss; if (r > max) max = r; }, 10);
if (mode === 'rows') { const all = [...lines(N)]; max = Math.max(max, process.memoryUsage().rss); void all.length; }
else await encryptDbLines(lines(N), out, recipient);
clearInterval(t);
max = Math.max(max, process.memoryUsage().rss);
console.log(JSON.stringify({ deltaMiB: (max - base) / 1048576 }));
`;

function measureDb(mode: 'db' | 'rows', n: number): number {
  const out = join(dir, `db-${mode}-${n}.age`);
  const r = spawnSync(
    process.execPath,
    ['--import', 'tsx', '--expose-gc', '--input-type=module', '-e', dbScript, mode, out, String(DB_LINES)],
    { cwd: join(APP_ROOT, 'server'), encoding: 'utf8', maxBuffer: 1 << 20 },
  );
  assert.equal(r.status, 0, r.stderr);
  rmSync(out, { force: true });
  rmSync(out + '.warm', { force: true });
  return (JSON.parse(r.stdout.trim().split('\n').pop()!) as { deltaMiB: number }).deltaMiB;
}

/** Scriptul procesului de măsurare: `enc` = criptarea în flux; `neg` = controlul negativ (readFile). */
const script = `
import { createReadStream, readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { generateX25519Identity, identityToRecipient } from 'age-encryption';
import { encryptStreamToFile } from ${JSON.stringify(moduleUrl)};
const [mode, big, warm, out] = process.argv.slice(-4);
const recipient = await identityToRecipient(await generateX25519Identity());
await encryptStreamToFile(createReadStream(warm), out + '.warm', recipient);
global.gc(); global.gc();
const base = process.memoryUsage().rss;
let max = base;
const t = setInterval(() => { const r = process.memoryUsage().rss; if (r > max) max = r; }, 10);
if (mode === 'neg') { const b = readFileSync(big); max = Math.max(max, process.memoryUsage().rss); void b.length; }
else await encryptStreamToFile(createReadStream(big), out, recipient);
clearInterval(t);
max = Math.max(max, process.memoryUsage().rss);
console.log(JSON.stringify({ deltaMiB: (max - base) / 1048576 }));
`;

function measure(mode: 'enc' | 'neg', n: number): number {
  const out = join(dir, `out-${mode}-${n}.age`);
  const r = spawnSync(
    process.execPath,
    ['--import', 'tsx', '--expose-gc', '--input-type=module', '-e', script, mode, big, warm, out],
    { cwd: join(APP_ROOT, 'server'), encoding: 'utf8', maxBuffer: 1 << 20 },
  );
  assert.equal(r.status, 0, r.stderr);
  rmSync(out, { force: true });
  rmSync(out + '.warm', { force: true });
  return (JSON.parse(r.stdout.trim().split('\n').pop()!) as { deltaMiB: number }).deltaMiB;
}

before(() => {
  dir = mkdtempSync(join(tmpdir(), 'civic-e411-mem-'));
  big = join(dir, 'big.bin');
  warm = join(dir, 'warm.bin');
  writeRandom(big, 512 * MIB);
  writeRandom(warm, WARMUP_MIB * MIB);
});

after(() => rmSync(dir, { recursive: true, force: true }));

describe('E4.11 §7.2: memoria criptării în flux a unui fișier (encryptStreamToFile, 512 MiB)', () => {
  it('controlul negativ (readFile) depășește 480 MiB: testul este sensibil', () => {
    const neg = measure('neg', 0);
    console.log(`E4.11 memorie — control negativ (readFile 512 MiB): ${neg.toFixed(1)} MiB peste referință`);
    assert.ok(neg > NEGATIVE_MIN_MIB, `controlul negativ: ${neg.toFixed(1)} MiB ≤ ${NEGATIVE_MIN_MIB} MiB → test nesensibil`);
  });

  it('trei repetări: RSS maxim − referință < 64 MiB la fiecare', () => {
    const values = [1, 2, 3].map((n) => measure('enc', n));
    console.log(`E4.11 memorie — criptare în flux 512 MiB: ${values.map((v) => v.toFixed(1)).join(' / ')} MiB peste referință (prag ${LIMIT_MIB})`);
    for (const v of values) assert.ok(v < LIMIT_MIB, `RSS maxim − referință = ${v.toFixed(1)} MiB ≥ ${LIMIT_MIB} MiB`);
  });
});

describe('E4.11 §7.2 (auditul checkpointului): memoria fluxului bazei, rânduri → gzip → age (encryptDbLines)', () => {
  it('controlul negativ: colectarea rândurilor într-un tablou, ca în backup:db, crește cu datele (> 200 MiB pentru ~300 MiB de text)', () => {
    const rows = measureDb('rows', 0);
    console.log(
      `E4.11 memorie — colectarea a ${DB_LINES} de rânduri într-un tablou (ca backup:db, planul §3.2 pasul 1): ${rows.toFixed(1)} MiB peste referință. ` +
        'Consumul total al backup:db crește deci cu dimensiunea bazei; numai gzip + criptarea sunt în flux.',
    );
    assert.ok(rows > 200, `colectarea rândurilor: ${rows.toFixed(1)} MiB ≤ 200 MiB → test nesensibil`);
  });

  it('trei repetări: encryptDbLines(generator) — RSS maxim − referință < 64 MiB la fiecare', () => {
    const values = [1, 2, 3].map((n) => measureDb('db', n));
    console.log(`E4.11 memorie — encryptDbLines, ${DB_LINES} de rânduri dintr-un generator: ${values.map((v) => v.toFixed(1)).join(' / ')} MiB peste referință (prag ${LIMIT_MIB})`);
    for (const v of values) assert.ok(v < LIMIT_MIB, `RSS maxim − referință = ${v.toFixed(1)} MiB ≥ ${LIMIT_MIB} MiB`);
  });
});
