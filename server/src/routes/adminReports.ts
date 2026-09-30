// Admin — sesizări (B2 §6.1), setările fluxului către Primărie și jurnalul e-mail (B2 §6.5).
// Fără moderare (2.3): nu există aprobare / respingere. Drepturile exclusive `super_admin` (B4 §2.4):
// ștergerea, e-mailul autorului, corectarea poziției, reîncercarea și jurnalul e-mailurilor.

import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  actsForCityHall,
  adminReportsQuery,
  isSuperAdmin,
  locationCorrectionRequest,
  referenceNumberSchema,
  reportResponseRequest,
  resolutionRequest,
  type AdminReportDetail,
  type AdminReportListItem,
  type AdminReportStats,
  type ReportStatus,
} from '@tmc/shared';
import { z } from 'zod';
import type { AppContext } from '../context.ts';
import { writeAudit } from '../audit.ts';
import { apiError } from '../errors.ts';
import { newId } from '../ids.ts';
import { requestIpHash, requireAdmin } from '../auth/guards.ts';
import { deleteReportsHard } from '../db/reportDeletion.ts';
import { getRegistrySettings, setSetting } from '../settings.ts';
import { parseBody } from '../validation.ts';
import { enqueueStatusUpdate, kickOutbox, releaseOnHold, transmissionState } from '../reports/outbox.ts';
import { sendPhoto } from './reports.ts';

const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;

const LIST_COLUMNS = `
  r.id, r.reference_number, r.category_id, c.name AS category_name, r.description, r.location_text,
  r.lat, r.lng, r.location_approximate, r.location_source, r.resolution_status, r.city_hall_taken_over,
  r.city_hall_transmission_requested, r.is_demo, r.created_at,
  (SELECT COUNT(*) FROM report_photos p WHERE p.report_id = r.id) AS photo_count,
  (SELECT e.status FROM email_outbox e WHERE e.report_id = r.id AND e.kind = 'registry_notification' LIMIT 1) AS registry_status,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', u.id, 'displayName', u.display_name))
     FROM report_assignees a JOIN admin_users u ON u.id = a.user_id WHERE a.report_id = r.id) AS assignees`;

type ListRow = {
  id: string;
  reference_number: string;
  category_id: string;
  category_name: string;
  description: string;
  location_text: string;
  lat: string | null;
  lng: string | null;
  location_approximate: number;
  location_source: AdminReportListItem['locationSource'];
  resolution_status: ReportStatus;
  city_hall_taken_over: number;
  city_hall_transmission_requested: number;
  is_demo: number;
  created_at: Date;
  photo_count: number;
  registry_status: string | null;
  assignees: unknown;
};

const parseJson = <T>(v: unknown, fallback: T): T => {
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return v as T;
};

function toListItem(r: ListRow): AdminReportListItem {
  return {
    id: r.id,
    referenceNumber: r.reference_number,
    categoryId: r.category_id,
    categoryName: r.category_name,
    description: r.description,
    locationText: r.location_text,
    hasPosition: r.lat !== null && r.lng !== null,
    locationApproximate: Boolean(r.location_approximate),
    locationSource: r.location_source,
    status: r.resolution_status,
    photoCount: Number(r.photo_count),
    cityHallTakenOver: Boolean(r.city_hall_taken_over),
    transmitToCityHall: Boolean(r.city_hall_transmission_requested),
    transmission: transmissionState(Boolean(r.city_hall_transmission_requested), r.registry_status),
    assignees: parseJson<Array<{ id: string; displayName: string }>>(r.assignees, []),
    isDemo: Boolean(r.is_demo),
    createdAt: r.created_at.toISOString(),
  };
}

