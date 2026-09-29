import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ALL_PERMISSIONS, NEW_PERMISSIONS, SUPER_ADMIN_EXCLUSIVE, actsForCityHall, hasPermission, permissionsForRole } from '@tmc/shared';

describe('matricea permisiunilor (B4 §2, DN-01, 2.3)', () => {
  it('super_admin = 23 + 3 = 26; primarie_operator = 12; fără reports.moderate', () => {
    assert.equal(permissionsForRole('super_admin').length, 26);
    assert.equal(permissionsForRole('primarie_operator').length, 12);
    assert.ok(!(ALL_PERMISSIONS as readonly string[]).includes('reports.moderate'));
    assert.deepEqual([...NEW_PERMISSIONS], ['accounts.manage', 'notifications.recipient.manage', 'audit.view']);
  });
  it('operatorul nu are nicio permisiune nouă; drepturile exclusive nu sunt permisiuni', () => {
    for (const p of NEW_PERMISSIONS) assert.equal(hasPermission('primarie_operator', p), false);
    for (const x of SUPER_ADMIN_EXCLUSIVE) assert.ok(!(ALL_PERMISSIONS as readonly string[]).includes(x));
  });
  it('rol necunoscut → nicio permisiune; actsForCityHall numai operatorul', () => {
    assert.deepEqual(permissionsForRole('hacker'), []);
    assert.equal(actsForCityHall('primarie_operator'), true);
    assert.equal(actsForCityHall('super_admin'), false);
  });
});
