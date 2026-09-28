# FAZA 4 — B2: API ȘI MODELUL ASINCRON ÎN FRONTEND

**Proiect:** Turnu Măgurele Civic · **Data:** 27.09.2026 · **Stare:** proiect, neînghețat
**Bază:** G1 (REST `/api/v1`, aceeași origine), B1 (modelul de date), B3 / B4 (autentificare, permisiuni), serviciile actuale din `src/services/*`
**Revizia 1 (SET-01, 27.09.2026):** modificările sunt marcate **[SET-01]** (vezi `FAZA_4_DECIZII_NOI.md` §0 și §C).
**Revizia 2 (SET-A-01, 27.09.2026):** D8–D31 și A-1…A-9; modificările sunt marcate **[SET-A-01]** (vezi `FAZA_4_DECIZII_NOI.md` §0.3 și §D).
**Revizia 3 (SET-A-02, 27.09.2026):** 2.1–2.15 + corecturile 1–13; modificările sunt marcate **[SET-A-02]** (`FAZA_4_DECIZII_NOI.md` §0.4).
**Revizia 4 (SET-A-03, 28.09.2026):** K-A02-3, REC-01, B-7, K-A02-4, DN-19; modificările sunt marcate **[SET-A-03]** (`FAZA_4_DECIZII_NOI.md` §0.5).

---

## 1. Convenții comune

| Element | Regulă |
|---|---|
| Bază | `/api/v1`, pe **aceeași origine** cu frontend-ul; fără CORS |
| Format | JSON UTF-8. Excepții: `POST /public/reports` (multipart) și servirea imaginilor. |
| Validare | scheme **Zod** din `shared/` (aceleași și în frontend); orice câmp necunoscut este respins (`strict`) |
| Erori | `{ "error": { "code": "<COD>", "message": "<text RO>", "fields"?: { "<câmp>": "<mesaj>" } } }` |
| Coduri HTTP | 200 / 201 / 204 · 400 (format) · 401 (neautentificat) · 403 (fără permisiune sau stare interzisă) · 404 · 409 (conflict: deja votat, structură blocată, sondaj cu voturi) · 413 (prea mare) · 415 (tip nepermis) · 422 (validare) · 423 (cont blocat — **se raportează ca 401 generic** la login) · 429 (limită; antet `Retry-After`) · 500 / 503 (mesaj generic + ID de corelare) |
| Autentificare | cookie `__Host-civic_sid` (B3). Endpoint-urile `/admin/*` cer sesiune `mfa_state ≠ pending` și permisiunea indicată. **[SET-A-01]** Endpoint-urile `/citizen/*` cer o sesiune de cetățean (`principal_type = citizen`), în același cookie (propunere tehnică). O sesiune de cetățean nu are acces la `/admin/*` și invers. |
| CSRF | pe metodele POST, PUT, PATCH, DELETE: antetul `X-Civic-Request: 1` + verificarea `Origin` (B3 §3) |
| Paginare | liste Admin: `?limit=<≤100>&cursor=<ULID>`, sortare descrescătoare după ID sau dată; răspunsul conține `{ items, nextCursor }`. Listele publice sunt mici și nepaginate, cu excepția comunicatelor și a arhivei de sondaje. |
| Idempotență | depunerea sesizării: antetul `Idempotency-Key` (UUID); votul: unicitatea jetonului (B7) |
| Limite | corp JSON ≤ 64 KB; multipart ≤ 4 fișiere, fiecare ≤ 3 MB (**propunere**, DN-15) |
| Date | ISO 8601 UTC în API |
| Antete de securitate | prin `@fastify/helmet`: CSP restrictiv (tile-urile OSM ~~și imaginile comunicatelor, DN-19~~; **[SET-A-03]** **DN-19 (C):** imaginile comunicatelor sunt servite de pe aceeași origine, ca parte a aplicației, deci `img-src` nu permite domenii externe de imagini; T-C9), `nosniff`, `frame-ancestors 'none'` |

## 2. Operații interne (nu sunt HTTP)

Comenzi CLI (același artefact, alt punct de intrare), rulate prin cron sau manual (cPanel / systemd):

