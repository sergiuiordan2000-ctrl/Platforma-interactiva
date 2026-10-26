# FAZA 7B — RAPORT

**Proiect:** Urbis Activ · **Branch:** `faza-5-backend` · **Ultimul commit de cod 7B:** `711a7ae` · **Data:** 25.10.2026
**Stare:** raport **aprobat** de proprietar la 25.10.2026, ca document. Codul 7B este publicat (`711a7ae`, CI verde) și instalat pe staging (`1ee19fe` la 24.10.2026; `711a7ae`, cu remedierea constatării 1, la 25.10.2026). **Checkpoint-ul 7B a fost acordat** de proprietar la 25.10.2026, cu rezervele din §9. **Lansarea nu este aprobată.**
**Baza:** `FAZA_7B_PLAN.md` (v1.2 rectificată la §10.3, aprobată la 20.10.2026; amendamentele AM-1…AM-11; deciziile din §15).
**Jurnalul staging-ului:** `docs/faza5/STAGING_URBISACTIV_JURNAL.md`, intervențiile 82–105 și observațiile 16–18.

## 0. Metoda și termenii

- **Emulare:** Playwright/Chromium cu `is_mobile` și `has_touch`, la 390 × 844 și 360 × 800 px; **nu** este test pe telefon real.
- **Telefon real:** un singur dispozitiv, Android cu Chrome. iPhone/Safari nu a fost disponibil: toate probele pe iPhone sunt **NEVERIFICATE**.
- **NEVERIFICAT:** probă neexecutată, cu motivul notat; nu se declară trecută.
- **Probe de control (§2.6, AM-5, AM-9):** pe o copie a depozitului cu `dist`, P0 întâi, SHA-256 înainte/după fiecare restaurare; fiecare încălcare simulată trebuie să facă testul să pice.

## 1. Rezumat

7B a tratat utilizarea pe mobil (A21-1, A21-2, A21-3a/b, AM-11), mesajele de eroare (E1–E3), confirmările Admin (O3), etichetele interne (N-7B-1) și formulările tehnice (E4–E5). Toate deciziile din inventarul aprobat sunt implementate, testate, publicate și instalate pe staging. Regresia cumulativă (7B.4) a trecut fără nicio diferență neexplicată. Pe telefonul Android (un singur dispozitiv, Chrome), probele T1 și T3–T6 au trecut; T2 și T7 au trecut parțial, subprobele rămase fiind **NEVERIFICATE**, cu motivele enumerate în §6. La T8, fotografia aleasă din galerie a trecut. Camera directă și o fotografie HEIF au fost testate la 25.10.2026, pe o pagină de diagnostic separată (§7.1.3): cu atributele actuale ale aplicației, selectorul nu a oferit camera, iar fotografia HEIF nu a apărut în selector (relatarea proprietarului); într-o variantă alternativă (`accept="image/*"` cu selecție multiplă), fotografia a putut fi aleasă, dar Chrome nu a decodat-o. Rezultatele privesc un singur dispozitiv și un singur fișier HEIF; iPhone/Safari: **NEVERIFICAT**. Au apărut trei constatări noi (§7), investigate și documentate la 25.10.2026: prima a fost remediată și verificată pe telefon (`711a7ae`, §6.1); a doua este o limitare cunoscută, investigată; cauza exactă rămâne nedeterminată (§7.1.2); a treia a fost testată pe telefon, iar camera directă și suportul HEIC rămân neschimbate prin decizia proprietarului (§7.1.3). Pentru constatările 2 și 3 nu este aprobată nicio remediere de cod. Inventarul mesajelor de eroare și de refuz (C5) este în §4.1. Un inconvenient vizual cu impact redus (controlul de zoom peste fereastra unui marker) este consemnat separat (§7.2).

## 2. Deciziile

Deciziile până la 7B.4 sunt consemnate în `FAZA_7B_PLAN.md` §15. Deciziile din 7B.5 (25.10.2026, ultimele șapte rânduri) sunt consemnate în acest raport și în jurnalul staging-ului, nu în plan.

