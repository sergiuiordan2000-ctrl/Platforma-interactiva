/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Survey, 
  SurveyStatus, 
  SurveyQuestion, 
  SurveyAnswerOption, 
  SurveyQuestionType 
} from '../types/survey';
import { 
  SurveySubmission, 
  SurveyQuestionAnswer, 
  SurveySubmissionValidationResult 
} from '../types/surveySubmission';
import { 
  SurveyStatisticsReport, 
  SurveyQuestionResult, 
  SurveyOptionResult 
} from '../types/surveyStatistics';
import { DEMO_SURVEYS } from '../data/mockSurveys';
import { permissionService, Permission } from './permissionService';

/**
 * ETAPA 6.5 (P1/P2) — permisiunea necesară pentru a aduce un sondaj într-o stare țintă:
 * 'active' → `surveys.activate`; 'closed' → `surveys.close`; 'draft' → `surveys.edit`
 * (readucerea la ciornă este o editare; nu există permisiune dedicată în matrice).
 */
const surveyStatusPermission = (status: SurveyStatus): Permission =>
  status === 'active' ? 'surveys.activate' : status === 'closed' ? 'surveys.close' : 'surveys.edit';

/** ETAPA 6.5: ștergerea / resetarea sondajelor — aceeași regulă ca în UI (decizia 5D). */
const SURVEY_DATA_MANAGEMENT: Permission[] = ['surveys.create', 'surveys.edit'];

/**
 * Cheia de stocare locală utilizată de instanța de prototip (MVP).
 * NOTĂ DE ARHITECTURĂ:
 * Acest mecanism utilizează persistența locală (localStorage) strict în limitele
 * documentate pentru prototipul MVP. NU este o bază de date centralizată și nu
 * realizează sincronizare server-side între utilizatori diferiți.
 * Serviciul este decuplat de UI și pregătit pentru conectare ulterioară la un backend centralizat.
 */
const STORAGE_SURVEYS_KEY = 'turnu_civic_surveys_store';
const STORAGE_SUBMISSIONS_KEY = 'turnu_civic_survey_submissions_store';
const STORAGE_PARTICIPATIONS_KEY = 'turnu_civic_user_participated_surveys';

export class SurveyService {
  private static instance: SurveyService;

  private constructor() {
    this.ensureInitialized();
  }

  public static getInstance(): SurveyService {
    if (!SurveyService.instance) {
      SurveyService.instance = new SurveyService();
    }
    return SurveyService.instance;
  }

