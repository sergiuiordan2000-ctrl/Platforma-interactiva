// Amendamentul Google, pasul 3 (corecția de după audit, 09.10.2026): validarea strictă a adresei la care interfața
// trimite browserul când cetățeanul apasă „Continuă cu Google”.
//
// Adresa vine de la serverul nostru (`POST /citizen/auth/google/start` → `authorizationUrl`). Interfața nu navighează
// la ea „pe încredere”: o acceptă numai dacă este exact adresa de autorizare Google sau, numai când aplicația însăși
// este deschisă de pe calculatorul local (dezvoltare / teste), furnizorul de identitate fals, local (G-T10).
// Orice altceva (alt site, altă schemă, altă cale, adresă cu utilizator, parametri neconformi) este respins.
//
// Fișierul este în `shared` ca regula să poată fi testată și pe server (aceeași funcție ca în interfață).

/** Adresa de autorizare Google (OpenID Connect). Aceeași valoare ca în `server/src/auth/googleOAuth.ts` (verificat de un test). */
export const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_HOST = 'accounts.google.com';
const GOOGLE_PATH = '/o/oauth2/v2/auth';

/** Furnizorul fals al testelor (`tests/lib/fake_oidc.mjs`): numai pe calculatorul local, numai această cale. */
export const DEV_OIDC_AUTHORIZATION_PATH = '/authorize';
const LOOPBACK_HOSTS: readonly string[] = ['localhost', '127.0.0.1'];

/** Ce se cere de la furnizor (G-2): numai adresa de e-mail. */
export const GOOGLE_OAUTH_SCOPE = 'openid email';

/** De unde este deschisă aplicația (în browser: `window.location`). */
export type PageLocation = { protocol: string; hostname: string };

type ParsedUrl = {
  href: string;
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  username: string;
  password: string;
  hash: string;
  searchParams: { get(name: string): string | null; getAll(name: string): string[] };
};
// Analizorul de adrese al platformei (același pe care îl folosește browserul la navigare); `shared` nu depinde de DOM / Node.
const UrlParser = (globalThis as unknown as { URL: new (input: string) => ParsedUrl }).URL;

const MAX_LENGTH = 4096;
/** Numai caractere ASCII tipăribile, fără spațiu și fără „\”: serverul construiește adresa codificată (URLSearchParams). */
const PRINTABLE_ASCII = /^[\x21-\x5b\x5d-\x7e]+$/;

const isLoopback = (protocol: string, hostname: string) => protocol === 'http:' && LOOPBACK_HOSTS.includes(hostname);

/**
 * Întoarce adresa (în forma normalizată de analizor) dacă navigarea este permisă; altfel `null`.
 *
 *  1. valoarea este un șir scurt, numai din caractere ASCII tipăribile (fără spații, fără „\”, fără caractere de control);
 *  2. fără utilizator / parolă în adresă și fără fragment (`#…`);
 *  3. destinația este EXACT una dintre:
 *     a) `https://accounts.google.com/o/oauth2/v2/auth` (portul implicit), de oriunde este deschisă aplicația;
 *     b) `http://localhost:<port>/authorize` sau `http://127.0.0.1:<port>/authorize`, NUMAI dacă aplicația însăși este
 *        deschisă de pe `http://localhost` sau `http://127.0.0.1` (pe staging și în producție aplicația este pe HTTPS,
 *        pe domeniul ei, deci varianta b nu poate fi acceptată acolo);
 *  4. parametrii sunt cei ai fluxului nostru: `response_type=code`, numai `openid email`, PKCE `S256`, cu `client_id`,
 *     `redirect_uri`, `state`, `nonce` și `code_challenge` prezente, fiecare o singură dată.
 */
export function safeGoogleAuthorizationUrl(value: unknown, page: PageLocation): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_LENGTH || !PRINTABLE_ASCII.test(value)) return null;
  let url: ParsedUrl;
  try {
    url = new UrlParser(value);
  } catch {
    return null;
  }
  if (url.username !== '' || url.password !== '' || url.hash !== '' || value.includes('#')) return null;

  const google = url.protocol === 'https:' && url.hostname === GOOGLE_HOST && url.port === '' && url.pathname === GOOGLE_PATH;
  const localFake =
    isLoopback(page.protocol, page.hostname) &&
    isLoopback(url.protocol, url.hostname) &&
    url.port !== '' &&
    url.pathname === DEV_OIDC_AUTHORIZATION_PATH;
  if (!google && !localFake) return null;

  const one = (name: string): string | null => {
    const all = url.searchParams.getAll(name);
    return all.length === 1 && all[0] !== '' ? all[0]! : null;
  };
  if (one('response_type') !== 'code') return null;
  if (one('scope') !== GOOGLE_OAUTH_SCOPE) return null;
  if (one('code_challenge_method') !== 'S256') return null;
  for (const name of ['client_id', 'redirect_uri', 'state', 'nonce', 'code_challenge']) {
    if (one(name) === null) return null;
  }
  return url.href;
}
