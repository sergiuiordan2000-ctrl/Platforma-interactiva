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
| `electrovolt.ro` A | `80.96.x.x` |
| `electrovolt.ro` AAAA | niciuna |
| `electrovolt.ro` MX | `0 mail.electrovolt.ro.` |
| `electrovolt.ro` TXT | `google-site-verification=w7v7ecAmVqd_a9OgST5Np8wYg0qUwnK-blU5ftJgoHM`; `v=spf1 +a +mx +ip4:80.96.x.x ~all` |
| `_dmarc.electrovolt.ro` TXT | `v=DMARC1; p=none;` |
| `electrovolt.ro` NS | `ns1.hostgate.ro.`, `ns2.hostgate.ro.` |
| `www.electrovolt.ro` | CNAME `electrovolt.ro.` → `80.96.x.x` |
| `mail.electrovolt.ro` A | `80.96.x.x` |
| `civic-test.electrovolt.ro` | nu există (NXDOMAIN) |
| SOA (serial) | `2026090900`. **Se va schimba** la crearea subdomeniului (o înregistrare nouă); înregistrările de mai sus nu trebuie să se schimbe. |

> Adresele IP acoperite la 14.10.2026 (regula proiectului: fără adrese IP complete). Sunt înregistrări DNS publice ale `electrovolt.ro`.

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
| 2 | 29.09.2026 05:40 | DB `<cont>_civic_test` și utilizatorul `<cont>_civic` create de proprietar (Manage My Databases), utilizatorul legat numai de această DB; parola păstrată numai de proprietar; MySQL **8.0.37** (= G2) | T-ISO-1, 2, 4 (cu ocolirea cache-ului): identice; T-ISO-6: `civic-test.electrovolt.ro` → `80.96.x.x` (IP-ul comun al contului), HTTPS activ, servește numai „Index of /” (folderul nou, gol: `cgi-bin`, `php.ini`), **niciun conținut Electrovolt**; serverul web este **LiteSpeed** | OK |
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

## 8. Faza 5.4.9: sesizările pe server (30.09.2026)

Fiecare deploy a avut aprobarea separată a proprietarului. T-ISO înainte și după fiecare intervenție. Referința este cea din §3.

