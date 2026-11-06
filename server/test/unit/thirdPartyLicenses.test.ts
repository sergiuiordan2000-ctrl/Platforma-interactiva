// Notele de licență ale codului terț (propunerea „corectura notelor de licență” r2, aprobată la 06.11.2026:
// D-L1 = A, D-L2 = A, D-L3 = B): generatorul din scripts/third-party-licenses.mjs. Fără bază de date.

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import {
  ThirdPartyLicenseError,
  checkDeclaredLicense,
  collectThirdPartyLicenses,
  packageRootOf,
  renderThirdPartyLicenses,
} from '../../../scripts/third-party-licenses.mjs';

let root: string;
let nm: string;
let extra: string;

function pkg(dir: string, pj: Record<string, unknown>, files: Record<string, string> = {}): string {
  const d = join(nm, dir);
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, 'package.json'), JSON.stringify(pj));
  writeFileSync(join(d, 'index.js'), '');
  for (const [k, v] of Object.entries(files)) writeFileSync(join(d, k), v);
  return join(d, 'index.js');
}
const fails = (fn: () => unknown, re: RegExp) =>
  assert.throws(fn, (e: unknown) => e instanceof ThirdPartyLicenseError && re.test(e.message));

before(() => {
  root = mkdtempSync(join(tmpdir(), 'civic-licente-'));
  nm = join(root, 'node_modules');
  extra = join(root, 'extra');
  mkdirSync(extra);
});
after(() => rmSync(root, { recursive: true, force: true }));

describe('notele de licență: identificarea pachetelor', () => {
  it('directorul pachetului, inclusiv scope și pachete imbricate; codul propriu ignorat', () => {
    assert.equal(packageRootOf('/a/node_modules/x/lib/i.js'), '/a/node_modules/x');
    assert.equal(packageRootOf('/a/node_modules/@s/y/i.js'), '/a/node_modules/@s/y');
    assert.equal(packageRootOf('/a/node_modules/x/node_modules/cookie/i.js'), '/a/node_modules/x/node_modules/cookie');
    assert.equal(packageRootOf('C:\\a\\node_modules\\z\\i.js'), 'C:/a/node_modules/z');
    assert.equal(packageRootOf('/a/src/main.ts'), null);
    assert.equal(packageRootOf('\0/a/node_modules/q/i.js?commonjs'), '/a/node_modules/q');
  });
  it('același nume, versiuni diferite: intrări separate, fiecare cu propriul text', () => {
    const a = pkg('cookie', { name: 'cookie', version: '2.0.1', license: 'MIT' }, { LICENSE: 'Copyright A' });
    const b = pkg('x/node_modules/cookie', { name: 'cookie', version: '1.1.1', license: 'MIT' }, { LICENSE: 'Copyright B' });
    const e = collectThirdPartyLicenses([a, b, a], { extraDir: extra });
    assert.deepEqual(e.map((x) => x.id), ['cookie@1.1.1', 'cookie@2.0.1']);
    assert.equal(e[0]!.texts[0]!.text, 'Copyright B');
    assert.equal(e[1]!.texts[0]!.text, 'Copyright A');
  });
});

describe('notele de licență: licența declarată', () => {
  it('lista acceptată trece; ambiguă, nesuportată, lipsă sau în afara listei: refuz', () => {
    for (const l of ['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', 'MIT-0', 'BlueOak-1.0.0']) assert.equal(checkDeclaredLicense('p@1', l), l);
    fails(() => checkDeclaredLicense('p@1', '(MIT OR Apache-2.0)'), /ambiguă/);
    fails(() => checkDeclaredLicense('p@1', 'MIT AND ISC'), /ambiguă/);
    fails(() => checkDeclaredLicense('p@1', 'UNLICENSED'), /nesuportată/);
    fails(() => checkDeclaredLicense('p@1', 'SEE LICENSE IN LICENSE.md'), /nesuportată/);
    fails(() => checkDeclaredLicense('p@1', 'GPL-3.0'), /nu este pe lista acceptată/);
    fails(() => checkDeclaredLicense('p@1', undefined), /lipsește/);
    fails(() => checkDeclaredLicense('p@1', { type: 'MIT' }), /lipsește/);
  });
  it('o licență neacceptată oprește generarea, cu toate problemele listate', () => {
    const a = pkg('gpl', { name: 'gpl', version: '1.0.0', license: 'GPL-3.0' }, { LICENSE: 'x' });
    const b = pkg('nolic', { name: 'nolic', version: '1.0.0', license: 'MIT' });
    fails(() => collectThirdPartyLicenses([a, b], { extraDir: extra }), /gpl@1\.0\.0[\s\S]*nolic@1\.0\.0/);
  });
});

