# FAZA 7B — RAPORT

**Proiect:** Urbis Activ · **Branch:** `faza-5-backend` · **Ultimul commit 7B:** `711a7ae` · **Data:** 25.10.2026
**Stare:** proiect de raport, **neaprobat**. Codul 7B este publicat (`711a7ae`, CI verde) și instalat pe staging (`1ee19fe` la 24.10.2026; `711a7ae`, cu remedierea constatării 1, la 25.10.2026). **Checkpoint-ul 7B nu este acordat** (decizie separată a proprietarului, §9). **Lansarea nu este aprobată.**
**Baza:** `FAZA_7B_PLAN.md` (v1.2 rectificată la §10.3, aprobată la 20.10.2026; amendamentele AM-1…AM-11; deciziile din §15).
**Jurnalul staging-ului:** `docs/faza5/STAGING_URBISACTIV_JURNAL.md`, intervențiile 82–102 și observațiile 16–18.

## 0. Metoda și termenii

- **Emulare:** Playwright/Chromium cu `is_mobile` și `has_touch`, la 390 × 844 și 360 × 800 px; **nu** este test pe telefon real.
- **Telefon real:** un singur dispozitiv, Android cu Chrome. iPhone/Safari nu a fost disponibil: toate probele pe iPhone sunt **NEVERIFICATE**.
- **NEVERIFICAT:** probă neexecutată, cu motivul notat; nu se declară trecută.
- **Probe de control (§2.6, AM-5, AM-9):** pe o copie a depozitului cu `dist`, P0 întâi, SHA-256 înainte/după fiecare restaurare; fiecare încălcare simulată trebuie să facă testul să pice.

## 1. Rezumat

7B a tratat utilizarea pe mobil (A21-1, A21-2, A21-3a/b, AM-11), mesajele de eroare (E1–E3), confirmările Admin (O3), etichetele interne (N-7B-1) și formulările tehnice (E4–E5). Toate deciziile din inventarul aprobat sunt implementate, testate, publicate și instalate pe staging. Regresia cumulativă (7B.4) a trecut fără nicio diferență neexplicată. Pe telefonul Android, probele T1 și T3–T6 au trecut; T2, T7 și T8 au trecut parțial, subprobele rămase fiind **NEVERIFICATE**, cu motivele enumerate în §6. Au apărut trei constatări noi (§7): prima a fost remediată și verificată pe telefon la 25.10.2026 (`711a7ae`, §6.1); celelalte două rămân netratate. Un inconvenient vizual cu impact redus (controlul de zoom peste fereastra unui marker) este consemnat separat (§7.2).

## 2. Deciziile

Deciziile proprietarului sunt consemnate în `FAZA_7B_PLAN.md` §15:

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

`main` a rămas la `d9bc2c9` pe toată durata 7B.

## 4. Testele

| Suită | La `841d219` | La `1ee19fe` | Diferența |
|---|---|---|---|
| Server (`npm test`) | 506 | **507** | +1 (cazul E5-2 în `live`) |
| Python (`tests/run_all.py`) | 167 | **272** | +105: `test_7b2_mobil_erori` 12, `test_7b3_taburi_conturi` 7, `test_7b3_tinte_atingere` 52, `test_7b3_confirmari` 17, `test_7b3_etichete` 11, `test_7b3_texte_e5` 6. Suitele existente au același număr de verificări (167). Corectură: raportul 7B.4 din conversație indicase greșit „186 + 86”; totalul 272 era corect |

Testele existente adaptate (fără slăbirea verificărilor): `test_5_3_continut_public`, `test_5_6_sondaje`, `test_faza6_flux_critic`, `test_7b2_mobil_erori` (selectorii etichetelor și acceptarea dialogurilor O3). Fiecare test nou are probe de control; toate încălcările simulate au picat, P0 a trecut, restaurările au avut SHA-256 identic.

**După `711a7ae` (25.10.2026):** testul nou `test_7b5_popup_marker` (4 verificări, înregistrat în `tests/run_all.py`) a trecut 4/4, cu probe de control (P0 trece, cele 5 încălcări pică). Au fost rulate numai testele relevante: `test_7b3_tinte_atingere` 52/52 și `test_7b2_mobil_erori` 12/12; suita completă locală **nu** a fost reluată (decizia proprietarului). CI pe `711a7ae` (rularea 40134553200), inclusiv suita E2E: verde.

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

**Probele pe telefon** (jurnal, intervențiile 88–95):

