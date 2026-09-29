// Punctul de intrare unic (artefactul server/dist/app.js):
//   fără argumente  → pornește serverul HTTP (inclusiv sub Passenger / cPanel);
//   <comandă>       → rulează o comandă CLI (migrate, seed:config, …) și iese.
//
// La pornirea serverului:
//   1. configurarea este validată (refuz fără secrete);
//   2. schema DB trebuie să fie exact la versiunea așteptată (DN-20), altfel refuz;
//   3. în producție, nicio dată demo (D10-3), altfel refuz.

import { buildApp, type HealthState } from './app.ts';
import { CLI_COMMANDS, isCliCommand, runCli } from './cli.ts';
import { ConfigError, loadConfig, type Config } from './config.ts';
import { createDb, pingDb } from './db/client.ts';
import { schemaStatus } from './db/migrations.ts';
import { checkNoDemo } from './db/noDemo.ts';
import { FRONTEND_DIST_DIR, MIGRATIONS_DIR } from './paths.ts';
import { APP_VERSION } from './version.ts';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function startServer(config: Config): Promise<void> {
  const handle = createDb(config.databaseUrl);

  const status = await schemaStatus(handle.pool, MIGRATIONS_DIR).catch((err: unknown) => {
    fail(`Baza de date nu este accesibilă: ${err instanceof Error ? err.message : String(err)}`);
  });
  if (!status.ok) {
    await handle.close();
    fail('Aplicația nu pornește: schema DB nu este la versiunea așteptată.\n' + status.problems.map((p) => `  - ${p}`).join('\n'));
  }
  if (config.appEnv === 'production') {
    const demo = await checkNoDemo(handle.pool);
    if (!demo.ok) {
      await handle.close();
      fail(`Aplicația nu pornește în producție: există date demo ${JSON.stringify(demo.demoRows)} (D10-3).`);
    }
  }

  const health = async (): Promise<HealthState> => {
    if (!(await pingDb(handle.pool))) return 'degraded';
    const st = await schemaStatus(handle.pool, MIGRATIONS_DIR);
    return st.ok ? 'ok' : 'degraded';
  };

  const app = await buildApp({ config, health, frontendDir: FRONTEND_DIST_DIR });

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'oprire');
    await app.close();
    await handle.close();
    process.exit(0);
  };
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));

  await app.listen({ host: config.host, port: config.port });
  app.log.info({ version: APP_VERSION, env: config.appEnv }, 'Turnu Măgurele Civic pornit');
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  let config: Config;
  try {
    config = loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) fail(err.message);
    throw err;
  }

  if (command === undefined) {
    await startServer(config);
    return;
  }
  if (!isCliCommand(command)) {
    fail(`Comandă necunoscută: ${command}. Comenzi: ${CLI_COMMANDS.join(', ')}`);
  }
  process.exit(await runCli(command, config, console, args));
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
