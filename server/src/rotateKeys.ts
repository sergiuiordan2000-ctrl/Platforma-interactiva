// Rotirea cheilor „ușoare” din fișierul de setări (plan: docs/faza5/FAZA_5_4_ROTIRE_SECRETE_PLAN.md,
// varianta A din 30.09.2026). Valorile se generează pe server și se scriu direct în fișier; nu se
// afișează niciodată. Restul fișierului (inclusiv DATABASE_URL și TOTP_ENC_KEY) rămâne neschimbat.

import { randomBytes } from 'node:crypto';
import { chmodSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

export const ROTATED_KEYS = ['IP_HASH_SECRET', 'PARTICIPATION_HMAC_SECRET', 'FORM_TOKEN_SECRET', 'POW_HMAC_KEY'] as const;

export class RotateKeysError extends Error {}

const lineKey = (line: string): string | undefined => line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/)?.[1];

/** Înlocuiește cele 4 chei în fișier (scriere atomică, drepturi 600). Întoarce numele cheilor schimbate. */
export function rotateKeysInFile(file: string, gen: () => string = () => randomBytes(32).toString('base64url')): string[] {
  let mode: number;
  try {
    mode = statSync(file).mode;
  } catch {
    throw new RotateKeysError('Fișierul de setări nu există sau nu poate fi citit.');
  }
  if (process.platform !== 'win32' && (mode & 0o077) !== 0) {
    throw new RotateKeysError(`Fișierul de setări are drepturi ${(mode & 0o777).toString(8)}; sunt necesare 600. Nimic nu a fost schimbat.`);
  }
  const text = readFileSync(file, 'utf8');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);

  const positions = new Map<string, number[]>();
  lines.forEach((l, i) => {
    const k = lineKey(l);
    if (k && (ROTATED_KEYS as readonly string[]).includes(k)) positions.set(k, [...(positions.get(k) ?? []), i]);
  });
  for (const k of ROTATED_KEYS) {
    const p = positions.get(k) ?? [];
    if (p.length === 0) throw new RotateKeysError(`Cheia ${k} lipsește din fișier. Nimic nu a fost schimbat.`);
    if (p.length > 1) throw new RotateKeysError(`Cheia ${k} apare de ${p.length} ori în fișier. Nimic nu a fost schimbat.`);
  }

  const used = new Set<string>();
  for (const k of ROTATED_KEYS) {
    let v = gen();
    while (used.has(v)) v = gen();
    used.add(v);
    lines[positions.get(k)![0]!] = `${k}=${v}`;
  }

  const tmp = join(dirname(file), `.${basename(file)}.${process.pid}.tmp`);
  try {
    writeFileSync(tmp, lines.join(eol), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    chmodSync(tmp, 0o600);
    renameSync(tmp, file);
  } catch (e) {
    rmSync(tmp, { force: true });
    throw new RotateKeysError(`Scrierea fișierului a eșuat (${(e as NodeJS.ErrnoException).code ?? 'eroare'}). Fișierul vechi a rămas neschimbat.`);
  }
  return [...ROTATED_KEYS];
}
