# PROJECT_HANDOFF_CURRENT.md — Turnu Măgurele Civic

**Stare documentată:** finalul Etapei 6.5 (26 septembrie 2026), actualizată după **Etapa 6.6** (comisă și publicată: `83b77ad`), după **auditul general** și pentru **remedierea P0 post-audit** (vezi B, G.5 și I)
**Scop:** documentul principal de preluare pentru un chat nou. Înlocuiește, pentru starea curentă, secțiunile de stare din `PROJECT_HANDOFF.md`. Acela a fost scris la finalul Etapei 5 și este acum depășit la Git, securitate și pasul următor.

> **Regula de pornire pentru noul chat:** citește acest document, apoi `PROJECT_RULES_AND_DECISIONS.md` și `ETAPA_6_STATUS_FINAL.md`. Apoi **verifică starea Git real** (Secțiunea B.4). Nu presupune nimic din memorie. **Codul și istoricul Git sunt sursa de adevăr.** Dacă documentul și codul se contrazic, codul are dreptate, iar contradicția se raportează.

---

## A. IDENTITATEA PROIECTULUI

### A.1 Nume și scop
- **Nume:** Turnu Măgurele Civic. Titlul din `index.html` este cel corect; `package.json` are încă numele generic `react-example`, moștenit din boilerplate-ul AI Studio.
- **Scop:** platformă civică digitală **independentă** (nu oficială, nu operată de Primărie) pentru municipiul Turnu Măgurele:
  - comunicate și evenimente locale;
  - sesizări cetățenești cu fotografie și localizare, moderate și afișate pe hartă;
  - consultări publice (sondaje);
  - Ghidul Primăriei și numerele utile (Apel rapid / Quick Dial).

### A.2 Arhitectura actuală
- SPA React, **100% client-side**, un singur bundle.
- Rutare **hash**, manuală (`window.location.hash` în `src/App.tsx`), fără bibliotecă de rutare.
- Servicii singleton pe domenii (`src/services/*.ts`), cu persistență în **`localStorage` / `sessionStorage`** din browserul curent.
- **Nu există backend real.** Nu există server, API, bază de date centralizată, autentificare pe server sau trimitere reală de e-mail.
  - Dependențele `express`, `@google/genai` și `dotenv` din `package.json` sunt reziduuri nefolosite ale boilerplate-ului.
- Conexiuni reale la rețea: tile-urile hărții OpenStreetMap și imaginile demo ale comunicatelor, încărcate de pe Unsplash (m16).
- E-mailul este **simulat** (`emailService`, stare `simulated`, niciodată `sent`).

### A.3 Stack tehnic
| Element | Versiune / detaliu |
|---|---|
| React | 19 |
| TypeScript | `tsc --noEmit` (`npm run lint` rulează doar verificarea de tipuri, nu ESLint) |
| Vite | 8.x (`npm run dev`, `build`, `preview`) |
| Tailwind CSS | 4 (`@tailwindcss/vite`) |
| Hartă | Leaflet 1.9 (integrare manuală, fără `react-leaflet`) |
| Iconițe | `lucide-react` |
| Teste | Nu există framework de teste în repository (vezi E.3) |

### A.4 Roluri
| Rol | Cine | Acces |
|---|---|---|
| Public (neautentificat) | cetățeni | zona publică; operații publice: `submitReport`, `submitVote` |
| `primarie_operator` | personal Primărie | 13 din 24 de permisiuni: dashboard, sesizări (toate), comunicate (toate); Ghid, Apel rapid și Sondaje **doar vizualizare** |
| `super_admin` | administrator | toate cele 24 de permisiuni |

Matricea completă se află în `src/services/permissionService.ts` (`ROLE_PERMISSIONS`), neschimbată din Etapa 5D. **Nu există permisiune de ștergere a sesizărilor.**

### A.5 Structura Public / Admin
- **Public:**
  - `#home` (Acasă);
  - `#comunicate` (Comunicate & Evenimente);
  - `#sesizari` (formular de sesizare + confirmare; **fără listă publică**, din 6.5);
  - `#harta` (sesizările aprobate cu coordonate valide, fără datele autorului, cu model redus `PublicMapReport`; din 6.6 și cele cu valoarea istorică `private`);
  - `#sondaje`;
  - `#ghid` (Ghidul Primăriei + Apel rapid).
- **Admin (`#admin`):** din P0 post-audit (D11 = B) zona publică nu mai conține linkuri către Admin; ruta se accesează direct.
  - formular de autentificare, fără login DEMO din 6.4;
  - shell separat cu taburile Dashboard, Comunicate, Moderare Sesizări, Ghidul Primăriei (+ Apel rapid) și Sondaje, fiecare filtrat după permisiuni.

