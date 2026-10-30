# FAZA 7 — ACTUALIZĂRILE REGISTRULUI DECIZIILOR (după E0.3)

**Proiect:** Urbis Activ (Turnu Măgurele Civic)
**Registrul de bază:** `docs/faza7/FAZA_7_E0_REGISTRU_DECIZII.md` (commitul `e4e775811129eafe286393900593e3f064dd095e`). Registrul de bază rămâne neschimbat.

Acest document consemnează, în ordine cronologică, schimbările de stare și deciziile luate după commitul E0.3, conform regulii din §3.1 a registrului de bază: schimbările ulterioare de stare se consemnează într-un document ulterior, nu prin reinterpretarea tabelului existent.

> **Acest document consemnează decizii. Nu autorizează implementarea.**
> E1/7C nu este autorizată. Lansarea publică nu este aprobată.

---

## 1. DEC-19 — rezerva 5 din 7B: închisă (varianta a), aprobată la 26.10.2026

**Decizia:** proprietarul a aprobat închiderea rezervei 5 din `FAZA_7B_RAPORT.md` §9 („Numărul exact de teste executate în CI pentru `7ca5940` nu a putut fi confirmat”), pe baza jurnalelor CI recuperate (varianta a din planul v2.4, §6).

**Baza:**

| Câmp | Valoare |
|---|---|
| Rularea CI | 40187048898 (workflow „CI”, prima încercare, declanșată de push, 25.10.2026) |
| Commitul | `7ca59409595ed7f2709a49fd5a4fbc7269e124d2` |
| Ramura | `faza-5-backend` |
| Criteriul aplicat | toate cele 6 joburi ale rulării, fiecare verificat separat |
| SHA-ul în jurnale | pasul de checkout din fiecare job confirmă SHA-ul complet `7ca59409595ed7f2709a49fd5a4fbc7269e124d2` |

**Rezultatele:**

| Jobul | Unitare | API | Integrare | Total | Eșuate / sărite / anulate / `todo` |
|---|---|---|---|---|---|
| backend (Node 20, MySQL 8.0) | 104/104 | 20/20 | 383/383 | 507/507 | 0 / 0 / 0 / 0 |
| backend (Node 20, MySQL 8.4) | 104/104 | 20/20 | 383/383 | 507/507 | 0 / 0 / 0 / 0 |
| backend (Node 24, MySQL 8.0) | 104/104 | 20/20 | 383/383 | 507/507 | 0 / 0 / 0 / 0 |
| backend (Node 24, MySQL 8.4) | 104/104 | 20/20 | 383/383 | 507/507 | 0 / 0 / 0 / 0 |
| backend (Node 24, MariaDB 11.4) | 104/104 | 20/20 | 383/383 | 507/507 | 0 / 0 / 0 / 0 |
| E2E (Python + Playwright) | — | — | — | `TOTAL: 276/276 PASS`, `REZULTAT: OK` (17 suite) | — |

**Proveniența dovezilor:**
- **E2E și backend (Node 20, MySQL 8.0):** citite întâi de proprietar, în interfața GitHub, la 26.10.2026; confirmate apoi prin extragerea automată a jurnalelor brute ale acestor joburi.
- **Celelalte patru joburi backend** (Node 20 / MySQL 8.4, Node 24 / MySQL 8.0, Node 24 / MySQL 8.4, Node 24 / MariaDB 11.4): recuperate automat la 26.10.2026 din jurnalele brute ale joburilor, prin browserul aplicației Claude, folosind sesiunea GitHub a proprietarului.
- Joburile Node 20 prezintă rezumatele `node:test` în format TAP (`# tests`, `# pass` …), iar joburile Node 24 în formatul „spec” (`ℹ tests`, `ℹ pass` …); câmpurile au aceeași semnificație.

**Concordanța:** valorile corespund celor raportate local în `FAZA_7B_RAPORT.md` §4: server 507; Python 272 + 4 verificări suplimentare (`test_7b5_popup_marker`) = 276.

**Efect:**
- Se închide **exclusiv rezerva 5** din `FAZA_7B_RAPORT.md` §9. Textul ei original rămâne în raport ca formulare istorică, însoțit de o actualizare datată.
- Celelalte rezerve 7B și celelalte decizii rămân neschimbate.
- E1/7C rămâne neautorizată.

---

## 2. Închiderea E0 — confirmată de proprietar la 26.10.2026

**Decizia:** proprietarul confirmă închiderea etapei E0 (planul v2.4, §2, „E0 — Aliniere”), pe baza criteriilor și a dovezilor deja acceptate.

**Baza:**
- planul v2.4 aprobat la 25.10.2026 (`docs/faza7/FAZA_7_PLAN_ACTIUNE_MVP_v2.4.md`); deciziile dinaintea 7C (DEC-2a/2b/2c, DEC-18, DEC-14, DEC-3, RN-5, R2) consemnate în registrul de bază, §2;
- perimetrul E1/7C închis la nivel de planificare: P1–P8, cu criteriile de acceptare din Anexa A a registrului de bază;
- documentația E0.3 publicată la commitul `e4e775811129eafe286393900593e3f064dd095e` (CI 40210977980, 6/6 joburi verzi);
- DEC-19 închisă (varianta a) prin commitul `97aa3a8498d61a61c8033db7af9fa122783a2780` (CI 40284714660, 6/6 joburi verzi); vezi §1.

**Limite:**
- Această consemnare nu închide anticipat niciun criteriu al checkpoint-ului 7C (planul v2.4, E1, criteriile 1–10). Rămân de îndeplinit, între altele, DEC-3b (după dovezile `source-map-js`) și clarificarea G6 (criteriul E1.10).
- Închiderea E0 nu autorizează singură implementarea; pornirea E1 se face numai prin aprobarea explicită a proprietarului, în forma R2 (registrul de bază, §2.5).
- Lansarea publică nu este aprobată.

---

## 3. DEC-3b — `source-map-js`: risc rezidual acceptat (varianta a), aprobată la 26.10.2026

**Decizia:** proprietarul acceptă riscul rezidual legat de `source-map-js` (planul v2.4, §6, DEC-3b, varianta a), cu condiția de mai jos.

**Dovezile** (26.10.2026; `docs/faza7/FAZA_7C_RAPORT.md` §1.1 și §3.1):
- după eliminarea `autoprefixer` (7C, P2, commitul `df5301edf7dcd1c6c425f16cd6985cf0f99499e1`), `source-map-js` 1.2.2 **rămâne** în arborele de dependențe, adus de `@tailwindcss/vite` → `@tailwindcss/node` și de `vite` → `postcss`; pachetul **nu** a fost eliminat complet;
- pachetul nu a fost găsit în artefactele verificate: build-ul frontend (`dist/`) și bundle-ul serverului (`server/dist/app.js`);
- `npm audit` din 26.10.2026 nu îl raportează. Avertismentul semnalat de reauditul Faza 6 (GHSA-68fv-2mgg-jv7q) privea versiunea 1.2.1.

**Condiția:** `npm audit` se reverifică înaintea E4. Dacă `source-map-js` este raportat din nou, decizia se redeschide.

**Limite:** decizia nu acoperă celelalte șapte constatări `npm audit` (`FAZA_7C_RAPORT.md` §1.2: `zod`, `vite`, `body-parser`, `nodemailer`, `smtp-server`, `fast-uri`, `fastify`). Ele rămân deschise, nu sunt acceptate definitiv și cer o decizie separată.

---

## 4. G6 — găzduirea de producție: închis (varianta a), confirmat la 26.10.2026; corectarea stării din planul v2.4

**Decizia:** proprietarul confirmă că G6 este închis, pe baza deciziei din 07.10.2026 privind găzduirea ClausWeb, și că **criteriul E1.10** (planul v2.4, E1) este îndeplinit pe baza dovezilor de mai jos.

**Documentele-sursă (neschimbate):**
- `docs/faza5/AMENDAMENT_MARIADB_SI_GAZDUIRE.md` (07.10.2026): „Închide **G6** (infrastructura de producție) și **G7** (domeniul)”; G6 = ClausWeb, plan „NodeJS1” cu cPanel, IP dedicat, „Remote SMTP”; baza de date MariaDB 11.4.13; Node 24.21.0;
- `docs/faza5/FAZA_5_RAPORT_FINAL.md`, rândul 45 („închide G6 și G7”) și rândul 53 (staging-ul este pe găzduirea de producție, G3);
- `docs/faza5/STAGING_URBISACTIV_JURNAL.md`, antetul (ClausWeb, „NodeJS1”, IP dedicat).

**Contradicția constatată (păstrată ca istoric):** planul v2.4 tratează G6 ca deschis: DEC-7 „G6, găzduirea de producție | DESCHISĂ / [DOVEZI]” (§6) și N-10 „starea G6” (§8); registrul de bază îl listează în §3.3 ca decizie rămasă. Starea era greșită la redactare: amendamentul din 07.10.2026 nu fusese verificat. Planul v2.4 și registrul de bază rămân neschimbate; starea în vigoare a G6 este cea din această înregistrare.

**Dovezile pentru criteriul E1.10** (nicio cerință a găzduirii nu impune cod nou în 7C):
- staging-ul `test.urbisactiv.ro` rulează pe aceeași găzduire, cu Node 24.21.0 și MariaDB 11.4.13; ultima verificare directă: `health` `0.0.0+711a7ae` (jurnalul staging-ului, intervenția 106);
- CI rulează jobul „backend (Node 24, MariaDB 11.4)”, verde la ultimele rulări (de exemplu 40284714660, la `97aa3a8`).

**Rămân pentru E4** (întrebări operaționale, fără cod; DEC-7 se consideră închis numai în privința alegerii găzduirii):
- dacă producția rulează ca a doua aplicație pe același cont și în ce limite ale planului;
- metoda de criptare a backup-ului și gestionarea cheii (planul v2.4, criteriul E4.11);
- reînnoirea găzduirii: plătită pe 3 luni de la 07.10.2026, conform amendamentului;
- reevaluarea `TRUST_PROXY` (DEC-4).

**Observație:** antetul amendamentului din 07.10.2026 menționa că amendamentul „nu a fost încă trimis la audit”; starea auditului nu a fost reverificată în documentele citite.

---

## 5. Antetul A4 (DEC-14) — forma aprobată la 26.10.2026

