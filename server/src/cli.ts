// Comenzile CLI (B2 §2): același artefact, alt punct de intrare.
//   node server/dist/app.js <comandă>
// În 5.1: migrate, migrate:status, seed:config, seed:demo, check:no-demo, backup:db, restore:db.
// 5.4: outbox:process, purge:retention (sesizări, audit administrativ, blocări expirate, fișiere temporare),
// purge:pow, settings:report-pow (ALTCHA la sesizări, decizia A1 din 30.09.2026).

import type { Config } from './config.ts';
import { BootstrapRefusedError, bootstrapAdmin } from './accounts.ts';
import { encryptSecret } from './auth/crypto.ts';
import { hashPassword } from './auth/password.ts';
import { newId } from './ids.ts';
import { createBackup, listBackups, restoreBackup } from './db/backup.ts';
import { createDb } from './db/client.ts';
import { migrate, schemaStatus } from './db/migrations.ts';
import { checkNoDemo } from './db/noDemo.ts';
import { SeedRefusedError, seedConfig, seedDemo } from './db/seeds.ts';
import { MIGRATIONS_DIR, SEEDS_DIR } from './paths.ts';
import type { AppContext } from './context.ts';
import { purgePow, purgeRetention } from './maintenance.ts';
import { processDue } from './reports/outbox.ts';
import { REPORT_POW_KEY, isReportPowEnabled, setSetting } from './settings.ts';
import { writeAudit } from './audit.ts';