| Subiect | Decizia |
|---|---|
| A21-1 bannerele hărții | criteriile confirmate (20.10.2026) |
| A21-2 ținte de atingere | **B**, cu clarificările din 21.10.2026 (numai sub `md`; Admin 44 px pentru butoanele cu text, 24 px pentru iconițe și restul; excepție numai atribuirea hărții) |
| A21-3 tab-urile Admin | 3a în 7B.2; 3b **A** (bara de derulare vizibilă) |
| AM-11 conturile Admin | **A** (un card pe ecrane înguste) |
| O3 confirmările | **A** (toate cele cinci, plus închiderea din formularul de sondaj) |
| N-7B-1 etichetele interne | grupul A integral; footer **A**; Acasă **B**; Ghid **B** |
| E4 detaliile SMTP | **A** (păstrate pentru `super_admin`, fără cod) |
| E5 texte | E5-1…E5-4 aprobate; `sending` → „în curs de trimitere” |
| Constatarea 1 (fereastra markerului) | **varianta B**, remediată în `711a7ae` (§6.1) |
| Observația 18 (zoom peste fereastra markerului) | inconvenient cu impact redus, fără remediere de cod (§7.2) |
| Constatarea 2 (Admin pe telefon) | limitare cunoscută, investigată; cauza exactă rămâne nedeterminată; nicio remediere aprobată (§7.1.2) |
| Constatarea 3 (camera, HEIF/HEIC) | camera directă și suportul HEIC rămân neschimbate (§7.1.3) |
| C5 (mesajele de eroare și de refuz) | inventarul acceptat cu acoperire parțială; cele cinci lipsuri de acoperire acceptate ca riscuri documentate pentru checkpoint (§4.1) |
| Raportul 7B | aprobat ca document (25.10.2026) |
| Checkpoint-ul 7B | **acordat** (25.10.2026), cu rezervele din §9; lansarea publică nu este aprobată |

## 3. Commiturile

| Commit | Conținut | CI |
|---|---|---|
| `4ed3100`, `5999403` | planul 7B; AM-11 și deciziile după 7B.1 | — |
| `5a13a55` | 7B.2: bannerele hărții, tab-urile Admin pe mobil, mesajele de eroare (E1–E3) | 6/6 |
| `1703f18` | 7B.3 grupul 1: bara de derulare a tab-urilor (A21-3b), conturile ca un card (AM-11) | 6/6 |
| `c41875b` | 7B.3 grupul 2: ținte de atingere pe mobil (A21-2) | 6/6 |
| `ee123d1` | 7B.3 O3: confirmările Admin | 6/6 |
| `db15a89` | 7B.3 N-7B-1: etichetele interne | 6/6 |
| `17a1052` | §15: deciziile O3, N-7B-1, E4, E5 | — |
| `1ee19fe` | 7B.3 E5: formulările tehnice | 6/6 |
| `99ffa49`, `327cf71` | 7B.5: jurnalul staging-ului; acest raport | — |
| `711a7ae` | 7B.5: fereastra markerului — „×” fără suprapunere peste categorie, 44 × 44 pe mobil (constatarea 1, varianta B) | 6/6 |
| `bddfe82`, `4bc7f72`, `97827ee` | 7B.5: documentația remedierii constatării 1; concluzia constatării 2; rezultatele constatării 3 (jurnalul și acest raport) | verde (rulările 40170278840, 40173815229, 40177318661) |

`main` a rămas la `d9bc2c9` pe toată durata 7B.

## 4. Testele

| Suită | La `841d219` | La `1ee19fe` | Diferența |
|---|---|---|---|
| Server (`npm test`) | 506 | **507** | +1 (cazul E5-2 în `live`) |
| Python (`tests/run_all.py`) | 167 | **272** | +105: `test_7b2_mobil_erori` 12, `test_7b3_taburi_conturi` 7, `test_7b3_tinte_atingere` 52, `test_7b3_confirmari` 17, `test_7b3_etichete` 11, `test_7b3_texte_e5` 6. Suitele existente au același număr de verificări (167). Corectură: raportul 7B.4 din conversație indicase greșit „186 + 86”; totalul 272 era corect |

