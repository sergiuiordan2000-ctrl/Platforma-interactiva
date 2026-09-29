// check:no-demo (B1 §5.3, D10-3): în producție, aplicația refuză să pornească dacă există
// rânduri is_demo = true în orice tabel care are coloana is_demo.
// Lista tabelelor se citește din schema reală a DB-ului, ca un tabel nou să nu fie uitat.

import type mysql from 'mysql2/promise';

export type NoDemoResult = { ok: boolean; demoRows: Record<string, number> };

export async function demoTables(pool: mysql.Pool): Promise<string[]> {
  const [rows] = await pool.query(
    `SELECT TABLE_NAME AS t FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'is_demo' ORDER BY TABLE_NAME`,
  );
  return (rows as Array<{ t: string }>).map((r) => r.t);
}

export async function checkNoDemo(pool: mysql.Pool): Promise<NoDemoResult> {
  const demoRows: Record<string, number> = {};
  for (const table of await demoTables(pool)) {
    const [rows] = await pool.query(`SELECT COUNT(*) AS n FROM \`${table}\` WHERE is_demo = TRUE`);
    const n = Number((rows as Array<{ n: number }>)[0]?.n ?? 0);
    if (n > 0) demoRows[table] = n;
  }
  return { ok: Object.keys(demoRows).length === 0, demoRows };
}
