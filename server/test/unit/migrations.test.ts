import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { compare, readMigrationFiles, splitStatements } from '../../src/db/migrations.ts';
import { MIGRATIONS_DIR } from '../../src/paths.ts';

describe('migrații (DN-20): fișiere și comparare', () => {
  it('migrația 0001 există și are 30 de CREATE TABLE', () => {
    const files = readMigrationFiles(MIGRATIONS_DIR);
    assert.equal(files[0]?.version, 1);
    assert.equal(files[0]?.name, 'initial_schema');
    assert.equal(files[0]?.statements.filter((s) => s.startsWith('CREATE TABLE')).length, 30);
  });

  it('comentariile nu devin instrucțiuni', () => {
    assert.deepEqual(splitStatements('-- titlu\nSELECT 1;\n--> statement-breakpoint\n-- nota\nSELECT 2;'), ['SELECT 1', 'SELECT 2']);
  });

  it('sfârșitul de linie Windows (CRLF) nu schimbă suma de control', () => {
    const dir1 = mkdtempSync(join(tmpdir(), 'mig-'));
    const dir2 = mkdtempSync(join(tmpdir(), 'mig-'));
    const sql = readFileSync(join(MIGRATIONS_DIR, '0001_initial_schema.sql'), 'utf8');
    writeFileSync(join(dir1, '0001_initial_schema.sql'), sql);
    writeFileSync(join(dir2, '0001_initial_schema.sql'), sql.replace(/\n/g, '\r\n'));
    assert.equal(readMigrationFiles(dir1)[0]?.checksum, readMigrationFiles(dir2)[0]?.checksum);
  });

  it('numerotarea trebuie să fie consecutivă', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mig-'));
    writeFileSync(join(dir, '0001_a.sql'), 'SELECT 1;');
    writeFileSync(join(dir, '0003_c.sql'), 'SELECT 1;');
    assert.throws(() => readMigrationFiles(dir), /0002/);
  });

  it('comparare: DB gol → migrații în așteptare; aplicate → ok', () => {
    const files = readMigrationFiles(MIGRATIONS_DIR);
    const empty = compare(files, []);
    assert.equal(empty.ok, false);
    assert.deepEqual(empty.pending, [1]);
    const done = compare(files, [{ version: 1, name: 'initial_schema', checksum: files[0]!.checksum }]);
    assert.equal(done.ok, true);
    assert.equal(done.currentVersion, 1);
  });

  it('comparare: migrație modificată sau versiune necunoscută → refuz', () => {
    const files = readMigrationFiles(MIGRATIONS_DIR);
    assert.equal(compare(files, [{ version: 1, name: 'initial_schema', checksum: 'x'.repeat(64) }]).ok, false);
    const extra = compare(files, [
      { version: 1, name: 'initial_schema', checksum: files[0]!.checksum },
      { version: 2, name: 'viitor', checksum: 'y'.repeat(64) },
    ]);
    assert.equal(extra.ok, false);
    assert.match(extra.problems.join(' '), /necunoscută/);
  });
});
