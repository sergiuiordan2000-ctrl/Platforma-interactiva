// Comenzile CLI (B2 §2): același artefact, alt punct de intrare.
//   node server/dist/app.js <comandă>
// În 5.1: migrate, migrate:status, seed:config, seed:demo, check:no-demo, backup:db, restore:db.
// 5.4: outbox:process, purge:retention (sesizări, audit administrativ, blocări expirate, fișiere temporare),
// purge:pow, settings:report-pow (ALTCHA la sesizări, decizia A1 din 30.09.2026).
// rotate:keys: cele 4 chei „ușoare” din CIVIC_ENV_FILE, fără afișarea valorilor (varianta A din 30.09.2026).
// 5.6: surveys:close-expired (E-3, cron la 5 min); rotate:keys păstrează PARTICIPATION_HMAC_SECRET cât timp există sondaje deschise (T-6).
// rotate:totp-key [--check]: schimbarea cheii TOTP_ENC_KEY, cu mod de probă (plan: FAZA_5_4_ROTIRE_TOTP_PLAN.md).
// Faza 6, A1: markers:rebuild-counter [--at-least N]: refacerea EXPLICITĂ a marcajului contorului TM pierdut.

import { basename } from 'node:path';
import type { Config } from './config.ts';
import { BootstrapRefusedError, bootstrapAdmin } from './accounts.ts';
import { encryptSecret } from './auth/crypto.ts';
import { hashPassword } from './auth/password.ts';
import { newId } from './ids.ts';
import { createBackup, recreateAccountMarkers, formatRestoreAftercare, formatRestoreInspection, inspectRestore, listBackups, restoreBackup } from './db/backup.ts';
import { MarkerError, REBUILD_COUNTER_COMMAND, RECREATE_ACCOUNT_MARKERS_COMMAND } from './db/markers.ts';
import { HOST_RESTORE_COMMAND, formatHostRecovery, recoverAfterHostRestore } from './db/hostRestore.ts';
import { initBackupMarkers, rebuildReportCounterWatermark } from './db/reportCounter.ts';
import { createDb } from './db/client.ts';
import { migrate, schemaStatus } from './db/migrations.ts';
import { checkNoDemo } from './db/noDemo.ts';
import { SeedRefusedError, assertDemoAllowed, seedConfig, seedDemo } from './db/seeds.ts';
import { MIGRATIONS_DIR, SEEDS_DIR } from './paths.ts';
import type { AppContext } from './context.ts';
import { purgePow, purgeRetention } from './maintenance.ts';
import { processDue } from './reports/outbox.ts';
import { REPORT_POW_KEY, isReportPowEnabled, setSetting } from './settings.ts';
import { writeAudit } from './audit.ts';
import { ENV_FILE_VAR } from './envFile.ts';
import { ROTATED_KEYS, RotateKeysError, rotateKeysInFile } from './rotateKeys.ts';
import { closeExpiredSurveys, hasOpenSurveys } from './surveys.ts';
import { emailDowngradeMessage, mailTransportFor } from './reports/smtp.ts';
import { RotateTotpKeyError, RotateTotpKeyRenameError, rotateTotpKey } from './rotateTotpKey.ts';

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
  'rotate:keys',
  'rotate:totp-key',
  'surveys:close-expired',
  REBUILD_COUNTER_COMMAND,
  RECREATE_ACCOUNT_MARKERS_COMMAND,
  HOST_RESTORE_COMMAND,
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
  if (command === RECREATE_ACCOUNT_MARKERS_COMMAND) {
    // R18: refacere explicită, numai fișiere (fără bază); numai numere în ieșire
    if (!config.backupDir) {
      out.error(`${RECREATE_ACCOUNT_MARKERS_COMMAND}: BACKUP_DIR nu este configurat.`);
      return 2;
    }
    try {
      const r = recreateAccountMarkers(config.backupDir);
      out.log(
        `${RECREATE_ACCOUNT_MARKERS_COMMAND}: directoarele de conturi refăcute; ${r.entries} marcaje aduse din ${r.copiesRead} copii. ` +
          'Ștergerile de conturi de după cea mai nouă copie nu pot fi cunoscute (vezi FAZA_5_1_BACKUP_RESTAURARE.md §7).',
      );
      return 0;
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      return 1;
    }
  }
  if (command === 'dev:show-code') return runShowCode(config, out, args);
  if (command === 'dev:e2e-setup') return runE2eSetup(config, out);
  if (command === 'rotate:keys') return runRotateKeys(config, out);
  if (command === 'rotate:totp-key') return runRotateTotpKey(config, out, args);
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
        // sesizările demo primesc numere TM: marcajul contorului se scrie și pentru ele (R2); inițializarea
        // completă (A1): refuz dacă marcajul contorului s-a pierdut, altfel marcajul există înainte de emitere
        assertDemoAllowed(config.appEnv); // refuzul din producție vine primul, înainte de a atinge marcajele
        if (config.backupDir) await initBackupMarkers(handle.pool, config.backupDir);
        const res = await seedDemo(handle.pool, SEEDS_DIR, config.appEnv, config.backupDir);
        out.log(`seed:demo (rânduri noi): ${JSON.stringify(res)}`);
        return 0;
      }
      case REBUILD_COUNTER_COMMAND: {
        if (!config.backupDir) {
          out.error(`${REBUILD_COUNTER_COMMAND}: BACKUP_DIR nu este configurat; nu există marcaj de refăcut.`);
          return 2;
        }
        // alegere explicită, înainte de orice scriere: --at-least <ultimul număr TM comunicat> sau --from-db
        const raw = argValue(args, '--at-least');
        const fromDb = args.includes('--from-db');
        const known = new Set(['--at-least', '--from-db']);
        const unknown = args.some((a, i) => (a.startsWith('--') ? !known.has(a) : args[i - 1] !== '--at-least'));
        const atLeast = raw !== undefined && /^\d+$/.test(raw) ? Number(raw) : null;
        const usable = !unknown && (fromDb !== args.includes('--at-least')) && (fromDb || (atLeast !== null && Number.isSafeInteger(atLeast)));
        if (!usable) {
          out.error(`Utilizare: ${REBUILD_COUNTER_COMMAND} --at-least <N>   (N = cel mai mare număr TM comunicat vreodată, de exemplu 12)`);
          out.error(`           ${REBUILD_COUNTER_COMMAND} --from-db        (numai ce se vede în bază: contorul și sesizările existente)`);
          out.error('Dacă baza a fost readusă dintr-o copie, numerele emise după copie nu se văd în bază: folosiți --at-least.');
          return 2;
        }
        const res = await rebuildReportCounterWatermark(handle.pool, config.backupDir, fromDb ? null : atLeast);
        out.log(
          `${REBUILD_COUNTER_COMMAND}: contorul din bază ${res.counterFound}; cel mai mare număr din sesizări ` +
            `${res.highestReportNumber ?? '—'}; --at-least ${res.atLeast ?? '—'} → marcaj scris: ${res.watermark}. ` +
            `Următorul număr emis: TM-${String(res.watermark + 1).padStart(3, '0')}.`,
        );
        return 0;
      }
      case HOST_RESTORE_COMMAND: {
        // R20: după restaurarea întregului cont de către furnizor; aplicația oprită, cronurile dezactivate
        if (!config.backupDir) {
          out.error(`${HOST_RESTORE_COMMAND}: BACKUP_DIR nu este configurat.`);
          return 2;
        }
        const raw = argValue(args, '--at-least');
        const check = args.includes('--check');
        const confirm = args.includes('--confirm');
        const known = new Set(['--at-least', '--check', '--confirm']);
        const unknown = args.some((a, i) => (a.startsWith('--') ? !known.has(a) : args[i - 1] !== '--at-least'));
        if (unknown || raw === undefined || !/^\d+$/.test(raw) || check === confirm) {
          out.error(`Utilizare: ${HOST_RESTORE_COMMAND} --at-least <N> --check     (numai verificare: nu scrie nimic)`);
          out.error(`           ${HOST_RESTORE_COMMAND} --at-least <N> --confirm   (aplicația oprită, cronurile dezactivate)`);
          out.error('N = cel mai mare număr TM comunicat vreodată (din Admin sau din e-mailuri).');
          return 2;
        }
        const ctx: AppContext = { config, pool: handle.pool, now: () => new Date() };
        try {
          const res = await recoverAfterHostRestore(ctx, { backupDir: config.backupDir, atLeast: Number(raw), check });
          for (const line of formatHostRecovery(res)) out.log(line);
          return 0;
        } catch (err) {
          // verificările (MarkerError) au loc înaintea oricărei scrieri; o eroare ulterioară se raportează ca atare
          out.error(`${HOST_RESTORE_COMMAND}: ${err instanceof MarkerError ? 'refuzat, nimic scris' : 'eroare'}. ${err instanceof Error ? err.message : String(err)}`);
          return 1;
        }
      }
      case 'outbox:process': {
        const warning = emailDowngradeMessage(config);
        if (warning) out.error(warning);
        const ctx: AppContext = { config, pool: handle.pool, now: () => new Date(), mailTransport: mailTransportFor(config) };
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
      case 'surveys:close-expired': {
        const now = new Date();
        const ids = await closeExpiredSurveys({ config, pool: handle.pool, now: () => now });
        for (const id of ids) {
          await writeAudit(handle.pool, now, { actorType: 'system', action: 'survey.status.closed', targetType: 'survey', targetId: id, details: { via: 'cron', reason: 'end_at' } });
        }
        out.log(`surveys:close-expired: ${ids.length} sondaje închise`);
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
      const ai = res.accountIntents;
      if (ai.confirmed + ai.discarded + ai.keptCreatedAfter + ai.errors + ai.invalid > 0) {
        // R18: numai numere (fără ID-uri și adrese)
        out.log(
          `backup:db: intenții de ștergere a conturilor reconciliate — confirmate ${ai.confirmed}, eliminate ${ai.discarded}; ` +
            `rămase: create după intenție ${ai.keptCreatedAfter}, erori ${ai.errors}, ilizibile ${ai.invalid}`,
        );
      }
      if (res.markers.counterRaisedFrom !== null) {
        // A8: singura scriere în bază făcută de backup; după o depunere anulată sau o cădere este normală,
        // altfel este semn că baza a fost readusă la o stare mai veche
        out.log(
          `backup:db: contorul TM din bază (${res.markers.counterRaisedFrom}) era sub marcajul durabil; ` +
            `a fost ridicat la ${res.markers.counter} înainte de copie (numerele rezervate nu se refolosesc).`,
        );
      }
      return 0;
    }
    const source = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--at-least');
    const check = args.includes('--check');
    if (!source || (!check && !args.includes('--confirm'))) {
      out.error('Utilizare: restore:db <director-backup> --check     (numai verificare: nu scrie nimic)');
      out.error('           restore:db <director-backup> --confirm   (într-un DB nou, după „migrate”, cu un STORAGE_DIR nou, gol)');
      out.error('           opțional, numai dacă marcajele s-au pierdut definitiv: --allow-missing-markers --at-least <N>');
      out.error('           (N = cel mai mare număr TM comunicat vreodată; contorul restaurat și marcajul refăcut pornesc de la el)');
      const available = listBackups(config.backupDir);
      if (available.length > 0) out.error(`Backup-uri disponibile: ${available.join(', ')}`);
      return 2;
    }
    // G1: --at-least <N> (număr întreg); o valoare lipsă sau nenumerică este refuzată de verificări, fără scriere
    const atLeastRaw = argValue(args, '--at-least');
    const atLeast = !args.includes('--at-least') ? null : atLeastRaw !== undefined && /^\d+$/.test(atLeastRaw) ? Number(atLeastRaw) : Number.NaN;
    const restoreOpts = { ...base, source, allowMissingMarkers: args.includes('--allow-missing-markers'), atLeast };
    if (check) {
      // `--check` are întâietate față de `--confirm`: cu el nu se scrie nimic (bază, fișiere, marcaje, copie)
      const inspection = await inspectRestore(restoreOpts);
      out.log('restore:db --check: numai verificare, nu se scrie nimic.');
      for (const line of formatRestoreInspection(inspection)) out.log(line);
      return inspection.problems.length === 0 ? 0 : 1;
    }
    const res = await restoreBackup(restoreOpts);
    out.log(`restore:db: rânduri ${JSON.stringify(res.rows)}`);
    out.log(
      `restore:db: fotografii restaurate ${res.photosRestored}, lipsă ${res.photosMissing}; ` +
        `șterse conform listei ${res.deletedFromList}; eliminate prin retenție ${res.purgedByRetention}`,
    );
    out.log(`restore:db: contorul TM restaurat: ${res.reportCounter}`);
    if (res.markersWritten.length > 0) out.log(`restore:db: marcaje refăcute în BACKUP_DIR: ${res.markersWritten.join('; ')}`);
    // R18 / R19: conturile șterse din nou și mesajele reținute (fără destinatar, fără adrese)
    for (const line of formatRestoreAftercare(res)) out.log(line);
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
    if (config.backupDir) await initBackupMarkers(handle.pool, config.backupDir);
    await seedDemo(handle.pool, SEEDS_DIR, config.appEnv, config.backupDir);
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

/** rotate:keys — valorile noi se scriu numai în fișier; nu se afișează niciuna. */
async function runRotateKeys(config: Config, out: Out, env: NodeJS.ProcessEnv = process.env): Promise<number> {
  const file = env[ENV_FILE_VAR]?.trim();
  if (!file) {
    out.error(`rotate:keys: variabila ${ENV_FILE_VAR} lipsește; comanda lucrează numai cu fișierul de setări.`);
    return 2;
  }
  // T-6: cheia de participare nu se rotește cât timp există sondaje deschise (altfel unicitatea votului se rupe, R-9)
  let open = false;
  const check = createDb(config.databaseUrl, { connectionLimit: 1 });
  try {
    open = await hasOpenSurveys(check.pool, new Date());
  } finally {
    await check.close();
  }
  const wanted = open ? ROTATED_KEYS.filter((k) => k !== 'PARTICIPATION_HMAC_SECRET') : ROTATED_KEYS;
  if (open) out.log('rotate:keys: PARTICIPATION_HMAC_SECRET rămâne neschimbată: există sondaje deschise (se rotește după închiderea lor).');
  let keys: string[];
  try {
    keys = rotateKeysInFile(file, undefined, wanted);
  } catch (e) {
    if (e instanceof RotateKeysError) {
      out.error(`rotate:keys: ${e.message}`);
      return 1;
    }
    throw e;
  }
  out.log(`rotate:keys: ${keys.length} chei schimbate (${keys.join(', ')}). Valorile nu se afișează.`);
  const handle = createDb(config.databaseUrl, { connectionLimit: 1 });
  try {
    await writeAudit(handle.pool, new Date(), {
      actorType: 'system', action: 'system.keys.rotate', targetType: 'settings', targetId: 'env-file', details: { keys, via: 'cli' },
    });
  } catch {
    out.log('rotate:keys: atenție — rândul de audit nu a putut fi scris (cheile au fost totuși schimbate).');
  } finally {
    await handle.close();
  }
  out.log('rotate:keys: reporniți aplicația (Setup Node.js App → Restart) ca să folosească noile chei.');
  return 0;
}

/**
 * rotate:totp-key [--check] — schimbarea cheii TOTP_ENC_KEY (plan: FAZA_5_4_ROTIRE_TOTP_PLAN.md).
 * `--check` = modul de probă: toate verificările, nicio schimbare. Nicio valoare de cheie nu se afișează.
 */
async function runRotateTotpKey(config: Config, out: Out, args: string[], env: NodeJS.ProcessEnv = process.env): Promise<number> {
  const dryRun = args.includes('--check');
  const name = dryRun ? 'rotate:totp-key --check' : 'rotate:totp-key';
  const file = env[ENV_FILE_VAR]?.trim();
  if (!file) {
    out.error(`${name}: variabila ${ENV_FILE_VAR} lipsește; comanda lucrează numai cu fișierul de setări.`);
    return 2;
  }
  const handle = createDb(config.databaseUrl, { connectionLimit: 1 });
  try {
    const res = await rotateTotpKey({ file, pool: handle.pool, currentKey: config.secrets.totpEncKey, now: new Date(), dryRun });
    if (res.status === 'orphan_blocks') {
      out.error(
        `${name}: există ${res.orphanBlocks} blocări active ale unor conturi deja șterse. Amprenta lor nu poate fi mutată pe cheia nouă. ` +
          'Nimic nu a fost schimbat. Pentru aceste blocări nu există astăzi o acțiune în Admin; este nevoie de o decizie a proprietarului înaintea unei noi rulări.',
      );
      return 1;
    }
    const c = res.counts;
    const summary = `secrete TOTP recriptate: ${c.totpSecrets}; blocări cu amprenta recalculată: ${c.blocks}; ` +
      `coduri de recuperare șterse: ${c.recoveryCodes}; coduri de cetățean șterse: ${c.citizenCodes}`;
    if (res.status === 'checked') {
      out.log(`${name}: PROBĂ reușită. La o rulare reală: ${summary}.`);
      out.log(`${name}: nimic nu a fost schimbat (nici baza de date, nici fișierul de setări).`);
      return 0;
    }
    out.log(`${name}: cheia a fost schimbată. ${summary}. Valoarea cheii nu se afișează.`);
    out.log(`${name}: reporniți aplicația (Setup Node.js App → Restart). Apoi fiecare super_admin generează coduri de recuperare noi.`);
    return 0;
  } catch (e) {
    if (e instanceof RotateTotpKeyRenameError) {
      out.error(
        `${name}: ATENȚIE — baza de date folosește deja cheia nouă, dar fișierul de setări nu a putut fi înlocuit. ` +
          `Redenumiți fișierul „${basename(e.tmpFile)}” în „${basename(e.envFile)}” (în același folder), apoi reporniți aplicația. ` +
          'NU rulați comanda din nou înainte de asta.',
      );
      return 1;
    }
    if (e instanceof RotateTotpKeyError) {
      out.error(`${name}: ${e.message}`);
      return 1;
    }
    throw e;
  } finally {
    await handle.close();
  }
}
