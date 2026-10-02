// Schemele Zod pentru sondaje (Faza 5.6): API public (B2 §3) și Admin (B2 §6.4).
// D3: vizibilitatea rezultatelor per sondaj; arhiva publică; răspunsurile libere nu sunt niciodată publice.
// N-4: votul fără cont; unicitatea per sondaj pe server (cookie de participare + HMAC); N4-1: consultare orientativă.
// Corpurile cererilor sunt `strict` (B2 §1).

import { z } from 'zod';
import { idSchema } from './content.ts';

export const SURVEY_STATUSES = ['draft', 'active', 'closed'] as const;
export const SURVEY_QUESTION_TYPES = ['single_choice', 'multiple_choice', 'free_text'] as const;
export const SURVEY_RESULTS_VISIBILITY = ['live', 'after_close'] as const;
export type SurveyStatus = (typeof SURVEY_STATUSES)[number];
export type SurveyQuestionType = (typeof SURVEY_QUESTION_TYPES)[number];
export type SurveyResultsVisibility = (typeof SURVEY_RESULTS_VISIBILITY)[number];

/** Limitele textelor (B1 §3.4; textul liber: 2000, propunere B1, DN-15). */
export const SURVEY_LIMITS = {
  title: 200,
  description: 5000,
  category: 64,
  question: 500,
  helpText: 500,
  option: 300,
  freeText: 2000,
  integrityNote: 500,
  maxQuestions: 30,
  maxOptions: 20,
} as const;

/** B7, P-7 (01.10.2026): timpul minim de completare a formularului de vot; interfața așteaptă atât înainte de trimitere. */
export const SURVEY_MIN_FORM_SECONDS = 6;

/** N4-1 (textul aprobat de proprietar la 01.10.2026, P-3). */
export const SURVEY_ADVISORY_TEXT =
  'Consultare orientativă: rezultatele arată opinia celor care au participat. Platforma limitează votul repetat, dar nu poate garanta că fiecare persoană votează o singură dată.';

const isoDateTime = z.iso.datetime({ offset: true });
const text = (max: number) => z.string().trim().min(1).max(max);

// ——— public ———

export const publicSurveyListQuery = z.object({
  state: z.enum(['open', 'closed']).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().max(200).optional(),
});

export type PublicSurveyOption = { id: string; ordinal: number; text: string };
export type PublicSurveyQuestion = {
  id: string;
  ordinal: number;
  text: string;
  type: SurveyQuestionType;
  isRequired: boolean;
  helpText: string | null;
  options: PublicSurveyOption[];
};

/** Elementul listei: „deschis” / „închis” se calculează pe server (`start_at ≤ acum < end_at`, E-3). */
export type PublicSurveySummary = {
  id: string;
  title: string;
  description: string;
  category: string | null;
  startAt: string;
  endAt: string;
  state: 'open' | 'closed' | 'upcoming';
  resultsVisibility: SurveyResultsVisibility;
  /** D3: rezultatele se pot vedea acum (`live`, sau `after_close` după închidere). */
  resultsAvailable: boolean;
  questionCount: number;
  powEnabled: boolean;
  /** P-2 (01.10.2026): marcajul se afișează public numai în arhivă (sondaje închise). */
  integrityFlag: boolean;
  integrityNote: string | null;
  isDemo: boolean;
};

export type PublicSurveyDetail = PublicSurveySummary & {
  questions: PublicSurveyQuestion[];
  /** B7: jetonul semnat „timp minim”, trimis înapoi la vot. */
  formStartedAt: string;
};

export type PublicSurveyList = { items: PublicSurveySummary[]; nextCursor: string | null };

export const surveyAnswerSchema = z.strictObject({
  questionId: idSchema,
  value: z.union([z.string().max(SURVEY_LIMITS.freeText * 2), z.array(idSchema).max(SURVEY_LIMITS.maxOptions)]),
});

export const surveySubmissionRequest = z.strictObject({
  answers: z.array(surveyAnswerSchema).max(SURVEY_LIMITS.maxQuestions),
  /** capcana B7: trebuie să rămână goală */
  hp: z.string().max(200),
  formStartedAt: z.string().min(1).max(200),
  pow: z.string().max(20_000).optional(),
});
export type SurveySubmissionRequest = z.infer<typeof surveySubmissionRequest>;

