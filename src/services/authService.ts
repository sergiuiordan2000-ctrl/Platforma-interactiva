/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Autentificarea Admin pe server (Faza 5.2, B3). Înlocuiește sesiunea client-side din Etapele 2C–6
 * (limitarea P7): identitatea, rolul și permisiunile vin numai de la server (`GET /auth/me`), sesiunea
 * este un cookie HttpOnly. Nu există conturi, parole sau sesiuni în browser.
 *
 * Pașii autentificării: parolă → TOTP (înrolare sau cod) → schimbarea parolei temporare → panou.
 */

import { api, ApiError } from './apiClient';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'primarie_operator';
  permissions: string[];
  mfaEnabled: boolean;
}

export type AuthStep = 'loading' | 'anonymous' | 'mfa_enroll' | 'mfa_required' | 'change_password' | 'ready';

type MeResponse = {
  id: string;
  displayName: string;
  email: string;
  role: AdminUser['role'];
  permissions: string[];
  mustChangePassword: boolean;
  mfaEnabled: boolean;
  mfaPending: boolean;
};

/** Cheia sesiunii client-side vechi (P7): se elimină din browsere la 5.2 (B1 §5.1). */
const LEGACY_SESSION_KEY = 'turnu_civic_admin_session';

class AuthService {
  private currentUser: AdminUser | null = null;
  private step: AuthStep = 'loading';
  private listeners: Array<(isAuth: boolean) => void> = [];
  private directory = new Map<string, string>();
  public readonly ready: Promise<void>;

  constructor() {
    try {
      localStorage.removeItem(LEGACY_SESSION_KEY);
      sessionStorage.removeItem(LEGACY_SESSION_KEY);
    } catch {
      // stocare indisponibilă
    }
    this.ready = this.refresh();
  }

  private notify() {
    const authState = this.isAuthenticated();
    this.listeners.forEach((listener) => listener(authState));
  }

  private apply(me: MeResponse | null) {
    if (!me) {
      this.currentUser = null;
      this.step = 'anonymous';
    } else {
      this.currentUser = {
        id: me.id,
        email: me.email,
        name: me.displayName,
        role: me.role,
        permissions: me.permissions,
        mfaEnabled: me.mfaEnabled,
      };
      this.step = me.mfaPending
        ? me.mfaEnabled ? 'mfa_required' : 'mfa_enroll'
        : me.mustChangePassword ? 'change_password' : 'ready';
    }
    this.notify();
  }

  /** Reîncarcă starea de la server (`GET /auth/me`). */
  public async refresh(): Promise<void> {
    try {
      this.apply(await api.get<MeResponse>('/auth/me'));
      if (this.step === 'ready') void this.loadDirectory();
    } catch {
      this.apply(null);
    }
  }

  public subscribe(listener: (isAuth: boolean) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /** Autentificat complet: parolă + TOTP (dacă e cazul) + parolă definitivă. */
  public isAuthenticated(): boolean {
    return this.step === 'ready' && this.currentUser !== null;
  }

  public getStep(): AuthStep {
    return this.step;
  }

  public getCurrentUser(): AdminUser | null {
    return this.step === 'ready' ? this.currentUser : null;
  }

  public async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      await api.post('/auth/login', { email: email.trim(), password });
      await this.refresh();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof ApiError ? err.message : 'Autentificarea a eșuat.' };
    }
  }

  public async verifyTotp(code: string): Promise<{ success: boolean; error?: string }> {
    return this.step_(() => api.post('/auth/mfa/verify', { code }));
  }

  public async useRecoveryCode(code: string): Promise<{ success: boolean; error?: string }> {
    return this.step_(() => api.post('/auth/mfa/recovery', { code }));
  }

  public async startEnrollment(): Promise<{ otpauthUri: string; secretBase32: string }> {
    return api.post('/auth/mfa/enroll/start');
  }

  /** Confirmă înrolarea; întoarce codurile de recuperare (afișate o singură dată). Starea se reîncarcă separat. */
  public async confirmEnrollment(code: string): Promise<{ success: boolean; recoveryCodes?: string[]; error?: string }> {
    try {
      const res = await api.post<{ recoveryCodes: string[] }>('/auth/mfa/enroll/confirm', { code });
      return { success: true, recoveryCodes: res.recoveryCodes };
    } catch (err) {
      return { success: false, error: err instanceof ApiError ? err.message : 'Cod incorect.' };
    }
  }

  public async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    return this.step_(() => api.post('/auth/change-password', { currentPassword, newPassword }));
  }

  public async regenerateRecoveryCodes(): Promise<string[]> {
    return (await api.post<{ recoveryCodes: string[] }>('/auth/mfa/recovery-codes/regenerate')).recoveryCodes;
  }

  public async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch {
      // sesiunea poate fi deja expirată
    }
    this.directory.clear();
    this.apply(null);
  }

  private async step_(call: () => Promise<unknown>): Promise<{ success: boolean; error?: string }> {
    try {
      await call();
      await this.refresh();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof ApiError ? err.message : 'Operația a eșuat.' };
    }
  }

  /** Numele afișate ale conturilor Admin (pentru responsabili), de la server. */
  private async loadDirectory(): Promise<void> {
    try {
      const res = await api.get<{ items: Array<{ id: string; displayName: string }> }>('/admin/accounts/directory');
      this.directory = new Map(res.items.map((i) => [i.id, i.displayName]));
    } catch {
      // fără permisiunea `reports.view`: lista rămâne goală
    }
  }

  public getDisplayNameById(id: string): string | null {
    return this.directory.get(id) ?? null;
  }

  /**
   * NUMAI pentru testele din modul de dezvoltare (Vite dev): fixează utilizatorul curent, ca testele de
   * serviciu ale domeniilor încă locale (sesizări, până la 5.4) să poată schimba rolul. În build-ul de
   * producție ramura este eliminată (`import.meta.env.DEV` = false), deci nu poate acorda acces.
   */
  public setUserForDevTests(user: AdminUser | null): void {
    if (!import.meta.env.DEV) return;
    if (user) this.directory.set(user.id, user.name); // ca `/admin/accounts/directory` pentru contul curent
    this.currentUser = user;
    this.step = user ? 'ready' : 'anonymous';
    this.notify();
  }
}

export const authService = new AuthService();
