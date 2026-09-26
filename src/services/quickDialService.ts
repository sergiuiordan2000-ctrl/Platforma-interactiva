/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QuickDialCategory, QuickDialContact } from '../types/quickDial';
import { INITIAL_DEMO_CATEGORIES, INITIAL_DEMO_CONTACTS } from '../data/mockQuickDial';
import { permissionService } from './permissionService';

const STORAGE_CONTACTS_KEY = 'turnu_civic_quickdial_contacts';
const STORAGE_CATEGORIES_KEY = 'turnu_civic_quickdial_categories';

class QuickDialService {
  private categories: QuickDialCategory[] = [...INITIAL_DEMO_CATEGORIES];
  private contacts: QuickDialContact[] = [...INITIAL_DEMO_CONTACTS];
  private listeners: Array<() => void> = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      const storedCategories = localStorage.getItem(STORAGE_CATEGORIES_KEY);
      if (storedCategories) {
        const parsed = JSON.parse(storedCategories);
        this.categories = parsed.map((c: QuickDialCategory, idx: number) => ({
          ...c,
          isActive: c.isActive !== undefined ? c.isActive : true,
          order: c.order !== undefined ? c.order : idx + 1,
        }));
      } else {
        this.categories = INITIAL_DEMO_CATEGORIES.map((c, idx) => ({ ...c, isActive: true, order: idx + 1 }));
        this.saveCategories();
      }

