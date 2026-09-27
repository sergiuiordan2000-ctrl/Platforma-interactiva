# TURNU MĂGURELE CIVIC — FAZA 4 — PACHET DE INTRARE PENTRU AUDITUL CHATGPT

**Data:** 27.09.2026
**Pregătit de:** Claude (executant) · **Auditor:** ChatGPT · **Decident:** Sergiu Iordan
**Instrucțiune:** `FAZA_4_INSTRUCTIUNE_CLAUDE_PREGATIRE_AUDIT.md` (27.09.2026)
**Obiectul auditului:** prima proiectare a Fazei 4, adică cele 8 documente `faza4/FAZA_4_*.md`. Ele sunt o **propunere de design**, **neaprobată**.

> **Natura acestui document:** este o bază factuală pentru audit. **Nu modifică designul, nu rezolvă contradicții, nu aprobă nimic.**
>
> **Cum a fost produs:**
> - **Git și codul** sunt verificate efectiv în această sesiune, numai prin citire, pe o clonă a branch-ului `recovery-etapa-5-0e2cc20` la `cb9f47e`.
> - **Documentele** sunt citite din pachetul de transfer al Fazei 4 și din repository.
> - Prima proiectare a fost făcută într-o sesiune anterioară. **Sursele folosite atunci sunt cele declarate** în `FAZA_4_00_ARHITECTURA_SI_INDEX.md` §2. Acolo unde nu le-am putut reverifica acum, spun explicit.

**Legenda statutului surselor și a afirmațiilor:**

| Etichetă | Sens |
|---|---|
| **APROBAT** | decizie aprobată de proprietar, consemnată în `PROJECT_RULES_AND_DECISIONS.md` (RULES) la `cb9f47e` |
| **REFERINȚĂ** | document agreat, care stabilește cadrul (de exemplu Planul v1.1) |
| **ANALIZĂ** | raport de analiză; conține și variante respinse; **nu** este decizie |
| **PROPUNERE** | conținut al primei proiectări a Fazei 4; neaprobat |
| **COD** | fapt verificat în cod la `cb9f47e` |
| **NEVERIFICAT** | nu am putut verifica în această sesiune |

---

## Cuprins

- A. Sursele oficiale
- B. Starea exactă a repository-ului
- C. Deciziile aprobate care constrâng Faza 4
- D. K-1…K-6
- E. T1–T8
- F. DN-01…DN-24
- G. Matricea de trasabilitate
- H. Inventarul serviciilor frontend
- I. Inventarul tipurilor de date
- J. Diferențele dintre aplicația actuală și designul propus
- K. Punctele care nu pot fi stabilite încă
- L. Riscuri și contradicții detectate
- Fișiere suplimentare necesare
- STATUS

---

## A. SURSELE OFICIALE

### A.1 Sursele declarate de prima proiectare (`FAZA_4_00` §2)

| # | Sursă (fișier) | Versiune / dată | Ce fundamentează în Faza 4 | Statut | Disponibilă acum? |
|---|---|---|---|---|---|
| S-1 | `Turnu_Magurele_Civic_PLAN_DE_LUCRU_COMUN_v1.1.md` (pachet; **nu** este în repository) | v1.1, 26.09.2026 | numerotarea B1–B8, B10 (B9 nefolosit); conținutul Fazei 4; criteriul checkpoint-ului („design complet, revizuit și aprobat”); subfazele 5.1–5.7; regula P7 la 5.2; regula „un agent pe subetapă”; mențiunea T1–T8 | **REFERINȚĂ** | da |
| S-2 | `FAZA_4_INSTRUCTIUNI_INCEPERE.md` („FAZA 4 — ÎNCEPERE PROIECTARE BACKEND”; pachet) | 27.09.2026 | mandatul proiectării; conținutul cerut pentru B1–B10; regula „DECIZIE NOUĂ — NECESITĂ APROBARE”; criteriile checkpoint-ului (§17) | **REFERINȚĂ** (instrucțiunea proprietarului) | da |
| S-3 | `PROJECT_RULES_AND_DECISIONS.md` (repository) | la `cb9f47e` | §1–§10: reguli de lucru, Git, deciziile de produs §6, securitate §10; **§11: toate deciziile Fazei 3** | **APROBAT** | da |
| S-4 | `PROJECT_HANDOFF_CURRENT.md` (repository) | la `cb9f47e` | starea proiectului; cheile `localStorage` (A.6); rolurile (A.4); lista „ce nu se modifică fără decizie” (H); istoricul commit-urilor (B.2) | **REFERINȚĂ** (conține formulări depășite, vezi L) | da |
| S-5 | Master Planul: `PLAN_MASTER_APLICATIE_CIVICA_TURNU_MAGURELE.pdf` | v1.0 (conform raportului Fazei 0, §9) | declarat ca sursă (etapele 4D / 4E pentru sondaje; A17-3: moderarea și e-mailul Primăriei ca axe separate) | **REFERINȚĂ** | **NU:** fișierul nu este nici în pachet, nici în repository. Trimiterile la el sunt **NEVERIFICATE** în această sesiune. |
| S-6 | Rapoartele Fazei 3 (`faza3/`, 13 fișiere; pachet) | toate 27.09.2026 | variantele analizate, motivațiile, testele de staging (N-2 v3 §6), lista inițială de entități (checkpoint §4) și zonele API (checkpoint §5) | **ANALIZĂ** (deciziile valabile sunt numai cele din RULES §11) | da |
| S-7 | Codul la `cb9f47e`: `src/types/*`, `src/services/*`, `ReportForm.tsx`, `imageCompressionService.ts` | `cb9f47e` (codul este identic cu cel de la `ff53758`) | ce trebuie migrat; contractele existente; gărzile de permisiuni; valorile actuale ale validărilor | **COD** | da (reverificat, secțiunile H și I) |
| S-8 | Registrul npm (`npm view`, numai citire) | 27.09.2026 (în sesiunea anterioară) | versiunile propuse și compatibilitatea cu Node 20 / 24 (FAZA_4_00 §6) | **ANALIZĂ** | **NEVERIFICAT** acum: versiunile nu au fost reinterogate |

### A.2 Detaliu S-6: rapoartele Fazei 3

| Fișier | Subiect | Observație pentru audit |
|---|---|---|
| `FAZA_3_N2_STACK_BACKEND_ANALIZA.md` | N-2 v1 | variante de stack |
| `FAZA_3_N2_STACK_BACKEND_ANALIZA_HOSTGATE.md` | N-2 v3, după răspunsul HostGate | **§6: lista testelor de staging** (T-ISO, T-RUN etc.), invocată de B10 §5 |
| `FAZA_3_N2_PROPUNERE_DECIZII_G1_G2_G3_G5_G10.md` | propunerea G1…G10 | text aprobat, preluat în RULES §11.1 |
| `FAZA_3_N2_INCHIDERE_SI_I1_I4.md` | închiderea N-2, clarificările I-1…I-4 | — |
| `FAZA_3_N3_EMAIL_ANALIZA.md` | N-3 | aici „T1/T2/T3” = variante de **transport e-mail** (nu T1–T8, vezi E) |
| `FAZA_3_D6_PIN_HARTA_ANALIZA.md` | D6 | — |
| `FAZA_3_D8_CONTURI_ANALIZA.md` | D8 | — |
| `FAZA_3_D3_D4_SONDAJE_ANALIZA.md` | D3/D4 | **aici apar valorile `live` / `after_close` / `admin_only` și ID-urile D34-1…D34-3**, care nu sunt în RULES (vezi L, O-2 și O-4) |
| `FAZA_3_N4_ANTI_VOT_ANALIZA.md` | N-4 | — |
| `FAZA_3_D10_DATE_DEMO_ANALIZA.md` | D10 V2 | — |
| `FAZA_3_D9_NOTIFICARI_ANALIZA.md` | D9 | aici „T1/T2/T3” = **tensiuni** de formulare (nu T1–T8) |
| `FAZA_3_A17_EMAIL_PRIMARIE_ANALIZA.md` | A-17 | — |
| `FAZA_3_CHECKPOINT.md` | checkpoint-ul Fazei 3 | **textul din pachet este versiunea dinaintea aprobării** („propus, neaprobat”, HEAD `af60778`). Aprobarea este consemnată numai în RULES §11 și HANDOFF I, la `cb9f47e`. Conține lista E-1…E-10 (elemente deschise) și DF-1…DF-3 (corecturi documentare). |

### A.3 Alte surse relevante (nedeclarate explicit în FAZA_4_00 §2, dar existente)

| Sursă | Statut | Relevanță |
|---|---|---|
| `faze0_2/` (15 rapoarte ale Fazelor 0–2; pachet) | ANALIZĂ / rapoarte de execuție | riscurile R-1…R-10 (Faza 0 §12, inclusiv R-3 „harness-ul citește parolele”, R-9 „acoperirea incompletă a testelor”); constatările C-1…C-11 |
| `tests/` (repository: `run_all.py`, `README.md`, suitele) | COD | referința 102/103; `KNOWN_FAILS = { R6D-SES-01 }` |
| `ANALIZA_PROIECT_TURNU_MAGURELE.md` (repository) | statut nedecis (**D2 deschisă**) | citată de analiza D3/D4 (arhiva cu rezultate) |
| `PROJECT_HANDOFF.md` (repository) | depășit (starea din Etapa 5) | nu este sursă pentru Faza 4 |

---

## B. STAREA EXACTĂ A REPOSITORY-ULUI

Verificată pe 27.09.2026, după ora 17:50 EEST, numai prin citire.

| Element | Rezultat | Comandă / dovadă |
|---|---|---|
| Branch curent | `recovery-etapa-5-0e2cc20` | `git branch --show-current` |
| HEAD | `cb9f47e9b13d337198e42cfdbf34ee42a6995635`: `docs: record phase 3 backend decision gate (N-2, N-3, D6, D8, D3/D4, N-4, D10, D9, A-17)`, 2026-09-27 17:06 +0300 | `git log -1` |
| Commit-ul de bază al Fazei 4 | `cb9f47e` (indicat explicit în `FAZA_4_INSTRUCTIUNI_INCEPERE.md` §1) | — |
| Ultimul commit care atinge cod sau dependențe | `ff53758` (A-25). `af60778` și `cb9f47e` modifică numai documentație. | `git log -- package.json package-lock.json bun.lock` → `ff53758`; `git log ff53758..HEAD --stat` |
| `git status` | **curat** (nimic modificat, nimic neurmărit, nimic ignorat) | `git status --porcelain --ignored` → gol |
| Poziția față de GitHub | identic: `origin/recovery-etapa-5-0e2cc20` = `cb9f47e` (după `git fetch`) | `git rev-parse origin/…` |
| `main` (GitHub) | `d9bc2c9f53cec27dafc846889b0457eea8495d20`, 1 commit, **fără istoric comun** cu branch-ul de lucru (rădăcini diferite: `672bbea` / `d9bc2c9`) | `git ls-remote`; `git merge-base` → niciun rezultat |
| `server/` | **nu există** | `ls` |
| `shared/` | **nu există** | `ls` |
| `package.json` | nemodificat față de HEAD; ultima modificare la `ff53758`; `name` = `turnu-magurele-civic` | `git diff HEAD` gol |
| Lockfile-uri (`package-lock.json`, `bun.lock`) | nemodificate; ultima modificare la `ff53758` | idem |
| Instalări / dependențe noi | niciuna. `node_modules/` nu există în clonă. Nu am rulat `npm ci`. | `ls node_modules` → inexistent |
| Modificări necomise | niciuna | `git diff --stat HEAD` gol |
| Documentele Fazei 4 | **în afara repository-ului** (numai în pachet) | — |
| Teste | **nerulate în această sesiune** (verificare numai prin citire). Ultima rulare consemnată: 102/103 la `ff53758` (P7 = singurul FAIL cunoscut). | `tests/run_all.py`: `KNOWN_FAILS` conține numai `R6D-SES-01` |

**Diferențe față de starea comunicată anterior:** **niciuna.** Transferul (§3) și `FAZA_4_00` indică aceleași valori: HEAD `cb9f47e` = GitHub, working tree curat, `main` = `d9bc2c9`, fără `server/` / `shared/`.

---

## C. DECIZIILE APROBATE CARE CONSTRÂNG FAZA 4

Formulările sunt **rezumate fidel** după RULES la `cb9f47e`; textul integral este în RULES. **Nu le interpretez.**
Coloana „B” indică componentele afectate: B1 date · B2 API · B3 autentificare · B4 autorizare · B5 sesizări · B6 e-mail · B7 anti-spam · B8 date personale · B10 teste.

### C.1 Cadrul de lucru (Planul v1.1 și RULES §1–§5, §8–§10)

