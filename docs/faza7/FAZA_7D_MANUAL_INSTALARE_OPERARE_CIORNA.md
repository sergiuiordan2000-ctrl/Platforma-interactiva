# FAZA 7D — MANUALUL DE INSTALARE ȘI OPERARE (staging)

> ## CIORNĂ — de finalizat după 7E
> Document de lucru pentru E3 (planul v2.4, E2, §10.1). **Nu este manualul final.** Valorile de producție (căi, cron, `BACKUP_DIR`, criptarea, modul e-mail, DNS) se completează numai după verificarea producției (E5, §10.2).

**Proiect:** Urbis Activ (Turnu Măgurele Civic) · **Ciornă redactată:** 27.10.2026 · **Candidatul E3:** `5d8c52a5710acde2deda674c64136fcf0d25730c` (CI 40460197905, 6/6 joburi verzi).
**Mediul descris:** staging-ul `test.urbisactiv.ro` (ClausWeb, plan „NodeJS1”, cPanel, Node 24.21.0, MariaDB 11.4.13).
**Înlocuiește, pentru operarea curentă:** `docs/faza5/FAZA_5_5B_GHID.md` (rămâne document istoric, DEC-6).

### Marcajele folosite la fiecare pas

| Marcaj | Înțeles |
|---|---|
| **[V]** | verificat în cod sau în configurația existentă; sursa este citată |
| **[E3]** | necesită verificare practică pe staging, în E3 |
| **[A]** | necesită o decizie sau o aprobare separată a proprietarului |
| **[EFECT]** | operație care modifică date sau fișiere, procesează coada de e-mail, poate trimite e-mailuri sau schimbă starea serviciului; se execută **numai** cu aprobarea explicită a proprietarului pentru acel pas (§0) |
| **[CITIRE]** | operație numai de citire, fără efect asupra datelor, a cozii sau a serviciului; tot pe găzduire, deci tot cu acordul proprietarului pentru acces |

### Reguli permanente

1. Fiecare operație pe găzduire cere aprobarea separată a proprietarului. Click-urile în cPanel le dă proprietarul, după un ghid pas cu pas, **câte un pas o dată**, cu confirmare. [V] (`PROJECT_HANDOFF_CURRENT.md` §0.5, regula 2; planul v2.4, E3)
2. Repository-ul este public: fără parole, chei, adresa IP, numele serverului sau adrese de e-mail. Numele contului cPanel se scrie `<cont>`. [V] (jurnalul staging-ului, §1)
3. Nu se cer capturi ale fișierului `civic.env`, ale codurilor QR, cheilor TOTP sau codurilor de recuperare. [V] (`PROJECT_HANDOFF_CURRENT.md` §0.5, regula 3)
4. **În această etapă nu se trimite niciun e-mail.** Trimiterea de probă prin Brevo, către adresa de test a proprietarului, cere aprobarea separată din §8.3. Niciun e-mail nu pleacă vreodată către o adresă a Primăriei înaintea autorizării separate a transmiterii reale. [A]
5. **Un pas care nu poate fi verificat oprește instalarea.** Nu se trece la pasul următor pe baza unei presupuneri; se raportează și se așteaptă decizia proprietarului. Criteriile de oprire sunt în §4. [A]

---

## 0. Operațiile cu efect și aprobările lor

Orice operație din tabelul de mai jos se execută numai după aprobarea explicită a proprietarului pentru acel pas. Aprobarea unei operații nu o autorizează pe următoarea.

| Operația | Efectul | Aprobarea necesară | Sursă |
|---|---|---|---|
| STOP APP / START APP / Restart (Setup Node.js App) | schimbă starea serviciului (aplicația indisponibilă cât este oprită) | aprobarea instalării, pas cu pas | [V] jurnal, intervențiile 73–74, 99–100 |
| Upload + Extract în `civic-test-app` | suprascrie fișierele aplicației | aprobarea instalării | [V] jurnal, intervenția 99 |
| `civic-backup-db` (`backup:db`) | scrie o copie nouă în `BACKUP_DIR` și **șterge copiile mai vechi de 7 zile** (rotația) | aprobarea pasului de backup | [V] `server/src/db/backup.ts` (rândurile 3 și 98); jurnal, intervenția 77 |
| `civic-migrate` (`migrate`) | modifică schema bazei de date | aprobare separată; numai dacă pachetul are migrații noi | [V] jurnal, intervenția 24 |
| `civic-outbox-process` (`outbox:process`) | **procesează coada și poate trimite e-mailuri reale** către destinatarii permiși de `EMAIL_MODE` | **nu se rulează în această etapă**; numai cu aprobarea separată din §8.3 | [V] `server/src/reports/outbox.ts` (rândurile 225–250) |
| `civic-purge-retention` (`purge:retention`) | șterge date expirate (sesizări, conturi, texte) | nu se rulează manual în E3; rulează prin cron | [V] `server/src/cli.ts`; planul v2.4, E3.4 |
| `civic-surveys-close-expired` | închide sondajele expirate | nu se rulează manual în E3; rulează prin cron | [V] `server/src/cli.ts` |
| `civic-seed-demo` (`seed:demo`) | adaugă date demonstrative | nu se rulează în E3 | [V] `package-release.py` 73 |
| `civic-report-pow-on` / `-off` | schimbă setarea ALTCHA pentru sesizări | nu se rulează în E3; `civic-report-pow-status` este numai citire | [V] `server/src/cli.ts` 216 |
| `civic-rotate-keys` (`rotate:keys`) | **schimbă cheile din `civic.env`** | nu se rulează în E3; decizie separată | [V] `server/src/cli.ts` 6 |
| `civic-bootstrap-admin` | creează un cont `super_admin` | nu face parte din E3 (pachetul se construiește fără `--bootstrap-email`) | [V] `package-release.py` 88–90 |
| `markers:rebuild-counter`, `restore:db … --confirm`, `host-restore:recover … --confirm` | scriu marcaje, baza sau fișierele | numai cu decizie separată, la incidente sau la proba DEC-9 | [V] `server/src/cli.ts` 136–170; jurnal, intervențiile 33, 46 |
| modificarea `civic.env` | schimbă configurarea; are efect la repornire | aprobare separată pentru fiecare modificare | [V] jurnal, intervențiile 13, 23, 38 |
| **suspendarea** sarcinii cron `outbox:process` (cPanel → Cron Jobs) | cPanel 138.0.19 oferă numai Edit și Delete; o suspendare înseamnă modificarea sau ștergerea rândului | **propunerea din §4.0.1 este ca, pentru candidatul `5d8c52a`, să nu se folosească** (propunere supusă aprobării proprietarului); orice folosire cere o decizie și o aprobare explicită separată, împreună cu metoda verificată | [V] captura „Current Cron Jobs”, 27.10.2026; documentația cPanel (Cron Jobs) |
| **restaurarea definiției originale** a sarcinii cron `outbox:process` (reactivarea), după o eventuală suspendare | reia trimiterea automată; mesajele aflate atunci în coadă pleacă la prima rulare | numai dacă o suspendare ar fi fost aprobată și executată; metoda (editarea programării înapoi la `*/2 * * * *` sau recrearea rândului) depinde de metoda de suspendare verificată și aprobată atunci; aprobare explicită separată, după verificarea cozii și confirmarea destinatarilor permiși; rezultatul se compară cu captura din 27.10.2026 | [V] captura din 27.10.2026 |
| salvarea în Admin → Sesizări → „Fluxul către Primărie” | schimbă destinatarul sau pornește fluxul; mesajele în așteptare pot pleca | nu se salvează nimic în E3; panoul se deschide numai pentru citire | [V] `src/components/admin/reports/RegistrySettingsPanel.tsx` 55–58 |
| acțiuni în aplicație care pun mesaje în coadă (cererea unui cod de autentificare sau anunțul de cont blocat, o sesizare cu transmitere sau cu notificări, marcarea „rezolvată”, „Reîncearcă” la un e-mail, pornirea fluxului către Primărie) | **mesajul poate pleca pe două căi**, numai către adresele permise de `EMAIL_MODE`: (1) **direct, din aplicația pornită**, imediat după acțiune, prin `kickOutbox`: la mesajele de cont (dacă modul nu este `simulated`), la sesizarea nouă, la marcarea „rezolvată” și la „Reîncearcă”; (2) **prin sarcina cron `outbox:process`** (la 2 minute), pentru mesajele rămase în coadă cu starea `queued`: cele pe care trimiterea directă nu le-a trimis, reîncercările programate, mesajele eliberate la pornirea fluxului (fără trimitere directă) și notificarea de stare adăugată după trimiterea către Primărie | nu se fac în E3 fără aprobarea separată din §8.3 | [V] `kickOutbox`: `server/src/reports/outbox.ts` 344–356, apelat din `routes/citizens.ts` 74, `routes/reports.ts` 420, `routes/adminReports.ts` 313 și 457; pornirea fluxului: `adminReports.ts` 513 și `outbox.ts` 180–189 (numai trecere în `queued`); notificarea de stare: `outbox.ts` 308–315; selecția cron: `outbox.ts` 328–334; jurnal, intervențiile 13–16 |

