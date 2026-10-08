# STAGING NOU (`test.urbisactiv.ro`): JURNALUL INTERVENȚIILOR

**Proiect:** Turnu Măgurele Civic („Urbis Activ”) · **Găzduire:** ClausWeb, plan „NodeJS1” cu cPanel, IP dedicat · **Început:** 07.10.2026
**Deciziile din spate:** `AMENDAMENT_MARIADB_SI_GAZDUIRE.md` (G6, G7, amendamentul la G2).
**Staging-ul vechi** (`civic-test.electrovolt.ro`, HostGate) are jurnalul lui: `FAZA_5_1_STAGING_JURNAL.md`. Nu a fost atins în această zi și rulează în continuare `94dba87`.

## 1. Reguli și convenții

- Numele contului cPanel se scrie `<cont>`; folderul principal al contului este `/home2/<cont>`. În repository nu intră parole, chei, adresa IP, numele serverului sau adrese de e-mail.
- Click-urile în cPanel le dă proprietarul, după un ghid pas cu pas, câte o etapă pe rând; fiecare etapă a avut acordul lui.
- **T-ISO nu a fost rulat.** Contul este la alt furnizor și pe alt server decât `electrovolt.ro`; nicio acțiune de aici nu atinge site-ul firmei, DNS-ul lui sau staging-ul vechi. Proprietarul a fost anunțat la începutul instalării că verificările T-ISO nu se fac la fiecare pas și că le poate cere; nu le-a cerut.
- Același model ca pe staging-ul vechi (G3): date demo, parolă de acces, `noindex`, e-mail `simulated`, setările într-un fișier în afara oricărui docroot (decizia 5.1-A).

## 2. Verificările dinaintea plății (07.10.2026, proprietarul, din cPanel)

| Verificare | Rezultat |
|---|---|
| „Server Information” | `11.4.13-MariaDB-cll-lve` |
| „Setup Node.js App” → versiuni | 24.21.0 |
| Cron Jobs, Zone Editor | există |
| conexiune de ieșire către `smtp-relay.brevo.com`, porturile 587 și 465 | ambele deschise (sarcină cron temporară, cu `bash` și `/dev/tcp`, ștearsă după probă; fișierul de rezultat șters) |

Verificat din exterior de Claude (DNS public): `urbisactiv.ro` folosește serverele de nume ale furnizorului și are o înregistrare A.

## 3. Instalarea (07.10.2026, seara)

| # | Ora | Pas | Verificare | Rezultat |
|---|---|---|---|---|
| 1 | ~20:59 | subdomeniul `test.urbisactiv.ro` (Domains → Create A New Domain), „Share document root” **debifat** | în listă: Document Root `/test.urbisactiv.ro`, separat de `/public_html` (captura proprietarului) | **OK** |
| 2 | ~21:06 | baza de date `<cont>_civic_test` și utilizatorul `<cont>_civic` (Manage My Databases), după ghid: parolă generată numai din litere și cifre, ALL PRIVILEGES numai pe această bază | „Current Databases”: baza, cu utilizatorul la „Privileged Users” (captura proprietarului, fără parolă) | **OK** |
| 3 | ~21:11 | aplicația Node (Setup Node.js App): Node **24.21.0**, Production, Application root `civic-test-app`, URL `test.urbisactiv.ro`, startup `server/dist/app.js`; fără „Run NPM Install” | pagina de probă cPanel: „It works! NodeJS 24.21.0” (proprietarul; Claude, din exterior, pe `https`, deci certificatul era deja emis) | **OK** |
| 4 | ~21:16 | deploy `civic-999a9d5.zip` în `civic-test-app` (File Manager, Upload + Extract; arhiva ștearsă). Pachetul conține scriptul `civic-bootstrap-admin`; adresa primului cont este numai în pachet | `RELEASE.txt`: `commit: 999a9d5` (proprietarul) | **OK** |
| 5 | ~21:35–21:43 | folderul `/home2/<cont>/civic-test-data` (`storage`, `backups`) și fișierul `civic.env`: `APP_ENV=staging`, `PUBLIC_BASE_URL` pe `https`, `DATABASE_URL`, `STORAGE_DIR`, `BACKUP_DIR`, `EMAIL_MODE=simulated`; cele 5 chei **generate de proprietar pe calculatorul lui** (PowerShell, generator criptografic), noi, nefolosite pe staging-ul vechi; `GEOCODER_URL`, `GEOCODER_USER_AGENT`, `LOG_LEVEL` copiate din fișierul vechi (citit, nemodificat). Drepturi **600**. Variabila `CIVIC_ENV_FILE` în aplicația Node, salvată | proprietarul: căile corectate la `/home2/…` (modelul dat de Claude avea `/home/…`), 600 confirmat, variabila apare în listă | **OK** |
| 6 | ~21:47 | `migrate`, `seed:config`, `seed:demo`, `migrate:status` printr-o sarcină cron temporară (o singură linie, ieșirea în `cli.log`), ștearsă după rulare; apoi Restart | proprietarul: „toate au ieșit perfect”, aplicația s-a deschis (conținutul lui `cli.log` nu a fost transmis lui Claude). Claude, din exterior: `GET /api/v1/health` → `{"status":"ok","version":"0.0.0+999a9d5"}`; `robots.txt` → `Disallow: /` | **OK** |
| 7 | ~21:55–22:00 | parolă de acces (Directory Privacy) pe folderul `test.urbisactiv.ro`, utilizator `civic`. Prima parolă nu a fost acceptată; utilizatorul a fost șters și recreat de proprietar | Claude, din exterior, fără parolă: **401**. Proprietarul: cu parola, aplicația se deschide | **OK**, cu observația 2 de mai jos |
| 8 | ~22:02 | „Force HTTPS Redirect” pentru `test.urbisactiv.ro` (Domains) | cPanel: „Error: You do not have the feature “sslinstall”” | **nefăcut** (observația 3) |
| 9 | ~22:06–22:13 | sarcinile cron: `backup:db` zilnic la 03:17 (`backup.log`), `surveys:close-expired` la 5 minute (`surveys-cron.log`, suprascris), `purge:retention` zilnic la 03:47 (`purge.log`); aceeași formă ca pe staging-ul vechi, cu `CIVIC_ENV_FILE` și programul Node din `nodevenv/civic-test-app/24` | proprietarul: cele trei rânduri există; `surveys-cron.log`: „surveys:close-expired: 0 sondaje închise”; „Run JS script” → `civic-backup-db`: `backup:db: civic-backup-20261007T191208913Z`, cu numărul de rânduri pe tabel (captură) | **OK** |

