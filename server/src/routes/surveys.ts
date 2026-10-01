// API public al sondajelor (B2 §3; Faza 5.6): lista deschisă și arhiva (D3), structura, rezultatele după D3,
// provocarea ALTCHA și votul anonim (N-4, B7). Fără cont; cookie-ul de participare se emite la listă și la detaliu.

import type { FastifyInstance, FastifyReply } from 'fastify';
import { idSchema, publicSurveyListQuery, surveySubmissionRequest } from '@tmc/shared';
import { LIMITS, type AppContext } from '../context.ts';
import { apiError } from '../errors.ts';
import { requestIpHash } from '../auth/guards.ts';
import { hitRateLimit, recordRejected } from '../auth/rateLimit.ts';
import { checkFormToken, createPowChallenge, issueFormToken, verifyPow } from '../reports/antiabuse.ts';
import {
  DuplicateVoteError,
  SurveyClosedError,
  computeResults,
  effectiveState,
  ensureParticipationCookie,
  getSurveyRow,
  loadQuestions,
  participationFingerprint,
  participationToken,
  recordSubmission,
  resultsAvailable,
  toPublicSummary,
  validateAnswers,
  type SurveyRow,
} from '../surveys.ts';
import { parseBody } from '../validation.ts';

const notFound = (reply: FastifyReply) => reply.code(404).send(apiError('NOT_FOUND', 'Sondajul nu a fost găsit.'));
const formScope = (id: string) => `survey:${id}`;

