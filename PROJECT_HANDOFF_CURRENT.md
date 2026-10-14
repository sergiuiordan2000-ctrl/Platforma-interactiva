# PROJECT_HANDOFF_CURRENT.md — Turnu Măgurele Civic

**Stare documentată:** finalul Etapei 6.5 (26 septembrie 2026), actualizată după **Etapa 6.6** (comisă și publicată: `83b77ad`), după **auditul general** și pentru **remedierea P0 post-audit** (vezi B, G.5 și I), după checkpoint-ul Fazei 0 (`f6809f3`), după Fazele 1–2, după deciziile Fazei 3 (`PROJECT_RULES_AND_DECISIONS.md` §11) și după **Faza 4** (designul backend-ului, checkpoint aprobat de proprietar la 28.09.2026; `PROJECT_RULES_AND_DECISIONS.md` §12, `docs/faza4/`)
**Actualizare 12.10.2026:** starea Fazei 6 este în **Secțiunea 0A**, care are prioritate față de Secțiunea 0. **Actualizare 10.10.2026:** starea curentă (Faza 5 închisă la 10.10.2026; aplicația cu server) este în **Secțiunea 0**; ea are prioritate față de secțiunile de stare mai vechi.
**Scop:** documentul principal de preluare pentru un chat nou. Înlocuiește, pentru starea curentă, secțiunile de stare din `PROJECT_HANDOFF.md`. Acela a fost scris la finalul Etapei 5 și este acum depășit la Git, securitate și pasul următor.

> **Regula de pornire pentru noul chat:** citește acest document (întâi **Secțiunea 0**), apoi `PROJECT_RULES_AND_DECISIONS.md`, `docs/faza4/FAZA_4_REGISTRU_DECIZII.md`, `ETAPA_6_STATUS_FINAL.md` și documentele din `docs/faza5/` indicate în 0.3. Apoi **verifică starea Git real** (Secțiunea 0.1; B.4 este istorică și indică un branch vechi). Nu presupune nimic din memorie. **Codul și istoricul Git sunt sursa de adevăr.** Dacă documentul și codul se contrazic, codul are dreptate, iar contradicția se raportează.

---

## 0A. FAZA 6 ÎNCHISĂ LA `32e082e` (actualizat la 14.10.2026)

> **Are prioritate față de Secțiunea 0.** Secțiunea 0 rămâne valabilă acolo unde 0A nu spune altceva.

**Git.** Branch `faza-5-backend`, ultimul commit de cod `32e082e` (K2: RA-6, JPEG fără EOI respins; CL-5, codul golit la eșecul definitiv în `live`); `main` = `d9bc2c9`, neatins. CI verde pe toate cele 6 joburi (inclusiv MariaDB 11.4) la `9a1e08b`, `f6d5f2d` și `32e082e`. **Raportul Fazei 6: `docs/faza6/FAZA_6_RAPORT.md` (cerere de checkpoint, 14.10.2026); are prioritate față de tabelul de mai jos.**

**Faza 6, pe pașii planului (`docs/faza6/FAZA_6_PLAN.md`, cu amendamentele din §0.1):**

| Pas | Stare |
|---|---|
| 1 — planul | închis |
| 2 — `TRUST_PROXY` (T1–T4) | **oprit la condiția din plan (13.10.2026):** serverul web crede `X-Forwarded-For` trimis de vizitator; furnizorul a refuzat schimbarea; **varianta B** aleasă (D-B1…D-B5, `FAZA_6_ANTIABUZ_FARA_IP.md`), instalată în `cb4cc45`; `TRUST_PROXY` rămâne nesetat |
| 3A — testul automat cap-coadă | închis |
| 3B — probele manuale M1–M3 | executate la 10–11.10.2026; raportul **acceptat de proprietar la 14.10.2026** (`docs/faza6/FAZA_6_PROBE_M1_M3_RAPORT.md`) |
| 3B — M4 (restaurarea) | **executat la 13.10.2026, criteriile îndeplinite** (jurnalul staging-ului, intervențiile 41–48): A ștearsă lipsește, B există cu fotografia, C lipsește, contorul 10; datele active identice înainte și după; a doua restaurare refuzată. Abatere: 5 rulări cron au citit baza activă, fără scriere (observația 9: `nodevenv` înlocuiește `CIVIC_ENV_FILE` din linia cron) |
| 4 — reauditul de securitate | făcut (`FAZA_6_REAUDIT_SECURITATE.md`): RA-1…RA-10, toate remediate și instalate pe staging (`32e082e`, inclusiv completările K2 la RA-6 și CL-5); RA-5 acceptată; CL-4 transferată în 7A |
| 5 — raportul Fazei 6 | `FAZA_6_RAPORT.md`, K1, K2, K3 rezolvate; **checkpoint aprobat la 14.10.2026** (varianta A): Faza 6 închisă la `32e082e`; Listele 4 și 6 trec în Faza 7; lansarea nu este aprobată (§9) |

**Ce s-a schimbat în cod la 11–12.10.2026:**
- `961fc76`: remedierea backup-ului și a numerotării TM (R1–R5), marcajul contorului pierdut (A1), linia din ieșirea backup-ului (A8), restaurarea cu marcaje lipsă sau vechi și formatul `civic-backup/2` (G1–G3);
- `6da2f68`: decizia B (marcajele absente peste o bază cu numere nu se mai creează automat);
- `f982896`: pagina temporară de diagnostic a adresei vizitatorului (`DIAG_CLIENT_IP=on`; interzisă în producție; se scoate din cod după Pasul 2).
Procedura de backup și restaurare: `docs/faza5/FAZA_5_1_BACKUP_RESTAURARE.md`, §6.

**Staging (`test.urbisactiv.ro`):** rulează **`32e082e`** din 14.10.2026, ~16:50 (completările K2: RA-6, CL-5; intervențiile 72–76; contorul: 14, TM-014 rămâne). Anterior: **`f6d5f2d`** din 14.10.2026, ~00:16 (RA-3, RA-4, RA-6, RA-7, RA-8, RA-10; intervențiile 55–59; probele K3 și AI-5, intervențiile 60–71; TM-013 ștearsă). Anterior: **`cb4cc45`** din 13.10.2026, ~19:33 (RA-1, RA-2, varianta B; jurnalul staging-ului, intervențiile 49–54: ALTCHA la cod, sesizare și vot, limitele pe IP oprite, Admin normal; contorul: 11). Anterior: **`27b1b5f`** din 12.10.2026 (jurnalul staging-ului, intervențiile 29–38): marcajele create cu `markers:rebuild-counter --at-least 7` (următorul număr: TM-008); prima copie `civic-backup/2` făcută; pagina de diagnostic folosită la 13.10.2026 și oprită (404). Copiile `civic-backup/1` de pe staging nu se mai pot restaura. Redirecționarea `http` → `https` pusă la 13.10.2026 (regulă `.htaccess`, 301, intervențiile 39–40); pentru producție se repetă la instalare. M4 executat la 13.10.2026 (contorul: 10; B = TM-009 și C = TM-010 rămân).

**Deschise, preluate în Faza 7 (lista completă: `FAZA_6_RAPORT.md`, Listele 3, 4 și 6):** planul Fazei 7, de aprobat; CL-4 (7A); A-21 (7B) și A-24 (7C); RA-6, cazul C (re-codarea fotografiilor, decizie de produs separată); jurnalul aplicației pe găzduire (R12; furnizorul a răspuns la `TRUST_PROXY` cu refuz, 13.10.2026); **urmările răspunsului din 13.10.2026** (copiile furnizorului păstrate 3 luni, peste regula de 45 de zile; jurnalul de accesări o lună, cu IP-ul lângă cereri, inclusiv la sondaje), de decis odată cu politica de confidențialitate; constatările R7–R19 rămase (curățări, jurnalul aplicației, sesiunile; R17 remediată ca RA-10; conturile șterse care reapar R18, e-mailurile retrimise după restaurare R19); confirmarea la acțiunile definitive din interfață (O3); matricea CI (joburile MySQL și Node 20 față de producția MariaDB, nedecisă).

## 0. STAREA CURENTĂ — FAZA 5 ÎNCHISĂ, URMEAZĂ FAZA 6 (actualizat la 10.10.2026)

> **Această secțiune are prioritate.** Secțiunile A.2, A.6, B, E, F, G.4 și I de mai jos descriu starea de dinaintea Fazei 5 (aplicație fără server) și rămân ca istoric. Dacă se contrazic cu Secțiunea 0, este valabilă Secțiunea 0; dacă Secțiunea 0 se contrazice cu codul, are dreptate codul.

### 0.1 Git

