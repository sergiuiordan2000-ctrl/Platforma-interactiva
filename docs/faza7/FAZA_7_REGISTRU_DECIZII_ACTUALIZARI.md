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

---

## 26. DEC-16 — completările D16-a și D16-b; amânarea propunerii §25.3 (31.10.2026)

Proprietarul a confirmat la 31.10.2026, ~08:31, în conversația de lucru, că **DEC-16 rămâne neschimbată**, așa cum a fost decisă la 28.10.2026 (§16; manualul 7D, §6.3): operatorul este **proprietarul**, frecvența este **zilnică**, iar trecerea la verificarea săptămânală se face numai prin decizia lui explicită. Această secțiune **completează** două puncte rămase deschise, fără să modifice §16 sau cerințele planului v2.4 (§6, rândul 558; E4, criteriul 14).

### 26.1 D16-a — locul evidenței (dovada cerută de E4.14)

- Evidența verificărilor se păstrează într-un **fișier Excel pe calculatorul proprietarului**, **în afara repository-ului**, cu conținutul definit în manualul 7D, §6.3 („Dovezile”): data și ora, operatorul, rezultatul fiecărui control (conform / neconform / imposibil de verificat) și observațiile; fără secrete, adrese de e-mail sau numele contului.
- **Neconformitățile** se consemnează, în plus, printr-un **e-mail al proprietarului către el însuși**, din căsuța personală. E-mailul **nu** se folosește pentru confirmările zilnice fără incidente.

### 26.2 D16-b — zilele fără verificare (varianta 1)

- O zi în care verificarea nu poate fi efectuată se consemnează în evidență ca **„neefectuată”**.
- La revenirea operatorului se verifică **jurnalele disponibile** pentru perioada respectivă, cu menționarea explicită a limitărilor: `outbox-cron.log` și `surveys-cron.log` se suprascriu și arată numai ultima rulare; `backup.log` și `purge.log` păstrează istoricul (manualul 7D, §6.3, „Limitările consemnate”).
- **Nu se reconstruiesc și nu se declară verificări care nu au avut loc.**

### 26.3 D16-c — valorile de producție

Rămân pentru **E5**, conform planului v2.4 și manualului 7D, §6.3 („Aplicabilitatea”). Nicio decizie acum.

### 26.4 Propunerea §25.3 (monitorizarea spațiului) — amânată

Propunerea din §25.3 se **amână până la clarificarea G6-1**. Ea **nu** se introduce în DEC-16 și **nu** este o condiție suplimentară a criteriului E4.14, care enumeră exact trei controale: `backup.log`, coada de e-mail și `health`.

**Ce NU înseamnă această consemnare:** nu modifică decizia DEC-16 din 28.10.2026 (§16) sau cerințele planului v2.4; nu decide G6-1; nu modifică DEC-23, E4.11, DEC-25 sau A17-1; nu autorizează E4 sau vreo operație pe staging, producție ori cPanel. Lansarea publică nu este aprobată.

---

## 27. DEC-8 (D7-4, matricea CI) — varianta (c1), implementată și validată prin CI; propunere de închidere (31.10.2026)

### 27.1 Decizia

| Element | Conținutul |
|---|---|
| definiția din plan | planul v2.4, §6, rândul 550: DEC-8 = „D7-4, matricea CI”; variantele (a) matricea actuală, (b) redusă, (c) actuală + versiunea de producție; recomandarea „(a) până la G6, apoi (c)”. G6 este închis din 26.10.2026 **numai în privința alegerii găzduirii** (ClausWeb; §4); decizia **G6-1**, privind arhitectura producție/staging (aceeași găzduire sau nu, §25), **rămâne deschisă** |
| varianta aleasă | **(c1)**: matricea actuală, cu cele șase joburi **păstrate integral**, plus **un job backend fixat pe versiunile exacte de producție**: Node.js **24.21.0** și MariaDB **11.4.13** (valorile consemnate din cPanel la 07.10.2026, `docs/faza5/AMENDAMENT_MARIADB_SI_GAZDUIRE.md` §2) |
| aprobările | analiza (31.10.2026, ~08:55–09:06); propunerea și cele două verificări suplimentare (expansiunea matricei, amprenta imaginii); aplicarea diff-ului `ci_c1.r2.diff` (~09:22); commitul și push-ul, aprobate separat |
| starea | **propunere de închidere a DEC-8 pentru varianta (c1)**, în urma implementării și validării prin CI (§27.3). **Închiderea formală se consemnează prin aprobarea proprietarului.** Aprobările de aplicare, commit și push nu reprezintă, prin ele însele, decizia de închidere |

Recomandarea din planul inițial al Etapei 7 (`docs/faza7/FAZA_7_PLAN.md`, rândul 142: alinierea la producție cu un singur job MySQL) nu a fost adoptată; planul v2.4 este cel în vigoare.

### 27.2 Implementarea

**Commitul:** `10e4a00c13ab8fd0a82758c83f59dc4630328db1` (`ci: DEC-8 (c1) — add production-exact backend job (Node 24.21.0, MariaDB 11.4.13) with explicit version checks`); modifică numai `.github/workflows/ci.yml` (+34 de rânduri, 0 șterse; SHA-256 al fișierului `ff5ce48b28f4a7c76d130d4e67af6b532def33b5890a8e8d0077e643eea357a4`).

| Element | Conținutul |
|---|---|
| jobul nou | `backend (Node 24.21.0, MariaDB 11.4.13, producție)`: un element nou în `include`-ul matricei existente, cu aceiași pași și același serviciu de bază de date ca celelalte joburi backend |
| fixarea versiunilor | Node prin `actions/setup-node` cu versiunea exactă (prezentă în manifestul oficial `actions/node-versions`); MariaDB prin imaginea oficială `mariadb:11.4.13` |
| pasul nou „Versiunile exacte de producție” | rulează numai în jobul nou; oprește jobul dacă `node --version` nu este exact `v24.21.0` sau dacă `SELECT VERSION()` nu începe cu `11.4.13-MariaDB`; tipărește amprenta imaginii, iar o amprentă absentă sau cu format invalid produce un avertisment explicit, fără să fie prezentată drept validă |
| verificările dinaintea aplicării | `actionlint` 1.7.12: 0 erori; simularea expansiunii matricei după regulile documentate GitHub (validată pe exemplul oficial): 7 joburi; logica pasului nou testată local sub `set -eo pipefail` |

### 27.3 Dovada: prima rulare reală

**Rularea CI 41180615246**, la `10e4a00` (push, 31.10.2026, 07:26–07:40 UTC): **`success`**.

| Criteriul de acceptare | Rezultatul |
|---|---|
| numărul de joburi | **7** (6 backend + E2E), cum a prevăzut simularea |
| cele șase joburi existente | aceleași nume, toate `success` |
| jobul nou | `success` la toți pașii, inclusiv testele unitare, API, de integrare și pornirea artefactului |
| pasul „Versiunile exacte de producție” | `success` în jobul nou; `skipped` în celelalte cinci joburi backend |
| avertismentul „Amprenta imaginii indisponibilă” | absent (0 adnotări în jobul nou) |

**Ce dovedește și ce nu:**
- **versiunile exacte** (Node 24.21.0, MariaDB 11.4.13) sunt confirmate **prin trecerea verificărilor automate** ale pasului nou, care ar fi oprit jobul la orice altă versiune;
- **amprenta imaginii** a fost identificată într-un **format valid** (lipsa avertismentului), dar **valoarea ei nu a fost încă extrasă și arhivată**: jurnalele CI nu au putut fi descărcate din mediul de lucru al lui Claude (acces refuzat de proxy). Valoarea se poate citi din pagina rulării; extragerea ei rămâne un pas separat.

### 27.4 Efectul asupra E4

Criteriul E4.2 (planul v2.4: „CI verde la acel commit, cu matricea decisă în D7-4”) are acum matricea decisă: cele **7 joburi** de mai sus. Criteriul se verifică la SHA-ul candidat al E4.

### 27.5 Regula de întreținere

La orice schimbare a versiunii Node sau MariaDB pe server, cele **patru valori** ale jobului de producție (`node`, `image`, `expect_node`, `expect_db`, documentate în antetul `ci.yml`) se actualizează **împreună**, printr-o modificare aprobată. Altfel jobul continuă să treacă pe versiunea veche: verificarea compară CI-ul cu valorile din fișier, nu cu serverul.

### 27.6 Ce rămâne deschis (propus ca necondiționând închiderea DEC-8)

| Subiectul | Starea |
|---|---|
| **(c2)** E2E pe MariaDB | opțiune separată, nedecisă; E2E rulează în continuare numai pe MySQL 8.4 |
| eliminarea joburilor Node 20 și MySQL 8.0 | **neevaluată**; joburile rămân |
| compararea configurației serverului (`sql_mode`, setul de caractere, colația; serverul raportează varianta `11.4.13-MariaDB-cll-lve`) cu cea din CI | verificare suplimentară, nedecisă; nu invalidează rezultatele CI |
| extragerea și arhivarea amprentei imaginii; eventual fixarea pe amprentă (`mariadb:11.4.13@sha256:…`) | pas separat, nedecis |
| reconfirmarea versiunilor de pe server înaintea E4 | depinde de G6-1 (deschisă) |

**Ce NU înseamnă această consemnare:** nu închide formal DEC-8; nu modifică codul aplicației sau artefactul instalat (`85d3c45` pe staging); nu decide G6-1, DEC-9 sau DEC-20; nu autorizează E4 sau vreo operație pe staging, producție ori cPanel; nu modifică DEC-25 sau A17-1. Lansarea publică nu este aprobată.

---

## 28. DEC-9 — perimetrul restaurării de probă: deciziile DEC9-1–DEC9-4 (31.10.2026)

Proprietarul a aprobat la 31.10.2026, ~11:42, în conversația de lucru, deciziile de mai jos, după analiza numai prin citire a DEC-9 (planul v2.4, codul, registrul, jurnalul) și evaluarea auditorului independent (Aristotel). Planul v2.4 rămâne neschimbat; codul nu se modifică. **Nicio probă pe staging sau pe producție nu este autorizată prin această consemnare.**

### 28.1 Definiția și starea de pornire

| Element | Conținutul |
|---|---|
| definiția din plan | planul v2.4, §6, rândul 551: DEC-9 = „perimetrul restaurării de probă”; „PRINCIPIU: M4 + R19; `host-restore --check` condiționat”; criteriul: „proba de siguranță pe staging în E3, aprobată separat”. Proba propriu-zisă: E4, criteriile 15–22 |
| ce era decis | principiul M4 + R19; criteriile E4 15–22; `host-restore:recover --check` numai dacă siguranța lui se confirmă, altfel exclus din proba 7E (planul v2.4, §7.3, rândul 595) |
| **criteriul pentru E3: neîndeplinit** | proba de siguranță pe staging **nu a fost efectuată în E3**; E3 s-a închis fără ea (§17.5, criteriul 9: „neefectuat”). Criteriul **nu este declarat îndeplinit**; îndeplinirea lui este **amânată** și mutată în etapa stabilită la DEC9-2, **înaintea E4** |
| ce s-a dovedit pe găzduire | M4 a fost executat pe staging la 13.10.2026 (jurnalul staging-ului, intervențiile 41–48), cu versiunea `27b1b5f`. Restaurarea cu codul actual (după 7A: R18, R19, MINOR-3) **nu a fost probată pe găzduire** (§12); R19 și R20 sunt exersate numai în CI |

### 28.2 Constatările analizei despre `host-restore:recover --check` (verificate în cod la `d59d576`)

- **N-23 nu se aplică acestei comenzi:** drumul `--check` (`server/src/main.ts` 115–134; `server/src/cli.ts` 157–176; `server/src/db/hostRestore.ts` 51–93) nu apelează `prepareBackupDir`, singura funcție care scrie și șterge un fișier de probă în `BACKUP_DIR` (`server/src/db/markers.ts` 137–150; apelată numai din `server/src/db/reportCounter.ts` 143 și 182).
- **Fără scrieri:** verificările preliminare numai citesc; contorul (`reportCounter.ts` 229–237) și coada (`server/src/db/backup.ts` 983–1021) rulează în `dryRun`; tranzacția se încheie cu `rollback`; auditul, reconcilierea R18 și retenția rulează numai fără `--check`.
- **Teste în CI:** `server/test/integration/d74RestaurareFurnizor.test.ts`, F4 (rândurile 112–122) și F8, comanda reală într-un proces separat (rândurile 220–232): `--check` nu schimbă contorul, coada, numărul intrărilor de audit și de sesizări sau `BACKUP_DIR`.
- **Riscul rămas:** blocarea `SELECT … FOR UPDATE` a rândului contorului TM pe durata tranzacției de verificare; pe o bază activă, o emitere concurentă de număr TM așteaptă eliberarea blocării. Comportamentul **nu este demonstrat** (N-18).
- **Practic:** comanda nu figurează între scripturile „Run JS script” ale pachetului (`server/scripts/package-release.py`); o probă pe găzduire ar cere o sarcină cron temporară, cu riscul de țintă din observația 9 a jurnalului staging-ului.

### 28.3 Deciziile

| Decizia | Conținutul |
|---|---|
| **DEC9-1** | varianta **V3**: o **repetiție M4 + R19 pe staging, cu versiunea candidatului care include implementarea E4.11**, înaintea probei E4; prima restaurare cu codul actual **nu** se face direct pe producție. Restaurarea (M4 + R19) și verificarea `host-restore --check` sunt **două probe distincte**, nu o singură demonstrație de siguranță |
| **DEC9-2** | momentul: **după instalarea pe staging a candidatului cu implementarea E4.11** (§24), pentru că E4.11 schimbă formatul copiilor și procedura de restaurare. **Condiție prealabilă:** înaintea repetiției se verifică faptul că o copie criptată poate fi identificată, decriptată și verificată conform procedurii E4.11; instalarea candidatului nu este considerată, singură, o garanție |
| **DEC9-3** | `host-restore:recover --check` la proba E4: **inclus numai condiționat**, după validarea comportamentului concurent (blocare scurtă, emiteri concurente finalizate normal, fără efecte secundare). **Dacă acest lucru nu poate fi demonstrat, comanda este exclusă din proba E4** |
| **DEC9-4** | **locul probei E4 rămâne deschis**, dependent de DEC-20 (variantele A / B / C, planul v2.4, §5.4) și de G6-1 (§25) |

### 28.4 Condițiile repetiției pe staging (DEC9-1, DEC9-2)

- se folosesc o **bază de date** și un **director de stocare de test, distincte** de cele active ale staging-ului;
- **identitatea țintelor se verifică înaintea execuției** (de exemplu numele bazei și calea directorului, confirmate prin citire), nu se presupune din parametrii comenzii;
- operația are **aprobare separată**, cu procedura scrisă și pașii proprietarului câte unul, ca la M4; se poate combina cu proba E4.11 pe staging și cu exercițiul D23-7, fiecare cu criteriile lui.

### 28.5 Propunere separată: test automat de concurență în CI (DEC9-3)

Proba pe staging poate verifica **efectele operaționale** ale comenzii:
- durata comenzii și `health` după rulare;
- **nicio schimbare**, prin compararea stării **înainte și după** comandă pentru: contorul TM; coada de mesaje; intrările de audit; sesizările existente; conținutul `BACKUP_DIR`;
- **separat**, o sesizare trimisă **intenționat** imediat după comandă: înregistrarea ei normală și incrementarea corectă a contorului TM (operație voită, nu un efect al comenzii).

Proba pe staging **nu poate demonstra convingător comportamentul concurent**. Se **propune** un test automat în CI, cu scenariul:
1. conexiunea 1 blochează rândul contorului TM (ca `host-restore --check`);
2. conexiunea 2 încearcă să emită un număr TM;
3. se verifică faptul că emiterea **așteaptă** eliberarea blocării;
4. după eliberare, emiterea se finalizează corect, **fără pierdere sau duplicare** de număr.

**Starea: propunere, nu decizie de implementare.** Necesită analiză și aprobare separată înaintea oricărei modificări a codului de test. **Dacă testul nu este implementat sau nu demonstrează comportamentul așteptat, `host-restore --check` rămâne exclus din proba E4** (DEC9-3).

**Ce NU înseamnă această consemnare:** nu autorizează nicio probă pe staging sau pe producție și nicio modificare de cod sau de test; nu decide DEC-20, G6-1 sau locul probei E4; nu modifică planul v2.4, DEC-23, E4.11, DEC-25 sau A17-1; nu închide formal DEC-8 (§27). Lansarea publică nu este aprobată.

---

## 29. G6-1 și DEC-20 (partea restaurării de probă) — deciziile proprietarului (31.10.2026); condițiile de activare

Proprietarul a aprobat la 31.10.2026, ~12:16, în conversația de lucru, deciziile de mai jos, după analiza comparativă G6-1 + DEC-20, făcută numai prin citire (planul v2.4, §5 și E4; registrul, §4, §16, §25, §26, §28), și după evaluarea auditorului independent (Aristotel). Planul v2.4 rămâne neschimbat; codul nu se modifică. **Nicio operație pe staging, pe producție sau în cPanel nu este autorizată prin această consemnare.**

### 29.1 G6-1 — arhitectura producție/staging: varianta (c)

| Element | Conținutul |
|---|---|
| decizia | **(c)**: producția și staging-ul în **același cont** de găzduire (ClausWeb, §25.1); **aplicația de staging este oprită în afara perioadelor de testare** |
| variantele respinse acum | (a) ambele aplicații pornite permanent; (b) cont separat pentru producție (reevaluată, vezi mai jos); (d) retragerea staging-ului la E4 |
| ce obține | oprirea aplicației de staging elimină procesul web de staging care ar putea fi atacat în afara testelor; resursele contului (§25.1) rămân, în afara testelor, aproape în întregime pentru producție; fără cost nou; mediul de staging rămâne disponibil pentru E4–E7 (G3) |
| **ce NU obține** | **nu** elimină accesul comun la fișierele, bazele de date și resursele contului; **nu** oferă izolare între utilizatori de sistem: ambele aplicații aparțin aceluiași utilizator (CageFS separă conturile, nu aplicațiile, §25.1). Varianta (c) este o **măsură de reducere a riscului, nu un substitut** pentru izolarea prin conturi separate |
| reevaluarea | varianta **(b)** se reevaluează **la reînnoirea găzduirii** și **înainte de E9**; costul unui al doilea cont și al unui al doilea IP dedicat (necesar pentru Remote SMTP) nu este cunoscut și se cere furnizorului |
| starea | **decisă, neactivată.** Staging-ul rulează în continuare (`85d3c45`). Oprirea lui este o operație separată, cu aprobare distinctă, care se face **numai după** îndeplinirea condițiilor din §29.2 și §29.3 |

### 29.2 Cron-urile staging-ului

- Sarcinile cron ale staging-ului se **opresc în afara testelor**. Varianta „lăsate să ruleze, cu riscul acceptat” este respinsă.
- **Înaintea opririi**, **textul exact** al fiecărei linii cron (ora și comanda, inclusiv ținta) se păstrează în jurnalul staging-ului, fără secrete și fără numele contului (`<cont>`). Păstrarea este **obligatorie**.
- **Înaintea fiecărei reporniri**, ținta **bazei de date** și a **directoarelor** (`STORAGE_DIR`, `BACKUP_DIR`) se **verifică explicit, prin citire**, pentru fiecare linie și pentru aplicație; liniile se compară cu textul păstrat în jurnal. **Nu se acceptă presupuneri bazate pe numele aplicației, al directorului sau al fișierului de setări** (jurnalul staging-ului, observația 9: `CIVIC_ENV_FILE` ignorat de sarcinile cron, ținta se dă direct în linie).
- **După oprirea aplicației** se verifică faptul că aplicația a rămas oprită, **printr-o metodă care nu poate porni aplicația**. Comportamentul platformei **nu este cunoscut** și nu se presupune: nu se știe dacă o aplicație oprită din „Setup Node.js App” poate fi pornită de o cerere HTTP (de exemplu de Passenger, la prima cerere), caz în care chiar o verificare prin cerere HTTP către `test.urbisactiv.ro` ar putea reporni aplicația.
- **Confirmarea furnizorului (ClausWeb)** este necesară și trebuie să răspundă **explicit** la întrebarea: **poate o cerere HTTP să pornească sau să repornească o aplicație Node.js oprită din „Setup Node.js App”?** Răspunsul stabilește dacă verificarea prin cerere HTTP este admisibilă și dacă oprirea are efectul urmărit în §29.1.
- **Activarea G6-1 (c)** (§29.1) este condiționată, **în plus** față de §29.3, de **conținutul** acestei confirmări, nu de simpla ei primire: dacă aplicația poate fi repornită de o cerere, oprirea aplicației din cPanel **nu garantează menținerea stării de oprire și reducerea riscului urmărită**. **Până la confirmare, G6-1 (c) rămâne decisă, dar neactivată**; staging-ul nu se oprește, iar sarcinile cron nu se modifică.
- **Efectul răspunsului furnizorului:**

| Răspunsul | Efectul |
|---|---|
| o cerere HTTP **nu poate** porni sau reporni aplicația oprită | **condiția tehnică din §29.2 este îndeplinită**; activarea rămâne condiționată și de §29.3 și se face cu aprobare distinctă |
| o cerere HTTP **poate** porni sau reporni aplicația oprită | **G6-1 (c) nu se activează în forma actuală**; măsurile tehnice sau arhitectura (§29.1) se **reevaluează**, prin decizia separată a proprietarului; **staging-ul rămâne pornit, iar sarcinile cron nu se modifică până la o decizie separată** |
| răspuns **neconcludent** sau lipsă | condiția **nu este îndeplinită**; **staging-ul rămâne pornit**, iar sarcinile cron nu se modifică |

