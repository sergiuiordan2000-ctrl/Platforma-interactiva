# RAPORT AUDIT FINAL TRANSVERSAL — ETAPA 5 (5B–5G)

**Data auditului:** 26 septembrie 2026
**Tip:** Audit read-only, transversal, asupra întregii Etape 5 (5B, 5C, 5D, 5E, 5F, 5G) ca sistem integrat.
**Regulă respectată:** codul actual are prioritate față de rapoartele anterioare; niciun defect găsit nu a fost reparat în cadrul acestui audit; nu s-a făcut `git commit`/`git push`; nu s-a șters niciun fișier; nu s-a modificat funcționalitate publică sau administrativă.

---

## 1. Status General

| Verificare | Rezultat |
|---|---|
| Cod sursă auditat direct (nu doar rapoarte) | PASS |
| Suită Playwright completă rulată | PASS (30/30 verificări booleene = `True`, 0 eșecuri) |
| `npx tsc --noEmit` | PASS (exit code 0) |
| `npm run build` | PASS (exit code 0) |
| `git diff --check` | PASS (exit code 0, fără conflicte whitespace) |
| Defect critic de securitate identificat | **DA — vezi Secțiunea 3 și Secțiunea 17** |
| Commit/push efectuat | NU (interzis explicit — respectat) |
| Fișiere șterse | NU |
| Etapa 6 începută | NU |

**Verdict general al Checkpoint-ului: vezi Secțiunea 17 (Checkpoint Final Etapa 5) — FAIL, din cauza unui defect funcțional relevant de securitate care preexistă în aplicație și rămâne nerezolvat.**

---

## 2. Situația Inițială a Auditului (înainte de orice acțiune din acest audit)

- **Branch:** `main`
- **Ultimul commit:** `0e2cc20 checkpoint: Etapele 5B-5G finalizate`
- **Commit anterior:** `672bbea chore: initial project state after 5A.1`
- **Fișiere modificate, necommise, la începutul auditului** (rezultate din implementarea Etapei 5D, sesiune anterioară):
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
- **La finalul auditului, `git status --short` este identic** — nicio modificare de cod nu a fost făcută în timpul acestui audit (doar citire, grep, rulare teste și scriere a acestui raport).

---

## 3. Audit 5B — Comunicate

Verificat prin cod (`announcementService.ts`, `AdminAnnouncementsManager.tsx`) și browser real (Playwright).

| Test | Rezultat așteptat | Rezultat efectiv | Status |
|---|---|---|---|
| Creare comunicat nou → persistă în `localStorage` | Da | Da | **PASS** |
| Comunicat nou creat are status implicit `published` | Da | Da | **PASS** |
| Editare titlu → persistă | Da | Da | **PASS** |
| Dezactivare (toggle → `draft`) → persistă | Da | Da | **PASS** |
| Comunicat `draft` NU apare pe zona publică `#comunicate` | Da | Confirmat — 0 apariții | **PASS** |
| Re-publicare → reapare pe zona publică | Da | Confirmat | **PASS** |
| Metodă de ștergere fizică (`delete`) există în `announcementService.ts` | Nu (conform matricei — DELETE: NU) | Nu există — confirmat prin citirea integrală a serviciului (201 linii) | **PASS** |
| `AdminAnnouncementsManager.tsx` conține buton/acțiune de ștergere | Nu | Nu — confirmat prin citirea componentei | **PASS** |

**Concluzie 5B: PASS.** Nu există nicio cale, nici în serviciu, nici în UI, de ștergere fizică a unui comunicat — consistent cu matricea de produs ("DELETE: NU" pentru ambele roluri, deoarece capacitatea nu a fost construită deloc).

---

## 4. Audit 5C — Sesizări (atenție specială: NU ștergere pentru operator)

### 4.1 Fluxul legitim (operator, în Admin)

