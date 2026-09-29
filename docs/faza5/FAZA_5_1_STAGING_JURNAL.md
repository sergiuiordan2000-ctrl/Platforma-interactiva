# FAZA 5.1 — STAGING: JURNALUL INTERVENȚIILOR (5.1.10)

**Proiect:** Turnu Măgurele Civic · **Hosting:** HostGate Basic Plus (contul Electrovolt) · **Început:** 29.09.2026

## 1. Aprobări (29.09.2026, proprietarul)

| Subiect | Decizie |
|---|---|
| **G4**, adresa staging-ului | subdomeniul **`civic-test.electrovolt.ro`**, cu condiția ca site-ul `electrovolt.ro` să nu fie afectat |
| Cine lucrează în cPanel | **proprietarul**, după ghidul pas cu pas; Claude verifică rezultatul (Claude nu are acces la cPanel) |
| Setările pe staging (**decizia tehnică 5.1-A**) | cPanel nu are Terminal, deci comenzile CLI rulează prin Cron Jobs. Toate setările stau într-un singur fișier `/home2/<cont>/civic-test-data/civic.env` (în afara oricărui docroot, drepturi 600); aplicația Node și cron primesc numai `CIVIC_ENV_FILE`. Abatere aprobată de la `00` §5 |
| Testele de izolare | lista T-ISO-1…7 de mai jos (propusă de Claude, aprobată de proprietar; analiza N-2 v3 §6 nu este în repository) |

> **Repository public:** în acest jurnal numele contului cPanel este înlocuit cu `<cont>`; parolele și secretele nu apar niciodată aici.

Regulile rămân cele din G3 (RULES §11.1): docroot propriu în afara `public_html`, fără „Share document root”; nimic modificat la `electrovolt.ro`; DB și utilizator dedicate; parolă + `noindex`; numai date demo; backup propriu; T-ISO înainte și după fiecare pas.

## 2. Testele de izolare (T-ISO)

| Test | Ce verifică | Cine |
|---|---|---|
| T-ISO-1 | DNS `electrovolt.ro`: A, AAAA, MX, TXT (SPF, verificarea Google), `_dmarc`, NS, `www`, `mail`: identice | Claude (DNS-over-HTTPS) |
| T-ISO-2 | prima pagină: același titlu, același H1, aceeași navigare, același subsol | Claude |
| T-ISO-3 | `http://` și `www` ajung la `https://electrovolt.ro/` | Claude |
| T-ISO-4 | paginile PRAM, Proiectare, Prețuri, Contact: același titlu și H1 | Claude |
| T-ISO-5 | `public_html/.htaccess`: aceeași dată și mărime; niciun folder nou în `public_html` | proprietarul (File Manager) |
| T-ISO-6 | `https://electrovolt.ro/civic-test` → 404 (nimic sub `electrovolt.ro`); subdomeniul nu servește conținutul Electrovolt | Claude |
| T-ISO-7 | un e-mail trimis către o adresă `@electrovolt.ro` ajunge normal | proprietarul |

**Oprire:** dacă un singur test diferă de referință, intervenția se oprește și se revine.

## 3. Referința „înainte” (29.09.2026, ~05:40, ora României)

**T-ISO-1: DNS**

| Înregistrare | Valoare |
|---|---|
| `electrovolt.ro` A | `80.96.7.228` |
| `electrovolt.ro` AAAA | niciuna |
| `electrovolt.ro` MX | `0 mail.electrovolt.ro.` |
| `electrovolt.ro` TXT | `google-site-verification=w7v7ecAmVqd_a9OgST5Np8wYg0qUwnK-blU5ftJgoHM`; `v=spf1 +a +mx +ip4:80.96.6.249 ~all` |
| `_dmarc.electrovolt.ro` TXT | `v=DMARC1; p=none;` |
| `electrovolt.ro` NS | `ns1.hostgate.ro.`, `ns2.hostgate.ro.` |
| `www.electrovolt.ro` | CNAME `electrovolt.ro.` → `80.96.7.228` |
| `mail.electrovolt.ro` A | `80.96.7.228` |
| `civic-test.electrovolt.ro` | nu există (NXDOMAIN) |
| SOA (serial) | `2026090900`. **Se va schimba** la crearea subdomeniului (o înregistrare nouă); înregistrările de mai sus nu trebuie să se schimbe. |

