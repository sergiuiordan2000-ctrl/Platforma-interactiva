// Marcajele de lângă backup-uri (Faza 6, R1–R2), fără bază de date: scrieri complete, nume neambigue,
// nicio intrare pierdută când mai multe procese scriu în același timp.

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import {
  MarkerError,
  deletionListIds,
  deletionMarkerExpiry,
  initMarkerDirs,
  pruneDeletionList,
  readDeletionMarkers,
  readReportCounterWatermark,
  recordReportCounter,
  recordReportDeletions,
} from '../../src/db/markers.ts';

const DAY = 86_400_000;
const root = mkdtempSync(join(tmpdir(), 'civic-markers-'));
const NOW = new Date('2026-10-11T12:00:00.000Z');
const id = (n: number) => `01MARK${String(n).padStart(20, '0')}`;
let seq = 0;
const freshDir = () => {
  const dir = join(root, `b${++seq}`);
  initMarkerDirs(dir);
  return dir;
};

after(() => rmSync(root, { recursive: true, force: true }));

describe('marcajul contorului TM', () => {
  it('lipsă → null; se scrie complet; nu coboară niciodată', () => {
    const dir = freshDir();
    assert.equal(readReportCounterWatermark(dir), null);
    recordReportCounter(dir, 0);
    assert.equal(readReportCounterWatermark(dir), 0);
    recordReportCounter(dir, 7);
    recordReportCounter(dir, 5);
    assert.equal(readReportCounterWatermark(dir), 7);
    assert.equal(readFileSync(join(dir, 'report-counter-watermark.json'), 'utf8'), '{"lastValue":7}\n');
    assert.deepEqual(readdirSync(dir).sort(), ['deletions', 'report-counter-watermark.json'], 'niciun fișier temporar rămas');
  });

  it('valori invalide și fișier corupt → MarkerError (niciodată „0” pe tăcute)', () => {
    const dir = freshDir();
    for (const bad of [-1, 1.5, Number.NaN]) assert.throws(() => recordReportCounter(dir, bad), MarkerError);
    for (const content of ['', 'nu este JSON', '{"lastValue":"7"}', '{"lastValue":-3}', '{"altceva":1}']) {
      writeFileSync(join(dir, 'report-counter-watermark.json'), content);
      assert.throws(() => readReportCounterWatermark(dir), MarkerError, content);
      assert.throws(() => recordReportCounter(dir, 99), MarkerError, content);
    }
  });

  it('directorul nu există → eroare la scriere; nu este creat din mers', () => {
    const missing = join(root, 'nu-exista');
    assert.throws(() => recordReportCounter(missing, 1), (err: unknown) => {
      assert.ok(err instanceof MarkerError);
      assert.ok(!err.message.includes(root), 'mesajul nu conține calea');
      return true;
    });
    assert.equal(existsSync(missing), false);
  });
});