| Test | Rezultat așteptat | Rezultat efectiv | Status |
|---|---|---|---|
| Sesizare publică generează identificator `TM-XXX` | Da | Da (`ref.startsWith("TM-")` = True) | **PASS** |
| Operator vede cardul sesizării în Moderare | Da | Da | **PASS** |
| Operator poate aproba publicarea (`reports.moderate`) | Da | Da | **PASS** |
| Operator poate schimba stadiul soluționării (`reports.resolve`) | Da | Da | **PASS** |
| Operator poate adăuga răspuns intern (`reports.reply`) | Da | Da | **PASS** |
| **Nu există niciun buton/control de ștergere în cardul Admin pentru operator** | Da (confirmat) | 0 elemente găsite (`button[title*='terge'], button:has-text('Șterge')`) | **PASS** |
| Datele sesizării rămân intacte după toate acțiunile operatorului | Da | Da | **PASS** |
| `AdminReportsModeration.tsx` conține handler de ștergere apelabil de operator | Nu | Nu — confirmat prin citirea integrală a componentei (624 linii): singurele handlere sunt `handleUpdateStatus`, `handleChangeResolutionStatus`, `handleAddResponse` | **PASS** |

**Concluzie parțială (doar zona Admin, doar rolul `primarie_operator`): PASS** — în interiorul panoului de administrare, operatorul nu are nicio cale de ștergere a unei sesizări, nici la nivel de UI, nici la nivel de handler.

### 4.2 CONSTATARE CRITICĂ — cale de ștergere publică, neautentificată, independentă de rol

Regula din instrucțiuni cere explicit: *"Dacă există vreo posibilitate reală de ștergere de către `primarie_operator`, marchează FAIL."* Auditul a mers mai departe și a verificat existența oricărei căi reale de ștergere a sesizărilor în întreaga aplicație (nu doar în Admin), conform cerinței de a raporta orice defect relevant găsit.

**A fost identificată o cale de ștergere fizică a sesizărilor, complet independentă de autentificare și de rol:**

- **Fișier:** `src/views/IssuesView.tsx` (vizualizarea publică, neautentificată, de la `#sesizari`)
- **Componentă/handler:** `handleDeleteTestReport(id, refNum)` (liniile 56–61)
  ```ts
  const handleDeleteTestReport = (id: string, refNum: string) => {
    if (window.confirm(`Ștergeți sesizarea de test ${refNum}? ...`)) {
      reportService.deleteReport(id);
      setReports(reportService.getAllReports());
    }
  };
  ```
- **UI:** buton "Șterge (Test 6)" (cu iconiță `Trash2`), afișat pentru fiecare sesizare în tab-ul "Evidență Locală" din secțiunea etichetată în cod "Listă tehnică de verificare a identificatorilor (Etapa 3B)".
- **Serviciu apelat:** `reportService.deleteReport(id): boolean` (liniile 308–320 din `reportService.ts`) — șterge definitiv sesizarea din array-ul persistat în `localStorage`, fără nicio verificare de autentificare, rol sau permisiune.
- **Origine:** verificat cu `git log --oneline -- src/views/IssuesView.tsx` → apare într-un singur commit, `672bbea chore: initial project state after 5A.1`. **Acest fișier nu a fost modificat niciodată în Etapele 5B–5G** — este un artefact preexistent din Etapa 3B, NU o regresie introdusă în Etapa 5. Totuși, el rămâne live, accesibil și funcțional în aplicația curentă, iar impactul lui intersectează direct regula 5C.
- **Impact:** orice vizitator, fără autentificare, poate șterge definitiv orice sesizare depusă de cetățeni, singura barieră fiind un `window.confirm()` din browser (fără nicio validare server-side sau client-side de autorizare).

**Demonstrație empirică (Playwright), efectuată izolat, folosind exclusiv o sesizare de test dedicată (nu date reale/demo):**

| Test | Rezultat așteptat (dacă vulnerabilitatea NU ar exista) | Rezultat efectiv | Status |
|---|---|---|---|
| Pagina `#sesizari` este accesibilă fără autentificare (fără buton logout) | Da | Da | Confirmat context |
| Butonul "Șterge (Test 6)" există și este vizibil unui utilizator neautentificat | Nu ar trebui să existe pentru ștergere fizică fără control de acces | **DA, există** | **FAIL** |
| Declanșarea clicului pe acest buton (cu acceptarea dialogului `confirm`) produce ștergerea reală din `localStorage` | Nu ar trebui să reușească fără autorizare | **DA, ștergerea a reușit** — sesizarea de test dedicată a dispărut din `turnu_civic_reports_store` | **FAIL** |

