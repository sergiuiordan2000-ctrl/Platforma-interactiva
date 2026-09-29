// Operații pe conturile Admin folosite de CLI și de API.

import type mysql from 'mysql2/promise';
import { newId } from './ids.ts';
import { normalizeEmail, type AdminRole } from '@tmc/shared';
import { writeAudit } from './audit.ts';
import { temporaryPassword } from './auth/crypto.ts';
import { hashPassword } from './auth/password.ts';

export class BootstrapRefusedError extends Error {}

export async function createAdminAccount(
  conn: mysql.Pool | mysql.PoolConnection,
  now: Date,
  input: { email: string; displayName: string; role: AdminRole; createdBy: string | null },
): Promise<{ id: string; temporaryPassword: string }> {
  const id = newId(now);
  const password = temporaryPassword();
  await conn.query(
    `INSERT INTO admin_users (id, email, display_name, role, status, password_hash, must_change_password,
       failed_login_count, created_at, created_by, updated_at)
     VALUES (?, ?, ?, ?, 'active', ?, 1, 0, ?, ?, ?)`,
    [id, normalizeEmail(input.email), input.displayName, input.role, await hashPassword(password), now, input.createdBy, now],
  );
  return { id, temporaryPassword: password };
}

/** D8-5: primul super_admin; refuzat dacă există deja un super_admin activ. */
export async function bootstrapAdmin(
  pool: mysql.Pool,
  now: Date,
  email: string,
  displayName: string,
): Promise<{ id: string; temporaryPassword: string }> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      "SELECT COUNT(*) AS n FROM admin_users WHERE role = 'super_admin' AND status = 'active' FOR UPDATE",
    );
    if (Number((rows as Array<{ n: number }>)[0]!.n) > 0) {
      throw new BootstrapRefusedError('bootstrap-admin refuzat: există deja un super_admin activ.');
    }
    const created = await createAdminAccount(conn, now, { email, displayName, role: 'super_admin', createdBy: null });
    await writeAudit(conn, now, {
      actorType: 'system',
      action: 'account.bootstrap',
      targetType: 'account',
      targetId: created.id,
      details: { role: 'super_admin' },
    });
    await conn.commit();
    return created;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
