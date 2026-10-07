# AMENDAMENT — NUMELE, DOMENIUL, GĂZDUIREA DE PRODUCȚIE ȘI MARIADB 11.4

**Proiect:** Turnu Măgurele Civic (numele nou al aplicației: „Urbis Activ”) · **Data:** 07.10.2026 · **Branch:** `faza-5-backend` · **Stare:** **decis de proprietar la 07.10.2026; codul adaptat și testat local (`91a43b6`); MariaDB 11.4 în CI din `f1d6276`; aplicația este instalată ca staging pe găzduirea nouă (`STAGING_URBISACTIV_JURNAL.md`); amendamentul nu a fost încă trimis la audit.**
**Origine:** alegerea găzduirii de producție (G6, deschisă din Faza 3). Găzduirea aleasă oferă MariaDB 11.4, nu MySQL 8.4.
**Ce modifică din deciziile anterioare:** **G2** (`PROJECT_RULES_AND_DECISIONS.md` §11.1): baza de date de producție devine MariaDB 11.4 în loc de MySQL 8.4 LTS. Închide **G6** (infrastructura de producție) și **G7** (domeniul). **Nu modifică** schema bazei de date, contractele API, regulile de retenție sau regula „`electrovolt.ro` nu se afectează”.

## 1. Deciziile proprietarului (07.10.2026)

| Cod | Decizia |
|---|---|
| G7 | Numele aplicației: **„Urbis Activ”**. Domeniul: **`urbisactiv.ro`**, înregistrat pe firma proprietarului (AC-DC CONCEPT S.R.L.), pe un an. |
| G6 | Găzduirea de producție: **ClausWeb**, plan „NodeJS1” cu cPanel, comandat și plătit pe 3 luni (07.10.2026), cu **IP dedicat** și serviciul „Remote SMTP” activat de furnizor. Cont separat de cel al `electrovolt.ro` și la alt furnizor. |
| G2 (amendament) | Baza de date de producție: **MariaDB 11.4** (pe server: 11.4.13). MySQL rămâne suportat: staging-ul actual rulează MySQL 8.0, iar CI rulează pe MySQL 8.0 și 8.4 și, din `f1d6276`, și pe MariaDB 11.4. |

Variantele analizate înainte de decizie: două oferte de găzduire partajată ale căror pagini nu precizau versiunile de Node și de bază de date (nu au fost urmărite mai departe); un VPS cu acces root (MySQL 8.4 posibil, dar administrarea și securitatea serverului ar fi revenit proprietarului); găzduirea aleasă. Mutarea `electrovolt.ro` la același furnizor a fost discutată și **nu a fost decisă**; nu face parte din acest amendament.

## 2. Ce s-a verificat pe contul nou (de către proprietar, din cPanel, la 07.10.2026)

| Verificare | Rezultat |
|---|---|
| Versiunea bazei de date („Server Information”) | `11.4.13-MariaDB-cll-lve` |
| Versiunea de Node disponibilă în „Setup Node.js App” | 24.21.0 |
| Cron Jobs, Zone Editor | există |
| Conexiune de ieșire către `smtp-relay.brevo.com`, porturile 587 și 465 | deschise (probă cu o sarcină cron temporară, ștearsă după probă) |

Din răspunsurile furnizorului (neverificate încă în practică): „Run NPM Install” și „Run JS script” există; fără acces SSH; aplicația pornește la cerere (Passenger), cu limita de 50 de procese și 4 GB RAM; cron cu interval de 2 și de 5 minute; certificat Let's Encrypt reînnoit automat, cu condiția ca domeniul să folosească serverele de nume ale furnizorului; backup zilnic, restaurat numai de furnizor, la cerere.

## 3. Cod și teste (`91a43b6`)

Fără adaptări, aplicația nu pornea pe MariaDB: schema se crea corect, dar prima încărcare a setărilor dădea eroare de sintaxă.

