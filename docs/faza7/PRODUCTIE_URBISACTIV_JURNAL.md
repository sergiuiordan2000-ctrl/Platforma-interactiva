# PRODUCȚIA (`urbisactiv.ro`): JURNALUL INTERVENȚIILOR

**Proiect:** Turnu Măgurele Civic („Urbis Activ”) · **Găzduire:** ClausWeb, același cont cPanel ca staging-ul (G6-1 c) · **Început:** 16.11.2026
**Baza:** procedura E4 r5 (registrul §52; în afara depozitului, SHA-256 `8d4c400d48de9731dc2c187e7e89c6dfbf4c187ba9c22bb029147e2f7344e5ae`); autorizarea E4 a proprietarului din 16.11.2026, 20:13 (registrul §53).
**Staging-ul** (`test.urbisactiv.ro`) are jurnalul lui: `docs/faza5/STAGING_URBISACTIV_JURNAL.md`. Nu a fost atins în E4.

## 1. Reguli și convenții

- Numele contului cPanel se scrie `<cont>`; folderul principal este `/home2/<cont>`. În depozit nu intră parole, chei, adrese de e-mail, utilizatorul lacătului sau numele contului.
- Click-urile în cPanel le dă proprietarul, după ghid, câte un pas; fiecare pas cu efect a avut acordul lui.
- Orele sunt ora României; orele din numele copiilor sunt UTC.
- Pașii P-n sunt cei ai procedurii E4 r5 (§4 al procedurii). Abaterile se marchează **abatere** și sunt reluate în registrul §53.3.

## 2. Pregătirea pe calculator (16.11.2026)