| 10 | 08.10.2026 ~17:23–17:30 | primul cont `super_admin`: „Run JS script” → `civic-bootstrap-admin` (parola temporară păstrată numai de proprietar), apoi prima autentificare pe `/#admin`, în fereastră privată: parola temporară → înrolare TOTP (intrare nouă în aplicația de pe telefon, separată de cele ale staging-ului vechi) → coduri de recuperare → parolă nouă | proprietarul: „sunt în Admin” | **OK** |
| 11 | 08.10.2026 ~17:38 | 5.5b: cont Brevo (plan gratuit), creat de proprietar pe firmă; verificarea telefonului cerută de Brevo amânată (Brevo o cere din nou la nevoie) | proprietarul: în panoul Brevo | **OK** |
| 12 | 08.10.2026 ~17:42–17:57 | domeniul `urbisactiv.ro` adăugat în Brevo, autentificare manuală, fără „branded subdomain”; în Zone Editor (ClausWeb): TXT `brevo-code` pe domeniu, CNAME `brevo1._domainkey` și `brevo2._domainkey`; rândul DMARC existent (`v=DMARC1; p=none;`) **modificat** cu valoarea Brevo (cu `rua`), nu dublat; SPF-ul existent neatins | Claude, din exterior (DNS public): cele patru înregistrări corecte, SPF neschimbat; Brevo: „Your domain has been authenticated” (captura proprietarului) | **OK** |
| 13 | 08.10.2026 ~18:03–18:11 | cheie SMTP Brevo generată de proprietar (nu a trecut prin conversație); în `civic.env`: `EMAIL_MODE=allowlist`, `EMAIL_ALLOWLIST` (adresa de test a proprietarului), `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`, `SMTP_SECURE=false`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM=no-reply@urbisactiv.ro`, `CIVIC_MAIL_DOMAIN=urbisactiv.ro`; Restart; cron `outbox:process` la 2 minute (`outbox-cron.log`, suprascris) | „Run JS script” → `civic-outbox-process`: fără mesajul de trecere în `simulated`, coadă goală | **OK** |
| 14 | 08.10.2026 ~18:15–18:20 | **primul e-mail real:** cod de cont cerut din „Contul meu” pentru adresa din listă | proprietarul: mesajul a ajuns în **Inbox** (nu în Spam); autentificarea cu codul a reușit | **OK** |
| 15 | 08.10.2026 ~18:37 | Admin → Sesizări → „Fluxul către Primărie”: destinatarul tehnic = adresa de test a proprietarului (din listă; niciodată adresa reală a Primăriei, E-5), „Primăria primește numai e-mailuri”, fără referință de acord, fluxul pornit; modul afișat: „staging: numai adresele din listă” | proprietarul: „gata” | **OK** |
| 16 | 08.10.2026 ~18:40–18:45 | sesizare de test („TEST flux Primărie, staging”), cu o fotografie, fără pin („Trimit fără hartă”), cu transmitere către Primărie și notificări cerute | proprietarul: **două mesaje** primite: cel „pentru Primărie”, **cu fotografia**, și notificarea autorului despre stadiu; în „Sesizările mele”: **„în analiză”** | **OK** |
| 17 | 08.10.2026 ~20:13–20:20 | încercare de reparare a ferestrei de parolă repetate: în `test.urbisactiv.ro/.htaccess` (copie înainte: `.htaccess.bak-20261008`) s-au adăugat 3 rânduri (`SetEnvIf Authorization .+ …` + `Header always unset WWW-Authenticate env=…`) | proprietarul, fereastră privată nouă: fereastra apare imediat | **fără efect**; rândurile se scot (scoaterea trebuie confirmată de proprietar). Reparația aleasă: `AMENDAMENT_ME_OPTIONAL.md` |

**Rezultat:** aplicația rulează pe găzduirea nouă, cu Node 24.21.0 și MariaDB 11.4.13: migrarea, seed-urile, pornirea, `health` și un backup au reușit în mediul real.

## 4. Observații

1. **Calea folderului principal este `/home2/<cont>`**, nu `/home/<cont>`. Modelul de `civic.env` dat de Claude presupunea greșit `/home/…`; proprietarul a corectat cele două rânduri înainte de prima pornire.
2. **Fereastra de parolă repetată: cauza confirmată la 08.10.2026** din instrumentele browserului. Cererea `GET /api/v1/citizen/me` pleacă cu parola lacătului, aplicația răspunde 401 („fără sesiune”, comportament proiectat), iar LiteSpeed adaugă la acest răspuns `WWW-Authenticate: Basic`, pe care browserul îl afișează ca o nouă cerere de parolă. Aplicația nu trimite antetul. O regulă `.htaccess` nu l-a putut scoate (intervenția 17). Reparația, decisă de proprietar: `AMENDAMENT_ME_OPTIONAL.md` (`/me?optional=1` → 200 „nelogat”). **Neinstalată încă.** Privește numai staging-ul cu lacăt. **Atenție:** captura trimisă la diagnostic conținea antetul `Authorization` (parola lacătului, în base64), deci parola lacătului trebuie schimbată.
3. **„Force HTTPS Redirect” nu poate fi pornit din cPanel**: furnizorul a dezactivat funcția „sslinstall”. Aplicația trimite HSTS, iar sesiunile cer `https`, dar un prim acces pe `http` nu este redirecționat de server. De cerut furnizorului înainte de lansare, mai ales pentru `urbisactiv.ro`.
4. **`TRUST_PROXY` nu este setat**, la fel ca pe staging-ul vechi (rândul nu exista în `civic.env`-ul de acolo). B7 cere ca `trustProxy` să fie configurat exact pentru proxy-ul din față; fără el, limitele pe adresă IP pot vedea toți vizitatorii ca pe unul singur. **De verificat înainte de lansare**; nu a fost analizat acum.
5. **În formularul „Add New User” (baze de date), browserul a completat singur datele de cPanel.** Proprietarul a fost avertizat să nu apese „Create User”; nu s-a creat niciun utilizator în plus.
6. Fișierul `cli.log` a rămas în `civic-test-data` (conține ieșirea migrării, fără secrete).

## 5. Nefăcut încă

- **Al doilea cont `super_admin`** pe acest staging (ca pe cel vechi, pentru recuperare): nefăcut.
- **Proba negativă a listei:** o adresă din afara `EMAIL_ALLOWLIST` nu trebuie să primească nimic (ghidul 5.5b, pasul 7, partea a doua); nefăcută.
- Sesizarea de test rămâne pe staging (se șterge automat după 45 de zile sau o poate șterge autorul).
- `FAZA_5_5B_GHID.md` descrie încă staging-ul vechi; nu a fost adaptat.
- **Verificarea telefonului în Brevo:** amânată.
- **`health` după punerea parolei** nu a mai fost citit de Claude (primește 401); îl confirmă proprietarul.
- **Restaurarea din backup** nu a fost exersată pe acest server (cere o bază de date nouă); este acoperită de testele automate, inclusiv de jobul CI pe MariaDB 11.4.
- **Retragerea staging-ului vechi** (G3): nedecisă.
