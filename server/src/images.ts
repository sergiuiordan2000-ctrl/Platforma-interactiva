// Imaginile comunicatelor (DN-19, A04-5, T-C9): numai fișiere din repository, publicate cu aplicația.
// Sursa listei: `public/images/comunicate/` → după build, `dist/images/comunicate/`. Lista se citește
// la pornire; o imagine nouă = o modificare în repository + deploy. Fără încărcare de fișiere.

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const ANNOUNCEMENT_IMAGES_URL_PREFIX = '/images/comunicate/';
const ALLOWED = /\.(webp|jpe?g|png)$/i;

export function loadAnnouncementImages(frontendDir: string): ReadonlySet<string> {
  const dir = join(frontendDir, 'images', 'comunicate');
  if (!existsSync(dir)) return new Set();
  return new Set(
    readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile() && ALLOWED.test(e.name) && /^[A-Za-z0-9._-]+$/.test(e.name))
      .map((e) => ANNOUNCEMENT_IMAGES_URL_PREFIX + e.name)
      .sort(),
  );
}