**Decizia:** proprietarul aprobă forma antetului implementată la 7C, P7 (commitul `a76f52413f328b3d24f1ec18df1340ba4a7ae035`, `src/components/layout/Header.tsx`): „Urbis Activ” ca nume principal; „Turnu Măgurele” ca text secundar, lângă nume, vizibil pe toate lățimile; subtitlul „Platformă Independentă · Teleorman” păstrat; navigarea neschimbată; eticheta „CIVIC” eliminată.

**Dovezile examinate:** capturile antetului la 1280 px (calculator) și la 375 px (mobil), făcute cu Playwright pe serverul construit din acest commit; testul RN-2 (`tests/ui/test_7c_redenumire.py`) verifică antetul la ambele lățimi.

**Efect:** forma antetului nu se mai modifică în 7C. Punctul deschis „Prezentarea antetului (A4)” din `docs/faza7/FAZA_7C_RAPORT.md` §4.3 este închis prin această înregistrare.

---

## 6. Notă de clarificare a stării — 26.10.2026

**Motivul:** bannerul de la începutul acestui document („E1/7C nu este autorizată. Lansarea publică nu este aprobată.”) reflectă starea de la redactarea lui. Bannerul rămâne neschimbat, ca istoric. Starea în vigoare este cea de mai jos.

**Starea la 26.10.2026:**
- **Pornirea E1/7C a fost autorizată** de proprietar la 26.10.2026, după închiderea E0 (§2), în forma R2 (registrul de bază, §2.5): commituri locale în perimetrul P1–P8, fiecare push aprobat separat.
- **P1–P8 sunt implementate în commituri locale și verificate local**, conform `docs/faza7/FAZA_7C_RAPORT.md` §3, §5 și §6. Verificările locale nu înlocuiesc CI (criteriul E1.1).

**Ce nu este aprobat:**
- **Checkpoint-ul 7C nu este acordat** (criteriul E1.9; `FAZA_7C_RAPORT.md` §6.5).
- **Push-ul celor 16 commituri locale** de pe `faza-5-backend` (`7e84e32` … `153ced1`) **nu este încă autorizat**.
- **Lansarea publică nu este aprobată.**

Această notă nu modifică înregistrările §1–§5.

---

## 7. Checkpoint-ul 7C — acordat la 26.10.2026

**Decizia:** proprietarul acordă checkpoint-ul 7C (planul v2.4, E1, criteriul 9) și consideră îndeplinit criteriul E1.5.

**Baza:**
- commitul final 7C `aa35706d3aa0df40133971869826e483179f9964` (`faza-5-backend`); rularea CI 40379976702, 6/6 joburi `success`;
- numerele testelor din jurnalele CI: unitare 104/104, API 25/25, integrare 389/389 pe fiecare dintre cele 5 joburi backend; E2E `TOTAL: 283/283 PASS`;
- clasificarea criteriilor E1.1–E1.10: `docs/faza7/FAZA_7C_RAPORT.md` §7.

**E1.5:** codul de diagnostic a fost eliminat (P3, `aed3cb7`; `.env.example`, `c391820`). Testele DG-1 și DG-2, care verifică absența rutei, se păstrează. Mențiunea istorică din `PROJECT_HANDOFF_CURRENT.md` rămâne pentru etapa 7D.

**Limite:**
- Cele șapte vulnerabilități `npm audit` (`FAZA_7C_RAPORT.md` §1.2) rămân deschise și cer o decizie separată. Condiția DEC-3b (reverificarea înaintea E4) rămâne în vigoare (§3).
- Întrebările operaționale G6 pentru E4 rămân deschise (§4).
- Închiderea 7C nu autorizează E2 sau alte etape; fiecare cere aprobare separată.
- Lansarea publică nu este aprobată.

---

## 8. R-NPM — remedierea dependențelor livrate, închisă la 27.10.2026

**Perimetrul:** aprobat separat de proprietar la 26.10.2026, după analiza read-only a celor șapte constatări `npm audit` (`FAZA_7C_RAPORT.md` §1.2). Numai actualizări patch sau minor, în aceeași versiune majoră; codul aplicației neschimbat.

**Commitul:** `5d8c52a5710acde2deda674c64136fcf0d25730c` (`faza-5-backend`), cu trei fișiere: `server/package.json`, `shared/package.json`, `package-lock.json`.

| Pachetul | Înainte | După |
|---|---|---|
| `zod` (server, shared) | 4.6.5 | 4.6.6 |
| `fastify` | 5.12.5 | 5.12.6 |
| `nodemailer` | 10.0.13 | 10.1.4 |
| `smtp-server` (numai pentru teste) | 3.19.16 | 3.19.24 |
| `fast-uri` (indirect) | 3.1.8 / 4.2.1 | 3.1.9 / 4.2.3 |
| `vite` (build) | 8.3.1 | 8.3.3 |
| `body-parser` (indirect, nelivrat) | 1.20.8 | 1.20.9 |

**Dovezile:**
- `npm audit` (verificare locală, nu în CI: workflow-ul CI nu rulează `npm audit`): rulat în mediul de lucru al lui Claude (containerul sesiunii), pe arborele de lucru curat, după modificare (26.10.2026) și din nou la 27.10.2026, cu rezultatul `found 0 vulnerabilities`; ieșirea acestor rulări nu este păstrată ca fișier. Reverificat la 27.10.2026, ~18:10 (ora României), la `f8271a6` (`package-lock.json` identic cu cel din `5d8c52a`), cu Node 22.23.4 și npm 10.9.9: `found 0 vulnerabilities` (info 0, low 0, moderate 0, high 0, critical 0; 334 de dependențe). Rezultatul reflectă baza de avertismente npm de la data rulării;
- verificarea locală completă după modificare (26.10.2026, înaintea commitului): typecheck, build-uri, unitare 104/104, API 25/25, integrare 389/389, E2E 283/283 (jurnalul verificării, în afara repository-ului);
- CI 40460197905, la `5d8c52a`: 6/6 joburi `success`; din jurnalele brute: unitare 104/104, API 25/25, integrare 389/389 pe fiecare job backend, E2E `TOTAL: 283/283 PASS`;
- `source-map-js` 1.2.2 rămâne în arborele de dependențe și nu apare în artefacte (condiția DEC-3b, §3, rămâne în vigoare: reverificare înaintea E4).

**Corectarea neconcordanței documentare:** afirmațiile despre cele șapte vulnerabilități `npm audit` din §3 (Limite), §7 (Limite) și din `FAZA_7C_RAPORT.md` (§1.2: „`npm audit` (26.10.2026) raportează 7 vulnerabilități: 3 mari, 3 moderate, 1 scăzută”; §6.2; §7.4) consemnează starea de la 26.10.2026, înaintea R-NPM. Ele rămân neschimbate, ca stări datate. Starea ulterioară, de la `5d8c52a`: `npm audit`, rulat local, nu raportează nicio vulnerabilitate (dovezile de mai sus).

**Limite:** remedierea nu este verificată cu serverul SMTP real (Brevo) pentru `nodemailer` 10.1.4; această probă cere aprobarea separată a proprietarului (manualul E2, §8.3). Checkpoint-ul 7C nu se redeschide.

---

## 9. Candidatul pentru E3: `5d8c52a` — consemnat la 27.10.2026

**Faptul:** codul candidat pentru E3 este cel de la `5d8c52a5710acde2deda674c64136fcf0d25730c` (CI 40460197905, 6/6 joburi `success`), indicat ca atare în ciorna manualului 7D. Commiturile ulterioare `e55c28e` (CI 40466609384), `cb0f569` (CI 40520875495) și `f8271a6` (CI 40534727547) conțin numai documentație: `git diff 5d8c52a f8271a6` atinge numai trei fișiere `.md`.

**Limita:** SHA-ul înscris în pachet (`RELEASE.txt`, numele arhivei) și în `health` este HEAD-ul clonei din care se construiește pachetul (`server/scripts/package-release.py`; `server/build.mjs`). Un pachet construit dintr-un commit de documentație ulterior are același cod, dar alt SHA, și cere CI verde pentru acel SHA (planul v2.4, E3, criteriul 1). SHA-ul exact care se instalează se stabilește la autorizarea E3.

**Ce NU înseamnă această consemnare:**
- nu autorizează pornirea E3 sau vreo operație pe staging;
- nu dovedește că instalarea a avut loc; ultima versiune consemnată ca instalată pe staging este `711a7ae` (`docs/faza5/STAGING_URBISACTIV_JURNAL.md`, intervențiile 99–100 și 106).

---

## 10. Pachetul de revenire pentru E3 — consemnat la 27.10.2026

| Câmp | Valoare |
|---|---|
| Fișierul | `civic-711a7ae.zip` |
| SHA-256 raportat | `64776c23be718d58d3d22211c629f3cda7d4e4c4ff225c4f9beaa29d197f9d5d` |
| `RELEASE.txt` | declară `711a7ae` |
| Concordanța | compatibil cu forma prescurtată consemnată la instalare (`64776c23…7f9d5d`, jurnalul staging-ului, intervenția 99); jurnalul nu conține forma completă |

**Proveniența:** amprenta completă și conținutul `RELEASE.txt` au fost **raportate de proprietar** la 27.10.2026 ca verificate anterior, în afara sesiunii de lucru cu Claude. Claude nu a verificat arhiva, iar în această consemnare ele nu au fost reverificate independent.

**Ce NU înseamnă:** consemnarea nu autorizează revenirea; condițiile din manualul E2, §4.9, rămân obligatorii.

---

## 11. E-mailul pe staging și în etapele următoare — regulile proprietarului; DEC-25 rămâne deschisă

**Regulile stabilite de proprietar (26.10.2026 și 27.10.2026):**
- dezvoltarea locală folosește `EMAIL_MODE=simulated`;
- staging-ul folosește `EMAIL_MODE=allowlist`, numai cu adresa de test a proprietarului;
- în etapa actuală nu se trimite niciun e-mail către primării;
- adresele oficiale ale primăriilor le introduce proprietarul când aplicația este gata;
- transmiterea reală se activează numai după o autorizare separată;
- subcontul administrativ al Primăriei este opțional și nu se confundă cu adresa destinatarului.

**Faptele confirmate de proprietar la 27.10.2026** (observații la acea dată): `EMAIL_ALLOWLIST` de pe staging conținea exclusiv adresa lui de test; panoul Admin afișa modul „staging: numai adresele din listă”, destinatarul fluxului era adresa de test, iar fluxul era pornit.

