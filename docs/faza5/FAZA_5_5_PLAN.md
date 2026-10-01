# FAZA 5.5 — PLAN: E-MAIL REAL (partea 5.5a: codul)

**Proiect:** Turnu Măgurele Civic · **Data:** 01.10.2026 · **Branch:** `faza-5-backend`
**Design (înghețat):** B6 §1–§7, B7, B3 §8; N3-2, N3-4, N3-5, A-17, G3 (condiția 5), G7; T6 (`nodemailer` 10.0.x, aprobat în Faza 4)
**Decizia proprietarului (01.10.2026, varianta A):** 5.5 se împarte. **5.5a** = codul și testele, fără dependențe externe. **5.5b** = testul real pe staging (`allowlist`), după alegerea domeniului Civic (G7) și a furnizorului (N3-2). `live` rămâne pentru producție (A17-1).

## 1. De ce se împarte

- N3-4: expeditorul numai pe **domeniul Civic**, cu SPF / DKIM / DMARC; **niciodată `electrovolt.ro`**.
- G3, condiția 2: DNS-ul `electrovolt.ro` nu se modifică, deci nici subdomeniul de staging nu poate trimite e-mailuri.
- Domeniul Civic (G7) și furnizorul (N3-2) nu sunt încă alese. Până atunci, nicio trimitere reală.

## 2. Pașii 5.5a

| Pas | Conținut |
|---|---|
| 5.5a.1 | **Transportul SMTP** (`nodemailer`, N3-2): adaptor `MailTransport` construit din `SMTP_*`; TLS obligatoriu (`secure` pe 465 sau STARTTLS cerut pe 587, certificat verificat); `MAIL_FROM` ca expeditor; fără `Reply-To` (A17-6); timeout-uri scurte; eroarea furnizorului, scurtată și fără parole, în `last_error`. Fotografiile atașate la mesajul către Primărie (N3-7) folosesc deja căile din `STORAGE_DIR`. |
| 5.5a.2 | **Validarea la pornire (B6 §2, N3-4)**: domeniul din `MAIL_FROM` = `CIVIC_MAIL_DOMAIN`; refuz pentru `electrovolt.ro` și orice subdomeniu al lui; port și TLS coerente. **Conform B6 §2**, o configurație SMTP incompletă sau invalidă în `allowlist` / `live` **nu oprește aplicația**: se scrie eroarea în jurnal și se lucrează în `simulated` (vezi §4, punctul 1). |
| 5.5a.3 | **Codurile de cont imediat**: e-mailurile de cont (`citizen_login_code`, `citizen_account_blocked`) primesc aceeași încercare imediată ca mesajele sesizărilor (`kickOutbox`), nu numai prin cron (B6 §1: „prioritar”). |
| 5.5a.4 | **Retenția corpurilor (B6 §6, N3-8)**: e-mailurile fără sesizare (codurile de cont): corp și metadate șterse după 45 de zile, în `purge:retention` (cron existent). |
| 5.5a.5 | **Teste** cu un server SMTP de test pornit în proces (dependență numai de dezvoltare, `smtp-server`, fără cod nativ; **cere aprobare**, §4, punctul 3): trimiterea efectivă (`sent` + `in_analysis` + notificarea autorului), atașamentele, antetele, TLS cerut, `allowlist` (`blocked` în afara listei), reîncercările și `failed`, reîncercarea manuală din Admin, codurile de cont trimise imediat, validările de la pornire (inclusiv refuzul `electrovolt.ro`), retenția de 45 de zile. Regresie completă. |
| 5.5a.6 | Ghidul pentru 5.5b (fără execuție): ce se completează în `civic.env`, cron-ul `outbox:process` la 2 minute (cPanel → Cron Jobs), verificările SPF / DKIM / DMARC ale domeniului Civic, testul cu adresele tale din `EMAIL_ALLOWLIST`. |

Fără deploy pe staging în 5.5a: pe staging rămâne `simulated` (G3, condiția 5).

## 3. Ce rămâne pentru 5.5b (după G7 și N3-2)

1. alegerea domeniului Civic și a furnizorului (comparație separată, pregătită de Claude);
2. DNS-ul domeniului Civic: SPF, DKIM, DMARC (la registrar / furnizor, **nu** în cPanel-ul Electrovolt);
3. `EMAIL_MODE=allowlist`, `EMAIL_ALLOWLIST` = adresele de test ale proprietarului, destinatarul fluxului către Primărie = o adresă de test din listă (E-5);
4. testul: cod de cont primit real; sesizare cu transmitere → `sent` → `în analiză` → notificarea autorului; T-ISO înainte și după.

## 4. De decis de proprietar (contradicții și alegeri, prezentate separat)

1. **Configurație SMTP invalidă:** codul actual (5.1) **refuză pornirea**, iar B6 §2 cere **funcționarea în `simulated`**, cu eroarea în jurnal. Planul urmează designul (B6 §2). Alternativa: păstrarea refuzului (mai vizibil, dar aplicația nu pornește).
2. **Antetul `List-Unsubscribe-Post` (B6 §3):** promite dezabonarea „cu un clic” direct din clientul de e-mail, prin `POST` la adresa din `List-Unsubscribe`. Adresa actuală are jetonul după `#`, ca să nu ajungă în jurnalele serverului, iar un `POST` din clientul de e-mail **nu poate ajunge** la acea parte. Antetul promite deci ceva ce nu funcționează. Variante: (a) **se păstrează numai `List-Unsubscribe`** (link spre pagina de dezabonare) și se renunță la `-Post`; (b) un endpoint nou `POST /public/unsubscribe/one-click` cu jetonul în cale (care ajunge în jurnalele serverului). Recomandare: (a).
3. **Dependența de dezvoltare `smtp-server`** (de la autorii `nodemailer`), numai pentru teste; nu intră în pachetul de staging.

**Decis de proprietar (01.10.2026, varianta A):** toate cele 3 recomandări: (1) urmăm B6 §2 (configurație invalidă → `simulated`, eroarea în jurnal); (2a) numai `List-Unsubscribe`, fără `List-Unsubscribe-Post`; (3) `smtp-server` aprobat ca dependență de test.

## 5. Stare (01.10.2026)

5.5a.1–5.5a.5 implementate: `server/src/reports/smtp.ts` (transport, TLS obligatoriu, eroare fără parole), `config.ts` (`emailProblems`: N3-4, inclusiv refuzul `electrovolt.ro`; modul efectiv), codurile de cont cu încercare imediată, retenția e-mailurilor de cont în `purge:retention`. Teste: `integration/email.test.ts` (server SMTP local cu TLS, certificat generat la rulare cu `openssl`, fără chei în repository; 6 teste), `unit/config.test.ts` (4 teste noi; testul vechi „allowlist cere lista” adaptat: aceleași probleme, dar modul `simulated` în loc de refuzul pornirii, conform B6 §2), `db.test.ts` (CLI: avertismentul de mod, fără valori). Probă de control: fără `requireTLS`, testul TLS pică. Server 182/182, suita Python 71/71.

## 6. Commit-uri propuse (cu aprobare)

1. după 5.5a.1–5.5a.5: cod, teste și plan;
2. după 5.5a.6: ghidul 5.5b.
