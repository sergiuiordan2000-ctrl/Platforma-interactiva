# FAZA 4 — PROIECTAREA BACKEND-ULUI: ARHITECTURĂ ȘI INDEX

**Proiect:** Turnu Măgurele Civic · **Data:** 27.09.2026
**Instrucțiune:** „FAZA 4 — ÎNCEPERE PROIECTARE BACKEND”
**Executant:** Claude · **Auditor:** ChatGPT · **Aprobare:** Sergiu

> **Revizia 1 (SET-01, 27.09.2026):** au fost aplicate deciziile aprobate în `FAZA_4_INSTRUCTIUNI_CLAUDE_01.md` (DN-01, DN-02, DN-09, DN-12, DN-21, E-3, pct. 7) și clarificările C-1…C-4. Rezumatul este în `FAZA_4_DECIZII_NOI.md` §0; punctele deschise noi (P-1…P-13) în §C; lista modificărilor în `FAZA_4_RAPORT_MODIFICARI_SET_01.md`. Modificările sunt marcate **[SET-01]**. **Designul rămâne neaprobat și neînghețat.**

> **Revizia 2 (SET-A-01, 27.09.2026):** au fost aplicate deciziile D8–D31 (`FAZA_4_DECIZII_8_31_INSTRUCTIUNI_CLAUDE.md`) și A-1…A-9 (`FAZA_4_DECIZII_A1_A9_INSTRUCTIUNI_CLAUDE.md`). Rezumatul este în `FAZA_4_DECIZII_NOI.md` §0.3; problemele deschise B-3…B-14 și consecințele tehnice T-A1…T-A10 în §D; raportul în `FAZA_4_RAPORT_MODIFICARI_SET_A_01.md`. Modificările sunt marcate **[SET-A-01]**. **Designul rămâne neînghețat.**

> **Revizia 3 (SET-A-02, 27.09.2026):** au fost aplicate deciziile 2.1–2.15 din `TMC_FAZA_4_INSTRUCTIUNI_CLAUDE_SET_A_02.md` și corecturile obligatorii 1–13. Rezumatul este în `FAZA_4_DECIZII_NOI.md` §0.4; punctele care mai cer o decizie (K-A02-1…K-A02-4) și lista punctelor încă deschise în §E; raportul în `FAZA_4_RAPORT_MODIFICARI_SET_A_02.md`. Marcaj **[SET-A-02]**. **Designul rămâne neînghețat.**

> **Stare:** pachet de proiectare **propus, NEAPROBAT, NEÎNGHEȚAT**. Checkpoint-ul Fazei 4 **nu este atins**: lipsesc revizia, aprobarea și deciziile DN-01…DN-24.
>
> **Nu s-a implementat nimic:** nu există `server/` sau `shared/`, nu s-a instalat nimic, `package.json` este neschimbat, nu există migrații sau endpoint-uri, nicio acțiune pe hosting, DNS, MySQL sau VPS.
>
> **Repository-ul este neatins:** HEAD `cb9f47e` = GitHub, working tree curat, `main` = `d9bc2c9`. Documentele sunt în afara repository-ului. Nu am făcut commit sau push.

---

## 1. Documentele pachetului

| Fișier | Conținut |
|---|---|
| `FAZA_4_00_ARHITECTURA_SI_INDEX.md` | acest document: arhitectura, dependențele (T1–T8), configurarea și secretele, staging-ul, riscurile, stadiul checkpoint-ului |
| `FAZA_4_B1_MODEL_DATE.md` | **B1:** modelul complet de date, relații, constrângeri, indexuri, migrarea din `localStorage`, seed-uri |
| `FAZA_4_B2_API.md` | **B2:** contractele API (public / cetățean / autentificare / Admin / operații interne) + modelul asincron în frontend |
| `FAZA_4_B3_B4_AUTENTIFICARE_AUTORIZARE.md` | **B3:** parole, sesiuni, blocare, TOTP, bootstrap. **B4:** permisiuni, matricea operațiilor, audit |
| `FAZA_4_B5_B8_SESIZARI_DATE_PERSONALE.md` | **B5:** fluxul tranzacțional, `TM-XXX`, fotografii, `PublicMapReport`, stadii. **B8:** inventarul datelor personale |
| `FAZA_4_B6_B7_EMAIL_ANTISPAM.md` | **B6:** coada, moduri, șabloane, retry, retenție. **B7:** anti-abuz pe zone; garantat / redus / negarantat |
| `FAZA_4_B10_TESTARE.md` | **B10:** niveluri, matrice CI, acoperire legată de decizii, adaptarea suitei, criterii de acceptare |
| `FAZA_4_DECIZII_NOI.md` | **contradicțiile K-1…K-6 și deciziile noi DN-01…DN-24** |