| Probă | Android/Chrome | iPhone/Safari |
|---|---|---|
| T1 harta (mutare, zoom, „+”/„−” de 44 px, markeri) | trecut | NEVERIFICAT |
| T2 bannere | bannerul fundalului: trecut (textul E5-1, fără suprapunere peste zoom). Bannerul de eroare la încărcarea sesizărilor: NEVERIFICAT (nu se poate provoca de pe telefon) | NEVERIFICAT |
| T3 autentificarea cetățeanului și sesiunea | trecut | NEVERIFICAT |
| T4 sesizare cu fotografie (TM-016) | trecut | NEVERIFICAT |
| T5 vot | trecut (sondajul demonstrativ) | NEVERIFICAT |
| T6 Admin pe telefon (tab-uri, bara, conturi) | trecut | NEVERIFICAT |
| T7 confirmările O3 („Anulează”) | închiderea sondajului, din listă și din formular: trecut. Pornirea fluxului, „Reîncearcă”, ștergerea categoriei, „Marchează rezolvată”: NEVERIFICAT (pe staging lipseau condițiile: fluxul era pornit, niciun e-mail eșuat, toate categoriile au contacte, niciun subcont al Primăriei); acoperite de testele din emulare | NEVERIFICAT |
| T8 fotografii | fotografie din cameră (prin galerie): trecut. Camera direct din selector: indisponibilă (§7.3). HEIC: NEVERIFICAT (nicio fotografie HEIC) | NEVERIFICAT |

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
2. **Listele Admin goale, fără mesaj de eroare, după câteva minute cu ecranul oprit:** apoi Chrome a cerut parola lacătului, iar aplicația a cerut din nou autentificarea Admin. Inactivitatea (circa 7 minute) a fost sub limita de 60 de minute a sesiunii Admin. Cauza probabilă, neconfirmată: lacătul de pe staging (LiteSpeed răspunde 401, ca în observația 2 a jurnalului). Lipsa unui mesaj de eroare rămâne de verificat.

   **Analiza (25.10.2026, numai citire: jurnalul de accesări S1, tabela `sessions` S2, codul; detaliile în jurnalul staging-ului, observația 17.2 și intervențiile 103–104):**
   - **DEMONSTRAT:** pe 24.10.2026, în două episoade (08:23–08:25 și 08:36–08:37, ora României), cererile Admin au primit răspunsuri 401 de 1623 B și răspunsuri de 73 B / 23 B. Fiecare episod a fost precedat de un interval în care jurnalul nu înregistrează cereri și s-a încheiat cu o autentificare Admin nouă. Niciuna dintre sesiunile Admin identificate în S2 nu era expirată în acele momente; singurele revocări au fost prin rotația TOTP.
   - **PROBABIL** (pe baza dimensiunilor din jurnal și a codului, fără verificarea directă a corpurilor răspunsurilor de pe staging): răspunsurile de 1623 B provin de la lacătul staging-ului; răspunsurile de 73 B / 23 B provin de la aplicație și înseamnă „nicio sesiune Admin recunoscută în cerere”; „(0)” din tab-ul Sondaje a reprezentat starea de eroare sau de încărcare a listei, nu o listă goală (mecanism confirmat local, în testul A).
   - **H4:** expirarea normală a sesiunilor Admin identificate în S2 este infirmată. Identitatea sesiunii folosite efectiv de telefon nu este demonstrată.
   - **NECUNOSCUT:** motivul pentru care cererile nu purtau o sesiune Admin recunoscută; rolul lacătului în acest lucru; starea ecranului telefonului și ce s-a afișat pe el; cine a declanșat reîncărcarea de la 08:37:39.
   - **Observații de cod, independente de cauză (nicio remediere aprobată):** contoarele arată (0) în loc de starea de încărcare sau de eroare; orice eroare la verificarea sesiunii duce la formularul de autentificare; mesajul pentru un răspuns 401 fără JSON este generic.
3. **Camera nu este oferită direct pe Android:** câmpul de fotografii acceptă numai `image/png,image/jpeg,image/webp` și selecție multiplă (neschimbat din 09.10.2026). Probabil nici fotografiile HEIC nu pot fi selectate.

Constatările 2 și 3 sunt netratate; fiecare cere o decizie separată.

### 7.2 Observații cu impact redus

- **Controlul de zoom peste fereastra unui marker (25.10.2026, Android/Chrome):** într-o anumită poziție inițială a hărții, când fereastra se deschide aproape de marginea stângă, controlul „+”/„−” rămâne deasupra marginii stângi a ferestrei și acoperă parțial numărul TM și stadiul (observat la TM-003). Este comportamentul obișnuit al Leaflet. Deplasarea hărții poate elimina suprapunerea, conform observației din testul practic. Inconvenient vizual, nu defect major; fără remediere de cod în această etapă (jurnal, observația 18).

## 8. Subiecte deschise și limitări

- În afara inventarului 7B (decizii separate): codul „(A17-9)” din banda e-mailurilor eșuate; insigna „Activ (2A / 2B)” de pe Acasă; „Etapa 4A” din descrierea sondajului demonstrativ (`server/seeds/demo/surveys.json`).
- Din 7A, neprobate pe staging: `host-restore:recover`, `restore:db` cu codul nou, curățările noi din `purge:retention`.
- iPhone/Safari: nicio probă pe dispozitiv real.
- Din jurnalul staging-ului, încă deschise înainte de lansare: `TRUST_PROXY` (observația 4), „Force HTTPS Redirect” pentru producție (observația 3).

## 9. Checkpoint-ul 7B

**Neacordat.** Se decide separat de proprietar, după aprobarea acestui raport. Checkpoint-ul nu aprobă lansarea publică.