**DEC-25** (planul v2.4, §6: „gardul de e-mail până la E6”; (a) fluxul către Primărie oprit; (b) destinatar de test controlat și adresa reală absentă din `EMAIL_ALLOWLIST`, cu lista verificată la fiecare operație) **rămâne deschisă**. Regulile de mai sus sunt compatibile cu varianta (b), dar proprietarul nu a ales formal o variantă pentru E4–E6, iar planul cere ca gardul să nu rămână „o presupunere bazată doar pe `allowlist`” (§12). Alegerea formală este necesară înaintea E4/E7.

**Ce NU înseamnă această consemnare:** nu autorizează nicio probă de e-mail, nicio trimitere și nici pornirea E3.

---

## 12. DEC-5 și DEC-6 — corecturile documentare publicate la 27.10.2026; DEC-5 rămâne deschisă

**Commitul:** `f8271a66d1829cd0a62900293e4975f9900bfc5f` (`faza-5-backend`, 27.10.2026), publicat; CI 40534727547, 6/6 joburi `success`. Fișierele modificate: `PROJECT_RULES_AND_DECISIONS.md` (§13.2, rândurile 364 și 365) și `docs/faza5/FAZA_5_5B_GHID.md` (antetul). Textele au fost aprobate de proprietar înaintea aplicării, după amprentele propunerilor; commitul și push-ul au fost aprobate separat. Commitul conține numai documentație.

### DEC-5 (planul v2.4, §6) — DESCHISĂ

Planul v2.4 definește DEC-5 ca „C2 (restaurarea marcată «neexersată» vs. M4), C4 (moderarea din fluxul critic), C5 (handoff) și corectura observației 4 din jurnal privind `TRUST_PROXY`”, cu criteriul „confirmarea tuturor punctelor”.

| Punctul | Starea la `f8271a6` | Ce s-a consemnat / ce lipsește |
|---|---|---|
| C2 | **aplicat și publicat** | `PROJECT_RULES_AND_DECISIONS.md` §13.2, rândul 365: formularea „neexersată” păstrată ca istoric, cu o actualizare datată: restaurarea cu `restore:db` a fost exersată pe staging la 13.10.2026 (M4; jurnalul staging-ului, intervențiile 41–48), cu versiunea `27b1b5f`; `restore:db` cu codul 7A nu a fost probat pe staging (`FAZA_7A_RAPORT.md` §9); restaurarea de probă în producție rămâne cerință E4 |
| `TRUST_PROXY` (rândul 364) | **actualizarea documentară aplicată și publicată** | formularea „de rezolvat înainte de lansare” păstrată ca istoric, cu o actualizare datată: lipsa adresei reale a vizitatorului este o **limitare acceptată, nu o problemă rezolvată** (AI-1, varianta A; varianta B, D-B1…D-B5; DEC-4). **Limitarea tehnică nu a fost remediată**; `TRUST_PROXY` rămâne nesetat, iar reevaluarea la G6 rămâne pentru E4 (§4). Rândul 364 nu este numit explicit în textul DEC-5; corectura privește aceeași formulare ca observația 4 |
| C4 | **neaprobată, neaplicată** | propunerea privește `README.md` (rândul 4: „moderate și afișate pe hartă”) |
| observația 4 din jurnal | **neaprobată, neaplicată** | `docs/faza5/STAGING_URBISACTIV_JURNAL.md`, observația 4 („Trebuie rezolvat înainte de lansare”) |
| C5 | **propunere în curs de actualizare, neaprobată** | `PROJECT_HANDOFF_CURRENT.md`; propunerea anterioară descria `cb0f569` ca stare curentă și trebuie refăcută față de `f8271a6` |

**Starea:** criteriul „confirmarea tuturor punctelor” nu este îndeplinit (C4, C5 și observația 4 sunt deschise). **DEC-5 rămâne DESCHISĂ.** Statutul din planul v2.4 rămâne neschimbat.

### DEC-6 — antetul istoric al ghidului 5.5B, aplicat și publicat

**Ce s-a aplicat:** antetul de la începutul `docs/faza5/FAZA_5_5B_GHID.md`: ghidul a fost executat la 08.10.2026 pe staging-ul nou `test.urbisactiv.ro`; pașii lui corespund intervențiilor 11–16 și 19 din jurnalul staging-ului; intervențiile 17–18, din același interval, privesc fereastra de parolă a lacătului și nu sunt pași ai ghidului; ghidul descrie contextul staging-ului vechi (`civic-test.electrovolt.ro`, retras la 09.10.2026); în vigoare este manualul 7D; starea „pregătit, neexecutat” rămâne ca istoric.

**Diferența față de textul din plan:** criteriul DEC-6 din planul v2.4 (§6) indică „intervențiile 11–19”. Antetul aplicat precizează 11–16 și 19 și explică separat 17–18, conform jurnalului. Formularea a fost aprobată de proprietar înaintea aplicării.

**Ce rămâne:** rândul „domeniul Civic (G7), **încă nedecis**” din ghid nu este marcat individual ca istoric; antetul declară istorică numai starea „pregătit, neexecutat”. Ghidul marcat istoric este și livrabil E5 (planul v2.4, E5). Această consemnare nu declară DEC-6 închisă; dacă antetul aplicat satisface integral criteriul DEC-6 este decizia proprietarului.

**Ce NU înseamnă această consemnare:** nu închide DEC-5, nu închide E2 și nu autorizează E3.

---

## 13. E2 / 7D-ciornă — autorizarea începerii și publicarea manualului (evenimente din 27.10.2026; consemnare ulterioară)

**Natura acestei secțiuni:** evenimentele de mai jos s-au petrecut la 27.10.2026. Secțiunea este o **consemnare adăugată ulterior** acelor evenimente. Nu este o dovadă creată la momentul lor. Ea reunește:
- fapte verificabile în Git și în CI (punctul 2);
- aprobări date în conversația de lucru, a căror sursă este indicată pentru fiecare (punctele 1 și 3).

Registrul §7 consemnează că închiderea 7C „nu autorizează E2 sau alte etape; fiecare cere aprobare separată”. Secțiunile §1–§12 rămân neschimbate.

**1. Autorizarea începerii E2 (27.10.2026, dimineața) — întinderea exactă neconfirmată.**
- Proprietarul a autorizat începerea E2 în conversația de lucru, după închiderea R-NPM.
- Mesajul original al autorizării **nu este disponibil**: nu este în repository și nici în înregistrările de lucru accesibile la redactarea acestei consemnări.
- Singura sursă pentru întinderea autorizării este un **rezumat** al conversației. Potrivit lui, autorizarea era limitată la ciorna manualului de instalare și operare (planul v2.4, §10.1), cu marcajele de lucru și fără modificări în alte fișiere.
- Întinderea exactă și formularea autorizării sunt, de aceea, **neconfirmate**.
- Starea „E2/7D-ciornă în curs, nefinalizată” este confirmată în scris în instrucțiunea transmisă de proprietar la 27.10.2026, după-amiaza.

**2. Publicarea documentelor și rezultatele CI (fapte verificabile, distincte de aprobări):**

| Commitul | Data commitului | Conținutul | CI |
|---|---|---|---|
| `e55c28ed8786d8bac605f2add12585a82263f7ce` | 27.10.2026, 09:19 | prima ciornă a `docs/faza7/FAZA_7D_MANUAL_INSTALARE_OPERARE_CIORNA.md` (401 rânduri), marcată „CIORNĂ — de finalizat după 7E” | 40466609384, 6/6 `success` |
| `cb0f569408b57f3ae1d098d0466bddfc1a86d245` | 27.10.2026, 16:08 | revizia manualului: §4.0.1 (E3 fără suspendarea cron-ului `outbox:process`, ca propunere), punctele de control PC1–PC4 | 40520875495, 6/6 `success` |
| `f8271a66d1829cd0a62900293e4975f9900bfc5f` | 27.10.2026, 17:45 | corecturile DEC-5 (C2, `TRUST_PROXY`) și antetul DEC-6 (§12) | 40534727547, 6/6 `success` |

Prezența acestor commituri pe `origin/faza-5-backend` și rulările CI dovedesc publicarea și rezultatul testelor. Ele **nu** dovedesc, singure, aprobările.

**3. Aprobările individuale (sursa: conversația de lucru; limitarea sursei indicată).**
- **Pentru `e55c28e` și `cb0f569`:** aprobarea textului, a commitului și a push-ului, date separat, sunt cunoscute numai din **rezumatul** conversației. Mesajele originale nu sunt disponibile, iar orele aprobărilor nu sunt consemnate în repository.
- **Pentru `f8271a6`:** aprobarea textelor după amprentele propunerilor și aprobările separate de commit și push au fost date în conversația din 27.10.2026, după-amiaza. Nici ele nu sunt consemnate în repository.
- Aprobarea publicării unui text **nu** aprobă propunerile pe care textul le descrie ca neaprobate.

**4. Propunerea „E3 fără suspendarea cron-ului `outbox:process`”: neaprobată.** Starea rezultă din textul manualului, verificabil în Git:
- În `e55c28e`, manualul recomanda suspendarea temporară a sarcinii cron și preciza că aceasta „nu este aprobată”.
- În `cb0f569`, varianta s-a schimbat într-o propunere de E3 **fără** suspendare, cu verificările PC1–PC4. Manualul o declară „supusă aprobării proprietarului (neaprobată la redactare, 27.10.2026)” și „Până la aprobare, nu constituie o decizie” (§4.0.1; §0; §10, punctul 9).
- Nu este consemnată nicio decizie ulterioară. Propunerea rămâne **neaprobată**, iar orice operație pe cron rămâne interzisă fără aprobare explicită.

**5. Închiderea E2: neconfirmată.** E2 nu este închisă. Planul v2.4 (E2) cere ciornele din §10.1, fiecare marcată „CIORNĂ — de finalizat după 7E”, cu fiecare comandă și variabilă verificată față de cod. La data consemnării rămân deschise, între altele:
- C4, C5 și observația 4 (DEC-5, §12);
- acoperirea comenzilor CLI și a R20 în manual;
- ciorna procedurii pentru ultimul `super_admin` (T-N5), care depinde de DEC-22.

**Ce NU înseamnă această consemnare:** nu închide E2, nu schimbă statutul DEC-5, DEC-6 sau DEC-25, nu aprobă propunerile din manual și nu autorizează E3. Lansarea publică nu este aprobată.

---

## 14. DEC-5, punctul C4 — interpretarea fluxului critic; corectarea asocierii C4 ↔ `README.md:4` (28.10.2026)

Această secțiune este o notă ulterioară. Ea nu modifică §12 și §13, care rămân ca istoric.

