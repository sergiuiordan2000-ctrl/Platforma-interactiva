# FAZA 7A — RAPORT, secțiunea D7-3 (R18 + R19)

> Secțiunea raportului 7A pentru D7-3. Raportul 7A complet (celelalte puncte din 7A, inclusiv R20) se scrie la sfârșitul 7A.

## D7-3 — R18 (conturile șterse) și R19 (coada de e-mail) la restaurare

**Deciziile proprietarului (16.10.2026):**
- R18: varianta A (marcaje de ștergere pentru conturi); D7-3a: varianta A (fără termen de expirare); protecții cerute: numai după ID, condiția `created_at < deletedAt`, validarea integrală a marcajelor înaintea primei scrieri.
- R19: varianta B (refolosirea fluxului `failed`), inclusiv mesajele `on_hold`; numai tipurile `registry_notification` și `citizen_status_update`.
- După auditul D7-3 (ChatGPT / Aristotel): intenții de ștergere scrise înainte de COMMIT, mutate în marcaje definitive după COMMIT, cu reconciliere; intențiile nereconciliate **nu** se aplică la restaurare (B); backup-ul refuzat la intenții ilizibile (A); fără ID-uri de cont în mesajele pentru operator și în jurnalul mutării eșuate (B); avertismentul pentru intențiile nereconciliate, text aprobat (D); C: logica stărilor e-mail neschimbată.

### Constatările auditului și ce s-a făcut

| Constatare | Rezolvare |
|---|---|
| Interogarea R19 nu filtra tipul mesajului | `SELECT` și `UPDATE` filtrează explicit tipurile și stările; test T15 (mesaj de alt tip, neschimbat); gardă statică I10 |
| Marcajul definitiv scris înainte de COMMIT rămânea după o tranzacție anulată | intenție înainte de COMMIT, marcaj definitiv după COMMIT, reconciliere la pornire și la backup (I1–I8, I11) |
| Backup-ul continua cu intenții ilizibile | refuz înaintea oricărei scrieri; copiile existente și rotația neatinse (I9); eroarea temporară nu oprește backup-ul (I9b) |
| ID-uri de cont în mesaje | numai numărul fișierelor și directorul (I6, I7, I9, I11) |
| Avertismentul pentru intențiile nereconciliate, insuficient | textul aprobat (I6) |
| Directoarele R18 recreate automat, chiar după o pierdere (auditul static) | creare automată numai la prima inițializare; martor + copiile `/2` ca dovezi; pierderea → refuz la pornire, backup și restaurare; refacere explicită (`markers:recreate-account-deletions` sau `--allow-missing-markers`); directorul temporar al backup-ului creat abia după verificarea marcajelor (D1–D5) |
| Contorul TM putea fi sincronizat (scris) înaintea refuzului pentru directoarele R18 pierdute (auditul static, 19.10.2026) | verificarea pierderii mutată la începutul `initBackupMarkers`, înaintea sincronizării; păstrată și în `initMarkerDirs`; `markers:rebuild-counter` neschimbat (D6) |
| Stările e-mail (C) | fără schimbare: `on_hold` există numai pentru fluxul către Primărie; acoperit de T7, T8, T11, T15 |

### Fișierele modificate

| Fișier | Schimbare |
|---|---|
| `server/src/db/accountDeletion.ts` (nou) | ștergerea contului (funcția comună rută / restaurare), numai după ID, garda datei; intenția înainte de modificări; reconcilierea |
| `server/src/db/markers.ts` | `account-deletions/` și `account-deletions-pending/`; intenția, mutarea atomică, eliminarea; validare strictă (exact două câmpuri); fotografia `civic-markers/2` (formatul 1 citit în continuare); mesaje fără ID-uri de cont |
| `server/src/db/backup.ts` | refuzul backup-ului la intenții ilizibile; reconcilierea înaintea fotografiei; validarea integrală înaintea restaurării; R18 și R19 în tranzacția restaurării; auditul; raportul |
| `server/src/routes/citizens.ts` | funcția comună; mutarea intenției după COMMIT (eșecul ei: 204, jurnal fără ID) |
| `server/src/main.ts` | reconcilierea la pornire |
| `server/src/db/reportCounter.ts` | D6: în `initBackupMarkers`, pierderea directoarelor R18 se verifică înaintea sincronizării contorului TM (refuzul nu modifică contorul din bază și nici marcajul lui) |
| `server/src/cli.ts` | raportul `backup:db` și `restore:db` (numai numere); comanda `markers:recreate-account-deletions` |

### Teste

- **Noi:** `d73RestaurareConturiEmail.test.ts` (21: T1–T15, T6 în cinci cazuri, T14 și T14b) `d73IntentiiConturi.test.ts` (16: I1–I11, I5 în două variante, I3b, I5b, I9b, ruta) și `d73DirectoareR18.test.ts` (11: D1, D2, D3 în trei variante, D3b, D3c, D4, D5, D6 în două variante).
- **Adaptate, cu notă în fiecare test:**
  - `backupSafety`, `counterWatermarkA1`, `restoreMarkersFormat`, `markers`: numai lista fișierelor din `BACKUP_DIR` (apar `account-deletions/`, `account-deletions-pending/` și martorul `account-markers-initialized.json`);
  - în `d73RestaurareConturiEmail`: T3 (lipsa directorului de intenții), T12 (marcajul creat prin intenție și mutare), T10 (două câmpuri noi în sinteza auditului), T14 (3 interogări pe `citizen_accounts`, toate după ID), T5 (un `BACKUP_DIR` de dinaintea R18 nu are nici directorul intențiilor, nici martorul).
