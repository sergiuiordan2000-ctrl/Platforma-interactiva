# RAPORT OFICIAL DE AUDIT TEHNIC — ETAPA 4B
## Interfața de Administrare și Creare a Sondajelor

*Data raportului: 25 Septembrie 2026*  
*Proiect: Turnu Măgurele Civic — Platformă digitală independentă*  
*Etapa: ETAPA 4B — Administrarea sondajelor*  
*Prerechizit: Etapa 4A — Modelul de date, închisă și validată*  
*Destinație: Document intern de audit tehnic și conformitate arhitecturală (neexpus în interfața publică)*  
*Statut etapă: FINALIZATĂ ȘI VERIFICATĂ*

---

### CUPRINS
1. Obiectivul Etapei 4B
2. Ce S-a Implementat
3. Fișiere Create și Modificate
4. Integrarea cu Etapa 4A și Clarificări de Model
   * 4.1 Clarificare: Existența proprietății `category` în modelul 4A
   * 4.2 Ajustările tehnice suport aduse serviciului `surveyService.ts`
5. Interfața Admin (Secțiunea D. Sondaje Civice)
6. Fluxul de Creare a Sondajului
7. Fluxul de Editare, Reordonare și Inspectare
8. Validări Centralizate și Fluxul Efectiv al Activării
9. Ciclul de Viață al Statusurilor și Tranzițiile Permise
   * 9.1 Statusurile definite: `draft`, `active`, `closed`
   * 9.2 Confirmare și analiză: Reactivarea unui sondaj `closed`
10. Persistența Datelor și Limitele Asumate
11. Matricea Testelor Obligatorii 4B (T-4B-01 $\rightarrow$ T-4B-18)
12. Rezultatele Verificărilor Tehnice (TypeScript, Lint & Build)
13. Verificarea Responsive (Desktop, Tabletă, Mobile)
14. Verificarea Non-Regresiei Modulelor Anterioare (Etapele 1, 2, 3 și 4A)
15. Limitări Asumate și Ce NU s-a Implementat (Separare strictă de 4C, 4D, 4E)
16. Concluzie Finală și Confirmare de Oprire

---

### 1. OBIECTIVUL ETAPEI 4B

Obiectivul Etapei 4B a constat în construirea interfeței complete de administrare pentru sondajele dinamice, utilizând exclusiv modelul de date și serviciul de acces implementate în Etapa 4A.

Un administrator autentificat al aplicației poate:
* Vizualiza lista completă a sondajelor existente, cu status, categorie, perioadă și număr de întrebări;
* Crea un sondaj nou cu titlu, descriere, categorie, perioadă (dată început / sfârșit) și status inițial (implicit `draft`);
* Adăuga întrebări de tip `single_choice`, `multiple_choice` și `free_text`;
* Adăuga, modifica, șterge și reordona variantele de răspuns pentru întrebările choice;
* Reordona întrebările din sondaj cu persistența indicelui de ordine numeric;
* Salva sondajul ca `draft` sau în starea dorită;
* Edita oricând un sondaj existent;
* Activa un sondaj doar dacă respectă toate regulile de validare structurală;
* Închide un sondaj activ fără a-i altera structura;
* Șterge un sondaj exclusiv în urma unei confirmări explicite dintr-un dialog modal de confirmare.

---

### 2. CE S-A IMPLEMENTAT

1. **Managerul Administrativ de Sondaje (`AdminSurveysManager.tsx`)**:
   - Secțiune dedicată în panoul Admin existent (`D. Sondaje Civice (4B)`);
   - Filtrare reactivă pe statusuri (`Toate`, `Draft`, `Active`, `Închise`);
   - Căutare în timp real după titlu sau categorie;
   - Carduri per sondaj cu badges de status, badges demo, stare temporală calculată (`În desfășurare`, `Urmează să înceapă`, `Perioadă expirată`), perioadă calendaristică formatată în limba română, număr de întrebări și data ultimei modificări;
   - Acțiuni rapide: `Inspectează`, `Editează`, `Activează` (pentru draft/închis), `Închide` (pentru activ), `Șterge` (cu confirmare);
   - Buton de `Reset Demo` pentru revenirea la seed-ul inițial.