| Element | Valoare |
|---|---|
| Branch de lucru | **`faza-5-backend`** |
| `main` | `d9bc2c9`, **neatins, nu se modifică** |
| Ultimele commit-uri | 08.10.2026: `b0e1842` (`/me?optional=1`, reparația ferestrei de parolă), `abfee77` (Google, serverul), `71b5516` (Google: `GET /citizen/auth/google`, auditul ca la cod), `011d51b` (handoff). 09.10.2026: `11e0d20` (setarea de test `DEV_OIDC_PROVIDER_URL`, numai în dezvoltare), `0ed3cd0` (Google, interfața), `cc73327` (handoff), `93300ab` (corecțiile de după auditul pasului 3), `6ed9b13` (handoff), `576d643` (pasul 4: rândul de informare despre Google), `6151a78` (handoff), `751a2db` (pasul 5, documentație), `6cc7044` (handoff), `9e8e087` (retragerea staging-ului vechi, documentație), `516da35` (handoff), `f9dfd37` (comanda `civic-migrate` în pachet), `08f4dc3` (`prompt=select_account`; pasul 6, prima instalare și prima probă), `dc6d991`, `008cb9d`, `b46db36` (pasul 6, documentație: probele, `TRUST_PROXY`, checkpoint-ul); `bd3aeaa` (amendamentul Google închis). 10.10.2026: `e567585` (raportul final al Fazei 5); urmează commit-ul checkpoint-ului Fazei 5 (documentație) |
| CI | verde la `08f4dc3` (toate cele 6 joburi, inclusiv MariaDB 11.4 și E2E); commit-urile de după el sunt numai documentație și se verifică la începutul sesiunii următoare (`gh run list`) |
| Repo | `https://github.com/sergiuiordan2000-ctrl/Platforma-interactiva` (public; vechea adresă redirecționează) |
| Reguli | fără commit sau push fără aprobarea explicită a proprietarului; fișierele se adaugă unul câte unul, niciodată `git add .`; fără force push, fără rescrierea istoricului, fără `git stash` |

Verificarea la începutul unui chat nou:

```bash
git clone https://github.com/sergiuiordan2000-ctrl/Platforma-interactiva.git
cd Platforma-interactiva
git checkout faza-5-backend
git log --oneline -5         # primul rând: ultimul commit al branch-ului
git status --short           # nimic
git ls-remote origin refs/heads/main refs/heads/faza-5-backend   # main trebuie să fie d9bc2c9
npm ci
```

Apoi verificările din 0.8.

### 0.2 Arhitectura

- **Frontend:** React / TypeScript / Vite. **Backend:** Node.js / Fastify 5 / MySQL 8 sau **MariaDB 11.4** (producția). Workspace-uri npm: `server/` și `shared/` (scheme Zod și constante comune).
- **Toate domeniile sunt pe server:** comunicate, Ghid, Apel rapid (5.3); conturi de cetățean (cod pe e-mail) și sesizări, fără moderare (5.4); sondaje (5.6). Autentificarea Admin: parolă + TOTP pentru `super_admin` (5.2). Sesiunile sunt cookie-uri `HttpOnly`.
- **Migrații:** `0001` (30 de tabele B1) și **`0002`** (`citizen_oauth_attempts`, amendamentul Google). Aplicația nu pornește dacă schema nu este la ultima versiune (`migrate`).
- **În browser nu rămân date:** singura cheie din `localStorage` este indiciul „Ai participat deja” (`tmc_survey_participation_hint`).
- **E-mail:** Brevo SMTP, pornit pe staging-ul nou în modul `allowlist` (5.5b, 08.10.2026).
- **Google (amendament):** serverul (`POST /citizen/auth/google/start`, `GET …/callback`, `GET /citizen/auth/google`) și **interfața** (butonul „Continuă cu Google” pe „Contul meu”, mesajele la întoarcere) sunt gata; fără `GOOGLE_OAUTH_CLIENT_ID` / `_SECRET`, rutele răspund 404, iar ecranul rămâne cel de dinainte. Serverul cere de fiecare dată ecranul „Alege un cont” (`prompt=select_account`, decizia proprietarului din 09.10.2026). **Instalat pe staging la 09.10.2026 și probat cu Google real** (§16).
- **Setarea de test `DEV_OIDC_PROVIDER_URL`** (furnizorul de identitate fals al testelor E2E): acceptată numai cu `APP_ENV=development`, numai pentru o adresă locală și numai dacă și `PUBLIC_BASE_URL` este local; pe staging și în producție aplicația refuză să pornească dacă există. **Nu se scrie niciodată în `civic.env`.**
- **Adresa de autorizare este validată strict în interfață** (`shared/src/googleAuthUrl.ts`): numai `https://accounts.google.com/o/oauth2/v2/auth` sau, numai când aplicația este deschisă de pe calculatorul local, furnizorul fals local. Dacă serverul schimbă adresa sau parametrii trimiși la Google, se actualizează și această regulă (un test leagă cele două).

### 0.3 Stadiul Fazei 5

| Fază | Stare | Document |
|---|---|---|
| 5.1 infrastructură, staging, backup | închisă, checkpoint aprobat | `docs/faza5/FAZA_5_1_RAPORT.md` |
| 5.2 autentificare și autorizare pe server | închisă, checkpoint aprobat | `FAZA_5_2_RAPORT.md` |
| 5.3 conținutul public pe API | închisă, checkpoint aprobat | `FAZA_5_3_RAPORT.md` |
| 5.4 sesizări | închisă; răspunsul ChatGPT la raport nu a fost consemnat | `FAZA_5_4_RAPORT.md` |
| 5.5a e-mail (codul) | gata | `FAZA_5_5_PLAN.md` |
| 5.5b e-mail real (Brevo) | **probă reușită la 08.10.2026** pe `test.urbisactiv.ro`: cod în Inbox; flux către Primărie cu fotografia; notificarea autorului; **proba negativă a listei reușită** (jurnal 19). Raportul trebuie trimis la audit | `FAZA_5_5_RAPORT.md`; `STAGING_URBISACTIV_JURNAL.md` |
| 5.6 sondaje | închisă; rezultatul relatat de proprietar: „e ok” | `FAZA_5_6_RAPORT.md` |
| 5.7 curățarea cheilor vechi din `localStorage` | închisă, pe staging | `FAZA_5_7_RAPORT.md` |
| Amendament: numele „Urbis Activ”, `urbisactiv.ro`, ClausWeb, MariaDB 11.4 | decis 07.10.2026; cod + CI pe MariaDB; staging nou instalat | `AMENDAMENT_MARIADB_SI_GAZDUIRE.md` |
| Amendament: `/me?optional=1` (fereastra de parolă repetată pe staging) | decis, implementat, **instalat și confirmat** 08.10.2026 | `AMENDAMENT_ME_OPTIONAL.md` |
| **Amendament: autentificarea cetățeanului cu Google** | **versiunea finală aprobată la checkpoint (08.10.2026)**; **pasul 2 (serverul) făcut**: `abfee77`, `71b5516`; **pasul 3 (interfața) făcut la 09.10.2026**: `11e0d20`, `0ed3cd0`; **auditat de ChatGPT la 09.10.2026**: trei cerințe, rezolvate în `93300ab` (§13.7) și aprobate tehnic de proprietar. **Aprobarea nu este validarea finală: aceasta rămâne proba pe staging, cu Google real (pasul 6, §13.7.6).** Re-auditul corecțiilor: la alegerea proprietarului. **Pasul 4 făcut la 09.10.2026** (`576d643`): rând de informare sub butonul Google, varianta scurtă; textul bifei și versiunea politicii neschimbate (§14). **Pasul 5 făcut la 09.10.2026** (§15): aplicația este înregistrată la Google, într-un cont Google dedicat; starea „Testing”; cheile sunt la proprietar. **Pasul 6 făcut și amendamentul ÎNCHIS la 09.10.2026 (§16; decizia proprietarului, §16.7):** cheile sunt în `civic.env` pe staging; instalat `f9dfd37` (cu `civic-migrate`, schema 2), apoi `08f4dc3`; **proba cu Google real reușită** (autentificare, sesiune după reîncărcare, același cont ca la cod, ecranul „Alege un cont”, „Înapoi” de pe ecranul Google, refuzul unui cont din afara `EMAIL_ALLOWLIST`). Renunțarea („Anulează”) nu a fost probată cu Google real (decizia proprietarului; acoperită de testele automate). Autentificarea de pe un telefon real și aspectul butonului: în regulă. `TRUST_PROXY`: verificat, cu constatare (§16.5). **Probele pasului 6 sunt încheiate**; materialul de audit a fost trimis la ChatGPT; concluzia transmisă de proprietar: pasul 6 poate fi propus pentru închidere, cu excepția testului real „Anulează” consemnată transparent (§16.6, §16.7) | `AMENDAMENT_AUTENTIFICARE_GOOGLE_PLAN.md` (§8 A–D, §9, §11, §12, §13, §14, §15, §16) |
| **Raportul final al Fazei 5 și checkpoint-ul** | **Faza 5 ÎNCHISĂ de proprietar la 10.10.2026**, cu limitele și problemele deschise din raport; subfazele nu se redeschid pentru repetarea verificărilor | `FAZA_5_RAPORT_FINAL.md` (§11: decizia) |

Deciziile proprietarului din Faza 5 sunt rezumate în `PROJECT_RULES_AND_DECISIONS.md` §13 (§13.1 deciziile, §13.2 cele deschise).

