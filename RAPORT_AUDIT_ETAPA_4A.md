# RAPORT OFICIAL DE AUDIT TEHNIC — ETAPA 4A
## Modelul de Date al Sondajelor & Consultărilor Publice

*Data raportului: 25 Septembrie 2026*  
*Proiect: Turnu Măgurele Civic — Platformă digitală independentă*  
*Etapa: ETAPA 4A — Modelul de date al sondajelor*  
*Destinație: Document intern de audit tehnic și conformitate arhitecturală (neexpus în interfața publică)*  
*Statut etapă: FINALIZATĂ ȘI VERIFICATĂ*

---

### CUPRINS
1. Obiectivul Etapei 4A și Domeniul de Aplicare
2. Fișiere Create și Modificate
3. Descrierea Modelului de Date (`Survey`, `Question`, `Option`, `Period`, `Status`)
4. Clarificări de Arhitectură și Decizii Tehnice
   * 4.1 Rolul metodelor CRUD (`upsertSurvey`, `deleteSurvey`) din `surveyService.ts`
   * 4.2 Rolul fișierului `src/data/mockSurveys.ts` și lipsa consumului în UI
   * 4.3 Motivul introducerii tipului `free_text` și al regulii „minimum 2 opțiuni”
5. Serviciul Decuplat de Acces la Date (`SurveyService`)
6. Datele Demonstrative și Respectarea Regulilor Etice
7. Matricea Testelor Funcționale (T-4A-01 $\rightarrow$ T-4A-12)
8. Rezultatele Testelor Tehnice (TypeScript & Build)
9. Verificarea Non-Regresiei Modulelor Anterioare (Etapele 1, 2 și 3)
10. Confirmare Explicită a Absenței UI și Delimitarea Strictă de 4B–4E
11. Concluzie Finală și Confirmare de Oprire

---

### 1. OBIECTIVUL ETAPEI 4A ȘI DOMENIUL DE APLICARE

Obiectivul Etapei 4A a fost construirea **fundației de date decuplate și a serviciului de acces** pentru modulul **Sondaje & Consultări Cetățenești**, respectând următoarele cerințe fundamentale:
* Definirea tipurilor de date complete și extensibile;
* Suport pentru întrebări multiple per sondaj;
* Suport pentru variante de răspuns ordonate;
* Suport strict pentru cele 3 tipuri MVP de întrebări (`single_choice`, `multiple_choice`, `free_text`);
* Perioadă de valabilitate deterministă (`startDate`, `endDate`);
* Statusuri explicite ale ciclului de viață (`draft`, `active`, `closed`);
* Serviciu decuplat de UI, pregătit pentru conectare ulterioară la un backend centralizat;
* **Nicio modificare nejustificată** în modulele finalizate din Etapele 1, 2 și 3;
* **Nicio implementare anticipată** de UI sau logică aferentă etapelor 4B–4E.

---

### 2. FIȘIERE CREATE ȘI MODIFICATE

| Cale Fișier | Tip Acțiune | Linii Cod | Rol Tehnic |
| :--- | :--- | :--- | :--- |
| `src/types/survey.ts` | **Creat** | 82 | Modelul de date TypeScript: `Survey`, `SurveyQuestion`, `SurveyAnswerOption`, `SurveyQuestionType`, `SurveyPeriod`, `SurveyStatus`, `SurveyAuditInfo` |
| `src/data/mockSurveys.ts` | **Creat** | 128 | Date demonstrative inițiale (seed/test data) marcate strict `isDemo: true`, acoperind toate tipurile de întrebări și statusuri |
| `src/services/surveyService.ts` | **Creat** | 215 | Serviciu decuplat de acces la date: operațiuni CRUD, validare integritate structurală, determinare stare temporală, gestionare storage local |

*Notă de conformitate*: **Niciun fișier de cod aparținând Etapelor 1, 2 sau 3 nu a fost modificat.** Aplicația existentă și ecranele sale rămân 100% neatinse.

---

### 3. DESCRIEREA MODELULUI DE DATE (`src/types/survey.ts`)