export function registerAdminReportRoutes(api: FastifyInstance, ctx: AppContext): void {
  const view = requireAdmin(ctx, { permission: 'reports.view' });
  const resolve = requireAdmin(ctx, { permission: 'reports.resolve' });
  const reply_ = requireAdmin(ctx, { permission: 'reports.reply' });
  const superOnly = requireAdmin(ctx, { superAdminOnly: true });
  const registryPerm = requireAdmin(ctx, { permission: 'notifications.recipient.manage' });

  const notFound = { error: { code: 'NOT_FOUND', message: 'Sesizarea nu există.' } };

  async function loadRow(id: string): Promise<ListRow | null> {
    if (!ULID.test(id)) return null;
    const [rows] = await ctx.pool.query(
      `SELECT ${LIST_COLUMNS} FROM reports r JOIN report_categories c ON c.id = r.category_id WHERE r.id = ?`,
      [id],
    );
    return (rows as ListRow[])[0] ?? null;
  }

  // ——— listă (fără date de contact, B8 §2) ———

  api.get('/admin/reports', { preHandler: view }, async (request, reply) => {
    const q = adminReportsQuery.safeParse(request.query ?? {});
    if (!q.success) return reply.code(400).send(apiError('BAD_REQUEST', 'Filtre invalide.'));
    const { resolution, category, takenOver, q: text, cursor } = q.data;
    const limit = q.data.limit ?? 50;
    const where: string[] = [];
    const params: unknown[] = [];
    if (resolution) { where.push('r.resolution_status = ?'); params.push(resolution); }
    if (category) { where.push('r.category_id = ?'); params.push(category); }
    if (takenOver !== undefined) { where.push('r.city_hall_taken_over = ?'); params.push(takenOver); }
    if (text) {
      const like = `%${text.replace(/[%_\\]/g, '')}%`;
      where.push('(r.reference_number LIKE ? OR r.description LIKE ? OR r.location_text LIKE ?)');
      params.push(like, like, like);
    }
    // 6.6: preluarea are prioritate; cursorul = `<preluată 0|1>_<id>`
    if (cursor) {
      const m = /^([01])_([0-9A-HJKMNP-TV-Z]{26})$/.exec(cursor);
      if (!m) return reply.code(400).send(apiError('BAD_REQUEST', 'Cursor invalid.'));
      where.push('(r.city_hall_taken_over < ? OR (r.city_hall_taken_over = ? AND r.id < ?))');
      params.push(Number(m[1]), Number(m[1]), m[2]);
    }
    const [rows] = await ctx.pool.query(
      `SELECT ${LIST_COLUMNS} FROM reports r JOIN report_categories c ON c.id = r.category_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY r.city_hall_taken_over DESC, r.id DESC LIMIT ?`,
      [...params, limit + 1],
    );
    const list = rows as ListRow[];
    const page = list.slice(0, limit);
    const last = page[page.length - 1];
    reply.header('Cache-Control', 'no-store');
    return {
      items: page.map(toListItem),
      nextCursor: list.length > limit && last ? `${last.city_hall_taken_over ? 1 : 0}_${last.id}` : null,
    };
  });

  api.get('/admin/reports/stats', { preHandler: view }, async (request, reply) => {
    const [rows] = await ctx.pool.query(
      `SELECT resolution_status AS s, COUNT(*) AS n, SUM(lat IS NULL) AS noPos FROM reports GROUP BY resolution_status`,
    );
    const byStatus: Record<ReportStatus, number> = { new: 0, in_analysis: 0, resolved: 0 };
    let withoutPosition = 0;
    for (const r of rows as Array<{ s: ReportStatus; n: number; noPos: number }>) {
      byStatus[r.s] = Number(r.n);
      withoutPosition += Number(r.noPos);
    }
    const out: AdminReportStats = {
      byStatus,
      withoutPosition,
      total: byStatus.new + byStatus.in_analysis + byStatus.resolved,
    };
    if (isSuperAdmin(request.admin!.user.role)) {
      const [f] = await ctx.pool.query("SELECT COUNT(*) AS n FROM email_outbox WHERE status = 'failed'");
      out.emailFailures = Number((f as Array<{ n: number }>)[0]!.n);
    }
    reply.header('Cache-Control', 'no-store');
    return out;
  });

  // ——— detaliu ———

  async function detail(request: FastifyRequest, row: ListRow): Promise<AdminReportDetail> {
    const superAdmin = isSuperAdmin(request.admin!.user.role);
    const [extra] = await ctx.pool.query(
      `SELECT r.notify_opt_in, r.city_hall_taken_over_at, u.display_name AS taken_by, r.location_corrected_at,
              r.updated_at, a.email AS author_email
         FROM reports r LEFT JOIN admin_users u ON u.id = r.city_hall_taken_over_by
         LEFT JOIN citizen_accounts a ON a.id = r.author_account_id WHERE r.id = ?`,
      [row.id],
    );
    const x = (extra as Array<{
      notify_opt_in: number; city_hall_taken_over_at: Date | null; taken_by: string | null;
      location_corrected_at: Date | null; updated_at: Date; author_email: string | null;
    }>)[0]!;
    const [photos] = await ctx.pool.query(
      'SELECT id, ordinal, mime, width, height FROM report_photos WHERE report_id = ? ORDER BY ordinal',
      [row.id],
    );
    const [responses] = await ctx.pool.query(
      `SELECT rr.id, rr.message, u.display_name AS authorDisplayName, rr.created_at AS createdAt
         FROM report_responses rr JOIN admin_users u ON u.id = rr.author_user_id
        WHERE rr.report_id = ? ORDER BY rr.created_at`,
      [row.id],
    );
    const out: AdminReportDetail = {
      ...toListItem(row),
      lat: row.lat === null ? null : Number(row.lat),
      lng: row.lng === null ? null : Number(row.lng),
      notifyOptIn: Boolean(x.notify_opt_in),
      cityHallTakenOverAt: x.city_hall_taken_over_at?.toISOString() ?? null,
      cityHallTakenOverBy: x.taken_by,
      locationCorrectedAt: x.location_corrected_at?.toISOString() ?? null,
      photos: (photos as Array<{ id: string; ordinal: number; mime: 'image/jpeg' | 'image/webp'; width: number; height: number }>).map(
        (p) => ({ ...p, url: `/api/v1/admin/reports/${row.id}/photos/${p.id}` }),
      ),
      responses: (responses as Array<{ id: string; message: string; authorDisplayName: string; createdAt: Date }>).map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
      updatedAt: x.updated_at.toISOString(),
    };
    if (superAdmin) {
      // A-8 și 2.11: numai pentru super_admin
      out.authorEmail = x.author_email;
      const [emails] = await ctx.pool.query(
        `SELECT id, kind AS type, status, attempts, last_error AS lastError, created_at AS createdAt, sent_at AS sentAt
           FROM email_outbox WHERE report_id = ? ORDER BY created_at`,
        [row.id],
      );
      out.emails = (emails as Array<{ id: string; type: string; status: string; attempts: number; lastError: string | null; createdAt: Date; sentAt: Date | null }>).map(
        (e) => ({ ...e, createdAt: e.createdAt.toISOString(), sentAt: e.sentAt?.toISOString() ?? null }),
      );
    }
    return out;
  }

  api.get<{ Params: { tm: string } }>('/admin/reports/by-reference/:tm', { preHandler: view }, async (request, reply) => {
    const ref = referenceNumberSchema.safeParse(request.params.tm);
    if (!ref.success) return reply.code(404).send(notFound);
    const [rows] = await ctx.pool.query('SELECT id FROM reports WHERE reference_number = ?', [ref.data]);
    const id = (rows as Array<{ id: string }>)[0]?.id;
    const row = id ? await loadRow(id) : null;
    if (!row) return reply.code(404).send(notFound);
    reply.header('Cache-Control', 'no-store');
    return detail(request, row);
  });

  api.get<{ Params: { id: string } }>('/admin/reports/:id', { preHandler: view }, async (request, reply) => {
    const row = await loadRow(request.params.id);
    if (!row) return reply.code(404).send(notFound);
    reply.header('Cache-Control', 'no-store');
    return detail(request, row);
  });

  api.get<{ Params: { id: string; photoId: string } }>(
    '/admin/reports/:id/photos/:photoId',
    { preHandler: view },
    async (request, reply) => {
      if (!ULID.test(request.params.id) || !ULID.test(request.params.photoId)) return reply.code(404).send(notFound);
      const [rows] = await ctx.pool.query('SELECT storage_key AS k, mime FROM report_photos WHERE id = ? AND report_id = ?', [
        request.params.photoId,
        request.params.id,
      ]);
      const p = (rows as Array<{ k: string; mime: string }>)[0];
      if (!p) return reply.code(404).send(notFound);
      return sendPhoto(ctx, reply, p.k, p.mime);
    },
  );

  // ——— stadiul (DN-09, 2.1, P-9) ———

  api.patch<{ Params: { id: string } }>('/admin/reports/:id/resolution', { preHandler: resolve }, async (request, reply) => {
    const body = parseBody(resolutionRequest, request, reply);
    if (!body) return reply;
    const row = await loadRow(request.params.id);
    if (!row) return reply.code(404).send(notFound);
    const user = request.admin!.user;
    if (body.status !== 'resolved') {
      return reply.code(409).send(apiError('CONFLICT', 'Stadiul „în analiză” se setează automat, la transmiterea către Primărie.'));
    }
    if (!actsForCityHall(user.role)) {
      return reply.code(403).send(apiError('FORBIDDEN', 'Numai Primăria poate marca o sesizare ca rezolvată.'));
    }
    const s = await getRegistrySettings(ctx.pool);
    if (s.primariaMode !== 'platform') {
      return reply.code(403).send(apiError('FORBIDDEN', 'Primăria nu participă prin platformă; starea „rezolvată” nu este disponibilă.'));
    }
    if (row.resolution_status !== 'in_analysis') {
      return reply.code(409).send(apiError('CONFLICT', 'Numai o sesizare transmisă Primăriei („în analiză”) poate deveni „rezolvată”.'));
    }
    const conn = await ctx.pool.getConnection();
    let outboxId: string | null = null;
    try {
      await conn.beginTransaction();
      const [upd] = await conn.query(
        "UPDATE reports SET resolution_status = 'resolved', updated_at = ? WHERE id = ? AND resolution_status = 'in_analysis'",
        [ctx.now(), row.id],
      );
      if ((upd as { affectedRows: number }).affectedRows !== 1) {
        await conn.rollback();
        return reply.code(409).send(apiError('CONFLICT', 'Stadiul sesizării s-a schimbat între timp.'));
      }
      outboxId = await enqueueStatusUpdate(ctx, conn, row.id, 'resolved');
      await writeAudit(conn, ctx.now(), {
        actorType: 'admin', actorUserId: user.id, action: 'report.resolution', targetType: 'report', targetId: row.id,
        details: { from: 'in_analysis', to: 'resolved' }, ipHash: requestIpHash(ctx, request),
      });
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    if (outboxId) kickOutbox(ctx, [outboxId], (err) => request.log.error({ err }, 'coada e-mail'));
    return { status: 'resolved' };
  });

  // ——— asumarea (6.6, C-3, DN-02: fără audit) ———

  api.post<{ Params: { id: string } }>('/admin/reports/:id/assume', { preHandler: resolve }, async (request, reply) => {
    const user = request.admin!.user;
    if (actsForCityHall(user.role)) {
      return reply.code(403).send(apiError('FORBIDDEN', 'Primăria preia sesizarea instituțional („Preia”), nu individual.'));
    }
    const row = await loadRow(request.params.id);
    if (!row) return reply.code(404).send(notFound);
    const [res] = await ctx.pool.query('INSERT IGNORE INTO report_assignees (report_id, user_id, assigned_at) VALUES (?, ?, ?)', [
      row.id, user.id, ctx.now(),
    ]);
    return { changed: (res as { affectedRows: number }).affectedRows === 1 };
  });

  api.delete<{ Params: { id: string } }>('/admin/reports/:id/assume', { preHandler: resolve }, async (request, reply) => {
    const row = await loadRow(request.params.id);
    if (!row) return reply.code(404).send(notFound);
    const [res] = await ctx.pool.query('DELETE FROM report_assignees WHERE report_id = ? AND user_id = ?', [
      row.id, request.admin!.user.id,
    ]);
    if ((res as { affectedRows: number }).affectedRows !== 1) {
      return reply.code(409).send(apiError('CONFLICT', 'Nu ați asumat această sesizare.'));
    }
    return reply.code(204).send();
  });

  // ——— preluarea instituțională (6.6: ireversibilă, idempotentă; C-3; 2.2: fără notificare) ———

  api.post<{ Params: { id: string } }>('/admin/reports/:id/takeover', { preHandler: resolve }, async (request, reply) => {
    const user = request.admin!.user;
    if (!actsForCityHall(user.role)) {
      return reply.code(403).send(apiError('FORBIDDEN', 'Numai Primăria poate prelua instituțional o sesizare.'));
    }
    const row = await loadRow(request.params.id);
    if (!row) return reply.code(404).send(notFound);
    const now = ctx.now();
    const [res] = await ctx.pool.query(
      `UPDATE reports SET city_hall_taken_over = 1, city_hall_taken_over_at = ?, city_hall_taken_over_by = ?, updated_at = ?
        WHERE id = ? AND city_hall_taken_over = 0`,
      [now, user.id, now, row.id],
    );
    const changed = (res as { affectedRows: number }).affectedRows === 1;
    if (changed) {
      await writeAudit(ctx.pool, now, {
        actorType: 'admin', actorUserId: user.id, action: 'report.takeover', targetType: 'report', targetId: row.id,
        ipHash: requestIpHash(ctx, request),
      });
    }
    return { changed };
  });

  // ——— note interne (A06-3: fără notificare) ———

  api.post<{ Params: { id: string } }>('/admin/reports/:id/responses', { preHandler: reply_ }, async (request, reply) => {
    const body = parseBody(reportResponseRequest, request, reply);
    if (!body) return reply;
    const row = await loadRow(request.params.id);
    if (!row) return reply.code(404).send(notFound);
    const now = ctx.now();
    const id = newId(now);
    await ctx.pool.query(
      'INSERT INTO report_responses (id, report_id, message, author_user_id, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, row.id, body.message, request.admin!.user.id, now],
    );
    // B4 §5: notele interne nu se auditează
    return reply.code(201).send({ id, createdAt: now.toISOString() });
  });

  // ——— corectarea poziției (2.11, D6-5; drept exclusiv super_admin) ———

  api.patch<{ Params: { id: string } }>('/admin/reports/:id/location', { preHandler: superOnly }, async (request, reply) => {
    const body = parseBody(locationCorrectionRequest, request, reply);
    if (!body) return reply;
    const row = await loadRow(request.params.id);
    if (!row) return reply.code(404).send(notFound);
    if (!ctx.uat || !ctx.uat.contains(body.lat, body.lng)) {
      return reply.code(422).send(apiError('OUTSIDE_UAT', 'Poziția este în afara municipiului Turnu Măgurele.', { fields: { lat: 'în afara UAT' } }));
    }
    const now = ctx.now();
    const conn = await ctx.pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `UPDATE reports SET lat = ?, lng = ?, location_text = COALESCE(?, location_text), location_source = 'admin_corrected',
           location_approximate = 0, location_corrected_at = ?, location_corrected_by = ?, updated_at = ? WHERE id = ?`,
        [body.lat.toFixed(6), body.lng.toFixed(6), body.text ?? null, now, request.admin!.user.id, now, row.id],
      );
      await writeAudit(conn, now, {
        actorType: 'admin', actorUserId: request.admin!.user.id, action: 'report.location.correct', targetType: 'report',
        targetId: row.id,
        details: {
          reason: body.reason,
          before: { lat: row.lat === null ? null : Number(row.lat), lng: row.lng === null ? null : Number(row.lng), text: row.location_text, source: row.location_source },
          after: { lat: body.lat, lng: body.lng, text: body.text ?? row.location_text },
        },
        ipHash: requestIpHash(ctx, request),
      });
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    return reply.code(204).send();
  });

  // ——— reîncercarea unui e-mail eșuat (A17-9; drept exclusiv super_admin) ———

  api.post<{ Params: { id: string; emailId: string } }>(
    '/admin/reports/:id/emails/:emailId/retry',
    { preHandler: superOnly },
    async (request, reply) => {
      if (!ULID.test(request.params.id) || !ULID.test(request.params.emailId)) return reply.code(404).send(notFound);
      const [res] = await ctx.pool.query(
        `UPDATE email_outbox SET status = 'queued', attempts = 0, next_attempt_at = NULL, last_error = NULL
          WHERE id = ? AND report_id = ? AND status = 'failed'`,
        [request.params.emailId, request.params.id],
      );
      if ((res as { affectedRows: number }).affectedRows !== 1) {
        return reply.code(409).send(apiError('CONFLICT', 'Numai un mesaj eșuat poate fi reîncercat.'));
      }
      await writeAudit(ctx.pool, ctx.now(), {
        actorType: 'admin', actorUserId: request.admin!.user.id, action: 'email.retry', targetType: 'report',
        targetId: request.params.id, details: { emailId: request.params.emailId }, ipHash: requestIpHash(ctx, request),
      });
      kickOutbox(ctx, [request.params.emailId], (err) => request.log.error({ err }, 'coada e-mail'));
      return reply.code(202).send({ status: 'queued' });
    },
  );

  // ——— ștergerea definitivă (A-5, D10–D12; B-7: fără audit) ———

  api.delete<{ Params: { id: string } }>('/admin/reports/:id', { preHandler: superOnly }, async (request, reply) => {
    if (!ULID.test(request.params.id)) return reply.code(404).send(notFound);
    const res = await deleteReportsHard(ctx.pool, [request.params.id], ctx.config.storageDir);
    if (res.reportIds.length === 0) return reply.code(404).send(notFound);
    return reply.code(204).send();
  });

  // ——— setările fluxului către Primărie (B2 §6.5, N3-5, A17-1, 2.13) ———

  api.get('/admin/settings/registry', { preHandler: registryPerm }, async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
    return { ...(await getRegistrySettings(ctx.pool)), emailMode: ctx.config.email.mode };
  });

  const registryRequest = z.strictObject({
    recipientEmail: z.string().trim().toLowerCase().max(254).email().nullable(),
    flowEnabled: z.boolean(),
    primariaMode: z.enum(['none', 'email_only', 'platform']),
    agreementReference: z.string().trim().min(1).max(200).nullable(),
  });

  api.put('/admin/settings/registry', { preHandler: registryPerm }, async (request, reply) => {
    const body = parseBody(registryRequest, request, reply);
    if (!body) return reply;
    const mode = ctx.config.email.mode;
    if (body.flowEnabled) {
      if (!body.recipientEmail) {
        return reply.code(422).send(apiError('VALIDATION', 'Pentru pornirea fluxului este necesar destinatarul.', { fields: { recipientEmail: 'obligatoriu' } }));
      }
      if (mode === 'live' && !body.agreementReference) {
        return reply.code(422).send(apiError('VALIDATION', 'În producție, fluxul pornește numai cu acordul scris al Primăriei (A17-1).', { fields: { agreementReference: 'obligatoriu' } }));
      }
      if (mode === 'allowlist' && !ctx.config.email.allowlist.includes(body.recipientEmail)) {
        return reply.code(422).send(apiError('VALIDATION', 'Pe staging, destinatarul trebuie să fie în EMAIL_ALLOWLIST.', { fields: { recipientEmail: 'în afara listei' } }));
      }
    }
    const before = await getRegistrySettings(ctx.pool);
    const now = ctx.now();
    const by = request.admin!.user.id;
    const conn = await ctx.pool.getConnection();
    let released = 0;
    try {
      await conn.beginTransaction();
      await setSetting(conn, 'registry.recipient_email', body.recipientEmail, now, by);
      await setSetting(conn, 'registry.flow_enabled', body.flowEnabled, now, by);
      await setSetting(conn, 'registry.primaria_mode', body.primariaMode, now, by);
      await setSetting(conn, 'registry.agreement_reference', body.agreementReference, now, by);
      if (!before.flowEnabled && body.flowEnabled) released = await releaseOnHold(ctx, conn);
      await writeAudit(conn, now, {
        actorType: 'admin', actorUserId: by, action: 'settings.registry', targetType: 'settings', targetId: 'registry',
        details: {
          recipientChanged: before.recipientEmail !== body.recipientEmail,
          flowEnabled: { from: before.flowEnabled, to: body.flowEnabled },
          primariaMode: { from: before.primariaMode, to: body.primariaMode },
          agreementReferenceChanged: before.agreementReference !== body.agreementReference,
          releasedFromHold: released,
        },
        ipHash: requestIpHash(ctx, request),
      });
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    return { ...(await getRegistrySettings(ctx.pool)), emailMode: mode, releasedFromHold: released };
  });

  // ——— jurnalul global al e-mailurilor (2.11; drept exclusiv super_admin; fără corpuri) ———

  const emailLogQuery = z.strictObject({
    status: z.enum(['queued', 'sending', 'sent', 'failed', 'blocked', 'simulated', 'cancelled', 'on_hold']).optional(),
    kind: z.enum(['registry_notification', 'citizen_status_update', 'citizen_login_code', 'citizen_account_blocked']).optional(),
    cursor: z.string().regex(ULID).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  });

  api.get('/admin/email-log', { preHandler: superOnly }, async (request, reply) => {
    const q = emailLogQuery.safeParse(request.query ?? {});
    if (!q.success) return reply.code(400).send(apiError('BAD_REQUEST', 'Filtre invalide.'));
    const limit = q.data.limit ?? 50;
    const where: string[] = [];
    const params: unknown[] = [];
    if (q.data.status) { where.push('e.status = ?'); params.push(q.data.status); }
    if (q.data.kind) { where.push('e.kind = ?'); params.push(q.data.kind); }
    if (q.data.cursor) { where.push('e.id < ?'); params.push(q.data.cursor); }
    const [rows] = await ctx.pool.query(
      `SELECT e.id, e.kind, e.status, e.recipient, e.subject, e.attempts, e.last_error AS lastError, e.mode_at_send AS mode,
              e.created_at AS createdAt, e.sent_at AS sentAt, r.reference_number AS referenceNumber
         FROM email_outbox e LEFT JOIN reports r ON r.id = e.report_id
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY e.id DESC LIMIT ?`,
      [...params, limit + 1],
    );
    const list = rows as Array<{ id: string }>;
    reply.header('Cache-Control', 'no-store');
    return { items: list.slice(0, limit), nextCursor: list.length > limit ? list[limit - 1]!.id : null };
  });
}
