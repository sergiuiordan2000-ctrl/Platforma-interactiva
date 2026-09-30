# FAZA 5.4 — PLAN: SESIZĂRI PE SERVER

**Proiect:** Turnu Măgurele Civic · **Data:** 30.09.2026 · **Branch:** `faza-5-backend`
**Design (înghețat):** B5 (§1–§6), B7 §2 („Sesizări”), B8, B2 §3, §4, §6.1, §7; B6 §7 (5.4: coada + șabloanele + `simulated`); B1 (tabelele există deja în migrația `0001`)
**Criteriu (B10 §6, rândul 5.4):** sesizări complete + teste de concurență + proiecția publică + coada (`simulated`); regresie fără FAIL-uri noi.

## 1. Regula centrală: fără moderare

Sesizarea apare pe hartă **imediat** după depunere, dacă are poziție validă în UAT (D9, A-2, **B5 §4 / 2.3**: moderarea nu există, nici înainte, nici după publicare). Confirmat din nou de proprietar la 29.09.2026.

- Ecranul Admin „Moderare sesizări” devine „Sesizări”: stări, asumare / preluare, note interne, corectarea poziției și ștergerea (numai `super_admin`). Aprobarea și respingerea dispar (permisiunea `reports.moderate` nu mai există, B4).
- O sesizare iese din sistem numai prin ștergerea de către autor sau de `super_admin`, ori prin retenție (45 de zile de la depunere).
- *Notă:* în predarea din 29.09, lista 5.4 conținea cuvântul „moderare”. Cuvântul este greșit față de designul înghețat. Planul urmează designul.

## 2. Pașii

| Pas | Conținut |
|---|---|
| 5.4.1 | `shared/`: scheme Zod (`strict`) pentru depunere, `PublicMapReport`, lista proprie, lista și detaliul Admin, geocodare; aceleași scheme și în frontend |
| 5.4.2 | **limita UAT** (2.12, T-B6): poligonul oficial al UAT Turnu Măgurele din OpenStreetMap (GeoJSON, `UAT_BOUNDARY_FILE`), verificare punct-în-poligon în cod propriu; **tu verifici vizual poligonul** (T-B6), înainte de folosire |
| 5.4.3 | server, depunerea (B5 §1): multipart (`@fastify/multipart`, aprobat în Faza 4); fotografiile (JPEG / WebP după semnătură, fără EXIF / XMP, ≤ 4 × 3 MB, ≤ 4096 px, fișier temporar → `STORAGE_DIR/photos`); contorul `TM-XXX` cu `FOR UPDATE`; `Idempotency-Key`; anti-abuz B7 (capcana, timp minim 8 s semnat, 5 / oră și 20 / zi per IP, 5 / zi per cont, **3 transmiteri către Primărie / cont / 24 h**; ALTCHA oprit implicit, §5); 401 / 403 pentru cont `pending` / blocat; `registry_notification` în coadă numai la cererea cetățeanului (`queued` / `on_hold`) |
| 5.4.4 | server, public și cetățean: `/public/report-categories`, `/public/map-reports` (coordonate rotunjite la 4 zecimale, `locationApproximate`, `status`), `/public/photos/:id` (numai fotografia principală); `/citizen/reports` (listă, detaliu, ștergere); `/citizen/geocode` (Nominatim prin server, `POST`, rezultat numai în UAT, nestocat); dezabonarea |
| 5.4.5 | server, Admin (B2 §6.1): listă (fără contact), detaliu (e-mailul autorului și jurnalul e-mail numai pentru `super_admin`), fotografii, starea (numai `resolved`, cu regulile P-9), asumare / preluare, note interne, corectarea poziției, reîncercarea e-mailului, contoare, ștergerea definitivă (fără audit, B-7); setările fluxului către Primărie `GET / PUT /admin/settings/registry` (B2 §6, `notifications.recipient.manage`; la reactivare, `on_hold` → `queued`, 2.13); procesarea cozii (`outbox:process`, cu transport `simulated`; SMTP la 5.5): `sent` → `in_analysis` + notificarea autorului; `purge:retention` pentru sesizări |
| 5.4.6 | frontend, servicii: `reportService` devine client al API-ului (`Promise`), fără `localStorage`; moderarea eliminată din servicii și permisiuni |
| 5.4.7 | frontend, ecrane (B2 §7): **„Contul meu”** (e-mail → cod → lista proprie, ștergerea unei sesizări, ștergerea contului; mesajul de blocare); **formularul nou** (fără „Public / Public anonim”; opțiunea „Transmite către Primărie”; locația în trei moduri, vezi §3); harta: pin pentru poziția exactă, **zonă** (cerc) pentru adresa geocodată; Admin „Sesizări”. **Aspectul ecranelor existente rămâne cel din designul înghețat.** |
| 5.4.8 | teste (B10 §6: sesizări, proiecția publică, stadii / asumare, e-mail în `simulated`, conturi, drepturi `super_admin`, retenție); **concurență: N depuneri simultane → N numere distincte și consecutive**; `TM-015` șters → următoarea `TM-016`; geocodarea cu Nominatim simulat; E2E pentru depunere, hartă, „Contul meu”, Admin; **testul R6.1 revizuit conform A-1** (ștergerea este acum permisă autorului și `super_admin`), cu explicație în raport (B10 §7); regresie completă |
| 5.4.9 | staging: pachet nou, deploy, `STORAGE_DIR` în afara docroot, `GEOCODER_URL` + `GEOCODER_USER_AGENT`; test real: „Strada 1 Mai, Turnu Măgurele” → zonă pe Strada 1 Mai; T-ISO înainte și după; raport și checkpoint |

