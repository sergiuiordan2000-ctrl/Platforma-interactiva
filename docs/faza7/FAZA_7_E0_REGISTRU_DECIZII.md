# FAZA 7 — E0: REGISTRUL DECIZIILOR PENTRU PLANUL MVP 1.0 READY

**Proiect:** Urbis Activ (Turnu Măgurele Civic) · **Etapa:** E0.3 (consemnare) · **Data deciziilor:** 25.10.2026
**Decizii:** proprietarul (Sergiu Iordan), după analiza făcută împreună cu Aristotel (ChatGPT) și cu Claude.
**Baza tehnică la data deciziilor:** `faza-5-backend` = `24fa43f`, CI verde (run 40199879453); `main` = `d9bc2c9`, neatins; staging `711a7ae`, `health` OK (intervenția 106).

> **Acest document consemnează decizii de planificare. Nu autorizează implementarea.**
> E1/7C nu este autorizată. Lansarea publică nu este aprobată.

---

## 1. Planul aprobat

| Câmp | Valoare |
|---|---|
| Documentul | `docs/faza7/FAZA_7_PLAN_ACTIUNE_MVP_v2.4.md`, care se adaugă în același commit cu acest registru, ca copie identică a textului aprobat (vezi §3 pentru starea commitului) |
| Versiunea | 2.4 |
| Aprobat | 25.10.2026, ora 17:54 |
| Amprenta SHA-256 a textului aprobat | `39ee6b3d6d21ad791e1ddb1d3f4614c5f28ddab54909e84e35b3a55c4eb39799` (778 de rânduri, 66 378 de octeți) |
| Condiții | aprobarea planului nu autorizează modificări de cod, commituri, push-uri sau operații pe staging ori producție; lansarea publică cere o decizie separată (E9) |

Antetul documentului aprobat păstrează mențiunea „PROPUNERE”, fiindcă textul este consemnat exact în forma aprobată. Starea lui în vigoare este cea din acest registru.

## 2. Deciziile aprobate

### 2.1 DEC-2a/2b/2c — `SEARCH_INDEXING` (aprobate la 17:55)

| Decizia | Conținutul |
|---|---|
| DEC-2a | valorile exacte `off` și `on`; variabila absentă = `off`; cu `off`: `X-Robots-Tag: noindex, nofollow` (comportamentul actual de pe staging); la E9 antetul se elimină, iar `robots.txt` se actualizează în aceeași etapă |
| DEC-2b | `on` permis numai cu `APP_ENV=production`; cu `staging` sau `development` aplicația refuză pornirea; `APP_ENV=test` se verifică separat, fiindcă schema existentă îl respinge deja |
| DEC-2c | orice altă valoare (șir gol, `ON`, `true`, `1` etc.) → refuz la pornire |

Consecință acceptată (S5): antetul `noindex, nofollow` se va trimite și în `development`.

### 2.2 DEC-18 — TOTP pentru `super_admin` (aprobată la 17:57, varianta b)

- Impunerea existentă se păstrează, fără schimbarea comportamentului aplicației.
- Trei teste noi: impunerea cu `APP_ENV=production`; `enroll` obligatoriu după resetarea TOTP; `enroll` obligatoriu după promovarea la `super_admin`.
- Procedura documentată de recuperare a ultimului `super_admin` este obligatorie înainte de E4 și nu este înlocuită de DEC-22.
- Varianta (c), TOTP obligatoriu pentru alte roluri: respinsă pentru această etapă.

### 2.3 DEC-14 — redenumirea în „Urbis Activ” (aprobată la 17:58, perimetrul la 18:01 și 18:05)

**Intră în 7C:**

| # | Locul | Textul aprobat |
|---|---|---|
| A1 | `index.html:6` | `<title>Urbis Activ</title>` |
| A2 | `index.html:8` | `og:title` = „Urbis Activ” |
| A4 | `src/components/layout/Header.tsx` 36–41 | „Urbis Activ” ca nume de produs, „Turnu Măgurele” ca localizare; eticheta „CIVIC” eliminată (S1) |
| A5 | `src/components/layout/Footer.tsx:21` | „Urbis Activ” |
| A6 | `src/components/layout/Footer.tsx:99` | „© {an} Urbis Activ. Dezvoltat pentru comunitatea locală.” |
| A7 | `src/components/announcements/AnnouncementDetail.tsx:192` | „Urbis Activ • Modul Comunicate” |
| A8 | `src/components/surveys/SurveyVotingModal.tsx:533` | „Platforma Urbis Activ nu solicită…” |
| B1 | `src/components/admin/AdminDashboard.tsx:110` | „Acesta este panoul central al platformei Urbis Activ pentru Turnu Măgurele.” |
| C1 | `server/src/routes/citizens.ts:152` | subiectul „Codul de autentificare — Urbis Activ” |
| C2 | `server/src/routes/citizens.ts:114` | subiectul „Urbis Activ” |
| C3 | `server/src/reports/outbox.ts:80` | „…prin platforma independentă Urbis Activ.” |