### 0.4 Staging

**Staging-ul nou, `test.urbisactiv.ro`** (ClausWeb, Node 24.21.0, MariaDB 11.4.13), jurnal `docs/faza5/STAGING_URBISACTIV_JURNAL.md` (intervențiile 1–28):
- rulează **`08f4dc3`** (intervenția 26; `health` relatat de proprietar), cu **schema la versiunea 2** (migrația 0002, intervenția 24) și cu cheile Google în `civic.env` (intervenția 23). Ultimul backup dinaintea migrării: `civic-backup-20261009T171424982Z`. Întoarcerea la un cod mai vechi de `f9dfd37` nu este posibilă pe aceeași bază (codul vechi nu pornește cu schema 2); oprirea Google se face scoțând cele două chei din `civic.env` și repornind;
- lacăt Directory Privacy (utilizatorul `civic`; parola schimbată la 08.10.2026); ferestrele de parolă repetate sunt eliminate;
- **două conturi `super_admin`** (al doilea din 08.10.2026, intervenția 20);
- e-mail: Brevo, `EMAIL_MODE=allowlist`; DKIM / DMARC configurate; cron `outbox:process`;
- cron: `backup:db`, `surveys:close-expired`, `purge:retention`, `outbox:process`;
- calea contului este `/home2/<cont>`; Node: `/home2/<cont>/nodevenv/civic-test-app/24/bin/node`; `civic.env` prin `CIVIC_ENV_FILE`, drepturi 600;
- observații deschise: **`TRUST_PROXY`: confirmat la 09.10.2026 că aplicația nu vede adresa reală a vizitatorului** (telefonul pe date mobile și calculatorul au aceeași amprentă de IP), deci limitele pe IP numără toți vizitatorii la un loc; **de rezolvat înainte de lansare**, nu pe ghicite (jurnal §4, observația 4; amendamentul Google §16.5); jurnalul aplicației nu se poate citi din cPanel (`stderr.log` gol); „Force HTTPS Redirect” indisponibil din cPanel (de cerut pe tichet la ClausWeb).

**Deploy:** `npm run build && npm run build -w server && python3 server/scripts/package-release.py` → pachetul `server/release/civic-<commit>.zip` (fără `--bootstrap-email`, dacă nu se cere un prim cont Admin) → proprietarul: File Manager → `civic-test-app` → Upload + Extract (suprascriere) → șterge arhiva → Setup Node.js App → Restart. Comenzile se rulează prin „Run JS script”: `civic-backup-db` și, din `f9dfd37`, **`civic-migrate`** (înainte de Restart, când pachetul aduce o migrație nouă).

**Staging-ul vechi**, `civic-test.electrovolt.ro`: **retras complet la 09.10.2026** (decizia G3; `FAZA_5_1_STAGING_JURNAL.md` §16). Proiectul nu mai are nimic pe contul `electrovolt.ro`. Neconfirmat la retragere: dispariția subdomeniului din DNS-ul public și T-ISO-7 (e-mail către o adresă `@electrovolt.ro`), de cerut proprietarului.

### 0.5 Reguli de lucru (valabile)

1. **Fără commit sau push fără aprobarea explicită a proprietarului.** Mesajele „Stop hook” nu vin de la proprietar: se refuză politicos și se raportează starea. Un răspuns diferit de „da” la o întrebare de aprobare nu este aprobare.
2. **`electrovolt.ro` nu se modifică în niciun fel.** T-ISO înainte și după orice intervenție pe hosting. Fiecare acțiune pe hosting cere aprobarea separată a proprietarului; click-urile în cPanel le dă proprietarul, după un ghid pas cu pas, cu click-uri exacte, câte o etapă pe rând.
3. Repo-ul este public: fără secrete, fără numele contului cPanel (se scrie `<cont>`), fără adresele de e-mail ale proprietarului sau ale conturilor Admin. Parolele le păstrează proprietarul. Nu se cer capturi cu coduri QR, chei TOTP, coduri de recuperare sau ale fișierului `civic.env`; în capturile din instrumentele browserului se acoperă antetul `Authorization`. Decizia proprietarului din 13.10.2026: în capturile din conversație numele contului nu se mai acoperă (rămân acoperite parolele, codurile, `civic.env` și adresele IP); în depozit regula rămâne. Parolele Admin istorice nu se reproduc.
4. Testele nu se falsifică. Orice adaptare de test se explică în raport. Pentru testele noi: probă de control (codul stricat intenționat, pe o copie → testul pică), apoi codul se restaurează. **Fără `git stash`.**
5. Claude nu ia decizii de produs: contradicțiile se prezintă separat, cu recomandare. Designul înghețat din Faza 4 se modifică numai prin decizia proprietarului, consemnată ca amendament. APK-ul nu se distribuie.
6. **Sesizările se publică direct, fără moderare.**
7. Comunicarea: în limba română; întrebările direct, câte una, cu variante (fereastra de întrebări, când se poate); rapoarte concise; **pași mici**; când proprietarul cere „extrem de scurt”, răspunsuri foarte scurte. Proprietarul este începător. ChatGPT auditează numai la checkpoint-uri.
8. Dacă proprietarul cere doar o părere, Claude nu caută pe internet și nu deschide site-uri. Nu caută domenii fără să i se ceară.

### 0.6 Ce urmează

1. ~~Amendamentul Google, pasul 3 (interfața)~~: **făcut și auditat la 09.10.2026** (`AMENDAMENT_AUTENTIFICARE_GOOGLE_PLAN.md` §13; corecțiile de după audit: §13.7). Documentul trimis la audit (`AUDIT_GOOGLE_PAS_3.md`) este document de lucru al proprietarului, nu este în repository.
2. ~~Pasul 4~~: **făcut la 09.10.2026** (§14): rând de informare sub butonul Google; `CITIZEN_POLICY_VERSION` neschimbată (`2026-10`). Deschis: documentul complet al politicii și informarea privind datele personale (2.9, E-6), cu paragraful despre Google, inclusiv ce află Google (§5); verificarea juridică este nedecisă.
3. ~~Pasul 5~~: **făcut la 09.10.2026** (§15). Pentru lansare rămân (§15.4): pagina de confidențialitate, pagina principală și termenii (cerute de Google înainte de „In production”), verificarea mărcii, un client separat pentru producție.
4. ~~Pasul 6~~: **făcut; amendamentul Google este închis la 09.10.2026** (§16). Făcut la 09.10.2026: planul aprobat; `civic-migrate` în pachet (`f9dfd37`); backup, chei, instalare, migrare; proba reală reușită; decizia „mereu «Alege un cont»” (`08f4dc3`), instalată și probată (A, B, C, D).
5. **Se reia de aici: Faza 6** (integrare și checkpoint MVP; Planul v1.1, citit cu `docs/AMENDAMENTE_PLAN_V1_1_SI_MASTER_PLAN.md`). Faza 5 este închisă (10.10.2026). Propunerea de pași pentru Faza 6 a fost prezentată proprietarului la 10.10.2026; **se așteaptă decizia lui** înainte de orice lucru. Reguli de la checkpoint: fără modificări funcționale noi, de contracte API sau de design fără decizie explicită; `TRUST_PROXY` este blocant pentru reauditul de securitate și pentru lansare și nu se activează fără verificarea configurației reale și fără teste pe staging (`FAZA_5_RAPORT_FINAL.md` §11). La ClausWeb este deschis din 09.10.2026 un tichet cu trei întrebări (`TRUST_PROXY`, „Force HTTPS”, jurnalul aplicației); la 10.10.2026 dimineața nu venise răspunsul. **Staging-ul rulează `08f4dc3`; commit-urile de după el sunt numai documentație, deci nu lipsește nimic de pe staging** (verificat la 10.10.2026).
6. Separat: **`TRUST_PROXY` înainte de lansare** (constatarea din §16.5: întâi se află cum trimite LiteSpeed cererile către aplicație, eventual cu ajutorul furnizorului); „Force HTTPS” cerut pe tichet; adaptarea `FAZA_5_5B_GHID.md` la găzduirea nouă; restaurarea unui backup pe o bază de date separată, pe găzduire. După Faza 6: Etapa 7A–7F (Planul de Lucru Comun v1.1 nu este în repository).
7. Proprietarul are de trimis la ChatGPT: `FAZA_5_5_RAPORT.md`, `AMENDAMENT_MARIADB_SI_GAZDUIRE.md`, `AMENDAMENT_ME_OPTIONAL.md` (dacă nu le-a trimis).

### 0.7 Deschise

- Redenumirea în „Urbis Activ” în interfață și în repository; suita Python (E2E) pe MariaDB: nedecise (RULES §13.2).
- **Decizie de produs / juridică:** sesizările despre vecini apar public, cu descriere și loc (raport 5.4, §6). G-5: verificarea juridică a textului despre Google.
- **Interfață:** respingerile de vot și contoarele din tabloul de bord nu au ecran în Admin. Un mesaj general (`notice`, de exemplu „Contul a fost șters…”) apare de două ori pe ecranul „Contul meu” (observație din 09.10.2026, nereparată). Butonul Google folosește fontul dispozitivului, nu „Google Sans” (§13.4).
- **Securitate:** pe staging, codurile TOTP ale celor două conturi `super_admin` sunt pe același telefon (recomandare: unul pe alt dispozitiv; codurile de recuperare păstrate separat). Pasul B al cheii `TOTP_ENC_KEY` a rămas fără obiect odată cu retragerea staging-ului vechi.
- Fișierul `cli.log` a rămas în `civic-test-data` pe staging-ul nou (fără secrete).

