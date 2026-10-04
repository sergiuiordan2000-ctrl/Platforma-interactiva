# FAZA 5.6 — PLAN: SONDAJELE PE SERVER (anti-vot dublu, D3 / D4)

**Proiect:** Turnu Măgurele Civic · **Data:** 01.10.2026 · **Branch:** `faza-5-backend`
**Design (înghețat):** RULES §11.6–§11.7 (D3, D4, integritate, N4-1…N4-12); B1 §3.4, §3.6, §3.9; B2 §2, §3, §6.4, §7; B3 / B4 (DN-03, matricea); B7 §1–§4; B8; B10 §6 (rândul 5.6)
**Criteriu (B10 §6):** „5.6 | sondaje + anti-vot + D3 / D4”; regresie fără FAIL-uri noi neexplicate.
**Aprobat de proprietar la 01.10.2026** (P-1…P-7 cu deciziile de mai jos, T-1…T-9 integral).
**Starea de pornire:** tabelele există din migrația `0001` (B1 §3.4), cu seed-ul demo (3 sondaje); fără rute, fără scheme `shared/`, fără teste API. Frontend-ul folosește `localStorage`.

## 1. Regulile centrale (rezumat)

- **Votul**, fără cont (N4-2). Unicitatea per sondaj e garantată în DB: `HMAC(PARTICIPATION_HMAC_SECRET, jeton + ID sondaj)` + `UNIQUE` (N4-3, N4-7). Jetonul aleator stă în cookie-ul `__Host-civic_pid` (HttpOnly, Secure, SameSite=Strict, 1 an), separat de sesiunea de cetățean. Lângă vot nu se păstrează nici IP, nici user-agent, nici identitate.
- **Mesaj public obligatoriu (N4-1):** consultare orientativă; sistemul nu garantează „o persoană = un vot”.
- **Anti-abuz (B7):** capcana `hp`, timpul minim semnat (6 s; P-7), limite pe IP-ul hash-uit (10 / oră / sondaj, 300 / oră global; P-7), ALTCHA pornit **per sondaj** (oprit implicit). Încercările respinse se păstrează agregate 30 de zile. Fără blocări permanente, fără CAPTCHA extern, fără amprentarea browserului.
- **D3:** vizibilitatea rezultatelor se alege per sondaj (`after_close` implicit, sau `live`). Sondajele închise stau într-o **arhivă publică** cu rezultatele finale. **Răspunsurile libere nu devin niciodată publice.**
- **D4:** „Reset Demo” nu există: fără buton, fără endpoint. Datele demo se încarcă numai prin `seed:demo` (dezvoltare / staging).
- **Integritate:** după primul vot, întrebările și opțiunile nu se mai modifică (409); un sondaj cu voturi nu se șterge (409), doar se închide. Voturile nu se șterg manual (N4-10); la abuz se folosește marcajul „rezultate posibil afectate”, cu notă publică în arhivă.
- **Textele libere:** le citește numai `super_admin`, numai după închidere, cu audit la fiecare citire (N4-9, DN-03). Se șterg automat la 6 luni de la închidere.
- **Închiderea automată la `end_at`:** calculată la fiecare cerere, deci un vot după `end_at` primește 403 chiar înainte de cron. Cron-ul `surveys:close-expired` salvează starea `closed`, cu audit (actor `system`) (E-3, P-11).

## 2. Pașii

