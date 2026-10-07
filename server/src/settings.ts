// Setările aplicației (tabelul `settings`, B1): cheie → valoare JSON.
// Chei folosite: `registry.*` (fluxul către Primărie, N3-5, A-17, 2.13) și, din 5.4,
// `reports.pow_enabled` (ALTCHA la sesizări, decizia din 30.09.2026).

import type mysql from 'mysql2/promise';

type Conn = mysql.Pool | mysql.PoolConnection;

export async function getSetting<T>(conn: Conn, key: string, fallback: T): Promise<T> {
  const [rows] = await conn.query('SELECT `value` FROM settings WHERE `key` = ?', [key]);
  const row = (rows as Array<{ value: unknown }>)[0];
  if (!row) return fallback;
  const v = typeof row.value === 'string' ? safeParse(row.value) : row.value;
  return (v ?? fallback) as T;
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

export async function setSetting(conn: Conn, key: string, value: unknown, at: Date, by: string | null): Promise<void> {
  // Textul JSON se trimite ca șir: și MySQL, și MariaDB îl validează la scrierea într-o coloană JSON.
  // `CAST(? AS JSON)` există numai în MySQL.
  await conn.query(
    'INSERT INTO settings (`key`, `value`, updated_at, updated_by) VALUES (?, ?, ?, ?) ' +
      'ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), updated_at = VALUES(updated_at), updated_by = VALUES(updated_by)',
    [key, JSON.stringify(value), at, by],
  );
}

export interface RegistrySettings {
  recipientEmail: string | null;
  flowEnabled: boolean;
  primariaMode: 'none' | 'email_only' | 'platform';
  agreementReference: string | null;
}

export async function getRegistrySettings(conn: Conn): Promise<RegistrySettings> {
  return {
    recipientEmail: await getSetting<string | null>(conn, 'registry.recipient_email', null),
    flowEnabled: (await getSetting<boolean>(conn, 'registry.flow_enabled', false)) === true,
    primariaMode: await getSetting<RegistrySettings['primariaMode']>(conn, 'registry.primaria_mode', 'none'),
    agreementReference: await getSetting<string | null>(conn, 'registry.agreement_reference', null),
  };
}

export const REPORT_POW_KEY = 'reports.pow_enabled';

export async function isReportPowEnabled(conn: Conn): Promise<boolean> {
  return (await getSetting<boolean>(conn, REPORT_POW_KEY, false)) === true;
}
