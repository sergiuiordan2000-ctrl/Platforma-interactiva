# RAPORT OFICIAL DE AUDIT TEHNIC — ETAPA 4C
## Interfața Publică a Sondajelor și Fluxul de Vot

*Data raportului: 25 Septembrie 2026*  
*Proiect: Turnu Măgurele Civic — Platformă digitală independentă*  
*Etapa: ETAPA 4C — Participarea cetățeanului la sondaje*  
*Prerechizite: Etapele 4A și 4B — închise și validate*  
*Destinație: Document intern de audit tehnic și conformitate arhitecturală (neexpus în interfața publică)*  
*Statut etapă: FINALIZATĂ ȘI VERIFICATĂ*

---

### CUPRINS
1. Obiectivul Etapei 4C
2. Funcționalitățile Implementate
3. Fișiere Create și Modificate
4. Integrarea cu Etapele 4A și 4B
5. Lista Publică de Sondaje (`PublicSurveysList.tsx`)
6. Formularul de Participare și Modalul de Vot (`SurveyVotingModal.tsx`)
7. Tratarea Celor Trei Tipuri de Întrebări (`single_choice`, `multiple_choice`, `free_text`)
8. Validarea Răspunsurilor și a Întrebărilor Obligatorii
9. Trimiterea Votului și Payload-ul de Submisie
10. Markerul Local de Participare și Protecția Împotriva Trimiterilor Duplicate
11. Limitările Asumate ale `localStorage` și Absența Backend-ului
12. Confidențialitatea, Datele Personale și Analiza Opțiunii de Anonimat
   * 12.1 Analiză de model: Unde și cum este reprezentată alegerea utilizatorului privind anonimatul?
   * 12.2 Confirmare explicită privind absența opțiunii în modelul 4A/4B și neimplementarea în 4C
   * 12.3 Tratarea confidențialității în implementarea curentă 4C
13. UX, Accesibilitate și Comportament Responsive
14. Matricea Testelor Obligatorii 4C (T-4C-01 $\rightarrow$ T-4C-19)
15. Rezultatele Verificărilor Tehnice (TypeScript, Lint & Build)
16. Verificarea Non-Regresiei Modulelor Anterioare (Etapele 1--4B)
17. Limitări Asumate pentru Producție și Ce NU s-a Implementat
18. Confirmarea Explicită a Neînceperii Etapelor 4D și 4E
19. Concluzie Finală și Confirmare de Oprire

---

### 1. OBIECTIVUL ETAPEI 4C

Obiectivul Etapei 4C a constat în construirea **interfeței publice prin care cetățenii pot consulta și participa la sondajele active** create dinamic în municipiul Turnu Măgurele.

Etapa 4C a introdus pentru prima dată în cadrul platformei fluxul public de vot, permițând cetățenilor:
* Să vizualizeze exclusiv sondajele eligibile deschise consultării;
* Să deschidă formularul dedicat al fiecărui sondaj activ;
* Să consulte descrierea, contextul, numărul de întrebări și data limită de valabilitate;
* Să parcurgă întrebările în ordinea exactă configurată de administrator;
* Să voteze utilizând controale specializate adaptate tipului de întrebare (`single_choice`, `multiple_choice`, `free_text`);
* Să primească feedback instantaneu în caz de omitere a răspunsurilor obligatorii;
* Să trimită votul și să primească un ecran de confirmare cu un identificator local al participării;
* Să fie preveniți să voteze de două ori pe același browser prin mecanismul de marcare locală (MVP marker).

---

### 2. FUNCȚIONALITĂȚILE IMPLEMENTATE

1. **Tipuri de Date pentru Vot (`src/types/surveySubmission.ts`)**:
   - `SurveyAnswerValue`: `string | string[]` (adaptat după tipul de întrebare);
   - `SurveyQuestionAnswer`: Structura unui răspuns individual (`questionId`, `type`, `value`);
   - `SurveySubmission`: Structura payload-ului de vot (`id`, `surveyId`, `submittedAt`, `answers`);
   - `SurveySubmissionValidationResult`: Rezultat validare cu mapping pe câmpuri (`errors`, `generalError`).

