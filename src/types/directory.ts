/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CityHallSchedule {
  day: string;
  hours: string;
  note?: string;
}

export interface CityHallAudience {
  role: string;
  schedule: string;
  registrationNote: string;
}

export interface CityHallDepartment {
  id: string;
  name: string;
  description: string;
  location?: string;
  phone?: string;
  email?: string;
  schedule?: string;
  headOfDepartment?: string;
  isActive?: boolean;
  order?: number;
}

export interface CityHallService {
  id: string;
  title: string;
  departmentId: string;
  departmentName: string;
  description: string;
  documentsRequired?: string[];
  processingTime?: string;
  fee?: string;
  onlineLink?: string;
  isActive?: boolean;
  order?: number;
}

export interface UsefulLink {
  id: string;
  title: string;
  description: string;
  url: string;
  category: 'Plăți & Taxe' | 'Transparență Decizională' | 'Servicii Digitale' | 'Instituții Partenere';
  isExternal: boolean;
  isActive?: boolean;
  order?: number;
}

export interface CityHallInfo {
  institutionName: string;
  shortName: string;
  county: string;
  address: string;
  postalCode: string;
  primaryPhone: string;
  secondaryPhone?: string;
  fax?: string;
  primaryEmail: string;
  registryEmail?: string;
  websiteUrl: string;
  schedule: CityHallSchedule[];
  audienceSchedule: CityHallAudience[];
  departments: CityHallDepartment[];
  services: CityHallService[];
  usefulLinks: UsefulLink[];
  isDemo: boolean;
}
