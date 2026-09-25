/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SurveyQuestionType } from './survey';

/**
 * Rezultatul agregat pentru o opțiune individuală de răspuns (Etapa 4D).
 */
export interface SurveyOptionResult {
  optionId: string;
  text: string;
  order: number;
  votesCount: number; // Numărul de selecții
  percentage: number; // Procentul calculat (0 - 100)
}

/**
 * Rezultatul agregat pentru o întrebare individuală din sondaj (Etapa 4D).
 */
export interface SurveyQuestionResult {
  questionId: string;
  questionText: string;
  questionType: SurveyQuestionType;
  order: number;
  totalAnswersCount: number; // Numărul de respondenți care au oferit răspuns la această întrebare
  optionsResults?: SurveyOptionResult[]; // Pentru single_choice și multiple_choice
  freeTextEntriesCount?: number; // Numărul de intervenții text (pentru free_text)
}

/**
 * Raportul statistic complet agregat pentru un sondaj (Etapa 4D).
 */
export interface SurveyStatisticsReport {
  surveyId: string;
  surveyTitle: string;
  totalSubmissions: number; // Numărul total de formulare / participări înregistrate local
  questionsResults: SurveyQuestionResult[];
  calculatedAt: string; // ISO 8601
}