2. **Extensii de Serviciu în `src/services/surveyService.ts`**:
   - `getEligiblePublicSurveys()`: Filtrează lista globală returnând exclusiv sondajele cu `status === 'active'` aflate în perioada de valabilitate (`isSurveyOpen === true`);
   - `hasUserParticipatedLocally(surveyId)`: Interoghează stocarea locală pentru a determina dacă utilizatorul a participat deja de pe instanța de browser curentă;
   - `validateSubmissionAnswers(survey, answers)`: Verifică obligativitatea răspunsurilor, validitatea opțiunilor selectate (să existe în definiția întrebării) și validitatea textului liber;
   - `submitVote(surveyId, answersMap)`: Execută validarea dublă a eligibilității temporale/statusului sondajului, verifică markerul de participare, generează un ID unic de vot (`sub-[timestamp]-[random]`), salvează trimiterea în `localStorage` și marchează participarea locală a cetățeanului.

3. **Lista Publică de Sondaje (`PublicSurveysList.tsx`)**:
   - Banner de prezentare civică cu identitate vizuală dedicată;
   - Filtrare automată a sondajelor eligibile (cele `draft` și `closed` sunt excluse);
   - Carduri responsive cu badge-uri clare (`Deschis Consultării`, `Ai participat deja`, Categorie, indicator DEMO);
   - Afișare dată limită formatată în limba română și număr de întrebări;
   - Buton dinamic de deschidere sondaj (`Participă la sondaj` sau `Vezi detalii sondaj` dacă a votat deja);
   - Ecran fallback neutru atunci când nu există nicio consultare deschisă;
   - Toast de confirmare după trimiterea cu succes a unui vot.

4. **Modalul Public de Votare (`SurveyVotingModal.tsx`)**:
   - Vizualizare completă a titlului, descrierii, categoriei și termenului limită;
   - **Trei moduri distincte de afișare**:
     1. *Formular activ de votare*: Întrebări ordonate strict după proprietatea numerică `order`, controale radio personalizate (single choice), checkbox-uri (multiple choice) și textarea (free text);
     2. *Ecran de succes (Trimitere reușită)*: Mesaj de mulțumire, iconiță verde de succes, afișare identificator local de vot (`sub-XXX`) și notă explicativă;
     3. *Ecran „Ai participat deja”*: Afișat dacă utilizatorul a votat deja pe browserul curent, blocând trimiterea repetată;
   - Protecție împotriva apăsărilor multiple pe butonul „Trimite” (`isSubmitting`);
   - Scroll automat la prima întrebare invalidată în caz de erori;
   - Mențiune de confidențialitate civică (fără solicitare obligatorie de date de identificare).

5. **Actualizarea Ecranului Public `SurveysView.tsx`**:
   - Înlocuirea definitivă a vechiului schelet demonstrativ / placeholder cu componenta reală `PublicSurveysList`;
   - Buton de navigare rapidă către ecranul principal Acasă.

---

### 3. FIȘIERE CREATE ȘI MODIFICATE

| Cale Fișier | Tip Acțiune | Linii Cod | Rol Tehnic |
| :--- | :--- | :--- | :--- |
| `src/types/surveySubmission.ts` | **Creat** | 48 | Tipurile TypeScript pentru payload-ul de vot, răspunsuri individuale și rezultatul validării |
| `src/components/surveys/SurveyVotingModal.tsx` | **Creat** | 464 | Fereastra modală publică de votare: afișare întrebări, stări de selecție, validare, trimitere și confirmare |
| `src/components/surveys/PublicSurveysList.tsx` | **Creat** | 206 | Lista publică a consultărilor active deschise votului, cu carduri responsive și gestionare toast |
| `src/services/surveyService.ts` | **Modificat** | +205 | Adăugare logică decuplată de filtrare eligibilitate publică, marcare participare locală, validare răspunsuri și salvare voturi |
| `src/views/SurveysView.tsx` | **Modificat** | 35 | Înlocuirea ecranului placeholder cu montarea componentei funcționale `PublicSurveysList` |