Numerele de rând se referă la commitul `24fa43f`.

**Rămân neschimbate sau se tratează separat:**

| Element | Tratarea |
|---|---|
| `TOTP_ISSUER` (`server/src/auth/totp.ts:5`) | se păstrează valoarea existentă |
| formulările descriptive fără numele vechi; adjectivul „civic/civică” | neschimbate, împreună cu testele care le verifică |
| `README.md`, inclusiv corectura N2 de la rândul 4 | în 7D-final (S4) |
| `metadata.json` | neschimbat până la clarificarea folosirii lui de instrumente externe |
| identificatorii tehnici (`civic.env`, scripturile `civic-*`, formatele `civic-backup/2` și `civic-markers/2`, cookie-urile, antetul CSRF, derivarea cheilor, numele bazelor) | neschimbați; comentariile din migrări sunt protejate de suma de control SHA-256 a runner-ului (`server/src/db/migrations.ts` 72) |
| numele localității „Turnu Măgurele” | rămâne când desemnează orașul sau instituțiile |
| datele demo | în afara perimetrului (D10) |
| mesajele deja aflate în coada de e-mail | nu se modifică retroactiv |

**Constatare separată:** inventarul nu a găsit în repository o politică de confidențialitate propriu-zisă (numai „regulile de utilizare” din `src/components/report/CitizenLogin.tsx` și `CITIZEN_POLICY_VERSION`). Este o remediere GDPR distinctă și nu se rezolvă prin redenumire.

### 2.4 DEC-3 — perimetrul 7C (închis la 18:07, la nivel de planificare)

| Cod | Element | Fișiere și teste |
|---|---|---|
| P1 | `tsc --noUnusedLocals` și remedierea rezultatelor | de identificat în E1, înainte de orice remediere |
| P2 | eliminarea `autoprefixer`, după verificarea build-ului; dovezile `source-map-js` (`npm ls`, `npm audit`, analiza artefactului) | `package.json`, `package-lock.json` |
| P3 | eliminarea codului de diagnostic (L5) | `server/src/routes/diagnostics.ts` (ștergere); `server/src/app.ts`; `server/src/config.ts`; `server/test/api/diagnostics.test.ts` înlocuit (DG-1, DG-2) |
| P4 | `SEARCH_INDEXING` (DEC-2) | `server/src/config.ts`; `server/src/app.ts`; `server/test/api/app.test.ts` modificat; test nou SI-1…SI-9 |
| P5 | testul 10 al artefactului | `.github/workflows/ci.yml`, pasul „Artefactul” |
| P6 | teste TOTP (DEC-18 b) | test nou TO-1…TO-3 |
| P7 | redenumirea (DEC-14) | cele 7 fișiere din §2.3 |
| P8 | teste pentru textele redenumite | test E2E nou RN-1, RN-2 și înregistrarea lui în `tests/run_all.py`; test de server nou RN-3, RN-4, RN-5 |

Numele fișierelor de test noi propuse în perimetrul consolidat sunt: `server/test/api/searchIndexing.test.ts`, `server/test/integration/c7TotpImpunere.test.ts`, `server/test/integration/c7RedenumireEmail.test.ts`, `tests/ui/test_7c_redenumire.py`.

**Excepții limitate:** lista fișierelor atinse de `--noUnusedLocals` și formularea exactă a testului DG-2 se stabilesc în E1. Ele nu autorizează extinderea perimetrului: orice rezultat care indică o schimbare de comportament sau o ieșire din perimetru oprește lucrul și se prezintă proprietarului.

Criteriile de acceptare și verificările CI aprobate sunt în **Anexa A**.

### 2.5 R2 — forma viitoarei autorizări E1 (aprobată la 18:08, varianta b)