B9 nu se folosește (Plan v1.1).

## 2. Surse folosite

- RULES §1–§11 (deciziile Fazei 3) și HANDOFF, la `cb9f47e`;
- Planul de Lucru Comun v1.1 (Faza 4, Faza 5);
- Master Planul (PDF);
- rapoartele Fazei 3;
- codul: `src/types/*`, `src/services/*` (metodele publice și gărzile de permisiuni), `ReportForm.tsx`, `imageCompressionService.ts`;
- registrul npm (`npm view`, **numai citire**, 27.09.2026) pentru versiuni și compatibilitatea cu Node.

## 3. Arhitectura backend

```
                    Browser (React SPA, rutare hash)
                               │  aceeași origine, HTTPS
                ┌──────────────┴───────────────┐
         fișiere statice dist/            /api/v1/*
                └──────────────┬───────────────┘
                     Aplicația Node (Fastify 5, TypeScript compilat într-un singur fișier)
       ┌────────────┬─────────────┬──────────────┬─────────────┬──────────────┐
    rute publice  rute cetățean  rute auth     rute Admin    CLI (cron / deploy)
                  [SET-A-01] /citizen/*: cont prin cod pe e-mail, sesizările proprii
       └────────────┴─────────────┴──────┬───────┴─────────────┴──────────────┘
                           servicii de domeniu (reguli 5C, 6.1–6.6, D3/D4, D6, D9, A-17, N-4)
                           shared/: tipuri, scheme Zod, matricea de permisiuni
                     ┌──────────────┬──────────────┴──────┬──────────────────┐
                 MySQL (Drizzle)   stocarea fișierelor   transport e-mail    configurare (env)
                                   (disc / S3)            simulated / SMTP
```

| Principiu | Sursă |
|---|---|
| Aplicație **fără stare în memorie** (sesiuni, limite, coadă în DB) | G5 / B-8 |
| Același artefact pe toate mediile; configurare numai prin variabile de mediu; domeniul nu apare în cod | G1, B-7 |
| Autorizare pe server, matrice unică în `shared/` | G1, D8, B4 |
| Fără module native în runtime | G5 / B-3 |
| Frontend-ul static și API-ul pe aceeași origine: aplicația Node servește și `dist/` (simplifică staging-ul Passenger și producția) | G1 |

**Structura repository-ului (propusă, DN-06):**

```
/ (frontend existent, neschimbat ca locație)
├─ src/…                 frontend
├─ shared/               tipuri, Zod, permisiuni (importate de ambele părți)
├─ server/
│   ├─ src/              app, rute, servicii, DB (Drizzle), transport e-mail, stocare, CLI
│   ├─ migrations/       SQL versionat
│   └─ seeds/            config / demo / referință (DN-14)
└─ tests/                suita existentă (adaptată) + teste noi
```

## 4. Medii

| Mediu | Runtime | DB | E-mail | Date | Referință |
|---|---|---|---|---|---|
| Dezvoltare | Node 24 (+ 20 în CI) | MySQL 8.4 local (DN-07) | `simulated` | demo (seed) | G3 |
| CI | Node 20 + 24 | MySQL 8.0 + 8.4 (containere) | `simulated` + captare SMTP (DN-24) | seed de test | G5, B10 |
| Staging temporar | Node 20.20.2 (Basic Plus, Passenger) | MySQL 8.0.37 | `allowlist` / `simulated` | **numai demo** | G3 + cele 8 condiții |
| Producție | Node 24 LTS | MySQL 8.4 LTS | `live` (după A-17) | curată + referință verificată | G6 (deschis), D10 |

## 5. Configurare și secrete

