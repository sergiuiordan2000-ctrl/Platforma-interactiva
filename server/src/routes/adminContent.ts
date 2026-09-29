// API Admin pentru conținutul public (B2 §6.2, §6.3; B4): comunicate, Ghidul Primăriei, Apelul rapid.
// Fiecare colecție cere permisiunea ei; fiecare modificare este auditată (B4 §5).
// Răspunsuri: creare → 201 { id }; modificare / ștergere / ordonare → 204. Frontend-ul reîncarcă
// explicit după o mutație (B2 §7), fără UI optimist.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { z } from 'zod';
import {
  adminAnnouncementsQuery,
  announcementCreateRequest,
  announcementStatusRequest,
  announcementUpdateRequest,
  audienceRequest,
  departmentCreateRequest,
  departmentUpdateRequest,
  idSchema,
  institutionUpdateRequest,
  linkCreateRequest,
  linkUpdateRequest,
  orderRequest,
  quickDialCategoryCreateRequest,
  quickDialCategoryUpdateRequest,
  quickDialContactCreateRequest,
  quickDialContactUpdateRequest,
  scheduleRequest,
  serviceCreateRequest,
  serviceUpdateRequest,
  toggleRequest,
  hasPermission,
  type AnnouncementStatus,
  type Permission,
} from '@tmc/shared';
import { writeAudit } from '../audit.ts';
import { requestIpHash, requireAdmin } from '../auth/guards.ts';
import {
  decodeCursor,
  getAnnouncementRow,
  listAnnouncements,
  loadDirectory,
  loadQuickDial,
  toAdminAnnouncement,
} from '../content.ts';
import type { AppContext } from '../context.ts';
import { apiError } from '../errors.ts';
import { newId } from '../ids.ts';
import { parseBody } from '../validation.ts';

type Row = Record<string, unknown>;

const notFound = (reply: FastifyReply) => reply.code(404).send(apiError('NOT_FOUND', 'Resursa nu a fost găsită.'));
const invalid = (reply: FastifyReply, fields: Record<string, string>) =>
  reply.code(422).send(apiError('VALIDATION', 'Datele trimise nu sunt valide.', { fields }));
const conflict = (reply: FastifyReply, message: string) => reply.code(409).send(apiError('CONFLICT', message));

const statusPermission = (s: AnnouncementStatus): Permission =>
  s === 'published' ? 'announcements.publish' : 'announcements.disable';

const toDate = (v: string | null | undefined) => (v === undefined ? undefined : v === null ? null : new Date(v));

/** Coloanele din câmpurile camelCase trimise (numai cele prezente). */
function columns(body: Record<string, unknown>, map: Record<string, string>, transform: Record<string, (v: unknown) => unknown> = {}) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    const col = map[k];
    if (!col || v === undefined) continue;
    out[col] = transform[k] ? transform[k](v) : v;
  }
  return out;
}

const VERIFY_MAP = { verifiedAt: 'verified_at', verifiedSource: 'verified_source' };
const VERIFY_TX = { verifiedAt: (v: unknown) => toDate(v as string | null) };