**Atenție:** sarcina cron `outbox:process` rulează la 2 minute **independent de aplicație** (inclusiv cât aplicația este oprită) și trimite mesajele aflate deja în coadă către adresele permise. Starea cozii înaintea instalării se verifică numai prin citire (§4, pasul 4.0). [V] jurnal, intervenția 13; `server/src/cli.ts`

În plus, **aplicația pornită trimite imediat**, fără să aștepte cron-ul, mesajul creat de o acțiune a unui utilizator (cererea unui cod de autentificare, o sesizare cu transmitere sau cu notificări, marcarea „rezolvată”, „Reîncearcă”). [V] `kickOutbox`: `server/src/reports/outbox.ts` 344–356, apelat din `routes/citizens.ts` 74, `routes/reports.ts` 420, `routes/adminReports.ts` 313 și 457

---

## 1. Structura instalării pe găzduire

| Element | Valoarea pe staging | Marcaj și sursă |
|---|---|---|
| folderul principal al contului | `/home2/<cont>` (nu `/home/…`) | [V] jurnal, observația 1 |
| aplicația Node | „Setup Node.js App”: Node **24.21.0**, Production, Application root `civic-test-app`, URL `test.urbisactiv.ro`, startup file `server/dist/app.js`; **fără „Run NPM Install”** | [V] jurnal, intervenția 3 |
| programul Node al aplicației | `/home2/<cont>/nodevenv/civic-test-app/24/bin/node` | [V] `PROJECT_HANDOFF_CURRENT.md` §0.4 |
| fișierul de setări | `/home2/<cont>/civic-test-data/civic.env`, drepturi **600**; aplicația îl primește prin variabila `CIVIC_ENV_FILE`, setată în „Setup Node.js App” | [V] jurnal, intervenția 5; `server/src/envFile.ts` |
| fotografiile | `/home2/<cont>/civic-test-data/storage` (`STORAGE_DIR`) | [V] jurnal, intervenția 5 |
| backup-urile și marcajele | `/home2/<cont>/civic-test-data/backups` (`BACKUP_DIR`) | [V] jurnal, intervenția 5 |
| document root-ul subdomeniului | `/test.urbisactiv.ro`, separat de `/public_html` | [V] jurnal, intervenția 1 |
| restricția de acces | Directory Privacy pe folderul `test.urbisactiv.ro`, utilizatorul `civic` | [V] jurnal, intervențiile 7 și 18 |
| redirecționarea `http` → `https` | regulă în `test.urbisactiv.ro/.htaccess`, cu `301`, deasupra secțiunilor cPanel (funcția cPanel „Force HTTPS Redirect” nu este disponibilă) | [V] jurnal, intervențiile 39–40, observația 3 |
| baza de date | `<cont>_civic_test`, utilizatorul `<cont>_civic`, ALL PRIVILEGES numai pe această bază | [V] jurnal, intervenția 2 |

**Fișierul de setări** este citit de aplicație numai dacă nu are drepturi pentru grup sau pentru alții (600 sau 400). Altfel aplicația nu pornește și numește problema. Variabilele deja prezente în mediu au prioritate față de fișier. [V] `server/src/envFile.ts`

---

## 2. Variabilele de mediu

Validarea se face la pornire (`server/src/config.ts`). Dacă o variabilă obligatorie lipsește sau este invalidă, aplicația **nu pornește**, iar mesajul numește variabila, niciodată valoarea ei. [V] `config.ts`, rândurile 1–7 și 323–333

### 2.1 Obligatorii pe staging

| Variabila | Regula | Marcaj și sursă |
|---|---|---|
| `APP_ENV` | exact `staging` pe staging; valorile acceptate sunt `development`, `staging`, `production` | [V] `config.ts` 15, 107 |
| `PUBLIC_BASE_URL` | adresă URL completă; **obligatoriu `https://`** în afara dezvoltării | [V] `config.ts` 110, 157–163 |
| `DATABASE_URL` | începe cu `mysql://` (secret) | [V] `config.ts` 111–113 |
| `STORAGE_DIR` | nevidă | [V] `config.ts` 114 |
| `BACKUP_DIR` | **obligatorie** pe staging și în producție; nu poate fi același director cu `STORAGE_DIR` și niciunul nu poate fi în interiorul celuilalt | [V] `config.ts` 164–184 |
| `IP_HASH_SECRET`, `PARTICIPATION_HMAC_SECRET`, `FORM_TOKEN_SECRET`, `POW_HMAC_KEY` | secrete de cel puțin 32 de caractere | [V] `config.ts` 22–26, 116–119 |
| `TOTP_ENC_KEY` | exact 32 de octeți: 64 de caractere hex sau base64 | [V] `config.ts` 28–45, 120 |

`HOST` și `PORT` nu sunt enumerate printre setările staging-ului (jurnal, intervenția 5): aplicația rulează sub Passenger, prin „Setup Node.js App”. [V] jurnal, intervenția 5

### 2.2 E-mail: `EMAIL_MODE`, `EMAIL_ALLOWLIST` și SMTP

**Regulile stabilite de proprietar:**

| Mediul | `EMAIL_MODE` | Destinatarii posibili |
|---|---|---|
| dezvoltarea locală | `simulated` (valoarea implicită) | niciunul: mesajul se înregistrează, nu pleacă |
| staging | `allowlist` | **numai** adresa de test a proprietarului, din `EMAIL_ALLOWLIST` |
| producție, până la autorizarea separată a transmiterii reale | nu `live` (DEC-25, de decis înainte de E4) | — |

