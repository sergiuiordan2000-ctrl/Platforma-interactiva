// R8 (Etapa 7A; decizia proprietarului din 15.10.2026): `purge:retention` șterge fotografiile orfane din
// `STORAGE_DIR/photos`, numai dacă: numele are exact forma generată de aplicație; este un fișier obișnuit (nu legătură
// simbolică, nu director; fără parcurgere recursivă); cheia lipsește din `report_photos`; e mai vechi de o oră.
// Cazul invers (rând fără fișier) se numără în `missingPhotoFiles`, fără nicio acțiune.

import assert from 'node:assert/strict';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../../src/context.ts';
import type { DbHandle } from '../../src/db/client.ts';
import { migrate } from '../../src/db/migrations.ts';
import { initBackupMarkers } from '../../src/db/reportCounter.ts';
import { deleteReportsHard } from '../../src/db/reportDeletion.ts';
import { seedConfig } from '../../src/db/seeds.ts';
import { purgeOrphanPhotos, purgeRetention } from '../../src/maintenance.ts';
import { MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { loadUatBoundary } from '../../src/uat.ts';
import { Client, Clock, makeApp } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb } from '../helpers/db.ts';
import { V1, reportFlow, type Flow } from '../helpers/reportFlow.ts';

const JPEG = readFileSync(join(import.meta.dirname, '..', 'fixtures', 'exif.jpg'));
const HOUR = 3_600_000;
let h: DbHandle;
let root: string;
let storage: string;
let photos: string;
let outside: string;
let app: FastifyInstance;
let ctx: AppContext;
let flow: Flow;
const clock = new Clock();
let n = 0;
/** Un nume cu exact forma generată de aplicație (32 de caractere hex + extensia), unic în test. */
const genName = (ext = 'jpg') => `${(++n).toString(16).padStart(32, 'a')}.${ext}`;
/** Scrie un fișier și îi pune data modificării la `ageMs` în urma ceasului aplicației. */
function put(path: string, ageMs: number, body = 'x') {
  writeFileSync(path, body);
  const t = new Date(clock.now().getTime() - ageMs);
  utimesSync(path, t, t);
}

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  root = mkdtempSync(join(tmpdir(), 'civic-r8-'));
  storage = join(root, 'storage');
  photos = join(storage, 'photos');
  outside = join(root, 'in-afara');
  const backupDir = join(root, 'backups');
  mkdirSync(photos, { recursive: true });
  mkdirSync(outside, { recursive: true });
  await initBackupMarkers(h.pool, backupDir);
  ({ app, ctx } = await makeApp(h, clock, { IP_RATE_LIMITS: 'off', STORAGE_DIR: storage, BACKUP_DIR: backupDir }, { uat: loadUatBoundary() }));
  flow = reportFlow(() => app, () => h.pool, clock);
});

after(async () => {
  await app?.close();
  await h?.close();
  if (root) rmSync(root, { recursive: true, force: true });
});

