# FAZA 5.1 — NOTE DE IMPLEMENTARE (pașii 5.1.2–5.1.6)

**Proiect:** Turnu Măgurele Civic · **Branch:** `faza-5-backend` · **Data:** 29.09.2026
**Design:** `docs/faza4/` (înghețat). Aceste note nu schimbă designul. Ele consemnează detaliile de implementare pe care designul le lasă deschise și constatările apărute la implementare.

---

## 1. Ce există acum

| Element | Unde |
|---|---|
| npm workspaces `server/`, `shared/` (DN-06) | `package.json`, `server/`, `shared/` |
| Configurare validată cu Zod; refuz la pornire fără secrete | `server/src/config.ts` |
| Aplicația Fastify: `GET /api/v1/health`, antete de securitate (CSP), servirea `dist/` | `server/src/app.ts` |
| Schema Drizzle: 30 de tabele (B1 §7) | `server/src/db/schema/` |
| Migrația inițială (SQL versionat) | `server/migrations/0001_initial_schema.sql` |
| Rularea migrațiilor + verificarea versiunii schemei la pornire (DN-20) | `server/src/db/migrations.ts`, `server/src/main.ts` |
| `seed:config`, `seed:demo` (refuzat în producție), `check:no-demo` (D10) | `server/src/db/seeds.ts`, `noDemo.ts`, `server/seeds/` |
| Artefactul unic `server/dist/app.js` (esbuild) | `server/build.mjs` |
| Teste `node:test`: unitare, API (`fastify.inject`), integrare MySQL | `server/test/` |

**Comenzi:**

| Comandă | Efect |
|---|---|
| `npm run build -w server` | construiește `server/dist/app.js` |
| `node server/dist/app.js` | pornește serverul |
| `node server/dist/app.js <comandă>` | `migrate`, `migrate:status`, `seed:config`, `seed:demo`, `check:no-demo` |
| `npm run dev -w server` / `npm run migrate -w server` … | aceleași, din sursă, cu `.env` din rădăcină |
| `npm test -w server` | toate testele (integrarea cere `CIVIC_TEST_DATABASE_URL`, un DB cu „test” în nume) |

## 2. Detalii de implementare (designul nu le fixează)

| Subiect | Alegere | Motiv |
|---|---|---|
| Evidența migrațiilor | tabel tehnic `schema_migrations` (versiune, nume, sumă SHA-256), **în afara** celor 30 de tabele de domeniu | verificarea DN-20: aplicația pornește numai dacă toate migrațiile sunt aplicate și nemodificate |
| Migrații concurente | `GET_LOCK` în MySQL | două `migrate` simultane nu se suprapun |
| DDL netranzacțional | o migrație eșuată la mijloc oprește totul, cu mesaj; remedierea = restaurare din backup | limitare MySQL; T-D1 (5.1.8) |
| Sesiunea MySQL | `time_zone = '+00:00'` și `sql_mode` strict setate pe fiecare conexiune | pe hosting-ul partajat valorile serverului pot fi permisive |
| Motor / colaționare | fiecare tabel `InnoDB`, `utf8mb4_0900_ai_ci` (B1 §1) | explicit în migrație, nu dependent de server |
| Cheile străine | `ON DELETE RESTRICT` implicit; `CASCADE` / `SET NULL` exact unde prevede B1 (10 chei); nume scurte `fk_<tabel>_<coloană>` | B1 §1, §3.2, §3.7, §3.8 |
| Lungimile coloanelor nespecificate în B1 | titluri 200, descrieri scurte 500, telefoane 32, URL-uri 500 (`image_url` 255) etc. | valori uzuale; se pot extinde prin migrație nouă |
| Valori implicite nespecificate | `surveys.status` = `draft`; `citizen_accounts.status` = `pending`; `announcements.status` fără implicit (aplicația îl trimite mereu) | cea mai prudentă stare |
| `CHECK`-uri | perechea `lat`/`lng`; `kind`/`ends_at` la blocări; `end_at > start_at`; un singur rând în `report_counter` și `directory_institution`; `ordinal` 1–4 la fotografii | B1 §3–§4 |
| `health` | `200 { status: "ok", version }` sau `503 { status: "degraded", version }` (DB inaccesibil sau schemă nealiniată) | B2 §3 dă numai corpul; 503 ajută monitorizarea |
| Format artefact | CommonJS, `server/dist/package.json` = `{ "type": "commonjs" }` | Passenger pornește fișierul cu `require()`; se confirmă la K2 (5.1.10) |
| CSP `img-src` | `'self' data: blob: https://*.tile.openstreetmap.org` | `data:` / `blob:` nu sunt domenii externe; le folosesc iconițele Leaflet și previzualizarea fotografiilor |
| Variabile folosite abia mai târziu | SMTP (5.5), `UAT_BOUNDARY_FILE` și geocodarea (5.4) sunt opționale în 5.1 și devin obligatorii în subfaza lor | secretele sunt toate obligatorii de acum |
| Retenția în configurare | `RETENTION_DAYS` ≤ 45, `ADMIN_RETENTION_MONTHS` ≤ 6 | valorile aprobate nu pot fi depășite prin configurare |