### 14.1 Interpretarea C4, consemnată la cererea proprietarului la 28.10.2026

**Fluxul critic aplicabil** este cel din `docs/AMENDAMENTE_PLAN_V1_1_SI_MASTER_PLAN.md` §1 (28.09.2026, aprobat de proprietar, P-13, varianta A):

> Cetățean (cont) → DB → Hartă (imediat) → E-mail către Primărie (numai la cerere) → `în analiză` → `rezolvată` (subcontul Primăriei)

Pe scurt:
- cetățeanul depune sesizarea din contul lui;
- sesizarea se salvează și apare imediat pe hartă, **fără moderare**;
- transmiterea către Primărie are loc **numai la cererea cetățeanului**;
- urmează stadiile „în analiză” și „rezolvată”.

**Planul v2.4, E7** (rândul 309: „Cetățean → DB → E-mail → Admin → Hartă. Moderarea a fost eliminată prin amendament (C4) …”) **se interpretează în acest sens**:
- moderarea nu este un pas al fluxului și nu se testează;
- e-mailul către Primărie nu este un pas obligatoriu înaintea afișării pe hartă.

Planul v2.4 rămâne neschimbat.

**Sursele faptelor:**
- planul v1.1 (în afara repository-ului), rândul 98, conținea pasul „Moderare”; amendamentul îl înlocuiește;
- `docs/faza4/FAZA_4_REGISTRU_DECIZII.md`, rândurile 49–50 (D9, A-2; 2.3: „Nu există moderare”);
- `PROJECT_RULES_AND_DECISIONS.md`, rândurile 70 și 296;
- `docs/faza5/FAZA_5_RAPORT_FINAL.md`, rândul 188.

**Limitele interpretării:**
- Nu modifică regulile transmiterii către Primărie:
  - transmiterea este opțională, la cererea cetățeanului (`docs/faza4/FAZA_4_REGISTRU_DECIZII.md`, pct. 7, „C-4”: un cod al Fazei 4, distinct de C4 din planul v2.4);
  - A17-3 rămâne înlocuit, conform `PROJECT_RULES_AND_DECISIONS.md`, rândul 283.
- Nu modifică A17-1 (confirmarea scrisă a Primăriei; `agreementReference`) și nu modifică DEC-25 (gardul de e-mail până la E6), care rămâne **deschisă**.
- Pentru C4 nu se modifică alte documente prin această consemnare.

### 14.2 Corectarea asocierii C4 ↔ `README.md:4`

În §12 (tabelul DEC-5, rândul C4), C4 este asociat cu propunerea privind `README.md` (rândul 4: „moderate și afișate pe hartă”). Asocierea era greșită și rămâne în §12 ca istoric.

Formularea din README despre moderare aparține constatării **N2** (`docs/faza6/FAZA_6_REAUDIT_SECURITATE.md`, rândul 344; `docs/faza7/FAZA_7_PLAN.md`, rândul 43), nu lui C4. Registrul de bază (`docs/faza7/FAZA_7_E0_REGISTRU_DECIZII.md`, rândul 69) programează corectura N2 de la `README.md:4` în **7D-final** (S4, adică E5). README nu se modifică prin această consemnare.

**Propunerea anterioară `2_C4.diff`** (corectura `README.md:4`, pregătită în afara repository-ului, neaprobată și neaplicată) **este retrasă ca propunere C4**, pentru că asocia greșit N2 cu C4. O eventuală corectură N2 se tratează separat, în E5 sau printr-o decizie distinctă de devansare.

### 14.3 Starea DEC-5 după această consemnare

| Punctul | Starea |
|---|---|
| C2 | aplicat și publicat (§12) |
| `TRUST_PROXY`, rândul 364 | actualizarea documentară aplicată și publicată (§12); limitarea tehnică nu este remediată |
| C4 | interpretarea fluxului critic consemnată (§14.1) |
| observația 4 din jurnal | neaprobată, neaplicată (§12) |
| C5 | propunere neaprobată (§12) |

**DEC-5 rămâne DESCHISĂ.** Această consemnare **nu** închide DEC-5. Statutul din planul v2.4 rămâne neschimbat.

**Ce NU înseamnă această consemnare:** nu modifică observația 4, C5, E2, DEC-6 sau DEC-25 și nu autorizează E3. Lansarea publică nu este aprobată.

---

## 15. E3 — deciziile proprietarului pentru pregătire și pachetul candidat (28.10.2026); E3 rămâne neautorizată

Această secțiune consemnează deciziile de pregătire a E3, luate de proprietar la 28.10.2026, după auditul pachetului de pregătire. **Ea nu autorizează E3.** Autorizarea E3 este o aprobare separată a proprietarului.

### 15.1 Deciziile

| # | Decizia | Precizări |
|---|---|---|
| D1 | **versiunea instalată: `5d8c52a5710acde2deda674c64136fcf0d25730c`** (CI 40460197905, 6/6 `success`) | pachetul descris la §15.2; după instalare, `health` trebuie să arate `0.0.0+5d8c52a` |
| D2 | **E3 se face fără suspendarea cron-ului `outbox:process`**: proprietarul aprobă propunerea din manual, §4.0.1, și **acceptă explicit riscul rezidual** | Verificările PC1–PC4 sunt un control de detectare, nu o barieră împotriva trimiterilor (manualul, §4.0.1, „Ce dovedește comparația”). În modul `allowlist`, codul blochează destinatarii din afara listei (`server/src/reports/outbox.ts` 239–242). Cât timp lista conține numai adresa de test, efectul maxim este un e-mail neașteptat către adresa de test. Dacă PC1 nu poate fi verificat sau condițiile din §4.0.1 nu sunt îndeplinite, instalarea **se oprește** |
| D3 | **singurul e-mail permis în testele E3 este codul de autentificare (A2), către adresa de test a proprietarului** | Proba Brevo completă (manualul, §8.3: notificarea sesizării, actualizarea de stare, proba negativă) se face separat, mai târziu, cu aprobare separată. Transmiterea către Primărie și notificările rămân oprite în toate testele |
| D4 | **matricea de testare pe telefon A0–A7 este aprobată** (Android/Chrome; iPhone/Safari numai dacă există un dispozitiv) | detaliată la §15.3 |
| D5 | fereastra de timp: **nedecisă** | se stabilește după ce pachetul, backup-ul și pachetul de revenire sunt pregătite și verificate; ziua, în afara intervalului 03:00–06:30 (manualul, §4) |

### 15.2 Pachetul candidat (construit local, 28.10.2026)

| Câmp | Valoare |
|---|---|
| Fișierul | `civic-5d8c52a.zip` (22 de fișiere, 1.394.962 B) |
| SHA-256 | `4ffcaec4678ca5bb7bedc7cfc98dec2d125096f65cf12ebc49a211c069f0f231` |
| Construit din | o clonă curată a `5d8c52a`, cu `npm ci`, `npm run build`, `npm run build -w server`, `python3 server/scripts/package-release.py` (fără `--bootstrap-email`); arborele de lucru a rămas curat, deci fără sufixul `-dirty` |
| Mediul de construire | containerul de lucru al lui Claude; Node 22.23.4, npm 10.9.9 |
| `RELEASE.txt` | `commit: 5d8c52a` |
| Versiunea compilată | `0.0.0+5d8c52a` (`server/dist/app.js`) |
| Conținutul | `dist/`, `server/dist/`, migrațiile `0001`–`0002`, `server/seeds/`, `server/data/`, `package.json` cu scripturile „Run JS script” (fără `civic-bootstrap-admin`); fără fișiere `.env*` și `.map` |

Amprenta identifică **acest fișier**. O reconstruire din același commit produce o arhivă cu alte date ale fișierelor, deci altă amprentă. Fișierul instalat trebuie să fie exact acesta.

Pachetul de revenire `civic-711a7ae.zip` rămâne cel din §10 (raportat de proprietar, neverificat independent). Disponibilitatea lui se verifică înaintea instalării (manualul, §4.9).

### 15.3 Matricea de testare pe telefon (A0–A7)

Toate probele sunt **NEVERIFICATE** până la execuție. Fiecare rezultat se consemnează în jurnalul staging-ului, cu dovada indicată.

| # | Proba | Rezultatul așteptat | Dovada |
|---|---|---|---|
| A0 | `GET /api/v1/health` | `{"status":"ok","version":"0.0.0+5d8c52a"}` | captură |
| A1 | harta: mutare, zoom, atingerea unui marker, închiderea cu „×” | fără suprapuneri; fereastra se închide | confirmarea proprietarului |
| A2 | autentificarea cetățeanului cu cod pe e-mail | codul sosește la adresa de test; sesiunea rămâne după reîncărcare | captură, fără codul vizibil |
| A3 | sesizare cu „Poziția mea” (GPS) și fotografie din galerie, **fără** transmitere către Primărie și fără notificări | pinul apare la poziția reală; se primește `TM-XXX`; sesizarea apare imediat pe hartă | captură |
| A4 | aceeași sesizare în Admin, pe telefon | apare în listă, cu stadiul „nouă” | captură |
| A5 | autorul șterge sesizarea de probă | dispare de pe hartă și din Admin; numărul TM nu se refolosește | confirmarea proprietarului |
| A6 | Admin, după circa 7 minute cu ecranul oprit | se consemnează ce se întâmplă (raportul 7B, §7.1.2); **probă de observație, nu criteriu de trecere** | captură |
| A7 | antetul pe mobil | „Urbis Activ” și „Turnu Măgurele”, fără „CIVIC” | captură |

Limitările acceptate (camera directă, HEIC; raportul 7B, §7.1.3) nu sunt criterii de trecere.

### 15.4 Avertismentul `npm audit` din 28.10.2026 (`qs`)

**Constatarea:** la construirea pachetului (28.10.2026, ~07:09, ora României; containerul de lucru; `npm audit` la `5d8c52a`) s-a raportat o vulnerabilitate moderată:
- pachetul: `qs` 6.16.0 (GHSA-6pq8-jhm2-2vcw);
- calea: `altcha-lib` 2.5.0 → `express` 4.22.3 → `qs` și `body-parser` → `qs`.

Starea din §8 („found 0 vulnerabilities”, 27.10.2026, ~18:10) **rămâne valabilă ca stare datată**. După acea dată a apărut acest avertisment nou.

**Verificarea:** codul specific `qs` nu a fost găsit în artefactul livrat (`server/dist/app.js` și `dist/assets/`). Pachetul nu este, deci, inclus în ce se instalează.

