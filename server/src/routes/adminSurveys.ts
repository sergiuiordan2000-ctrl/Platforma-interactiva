// API Admin al sondajelor (B2 §6.4; Faza 5.6) și tabloul de bord `/admin/dashboard` (B2 §6, rămas din 5.3).
// Permisiunile B4 (`surveys.*`), integritatea după primul vot (T-4), închis = definitiv (P-1),
// textele libere numai `surveys.edit` + sondaj închis + audit (N4-9, DN-03). D4: fără „reset demo”.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  adminSurveyCreateRequest,
  adminSurveyIntegrityRequest,
  adminSurveyListQuery,
  adminSurveyPowRequest,
  adminSurveyStatusRequest,
  adminSurveyUpdateRequest,
  hasPermission,
  idSchema,
  type AdminDashboard,
  type AdminSurveyFreeText,
  type Permission,
  type SurveyStatus,
} from '@tmc/shared';
import { writeAudit } from '../audit.ts';
import { requestIpHash, requireAdmin } from '../auth/guards.ts';
import type { AppContext } from '../context.ts';
import { apiError } from '../errors.ts';
import { newId } from '../ids.ts';
import {
  computeResults,
  effectiveState,
  getSurveyRow,
  loadQuestions,
  lockedViolation,
  submissionCounts,
  toAdminSurvey,
  updateHelpTexts,
  writeStructure,
  type SurveyRow,
} from '../surveys.ts';
import { parseBody } from '../validation.ts';

const notFound = (reply: FastifyReply) => reply.code(404).send(apiError('NOT_FOUND', 'Sondajul nu a fost găsit.'));
const conflict = (reply: FastifyReply, code: string, message: string, fields?: Record<string, string>) =>
  reply.code(409).send(apiError(code, message, fields ? { fields } : undefined));
const forbidden = (reply: FastifyReply) =>
  reply.code(403).send(apiError('FORBIDDEN', 'Nu aveți permisiunea pentru această operație.'));

/** Permisiunea stării țintă (6.5 / B2 §6.4). */
const statusPermission = (s: SurveyStatus): Permission =>
  s === 'active' ? 'surveys.activate' : s === 'closed' ? 'surveys.close' : 'surveys.edit';