| ID | Regula | Sursa | B |
|---|---|---|---|
| PL-1 | Numerotarea B1–B8, B10 este singura folosită; **B9 nu se folosește**; staging-ul și găzduirea nu au cod B | Plan v1.1, Faza 4 | toate |
| PL-2 | Checkpoint-ul Fazei 4: „design complet, revizuit și aprobat” | Plan v1.1; S-2 §17 | toate |
| PL-3 | P7 (`R6D-SES-01`) se închide la 5.2; FAIL → PASS și orice modificare a `KNOWN_FAILS` **numai cu aprobarea explicită a proprietarului** | Plan v1.1 5.2; RULES §10 | B3, B10 |
| PL-4 | O subetapă = un singur agent executant | Plan v1.1; RULES §8 | proces |
| PL-5 | Etapele 1–6 nu se modifică retroactiv; 5G ignorată | Plan v1.1; RULES §9 | — |
| R-1.1 | Codul și Git sunt sursa de adevăr; contradicțiile se raportează | RULES §1 | — |
| R-2 | Git: `main` neatins; commit / push numai la cerere; fără rescrierea istoricului; staging explicit | RULES §2 | proces |
| R-4 | Nu se iau decizii de produs în locul proprietarului | RULES §4 | toate |
| R-5 | Onestitate tehnică: protecția din frontend nu este securitate; e-mailul simulat nu este „trimis” | RULES §5 | B3, B4, B6 |
| R-10a | Parolele hardcodate actuale **nu vor autentifica** versiunea cu backend; rotația la 5.2 | RULES §10 | B3, B10 |
| R-10b | Istoricul Git nu se rescrie pentru parole fără o decizie separată | RULES §10 | — |
| R-10c | APK-ul de test nu se distribuie | RULES §10 | — |

### C.2 Deciziile de produs din RULES §6 (Etapele 3–6)

| ID | Regula | Sursa | B |
|---|---|---|---|
| 5D | `super_admin` are toate cele 24 de permisiuni; `primarie_operator` are 13 (sesizări și comunicate complet; Ghid, Apel rapid, Sondaje doar vizualizare) | RULES §6 | B4, B10 |
| 5D-bis | Fără permisiuni noi; `ROLE_PERMISSIONS` neschimbat. **Excepția D8-4** (vezi C.5) | RULES §6 | B4 |
| 6.1 | **Sesizările nu se șterg**, de niciun rol; nu există `deleteReport` | RULES §6 | B1, B2, B4, B5 |
| 3B | Contorul `TM-XXX` este secvențial și nu se refolosește niciodată | RULES §6 | B1, B5, B10 |
| 6.2 | Confirmarea unei sesizări apare numai după salvarea efectivă | RULES §6 | B2, B5 |
| 6.6-a | Sesizările aprobate cu coordonate valide pot apărea pe hartă; identitatea și contactul autorului nu sunt publice; fără opțiune de excludere; `private` = valoare istorică fără efect; implicit `public_anonymous` | RULES §6 | B1, B5, B8 |
| 5C | Moderarea publicării și soluționarea internă sunt **axe independente** | RULES §6 | B1, B2, B5 |
| 5B/5D | Comunicatele nu au ștergere fizică (numai publicare / dezactivare) | RULES §6 | B1, B2 |
| 5D-s | Ștergerea și resetarea sondajelor: `surveys.create` SAU `surveys.edit` (modificată ulterior de D3/D4: fără ștergere cu voturi, fără reset în producție) | RULES §6; §11.6 | B2, B4 |
| 6.5-r | Operațiile de reset (`resetToDemo`) cer toate permisiunile de gestionare ale domeniului (modificată de D4: niciun reset în producție) | RULES §6; §11.6 | B2, B4 |
| 6.5-p | `submitReport` și `submitVote` rămân operații **publice** | RULES §6 | B2, B4, B7 |
| 6.4 | Fără login DEMO 1-click și fără credențiale afișate public | RULES §6 | B3 |
| 6.5-P3 | Zona publică nu afișează lista sesizărilor; lista completă numai în Admin | RULES §6 | B2, B8 |
| 5E | E-mailul rămâne simulat până la 5.5; transportul real se introduce acolo, printr-un adaptor nou; `SimulatedEmailTransportAdapter` nu raportează niciodată `sent` | RULES §6 | B6, B10 |
| 6.6-b | Harta publică arată numai informații descriptive (număr, categorie, descriere, fotografie, poziție, dată); **nu** arată stadiul, asumarea, preluarea, responsabilii. Clarificarea D9-8: „rămân exclusiv în Admin” = „nu sunt afișate public” | RULES §6 | B2, B5, B8 |
| 6.6-c | N1 închis: „Public” și „Public anonim” sunt ambele publice, fără identitatea autorului | RULES §6 | B5 |
| 6.6-d (M7) | Asumarea individuală numai pentru `super_admin`, care își poate retrage numai propria asumare; `primarie_operator` nu are asumare individuală | RULES §6 | B2, B4, B5 |
| 6.6-e | Preluarea instituțională de către `primarie_operator`: idempotentă, **nu poate fi retrasă** | RULES §6 | B1, B2, B5 |
| 6.6-f | Responsabilii individuali și preluarea pot coexista; preluarea are prioritate în Admin; **se păstrează doar starea curentă, fără istoric de asumări** | RULES §6 | B1, B4 (→ K-2) |
| 6.6-g | O asumare sau preluare pe o sesizare `new` o trece în `in_progress`; retragerea nu schimbă stadiul; `resolved` / `closed` nu se ating; fără status „asumat” | RULES §6 | B5 |
| 6.6-h | Asumarea / preluarea folosește `reports.resolve`; rolul Primăriei este definit central în `permissionService`; ID unic și stabil per cont Admin | RULES §6 | B1, B4 |
| 6.6-i | Harta nu arată responsabilul, preluarea sau stadiul; datele cetățeanului sunt vizibile numai în Admin, pentru ambele roluri | RULES §6 | B4, B8 |
| D9=A | Notificările către cetățean sunt aprobate; implementarea în etapa din backlog (detaliată în §11.9) | RULES §6 | B6 |
| D10 V2 | Vezi C.8 | RULES §6, §11.8 | — |
| D11=B | Zona publică nu are linkuri către Admin; `#admin` rămâne cu acces direct | RULES §6 | B2 (frontend) |
| D12=A | Testele rămân permanent în `tests/` | RULES §6 | B10 |
| H (HANDOFF) | Nu se modifică fără decizie: matricea de permisiuni, `submitReport` / `submitVote` publice, mecanismul 6.1, protecțiile 6.2–6.5, cheile `localStorage` și tipurile (numai în Faza 5, conform designului aprobat în Faza 4) | HANDOFF H | B1, B2, B4 |

### C.3 N-2: stack (RULES §11.1)

| ID | Regula (rezumat) | B |
|---|---|---|
| G1 | Node.js + TypeScript + Fastify + Drizzle + Zod; **sesiuni în DB** (cookie `HttpOnly`, `Secure`, `SameSite=Strict`); parole `crypto.scrypt` (fără module native); REST `/api/v1` pe aceeași origine; backend livrat ca artefact construit în CI | B1, B2, B3 |
| G2 | MySQL 8.4 LTS pentru dezvoltare și producție; 8.0.37 numai pe staging-ul temporar; CI pe 8.0 și 8.4 | B1, B10 |
| G3 | Staging S3: temporar pe HostGate Basic Plus, **numai date demo**, mutat ulterior; apoi retras complet | B10, staging |
| G3-c1…c8 | Cele 8 condiții obligatorii: (1) docroot în afara `public_html`, fără „Share document root”; (2) nimic sub `electrovolt.ro`, DNS neschimbat; (3) DB și utilizator DB dedicate; (4) protecție prin parolă, `noindex`; (5) numai date demo, niciun e-mail către destinatari reali; (6) backup propriu; (7) teste de izolare înainte și după fiecare intervenție; (8) crearea efectivă numai la 5.1, cu aprobare separată | B6, B10, staging |
| G3-abs | **`electrovolt.ro` nu se modifică și nu se afectează** în niciun fel | toate |
| G5 (B-1…B-8) | Țintă de cod Node 20; CI Node 20 + 24 și MySQL 8.0 + 8.4; fără dependențe native; `engines` declarat; **regula de ieșire B-5** (nevoia de mai mult decât Node 20 / MySQL 8.0 → se retrage staging-ul, fără versiuni vechi); schema numai cu elemente comune 8.0 / 8.4; configurare numai prin variabile de mediu, fără domeniu în cod, cookie fără `Domain`; **fără stare în memorie** | B1, B3, B7, B10 |
| G10 | Același repository, `server/` + `shared/`; Fastify 5 | structură (DN-06) |
| Deschise | G4 (numele staging-ului), **G6 (producția; Basic Plus exclus)**, G7 (domeniul Civic). Producția este separată de contul Electrovolt. | — |
| Limită | Aprobarea N-2 nu autorizează acțiuni pe hosting, DNS, DB, VPS sau cod | — |

### C.4 N-3: e-mail (RULES §11.2)

| ID | Regula (rezumat) | B |
|---|---|---|
| N3-1 | `email_outbox` creat **în aceeași tranzacție** cu sesizarea; procesare asincronă cu retry; stări `queued` / `sending` / `sent` / `failed` / `blocked` / `simulated`; `sent` numai la acceptarea de către transportul real; idempotență per tip, sesizare și destinatar; eșecul e-mailului nu afectează sesizarea | B1, B5, B6, B10 |
| N3-2 | SMTP generic, fără cod nativ, configurat prin mediu; `SimulatedEmailTransportAdapter` se păstrează; furnizorul se alege la 5.5 | B6 |
| N3-3 | Moduri `simulated` (implicit: dezvoltare, CI) / `allowlist` (staging) / `live` (numai producție, după 5.5, A-17 și aprobare); o configurare incompletă nu trimite nimic | B6, B10 |
| N3-4 | Expeditorul numai pe domeniul Civic (SPF / DKIM / DMARC); se elimină `platforma-turnumagurele.ro`; niciodată `electrovolt.ro` | B6 |
| N3-5 | **Destinatarul** notificărilor către Primărie este configurabil de `super_admin` (nu de `primarie_operator`), nu este public, este separat de adresa din Ghid; **orice schimbare → audit log** | B1, B2, B4, B6 |
| N3-6 | Confirmarea către cetățean **fără descrierea liberă**; șabloane fixe; fără conținut al utilizatorului în antete | B6 |
| N3-7 | Fotografiile se pot trimite Primăriei ca atașamente | B5, B6 |
| N3-8 | **Corpul mesajelor se șterge după 45 de zile**; metadatele se păstrează conform unei politici de retenție stabilite ulterior | B1, B6, B8 |
| N3-lim | Pe staging nu se trimite nimic către destinatari reali, cu excepția `allowlist` | B6, B10 |

### C.5 D8: conturi (RULES §11.5)

| ID | Regula (rezumat) | B |
|---|---|---|
| D8-1 | Conturile se administrează din Admin, **exclusiv de `super_admin`** | B2, B4 |
| D8-2 | Creare, dezactivare / reactivare, resetarea parolei, schimbarea rolului; **fără ștergere** (ID-uri stabile, nerefolosite) | B1, B2 |
| D8-3 | Două roluri fixe; `ROLE_PERMISSIONS`; fără permisiuni individuale | B4 |
| D8-4 | **Excepție limitată:** permisiuni noi numai pentru (1) administrarea conturilor, (2) configurarea destinatarului tehnic al notificărilor e-mail (N3-5), (3) consultarea auditului; exclusiv `super_admin`; drepturile `primarie_operator` neschimbate; **numele se stabilesc în Faza 4** | B4 (→ DN-01, K-6) |
| D8-5 | Primul `super_admin` prin bootstrap, fără parolă în cod | B3 |
| D8-6 | Numai adrese de e-mail controlate de proiect sau furnizate de Primărie | B1, B3 |
| D8-7 | Până la 5.5, resetarea parolei de către `super_admin`; ulterior poate exista resetare prin e-mail | B3 |
| D8-8 | **TOTP obligatoriu pentru `super_admin` înainte de date reale** | B3 (→ DN-17, DN-18) |
| D8-prot | Nu se dezactivează sau retrogradează ultimul `super_admin` activ; nimeni nu își schimbă propriul rol; blocare temporară; sesiunile se invalidează la dezactivare, la schimbarea rolului și la resetarea parolei; toate operațiile pe conturi → audit | B1, B3, B4, B10 |

### C.6 D6: pin pe hartă (RULES §11.3)

| ID | Regula (rezumat) | B |
|---|---|---|
| D6-1 | Pin pe hartă în formularul de sesizare | B5 (frontend) |
| D6-2 | Pinul este opțional; adresa sau reperul sunt **obligatorii**; butonul GPS centrează harta și plasează pinul (ajustabil); pe hartă apar numai sesizările cu pin și aprobate | B1, B5 |
| D6-3 | Coordonatele = locul problemei; **exacte în DB și Admin; rotunjite la 4 zecimale pe harta publică** | B1, B2, B5, B8 |
| D6-4 | Coordonatele din afara municipiului sunt respinse; **limita UAT se stabilește în Faza 4 dintr-o sursă verificată** | B5, B7 (→ DN-08) |
| D6-5 | Operatorul poate corecta poziția, **cu audit**; permisiunea exactă în Faza 4, **fără permisiuni noi** | B2, B4 (→ DN-03) |
| D6-6 | La mutarea pinului nu se păstrează GPS-ul brut; numai locația finală | B1 |
| D6-7 | Fără reverse geocoding | B5 |