Commit-uri propuse (cu aprobare): după 5.4.5 (server), după 5.4.8 (frontend + teste), după 5.4.9 (staging + raport).

## 3. Locația în formular (observațiile din 29.09)

| Mod | Ce face utilizatorul | Ce se salvează | Pe hartă |
|---|---|---|---|
| **Pin manual** (D6-2) | atinge harta din formular; pinul se poate trage | `source = pin`, poziție exactă | pin |
| **Poziția mea** | butonul GPS centrează harta și pune pinul; pinul se poate ajusta; GPS-ul brut nu se păstrează după mutare (D6-6) | `gps_pin` | pin |
| **Adresă** (2.4) | scrie strada și numărul → serverul întreabă Nominatim → apare un pin propus, pe care îl verifică și îl poate muta | `geocoded`, `approximate = true` | **zonă**, nu punct |
| **Numai text** | nu alege o poziție | fără coordonate | nu apare, până la corectarea de către `super_admin` (2.11) |

Textul locației rămâne obligatoriu în toate cazurile. În afara UAT: 422, cu mesaj clar. Raza zonei afișate (**propunere tehnică**): 150 m, configurabilă.

## 4. Efecte de știut (tehnic, în limitele designului)

- Sesizările salvate până acum în browser **nu se mută** pe server (ca la 5.3). Cheile vechi din `localStorage` se curăță la 5.7.
- Depunerea cere cont confirmat (A-9); restul aplicației rămâne fără cont.
- E-mailurile rămân în modul `simulated`: nu pleacă niciun mesaj real (SMTP la 5.5). Sesizările cu transmitere cerută rămân `new` până la 5.5 (în `simulated`, starea nu trece în `in_analysis`, B6).
- Pe staging, codul de cont se citește prin CLI (`dev:show-code`), ca la 5.2.
- Nominatim are o politică de utilizare: maximum o cerere pe secundă și un `User-Agent` identificabil. Volumul unui municipiu mic se încadrează; limita se aplică și pe server.
- Harta publică va arăta zone aproximative, nu doar pinuri.

## 5. Decis de proprietar (30.09.2026)

- **Sesizările demo (varianta A):** create prin `seed:demo` (`is_demo = true`), cu coordonate reale verificate pe OSM (înlocuiesc coordonatele inventate de azi, de exemplu TM-001 „Parcul Municipal”). Retenția de 45 de zile se aplică și lor, fără excepție; după ștergere, se rulează din nou `seed:demo` (pe staging: „Run JS script”). Pozițiile se verifică de proprietar pe harta de staging.
- **Pinul propus prin adresă și mutat de cetățean (30.09.2026):** mutarea înseamnă că cetățeanul a arătat locul precis → se salvează ca `pin` (punct exact, fără zonă). Nemutat, rămâne `geocoded` (zonă aproximativă, 2.4).
- **Textele sesizărilor demo (30.09.2026):** date de proprietar, cu 4 poziții reale (Str. 1 Mai / bl. F25; Str. Chimiei / Școala nr. 4; Str. Pompierilor / Colegiul Unirea; Str. Oltului × Str. Neamului).
- **Sesiunea de cetățean (30.09.2026, observație pe staging):** expiră după **120 de zile fără folosire** și se păstrează după închiderea browserului (cookie persistent, reînnoit la folosire). Înlocuiește, numai pentru cetățeni, valorile Admin (60 min / 12 h), care erau o propunere tehnică configurabilă (DN-15, B3 §8). Sesiunea Admin rămâne neschimbată.
- **Proof-of-work ALTCHA la sesizări (DN-22, varianta A + A1):** implementat în 5.4 (`altcha-lib`, aprobat în Faza 4), **oprit implicit**. **Extindere explicită a contractelor B2 (decizie nouă, 30.09.2026)**, pentru că B2 nu avea elementele necesare: (1) `GET /citizen/reports/pow-challenge` → provocarea, numai dacă ALTCHA e pornit (altfel 404); (2) câmpul opțional `pow` la `POST /citizen/reports`; (3) setarea `reports.pow_enabled` (implicit `false`), fără tabel nou și fără migrație. Pornirea / oprirea: **numai prin CLI** `settings:report-pow on|off` (pe staging, „Run JS script”), cu rând de audit; fără endpoint Admin. Testele acoperă ambele stări (oprit: depunerea fără soluție trece; pornit: fără soluție validă → 422, soluție refolosită → 422). Verificarea compatibilității `engines` cu Node 20 se face la instalare.