| Variabila | Regula în cod | Marcaj și sursă |
|---|---|---|
| `EMAIL_MODE` | `simulated` \| `allowlist` \| `live`; implicit `simulated` | [V] `config.ts` 121 |
| `EMAIL_ALLOWLIST` | obligatorie pentru `allowlist`; adrese separate prin virgulă, comparate fără majuscule. Un destinatar din afara listei este **blocat** (`blocked`), nu trimis | [V] `config.ts` 291, 352–355; `server/src/reports/outbox.ts` 240–243 |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `CIVIC_MAIL_DOMAIN` | obligatorii pentru `allowlist` și `live` | [V] `config.ts` 292–294 |
| `MAIL_FROM` | adresă simplă `nume@domeniu`; domeniul trebuie să fie `CIVIC_MAIL_DOMAIN`; nu poate fi pe `electrovolt.ro` | [V] `config.ts` 296–301 |
| `SMTP_PORT`, `SMTP_SECURE` | implicit 587 și `false` (STARTTLS); portul 465 cere `SMTP_SECURE=true` | [V] `config.ts` 126–127, 302 |

**Atenție — o configurație e-mail incompletă nu oprește aplicația.** Dacă modul cerut are probleme, aplicația lucrează în `simulated` (nicio trimitere) și afișează mesajul „E-mail: EMAIL_MODE=… nu se poate folosi; se lucrează în „simulated” (nicio trimitere reală)”, cu numele variabilelor. De aceea, după orice schimbare în `civic.env`, modul efectiv se verifică prin citire, în panoul Admin (§8.2). Comanda `civic-outbox-process` afișează și ea mesajul, dar procesează coada și poate trimite e-mailuri, deci **nu** se folosește ca verificare. [V] `config.ts` 185, 306–309; `server/src/reports/smtp.ts` 61–65; `adminReports.ts` 475–477

**Valorile de pe staging** (fără secrete): `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`, `SMTP_SECURE=false`, `MAIL_FROM=no-reply@urbisactiv.ro`, `CIVIC_MAIL_DOMAIN=urbisactiv.ro`; `SMTP_USER`, `SMTP_PASS` și adresa din `EMAIL_ALLOWLIST` sunt numai în `civic.env`. [V] jurnal, intervenția 13

**Destinatarul sesizărilor** nu este o variabilă de mediu. Este setarea „Fluxul către Primărie” din Admin → Sesizări, salvată în baza de date (`registry.recipient_email`). Pe staging este adresa de test a proprietarului. În modul `allowlist`, serverul refuză pornirea fluxului dacă destinatarul nu este în listă. [V] `server/src/routes/adminReports.ts` 486–512; jurnal, intervenția 15

**Modul `live` este interzis** pe staging și înainte de autorizarea separată a transmiterii reale. [A] (planul v2.4, E4 criteriul 6; regulile proprietarului din 26.10.2026)

### 2.3 Indexarea: `SEARCH_INDEXING`

| Valoarea | Efectul | Unde este permisă |
|---|---|---|
| absentă (recomandat pe staging) sau `off` | antetul `X-Robots-Tag: noindex, nofollow` pe orice răspuns; `robots.txt` = `User-agent: *` / `Disallow: /` | orice mediu |
| `on` | fără antet; `robots.txt` = `User-agent: *` / `Allow: /` | **numai** `APP_ENV=production`; altfel aplicația **nu pornește** |
| orice altă valoare (`true`, `1`, `OFF`, șir gol etc.) | aplicația **nu pornește** | — |

[V] `config.ts` 143–144, 203–210; `server/src/app.ts` (hook-ul `onSend` și ruta `/robots.txt`); testele SI-1…SI-9 (`server/test/api/searchIndexing.test.ts`)

Activarea indexării este o decizie a lansării (E9). [A]

### 2.4 Alte variabile

| Variabila | Regula | Marcaj și sursă |
|---|---|---|
| `TRUST_PROXY` | se lasă **goală** pe găzduirea actuală (nicio valoare nu este sigură) | [V] `.env.example`; jurnal, observația 4 |
| `IP_RATE_LIMITS` | lipsă = oprite în afara dezvoltării; `on` fără `TRUST_PROXY` în afara dezvoltării → aplicația **nu pornește** | [V] `config.ts` 142, 196–202, 374 |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | ambele sau niciuna; fără ele, autentificarea cu Google este oprită | [V] `config.ts` 134–136, 186–192; jurnal, intervenția 23 |
| `DEV_OIDC_PROVIDER_URL` | **interzisă** în afara dezvoltării (aplicația nu pornește) | [V] `config.ts` 137–138, 211–232 |
| `GEOCODER_URL`, `GEOCODER_USER_AGENT`, `UAT_BOUNDARY_FILE` | opționale | [V] `config.ts` 131–133; jurnal, intervenția 5 |
| `RETENTION_DAYS`, `ADMIN_RETENTION_MONTHS` | cel mult 45 de zile și 6 luni (valori aprobate) | [V] `config.ts` 19–20, 145–150 |
| `LOG_LEVEL` | implicit `info` | [V] `config.ts` 151–154 |
| `DIAG_CLIENT_IP` | **eliminată în 7C**: nu mai este citită în niciun mediu. Dacă a rămas în `civic.env`, nu are efect | [V] 7C, P3 (`aed3cb7`); testul DG-2 |

**Ștergerea rândului `DIAG_CLIENT_IP`** din `civic.env`, dacă există, este o curățenie recomandată, dar nu obligatorie; este o modificare [EFECT], cu aprobare separată. Rândul a fost scos la 13.10.2026 (jurnal, intervenția 38); prezența lui actuală nu este confirmată. [E3] [A]

---

## 3. Pregătirea pachetului (local, nu pe găzduire)

| Pas | Ce se face | Marcaj și sursă |
|---|---|---|
| 3.1 | se pornește dintr-o **clonă curată** a commitului aprobat (practica instalărilor din 14.10.2026 încoace) | [V] jurnal, intervențiile 56, 73, 78, 84, 99 |
| 3.2 | `npm ci` | [V] procedura CI (`.github/workflows/ci.yml`) |
| 3.3 | `npm run build` (frontend), apoi `npm run build -w server` (`server/dist/app.js`) | [V] `PROJECT_HANDOFF_CURRENT.md` §0.4; `server/build.mjs` |
| 3.4 | `python3 server/scripts/package-release.py` (**fără** `--bootstrap-email`, dacă nu se cere un prim cont Admin) | [V] `server/scripts/package-release.py` |
| 3.5 | rezultatul: `server/release/civic-<sha>.zip` și amprenta SHA-256, afișate de script | [V] `package-release.py` 51–53, 93–95 |

**Protecțiile scriptului** [V] `package-release.py`:
- refuză dacă lipsește build-ul sau dacă `server/dist/app.js` nu este construit din HEAD-ul curent;
- dacă arborele de lucru are modificări necomise, numele pachetului primește sufixul `-dirty`. **Un pachet `-dirty` nu se instalează.** [A]
- nu include `node_modules`, fișierele `.env*` și fișierele `.map`.

**Conținutul pachetului:** `dist/` (frontend), `server/dist/` (artefactul), `server/migrations/`, `server/seeds/`, `server/data/`, un `package.json` minimal cu scripturile pentru „Run JS script” și `RELEASE.txt` (`commit: <sha>`). [V] `package-release.py` 1–21, 55–91

**Scripturile disponibile în „Run JS script”** [V] `package-release.py` 68–86:

