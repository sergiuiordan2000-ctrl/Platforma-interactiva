// Notele de licență ale codului terț inclus în artefact (registrul Fazei 7: §34.7–§34.9; propunerea „corectura
// notelor de licență” r2, aprobată de proprietar la 06.11.2026: D-L1 = A, D-L2 = A, D-L3 = B).
//
// Generează THIRD_PARTY_LICENSES.txt din graful REAL al construcției (nu dintr-o listă scrisă de mână):
// - serverul: modulele din `metafile` al esbuild (server/build.mjs);
// - frontendul: modulele din `generateBundle` al Vite (vite.config.ts).
//
// Pentru fiecare pachet (identificat după NUME și VERSIUNE, din propriul `package.json`): licența declarată și
// TEXTUL INTEGRAL, neschimbat, al fișierelor LICENSE* / LICENCE* / COPYING* și NOTICE* din directorul pachetului.
// Un pachet fără fișier de licență folosește numai `licenses/extra/<nume>@<versiune>.txt` (antet cu sursa, apoi
// linia „-----”, apoi textul integral, neschimbat), pentru exact acel nume și acea versiune.
//
// Construcția EȘUEAZĂ (ThirdPartyLicenseError) dacă un pachet: nu are text de licență; are licența declarată lipsă,
// ambiguă (expresie cu OR / AND / WITH, paranteze), „UNLICENSED”, „SEE LICENSE IN …” sau în afara listei acceptate.
// Textele nu se modifică, nu se combină și nu se deduplică între pachete (atribuirea rămâne la fiecare pachet).

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const EXTRA_DIR = join(REPO_ROOT, 'licenses', 'extra');

/** Lista explicită a licențelor acceptate. O licență nouă se adaugă numai prin decizie (registru). */
export const ACCEPTED_LICENSES = Object.freeze([
  'MIT',
  'MIT-0',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
  'BlueOak-1.0.0',
]);

const LICENSE_FILE_RE = /^(licen[cs]e|copying)(\b|[.-]|$)/i;
const NOTICE_FILE_RE = /^notice(\b|[.-]|$)/i;
export const EXTRA_SEPARATOR = '-----';

export class ThirdPartyLicenseError extends Error {}

/**
 * Directorul pachetului care conține fișierul dat: ultimul segment `node_modules/<nume>` sau
 * `node_modules/@scope/<nume>` din cale. Întoarce null pentru codul propriu (fără `node_modules`).
 */
export function packageRootOf(file) {
  const norm = file.replace(/\\/g, '/').replace(/^\0/, '').split('?')[0];
  const i = norm.lastIndexOf('/node_modules/');
  if (i < 0) return null;
  const rest = norm.slice(i + '/node_modules/'.length).split('/');
  const name = rest[0]?.startsWith('@') ? `${rest[0]}/${rest[1]}` : rest[0];
  if (!name) return null;
  return norm.slice(0, i) + '/node_modules/' + name;
}

/** Licența declarată, validată față de lista acceptată; altfel ThirdPartyLicenseError. */
export function checkDeclaredLicense(id, license) {
  if (typeof license !== 'string' || license.trim() === '') {
    throw new ThirdPartyLicenseError(`${id}: licența declarată lipsește din package.json (sau nu este un text SPDX simplu).`);
  }
  const l = license.trim();
  if (/\b(OR|AND|WITH)\b|[()]/.test(l)) throw new ThirdPartyLicenseError(`${id}: licență declarată ambiguă („${l}”); necesită decizie.`);
  if (/^UNLICENSED$/i.test(l) || /^SEE LICEN[CS]E IN/i.test(l)) throw new ThirdPartyLicenseError(`${id}: licență declarată nesuportată („${l}”).`);
  if (!ACCEPTED_LICENSES.includes(l)) throw new ThirdPartyLicenseError(`${id}: licența „${l}” nu este pe lista acceptată (${ACCEPTED_LICENSES.join(', ')}).`);
  return l;
}

