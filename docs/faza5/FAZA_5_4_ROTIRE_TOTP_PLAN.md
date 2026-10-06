# SCHIMBAREA CHEII `TOTP_ENC_KEY` PE STAGING — PLAN

**Proiect:** Turnu Măgurele Civic · **Data:** 05.10–06.10.2026 · **Branch:** `faza-5-backend` · **Stare:** **pasul A făcut (comanda, testele, modul de probă); pasul B (rularea reală pe staging) este o decizie separată a proprietarului, neluată. Pe staging nu s-a rulat nimic.**
**Motiv:** continuarea rotirii din 01.10.2026 (`FAZA_5_4_ROTIRE_SECRETE_PLAN.md`, varianta A). Capturi ale fișierului `civic.env` de pe staging au ajuns în conversație pe 30.09; parola DB și cele 4 chei „ușoare” au fost schimbate la 01.10. `TOTP_ENC_KEY` a rămas, planificată „după al doilea `super_admin`”. Este ultima valoare din acele capturi încă în folosință.
**Design:** fără modificări de schemă și fără modificări ale contractelor API. Cheia rămâne una singură, cu aceleași derivări (HKDF) ca acum.

## 0. Doi pași (decizia proprietarului, 06.10.2026)

| Pas | Ce este | Risc pentru staging | Stare |
|---|---|---|---|
| **A** | comanda `rotate:totp-key`, testele ei și **modul de probă** (`--check`): face toate verificările, spune ce ar schimba și nu schimbă nimic | zero: totul se face pe calculatorul de lucru | făcut (§2) |
| **B** | rularea reală pe staging (§4) | există (§4, „Limită cunoscută”) | **nedecis**; aprobarea pasului A nu obligă la pasul B |

În pachetul de instalare intră numai proba (`civic-rotate-totp-key-check`) și backup-ul la cerere (`civic-backup-db`). Scriptul pentru rularea reală **nu este în pachet**; se adaugă numai dacă proprietarul aprobă pasul B.

## 1. Ce depinde de cheie și ce se întâmplă la schimbare

| Ce | Unde | La schimbarea cheii | Cine acționează |
|---|---|---|---|
| secretele TOTP ale conturilor Admin | `admin_users.totp_secret_enc` (AES-256-GCM) | **se recriptează** cu cheia nouă; intrarea din aplicația de autentificare rămâne valabilă, fără reînrolare | comanda nouă |
| codurile de recuperare Admin | `admin_recovery_codes.code_hash` (HMAC; codul în clar nu se păstrează) | **nu pot fi mutate**; cele vechi nu mai funcționează și se șterg | fiecare `super_admin` generează altele din Admin („Coduri de recuperare noi”) |
| amprenta e-mailului din blocări | `citizen_blocks.email_hash` (HMAC) | pentru blocările al căror cont există: **se recalculează** din adresa contului; pentru blocările unor conturi deja șterse („orfane”): **nu pot fi mutate** (adresa nu mai există nicăieri) | comanda nouă; pentru orfane, vezi §3 |
| codurile de cetățean în curs | `citizen_login_codes.code_hash` (HMAC; valabile 15 minute) | devin invalide; se șterg | cetățeanul cere un cod nou |
| linkurile de dezabonare | jeton HMAC calculat din ID-ul sesizării (nu se stochează) | linkurile din e-mailurile deja trimise devin invalide; cele noi se calculează cu cheia nouă | nimic de făcut; pe staging nu s-a trimis niciun e-mail real (`EMAIL_MODE=simulated`) |

**Nu sunt afectate:** sesiunile (Admin și cetățean rămân autentificați), parolele, sesizările, voturile, celelalte chei.

## 2. Comanda nouă `rotate:totp-key` (cod, cu teste)

Cod: `server/src/rotateTotpKey.ts`, `server/src/cli.ts`. Cu `--check` rulează ca probă: pașii 1–4 se execută într-o tranzacție care la final este **anulată**, iar pasul 5 nu se execută; rezultatul este numai lista de numere. Fără `--check`, comanda face schimbarea.

