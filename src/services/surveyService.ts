/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Sondajele (Faza 5.6): client al API-ului (B2 §3, §6.4). Sursa datelor este serverul; în `localStorage`
 * rămâne numai indiciul „Ai participat deja”, pentru experiența utilizatorului (N4-12). Unicitatea votului
 * o asigură serverul (409), nu browserul. D4: „Reset Demo” nu mai există. Cheile vechi din `localStorage`
 * nu se mai citesc și nu se mai scriu (T-9); ștergerea lor se face la 5.7.
 */

import {
  SURVEY_LIMITS,
  SURVEY_MIN_FORM_SECONDS,
  type AdminSurvey,
  type AdminSurveyFreeText,
  type AdminSurveyInput,
  type PowChallenge,
  type PublicSurveyDetail,
  type PublicSurveyList,
  type PublicSurveyQuestion,
  type PublicSurveySummary,
  type SurveyResults,
  type SurveyStatus,
} from '@tmc/shared';
import { api, ApiError } from './apiClient';
import { solvePow } from './powSolver';

export type {
  AdminSurvey,
  AdminSurveyFreeText,
  AdminSurveyInput,
  PublicSurveyDetail,
  PublicSurveyQuestion,
  PublicSurveySummary,
  SurveyQuestionResult,
  SurveyQuestionType,
  SurveyResults,
  SurveyResultsVisibility,
  SurveyStatus,
} from '@tmc/shared';
export { SURVEY_ADVISORY_TEXT, SURVEY_LIMITS } from '@tmc/shared';

/** Răspunsurile din formular: opțiunea aleasă (alegere unică), lista de opțiuni (alegere multiplă) sau textul. */
export type SurveyAnswers = Record<string, string | string[]>;

export type VoteResult =
  | { success: true }
  | { success: false; status: number; code: string; error: string; fields?: Record<string, string> };

/** Indiciul de interfață „Ai participat deja” (N4-12): o listă de ID-uri de sondaje, fără alte date. */
const PARTICIPATION_HINT_KEY = 'tmc_survey_participation_hint';

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Mesajul afișat pentru un răspuns greșit, după tipul întrebării (validare în browser și pe server). */
function requiredMessage(q: PublicSurveyQuestion): string {
  if (q.type === 'single_choice') return 'Vă rugăm să selectați o opțiune (răspuns obligatoriu).';
  if (q.type === 'multiple_choice') return 'Vă rugăm să selectați cel puțin o opțiune (răspuns obligatoriu).';
  return 'Vă rugăm să introduceți un răspuns (câmp obligatoriu).';
}

class SurveyService {
  // ——— public (fără cont, N4-2) ———

  /** Consultările deschise acum (starea se calculează pe server, E-3). */
  async listOpen(): Promise<PublicSurveySummary[]> {
    return (await api.get<PublicSurveyList>('/public/surveys?state=open')).items;
  }