**Severitate:** CRITICĂ. Este o încălcare mai gravă decât scenariul explicit interzis în instrucțiuni (care viza doar rolul `primarie_operator`): aici NICIUN rol și NICIO autentificare nu sunt necesare pentru ștergerea definitivă a datelor cetățenilor.

**Relație cu regula explicită 5C:** instrucțiunile cer `FAIL` dacă `primarie_operator` poate șterge o sesizare. Literal, în interiorul panoului Admin, operatorul nu poate. Dar regula are drept scop protejarea integrității datelor sesizărilor față de ștergere neautorizată; o cale publică, neautentificată, care ocolește complet conceptul de rol, se încadrează în spiritul acestei reguli și este raportată ca atare — **fără a inventa o decizie de produs**, ci semnalând constatarea exact așa cum a fost găsită, pentru decizie explicită din partea dumneavoastră.

**Nu a fost reparat** — conform regulii explicite a auditului (Secțiunea 19), defectul este doar reprodus, documentat și raportat.

---

## 5. Audit 5D — Ghidul Primăriei (finalizarea sistemului de roluri)

Verificare de tip re-confirmare (deja testat exhaustiv în implementarea Etapei 5D, retestat acum independent, în cadrul acestui audit transversal).

| Test | Rezultat așteptat | Rezultat efectiv | Status |
|---|---|---|---|
| Operator: butonul "Salvează Modificările Instituționale" NU există | Da | 0 elemente găsite | **PASS** |
| Operator: câmpurile formularului "Date Instituționale" sunt dezactivate (`disabled`) | Da | Confirmat (`is_disabled()` = True) | **PASS** |
| Super admin: butonul de salvare EXISTĂ | Da | Da | **PASS** |
| Toate cele 8 componente administrative gated (Departamente, Servicii, Program, Link-uri, Instituție, Quick Dial contacte, Quick Dial categorii, Sondaje) au guard dublu (UI + handler) | Da (verificat exhaustiv în implementarea 5D, cu test de manipulare directă a `fieldset disabled` + `submit` forțat, confirmând că `localStorage` rămâne neschimbat) | Confirmat prin re-citirea codului: fiecare handler mutator începe cu `if (!canX) return;`, iar UI-ul ascunde/dezactivează controalele corespunzătoare | **PASS** |

**Concluzie 5D: PASS.** Diferențierea reală (nu doar vizuală) `super_admin` vs. `primarie_operator` este implementată corect și consistent, cu apărare pe două niveluri (UI + handler), fără verificări de rol împrăștiate în componente.

---

## 6. Audit 5E — Fluxul de e-mail

Verificare la nivel de cod (fără regresie de comportament necesară în acest audit — arhitectura nu a fost modificată în Etapa 5D).

| Test | Rezultat așteptat | Rezultat efectiv | Status |
|---|---|---|---|
| `SimulatedEmailTransportAdapter.send()` returnează întotdeauna status `simulated`, niciodată `sent` | Da | Confirmat prin citirea integrală a `emailService.ts` (333 linii) — comentariul din cod declară explicit acest lucru, iar implementarea nu contactează rețeaua | **PASS** |
| Statusul `simulated` nu este niciodată raportat/afișat ca `sent` | Da | Confirmat — vocabularul de status (`generated`/`simulated`/`sent`/`failed`) este respectat strict în `dispatch()` | **PASS** |
| `notifyNewReport()` este apelat non-blocant, izolat prin `try/catch`, strict DUPĂ salvarea sesizării | Da | Confirmat în `reportService.submitReport()` | **PASS** |
| Loguri de e-mail (`getLogs()`/`getLogsForReport()`) sunt afișate undeva în UI Admin | — | **NU** — grep `emailService\.` pe toate fișierele `.tsx` (exclusiv serviciul însuși) → 0 rezultate | **LIMITARE, nu defect** |

