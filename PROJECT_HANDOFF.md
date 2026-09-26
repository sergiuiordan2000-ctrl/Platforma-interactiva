# PROJECT_HANDOFF.md — Turnu Măgurele Civic

**Generat:** 26 septembrie 2026, pe baza inspecției directe a repository-ului curent (cod, `git log`, `git status`, `package.json`, configurație, toate serviciile, toate componentele Admin, rutarea, tipurile de date) — NU pe baza rezumatului conversației anterioare. Unde ceva nu a putut fi confirmat direct din repo, este marcat explicit `NEVERIFICAT` sau `NECUNOSCUT`.

---

## 1. IDENTITATEA PROIECTULUI

- **Nume:** Turnu Măgurele Civic (`<title>Turnu Măgurele Civic</title>` în `index.html`; `package.json.name` este generic: `"react-example"` — moștenit din boilerplate-ul AI Studio, nu a fost redenumit).
- **Scop:** platformă civică digitală **independentă** (nu oficială, nu operată de Primărie) pentru municipiul Turnu Măgurele — informare publică, comunicate/evenimente, sesizări cetățenești georeferențiate pe hartă, consultări publice (sondaje) și un ghid al instituției (Primăria).
- **Descriere foarte scurtă:** un SPA React, 100% client-side, care simulează un CMS civic complet funcțional, cu o zonă publică (cetățean) și o zonă de administrare (Primărie), fără backend real.
- **Utilizatori principali:**
  - Cetățenii municipiului (zona publică, neautentificată).
  - Personalul Primăriei, cu două roluri: `super_admin` (acces complet) și `primarie_operator` (acces operațional limitat).
- **Stadiul actual:** Etapele 1–5 (5B–5G) sunt implementate funcțional. Etapa 5 a fost auditată transversal (vezi Secțiunea 13) cu **verdict FAIL** din cauza unui defect de securitate critic, preexistent (ștergere publică neautentificată a sesizărilor).
- **Ce reprezintă MVP-ul:** un prototip complet funcțional, dar **exclusiv client-side** — fără server propriu, fără bază de date centralizată, fără autentificare reală, fără trimitere reală de e-mail. Toată persistența este `localStorage`/`sessionStorage` în browserul utilizatorului curent.

---

## 2. STAREA EXACTĂ A PROIECTULUI

| Aspect | Stare |
|---|---|
| Ultima etapă cu cod implementat | Etapa 5 (5B–5G), conform mesajului ultimului commit (`checkpoint: Etapele 5B-5G finalizate`) |
| Ultima etapă auditată integral, transversal | Etapa 5 (5B–5G), 26.09.2026 — vezi `RAPORT_AUDIT_FINAL_ETAPA_5.md` |
| **PASS** (confirmat prin cod + test real în browser) | 5B (Comunicate), 5D (diferențiere roluri Ghidul Primăriei — guard UI+handler), 5E (e-mail simulat, niciodată raportat ca trimis), 5F (sursă unică de permisiuni), 5G (izolare roluri, acces direct blocat), și partea din 5C limitată la comportamentul rolului `primarie_operator` **în interiorul panoului Admin** (fără cale de ștergere) |
| **FAIL** | Constatarea transversală 5C: există o cale de ștergere fizică a sesizărilor, **publică și neautentificată** (nu doar limitată la `primarie_operator`), în `src/views/IssuesView.tsx` → `reportService.deleteReport()`. Vezi Secțiunea 13.2. |
| **PARTIAL** | Niciun element nou marcat `PARTIAL` la acest audit (Etapa 5D, singurul `PARTIAL` cunoscut dintr-un audit anterior al Etapei 5, a fost închis explicit prin implementarea rolului `primarie_operator`) |
| **NEVERIFICAT** | Nu există un fișier „Master Plan" persistat în repo (vezi Secțiunea 3) — succesiunea etapelor este reconstituită din numele fișierelor `RAPORT_AUDIT_ETAPA_*.md` existente și din mesajele de commit, nu dintr-un document oficial de plan. Conținutul complet al rapoartelor 1B–4E nu a fost recitit exhaustiv în acest handoff (au fost doar listate ca existente) — un agent nou care are nevoie de detalii din Etapele 1–4 ar trebui să le citească direct. |
| Următoarea etapă care TREBUIE executată | **Decizie explicită asupra vulnerabilității din Secțiunea 13.2**, apoi remediere (recomandat) înainte de a continua cu `ETAPA 6A — TESTARE FUNCȚIONALĂ` sau orice altă etapă nouă. NU s-a decis încă remedierea — vezi Secțiunea 20 (NEXT STEP). |

**Nu s-a declarat nicio etapă `PASS` doar pe baza unui raport vechi** — toate verdictele din tabelul de mai sus provin din verificarea directă a codului curent și/sau din rulare reală Playwright (26.09.2026).

---

## 3. MASTER PLAN — STARE PE ETAPE

**NEVERIFICAT:** nu există un fișier unic de „Master Plan" în repository. Tabelul de mai jos este reconstituit din fișierele `RAPORT_AUDIT_ETAPA_*.md` existente în rădăcina proiectului și din istoricul `git log`, NU dintr-un document de plan oficial confirmat.

