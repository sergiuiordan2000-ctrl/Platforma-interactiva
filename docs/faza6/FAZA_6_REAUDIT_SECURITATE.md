# Faza 6, Pasul 4 — Reauditul de securitate

**Data:** 13.10.2026. **Versiunea verificată:** `faza-5-backend` la `55ead0e` (cod identic cu `f982896`, instalat pe staging ca `27b1b5f`).
**Planul:** `docs/faza6/FAZA_6_PLAN.md`, Pasul 4 (S1–S12), regula dovezilor §4.
**Starea:** **în lucru.** S1–S5 și S8–S12 sunt verificate în cod și local; **S7** verificat pe staging la 13.10.2026 (§2, S7). **S6:** evaluat pe varianta B (§2, S6). Probele S1, S2, S4 pe staging sunt încă de făcut. ~~Pasul 4 nu se închide înainte de verificarea `TRUST_PROXY` (D-4).~~ **D-4 (14.10.2026):** verificarea `TRUST_PROXY` a fost făcută, iar închiderea Pasului 4 se aprobă în condițiile variantei B (decizia proprietarului din 14.10.2026, AI-1, varianta A; `FAZA_6_PLAN.md` §0.2); S12 și probele S1, S2, S4 pe staging rămân la deciziile lor.
**Limită:** reauditul este făcut de Claude, care a scris și codul. Auditul independent rămâne cel de la checkpoint.
**Remedierile** sunt consemnate separat de constatări, fiecare cu decizia proprietarului (§1, „Remedieri”, și §3).

## 1. Rezumatul constatărilor noi

| Nr. | Domeniu | Gravitate | Constatarea | Dovada |
|---|---|---|---|---|
| RA-1 | S1 | **medie** | Limita de 5 încercări pentru codul de cetățean poate fi depășită prin cereri simultane | probă locală (§3, RA-1): 30 de cereri simultane → 30 de comparații, `attempts = 30` |
| RA-2 | S4 | **scăzută**; contradicție de design | `POST /citizen/auth/start` fără bifa politicii arată dacă o adresă are cont (422 față de 202) | probă locală: 202 pentru adresa cu cont, 422 pentru adresa fără cont |
| RA-3 | S1 | scăzută | Contorul eșecurilor de parolă Admin și pasul TOTP folosit sunt citiți, apoi scriși (fără operație atomică) | cod (deducție, fără probă) |
| RA-4 | S1 | scăzută | Încercările TOTP sunt limitate pe sesiune (5 / 5 min), nu pe cont | cod |
| RA-5 | S1, S6 | scăzută acum; **ridicată cât timp `TRUST_PROXY` lipsește** | Oricine poate bloca autentificarea Admin: 5 parole greșite blochează un cont 15 min; limita de 20 de autentificări / 15 min pe IP este acum comună tuturor | cod; constatarea 1a din `FAZA_6_TRUST_PROXY.md` |
| RA-6 | S8 | informativă | Fotografiile nu sunt re-codate: se scot metadatele EXIF/XMP/IPTC, dar rămân comentariile JPEG, profilul de culoare și eventuale date după sfârșitul imaginii | cod |
| RA-7 | S9 | informativă | O vulnerabilitate „high” în `source-map-js`, numai în unealta de build (nu ajunge în aplicație); dependențe nefolosite în `package.json` | `npm audit` |
| RA-8 | S10, S11 | informativă | Codul de autentificare al cetățeanului rămâne în clar în `email_outbox.body_text` | cod |
| RA-10 | S11 | scăzută | Erorile rutelor `/api/v1` ocolesc handlerul aplicației: clientul primește mesajul brut al erorii (la 500, de exemplu textul erorii bazei de date, care pe găzduire poate conține numele contului) și mesajele tehnice ale Fastify la 4xx; fără identificator de corelare. Este constatarea R17 (11.10.2026). **Adăugată la 13.10.2026: inițial, S11 a fost trecut greșit „conform”** | probă locală (§3, RA-10) |
| RA-9 | S6 | **blocantă pentru lansare** | Fără adresa reală a vizitatorului, fiecare limită pe IP devine o limită pentru tot orașul (de exemplu 5 sesizări / oră, 10 voturi / oră / sondaj) | `FAZA_6_ANTIABUZ_FARA_IP.md` §1 |

