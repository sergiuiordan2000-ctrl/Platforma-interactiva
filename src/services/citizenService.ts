/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Contul cetățeanului (B2 §4.1, B3 §8; ecranele la 5.4, decizia 5.2): numai e-mailul (A-9),
 * cod de 6 cifre pe e-mail, fără parolă; din amendamentul Google, și autentificarea cu Google (același cont, G-3).
 * Sesiunea este un cookie HttpOnly; nimic în `localStorage`.
 * Contul se cere numai pentru depunerea unei sesizări; restul aplicației rămâne fără cont.
 */

import { CITIZEN_POLICY_VERSION, safeGoogleAuthorizationUrl, type PowChallenge } from '@tmc/shared';
import { api, ApiError } from './apiClient';
import { solvePow } from './powSolver';

export interface CitizenMe {
  email: string;
  blocked: { active: boolean; kind?: 'temporary' | 'permanent'; endsAt?: string };
}

class CitizenService {
  /** `null` = neautentificat. `optional=1`: 200 `{ authenticated: false }` în loc de 401 (amendamentul 5.5). */
  async me(): Promise<CitizenMe | null> {
    try {
      const res = await api.get<CitizenMe | { authenticated: false }>('/citizen/me?optional=1');
      return 'authenticated' in res && res.authenticated === false ? null : (res as CitizenMe);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null;
      throw err;
    }
  }

  /**
   * Același răspuns dacă adresa are cont sau nu (fără enumerare, B3 §8).
   * D-B3 (13.10.2026): înainte de cerere, browserul rezolvă provocarea ALTCHA (câteva secunde).
   */
  async start(email: string, policyAccepted: boolean) {
    const challenge = await api.get<PowChallenge>('/citizen/auth/pow-challenge');
    const pow = await solvePow(challenge);
    if (!pow) throw new ApiError(400, 'POW_INVALID', 'Verificarea anti-robot nu a reușit. Încercați din nou.');
    return api.post<{ accepted: boolean; message: string }>('/citizen/auth/start', {
      email,
      ...(policyAccepted ? { policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION } : {}),
      pow,
    });
  }

  verify(email: string, code: string) {
    return api.post<{ ok: true }>('/citizen/auth/verify', { email, code });
  }

  /**
   * Amendamentul Google (§12.1 a): butonul „Continuă cu Google” se afișează numai dacă serverul răspunde 200.
   * Orice alt răspuns (404 = neconfigurat, eroare de rețea) → fără buton; codul primit pe e-mail rămâne disponibil.
   */
  async googleEnabled(): Promise<boolean> {
    try {
      const res = await api.get<{ enabled?: boolean }>('/citizen/auth/google');
      return res?.enabled === true;
    } catch {
      return false;
    }
  }

  /**
   * Amendamentul Google (§8 A, §11.1): pornirea prin clientul API (`POST`, sub protecția CSRF), cu bifa politicii.
   * Întoarce adresa la care navighează browserul; serverul a pus deja cookie-ul încercării.
   *
   * Corecția de după audit (09.10.2026): adresa primită NU este folosită pe încredere. Se acceptă numai adresa de
   * autorizare Google sau, numai când aplicația este deschisă de pe calculatorul local, furnizorul fals al testelor
   * (`safeGoogleAuthorizationUrl`, în `@tmc/shared`). Orice altă adresă → `null`, iar interfața nu navighează.
   */
  async googleStart(): Promise<string | null> {
    const res = await api.post<{ authorizationUrl?: unknown } | null>('/citizen/auth/google/start', {
      policyAccepted: true,
      policyVersion: CITIZEN_POLICY_VERSION,
    });
    return safeGoogleAuthorizationUrl(res?.authorizationUrl, window.location);
  }

  logout() {
    return api.post<void>('/citizen/auth/logout');
  }

  /** 2.7: sesizările rămân (fără autor), conform retenției. */
  deleteAccount() {
    return api.del<void>('/citizen/account');
  }
}

/** Motivele cu care serverul întoarce cetățeanul la `/#sesizari?google=<motiv>` după un refuz (amendamentul Google, §12). */
export const GOOGLE_RETURN_MESSAGES = {
  eroare: 'Autentificarea cu Google nu a reușit. Încercați din nou sau folosiți codul primit pe e-mail.',
  anulat: 'Ați renunțat la autentificarea cu Google. Puteți încerca din nou sau puteți folosi codul primit pe e-mail.',
  blocat: 'Această adresă nu mai poate fi folosită pentru un cont nou.',
  limita: 'Prea multe încercări. Reveniți mai târziu.',
} as const;

/**
 * Citește motivul din adresă (`#sesizari?google=<motiv>`) și curăță adresa, ca mesajul să nu reapară la reîncărcare
 * și să nu rămână în istoricul browserului. Un motiv necunoscut nu produce niciun mesaj.
 */
export function takeGoogleReturnMessage(): string | null {
  const [name, query] = window.location.hash.replace(/^#/, '').split('?');
  if (query === undefined) return null;
  const params = new URLSearchParams(query);
  if (!params.has('google')) return null;
  const reason = params.get('google') ?? '';
  params.delete('google');
  const rest = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${name}${rest ? `?${rest}` : ''}`);
  return Object.prototype.hasOwnProperty.call(GOOGLE_RETURN_MESSAGES, reason)
    ? GOOGLE_RETURN_MESSAGES[reason as keyof typeof GOOGLE_RETURN_MESSAGES]
    : null;
}

export const citizenService = new CitizenService();