| Scriptul | Comanda | Tipul (§0) |
|---|---|---|
| `civic-migrate` | `migrate` | [EFECT] |
| `civic-migrate-status` | `migrate:status` | [CITIRE] |
| `civic-seed-demo` | `seed:demo` | [EFECT] |
| `civic-show-latest-code` | `dev:show-code --latest` | [CITIRE] (afișează un cod de autentificare; nu se folosește în E3) |
| `civic-outbox-process` | `outbox:process` | [EFECT], **poate trimite e-mailuri** |
| `civic-purge-retention` | `purge:retention` | [EFECT] |
| `civic-report-pow-status` / `-on` / `-off` | `settings:report-pow status` / `on` / `off` | `status`: [CITIRE]; `on`/`off`: [EFECT] |
| `civic-rotate-keys` | `rotate:keys` | [EFECT] |
| `civic-surveys-close-expired` | `surveys:close-expired` | [EFECT] |
| `civic-backup-db` | `backup:db` | [EFECT] (copie nouă și rotație) |
| `civic-rotate-totp-key-check` | `rotate:totp-key --check` | [CITIRE] (numai proba) |
| `civic-bootstrap-admin` | numai cu `--bootstrap-email` | [EFECT] |

**Condiția de instalare:** CI verde pe toate cele 6 joburi pentru SHA-ul exact al pachetului. Pentru `5d8c52a`: rularea 40460197905. [V] planul v2.4, E3 criteriul 1; `FAZA_7_REGISTRU_DECIZII_ACTUALIZARI.md` §7

---

## 4. Instalarea pe staging (proprietarul, pas cu pas)

Ordinea de mai jos este cea folosită la instalările din 13–25.10.2026. Aprobarea instalării este separată, iar fiecare pas [EFECT] se execută numai după confirmarea pasului anterior. [A]

**Condițiile de intrare (toate obligatorii; dacă una lipsește, instalarea nu începe):**
- pachetul `civic-<sha>.zip` a fost construit dintr-o clonă curată, nu are sufixul `-dirty`, iar amprenta SHA-256 afișată de `package-release.py` este consemnată (§3); [V]
- CI este verde pe toate cele 6 joburi pentru același SHA; [V]
- pachetul de revenire (versiunea instalată acum) este disponibil, cu SHA-ul și amprenta verificate (§4.9); [E3]
- condițiile de protecție a e-mailului din §4.0.1 (modul `allowlist`, destinatarul de test, coada 0 `queued` / 0 `sending`, interdicția acțiunilor) sunt îndeplinite la punctul de control PC1; [E3]
- E3 este programată **în timpul zilei**, iar intervalul dintre PC1 și PC4 este **în afara ferestrei 03:00–06:30, ora României**, ca să se evite rularea obișnuită a `purge:retention` de la 03:47. Fereastra este o măsură de precauție: fusul orar al cron-ului nu este verificat, iar recomandarea nu este o garanție tehnică (§4.0.1, punctul 2; §6.2); [A]
- aprobarea instalării. [A]

| Pas | Tip | Ce face proprietarul | Ce trebuie să vadă | Criteriul de oprire | Marcaj și sursă |
|---|---|---|---|---|---|
| 4.0 | [CITIRE] | **punctul de control PC1** (§4.0.1): starea cozii de e-mail, înaintea oricărei modificări: phpMyAdmin → baza staging-ului → SQL: `SELECT kind, status, COUNT(*) FROM email_outbox GROUP BY kind, status` (fără destinatari, fără conținut) | numărul mesajelor pe tip și stare | dacă există mesaje cu starea `queued` sau `sending`: **oprire**. Ele pot pleca prin cron (§0); continuarea se decide separat. O coadă goală **nu** garantează singură lipsa trimiterilor ulterioare: §4.0.1 | forma interogărilor read-only în phpMyAdmin: [V] jurnal, intervențiile 28, 42, 104; tabela și stările: [V] `outbox.ts`; rezultatul: [E3] |
| 4.1 | [CITIRE] | `https://test.urbisactiv.ro/api/v1/health` | `{"status":"ok","version":"0.0.0+<sha-ul instalat acum>"}` | versiunea diferă de cea așteptată (ultima consemnată: `711a7ae`) sau `status` nu este `ok`: **oprire** | [V] jurnal, intervenția 106; `app.ts` 175–184 |
| 4.2 | [EFECT] | Setup Node.js App → „Run JS script” → `civic-backup-db` (copia de revenire) | `backup:db: civic-backup-<dată>`, cu rândurile pe tabel; `stderr` gol (un `npm notice` nu este eroare) | lipsește linia `backup:db: civic-backup-…` sau `stderr` conține o eroare: **oprire**, fără STOP APP | [V] jurnal, intervențiile 72, 77, 97 |
| 4.3 | [EFECT] | Setup Node.js App → **STOP APP**, numai după punctul de control PC2 (§4.0.1) | aplicația oprită | PC2 nu corespunde (§4.0.1, tabelul punctelor de control): **oprire**, fără STOP APP | [V] jurnal, intervențiile 73, 99 |
| 4.4 | [EFECT] | File Manager → `civic-test-app` → Upload `civic-<sha>.zip` → Extract (suprascriere) → **ștergerea arhivei** | `RELEASE.txt`: `commit: <sha>` | `RELEASE.txt` arată alt SHA sau „modificari necomise”: **oprire**, aplicația rămâne oprită, se trece la decizia de revenire (§4.9) | [V] jurnal, intervențiile 73, 84, 99; `package-release.py` 92 |
| 4.5 | [EFECT] | migrațiile: **numai dacă pachetul conține migrații noi**, „Run JS script” → `civic-migrate`, înainte de pornire; altfel nimic | `Schema este la versiunea N` | mesaj de eroare: **oprire** | [V] jurnal, intervenția 24; `PROJECT_HANDOFF_CURRENT.md` §0.4 |
| 4.6 | [EFECT] | `civic.env`: modificări numai dacă versiunea nouă le cere, fiecare aprobată separat | — | — | [V] pentru `5d8c52a`: nicio variabilă obligatorie nouă și nicio migrație nouă față de `711a7ae` (`git diff 711a7ae 5d8c52a -- server/src/config.ts server/migrations`: în schemă, numai `DIAG_CLIENT_IP` eliminată și `SEARCH_INDEXING` adăugată, opțională) |
| 4.7 | [EFECT] | Setup Node.js App → **START APP** | `health`: `{"status":"ok","version":"0.0.0+<sha>"}` | `503`, `status` diferit de `ok` sau altă versiune: **oprire**, §4.8; apoi punctul de control PC3 (§4.0.1) | [V] jurnal, intervențiile 74, 100 |

**Pentru candidatul `5d8c52a`:** pasul 4.5 nu este necesar (schema rămâne la versiunea 2, migrațiile `0001`–`0002`), iar pasul 4.6 nu cere nimic obligatoriu. [V] Dacă `civic.env` conține `SEARCH_INDEXING`, valoarea trebuie să fie exact `off`. Orice altă valoare oprește pornirea pe staging. [V] §2.3; prezența variabilei: [E3]

### 4.0.1 Limita verificării cozii și condițiile de continuare

**Limita.** Interogarea de la pasul 4.0 arată starea cozii **numai în momentul citirii**. Sarcina cron `outbox:process` rulează la 2 minute, independent de aplicație, inclusiv cât aplicația este oprită. Un mesaj apărut după citire poate pleca la următoarea rulare a cron-ului sau imediat, dacă îl creează aplicația pornită (§0). Coada goală la pasul 4.0 **nu garantează** deci că până la STOP APP, cât aplicația e oprită sau după START APP nu pleacă niciun e-mail. [V] `outbox.ts` 328–356; jurnal, intervenția 13