### 29.3 DEC-16 în perioada de oprire a staging-ului — condiție înaintea opririi

- DEC-16 (§16; §26; manualul 7D, §6.3) **nu se modifică implicit** prin G6-1 (c).
- **Înaintea opririi staging-ului** trebuie decis și consemnat regimul evidenței zilnice pentru perioada de oprire. Regimul trebuie să respecte două reguli: **verificările imposibile nu se raportează ca neconformități**, iar **verificările neefectuate nu se prezintă drept efectuate** (§26.2).
- **Starea: propunere, nedecisă.** Până la decizie, staging-ul nu se oprește, sarcinile cron nu se modifică, iar verificarea zilnică DEC-16 continuă neschimbată.
- **Adoptarea propunerii R2 este condiționată** de confirmarea furnizorului din §29.2 (comportamentul unei aplicații oprite la o cerere HTTP), deoarece de ea depinde metoda verificării (1) de mai jos.

**Propunerea de evaluat (R2, recomandată în analiza din 31.10.2026):** o stare distinctă în evidența Excel (D16-a), **„suspendată: staging oprit (G6-1 c)”**, diferită de „conform”, „neconform”, „imposibil de verificat” și „neefectuată” (D16-b).

| Momentul | Ce se consemnează |
|---|---|
| **la oprire** | un rând: data și ora; numărul intervenției din jurnalul staging-ului; confirmarea că textul exact al liniilor cron a fost păstrat (§29.2); data ultimei verificări DEC-16 complete dinaintea opririi |
| **în perioada de oprire** | **un singur rând** pentru toată perioada, cu starea „suspendată”; **fără înregistrări zilnice artificiale** |
| **săptămânal, în perioada de oprire** | o verificare **numai prin citire** a **stării de oprire**: (1) aplicația de staging este oprită, verificat **printr-o metodă care nu o poate porni**, stabilită după confirmarea furnizorului (§29.2); o cerere HTTP către `test.urbisactiv.ro` se folosește **numai dacă** furnizorul confirmă că nu poate porni aplicația; (2) lista sarcinilor cron din cPanel **nu conține linii de staging**; (3) `backup.log` nu are intrări noi. Punctele (2) și (3) nu trimit cereri către aplicație. Rezultatul se consemnează ca „oprire confirmată” sau ca neconformitate a opririi |
| **la repornire** | un rând cu o **verificare DEC-16 completă** (cele trei controale din manualul 7D, §6.3), în aceeași zi, după verificarea țintelor (§29.2); în plus, controlul că `backup.log` nu are intrări din perioada de oprire. O intrare din acea perioadă este **neconformitate**: o sarcină cron a rămas activă |

Precizări:
- verificarea săptămânală este un **control al stării de oprire, nu o verificare DEC-16**; nu înlocuiește și nu completează controalele DEC-16;
- absența intrărilor noi în `backup.log` **nu dovedește singură** că toate sarcinile cron sunt oprite: jurnalul primește numai rulările `backup:db`, iar celelalte sarcini scriu în alte jurnale, dintre care `outbox-cron.log` și `surveys-cron.log` se suprascriu (manualul 7D, §6.3). De aceea **verificarea listei din cPanel este obligatorie**;
- alternativa evaluată, **R1**, cuprinde numai rândurile de la oprire, din perioada de oprire și de la repornire, fără verificarea săptămânală;
- adoptarea propunerii ar fi o **completare** a DEC-16, de felul celor din §26, cu aprobarea separată a proprietarului; operatorul, frecvența și controalele DEC-16 nu se schimbă.

### 29.4 DEC-20 — partea restaurării de probă: varianta B

| Element | Conținutul |
|---|---|
| decizia | **B** (planul v2.4, §5.4): instanță de probă cu **bază de date, `STORAGE_DIR` și `BACKUP_DIR` distincte**, pe găzduirea de producție; baza, fișierele și contorul TM de producție nu sunt atinse |
| variantele respinse | **A** (goluri acceptate: consecințele din §5.2 și §5.3 ale planului); **C** (reinițializarea producției: operație riscantă, fără procedură) |
| **natura izolării** | izolarea variantei B este **operațională, nu de securitate**: protejează numerotarea TM și datele de producție față de probă, **nu** față de o compromitere; în același cont (§29.1), instanța de probă și producția aparțin aceluiași utilizator de sistem. Varianta B **nu** se prezintă ca având protecția unui cont separat |
| fezabilitatea | a doua bază și a doua aplicație Node în același cont: comunicate de furnizor (§25.1) |
| **criteriul 7E** | **nu este declarat îndeplinit prin această alegere.** Rămâne **deschis** și se decide **la E4, după probă**, conform planului v2.4 (§5.5, ultima frază; E4, criteriul 22) |

**Ce va trebui consemnat la E4 (criteriul 22): limitele din §5.5 și acoperirea lor posibilă prin citire** (evaluare din 31.10.2026, nu decizie):

| Limita (planul v2.4, §5.5) | Ce poate arăta o verificare prin citire | Ce rămâne nedemonstrat |
|---|---|---|
| `civic.env` real și impunerea lui asupra sarcinilor cron | existența fișierului, drepturile, cheile prezente (fără valori), ținta din fiecare linie cron | comportamentul restaurării cu configurația reală; copiile reușite ale cron-ului real arată numai partea de backup |
| `BACKUP_DIR` real, cu marcajele reale | calea, drepturile, structura, prezența marcajelor | citirea marcajelor reale de către `restore:db` (`server/src/db/backup.ts` 712–740) |
| `STORAGE_DIR` real și fotografiile | calea, drepturile, poziția în afara docroot-ului | restaurarea fotografiilor reale |
| sarcinile cron reale | liniile, orele, rulările din `backup.log`: acoperire aproape completă | — |
| drepturile utilizatorului bazei de producție | drepturile declarate | suficiența lor pentru operațiile de după o restaurare reală |

Golul rămas este **comportamental**: verificările prin citire îl reduc, dar nu îl închid. Dacă la E4 proprietarul consideră criteriul 7E îndeplinit cu acest gol, golul se **acceptă explicit** și nu se declară acoperit.

### 29.5 DEC-20 — partea datelor create în E7

Variantele **D, E, F** (planul v2.4, §5.6) **nu se decid acum**; se decid **înainte de E7**. DEC-20 rămâne, în această parte, **deschisă**.

### 29.6 Efectele asupra altor decizii

| Decizia | Efectul |
|---|---|
| **DEC9-4** (§28.3) | rămâne **deschisă**; dependențele ei (G6-1, DEC-20 pentru restaurare) sunt acum decise. Direcția rezultată: proba E4 într-o instanță de tip B, după repetiția V3 de pe staging (DEC9-1). Observație de analiză: în varianta (c), staging-ul este el însuși o instanță separată pe aceeași găzduire; la DEC9-4 trebuie stabilit **ce adaugă proba E4 față de repetiția V3** |
| **§25.3 / §26.4** (monitorizarea spațiului) | condiția de amânare („până la clarificarea G6-1”) este îndeplinită: producția va consuma din aceeași cotă de 15 GB. Propunerea rămâne **nedecisă** și **nu** face parte din DEC-16 până la o decizie separată |

**Ce NU înseamnă această consemnare:** nu autorizează oprirea staging-ului, ștergerea sau adăugarea de sarcini cron, instalarea producției ori vreo operație pe staging, producție sau în cPanel; nu modifică DEC-16 (§16, §26), DEC-9 (§28), DEC-23, E4.11, DEC-25 sau A17-1; nu declară îndeplinit criteriul 7E; nu decide DEC9-4 sau DEC-20 pentru datele E7; nu închide formal DEC-8 (§27). Planul v2.4 rămâne neschimbat. Lansarea publică nu este aprobată.

---

## 30. E4.11 — momentul îndeplinirii cerinței din planul r3.2, §5.2 (ora copiilor zilnice ClausWeb): decizie documentată (01.11.2026)

Prezenta secțiune consemnează decizia proprietarului privind momentul îndeplinirii cerinței din planul r3.2, §5.2, după analiza propunerii lui Claude și a implicațiilor tehnice și după evaluarea auditorului independent (Aristotel). Proprietarul a confirmat explicit decizia la 01.11.2026, ~08:22, în conversația de lucru; recomandarea auditorului nu a fost tratată ca aprobare. **Planul r3.2 rămâne neschimbat** (SHA-256 `5f82b0a77088e60890952940459c5ea2e5b0c17b4a926bfcb4f305218a2f3476`, §24.2); cerințele lui nu se reinterpretează tacit.

### 30.1 Cerința

Planul r3.2, §5.2 („Copia decriptată pe găzduire”), rândul „copiile furnizorului”: ora copiilor zilnice ClausWeb este necunoscută și **„se cere înaintea implementării, ca restaurarea să nu o traverseze”**.

### 30.2 Decizia

| Element | Conținutul |
|---|---|
| **cerința** | **rămâne obligatorie**: ora copiilor zilnice ale contului, făcute de ClausWeb, trebuie cunoscută și consemnată |
| **momentul îndeplinirii** | **înaintea primei restaurări pe găzduire**, inclusiv **repetiția V3** de pe staging (§28, DEC9-1, DEC9-2), și înaintea oricărei restaurări ulterioare făcute după procedura din planul r3.2, §5.2 |
| **natura deciziei** | decizie documentată privind **momentul** în care se îndeplinește cerința din §5.2; **nu** este o eliminare a cerinței și nici o modificare a planului r3.2 |
| **ce devine posibil** | implementarea E4.11 (codul, testele locale, CI) **poate** începe înainte de răspunsul furnizorului, **numai** după autorizarea ei separată (§24.5). Această posibilitate privește **exclusiv** implementarea și validarea locală și în CI; **nu** autorizează instalarea candidatului pe staging și nici executarea repetiției V3 |

### 30.3 Motivarea

- ora copiilor furnizorului intervine **numai** în procedura de restaurare pe găzduire (planul r3.2, §5.2: fereastra în care copia decriptată se află pe găzduire); fluxul de scriere (§3), cheile (§4) și testele (§7) din plan nu o folosesc;
- scopul cerinței (o restaurare pe găzduire nu traversează copia zilnică a furnizorului) se păstrează integral, pentru că nicio restaurare pe găzduire nu are loc înainte ca ora să fie cunoscută;
- răspunsurile furnizorului pot întârzia: tichetul din 13.10.2026 privind `TRUST_PROXY` nu are răspuns consemnat (§25.1). Legarea codului de răspuns ar fi blocat o activitate tehnică independentă de el.

### 30.4 Starea

Întrebarea privind ora copiilor zilnice se transmite furnizorului de proprietar, împreună cu întrebările privind comportamentul unei aplicații oprite (§29.2). Până la răspuns, cerința din §5.2 este **neîndeplinită**.

**Ce NU înseamnă această consemnare:** nu autorizează implementarea E4.11 (§24.5 rămâne în vigoare; autorizarea se dă separat); nu autorizează nicio restaurare, nicio operație pe staging, producție, cPanel, cron sau `civic.env`; nu modifică planul r3.2, deciziile P1–P10 (§24.3), DEC-9 (§28) sau §29; nu activează G6-1 (c). Lansarea publică nu este aprobată.

---

## 31. E4.11 — implementarea: checkpointul, auditul independent, publicarea și CI (01–02.11.2026)

Această secțiune consemnează implementarea E4.11 autorizată la §24.5 / §30 și starea ei la 02.11.2026. Planul r3.2 (§24.2) și deciziile P1–P10 (§24.3) rămân neschimbate; abaterile sunt enumerate în §31.3.

### 31.1 Cronologia și aprobările

| Momentul | Ce s-a întâmplat |
|---|---|
| 01.11.2026, ~08:42 | proprietarul autorizează implementarea până la checkpoint (fluxul fără buffer de 256 MiB; `rage` în CI alături de `age`); fără commit, push sau operații pe găzduire |
| ~09:27, ~10:00, ~10:34 | trei runde de audit independent (Aristotel) al checkpointului, cu corecțiile r2 și r3 făcute pe o copie separată (§31.2) |
| ~10:37 | proprietarul aprobă commitul r3 → **`ec962b4`** (23 de fișiere, +2548 / −33; arborele commitului identic cu cel testat) |
| ~10:38 | push aprobat → CI **41289728463**: **eșuat** — 4 joburi Node 24 opriți la testele unitare (testul de memorie al unui fișier: 66–68 MiB față de pragul de 64); joburile Node 20 și E2E trecute |
| ~12:07 | proprietarul aprobă abaterea **A11** (varianta A, §31.3); suita completă rulată local și pe Node 24.21.0: unitare 141/141, API 25/25, integrare 429/429, artefactul fără `node_modules` trecut |
| ~12:46 / ~12:47 | commitul A11 → **`2fc8403`** (părinte `ec962b4`; un singur fișier de test, +7 / −2); push aprobat |
| 01.11.2026 | CI **41299023089** pe `2fc8403`: **`success`, 7/7 joburi** (§31.4); rularea eșuată anterioară este depășită |
| ~13:03 | proprietarul consideră E4.11 validată la nivel de implementare și CI; aprobă `npm audit` pe `2fc8403` (§31.5) |
| 02.11.2026, ~09:03 | proprietarul trimite furnizorului întrebările din §29.2 și §30 (§31.7) |

### 31.2 Ce s-a implementat și corecțiile din audit

| Zona | Conținutul |
|---|---|
| criptarea (`server/src/db/backupCrypto.ts`, nou) | formatul age, prin `age-encryption` **0.3.1** fixat exact; `binding.json.age`; verificarea structurii la backup; `backup:verify` (nivelul 2, planul §6) și `backup:decrypt` (`civic-restore-<UTC>` + `DECRYPTED-COPY.json`, prin director temporar, fără fișiere parțiale); identitatea se citește numai criptată cu fraza-parolă (una în clar este refuzată) |
| backup (`backup.ts`) | cu `BACKUP_AGE_RECIPIENT`: rânduri → gzip → age în flux, SHA-256 al bazei comprimate calculat pe drum; fotografiile → age în flux; `manifest.json` și `markers.json` în clar; directorul temporar se șterge imediat la eroare; fără cheie (staging): copii în clar, ca înainte |
| restaurarea | o copie criptată nu se restaurează direct, **fără excepție** (orice `.age`, indicatorul din manifest, o enumerare incompletă → refuz); o copie decriptată este acceptată numai dacă este **validă** (nume, marcaj, dată UTC, sursa din manifest, niciun `.age`); se șterge după o restaurare executată (reușită sau eșuată în tranzacție) și se păstrează la un refuz dinaintea execuției |
| plasa de 24 h | la fiecare `backup:db` și la pornire; o copie decriptată expirată care nu poate fi ștearsă este raportată ca **„NECONFORMITATE (E4.11)”**, de consemnat în evidența DEC-16 |
| configurația | `BACKUP_AGE_RECIPIENT` obligatorie în producție (pornirea refuzată fără ea), opțională în rest; numai X25519, cu suma de control verificată |
| comenzile de pe calculator | `backup:verify` și `backup:decrypt` rulează fără `civic.env` și fără bază de date |
| CI | `age` 1.1.1 (versiune verificată exact) și `strace` din apt; `rage` 0.12.1 din versiunea oficială, cu SHA-256 verificat; vectorii C2SP CCTV/age (147) la commitul fixat `50a8ecf2…`; orice eșec oprește jobul |
| teste | interoperabilitate în ambele sensuri cu `age` și `rage`; cei 147 de vectori; fișiere-martor (identitatea de test păstrată criptată); `strace` cu lista exactă a căilor permise și control negativ; memoria (§31.6); `civic-restore` (8 cazuri); `binding`; refuzurile fără excepție; ieșirile comenzilor fără date în clar |

**Corecțiile din audit:** r2 — refuzul copiilor mixte (C1), proba de memorie a fluxului bazei (C2), versiunea `age` verificată în CI (C3), identitatea de test criptată (C4); r3 — refuz la o enumerare incompletă (C1.a, defect *fail-open* închis), validarea efectivă a copiei decriptate (C1.b), cei 147 de vectori (A3), probă de compatibilitate (A5), validarea strictă a datei UTC (A6), neconformitatea la o ștergere eșuată (A10).

**Starea auditului:** închis la nivelul implementării, prin aprobarea proprietarului pentru commitul r3 (01.11.2026, ~10:37). C1.a, C1.b, A2–A4 și A6–A10 au fost acceptate explicit de auditor (01.11.2026, ~10:34). Pentru A5, proba izolată cu `85d3c45` a fost efectuată ulterior observației auditorului, iar rezultatul este consemnat în prezentul registru. Nu există însă o confirmare scrisă separată a auditorului privind acceptarea formală a acestei probe. Aprobarea commitului de către proprietar nu trebuie interpretată ca o asemenea confirmare.

### 31.3 Abaterile față de planul r3.2

| # | Abaterea | Starea |
|---|---|---|
| A1 | §3.3: bufferul bazei comprimate (256 MiB) înlocuit cu fluxul gzip → age | aprobată (~08:42) |
| A2 | §7.2: testul „dimensiune declarată greșit” nu se aplică (biblioteca nu cere dimensiunea); înlocuit cu teste de eroare ale fluxului | acceptată |
| A3 | §7.1: vectorii din depozitul oficial la commit fixat (147), nu din pachetul npm (143) | acceptată |
| A4 | §7.2: lista `strace` include promovarea unei intenții R18 și urmărește și `mkdir` | acceptată |
| A5 | formatul copiei rămâne `civic-backup/2`, cu câmpul `encryption` | probă locală cu `85d3c45`: copia criptată nu poate fi restaurată de codul vechi (refuz cu un singur motiv, bază țintă goală, nimic scris); marcajele ei rămân citite; restaurarea din copii în clar funcționează. Probă tehnică efectuată și rezultat consemnat; acceptarea formală de către auditor nu este documentată separat |
| A6 | vechimea copiei decriptate se măsoară după data UTC din nume, validată strict | acceptată |
| A7 | fraza-parolă se poate da și pe intrarea standard | acceptată |
| A8 | o identitate necriptată este refuzată | acceptată |
| A9 | ștergerea imediată a directorului temporar se aplică și copiilor în clar | acceptată |
| A10 | raportarea pe stderr la pornire; neconformitatea la o ștergere eșuată | acceptată |
| A11 | §7.2: încălzirea testului de memorie crescută de la 1 MiB la 64 MiB (pe Node 24, primul flux mare face o alocare unică, constantă, de circa 35 MiB); pragul (< 64 MiB) și controlul negativ (> 480 MiB) neschimbate | aprobată (~12:07); precizarea proprietarului: încălzirea mută alocarea inițială, dar nu dovedește singură independența alocărilor ulterioare de dimensiune; controlul negativ rămâne esențial |

### 31.4 Dovada CI pe `2fc8403`

**Rularea 41299023089: `success`, 7/7 joburi.** Pe fiecare dintre cele 6 joburi backend (Node 20 × MySQL 8.0 / 8.4; Node 24 × MySQL 8.0 / 8.4 / MariaDB 11.4; **Node 24.21.0 + MariaDB 11.4.13, producție**): instrumentele E4.11, `npm ci`, testele unitare 141/141, API 25/25, integrare 429/429 și artefactul — trecute; E2E — trecut. Pe joburile Node 24, `npm ci` și execuția completă sunt confirmate în CI.

**Observație:** pe runner-ele GitHub, testul de memorie al unui fișier a variat între 0,1 și 45,8 MiB (prag 64). Nu se propune nimic acum; dacă testul devine instabil, varianta mai robustă (o probă cu două dimensiuni de fișier) cere o decizie separată.

### 31.5 `npm audit` pe `2fc8403`

Clonă curată, fără `npm audit fix` și fără modificări (amprentele `package.json`, `server/package.json`, `package-lock.json` neschimbate): **3 vulnerabilități moderate**, aceleași ca înainte de E4.11 — `@fastify/static` 10.1.5 (direct; marcat numai prin dependență), `glob` 13.0.6 (tranzitiv, GHSA-3g3m-2fjr-6pw4), `minimatch` 10.2.6 (tranzitiv, GHSA-g3hv-75wg-m249). Versiunile lor sunt identice cu cele de la `7eabb8a`. **E4.11 nu adaugă nicio vulnerabilitate.** Remedierea propusă de npm (retrogradarea `@fastify/static` la 6.12.0) nu este acceptabilă; analiza aplicabilității rămâne la DEC-3b, deschisă.

### 31.6 Riscuri și limite consemnate

| Subiectul | Starea |
|---|---|
| **memoria întregului `backup:db`** | **risc deschis.** Compresia și criptarea sunt în flux (~30 MiB constant), dar `backup:db` adună toate rândurile într-un tablou înaintea compresiei (planul §3.2, pasul 1, neschimbat): consumul crește cu dimensiunea bazei (măsurat: ~300 MiB de text → 435–620 MiB). Fără importanță la dimensiunea staging-ului; relevant față de limita de 4 GB RAM a contului (§25.1) pentru o bază de sute de MB. Citirea cu cursor ar fi o schimbare de arhitectură, **neintrodusă acum** |
| **revenirea la `85d3c45`** | sigură pentru date (copia criptată nu poate fi restaurată de codul vechi; marcajele ei rămân folosite). **Limită:** codul vechi nu are plasa de 24 h; o copie decriptată urcată în timpul unei reveniri rămâne până la ștergerea manuală. Se consemnează în procedura de revenire |
| identitatea de test din repository | păstrată criptată cu o frază-parolă de test publică: protejează numai împotriva confundării cu o identitate reală și a scanerelor de secrete; nu se refolosește în niciun mediu real |
| amprenta `rage` | autorul nu publică sume de control; amprenta fixată este a arhivei descărcate de pe pagina oficială la 01.11.2026 |
| notele de licență din artefact | nota `age-encryption` (BSD-3-Clause) nu apare în `app.js.LEGAL.txt`; verificare separată, nedecisă |

