// Sesizările: rutele publice (B2 §3), ale cetățeanului (B2 §4.2) și depunerea (B5 §1).
// Fără moderare (2.3): sesizarea este publică imediat după depunere, dacă are poziție validă în UAT (D9, A-2).

import { randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import multipart from '@fastify/multipart';
import {
  REPORT_PHOTOS_MAX,
  REPORT_PHOTO_BYTES_MAX,
  geocodeRequest,
  idempotencyKeySchema,
  referenceNumberSchema,
  reportSubmissionSchema,
  type ReportSubmission,
} from '@tmc/shared';
import { z } from 'zod';
import { LIMITS, type AppContext } from '../context.ts';
import { apiError } from '../errors.ts';
import { newId } from '../ids.ts';
import { storagePath } from '../storage.ts';
import { requestIpHash, requireCitizen } from '../auth/guards.ts';
import { hitRateLimit, recordRejected } from '../auth/rateLimit.ts';
import { sha256Hex } from '../auth/crypto.ts';
import { allocateReportNumber } from '../db/reportCounter.ts';
import { deleteReportsHard } from '../db/reportDeletion.ts';
import { isReportPowEnabled } from '../settings.ts';
import { activeBlock, emailHash } from './citizens.ts';
import { checkFormToken, createPowChallenge, issueFormToken, verifyPow } from '../reports/antiabuse.ts';
import { GeocoderUnavailableError, nominatimGeocoder } from '../reports/geocoder.ts';
import { enqueueRegistry, kickOutbox, unsubscribeToken, unsubscribeTokenHash } from '../reports/outbox.ts';
import { PhotoError, cleanPhoto, type CleanPhoto } from '../reports/photos.ts';
import { PUBLIC_COLUMNS, toCitizen, toPublic, type PublicRow } from '../reports/projection.ts';

const HOUR = 60;
const DAY = 24 * 60;

/** Suma găleților orare dintr-un interval (limite „în ultimele N ore”, 2.14). */
async function sumHourly(ctx: AppContext, key: string, hours: number): Promise<number> {
  const since = new Date(ctx.now().getTime() - hours * 3_600_000);
  const [rows] = await ctx.pool.query(
    'SELECT COALESCE(SUM(count), 0) AS n FROM rate_limits WHERE bucket_key = ? AND window_start > ?',
    [key, since],
  );
  return Number((rows as Array<{ n: number | string }>)[0]!.n);
}

const formatReference = (n: number) => `TM-${String(n).padStart(3, '0')}`;

const generic422 = (reply: FastifyReply) =>
  reply.code(422).send(apiError('VALIDATION', 'Sesizarea nu a putut fi trimisă. Reîncărcați formularul și încercați din nou.'));

type ParsedSubmission = { data: unknown; files: Buffer[]; tooMany: boolean; unknownPart: boolean };

async function readMultipart(request: FastifyRequest): Promise<ParsedSubmission> {
  const out: ParsedSubmission = { data: undefined, files: [], tooMany: false, unknownPart: false };
  for await (const part of request.parts()) {
    if (part.type === 'file') {
      if (part.fieldname !== 'photos') {
        out.unknownPart = true;
        await part.toBuffer().catch(() => undefined);
        continue;
      }
      const buf = await part.toBuffer(); // aruncă 413 peste limita per fișier
      if (out.files.length >= REPORT_PHOTOS_MAX) out.tooMany = true;
      else out.files.push(buf);
    } else if (part.fieldname === 'data') {
      try {
        out.data = JSON.parse(String(part.value));
      } catch {
        out.data = null;
      }
    } else {
      out.unknownPart = true;
    }
  }
  return out;
}

export async function registerReportRoutes(api: FastifyInstance, ctx: AppContext): Promise<void> {
  await api.register(multipart, {
    limits: {
      fileSize: REPORT_PHOTO_BYTES_MAX,
      files: REPORT_PHOTOS_MAX + 1, // a 5-a fotografie se detectează explicit (413)
      fields: 4,
      fieldSize: 16 * 1024,
      parts: REPORT_PHOTOS_MAX + 5,
      headerPairs: 50,
    },
  });
  const geocode = ctx.geocode ?? nominatimGeocoder(ctx);

  // ——— public ———

  api.get('/public/report-categories', async (_request, reply) => {
    const [rows] = await ctx.pool.query(
      'SELECT id, name, description, icon_name AS iconName FROM report_categories WHERE is_active = 1 ORDER BY sort_order, name',
    );
    reply.header('Cache-Control', 'no-cache');
    return rows;
  });

  /** A-2 / D9: orice sesizare existentă cu poziție în UAT, imediat după depunere. */
  api.get('/public/map-reports', async (_request, reply) => {
    const [rows] = await ctx.pool.query(
      `SELECT ${PUBLIC_COLUMNS} FROM reports r JOIN report_categories c ON c.id = r.category_id
        WHERE r.lat IS NOT NULL AND r.lng IS NOT NULL ORDER BY r.created_at DESC`,
    );
    const items = (rows as PublicRow[])
      .filter((r) => !ctx.uat || ctx.uat.contains(Number(r.lat), Number(r.lng)))
      .map(toPublic)
      .filter((r) => r !== null);
    reply.header('Cache-Control', 'no-cache');
    return items;
  });

  /** D9: numai fotografia principală a unei sesizări existente, cu poziție; altfel 404. */
  api.get<{ Params: { photoId: string } }>('/public/photos/:photoId', async (request, reply) => {
    const id = request.params.photoId;
    if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(id)) return reply.code(404).send(apiError('NOT_FOUND', 'Resursa nu există.'));
    const [rows] = await ctx.pool.query(
      `SELECT p.storage_key AS k, p.mime FROM report_photos p JOIN reports r ON r.id = p.report_id
        WHERE p.id = ? AND p.ordinal = 1 AND r.lat IS NOT NULL AND r.lng IS NOT NULL`,
      [id],
    );
    const photo = (rows as Array<{ k: string; mime: string }>)[0];
    if (!photo) return reply.code(404).send(apiError('NOT_FOUND', 'Resursa nu există.'));
    return sendPhoto(ctx, reply, photo.k, photo.mime);
  });

  /** D9-2: dezabonarea, fără cont; 404 uniform. */
  api.post('/public/notifications/unsubscribe', async (request, reply) => {
    const body = z.strictObject({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).safeParse(request.body ?? {});
    const ipH = requestIpHash(ctx, request);
    if ((await hitRateLimit(ctx, `unsubscribe:ip:${ipH}`, HOUR)) > LIMITS.unsubscribePerIpPerHour) {
      reply.header('Retry-After', '3600');
      return reply.code(429).send(apiError('RATE_LIMITED', 'Prea multe cereri. Reveniți mai târziu.'));
    }
    const notFound = () => reply.code(404).send(apiError('NOT_FOUND', 'Linkul nu mai este valabil.'));
    if (!body.success) return notFound();
    const hash = unsubscribeTokenHash(body.data.token);
    const [rows] = await ctx.pool.query('SELECT id FROM reports WHERE unsubscribe_token_hash = ?', [hash]);
    const report = (rows as Array<{ id: string }>)[0];
    if (!report) return notFound();
    await ctx.pool.query(
      'UPDATE reports SET notify_unsubscribed_at = COALESCE(notify_unsubscribed_at, ?), updated_at = ? WHERE id = ?',
      [ctx.now(), ctx.now(), report.id],
    );
    await ctx.pool.query(
      `UPDATE email_outbox SET status = 'cancelled', last_error = 'dezabonat'
        WHERE report_id = ? AND kind = 'citizen_status_update' AND status IN ('queued', 'on_hold')`,
      [report.id],
    );
    return reply.code(204).send();
  });

  // ——— cetățean ———

  const citizen = requireCitizen(ctx);

  /** B7: jetonul „timp minim”, cerut la deschiderea formularului. */
  api.get('/citizen/reports/form-token', { preHandler: citizen }, async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
    return { formStartedAt: issueFormToken(ctx) };
  });

  /** Decizia din 30.09.2026 (A1): provocarea ALTCHA, numai când este pornită; altfel 404. */
  api.get('/citizen/reports/pow-challenge', { preHandler: citizen }, async (_request, reply) => {
    if (!(await isReportPowEnabled(ctx.pool))) return reply.code(404).send(apiError('NOT_FOUND', 'Resursa nu există.'));
    reply.header('Cache-Control', 'no-store');
    return createPowChallenge(ctx);
  });

  /** 2.4: adresa → pin aproximativ în UAT; nestocată, nescrisă în jurnale. */
  api.post('/citizen/geocode', { preHandler: citizen }, async (request, reply) => {
    const body = geocodeRequest.safeParse(request.body ?? {});
    if (!body.success) {
      const unknown = body.error.issues.some((i) => i.code === 'unrecognized_keys');
      return reply.code(unknown ? 400 : 422).send(apiError(unknown ? 'BAD_REQUEST' : 'VALIDATION', 'Adresa nu este validă.'));
    }
    const ipH = requestIpHash(ctx, request);
    if (
      (await hitRateLimit(ctx, `geocode:ip:${ipH}`, HOUR)) > LIMITS.geocodePerIpPerHour ||
      (await hitRateLimit(ctx, 'geocode:global', 1)) > LIMITS.geocodeGlobalPerMinute
    ) {
      reply.header('Retry-After', '60');
      return reply.code(429).send(apiError('RATE_LIMITED', 'Prea multe căutări. Reveniți peste un minut.'));
    }
    if (!ctx.uat) return reply.code(503).send(apiError('UNAVAILABLE', 'Căutarea adresei nu este disponibilă.'));
    let candidates;
    try {
      candidates = await geocode(body.data.address);
    } catch (err) {
      if (err instanceof GeocoderUnavailableError) {
        return reply.code(503).send(apiError('UNAVAILABLE', 'Căutarea adresei nu este disponibilă acum. Puneți pinul pe hartă.'));
      }
      throw err;
    }
    const hit = candidates.find((c) => ctx.uat!.contains(c.lat, c.lng));
    if (!hit) {
      return reply.code(404).send(apiError('NOT_FOUND', 'Adresa nu a fost găsită în Turnu Măgurele. Puneți pinul pe hartă.'));
    }
    reply.header('Cache-Control', 'no-store');
    return { lat: hit.lat, lng: hit.lng, approximate: true as const };
  });

  // ——— depunerea (B5 §1) ———

  api.post(
    '/citizen/reports',
    { preHandler: citizen, bodyLimit: REPORT_PHOTOS_MAX * REPORT_PHOTO_BYTES_MAX + 256 * 1024 },
    async (request, reply) => {
      const { account } = request.citizen!;
      const now = ctx.now();
      const ipH = requestIpHash(ctx, request);
      const hash = emailHash(ctx, account.email_normalized);

      // 0. blocare (D15) → 403
      if (await activeBlock(ctx, ctx.pool, account.id, hash)) {
        await recordRejected(ctx, 'report', 'blocked', ipH);
        return reply.code(403).send(apiError('ACCOUNT_BLOCKED', 'Contul nu poate depune sesizări în acest moment.'));
      }
      if (!request.isMultipart()) {
        return reply.code(415).send(apiError('UNSUPPORTED_MEDIA_TYPE', 'Sesizarea se trimite ca formular multipart.'));
      }
      const key = idempotencyKeySchema.safeParse(request.headers['idempotency-key']);
      if (!key.success) {
        return reply.code(400).send(apiError('BAD_REQUEST', 'Antetul Idempotency-Key lipsește sau nu este valid.'));
      }
      const idemKey = key.data.toLowerCase();

      // 1. primirea (limitele de mărime aruncă 413)
      const parsed = await readMultipart(request);
      if (parsed.tooMany) {
        return reply.code(413).send(apiError('PAYLOAD_TOO_LARGE', `Sunt permise cel mult ${REPORT_PHOTOS_MAX} fotografii.`));
      }
      if (parsed.unknownPart) return reply.code(400).send(apiError('BAD_REQUEST', 'Formularul conține câmpuri necunoscute.'));

      // retrimiterea aceluiași formular → aceeași sesizare (fără contorizare nouă)
      const existing = await findByIdempotencyKey(ctx, idemKey);
      if (existing) {
        if (existing.author !== account.id) return reply.code(409).send(apiError('CONFLICT', 'Cheia de trimitere a fost deja folosită.'));
        return reply.code(201).send({ referenceNumber: existing.ref, createdAt: existing.createdAt.toISOString() });
      }

      // anti-abuz (B7): capcana, timpul minim, ALTCHA (dacă este pornit), limitele
      const rawData = parsed.data as Partial<ReportSubmission> | null | undefined;
      if (rawData && typeof rawData === 'object') {
        if (typeof rawData.hp === 'string' && rawData.hp !== '') {
          await recordRejected(ctx, 'report', 'honeypot', ipH);
          return generic422(reply);
        }
        if (typeof rawData.formStartedAt === 'string') {
          const t = checkFormToken(ctx, rawData.formStartedAt, LIMITS.reportMinFormSeconds * 1000, LIMITS.reportFormTokenMaxHours * 3_600_000);
          if (t !== 'ok') {
            await recordRejected(ctx, 'report', t === 'too_fast' ? 'too_fast' : 'invalid', ipH);
            return generic422(reply);
          }
        }
      }
      const body = reportSubmissionSchema.safeParse(parsed.data ?? {});
      if (!body.success) {
        const unknownKeys = body.error.issues.some((i) => i.code === 'unrecognized_keys');
        const fields: Record<string, string> = {};
        for (const issue of body.error.issues) {
          fields[issue.path.join('.') || '_'] ??= issue.code === 'unrecognized_keys' ? 'câmp necunoscut' : issue.message;
        }
        return reply
          .code(unknownKeys ? 400 : 422)
          .send(apiError(unknownKeys ? 'BAD_REQUEST' : 'VALIDATION', 'Datele trimise nu sunt valide.', { fields }));
      }
      const data = body.data;
      if (await isReportPowEnabled(ctx.pool)) {
        if (!(await verifyPow(ctx, data.pow))) {
          await recordRejected(ctx, 'report', 'pow_invalid', ipH);
          return generic422(reply);
        }
      }

      const rateLimited = async (message: string) => {
        await recordRejected(ctx, 'report', 'rate_limited', ipH);
        reply.header('Retry-After', '3600');
        return reply.code(429).send(apiError('RATE_LIMITED', message));
      };
      if (
        (await hitRateLimit(ctx, `report:ip:h:${ipH}`, HOUR)) > LIMITS.reportsPerIpPerHour ||
        (await hitRateLimit(ctx, `report:ip:d:${ipH}`, DAY)) > LIMITS.reportsPerIpPerDay
      ) {
        return rateLimited('Prea multe sesizări trimise de la această conexiune. Reveniți mai târziu.');
      }
      if ((await sumHourly(ctx, `report:acct:${hash}`, 24)) >= LIMITS.reportsPerAccountPerDay) {
        return rateLimited(`Un cont poate trimite cel mult ${LIMITS.reportsPerAccountPerDay} sesizări în 24 de ore.`);
      }
      // 2.14: maximum 3 transmiteri către Primărie / cont / 24 h
      if (
        data.transmitToCityHall &&
        (await sumHourly(ctx, `report:transmit:${hash}`, 24)) >= LIMITS.cityHallTransmissionsPerAccountPer24h
      ) {
        return rateLimited(
          `Puteți cere transmiterea către Primărie pentru cel mult ${LIMITS.cityHallTransmissionsPerAccountPer24h} sesizări în 24 de ore.`,
        );
      }

      // 2. categoria activă, UAT
      const [cats] = await ctx.pool.query('SELECT name FROM report_categories WHERE id = ? AND is_active = 1', [data.categoryId]);
      const category = (cats as Array<{ name: string }>)[0];
      if (!category) {
        return reply.code(422).send(apiError('VALIDATION', 'Categoria nu este validă.', { fields: { categoryId: 'categorie inexistentă sau inactivă' } }));
      }
      const loc = data.location;
      const hasCoords = loc.lat !== undefined && loc.lng !== undefined;
      if (hasCoords && (!ctx.uat || !ctx.uat.contains(loc.lat!, loc.lng!))) {
        return reply.code(422).send(
          apiError('OUTSIDE_UAT', 'Poziția aleasă este în afara municipiului Turnu Măgurele.', { fields: { location: 'în afara UAT' } }),
        );
      }

      // 3. fotografiile: tip după semnătură, dimensiuni, fără EXIF / XMP; fișiere temporare
      let photos: CleanPhoto[];
      try {
        photos = parsed.files.map((f) => cleanPhoto(f));
      } catch (err) {
        if (err instanceof PhotoError) {
          const code = err.reason === 'type' ? 415 : 422;
          return reply.code(code).send(apiError(code === 415 ? 'UNSUPPORTED_MEDIA_TYPE' : 'VALIDATION', err.message, { fields: { photos: err.message } }));
        }
        throw err;
      }
      const tmpFiles: string[] = [];
      const stored: Array<{ id: string; key: string; tmp: string; photo: CleanPhoto; sha: string }> = [];
      try {
        for (const photo of photos) {
          const id = newId(now);
          const ext = photo.mime === 'image/webp' ? 'webp' : 'jpg';
          const key = `photos/${randomBytes(16).toString('hex')}.${ext}`;
          const tmp = storagePath(ctx.config.storageDir, `tmp/${randomBytes(16).toString('hex')}.part`);
          await mkdir(dirname(tmp), { recursive: true });
          await writeFile(tmp, photo.data, { flag: 'wx' });
          tmpFiles.push(tmp);
          stored.push({ id, key, tmp, photo, sha: sha256Hex(photo.data) });
        }
      } catch (err) {
        await Promise.all(tmpFiles.map((f) => rm(f, { force: true })));
        throw err;
      }

      // 4. tranzacția: contorul TM (FOR UPDATE) și marcajul lui de lângă backup-uri, scris ÎNAINTE de COMMIT
      //    (dacă marcajul nu poate fi scris, tranzacția se anulează: niciun număr emis); apoi sesizarea,
      //    fotografiile, coada (numai la cerere)
      const reportId = newId(now);
      const outboxIds: string[] = [];
      let referenceNumber = '';
      const conn = await ctx.pool.getConnection();
      try {
        await conn.beginTransaction();
        const next = await allocateReportNumber(conn, ctx.config.backupDir);
        referenceNumber = formatReference(next);
        const unsubHash = data.notifyOptIn ? unsubscribeTokenHash(unsubscribeToken(ctx, reportId)) : null;
        await conn.query(
          `INSERT INTO reports (id, author_account_id, reference_number, category_id, description, location_text, lat, lng,
             location_source, gps_accuracy_m, location_approximate, resolution_status, city_hall_transmission_requested,
             city_hall_transmission_requested_at, notify_opt_in, notify_opt_in_at, unsubscribe_token_hash, idempotency_key,
             is_demo, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'new', ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
          [reportId, account.id, referenceNumber, data.categoryId, data.description, loc.text,
            hasCoords ? loc.lat!.toFixed(6) : null, hasCoords ? loc.lng!.toFixed(6) : null, loc.source,
            loc.source === 'geocoded', data.transmitToCityHall, data.transmitToCityHall ? now : null,
            data.notifyOptIn, data.notifyOptIn ? now : null, unsubHash, idemKey, now, now],
        );
        let ordinal = 0;
        for (const s of stored) {
          ordinal += 1;
          await conn.query(
            `INSERT INTO report_photos (id, report_id, ordinal, storage_key, mime, size_bytes, width, height, sha256, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [s.id, reportId, ordinal, s.key, s.photo.mime, s.photo.data.length, s.photo.width, s.photo.height, s.sha, now],
          );
        }
        if (data.transmitToCityHall) {
          outboxIds.push(
            await enqueueRegistry(ctx, conn, reportId, {
              referenceNumber, categoryName: category.name, description: data.description, locationText: loc.text,
              lat: hasCoords ? loc.lat! : null, lng: hasCoords ? loc.lng! : null, createdAt: now,
              authorEmail: account.email_normalized,
            }, stored.map((s) => s.id)),
          );
        }
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        await Promise.all(tmpFiles.map((f) => rm(f, { force: true })));
        const dup = (err as { code?: string }).code === 'ER_DUP_ENTRY';
        if (dup) {
          // aceeași cheie trimisă concurent: a câștigat cealaltă cerere
          const again = await findByIdempotencyKey(ctx, idemKey);
          if (again && again.author === account.id) {
            return reply.code(201).send({ referenceNumber: again.ref, createdAt: again.createdAt.toISOString() });
          }
        }
        throw err;
      } finally {
        conn.release();
      }

      // 5. după COMMIT: fișierele în locul definitiv
      for (const s of stored) {
        const dest = storagePath(ctx.config.storageDir, s.key);
        await mkdir(dirname(dest), { recursive: true });
        await rename(s.tmp, dest);
      }
      await hitRateLimit(ctx, `report:acct:${hash}`, HOUR);
      if (data.transmitToCityHall) await hitRateLimit(ctx, `report:transmit:${hash}`, HOUR);

      // 7. coada, neblocant (N3-1)
      kickOutbox(ctx, outboxIds, (err) => request.log.error({ err }, 'coada e-mail'));
      return reply.code(201).send({ referenceNumber, createdAt: now.toISOString() });
    },
  );

  // ——— lista proprie (D27–D28) ———

  api.get('/citizen/reports', { preHandler: citizen }, async (request, reply) => {
    const [rows] = await ctx.pool.query(
      `SELECT ${PUBLIC_COLUMNS} FROM reports r JOIN report_categories c ON c.id = r.category_id
        WHERE r.author_account_id = ? ORDER BY r.created_at DESC`,
      [request.citizen!.account.id],
    );
    reply.header('Cache-Control', 'no-store');
    return (rows as PublicRow[]).map(toCitizen);
  });

  const ownReport = async (request: FastifyRequest<{ Params: { tm: string } }>) => {
    const ref = referenceNumberSchema.safeParse(request.params.tm);
    if (!ref.success) return null;
    const [rows] = await ctx.pool.query(
      `SELECT ${PUBLIC_COLUMNS} FROM reports r JOIN report_categories c ON c.id = r.category_id
        WHERE r.reference_number = ? AND r.author_account_id = ?`,
      [ref.data, request.citizen!.account.id],
    );
    return (rows as PublicRow[])[0] ?? null;
  };

  api.get<{ Params: { tm: string } }>('/citizen/reports/:tm', { preHandler: citizen }, async (request, reply) => {
    const row = await ownReport(request);
    if (!row) return reply.code(404).send(apiError('NOT_FOUND', 'Sesizarea nu există.'));
    reply.header('Cache-Control', 'no-store');
    return toCitizen(row);
  });

  /**
   * D19–D22: ștergerea definitivă a propriei sesizări, în orice stare, și cu blocare activă (D15); fără audit (B-7).
   * Marcajul de ștergere se scrie înainte de COMMIT; dacă nu poate fi scris → eroare, sesizarea rămâne.
   */
  api.delete<{ Params: { tm: string } }>('/citizen/reports/:tm', { preHandler: citizen }, async (request, reply) => {
    const row = await ownReport(request);
    if (!row) return reply.code(404).send(apiError('NOT_FOUND', 'Sesizarea nu există.'));
    const marker = ctx.config.backupDir ? { backupDir: ctx.config.backupDir, now: ctx.now() } : undefined;
    await deleteReportsHard(ctx.pool, [row.id], ctx.config.storageDir, marker);
    return reply.code(204).send();
  });
}