**Cum ajunge un mesaj în coadă** (confirmat în cod). Numai prin acțiuni în aplicația pornită:
- cererea unui cod de autentificare sau anunțul de cont blocat (`routes/citizens.ts` 56–74, 114, 152);
- o sesizare cu transmitere către Primărie sau cu notificări (`routes/reports.ts` 386, 420);
- marcarea „rezolvată” de către Admin (`routes/adminReports.ts` 301);
- pornirea fluxului în panoul „Fluxul către Primărie”, care eliberează mesajele `on_hold` (`adminReports.ts` 513);
- „Reîncearcă” la un e-mail (`adminReports.ts` 444–457);
- trimiterea unei notificări către Primărie, care adaugă automat notificarea de stare pentru autor (`outbox.ts` 314).

Pe lângă acestea, cron-ul trimite mesajele deja în coadă cu starea `queued`, la ora programată (inclusiv reîncercările), și mesajele `sending` rămase blocate (`outbox.ts` 332–333). Comenzile `purge:retention`, `surveys:close-expired` și `backup:db` nu pun mesaje în coadă. [V]

**Propunere pentru candidatul `5d8c52a`, supusă aprobării proprietarului (neaprobată la redactare, 27.10.2026): E3 se face fără suspendarea cron-ului `outbox:process`.** Până la aprobare, nu constituie o decizie. Motivele, din auditul read-only din 27.10.2026:
- cPanel 138.0.19 oferă pentru o sarcină cron numai **Edit** și **Delete**; nu există o suspendare demonstrată pe această găzduire, iar ștergerea și recrearea au riscul restaurării inexacte a definiției;
- codul nu are o pauză generală a cozii care să păstreze mesajele; una nouă ar cere cod și alt candidat E3.

**Aceasta este o protecție procedurală, nu o barieră tehnică.** Sarcina cron rămâne activă pe toată durata E3 (§0). [A]

**Fapte confirmate de proprietar la 27.10.2026** (observații la acea dată, nu garanții că nu se schimbă ulterior): `EMAIL_ALLOWLIST` conținea exclusiv adresa lui de test; numai el cunoștea parola lacătului staging-ului; destinatarul fluxului era adresa lui de test, cu modul afișat „staging: numai adresele din listă”. Conținutul `EMAIL_ALLOWLIST` nu se poate citi fără a expune `civic.env`, deci rămâne o confirmare a proprietarului; modul și destinatarul se reverifică prin citire la fiecare punct de control (PC1–PC4). [E3]

**1. Verificarea destinatarilor (numai citire).** Panoul „Fluxul către Primărie” din Admin → Sesizări, deschis **fără salvare** (nu se apasă butonul de salvare și nu se modifică niciun câmp; deschiderea face numai o cerere `GET`): modul e-mail al serverului este „staging: numai adresele din listă” (`allowlist`), iar destinatarul este adresa de test a proprietarului (§8.2). Panoul arată modul efectiv și destinatarul fluxului, **nu** conținutul `EMAIL_ALLOWLIST`. [V] `adminReports.ts` 475–477; [E3]

**2. Verificarea cozii (numai citire).** Interogarea de la pasul 4.0, pe tip și stare: trebuie să arate **0 mesaje `queued` și 0 `sending`**. Rezultatul de la PC1 se notează (numărul pe tip și stare) și devine **referința**: la PC2–PC4 numerele trebuie să fie identice cu ele. O creștere a numărului `sent` (sau o stare nouă, de exemplu `failed`, `blocked`) arată că între timp **s-a produs** o trimitere sau o încercare de trimitere. Verificarea doar o **constată**; nu o poate anula. **Programarea:** `purge:retention` (zilnic, 03:47, ora serverului) șterge mesajele fără sesizare mai vechi de 45 de zile și ar putea modifica numerele fără nicio trimitere. De aceea E3 se programează **în timpul zilei**, iar intervalul PC1–PC4 se plasează **în afara ferestrei 03:00–06:30, ora României**, ca să se evite rularea obișnuită a acestei sarcini. Fereastra acoperă ora 03:47 atât dacă ceasul cron al serverului este ora României (deducția din §6.2), cât și dacă este UTC (05:47, ora de iarnă a României). **Fusul orar al cron-ului nu este verificat:** fereastra este o măsură de precauție, nu o confirmare a fusului orar, iar respectarea ei nu este o garanție tehnică că `purge:retention` nu rulează în intervalul E3. Nu se admit excepții decise în timpul instalării: dacă procedura ajunge în această fereastră, se oprește la ultimul punct de control trecut. [V] `server/src/maintenance.ts` 83; fusul orar: [E3]

**Ce dovedește comparația.** Identitatea numerelor cu referința este un **criteriu de oprire și un control de detectare**, nu o dovadă absolută că nu s-a trimis nimic. Interogarea compară totaluri pe tip și stare, nu fiecare mesaj; teoretic, o adăugare și o ștergere simultane în aceeași categorie ar păstra totalurile. În afara ferestrei `purge:retention`, codul mai șterge mesaje din coadă numai (a) la ștergerea unei sesizări sau a unui cont, acțiuni interzise la punctul 4, și (b) la pornirea aplicației (pasul 4.7), prin reconcilierea intențiilor de ștergere a conturilor rămase după o oprire bruscă; în mod obișnuit nu există asemenea intenții, iar când există, pornirea scrie în jurnalul aplicației linia „Marcajele de ștergere a conturilor, reconciliere”. Aceasta este o deducție din cod, nu o garanție. [V] `server/src/maintenance.ts` 83; `server/src/db/reportDeletion.ts` 48; `server/src/db/accountDeletion.ts` 69; `server/src/main.ts` 58–61

**3. Punctele de control, în ordinea procedurii.** La **fiecare** punct de control se fac ambele verificări, în această ordine: întâi verificarea 1 (panoul, fără salvare), apoi verificarea 2 (coada), ca citirea cozii să fie cât mai aproape de pasul următor. Toate patru au loc cu aplicația **pornită**: PC2 înainte de STOP APP, PC3 după START APP. Între STOP APP și START APP (pașii 4.3–4.7) panoul nu este disponibil și nu există punct de control; cron-ul rulează totuși și în acest interval (§0).

| Punctul | Când | Ce se verifică | Rezultatul așteptat | Dacă nu corespunde |
|---|---|---|---|---|
| **PC1** | pasul 4.0, cu aplicația pornită, înaintea pasului 4.1 și a oricărei modificări | verificarea 1 și verificarea 2 (se notează referința) | `allowlist`, destinatarul de test, 0 `queued`, 0 `sending` | **oprire**: instalarea nu începe |
| **PC2** | după pasul 4.2 (backup), imediat înaintea pasului 4.3 (STOP APP), cu versiunea veche pornită | verificarea 1 și verificarea 2 | `allowlist`, destinatarul de test, 0 `queued`, 0 `sending`, numerele identice cu referința PC1 | **oprire**: fără STOP APP; aplicația rămâne cu versiunea veche, pornită |
| **PC3** | după pasul 4.7 (START APP și `health` corect), cu versiunea nouă pornită, înaintea oricărei verificări din §5 | verificarea 1 și verificarea 2 | `allowlist`, destinatarul de test, 0 `queued`, 0 `sending`, numerele identice cu referința PC1 | **oprire**: nu se trece la §5; aplicația rămâne pornită cu versiunea nouă, fără nicio acțiune în ea; se raportează și decide proprietarul |
| **PC4** | după verificările din §5 făcute în ziua instalării (5.1–5.6 și 5.9); 5.7 și 5.8 citesc mai târziu fișierele de jurnal, fără acțiuni în aplicație | verificarea 1 și verificarea 2 | `allowlist`, destinatarul de test, 0 `queued`, 0 `sending`, numerele identice cu referința PC1 | **oprire**: E3 nu se declară încheiat; se raportează și decide proprietarul |