describe('R8: fotografiile orfane', () => {
  it('orfanul vechi se șterge; fotografia sesizării rămâne și se servește public; orfanul nou rămâne', async () => {
    const c = await flow.citizen('r8.foto@exemplu.test');
    const ok = await flow.submitOk(c, [JPEG]);
    const key = ok.photoKeys[0]!;
    const validPath = join(storage, key);
    utimesSync(validPath, new Date(clock.now().getTime() - 10 * HOUR), new Date(clock.now().getTime() - 10 * HOUR)); // veche, dar validă
    const old = genName();
    const recent = genName('webp');
    put(join(photos, old), 2 * HOUR);
    put(join(photos, recent), 10 * 60_000);

    const res = await purgeRetention(ctx);
    assert.equal(res.orphanPhotos, 1);
    assert.equal(existsSync(join(photos, old)), false, 'orfanul de peste o oră este șters');
    assert.equal(existsSync(join(photos, recent)), true, 'orfanul mai nou de o oră rămâne');
    assert.equal(existsSync(validPath), true, 'fotografia sesizării rămâne');
    const [ph] = await flow.q<{ id: string }>('SELECT id FROM report_photos WHERE storage_key = ?', [key]);
    const pub = await new Client(app).get(`${V1}/public/photos/${ph!.id}`);
    assert.equal(pub.statusCode, 200, 'fotografia se servește public după curățare');
    assert.ok(pub.rawPayload.length > 0);
  });

  it('nume străine, subdirectoare și legături simbolice nu se ating; ținta unei legături cu nume „generat” rămâne intactă', async () => {
    put(join(photos, 'nota.txt'), 5 * HOUR, 'nota');
    put(join(photos, 'ABCDEF0123456789ABCDEF0123456789.jpg'), 5 * HOUR); // majuscule: nu este forma generată
    const sub = join(photos, 'subdirector');
    mkdirSync(sub);
    const inSub = join(sub, genName());
    put(inSub, 5 * HOUR);
    const dirNamedLikePhoto = join(photos, genName());
    mkdirSync(dirNamedLikePhoto); // director cu nume de fotografie
    const target = join(outside, 'secret.jpg');
    put(target, 5 * HOUR, 'NU SE ȘTERGE');
    const link = join(photos, genName());
    symlinkSync(target, link); // legătură simbolică cu nume „generat”, spre un fișier vechi din afara `photos/`
    const linkToDir = join(photos, genName());
    symlinkSync(outside, linkToDir);

    const res = await purgeRetention(ctx);
    assert.equal(res.orphanPhotos, 0);
    for (const p of [join(photos, 'nota.txt'), join(photos, 'ABCDEF0123456789ABCDEF0123456789.jpg'), inSub, dirNamedLikePhoto, link, linkToDir]) {
      assert.doesNotThrow(() => lstatSync(p), `neatins: ${p}`); // `lstat`: există (și ca legătură), fără a o urma
    }
    assert.equal(isLink(link), true, 'legătura simbolică rămâne');
    assert.equal(readFileSync(target, 'utf8'), 'NU SE ȘTERGE', 'ținta legăturii rămâne intactă');
  });

  it('fișierul rămas după ștergerea unei sesizări (ștergerea de pe disc „a eșuat”) se curăță la rularea următoare', async () => {
    const c = await flow.citizen('r8.stearsa@exemplu.test');
    const ok = await flow.submitOk(c, [JPEG]);
    const path = join(storage, ok.photoKeys[0]!);
    const content = readFileSync(path);
    await deleteReportsHard(h.pool, [ok.id], storage);
    assert.equal(existsSync(path), false);
    put(path, 2 * HOUR, content.toString('latin1')); // simulăm fișierul rămas (căderea după COMMIT)
    const res = await purgeRetention(ctx);
    assert.equal(res.orphanPhotos, 1);
    assert.equal(existsSync(path), false);
  });

  it('rândul fără fișier pe disc se numără, fără nicio acțiune', async () => {
    const c = await flow.citizen('r8.lipsa@exemplu.test');
    const ok = await flow.submitOk(c, [JPEG]);
    unlinkSync(join(storage, ok.photoKeys[0]!));
    const res = await purgeRetention(ctx);
    assert.equal(res.missingPhotoFiles, 1);
    assert.equal(res.orphanPhotos, 0);
    const [row] = await flow.q<{ n: number }>('SELECT COUNT(*) AS n FROM report_photos WHERE storage_key = ?', [ok.photoKeys[0]!]);
    assert.equal(Number(row!.n), 1, 'rândul rămâne');
    const [rep] = await flow.q<{ n: number }>('SELECT COUNT(*) AS n FROM reports WHERE id = ?', [ok.id]);
    assert.equal(Number(rep!.n), 1, 'sesizarea rămâne');
  });

  it('un fișier care dispare între enumerare și ștergere nu oprește curățarea', async () => {
    const vanishing = join(photos, genName());
    const other = join(photos, genName());
    put(vanishing, 3 * HOUR);
    put(other, 3 * HOUR);
    let calls = 0;
    const res = await purgeOrphanPhotos(ctx, {
      onBeforeRemove: async (p) => {
        calls += 1;
        if (p === vanishing) unlinkSync(p); // „altcineva” l-a șters între timp
      },
    });
    assert.equal(calls, 2);
    assert.equal(res.orphanPhotos, 1, 'numai cel șters efectiv se numără');
    assert.equal(existsSync(other), false, 'celălalt orfan este șters în aceeași rulare');
  });

  it('directorul `photos/` lipsă → fără eroare', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'civic-r8-gol-'));
    try {
      const res = await purgeOrphanPhotos({ ...ctx, config: { ...ctx.config, storageDir: empty } });
      assert.equal(res.orphanPhotos, 0);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});

function isLink(p: string): boolean {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}