| Comandă | Rol | Frecvență (propunere) |
|---|---|---|
| `outbox:process` | procesează coada de e-mail (retry, lease) | la 2 minute |
| `purge:email-bodies` | șterge corpurile mai vechi de 45 de zile (N3-8). **[SET-A-03]** Pentru e-mailurile fără sesizare; cele legate de o sesizare sunt șterse integral de `purge:retention` (REC-01) | zilnic |
| `purge:rate-limits`, `purge:rejected` (30 de zile), `purge:sessions`, `purge:pow` | curățare | zilnic |
| ~~`purge:contacts`~~ | **[SET-01] eliminat** (DN-12: fără funcție de anonimizare). Tratamentul e-mailului la expirarea retenției: DN-11 (deschis). | — |
| `surveys:close-expired` | **[SET-01] E-3:** trece în `closed` sondajele cu `end_at` depășit (audit, actor `system`); P-11 | la 5 minute (propunere) |
| `purge:retention` | **[SET-A-02] 2.5:** ștergerea datelor mai vechi de 45 de zile (B1 §3.9; ~~momentul de referință pentru sesizări și conturi: K-A02-3~~ **[SET-A-03]** sesizările și toate datele lor: 45 de zile de la depunere, K-A02-3 + REC-01; conturile și datele fără sesizare: REC-02, deschis) | zilnic |
| `backup:db` | export DB + arhiva fotografiilor (staging: G3, condiția 6) | zilnic |
| `migrate` | rulează migrațiile (DN-20) | la deploy |
| `seed:config`, `seed:demo` | seed-uri (`seed:demo` refuzat în producție) | la cerere |
| `bootstrap-admin` | primul `super_admin` (D8-5) | o dată |
| `check:no-demo` | verificarea la pornire (D10-3); rulează automat la start în producție | la start |

## 3. API public (fără autentificare, numai citire)

| Metodă | Endpoint | Răspuns | Reguli / sursa actuală |
|---|---|---|---|
| GET | `/health` | `{ status: "ok"\|"degraded", version }` | fără detalii interne (T-RUN-2) |
| GET | `/public/announcements?type=&sort=published_desc\|event_date_asc&limit=&cursor=` | listă | numai `published` și neexpirate (`getAll` public) |
| GET | `/public/announcements/highlights` | `{ latest, latestEvent, urgentAlert, counts }` | `getLatest`, `getLatestEvent`, `getUrgentAlert`, `getCounts` |
| GET | `/public/announcements/:id` | comunicat | 404 dacă nu este public (`getPublicById`) |
| GET | `/public/directory` | instituție + direcții, servicii, linkuri **active** | `getCityHallInfo`; `registry_email` apare **numai ca informație** (D10-6) |
| GET | `/public/quickdial` | categorii + contacte **active**, inclusiv urgențele | `getCategories`, `getAllContacts`, `getEmergencyContacts`  **[SET-A-02] E-7:** include `countsByCategory` |
| GET | `/public/report-categories` | categorii active | `getCategories` |
| GET | `/public/map-reports` | `PublicMapReport[]`: `referenceNumber`, `categoryId`, `categoryName`, `publicDescription`, `publicLocation { text, lat, lng }` **rotunjite la 4 zecimale**, `photoUrl?`, `createdAt`, ~~`isAnonymous`~~ (**[SET-A-02]** eliminat, 2.8), **[SET-A-02]** `locationApproximate` (2.4), **[SET-A-01]** `status` (`new` / `in_analysis` / `resolved`, A-7) | ~~numai `approved` +~~ **[SET-A-01] A-2 / D9:** orice sesizare existentă cu coordonate valide **în UAT** (2.12), **imediat** după depunere; ~~(fără pin: B-4)~~ **[SET-A-02] 2.4:** sesizările fără poziție validă nu apar pe hartă până la corectare; fără ID intern, ~~stadiu,~~ asumare, preluare, autor sau e-mail (D9, A-7, A-8) |
| GET | `/public/photos/:photoId` | imaginea (`image/webp` sau `image/jpeg`) | numai **fotografia principală** (`ordinal = 1`) a unei sesizări ~~`approved`~~ **[SET-A-01]** existente, cu coordonate; altfel 404. După ștergere: 404 (D20). (B-12: fotografii publicate fără verificare) |
| GET | `/public/surveys?state=open\|closed&limit=&cursor=` | sondaje deschise / **arhiva** celor încheiate (D3) | emite cookie-ul de participare dacă lipsește (N4-3); arhiva include `integrityFlag` și nota. **[SET-01] E-3:** un sondaj cu `end_at` depășit apare în arhivă (`closed`) fără acțiune manuală. |
| GET | `/public/surveys/:id` | structura sondajului (întrebări, opțiuni) | numai deschise sau încheiate publice; `draft` → 404 |
| GET | `/public/surveys/:id/results` | agregate (număr și procent per opțiune; numărul răspunsurilor libere, **fără text**) | conform `results_visibility` (D3): `live` → oricând; `after_close` → după închidere; ~~`admin_only` → 404~~ **[SET-A-02]** eliminat (corectura 1) |
| GET | `/public/surveys/:id/pow-challenge` | provocarea proof-of-work (dacă este activă) | N4-5 |