Testele existente adaptate (fără slăbirea verificărilor): `test_5_3_continut_public`, `test_5_6_sondaje`, `test_faza6_flux_critic`, `test_7b2_mobil_erori` (selectorii etichetelor și acceptarea dialogurilor O3). Fiecare test nou are probe de control; toate încălcările simulate au picat, P0 a trecut, restaurările au avut SHA-256 identic.

**După `711a7ae` (25.10.2026):** testul nou `test_7b5_popup_marker` (4 verificări, înregistrat în `tests/run_all.py`) a trecut 4/4, cu probe de control (P0 trece, cele 5 încălcări pică). Au fost rulate numai testele relevante: `test_7b3_tinte_atingere` 52/52 și `test_7b2_mobil_erori` 12/12; suita completă locală **nu** a fost reluată (decizia proprietarului). CI pe `711a7ae` (rularea 40134553200), inclusiv suita E2E: verde. Cu testul nou, `tests/run_all.py` înregistrează 272 + 4 = 276 de verificări; totalul este un calcul, nu rezultatul unei rulări: suita Python completă **nu** a fost reluată local la `711a7ae`. În CI, la `711a7ae` (rularea 40134553200), jobul E2E a executat pasul „Suita existentă (tests/run_all.py)” (`.github/workflows/ci.yml`, liniile 181–182), cu rezultat verde. La acest commit, `tests/run_all.py` include `test_7b5_popup_marker` și se oprește cu eroare la orice eșec neașteptat (`KNOWN_FAILS = {}`). Jurnalul detaliat al jobului nu a fost consultat, deci numărul verificărilor rulate în CI nu este confirmat.

### 4.1 Mesajele de eroare și de refuz (C5, inventar din 25.10.2026)

Criteriul din `FAZA_7_PLAN.md` §3: inventarul mesajelor de eroare și de refuz văzute de utilizator, cu verificarea că niciunul nu expune detalii interne. **Domeniu:** E1–E3 (7B.2) și handlerul erorilor serverului (RA-10), plus formatele comune de refuz. **Metoda:** numai citirea codului la `97827ee` și a testelor existente; niciun test nou, nicio modificare. **TESTAT** = un test din depozit verifică textul sau absența detaliilor; **PARȚIAL** = testul verifică numai codul HTTP; **CITIT** = identificat numai prin citirea codului.

| Zona | TESTAT | PARȚIAL | CITIT |
|---|---|---|---|
| Server, formatele comune (`app.ts`, `guards.ts`, `validation.ts`) | 500 generic cu `correlationId`, fără textul erorii (`errorsRA10.test.ts`); JSON invalid → „Cererea nu poate fi procesată.”, fără `FST_` (același test); rută inexistentă → „Resursa nu există.” (`app.test.ts`) | 415 și 413 (numai codul HTTP: `errorsRA10.test.ts`, `reports.test.ts`); fotografiile respinse pe server (statusurile, `reports.test.ts`) | celelalte erori 4xx (`REQUEST_ERROR`); 401 „Autentificare necesară.”; 403 (drepturi, TOTP, parola de schimbat); CSRF „Cererea a fost respinsă.”; validarea „Datele trimise nu sunt valide.” |
| Client, E1 (`apiClient.ts`, `useAsync.ts`) | eroarea JavaScript neașteptată → textul de rezervă, fără textul browserului; mesajul unei erori API afișat exact (T-E1, `test_7b2_mobil_erori`; un singur loc verificat) | — | celelalte 10 din cele 11 locuri cu text de rezervă; serverul de necontactat („Serverul nu poate fi contactat…”); răspunsul de eroare fără JSON („A apărut o eroare. Încercați din nou.”); blocul „Datele nu au putut fi încărcate.” (`LoadState.tsx`); mesajele la depunerea sesizării pentru 401, 403, 413, 415, 429 și rețea (`reportService.ts`); votul eșuat (`surveyService.ts`) |
| Client, E2 (fotografiile) | fotografia coruptă → „Nu s-a putut decoda imaginea…”; eroarea neașteptată → „Una dintre fotografii nu a putut fi procesată…”, fără textul erorii (T-E2) | — | limita de 15 MB, formatul neacceptat (practic inaccesibil, §7.1.3), contextul Canvas indisponibil |
| Client, E3 (formularul de sondaj) | 422 cu căi tehnice → „Întrebarea #2, opțiunea #3” și „alte câmpuri”, fără căi brute (T-E3) | — | — |

