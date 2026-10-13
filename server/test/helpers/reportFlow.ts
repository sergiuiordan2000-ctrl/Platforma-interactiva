// Pași reali prin rute (autentificare, depunere) și instantanee de directoare, pentru testele marcajelor
// de lângă backup-uri (Faza 6, R1–R5). Folosește numai rutele și modulele existente și la commitul de
// referință `d23ddd5`, ca aceleași teste să poată fi rulate, drept probă de control, pe codul vechi.

import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { CITIZEN_POLICY_VERSION } from '@tmc/shared';
import { totpCodeAt } from '../../src/auth/totp.ts';
import type mysql from 'mysql2/promise';
import { Client, type Clock } from './apiClient.ts';

export const V1 = '/api/v1';
const FIX = join(import.meta.dirname, '..', 'fixtures');
export const WEBP = readFileSync(join(FIX, 'exif.webp'));
/** În UAT (centrul orașului). */
const IN = { lat: 43.7518306, lng: 24.8691717 };

export type Flow = ReturnType<typeof reportFlow>;

export function reportFlow(app: () => FastifyInstance, pool: () => mysql.Pool, clock: Clock) {
  let ipSeq = 1;
  const nextIp = () => `10.9.${Math.floor(ipSeq / 250)}.${(ipSeq++ % 250) + 1}`;
  const q = async <T>(sql: string, p: unknown[] = []) => (await pool().query(sql, p))[0] as T[];

  /** Autentificarea cetățeanului cu cod pe e-mail (contul se creează la prima folosire). */
  async function citizen(email: string): Promise<Client> {
    const c = new Client(app(), undefined, nextIp());
    const start = await c.post(`${V1}/citizen/auth/start`, { email, policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION });
    assert.equal(start.statusCode, 202, start.body);
    const [row] = await q<{ b: string }>(
      "SELECT body_text AS b FROM email_outbox WHERE kind = 'citizen_login_code' AND recipient = ? ORDER BY created_at DESC, id DESC LIMIT 1",
      [email.toLowerCase()],
    );
    const code = row!.b.match(/\b(\d{6})\b/)![1]!;
    assert.equal((await c.post(`${V1}/citizen/auth/verify`, { email, code })).statusCode, 200);
    return c;
  }

  /** Prima autentificare a unui administrator creat cu `bootstrapAdmin` (parolă temporară → 2FA → parolă nouă). */
  async function adminFirstLogin(email: string, temp: string, pw: string): Promise<Client> {
    const c = new Client(app(), undefined, nextIp());
    const res = await c.post(`${V1}/auth/login`, { email, password: temp });
    assert.equal(res.json().mfa, 'enroll', res.body);
    const secret = (await c.post(`${V1}/auth/mfa/enroll/start`)).json().secretBase32;
    await c.post(`${V1}/auth/mfa/enroll/confirm`, { code: totpCodeAt(secret, clock.now()) });
    assert.equal((await c.post(`${V1}/auth/change-password`, { currentPassword: temp, newPassword: pw })).statusCode, 204);
    clock.advanceMinutes(1);
    return c;
  }

  function multipart(data: unknown, photos: Buffer[]) {
    const boundary = `----civic${randomUUID()}`;
    const chunks: Buffer[] = [Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="data"\r\n\r\n${JSON.stringify(data)}\r\n`)];
    photos.forEach((buf, i) => {
      chunks.push(
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photos"; filename="f${i}.bin"\r\nContent-Type: application/octet-stream\r\n\r\n`),
        buf,
        Buffer.from('\r\n'),
      );
    });
    chunks.push(Buffer.from(`--${boundary}--\r\n`));
    return { body: Buffer.concat(chunks), type: `multipart/form-data; boundary=${boundary}` };
  }

  async function formToken(c: Client): Promise<string> {
    const res = await c.get(`${V1}/citizen/reports/form-token`);
    assert.equal(res.statusCode, 200, res.body);
    return res.json().formStartedAt;
  }

  /** Depunerea prin ruta reală `POST /citizen/reports` (multipart, jeton de formular, cheie de idempotență). */
  async function submit(c: Client, opts: { photos?: Buffer[]; token?: string; wait?: boolean; key?: string } = {}) {
    const token = opts.token ?? (await formToken(c));
    if (opts.wait !== false) clock.advanceMinutes(0.2); // 12 s > timpul minim de 8 s
    const mp = multipart(
      {
        categoryId: 'iluminat',
        description: 'Lampa de pe stâlp nu mai funcționează de o săptămână.',
        location: { text: 'Centru, lângă Primărie', ...IN, source: 'pin' },
        notifyOptIn: false,
        transmitToCityHall: false,
        hp: '',
        formStartedAt: token,
        // D-B3 (13.10.2026): ALTCHA pornit implicit la sesizări; rezolvat ca în interfață (404 = oprit)
        ...((pow) => (pow ? { pow } : {}))(await c.pow(`${V1}/citizen/reports/pow-challenge`)),
      },
      opts.photos ?? [],
    );
    return c.send('POST', `${V1}/citizen/reports`, mp.body, { 'content-type': mp.type, 'idempotency-key': opts.key ?? randomUUID() });
  }

  /** Depune și întoarce numărul TM, ID-ul intern și cheile fotografiilor. */
  async function submitOk(c: Client, photos: Buffer[] = []) {
    const res = await submit(c, { photos });
    assert.equal(res.statusCode, 201, res.body);
    const ref = res.json().referenceNumber as string;
    const [r] = await q<{ id: string }>('SELECT id FROM reports WHERE reference_number = ?', [ref]);
    const keys = (await q<{ k: string }>('SELECT storage_key AS k FROM report_photos WHERE report_id = ? ORDER BY ordinal', [r!.id])).map((x) => x.k);
    return { ref, number: Number(ref.slice(3)), id: r!.id, photoKeys: keys };
  }

  const counter = async () => Number((await q<{ v: number }>('SELECT `last_value` AS v FROM report_counter WHERE id = 1'))[0]!.v);

  return { q, citizen, adminFirstLogin, formToken, submit, submitOk, counter };
}