| # | Data | Pas | T-ISO după | Rezultat |
|---|---|---|---|---|
| 12 | 30.09.2026, dimineața | deploy `civic-93326f5.zip` în `civic-test-app` (Upload + Extract, Restart); `GEOCODER_URL` și `GEOCODER_USER_AGENT` adăugate de proprietar în `civic.env` (valorile nu apar în repository) | `health` → `0.0.0+93326f5` (proprietarul); T-ISO: identice | **OK** |
| 13 | 30.09.2026 | `civic-seed-demo` („Run JS script”): 4 sesizări demo (TM-001…TM-004), cu pozițiile reale date de proprietar | ieșirea: `reports: 4`; pozițiile verificate de proprietar pe hartă („aproape”, vezi #14) | **OK** |
| 14 | 30.09.2026, după-amiaza | deploy `civic-a6aee5f.zip`: pinul hărții publice pe punctul exact (raport 5.4, §5, nota 5) | `health` → `0.0.0+a6aee5f`; proprietarul: „este mult mai bine”; T-ISO: identice | **OK** |
| 15 | 30.09.2026 | proba de cetățean (proprietarul): cont, cod prin `civic-show-latest-code`, sesizare depusă → apare imediat pe hartă (fără moderare, 2.3) | observație: codul cerut din nou → decizia privind sesiunea de cetățean (plan 5.4, §5) | **OK** |
| 16 | 30.09.2026 ~21:10 | deploy `civic-b2eb198.zip` (sesiunea de 120 de zile). **Prima încercare:** pachetul avea `server/dist/app.js` vechi (greșeala lui Claude), iar `health` arăta tot `a6aee5f`, deși `RELEASE.txt` arăta `b2eb198`. Pachetul a fost refăcut și redeployat | `health` → `0.0.0+b2eb198` (proprietarul); T-ISO-1, 2, 4, 6 (Claude, înainte ~20:52 și după ~21:12): identice | **OK** |
| 17 | 30.09.2026 ~21:37 | deploy `civic-7723f33.zip` (sesiunea de cetățean fără expirare, varianta B; scriptul de pachet verifică versiunea) | `health` → `0.0.0+7723f33` (proprietarul, „totul este ok”); T-ISO-5, 7 (proprietarul, 21:43): identice | **OK** |
| 18 | 01.10.2026 17:38–17:43 | proba de geocodare (proprietarul). Prima încercare: adresa scrisă numai în câmpul text „Locație” → sesizarea TM-006, salvată corect, **fără poziție** (comportament corect, 2.11). A doua: caseta „Caută adresa” cu „str. Castanilor” → serverul a găsit strada (Nominatim prin `GEOCODER_URL`), pin propus lângă Spitalul Municipal; pinul mutat de proprietar → „Punct pe hartă · 43.74393, 24.86853” (decizia din 30.09: pin mutat = punct exact) | geocodarea funcționează pe staging | **OK** |

**Constatări (5.4.9):**
- **Limita de 3 coduri pe zi pe adresă este silențioasă.** Serverul răspunde la fel (202), fără cod nou, ca să nu se poată afla ce adrese au cont. Pentru utilizator e derutant: `civic-show-latest-code` arată codul anterior, deja expirat. Comportamentul e corect conform designului. Un mesaj generic în formular („se pot cere cel mult 3 coduri pe zi”) ar putea fi decis separat.
- **Sesiunea este comună pentru Admin și cetățean** (același cookie, B3 §3). Intrarea în Admin în același browser scoate cetățeanul din cont. La teste se folosesc browsere diferite.
- **Fereastra de parolă a subdomeniului** (protecția cPanel a staging-ului) reapare după încărcarea paginii. Ține numai de staging. Cauza probabilă sunt răspunsurile 401 ale API-ului pentru „neautentificat”. Se investighează separat.
- **Două câmpuri de adresă în formular** („Locație”, text obligatoriu, și „Caută adresa”, deasupra hărții): proprietarul a scris adresa întâi numai în câmpul text, deci sesizarea nu a primit poziție. Observație de interfață, pentru o decizie separată (designul ecranului este înghețat).
- Recomandarea din 5.3.8 rămâne valabilă: după fiecare deploy, pagina se reîncarcă cu **Ctrl + F5**.

## 9. Rotirea secretelor de pe staging (01.10.2026, varianta A)

Plan: `FAZA_5_4_ROTIRE_SECRETE_PLAN.md`, aprobat de proprietar. Motivul: capturi ale fișierului `civic.env` ajunse în conversație la 30.09. T-ISO înainte (Claude, ~18:00: T-ISO-1, 2, 4, 6): identice cu referința din §3.

| # | Data | Pas | T-ISO după / verificare | Rezultat |
|---|---|---|---|---|
| 19 | 01.10.2026 ~18:04 | deploy `civic-06781bf.zip` (comanda `rotate:keys`), Upload + Extract + Restart | `health` → `0.0.0+06781bf` (proprietarul) | **OK** |
| 20 | 01.10.2026 ~18:06 | „Run JS script” → `civic-rotate-keys`: `returncode 0`, „4 chei schimbate (IP_HASH_SECRET, PARTICIPATION_HMAC_SECRET, FORM_TOKEN_SECRET, POW_HMAC_KEY). Valorile nu se afișează.”; fără avertisment de audit | nicio valoare afișată | **OK** |
| 21 | 01.10.2026 ~18:10 | parola utilizatorului DB schimbată de proprietar (cPanel → Manage My Databases, generator: litere și cifre, 24 de caractere) și pusă în `DATABASE_URL` din `civic.env` (editorul File Manager, fără capturi); Restart | Comunicate, Hartă (5 sesizări), Sondaje se încarcă din DB (proprietarul, capturi); T-ISO-1, 2, 4, 6 (Claude, ~18:18): identice | **OK** |
| 22 | 01.10.2026 18:19–18:26 | proba variantei B în Chrome: autentificare cetățean o dată → browser închis și redeschis → „Sesizări” afișează direct contul, fără cod | sesiunea de cetățean persistă | **OK** |

**Rămâne neschimbat (planificat):** `TOTP_ENC_KEY` (după al doilea `super_admin`, cu migrarea datelor derivate) și parola de protecție a subdomeniului (cPanel → Directory Privacy), care nu apărea în capturi.

**Constatare (fereastra „Sign in” a staging-ului):** după redeschiderea browserului, lacătul cPanel al subdomeniului se cere o dată pentru pagină și încă o dată la prima cerere API care răspunde 401 („neautentificat”). Ipoteza: serverul web (LiteSpeed), care protejează subdomeniul cu parolă, tratează un 401 venit de la aplicație ca pe o cerere de autentificare HTTP. Ipoteza nu e verificată din afară, pentru că protecția blochează și verificările lui Claude. Ține numai de staging; în producție nu există protecție cu parolă pe site.

## 10. Faza 5.6.8: sondajele pe server (05.10.2026)

Fiecare pas a avut aprobarea separată a proprietarului. Referința T-ISO este cea din §3. T-ISO înainte (Claude, ~20:20: T-ISO-1, 2, 4, 6): identice.

| # | Data | Pas | T-ISO după / verificare | Rezultat |
|---|---|---|---|---|
| 23 | 05.10.2026 ~20:30 | deploy `civic-79a1b2a.zip` în `civic-test-app` (Upload + Extract, Restart): interfața sondajelor pe API (5.6.5), corecția ALTCHA din browser | `health` → `0.0.0+79a1b2a` (proprietarul) | **OK** |
| 24 | 05.10.2026 ~20:36 | „Run JS script” → `civic-seed-demo` (P-4): sondajul demo activ prelungit la 30.06.2027; voturi demo la sondajul demo închis | ieșirea: `{"survey_submissions":27,"reports":2}`, fără erori | **OK** |
| 25 | 05.10.2026 20:38–20:40 | proba de vot (proprietarul): textul N4-1; sondajul deschis cu „30 iun. 2027, 20:00”, fără „Rezultate” (D3, `after_close`); arhiva cu sondajul demo închis; „Rezultate” în arhivă: 27 de răspunsuri; vot trimis → confirmare → „Ai participat deja” | toate punctele confirmate de proprietar (captură a paginii Sondaje) | **OK** |
| 26 | 05.10.2026 ~20:46 | cron `surveys:close-expired` la 5 minute (cPanel → Cron Jobs; aceeași formă ca jobul de backup, cu `CIVIC_ENV_FILE`; ieșirea în `/home2/<cont>/civic-test-data/surveys-cron.log`, suprascrisă la fiecare rulare) | prima rulare, 20:50: „surveys:close-expired: 0 sondaje închise” (proprietarul); jobul de backup neschimbat (`backup.log` de azi, 03:17) | **OK** |

T-ISO după (Claude, ~20:52: T-ISO-1, 2, 4, 6): identice cu referința. T-ISO-5 (proprietarul, ~20:55: `public_html/.htaccess` 281 bytes, Jun 10, 2026; niciun folder nou): identic. T-ISO-7 (e-mail) nu a fost refăcut la acest deploy.

**Constatări (5.6.8):**
- `civic-seed-demo` a raportat și `"reports":2`: două dintre cele patru sesizări demo nu mai existau în DB, iar comanda le-a recreat, cu numere TM noi (comportament proiectat la 5.4: datele demo lipsă se refac; D25–D26). Înainte de rulare, Claude îi spusese proprietarului că sesizările rămân neatinse; formularea corectă este: sesizările existente și conturile rămân neatinse, cele demo lipsă se recreează.
- Staging rulează acum corecția ALTCHA din browser (5.6.5), deci ALTCHA poate fi pornită pe staging la nevoie (la sesizări și per sondaj).
- Jobul de backup este singurul job cron vechi; `purge:retention` și `outbox:process` nu sunt programate pe staging (al doilea vine la 5.5b).

## 11. Faza 5.7: curățarea cheilor vechi din browser (05.10.2026)

Aprobat de proprietar împreună cu commit-ul 5.7. T-ISO înainte (Claude, 21:19: T-ISO-1, 2, 4, 6): identice cu referința din §3.

| # | Data | Pas | T-ISO după / verificare | Rezultat |
|---|---|---|---|---|
| 27 | 05.10.2026 ~21:28 | deploy `civic-1604472.zip` în `civic-test-app` (Upload + Extract, Restart): la pornire, aplicația șterge din browser cheile vechi ale prototipului (B1 §5.1) | `health` → `0.0.0+1604472` (proprietarul); Sondaje: „Ai participat deja” a rămas la sondajul votat la #25 (indiciul de vot nu este șters) | **OK** |

T-ISO după (Claude, ~21:33): T-ISO-2, 4, 6 identice; T-ISO-1 identic pentru A, AAAA, MX, TXT, `_dmarc`, `www`, `mail`. **Înregistrarea NS nu a putut fi citită după deploy** (serviciul de interogare DNS a refuzat cererea, limită de frecvență); la 21:19 era identică. T-ISO-5 și 7 nu au fost refăcute la acest deploy.

## 12. Cron-ul `purge:retention` pe staging (05.10.2026)

Aprobat de proprietar la 05.10.2026. Motiv: până acum, pe staging nu rula nimic care să aplice retenția (B1 §3.9: sesizările la 45 de zile, auditul administrativ și textele libere la 6 luni); B2 §2 prevede rularea zilnică. T-ISO înainte (Claude, ~22:02: T-ISO-1, 2, 4, 6): identice cu referința din §3. Înregistrarea NS, necitită la #27, a fost citită acum printr-un al doilea serviciu de interogare DNS: identică.

| # | Data | Pas | T-ISO după / verificare | Rezultat |
|---|---|---|---|---|
| 28 | 05.10.2026 ~22:06 | cron `purge:retention` zilnic la 03:47 (cPanel → Cron Jobs; aceeași formă ca jobul de backup, cu `CIVIC_ENV_FILE`; ieșirea adăugată în `/home2/<cont>/civic-test-data/purge.log`) | în Current Cron Jobs sunt trei joburi: backup (03:17), sondaje (la 5 minute), retenție (03:47) (proprietarul) | **OK** |
| 29 | 05.10.2026 ~22:08 | „Run JS script” → `civic-purge-retention`, o rulare de verificare | ieșirea: `{"reports":0,"photoFiles":0,"adminAudit":0,"expiredBlocks":0,"tmpFiles":0,"accountEmails":0,"surveyFreeTexts":0}`, fără erori (captura proprietarului) | **OK** |

T-ISO după (Claude, ~22:09: T-ISO-1 complet, 2, 4, 6): identice cu referința. T-ISO-5 și 7 nu au fost refăcute.

**De știut:** pe staging nu există încă date mai vechi de 45 de zile (primele sunt din 29–30.09.2026), deci primele ștergeri efective vor apărea pe la mijlocul lui noiembrie 2026. Prima rulare prin cron (06.10.2026, 03:47) nu a fost încă văzută; se confirmă când apare `purge.log`.

**Confirmare (06.10.2026, ~23:52):** proprietarul a văzut fișierul `purge.log` în `civic-test-data` (File Manager), deci jobul de noapte a rulat cel puțin o dată. Conținutul și data fișierului nu au fost transmise.

## 13. Deploy `9570b48`: nota despre limita de coduri și proba pentru cheia TOTP (06.10.2026)

Aprobat de proprietar la 06.10.2026. Conține `2185c0a` (rândul fix „Se pot cere cel mult 3 coduri pe zi pentru o adresă de e-mail.” în „Contul meu”) și pasul A din `FAZA_5_4_ROTIRE_TOTP_PLAN.md` (comanda `rotate:totp-key`, cu scripturile `civic-rotate-totp-key-check` și `civic-backup-db` în pachet). Scriptul pentru rularea reală a rotirii nu este în pachet. T-ISO înainte (Claude, ~21:29: T-ISO-1 complet, 2, 4, 6): identice cu referința din §3.

| # | Data | Pas | T-ISO după / verificare | Rezultat |
|---|---|---|---|---|
| 30 | 06.10.2026 ~21:33 | deploy `civic-9570b48.zip` în `civic-test-app` (Upload + Extract, Restart) | `health` → versiunea nouă (proprietarul); „Contul meu”: rândul despre limita de coduri apare sub butonul „Trimite codul pe e-mail” (captura proprietarului) | **OK** |

T-ISO după (Claude, ~21:35: T-ISO-1 complet, 2, 4, 6): identice cu referința. T-ISO-5 și 7 nu au fost refăcute.

**Proba pentru cheia TOTP** (aprobată separat de proprietar, 06.10.2026). T-ISO înainte: cel de la ~21:35, de mai sus.

| # | Data | Pas | T-ISO după / verificare | Rezultat |
|---|---|---|---|---|
| 31 | 06.10.2026 ~21:47 | „Run JS script” → `civic-rotate-totp-key-check` (`rotate:totp-key --check`: toate verificările, într-o tranzacție anulată) | ieșirea (captura proprietarului): „PROBĂ reușită. La o rulare reală: secrete TOTP recriptate: 1; blocări cu amprenta recalculată: 0; coduri de recuperare șterse: 10; coduri de cetățean șterse: 0.” și „nimic nu a fost schimbat (nici baza de date, nici fișierul de setări)”; `health` → `ok`, `0.0.0+9570b48` (proprietarul, 21:49) | **OK** |

T-ISO după (Claude, ~21:48: T-ISO-1 complet, 2, 4, 6): identice cu referința. T-ISO-5 și 7 nu au fost refăcute.

**Ce arată proba:** pe staging nu există blocări rămase fără cont; există un singur cont Admin cu TOTP (al doilea `super_admin` nu a fost încă creat). Cheia `TOTP_ENC_KEY` este neschimbată; rularea reală (pasul B) rămâne nedecisă. `civic-backup-db` nu a fost rulat.

**Constatare:** imediat după probă, prima citire a adresei `health` făcută de Claude a primit 503; a doua, la câteva secunde, 401 (protecția cu parolă a subdomeniului, răspunsul obișnuit pentru verificările externe). Cauza acelui 503 nu este cunoscută. Proprietarul a confirmat apoi `health` → `ok`.

## 14. Deploy `94dba87`: locația în formularul de sesizare (06.10.2026)

Aprobat de proprietar la 06.10.2026. Conține amendamentul `AMENDAMENT_LOCATIE_FORMULAR.md` (un singur câmp de adresă; întrebarea la trimiterea fără pin). Numai interfață; fără migrări și fără schimbări de setări. T-ISO înainte (Claude, ~22:26: T-ISO-1 complet, 2, 4, 6): identice cu referința din §3.

| # | Data | Pas | T-ISO după / verificare | Rezultat |
|---|---|---|---|---|
| 32 | 06.10.2026 ~22:30 | deploy `civic-94dba87.zip` în `civic-test-app` (Upload + Extract, Restart) | formularul nou este afișat (captura proprietarului, 22:35): pasul 4 are un singur câmp de text și butoanele „Caută pe hartă” / „Poziția mea” | **OK** |
| 33 | 06.10.2026 ~22:35 | proba căutării reale a adresei (proprietarul): „Str. 1 Mai” în „Locația” → „Caută pe hartă” | pin propus pe Strada 1 Mai, cu zonă aproximativă; starea „Zonă aproximativă (după adresă)”; mesajul despre zona aproximativă (captura proprietarului) | **OK** |
| 34 | 06.10.2026 ~22:36 | proba întrebării (proprietarul): „Șterge pinul”, apoi „Trimite sesizarea” fără pin | întrebarea „Sesizarea nu are poziție pe hartă” a apărut, cu cele trei butoane; „Pun pinul pe hartă” a adus harta în vizor (răspunsul proprietarului, fără captură) | **OK** |

T-ISO după (Claude, ~22:36: T-ISO-1 complet, 2, 4, 6): identice cu referința. T-ISO-5 și 7 nu au fost refăcute.

**Neconfirmat:** răspunsul adresei `health` (versiunea `0.0.0+94dba87`) nu a fost citit după acest deploy; versiunea se deduce din faptul că formularul nou este afișat. Butoanele „Caută adresa scrisă” și „Trimit fără hartă” ale întrebării nu au fost probate pe staging (sunt acoperite de testele automate).

**De știut:** căutarea adresei pe staging folosește serviciul real de hărți; în testele automate ea este simulată, deci #33 este prima verificare cap-coadă a butonului „Caută pe hartă”.

## 15. Al doilea cont `super_admin` pe staging (06.10.2026)

Aprobat de proprietar la 06.10.2026. Motiv: până acum exista un singur cont Admin; dacă TOTP-ul sau parola lui nu mai mergeau, nimeni nu mai putea intra în Admin (`civic-bootstrap-admin` refuză cât timp există un `super_admin` activ). Este și condiția din `FAZA_5_4_ROTIRE_TOTP_PLAN.md` §4, pasul 0. Pas făcut în aplicație, nu în cPanel: fără fișiere încărcate, fără setări schimbate. Adresele conturilor nu se scriu în acest jurnal. T-ISO înainte: cel de la ~22:36 (§14).

| # | Data | Pas | T-ISO după / verificare | Rezultat |
|---|---|---|---|---|
| 35 | 06.10.2026 ~23:38 | Admin → „Conturi” → „Cont nou”, rolul „Super administrator” (din primul cont); parola temporară, afișată o singură dată, păstrată numai de proprietar | în tabel: al doilea cont, „Super administrator”, „activ · parolă temporară”, TOTP „—” (captura proprietarului) | **OK** |
| 36 | 06.10.2026 ~23:40–23:47 | prima autentificare cu contul nou, în fereastră privată: parola temporară → înrolare TOTP → coduri de recuperare → parolă nouă; apoi ieșire și reautentificare | reautentificarea a reușit; în „Conturi”, contul nou apare „activ” și „configurat” (răspunsul proprietarului, fără captură) | **OK** |

T-ISO după (Claude, ~23:48: T-ISO-1 complet, 2, 4, 6): identice cu referința. T-ISO-5 și 7 nu au fost refăcute.

**De știut:**
- Codul TOTP al contului nou a fost pus pe **același telefon** ca al primului cont. Cele două conturi se pot ajuta între ele (resetarea parolei sau a TOTP-ului celuilalt), dar la pierderea telefonului rămân numai codurile de recuperare ale fiecărui cont. Mutarea unuia dintre coduri pe alt dispozitiv rămâne o recomandare, nu un pas făcut.
- La autentificarea cu primul cont, proprietarul a încercat întâi fără codul din aplicația de autentificare; după folosirea lui, autentificarea a reușit. Nu a fost o problemă a aplicației.
- Cheia `TOTP_ENC_KEY` este neschimbată. O nouă probă `civic-rotate-totp-key-check` ar arăta acum 2 secrete TOTP și 20 de coduri de recuperare; nu a fost rulată.

## 16. Retragerea staging-ului (09.10.2026)

**Decizia proprietarului (09.10.2026): G3, staging-ul de pe `civic-test.electrovolt.ro` se retrage complet.** Motiv: staging-ul nou (`test.urbisactiv.ro`, alt furnizor) îl înlocuiește din 07.10.2026; cel vechi rula cod vechi (`94dba87`), nu primea autentificarea cu Google (G-4) și stătea pe contul site-ului firmei. Datele erau numai demo.

Click-urile în cPanel le-a dat proprietarul, după ghid, câte o etapă pe rând, cu capturi. Ștergerile sunt definitive.

**T-ISO înainte** (Claude, ~15:55): T-ISO-1 (A, AAAA, MX, TXT, `_dmarc`, NS, `www`, `mail`), 2 și 4 identice cu referința din §3; T-ISO-3: `www` afișează aceeași pagină (redirecționarea de pe `http://` nu a putut fi citită cu instrumentele lui Claude); T-ISO-6: cererea este respinsă (codul exact nu a putut fi citit). Subdomeniul avea în DNS o înregistrare A și un rând SPF creat de cPanel. **T-ISO-5** (proprietarul, captură, ~15:58): identic (`.htaccess` 281 bytes, 10 iunie 2026; numai `.well-known` și `cgi-bin`; 18 elemente). T-ISO-7 nu a fost făcut.

| # | Ora | Pas | Verificare | Rezultat |
|---|---|---|---|---|
| 37 | ~15:58–16:00 | Cron Jobs: cele trei sarcini șterse (`backup:db`, `surveys:close-expired`, `purge:retention`). Înainte: lista conținea numai aceste trei; contul nu avea alte sarcini cron | captură: „No Cron Jobs” | **OK** |
| 38 | ~16:00–16:02 | Setup Node.js App: aplicația `civic-test.electrovolt.ro` (singura din listă) oprită și ștearsă | captură: „No applications found” | **OK** |
| 39 | ~16:02–16:04 | Manage My Databases: baza `<cont>_civic_test` și utilizatorul `<cont>_civic` șterse (singura bază și singurul utilizator ai contului) | captură: nicio bază, niciun utilizator | **OK** |
| 40 | ~16:05–16:11 | Domains: subdomeniul `civic-test.electrovolt.ro` șters | relatat de proprietar, fără captură | **OK** (vezi „Neconfirmat”) |
| 41 | ~16:11–16:14 | File Manager: folderele `civic-test-app`, `civic-test-data` (cu `civic.env`, fotografiile, backup-urile, jurnalele) și `civic-test.electrovolt.ro`, șterse de proprietar **fără captura cerută înaintea confirmării** și fără bifa de ștergere definitivă: au ajuns în coș | captură a coșului: cele trei foldere, plus un folder `civic.env` din 29.09 | **corectat la 42** |
| 42 | ~16:16–16:20 | coșul (`.trash`): cele patru foldere șterse definitiv. Restul coșului (două backup-uri complete ale contului, versiuni vechi ale site-ului firmei, pachetele `civic-….zip`) **neatins**; „Empty Trash” nefolosit | capturi: coșul fără cele patru foldere; folderul principal fără niciun `civic-test…`, cu `public_html` la locul lui | **OK** |
| 43 | ~16:21–16:22 | `.htpasswds`: folderele `civic-test-app`, `civic-test-data` și `civic-test.electrovolt.ro` (ultimul conținea parola lacătului) șterse. Folderele goale create de cPanel pentru restul contului (`public_html`, `etc`, `mail` …) neatinse | captură: rămân numai folderele goale ale contului | **OK** |

**T-ISO după** (Claude, ~16:14): T-ISO-1 (A, AAAA, MX, TXT, `_dmarc`, NS, `www`, `mail`), 2 și 4 identice cu referința. Numărul de serie al zonei s-a schimbat (`2026100903`), cum era de așteptat după ștergerea subdomeniului. **T-ISO-5** (proprietarul, captură, ~16:20): identic cu cel dinainte, fișier cu fișier (nume, mărimi, date).

**Neconfirmat:**
- dispariția subdomeniului din DNS-ul public (interogarea lui Claude a fost refuzată pentru prea multe cereri) și lista „Domains” după ștergere (fără captură);
- T-ISO-3 (`http://`), T-ISO-6 și T-ISO-7 (e-mail către o adresă `@electrovolt.ro`) nu au fost refăcute după intervenție;
- dacă la intervenția 43 a fost pusă bifa de ștergere definitivă (altfel cele trei foldere mici sunt în coș).

**Rămase pe cont, cu știința proprietarului:** pachetele `civic-….zip` din coș (numai cod; unele conțin adresa primului cont Admin, în scriptul `civic-bootstrap-admin`); folderul gol `nodevenv`; folderele goale din `.htpasswds`. Backup-urile contului și versiunile vechi ale site-ului din coș sunt ale firmei și nu țin de acest proiect.

**Urmări:** cheile din `civic.env` și parola bazei de date nu mai deschid nimic (baza și aplicația nu mai există). Pasul B al cheii `TOTP_ENC_KEY` (`FAZA_5_4_ROTIRE_TOTP_PLAN.md`) rămâne fără obiect. Intrările TOTP și codurile de recuperare ale celor două conturi Admin de pe acest staging nu mai sunt folosite. De acum, proiectul nu mai are nimic pe contul `electrovolt.ro`; verificările T-ISO rămân valabile numai dacă se revine vreodată pe acel cont.
