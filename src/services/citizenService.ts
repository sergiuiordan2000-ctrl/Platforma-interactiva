/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Contul cetățeanului (B2 §4.1, B3 §8; ecranele la 5.4, decizia 5.2): numai e-mailul (A-9),
 * cod de 6 cifre pe e-mail, fără parolă. Sesiunea este un cookie HttpOnly; nimic în `localStorage`.
 * Contul se cere numai pentru depunerea unei sesizări; restul aplicației rămâne fără cont.
 */

import { CITIZEN_POLICY_VERSION } from '@tmc/shared';
import { api, ApiError } from './apiClient';

export interface CitizenMe {
  email: string;
  blocked: { active: boolean; kind?: 'temporary' | 'permanent'; endsAt?: string };
}

class CitizenService {
  /** `null` = neautentificat. */
  async me(): Promise<CitizenMe | null> {
    try {
      return await api.get<CitizenMe>('/citizen/me');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null;
      throw err;
    }
  }

  /** Același răspuns dacă adresa are cont sau nu (fără enumerare, B3 §8). */
  start(email: string, policyAccepted: boolean) {
    return api.post<{ accepted: boolean; message: string }>('/citizen/auth/start', {
      email,
      ...(policyAccepted ? { policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION } : {}),
    });
  }

  verify(email: string, code: string) {
    return api.post<{ ok: true }>('/citizen/auth/verify', { email, code });
  }

  logout() {
    return api.post<void>('/citizen/auth/logout');
  }

  /** 2.7: sesizările rămân (fără autor), conform retenției. */
  deleteAccount() {
    return api.del<void>('/citizen/account');
  }
}

export const citizenService = new CitizenService();