**Detalii interne:** din cele 118 apeluri `apiError` ale serverului, cele 16 în care codul sau mesajul nu este scris direct au fost urmărite până la sursă: texte fixe în română sau constante (limitele parolei, ale fotografiilor, ale sesizărilor); niciun mesaj nu include textul unei excepții, SQL, o cale de fișier sau un stack. Celelalte 102 au fost clasificate drept texte fixe după tiparul codului (codul și mesajul scrise direct în apel), printr-o căutare automată; formularea fiecărui mesaj nu a fost evaluată individual. Pe client, căile prin care textul tehnic al browserului sau căile brute ar ajunge pe ecran sunt închise și testate (E1, E2, E3). **Excepție intenționată:** `super_admin` vede eroarea brută a furnizorului SMTP în jurnalul e-mail (E4, varianta A); testat: operatorul nu o primește (`reports.test.ts`), iar pentru `super_admin` rămâne brută (`test_7b3_texte_e5`). `correlationId` nu este afișat utilizatorului.

**Concluzie:** în domeniul de mai sus nu a fost găsită expunerea unor detalii interne. Acoperirea prin teste este parțială. Inventarul C5 a fost acceptat de proprietar la 25.10.2026, cu acoperire parțială.

**Lipsuri de acoperire (acceptate de proprietar la 25.10.2026 ca riscuri documentate pentru checkpoint-ul 7B; nu sunt remediate):**
1. Răspunsurile de eroare fără JSON și blocul „Datele nu au putut fi încărcate.”, cazul constatării 2 (§7.1.2): niciun test în depozit; testul A (25.10.2026) a fost local, cu scriptul în afara depozitului.
2. E1: numai unul dintre cele 11 locuri cu text de rezervă este verificat de un test.
3. Textele de refuz pentru 401, 403, CSRF și validare, precum și mesajele la depunerea sesizării: identificate numai prin citirea codului.
4. 415, 413 și respingerile fotografiilor pe server: testate numai prin codul HTTP.
5. Serverul de necontactat și limitele locale ale fotografiilor: fără teste.

## 5. Regresia cumulativă (7B.4, 23.10.2026)

| Verificare | Rezultat |
|---|---|
| V1 server | 507/507 |
| V2 Python | 272/272 |
| V3 `tsc` (frontend și server) | curat |
| V4 testele noi | toate verzi |
| V5 măsurători înainte (7B.1) / după, la 390 și 360 px | A21-1: bannere peste zoom 2 → 0, suprapuneri 1 → 0, zoom 30 → 44 px. A21-2: ținte publice sub 44 px 97 → 2 (ambele: legătura Leaflet din atribuirea hărții, excepția aprobată); Admin sub 24 px 9/8 → 0. A21-3: înălțimi 40–104 px pe 1–5 rânduri → 44 px pe un rând, bara vizibilă. AM-11: butoane în afara ecranului 9 → 0 |
| V6 desktop la 1280 px față de `841d219` | 494 de elemente, 55 diferite, **toate explicate** prin N-7B-1 (tab-urile fără „(5B)”/„(4B)”; descrierile din Dashboard); 0 neexplicate |
| V7 diff cumulat | 47 de fișiere, toate din commiturile aprobate |
| V8 fișiere excluse | `outbox.ts`, `smtp.ts`, `routes/reports.ts`, `routes/citizens.ts`, autentificarea și migrările neschimbate; în `adminReports.ts` și `adminAccounts.ts` numai cele 3 șiruri E5 (AM-3) |