### A.6 Chei `localStorage` (NU se schimbă fără decizie)
`turnu_civic_admin_session` (și în `sessionStorage`), `turnu_civic_announcements`, `turnu_civic_reports_store`, `turnu_civic_reports_counter`, `turnu_civic_email_log_store`, `turnu_civic_city_hall_directory`, `turnu_civic_quickdial_contacts`, `turnu_civic_quickdial_categories`, `turnu_civic_surveys_store`, `turnu_civic_survey_submissions_store`, `turnu_civic_user_participated_surveys`.

---

## B. STAREA GIT EXACTĂ

### B.1 Referința
| Element | Valoare |
|---|---|
| Repository GitHub | `https://github.com/sergiuiordan2000-ctrl/Platforma-interactiva` |
| Branch de lucru | `recovery-etapa-5-0e2cc20` |
| Ultimul commit de COD (starea 6.5) | `d89fd1ceba903faed2940d7d59b79fdbaac98d89`: `Etapele 6.4-6.5: securizare autentificare si autorizare` |
| Commit de documentație peste el | `docs: finalize project handoff after stage 6.5` (adaugă doar acest document, `PROJECT_RULES_AND_DECISIONS.md` și `ETAPA_6_STATUS_FINAL.md`; fără cod). HEAD-ul branch-ului este acest commit; hash-ul lui se verifică cu `git log -1`. |
| Branch-ul pe GitHub | identic cu HEAD-ul local; push-uri normale, fast-forward (`3c8d952..d89fd1c`, apoi commit-ul de documentație) |
| `main` pe GitHub | `d9bc2c9f53cec27dafc846889b0457eea8495d20`, **NEATINS, nu se modifică** |
| Working tree | curat după commit-ul de documentație. **Actualizare:** peste acesta există `499ce12` și `83b77ad` (Etapa 6.6), publicate pe GitHub (vezi B.2). Modificările remedierii P0 post-audit se comit doar la instrucțiunea proprietarului |

### B.2 Istoricul commit-urilor branch-ului (cronologic)
| Commit | Mesaj | Conținut |
|---|---|---|
| `672bbea` | chore: initial project state after 5A.1 | starea inițială (Etapele 1–4 + 5A.1), importată dintr-o singură bucată |
| `0e2cc20` | checkpoint: Etapele 5B-5G finalizate | Etapa 5 (5B–5G) |
| `2198ebe` | Etapa 5D: diferentiere super_admin / primarie_operator | rolul `primarie_operator` real |
| `fff9507` | docs: add Stage 5 handoff and final audit | `PROJECT_HANDOFF.md`, `RAPORT_AUDIT_FINAL_ETAPA_5.md` |
| `3b8d6ca` | Etapa 6.1: eliminare stergere sesizari | **6.1** |
| `a9f47fe` | docs: add Stage 6 audit and 6.1 report | `RAPORT_AUDIT_ETAPA_6.md`, `RAPORT_ETAPA_6_1.md` |
| `441afb9` | Etapa 6.2: tratare esec salvare sesizare | **6.2** |
| `3c8d952` | Etapa 6.3: securizare XSS harta publica | **6.3** |
| `d89fd1c` | Etapele 6.4-6.5: securizare autentificare si autorizare | **6.4 + 6.5** (13 fișiere); ultimul commit de cod |
| `bb91814` | docs: finalize project handoff after stage 6.5 | cele 3 documente de handoff; fără cod |
| `499ce12` | docs: record N1-N4 and P7 from stage 6.5 report | completarea documentației N1–N4 / P7; fără cod |
| `83b77ad` | feat(civic): finalize report takeover and assumption | **Etapa 6.6**: asumare / preluare (M7), sesizările `private` pe hartă, N1 închis, documentația vie; publicat pe GitHub |

### B.3 Continuitatea Etapei 6
- Etapa 6.1: commit `3b8d6ca`
- Etapa 6.2: commit `441afb9`
- Etapa 6.3: commit `3c8d952`
- Etapele 6.4 + 6.5: commit `d89fd1c`

### B.4 Verificarea obligatorie la începutul noului chat
```bash
git clone https://github.com/sergiuiordan2000-ctrl/Platforma-interactiva.git
cd Platforma-interactiva
git checkout recovery-etapa-5-0e2cc20
git log --oneline -10        # primul rând: ultimul commit al branch-ului (la actualizare: 83b77ad, Etapa 6.6)
git status --short           # nimic
git ls-remote origin refs/heads/main refs/heads/recovery-etapa-5-0e2cc20
npm install                  # dacă eșuează din conflictul esbuild/vite: npm install --legacy-peer-deps (vezi m15)
npx tsc --noEmit && npm run build
```
Notă tehnică: copia de lucru din sesiunea anterioară avea `origin` setat pe un bundle local de recuperare, iar push-ul se făcea direct către URL-ul GitHub. O clonă nouă de pe GitHub nu are această particularitate.