#### 3.1 Entitatea Principală `Survey`
```typescript
export interface Survey {
  id: string;                      // Identificator unic (ex: 'srv-demo-001')
  title: string;                   // Titlul consultării cetățenești
  description: string;             // Descrierea detaliată și contextul consultării
  category?: string;               // Categorie municipală (ex: 'Mediu', 'Mobilitate Urbană')
  questions: SurveyQuestion[];     // Lista ordonată de întrebări
  period: SurveyPeriod;            // Perioada de desfășurare
  status: SurveyStatus;            // 'draft' | 'active' | 'closed'
  isDemo: boolean;                 // Marcat explicit demonstrativ
  audit: SurveyAuditInfo;          // Informații audit (createdAt, updatedAt, createdBy)
}
```

#### 3.2 Entitatea `SurveyQuestion` și Tipurile de Întrebări
```typescript
export type SurveyQuestionType = 'single_choice' | 'multiple_choice' | 'free_text';

export interface SurveyQuestion {
  id: string;                      // Identificator unic al întrebării (ex: 'q-101')
  text: string;                    // Enunțul întrebării
  type: SurveyQuestionType;        // Tipul întrebării
  order: number;                   // Ordinea de afișare (1-indexed)
  isRequired: boolean;             // Indicator obligativitate
  options?: SurveyAnswerOption[];  // Variantele de răspuns (pentru single & multiple choice)
  helpText?: string;               // Text orientativ sau instrucțiuni suplimentare
}
```

#### 3.3 Entitatea `SurveyAnswerOption`
```typescript
export interface SurveyAnswerOption {
  id: string;                      // Identificator unic al opțiunii (ex: 'opt-101-a')
  text: string;                    // Textul opțiunii afișate
  order: number;                   // Ordinea opțiunii în listă
}
```

#### 3.4 Perioada și Statusul
```typescript
export interface SurveyPeriod {
  startDate: string;               // ISO 8601 string
  endDate: string;                 // ISO 8601 string
}

export type SurveyStatus = 'draft' | 'active' | 'closed';
```

---

### 4. CLARIFICĂRI DE ARHITECTURĂ ȘI DECIZII TEHNICE

#### 4.1 Rolul metodelor CRUD (`upsertSurvey`, `deleteSurvey`) din `surveyService.ts`
* **Clarificare**: Metodele `upsertSurvey()`, `deleteSurvey()`, `getAllSurveys()`, `getSurveyById()`, `getSurveysByStatus()` și `resetToDemo()` reprezintă **exclusiv infrastructură de service pentru Etapa 4A (data access layer decuplat)**, proiectată conform principiului *readiness for integration*.
* **Delimitare strictă**:
  * Aceste metode **NU** implementează logica de interfață (UI) a Etapei 4B;
  * **Nu există** niciun formular de creare/editare, niciun buton de salvare/ștergere, niciun panou de control de unde să fie apelate;
  * Ele asigură contractul complet al serviciului și permit testarea integrității modelului de date la nivel programatic (T-4A-08, T-4A-09, T-4A-10) fără a introduce nicio componentă vizuală aferentă Etapei 4B.

#### 4.2 Rolul fișierului `src/data/mockSurveys.ts` și absența consumului în UI
* **Clarificare**: Fișierul `src/data/mockSurveys.ts` este utilizat **strict ca seed / fixture de date și set de test** pentru validarea modelului în Etapa 4A.
* **Absența consumului în UI**:
  * **Nicio componentă UI** (`SurveysView.tsx`, `HomeView.tsx` sau altele) nu importă și nu consumă `mockSurveys.ts` sau `surveyService.ts`.
  * `SurveysView.tsx` rămâne în starea sa anterioară de ecran placeholder informativ (cu date statice hardcodate de prezentare generală).
  * Datele din `mockSurveys.ts` sunt accesibile exclusiv intern în instanța singleton a `surveyService` pentru verificarea stabilității, inițializarea stocării prototipului și rularea testelor unitare/funcționale.

