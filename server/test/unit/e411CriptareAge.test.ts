// E4.11 (planul r3.2 §7.1, registrul §24): formatul age și biblioteca `age-encryption`.
// - versiunea fixată exact (P1);
// - vectorii publici C2SP CCTV/age, toți cei 147, din depozitul oficial la commitul fixat (CIVIC_CCTV_DIR);
// - fișierele-martor din `test/fixtures/age-martori/` (criptate o singură dată cu binarul oficial `age`);
// - interoperabilitatea, în ambele sensuri, cu binarul oficial `age` și cu implementarea independentă `rage`.
//   Binarele sunt OBLIGATORII: lipsa lor face testul să pice (nu este o omitere tăcută). În CI le instalează
//   jobul; local: `age` din pachetul sistemului, `rage` din versiunea oficială (CIVIC_RAGE_BIN sau PATH).

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { gunzipSync } from 'node:zlib';
import { before, describe, it } from 'node:test';
import { Decrypter, Encrypter, armor, generateX25519Identity, identityToRecipient } from 'age-encryption';
import {
  AGE_RECIPIENT_RE,
  encryptDbLines,
  encryptStreamToFile,
  readIdentityFile,
  recipientProblem,
} from '../../src/db/backupCrypto.ts';
import { APP_ROOT } from '../../src/paths.ts';
import { TEST_AGE_RECIPIENT, TEST_IDENTITY_PASSPHRASE } from '../helpers/env.ts';

const require = createRequire(import.meta.url);
const SERVER = join(APP_ROOT, 'server');
const FIX = join(SERVER, 'test', 'fixtures', 'age-martori');
const sha = (b: Uint8Array | string) => createHash('sha256').update(b).digest('hex');

function bin(name: 'age' | 'rage'): string {
  const fromEnv = name === 'rage' ? process.env.CIVIC_RAGE_BIN : process.env.CIVIC_AGE_BIN;
  const candidate = fromEnv ?? name;
  const probe = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
  assert.equal(
    probe.status,
    0,
    `Binarul „${name}” lipsește (${fromEnv ? 'variabila' : 'PATH'}): testele de interoperabilitate E4.11 sunt obligatorii și nu se omit.`,
  );
  return candidate;
}

function run(cmd: string, args: string[], input?: Buffer): Buffer {
  const r = spawnSync(cmd, args, { input, maxBuffer: 64 << 20 });
  assert.equal(r.status, 0, `${cmd} ${args.join(' ')}: ${r.stderr?.toString()}`);
  return r.stdout;
}

describe('E4.11 §7.1: versiunea fixată', () => {
  it('age-encryption: versiune exactă în package.json (fără ^ sau ~) și instalată identic', () => {
    const pkg = JSON.parse(readFileSync(join(SERVER, 'package.json'), 'utf8')) as { dependencies: Record<string, string> };
    assert.equal(pkg.dependencies['age-encryption'], '0.3.1');
    // pachetul declară „exports” fără ./package.json: se urcă de la intrarea lui până la package.json-ul cu numele lui
    let d = dirname(require.resolve('age-encryption', { paths: [SERVER] }));
    for (;;) {
      const f = join(d, 'package.json');
      if (existsSync(f)) {
        const p = JSON.parse(readFileSync(f, 'utf8')) as { name?: string; version: string };
        if (p.name === 'age-encryption') {
          assert.equal(p.version, '0.3.1');
          return;
        }
      }
      const up = dirname(d);
      assert.notEqual(up, d, 'package.json pentru age-encryption negăsit');
      d = up;
    }
  });
});

// Vectorii C2SP CCTV/age, din depozitul oficial, la commitul fixat 50a8ecf2a220f4c8bdc4f085789b8e85c26829e7
// (25.09.2026; 147 de vectori). Jobul CI îi aduce cu git (conținut adresat prin commit, deci verificat) și îi
// indică prin CIVIC_CCTV_DIR; local, la fel. Lipsa lor face testul să pice (nu se omite). Nu se copiază în
// repository: fișierele conțin identitățile de test publice ale CCTV în clar.
const CCTV_COUNT = 147;
const CCTV_LATER_VECTORS = ['armor_cr_between_padding', 'armor_cr_in_body', 'armor_cr_line_start', 'armor_double_crlf'];