| Pas | Conținut |
|---|---|
| 5.6.1 | `shared/`: scheme Zod `strict` pentru listă / arhivă, structură, vot, rezultate, Admin (creare / editare / stare / integritate / PoW / respingeri) |
| 5.6.2 | server public (B2 §3): `GET /public/surveys?state=open\|closed` (emite cookie-ul de participare), `GET /public/surveys/:id` (draft → 404; emite și el cookie-ul), `GET /public/surveys/:id/results` (după D3), `GET /public/surveys/:id/pow-challenge`, `POST /public/surveys/:id/submissions` (201 `{recorded:true}`; 403 închis, 409 deja votat, 422, 429 cu `Retry-After`); validarea răspunsurilor (obligatorii, opțiuni valide, text liber ≤ 2000); prima înregistrare setează `first_submission_at`, în tranzacție |
| 5.6.3 | server Admin (B2 §6.4): listă, detaliu, creare, editare (blocare după primul vot), schimbarea stării (permisiunea stării țintă), ștergere (409 cu voturi), rezultate (indiferent de vizibilitatea publică), texte libere (`surveys.edit` + închis + audit), integritate, PoW, respingeri agregate; `/admin/dashboard` cu contoarele agregate (sesizări + sondaje), rămas din 5.3 |
| 5.6.4 | întreținere: `surveys:close-expired` (CLI + script npm pentru cPanel); `purge:retention` golește `text_value` la 6 luni de la închidere (§4, T-7); `rotate:keys` refuză `PARTICIPATION_HMAC_SECRET` cât timp există sondaje deschise (T-6); jurnalele serverului fără IP pentru rutele de vot (T-5) |
| 5.6.5 | frontend: `surveyService` → client API (`Promise`), fără `localStorage` pentru date; „Reset Demo” eliminat (D4); public: lista deschisă + **arhiva**, butonul „Rezultate” numai când D3 permite, mesajul N4-1, ecranele 403 / 409 / 422 / 429; „Ai participat deja”: cheie `localStorage` numai pentru UX (N4-12); Admin: vizibilitatea rezultatelor, PoW, marcajul de integritate, textele libere (numai `super_admin`, după închidere), data **și ora** în ora României. **Aspectul ecranelor existente rămâne cel din designul înghețat;** câmpurile noi folosesc aceleași componente. |
| 5.6.6 | seed demo (P-4) |
| 5.6.7 | teste (B10 §6): server (unicitate, concurență cu același jeton → un rând, vot după `end_at` → 403 înainte de cron, HMAC diferit între sondaje, fără IP lângă vot, D3, arhivă, texte libere numai după închidere și numai `super_admin`, retenția la 6 luni și nu mai devreme, blocarea structurii → 409, ștergere cu voturi → 409, anti-abuz: capcană, timp minim, 429 + `Retry-After`, `X-Forwarded-For` falsificat, PoW valid / invalid / refolosit, respingeri fără IP în clar); E2E (vot → rezultate, arhivă, 409 / 422 în interfață, Admin); suitele vechi adaptate cu explicație (R6.5a: „Reset Demo” dispare prin D4; `test_robustete_stocare`: părțile despre `turnu_civic_surveys_store`) |
| 5.6.8 | staging: pachet, deploy, `seed:demo`, cron `surveys:close-expired`, probă de vot, T-ISO înainte și după; raport și checkpoint |

Commit-uri propuse (cu aprobare): după 5.6.4 (server), după 5.6.7 (frontend + teste), după 5.6.8 (staging + raport).

## 3. De decis de proprietar (decizii de produs; recomandarea lui Claude în dreapta)

| # | Întrebare | Variante | Recomandare |
|---|---|---|---|
| P-1 | **Redeschiderea** unui sondaj închis | (a) interzisă: închis = definitiv, arhivat; (b) permisă | **(a)**. Altfel textele libere, deja citibile la închidere, și arhiva devin incoerente. Prelungirea `end_at` rămâne posibilă **înainte** de închidere. |
| P-2 | **Marcajul „rezultate posibil afectate”** | (a) vizibil și pe sondajele deschise; (b) numai în arhivă | **(a)**, pentru transparență |
| P-3 | **Textul public N4-1** (formulare propusă) | „Consultare orientativă: rezultatele arată opinia celor care au participat. Platforma limitează votul repetat, dar nu poate garanta că fiecare persoană votează o singură dată.” | aprobarea textului, sau o altă formulare |
| P-4 | **Datele demo** | (a) sondajul demo activ prelungit până la 30.06.2027 + câteva voturi demo la sondajul demo închis (arhiva arată rezultate); (b) seed neschimbat (sondajul activ expiră la 31.10.2026) | **(a)** |
| P-5 | **Ora de închidere** | (a) data **și ora**, în ora României; (b) numai data, cu închidere la 23:59, ora României | **(a)** |
| P-6 | **Vizibilitatea rezultatelor după primul vot** | (a) blocată, ca întrebările; (b) modificabilă | **(a)**, ca să nu existe suspiciunea că rezultatele au fost ascunse sau arătate după cum convine |
| P-7 | **Pragurile anti-abuz** (B7, „propuse”) | 3 s timp minim; 50 / oră / IP / sondaj; 300 / oră / IP global; ALTCHA ca la sesizări | confirmarea valorilor din design |

