import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getTableConfig } from 'drizzle-orm/mysql-core';
import { drizzleTables } from '../helpers/schema.ts';

// B1 §7: exact aceste 30 de tabele
const B1_TABLES = [
  'admin_users', 'admin_recovery_codes', 'sessions', 'audit_log', 'settings',
  'citizen_accounts', 'citizen_login_codes', 'citizen_blocks',
  'report_categories', 'report_counter', 'reports', 'report_assignees', 'report_photos', 'report_responses',
  'announcements', 'directory_institution', 'directory_departments', 'directory_services', 'directory_links',
  'quickdial_categories', 'quickdial_contacts',
  'surveys', 'survey_questions', 'survey_options', 'survey_submissions', 'survey_answers',
  'email_outbox', 'rate_limits', 'rejected_attempts', 'used_pow_challenges',
].sort();

describe('schema Drizzle (B1)', () => {
  it('conține exact cele 30 de tabele din B1 §7', () => {
    const names = drizzleTables().map((t) => getTableConfig(t).name).sort();
    assert.equal(names.length, 30);
    assert.deepEqual(names, B1_TABLES);
  });

  it('is_demo există pe entitățile de conținut (D10-3)', () => {
    const withDemo = drizzleTables()
      .filter((t) => getTableConfig(t).columns.some((c) => c.name === 'is_demo'))
      .map((t) => getTableConfig(t).name)
      .sort();
    assert.deepEqual(withDemo, [
      'announcements', 'citizen_accounts', 'directory_departments', 'directory_institution',
      'directory_links', 'directory_services', 'quickdial_categories', 'quickdial_contacts',
      'reports', 'survey_submissions', 'surveys',
    ]);
  });

  it('enumerările cheie respectă designul', () => {
    const col = (table: string, column: string) =>
      getTableConfig(drizzleTables().find((t) => getTableConfig(t).name === table)!).columns.find((c) => c.name === column) as unknown as { enumValues: string[] };
    assert.deepEqual(col('reports', 'resolution_status').enumValues, ['new', 'in_analysis', 'resolved']);
    assert.deepEqual(col('admin_users', 'role').enumValues, ['super_admin', 'primarie_operator']);
    assert.deepEqual(col('email_outbox', 'kind').enumValues, ['registry_notification', 'citizen_status_update', 'citizen_login_code', 'citizen_account_blocked']);
    assert.deepEqual(col('citizen_blocks', 'kind').enumValues, ['temporary', 'permanent']);
    assert.deepEqual(col('surveys', 'results_visibility').enumValues, ['live', 'after_close']);
  });
});