**Concluzie 5E: PASS**, cu o limitare notată: jurnalul de e-mail există doar în serviciu/`localStorage`, fără nicio suprafață în interfața de administrare pentru a-l consulta. Nu este un defect funcțional (nu afectează corectitudinea fluxului), dar este o lipsă de vizibilitate operațională demnă de menționat.

---

## 7. Audit 5F — Infrastructură/consolidări

| Test | Rezultat așteptat | Rezultat efectiv | Status |
|---|---|---|---|
| Zero verificări de rol împrăștiate (`role === '...'`) în afara `authService.ts`/`permissionService.ts` | Da | Confirmat prin `grep -rn "role ===" src/` — singurele apariții sunt în cele două fișiere sursă unică | **PASS** |
| Fiecare serviciu are o cheie `localStorage` distinctă, fără coliziuni | Da | Confirmat (chei distincte: `turnu_civic_reports_store`, `turnu_civic_announcements`, `turnu_civic_admin_session`, `turnu_civic_email_log_store`, etc.) | **PASS** |
| `permissionService.ts` este sursa unică de adevăr pentru permisiuni | Da | Confirmat — nicio componentă nu conține propria matrice de roluri | **PASS** |

**Concluzie 5F: PASS.**

---

## 8. Audit 5G — Roluri și permisiuni

### 8.1 Sursa centrală de permisiuni — inventar complet

`src/services/permissionService.ts` definește **exact 24 de permisiuni** (tipul `Permission`, 24 valori literale), listate integral mai jos (Secțiunea 9 conține matricea completă).

| Test | Rezultat așteptat | Rezultat efectiv | Status |
|---|---|---|---|
| Autentificare funcțională (3 seturi de credențiale hardcodate) | Da | Confirmat în `authService.ts` | **PASS** |
| Există o sursă centrală unică de permisiuni | Da | `permissionService.ts` — confirmat | **PASS** |
| Numărul exact de permisiuni existente | — | **24** (nu 23, vezi Secțiunea 16 — discrepanță documentație) | Constatare |
| `super_admin`, prin browser real, are acces complet la toate acțiunile | Da | Da (confirmat Playwright: buton "Sondaj Nou" vizibil, buton salvare Instituție vizibil, etc.) | **PASS** |
| `primarie_operator`, prin browser real, respectă exact matricea aprobată (nu doar ascundere vizuală, ci și blocare la nivel de handler) | Da | Da — confirmat atât prin testele curente, cât și prin testul dedicat din implementarea 5D (manipulare `fieldset disabled` + `submit` forțat → `localStorage` neschimbat) | **PASS** |
| Comutarea utilizatorului (logout super_admin → login operator) NU păstrează permisiuni vechi | Da | Confirmat: butonul "Sondaj Nou" (vizibil pentru super_admin) dispare complet după comutare la operator, fără refresh complet al paginii între cele două sesiuni | **PASS** |
| Acces direct la ruta `#admin` fără autentificare NU ocolește login-ul | Da | Confirmat — formularul de login este afișat, nu panoul Admin | **PASS** |

**Concluzie 8 (5G): PASS** pentru toate aspectele strict legate de sistemul de roluri/permisiuni în sine. (Constatarea critică din Secțiunea 4.2 este o vulnerabilitate structurală separată, situată în afara sistemului de permisiuni — ea nu trece deloc prin `permissionService`/`authService`.)

---

## 9. Matricea Efectivă de Permisiuni (completă, necomprimată)

**Total permisiuni definite: 24.**

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

`primarie_operator` deține efectiv **13 din cele 24** permisiuni. Nu există nicio permisiune de tip `delete` fizic definită pentru Comunicate sau Sondaje în acest inventar — pentru Sondaje, acțiunile "Reset Demo" și "Șterge" din UI sunt gated conservator prin `hasAnyPermission(role, ['surveys.create', 'surveys.edit'])`, tratament documentat explicit ca decizie de proiectare (nicio permisiune nouă nu a fost inventată).

---

## 10. Suita Playwright — Rezultate Complete