**Remedieri (13.10.2026):** RA-1, RA-2 în `c69c146`. RA-5 (partea comună tuturor) și RA-9: varianta B, deciziile D-B1…D-B5 (`FAZA_6_ANTIABUZ_FARA_IP.md`), în `cb4cc45`, instalată pe staging la 13.10.2026. RA-3, RA-4, RA-6, RA-7, RA-8 (etapa B, deciziile proprietarului din 13.10.2026): în `9a1e08b`. RA-10 (decizia proprietarului din 13.10.2026: A): în `f6d5f2d`. Toate instalate pe staging la 14.10.2026 (`f6d5f2d`, jurnalul staging-ului, intervențiile 55–59).

Nicio constatare critică. Nicio vulnerabilitate care să permită acces fără autentificare la date sau acțiuni protejate.

## 2. Verificările, pe domenii

### S1 — Autentificarea

| Ce | Rezultat | Dovada |
|---|---|---|
| parole Admin: `scrypt` (N=2^15, r=8, p=3), sare de 16 octeți, comparare în timp constant; minimum 12 caractere | conform | `server/src/auth/password.ts`; `shared/src/auth.ts:7` |
| blocare după 5 eșecuri, 15 minute; verificare „falsă” pentru conturi inexistente (fără diferență de timp) | conform; vezi RA-3, RA-5 | `server/src/routes/auth.ts:93–152` |
| limită pe IP la autentificare (20 / 15 min) | conform în cod; **comună tuturor** cât timp `TRUST_PROXY` lipsește (S6) | `auth.ts:97`; `context.ts` `LIMITS` |
| TOTP: secret criptat, protecție la reutilizarea pasului, 5 încercări / sesiune; rotirea sesiunii după MFA | conform; vezi RA-3, RA-4 | `auth.ts:154–175`, `completeLogin` |
| coduri de recuperare: consum atomic (`UPDATE … WHERE used_at IS NULL`) | conform | `auth.ts:177–202` |
| `primarie_operator` fără TOTP | conform designului (B3) | `mfaMode` în `auth.ts` |
| cod pe e-mail: 6 cifre, 15 min, 5 încercări, cod nou anulează codul vechi; limite pe adresă și pe IP | conform în cod; **limita de 5 încercări poate fi depășită** (RA-1) | `server/src/routes/citizens.ts:77–183`; probă |
| Google: PKCE S256, `state`, `nonce`, RS256 cu cheile Google, `iss`, `aud`/`azp`, `exp`, `email_verified`; bifa politicii la fiecare `start` | conform | `server/src/auth/googleOAuth.ts`; `test/integration/citizenGoogle.test.ts` |

### S2 — Sesiunile

| Ce | Rezultat | Dovada |
|---|---|---|
| jeton aleator de 32 de octeți în cookie, numai SHA-256 în baza de date | conform | `server/src/auth/sessions.ts` |
| cookie `__Host-civic_sid`, `HttpOnly`, `Secure`, `SameSite=Strict` (în afara dezvoltării) | conform în cod; pe staging verificat cookie-ul de participare, construit cu aceleași atribute (S7) | `sessions.ts` `setSessionCookie` |
| Admin: 60 min inactivitate, 12 h absolut, 5 min înainte de MFA; cookie de sesiune | conform | `context.ts` `LIMITS` |
| cetățean: fără expirare pe server, cookie de 400 de zile, reînnoit | risc acceptat (decizia din 30.09.2026, varianta B) | `sessions.ts` |
| ieșire și revocare | conform | `auth.ts` `/auth/logout`; `citizens.ts` `/citizen/auth/logout` |
| CSRF: antetul `X-Civic-Request: 1` + `Origin` egal cu originea publică, pe toate cererile care modifică | conform | `server/src/auth/guards.ts` `registerCsrf` |

### S3 — Autorizarea: rută → gardă (generat din `server/src/routes/*.ts`)

Matricea permisiunilor: `shared/src/permissions.ts` (super_admin = 26, primarie_operator = 12; drepturile exclusive super_admin separate), confirmată de `server/test/unit/permissions.test.ts`.

