# AMENDAMENT — VERIFICAREA „EȘTI LOGAT?” FĂRĂ 401 (`/me?optional=1`)

**Proiect:** Turnu Măgurele Civic (Urbis Activ) · **Data:** 08.10.2026 · **Branch:** `faza-5-backend` · **Stare:** **decis de proprietar (varianta 1), implementat cu teste; neinstalat încă pe staging.**
**Origine:** ferestrele de parolă repetate pe staging (jurnalul `STAGING_URBISACTIV_JURNAL.md`, observația 2).
**Ce modifică din designul înghețat (Faza 4):** contractul B2 (`FAZA_4_B2_API.md`) pentru `GET /auth/me` și `GET /citizen/me`, **numai prin adăugare**: un parametru opțional. Fără `optional=1`, comportamentul B2 rămâne neschimbat (401 la lipsa sesiunii). Fără modificări în schemă, în permisiuni sau în celelalte rute.

## 1. Constatarea (08.10.2026, din instrumentele browserului)

- Cererea `GET /api/v1/citizen/me` pleacă **cu** parola lacătului (`Authorization: Basic …`). Lacătul o acceptă, iar aplicația răspunde **401**, adică „fără sesiune de cetățean”, comportamentul proiectat. Răspunsul are antetele de securitate ale aplicației (CSP etc.).
- Aceluiași răspuns, serverul web (LiteSpeed, Directory Privacy) îi adaugă `WWW-Authenticate: Basic realm="Staging Urbis Activ"`. Aplicația nu trimite acest antet (verificat în cod), iar browserul îl citește ca pe o nouă cerere a parolei lacătului.
- O regulă `.htaccess` (`SetEnvIf Authorization` + `Header always unset WWW-Authenticate`) **nu a avut efect**: fereastra a apărut imediat. Regula a fost scoasă (jurnalul, intervenția 17).
- `/auth/me` (la pornirea aplicației) și `/citizen/me` (pagina de sesizări) se apelează la fiecare vizită, deci fereastra apărea la navigarea obișnuită.

## 2. Decizia proprietarului (08.10.2026)

Variantele prezentate: (1) cod mic: verificările „ești logat?” răspund 200 „nelogat”; (2) lacăt în aplicație (pagină de parolă + cookie, care schimbă G3 condiția 4); (3) fără lacăt (nerecomandat). La întrebarea proprietarului „afectează în rău aplicația finală?”: nu. În producție nu există lacăt, iar un 200 „nelogat” pentru o verificare de sesiune este o practică obișnuită. **Aleasă: varianta 1** (recomandarea lui Claude).

## 3. Ce s-a schimbat

| Element | Înainte | Acum |
|---|---|---|
| `GET /auth/me?optional=1`, `GET /citizen/me?optional=1`, fără sesiune | 401 `UNAUTHENTICATED` | **200 `{ "authenticated": false }`** |
| aceleași rute, cu sesiune validă | răspunsul B2 | **identic** (testul compară cele două răspunsuri) |
| aceleași rute **fără** `optional=1` | 401 | **401, neschimbat** |
| sesiune de celălalt tip (cetățean pe `/auth/me` sau invers) cu `optional=1` | 401 | 200 `{ "authenticated": false }`, fără date |
| frontend: `authService.refresh()`, `citizenService.me()` | `GET …/me`; 401 → neautentificat | `GET …/me?optional=1`; `authenticated: false` → neautentificat (tratarea 401 rămâne) |

Cod: `server/src/auth/guards.ts` (`loadCitizen`, extras din `requireCitizen` fără schimbare de comportament, și `anonymousProbe`), `server/src/routes/auth.ts`, `server/src/routes/citizens.ts`, `src/services/authService.ts`, `src/services/citizenService.ts`.

Celelalte 401 rămân (de exemplu o acțiune făcută după expirarea sesiunii). Pe staging, acestea pot încă afișa fereastra lacătului, dar nu mai apar la navigarea obișnuită.

## 4. Teste

- Nou: `accounts.test.ts`, „amendamentul 5.5: /me?optional=1 …”: fără sesiune → 200 `{ authenticated: false }` și fără `WWW-Authenticate`; fără `optional` și cu `optional=0` → 401; cu sesiune → răspuns identic cu cel fără parametru; sesiunea celuilalt tip → „neautentificat”.
- **Proba de control:** condiția din `anonymousProbe` stricată intenționat (pe o copie) → testul nou pică; codul refăcut → trece.
- Testele existente ale contractului 401 (`auth.test.ts`, `accounts.test.ts`, `rotateTotpKey.test.ts`) nu au fost modificate și trec.
- Suita backend completă, local, pe MySQL 8.0: **219/219**. Lint și build-ul frontend: OK.

## 5. Corectură de test fără legătură, găsită la rulare

`surveys.test.ts`, testul „ALTCHA per sondaj”, picase din 08.10.2026, atât local, cât și în CI (rulările de la 15:22 și 15:47 UTC). Cauza: sondajul se închidea la „ceasul de test (01.10.2026) + 7 zile”, dar partea cu soluția ALTCHA rulează după ceasul real (`altcha-lib` verifică expirarea după ora reală). Din 08.10, sondajul era deja închis (403 în loc de 400). **Adaptarea:** numai pentru acest test, `endAt` = max(ora reală, ceasul de test) + 7 zile. Ce verifică testul a rămas neschimbat. Codul aplicației nu a fost atins.

## 6. Instalarea pe staging (de făcut, cu aprobare separată)

Build-ul nou, urcat ca la intervențiile anterioare. Verificare: fereastră privată nouă → parola cerută o singură dată → navigare prin Acasă, Sesizări, Hartă, Sondaje, Admin, fără ferestre noi. T-ISO pe `electrovolt.ro` înainte și după.