- **Suite (MySQL 8.0.46, local):** serverul 489/489 (0 eșecuri, 0 anulate), înaintea testului D6; după D6 (19.10.2026) au rulat numai testele țintite: `d73DirectoareR18` 11/11 și fișierele care apelează inițializarea marcajelor (toate trec); suita Python 167/167; `tsc` fără erori; `git diff --check` curat.

### Probele de control (pe o copie cu `dist`, nu în depozit)

Fiecare probă: înlocuiri exacte (textul vechi trebuie să apară exact o dată), restaurarea fișierelor verificată cu SHA-256. P0 (copia neschimbată) trece de fiecare dată.

| Probă | Modificarea intenționată | Pică |
|---|---|---|
| K1–K7, K6b | (runda R18 inițială) | T1–T14, conform raportului din 16.10.2026, dimineața |
| Kr1, Kr2 | fără filtrul de tip în R19 | T15, T10 |
| N1 | marcaj definitiv înainte de COMMIT | I1, I2, I3, I3b, I4, I5, I5b |
| N2 | reconcilierea confirmă orice intenție | I1, I2, I5, I8 |
| N3 | reconcilierea fără `FOR UPDATE` | I5 (nu mai așteaptă), apoi în lanț I5b, I6, I7, I8, ruta |
| N4 | intenția eliminată la eroare | I4 |
| N5 | restaurarea aplică intențiile | I6 |
| N6 | intențiile corupte ignorate la restaurare | I7 |
| N7 | reconcilierea fără garda datei | I8 |
| N8, N9 | `UPDATE` fără filtrul de tip / de stare | I10 |
| Na1 | backup fără refuz la intenții ilizibile | I9 (și, în lanț, I6, I7) |
| Na2 | refuzul mutat după rotație, cu același mesaj | I9: `BACKUP_DIR` schimbat (și, în lanț, I6, I7, I9b) |
| Na3 | eroarea temporară oprește backup-ul | I9b |
| Nb1 | ID-uri în mesajele restaurării | I7 |
| Nb2 | ID în eroarea mutării | I11 (și, în lanț, I6, I7) |
| Nd1 | avertismentul vechi | I6 |
| Nr1 | ruta răspunde 500 la mutarea eșuată | I11 (și, în lanț, I6, I7) |
| Ma | recrearea tăcută a directoarelor pierdute | D3 (trei variante), D3b |
| Mb | martorul nu se scrie | D1, D2, D5; D3 numai în varianta fără copie-dovadă (pregătirea); variantele cu copie `/2` sunt prinse în continuare |
| Mc | copiile `/2` nu sunt dovadă | D3 (varianta fără martor) |
| Md | restaurarea ignoră pierderea | D3c |
| Me | directorul temporar creat înaintea verificării | D3 (trei variante) |
| Mf | verificarea pierderii mutată înapoi după sincronizarea contorului | D6 (ambele variante: marcajul, respectiv contorul din bază, schimbate) |

**Probe refăcute (spuse deschis):** K6 nu dovedea singur T2 (validarea strictă prindea modificarea mai devreme) → K6b; prima variantă a lui Na2 avea alt mesaj și pica pe text, nu pe starea `BACKUP_DIR` → refăcută cu același mesaj; prima rulare a probelor N s-a blocat din cauza unui ajutător de test care lăsa tranzacția deschisă → corectat, probele reluate de la P0; prima variantă a lui I9b folosea un obstacol care arăta ca un marcaj corupt → înlocuită cu o așteptare de blocare reală.

### Ce nu este verificat (limitări)

- **MariaDB 11.4:** nimic nu a rulat pe MariaDB; semantica blocării (I5, I5b) și `innodb_lock_wait_timeout` (I1, I9b) se confirmă prin CI, după publicare.
- **I3** simulează oprirea după COMMIT prin omiterea mutării, nu prin oprirea efectivă a procesului (oprirea reală este testată numai înainte de COMMIT, I2).
- **`fsync`** la o cădere de curent nu poate fi verificat prin teste.
- **T14 și I10** sunt gărzi statice (verifică textul codului).
- **I9b** așteaptă limita implicită de blocare a bazei (~50 s).
- **Limita cunoscută:** o ștergere confirmată, nereconciliată înainte de pierderea bazei, poate face contul să reapară; restaurarea o raportează, nu o rezolvă automat.

## Notă separată: R1 (sesizările) — în afara acestei runde

Mecanismul marcajelor de ștergere a sesizărilor (R1, Faza 6) nu a fost modificat. Două aspecte trebuie evaluate separat, cu decizie proprie:
1. marcajul unei sesizări se scrie direct înainte de COMMIT și rămâne pe disc dacă tranzacția se anulează după scriere (riscul corectat la conturi prin intenții);
2. mesajele despre marcajele de sesizare corupte afișează numele fișierelor (ID-urile interne ale sesizărilor).