### C.7 D3 / D4: sondaje (RULES §11.6)

| ID | Regula (rezumat) | B |
|---|---|---|
| D3 | Administratorul stabilește, **per sondaj**, momentul în care rezultatele devin vizibile; implicit **„doar după închiderea consultării”**; consultările încheiate rămân într-o **arhivă publică, cu rezultatele finale**; **răspunsurile libere nu devin publice**; comportamentul actual nu se păstrează | B1, B2 (→ O-2) |
| D4 | **„Reset Demo” nu există în producție** (nici buton, nici endpoint); demo numai în dezvoltare / staging | B2, B4, B10 |
| D34-int | După **primul vot**, întrebările și variantele nu se mai modifică; un sondaj **cu voturi nu se șterge**, ci poate fi „doar închis sau arhivat, conform regulilor finale ale proiectului” | B1, B2, B10 (→ O-3) |

### C.8 N-4: anti-vot (RULES §11.7)

| ID | Regula (rezumat) | B |
|---|---|---|
| N4-1 | Consultări **orientative**; nu se garantează „o persoană = un vot”; se declară public | B7, UI |
| N4-2 | Vot public, fără cont de cetățean; fără e-mail sau SMS în MVP | B3, B7 |
| N4-3 | **Jeton anonim** emis de server (cookie `HttpOnly`, `Secure`, `SameSite=Strict`); **unicitate per sondaj garantată în DB** | B1, B7 |
| N4-4 | IP-ul numai pentru limite permisive, hash-uit cu cheie rotită, păstrat temporar; fără unicitate pe IP, fără blocări permanente | B1, B7, B8 |
| N4-5 | Capcană + timp minim permanent; **proof-of-work găzduit de proiect, activabil**; fără CAPTCHA extern | B7 |
| N4-6 | Fără fingerprinting | B7 |
| N4-7 | Amprentă **HMAC per sondaj**; fără IP lângă vot; votul nu se leagă de identitate | B1, B7, B8 |
| N4-8 | Tentativele respinse se păstrează **agregat**, cu motiv și IP hash-uit, **30 de zile** | B1, B7 |
| N4-9 | Textul integral al răspunsurilor libere: **numai `super_admin`, numai după închidere** | B2, B4, B8 (→ DN-03) |
| N4-10 | Voturile nu se șterg manual; la abuz: marcajul „rezultate posibil afectate” (cu audit), proof-of-work sau închidere anticipată | B1, B2 |
| N4-11 | Votul înregistrat nu poate fi modificat | B1, B2 |
| N4-12 | `localStorage` numai pentru experiența utilizatorului | B2, frontend |
| N4-val | Valorile numerice se stabilesc în Faza 4 / 5.6 | B7 (→ DN-15) |

### C.9 D10 V2: date demo (RULES §11.8)

| ID | Regula (rezumat) | B |
|---|---|---|
| D10-1 | Demo numai în dezvoltare, staging, demonstrații; **producția pornește curată** | B1 |
| D10-2 | Fără conturi demo în producție; contul `demo@` nu se păstrează; în staging, adrese controlate și parole noi | B1, B3 |
| D10-3 | Marcaj `is_demo` pe entitățile de conținut; o verificare la pornirea producției împiedică datele demo | B1, B10 |
| D10-4 | Datele demo ca seed-uri versionate, imposibil de încărcat în producție | B1 |
| D10-5 | **Nu se migrează** date din `localStorage`; cheile vechi se elimină la 5.7 | B1, B8, B10 |
| D10-6 | Datele de referință (Ghid, Apel rapid, registratura) se verifică față de surse oficiale; adresa registraturii rămâne informativă; destinatarul notificărilor se configurează separat (N3-5) | B1, B6 (→ DN-14) |
| D10-7 | Marcajele `[DEMO]` rămân numai în staging | frontend |

### C.10 D9: notificări către cetățean (RULES §11.9)

| ID | Regula (rezumat) | B |
|---|---|---|
| D9-1 | Proiectare în Faza 4; simulat în 5.4; real în 5.5 | B6 |
| D9-2 | Canal: e-mail; **opt-in separat**; **dezabonare per sesizare** | B1, B2, B6 |
| D9-3 | Evenimente: preluarea de către Primărie; `in_progress` / `resolved` / `closed`; răspunsul către cetățean. **Fără** notificări pentru asumarea individuală și pentru moderare. Preluarea depinde de A-17. | B5, B6 (→ DN-09) |
| D9-4 | Grupare posibilă; plafon zilnic per sesizare; valorile în Faza 4 | B6 (→ DN-15) |
| D9-5 | **Notă internă ≠ răspuns către cetățean**, separare explicită | B1, B2, B6 |
| D9-6 | Urmărire numai prin e-mail; **fără urmărire publică după `TM-XXX`** | B2 |
| D9-7 | Șabloane fixe; fără descrierea liberă, fără numele operatorilor, fără note interne | B6 |
| D9-8 | Clarificarea 6.6: fluxul intern nu este public; notificările private către autor sunt permise | B4, B6 |

### C.11 A-17: e-mailul real către Primărie (RULES §11.10)

| ID | Regula (rezumat) | B |
|---|---|---|
| A17-1 | Trimiterea reală numai după **confirmarea scrisă a Primăriei** (acceptarea canalului + adresa de destinație) | B6 |
| A17-2 | Destinatarul este configurat **exclusiv de `super_admin`** (N3-5), cu audit; adresa din Ghid **nu se folosește automat** | B1, B2, B6 |
| A17-3 | Sesizarea intră în coadă **automat după salvare, înainte de moderare** | B5, B6 (→ K-5) |
| A17-4 | Fluxul către Primărie are un **comutator separat**, independent de confirmări și de D9 | B1, B2, B6 (→ DN-10) |
| A17-5 | Datele de contact către Primărie numai cu **acord explicit**, separat de opt-in-ul D9-2 | B1, B5, B8 |
| A17-6 | E-mailul către Primărie poate conține descrierea completă, coordonatele exacte și fotografiile; mențiunea obligatorie „platformă independentă, `TM-XXX` nu este număr oficial” | B6 |
| A17-7 | Starea reală a transmiterii: oprit / în coadă / trimis / eșuat; `status: 'transmis'` se înlocuiește | B1, B2 |
| A17-8 | Trei moduri: Primăria folosește platforma / primește doar e-mailuri / nu este implicată | B1, B5, B6 |
| A17-9 | La eșec: indicator în Admin și reîncercare manuală; sesizarea rămâne salvată | B2, B6 |
| A17-lim | Fluxul real rămâne **dezactivat** până la confirmarea Primăriei și stabilirea producției | B6 |

### C.12 Elemente deschise care NU sunt decizii (nu se presupun)

D2 (Master Plan / ANALIZA), D5 (întrebare de tip Rating), D7 (PWA), G4, G6, G7 și elementele E-1…E-10 din checkpoint-ul Fazei 3 (vezi K).

---

## D. K-1…K-6: PROBLEMELE DE ARHITECTURĂ IDENTIFICATE ÎN PRIMA PROIECTARE

Sursa: `FAZA_4_DECIZII_NOI.md` §A. **Toate sunt NEREZOLVATE.**

| # | 1. Problema | 2. Documentele care au generat-o | 3. Regula anterioară afectată | 4. Propunerea actuală (Claude) | 5. Ce este doar ipoteză / propunere | 6. Ce informație lipsește pentru decizie |
|---|---|---|---|---|---|---|
| **K-1** | Plan v1.1 și instrucțiunea Fazei 4 cer tratarea „dependențelor tehnice T1–T8”, dar **lista T1–T8 nu este definită** în nicio sursă disponibilă | Plan v1.1 (Faza 4); S-2 §2 și §14 | Plan v1.1 (conținutul Fazei 4) | DN-04: dacă nu există lista originală, T1–T8 = cele 8 grupe de dependențe din `FAZA_4_00` §6 | **toată lista** este o propunere nouă; **nu este lista originală** (vezi E) | dacă lista originală există la proprietar sau la ChatGPT (sesiunea care a scris Planul v1.0 / v1.1 sau evaluarea inițială) |
| **K-2** | Regula 6.6 cere „doar starea curentă, **fără istoric de asumări**”, iar auditul aprobat (D8-4 „consultarea auditului”, N3-5, D6-5) ar putea crea istoric dacă ar include asumările | RULES §6 (6.6); §11.2 (N3-5); §11.3 (D6-5); §11.5 (D8-4) | 6.6-f | DN-02 (a): **fără audit** pentru asumare / retragere; preluarea instituțională și stadiile se auditează | că preluarea și stadiile **pot** fi auditate fără a încălca 6.6 este o interpretare (6.6 vorbește numai despre „asumări”) | decizia proprietarului: 6.6 se aplică literal (a) sau se modifică explicit (b); dacă „preluarea” intră sau nu în „asumări” |
| **K-3** | D6-3 ascunde coordonatele exacte (confidențialitate), dar textul locației și descrierea, publice după moderare (6.6), pot conține **adresa exactă** a autorului | RULES §11.3 (D6-3); §6 (6.6-b) | D6-3; 6.6-a / 6.6-b | DN-21 (a): se păstrează publicarea + o indicație în formular + o regulă pentru moderator | eficiența indicației și a moderării manuale | decizia de produs (a / b); eventual verificarea juridică (E-6) |
| **K-4** | Cele mai noi versiuni **Vitest 5** (cere Node ^22.12 \|\| ^24) și **`file-type` 22** (cere Node ≥ 22) sunt incompatibile cu ținta Node 20 (G5). **Nu este o încălcare:** există alternative compatibile; B-5 nu se declanșează. | registrul npm, 27.09.2026; RULES §11.1 (G5) | G5 (B-1, B-2, B-5) | DN-23 (a): `node:test` pentru backend; validare proprie a semnăturilor de imagine (fără `file-type`) | versiunile și cerințele `engines` sunt citite la 27.09 și **nereverificate** în această sesiune | reverificarea `engines` la 5.1; alegerea instrumentului (DN-23) |
| **K-5** | A17-3 (e-mailul către Primărie **înainte de moderare**) expune Primăria spamului care trece de B7 | RULES §11.10 (A17-3); B7 | A17-3 | DN-22: proof-of-work activabil și pentru sesizări; oprirea temporară a fluxului (A17-4); plafon zilnic către Primărie | eficiența măsurilor; valoarea plafonului | decizia proprietarului; volumul real estimat; acordul cu Primăria (A17-1 / A17-8) |
| **K-6** | Anonimizarea datelor de contact (cerută de GDPR / B8) nu are o permisiune în lista închisă D8-4 | RULES §11.5 (D8-4); B8 | D8-4 | DN-12 (a) + (b): o a 4-a permisiune `reports.contact.anonymize` (numai `super_admin`) **și** anonimizare automată la expirarea retenției | necesitatea operației manuale; termenul de retenție (DN-11) | decizia proprietarului (extinderea D8-4); verificarea juridică (E-6). **Notă:** B2 §6.1 indică pentru același endpoint `accounts.manage?`, diferit de DN-12 (a); vezi L, O-1. |

---

## E. T1–T8

**Verificare făcută în această sesiune:**
- căutare după `\bT[1-8]\b` în toate fișierele urmărite din repository, la HEAD (fără lockfile-uri): **0 rezultate**;
- aceeași căutare în mesajele tuturor commit-urilor: **0 rezultate**;
- aceeași căutare în toate documentele pachetului, cu excepția `faza4/`.

**Rezultate în pachet:**

| Loc | Ce conține | Este definiția T1–T8? |
|---|---|---|
| Plan v1.1, Faza 4 | „Staging-ul, secretele, branch-urile și dependențele tehnice T1–T8 sunt tratate în proiectare.” | **nu**: numai mențiune, fără listă |
| `FAZA_4_INSTRUCTIUNI_INCEPERE.md` §2, §14 | mențiune + cerințele pentru dependențe (rol, versiune, motiv, compatibilitate, risc, alternativă) | **nu**: fără listă |
| `FAZA_3_N3_EMAIL_ANALIZA.md` | T1 / T2 / T3 = variante de transport e-mail | **nu** (alt spațiu de nume) |
| `FAZA_3_D9_NOTIFICARI_ANALIZA.md` | T1 / T2 / T3 = tensiuni de formulare | **nu** (alt spațiu de nume) |
| `FAZA_0_CHECKPOINT_ETAPA_6_RAPORT.md` §12, R-3 | „…testele scriu în `localStorage` **(T1)**”: trimitere la un „T1” **nedefinit** în acel raport | **nu se poate stabili**. Poate fi o urmă a unei liste dintr-o sursă externă (de exemplu evaluarea inițială), care nu este disponibilă. |
| `00_TRANSFER…`, `FAZA_4_00`, `FAZA_4_DECIZII_NOI` | lista propusă de mine (DN-04) | **nu**: este propunerea |

### Rezultat: **Varianta 2**

> **„T1–T8 nu au fost identificate în sursele disponibile; lista din prima analiză este o propunere nouă și nu trebuie tratată ca decizie existentă.”**