### 0.8 Mediul local și verificările obligatorii înainte de commit

- MySQL poate lipsi într-un container nou: `apt-get update && apt-get install -y mysql-server`; bazele `civic_dev` și `civic_test`; utilizatorul `civic` (pe `127.0.0.1` și `localhost`), cu parola locală de test din CI (`.github/workflows/ci.yml`: `CIVIC_TEST_DATABASE_URL`). **La fiecare repornire a containerului: `service mysql start`** (altfel testele de integrare dau `ECONNREFUSED`). Dacă pornirea eșuează cu „Another process … is using unix socket file”, se șterg `mysqld.sock*` și `mysqlx.sock*` din `/var/run/mysqld/` și se pornește din nou.
- Verificări (valorile de referință la 09.10.2026):
  - `npm run lint` și `npm run typecheck -w server`
  - `(cd server && CIVIC_TEST_DATABASE_URL=… node test/run.mjs all)`: **289/289** (MySQL 8.0 local, rulat din nou la 10.10.2026; MariaDB 11.4 în CI)
  - `npm run build` și `git diff --check`
  - `CIVIC_TEST_DATABASE_URL=… python3 tests/run_all.py`: **150/150** local (09.10.2026 și 10.10.2026; durează circa 8 minute, deci se rulează în fundal); în CI, jobul E2E este verde la `08f4dc3`
- Jurnalele joburilor CI nu se pot descărca din mediul lui Claude (adresa de stocare este blocată); starea se citește cu `gh run view`.
- Probele de control se fac pe o copie a proiectului (`cp -a`, fără `.git`); `rsync` nu este instalat în container. Testele din copie folosesc aceeași bază de test și aceleași porturi, deci nu se rulează în paralel cu testele din proiect.
- Pachetul de staging: se verifică în pachet că `RELEASE.txt` și `server/dist/app.js` arată commit-ul corect (scriptul refuză un build vechi).
---

## A. IDENTITATEA PROIECTULUI

### A.1 Nume și scop
- **Nume:** Turnu Măgurele Civic. Titlul din `index.html` este cel corect; `package.json` are încă numele generic `react-example`, moștenit din boilerplate-ul AI Studio.
- **Scop:** platformă civică digitală **independentă** (nu oficială, nu operată de Primărie) pentru municipiul Turnu Măgurele:
  - comunicate și evenimente locale;
  - sesizări cetățenești cu fotografie și localizare, afișate pe hartă (în versiunea actuală, după moderare; în designul Faza 4, imediat, fără moderare, cu cont de cetățean);
  - consultări publice (sondaje);
  - Ghidul Primăriei și numerele utile (Apel rapid / Quick Dial).

### A.2 Arhitectura actuală (până la Faza 5)
- SPA React, **100% client-side**, un singur bundle.
- Rutare **hash**, manuală (`window.location.hash` în `src/App.tsx`), fără bibliotecă de rutare.
- Servicii singleton pe domenii (`src/services/*.ts`), cu persistență în **`localStorage` / `sessionStorage`** din browserul curent.
- **Nu există backend real.** Nu există server, API, bază de date centralizată, autentificare pe server sau trimitere reală de e-mail.
  - Dependențele `express`, `@google/genai` și `dotenv` din `package.json` sunt reziduuri nefolosite ale boilerplate-ului.
- **Direcția decisă: D1 = B**, pilot real cu backend. Trecerea se face numai prin Fazele 4 (proiectare) și 5 (implementare incrementală) ale Planului de Lucru Comun v1.1.
- **Stack backend decis (N-2, Faza 3, 27.09.2026):** Node.js + TypeScript + Fastify 5 + Drizzle + Zod + MySQL (8.4 LTS; 8.0 numai pe staging-ul temporar), în același repository (`server/` + `shared/`); staging temporar pe HostGate Basic Plus numai cu date demo, izolat de `electrovolt.ro`. Detalii și condiții: `PROJECT_RULES_AND_DECISIONS.md` §11. **Nimic nu este încă implementat.**
- **Designul backend-ului (Faza 4) este complet și înghețat** (28.09.2026): modelul de date (30 de tabele), API-ul, autentificarea și autorizarea, sesizările, e-mailul, anti-abuzul, datele personale și testarea, în `docs/faza4/`; deciziile, în `docs/faza4/FAZA_4_REGISTRU_DECIZII.md`. Schema și contractele API se modifică numai printr-o decizie nouă, explicită. Modificările față de Planul v1.1 și Master Plan: `docs/AMENDAMENTE_PLAN_V1_1_SI_MASTER_PLAN.md`.
- Conexiuni reale la rețea: tile-urile hărții OpenStreetMap și imaginile demo ale comunicatelor, încărcate de pe Unsplash (m16).
- E-mailul este **simulat** (`emailService`, stare `simulated`, niciodată `sent`).

### A.3 Stack tehnic
| Element | Versiune / detaliu |
|---|---|
| React | 19 |
| TypeScript | `tsc --noEmit` (`npm run lint` rulează doar verificarea de tipuri, nu ESLint) |
| Vite | 8.x (`npm run dev`, `build`, `preview`) |
| Tailwind CSS | 4 (`@tailwindcss/vite`) |
| Hartă | Leaflet 1.9 (integrare manuală, fără `react-leaflet`) |
| Iconițe | `lucide-react` |
| Teste | Python + Playwright în `tests/` (D12 = A, comis în `f6809f3`); rulare: `python3 tests/run_all.py`; referință: 102/103, singurul FAIL cunoscut fiind `R6D-SES-01` (P7) |

### A.4 Roluri
| Rol | Cine | Acces |
|---|---|---|
| Public (neautentificat) | cetățeni | zona publică; operații publice: `submitReport`, `submitVote` |
| `primarie_operator` | personal Primărie | 13 din 24 de permisiuni: dashboard, sesizări (toate), comunicate (toate); Ghid, Apel rapid și Sondaje **doar vizualizare** |
| `super_admin` | administrator | toate cele 24 de permisiuni |

Matricea completă se află în `src/services/permissionService.ts` (`ROLE_PERMISSIONS`), neschimbată din Etapa 5D. **Nu există permisiune de ștergere a sesizărilor.** (Starea codului actual. În designul Faza 4: `reports.moderate` dispare, apar 3 permisiuni noi pentru `super_admin`, conturile de cetățeni și drepturile exclusive ale `super_admin`, inclusiv ștergerea sesizărilor; vezi RULES §12.)

### A.5 Structura Public / Admin
- **Public:**
  - `#home` (Acasă);
  - `#comunicate` (Comunicate & Evenimente);
  - `#sesizari` (formular de sesizare + confirmare; **fără listă publică**, din 6.5);
  - `#harta` (sesizările aprobate cu coordonate valide, fără datele autorului, cu model redus `PublicMapReport`; din 6.6 și cele cu valoarea istorică `private`);
  - `#sondaje`;
  - `#ghid` (Ghidul Primăriei + Apel rapid).
- **Admin (`#admin`):** din P0 post-audit (D11 = B) zona publică nu mai conține linkuri către Admin; ruta se accesează direct.
  - formular de autentificare, fără login DEMO din 6.4;
  - shell separat cu taburile Dashboard, Comunicate, Moderare Sesizări, Ghidul Primăriei (+ Apel rapid) și Sondaje, fiecare filtrat după permisiuni.

### A.6 Chei `localStorage` (NU se schimbă înainte de Faza 5; atunci numai prin migrarea proiectată în Faza 4, B1)
`turnu_civic_admin_session` (și în `sessionStorage`), `turnu_civic_announcements`, `turnu_civic_reports_store`, `turnu_civic_reports_counter`, `turnu_civic_email_log_store`, `turnu_civic_city_hall_directory`, `turnu_civic_quickdial_contacts`, `turnu_civic_quickdial_categories`, `turnu_civic_surveys_store`, `turnu_civic_survey_submissions_store`, `turnu_civic_user_participated_surveys`.

---

## B. STAREA GIT EXACTĂ