| Variabilă | Rol | Secret? |
|---|---|---|
| `APP_ENV` | `development` / `staging` / `production` (seed-uri, verificarea `no-demo`) | nu |
| `PORT` / socket Passenger | pornire | nu |
| `PUBLIC_BASE_URL` | linkuri din e-mailuri (dezabonare, hartă); **singurul loc cu domeniul** | nu |
| `DATABASE_URL` | conexiunea MySQL (utilizator dedicat, drepturi numai pe DB-ul Civic) | **da** |
| `STORAGE_DIR` | fotografii (în afara docroot-ului) | nu |
| `TRUST_PROXY` | numărul sau adresa proxy-ului de încredere | nu |
| `IP_HASH_SECRET` | cheia de bază pentru hash-ul zilnic al IP-ului | **da** |
| `PARTICIPATION_HMAC_SECRET` | amprenta votului per sondaj; **nu se rotește cât timp există sondaje deschise** (altfel unicitatea se rupe) | **da** |
| `FORM_TOKEN_SECRET` | semnătura `formStartedAt` | **da** |
| `POW_HMAC_KEY` | provocările proof-of-work | **da** |
| `TOTP_ENC_KEY` | criptarea secretelor TOTP (32 de octeți) | **da** |
| `EMAIL_MODE`, `EMAIL_ALLOWLIST`, `MAIL_FROM`, `CIVIC_MAIL_DOMAIN` | e-mail (B6) | nu |
| `SMTP_HOST` / `PORT` / `SECURE` / `USER` / **`PASS`** | furnizorul SMTP | **`SMTP_PASS` da** |
| `UAT_BOUNDARY_FILE` | fișierul GeoJSON al limitei UAT Turnu Măgurele (**[SET-A-02] 2.12**: verificare obligatorie pe server; sursa: limita administrativă OSM, ODbL, cu atribuire, verificată vizual de proprietar față de o sursă oficială; decizie tehnică, fosta DN-08) | nu |
| **[SET-A-02]** `GEOCODER_URL`, `GEOCODER_USER_AGENT` | serviciul de geocodare pentru adrese (2.4), apelat numai de server (proxy), cu cache scurt în memorie per cerere și limite; implicit un serviciu compatibil Nominatim, cu respectarea politicii lui de utilizare. În CI: serviciu simulat. | nu |
| **[SET-A-02]** `RETENTION_DAYS` | 45 (2.5); nu se poate seta peste valoarea aprobată fără decizie | nu |
| `LOG_LEVEL` | nivelul jurnalelor | nu |

**Reguli:**
- secretele nu intră niciodată în repository;
- `.env.example` se rescrie la 5.1, conform planului, fără valori reale;
- pe staging, secretele se setează în „Environment variables” ale aplicației Node din cPanel;
- în producție, secretele stau într-un fișier de mediu cu drepturi restrânse sau în mecanismul platformei (G6);
- **la pornire, aplicația validează toate variabilele (Zod) și refuză să pornească dacă lipsește un secret.**

## 6. Dependențe tehnice (T1–T8 propus, DN-04)

Versiunile sunt citite din registrul npm pe 27.09.2026. Se **fixează exact** la 5.1, după reverificare. Nu am instalat nimic.

