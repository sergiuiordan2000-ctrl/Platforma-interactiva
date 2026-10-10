# FAZA 5 — RAPORT FINAL (cerere de checkpoint)

**Proiect:** Urbis Activ (fost „Turnu Măgurele Civic”) · **Branch:** `faza-5-backend` · **Data:** 10.10.2026
**Plan:** Planul de Lucru Comun v1.1, Faza 5 (5.1–5.7), citit cu amendamentele din `docs/AMENDAMENTE_PLAN_V1_1_SI_MASTER_PLAN.md`
**Design:** `docs/faza4/` (înghețat la 28.09.2026), cu amendamentele din §3
**Stare Git la redactare:** `faza-5-backend` = `bd3aeaa`; `main` = `d9bc2c9`, neatins. De la checkpoint-ul Fazei 4 (`0d328a6`, 28.09.2026): 87 de commit-uri. Raportul a fost comis ca `e567585`.
**Checkpoint:** Faza 5 a fost **închisă de proprietar la 10.10.2026** (§11). Clarificările cerute la checkpoint sunt în §4 (mediul testelor) și §5 (codul de pe staging).

Acest raport adună rapoartele subfazelor; nu le înlocuiește. Dacă se contrazic, este valabil raportul subfazei, iar față de amândouă este valabil codul.

## 1. Rezumat

- Aplicația nu mai este „numai în browser”: toate domeniile (comunicate, Ghid, Apel rapid, conturi, sesizări, e-mail, sondaje) sunt pe server, cu bază de date. În browser rămâne o singură cheie, indiciul „Ai participat deja”.
- Cele șapte subfaze din plan sunt făcute. Criteriile de acceptare din B10 §6 sunt îndeplinite, cu limitele din §6.
- Față de designul înghețat există 9 abateri sau amendamente, toate decise explicit de proprietar, plus două schimbări de infrastructură (§3).
- Aplicația rulează pe găzduirea de producție aleasă (ClausWeb, MariaDB 11.4), ca staging închis cu parolă. E-mailul real și autentificarea cu Google au fost probate acolo.
- **Aplicația nu este gata de date reale.** Ce lipsește este în §7.1. Cel mai important punct tehnic: pe găzduire, aplicația nu vede adresa reală a vizitatorului (`TRUST_PROXY`), deci limitele anti-abuz s-ar aplica întregului oraș la un loc.

## 2. Subfazele față de plan

| Subfază | Cerința din plan (B10 §6) | Rezultat | Raport |
|---|---|---|---|
| 5.1 | server, bază de date, staging, teste; CI pe toată matricea; migrații; seed-uri; `check:no-demo` | făcut: Fastify 5, 30 de tabele într-o migrație, backup / restaurare, CI, staging | `FAZA_5_1_RAPORT.md` |
| 5.2 | autentificare, sesiuni, autorizare; conturile de cetățeni; P7 numai cu aprobare | făcut: parole `scrypt`, sesiuni în DB, CSRF, TOTP pentru `super_admin`, matricea de permisiuni; conturile hardcodate scoase din cod; **P7 închis cu aprobarea proprietarului**, `KNOWN_FAILS` gol | `FAZA_5_2_RAPORT.md` |
| 5.3 | conținutul public din API | făcut: comunicate, Ghid, Apel rapid, public și Admin | `FAZA_5_3_RAPORT.md` |
| 5.4 | sesizări complete, concurență, proiecția publică, coada de e-mail | făcut: cont de cetățean, `TM-XXX` fără refolosire, fotografii fără EXIF, publicare imediată fără moderare, limita UAT, asumare / preluare, ștergere definitivă, retenție 45 de zile | `FAZA_5_4_RAPORT.md` |
| 5.5 | e-mail `allowlist` verificat pe staging; `live` numai după A-17 | făcut: SMTP cu TLS, Brevo, SPF / DKIM / DMARC; proba reală reușită, inclusiv proba negativă a listei; **`live` nepornit** | `FAZA_5_5_RAPORT.md` |
| 5.6 | sondaje, anti-vot, D3 / D4 | făcut: vot anonim cu unicitate în DB, fără IP lângă vot, rezultate după D3, fără „Reset Demo”, ALTCHA | `FAZA_5_6_RAPORT.md` |
| 5.7 | nicio dependență de `localStorage` pentru date; curățarea cheilor vechi | făcut: 11 chei vechi șterse la pornire; datele din browser nu se migrează (D10-5) | `FAZA_5_7_RAPORT.md` |