Singurul indiciu că ar putea exista o listă originală este trimiterea „(T1)” din raportul Fazei 0 (R-3). **Nu încerc să reconstitui lista.**

---

## F. DN-01…DN-24

Sursa: `FAZA_4_DECIZII_NOI.md` §B. **Nicio DN nu este aprobată.** Toate sunt **PROPUNERI** și toate necesită decizie.

| ID | Problema | Propunerea Claude | Sursa / regula afectată | Impact B1–B10 | Necesită decizie? |
|---|---|---|---|---|---|
| DN-01 | D8-4 aprobă 3 permisiuni noi, fără nume | `accounts.manage`; `notifications.recipient.manage` (destinatarul **și** comutatorul A17-4); `audit.view`; toate numai `super_admin` | D8-4; N3-5; A17-4 | B2, B4, B10; `shared/permissions` | **DA** (vezi și O-12: extinderea asupra comutatorului) |
| DN-02 | Auditul asumărilor față de 6.6 (K-2) | (a) fără audit pentru asumare / retragere; preluarea și stadiile auditate | 6.6-f; D8-4; N3-5; D6-5 | B1 (`audit_log`), B4 §5 | **DA** |
| DN-03 | Maparea operațiilor noi pe permisiuni existente | corectarea poziției → `reports.moderate`; texte libere → `surveys.edit` + sondaj închis; integritate / proof-of-work → `surveys.edit`; statisticile respingerilor → `surveys.view`; jurnalul e-mail per sesizare → `reports.view`; jurnalul global → `audit.view`; reîncercarea e-mailului → `reports.resolve` | D6-5; N4-9; N4-10; N4-8; A17-9; 5D | B2, B4, B10 | **DA** |
| DN-04 | Definiția T1–T8 (K-1) | dacă nu există lista originală: T1 runtime · T2 HTTP · T3 DB / ORM · T4 validare · T5 crypto / auth · T6 e-mail · T7 fișiere / anti-abuz · T8 build / teste | Plan v1.1 | FAZA_4_00 §6 | **DA** |
| DN-05 | Branch-urile pentru Faza 5 | (a) se continuă pe `recovery-etapa-5-0e2cc20`, cu commit-uri per subetapă, + CI la fiecare push; `main` neatins | RULES §2; Plan v1.1 | proces, B10 (CI) | **DA** |
| DN-06 | Structura repository-ului (G10: detaliile în Faza 4) | (a) npm workspaces: rădăcină + `server/` + `shared/`; modifică `package.json` rădăcină la 5.1 | G10 | toate; `package.json` | **DA** |
| DN-07 | Mediul de dezvoltare local | Docker (MySQL 8.4 + captare SMTP); alternativ, instalare nativă | G2; G3 | B10 | **DA** (+ informație: sistemul de operare al proprietarului) |
| DN-08 | Limitele UAT (D6-4) | (a) poligonul OSM (ODbL, cu atribuire), GeoJSON de configurare, point-in-polygon în cod propriu, verificat vizual față de o sursă oficială | D6-4 | B5, B7, B10; `UAT_BOUNDARY_FILE` | **DA** (+ datele; nedescărcate) |
| DN-09 | Tranzițiile de stadiu și notificările | (a) orice tranziție permisă; notificare numai la trecerea **spre** `in_progress` / `resolved` / `closed`; cu audit | 5C; D9-3 | B2, B5, B6 | **DA** |
| DN-10 | Sesizările depuse cât fluxul Primăriei este oprit | fără coadă retroactivă; starea afișată „oprit” | A17-4; A17-7 | B1, B5, B6 | **DA** |
| DN-11 | Politica de retenție | contact: anonimizare la 12 luni după `closed` / `resolved`; `audit_log` 24 de luni; metadatele `email_outbox` 12 luni; texte libere 24 de luni după închiderea sondajului; sesiuni expirate 30 de zile; jurnale 14 zile (`rejected_attempts` 30 de zile și corpurile e-mail 45 de zile sunt **deja decise**) | N3-8; N4-8; B8 | B1, B6, B8; CLI `purge:*` | **DA** (+ verificare juridică) |
| DN-12 | Anonimizarea contactului (K-6) | (a) + (b): permisiunea `reports.contact.anonymize` (numai `super_admin`) + anonimizare automată | D8-4 | B1, B2, B4, B8 | **DA** (modifică D8-4) |
| DN-13 | Valoarea istorică `private` | backend-ul nu mai are `private` (datele nu se migrează, D10-5) | 6.6-a; D10-5 | B1, tipuri, Admin (`privateCount`) | **DA** |
| DN-14 | Datele de referință în producție | (a) seed de referință versionat, cu sursa și data verificării, revizuit de proprietar; (b) Admin pentru modificările ulterioare | D10-6 | B1 (seed-uri) | **DA** |
| DN-15 | Valorile numerice inițiale | sesiuni 60 min / 12 h / 5 min pre-MFA; blocare 5 → 15 min, 20 / 15 min / IP; `scrypt` N=2^15, r=8, p=3; fișiere ≤ 3 MB și ≤ 4096 px; voturi: 3 s, 50 / h / IP / sondaj, cookie 1 an; sesizări: 8 s, 5 / h și 20 / zi / IP, 3 confirmări / zi / adresă; retry 1 min, 5 min, 30 min, 2 h, 12 h; D9: 10 min, 3 mesaje / sesizare / zi; API global 600 / 10 min / IP | N4 (valori); D9-4; E-3 | B2, B3, B6, B7 | **DA** |
| DN-16 | Codul QR pentru înrolarea TOTP | (a) biblioteca `qrcode` în frontend; (b) secretul ca text, ca rezervă | D8-8 | B3; dependențe frontend | **DA** |
| DN-17 | Mediul în care TOTP devine obligatoriu | (a) staging + producție de la 5.2 | D8-8 | B3, B10 | **DA** |
| DN-18 | Recuperarea TOTP | resetare de către **alt** `super_admin` (cu audit); procedură CLI de urgență; minimum 2 `super_admin`; fără coduri de recuperare în MVP | D8-8; D8-prot | B2, B3 | **DA** |
| DN-19 | Resursele externe și CSP | CSP numai pentru tile-urile OSM; imaginile comunicatelor în producție numai de pe domeniul propriu (încărcarea lor nu există azi) | — (securitate) | B2 (antete), conținut | **DA** |
| DN-20 | Rularea migrațiilor | (a) pas explicit la deploy (`migrate`), înainte de repornire; aplicația refuză pornirea dacă schema nu este la versiunea așteptată | G3; G5 | B1, staging | **DA** |
| DN-21 | Textul locației și descrierea publice (K-3) | (a) publicare după moderare + indicație în formular + regulă pentru moderator | D6-3; 6.6 | B5, B8, UI | **DA** |
| DN-22 | Spamul către Primărie (K-5) | proof-of-work activabil și pentru sesizări; oprirea fluxului (A17-4); plafon zilnic | A17-3; A17-4; N4-5 | B6, B7 | **DA** |
| DN-23 | Instrumentul de teste (K-4) | (a) `node:test` pentru backend; Vitest 5 exclus cât timp există Node 20 | G5 | B10 | **DA** |
| DN-24 | Serverul SMTP de test | container de captare SMTP (de exemplu Mailpit) numai în CI și local | N3-3 | B10 | **DA** |

---

## G. MATRICEA DE TRASABILITATE

Format: **decizie existentă → componentă → document Faza 4 → endpoint / tabel / test afectat.** Numele de tabele, endpoint-uri și teste sunt cele **propuse** în prima proiectare.

| Decizie | B | Document Faza 4 | Tabel (B1) | Endpoint (B2) | Test (B10) |
|---|---|---|---|---|---|
| 3B / 6.1 / 6.2 `TM-XXX` | B1, B5 | B1 §3.2; B5 §1 | `report_counter`, `reports.reference_number` UNIQUE | `POST /public/reports` | concurență N depuneri → N numere consecutive; rollback → număr neconsumat |
| 6.1 fără ștergere | B1, B2, B4, B5 | B1 §4; B2 §6.1; B4 §3 | FK `RESTRICT` | **nu există** DELETE | „nu există ștergere” |
| 6.2 confirmare după salvare | B5 | B5 §1 | tranzacția de creare | `POST /public/reports` → 201 numai după COMMIT | depunere validă 201 |
| 5C axe independente | B1, B5 | B1 §3.2; B5 §4 | `moderation_status`, `resolution_status` | `PATCH …/moderation`, `PATCH …/resolution` | axe independente |
| 6.6 asumare / preluare | B1, B4, B5 | B1 §3.2; B4 §3; B5 §4 | `report_assignees`, `reports.city_hall_taken_over*` | `POST/DELETE …/assume`, `POST …/takeover` | asumare interzisă operatorului; preluare interzisă `super_admin`; ireversibilă |
| 6.6-f fără istoric de asumări | B1, B4 | B1 §3.2; B4 §5 | `report_assignees` (starea curentă), `audit_log` | — | **DN-02** |
| 6.6-b / D9-8 flux intern nepublic | B5, B8 | B5 §3; B8 §2 | proiecția `PublicMapReport` | `GET /public/map-reports` | fără ID intern, contact, stadiu, asumare |
| D6-3 coordonate 4 zecimale | B5, B8 | B5 §3; B8 §1 | `reports.lat/lng` DECIMAL(9,6) | `GET /public/map-reports` | coordonate cu 4 zecimale |
| D6-4 UAT | B5, B7 | B5 §1; FAZA_4_00 §5 | — (fișier de configurare) | `POST /public/reports`, `PATCH …/location` → 422 | coordonate în afara UAT → 422 (**DN-08**) |
| D6-5 corectarea poziției | B2, B4 | B2 §6.1; B4 §2.3 | `reports.location_corrected_*`, `audit_log` | `PATCH /admin/reports/:id/location` | autorizare + audit (**DN-03**) |
| D6-6 fără GPS brut | B1 | B1 §3.2 | `location_source`, `gps_accuracy_m` | — | — (niciun test dedicat în B10) |
| 6.5-P3 fără listă publică | B2, B8 | B2 §3 | — | nu există listă publică de sesizări | suprafețe publice |
| D8-1/2/prot conturi | B1, B2, B3, B4 | B1 §3.1; B2 §6.5; B3 §1; B4 §3 | `admin_users` | `/admin/accounts*` | ultimul `super_admin`; propriul rol; revocarea sesiunilor |
| D8-4 permisiuni noi | B4 | B4 §2.2; DN-01 | — | `/admin/accounts*`, `/admin/settings/registry`, `/admin/audit`, `/admin/email-log` | operatorul = exact 13 permisiuni |
| D8-5 bootstrap | B3 | B3 §6; B2 §2 | `admin_users` | CLI `bootstrap-admin` | bootstrap refuzat dacă există `super_admin` |
| D8-8 TOTP | B3 | B3 §5 | `admin_users.totp_*`, `sessions.mfa_state` | `/auth/mfa/*` | cod valid / invalid / reluat; înrolare (**DN-16/17/18**) |
| G1 sesiuni în DB | B3 | B3 §3 | `sessions` | cookie `__Host-civic_sid`; `/auth/*` | expirare, revocare; **P7 pe server** |
| R-10a parolele istorice | B3, B10 | B3 §1; B10 §3 | — | `/auth/login` | parolele istorice nu autentifică |
| PL-3 P7 | B3, B10 | B10 §3, §4, §6 | — | — | `R6D-SES-01`: numai cu aprobarea proprietarului |
| N3-1 outbox în tranzacție | B1, B5, B6 | B1 §3.5; B5 §1; B6 §1 | `email_outbox` | `POST /public/reports`; CLI `outbox:process` | sesizare fără rând în coadă = imposibil |
| N3-3 moduri | B6 | B6 §2 | `email_outbox.mode_at_send` | — | `simulated` fără rețea; `allowlist` → `blocked` |
| N3-5 / A17-2 destinatar | B1, B2, B4, B6 | B1 §3.1; B2 §6.5; B6 §3 | `settings.registry.recipient_email`, `audit_log` | `GET/PUT /admin/settings/registry` | autorizare; audit |
| N3-6 / D9-7 conținut | B6 | B6 §4 | `email_outbox.subject/body_text` | — | confirmare fără descrierea liberă (SMTP de test, **DN-24**) |
| N3-8 corp 45 de zile | B1, B6, B8 | B1 §3.5; B6 §6 | `email_outbox.body_purged_at` | CLI `purge:email-bodies` | ștergerea corpului după 45 de zile |
| A17-3/4 coadă, comutator | B5, B6 | B5 §1, §5; B6 §3 | `settings.registry.flow_enabled` | `PUT /admin/settings/registry` | e-mail către Primărie numai cu fluxul activ (**DN-10, DN-22**) |
| A17-5 acord contact | B1, B5, B8 | B1 §3.2; B5 §5 | `reports.contact_share_consent*` | `POST /public/reports` | contact numai cu A17-5 |
| A17-7 starea transmiterii | B1, B2 | B1 §3.2 (derivată din `email_outbox`) | `email_outbox` (`registry_notification`) | `GET /admin/reports/:id` | — (niciun test dedicat în B10) |
| A17-8 modul Primăriei | B1, B5 | B1 §3.1; B5 §5 | `settings.registry.primaria_mode` | `PUT /admin/settings/registry` | — |
| A17-9 reîncercare | B2, B6 | B2 §6.1; B6 §1 | `email_outbox.status/attempts` | `POST …/emails/:emailId/retry` | retry; lease expirat |
| D9-2 opt-in, dezabonare | B1, B2, B6 | B1 §3.2; B2 §4 | `reports.notify_opt_in*`, `unsubscribe_token_hash` | `GET/POST /public/notifications/unsubscribe` | — (fără test explicit de dezabonare în B10 §3) |
| D9-3 / DN-09 evenimente | B5, B6 | B5 §5; B6 §5 | `email_outbox` (`citizen_status_update`) | `PATCH …/resolution`, `POST …/takeover` | grupare și plafon D9 |
| D9-5 notă ≠ răspuns | B1, B2 | B1 §3.2; B2 §6.1 | `report_responses.kind` | `POST …/responses` (`kind` obligatoriu) | — (niciun test explicit în B10 §3) |
| D3 vizibilitate + arhivă | B1, B2 | B1 §3.4; B2 §3 | `surveys.results_visibility` | `GET /public/surveys?state=closed`, `…/results` | rezultate conform `results_visibility`; arhivă |
| D3 texte libere nepublice / N4-9 | B2, B4, B8 | B2 §3, §6.4 | `survey_answers.text_value` | `GET /admin/surveys/:id/free-text` | texte libere numai `super_admin`, după închidere |
| D4 fără reset în producție | B2, B4 | B2 §6.4; B4 §3 | — | niciun endpoint de reset | `seed:demo` refuzat în producție |
| D34-int structură blocată / fără ștergere | B1, B2 | B1 §3.4; B2 §6.4 | `surveys.first_submission_at`; FK `RESTRICT` | `PUT /admin/surveys/:id` → 409; `DELETE` → 409 | structură blocată (409); ștergere cu voturi (409) |
| N4-3/7 jeton + HMAC | B1, B7 | B1 §3.4; B7 §2 | `survey_submissions` UNIQUE (`survey_id`, `participation_fingerprint`) | `POST /public/surveys/:id/submissions` | al doilea vot → 409; vot concurent → 1 rând |
| N4-4 IP hash | B1, B7, B8 | B1 §3.6; B7 §1 | `rate_limits`, `rejected_attempts` | toate endpoint-urile publice | fără IP în clar; `X-Forwarded-For` falsificat |
| N4-5 proof-of-work | B7 | B7 §1 | `surveys.pow_enabled`, `used_pow_challenges` | `GET …/pow-challenge`, `PATCH /admin/surveys/:id/pow` | proof-of-work valid / invalid / reluat |
| N4-8 respingeri 30 de zile | B1, B7 | B1 §3.6 | `rejected_attempts` | `GET /admin/surveys/:id/rejections` | `rejected_attempts` agregat |
| N4-10 integritate | B1, B2 | B1 §3.4; B2 §6.4 | `surveys.integrity_flag/note`, `audit_log` | `PATCH /admin/surveys/:id/integrity` | — |
| D10-3/4 demo | B1, B10 | B1 §5.3 | `is_demo` pe tabelele de conținut | CLI `seed:demo`, `check:no-demo` | producția refuză pornirea cu `is_demo` |
| D10-5 fără migrare | B1, B8 | B1 §5 | — | — | curățarea cheilor vechi la 5.7 |
| D10-6 date de referință | B1 | B1 §3.3 | `verified_at`, `verified_source` | `/admin/directory*`, `/admin/quickdial*` | — (**DN-14**) |
| G5 compatibilitate | toate | FAZA_4_00 §6; B10 §2 | numai elemente comune 8.0 / 8.4 | — | matricea CI Node 20 / 24 × MySQL 8.0 / 8.4 |
| G3 staging | B10 | FAZA_4_00 §7; B10 §5 | — | — | T-ISO-1…7 înainte și după fiecare intervenție |