## 4. API cetățean

**[SET-A-01]** Votul și dezabonarea rămân **fără cont** (N4-2, D17). Depunerea sesizării cere **cont confirmat** (A-9), vezi §4.1–§4.2.

| Metodă | Endpoint | Request | Răspuns | Erori | Efect DB |
|---|---|---|---|---|---|
| ~~POST~~ | ~~`/public/reports`~~ → **[SET-A-01] mutat la `POST /citizen/reports` (§4.2)** | multipart: partea `data` (JSON: `categoryId`, `description`, `location { text, lat?, lng?, source, gpsAccuracyM? }`, **[SET-01]** `email?` (C-1: fără nume și telefon; obligativitatea: P-6), `publicationPreference`, `notifyOptIn`, **[SET-01]** `transmitToCityHall` (boolean, pct. 7; înlocuiește `contactShareConsent`), câmpurile anti-abuz `hp` (capcană, gol) și `formStartedAt`) + `photos[]` (≤ 4); antet `Idempotency-Key` | **201** `{ referenceNumber, createdAt }` | 413, 415, 422 (inclusiv coordonate în afara UAT), 429 | tranzacție: contor `TM` + `reports` (`resolution_status = new`) + `report_contacts` (numai e-mail) + `report_photos` + `email_outbox` (confirmare dacă există e-mail; **[SET-01]** Primărie **numai dacă** `transmitToCityHall = true` **și** fluxul este activ) (B5) |
| POST | `/public/surveys/:id/submissions` | `{ answers: [{ questionId, value }], hp, formStartedAt, pow? }`; cookie de participare | **201** `{ recorded: true }` | 403 (închis), **409 (deja votat)**, 422, 429, 400 (`pow` invalid) | `survey_submissions` + `survey_answers`; `first_submission_at` la primul vot; respingerile în `rejected_attempts` |
| GET | `/public/notifications/unsubscribe?token=` | — | informații pentru confirmare (numărul `TM`, fără alte date) | 404 (jeton invalid) | niciunul (GET nu modifică nimic, ca linkurile să nu fie declanșate de scanere) |
| POST | `/public/notifications/unsubscribe` | `{ token }` | 204 | 404 | `reports.notify_unsubscribed_at` (D9-2) |

### 4.1 [SET-A-01] Contul cetățeanului (D29–D31, A-4, A-9). Propunere tehnică: autentificare prin cod pe e-mail (T-A2)

| Metodă | Endpoint | Request | Răspuns | Reguli / efect DB |
|---|---|---|---|---|
| POST | `/citizen/auth/start` | `{ email, policyAccepted }` (**[SET-A-02] 2.9:** `policyAccepted = true` + versiunea politicii, obligatorii la crearea unui cont nou; altfel 422) | **202** generic (același răspuns dacă contul există sau nu) | creează contul `pending` dacă nu există (D30: un e-mail = un cont); generează un cod (`confirm` sau `login`); pune în coadă `citizen_login_code`; limite anti-abuz (B7, T-A7). **[SET-A-03]** **K-A02-4:** dacă e-mailul are o blocare **definitivă** activă și nu există cont, contul **nu** se creează și nu se trimite cod; răspunsul rămâne același 202 (fără enumerare; T-C7) |
| POST | `/citizen/auth/verify` | `{ email, code }` | 200 + cookie de sesiune | codul valid, neexpirat, nefolosit; prima verificare → `status = active` (D31); 401 generic la eșec; numărul de încercări limitat |
| POST | `/citizen/auth/logout` | — | 204 | revocă sesiunea |
| GET | `/citizen/me` | — | `{ email, blocked: { active, kind, endsAt? } }` | **[SET-A-02]** utilizatorul vede că depunerea îi este blocată și, pentru o blocare temporară, termenul (decizie tehnică; nota internă nu se afișează) |