## 3. Constatări

1. **`drizzle-kit` nu este păstrat ca dependență.** Designul (T3) îl listează pentru generarea migrațiilor. Instalat în `server/`, aduce prin dependențele lui o versiune veche de `esbuild` cu 4 avertismente `npm audit` (moderate, numai în modul „dev server”, nefolosit). L-am folosit o singură dată, în afara repository-ului, ca să generez SQL-ul inițial, pe care l-am revizuit manual. Migrațiile viitoare se scriu la fel, iar testul de integrare verifică potrivirea DB ↔ schema Drizzle. Alternativa „SQL scris manual” este chiar cea din T3.
2. **`last_value` este cuvânt rezervat în MySQL 8** (coloana `report_counter.last_value`, B1). Numele rămâne cel din design; în SQL scris manual se citează întotdeauna (`` `last_value` ``). Drizzle îl citează automat.
3. **Datele demo actuale au o trimitere greșită:** serviciul „Registratura Generală” indică direcția `dep-generala`, care nu există în lista direcțiilor. Cu cheia străină `RESTRICT` (B1 §3.3) rândul ar fi respins. În seed-ul demo am adăugat direcția, cu numele afișat de serviciu. Nu afectează producția (datele demo nu ajung acolo, D10).
4. **Imaginile demo ale comunicatelor** sunt URL-uri externe (`images.unsplash.com`). DN-19 / A04-5 le interzice: seed-ul demo are `image_url = NULL`, iar CSP-ul le blochează. Frontend-ul actual servit de serverul Node (de exemplu pe staging) nu va afișa aceste imagini până la 5.3, când comunicatele trec pe API cu imagini din repository. Build-ul Vite nu se schimbă.
5. **Seed-urile demo au ID-uri ULID fixe** în `server/seeds/demo/*.json` (conversia din `src/data/*`), ca `seed:demo` să poată fi rulat de mai multe ori fără dubluri.
6. **`bun.lock`** (moștenit din AI Studio, nefolosit) a fost șters, la cererea proprietarului.
7. **Tailwind citește clase din tot proiectul**, nu numai din `src/`. Codul nou din `server/` adăuga în CSS-ul frontend-ului o clasă (`.table`). Am exclus `server/` și `shared/` din sursele Tailwind (`src/index.css`, 2 rânduri `@source not`); build-ul frontend-ului este din nou **identic byte cu byte** cu cel de la `929c649`. Observație: și documentația (`docs/`, `tests/`) este citită de Tailwind (de exemplu clasa `.ordinal` există în CSS-ul actual din acest motiv). Nu am schimbat asta, ca frontend-ul să rămână identic; se poate curăța la 5.3, cu verificare vizuală.

## 4. Verificări (29.09.2026)

| Verificare | Rezultat |
|---|---|
| Teste backend pe Node 20.20.2 (versiunea staging-ului) și Node 22, MySQL 8.0 | 61/61 (26 unitare, 9 API, 26 integrare) |
| Artefactul rulat fără `node_modules` | pornește; `health` = `ok`; `migrate:status` = versiunea 1 |
| MySQL 8.4 și Node 24 | nedisponibile în mediul meu; se verifică în CI (5.1.7) |