**Decis de proprietar (01.10.2026):**
- P-1 (a): un sondaj închis este definitiv (fără redeschidere); prelungirea `end_at` numai înainte de închidere.
- P-2 (b): marcajul „rezultate posibil afectate” se afișează **numai în arhivă** (sondaje închise); în Admin se vede oricând.
- P-3: textul N4-1 aprobat, cu formularea de mai sus.
- P-4 (a): sondajul demo activ până la 30.06.2027; voturi demo la sondajul demo închis.
- P-5 (a): închiderea cu data și ora, în ora României.
- P-6 (a): `results_visibility` blocată după primul vot.
- P-7 **modificat**: timp minim **6 s**; maximum **10 voturi / oră / IP / sondaj**; 300 / oră / IP global (neschimbat); ALTCHA ca la sesizări, oprit implicit, pornit per sondaj. Valorile rămân configurabile (DN-15). *Efect de știut:* mai mulți votanți legitimi din aceeași rețea (familie pe Wi-Fi, rețea mobilă cu IP comun, o întâlnire publică pe același Wi-Fi) se pot opri la 10 pe oră; mesajul 429 le spune să revină mai târziu.

## 4. Propuneri tehnice (urmează designul; se aplică dacă nu decizi altfel)

| # | Problemă | Propunere |
|---|---|---|
| T-1 | Nu există coloana `closed_at`, iar retenția și backup-ul folosesc `end_at` | închiderea anticipată setează `end_at = acum`; fără migrație nouă (B2 §6.4: închiderea anticipată = editarea lui `end_at`) |
| T-2 | Vot fără cookie de participare (cookie șters, link direct, script) | 400 „Reîncărcați pagina” (cookie-ul se emite la `GET`); fără vot fără jeton |
| T-3 | Rezultate cerute înainte de închidere, la `after_close` | 403 cu mesaj; interfața arată „Rezultatele apar după închiderea consultării” |
| T-4 | Ce se blochează după primul vot | tipul, întrebările, opțiunile, obligativitatea, ordinea, `start_at`, `results_visibility` (P-6); rămân editabile titlul, descrierea, categoria, textele de ajutor și `end_at` (numai în viitor); toate cu audit. Tranziții: `draft → active → closed`; `active → draft` numai fără voturi; `closed` definitiv (P-1) |
| T-5 | Jurnalul serverului scrie IP-ul la fiecare cerere, deci IP-ul ar sta lângă ora votului (contra N4-7 și a deciziei de anonimat 4C3) | pe rutele `/public/surveys/*`, jurnalul nu conține IP-ul |
| T-6 | `rotate:keys` schimbă și `PARTICIPATION_HMAC_SECRET`, iar asta ar rupe unicitatea votului în sondajele deschise (risc R-9) | refuz, cu mesaj, cât timp există sondaje deschise; celelalte 3 chei se schimbă normal |
| T-7 | „Ștergerea” textelor libere la 6 luni | `text_value = NULL`; rândul rămâne, deci numărul de răspunsuri libere din arhivă nu se schimbă |
| T-8 | Procentele | aceeași regulă ca acum: voturile opțiunii / respondenții la acea întrebare, rotunjit la o zecimală (la alegere multiplă, totalul poate depăși 100%) |
| T-9 | Cheile vechi din `localStorage` | nu se mai citesc și nu se mai scriu din 5.6; ștergerea lor efectivă la 5.7 (B8) |

## 5. Efecte de știut

- Voturile date până acum în browser **nu se mută** pe server (ca la 5.3 și 5.4).
- „Ai participat deja” devine un indiciu de interfață; unicitatea reală o asigură serverul (409).
- Ștergerea cookie-urilor permite un vot nou: este limita acceptată prin N4-1, redusă de limitele pe IP și de ALTCHA, la nevoie.

## 6. Stare (01.10.2026, partea de server)

5.6.1–5.6.4 implementate: `shared/src/surveys.ts` (scheme, textul N4-1); `server/src/surveys.ts` (starea efectivă, cookie-ul de participare, amprenta HMAC, validarea răspunsurilor, votul în tranzacție cu blocarea rândului, rezultatele T-8, blocarea T-4, închiderea automată, retenția T-7); `routes/surveys.ts` (public) și `routes/adminSurveys.ts` (Admin + `/admin/dashboard`); jurnal fără IP pe rutele sondajelor (`requestLogSerializer`, T-5); `rotate:keys` cu T-6; CLI `surveys:close-expired` (+ scriptul npm `civic-surveys-close-expired`); seed demo P-4.