| Fișier | Schimbarea |
|---|---|
| `server/src/settings.ts`, `server/src/db/seeds.ts` | textul JSON se trimite ca șir; `CAST(? AS JSON)` există numai în MySQL. Ambele baze de date validează textul la scrierea într-o coloană JSON. |
| `server/src/db/backup.ts` | coloanele JSON se recunosc și pe MariaDB, unde sunt `LONGTEXT` cu o constrângere `CHECK (json_valid(col))`. Fără această schimbare, restaurarea din backup eșua („Column 'value' cannot be null”). Pe MySQL, partea nouă nu face nimic. |
| `server/test/integration/db.test.ts` | fără `CAST(… AS JSON)` în SQL-ul testelor; lista tabelelor se sortează în test, pentru că `ORDER BY TABLE_NAME` din `information_schema` diferă între MySQL și MariaDB. Verificările au rămas aceleași. |
| `server/test/integration/backup.test.ts` | „JSON null rămâne JSON null” se verifică prin `JSON_TYPE(value) = 'NULL'`. |
| `tests/e2e/test_5_4_altcha_sesizari.py` | fără `CAST('true' AS JSON)` la pornirea ALTCHA din test. |

Rezultate, locale (Node 22):

| Suită | MySQL 8.0.46 | MariaDB 11.4.7 |
|---|---|---|
| server (`node test/run.mjs all`) | 218 / 218 | 218 / 218 |
| suita Python (`tests/run_all.py`) | 126 / 126 | 126 / 126 |

`tsc`, `typecheck` server, build, `git diff --check`: trec.

Probe de control (într-o copie din afara repo-ului, fără `git stash`): fără recunoașterea coloanelor JSON, testul de restaurare pică pe MariaDB și trece pe MySQL; cu setarea `registry.flow_enabled` stricată în seed, testul adaptat pică pe ambele; `JSON_TYPE` deosebește JSON null de alte valori și de NULL SQL, la fel pe ambele.

## 4. De știut

- **Versiunea testată nu este cea de pe server.** Testele au rulat pe MariaDB 11.4.7 (singura din seria 11.4 care a putut fi instalată în mediul de lucru); serverul are 11.4.13.
- **CI rulează și pe MariaDB 11.4** (07.10.2026, `f1d6276`, aprobat de proprietar): un job suplimentar, „backend (Node 24, MariaDB 11.4)”, lângă matricea MySQL neschimbată; prima rulare (#53) a trecut la toate cele 6 joburi. Jobul acoperă testele serverului și pornirea artefactului. **Suita Python (E2E) rulează în CI numai pe MySQL 8.4**; pe MariaDB a rulat o singură dată, local (§3). Versiunea exactă adusă de imaginea `mariadb:11.4` în CI nu a fost citită (jurnalele joburilor nu au putut fi descărcate din mediul de lucru).
- **Staging și producție diferă.** Staging-ul actual (`civic-test.electrovolt.ro`) rulează MySQL 8.0 și Node 20. G3 prevede mutarea staging-ului pe infrastructura de producție și retragerea celui vechi; mutarea nu este decisă și nu este planificată încă.
- **Ordinea de sortare nu este identică** între cele două baze de date (văzută la numele tabelelor). În aplicație nu s-a găsit niciun efect în testele existente.
- **Mediul real: aplicația rulează din 07.10.2026** pe `test.urbisactiv.ro` (`999a9d5`; Node 24.21.0, MariaDB 11.4.13): migrare, seed-uri, `health`, un backup. Detalii și observații: `STAGING_URBISACTIV_JURNAL.md`. Trimiterea reală de e-mail rămâne de probat la 5.5b.
- **Remote SMTP depinde de IP-ul dedicat**, plătit lunar. Fără el, furnizorul nu permite conexiunile SMTP de ieșire, iar aplicația nu ar putea trimite codurile de autentificare.
- **Titularul domeniului este o firmă**, deci numele ei este public în registrul `.ro`. Firma devine și cea care răspunde de datele personale; de avut în vedere la politica de utilizare (E-6).
- **Numele vechi apare peste tot** (interfață, documente, numele repository-ului). Redenumirea în „Urbis Activ” nu este făcută și nu este planificată încă; se decide separat.
- Documentele scrise înainte de 07.10.2026 vorbesc despre „domeniul Civic”; acesta este acum `urbisactiv.ro`.

## 5. Ce urmează (fiecare cu aprobare separată)

1. Auditul acestui amendament (ChatGPT), împreună cu documentele netrimise încă.
2. MariaDB 11.4 în CI: **făcut** (`f1d6276`). Rămâne de decis dacă și suita Python rulează în CI pe MariaDB.
3. 5.5b: înregistrările DNS pentru Brevo în Zone Editor, apoi primul e-mail real (`FAZA_5_5B_GHID.md`; ghidul trebuie adaptat la găzduirea nouă).
4. Instalarea aplicației pe găzduirea nouă: **făcută** la 07.10.2026, ca staging (`test.urbisactiv.ro`). Rămân primul cont Admin și 5.5b.
