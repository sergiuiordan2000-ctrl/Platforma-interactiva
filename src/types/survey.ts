/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tipul de întrebare suportat în cadrul sondajelor (Etapa 4A).
 * Conform specificației oficiale MVP:
 * - single_choice: alegere unică (radio)
 * - multiple_choice: alegere multiplă (checkbox)
 * - free_text: răspuns liber (text / textarea)
 */
export type SurveyQuestionType = 'single_choice' | 'multiple_choice' | 'free_text';

/**
 * Statusul ciclului de viață al unui sondaj (Etapa 4A).
 * Conform specificației oficiale:
 * - draft: sondaj în lucru / inactiv, nepublicat
 * - active: sondaj activ, deschis consultării în perioada de valabilitate
 * - closed: sondaj finalizat / închis manual sau la expirarea perioadei
 */
export type SurveyStatus = 'draft' | 'active' | 'closed';

/**
 * Variantă de răspuns pentru întrebările cu opțiuni predefinite (Etapa 4A).
 * Se aplică tipurilor 'single_choice' și 'multiple_choice'.
 */
export interface SurveyAnswerOption {
  id: string; // Identificator unic al variantei (ex: 'opt-1')
  text: string; // Textul opțiunii afișate cetățeanului
  order: number; // Ordinea de afișare (1-indexed)
}

/**
 * Întrebare individuală din cadrul unui sondaj (Etapa 4A).
 */
export interface SurveyQuestion {
  id: string; // Identificator unic al întrebării (ex: 'q-1')
  text: string; // Enunțul întrebării
  type: SurveyQuestionType; // Tipul întrebării (single_choice, multiple_choice, free_text)
  order: number; // Ordinea de afișare a întrebării în sondaj
  isRequired: boolean; // Indicator obligativitate răspuns
  options?: SurveyAnswerOption[]; // Variantele de răspuns (pentru single_choice și multiple_choice)
  helpText?: string; // Text ajutător sau instrucțiuni opționale
}

/**
 * Perioada de valabilitate a sondajului (Etapa 4A).
 */
export interface SurveyPeriod {
  startDate: string; // Format ISO: 'YYYY-MM-DDTHH:mm:ssZ' sau 'YYYY-MM-DD'
  endDate: string; // Format ISO: 'YYYY-MM-DDTHH:mm:ssZ' sau 'YYYY-MM-DD'
}

/**
 * Informații de audit intern pentru sondaj (Etapa 4A).
 */
export interface SurveyAuditInfo {
  createdAt: string; // Data creării (format ISO)
  updatedAt: string; // Data ultimei actualizări (format ISO)
  createdBy?: string; // Nume sau rol creator (ex: 'admin')
}

/**
 * Entitatea principală Sondaj / Consultare Publică (Etapa 4A).
 */
export interface Survey {
  id: string; // Identificator unic al sondajului (ex: 'srv-demo-001')
  title: string; // Titlul consultării cetățenești
  description: string; // Descrierea detaliată și contextul consultării
  category?: string; // Categorie municipală opțională (ex: 'Urbanism', 'Mediu', 'Mobilitate')
  questions: SurveyQuestion[]; // Lista întrebărilor din sondaj
  period: SurveyPeriod; // Perioada de desfășurare (început - sfârșit)
  status: SurveyStatus; // Statusul curent ('draft' | 'active' | 'closed')
  isDemo: boolean; // Indicator explicit că sondajul este demonstrativ (nu oficial)
  audit: SurveyAuditInfo; // Informații de audit (creare, actualizare)
}

/**
 * Filtru utilizabil pentru interogarea sondajelor (Etapa 4A).
 */
export type SurveyStatusFilter = 'all' | SurveyStatus;
