/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Ghidul Primăriei (Faza 5.3): client al API-ului (B2 §3, §6.3). Sursa datelor este serverul; nimic în
 * `localStorage`. Permisiunile (`directory.*`) se aplică pe server; interfața le folosește numai pentru
 * afișarea butoanelor. Resetarea la datele demo nu mai există (D4).
 */

import {
  audienceRequest,
  departmentCreateRequest,
  departmentUpdateRequest,
  institutionUpdateRequest,
  linkCreateRequest,
  linkUpdateRequest,
  scheduleRequest,
  serviceCreateRequest,
  serviceUpdateRequest,
  type Department,
  type DirectoryResponse,
  type Service,
  type UsefulLink as ApiLink,
} from '@tmc/shared';
import type { z } from 'zod';
import {
  CityHallAudience,
  CityHallDepartment,
  CityHallInfo,
  CityHallSchedule,
  CityHallService,
  UsefulLink,
} from '../types/directory';
import { api, ApiError } from './apiClient';
import type { MutationResult } from './announcementService';

const u = <T>(v: T | null): T | undefined => (v === null ? undefined : v);
/** Câmpurile goale ale formularului devin `null` (ștergerea valorii). */
const n = (v: string | undefined) => (v === undefined ? undefined : v.trim() === '' ? null : v.trim());

const dep = (d: Department): CityHallDepartment => ({
  id: d.id,
  name: d.name,
  description: d.description,
  location: u(d.location),
  phone: u(d.phone),
  email: u(d.email),
  schedule: u(d.schedule),
  headOfDepartment: u(d.headOfDepartment),
  isActive: d.isActive,
  order: d.order,
});

const srv = (s: Service): CityHallService => ({
  id: s.id,
  title: s.title,
  departmentId: s.departmentId,
  departmentName: s.departmentName,
  description: s.description,
  documentsRequired: s.documentsRequired,
  processingTime: u(s.processingTime),
  fee: u(s.fee),
  onlineLink: u(s.onlineLink),
  isActive: s.isActive,
  order: s.order,
});

const link = (l: ApiLink): UsefulLink => ({
  id: l.id,
  title: l.title,
  description: l.description,
  url: l.url,
  category: l.category,
  isExternal: l.isExternal,
  isActive: l.isActive,
  order: l.order,
});

const EMPTY_INSTITUTION = {
  institutionName: '',
  shortName: '',
  county: '',
  address: '',
  postalCode: '',
  primaryPhone: '',
  primaryEmail: '',
  websiteUrl: '',
  schedule: [] as CityHallSchedule[],
  audienceSchedule: [] as CityHallAudience[],
  isDemo: false,
};

function toInfo(d: DirectoryResponse): CityHallInfo {
  const i = d.institution;
  return {
    ...(i
      ? {
          institutionName: i.institutionName,
          shortName: i.shortName,
          county: i.county,
          address: i.address,
          postalCode: i.postalCode,
          primaryPhone: i.primaryPhone,
          secondaryPhone: u(i.secondaryPhone),
          fax: u(i.fax),
          primaryEmail: i.primaryEmail,
          registryEmail: u(i.registryEmail),
          websiteUrl: i.websiteUrl,
          schedule: i.schedule,
          audienceSchedule: i.audienceSchedule,
          isDemo: i.isDemo,
        }
      : EMPTY_INSTITUTION),
    departments: d.departments.map(dep),
    services: d.services.map(srv),
    usefulLinks: d.links.map(link),
  };
}

function fieldsOf(issues: Array<{ path: PropertyKey[] }>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) out[i.path.map(String).join('.') || '_'] ??= 'valoare invalidă';
  return out;
}

/** Validare locală cu aceeași schemă ca serverul (T4), apoi cererea. */
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

class DirectoryService {
  /** Zona publică: instituția și elementele active, în ordinea stabilită. */
  public async getCityHallInfo(): Promise<CityHallInfo> {
    return toInfo(await api.get<DirectoryResponse>('/public/directory'));
  }

  /** Admin: toate elementele, inclusiv cele inactive. */
  public async getAdminCityHallInfo(): Promise<CityHallInfo> {
    return toInfo(await api.get<DirectoryResponse>('/admin/directory'));
  }

  /** Adresa registraturii, numai informativă (D10-6, A17-2); folosită de fluxul local al sesizărilor până la 5.4. */
  public async getRegistryEmail(): Promise<string | undefined> {
    return (await this.getCityHallInfo()).registryEmail;
  }

  // ——— instituția, programul, audiențele ———

  public updateInstitutionInfo(patch: Partial<Omit<CityHallInfo, 'departments' | 'services' | 'usefulLinks' | 'schedule' | 'audienceSchedule' | 'isDemo'>>) {
    const body: Record<string, unknown> = {};
    const req = ['institutionName', 'shortName', 'county', 'address', 'postalCode', 'primaryPhone', 'primaryEmail', 'websiteUrl'] as const;
    for (const k of req) if (patch[k] !== undefined) body[k] = patch[k]!.trim();
    for (const k of ['secondaryPhone', 'fax', 'registryEmail'] as const) if (k in patch) body[k] = n(patch[k]);
    return mutate(institutionUpdateRequest, body, (b) => api.patch('/admin/directory/institution', b));
  }