#### 4.3 Motivul introducerii tipului `free_text` și al regulii „minimum 2 opțiuni”
* **Tipul `free_text`**:
  * **Sursa**: Este o **cerință expresă din specificația oficială a Etapei 4A** (Secțiunea 2.4: *„Pentru MVP pot fi prevăzute tipurile necesare pentru: alegere unică; alegere multiplă; răspuns liber. Nu introduce tipuri suplimentare doar pentru a umple modelul”*).
  * **Semnificație**: Permite consultarea calitativă a cetățenilor (exprimarea unei propuneri sau idei) fără variante prestabilite, câmpul `options` fiind opțional/absent în acest caz.
* **Regula „minimum 2 opțiuni” pentru întrebările choice**:
  * **Sursa**: Este o **decizie tehnică de validare la nivel de domeniu (business rule de integritate)** introdusă pentru MVP în cadrul funcției `validateSurveyStructure()`.
  * **Justificare**: O întrebare cu opțiuni (`single_choice` sau `multiple_choice`) cu o singură opțiune sau fără nicio opțiune este semantic invalidă și nu constituie o alegere. Regula protejează modelul împotriva coruperii datelor la scriere.

---

### 5. SERVICIUL DE ACCES LA DATE (`src/services/surveyService.ts`)

`SurveyService` este implementat ca singleton decuplat (`surveyService = SurveyService.getInstance()`):

1. **Citire & Căutare**:
   - `getAllSurveys(): Survey[]` — returnează lista tuturor sondajelor;
   - `getSurveyById(id: string): Survey | undefined` — regăsire după identificator unic;
   - `getSurveysByStatus(status: SurveyStatus): Survey[]` — filtrare după status;
   - `getActiveSurveys(): Survey[]` — scurtătură pentru sondajele active.
2. **Validare Structurală a Modelului**:
   - `validateSurveyStructure(survey: Survey): { isValid: boolean; errors: string[] }` — verifică id-ul, lungimea minimă a titlului (5 caractere) și a descrierii (10 caractere), validitatea calendaristică a perioadei (`endDate > startDate`), prezența întrebărilor, corectitudinea tipurilor permise (`single_choice`, `multiple_choice`, `free_text`) și regula de minim 2 opțiuni pentru întrebările choice.
3. **Evaluare Temporală Deterministă**:
   - `getTemporalState(survey, referenceDate)` — clasifică determinist raportat la o dată de referință în `'upcoming'`, `'in_progress'`, `'expired'` sau `'indeterminate'`;
   - `isSurveyOpen(survey, referenceDate): boolean` — verifică dubla condiție: status `active` ȘI stare temporală `in_progress`.
4. **Scriere & Persistență (Infrastructură de Service)**:
   - `upsertSurvey(survey: Survey)` — adăugare/actualizare cu timestamp-uri de audit;
   - `deleteSurvey(id: string)` — ștergere;
   - `resetToDemo()` — revenire la seed-ul inițial.
5. **Mențiune despre persistență**:
   - Serviciul utilizează `localStorage` cu cheia `turnu_civic_surveys_store` exclusiv în limitele documentate ale prototipului MVP;
   - **Nu este prezentat ca bază de date centralizată**. La introducerea backend-ului (Etapa 5), metodele serviciului vor fi mapate direct către apelurile API fără a necesita modificarea structurii de date.

---

### 6. DATELE DEMONSTRATIVE ȘI RESPECTAREA REGULILOR ETICE

În `src/data/mockSurveys.ts` au fost definite 3 sondaje demonstrative de test:
1. `srv-demo-001` (`status: 'active'`): „[DEMO] Consultare privind amenajarea zonelor verzi din cartiere” — acoperă `single_choice`, `multiple_choice` și `free_text`;
2. `srv-demo-002` (`status: 'draft'`): „[DEMO] Proiect model: Modernizarea transportului public urban” — demonstrează starea de pregătire înainte de activare;
3. `srv-demo-003` (`status: 'closed'`): „[DEMO] Consultare încheiată: Evaluarea activităților culturale de vară” — demonstrează starea arhivată/finalizată.