---

## C. ISTORICUL PROIECTULUI (rezumat cronologic)

Detaliile complete se află în rapoartele `RAPORT_AUDIT_ETAPA_*.md` din rădăcina repository-ului. Etapele 1–4 nu au commit-uri proprii: sunt incluse integral în `672bbea`.

| Etapă | Scop | Ce s-a implementat | Ce a rămas | Commit |
|---|---|---|---|---|
| 1B | Modulul Comunicate & Evenimente | listare, filtrare, detaliu comunicat | — | în `672bbea` |
| 1C | Unificarea evenimentelor în fluxul de comunicate | evenimente integrate, sortare după data desfășurării | — | în `672bbea` |
| 2A | Ghidul Primăriei | date instituționale, direcții, servicii, program, link-uri | — | în `672bbea` |
| 2B | Numere utile & Apel rapid | contacte și categorii | — | în `672bbea` |
| 2C | Panou de administrare (CMS) + autentificare client-side | shell Admin, login cu credențiale hardcodate, persistență Admin → Public | autentificarea a rămas client-side (vezi F) | în `672bbea` |
| 3A | Formularul de sesizare și serviciul decuplat | model `CivicReport`, categorii, validare | — | în `672bbea` |
| 3B | Identificatorul `TM-XXX` | contor secvențial, **niciodată refolosit**; a lăsat artefactul de test „Șterge (Test 6)” | artefactul eliminat abia în 6.1 | în `672bbea` |
| 3C | Compresia fotografiilor în browser | `imageCompressionService` | — | în `672bbea` |
| 3D | Harta sesizărilor (Leaflet) | `MapView`, markeri, popup | XSS, reparat în 6.3 | în `672bbea` |
| 3E | Moderare + regula de publicare | `private` / `public` / `public_anonymous` (implicit `private`), publicare doar după aprobare | regula „`private` → nu apare pe hartă” a fost **eliminată în 6.6** (opțiunea scoasă din formular, `private` = valoare istorică fără efect) | în `672bbea` |
| 4A–4E | Sondaje | structură, administrare, vot, statistici, prevenirea votului multiplu (marker local) | markerul anti-duplicare este doar local | în `672bbea` |
| 5A | Dashboard Admin + shell separat | — | — | în `672bbea` |
| 5B–5G | Comunicate CRUD, moderare/soluționare (axe independente), roluri, e-mail simulat, sursă unică de permisiuni, izolarea rolurilor | vezi `RAPORT_AUDIT_FINAL_ETAPA_5.md` | auditul Etapei 5 a dat verdict **FAIL transversal** din cauza ștergerii publice (reparat în 6.1) | `0e2cc20` |
| 5D | Diferențierea `super_admin` / `primarie_operator` | matricea de 24 de permisiuni (13 pentru operator), gărzi în UI și în handlere | — | `2198ebe` |
| 6 (6A–6E) | Audit: testare funcțională, responsive, erori, securitate, performanță | 85 de verificări: 70 PASS, 12 FAIL, 3 PARTIAL | problemele C1–C4, M1–M7, m1–m17 (vezi G) | raport în `a9f47fe` |
| 6.1–6.5 | Remedieri | vezi Secțiunea D | vezi G | `3b8d6ca` … `d89fd1c` |

---

## D. ETAPA 6: SITUAȚIA COMPLETĂ

Sursa constatărilor inițiale: `RAPORT_AUDIT_ETAPA_6.md`. Problemele critice identificate acolo erau:
- **C1:** pierderea tăcută a sesizărilor la depășirea cotei de stocare;
- **C2:** ștergerea publică a sesizărilor;
- **C3:** XSS stocat în harta publică;
- **C4:** login public 1-click ca `super_admin`.

### 6.1: Eliminarea ștergerii sesizărilor (C2 / S1), commit `3b8d6ca`
- Am eliminat butonul public „Șterge (Test 6)” și handler-ul lui din `IssuesView.tsx`.
- Am eliminat **complet metoda `reportService.deleteReport()`**. Nu mai există nicio cale de ștergere a sesizărilor pentru niciun rol.
- Regula 3B se păstrează: contorul `TM-XXX` nu scade niciodată.
- Raport: `RAPORT_ETAPA_6_1.md` (în repository).