---

## H. INVENTARUL ACTUAL AL SERVICIILOR FRONTEND (cod la `cb9f47e`)

Toate serviciile sunt singleton-uri **sincrone**. Datele stau în `localStorage` / `sessionStorage`. Gărzile folosesc `permissionService.currentUserCan*`, care se bazează pe sesiunea client-side (P7). Numărul total de apeluri de servicii din `views/`, `components/` și `App.tsx`: **140** (numărare automată, identică cu cea din B2 §7).

### H.1 Servicii

| Fișier / serviciu | Metode publice | Citește | Scrie | Permisiuni aplicate (gărzi în serviciu) | Endpoint propus (B2) | Ce lipsește pentru migrare |
|---|---|---|---|---|---|---|
| `authService.ts` / `authService` | `subscribe`, `isAuthenticated`, `getCurrentUser`, `login(email, password)`, `logout`, `getDisplayNameById(id)` | `turnu_civic_admin_session` (session + local) | aceeași cheie | — (sursa rolului pentru toate gărzile). **3 conturi hardcodate** (1 `super_admin`, 2 `primarie_operator`), cu parolele în cod; **nu se reproduc aici**. ID-uri: `usr-admin-01`, `usr-operator-01`, `usr-operator-02`. | `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/mfa/*`, `/auth/change-password`; `getDisplayNameById` → `GET /admin/accounts/directory` | parcursul TOTP și al schimbării parolei în UI (nou); DN-16/17/18; tratarea `mustChangePassword` în UI |
| `permissionService.ts` / `permissionService` | `getPermissionsForRole`, `hasPermission`, `hasAnyPermission`, `currentUserCan`, `currentUserCanAny`, `currentUserCanAll`, `actsForCityHall`, `currentUserActsForCityHall` | `ROLE_PERMISSIONS` (24 / 13), `CITY_HALL_ROLES` | — | matricea însăși | matricea → `shared/`; `GET /auth/me` → `permissions[]` (numai pentru afișare) | numele celor 3 permisiuni noi (DN-01); unde stă `actsForCityHall` în `shared/` |
| `reportService.ts` / `reportService` | `subscribe`, `getCategories`, `getCategoryById`, `submitReport`, `getAllReports`, `getReportById`, `getReportByReferenceNumber`, `getLastSubmittedReport`, `resetLastSubmittedReport`, `getCurrentCounter`, `updateModerationStatus`, `getResolutionStatus`, `updateResolutionStatus`, `addResponse`, `getAssumptionState`, `isAssumedByCurrentUser`, `assumeReport`, `withdrawAssumption`, `takeOverByCityHall`, `getModerationStats`, `isPubliclyVisible`, `toPublicMapReport`, `getPublicMapReports` | `turnu_civic_reports_store`, `turnu_civic_reports_counter`; categoriile din `data/mockReportCategories.ts`; `directoryService.getCityHallInfo().registryEmail` | aceleași chei; declanșează `emailService.notifyNewReport` după salvare | `submitReport`: public; `updateModerationStatus`: `reports.moderate`; `updateResolutionStatus`: `reports.resolve`; `addResponse`: `reports.reply`; `assumeReport`: `reports.resolve` + NOT `actsForCityHall`; `withdrawAssumption`: `reports.resolve` + propria asumare; `takeOverByCityHall`: `reports.resolve` + `actsForCityHall`; **citirile nu au gardă** (`getAllReports` etc.) | `POST /public/reports`; `GET /public/report-categories`; `GET /public/map-reports`; `GET /admin/reports`, `…/:id`, `…/by-reference/:tm`; `PATCH …/moderation`, `…/resolution`; `POST …/responses`; `POST/DELETE …/assume`; `POST …/takeover`; `GET /admin/reports/stats` | **B2 nu definește un câmp pentru `isPubliclyVisible`**, folosit azi în Admin (O-10); `getModerationStats.privateCount` depinde de DN-13; `getLastSubmittedReport` = stare client (fără endpoint); `getCurrentCounter` nu are apelanți; `addResponse` nu are azi `kind` (D9-5, nou) |
| `emailService.ts` / `emailService` | `notifyNewReport(report, registryEmail)`, `getLogs`, `getLogsForReport(ref)` | `turnu_civic_email_log_store` (maximum 500 de intrări) | aceeași cheie (conține **adrese de e-mail ale cetățenilor**, S10) | — (apelat numai de `reportService`) | coada pe server (`email_outbox`); `GET /admin/reports/:id` (jurnal), `GET /admin/email-log` | **UI-ul actual nu afișează jurnalul e-mail** (`getLogs` nu are apelanți în componente); expeditorul actual este pe domeniul fictiv `platforma-turnumagurele.ro` (N3-4) |
| `announcementService.ts` / `announcementService` | `getAll(filter, sort, includeAll)`, `getById`, `getPublicById`, `getLatest`, `getLatestEvent`, `getUrgentAlert`, `getCounts`, `create`, `update`, `setStatus`, `resetToDemo` | `turnu_civic_announcements` + demo (`mockAnnouncements.ts`, reinjectate la inițializare dacă lipsesc) | aceeași cheie | `create`: `announcements.create` + permisiunea stării țintă; `update`: `announcements.edit` (+ starea țintă); `setStatus`: `announcements.publish` / `announcements.disable`; `resetToDemo`: `create` + `edit`; **`getAll(…, includeAll=true)` nu are gardă** | `GET /public/announcements`, `…/highlights`, `…/:id`; `/admin/announcements*` | **fără reset în B2** (conform D4; `resetToDemo` nu are apelanți în UI); ID generat `ann-<timestamp>` → ULID (nou) |
| `directoryService.ts` / `directoryService` | `subscribe`, `getCityHallInfo`, `getRawCityHallInfo`, `updateInstitutionInfo`, `getDepartments`, `getDepartmentById`, `addDepartment`, `updateDepartment`, `toggleDepartmentStatus`, `deleteDepartment`, `reorderDepartments`, `getServices`, `getServicesByDepartment`, `addService`, `updateService`, `toggleServiceStatus`, `deleteService`, `reorderServices`, `updateSchedule`, `updateAudienceSchedule`, `getUsefulLinks`, `addUsefulLink`, `updateUsefulLink`, `toggleUsefulLinkStatus`, `deleteUsefulLink`, `reorderUsefulLinks`, `resetToDemo` | `turnu_civic_city_hall_directory` + `mockDirectory.ts` | aceeași cheie | `updateInstitutionInfo`: `directory.institution.edit` + permisiunea fiecărei colecții din patch; departamente / servicii / linkuri / program: `directory.*.manage`; `resetToDemo`: `directory.institution.edit` | `GET /public/directory`; `/admin/directory*` | `registryEmail` este azi editabil în Ghid **și** folosit ca destinatar (A17-2 cere separarea; O-6); **`resetToDemo` are apelant în UI** (`AdminInstitutionForm`) și nu are echivalent în B2 (conform D4) |
| `quickDialService.ts` / `quickDialService` | `subscribe`, `getCategories`, `addCategory`, `updateCategory`, `deleteCategory`, `reorderCategories`, `getAllContacts`, `getEmergencyContacts`, `getContactById`, `addContact`, `updateContact`, `toggleContactStatus`, `deleteContact`, `reorderContacts`, `getCountsByCategory`, `resetToDemo` | `turnu_civic_quickdial_contacts`, `turnu_civic_quickdial_categories` + `mockQuickDial.ts` | aceleași chei | `quickDial.categories.manage` / `quickDial.contacts.manage`; `resetToDemo`: ambele | `GET /public/quickdial`; `/admin/quickdial*` | `getCountsByCategory` (Admin și public) nu are câmp explicit în B2 (derivabil); `deleteCategory` întoarce azi `{success, error}` → 409 (B2) |
| `surveyService.ts` / `surveyService` | `getInstance`, `getAllSurveys`, `getSurveyById`, `getSurveysByStatus`, `getActiveSurveys`, `getTemporalState`, `isSurveyOpen`, `validateSurveyStructure`, `upsertSurvey`, `updateSurveyStatus`, `generateSurveyId`, `deleteSurvey`, `resetToDemo`, `getEligiblePublicSurveys`, `hasUserParticipatedLocally`, `validateSubmissionAnswers`, `submitVote`, `getAllSubmissions`, `getSubmissionsForSurvey`, `calculateSurveyStatistics` | `turnu_civic_surveys_store`, `turnu_civic_survey_submissions_store`, `turnu_civic_user_participated_surveys` + `mockSurveys.ts` | aceleași chei | `upsertSurvey`: `surveys.create` / `surveys.edit` + permisiunea stării țintă; `updateSurveyStatus`: `activate` / `close` / `edit`; `deleteSurvey` și `resetToDemo`: `create` SAU `edit`; `submitVote`: public, cu marker local | `GET /public/surveys`, `…/:id`, `…/:id/results`, `…/pow-challenge`; `POST …/submissions`; `/admin/surveys*` | azi **se pot șterge sondaje cu voturi** și **edita întrebările după vot** (vor fi 409); rezultatele sunt publice în timpul consultării (`SurveyResultsModal`, se schimbă prin D3); nu există stare „arhivat” (O-3); validările (`validateSurveyStructure`, `validateSubmissionAnswers`) → Zod în `shared/` |
| `imageCompressionService.ts` / `imageCompressionService` | `validateFile`, `calculateDimensions`, `compressPhoto`, `compressPhotos` | fișierele selectate (JPEG / PNG / WebP, ≤ 15 MB original) | — (dataURL în memorie) | — | rămâne în frontend; ieșirea (WebP sau JPEG, ≤ 1920 px, calitate 0,82) → multipart `POST /public/reports` | ieșirea este azi `dataURL` base64; pentru multipart trebuie `Blob` / `File` (5.4); limita de server propusă ≤ 3 MB (DN-15) nu este verificată față de ieșirea reală a compresiei |

