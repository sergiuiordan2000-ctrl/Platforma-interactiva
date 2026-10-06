// Schimbarea cheii TOTP_ENC_KEY (plan: docs/faza5/FAZA_5_4_ROTIRE_TOTP_PLAN.md).
// Din cheie derivă: criptarea secretelor TOTP ale conturilor Admin (se recriptează), amprenta e-mailului
// din blocări (se recalculează unde contul există), codurile de recuperare și codurile de cetățean
// (nu pot fi mutate: se șterg). Totul sau nimic; nicio valoare de cheie nu se afișează.
// Modul de probă (`dryRun`) face toate verificările și anulează tranzacția: nu schimbă nimic.

import { randomBytes } from 'node:crypto';
import { chmodSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import type mysql from 'mysql2/promise';
import { writeAudit } from './audit.ts';
import { decryptSecret, deriveKey, encryptSecret, hmacHex } from './auth/crypto.ts';

export const TOTP_KEY_NAME = 'TOTP_ENC_KEY';

export class RotateTotpKeyError extends Error {}

/** Eșec după confirmarea în DB: fișierul de setări trebuie înlocuit de mână cu cel temporar. */
export class RotateTotpKeyRenameError extends Error {
  constructor(public readonly tmpFile: string, public readonly envFile: string) {
    super('fișierul de setări nu a putut fi înlocuit');
  }
}

export type RotateTotpCounts = {
  /** secrete TOTP recriptate (conturi Admin cu TOTP început sau activ) */
  totpSecrets: number;
  /** blocări cu cont, cu amprenta e-mailului recalculată */
  blocks: number;
  /** coduri de recuperare șterse (nu pot fi mutate) */
  recoveryCodes: number;
  /** coduri de cetățean neconsumate, șterse */
  citizenCodes: number;
};

export type RotateTotpResult =
  | { status: 'orphan_blocks'; orphanBlocks: number }
  | { status: 'checked' | 'rotated'; counts: RotateTotpCounts };

const lineKey = (line: string): string | undefined => line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/)?.[1];

