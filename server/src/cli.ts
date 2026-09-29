// Comenzile CLI (B2 §2): același artefact, alt punct de intrare.
//   node server/dist/app.js <comandă>
// În 5.1: migrate, migrate:status, seed:config, seed:demo, check:no-demo, backup:db, restore:db.
// Comenzile următoare (backup, purge, outbox…) se adaugă în subfazele lor.

import type { Config } from './config.ts';
import { createBackup, listBackups, restoreBackup } from './db/backup.ts';
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
  'backup:db',
  'restore:db',
] as const;

export type CliCommand = (typeof CLI_COMMANDS)[number];

export function isCliCommand(value: string): value is CliCommand {
  return (CLI_COMMANDS as readonly string[]).includes(value);
}

type Out = { log: (m: string) => void; error: (m: string) => void };

/** Rulează o comandă; întoarce codul de ieșire. */
export async function runCli(
  command: CliCommand,
  config: Config,
  out: Out = console,
  args: string[] = [],
): Promise<number> {
  if (command === 'backup:db' || command === 'restore:db') return runBackupCommand(command, config, out, args);
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

async function runBackupCommand(
  command: 'backup:db' | 'restore:db',
  config: Config,
  out: Out,
  args: string[],
): Promise<number> {
  if (!config.backupDir) {
    out.error(`${command}: variabila BACKUP_DIR lipsește (directorul backup-urilor, în afara oricărui docroot).`);
    return 1;
  }
  const base = {
    databaseUrl: config.databaseUrl,
    backupDir: config.backupDir,
    storageDir: config.storageDir,
    migrationsDir: MIGRATIONS_DIR,
    retentionDays: config.retentionDays,
    adminRetentionMonths: config.adminRetentionMonths,
  };
  try {
    if (command === 'backup:db') {
      const res = await createBackup(base);
      out.log(`backup:db: ${res.manifest.name} (${JSON.stringify(res.manifest.counts)}; fotografii: ${res.manifest.photos})`);
      if (res.removed.length > 0) out.log(`backup:db: șterse (mai vechi de 7 zile): ${res.removed.join(', ')}`);
      return 0;
    }
    const source = args.find((a) => !a.startsWith('--'));
    if (!source || !args.includes('--confirm')) {
      out.error('Utilizare: restore:db <director-backup> --confirm   (într-un DB nou, după „migrate”)');
      const available = listBackups(config.backupDir);
      if (available.length > 0) out.error(`Backup-uri disponibile: ${available.join(', ')}`);
      return 2;
    }
    const res = await restoreBackup({ ...base, source });
    out.log(`restore:db: rânduri ${JSON.stringify(res.rows)}`);
    out.log(
      `restore:db: fotografii restaurate ${res.photosRestored}, lipsă ${res.photosMissing}; ` +
        `șterse conform listei ${res.deletedFromList}; eliminate prin retenție ${res.purgedByRetention}`,
    );
    return 0;
  } catch (err) {
    out.error(err instanceof Error ? err.message : String(err));
    return 1;
  }
}
