// Seed-urile (B1 §5.3, D10):
// - seed:config: categoriile de sesizări, setările implicite, rândul contorului TM; orice mediu; idempotent;
// - seed:demo: date demonstrative, toate cu is_demo = true; REFUZAT în producție (D10-4); idempotent
//   (ID-uri fixe în fișierele JSON).

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type mysql from 'mysql2/promise';
import type { AppEnv } from '../config.ts';
import { newId } from '../ids.ts';
import { allocateReportNumber } from './reportCounter.ts';

type Row = Record<string, unknown>;

function readJson<T>(dir: string, file: string): T {
  return JSON.parse(readFileSync(join(dir, file), 'utf8')) as T;
}

const toDate = (iso: string | null | undefined) => (iso ? new Date(iso) : null);

export type SeedResult = Record<string, number>;

export async function seedConfig(pool: mysql.Pool, seedsDir: string): Promise<SeedResult> {
  const dir = join(seedsDir, 'config');
  const categories = readJson<Row[]>(dir, 'report-categories.json');
  const settings = readJson<Array<{ key: string; value: unknown }>>(dir, 'settings.json');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const c of categories) {
      // categoriile sunt configurare din cod: la o nouă rulare se actualizează textele
      await conn.query(
        `INSERT INTO report_categories (id, name, description, icon_name, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description),
           icon_name = VALUES(icon_name), sort_order = VALUES(sort_order)`,
        [c.id, c.name, c.description, c.iconName, c.sortOrder, c.isActive],
      );
    }
    for (const s of settings) {
      // setările modificate de administrator nu se suprascriu
      // textul JSON se trimite ca șir (`CAST(? AS JSON)` există numai în MySQL; vezi `setSetting`)
      await conn.query(
        `INSERT INTO settings (\`key\`, \`value\`, updated_at, updated_by)
         VALUES (?, ?, UTC_TIMESTAMP(3), NULL)
         ON DUPLICATE KEY UPDATE \`key\` = \`key\``,
        [s.key, JSON.stringify(s.value)],
      );
    }
    // `last_value` este cuvânt rezervat în MySQL 8 → identificatorul se citează întotdeauna
    await conn.query(
      'INSERT INTO report_counter (`id`, `last_value`) VALUES (1, 0) ON DUPLICATE KEY UPDATE `id` = `id`',
    );
    await conn.commit();
    return { report_categories: categories.length, settings: settings.length, report_counter: 1 };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export class SeedRefusedError extends Error {}

/** D10-4: datele demo sunt refuzate în producție. Verificat înaintea oricărei alte operații (și a marcajelor). */
export function assertDemoAllowed(appEnv: AppEnv): void {
  if (appEnv === 'production') {
    throw new SeedRefusedError('seed:demo este refuzat în producție (D10-4).');
  }
}