  /**
   * Asigură inițializarea stocării locale cu date demonstrative dacă este prima accesare.
   */
  private ensureInitialized(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_SURVEYS_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_SURVEYS_KEY, JSON.stringify(DEMO_SURVEYS));
      }
    } catch (e) {
      console.warn('Nu s-a putut inițializa stocarea locală pentru sondaje:', e);
    }
  }

  /**
   * Returnează toate sondajele din stocare.
   */
  public getAllSurveys(): Survey[] {
    if (typeof window === 'undefined') return DEMO_SURVEYS;
    try {
      const stored = localStorage.getItem(STORAGE_SURVEYS_KEY);
      if (stored) {
        // A-05 (post-audit): JSON valid, dar cu formă greșită (obiect, text, număr, `null`) sau cu
        // elemente care nu sunt obiecte blocau randarea paginii #sondaje (ecran alb). Se acceptă doar
        // o listă, iar elementele care nu sunt obiecte sunt ignorate; altfel se folosește același
        // fallback ca la JSON invalid. Datele stocate nu sunt rescrise aici.
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((s): s is Survey => typeof s === 'object' && s !== null);
        }
        console.warn('Formă invalidă a sondajelor din storage (se așteaptă o listă); se returnează seed-ul.');
      }
    } catch (e) {
      console.warn('Eroare la parsarea sondajelor din storage, se returnează seed-ul:', e);
    }
    return DEMO_SURVEYS;
  }

  /**
   * Salvează colecția completă de sondaje în storage-ul local.
   */
  private saveSurveys(surveys: Survey[]): boolean {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.setItem(STORAGE_SURVEYS_KEY, JSON.stringify(surveys));
      return true;
    } catch (e) {
      console.error('Eroare la salvarea sondajelor în storage:', e);
      return false;
    }
  }

  /**
   * Obține un sondaj specific după identificatorul său unic.
   */
  public getSurveyById(id: string): Survey | undefined {
    const surveys = this.getAllSurveys();
    return surveys.find((s) => s.id === id);
  }

  /**
   * Filtrează sondajele după status (draft | active | closed).
   */
  public getSurveysByStatus(status: SurveyStatus): Survey[] {
    const surveys = this.getAllSurveys();
    return surveys.filter((s) => s.status === status);
  }

  /**
   * Obține sondajele active deschise consultării cetățenești.
   */
  public getActiveSurveys(): Survey[] {
    return this.getSurveysByStatus('active');
  }

  /**
   * Evaluează starea temporală a unui sondaj pe baza datei curente și a perioadei de valabilitate.
   * Returnează:
   * - 'upcoming': dacă data curentă este anterioară datei de început
   * - 'in_progress': dacă data curentă se încadrează între data de început și sfârșit
   * - 'expired': dacă data curentă depășește data de sfârșit
   * - 'indeterminate': dacă datele sunt invalide
   */
  public getTemporalState(survey: Survey, referenceDate: Date = new Date()): 'upcoming' | 'in_progress' | 'expired' | 'indeterminate' {
    try {
      const start = new Date(survey.period.startDate).getTime();
      const end = new Date(survey.period.endDate).getTime();
      const now = referenceDate.getTime();

      if (isNaN(start) || isNaN(end)) return 'indeterminate';
      if (now < start) return 'upcoming';
      if (now > end) return 'expired';
      return 'in_progress';
    } catch {
      return 'indeterminate';
    }
  }

  /**
   * Verifică dacă un sondaj este deschis pentru colectarea răspunsurilor
   * (are statusul 'active' și se află în interiorul perioadei de valabilitate).
   */
  public isSurveyOpen(survey: Survey, referenceDate: Date = new Date()): boolean {
    if (survey.status !== 'active') return false;
    return this.getTemporalState(survey, referenceDate) === 'in_progress';
  }

  /**
   * Validează integritatea structurală a unui sondaj conform specificației Etapei 4A:
   * - Existența unui ID, titlu și descriere;
   * - Perioadă validă (data de sfârșit ulterioară datei de început);
   * - Existența a cel puțin o întrebare;
   * - Pentru întrebările cu opțiuni (single_choice, multiple_choice), verifică existența a minim 2 opțiuni;
   * - Întrebările de tip free_text nu necesită opțiuni.
   */
  public validateSurveyStructure(survey: Survey): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!survey.id || !survey.id.trim()) {
      errors.push('Identificatorul sondajului este obligatoriu.');
    }

    if (!survey.title || survey.title.trim().length < 5) {
      errors.push('Titlul sondajului trebuie să conțină minim 5 caractere.');
    }

    if (!survey.description || survey.description.trim().length < 10) {
      errors.push('Descrierea sondajului trebuie să conțină minim 10 caractere.');
    }

    // Validare perioadă
    const start = new Date(survey.period?.startDate).getTime();
    const end = new Date(survey.period?.endDate).getTime();
    if (isNaN(start) || isNaN(end)) {
      errors.push('Perioada sondajului trebuie să conțină date calendaristice valide.');
    } else if (end <= start) {
      errors.push('Data de sfârșit a sondajului trebuie să fie ulterioară datei de început.');
    }

    // Validare întrebări
    if (!survey.questions || !Array.isArray(survey.questions) || survey.questions.length === 0) {
      errors.push('Sondajul trebuie să conțină cel puțin o întrebare.');
    } else {
      survey.questions.forEach((q, idx) => {
        const qIndex = idx + 1;
        if (!q.id || !q.id.trim()) {
          errors.push(`Întrebarea #${qIndex} nu are un identificator valid.`);
        }
        if (!q.text || q.text.trim().length < 3) {
          errors.push(`Textul întrebării #${qIndex} este prea scurt (minim 3 caractere).`);
        }
        if (!['single_choice', 'multiple_choice', 'free_text'].includes(q.type)) {
          errors.push(`Tipul întrebării #${qIndex} este invalid: "${q.type}".`);
        }
        if (q.type === 'single_choice' || q.type === 'multiple_choice') {
          if (!q.options || q.options.length < 2) {
            errors.push(`Întrebarea #${qIndex} (${q.type}) necesită cel puțin 2 variante de răspuns.`);
          }
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Înregistrează sau actualizează un sondaj în stocarea locală.
   * Etapele 4B vor apela această metodă din interfața de administrare.
   */
  public upsertSurvey(survey: Survey): { success: boolean; errors?: string[] } {
    const validation = this.validateSurveyStructure(survey);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const surveys = this.getAllSurveys();
    const existingIndex = surveys.findIndex((s) => s.id === survey.id);

    // ETAPA 6.5 (P1/P2): creare → `surveys.create`; modificare → `surveys.edit`; dacă starea
    // rezultată diferă de cea existentă (sau un sondaj nou nu e ciornă) → și permisiunea stării țintă.
    const previousStatus: SurveyStatus = existingIndex >= 0 ? surveys[existingIndex].status : 'draft';
    const required: Permission[] = [existingIndex >= 0 ? 'surveys.edit' : 'surveys.create'];
    if (survey.status && survey.status !== previousStatus) required.push(surveyStatusPermission(survey.status));
    if (!permissionService.currentUserCanAll(required)) {
      return { success: false, errors: ['Nu aveți permisiunea necesară pentru această operație.'] };
    }

    const now = new Date().toISOString();
    const surveyToSave: Survey = {
      ...survey,
      audit: {
        createdAt: existingIndex >= 0 ? surveys[existingIndex].audit?.createdAt || now : now,
        updatedAt: now,
        createdBy: survey.audit?.createdBy || 'admin',
      },
    };

    if (existingIndex >= 0) {
      surveys[existingIndex] = surveyToSave;
    } else {
      surveys.unshift(surveyToSave);
    }

    const saved = this.saveSurveys(surveys);
    return { success: saved, errors: saved ? undefined : ['Eroare la scrierea în stocarea locală.'] };
  }

  /**
   * Actualizează statusul unui sondaj ('draft' | 'active' | 'closed') cu validare prealabilă.
   * Dacă noul status este 'active', verifică dacă sondajul respectă regulile de validare structurală.
   */
  public updateSurveyStatus(id: string, newStatus: SurveyStatus): { success: boolean; errors?: string[] } {
    // ETAPA 6.5 (P1/P2): permisiunea se alege după acțiunea efectivă (activare / închidere / ciornă).
    if (!permissionService.currentUserCan(surveyStatusPermission(newStatus))) {
      return { success: false, errors: ['Nu aveți permisiunea necesară pentru această operație.'] };
    }
    const surveys = this.getAllSurveys();
    const surveyIndex = surveys.findIndex((s) => s.id === id);
    if (surveyIndex === -1) {
      return { success: false, errors: ['Sondajul specificat nu a fost găsit.'] };
    }

    const currentSurvey = surveys[surveyIndex];

    // Dacă se dorește activarea, validăm structura completă
    if (newStatus === 'active') {
      const validation = this.validateSurveyStructure(currentSurvey);
      if (!validation.isValid) {
        return { 
          success: false, 
          errors: ['Sondajul nu poate fi activat deoarece nu respectă toate cerințele de validare:', ...validation.errors] 
        };
      }
    }

    const now = new Date().toISOString();
    surveys[surveyIndex] = {
      ...currentSurvey,
      status: newStatus,
      audit: {
        ...currentSurvey.audit,
        updatedAt: now,
      },
    };

    const saved = this.saveSurveys(surveys);
    return { 
      success: saved, 
      errors: saved ? undefined : ['Eroare la salvarea noului status în stocarea locală.'] 
    };
  }

  /**
   * Generează un identificator unic pentru un sondaj nou.
   */
  public generateSurveyId(): string {
    const timestamp = Date.now().toString(36);
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `srv-${timestamp}-${randomSuffix}`;
  }

  /**
   * Șterge un sondaj după identificator.
   */
  public deleteSurvey(id: string): boolean {
    if (!permissionService.currentUserCanAny(SURVEY_DATA_MANAGEMENT)) return false; // ETAPA 6.5 (P1/P2)
    const surveys = this.getAllSurveys();
    const filtered = surveys.filter((s) => s.id !== id);
    if (filtered.length === surveys.length) return false;
    return this.saveSurveys(filtered);
  }

  /**
   * Resetează stocarea locală a sondajelor la starea inițială demonstrativă.
   * ETAPA 6.5: returnează `false` (fără modificare) dacă utilizatorul nu are permisiunea.
   */
  public resetToDemo(): boolean {
    if (!permissionService.currentUserCanAny(SURVEY_DATA_MANAGEMENT)) return false; // ETAPA 6.5 (P1/P2)
    if (typeof window === 'undefined') return false;
    try {
      localStorage.setItem(STORAGE_SURVEYS_KEY, JSON.stringify(DEMO_SURVEYS));
      return true;
    } catch (e) {
      console.warn('Nu s-a putut reseta stocarea locală pentru sondaje:', e);
      return false;
    }
  }

  // =========================================================================
  // METODE SPECIFICE ETAPEI 4C (PARTICIPAREA CETĂȚEANULUI & FLUXUL DE VOT)
  // =========================================================================

  /**
   * Returnează doar sondajele active care sunt deschise participării
   * (status === 'active' și data curentă se încadrează în perioada de valabilitate).
   */
  public getEligiblePublicSurveys(referenceDate: Date = new Date()): Survey[] {
    const all = this.getAllSurveys();
    return all.filter((s) => this.isSurveyOpen(s, referenceDate));
  }

  /**
   * Verifică dacă utilizatorul a participat deja la un anumit sondaj în instanța locală (Etapa 4E).
   * LIMITARE ASUMATĂ:
   * Acest marker este stocat exclusiv în localStorage pe dispozitivul/browserul curent.
   * Nu reprezintă o protecție antifraudă robustă și nu poate garanta prevenirea votului de pe alt browser.
   */
  public hasUserParticipatedLocally(surveyId: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem(STORAGE_PARTICIPATIONS_KEY);
      if (!stored) return false;
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return false;
      return parsed.some((id) => typeof id === 'string' && id === surveyId);
    } catch {
      return false;
    }
  }

  /**
   * Marchează local participarea utilizatorului la sondaj (Etapa 4E).
   * Include sanitizare robustă pentru recuperare automată în caz de corupere a datelor locale.
   */
  private markLocalParticipation(surveyId: string): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_PARTICIPATIONS_KEY);
      let ids: string[] = [];
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            ids = parsed.filter((id) => typeof id === 'string');
          }
        } catch {
          ids = [];
        }
      }
      if (!ids.includes(surveyId)) {
        ids.push(surveyId);
        localStorage.setItem(STORAGE_PARTICIPATIONS_KEY, JSON.stringify(ids));
      }
    } catch (e) {
      console.warn('Eroare la salvarea markerului local de participare:', e);
    }
  }

  /**
   * Validează răspunsurile introduse de cetățean înainte de trimitere:
   * - Verifică existența răspunsului pentru fiecare întrebare marcată isRequired;
   * - Pentru single_choice: verifică dacă ID-ul selectat există în opțiunile întrebării;
   * - Pentru multiple_choice: verifică dacă toate ID-urile selectate există în opțiunile întrebării;
   * - Pentru free_text obligatoriu: verifică să nu fie text gol sau doar spații.
   */
  public validateSubmissionAnswers(
    survey: Survey, 
    answers: Record<string, any>
  ): SurveySubmissionValidationResult {
    const errors: Record<string, string> = {};

    for (const question of survey.questions) {
      const val = answers[question.id];

      // Verificare obligativitate
      if (question.isRequired) {
        if (question.type === 'single_choice') {
          if (!val || typeof val !== 'string' || !val.trim()) {
            errors[question.id] = 'Vă rugăm să selectați o opțiune (răspuns obligatoriu).';
            continue;
          }
        } else if (question.type === 'multiple_choice') {
          if (!val || !Array.isArray(val) || val.length === 0) {
            errors[question.id] = 'Vă rugăm să selectați cel puțin o opțiune (răspuns obligatoriu).';
            continue;
          }
        } else if (question.type === 'free_text') {
          if (!val || typeof val !== 'string' || !val.trim()) {
            errors[question.id] = 'Vă rugăm să introduceți un răspuns (câmp obligatoriu).';
            continue;
          }
        }
      }

      // Verificare validitate variante dacă s-a răspuns
      if (val) {
        if (question.type === 'single_choice' && typeof val === 'string') {
          const exists = question.options?.some((opt) => opt.id === val);
          if (!exists) {
            errors[question.id] = 'Opțiunea selectată este invalidă.';
          }
        } else if (question.type === 'multiple_choice' && Array.isArray(val)) {
          const validOptIds = new Set(question.options?.map((opt) => opt.id) || []);
          const invalidFound = val.some((chosenId) => !validOptIds.has(chosenId));
          if (invalidFound) {
            errors[question.id] = 'Una sau mai multe opțiuni selectate sunt invalide.';
          }
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Înregistrează un vot / răspuns al cetățeanului la un sondaj (Etapa 4C).
   * - Verifică din nou eligibilitatea sondajului (status 'active' și în desfășurare);
   * - Verifică dacă utilizatorul a votat deja pe această instanță locală;
   * - Validează răspunsurile;
   * - Salvează payload-ul votului în storage;
   * - Marchează participarea locală.
   */
  public submitVote(
    surveyId: string, 
    answersMap: Record<string, any>
  ): { success: boolean; submissionId?: string; error?: string; validationErrors?: Record<string, string> } {
    // 1. Verificare existență sondaj
    const survey = this.getSurveyById(surveyId);
    if (!survey) {
      return { success: false, error: 'Sondajul solicitat nu a fost găsit.' };
    }

    // 2. Verificare eligibilitate temporală și status
    if (!this.isSurveyOpen(survey)) {
      if (survey.status !== 'active') {
        return { success: false, error: 'Acest sondaj nu mai este activ și nu mai acceptă răspunsuri.' };
      }
      const temporal = this.getTemporalState(survey);
      if (temporal === 'upcoming') {
        return { success: false, error: 'Perioada de consultare pentru acest sondaj nu a început încă.' };
      }
      if (temporal === 'expired') {
        return { success: false, error: 'Perioada de consultare pentru acest sondaj s-a încheiat.' };
      }
      return { success: false, error: 'Sondajul nu este deschis pentru colectarea de voturi.' };
    }

    // 3. Verificare marker local participare
    if (this.hasUserParticipatedLocally(surveyId)) {
      return { 
        success: false, 
        error: 'Ați participat deja la acest sondaj de pe acest dispozitiv/browser.' 
      };
    }

    // 4. Validare răspunsuri
    const validation = this.validateSubmissionAnswers(survey, answersMap);
    if (!validation.isValid) {
      return { 
        success: false, 
        validationErrors: validation.errors, 
        error: 'Vă rugăm să corectați răspunsurile marcate înainte de a trimite.' 
      };
    }

    // 5. Construire payload vot
    const timestamp = Date.now().toString(36);
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const submissionId = `sub-${timestamp}-${randomSuffix}`;

    const formattedAnswers: SurveyQuestionAnswer[] = survey.questions
      .filter((q) => answersMap[q.id] !== undefined && answersMap[q.id] !== '')
      .map((q) => ({
        questionId: q.id,
        type: q.type,
        value: answersMap[q.id],
      }));

    const submission: SurveySubmission = {
      id: submissionId,
      surveyId: survey.id,
      submittedAt: new Date().toISOString(),
      answers: formattedAnswers,
    };

    // 6. Salvare în localStorage submissions
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_SUBMISSIONS_KEY);
        const submissions: SurveySubmission[] = stored ? JSON.parse(stored) : [];
        submissions.push(submission);
        localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify(submissions));

        // 7. Marcare participare locală
        this.markLocalParticipation(surveyId);

        return { success: true, submissionId };
      } catch (e) {
        console.error('Eroare la salvarea trimiterii în stocarea locală:', e);
        return { success: false, error: 'Eroare la salvarea votului în stocarea locală.' };
      }
    }

    return { success: true, submissionId };
  }

  // =========================================================================
  // METODE SPECIFICE ETAPEI 4D (CALCUL REZULTATE ȘI STATISTICI)
  // =========================================================================

  /**
   * Returnează toate submisiile înregistrate în stocarea locală.
   */
  public getAllSubmissions(): SurveySubmission[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_SUBMISSIONS_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Eroare la citirea submisiilor din stocarea locală:', e);
      return [];
    }
  }

  /**
   * Returnează exclusiv submisiile aferente unui anumit sondaj (filtrare după surveyId).
   */
  public getSubmissionsForSurvey(surveyId: string): SurveySubmission[] {
    const all = this.getAllSubmissions();
    return all.filter((s) => s.surveyId === surveyId);
  }

  /**
   * Calculează statisticile agregate pentru un sondaj din stocarea locală (Etapa 4D).
   * 
   * Reguli de calcul matematice și de integritate:
   * 1. Submisiile sunt filtrate strict după surveyId. Submisiile străine sunt ignorate.
   * 2. Dacă nu există submisii (totalSubmissions === 0):
   *    - Toate numărătorile sunt 0, iar procentele sunt 0 (fără NaN, fără Infinity, fără diviziune cu zero).
   * 3. single_choice:
   *    - totalAnswersCount = număr de respondenți care au selectat o opțiune validă la această întrebare.
   *    - votesCount = numărul de selecții per variantă.
   *    - percentage = totalAnswersCount > 0 ? Math.round((votesCount / totalAnswersCount) * 1000) / 10 : 0
   * 4. multiple_choice:
   *    - totalAnswersCount = număr de respondenți care au selectat cel puțin o opțiune la această întrebare.
   *    - votesCount = numărul total de selectări ale variantei respective.
   *    - percentage = totalAnswersCount > 0 ? Math.round((votesCount / totalAnswersCount) * 1000) / 10 : 0
   *    - Documentare regulă multiple_choice: procentul reprezintă proporția de respondenți (dintre cei care au răspuns la întrebare)
   *      care au bifat acea variantă specifică (ex: 80% din respondenți vor bănci, 60% vor iluminat; suma poate depăși 100%).
   * 5. free_text:
   *    - Nu se calculează procente sau bare procentuale (nu are sens matematic).
   *    - Se calculează strict freeTextEntriesCount (câte răspunsuri text valide/nevide au fost trimise).
   *    - Nu se expun răspunsurile brute public pentru a respecta confidențialitatea și a evita scurgerea accidentală de date personale.
   */
  public calculateSurveyStatistics(surveyId: string): SurveyStatisticsReport | null {
    const survey = this.getSurveyById(surveyId);
    if (!survey) return null;

    const submissions = this.getSubmissionsForSurvey(surveyId);
    const totalSubmissions = submissions.length;

    const questionsResults: SurveyQuestionResult[] = survey.questions
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((q) => {
        // Colectăm toate răspunsurile date pentru această întrebare specifică
        const answersForQuestion: SurveyQuestionAnswer[] = [];
        for (const sub of submissions) {
          const ans = sub.answers?.find((a) => a.questionId === q.id);
          if (ans && ans.value !== undefined && ans.value !== null && ans.value !== '') {
            answersForQuestion.push(ans);
          }
        }

        const totalAnswersCount = answersForQuestion.length;

        // Cazul 1 & 2: single_choice și multiple_choice
        if (q.type === 'single_choice' || q.type === 'multiple_choice') {
          const optionsResults: SurveyOptionResult[] = (q.options || [])
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((opt) => {
              let votesCount = 0;

              for (const ans of answersForQuestion) {
                if (q.type === 'single_choice') {
                  if (ans.value === opt.id) {
                    votesCount += 1;
                  }
                } else if (q.type === 'multiple_choice') {
                  if (Array.isArray(ans.value) && ans.value.includes(opt.id)) {
                    votesCount += 1;
                  }
                }
              }

              // Evitare diviziune cu zero, formatare la 1 zecimală
              const percentage = totalAnswersCount > 0 
                ? Math.round((votesCount / totalAnswersCount) * 1000) / 10 
                : 0;

              return {
                optionId: opt.id,
                text: opt.text,
                order: opt.order,
                votesCount,
                percentage,
              };
            });

          return {
            questionId: q.id,
            questionText: q.text,
            questionType: q.type,
            order: q.order,
            totalAnswersCount,
            optionsResults,
          };
        }

        // Cazul 3: free_text
        return {
          questionId: q.id,
          questionText: q.text,
          questionType: q.type,
          order: q.order,
          totalAnswersCount,
          freeTextEntriesCount: totalAnswersCount,
        };
      });

    return {
      surveyId: survey.id,
      surveyTitle: survey.title,
      totalSubmissions,
      questionsResults,
      calculatedAt: new Date().toISOString(),
    };
  }
}

export const surveyService = SurveyService.getInstance();