Detalii tehnice în limitele designului: jetonul „timp minim” (`formStartedAt`) se primește în răspunsul `GET /public/surveys/:id` (B2 cerea câmpul la vot, fără să numească sursa); un sondaj `active` înainte de `start_at` apare ca `upcoming` (nu e în lista deschisă, nu primește voturi).

Teste: `integration/surveys.test.ts` (19), `db.test.ts` (rotirea cu T-6, adaptată: cu un sondaj deschis se schimbă 3 chei, fără sondaje deschise 4; seed-ul P-4). Probe de control: fără blocarea structurii și fără restricția P-2, testele pică. Server 202/202; suita Python 71/71 (frontend neschimbat încă).

Urmează 5.6.5 (frontend), 5.6.7 (E2E și suitele vechi), 5.6.8 (staging).

## 7. Stare (02.10.2026, 5.6.5: interfața)

Implementat: `surveyService` este client al API-ului (fără date în `localStorage`; rămâne numai indiciul „Ai participat deja”, cheia `tmc_survey_participation_hint`, cu ID-uri de sondaje, N4-12). Datele demo din frontend (`src/data/mockSurveys.ts`) și tipurile vechi (`src/types/survey*.ts`) sunt eliminate; tipurile vin din `shared/`. „Reset Demo” eliminat (D4).

- **Public:** lista deschisă și arhiva (paginată), butonul „Rezultate” numai când D3 permite, textul N4-1 (în listă, în formular, la rezultate), data și ora în ora României (P-5), marcajul de integritate numai în arhivă (P-2). Formularul primește structura și jetonul de la server; ecranele 403 (consultare închisă), 409 („Ați participat deja”), 422 (erori pe întrebări sau formular reîmprospătat) și 429. Ecranul de confirmare nu mai afișează un identificator al participării: votul este anonim, iar serverul nu întoarce niciun ID.
- **Admin:** lista de la server, numărul de voturi, starea efectivă (E-3); formularul cu data și ora (ora României, `src/utils/roTime.ts`), vizibilitatea rezultatelor și blocarea structurii după primul vot (T-4, P-6); în „Inspectează”: ALTCHA per sondaj, marcajul „rezultate posibil afectate” cu notă, textele libere (numai `surveys.edit`, numai după închidere, cu audit). Închis = definitiv (P-1): fără „Editează” / „Activează” pe un sondaj închis.
- **Timpul minim (P-7):** `SURVEY_MIN_FORM_SECONDS` este acum în `shared/` (serverul îl folosește în `LIMITS`); interfața așteaptă diferența înainte de trimitere, ca un vot dat repede să nu fie respins.
- **Defect găsit și corectat (existent din 5.4):** rezolvarea ALTCHA în browser folosea varianta pentru Node a algoritmului (`altcha-lib/algorithms/sha`, cu `node:crypto`), care nu funcționează în browser. Efect: cu ALTCHA pornită, trimiterea din interfață eșua (și la sesizări, unde este oprită implicit și nu era acoperită de E2E). Corectat în `src/services/powSolver.ts` (varianta Web Crypto, `algorithms/web/sha`), folosit de sesizări și de sondaje. Verificat în browser la votul cu ALTCHA pornită; la sesizări rămâne de acoperit cu E2E la 5.6.7.
- **Fără ecran (în afara listei 5.6.5):** respingerile agregate (`GET /admin/surveys/:id/rejections`) și contoarele din `/admin/dashboard`.

Verificări: `tsc`, `typecheck` server, build, `git diff --check`: trec; server 202/202. Probă în browser pe serverul real (32 de verificări: listă, arhivă, vot, 409, 403, ALTCHA, Admin, operator): trec. Suita Python: 66/68; cele două FAIL sunt cele prevăzute la 5.6.7 și se adaptează acolo, cu explicație: `R-00` din `test_robustete_stocare` (rulează fără server, deci lista de sondaje nu mai are ce afișa) și `R6.5a` (apelează `resetToDemo`, eliminat prin D4; excepția oprește și verificările de după ea).

## 8. Stare (04.10.2026, 5.6.7 partea 1: suitele vechi adaptate)

Cele două verificări vechi care picau după 5.6.5 sunt adaptate. Nu a fost slăbită niciuna; regulile verificate sunt aceleași, mutate acolo unde stau acum datele (pe server).