  public updateSchedule(schedule: CityHallSchedule[]) {
    const items = schedule.map((s) => ({ day: s.day, hours: s.hours, ...(s.note ? { note: s.note } : {}) }));
    return mutate(scheduleRequest, { items }, (b) => api.put('/admin/directory/schedule', b));
  }

  public updateAudienceSchedule(audiences: CityHallAudience[]) {
    const items = audiences.map((a) => ({ role: a.role, schedule: a.schedule, registrationNote: a.registrationNote ?? '' }));
    return mutate(audienceRequest, { items }, (b) => api.put('/admin/directory/audience', b));
  }

  // ——— direcții ———

  private depBody(d: Partial<CityHallDepartment>) {
    const body: Record<string, unknown> = {};
    if (d.name !== undefined) body.name = d.name.trim();
    if (d.description !== undefined) body.description = d.description.trim();
    for (const k of ['location', 'phone', 'email', 'schedule', 'headOfDepartment'] as const) if (k in d) body[k] = n(d[k]);
    if (d.isActive !== undefined) body.isActive = d.isActive;
    return body;
  }
  public addDepartment(d: Omit<CityHallDepartment, 'id'>) {
    return mutate(departmentCreateRequest, this.depBody(d), (b) => api.post('/admin/directory/departments', b));
  }
  public updateDepartment(id: string, patch: Partial<CityHallDepartment>) {
    return mutate(departmentUpdateRequest, this.depBody(patch), (b) => api.patch(`/admin/directory/departments/${enc(id)}`, b));
  }
  public setDepartmentActive(id: string, isActive: boolean) {
    return mutate(null, { isActive }, (b) => api.patch(`/admin/directory/departments/${enc(id)}/toggle`, b));
  }
  public deleteDepartment(id: string) {
    return mutate(null, undefined, () => api.del(`/admin/directory/departments/${enc(id)}`));
  }
  public reorderDepartments(ids: string[]) {
    return mutate(null, { ids }, (b) => api.put('/admin/directory/departments/order', b));
  }

  // ——— servicii ———

  private srvBody(s: Partial<CityHallService>) {
    const body: Record<string, unknown> = {};
    if (s.departmentId !== undefined) body.departmentId = s.departmentId;
    if (s.title !== undefined) body.title = s.title.trim();
    if (s.description !== undefined) body.description = s.description.trim();
    if ('documentsRequired' in s) {
      const docs = (s.documentsRequired ?? []).map((x) => x.trim()).filter(Boolean);
      body.documentsRequired = docs.length ? docs : null;
    }
    for (const k of ['processingTime', 'fee', 'onlineLink'] as const) if (k in s) body[k] = n(s[k]);
    if (s.isActive !== undefined) body.isActive = s.isActive;
    return body;
  }
  public addService(s: Omit<CityHallService, 'id' | 'departmentName'> & { departmentName?: string }) {
    return mutate(serviceCreateRequest, this.srvBody(s), (b) => api.post('/admin/directory/services', b));
  }
  public updateService(id: string, patch: Partial<CityHallService>) {
    return mutate(serviceUpdateRequest, this.srvBody(patch), (b) => api.patch(`/admin/directory/services/${enc(id)}`, b));
  }
  public setServiceActive(id: string, isActive: boolean) {
    return mutate(null, { isActive }, (b) => api.patch(`/admin/directory/services/${enc(id)}/toggle`, b));
  }
  public deleteService(id: string) {
    return mutate(null, undefined, () => api.del(`/admin/directory/services/${enc(id)}`));
  }
  public reorderServices(ids: string[]) {
    return mutate(null, { ids }, (b) => api.put('/admin/directory/services/order', b));
  }

  // ——— linkuri utile ———

  private linkBody(l: Partial<UsefulLink>) {
    const body: Record<string, unknown> = {};
    if (l.title !== undefined) body.title = l.title.trim();
    if (l.description !== undefined) body.description = l.description.trim();
    if (l.url !== undefined) body.url = l.url.trim();
    if (l.category !== undefined) body.category = l.category;
    if (l.isExternal !== undefined) body.isExternal = l.isExternal;
    if (l.isActive !== undefined) body.isActive = l.isActive;
    return body;
  }
  public addUsefulLink(l: Omit<UsefulLink, 'id'>) {
    return mutate(linkCreateRequest, this.linkBody(l), (b) => api.post('/admin/directory/links', b));
  }
  public updateUsefulLink(id: string, patch: Partial<UsefulLink>) {
    return mutate(linkUpdateRequest, this.linkBody(patch), (b) => api.patch(`/admin/directory/links/${enc(id)}`, b));
  }
  public setUsefulLinkActive(id: string, isActive: boolean) {
    return mutate(null, { isActive }, (b) => api.patch(`/admin/directory/links/${enc(id)}/toggle`, b));
  }
  public deleteUsefulLink(id: string) {
    return mutate(null, undefined, () => api.del(`/admin/directory/links/${enc(id)}`));
  }
  public reorderUsefulLinks(ids: string[]) {
    return mutate(null, { ids }, (b) => api.put('/admin/directory/links/order', b));
  }
}

export const directoryService = new DirectoryService();