Rulată împotriva serverului de dezvoltare local (`http://127.0.0.1:4271`), folosind Chromium pre-instalat, browser real (nu simulare/mock). **30/30 verificări = `True`, 0 eșecuri, 0 erori de consolă (excluzând zgomotul `ERR_TUNNEL` de infrastructură).**

| ID | Test | Rol | Rezultat așteptat | Rezultat efectiv | Status |
|---|---|---|---|---|---|
| 5B_CREATE_PERSISTED | Creare comunicat → persistă | super_admin | True | True | PASS |
| 5B_CREATE_STATUS_DEFAULT_PUBLISHED | Status implicit `published` | super_admin | True | True | PASS |
| 5B_EDIT_PERSISTED | Editare titlu → persistă | super_admin | True | True | PASS |
| 5B_DISABLE_PERSISTED | Dezactivare → status `draft` | super_admin | True | True | PASS |
| 5B_DISABLED_NOT_IN_PUBLIC_ZONE | Comunicat `draft` absent din `#comunicate` | public | True | True | PASS |
| 5B_REPUBLISHED_VISIBLE_PUBLIC | Re-publicare → reapare public | public | True | True | PASS |
| 5C_TM_XXX_GENERAT | Referință `TM-XXX` generată | public | True | True | PASS |
| 5C_OPERATOR_SEE_CARD | Operator vede cardul sesizării | primarie_operator | True | True | PASS |
| 5C_OPERATOR_CAN_MODERATE | Operator poate aproba | primarie_operator | True | True | PASS |
| 5C_OPERATOR_CAN_CHANGE_RESOLUTION | Operator poate schimba stadiul | primarie_operator | True | True | PASS |
| 5C_OPERATOR_CAN_REPLY | Operator poate răspunde | primarie_operator | True | True | PASS |
| 5C_OPERATOR_NO_DELETE_BUTTON_IN_ADMIN | Fără buton ștergere în Admin | primarie_operator | True | True | PASS |
| 5C_REPORT_DATA_INTACT_AFTER_OPERATOR_ACTIONS | Date intacte după acțiuni operator | primarie_operator | True | True | PASS |
| 5C_VULN_UNAUTHENTICATED_ON_PUBLIC_PAGE | Pagină publică fără sesiune activă | neautentificat | True | True | Context |
| 5C_VULN_PUBLIC_DELETE_BUTTON_EXISTS_UNAUTHENTICATED | Buton ștergere public există fără autentificare | neautentificat | **False (nu ar trebui să existe)** | **True (există)** | **FAIL** |
| 5C_VULN_CONFIRMED_UNAUTHENTICATED_DELETE_SUCCEEDED | Ștergere reușită fără autentificare | neautentificat | **False (nu ar trebui să reușească)** | **True (a reușit)** | **FAIL** |
| 5D_OPERATOR_NO_SAVE_BTN_RECHECK | Fără buton salvare Instituție | primarie_operator | True | True | PASS |
| 5D_OPERATOR_INPUTS_DISABLED_RECHECK | Câmpuri dezactivate | primarie_operator | True | True | PASS |
| 5D_SUPERADMIN_HAS_SAVE_BTN_RECHECK | Buton salvare există | super_admin | True | True | PASS |
| 5G_SA_HAS_SONDAJ_NOU | Buton "Sondaj Nou" există | super_admin | True | True | PASS |
| 5G_SWITCH_USER_NO_STALE_PERMISSIONS | Fără permisiuni vechi după comutare | primarie_operator | True | True | PASS |
| 5G_DIRECT_HASH_ACCESS_REQUIRES_LOGIN | Acces direct `#admin` cere login | neautentificat | True | True | PASS |
| REGRESIE_PUBLIC_Acasa | Randare fără eroare | public | True | True | PASS |
| REGRESIE_PUBLIC_Comunicate | Randare fără eroare | public | True | True | PASS |
| REGRESIE_PUBLIC_Harta | Randare fără eroare | public | True | True | PASS |
| REGRESIE_PUBLIC_Sesizari | Randare fără eroare | public | True | True | PASS |
| REGRESIE_PUBLIC_Sondaje | Randare fără eroare | public | True | True | PASS |
| REGRESIE_PUBLIC_Ghid | Randare fără eroare | public | True | True | PASS |
| REGRESIE_ADMIN_LOGIN_FORM | Formular login randat | neautentificat | True | True | PASS |
| CONSOLE_ERRORS_NON_TUNNEL | Erori consolă (excl. ERR_TUNNEL) | — | `[]` | `[]` | PASS |

