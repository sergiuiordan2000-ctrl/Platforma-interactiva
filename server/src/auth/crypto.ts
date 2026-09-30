// Primitive criptografice (node:crypto, fără module native).

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';

export const sha256Hex = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');

export const hmacHex = (key: Buffer | string, data: string) => createHmac('sha256', key).update(data).digest('hex');

/** Chei derivate (HKDF) din TOTP_ENC_KEY, câte una per scop: fără variabile de mediu noi. */
export function deriveKey(master: Buffer, purpose: 'recovery-codes' | 'citizen-codes' | 'email-hash' | 'unsubscribe'): Buffer {
  return Buffer.from(hkdfSync('sha256', master, Buffer.alloc(0), `civic:${purpose}`, 32));
}

export const randomTokenB64url = (bytes = 32) => randomBytes(bytes).toString('base64url');

export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && ba.length > 0 && timingSafeEqual(ba, bb);
}

/** 6 cifre, aleator (crypto.randomInt). */
export const sixDigitCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

/** Hash-ul IP-ului (N4-4): HMAC(cheia zilei, IP), cheia zilei = HMAC(IP_HASH_SECRET, data UTC). */
export function ipHash(secret: string, ip: string, now: Date): string {
  const dayKey = createHmac('sha256', secret).update(now.toISOString().slice(0, 10)).digest();
  return hmacHex(dayKey, ip);
}

/** AES-256-GCM: iv(12) | tag(16) | ciphertext. */
export function encryptSecret(key: Buffer, plaintext: string): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]);
}

export function decryptSecret(key: Buffer, blob: Buffer): string {
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(blob.subarray(28)), decipher.final()]).toString('utf8');
}

/** Parolă temporară (B3 §2): 20 de caractere dintr-un alfabet fără confuzii. */
export function temporaryPassword(length = 20): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[randomInt(0, alphabet.length)];
  return out;
}