1. Citește `civic.env` (prin `CIVIC_ENV_FILE`); refuză dacă fișierul lipsește, nu are drepturi 600 / 400 sau `TOTP_ENC_KEY` lipsește ori apare de două ori.
2. Refuză dacă cheia din fișier nu este cea cu care a pornit comanda (de exemplu, o variabilă de mediu care o înlocuiește pe cea din fișier).
3. Generează pe server o cheie nouă (32 de octeți aleatori). Numără blocările orfane **active** (fără cont; definitive sau temporare neexpirate). Dacă există cel puțin una: **se oprește fără nicio schimbare** și afișează câte sunt (§3).
4. Într-o singură tranzacție în baza de date:
   - recriptează fiecare secret TOTP și **verifică** imediat că se poate citi cu cheia nouă și că este identic cu originalul;
   - recalculează `email_hash` pentru blocările care au cont;
   - șterge codurile de recuperare și codurile de cetățean neconsumate;
   - scrie un rând de audit (`system.keys.rotate_totp`, actor `system`; numai numere: câte secrete, câte blocări, câte coduri).
5. Scrie cheia nouă într-un fișier temporar lângă `civic.env` (drepturi 600), **confirmă tranzacția**, apoi redenumește fișierul temporar peste `civic.env` (redenumire atomică). Restul fișierului rămâne neschimbat, caracter cu caracter.
6. **Nu afișează nicio valoare**, nici veche, nici nouă. Afișează numai numerele de la pasul 4 și mesajul „Reporniți aplicația (Restart)”.

**Dacă ceva eșuează:** înainte de confirmarea tranzacției, baza de date și `civic.env` rămân exact ca înainte. Singurul moment delicat este între confirmare și redenumire: dacă redenumirea ar eșua, fișierul temporar cu cheia nouă rămâne pe disc, iar comanda spune exact ce fișier trebuie redenumit de mână. De aceea se face un backup chiar înainte (§4, pasul 3).

**Între rotire și Restart** aplicația care rulează are încă cheia veche în memorie: autentificarea Admin cu TOTP nu funcționează până la Restart (sub un minut, dacă Restart-ul urmează imediat).

**În pachet:** scripturile npm `civic-rotate-totp-key-check` (proba) și `civic-backup-db` (backup la cerere; aceeași comandă ca jobul cron de la 03:17). Rularea reală nu are script în pachet (§0).

**Teste (16):** `server/test/unit/rotateTotpKey.test.ts` (4) și `server/test/integration/rotateTotpKey.test.ts` (12, pe MySQL, cu două conturi `super_admin`):

- proba, prin funcție și prin CLI: întoarce numerele; baza de date, fișierul, drepturile și folderul rămân identice; niciun rând de audit;
- refuzurile, fiecare fără nicio schimbare: fișier lipsă, drepturi prea largi, cheie lipsă, dublată sau cu format greșit; fără `CIVIC_ENV_FILE`; cheia din fișier diferită de cea a comenzii; blocare orfană activă (definitivă sau temporară neexpirată); un secret care nu poate fi citit cu cheia actuală; un eșec simulat după toate scrierile, chiar înaintea confirmării (nu rămâne nici fișier temporar);
- rotirea reală prin CLI: în fișier se schimbă numai rândul cheii, drepturile rămân 600; secretele TOTP se citesc numai cu cheia nouă; amprenta blocării cu cont este cea calculată cu cheia nouă; blocarea orfană expirată nu oprește comanda și rămâne neatinsă; codurile de recuperare și codurile de cetățean nefolosite dispar, cele folosite rămân; un rând de audit, numai cu numere; nicio valoare de cheie în ieșire; `migrate:status` pornește cu fișierul nou;
- după „Restart” (o aplicație nouă, cu setările din fișier): ambele conturi intră cu același secret TOTP; un cod de recuperare vechi este respins, unul generat după rotire este acceptat; codul de cetățean cerut înainte este respins, unul nou funcționează; sesiunea de cetățean creată înainte rămâne validă; după ștergerea contului blocat, adresa nu poate fi refolosită (blocarea este găsită prin amprenta nouă);
- înainte de „Restart”, aplicația cu cheia veche nu acceptă codul TOTP (confirmă nota de mai sus);
- redenumirea eșuată după confirmare: fișierul temporar conține cheia nouă, fișierul de setări este cel vechi; o nouă rulare este refuzată (nu poate strica nimic); după redenumirea de mână și „Restart”, ambele conturi intră.

Probe de control (cod stricat intenționat, apoi restaurat; 11 variante, fiecare prinsă de cel puțin un test): proba care confirmă în loc să anuleze; fără oprirea la blocări orfane; fără recalcularea amprentei; fără ștergerea codurilor de recuperare; fără ștergerea codurilor de cetățean; fișierul temporar lăsat la eșec; cheia afișată în ieșire; eșecul redenumirii ascuns; fără compararea cheii din fișier; fără verificarea drepturilor; secretul nerecriptat.