- Commiturile locale pe `faza-5-backend` vor fi permise numai în perimetrul P1–P8, cu criteriile de acceptare și regulile de oprire din planul v2.4.
- Fiecare push cere aprobarea separată a proprietarului; aprobarea unui commit local nu autorizează push-ul lui.
- Operațiile pe staging și producție rămân supuse aprobărilor separate din plan.
- **Această decizie stabilește forma autorizării; nu autorizează pornirea E1.**

### 2.6 E0.3 — forma consemnării (aprobată la 18:11)

- Două fișiere noi: planul aprobat (copie identică, verificată prin amprenta SHA-256) și acest registru, cu Anexa A.
- Scrierea în repository, commitul local și push-ul cer aprobări separate.

## 3. Starea

### 3.1 La data redactării acestui registru (înaintea commitului E0.3)

> **Notă de interpretare:** tabelul de mai jos descrie starea **istorică**, de la momentul redactării registrului, înaintea commitului E0.3. Nu descrie starea curentă după executarea operațiunilor din §3.2. Efectele commitului și, separat, ale push-ului sunt cele enumerate în §3.2; orice altă schimbare de stare se consemnează într-un document ulterior, nu prin reinterpretarea acestui tabel.

| Element | Starea |
|---|---|
| Planul v2.4 | aprobat |
| DEC-2a/2b/2c, DEC-18, DEC-14, DEC-3, RN-5, R2 | aprobate sau închise, ca mai sus |
| E0.3 | **pregătită; neexecutată.** Conținutul acestui registru și al copiei planului sunt în verificare la proprietar; scrierea în repository, commitul și push-ul nu sunt încă aprobate |
| E1/7C | **neautorizată** |
| push | fiecare cu aprobare separată |
| staging și producție | nicio operație autorizată |
| lansarea publică | **neaprobată** |

### 3.2 După executarea și verificarea commitului E0.3

Devine adevărat **numai** după ce commitul local a fost aprobat, executat și verificat:
- cele două fișiere sunt în istoricul local al ramurii `faza-5-backend`, iar amprenta copiei planului corespunde celei din §1;
- deciziile din §2 sunt consemnate în repository.

Devine adevărat **numai** după aprobarea și executarea separată a push-ului:
- consemnarea este publicată pe `origin/faza-5-backend`, iar CI rulează pe commitul respectiv.

Starea E1/7C, a staging-ului, a producției și a lansării publice **nu se schimbă** prin commitul sau push-ul E0.3.

### 3.3 Decizii rămase

**Necesare înaintea checkpoint-ului 7C (nu înaintea pornirii E1):** DEC-3b (riscul `source-map-js`, după dovezi); DEC-19 (jurnalele CI ale rulării 40187048898 sau acceptarea limitei); G6, în măsura în care poate impune cod (criteriul E1.10); DEC-21, numai dacă mecanismul ales ar cere cod.

**Pentru etapele ulterioare:** conform registrului din planul v2.4, §6 și §12.2.

---

## Anexa A — Criteriile de acceptare și verificările aprobate pentru 7C

Sursa: perimetrul consolidat prezentat la 18:05 și aprobat la 18:07, împreună cu RN-5 (aprobat la 18:07).

### A.1 `SEARCH_INDEXING` (P4)

| Test | Criteriul de acceptare |
|---|---|
| SI-1 | fără variabilă, în `development`, `staging` și `production`: `X-Robots-Tag: noindex, nofollow` pe `/` (HTML), pe un fișier static și pe `/api/v1/health` |
| SI-2 | `off` explicit: același rezultat ca SI-1, în cele trei medii |
| SI-3 | `robots.txt` cu `off`: exact `User-agent: *\nDisallow: /\n`; cu `on` (în producție): fără `Disallow: /` |
| SI-4 | `on` + `APP_ENV=production`: antetul lipsește pe toate cele trei tipuri de răspuns |
| SI-5 | `on` + `APP_ENV=staging`: refuz la pornire, cu un mesaj care numește `SEARCH_INDEXING` |
| SI-6 | `on` + `APP_ENV=development`: refuz la pornire, cu un mesaj care numește `SEARCH_INDEXING` |
| SI-7 | `APP_ENV=test`: refuz din partea schemei `APP_ENV`; testul verifică mesajul schemei și nu îl prezintă ca refuz al `SEARCH_INDEXING` |
| SI-8 | șir gol, `ON`, `Off`, `true`, `1`: refuz la pornire pentru fiecare valoare, cu un mesaj care numește `SEARCH_INDEXING` |
| SI-9 | pentru `off` și pentru variabila absentă, schimbarea `APP_ENV` între cele trei valori admise nu schimbă antetul și nici `robots.txt` |