**Decizia proprietarului (28.10.2026):** E3 se face cu `5d8c52a` (D1). Remedierea `qs` se tratează separat, **înaintea E4**, odată cu reverificarea `npm audit` cerută de DEC-3b (§3).

### 15.5 Ce NU înseamnă această consemnare

- Nu autorizează E3 și nici vreo operație pe staging, cPanel, cron sau `civic.env`.
- Nu autorizează vreo trimitere de e-mail, în afara celei din D3, după autorizarea E3.
- Nu modifică DEC-5, DEC-25 sau A17-1.
- Lansarea publică nu este aprobată.

---

## 16. Deciziile proprietarului care deblochează E4: DEC-16, DEC-21–DEC-25 și metoda T-N5 (28.10.2026)

Proprietarul a ales opțiunile de mai jos la 28.10.2026, ~09:51–09:55, în conversația de lucru. Opțiunile sunt cele din planul v2.4, §6 (rândurile 558 și 563–567). Planul v2.4 rămâne neschimbat; starea în vigoare a acestor decizii este cea de aici.

### 16.1 Deciziile

| Decizia | Opțiunea aleasă | Ce rămâne de făcut |
|---|---|---|
| **DEC-21** — restricția de acces în producție până la E9 | **(a)** lacăt cu parolă la nivelul găzduirii (cPanel → Directory Privacy), ca pe staging | se activează înaintea pornirii aplicației pe `urbisactiv.ro`; testul fără credențiale trebuie refuzat; se menține până la aprobarea E9. Fereastra de parolă repetată (401) este rezolvată pe staging prin `AMENDAMENT_ME_OPTIONAL.md` (jurnalul staging-ului, observația 2) |
| **DEC-22** — minimum două conturi `super_admin` active, pe dispozitive separate | **(a)** obligatoriu. Ambele conturi aparțin proprietarului, pe dispozitive fizice diferite; codurile de recuperare ale fiecărui cont se păstrează pe hârtie, separat de dispozitive | al doilea cont se creează și se verifică în producție, în E4 |
| **T-N5** — recuperarea ultimului `super_admin` (planul v2.4, rândul 463) | metoda de ultimă instanță **O2**: intervenție directă în baza de date (phpMyAdmin), care reproduce efectul resetării TOTP pe contul blocat, urmată de înrolarea impusă la autentificare | procedura scrisă pas cu pas (ciornă E2, în manualul 7D) și aprobată înaintea E4. Operația nu lasă audit în aplicație și se consemnează manual |
| **DEC-23** — copie de backup în afara contului de găzduire | **(a)** copie externă criptată, cu acces restrâns și retenție documentată | metoda (de exemplu descărcarea periodică a celei mai recente copii pe calculatorul proprietarului, într-o arhivă criptată), cheia, frecvența și retenția se stabilesc și se verifică înaintea E4, împreună cu cerințele GDPR (planul v2.4, E4.11) |
| **DEC-24** — branch-ul-sursă pentru instalarea de producție | **(a)** `faza-5-backend`, la SHA-ul aprobat | `main` nu se actualizează; SHA-ul exact se aprobă separat, la autorizarea E4 |
| **DEC-25** — gardul de e-mail până la E6 | **(a)** fluxul către Primărie **oprit** în producție | fluxul se pornește numai după poarta E6, prin decizie separată. Pe staging rămâne starea actuală (fluxul pornit, destinatarul = adresa de test, `allowlist`) până la o decizie contrară. Proba R19 cu mesaj `on_hold`, dacă procedura E4 o permite (planul v2.4, rândul 567) |
| **DEC-16** — monitorizarea `backup.log`, a cozii de e-mail și a `health` | operatorul: **proprietarul**; frecvența inițială: **zilnic**; trecerea la verificarea săptămânală: **numai prin decizia explicită a proprietarului**; dovezile: o evidență datată a proprietarului, în afara repository-ului, fără secrete și adrese; escaladarea: consemnare și investigare prin citire, în aceeași zi; orice acțiune cu efect, numai cu aprobarea proprietarului | se consemnează în manualul 7D (§6.3); criteriul E4.14 cere și consemnarea limitărilor jurnalelor suprascrise |

### 16.2 Efectul asupra E4

Deciziile care blocau E4 prin lipsa unei alegeri (DEC-21–DEC-25) au acum o opțiune aleasă. **E4 nu este autorizată** prin această consemnare. Înaintea E4 rămân, între altele:
- procedura T-N5 scrisă și aprobată;
- detaliile DEC-23;
- remedierea `qs` și reverificarea `npm audit` (§15.4; DEC-3b);
- eventuala remediere O-E3-1 (jurnalul staging-ului, observația 20), care ar cere un candidat nou și o reinstalare pe staging;
- întrebările operaționale G6 (§4);
- închiderea E3.

### 16.3 Ce NU înseamnă această consemnare

- Nu autorizează E4 și nici vreo operație pe staging, cPanel, cron sau `civic.env`.
- Nu modifică DEC-5 (rămâne deschisă) sau A17-1 (rămâne în vigoare).
- Lansarea publică nu este aprobată.

---

## 17. Candidatul `85d3c45` și E3-bis (28–29.10.2026): remedierea `qs` și O-E3-1; E3 rămâne neînchisă

### 17.1 Deciziile proprietarului

| Data | Decizia |
|---|---|
| 28.10.2026 | E3 a fost autorizată și executată cu `5d8c52a` (jurnalul staging-ului, intervențiile 107–132). Secțiunea 15 („E3 rămâne neautorizată”) consemnează starea de dinaintea autorizării și rămâne neschimbată, ca stare datată |
| 28.10.2026 | perimetrul de cod aprobat: (1) `qs` 6.16.0 → 6.16.2 (§15.4); (2) textul nou pentru O-E3-1, când locația telefonului este oprită. Mesajul pentru refuzul permisiunii rămâne neschimbat. O-E3-2 nu intră în perimetru |
| 29.10.2026 | E3-bis (instalarea `85d3c45` pe staging) se face în aceeași zi; consemnările, la final |
| 29.10.2026, ~08:25 | **E3-bis autorizată**, cu regulile: cron-ul activ (ca la D2, §15.1); **niciun e-mail** în teste; punctele de control PC1–PC4 (plus PC5 după probele pe telefon); revenirea, la nevoie, cu `civic-5d8c52a.zip` (§15.2) |

### 17.2 Candidatul

**Commitul:** `85d3c45ba4065dafff830d6893f45e901a0de40b` (`faza-5-backend`), `fix: qs 6.16.2 (GHSA-6pq8-jhm2-2vcw) and clearer message when phone location is off (O-E3-1)`.

| Dovada | Rezultatul |
|---|---|
| diferența față de `5d8c52a`, în afara documentației | numai `package-lock.json` (`qs` 6.16.0 → 6.16.2) și un rând în `src/components/report/LocationPicker.tsx` |
| verificarea locală (containerul de lucru, Node 22.23.4, npm 10.9.9; 28.10.2026) | typecheck, build-uri, unitare 104/104, API 25/25, integrare 389/389, E2E 283/283; `npm audit`: `found 0 vulnerabilities` |
| CI 40660830188, la `85d3c45` | 6/6 joburi `success` |

### 17.3 Pachetul instalat

| Câmp | Valoare |
|---|---|
| Fișierul | `civic-85d3c45.zip` (22 de fișiere, 1.395.003 B) |
| SHA-256 | `7b61820cfa59dfc0f67144e5b06cd373eb82ebf924c4aec5ab34987bec4d3890`; verificat de proprietar pe calculatorul lui, înaintea instalării |
| Construit din | o clonă curată a `85d3c45`, la 29.10.2026, ~08:19, cu aceiași pași ca la §15.2 (fără `--bootstrap-email`; fără sufixul `-dirty`) |
| `RELEASE.txt` | `commit: 85d3c45` |
| Comparația cu `civic-5d8c52a.zip` (Claude, după instalare) | `server/dist/app.js` identic, cu excepția SHA-ului înscris; `dist/index.html` identic, cu excepția numelui fișierului JavaScript; `package.json` diferă numai prin versiune; diferă fișierul JavaScript al frontendului (textul O-E3-1). Restul fișierelor sunt identice |

### 17.4 Starea punctelor deschise

| Punctul | Starea |
|---|---|
| avertismentul `qs` (§15.4) | **rezolvat** în `85d3c45`; `npm audit` local: 0 vulnerabilități (28.10.2026). Reverificarea `npm audit` cerută de DEC-3b (§3) înaintea E4 **rămâne** |
| O-E3-1 (jurnalul staging-ului, observația 20.1) | **rezolvat** și verificat pe telefon la 29.10.2026 (intervenția 146) |
| O-E3-2 (observația 20.2) | **deschis**: decizie de produs separată |
| O-E3-3 (observația 22): Admin și contul de cetățean împart același cookie | **nou, deschis**: decizie de produs separată; nicio schimbare de cod |
| probele pe iPhone/Safari | **NEVERIFICATE** (niciun dispozitiv) |

### 17.5 Criteriile de închidere E3 pentru `85d3c45` (planul v2.4, E3, marcate [PROPUNERE] în plan)

| # | Criteriul | Starea | Dovada |
|---|---|---|---|
| 1 | SHA identificat; `health` și CI pe exact acel SHA | **îndeplinit** | `0.0.0+85d3c45` pe calculator și pe telefon; CI 40660830188 (intervențiile 139, 143) |
| 2 | noindex pe rădăcină, pe un fișier static, pe API și în `robots.txt` | **îndeplinit** | intervenția 141 |
| 3 | cele 4 sarcini cron, cu dovadă | **îndeplinit** | captura din 28.10.2026 (intervenția 117); cron-ul nu a fost atins de atunci |
| 4 | ieșirea primei rulări `purge:retention` după instalare | **îndeplinit pentru `5d8c52a`** (intervenția 130). Pentru `85d3c45`: codul serverului este identic (§17.3); prima rulare pe `85d3c45` este în noaptea de 29/30.10.2026 | intervenția 130; §17.3 |
| 5 | `backup.log` arată o copie reușită după instalare | **îndeplinit pentru `5d8c52a`** (intervenția 129). Pentru `85d3c45`: aceeași situație ca la criteriul 4 | intervenția 129; §17.3 |
| 6 | noindex activ (`SEARCH_INDEXING` absent sau `off`) | **îndeplinit** | antetele (intervenția 141); `civic.env` modificat ultima dată la 13.10.2026, înaintea introducerii variabilei (intervenția 132) |
| 7 | ruta de diagnostic nu mai răspunde | **îndeplinit** | intervenția 141 |
| 8 | fusul orar al orelor cron consemnat | **îndeplinit** | intervenția 131 |
| 9 | opțional: `host-restore:recover --check` | **neefectuat** | nu a fost cerut |

