/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Survey, 
  SurveyQuestion, 
  SurveyQuestionType 
} from './survey';

/**
 * Valoarea unui răspuns individual oferit de un cetățean la o întrebare (Etapa 4C).
 * - single_choice: ID-ul variantei selectate (string)
 * - multiple_choice: array de ID-uri ale variantelor selectate (string[])
 * - free_text: textul introdus de utilizator (string)
 */
export type SurveyAnswerValue = string | string[];

/**
 * Structura unui răspuns individual la o întrebare din sondaj.
 */
export interface SurveyQuestionAnswer {
  questionId: string;
  type: SurveyQuestionType;
  value: SurveyAnswerValue;
}

/**
 * Payload-ul complet al unui vot / trimiteri de răspuns la un sondaj (Etapa 4C).
 * Conform specificației oficiale MVP:
 * - Nu conține date personale (nume, CNP, telefon, email, adresă);
 * - Persistență locală în limitele prototipului MVP;
 * - Conține un identificator local unic al participării.
 */
export interface SurveySubmission {
  id: string; // ex: 'sub-timestamp-random'
  surveyId: string; // ID-ul sondajului completat
  submittedAt: string; // Data și ora trimiterii (ISO 8601)
  answers: SurveyQuestionAnswer[]; // Răspunsurile cetățeanului la fiecare întrebare
}

/**
 * Rezultatul validării formularului de vot înainte de trimitere.
 */
export interface SurveySubmissionValidationResult {
  isValid: boolean;
  errors: Record<string, string>; // Mapping questionId -> mesaj eroare
  generalError?: string;
}