De știut despre rapoartele subfazelor: `FAZA_5_5_RAPORT.md` §3 trece proba negativă a listei ca „neverificată”; ea a fost făcută ulterior, în aceeași zi (`STAGING_URBISACTIV_JURNAL.md`, intervenția 19).

## 3. Abateri și amendamente față de designul înghețat

Toate au fost decise de proprietar și sunt consemnate în `PROJECT_RULES_AND_DECISIONS.md` §13.1.

| # | Ce s-a schimbat | Ce modifică | Document |
|---|---|---|---|
| 1 | setările stau într-un fișier (`CIVIC_ENV_FILE`, drepturi 600), nu în variabilele aplicației | `00` §5 (decizia 5.1-A) | `FAZA_5_1_NOTE_IMPLEMENTARE.md` |
| 2 | ALTCHA și la sesizări (oprită implicit) | extinde contractele B2 | `FAZA_5_4_PLAN.md` §5 |
| 3 | sesiunea de cetățean nu expiră; cookie de 400 de zile | B3 §8, numai pentru cetățeni | `FAZA_5_4_RAPORT.md` §3 |
| 4 | ecranul de confirmare a votului nu mai arată un identificator | ecranul din design (impus de N4-7) | `FAZA_5_6_RAPORT.md` §6 |
| 5 | un singur câmp de adresă; întrebare la trimiterea fără pin | ecranul formularului | `AMENDAMENT_LOCATIE_FORMULAR.md` |
| 6 | baza de date de producție: MariaDB 11.4 | G2 | `AMENDAMENT_MARIADB_SI_GAZDUIRE.md` |
| 7 | numele „Urbis Activ”, domeniul `urbisactiv.ro`, găzduirea ClausWeb | închide G6 și G7 | același |
| 8 | `GET …/me?optional=1` → 200 „nelogat” | B2, numai prin adăugare | `AMENDAMENT_ME_OPTIONAL.md` |
| 9 | autentificarea cetățeanului cu Google (a doua migrație, trei rute, buton pe „Contul meu”) | B1, B2, B3, ecranul „Contul meu” | `AMENDAMENT_AUTENTIFICARE_GOOGLE_PLAN.md` |

Schimbări de infrastructură, fără efect asupra designului:

| # | Ce s-a schimbat | Document |
|---|---|---|
| 10 | staging-ul vechi (G4) retras; staging-ul este acum pe găzduirea de producție (G3) | `FAZA_5_1_STAGING_JURNAL.md` §16 |
| 11 | rotirea cheii `TOTP_ENC_KEY`: comanda și testele există; rularea reală nu a fost cerută | `FAZA_5_4_ROTIRE_TOTP_PLAN.md` |

Respinsă de proprietar: un tab de anunțuri / vânzări (06.10.2026).

## 4. Codul și testele

Rulate de Claude la 10.10.2026, pe `bd3aeaa`, **în mediul local de lucru al lui Claude** (MySQL 8.0.46, Node 22.22, Chromium). **Niciun test automat nu rulează pe staging și niciunul nu îl contactează.**

| Verificare | Rezultat |
|---|---|
| `npm run lint`, `typecheck` (server), build frontend, build server | trec |
| suita serverului (unit + API + integrare) | **289 / 289** |
| suita Python (`tests/run_all.py`), în browser, pe aplicația pornită local | **150 / 150** |
| `git diff --check` | curat |

Ce înseamnă „pe aplicația pornită local” (clarificare cerută la checkpoint): fiecare suită Python pornește singură, pe `127.0.0.1`, serverul Node al aplicației (`server/dist/app.js`, același fel de artefact ca pe staging), legat de baza de date locală de test, și îl folosește dintr-un browser Chromium fără interfață. Este serverul adevărat al aplicației, nu o simulare a lui; **nu este staging-ul**. Formularea inițială a raportului („pe serverul real”) era ambiguă și a fost corectată.

Suita Python, pe părți:

| Suită | Rezultat |
|---|---|
| `ui/test_robustete_stocare.py` | 12 / 12 |
| `security/test_suprafete_publice.py` | 9 / 9 |
| `regression/test_regresie_6_1_6_5.py` | 12 / 12 |
| `e2e/test_5_3_continut_public.py` | 16 / 16 |
| `e2e/test_5_4_sesizari.py` | 27 / 27 |
| `e2e/test_5_4_altcha_sesizari.py` | 4 / 4 |
| `e2e/test_5_4_locatie_formular.py` | 10 / 10 |
| `e2e/test_5_6_sondaje.py` | 36 / 36 |
| `e2e/test_google_autentificare.py` | 24 / 24 |

CI (GitHub Actions), verde la `bd3aeaa`: 6 joburi. Testele serverului rulează pe Node 20 și 24 cu MySQL 8.0 și 8.4, plus Node 24 cu MariaDB 11.4. Suita Python rulează într-un singur job.

Evoluția pe parcursul fazei:

| Moment | Server | Suita Python |
|---|---|---|
| intrarea în Faza 5 | — | 102 / 103 (P7, FAIL cunoscut) |
| 5.1 | 78 | 102 / 103 |
| 5.2 | 103 | 103 / 103, fără FAIL cunoscute |
| 5.3 | 134 | 119 |
| 5.6 | 202 | 112 |
| 5.7 | 202 | 115 |
| MariaDB | 218 | 126 |
| acum | 289 | 150 |

Scăderea suitei Python la 5.4–5.6 vine din înlocuirea a patru suite care testau modelul din browser cu teste pe server; corespondența verificare cu verificare este în `FAZA_5_4_RAPORT.md` §4. Nicio verificare nu a fost slăbită ca să treacă. Pentru testele noi s-au făcut probe de control (codul stricat intenționat, pe o copie → testul pică).

## 5. Staging

| Element | Stare |
|---|---|
| adresa | `test.urbisactiv.ro`, cu parolă de acces și `noindex` |
| găzduirea | ClausWeb (cea de producție), Node 24.21.0, MariaDB 11.4.13 |
| codul instalat | `08f4dc3`; schema la versiunea 2. **Față de vârful ramurii nu lipsește nimic funcțional** (vezi mai jos) |
| sarcini programate | backup zilnic, închiderea sondajelor (5 min), retenția zilnică, coada de e-mail (2 min) |
| e-mail | Brevo, modul `allowlist` |
| Google | client de test, starea „Testing” la Google |
| conturi Admin | două `super_admin`, cu TOTP |

**Codul din Git față de cel de pe staging** (clarificare cerută la checkpoint, verificată la 10.10.2026 cu `git diff 08f4dc3 e567585`): după `08f4dc3` există 5 commit-uri (`dc6d991`, `008cb9d`, `b46db36`, `bd3aeaa`, `e567585`), toate numai de documentație. Ele schimbă 5 fișiere `.md` și niciun fișier de cod, de test, de configurare sau de migrație. Folderele din care se construiește pachetul de staging (`dist`, `server/dist`, `server/migrations`, `server/seeds`, `server/data`) provin din surse neschimbate. Un pachet construit acum ar diferi de cel instalat numai prin numărul versiunii. **Nu există remedieri sau modificări funcționale care să lipsească de pe staging; nu este nevoie de un deploy.**

Probat real pe această găzduire, de proprietar: instalarea de la zero (migrare, seed-uri, backup); primul cont Admin cu TOTP; cod de cont primit pe e-mail; sesizare cu fotografie transmisă „Primăriei” (adresa de test) și notificarea autorului; refuzul unei adrese din afara listei; autentificarea cu Google, pe calculator și pe telefon.

Staging-ul vechi (`civic-test.electrovolt.ro`) a fost retras complet la 09.10.2026. Proiectul nu mai are nimic pe contul site-ului `electrovolt.ro`; verificările T-ISO de dinainte și de după retragere au fost identice.

## 6. Ce nu a fost verificat