**Închiderea E3** rămâne o decizie a proprietarului. Pentru criteriile 4 și 5, proprietarul poate alege între:
- a accepta dovada de pe `5d8c52a`, cu codul serverului identic;
- a aștepta citirea `purge.log` și `backup.log` după noaptea de 29/30.10.2026.

### 17.6 Ce NU înseamnă această consemnare

- Nu închide E3 și nu autorizează E4 sau vreo operație pe staging, cPanel, cron sau `civic.env`.
- Nu autorizează vreo trimitere de e-mail.
- Nu modifică DEC-5 (rămâne deschisă), DEC-25 sau A17-1.
- Lansarea publică nu este aprobată.

---

## 18. Închiderea E3 — decisă de proprietar la 29.10.2026, ~10:11

**Decizia:** E3 este **închisă**, cu versiunea **`85d3c45ba4065dafff830d6893f45e901a0de40b`** instalată pe staging (CI 40660830188; `health` `0.0.0+85d3c45`). Proprietarul a ales varianta A dintre cele două prezentate:
- **A (aleasă):** închiderea acum;
- **B:** închiderea după citirea jurnalelor din noaptea de 29/30.10.2026.

**Temeiul:** criteriile 1–3 și 6–8 sunt îndeplinite pe `85d3c45` (§17.5). Pentru criteriile 4 și 5 (prima rulare `purge:retention` și o copie de noapte reușită după instalare), proprietarul **acceptă dovada din noaptea de 28/29.10.2026**, obținută pe `5d8c52a` (jurnalul staging-ului, intervențiile 129–130). Motivul: `server/dist/app.js` din `civic-85d3c45.zip` este identic cu cel din `civic-5d8c52a.zip`, cu excepția SHA-ului înscris (§17.3). Criteriul 9 (opțional) nu a fost efectuat.

**Limita acceptată:** pe `85d3c45` nu există încă o rulare de noapte. Jurnalele din noaptea de 29/30.10.2026 se citesc în monitorizarea zilnică (DEC-16, §16.1), ca verificare obișnuită, **nu ca o condiție a închiderii**. Un rezultat neconform se consemnează și se tratează conform DEC-16.

**Rămân deschise, fără să blocheze închiderea E3:**
- O-E3-2 și O-E3-3: decizii de produs (§17.4);
- probele pe iPhone/Safari: NEVERIFICATE;
- proba Brevo completă (manualul 7D, §8.3): aprobare separată;
- condițiile de intrare în E4 din §16.2, mai puțin cele rezolvate prin §17 (`qs`, O-E3-1) și prin această închidere.

**Ce NU înseamnă această consemnare:**
- Nu autorizează E4 și nici vreo operație pe staging, cPanel, cron sau `civic.env`.
- Nu autorizează vreo trimitere de e-mail.
- Nu modifică DEC-5 (rămâne deschisă), DEC-25 sau A17-1.
- Lansarea publică nu este aprobată.

---

## 19. Precizări după auditul independent al închiderii E3 (29.10.2026)

Auditul independent al pachetului de închidere E3 (Aristotel, 29.10.2026) a acceptat închiderea ca decizie a proprietarului, cu dovadă echivalentă pentru criteriile 4–5 (§18), și nu a cerut o rundă nouă de documentare. Auditorul nu a putut accesa GitHub din sesiunea lui, deci auditul privește logica și documentarea, nu o certificare a stării publicate. Precizările de mai jos completează §17 fără să o rescrie (regula din §3.1 a registrului de bază).

| Punctul | Precizarea |
|---|---|
| §17.5, criteriile 4–5 | Formularea corectă: E3 a fost **închisă prin decizia proprietarului, cu dovadă echivalentă acceptată** pentru criteriile 4–5, nu cu verificări făcute după instalarea exactă a `85d3c45` |
| §17.5, criteriul 6 | **Limita:** `civic.env` nu a fost citit. Dovada este indirectă: antetele noindex, data modificării fișierului (13.10.2026, anterioară variabilei `SEARCH_INDEXING`) și faptul că aplicația a pornit (valoarea `on` ar opri pornirea pe staging, `server/src/config.ts` 204–207) |
| §17.3 și CI | CI-ul verde la `85d3c45` dovedește verificările automate pe acel commit, nu proveniența artefactului instalat. Proveniența se sprijină pe probele luate împreună: amprenta arhivei verificată de proprietar, `RELEASE.txt` și `health` |
| §17.4, O-E3-3 | **Izolarea rolurilor este verificată în cod și în teste** (jurnalul staging-ului, observația 22, corectura din 29.10.2026). Rolul se stabilește din sesiunea din baza de date, nu din numele cookie-ului. Testul de integrare din CI verifică izolarea în ambele direcții. Constatarea este **de utilizare**, nu de securitate. Testul comportamental pe telefon (trecerea Admin ↔ cetățean, reîncărcarea, închiderea browserului) se propune pentru probele pe telefon din E4; decizia asupra unei eventuale schimbări rămâne a proprietarului |

**Ce NU înseamnă această consemnare:** nu redeschide E3 și nu modifică §18; nu autorizează E4, vreo operație pe staging sau vreo schimbare de cod; DEC-5 rămâne deschisă, iar DEC-25 și A17-1 rămân neschimbate.

---

## 20. Prima noapte pe `85d3c45` — completare la §18 (30.10.2026)

Monitorizarea zilnică din 30.10.2026 (DEC-16; jurnalul staging-ului, intervenția 148) arată, pentru noaptea de 29/30.10.2026, prima pe `85d3c45`:
- copia `civic-backup-20261030T011702447Z`, reușită;
- rularea `purge:retention`, fără erori.

**Efectul:** criteriile 4 și 5 ale E3, închise la §18 cu dovadă echivalentă de pe `5d8c52a`, au acum și **dovadă directă pe `85d3c45`**. Limita acceptată la §18 este astfel acoperită. Închiderea E3 rămâne cea din §18; această completare nu o modifică.

**O-E3-3, ipoteza privind crearea celei de-a doua sesiuni de cetățean din 28.10.2026:** `oauthAttempts` din `purge.log` numără înregistrările de pornire a fluxului Google șterse după expirare, nu autentificări (verificat în cod; jurnalul staging-ului, observația 22, completarea din 30.10.2026). Valoarea 1 din noaptea de 28/29.10.2026 este compatibilă cu ipoteza că a doua sesiune din 28.10.2026 a fost creată prin Google, dar nu o dovedește. Ipoteza rămâne **dedusă**.

**O-E3-3, nuanțarea concluziei din §19:** formularea din §19, „constatarea este de utilizare, nu de securitate”, este prea categorică și este nuanțată prin prezenta completare, după cum urmează: analiza codului și testele de integrare susțin izolarea rolurilor la nivelul verificat; prin aceste verificări nu a fost identificată o problemă de autorizare. Comportamentul pe telefon la trecerea Admin ↔ cetățean nu a fost încă testat. Până la efectuarea testului, observația este tratată ca problemă de utilizare, **fără a exclude definitiv orice risc de securitate**. §19 rămâne neschimbată, ca stare datată (regula din §3.1 a registrului de bază).

**Ce NU înseamnă această consemnare:** nu autorizează E4 sau vreo operație pe staging; DEC-5 rămâne deschisă, iar DEC-25 și A17-1 rămân neschimbate.

---

## 21. DEC-5: observația 4 publicată; C4 confirmat de proprietar (30.10.2026); DEC-5 rămâne deschisă

Această secțiune completează §12 și §14.3, care rămân neschimbate, ca stări datate (regula din §3.1 a registrului de bază).

### 21.1 Observația 4 din jurnalul staging-ului — aplicată și publicată la 28.10.2026

§12 și §14.3 descriu observația 4 ca „neaprobată, neaplicată”. Starea s-a schimbat după redactarea lor, iar schimbarea nu a fost consemnată în registru până acum.

| Câmp | Valoare |
|---|---|
| Commitul | `a10e8e122d297583be8b576a0e2952403bf667e5` (`docs: clarify accepted TRUST_PROXY limitation in staging journal`), 28.10.2026 |
| CI | 40633232172, `success` |
| Conținutul | `docs/faza5/STAGING_URBISACTIV_JURNAL.md`, observația 4: actualizarea „Actualizare din 28.10.2026 (DEC-5, observația 4)”. Formularea „Trebuie rezolvat înainte de lansare” este declarată depășită și păstrată ca istoric; lipsa adresei reale a vizitatorului este o limitare acceptată (DEC-4, AI-1), nu o problemă rezolvată |
| Aprobările | textul, commitul și push-ul au fost aprobate separat de proprietar în conversația de lucru din 28.10.2026; nu sunt consemnate în repository |

Limitarea tehnică rămâne: `TRUST_PROXY` nu este setat. Reevaluarea ei rămâne între întrebările operaționale ale E4 (§4).

### 21.2 C4 — confirmat de proprietar la 30.10.2026

Proprietarul confirmă că interpretarea fluxului critic din §14.1 este suficientă pentru C4 (varianta a). Nu se cer alte modificări. Corectura formulării despre moderare din `README.md`, rândul 4, aparține constatării N2 și rămâne pentru E5 (§14.2).

### 21.3 Starea DEC-5

| Punctul | Starea |
|---|---|
| C2 | aplicat și publicat (`f8271a6`, §12) |
| `TRUST_PROXY`, rândul 364 din `PROJECT_RULES_AND_DECISIONS.md` | aplicat și publicat (`f8271a6`, §12); limitarea tehnică nu este remediată |
| observația 4 | aplicată și publicată (`a10e8e1`, §21.1) |
| C4 | confirmat de proprietar (§21.2) |
| C5 | **deschis**: actualizarea `PROJECT_HANDOFF_CURRENT.md` |

**DEC-5 rămâne DESCHISĂ.** După publicarea C5, proprietarul va decide separat dacă sunt îndeplinite condițiile pentru închiderea DEC-5.

**Ce NU înseamnă această consemnare:** nu închide DEC-5 sau E2; nu autorizează E4 sau vreo operație pe staging; DEC-25 și A17-1 rămân neschimbate. Lansarea publică nu este aprobată.

---

## 22. Închiderea DEC-5 — decizia proprietarului (30.10.2026)

