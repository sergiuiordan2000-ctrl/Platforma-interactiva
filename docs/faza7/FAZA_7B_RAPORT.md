# FAZA 7B — RAPORT

**Proiect:** Urbis Activ · **Branch:** `faza-5-backend` · **Ultimul commit 7B:** `1ee19fe` · **Data:** 25.10.2026
**Stare:** proiect de raport, **neaprobat**. Codul 7B este publicat (`1ee19fe`, CI verde) și instalat pe staging (24.10.2026). **Checkpoint-ul 7B nu este acordat** (decizie separată a proprietarului, §9). **Lansarea nu este aprobată.**
**Baza:** `FAZA_7B_PLAN.md` (v1.2 rectificată la §10.3, aprobată la 20.10.2026; amendamentele AM-1…AM-11; deciziile din §15).
**Jurnalul staging-ului:** `docs/faza5/STAGING_URBISACTIV_JURNAL.md`, intervențiile 82–96 și observațiile 16–17.

## 0. Metoda și termenii

- **Emulare:** Playwright/Chromium cu `is_mobile` și `has_touch`, la 390 × 844 și 360 × 800 px; **nu** este test pe telefon real.
- **Telefon real:** un singur dispozitiv, Android cu Chrome. iPhone/Safari nu a fost disponibil: toate probele pe iPhone sunt **NEVERIFICATE**.
- **NEVERIFICAT:** probă neexecutată, cu motivul notat; nu se declară trecută.
- **Probe de control (§2.6, AM-5, AM-9):** pe o copie a depozitului cu `dist`, P0 întâi, SHA-256 înainte/după fiecare restaurare; fiecare încălcare simulată trebuie să facă testul să pice.

## 1. Rezumat

7B a tratat utilizarea pe mobil (A21-1, A21-2, A21-3a/b, AM-11), mesajele de eroare (E1–E3), confirmările Admin (O3), etichetele interne (N-7B-1) și formulările tehnice (E4–E5). Toate deciziile din inventarul aprobat sunt implementate, testate, publicate și instalate pe staging. Regresia cumulativă (7B.4) a trecut fără nicio diferență neexplicată. Pe telefonul Android, probele T1 și T3–T6 au trecut; T2, T7 și T8 au trecut parțial, subprobele rămase fiind **NEVERIFICATE**, cu motivele enumerate în §6. Au apărut trei constatări noi, netratate (§7).

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

`main` a rămas la `d9bc2c9` pe toată durata 7B.

## 4. Testele

| Suită | La `841d219` | La `1ee19fe` | Diferența |
|---|---|---|---|
| Server (`npm test`) | 506 | **507** | +1 (cazul E5-2 în `live`) |
| Python (`tests/run_all.py`) | 167 | **272** | +105: `test_7b2_mobil_erori` 12, `test_7b3_taburi_conturi` 7, `test_7b3_tinte_atingere` 52, `test_7b3_confirmari` 17, `test_7b3_etichete` 11, `test_7b3_texte_e5` 6. Suitele existente au același număr de verificări (167). Corectură: raportul 7B.4 din conversație indicase greșit „186 + 86”; totalul 272 era corect |

Testele existente adaptate (fără slăbirea verificărilor): `test_5_3_continut_public`, `test_5_6_sondaje`, `test_faza6_flux_critic`, `test_7b2_mobil_erori` (selectorii etichetelor și acceptarea dialogurilor O3). Fiecare test nou are probe de control; toate încălcările simulate au picat, P0 a trecut, restaurările au avut SHA-256 identic.

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

## 7. Constatări noi (netratate; fiecare cere o decizie separată)

1. **Fereastra markerului (Android):** butonul „×” acoperă parțial eticheta categoriei.
2. **Listele Admin goale, fără mesaj de eroare, după câteva minute cu ecranul oprit:** apoi Chrome a cerut parola lacătului, iar aplicația a cerut din nou autentificarea Admin. Inactivitatea (circa 7 minute) a fost sub limita de 60 de minute a sesiunii Admin. Cauza probabilă, neconfirmată: lacătul de pe staging (LiteSpeed răspunde 401, ca în observația 2 a jurnalului). Lipsa unui mesaj de eroare rămâne de verificat.
3. **Camera nu este oferită direct pe Android:** câmpul de fotografii acceptă numai `image/png,image/jpeg,image/webp` și selecție multiplă (neschimbat din 09.10.2026). Probabil nici fotografiile HEIC nu pot fi selectate.

## 8. Subiecte deschise și limitări

- În afara inventarului 7B (decizii separate): codul „(A17-9)” din banda e-mailurilor eșuate; insigna „Activ (2A / 2B)” de pe Acasă; „Etapa 4A” din descrierea sondajului demonstrativ (`server/seeds/demo/surveys.json`).
- Din 7A, neprobate pe staging: `host-restore:recover`, `restore:db` cu codul nou, curățările noi din `purge:retention`.
- iPhone/Safari: nicio probă pe dispozitiv real.
- Din jurnalul staging-ului, încă deschise înainte de lansare: `TRUST_PROXY` (observația 4), „Force HTTPS Redirect” pentru producție (observația 3).

## 9. Checkpoint-ul 7B

**Neacordat.** Se decide separat de proprietar, după aprobarea acestui raport. Checkpoint-ul nu aprobă lansarea publică.
