// Schemele Zod pentru autentificare (B2 §4.1, §5, §6.5). Câmpurile necunoscute sunt respinse (strict).

import { z } from 'zod';
import { ADMIN_ROLES } from './permissions.ts';

/** B3 §2: 12–128 de caractere, fără reguli de compoziție. */
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

export const emailSchema = z.string().trim().min(3).max(254).email();

export const loginRequest = z.strictObject({
  email: emailSchema,
  password: z.string().min(1).max(PASSWORD_MAX),
});

export const totpCodeRequest = z.strictObject({ code: z.string().regex(/^\d{6}$/) });
export const recoveryCodeRequest = z.strictObject({ code: z.string().trim().min(8).max(32) });

export const changePasswordRequest = z.strictObject({
  currentPassword: z.string().min(1).max(PASSWORD_MAX),
  newPassword: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX),
});

export const createAccountRequest = z.strictObject({
  email: emailSchema,
  displayName: z.string().trim().min(1).max(100),
  role: z.enum(ADMIN_ROLES),
});

export const updateAccountRequest = z
  .strictObject({
    role: z.enum(ADMIN_ROLES).optional(),
    status: z.enum(['active', 'disabled']).optional(),
    displayName: z.string().trim().min(1).max(100).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'nimic de modificat' });

export const citizenStartRequest = z.strictObject({
  email: emailSchema,
  policyAccepted: z.boolean().optional(),
  policyVersion: z.string().trim().min(1).max(32).optional(),
});

export const citizenVerifyRequest = z.strictObject({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/),
});

export const blockRequest = z.strictObject({
  kind: z.enum(['temporary', 'permanent']),
  note: z.string().trim().max(500).optional(),
});

/** Versiunea curentă a politicii de utilizare (2.9); textul efectiv se redactează separat. */
export const CITIZEN_POLICY_VERSION = '2026-10';

/** Normalizarea e-mailului (T-A8): trim + litere mici. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
