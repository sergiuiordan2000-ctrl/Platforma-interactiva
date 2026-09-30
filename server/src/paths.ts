// Căile aplicației, calculate față de locul codului.
// Atât sursa (server/src/*.ts, rulată cu tsx), cât și artefactul (server/dist/app.js)
// stau la două niveluri sub rădăcina repository-ului, deci căile relative sunt aceleași.

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** Rădăcina repository-ului / a pachetului de deploy. */
export const APP_ROOT = resolve(here, '..', '..');
/** Frontend-ul construit de Vite. */
export const FRONTEND_DIST_DIR = resolve(APP_ROOT, 'dist');
/** Migrațiile SQL versionate. */
export const MIGRATIONS_DIR = resolve(APP_ROOT, 'server', 'migrations');
/** Seed-urile (config / demo). */
export const SEEDS_DIR = resolve(APP_ROOT, 'server', 'seeds');
/** Datele de referință livrate cu aplicația (de ex. limita UAT, 5.4.2). */
export const DATA_DIR = resolve(APP_ROOT, 'server', 'data');