## 6. Staging și telefonul real (7B.5, 24–25.10.2026)

**Instalarea** (jurnal, intervențiile 82–87): backup `civic-backup-20261024T043033036Z` verificat; pachetul `civic-1ee19fe.zip` (SHA-256 `df9c9042f036b4f24367a59c55c333ccece90dee971d0edfb6dc5da88a3e80f8`) dintr-o clonă curată, fără `--bootstrap-email`; fără migrări, `civic.env` neschimbat; `health` `0.0.0+1ee19fe`; aplicația oprită circa 3 minute. Proba scurtă (pagina publică, Admin) a trecut. Arhiva de revenire `civic-f6d3456.zip` (SHA-256 `7c55368e…11231f8`) a fost verificată, dar nu a fost necesară.

**Probele pe telefon** (jurnal, intervențiile 88–95 și 105):

| Probă | Android/Chrome | iPhone/Safari |
|---|---|---|
| T1 harta (mutare, zoom, „+”/„−” de 44 px, markeri) | trecut | NEVERIFICAT |
| T2 bannere | bannerul fundalului: trecut (textul E5-1, fără suprapunere peste zoom). Bannerul de eroare la încărcarea sesizărilor: NEVERIFICAT (nu se poate provoca de pe telefon) | NEVERIFICAT |
| T3 autentificarea cetățeanului și sesiunea | trecut | NEVERIFICAT |
| T4 sesizare cu fotografie (TM-016) | trecut | NEVERIFICAT |
| T5 vot | trecut (sondajul demonstrativ) | NEVERIFICAT |
| T6 Admin pe telefon (tab-uri, bara, conturi) | trecut | NEVERIFICAT |
| T7 confirmările O3 („Anulează”) | închiderea sondajului, din listă și din formular: trecut. Pornirea fluxului, „Reîncearcă”, ștergerea categoriei, „Marchează rezolvată”: NEVERIFICAT (pe staging lipseau condițiile: fluxul era pornit, niciun e-mail eșuat, toate categoriile au contacte, niciun subcont al Primăriei); acoperite de testele din emulare | NEVERIFICAT |
| T8 fotografii | fotografie din cameră (prin galerie): trecut. Camera direct din selector: indisponibilă (§7.1.3). HEIF/HEIC (testul din 25.10.2026, pagină de diagnostic separată, un singur telefon, Chrome 155; §7.1.3): fotografia HEIF nu apare în selectorul actual (relatarea proprietarului); cu `accept="image/*"` și selecție multiplă a fost aleasă, dar Chrome nu a decodat-o | NEVERIFICAT |

**Urmele probelor:** TM-016 șters de autor (intervenția 96); contorul: 16. Votul de la T5 rămâne în sondajul demonstrativ. Nicio setare schimbată; niciun e-mail trimis în afara codului de autentificare de la T3.

### 6.1 Remedierea constatării 1 (25.10.2026, jurnal: intervențiile 97–102)

**Cauza (demonstrată prin cod și măsurare în emulare):** `.leaflet-popup-content { margin: 0 }` din `src/index.css` a eliminat marginea dreaptă de 24 px pe care Leaflet o rezervă butonului „×”, iar antetul ferestrei (`justify-between`) lipea eticheta categoriei de margine. Suprapunerea exista de la 09.10.2026, pe orice ecran, la sesizările fără fotografie; pe mobil, A21-2 (`min-height: 44px`, fără lățime minimă) făcea butonul o bandă de 24 × 44 px peste etichetă.

**Remedierea (varianta B):** butonul „×” are 44 × 44 px numai sub `md` (pe calculator rămâne 24 × 24 px); antetul ferestrei rezervă spațiul (`max-md:pr-10 md:pr-6`, `MapView.tsx`).