## 3. Decizia proprietarului (05.10.2026)

Blocările orfane active: **comanda se oprește și spune câte sunt**; nu șterge nimic singură. Dacă apar, proprietarul decide atunci.

**Corecție (06.10.2026):** varianta de plan din 05.10 dădea ca exemplu „ridicarea lor din Admin”. Este greșit: o blocare rămasă fără cont **nu poate fi ridicată din Admin** astăzi (ruta de ridicare cere contul, iar lista de cetățeni nu o afișează). O blocare temporară orfană dispare singură la expirare (`purge:retention`); una definitivă rămâne. Dacă proba găsește o blocare definitivă orfană, este nevoie de o decizie de produs (de exemplu: o acțiune nouă în Admin, sau acceptarea pierderii acelei blocări), nu de o soluție tehnică aleasă de Claude.

Câte sunt pe staging se află, fără niciun risc, din probă.

## 4. Ordinea pe staging (proprietarul, cu ghid pas cu pas la execuție)

**Proba (se poate face oricând, independent de pasul B):** după un deploy care conține pasul A, „Run JS script” → `civic-rotate-totp-key-check`. Afișează numerele sau motivul opririi. Nu schimbă nimic și nu cere Restart. Fiind o acțiune pe hosting, are nevoie de aprobare și de T-ISO înainte și după, ca orice deploy.

**Pasul B (numai cu aprobare separată; scriptul `civic-rotate-totp-key` se adaugă atunci în pachet):**

0. **Înainte de orice:** al doilea cont `super_admin`, cu TOTP înrolat, de preferat pe alt dispozitiv. Motiv: dacă TOTP-ul unui cont nu mai merge, celălalt `super_admin` îl poate reseta din Admin.
1. T-ISO înainte (Claude: 1, 2, 4, 6; proprietarul: 5).
2. Deploy-ul pachetului nou (Upload, Extract, Restart; `health` → commit-ul nou).
3. „Run JS script” → `civic-backup-db` → un backup nou în `civic-test-data/backups`.
4. „Run JS script” → `civic-rotate-totp-key-check` (proba), apoi `civic-rotate-totp-key` → mesajul cu numerele și „Reporniți aplicația”.
5. **Restart** în Setup Node.js App.
6. Verificare: `health` → `ok`; autentificare în Admin cu **fiecare** dintre cele două conturi `super_admin` (parolă + cod din aplicația de autentificare).
7. Din fiecare cont: Admin → conturi → **„Coduri de recuperare noi”**; codurile se salvează în afara calculatorului.
8. T-ISO după; jurnalul de staging și nota în raport.

**Dacă autentificarea nu funcționează după pasul 5:**
- *Un singur cont nu poate intra:* celălalt `super_admin` îi resetează TOTP-ul din Admin; contul își înrolează din nou aplicația de autentificare.
- *Niciun cont nu poate intra:* cauza practic posibilă este că în `civic.env` a rămas cheia veche (redenumirea de la pasul 5 al comenzii nu s-a făcut). Comanda spune exact ce fișier temporar trebuie redenumit; după redenumire și Restart, autentificarea funcționează (caz acoperit de teste). O a doua rulare a comenzii în această stare este refuzată și nu schimbă nimic.
- **Limită cunoscută:** pentru cazul „niciun cont nu poate intra din alt motiv” nu există astăzi o comandă de revenire care să se poată rula din cPanel (`civic-bootstrap-admin` refuză cât timp există un `super_admin` activ). Riscul este redus de verificarea de la pasul 4 al comenzii (fiecare secret recriptat este citit înapoi cu cheia nouă înainte de confirmare) și de teste, dar nu este zero. Backup-ul de la pasul 3 păstrează datele; restaurarea lui se face numai într-un DB nou (`FAZA_5_1_BACKUP_RESTAURARE.md` §4) și nu aduce înapoi cheia veche.

## 5. Ce NU face acest pas

- Nu schimbă parola de protecție a subdomeniului (cPanel → Directory Privacy); nu apărea în capturi.
- Nu introduce chei multiple sau versiuni de cheie (ar fi o schimbare de design).
- Nu se aplică producției: acolo cheia se generează o singură dată, la instalare, și nu a fost expusă.

## 6. Commit-uri (cu aprobare)

1. pasul A: acest plan, comanda `rotate:totp-key` cu modul de probă, testele, cele două scripturi din pachet;
2. numai dacă se aprobă pasul B: scriptul rulării reale în pachet; după staging, jurnalul și nota în raport.
