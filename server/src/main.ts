// Punctul de intrare unic (artefactul server/dist/app.js):
//   fără argumente  → pornește serverul HTTP (inclusiv sub Passenger / cPanel);
//   <comandă>       → rulează o comandă CLI (migrate, seed:config, …) și iese.
//
// La pornirea serverului:
//   1. configurarea este validată (refuz fără secrete);
//   2. schema DB trebuie să fie exact la versiunea așteptată (DN-20), altfel refuz;
//   3. în producție, nicio dată demo (D10-3), altfel refuz;
//   4. marcajele de lângă backup-uri (BACKUP_DIR) trebuie să poată fi scrise, altfel refuz; contorul TM
//      din bază și marcajul lui sunt aduse la maximul dintre ele (un număr rezervat nu se mai emite).

import { buildApp, type HealthState } from './app.ts';
import { CLI_COMMANDS, isCliCommand, runCli } from './cli.ts';
import { ConfigError, loadConfig, type Config } from './config.ts';
import { EnvFileError, loadEnvFileFromVar } from './envFile.ts';
import { createDb, pingDb } from './db/client.ts';
import { schemaStatus } from './db/migrations.ts';
import { checkNoDemo } from './db/noDemo.ts';
import { initBackupMarkers, type CounterSync } from './db/reportCounter.ts';
import { FRONTEND_DIST_DIR, MIGRATIONS_DIR } from './paths.ts';
import { loadAnnouncementImages } from './images.ts';
import { DEFAULT_UAT_FILE, loadUatBoundary } from './uat.ts';
import { APP_VERSION } from './version.ts';
import { emailDowngradeMessage, mailTransportFor } from './reports/smtp.ts';
import { devOidcProviderFor } from './auth/googleOAuth.ts';

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

  // Fără marcaje, depunerea și ștergerea ar fi oricum refuzate la fiecare cerere: aplicația nu pornește deloc,
  // cu un mesaj explicit. (În dezvoltare, BACKUP_DIR poate lipsi: atunci marcajele nu se folosesc.)
  let markers: CounterSync | undefined;
  if (config.backupDir) {
    try {
      markers = await initBackupMarkers(handle.pool, config.backupDir);
    } catch (err) {
      await handle.close();
      fail(`Aplicația nu pornește: marcajele din BACKUP_DIR nu pot fi folosite. ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const health = async (): Promise<HealthState> => {
    if (!(await pingDb(handle.pool))) return 'degraded';
    const st = await schemaStatus(handle.pool, MIGRATIONS_DIR);
    return st.ok ? 'ok' : 'degraded';
  };

  const app = await buildApp({
    config,
    health,
    frontendDir: FRONTEND_DIST_DIR,
    ctx: {
      config,
      pool: handle.pool,
      now: () => new Date(),
      announcementImages: loadAnnouncementImages(FRONTEND_DIST_DIR),
      // 2.12: fără limita UAT aplicația nu pornește
      uat: loadUatBoundary(config.uatBoundaryFile ?? DEFAULT_UAT_FILE),
      // 5.5a: SMTP numai în `allowlist` / `live` cu configurație validă (B6 §2)
      mailTransport: mailTransportFor(config),
      // G-T10: furnizorul fals al testelor E2E; numai în dezvoltare (altfel `undefined` → Google)
      oidc: devOidcProviderFor(config),
    },
  });
  const emailWarning = emailDowngradeMessage(config);
  if (emailWarning) app.log.error(emailWarning);
  if (devOidcProviderFor(config)) app.log.warn('Autentificarea cu Google folosește furnizorul fals de test (DEV_OIDC_PROVIDER_URL).');
  if (markers && markers.counterRaisedFrom !== null) {
    // după o depunere anulată sau o cădere este normal; altfel, semn că baza a fost readusă la o stare mai veche
    app.log.warn(
      { counterFound: markers.counterRaisedFrom, counterNow: markers.counter },
      'Contorul TM din baza de date era sub marcajul durabil și a fost ridicat la el (numerele rezervate nu se refolosesc).',
    );
  }

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
    loadEnvFileFromVar();
    config = loadConfig();
  } catch (err) {
    if (err instanceof ConfigError || err instanceof EnvFileError) fail(err.message);
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
