// Aplicația completă (cu DB) pentru testele API + un client cu cookie și antetul CSRF.

import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { solveChallenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/sha';
import { buildApp } from '../../src/app.ts';
import { loadConfig, type Config } from '../../src/config.ts';
import type { AppContext } from '../../src/context.ts';
import type { DbHandle } from '../../src/db/client.ts';
import { testDatabaseUrl } from './db.ts';
import { testEnv } from './env.ts';

export class Clock {
  constructor(public current = new Date('2026-10-01T09:00:00.000Z')) {}
  now = () => new Date(this.current.getTime());
  advanceMinutes(m: number) {
    this.current = new Date(this.current.getTime() + m * 60_000);
  }
}

export async function makeApp(
  h: DbHandle,
  clock: Clock,
  env: Record<string, string> = {},
  extra: Partial<Omit<AppContext, 'config' | 'pool' | 'now'>> = {},
) {
  const config: Config = loadConfig(testEnv({ DATABASE_URL: testDatabaseUrl(), ...env }));
  const ctx: AppContext = { config, pool: h.pool, now: clock.now, ...extra };
  const app = await buildApp({ config, health: async () => 'ok', logger: false, ctx });
  return { app, ctx, config };
}

export class Client {
  cookie: string | undefined;
  constructor(
    private app: FastifyInstance,
    private origin = 'http://localhost:3000',
    /** IP-ul simulat al clientului (limitele pe IP, B7). */
    public ip = '127.0.0.1',
  ) {}

  private store(res: LightMyRequestResponse) {
    const set = res.headers['set-cookie'];
    const list = Array.isArray(set) ? set : set ? [set] : [];
    for (const c of list) {
      const [pair] = c.split(';');
      const value = pair!.slice(pair!.indexOf('=') + 1);
      this.cookie = value === '' ? undefined : pair;
    }
    return res;
  }

  async get(url: string) {
    return this.store(
      await this.app.inject({ method: 'GET', url, remoteAddress: this.ip, headers: this.cookie ? { cookie: this.cookie } : {} }),
    );
  }

  /**
   * D-B3 (13.10.2026): soluția ALTCHA, ca în browser: provocarea de la `challengeUrl`, rezolvată local.
   * `undefined` dacă serverul răspunde 404 (ALTCHA oprit acolo).
   */
  async pow(challengeUrl: string): Promise<string | undefined> {
    const res = await this.get(challengeUrl);
    if (res.statusCode === 404) return undefined;
    if (res.statusCode !== 200) throw new Error(`provocarea ALTCHA: ${res.statusCode} ${res.body}`);
    const challenge = res.json();
    const solution = await solveChallenge({ challenge, deriveKey });
    if (!solution) throw new Error('provocarea ALTCHA nu a putut fi rezolvată');
    return Buffer.from(JSON.stringify({ challenge, solution: { counter: solution.counter, derivedKey: solution.derivedKey } })).toString('base64');
  }

  async send(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, body?: unknown, headers: Record<string, string> = {}) {
    // D-B3: cererea de cod cere ALTCHA; clientul de test o rezolvă automat, ca interfața (CitizenLogin), dacă
    // testul nu trimite el însuși câmpul `pow` (un test care verifică lipsa lui trimite `pow: undefined`)
    if (method === 'POST' && url === '/api/v1/citizen/auth/start' && body && typeof body === 'object' && !Buffer.isBuffer(body) && !('pow' in body)) {
      body = { ...(body as object), pow: await this.pow('/api/v1/citizen/auth/pow-challenge') };
    }
    return this.store(
      await this.app.inject({
        method,
        url,
        remoteAddress: this.ip,
        payload: body === undefined ? undefined : Buffer.isBuffer(body) ? body : (body as object),
        headers: {
          'x-civic-request': '1',
          origin: this.origin,
          ...(this.cookie ? { cookie: this.cookie } : {}),
          ...headers,
        },
      }),
    );
  }

  post(url: string, body?: unknown) {
    return this.send('POST', url, body ?? {});
  }
}