describe('E4.11 §7.1: vectorii publici C2SP CCTV/age (toți cei 147, la commitul fixat)', () => {
  it('toți vectorii de decriptare: succes numai unde se așteaptă, cu conținutul exact; eșec în rest', async () => {
    const dir = process.env.CIVIC_CCTV_DIR;
    assert.ok(dir && existsSync(dir), 'CIVIC_CCTV_DIR lipsește: vectorii CCTV sunt obligatorii (îi aduce jobul CI la commitul fixat)');
    const names = readdirSync(dir).filter((n) => statSync(join(dir, n)).isFile()).sort();
    assert.equal(names.length, CCTV_COUNT, `numărul vectorilor: ${names.length}, așteptat ${CCTV_COUNT}`);
    for (const v of CCTV_LATER_VECTORS) assert.ok(names.includes(v), `vectorul ${v} lipsește`);
    const { inflateSync } = await import('node:zlib');
    for (const name of names) {
      const raw = readFileSync(join(dir, name));
      const sep = raw.indexOf('\n\n');
      const head = raw.subarray(0, sep).toString();
      let body: Buffer = raw.subarray(sep + 2);
      const h: Record<string, string> = {};
      const d = new Decrypter();
      for (const l of head.split('\n')) {
        const i = l.indexOf(': ');
        const k = l.slice(0, i);
        const v = l.slice(i + 2);
        if (k === 'identity') d.addIdentity(v);
        else if (k === 'passphrase') d.addPassphrase(v);
        else h[k] = v;
      }
      if (h.compressed === 'zlib') body = inflateSync(body);
      let ok = false;
      let got = '';
      try {
        const input = h.armored === 'yes' ? armor.decode(body.toString()) : body;
        got = sha(await d.decrypt(input));
        ok = true;
      } catch {
        ok = false;
      }
      if (h.expect === 'success') {
        assert.ok(ok, `${name}: trebuia decriptat`);
        assert.equal(got, h.payload, `${name}: conținut diferit`);
      } else {
        assert.ok(!ok, `${name}: trebuia refuzat (${h.expect})`);
      }
    }
  });
});

describe('E4.11 §7.1: fișierele-martor (binarul oficial age, o singură dată)', () => {
  const m = JSON.parse(readFileSync(join(FIX, 'martori.json'), 'utf8')) as {
    destinatar: string;
    fisiere: Array<{ plain: string; encrypted: string; plainSha256: string; encryptedSha256: string }>;
  };
  // identitatea de test este păstrată criptată cu fraza-parolă de test (ca identitatea reală, planul §4.2);
  // pentru binarele age și rage se scrie temporar în clar, numai în directorul temporar al testului
  let identity: string;
  let identityPlainFile: string;
  before(async () => {
    identity = await readIdentityFile(join(FIX, 'identitate-test.age'), TEST_IDENTITY_PASSPHRASE);
    identityPlainFile = join(mkdtempSync(join(tmpdir(), 'civic-e411-id-test-')), 'id.txt');
    writeFileSync(identityPlainFile, identity + '\n', { mode: 0o600 });
  });

  it('fișierele-martor sunt neschimbate și se decriptează exact de bibliotecă', async () => {
    assert.equal(await identityToRecipient(identity), m.destinatar);
    assert.equal(await identityToRecipient(identity), TEST_AGE_RECIPIENT, 'aceeași cheie publică ca în helpers/env.ts');
    for (const f of m.fisiere) {
      const enc = readFileSync(join(FIX, f.encrypted));
      assert.equal(sha(enc), f.encryptedSha256, `${f.encrypted} a fost modificat`);
      assert.equal(sha(readFileSync(join(FIX, f.plain))), f.plainSha256);
      const d = new Decrypter();
      d.addIdentity(identity);
      assert.equal(sha(await d.decrypt(enc)), f.plainSha256, f.encrypted);
    }
  });

  it('fișierele produse de aplicație pentru același destinatar se decriptează cu age și cu rage', async () => {
    const age = bin('age');
    const rage = bin('rage');
    const dir = mkdtempSync(join(tmpdir(), 'civic-e411-martor-'));
    for (const f of m.fisiere) {
      const dst = join(dir, f.encrypted);
      await encryptStreamToFile(Readable.from([readFileSync(join(FIX, f.plain))]), dst, m.destinatar);
      for (const tool of [age, rage]) {
        const out = run(tool, ['-d', '-i', identityPlainFile, dst]);
        assert.equal(sha(out), f.plainSha256, `${tool}: ${f.plain}`);
      }
    }
  });
});

describe('E4.11 §7.1: interoperabilitate cu age și rage (date aleatoare, la marginile segmentelor de 64 KiB)', () => {
  const SIZES = [0, 1, 65_535, 65_536, 65_537, 200_000];

  it('aplicație → age, rage; age, rage → aplicație', async () => {
    const age = bin('age');
    const rage = bin('rage');
    const dir = mkdtempSync(join(tmpdir(), 'civic-e411-interop-'));
    const identity = await generateX25519Identity();
    const recipient = await identityToRecipient(identity);
    const idFile = join(dir, 'id.txt');
    writeFileSync(idFile, identity + '\n', { mode: 0o600 });
    for (const size of SIZES) {
      const plain = randomBytes(size);
      const pf = join(dir, `p${size}`);
      writeFileSync(pf, plain);
      // aplicația criptează (în flux) → binarele oficiale decriptează
      const appEnc = join(dir, `app${size}.age`);
      await encryptStreamToFile(Readable.from([plain]), appEnc, recipient);
      for (const tool of [age, rage]) assert.equal(sha(run(tool, ['-d', '-i', idFile, appEnc])), sha(plain), `${tool} ← aplicație (${size})`);
      // binarele oficiale criptează → aplicația decriptează
      for (const [label, tool] of [['age', age], ['rage', rage]] as const) {
        const ef = join(dir, `${label}${size}.age`);
        run(tool, ['-r', recipient, '-o', ef, pf]);
        const d = new Decrypter();
        d.addIdentity(identity);
        assert.equal(sha(await d.decrypt(readFileSync(ef))), sha(plain), `aplicație ← ${label} (${size})`);
      }
    }
  });
});