// ——— marcajele, citite direct de pe disc (independent de codul aplicației) ———

/** Valoarea din `report-counter-watermark.json`; `null` dacă fișierul lipsește. */
export function watermarkOnDisk(backupDir: string): number | null {
  const file = join(backupDir, 'report-counter-watermark.json');
  if (!existsSync(file)) return null;
  return (JSON.parse(readFileSync(file, 'utf8')) as { lastValue: number }).lastValue;
}

/** Există un marcaj de ștergere pentru sesizare? (formatul nou: un fișier per intrare; formatul vechi: o listă) */
export function deletionMarkedOnDisk(backupDir: string, reportId: string): boolean {
  if (existsSync(join(backupDir, 'deletions', `${reportId}.json`))) return true;
  const legacy = join(backupDir, 'deletion-list.jsonl');
  return existsSync(legacy) && readFileSync(legacy, 'utf8').includes(`"${reportId}"`);
}

/** Instantaneul unui director: cale relativă → tip, mărime, SHA-256 și momentul ultimei modificări. */
export function snapshotDir(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (abs: string, rel: string) => {
    for (const name of readdirSync(abs).sort()) {
      const a = join(abs, name);
      const r = rel ? `${rel}/${name}` : name;
      const st = statSync(a);
      if (st.isDirectory()) {
        out[`${r}/`] = 'dir';
        walk(a, r);
      } else {
        out[r] = `${st.size}:${createHash('sha256').update(readFileSync(a)).digest('hex')}:${st.mtimeMs}`;
      }
    }
  };
  if (existsSync(dir)) walk(dir, '');
  return out;
}

/** Numărul de rânduri din fiecare tabel (în afara evidenței migrațiilor). */
export async function rowCounts(pool: mysql.Pool): Promise<Record<string, number>> {
  const [tables] = await pool.query(
    "SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
  );
  const out: Record<string, number> = {};
  for (const { t } of tables as Array<{ t: string }>) {
    if (t === 'schema_migrations') continue;
    const [r] = await pool.query(`SELECT COUNT(*) AS n FROM \`${t}\``);
    out[t] = Number((r as Array<{ n: number }>)[0]!.n);
  }
  return out;
}
