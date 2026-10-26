// Aplicația Fastify (Faza 5.1): /api/v1/health, antete de securitate și servirea frontend-ului.
// Rutele de domeniu se adaugă din 5.2 încolo.
//
// Design: docs/faza4/FAZA_4_00_ARHITECTURA_SI_INDEX.md §3, FAZA_4_B2_API.md §1 și §3.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import type { Config } from './config.ts';
import type { AppContext } from './context.ts';
import { registerCsrf } from './auth/guards.ts';
import { registerAdminAccountRoutes } from './routes/adminAccounts.ts';
import { registerAuthRoutes } from './routes/auth.ts';
import { registerCitizenRoutes } from './routes/citizens.ts';
import { GOOGLE_CALLBACK_PATH, registerCitizenGoogleRoutes } from './routes/citizenGoogle.ts';
import { registerPublicContentRoutes } from './routes/publicContent.ts';
import { registerAdminContentRoutes } from './routes/adminContent.ts';
import { registerReportRoutes } from './routes/reports.ts';
import { registerAdminReportRoutes } from './routes/adminReports.ts';
import { registerSurveyRoutes } from './routes/surveys.ts';
import { registerAdminSurveyRoutes } from './routes/adminSurveys.ts';
import { apiError } from './errors.ts';
import { APP_VERSION } from './version.ts';

export type HealthState = 'ok' | 'degraded';

export type AppOptions = {
  config: Config;
  /** Verificarea stării (DB accesibil, schema la versiunea așteptată). */
  health: () => Promise<HealthState>;
  /** Directorul frontend-ului construit; dacă lipsește, aplicația servește numai API-ul. */
  frontendDir?: string;
  /** `false` în teste. */
  logger?: boolean;
  /** DB + ceas; fără el, aplicația servește numai `health` și frontend-ul. */
  ctx?: AppContext;
};

/** Limita corpului JSON: 64 KB (B2 §1, DN-15). */
export const JSON_BODY_LIMIT = 64 * 1024;

/**
 * CSP (B2 §1, DN-19 / A04-5, T-C9): numai aceeași origine; imaginile din afara ei numai
 * tile-urile OpenStreetMap ale hărții. `data:` / `blob:` nu sunt domenii externe: le folosesc
 * iconițele Leaflet și previzualizarea fotografiilor înainte de încărcare.
 */
export function contentSecurityPolicy(appEnv: Config['appEnv']) {
  return {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      // pe dezvoltare aplicația rulează pe HTTP (inclusiv de pe telefon, prin Wi-Fi)
      upgradeInsecureRequests: appEnv === 'development' ? null : [],
    },
  };
}

type LoggedRequest = { method: string; url: string; hostname?: string; ip?: string; socket?: { remoteAddress?: string } };

