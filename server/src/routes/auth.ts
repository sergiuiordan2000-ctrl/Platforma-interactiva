// Autentificarea Admin (B2 §5, B3 §1–§7): parolă → TOTP (super_admin obligatoriu) → schimbarea parolei.

import { randomBytes } from 'node:crypto';
import { newId } from '../ids.ts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  changePasswordRequest,
  loginRequest,
  normalizeEmail,
  permissionsForRole,
  recoveryCodeRequest,
  totpCodeRequest,
} from '@tmc/shared';
import { writeAudit } from '../audit.ts';
import { LIMITS, type AppContext } from '../context.ts';
import { apiError } from '../errors.ts';
import { decryptSecret, deriveKey, encryptSecret, hmacHex } from '../auth/crypto.ts';
import { anonymousProbe, loadAdmin, requestIpHash, requireAdmin, type AdminPrincipal, type AdminUserRow } from '../auth/guards.ts';
import { dummyVerify, hashPassword, needsRehash, passwordPolicyError, verifyPassword } from '../auth/password.ts';
import { hitRateLimit, recordRejected } from '../auth/rateLimit.ts';
import {
  clearSessionCookie,
  createSession,
  revokeSession,
  revokeUserSessions,
  setSessionCookie,
} from '../auth/sessions.ts';
import { newTotpSecret, otpauthUri, verifyTotp } from '../auth/totp.ts';
import { parseBody } from '../validation.ts';

const GENERIC_LOGIN_ERROR = 'E-mail sau parolă incorecte.';

export function recoveryCodeHash(ctx: AppContext, code: string): string {
  return hmacHex(deriveKey(ctx.config.secrets.totpEncKey, 'recovery-codes'), code.replace(/[\s-]/g, '').toLowerCase());
}