**T-ISO-2: prima pagină**
- titlu: „Verificări PRAM, Proiectare și Consultanță Electrică în Teleorman | ElectroVolt”;
- H1: „SIGURANȚĂ ELECTRICĂ”;
- navigare: Acasă, PRAM, Proiectare, Consultanță, Împământări, Prețuri, FAQ, Despre noi, Contact;
- subsol: „AC-DC CONCEPT S.R.L. · J2025033228001 · CUI 51766631 · Teleorman, România”.

**T-ISO-3:** `http://electrovolt.ro/` și `https://www.electrovolt.ro/` → `https://electrovolt.ro/`, același titlu.

**T-ISO-4**

| Pagină | Titlu | H1 |
|---|---|---|
| `/verificari-pram.html` | Verificări PRAM și Buletine PRAM în Teleorman \| ElectroVolt | VERIFICĂRI PRAM ȘI BULETINE PRAM |
| `/proiectare-instalatii-electrice.html` | Proiectare Instalații Electrice în Teleorman \| ElectroVolt | PROIECTARE INSTALAȚII ELECTRICE |
| `/preturi.html` | Prețuri Verificări PRAM și Servicii Electrice \| ElectroVolt | PREȚURI CLARE, ADAPTATE LUCRĂRII |
| `/contact.html` | Contact ElectroVolt \| Verificări PRAM și Servicii Electrice Teleorman | IA LEGĂTURA CU NOI |

**T-ISO-5** (proprietarul, File Manager, 29.09.2026 05:27):
- `public_html/.htaccess`: **281 bytes**, **Jun 10, 2026, 9:48 AM**;
- foldere în `public_html`: numai `.well-known` (Jun 10, 2026, 10:02 AM) și `cgi-bin` (Jun 10, 2026, 9:46 AM);
- fișiere: `consultanta-tehnica.html`, `contact.html`, `contact.php`, `despre-noi.html`, `index.html`, `intrebari-frecvente.html`, `logo-acdc.png`, `multumim.html`, `preturi.html`, `prize-de-pamant.html`, `proiectare-instalatii-electrice.html`, `robots.txt`, `schema fundal.png`, `sitemap.xml`, `verificari-pram.html` (18 elemente în total, cu folderele și `.htaccess`).

**T-ISO-6:** `https://electrovolt.ro/civic-test` → **404**.

**T-ISO-7** (proprietarul, 29.09.2026 05:27): e-mailul de test către o adresă `@electrovolt.ro` **a ajuns**.

## 4. Intervențiile