| Grup | Dependență | Rol | Versiune | Compatibilitate Node 20 / 24 | Risc | Alternativă |
|---|---|---|---|---|---|---|
| **T1 Runtime** | Node.js | runtime | 24 LTS (producție, dezvoltare); 20.20.2 (staging) | — | Node 20 este EOL (acceptat numai pe staging, G3) | — |
| **T2 HTTP** | `fastify` | server HTTP | 5.12.x | ✅ (Fastify 5 suportă Node 20+) | mic | Express 5 (G10: ales Fastify) |
| | `@fastify/cookie` | cookie-uri | 11.1.x | ✅ | mic | — |
| | `@fastify/multipart` | încărcarea fotografiilor | 10.1.x | ✅ | mediu (limitele trebuie setate corect) | — |
| | `@fastify/helmet` | antete de securitate / CSP | 13.1.x | ✅ | mic | antete setate manual |
| | `@fastify/static` | servirea `dist/` | 10.1.x | ✅ | mic | proxy-ul servește static (producție) |
| **T3 DB** | `mysql2` | driver MySQL (JavaScript pur) | 3.24.x | ✅ (engines ≥ 8) | mic | — |
| | `drizzle-orm` | ORM / constructor de interogări | 0.45.x | ✅ | **mediu:** versiune < 1.0, API-ul se poate schimba → fixare exactă | Kysely |
| | `drizzle-kit` (dezvoltare) | generarea migrațiilor | 0.31.x | ✅ | mic (numai la build) | SQL scris manual |
| **T4 Validare** | `zod` | scheme partajate front / back | 4.6.x | ✅ | mic (se adaugă și în frontend, la 5.3) | — |
| **T5 Crypto / auth** | `node:crypto` | `scrypt`, HMAC, aleatoriu, AES-GCM | inclus | ✅ | — | — |
| | `otpauth` | TOTP (RFC 6238) | 9.5.x (MIT) | ✅ (JavaScript pur) | mic | implementare proprie (≈ 50 de linii) |
| | `qrcode` (frontend) | QR pentru înrolare | curentă (MIT, Node ≥ 10) | ✅ | mic | DN-16 (b) |
| | `ulid` | identificatori | 3.0.x (MIT) | ✅ | mic | funcție proprie |
| **T6 E-mail** | `nodemailer` | transport SMTP generic (N3-2) | 10.0.x | ✅ (engines ≥ 20) | mic; **atenție:** o versiune viitoare care cere Node > 20 → regula B-5 | — |
| **T7 Fișiere / anti-abuz** | cod propriu | semnăturile JPEG / WebP, filtrul EXIF, point-in-polygon UAT | — | ✅ | mediu (cod de testat bine) | `file-type` 21 (cere Node ≥ 20; **v22 cere ≥ 22**, exclusă) |
| | `altcha-lib` | proof-of-work (N4-5) | 2.5.x (MIT) | ✅ (JavaScript pur; **de reverificat engines la 5.6**) | mic | implementare proprie de tip hashcash |
| | `pino` (inclus în Fastify) | jurnale cu redactare | 10.x | ✅ | mic | — |
| **T8 Build / teste** | `esbuild` (dezvoltare) | construirea artefactului backend (un singur fișier) | 0.28.x | ✅ (engines ≥ 18); binar nativ **numai la build, în CI**, nu pe server | mic. **Notă A-22:** a fost scos din dependențele frontend-ului pentru un conflict de peer dependencies; aici ar fi dependență a workspace-ului `server/`, care nu intră în conflict cu Vite. De reverificat la 5.1 (`npm ci` fără `--legacy-peer-deps`). | `tsup` |
| | `node:test` | teste unitare / integrare / API | inclus | ✅ | mic | Vitest 4.1.x (DN-23). **Vitest 5: exclus** (cere Node ≥ 22.12). |
| | Playwright + Python (existent) | E2E | existent | — | adaptarea harness-ului (B10 §4) | — |
| | container de captare SMTP (CI) | teste de e-mail | — | — | numai în CI | DN-24 |

**Verificarea G5:** nicio dependență din lista propusă nu cere mai mult decât Node 20. **Regula B-5 nu se declanșează.** Incompatibilitățile găsite (Vitest 5, `file-type` 22) sunt evitate prin alternative, **nu** prin versiuni vechi ale unor dependențe necesare (K-4).

## 7. Staging și compatibilitate (G3, G5)

- **Artefactul:** `server/dist/app.js` (un singur fișier) + `dist/` (frontend) + `migrations/` + `seeds/`. Pe server nu se face `npm install` pentru cod nativ.
- **Pornirea pe staging:** aplicația Node din cPanel, pe subdomeniul de staging (docroot în afara `public_html`, „Share document root” dezactivat). Repornire prin buton sau `tmp/restart.txt` (se confirmă la K2 / 5.1).
- **Deploy:** artefactul se încarcă (Git cu cheie de deploy sau upload); `migrate` (DN-20); repornire; T-ISO / T-RUN înainte și după.
- **Cron:** `outbox:process`, curățările, `backup:db` (G3, condiția 6).
- **Compatibilitatea:** matricea CI (B10 §2). Orice nevoie peste Node 20 / MySQL 8.0 → **retragerea staging-ului** (B-5), cu aprobare.

