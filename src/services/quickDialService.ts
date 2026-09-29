/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Apelul rapid (Faza 5.3): client al API-ului (B2 §3, §6.3). Sursa datelor este serverul; nimic în
 * `localStorage`. Datele se încarcă o dată pe ecran; filtrarea și căutarea rămân locale (listă mică).
 * Permisiunile (`quickDial.*`) se aplică pe server; resetarea la datele demo nu mai există (D4).
 */

import {
  quickDialCategoryCreateRequest,
  quickDialCategoryUpdateRequest,
  quickDialContactCreateRequest,
  quickDialContactUpdateRequest,
  type QuickDialResponse,
} from '@tmc/shared';
import type { z } from 'zod';
import { QuickDialCategory, QuickDialContact } from '../types/quickDial';
import { api, ApiError } from './apiClient';
import type { MutationResult } from './announcementService';

export interface QuickDialData {
  categories: QuickDialCategory[];
  contacts: QuickDialContact[];
  /** E-7: numărul contactelor pe categorie (calculat de server). */
  counts: Record<string, number>;
}

const u = <T>(v: T | null): T | undefined => (v === null ? undefined : v);
const n = (v: string | undefined) => (v === undefined ? undefined : v.trim() === '' ? null : v.trim());

function toData(r: QuickDialResponse): QuickDialData {
  return {
    categories: r.categories.map((c) => ({ id: c.id, name: c.name, description: c.description, order: c.order, isActive: c.isActive })),
    contacts: r.contacts.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      formattedPhone: c.formattedPhone,
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      shortDescription: u(c.shortDescription),
      availability: c.availability,
      isEmergency: c.isEmergency,
      address: u(c.address),
      isDemo: c.isDemo,
      isActive: c.isActive,
      order: c.order,
    })),
    // `all` = totalul (folosit de filtrul „Toate”), ca înainte de 5.3
    counts: { ...r.countsByCategory, all: r.contacts.length },
  };
}

/**
 * Filtrarea după categorie și căutarea (aceleași reguli ca înainte de 5.3).
 * În zona publică (`emergencyFirst`), urgențele apar primele.
 */
export function filterContacts(
  contacts: QuickDialContact[],
  categoryId = 'all',
  searchQuery = '',
  emergencyFirst = true,
): QuickDialContact[] {
  let result = [...contacts];
  if (categoryId !== 'all') result = result.filter((c) => c.categoryId === categoryId);
  const term = searchQuery.toLowerCase().trim();
  if (term !== '') {
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.phone.includes(term) ||
        c.formattedPhone.toLowerCase().includes(term) ||
        (c.shortDescription && c.shortDescription.toLowerCase().includes(term)) ||
        (c.address && c.address.toLowerCase().includes(term)),
    );
  }
  return result.sort((a, b) => {
    if (emergencyFirst) {
      if (a.isEmergency && !b.isEmergency) return -1;
      if (!a.isEmergency && b.isEmergency) return 1;
    }
    return (a.order || 0) - (b.order || 0);
  });
}

function fieldsOf(issues: Array<{ path: PropertyKey[] }>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) out[i.path.map(String).join('.') || '_'] ??= 'valoare invalidă';
  return out;
}

async function mutate(schema: z.ZodType | null, body: unknown, call: (b: unknown) => Promise<unknown>): Promise<MutationResult> {
  if (schema) {
    const check = schema.safeParse(body);
    if (!check.success) return { success: false, error: 'Datele trimise nu sunt valide.', fields: fieldsOf(check.error.issues) };
  }
  try {
    const res = (await call(body)) as { id?: string } | undefined;
    return { success: true, id: res?.id };
  } catch (err) {
    if (err instanceof ApiError) return { success: false, error: err.message, fields: err.fields };
    return { success: false, error: 'Operația a eșuat. Încercați din nou.' };
  }
}

const enc = encodeURIComponent;

class QuickDialService {
  /** Zona publică: categoriile și contactele active. */
  public async getPublic(): Promise<QuickDialData> {
    return toData(await api.get<QuickDialResponse>('/public/quickdial'));
  }

  /** Admin: toate categoriile și contactele, inclusiv cele inactive. */
  public async getAdmin(): Promise<QuickDialData> {
    return toData(await api.get<QuickDialResponse>('/admin/quickdial'));
  }

  // ——— categorii ———

  private catBody(c: Partial<QuickDialCategory>) {
    const body: Record<string, unknown> = {};
    if (c.name !== undefined) body.name = c.name.trim();
    if (c.description !== undefined) body.description = c.description.trim();
    if (c.isActive !== undefined) body.isActive = c.isActive;
    return body;
  }
  public addCategory(c: Omit<QuickDialCategory, 'id' | 'order'>) {
    return mutate(quickDialCategoryCreateRequest, this.catBody(c), (b) => api.post('/admin/quickdial/categories', b));
  }
  public updateCategory(id: string, patch: Partial<QuickDialCategory>) {
    return mutate(quickDialCategoryUpdateRequest, this.catBody(patch), (b) => api.patch(`/admin/quickdial/categories/${enc(id)}`, b));
  }
  /** 409 dacă are contacte (mesajul vine de la server). */
  public deleteCategory(id: string) {
    return mutate(null, undefined, () => api.del(`/admin/quickdial/categories/${enc(id)}`));
  }
  public reorderCategories(ids: string[]) {
    return mutate(null, { ids }, (b) => api.put('/admin/quickdial/categories/order', b));
  }

  // ——— contacte ———

  private contactBody(c: Partial<QuickDialContact>) {
    const body: Record<string, unknown> = {};
    if (c.categoryId !== undefined) body.categoryId = c.categoryId;
    for (const k of ['name', 'phone', 'formattedPhone', 'availability'] as const) if (c[k] !== undefined) body[k] = c[k]!.trim();
    for (const k of ['shortDescription', 'address'] as const) if (k in c) body[k] = n(c[k]);
    if (c.isEmergency !== undefined) body.isEmergency = c.isEmergency;
    if (c.isActive !== undefined) body.isActive = c.isActive;
    return body;
  }
  public addContact(c: Omit<QuickDialContact, 'id' | 'categoryName' | 'isDemo'> & { categoryName?: string; isDemo?: boolean }) {
    return mutate(quickDialContactCreateRequest, this.contactBody(c), (b) => api.post('/admin/quickdial/contacts', b));
  }
  public updateContact(id: string, patch: Partial<QuickDialContact>) {
    return mutate(quickDialContactUpdateRequest, this.contactBody(patch), (b) => api.patch(`/admin/quickdial/contacts/${enc(id)}`, b));
  }
  public setContactActive(id: string, isActive: boolean) {
    return mutate(null, { isActive }, (b) => api.patch(`/admin/quickdial/contacts/${enc(id)}/toggle`, b));
  }
  public deleteContact(id: string) {
    return mutate(null, undefined, () => api.del(`/admin/quickdial/contacts/${enc(id)}`));
  }
  public reorderContacts(ids: string[]) {
    return mutate(null, { ids }, (b) => api.put('/admin/quickdial/contacts/order', b));
  }
}

export const quickDialService = new QuickDialService();
