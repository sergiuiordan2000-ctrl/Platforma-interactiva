// Sondajele pe server (Faza 5.6, plan FAZA_5_6_PLAN.md): starea efectivă (E-3), participarea anonimă (N-4),
// votul, rezultatele (D3), structura și blocarea ei după primul vot (integritate, T-4), retenția textelor libere.

import { createHmac, randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type mysql from 'mysql2/promise';
import type {
  AdminSurvey,
  AdminSurveyInput,
  PublicSurveyQuestion,
  PublicSurveySummary,
  SurveyQuestionResult,
  SurveyResults,
  SurveyResultsVisibility,
  SurveyStatus,
} from '@tmc/shared';
import { SURVEY_LIMITS } from '@tmc/shared';
import type { AppContext } from './context.ts';
import { newId } from './ids.ts';

type Conn = mysql.Pool | mysql.PoolConnection;


/** D-B3 (13.10.2026): ALTCHA este obligatoriu la votul în orice sondaj (coloana `pow_enabled` nu mai are efect). */
export const SURVEY_POW_REQUIRED = true;

export interface SurveyRow {
  id: string;
  title: string;
  description: string;
  category: string | null;
  start_at: Date;
  end_at: Date;
  status: SurveyStatus;
  results_visibility: SurveyResultsVisibility;
  pow_enabled: number | boolean;
  integrity_flag: number | boolean;
  integrity_note: string | null;
  first_submission_at: Date | null;
  is_demo: number | boolean;
  created_at: Date;
  updated_at: Date;
}

export type EffectiveState = 'draft' | 'upcoming' | 'open' | 'closed';

/** E-3 / P-11: starea calculată la fiecare cerere; un sondaj `active` după `end_at` este închis. */
export function effectiveState(s: Pick<SurveyRow, 'status' | 'start_at' | 'end_at'>, now: Date): EffectiveState {
  if (s.status === 'draft') return 'draft';
  if (s.status === 'closed') return 'closed';
  if (now.getTime() >= s.end_at.getTime()) return 'closed';
  if (now.getTime() < s.start_at.getTime()) return 'upcoming';
  return 'open';
}

/** D3: rezultatele publice: `live` → oricând după deschidere; `after_close` → numai după închidere. */
export function resultsAvailable(s: SurveyRow, now: Date): boolean {
  const st = effectiveState(s, now);
  if (st === 'closed') return true;
  return st === 'open' && s.results_visibility === 'live';
}

export async function getSurveyRow(conn: Conn, id: string, lock = false): Promise<SurveyRow | undefined> {
  const [rows] = await conn.query(`SELECT * FROM surveys WHERE id = ?${lock ? ' FOR UPDATE' : ''}`, [id]);
  return (rows as SurveyRow[])[0];
}

export async function loadQuestions(conn: Conn, surveyIds: string[]): Promise<Map<string, PublicSurveyQuestion[]>> {
  const out = new Map<string, PublicSurveyQuestion[]>();
  if (surveyIds.length === 0) return out;
  const [qs] = await conn.query(
    'SELECT id, survey_id, ordinal, text, type, is_required, help_text FROM survey_questions WHERE survey_id IN (?) ORDER BY survey_id, ordinal',
    [surveyIds],
  );
  const questions = qs as Array<{ id: string; survey_id: string; ordinal: number; text: string; type: PublicSurveyQuestion['type']; is_required: number; help_text: string | null }>;
  const qIds = questions.map((q) => q.id);
  const opts = new Map<string, PublicSurveyQuestion['options']>();
  if (qIds.length) {
    const [os] = await conn.query('SELECT id, question_id, ordinal, text FROM survey_options WHERE question_id IN (?) ORDER BY question_id, ordinal', [qIds]);
    for (const o of os as Array<{ id: string; question_id: string; ordinal: number; text: string }>) {
      const list = opts.get(o.question_id) ?? [];
      list.push({ id: o.id, ordinal: o.ordinal, text: o.text });
      opts.set(o.question_id, list);
    }
  }
  for (const q of questions) {
    const list = out.get(q.survey_id) ?? [];
    list.push({ id: q.id, ordinal: q.ordinal, text: q.text, type: q.type, isRequired: !!q.is_required, helpText: q.help_text, options: opts.get(q.id) ?? [] });
    out.set(q.survey_id, list);
  }
  return out;
}

export function toPublicSummary(s: SurveyRow, questionCount: number, now: Date): PublicSurveySummary {
  const st = effectiveState(s, now);
  const closed = st === 'closed';
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    category: s.category,
    startAt: s.start_at.toISOString(),
    endAt: s.end_at.toISOString(),
    state: closed ? 'closed' : st === 'upcoming' ? 'upcoming' : 'open',
    resultsVisibility: s.results_visibility,
    resultsAvailable: resultsAvailable(s, now),
    questionCount,
    powEnabled: SURVEY_POW_REQUIRED || !!s.pow_enabled,
    // P-2 (01.10.2026): public numai în arhivă
    integrityFlag: closed && !!s.integrity_flag,
    integrityNote: closed && s.integrity_flag ? s.integrity_note : null,
    isDemo: !!s.is_demo,
  };
}