**Dacă oricare condiție nu este îndeplinită sau nu poate fi confirmată** la un punct de control (panoul sau interogarea nu pot fi citite, modul nu este `allowlist`, destinatarul nu este adresa de test, apare un mesaj `queued` sau `sending`, numerele diferă de referință), procedura **se oprește** la acel punct. Dacă numerele diferă de referință, se citește în plus (numai citire) ce s-a schimbat, pe tip și stare, fără destinatari și fără conținut. Verificările ulterioare **doar constată** o eventuală trimitere; o trimitere constatată **nu poate fi anulată**. Se consemnează ca incident, iar proprietarul decide continuarea. [A]

**4. Interdicția acțiunilor.** De la PC1 până la aprobarea separată a testului de e-mail (punctul 8) sau până la o decizie explicită contrară a proprietarului **nu se face**:
- nicio acțiune în aplicație dintre cele care pun mesaje în coadă (lista „Cum ajunge un mesaj în coadă”, de mai sus): cererea unui cod de autentificare, sesizarea cu transmitere sau cu notificări, marcarea „rezolvată”, „Reîncearcă”, pornirea sau salvarea fluxului;
- nicio comandă administrativă care procesează coada: „Run JS script” → `civic-outbox-process`.

Autentificarea în Admin pentru citirea panoului (verificarea 1) este permisă: nu pune mesaje în coadă. [V] numai `routes/citizens.ts`, `routes/reports.ts` și `routes/adminReports.ts` pun mesaje în coadă sau declanșează trimiterea; `routes/auth.ts` nu atinge coada, iar `routes/adminSurveys.ts` doar numără mesajele eșuate (rândul 284); jurnal, intervențiile 54, 76, 81

**5. Avertismentul.** O acțiune făcută din greșeală poate duce la **trimiterea imediată** a mesajului, din aplicația pornită (`kickOutbox`), sau la **următoarea rulare a cron-ului** (cel mult 2 minute). Mesajul nu poate fi oprit după acțiune. Limitarea destinatarului la adresa de test **nu este o garanție absolută**: ea depinde de trei condiții, (a) modul efectiv rămâne `allowlist`, (b) `EMAIL_ALLOWLIST` conține numai adresa de test (confirmat de proprietar la 27.10.2026) și (c) codul aplică restricția corect (`outbox.ts` 239–243, acoperit de testele automate). [V] `outbox.ts` 239–243, 328–356

**6. Substitute interzise pentru o pauză.** Nu se folosesc în locul unei pauze generale:
- `EMAIL_MODE=simulated`: mesajele procesate devin definitiv `simulated` (`outbox.ts` 234–238);
- modificarea `EMAIL_ALLOWLIST` sau a destinatarului: mesajele devin definitiv `blocked` (`outbox.ts` 239–242);
- oprirea fluxului către Primărie: afectează numai notificările către Primărie, iar repornirea lui eliberează mesajele reținute (`outbox.ts` 112–116, 180–189; `adminReports.ts` 513).

[V]

**7. Condițiile de oprire.** E3 **nu continuă** până la clarificare dacă, la oricare punct de control:
- apare cel puțin un mesaj `queued` sau `sending`, ori numerele pe tip și stare diferă de referința PC1;
- modul afișat nu este `allowlist` sau destinatarul nu este adresa de test;
- starea așteptată nu poate fi confirmată (interogarea sau panoul nu pot fi citite).

[A]

**8. Separarea de testul de e-mail.** Pregătirea și instalarea E3 nu includ nicio trimitere. Proba Brevo (§8.3) este o operație separată, cu aprobarea explicită a proprietarului. Nicio aprobare a instalării nu o autorizează. [A]

**Riscul rezidual, declarat.** Protecția depinde de respectarea interdicției de la punctul 4. Între două puncte de control, o acțiune accidentală ar putea trimite un mesaj către adresa de test, fără posibilitatea de a-l opri. Riscul nu este eliminat. Efectul este limitat la adresa de test **numai cât timp** sunt îndeplinite condițiile (a)–(c) de la punctul 5. Probabilitatea este redusă de lacăt, a cărui parolă era cunoscută, la 27.10.2026, numai de proprietar. Între două puncte de control o trimitere poate trece neobservată până la punctul următor, care doar o constată. [A]

**Intervalul STOP APP – START APP (pașii 4.3–4.7).** Cron-ul `outbox:process` rămâne activ și în acest interval, iar panoul nu poate fi citit. Dacă există un mesaj trimisibil, el poate pleca fără să fie observat până la PC3, care doar îl constată. Riscul este redus numai de condițiile verificate la PC2 (coada fără `queued` și `sending`) și de faptul că, cu aplicația oprită, nu se pot crea mesaje noi. Nu este eliminat. [A]

**Cât timp aplicația este oprită** (pașii 4.3–4.7), sarcinile cron continuă să ruleze (§0), inclusiv `outbox:process` (§4.0.1). Dacă pornirea eșuează, aplicația nu rămâne neglijată: fie se repară cauza (§4.8), fie se decide revenirea (§4.9). [V] jurnal, observația 9; [A]

### 4.8 Dacă aplicația nu pornește

| Simptomul | Unde se citește | Marcaj și sursă |
|---|---|---|
| `503` în browser | `civic-test-app/stderr.log` primește mesajele de refuz la pornire (de exemplu configurare invalidă, schemă nepotrivită, marcaje lipsă) | [V] jurnal, intervenția 32 și observația 7 |
| „Configurare invalidă; aplicația nu pornește” | mesajul numește variabilele; se corectează `civic.env` și se repornește | [V] `config.ts` 311–321 |
| „schema DB nu este la versiunea așteptată” | lipsește `civic-migrate` (pasul 4.5) | [V] `server/src/main.ts` 36–41 |
| marcajele din `BACKUP_DIR` nu pot fi scrise sau lipsesc | **oprire și decizie**: refacerea marcajului contorului (`markers:rebuild-counter --at-least N`) se face numai cu aprobare, ca la intervenția 33 | [V] `main.ts` 50–60; jurnal, intervențiile 32–33 [A] |

### 4.9 Revenirea la versiunea anterioară

Revenirea înseamnă reinstalarea pachetului versiunii anterioare, cu pașii 4.3–4.7. Este o operație [EFECT] și cere **decizia separată a proprietarului**. [A]

**Revenirea nu se execută până când nu sunt verificate toate condițiile de mai jos:**
1. pachetul anterior (pentru staging-ul actual: `civic-711a7ae.zip`) este disponibil; [E3]
2. SHA-ul commitului din pachet este cel așteptat (`RELEASE.txt`: `commit: 711a7ae`); [E3]
3. amprenta SHA-256 a pachetului corespunde celei consemnate la instalarea lui (jurnal, intervenția 99: `64776c23…7f9d5d`, consemnată prescurtat). Dacă amprenta completă nu este disponibilă, pachetul se reconstruiește dintr-o clonă curată a commitului `711a7ae`, iar noua amprentă se consemnează înaintea folosirii; [E3] [A]
4. compatibilitatea cu baza de date este reevaluată la momentul revenirii. Faptul că `5d8c52a` nu adaugă migrații este o condiție necesară, nu o garanție: între instalare și revenire pot apărea date noi sau modificări ale marcajelor din `BACKUP_DIR`, care trebuie luate în calcul. [A]