**Verificarea automată (emulare):** fără nicio intersecție între „×” și conținut la 390, 360 și 1280 px, inclusiv la categoriile „Spații verzi & parcuri” și „Salubritate & deșeuri”; spațiul dintre etichetă și „×”: 4 px pe mobil, 8 px pe calculator.

**Staging:** backup `civic-backup-20261025T053403154Z` verificat; `civic-711a7ae.zip` (SHA-256 `64776c23be718d58d3d22211c629f3cda7d4e4c4ff225c4f9beaa29d197f9d5d`); `health` `0.0.0+711a7ae`; fără migrări, configurație sau date noi.

**Telefonul real (Android/Chrome):**

| Verificare | TM-003 („Spații verzi & parcuri”) | TM-002 („Drumuri / carosabil”) |
|---|---|---|
| eticheta categoriei vizibilă întreagă, fără „×” peste ea | trecut | trecut |
| zona de atingere a lui „×” | trecut: cerc mare, atins ușor (confirmat de proprietar); **dimensiunea exactă de 44 × 44 px nu a fost măsurată pe telefon**, ci numai în emulare | la fel |
| închiderea ferestrei la atingerea lui „×” | trecut | trecut |
| iPhone/Safari | NEVERIFICAT | NEVERIFICAT |

## 7. Constatări noi

### 7.1 Constatările din probele pe telefon

1. **Constatarea inițială — fereastra markerului (Android):** butonul „×” acoperea parțial eticheta categoriei. **Remediată** în `711a7ae` și verificată pe telefon la 25.10.2026 (§6.1).
2. **Admin pe telefon: liste afișate cu „(0)” și cerere repetată de autentificare — limitare cunoscută, investigată; cauza exactă rămâne nedeterminată.**

   **Relatarea inițială (24.10.2026, proprietarul):** după câteva minute cu ecranul oprit (circa 7 minute, estimare), tab-ul Admin „D. Sondaje” afișa „(0)”, fără un mesaj de eroare în zona capturată (captura se oprea la câmpul de căutare); Chrome a cerut parola lacătului, apoi aplicația a cerut din nou autentificarea Admin. Ipoteza formulată atunci (lacătul staging-ului, ca în observația 2 a jurnalului) **nu a fost confirmată** de analiza de mai jos.

   **Analiza (25.10.2026, numai citire: jurnalul de accesări S1, tabela `sessions` S2, codul; detaliile în jurnalul staging-ului, observația 17.2 și intervențiile 103–104):**
   - **DEMONSTRAT:** pe 24.10.2026, în două episoade (08:23–08:25 și 08:36–08:37, ora României), cererile Admin au primit răspunsuri 401 de 1623 B și răspunsuri de 73 B / 23 B. Fiecare episod a fost precedat de un interval în care jurnalul nu înregistrează cereri (lipsa cererilor nu dovedește inactivitatea telefonului și nici starea ecranului) și s-a încheiat cu o autentificare Admin nouă. Niciuna dintre sesiunile Admin identificate în S2 nu era expirată în acele momente; singurele revocări au fost prin rotația TOTP.
   - **PROBABIL** (pe baza dimensiunilor din jurnal și a codului, fără verificarea directă a corpurilor răspunsurilor de pe staging): răspunsurile de 1623 B provin de la lacătul staging-ului; răspunsurile de 73 B / 23 B provin de la aplicație și înseamnă „nicio sesiune Admin recunoscută în cerere”; „(0)” din tab-ul Sondaje a reprezentat starea de eroare sau de încărcare a listei, nu o listă goală (mecanism confirmat local, în testul A).
   - **H4:** expirarea normală a sesiunilor Admin identificate în S2 este infirmată. Identitatea sesiunii folosite efectiv de telefon nu este demonstrată.
   - **NECUNOSCUT:** motivul pentru care cererile nu purtau o sesiune Admin recunoscută; rolul lacătului în acest lucru; starea ecranului telefonului și ce s-a afișat pe el; cine a declanșat reîncărcarea de la 08:37:39.
   - **Observații de cod, independente de cauză (nicio remediere aprobată):** contoarele arată (0) în loc de starea de încărcare sau de eroare; orice eroare la verificarea sesiunii duce la formularul de autentificare; mesajul pentru un răspuns 401 fără JSON este generic.
