# FAZA 6 — GHIDUL PROBELOR MANUALE PE STAGING (M1–M3)

**Proiect:** Urbis Activ · **Data:** 10.10.2026 · **Plan:** `FAZA_6_PLAN.md`, Pasul 3B · **Staging:** `https://test.urbisactiv.ro`
**Stare:** **ghid pregătit; probele NU sunt începute.** Începerea lor cere aprobarea proprietarului. Proba M4 (restaurarea unui backup) are ghid separat, după aprobarea intervențiilor pe găzduire.

## 0. Înainte de a începe

**Ce se probează:** M1 (fluxul unei sesizări, F1–F8), M2 (tranziții și permisiuni: F6n, F8n, F9, F10), M3 (un vot la sondaj). Durata: circa o oră.

**Reguli:**

- Numai date de test. Fiecare sesizare începe cu „TEST Faza 6”. E-mailul rămâne în modul `allowlist`; modul `live` nu se pornește. Destinatarul „Primăriei” rămâne adresa dumneavoastră de test.
- Nu se modifică `civic.env` și nimic din cPanel, cu o singură excepție, la pasul P-1 (un backup, din „Run JS script”). phpMyAdmin se folosește **numai pentru citire**: se lipesc numai interogările din §5, care încep cu `SELECT`.
- Nu trimiteți: parole, parola temporară a contului de operator, coduri TOTP, fișierul de setări. În capturi, **acoperiți adresele de e-mail** (o bandă neagră este suficientă).
- Dacă ceva arată altfel decât scrie în coloana „Ce trebuie să vedeți”: **vă opriți**, faceți o captură și mi-o trimiteți. Nu încercați să reparați pe loc.

**Trei ferestre de browser, separate.** Sesiunea de Admin și cea de cetățean folosesc același cookie, deci nu pot sta în aceeași fereastră:

| Fereastra | Cine | Cum o deschideți |
|---|---|---|
| A | cetățeanul | Chrome, fereastră obișnuită |
| B | `super_admin` | Chrome, fereastră privată (Ctrl + Shift + N) |
| C | subcontul Primăriei (operatorul) | **alt browser** (Edge sau Firefox) |

În fiecare fereastră, la prima deschidere, introduceți utilizatorul și parola lacătului.

**Ce dovadă se păstrează** (regula dovezilor, `FAZA_6_PLAN.md` §4): la fiecare pas, coloana „Dovada” spune ce îmi trimiteți: o captură, mesajul primit sau rezultatul unei interogări. Fără dovada cerută, pasul nu poate fi trecut ca „verificat”.

De știut: cât timp `TRUST_PROXY` nu este rezolvat, limitele pe adresă sunt comune tuturor (cel mult 5 sesizări pe oră). Probele de mai jos depun 2 sesizări; dacă primiți „Prea multe cereri”, așteptați o oră, nu repetați.

## 1. Pregătirea

| Pas | Fereastra | Ce faceți | Ce trebuie să vedeți | Dovada |
|---|---|---|---|---|
| P-1 | cPanel | Setup Node.js App → aplicația → „Run JS script” → `civic-backup-db` → Run | `backup:db: civic-backup-…`, fără erori | captura ieșirii |
| P-2 | B | `/#admin` → autentificare ca `super_admin` → „Conturi” → „Cont nou”: e-mail (o adresă aleasă de dvs., numai pentru acest test), nume afișat „Operator test Faza 6”, rolul **„Operator Primărie”** → „Creează contul” | caseta galbenă cu parola temporară; contul apare în listă | captura **listei** (fără caseta cu parola; e-mailurile acoperite) |
| P-3 | C | `/#admin` → e-mailul operatorului + parola temporară → setați o parolă nouă | „Panou de Administrare”, cu rolul de operator | captură |
| P-4 | B | „C. Sesizări” → „Fluxul către Primărie (super_admin)” → verificați: destinatarul = adresa de test; participarea = **„Primăria primește numai e-mailuri”**; „Fluxul este pornit” bifat. Dacă este așa, nu schimbați nimic | modul e-mail afișat: „staging: numai adresele din listă” | captură (destinatarul acoperit) |

Parola temporară a operatorului o notați numai pentru dvs.; nu o trimiteți și nu o capturați.

## 2. Proba M1 — fluxul unei sesizări