### 6.2: Tratarea eșecului de salvare (C1), commit `441afb9`
- **Salvare tranzacțională** în `reportService.submitReport()`:
  1. sesizarea se scrie întâi în stocare, pe o listă candidat;
  2. **doar după o scriere reușită** se actualizează lista din memorie, contorul TM și „ultima sesizare” și se declanșează e-mailul simulat;
  3. la eșec nu se modifică nimic.
- **`QuotaExceededError`** și alte erori de stocare sunt detectate și întoarse explicit (`SubmitReportResult`), nu doar logate în consolă.
- **Fără confirmare falsă:** `ReportForm` afișează confirmarea și numărul TM doar dacă salvarea a reușit. Altfel afișează un mesaj clar (`role="alert"`), care menționează fotografiile dacă ele ocupă spațiul.
- **Formularul este păstrat** la eșec: textul, adresa și fotografiile rămân.
- **Reconcilierea contorului TM:** la inițializare, contorul efectiv este maximul dintre valoarea salvată și cel mai mare `TM-XXX` existent. Contorul avansează doar după salvarea sesizării. **Nu apar numere duplicate** nici dacă eșuează doar scrierea contorului.

### 6.3: Securizarea XSS în harta publică (C3 / S2), commit `3c8d952`
- **`escapeHtml`** în `src/views/MapView.tsx` escapează `& < > " '`.
- Toate valorile din sesizare (număr, categorie, descriere, adresă, dată) sunt escapate o singură dată și doar variabilele escapate intră în șabloane.
- **Markerele** (`L.divIcon({ html })`) și **popup-urile** (`bindPopup`) sunt protejate. **Atributele** sunt protejate prin escaparea ghilimelelor.
- **Sursa imaginilor** este acceptată doar prin `getSafeImageSrc`: `data:image/(jpeg|png|webp);base64,…` validat cu expresie regulată. Orice altă valoare este ignorată, iar popup-ul se afișează fără fotografie.

### 6.4: Securizarea autentificării în frontend (C4 / S3), inclusă în `d89fd1c`
- Am eliminat **loginul DEMO 1-click** (`handleQuickDemoLogin`, butonul „Autentificare rapidă DEMO”).
- Am eliminat **credențialele afișate public** pe pagina de login. Placeholder-ul e-mailului este acum `nume@exemplu.ro`.
- **Validarea sesiunii** în `authService` (`isValidSessionUser`, `VALID_ROLES`): sesiunea citită din stocare trebuie să aibă `id`, `email`, `name` nevide și un rol valid (`super_admin` / `primarie_operator`). O sesiune coruptă sau cu formă greșită este ștearsă, iar utilizatorul vede formularul de login.
- **Rolurile rămân neschimbate:** 3 conturi hardcodate (1 `super_admin`, 2 `primarie_operator`), definite în `src/services/authService.ts`.
- **Limitele cauzate de lipsa backend-ului:**
  - o sesiune scrisă manual, cu structură validă, este acceptată (6D-SES-01 rămâne FAIL);
  - parolele sunt în bundle;
  - sesiunea nu expiră.

### 6.5: Autorizarea la nivel de servicii și reducerea datelor expuse (M3 / M4), inclusă în `d89fd1c`
Etapa a început cu un audit read-only (probleme P1–P7, decizii N1–N4). Au fost remediate **P1–P6**. **P7 nu a fost rezolvat**, conform instrucțiunii. Dintre neclaritățile de produs, **N2 și N4 au rămas nedecise**, **N3 a fost clarificat tehnic** prin implementarea P1/P2, iar **N1 a fost închis în Etapa 6.6** (vezi G.3).