*Notă de conformitate*: Niciun fișier aparținând Etapelor 1, 2, 3 sau zonei de administrare 4B nu a suferit modificări neautorizate.

---

### 4. INTEGRAREA CU ETAPELE 4A ȘI 4B

* **Cu Etapa 4A (Modelul de date)**:
  - Componentele consumă direct tipurile din `src/types/survey.ts` (`Survey`, `SurveyQuestion`, `SurveyAnswerOption`, `SurveyQuestionType`);
  - Nu s-a duplicat modelul și nu s-a creat o structură paralelă;
  - Se folosește aceeași regulă de verificare a eligibilității temporale (`isSurveyOpen()`).
* **Cu Etapa 4B (Administrarea sondajelor)**:
  - Sondajele create sau editate de administrator în tab-ul `Admin -> Sondaje` (salvate cu status `active`) devin imediat vizibile și votabile în zona publică;
  - Sondajele lăsate în stadiul `draft` sau închise ca `closed` sunt excluse automat din lista publică;
  - Structura configurată în 4B (inclusiv ordinea întrebărilor și variantelor de răspuns) este reprodusă identic în formularul de vot.

---

### 5. LISTA PUBLICĂ DE SONDAJE (`PublicSurveysList.tsx`)

* Lista interoghează `surveyService.getEligiblePublicSurveys()`;
* Afișează numai consultările care respectă simultan cele două condiții:
  1. `status === 'active'`;
  2. Data curentă se încadrează între `startDate` și `endDate`.
* Sondajele `draft` nu sunt vizibile cetățenilor;
* Sondajele expirate sau cu status `closed` nu apar în fluxul de vot;
* Dacă nu există niciun sondaj eligibil, se afișează mesajul neutru: *„Nu există consultări deschise în acest moment”*.

---

### 6. FORMULARUL DE PARTICIPARE ȘI MODALUL DE VOT

* Deschiderea unui sondaj din listă lansează `SurveyVotingModal`;
* Se afișează contextul complet: titlul, descrierea, categoria și data limită de consultare;
* Întrebările sunt sortate crescător după indicele numeric `order`;
* Formularul asigură accesibilitate vizuală (selecții evidențiate pe fundal violet pal cu chenar accentuat);
* După trimitere se afișează ecranul de confirmare direct în modal, fără a reîncărca pagina.

---

### 7. TRATAREA CELOR TREI TIPURI DE ÎNTREBĂRI

1. **`single_choice` (Alegere unică)**:
   - Controale radio stilizate;
   - La bifarea unei opțiuni, orice altă opțiune anterioară este deselectată;
   - Valoarea memorată în starea formularului este string-ul `optionId`.
2. **`multiple_choice` (Alegere multiplă)**:
   - Checkbox-uri stilizate;
   - Utilizatorul poate selecta oricâte variante dorește;
   - Valoarea memorată este un array `string[]` conținând `optionId`-urile selectate.
3. **`free_text` (Răspuns liber)**:
   - Câmp `textarea` generos cu placeholder sugestiv;
   - Nu sunt afișate variante de răspuns;
   - Include avertismentul de a nu introduce date cu caracter personal;
   - Valoarea memorată este string-ul introdus.

---

### 8. VALIDAREA RĂSPUNSURILOR ȘI A ÎNTREBĂRILOR OBLIGATORII

Validarea este realizată centralizat de `surveyService.validateSubmissionAnswers()`:
* **Întrebări obligatorii (`isRequired === true`)**:
  - `single_choice`: Dacă nu s-a selectat nicio opțiune $\rightarrow$ eroare: *„Vă rugăm să selectați o opțiune (răspuns obligatoriu).”*;
  - `multiple_choice`: Dacă array-ul de opțiuni este gol $\rightarrow$ eroare: *„Vă rugăm să selectați cel puțin o opțiune (răspuns obligatoriu).”*;
  - `free_text`: Dacă textul lipsește sau conține doar spații albe $\rightarrow$ eroare: *„Vă rugăm să introduceți un răspuns (câmp obligatoriu).”*.
