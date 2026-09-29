// B1 §3.4: sondajele și voturile (D3/D4, N-4).

import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  mysqlEnum,
  mysqlTable,
  smallint,
  text,
  unique,
  varchar,
} from 'drizzle-orm/mysql-core';
import { adminUsers } from './admin.ts';
import { hash64, isDemo, ts, ulidId, ulidRef } from './_common.ts';

export const surveys = mysqlTable(
  'surveys',
  {
    id: ulidId().primaryKey(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description').notNull(),
    category: varchar('category', { length: 64 }),
    startAt: ts('start_at').notNull(),
    endAt: ts('end_at').notNull(),
    status: mysqlEnum('status', ['draft', 'active', 'closed']).notNull().default('draft'),
    resultsVisibility: mysqlEnum('results_visibility', ['live', 'after_close'])
      .notNull()
      .default('after_close'),
    powEnabled: boolean('pow_enabled').notNull().default(false),
    integrityFlag: boolean('integrity_flag').notNull().default(false),
    integrityNote: varchar('integrity_note', { length: 500 }),
    // blocarea structurii după primul vot (D3/D4)
    firstSubmissionAt: ts('first_submission_at'),
    isDemo: isDemo(),
    createdAt: ts('created_at').notNull(),
    createdBy: ulidRef('created_by').references(() => adminUsers.id),
    updatedAt: ts('updated_at').notNull(),
    updatedBy: ulidRef('updated_by').references(() => adminUsers.id),
  },
  (t) => [
    index('idx_surveys_status_end').on(t.status, t.endAt),
    check('chk_surveys_period', sql`${t.endAt} > ${t.startAt}`),
  ],
);

export const surveyQuestions = mysqlTable(
  'survey_questions',
  {
    id: ulidId().primaryKey(),
    surveyId: ulidRef('survey_id')
      .notNull()
      .references(() => surveys.id, { onDelete: 'cascade' }),
    ordinal: smallint('ordinal', { unsigned: true }).notNull(),
    text: varchar('text', { length: 500 }).notNull(),
    type: mysqlEnum('type', ['single_choice', 'multiple_choice', 'free_text']).notNull(),
    isRequired: boolean('is_required').notNull().default(false),
    helpText: varchar('help_text', { length: 500 }),
  },
  (t) => [unique('uq_survey_questions_survey_ordinal').on(t.surveyId, t.ordinal)],
);

export const surveyOptions = mysqlTable(
  'survey_options',
  {
    id: ulidId().primaryKey(),
    questionId: ulidRef('question_id')
      .notNull()
      .references(() => surveyQuestions.id, { onDelete: 'cascade' }),
    ordinal: smallint('ordinal', { unsigned: true }).notNull(),
    text: varchar('text', { length: 300 }).notNull(),
  },
  (t) => [unique('uq_survey_options_question_ordinal').on(t.questionId, t.ordinal)],
);

export const surveySubmissions = mysqlTable(
  'survey_submissions',
  {
    id: ulidId().primaryKey(),
    // RESTRICT: un sondaj cu voturi nu se șterge (D3/D4)
    surveyId: ulidRef('survey_id')
      .notNull()
      .references(() => surveys.id, { onDelete: 'restrict' }),
    participationFingerprint: hash64('participation_fingerprint').notNull(),
    submittedAt: ts('submitted_at').notNull(),
    isDemo: isDemo(),
  },
  (t) => [
    // garanția „un vot per jeton per sondaj” (N4-3)
    unique('uq_survey_submissions_fingerprint').on(t.surveyId, t.participationFingerprint),
  ],
);

export const surveyAnswers = mysqlTable(
  'survey_answers',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    submissionId: ulidRef('submission_id')
      .notNull()
      .references(() => surveySubmissions.id, { onDelete: 'restrict' }),
    questionId: ulidRef('question_id')
      .notNull()
      .references(() => surveyQuestions.id, { onDelete: 'restrict' }),
    optionId: ulidRef('option_id').references(() => surveyOptions.id, { onDelete: 'restrict' }),
    // numai pentru free_text; retenție 6 luni de la închiderea sondajului (A05-2, A06-1)
    textValue: text('text_value'),
  },
  (t) => [
    index('idx_survey_answers_question_option').on(t.questionId, t.optionId),
    index('idx_survey_answers_submission').on(t.submissionId),
  ],
);
