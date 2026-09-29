// Auditul administrativ (B4 §5). Fără parole, hash-uri, secrete TOTP sau corpuri de e-mail în `details`.

import type mysql from 'mysql2/promise';

export type AuditEntry = {
  actorType: 'admin' | 'system';
  actorUserId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  details?: Record<string, unknown> | null;
  ipHash?: string | null;
};

export async function writeAudit(conn: mysql.Pool | mysql.PoolConnection, at: Date, e: AuditEntry): Promise<void> {
  await conn.query(
    `INSERT INTO audit_log (occurred_at, actor_type, actor_user_id, action, target_type, target_id, details, ip_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      at,
      e.actorType,
      e.actorUserId ?? null,
      e.action,
      e.targetType ?? null,
      e.targetId ?? null,
      e.details ? JSON.stringify(e.details) : null,
      e.ipHash ?? null,
    ],
  );
}