2. **Formularul Modal de Creare și Editare (`SurveyFormModal.tsx`)**:
   - Permite completarea tuturor metadatelor sondajului (titlu, categorie, descriere, dată început, dată sfârșit, status);
   - Status inițial implicit: `draft`;
   - Listă dinamică de întrebări cu posibilitate de adăugare nelimitată;
   - Butoane dedicate de salvare ca `Draft` sau salvare conform statusului selectat;
   - Afișare centralizată a erorilor returnate de validatorul `surveyService`.

3. **Editorul Specializat de Întrebări (`SurveyQuestionEditor.tsx`)**:
   - Câmp pentru enunțul întrebării și text ajutător opțional;
   - Selector dinamic pentru cele 3 tipuri MVP: `single_choice`, `multiple_choice`, `free_text`;
   - Checkbox pentru caracterul obligatoriu (`isRequired`);
   - Butoane pentru mutare sus / jos a întrebării;
   - Buton de ștergere întrebare;
   - Zonă dedicată pentru variante de răspuns (pentru `single_choice` și `multiple_choice`): adăugare variantă nouă, editare inline text variantă, reordonare sus/jos, ștergere variantă;
   - Adaptare automată: la selectarea `free_text`, zona variantelor este înlocuită cu un mesaj explicativ că cetățeanul va completa un câmp text liber.

4. **Dialog Modal de Confirmare la Ștergere**:
   - Previne ștergerea accidentală; oferă protecție la nivel de UX (nu securitate server-side) solicitând confirmarea explicită a administratorului cu privire la titlul sondajului vizat.

5. **Modal de Inspectare Structură**:
   - Permite revizuirea întrebărilor și a opțiunilor fără deschiderea formularului de editare. Menționează explicit că rezultatele de vot nu se afișează (aparțin Etapei 4D).

---

### 3. FIȘIERE CREATE ȘI MODIFICATE

| Cale Fișier | Tip Acțiune | Linii Cod | Rol Tehnic |
| :--- | :--- | :--- | :--- |
| `src/components/admin/surveys/SurveyQuestionEditor.tsx` | **Creat** | 296 | Editor modular pentru întrebări, tipuri, obligativitate și variante de răspuns ordonate |
| `src/components/admin/surveys/SurveyFormModal.tsx` | **Creat** | 338 | Fereastră modală pentru crearea și editarea sondajelor, validare și salvare |
| `src/components/admin/surveys/AdminSurveysManager.tsx` | **Creat** | 436 | Interfața completă de administrare: listă, filtrare, căutare, activare, închidere, ștergere și inspectare |
| `src/services/surveyService.ts` | **Modificat** | +50 | Adăugare metode suport: `updateSurveyStatus()` cu validare prealabilă la activare și `generateSurveyId()` |
| `src/views/AdminView.tsx` | **Modificat** | +25 | Integrare tab `D. Sondaje Civice (4B)` în panoul de administrare protejat |

*Notă de conformitate*: Niciun fișier public de vot și niciun modul din Etapele 1, 2 sau 3 nu a fost afectat.

---

### 4. INTEGRAREA CU ETAPA 4A ȘI CLARIFICĂRI DE MODEL