Această secțiune completează §21, care rămâne neschimbată, ca stare datată (regula din §3.1 a registrului de bază).

Proprietarul decide închiderea DEC-5, după finalizarea și publicarea tuturor punctelor prevăzute:

- C2 — aplicat și publicat (`f8271a6`);
- `TRUST_PROXY` — clarificarea documentară aplicată și publicată (`f8271a6`); limitarea tehnică rămâne acceptată conform DEC-4 și va fi reevaluată la G6/E4;
- observația 4 — aplicată și publicată (`a10e8e1`), consemnată în §21.1;
- C4 — confirmat de proprietar, consemnat în §21.2;
- C5 — handoff actualizat și publicat (`930749c`).

CI-ul a trecut pentru commiturile de consemnare `bd04c4b` (41017364561) și `930749c` (41019091378).

**DEC-5: ÎNCHISĂ la 30.10.2026, prin decizia explicită a proprietarului.**

**Ce NU înseamnă această consemnare:** închiderea DEC-5 nu închide E2, nu autorizează E4 sau operațiuni pe staging și nu modifică DEC-25, A17-1 ori statutul lansării publice.

---

## 23. DEC-23 — detaliile copiei externe criptate, decise la 30.10.2026

Proprietarul a aprobat deciziile D23-1–D23-7 la 30.10.2026, ~11:50–11:53, în conversația de lucru, după evaluarea propunerii DEC-23-P1 și auditul ei independent (Aristotel). **Implementarea este amânată până la apropierea fazei de testare.** §16 rămâne neschimbat: acolo DEC-23 = (a) este consemnată ca principiu („copie externă criptată, cu acces restrâns și retenție documentată”); această secțiune stabilește detaliile cerute acolo.

### 23.1 Obiectivul

O procedură pentru realizarea, protejarea, verificarea și păstrarea unei copii externe a datelor Urbis Activ, pentru recuperare în cazul pierderii totale a serviciului de găzduire.

### 23.2 Temeiul tehnic (verificat în cod la 30.10.2026, numai prin citire)

- O copie `backup:db` este un director `civic-backup-<UTC>/` cu `db.jsonl.gz`, `manifest.json`, `photos/` și instantaneul marcajelor; datele sunt comprimate, **necriptate**, și conțin date personale (`server/src/db/backup.ts` 36–38, 328).
- Marcajele operaționale vii stau în `BACKUP_DIR`, lângă copii (`server/src/db/markers.ts` 68–73, 154). Fără ele, restaurarea într-un `BACKUP_DIR` gol este refuzată sau poate readuce date șterse (`markers.ts` 182–200).
- Fiecare copie exclude sesizările mai vechi de 45 − 7 = 38 de zile față de momentul backup-ului, iar copiile de pe găzduire se păstrează 7 zile; astfel, nicio copie nu conține date de sesizare mai vechi de 45 de zile (`backup.ts` 1–6, 98, 124, 369–381). O copie externă păstrată mai mult de 7 zile de la backup-ul din care provine ar depăși această limită.

### 23.3 Deciziile

**D23-1 — Conținutul și formatul.** Pachetul extern conține ultimul backup complet `civic-backup-<UTC>/` și cei cinci markeri operaționali: `deletions/`, `account-deletions/`, `account-deletions-pending/`, `report-counter-watermark.json`, `account-markers-initialized.json`. Nu se includ `civic.env` și nici copii de backup mai vechi. Pachetul se arhivează în format 7z, cu AES-256 și criptarea numelor fișierelor activată.

Arhiva temporară necriptată creată pe găzduire se creează **în afara docroot-ului** și se șterge **imediat după descărcare**. Arhiva necriptată descărcată pe calculator se șterge **definitiv** (fără Coșul de reciclare) **imediat după criptare**.

**D23-2 — Frecvența.** O copie externă pe săptămână, lunea, din **backup-ul automat din acea noapte** (cel mai recent).

**D23-3 — Retenția.** O singură copie externă, păstrată cel mult **șapte zile de la data backup-ului din care provine** (data din numele `civic-backup-<UTC>`). Nu se păstrează simultan mai multe copii externe.

**D23-4 — Înlocuirea și eșecul unei copii noi.** În ziua copiei săptămânale:
1. se realizează noul pachet;
2. se verifică integritatea și amprentele criptografice (D23-6);
3. se consemnează rezultatul;
4. în aceeași zi se șterge copia externă precedentă.

Dacă realizarea sau verificarea noii copii eșuează, copia precedentă se șterge tot în aceeași zi, pentru respectarea D23-3. Intervalul fără o copie externă validă se consemnează până la prima copie nouă realizată și verificată cu succes.

**D23-5 — Stocarea și protecția.** Copia externă se păstrează local, pe calculatorul proprietarului, cu posibilitatea unui dispozitiv USB suplimentar. Nu se folosesc servicii cloud pentru această procedură în MVP. Înainte de prima copie reală:
- se activează BitLocker pe unitatea folosită pentru stocare;
- parola arhivei este aleatorie, de cel puțin 20 de caractere (sau 6 cuvinte aleatorii), și se păstrează într-un manager de parole și pe hârtie, în locuri separate;
- cheia de recuperare BitLocker se păstrează separat de parola arhivei.

Activarea BitLocker nu face parte din operațiile imediate; se face înainte ca prima copie reală să ajungă pe calculator.

**D23-6 — Verificarea și restaurarea.** La fiecare copie externă:
1. deschiderea și decriptarea arhivei cu parola;
2. testarea integrității arhivei cu 7-Zip;
3. compararea SHA-256 al `db.jsonl.gz` cu valoarea din `manifest.json`;
4. calcularea SHA-256 al arhivei `.7z`;
5. înregistrarea rezultatului și a amprentei în evidența DEC-16.

Prima restaurare dintr-o copie externă se face în cadrul probei de restaurare din E4. Trimestrial se verifică separat parola păstrată pe hârtie, deschizând copia curentă cu ea, nu cu parola din managerul de parole.

**D23-7 — Exersarea pe staging.** Înaintea primei copii externe reale din producție, procedura se exersează pe staging, numai cu date de test: selectarea backup-ului și a markerilor, comprimarea, descărcarea, criptarea, verificarea integrității și ștergerea arhivei temporare necriptate de pe găzduire. Exercițiul cere aprobare separată înaintea executării.

### 23.4 Riscurile reziduale acceptate

| Riscul | Tratamentul |
|---|---|
| pierderea totală a găzduirii între două copii externe | risc acceptat; pierderea potențială de date este limitată la cel mult șapte zile prin frecvența săptămânală |
| reapariția unor sesizări sau conturi șterse după copia externă | risc acceptat; markerii externi reflectă numai starea de la momentul copiei; datele șterse ulterior pot reapărea la o restaurare făcută după pierderea găzduirii |
| pierderea sau compromiterea calculatorului care păstrează arhiva | redus prin BitLocker și prin criptarea AES-256 a arhivei |
| pierderea parolei arhivei | redus prin păstrarea ei în managerul de parole și pe hârtie, în locuri separate, și prin testul trimestrial |
| eșecul restaurării pe altă infrastructură | verificat prin proba de restaurare din E4 |

### 23.5 Evidența

Pentru fiecare copie externă se consemnează în evidența DEC-16, cel puțin: data și ora backup-ului-sursă, data realizării copiei externe, numele backup-ului, amprenta SHA-256 a arhivei, rezultatul verificării și ștergerea copiei precedente.

### 23.6 Condițiile de implementare

- Exercițiul pe staging și prima implementare pe producție sunt operații distincte, fiecare cu aprobare explicită.
- DEC-23 privește copia din afara găzduirii. **Criptarea copiilor de pe găzduire (planul v2.4, E4.11) rămâne de decis separat.**
- Calculatorul care păstrează copia devine un loc de stocare a datelor personale; aspectul se tratează în politica de confidențialitate.

**Ce NU înseamnă această consemnare:** nu autorizează operații pe găzduire, pe staging sau pe producție și nu modifică configurația aplicației; nu închide E4 și nu decide E4.11; nu modifică DEC-25 sau A17-1. Lansarea publică nu este aprobată.

---

## 24. E4.11 — criptarea copiilor de pe găzduire: varianta V1, planul r3.2 și deciziile P1–P10 (30.10.2026); implementarea nu este autorizată

Această secțiune consemnează deciziile proprietarului privind criteriul E4.11 din planul v2.4 („metoda de criptare, gestionarea cheii și dovada verificării sunt de definit la G6”). Criteriul și planul v2.4 rămân neschimbate. DEC-23 (§23) privește copia din afara găzduirii; această secțiune privește copiile din `BACKUP_DIR`.

### 24.1 Deciziile E411-1 și E411-2 (30.10.2026, ~12:33)

| Decizia | Conținutul |
|---|---|
| **E411-1** | varianta **V1**: criptare asimetrică integrată în `backup:db`. Varianta cu criptare ulterioară printr-o sarcină cron (V2) este **respinsă**: ar fi scos copiile din mecanismele care reunesc marcajele de ștergere din toate copiile și din protecțiile R18 (`server/src/db/backup.ts` 712–740, 946–955; `server/src/db/markers.ts` 164–180). Varianta cu cheie simetrică păstrată pe găzduire nu oferă protecție față de un atacator din cont |
| **E411-2** | pregătirea unui plan de implementare, cu observațiile auditului independent incluse |

### 24.2 Acceptarea planului r3.2 (30.10.2026, ~15:18–15:20)

Planul `PLAN_E411_criptare_backup.md`, versiunea **r3.2**, este acceptat de proprietar ca **bază documentară** pentru E4.11, după patru runde de audit independent (Aristotel, 30.10.2026):

| Versiunea | Verdictul auditului |
|---|---|
| r1 | necesită revizie |
| r2 | aproape aprobabilă; cinci sarcini |
| r3 | necesită o ultimă revizie documentară; șase corecturi |
| r3.1 | aproape aprobabilă; trei clarificări |
| r3.2 | acceptată ca bază pentru deciziile P1–P9; două observații păstrate ca cerințe de implementare |

Planul este păstrat **în afara repository-ului** (302 rânduri; SHA-256 `5f82b0a77088e60890952940459c5ea2e5b0c17b4a926bfcb4f305218a2f3476`). Acceptarea lui nu aprobă codul, testele sau vreo operație.

### 24.3 Deciziile P1–P10 (30.10.2026, ~15:20)

