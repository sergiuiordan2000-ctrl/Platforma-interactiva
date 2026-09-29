// Aplicația completă (cu DB) pentru testele API + un client cu cookie și antetul CSRF.

import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
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

export async function makeApp(h: DbHandle, clock: Clock, env: Record<string, string> = {}) {
  const config: Config = loadConfig(testEnv({ DATABASE_URL: testDatabaseUrl(), ...env }));
  const ctx: AppContext = { config, pool: h.pool, now: clock.now };
  const app = await buildApp({ config, health: async () => 'ok', logger: false, ctx });
  return { app, ctx, config };
}

export class Client {
  cookie: string | undefined;
  constructor(private app: FastifyInstance, private origin = 'http://localhost:3000') {}

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
    return this.store(await this.app.inject({ method: 'GET', url, headers: this.cookie ? { cookie: this.cookie } : {} }));
  }

  async send(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, body?: unknown, headers: Record<string, string> = {}) {
    return this.store(
      await this.app.inject({
        method,
        url,
        payload: body === undefined ? undefined : (body as object),
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
