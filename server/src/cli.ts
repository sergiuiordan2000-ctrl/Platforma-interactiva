// Comenzile CLI (B2 §2): același artefact, alt punct de intrare.
//   node server/dist/app.js <comandă>
// În 5.1: migrate, migrate:status, seed:config, seed:demo, check:no-demo.
// Comenzile următoare (backup, purge, outbox…) se adaugă în subfazele lor.

import type { Config } from './config.ts';
import { createDb } from './db/client.ts';
import { migrate, schemaStatus } from './db/migrations.ts';
import { checkNoDemo } from './db/noDemo.ts';
import { SeedRefusedError, seedConfig, seedDemo } from './db/seeds.ts';
import { MIGRATIONS_DIR, SEEDS_DIR } from './paths.ts';

export const CLI_COMMANDS = [
  'migrate',
  'migrate:status',
  'seed:config',
  'seed:demo',
  'check:no-demo',
] as const;

export type CliCommand = (typeof CLI_COMMANDS)[number];

export function isCliCommand(value: string): value is CliCommand {
  return (CLI_COMMANDS as readonly string[]).includes(value);
}

type Out = { log: (m: string) => void; error: (m: string) => void };

/** Rulează o comandă; întoarce codul de ieșire. */
export async function runCli(command: CliCommand, config: Config, out: Out = console): Promise<number> {
  const handle = createDb(config.databaseUrl, { connectionLimit: 2 });
  try {
    switch (command) {
      case 'migrate': {
        const res = await migrate(handle.pool, MIGRATIONS_DIR, (m) => out.log(m));
        out.log(
          res.applied.length === 0
            ? `Schema este deja la versiunea ${res.version}; nimic de aplicat.`
            : `Aplicate: ${res.applied.join(', ')}. Schema este la versiunea ${res.version}.`,
        );
        return 0;
      }
      case 'migrate:status': {
        const st = await schemaStatus(handle.pool, MIGRATIONS_DIR);
        out.log(`Versiunea schemei: ${st.currentVersion} (așteptată: ${st.expectedVersion})`);
        for (const p of st.problems) out.error(`  - ${p}`);
        return st.ok ? 0 : 1;
      }
      case 'seed:config': {
        const res = await seedConfig(handle.pool, SEEDS_DIR);
        out.log(`seed:config: ${JSON.stringify(res)}`);
        return 0;
      }
      case 'seed:demo': {
        const res = await seedDemo(handle.pool, SEEDS_DIR, config.appEnv);
        out.log(`seed:demo (rânduri noi): ${JSON.stringify(res)}`);
        return 0;
      }
      case 'check:no-demo': {
        const res = await checkNoDemo(handle.pool);
        if (res.ok) {
          out.log('check:no-demo: nicio dată demo.');
          return 0;
        }
        out.error(`check:no-demo: există date demo: ${JSON.stringify(res.demoRows)}`);
        return 1;
      }
    }
  } catch (err) {
    if (err instanceof SeedRefusedError) {
      out.error(err.message);
      return 2;
    }
    out.error(err instanceof Error ? err.message : String(err));
    return 1;
  } finally {
    await handle.close();
  }
}