Dacă una dintre condiții nu poate fi verificată, **revenirea nu se face**; aplicația rămâne oprită până la decizia proprietarului. Restaurarea bazei din copia de la pasul 4.2 este o decizie separată (§7). [A]

Precedent: la instalarea `711a7ae`, pachetul de revenire `civic-1ee19fe.zip` era verificat, dar revenirea nu a fost necesară. [V] jurnal, intervenția 100

---

## 5. Verificările după instalare (criteriile E3)

Verificările din §5 încep numai după PC3 și se încheie cu PC4 (§4.0.1). Toate verificările din acest tabel sunt [CITIRE]: cererile `curl -sI` (antete) și `curl -s` (GET) nu modifică nimic. Excepția este 5.10, marcată separat.

| # | Verificarea | Cum | Rezultatul așteptat | Marcaj și sursă |
|---|---|---|---|---|
| 5.1 | versiunea instalată | `health` | `0.0.0+<sha>`; CI verde pentru același SHA | [E3]; planul v2.4, E3.1 |
| 5.2 | `noindex` pe pagina rădăcină, pe un fișier static și pe API | de pe calculatorul proprietarului: `curl -sI -u civic https://test.urbisactiv.ro/`, apoi `…/favicon.svg` și `…/api/v1/health` (parola cerută de `curl`, neafișată) | fiecare răspuns conține `X-Robots-Tag: noindex, nofollow` | forma comenzii: [V] jurnal, intervenția 71; rezultatul: [E3]; planul v2.4, E3.2 și E3.6 |
| 5.3 | `robots.txt` | `curl -s -u civic https://test.urbisactiv.ro/robots.txt` | exact `User-agent: *` și `Disallow: /` | [E3]; aceeași verificare există în CI (pasul „Artefactul”, P5) |
| 5.4 | LiteSpeed nu ocolește antetul aplicației | rezultatul 5.2 pentru fișierul static (`/favicon.svg`) | antetul prezent și pe fișierul static | [E3]; planul v2.4, E3.2 |
| 5.5 | ruta de diagnostic nu mai răspunde | `curl -s -u civic https://test.urbisactiv.ro/api/v1/diag/client-ip` | eroare `NOT_FOUND` (răspuns 404) | [V] testul DG-1; pe staging: [E3]; planul v2.4, E3.7 |
| 5.6 | cele 4 sarcini cron există | cPanel → Cron Jobs (numai citire) | §6 | [E3]; planul v2.4, E3.3 |
| 5.7 | prima rulare `purge:retention` după instalare | `purge.log`, citit după prima rulare de noapte | ieșirea comenzii, fără erori | [E3]; planul v2.4, E3.4 |
| 5.8 | o copie reușită după instalare | `backup.log` | `backup:db: civic-backup-…` | [E3]; planul v2.4, E3.5 |
| 5.9 | fusul orar al orelor cron | §6.2 | consemnat | [E3]; planul v2.4, E3.8 |
| 5.10 | opțional: `host-restore:recover --check` (proba de siguranță; siguranța ei este chiar obiectul probei) | numai cu aprobare separată (DEC-9) | — | [A]; planul v2.4, E3.9 |

---

## 6. Sarcinile programate (cron)

### 6.1 Sarcinile existente pe staging

| Comanda | Programul | Jurnalul | Marcaj și sursă |
|---|---|---|---|
| `backup:db` | zilnic, 03:17 | `backup.log` | [V] jurnal, intervenția 9 |
| `surveys:close-expired` | la 5 minute | `surveys-cron.log` (suprascris) | [V] jurnal, intervenția 9 |
| `purge:retention` | zilnic, 03:47 | `purge.log` | [V] jurnal, intervenția 9 |
| `outbox:process` | la 2 minute | `outbox-cron.log` (suprascris) | [V] jurnal, intervenția 13 |

Sarcinile `outbox:process` (trimite mesajele din coadă), `purge:retention` (șterge date expirate), `surveys:close-expired` și `backup:db` sunt [EFECT] și rulează automat. Ele există și funcționează deja; E3 doar le verifică prin citire (§5.6–§5.8). Oprirea sau modificarea lor este o decizie separată. [A]

`purge:pow` nu are sarcină separată: este inclus în `purge:retention` din `d53b28a`. [V] planul v2.4, E3.3; commitul `d53b28a`

**Forma liniilor:** programul Node din `nodevenv/civic-test-app/24`, artefactul `server/dist/app.js` și comanda, cu setările prin `CIVIC_ENV_FILE`. [V] jurnal, intervenția 9; `PROJECT_HANDOFF_CURRENT.md` §0.4. **Textul exact al liniilor nu este consemnat în repository.** Se citește din cPanel în E3 și se consemnează fără numele contului. [E3]

**Limitarea constatată (observația 9):** sub `nodevenv`, `CIVIC_ENV_FILE` al aplicației are prioritate față de valoarea din linia cron. Orice sarcină citește deci `civic.env`. O comandă pe altă bază sau pe alt director primește variabilele direct în linie (`DATABASE_URL='…' STORAGE_DIR=…`), nu printr-un al doilea fișier de setări. [V] jurnal, intervențiile 44–45 și observația 9; `docs/faza5/FAZA_5_1_BACKUP_RESTAURARE.md` (rândul 230)

### 6.2 Fusul orar

- Programul cron este 03:17, dar numele copiilor șterse prin rotație arată ora `00:17` UTC (de exemplu `civic-backup-20261013T001702632Z`, jurnal, intervenția 77). Asta sugerează că, la acea dată, ceasul cron al serverului era ora României de vară (UTC+3). **Este o deducție, nu o verificare.** [E3]
- După trecerea la ora de iarnă (25.10.2026), diferența față de UTC ar deveni 2 ore. Ora efectivă a copiei de noapte se verifică după numele primei copii din `backup.log` de după instalare. [E3]

---

## 7. Backup și restaurare (partea necesară instalării)

| Element | Regula | Marcaj și sursă |
|---|---|---|
| copia zilnică | `backup:db`, prin cron (§6.1) | [V] |
| copia la cerere | „Run JS script” → `civic-backup-db`, **înaintea fiecărei instalări** (pasul 4.2); [EFECT]: scrie o copie nouă și șterge copiile mai vechi de 7 zile | [V] jurnal, intervențiile 72, 77, 82, 97 |
| formatul | `civic-backup/2`: `manifest.json`, `db.jsonl.gz`, `markers.json`, `photos/` | [V] jurnal, intervențiile 35 și 83 |
| rotația | copiile mai vechi de 7 zile se șterg la rulare | [V] `server/src/db/backup.ts` (rândul 3); jurnal, intervenția 77 |
| copiile `civic-backup/1` | nu se mai pot restaura cu versiunea instalată; dispar prin rotație | [V] jurnal, observația 8 |
| restaurarea | `restore:db <copie> --check` ([CITIRE]), apoi `--confirm` ([EFECT]), într-o bază goală și un `STORAGE_DIR` gol. Procedura completă: `FAZA_5_1_BACKUP_RESTAURARE.md` §6–§8; exemplul executat: M4 (jurnal, intervențiile 41–48) | [V] |