| # | Data | Pas | T-ISO după | Rezultat |
|---|---|---|---|---|
| 1 | 29.09.2026 05:30 | subdomeniul `civic-test.electrovolt.ro` creat de proprietar (cPanel → Domains → Create A New Domain); „Share document root” **debifat**; Document Root `/home2/<cont>/civic-test.electrovolt.ro` (în afara `public_html`); Force HTTPS: Off (certificat SSL încă neemis) | T-ISO-1…4, 6: identice cu referința (DNS-ul existent neschimbat; noul nume nu apare încă în DNS-ul public: cache negativ, ≤ 30 min); T-ISO-5: proprietarul | **OK**: T-ISO-5 identic (proprietarul, 05:43) |
| 2 | 29.09.2026 05:40 | DB `<cont>_civic_test` și utilizatorul `<cont>_civic` create de proprietar (Manage My Databases), utilizatorul legat numai de această DB; parola păstrată numai de proprietar; MySQL **8.0.37** (= G2) | T-ISO-1, 2, 4 (cu ocolirea cache-ului): identice; T-ISO-6: `civic-test.electrovolt.ro` → `80.96.7.228` (IP-ul comun al contului), HTTPS activ, servește numai „Index of /” (folderul nou, gol: `cgi-bin`, `php.ini`), **niciun conținut Electrovolt**; serverul web este **LiteSpeed** | OK |
| 3 | 29.09.2026 05:52 | aplicația Node creată de proprietar (cPanel → Node.js → Create Application): Node **20.20.2**, Production, Application root `civic-test-app` (`/home2/<cont>/civic-test-app`, în afara `public_html` și a docroot-ului), URL `civic-test.electrovolt.ro/`, startup `server/dist/app.js`; fără „Run NPM Install”. **K2 (mecanismul Node în cPanel): funcționează**; aplicația de probă cPanel răspunde „It works! NodeJS 20.20.2” | T-ISO-1, 2, 4, 6 (cu ocolirea cache-ului): identice; `electrovolt.ro/civic-test-app` → 404; T-ISO-5: identic (proprietarul, 05:56) | **OK** |
| 4 | 29.09.2026 06:00–06:50 | deploy `civic-2ce0d98.zip` în `civic-test-app` (File Manager, Upload + Extract); folderul `/home2/<cont>/civic-test-data` (`storage`, `backups`) și fișierul de setări `civic.env` (drepturi 0600, decizia 5.1-A); parola utilizatorului DB schimbată (numai litere și cifre); variabila `CIVIC_ENV_FILE` în aplicația Node (**prima încercare nesalvată → aplicația a refuzat pornirea cu „configurare invalidă”, cum era proiectat**; a doua, salvată); `migrate`, `seed:config`, `seed:demo`, `migrate:status` prin Cron Jobs (rulat de 2 ori, a doua fără efect; `cli.log`: „Versiunea schemei: 1 (așteptată: 1)”), apoi comanda cron ștearsă | aplicația rulează: prima pagină afișată; `GET /api/v1/health` → `{"status":"ok","version":"0.0.0+2ce0d98"}`; `robots.txt` interzice indexarea (confirmat de un robot extern); T-ISO-1, 2, 4: identice; T-ISO-5, 7: identice (proprietarul, 06:55; e-mailul a sosit cu ~1 min întârziere, normal) | **OK** |
| 5 | 29.09.2026 07:00 | protecție cu parolă (cPanel → Directory Privacy) pe folderul subdomeniului `civic-test.electrovolt.ro` (nu `public_html`), utilizator `civic`, parola păstrată numai de proprietar | proprietarul: browserul cere utilizator și parolă; cu ele aplicația se deschide | **OK** |
| 6 | 29.09.2026 10:25 | cron `backup:db` (Cron Jobs; setările prin `CIVIC_ENV_FILE`); testat la fiecare minut (3 backup-uri create: `civic-backup-20260929T0725…Z`, `…T0726…Z`, `…T0727…Z`; `backup.log` cu numărul de rânduri pe tabel), apoi setat **zilnic la 03:17** | T-ISO final (10:30): DNS A, MX, prima pagină electrovolt.ro identice | **OK** |

## 5. Rezultatul 5.1.10

| Condiție G3 | Stare |
|---|---|
| 1. docroot propriu, în afara `public_html`, fără „Share document root” | ✅ |
| 2. nimic modificat la `electrovolt.ro` | ✅ T-ISO identice după fiecare pas (1–6) |
| 3. DB și utilizator dedicate | ✅ `<cont>_civic_test`, `<cont>_civic` |
| 4. parolă + `noindex` | ✅ Directory Privacy; `X-Robots-Tag` + `robots.txt` (confirmat extern) |
| 5. numai date demo, fără e-mailuri reale | ✅ `seed:demo`; `EMAIL_MODE=simulated` |
| 6. backup propriu | ✅ cron zilnic 03:17, rotație 7 zile (T-D1) |
| 7. T-ISO înainte și după | ✅ |
| 8. creare numai în 5.1, cu aprobare | ✅ aprobările din §1 |

**K2:** aplicația Node rulează pe LiteSpeed / CloudLinux (Node 20.20.2), cu artefactul CommonJS fără `node_modules`.
**T-RUN:** pornire (după restart), refuz corect la configurare lipsă și la schemă lipsă, `health` = `ok`.
**Nerulate pe staging (acoperite de testele automate):** restaurarea completă (`restore:db`) cere un DB nou; se exersează la nevoie, cu aprobare.

## 6. Faza 5.2.10: deploy autentificare pe server + primul `super_admin` (29.09.2026)

Aprobări separate ale proprietarului pentru fiecare pas pe hosting. T-ISO înainte (12:33, Claude: T-ISO-1…4, 6; proprietarul: T-ISO-5, 7): **identice cu referința din §3**.