| # | Decizia |
|---|---|
| **P1** | implementarea criptografică: **A2, formatul standard age** (`age-encryption.org/v1`: X25519, HKDF-SHA256, ChaCha20-Poly1305 în segmente de 64 KiB, antet autentificat), prin pachetul `age-encryption`, **fixat la o versiune exactă**. Varianta A1 (implementare proprie) rămâne numai ca alternativă documentată |
| **P2** | `manifest.json` și `markers.json` rămân **în clar** (ID-uri interne, datele ștergerilor, volumul datelor; fără nume, adrese, texte sau fotografii); consecvența lor cu fișierele criptate se verifică prin `binding.json.age` |
| **P3** | cheia publică este **obligatorie în producție** (lipsa ei oprește pornirea); opțională pe staging |
| **P4** | decriptarea se face **numai pe calculatorul proprietarului**; identitatea (cheia privată) nu ajunge niciodată pe găzduire |
| **P5** | Node 24 portabil pe calculator, pentru `backup:decrypt` și `backup:verify`; `age.exe` opțional, pentru verificarea independentă a fiecărui fișier |
| **P6** | fraza-parolă a identității este **distinctă** de parola arhivelor 7z (DEC-23) |
| **P7** | **retrasă**; D23-6 (§23) rămâne **neschimbat**: verificarea completă la fiecare copie externă |
| **P8** | fereastra de **60 de minute** pentru copia decriptată pe găzduire, la o restaurare: **țintă operațională, nu garanție de securitate**; staging-ul se oprește pe durata restaurării; la depășire, prioritatea este finalizarea sigură și ștergerea controlată |
| **P9** | limita acceptată: criptarea cu cheie publică **nu dovedește autorul copiei** față de un atacator din cont. După o compromitere se restaurează numai o **copie de încredere**, creată înaintea începutului estimat al compromiterii și dovedită independent de găzduire (P10). **Fără copie de încredere, recuperarea unor date autentice nu este garantată.** Cu retenția de 7 zile (D23-3), o compromitere nedetectată mai mult de circa 7 zile nu lasă nicio copie de încredere |
| **P10** | evidența DEC-16 a copiilor externe are o **dată verificabilă, care nu poate fi modificată din găzduire** (condițiile la §24.4) |

### 24.4 Condițiile de implementare

**Evidența independentă a copiilor externe (P10), precizată de proprietar:**
- amprenta SHA-256 a arhivei `.7z` se calculează **pe calculatorul personal**, după obținerea copiei externe, **nu** de aplicația de pe găzduire;
- după fiecare copie, proprietarul își trimite un e-mail **din căsuța personală, din afara cPanel**, cu: data și ora UTC (pentru identificare), **numele copiei** și **amprenta SHA-256 a arhivei**;
- **dovada momentului** este **marcajul de timp de primire generat de furnizorul de e-mail**, nu data și ora scrise în corpul mesajului, care pot fi modificate înainte de trimitere;
- astfel, o găzduire compromisă nu poate fabrica retroactiv o evidență pentru o copie falsă și nu poate modifica mesajul deja primit în căsuța externă;
- **protecția presupune că și calculatorul, și căsuța personală sunt de încredere.**

**Testele (din auditul planului r3.2):**
- testul la nivelul sistemului de fișiere (`strace`) folosește o listă **exactă** a căilor permise pentru fișierele de marcaje, nu o acceptare generică;
- ieșirile standard ale comenzilor conțin **numai mesaje de diagnostic**, niciodată conținutul bazei de date, fotografii sau alte date în clar; testul verifică acest lucru;
- testul de memorie este un **test de regresie** pentru comportamentul în flux, **nu** o garanție absolută a limitei de memorie: eșantionarea la 10 ms poate rata un vârf foarte scurt;
- confirmările marcate [I] în plan (semnătura interfeței de flux a bibliotecii, comportamentul la o dimensiune declarată greșit, vectorii publici age) se fac **înaintea** scrierii codului.

**Ordinea:** cod și teste → audit independent al modulului de criptare și al `backup:verify` → candidat nou, CI pe SHA-ul exact și `npm audit` → reinstalare pe staging (ca la E3-bis) → probă pe staging (operație separată, combinabilă cu D23-7) → consemnarea în DEC-23 a modificărilor D23-1, D23-5 și D23-6 descrise în plan (§8).

### 24.5 Implementarea nu este autorizată

Acceptarea planului r3.2 și deciziile P1–P10 **nu autorizează** scrierea codului, adăugarea dependenței, commiturile, push-ul sau vreo operație pe staging, producție, cPanel, cron sau `civic.env`. Implementarea are **checkpoint propriu**, cu codul, testele și CI prezentate înaintea oricărui commit, cu aprobări separate.

**Ce NU înseamnă această consemnare:** nu bifează criteriul E4.11 (lipsesc implementarea și dovada); nu închide E4 și nu o autorizează; nu modifică DEC-23 (modificările ei se consemnează după implementare), DEC-25 sau A17-1. Lansarea publică nu este aprobată.

---

## 25. Răspunsul ClausWeb din 30.10.2026; corectarea limitei de procese; propunerea de monitorizare a spațiului (DEC-16) — consemnări documentare

Această secțiune este **strict documentară**. Nu deschide și nu decide G6-1 (producția ca a doua aplicație pe același cont) și nu modifică deciziile publicate: §4 (G6), §16 (DEC-16), §23 (DEC-23), §24 (E4.11). Documentele anterioare rămân neschimbate.

### 25.1 Răspunsul ClausWeb din 30.10.2026

**Sursa:** răspunsul echipei de suport ClausWeb la tichetul proprietarului, transmis de proprietar în conversația de lucru la 30.10.2026, ~11:27. Textul integral nu este păstrat în repository. Valorile sunt **raportate de furnizor**, neverificate independent.

| Subiectul | Ce a comunicat furnizorul |
|---|---|
| aplicațiile Node.js | serviciul „NodeJS1” permite mai multe aplicații Node.js în același cont cPanel, în limita resurselor; sunt posibile două aplicații distincte, una pentru `urbisactiv.ro` și una pentru `test.urbisactiv.ro`, fiecare cu directorul și configurația ei. În prezent este configurată aplicația `civic-test-app`, pentru `test.urbisactiv.ro`, cu Node.js 24, activă |
| resursele | alocate la nivelul **întregului cont**, nu per aplicație: CPU până la 8 core; RAM 4096 MB; **NPROC 100** (numărul maxim de procese); **EP 35** (Entry Processes, procese de intrare simultane). Toate aplicațiile contului folosesc în comun aceste limite |
| bazele de date | maximum 99 de baze MySQL/MariaDB; fără limită de dimensiune per bază; spațiul lor intră în cota totală de **15 GB** a serviciului; 100 de conexiuni simultane per utilizator MySQL |
| izolarea contului | CloudLinux OS cu CageFS: mediul de execuție al contului este separat de celelalte conturi de pe server; CPU, RAM și procesele sunt limitate prin CloudLinux LVE |

**Întrebări fără răspuns în acest mesaj:** datele exacte de expirare (găzduirea, IP-ul dedicat, domeniul); tichetul despre `X-Forwarded-For` (`TRUST_PROXY`, jurnalul staging-ului, observația 11).

**Observație de analiză, nu decizie:** CageFS separă **conturile**, nu aplicațiile din același cont; două aplicații din același cont rulează sub același utilizator de sistem. Observația este relevantă pentru G6-1, care rămâne **deschisă**.

### 25.2 Corectarea limitei de procese (NPROC)

`docs/faza5/AMENDAMENT_MARIADB_SI_GAZDUIRE.md`, rândul 26, consemnează, din răspunsurile furnizorului din 07.10.2026 („neverificate încă în practică”), „limita de **50 de procese** și 4 GB RAM”.

Furnizorul comunică la 30.10.2026 (§25.1): **NPROC = 100** și, distinct, **EP = 35**.

| Limita | Ce înseamnă | Valoarea comunicată de furnizor la 30.10.2026 |
|---|---|---|
| NPROC | numărul maxim de procese ale contului | **100** (nu 50) |
| EP | numărul maxim de procese de intrare simultane (cereri care intră în același timp în aplicațiile contului) | **35** |

Cele două valori nu se confundă: EP 35 nu este o corectură a valorii 50, ci o limită diferită. Amendamentul rămâne neschimbat, ca istoric. În evidența documentară, valorile comunicate de furnizor la 30.10.2026 **înlocuiesc** informația anterioară, **fără a pretinde o verificare tehnică independentă** a lor.

### 25.3 DEC-16 — monitorizarea spațiului ocupat: propunere, neaprobată

**Starea:** **propunere, neaprobată.** DEC-16, așa cum a fost decisă (§16) și consemnată în manualul 7D (§6.3), rămâne neschimbată: controalele în vigoare sunt `backup.log`, coada de e-mail și `health`, zilnic.

**Originea:** analiza din 30.10.2026 a răspunsului ClausWeb (cota de 15 GB comună pentru tot serviciul) și evaluarea DEC-23 a auditorului independent, care a recomandat-o ca propunere suplimentară pentru DEC-16, nu ca parte a DEC-23.

**Motivul:** cota de 15 GB este comună pentru tot serviciul de găzduire. **Staging-ul existent consumă deja** din ea: baza de date, fotografiile active și cele 7 copii zilnice de pe găzduire. **Producția ar consuma din aceeași cotă numai dacă se aprobă găzduirea ei în acest cont** (G6-1, încă deschisă); impactul bazei, al fotografiilor și al copiilor de backup ale producției este, deocamdată, un **scenariu condiționat de decizia G6-1**. Epuizarea cotei ar afecta aplicațiile contului și ar opri backup-urile.

**Conținutul propus (de decis de proprietar):**
- un control **lunar**, numai prin citire, al spațiului ocupat față de cota de 15 GB (cPanel, informația despre spațiul folosit);
- consemnarea valorii în evidența DEC-16;
- un prag de atenționare (de exemplu 75 % din cotă) și escaladarea după regula DEC-16: consemnare și investigare prin citire; orice acțiune cu efect numai cu aprobarea proprietarului.

Frecvența, pragul și locul exact al citirii se stabilesc la decizie. Până atunci, propunerea nu face parte din controalele DEC-16.

**Ce NU înseamnă această consemnare:** nu decide G6-1, G6-4 sau `TRUST_PROXY`; nu modifică DEC-16, DEC-23, E4.11, DEC-25 sau A17-1; nu autorizează E4 sau vreo operație pe staging, producție ori cPanel. Lansarea publică nu este aprobată.
