// DB-ul de test: numai un DB al cărui nume conține „test” poate fi golit.

import mysql from 'mysql2/promise';
import { createDb, type DbHandle } from '../../src/db/client.ts';

export function testDatabaseUrl(): string {
  const url = process.env.CIVIC_TEST_DATABASE_URL;
  if (!url) throw new Error('CIVIC_TEST_DATABASE_URL lipsește');
  const dbName = new URL(url).pathname.replace(/^\//, '');
  if (!/test/i.test(dbName)) {
    throw new Error(`Refuz: DB-ul de test trebuie să conțină „test” în nume (primit: ${dbName})`);
  }
  return url;
}

export function openTestDb(): DbHandle {
  return createDb(testDatabaseUrl(), { connectionLimit: 3 });
}

/** Șterge toate tabelele din DB-ul de test (numai DB-ul de test). */
export async function resetTestDb(pool: mysql.Pool): Promise<void> {
  testDatabaseUrl();
  const [rows] = await pool.query(
    "SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'",
  );
  const conn = await pool.getConnection();
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const { t } of rows as Array<{ t: string }>) {
      await conn.query(`DROP TABLE \`${t}\``);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    conn.release();
  }
}