async function findByIdempotencyKey(
  ctx: AppContext,
  key: string,
): Promise<{ ref: string; createdAt: Date; author: string | null } | null> {
  const [rows] = await ctx.pool.query(
    'SELECT reference_number AS ref, created_at AS createdAt, author_account_id AS author FROM reports WHERE idempotency_key = ?',
    [key],
  );
  return (rows as Array<{ ref: string; createdAt: Date; author: string | null }>)[0] ?? null;
}

export async function sendPhoto(ctx: AppContext, reply: FastifyReply, key: string, mime: string) {
  let path: string;
  try {
    path = storagePath(ctx.config.storageDir, key);
  } catch {
    return reply.code(404).send(apiError('NOT_FOUND', 'Resursa nu există.'));
  }
  const stream = createReadStream(path);
  const ok = await new Promise<boolean>((resolve) => {
    stream.once('open', () => resolve(true));
    stream.once('error', () => resolve(false));
  });
  if (!ok) return reply.code(404).send(apiError('NOT_FOUND', 'Resursa nu există.'));
  reply
    .header('Content-Type', mime)
    .header('Cache-Control', 'private, max-age=300')
    .header('X-Content-Type-Options', 'nosniff')
    .header('Content-Disposition', 'inline');
  return reply.send(stream);
}

