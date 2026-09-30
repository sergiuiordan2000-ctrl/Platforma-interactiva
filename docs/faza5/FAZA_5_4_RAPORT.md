# FAZA 5.4 — RAPORT (în lucru: pașii 5.4.1–5.4.8; staging 5.4.9 urmează)

**Proiect:** Turnu Măgurele Civic · **Branch:** `faza-5-backend` · **Data:** 30.09.2026
**Plan:** `FAZA_5_4_PLAN.md` (aprobat 30.09.2026) · **Design:** B5, B6 §7, B7, B8, B2 §3, §4, §6.1, §6.5, §7 (înghețat; o singură extindere, decisă explicit: ALTCHA la sesizări, plan §5)

## 1. Pașii

| Pas | Rezultat | Commit |
|---|---|---|
| 5.4.1–5.4.5 | scheme Zod; limita UAT din OSM (verificată de proprietar); depunerea (multipart, fotografii fără EXIF, contor TM, idempotență, anti-abuz, 2.14); API public / cetățean / Admin; coada e-mail `simulated`; CLI; sesizările demo | `640dd5b` |
| — | CI: pasul „Artefactul” copiază și `server/data` (§5, nota 1); CI #17 verde | `d33fc7b` |
| 5.4.6–5.4.7 | frontend pe API: „Contul meu”, formularul nou (pin / poziția mea / adresă), harta cu zone și stadiu, Admin „Sesizări” fără moderare, setările fluxului, dezabonarea | acest commit |
| 5.4.8 | teste: server 165/165 (31 noi); E2E nou `e2e/test_5_4_sesizari.py` 25/25 (după P-2); suita Python revizuită 70/70 (§4) | acest commit |
| — | pinul hărții publice (§5, nota 5) | `a6aee5f` |
| — | sesiunea de cetățean: 120 de zile fără folosire, cookie persistent (§3); server 168/168 (2 teste noi, cu probă de control), suita Python 71/71 | acest commit |
| 5.4.9 | staging: pachet, deploy, `GEOCODER_URL`, test „Strada 1 Mai”, poziții demo, T-ISO | în curs |

## 2. Criteriile (B10 §6, rândul 5.4)

| # | Criteriu | Rezultat |
|---|---|---|
| 1 | sesizări complete pe server | ✅ depunere, listă proprie, ștergere, Admin, fără `localStorage` |
| 2 | teste de concurență | ✅ 8 depuneri simultane → 8 numere distincte și consecutive; rollback → număr neconsumat |
| 3 | proiecția publică | ✅ numai câmpurile B5 §3; coordonate cu 4 zecimale; stadiul public (A-7); fără autor / asumare / preluare |
| 4 | coada (`simulated`) | ✅ `on_hold` / `queued` / `simulated`; transport de captare în teste → `sent` → `in_analysis` + notificarea D9 |
| 5 | regresie fără FAIL-uri noi neexplicate | ✅ adaptările și înlocuirile sunt explicate în §4 |
| 6 | `tsc`, typecheck, teste server, `build`, `git diff --check`, suita Python | ✅ local; CI după commit |
| 7 | fără moderare (2.3, confirmat de proprietar la 29.09) | ✅ endpoint 404, permisiunea `reports.moderate` absentă și din frontend, ecranul Admin fără aprobare / respingere |
| 8 | aspectul ecranelor existente neschimbat | ✅ aceleași carduri și culori; s-au schimbat conținutul și textele; ecrane noi: „Contul meu”, panoul fluxului |

## 3. Decizii ale proprietarului (30.09.2026)

| Decizie | Conținut |
|---|---|
| sesizările demo | varianta A: prin `seed:demo`, cu retenția normală; 4 poziții și texte reale date de proprietar |
| ALTCHA la sesizări | A + A1: implementat, oprit implicit, pornit numai prin CLI; extindere explicită B2 (plan §5) |
| limita UAT | poligonul OSM (relația 10664112) verificat vizual de proprietar (T-B6) |
| pinul propus prin adresă și mutat | devine punct exact (`pin`); nemutat rămâne zonă (`geocoded`) |
| sesiunea de cetățean (observație pe staging: codul cerut din nou) | expiră după **120 de zile fără folosire**, cookie persistent reînnoit la fiecare cerere autentificată; înlocuiește numai pentru cetățeni valorile 60 min / 12 h (propunere DN-15). Admin neschimbat: cookie de sesiune, 60 min / 12 h |

## 4. Testele vechi: ce s-a păstrat, ce s-a schimbat și de ce (B10 §7)

Patru suite Python verificau modelul din browser (`localStorage`). Regulile lor au fost reevaluate una câte una:

| Suita veche | Ce devine | Motiv |
|---|---|---|
| `services/test_6_6_asumare_preluare.py` (54) | **înlocuită** de `server/test/integration/reports.test.ts` și E2E A-1…A-8 | serviciul din browser nu mai conține logică; regulile se aplică pe server |
| `ui/test_6_6_ui.py` (19) | **înlocuită** de `e2e/test_5_4_sesizari.py` | aceleași ecrane, acum pe serverul real |
| `security/test_suprafete_publice.py` (9) | **adaptată**: sesizarea de test se creează prin API; A-08 și PII-2 actualizate | A-7, 2.3 |
| `regression/test_regresie_6_1_6_5.py` (12) | **rescrisă** pe server; R6.1 revizuit conform A-1 (anunțat în B10 §7) | A-1 |

Corespondența verificărilor (grupate):