1. **Sondajele pe staging-ul nou.** Votul și administrarea sondajelor au fost probate de proprietar numai pe staging-ul vechi (MySQL). Pe MariaDB sunt acoperite de testele serverului din CI, nu de o probă manuală.
2. **Suita Python pe MariaDB** a rulat o singură dată, local, la 07.10.2026 (126 / 126). În CI rulează numai pe MySQL 8.4.
3. **Restaurarea din backup** nu a fost exersată pe găzduire (cere o bază de date nouă); este acoperită de teste.
4. **E-mailul:** modul `live`, reîncercările și starea `failed` cu furnizorul real, linkul de dezabonare dintr-un client de e-mail, livrarea către alți furnizori decât Gmail.
5. **Google:** renunțarea („Anulează”) cu Google real; excepție consemnată, acoperită numai de testele automate.
6. **Jurnalul aplicației pe găzduire** nu poate fi citit din cPanel (`stderr.log` este gol), deci erorile din exploatare nu se pot vedea acum.
7. **Încărcarea:** nu s-a făcut niciun test cu mai mulți utilizatori simultan pe găzduire.
8. **Auditul extern al subfazelor** nu este complet consemnat (§8).

## 7. Probleme deschise la ieșirea din Faza 5

### 7.1 Blochează trecerea la date reale

| # | Problema | De ce contează |
|---|---|---|
| 1 | **`TRUST_PROXY`:** aplicația nu vede adresa reală a vizitatorului (confirmat la 09.10.2026) | toate limitele pe IP numără toți vizitatorii la un loc. Cu valorile din cod, pentru tot orașul: cel mult 5 sesizări pe oră și 20 pe zi, 10 voturi pe oră la un sondaj, 20 de cereri de cod și 20 de porniri Google pe oră. Câțiva utilizatori activi i-ar bloca pe ceilalți. Tichet deschis la furnizor la 09.10.2026 |
| 2 | „Force HTTPS Redirect” indisponibil din cPanel | un prim acces pe `http` nu este redirecționat de server |
| 3 | politica de utilizare și informarea privind datele personale nu sunt scrise; verificarea juridică este nedecisă | E-6, 2.9; textul de pe ecran este un rezumat provizoriu |
| 4 | acordul scris al Primăriei pentru e-mailul real (A17-1) | fără el, modul `live` nu se pornește |
| 5 | Google: pagina de confidențialitate, pagina principală, termenii; trecerea în „In production”; client separat pentru producție | cerute de Google înainte de folosirea publică |
| 6 | DMARC este `p=none` | întărirea lui este o decizie separată |
| 7 | datele demo de pe staging | producția refuză pornirea cu date demo (D10) |
| 8 | restaurarea unui backup pe o bază de date separată, pe găzduire, nu a fost exersată | fără ea, backup-ul zilnic este verificat numai de testele automate (§6, punctul 3) |
| 9 | jurnalul aplicației nu poate fi citit pe găzduire | erorile din exploatare nu s-ar vedea (§6, punctul 6) |

### 7.2 Decizii de produs deschise

| # | Subiect |
|---|---|
| 1 | sesizările despre vecini apar public, cu descriere și loc (întrebare de produs și juridică) |
| 2 | redenumirea în „Urbis Activ” în interfață, documente și repository |
| 3 | respingerile de vot și contoarele din tabloul de bord: există pe server, fără ecran în Admin |
| 4 | limita de 3 coduri pe zi este silențioasă; un mesaj generic ar putea fi decis |
| 5 | o blocare definitivă rămasă fără cont nu poate fi ridicată din Admin |

### 7.3 Tehnice, mici

| # | Subiect |
|---|---|
| 1 | un mesaj general apare de două ori pe „Contul meu” (observat la 09.10.2026, nereparat) |
| 2 | butonul Google folosește fontul dispozitivului, nu „Google Sans” |
| 3 | `FAZA_5_5B_GHID.md` descrie staging-ul vechi |
| 4 | pe staging, codurile TOTP ale celor două conturi `super_admin` sunt pe același telefon |
| 5 | coordonatele din „Corectează poziția” (Admin) se introduc ca text |
| 6 | parolele Admin istorice rămân în istoricul Git; nu mai sunt în cod și nu mai funcționează |

## 8. Starea checkpoint-urilor și a auditurilor

