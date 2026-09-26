/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  CityHallInfo, 
  CityHallDepartment, 
  CityHallService, 
  UsefulLink,
  CityHallSchedule,
  CityHallAudience 
} from '../types/directory';
import { INITIAL_DEMO_CITY_HALL_INFO } from '../data/mockDirectory';
import { permissionService, Permission } from './permissionService';

const STORAGE_KEY = 'turnu_civic_city_hall_directory';

class DirectoryService {
  private info: CityHallInfo = { ...INITIAL_DEMO_CITY_HALL_INFO };
  private listeners: Array<() => void> = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.info = {
          ...INITIAL_DEMO_CITY_HALL_INFO,
          ...parsed,
          departments: (parsed.departments || INITIAL_DEMO_CITY_HALL_INFO.departments).map((d: CityHallDepartment, idx: number) => ({
            ...d,
            isActive: d.isActive !== undefined ? d.isActive : true,
            order: d.order !== undefined ? d.order : idx + 1,
          })),
          services: (parsed.services || INITIAL_DEMO_CITY_HALL_INFO.services).map((s: CityHallService, idx: number) => ({
            ...s,
            isActive: s.isActive !== undefined ? s.isActive : true,
            order: s.order !== undefined ? s.order : idx + 1,
          })),
          usefulLinks: (parsed.usefulLinks || INITIAL_DEMO_CITY_HALL_INFO.usefulLinks).map((l: UsefulLink, idx: number) => ({
            ...l,
            isActive: l.isActive !== undefined ? l.isActive : true,
            order: l.order !== undefined ? l.order : idx + 1,
          })),
        };
      } else {
        this.info = {
          ...INITIAL_DEMO_CITY_HALL_INFO,
          departments: INITIAL_DEMO_CITY_HALL_INFO.departments.map((d, idx) => ({ ...d, isActive: true, order: idx + 1 })),
          services: INITIAL_DEMO_CITY_HALL_INFO.services.map((s, idx) => ({ ...s, isActive: true, order: idx + 1 })),
          usefulLinks: INITIAL_DEMO_CITY_HALL_INFO.usefulLinks.map((l, idx) => ({ ...l, isActive: true, order: idx + 1 })),
        };
        this.save();
      }
    } catch {
      this.info = { ...INITIAL_DEMO_CITY_HALL_INFO };
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.info));
      this.notify();
    } catch {
      // Ignoră erorile de spațiu limitat
    }
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Eroare la notificarea ascultătorilor directoryService:', err);
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Returnează setul complet de date al Primăriei.
   */
  public getCityHallInfo(): CityHallInfo {
    return {
      ...this.info,
      departments: this.getDepartments(false),
      services: this.getServices(false),
      usefulLinks: this.getUsefulLinks(false),
    };
  }

  /**
   * Returnează setul brut (inclusiv inactive) pentru panoul de administrare.
   */
  public getRawCityHallInfo(): CityHallInfo {
    return { ...this.info };
  }

  /**
   * ETAPA 6.5 (P1/P2): `updateInstitutionInfo` poate primi prin patch și colecțiile Ghidului.
   * Pe lângă `directory.institution.edit`, fiecare colecție inclusă în patch cere permisiunea ei,
   * astfel încât această metodă să nu poată ocoli permisiunile dedicate.
   */
  private canUpdateInstitution(patch: Partial<CityHallInfo>): boolean {
    const required: Permission[] = ['directory.institution.edit'];
    if (patch.departments) required.push('directory.departments.manage');
    if (patch.services) required.push('directory.services.manage');
    if (patch.usefulLinks) required.push('directory.links.manage');
    if (patch.schedule || patch.audienceSchedule) required.push('directory.schedule.manage');
    return permissionService.currentUserCanAll(required);
  }

  /**
   * Actualizează datele instituționale generale ale Primăriei.
   */
  public updateInstitutionInfo(patch: Partial<CityHallInfo>): boolean {
    if (!this.canUpdateInstitution(patch)) return false; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    this.info = {
      ...this.info,
      ...patch,
      // Păstrează colecțiile dacă nu sunt furnizate explicit
      departments: patch.departments || this.info.departments,
      services: patch.services || this.info.services,
      usefulLinks: patch.usefulLinks || this.info.usefulLinks,
      schedule: patch.schedule || this.info.schedule,
      audienceSchedule: patch.audienceSchedule || this.info.audienceSchedule,
    };
    this.save();
    return true;
  }

  // ==========================================
  // DIRECȚII & DEPARTAMENTE (CRUD + REORDER)
  // ==========================================

  public getDepartments(includeInactive = false): CityHallDepartment[] {
    const list = this.info.departments || [];
    const filtered = includeInactive ? list : list.filter((d) => d.isActive !== false);
    return [...filtered].sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  public getDepartmentById(id: string): CityHallDepartment | undefined {
    return (this.info.departments || []).find((d) => d.id === id);
  }

  public addDepartment(dept: Omit<CityHallDepartment, 'id'>): CityHallDepartment | null {
    if (!permissionService.currentUserCan('directory.departments.manage')) return null; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    const newId = `dep-${Date.now()}`;
    const nextOrder = (this.info.departments || []).length + 1;
    const newDepartment: CityHallDepartment = {
      ...dept,
      id: newId,
      isActive: dept.isActive !== undefined ? dept.isActive : true,
      order: dept.order !== undefined ? dept.order : nextOrder,
    };

    this.info.departments = [...(this.info.departments || []), newDepartment];
    this.save();
    return newDepartment;
  }

  public updateDepartment(id: string, patch: Partial<CityHallDepartment>): boolean {
    if (!permissionService.currentUserCan('directory.departments.manage')) return false; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    this.info.departments = (this.info.departments || []).map((dept) => {
      if (dept.id === id) {
        return { ...dept, ...patch };
      }
      return dept;
    });
    this.save();
    return true;
  }

  public toggleDepartmentStatus(id: string): boolean {
    if (!permissionService.currentUserCan('directory.departments.manage')) return false; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    this.info.departments = (this.info.departments || []).map((dept) => {
      if (dept.id === id) {
        return { ...dept, isActive: !dept.isActive };
      }
      return dept;
    });
    this.save();
    return true;
  }

  public deleteDepartment(id: string): boolean {
    if (!permissionService.currentUserCan('directory.departments.manage')) return false; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    this.info.departments = (this.info.departments || []).filter((dept) => dept.id !== id);
    this.save();
    return true;
  }

  public reorderDepartments(orderedIds: string[]): boolean {
    if (!permissionService.currentUserCan('directory.departments.manage')) return false; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    const map = new Map((this.info.departments || []).map((d) => [d.id, d]));
    const reordered: CityHallDepartment[] = [];

    orderedIds.forEach((id, index) => {
      const d = map.get(id);
      if (d) {
        reordered.push({ ...d, order: index + 1 });
        map.delete(id);
      }
    });

    // Adaugă restul
    map.forEach((d) => {
      reordered.push({ ...d, order: reordered.length + 1 });
    });

    this.info.departments = reordered;
    this.save();
    return true;
  }

  // ==========================================
  // SERVICII PUBLICE PENTRU CETĂȚENI (CRUD + REORDER)
  // ==========================================

  public getServices(includeInactive = false): CityHallService[] {
    const list = this.info.services || [];
    const filtered = includeInactive ? list : list.filter((s) => s.isActive !== false);
    return [...filtered].sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  public getServicesByDepartment(departmentId: string, includeInactive = false): CityHallService[] {
    return this.getServices(includeInactive).filter((s) => s.departmentId === departmentId);
  }

  public addService(srv: Omit<CityHallService, 'id'>): CityHallService | null {
    if (!permissionService.currentUserCan('directory.services.manage')) return null; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    const newId = `srv-${Date.now()}`;
    const nextOrder = (this.info.services || []).length + 1;
    const newService: CityHallService = {
      ...srv,
      id: newId,
      isActive: srv.isActive !== undefined ? srv.isActive : true,
      order: srv.order !== undefined ? srv.order : nextOrder,
    };

    this.info.services = [...(this.info.services || []), newService];
    this.save();
    return newService;
  }

  public updateService(id: string, patch: Partial<CityHallService>): boolean {
    if (!permissionService.currentUserCan('directory.services.manage')) return false; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    this.info.services = (this.info.services || []).map((srv) => {
      if (srv.id === id) {
        return { ...srv, ...patch };
      }
      return srv;
    });
    this.save();
    return true;
  }

  public toggleServiceStatus(id: string): boolean {
    if (!permissionService.currentUserCan('directory.services.manage')) return false; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    this.info.services = (this.info.services || []).map((srv) => {
      if (srv.id === id) {
        return { ...srv, isActive: !srv.isActive };
      }
      return srv;
    });
    this.save();
    return true;
  }

  public deleteService(id: string): boolean {
    if (!permissionService.currentUserCan('directory.services.manage')) return false; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    this.info.services = (this.info.services || []).filter((srv) => srv.id !== id);
    this.save();
    return true;
  }

  public reorderServices(orderedIds: string[]): boolean {
    if (!permissionService.currentUserCan('directory.services.manage')) return false; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    const map = new Map((this.info.services || []).map((s) => [s.id, s]));
    const reordered: CityHallService[] = [];

    orderedIds.forEach((id, index) => {
      const s = map.get(id);
      if (s) {
        reordered.push({ ...s, order: index + 1 });
        map.delete(id);
      }
    });

    map.forEach((s) => {
      reordered.push({ ...s, order: reordered.length + 1 });
    });

    this.info.services = reordered;
    this.save();
    return true;
  }

  // ==========================================
  // PROGRAM & AUDIENȚE
  // ==========================================

  public updateSchedule(schedule: CityHallSchedule[]): boolean {
    if (!permissionService.currentUserCan('directory.schedule.manage')) return false; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    this.info.schedule = [...schedule];
    this.save();
    return true;
  }

  public updateAudienceSchedule(audiences: CityHallAudience[]): boolean {
    if (!permissionService.currentUserCan('directory.schedule.manage')) return false; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    this.info.audienceSchedule = [...audiences];
    this.save();
    return true;
  }

  // ==========================================
  // LINK-URI UTILE (CRUD + REORDER)
  // ==========================================

  public getUsefulLinks(includeInactive = false): UsefulLink[] {
    const list = this.info.usefulLinks || [];
    const filtered = includeInactive ? list : list.filter((l) => l.isActive !== false);
    return [...filtered].sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  public addUsefulLink(link: Omit<UsefulLink, 'id'>): UsefulLink | null {
    if (!permissionService.currentUserCan('directory.links.manage')) return null; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    const newId = `link-${Date.now()}`;
    const nextOrder = (this.info.usefulLinks || []).length + 1;
    const newLink: UsefulLink = {
      ...link,
      id: newId,
      isActive: link.isActive !== undefined ? link.isActive : true,
      order: link.order !== undefined ? link.order : nextOrder,
    };

    this.info.usefulLinks = [...(this.info.usefulLinks || []), newLink];
    this.save();
    return newLink;
  }

  public updateUsefulLink(id: string, patch: Partial<UsefulLink>): boolean {
    if (!permissionService.currentUserCan('directory.links.manage')) return false; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    this.info.usefulLinks = (this.info.usefulLinks || []).map((l) => {
      if (l.id === id) {
        return { ...l, ...patch };
      }
      return l;
    });
    this.save();
    return true;
  }

  public toggleUsefulLinkStatus(id: string): boolean {
    if (!permissionService.currentUserCan('directory.links.manage')) return false; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    this.info.usefulLinks = (this.info.usefulLinks || []).map((l) => {
      if (l.id === id) {
        return { ...l, isActive: !l.isActive };
      }
      return l;
    });
    this.save();
    return true;
  }

  public deleteUsefulLink(id: string): boolean {
    if (!permissionService.currentUserCan('directory.links.manage')) return false; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    this.info.usefulLinks = (this.info.usefulLinks || []).filter((l) => l.id !== id);
    this.save();
    return true;
  }

  public reorderUsefulLinks(orderedIds: string[]): boolean {
    if (!permissionService.currentUserCan('directory.links.manage')) return false; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    const map = new Map((this.info.usefulLinks || []).map((l) => [l.id, l]));
    const reordered: UsefulLink[] = [];

    orderedIds.forEach((id, index) => {
      const l = map.get(id);
      if (l) {
        reordered.push({ ...l, order: index + 1 });
        map.delete(id);
      }
    });

    map.forEach((l) => {
      reordered.push({ ...l, order: reordered.length + 1 });
    });

    this.info.usefulLinks = reordered;
    this.save();
    return true;
  }

  /**
   * Resetare la setul demonstrativ inițial.
   */
  public resetToDemo(): boolean {
    if (!permissionService.currentUserCan('directory.institution.edit')) return false; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    this.info = {
      ...INITIAL_DEMO_CITY_HALL_INFO,
      departments: INITIAL_DEMO_CITY_HALL_INFO.departments.map((d, idx) => ({ ...d, isActive: true, order: idx + 1 })),
      services: INITIAL_DEMO_CITY_HALL_INFO.services.map((s, idx) => ({ ...s, isActive: true, order: idx + 1 })),
      usefulLinks: INITIAL_DEMO_CITY_HALL_INFO.usefulLinks.map((l, idx) => ({ ...l, isActive: true, order: idx + 1 })),
    };
    this.save();
    return true;
  }
}

export const directoryService = new DirectoryService();