**Notă privind interpretarea rândurilor marcate FAIL:** sunt marcate FAIL deliberat, din perspectiva "acest comportament nu ar trebui să fie posibil". Scriptul de test a confirmat cu succes, printr-o demonstrație controlată, izolată, pe date de test dedicate, că vulnerabilitatea descrisă în Secțiunea 4.2 este reală și reproductibilă.

---

## 11. Teste de Acces Neautorizat

- Tentativă de acces direct la `#admin` fără autentificare → formular de login (fără ocolire). **PASS**
- Tentativă de a declanșa o acțiune specifică `super_admin` (ex. "Sondaj Nou") ca `primarie_operator`, prin: (a) căutare vizuală a butonului în UI — absent; (b) acces direct la tab-ul relevant — permisiunea rămâne blocată conform matricei; niciun handler de creare sondaj nu este accesibil operatorului. **PASS**
- Tentativă de ștergere a unei sesizări ca `primarie_operator`, în interiorul panoului Admin — imposibilă (fără UI, fără handler). **PASS**
- Tentativă de ștergere a unei sesizări **fără nicio autentificare**, prin ruta publică `#sesizari` → **reușită** (vezi Secțiunea 4.2). **FAIL — vulnerabilitate confirmată.**

---

## 12. Teste de Persistență

- Comunicat creat/editat/dezactivat/republicat — toate stările persistă corect în `localStorage` între navigări. **PASS**
- Sesizare depusă, apoi moderată/rezolvată/răspunsă de operator — toate modificările persistă. **PASS**
- Sesiune admin persistă în `sessionStorage` ȘI `localStorage` sub cheia `turnu_civic_admin_session` (comportament neschimbat față de rapoartele anterioare). **PASS**

---

## 13. Non-Regresie

Toate rutele publice (`Acasă`, `Comunicate`, `Hartă`, `Sesizări`, `Sondaje`, `Ghid`) și formularul de login Admin randează fără eroare, verificat prin browser real după toate operațiile de audit de mai sus. **0 erori de consolă/runtime** (excluzând zgomotul `ERR_TUNNEL`, specific infrastructurii sandbox-ului, fără legătură cu aplicația). **PASS.**

---

## 14. Console/Runtime

Colectare continuă de evenimente `console.error` și `pageerror` pe toată durata suitei Playwright (toate cele 5 secțiuni de testare, ~30 de acțiuni de browser). Rezultat: **listă goală** după filtrarea zgomotului de rețea `ERR_TUNNEL`. **PASS.**

---

## 15. TypeScript / Build / Lint

| Comandă | Rezultat | Exit code |
|---|---|---|
| `npx tsc --noEmit` | Fără erori | **0** |
| `npm run build` | Build reușit (`✓ built in 630ms`) | **0** |
| Script `lint` din `package.json` | Este definit ca alias direct pentru `tsc --noEmit` (`"lint": "tsc --noEmit"`) — deja acoperit mai sus, fără verificare ESLint separată în proiect | **0** (identic cu tsc) |

Avertismente informative, fără impact asupra corectitudinii (raportate separat, nu sunt erori):
- Vite: `__dirname` în `vite.config.ts:11:27` este marcat ca urmând să devină nesuportat într-o versiune viitoare majoră (`configLoader: 'native'`).
- Vite: bundle-ul principal (`index-8m8ofEnh.js`, 772.56 kB) depășește pragul implicit de 500 kB pentru avertismentul de dimensiune chunk.

---

## 16. `git diff --check` și `git status --short`