### 4.2 [SET-A-01] Sesizările proprii (D19–D22, D27–D28, A-6)

| Metodă | Endpoint | Request | Răspuns | Erori | Efect DB |
|---|---|---|---|---|---|
| POST | `/citizen/reports` | ca vechiul `POST /public/reports`, **fără** câmpul `email` (e-mailul este al contului, A-9): `categoryId`, `description`, `location { text, lat?, lng?, source: pin\|gps_pin\|geocoded\|text, approximate? }` (**[SET-A-02]** 2.4; coordonatele în afara UAT → 422, 2.12), ~~`publicationPreference`~~ (**[SET-A-02]** eliminat, 2.8), `notifyOptIn`, `transmitToCityHall`, `hp`, `formStartedAt` + `photos[]`; `Idempotency-Key` | **201** `{ referenceNumber, createdAt }` | 401 (fără sesiune), **403 (cont blocat, D15)**, **[SET-A-02] 429 dacă `transmitToCityHall = true` și contul a cerut deja 3 transmiteri în ultimele 24 h (2.14)**, 413, 415, 422, 429 | tranzacție: contor `TM` + `reports` (`author_account_id`, `resolution_status = new`) + `report_photos` + `email_outbox` (confirmare către e-mailul contului; Primărie numai cu `transmitToCityHall` + flux activ). **Publicată imediat** (D9). |
| GET | `/citizen/reports` | — | listă: `referenceNumber`, `status`, informațiile publice (D27–D28) | 401 | — (fără starea transmiterii, coadă sau procesare internă, D28) |
| GET | `/citizen/reports/:tm` | — | aceleași câmpuri ca `PublicMapReport` + `status` (D28) | 404 dacă nu este a contului | — |
| DELETE | `/citizen/reports/:tm` | — | 204 | 404 dacă nu este a contului | **ștergere definitivă** (B1 §3.8), indiferent de stare (D22); fără notificare către Primărie (D23); permisă și cu blocare activă (D15). **[SET-A-03]** Fără rând de audit (B-7) |
| DELETE | **[SET-A-02]** `/citizen/account` | — | 204 | 401 | **2.7:** ștergerea contului; sesizările rămân (`author_account_id = NULL`), conform retenției; identitatea autorului nu este publică; sesiunile și codurile se șterg; blocările rămân asociate `email_hash` (B1 §3.7). **[SET-A-03]** O blocare definitivă se reduce la datele minime și împiedică recrearea contului (K-A02-4, T-C6, T-C7) |
| GET | **[SET-A-02]** `/citizen/geocode?address=` | — | `{ lat, lng, approximate: true }` sau 404 | 429 | **2.4:** geocodarea adresei (stradă + număr), prin serverul propriu (proxy către serviciul configurat în `GEOCODER_URL`, decizie tehnică); rezultat numai în UAT; nu se stochează. Utilizatorul verifică pinul propus și îl poate muta. |

## 5. Autentificare

