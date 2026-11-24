// Banda de urgență din Apelul rapid (24.11.2026): 112 fix + contactele marcate „Urgență” în Admin, fără numere fixe în cod.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { selectEmergencyBarContacts, telDigits } from '../../../src/services/emergencyBar.ts';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const c = (name: string, phone: string, isEmergency: boolean, order: number, isActive = true) =>
  ({ name, phone, formattedPhone: phone, isEmergency, isActive, order });

describe('banda de urgență (Apel rapid)', () => {
  it('ia numai contactele marcate „Urgență” și active, în ordinea din Admin, cel mult 3', () => {
    const got = selectEmergencyBarContacts([
      c('D', '0247000004', true, 4), c('A', '0247000001', true, 1), c('normal', '0247000009', false, 0),
      c('inactiv', '0247000008', true, 0, false), c('B', '0247000002', true, 2), c('C', '0247000003', true, 3),
    ]);
    assert.deepEqual(got.map((x) => x.name), ['A', 'B', 'C']);
  });

  it('nu repetă 112 (afișat fix) și nici numerele duble; fără contacte marcate, banda rămâne doar cu 112', () => {
    assert.deepEqual(selectEmergencyBarContacts([c('112 din Admin', '1 1 2', true, 0), c('X', '0247 000 001', true, 1), c('X bis', '0247000001', true, 2)]).map((x) => x.name), ['X']);
    assert.deepEqual(selectEmergencyBarContacts([c('normal', '0247000009', false, 0)]), []);
    assert.deepEqual(selectEmergencyBarContacts([]), []);
  });

  it('legătura tel: păstrează numai cifrele (și + la început)', () => {
    assert.equal(telDigits(' 0247 416-451 '), '0247416451');
    assert.equal(telDigits('+40 247 416 451'), '+40247416451');
  });

  it('componenta nu mai conține numerele fixe din prototip', () => {
    const src = readFileSync(join(repo, 'src', 'components', 'quickdial', 'QuickDialView.tsx'), 'utf8');
    for (const n of ['0247416450', '0247416350', '0247416990', 'Poliția Locală']) assert.ok(!src.includes(n), n);
    assert.ok(src.includes('selectEmergencyBarContacts'));
  });
});