      const storedContacts = localStorage.getItem(STORAGE_CONTACTS_KEY);
      if (storedContacts) {
        const parsed = JSON.parse(storedContacts);
        this.contacts = parsed.map((c: QuickDialContact, idx: number) => ({
          ...c,
          isActive: c.isActive !== undefined ? c.isActive : true,
          order: c.order !== undefined ? c.order : idx + 1,
        }));
      } else {
        this.contacts = INITIAL_DEMO_CONTACTS.map((c, idx) => ({ ...c, isActive: true, order: idx + 1 }));
        this.saveContacts();
      }
    } catch {
      this.categories = [...INITIAL_DEMO_CATEGORIES];
      this.contacts = [...INITIAL_DEMO_CONTACTS];
    }
  }

  private saveCategories() {
    try {
      localStorage.setItem(STORAGE_CATEGORIES_KEY, JSON.stringify(this.categories));
      this.notify();
    } catch {
      // Ignoră erorile de storage
    }
  }

  private saveContacts() {
    try {
      localStorage.setItem(STORAGE_CONTACTS_KEY, JSON.stringify(this.contacts));
      this.notify();
    } catch {
      // Ignoră erorile de storage
    }
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Eroare la notificarea ascultătorilor quickDialService:', err);
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  // ==========================================
  // CATEGORII QUICK DIAL
  // ==========================================

  public getCategories(includeInactive = false): QuickDialCategory[] {
    const list = includeInactive ? this.categories : this.categories.filter((c) => c.isActive !== false);
    return [...list].sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  public addCategory(category: Omit<QuickDialCategory, 'id'>): QuickDialCategory | null {
    if (!permissionService.currentUserCan('quickDial.categories.manage')) return null; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    const newId = `cat-${Date.now()}`;
    const nextOrder = this.categories.length + 1;
    const newCategory: QuickDialCategory = {
      ...category,
      id: newId,
      isActive: category.isActive !== undefined ? category.isActive : true,
      order: category.order !== undefined ? category.order : nextOrder,
    };

    this.categories = [...this.categories, newCategory];
    this.saveCategories();
    return newCategory;
  }

  public updateCategory(id: string, patch: Partial<QuickDialCategory>): boolean {
    if (!permissionService.currentUserCan('quickDial.categories.manage')) return false; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    this.categories = this.categories.map((c) => {
      if (c.id === id) {
        const updated = { ...c, ...patch };
        // Actualizăm și numele categoriei în contactele asociate dacă s-a modificat
        if (patch.name && patch.name !== c.name) {
          this.contacts = this.contacts.map((contact) => {
            if (contact.categoryId === id) {
              return { ...contact, categoryName: patch.name! };
            }
            return contact;
          });
          this.saveContacts();
        }
        return updated;
      }
      return c;
    });
    this.saveCategories();
    return true;
  }

  public deleteCategory(id: string): { success: boolean; error?: string } {
    if (!permissionService.currentUserCan('quickDial.categories.manage')) return { success: false, error: 'Nu aveți permisiunea necesară pentru această operație.' }; // ETAPA 6.5 (P1/P2)
    // Verificăm dacă există contacte asociate
    const hasContacts = this.contacts.some((c) => c.categoryId === id);
    if (hasContacts) {
      return {
        success: false,
        error: 'Categoria nu poate fi ștearsă deoarece are contacte asociate. Reatribuiți contactele înainte de ștergere.',
      };
    }

    this.categories = this.categories.filter((c) => c.id !== id);
    this.saveCategories();
    return { success: true };
  }

  public reorderCategories(orderedIds: string[]): boolean {
    if (!permissionService.currentUserCan('quickDial.categories.manage')) return false; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    const map = new Map(this.categories.map((c) => [c.id, c]));
    const reordered: QuickDialCategory[] = [];

    orderedIds.forEach((id, index) => {
      const c = map.get(id);
      if (c) {
        reordered.push({ ...c, order: index + 1 });
        map.delete(id);
      }
    });

    map.forEach((c) => {
      reordered.push({ ...c, order: reordered.length + 1 });
    });

    this.categories = reordered;
    this.saveCategories();
    return true;
  }

  // ==========================================
  // CONTACTE QUICK DIAL
  // ==========================================

  public getAllContacts(
    categoryId: string = 'all',
    searchQuery: string = '',
    includeInactive = false
  ): QuickDialContact[] {
    let result = includeInactive ? [...this.contacts] : this.contacts.filter((c) => c.isActive !== false);

    if (categoryId !== 'all') {
      result = result.filter((c) => c.categoryId === categoryId);
    }

    if (searchQuery.trim() !== '') {
      const term = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.phone.includes(term) ||
          c.formattedPhone.toLowerCase().includes(term) ||
          (c.shortDescription && c.shortDescription.toLowerCase().includes(term)) ||
          (c.address && c.address.toLowerCase().includes(term))
      );
    }

    return result.sort((a, b) => {
      // Urgențele primele în modul public
      if (!includeInactive) {
        if (a.isEmergency && !b.isEmergency) return -1;
        if (!a.isEmergency && b.isEmergency) return 1;
      }
      return (a.order || 0) - (b.order || 0);
    });
  }

  public getEmergencyContacts(includeInactive = false): QuickDialContact[] {
    const list = includeInactive ? this.contacts : this.contacts.filter((c) => c.isActive !== false);
    return list.filter((c) => c.isEmergency);
  }

  public getContactById(id: string): QuickDialContact | undefined {
    return this.contacts.find((c) => c.id === id);
  }

  public addContact(contact: Omit<QuickDialContact, 'id'>): QuickDialContact | null {
    if (!permissionService.currentUserCan('quickDial.contacts.manage')) return null; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    const newId = `qd-${Date.now()}`;
    const nextOrder = this.contacts.length + 1;
    const cleanedPhone = contact.phone.replace(/[\s\-\(\)\.]/g, '');

    const newContact: QuickDialContact = {
      ...contact,
      id: newId,
      phone: cleanedPhone,
      formattedPhone: contact.formattedPhone || contact.phone,
      isActive: contact.isActive !== undefined ? contact.isActive : true,
      order: contact.order !== undefined ? contact.order : nextOrder,
    };

    this.contacts = [...this.contacts, newContact];
    this.saveContacts();
    return newContact;
  }

  public updateContact(id: string, patch: Partial<QuickDialContact>): boolean {
    if (!permissionService.currentUserCan('quickDial.contacts.manage')) return false; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    this.contacts = this.contacts.map((c) => {
      if (c.id === id) {
        const cleanedPhone = patch.phone ? patch.phone.replace(/[\s\-\(\)\.]/g, '') : c.phone;
        return {
          ...c,
          ...patch,
          phone: cleanedPhone,
        };
      }
      return c;
    });
    this.saveContacts();
    return true;
  }

  public toggleContactStatus(id: string): boolean {
    if (!permissionService.currentUserCan('quickDial.contacts.manage')) return false; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    this.contacts = this.contacts.map((c) => {
      if (c.id === id) {
        return { ...c, isActive: !c.isActive };
      }
      return c;
    });
    this.saveContacts();
    return true;
  }

  public deleteContact(id: string): boolean {
    if (!permissionService.currentUserCan('quickDial.contacts.manage')) return false; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    this.contacts = this.contacts.filter((c) => c.id !== id);
    this.saveContacts();
    return true;
  }

  public reorderContacts(orderedIds: string[]): boolean {
    if (!permissionService.currentUserCan('quickDial.contacts.manage')) return false; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    const map = new Map(this.contacts.map((c) => [c.id, c]));
    const reordered: QuickDialContact[] = [];

    orderedIds.forEach((id, index) => {
      const c = map.get(id);
      if (c) {
        reordered.push({ ...c, order: index + 1 });
        map.delete(id);
      }
    });

    map.forEach((c) => {
      reordered.push({ ...c, order: reordered.length + 1 });
    });

    this.contacts = reordered;
    this.saveContacts();
    return true;
  }

  public getCountsByCategory(includeInactive = false): Record<string, number> {
    const list = includeInactive ? this.contacts : this.contacts.filter((c) => c.isActive !== false);
    const counts: Record<string, number> = { all: list.length };
    this.categories.forEach((cat) => {
      counts[cat.id] = list.filter((c) => c.categoryId === cat.id).length;
    });
    return counts;
  }

  public resetToDemo(): boolean {
    if (!permissionService.currentUserCanAll(['quickDial.contacts.manage', 'quickDial.categories.manage'])) return false; // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu
    this.categories = INITIAL_DEMO_CATEGORIES.map((c, idx) => ({ ...c, isActive: true, order: idx + 1 }));
    this.contacts = INITIAL_DEMO_CONTACTS.map((c, idx) => ({ ...c, isActive: true, order: idx + 1 }));
    this.saveCategories();
    this.saveContacts();
    return true;
  }
}

export const quickDialService = new QuickDialService();