| Metodă | Endpoint | Request | Răspuns | Reguli |
|---|---|---|---|---|
| POST | `/auth/login` | `{ email, password }` | 200 `{ mfa: "required"\|"enroll"\|"none", mustChangePassword }` + cookie | 401 generic; 429; blocarea contului răspunde tot 401 generic |
| POST | `/auth/mfa/verify` | `{ code }` | 200 + cookie rotit | numai sesiune `pending`; anti-reluare |
| POST | **[SET-A-02]** `/auth/mfa/recovery` | `{ code }` | 200 + cookie rotit | **2.15-A:** cod de recuperare de unică folosință, în locul codului TOTP; audit; recomandă reconfigurarea TOTP |
| POST | **[SET-A-02]** `/auth/mfa/recovery-codes/regenerate` | — | `{ codes[] }` (afișate o singură dată) | numai sesiune completă; invalidează setul anterior; audit |
| POST | `/auth/mfa/enroll/start` | — | `{ otpauthUri, secretBase32 }` (o singură dată) | numai sesiune `pending` fără TOTP activ |
| POST | `/auth/mfa/enroll/confirm` | `{ code }` | 200 + cookie rotit | activează TOTP |
| POST | `/auth/change-password` | `{ currentPassword, newPassword }` | 204 | revocă celelalte sesiuni |
| POST | `/auth/logout` | — | 204 | revocă sesiunea |
| GET | `/auth/me` | — | `{ id, displayName, role, permissions[], mustChangePassword, mfaEnabled }` | frontend-ul folosește `permissions[]` numai pentru afișare |

## 6. API Admin

Toate endpoint-urile cer sesiune completă (MFA verificat, dacă este aplicabil) și permisiunea indicată. Codul 403 apare la lipsa permisiunii sau la o stare interzisă.

### 6.1 Sesizări

| Metodă | Endpoint | Permisiune | Request / răspuns | Reguli / efect |
|---|---|---|---|---|
| GET | `/admin/reports?`~~`moderation=&`~~`resolution=&category=&takenOver=&q=&limit=&cursor=` | `reports.view` | listă **fără date de contact** | `getAllReports`. **[SET-A-02]** filtrul de moderare eliminat (2.3). **[SET-01]** `resolution` ∈ {`new`, `in_analysis`, `resolved`}. |
| GET | `/admin/reports/:id` | `reports.view` | detaliu ~~**cu** contact (**[SET-01]** numai e-mail)~~ **[SET-A-01] A-8:** e-mailul autorului **numai în răspunsul pentru `super_admin`** (drept exclusiv, B4 §2.4); `primarie_operator` nu îl primește, fotografii (URL-uri Admin), răspunsuri (**[SET-A-02]** numai note interne), responsabili (nume afișate), **[SET-01]** `transmitToCityHall`, starea transmiterii către Primărie (A17-7; „nesolicitat”, P-12), ~~jurnalul e-mail fără corp~~ **[SET-A-02] 2.11 + corectura 3:** jurnalul e-mailurilor **numai în răspunsul pentru `super_admin`**; `primarie_operator` vede numai starea derivată a transmiterii (oprit / în așteptare / în coadă / trimis / eșuat / nesolicitat), fără destinatari | ~~6.6: contactul este vizibil ambelor roluri~~ **[SET-A-01]** înlocuit de A-8 |
| GET | `/admin/reports/by-reference/:tm` | `reports.view` | idem | `getReportByReferenceNumber` |
| GET | `/admin/reports/:id/photos/:photoId` | `reports.view` | imaginea | orice fotografie (1–4) |
| ~~PATCH~~ | ~~`/admin/reports/:id/moderation`~~ | ~~`reports.moderate`~~ | — | **[SET-A-02] eliminat (2.3):** nu există moderare; închide B-3 / B-13 |
| PATCH | `/admin/reports/:id/resolution` | `reports.resolve` | `{ status }` | **[SET-01] DN-09:** numai `new` → `in_analysis` și `in_analysis` → `resolved`; orice altă tranziție → 409. ~~`in_analysis`: nedecis (P-1).~~ **[SET-A-02] 2.1:** `in_analysis` **nu se poate seta prin API**: îl setează automat sistemul, la trimiterea efectivă a e-mailului către Primărie (→ 409 dacă se cere manual). Endpoint-ul acceptă numai `resolved`. **`resolved`:** numai `actsForCityHall` + `primaria_mode = platform` (P-9; `super_admin` → 403). Notificări (2.2): numai la `new → in_analysis` și `in_analysis → resolved`. |
| POST | `/admin/reports/:id/assume` | `reports.resolve`, **fără** `actsForCityHall` | — | idempotent (200 `{ changed:false }`). **[SET-01] C-3:** nu mai schimbă starea (6.6-g modificat). **DN-02:** fără rând în `audit_log`. |
| DELETE | `/admin/reports/:id/assume` | `reports.resolve` | — | numai propria asumare; 409 dacă nu era asumată. **[SET-01] DN-02:** fără rând în `audit_log`. |
| POST | `/admin/reports/:id/takeover` | `reports.resolve` **+** `actsForCityHall` | — | ireversibil, idempotent; eveniment D9 (dacă modul Primăriei = `platform`, A17-8). **[SET-01] C-3:** nu schimbă starea. |
| POST | `/admin/reports/:id/responses` | `reports.reply` | `{ message }` (**[SET-A-02]** ~~`kind`~~ eliminat) | **[SET-A-02]** numai **note interne**; nu generează nicio notificare (2.2) |
| PATCH | `/admin/reports/:id/location` | ~~`reports.moderate` (DN-03)~~ **[SET-A-02] drept exclusiv `super_admin`** (2.11) | `{ lat, lng, text?, reason }` | validare UAT (2.12); audit cu valorile inițiale (D6-5); `location_source = admin_corrected`; o sesizare fără poziție devine vizibilă pe hartă (2.4) |
| POST | `/admin/reports/:id/emails/:emailId/retry` | ~~`reports.resolve` (DN-03)~~ **[SET-A-02] drept exclusiv `super_admin`** (2.11) | — | numai pentru `failed` (A17-9) |
| ~~POST~~ | ~~`/admin/reports/:id/contact/anonymize`~~ | — | — | **[SET-01] eliminat** (DN-12: fără funcție de anonimizare, fără a 4-a permisiune). Închide O-1 / E-4. |
| GET | `/admin/reports/stats` | `reports.view` | contoare (~~moderare,~~ stadii, fără poziție; **[SET-A-02]** eșecurile e-mail numai pentru `super_admin`) | `getModerationStats` + indicatorul A17-9 |
| ~~—~~ | ~~ștergere~~ | — | ~~**nu există**~~ | ~~6.1~~ **[SET-A-01] abrogat (A-1)** |
| DELETE | `/admin/reports/:id` | **drept exclusiv `super_admin`** (A-5; nu este permisiune) | — → 204 | ștergere definitivă, necondiționată, fără motiv obligatoriu (D10–D12); B1 §3.8; audit: ~~**B-7 (deschis)**~~ **[SET-A-03]** **B-7:** fără rând de audit; rândurile de audit ale sesizării se șterg (B1 §3.8, pasul 6) |