| Grupul | Rute | Garda |
|---|---|---|
| publice (`/public/*`, `/health`, `/robots.txt`) | anunțuri, ghid, apel rapid, categorii, harta, fotografia principală, dezabonare, sondaje (listă, detalii, rezultate, provocare, vot) | fără autentificare; numai proiecții publice (S4) |
| autentificare | `/auth/login`, `/auth/logout`, `/citizen/auth/start`, `/verify`, Google (`/citizen/auth/google`, `/start`, `/callback`) | fără sesiune, cu limite; `/auth/mfa/*` → sesiune înainte de MFA (`pendingOnly`) |
| cetățean | `/citizen/me`, `/citizen/account`, `/citizen/reports` (formular, provocare, depunere, listă, detalii, ștergere), `/citizen/geocode` | `requireCitizen`; detaliile și ștergerea numai pentru propriile sesizări (`ownReport`) |
| Admin, cu permisiune | anunțuri, ghid, apel rapid, sesizări (vedere, rezolvare, răspuns), sondaje, panou, registrul Primăriei, conturi, audit | `requireAdmin({ permission })`, câte una pe rută |
| Admin, numai `super_admin` | ștergerea sesizării, corectarea poziției, retrimiterea e-mailului, jurnalul e-mail, cetățenii (listă, blocare, ridicarea blocării) | `requireAdmin({ superAdminOnly: true })` |
| Admin, gardă generală + verificare în rută | starea anunțului (`announcements.publish` / `.disable`), starea sondajului (`surveys.activate` / `.close` / `.edit`), ștergerea sondajului (`surveys.create` sau `.edit`), regenerarea codurilor de recuperare (orice Admin, pentru sine) | `requireAdmin()` + `hasPermission` în rută |
| diagnostic | `/diag/client-ip` | există numai cu `DIAG_CLIENT_IP=on`; refuzată în producție |

Rezultat: **toate rutele `/admin/*` au gardă**; nicio rută de administrare nu este accesibilă cetățeanului sau vizitatorului. Gărzile generale au verificarea permisiunii în rută. Lista completă (91 de înregistrări, inclusiv cele generate în buclă pentru colecțiile ghidului și ale apelului rapid) a fost extrasă din cod la `55ead0e`.

### S4 — Datele personale expuse public

| Ce | Rezultat | Dovada |
|---|---|---|
| proiecția publică a sesizării: fără ID intern, autor, e-mail, responsabili, răspunsuri; coordonate la 4 zecimale | conform | `server/src/reports/projection.ts` |
| fotografia publică: numai prima, numai a unei sesizări cu poziție | conform | `server/src/routes/reports.ts:120–131` |
| vot anonim: amprenta = HMAC(jeton din browser, sondaj), fără IP; jurnalul cererilor fără IP pe rutele sondajelor | conform | `server/src/surveys.ts:137`; `server/src/app.ts` `requestLogSerializer` |
| răspunsuri care nu arată dacă o adresă are cont | **neconform pentru `start` fără bifă** (RA-2); conform în rest (202 identic, inclusiv la blocarea definitivă) | probă locală; `citizens.ts:91–105` |

### S5 — Datele de intrare

| Ce | Rezultat | Dovada |
|---|---|---|
| validare strictă (`zod`, `strictObject`) pe corpurile cererilor | conform (eșantion: autentificare, conturi, conținut, sondaje) | `shared/src/*.ts`; `parseBody` |
| SQL: valori numai parametrizate; numele de tabele și coloane interpolate provin numai din cod | conform | 20 de interogări cu interpolare, verificate una câte una (`adminContent.ts`, `outbox.ts`, `auth.ts`, `adminAccounts.ts`, `content.ts`, `surveys.ts`) |
| XSS: React escapează; harta (Leaflet primește HTML) escapează toate valorile din sesizare | conform | `src/views/MapView.tsx` `escapeHtml`; nicio folosire `dangerouslySetInnerHTML` |

### S6 — Limitele anti-abuz (varianta B; adăugat la 14.10.2026, decizia proprietarului AI-1, varianta A)

Fără adresa reală a vizitatorului (`FAZA_6_TRUST_PROXY.md`), protecția nu se mai bazează pe IP. Deciziile: D-B1…D-B5 (`FAZA_6_ANTIABUZ_FARA_IP.md` §5). Rândurile sunt de la `f6d5f2d`.

**Ce înseamnă „conform” aici:** comportamentul este impus de cod, iar afirmațiile indicate ca verificate sunt susținute de testele automate menționate în tabel. Producția nu a fost instalată și verificată în această fază. Pentru staging, probele efectiv executate sunt delimitate explicit în ultimele trei rânduri ale tabelului.