export function registerAdminSurveyRoutes(api: FastifyInstance, ctx: AppContext): void {
  const view = requireAdmin(ctx, { permission: 'surveys.view' });
  const edit = requireAdmin(ctx, { permission: 'surveys.edit' });
  const anyAdmin = requireAdmin(ctx);

  const audit = (request: FastifyRequest, action: string, id: string, details?: Record<string, unknown>) =>
    writeAudit(ctx.pool, ctx.now(), {
      actorType: 'admin', actorUserId: request.admin!.user.id, action, targetType: 'survey', targetId: id,
      details: details ?? null, ipHash: requestIpHash(ctx, request),
    });

  async function load(id: string): Promise<SurveyRow | undefined> {
    return idSchema.safeParse(id).success ? getSurveyRow(ctx.pool, id) : undefined;
  }
  async function detail(s: SurveyRow) {
    const qs = (await loadQuestions(ctx.pool, [s.id])).get(s.id) ?? [];
    const n = (await submissionCounts(ctx.pool, [s.id])).get(s.id) ?? 0;
    return toAdminSurvey(s, qs, n, ctx.now());
  }

  api.get('/admin/surveys', { preHandler: view }, async (request, reply) => {
    const parsed = adminSurveyListQuery.safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send(apiError('BAD_REQUEST', 'Parametri invalizi.'));
    const [rows] = await ctx.pool.query(
      `SELECT * FROM surveys ${parsed.data.status ? 'WHERE status = ?' : ''} ORDER BY created_at DESC, id DESC LIMIT 500`,
      parsed.data.status ? [parsed.data.status] : [],
    );
    const list = rows as SurveyRow[];
    const qs = await loadQuestions(ctx.pool, list.map((s) => s.id));
    const counts = await submissionCounts(ctx.pool, list.map((s) => s.id));
    const now = ctx.now();
    return { items: list.map((s) => toAdminSurvey(s, qs.get(s.id) ?? [], counts.get(s.id) ?? 0, now)) };
  });

  api.get<{ Params: { id: string } }>('/admin/surveys/:id', { preHandler: view }, async (request, reply) => {
    const s = await load(request.params.id);
    return s ? detail(s) : notFound(reply);
  });

  api.post('/admin/surveys', { preHandler: requireAdmin(ctx, { permission: 'surveys.create' }) }, async (request, reply) => {
    const body = parseBody(adminSurveyCreateRequest, request, reply);
    if (!body) return reply;
    const status = body.status ?? 'draft';
    if (status === 'active' && !hasPermission(request.admin!.user.role, 'surveys.activate')) return forbidden(reply);
    const now = ctx.now();
    const id = newId(now);
    const actor = request.admin!.user.id;
    const conn = await ctx.pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `INSERT INTO surveys (id, title, description, category, start_at, end_at, status, results_visibility, pow_enabled,
           integrity_flag, is_demo, created_at, created_by, updated_at, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE, FALSE, FALSE, ?, ?, ?, ?)`,
        [id, body.title, body.description, body.category ?? null, new Date(body.startAt), new Date(body.endAt), status,
          body.resultsVisibility, now, actor, now, actor],
      );
      await writeStructure(conn, id, body, now);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    await audit(request, 'survey.create', id, { status });
    return reply.code(201).send(await detail((await getSurveyRow(ctx.pool, id))!));
  });

  api.put<{ Params: { id: string } }>('/admin/surveys/:id', { preHandler: edit }, async (request, reply) => {
    const body = parseBody(adminSurveyUpdateRequest, request, reply);
    if (!body) return reply;
    if (!idSchema.safeParse(request.params.id).success) return notFound(reply);
    const now = ctx.now();
    const conn = await ctx.pool.getConnection();
    let result: 'ok' | 'not_found' | 'closed' | 'end_past' | { locked: string } = 'ok';
    try {
      await conn.beginTransaction();
      // FOR UPDATE: serializat cu primul vot (recordSubmission blochează același rând)
      const s = await getSurveyRow(conn, request.params.id, true);
      if (!s) result = 'not_found';
      else if (effectiveState(s, now) === 'closed') result = 'closed'; // P-1: închis = definitiv
      else if (s.first_submission_at) {
        const current = (await loadQuestions(conn, [s.id])).get(s.id) ?? [];
        const v = lockedViolation(s, current, body);
        if (v) result = { locked: v };
        else if (new Date(body.endAt).getTime() <= now.getTime()) result = 'end_past';
        else {
          await conn.query('UPDATE surveys SET title = ?, description = ?, category = ?, end_at = ?, updated_at = ?, updated_by = ? WHERE id = ?',
            [body.title, body.description, body.category ?? null, new Date(body.endAt), now, request.admin!.user.id, s.id]);
          await updateHelpTexts(conn, body);
        }
      } else {
        await conn.query(
          `UPDATE surveys SET title = ?, description = ?, category = ?, start_at = ?, end_at = ?, results_visibility = ?,
             updated_at = ?, updated_by = ? WHERE id = ?`,
          [body.title, body.description, body.category ?? null, new Date(body.startAt), new Date(body.endAt), body.resultsVisibility,
            now, request.admin!.user.id, s.id],
        );
        await writeStructure(conn, s.id, body, now);
      }
      if (result === 'ok') await conn.commit();
      else await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    if (result === 'not_found') return notFound(reply);
    if (result === 'closed') return conflict(reply, 'SURVEY_CLOSED', 'Un sondaj închis nu se mai modifică.');
    if (result === 'end_past') return reply.code(422).send(apiError('VALIDATION', 'Data închiderii trebuie să fie în viitor.', { fields: { endAt: 'în trecut' } }));
    if (typeof result === 'object') {
      return conflict(reply, 'STRUCTURE_LOCKED', 'După primul vot, întrebările, opțiunile, data deschiderii și vizibilitatea rezultatelor nu se mai modifică.', { [result.locked]: 'blocat' });
    }
    await audit(request, 'survey.update', request.params.id);
    return detail((await getSurveyRow(ctx.pool, request.params.id))!);
  });

  api.patch<{ Params: { id: string } }>('/admin/surveys/:id/status', { preHandler: anyAdmin }, async (request, reply) => {
    const body = parseBody(adminSurveyStatusRequest, request, reply);
    if (!body) return reply;
    if (!hasPermission(request.admin!.user.role, statusPermission(body.status))) return forbidden(reply);
    const s = await load(request.params.id);
    if (!s) return notFound(reply);
    const now = ctx.now();
    const st = effectiveState(s, now);
    const from = s.status;
    const to = body.status;
    if (from === to && !(to === 'active' && st === 'closed')) return detail(s); // idempotent
    // P-1: închis (explicit sau expirat) = definitiv
    if (st === 'closed') return conflict(reply, 'SURVEY_CLOSED', 'Un sondaj închis nu se mai redeschide.');
    if (to === 'closed') {
      if (from !== 'active') return conflict(reply, 'INVALID_TRANSITION', 'Numai un sondaj activ se poate închide.');
      // T-1: închiderea anticipată mută `end_at` la acum (retenția și backup-ul folosesc `end_at`)
      const endAt = s.end_at.getTime() > now.getTime() ? now : s.end_at;
      const startAt = s.start_at.getTime() >= endAt.getTime() ? new Date(endAt.getTime() - 1000) : s.start_at;
      await ctx.pool.query("UPDATE surveys SET status = 'closed', start_at = ?, end_at = ?, updated_at = ?, updated_by = ? WHERE id = ?",
        [startAt, endAt, now, request.admin!.user.id, s.id]);
    } else if (to === 'draft') {
      const n = (await submissionCounts(ctx.pool, [s.id])).get(s.id) ?? 0;
      if (n > 0 || s.first_submission_at) return conflict(reply, 'HAS_SUBMISSIONS', 'Un sondaj cu voturi nu mai poate deveni ciornă.');
      await ctx.pool.query("UPDATE surveys SET status = 'draft', updated_at = ?, updated_by = ? WHERE id = ?", [now, request.admin!.user.id, s.id]);
    } else {
      await ctx.pool.query("UPDATE surveys SET status = 'active', updated_at = ?, updated_by = ? WHERE id = ?", [now, request.admin!.user.id, s.id]);
    }
    await audit(request, `survey.status.${to}`, s.id, { from });
    return detail((await getSurveyRow(ctx.pool, s.id))!);
  });

  api.delete<{ Params: { id: string } }>('/admin/surveys/:id', { preHandler: anyAdmin }, async (request, reply) => {
    const role = request.admin!.user.role;
    if (!hasPermission(role, 'surveys.create') && !hasPermission(role, 'surveys.edit')) return forbidden(reply);
    const s = await load(request.params.id);
    if (!s) return notFound(reply);
    const n = (await submissionCounts(ctx.pool, [s.id])).get(s.id) ?? 0;
    if (n > 0) return conflict(reply, 'HAS_SUBMISSIONS', 'Un sondaj cu voturi nu se șterge; se poate închide.');
    try {
      await ctx.pool.query('DELETE FROM surveys WHERE id = ?', [s.id]);
    } catch (err) {
      if ((err as { code?: string }).code === 'ER_ROW_IS_REFERENCED_2') return conflict(reply, 'HAS_SUBMISSIONS', 'Un sondaj cu voturi nu se șterge; se poate închide.');
      throw err;
    }
    await audit(request, 'survey.delete', s.id, { title: s.title });
    return reply.code(204).send();
  });

  api.get<{ Params: { id: string } }>('/admin/surveys/:id/results', { preHandler: view }, async (request, reply) => {
    const s = await load(request.params.id);
    return s ? computeResults(ctx.pool, s, ctx.now()) : notFound(reply);
  });

  api.get<{ Params: { id: string } }>('/admin/surveys/:id/free-text', { preHandler: edit }, async (request, reply) => {
    const s = await load(request.params.id);
    if (!s) return notFound(reply);
    if (effectiveState(s, ctx.now()) !== 'closed') {
      return reply.code(403).send(apiError('SURVEY_OPEN', 'Răspunsurile libere se pot citi numai după închiderea sondajului.'));
    }
    const qs = ((await loadQuestions(ctx.pool, [s.id])).get(s.id) ?? []).filter((q) => q.type === 'free_text');
    const out: AdminSurveyFreeText[] = [];
    for (const q of qs) {
      const [rows] = await ctx.pool.query(
        'SELECT a.text_value AS t FROM survey_answers a WHERE a.question_id = ? AND a.text_value IS NOT NULL ORDER BY a.id',
        [q.id],
      );
      out.push({ questionId: q.id, text: q.text, answers: (rows as Array<{ t: string }>).map((r) => r.t) });
    }
    await audit(request, 'survey.free_text.read', s.id); // N4-9: audit la fiecare citire
    return { items: out };
  });

  api.patch<{ Params: { id: string } }>('/admin/surveys/:id/integrity', { preHandler: edit }, async (request, reply) => {
    const body = parseBody(adminSurveyIntegrityRequest, request, reply);
    if (!body) return reply;
    const s = await load(request.params.id);
    if (!s) return notFound(reply);
    await ctx.pool.query('UPDATE surveys SET integrity_flag = ?, integrity_note = ?, updated_at = ?, updated_by = ? WHERE id = ?',
      [body.flag, body.flag ? (body.note ?? null) : null, ctx.now(), request.admin!.user.id, s.id]);
    await audit(request, 'survey.integrity', s.id, { flag: body.flag });
    return detail((await getSurveyRow(ctx.pool, s.id))!);
  });

  api.patch<{ Params: { id: string } }>('/admin/surveys/:id/pow', { preHandler: edit }, async (request, reply) => {
    const body = parseBody(adminSurveyPowRequest, request, reply);
    if (!body) return reply;
    const s = await load(request.params.id);
    if (!s) return notFound(reply);
    await ctx.pool.query('UPDATE surveys SET pow_enabled = ?, updated_at = ?, updated_by = ? WHERE id = ?',
      [body.enabled, ctx.now(), request.admin!.user.id, s.id]);
    await audit(request, 'survey.pow', s.id, { enabled: body.enabled });
    return detail((await getSurveyRow(ctx.pool, s.id))!);
  });

  api.get<{ Params: { id: string } }>('/admin/surveys/:id/rejections', { preHandler: view }, async (request, reply) => {
    const s = await load(request.params.id);
    if (!s) return notFound(reply);
    const [rows] = await ctx.pool.query(
      `SELECT hour, reason, SUM(count) AS n FROM rejected_attempts WHERE area = 'vote' AND target_id = ?
        GROUP BY hour, reason ORDER BY hour DESC, reason LIMIT 500`,
      [s.id],
    );
    return { items: (rows as Array<{ hour: Date; reason: string; n: number }>).map((r) => ({ hour: r.hour.toISOString(), reason: r.reason, count: Number(r.n) })) };
  });

  // ——— tabloul de bord (B2 §6: contoare agregate) ———
  api.get('/admin/dashboard', { preHandler: requireAdmin(ctx, { permission: 'dashboard.view' }) }, async () => {
    const now = ctx.now();
    const [[r]] = (await ctx.pool.query(
      `SELECT COUNT(*) AS total, SUM(resolution_status = 'new') AS nw, SUM(resolution_status = 'in_analysis') AS ia,
              SUM(resolution_status = 'resolved') AS rs, SUM(lat IS NULL) AS np FROM reports`,
    )) as unknown as [[Record<string, number | null>]];
    const [[f]] = (await ctx.pool.query("SELECT COUNT(*) AS n FROM email_outbox WHERE status = 'failed'")) as unknown as [[{ n: number }]];
    const [[v]] = (await ctx.pool.query(
      `SELECT SUM(status = 'draft') AS d, SUM(status = 'active' AND start_at <= ? AND end_at > ?) AS o,
              SUM(status = 'closed' OR (status = 'active' AND end_at <= ?)) AS c FROM surveys`,
      [now, now, now],
    )) as unknown as [[Record<string, number | null>]];
    const [[sub]] = (await ctx.pool.query('SELECT COUNT(*) AS n FROM survey_submissions')) as unknown as [[{ n: number }]];
    const n = (x: unknown) => Number(x ?? 0);
    const out: AdminDashboard = {
      reports: { total: n(r.total), new: n(r.nw), inAnalysis: n(r.ia), resolved: n(r.rs), withoutPosition: n(r.np), emailFailed: n(f.n) },
      surveys: { draft: n(v.d), open: n(v.o), closed: n(v.c), submissions: n(sub.n) },
    };
    return out;
  });
}
