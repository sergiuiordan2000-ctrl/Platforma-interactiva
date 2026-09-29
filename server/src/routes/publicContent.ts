// API public, numai citire, fără autentificare (B2 §3): comunicate, Ghidul Primăriei, Apelul rapid.
// Numai elementele publicate și neexpirate / active; nicio dată internă (autor intern, stare, ciorne).

import type { FastifyInstance } from 'fastify';
import { idSchema, publicAnnouncementsQuery } from '@tmc/shared';
import {
  announcementHighlights,
  decodeCursor,
  getAnnouncementRow,
  isPubliclyVisible,
  listAnnouncements,
  loadDirectory,
  loadQuickDial,
  toPublicAnnouncement,
} from '../content.ts';
import type { AppContext } from '../context.ts';
import { apiError } from '../errors.ts';

const notFound = { error: { code: 'NOT_FOUND', message: 'Resursa nu a fost găsită.' } };

export function registerPublicContentRoutes(api: FastifyInstance, ctx: AppContext): void {
  api.get('/public/announcements', async (request, reply) => {
    const parsed = publicAnnouncementsQuery.safeParse(request.query ?? {});
    const cursor = parsed.success ? decodeCursor(parsed.data.cursor) : 'invalid';
    if (!parsed.success || cursor === 'invalid') {
      return reply.code(400).send(apiError('BAD_REQUEST', 'Parametri invalizi.'));
    }
    const page = await listAnnouncements(ctx.pool, {
      now: ctx.now(),
      publicOnly: true,
      type: parsed.data.type,
      sort: parsed.data.sort,
      limit: parsed.data.limit,
      cursor,
    });
    return { items: page.items.map(toPublicAnnouncement), nextCursor: page.nextCursor };
  });

  api.get('/public/announcements/highlights', async () => announcementHighlights(ctx.pool, ctx.now()));

  api.get<{ Params: { id: string } }>('/public/announcements/:id', async (request, reply) => {
    if (!idSchema.safeParse(request.params.id).success) return reply.code(404).send(notFound);
    const row = await getAnnouncementRow(ctx.pool, request.params.id);
    if (!row || !isPubliclyVisible(row, ctx.now())) return reply.code(404).send(notFound);
    return toPublicAnnouncement(row);
  });

  api.get('/public/directory', async () => loadDirectory(ctx.pool, true));

  api.get('/public/quickdial', async () => loadQuickDial(ctx.pool, true));
}
