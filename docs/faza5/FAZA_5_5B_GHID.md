# FAZA 5.5b — GHID: E-MAIL REAL PE STAGING (`allowlist`)

> **Antet istoric (DEC-6):** executat la 08.10.2026 **pe staging-ul nou `test.urbisactiv.ro`**; pașii ghidului corespund intervențiilor 11–16 și 19 din jurnalul acestuia (`docs/faza5/STAGING_URBISACTIV_JURNAL.md`). Intervențiile 17–18, din același interval, nu sunt pași ai ghidului: privesc fereastra de parolă repetată a lacătului de acces (17: o încercare de reparare prin `.htaccess`; 18: schimbarea parolei lacătului și instalarea reparației `b0e1842`). Ghidul **descrie contextul staging-ului vechi** (`civic-test.electrovolt.ro`, retras la 09.10.2026), pentru care a fost redactat. În vigoare: manualul 7D (`docs/faza7/FAZA_7D_MANUAL_INSTALARE_OPERARE_CIORNA.md`). Starea „pregătit, neexecutat” de mai jos este cea de la redactare (01.10.2026) și rămâne ca istoric.

**Proiect:** Turnu Măgurele Civic · **Data:** 01.10.2026 · **Stare:** pregătit, **neexecutat**
**Condiții prealabile (decizii ale proprietarului):** domeniul Civic (G7), **încă nedecis**, și furnizorul SMTP (N3-2): **Brevo, ales de proprietar la 01.10.2026**. Codul este gata din 5.5a (`1f64082`).

> Regulile rămân: expeditorul numai pe domeniul Civic (N3-4); **nicio modificare** la `electrovolt.ro` (DNS, cPanel, `public_html`); pe staging numai `allowlist`, cu adresele de test ale proprietarului (G3, condiția 5); T-ISO înainte și după; fiecare pas pe hosting cu aprobare separată.

## 1. Alegerile

### 1.1 Domeniul Civic (G7)

- Se înregistrează la un registrar `.ro` (sau altă extensie aleasă), **separat de contul Electrovolt**.
- DNS-ul domeniului se administrează **la registrar sau la furnizorul de e-mail**, nu în cPanel-ul Electrovolt (G3, condiția 2; producția va fi separată de contul Electrovolt).
- Numele îl alege proprietarul (decizie de produs).

### 1.2 Furnizorul SMTP (N3-2): comparație (informații publice, 01.10.2026; **se verifică la înregistrare**)

| Furnizor | Gratuit | Plătit (minim) | Pentru noi | Atenție |
|---|---|---|---|---|
| **Brevo** (Franța, UE) | aproximativ 300 / zi după mai multe surse; pagina oficială de prețuri menționează „de la 5.000 / lună” | planul Starter | SMTP relay inclus, configurare simplă, firmă din UE (GDPR) | limita exactă a planului gratuit și eventuala siglă Brevo în mesaje: de verificat |
| **Mailjet** (Franța / Sinch) | 200 / zi, 6.000 / lună | ~15 USD / lună | SMTP inclus, UE | pe planul gratuit, sigla Mailjet apare în mesaje |
| **Amazon SES** (regiune UE, de exemplu Frankfurt) | 3.000 / lună în primele 12 luni | ~0,10 USD / 1.000 de mesaje (+ 0,12 USD / GB atașamente) | cel mai ieftin la volum, fiabil | cont AWS, configurare mai tehnică; cont nou în „sandbox”, ieșirea cere o cerere scrisă |
| căsuța de pe hosting (cPanel) | inclusă | — | — | **exclus acum**: staging-ul e pe contul Electrovolt (IP comun, R-11), iar hosting-ul de producție (G6) nu este ales |

**Decizia (01.10.2026):** Brevo (N3-2). Limitele exacte ale planului gratuit și acordul de prelucrare a datelor (DPA) se verifică la crearea contului.

Volumul estimat al platformei e mic (coduri de cont și câteva mesaje către Primărie pe zi), deci orice plan gratuit ajunge la început.

**Date personale:** mesajele către Primărie conțin adresa de e-mail a autorului și descrierea sesizării. Furnizorul devine **persoană împuternicită** (GDPR, art. 28): este nevoie de acordul lui de prelucrare a datelor (DPA), de preferat un furnizor din UE. Se trece în politica de confidențialitate (E-6).

## 2. Pașii pe staging (după alegeri; ghid detaliat, pas cu pas, la execuție)

| Pas | Cine | Ce |
|---|---|---|
| 0 | Claude + proprietarul | T-ISO înainte |
| 1 | proprietarul, la furnizor | contul; domeniul Civic adăugat și **autentificat**: înregistrările SPF, DKIM (și eventual DMARC) indicate de furnizor, puse în DNS-ul **domeniului Civic** |
| 2 | Claude | verificarea publică a DNS-ului domeniului Civic (SPF, DKIM, DMARC), fără acces la conturi |
| 3 | proprietarul, la furnizor | datele SMTP: server, port (587 cu STARTTLS sau 465 TLS), utilizator, parolă / cheie SMTP. **Nu se trimit în chat.** |
| 4 | proprietarul, în `civic.env` (editorul File Manager, fără capturi) | `EMAIL_MODE=allowlist`, `EMAIL_ALLOWLIST=<adresele tale de test>`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` (`true` numai pe 465), `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM=<ceva>@<domeniul Civic>`, `CIVIC_MAIL_DOMAIN=<domeniul Civic>` |
| 5 | proprietarul | Restart; `civic-outbox-process` („Run JS script”): fără mesajul „nu se poate folosi; se lucrează în simulated”. Dacă apare, mesajul numește variabila greșită. |
| 6 | proprietarul, cPanel → Cron Jobs | `outbox:process` la 2 minute (comanda exactă dată la execuție; garanția cozii, B6 §1) |
| 7 | proprietarul | proba: cod de cont primit **real** pe o adresă din listă; o adresă din afara listei nu primește nimic |
| 8 | proprietarul, Admin | destinatarul fluxului către Primărie = o **adresă de test din listă** (E-5, niciodată adresa reală a Primăriei); sesizare cu transmitere → mesaj primit cu fotografia → stadiul „în analiză” → notificarea autorului (dacă a cerut-o) |
| 9 | Claude + proprietarul | T-ISO după; jurnal; raport 5.5 și checkpoint |

**Revenirea în orice moment:** `EMAIL_MODE=simulated` în `civic.env` + Restart (nimic real nu mai pleacă).

## 3. Ce nu se face pe staging

- `EMAIL_MODE=live` (numai producția, după A17-1: acordul scris al Primăriei);
- adresa reală a Primăriei ca destinatar;
- orice înregistrare DNS pe `electrovolt.ro`.