### 6.2 Comunicate

| Metodă | Endpoint | Permisiune | Reguli |
|---|---|---|---|
| GET | `/admin/announcements?type=&status=&cursor=` | `announcements.view` | include ciornele și comunicatele expirate |
| POST | `/admin/announcements` | `announcements.create` + permisiunea stării țintă | 6.5. **[SET-A-03]** **DN-19:** `imageUrl` acceptă numai calea unei imagini publicate cu aplicația (lista din build); altfel 422 (T-C9) |
| PATCH | `/admin/announcements/:id` | `announcements.edit` (+ permisiunea stării, dacă se schimbă) | 6.5. **[SET-A-03]** aceeași validare a `imageUrl` (DN-19, T-C9) |
| PATCH | `/admin/announcements/:id/status` | `announcements.publish` / `announcements.disable` | — |
| — | ștergere, reset | — | **nu există** (5B, D4) |

### 6.3 Ghidul Primăriei și Apelul rapid

| Metodă | Endpoint | Permisiune |
|---|---|---|
| GET | `/admin/directory` | `directory.view` (include elementele inactive) |
| PATCH | `/admin/directory/institution` | `directory.institution.edit` (câmpurile scalare; **nu** destinatarul notificărilor) |
| PUT | `/admin/directory/schedule`, `/admin/directory/audience` | `directory.schedule.manage` |
| POST, PATCH, DELETE, PATCH `…/toggle`, PUT `…/order` | `/admin/directory/departments[/:id]` | `directory.departments.manage` (DELETE → 409 dacă există servicii) |
| idem | `/admin/directory/services[/:id]` | `directory.services.manage` |
| idem | `/admin/directory/links[/:id]` | `directory.links.manage` |
| GET | `/admin/quickdial` | `quickDial.view` (**[SET-A-02] E-7:** include `countsByCategory`) |
| POST, PATCH, DELETE, PUT `…/order` | `/admin/quickdial/categories[/:id]` | `quickDial.categories.manage` (DELETE → 409 dacă există contacte) |
| POST, PATCH, DELETE, PATCH `…/toggle`, PUT `…/order` | `/admin/quickdial/contacts[/:id]` | `quickDial.contacts.manage` |