describe('notele de licență: textele', () => {
  it('fișierele LICENSE și NOTICE sunt incluse integral, neschimbate', () => {
    const t = 'Apache License\n  Version 2.0\n\nCopyright 2020 X  \n';
    const a = pkg('apache', { name: 'apache', version: '3.0.0', license: 'Apache-2.0' }, { 'LICENSE.txt': t, NOTICE: 'Notice text' });
    const [e] = collectThirdPartyLicenses([a], { extraDir: extra });
    assert.deepEqual(e!.texts.map((x) => x.source), ['LICENSE.txt (din pachet)', 'NOTICE (din pachet)']);
    assert.equal(e!.texts[0]!.text, t);
    const out = renderThirdPartyLicenses([e!], { title: 'T' });
    // textul integral apare NESCHIMBAT în ieșire, inclusiv spațiile și rândurile goale de la sfârșit
    assert.ok(out.includes(t), 'textul LICENSE, identic, cu spațiile finale');
    assert.ok(out.includes('Notice text'));
    const t2 = 'Fără rând nou la sfârșit   ';
    const b = pkg('nonl', { name: 'nonl', version: '1.0.0', license: 'MIT' }, { LICENSE: t2 });
    assert.ok(renderThirdPartyLicenses(collectThirdPartyLicenses([b], { extraDir: extra }), { title: 'T' }).includes(`${t2}\n`));
  });
  it('fără fișier de licență: numai licenses/extra pentru exact acel nume și acea versiune', () => {
    const a = pkg('al', { name: 'al', version: '2.0.1', license: 'MIT' });
    fails(() => collectThirdPartyLicenses([a], { extraDir: extra }), /al@2\.0\.1: pachetul nu conține un fișier de licență/);
    writeFileSync(join(extra, 'al@2.0.0.txt'), '# SURSA: x\n-----\nText vechi\n');
    fails(() => collectThirdPartyLicenses([a], { extraDir: extra }), /licenses\/extra\/al@2\.0\.1\.txt/);
    writeFileSync(join(extra, 'al@2.0.1.txt'), 'fără antet\nText\n');
    fails(() => collectThirdPartyLicenses([a], { extraDir: extra }), /linia de separare/);
    writeFileSync(join(extra, 'al@2.0.1.txt'), '# ALTCEVA\n-----\nText\n');
    fails(() => collectThirdPartyLicenses([a], { extraDir: extra }), /# SURSA:/);
    writeFileSync(join(extra, 'al@2.0.1.txt'), '# SURSA: pagina autorului\n-----\nCopyright © James\nPermission is hereby granted\n');
    const [e] = collectThirdPartyLicenses([a], { extraDir: extra });
    assert.equal(e!.texts[0]!.text, 'Copyright © James\nPermission is hereby granted\n');
    assert.match(e!.texts[0]!.header!, /# SURSA: pagina autorului/);
  });
  it('ieșirea este deterministă (ordinea intrărilor nu depinde de ordinea fișierelor)', () => {
    const a = pkg('zz', { name: 'zz', version: '1.0.0', license: 'ISC' }, { LICENSE: 'z' });
    const b = pkg('@s/aa', { name: '@s/aa', version: '1.0.0', license: 'MIT' }, { LICENSE: 'a' });
    const r1 = renderThirdPartyLicenses(collectThirdPartyLicenses([a, b], { extraDir: extra }), { title: 'T' });
    const r2 = renderThirdPartyLicenses(collectThirdPartyLicenses([b, a], { extraDir: extra }), { title: 'T' });
    assert.equal(r1, r2);
    assert.match(r1, /Pachete terțe incluse: 2/);
  });
});

describe('notele de licență: textele din depozit (licenses/extra)', () => {
  it('fiecare fișier are antet cu sursa și text integral; drizzle-orm identic cu sursa (SHA-256)', async () => {
    const { readFileSync, readdirSync } = await import('node:fs');
    const { createHash } = await import('node:crypto');
    const dir = join(import.meta.dirname, '..', '..', '..', 'licenses', 'extra');
    const files = readdirSync(dir).sort();
    assert.deepEqual(files, ['abstract-logging@2.0.1.txt', 'drizzle-orm@0.45.3.txt']);
    for (const f of files) {
      const raw = readFileSync(join(dir, f), 'utf8');
      assert.match(raw, /^# SURSA:/m, f);
      assert.ok(raw.includes('\n-----\n'), f);
    }
    const dz = readFileSync(join(dir, 'drizzle-orm@0.45.3.txt'), 'utf8');
    const text = dz.slice(dz.indexOf('\n-----\n') + 7);
    assert.equal(createHash('sha256').update(text).digest('hex'), 'c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4');
    const al = readFileSync(join(dir, 'abstract-logging@2.0.1.txt'), 'utf8');
    const alText = al.slice(al.indexOf('\n-----\n') + 7);
    // transcrierea din captura proprietarului (06.11.2026, 21:30): amprenta consemnată în antet
    const alHash = createHash('sha256').update(alText).digest('hex');
    assert.equal(alHash, 'd087f22d7a15db3a6355c8644f7eabe0bd582a1af28d6bf885540ee5bee62177');
    assert.ok(al.includes(alHash), 'amprenta din antet');
    assert.match(alText, /^THE MIT LICENSE \(MIT\)\n/);
    assert.match(alText, /Copyright © 2026 James Sumners/);
    assert.match(alText, /THE SOFTWARE IS PROVIDED “AS IS”/);
  });
});