| Verificare | De ce pica | Adaptarea |
|---|---|---|
| `R-00` (`tests/ui/test_robustete_stocare.py`) | suita rula pe `vite preview`, fără server; sondajele nu mai sunt în `localStorage`, deci lista era goală | build-ul de producție este servit de serverul Node, pe DB-ul de test cu datele demo. Verificarea este aceeași: pagina se randează și oferă „Participă”. Verificările `R-A05` (cheia veche coruptă) și `R-ALL` rămân neschimbate. |
| `R6.5a`, partea de sondaje (`tests/regression/test_regresie_6_1_6_5.py`) | apela `surveyService.resetToDemo()`, eliminat prin D4 | aceeași matrice de permisiuni, pe server: lista Admin fără sesiune → 401; operatorul listează (200), dar nu creează (403); D4: endpoint de resetare inexistent (404, chiar pentru `super_admin`) și funcția inexistentă în interfață. Restul lui `R6.5a` este neschimbat. |

Verificare nouă: `R-HINT` (indiciul „Ai participat deja” corupt în `localStorage`: fără ecran alb, „Participă” rămâne disponibil; 7 forme corupte).

Probe de control (cod stricat intenționat, apoi restaurat): fără protecția din `readHint`, `R-HINT` pică (ecran de eroare, 4 din 7 forme); cu `POST /admin/surveys` deschis operatorului (`surveys.view`), `R6.5a` pică (`op_create` = 422 în loc de 403).

Suita Python: 72/72 (71 + `R-HINT`). Rămâne din 5.6.7: E2E pentru sondaje (vot → rezultate, arhivă, 409 / 422 în interfață, Admin) și ALTCHA la sesizări în browser.

## 9. Stare (04.10.2026, 5.6.7 partea 2a: E2E pentru sondaje)

Suită nouă: `tests/e2e/test_5_6_sondaje.py` (32 de verificări, server real, DB de test), adăugată în `tests/run_all.py`.

- **Public (S-1…S-16):** lista deschisă și arhiva, „Rezultate” numai când D3 permite (`after_close` și `live`), textul N4-1, ora României, nimic în `localStorage` la simpla deschidere, validarea în browser, votul cu timpul minim, indiciul „Ai participat deja”, un singur vot în DB, 409 în interfață (fără indiciu, cu același cookie), rezultatele `live` fără textul liber, votul cu ALTCHA pornită, marcajul de integritate numai în arhivă (P-2), 403 în interfață (sondaj închis între timp).
- **Admin (SA-1…SA-13):** fără „Reset Demo”, validarea formularului, data și ora, crearea, blocarea după primul vot, modificarea titlului după vot, ALTCHA și marcajul de integritate, ștergerea cu voturi refuzată, închis = definitiv, textele libere după închidere cu audit, rezultatele Admin.
- **Operator (SO-1, SO-2):** numai vizualizare; fără secțiunea de protecție și fără texte libere.

Probe de control (cod stricat intenționat, apoi restaurat): cu butonul „Rezultate” afișat mereu, pică `S-2` și `S-11`; cu blocarea de după primul vot dezactivată în formular, pică `SA-6`.

Suita Python: 104/104. Rămâne din 5.6.7: ALTCHA la sesizări, în browser (corecția din 5.6.5 este verificată deocamdată numai la vot), și ecranele 422 / 429 din formularul de vot, care nu au încă verificare în interfață (pe server sunt acoperite de `integration/surveys.test.ts`).

## 10. Stare (04.10.2026, 5.6.7 partea 2b: ALTCHA la sesizări, în browser)

Suită nouă: `tests/e2e/test_5_4_altcha_sesizari.py` (4 verificări, server și DB proprii). Cu ALTCHA pornită: o depunere fără soluție este refuzată (422 generic, motivul `pow_invalid` înregistrat); depunerea din interfață cere provocarea, o rezolvă în browser și primește confirmarea cu TM-XXX; în DB, sesizarea apare o singură dată, iar soluția este marcată ca folosită.

Probă de control: cu varianta veche a algoritmului în `powSolver.ts` (cea pentru Node), `AS-2` și `AS-3` pică („Sesizarea NU a fost înregistrată”). Asta confirmă defectul din 5.4 și corecția din 5.6.5 și la sesizări. Codul a fost restaurat.

Suita Python: 108/108.
