// Căile fișierelor din STORAGE_DIR (fotografii). Cheile sunt generate de aplicație (nume aleatoare);
// orice cheie cu componente suspecte este refuzată, ca o ștergere sau o copiere să nu iasă din director.

import { join, resolve, sep } from 'node:path';

const KEY_RE = /^[A-Za-z0-9_-][A-Za-z0-9._-]*(\/[A-Za-z0-9_-][A-Za-z0-9._-]*)*$/;

export function storagePath(storageDir: string, key: string): string {
  if (!KEY_RE.test(key) || key.split('/').some((part) => part === '.' || part === '..')) {
    throw new Error('Cheie de stocare invalidă');
  }
  const root = resolve(storageDir);
  const full = resolve(join(root, key));
  if (!full.startsWith(root + sep)) throw new Error('Cheie de stocare invalidă');
  return full;
}