La modificarea datelor de referință se pot completa `verifiedAt` și `verifiedSource` (D10-6).

### 6.4 Sondaje

| Metodă | Endpoint | Permisiune | Reguli |
|---|---|---|---|
| GET | `/admin/surveys?status=` | `surveys.view` | — |
| GET | `/admin/surveys/:id` | `surveys.view` | — |
| POST | `/admin/surveys` | `surveys.create` (+ permisiunea stării) | validarea structurii (`validateSurveyStructure`) |
| PUT | `/admin/surveys/:id` | `surveys.edit` | **409** dacă se modifică întrebările sau opțiunile după primul vot; textele descriptive și `end_at` (prelungire / închidere anticipată) rămân permise, cu audit (D3/D4) |
| PATCH | `/admin/surveys/:id/status` | `surveys.activate` / `surveys.close` / `surveys.edit` | 6.5 |
| DELETE | `/admin/surveys/:id` | `surveys.create` SAU `surveys.edit` | **409** dacă are voturi (D3/D4) |
| GET | `/admin/surveys/:id/results` | `surveys.view` | agregate, indiferent de vizibilitatea publică |
| GET | `/admin/surveys/:id/free-text` | `surveys.edit` + sondaj **închis** (N4-9, DN-03) | audit la fiecare consultare |
| PATCH | `/admin/surveys/:id/integrity` | `surveys.edit` | `{ flag, note }` (N4-10); audit |
| PATCH | `/admin/surveys/:id/pow` | `surveys.edit` | `{ enabled }` (N4-5) |
| GET | `/admin/surveys/:id/rejections` | `surveys.view` | agregate pe motiv și oră (N4-8) |
| — | reset demo | — | **nu există în producție** (D4) |

### 6.5 Conturi, setări, audit, jurnal e-mail, tablou de bord

| Metodă | Endpoint | Permisiune | Reguli |
|---|---|---|---|
| GET | `/admin/accounts` | `accounts.manage` | — |
| POST | `/admin/accounts` | `accounts.manage` | `{ email, displayName, role }` → parolă temporară afișată o dată (D8) |
| PATCH | `/admin/accounts/:id` | `accounts.manage` | `{ role?, status?, displayName? }`; protecții: nu pe sine însuși (rol, stare), nu ultimul `super_admin` activ |
| POST | `/admin/accounts/:id/reset-password` | `accounts.manage` | parolă temporară; revocarea sesiunilor |
| POST | `/admin/accounts/:id/reset-mfa` | `accounts.manage` | ~~DN-18~~ **[SET-A-02] 2.15-B:** resetarea TOTP a **altui** `super_admin`; procedură distinctă, auditată; revocă sesiunile și codurile de recuperare ale contului |
| GET | `/admin/accounts/directory` | `reports.view` | numai `{ id, displayName }` pentru afișarea responsabililor (înlocuiește `getDisplayNameById`) |
| GET / PUT | `/admin/settings/registry` | `notifications.recipient.manage` (**[SET-01]** numele aprobat, DN-01; acoperirea comutatorului, a modului și a referinței acordului: P-10) | `{ recipientEmail, flowEnabled, primariaMode, agreementReference }`; `flowEnabled = true` se refuză dacă lipsesc `recipientEmail` sau `agreementReference`, ~~sau dacă modul e-mail nu este `live`~~ **[SET-A-02] corectura E-5:** în `live` se cer destinatarul și referința acordului (A17-1); în `allowlist` (staging), numai dacă destinatarul este în `EMAIL_ALLOWLIST`; în `simulated`, permis (nu pleacă nimic). **2.13:** la trecerea `flowEnabled` din `false` în `true`, toate rândurile `on_hold` trec automat în `queued`. |
| GET | `/admin/audit?actor=&action=&target=&from=&to=&cursor=` | `audit.view` | — |
| GET | `/admin/email-log?status=&kind=&cursor=` | ~~`audit.view`~~ **[SET-A-02] drept exclusiv `super_admin`** (2.11) | fără corpuri |
| GET | `/admin/dashboard` | `dashboard.view` | contoare agregate |
| GET | **[SET-A-01]** `/admin/citizens?q=&blocked=&cursor=` | **drept exclusiv `super_admin`** (A-5, A-8) | e-mail, stare, data creării, numărul de sesizări, blocarea activă |
| POST | **[SET-A-01]** `/admin/citizens/:id/blocks` | **drept exclusiv `super_admin`** (D13, A-5) | `{ kind: "temporary"\|"permanent", ~~endsAt?,~~ note? }`; D14–D16. **[SET-A-03]** **K-A02-4:** `temporary` = 15 zile, `ends_at` calculat de server (o durată trimisă de client → 400); `permanent` = fără expirare automată |
| POST | **[SET-A-01]** `/admin/citizens/:id/blocks/:blockId/lift` | **drept exclusiv `super_admin`** | ~~B-8 (deschis)~~ **[SET-A-02] 2.6:** ridicarea manuală a unei blocări **temporare** înainte de termen; audit. O blocare permanentă se ridică tot prin acest endpoint (decizie tehnică: altfel ar deveni ireversibilă). **[SET-A-03]** O blocare temporară expiră automat după 15 zile (K-A02-4); ridicarea manuală a unei blocări definitive rămâne propunere tehnică (T-B10), neconfirmată. |

