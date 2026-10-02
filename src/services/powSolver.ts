/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PowChallenge } from '@tmc/shared';

/**
 * Rezolvarea provocării ALTCHA în browser (B7, N4-5): folosită la sesizări (decizia A1) și la votul
 * în sondaje (pornită per sondaj). Biblioteca se încarcă numai la nevoie.
 *
 * În browser se folosește varianta Web Crypto a algoritmului (`algorithms/web/sha`); varianta
 * `algorithms/sha` este pentru Node (`node:crypto`) și nu funcționează în browser.
 */
export async function solvePow(challenge: PowChallenge): Promise<string | undefined> {
  const [{ solveChallenge }, { deriveKey }] = await Promise.all([
    import('altcha-lib'),
    import('altcha-lib/algorithms/web/sha'),
  ]);
  const solution = await solveChallenge({ challenge, deriveKey });
  if (!solution) return undefined;
  return btoa(JSON.stringify({ challenge, solution: { counter: solution.counter, derivedKey: solution.derivedKey } }));
}