describe('E4.11: cheia publică (BACKUP_AGE_RECIPIENT) și identitatea', () => {
  it('numai destinatari X25519 valizi; alte tipuri și sumele de control greșite sunt respinse', async () => {
    const r = await identityToRecipient(await generateX25519Identity());
    assert.match(r, AGE_RECIPIENT_RE);
    assert.equal(recipientProblem(r), null);
    const flipped = r.slice(0, -1) + (r.endsWith('q') ? 'p' : 'q');
    assert.match(recipientProblem(flipped) ?? '', /suma de control/);
    assert.ok(recipientProblem('age1pq1' + 'q'.repeat(100)));
    assert.ok(recipientProblem('AGE-SECRET-KEY-1' + 'Q'.repeat(58)));
    assert.ok(recipientProblem(''));
    assert.ok(recipientProblem(r.toUpperCase()));
  });

  it('identitatea: criptată cu fraza-parolă → citită; necriptată, frază greșită, două identități → refuz', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'civic-e411-id-'));
    const identity = await generateX25519Identity();
    const enc = async (text: string, pass: string) => {
      const e = new Encrypter();
      e.setPassphrase(pass);
      e.setScryptWorkFactor(12); // numai în test, pentru viteză; age-keygen | age -p folosește 18
      return e.encrypt(text);
    };
    const f = join(dir, 'identitate.age');
    writeFileSync(f, await enc(`# created: test\n# public key: x\n${identity}\n`, 'fraza de test corectă'));
    assert.equal(await readIdentityFile(f, 'fraza de test corectă'), identity);
    await assert.rejects(readIdentityFile(f, 'altă frază'), /Fraza-parolă este greșită/);
    const plain = join(dir, 'plain.txt');
    writeFileSync(plain, `# created: test\n${identity}\n`);
    await assert.rejects(readIdentityFile(plain, 'x'), /necriptat/);
    const two = join(dir, 'doua.age');
    writeFileSync(two, await enc(`${identity}\n${await generateX25519Identity()}\n`, 'p'));
    await assert.rejects(readIdentityFile(two, 'p'), /exact o identitate/);
    const armored = join(dir, 'armura.age');
    writeFileSync(armored, armor.encode(await enc(`${identity}\n`, 'p2')));
    assert.equal(await readIdentityFile(armored, 'p2'), identity);
  });
});

describe('E4.11: fluxul bazei de date (gzip → criptare, fără buffer integral)', () => {
  it('rezultatul se decriptează cu age; SHA-256 al bazei comprimate în clar, calculat pe drum, este exact', async () => {
    const age = bin('age');
    const dir = mkdtempSync(join(tmpdir(), 'civic-e411-db-'));
    const identity = await generateX25519Identity();
    const recipient = await identityToRecipient(identity);
    const idFile = join(dir, 'id.txt');
    writeFileSync(idFile, identity + '\n', { mode: 0o600 });
    const lines = Array.from({ length: 30_000 }, (_, i) => JSON.stringify({ t: 'x', v: [i, randomBytes(12).toString('hex')] }));
    const dst = join(dir, 'db.jsonl.gz.age');
    const r = await encryptDbLines(lines, dst, recipient);
    const gz = run(age, ['-d', '-i', idFile, dst]);
    assert.equal(sha(gz), r.plainSha256, 'amprenta bazei comprimate în clar');
    assert.equal(sha(readFileSync(dst)), r.cipherSha256, 'amprenta fișierului criptat');
    assert.equal(gunzipSync(gz).toString(), lines.map((l) => l + '\n').join(''));
  });

  it('erori: o sursă care eșuează la mijloc → eroare; destinatar invalid → eroare fără fișier; destinație existentă → refuz', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'civic-e411-err-'));
    const recipient = await identityToRecipient(await generateX25519Identity());
    const failing = new Readable({
      read() {
        this.push(randomBytes(100_000));
        this.destroy(new Error('citire eșuată (simulată)'));
      },
    });
    await assert.rejects(encryptStreamToFile(failing, join(dir, 'a.age'), recipient));
    function* broken(): Generator<string> {
      yield 'prima linie';
      throw new Error('rânduri eșuate (simulat)');
    }
    await assert.rejects(encryptDbLines(broken(), join(dir, 'b.age'), recipient), /simulat/);
    await assert.rejects(encryptStreamToFile(Readable.from([Buffer.from('x')]), join(dir, 'c.age'), 'age1invalid'));
    assert.equal(existsSync(join(dir, 'c.age')), false, 'un destinatar invalid nu lasă niciun fișier');
    writeFileSync(join(dir, 'd.age'), 'existent');
    await assert.rejects(encryptStreamToFile(Readable.from([Buffer.from('x')]), join(dir, 'd.age'), recipient), /EEXIST/);
    assert.equal(readFileSync(join(dir, 'd.age'), 'utf8'), 'existent', 'nimic suprascris');
  });
});
