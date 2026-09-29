// Convenții comune ale schemei (docs/faza4/FAZA_4_B1_MODEL_DATE.md §1):
// ULID CHAR(26) pentru entitățile de domeniu, DATETIME(3) în UTC, is_demo pe conținut.

import { boolean, char, datetime } from 'drizzle-orm/mysql-core';

/** Cheie primară ULID (generată în aplicație). */
export const ulidId = (name = 'id') => char(name, { length: 26 });

/** Referință către un ULID. */
export const ulidRef = (name: string) => char(name, { length: 26 });

/** DATETIME(3), UTC. */
export const ts = (name: string) => datetime(name, { mode: 'date', fsp: 3 });

/** SHA-256 / HMAC-SHA256 în hex. */
export const hash64 = (name: string) => char(name, { length: 64 });

/** Marcajul datelor demo (D10-3). */
export const isDemo = () => boolean('is_demo').notNull().default(false);