| Pas | Rând | Fereastra | Ce faceți | Ce trebuie să vedeți | Dovada |
|---|---|---|---|---|---|
| 1 | F1 | A | „Sesizări” → „Depune o sesizare”, fără să fiți autentificat (dacă sunteți, apăsați „Ieșire”) | ecranul „Contul meu”; formularul nu apare | captură |
| 2 | F2 | A | bifați regulile → autentificare cu adresa din listă (cod primit pe e-mail sau Google) | bara „Autentificat ca …” | captură (adresa acoperită) |
| 3 | F3 | A | formularul: categoria „Iluminat public”; descrierea „TEST Faza 6 – M1, sesizare cu transmitere”; locația (text); un pin pe hartă; o fotografie; bifați **„Transmite sesizarea către Primărie”** și **„Anunță-mă pe e-mail când se schimbă stadiul”** → „Trimite sesizarea” | „Sesizarea a fost înregistrată”, cu un număr `TM-…` | captură. **Notați numărul: este `TM-A`** |
| 4 | F5 | A | „Hartă”, imediat după depunere → click pe punctul sesizării | sesizarea este pe hartă, cu fotografia; în fereastra ei nu apare adresa dvs. de e-mail | captură |
| 5 | F6 | e-mail | deschideți căsuța adresei de test (destinatarul „Primăriei”) | un mesaj „Sesizare TM-A — Iluminat public”, cu fotografia atașată, sosit în circa un minut | captura mesajului (adresele acoperite) |
| 6 | F7 | e-mail | așteptați până la 3 minute | un al doilea mesaj: „Sesizarea TM-A — Iluminat public: în analiză” | captura mesajului |
| 7 | F7 | A | „Sesizări” → „Sesizările mele” → „Actualizează” | `TM-A` cu stadiul **„În analiză”** | captură |
| 8 | F4, F6, F7 | phpMyAdmin | interogările **Q1** și **Q2** din §5, cu `TM-A` | Q1: `in_analysis`, `pin`, o fotografie, transmitere cerută = 1. Q2: `registry_notification` cu starea `sent` și `citizen_status_update` cu starea `sent` | captura celor două rezultate |

M1 continuă la pasul 12, după primele verificări din M2.

## 3. Proba M2 — tranziții și permisiuni

| Pas | Rând | Fereastra | Ce faceți | Ce trebuie să vedeți | Dovada |
|---|---|---|---|---|---|
| 9 | F8n | B | „C. Sesizări” → căutați `TM-A` | **nu** există butonul „Marchează rezolvată”; există „Asumă” | captură |
| 10 | F8n | C | „C. Sesizări” → căutați `TM-A` → apăsați „Marchează rezolvată” | un mesaj roșu: „Primăria nu participă prin platformă; starea „rezolvată” nu este disponibilă.” Stadiul rămâne „În analiză” | captură |
| 11 | — | B | „Fluxul către Primărie” → participarea = **„Primăria lucrează în platformă (poate marca „rezolvată”)”** → „Salvează” | „Setările fluxului către Primărie au fost salvate.” | captură (destinatarul acoperit) |
| 12 | F8 | C | reîncărcați pagina (F5) → „C. Sesizări” → `TM-A` → „Marchează rezolvată” | stadiul devine **„Rezolvată”**; butonul dispare | captură |
| 13 | F8 | e-mail | căsuța adresei de test | mesajul „Sesizarea TM-A — Iluminat public: rezolvată” | captura mesajului |
| 14 | F8 | A | „Sesizările mele” → „Actualizează”; apoi „Hartă” → punctul sesizării | „Rezolvată” în listă și pe hartă | două capturi |
| 15 | F8 | phpMyAdmin | **Q1** și **Q3**, cu `TM-A` | Q1: `resolved`. Q3: un rând `report.resolution` | captura rezultatelor |
| 16 | F6n | A | o a doua sesizare: descrierea „TEST Faza 6 – M2, fără transmitere”; locație și pin; **fără** bifa „Transmite sesizarea către Primărie” | confirmare cu alt număr | captură. **Notați numărul: este `TM-B`** |
| 17 | F6n | e-mail, phpMyAdmin | așteptați 3 minute; apoi **Q1** și **Q2**, cu `TM-B` | niciun mesaj nou pentru „Primărie”. Q1: `new`, transmitere cerută = 0. Q2: niciun rând | captura rezultatelor; confirmați în scris că nu a sosit niciun mesaj |
| 18 | F8n | C | „C. Sesizări” → căutați `TM-B` | **nu** există butonul „Marchează rezolvată” (sesizarea este „Nouă”) | captură |
| 19 | F9 | C | la `TM-A`: „Detalii și acțiuni” | **nu** apar: e-mailul autorului, „Jurnal e-mail”, „Drepturi exclusive super_admin”, „Șterge definitiv” | captură |
| 20 | F9 | B | la `TM-A`: „Detalii și acțiuni” | apar: e-mailul autorului, „Jurnal e-mail”, „Șterge definitiv” | captură (e-mailul acoperit) |
| 21 | F10 | A | „Sesizările mele” → la `TM-B`: „Șterge sesizarea” → „Da, șterge” | `TM-B` dispare din listă; pe hartă nu mai apare | captură |
| 22 | F10 | B | la `TM-A`: „Detalii și acțiuni” → „Șterge definitiv” → „Da, șterge” | „Sesizarea TM-A a fost ștearsă definitiv.” | captură |
| 23 | F10 | phpMyAdmin | **Q1**, cu `TM-A` și `TM-B` | niciun rând | captura rezultatului |

