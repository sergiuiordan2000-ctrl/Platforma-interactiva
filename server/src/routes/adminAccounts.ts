// Administrarea conturilor Admin (B2 §6.5, D8): numai `accounts.manage` (super_admin). Fără ștergere.
// Protecții: nu pe sine (rol, stare, resetarea TOTP); cel puțin un super_admin activ; revocarea sesiunilor.

import type { FastifyInstance } from 'fastify';
import { createAccountRequest, normalizeEmail, updateAccountRequest } from '@tmc/shared';
import { createAdminAccount } from '../accounts.ts';
import { writeAudit } from '../audit.ts';
import type { AppContext } from '../context.ts';
import { apiError } from '../errors.ts';
import { requestIpHash, requireAdmin, type AdminUserRow } from '../auth/guards.ts';
import { temporaryPassword } from '../auth/crypto.ts';
import { hashPassword } from '../auth/password.ts';
import { revokeUserSessions } from '../auth/sessions.ts';
import { parseBody } from '../validation.ts';

type AccountRow = AdminUserRow & { created_at: Date; last_login_at: Date | null };

const view = (u: AccountRow) => ({
  id: u.id,
  email: u.email,
  displayName: u.display_name,
  role: u.role,
  status: u.status,
  mfaEnabled: Boolean(u.totp_enabled_at),
  mustChangePassword: Boolean(u.must_change_password),
  createdAt: u.created_at,
  lastLoginAt: u.last_login_at,
});