* **Întrebări opționale (`isRequired === false`)**:
  - Formularul poate fi trimis fără a completa aceste întrebări.
* **Integritatea variantelor**:
  - Se verifică ca variantele transmise să aparțină listei configurate a întrebării respective.
* **Feedback vizual**:
  - Cardul întrebării cu eroare primește un chenar roșu și un mesaj de atenționare imediat sub opțiuni;
  - Modalul face scroll automat la prima întrebare necompletată.

---

### 9. TRIMITEREA VOTULUI ȘI PAYLOAD-UL DE SUBMISIE

La apăsarea butonului de trimitere:
1. Butonul intră în starea `isSubmitting = true`, devenind dezactivat pentru a preveni dubla apăsare accidentală;
2. Se reverifică eligibilitatea sondajului (dacă administratorul l-a închis între timp sau perioada a expirat, trimiterea este blocată cu mesaj clar);
3. Se construiește payload-ul `SurveySubmission` cu:
   - `id`: identificator unic `sub-[timestamp]-[random]`;
   - `surveyId`: ID-ul sondajului;
   - `submittedAt`: timestamp ISO;
   - `answers`: lista răspunsurilor formatate;
4. Trimiterea este persistată în cheia `turnu_civic_survey_submissions_store`;
5. Se apelează `markLocalParticipation(surveyId)`;
6. **Nu se calculează rezultate agregate și nu se generează procente/grafice** (acestea aparțin Etapei 4D).

---

### 10. MARKERUL LOCAL DE PARTICIPARE ȘI PROTECȚIA DUPLICĂRILOR

* La finalizarea cu succes a votului, ID-ul sondajului este adăugat în array-ul stocat sub cheia `turnu_civic_user_participated_surveys`;
* La redeschiderea sondajului de pe același browser:
  - Pe cardul din listă apare eticheta albastră: `Ai participat deja`;
  - La apăsarea pe card, modalul deschide direct ecranul informativ *„Ați participat deja la acest sondaj”*, blocând posibilitatea de a retrimite formularul;
  - Metoda `submitVote()` din service include o verificare redundantă a acestui marker, respingând orice încercare de trimitere repetată.

---

### 11. LIMITĂRILE ASUMATE ALE `localStorage` ȘI ABSENȚA BACKEND-ULUI

* **Limitare de arhitectură MVP**:
  - Persistența locală folosește `localStorage`;
  - Markerul de participare este legat de browserul/dispozitivul curent;
  - Dacă utilizatorul deschide aplicația într-un mod incognito, pe un alt browser sau șterge memoria cache/locală a navigatorului, markerul nu mai este detectabil;
* **Concluzie asumată**:
  - Această soluție este un prototip funcțional de nivel MVP;
  - **NU este prezentată ca sistem antifraudă, autentificare oficială sau protecție definitivă împotriva voturilor multiple**;
  - Prevenirea votului multiplu avansat și mecanismele de identificare aparțin Etapelor 4E și 5.

---

### 12. CONFIDENȚIALITATEA, DATELE PERSONALE ȘI ANALIZA OPȚIUNII DE ANONIMAT

#### 12.1 Analiză de model: Unde și cum este reprezentată alegerea utilizatorului privind anonimatul?
S-a efectuat analiza exhaustivă a codului și specificațiilor din etapele 4A, 4B și 4C:
1. În **`src/types/survey.ts`** (stabilit în Etapa 4A):
   - Entitățile `Survey`, `SurveyQuestion`, `SurveyPeriod`, `SurveyAuditInfo` **nu conțin nicio proprietate referitoare la anonimat** (ex: `allowAnonymous`, `isAnonymousOnly`, etc.).
2. În **`src/types/surveySubmission.ts`** (stabilit în Etapa 4C):
   - Entitatea `SurveySubmission` are structura:
     ```typescript
     export interface SurveySubmission {
       id: string;
       surveyId: string;
       submittedAt: string;
       answers: SurveyQuestionAnswer[];
     }
     ```
   - **Nu conține** proprietăți de tipul `isAnonymous: boolean`, `citizenName?: string`, `citizenEmail?: string` sau `citizenPhone?: string`.