// ——— participarea anonimă (N4-3, N4-7, B7 §2) ———

export const PARTICIPATION_COOKIE_DAYS = 365;
export const participationCookieName = (ctx: AppContext) =>
  ctx.config.appEnv === 'development' ? 'civic_pid' : '__Host-civic_pid';
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export function participationToken(ctx: AppContext, request: FastifyRequest): string | null {
  const t = request.cookies?.[participationCookieName(ctx)];
  return t && TOKEN_RE.test(t) ? t : null;
}

/** Emite cookie-ul de participare dacă lipsește (B2 §3: la listă și la detaliu). Jetonul nu se salvează nicăieri. */
export function ensureParticipationCookie(ctx: AppContext, request: FastifyRequest, reply: FastifyReply): void {
  if (participationToken(ctx, request)) return;
  reply.setCookie(participationCookieName(ctx), randomBytes(32).toString('base64url'), {
    path: '/',
    httpOnly: true,
    secure: ctx.config.appEnv !== 'development',
    sameSite: 'strict',
    maxAge: PARTICIPATION_COOKIE_DAYS * 86_400,
  });
}

/** N4-7: amprenta per sondaj (fără corelare între sondaje); fără IP, fără identitate. */
export function participationFingerprint(ctx: AppContext, token: string, surveyId: string): string {
  return createHmac('sha256', ctx.config.secrets.participationHmac).update(`${token}:${surveyId}`).digest('hex');
}

// ——— votul ———

export type AnswerInput = { questionId: string; value: string | string[] };
export type ValidatedAnswer = { questionId: string; optionIds: string[]; text: string | null };

/** Validarea răspunsurilor față de structură (B2 §3). `null` + câmpurile greșite dacă nu sunt valide. */
export function validateAnswers(
  questions: PublicSurveyQuestion[],
  answers: AnswerInput[],
): { ok: true; answers: ValidatedAnswer[] } | { ok: false; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  const byId = new Map(questions.map((q) => [q.id, q]));
  const seen = new Set<string>();
  const out: ValidatedAnswer[] = [];
  for (const a of answers) {
    const q = byId.get(a.questionId);
    if (!q) { fields[a.questionId] = 'întrebare necunoscută'; continue; }
    if (seen.has(a.questionId)) { fields[a.questionId] = 'răspuns dublat'; continue; }
    seen.add(a.questionId);
    const valid = new Set(q.options.map((o) => o.id));
    if (q.type === 'free_text') {
      if (typeof a.value !== 'string') { fields[q.id] = 'text așteptat'; continue; }
      const t = a.value.trim();
      if (t.length > SURVEY_LIMITS.freeText) { fields[q.id] = `cel mult ${SURVEY_LIMITS.freeText} de caractere`; continue; }
      if (t) out.push({ questionId: q.id, optionIds: [], text: t });
      continue;
    }
    const ids = typeof a.value === 'string' ? (a.value ? [a.value] : []) : a.value;
    if (new Set(ids).size !== ids.length || ids.some((id) => !valid.has(id))) { fields[q.id] = 'opțiune invalidă'; continue; }
    if (q.type === 'single_choice' && ids.length > 1) { fields[q.id] = 'o singură opțiune'; continue; }
    if (ids.length) out.push({ questionId: q.id, optionIds: ids, text: null });
  }
  for (const q of questions) {
    if (q.isRequired && !out.some((a) => a.questionId === q.id) && !fields[q.id]) fields[q.id] = 'răspuns obligatoriu';
  }
  return Object.keys(fields).length ? { ok: false, fields } : { ok: true, answers: out };
}

export class DuplicateVoteError extends Error {}
export class SurveyClosedError extends Error {}