/** Coduri de recuperare (2.15-A): afișate o singură dată; în DB numai HMAC; setul nou îl invalidează pe cel vechi. */
export async function issueRecoveryCodes(ctx: AppContext, userId: string): Promise<string[]> {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const codes: string[] = [];
  for (let i = 0; i < LIMITS.recoveryCodes; i++) {
    const bytes = randomBytes(12);
    const raw = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`);
  }
  const conn = await ctx.pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM admin_recovery_codes WHERE user_id = ?', [userId]);
    const now = ctx.now();
    for (const code of codes) {
      await conn.query(
        'INSERT INTO admin_recovery_codes (id, user_id, code_hash, used_at, created_at) VALUES (?, ?, ?, NULL, ?)',
        [newId(now), userId, recoveryCodeHash(ctx, code), now],
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  return codes;
}

async function completeLogin(ctx: AppContext, request: FastifyRequest, reply: FastifyReply, p: AdminPrincipal, how: string) {
  await revokeSession(ctx, p.session.id, 'rotated');
  const token = await createSession(ctx, ctx.pool, { type: 'admin', userId: p.user.id, mfaState: 'verified' }, request);
  setSessionCookie(ctx, reply, token);
  await ctx.pool.query('UPDATE admin_users SET last_login_at = ? WHERE id = ?', [ctx.now(), p.user.id]);
  await writeAudit(ctx.pool, ctx.now(), {
    actorType: 'admin',
    actorUserId: p.user.id,
    action: 'auth.login',
    targetType: 'account',
    targetId: p.user.id,
    details: { method: how },
    ipHash: requestIpHash(ctx, request),
  });
}

function mfaMode(user: AdminUserRow): 'required' | 'enroll' | 'none' {
  if (user.totp_enabled_at) return 'required';
  return user.role === 'super_admin' ? 'enroll' : 'none';
}

export function registerAuthRoutes(api: FastifyInstance, ctx: AppContext): void {
  const pendingOnly = requireAdmin(ctx, { allowPendingMfa: true, allowMustChangePassword: true });
  const anySession = pendingOnly;
  const fullAllowMustChange = requireAdmin(ctx, { allowMustChangePassword: true });

  api.post('/auth/login', async (request, reply) => {
    const body = parseBody(loginRequest, request, reply);
    if (!body) return reply;
    const ipH = requestIpHash(ctx, request);
    const attempts = await hitRateLimit(ctx, `login:ip:${ipH}`, LIMITS.loginPerIpWindowMinutes);
    if (attempts > LIMITS.loginPerIp) {
      await recordRejected(ctx, 'login', 'rate_limited', ipH);
      reply.header('Retry-After', String(LIMITS.loginPerIpWindowMinutes * 60));
      return reply.code(429).send(apiError('RATE_LIMITED', 'Prea multe încercări. Reveniți mai târziu.'));
    }
    const [rows] = await ctx.pool.query('SELECT * FROM admin_users WHERE email = ?', [normalizeEmail(body.email)]);
    const user = (rows as AdminUserRow[])[0];
    const fail = async (reason: 'invalid' | 'blocked') => {
      await recordRejected(ctx, 'login', reason, ipH);
      return reply.code(401).send(apiError('INVALID_CREDENTIALS', GENERIC_LOGIN_ERROR));
    };
    if (!user || user.status !== 'active') {
      await dummyVerify(body.password);
      return fail('invalid');
    }
    const now = ctx.now();
    if (user.locked_until && user.locked_until > now) {
      await dummyVerify(body.password);
      return fail('blocked');
    }
    if (!(await verifyPassword(body.password, user.password_hash))) {
      const failures = user.failed_login_count + 1;
      const lock = failures >= LIMITS.loginMaxFailures ? new Date(now.getTime() + LIMITS.loginLockMinutes * 60_000) : null;
      await ctx.pool.query('UPDATE admin_users SET failed_login_count = ?, locked_until = ? WHERE id = ?', [
        lock ? 0 : failures,
        lock,
        user.id,
      ]);
      return fail('invalid');
    }
    const updates: string[] = ['failed_login_count = 0', 'locked_until = NULL'];
    const params: unknown[] = [];
    if (needsRehash(user.password_hash)) {
      updates.push('password_hash = ?');
      params.push(await hashPassword(body.password));
    }
    await ctx.pool.query(`UPDATE admin_users SET ${updates.join(', ')} WHERE id = ?`, [...params, user.id]);

    const mfa = mfaMode(user);
    const token = await createSession(
      ctx,
      ctx.pool,
      { type: 'admin', userId: user.id, mfaState: mfa === 'none' ? 'not_required' : 'pending' },
      request,
    );
    setSessionCookie(ctx, reply, token);
    if (mfa === 'none') {
      await ctx.pool.query('UPDATE admin_users SET last_login_at = ? WHERE id = ?', [now, user.id]);
      await writeAudit(ctx.pool, now, {
        actorType: 'admin', actorUserId: user.id, action: 'auth.login', targetType: 'account', targetId: user.id,
        details: { method: 'password' }, ipHash: ipH,
      });
    }
    return { mfa, mustChangePassword: Boolean(user.must_change_password) };
  });

  api.post('/auth/mfa/verify', { preHandler: pendingOnly }, async (request, reply) => {
    const body = parseBody(totpCodeRequest, request, reply);
    if (!body) return reply;
    const p = request.admin!;
    if (p.session.mfa_state !== 'pending' || !p.user.totp_enabled_at || !p.user.totp_secret_enc) {
      return reply.code(409).send(apiError('MFA_STATE', 'Pasul TOTP nu este disponibil.'));
    }
    const ipH = requestIpHash(ctx, request);
    if ((await hitRateLimit(ctx, `mfa:${p.session.id}`, 5)) > 5) {
      await recordRejected(ctx, 'login', 'rate_limited', ipH);
      return reply.code(429).send(apiError('RATE_LIMITED', 'Prea multe încercări. Reveniți mai târziu.'));
    }
    const secret = decryptSecret(ctx.config.secrets.totpEncKey, p.user.totp_secret_enc);
    const step = verifyTotp(secret, body.code, ctx.now(), p.user.totp_last_step);
    if (step === null) {
      await recordRejected(ctx, 'login', 'invalid', ipH);
      return reply.code(401).send(apiError('INVALID_CODE', 'Cod incorect.'));
    }
    await ctx.pool.query('UPDATE admin_users SET totp_last_step = ? WHERE id = ?', [step, p.user.id]);
    await completeLogin(ctx, request, reply, p, 'totp');
    return { ok: true };
  });

  api.post('/auth/mfa/recovery', { preHandler: pendingOnly }, async (request, reply) => {
    const body = parseBody(recoveryCodeRequest, request, reply);
    if (!body) return reply;
    const p = request.admin!;
    if (p.session.mfa_state !== 'pending' || !p.user.totp_enabled_at) {
      return reply.code(409).send(apiError('MFA_STATE', 'Pasul TOTP nu este disponibil.'));
    }
    const ipH = requestIpHash(ctx, request);
    if ((await hitRateLimit(ctx, `mfa:${p.session.id}`, 5)) > 5) {
      return reply.code(429).send(apiError('RATE_LIMITED', 'Prea multe încercări. Reveniți mai târziu.'));
    }
    const [res] = await ctx.pool.query(
      'UPDATE admin_recovery_codes SET used_at = ? WHERE user_id = ? AND code_hash = ? AND used_at IS NULL',
      [ctx.now(), p.user.id, recoveryCodeHash(ctx, body.code)],
    );
    if ((res as { affectedRows: number }).affectedRows !== 1) {
      await recordRejected(ctx, 'login', 'invalid', ipH);
      return reply.code(401).send(apiError('INVALID_CODE', 'Cod incorect.'));
    }
    await writeAudit(ctx.pool, ctx.now(), {
      actorType: 'admin', actorUserId: p.user.id, action: 'auth.recovery_code.used', targetType: 'account',
      targetId: p.user.id, ipHash: ipH,
    });
    await completeLogin(ctx, request, reply, p, 'recovery_code');
    return { ok: true, recommendation: 'Reconfigurați TOTP și regenerați codurile de recuperare.' };
  });

  api.post('/auth/mfa/enroll/start', { preHandler: pendingOnly }, async (request, reply) => {
    const p = request.admin!;
    if (p.session.mfa_state !== 'pending' || p.user.totp_enabled_at) {
      return reply.code(409).send(apiError('MFA_STATE', 'TOTP este deja configurat.'));
    }
    const secret = newTotpSecret();
    await ctx.pool.query('UPDATE admin_users SET totp_secret_enc = ? WHERE id = ?', [
      encryptSecret(ctx.config.secrets.totpEncKey, secret),
      p.user.id,
    ]);
    return { otpauthUri: otpauthUri(secret, p.user.email), secretBase32: secret };
  });

  api.post('/auth/mfa/enroll/confirm', { preHandler: pendingOnly }, async (request, reply) => {
    const body = parseBody(totpCodeRequest, request, reply);
    if (!body) return reply;
    const p = request.admin!;
    if (p.session.mfa_state !== 'pending' || p.user.totp_enabled_at || !p.user.totp_secret_enc) {
      return reply.code(409).send(apiError('MFA_STATE', 'Porniți întâi configurarea TOTP.'));
    }
    const secret = decryptSecret(ctx.config.secrets.totpEncKey, p.user.totp_secret_enc);
    const step = verifyTotp(secret, body.code, ctx.now(), null);
    if (step === null) return reply.code(401).send(apiError('INVALID_CODE', 'Cod incorect.'));
    await ctx.pool.query('UPDATE admin_users SET totp_enabled_at = ?, totp_last_step = ? WHERE id = ?', [
      ctx.now(),
      step,
      p.user.id,
    ]);
    const recoveryCodes = await issueRecoveryCodes(ctx, p.user.id);
    await writeAudit(ctx.pool, ctx.now(), {
      actorType: 'admin', actorUserId: p.user.id, action: 'auth.mfa.enrolled', targetType: 'account', targetId: p.user.id,
    });
    await completeLogin(ctx, request, reply, p, 'totp_enroll');
    return { recoveryCodes };
  });

  api.post('/auth/mfa/recovery-codes/regenerate', { preHandler: requireAdmin(ctx) }, async (request, reply) => {
    const p = request.admin!;
    if (!p.user.totp_enabled_at) return reply.code(409).send(apiError('MFA_STATE', 'TOTP nu este configurat.'));
    const recoveryCodes = await issueRecoveryCodes(ctx, p.user.id);
    await writeAudit(ctx.pool, ctx.now(), {
      actorType: 'admin', actorUserId: p.user.id, action: 'auth.recovery_codes.regenerated', targetType: 'account',
      targetId: p.user.id,
    });
    return { recoveryCodes };
  });

  api.post('/auth/change-password', { preHandler: fullAllowMustChange }, async (request, reply) => {
    const body = parseBody(changePasswordRequest, request, reply);
    if (!body) return reply;
    const p = request.admin!;
    if (!(await verifyPassword(body.currentPassword, p.user.password_hash))) {
      return reply.code(422).send(apiError('VALIDATION', 'Parola actuală este incorectă.', { fields: { currentPassword: 'incorectă' } }));
    }
    const policy = passwordPolicyError(body.newPassword, p.user.email);
    if (policy) return reply.code(422).send(apiError('VALIDATION', policy, { fields: { newPassword: policy } }));
    if (body.newPassword === body.currentPassword) {
      return reply.code(422).send(apiError('VALIDATION', 'Parola nouă trebuie să fie diferită.', { fields: { newPassword: 'identică' } }));
    }
    await ctx.pool.query('UPDATE admin_users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?', [
      await hashPassword(body.newPassword),
      ctx.now(),
      p.user.id,
    ]);
    await revokeUserSessions(ctx, ctx.pool, p.user.id, 'password_changed', p.session.id);
    await writeAudit(ctx.pool, ctx.now(), {
      actorType: 'admin', actorUserId: p.user.id, action: 'account.password.changed', targetType: 'account', targetId: p.user.id,
    });
    return reply.code(204).send();
  });

  api.post('/auth/logout', async (request, reply) => {
    const p = await loadAdmin(ctx, request);
    if (p) await revokeSession(ctx, p.session.id, 'logout');
    clearSessionCookie(ctx, reply);
    return reply.code(204).send();
  });

  api.get('/auth/me', { preHandler: anonymousProbe(loadAdmin, ctx, anySession) }, async (request) => {
    const { user, session } = request.admin!;
    return {
      id: user.id,
      displayName: user.display_name,
      email: user.email,
      role: user.role,
      permissions: permissionsForRole(user.role),
      mustChangePassword: Boolean(user.must_change_password),
      mfaEnabled: Boolean(user.totp_enabled_at),
      mfaPending: session.mfa_state === 'pending',
    };
  });
}
