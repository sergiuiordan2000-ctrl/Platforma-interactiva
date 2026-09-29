import { getTableConfig, type MySqlTable } from 'drizzle-orm/mysql-core';
import * as schema from '../../src/db/schema/index.ts';

export function drizzleTables(): MySqlTable[] {
  const tables: MySqlTable[] = [];
  for (const value of Object.values(schema) as unknown[]) {
    if (typeof value === 'object' && value !== null && Symbol.for('drizzle:IsDrizzleTable') in value) {
      tables.push(value as MySqlTable);
    }
  }
  return tables;
}

export function tableConfig(name: string) {
  const t = drizzleTables().find((x) => getTableConfig(x).name === name);
  if (!t) throw new Error(`tabel necunoscut: ${name}`);
  return getTableConfig(t);
}