/** Aceleași formate ca la pornirea aplicației (config.ts): 64 de caractere hex sau base64 de 32 de octeți. */
export function parseTotpKey(raw: string): Buffer | null {
  const v = raw.trim().replace(/^(["'])(.*)\1$/, '$2').trim();
  let bytes: Buffer | null = null;
  if (/^[0-9a-fA-F]{64}$/.test(v)) bytes = Buffer.from(v, 'hex');
  else if (/^[A-Za-z0-9+/]{43}=?$/.test(v)) bytes = Buffer.from(v, 'base64');
  return bytes && bytes.length === 32 ? bytes : null;
}

type EnvKeyLine = { lines: string[]; eol: string; index: number; key: Buffer };

/** Citește fișierul de setări și găsește rândul cheii. Refuză dacă ceva nu este exact cum trebuie. */
export function readTotpKeyLine(file: string): EnvKeyLine {
  let mode: number;
  try {
    mode = statSync(file).mode;
  } catch {
    throw new RotateTotpKeyError('Fișierul de setări nu există sau nu poate fi citit.');
  }
  if (process.platform !== 'win32' && (mode & 0o077) !== 0) {
    throw new RotateTotpKeyError(`Fișierul de setări are drepturi ${(mode & 0o777).toString(8)}; sunt necesare 600. Nimic nu a fost schimbat.`);
  }
  const text = readFileSync(file, 'utf8');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  const positions = lines.map((l, i) => (lineKey(l) === TOTP_KEY_NAME ? i : -1)).filter((i) => i >= 0);
  if (positions.length === 0) throw new RotateTotpKeyError(`Cheia ${TOTP_KEY_NAME} lipsește din fișier. Nimic nu a fost schimbat.`);
  if (positions.length > 1) {
    throw new RotateTotpKeyError(`Cheia ${TOTP_KEY_NAME} apare de ${positions.length} ori în fișier. Nimic nu a fost schimbat.`);
  }
  const index = positions[0]!;
  const key = parseTotpKey(lines[index]!.slice(lines[index]!.indexOf('=') + 1));
  if (!key) throw new RotateTotpKeyError(`Cheia ${TOTP_KEY_NAME} din fișier nu are formatul așteptat. Nimic nu a fost schimbat.`);
  return { lines, eol, index, key };
}

export type RotateTotpOptions = {
  /** fișierul de setări (CIVIC_ENV_FILE) */
  file: string;
  pool: mysql.Pool;
  /** cheia cu care rulează aplicația acum (din configurare); trebuie să fie cea din fișier */
  currentKey: Buffer;
  now: Date;
  /** modul de probă: toate verificările, nicio schimbare */
  dryRun?: boolean;
  /** numai pentru teste */
  gen?: () => Buffer;
  hooks?: { beforeCommit?: () => void | Promise<void>; rename?: (from: string, to: string) => void };
};

/**
 * Schimbă cheia. Ordinea: verificări → tranzacție în DB (recriptare cu verificare, recalculare, ștergeri,
 * audit) → fișier temporar cu cheia nouă → confirmarea tranzacției → redenumirea fișierului temporar.
 * Orice eșec înaintea confirmării lasă DB-ul și fișierul neschimbate.
 */
export async function rotateTotpKey(opts: RotateTotpOptions): Promise<RotateTotpResult> {
  const env = readTotpKeyLine(opts.file);
  if (!env.key.equals(opts.currentKey)) {
    throw new RotateTotpKeyError('Cheia din fișierul de setări nu este cea cu care a pornit comanda. Nimic nu a fost schimbat.');
  }
  const oldKey = env.key;
  let newKey = (opts.gen ?? (() => randomBytes(32)))();
  while (newKey.equals(oldKey)) newKey = randomBytes(32);

  const conn = await opts.pool.getConnection();
  let tmp: string | null = null;
  try {
    await conn.beginTransaction();

    // 1. blocările orfane active (fără cont): amprenta lor nu poate fi recalculată → oprire, fără schimbări
    const [orph] = await conn.query(
      "SELECT COUNT(*) AS n FROM citizen_blocks WHERE account_id IS NULL AND (kind = 'permanent' OR ends_at > ?)",
      [opts.now],
    );
    const orphanBlocks = Number((orph as Array<{ n: number }>)[0]!.n);
    if (orphanBlocks > 0) {
      await conn.rollback();
      return { status: 'orphan_blocks', orphanBlocks };
    }

    // 2. secretele TOTP: recriptare, cu citirea înapoi a fiecăruia înainte de salvare
    const [users] = await conn.query('SELECT id, totp_secret_enc FROM admin_users WHERE totp_secret_enc IS NOT NULL FOR UPDATE');
    let totpSecrets = 0;
    for (const u of users as Array<{ id: string; totp_secret_enc: Buffer }>) {
      let plain: string;
      try {
        plain = decryptSecret(oldKey, u.totp_secret_enc);
      } catch {
        throw new RotateTotpKeyError('Secretul TOTP al unui cont nu poate fi citit cu cheia actuală. Nimic nu a fost schimbat.');
      }
      const enc = encryptSecret(newKey, plain);
      let back: string | null = null;
      try {
        back = decryptSecret(newKey, enc);
      } catch {
        back = null;
      }
      if (back !== plain) throw new RotateTotpKeyError('Verificarea unui secret recriptat a eșuat. Nimic nu a fost schimbat.');
      await conn.query('UPDATE admin_users SET totp_secret_enc = ? WHERE id = ?', [enc, u.id]);
      totpSecrets++;
    }

    // 3. amprenta e-mailului din blocările care au cont
    const emailKey = deriveKey(newKey, 'email-hash');
    const [blk] = await conn.query(
      'SELECT b.id, a.email_normalized AS email FROM citizen_blocks b JOIN citizen_accounts a ON a.id = b.account_id FOR UPDATE',
    );
    for (const b of blk as Array<{ id: string; email: string }>) {
      await conn.query('UPDATE citizen_blocks SET email_hash = ? WHERE id = ?', [hmacHex(emailKey, b.email), b.id]);
    }

    // 4. ce nu poate fi mutat pe cheia nouă: codurile de recuperare și codurile de cetățean neconsumate
    const [rc] = await conn.query('DELETE FROM admin_recovery_codes');
    const [cc] = await conn.query('DELETE FROM citizen_login_codes WHERE consumed_at IS NULL');

    const counts: RotateTotpCounts = {
      totpSecrets,
      blocks: (blk as unknown[]).length,
      recoveryCodes: (rc as { affectedRows: number }).affectedRows,
      citizenCodes: (cc as { affectedRows: number }).affectedRows,
    };

    if (opts.dryRun) {
      await conn.rollback();
      return { status: 'checked', counts };
    }

    await writeAudit(conn, opts.now, {
      actorType: 'system', action: 'system.keys.rotate_totp', targetType: 'settings', targetId: 'env-file',
      details: { ...counts, via: 'cli' },
    });

    // 5. fișierul temporar cu cheia nouă, lângă cel de setări (drepturi 600)
    const lines = [...env.lines];
    lines[env.index] = `${TOTP_KEY_NAME}=${newKey.toString('hex')}`;
    tmp = join(dirname(opts.file), `.${basename(opts.file)}.${process.pid}.cheie-noua.tmp`);
    try {
      writeFileSync(tmp, lines.join(env.eol), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
      chmodSync(tmp, 0o600);
    } catch (e) {
      throw new RotateTotpKeyError(`Fișierul temporar nu a putut fi scris (${(e as NodeJS.ErrnoException).code ?? 'eroare'}). Nimic nu a fost schimbat.`);
    }

    await opts.hooks?.beforeCommit?.();
    await conn.commit();

    // 6. după confirmare: fișierul temporar devine fișierul de setări (redenumire atomică)
    try {
      (opts.hooks?.rename ?? renameSync)(tmp, opts.file);
    } catch {
      throw new RotateTotpKeyRenameError(tmp, opts.file);
    }
    return { status: 'rotated', counts };
  } catch (err) {
    if (!(err instanceof RotateTotpKeyRenameError)) {
      // înainte de confirmare: DB-ul revine, fișierul temporar dispare, fișierul de setări este neatins
      try {
        await conn.rollback();
      } catch {
        // conexiune deja închisă
      }
      if (tmp) rmSync(tmp, { force: true });
    }
    throw err;
  } finally {
    conn.release();
  }
}