export function registerAdminContentRoutes(api: FastifyInstance, ctx: AppContext): void {
  const audit = (request: FastifyRequest, action: string, targetType: string, targetId: string | null, details?: Row) =>
    writeAudit(ctx.pool, ctx.now(), {
      actorType: 'admin',
      actorUserId: request.admin!.user.id,
      action,
      targetType,
      targetId,
      details: details ?? null,
      ipHash: requestIpHash(ctx, request),
    });

  const images = () => ctx.announcementImages ?? new Set<string>();
  const findAnnouncement = async (id: string) => (idSchema.safeParse(id).success ? getAnnouncementRow(ctx.pool, id) : null);

  // ——————————————————— comunicate (B2 §6.2) ———————————————————

  const ANN_MAP: Record<string, string> = {
    type: 'type', title: 'title', summary: 'summary', content: 'content', author: 'author', category: 'category',
    imageUrl: 'image_url', isUrgent: 'is_urgent', expiresAt: 'expires_at', status: 'status',
    eventDate: 'event_date', eventTime: 'event_time', eventLocation: 'event_location', eventOrganizer: 'event_organizer',
  };
  const ANN_TX = { expiresAt: (v: unknown) => toDate(v as string | null) };

  /** Câmpurile care nu aparțin tipului sunt golite (regula formularului actual, 5B). */
  function normalizeAnnouncement(cols: Row, type: string) {
    if (type !== 'event') Object.assign(cols, { event_date: null, event_time: null, event_location: null, event_organizer: null });
    if (type !== 'notification') cols.is_urgent = false;
    return cols;
  }

  api.get('/admin/announcements', { preHandler: requireAdmin(ctx, { permission: 'announcements.view' }) }, async (request, reply) => {
    const parsed = adminAnnouncementsQuery.safeParse(request.query ?? {});
    const cursor = parsed.success ? decodeCursor(parsed.data.cursor) : 'invalid';
    if (!parsed.success || cursor === 'invalid') return reply.code(400).send(apiError('BAD_REQUEST', 'Parametri invalizi.'));
    const page = await listAnnouncements(ctx.pool, {
      now: ctx.now(), publicOnly: false, type: parsed.data.type, status: parsed.data.status, limit: parsed.data.limit, cursor,
    });
    return { items: page.items.map(toAdminAnnouncement), nextCursor: page.nextCursor };
  });

  /** T-C9: lista imaginilor publicate, pentru câmpul imaginii din Admin. */
  api.get('/admin/announcements/images', { preHandler: requireAdmin(ctx, { permission: 'announcements.view' }) }, async () => ({
    items: [...images()],
  }));

  api.post('/admin/announcements', { preHandler: requireAdmin(ctx, { permission: 'announcements.create' }) }, async (request, reply) => {
    const body = parseBody(announcementCreateRequest, request, reply);
    if (!body) return reply;
    const status = body.status ?? 'published';
    if (!hasPermission(request.admin!.user.role, statusPermission(status))) {
      return reply.code(403).send(apiError('FORBIDDEN', 'Nu aveți permisiunea pentru această operație.'));
    }
    if (body.imageUrl && !images().has(body.imageUrl)) return invalid(reply, { imageUrl: 'imagine nepublicată' });
    const now = ctx.now();
    const id = newId(now);
    const actor = request.admin!.user.id;
    const cols = normalizeAnnouncement(
      { ...columns({ ...body, status }, ANN_MAP, ANN_TX), id, published_at: now, is_demo: false, created_at: now, created_by: actor, updated_at: now, updated_by: actor },
      body.type,
    );
    cols.is_urgent ??= false;
    await ctx.pool.query('INSERT INTO announcements SET ?', [cols]);
    await audit(request, 'announcement.create', 'announcement', id, { status, type: body.type });
    return reply.code(201).send({ id });
  });

  api.patch<{ Params: { id: string } }>(
    '/admin/announcements/:id',
    { preHandler: requireAdmin(ctx, { permission: 'announcements.edit' }) },
    async (request, reply) => {
      const body = parseBody(announcementUpdateRequest, request, reply);
      if (!body) return reply;
      const current = await findAnnouncement(request.params.id);
      if (!current) return notFound(reply);
      if (body.status && body.status !== current.status && !hasPermission(request.admin!.user.role, statusPermission(body.status))) {
        return reply.code(403).send(apiError('FORBIDDEN', 'Nu aveți permisiunea pentru această operație.'));
      }
      const type = body.type ?? (current.type as string);
      const eventDate = body.eventDate !== undefined ? body.eventDate : current.event_date;
      if (type === 'event' && !eventDate) return invalid(reply, { eventDate: 'data evenimentului este obligatorie' });
      if (body.imageUrl && !images().has(body.imageUrl)) return invalid(reply, { imageUrl: 'imagine nepublicată' });
      const now = ctx.now();
      const cols = columns(body, ANN_MAP, ANN_TX);
      if (body.type !== undefined) normalizeAnnouncement(cols, type);
      await ctx.pool.query('UPDATE announcements SET ? WHERE id = ?', [
        { ...cols, updated_at: now, updated_by: request.admin!.user.id },
        current.id,
      ]);
      await audit(request, 'announcement.update', 'announcement', String(current.id), { fields: Object.keys(body) });
      return reply.code(204).send();
    },
  );

  api.patch<{ Params: { id: string } }>(
    '/admin/announcements/:id/status',
    { preHandler: requireAdmin(ctx) },
    async (request, reply) => {
      const body = parseBody(announcementStatusRequest, request, reply);
      if (!body) return reply;
      if (!hasPermission(request.admin!.user.role, statusPermission(body.status))) {
        return reply.code(403).send(apiError('FORBIDDEN', 'Nu aveți permisiunea pentru această operație.'));
      }
      const current = await findAnnouncement(request.params.id);
      if (!current) return notFound(reply);
      if (current.status !== body.status) {
        await ctx.pool.query('UPDATE announcements SET status = ?, updated_at = ?, updated_by = ? WHERE id = ?', [
          body.status, ctx.now(), request.admin!.user.id, current.id,
        ]);
        await audit(request, 'announcement.status', 'announcement', String(current.id), { from: current.status, to: body.status });
      }
      return reply.code(204).send();
    },
  );

  // ——————————————————— Ghidul Primăriei (B2 §6.3) ———————————————————

  api.get('/admin/directory', { preHandler: requireAdmin(ctx, { permission: 'directory.view' }) }, async () =>
    loadDirectory(ctx.pool, false),
  );

  const INST_MAP: Record<string, string> = {
    institutionName: 'institution_name', shortName: 'short_name', county: 'county', address: 'address',
    postalCode: 'postal_code', primaryPhone: 'primary_phone', secondaryPhone: 'secondary_phone', fax: 'fax',
    primaryEmail: 'primary_email', registryEmail: 'registry_email', websiteUrl: 'website_url', ...VERIFY_MAP,
  };
  const INST_REQUIRED = ['institutionName', 'shortName', 'county', 'address', 'postalCode', 'primaryPhone', 'primaryEmail', 'websiteUrl'];

  const institutionExists = async () =>
    ((await ctx.pool.query('SELECT id FROM directory_institution WHERE id = 1'))[0] as Row[]).length > 0;

  api.patch(
    '/admin/directory/institution',
    { preHandler: requireAdmin(ctx, { permission: 'directory.institution.edit' }) },
    async (request, reply) => {
      const body = parseBody(institutionUpdateRequest, request, reply);
      if (!body) return reply;
      const now = ctx.now();
      const cols = { ...columns(body, INST_MAP, VERIFY_TX), updated_at: now, updated_by: request.admin!.user.id };
      if (await institutionExists()) {
        await ctx.pool.query('UPDATE directory_institution SET ? WHERE id = 1', [cols]);
      } else {
        // prima completare (fără date demo, de ex. în producție): se cer toate câmpurile obligatorii
        const missing = INST_REQUIRED.filter((k) => !(body as Row)[k]);
        if (missing.length) return invalid(reply, Object.fromEntries(missing.map((k) => [k, 'câmp obligatoriu'])));
        await ctx.pool.query('INSERT INTO directory_institution SET ?', [
          { ...cols, id: 1, schedule: '[]', audience_schedule: '[]', is_demo: false },
        ]);
      }
      await audit(request, 'directory.institution.update', 'directory', 'institution', { fields: Object.keys(body) });
      return reply.code(204).send();
    },
  );

  for (const [path, column, schema] of [
    ['schedule', 'schedule', scheduleRequest],
    ['audience', 'audience_schedule', audienceRequest],
  ] as const) {
    api.put(`/admin/directory/${path}`, { preHandler: requireAdmin(ctx, { permission: 'directory.schedule.manage' }) }, async (request, reply) => {
      const body = parseBody(schema as z.ZodType<{ items: unknown[] }>, request, reply);
      if (!body) return reply;
      if (!(await institutionExists())) return conflict(reply, 'Completați întâi datele instituției.');
      await ctx.pool.query(`UPDATE directory_institution SET ${column} = ?, updated_at = ?, updated_by = ? WHERE id = 1`, [
        JSON.stringify(body.items), ctx.now(), request.admin!.user.id,
      ]);
      await audit(request, `directory.${path}.update`, 'directory', path, { count: body.items.length });
      return reply.code(204).send();
    });
  }

  // ——— colecțiile ordonate (direcții, servicii, linkuri, categorii, contacte) ———

  type Collection = {
    base: string;
    table: string;
    permission: Permission;
    target: string;
    create: z.ZodType;
    update: z.ZodType;
    map: Record<string, string>;
    tx?: Record<string, (v: unknown) => unknown>;
    /** câmp → tabelul-părinte care trebuie să existe */
    parent?: { field: string; table: string };
    /** ștergere refuzată (409) dacă există copii */
    children?: { table: string; column: string; message: string };
    toggle: boolean;
  };

  const collections: Collection[] = [
    {
      base: '/admin/directory/departments', table: 'directory_departments', permission: 'directory.departments.manage',
      target: 'department', create: departmentCreateRequest, update: departmentUpdateRequest,
      map: { name: 'name', description: 'description', location: 'location', phone: 'phone', email: 'email', schedule: 'schedule', headOfDepartment: 'head_of_department', isActive: 'is_active', ...VERIFY_MAP },
      children: { table: 'directory_services', column: 'department_id', message: 'Direcția are servicii; mutați sau ștergeți întâi serviciile.' },
      toggle: true,
    },
    {
      base: '/admin/directory/services', table: 'directory_services', permission: 'directory.services.manage',
      target: 'service', create: serviceCreateRequest, update: serviceUpdateRequest,
      map: { departmentId: 'department_id', title: 'title', description: 'description', documentsRequired: 'documents_required', processingTime: 'processing_time', fee: 'fee', onlineLink: 'online_link', isActive: 'is_active', ...VERIFY_MAP },
      tx: { documentsRequired: (v) => (v === null ? null : JSON.stringify(v)) },
      parent: { field: 'departmentId', table: 'directory_departments' },
      toggle: true,
    },
    {
      base: '/admin/directory/links', table: 'directory_links', permission: 'directory.links.manage',
      target: 'link', create: linkCreateRequest, update: linkUpdateRequest,
      map: { title: 'title', description: 'description', url: 'url', category: 'category', isExternal: 'is_external', isActive: 'is_active', ...VERIFY_MAP },
      toggle: true,
    },
    {
      base: '/admin/quickdial/categories', table: 'quickdial_categories', permission: 'quickDial.categories.manage',
      target: 'quickdial_category', create: quickDialCategoryCreateRequest, update: quickDialCategoryUpdateRequest,
      map: { name: 'name', description: 'description', isActive: 'is_active', ...VERIFY_MAP },
      children: { table: 'quickdial_contacts', column: 'category_id', message: 'Categoria are contacte; mutați sau ștergeți întâi contactele.' },
      toggle: false,
    },
    {
      base: '/admin/quickdial/contacts', table: 'quickdial_contacts', permission: 'quickDial.contacts.manage',
      target: 'quickdial_contact', create: quickDialContactCreateRequest, update: quickDialContactUpdateRequest,
      map: { categoryId: 'category_id', name: 'name', phone: 'phone', formattedPhone: 'formatted_phone', shortDescription: 'short_description', availability: 'availability', isEmergency: 'is_emergency', address: 'address', isActive: 'is_active', ...VERIFY_MAP },
      parent: { field: 'categoryId', table: 'quickdial_categories' },
      toggle: true,
    },
  ];

  for (const col of collections) {
    const guard = requireAdmin(ctx, { permission: col.permission });
    const tx = { ...VERIFY_TX, ...(col.tx ?? {}) };
    const exists = async (table: string, id: string) =>
      idSchema.safeParse(id).success &&
      ((await ctx.pool.query(`SELECT id FROM ${table} WHERE id = ?`, [id]))[0] as Row[]).length > 0;
    const parentMissing = async (body: Row) =>
      col.parent && body[col.parent.field] !== undefined && !(await exists(col.parent.table, String(body[col.parent.field])));

    api.post(col.base, { preHandler: guard }, async (request, reply) => {
      const body = parseBody(col.create, request, reply) as Row | undefined;
      if (!body) return reply;
      if (await parentMissing(body)) return invalid(reply, { [col.parent!.field]: 'element inexistent' });
      const now = ctx.now();
      const id = newId(now);
      const [[max]] = (await ctx.pool.query(`SELECT COALESCE(MAX(sort_order), 0) AS m FROM ${col.table}`)) as unknown as [[{ m: number }]];
      await ctx.pool.query(`INSERT INTO ${col.table} SET ?`, [
        { ...columns(body, col.map, tx), id, sort_order: Number(max.m) + 1, is_demo: false, created_at: now, updated_at: now },
      ]);
      await audit(request, `${col.target}.create`, col.target, id);
      return reply.code(201).send({ id });
    });

    api.patch<{ Params: { id: string } }>(`${col.base}/:id`, { preHandler: guard }, async (request, reply) => {
      const body = parseBody(col.update, request, reply) as Row | undefined;
      if (!body) return reply;
      if (!(await exists(col.table, request.params.id))) return notFound(reply);
      if (await parentMissing(body)) return invalid(reply, { [col.parent!.field]: 'element inexistent' });
      await ctx.pool.query(`UPDATE ${col.table} SET ? WHERE id = ?`, [
        { ...columns(body, col.map, tx), updated_at: ctx.now() },
        request.params.id,
      ]);
      await audit(request, `${col.target}.update`, col.target, request.params.id, { fields: Object.keys(body) });
      return reply.code(204).send();
    });

    api.delete<{ Params: { id: string } }>(`${col.base}/:id`, { preHandler: guard }, async (request, reply) => {
      if (!(await exists(col.table, request.params.id))) return notFound(reply);
      if (col.children) {
        const [kids] = await ctx.pool.query(`SELECT 1 FROM ${col.children.table} WHERE ${col.children.column} = ? LIMIT 1`, [request.params.id]);
        if ((kids as Row[]).length > 0) return conflict(reply, col.children.message);
      }
      await ctx.pool.query(`DELETE FROM ${col.table} WHERE id = ?`, [request.params.id]);
      await audit(request, `${col.target}.delete`, col.target, request.params.id);
      return reply.code(204).send();
    });

    if (col.toggle) {
      api.patch<{ Params: { id: string } }>(`${col.base}/:id/toggle`, { preHandler: guard }, async (request, reply) => {
        const body = parseBody(toggleRequest, request, reply);
        if (!body) return reply;
        if (!(await exists(col.table, request.params.id))) return notFound(reply);
        await ctx.pool.query(`UPDATE ${col.table} SET is_active = ?, updated_at = ? WHERE id = ?`, [body.isActive, ctx.now(), request.params.id]);
        await audit(request, `${col.target}.toggle`, col.target, request.params.id, { isActive: body.isActive });
        return reply.code(204).send();
      });
    }

    /** Ordinea completă: lista trebuie să conțină exact toate ID-urile colecției. */
    api.put(`${col.base}/order`, { preHandler: guard }, async (request, reply) => {
      const body = parseBody(orderRequest, request, reply);
      if (!body) return reply;
      const [rows] = await ctx.pool.query(`SELECT id FROM ${col.table}`);
      const all = new Set((rows as Array<{ id: string }>).map((r) => r.id));
      const given = new Set(body.ids);
      if (given.size !== body.ids.length || given.size !== all.size || body.ids.some((id) => !all.has(id))) {
        return invalid(reply, { ids: 'lista trebuie să conțină exact toate elementele, o singură dată' });
      }
      const conn = await ctx.pool.getConnection();
      try {
        await conn.beginTransaction();
        const now = ctx.now();
        for (const [i, id] of body.ids.entries()) {
          await conn.query(`UPDATE ${col.table} SET sort_order = ?, updated_at = ? WHERE id = ?`, [i + 1, now, id]);
        }
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
      await audit(request, `${col.target}.reorder`, col.target, null, { count: body.ids.length });
      return reply.code(204).send();
    });
  }

  // ——————————————————— Apelul rapid (B2 §6.3) ———————————————————

  api.get('/admin/quickdial', { preHandler: requireAdmin(ctx, { permission: 'quickDial.view' }) }, async () =>
    loadQuickDial(ctx.pool, false),
  );
}