### B.1 Referința
| Element | Valoare |
|---|---|
| Repository GitHub | `https://github.com/sergiuiordan2000-ctrl/Platforma-interactiva` |
| Branch de lucru | `recovery-etapa-5-0e2cc20` |
| Ultimul commit publicat înaintea acestei actualizări | `5f88750`: `docs(faza-4): corecturi dupa auditul final (#12, #13, #14)` (închiderea Fazei 4); actualizarea documentelor generale urmează într-un commit de documentație (se verifică cu `git log`, B.4) |
| Checkpoint-ul Fazei 4 | `5f88750` (designul înghețat, aprobat de proprietar la 28.09.2026) |
| Branch pentru Faza 5 | **nou, dedicat**, creat din checkpoint-ul Fazei 4 la pornirea Fazei 5 (A04-7); numele nu este încă stabilit |
| Checkpoint-ul Fazei 0 | `f6809f35be0c7a71f9430535fa68c006028b4ed6`: `fix(civic): apply post-audit P0 remediation and add test suites` (P0 + `tests/`); părinte `83b77ad` (Etapa 6.6) |
| Închiderea Fazei 2 (ultimul commit de cod) | `ff53758` |
| Branch-ul pe GitHub | identic cu HEAD-ul local (verificat 28.09.2026) |
| `main` pe GitHub | `d9bc2c9f53cec27dafc846889b0457eea8495d20`, **NEATINS, nu se modifică** |
| Working tree | curat |
| Ultimul commit de cod — istoric (starea 6.5) | `d89fd1ceba903faed2940d7d59b79fdbaac98d89`: `Etapele 6.4-6.5: securizare autentificare si autorizare` |
| Commit de documentație peste el — istoric (starea 6.5) | `docs: finalize project handoff after stage 6.5` (adaugă doar acest document, `PROJECT_RULES_AND_DECISIONS.md` și `ETAPA_6_STATUS_FINAL.md`; fără cod). |

