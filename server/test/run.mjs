// Rulează testele backend cu node:test (DN-23) + tsx (TypeScript pe Node 20 și 24).
//   node test/run.mjs unit | api | integration | all
// Testele de integrare cer MySQL: variabila CIVIC_TEST_DATABASE_URL (un DB al cărui nume conține „test”).

import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const levels = { unit: ['unit'], api: ['api'], integration: ['integration'], all: ['unit', 'api', 'integration'] };
const level = process.argv[2] ?? 'all';
if (!(level in levels)) {
  console.error(`Nivel necunoscut: ${level}. Folosiți: ${Object.keys(levels).join(', ')}`);
  process.exit(2);
}
if (levels[level].includes('integration') && !process.env.CIVIC_TEST_DATABASE_URL) {
  console.error('Testele de integrare cer CIVIC_TEST_DATABASE_URL (mysql://…/<db>_test).');
  process.exit(2);
}

const files = [];
for (const dir of levels[level]) {
  const abs = join(here, dir);
  for (const f of readdirSync(abs).sort()) {
    if (f.endsWith('.test.ts') && statSync(join(abs, f)).isFile()) files.push(join(abs, f));
  }
}
console.log(`node:test — ${level}: ${files.map((f) => relative(here, f)).join(', ')}`);

const res = spawnSync(
  process.execPath,
  ['--import', 'tsx', '--test', '--test-concurrency=1', ...files],
  { stdio: 'inherit', cwd: join(here, '..') },
);
process.exit(res.status ?? 1);