export const CLI_COMMANDS = [
  'migrate',
  'migrate:status',
  'seed:config',
  'seed:demo',
  'check:no-demo',
  'backup:db',
  'restore:db',
  'bootstrap-admin',
  'dev:show-code',
  'dev:e2e-setup',
  'outbox:process',
  'purge:retention',
  'purge:pow',
  'settings:report-pow',
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
  if (command === 'bootstrap-admin') return runBootstrap(config, out, args);
  if (command === 'dev:show-code') return runShowCode(config, out, args);
  if (command === 'dev:e2e-setup') return runE2eSetup(config, out);
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
      case 'outbox:process': {
        const ctx: AppContext = { config, pool: handle.pool, now: () => new Date() };
        const res = await processDue(ctx);
        out.log(`outbox:process: ${JSON.stringify(res)}`);
        return 0;
      }
      case 'purge:retention': {
        const ctx: AppContext = { config, pool: handle.pool, now: () => new Date() };
        const res = await purgeRetention(ctx);
        out.log(`purge:retention: ${JSON.stringify(res)}`);
        return 0;
      }
      case 'purge:pow': {
        const n = await purgePow({ config, pool: handle.pool, now: () => new Date() });
        out.log(`purge:pow: ${n} provocări expirate șterse`);
        return 0;
      }
      case 'settings:report-pow': {
        const arg = args[0];
        if (arg !== 'on' && arg !== 'off' && arg !== 'status') {
          out.error('Utilizare: settings:report-pow on|off|status');
          return 2;
        }
        if (arg !== 'status') {
          const now = new Date();
          await setSetting(handle.pool, REPORT_POW_KEY, arg === 'on', now, null);
          await writeAudit(handle.pool, now, {
            actorType: 'system', action: 'settings.report_pow', targetType: 'settings', targetId: REPORT_POW_KEY,
            details: { enabled: arg === 'on', via: 'cli' },
          });
        }
        out.log(`ALTCHA la sesizări: ${(await isReportPowEnabled(handle.pool)) ? 'PORNIT' : 'OPRIT'}`);
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

function argValue(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

/** B3 §6: primul super_admin; parola temporară apare O SINGURĂ DATĂ, numai în ieșirea comenzii. */
async function runBootstrap(config: Config, out: Out, args: string[]): Promise<number> {
  const email = argValue(args, '--email');
  const name = argValue(args, '--name') ?? 'Administrator';
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    out.error('Utilizare: bootstrap-admin --email <adresă controlată> [--name "Nume afișat"]');
    return 2;
  }
  const handle = createDb(config.databaseUrl, { connectionLimit: 1 });
  try {
    const created = await bootstrapAdmin(handle.pool, new Date(), email, name);
    out.log(`Cont super_admin creat pentru ${email.toLowerCase()}.`);
    out.log(`Parola temporară (afișată o singură dată; se schimbă la prima autentificare): ${created.temporaryPassword}`);
    return 0;
  } catch (err) {
    out.error(err instanceof BootstrapRefusedError ? err.message : err instanceof Error ? err.message : String(err));
    return err instanceof BootstrapRefusedError ? 2 : 1;
  } finally {
    await handle.close();
  }
}

/** B3 §8 (T-A3): codul simulat al unui cetățean, numai în afara producției. */
async function runShowCode(config: Config, out: Out, args: string[]): Promise<number> {
  if (config.appEnv === 'production') {
    out.error('dev:show-code este refuzat în producție.');
    return 2;
  }
  const email = argValue(args, '--email');
  // 5.4: `--latest` = ultimul cod emis, fără adresă (pentru „Run JS script” din cPanel, care nu acceptă argumente;
  // adresa testerului nu intră în pachet). Tot numai în afara producției.
  const latest = args.includes('--latest');
  if (!email && !latest) {
    out.error('Utilizare: dev:show-code --email <adresa cetățeanului>   sau   dev:show-code --latest');
    return 2;
  }
  const handle = createDb(config.databaseUrl, { connectionLimit: 1 });
  try {
    const [rows] = await handle.pool.query(
      `SELECT body_text AS b, created_at AS c FROM email_outbox
       WHERE kind = 'citizen_login_code' ${latest ? '' : 'AND recipient = ?'} AND body_text IS NOT NULL
       ORDER BY created_at DESC, id DESC LIMIT 1`,
      latest ? [] : [email!.trim().toLowerCase()],
    );
    const row = (rows as Array<{ b: string; c: Date }>)[0];
    const code = row?.b.match(/\b(\d{6})\b/)?.[1];
    if (!code) {
      out.error('Niciun cod pentru această adresă.');
      return 1;
    }
    out.log(`Ultimul cod (${row!.c.toISOString()}): ${code}`);
    return 0;
  } finally {
    await handle.close();
  }
}

/**
 * NUMAI pentru suita E2E (tests/, B10 §4): DB de test gol → schema, configurarea și 3 conturi Admin de test,
 * cu parola și secretul TOTP primite din mediu (generate aleator de harness la fiecare rulare; nimic în Git).
 * Refuzat în afara mediului `development` și pentru un DB al cărui nume nu conține „test”.
 */
async function runE2eSetup(config: Config, out: Out): Promise<number> {
  const dbName = new URL(config.databaseUrl).pathname.replace(/^\//, '');
  const password = process.env.CIVIC_E2E_PASSWORD ?? '';
  const totpSecret = process.env.CIVIC_E2E_TOTP_SECRET ?? '';
  if (config.appEnv !== 'development' || !/test/i.test(dbName)) {
    out.error('dev:e2e-setup: permis numai cu APP_ENV=development și un DB de test.');
    return 2;
  }
  if (password.length < 12 || !/^[A-Z2-7]{16,}$/.test(totpSecret)) {
    out.error('dev:e2e-setup: lipsesc CIVIC_E2E_PASSWORD (≥ 12) sau CIVIC_E2E_TOTP_SECRET (base32).');
    return 2;
  }
  const handle = createDb(config.databaseUrl, { connectionLimit: 3 }); // migrate() folosește două conexiuni
  try {
    const [tables] = await handle.pool.query(
      "SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'",
    );
    const conn = await handle.pool.getConnection();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const { t } of tables as Array<{ t: string }>) await conn.query(`DROP TABLE \`${t}\``);
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    } finally {
      conn.release();
    }
    await migrate(handle.pool, MIGRATIONS_DIR);
    await seedConfig(handle.pool, SEEDS_DIR);
    // Faza 5.3: conținutul public (comunicate, ghid, apel rapid) vine din DB; E2E folosesc datele demo
    await seedDemo(handle.pool, SEEDS_DIR, config.appEnv);
    const now = new Date();
    const hash = await hashPassword(password);
    const accounts = [
      { email: 'e2e-admin@exemplu.test', name: 'Administrator Platformă', role: 'super_admin', totp: true },
      { email: 'e2e-operator@exemplu.test', name: 'Operator Primărie', role: 'primarie_operator', totp: false },
      { email: 'e2e-operator2@exemplu.test', name: 'Operator Primărie', role: 'primarie_operator', totp: false },
    ];
    for (const a of accounts) {
      await handle.pool.query(
        `INSERT INTO admin_users (id, email, display_name, role, status, password_hash, must_change_password,
           failed_login_count, totp_secret_enc, totp_enabled_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'active', ?, 0, 0, ?, ?, ?, ?)`,
        [newId(now), a.email, a.name, a.role, hash,
          a.totp ? encryptSecret(config.secrets.totpEncKey, totpSecret) : null, a.totp ? now : null, now, now],
      );
    }
    out.log(`dev:e2e-setup: DB de test pregătit, ${accounts.length} conturi Admin de test.`);
    return 0;
  } finally {
    await handle.close();
  }
}
