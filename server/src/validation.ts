// Validarea corpului cererii cu Zod (B2 §1): câmp necunoscut → 400; valoare invalidă → 422.

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { apiError } from './errors.ts';

export function parseBody<T extends z.ZodType>(
  schema: T,
  request: FastifyRequest,
  reply: FastifyReply,
): z.infer<T> | undefined {
  const result = schema.safeParse(request.body ?? {});
  if (result.success) return result.data;
  const unknownKeys = result.error.issues.some((i) => i.code === 'unrecognized_keys');
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_';
    fields[key] ??= issue.code === 'unrecognized_keys' ? 'câmp necunoscut' : 'valoare invalidă';
  }
  reply
    .code(unknownKeys ? 400 : 422)
    .send(apiError(unknownKeys ? 'BAD_REQUEST' : 'VALIDATION', 'Datele trimise nu sunt valide.', { fields }));
  return undefined;
}