| # | Remediere |
|---|---|
| P1 + P2 | **Helper-e noi** în `permissionService`: `currentUserCan(p)`, `currentUserCanAny(ps)`, `currentUserCanAll(ps)`. Se bazează pe `authService.getCurrentUser()?.role` și pe aceeași matrice; fără sesiune validă întorc `false`. **Gărzi în servicii** pe toate metodele de modificare: `reportService` (moderate / resolve / reply), `announcementService`, `directoryService` (19 metode), `quickDialService` (10), `surveyService`. La refuz nu se modifică nimic, iar metoda întoarce `false` / `null` / `{success:false}`. **Extindere de scop, semnalată:** gărzile acoperă toate metodele de modificare, nu doar cele listate inițial. Unele metode `void` întorc acum `boolean`, iar metodele `add*` întorc `T | null`. |
| P3 | Tab-ul „Evidență Locală” a fost **eliminat** din `IssuesView` (zona publică nu mai apelează `getAllReports()`). Pagina `#sesizari` are acum doar formularul și confirmarea. |
| P4 | **`PublicMapReport` redus:** fără `id` tehnic și fără `photo.name`. Câmpuri rămase: `referenceNumber`, `categoryId`, `categoryName`, `publicDescription`, `publicLocation`, `photo{dataUrl,size,compressionRatio}`, `createdAt`, `isAnonymous`. |
| P5 | **`announcementService.getPublicById(id)`** întoarce comunicatul doar dacă e publicat și neexpirat. Este folosit în `AnnouncementsView`. `getById()` a rămas în serviciu, dar în prezent nu are apelanți (auditul general, A-24). |
| P6 | **Gărzi în Admin:** `AdminReportsModeration` și `AdminAnnouncementsManager` verifică permisiunea pe fiecare acțiune și rezultatul serviciului. Afișează un banner de refuz `role="alert"`, iar succesul apare doar dacă serviciul acceptă operația. |
| — | **`submitReport` și `submitVote` rămân operații publice**, fără gardă, intenționat. |
| — | `ROLE_PERMISSIONS` **neschimbat**. În `permissionService` s-a modificat doar importul și s-au adăugat helper-ele. |

### 6.6: Asumare / preluare sesizare (C6, M7 / `6A-MOD-08`), commit `83b77ad`
| Element | Implementare |
|---|---|
| Model | `CivicReport.assigneeIds?: string[]` (responsabili individuali curenți) și `cityHallTakenOver?: boolean` (preluarea instituțională); doar starea curentă, fără istoric; câmpurile lipsă = fără responsabili / nepreluată |
| Roluri | `super_admin`: asumare individuală și retragerea propriei asumări. `primarie_operator`: preluare instituțională („Preia de către Primărie”), fără asumare individuală și fără renunțare |
| Prioritate | preluarea Primăriei are prioritate; nu poate fi retrasă și nu e dublată de un al doilea operator |
| Stadiu | asumare/preluare pe o sesizare `new` → `in_progress`; retragerea nu schimbă stadiul; `resolved`/`closed` neatinse |
| Securitate | gărzi în `reportService` (`reports.resolve` + rolul Primăriei din `permissionService`); salvare tranzacțională; `ROLE_PERMISSIONS` neschimbat; ID unic per cont Admin (`usr-operator-02` pentru al doilea operator) |
| Harta publică | nu afișează responsabilul, preluarea sau stadiul; `PublicMapReport` fără câmpuri de flux intern și fără datele cetățeanului |
| Sesizări `private` | opțiunea „Nu doresc afișarea publică” eliminată; sesizările aprobate (inclusiv cele istorice `private`) apar pe hartă, anonim |
| Admin | blocul „Asumare / Preluare” în cardul sesizării; datele de contact ale cetățeanului rămân vizibile ambelor roluri |

---

## E. REZULTATELE TESTELOR

### E.1 Valori finale (rulate înainte de commit-ul `d89fd1c`)
| Suită | Rezultat |
|---|---|
| 6.2: cota de stocare | **17/17 PASS** |
| 6.3: XSS pe hartă | **11/11 PASS** |
| 6.4: autentificare | **17/17 PASS** |
| 6.5: autorizare și date expuse | **19/19 PASS** (inclusiv 3 roluri × 24 de operații, conforme cu matricea; la refuz `localStorage` rămâne identic byte cu byte) |

### E.2 Verificări tehnice
| Verificare | Rezultat |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | exit 0 (avertisment de dimensiune a chunk-ului, preexistent, m14) |
| `git diff --check` | exit 0 |
| `git fsck --full --strict` | exit 0 |
| Clonă separată de pe GitHub | HEAD `d89fd1c`; conținut identic cu working tree-ul local |

### E.3 Regresie și limitări cunoscute
- Suita de regresie a Etapei 6 (13 scenarii): **61 PASS, 1 PARTIAL, 1 FAIL, 2 ERROR. Nicio regresie nouă.**
  - **FAIL: `6D-SES-01`.** O sesiune falsificată cu structură validă dă acces Admin. Aceasta este o **limitare arhitecturală cauzată de lipsa backend-ului**, nu o regresie.
  - **PARTIAL: `6A-MOD-08`.** Nu există „preluare/asumare” (responsabil desemnat), cerința M7; neschimbat la finalul 6.5. **Actualizare 6.6: decis și implementat** (vezi D, 6.6).
  - **ERROR: `sec_delete` și `sec_demo`.** Sunt scenarii de test învechite, care apasă butoane eliminate intenționat în 6.1 și 6.4. Aspectele lor sunt acoperite de suitele 6.1 și 6.4.
  - `6D-PRV-01` și `6D-PRV-02`, FAIL în auditul Etapei 6, trec acum datorită P3.
