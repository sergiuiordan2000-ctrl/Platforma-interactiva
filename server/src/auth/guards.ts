// Verificările comune: CSRF (B3 §3), sesiunea Admin / cetățean, permisiunile (B4).

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { hasPermission, isSuperAdmin, type AdminRole, type Permission } from '@tmc/shared';
import type { AppContext } from '../context.ts';
import { apiError } from '../errors.ts';
import { ipHash } from './crypto.ts';
import { loadSession, setSessionCookie, tokenFromRequest, type SessionRow } from './sessions.ts';

export type AdminUserRow = {
  id: string;
  email: string;
  display_name: string;
  role: AdminRole;
  status: 'active' | 'disabled';
  password_hash: string;
  must_change_password: number;
  failed_login_count: number;
  locked_until: Date | null;
  totp_secret_enc: Buffer | null;
  totp_enabled_at: Date | null;
  totp_last_step: number | null;
};

export type AdminPrincipal = { session: SessionRow; user: AdminUserRow };
export type CitizenPrincipal = { session: SessionRow; account: { id: string; email: string; email_normalized: string; status: 'pending' | 'active' } };

declare module 'fastify' {
  interface FastifyRequest {
    admin?: AdminPrincipal;
    citizen?: CitizenPrincipal;
  }
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** CSRF: antetul `X-Civic-Request: 1` + `Origin` (dacă există) egal cu originea publică. */
export function registerCsrf(app: FastifyInstance, ctx: AppContext): void {
  const origin = new URL(ctx.config.publicBaseUrl).origin;
  app.addHook('onRequest', async (request, reply) => {
    if (!MUTATING.has(request.method) || !request.url.startsWith('/api/')) return;
    const header = request.headers['x-civic-request'];
    const reqOrigin = request.headers.origin;
    if (header !== '1' || (reqOrigin !== undefined && reqOrigin !== origin)) {
      return reply.code(403).send(apiError('CSRF', 'Cererea a fost respinsă.'));
    }
  });
}

export const requestIpHash = (ctx: AppContext, request: FastifyRequest) =>
  ipHash(ctx.config.secrets.ipHash, request.ip ?? '', ctx.now());

const unauthorized = (reply: FastifyReply) =>
  reply.code(401).send(apiError('UNAUTHENTICATED', 'Autentificare necesară.'));
const forbidden = (reply: FastifyReply, code = 'FORBIDDEN', message = 'Nu aveți permisiunea pentru această operație.') =>
  reply.code(403).send(apiError(code, message));

export async function loadAdmin(ctx: AppContext, request: FastifyRequest): Promise<AdminPrincipal | null> {
  const session = await loadSession(ctx, request);
  if (!session || session.principal_type !== 'admin' || !session.user_id) return null;
  const [rows] = await ctx.pool.query('SELECT * FROM admin_users WHERE id = ?', [session.user_id]);
  const user = (rows as AdminUserRow[])[0];
  if (!user || user.status !== 'active') return null;
  return { session, user };
}

type AdminGuard = {
  permission?: Permission;
  superAdminOnly?: boolean;
  /** pașii TOTP (sesiune pre-MFA) */
  allowPendingMfa?: boolean;
  /** schimbarea parolei, me, logout */
  allowMustChangePassword?: boolean;
};

export function requireAdmin(ctx: AppContext, opts: AdminGuard = {}) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const principal = await loadAdmin(ctx, request);
    if (!principal) return unauthorized(reply);
    if (principal.session.mfa_state === 'pending' && !opts.allowPendingMfa) {
      return forbidden(reply, 'MFA_REQUIRED', 'Este necesar codul de autentificare (TOTP).');
    }
    if (principal.user.must_change_password && !opts.allowMustChangePassword) {
      return forbidden(reply, 'PASSWORD_CHANGE_REQUIRED', 'Schimbați parola înainte de a continua.');
    }
    if (opts.permission && !hasPermission(principal.user.role, opts.permission)) return forbidden(reply);
    if (opts.superAdminOnly && !isSuperAdmin(principal.user.role)) return forbidden(reply);
    request.admin = principal;
  };
}

export async function loadCitizen(ctx: AppContext, request: FastifyRequest): Promise<CitizenPrincipal | null> {
  const session = await loadSession(ctx, request);
  if (!session || session.principal_type !== 'citizen' || !session.citizen_account_id) return null;
  const [rows] = await ctx.pool.query(
    'SELECT id, email, email_normalized, status FROM citizen_accounts WHERE id = ?',
    [session.citizen_account_id],
  );
  const account = (rows as CitizenPrincipal['account'][])[0];
  if (!account || account.status !== 'active') return null;
  return { session, account };
}

/**
 * Amendamentul 5.5 (ferestre de parolă repetate pe staging): `GET /auth/me?optional=1` și
 * `GET /citizen/me?optional=1` răspund 200 `{ authenticated: false }` în loc de 401 când nu există
 * sesiune. Motiv: serverul web (LiteSpeed, Directory Privacy) adaugă `WWW-Authenticate: Basic` la orice
 * 401, iar browserul cere din nou parola lacătului. Fără `optional=1`, comportamentul B2 (401) rămâne.
 */
export function anonymousProbe(
  load: (ctx: AppContext, request: FastifyRequest) => Promise<unknown>,
  ctx: AppContext,
  guard: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>,
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const optional = (request.query as Record<string, unknown> | undefined)?.optional === '1';
    if (optional && !(await load(ctx, request))) return reply.code(200).send({ authenticated: false });
    return guard(request, reply);
  };
}

export function requireCitizen(ctx: AppContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const principal = await loadCitizen(ctx, request);
    if (!principal) return unauthorized(reply);
    request.citizen = principal;
    // cookie persistent reînnoit la folosire (decizia din 30.09.2026, varianta B)
    const token = tokenFromRequest(ctx, request);
    if (token) setSessionCookie(ctx, reply, token, true);
  };
}
