/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'primarie_operator';
  lastLogin: string;
}

const SESSION_KEY = 'turnu_civic_admin_session';

const VALID_ROLES: ReadonlyArray<AdminUser['role']> = ['super_admin', 'primarie_operator'];

/**
 * ETAPA 6.4 (C4) — Validarea structurii unei sesiuni citite din stocare.
 * O sesiune lipsă, coruptă sau cu formă invalidă (ex. obiect gol, fără rol, rol inexistent)
 * NU mai este tratată ca utilizator autentificat: este eliminată, iar utilizatorul vede
 * formularul de autentificare.
 *
 * LIMITĂ ASUMATĂ (arhitectură 100% client-side, fără backend): aceasta este o verificare de
 * integritate a datelor, NU o protecție criptografică. O sesiune scrisă manual în DevTools cu
 * structură validă nu poate fi deosebită de una reală fără un server care să emită și să
 * verifice un token semnat.
 */
function isValidSessionUser(value: unknown): value is AdminUser {
  if (!value || typeof value !== 'object') return false;
  const u = value as Record<string, unknown>;
  return (
    typeof u.id === 'string' && u.id.length > 0 &&
    typeof u.email === 'string' && u.email.length > 0 &&
    typeof u.name === 'string' && u.name.length > 0 &&
    typeof u.role === 'string' && (VALID_ROLES as ReadonlyArray<string>).includes(u.role)
  );
}

class AuthService {
  private currentUser: AdminUser | null = null;
  private listeners: Array<(isAuth: boolean) => void> = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isValidSessionUser(parsed)) {
          this.currentUser = parsed;
        } else {
          // Sesiune invalidă: nu acordă acces și este curățată din stocare.
          this.currentUser = null;
          this.persistSession(null);
        }
      }
    } catch {
      this.currentUser = null;
    }
  }

  private persistSession(user: AdminUser | null) {
    try {
      if (user) {
        const serialized = JSON.stringify(user);
        sessionStorage.setItem(SESSION_KEY, serialized);
        localStorage.setItem(SESSION_KEY, serialized);
      } else {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // Ignoră erorile de storage
    }
  }

  private notify() {
    const authState = this.isAuthenticated();
    this.listeners.forEach((listener) => listener(authState));
  }

  public subscribe(listener: (isAuth: boolean) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public getCurrentUser(): AdminUser | null {
    return this.currentUser;
  }

  /**
   * Autentificare administrator.
   * Credențiale implicite de administrare:
   * Email: admin@turnumagurele.ro
   * Parolă: AdminTurnu2026!
   */
  public login(email: string, password: string): { success: boolean; error?: string } {
    const trimmedEmail = email.trim().toLowerCase();

    // Verificare credențiale de acces
    if (
      (trimmedEmail === 'admin@turnumagurele.ro' && password === 'AdminTurnu2026!') ||
      (trimmedEmail === 'operator@turnumagurele.ro' && password === 'OperatorTurnu2026!') ||
      (trimmedEmail === 'demo@turnumagurele.ro' && password === 'demo1234')
    ) {
      const user: AdminUser = {
        id: trimmedEmail.startsWith('admin') ? 'usr-admin-01' : 'usr-operator-01',
        email: trimmedEmail,
        name: trimmedEmail.startsWith('admin') ? 'Administrator Platformă' : 'Operator Primărie',
        role: trimmedEmail.startsWith('admin') ? 'super_admin' : 'primarie_operator',
        lastLogin: new Date().toISOString(),
      };

      this.currentUser = user;
      this.persistSession(user);
      this.notify();
      return { success: true };
    }

    return {
      success: false,
      error: 'Credențiale invalide. Verificați adresa de e-mail și parola introduse.',
    };
  }

  public logout(): void {
    this.currentUser = null;
    this.persistSession(null);
    this.notify();
  }
}

export const authService = new AuthService();