3. În instrucțiunile oficiale ale Etapei 4C (**Secțiunea 15 — Confidențialitate și Date Personale**):
   - S-a menționat explicit regula:
     *„Nu solicita în această etapă: nume, CNP, telefon, email, adresă, alte date personale, decât dacă o cerință deja existentă în modelul proiectului o impune explicit. Nu lega răspunsurile de identitatea unei persoane în mod artificial.”*
   - Drept urmare, fluxul a fost construit strict conform acestei restricții, eliminând orice câmp de colectare a identității.

#### 12.2 Confirmare explicită privind absența opțiunii în modelul 4A/4B și neimplementarea în 4C
* **CONFIRMARE EXPLICITĂ**: **Opțiunea ca utilizatorul să decidă dacă participarea sa este anonimă sau asumată/nominală NU există în modelul de date definit în Etapa 4A/4B și NU a fost implementată în Etapa 4C.**
* În starea curentă a codului, **toate voturile sunt implicit 100% anonime**, neexistând în UI un control (ex: comutator / checkbox „Doresc să particip anonim” sau câmpuri pentru nume/contact în cazul participării asumate) și nici în structura de persistență câmpuri asociate pentru stocarea acestei alegeri.

#### 12.3 Tratarea confidențialității în implementarea curentă 4C
* Voturile sunt complet decuplate de orice profil de utilizator;
* Pentru câmpurile `free_text`, există riscul ca utilizatorul să introducă benevol date de contact sau nume. În UI este specificat avertismentul explicit: *„Vă rugăm să nu includeți date cu caracter personal în câmpul de răspuns liber”*.
* Dacă la o etapă viitoare se decide introducerea participării nominale sau a comutatorului de anonimat, aceasta va necesita extinderea formală a interfeței `SurveySubmission` (ex: `isAnonymous: boolean`, `respondentInfo?: { name?: string; contact?: string }`) și adaptarea corespunzătoare a formularului `SurveyVotingModal.tsx`.

---

### 13. UX, ACCESIBILITATE ȘI COMPORTAMENT RESPONSIVE

* **Desktop ($\ge$ 1024px)**: Carduri aerisite, spațiere generoasă, modal centrat cu scroll fin;
* **Tabletă (768px -- 1023px)**: Controale tactile optimizate, butoane dimensionate confortabil;
* **Mobile (< 768px)**:
  - Formularul este complet adaptat ecranelor înguste;
  - Butoanele de trimitere/anulare sunt plasate cu padding generos la baza modalului (`pb-6`), evitând acoperirea de către bara inferioară de navigare (*bottom navigation*);
  - Selectoarele radio și checkbox au o suprafață mare de click/atingere (`p-3`);
  - Nu există overflow orizontal.

---

### 14. MATRICEA TESTELOR OBLIGATORII 4C (T-4C-01 $\rightarrow$ T-4C-19)