/** Înregistrează votul (tranzacție). `DuplicateVoteError` dacă amprenta există deja (UNIQUE, N4-3). */
export async function recordSubmission(
  ctx: AppContext,
  surveyId: string,
  fingerprint: string,
  answers: ValidatedAnswer[],
  isDemo = false,
): Promise<void> {
  const now = ctx.now();
  const conn = await ctx.pool.getConnection();
  try {
    await conn.beginTransaction();
    // blocarea rândului: serializează primul vot cu editarea structurii în Admin; starea se verifică din nou
    const s = await getSurveyRow(conn, surveyId, true);
    if (!s || effectiveState(s, now) !== 'open') throw new SurveyClosedError();
    const id = newId(now);
    try {
      await conn.query(
        'INSERT INTO survey_submissions (id, survey_id, participation_fingerprint, submitted_at, is_demo) VALUES (?, ?, ?, ?, ?)',
        [id, surveyId, fingerprint, now, isDemo],
      );
    } catch (err) {
      if ((err as { code?: string }).code === 'ER_DUP_ENTRY') throw new DuplicateVoteError();
      throw err;
    }
    for (const a of answers) {
      if (a.text !== null) {
        await conn.query('INSERT INTO survey_answers (submission_id, question_id, option_id, text_value) VALUES (?, ?, NULL, ?)', [id, a.questionId, a.text]);
      }
      for (const opt of a.optionIds) {
        await conn.query('INSERT INTO survey_answers (submission_id, question_id, option_id, text_value) VALUES (?, ?, ?, NULL)', [id, a.questionId, opt]);
      }
    }
    // integritate: blocarea structurii la primul vot
    await conn.query('UPDATE surveys SET first_submission_at = COALESCE(first_submission_at, ?) WHERE id = ?', [now, surveyId]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ——— rezultatele (T-8) ———

export async function computeResults(conn: Conn, s: SurveyRow, now: Date): Promise<SurveyResults> {
  const questions = (await loadQuestions(conn, [s.id])).get(s.id) ?? [];
  const [[tot]] = (await conn.query('SELECT COUNT(*) AS n FROM survey_submissions WHERE survey_id = ?', [s.id])) as unknown as [[{ n: number }]];
  const [resp] = await conn.query(
    `SELECT a.question_id AS q, COUNT(DISTINCT a.submission_id) AS n FROM survey_answers a
       JOIN survey_submissions s ON s.id = a.submission_id WHERE s.survey_id = ? GROUP BY a.question_id`,
    [s.id],
  );
  const [cnt] = await conn.query(
    `SELECT a.option_id AS o, COUNT(*) AS n FROM survey_answers a JOIN survey_submissions s ON s.id = a.submission_id
      WHERE s.survey_id = ? AND a.option_id IS NOT NULL GROUP BY a.option_id`,
    [s.id],
  );
  // numărul răspunsurilor libere rămâne și după golirea textului la retenție (T-7)
  const [ft] = await conn.query(
    `SELECT a.question_id AS q, COUNT(*) AS n FROM survey_answers a JOIN survey_submissions s ON s.id = a.submission_id
      WHERE s.survey_id = ? AND a.option_id IS NULL GROUP BY a.question_id`,
    [s.id],
  );
  const respondents = new Map((resp as Array<{ q: string; n: number }>).map((r) => [r.q, Number(r.n)]));
  const counts = new Map((cnt as Array<{ o: string; n: number }>).map((r) => [r.o, Number(r.n)]));
  const free = new Map((ft as Array<{ q: string; n: number }>).map((r) => [r.q, Number(r.n)]));
  const out: SurveyQuestionResult[] = questions.map((q) => {
    const base = respondents.get(q.id) ?? 0;
    return {
      questionId: q.id,
      text: q.text,
      type: q.type,
      respondents: base,
      options: q.options.map((o) => {
        const n = counts.get(o.id) ?? 0;
        return { optionId: o.id, text: o.text, count: n, percentage: base ? Math.round((n / base) * 1000) / 10 : 0 };
      }),
      freeTextCount: q.type === 'free_text' ? (free.get(q.id) ?? 0) : 0,
    };
  });
  return { surveyId: s.id, closed: effectiveState(s, now) === 'closed', totalSubmissions: Number(tot.n), questions: out };
}

// ——— Admin ———

export async function submissionCounts(conn: Conn, ids: string[]): Promise<Map<string, number>> {
  if (!ids.length) return new Map();
  const [rows] = await conn.query('SELECT survey_id AS s, COUNT(*) AS n FROM survey_submissions WHERE survey_id IN (?) GROUP BY survey_id', [ids]);
  return new Map((rows as Array<{ s: string; n: number }>).map((r) => [r.s, Number(r.n)]));
}

export function toAdminSurvey(s: SurveyRow, questions: PublicSurveyQuestion[], submissions: number, now: Date): AdminSurvey {
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    category: s.category,
    startAt: s.start_at.toISOString(),
    endAt: s.end_at.toISOString(),
    status: s.status,
    effectiveState: effectiveState(s, now),
    resultsVisibility: s.results_visibility,
    powEnabled: SURVEY_POW_REQUIRED || !!s.pow_enabled,
    integrityFlag: !!s.integrity_flag,
    integrityNote: s.integrity_note,
    submissionsCount: submissions,
    locked: s.first_submission_at !== null,
    firstSubmissionAt: s.first_submission_at ? s.first_submission_at.toISOString() : null,
    isDemo: !!s.is_demo,
    createdAt: s.created_at.toISOString(),
    updatedAt: s.updated_at.toISOString(),
    questions,
  };
}

/** Înlocuiește întrebările și opțiunile (numai fără voturi). */
export async function writeStructure(conn: Conn, surveyId: string, input: AdminSurveyInput, now: Date): Promise<void> {
  await conn.query('DELETE FROM survey_questions WHERE survey_id = ?', [surveyId]);
  let qi = 0;
  for (const q of input.questions) {
    const qid = newId(now);
    await conn.query(
      'INSERT INTO survey_questions (id, survey_id, ordinal, text, type, is_required, help_text) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [qid, surveyId, ++qi, q.text, q.type, q.isRequired, q.helpText ?? null],
    );
    let oi = 0;
    for (const o of q.options) {
      await conn.query('INSERT INTO survey_options (id, question_id, ordinal, text) VALUES (?, ?, ?, ?)', [newId(now), qid, ++oi, o.text]);
    }
  }
}

/**
 * T-4: după primul vot, structura (întrebări, opțiuni, tip, obligativitate, ordine), `start_at` și
 * `results_visibility` (P-6) rămân neschimbate; se pot modifica titlul, descrierea, categoria,
 * textele de ajutor și `end_at`. Întoarce câmpul care încalcă blocarea, sau `null`.
 */
export function lockedViolation(s: SurveyRow, current: PublicSurveyQuestion[], input: AdminSurveyInput): string | null {
  if (new Date(input.startAt).getTime() !== s.start_at.getTime()) return 'startAt';
  if (input.resultsVisibility !== s.results_visibility) return 'resultsVisibility';
  if (input.questions.length !== current.length) return 'questions';
  for (let i = 0; i < current.length; i++) {
    const a = current[i]!;
    const b = input.questions[i]!;
    if (b.id !== a.id || b.text !== a.text || b.type !== a.type || b.isRequired !== a.isRequired) return `questions.${i}`;
    if (b.options.length !== a.options.length) return `questions.${i}.options`;
    for (let j = 0; j < a.options.length; j++) {
      if (b.options[j]!.id !== a.options[j]!.id || b.options[j]!.text !== a.options[j]!.text) return `questions.${i}.options.${j}`;
    }
  }
  return null;
}

/** Textele de ajutor (permise după primul vot). */
export async function updateHelpTexts(conn: Conn, input: AdminSurveyInput): Promise<void> {
  for (const q of input.questions) {
    if (q.id) await conn.query('UPDATE survey_questions SET help_text = ? WHERE id = ?', [q.helpText ?? null, q.id]);
  }
}

// ——— întreținere ———

/** E-3: cron `surveys:close-expired`: starea `closed` salvată pentru sondajele `active` cu `end_at` trecut. */
export async function closeExpiredSurveys(ctx: AppContext): Promise<string[]> {
  const now = ctx.now();
  const [rows] = await ctx.pool.query("SELECT id FROM surveys WHERE status = 'active' AND end_at <= ?", [now]);
  const ids = (rows as Array<{ id: string }>).map((r) => r.id);
  if (ids.length) await ctx.pool.query("UPDATE surveys SET status = 'closed', updated_at = ? WHERE id IN (?) AND status = 'active'", [now, ids]);
  return ids;
}

/** A05-2 / A06-1, T-7: textele libere golite la ADMIN_RETENTION_MONTHS (6) de la închidere (`end_at`, T-1). */
export async function purgeSurveyFreeTexts(ctx: AppContext): Promise<number> {
  const cutoff = new Date(ctx.now());
  cutoff.setUTCMonth(cutoff.getUTCMonth() - ctx.config.adminRetentionMonths);
  const [res] = await ctx.pool.query(
    `UPDATE survey_answers a JOIN survey_submissions s ON s.id = a.submission_id JOIN surveys v ON v.id = s.survey_id
        SET a.text_value = NULL
      WHERE a.text_value IS NOT NULL AND v.end_at < ? AND (v.status = 'closed' OR v.status = 'active')`,
    [cutoff],
  );
  return (res as { affectedRows: number }).affectedRows;
}

/** T-6: există sondaje deschise sau programate (cheia de participare nu se rotește atunci). */
export async function hasOpenSurveys(conn: Conn, now: Date): Promise<boolean> {
  const [rows] = await conn.query("SELECT COUNT(*) AS n FROM surveys WHERE status = 'active' AND end_at > ?", [now]);
  return Number((rows as Array<{ n: number }>)[0]!.n) > 0;
}