  /** Arhiva consultărilor încheiate (D3), paginată. */
  listArchive(cursor?: string): Promise<PublicSurveyList> {
    return api.get<PublicSurveyList>(`/public/surveys?state=closed${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
  }

  /** Structura sondajului + jetonul „timp minim” al formularului (B7). */
  getDetail(id: string): Promise<PublicSurveyDetail> {
    return api.get<PublicSurveyDetail>(`/public/surveys/${encodeURIComponent(id)}`);
  }

  /** Rezultatele publice, după D3 (403 `RESULTS_NOT_AVAILABLE` înainte de închidere, la `after_close`). */
  getResults(id: string): Promise<SurveyResults> {
    return api.get<SurveyResults>(`/public/surveys/${encodeURIComponent(id)}/results`);
  }

  /**
   * Verificarea răspunsurilor în browser, înainte de trimitere (aceleași reguli ca pe server, care
   * rămâne sursa adevărului): întrebările obligatorii, opțiunile valide, lungimea textului liber.
   */
  validateAnswers(questions: PublicSurveyQuestion[], answers: SurveyAnswers): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    for (const q of questions) {
      const val = answers[q.id];
      const valid = new Set(q.options.map((o) => o.id));
      if (q.type === 'free_text') {
        const t = typeof val === 'string' ? val.trim() : '';
        if (q.isRequired && !t) errors[q.id] = requiredMessage(q);
        else if (t.length > SURVEY_LIMITS.freeText) errors[q.id] = `Răspunsul poate avea cel mult ${SURVEY_LIMITS.freeText} de caractere.`;
        continue;
      }
      const ids = Array.isArray(val) ? val : typeof val === 'string' && val ? [val] : [];
      if (q.isRequired && ids.length === 0) errors[q.id] = requiredMessage(q);
      else if (ids.some((id) => !valid.has(id))) errors[q.id] = 'Opțiunea selectată este invalidă.';
      else if (q.type === 'single_choice' && ids.length > 1) errors[q.id] = 'Se poate alege o singură opțiune.';
    }
    return { isValid: Object.keys(errors).length === 0, errors };
  }

  /** Mesajele serverului pe întrebare (422) → mesajele formularului. */
  fieldMessages(questions: PublicSurveyQuestion[], fields: Record<string, string>): Record<string, string> {
    const byId = new Map(questions.map((q) => [q.id, q]));
    const out: Record<string, string> = {};
    for (const [id, reason] of Object.entries(fields)) {
      const q = byId.get(id);
      if (!q) continue;
      out[id] = reason === 'răspuns obligatoriu' ? requiredMessage(q) : 'Răspunsul la această întrebare nu este valid.';
    }
    return out;
  }

  /**
   * Trimiterea votului (B2 §3). `formLoadedAt` = momentul în care formularul a fost primit de la server:
   * dacă au trecut mai puțin de `SURVEY_MIN_FORM_SECONDS`, trimiterea așteaptă diferența (B7, P-7).
   * Dacă ALTCHA este pornită pentru sondaj, provocarea se rezolvă în browser înainte de trimitere.
   */
  async submitVote(detail: PublicSurveyDetail, answers: SurveyAnswers, hp: string, formLoadedAt: number): Promise<VoteResult> {
    const payload = detail.questions
      .map((q) => ({ questionId: q.id, value: answers[q.id] }))
      .filter((a): a is { questionId: string; value: string | string[] } =>
        Array.isArray(a.value) ? a.value.length > 0 : typeof a.value === 'string' && a.value.trim() !== '',
      )
      .map((a) => ({ questionId: a.questionId, value: typeof a.value === 'string' ? a.value.trim() : a.value }));
    try {
      let pow: string | undefined;
      if (detail.powEnabled) {
        const challenge = await api.get<PowChallenge>(`/public/surveys/${encodeURIComponent(detail.id)}/pow-challenge`);
        pow = await solvePow(challenge);
        if (!pow) {
          return { success: false, status: 400, code: 'POW_INVALID', error: 'Verificarea anti-robot nu a reușit. Încercați din nou.' };
        }
      }
      const remaining = SURVEY_MIN_FORM_SECONDS * 1000 + 500 - (Date.now() - formLoadedAt);
      if (remaining > 0) await wait(remaining);
      await api.post<{ recorded: true }>(`/public/surveys/${encodeURIComponent(detail.id)}/submissions`, {
        answers: payload,
        hp,
        formStartedAt: detail.formStartedAt,
        ...(pow ? { pow } : {}),
      });
      this.markParticipationHint(detail.id);
      return { success: true };
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409 && err.code === 'ALREADY_VOTED') this.markParticipationHint(detail.id);
        return { success: false, status: err.status, code: err.code, error: err.message, fields: err.fields };
      }
      return { success: false, status: 0, code: 'UNKNOWN', error: 'Votul nu a putut fi trimis. Încercați din nou.' };
    }
  }

  // ——— indiciul „Ai participat deja” (numai UX, N4-12) ———

  private readHint(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(PARTICIPATION_HINT_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  }

  hasParticipationHint(surveyId: string): boolean {
    return this.readHint().includes(surveyId);
  }

  private markParticipationHint(surveyId: string): void {
    if (typeof window === 'undefined') return;
    try {
      const ids = this.readHint();
      if (!ids.includes(surveyId)) localStorage.setItem(PARTICIPATION_HINT_KEY, JSON.stringify([...ids, surveyId].slice(-200)));
    } catch {
      // fără stocare locală: indiciul lipsește, votul rămâne protejat de server
    }
  }

  // ——— Admin (B2 §6.4); permisiunile se verifică pe server ———

  async adminList(): Promise<AdminSurvey[]> {
    return (await api.get<{ items: AdminSurvey[] }>('/admin/surveys')).items;
  }

  adminCreate(input: AdminSurveyInput, status: 'draft' | 'active'): Promise<AdminSurvey> {
    return api.post<AdminSurvey>('/admin/surveys', { ...input, status });
  }

  adminUpdate(id: string, input: AdminSurveyInput): Promise<AdminSurvey> {
    return api.put<AdminSurvey>(`/admin/surveys/${id}`, input);
  }

  adminSetStatus(id: string, status: SurveyStatus): Promise<AdminSurvey> {
    return api.patch<AdminSurvey>(`/admin/surveys/${id}/status`, { status });
  }

  adminDelete(id: string): Promise<void> {
    return api.del<void>(`/admin/surveys/${id}`);
  }

  /** Rezultatele pentru Admin, indiferent de vizibilitatea publică. */
  adminResults(id: string): Promise<SurveyResults> {
    return api.get<SurveyResults>(`/admin/surveys/${id}/results`);
  }

  /** Textele libere (N4-9): numai `surveys.edit`, numai după închidere; fiecare citire intră în audit. */
  async adminFreeText(id: string): Promise<AdminSurveyFreeText[]> {
    return (await api.get<{ items: AdminSurveyFreeText[] }>(`/admin/surveys/${id}/free-text`)).items;
  }

  /** Marcajul „rezultate posibil afectate” (N4-10). */
  adminSetIntegrity(id: string, flag: boolean, note: string | null): Promise<AdminSurvey> {
    return api.patch<AdminSurvey>(`/admin/surveys/${id}/integrity`, { flag, note });
  }

  /** ALTCHA la vot, per sondaj (N4-5). */
  adminSetPow(id: string, enabled: boolean): Promise<AdminSurvey> {
    return api.patch<AdminSurvey>(`/admin/surveys/${id}/pow`, { enabled });
  }
}

export const surveyService = new SurveyService();