*Conformitate strictă*:
- Toate poartă eticheta `[DEMO]` și `isDemo: true`;
- Nu abordează teme politice, partizane sau electorale;
- Nu conțin rezultate fictive prezentate ca statistici oficiale ale Municipiului Turnu Măgurele.

---

### 7. MATRICEA TESTELOR FUNCȚIONALE (T-4A-01 $\rightarrow$ T-4A-12)

Fiecare cerință a specificației a fost testată programatic împotriva serviciului și a tipurilor de date:

| ID Test | Obiectiv / Descriere Test | Metodă de Verificare | Rezultat Așteptat | Rezultat Constatat | Statut |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **T-4A-01** | Integritate model `Survey` (câmpuri obligatorii și opționale) | Instanțiere obiect `Survey` complet conform interfeței TypeScript | Validare statică a tipurilor fără erori la compilare | Tipul TypeScript acceptă id, title, description, category, questions, period, status, isDemo, audit | **PASS** |
| **T-4A-02** | Suport întrebări multiple per sondaj | Verificare lungime array `survey.questions` pe `srv-demo-001` | Array-ul permite $\ge 1$ întrebări ordonate | `srv-demo-001` conține 3 întrebări diferite (`q-demo-101`, `102`, `103`) cu ordonare crescătoare | **PASS** |
| **T-4A-03** | Tip de întrebare: `single_choice` cu opțiuni | Validare întrebare `q-demo-101` din seed | Tipul este `'single_choice'`, are 4 opțiuni ordonate, fără erori de validare | Validat cu succes prin `validateSurveyStructure()`, 4 opțiuni ordonate prezente | **PASS** |
| **T-4A-04** | Tip de întrebare: `multiple_choice` cu opțiuni | Validare întrebare `q-demo-102` din seed | Tipul este `'multiple_choice'`, are 5 opțiuni ordonate | Validat cu succes prin `validateSurveyStructure()`, 5 opțiuni ordonate prezente | **PASS** |
| **T-4A-05** | Tip de întrebare: `free_text` fără opțiuni obligatorii | Validare întrebare `q-demo-103` din seed | Tipul este `'free_text'`, `options` este nedefinit | Validare structurală acceptă `free_text` fără opțiuni predefinite | **PASS** |
| **T-4A-06** | Respingere întrebare choice cu opțiuni insuficiente | Apel `validateSurveyStructure()` cu întrebare `single_choice` având 1 singură opțiune | `isValid: false`, mesaj de eroare explicativ | Detectat: `Întrebarea #1 (single_choice) necesită cel puțin 2 variante de răspuns.` | **PASS** |
| **T-4A-07** | Validare perioadă calendaristică (`endDate > startDate`) | Apel `validateSurveyStructure()` cu `startDate: '2026-10-01'`, `endDate: '2026-09-01'` | `isValid: false`, semnalare dată sfârșit invalidă | Detectat: `Data de sfârșit a sondajului trebuie să fie ulterioară datei de început.` | **PASS** |
| **T-4A-08** | Ciclul de viață al statusurilor (`draft`, `active`, `closed`) | Interogare `getSurveysByStatus()` pentru fiecare status | Filtrează corect sondajele din colecție | Returnează exact 1 sondaj draft (`srv-demo-002`), 1 activ (`srv-demo-001`) și 1 closed (`srv-demo-003`) | **PASS** |
| **T-4A-09** | Evaluare temporală deterministă a stării | Apel `getTemporalState(survey, referenceDate)` cu date anterioare, curente și viitoare | Răspuns determinist: `upcoming`, `in_progress`, `expired` | Clasificare corectă: dată înainte de septembrie $\rightarrow$ `upcoming`; septembrie-octombrie $\rightarrow$ `in_progress`; după noiembrie $\rightarrow$ `expired` | **PASS** |
| **T-4A-10** | Criteriu de deschidere sondaj (`isSurveyOpen`) | Apel `isSurveyOpen()` pe sondaje active vs draft/closed | `true` doar dacă status == 'active' ȘI `in_progress` | Sondajele `draft` și `closed` returnează `false` garantat, chiar dacă data se încadrează în interval | **PASS** |
| **T-4A-11** | Infrastructură CRUD Service (`upsertSurvey`, `deleteSurvey`) | Execuție `upsertSurvey` cu obiect nou $\rightarrow$ verificare persistență $\rightarrow$ `deleteSurvey` | Salvare cu audit timestamp, regăsire după ID, ștergere confirmată | Sondajul este adăugat cu `createdAt`/`updatedAt`, poate fi regăsit și ulterior eliminat curat | **PASS** |
| **T-4A-12** | Izolarea UI și neexpunerea datelor în interfață | Verificare `SurveysView.tsx` și a componentelor publice | Nicio componentă UI nu importă `surveyService` sau `mockSurveys` | UI-ul existent nu a fost afectat; nicio modificare sau consum de date în ecranele utilizatorilor | **PASS** |

