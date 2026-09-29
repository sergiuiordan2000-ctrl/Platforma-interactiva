// Fișierul de setări (decizie tehnică 5.1, aprobată de proprietar la 29.09.2026, varianta A):
// pe staging nu există Terminal, deci comenzile CLI rulează prin Cron Jobs, care nu văd variabilele
// din pagina aplicației Node. Toate setările stau într-un singur fișier, în afara oricărui docroot,
// citibil numai de contul propriu (600). Aplicația web și comenzile cron îl citesc prin
//   CIVIC_ENV_FILE=/cale/civic.env
// Variabilele deja prezente în mediu au prioritate (process.loadEnvFile nu le suprascrie).

import { statSync } from 'node:fs';

export const ENV_FILE_VAR = 'CIVIC_ENV_FILE';

export class EnvFileError extends Error {}

/** Încarcă fișierul numit de CIVIC_ENV_FILE, dacă variabila există. Întoarce calea sau undefined. */
export function loadEnvFileFromVar(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const file = env[ENV_FILE_VAR]?.trim();
  if (!file) return undefined;
  let mode: number;
  try {
    mode = statSync(file).mode;
  } catch {
    throw new EnvFileError(`${ENV_FILE_VAR}: fișierul de setări nu există sau nu poate fi citit.`);
  }
  // pe Linux: fără drepturi pentru grup / alții (600 sau 400)
  if (process.platform !== 'win32' && (mode & 0o077) !== 0) {
    throw new EnvFileError(
      `${ENV_FILE_VAR}: fișierul de setări este citibil și de alți utilizatori (drepturi ${(mode & 0o777).toString(8)}); setați drepturile 600.`,
    );
  }
  process.loadEnvFile(file);
  return file;
}