export function registerSurveyRoutes(api: FastifyInstance, ctx: AppContext): void {
  /** Sondaj vizibil public: orice stare în afară de `draft` (B2 §3: draft → 404). */
  async function visible(id: string): Promise<SurveyRow | undefined> {
    if (!idSchema.safeParse(id).success) return undefined;
    const s = await getSurveyRow(ctx.pool, id);
    return s && s.status !== 'draft' ? s : undefined;
  }

  api.get('/public/surveys', async (request, reply) => {
    const parsed = publicSurveyListQuery.safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send(apiError('BAD_REQUEST', 'Parametri invalizi.'));
    ensureParticipationCookie(ctx, request, reply);
    const now = ctx.now();
    const state = parsed.data.state ?? 'open';
    const limit = parsed.data.limit ?? 20;
    let rows: SurveyRow[];
    let nextCursor: string | null = null;
    if (state === 'open') {
      const [r] = await ctx.pool.query(
        "SELECT * FROM surveys WHERE status = 'active' AND start_at <= ? AND end_at > ? ORDER BY end_at ASC, id ASC LIMIT 50",
        [now, now],
      );
      rows = r as SurveyRow[];
    } else {
      // arhiva (D3): închise explicit sau expirate (E-3); paginare după (end_at, id) descrescător
      const m = parsed.data.cursor ? /^(\d{10,16})\.([0-9A-HJKMNP-TV-Z]{26})$/.exec(parsed.data.cursor) : null;
      if (parsed.data.cursor && !m) return reply.code(400).send(apiError('BAD_REQUEST', 'Parametri invalizi.'));
      const params: unknown[] = [now];
      let where = "(status = 'closed' OR (status = 'active' AND end_at <= ?))";
      if (m) {
        where += ' AND (end_at < ? OR (end_at = ? AND id < ?))';
        const at = new Date(Number(m[1]));
        params.push(at, at, m[2]);
      }
      params.push(limit + 1);
      const [r] = await ctx.pool.query(`SELECT * FROM surveys WHERE ${where} ORDER BY end_at DESC, id DESC LIMIT ?`, params);
      rows = r as SurveyRow[];
      if (rows.length > limit) {
        rows = rows.slice(0, limit);
        const last = rows[rows.length - 1]!;
        nextCursor = `${last.end_at.getTime()}.${last.id}`;
      }
    }
    const qs = await loadQuestions(ctx.pool, rows.map((s) => s.id));
    return { items: rows.map((s) => toPublicSummary(s, qs.get(s.id)?.length ?? 0, now)), nextCursor };
  });

  api.get<{ Params: { id: string } }>('/public/surveys/:id', async (request, reply) => {
    const s = await visible(request.params.id);
    if (!s) return notFound(reply);
    ensureParticipationCookie(ctx, request, reply);
    const now = ctx.now();
    const questions = (await loadQuestions(ctx.pool, [s.id])).get(s.id) ?? [];
    return { ...toPublicSummary(s, questions.length, now), questions, formStartedAt: issueFormToken(ctx, formScope(s.id)) };
  });

  api.get<{ Params: { id: string } }>('/public/surveys/:id/results', async (request, reply) => {
    const s = await visible(request.params.id);
    if (!s) return notFound(reply);
    const now = ctx.now();
    if (!resultsAvailable(s, now)) {
      return reply.code(403).send(apiError('RESULTS_NOT_AVAILABLE', 'Rezultatele apar după închiderea consultării.'));
    }
    return computeResults(ctx.pool, s, now);
  });

  api.get<{ Params: { id: string } }>('/public/surveys/:id/pow-challenge', async (request, reply) => {
    const s = await visible(request.params.id);
    if (!s || !s.pow_enabled) return notFound(reply);
    return createPowChallenge(ctx);
  });

  api.post<{ Params: { id: string } }>('/public/surveys/:id/submissions', async (request, reply) => {
    const s = await visible(request.params.id);
    if (!s) return notFound(reply);
    const body = parseBody(surveySubmissionRequest, request, reply);
    if (!body) return reply;
    const now = ctx.now();
    const ipH = requestIpHash(ctx, request);
    const reject = (reason: Parameters<typeof recordRejected>[2]) => recordRejected(ctx, 'vote', reason, ipH, s.id);

    if (effectiveState(s, now) !== 'open') {
      await reject('closed');
      return reply.code(403).send(apiError('SURVEY_CLOSED', 'Consultarea nu este deschisă pentru vot.'));
    }
    // B7 §2, P-7: limite pe IP-ul hash-uit (fără IP în clar); fiecare încercare contează
    const perSurvey = await hitRateLimit(ctx, `vote:ip:${ipH}:${s.id}`, 60);
    const global = await hitRateLimit(ctx, `vote:ip:${ipH}`, 60);
    if (perSurvey > LIMITS.surveyVotesPerIpPerSurveyPerHour || global > LIMITS.surveyVotesPerIpPerHour) {
      await reject('rate_limited');
      reply.header('Retry-After', '3600');
      return reply.code(429).send(apiError('RATE_LIMITED', 'Prea multe voturi din această rețea. Reveniți mai târziu.'));
    }
    if (body.hp !== '') {
      await reject('honeypot');
      return reply.code(422).send(apiError('VALIDATION', 'Datele trimise nu sunt valide.'));
    }
    const ft = checkFormToken(ctx, body.formStartedAt, LIMITS.surveyMinFormSeconds * 1000, LIMITS.surveyFormTokenMaxHours * 3_600_000, formScope(s.id));
    if (ft !== 'ok') {
      await reject(ft === 'too_fast' ? 'too_fast' : 'invalid');
      return reply
        .code(422)
        .send(apiError('VALIDATION', ft === 'expired' ? 'Formularul a expirat. Reîncărcați pagina.' : 'Datele trimise nu sunt valide.'));
    }
    if (s.pow_enabled && !(await verifyPow(ctx, body.pow))) {
      await reject('pow_invalid');
      return reply.code(400).send(apiError('POW_INVALID', 'Verificarea anti-robot nu a reușit. Încercați din nou.'));
    }
    // T-2: fără jetonul de participare nu se votează
    const token = participationToken(ctx, request);
    if (!token) {
      await reject('invalid');
      return reply.code(400).send(apiError('PARTICIPATION_REQUIRED', 'Reîncărcați pagina și încercați din nou.'));
    }
    const questions = (await loadQuestions(ctx.pool, [s.id])).get(s.id) ?? [];
    const v = validateAnswers(questions, body.answers);
    if (!v.ok) {
      await reject('invalid');
      return reply.code(422).send(apiError('VALIDATION', 'Răspunsurile nu sunt complete sau valide.', { fields: v.fields }));
    }
    try {
      await recordSubmission(ctx, s.id, participationFingerprint(ctx, token, s.id), v.answers);
    } catch (err) {
      if (err instanceof DuplicateVoteError) {
        await reject('duplicate');
        return reply.code(409).send(apiError('ALREADY_VOTED', 'Ați participat deja la această consultare.'));
      }
      if (err instanceof SurveyClosedError) {
        await reject('closed');
        return reply.code(403).send(apiError('SURVEY_CLOSED', 'Consultarea nu este deschisă pentru vot.'));
      }
      throw err;
    }
    return reply.code(201).send({ recorded: true });
  });
}