```
$ git diff --check
(fără output — exit code 0, nicio problemă de whitespace/conflict)

$ git status --short
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

Identic cu situația de la începutul auditului (Secțiunea 2) — confirmă că acest audit nu a introdus nicio modificare de cod.

---

## 17. Discrepanțe Documentație vs. Cod

1. **Numărul de permisiuni ("23" vs. "24"):** instrucțiunile Etapei 5D și raportul de audit livrat în conversație pentru 5D fac referire la "cele 23 de permisiuni existente". Codul actual (`ALL_PERMISSIONS` din `permissionService.ts`) conține **exact 24** valori distincte de tip `Permission`, verificat atât în starea curentă (necommisă), cât și în ultimul commit (`0e2cc20`) — array-ul `ALL_PERMISSIONS` nu a fost modificat în timpul implementării 5D (doar `ROLE_PERMISSIONS.primarie_operator` a fost schimbat de la `ALL_PERMISSIONS` la noua constantă `PRIMARIE_OPERATOR_PERMISSIONS`). Discrepanța provine deci din documentație/instrucțiuni, nu dintr-o modificare de cod nedocumentată. Este raportată, nu corectată.
2. **Rapoartele Etapei 5B–5G (5B, 5C, 5D, 5E, 5F, 5G) nu există ca fișiere persistate în proiect** — spre deosebire de rapoartele Etapelor 1–4 (`RAPORT_AUDIT_ETAPA_1B.md` ... `RAPORT_AUDIT_ETAPA_4E.md`, toate prezente în rădăcina proiectului), niciun raport pentru Etapa 5 nu a fost scris ca fișier `.md`; au fost livrate exclusiv în conversație. Comparația documentație-vs-cod pentru Etapa 5 s-a bazat, prin urmare, pe istoricul conversației din această sesiune, nu pe fișiere verificabile independent în repo. Aceasta este o discrepanță de proces demnă de menționat, nu un defect de cod.
3. **Nicio funcționalitate declarată `PASS` în rapoartele anterioare nu s-a dovedit, la verificare directă a codului și prin teste reale în browser, a fi de fapt neconformă** — cu o singură excepție relevantă: constatarea din Secțiunea 4.2, care nu a fost niciodată auditată explicit în rapoartele 5B–5G anterioare (acestea s-au concentrat pe fluxul din Admin, nu pe zona publică `#sesizari`/`IssuesView.tsx`), deci nu reprezintă o contrazicere a unui verdict anterior, ci o constatare nouă a acestui audit transversal, mai cuprinzător.
4. **Fișiere modificate declarate vs. fișiere modificate real:** cele 10 fișiere din `git status --short` (Secțiunea 2) corespund exact cu ceea ce a fost descris ca fiind modificat în implementarea Etapei 5D — nicio discrepanță găsită aici.

---

## 18. Limitări Reale Verificate (prezentare onestă a arhitecturii)

Verificat explicit că limitările arhitecturale nu sunt prezentate înșelător nicăieri în aplicație sau în comentariile de cod:

| Limitare | Verificare | Status |
|---|---|---|
| `localStorage` nu este prezentat ca bază de date centralizată | Confirmat — toate serviciile numesc explicit `localStorage` în cod, fără pretenție de persistență server-side | **PASS** |
| Controlul client-side al permisiunilor nu este prezentat ca securitate server-side | Confirmat — arhitectura MVP este pur client-side, fără backend; niciun comentariu sau text UI nu pretinde altfel | **PASS** (dar vezi observația de mai jos) |
| E-mailul simulat nu este prezentat ca trimis efectiv | Confirmat — vocabularul explicit `simulated` este păstrat consecvent, nu este niciodată raportat ca `sent` | **PASS** |
| Marcajele locale de participare (sondaje) nu sunt prezentate ca mecanism definitiv anti-fraudă | Neschimbat față de Etapa 4 — nicio modificare în 5B–5G | **PASS** (moștenit) |
| Datele demo nu sunt prezentate ca date de producție | Confirmat — funcțiile `resetToDemo()` etc. sunt clar denumite și documentate ca atare | **PASS** |

**Observație importantă legată de onestitatea arhitecturală:** faptul că întregul sistem de permisiuni este exclusiv client-side (fără server care să impună regulile) este documentat corect ca limitare a arhitecturii MVP — NU este, în sine, defectul raportat la Secțiunea 4.2. Defectul de la Secțiunea 4.2 este calitativ diferit: nu este o limitare a controlului client-side "slab", ci o funcționalitate publică, complet neautentificată, care nu trece deloc prin stratul de autorizare (nici măcar cel client-side) — este pur și simplu neguardată.