| Ce | Rezultat | Dovada |
|---|---|---|
| limitele pe IP oprite implicit în afara dezvoltării, deci pe staging și în producție (`IP_RATE_LIMITS`, implicit pornite numai în dezvoltare); pornirea lor în afara dezvoltării fără `TRUST_PROXY` → aplicația nu pornește | conform în cod și în teste (pentru producție: numai prin cod) | `server/src/config.ts:144, 196, 375`; `server/test/unit/config.test.ts:232–247` |
| toate cele 11 limite pe IP trec prin `ipLimitExceeded` (cu limitele oprite: nimic numărat); nicio limită pe IP în afara ei | conform | `server/src/auth/rateLimit.ts`; `auth.ts:104`, `citizenGoogle.ts:66, 112`, `citizens.ts:86, 163`, `reports.ts:137, 187, 291, 292`, `surveys.ts:120, 121`; `antiabuseB.test.ts` (D-B2), `surveys.test.ts:390` |
| ALTCHA: obligatoriu la cererea de cod și la vot; la sesizări pornit implicit, oprit numai prin `settings:report-pow off` | conform în cod și în teste (formularea D-B3 despre Admin: constatarea AI-2, deschisă) | `citizens.ts:99`; `reports.ts:278–279`, `settings.ts` `isReportPowEnabled`; `surveys.ts:138`; `antiabuseB.test.ts` (D-B3), `reports.test.ts:626`, `surveys.test.ts:407` |
| Admin: cel mult 2 verificări de parolă simultane (429 `BUSY`) | conform; limită **pe proces** | `auth.ts:88, 112–116, 168`; `antiabuseB.test.ts` (D-B4) |
| căutarea adresei: 20 / cont / oră + limita globală | conform | `reports.ts:185–190`; `antiabuseB.test.ts` (D-B5) |
| protecțiile existente, independente de IP (cont confirmat, limite pe cont și pe adresa de e-mail, încercările de cod atomice, blocarea Admin, TOTP, blocarea cetățenilor) | conform; RA-1, RA-3, RA-4 remediate | `FAZA_6_ANTIABUZ_FARA_IP.md` §2; S1 |
| pe staging, la `cb4cc45`: **probele variantei B** | ALTCHA la cod, sesizare și vot, fără respingeri; nicio limită pe IP numărată după instalare; `reports.pow_enabled` nesetat (ALTCHA pornit implicit); Admin normal cu limita de simultaneitate | jurnalul staging-ului, intervențiile 50–54 (capturi, interogarea `3 · 0 · 0`) |
| pe staging, la `f6d5f2d` (versiunea curentă) | **numai** instalarea și probele scurte: `RELEASE.txt` și `health` cu versiunea nouă, autentificarea cetățeanului, o sesizare de probă, autentificarea Admin cu TOTP. **Nu repetă** integral verificările S6; codul variantei B nu s-a schimbat între `cb4cc45` și `f6d5f2d` (`git diff`: numai RA-3, RA-4, RA-6, RA-7, RA-8, RA-10) | jurnalul staging-ului, intervențiile 55–59 |
| comportamentul cu adresa reală a vizitatorului; T2 | **neefectuat**: imposibil pe această găzduire; limitare acceptată | `FAZA_6_TRUST_PROXY.md` §6 |

**Riscurile rămase, acceptate de proprietar (13.10.2026):** voturile repetate de cine golește jetonul din browser și rezolvă ALTCHA din nou; conturile multiple create cu adrese de e-mail diferite; blocarea temporară a unui cont Admin de cine îi știe adresa (RA-5); limita de simultaneitate se înmulțește cu numărul de procese ale aplicației. Detalii: `FAZA_6_ANTIABUZ_FARA_IP.md`, „Limitare acceptată explicit”.

### S7 — Antetele de securitate (staging, `cb4cc45`, 13.10.2026)

Dovada: `curl -sI -u civic https://test.urbisactiv.ro/` și `curl -D - … /api/v1/public/surveys`, de pe calculatorul proprietarului (capturi; parola cerută de `curl`, neafișată; valoarea cookie-ului acoperită).