3. **Camera nu este oferită direct pe Android; fotografiile HEIF nu pot fi alese.** Câmpul de fotografii acceptă `image/png,image/jpeg,image/webp`, cu selecție multiplă (neschimbat din 09.10.2026).

   **Testul din 25.10.2026 (un singur telefon Android, Chrome 155; pagină de diagnostic separată de aplicație; jurnalul staging-ului, intervenția 105 și observația 17.3):**
   - **DEMONSTRAT pe acest dispozitiv:** selectorul actual deschide selectorul de fotografii al sistemului (Google Foto), fără opțiunea Camera. Camera lipsește și cu `accept="image/*"`, cu sau fără `multiple`; numai `capture="environment"` deschide direct camera, iar atunci galeria nu mai este oferită. Atribuirea inițială a cauzei (lista exactă de formate și selecția multiplă) este **infirmată** pe acest dispozitiv.
   - **DEMONSTRAT pe acest dispozitiv:** fotografiile JPEG existente se aleg și se decodează, inclusiv mai multe deodată.
   - **DEMONSTRAT pe acest dispozitiv, cu un singur fișier HEIF autentic** (`image/heic`, semnătura `ftyp heic`): în varianta identică cu aplicația, fotografia nu apare în selector și nu poate fi aleasă (relatarea proprietarului); în varianta `accept="image/*"` cu `multiple`, fișierul a fost ales, dar Chrome nu l-a decodat (`createImageBitmap`: `InvalidStateError`; `Image()`: eșuat). Celelalte variante nu au fost încercate cu fișierul HEIF.
   - **Observație de cod, neatinsă în practică:** un fișier HEIC ajuns în aplicație ar trece de validare (se acceptă orice `image/*`), iar la eșecul decodării mesajul ar fi „Nu s-a putut decoda imaginea… Fișierul poate fi corupt.”.
   - **Limite:** un singur dispozitiv; pagina a rulat într-un cadru izolat, nu în aplicație (varianta identică cu aplicația a reprodus comportamentul ei). Alte telefoane, versiuni Android sau browsere: **NEVERIFICAT**; iPhone/Safari: **NEVERIFICAT**.
   - Camera directă și suportul HEIC rămân neschimbate (decizia proprietarului, 25.10.2026); nicio schimbare de cod.

Constatările 2 și 3: investigația și documentarea sunt încheiate (25.10.2026). Nicio remediere de cod nu este aprobată. Pentru constatarea 2, eventualele remedieri ale observațiilor de cod cer o decizie separată a proprietarului. Pentru constatarea 3, camera directă și suportul HEIC rămân neschimbate (decizia proprietarului, 25.10.2026).

### 7.2 Observații cu impact redus

- **Controlul de zoom peste fereastra unui marker (25.10.2026, Android/Chrome):** într-o anumită poziție inițială a hărții, când fereastra se deschide aproape de marginea stângă, controlul „+”/„−” rămâne deasupra marginii stângi a ferestrei și acoperă parțial numărul TM și stadiul (observat la TM-003). Este comportamentul obișnuit al Leaflet. Deplasarea hărții poate elimina suprapunerea, conform observației din testul practic. Inconvenient vizual, nu defect major; fără remediere de cod în această etapă (jurnal, observația 18).

## 8. Subiecte deschise și limitări