| # | Data | Pas | T-ISO după | Rezultat |
|---|---|---|---|---|
| 7 | 29.09.2026 12:45 | deploy `civic-3c1f668.zip` în `civic-test-app` (File Manager, Upload + Extract, calea verificată), apoi Restart în Setup Node.js App. Pachetul conține scriptul npm `civic-bootstrap-admin` (adresa primului cont numai în pachet, nu în repository) | `GET /api/v1/health` → `{"status":"ok","version":"0.0.0+3c1f668"}` (proprietarul); T-ISO-1, 2, 4 (Claude, 12:48): identice; `electrovolt.ro/civic-test-app` → 404 | **OK** |
| 8 | 29.09.2026 ~12:50 | `bootstrap-admin` prin cPanel → Setup Node.js App → **Run JS script** → `civic-bootstrap-admin` (nu prin cron: parola temporară apare numai în fereastra de rezultat, nu într-un fișier). „Run JS script” primește `CIVIC_ENV_FILE` | „Cont super_admin creat pentru …”; parola temporară păstrată numai de proprietar. Rândul „stderr:” și anunțurile `npm notice` din fereastră sunt ieșirea npm, nu erori | **OK** |
| 9 | 29.09.2026 20:45–21:00 | prima autentificare pe `/#admin`: parola temporară → înrolare TOTP (aplicație de autentificare pe telefon) → coduri de recuperare → parolă nouă; Panoul Admin afișat cu contul `super_admin` | T-ISO-1, 2 (Claude, 21:02): identice; T-ISO-5, 7 (proprietarul, 21:02): identice | **OK** |

**Constatări (5.2.10):**
- Protecția cu parolă a staging-ului (Directory Privacy, fereastra browserului) și login-ul aplicației sunt **două ecrane diferite, cu parole diferite**; completarea automată a browserului le-a amestecat și a întârziat prima autentificare. Recomandare: nu se salvează în browser parola temporară.
- Managerul de parole al browserului a propus suprascrierea unui login salvat anterior pentru alt serviciu de pe același server; refuzat. Nu privește serverul.
- Cheia TOTP afișată la înrolare a apărut într-o captură de ecran trimisă lui Claude înainte de confirmare; serverul generează o cheie nouă la fiecare pornire a înrolării, iar proprietarul a regenerat-o înainte de scanare (confirmat: cheia înrolată diferă de cea din captură).
- Verificările externe ale lui Claude nu trec de protecția cu parolă a staging-ului; starea aplicației se confirmă prin capturile proprietarului.

## 7. Faza 5.3.8: conținutul public pe server (29.09.2026)

Aprobare separată a proprietarului pentru deploy. T-ISO înainte (22:27, Claude: T-ISO-1, 2, 4; proprietarul, 22:37: T-ISO-5, 7): **identice cu referința din §3**.

| # | Data | Pas | T-ISO după | Rezultat |
|---|---|---|---|---|
| 10 | 29.09.2026 ~22:38 | deploy `civic-3c1f668` → `civic-909999d.zip` în `civic-test-app` (Upload + Extract cu suprascriere, calea verificată), Restart. Fără migrații noi; datele demo (comunicate, ghid, apel rapid) erau deja în DB din 5.1 | `health` → `{"status":"ok","version":"0.0.0+909999d"}` (proprietarul); T-ISO-1, 2 (Claude, 22:38): identice; `electrovolt.ro/civic-test-app` → 404; T-ISO-5, 7 (proprietarul, 22:53): identice | **OK** |
| 11 | 29.09.2026 22:40–22:50 | verificare de către proprietar: Comunicate (7; Notificări 1, Anunțuri 1, Știri 2, Evenimente 3), Ghid (instituție, direcții, link-uri), Apel rapid (contacte, căutare), Admin | datele vin de la server | **OK** |

**Constatare (5.3.8):** după deploy, browserul a afișat inițial versiunea veche a paginii, cu datele vechi din `localStorage` (imagini externe blocate, comunicate „dezactivate” numai local). După **Ctrl + F5** s-a încărcat versiunea nouă, cu datele serverului. Recomandare: după fiecare deploy, reîncărcare completă a paginii.
