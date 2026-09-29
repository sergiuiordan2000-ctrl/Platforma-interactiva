// Conexiunea MySQL (mysql2, JavaScript pur) + Drizzle.
// Fiecare conexiune: fus orar UTC și sql_mode strict, indiferent de setările serverului
// (pe hosting-ul partajat sql_mode poate fi permisiv).

import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema/index.ts';

export const SESSION_SQL_MODE =
  'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION,ONLY_FULL_GROUP_BY';

export type Db = MySql2Database<typeof schema>;

export type DbHandle = {
  pool: mysql.Pool;
  db: Db;
  close: () => Promise<void>;
};

export function createDb(databaseUrl: string, options: { connectionLimit?: number } = {}): DbHandle {
  const pool = mysql.createPool({
    uri: databaseUrl,
    connectionLimit: options.connectionLimit ?? 5,
    timezone: 'Z',
    charset: 'utf8mb4_0900_ai_ci',
    supportBigNumbers: true,
    bigNumberStrings: false,
    multipleStatements: false,
    enableKeepAlive: true,
    // affectedRows standard: rândurile modificate efectiv (nu cele găsite)
    flags: ['-FOUND_ROWS'],
  });
  // conexiunea „brută” (callback) primită la creare
  pool.pool.on('connection', (conn) => {
    conn.query(`SET time_zone = '+00:00', sql_mode = '${SESSION_SQL_MODE}'`);
  });
  const db = drizzle(pool, { schema, mode: 'default' });
  return {
    pool,
    db,
    close: () => pool.end(),
  };
}

/** Verificare simplă a conexiunii (health). */
export async function pingDb(pool: mysql.Pool): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