### 31.7 Ce NU s-a făcut încă

- **Staging-ul nu a fost actualizat:** rulează în continuare `85d3c45`, **fără cheie publică**; copiile lui rămân necriptate. Instalarea candidatului `2fc8403` și validarea criptării pe staging sunt pași separați, cu condiții de testare de stabilit explicit (proprietarul, 01.11.2026, ~13:03).
- **Întrebările către ClausWeb**, trimise la 02.11.2026, ~09:03: comportamentul unei aplicații oprite la o cerere HTTP și la o repornire a serverului (§29.2) și ora copiilor zilnice ale contului (§30). **Fără răspuns la momentul redactării inițiale a acestei secțiuni (02.11.2026, ~09:04)**; la acel moment, condițiile din §29.2 și §30 erau neîndeplinite. Răspunsul furnizorului și consecințele lui sunt consemnate în §32.
- Criteriul E4.11 din planul v2.4 **nu este bifat**: lipsesc dovezile din producție (planul r3.2, §9).
- Manualul 7D, DEC-23 (modificările D23-1, D23-5, D23-6, planul r3.2 §8) și lista variabilelor din documentul de arhitectură: **neactualizate**; se fac după proba pe staging, conform §24.4.

**Ce NU înseamnă această consemnare:** nu autorizează instalarea pe staging, proba E4.11 pe staging, repetiția V3, vreo restaurare sau vreo operație pe staging, producție, cPanel, cron ori `civic.env`; nu activează G6-1 (c); nu decide DEC-3b, DEC-16 (R1 / R2) sau DEC9-4; nu modifică planul v2.4, planul r3.2 sau deciziile P1–P10. Lansarea publică nu este aprobată.

## 32. Răspunsul ClausWeb din 02.11.2026 și consecințele lui (§29.2, §30)

**Sursa:** răspunsul echipei de suport ClausWeb la întrebările trimise la 02.11.2026, ~09:03 (§31.7), transmis de proprietar în conversația de lucru în aceeași zi. Textul integral nu este păstrat în repository; mai jos sunt consemnate numai informațiile comunicate de furnizor.

**Originea deciziilor:** concluzia tehnică din §32.2 se sprijină pe răspunsul furnizorului (§32.1, rândurile 1 și 2). Regula din §32.3 a fost propusă de auditor ca măsură preventivă. Adoptarea de către proprietar a concluziei tehnice din §32.2 și a regulii preventive din §32.3: confirmată la 02.11.2026.

### 32.1 Confirmările furnizorului

| # | Întrebarea (§29.2, §30) | Ce a comunicat furnizorul |
|---|---|---|
| 1 | după „Stop App”, o cerere HTTP către subdomeniul de staging repornește aplicația? | **nu.** Oprirea prin „Stop App” dezactivează configurația Passenger și salvează starea `stopped`; repornirea necesită acțiunea explicită „Start App” |
| 2 | starea de oprire se păstrează după o repornire a serverului? | **da.** Starea `stopped` este persistentă și se păstrează inclusiv după repornirea serverului |
| 3 | ora copiilor zilnice ale furnizorului | **în jurul orei 04:16, ora României**, ca oră a punctului de restaurare; furnizorul **nu a comunicat** ora începerii și durata operației |

### 32.2 Decizia privind §29.2

Pe baza răspunsului explicit al furnizorului (rândurile 1 și 2 din §32.1), **condiția tehnică din §29.2 este considerată îndeplinită** (adoptarea: vezi „Originea deciziilor”).

Această concluzie **nu înseamnă** activarea G6-1 (c), oprirea staging-ului sau modificarea sarcinilor cron. Acestea rămân condiționate de deciziile și aprobările separate prevăzute în §29.3 și DEC-16 (alegerea între R1 și R2 rămâne deschisă).

### 32.3 Decizia privind §30: intervalul restaurărilor

Regula operațională preventivă, propusă de auditor (adoptarea: vezi „Originea deciziilor”):

> **Nu se execută restaurări pe găzduire în intervalul 03:00–06:00, ora României.**

Justificarea:
- furnizorul a comunicat ora aproximativă 04:16 pentru punctul de restaurare (§32.1, rândul 3);
- furnizorul nu a comunicat ora începerii și durata operației;
- intervalul 03:00–06:00 acoperă preventiv și sarcinile cron proprii de noapte (`backup:db` la 03:17 și `purge:retention` la 03:47).

**Fereastra este o măsură de precauție care reduce riscul suprapunerii, nu o garanție tehnică privind intervalul complet de execuție al copiilor furnizorului.**

### 32.4 Ce NU se schimbă prin această secțiune

- DEC-16: alegerea între R1 și R2 rămâne deschisă;
- G6-1 (c): decisă (§29.1), **neactivată**;
- staging-ul rămâne în funcțiune; sarcinile cron nu se opresc, nu se modifică și nu se repornesc;
- nicio configurație cPanel, aplicație sau server nu este modificată;
- nicio restaurare (inclusiv repetiția V3) și nicio instalare pe staging nu sunt autorizate prin această consemnare;
- planul v2.4, planul r3.2 și concluziile §31 rămân neschimbate.

---

## 33. DEC-16 în perioada de oprire a staging-ului: regimul R2 (02.11.2026)

**Decizia:** proprietarul a ales la 02.11.2026, în conversația de lucru, **regimul R2** din §29.3 pentru evidența DEC-16 în perioada de oprire a staging-ului (G6-1 c) și, pentru verificarea (1), **citirea stării în cPanel**. Varianta R2 a fost recomandată de auditor și de analiza din conversația de lucru; alegerea aparține proprietarului.

**Condiția prealabilă din §29.3** (confirmarea furnizorului din §29.2) este îndeplinită: §32.1 și §32.2.

### 33.1 Regimul adoptat

Se aplică tabelul R2 din §29.3 (la oprire, în perioada de oprire, săptămânal, la repornire) și precizările de acolo, fără modificări, cu o singură completare: metoda verificării (1).

| Verificarea săptămânală | Metoda |
|---|---|
| (1) aplicația de staging este oprită | **citirea stării aplicației în cPanel, ecranul „Setup Node.js App”**: starea afișată trebuie să fie cea de oprire (`stopped`). **Numai citire: fără niciun click pe „Start App” sau pe alte comenzi ale aplicației** |
| (2) lista sarcinilor cron | lista din cPanel **nu conține linii de staging** (§29.3, neschimbat) |
| (3) `backup.log` | fără intrări noi (§29.3, neschimbat) |

- Cererea HTTP către subdomeniul de staging, admisibilă după §32.2, **nu face parte** din verificarea săptămânală.
- Rezultatul se consemnează ca „oprire confirmată” sau ca neconformitate a opririi (§29.3).
- Verificarea săptămânală **nu este o verificare DEC-16** și nu înlocuiește verificarea DEC-16 completă de la repornire (§29.3).

### 33.2 Natura și intrarea în vigoare

- Este o **completare** a DEC-16, de felul celor din §26. Operatorul (proprietarul), frecvența zilnică și cele trei controale DEC-16 (`backup.log`, coada de e-mail, `health`; manualul 7D, §6.3) **nu se schimbă**.
- Regimul R2 se aplică **numai din momentul opririi staging-ului** în cadrul G6-1 (c). Până atunci, verificarea zilnică DEC-16 continuă neschimbată.
- Manualul 7D (§6.3) se actualizează separat, cu aprobare distinctă.

### 33.3 Risc semnalat pentru activarea G6-1 (c)

La pasul opririi trebuie stabilit, o singură dată, ce servește subdomeniul de staging după dezactivarea configurației Passenger (de exemplu, dacă rămân fișiere accesibile public în directorul site-ului). Este o chestiune a pasului de oprire, nu a DEC-16, și nu este evaluată prin această consemnare.

**Ce NU înseamnă această consemnare:** nu activează G6-1 (c); nu autorizează oprirea staging-ului, salvarea sau eliminarea liniilor cron ori vreo operație pe staging, producție sau în cPanel (verificările din §33.1 se fac numai după oprire); nu modifică §16, §26 sau §29, planul v2.4 ori manualul 7D; nu decide propunerea din §25.3 (monitorizarea spațiului), DEC9-4 sau DEC-3b. Lansarea publică nu este aprobată.

---

## 34. Pasul 1 al instalării `2fc8403` pe staging: rezultatele pregătirii; decizia de licență pentru staging și blocajul pentru producție (02.11.2026)

**Sursa:** deciziile proprietarului din 02.11.2026, luate în conversațiile de lucru, și verificările enumerate mai jos, fiecare cu natura dovezii ei. Recomandările lui Claude sunt marcate ca atare și nu sunt aprobări. Propunerea de instalare (`PROPUNERE_INSTALARE_2fc8403_STAGING.md`) și pachetul de transfer dintre conversații **nu sunt păstrate în repository**; trimiterile „§5.1.1” și „§5.1.2” de mai jos se referă la acea propunere.

**Natura dovezilor**, folosită în tabelele de mai jos:
- **executat anterior**: executat de Claude într-o conversație de lucru anterioară din 02.11.2026 și raportat proprietarului; în conversația curentă nu a fost reexecutat;
- **verificat de Claude**: verificat în conversația curentă, numai prin citire (amprente, clonă temporară a depozitului, citirea codului);
- **verificat de proprietar**: verificat de proprietar și transmis prin capturi, citite de Claude.

### 34.1 Ordinea pașilor

**Succesiunea propusă a etapelor** (**neadoptată**; se consemnează ca propunere, până la confirmarea ei separată de către proprietar, decizia din 02.11.2026): 1) pregătirea instalării `2fc8403`; 2) instalarea pe staging; 3) proba E4.11 pe staging; 4) repetiția V3 (DEC9-1); 5) proba E4 în instanța B; 6) oprirea staging-ului și intrarea în regimul G6-1 (c). Fiecare etapă cere oricum aprobarea ei distinctă. Staging-ul rămâne pornit, pe `85d3c45`, cu copii necriptate.

**Ordinea consemnării** (decisă de proprietar la 02.11.2026, varianta A, recomandată de Claude): decizia de licență și rezultatele pasului 1 se consemnează în registru (această secțiune) **înaintea** discutării instalării pe staging.

### 34.2 Deciziile proprietarului asupra propunerii de instalare (02.11.2026)

**Originea:** variantele A la D-1 și D-2 au fost recomandate de Claude în propunere; proprietarul le-a **confirmat explicit ca decizii ale sale** la 02.11.2026.

| Decizia | Varianta |
|---|---|
| D-1 (probele pe telefon) | **A**: numai `health` și panoul Admin (PC1–PC4); matricea A0–A7 nu se repetă |
| D-2 (dovada backup-ului cu codul nou) | **A**: copia de noapte (P7); fără backup manual suplimentar |
| D-3 (ziua instalării) | **nedecisă**; PC1–PC4 în afara intervalului 03:00–06:30, ora României |

### 34.3 Pachetul construit

Construirea locală a fost aprobată de proprietar la 02.11.2026.

| Elementul | Rezultatul | Natura dovezii |
|---|---|---|
| fișierul | `civic-2fc8403.zip`, 1.479.760 B, 22 de fișiere, fără `-dirty` | executat anterior; dimensiunea și numărul fișierelor verificate de Claude |
| SHA-256 | `2445980914a93a2feae6a9093ef4115558ddb988da9be9e0e4517c79ca7a6738` | executat anterior; amprenta fișierului transmis de proprietar verificată de Claude: identică |
| construit din | clonă curată `2fc8403`; Node 22.23.4, npm 10.9.9; `npm ci`, `npm run build`, `npm run build -w server`, `package-release.py` fără `--bootstrap-email` | executat anterior |
| comparația cu `85d3c45` (reconstruit numai pentru comparație, §5.1.1) | aceeași listă (22/22); identice: `dist/`, migrațiile, seeds, `server/data/`, `server/dist/package.json`; diferă numai: `package.json` (câmpul `version`; fără `dependencies` în ambele), `RELEASE.txt` (rândul `commit:`), `server/dist/app.js`, `server/dist/app.js.LEGAL.txt` (numai adăugări) | executat anterior |
| notele de licență adăugate în `app.js.LEGAL.txt` (toate MIT) | `@scure/base` 2.4.0; `@noble/ciphers` 2.4.0; `@noble/hashes` 2.4.0 și 2.0.1; `@noble/curves` 2.4.0 și 2.0.1; `@noble/post-quantum` 0.5.4. **Lipsește nota `age-encryption` 0.3.1 (BSD-3-Clause)**: §34.7 | executat anterior |
| fișiere interzise | fără `node_modules`, `.env*`, `.map` | executat anterior |

**Amprenta identifică exact acest fișier.** O reconstruire produce altă amprentă; dacă fișierul se pierde, reconstruirea cere aprobare, iar noua amprentă se consemnează.

### 34.4 Probele artefactului fără `node_modules` (§5.1.2)

Pe conținutul extras din `civic-2fc8403.zip`, într-un director gol, fără `node_modules`, cu Node 24.21.0, o bază de test locală și chei de test generate pentru probă și șterse după ea.

| Proba | Rezultatul | Natura dovezii |
|---|---|---|
| 1. analiza statică | raportat: 0 `require` / `import` către `age-encryption`, `@noble/…`, `@scure/…`; aceeași listă de 8 module externe ca la `85d3c45` | executat anterior; vezi precizarea 3.3 (§34.5) |
| 2. pornirea și `health` | raportat: `0.0.0+2fc8403`; 0 mesaje E4.11 la pornire | executat anterior |
| 3. `backup:db` fără cheie | raportat: copie în clar; 0 fișiere `.age`; manifest fără câmpul `encryption` | executat anterior |
| 4. `backup:db` cu cheie de test (proba refăcută) | 4a `backup:db`: cod 0, copie criptată (`binding.json.age`, `db.jsonl.gz.age`, `manifest.json`, `markers.json`; 0 fișiere de date în clar; `scheme: age-x25519`); 4b `restore:db --check`: cod 1, refuz cu mesajul „copie criptată”; 4c `backup:verify`: cod 0; 4d `backup:decrypt`: cod 0, copia `civic-restore-…` cu `DECRYPTED-COPY.json`; 4e control negativ (fraza greșită): cod 1 | executat anterior, pe arhiva cu amprenta de mai sus (verificată în script), cu codurile de ieșire ale aplicației capturate prin `PIPESTATUS`; jurnalul și scriptul verificate de Claude (amprentele de mai jos) |
| 5. `APP_ENV=production` fără cheie | raportat: pornire refuzată, cod 1 | executat anterior |

Fișierele probei 4 refăcute, păstrate de proprietar (nu în repository):
- jurnalul `proba4_refacuta.log`: SHA-256 `efdb4233e2ae93c6a14b9ad94a186035bb4e270b35bf2ab45a0059b124fc6e7f`;
- scriptul `probe4_refacuta.sh`: SHA-256 `8781a99bff085abdeac2db5ad4401a4d5dec860e2ba4e758bf603d0e1cd9a044`.

**Precizări la jurnalul probelor inițiale:**
- În scriptul inițial, codul raportat pentru `backup:verify` era al comenzii `tail`, nu al aplicației; de aceea proba 4 a fost refăcută. Observația 3.2 este **închisă** prin proba refăcută (decizia proprietarului, 02.11.2026).
- Două verificări `restore:db --check` suplimentare din probele 3–4 inițiale au fost pregătite greșit (baza nu era goală; copia nu era în `BACKUP_DIR`) și **nu sunt rezultate ale artefactului**.
- Probele 1, 2, 3 și 5 nu au fost refăcute; jurnalul lor nu a fost transmis în conversația curentă.

**Formularea admisă:** probele de mai sus **nu se consemnează ca „toate PASS” fără precizările din §34.4 și §34.5** (decizia proprietarului, 02.11.2026).

### 34.5 Precizările la probe

| # | Subiectul | Starea |
|---|---|---|
| 3a | criptarea fotografiilor | datele demo nu conțin fotografii (jurnalul probei 4: „fotografii în manifest: 0”). Există în CI un test cu titlul indicat (`server/test/integration/e411CriptareBackup.test.ts`, „structura exactă: manifest și marcaje în clar, binding, baza și fotografiile criptate; nimic altceva”). Conținutul și acoperirea efectivă a criptării fotografiilor nu au fost verificate în această revizie. Potrivit informației proprietarului, testul urmărește acest scenariu. **Criptarea fotografiilor rămâne neprobată pe artefact**; se probează la pasul 3 (proba E4.11 pe staging) sau printr-o probă locală separată, cu aprobare distinctă |
| 3b | controlul negativ (4e) | jurnalul arată codul 1, dar **nu și motivul eșecului**. Limită acceptată de proprietar; proba nu se reface pentru aceasta |
| 3c | „fișiere criptate decriptate integral: 1” la o copie cu două fișiere `.age` | **închisă**, verificat de Claude prin citirea codului (`server/src/db/backupCrypto.ts`, identic la `2fc8403` și `2b677fc`): `binding.json.age` este decriptat separat, înaintea buclei, fără să modifice contorul (r. 268–278); contorul `filesChecked` numără numai fișierele din lista `binding.files` (baza și fotografiile), după decriptarea integrală și verificarea amprentei (r. 283–306); mesajul este scris în `server/src/cli.ts`, r. 627. Valoarea 1 înseamnă baza |
| 3.3 | analiza statică (proba 1) | jurnalul inițial conține rândul „GĂSIT require interzis”, un **fals pozitiv al scriptului** (construcția `grep … \| head -3 && echo …` afișează mesajul indiferent dacă `grep` găsește ceva). Verificarea refăcută, cu rezultatul raportat 0, **nu este păstrată în fișiere**. **Deschisă**; dacă se cere dovada, se propune o probă separată, numai locală, cu aprobarea proprietarului |

### 34.6 Starea depozitului și CI-ul (V0 din propunere)

**Depozitul**, verificat de Claude prin citire (clonă temporară, fără nicio modificare):

| Elementul | Rezultatul |
|---|---|
| `faza-5-backend`: HEAD = `origin` | `2b677fcb2ffe7fc9f9aaa9677cf3e97330bce967`; arbore curat; 0 commituri nepublicate |
| istoricul | `2b677fc` → `74083fe` → `2fc8403` → `ec962b4` → `7eabb8a` |
| `2fc8403` | `2fc8403943c9ae5fa05a01822369e90e69c29127`, în istoricul ramurii |
| SHA-256 al acestui registru la `2b677fc` (înaintea §34) | `27c2c54a7a2eece00479a49207bd9b6a7c39d6451c001e76f52484601cecffd2`; ultima secțiune: §33 |
| `main` | `d9bc2c9f53cec27dafc846889b0457eea8495d20`; confirmată de proprietar ca neschimbată; **referința pentru verificările ulterioare** |

**CI-ul.** Citirea prin API-ul GitHub și prin WebFetch a fost refuzată în sesiunea de lucru; depozitul nu a fost atașat cu drept de scriere (decizia proprietarului). Verificat de proprietar, prin capturile paginilor rulărilor:

| Rularea (după linkul deschis) | Numărul afișat | Commitul | Starea | Joburile |
|---|---|---|---|---|
| 41299023089 | #173 | `2fc8403` | Success | 7/7 verzi (6 backend, inclusiv Node 24.21.0 + MariaDB 11.4.13, producție; E2E) |
| 41412131145 | #174 | `74083fe` | Success | 7/7 verzi |
| 41415345573 | #175 | `2b677fc` | Success | 7/7 verzi |

**Limita dovezii:** ID-urile rulărilor nu sunt vizibile în capturi; asocierea cu ele se sprijină pe linkurile deschise de proprietar. Commitul, ramura și titlul din fiecare captură corespund istoricului din clonă.

**V0 este îndeplinit.** `npm audit` nu a fost reexecutat în această verificare; rămâne valabilă constatarea din §31.5.

### 34.7 Decizia de licență pentru staging: varianta A

**Problema** (§31.6): codul `age-encryption` 0.3.1 (BSD-3-Clause, care cere păstrarea notei de copyright la redistribuire) este inclus în `server/dist/app.js`, dar nota lui **nu apare** în `server/dist/app.js.LEGAL.txt`.

**Decizia proprietarului** (02.11.2026): **varianta A** (recomandată de Claude). Nota lipsă pentru `age-encryption` 0.3.1 este acceptată **temporar**, **numai pentru utilizarea internă pe staging**. Artefactul `civic-2fc8403.zip` (SHA-256 de mai sus) **nu se corectează**.

**Limitarea:** acceptarea este o **decizie operațională, limitată la staging**. Ea **nu afirmă** că utilizarea internă elimină obligațiile licenței BSD-3-Clause și nu este o evaluare juridică.

### 34.8 Blocajul pentru producție

> **Utilizarea în producție este interzisă până la corectarea problemei de licență.** Niciun artefact în care problema nu este corectată, inclusiv `civic-2fc8403.zip`, nu se instalează și nu se utilizează în producție.

### 34.9 Corectura ulterioară și consecințele ei