**O restaurare pe staging nu face parte din instalare.** Se face numai la date compromise sau ca probă (DEC-9), cu aprobare separată. [A]

Criptarea copiilor și copia în afara contului de găzduire privesc producția (E4.11, DEC-23) și nu se tratează aici. [A]

---

## 8. E-mailul pe staging

### 8.1 Starea configurată

`EMAIL_MODE=allowlist`, cu adresa de test a proprietarului în `EMAIL_ALLOWLIST`. Destinatarul tehnic al fluxului de sesizări este aceeași adresă de test. Domeniul `urbisactiv.ro` este autentificat în Brevo (DKIM, DMARC). [V] jurnal, intervențiile 12, 13, 15

### 8.2 Verificări numai prin citire

**`civic-outbox-process` nu este o verificare.** Comanda procesează coada și poate trimite e-mailuri reale către adresele permise; nu se rulează în această etapă (§0). [V] `outbox.ts` 225–250

| Verificarea | Cum (numai citire) | Marcaj |
|---|---|---|
| modul e-mail **efectiv** al serverului (nu cel cerut în `civic.env`) | Admin → Sesizări → se deschide panoul „Fluxul către Primărie” și se citește rândul „Modul e-mail al serverului”: trebuie să fie „staging: numai adresele din listă”. Dacă apare „simulat: nu pleacă niciun e-mail real”, configurația SMTP are o problemă. **Nu se apasă butonul de salvare** | [V] deschiderea panoului face numai `GET /api/v1/admin/settings/registry` (`RegistrySettingsPanel.tsx` 42–51), iar serverul întoarce modul efectiv, de după verificarea configurației (`adminReports.ts` 475–477; `config.ts` 306–309); afișarea pe staging: [E3] |
| destinatarul fluxului este adresa de test | același panou, numai citire: destinatarul = adresa de test | [E3] |
| starea cozii | interogarea read-only de la pasul 4.0 | [E3] |
| sesizările de probă se depun **fără** transmitere și fără notificări | practica probelor din 13–25.10.2026; o sesizare de probă este oricum o operație [EFECT] (scrie în bază, consumă un număr TM) și cere aprobare | [V] jurnal, intervențiile 52, 58, 75, 80; [A] |

**Neconfirmat:** dacă mesajul de trecere în `simulated`, scris de server la pornire în jurnalul aplicației (`main.ts` 91–92, `app.log.error`), ajunge în `stderr.log`. Până la confirmare, sursa folosită este panoul Admin de mai sus. [E3]

### 8.3 Trimiterea de probă prin Brevo (cere aprobare separată)

**În această etapă nu se trimite niciun e-mail.** Proba se face în E3 numai după aprobarea explicită a proprietarului și **numai către adresa lui de test**. [A] Ce confirmă proba, pentru `nodemailer` 10.1.4 (actualizat în R-NPM, `5d8c52a`):

1. conexiunea STARTTLS către Brevo, cu verificarea certificatului;
2. autentificarea cu cheia SMTP existentă;
3. livrarea mesajelor: codul de autentificare, notificarea sesizării cu fotografie, actualizarea de stare;
4. sosirea în Inbox, nu în Spam;
5. proba negativă: o adresă a proprietarului **din afara** listei nu primește nimic, iar în Brevo → Transactional → Logs nu apare nicio trimitere (ca la intervenția 19).

[E3] Comportamentul cu Brevo real nu poate fi verificat în afara staging-ului. Testele automate acoperă transportul contra unui server SMTP local, cu STARTTLS (`server/test/integration/email.test.ts`), și fluxul critic cu SMTP fals (`tests/e2e/test_faza6_flux_critic.py`). [V]

---

## 9. Recuperări relevante pentru instalare

| Situația | Procedura | Marcaj |
|---|---|---|
| aplicația nu pornește după instalare | §4.8; revenirea numai în condițiile din §4.9 | [V]; [A] |
| configurație e-mail greșită | aplicația continuă în `simulated`; se observă în panoul Admin (§8.2); corectarea `civic.env` și repornirea sunt [EFECT], cu aprobare separată | [V]; [A] |
| fereastra de parolă repetată (401 + `WWW-Authenticate` adăugat de LiteSpeed) | cauza și reparația: `AMENDAMENT_ME_OPTIONAL.md`; jurnal, observația 2 | [V] |
| pierderea accesului la ultimul `super_admin` (T-N5) | **nu este acoperită de această ciornă**; este un livrabil E2 separat, condiție de intrare în E4 | [A] |

---

## 10. Informații lipsă sau neconfirmate

1. Textul exact al liniilor cron de pe staging (§6.1). [E3]
2. Fusul orar efectiv al cron-ului după 25.10.2026 (§6.2). [E3]
3. Dacă `civic.env` mai conține `DIAG_CLIENT_IP` sau conține `SEARCH_INDEXING` (§2.4, §4). [E3]
4. Disponibilitatea, SHA-ul și amprenta completă a pachetului de revenire `civic-711a7ae.zip` (§4.9); fără ele, revenirea nu se face. [E3]
5. Starea cozii de e-mail înaintea instalării (§4, pasul 4.0). [E3]
6. Dacă mesajul de trecere în `simulated` ajunge în `stderr.log` (§8.2). [E3]
7. Dacă antetul `X-Robots-Tag` ajunge și pe fișierele statice servite pe domeniul real (§5.4). [E3]
8. Comportamentul `nodemailer` 10.1.4 cu Brevo real (§8.3). [E3] [A]
9. Parola lacătului și conținutul `EMAIL_ALLOWLIST`: confirmate de proprietar la 27.10.2026 (§4.0.1), ca observații la acea dată. Liniile cron: citite din captura cPanel din 27.10.2026. Folosirea sau nu a suspendării pentru `5d8c52a`: propunerea din §4.0.1, în așteptarea aprobării. [A]
10. Procedura de recuperare a ultimului `super_admin` (T-N5), operatorul și frecvența monitorizării (DEC-16): livrabile E2 separate. [A]
11. Toate valorile de producție (§10.2 din planul v2.4): se completează după E4. [A]

---

## 11. Surse

- Cod: `server/src/config.ts`, `server/src/envFile.ts`, `server/src/main.ts`, `server/src/cli.ts`, `server/src/app.ts`, `server/src/reports/smtp.ts`, `server/src/reports/outbox.ts`, `server/src/routes/adminReports.ts`, `server/src/db/backup.ts`, `server/build.mjs`, `server/scripts/package-release.py`, `.env.example`, `.github/workflows/ci.yml`.
- Teste: `server/test/api/searchIndexing.test.ts` (SI-1…SI-9), `server/test/api/diagnostics.test.ts` (DG-1, DG-2), `server/test/integration/email.test.ts`, `tests/e2e/test_faza6_flux_critic.py`.
- Documente: `docs/faza5/STAGING_URBISACTIV_JURNAL.md` (intervențiile 1–106, observațiile 1–18), `PROJECT_HANDOFF_CURRENT.md` §0.4–§0.5, `docs/faza5/FAZA_5_1_BACKUP_RESTAURARE.md`, `docs/faza7/FAZA_7_PLAN_ACTIUNE_MVP_v2.4.md` (E2, E3, §10), `docs/faza7/FAZA_7_REGISTRU_DECIZII_ACTUALIZARI.md`, `docs/faza7/FAZA_7C_RAPORT.md`.