### B.2 Istoricul commit-urilor branch-ului (cronologic)
| Commit | Mesaj | Conținut |
|---|---|---|
| `672bbea` | chore: initial project state after 5A.1 | starea inițială (Etapele 1–4 + 5A.1), importată dintr-o singură bucată |
| `0e2cc20` | checkpoint: Etapele 5B-5G finalizate | Etapa 5 (5B–5G) |
| `2198ebe` | Etapa 5D: diferentiere super_admin / primarie_operator | rolul `primarie_operator` real |
| `fff9507` | docs: add Stage 5 handoff and final audit | `PROJECT_HANDOFF.md`, `RAPORT_AUDIT_FINAL_ETAPA_5.md` |
| `3b8d6ca` | Etapa 6.1: eliminare stergere sesizari | **6.1** |
| `a9f47fe` | docs: add Stage 6 audit and 6.1 report | `RAPORT_AUDIT_ETAPA_6.md`, `RAPORT_ETAPA_6_1.md` |
| `441afb9` | Etapa 6.2: tratare esec salvare sesizare | **6.2** |
| `3c8d952` | Etapa 6.3: securizare XSS harta publica | **6.3** |
| `d89fd1c` | Etapele 6.4-6.5: securizare autentificare si autorizare | **6.4 + 6.5** (13 fișiere); ultimul commit de cod |
| `bb91814` | docs: finalize project handoff after stage 6.5 | cele 3 documente de handoff; fără cod |
| `499ce12` | docs: record N1-N4 and P7 from stage 6.5 report | completarea documentației N1–N4 / P7; fără cod |
| `83b77ad` | feat(civic): finalize report takeover and assumption | **Etapa 6.6**: asumare / preluare (M7), sesizările `private` pe hartă, N1 închis, documentația vie; publicat pe GitHub |
| `f6809f3` | fix(civic): apply post-audit P0 remediation and add test suites | **P0** + `tests/`; checkpoint Faza 0 |
| `a7c7a0e` | docs: close phase 1 decisions and rules | închiderea Fazei 1 |
| `9b08f66` | fix(civic): A-10 align map category colors with real category IDs | Faza 2, A-10 |
| `62e6577` | fix(civic): A-11 correct demo report TM-003 category | Faza 2, A-11 |
| `87f282a` | fix(civic): A-13 block report submit while photos are processing | Faza 2, A-13 |
| `44dbbc1` | fix(civic): add error boundary around page content | Faza 2, Error Boundary |
| `e62b4ea` | fix(civic): A-22 remove unused esbuild devDependency to fix npm peer conflict | Faza 2, A-22 |
| `ff53758` | fix(civic): A-25 replace AI Studio README, metadata capability and package name | Faza 2, A-25; închiderea Fazei 2 |
| `af60778` | docs: reference work plan v1.1, Node version and npm ci after phase 2 | trecerea documentară după Faza 2 |
| `cb9f47e` | docs: record phase 3 backend decision gate (N-2, N-3, D6, D8, D3/D4, N-4, D10, D9, A-17) | închiderea Fazei 3 |
| `3c586d0` | docs(faza-4): checkpoint revizia 3 dupa SET-A-02 | Faza 4, Revizia 3 |
| `8d87e94` | docs(faza-4): integrate decisions after revizia 3 | Faza 4, Revizia 4 |
| `ddc9ef8` | docs(faza-4): integrate consolidated decisions | Faza 4, Revizia 5 |
| `988d0a1` | docs(faza-4): integrate final retention decisions | Faza 4, Revizia 6 |
| `1198e65` | docs(faza-4): revizia 7 - versiune curata si decizii directe | Faza 4, Revizia 7 (versiune curată, registrul deciziilor) |
| `5f88750` | docs(faza-4): corecturi dupa auditul final (#12, #13, #14) | închiderea Fazei 4 (checkpoint) |

### B.3 Continuitatea Etapei 6
- Etapa 6.1: commit `3b8d6ca`
- Etapa 6.2: commit `441afb9`
- Etapa 6.3: commit `3c8d952`
- Etapele 6.4 + 6.5: commit `d89fd1c`

### B.4 Verificarea obligatorie la începutul noului chat
```bash
git clone https://github.com/sergiuiordan2000-ctrl/Platforma-interactiva.git
cd Platforma-interactiva
git checkout recovery-etapa-5-0e2cc20
git log --oneline -10        # primul rând: ultimul commit al branch-ului (commit-ul acestei actualizări sau unul ulterior de documentație)
git status --short           # nimic
git ls-remote origin refs/heads/main refs/heads/recovery-etapa-5-0e2cc20
npm ci
npx tsc --noEmit && npm run build
```
Notă tehnică: copia de lucru din sesiunea anterioară avea `origin` setat pe un bundle local de recuperare, iar push-ul se făcea direct către URL-ul GitHub. O clonă nouă de pe GitHub nu are această particularitate.

---

## C. ISTORICUL PROIECTULUI (rezumat cronologic)

Detaliile complete se află în rapoartele `RAPORT_AUDIT_ETAPA_*.md` din rădăcina repository-ului. Etapele 1–4 nu au commit-uri proprii: sunt incluse integral în `672bbea`.

| Etapă | Scop | Ce s-a implementat | Ce a rămas | Commit |
|---|---|---|---|---|
| 1B | Modulul Comunicate & Evenimente | listare, filtrare, detaliu comunicat | — | în `672bbea` |
| 1C | Unificarea evenimentelor în fluxul de comunicate | evenimente integrate, sortare după data desfășurării | — | în `672bbea` |
| 2A | Ghidul Primăriei | date instituționale, direcții, servicii, program, link-uri | — | în `672bbea` |
| 2B | Numere utile & Apel rapid | contacte și categorii | — | în `672bbea` |
| 2C | Panou de administrare (CMS) + autentificare client-side | shell Admin, login cu credențiale hardcodate, persistență Admin → Public | autentificarea a rămas client-side (vezi F) | în `672bbea` |
| 3A | Formularul de sesizare și serviciul decuplat | model `CivicReport`, categorii, validare | — | în `672bbea` |
| 3B | Identificatorul `TM-XXX` | contor secvențial, **niciodată refolosit**; a lăsat artefactul de test „Șterge (Test 6)” | artefactul eliminat abia în 6.1 | în `672bbea` |
| 3C | Compresia fotografiilor în browser | `imageCompressionService` | — | în `672bbea` |
| 3D | Harta sesizărilor (Leaflet) | `MapView`, markeri, popup | XSS, reparat în 6.3 | în `672bbea` |
| 3E | Moderare + regula de publicare | `private` / `public` / `public_anonymous` (implicit `private`), publicare doar după aprobare | regula „`private` → nu apare pe hartă” a fost **eliminată în 6.6** (opțiunea scoasă din formular, `private` = valoare istorică fără efect) | în `672bbea` |
| 4A–4E | Sondaje | structură, administrare, vot, statistici, prevenirea votului multiplu (marker local) | markerul anti-duplicare este doar local | în `672bbea` |
| 5A | Dashboard Admin + shell separat | — | — | în `672bbea` |
| 5B–5G (etichete istorice; vezi RULES §9) | Comunicate CRUD, moderare/soluționare (axe independente), roluri, e-mail simulat, sursă unică de permisiuni, izolarea rolurilor | vezi `RAPORT_AUDIT_FINAL_ETAPA_5.md` | auditul Etapei 5 a dat verdict **FAIL transversal** din cauza ștergerii publice (reparat în 6.1) | `0e2cc20` |
| 5D | Diferențierea `super_admin` / `primarie_operator` | matricea de 24 de permisiuni (13 pentru operator), gărzi în UI și în handlere | — | `2198ebe` |
| 6 (6A–6E) | Audit: testare funcțională, responsive, erori, securitate, performanță | 85 de verificări: 70 PASS, 12 FAIL, 3 PARTIAL | problemele C1–C4, M1–M7, m1–m17 (vezi G) | raport în `a9f47fe` |
| 6.1–6.5 | Remedieri | vezi Secțiunea D | vezi G | `3b8d6ca` … `d89fd1c` |

---

## D. ETAPA 6: SITUAȚIA COMPLETĂ

Sursa constatărilor inițiale: `RAPORT_AUDIT_ETAPA_6.md`. Problemele critice identificate acolo erau:
- **C1:** pierderea tăcută a sesizărilor la depășirea cotei de stocare;
- **C2:** ștergerea publică a sesizărilor;
- **C3:** XSS stocat în harta publică;
- **C4:** login public 1-click ca `super_admin`.

### 6.1: Eliminarea ștergerii sesizărilor (C2 / S1), commit `3b8d6ca`
- Am eliminat butonul public „Șterge (Test 6)” și handler-ul lui din `IssuesView.tsx`.
- Am eliminat **complet metoda `reportService.deleteReport()`**. Nu mai există nicio cale de ștergere a sesizărilor pentru niciun rol.
- Regula 3B se păstrează: contorul `TM-XXX` nu scade niciodată.
- Raport: `RAPORT_ETAPA_6_1.md` (în repository).

### 6.2: Tratarea eșecului de salvare (C1), commit `441afb9`
- **Salvare tranzacțională** în `reportService.submitReport()`:
  1. sesizarea se scrie întâi în stocare, pe o listă candidat;
  2. **doar după o scriere reușită** se actualizează lista din memorie, contorul TM și „ultima sesizare” și se declanșează e-mailul simulat;
  3. la eșec nu se modifică nimic.
- **`QuotaExceededError`** și alte erori de stocare sunt detectate și întoarse explicit (`SubmitReportResult`), nu doar logate în consolă.
- **Fără confirmare falsă:** `ReportForm` afișează confirmarea și numărul TM doar dacă salvarea a reușit. Altfel afișează un mesaj clar (`role="alert"`), care menționează fotografiile dacă ele ocupă spațiul.
- **Formularul este păstrat** la eșec: textul, adresa și fotografiile rămân.
- **Reconcilierea contorului TM:** la inițializare, contorul efectiv este maximul dintre valoarea salvată și cel mai mare `TM-XXX` existent. Contorul avansează doar după salvarea sesizării. **Nu apar numere duplicate** nici dacă eșuează doar scrierea contorului.

### 6.3: Securizarea XSS în harta publică (C3 / S2), commit `3c8d952`
- **`escapeHtml`** în `src/views/MapView.tsx` escapează `& < > " '`.
- Toate valorile din sesizare (număr, categorie, descriere, adresă, dată) sunt escapate o singură dată și doar variabilele escapate intră în șabloane.
- **Markerele** (`L.divIcon({ html })`) și **popup-urile** (`bindPopup`) sunt protejate. **Atributele** sunt protejate prin escaparea ghilimelelor.
- **Sursa imaginilor** este acceptată doar prin `getSafeImageSrc`: `data:image/(jpeg|png|webp);base64,…` validat cu expresie regulată. Orice altă valoare este ignorată, iar popup-ul se afișează fără fotografie.

### 6.4: Securizarea autentificării în frontend (C4 / S3), inclusă în `d89fd1c`
- Am eliminat **loginul DEMO 1-click** (`handleQuickDemoLogin`, butonul „Autentificare rapidă DEMO”).
- Am eliminat **credențialele afișate public** pe pagina de login. Placeholder-ul e-mailului este acum `nume@exemplu.ro`.
- **Validarea sesiunii** în `authService` (`isValidSessionUser`, `VALID_ROLES`): sesiunea citită din stocare trebuie să aibă `id`, `email`, `name` nevide și un rol valid (`super_admin` / `primarie_operator`). O sesiune coruptă sau cu formă greșită este ștearsă, iar utilizatorul vede formularul de login.
- **Rolurile rămân neschimbate:** 3 conturi hardcodate (1 `super_admin`, 2 `primarie_operator`), definite în `src/services/authService.ts`.
- **Limitele cauzate de lipsa backend-ului:**
  - o sesiune scrisă manual, cu structură validă, este acceptată (6D-SES-01 rămâne FAIL);
  - parolele sunt în bundle;
  - sesiunea nu expiră.

### 6.5: Autorizarea la nivel de servicii și reducerea datelor expuse (M3 / M4), inclusă în `d89fd1c`
Etapa a început cu un audit read-only (probleme P1–P7, decizii N1–N4). Au fost remediate **P1–P6**. **P7 nu a fost rezolvat**, conform instrucțiunii. Dintre neclaritățile de produs, **N2 și N4 au rămas nedecise**, **N3 a fost clarificat tehnic** prin implementarea P1/P2, iar **N1 a fost închis în Etapa 6.6** (vezi G.3).

| # | Remediere |
|---|---|
| P1 + P2 | **Helper-e noi** în `permissionService`: `currentUserCan(p)`, `currentUserCanAny(ps)`, `currentUserCanAll(ps)`. Se bazează pe `authService.getCurrentUser()?.role` și pe aceeași matrice; fără sesiune validă întorc `false`. **Gărzi în servicii** pe toate metodele de modificare: `reportService` (moderate / resolve / reply), `announcementService`, `directoryService` (19 metode), `quickDialService` (10), `surveyService`. La refuz nu se modifică nimic, iar metoda întoarce `false` / `null` / `{success:false}`. **Extindere de scop, semnalată:** gărzile acoperă toate metodele de modificare, nu doar cele listate inițial. Unele metode `void` întorc acum `boolean`, iar metodele `add*` întorc `T | null`. |
| P3 | Tab-ul „Evidență Locală” a fost **eliminat** din `IssuesView` (zona publică nu mai apelează `getAllReports()`). Pagina `#sesizari` are acum doar formularul și confirmarea. |
| P4 | **`PublicMapReport` redus:** fără `id` tehnic și fără `photo.name`. Câmpuri rămase: `referenceNumber`, `categoryId`, `categoryName`, `publicDescription`, `publicLocation`, `photo{dataUrl,size,compressionRatio}`, `createdAt`, `isAnonymous`. |
| P5 | **`announcementService.getPublicById(id)`** întoarce comunicatul doar dacă e publicat și neexpirat. Este folosit în `AnnouncementsView`. `getById()` a rămas în serviciu, dar în prezent nu are apelanți (auditul general, A-24). |
| P6 | **Gărzi în Admin:** `AdminReportsModeration` și `AdminAnnouncementsManager` verifică permisiunea pe fiecare acțiune și rezultatul serviciului. Afișează un banner de refuz `role="alert"`, iar succesul apare doar dacă serviciul acceptă operația. |
| — | **`submitReport` și `submitVote` rămân operații publice**, fără gardă, intenționat. |
| — | `ROLE_PERMISSIONS` **neschimbat**. În `permissionService` s-a modificat doar importul și s-au adăugat helper-ele. |

### 6.6: Asumare / preluare sesizare (C6, M7 / `6A-MOD-08`), commit `83b77ad`
| Element | Implementare |
|---|---|
| Model | `CivicReport.assigneeIds?: string[]` (responsabili individuali curenți) și `cityHallTakenOver?: boolean` (preluarea instituțională); doar starea curentă, fără istoric; câmpurile lipsă = fără responsabili / nepreluată |
| Roluri | `super_admin`: asumare individuală și retragerea propriei asumări. `primarie_operator`: preluare instituțională („Preia de către Primărie”), fără asumare individuală și fără renunțare |
| Prioritate | preluarea Primăriei are prioritate; nu poate fi retrasă și nu e dublată de un al doilea operator |
| Stadiu | asumare/preluare pe o sesizare `new` → `in_progress`; retragerea nu schimbă stadiul; `resolved`/`closed` neatinse |
| Securitate | gărzi în `reportService` (`reports.resolve` + rolul Primăriei din `permissionService`); salvare tranzacțională; `ROLE_PERMISSIONS` neschimbat; ID unic per cont Admin (`usr-operator-02` pentru al doilea operator) |
| Harta publică | nu afișează responsabilul, preluarea sau stadiul; `PublicMapReport` fără câmpuri de flux intern și fără datele cetățeanului |
| Sesizări `private` | opțiunea „Nu doresc afișarea publică” eliminată; sesizările aprobate (inclusiv cele istorice `private`) apar pe hartă, anonim |
| Admin | blocul „Asumare / Preluare” în cardul sesizării; datele de contact ale cetățeanului rămân vizibile ambelor roluri |

---

## E. REZULTATELE TESTELOR

### E.1 Valori finale (rulate înainte de commit-ul `d89fd1c`)
| Suită | Rezultat |
|---|---|
| 6.2: cota de stocare | **17/17 PASS** |
| 6.3: XSS pe hartă | **11/11 PASS** |
| 6.4: autentificare | **17/17 PASS** |
| 6.5: autorizare și date expuse | **19/19 PASS** (inclusiv 3 roluri × 24 de operații, conforme cu matricea; la refuz `localStorage` rămâne identic byte cu byte) |

### E.2 Verificări tehnice
| Verificare | Rezultat |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | exit 0 (avertisment de dimensiune a chunk-ului, preexistent, m14) |
| `git diff --check` | exit 0 |
| `git fsck --full --strict` | exit 0 |
| Clonă separată de pe GitHub | HEAD `d89fd1c`; conținut identic cu working tree-ul local |

### E.3 Regresie și limitări cunoscute
- Suita de regresie a Etapei 6 (13 scenarii): **61 PASS, 1 PARTIAL, 1 FAIL, 2 ERROR. Nicio regresie nouă.**
  - **FAIL: `6D-SES-01`.** O sesiune falsificată cu structură validă dă acces Admin. Aceasta este o **limitare arhitecturală cauzată de lipsa backend-ului**, nu o regresie.
  - **PARTIAL: `6A-MOD-08`.** Nu există „preluare/asumare” (responsabil desemnat), cerința M7; neschimbat la finalul 6.5. **Actualizare 6.6: decis și implementat** (vezi D, 6.6).
  - **ERROR: `sec_delete` și `sec_demo`.** Sunt scenarii de test învechite, care apasă butoane eliminate intenționat în 6.1 și 6.4. Aspectele lor sunt acoperite de suitele 6.1 și 6.4.
  - `6D-PRV-01` și `6D-PRV-02`, FAIL în auditul Etapei 6, trec acum datorită P3.
- **Actualizare P0 post-audit (D12 = A):** suitele de test sunt acum în repository, în `tests/` (vezi `tests/README.md`); rulare: `python3 tests/run_all.py`. Scripturile originale ale Etapei 6 (`e6_main.py` … `e65_verify.py`) nu au fost recuperate; regresia 6.1–6.5 din `tests/regression/` este o rescriere compactă.
  - server Vite dev plus import de module reale (`await import('/src/services/x.ts')`, aceeași instanță singleton);
  - build de producție servit cu `vite preview` pentru testele UI.

---

## F. ARHITECTURA DE SECURITATE ACTUALĂ

### F.1 Ce este implementat (protecție în frontend)
- Matricea de permisiuni centralizată (`permissionService`), aplicată în trei straturi: UI (butoane ascunse sau dezactivate), handlere (gardă în componentă) și **servicii** (gardă pe metoda de modificare, din 6.5).
- Validarea structurii sesiunii (6.4); rol necunoscut → niciun modul accesibil (fail-safe).
- Escaparea HTML și validarea sursei imaginilor pe hartă (6.3).
- Reducerea datelor publice: fără listă publică de sesizări, `PublicMapReport` minim, `getPublicById` (6.5).
- Nu există cale de ștergere a sesizărilor (6.1).

**Aceste protecții opresc greșelile, folosirea accidentală și accesul prin interfață.**

### F.2 Ce NU există (autorizare reală, pe server)
Tot codul rulează în browserul utilizatorului. Prin urmare:
- **Sesiunea poate fi falsificată:** un obiect JSON cu structură validă scris în `localStorage` dă acces (6D-SES-01).
- **Parolele există în bundle:** credențialele sunt hardcodate în `authService.ts` și se pot citi din JavaScript-ul livrat.
- **`localStorage` poate fi modificat direct** din DevTools, ocolind orice serviciu.
- **Orice gardă din frontend poate fi ocolită** de un utilizator cu DevTools.
- **Datele nu sunt centralizate:** fiecare browser are propria copie, iar Primăria nu vede sesizările trimise din alt browser.

> **Aceste protecții NU trebuie prezentate ca securitate server-side.** Pentru o utilizare reală (pilot cu cetățeni sau date reale) este necesar un backend, cu autentificare pe server, sesiuni pe server, autorizare pe fiecare operație și bază de date. Backend-ul este **decis (D1 = B)**, **proiectat și înghețat în Faza 4** (`docs/faza4/`) și se implementează în Faza 5.

---

## G. PROBLEME ȘI LIMITĂRI RĂMASE (la finalul 6.5)

### G.1 Arhitecturale și de securitate
| Cod | Problemă | Stare |
|---|---|---|
| — | Lipsa backend-ului (autentificare, autorizare, date centralizate) | **decis: D1 = B**; implementare în Faza 5 |
| M1 / S4 / `6D-SES-01` / P7 | Sesiunea Admin se poate falsifica din `localStorage` | **FAIL, nerezolvat** (P7 a fost exclus explicit din 6.5; descrierea din raportul 6.5 este în G.4) |
| M2 / S5 | Credențiale hardcodate în bundle | nerezolvat; necesită backend |
| m3 / S9 / `6D-SES-03` | Sesiunea nu expiră (persistă și în `localStorage`) | PARTIAL, nerezolvat |
| S10 | Jurnalul de e-mail salvează local datele de contact ale cetățeanului | nerezolvat |
| — | Mesaje de refuz în UI doar în Moderare și Comunicate (P6). Ghidul, Apel rapid și Sondaje primesc `false`/`null` de la servicii, dar nu afișează un mesaj de refuz. Operatorul nu are acolo butoane de modificare. | limitare cunoscută |

### G.2 Funcționale și de calitate (din auditul Etapei 6, încă deschise)
| Cod | Problemă |
|---|---|
| M5 | **Rezolvat în P0 post-audit (A-05):** `surveyService.getAllSurveys()` acceptă doar o listă și ignoră elementele care nu sunt obiecte; `#sondaje` nu mai rămâne albă la date corupte. Error boundary general nu există în continuare. |
| M6 | **Rezolvat în P0 post-audit (A-06):** footer-ul spune că trimiterea automată pe e-mail nu este activă în această versiune. În același P0: nota de pe login (A-07) și textul din Admin Moderare (A-08) au fost corectate. |
| M7 / `6A-MOD-08` | **DECIS / IMPLEMENTAT în 6.6:** asumare individuală `super_admin`, preluare instituțională a Primăriei (prioritară, fără retragere), fără afișare publică (vezi D, 6.6). Limitare: fără backend, starea nu e sincronizată între browsere |
| m1 | Eșecul notificării e-mail nu e vizibil în interfață |
| m4–m7 | Probleme de interfață: bannerul hărții peste butoanele de zoom, ținte tactile sub 44 px, taburile Admin pe telefon, etichete de etapă învechite vizibile public |
| m8, m9 | **Rezolvate în Faza 2:** culorile hărții (A-10, `9b08f66`) și categoria `rep-seed-003` (A-11, `62e6577`) |
| m10 | „Public” și „Public anonim” se afișează identic pe hartă: **intenționat din 6.6** (N1 închis: ambele publice, fără identitatea autorului) |
| m11, m12 | m11 depășit: formularul validează e-mailul și în cod (expresie regulată). m12 **rezolvat în Faza 2** (A-13, `87f282a`): trimiterea este blocată în timpul procesării fotografiilor |
| m13 | Ștergerea unui sondaj sau „Reset Demo” lasă submisii orfane |
| m14 | Bundle unic de aproximativ 755 KB |
| m15 | Dependențe moarte (rămân). **Conflictul de instalare este rezolvat prin A-22 (`e62b4ea`):** `npm ci` funcționează fără `--legacy-peer-deps` |
| m16 | Imagini demo de pe Unsplash |
| m17 | **Parțial rezolvat în P0 post-audit (D12 = A):** suitele sunt în `tests/` (servicii, UI, robustețe, suprafețe publice, regresie) și rulează cu `python3 tests/run_all.py`; vezi `tests/README.md`. Nu există încă un framework de teste integrat în `npm`. |

m2 (permisiunile per acțiune în Moderare și Comunicate) a fost **rezolvat** prin P6.

### G.3 Neclarități de produs din Etapa 6.5: N1–N4
Sursa: raportul original al Etapei 6.5, secțiunea „Neclarități de produs (nu le decid eu)”, furnizat de proprietarul proiectului. Instrucțiunea din 6.5 a fost „NU lua decizii pentru N1–N4”. Formularea de mai jos este cea din raport.

| Cod | Formularea din raportul 6.5 | Stare actuală |
|---|---|---|
| **N1** | `isAnonymous`: „Public” și „Public anonim” se comportă identic. Trebuie afișat numele la varianta „Public”, sau se renunță la una dintre opțiuni? | **ÎNCHIS în 6.6** (decizia proprietarului): ambele variante sunt publice și nu expun identitatea autorului; identitatea și datele de contact nu sunt niciodată în proiecția publică |
| **N2** | Rezultatele sondajelor sunt vizibile în timpul consultării (butonul „Rezultate”), deși textul spune „la finalizare”. Care variantă este corectă? | **DECIS în Faza 3 ca D3** (RULES §11.6): vizibilitatea o stabilește administratorul per sondaj, implicit după închidere |
| **N3** | `announcementService.setStatus` servește și la publicare, și la dezactivare. O gardă în serviciu trebuie să aleagă permisiunea după starea țintă. | **CLARIFICAT TEHNIC în 6.5** (P1/P2): `setStatus` verifică permisiunea după starea țintă (`published` → `announcements.publish`; altfel `announcements.disable`). Nu mai este o problemă tehnică nerezolvată; se păstrează aici pentru a documenta originea ca neclaritate N3. |
| **N4** | Trebuie ca `resetToDemo` să existe în versiunea de producție? | **DECIS în Faza 3 ca D4** (RULES §11.6): nu există în producție |

- N2 și N4 au fost decise în Faza 3 (D3 / D4).
- N1–N4 sunt distincte de P7 (G.4). P7 este o limitare de arhitectură, nu o neclaritate de produs.

### G.4 P7: sesiune client-side falsificabilă (`6D-SES-01`)
Sursa: fragmentul final recuperat al raportului de execuție al Etapei 6.5, furnizat de proprietarul proiectului. P7 nu mai este un punct cu text nerecuperat; raportul 6.5 îl identifică astfel:
- **P7 este asociat cu `6D-SES-01`**, care a rămas **FAIL** după 6.5.
- **`6D-SES-01` = sesiune client-side falsificabilă:** o sesiune JSON validă structural poate fi introdusă manual în `localStorage` și este acceptată.
- **Validarea din 6.4** (`isValidSessionUser`, `VALID_ROLES`) verifică **structura** sesiunii, **nu autenticitatea** ei.
- **Fără backend, autorizarea reală nu poate fi garantată:** gărzile din frontend pot fi ocolite.
- **P1/P2** (helper-ele `currentUserCan*` și gărzile din servicii) sunt **protecții în frontend** și **nu înlocuiesc autorizarea server-side**.
- **P7 rămâne nerezolvat.** Remedierea reală necesită backend: **decisă prin D1 = B**; P7 se închide în Faza 5.2.

### G.5 Decizii post-audit (D1–D12)
Auditul general a formulat deciziile D1–D12. Instrucțiunea P0 a transmis inițial doar D9–D12; **D1 a fost decisă ulterior (B)**, iar **D3, D4, D6, D8, reconfirmarea D10 și detalierea D9 au fost decise în Faza 3** și sunt consemnate în `PROJECT_RULES_AND_DECISIONS.md` §11.

| Decizie | Valoare | Efect |
|---|---|---|
| D9 | **A** (detaliată în Faza 3) | notificări către cetățean: calendar, opt-in, evenimente, notă internă ≠ răspuns către cetățean; vezi RULES §11.9 |
| D10 | **V2** (reconfirmată în Faza 3; înlocuiește A) | datele demo numai în dezvoltare, staging și demonstrații; **producția pornește curată**; contul `demo@` **nu se păstrează**; vezi RULES §11.8 |
| D11 | **B** | zona publică nu conține linkuri către Admin; ruta `#admin` rămâne, cu acces direct |
| D12 | **A** | testele se păstrează permanent în repository, în `tests/` |
| D1 | **B** | pilot real cu backend |
| D3, D4, D6, D8 | decise în Faza 3 | sondaje (D3/D4), pin pe hartă (D6), conturi (D8); vezi RULES §11.3, §11.5, §11.6 |
| D2, D5, D7 | **deschise** | nu se presupun |
| Faza 4 | **închisă** (28.09.2026) | designul backend-ului, înghețat; toate deciziile, în `docs/faza4/FAZA_4_REGISTRU_DECIZII.md`; rezumat în RULES §12 |

---

## H. CE NU TREBUIE MODIFICAT FĂRĂ DECIZIE EXPLICITĂ

| Element | De ce | Tip de decizie |
|---|---|---|
| `ROLE_PERMISSIONS` și lista de 24 de permisiuni | decizia 5D confirmată | **decizie de produs** |
| `submitReport` (public, tranzacțional din 6.2) | operație publică; protecția 6.2 | decizie de produs + tehnică |
| `submitVote` (public) | operație publică | decizie de produs |
| Mecanismul 6.1 (fără `deleteReport`, contorul TM nu scade) | regula „Primăria NU șterge sesizări” în **codul actual**; în designul Faza 4 regula este abrogată (A-1) și se schimbă la migrarea sesizărilor (5.4) | **decizie de produs** (deja luată pentru Faza 5) |
| Protecțiile 6.2 (salvare tranzacțională, reconcilierea contorului, formular păstrat) | previn pierderea de date și numerele duplicate | tehnică, cu retestare |
| Protecția XSS 6.3 (`escapeHtml`, `getSafeImageSrc`) | securitatea hărții publice | tehnică, cu retestare |
| Autentificarea 6.4 (fără DEMO 1-click, validarea sesiunii) | securitatea login-ului | tehnică + produs |
| Gărzile 6.5 din servicii și UI | autorizare consecventă | tehnică, cu retestare |
| Arhitectura actuală (frontend + `localStorage`) | schimbarea este decisă (D1 = B); se face numai prin Fazele 4–5, subetapă cu subetapă, cu teste și regresie | **decizie luată; execuția cere aprobarea fiecărei subetape** |
| Cheile `localStorage` (A.6) | schimbarea lor pierde datele existente | decizie tehnică, cu migrare; modificare permisă numai în Faza 5, conform designului aprobat în Faza 4 |
| Schemele de date (`src/types/*.ts`: `CivicReport`, `Announcement`, `Survey` etc.) | compatibilitate cu datele salvate | decizie tehnică + produs; modificare permisă numai în Faza 5, conform designului aprobat în Faza 4 |
| `SimulatedEmailTransportAdapter` | nu trebuie să raporteze niciodată `sent` | tehnică |
| N2, N4 (G.3) | decise în Faza 3 ca D3 / D4 (RULES §11.6) | **decizie de produs** |
| Regulile de asumare/preluare 6.6 (M7) | decise și implementate; în designul Faza 4, asumarea / preluarea nu mai schimbă starea (C-3) | **decizie de produs** (nu se schimbă fără decizie nouă) |
| Designul Faza 4 (`docs/faza4/`) | înghețat la checkpoint-ul Fazei 4 | **orice modificare a schemei DB sau a contractelor API cere o decizie nouă, explicită** |
| P7 | nerezolvat până la Faza 5.2 | **trecerea FAIL → PASS și orice modificare a `KNOWN_FAILS` numai cu aprobarea explicită a proprietarului** |
| `main` | nu se atinge | regulă de proiect |

---

## I. PUNCTUL EXACT DE CONTINUARE

> **ETAPA 6 ESTE ÎNCHISĂ.** Etapele 6.1–6.6 sunt finalizate; Etapa 6.6 este comisă și publicată (`83b77ad`). **Nu există Etapa 6.7.** A urmat auditul general al proiectului, cu deciziile post-audit D1–D12 (G.5) și remedierea **P0** (A-27, A-05, A-06, A-07, A-08, D11-B, D12-A). Checkpoint-ul formal al Etapei 6 este `f6809f3` (Faza 0). **Lucrările continuă exclusiv după Planul de Lucru Comun v1.1**; P1 este preluat în fazele acestuia.

> **Stadiul fazelor (28.09.2026):** Fazele 0, 1 și 2 sunt închise (ultimul commit al Fazei 2: `ff53758`, urmat de trecerea documentară `af60778`). **Faza 3 este închisă** (27.09.2026): N-2, N-3, D6, D8, D3/D4, N-4, D10 (reconfirmată V2), D9 și A-17 (`PROJECT_RULES_AND_DECISIONS.md` §11). **Faza 4 este închisă** (checkpoint aprobat de proprietar la 28.09.2026, commit `5f88750`): designul backend-ului este complet și **înghețat** (`docs/faza4/`, RULES §12). **Faza 5 nu a început**; pornește numai la instrucțiunea explicită a proprietarului, pe un branch nou, dedicat.

Starea de pornire consemnată anterior (finalul 6.5) rămâne mai jos pentru referință. Noul chat:
1. citește acest document, `PROJECT_RULES_AND_DECISIONS.md` și `ETAPA_6_STATUS_FINAL.md`;
2. verifică starea Git (B.4): HEAD = ultimul commit consemnat în B.1 (sau un commit ulterior de documentație), identic cu `origin`, și `main` la `d9bc2c9`;
3. rulează `npx tsc --noEmit` și `npm run build`;
4. confirmă înțelegerea stării și **așteaptă instrucțiunile** proprietarului (următoarea fază conform Planului v1.1: **Faza 5**, implementarea incrementală a backend-ului, subfază cu subfază, cu aprobare; la 5.1 se rezolvă și T-D1, backup-urile);
5. ține cont că N2 și N4 au fost decise în Faza 3 ca D3 / D4 (RULES §11.6), N3 este clarificat tehnic, iar N1 este închis (G.3); P7 este descris în G.4 și se închide la 5.2 numai cu aprobarea proprietarului;
6. **modul de lucru pentru decizii** (din 28.09.2026): Claude pune proprietarului întrebările direct, una câte una, cu variante; deciziile se integrează în documentație o singură dată, la final de etapă, cu un singur commit aprobat; ChatGPT auditează la punctele de control (final de fază / subfază).