| Document | Aprobarea proprietarului | Auditul ChatGPT |
|---|---|---|
| 5.1 | 29.09.2026 | răspuns neprimit de Claude |
| 5.2 | 29.09.2026 | neconsemnat |
| 5.3 | 29.09.2026 | neconsemnat |
| 5.4 | închisă | răspuns neconsemnat |
| 5.5 | proba reușită, 08.10.2026 | raportul nu a fost trimis, după ce știe Claude |
| 5.6 | închisă | relatat de proprietar: „e ok” (06.10.2026); observațiile nu au ajuns la Claude |
| 5.7 | închisă | netrimis, după ce știe Claude |
| amendamentele: locație, MariaDB și găzduire, `/me?optional=1`, planul rotirii TOTP | decise și implementate | netrimise, după ce știe Claude |
| amendamentul Google | închis la 09.10.2026 | auditat: planul (08.10), pasul 3 (09.10), pasul 6 (09.10) |

Propunere: checkpoint-ul Fazei 5 să acopere și documentele din tabel rămase neauditate, ca să nu mai fie trimise unul câte unul.

## 9. Intrarea în Faza 6

Planul v1.1, citit cu amendamentele: Faza 6 este integrarea și checkpoint-ul MVP.

- Fluxul critic, fără pasul „Moderare”: **Cetățean (cont) → DB → Hartă (imediat) → E-mail către Primărie (numai la cerere) → „în analiză” → „rezolvată”.**
- Testul complet al fluxului și reauditul de securitate.
- Checkpoint formal înainte de Etapa 7.

Fluxul există și a fost probat pe bucăți (§5). Faza 6 îl verifică de la un capăt la altul, pe găzduirea de producție. Recomandarea lui Claude: problema `TRUST_PROXY` (§7.1, punctul 1) să fie rezolvată înainte de reauditul de securitate, pentru că limitele anti-abuz fac parte din el.

## 10. Cerere

**Checkpoint Faza 5:** subfazele 5.1–5.7 sunt făcute, iar criteriile B10 §6 sunt îndeplinite, cu limitele din §6 și problemele deschise din §7. Cer aprobarea proprietarului pentru închiderea Fazei 5 și intrarea în Faza 6.

Întrebări pentru auditor:

1. Lista abaterilor de la designul înghețat (§3) este completă? Vreuna cere reexaminare?
2. Limitele din §6 sunt acceptabile pentru închiderea Fazei 5, sau vreuna trebuie rezolvată înainte de Faza 6?
3. Împărțirea problemelor deschise (§7: ce blochează datele reale, ce este decizie de produs, ce este mic) este corectă?
4. `TRUST_PROXY` înainte de reauditul de securitate din Faza 6: de acord?
5. Documentele neauditate (§8) pot fi acoperite de acest checkpoint, sau trebuie auditate separat?

## 11. Checkpoint-ul Fazei 5 (10.10.2026)

**Decizia proprietarului (10.10.2026): Faza 5 este închisă și se trece la Faza 6**, cu limitele din §6 și problemele deschise din §7.

- Subfazele 5.1–5.7 nu se redeschid pentru a repeta verificări deja făcute. Rapoartele lor rămân neschimbate.
- Excepțiile documentate rămân consemnate ca atare, inclusiv testul real „Anulează” de la autentificarea cu Google, care nu a fost efectuat.
- Problemele din §7.1 nu redeschid Faza 5, dar se tratează înainte de folosirea publică, cu date reale. Niciuna nu este declarată rezolvată.
- Fără modificări funcționale noi și fără schimbări ale contractelor API sau ale designului înghețat, în lipsa unei decizii explicite.

**`TRUST_PROXY` rămâne blocant** pentru reauditul de securitate din Faza 6 și pentru lansarea publică. Nu se scrie `TRUST_PROXY=true` fără verificarea configurației reale a găzduirii. Problema se consideră rezolvată numai când teste pe staging arată că:

1. aplicația identifică adresa IP reală a clientului;
2. limitele anti-abuz funcționează separat pentru clienți diferiți;
3. un client nu își poate falsifica adresa prin antete HTTP;
4. comportamentul este corect pe staging.

Faptul că aplicația pornește sau că testele locale trec nu este o dovadă.

La checkpoint au fost cerute două clarificări, făcute în acest document: mediul în care rulează suita Python (§4) și diferența dintre codul din Git și cel de pe staging (§5). Niciuna nu a schimbat rezultatele raportului.
