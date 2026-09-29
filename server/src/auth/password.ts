// Parolele Admin (B3 §2): crypto.scrypt, format `scrypt$N$r$p$salt$hash`, comparare în timp constant.

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { PASSWORD_MAX, PASSWORD_MIN } from '@tmc/shared';

/** Propunerea B3 (OWASP: N=2^17,r=8,p=1 ≈ N=2^15,r=8,p=3); ≈ 32 MiB per hash. */
export const SCRYPT_PARAMS = { N: 2 ** 15, r: 8, p: 3 } as const;
const KEYLEN = 64;

function scrypt(password: string, salt: Buffer, N: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, KEYLEN, { N, r, p, maxmem: 128 * N * r * 2 }, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const { N, r, p } = SCRYPT_PARAMS;
  const key = await scrypt(password, salt, N, r, p);
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64!, 'base64');
  const key = await scrypt(password, Buffer.from(saltB64!, 'base64'), Number(n), Number(r), Number(p));
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Parametri mai slabi decât cei actuali → re-hash la următoarea autentificare. */
export function needsRehash(stored: string): boolean {
  const [, n, r, p] = stored.split('$');
  return Number(n) < SCRYPT_PARAMS.N || Number(r) !== SCRYPT_PARAMS.r || Number(p) < SCRYPT_PARAMS.p;
}

/** Hash fix, folosit când contul nu există (timp de răspuns egal, fără enumerare). */
let dummyHash: Promise<string> | null = null;
export function dummyVerify(password: string): Promise<boolean> {
  dummyHash ??= hashPassword('parola-inexistenta-pentru-timp-egal');
  return dummyHash.then((h) => verifyPassword(password, h)).then(() => false);
}

/** Lista scurtă de parole comune (B3 §2), în cod. */
const COMMON = new Set([
  'password1234', 'parola123456', '123456789012', 'qwertyuiop12', 'administrator', 'turnumagurele',
  'primaria2026', 'adminadmin12', 'parolaparola', '1234567890ab', 'iloveyou1234', 'welcome12345',
]);

export function passwordPolicyError(password: string, email: string): string | null {
  if (password.length < PASSWORD_MIN) return `Parola trebuie să aibă cel puțin ${PASSWORD_MIN} caractere.`;
  if (password.length > PASSWORD_MAX) return `Parola poate avea cel mult ${PASSWORD_MAX} de caractere.`;
  const lower = password.toLowerCase();
  const local = email.split('@')[0]!.trim().toLowerCase();
  if (lower === email.trim().toLowerCase() || (local.length >= 4 && lower.includes(local))) {
    return 'Parola nu poate conține adresa de e-mail.';
  }
  if (COMMON.has(lower)) return 'Parola este prea comună.';
  return null;
}