#### 4.1 Clarificare: Existența proprietății `category` în modelul 4A
* **Statut**: Proprietatea opțională `category?: string` **exista deja definită în modelul de date încă din Etapa 4A** (în fișierul `src/types/survey.ts`, linia 71: *„category?: string; // Categorie municipală opțională (ex: 'Urbanism', 'Mediu', 'Mobilitate')”*).
* De asemenea, aceasta figura explicit în seed-ul demonstrativ creat în Etapa 4A (`src/data/mockSurveys.ts` conținea categorii precum *„Mediu & Spații Verzi”*, *„Mobilitate Urbană”*, *„Cultură & Timp Liber”*).
* **Concluzie**: Proprietatea `category` **NU a fost introdusă în Etapa 4B**, ci a fost preluată fidel din contractul de date stabilit și aprobat la închiderea Etapei 4A. În Etapa 4B i s-a oferit doar un câmp dedicat de editare în `SurveyFormModal` și suport pentru filtrare/căutare în `AdminSurveysManager`. Impactul asupra arhitecturii este zero (non-breaking, backward-compatible).

#### 4.2 Ajustările tehnice suport aduse serviciului `surveyService.ts`
* Conform Secțiunii 3 a instrucțiunilor („Ajustări ale serviciului 4A permise dacă sunt strict necesare și documentate”), s-au adăugat exclusiv două metode utilitare:
  1. `updateSurveyStatus(id: string, newStatus: SurveyStatus)`: Actualizează statusul și timestamp-ul de audit, refuzând trecerea în `active` dacă sondajul nu este 100% valid structural conform `validateSurveyStructure()`;
  2. `generateSurveyId()`: Generează identificatori unici de tip `srv-[timestamp]-[random]`.

---

### 5. INTERFAȚA ADMIN

* Accesul este protejat de mecanismul de autentificare existent al panoului de administrare (`AdminLoginForm`);
* Tab-ul `D. Sondaje Civice (4B)` este adăugat alături de celelalte secțiuni administrative existente (`A. Ghidul Primăriei`, `B. Quick Dial`, `C. Moderare Sesizări`);
* În antet și în liste este afișat numărul total de sondaje, numărul de întrebări, perioada și data ultimei modificări;
* Nu se afișează rezultate de vot sau grafice (respectând delimitarea strictă de Etapa 4D).

---

### 6. FLUXUL DE CREARE A SONDAJULUI

1. Administratorul apasă butonul `+ Sondaj Nou`;
2. Se deschide `SurveyFormModal` cu valori inițiale curate:
   - Data de început: data curentă;
   - Data de sfârșit: data curentă + 30 de zile;
   - Status implicit: `draft`;
   - O primă întrebare inițială pregătită cu 2 variante;
3. Administratorul completează titlul, categoria, descrierea, adaugă întrebări și configurează variantele;
4. La apăsarea `Salvează ca Draft` sau `Salvează Sondajul`, validatorul centralizat verifică structura;
5. La succes, modalul se închide, lista se reîmprospătează instantaneu, iar un toast de notificare confirmă salvarea.

---

### 7. FLUXUL DE EDITARE, REORDONARE ȘI INSPECTARE

* **Editare**: Apăsarea pe `Editează` populează `SurveyFormModal` cu toate datele existente, inclusiv ordinea întrebărilor și variantelor;
* **Reordonare Întrebări**: Butoanele săgeată sus/jos mută elementele în array și actualizează numeric proprietatea `order` (1-indexed);
* **Reordonare Variante**: Similar, fiecare variantă are butoane de mutare sus/jos ce recalculează proprietatea `order`;
* **Inspectare**: Permite vizualizarea rapidă a întrebărilor fără riscul modificării accidentale.

---

### 8. VALIDĂRI CENTRALIZATE ȘI FLUXUL EFECTIV AL ACTIVĂRII

#### Clarificare privind imposibilitatea ocolirii validării la activare:
Activarea unui sondaj **NU poate ocoli regulile de validare structurală**, indiferent de calea aleasă:
1. **Prin acțiunea directă „Activează” din lista de sondaje (`AdminSurveysManager.tsx`)**:
   - Butonul invocă `surveyService.updateSurveyStatus(survey.id, 'active')`.
   - În interiorul serviciului, dacă `newStatus === 'active'`, se apelează obligatoriu `this.validateSurveyStructure(currentSurvey)`. Dacă există vreo eroare (ex: mai puțin de 2 variante, titlu prea scurt, perioadă invalidă), tranzacția este respinsă cu cod `success: false` și lista detaliată a erorilor. Sondajul rămâne în starea sa anterioară, iar administratorul primește o alertă explicativă.
2. **Prin formularul de creare/editare (`SurveyFormModal.tsx`)**:
   - Dacă administratorul selectează în dropdown statusul `active` și apasă `Salvează Sondajul`, formularul apelează direct `surveyService.validateSurveyStructure(candidateSurvey)`.
   - Dacă există erori, salvarea este blocată în UI (`isSubmitting` oprit, erorile afișate în blocul roșu), iar funcția `surveyService.upsertSurvey()` nici măcar nu este apelată.
   - Chiar dacă un apel direct ar încerca să invoce `upsertSurvey()`, acesta include la rândul său verificarea `this.validateSurveyStructure(survey)` ca prim pas.

Astfel, este garantat tehnic că un sondaj invalid nu poate ajunge în starea `active`.

---

### 9. CICLUL DE VIAȚĂ AL STATUSURILOR ȘI TRANZIȚIILE PERMISE

#### 9.1 Statusurile definite în model
* **`draft` (Ciornă)**: Sondaj în pregătire/lucru. Nu este expus cetățenilor și nu poate fi votat;
* **`active` (Activ)**: Sondaj aprobat și deschis consultării cetățenești (în interiorul perioadei de valabilitate);
* **`closed` (Închis/Arhivat)**: Consultare finalizată, a cărei perioadă a expirat sau care a fost oprită manual de administrator.

#### 9.2 Confirmare și analiză privind reactivarea unui sondaj `closed`
* **Comportament actual constatat**: În implementarea actuală a UI-ului (`AdminSurveysManager.tsx`), butonul `Activează` este randat condiționat pe regula `survey.status !== 'active'`. În consecință, butonul apare atât pentru sondajele `draft`, cât și pentru cele `closed`.
* **Unde este definită regula**:
  - Specificația oficială a Etapei 4B menționează la Secțiunea 1: *„activa/închide un sondaj conform regulilor existente”*, iar la Secțiunea 5: *„activare, dacă este valid pentru activare; închidere, dacă este activ”*.
  - Nu a existat o interdicție explicită în specificație privind tranziția `closed -> active`.
* **Motivul și utilitatea tehnică a tranziției**:
  - În scenarii administrative reale de nivel municipal, o consultare poate fi închisă temporar dintr-o eroare umană sau pentru prelungirea dezbaterii publice (printr-un act adițional sau prelungire de termen). Posibilitatea de a reactiva consultarea (cu reverificarea obligatorie a validității structurale și a perioadei) oferă flexibilitate operațională.
* **Documentare de conformitate**: Deoarece specificația 4B nu a interzis explicit această tranziție, comportamentul a fost păstrat neschimbat la nivel de cod și documentat tehnic aici, fără a inventa restricții arbitrare înainte de primirea instrucțiunilor pentru Etapele 4C/4D.

---

### 10. PERSISTENȚA DATELOR ȘI LIMITELE ASUMATE

* Persistența locală folosește `localStorage` cu cheia `turnu_civic_surveys_store` conform convenției MVP;
* Modificările supraviețuiesc reîncărcării paginii (F5/Reload);
* **Nu este prezentată ca bază de date centralizată**. La conectarea backend-ului (Etapa 5), apelurile din `surveyService` vor fi comutate pe endpoint-uri REST/GraphQL.

---

### 11. MATRICEA TESTELOR OBLIGATORII 4B (T-4B-01 $\rightarrow$ T-4B-18)

| ID Test | Obiectiv / Descriere Test | Metodă de Verificare | Rezultat Așteptat | Rezultat Efectiv | Statut |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **T-4B-01** | Deschiderea secțiunii Admin $\rightarrow$ Sondaje | Autentificare în Admin și selectare tab `D. Sondaje Civice (4B)` | Se afișează lista de sondaje și statisticile | Tab-ul se deschide instantaneu, afișând managerul de sondaje | **PASS** |
| **T-4B-02** | Crearea unui sondaj nou | Apăsare buton `+ Sondaj Nou` | Se deschide `SurveyFormModal` cu status inițial draft și date precompletate | Modalul se deschide curat, cu status 'draft' și 1 întrebare inițială | **PASS** |
| **T-4B-03** | Salvarea unui sondaj valid ca draft | Completare titlu, descriere, întrebare validă și apăsare `Salvează ca Draft` | Sondajul este persistat în storage cu status `draft` | Sondajul apare în listă marcat cu badge galben 'Draft (Ciornă)' | **PASS** |
| **T-4B-04** | Redeschiderea unui sondaj salvat | Apăsare buton `Editează` pe un sondaj salvat | Toate câmpurile, întrebările și opțiunile sunt populate identic | Formularul se deschide cu toate datele intacte | **PASS** |
| **T-4B-05** | Adăugarea unei întrebări `single_choice` | Selectare tip 'single_choice' și configurare variante | Permite adăugarea variantelor și salvarea tipului radio | Întrebarea este salvată cu tipul 'single_choice' și variantele aferente | **PASS** |
| **T-4B-06** | Adăugarea unei întrebări `multiple_choice` | Selectare tip 'multiple_choice' și adăugare 3 opțiuni | Permite opțiuni multiple și salvarea tipului checkbox | Întrebarea este salvată cu tipul 'multiple_choice' și opțiunile definite | **PASS** |
| **T-4B-07** | Adăugarea unei întrebări `free_text` | Selectare tip 'free_text' | Ascunde editorul de variante și afișează mesaj explicativ | Editorul de variante se ascunde, întrebarea este salvată fără opțiuni | **PASS** |
| **T-4B-08** | Adăugarea, modificarea și ștergerea variantelor | Adăugare opțiune nouă, modificare text inline și ștergere prin buton dedicat | Opțiunile se adaugă, se editează și se elimină cu recalcularea ordinii | Variantele răspund reactiv; ordinea rămâne coerentă (1, 2, ...) | **PASS** |
| **T-4B-09** | Reordonarea întrebărilor și persistența ordinii | Utilizare butoane săgeată sus/jos pe întrebări $\rightarrow$ Salvare $\rightarrow$ Re-editare | Întrebările își schimbă poziția și indicii `order` sunt salvați | Ordinea persistă corect la redeschidere | **PASS** |
| **T-4B-10** | Validarea unui formular invalid | Încercare salvare cu titlu gol sau întrebare fără opțiuni suficiente | Afișare erori în bloc roșu; salvarea este blocată | Apar mesajele clare: „Titlul sondajului...", „Întrebarea #1 necesită cel puțin 2 variante..." | **PASS** |
| **T-4B-11** | Activarea unui sondaj valid | Apăsare buton `Activează` pe un sondaj draft valid | Statusul trece în `active`, apare toast verde | Sondajul primește badge verde 'Activ' cu indicator pulsatoriu | **PASS** |
| **T-4B-12** | Refuzarea activării unui sondaj invalid | Încercare activare a unui sondaj cu structură incompletă | Activarea eșuează; apare alertă detaliată | Sistemul afișează erorile de validare și menține starea anterioară | **PASS** |
| **T-4B-13** | Închiderea unui sondaj activ | Apăsare buton `Închide` pe un sondaj activ | Statusul devine `closed`; structura rămâne intactă | Sondajul primește badge gri 'Închis / Finalizat'; structura e conservată | **PASS** |
| **T-4B-14** | Ștergerea unui sondaj după confirmare | Apăsare buton `Șterge` $\rightarrow$ Dialog confirmare $\rightarrow$ `Da, șterge definitiv` | Sondajul este eliminat din stocare și din listă | Sondajul este șters definitiv; toast-ul confirmă eliminarea | **PASS** |
| **T-4B-15** | Persistența după reload | Creare sondaj $\rightarrow$ Salvare $\rightarrow$ Refresh pagină (F5) | Sondajul nou persistă identic în stocarea locală | La reîncărcare, sondajul este prezent cu toate întrebările salvate | **PASS** |
| **T-4B-16** | Verificarea responsive (desktop/tabletă/mobile) | Testare rezoluții 1440px, 768px și 375px | Fără overflow orizontal; butoane și controale accesibile | Interfața se adaptează flexibil pe toate dispozitivele | **PASS** |
| **T-4B-17** | Non-regresia modulelor Etapelor 1--4A | Navigare la Comunicate, Sesizări, Hartă, Ghid, Quick Dial | Toate funcționalitățile anterioare funcționează normal | Modulele anterioare sunt 100% operaționale și intacte | **PASS** |
| **T-4B-18** | Build + TypeScript/lint fără erori | Rulare `npm run lint` și `npm run build` | 0 erori de tipuri, 0 warning-uri critice, build finalizat | **Lint: PASS (0 erori)**; **Build: PASS (Succes)** | **PASS** |

---

### 12. REZULTATELE VERIFICĂRILOR TEHNICE

* **TypeScript Linting (`tsc --noEmit`)**:
  * Comandă: `npm run lint`
  * Rezultat: **Exit Code 0 — Linting completed successfully**
  * Erori: **0**
* **Compilare Vite pentru Producție (`vite build`)**:
  * Comandă: `npm run build`
  * Rezultat: **Build succeeded - the applet is compiled**
  * Erori: **0**

---

### 13. VERIFICAREA RESPONSIVE

* **Desktop ($\ge$ 1024px)**: Grid optimizat, acțiuni administrative aliniate lateral, modal generos cu vizualizare aerisită;
* **Tabletă (768px - 1023px)**: Controale flexibile, wrap automat al filtrelor și acțiunilor, ferestre modale adaptate ecranului;
* **Mobil (< 768px)**: Butoane touch-friendly, scroll intern vertical fără depășire orizontală a viewport-ului, formulare complet utilizabile.

---

### 14. VERIFICAREA NON-REGRESIEI

A fost inspectată și testată integritatea tuturor modulelor anterioare:
* **Etapa 1B & 1C**: Comunicate oficiale, știri, alerte și evenimente culturale intacte;
* **Etapa 2A, 2B, 2C**: Ghidul Primăriei, apelare rapidă Quick Dial și panoul de administrare CMS intacte;
* **Etapa 3A--3E**: Formular sesizări, alocare identificator `TM-XXX`, compresie foto WebP/JPEG, hartă interactivă Leaflet și panoul de moderare administrative intacte;
* **Etapa 4A**: Modelul de date și serviciul de date sunt respectate fără dublare.

---

### 15. LIMITĂRI ASUMATE ȘI CE NU S-A IMPLEMENTAT

Conform instrucțiunilor oficiale, s-a păstrat o separare strictă față de etapele viitoare:
* **Interfața publică de vot a cetățeanului**: **NU a fost implementată** $\rightarrow$ aparține **Etapei 4C**;
* **Trimiterea votului și validarea răspunsurilor cetățeanului**: **NU au fost implementate** $\rightarrow$ aparține **Etapei 4C**;
* **Calcularea rezultatelor și distribuția voturilor**: **NU au fost implementate** $\rightarrow$ aparține **Etapei 4D**;
* **Graficele procentuale și vizualizarea statistică**: **NU au fost implementate** $\rightarrow$ aparține **Etapei 4D**;
* **Mecanismele anti-vot multiplu (fingerprint / IP / sesiune)**: **NU au fost implementate** $\rightarrow$ aparține **Etapei 4E**;
* **Backend centralizat / Server API**: **NU a fost introdus** $\rightarrow$ aparține Etapei 5.

---

### 16. CONCLUZIE FINALĂ ȘI CONFIRMARE DE OPRIRE

* **Etapa 4B (Interfața de administrare și creare a sondajelor) este INTEGRATĂ COMPLET, STABILĂ, TESTATĂ ȘI VERIFICATĂ ÎN INTEGRALITATEA EI.**
* Raportul a fost actualizat separat în rădăcina proiectului (`RAPORT_AUDIT_ETAPA_4B.md`) și **NU este expus în interfața publică sau în rutele utilizatorilor**.
* **Nicio componentă din etapele 4C, 4D sau 4E nu a fost începută.**
* **EXECUȚIA ESTE COMPLET OPRITĂ.** Aștept auditul și confirmarea dumneavoastră oficială.

---
*Raport tehnic generat în rădăcina proiectului: `RAPORT_AUDIT_ETAPA_4B.md`.*
