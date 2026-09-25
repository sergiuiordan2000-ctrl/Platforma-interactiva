/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface QuickDialCategory {
  id: string;
  name: string;
  description: string;
  order: number;
  isActive?: boolean;
}

export interface QuickDialContact {
  id: string;
  name: string;
  phone: string;
  formattedPhone: string;
  categoryId: string;
  categoryName: string;
  shortDescription?: string;
  availability: string;       // ex: '24/7 (Non-stop)', 'Luni – Vineri: 08:00 – 16:00'
  isEmergency?: boolean;      // Evidențiere prioritară (roșu/chihlimbar)
  address?: string;
  isDemo: boolean;
  isActive?: boolean;
  order?: number;
}

export type QuickDialFilterCategory = 'all' | string;