**Condiție comună:** fiecare test de refuz verifică și motivul refuzului, nu doar faptul că pornirea eșuează.

**Modificări ale testelor existente:** testul „dezvoltare: fără X-Robots-Tag” din `server/test/api/app.test.ts` se inversează, conform DEC-2a și S5; testul de staging se păstrează; ajutorul `fakeFrontend()` se extinde cu un fișier static.

### A.2 Diagnosticul eliminat (P3)

| Test | Criteriul de acceptare |
|---|---|
| DG-1 | ruta de diagnostic întoarce 404 în orice configurare |
| DG-2 | `DIAG_CLIENT_IP` nu mai este citită de configurație; formularea exactă se stabilește în E1, după comportamentul schemei la variabile necunoscute |

### A.3 TOTP (P6, DEC-18 b)

| Test | Criteriul de acceptare |
|---|---|
| TO-1 | cu `APP_ENV=production`: un `super_admin` fără TOTP primește `mfa: 'enroll'` după parolă; orice rută protejată întoarce 403 `MFA_REQUIRED` până la înrolare |
| TO-2 | după resetarea TOTP de către alt `super_admin`: sesiunile contului resetat sunt revocate, iar la autentificarea următoare răspunsul este `mfa: 'enroll'` |
| TO-3 | un cont promovat la `super_admin` fără TOTP configurat: sesiunile existente sunt revocate, iar la autentificarea următoare răspunsul este `mfa: 'enroll'` |

**Condiție:** testele nu schimbă comportamentul aplicației. Dacă un test descoperă un comportament diferit de cel stabilit prin citirea codului, lucrul se oprește și se raportează proprietarului (regula de redeschidere din plan).

### A.4 Redenumirea (P8)

| Test | Criteriul de acceptare |
|---|---|
| RN-1 (E2E) | titlul paginii este exact „Urbis Activ”, iar `og:title` are conținutul „Urbis Activ” |
| RN-2 (E2E) | antetul conține „Urbis Activ” și „Turnu Măgurele”, nu conține eticheta „CIVIC” și nu conține „Turnu Măgurele Civic” |
| RN-3 (server) | subiectul mesajului cu codul de autentificare este exact „Codul de autentificare — Urbis Activ” |
| RN-4 (server) | subiectul anunțului de blocare este exact „Urbis Activ” |
| RN-5 (server) | corpul mesajului generat pentru transmiterea către Primărie conține „platforma independentă Urbis Activ” și nu conține „Turnu Măgurele Civic”; testul verifică mesajul generat și nu trimite niciun e-mail real |

### A.5 Verificările CI și ale artefactului (P5)

**Pasul „Artefactul” din `.github/workflows/ci.yml`** (serverul pornit din `server/dist/app.js`, fără `node_modules`, cu `APP_ENV=development` și fără `SEARCH_INDEXING`). Pe lângă verificările existente (`health` = `ok`, `/` = 200):
1. antetul `X-Robots-Tag: noindex, nofollow` pe `/`;
2. același antet pe un fișier static servit din `dist` (de exemplu `/favicon.svg`);
3. același antet pe `/api/v1/health`;
4. conținutul exact al `/robots.txt`: `User-agent: *\nDisallow: /\n`.

Pasul eșuează dacă oricare verificare nu trece.

**Celelalte verificări (criteriile E1 din planul v2.4):** toate cele 6 joburi CI verzi la commitul final 7C; lint `tsc` pentru frontend, server și shared; build-ul frontend fără `autoprefixer`; testele unitare, API și de integrare; suita E2E, inclusiv noul fișier înregistrat în `tests/run_all.py`. Numărul de teste al rulării 7C se consemnează, dintr-o rulare locală dacă jurnalele CI rămân inaccesibile; acest număr nu închide rezerva 5 din 7B.

**Neinclus:** verificarea artefactului în modul `production` (neaprobată; artefactul rămâne verificat în `development`).

### A.6 `--noUnusedLocals` (P1)

- Lista fișierelor afectate se cunoaște numai după rularea `tsc --noUnusedLocals` în E1.
- Rezultatele brute se consemnează în `FAZA_7C_RAPORT.md` înaintea oricărei remedieri.
- Remedierea se limitează la eliminarea codului raportat ca nefolosit.
- Orice caz în care eliminarea ar schimba comportamentul se oprește și se prezintă separat proprietarului.
