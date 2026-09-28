# FAZA 4 — PROIECTAREA BACKEND-ULUI: ARHITECTURĂ ȘI INDEX

**Proiect:** Turnu Măgurele Civic · **Data:** 27.09.2026
**Instrucțiune:** „FAZA 4 — ÎNCEPERE PROIECTARE BACKEND”
**Executant:** Claude · **Auditor:** ChatGPT · **Aprobare:** Sergiu

> **Revizia 7, versiune curată (28.09.2026).** Conține numai regulile valabile. Istoricul reviziilor 1–6 (text tăiat, marcaje de set) este în `istoric/revizia_6_adnotata/`; sursa fiecărei decizii este în `FAZA_4_REGISTRU_DECIZII.md`. Valorile marcate „propunere” sau „propunere tehnică” se confirmă la auditul final.
>
> **Stare:** design complet, **neînghețat**, pregătit pentru **auditul final**. Nicio decizie de produs deschisă. Checkpoint-ul Fazei 4 **nu este atins** până la audit și aprobarea proprietarului.
>
> **Nu s-a implementat nimic:** nu există `server/` sau `shared/`, `package.json` este neschimbat, nu există migrații sau endpoint-uri, nicio acțiune pe hosting, DNS, MySQL sau VPS. Documentele sunt în repository, pe branch-ul `recovery-etapa-5-0e2cc20`; `main` = `d9bc2c9`, neatins.

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
| `FAZA_4_REGISTRU_DECIZII.md` | **registrul deciziilor valabile ale Fazei 4** (cu sursa fiecăreia), regulile din RULES înlocuite, propunerile tehnice de confirmat la audit |
| `istoric/` | instrucțiunile, rapoartele de modificări și versiunile adnotate ale reviziilor anterioare |

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
 /citizen/*: cont prin cod pe e-mail, sesizările proprii
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
| Dezvoltare | Node 24 (+ 20 în CI) | MySQL 8.4 local (DN-07; sistemul de operare: **Windows 11**) | `simulated` | demo (seed) | G3 |
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
| `UAT_BOUNDARY_FILE` | fișierul GeoJSON al limitei UAT Turnu Măgurele (**2.12**: verificare obligatorie pe server; sursa: limita administrativă OSM, ODbL, cu atribuire, verificată vizual de proprietar față de o sursă oficială; propunere tehnică T-B6) | nu |
| `GEOCODER_URL`, `GEOCODER_USER_AGENT` | serviciul de geocodare pentru adrese (2.4): **serviciul public OpenStreetMap Nominatim** (A06-5), apelat numai de server (proxy), cu respectarea politicii lui de utilizare (maximum o cerere pe secundă, `User-Agent` identificabil, atribuirea „© OpenStreetMap”), cache scurt și limite. În CI: serviciu simulat. | nu |
| `RETENTION_DAYS` | 45 (2.5, K-A02-3); nu se poate seta peste valoarea aprobată fără decizie | nu |
| `ADMIN_RETENTION_MONTHS` | 6 (A04-4, A05-1, A05-2): auditul administrativ, jurnalele aplicației, sesiunile expirate, textele libere din sondaje | nu |
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
| R-6 | Pierderea accesului `super_admin` (TOTP) | mediu | **2.15:** coduri de recuperare de unică folosință + resetare de către alt `super_admin`; recomandare: minimum 2 `super_admin` activi |
| R-7 | Spam către Primărie | mediu | transmiterea numai la cererea cetățeanului (pct. 7); maximum 3 transmiteri / cont / 24 h (2.14); comutatorul A17-4; proof-of-work activabil (B7) |
| R-8 | Performanța `scrypt` pe 1 vCPU partajat | mic–mediu | parametri moderați (DN-15); limite la login |
| R-9 | Rotirea greșită a `PARTICIPATION_HMAC_SECRET` | mic | regulă documentată (§5); rotire numai fără sondaje deschise |
| R-10 | Retenția: datele sesizării 45 de zile de la depunere (K-A02-3, REC-01); contul fără ștergere automată (A04-2); auditul administrativ, jurnalele, sesiunile expirate 6 luni; textele libere 6 luni de la închiderea sondajului (A06-1). Verificarea juridică rămâne obligatorie înainte de „date reale”. | mediu | B1 §3.9 |
| R-11 | Resurse partajate cu Electrovolt pe staging | mic | T-ISO-5 + numai trafic de test (G3) |
| R-12 | Valorile numerice (DN-15) sunt propuneri | mic | configurabile; se ajustează în 5.x pe baza testelor |
| **R-13** | Deciziile Fazei 4 modifică reguli consemnate în RULES §6 / §11, încă neactualizate | mediu | P-13, la cererea proprietarului, înainte de Faza 5; până atunci, sursa de adevăr este `FAZA_4_REGISTRU_DECIZII.md` |
| **R-14** | `super_admin` nu poate marca o sesizare „rezolvată”; dacă Primăria nu participă, nicio sesizare nu devine „rezolvată” | mic (comportament voit) | consecința directă a DN-09 și a regulii „`rezolvată` numai prin subcontul Primăriei” (SET-A-02 §3) |
| **R-15** | Publicarea imediată, **fără nicio moderare** (D9, 2.3), inclusiv a fotografiilor (2.10): conținut abuziv sau date ale unor terți | mediu–ridicat | cont confirmat; politica acceptată (2.9); blocare (2.6); ștergere de către `super_admin`; limite per cont (B7). Risc asumat prin decizie. |
| **R-16** | Fără domeniul Civic (G7) și fără SMTP în producție nu se pot crea conturi de cetățeni, deci nu se pot depune sesizări | ridicat (blochează utilizarea reală) | dependență de G7 / N3-2 / 5.5; pe dezvoltare și staging: coduri `simulated` / `allowlist` (T-A3) |
| **R-17** | Ștergerea definitivă nu poate retrage e-mailul deja primit de Primărie și nu curăță automat copiile de siguranță | mic | e-mailul primit de Primărie rămâne în afara aplicației (D21); regula de produs rămâne 45 de zile de la depunere (A04-1); respectarea ei în copiile de siguranță este o **problemă tehnică de implementare** (T-D1), de rezolvat la 5.1 |
| **R-18** | Planul v1.1 și Master Planul sunt depășite (fluxul `Admin → Moderare → Hartă`, conturile de cetățeni) | mediu | amendament documentar, la cererea proprietarului (P-13) |
| **R-19** | Geocodarea depinde de un serviciu extern: disponibilitate, limite de utilizare, atribuire; adresele ajung la terț (numai textul adresei) | mic–mediu | furnizorul: Nominatim public (A06-5); proxy pe server, cache, limite; la eșec, cetățeanul pune pinul manual sau sesizarea se salvează fără poziție (2.4) |
| **R-20** | O sesizare dispare după 45 de zile de la depunere indiferent de stare, inclusiv `în analiză`; harta nu păstrează istoric | mediu | **asumat prin decizie** (K-A02-3) |
| **R-21** | Imaginile comunicatelor există numai în versiunea aplicației (DN-19): o imagine nouă cere o versiune nouă | mic | asumat prin decizie; comunicatele se pot publica și fără imagine |

## 9. Stadiul checkpoint-ului Fazei 4 (instrucțiunea §17)

| Criteriu | Stare |
|---|---|
| B1–B8 și B10 proiectate | ✅ **propus** (documentele de mai sus) |
| Schema DB completă | ✅ 30 de tabele (B1 §7); se îngheață la aprobarea checkpoint-ului |
| Contractele API complete | ✅ **propus** (B2); detaliile de câmp urmează schemele Zod de la 5.x |
| Arhitectura coerentă | ✅ propus |
| Deciziile de produs | ✅ **toate luate**; registrul: `FAZA_4_REGISTRU_DECIZII.md` |
| Contradicțiile rezolvate sau prezentate | ✅ rezolvate prin decizii; documentația curată nu mai conține reguli contradictorii (de verificat la audit) |
| Propunerile tehnice | ⏳ de confirmat la audit (`FAZA_4_REGISTRU_DECIZII.md` §4) |
| Designul revizuit | ❌ **așteaptă auditul ChatGPT** |
| Designul aprobat explicit | ❌ **așteaptă aprobarea proprietarului** |

**Checkpoint-ul Fazei 4 NU este atins.** Faza 5 nu începe.

## 10. Ce urmează

1. Auditul final al Fazei 4 (ChatGPT), pe această versiune curată.
2. Aprobarea checkpoint-ului de către proprietar; înghețarea schemei și a contractelor.
3. P-13: actualizarea RULES, HANDOFF, Planului v1.1 și Master Planului.
4. Faza 5, pe un branch nou dedicat (A04-7).
