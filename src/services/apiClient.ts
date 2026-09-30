/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Clientul HTTP al API-ului (Faza 5.2). Aceeași origine (B2 §1); cookie-ul de sesiune este HttpOnly,
 * deci nu este accesibil din JavaScript. Metodele care modifică date trimit antetul CSRF `X-Civic-Request: 1`.
 */

export const API_BASE = '/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(method: string, path: string, body?: unknown, extraHeaders: Record<string, string> = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...extraHeaders };
  if (method !== 'GET') headers['X-Civic-Request'] = '1';
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  // multipart: browserul pune singur Content-Type (cu boundary)
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Serverul nu poate fi contactat. Verificați conexiunea și încercați din nou.');
  }
  if (res.status === 204) return undefined as T;
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; fields?: Record<string, string> } } | null)?.error;
    throw new ApiError(res.status, err?.code ?? 'HTTP_' + res.status, err?.message ?? 'A apărut o eroare. Încercați din nou.', err?.fields);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
  /** Faza 5.4: formular multipart (sesizarea cu fotografii), cu antete suplimentare (Idempotency-Key). */
  postForm: <T>(path: string, form: FormData, headers: Record<string, string> = {}) => request<T>('POST', path, form, headers),
};