- **Actualizare P0 post-audit (D12 = A):** suitele de test sunt acum în repository, în `tests/` (vezi `tests/README.md`); rulare: `python3 tests/run_all.py`. Scripturile originale ale Etapei 6 (`e6_main.py` … `e65_verify.py`) nu au fost recuperate; regresia 6.1–6.5 din `tests/regression/` este o rescriere compactă.
  - server Vite dev plus import de module reale (`await import('/src/services/x.ts')`, aceeași instanță singleton);
  - build de producție servit cu `vite preview` pentru testele UI.

---

## F. ARHITECTURA DE SECURITATE ACTUALĂ

### F.1 Ce este implementat (protecție în frontend)
- Matricea de permisiuni centralizată (`permissionService`), aplicată în trei straturi: UI (butoane ascunse sau dezactivate), handlere (gardă în componentă) și **servicii** (gardă pe metoda de modificare, din 6.5).
- Validarea structurii sesiunii (6.4); rol necunoscut → niciun modul accesibil (fail-safe).
- Escaparea HTML și validarea sursei imaginilor pe hartă (6.3).
- Reducerea datelor publice: fără listă publică de sesizări, `PublicMapReport` minim, `getPublicById` (6.5).
- Nu există cale de ștergere a sesizărilor (6.1).

**Aceste protecții opresc greșelile, folosirea accidentală și accesul prin interfață.**

### F.2 Ce NU există (autorizare reală, pe server)
Tot codul rulează în browserul utilizatorului. Prin urmare:
- **Sesiunea poate fi falsificată:** un obiect JSON cu structură validă scris în `localStorage` dă acces (6D-SES-01).
- **Parolele există în bundle:** credențialele sunt hardcodate în `authService.ts` și se pot citi din JavaScript-ul livrat.
- **`localStorage` poate fi modificat direct** din DevTools, ocolind orice serviciu.
- **Orice gardă din frontend poate fi ocolită** de un utilizator cu DevTools.
- **Datele nu sunt centralizate:** fiecare browser are propria copie, iar Primăria nu vede sesizările trimise din alt browser.

> **Aceste protecții NU trebuie prezentate ca securitate server-side.** Pentru o utilizare reală (pilot cu cetățeni sau date reale) este necesar un backend, cu autentificare pe server, token semnat, autorizare pe fiecare operație și bază de date. Introducerea unui backend este o **decizie de produs și de arhitectură**, nedecisă.

---

## G. PROBLEME ȘI LIMITĂRI RĂMASE (la finalul 6.5)

### G.1 Arhitecturale și de securitate
| Cod | Problemă | Stare |
|---|---|---|
| — | Lipsa backend-ului (autentificare, autorizare, date centralizate) | nedecis, decizie de arhitectură |
| M1 / S4 / `6D-SES-01` / P7 | Sesiunea Admin se poate falsifica din `localStorage` | **FAIL, nerezolvat** (P7 a fost exclus explicit din 6.5; descrierea din raportul 6.5 este în G.4) |
| M2 / S5 | Credențiale hardcodate în bundle | nerezolvat; necesită backend |
| m3 / S9 / `6D-SES-03` | Sesiunea nu expiră (persistă și în `localStorage`) | PARTIAL, nerezolvat |
| S10 | Jurnalul de e-mail salvează local datele de contact ale cetățeanului | nerezolvat |
| — | Mesaje de refuz în UI doar în Moderare și Comunicate (P6). Ghidul, Apel rapid și Sondaje primesc `false`/`null` de la servicii, dar nu afișează un mesaj de refuz. Operatorul nu are acolo butoane de modificare. | limitare cunoscută |