| # | Ora | Intervenția | Verificarea / dovada | Rezultat |
|---|---|---|---|---|
| 1 | ~20:10 | Google Auth Platform → Audience: citire | „Publishing status: Testing”, „User type: External”, 0 utilizatori de test (captură). Decizia proprietarului (20:12): E4 continuă cu clientul în „Testing”; Branding și „Publish app” după lansare | **constatare** |
| 2 | 20:16 | arhiva `civic-4198e8d.zip` pe calculator: dimensiune și SHA-256 | `1506842` B; `8D89F83A…EE67AC7` = amprenta aprobată (§47.3) (captură). Condiția 3 a procedurii | **OK** |
| 3 | 20:18–20:43 | `civic.env` de producție (`D:\urbis-prod-env\`), UTF-8 fără BOM, linii LF, 23 de rânduri; cele 5 secrete (`IP_HASH_SECRET`, `PARTICIPATION_HMAC_SECRET`, `FORM_TOKEN_SECRET`, `POW_HMAC_KEY`, `TOTP_ENC_KEY`) generate și scrise direct în fișier cu generatorul criptografic din Windows (PowerShell, 32 de octeți, 64 de caractere hex), fără clipboard; parola bazei din generatorul managerului de parole (28 de litere și cifre); cheia SMTP Brevo nouă (D-B5-2); clientul Google nou (D-B5-3) | verificare automată, fără afișarea valorilor (captură): BOM `False`, CR `False`, 23 de rânduri, niciun substitut rămas, nicio valoare cu spații sau ghilimele, `DATABASE_URL` și căile pe același cont, `SMTP_USER` de forma Brevo, cheia SMTP de 90 de caractere, clientul Google în forma corectă | **OK**, cu **abaterea A1** (generatorul) |
| 4 | 20:39–20:43 | corectură: proprietarul a observat că înlocuise numele contului cu un alt cont; numele corectat în `civic.env` și în managerul de parole | verificarea reluată: toate `True`, inclusiv prefixul contului în `DATABASE_URL` și în căi (captură) | **OK** |

## 3. Ziua 1, prima parte (16.11.2026, seara)

| # | Ora | Pas | Verificarea / dovada | Rezultat |
|---|---|---|---|---|
| 5 | 20:44 | **P-1** Domains | `urbisactiv.ro`: Main Domain, document root `/public_html`, „Force HTTPS Redirect” oprit (captură) | **OK** |
| 6 | 20:45–20:48 | **P-1** conținutul `public_html` | `.well-known`, `cgi-bin`, `.htaccess` (614 B, numai directivele PHP generate de cPanel), `.user.ini`, `php.ini` (07.10.2026) **și** `index.php`, `favicon.ico`, `images/`, `styles/` (2014–2023: pagina implicită a găzduirii, copiată la crearea contului) (capturi) | **oprire și decizie:** D-E4-1 |
| 7 | 20:48 | **D-E4-1 = A** (proprietarul): conținutul implicit se mută, nu se șterge | — | **decizie** |
| 8 | 20:49–20:50 | **P-1** Setup Node.js App, Cron Jobs, spațiul | `civic-test-app`: stopped (v24.22.3); „No Cron Jobs”; 51,71 MB din 14,65 GB; 1 bază din 99 (capturi). Condiția 5 (staging oprit, fără cron) | **OK** |
| 9 | 20:52–20:54 | **P-1f** dosarul `/home2/<cont>/public_html-vechi-20261116`; mutarea `index.php`, `favicon.ico`, `images/`, `styles/` | în `public_html`: exact `.well-known`, `cgi-bin`, `.htaccess`, `.user.ini`, `php.ini` (captură) | **OK** |
| 10 | 20:55–20:58 | **P-2** baza `<cont>_civic_prod`, utilizatorul `<cont>_prod`, ALL PRIVILEGES numai pe această bază | „Current Databases”: `<cont>_civic_prod` cu `<cont>_prod`; `<cont>_civic_test` numai cu utilizatorul staging-ului (captură) | **OK** |
| 11 | 21:01–21:05 | **P-3** `civic-data`, `storage`, `backups` (0700); `civic.env` urcat, 0600 | `backups` și `storage` 0700, `civic.env` 0600, 1,21 KB (captură); `civic-data` 0700 (confirmat de proprietar) | **OK** |
| 12 | 21:07–21:11 | **P-4** Directory Privacy pe `public_html`: zona „Urbis Activ”, utilizator și parolă **noi** (generate în managerul de parole, intrare separată) | bifa activă; un singur utilizator autorizat (confirmat de proprietar) | **OK** |
| 13 | 21:11 | **P-5** `curl.exe -sI` pe `https://` și `http://` | ambele `401 Unauthorized`, `WWW-Authenticate: Basic realm="Urbis Activ"`, cod 0; `http` fără redirecționare → P-11b necesar (captură) | **OK** |
| 14 | ~21:14 | **P-6** aplicația `civic-app`: Node 24.22.3, Production, URL `urbisactiv.ro`, startup `server/dist/app.js`, `CIVIC_ENV_FILE=/home2/<cont>/civic-data/civic.env`, fără „Run NPM Install” | creată și oprită („START APP” afișat); calea `nodevenv`: `/home2/<cont>/nodevenv/civic-app/24/bin/` (= §4.1 al procedurii); ambele aplicații stopped (v24.22.3) (capturi) | **OK** |
| 15 | 21:16 | **P-7** `civic-4198e8d.zip` urcat în `civic-app` | 1,44 MB. cPanel crease la P-6 `public/`, `server/` (pagina de probă) și `tmp/` (captură) | **OK** |
| 16 | 21:19–21:21 | **P-8** condiția prealabilă: `zip.sha256` absent; sarcină cron temporară `sha256sum … > civic-data/zip.sha256`, apoi ștearsă | `8d89f83ae329d28d4ca59e1f5429df0297d5f035f779494227840decaee67ac7` = digestul aprobat, cele 64 de caractere (captură); „No Cron Jobs” după ștergere (captură) | **OK**, **abaterea A2** (programarea `* * * * *`) |
| 17 | 21:22–21:27 | **P-9** extragerea; arhiva ștearsă fără coș; `RELEASE.txt`; comparația cu `INVENTAR_civic-4198e8d.txt` prin amprenta SHA-256 a **fiecărui** fișier (sarcină cron temporară `find . -type f -exec sha256sum {} +`, ștearsă; comparația în PowerShell pe calculator) | `commit: 4198e8d`, `startup: server/dist/app.js`; cele 24 de fișiere ale pachetului identice cu inventarul; în plus numai `./tmp/restart.txt` (cPanel); singura amprentă „lipsă” = amprenta arhivei din antetul inventarului (capturi) | **OK**, **abaterea A3** (metoda de comparare) |
| 18 | 21:29–21:34 | **P-10** „Run JS script” nu apare cât timp aplicația e oprită; `migrate`, `seed:config`, `check:no-demo` printr-o singură sarcină cron temporară, înlănțuite cu `&&`, apoi ștearsă | `cli.log`: „Schema este deja la versiunea 2; nimic de aplicat.” (a doua rulare a sarcinii; prima a aplicat migrațiile); `seed:config: {"report_categories":8,"settings":4,"report_counter":1}`; `check:no-demo: nicio dată demo.` (captură). Criteriul 7 | **OK**, **abaterea A4** |
| 19 | 21:35 | **P-11** `.htaccess`: directivele PHP ale cPanel și secțiunea lacătului; fără regula `http` → `https`; fără directive Passenger | captură | **constatare** |
| 20 | 21:37–21:43 | **P-11b** copia `.htaccess` pe calculator; la începutul fișierului: `RewriteEngine On`, `RewriteCond %{HTTPS} !=on`, `RewriteCond %{REQUEST_URI} !^/\.well-known/`, `RewriteRule ^ https://urbisactiv.ro%{REQUEST_URI} [R=301,L]` (ca pe staging, intervențiile 39–40) | prima salvare interceptată de verificarea anti-robot a găzduirii („One moment, please…”), fișierul neschimbat (1,21 KB, 21:14), `http` tot `401`; a doua salvare reușită (1,35 KB, 21:43) (capturi). `http://…/harta` → `301`, `Location: https://urbisactiv.ro/harta`, fără cerere de parolă; `https://…/harta` → `401`, fără buclă; `http://test.urbisactiv.ro/` → `301` spre `https` (staging neschimbat) (captură) | **OK**, cu **observația O1** |
| 21 | ~21:50–21:55 | **P-12** START APP; `health` cu credențialele lacătului (introduse ascuns în PowerShell) | `{"status":"ok","version":"0.0.0+4198e8d"}`, cod 0 (captură). Criteriul 1. O primă încercare a răspuns `401` pentru că proprietarul lucra într-o fereastră PowerShell nouă, fără utilizatorul lacătului (nu e o problemă a aplicației) | **OK** |
| 22 | 21:56 | **P-13** cu Basic Auth: `/`, `/favicon.svg`, `/api/v1/health`, `/robots.txt`, `/api/v1/diag/client-ip`; `/` fără credențiale | (1)–(3) `200` + `x-robots-tag: noindex, nofollow`; (4) `Disallow: /`; (5) `NOT_FOUND`; (6) `401`; cod 0 la toate (captură). Criteriile 4 și 5 | **OK** |
| 23 | 21:57 | **oprire la cererea proprietarului** (decizia B), înaintea conturilor de administrator | starea lăsată: aplicația pornită sub lacăt, fără niciun cont de administrator, fără sarcini cron, baza fără date | **pauză** |

## 4. Ziua 1, a doua parte (17.11.2026)

| # | Ora | Pas | Verificarea / dovada | Rezultat |
|---|---|---|---|---|
| 24 | 07:31 | **P-14** condiția prealabilă | în `civic-data`: fără `bootstrap.log` (captură) | **OK** |
| 25 | 07:33–07:37 | **P-14** sarcină cron temporară: `test ! -e …/bootstrap.log && umask 077 && … bootstrap-admin --email <adresa 1> --name "…" > …/bootstrap.log 2>&1`; ștearsă imediat după apariția jurnalului | linia ștearsă (confirmat de proprietar) | **OK**, **abaterea A5** (protecția `test ! -e`) |
| 26 | 07:40 | **P-14** `bootstrap.log` | permisiuni 0600; „Cont super_admin creat …”; parola temporară mutată în managerul de parole (confirmat de proprietar; fără captură) | **OK** |
| 27 | 07:44–07:52 | **P-15** `https://urbisactiv.ro/#admin`, fereastră privată: parola temporară → înrolarea TOTP pe dispozitivul 1 → cele 10 coduri de recuperare pe hârtie → parola nouă (generată în managerul de parole) | autentificat în Admin (confirmat de proprietar). Ordinea ecranelor e cea a aplicației (TOTP înaintea parolei noi) | **OK** |
| 28 | 07:54 | **P-14 (c)–(d)** `bootstrap.log` șters fără coș | absent din `civic-data` și din `.trash` (confirmat de proprietar) | **OK** |
| 29 | 07:58–08:05 | **P-16** al doilea `super_admin` (Admin → Conturi; adresa 2); parola temporară în managerul de parole; autentificarea în alt browser; TOTP pe **al doilea telefon**; codurile de recuperare pe altă foaie; parola nouă | autentificat cu contul 2 (confirmat de proprietar). Criteriul 8 (DEC-22) | **OK** |
| 30 | 08:07 | **P-17** Admin → Sesizări → „Fluxul către Primărie” | fluxul oprit, fără destinatar, „Primăria nu participă”; modul e-mail: allowlist (eticheta „staging: numai adresele din listă” e fixă în cod pentru `allowlist`, `RegistrySettingsPanel.tsx` 31); 0 sesizări (capturi). Categoriile: 8, din `seed:config` (rândul 18) | **OK** |
| 31 | 08:11–08:13 | **D-E4-2 = A** (proprietarul): adresa Google de probă a proprietarului adăugată în `EMAIL_ALLOWLIST` (în modul `allowlist`, autentificarea Google acceptă numai adresele din listă, `citizenGoogle.ts` 155) | — | **decizie** |
| 32 | 08:14–08:20 | **P-17b** Google Auth Platform: clientul „Urbis Activ productie” (Web application), adresa de întoarcere exact `https://urbisactiv.ro/api/v1/citizen/auth/google/callback` (citire, fără modificări); adresa de probă adăugată la „Test users” | capturi | **OK** |
| 33 | 08:20–08:26 | **P-17b** `civic.env` editat în File Manager: a doua adresă pe rândul `EMAIL_ALLOWLIST` (separate prin virgulă, fără spații); Restart | `civic.env` 0600, 1,24 KB, 08:23 (captură); `health` după repornire: `ok`, `0.0.0+4198e8d` (captură) | **OK** |
| 34 | 08:26–08:29 | **P-17b** proba: „Intră cu Google” pe `urbisactiv.ro`, cu lacătul | ecranul Google arată `urbisactiv.ro`; întoarcerea autentificată; sesiunea păstrată după reîncărcare (confirmat de proprietar). Rezultă un cont de cetățean de probă | **OK** |
| 35 | 08:30–08:33 | **P-18** cele 4 linii cron permanente, exact §4.1 al procedurii | „Current Cron Jobs”: exact 4 linii (`17 3`, `47 3`, `*/5`, `*/2`), toate cu `civic-app`, `civic-data` și programul Node al producției (captură). Prima adăugare a liniei 2 a primit „JSON parse failed” (verificarea anti-robot); după reîncărcare linia lipsea și a fost adăugată din nou (captură) | **OK**, **observația O1** |
| 36 | 08:35 | **P-19** „Run JS script” (vizibil cu aplicația pornită) → `civic-backup-db` | `civic-backup-20261117T063506778Z`: 2 `admin_users`, 20 `admin_recovery_codes`, 4 `settings`, 8 `audit_log`, 1 `citizen_accounts`, 8 `report_categories`, 0 sesizări; „fotografii: 0; criptată (age)” (capturi). Criteriul 12, E4.11 | **OK** |
| 37 | 08:38–08:39 | **P-20 (1)** dosarul copiei arhivat în File Manager, descărcat în `D:\urbis-prod-copie\`, arhiva ștearsă de pe găzduire fără coș | confirmat de proprietar | **OK** |
| 38 | 08:39 | **P-20 (2)** pe calculator: SHA-256 al arhivei; extragerea | `F8E36756095E7FC08A6BF27965B19D28925EF22053F17657D7210174B50FA941`; dosarul extras (captură). După o oprire accidentală a calculatorului (~08:44, fluctuație de tensiune), amprenta reverificată identic (captură) | **OK** |
| 39 | 08:46–08:52 | **P-20 (3)** PROD-1 pe `F:`; `identitate-productie.age`: SHA-256 `FD9F56E3…F648` = §50 (captură); `backup:verify` cu Node portabil v24.22.2 și aplicația din `D:\urbis-unelte\civic-4198e8d\` | prima rulare: „Fraza-parolă este greșită…”, cod 1: se lipise textul din câmpul „Notes” (cheia publică), nu fraza. A doua: „copia este întreagă și consecventă”, 1 fișier criptat decriptat integral, 0 sesizări, 0 fotografii, **cod 0** (captură). DEC-23, D-B4-1 | **OK** |
| 40 | 08:52 | **P-20 (4)–(5)** PROD-1 scos; clipboardul golit; copia păstrată pe calculator cel mult până la 24.11.2026 (D23-3) | indicat proprietarului | **OK** |

## 5. Ziua 2 (18.11.2026)

| # | Ora | Pas | Verificarea / dovada | Rezultat |
|---|---|---|---|---|
| 41 | 08:51 | **P-21** `civic-data/backups` | `civic-backup-20261118T011701969Z` (03:17); dosarele de marcaje `account-deletions`, `account-deletions-pending`, `deletions` create la 03:17 (captură) | **OK** |
| 42 | 08:53 | **P-21** `backup.log`, `purge.log` | intrarea nopții „criptată (age)”, fără erori; `purge:retention` (03:47) fără erori (confirmat de proprietar) | **OK** |
| 43 | 08:55 | **P-22 / DEC-16 (1)** `health` cu lacătul | `{"status":"ok","version":"0.0.0+4198e8d"}` (captură) | **OK** |
| 44 | 08:56 | **P-22 / DEC-16 (3)** phpMyAdmin, baza de producție: `SELECT kind, status, COUNT(*) FROM email_outbox GROUP BY kind, status` | zero rânduri: niciun e-mail trimis până acum (captură) | **OK** |
| 45 | 08:57 | **P-22** prima înregistrare în evidența DEC-16 de producție (`Evidenta_DEC-16_productie.xlsx`, la proprietar, în afara depozitului): nota de creare, prima copie externă (rândurile 37–40), verificarea zilnică (rândurile 41–44) | rezultatul: conform | **OK** |

## 6. Observații

- **O1. Verificarea anti-robot a găzduirii.** De două ori (P-11b, 16.11; P-18, 17.11), o salvare în cPanel a primit pagina „One moment, please…” a firewall-ului găzduirii în locul răspunsului obișnuit; operația **nu** s-a efectuat. Regula aplicată: nu se repetă imediat; se reîncarcă pagina, se verifică starea (dimensiunea și ora fișierului, lista cron), abia apoi se repetă. Inclusă în manualul proprietarului.
- **O2. „Run JS script”** apare în „Setup Node.js App” numai cu aplicația pornită. Cu aplicația oprită, comenzile CLI rulează prin sarcini cron temporare (rândul 18).
- **O3.** Dosarele `public/` (gol) și `tmp/` din `civic-app` sunt create de cPanel la crearea aplicației; nu fac parte din pachet și nu sunt servite.
- **O4.** Conținutul implicit al găzduirii e în `/home2/<cont>/public_html-vechi-20261116` (în afara docroot-ului); ștergerea, de decis.
- **O5.** În `civic-data` au rămas, ca dovezi, `zip.sha256`, `inventar-gazduire.txt` și `cli.log` (fără secrete); ștergerea, de decis.