**Readucerea la starea dinainte** (fereastra B): „Fluxul către Primărie” → participarea = „Primăria primește numai e-mailuri” → „Salvează”. Apoi „Conturi” → contul „Operator test Faza 6” → „Dezactivează”. Câte o captură pentru fiecare (e-mailurile acoperite).

## 4. Proba M3 — un vot la sondaj

| Pas | Fereastra | Ce faceți | Ce trebuie să vedeți | Dovada |
|---|---|---|---|---|
| 1 | phpMyAdmin | **Q4** | lista sondajelor, cu numărul de voturi. Notați numărul sondajului activ | captura rezultatului |
| 2 | A | „Sondaje” → la sondajul activ: „Participă” → răspundeți la întrebări → „Trimite Răspunsurile” (formularul trebuie să stea deschis cel puțin 6 secunde) | „Răspunsurile dumneavoastră au fost înregistrate!” | captură |
| 3 | A | „Închide fereastra” → lista sondajelor | la sondajul votat scrie „Ai participat deja”; butonul „Rezultate” **nu** apare la sondajul activ (rezultatele lui se văd numai după închidere) | captură |
| 4 | A | în aceeași pagină, la „Arhiva consultărilor încheiate”: sondajul închis → „Rezultate” | rezultatele sondajului închis | captură |
| 5 | phpMyAdmin | **Q4** | la sondajul activ, numărul de voturi a crescut cu **exact 1** | captura rezultatului |
| 6 | A | al doilea vot, refuzat de server: apăsați F12 → fila „Application” → „Local Storage” → `https://test.urbisactiv.ro` → click dreapta pe rândul `tmc_survey_participation_hint` → „Delete”; închideți panoul (F12); reîncărcați pagina (F5); „Participă” → răspundeți → „Trimite Răspunsurile” | „Ați participat deja la acest sondaj”; **nu** apare „Răspunsurile dumneavoastră au fost înregistrate!” | captură |
| 7 | phpMyAdmin | **Q4** | numărul de voturi este **același** ca la pasul 5 | captura rezultatului |
| 8 | B | „D. Sondaje Civice (4B)” → sondajul activ → „Inspectează” | rezultatele și numărul de participări, vizibile în Admin | captură |

De știut la pasul 6: ștergeți numai rândul `tmc_survey_participation_hint`. Este un indiciu ținut în browser („Ai participat deja”); regula „un singur vot” o aplică serverul, iar pasul 6 tocmai asta verifică.

## 5. Interogările (numai citire)

În cPanel: Databases → phpMyAdmin → baza de date a aplicației → fila „SQL” → lipiți interogarea → „Go”. Înlocuiți `TM-A` și `TM-B` cu numerele notate (de exemplu `TM-012`). Interogările nu afișează adrese de e-mail, parole sau chei.

**Q1 — starea sesizărilor**

```sql
SELECT r.reference_number, r.resolution_status, r.location_source,
       r.city_hall_transmission_requested AS transmitere_ceruta, r.notify_opt_in AS notificari,
       (SELECT COUNT(*) FROM report_photos p WHERE p.report_id = r.id) AS fotografii, r.created_at
FROM reports r WHERE r.reference_number IN ('TM-A', 'TM-B');
```

**Q2 — e-mailurile unei sesizări (fără destinatari)**

```sql
SELECT r.reference_number, o.kind, o.status, o.mode_at_send, o.transport, o.attempts, o.sent_at
FROM email_outbox o JOIN reports r ON r.id = o.report_id
WHERE r.reference_number IN ('TM-A', 'TM-B') ORDER BY o.created_at;
```

**Q3 — auditul rezolvării**

```sql
SELECT r.reference_number, a.action, a.occurred_at, a.details
FROM audit_log a JOIN reports r ON r.id = a.target_id
WHERE a.action = 'report.resolution' AND r.reference_number = 'TM-A';
```

**Q4 — voturile pe sondaje**

```sql
SELECT s.title, s.status, s.results_visibility, COUNT(x.id) AS voturi
FROM surveys s LEFT JOIN survey_submissions x ON x.survey_id = s.id
GROUP BY s.id, s.title, s.status, s.results_visibility ORDER BY s.created_at;
```

## 6. Ce îmi trimiteți la final

1. Capturile, în ordinea pașilor, cu numărul pasului în numele fișierului (de exemplu `M1-03.png`).
2. Numerele `TM-A` și `TM-B`.
3. Ora aproximativă a fiecărei probe.
4. Orice pas care a arătat altfel decât în ghid, chiar dacă vi se pare neimportant.

Eu trec fiecare rând într-una dintre listele raportului: trecut (cu dovada), eșuat, neefectuat. Un pas fără dovada cerută rămâne „neefectuat”.

## 7. Ce nu acoperă aceste probe

- Retenția de 45 de zile: nu se poate proba într-o zi; rămâne acoperită de testele automate.
- Modul e-mail `live` și adresa reală a Primăriei: neatinse, până la acordul scris al Primăriei.
- Limitele pe adresă IP: se verifică la Pasul 2 (`TRUST_PROXY`), nu aici.
- Restaurarea unui backup (M4): ghid separat.