- Corectura va fi o **modificare separată**: commit, CI, artefact nou și repetarea probelor, fiecare cu aprobarea ei.
- Se reface **inventarul complet al notelor de licență** din bundle, pentru tot codul inclus (inclusiv cele două versiuni de `@noble/curves` și de `@noble/hashes`, precum și `@noble/post-quantum`), nu doar adăugarea notei pentru `age-encryption` (observația 3.5).
- Artefactul corectat va avea **alt SHA** și **nu va fi considerat automat echivalent** cu `2fc8403`. Rezultatele probelor E4.11 efectuate pe `2fc8403` (probele artefactului din §34.4 și, ulterior, proba de pe staging) **nu se transferă automat** asupra noului artefact.
- **Înaintea producției se decide separat** dacă artefactul corectat necesită: comparația fișier cu fișier față de `2fc8403`; probele fără `node_modules`; o nouă instalare pe staging sau o justificare documentată pentru lipsa ei. **Aceste decizii nu sunt luate prin această consemnare.**

### 34.10 Starea pasului 1

Pasul 1 (pregătirea instalării `2fc8403`) este **încheiat la nivelul pachetului și al probelor locale**, cu precizările din §34.4–§34.5. Rămân: decizia instalării pe staging și ziua ei (D-3), fiecare cu aprobare separată.

**Ce NU înseamnă această consemnare:** nu autorizează instalarea pe staging, alegerea zilei (D-3), proba E4.11 pe staging, adăugarea `BACKUP_AGE_RECIPIENT`, repetiția V3, vreo restaurare sau vreo operație pe staging, producție, cPanel, cron ori `civic.env`; nu autorizează corectura de licență și nu decide verificările din §34.9; nu închide punctul „verificarea notelor de licență”, care rămâne deschis, cu blocajul din §34.8; nu bifează criteriul E4.11 din planul v2.4; nu activează G6-1 (c); nu decide DEC-3b, DEC9-4 sau propunerea din §25.3; nu modifică planul v2.4, planul r3.2 sau §31. Riscul de memorie al `backup:db` (§31.6) rămâne deschis. Lansarea publică nu este aprobată.

---

## 35. Instalarea `2fc8403` pe staging: încheiată la 03.11.2026, confirmată la 04.11.2026; abaterea V2 (versiunea Node a găzduirii); constatări (03–04.11.2026)

**Sursa:** propunerea de instalare (`PROPUNERE_INSTALARE_2fc8403_STAGING.md`, nepăstrată în repository; numerotarea V0–V8, I-0…I-8, P1–P9 îi aparține) și verificările de mai jos, fiecare cu natura dovezii ei:
- **verificat de Claude**: numai prin citire, pe o clonă temporară a depozitului;
- **captură**: verificat de proprietar, cu captura ecranului citită de Claude;
- **confirmare**: verificat de proprietar și confirmat în scris, fără captură.

Orele nu sunt consemnate, cu excepția momentelor UTC care fac parte din numele copiilor de backup și a orelor programate ale sarcinilor cron.

### 35.1 Decizia D-3 și completările ei (02.11.2026)

**Decizia proprietarului** (02.11.2026): **D-3 = A**. Instalarea planificată la 03.11.2026, în prima parte a zilei, cu 2–3 ore rezervate; verificarea P7–P9 obligatorie la 04.11.2026, dimineața; amânarea, dacă oricare dintre V0–V8 nu corespunde. Stabilirea datei nu a autorizat nicio comandă pe server.

Completările adoptate de proprietar odată cu D-3:
1. instalarea este „încheiată” după P1–P6 și „confirmată” numai după P7–P9;
2. ambele amprente (`civic-2fc8403.zip`, `civic-85d3c45.zip`) se verifică pe calculatorul proprietarului, cu `Get-FileHash`, în ziua instalării;
3. V0 se reface în ziua instalării, numai prin citire;
4. V8 (verificarea DEC-16 a zilei) trebuie făcută și conformă înaintea începerii.

Organizarea aprobărilor (decisă de proprietar): întâi verificările V0–V8; apoi, separat, aprobarea sau refuzul instalării.

### 35.2 Verificările înaintea instalării (03.11.2026)

| # | Verificarea | Rezultatul | Natura dovezii |
|---|---|---|---|
| V0 | depozitul | `origin/faza-5-backend` = `436013c`; `2fc8403` în istoric; între `2fc8403` și `436013c` s-a modificat numai documentația (codul identic cu pachetul); `origin/main` = `d9bc2c9f53cec27dafc846889b0457eea8495d20`; registrul: SHA-256 `7133d17e…7b7d`. CI-ul `2fc8403`: rularea 41299023089 (§34.6) | verificat de Claude (aprobat de proprietar) |
| V6 | amprentele pe calculator | `civic-85d3c45.zip`: `7b61820cfa59dfc0f67144e5b06cd373eb82ebf924c4aec5ab34987bec4d3890`; `civic-2fc8403.zip`: `2445980914a93a2feae6a9093ef4115558ddb988da9be9e0e4517c79ca7a6738`: **identice** cu cele consemnate | captură (`Get-FileHash`) |
| V1 | `health` | `{"status":"ok","version":"0.0.0+85d3c45"}` | captură |
| V2 | Setup Node.js App | `civic-test-app`: **started (v24.22.2)**, mod `production`. **Abatere**: §35.3 | captură |
| V3 | sarcinile cron | 4 linii, aceleași (în altă ordine de afișare) | confirmare |
| V4 | `backup.log` | ultima copie: `civic-backup-20261103T011702263Z`, fără eroare; rotația: șters `civic-backup-20261026T011702152Z` | confirmare (textul jurnalului transmis) |
| V5 | `stderr.log` (`civic-test-app`) | 2,62 KB, modificat la 12.10.2026; conține numai cele 7 rânduri ale probei intenționate R12 (jurnalul staging-ului, intervenția 32). Referință pentru I-7b | captură |
| V7 | momentul | dimineața, în afara intervalului 03:00–06:30 | — |
| V8 | DEC-16 a zilei | `backup.log` (V4), `health` (V1) și coada de e-mail: `registry_notification` / `sent` / 1; `citizen_status_update` / `sent` / 1; `citizen_login_code` / `sent` / 7; 0 `failed`, 0 `sending`, 0 `queued`. Totalul (9) corespunde rândurilor `email_outbox` din copia de noapte. **Referința PC1** | captură |

### 35.3 Abaterea V2: versiunea Node a găzduirii

| | Valoarea |
|---|---|
| consemnată (CI, jobul „producție”; probele artefactului, §34.4) | Node **24.21.0** |
| constatată pe găzduire la 03.11.2026 | Node **24.22.2** |

- Schimbarea versiunii **nu a fost făcută de proiect**; data ei nu este cunoscută.
- **Informația proprietarului** (03.11.2026), din experiența cu furnizorul: ClausWeb **actualizează Node fără anunț**.
- **Decizia proprietarului** (03.11.2026, varianta B): abaterea se acceptă **numai pentru staging**; verificările V3–V8 continuă; aprobarea instalării include acceptarea abaterii. Aprobarea instalării a fost dată de proprietar („Aprob”) ca răspuns la cererea care includea explicit acceptarea abaterii V2.
- **Consecința:** `2fc8403` rulează pe staging pe o versiune Node pe care nu a fost testat în CI și nici în probele artefactului. Jobul CI „producție” nu mai reproduce găzduirea.

**Măsuri propuse, NEADOPTATE** (de decis separat, înaintea oricărei discuții despre producție):

| # | Măsura propusă |
|---|---|
| a | jobul CI „producție” trece de la versiunea exactă la ultima versiune Node 24, iar versiunea exactă a găzduirii se consemnează la fiecare instalare |
| b | V2 rămâne obligatorie la fiecare instalare, cu versiunea Node consemnată |
| c | versiunea Node se adaugă în evidența DEC-16 (o citire în „Setup Node.js App”); completare a DEC-16, decizia proprietarului |
| d | se verifică, o singură dată și numai prin citire, dacă selectorul din cPanel permite fixarea unei versiuni exacte |

### 35.4 Instalarea (03.11.2026)

**Aprobarea:** proprietarul, 03.11.2026, după verificările din §35.2 (vezi §35.3 pentru acceptarea abaterii V2).

| Pas | Ce s-a făcut | Rezultatul | Natura dovezii |
|---|---|---|---|
| I-0 (PC1) | panoul „Fluxul către Primărie” (fără salvare) și interogarea cozii | „staging: numai adresele din listă”; destinatarul de test; coada identică cu referința din V8 | confirmare; captură (coada) |
| I-1 | `health` | `0.0.0+85d3c45`, `ok` | confirmare |
| I-2 | „Run JS script” → `civic-backup-db` | **copia de revenire `civic-backup-20261103T072800019Z`**; `stderr` gol; rotația: șters `civic-backup-20261027T011702277Z`. `audit_log`: 52 (51 la copia de noapte; autentificarea proprietarului în panou) | captură |
| I-2b (PC2) | coada și panoul | identice cu referința | confirmare |
| I-3 | STOP APP | `stopped` | confirmare |
| I-4 | urcarea `civic-2fc8403.zip` (din fișierul verificat la V6), extragerea în `civic-test-app`, ștergerea arhivei | `RELEASE.txt`: `commit: 2fc8403`, fără „modificari necomise”; niciun subdosar `civic-2fc8403`; arhiva absentă. Proprietarul a executat cele trei operații ale pasului într-o singură secvență; conținutul a fost verificat înaintea pornirii | captură (`RELEASE.txt`); confirmare |
| I-5 | migrații | **nu** (nicio migrație nouă) | — |
| I-6 | `civic.env` | **nemodificat** (data fișierului: 13.10.2026, neschimbată) | captură (listarea din 04.11.2026) |
| I-7 | START APP | `started (v24.22.2)`; `health`: `{"status":"ok","version":"0.0.0+2fc8403"}` | captură; confirmare |
| I-7b | `stderr.log` | **neschimbat** față de V5 (2,62 KB, 12.10.2026): fără erori de pornire, fără `NECONFORMITATE (E4.11)` / `AVERTISMENT (E4.11)` | captură |
| I-8 (PC3) | coada și panoul (servit de codul nou) | identice cu referința | confirmare |

Nicio oprire, nicio revenire. Niciun e-mail trimis pe durata instalării (PC1–PC4).

### 35.5 Criteriile P1–P9

| # | Criteriul | Rezultatul | Data | Natura dovezii |
|---|---|---|---|---|
| P1 | `health` | `{"status":"ok","version":"0.0.0+2fc8403"}` | 03.11.2026 | captură |
| P2 | `RELEASE.txt` și amprenta pachetului | `commit: 2fc8403`; amprenta verificată la V6 | 03.11.2026 | captură |
| P3 | `stderr.log` | neschimbat (I-7b) | 03.11.2026 | captură |
| P4 | `noindex`, `robots.txt`, ruta de diagnostic (manualul 7D, 5.2–5.5), cu `curl` de pe calculatorul proprietarului | pagina principală: `200`, `x-robots-tag: noindex, nofollow`; `favicon.svg`: `200`, `image/svg+xml`, același antet; `api/v1/health`: `200`, același antet, `Content-Length: 41`; `robots.txt`: `User-agent: *` / `Disallow: /`; `api/v1/diag/client-ip`: `{"error":{"code":"NOT_FOUND",…}}`. Fișierele statice au `last-modified: Mon, 02 Nov 2026 09:09:18 GMT` (momentul construirii pachetului). O primă încercare cu un nume de fișier greșit (`404`, cu același antet) nu este considerată verificarea fișierului static | 03.11.2026 | captură (antetele); confirmare (`robots.txt`, ruta de diagnostic) |
| P5 | sarcinile cron | 4 linii, neschimbate față de V3 | 03.11.2026 | confirmare |
| P6 | PC4 | coada identică cu referința; „numai adresele din listă”; destinatarul de test | 03.11.2026 | captură (coada); confirmare (panoul) |
| D-1 | probele pe telefon (§34.2) | `health`: `{"status":"ok","version":"0.0.0+2fc8403"}`; panoul Admin se încarcă (servit de codul nou); secțiunea „Fluxul către Primărie”: „staging: numai adresele din listă” (`allowlist`), destinatarul de test, fluxul pornit; **fără salvare** | 03.11.2026 | captură |
| P7 | prima copie de noapte pe `2fc8403` | `backup.log`: `civic-backup-20261104T011702418Z`, fără eroare și fără `NECONFORMITATE`; copia conține `db.jsonl.gz`, `manifest.json`, `markers.json`, `photos`, **niciun fișier `.age`** (copie în clar, format neschimbat) | 04.11.2026 | captură |
| P8 | `purge.log` | modificat la 04.11.2026, la ora rulării programate (03:47); fără erori. Rândurile fișierului nu au dată; dovada rulării este data modificării | 04.11.2026 | captură |
| P9 | DEC-16 a zilei | `backup.log` (P7); `health` `0.0.0+2fc8403`, `ok`; coada identică cu referința (0 `failed`, 0 `sending`, 0 `queued`) | 04.11.2026 | captură |

**Instalarea `2fc8403` pe staging este încheiată (03.11.2026) și confirmată (04.11.2026).** Copiile de pe staging rămân în clar (fără `BACKUP_AGE_RECIPIENT`); revenirea la `85d3c45` rămâne compatibilă cu ele (de reevaluat la momentul unei reveniri).

### 35.6 Constatări

| # | Constatarea | Dovada |
|---|---|---|
| 1 | **Fusul orar al cron-ului** (punct marcat anterior ca neverificat): sarcinile cron urmează **ora României**, conform dovezilor disponibile înainte și după trecerea la ora de iarnă. Comportamentul chiar în intervalul orar repetat din 25.10.2026 nu este dovedit separat. Sarcina `backup:db` este programată la **minutul 17, ora 3** (V3). Copia din 25.10.2026, înaintea trecerii la ora de iarnă (UTC+3), poartă momentul `20261025T0017…Z` (00:17 UTC = 03:17, ora României); copiile de după trecere (UTC+2) poartă `T0117…Z` (de exemplu `20261103T011702263Z`, `20261104T011702418Z`; 01:17 UTC = 03:17, ora României). Ora UTC a rulării s-a schimbat odată cu ora legală, deci programarea nu este o diferență fixă față de UTC | programarea: V3 (confirmare); momentele: `backup.log` (V4, P7; captură din 04.11.2026) |
| 2 | **Rotația copiilor**: copiile mai vechi de 7 zile sunt șterse de `backup:db` (la 03:17), **nu** de `purge:retention` (03:47). În `server/src/db/backup.ts` (identic la `2fc8403` și `436013c`): momentul `now`, stabilit la începutul copiei (r. 295), dă numele copiei noi (r. 298) și este transmis rotației (r. 341); limita este `now − 7 zile` (r. 462); se șterg numai copiile cu momentul **strict mai mic** decât limita (r. 466). `rotateBackups` nu este apelată în altă parte în `server/src`. **`purge:retention` este separată de rotație:** comanda apelează `purgeRetention` (`server/src/cli.ts`, r. 196–200; `server/src/maintenance.ts`, r. 53–131), care nu face nicio referire la `BACKUP_DIR` sau la copiile `civic-backup-*`; singurele ei operații pe fișiere privesc `STORAGE_DIR` (fișierele temporare din `STORAGE_DIR/tmp`, `purgeTmpFiles`, r. 241, și fotografiile sesizărilor expirate, `deleteReportsHard` din `server/src/db/reportDeletion.ts`). Pe staging, `backups` și `storage` sunt dosare distincte în `civic-test-data` (listarea din P8); valorile din `civic.env` nu au fost citite. La 04.11.2026: limita = `20261028T011702418Z`; cea mai veche copie, `civic-backup-20261028T011702629Z`, este cu 0,211 s mai nouă, deci a fost păstrată, iar `backup.log` nu are rândul „șterse”. Comportament corect, conform codului | citirea codului (Claude); listarea `backups` (captură); `backup.log` (captură) |
| 3 | `outbox-cron.log` și `surveys-cron.log` modificate la 04.11.2026: sarcinile de 2 și 5 minute rulează pe `2fc8403` | listarea `civic-test-data` (captură) |
| 4 | **Staging-ul are 5 fotografii** (`report_photos`: 5; „fotografii: 5” în copii). Relevant pentru proba E4.11 pe staging: criptarea fotografiilor, neprobată pe artefact (§34.5, 3a), poate fi probată acolo | `backup.log` |
| 5 | **Manualul 7D (`FAZA_7D_MANUAL_INSTALARE_OPERARE_CIORNA.md`, §5, rândurile 316–319) conține, în comenzile `curl`, utilizatorul real al protecției Basic-auth**, contrar regulii „utilizatorul Basic-auth niciodată în repository”. Constatarea privește un text existent, nu această instalare. Corectura (înlocuirea cu un marcaj) este o modificare separată, cu aprobare distinctă; utilizatorul nu este reprodus în această secțiune | citirea manualului (Claude); comanda folosită la P4 |

### 35.7 Ce NU înseamnă această consemnare

Nu autorizează proba E4.11 pe staging, adăugarea `BACKUP_AGE_RECIPIENT`, repetiția V3, vreo restaurare sau vreo operație pe staging, producție, cPanel, cron ori `civic.env`; nu adoptă succesiunea celor șase etape din §34.1; nu adoptă măsurile din §35.3; nu corectează manualul 7D; nu bifează criteriul E4.11 din planul v2.4; nu ridică blocajul pentru producție din §34.8 (licența `age-encryption`); nu activează G6-1 (c); nu decide DEC-3b, DEC9-4 sau propunerea din §25.3. Riscul de memorie al `backup:db` (§31.6) rămâne deschis. Lansarea publică nu este aprobată.

---

## 36. Etapa 3 (E4.11 pe staging): încheiată la 04.11.2026, confirmată la 05.11.2026; cheia de staging; succesiunea condiționată; CI aliniat la găzduire; publicări și constatări (04–05.11.2026)

**Sursa:** deciziile proprietarului din 04–05.11.2026, din conversația de lucru, și verificările de mai jos, cu natura dovezii: **verificat de Claude** (numai citire: depozitul, codul, CI prin `gh`); **captură** (verificat de proprietar, captura citită de Claude); **confirmare** (verificat de proprietar, confirmat în scris). Recomandările lui Claude și ale auditorului nu sunt aprobări. Orele nu sunt consemnate, cu excepția momentelor UTC din numele copiilor și a orelor programate ale sarcinilor cron.

### 36.1 Publicări în depozit și CI

| Commitul | Conținutul | Publicarea | CI |
|---|---|---|---|
| `436013c` | registrul §34 (02.11.2026) | push de pe calculatorul proprietarului, din bundle (varianta B) | rularea #176, ID **41505801052** (ID-ul lipsea din §34–§35): 7/7 succes |
| `70ded7d` | registrul §35 | idem (bundle cu un singur commit, amprenta verificată pe calculator) | #177, ID 41787662770: 7/7 succes (citit de Claude prin `gh`) |
| `7ce1126` | manualul 7D: utilizatorul Basic-auth înlocuit cu `<utilizator>` (rândurile 71, 316, 317, 319); §36.3 | push din sesiune | #178, ID 41791511882: 7/7 succes |
| `1524891` | CI: jobul de producție (DEC-8 c1) fixat pe Node 24.22.2; §36.7 | push din sesiune | #179, ID 41884838317: 7/7 succes |

**Dreptul de push din sesiune:** proprietarul a aprobat la 04.11.2026 atașarea depozitului cu drept de scriere în sesiunea de lucru (până atunci: numai citire, push prin bundle de pe calculator). Claude a precizat, iar proprietarul nu a contestat, că **regula aprobării separate a fiecărui push rămâne** (aplicarea, commitul și push-ul, fiecare cu aprobare); s-a aplicat astfel la `7ce1126` și `1524891`. Protecția depozitului este de acum procedurală, nu tehnică.

`origin/main` = `d9bc2c9f53cec27dafc846889b0457eea8495d20`, neschimbat (verificat de Claude la fiecare publicare).

### 36.2 Numele depozitului

- La push, GitHub afișează „This repository moved”: numele oficial este **`Platforma-interactiva`** (cu P mare); documentele și comenzile folosesc `platforma-interactiva`. Ambele adrese duc la același depozit (aceleași SHA-uri, verificat de Claude).
- Jurnalul de securitate al contului (filtrul `action:repo.rename`): **nicio redenumire** (captură, 02.11.2026); pagina Collaborators: **0 colaboratori** (captură). Concluzia verificărilor efectuate: diferență de majusculă în adresă, fără indicii de redenumire neautorizată. Verificarea GitHub Apps și Deploy keys rămâne deschisă.
- **Neverificate:** „GitHub Apps” și „Deploy keys” ale depozitului (pagina Collaborators arată numai persoanele). Actualizarea numelui în documente: pas separat, neurgent.

### 36.3 Utilizatorul Basic-auth în depozit (continuarea §35.6, punctul 5)

- **Corectat:** manualul 7D (`7ce1126`), cele patru rânduri; manualul nu mai conține utilizatorul.
- **Decizia proprietarului** (04.11.2026, varianta A): **numai manualul** se corectează. Celelalte apariții rămân neatinse, ca evidențe istorice: `docs/faza5/STAGING_URBISACTIV_JURNAL.md` (rândurile 35, 47, 67, 101), `docs/faza5/FAZA_5_1_STAGING_JURNAL.md` (rândul 85), `docs/faza6/FAZA_6_REAUDIT_SECURITATE.md` (109, 111), `PROJECT_HANDOFF_CURRENT.md` (257). Utilizatorul bazei de date de test din CI și din ghidul local este altceva și nu face obiectul constatării.
- **Expunere cunoscută, necorectată:** depozitul este public; numele de utilizator rămâne și în istoricul git (care nu se rescrie). Protecția staging-ului este parola, care nu apare în depozit. Singura măsură care reduce riscul (schimbarea utilizatorului în cPanel) se decide separat, odată cu G6-1 (c).