describe('marcajele de ștergere', () => {
  it('un fișier pentru fiecare sesizare, numit după ID-ul intern; conținut: ID și două date', () => {
    const dir = freshDir();
    const createdAt = new Date(NOW.getTime() - 3 * DAY);
    recordReportDeletions(dir, [{ id: id(1), createdAt }, { id: id(2), createdAt }], NOW);
    assert.deepEqual(readdirSync(join(dir, 'deletions')).sort(), [`${id(1)}.json`, `${id(2)}.json`]);
    assert.deepEqual(JSON.parse(readFileSync(join(dir, 'deletions', `${id(1)}.json`), 'utf8')), {
      reportId: id(1),
      reportCreatedAt: createdAt.toISOString(),
      deletedAt: NOW.toISOString(),
    });
    assert.deepEqual(deletionListIds(dir).sort(), [id(1), id(2)]);
  });

  it('ID invalid (ar putea ieși din director sau ar fi ambiguu) → refuz, nimic scris', () => {
    const dir = freshDir();
    for (const bad of ['../../etc/passwd', 'abc', `${id(1)}.json`, id(1).toLowerCase(), '']) {
      assert.throws(() => recordReportDeletions(dir, [{ id: bad, createdAt: NOW }], NOW), MarkerError, bad);
    }
    assert.deepEqual(readdirSync(join(dir, 'deletions')), []);
    assert.deepEqual(readdirSync(root).filter((n) => n.includes('passwd')), []);
  });

  it('directorul `deletions/` lipsește → eroare la scriere; nu este creat din mers', () => {
    const dir = freshDir();
    rmSync(join(dir, 'deletions'), { recursive: true });
    assert.throws(() => recordReportDeletions(dir, [{ id: id(3), createdAt: NOW }], NOW), MarkerError);
    assert.equal(existsSync(join(dir, 'deletions')), false);
    assert.equal(readDeletionMarkers(dir).dirExists, false);
  });

  it('lista veche (deletion-list.jsonl) se mai citește, dar nu se mai scrie și nu este curățată', () => {
    const dir = freshDir();
    writeFileSync(join(dir, 'deletion-list.jsonl'), `${JSON.stringify({ reportId: id(4), deletedAt: '2026-01-01T00:00:00.000Z' })}\n`);
    recordReportDeletions(dir, [{ id: id(5), createdAt: NOW }], NOW);
    assert.deepEqual(deletionListIds(dir).sort(), [id(4), id(5)]);
    pruneDeletionList(dir, new Date(NOW.getTime() + 400 * DAY));
    assert.deepEqual(deletionListIds(dir), [id(4)]);
    writeFileSync(join(dir, 'deletion-list.jsonl'), 'gunoi\n');
    assert.throws(() => deletionListIds(dir), MarkerError);
  });

  it('curățarea: pragul este „data depunerii + 45 de zile + 1 zi”, indiferent de data ștergerii', () => {
    const dir = freshDir();
    const created = new Date('2026-09-01T00:00:00.000Z');
    recordReportDeletions(dir, [{ id: id(6), createdAt: created }], new Date('2026-09-01T00:05:00.000Z'));
    const expiry = deletionMarkerExpiry(readDeletionMarkers(dir).entries[0]!);
    assert.equal(expiry.toISOString(), '2026-10-17T00:00:00.000Z');
    assert.equal(pruneDeletionList(dir, new Date(expiry.getTime() - 1)), 0, 'cu o milisecundă înainte: rămâne');
    assert.deepEqual(deletionListIds(dir), [id(6)]);
    assert.equal(pruneDeletionList(dir, expiry), 1);
    assert.deepEqual(deletionListIds(dir), []);
  });
});

describe('scrieri simultane din mai multe procese', () => {
  it('6 procese × 40 de intrări distincte + aceeași intrare scrisă de toate → nicio intrare pierdută, toate complete', async () => {
    const dir = freshDir();
    const PROCS = 6;
    const EACH = 40;
    const script = `
      const { recordReportDeletions, pruneDeletionList } = await import(${JSON.stringify(join(import.meta.dirname, '..', '..', 'src', 'db', 'markers.ts'))});
      const [dir, p] = [process.argv[1], Number(process.argv[2])];
      const id = (n) => '01MARK' + String(n).padStart(20, '0');
      const now = new Date(${JSON.stringify(NOW.toISOString())});
      for (let i = 0; i < ${EACH}; i++) {
        recordReportDeletions(dir, [{ id: id(1000 * (p + 1) + i), createdAt: now }, { id: id(999999), createdAt: now }], now);
        if (i % 10 === 0) pruneDeletionList(dir, now); // curățarea rulează în paralel cu scrierile
      }
    `;
    const children = Array.from({ length: PROCS }, (_, p) =>
      spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script, dir, String(p)], { stdio: ['ignore', 'ignore', 'pipe'] }),
    );
    const errors: string[] = [];
    await Promise.all(
      children.map(async (c) => {
        let err = '';
        c.stderr.on('data', (d) => (err += d));
        const [code] = await once(c, 'exit');
        if (code !== 0) errors.push(err);
      }),
    );
    assert.deepEqual(errors, []);
    const markers = readDeletionMarkers(dir);
    assert.deepEqual(markers.invalid, [], 'nicio intrare trunchiată sau amestecată');
    const ids = new Set(markers.entries.map((e) => e.reportId));
    assert.equal(ids.size, PROCS * EACH + 1);
    for (let p = 0; p < PROCS; p++) for (let i = 0; i < EACH; i++) assert.ok(ids.has(id(1000 * (p + 1) + i)));
    assert.ok(ids.has(id(999999)));
    assert.deepEqual(readdirSync(join(dir, 'deletions')).filter((n) => n.startsWith('.')), [], 'niciun fișier temporar rămas');
  });
});
