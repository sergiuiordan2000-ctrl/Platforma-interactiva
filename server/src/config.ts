// Configurarea aplicației: numai variabile de mediu, validate cu Zod la pornire
// (docs/faza4/FAZA_4_00_ARHITECTURA_SI_INDEX.md §5).
//
// Reguli:
// - aplicația refuză să pornească dacă lipsește sau este invalid un secret;
// - mesajele de eroare numesc variabila, niciodată valoarea ei;
// - domeniul apare numai în PUBLIC_BASE_URL (B-7).
//
// Variabilele folosite abia în subfazele următoare (SMTP 5.5, geocodare și UAT 5.4)
// sunt opționale în 5.1 și devin obligatorii în subfaza care le folosește.

import { z } from 'zod';

export const APP_ENVS = ['development', 'staging', 'production'] as const;
export type AppEnv = (typeof APP_ENVS)[number];

/** Valori aprobate (2.5, K-A02-3, A04-4, A05-1, A05-2): nu se pot seta peste ele fără decizie. */
export const APPROVED_RETENTION_DAYS = 45;
export const APPROVED_ADMIN_RETENTION_MONTHS = 6;

const MIN_SECRET_LENGTH = 32;

const secret = z
  .string()
  .min(MIN_SECRET_LENGTH, `trebuie să aibă cel puțin ${MIN_SECRET_LENGTH} de caractere`);

/** Cheia TOTP: exact 32 de octeți, scriși ca 64 de caractere hex sau în base64. */
const totpKey = z.string().transform((value, ctx) => {
  const trimmed = value.trim();
  let bytes: Buffer | null = null;
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    bytes = Buffer.from(trimmed, 'hex');
  } else if (/^[A-Za-z0-9+/]{43}=?$/.test(trimmed)) {
    bytes = Buffer.from(trimmed, 'base64');
  }
  if (!bytes || bytes.length !== 32) {
    ctx.addIssue({
      code: 'custom',
      message: 'trebuie să fie exact 32 de octeți (64 de caractere hex sau base64)',
    });
    return z.NEVER;
  }
  return bytes;
});

const optionalText = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v.trim() === '' ? undefined : v.trim()));

const intFromEnv = (def: number, min: number, max: number) =>
  z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (v === undefined || v.trim() === '') return def;
      if (!/^\d+$/.test(v.trim())) {
        ctx.addIssue({ code: 'custom', message: 'trebuie să fie un număr întreg' });
        return z.NEVER;
      }
      const n = Number(v.trim());
      if (n < min || n > max) {
        ctx.addIssue({ code: 'custom', message: `trebuie să fie între ${min} și ${max}` });
        return z.NEVER;
      }
      return n;
    });

/** TRUST_PROXY: gol / `false` → fără proxy; `true`; un număr de hop-uri; o listă de adrese separate prin virgulă. */
const trustProxy = z
  .string()
  .optional()
  .transform((v): boolean | number | string[] => {
    if (v === undefined) return false;
    const t = v.trim();
    if (t === '' || t === 'false') return false;
    if (t === 'true') return true;
    if (/^\d+$/.test(t)) return Number(t);
    return t
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  });