### G.2 Funcționale și de calitate (din auditul Etapei 6, încă deschise)
| Cod | Problemă |
|---|---|
| M5 | **Rezolvat în P0 post-audit (A-05):** `surveyService.getAllSurveys()` acceptă doar o listă și ignoră elementele care nu sunt obiecte; `#sondaje` nu mai rămâne albă la date corupte. Error boundary general nu există în continuare. |
| M6 | **Rezolvat în P0 post-audit (A-06):** footer-ul spune că trimiterea automată pe e-mail nu este activă în această versiune. În același P0: nota de pe login (A-07) și textul din Admin Moderare (A-08) au fost corectate. |
| M7 / `6A-MOD-08` | **DECIS / IMPLEMENTAT în 6.6:** asumare individuală `super_admin`, preluare instituțională a Primăriei (prioritară, fără retragere), fără afișare publică (vezi D, 6.6). Limitare: fără backend, starea nu e sincronizată între browsere |
| m1 | Eșecul notificării e-mail nu e vizibil în interfață |
| m4–m7 | Probleme de interfață: bannerul hărții peste butoanele de zoom, ținte tactile sub 44 px, taburile Admin pe telefon, etichete de etapă învechite vizibile public |
| m8, m9 | Culorile categoriilor pe hartă nu corespund ID-urilor reale; `rep-seed-003` are `categoryId: 'spatii-verzi'` |
| m10 | „Public” și „Public anonim” se afișează identic pe hartă: **intenționat din 6.6** (N1 închis: ambele publice, fără identitatea autorului) |
| m11, m12 | m11 depășit: formularul validează e-mailul și în cod (expresie regulată). m12 rămâne: butonul „Trimite” e activ în timpul compresiei |
| m13 | Ștergerea unui sondaj sau „Reset Demo” lasă submisii orfane |
| m14 | Bundle unic de aproximativ 755 KB |
| m15 | Dependențe moarte; `npm ci` poate eșua fără `--legacy-peer-deps` |
| m16 | Imagini demo de pe Unsplash |
| m17 | **Parțial rezolvat în P0 post-audit (D12 = A):** suitele sunt în `tests/` (servicii, UI, robustețe, suprafețe publice, regresie) și rulează cu `python3 tests/run_all.py`; vezi `tests/README.md`. Nu există încă un framework de teste integrat în `npm`. |

m2 (permisiunile per acțiune în Moderare și Comunicate) a fost **rezolvat** prin P6.

### G.3 Neclarități de produs din Etapa 6.5: N1–N4
Sursa: raportul original al Etapei 6.5, secțiunea „Neclarități de produs (nu le decid eu)”, furnizat de proprietarul proiectului. Instrucțiunea din 6.5 a fost „NU lua decizii pentru N1–N4”. Formularea de mai jos este cea din raport.

| Cod | Formularea din raportul 6.5 | Stare actuală |
|---|---|---|
| **N1** | `isAnonymous`: „Public” și „Public anonim” se comportă identic. Trebuie afișat numele la varianta „Public”, sau se renunță la una dintre opțiuni? | **ÎNCHIS în 6.6** (decizia proprietarului): ambele variante sunt publice și nu expun identitatea autorului; identitatea și datele de contact nu sunt niciodată în proiecția publică |
| **N2** | Rezultatele sondajelor sunt vizibile în timpul consultării (butonul „Rezultate”), deși textul spune „la finalizare”. Care variantă este corectă? | **DESCHIS**, decizie de produs a proprietarului |
| **N3** | `announcementService.setStatus` servește și la publicare, și la dezactivare. O gardă în serviciu trebuie să aleagă permisiunea după starea țintă. | **CLARIFICAT TEHNIC în 6.5** (P1/P2): `setStatus` verifică permisiunea după starea țintă (`published` → `announcements.publish`; altfel `announcements.disable`). Nu mai este o problemă tehnică nerezolvată; se păstrează aici pentru a documenta originea ca neclaritate N3. |
| **N4** | Trebuie ca `resetToDemo` să existe în versiunea de producție? | **DESCHIS**, decizie de produs a proprietarului |

- Pentru N2 și N4 documentația **nu propune o soluție și nu alege o variantă**. Întrebările așteaptă decizia proprietarului produsului.
- N1–N4 sunt distincte de P7 (G.4). P7 este o limitare de arhitectură, nu o neclaritate de produs.

### G.4 P7: sesiune client-side falsificabilă (`6D-SES-01`)
Sursa: fragmentul final recuperat al raportului de execuție al Etapei 6.5, furnizat de proprietarul proiectului. P7 nu mai este un punct cu text nerecuperat; raportul 6.5 îl identifică astfel:
- **P7 este asociat cu `6D-SES-01`**, care a rămas **FAIL** după 6.5.
- **`6D-SES-01` = sesiune client-side falsificabilă:** o sesiune JSON validă structural poate fi introdusă manual în `localStorage` și este acceptată.
- **Validarea din 6.4** (`isValidSessionUser`, `VALID_ROLES`) verifică **structura** sesiunii, **nu autenticitatea** ei.
- **Fără backend, autorizarea reală nu poate fi garantată:** gărzile din frontend pot fi ocolite.
- **P1/P2** (helper-ele `currentUserCan*` și gărzile din servicii) sunt **protecții în frontend** și **nu înlocuiesc autorizarea server-side**.
- **P7 rămâne nerezolvat.** Remedierea reală necesită o arhitectură cu backend. Aceasta este o **decizie de arhitectură / produs** nedecisă (vezi F.2); documentul de față nu propune o soluție.

