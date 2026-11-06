// Construiește artefactul backend: un singur fișier, server/dist/app.js (00 §7, T8).
// Format CommonJS: pornirea sub Passenger (cPanel) folosește require() pe fișierul de start.
// server/dist/package.json marchează directorul ca CommonJS (server/package.json are "type": "module").

import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { collectThirdPartyLicenses, renderThirdPartyLicenses } from '../scripts/third-party-licenses.mjs';

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

const result = await build({
  entryPoints: [join(here, 'src', 'main.ts')],
  outfile: join(outDir, 'app.js'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: false,
  legalComments: 'linked',
  // notele de licență complete (D-L1): graful real al modulelor incluse
  metafile: true,
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

// Notele de licență ale codului terț inclus (registrul §34.9; propunerea „corectura notelor de licență” r2):
// eșuează construcția dacă un pachet nu are text de licență sau are o licență neacceptată.
const thirdParty = collectThirdPartyLicenses(Object.keys(result.metafile.inputs).map((f) => join(here, f)));
writeFileSync(
  join(outDir, 'THIRD_PARTY_LICENSES.txt'),
  renderThirdPartyLicenses(thirdParty, { title: 'Turnu Măgurele Civic — server (server/dist/app.js): licențele codului terț inclus' }),
);
console.log(`server/dist/THIRD_PARTY_LICENSES.txt: ${thirdParty.length} pachete terțe`);
console.log(`server/dist/app.js construit (versiunea ${version})`);