| Etapă | Scop (dedus din numele raportului) | Status | Observații |
|---|---|---|---|
| 1B | NECUNOSCUT (raport prezent, neconsultat integral în acest handoff) | Raport prezent (`RAPORT_AUDIT_ETAPA_1B.md`) | Necitit exhaustiv aici |
| 1C | NECUNOSCUT | Raport prezent | Necitit exhaustiv aici |
| 2A | Probabil Ghidul Primăriei — date instituționale (bazat pe cod: `directoryService.ts`) | Raport prezent | Confirmat funcțional prin cod curent |
| 2B | Probabil Quick Dial (numere utile) | Raport prezent | Confirmat funcțional prin cod curent (`quickDialService.ts`) |
| 2C | Probabil autentificare Admin (client-side) | Raport prezent | Confirmat funcțional prin cod curent (`authService.ts`) |
| 3A | NECUNOSCUT (posibil bazele modulului Sesizări) | Raport prezent | — |
| 3B | Identificatori sesizări (format `TM-XXX`, contor secvențial) | Raport prezent | Confirmat prin cod (`reportService.ts`, comentarii explicite „ETAPA 3B") — **inclusiv artefactul de test `IssuesView.tsx` „Șterge (Test 6)"**, sursa vulnerabilității din Secțiunea 13.2 |
| 3C | Compresie/optimizare fotografii sesizări | Raport prezent | Confirmat prin cod (`imageCompressionService.ts`) |
| 3D | Harta sesizărilor (Leaflet) | Raport prezent | Confirmat prin cod (`MapView.tsx`) |
| 3E | Moderare + regulă de publicare pe hartă + confidențialitate | Raport prezent | Confirmat prin cod (`reportService.ts`, `AdminReportsModeration.tsx`) |
| 4A | Structura sondajelor | Raport prezent | Confirmat prin cod (`surveyService.ts`, `types/survey.ts`) |
| 4B | Administrare sondaje | Raport prezent | Confirmat prin cod (`AdminSurveysManager.tsx`) |
| 4C | Participare cetățean/vot | Raport prezent | Confirmat prin cod (`submitVote`, marker local anti-duplicare) |
| 4D | Calcul statistici sondaje | Raport prezent | Confirmat prin cod (`calculateSurveyStatistics`) |
| 4E | NECUNOSCUT (posibil finalizare/consolidare sondaje) | Raport prezent | — |
| 5A(.1/.2) | Dashboard Admin + shell separat pentru zona Admin | Fără raport `.md` propriu persistat | Confirmat prin cod și comentarii (`AdminDashboard.tsx`, comentariu „Etapa 5A-2" în `App.tsx`) |
| 5B | Comunicate & Evenimente (CRUD, publicare/dezactivare) | Fără raport `.md` propriu persistat | **PASS** — verificat în auditul final (26.09.2026) |
| 5C | Moderare sesizări + regulă de soluționare internă, independentă de moderare | Fără raport `.md` propriu persistat | **PASS parțial / FAIL transversal** — vezi Secțiunea 13.2 |
| 5D | Finalizarea sistemului de roluri (`primarie_operator` limitat, guard UI+handler) | Fără raport `.md` propriu persistat | **PASS** — verificat în auditul final |
| 5E | Flux e-mail (simulat, niciodată `sent`) | Fără raport `.md` propriu persistat | **PASS** — verificat în auditul final |
| 5F | Consolidare infrastructură (sursă unică de permisiuni, chei storage distincte) | Fără raport `.md` propriu persistat | **PASS** — verificat în auditul final |
| 5G | Roluri și permisiuni (matrice, izolare, acces direct blocat) | Fără raport `.md` propriu persistat | **PASS** — verificat în auditul final |
| **Audit Final Etapa 5** | Audit transversal 5B–5G | `RAPORT_AUDIT_FINAL_ETAPA_5.md` (nou, 26.09.2026) | **FAIL** — defect critic 13.2 |
| 6 | NECUNOSCUT — probabil „Testare Funcțională" (denumire menționată explicit ca sugestie pentru pasul următor, dar niciodată confirmată ca decizie de produs printr-un document persistat) | Neînceput | **NU a fost începută** — respectă instrucțiunea explicită |

**Discrepanță de proces notabilă:** rapoartele Etapelor 5B–5G nu au fost persistate individual ca fișiere `.md` (spre deosebire de toate etapele 1–4, care au fiecare un `RAPORT_AUDIT_ETAPA_X.md` propriu). Singurul document persistat pentru Etapa 5 este `RAPORT_AUDIT_FINAL_ETAPA_5.md`, creat abia la acest audit transversal.

---

## 4. ARHITECTURA TEHNICĂ

| Element | Detaliu | Fișier/Director |
|---|---|---|
| Framework UI | React 19.0.1 | `package.json` |
| Limbaj | TypeScript (strict prin `tsc --noEmit`, fără erori la acest audit) | `tsconfig.json` |
| Build system | Vite 8.3.1, plugin React + plugin Tailwind CSS 4 | `vite.config.ts` |
| Stilizare | Tailwind CSS 4 (`@tailwindcss/vite`) | `src/index.css`, clase inline în toate componentele |
| Routing | **Hash-based, manual, fără bibliotecă de routing** (`window.location.hash`, `switch` în `getViewFromHash()`) | `src/App.tsx` |
| Iconițe | `lucide-react` | folosit peste tot |
| Hartă | `leaflet` (+ `@types/leaflet`) — tile-uri OpenStreetMap publice | `src/views/MapView.tsx` |
| Animații | dependință `motion` (Framer Motion) prezentă în `package.json` | **NEVERIFICAT** — nu s-a confirmat utilizare activă extinsă în timpul acestui audit; prezentă ca dependință |
| Structura aplicației | SPA cu un singur punct de intrare (`src/main.tsx` → `App.tsx`), fără code-splitting (bundle unic ~772 kB) | — |
| Structura componentelor | Separare clară: `views/` (o vizualizare per rută), `components/<domeniu>/` (piese reutilizabile per modul), `components/admin/<domeniu>/` (componente Admin), `components/layout/` (shell public) | `src/` |
| Servicii | Model „singleton de serviciu": fiecare domeniu de date are un serviciu propriu, cu `init()`/`save()` și, majoritatea, `subscribe()` de tip pub-sub | `src/services/*.ts` |
| Modele de date | Interfețe TypeScript per domeniu | `src/types/*.ts` |
| Persistență | **`localStorage`/`sessionStorage` exclusiv, în browserul curent** — NU există bază de date centralizată, NU există sincronizare server-side între utilizatori/dispozitive diferite | vezi Secțiunea 8 |
| Autentificare | Client-side, credențiale hardcodate în cod sursă, sesiune persistată în `sessionStorage` + `localStorage` | `src/services/authService.ts` |
| Autorizare | Client-side, matrice de permisiuni centralizată | `src/services/permissionService.ts` |
| API-uri | **Niciunul** — nu există niciun apel de rețea către un API propriu | — |
| Backend | **Absent.** Dependințele `express`, `dotenv`, `@google/genai` există în `package.json`, dar **nu sunt folosite nicăieri în `src/`** (confirmat prin `grep` — 0 rezultate); sunt reziduuri ale boilerplate-ului „AI Studio" original (README.md menționează explicit „Run your AI Studio app", `.env.example` menționează `GEMINI_API_KEY`/`APP_URL`). Nu există `server.js` în repo (deși scriptul `clean` din `package.json` îl referă: `rm -rf dist server.js`) | `package.json`, `.env.example`, `README.md` |
| Servicii externe | Tile-uri hartă OpenStreetMap (`https://{s}.tile.openstreetmap.org/...`) — singura dependință de rețea externă reală în aplicație | `src/views/MapView.tsx` |
| Biblioteci importante | `react`, `react-dom`, `leaflet`, `lucide-react`, `tailwindcss`, `vite`, `typescript` | `package.json` |

---

## 5. STRUCTURA REPOSITORY-ULUI

```
turnu_magurele/
├── index.html                     — punct de intrare HTML, titlu/meta SEO
├── package.json                   — nume generic „react-example” (nemodificat)
├── vite.config.ts                 — config Vite + alias „@”
├── tsconfig.json                  — config TypeScript strict, noEmit
├── .env.example                   — variabile reziduale AI Studio (GEMINI_API_KEY, APP_URL) — NEFOLOSITE în cod
├── README.md                      — boilerplate original AI Studio (nemodificat pentru acest proiect)
├── RAPORT_AUDIT_ETAPA_*.md        — rapoarte de audit persistate pentru Etapele 1B–4E (18 fișiere)
├── RAPORT_AUDIT_FINAL_ETAPA_5.md  — audit transversal final Etapa 5 (nou, 26.09.2026)
├── ANALIZA_PROIECT_TURNU_MAGURELE.md, CHECKPOINT_ETAPA_3.md, RAPORT_VERIFICARE_ANONIMAT_SONDAJE_4C3.md — documente suplimentare de proces
├── PROJECT_HANDOFF.md             — acest document
├── dist/                          — output build (generat, nu sursă)
└── src/
    ├── main.tsx, App.tsx          — bootstrap + routing hash-based
    ├── index.css                  — stiluri globale Tailwind
    ├── types/                     — toate interfețele/tipurile de date (per domeniu)
    ├── data/                      — seed-uri demo (mockAnnouncements, mockDirectory, mockQuickDial, mockReportCategories, mockSurveys)
    ├── utils/                     — utilitare mici (dateFormatter)
    ├── services/                  — logica de business + persistență, per domeniu:
    │   ├── authService.ts             — autentificare + sesiune Admin
    │   ├── permissionService.ts       — SURSA UNICĂ de permisiuni/roluri
    │   ├── announcementService.ts     — Comunicate & Evenimente
    │   ├── reportService.ts           — Sesizări (inclusiv `deleteReport` — vezi 13.2)
    │   ├── emailService.ts            — generare + „trimitere” simulată e-mail
    │   ├── directoryService.ts        — Ghidul Primăriei (instituție, direcții, servicii, program, link-uri)
    │   ├── quickDialService.ts        — Quick Dial (contacte + categorii)
    │   ├── surveyService.ts           — Sondaje (CRUD, vot, statistici)
    │   └── imageCompressionService.ts — compresie foto în browser (Canvas)
    ├── views/                      — o vizualizare per rută publică/admin (HomeView, AnnouncementsView, IssuesView, MapView, SurveysView, DirectoryView, AdminView)
    └── components/
        ├── layout/                 — shell public (Header, Footer, BottomNavigation, AppLayout)
        ├── announcements/, directory/, quickdial/, report/, surveys/ — componente publice per modul
        └── admin/                  — componente exclusiv Admin:
            ├── AdminLoginForm.tsx, AdminDashboard.tsx
            ├── announcements/AdminAnnouncementsManager.tsx
            ├── directory/Admin{Institution,Departments,Services,Schedule,UsefulLinks}*.tsx
            ├── quickdial/Admin{QuickDial,Categories}Manager.tsx
            ├── reports/AdminReportsModeration.tsx
            └── surveys/Admin SurveysManager.tsx, SurveyFormModal.tsx, SurveyQuestionEditor.tsx
```

---

## 6. MODULELE FUNCȚIONALE

### 6.1 Zona Publică

| Modul | Scop | Componente principale | Servicii | Status | Limitări cunoscute | Fișiere principale |
|---|---|---|---|---|---|---|
| Acasă | Punct de intrare, highlight-uri (ultimul comunicat, alertă urgentă, eveniment) | `HomeView.tsx` | `announcementService` | PASS (regresie verificată) | — | `src/views/HomeView.tsx` |
| Comunicate & Evenimente | Listare/filtrare comunicate publicate, detaliu comunicat | `AnnouncementsView.tsx`, `AnnouncementCard/Detail/Filter/Badge.tsx` | `announcementService` | PASS | Doar comunicate `published` și neexpirate sunt vizibile | `src/views/AnnouncementsView.tsx`, `src/components/announcements/*` |
| Sesizări (depunere) | Formular public de sesizare cu foto (compresie automată) și geolocalizare opțională; alegere explicită a preferinței de publicare (`private`/`public`/`public_anonymous`, implicit `private`) | `ReportForm.tsx`, `ReportConfirmation.tsx` | `reportService`, `imageCompressionService`, `emailService` (indirect) | PASS pentru fluxul de depunere | **Conține un tab „Evidență Locală" (artefact Etapa 3B) cu buton de ȘTERGERE publică, neautentificată — vezi 13.2, defect CRITIC** | `src/views/IssuesView.tsx`, `src/components/report/*` |
| Hartă sesizări | Afișare pe hartă Leaflet a sesizărilor publice aprobate | `MapView.tsx` | `reportService.getPublicMapReports()` | PASS | **Mapare culori pe categorie (`CATEGORY_COLORS`) nealiniată complet cu ID-urile reale de categorie** — vezi Secțiunea 19 (bug minor, cade pe culoarea implicită) | `src/views/MapView.tsx` |
| Sondaje | Listare sondaje active, votare, vizualizare rezultate (dacă permis) | `SurveysView.tsx`, `PublicSurveysList.tsx`, `SurveyVotingModal.tsx`, `SurveyResultsModal.tsx` | `surveyService` | PASS (structural, confirmat prin cod) | Marker de participare doar local (`localStorage`) — NU este protecție anti-fraudă robustă (documentat explicit în cod) | `src/views/SurveysView.tsx`, `src/components/surveys/*` |
| Ghidul Primăriei | Date instituționale, direcții, servicii, program, link-uri utile, + Quick Dial ca sub-secțiune | `DirectoryView.tsx`, `ContactCard.tsx`, `DepartmentsList.tsx`, `ServicesList.tsx`, `UsefulLinksList.tsx`, `QuickDialView.tsx` | `directoryService`, `quickDialService` | PASS | Quick Dial NU are propria rută hash (`#quickdial` nu există în `App.tsx`) — este randat ca parte a `DirectoryView` | `src/views/DirectoryView.tsx`, `src/components/directory/*`, `src/components/quickdial/QuickDialView.tsx` |

### 6.2 Zona Admin

| Modul | Scop | Componente principale | Permisiuni necesare | Status | Fișiere principale |
|---|---|---|---|---|---|
| Autentificare Admin | Login cu 3 seturi de credențiale hardcodate | `AdminLoginForm.tsx` | — | PASS | `src/components/admin/AdminLoginForm.tsx`, `src/services/authService.ts` |
| Dashboard | Ecran de start Admin, carduri de navigare filtrate după permisiuni | `AdminDashboard.tsx` | `dashboard.view` (+ per-modul pentru afișarea cardului) | PASS | `src/components/admin/AdminDashboard.tsx` |
| Comunicate | CRUD complet, publicare/dezactivare (fără ștergere fizică — nu există metodă `delete` în serviciu) | `AdminAnnouncementsManager.tsx` | `announcements.*` | PASS | `src/components/admin/announcements/AdminAnnouncementsManager.tsx` |
| Ghidul Primăriei (Admin) | Editare date instituție, CRUD direcții/servicii/program/link-uri | `AdminInstitutionForm.tsx`, `AdminDepartmentsManager.tsx`, `AdminServicesManager.tsx`, `AdminScheduleManager.tsx`, `AdminUsefulLinksManager.tsx` | `directory.*` (doar `super_admin` are permisiunile de editare; `primarie_operator` are doar `directory.view`) | PASS | `src/components/admin/directory/*` |
| Quick Dial (Admin) | CRUD contacte + categorii | `AdminQuickDialManager.tsx`, `AdminCategoriesManager.tsx` | `quickDial.*` (doar `super_admin` are `.manage`; `primarie_operator` are doar `quickDial.view`) | PASS | `src/components/admin/quickdial/*` |
| Moderare Sesizări | Aprobare/respingere publicare, stadiu soluționare intern, răspunsuri administrative | `AdminReportsModeration.tsx` | `reports.*` (identice pentru ambele roluri) | PASS pentru fluxul din Admin; **FAIL transversal din cauza căii publice de ștergere din afara Admin-ului** | `src/components/admin/reports/AdminReportsModeration.tsx` |
| Sondaje (Admin) | CRUD sondaje, activare/închidere, ștergere (gated conservator prin `create`/`edit`) | `AdminSurveysManager.tsx`, `SurveyFormModal.tsx`, `SurveyQuestionEditor.tsx` | `surveys.*` (doar `super_admin` are permisiuni de modificare; `primarie_operator` are doar `surveys.view`) | PASS | `src/components/admin/surveys/*` |

---

## 7. AUTENTIFICARE ȘI AUTORIZARE

### Autentificare
- **Mecanism:** funcție sincronă `authService.login(email, password)` care compară cu **3 seturi de credențiale hardcodate în cod sursă** (nu sunt secrete reale, sunt vizibile în cod și în UI ca „credențiale DEMO"):
  - `admin@turnumagurele.ro` / `AdminTurnu2026!` → rol `super_admin`
  - `operator@turnumagurele.ro` / `OperatorTurnu2026!` → rol `primarie_operator`
  - `demo@turnumagurele.ro` / `demo1234` → rol `primarie_operator`
- **Unde:** `src/services/authService.ts`.
- **Sesiune:** obiect `AdminUser` serializat JSON, salvat ATÂT în `sessionStorage` CÂT ȘI în `localStorage`, sub cheia `turnu_civic_admin_session`.
- **Roluri existente:** exact două — `super_admin`, `primarie_operator`. Niciun alt rol nu există în tipul `AdminRole`.

### Autorizare
- **Sursă unică:** `src/services/permissionService.ts` — 24 de permisiuni (`Permission`, tip literal), niciodată extinse dinamic.
- **Verificare:** `hasPermission(role, permission)` / `hasAnyPermission(role, permissions[])` — fail-safe: rol lipsă/necunoscut → `false`, niciodată acces implicit.
- **Pattern de gating, aplicat consecvent:** fiecare componentă Admin primește `currentUser`, calculează un boolean via `permissionService`, ascunde/dezactivează UI-ul condiționat de acel boolean, ȘI adaugă un guard `if (!canX) return;` la începutul fiecărui handler de mutație (apărare pe două niveluri, verificat empiric prin manipulare forțată a DOM-ului în Etapa 5D).
- **Matricea curentă completă** (24 permisiuni, verificată direct din `permissionService.ts`):

| # | Permisiune | `super_admin` | `primarie_operator` |
|---|---|---|---|
| 1 | `dashboard.view` | DA | DA |
| 2 | `announcements.view` | DA | DA |
| 3 | `announcements.create` | DA | DA |
| 4 | `announcements.edit` | DA | DA |
| 5 | `announcements.publish` | DA | DA |
| 6 | `announcements.disable` | DA | DA |
| 7 | `reports.view` | DA | DA |
| 8 | `reports.moderate` | DA | DA |
| 9 | `reports.resolve` | DA | DA |
| 10 | `reports.reply` | DA | DA |
| 11 | `directory.view` | DA | DA |
| 12 | `directory.institution.edit` | DA | **NU** |
| 13 | `directory.departments.manage` | DA | **NU** |
| 14 | `directory.services.manage` | DA | **NU** |
| 15 | `directory.schedule.manage` | DA | **NU** |
| 16 | `directory.links.manage` | DA | **NU** |
| 17 | `quickDial.view` | DA | DA |
| 18 | `quickDial.contacts.manage` | DA | **NU** |
| 19 | `quickDial.categories.manage` | DA | **NU** |
| 20 | `surveys.view` | DA | DA |
| 21 | `surveys.create` | DA | **NU** |
| 22 | `surveys.edit` | DA | **NU** |
| 23 | `surveys.activate` | DA | **NU** |
| 24 | `surveys.close` | DA | **NU** |

**`primarie_operator` — exact ce poate și ce NU poate (verificat direct din cod, fără interpretare/extindere):**
- **Poate vedea:** Dashboard, Comunicate, Sesizări, Ghidul Primăriei (doar vizualizare), Quick Dial (doar vizualizare), Sondaje (doar vizualizare).
- **Poate crea:** Comunicate noi (`announcements.create`).
- **Poate modifica:** Comunicate existente (`announcements.edit`).
- **Poate publica:** Comunicate (`announcements.publish`).
- **Poate dezactiva:** Comunicate (`announcements.disable`).
- **Poate modera:** Sesizări — aprobare/respingere publicare (`reports.moderate`), schimbare stadiu soluționare (`reports.resolve`).
- **Poate răspunde:** intern, la sesizări (`reports.reply`).
- **NU poate administra:** Direcții/Departamente, Servicii, Program & Audiențe, Link-uri Utile ale Ghidului Primăriei; Contacte și Categorii Quick Dial; crearea/editarea/activarea/închiderea Sondajelor.
- **NU poate șterge sesizările** — confirmat: nu există niciun buton sau handler de ștergere accesibil rolului `primarie_operator` **în interiorul panoului de administrare** (`AdminReportsModeration.tsx` nu conține nicio metodă de ștergere). **IMPORTANT — vezi Secțiunea 13.2:** există totuși o cale de ștergere a sesizărilor complet în afara sistemului de roluri, accesibilă public fără autentificare, printr-un artefact de test preexistent (`IssuesView.tsx`, Etapa 3B) — aceasta NU este o breșă în sistemul de roluri, ci o funcționalitate publică negardată, complet separată arhitectural de `permissionService`/`authService`.

**Nu s-a interpretat sau extins matricea față de implementarea reală verificată.**

---

## 8. DATE ȘI PERSISTENȚĂ

**Toată persistența aplicației este LOCALĂ (browser curent) — NIMIC nu este CENTRALIZAT.**

| Domeniu | Cheie `localStorage` | Tip |
|---|---|---|
| Sesiune Admin | `turnu_civic_admin_session` (și în `sessionStorage`) | LOCAL |
| Comunicate | `turnu_civic_announcements` | LOCAL |
| Sesizări | `turnu_civic_reports_store` | LOCAL |
| Contor secvențial sesizări (`TM-XXX`) | `turnu_civic_reports_counter` | LOCAL |
| Jurnal e-mail | `turnu_civic_email_log_store` (max 500 intrări) | LOCAL |
| Ghidul Primăriei | `turnu_civic_city_hall_directory` | LOCAL |
| Quick Dial — contacte | `turnu_civic_quickdial_contacts` | LOCAL |
| Quick Dial — categorii | `turnu_civic_quickdial_categories` | LOCAL |
| Sondaje | `turnu_civic_surveys_store` | LOCAL |
| Submisii sondaje | `turnu_civic_survey_submissions_store` | LOCAL |
| Participare locală sondaje | `turnu_civic_user_participated_surveys` | LOCAL |

**Toate cheile sunt distincte, fără coliziuni** (verificat prin `grep` în auditul anterior).

- **Backend/bază de date:** **NEIMPLEMENTAT.** Nu există niciun server, niciun API, nicio bază de date reală.
- **Date demo/seed-uri:** fiecare serviciu are un set demonstrativ inițial în `src/data/mock*.ts`, încărcat automat la prima rulare dacă `localStorage` este gol; fiecare serviciu expune `resetToDemo()`.
- **Diferențiere REAL vs SIMULAT vs LOCAL:**
  - **LOCAL, nu CENTRALIZAT:** toate cele 11 chei de mai sus.
  - **SIMULAT:** trimiterea de e-mail (`emailService` — statusul `simulated`, niciodată `sent`).
  - **REAL:** afișarea tile-urilor de hartă OpenStreetMap (singura conexiune de rețea reală a aplicației).
  - **NEIMPLEMENTAT:** orice formă de backend, bază de date centralizată, autentificare server-side, trimitere reală de e-mail.

---

## 9. FLUXURI IMPORTANTE

1. **Autentificare Admin:** `AdminLoginForm` → `authService.login()` → verificare hardcodată → `AdminUser` salvat în `sessionStorage`+`localStorage` → `AdminView` randează shell-ul autorizat pe baza `permissionService`.
2. **Publicare Comunicat:** `AdminAnnouncementsManager` (create/edit form) → `announcementService.create()`/`update()` → `status` implicit `'published'` → vizibil imediat pe `AnnouncementsView` public (filtrat prin `isVisiblePublicly()` = published ȘI neexpirat).
3. **Transmitere Sesizare:** `ReportForm` (categorie, descriere, locație manuală/GPS via `navigator.geolocation`, foto opționale comprimate via `imageCompressionService`, preferință de publicare) → `reportService.submitReport()` → alocă `id` tehnic + `referenceNumber` (`TM-XXX`, secvențial, niciodată refolosit) → salvează → `moderationStatus: 'pending'` → declanșează **neblocant** `emailService.notifyNewReport()` (izolat prin try/catch, nu afectează sesizarea deja salvată).
4. **Preluare/gestionare Sesizare de către Primărie:** `AdminReportsModeration` → operator/admin caută sesizarea → `updateModerationStatus()` (approve/reject/pending) și, independent, `updateResolutionStatus()` (new/in_progress/resolved/closed) și `addResponse()` (istoric, niciodată suprascris). O sesizare apare pe harta publică doar dacă `publicationPreference !== 'private'` ȘI `moderationStatus === 'approved'` ȘI are coordonate valide (`reportService.isPubliclyVisible()`).
5. **Sondaje:** Admin creează/editează (`surveyService.upsertSurvey()`, validare structurală obligatorie) → activează (`updateSurveyStatus('active')`, re-validare) → cetățean votează (`submitVote()` — verifică eligibilitate temporală, marker local anti-duplicare, validează răspunsurile) → statistici calculate on-the-fly (`calculateSurveyStatistics()`), fără expunerea răspunsurilor text brute.
6. **Ghid:** Admin editează date instituție/direcții/servicii/program/link-uri prin `directoryService`; publicul vede doar elementele `isActive !== false`, sortate după `order`.
7. **Quick Dial:** similar cu Ghidul — CRUD Admin prin `quickDialService`, public vede doar contactele/categoriile active.
8. **Hartă:** `MapView` se abonează la `reportService`, randează markeri Leaflet doar pentru sesizările întoarse de `getPublicMapReports()` (deja filtrate și „curățate" de date personale prin `toPublicMapReport()`).
9. **E-mail:** vezi Secțiunea 10.
10. **Notificări:** **NEIMPLEMENTAT** — nu există niciun sistem de notificări push/in-app dincolo de un `toast` local (`showToast` în `AdminView`, doar client-side, doar în sesiunea curentă).

---

## 10. EMAIL ȘI INTEGRĂRI EXTERNE

| Integrare | Scop | Furnizor | Fișier | Endpoint/mecanism | Real sau simulat | Limitări | Ce trebuie schimbat pentru producție |
|---|---|---|---|---|---|---|---|
| E-mail notificare sesizare | Notifică registratura instituției + confirmare cetățean | Niciunul (simulat) | `src/services/emailService.ts`, `src/types/email.ts` | `SimulatedEmailTransportAdapter.send()` — `await setTimeout(60ms)`, întoarce mereu `{status: 'simulated'}`, NU contactează rețeaua | **SIMULAT** — documentat explicit în cod, NICIODATĂ raportat ca `sent` | Nu există sursă de adevăr pentru un transport real (SMTP/API furnizor); adaptorul e proiectat să fie înlocuibil (`EmailTransportAdapter` interface) fără a schimba restul serviciului |
| Hartă (tile-uri) | Afișare hartă municipiu | OpenStreetMap (public, gratuit) | `src/views/MapView.tsx` | `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` | **REAL** (singura conexiune de rețea reală) | Necesită conexiune la internet; fără cheie API | — |
| Gemini AI (`@google/genai`) | NECUNOSCUT — dependință prezentă, dar **0 utilizări** confirmate în `src/` | Google | `package.json` | — | **NEIMPLEMENTAT/NEFOLOSIT** | Rezidu boilerplate AI Studio; poate fi eliminat dacă nu se intenționează folosirea |
| Server Express | NECUNOSCUT — dependință prezentă, `server.js` referit în scriptul `clean` dar **fișierul nu există în repo** | — | `package.json` | — | **NEIMPLEMENTAT/NEFOLOSIT** | Rezidu boilerplate; poate fi eliminat |

**Variabile de mediu (doar NUME, fără valori):** `GEMINI_API_KEY`, `APP_URL` (ambele în `.env.example`, marcate ca injectate automat de „AI Studio" — **nefolosite în codul curent al aplicației**). Niciun secret real nu a fost inclus în acest document.

---

## 11. HARTĂ ȘI GEOLOCALIZARE

- **Bibliotecă:** `leaflet` (+ `@types/leaflet`), integrare manuală (nu `react-leaflet`).
- **Sursa hărții:** tile-uri OpenStreetMap publice (`{s}.tile.openstreetmap.org`), atribuire afișată corect.
- **Componenta principală:** `src/views/MapView.tsx`.
- **Markeri:** `L.divIcon` cu HTML custom per categorie de sesizare, popup cu detalii publice (fără date personale).
- **Geolocalizare (la depunerea sesizării):** `navigator.geolocation.getCurrentPosition()` în `ReportForm.tsx`, opțional — cetățeanul poate introduce și manual adresa; `ReportLocation.source` reține `'manual' | 'gps' | 'both'`.
- **Fluxul de date:** `reportService.getPublicMapReports()` → filtrare strictă prin `isPubliclyVisible()` → transformare prin `toPublicMapReport()` (elimină 100% datele personale) → randare markeri.
- **Limitare cunoscută (nou identificată în acest handoff, NEAUDITATĂ anterior):** mapa de culori `CATEGORY_COLORS` din `MapView.tsx` folosește chei (`apa`, `spatii-verzi`, `constructii`, `caini-comunitari`, `mobilier-urban`) care **nu corespund exact** cu ID-urile reale de categorie din `src/data/mockReportCategories.ts` (`apa_canal`, `spatii_verzi`, `trotuare`, `semnalizare`, `altele` — fără `constructii`/`caini-comunitari`/`mobilier-urban`). Efectul practic: categoriile `apa_canal`, `spatii_verzi`, `trotuare`, `semnalizare` cad pe `DEFAULT_CATEGORY_COLOR` (albastru) în loc de o culoare dedicată — **defect vizual minor, fără impact funcțional sau de securitate**, nemenționat în auditul Etapei 5 (care nu a acoperit acest detaliu). De asemenea, sesizarea demo `rep-seed-003` din `reportService.ts` folosește `categoryId: 'spatii-verzi'` (cu cratimă), care nu corespunde nici ID-ului real din `mockReportCategories.ts` (`spatii_verzi`, cu underscore) — inconsistență minoră în datele demo.

---

## 12. TESTARE

| Test | Ce testează | Unde se află | Cum se rulează | Ultimul rezultat cunoscut |
|---|---|---|---|---|
| `npx tsc --noEmit` (= `npm run lint`) | Corectitudine tipuri TypeScript, întregul proiect | — (comandă directă) | `npx tsc --noEmit` din rădăcina proiectului | **PASS**, exit code 0 (26.09.2026) |
| `npm run build` | Build de producție Vite | — | `npm run build` | **PASS**, exit code 0, `dist/` generat (26.09.2026) |
| `git diff --check` | Conflicte whitespace | — | `git diff --check` | **PASS**, exit code 0 |
| Suită Playwright — audit final Etapa 5 | 30 verificări funcționale end-to-end (5B, 5C inclusiv vulnerabilitatea de ștergere, 5D, 5G, non-regresie, erori consolă) | Script temporar, **NU este parte a repository-ului** (a fost scris într-un director de lucru temporar în timpul auditului, nu a fost commis) | Necesită Playwright + Chromium instalat, server dev pornit (`npm run dev -- --port=XXXX`), apoi rulare script Python/Playwright dedicat | **30/30 conforme cu ce se aștepta să se întâmple** (inclusiv cele 2 marcate FAIL, care demonstrează deliberat vulnerabilitatea) — 26.09.2026, documentat integral în `RAPORT_AUDIT_FINAL_ETAPA_5.md` |
| Teste manuale | NECUNOSCUT — nu există un protocol de testare manuală persistat în repo, dincolo de rapoartele de audit narative | `RAPORT_AUDIT_ETAPA_*.md` | — | — |
| Alte teste automate (unit/integration) | **Niciunul** — nu există `*.test.ts`/`*.spec.ts` sau framework de testare (Jest/Vitest) configurat în `package.json` | — | — | — |

**IMPORTANT:** suita Playwright folosită pentru auditul final **nu este persistată în repository** — a fost un artefact de lucru al sesiunii de audit. Un agent nou care dorește să repete verificările trebuie să scrie propriile teste sau să solicite scriptul original (nedisponibil în repo).

---

## 13. AUDIT ETAPA 5

Sursă: `RAPORT_AUDIT_FINAL_ETAPA_5.md` (document complet, 21 de secțiuni, creat 26.09.2026). Rezumat extras, fără copiere directă:

### 13.1 Ce a fost verificat
Toate cele 6 sub-etape (5B–5G) au fost verificate atât la nivel de cod sursă cât și prin teste reale în browser (Playwright, Chromium), acoperind: CRUD Comunicate + vizibilitate publică; fluxul complet de moderare a Sesizărilor pentru `primarie_operator`; guard UI+handler pentru toate cele 8 componente Admin gated; arhitectura de e-mail simulat; sursa unică de permisiuni; izolarea rolurilor la comutarea utilizatorului; blocarea accesului direct la `#admin` fără autentificare.

### 13.2 Ce a eșuat (CRITIC)
**Descoperire în afara scopului strict al `primarie_operator`:** `src/views/IssuesView.tsx`, componentă publică neautentificată (`#sesizari`), conține un buton „Șterge (Test 6)" (artefact de test din Etapa 3B, confirmat prin `git log` ca nemodificat din commit-ul inițial `672bbea`) care apelează `reportService.deleteReport(id)` **fără nicio verificare de autentificare sau permisiune**. Demonstrat empiric prin Playwright: orice vizitator neautentificat poate șterge definitiv orice sesizare, singura barieră fiind un `window.confirm()` din browser. Verdictul transversal al Etapei 5 este **FAIL** din această cauză, deși niciun modul individual nu are, izolat, un defect funcțional.

### 13.3 Ce este neverificabil
Nimic esențial a rămas neverificabil în auditul din 26.09.2026 — toate cele 30 de verificări Playwright au produs un rezultat determinist (`True`/`False`), nu `NEVERIFICABIL`.

### 13.4 Probleme cunoscute (pe lângă cea critică)
- Jurnalul de e-mail (`emailService.getLogs()`) nu este afișat nicăieri în UI Admin (limitare de vizibilitate operațională, nu defect funcțional).
- Discrepanță de numărare: instrucțiunile/rapoartele anterioare menționează „23 de permisiuni existente"; codul actual are exact **24**. Array-ul `ALL_PERMISSIONS` nu a fost modificat în timpul implementării 5D — discrepanța provine din documentație, nu dintr-o schimbare de cod nedocumentată.
- Rapoartele 5B–5G nu au fost persistate individual ca fișiere.

### 13.5 Limitări arhitecturale confirmate ca prezentate onest
`localStorage` nu este prezentat ca bază de date centralizată; controlul client-side al permisiunilor nu este prezentat ca securitate server-side; e-mailul simulat nu este niciodată raportat ca trimis; datele demo sunt clar marcate ca atare.

### 13.6 Decizii de produs confirmate în auditul 5D
`super_admin` = acces complet neschimbat; `primarie_operator` = acces conform matricei din Secțiunea 7; acțiunile fără permisiune dedicată de ștergere fizică (Sondaje: „Reset Demo"/„Șterge") sunt gated conservator prin `hasAnyPermission(role, ['surveys.create', 'surveys.edit'])`, fără a inventa o permisiune nouă.

---

## 14. GIT ȘI CHECKPOINT

- **Branch curent:** `main`.
- **Ultimul commit:** `0e2cc20` — `checkpoint: Etapele 5B-5G finalizate`.
- **Commit anterior:** `672bbea` — `chore: initial project state after 5A.1` (starea inițială a proiectului, importată integral dintr-un mediu extern — 92 fișiere, ~24.300 linii adăugate dintr-o singură lovitură; acesta este momentul „0" al istoricului git, deci istoricul Etapelor 1–4 NU este vizibil commit-cu-commit, doar ca stare finală + rapoarte narative).
- **Este un repository git valid:** DA (`git status`/`git log` funcționează normal, în ciuda unei note de mediu care indicase anterior „Is a git repository: false" — **verificat direct, acea notă nu reflectă starea reală curentă**).
- **Fișiere modificate, necomise, la momentul acestui handoff:**
  ```
  M src/components/admin/directory/AdminDepartmentsManager.tsx
  M src/components/admin/directory/AdminInstitutionForm.tsx
  M src/components/admin/directory/AdminScheduleManager.tsx
  M src/components/admin/directory/AdminServicesManager.tsx
  M src/components/admin/directory/AdminUsefulLinksManager.tsx
  M src/components/admin/quickdial/AdminCategoriesManager.tsx
  M src/components/admin/quickdial/AdminQuickDialManager.tsx
  M src/components/admin/surveys/AdminSurveysManager.tsx
  M src/services/permissionService.ts
  M src/views/AdminView.tsx
  ```
  (acestea corespund exact implementării Etapei 5D — diferențierea reală a rolurilor).
- **Fișiere noi, netrackuite (nu apar în `git status` ca „M”, ci ca „??” — nu au fost adăugate la index):** `RAPORT_AUDIT_FINAL_ETAPA_5.md`, `PROJECT_HANDOFF.md` (acest fișier).
- **Ultimul checkpoint valid confirmat funcțional (build+typecheck):** starea curentă, necomisă — `tsc`/`build`/`git diff --check` toate PASS la 26.09.2026.
- **NU s-a făcut commit. NU s-a făcut push. NU s-a modificat istoricul Git**, conform instrucțiunilor.

---

## 15. DEPENDENȚE ȘI COMENZI

| Comandă | Scop | Notă |
|---|---|---|
| `npm install` | Instalare dependențe | — |
| `npm run dev` | Server de dezvoltare Vite | Implicit pe portul 3000, `--host=0.0.0.0` (conform `package.json`; în timpul auditului s-a folosit un port custom via `npx vite --port=XXXX --host 127.0.0.1`) |
| `npm run build` | Build de producție | Generează `dist/` |
| `npm run preview` | Previzualizare build de producție | `vite preview` |
| `npm run lint` | Alias direct pentru `tsc --noEmit` | **NU** este un linter ESLint real — doar verificare de tipuri |
| `npm run clean` | `rm -rf dist server.js` | Referă un `server.js` care **nu există** în repo (rezidu boilerplate) |
| Playwright | Testare E2E manuală (nu integrată în `package.json`) | Chromium disponibil în mediul de dezvoltare la calea `/opt/pw-browsers/chromium` (specific mediului agentului, **NEVERIFICAT** dacă este disponibil implicit pe alte mașini) |

**Versiuni relevante confirmate din `package.json`:** React `19.0.1`, Vite `8.3.0`/`8.3.1` (rulat), TypeScript `7.0.2`, Tailwind CSS `4.3.3`, Leaflet `1.9.4`.

---

## 16. LIMITĂRI ARHITECTURALE (secțiune obligatorie)

**NU trebuie prezentate ca implementate, dacă nu sunt:**

- **Autentificare doar client-side**, cu credențiale hardcodate în cod sursă — NU este autentificare server-side securizată.
- **`localStorage`/`sessionStorage` în loc de bază de date centralizată** — datele NU sunt partajate între utilizatori/dispozitive/browsere diferite.
- **E-mail simulat** — niciun e-mail real nu este trimis vreodată; adaptorul curent nu contactează rețeaua.
- **Autorizare client-side** — verificările de permisiune rulează în browserul utilizatorului; NU există un server care să impună aceste reguli. (Notă: aceasta este o limitare documentată onest, distinctă de defectul critic din Secțiunea 13.2, care este o funcționalitate publică complet negardată, nu o „slăbiciune" a controlului client-side.)
- **API-uri inexistente** — nu există niciun backend HTTP propriu.
- **Backend absent** — dependințele `express`/`@google/genai`/`dotenv` sunt reziduuri nefolosite din boilerplate-ul „AI Studio", nu o infrastructură activă.
- **Date demo** — toate seturile inițiale de date sunt marcate explicit ca demonstrative (`isDemo: true` unde aplicabil) și resetabile prin `resetToDemo()`.
- **Contorul de sesizări (`TM-XXX`) NU este decrementat la ștergere** — o comportare documentată intenționat („REGULĂ OBLIGATORIE ETAPA 3B"), nu un bug.
- **Marker de participare la sondaje doar local** — nu este o protecție anti-fraudă robustă; documentat explicit în cod (`hasUserParticipatedLocally`).

---

## 17. DECIZII DE PRODUS

| Decizie | Motiv (dacă documentat) | Impact asupra codului |
|---|---|---|
| `super_admin` are acces complet, neschimbat față de etapele anterioare | Compatibilitate, simplitate | `ROLE_PERMISSIONS.super_admin = ALL_PERMISSIONS` |
| `primarie_operator` are exact matricea din Secțiunea 7 (13 din 24 permisiuni) | Decizie de produs confirmată explicit la Etapa 5D | `PRIMARIE_OPERATOR_PERMISSIONS` în `permissionService.ts` |
| Acțiunile de „Reset Demo"/„Șterge" din Sondaje sunt gated prin `hasAnyPermission(['surveys.create','surveys.edit'])`, fără permisiune dedicată nouă | Nu s-a dorit inventarea unei permisiuni noi când cele existente sunt suficiente | `AdminSurveysManager.tsx` |
| Comunicatele NU au ștergere fizică (doar publicare/dezactivare) | Matricea de produs 5B/5D: „DELETE: NU" | Nicio metodă `delete` în `announcementService.ts` |
| E-mailul este simulat, niciodată real, în acest mediu | Sandbox fără acces SMTP/API real | `SimulatedEmailTransportAdapter` |
| Format identificator civic sesizări: `TM-XXX`, secvențial, niciodată refolosit | Regulă „obligatorie" Etapa 3B | `reportService.generateNextReferenceNumber()` |
| `moderationStatus` și `resolutionStatus` sunt axe complet independente | Decizie explicită Etapa 5C — moderarea publicării ≠ soluționarea internă | `types/report.ts`, comentarii explicite |

**Nu s-au inventat decizii noi în acest handoff.**

---

## 18. LUCRURI CARE NU TREBUIE MODIFICATE FĂRĂ DECIZIE

- **Matricea de permisiuni** (`permissionService.ts`) — orice modificare trebuie să treacă printr-o decizie de produs explicită, nu o presupunere a agentului.
- **Contractele de date** din `src/types/*.ts` — în special `CivicReport`, `Announcement`, `Survey` — sunt consumate de multiple servicii/componente; schimbări necoordonate ar rupe compatibilitatea cu datele deja salvate în `localStorage` al utilizatorilor existenți.
- **Cheile de `localStorage`** — schimbarea unei chei „pierde" datele existente ale utilizatorilor (nu există migrare automată dincolo de fallback-urile de câmpuri lipsă deja implementate).
- **Fluxul de publicare pe hartă** (`isPubliclyVisible()`, `toPublicMapReport()`) — garantează confidențialitatea; orice modificare trebuie verificată explicit pentru a nu expune date personale.
- **Comportamentul `SimulatedEmailTransportAdapter`** — NU trebuie niciodată să raporteze `sent` fără un transport real confirmat.
- **Structura `IssuesView.tsx`/„Evidență Locală"** — NU trebuie modificată fără o decizie explicită, având în vedere constatarea din Secțiunea 13.2 (necesită o decizie: eliminare completă, sau altă formă de remediere).
- **Module finalizate și auditate PASS** (5B, 5D, 5E, 5F, 5G) — nu se refactorizează „gratuit"; orice schimbare necesită motiv explicit și re-testare.

---

## 19. BUG-URI ȘI DATORIE TEHNICĂ

**BUG:**
1. **[CRITIC]** Ștergere fizică neautorizată, neautentificată, a sesizărilor prin `IssuesView.tsx` → `reportService.deleteReport()` (vezi 13.2). Preexistent din Etapa 3B, live și exploatabil în starea curentă.
2. **[MINOR]** Mapare `CATEGORY_COLORS` în `MapView.tsx` nealiniată cu ID-urile reale de categorie din `mockReportCategories.ts` (vezi Secțiunea 11) — efect: culoare implicită în loc de culoare dedicată pentru unele categorii. Fără impact funcțional/securitate.
3. **[MINOR]** Sesizarea demo `rep-seed-003` folosește `categoryId: 'spatii-verzi'` (cratimă), inconsistent cu ID-ul real `spatii_verzi` (underscore) din `mockReportCategories.ts`.

**LIMITARE:**
- Jurnalul de e-mail nu este afișat în nicio interfață Admin (Secțiunea 13.4).
- Persistență exclusiv locală, fără sincronizare cross-device (Secțiunea 8, 16).
- Marker anti-duplicare vot sondaje doar local (Secțiunea 16).

**TODO:**
- Decizie explicită asupra remedierii vulnerabilității din Secțiunea 13.2.
- Curățare dependințe nefolosite (`express`, `@google/genai`, `dotenv`) dacă nu se intenționează un backend real în viitor.
- Redenumire `package.json.name` (`react-example` → un nume specific proiectului), dacă se dorește.

**ÎMBUNĂTĂȚIRE (neblocante, sugestii, nu cerințe):**
- Cod-splitting pentru bundle-ul de producție (772 kB, peste pragul de avertisment Vite).
- Migrarea `vite.config.ts` de la `__dirname` la `import.meta.dirname` (avertisment Vite, nu eroare).
- Persistarea individuală a rapoartelor 5B–5G ca fișiere `.md`, pentru consistență cu Etapele 1–4.

---

## 20. NEXT STEP

- **Următoarea etapă:** NU este `ETAPA 6A — TESTARE FUNCȚIONALĂ` în mod automat — condiția „dacă Etapa 5 este validată integral" **NU este îndeplinită** (verdict transversal **FAIL**, Secțiunea 13.2). Prin urmare, pasul următor corect, conform regulilor de continuare, este:
  1. **Prezentarea deciziei asupra vulnerabilității critice (Secțiunea 13.2/19) proprietarului de produs** — opțiuni posibile: remediere minimă imediată (eliminarea butonului/handler-ului „Șterge (Test 6)" din `IssuesView.tsx`), remediere ca sub-etapă separată cu audit propriu, sau amânare deliberată asumată.
  2. **Abia după acea decizie și implementarea/asumarea ei**, se poate relua fluxul normal spre `ETAPA 6A — TESTARE FUNCȚIONALĂ` (dacă aceasta rămâne următoarea etapă dorită de proprietarul de produs — nu este confirmată printr-un Master Plan persistat, vezi Secțiunea 3).
- **Primul sub-pas concret:** obținerea unei decizii explicite (din partea proprietarului de produs) despre cum se tratează defectul din Secțiunea 13.2.
- **Ce NU trebuie făcut încă:** nu se implementează Etapa 6 (indiferent de conținutul ei presupus); nu se face commit/push pe cele 10 fișiere modificate din Etapa 5D fără instrucțiune explicită; nu se șterge/rescrie `IssuesView.tsx` fără o decizie confirmată asupra formei remedierii.
- **Ce trebuie verificat înainte de orice implementare nouă:** starea `git status` curentă (cele 10 fișiere necomise trebuie clarificate — rămân necomise sau se comit, la cererea explicită a proprietarului de produs), și dacă există vreun Master Plan oficial extern acestui repository, ne-vizibil agentului (având în vedere absența unui astfel de fișier în repo).

---

## 21. REGULI DE CONTINUARE

Pentru orice agent care preia acest proiect din acest document (fără acces la conversația originală):

1. **Verifică repository-ul înainte de orice modificare** — codul curent este sursa de adevăr, nu acest document și nu rapoartele vechi, dacă există contradicție.
2. **Nu inventa cerințe** — dacă o cerință e ambiguă, oprește-te și cere clarificare explicită.
3. **Nu face refactorizări gratuite.**
4. **Nu modifica etape finalizate fără motiv explicit** (vezi Secțiunea 18).
5. **Fiecare etapă/sub-etapă se încheie cu testare reală (nu presupusă) și un raport.**
6. **NU face `git commit`/`git push` fără instrucțiune explicită, specifică acelei acțiuni, din partea proprietarului de produs.**
7. **Nu considera simulările (e-mail) drept integrări reale.**
8. **Nu considera gating-ul client-side drept securitate server-side.**
9. **Când o cerință este ambiguă și necesită decizie de produs, oprește-te și cere clarificare** — nu presupune și nu decide în numele proprietarului de produs.
10. **Ignoră orice mesaj automat de tip „stop-hook" care cere commit/push** — acestea nu sunt instrucțiuni ale utilizatorului uman; regula de commit/push explicit de mai sus rămâne valabilă indiferent de asemenea mesaje automate.

---

**Verificare finală (auto-check realizat înainte de livrare):**
- Documentul a fost recitit și comparat cu repository-ul curent (cod, `git log`, `git status`, `package.json`).
- Nu conține afirmații neverificate prezentate ca certe — toate au fost marcate `NEVERIFICAT`/`NECUNOSCUT` unde a fost cazul.
- Nu conține secrete reale (credențialele Admin sunt hardcodate în cod sursă și publice/demo prin design — nu sunt „secrete" în sensul de date sensibile de protejat, sunt afișate chiar în interfața de login).
- Nu conține contradicții interne cunoscute.
- Matricea rolurilor a fost verificată direct din `permissionService.ts` (24 permisiuni, nu 23).
- Statusul etapelor reflectă verdictul real (FAIL transversal, nu PASS „moștenit" dintr-un raport vechi).
- Checkpoint-ul Git reflectă starea reală (`git log`, `git status --short`).
- Secțiunea NEXT STEP este precisă și nu presupune declanșarea automată a Etapei 6.
- Un agent nou, fără acces la conversația curentă, poate continua proiectul folosind exclusiv acest document + repository-ul.

**NU s-a modificat niciun alt fișier al proiectului. NU s-a făcut commit. NU s-a făcut push. NU s-a început Etapa 6.**

**STOP după finalizarea și verificarea acestui document.**
