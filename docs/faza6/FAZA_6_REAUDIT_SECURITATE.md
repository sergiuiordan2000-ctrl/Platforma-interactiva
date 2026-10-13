# Faza 6, Pasul 4 — Reauditul de securitate

**Data:** 13.10.2026. **Versiunea verificată:** `faza-5-backend` la `55ead0e` (cod identic cu `f982896`, instalat pe staging ca `27b1b5f`).
**Planul:** `docs/faza6/FAZA_6_PLAN.md`, Pasul 4 (S1–S12), regula dovezilor §4.
**Starea:** **în lucru.** S1–S5 și S8–S12 sunt verificate în cod și local. **S6** așteaptă Pasul 2 (`TRUST_PROXY`). **S7** și probele de pe staging sunt încă de făcut. Pasul 4 nu se închide înainte de verificarea `TRUST_PROXY` (D-4).
**Limită:** reauditul este făcut de Claude, care a scris și codul. Auditul independent rămâne cel de la checkpoint.
**Nimic nu a fost reparat.** Constatările și propunerile de remediere sunt separate; fiecare remediere cere aprobarea proprietarului.

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
| cookie `__Host-civic_sid`, `HttpOnly`, `Secure`, `SameSite=Strict` (în afara dezvoltării) | conform în cod; **antetele reale de pe staging: de verificat (S7)** | `sessions.ts` `setSessionCookie` |
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
| erorile 4xx: mesaj generic; 500: mesaj generic + identificator de corelare | conform | `server/src/app.ts` `setErrorHandler` |
| jurnalul: fără `Cookie`, `Authorization`, `Set-Cookie`; fără `code`/`state` de la Google; fără IP pe rutele sondajelor | conform | `app.ts` (`redact`, `requestLogSerializer`) |
| codul de autentificare în `email_outbox` | vezi RA-8 | `citizens.ts` `enqueueAccountEmail` |
| mesajele de eroare interne ale comenzilor (R17) | deschis, cunoscut | `PROJECT_HANDOFF_CURRENT.md` |

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

### RA-3 — Contoare citite, apoi scrise, la Admin (scăzută)

- `failed_login_count`: cererile simultane cu parole greșite pot număra mai puțin de 5, deci blocarea întârzie. Plafonul rămâne limita pe IP (20 / 15 min, atomică).
- `totp_last_step`: același cod TOTP, trimis simultan în două cereri, poate trece de două ori.

Dovada este numai codul (deducție, fără probă). Propunere: actualizări atomice condiționate, ca la RA-1.

### RA-4 — Încercările TOTP sunt limitate pe sesiune (scăzută)

Cine cunoaște parola poate deschide o sesiune nouă după fiecare 5 încercări. Plafonul real este limita de autentificare pe IP. Propunere: o limită suplimentară pe cont (de exemplu 10 încercări TOTP greșite pe oră, apoi blocare temporară).

### RA-5 — Blocarea autentificării Admin de către terți (scăzută; ridicată cât timp `TRUST_PROXY` lipsește)

- Cine știe adresa unui cont Admin îl poate bloca 15 minute, cu 5 parole greșite. Compromis cunoscut al blocării pe cont.
- **Acum**, pentru că aplicația vede aceeași adresă pentru toți (`FAZA_6_TRUST_PROXY.md`, 1a), limita de 20 de autentificări / 15 min este comună: oricine o poate consuma și **nimeni** nu se mai poate autentifica în Admin până la fereastra următoare. La fel pentru limitele comune ale codurilor de cetățean și ale pornirilor Google.

Se rezolvă odată cu Pasul 2 (S6). Propunere suplimentară, după Pasul 2: limitarea blocării pe cont la IP-ul care greșește.

### RA-6 — Fotografiile nu sunt re-codate (informativă)

Planul (S8) spune „rescrierea imaginii”; implementarea **elimină segmentele de metadate** și copiază restul. Rămân: comentariile JPEG (`COM`), alte segmente `APPn` (de exemplu profilul de culoare) și eventuale date după sfârșitul imaginii. Nu se pot executa (tipul corect, `nosniff`), dar pot purta text. Propunere: eliminarea și a segmentelor `COM` și a datelor de după `EOI`; formularea din plan se corectează.

### RA-7 — Dependențele de build și cele nefolosite (informativă)

- `source-map-js` 1.2.1 → 1.2.2 (numai la build).
- `package.json` din rădăcină păstrează pachete nefolosite de cod (`express`, `@google/genai`, `dotenv`, `motion`), constatarea m15 din auditul Etapei 6. Nu ajung în interfață; măresc suprafața la instalare. Propunere: scoaterea lor, cu build și teste.

### RA-8 — Codul de cetățean în clar în coada de e-mail (informativă)

`email_outbox.body_text` păstrează textul cu codul (necesar pentru trimitere și pentru `dev:show-code` pe staging); în copii, corpul se păstrează numai în fereastra N3-8. Cine citește baza sau o copie recentă vede codurile încă valabile (≤ 15 minute). Propunere opțională: golirea `body_text` pentru `citizen_login_code` după trimitere, în modul `live`.

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
| m15: dependențe moarte | **deschisă** (RA-7) |

Auditul general (A-01 … A-27) și deciziile D1–D12 nu sunt integral în depozit (`PROJECT_HANDOFF_CURRENT.md`, G.5). Starea lor nu se poate verifica rând cu rând; rămâne **neefectuat**.

## 5. Ce rămâne de făcut în Pasul 4

| Punct | Ce | Depinde de |
|---|---|---|
| S6 | limitele pe IP, pe cont, pe adresă; T2 | Pasul 2 (`TRUST_PROXY`) |
| S7 | antetele reale de pe staging (CSP, HSTS, `frame-ancestors`, `nosniff`, cookie-ul); redirecționarea `https` (făcută, 301, jurnalul staging-ului, intervențiile 39–40) | o probă `curl` cu parola lacătului, cu aprobare |
| S1, S2, S4 pe staging | probele din tabelul planului | aprobare separată |
| S12 | auditul general | documentele lipsă |
| remedierile RA-1 … RA-8 | numai după decizia proprietarului | — |