export function registerAdminAccountRoutes(api: FastifyInstance, ctx: AppContext): void {
  const manage = requireAdmin(ctx, { permission: 'accounts.manage' });

  api.get('/admin/accounts', { preHandler: manage }, async () => {
    const [rows] = await ctx.pool.query('SELECT * FROM admin_users ORDER BY created_at');
    return { items: (rows as AccountRow[]).map(view) };
  });

  /** Numai `{ id, displayName }`, pentru afișarea responsabililor (B2 §6.5). */
  api.get('/admin/accounts/directory', { preHandler: requireAdmin(ctx, { permission: 'reports.view' }) }, async () => {
    const [rows] = await ctx.pool.query('SELECT id, display_name AS displayName FROM admin_users ORDER BY display_name');
    return { items: rows };
  });

  api.post('/admin/accounts', { preHandler: manage }, async (request, reply) => {
    const body = parseBody(createAccountRequest, request, reply);
    if (!body) return reply;
    const actor = request.admin!.user;
    const [dup] = await ctx.pool.query('SELECT id FROM admin_users WHERE email = ?', [normalizeEmail(body.email)]);
    if ((dup as unknown[]).length > 0) return reply.code(409).send(apiError('CONFLICT', 'Există deja un cont cu această adresă.'));
    const created = await createAdminAccount(ctx.pool, ctx.now(), { ...body, createdBy: actor.id });
    await writeAudit(ctx.pool, ctx.now(), {
      actorType: 'admin', actorUserId: actor.id, action: 'account.create', targetType: 'account', targetId: created.id,
      details: { role: body.role }, ipHash: requestIpHash(ctx, request),
    });
    return reply.code(201).send({ id: created.id, temporaryPassword: created.temporaryPassword });
  });

  api.patch<{ Params: { id: string } }>('/admin/accounts/:id', { preHandler: manage }, async (request, reply) => {
    const body = parseBody(updateAccountRequest, request, reply);
    if (!body) return reply;
    const actor = request.admin!.user;
    const id = request.params.id;
    if (id === actor.id && (body.role !== undefined || body.status !== undefined)) {
      return reply.code(403).send(apiError('SELF_CHANGE', 'Nu vă puteți schimba propriul rol sau propria stare.'));
    }
    const conn = await ctx.pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.query('SELECT * FROM admin_users WHERE id = ? FOR UPDATE', [id]);
      const target = (rows as AccountRow[])[0];
      if (!target) {
        await conn.rollback();
        return reply.code(404).send(apiError('NOT_FOUND', 'Contul nu există.'));
      }
      const losesSuperAdmin =
        target.role === 'super_admin' &&
        target.status === 'active' &&
        ((body.role !== undefined && body.role !== 'super_admin') || body.status === 'disabled');
      if (losesSuperAdmin) {
        const [cnt] = await conn.query(
          "SELECT COUNT(*) AS n FROM admin_users WHERE role = 'super_admin' AND status = 'active' FOR UPDATE",
        );
        if (Number((cnt as Array<{ n: number }>)[0]!.n) <= 1) {
          await conn.rollback();
          return reply.code(409).send(apiError('LAST_SUPER_ADMIN', 'Trebuie să rămână cel puțin un administrator principal (super_admin) activ.'));
        }
      }
      const now = ctx.now();
      const sets: string[] = ['updated_at = ?'];
      const params: unknown[] = [now];
      if (body.displayName !== undefined) { sets.push('display_name = ?'); params.push(body.displayName); }
      if (body.role !== undefined) { sets.push('role = ?'); params.push(body.role); }
      if (body.status !== undefined) {
        sets.push('status = ?', 'disabled_at = ?', 'disabled_by = ?');
        params.push(body.status, body.status === 'disabled' ? now : null, body.status === 'disabled' ? actor.id : null);
      }
      await conn.query(`UPDATE admin_users SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
      const roleChanged = body.role !== undefined && body.role !== target.role;
      if (roleChanged || body.status === 'disabled') {
        await revokeUserSessions(ctx, conn, id, roleChanged ? 'role_changed' : 'disabled');
      }
      const details: Record<string, unknown> = {};
      if (body.displayName !== undefined) details.displayName = { from: target.display_name, to: body.displayName };
      if (body.role !== undefined) details.role = { from: target.role, to: body.role };
      if (body.status !== undefined) details.status = { from: target.status, to: body.status };
      await writeAudit(conn, now, {
        actorType: 'admin', actorUserId: actor.id, action: 'account.update', targetType: 'account', targetId: id,
        details, ipHash: requestIpHash(ctx, request),
      });
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    const [after] = await ctx.pool.query('SELECT * FROM admin_users WHERE id = ?', [id]);
    return view((after as AccountRow[])[0]!);
  });

  api.post<{ Params: { id: string } }>('/admin/accounts/:id/reset-password', { preHandler: manage }, async (request, reply) => {
    const actor = request.admin!.user;
    const id = request.params.id;
    if (id === actor.id) return reply.code(403).send(apiError('SELF_CHANGE', 'Folosiți schimbarea parolei pentru propriul cont.'));
    const password = temporaryPassword();
    const [res] = await ctx.pool.query(
      `UPDATE admin_users SET password_hash = ?, must_change_password = 1, failed_login_count = 0, locked_until = NULL,
         updated_at = ? WHERE id = ?`,
      [await hashPassword(password), ctx.now(), id],
    );
    if ((res as { affectedRows: number }).affectedRows !== 1) return reply.code(404).send(apiError('NOT_FOUND', 'Contul nu există.'));
    await revokeUserSessions(ctx, ctx.pool, id, 'password_reset');
    await writeAudit(ctx.pool, ctx.now(), {
      actorType: 'admin', actorUserId: actor.id, action: 'account.password.reset', targetType: 'account', targetId: id,
      ipHash: requestIpHash(ctx, request),
    });
    return { temporaryPassword: password };
  });

  /** 2.15-B: resetarea TOTP a ALTUI cont; revocă sesiunile și codurile de recuperare. */
  api.post<{ Params: { id: string } }>('/admin/accounts/:id/reset-mfa', { preHandler: manage }, async (request, reply) => {
    const actor = request.admin!.user;
    const id = request.params.id;
    if (id === actor.id) return reply.code(403).send(apiError('SELF_CHANGE', 'Propriul TOTP nu se resetează de aici.'));
    const [res] = await ctx.pool.query(
      'UPDATE admin_users SET totp_secret_enc = NULL, totp_enabled_at = NULL, totp_last_step = NULL, updated_at = ? WHERE id = ?',
      [ctx.now(), id],
    );
    if ((res as { affectedRows: number }).affectedRows !== 1) return reply.code(404).send(apiError('NOT_FOUND', 'Contul nu există.'));
    await ctx.pool.query('DELETE FROM admin_recovery_codes WHERE user_id = ?', [id]);
    await revokeUserSessions(ctx, ctx.pool, id, 'mfa_reset');
    await writeAudit(ctx.pool, ctx.now(), {
      actorType: 'admin', actorUserId: actor.id, action: 'account.mfa.reset', targetType: 'account', targetId: id,
      ipHash: requestIpHash(ctx, request),
    });
    return reply.code(204).send();
  });

  /** Auditul administrativ (`audit.view`), paginat descrescător. */
  api.get<{ Querystring: { actor?: string; action?: string; cursor?: string; limit?: string } }>(
    '/admin/audit',
    { preHandler: requireAdmin(ctx, { permission: 'audit.view' }) },
    async (request) => {
      const q = request.query;
      const limit = Math.min(Math.max(Number(q.limit) || 50, 1), 100);
      const where: string[] = [];
      const params: unknown[] = [];
      if (q.actor) { where.push('actor_user_id = ?'); params.push(q.actor); }
      if (q.action) { where.push('action = ?'); params.push(q.action); }
      if (q.cursor && /^\d+$/.test(q.cursor)) { where.push('id < ?'); params.push(Number(q.cursor)); }
      const [rows] = await ctx.pool.query(
        `SELECT id, occurred_at AS occurredAt, actor_type AS actorType, actor_user_id AS actorUserId, action,
           target_type AS targetType, target_id AS targetId, details
         FROM audit_log ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC LIMIT ?`,
        [...params, limit + 1],
      );
      const items = rows as Array<{ id: number }>;
      const nextCursor = items.length > limit ? String(items[limit - 1]!.id) : null;
      return { items: items.slice(0, limit), nextCursor };
    },
  );
}