---

## 19. Defecte și Observații

### 19.1 Defecte (necesită decizie/remediere într-o etapă viitoare — NU reparate acum)

1. **[CRITIC]** Ștergere fizică neautorizată, neautentificată, a sesizărilor cetățenilor, posibilă prin `IssuesView.tsx` (`#sesizari`, tab "Evidență Locală", buton "Șterge (Test 6)") → `reportService.deleteReport()`. Detalii complete în Secțiunea 4.2. Artefact preexistent din Etapa 3B, nu o regresie din 5B–5G, dar activ și exploatabil în starea curentă a aplicației.

### 19.2 Observații / Limitări (nu sunt defecte funcționale)

1. Jurnalul de e-mail (`emailService.getLogs()`) nu este afișat nicăieri în interfața de administrare (Secțiunea 6).
2. Rapoartele Etapei 5B–5G nu au fost persistate ca fișiere în proiect, doar livrate în conversație (Secțiunea 17, punctul 2).
3. Discrepanța de numărare "23 vs. 24 permisiuni" în documentație/instrucțiuni față de cod (Secțiunea 17, punctul 1).
4. Bundle JS de producție peste pragul de avertizare Vite (772.56 kB) — avertisment de performanță, nu funcțional.

---

## 20. Checkpoint Final Etapa 5

Conform regulii explicite din instrucțiuni: **"Nu acorda PASS global dacă există un FAIL relevant."**

- Toate verificările structurale, funcționale și de non-regresie din 5B, 5D, 5E, 5F, 5G, precum și partea din 5C limitată strict la comportamentul rolului `primarie_operator` în interiorul panoului Admin: **PASS**.
- Există însă un defect funcțional relevant, de severitate critică, confirmat direct prin cod și prin test real în browser: **ștergere neautorizată, neautentificată, a sesizărilor**, aflată în intersecție directă cu spiritul regulii explicite a Secțiunii 4 din instrucțiunile de audit ("integritatea datelor sesizărilor față de ștergere neautorizată").

### **VERDICT FINAL CHECKPOINT ETAPA 5: FAIL**

**Motiv:** deși niciun modul individual 5B/5D/5E/5F/5G nu prezintă, izolat, un defect funcțional, iar comportamentul specific al rolului `primarie_operator` respectă exact matricea aprobată, există un defect de securitate relevant — ștergere fizică a sesizărilor accesibilă public, fără autentificare — care afectează integritatea datelor exact în domeniul pe care Etapa 5C trebuia să-l protejeze explicit. Conform regulii instrucțiunilor, prezența acestui defect relevant împiedică acordarea unui verdict `PASS` global pentru Etapa 5.

Acest verdict **nu retrage** verdictele `PASS` individuale corect stabilite pentru 5B, 5D, 5E, 5F, 5G și pentru partea din 5C legată strict de comportamentul din Admin al rolului `primarie_operator` — toate rămân valide, izolat, așa cum sunt documentate în secțiunile de mai sus.

---

## 21. Regula de Ne-Remediere și Regula Finală de Oprire (confirmare de conformitate)

- Niciun defect identificat în acest audit nu a fost reparat.
- Nu s-a inițiat niciun ciclu nou de implementare.
- Nu s-a făcut `git commit`.
- Nu s-a făcut `git push`.
- Nu s-a modificat codul aplicației (`src/`) după finalizarea acestui raport — singurul fișier nou creat este acest document (`RAPORT_AUDIT_FINAL_ETAPA_5.md`), în rădăcina proiectului.
- Nu s-a șters niciun fișier.
- Nu s-a rescris arhitectura și nu s-au făcut refactorizări.
- **Etapa 6 NU a fost începută.**

**STOP. Aștept instrucțiunea dumneavoastră cu privire la constatarea de la Secțiunea 4.2 / 19.1 (vulnerabilitatea de ștergere publică neautentificată a sesizărilor) și la verdictul final al Etapei 5.**