- În afara inventarului 7B (decizii separate): codul „(A17-9)” din banda e-mailurilor eșuate; insigna „Activ (2A / 2B)” de pe Acasă; „Etapa 4A” din descrierea sondajului demonstrativ (`server/seeds/demo/surveys.json`).
- Din 7A, neprobate pe staging: `host-restore:recover`, `restore:db` cu codul nou, curățările noi din `purge:retention`.
- iPhone/Safari: nicio probă pe dispozitiv real.
- Din jurnalul staging-ului, încă deschise înainte de lansare: `TRUST_PROXY` (observația 4), „Force HTTPS Redirect” pentru producție (observația 3).
- Riscuri documentate, acceptate pentru checkpoint-ul 7B: cele cinci lipsuri de acoperire din §4.1.
- Constatarea 2: eventuala remediere a observațiilor de cod din §7.1.2 cere o decizie separată a proprietarului.
- Datele folosite la investigații: arhiva jurnalului de accesări (S1, intervenția 103) conține adrese IP; a fost descărcată și transmisă de proprietar pentru analiză și nu este în depozit; păstrarea sau ștergerea ei este decizia proprietarului, iar starea ei ulterioară nu a fost verificată. Pagina de diagnostic de la constatarea 3 (intervenția 105) a fost publicată la 25.10.2026 ca artifact privat claude.ai; la redactarea inițială a acestei secțiuni nu fusese ștearsă, iar starea ei nu fusese verificată. **Actualizare ulterioară (25.10.2026):** artifactul `Gu6GmhGVzWbsXzxxiL4DjU` a fost șters definitiv, cu aprobarea proprietarului, iar serviciul a confirmat ștergerea; istoricul versiunilor și comentariile au dispărut, iar artifactul nu poate fi restaurat. Copia HTML temporară din care fusese publicat (`diagnostic-selector-foto.html`, 11.511 B) a fost identificată fără ambiguitate și ștearsă. Ștergerile nu au modificat depozitul Git sau staging-ul.

## 9. Checkpoint-ul 7B

**Acordat** de proprietar la 25.10.2026, cu rezervele și limitările de mai jos.

**Baza deciziei:** evaluarea independentă a checkpoint-ului 7B (25.10.2026; consemnată în conversația de lucru, nu în repository) și acest raport, publicat la commitul `7ca59409595ed7f2709a49fd5a4fbc7269e124d2` (CI verde: rularea 40187048898, 6/6 joburi).

**Rezerve păstrate explicit** (nu sunt rezultate verificate și nu sunt remediate):
1. Raportul primar 7B.1 nu este disponibil pentru reverificare independentă (rezultatele au rămas în afara repository-ului, `FAZA_7B_PLAN.md` §13).
2. Probele de control ale testelor noi nu pot fi reverificate independent (rezultatele sunt consemnate în §4, fără un artefact reverificabil).
3. Starea actuală a staging-ului nu a fost reverificată; ultima dovadă directă este `health` `0.0.0+711a7ae` (jurnalul, intervenția 100).
4. iPhone/Safari și alte dispozitive sau browsere rămân **NEVERIFICATE** (§0, §6).
5. Numărul exact de teste executate în CI pentru `7ca5940` nu a putut fi confirmat: jurnalele detaliate ale joburilor nu au fost accesibile în mediul de verificare.
6. Cele cinci lipsuri de acoperire C5 rămân riscuri acceptate, neremediate (§4.1).
7. Constatările 2 și 3 rămân nerezolvate la nivel de cod, conform deciziilor documentate (§7.1.2, §7.1.3).

**Actualizare (26.10.2026):** rezerva 5 a fost închisă de proprietar (DEC-19, varianta a), pe baza jurnalelor recuperate ale rulării CI `40187048898`: fiecare job backend 507/507 teste, E2E 276/276. Detaliile și proveniența dovezilor sunt consemnate în `docs/faza7/FAZA_7_REGISTRU_DECIZII_ACTUALIZARI.md`. Textul original al rezervei este păstrat ca formulare istorică.

Checkpoint-ul 7B nu aprobă lansarea publică; lansarea rămâne o decizie separată a proprietarului, neacordată.