### 36.4 Succesiunea condiționată a etapelor rămase (adoptată de proprietar la 04.11.2026)

Înlocuiește succesiunea propusă din §34.1 (neadoptată acolo). Recomandată de Claude și de auditor; adoptată de proprietar, cu completările (a) și (b).

| # | Etapa | Condiția |
|---|---|---|
| 1 | pregătirea: gestionarea cheii, generarea și verificarea identității | înaintea oricărei modificări pe găzduire. **Îndeplinită** (§36.5) |
| — | măsura Node „a” | activitate separată, cu rezultatul ei. **Reformulată și îndeplinită** (§36.7) |
| 2 | etapa 3: E4.11 pe staging | **încheiată și confirmată** (§36.6) |
| 3 | decizia despre V3 | dacă V3 e complet pregătită, se face înaintea opririi; altfel staging-ul nu rămâne pornit în așteptarea ei |
| 4 | etapa 6: oprirea staging-ului (G6-1 c); **(a)** decizia despre copiile în clar rămase pe găzduire | după etapa 3 (și V3, dacă a fost gata) |
| 5 | etapa 4: V3, dacă a fost amânată; **(b)** metoda de lansare a restaurării stabilită printr-o propunere separată, **fără sarcină cron temporară** | repornire temporară, apoi oprire |
| 6 | etapa 5: proba E4 în instanța B | numai după rezolvarea blocajelor de producție (§34.8, măsurile Node, instalarea E4, DEC9-4) |

Adoptarea stabilește ordinea de lucru; nu autorizează nicio operație.

### 36.5 Identitatea de staging (04.11.2026)

| Element | Valoarea |
|---|---|
| decizia K-1 | **A:** identitate **separată, numai pentru staging** (date de test), generată cu procedura din planul r3.2, §4.2; identitatea de producție va fi alta |
| decizia K-2 | **A** (schimbată de proprietar de la B, după discuția despre proporționalitate): suporturile **nu** sunt criptate cu BitLocker. **Abatere aprobată față de planul r3.2, §4.2**, limitată la identitatea de staging; pentru identitatea de producție regula din plan rămâne neschimbată |
| generarea | pe calculatorul proprietarului, cu programul oficial `age` **v1.3.2**, direct pe suport, criptată imediat cu fraza-parolă (procedura din planul r3.2, §4.2); cheia privată nu a fost afișată și nu a fost scrisă în clar |
| cheia publică | `age1vxd7kcvylhz7jm8tzwc50msedq0xggz92np289ydcrpkdn25wq9qpr0ggz` (suma de control verificată de Claude) |
| copiile identității | **două copii, pe suporturi separate fizic**; identice (amprentele comparate); **ambele verificate prin decriptare** cu fraza (cheia publică rezultată = cea de mai sus) |
| fraza-parolă | păstrată în **două locuri separate**, un manager de parole și o copie pe hârtie, separat de suporturi (planul r3.2, §4.1) |
| fișa de utilizare | document al proprietarului, în afara repository-ului, fără secrete: elementele și locul lor, verificarea, testul trimestrial, pierderile, reinstalarea programelor, verificarea și decriptarea unei copii (completată după etapa 3) |

**Propunere, neadoptată:** înaintea producției, o revizie de proporționalitate a procedurii de chei (planul r3.2, §4) și a DEC-23, cu decizii explicite despre ce se păstrează și ce se simplifică.

### 36.6 Etapa 3: proba E4.11 pe staging

**Propunerea:** `PROPUNERE_ETAPA3_E411_STAGING.md`, **r2** (SHA-256 `043c2833d61adde411befd729fc26cb4599c9dc9ef7265ac49bad81cdfd9cd98`; în afara repository-ului), revizuită de auditor (r1 → r2: PR-1 cu situația reală a BitLocker, dosarul de lucru nesincronizat, arhiva descărcată, aprobarea în două momente).

**Aprobarea, în două momente (proprietarul, 04.11.2026):**
1. documentul r2; **D-E0 = B** (proba nu așteaptă măsura Node „a”); **D-E1 = A** (repornire imediată); **D-E2 = A** (copia la cerere + copia de noapte); **D-E3 = A** (Node 24 portabil, conform P5); **acceptarea explicită a consecințelor din §7 al propunerii, inclusiv A5** (`85d3c45` nu poate restaura copiile criptate; copiile criptate depind de identitatea de staging; după 7 nopți rămân numai copii criptate);
2. execuția, separat, în aceeași zi.

**Execuția (04.11.2026) și confirmarea (05.11.2026):**

| Pas / criteriu | Rezultatul | Natura dovezii |
|---|---|---|
| E-0 | `health` `0.0.0+2fc8403`, `ok`; `started (v24.22.2)`; cele 4 linii cron neschimbate, **toate cu `CIVIC_ENV_FILE=…/civic-test-data/civic.env`**; `stderr.log` 2,62 KB, 12.10.2026. E-0d (`backup.log`) și E-0f (DEC-16) acceptate pe baza verificărilor din dimineața aceleiași zile (§35.5, P7, P9), fără rulare intermediară | captură; confirmare |
| E-1 | `civic.env` citit: niciun rând `BACKUP_AGE_RECIPIENT` | confirmare (fără captură) |
| E-2 | un rând adăugat la finalul `civic.env`: `BACKUP_AGE_RECIPIENT=<cheia publică de staging>`; niciun alt rând modificat | confirmare |
| E-3 / P-E1 | RESTART; `started (v24.22.2)`; `health` `0.0.0+2fc8403`, `ok` | captură; confirmare |
| E-4 / P-E2 | `stderr.log` neschimbat (2,62 KB, 12.10.2026) | captură |
| E-5 / P-E3 | „Run JS script” → `civic-backup-db`: **`civic-backup-20261104T174116344Z`**, „fotografii: 5; **criptată (age)**”; rotația: șterse `civic-backup-20261028T011702629Z` și `civic-backup-20261028T062014021Z`. în **ieșirea afișată de „Run JS script”** (rubrica stderr a ferestrei; **nu** în fișierul `stderr.log`) a apărut un rând **„npm notice”**, emis de `npm` (prin care cPanel rulează scriptul), nu de aplicație (textul nu există în codul aplicației, verificat de Claude); textul complet nu a fost citit. Fișierul `stderr.log` nu a fost recitit după E-5 | captură |
| E-6 / P-E4 | `binding.json.age`, `db.jsonl.gz.age`, `manifest.json`, `markers.json`, `photos` cu **5 fișiere `.age`**; niciun fișier de date în clar | captură |
| E-7 | arhiva copiei creată în `civic-test-data` (nu în `backups`), descărcată, **ștearsă de pe găzduire** | captură; confirmare |
| L-1 | dosarul de lucru `D:\urbis-proba` (disc intern, nesincronizat, ales de proprietar); Node portabil **v24.22.2** (aceeași versiune ca găzduirea); aplicația extrasă din `civic-2fc8403.zip` | captură |
| L-2 | amprenta arhivei: `2e2f2e13923d61a4c15f6d453f906e873280f0154ff4d95be2fd52776d5b67ff` | confirmare |
| L-3 | 9 fișiere; fotografiile la `photos/photos/<cheie>.webp.age` (structura proiectată: cheia de stocare începe cu `photos/`, `backup.ts` r. 413; acceptată de `backupCrypto.ts` r. 60) | captură; citirea codului (Claude) |
| L-4 / P-E5 | `backup:verify`: „sesizări 11; fotografii în manifest: 5”; „fișiere criptate decriptate integral: 6 (din care fotografii: 5)”; „copia este întreagă și consecventă”; **cod 0** | captură |
| L-5 / P-E6 | `backup:decrypt`: `civic-restore-20261104T175918043Z` cu `DECRYPTED-COPY.json`, `db.jsonl.gz`, `manifest.json`, `markers.json` și 5 fotografii; **cod 0** | captură |
| L-6 / P-E6 | frază greșită: „Fraza-parolă este greșită sau fișierul de identitate este deteriorat.”; **cod 1** | captură |
| L-7 | copia decriptată și copia dezarhivată șterse imediat; după P-E8, dosarul de lucru șters integral. Pe suporturile identității **nu s-a scris nimic** (identitatea a fost numai citită; toate fișierele de lucru au stat în dosarul de lucru); **identitatea de staging se păstrează**. Golirea clipboard-ului și returnarea suportului la locul lui: cerute la L-7, **neconfirmate explicit în scris** | captură; confirmare |
| **P-E7** | copia de noapte **`civic-backup-20261105T011702381Z`** (03:17): „fotografii: 5; **criptată (age)**”; structura: numai `.age` + metadate. **Dovada directă că sarcina cron preia cheia din `civic.env`** (precondiția PR-2) | captură |
| **P-E8** | `purge.log` modificat la 05.11.2026, la ora programată (03:47), fără erori; DEC-16 a zilei: `health` `ok`, coada identică cu referința (1 / 1 / 7, `sent`; 0 `failed`, `sending`, `queued`) | captură |

**Etapa 3 este încheiată (04.11.2026) și confirmată (05.11.2026).** `backup.log` arată trecerea în trei nopți: `20261103T0117…` (versiunea veche, fără mențiune), `20261104T0117…` („NECRIPTATĂ: BACKUP_AGE_RECIPIENT lipsește …”), `20261105T0117…` („criptată (age)”).

**Efecte asupra punctelor deschise:**
- §34.5, **3a** (criptarea fotografiilor neprobată pe artefact): **probată pe găzduire** (P-E4, P-E5, P-E6);
- §34.5, **3b** (motivul eșecului la controlul negativ neafișat): pe găzduire, motivul este afișat (L-6);
- §34.5, **3.3** (verificarea refăcută a analizei statice): neschimbat, deschis;
- **copiile în clar** de pe staging (29.10–04.11.2026) dispar prin rotație; ultima (`civic-backup-20261104T011702418Z`) în noaptea de 10/11.11.2026. Completarea (a) din §36.4 se decide la oprirea staging-ului;
- criteriul E4.11 din planul v2.4 **rămâne nebifat** (dovezile cerute privesc producția).

### 36.7 CI aliniat la găzduire: măsura „a” reformulată