| ID Test | Obiectiv / Descriere Test | Metodă de Verificare | Rezultat Așteptat | Rezultat Efectiv | Statut |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **T-4C-01** | Afișarea listei publice de sondaje | Navigare la tab-ul „Sondaje” din meniul principal sau de pe ecranul Acasă | Se afișează componenta `PublicSurveysList` cu antet civic și lista consultărilor | Pagina de sondaje se randează curat, afișând sondajele active | **PASS** |
| **T-4C-02** | Afișarea exclusivă a sondajelor eligibile pentru participare | Verificare prezență sondaj `srv-demo-001` (activ) vs `srv-demo-002` (draft) și `srv-demo-003` (closed) | Numai sondajul activ deschis este vizibil; draft-urile și cele închise sunt ascunse | În listă apare exclusiv `srv-demo-001`. `srv-demo-002` și `003` sunt filtrate complet | **PASS** |
| **T-4C-03** | Deschiderea unui sondaj activ | Apăsare pe butonul „Participă la sondaj” al consultării active | Se deschide `SurveyVotingModal` cu titlul, descrierea, perioada și întrebările | Modalul se deschide animat, cu toate metadatele corect populate | **PASS** |
| **T-4C-04** | Afișarea corectă a întrebărilor în ordinea definită | Inspectare vizuală a ordinii întrebărilor `#1`, `#2`, `#3` din sondaj | Întrebările respectă strict ordinea numerică `order` salvată în model | Întrebările apar ordonate: #1 (single choice), #2 (multiple choice), #3 (free text) | **PASS** |
| **T-4C-05** | Răspuns `single_choice` | Clic pe o opțiune radio, apoi pe o altă opțiune | Doar o singură opțiune poate fi selectată la un moment dat | Opțiunea anterioară se debifează, starea memorează exact 1 ID de variantă | **PASS** |
| **T-4C-06** | Răspuns `multiple_choice` | Clic pe 2 sau mai multe opțiuni de tip checkbox | Permite bifarea/debifarea concomitentă a mai multor opțiuni | Toate opțiunile bifate sunt memorate într-un array, stilul vizual se actualizează | **PASS** |
| **T-4C-07** | Răspuns `free_text` | Introducere text în zona `textarea` | Textul este memorat în starea formularului | Câmpul permite introducerea liberă a sugestiilor fără variante predefinite | **PASS** |
| **T-4C-08** | Validarea întrebărilor obligatorii | Trimitere formular fără selectare răspuns la întrebarea obligatorie `#1` | Trimiterea este blocată, apare chenar roșu și mesaj explicativ | Eroare afișată: *„Vă rugăm să selectați o opțiune (răspuns obligatoriu).”* | **PASS** |
| **T-4C-09** | Respingerea răspunsurilor invalide | Testare funcție `validateSubmissionAnswers()` cu opțiuni inexistente în definiție | `isValid: false`, generare eroare specifică | Serviciul respinge opțiunea ca fiind invalidă | **PASS** |
| **T-4C-10** | Trimiterea unui formular valid | Completare răspunsuri la toate întrebările obligatorii și apăsare „Trimite Răspunsurile” | Formularul este trimis cu succes, votul persistat în storage | Trimiterea se finalizează, payload-ul este salvat în `turnu_civic_survey_submissions_store` | **PASS** |
| **T-4C-11** | Afișarea confirmării după trimitere | Vizualizare stare modal după finalizarea trimiterii | Apare ecranul de succes cu mesajul de confirmare și ID-ul local | Afișat: *„Răspunsurile dumneavoastră au fost înregistrate!”* alături de ID `sub-XXX` | **PASS** |
| **T-4C-12** | Persistența markerului local de participare | Închidere modal și verificare card sondaj în listă | Pe card apare badge-ul albastru „Ai participat deja” | Badge-ul apare imediat, butonul devine „Vezi detalii sondaj” | **PASS** |
| **T-4C-13** | Blocarea unei a doua participări în aceeași instanță locală | Redeschidere sondaj după votare | Modalul afișează ecranul „Ați participat deja la acest sondaj”, fără buton de trimitere | Re-votarea este complet blocată de ecranul informativ și de service | **PASS** |
| **T-4C-14** | Comportamentul pentru sondaj expirat/închis | Modificare stare sondaj în `closed` sau dată expirată | Sondajul dispare automat din lista publică | Filtrarea elimină sondajul din lista eligibilă pentru vot | **PASS** |
| **T-4C-15** | Comportamentul când sondajul devine indisponibil înainte de trimitere | Apel `submitVote()` pe un sondaj trecut manual în `closed` | Salvarea este respinsă cu eroare explicativă | Serviciul returnează: *„Acest sondaj nu mai este activ și nu mai acceptă răspunsuri.”* | **PASS** |
| **T-4C-16** | Protecția împotriva apăsărilor repetate pe „Trimite” | Apăsare rapidă repetată pe butonul de submit | Butonul se dezactivează (`disabled`), textul devine „Se trimite votul...” | Trimiterea nu este dublată; cererea este procesată o singură dată | **PASS** |
| **T-4C-17** | Responsive desktop/tabletă/mobile | Testare rezoluții 1440px, 768px și 375px | Fără overflow orizontal, butoane tactile mari, fără coliziune cu bottom bar | Interfața se scalează impecabil pe mobil și desktop | **PASS** |
| **T-4C-18** | Non-regresia Etapelor 1--4B | Navigare prin Comunicate, Sesizări, Hartă, Ghid, CMS și Admin Sondaje (4B) | Toate modulele anterioare rămân 100% funcționale | Toate rutele și acțiunile din etapele anterioare funcționează perfect | **PASS** |
| **T-4C-19** | Build + TypeScript/lint fără erori | Execuție `npm run lint` și `npm run build` | 0 erori de compilare, 0 avertismente critice | **Lint: PASS (0 erori)**; **Build: PASS (Succes)** | **PASS** |