## 8. Riscuri

| # | Risc | Nivel | Tratare |
|---|---|---|---|
| R-1 | Migrarea asincronă a ≈ 140 de apeluri din frontend introduce regresii | ridicat | pe domenii (5.3 / 5.4 / 5.6), cu E2E per domeniu (B10) |
| R-2 | Suita existentă depinde de `localStorage` și de parolele din cod | ridicat | adaptare în paralel cu fiecare domeniu; P7 numai cu aprobare (B10 §4) |
| R-3 | Mecanismul Passenger / cPanel (butoane, restart, rularea scripturilor) neconfirmat (K2) | mediu | testul minim la 5.1, cu aprobare; alternativa S2 (G3) |
| R-4 | Drizzle < 1.0 | mediu | fixare exactă; migrații SQL versionate, portabile |
| R-5 | Cod propriu pentru EXIF / semnături / UAT | mediu | teste unitare cu fișiere reale și malformate |
| R-6 | Pierderea accesului `super_admin` (TOTP) | mediu | ~~DN-18~~ **[SET-A-02] 2.15:** coduri de recuperare de unică folosință + resetare de către alt `super_admin`; recomandare: minimum 2 `super_admin` activi |
| R-7 | Spam către Primărie înainte de moderare | mediu | B7 + DN-22 + comutatorul A17-4. **[SET-01]** redus: transmiterea se face numai la cererea cetățeanului (pct. 7); **[SET-A-02]** + maximum 3 transmiteri / cont / 24 h (2.14) |
| R-8 | Performanța `scrypt` pe 1 vCPU partajat | mic–mediu | parametri moderați (DN-15); limite la login |
| R-9 | Rotirea greșită a `PARTICIPATION_HMAC_SECRET` | mic | regulă documentată (§5); rotire numai fără sondaje deschise |
| R-10 | ~~Retenție neclarificată~~ **[SET-A-02]** Retenție decisă: 45 de zile (2.5); momentul de referință pentru sesizări și conturi: **K-A02-3**; verificarea juridică rămâne înainte de „date reale” | mediu | B1 §3.9 |
| R-11 | Resurse partajate cu Electrovolt pe staging | mic | T-ISO-5 + numai trafic de test (G3) |
| R-12 | Faza 4 cere „schema completă” înainte de deciziile DN | — | schema este completă ca structură; DN-urile schimbă **valori și permisiuni**, nu entități. **[SET-01]** DN-02 și DN-12 sunt aprobate (fără permisiune nouă; `report_contacts` redus la e-mail). DN-09 a schimbat enum-ul stărilor. Rămân DN-13 (un enum) și P-1…P-13. |
| **R-13** | **[SET-01]** Deciziile din setul 01 modifică reguli consemnate în RULES (5C, 6.6-g, A17-3, A17-5, A17-6, D9-3), care nu sunt încă actualizate în repository | mediu | consemnarea în RULES numai la cererea proprietarului (P-13); până atunci, designul trimite la `FAZA_4_DECIZII_NOI.md` §0 |
| **R-14** | **[SET-01]** `super_admin` nu mai poate marca o sesizare „rezolvată” (DN-09); dacă Primăria nu participă, nicio sesizare nu devine „rezolvată” | mic (comportament voit) | consecința directă a DN-09; confirmarea traducerii tehnice: P-9 |
| **R-15** | **[SET-A-01/02]** Publicarea imediată, **fără nicio moderare** (D9, 2.3), inclusiv a fotografiilor (2.10): conținut abuziv sau date ale unor terți | mediu–ridicat | cont confirmat; politica acceptată (2.9); blocare (2.6); ștergere de către `super_admin`; limite per cont (B7). Risc asumat prin decizie. |
| **R-16** | **[SET-A-01]** Fără domeniul Civic (G7) și fără SMTP în producție nu se pot crea conturi de cetățeni, deci nu se pot depune sesizări | ridicat (blochează utilizarea reală) | dependență de G7 / N3-2 / 5.5; pe dezvoltare și staging: coduri `simulated` / `allowlist` (T-A3) |
| **R-17** | **[SET-A-01]** Ștergerea definitivă nu poate curăța imediat backup-urile și e-mailurile deja trimise | ~~mediu~~ **[SET-A-02] mic** | **[SET-A-02]** rezolvat prin retenție: toate copiile expiră în cel mult 45 de zile (2.5); e-mailul deja primit de Primărie rămâne în afara aplicației (D21) |
| **R-18** | **[SET-A-01]** Regulile din RULES §6 / §11, Planul v1.1 și Master Planul sunt depășite (6.1, 3E, 6.6, D6-2, D9-6, fluxul critic) | mediu | amendament documentar, **numai la cererea proprietarului** (P-13 extins) |
| **R-19** | **[SET-A-02]** Geocodarea depinde de un serviciu extern: disponibilitate, limite de utilizare, atribuire; adresele ajung la terț (numai textul adresei) | mic–mediu | proxy pe server, cache, limite; la eșec sesizarea se salvează fără poziție (2.4); furnizorul concret se fixează la 5.4 (tehnic) |
| **R-20** | **[SET-A-02]** Retenția de 45 de zile poate șterge o sesizare încă `în analiză` sau înainte să fie `rezolvată`, iar harta pierde istoricul | mediu | depinde de momentul de referință **K-A02-3** |