const EnvSchema = z
  .object({
    APP_ENV: z.enum(APP_ENVS),
    HOST: z.string().optional().default('127.0.0.1'),
    PORT: intFromEnv(3000, 1, 65535),
    PUBLIC_BASE_URL: z.url({ message: 'trebuie să fie o adresă URL completă' }),
    DATABASE_URL: z
      .string()
      .regex(/^mysql:\/\/.+/, 'trebuie să înceapă cu mysql://'),
    STORAGE_DIR: z.string().min(1),
    TRUST_PROXY: trustProxy,
    IP_HASH_SECRET: secret,
    PARTICIPATION_HMAC_SECRET: secret,
    FORM_TOKEN_SECRET: secret,
    POW_HMAC_KEY: secret,
    TOTP_ENC_KEY: totpKey,
    EMAIL_MODE: z.enum(['simulated', 'allowlist', 'live']).optional().default('simulated'),
    EMAIL_ALLOWLIST: optionalText,
    MAIL_FROM: optionalText,
    CIVIC_MAIL_DOMAIN: optionalText,
    SMTP_HOST: optionalText,
    SMTP_PORT: intFromEnv(587, 1, 65535),
    SMTP_SECURE: z.enum(['true', 'false']).optional().default('false'),
    SMTP_USER: optionalText,
    SMTP_PASS: optionalText,
    UAT_BOUNDARY_FILE: optionalText,
    GEOCODER_URL: optionalText,
    GEOCODER_USER_AGENT: optionalText,
    RETENTION_DAYS: intFromEnv(APPROVED_RETENTION_DAYS, 1, APPROVED_RETENTION_DAYS),
    ADMIN_RETENTION_MONTHS: intFromEnv(
      APPROVED_ADMIN_RETENTION_MONTHS,
      1,
      APPROVED_ADMIN_RETENTION_MONTHS,
    ),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .optional()
      .default('info'),
  })
  .superRefine((env, ctx) => {
    if (env.APP_ENV !== 'development' && !env.PUBLIC_BASE_URL.startsWith('https://')) {
      ctx.addIssue({
        code: 'custom',
        path: ['PUBLIC_BASE_URL'],
        message: 'trebuie să folosească https în afara mediului de dezvoltare',
      });
    }
    if (env.EMAIL_MODE === 'allowlist' && !env.EMAIL_ALLOWLIST) {
      ctx.addIssue({
        code: 'custom',
        path: ['EMAIL_ALLOWLIST'],
        message: 'este obligatorie când EMAIL_MODE = allowlist',
      });
    }
    if (env.EMAIL_MODE !== 'simulated') {
      for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `este obligatorie când EMAIL_MODE = ${env.EMAIL_MODE}`,
          });
        }
      }
    }
  });

export type Config = {
  appEnv: AppEnv;
  host: string;
  port: number;
  publicBaseUrl: string;
  databaseUrl: string;
  storageDir: string;
  trustProxy: boolean | number | string[];
  secrets: {
    ipHash: string;
    participationHmac: string;
    formToken: string;
    powHmac: string;
    totpEncKey: Buffer;
  };
  email: {
    mode: 'simulated' | 'allowlist' | 'live';
    allowlist: string[];
    mailFrom?: string;
    civicMailDomain?: string;
    smtp: { host?: string; port: number; secure: boolean; user?: string; pass?: string };
  };
  uatBoundaryFile?: string;
  geocoder: { url?: string; userAgent?: string };
  retentionDays: number;
  adminRetentionMonths: number;
  logLevel: string;
};

export class ConfigError extends Error {
  /** Numai numele variabilelor și motivul; niciodată valorile. */
  readonly problems: string[];
  constructor(problems: string[]) {
    super(
      'Configurare invalidă; aplicația nu pornește:\n' + problems.map((p) => `  - ${p}`).join('\n'),
    );
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => {
      const name = issue.path.length > 0 ? String(issue.path[0]) : '(mediu)';
      const missing =
        issue.code === 'invalid_type' && issue.input === undefined ? 'lipsește' : issue.message;
      return `${name}: ${missing}`;
    });
    throw new ConfigError([...new Set(problems)]);
  }
  const e = parsed.data;
  return {
    appEnv: e.APP_ENV,
    host: e.HOST,
    port: e.PORT,
    publicBaseUrl: e.PUBLIC_BASE_URL.replace(/\/+$/, ''),
    databaseUrl: e.DATABASE_URL,
    storageDir: e.STORAGE_DIR,
    trustProxy: e.TRUST_PROXY,
    secrets: {
      ipHash: e.IP_HASH_SECRET,
      participationHmac: e.PARTICIPATION_HMAC_SECRET,
      formToken: e.FORM_TOKEN_SECRET,
      powHmac: e.POW_HMAC_KEY,
      totpEncKey: e.TOTP_ENC_KEY,
    },
    email: {
      mode: e.EMAIL_MODE,
      allowlist: (e.EMAIL_ALLOWLIST ?? '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
      mailFrom: e.MAIL_FROM,
      civicMailDomain: e.CIVIC_MAIL_DOMAIN,
      smtp: {
        host: e.SMTP_HOST,
        port: e.SMTP_PORT,
        secure: e.SMTP_SECURE === 'true',
        user: e.SMTP_USER,
        pass: e.SMTP_PASS,
      },
    },
    uatBoundaryFile: e.UAT_BOUNDARY_FILE,
    geocoder: { url: e.GEOCODER_URL, userAgent: e.GEOCODER_USER_AGENT },
    retentionDays: e.RETENTION_DAYS,
    adminRetentionMonths: e.ADMIN_RETENTION_MONTHS,
    logLevel: e.LOG_LEVEL,
  };
}