---

### 15. REZULTATELE VERIFICĂRILOR TEHNICE

* **TypeScript Linting (`tsc --noEmit`)**:
  * Comandă: `npm run lint`
  * Rezultat: **Exit Code 0 — Linting completed successfully**
  * Erori detectate: **0**
* **Compilare Vite pentru Producție (`vite build`)**:
  * Comandă: `npm run build`
  * Rezultat: **Build succeeded - the applet is compiled**
  * Erori detectate: **0**

---

### 16. VERIFICAREA NON-REGRESIEI

S-a verificat că nicio funcționalitate din etapele anterioare nu a fost alterată:
* **Etapa 1B & 1C**: Comunicate, alerte de urgență și evenimente locale funcționale;
* **Etapa 2A, 2B, 2C**: Ghidul Primăriei, apelare Quick Dial și panoul CMS funcționale;
* **Etapa 3A--3E**: Formular sesizări civice, identificator TM-XXX, compresie foto WebP/JPEG, harta interactivă Leaflet și moderarea administrativă intacte;
* **Etapa 4A & 4B**: Modelul de date și interfața de administrare a sondajelor din panoul Admin funcționează fără nicio modificare adversă.

---

### 17. LIMITĂRI ASUMATE PENTRU PRODUCȚIE ȘI CE NU S-A IMPLEMENTAT

Conform instrucțiunilor oficiale, s-a menținut o delimitare strictă față de următoarele etape:
* **Rezultate agregate și distribuția voturilor**: **NU au fost implementate** $\rightarrow$ aparține **Etapei 4D**;
* **Grafice, bare procentuale și statistici publice**: **NU au fost implementate** $\rightarrow$ aparține **Etapei 4D**;
* **Mecanisme avansate anti-vot multiplu (fingerprinting avansat, IP rate limiting, server session)**: **NU au fost implementate** $\rightarrow$ aparține **Etapei 4E**;
* **Backend centralizat / Server API / Bază de date relațională**: **NU a fost introdus** $\rightarrow$ aparține Etapei 5.

---

### 18. CONFIRMAREA EXPLICITĂ A NEÎNCEPERII ETAPELOR 4D ȘI 4E

* Se confirmă ferm că:
  - **Nicio componentă din Etapa 4D (Rezultate și Statistici) NU a fost începută**;
  - **Nicio componentă din Etapa 4E (Prevenirea Votului Multiplu Robustă) NU a fost începută**;
  - Nu există grafice, rapoarte de distribuție procentuală sau endpoint-uri server.

---

### 19. CONCLUZIE FINALĂ ȘI CONFIRMARE DE OPRIRE

* **Etapa 4C (Interfața publică a sondajelor și fluxul de vot) este FINALIZATĂ, TESTATĂ ȘI VERIFICATĂ ÎN INTEGRALITATEA EI.**
* Raportul a fost actualizat separat în rădăcina proiectului (`RAPORT_AUDIT_ETAPA_4C.md`) și **NU este expus în interfața publică sau în rutele aplicației**.
* **EXECUȚIA ESTE COMPLET OPRITĂ.** Aștept decizia dumneavoastră oficială.

---
*Raport tehnic generat în rădăcina proiectului: `RAPORT_AUDIT_ETAPA_4C.md`.*