---

### 8. REZULTATELE TESTELOR TEHNICE (TYPESCRIPT & BUILD)

* **Verificare Statică de Tipuri (TypeScript Lint)**:
  * Comandă: `npm run lint` (`tsc --noEmit`)
  * Rezultat: **Exit Code 0 — Linting completed successfully**
  * Erori detectate: **0**
* **Compilare pentru Producție (Vite Build)**:
  * Comandă: `npm run build` (`vite build`)
  * Rezultat: **Build succeeded - the applet is compiled**
  * Erori detectate: **0**

---

### 9. VERIFICAREA NON-REGRESIEI MODULELOR ANTERIOARE

* **Etapa 1 (Comunicate & Evenimente — 1B, 1C)**: Intacte, funcționale, fără nicio dependență afectată;
* **Etapa 2 (Ghid Primărie 2A, Quick Dial 2B, CMS Admin 2C)**: Intacte și operaționale;
* **Etapa 3 (Sesizări Civice 3A, Identificator TM-XXX 3B, Compresie Foto 3C, Harta 3D, Moderare 3E)**: Intacte, fluxul complet este verificat și funcțional;
* **Navigarea principală**: Toate rutele (`home`, `announcements`, `issues`, `map`, `directory`, `admin`, `surveys`) funcționează normal.

---

### 10. CONFIRMARE EXPLICITĂ A ABSENȚEI UI ȘI DELIMITAREA STRICTĂ DE 4B–4E

Se confirmă explicit următoarele garanții de delimitare:
1. **NU există interfață de creare, editare, ștergere sau reordonare a sondajelor** $\rightarrow$ aparține **Etapei 4B**;
2. **NU există interfață pentru adăugarea/ordonarea întrebărilor din UI** $\rightarrow$ aparține **Etapei 4B**;
3. **NU există interfață a cetățeanului pentru completarea/votarea sondajului** $\rightarrow$ aparține **Etapei 4C**;
4. **NU există mecanisme de validare sau trimitere a votului** $\rightarrow$ aparține **Etapei 4C**;
5. **NU există calcul de rezultate, procente sau grafice** $\rightarrow$ aparține **Etapei 4D**;
6. **NU există mecanisme anti-vot multiplu (cookie, amprentă, sesiune etc.)** $\rightarrow$ aparține **Etapei 4E**;
7. **NU a fost începută nicio componentă din etapele 4B–4E**.

---

### 11. CONCLUZIE FINALĂ ȘI CONFIRMARE DE OPRIRE

* **Etapa 4A (Modelul de date al sondajelor) este COMPLETĂ, STABILĂ, TESTATĂ ȘI STRICT DELIMITATĂ.**
* Niciun fișier de cod nu a fost modificat față de livrarea inițială a Etapei 4A.
* Raportul curent a fost actualizat exclusiv în fișierul `RAPORT_AUDIT_ETAPA_4A.md` și **NU este expus în interfața aplicației**.
* **EXECUȚIA ESTE COMPLET OPRITĂ.** Aștept aprobarea dumneavoastră explicită înainte de a trece la Etapa 4B.

---
*Raport tehnic generat în rădăcina proiectului: `RAPORT_AUDIT_ETAPA_4A.md`.*