## 9. Stadiul checkpoint-ului Fazei 4 (instrucțiunea §17)

| Criteriu | Stare |
|---|---|
| B1–B8 și B10 proiectate | ✅ **propus** (documentele de mai sus) |
| Schema DB completă | ✅ **structural**; **[SET-A-02]** 30 de tabele (B1 §7); rămâne neînghețată până la K-A02-1…K-A02-4 și aprobarea finală |
| Contractele API complete | ✅ **propus** (B2); detaliile de câmp urmează schemele Zod de la 5.x |
| Arhitectura coerentă | ✅ propus |
| Deciziile restante identificate | ✅ DN-01…DN-24; **[SET-01]** aprobate: DN-01, DN-02, DN-09, DN-12, DN-21, E-3; noi deschise: P-1…P-13. **[SET-A-01]** aprobate: D8–D31, A-1…A-9; deschise: B-3…B-5, B-7…B-14. **[SET-A-02]** aprobate: 2.1–2.15; mai cer decizie: K-A02-1…K-A02-4 + DN-04, DN-05, DN-19 (§E) |
| Contradicțiile rezolvate sau prezentate | ✅ **[SET-01]** K-2, K-3, K-6 închise prin decizie; K-5 modificată; K-1, K-4 deschise; nimic rezolvat tacit |
| Designul revizuit | ❌ **așteaptă auditul ChatGPT** |
| Designul aprobat explicit | ❌ **așteaptă aprobarea proprietarului** |

**Checkpoint-ul Fazei 4 NU este atins.** Faza 5 nu începe.

## 10. Raport scurt

| Întrebare | Răspuns |
|---|---|
| Ce am analizat | documentația aprobată (RULES §11, HANDOFF, Plan v1.1, Master Plan, rapoartele Fazei 3); codul (tipuri, servicii, gărzi de permisiuni, formularul, compresia); versiunile și compatibilitatea dependențelor (npm, numai citire) |
| Documente create | 8 fișiere `.md` (§1), **în afara repository-ului** |
| Decizii deja acoperite | toate deciziile Fazei 3 sunt integrate: N-2 / G1–G10, N-3, D6, D8, D3/D4, N-4, D10 V2, D9, A-17; regulile 5C, 5D, 6.1–6.6 |
| Decizii noi | **DN-01…DN-24** (`FAZA_4_DECIZII_NOI.md`) |
| Contradicții | **K-1…K-6**: T1–T8 nedefinite; audit față de 6.6; textul public al locației față de D6; compatibilitatea unor versiuni recente cu Node 20 (fără încălcare); spamul către Primărie înainte de moderare; anonimizarea în afara listei D8-4. **[SET-01]** K-2, K-3, K-6 închise; K-5 modificată (pct. 7) |
| Ce lipsește pentru checkpoint | revizia ChatGPT; deciziile DN-01…DN-24; aprobarea explicită a designului; apoi înghețarea schemei și a contractelor |