| Antet | Valoarea reală | Rezultat |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.tile.openstreetmap.org; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests` | conform: identic cu `contentSecurityPolicy()` din `server/src/app.ts` |
| `Strict-Transport-Security` | `max-age=15552000` (180 de zile, fără `includeSubDomains`) | conform designului |
| `X-Frame-Options` | `DENY` | conform |
| `X-Content-Type-Options` | `nosniff` | conform |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | conform |
| `Cross-Origin-Opener-Policy` / `-Resource-Policy` | `same-origin` | conform |
| `x-robots-tag` | `noindex, nofollow` | conform (staging) |
| `set-cookie` (participare) | `__Host-civic_pid=…; Max-Age=31536000; Path=/; HttpOnly; Secure; SameSite=Strict` | conform |
| redirecționarea `http` → `https` | 301 (jurnalul staging-ului, intervențiile 39–40) | conform pe staging; pentru `urbisactiv.ro`, la instalarea producției |

Observație (informativă): serverul web al găzduirii adaugă `WWW-Authenticate: Basic` și la răspunsurile 200 de pe staging (lacătul); fără efect în browser. Nu există în producție (fără lacăt).

Limită: cookie-ul de sesiune (`__Host-civic_sid`) apare numai la autentificare; atributele lui sunt verificate în cod și în testele automate, iar pe staging numai prin cookie-ul de participare, construit identic (deducție).

### S8 — Încărcarea fotografiilor

| Ce | Rezultat | Dovada |
|---|---|---|
| tipul real (după octeți), numai JPEG și WebP; dimensiunea în pixeli; mărimea și numărul | conform | `server/src/reports/photos.ts`; `REPORT_PHOTO_*` |
| metadatele: JPEG fără APP1 (EXIF, XMP) și APP13 (IPTC); WebP fără `EXIF`/`XMP ` | conform; vezi RA-6 | `photos.ts` |
| numele fișierelor: aleatoare (`photos/<32 hex>.<ext>`), scriere exclusivă, cale verificată | conform | `routes/reports.ts:334–340`; `server/src/storage.ts` |
| servirea: `Content-Type` din baza de date, `nosniff`, `inline` | conform | `routes/reports.ts` `sendPhoto` |

### S9 — Dependențele

`npm audit --omit=dev` (13.10.2026):
- serverul (`--workspace server`, pachetele incluse în `server/dist/app.js`): **0 vulnerabilități**;
- rădăcina: **1 „high”**, `source-map-js` 1.2.1 (GHSA-68fv-2mgg-jv7q, blocarea buclei de evenimente), adus de `@tailwindcss/vite` și `autoprefixer`/`postcss`. Se folosește **numai la construirea** interfeței; nu ajunge în fișierele servite. Remedierea există (1.2.2). Vezi RA-7.

### S10 — Secrete și configurare

| Ce | Rezultat | Dovada |
|---|---|---|
| depozitul fără secrete | conform: niciun fișier `.env` (în afară de `.env.example`), nicio cheie, parolă reală, nume de cont sau adresă personală; istoricul Git conține numai valori de test | căutare în fișierele curente și în tot istoricul (128 de commituri) |
| fișierul de setări 600 | conform: aplicația refuză alte drepturi; pe staging `civic.env` are 0600 | `server/src/envFile.ts`; captura din 13.10.2026 (jurnalul staging-ului, intervenția 43) |
| setările de test refuzate: `DEV_OIDC_PROVIDER_URL` (numai dezvoltare), `DIAG_CLIENT_IP` (nu în producție), `dev:show-code` (nu în producție), `dev:e2e-setup` (numai dezvoltare) | conform | `server/src/config.ts:190–216`; `server/src/cli.ts` |
| date demo refuzate în producție | conform | `server/src/db/seeds.ts` `assertDemoAllowed` |

### S11 — Erori și jurnal

| Ce | Rezultat | Dovada |
|---|---|---|
| erorile 4xx: mesaj generic; 500: mesaj generic + identificator de corelare | **neconform la `55ead0e`…`9a1e08b`** (RA-10). **Corectură:** prima formă a acestui raport scria „conform” pe baza codului handlerului, fără să verifice că se aplică rutelor; proba din 13.10.2026 arată că nu se aplica. Remediat (RA-10) | `server/src/app.ts` `setErrorHandler`; `server/test/api/errorsRA10.test.ts` |
| jurnalul: fără `Cookie`, `Authorization`, `Set-Cookie`; fără `code`/`state` de la Google; fără IP pe rutele sondajelor | conform | `app.ts` (`redact`, `requestLogSerializer`) |
| codul de autentificare în `email_outbox` | vezi RA-8 | `citizens.ts` `enqueueAccountEmail` |
| mesajele de eroare interne (R17) | aceeași cauză ca RA-10; remediat odată cu ea | RA-10 |

## 3. Constatările, în detaliu

### RA-1 — Limita de încercări a codului de cetățean nu rezistă cererilor simultane (medie)

`POST /citizen/auth/verify` citește `attempts`, compară codul și abia apoi crește `attempts`. Cererile sosite în același timp citesc toate aceeași valoare.

**Probă locală** (MySQL 8, test temporar, șters după rulare): 30 de cereri simultane cu coduri greșite, de la IP-uri diferite → toate 401, iar `attempts` = **30**. Limita proiectată este 5.

**Urmări:** codul are 10^6 valori, este valabil 15 minute, iar pe zi se emit cel mult 3 coduri pe adresă. Plafonul real devine limita pe IP (40 de verificări / oră / IP). Cât timp `TRUST_PROXY` lipsește, limita este comună tuturor (efect de frână). După rezolvarea `TRUST_PROXY`, un atacator cu multe adrese IP poate încerca mult mai mult de 5 coduri pe cod emis.

**Propunere (neaplicată):** creșterea atomică înaintea comparării, de exemplu `UPDATE citizen_login_codes SET attempts = attempts + 1 WHERE id = ? AND attempts < 5` și compararea numai dacă s-a modificat un rând; test nou pentru cererile simultane.

### RA-2 — Enumerarea conturilor prin bifa politicii (scăzută; contradicție de design)

Designul cere două lucruri care se contrazic:
- B2 §4.1 / 2.9: bifa politicii este obligatorie **numai la crearea unui cont nou** (altfel 422);
- B2, B10, T-C7: `start` răspunde **la fel** dacă adresa are cont sau nu.

**Probă locală:** fără bifă, adresa cu cont (chiar `pending`) → **202**; adresa fără cont → **422**. Oricine poate afla, prin API, dacă o adresă are cont pe platformă. Interfața nu este afectată: trimite mereu bifa (`CitizenLogin.tsx`).

**Variante (decizia proprietarului):**
- **A:** serverul cere bifa la **fiecare** `start`, ca la Google (amendamentul Google, §8 A). Interfața nu se schimbă. Răspunsul nu mai depinde de existența contului.
- **B:** se acceptă riscul și se corectează documentația (B2, B10).

Recomandare: **A**.

**Decizia proprietarului (13.10.2026): varianta A.** Amendament la B2 §4.1 / 2.9: bifa politicii (cu versiunea curentă) se cere la fiecare `POST /citizen/auth/start`, nu numai la crearea contului. Implementarea cere aprobare separată.

**Remediere (aprobată la 13.10.2026, varianta A pentru RA-1 și RA-2):** `server/src/routes/citizens.ts`: bifa se verifică la fiecare `start`, înaintea citirii contului (RA-2); încercarea de cod se rezervă atomic înaintea comparării (RA-1). Teste noi în `server/test/integration/accounts.test.ts` (RA-2: același 422 cu cont sau fără; RA-1: 20 de cereri simultane → exact 5 comparații; codul corect la a 5-a încercare), cu probe de control pe o copie (vechiul comportament → 202 în loc de 422; 20 de comparații în loc de 5). Pe staging nu este instalată.

### RA-3 — Contoare citite, apoi scrise, la Admin (scăzută)

- `failed_login_count`: cererile simultane cu parole greșite pot număra mai puțin de 5, deci blocarea întârzie. Plafonul rămâne limita pe IP (20 / 15 min, atomică).
- `totp_last_step`: același cod TOTP, trimis simultan în două cereri, poate trece de două ori.

Dovada este numai codul (deducție, fără probă). Propunere: actualizări atomice condiționate, ca la RA-1.

**Remediere (decizia proprietarului, 13.10.2026: A):** `server/src/routes/auth.ts`: eșecul de parolă se numără în baza de date (`failed_login_count = failed_login_count + 1`), iar blocarea se face printr-o a doua actualizare, condiționată de prag; pasul TOTP se rezervă atomic (`… AND (totp_last_step IS NULL OR totp_last_step < ?)`), iar cererea care nu-l obține primește 401. Teste noi în `server/test/integration/reauditB.test.ts`: 3 runde de câte 2 parole greșite simultane → contul blocat; același cod TOTP din două sesiuni simultane → o singură reușită. Probe de control pe o copie: vechiul cod → contul nu se blochează; vechiul cod → ambele cereri reușesc.

### RA-4 — Încercările TOTP sunt limitate pe sesiune (scăzută)

Cine cunoaște parola poate deschide o sesiune nouă după fiecare 5 încercări. Plafonul real este limita de autentificare pe IP. Propunere: o limită suplimentară pe cont (de exemplu 10 încercări TOTP greșite pe oră, apoi blocare temporară).

**Remediere (decizia proprietarului, 13.10.2026: A, cu 3 coduri greșite într-o oră):** pe cont se numără codurile TOTP greșite (fereastră de o oră, `LIMITS.totpMaxFailuresPerHour = 3`). La al 3-lea: contul se blochează 15 minute (`locked_until`, aceeași blocare ca la parolă), sesiunea dinaintea MFA se revocă, răspunsul este 429 `ACCOUNT_LOCKED`. Cât timp contul e blocat, sunt refuzate și parola corectă (401 generic, ca înainte), codul TOTP corect și **codurile de recuperare** (429, sesiunea revocată, codul nu se consumă). Un cod corect, TOTP sau de recuperare, resetează numărătoarea. Codurile de recuperare greșite nu intră în această numărătoare (rămân limitate pe sesiune, 5 / 5 min). Teste noi în `reauditB.test.ts`, cu probe de control pe o copie (fără numărare; fără verificarea blocării la TOTP; fără verificarea blocării la recuperare; fără resetare la TOTP; fără resetare la recuperare → fiecare test pică).

### RA-5 — Blocarea autentificării Admin de către terți (scăzută; ridicată cât timp `TRUST_PROXY` lipsește)

- Cine știe adresa unui cont Admin îl poate bloca 15 minute, cu 5 parole greșite. Compromis cunoscut al blocării pe cont.
- **Acum**, pentru că aplicația vede aceeași adresă pentru toți (`FAZA_6_TRUST_PROXY.md`, 1a), limita de 20 de autentificări / 15 min este comună: oricine o poate consuma și **nimeni** nu se mai poate autentifica în Admin până la fereastra următoare. La fel pentru limitele comune ale codurilor de cetățean și ale pornirilor Google.

Se rezolvă odată cu Pasul 2 (S6). Propunere suplimentară, după Pasul 2: limitarea blocării pe cont la IP-ul care greșește.

### RA-6 — Fotografiile nu sunt re-codate (informativă)

Planul (S8) spune „rescrierea imaginii”; implementarea **elimină segmentele de metadate** și copiază restul. Rămân: comentariile JPEG (`COM`), alte segmente `APPn` (de exemplu profilul de culoare) și eventuale date după sfârșitul imaginii. Nu se pot executa (tipul corect, `nosniff`), dar pot purta text. Propunere: eliminarea și a segmentelor `COM` și a datelor de după `EOI`; formularea din plan se corectează.

**Remediere (decizia proprietarului, 13.10.2026: A):** `server/src/reports/photos.ts`: se elimină și segmentele `COM` (FF FE); datele imaginii se copiază numai până la primul `EOI` (FF D9) de după `SOS` (în datele comprimate, un octet FF este urmat numai de 00 sau de un marcaj). Fără `EOI`, comportamentul rămâne cel vechi. Rămân, intenționat: profilul de culoare și celelalte segmente `APPn`; imaginea nu se re-codează. Teste noi în `server/test/unit/photosRA6.test.ts`, cu probe de control (COM păstrat; date după EOI păstrate → testele pică).

### RA-7 — Dependențele de build și cele nefolosite (informativă)

- `source-map-js` 1.2.1 → 1.2.2 (numai la build).
- `package.json` din rădăcină păstrează pachete nefolosite de cod (`express`, `@google/genai`, `dotenv`, `motion`), constatarea m15 din auditul Etapei 6. Nu ajung în interfață; măresc suprafața la instalare. Propunere: scoaterea lor, cu build și teste.

**Remediere (decizia proprietarului, 13.10.2026: A):** `npm uninstall @google/genai dotenv express motion @types/express` și `npm audit fix`. În `package-lock.json` s-a schimbat o singură versiune (`source-map-js` 1.2.1 → 1.2.2); 53 de pachete au fost scoase, niciunul adăugat. `npm audit`: 0 vulnerabilități. Niciun fișier din depozit nu importa pachetele scoase. Build și toate suitele: trec.

### RA-8 — Codul de cetățean în clar în coada de e-mail (informativă)

`email_outbox.body_text` păstrează textul cu codul (necesar pentru trimitere și pentru `dev:show-code` pe staging); în copii, corpul se păstrează numai în fereastra N3-8. Cine citește baza sau o copie recentă vede codurile încă valabile (≤ 15 minute). Propunere opțională: golirea `body_text` pentru `citizen_login_code` după trimitere, în modul `live`.

**Remediere (decizia proprietarului, 13.10.2026: A):** `server/src/reports/outbox.ts`: în modul `live`, după trimiterea reușită a unui `citizen_login_code`, `body_text` devine NULL, în aceeași tranzacție cu `status = 'sent'`. În `allowlist` (staging) și `simulated` (dezvoltare) textul rămâne, pentru `dev:show-code`. Pe staging nu se schimbă nimic. Teste noi în `reauditB.test.ts` (live: textul șters, codul primit funcționează; allowlist: textul rămâne), cu probe de control (fără ștergere → pică; ștergere și în allowlist → pică).

### RA-10 — Erorile rutelor `/api/v1` ocolesc handlerul aplicației (scăzută)

În `server/src/app.ts`, `setErrorHandler` era apelat **după** înregistrarea rutelor `/api/v1`. În Fastify, un context copil primește handlerul existent în clipa înregistrării, deci rutele aplicației foloseau handlerul implicit al Fastify.

**Probă locală (13.10.2026)**, cu o bază de date care aruncă o eroare: `GET /api/v1/public/surveys` → `500` cu `"message"` = textul erorii interne, fără identificator de corelare; `POST /api/v1/auth/login` cu JSON stricat → `400` cu `FST_ERR_CTP_INVALID_JSON_BODY` și mesajul tehnic. Urmarea: o eroare MySQL (de exemplu „Access denied for user …”) ar putea arăta vizitatorului numele bazei sau al utilizatorului, care pe găzduire încep cu numele contului cPanel. Nu permite accesul la date.

**Remediere (decizia proprietarului, 13.10.2026: A):** handlerul de erori se setează înaintea înregistrării rutelor (mutat, neschimbat). Test nou: `server/test/api/errorsRA10.test.ts` (eroare internă → 500 `INTERNAL`, mesaj generic, identificator de corelare, fără textul erorii; JSON invalid → 400 `BAD_REQUEST` generic; tip de conținut nepermis → 415). Proba de control pe o copie: cu `app.ts` vechi, toate cele 3 teste pică.

### RA-9 — Limitele pe IP devin limite pentru tot orașul (blocantă pentru lansare)

Detaliile, inventarul limitelor și deciziile: `docs/faza6/FAZA_6_ANTIABUZ_FARA_IP.md`. Remediere: limitele pe IP oprite pe staging și în producție (D-B2), ALTCHA (D-B3), limita de simultaneitate la parolele Admin (D-B4), limita pe cont la căutarea adresei (D-B5).

## 4. Constatările vechi (S12)

Auditul Etapei 6 (`RAPORT_AUDIT_ETAPA_6.md`, 6D), pe aplicația fără server:

| Constatarea | Starea la `55ead0e` |
|---|---|
| S1 / C2: ștergere publică, neautentificată | **închisă**: ștergerea numai pe server, `super_admin` sau autorul |
| S2 / C3: XSS în popup-ul hărții | **închisă**: `escapeHtml` pe toate valorile (6.3), păstrat în versiunea cu server |
| S3 / C4: login DEMO 1-click, credențiale afișate | **închisă**: autentificare pe server, fără credențiale în interfață |
| S4 / M1 / P7: sesiune falsificabilă în `localStorage` | **închisă**: sesiune pe server, cookie `HttpOnly` |
| S5 / M2: credențiale în bundle | **închisă**: nicio parolă în interfață (verificat în S10) |
| S6 / M3: lista publică a sesizărilor private | **închisă**: numai proiecția publică (S4) |
| S7 / M4: autorizare numai în interfață | **închisă**: gărzi pe server pe fiecare rută (S3) |
| S8 / m2: permisiuni pe acțiune lipsă | **închisă**: o permisiune pe rută |
| S9 / m3: sesiunea nu expiră | **închisă** pentru Admin; pentru cetățean, fără expirare prin decizie (S2) |
| S10: jurnalul de e-mail în `localStorage` | **închisă**: jurnalul pe server, `super_admin` |
| m15: dependențe moarte | **închisă** (RA-7, etapa B) |

Auditul general (A-01 … A-27) și deciziile D1–D12 nu sunt integral în depozit (`PROJECT_HANDOFF_CURRENT.md`, G.5). Starea lor nu se poate verifica rând cu rând; rămâne **neefectuat**.

## 5. Ce rămâne de făcut în Pasul 4

| Punct | Ce | Depinde de |
|---|---|---|
| S6 | ~~limitele pe IP, pe cont, pe adresă; T2~~ evaluat pe varianta B (§2, S6); comportamentul cu adresa reală și T2: neefectuate, limitare acceptată | — (decizia proprietarului din 14.10.2026, AI-1, varianta A) |
| S1, S2, S4 pe staging | probele din tabelul planului | aprobare separată |
| S12 | auditul general | documentele lipsă |
| remedierile RA-1 … RA-10 | toate instalate pe staging (`f6d5f2d`, 14.10.2026); RA-5 acceptată (varianta B) | — |