## 7. Modelul asincron în frontend (B2, faza 5.3 și următoarele)

| Element | Proiect |
|---|---|
| Client API | un modul unic (`src/api/client.ts`): `fetch` + antetul CSRF + tratarea uniformă a erorilor (tipuri din `shared/`) |
| Servicii | semnăturile existente se păstrează acolo unde se poate, dar returnează `Promise`. Aproximativ 140 de apeluri din `views/` și `components/` se adaptează **incremental**, pe domenii: 5.3 conținut public, 5.4 sesizări, 5.6 sondaje. |
| Stări UI | încărcare / eroare / gol, pentru fiecare listă și formular; fără UI optimist la operațiile Admin |
| Autentificare | `authService` devine client al `/auth/*`; starea vine din `/auth/me`; **fără date în `localStorage`** |
| **[SET-A-02]** Formularul de sesizare | fără alegerea „Public / Public anonim” (2.8); locația: punct pe hartă / poziția curentă **sau** adresă geocodată cu pin aproximativ, verificabil de utilizator (2.4); opțiunea „Transmite către Primărie” (pct. 7) |
| **[SET-A-02]** Contul | bifa obligatorie pentru politica de utilizare la creare (2.9); ștergerea contului (2.7) |
| **[SET-A-02]** Admin | fără ecran și butoane de moderare (2.3); fără butoanele „Reset Demo” (D4, corectura E-6); câmpul `registryEmail` din Ghid rămâne pur informativ (A17-2, E-6); indicatorul „pe hartă” = are poziție validă (E-7) |
| **[SET-A-01]** Zona cetățeanului | ecran nou „Contul meu” (introducerea e-mailului, codul, lista proprie, ștergerea, D27, A-6); butonul „Depune o sesizare” cere autentificarea (A-9); restul aplicației rămâne fără cont; fără date personale în `localStorage` |
| **[SET-A-01]** Harta | afișează starea (A-7); publicarea fără moderare (A-2) |
| **[SET-A-03]** Blocarea (Admin) | alegerea între **15 zile** și **definitiv** (K-A02-4); fără câmp de durată |
| **[SET-A-03]** Comunicatele | imaginile se adaugă în repository și se publică odată cu versiunea aplicației (DN-19); în Admin, câmpul imaginii alege numai dintre imaginile publicate (T-C9); fără încărcare de imagini, fără CDN sau stocare externă |
| Abonări (`subscribe`) | se înlocuiesc cu reîncărcarea explicită după o mutație |
| Tipuri | din `shared/`; se elimină câmpurile care nu mai ajung în client (contact în liste, ID-uri interne publice) |
| Tranziție | fiecare domeniu trece complet pe API într-o singură subfază; nu există perioade cu date mixte `localStorage` / API pentru același domeniu |