export type SurveyOptionResult = { optionId: string; text: string; count: number; percentage: number };
export type SurveyQuestionResult = {
  questionId: string;
  text: string;
  type: SurveyQuestionType;
  /** câți participanți au răspuns la întrebare (baza procentelor, T-8) */
  respondents: number;
  options: SurveyOptionResult[];
  /** numai numărul răspunsurilor libere; textul nu este niciodată public (D3, N4-9) */
  freeTextCount: number;
};
export type SurveyResults = {
  surveyId: string;
  closed: boolean;
  totalSubmissions: number;
  questions: SurveyQuestionResult[];
};

// ——— Admin ———

const optionInput = z.strictObject({ id: idSchema.optional(), text: text(SURVEY_LIMITS.option) });
const questionInput = z.strictObject({
  id: idSchema.optional(),
  text: text(SURVEY_LIMITS.question),
  type: z.enum(SURVEY_QUESTION_TYPES),
  isRequired: z.boolean(),
  helpText: z.string().trim().max(SURVEY_LIMITS.helpText).nullable().optional(),
  options: z.array(optionInput).max(SURVEY_LIMITS.maxOptions),
});

const surveyFields = {
  title: z.string().trim().min(5).max(SURVEY_LIMITS.title),
  description: z.string().trim().min(10).max(SURVEY_LIMITS.description),
  category: z.string().trim().max(SURVEY_LIMITS.category).nullable().optional(),
  startAt: isoDateTime,
  endAt: isoDateTime,
  resultsVisibility: z.enum(SURVEY_RESULTS_VISIBILITY),
  questions: z.array(questionInput).min(1).max(SURVEY_LIMITS.maxQuestions),
};

/** Structura: întrebările cu alegere au cel puțin 2 opțiuni; textul liber nu are opțiuni; perioada validă. */
const structureRefine = (v: { startAt: string; endAt: string; questions: Array<{ type: string; options: unknown[] }> }, ctx: z.RefinementCtx) => {
  if (new Date(v.endAt).getTime() <= new Date(v.startAt).getTime()) {
    ctx.addIssue({ code: 'custom', path: ['endAt'], message: 'închiderea trebuie să fie după deschidere' });
  }
  v.questions.forEach((q, i) => {
    if (q.type === 'free_text' && q.options.length > 0) {
      ctx.addIssue({ code: 'custom', path: ['questions', i, 'options'], message: 'textul liber nu are opțiuni' });
    }
    if (q.type !== 'free_text' && q.options.length < 2) {
      ctx.addIssue({ code: 'custom', path: ['questions', i, 'options'], message: 'cel puțin 2 opțiuni' });
    }
  });
};

export const adminSurveyCreateRequest = z
  .strictObject({ ...surveyFields, status: z.enum(['draft', 'active']).optional() })
  .superRefine(structureRefine);
export const adminSurveyUpdateRequest = z.strictObject(surveyFields).superRefine(structureRefine);
export type AdminSurveyInput = z.infer<typeof adminSurveyUpdateRequest>;

export const adminSurveyStatusRequest = z.strictObject({ status: z.enum(SURVEY_STATUSES) });
export const adminSurveyIntegrityRequest = z.strictObject({
  flag: z.boolean(),
  note: z.string().trim().max(SURVEY_LIMITS.integrityNote).nullable().optional(),
});
export const adminSurveyPowRequest = z.strictObject({ enabled: z.boolean() });
export const adminSurveyListQuery = z.object({ status: z.enum(SURVEY_STATUSES).optional() });

export type AdminSurvey = {
  id: string;
  title: string;
  description: string;
  category: string | null;
  startAt: string;
  endAt: string;
  status: SurveyStatus;
  /** starea efectivă (E-3): un sondaj `active` după `end_at` este deja închis */
  effectiveState: 'draft' | 'upcoming' | 'open' | 'closed';
  resultsVisibility: SurveyResultsVisibility;
  powEnabled: boolean;
  integrityFlag: boolean;
  integrityNote: string | null;
  submissionsCount: number;
  /** structura blocată după primul vot (integritate, T-4) */
  locked: boolean;
  firstSubmissionAt: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  questions: PublicSurveyQuestion[];
};

export type AdminSurveyFreeText = { questionId: string; text: string; answers: string[] };
export type AdminSurveyRejection = { hour: string; reason: string; count: number };
export type AdminDashboard = {
  reports: { total: number; new: number; inAnalysis: number; resolved: number; withoutPosition: number; emailFailed: number };
  surveys: { draft: number; open: number; closed: number; submissions: number };
};
