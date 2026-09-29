// TOTP (B3 §5): RFC 6238, SHA-1, 6 cifre, 30 s, ±1 pas; anti-reluare prin `totp_last_step`.

import { Secret, TOTP } from 'otpauth';

export const TOTP_ISSUER = 'Turnu Magurele Civic';

export function newTotpSecret(): string {
  return new Secret({ size: 20 }).base32; // 160 de biți
}

export function otpauthUri(secretBase32: string, label: string): string {
  return new TOTP({ issuer: TOTP_ISSUER, label, algorithm: 'SHA1', digits: 6, period: 30, secret: Secret.fromBase32(secretBase32) }).toString();
}

/** Întoarce pasul acceptat sau null. Un pas ≤ `lastStep` este refuzat (cod deja folosit). */
export function verifyTotp(secretBase32: string, code: string, now: Date, lastStep: number | null): number | null {
  const totp = new TOTP({ algorithm: 'SHA1', digits: 6, period: 30, secret: Secret.fromBase32(secretBase32) });
  const delta = totp.validate({ token: code, timestamp: now.getTime(), window: 1 });
  if (delta === null) return null;
  const step = Math.floor(now.getTime() / 30_000) + delta;
  if (lastStep !== null && step <= lastStep) return null;
  return step;
}

export function totpCodeAt(secretBase32: string, at: Date): string {
  return new TOTP({ algorithm: 'SHA1', digits: 6, period: 30, secret: Secret.fromBase32(secretBase32) }).generate({ timestamp: at.getTime() });
}