### H.2 Componentele care folosesc serviciile (metodă × număr de apeluri)

| Componentă | Apeluri |
|---|---|
| `views/HomeView.tsx` | `announcementService.getLatest`×1, `getUrgentAlert`×1 |
| `views/AnnouncementsView.tsx` | `announcementService.getAll`×1, `getCounts`×1, `getPublicById`×2 |
| `views/IssuesView.tsx` | `reportService.getLastSubmittedReport`×1, `resetLastSubmittedReport`×1 |
| `views/MapView.tsx` | `reportService.getCategories`×1, `getPublicMapReports`×2, `subscribe`×1 |
| `views/DirectoryView.tsx` | `directoryService.getCityHallInfo`×1, `getDepartments`×1, `getServices`×1, `getUsefulLinks`×1, `subscribe`×1 |
| `views/AdminView.tsx` | `authService.getCurrentUser`×3, `isAuthenticated`×1, `logout`×1, `subscribe`×1 |
| `components/report/ReportForm.tsx` | `imageCompressionService.compressPhotos`×1, `reportService.getCategories`×1, `submitReport`×1 |
| `components/quickdial/QuickDialView.tsx` | `quickDialService.getAllContacts`×1, `getCategories`×1, `getCountsByCategory`×1, `getEmergencyContacts`×1, `subscribe`×1 |
| `components/surveys/PublicSurveysList.tsx` | `surveyService.getEligiblePublicSurveys`×2, `hasUserParticipatedLocally`×1 |
| `components/surveys/SurveyVotingModal.tsx` | `surveyService.hasUserParticipatedLocally`×1, `submitVote`×1, `validateSubmissionAnswers`×1 |
| `components/surveys/SurveyResultsModal.tsx` | `surveyService.calculateSurveyStatistics`×1 |
| `components/admin/AdminLoginForm.tsx` | `authService.login`×1 |
| `components/admin/AdminDashboard.tsx` | numai `permissionService.hasPermission` (dale de module; **fără contoare de date**) |
| `components/admin/reports/AdminReportsModeration.tsx` | `authService.getCurrentUser`×2, `getDisplayNameById`×1; `reportService.getAllReports`×5, `addResponse`, `assumeReport`, `getAssumptionState`, `getModerationStats`, `getResolutionStatus`, `isPubliclyVisible`, `takeOverByCityHall`, `updateModerationStatus`, `updateResolutionStatus`, `withdrawAssumption` (câte ×1) |
| `components/admin/announcements/AdminAnnouncementsManager.tsx` | `announcementService.getAll`×2, `create`, `setStatus`, `update` |
| `components/admin/directory/AdminInstitutionForm.tsx` | `directoryService.getRawCityHallInfo`×2, `updateInstitutionInfo`×1, **`resetToDemo`×1** |
| `components/admin/directory/AdminScheduleManager.tsx` | `getRawCityHallInfo`, `updateSchedule`, `updateAudienceSchedule` |
| `components/admin/directory/AdminDepartmentsManager.tsx` | `getDepartments`×2, `add`, `update`, `toggle`, `delete`, `reorderDepartments` |
| `components/admin/directory/AdminServicesManager.tsx` | `getServices`×2, `getDepartments`, `add`, `update`, `toggle`, `delete`, `reorderServices` |
| `components/admin/directory/AdminUsefulLinksManager.tsx` | `getUsefulLinks`×2, `add`, `update`, `toggle`, `delete`, `reorderUsefulLinks` |
| `components/admin/quickdial/AdminCategoriesManager.tsx` | `getCategories`×2, `getCountsByCategory`, `add`, `update`, `delete`, `reorderCategories` |
| `components/admin/quickdial/AdminQuickDialManager.tsx` | `getAllContacts`×4, `getCategories`, `add`, `update`, `toggle`, `delete`, `reorderContacts` |
| `components/admin/surveys/AdminSurveysManager.tsx` | `surveyService.getAllSurveys`×2, `getTemporalState`, `updateSurveyStatus`×2, `deleteSurvey`, **`resetToDemo`** |
| `components/admin/surveys/SurveyFormModal.tsx` | `generateSurveyId`, `upsertSurvey`, `validateSurveyStructure` |

În plus, 67 de apeluri `permissionService.*` sunt distribuite în componentele Admin și în servicii (gărzi UI și de serviciu).

---

## I. INVENTARUL ACTUAL AL TIPURILOR DE DATE (cod la `cb9f47e`)

### I.1 Entități existente

| Tip (fișier) | Câmpuri existente | Identificator | Relații logice | Date personale | Date publice |
|---|---|---|---|---|---|
| `CivicReport` (`types/report.ts`) | `id`, `referenceNumber`, `categoryId`, `categoryName`, `description`, `photos[]`, `location`, `contact?`, `createdAt`, `status: 'transmis'`, `publicationPreference`, `moderationStatus`, `moderatedAt?`, `moderationNote?`, `resolutionStatus?`, `responses?[]`, `assigneeIds?[]`, `cityHallTakenOver?` | `id` = `rep-<timestamp>-<aleator>`; `referenceNumber` = `TM-` + minimum 3 cifre | → `ReportCategory` (prin `categoryId`, cu `categoryName` duplicat); `assigneeIds` → `AdminUser.id`; conține `ReportPhoto[]`, `ReportResponse[]`, `ReportLocation`, `CitizenContact` | `contact` (nume, telefon, e-mail); potențial `description` și `location.addressOrDetails` (K-3); fotografiile | prin `PublicMapReport` |
| `ReportCategory` | `id`, `name`, `description`, `iconName?` | ID-uri text: `iluminat`, `drumuri`, `trotuare`, `apa_canal`, `salubritate`, `spatii_verzi`, `semnalizare`, `altele` (8, în `mockReportCategories.ts`) | — | — | da |
| `ReportPhoto` | `id`, `dataUrl` (base64), `name`, `size`, `type`, `originalSize?`, `width?`, `height?`, `originalWidth?`, `originalHeight?`, `compressionRatio?` | `id` | ∈ `CivicReport.photos` (maximum 4, `ReportForm`) | `name` (numele original; eliminat din proiecția publică la 6.5 P4); conținutul imaginii | numai prima fotografie, prin `PublicMapReport.photo` |
| `ReportLocation` | `addressOrDetails`, `latitude?`, `longitude?`, `accuracy?`, `source: 'manual' \| 'gps' \| 'both'` | — | ∈ `CivicReport` | coordonatele (locul problemei), `accuracy` | text + coordonate **exacte** (azi fără rotunjire) |
| `CitizenContact` | `name?`, `phone?`, `email?` | — | ∈ `CivicReport` | **da** (toate) | niciodată |
| `ReportResponse` | `id`, `message`, `createdAt`, `authorName` | `resp-<timestamp>-<aleator>` | ∈ `CivicReport.responses` | `authorName` (operator) | niciodată (strict intern) |
| `PublicMapReport` | `referenceNumber`, `categoryId`, `categoryName`, `publicDescription`, `publicLocation{addressOrDetails, latitude, longitude}`, `photo?{dataUrl, size, compressionRatio?}`, `createdAt`, `isAnonymous` | `referenceNumber` | proiecție a `CivicReport` | — (proiecție filtrată) | **toate** câmpurile |
| `Announcement` (`types/announcement.ts`) | `id`, `type`, `title`, `summary`, `content`, `publishedAt`, `author`, `category`, `imageUrl?`, `isUrgent?`, `expiresAt?`, `status?`, `isDemo`, `eventDate?`, `eventTime?`, `eventLocation?`, `eventOrganizer?` | `ann-<timestamp>` | — | `author` (text afișat) | cele publicate și neexpirate |
| `CityHallInfo` (`types/directory.ts`) | `institutionName`, `shortName`, `county`, `address`, `postalCode`, `primaryPhone`, `secondaryPhone?`, `fax?`, `primaryEmail`, `registryEmail?`, `websiteUrl`, `schedule[]`, `audienceSchedule[]`, `departments[]`, `services[]`, `usefulLinks[]`, `isDemo` | — (obiect unic) | conține colecțiile | date instituționale (nu personale); `headOfDepartment?` (nume de persoană) | da (elementele active) |
| `CityHallDepartment` | `id`, `name`, `description`, `location?`, `phone?`, `email?`, `schedule?`, `headOfDepartment?`, `isActive?`, `order?` | `id` | ← `CityHallService.departmentId` | `headOfDepartment?` | da |
| `CityHallService` | `id`, `title`, `departmentId`, `departmentName`, `description`, `documentsRequired?[]`, `processingTime?`, `fee?`, `onlineLink?`, `isActive?`, `order?` | `id` | → `CityHallDepartment` (cu `departmentName` duplicat) | — | da |
| `UsefulLink` | `id`, `title`, `description`, `url`, `category` (4 valori), `isExternal`, `isActive?`, `order?` | `id` | — | — | da |
| `CityHallSchedule`, `CityHallAudience` | `day`, `hours`, `note?` / `role`, `schedule`, `registrationNote` | — | ∈ `CityHallInfo` | — | da |
| `QuickDialCategory` (`types/quickDial.ts`) | `id`, `name`, `description`, `order`, `isActive?` | `id` (`urgente`, `utilitati`, `sanatate`, `administratie`, `transport`, …) | ← `QuickDialContact.categoryId` | — | da |
| `QuickDialContact` | `id`, `name`, `phone`, `formattedPhone`, `categoryId`, `categoryName`, `shortDescription?`, `availability`, `isEmergency?`, `address?`, `isDemo`, `isActive?`, `order?` | `id` | → `QuickDialCategory` (cu `categoryName` duplicat) | — (numere instituționale) | da |
| `Survey` (`types/survey.ts`) | `id`, `title`, `description`, `category?`, `questions[]`, `period{startDate, endDate}`, `status`, `isDemo`, `audit{createdAt, updatedAt, createdBy?}` | `srv-…` (`generateSurveyId`) | conține `SurveyQuestion[]` | `audit.createdBy` (implicit `'admin'`) | sondajele eligibile |
| `SurveyQuestion` | `id`, `text`, `type`, `order`, `isRequired`, `options?[]`, `helpText?` | `q-…` | ∈ `Survey`; conține `SurveyAnswerOption[]` | — | da |
| `SurveyAnswerOption` | `id`, `text`, `order` | `opt-…` | ∈ `SurveyQuestion` | — | da |
| `SurveySubmission` (`types/surveySubmission.ts`) | `id`, `surveyId`, `submittedAt`, `answers[]{questionId, type, value}` | `sub-<timestamp>-<aleator>` | → `Survey`, `SurveyQuestion`, opțiuni (prin ID în `value`) | răspunsurile libere (potențial personale) | agregatele (azi oricând) |
| `SurveyStatisticsReport` (`types/surveyStatistics.ts`) | `surveyId`, `surveyTitle`, `totalSubmissions`, `questionsResults[]{…, optionsResults?[], freeTextEntriesCount?}`, `calculatedAt` | — (calculat) | derivat din submisii | — (fără texte libere) | da |
| `EmailLogEntry` / `EmailMessage` (`types/email.ts`) | `id`, `reportId`, `referenceNumber`, `kind`, `to`, `subject`, `createdAt`, `status`, `transportName`, `errorMessage?` / `to`, `from`, `subject`, `body`, `photosInfo?`, `attachments?` | `email-<timestamp>-<aleator>` | → `CivicReport` | `to` (e-mailul cetățeanului) | nu |
| `AdminUser` (`services/authService.ts`) | `id`, `email`, `name`, `role`, `lastLogin` | `usr-admin-01`, `usr-operator-01`, `usr-operator-02` | ← `CivicReport.assigneeIds` | e-mailul și numele operatorului | nu |
| `AppView` (`types/navigation.ts`) | `home`, `announcements`, `issues`, `map`, `surveys`, `directory`, `admin` | — | — | — | — |

### I.2 Enum-uri și statusuri existente