/** T-5 (5.6): jurnalul cererilor fără IP pe rutele sondajelor (N4-7: fără IP lângă vot; decizia de anonimat 4C3). */
export function requestLogSerializer(req: LoggedRequest): Record<string, unknown> {
  let url = req.url ?? '';
  // amendamentul Google: `code` și `state` din întoarcerea de la Google nu ajung în jurnal
  if (url.startsWith(GOOGLE_CALLBACK_PATH)) url = GOOGLE_CALLBACK_PATH;
  const out: Record<string, unknown> = { method: req.method, url, hostname: req.hostname };
  if (!url.startsWith('/api/v1/public/surveys')) out.remoteAddress = req.ip ?? req.socket?.remoteAddress;
  return out;
}

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const { config } = options;

  const app = Fastify({
    logger:
      options.logger === false
        ? false
        : {
            level: config.logLevel,
            redact: {
              paths: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
              remove: true,
            },
            // T-5 (5.6): pe rutele sondajelor, jurnalul nu conține IP-ul (N4-7: fără IP lângă vot)
            serializers: { req: requestLogSerializer },
          },
    // Fastify acceptă la rulare și un număr de hop-uri, deși tipurile nu îl declară
    trustProxy: config.trustProxy as boolean | string | string[],
    bodyLimit: JSON_BODY_LIMIT,
  });

  await app.register(helmet, {
    contentSecurityPolicy: contentSecurityPolicy(config.appEnv),
    // HSTS numai pe HTTPS (staging / producție)
    strictTransportSecurity:
      config.appEnv === 'development' ? false : { maxAge: 15552000, includeSubDomains: false },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // aliniat cu CSP frame-ancestors 'none'
    frameguard: { action: 'deny' },
  });

  // ---- indexarea (7C, DEC-2): implicit niciodată indexat, în orice mediu (G3, condiția 4) ----
  // SEARCH_INDEXING=on (permis numai în producție, la lansare) scoate antetul și deschide robots.txt.
  if (!config.searchIndexing) {
    app.addHook('onSend', async (_request, reply) => {
      reply.header('X-Robots-Tag', 'noindex, nofollow');
    });
  }
  app.get('/robots.txt', async (_request, reply) => {
    reply.type('text/plain; charset=utf-8').header('Cache-Control', 'no-cache');
    return config.searchIndexing ? 'User-agent: *\nAllow: /\n' : 'User-agent: *\nDisallow: /\n';
  });

  // RA-10 (reaudit, 13.10.2026; constatarea R17): handlerul de erori se setează înaintea înregistrării rutelor.
  // În Fastify, un context copil (rutele `/api/v1`) primește handlerul existent în clipa înregistrării; setat
  // după, nu li se aplica, iar clientul primea mesajul brut al erorii (de exemplu, al bazei de date).
  app.setErrorHandler((error, request, reply) => {
    const statusCode =
      typeof (error as { statusCode?: unknown }).statusCode === 'number'
        ? (error as { statusCode: number }).statusCode
        : 500;
    if (statusCode === 413) {
      reply.code(413).send(apiError('PAYLOAD_TOO_LARGE', 'Cererea este prea mare.'));
      return;
    }
    if (statusCode === 415) {
      reply.code(415).send(apiError('UNSUPPORTED_MEDIA_TYPE', 'Tipul conținutului nu este permis.'));
      return;
    }
    if (statusCode >= 400 && statusCode < 500) {
      reply
        .code(statusCode)
        .send(apiError(statusCode === 400 ? 'BAD_REQUEST' : 'REQUEST_ERROR', 'Cererea nu poate fi procesată.'));
      return;
    }
    request.log.error({ err: error }, 'eroare internă');
    reply
      .code(500)
      .send(
        apiError('INTERNAL', 'A apărut o eroare internă. Încercați din nou mai târziu.', {
          correlationId: request.id,
        }),
      );
  });

  // ---- API ----
  await app.register(cookie);
  if (options.ctx) registerCsrf(app, options.ctx);
  await app.register(
    async (api) => {
      if (options.ctx) {
        registerAuthRoutes(api, options.ctx);
        registerAdminAccountRoutes(api, options.ctx);
        registerCitizenRoutes(api, options.ctx);
        registerCitizenGoogleRoutes(api, options.ctx);
        registerPublicContentRoutes(api, options.ctx);
        registerAdminContentRoutes(api, options.ctx);
        await registerReportRoutes(api, options.ctx);
        registerAdminReportRoutes(api, options.ctx);
        registerSurveyRoutes(api, options.ctx);
        registerAdminSurveyRoutes(api, options.ctx);
      }
      api.get('/health', async (_request, reply) => {
        let status: HealthState;
        try {
          status = await options.health();
        } catch {
          status = 'degraded';
        }
        reply.header('Cache-Control', 'no-store');
        reply.code(status === 'ok' ? 200 : 503);
        return { status, version: APP_VERSION };
      });
    },
    { prefix: '/api/v1' },
  );

  // ---- Frontend (dist/) ----
  const frontendDir = options.frontendDir;
  const serveFrontend = frontendDir !== undefined && existsSync(join(frontendDir, 'index.html'));
  if (serveFrontend) {
    await app.register(fastifyStatic, {
      root: frontendDir,
      index: ['index.html'],
      wildcard: true,
      setHeaders(reply, filePath) {
        if (filePath.includes(join('dist', 'assets'))) {
          // fișierele din assets/ au hash în nume
          reply.header('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          reply.header('Cache-Control', 'no-cache');
        }
      },
    });
  }

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send(apiError('NOT_FOUND', 'Resursa nu există.'));
  });

  return app;
}
