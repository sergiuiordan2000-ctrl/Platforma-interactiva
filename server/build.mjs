// Construiește artefactul backend: un singur fișier, server/dist/app.js (00 §7, T8).
// Format CommonJS: pornirea sub Passenger (cPanel) folosește require() pe fișierul de start.
// server/dist/package.json marchează directorul ca CommonJS (server/package.json are "type": "module").

import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'dist');
const pkg = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8'));

function gitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: here, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

const version = process.env.APP_VERSION || `${pkg.version}+${gitSha()}`;

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [join(here, 'src', 'main.ts')],
  outfile: join(outDir, 'app.js'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: false,
  legalComments: 'linked',
  // import.meta.url nu există în CommonJS: se înlocuiește cu URL-ul fișierului curent
  define: {
    'import.meta.url': '__civic_import_meta_url',
    __APP_VERSION__: JSON.stringify(version),
  },
  banner: {
    js: "const __civic_import_meta_url = require('node:url').pathToFileURL(__filename).href;",
  },
  logLevel: 'warning',
});

writeFileSync(join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2) + '\n');
console.log(`server/dist/app.js construit (versiunea ${version})`);