- **Corectura propunerii din §35.3 (măsura a):** trecerea jobului de producție pe „ultimul Node 24” ar fi dublat joburile existente „Node 24” (care folosesc deja versiunea curentă a runner-ului; în rularea #178: 24.22.1 / 24.22.2) și ar fi eliminat rostul jobului DEC-8 (c1), fixat pe versiunile **exacte** de producție. Problema reală: versiunea fixată rămăsese în urmă față de găzduire.
- **Verificarea găzduirii (04.11.2026):** Node **24.22.2** (V2, E-0b); MariaDB **11.4.13** (`11.4.13-MariaDB-cll-lve`, phpMyAdmin; captură), neschimbat față de 07.10.2026.
- **Decizia proprietarului** (04.11.2026, varianta A): DEC-8 (c1) **păstrată**; versiunea Node fixată actualizată la **24.22.2** (`1524891`; diff revizuit de auditor). În CI #179, jobul de producție rulează pe `v24.22.2` și `11.4.13` și își trece verificarea explicită a versiunilor (citit de Claude din jurnalul rulării). **Abaterea V2 (§35.3) este rezolvată în CI**: codul `2fc8403` este testat pe versiunea Node a staging-ului.
- La o actualizare viitoare a furnizorului, fixarea se actualizează prin același tip de commit, după constatarea la V2. Măsurile **b, c, d** din §35.3 rămân **propuse, neadoptate**.

### 36.8 Ce NU înseamnă această consemnare

Nu autorizează repetiția V3, oprirea staging-ului, ștergerea copiilor în clar, schimbarea utilizatorului Basic-auth sau vreo operație pe staging, producție, cPanel, cron ori `civic.env`; nu generează și nu stabilește identitatea de producție; nu adoptă revizia de proporționalitate din §36.5 și nici măsurile b–d din §35.3; nu ridică blocajul pentru producție din §34.8 (licența `age-encryption`); nu bifează criteriul E4.11 din planul v2.4; nu activează G6-1 (c); nu decide DEC-3b, DEC9-4, DEC-20 pentru datele E7 sau propunerea din §25.3; nu modifică planul v2.4, planul r3.2 sau DEC-23. Riscul de memorie al `backup:db` (§31.6) rămâne deschis. Lansarea publică nu este aprobată.

## 37. Oprirea staging-ului (G6-1 c): încheiată la 06.11.2026; V3: metoda, codul și procedura aprobate; evidența DEC-16 creată; publicări și constatări (05–06.11.2026)

### 37.1 Publicări în depozit și CI

| Commit | Conținut | Diff aprobat (SHA-256) | CI |
|---|---|---|---|
| `36d830371337ec7dea00b30589ceefb196687b27` | jurnalul staging-ului: intervențiile 149–157, observația 23 (textul liniilor cron, inventarul copiilor), pasul O-1 | `e7aa0078ab421a3d781605d0ad0cb0acde5cfd683be41555aad7410944ce0d7a` | 41991060324: verde, 7/7 |
| `71cd90a50a962e4b45e677e5b76dfe71a44c5ee2` | V3: comenzile `restore-target:*`, protecțiile, scripturile din pachet, testele, CI cu baza țintă, `FAZA_5_1` §6.6, manualul 7D | `4ec96d827c61e61528766b4e7615446c434b2b6e0229e217a1a828a61ab44b78` | 42006083313: **roșu** numai la pasul „Artefactul” (vezi §37.7, punctul 2); testele unitare, API și de integrare verzi în toate joburile, inclusiv MariaDB 11.4.13 |
| `a31977b50980c7ef24b7b0569d76a47f25d95dc3` | corectura verificării V3 din pasul „Artefactul” (`ci.yml`) | `4e06fd012aecd5b8e755aa1f837ac387281ae226b5b2a2f68f8610e3b13066ae` | 42008296744: verde, 7/7, inclusiv jobul fixat pe Node 24.22.2 + MariaDB 11.4.13 |

Aprobările proprietarului au fost date separat pentru aplicare, commit și push, cu limitele din fiecare cerere (o singură bază, fișierele din diff, fără force push, fără operații pe staging). Commiturile poartă identitatea „Claude”, fără linii de atribuire.

### 37.2 Propunerea de oprire: deciziile proprietarului (05.11.2026)

Propunerea a trecut prin revizii r1–r6 (auditorul: ordinea cron / oprire, inventarul și criteriul de ștergere, coada, cererile GET, consecința restaurării, verificarea tuturor celor 4 sarcini, succesiunea pe două zile, terminarea rulărilor zilnice, formularea confirmării indirecte, limita copiei finale).

**Aprobarea proprietarului**, 05.11.2026 ~08:47, formulată de el: „Aprob documentul r6. D-O1=A, D-O2=A, D-O3=A, D-O4=A. Accept explicit consecința din §2.” Documentul r6: SHA-256 `5bf0f0b5c6f88d8c5ad839a42389766aed787499415eb93dd499cbf47ec1fbe7` (în afara depozitului).

| Decizia | Alegerea |
|---|---|
| D-O1 | staging-ul se oprește acum; V3 se pregătește separat, cu repornire temporară |
| D-O2 | copiile în clar se șterg manual, după criteriul din r6 §3. **Consecința acceptată explicit:** până la V3 nu există pe găzduire o restaurare demonstrată cu codul actual; ștergerea elimină singurele copii de pe găzduire care nu cer decriptare și care provin din versiuni mai vechi, iar nici pentru acestea restaurarea efectivă cu codul actual nu era demonstrată |
| D-O3 | copia finală criptată în ziua 2, imediat înaintea STOP APP; ea surprinde starea de la executarea ei, nu un instantaneu exact al STOP APP |
| D-O4 | dacă cPanel nu arată procesele, terminarea `purge:retention` se confirmă **indirect**, cu limita declarată |

O recomandare a auditorului (Aristotel) sau a lui Claude nu este o decizie a proprietarului; textele auditorului transmise în conversație nu au fost tratate ca aprobări (o confirmare a fost cerută explicit la O-1, 05.11.2026 ~09:58).

### 37.3 Execuția (proprietarul, pas cu pas; jurnalul staging-ului, intervențiile 150–166)

| Pas | Data / ora | Rezultatul |
|---|---|---|
| O-0 | 05.11, ~08:48–09:54 | conform: `health`, aplicația, textul cron, duratele (sub un minut, la rezoluția cPanel), coada (0 / 0 / 0), inventarul (10 copii: 2 criptate, 8 în clar); cPanel fără vedere a proceselor |
| O-1 | 05.11 | jurnalul publicat (`36d8303`), CI verde |
| O-3 | 05.11, 10:20:45–10:23:18 | cele 4 linii șterse în ordinea din r6; „No Cron Jobs” |
| O-3b | 05.11, ~10:32 | sarcinile frecvente oprite (ultimele rulări 10:20); reperul consemnat |
| O-3c | 06.11, ~08:02–08:03 | nicio rulare la 03:17 / 03:47, niciun `.tmp-`; D-O4 = A aplicată |
| O-3d | 06.11, ~08:04–08:06 | conform; DEC-16 a zilei conformă |
| O-2 | 06.11, ~08:08 | `civic-backup-20261106T060825012Z`, criptată; rotația a șters 2 copii în clar |
| O-4 | 06.11, ~08:09 | `stopped` |
| O-5 | 06.11, ~08:13–08:23 | 6 copii în clar verificate și șterse fără coș; 0 excluse; rămân 3 copii criptate și marcajele |
| O-6 | 06.11, ~08:25–08:34 | aplicația nu răspunde; evaluarea §33.3 la §37.4 |
| O-7 | 06.11, ~08:38 | rândul R2 în evidența DEC-16 (§37.5) |

**Oprirea este încheiată (06.11.2026).** Confirmarea (P-O8) urmează la prima verificare săptămânală R2, **13.11.2026**: starea `stopped`, „No Cron Jobs”, `backup.log` fără intrări noi.

**Copiile în clar de pe găzduire nu mai există** (completarea (a) din §36.4 este rezolvată prin D-O2 = A). Pe găzduire rămân numai copiile criptate `civic-backup-20261104T174116344Z`, `…20261105T011702381Z`, `…20261106T060825012Z`, care pot fi decriptate numai cu identitatea de staging (§36.5).

### 37.4 Evaluarea din §33.3 (O-6)

- docroot-ul subdomeniului nu conține fișiere ale aplicației (`.well-known/`, `cgi-bin/`, `.htaccess`, `.htaccess.bak-20261008`, `.user.ini`, `php.ini`);
- **fără parolă:** HEAD și GET pe `/` și pe `/api/v1/health` → `401`, `text/html` (3959 B): Basic-auth rămâne activ cu aplicația oprită;
- **cu parolă:** aceleași cereri → `404`, `text/html` (3843 B), pagina serverului; **aplicația nu răspunde**;
- la STOP APP, cPanel rescrie `.htaccess` din docroot (data 8:09 AM, același minut); conținutul nu a fost deschis. La următoarea repornire trebuie verificat dacă cPanel rescrie din nou `.htaccess`; comportamentul la pornire nu a fost încă verificat;
- constatare separată: cPanel trecut de la 138.0.19 la 138.0.21 în noaptea 05/06.11.2026, fără anunț (ca la Node, §35).

Consecința pentru R2 (§33): verificarea săptămânală (1) se face prin citirea stării în Setup Node.js App, cum s-a decis la 02.11.2026; cererile HTTP rămân în afara verificării săptămânale (nu sunt necesare, iar §29.2 cere confirmarea furnizorului pentru ele).

### 37.5 Evidența DEC-16 (D16-a): lipsa constatată și creată la 06.11.2026

- **Constatare:** fișierul Excel decis la 31.10.2026 (D16-a, §26; manualul 7D §6.3) **nu fusese creat**. Între 31.10 și 06.11.2026, verificările DEC-16 sunt consemnate numai în jurnalul staging-ului și în acest registru. Claude nu a verificat existența fișierului înaintea propunerii O-7; lipsa a fost semnalată de proprietar.
- **Decizia proprietarului** (06.11.2026, varianta A): fișierul se creează acum (pregătit de Claude, păstrat de proprietar pe calculator, în afara depozitului), cu: o notă de creare care consemnează lipsa, **fără reconstituirea verificărilor anterioare** (D16-b); DEC-16 din 06.11.2026 08:06 (conformă, făcută și consemnată în aceeași zi); rândul R2 de oprire (intervenția 163; textul cron păstrat; ultima DEC-16 completă: 06.11.2026 08:06); foaia „Legenda” cu regulile și regimul R2.

### 37.6 V3: metoda, codul și procedura (05.11.2026)

- **Propunerea „metoda de lansare a restaurării pe găzduire, fără sarcină cron temporară”**, r1–r4 (auditorul: izolarea configurației, identitatea bazei, căile reale, expunerea web, R19, a doua rulare `--confirm`, marcajul de ștergere, verificările individuale). **Aprobată de proprietar** (05.11.2026 ~10:50): r4, SHA-256 `7a4fc0380ad7486771f8341f01f9c9629b0b2a618d8ecde15bfcb3d96e15c3fd`; **D-V3-1 = A** (comenzile din „Run JS script”, ținta din `restore-target.env` lângă fișierul de setări activ); **D-V3-2 = A** (singura copie `civic-restore-*` din `BACKUP_DIR`); **D-V3-3 = A** (fără repunerea liniilor cron în ziua V3; abatere de la regula R2 de repornire, limitată la acea zi); **D-V3-4 = A** (`host-restore:recover --check` exclus); **D-V3-5 = A** (R19 prin fluxul registraturii oprit și mesajul `on_hold`). Aprobarea privește numai metoda.
- **Codul și testele:** `71cd90a` + `a31977b` (§37.1). Testat local de Claude pe MySQL 8.0 (442 de teste de integrare) și în CI pe toate cele 7 joburi.
- **Procedura detaliată a zilei V3**, r1–r5 (auditorul: dovada completă a V3-6 prin `CHECKSUM TABLE … EXTENDED` și amprente SHA-256, recuperarea pe faze, revenirea curată la `2fc8403`, instalarea prin înlocuire curată, structura directoarelor, `-Force`). **Aprobată de proprietar** (05.11.2026 ~12:51): r5, SHA-256 `463aa216ae71bb1c65d4ef0f43ca4c89e5234d4c70f1eaf8b3f2b5ffaa164696` (în afara depozitului). Aprobarea privește numai documentul.
- **Rămân, fiecare cu aprobarea lui:** construirea pachetului din `a31977b` (cu amprenta și lista exactă a celor 22 de intrări); execuția zilei V3 (după încheierea opririi; condițiile de pornire din procedură).

### 37.7 Constatări și corecturi

1. **Premisa greșită din propunerea V3 r1 (Claude):** lipsa liniei `outbox:process` nu ține un mesaj în coadă; aplicația îl procesează imediat (`kickOutbox`, `outbox.ts` 343–356). Semnalată de auditor (O5), corectată în r2 prin D-V3-5.
2. **Eroarea din CI (Claude):** verificarea V3 adăugată în pasul „Artefactul” punea directorul țintă în interiorul directorului cu fișierul de setări, iar protecția nouă (adăugată la cererea auditorului în diff-ul r2) l-a refuzat corect. Simularea locală a pasului nu fusese refăcută după r2. Corectată în `a31977b`.
3. **Inexactitatea din propunerea V3 r4, §6 (Claude):** plasa de 24 de ore pentru copiile decriptate rulează și la pornirea aplicației (`main.ts` 67–88), nu numai la `backup:db`. Corectată în procedura r1.
4. **Evidența DEC-16:** §37.5.
5. **Observații ale auditorului neconfirmate de fapte:** (a) la O-1, formularea „aprobată de proprietar” a fost contestată ca neexprimată; aprobarea exista (05.11.2026 ~08:47), iar auditorul și-a retras observația; (b) la propunerea V3 r2, ordinea „copie, apoi ștergerea lui A” a fost considerată contradictorie; ordinea este intenționată (marcajul durabil de ștergere, demonstrat la M4), iar r3 a explicat mecanismul.
6. **Comparația pachetelor (Claude, local, numai pentru verificare):** pachetele construite din `2fc8403` și `a31977b` au aceeași listă de 22 de intrări; diferă `server/dist/app.js`, `package.json`, `RELEASE.txt`. Pachetele nu au fost transmise.

### 37.8 Efecte asupra punctelor deschise

- **G6-1 (c):** oprirea făcută; confirmarea la 13.11.2026 (P-O8).
- **§36.4, completarea (a):** rezolvată (copiile în clar șterse).
- **§36.4, completarea (b) — V3:** metoda și procedura aprobate; urmează pachetul și execuția.
- **Utilizatorul Basic-auth** (§36.3): neschimbat; decizie separată, deschisă.
- **Licența** (§34): blochează în continuare producția.
- **Măsurile Node b–d** (§35.3), **revizia de proporționalitate a cheilor**, **3.3**, **DEC-3b**, **DEC9-4**, **DEC-20 E7**: neschimbate, deschise.

### 37.9 Ce NU înseamnă această consemnare

Nu autorizează construirea sau instalarea unui pachet, repornirea staging-ului, ziua V3, repunerea liniilor cron, crearea `restore-target.env`, schimbarea utilizatorului Basic-auth sau vreo operație pe staging, producție, cPanel ori `civic.env`. Lansarea publică nu este aprobată.

## 38. Corectura notelor de licență (blocajul §34.8): implementată; pachetul V3 corectat; procedura V3 r6 aprobată (06–07.11.2026)

### 38.1 Publicări în depozit și CI

| Commit | Conținut | Diff aprobat (SHA-256) | CI |
|---|---|---|---|
| `639a463901e7460b47494cc40d3a29d184804e85` | generatorul `scripts/third-party-licenses.mjs`; `THIRD_PARTY_LICENSES.txt` pentru server (`server/build.mjs`) și frontend (`vite.config.ts`); `licenses/extra/` (2 texte); teste; CI | `6282d01e035a7f7874ecfbe717dce6126ede77ca393ca42cd208d81fe63f69b6` | 42282386250: verde, 7/7 |
| `4198e8d3983a0095a50ecea901876d7c89db7529` | CI: textele din `licenses/extra` verificate în artefact (amprenta sursei = amprenta din fișierul generat) | `2911651acdf733269b27f0fafffa84e420b4286cbd3b978d67feadf03234c233` | 42347429571: verde, 7/7 |

Aplicare, commit și push aprobate de proprietar pentru fiecare, cu limitele obișnuite.

### 38.2 Propunerea și deciziile proprietarului

**Inventarul** (Claude, 06.11.2026, din graful real al construcției): serverul include **90** de pachete terțe (MIT 77, ISC 4, BSD-3-Clause 5, Apache-2.0 2, BlueOak-1.0.0 1, MIT-0 1); vechiul `app.js.LEGAL.txt` acoperea numai 18 dintre ele. Frontendul include **9** pachete (`react`, `react-dom`, `scheduler`, `leaflet` BSD-2-Clause, `lucide-react` ISC, `qrcode`, `dijkstrajs`, `altcha-lib`, `zod`) și **nu avea nicio notă de licență**. Problema era deci mai largă decât nota `age-encryption` (§31.6, §34.9).

**Propunerea** „corectura notelor de licență”, r1–r2 (auditorul: identificarea pe nume și versiune, respingerea licențelor ambigue, `NOTICE`, surse oficiale legate de versiune), r2: SHA-256 `9aea1c4269d73513075dcff9b7a4d162fb854d7367a9ccd0e3fe3912f686a84b` (în afara depozitului).

**Deciziile proprietarului** (06.11.2026, ~21:28): **D-L1 = A** (server și frontend); **D-L2 = A** (corectura înaintea V3; V3 pe pachetul corectat); **D-L3 = B**, condiționat: textul MIT al `abstract-logging` se preia de pe pagina indicată de autor în `Readme.md`, după verificarea în browser, cu sursa, data, autorul și declarația MIT a versiunii 2.0.1 consemnate, fără a pretinde că pagina este legată de versiune; fără excepție permanentă în CI; textele tuturor pachetelor păstrate integral, cu atribuirea. (Mesajul nu purta eticheta „Aristotel” și a fost tratat ca decizia proprietarului, care a executat apoi el însuși preluarea textului.)

**Sursele textelor din `licenses/extra`:**
- `drizzle-orm@0.45.3`: `LICENSE` de la eticheta oficială `0.45.3` (commit `15454dbe49d827c6081f3d0231e2e7985e517295`), preluat ca atare (SHA-256 `c71d239d…0ab4`); niciun `NOTICE` la acea etichetă;
- `abstract-logging@2.0.1`: nici pachetul, nici depozitul la eticheta `v2.0.1` (commit `80dfaef9…d406`) nu conțin un fișier de licență; textul a fost **preluat de proprietar** la 06.11.2026, 21:30, din pagina indicată de autor (captură), și transcris exact de Claude (SHA-256 `d087f22d…2177`). **Limita consemnată:** pagina este dinamică (afișează anul curent, 2026) și nu este legată de versiune.

**Excepție de la regula „în depozit niciodată adrese de e-mail” (decizia proprietarului, 06.11.2026, ~21:31, varianta A):** regula privește datele persoanelor din proiect; **notele de copyright publicate de autori terți în textele lor de licență** se păstrează **neschimbate**, inclusiv adresa autorului, fiindcă licența cere includerea lor ca atare. Excepția se limitează strict la textele de licență ale terților din `licenses/extra/` și la fișierele generate `THIRD_PARTY_LICENSES.txt`.

### 38.3 Ce garantează implementarea

- `THIRD_PARTY_LICENSES.txt` pentru server (90 de pachete) și frontend (9), generate la fiecare construcție din modulele efectiv incluse, cu textul **integral și neschimbat** al fișierelor `LICENSE*` / `LICENCE*` / `COPYING*` / `NOTICE*` ale fiecărui pachet, identificat pe **nume și versiune**; ieșire deterministă;
- construcția **eșuează** la un pachet fără text de licență sau cu o licență declarată lipsă, ambiguă, nesuportată ori în afara listei acceptate (MIT, MIT-0, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0, BlueOak-1.0.0); o licență nouă cere decizie;
- CI: numărul de pachete = numărul secțiunilor; **lista exactă** a celor 9 pachete din frontend; prezența `age-encryption`, `abstract-logging`, `drizzle-orm`; amprentele celor două texte din `licenses/extra` **egale în sursă, în teste și în artefact**.

**Ce NU garantează:** nu este o evaluare juridică a conformității. **Blocajul pentru producție din §34.8 rămâne activ** până la o decizie separată a proprietarului (§34.9: probele de repetat pe artefactul corectat).

### 38.4 Pachetul V3 corectat

- **`civic-4198e8d.zip`**, construit de Claude la 07.11.2026 (aprobat de proprietar) dintr-o copie curată a commitului `4198e8d`: SHA-256 `8d89f83ae329d28d4ca59e1f5429df0297d5f035f779494227840decaee67ac7`, **1.506.842 B**, **24 de intrări** (numai fișiere), fiecare cu dimensiunea și SHA-256 în `INVENTAR_civic-4198e8d.txt` (la proprietar, care a verificat arhiva, inventarul și integritatea ZIP). `RELEASE.txt`: `commit: 4198e8d`, fără modificări necomise.
- Față de `civic-a31977b.zip`: +2 intrări (`dist/THIRD_PARTY_LICENSES.txt`, `server/dist/THIRD_PARTY_LICENSES.txt`); diferă `RELEASE.txt`, `package.json` (`"version"`) și `server/dist/app.js` (versiunea inclusă); celelalte 19 intrări identice.
- Avertismentele construcției (ambele anterioare corecturii, frontend): `__dirname` în `vite.config.ts` 34, nesuportat de un mod viitor de încărcare a configurației Vite; un fișier JS peste 500 kB după minificare (924 kB). Mesajul scriptului de împachetare („22 fișiere”) numără numai fișierele copiate din dosare, nu și `package.json` și `RELEASE.txt`; arhiva are 24 de intrări.
- **`civic-a31977b.zip`** (construit la 06.11.2026, SHA-256 `7fb32ccddc211e93184bab06c2a05248244e5af09a0e65a1cf208ae1083091f4`) este **exclus din flux** (D-L2 = A); nu a fost instalat nicăieri.

### 38.5 Procedura V3 r6

Revizuită de auditor (r6, apoi r6 revizuită: recuperarea la C-1 începe cu verificarea arhivei; ordinea C-9 aliniată la §4.1; stadiul aprobărilor) și **aprobată de proprietar ca document** (07.11.2026, ~08:54): SHA-256 `da4237c81364d5a4ec6c121fb7b742c51b4b21951a9f91cfad729e150034f88d` (în afara depozitului). Pachetul V3: `civic-4198e8d.zip`; `civic-2fc8403.zip` numai variantă de revenire. **Execuția nu este autorizată**; rămâne condiționată de verificarea săptămânală R2 din 13.11.2026 și de o autorizare separată.

### 38.6 Constatări și corecturi (Claude)

1. În diff-ul r1 al corecturii, generatorul tăia spațiile de la sfârșitul textelor de licență (contrar principiului aprobat), iar titlul transcris al textului `abstract-logging` nu reproducea majusculele din captură. Semnalate de auditor; corectate în r2, cu teste (textul integral regăsit în ieșire; amprenta transcrierii).
2. La verificarea pachetului corectat: toate cele 88 de fișiere de licență și `NOTICE` din pachetele serverului apar caracter cu caracter în fișierul generat.

### 38.7 Următorii pași (fiecare cu aprobarea lui)

- **13.11.2026:** verificarea săptămânală R2 (P-O8), numai prin citire; un memento a fost programat în conversație, la cererea proprietarului;
- **propunerea pentru §34.9:** ce probe se repetă pe artefactul corectat înaintea ridicării blocajului din §34.8;
- **ziua V3**, după 13.11.2026, cu autorizare separată;
- deschise, neschimbate: utilizatorul Basic-auth (§36.3), măsurile Node b–d, revizia de proporționalitate a cheilor, 3.3, DEC-3b, DEC9-4, DEC-20 E7.

### 38.8 Ce NU înseamnă această consemnare

Nu ridică blocajul din §34.8; nu autorizează instalarea vreunui pachet, repornirea staging-ului, ziua V3 sau vreo operație pe staging, producție, cPanel ori `civic.env`. Lansarea publică nu este aprobată.

---

## 39. §34.9 — probele pe artefactul corectat `civic-4198e8d`: deciziile D-349-1…D-349-4; D-349-1 și D-349-2 executate și conforme; blocajul §34.8 rămâne activ (07.11.2026)

**Sursa:** propunerea „§34.9: probele de repetat pe artefactul corectat” (`PROPUNERE_34.9_PROBE_ARTEFACT_CORECTAT.md`, nepăstrată în repository; numerotarea D-349-1…D-349-4 și a probelor 1–7 îi aparține), r1–r4, și rapoartele de mai jos. Natura dovezilor: **executat de Claude**, în spațiul lui de lucru, cu scripturile și jurnalele transmise proprietarului (amprentele mai jos); **verificat de auditor** pe aceleași fișiere.

### 39.1 Propunerea și deciziile

- Propunerea r1–r4, revizuită de auditor. Prin revizii s-au adăugat: protocolul complet al comparației arhivelor, cu raport redactat; criteriile verificabile pentru 4e (refuz corect, nu eroare accidentală), pentru fotografii (corespondența originale ↔ recuperate) și pentru proba 7 (fără modificări persistente în zona monitorizată); izolarea bazei locale, cu valorile secrete redactate în jurnal; retragerea oricărei afirmații despre rețea; consemnarea criteriilor de cron ca **neefectuate** pe `4198e8d`. **r4** (SHA-256 `d62c14653d6978abeef39c9df2aab7850969a7bfe38b3a3076ad75faa98c3381`) a fost aprobată tehnic de auditor.
- **Deciziile proprietarului** (07.11.2026, ~09:39: recomandările lui Claude și ale auditorului, adoptate de proprietar, care a cerut să se procedeze conform acestora): r4 aprobată ca document de referință pentru §34.9; **D-349-1 = A** (comparația arhivelor reale); **D-349-2 = A** (probele locale 1–7, cu criteriile din r4); **D-349-3 = A′, condiționat**: ziua V3 servește ca instalare pe staging a `4198e8d`, plus verificarea P4 printr-o revizie r7 a procedurii V3, numai dacă r7 este revizuită și aprobată înaintea zilei V3; altfel **A** (P4 consemnat ca neprobat pe artefactul nou); **D-349-4 = A**.
- **D-349-4 = A:** blocajul din §34.8 se ridică **numai printr-o decizie scrisă separată a proprietarului**, după: D-349-1 și D-349-2 conforme; ziua V3 încheiată conform pentru criteriile acoperite (cele neacoperite consemnate ca deschise); CI verde pe `4198e8d` (rularea 42347429571, îndeplinit); revizia auditorului. Blocajul **nu** se ridică automat după CI, după probele locale sau după ziua V3. Ridicarea privește numai artefactul cu SHA-256 `8d89f83a…7ac7` și **nu aprobă producția sau lansarea publică**.
- Aprobările de execuție au fost date separat: **D-349-1** (07.11.2026, ~09:42), **D-349-2** (07.11.2026, ~09:48).

### 39.2 D-349-1 — comparația arhivelor: conformă

Pe calculatorul proprietarului (`Get-FileHash`, captură), `civic-2fc8403.zip` = `2445980914a93a2feae6a9093ef4115558ddb988da9be9e0e4517c79ca7a6738`, aceeași amprentă ca la §35.2 (V6). Arhiva a fost apoi transmisă lui Claude, care a reverificat amprenta.

| Pasul | Rezultatul |
|---|---|
| amprentele, înainte de extragere | ambele conforme (`2445…6738`, `8d89…7ac7`) |
| siguranța intrărilor | nicio cale absolută, `..`, legătură simbolică sau intrare de director |
| clasificarea | **19 identice**, **3 diferite** (`RELEASE.txt`, `package.json`, `server/dist/app.js`), **0 lipsă**, **2 suplimentare** (cele două `THIRD_PARTY_LICENSES.txt`), exact rezultatul stabilit înaintea comparației |
| diferențele | `RELEASE.txt`: commitul; `package.json`: versiunea și cele 4 scripturi V3; nicio adresă de e-mail în niciuna dintre arhive. Frontendul (`dist/assets`, `index.html`), migrațiile, seed-urile și `server/data` sunt identice byte cu byte |
| `app.js` (completarea r2) | analiza sintactică (`acorn`, Node 24.22.2, lista reală `builtinModules`): în ambele artefacte, 41 de apeluri reale `require(<literal>)`, toate module Node încorporate; **0 pachete externe**; 0 către `age-encryption`, `@noble`, `@scure`; listele identice. Două cazuri dinamice, examinate prin citirea codului: `require` opțional al `cardinal` (`mysql2`, în `try … catch`, cu rezervă) și `createRequire` din `pino` (folosit numai cu un `transport` de jurnalizare, absent din configurația aplicației) |

**Corectura raportului:** prima clasificare a modulelor din `app.js` (expresie regulată, listă manuală de module încorporate) era incorectă: număra și textele din șiruri. Semnalată de auditor, a fost **retrasă** și înlocuită de completarea r2. Raportul și scriptul inițial au fost păstrate neschimbate. **Limitele:** analiza statică nu exclude orice mecanism de încărcare dinamică; egalitatea listelor nu dovedește că V3 nu a introdus alte probleme. **Verdictul auditorului:** conform, închis tehnic.

Fișierele (la proprietar): `RAPORT_D-349-1.txt` `b95596ede6ce633bed44ad494d6f586ee1088c56d010acb17315d3d62ab3472c`; `compara.py` `763d3226112ed915467b0d2859baa79b2a76fc2c842b910a75f7eea62b3a880e`; `ADDENDUM_D-349-1_r2.md` `97561283e449fa365207805e444ccd8ca0d7d46d5a43bfca242b549ae0a47d64`; `module_appjs.mjs` `12a4996031fe665c040875f789e4f725c07cbbddb9c4090f03ae25c9d6b271f1`; `RAPORT_D-349-1_modulele_appjs.txt` `a4c0a307a911954a3f6731c7c7a004edeeb248440d5150c8f1f7b3b132a57828`.

### 39.3 D-349-2 — probele fără `node_modules` pe `civic-4198e8d.zip`: conforme

**Mediul:** Node **v24.22.2** (binar izolat); MySQL **8.0.46**, numai pe `127.0.0.1`; aplicația rulată cu mediu gol (fără `NODE_PATH`); niciun `node_modules` în aplicație, în strămoșii ei sau în dosarele globale; setările probei numai cu valori de test, generate local și afișate în jurnal cu parola și cheile redactate; nicio credențială a găzduirii în spațiul de lucru (celelalte fișiere `civic.env` găsite sunt resturi ale testelor locale, cu baze locale). Cheile de test, fraza-parolă, copia decriptată, setările, baza și utilizatorii de test au fost șterse la final.

Rezultatele rulării valabile (rularea 3): **15 verificări, 15 conforme**.

| Proba | Rezultatul |
|---|---|
| 1. analiza statică | `app.js` `7c416410…4a10`: 0 pachete externe; 0 către `age-encryption` / `@noble` / `@scure`; aceeași listă ca la `2fc8403`. **Jurnalul este păstrat** (pentru `4198e8d`, limita din precizarea 3.3 nu se mai aplică) |
| 2. pornirea și `health` | portul liber înainte; procesul probei (verificat după PID) a răspuns `{"status":"ok","version":"0.0.0+4198e8d"}`; 0 mesaje E4.11; stderr fără erori |
| 3. `backup:db` fără cheie | cod 0, „NECRIPTATĂ”; 0 fișiere `.age`; manifest fără `encryption` |
| 4a. cu cheie | cod 0, „criptată (age)”; numai `binding.json.age`, `db.jsonl.gz.age`, `manifest.json`, `markers.json` și fotografiile `.age`; 0 fișiere de date în clar; `age-x25519` |
| 4b. `restore:db --check` | pe o țintă goală (bază nouă migrată, `STORAGE_DIR` gol): cod 1, restaurarea refuzată cu **un singur motiv**: „copie criptată” |
| 4c. `backup:verify` | cod 0; 3 fișiere criptate decriptate integral (din care 2 fotografii) |
| 4d. `backup:decrypt` | cod 0; `civic-restore-…` cu `DECRYPTED-COPY.json` |
| 4e. fraza greșită | cod 1; **exact** „Fraza-parolă este greșită sau fișierul de identitate este deteriorat.”, nicio altă eroare; același fișier de identitate (amprentă neschimbată), acceptat cu fraza corectă la 4c / 4d. Pentru `4198e8d`, limita 3b (motivul eșecului) nu se mai aplică |
| 5. `APP_ENV=production` fără cheie | cod 1; motivul: `BACKUP_AGE_RECIPIENT` obligatorie în producție |
| 6. fotografiile (precizarea 3a) | două imagini de test generate, atașate direct în baza de test; în copia criptată numai `.age`, 0 în clar; amprentele fișierelor `.age` = cele din `binding` (decriptat independent, cu o unealtă din afara artefactului); fotografiile recuperate identice (SHA-256, dimensiune) cu originalele și cu `report_photos.sha256`. **Criptarea fotografiilor este probată local pe artefact**; pe găzduire, la ziua V3 (C-3) |
| 7. `restore-target:status` fără `restore-target.env` | cod 1, „REFUZ, nimic scris…”; starea bazei (32 de tabele, `CHECKSUM TABLE … EXTENDED`, rânduri) și inventarul celor 29 de fișiere monitorizate, identice înainte / după |

**Rulările 1 și 2 (consemnate integral):** rularea 1 a avut 3 rezultate neconforme, din **erori ale scriptului** (căile fotografiilor: cheia de stocare conține deja `photos/`, deci în copie calea este `photos/photos/<…>.age`; citirea manifestului; clasificarea fișierelor `civic.env` străine). Rularea 2 a raportat 15 / 15, dar **proba 2 a fost un fals pozitiv**: serverul pornit în rularea 1 rămăsese activ, cel nou a eșuat cu `EADDRINUSE`, iar `health` a răspuns serverul vechi; verificarea nu controla portul, PID-ul și erorile. Ambele au fost corectate în scriptul rulării 3. Serverul rămas asculta numai local, cu date de test.

**Constatare (fără impact asupra rezultatului):** la `restore:db --check` pe o copie criptată, raportul afișează „manifestul nu a putut fi citit”, deși `manifest.json` există, în clar, fiindcă verificarea se oprește la refuz înaintea citirii manifestului (`server/src/db/backup.ts`, r. 680–694, 1016). Refuzul este corect; formularea poate induce în eroare. Se tratează separat, numai cu aprobarea proprietarului.

**Limitele (neschimbate):** rezultat local (MySQL 8.0, Linux, fără Passenger / cPanel): **nu este o validare pe MariaDB, Passenger sau CloudLinux**; fotografiile au intrat direct în baza de test, nu prin încărcarea din aplicație; proba 7 acoperă numai baza și directoarele monitorizate; izolarea se întemeiază pe configurație și pe lipsa credențialelor reale, nu pe un test al rețelei; criteriile de cron (P5, P7, P8, P-E7, P-E8) rămân **neefectuate** pe `4198e8d`. **Verdictul auditorului:** conform, închis tehnic; valorile secrete sunt redactate în jurnal.

Fișierele (la proprietar): `RAPORT_D-349-2.md` `29edc8152c8abf4a2c6df74aeedd9260971cc6d7a92c099a723d8cd3f522fc2d`; `jurnal_run3.log` `ac2131eb70ccb43351e179219acca7228da9cd3649b66e65e59e069305ff4d6a`; `proba_D-349-2.sh` (rularea 3) `c7913d701da9d4819987b5b060186826d1438dff86740d829a420eaafce81a2b`; arhiva cu toate rulările, scripturile și jurnalele `D-349-2_probe.zip` `c77bf7e34dd71f1a11fc8d30868ec37a71801bc29e2fc0d69a2c642a9a309331`.

### 39.4 Starea după această consemnare

| Punctul | Starea |
|---|---|
| D-349-1 | conform, închis |
| D-349-2 | conform, închis |
| D-349-3 | deschis: ziua V3 (după 13.11.2026, cu autorizare separată); r7 (P4) numai cu decizie și aprobare separate; până atunci procedura V3 rămâne r6 |
| D-349-4 | deschis: blocajul din §34.8 **rămâne activ** |
| criteriile de cron pe `4198e8d` | neefectuate; înaintea producției, la prima instalare cu sarcini cron (decizie separată, G6-1 c / DEC-16) |

### 39.5 Ce NU înseamnă această consemnare

Nu ridică blocajul din §34.8; nu autorizează ziua V3, redactarea r7, instalarea vreunui pachet, repornirea staging-ului sau vreo operație pe staging, producție, cPanel, cron ori `civic.env`; nu bifează criteriul E4.11 din planul v2.4; nu activează G6-1 (c); nu decide DEC-3b, DEC9-4, DEC-16 sau DEC-20. Lansarea publică nu este aprobată.

---

## 40. Procedura V3 r7 (etapa C-9b, verificarea P4 pe `4198e8d`) aprobată ca document; înlocuiește r6 (07.11.2026)

**Sursa:** decizia D-349-3 = A′ (§39.1). Procedura `PROCEDURA_V3_STAGING.md` r7 (în afara depozitului), redactată de Claude pornind de la r6 aprobată (SHA-256 `da4237c8…f88d`, §38.5). Revizia auditorului a avut trei treceri: r7; r7 revizuită (codul de ieșire al fiecărei comenzi `curl.exe` se consemnează; oprirea se aplică oricărei abateri: cod HTTP, antet, conținut, cod de ieșire); forma finală (un cod de ieșire nenul înseamnă „cererea nu s-a încheiat cu succes”, nu neapărat „niciun răspuns”). Verificarea finală a auditorului: conform.

**Decizia proprietarului** (07.11.2026, ~12:30, adoptând recomandarea auditorului): **r7 aprobată exclusiv ca document**, SHA-256 `bf61e7f8b375ecd1ea0b09bc61b68a04c37b564e0d21df0b89875446ff8a0c59`. **Înlocuiește r6** ca procedură aprobată pentru ziua V3.

**Ce adaugă r7 față de r6** (restul neschimbat; criteriile V3-1 … V3-8 și succesiunea etapelor păstrate):
- **C-9b [CITIRE]**, după C-9a, înaintea C-10, imediat și fără pauză: verificarea P4 pe `4198e8d` (manualul 7D, 5.2–5.5), de pe calculatorul proprietarului, cu `curl.exe` din PowerShell. Sunt cinci cereri HEAD / GET (`/`, `/favicon.svg`, `/api/v1/health`, `robots.txt`, `/api/v1/diag/client-ip`) pentru trei verificări (`noindex`, inclusiv pe fișierul static; `robots.txt`; ruta de diagnostic). Fiecare comandă e urmată de `$LASTEXITCODE`, cu cod așteptat `0`. Utilizatorul lacătului apare în procedură numai ca `<utilizator>`, iar parola e cerută de `curl.exe` și neafișată. Dovada: captura pentru (1)–(3); confirmare scrisă pentru (4)–(5).
- **Regula de oprire:** orice abatere (cod HTTP, antet, conținut, cod de ieșire) se consemnează ca „P4 neconform pe `4198e8d`” (comanda reușită, răspuns diferit) sau ca „P4 neverificat pe `4198e8d`” (cod de ieșire nenul). Nu se repetă cererile, nu se face depanare pe aplicația pornită și se trece imediat la C-10.
- **P4 se evaluează separat de V3-1 … V3-8:** un P4 neconform nu schimbă rezultatul V3, dar intră în evaluarea pentru ridicarea blocajului din §34.8 (D-349-4).
- Riscurile (durata în care aplicația e pornită; C-9b vine după C-8a, deci nu afectează condiția de liniște) și recuperarea la o întrerupere în C-9b: nu se reia nimic, P4 e consemnat „neverificat” și se trece la C-10.

**Ce NU înseamnă această aprobare:** nu autorizează execuția zilei V3 sau a etapei C-9b, repornirea staging-ului ori vreo operație pe staging, cPanel, cron, `civic.env` sau producție. Execuția rămâne condiționată de verificarea săptămânală R2 din 13.11.2026 și de o autorizare separată. Staging-ul rămâne oprit. Blocajul din §34.8 rămâne activ. Lansarea publică nu este aprobată.

---

## 41. Utilizatorul lacătului de staging: deciziile D-BA1, D-BA2, D-BA3 (07.11.2026)

Consemnat la 07.11.2026. Secțiune nouă; secțiunile anterioare nu se modifică.

### 41.1 Context
Utilizatorul lacătului HTTP (autentificarea de bază din fața staging-ului)
apărea în clar în fișiere din depozit. Depozitul este public. În registru și
în documentație utilizatorul se scrie `<utilizator>`.

### 41.2 D-BA1 = A — înlocuirea în fișierele curente (executat)
- Executat în commitul `1d387c6` pe `faza-5-backend`; CI raportat verde (7/7),
  rularea `42387584458`.
- 8 apariții în 4 fișiere au fost înlocuite cu `<utilizator>`.
- Alte apariții ale aceluiași șir, în contexte fără legătură cu lacătul,
  nu au fost incluse în D-BA1 și nu sunt identificate în prezenta secțiune.

### 41.3 D-BA2 = A — istoricul nu se rescrie
- Istoricul git nu se rescrie (fără `filter-repo`, fără `--force`).
- Consecință acceptată: valoarea veche rămâne în commiturile anterioare
  lui `1d387c6`. Riscul asociat utilizării vechilor credențiale se tratează
  prin D-BA3, nu prin rescrierea istoricului.

### 41.4 D-BA3 = A, condiționat — credențiale noi pe găzduire
- Pe găzduire se setează un utilizator nou și o parolă nouă pentru lacăt.
- Condiție de timp: numai după ziua V3.
- Se face printr-o procedură separată, aprobată separat, care include
  copia `.htaccess` înainte de modificare și comparația după modificare.
- Noile valori nu intră în depozit.

### 41.5 Ce nu schimbă §41
- Blocajul de producție §34.8 rămâne activ; lansarea publică nu este aprobată.
- Staging-ul rămâne oprit și neatins până la verificarea R2 din 13.11.2026.
- Procedura V3 r7 (§40) nu se modifică; execuția ei rămâne neautorizată.

---

## 42. Verificarea săptămânală R2 (P-O8): oprirea confirmată; pregătirea calculatorului pentru ziua V3; nota internă și procedura D-BA3 aprobate ca documente; Node v24.22.3 pe găzduire (07–13.11.2026)

**Sursa:** verificarea făcută de proprietar la 13.11.2026, numai prin citire, cu capturi analizate de Claude (jurnalul staging-ului, intervenția 167); pregătirea calculatorului făcută de proprietar la 07.11.2026, cu comenzile date de Claude și rezultatele transmise prin capturi; documentele din 42.4, revizuite de auditor și aprobate de proprietar. Natura dovezilor: **constatate de proprietar**, analizate de Claude; nu sunt verificări independente ale auditorului.

### 42.1 Verificarea săptămânală R2 (13.11.2026, ~08:44–08:48)

| Verificarea (§33.1) | Rezultatul | Dovada |
|---|---|---|
| (1) Setup Node.js App | `stopped (v24.22.3)`; niciun click pe comenzile aplicației | captură |
| (2) Cron Jobs | „No Cron Jobs” | captură |
| (3) `backup.log` | fără intrări noi: 18,39 KB, ultima modificare 05.11.2026 03:17; ultima intrare `civic-backup-20261105T011702381Z` („criptată (age)”) și rotația ei; identic cu reperul O-3b (jurnalul, intervenția 159) | capturi |

- **Rezultatul: oprire confirmată. P-O8 este îndeplinit**; oprirea G6-1 (c) din 06.11.2026 (§37.3) este confirmată.
- Evidența DEC-16 (D16-a, fișierul Excel al proprietarului, în afara depozitului): rândul 5, tipul „R2 — verificare săptămânală”, rezultatul „suspendată: staging oprit (G6-1 c)”, conform legendei fișierului; „oprire confirmată” în observații.
- Verificarea **nu este o verificare DEC-16** (§33.1).
- **Corectură (Claude):** reperul pentru `backup.log` comunicat proprietarului la începutul verificării (06.11.2026, ~08:08, copia manuală O-2) era greșit. Copia O-2 (`civic-backup-20261106T060825012Z`), rulată din „Run JS script”, nu se scrie în `backup.log`; reperul corect este cel din O-3b. Rezultatul verificării nu este afectat.

### 42.2 Constatare: versiunea Node afișată pe găzduire este v24.22.3

- La oprire (O-4, 06.11.2026) cPanel afișa `stopped (v24.22.2)`; la 13.11.2026 afișează `stopped (v24.22.3)`. Schimbarea s-a produs în perioada de oprire, **fără nicio acțiune a proprietarului**.
- Pentru R2: fără efect; verificarea (1) privește starea de oprire, care este conformă.
- Pentru ziua V3: procedura r7 (§40), pasul C-1b, cere `started (v24.22.2)`; cu v24.22.3 pasul s-ar opri („altă stare / versiune”). CI rulează pe Node 24.22.2, iar Node-ul portabil de pe calculator este v24.22.2 (42.3).
- **Punct deschis:** o decizie a proprietarului despre versiunea Node, înaintea autorizării zilei V3.

### 42.3 Pregătirea calculatorului pentru ziua V3 (07.11.2026; procedura r7, condițiile de pornire 2 și 3)

| Element | Rezultatul | Dovada |
|---|---|---|
| dosarul de lucru `D:\urbis-proba` | creat; gol (0 elemente) | confirmare |
| uneltele | în dosarul separat `D:\urbis-unelte` (decizia proprietarului, 07.11.2026), pentru ca `D:\urbis-proba` să rămână gol, cum cere condiția 3 | confirmare |
| `civic-4198e8d.zip` | 1.506.842 B; SHA-256 `8d89f83ae329d28d4ca59e1f5429df0297d5f035f779494227840decaee67ac7` | captură |
| `civic-2fc8403.zip` (revenirea) | 1.479.760 B; SHA-256 `2445980914a93a2feae6a9093ef4115558ddb988da9be9e0e4517c79ca7a6738` | captură |
| Node portabil v24.22.2 | arhiva oficială Windows x64 descărcată de pe nodejs.org; SHA-256 `ca1bff5d8ead13c9f2ea404a176db46bd430704d5b5113734049fa365e7799e2`, identic cu `SHASUMS256.txt` publicat (semnătura listei nu a fost verificată); `node --version` = `v24.22.2` | captură; confirmare |
| aplicația extrasă din `civic-4198e8d.zip` | pachetul extras conține 24 de fișiere; `RELEASE.txt` indică `commit: 4198e8d` și nu conține mențiunea „modificari necomise” (marcajul pe care `package-release.py` îl scrie la construcția dintr-o copie cu modificări; aceeași verificare ca la C-1 din r7). Nu este o verificare a unei copii de lucru Git | captură |
| comenzile C-9b | fișier text pe calculator, cu cele cinci comenzi identice cu r7; substituentul utilizatorului înlocuit local de proprietar (decizia proprietarului, 07.11.2026); parola nu este în fișier; fișierul se șterge după D-BA3 | confirmare |
| identitatea de staging și fraza-parolă (§36.5) | prezente: suportul și fraza în managerul de parole | **confirmate de proprietar**, fără verificare de către Claude |

### 42.4 Documente aprobate de proprietar, în afara depozitului (07.11.2026)

| Documentul | SHA-256 | Ce conține; deciziile |
|---|---|---|
| `NOTA_INTERNA_SECURITATE_UTILIZATOR_LACAT_r2.md` | `42a9bca00bcfe02772995339cf0fc607d18a8eb2ff4fec9b7df60768a9ac9e7f` | constatări de securitate privind lacătul staging-ului și cerințele pentru D-BA3; **acces restricționat**, nu se publică |
| `PROCEDURA_D-BA3_LACAT_STAGING_r1.7.md` | `c744d193e6d683a1f8d9db80c50918aa972d70d31de647bdec1713eb80481fb7` | procedura D-BA3 (§41.4), revizuită de auditor (r1 → r1.7); **D-BA3-a = A** (fișierul de parole al lacătului nu se copiază; revenirea prin recrearea utilizatorului vechi, acceptată ca alternativă la cerința din nota internă); **D-BA3-b = A** (după ziua V3, cu aplicația oprită). Aprobată exclusiv ca document |

Amprentele au fost verificate de proprietar pe calculatorul lui (`Get-FileHash`).

### 42.5 Starea după această consemnare

| Punctul | Starea |
|---|---|
| G6-1 (c), oprirea staging-ului | confirmată (P-O8, 13.11.2026); regimul R2 continuă |
| condițiile de pornire ale zilei V3 (r7) | 1–3 îndeplinite la nivelul opririi și al pregătirii calculatorului; 4 (sesiunea) de stabilit de proprietar. Versiunea Node de pe găzduire (42.2) rămâne punct deschis |
| versiunea Node pe găzduire (42.2) | deschis: decizie înaintea autorizării zilei V3 |
| ziua V3 | neautorizată; cere autorizare separată |
| D-BA3 | procedura aprobată ca document; execuția după ziua V3, cu autorizare separată |
| blocajul §34.8 | **activ** |

### 42.6 Ce NU înseamnă această consemnare

Nu autorizează ziua V3, etapa C-9b, execuția D-BA3, repornirea staging-ului sau vreo operație pe staging, producție, cPanel, cron ori în fișierul de setări al aplicației; nu ridică blocajul din §34.8; nu modifică procedura r7. Lansarea publică nu este aprobată.

---

## 43. Node v24.22.3 pe găzduire: proba CI pe o ramură separată, conformă; jobul de producție (DEC-8 c1) actualizat (13.11.2026)

**Sursa:** constatarea din §42.2; diff-ul `CI_NODE_24.22.3.diff` (SHA-256 `0348e5486763a9d0317db393c2581b0708a4f41878fc2d04ad32cde782a8ec72`, în afara depozitului), revizuit de auditor fără obiecții. **Deciziile proprietarului** (13.11.2026): varianta C (întâi proba CI pe Node 24.22.3); apoi aprobarea, într-o singură cerere, a commitului și a push-ului pe o ramură de probă și a rulării manuale a CI-ului pe ea; apoi aprobarea pregătirii acestui diff. Natura dovezilor din 43.1: **verificate de Claude** (`gh`, jurnalul jobului), nu independent de auditor.

### 43.1 Proba pe ramura separată

| Element | Rezultatul |
|---|---|
| ramura de probă | `ci-node-24.22.3`, commitul `f915992` = `d33fe9b` + diff-ul de mai sus (numai `.github/workflows/ci.yml`, 3 rânduri) |
| push | numai ramura de probă, fără `--force`; `faza-5-backend` (`d33fe9b`) și `main` (`d9bc2c9f`) neatinse |
| rularea CI | `43385271898`, pornită manual (`workflow_dispatch`): **succes, 7/7** |
| jobul de producție | `backend (Node 24.22.3, MariaDB 11.4.13, producție)`; jurnalul: `Node v24.22.3; baza de date 11.4.13-MariaDB-ubu2404` (verificarea explicită a versiunilor) |

### 43.2 Valabilitatea pentru pachetul V3

Proba a rulat codul de la `d33fe9b`, nu pachetul `civic-4198e8d.zip`. Între `4198e8d` și `d33fe9b` s-au schimbat numai documente (`docs/` și `PROJECT_HANDOFF_CURRENT.md`; `git diff --name-only 4198e8d d33fe9b`); codul aplicației, testele și CI-ul sunt identice. Rezultatul probei se aplică, prin urmare, și codului din pachetul V3. Nu este o probă a pachetului însuși pe găzduire.

### 43.3 Actualizarea pe `faza-5-backend` (acest commit)

- `.github/workflows/ci.yml`: aceleași trei rânduri ca în proba din 43.1 (comentariul DEC-8, `node`, `expect_node`: `24.22.2` → `24.22.3`); `ci.yml` rezultat este identic cu cel din `f915992`. MariaDB 11.4.13 neschimbat.
- Temeiul: regula scrisă în `ci.yml` („La o schimbare de versiune pe server, valorile node / image / expect_* de mai jos se actualizează împreună”, DEC-8 c1) și precedentul din 03–04.11.2026 (commitul `1524891`, §36.7: `24.21.0` → `24.22.2`).

### 43.4 Ce rămâne deschis

| Punctul | Starea |
|---|---|
| procedura V3 (§40), C-1b: `started (v24.22.2)` | o revizie r8 a procedurii, numai pentru versiunea Node; document separat, cu revizia auditorului și aprobarea proprietarului |
| versiunea MariaDB pe găzduire | neconfirmată după 04.11.2026; se poate citi în phpMyAdmin („Server version”), de exemplu la C-1c, unde phpMyAdmin se folosește oricum |
| ramura de probă `ci-node-24.22.3` | se șterge după acest commit, cu aprobare separată |
| ziua V3 | neautorizată |
| blocajul §34.8 | **activ** |

### 43.5 Ce NU înseamnă această consemnare

Nu modifică procedura r7 și nu autorizează ziua V3, D-BA3, repornirea staging-ului sau vreo operație pe staging, producție ori cPanel; nu ridică blocajul din §34.8. Lansarea publică nu este aprobată.

---

## 44. Procedura V3 r8.1 aprobată ca document; înlocuiește r7 (13.11.2026)

**Sursa:** procedura `PROCEDURA_V3_STAGING_r8.1.md` (în afara depozitului), redactată de Claude pornind de la r7 aprobată (SHA-256 `bf61e7f8…0c59`, §40), cu raportul modificărilor și diferența față de r7. Revizia auditorului: r8 (fără obiecții; recomandarea verificării Node la C-0), apoi r8.1 (fără obiecții).

**Decizia proprietarului** (13.11.2026): **r8.1 aprobată exclusiv ca document**, SHA-256 `3f17afafe585a8e0005e298264e4f05f81ad1852a22c4887963d27b115267e30` (37.479 B). **Înlocuiește r7** ca procedură aprobată pentru ziua V3.

**Ce schimbă r8.1 față de r7** (5 rânduri din 205; niciun rând adăugat sau șters; pașii C-0a … C-10, criteriile V3-1 … V3-8 și recuperarea din §4.1 neschimbate):

| Pasul | r7 | r8.1 |
|---|---|---|
| **C-0** | `stopped` | `stopped (v24.22.3)`: versiunea afișată lângă stare, citită fără click; orice altă versiune = **oprire înaintea C-1**, deci înaintea oricărei modificări pe găzduire (recomandarea auditorului, decizia proprietarului) |
| **C-1b** | `started (v24.22.2)` | `started (v24.22.3)` (§42.2, §43) |
| „Baza” | CI pe `4198e8d` | se adaugă proba CI pe Node 24.22.3 și CI-ul de la `23e12c6`, cu limita lor (§43) |
| „Starea documentului”, „Stadiul” | r7 | trimiterile la r8.1; până la aprobare rămânea r7 |

Neschimbat intenționat: Node-ul portabil v24.22.2 de pe calculator (folosit numai local, la C-4a; §42.3).

**Ramura de probă `ci-node-24.22.3`** (`f915992`, §43.1): ștergerea ei a fost aprobată de proprietar (13.11.2026), după confirmarea că `ci.yml` de pe `faza-5-backend` este identic cu cel din probă (același obiect git). Ștergerea nu a putut fi făcută din sesiunea de lucru (proxy-ul refuză ștergerea ramurilor); **ramura a fost ștearsă de proprietar din interfața GitHub** (13.11.2026, ~10:16), iar Claude a verificat apoi în depozit (`git ls-remote`) că ea nu mai există și că celelalte ramuri au rămas neschimbate (`faza-5-backend` = `23e12c6`, `main` = `d9bc2c9f`, `recovery-etapa-5-0e2cc20` = `0d328a67`).

**Ce NU înseamnă această aprobare:** nu autorizează ziua V3, etapa C-9b, D-BA3, repornirea staging-ului sau vreo operație pe staging, cPanel, cron, în fișierul de setări al aplicației ori în producție. Execuția zilei V3 cere o autorizare separată. Staging-ul rămâne oprit, în regimul R2. Blocajul din §34.8 rămâne activ. Lansarea publică nu este aprobată.

---

## 45. Ziua V3 pe staging: repetiția M4 + R19 pe `4198e8d`, executată după procedura r8.1; V3-1 … V3-8 conforme; P4 conform pe `4198e8d`; staging oprit din nou (13.11.2026)

**Sursa:** execuția făcută de proprietar la 13.11.2026, câte un pas, cu ghidajul lui Claude și capturile analizate de Claude; procedura aprobată **r8.1** (§44, SHA-256 `3f17afaf…5e30`). **Autorizarea proprietarului:** 13.11.2026, 18:31, pentru o sesiune de seară. Natura dovezilor: **constatate de proprietar**, analizate de Claude; nu sunt verificări independente ale auditorului.

### 45.1 Rezultatul pe scurt

| Criteriul (procedura r8.1, §3) | Pașii | Rezultatul |
|---|---|---|
| V3-1 (ținta separată, confirmată prin citire; copia direct în `backups`) | C-4b, C-5, C-5a, C-6 | **conform** |
| V3-2 (verificarea permisă) | C-7a | **conform**: „PERMISĂ” |
| V3-3 (restaurarea; A absentă) | C-7b, C-8 | **conform** |
| V3-4 (mesajul lui B reținut la restaurare) | C-2b, C-7b, C-8 | **conform** |
| V3-5 (a doua rulare refuzată, fără efect) | C-7c, C-8b | **conform**, pe baza rezultatului C-7c („REFUZ, nimic scris”), cu limita probatorie declarată la 45.4, punctul 8 |
| V3-6 (starea activă neschimbată) | C-3e = C-8a | **conform**: 32/32 sume identice; amprente și structură identice |
| V3-7 (curățenia; fără cron) | C-0, C-9 | **conform** |
| V3-8 (nimic rămas din țintă) | C-7b, C-9 | **conform** |
| P4 pe `4198e8d` (nu e criteriu V3; D-349-3 = A′) | C-9b | **conform**, 5/5 |

**Staging-ul a fost oprit din nou la 21:28 (`stopped (v24.22.3)`); regimul R2 (§33) este reluat.**

### 45.2 Desfășurarea (rezultatele pe pași)

| Pas | Rezultatul |
|---|---|
| C-0 | `stopped (v24.22.3)`; „No Cron Jobs”; `backups` = inventarul de după O-5 (jurnalul, intervenția 164); `civic-test-data` neschimbat; `civic-test-app`: `dist`, `public`, `server`, `tmp`, `package.json`, `RELEASE.txt`, `stderr.log` (2,62 KB, 12.10.2026) |
| C-0a | `RELEASE.txt`: `commit: 2fc8403`; `server` conține numai `data`, `dist`, `migrations`, `seeds` |
| C-1 | arhiva `civic-4198e8d.zip`: SHA-256 verificat pe calculator, **înaintea urcării** (`8D89F83A…`, egal cu §42.3); pe găzduire, File Manager a afișat numai **1,44 MB**, nu dimensiunea exactă (45.4, punctul 2); cele 4 intrări ale pachetului șterse, arhiva extrasă, `RELEASE.txt`: `commit: 4198e8d`, arhiva ștearsă |
| C-1′ | cele 24 de intrări corespund `INVENTAR_civic-4198e8d.txt` **ca nume și dimensiuni**; amprentele SHA-256 ale fișierelor extrase **nu** au fost verificate pe găzduire; intrările care nu aparțin pachetului, neschimbate |
| C-1a | `civic.env`: 04.11.2026, 7:37 PM, neschimbat |
| C-1b | `started (v24.22.3)`; `health`: `{"status":"ok","version":"0.0.0+4198e8d"}`; `stderr.log` neschimbat |
| C-1c | fluxul către Primărie era **pornit** (modul staging, numai adresele din listă; destinatarul = proprietarul); coada = referința (1 / 1 / 7 `sent`; 0 `queued`, `sending`, `failed`). DEC-16 a zilei: conformă (evidența DEC-16, D16-a) |
| C-2 | fluxul debifat și salvat; panoul arată fluxul oprit |
| C-2a | A = **TM-018** (cu fotografie, fără transmitere); B = **TM-019** (cu fotografie, cu transmitere) |
| C-2b | exact un rând `registry_notification` / `on_hold` / **TM-019** |
| C-3 | `civic-backup-20261113T171353190Z` (19:13:53), „criptată (age)”. Rotația a șters cele 3 copii criptate anterioare (45.4, punctul 6). În `stderr`: un `npm notice` (precedentul §36.6) |
| C-3a | ID-ul lui A: `01M7AY2TY7JN2AXD0WMCWVFNSB` |
| C-3b, C-3c | A ștearsă definitiv; marcajul `backups/deletions/<ID-ul lui A>.json` prezent |
| C-3d | C = **TM-020** (fără fotografie, fără transmitere). Condiția de liniște: de la ~19:24 |
| C-3e | sumele de control ale celor **32** de tabele (~19:34; 45.4, punctele 3 și 4); `storage/photos`: 6 fișiere `.webp`, `storage/tmp` gol; arhiva stării: 13 fișiere, 6 dosare (`amprente.csv`, `dosare.csv` pe calculator) |
| C-4 | arhiva copiei descărcată (SHA-256 `BC745CC4…CFC5`; 11 fișiere) și ștearsă de pe găzduire |
| C-4a | `backup:verify`: copia întreagă și consecventă (13 sesizări, 7 fotografii), cod 0; `backup:decrypt`: `civic-restore-20261113T180538706Z` (11 fișiere), cod 0 (Node portabil v24.22.2, §42.3) |
| C-4b | copia decriptată urcată în `backups` și extrasă; arhiva ștearsă; permisiunile corectate (45.4, punctul 5) |
| C-5 | baza `<cont>_civic_v3`; utilizatorul `<cont>_v3` (parolă din 24 de litere și cifre, în managerul de parole, intrare temporară); ALL PRIVILEGES numai pe `<cont>_civic_v3`. Server: MariaDB 11.4.13 (afișat în cPanel) |
| C-5a | `restore-target.env`: 125 B, permisiuni 0600, în `/home2/<cont>/civic-test-data` (în afara docroot-ului) |
| C-6 | ținta identificată: `<cont>_civic_v3`, `<cont>_v3`, `localhost:3306`, `STORAGE_DIR: /home2/<cont>/v3-storage`, 0 tabele; copia sursă `civic-restore-20261113T180538706Z` |
| C-7 | schema bazei țintă la versiunea 2 |
| C-7a | „PERMISĂ” |
| C-7b | restaurarea încheiată: fotografii 6; șterse conform listei 1 (A); mesaje reținute 1 (TM-019, R19); contorul TM restaurat: 20; copia decriptată ștearsă |
| C-7c | „REFUZ, nimic scris”; cod de ieșire 1 |
| C-8 | baza de test: 12 sesizări (TM-019 prezentă; TM-018 și TM-020 absente); mesajul lui B `failed`, motivul R19; contorul 20; rânduri: `reports` 12, `report_photos` 6, `email_outbox` 10 (= valorile de la C-3 minus A, 45.4 punctul 7); `v3-storage`: 6 fotografii, fără cea a lui A |
| C-8a | sumele celor 32 de tabele **identice** cu C-3e (32/32); `Compare-Object` pe amprente și pe structură: niciun rând (identice); niciun `civic-restore-*` în `backups`; coada activă: TM-019 tot `on_hold`. Condiția de liniște încheiată |
| C-8b | baza de test: 12 / 6 / 10 / contorul 20, identice cu C-8 |
| C-9 | în ordinea din §4.1, regula 3: (a) niciun `civic-restore-*` și nicio arhivă în `backups`; (b) `restore-target.env` șters fără coș (`civic.env` neschimbat: 1,37 KB, 04.11.2026, 7:37 PM); (c) utilizatorul `<cont>_v3` șters (rămâne numai utilizatorul activ); (d) baza `<cont>_civic_v3` ștearsă (rămâne numai baza activă, cu utilizatorul ei); (e) `/home2/<cont>/v3-storage` șters fără coș. `.trash`: fără elementele V3 (45.4, punctul 10); `tmp`: numai sesiunile phpMyAdmin și statisticile găzduirii; „No Cron Jobs” |
| C-9a | panoul fluxului, fără salvare: fluxul **oprit** |
| C-9b | 45.3 |
| C-10 | **STOP APP**, ~21:28: `stopped (v24.22.3)` (confirmat de proprietar). **`health` după oprire nu a fost cerut la C-10** (omisiunea ghidajului). **Verificare suplimentară, 14.11.2026, 08:23** (D-1 = A, aprobată de proprietar): `curl.exe -sI -u <utilizator> …/api/v1/health` → **`HTTP/1.1 404 Not Found`**, `text/html` (pagina serverului; aplicația nu răspunde), `Date: Sat, 14 Nov 2026 06:23:08 GMT`; cod de ieșire **0** (captură). Rezultat identic ca natură cu O-6 (jurnalul, intervenția 165). Este o verificare făcută a doua zi, **nu** dovada că pasul C-10 a fost executat complet în seara de 13.11.2026; o cerere HTTP nu poate reporni aplicația oprită (§32.1) |

### 45.3 Verificarea P4 pe `4198e8d` (C-9b, ~21:20–21:27)

De pe calculatorul proprietarului, `curl.exe -u <utilizator>`, parola cerută interactiv la fiecare comandă:

| Cererea | Rezultatul | Cod de ieșire |
|---|---|---|
| (1) HEAD `/` | `200`; `x-robots-tag: noindex, nofollow`; `text/html`; `last-modified: Sat, 07 Nov 2026 06:47:30 GMT` | 0 |
| (2) HEAD `/favicon.svg` | `200`; `content-type: image/svg+xml`; `x-robots-tag: noindex, nofollow`; același `last-modified` | 0 |
| (3) HEAD `/api/v1/health` | `200`; `application/json`; `content-length: 41`; `x-robots-tag: noindex, nofollow`; `cache-control: no-store` | 0 |
| (4) GET `/robots.txt` | exact `User-agent: *` și `Disallow: /` | 0 |
| (5) GET `/api/v1/diag/client-ip` | `{"error":{"code":"NOT_FOUND","message":"Resursa nu există."}}` | 0 |

- **P4 conform pe `4198e8d`**, 5/5 (capturi pentru toate cele cinci).
- Prima încercare a cererii (1) **nu a ajuns la `curl.exe`**: PowerShell a refuzat linia (eroare de sintaxă, substituentul lăsat între `< >`). Nicio cerere nu a plecat, deci nu e un rezultat P4 și nici o repetare a unei cereri; linia corectată a fost rulată o singură dată.
- Constatare: răspunsurile `200` conțin și antetul `WWW-Authenticate: Basic realm="Staging Urbis Activ"`. Nu afectează P4; se notează ca fapt (lacătul este activ).
- Potrivit procedurii (§3), rezultatul P4 intră în evaluarea pentru ridicarea blocajului din §34.8 (D-349-4); această consemnare nu face evaluarea.

### 45.4 Abateri și constatări

1. **Sesiunea de seară** (18:31–21:35), nu „ziua”, cum cere condiția de pornire 4. Acceptată de proprietar la autorizare. Cron-ul era oprit, deci nu exista legătură cu 03:17 / 03:47.
2. **Dimensiunea arhivei (C-1):** File Manager afișează 1,44 MB, nu numărul exact de octeți (1.506.842 B). Decizia proprietarului (A): continuarea cu dimensiunea rotunjită. **Limita (precizare la cererea auditorului):** amprenta SHA-256 verificată pe calculator dovedește integritatea arhivei **dinaintea urcării**, nu și a celei urcate; după extragere au fost verificate numele și dimensiunile celor 24 de intrări (C-1′), nu amprentele lor. Nimic nu indică o instalare greșită (versiunea din `health`, `RELEASE.txt`, lista și dimensiunile corespund), dar verificarea arhivei de la C-1 **nu este complet conformă** cu procedura.
3. **§2.1, interogarea care generează instrucțiunea `CHECKSUM TABLE`:** în phpMyAdmin, `SET SESSION group_concat_max_len` nu a avut efect pentru interogarea următoare (textul `q` trunchiat, avertismentul #1260); în plus, contextul `DATABASE()` a fost `NULL`. Înlocuire: instrucțiunea **explicită** `CHECKSUM TABLE … EXTENDED` cu cele 32 de tabele (lista citită din `information_schema`, cu numele bazei scris explicit), aceeași la C-3e și C-8a; la C-8a, cu numele calificate cu baza. Rezultatul nu e afectat. **Defect de procedură**, de corectat într-o revizie viitoare a procedurii, dacă va mai fi folosită.
4. **Exportul sumelor (§2.1, „Export → CSV”):** la prima încercare a fost exportată, din meniul general, **întreaga bază activă** ca CSV (date de test în clar pe calculator); fișierul a fost șters de proprietar. Sumele au fost păstrate apoi prin copiere (fișierul `sume.txt` din `stare-inainte` și `stare-dupa`) și transcrise de Claude din capturi; comparația a fost făcută pe transcrieri, 32/32.
5. **Permisiunile copiei decriptate (C-4b):** după extragere, File Manager a arătat 0777 pentru dosare și 0666 pentru fișiere. Corectate de proprietar la 0700 / 0600 (decizia A), înaintea C-6. `backups` se află în `civic-test-data`, în afara docroot-ului; copia a fost ștearsă de restaurare la C-7b.
6. **Rotația la C-3:** copia nouă a declanșat rotația (copiile mai vechi de 7 zile, `rotateBackups`), care a șters cele trei copii criptate anterioare: `civic-backup-20261104T174116344Z`, `civic-backup-20261105T011702381Z`, `civic-backup-20261106T060825012Z`. Comportament conform codului, neprevăzut în procedură. Decizia proprietarului (A): continuarea. **Consecința:** pe staging există acum o singură copie, `civic-backup-20261113T171353190Z`.
7. **Numărul de rânduri la C-3:** captura ieșirii nu a cuprins partea din mijloc. Compensare: numărătoarea prin SQL pe baza activă, după C-3 și înaintea C-3b: `reports` 13, `report_photos` 7, `email_outbox` 10, `audit_log` 55. Valorile din baza de test (C-8) corespund (minus A).
8. **Ordinea C-7c / C-8:** C-8 a fost rulat după C-7c, nu între C-7b și C-7c. Consecința pentru V3-5: C-8 și C-8b sunt ambele ulterioare C-7c, deci C-8b nu compară „înainte” și „după” a doua rulare. Dovada lui V3-5 se sprijină pe ieșirea C-7c („REFUZ, nimic scris”, cod 1) și pe faptul că starea constatată la C-8 este exact starea așteptată după C-7b (valorile din punctul 7, minus A; contorul 20). **Limită declarată.**
9. **Sumele egale cu 0:** patru tabele au suma 0 la ambele instantanee (`citizen_blocks`, `citizen_login_codes`, `report_assignees`, `report_responses`), adică sunt tabele goale; nicio sumă `NULL`. Criteriul din §2.1 („nicio sumă nu poate fi `NULL`”) este îndeplinit; formularea „toate nenule” de la C-8a (și „sumele de control nenule” din istoricul reviziilor, r3) a fost citită în sensul §2.1 (nenul = nu `NULL`). **Interpretarea a fost acceptată de auditor ca regulă operațională, cu rezervă:** cele 32 de rezultate au fost prezente la ambele instantanee, fără niciun `NULL`, și identice 32/32. Formularea ambiguă a procedurii se corectează înaintea unei eventuale refolosiri.
10. **Ștergerea de la C-1 dusă în coș:** cele 4 intrări ale pachetului vechi `2fc8403` (`dist`, `server`, `package.json`, `RELEASE.txt`) au fost șterse la C-1 fără „Skip the trash” și se află în `.trash` (cu `.trash_restore`, 18:44). Nu conțin secrete; procedura nu cerea ștergerea fără coș la C-1. `.trash` mai conține elemente anterioare zilei V3, între care `civic-backup-20261104T174116344Z.zip` (din 04.11.2026). Golirea coșului: decizie separată.
11. **Fișierul cu comenzile C-9b** (pe calculator, cu utilizatorul lacătului) a fost șters la curățenia din 13.11.2026, nu „după D-BA3”, cum prevedea §42.3. La D-BA3, comenzile se refac din procedură.
12. **Constatări fără efect asupra rezultatului:** cPanel **138.0.24**; versiunea MariaDB pe găzduire **11.4.13** (punctul deschis din §43.4 se închide); textul de lângă bifa fluxului („oprit = mesajele așteaptă și pleacă automat la pornire”) confirmă că mesajul `on_hold` al lui TM-019 pleacă la prima repornire a fluxului (45.5).
13. **Credențialele lacătului (constatare, 14.11.2026):** utilizatorul și parola lacătului de staging **nu sunt păstrate** în managerul de parole al proprietarului (acesta conține numai fraza-parolă a identității de staging). La D-BA3, credențialele noi se păstrează de la început într-o intrare separată a managerului de parole; observația se transmite procedurii D-BA3 (§42.4), fără a o modifica prin această consemnare.

### 45.5 Curățenia pe calculator (13.11.2026, 21:30–21:35)

- șterse definitiv (PowerShell `Remove-Item`, fără coș; `Test-Path` = `False`): `D:\urbis-proba\civic-restore-20261113T180538706Z` și arhiva lui, dosarul `copie`, arhiva `civic-backup-20261113T171353190Z.zip`, fișierul cu comenzile C-9b;
- clipboardul golit; istoricul clipboardului Windows: dezactivat;
- intrarea temporară cu parola utilizatorului `<cont>_v3` ștearsă definitiv din managerul de parole;
- păstrate: identitatea de staging (pe suport, cu fraza-parolă în managerul de parole) și dosarele `stare-inainte`, `stare-dupa` (sume de control, amprente, liste de dosare; fără date personale), care se șterg după intrarea acestei consemnări în depozit.

### 45.6 Starea după această consemnare

| Punctul | Starea |
|---|---|
| ziua V3 | **încheiată**; V3-1 … V3-8 consemnate ca conforme, cu limitele probatorii de la 45.4, punctele 8 și 9. Verificarea arhivei la C-1 a rămas incompletă (45.4, punctul 2), fără indicii constatate privind o instalare greșită. `health` după oprire verificat suplimentar la 14.11.2026 |
| P4 pe `4198e8d` | conform; evaluarea pentru §34.8 nefăcută |
| staging | oprit (`stopped (v24.22.3)`), „No Cron Jobs”, lacătul activ; regimul R2; pachetul instalat: `4198e8d` |
| fluxul către Primărie | oprit; **TM-019 `on_hold` în baza activă**: decizie înaintea oricărei reporniri a fluxului |
| copiile de pe staging | una singură: `civic-backup-20261113T171353190Z` (45.4, punctul 6) |
| `.trash` din cPanel | conține intrările pachetului vechi și elemente anterioare (45.4, punctul 10): decizie separată |
| D-BA3 | procedura aprobată ca document (§42.4); execuția cere autorizare separată; observația din 45.4, punctul 13 |
| procedura V3 | defectul de la §2.1 (45.4, punctul 3), de corectat numai dacă procedura va mai fi folosită |
| blocajul §34.8 | **activ** |

### 45.7 Ce NU înseamnă această consemnare

Nu autorizează D-BA3, repornirea staging-ului, repornirea fluxului, golirea coșului, vreo operație pe staging, producție, cPanel, cron ori în fișierul de setări al aplicației; nu ridică blocajul din §34.8 și nu face evaluarea P4 pentru el. Lansarea publică nu este aprobată.
