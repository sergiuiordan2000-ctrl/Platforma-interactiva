// Protecțiile anti-abuz ale depunerii (B7 §1–§2): jetonul „timp minim” semnat de server și
// proof-of-work ALTCHA v2 (`altcha-lib`, DN-22; la sesizări este oprit implicit, decizia din 30.09.2026).

import { createHmac, randomBytes } from 'node:crypto';
import { createChallenge, randomInt, verifySolution, type Challenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/sha';
import type { AppContext } from '../context.ts';
import { safeEqualHex, sha256Hex } from '../auth/crypto.ts';

// ——— formStartedAt ———

/** Jetonul: `<ms emitere>.<nonce>.<hmac>` (HMAC cu FORM_TOKEN_SECRET; nu poate fi falsificat de client). */
export function issueFormToken(ctx: AppContext, scope = 'report'): string {
  const issued = ctx.now().getTime();
  const nonce = randomBytes(9).toString('base64url');
  const payload = `${issued}.${nonce}`;
  const sig = createHmac('sha256', ctx.config.secrets.formToken).update(`${scope}:${payload}`).digest('hex');
  return `${payload}.${sig}`;
}

export type FormTokenCheck = 'ok' | 'invalid' | 'too_fast' | 'expired';

/** B7: sub pragul minim → `too_fast`; semnătură invalidă → `invalid`; mai vechi de `maxAgeMs` → `expired`. */
export function checkFormToken(
  ctx: AppContext,
  token: string,
  minMs: number,
  maxAgeMs: number,
  scope = 'report',
): FormTokenCheck {
  const parts = token.split('.');
  if (parts.length !== 3 || !/^\d{10,16}$/.test(parts[0]!)) return 'invalid';
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = createHmac('sha256', ctx.config.secrets.formToken).update(`${scope}:${payload}`).digest('hex');
  if (!/^[0-9a-f]{64}$/.test(parts[2]!) || !safeEqualHex(parts[2]!, expected)) return 'invalid';
  const age = ctx.now().getTime() - Number(parts[0]);
  if (age < minMs) return 'too_fast';
  if (age > maxAgeMs) return 'expired';
  return 'ok';
}

// ——— ALTCHA v2 ———

export const POW_ALGORITHM = 'SHA-256';
/** Dificultatea: contorul căutat e ales aleator în [0, POW_MAX_COUNTER) (≈ 1–2 s pe un telefon). */
export const POW_MAX_COUNTER = 100_000;
export const POW_TTL_MS = 10 * 60_000;

// Expirarea provocării se măsoară după ceasul real (`Date.now()`), nu după `ctx.now()`: `altcha-lib` verifică
// expirarea după ceasul real, iar o provocare trebuie rezolvată în 10 minute reale. În producție cele două ceasuri
// coincid; în teste, ceasul simulat al aplicației (zile înainte sau înapoi) nu mai face provocările nevalide.
export async function createPowChallenge(ctx: AppContext): Promise<Challenge> {
  return createChallenge({
    algorithm: POW_ALGORITHM,
    cost: 1,
    counter: randomInt(0, POW_MAX_COUNTER),
    keyPrefixLength: 16,
    expiresAt: new Date(Date.now() + POW_TTL_MS),
    hmacSignatureSecret: ctx.config.secrets.powHmac,
    deriveKey,
  });
}

/**
 * Verifică `pow` = base64(JSON `{ challenge, solution }`) și îl marchează folosit (anti-reluare:
 * `used_pow_challenges`, până la expirare). `false` pentru orice problemă.
 */
export async function verifyPow(ctx: AppContext, pow: string | undefined): Promise<boolean> {
  if (!pow) return false;
  let parsed: { challenge?: Challenge; solution?: { counter?: unknown; derivedKey?: unknown } };
  try {
    parsed = JSON.parse(Buffer.from(pow, 'base64').toString('utf8'));
  } catch {
    return false;
  }
  const { challenge, solution } = parsed;
  if (
    !challenge?.parameters ||
    typeof challenge.signature !== 'string' ||
    challenge.parameters.algorithm !== POW_ALGORITHM ||
    typeof solution?.counter !== 'number' ||
    typeof solution.derivedKey !== 'string'
  ) {
    return false;
  }
  const expiresAt = Number(challenge.parameters.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt * 1000 < Date.now()) return false;
  let result;
  try {
    result = await verifySolution({
      challenge,
      solution: { counter: solution.counter, derivedKey: solution.derivedKey },
      deriveKey,
      hmacSignatureSecret: ctx.config.secrets.powHmac,
    });
  } catch {
    return false;
  }
  if (!result.verified) return false;
  // anti-reluare: aceeași provocare nu se folosește de două ori
  const hash = sha256Hex(challenge.signature);
  try {
    await ctx.pool.query('INSERT INTO used_pow_challenges (challenge_hash, expires_at) VALUES (?, ?)', [
      hash,
      new Date(expiresAt * 1000),
    ]);
  } catch {
    return false;
  }
  return true;
}