| Enum | Valori | Fișier |
|---|---|---|
| `PublicationPreference` | `private` (istoric) \| `public` \| `public_anonymous` | `types/report.ts` |
| `ModerationStatus` | `pending` \| `approved` \| `rejected` | `types/report.ts` |
| `ResolutionStatus` | `new` \| `in_progress` \| `resolved` \| `closed` (lipsă = `new`) | `types/report.ts` |
| `CivicReport.status` | constant `'transmis'` (A17-7 cere înlocuirea) | `types/report.ts` |
| `ReportLocation.source` | `manual` \| `gps` \| `both` | `types/report.ts` |
| `AnnouncementType` | `notification` \| `announcement` \| `news` \| `event` | `types/announcement.ts` |
| `AnnouncementStatus` | `published` \| `draft` (lipsă = `published`) | `types/announcement.ts` |
| `SurveyQuestionType` | `single_choice` \| `multiple_choice` \| `free_text` | `types/survey.ts` |
| `SurveyStatus` | `draft` \| `active` \| `closed` | `types/survey.ts` |
| stare temporală (calculată) | `upcoming` \| `in_progress` \| `expired` \| `indeterminate` | `surveyService.getTemporalState` |
| `EmailStatus` | `generated` \| `simulated` \| `sent` \| `failed` | `types/email.ts` |
| `EmailKind` | `registry_notification` \| `citizen_confirmation` | `types/email.ts` |
| `UsefulLink.category` | `Plăți & Taxe` \| `Transparență Decizională` \| `Servicii Digitale` \| `Instituții Partenere` | `types/directory.ts` |
| `AdminUser.role` | `super_admin` \| `primarie_operator` | `services/authService.ts` |
| `Permission` | 24 de valori (lista în `permissionService.ts`) | `services/permissionService.ts` |

### I.3 Câmpuri folosite pentru permisiuni și reguli

| Câmp | Folosit de |
|---|---|
| `AdminUser.role` | toate gărzile (`currentUserCan*`), `actsForCityHall` |
| `AdminUser.id` | `assigneeIds`, `isAssumedByCurrentUser`, `withdrawAssumption` (propria asumare) |
| `CivicReport.moderationStatus` + `location.latitude/longitude` | `isPubliclyVisible` (plus încadrarea în dreptunghiul **lat 40–48, lng 20–30**) |
| `CivicReport.cityHallTakenOver`, `assigneeIds`, `resolutionStatus` | regulile 6.6 |
| `Announcement.status`, `expiresAt` | vizibilitatea publică; permisiunea stării țintă |
| `Survey.status`, `period` | `isSurveyOpen`; permisiunea stării țintă |
| `isActive` (Ghid, Apel rapid) | filtrarea publică |

### I.4 Validări existente în cod

| Regulă | Valoare actuală | Loc |
|---|---|---|
| Descrierea sesizării | 15–1000 de caractere | `ReportForm.tsx` (`MIN_DESCRIPTION_LENGTH`, `MAX_DESCRIPTION_LENGTH`) |
| Fotografii | maximum 4; original ≤ 15 MB; intrare JPEG / PNG / WebP; ieșire WebP sau JPEG, ≤ 1920 px, calitate 0,82 | `ReportForm.tsx`, `imageCompressionService.ts` |
| Telefon | minimum 7 cifre | `ReportForm.tsx` |
| Locația | GPS prin `navigator.geolocation`; `source = gps ? 'both' : 'manual'`; **nu există pin pe hartă în formular** | `ReportForm.tsx` |
| Harta publică | aprobată + coordonate în dreptunghiul lat 40–48 / lng 20–30 | `reportService.isPubliclyVisible` |

### I.5 Câmpuri și entități NOI, introduse numai de designul propus (B1), inexistente în cod

- **Entități noi:** `admin_users` (în loc de conturile hardcodate), `sessions`, `audit_log`, `settings`, `report_counter` (ca tabel), `report_contacts` (separat), `report_assignees` (ca tabel), `report_photos` (ca tabel, fișier pe disc), `email_outbox` (în loc de jurnalul local), `rate_limits`, `rejected_attempts`, `used_pow_challenges`, `survey_answers` (normalizat), `directory_institution` / `directory_*` / `quickdial_*` (ca tabele).
- **Număr total de tabele în B1:** 27, după numărarea mea. Transferul spune „≈ 25”.
- **`reports`:** `lat` / `lng` DECIMAL(9,6); `location_source` ∈ {`text`, `pin`, `gps_pin`} (înlocuiește `manual` / `gps` / `both`); `gps_accuracy_m`; `moderated_by`; `city_hall_taken_over_at/by`; `location_corrected_at/by`; `notify_opt_in(_at)`; `unsubscribe_token_hash`; `notify_unsubscribed_at`; `contact_share_consent(_at)`; `idempotency_key`; `is_demo`; `updated_at`.
- **Câmpuri eliminate:** `status: 'transmis'` (A17-7) și valoarea `private` (DN-13).
- **`report_responses.kind`** ∈ {`internal_note`, `citizen_reply`}; `author_user_id` (în loc de `authorName`).
- **`report_photos`:** `storage_key`, `sha256`, `ordinal`; fără `dataUrl` și fără `name`.
- **`surveys`:** `results_visibility` ∈ {`live`, `after_close`, `admin_only`}; `pow_enabled`; `integrity_flag` / `integrity_note`; `first_submission_at`.
- **`survey_submissions.participation_fingerprint`** (HMAC).
- **`email_outbox.kind`** adaugă `citizen_status_update`, `citizen_reply`; `status` adaugă `queued`, `sending`, `blocked`, `cancelled` și renunță la `generated`.
- **Ghid și Apel rapid:** `verified_at`, `verified_source`, `is_demo`, `created/updated_by`.
- **`PublicMapReport` (B2):** `publicLocation.text` (în loc de `addressOrDetails`); coordonate rotunjite; `photoUrl` (în loc de `photo.dataUrl`).

---

## J. DIFERENȚELE DINTRE APLICAȚIA ACTUALĂ ȘI DESIGNUL PROPUS

| Zonă | Actual (frontend, `cb9f47e`) | Design backend propus | Diferență | Observație |
|---|---|---|---|---|
| Persistență | `localStorage` per browser; 11 chei; demo reinjectat la inițializare | MySQL (Drizzle), 27 de tabele, UTC, ULID | centralizare completă | D10-5: nu se migrează nimic; cheile se șterg la 5.7 |
| Autentificare | 3 conturi hardcodate, parole în bundle; sesiune JSON în storage, **falsificabilă (P7)**; fără expirare | `admin_users` + `scrypt`; sesiuni în DB, cookie `__Host-`; expirare 60 min / 12 h (propunere); blocare; TOTP `super_admin`; bootstrap CLI | înlocuire totală | parolele istorice nu autentifică (R-10a); P7 → PASS numai cu aprobare (PL-3) |
| Permisiuni | matricea în `permissionService`, aplicată în UI, handlere și servicii, **toate ocolibile** | aceeași matrice în `shared/`, impusă pe server la fiecare endpoint + 3 permisiuni noi (DN-01) | autorizare reală | operatorul rămâne cu 13 permisiuni (test) |
| Sesizări: depunere | salvare în `localStorage`, tranzacțională local (6.2) | tranzacție DB: contor + raport + contact + fotografii + outbox; `Idempotency-Key` | tranzacție reală, concurență | 6.2 se păstrează (201 numai după COMMIT) |
| `TM-XXX` | contor local, reconciliat cu maximul existent; unic numai per browser | `report_counter` `FOR UPDATE` + `UNIQUE` | unicitate globală | test de concurență obligatoriu |
| Fotografii | base64 în `localStorage`, în obiectul sesizării; `name` original păstrat intern | fișiere pe disc (în afara docroot-ului), metadate în DB; semnătura verificată; EXIF eliminat; fără nume original | model diferit | compresia din browser rămâne; limita de server ≤ 3 MB (propunere) |
| Hartă | toate sesizările aprobate cu coordonate în dreptunghiul RO (40–48 / 20–30); coordonate **exacte** public; fotografia ca `dataUrl` | `GET /public/map-reports`: aprobate + în UAT (DN-08); coordonate **rotunjite la 4 zecimale**; fotografia prin URL | D6-3, D6-4 noi | nu există azi pin în formular (D6-1 = funcționalitate UI nouă) |
| Locație | `source`: `manual` / `gps` / `both`; `accuracy` | `location_source`: `text` / `pin` / `gps_pin`; `gps_accuracy_m` numai pentru GPS neajustat; corectare cu audit | enum nou; D6-5, D6-6 | fără reverse geocoding (D6-7), identic |
| Sondaje | rezultate publice oricând; se șterg și cu voturi; întrebările se editează după vot; anti-vot = marker local | `results_visibility` (implicit `after_close`) + arhivă; 409 la ștergere sau editare după vot; jeton anonim + HMAC + UNIQUE în DB; capcană / timp minim / proof-of-work | D3, D4, N-4 | stare „arhivat” nedefinită (O-3) |
| E-mail | simulat; trimis către `registryEmail` **din Ghid**; expeditor pe domeniu fictiv; jurnal local cu adrese; UI fără jurnal | `email_outbox` în tranzacție; moduri `simulated` / `allowlist` / `live`; destinatarul din `settings` (`super_admin`); expeditor pe domeniul Civic; retry, lease, 45 de zile | N-3, A-17 complet noi | fluxul Primăriei dezactivat implicit (A17-lim) |
| Notificări (D9) | nu există | `citizen_status_update`, `citizen_reply`; opt-in, dezabonare, grupare, plafon | funcționalitate nouă | simulat în 5.4, real în 5.5 |
| Răspunsuri | `responses[]` fără tip, interne | `report_responses.kind` obligatoriu: notă internă / răspuns către cetățean | D9-5 nou | — |
| Anti-spam | numai marker local la vot; nimic la sesizări | rate limit în DB, IP HMAC zilnic, capcană, timp minim semnat, proof-of-work, idempotență, `rejected_attempts` | nou | ce este garantat / ce nu: B7 §3 |
| Date personale | contactul în `localStorage` (sesizări + jurnal e-mail, S10); vizibil în toate listele Admin | `report_contacts` separat; numai în detaliul Admin; redactare în jurnale; retenție și anonimizare (DN-11, DN-12) | minimizare | verificarea juridică este deschisă (E-6) |
| Audit | nu există (numai `audit.createdAt/updatedAt` la sondaje) | `audit_log` (conturi, setări, poziție, moderare, stadii, preluare, sondaje, texte libere, comunicate) | nou | conținutul depinde de DN-02 |
| Administrare: conturi | inexistentă (conturi fixe în cod) | `/admin/accounts*` (`super_admin`), fără ștergere | nou (D8) | — |
| Administrare: reset demo | `resetToDemo` în Ghid și Sondaje (butoane UI), în Comunicate și Apel rapid (fără UI) | nu există în API; `seed:demo` numai în afara producției | eliminat (D4) | — |
| Administrare: tablou de bord | numai dale de module după permisiuni, fără contoare | `GET /admin/dashboard`: „contoare agregate” | nou; conținut nespecificat | vezi K |
| Configurare | nimic (constante în cod) | variabile de mediu validate cu Zod; secretele în afara repository-ului | nou | `.env.example` se rescrie la 5.1 |

---

## K. PUNCTELE CARE NU POT FI STABILITE ÎNCĂ DIN SURSELE DISPONIBILE

| # | Ce lipsește | De ce este necesar | Ce document / cine ar trebui să clarifice | Blocant pentru design (B1–B10)? |
|---|---|---|---|---|
| K-N1 | Lista originală T1–T8 (dacă există) | Plan v1.1 cere tratarea lor | proprietarul / ChatGPT (autorul Planului); eventual evaluarea inițială | **blocant formal** pentru criteriul „T1–T8 tratate” (DN-04) |
| K-N2 | Conținutul Master Planului v1.0 (PDF) | verificarea trimiterilor (4D, 4E, axele moderare / e-mail, „Checkpoint MVP”) | proprietarul (fișierul PDF) | **blocant pentru audit**, nu pentru design |
| K-N3 | Poligonul UAT Turnu Măgurele, dintr-o sursă verificată | D6-4 | DN-08 + sursa (OSM / ANCPI / INIS) + verificarea proprietarului | nu pentru structură (fișier de configurare); **da** pentru 5.4 |
| K-N4 | Infrastructura de producție (G6) și domeniul Civic (G7) | stocarea fotografiilor (disc / S3), backup, criptare, `MAIL_FROM`, `PUBLIC_BASE_URL`, proxy-ul (`TRUST_PROXY`) | decizie separată a proprietarului | nu pentru design; **da** înainte de „date reale” |
| K-N5 | Numele staging-ului (G4) | subdomeniul staging-ului | proprietarul | nu; înainte de 5.1 |
| K-N6 | Comportamentul efectiv al cPanel / Passenger (butoanele aplicației Node, `tmp/restart.txt`, „Run JS script”, SSH, backup automat) | deploy, `migrate`, `bootstrap-admin`, cron pe staging | testul K2 / 5.1, cu aprobare | nu; **da** la 5.1 |
| K-N7 | Furnizorul SMTP (N3-2) și plafonul de atașamente | B6 | decizia de la 5.5 | nu |
| K-N8 | Confirmarea scrisă a Primăriei și modul A17-8 | activarea `registry_notification` | Primăria / proprietarul | nu (arhitectura acoperă cele 3 moduri) |
| K-N9 | Verificarea juridică (informare, cookie-ul de participare, consimțăminte, natura de petiție, retenție) | DN-11, DN-12, textele din formular | un jurist / proprietarul (E-6) | nu pentru structură; **da** pentru valorile de retenție |
| K-N10 | Sistemul de operare local al proprietarului | DN-07 (Docker / instalare nativă) | proprietarul | nu |
| K-N11 | Valorile numerice validate în practică | DN-15 | testele din 5.x | nu (parametri configurabili) |
| K-N12 | Versiunile npm actuale și cerințele `engines` | K-4, G5 | reverificarea la 5.1 | nu |
| K-N13 | Parametrii `scrypt` față de ghidul OWASP actual | B3 §2 | reverificarea la 5.2 | nu |
| K-N14 | Conținutul „contoarelor agregate” din `GET /admin/dashboard` | B2 §6.5 | proprietarul / auditul | nu (detaliu de contract) |
| K-N15 | Semantica stării „arhivat” a unui sondaj (RULES §11.6: „închis sau arhivat, conform regulilor finale”) | B1 (enum-ul `status`), B2 | proprietarul | **potențial blocant pentru înghețarea enum-ului** `surveys.status` |
| K-N16 | Dacă `admin_only` face parte din D3 aprobat | B1 / B2 (`results_visibility`) | proprietarul | **potențial blocant pentru înghețarea enum-ului** |
| K-N17 | D2 (statutul Master Planului / ANALIZA), D5 (tip de întrebare Rating), D7 (PWA) | D5 poate extinde `survey_questions.type` | proprietarul | nu (extindere mică) |
| K-N18 | Sursele oficiale ale datelor de referință (telefoane, registratură) | D10-6, DN-14 | proprietarul / Primăria | nu pentru design; **da** înainte de producție |
| K-N19 | Conturile reale ale Primăriei (câți operatori, ce adrese) | D8-6, DN-18 (minimum 2 `super_admin`) | Primăria / proprietarul | nu |
| K-N20 | Vizibilitatea repository-ului (public / privat), reutilizarea parolelor istorice (S-1), publicarea în AI Studio (S-3 / R-11) | riscul parolelor din istoric | proprietarul | nu pentru design |