| Verificări vechi | Stare | Unde se verifică acum |
|---|---|---|
| ID1–ID3 (identitatea conturilor), PERM1 (matricea 24 / 13) | schimbate prin decizii anterioare | conturi pe server (5.2); matricea 26 / 12 (server), 23 / 12 afișare (frontend, fără `reports.moderate`) |
| S1–S8, M1–M6, NEW-* (asumare / preluare, idempotență, retragere) | **păstrate**, cu o regulă schimbată: asumarea / preluarea **nu mai schimbă stadiul** (C-3; înainte `new → in_progress`) | `reports.test.ts` („Admin: …”), E2E A-2, A-5, A-8 |
| S10a–c (refuzuri fără sesiune / rol greșit) | păstrate | server: 401 / 403 (`reports.test.ts`, regresie R6.5a) |
| P1–P4, PS1–PS4, PRIV-3 (modelul public fără flux intern și date personale) | păstrate; **stadiul devine public** (A-7) | `reports.test.ts` (proiecția), regresie R6.5b, E2E H-3 / P-1, securitate PII-1 / PII-2 |
| E1–E2 (e-mailul simulat nu înseamnă preluare / „în analiză”) | păstrate | `reports.test.ts` (flux: `simulated` → stadiul rămâne `new`) |
| PRIV-1…PRIV-5, 3E-1…3E-5, N1 (moderare, „privat”, „Public / Public anonim”) | **eliminate prin decizii**: fără moderare (2.3), fără opțiunea de afișare (2.8), publicare imediată (D9, A-2) | E2E C-3 (opțiunile lipsesc), H-1 (publicare imediată) |
| Q1, R6.2 (cota `localStorage`) | nu se mai aplică (fără `localStorage`) | echivalent: R6.2 nou (eroare pe server → fără confirmare, formular păstrat) |
| S9a–d (date vechi în browser) | nu se mai aplică | cheile vechi se curăță la 5.7 (B8) |
| R6.1 „nicio metodă de ștergere” | **revizuit (A-1)**: ștergere numai de autor și super_admin; TM fără refolosire | regresie R6.1, `reports.test.ts` („ștergerea definitivă”, „numerotarea”) |
| UI0–UI12 (butoane Admin, popup, e-mailul în Admin) | păstrate; e-mailul autorului **numai pentru super_admin** (A-8; înainte și operatorul) | E2E A-1…A-8, P-1 |

Alte două teste adaptate: `backup.test.ts` și `db.test.ts` scot sesizările demo după `seed:demo`, pentru că își numerotează singure sesizările de la TM-001; scenariile lor rămân neschimbate.

Nicio verificare nu a fost slăbită ca să treacă. R6.3 (XSS) a fost întărită: deschide popup-ul exact al sesizării cu payload și verifică afișarea literală.

## 5. Probleme găsite și reparate pe parcurs

1. **CI #16 roșu (4 × backend):** pasul „Artefactul” nu copia `server/data/`; serverul refuză, corect, pornirea fără limita UAT. Reparat în `d33fc7b`; verificat local cu probă de control (fără reparare → eșec).
2. **Fotografia blocată de CSP:** conversia imaginii folosea `fetch('data:…')`, blocat de `connect-src 'self'`; orice sesizare cu fotografie ar fi eșuat. Conversie directă, fără `fetch`. Prins de E2E C-4.
3. **Harta din formular cu înălțimea 0:** stilul global `.leaflet-container { height: 100% }` anula clasa Tailwind; înălțimea e pusă direct pe element, ca în harta publică.
4. **Linkul de dezabonare** era citit numai la încărcarea paginii; acum și la schimbarea adresei cu aplicația deschisă. Jetonul se scoate imediat din bara de adrese.
5. **Pinul de pe harta publică desenat la ~25–30 m nord de punct** (moștenit din Etapa 3D, observat de proprietar pe staging la TM-003): iconița era deplasată de două ori (ancorarea Leaflet + clasele `-translate-x-1/2 -translate-y-full`). Reparat în `MapView`, cu aspectul neschimbat; testul E2E P-2 compară vârful pinului cu centrul zonei desenate de Leaflet în aceeași coordonată (cod vechi: −16 / −26,5 px; reparat: < 1,5 px). Datele din DB erau corecte.

## 6. Constatări și limitări

- Textul „regulile de utilizare” de la crearea contului este un **rezumat provizoriu** al deciziilor 2.9 / 2.10; politica oficială se redactează separat, cu verificare juridică (E-6).
- E-mailurile rămân `simulated`: nu pleacă nimic real; sesizările cu transmitere cerută rămân „nouă” până la 5.5.
- `reports.gps_accuracy_m` rămâne nefolosit: contractul B2 nu transmite precizia GPS (D6-6 cere oricum să nu se păstreze după mutarea pinului).
- Coordonatele din „Corectează poziția” (Admin) se introduc ca text (lat / lng), copiate de pe openstreetmap.org; o hartă de alegere în Admin poate veni ulterior, dacă se decide.
- Sesizările salvate anterior în browser nu se mută pe server.
- Cookie-ul de sesiune este **comun** pentru Admin și cetățean (`__Host-civic_sid`, B3 §3): autentificarea în Admin în același browser înlocuiește sesiunea de cetățean (probabil cauza codului cerut din nou pe staging). Comportament neschimbat; se testează cu browsere sau profiluri separate.
- Sesizările despre probleme între vecini (de exemplu, zgomotul) apar public cu descriere și loc, chiar fără transmitere către Primărie. Este o întrebare de produs și juridică (2.9, E-6), nu o eroare tehnică; o semnalez pentru decizie separată.
- Feedbackul auditului ChatGPT la 5.1: încă neprimit.

## 7. Cerere

După 5.4.9 (staging), acest raport se completează cu jurnalul de staging și cu cererea de checkpoint.