function readExtra(extraDir, name, version) {
  const file = join(extraDir, `${name.replace('/', '__')}@${version}.txt`);
  if (!existsSync(file)) return null;
  const raw = readFileSync(file, 'utf8');
  const idx = raw.indexOf(`\n${EXTRA_SEPARATOR}\n`);
  if (idx < 0) throw new ThirdPartyLicenseError(`${file}: lipsește linia de separare „${EXTRA_SEPARATOR}” dintre antet și text.`);
  const header = raw.slice(0, idx);
  const text = raw.slice(idx + EXTRA_SEPARATOR.length + 2);
  if (!/^# SURSA:/m.test(header)) throw new ThirdPartyLicenseError(`${file}: antetul nu conține „# SURSA:”.`);
  if (text.trim() === '') throw new ThirdPartyLicenseError(`${file}: textul licenței este gol.`);
  return { file, header, text };
}

/**
 * Colectează pachetele din lista de fișiere a construcției. Întoarce intrările sortate (nume, apoi versiune), cu
 * textele integrale. Orice problemă = ThirdPartyLicenseError, cu lista completă a problemelor.
 */
export function collectThirdPartyLicenses(files, { extraDir = EXTRA_DIR } = {}) {
  const roots = new Set();
  for (const f of files) {
    const r = packageRootOf(f);
    if (r) roots.add(r);
  }
  const byId = new Map();
  const problems = [];
  for (const root of roots) {
    const pjPath = join(root, 'package.json');
    if (!existsSync(pjPath)) {
      problems.push(`${root}: lipsește package.json.`);
      continue;
    }
    const pj = JSON.parse(readFileSync(pjPath, 'utf8'));
    const id = `${pj.name}@${pj.version}`;
    if (byId.has(id)) continue; // aceeași versiune din două locuri: același pachet
    try {
      const license = checkDeclaredLicense(id, pj.license);
      const entries = readdirSync(root).sort();
      const licenseFiles = entries.filter((e) => LICENSE_FILE_RE.test(e));
      const noticeFiles = entries.filter((e) => NOTICE_FILE_RE.test(e));
      const texts = [];
      for (const e of [...licenseFiles, ...noticeFiles]) texts.push({ source: `${e} (din pachet)`, text: readFileSync(join(root, e), 'utf8') });
      if (licenseFiles.length === 0) {
        const extra = readExtra(extraDir, pj.name, pj.version);
        if (!extra) {
          throw new ThirdPartyLicenseError(
            `${id}: pachetul nu conține un fișier de licență și nu există licenses/extra/${pj.name.replace('/', '__')}@${pj.version}.txt.`,
          );
        }
        texts.unshift({ source: `licenses/extra (sursa în antet)`, header: extra.header, text: extra.text });
      }
      byId.set(id, { id, name: pj.name, version: pj.version, license, texts });
    } catch (err) {
      problems.push(err instanceof Error ? err.message : String(err));
    }
  }
  if (problems.length > 0) throw new ThirdPartyLicenseError(`Notele de licență nu pot fi generate:\n- ${problems.join('\n- ')}`);
  return [...byId.values()].sort((a, b) => (a.name === b.name ? a.version.localeCompare(b.version, 'en', { numeric: true }) : a.name.localeCompare(b.name, 'en')));
}

/** Textul fișierului THIRD_PARTY_LICENSES.txt (determinist). */
export function renderThirdPartyLicenses(entries, { title }) {
  const bar = '='.repeat(78);
  const out = [
    `${title}`,
    `Pachete terțe incluse: ${entries.length}`,
    'Fiecare intrare: numele@versiunea, licența declarată, apoi textul integral, neschimbat, al fișierelor de licență',
    'și NOTICE din pachet (sau din licenses/extra, cu sursa în antet).',
    '',
    'Cuprins:',
    ...entries.map((e) => `  ${e.id}  (${e.license})`),
    '',
  ];
  for (const e of entries) {
    out.push(bar, `${e.id}`, `Licența declarată: ${e.license}`, bar);
    for (const t of e.texts) {
      out.push(`--- ${t.source} ---`);
      if (t.header) out.push(t.header.trimEnd(), '');
      // textul se scrie integral, neschimbat; separatorul se adaugă numai după el
      out.push(t.text, '');
    }
  }
  return out.join('\n') + '\n';
}