---

## L. RISCURI ȘI CONTRADICȚII DEJA DETECTATE

**Nimic din această secțiune nu este rezolvat.**
- **L.1** reia problemele identificate în prima proiectare (K-x, R-x din `FAZA_4_00` §8).
- **L.2** conține observații **noi**, identificate în timpul pregătirii acestui document (O-x). Ele nu fac parte din prima proiectare și sunt marcate separat.

### L.1 Din prima proiectare

| Categorie | ID | Conținut |
|---|---|---|
| **Contradicție reală** | K-2 | 6.6 („fără istoric de asumări”) față de auditul aprobat |
| **Contradicție reală** | K-6 | anonimizarea contactului față de lista închisă D8-4 |
| **Ambiguitate** | K-3 | locația exactă ascunsă (D6-3) față de textul locației public (6.6) |
| **Lipsă de informație** | K-1 | T1–T8 nedefinite |
| **Propunere care necesită aprobare** | DN-01…DN-24 | integral (secțiunea F) |
| **Risc tehnic** | K-4 | incompatibilitatea unor versiuni noi cu Node 20 (fără încălcare) |
| **Risc tehnic** | R-1 | migrarea asincronă a celor 140 de apeluri produce regresii (ridicat) |
| **Risc tehnic** | R-2 | suita existentă depinde de `localStorage` și de parolele din cod (ridicat) |
| **Risc tehnic** | R-4 | Drizzle < 1.0 (mediu) |
| **Risc tehnic** | R-5 | cod propriu pentru EXIF, semnăturile imaginilor și UAT (mediu) |
| **Risc tehnic** | R-8 | performanța `scrypt` pe 1 vCPU (mic–mediu) |
| **Risc tehnic** | R-9 | rotirea greșită a `PARTICIPATION_HMAC_SECRET` (mic) |
| **Risc tehnic** | R-12 | schema este „completă structural” înainte de DN-uri |
| **Risc de privacy** | K-3 | adresa autorului în textul public |
| **Risc de privacy** | R-10 | retenția și temeiurile juridice neclarificate (mediu) |
| **Risc operațional** | K-5 / R-7 | spam către Primărie înainte de moderare |
| **Risc operațional** | R-3 | Passenger / cPanel neconfirmat |
| **Risc operațional** | R-6 | pierderea accesului `super_admin` (TOTP) |
| **Risc operațional** | R-11 | resurse partajate cu Electrovolt pe staging (mic) |

### L.2 Observații noi (identificate la pregătirea acestui document; **nerezolvate**)

| Categorie | ID | Conținut | Surse |
|---|---|---|---|
| **Contradicție internă în pachet** | O-1 | B2 §6.1 dă pentru `POST /admin/reports/:id/contact/anonymize` permisiunea „`accounts.manage`? — DN-12”, iar DN-12 (a) propune o permisiune nouă, `reports.contact.anonymize` | B2 §6.1; DECIZII_NOI DN-12 |
| **Posibilă contradicție** | O-2 | B1 / B2 includ `results_visibility = admin_only` (rezultate niciodată publice). RULES §11.6 D3: „consultările încheiate rămân într-o **arhivă publică, cu rezultatele finale**”. Cele trei valori apar numai în analiza D3/D4 (V3), **nu** în textul aprobat. | RULES §11.6; FAZA_3_D3_D4 l. 81, 151; B1 §3.4; B2 §3 |
| **Lipsă de informație** | O-3 | RULES §11.6: sondajul cu voturi poate fi „doar închis **sau arhivat**, conform regulilor finale”. B1 `surveys.status` ∈ {`draft`, `active`, `closed`}, fără „arhivat”, iar B2 nu are o operație de arhivare. | RULES §11.6; B1 §3.4 |
| **Ambiguitate de trasabilitate** | O-4 | ID-urile D34-1…D34-3 (folosite în B1 ca „D34-3”) există numai în analiza D3/D4; RULES consemnează regulile fără aceste ID-uri | B1 §3.4; FAZA_3_D3_D4 l. 179–181 |
| **Ambiguitate** | O-5 | `registry_notification` cere `EMAIL_MODE = live` (B6 §3; B2 `PUT /admin/settings/registry` refuză `flowEnabled` fără `live`). Pe staging modul este `allowlist` (N3-3). Deci fluxul către Primărie **nu poate fi exersat pe staging**, deși B10 (5.5) cere „`allowlist` pe staging verificat”. | B6 §3; B2 §6.5; B10 §6 |
| **Contradicție reală cod ↔ decizie** (tratată de design) | O-6 | codul actual trimite notificarea Primăriei la `registryEmail` **din Ghid** (`reportService.submitReport` → `directoryService`). A17-2 / N3-5 interzic folosirea automată a adresei din Ghid. Designul schimbă comportamentul; migrarea UI (câmpul din `AdminInstitutionForm`) trebuie tratată. | `reportService.ts` l. 359–360; RULES §11.10 |
| **Ambiguitate** | O-7 | `FAZA_4_INSTRUCTIUNI_INCEPERE.md` §4 cere „Master Plan **v1.1**”; Master Planul PDF este v1.0 (raportul Fazei 0 §9), iar v1.1 este **Planul de Lucru Comun** | S-2 §4; Faza 0 |
| **Stare documentară** | O-8 | `FAZA_3_CHECKPOINT.md` din pachet spune „propus, neaprobat”. Aprobarea este consemnată numai în RULES §11 / HANDOFF I (`cb9f47e`). | pachet; RULES |
| **Documentație depășită** | O-9 | HANDOFF A.1 (numele pachetului `react-example`; realitatea: `turnu-magurele-civic`); F.2 (backend „nedecis”; realitatea: D1 = B); G.3 și H (N2 / N4 „DESCHIS”, „valorile nu au fost transmise”; realitatea: D3/D4 decise); I („Faza 4 nu a început”); RULES §4 (N2, N4, P7 ca decizii deschise). Corecturile DF-2 / DF-3 din checkpoint-ul Fazei 3 sunt aplicate **parțial**. | HANDOFF; RULES; FAZA_3_CHECKPOINT §7 |
| **Lipsă în contract** | O-10 | Admin folosește azi `reportService.isPubliclyVisible` (indicatorul „vizibil pe hartă”), `getModerationStats().privateCount` și `quickDialService.getCountsByCategory`; B2 nu definește explicit aceste câmpuri | `AdminReportsModeration.tsx`; `AdminCategoriesManager.tsx`; B2 |
| **Ambiguitate** | O-11 | N4-9 este formulată pe **rol** („numai `super_admin`”); DN-03 o mapează pe **permisiune** (`surveys.edit` + sondaj închis). Echivalența ține azi numai pentru că operatorul nu are `surveys.edit`. | RULES §11.7; DN-03 |
| **Ambiguitate** | O-12 | D8-4 (2) acoperă „configurarea destinatarului tehnic”. DN-01 include în `notifications.recipient.manage` și comutatorul A17-4, modul A17-8 și referința acordului A17-1, pentru care RULES nu indică o permisiune. | RULES §11.5, §11.10; DN-01; B2 §6.5 |
| **Propunere fără sursă explicită** | O-13 | B1: `integrity_flag` / `integrity_note` „vizibile public în arhivă”. N4-10 prevede marcajul cu audit, fără a preciza dacă este public. | B1 §3.4; RULES §11.7 |
| **Acoperire de testare** | O-14 | B10 §3 nu are teste explicite pentru: dezabonare (D9-2), `kind` obligatoriu la răspunsuri (D9-5), starea transmiterii (A17-7), D6-6 (fără GPS brut). Sunt prezente în B2 / B5, dar nu în lista de teste. | B10 §3; matricea G |
| **Risc de privacy** | O-15 | jurnalul e-mail per sesizare (`reports.view`, DN-03) conține adresa destinatarului pentru ambele roluri. Este consecvent cu 6.6 (contactul vizibil ambelor roluri), dar extinde locurile în care apare adresa. | DN-03; RULES §6 |
| **Risc operațional** | O-16 | `resetToDemo` are azi butoane în UI pentru Ghid și Sondaje. Eliminarea lor (D4) este o schimbare de UI pe care designul nu o enumeră explicit în B2 §7. | `AdminInstitutionForm.tsx`; `AdminSurveysManager.tsx`; B2 §7 |

---

## Fișiere suplimentare necesare

ChatGPT a fost resetat. Nu presupun că are vreun fișier. Pentru un audit strict pe documente are nevoie de următoarele:

| # | Nume | Motiv | Tip | Un singur fișier? |
|---|---|---|---|---|
| F-1 | `faza4/FAZA_4_00_ARHITECTURA_SI_INDEX.md` … `FAZA_4_DECIZII_NOI.md` (cele 8) | obiectul auditului | document | 8 fișiere (sau o singură arhivă `faza4/`) |
| F-2 | `PROJECT_RULES_AND_DECISIONS.md` (la `cb9f47e`) | sursa deciziilor aprobate (§6, §10, §11) | document | da |
| F-3 | `Turnu_Magurele_Civic_PLAN_DE_LUCRU_COMUN_v1.1.md` | cadrul Fazei 4, numerotarea B | document | da |
| F-4 | `FAZA_4_INSTRUCTIUNI_INCEPERE.md` | mandatul și criteriile checkpoint-ului | document | da |
| F-5 | `PROJECT_HANDOFF_CURRENT.md` (la `cb9f47e`) | starea proiectului; secțiunile H, A.6 | document | da |
| F-6 | rapoartele Fazei 3 (`faza3/`, 13 fișiere) | variantele și motivațiile; minimum `FAZA_3_D3_D4_SONDAJE_ANALIZA.md` (O-2, O-4), `FAZA_3_N2_STACK_BACKEND_ANALIZA_HOSTGATE.md` (§6, testele de staging) și `FAZA_3_CHECKPOINT.md` | raport | o arhivă `faza3/` |
| F-7 | Master Planul `PLAN_MASTER_APLICATIE_CIVICA_TURNU_MAGURELE.pdf` | citat de prima proiectare; **nu este disponibil nici mie în această sesiune** | document | da (**de furnizat de proprietar**) |
| F-8 | `src/types/*.ts` (9 fișiere) și `src/services/*.ts` (9 fișiere) de la `cb9f47e` | verificarea B1 / B2 față de cod. **`authService.ts` conține parolele Admin**: recomand fie să nu fie transmis, fie o copie cu liniile parolelor mascate. Inventarul din H și I îl poate înlocui pentru audit. | cod | o arhivă (fără parole în clar) |
| F-9 | `tests/run_all.py` și `tests/README.md` | `KNOWN_FAILS`, referința 102/103 | cod / document | da |
| F-10 | `faze0_2/FAZA_0_CHECKPOINT_ETAPA_6_RAPORT.md` | riscurile R-1…R-10 și trimiterea „(T1)” | raport | da |
| F-11 | **acest document** (`FAZA_4_INPUT_AUDIT_CHATGPT.md`) | punctul de intrare | document | da |

Nu este necesară o copie a repository-ului.

---

### STATUS

- Faza 4 implementată: **NU**
- Repository modificat: **NU**
- Commit/push efectuat: **NU**
- Design Faza 4 aprobat: **NU**
- DN-01...DN-24 aprobate: **NU**
- K-1...K-6 rezolvate: **NU**
- Material pregătit pentru audit ChatGPT: **DA**