### G.5 Decizii post-audit (D1–D12)
Auditul general a formulat deciziile D1–D12; proprietarul le-a luat pe toate. Instrucțiunea P0 transmite explicit doar valorile de mai jos.

| Decizie | Valoare | Efect |
|---|---|---|
| D9 | **A** | notificările către cetățean la evenimentele relevante (preluare, schimbare de stadiu, rezolvare, răspuns) sunt aprobate; se implementează în etapa din backlog, nu în P0 |
| D10 | **A** | datele demo se păstrează pentru MVP: marcajele `[DEMO]`, contul `demo@`, datele demo existente |
| D11 | **B** | zona publică nu conține linkuri către Admin; ruta `#admin` rămâne, cu acces direct |
| D12 | **A** | testele se păstrează permanent în repository, în `tests/` |
| D1–D8 | luate | **valorile nu au fost transmise**; nu se presupun (inclusiv D1 = MVP demonstrativ / pilot, D2 = Master Plan, D3 = N2, D4 = N4) |

---

## H. CE NU TREBUIE MODIFICAT FĂRĂ DECIZIE EXPLICITĂ

| Element | De ce | Tip de decizie |
|---|---|---|
| `ROLE_PERMISSIONS` și lista de 24 de permisiuni | decizia 5D confirmată | **decizie de produs** |
| `submitReport` (public, tranzacțional din 6.2) | operație publică; protecția 6.2 | decizie de produs + tehnică |
| `submitVote` (public) | operație publică | decizie de produs |
| Mecanismul 6.1 (fără `deleteReport`, contorul TM nu scade) | regula „Primăria NU șterge sesizări” | **decizie de produs** |
| Protecțiile 6.2 (salvare tranzacțională, reconcilierea contorului, formular păstrat) | previn pierderea de date și numerele duplicate | tehnică, cu retestare |
| Protecția XSS 6.3 (`escapeHtml`, `getSafeImageSrc`) | securitatea hărții publice | tehnică, cu retestare |
| Autentificarea 6.4 (fără DEMO 1-click, validarea sesiunii) | securitatea login-ului | tehnică + produs |
| Gărzile 6.5 din servicii și UI | autorizare consecventă | tehnică, cu retestare |
| Arhitectura actuală (frontend + `localStorage`) | introducerea unui backend schimbă totul | **decizie de arhitectură / produs** |
| Cheile `localStorage` (A.6) | schimbarea lor pierde datele existente | decizie tehnică, cu migrare |
| Schemele de date (`src/types/*.ts`: `CivicReport`, `Announcement`, `Survey` etc.) | compatibilitate cu datele salvate | decizie tehnică + produs |
| `SimulatedEmailTransportAdapter` | nu trebuie să raporteze niciodată `sent` | tehnică |
| N2, N4 (G.3) | decise post-audit ca D3 / D4; valorile nu au fost transmise (G.5) | **decizie de produs** |
| Regulile de asumare/preluare 6.6 (M7) | decise și implementate | **decizie de produs** (nu se schimbă fără decizie nouă) |
| P7 (`6D-SES-01`) | nerezolvat; remedierea reală cere backend (G.4) | **decizie de arhitectură / produs** |
| `main` | nu se atinge | regulă de proiect |

---

## I. PUNCTUL EXACT DE CONTINUARE

> **ETAPA 6 ESTE ÎNCHISĂ.** Etapele 6.1–6.6 sunt finalizate; Etapa 6.6 este comisă și publicată (`83b77ad`). **Nu există Etapa 6.7.** A urmat auditul general al proiectului, cu deciziile post-audit D1–D12 (G.5) și remedierea **P0** (A-27, A-05, A-06, A-07, A-08, D11-B, D12-A). **P1 nu este început**; următoarea direcție este Etapa 7 (7A–7F), la instrucțiunea proprietarului.

Starea de pornire consemnată anterior (finalul 6.5) rămâne mai jos pentru referință. Noul chat:
1. citește acest document, `PROJECT_RULES_AND_DECISIONS.md` și `ETAPA_6_STATUS_FINAL.md`;
2. verifică starea Git (B.4): commit-ul de handoff ca HEAD, `d89fd1c` imediat sub el (ultimul commit de cod) și `main` la `d9bc2c9`;
3. rulează `npx tsc --noEmit` și `npm run build`;
4. confirmă înțelegerea stării și **așteaptă instrucțiunile** proprietarului (salvarea remedierii P0 dacă nu e comisă; apoi P1 / Etapa 7);
5. ține cont că N2 și N4 așteaptă decizia proprietarului, N3 este clarificat tehnic, iar N1 este închis (G.3); P7 este descris în G.4.