export async function seedDemo(
  pool: mysql.Pool,
  seedsDir: string,
  appEnv: AppEnv,
  /** Directorul marcajelor (BACKUP_DIR): numerele TM date sesizărilor demo se notează și acolo. */
  backupDir?: string,
): Promise<SeedResult> {
  assertDemoAllowed(appEnv);
  const dir = join(seedsDir, 'demo');
  const announcements = readJson<Row[]>(dir, 'announcements.json');
  const directory = readJson<{ institution: Row; departments: Row[]; services: Row[]; links: Row[] }>(
    dir,
    'directory.json',
  );
  const quickdial = readJson<{ categories: Row[]; contacts: Row[] }>(dir, 'quickdial.json');
  const surveys = readJson<Array<Row & { questions: Array<Row & { options: Row[] }> }>>(
    dir,
    'surveys.json',
  );
  const now = new Date();
  const counts: SeedResult = {};
  const add = (k: string) => (counts[k] = (counts[k] ?? 0) + 1);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const ins = async (table: string, row: Row) => {
      const cols = Object.keys(row);
      const [res] = await conn.query(
        // ON DUPLICATE KEY (nu INSERT IGNORE): ignoră numai rândurile existente, nu și erorile de date / FK
        `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(', ')}) VALUES (${cols
          .map(() => '?')
          .join(', ')}) ON DUPLICATE KEY UPDATE \`${cols[0]}\` = \`${cols[0]}\``,
        cols.map((c) => row[c]),
      );
      // affectedRows: 1 = inserat, 0 = exista deja
      if ((res as { affectedRows: number }).affectedRows === 1) add(table);
    };

    for (const a of announcements) {
      await ins('announcements', {
        id: a.id, type: a.type, title: a.title, summary: a.summary, content: a.content,
        published_at: toDate(a.publishedAt as string), author: a.author, category: a.category,
        image_url: a.imageUrl, is_urgent: a.isUrgent, expires_at: toDate(a.expiresAt as string | null),
        status: a.status, event_date: a.eventDate, event_time: a.eventTime,
        event_location: a.eventLocation, event_organizer: a.eventOrganizer,
        is_demo: true, created_at: now, created_by: null, updated_at: now, updated_by: null,
      });
    }

    const inst = directory.institution;
    await ins('directory_institution', {
      id: 1, institution_name: inst.institutionName, short_name: inst.shortName, county: inst.county,
      address: inst.address, postal_code: inst.postalCode, primary_phone: inst.primaryPhone,
      secondary_phone: inst.secondaryPhone, fax: inst.fax, primary_email: inst.primaryEmail,
      registry_email: inst.registryEmail, website_url: inst.websiteUrl,
      schedule: JSON.stringify(inst.schedule), audience_schedule: JSON.stringify(inst.audienceSchedule),
      is_demo: true, verified_at: null, verified_source: null, updated_at: now, updated_by: null,
    });
    for (const d of directory.departments) {
      await ins('directory_departments', {
        id: d.id, name: d.name, description: d.description, location: d.location, phone: d.phone,
        email: d.email, schedule: d.schedule, head_of_department: d.headOfDepartment,
        is_active: d.isActive, sort_order: d.sortOrder, is_demo: true, created_at: now, updated_at: now,
      });
    }
    for (const s of directory.services) {
      await ins('directory_services', {
        id: s.id, department_id: s.departmentId, title: s.title, description: s.description,
        documents_required: s.documentsRequired === null ? null : JSON.stringify(s.documentsRequired),
        processing_time: s.processingTime, fee: s.fee, online_link: s.onlineLink,
        is_active: s.isActive, sort_order: s.sortOrder, is_demo: true, created_at: now, updated_at: now,
      });
    }
    for (const l of directory.links) {
      await ins('directory_links', {
        id: l.id, title: l.title, description: l.description, url: l.url, category: l.category,
        is_external: l.isExternal, is_active: l.isActive, sort_order: l.sortOrder, is_demo: true,
        created_at: now, updated_at: now,
      });
    }
    for (const c of quickdial.categories) {
      await ins('quickdial_categories', {
        id: c.id, name: c.name, description: c.description, sort_order: c.sortOrder,
        is_active: c.isActive, is_demo: true, created_at: now, updated_at: now,
      });
    }
    for (const c of quickdial.contacts) {
      await ins('quickdial_contacts', {
        id: c.id, category_id: c.categoryId, name: c.name, phone: c.phone,
        formatted_phone: c.formattedPhone, short_description: c.shortDescription,
        availability: c.availability, is_emergency: c.isEmergency, address: c.address,
        is_active: c.isActive, sort_order: c.sortOrder, is_demo: true, created_at: now, updated_at: now,
      });
    }
    for (const s of surveys) {
      await ins('surveys', {
        id: s.id, title: s.title, description: s.description, category: s.category,
        start_at: toDate(s.startAt as string), end_at: toDate(s.endAt as string), status: s.status,
        results_visibility: s.resultsVisibility, pow_enabled: s.powEnabled,
        is_demo: true, created_at: now, created_by: null, updated_at: now, updated_by: null,
      });
      for (const q of s.questions) {
        await ins('survey_questions', {
          id: q.id, survey_id: s.id, ordinal: q.ordinal, text: q.text, type: q.type,
          is_required: q.isRequired, help_text: q.helpText,
        });
        for (const o of q.options) {
          await ins('survey_options', { id: o.id, question_id: q.id, ordinal: o.ordinal, text: o.text });
        }
      }
      // P-4 (01.10.2026): un sondaj demo activ existent se prelungește (numai spre viitor), fără alte modificări
      await conn.query(
        "UPDATE surveys SET end_at = ?, updated_at = ? WHERE id = ? AND is_demo = TRUE AND status = 'active' AND end_at < ?",
        [toDate(s.endAt as string), now, s.id, toDate(s.endAt as string)],
      );
      // P-4: voturi demo (numai la un sondaj demo fără voturi), ca arhiva să arate rezultate; amprente
      // deterministe, fără legătură cu vreun cookie real
      const votes = (s as { demoVotes?: Array<{ optionId: string; count: number }> }).demoVotes;
      if (votes?.length) {
        const [[c]] = (await conn.query('SELECT COUNT(*) AS n FROM survey_submissions WHERE survey_id = ?', [s.id])) as unknown as [[{ n: number }]];
        if (Number(c.n) === 0) {
          const q0 = s.questions[0]!;
          let i = 0;
          for (const v of votes) {
            for (let k = 0; k < v.count; k++) {
              const sid = newId(now);
              await conn.query(
                'INSERT INTO survey_submissions (id, survey_id, participation_fingerprint, submitted_at, is_demo) VALUES (?, ?, ?, ?, TRUE)',
                [sid, s.id, createHash('sha256').update(`demo:${s.id}:${i++}`).digest('hex'), toDate(s.endAt as string)],
              );
              await conn.query('INSERT INTO survey_answers (submission_id, question_id, option_id, text_value) VALUES (?, ?, ?, NULL)', [sid, q0.id, v.optionId]);
              add('survey_submissions');
            }
          }
          await conn.query('UPDATE surveys SET first_submission_at = COALESCE(first_submission_at, ?) WHERE id = ?', [toDate(s.endAt as string), s.id]);
        }
      }
    }
    // Sesizările demo (Faza 5.4, decizia A din 30.09.2026): poziții reale, verificate de proprietar.
    // Retenția de 45 de zile li se aplică normal; după ștergere, seed:demo le recreează cu numere TM NOI
    // (D25–D26: un număr nu se refolosește). Fără autor, fără fotografii, fără transmitere.
    const reports = readJson<Row[]>(dir, 'reports.json');
    for (const r of reports) {
      const [exists] = await conn.query('SELECT id FROM reports WHERE id = ?', [r.id]);
      if ((exists as unknown[]).length > 0) continue;
      const next = await allocateReportNumber(conn, backupDir);
      await ins('reports', {
        id: r.id, author_account_id: null, reference_number: `TM-${String(next).padStart(3, '0')}`,
        category_id: r.categoryId, description: r.description, location_text: r.locationText,
        lat: Number(r.lat).toFixed(6), lng: Number(r.lng).toFixed(6), location_source: 'pin',
        location_approximate: false, resolution_status: 'new', is_demo: true, created_at: now, updated_at: now,
      });
    }
    await conn.commit();
    return counts;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
