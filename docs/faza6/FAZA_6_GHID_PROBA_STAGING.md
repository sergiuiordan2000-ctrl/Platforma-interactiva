# FAZA 6 — GHIDUL PROBELOR MANUALE PE STAGING (M1–M3)

**Proiect:** Urbis Activ · **Versiunea 3:** 10.10.2026 · **Plan:** `FAZA_6_PLAN.md`, Pasul 3B · **Staging:** `https://test.urbisactiv.ro`
**Stare:** **ghid pregătit; probele NU sunt autorizate și NU sunt începute.** Începerea lor cere o decizie separată, explicită, a proprietarului. Proba M4 (restaurarea unui backup) are ghid separat.
**Față de versiunea 2** (verificarea locală din 10.10.2026): inventarul acțiunilor de găzduire (§1); urmele care rămân, separate în confirmate și de verificat (§2); procedura de oprire completată (§3); proba interogărilor și două interogări noi, Q6 și Q7, în starea inițială (§5); verificarea Q6 înaintea repornirii fluxului și măsura de limitare (§7, pașii 9–10); pașii renumerotați; operatorul se dezactivează înaintea readucerii modului (§10); starea finală cu Q6 și Q7 (§11); `GROUP BY` complet la Q4 (§12); constatarea pentru reauditul de securitate (§15).

## 0. Deciziile proprietarului pentru aceste probe (10.10.2026)

| # | Decizia |
|---|---|
| A | Proba M3 se face pe un **sondaj nou, creat numai pentru test**. Sondajele demo nu se ating. Sondajul de test rămâne în arhivă. |
| B | Fluxul către Primărie se **oprește înaintea depunerii** sesizării, ca să se vadă stadiul „Nouă” și mesajul în așteptare; apoi se repornește și se urmărește trecerea la „În analiză” după transmitere. |
| C | E-mailurile de test pleacă **numai către adresa de test a proprietarului**; modul `allowlist` rămâne neschimbat; modul `live` nu se pornește; nu se folosesc adrese ale Primăriei. Contul de operator creat pentru test folosește o adresă controlată de proprietar și se dezactivează la final; înregistrarea lui rămâne în baza de date. |

**Reguli:**

- Numai date de test. Fiecare sesizare începe cu „TEST Faza 6”.
- Nu trimiteți: parole, parola temporară a operatorului, coduri TOTP, fișierul de setări. În capturi, **acoperiți adresele de e-mail**.

## 1. Acțiunile de găzduire permise

Numai acestea. Orice altă acțiune în cPanel sau în phpMyAdmin este în afara probei.

| Unde | Acțiunea | De câte ori | Modifică ceva? |
|---|---|---|---|
| cPanel → Setup Node.js App → „Run JS script” | `civic-backup-db` (pasul P-1) | o dată | creează un backup nou; nu atinge baza de date |
| cPanel → phpMyAdmin → fila „SQL” | interogările Q0–Q7 din §12 | 25 de rulări, la pașii marcați „phpMyAdmin” | **nu**: toate sunt `SELECT` |
| cPanel, orice altceva | — | deloc | — |

**Nu se modifică:** `civic.env`, aplicația Node, sarcinile cron, baza de date (prin phpMyAdmin), DNS-ul, parola lacătului.

**Reguli pentru phpMyAdmin:**

- lipiți numai interogările din §12, exact cum sunt scrise; toate încep cu `SELECT`;
- nu apăsați „Edit”, „Copy”, „Delete”, „Empty”, „Drop”, „Import”, „Operations”;
- nu faceți dublu click pe celulele rezultatelor;
- nu deschideți tabelele din lista din stânga.

Setările aplicației (fluxul către Primărie, contul de operator, sondajul de test) se schimbă **din aplicație**, din Admin, nu din cPanel.

## 2. Ce rămâne după probe

**Se readuce la starea inițială** (§10): modul fluxului, pornirea lui, destinatarul. Cele două sesizări de test se șterg în cursul probei, cu fotografiile și mesajele lor.

**Nu poate fi anulat — confirmat din codul aplicației:**

| Ce rămâne | De ce | Unde în cod |
|---|---|---|
| **contorul `TM`, mai mare cu 2** | numerele nu se refolosesc niciodată, nici după ștergere | `server/src/routes/reports.ts`, rândurile 355–357 |
| **contul de operator de test, dezactivat, cu adresa lui de e-mail** | aplicația nu are ștergere de conturi Admin, numai dezactivare | `server/src/routes/adminAccounts.ts` (nu există rută de ștergere) |
| **sondajul de test, în arhiva publică, închis, cu întrebarea lui și un vot** | un sondaj cu voturi nu se poate șterge; un sondaj închis nu se mai redeschide | `server/src/routes/adminSurveys.ts`, rândurile 180 și 205 |
| **rânduri în jurnalul de audit** pentru acțiunile din Admin: cele patru salvări ale setărilor fluxului, crearea și dezactivarea contului, crearea și închiderea sondajului | se șterg singure după 6 luni | `server/src/maintenance.ts`, rândul 55 |
| **rândurile codurilor de autentificare** cerute în probă (dacă v-ați autentificat cu cod) | se șterg singure după 45 de zile | `server/src/maintenance.ts`, rândul 61 |
| **un backup în plus** și două intrări în lista de ștergeri (numai ID-uri interne) | se șterg singure după 7 zile | `server/src/db/backup.ts` |

Rândul de audit al rezolvării lui `TM-A` și mesajele lui `TM-A` **nu** rămân: se șterg odată cu sesizarea (`server/src/db/reportDeletion.ts`, rândurile 30–32).

**De verificat — nu sunt confirmate:**

| Ce ar putea rămâne | De ce nu este confirmat |
|---|---|
| rânduri în `rate_limits` și `rejected_attempts`, cu amprente de IP (nu adrese), create de autentificări, de depuneri, de vot și de votul refuzat | în cod nu am găsit nicio ștergere pentru aceste tabele (§15); cât rămân se stabilește la reauditul de securitate |
| rânduri în `sessions` și `citizen_login_codes` (sesiunile încheiate, codurile folosite) | aceeași căutare nu a găsit o curățare periodică; de verificat la reaudit |
| jurnalul furnizorului de e-mail (Brevo) și mesajele din căsuța de test | sunt în afara aplicației; mesajele le puteți șterge dvs. |
| în browserul ferestrei A: cookie-ul de participare la sondaj și indiciul „Ai participat deja” | sunt în browser; dispar la ștergerea datelor de navigare |

## 3. Procedura de oprire

**Vă opriți imediat, fără să continuați și fără să reparați, dacă:**

1. o interogare dă eroare sau un rezultat pe care nu îl înțelegeți;
2. starea inițială (§5) nu corespunde tabelului „Condiții de pornire”;
3. un pas arată altfel decât scrie în coloana „Ce trebuie să vedeți”;
4. numărul primit de o sesizare nu este cel așteptat (pașii 4 și 21);
5. câmpul destinatarului arată altă adresă decât adresa de test;
6. interogarea Q6 de la pasul 9 nu arată **exact** rândul așteptat;
7. primiți un e-mail neașteptat sau lipsește unul așteptat după 6 minute;
8. apare „Prea multe cereri”.

**Ce faceți la oprire:**

1. o captură a ecranului;
2. interogările **Q0**, **Q5**, **Q6** și **Q7** (numai citire) și capturile rezultatelor. Dacă v-ați oprit tocmai pentru că una dintre ele a dat eroare, nu o repetați: trimiteți captura erorii și rulați-le numai pe celelalte;
3. îmi trimiteți capturile și numărul pasului la care v-ați oprit.

**Ce nu faceți:** nu apăsați din nou același buton, nu schimbați setări „ca să fie cum erau”, nu ștergeți nimic. Pașii de readucere vi-i spun eu, după ce văd starea.

**Singura excepție** este măsura de limitare de la pasul 10, descrisă acolo.

Dacă proba se oprește cu fluxul oprit, starea este sigură: mesajele doar așteaptă. Dacă se oprește cu Primăria „în platformă”, nimic nu se schimbă fără o acțiune a operatorului; nu folosiți fereastra C până la readucere.

## 4. Ferestrele de browser

Sesiunea de Admin și cea de cetățean folosesc același cookie, deci nu pot sta în aceeași fereastră:

| Fereastra | Cine | Cum o deschideți |
|---|---|---|
| A | cetățeanul | Chrome, fereastră obișnuită |
| B | `super_admin` | Chrome, fereastră privată (Ctrl + Shift + N) |
| C | subcontul Primăriei (operatorul) | **alt browser** (Edge sau Firefox) |

În fiecare fereastră, la prima deschidere, introduceți utilizatorul și parola lacătului. Sesiunea de Admin se încheie după 60 de minute fără activitate; dacă vi se cere din nou autentificarea, este normal.

De știut: adresa dvs. de test este și contul de cetățean, și destinatarul „Primăriei”. Toate mesajele sosesc în aceeași căsuță și se deosebesc după subiect.

## 5. Starea inițială (înaintea oricărei modificări)

Până la sfârșitul acestei secțiuni nu se modifică nimic. Dacă vreo interogare dă eroare aici, proba nu începe, iar pe staging nu s-a schimbat nimic.

| Pas | Unde | Ce faceți | Ce trebuie să vedeți | Dovada |
|---|---|---|---|---|
| I-1 | phpMyAdmin | **Q0** (setările fluxului) | patru rânduri | captură: „Q0 inițial” |
| I-2 | phpMyAdmin | **Q5** (inventarul) | numărători pe categorii | captură: „Q5 inițial” |
| I-3 | phpMyAdmin | **Q4** (sondajele) | sondajele demo | captură: „Q4 inițial” |
| I-4 | phpMyAdmin | **Q6** (mesajele în așteptare sau în coadă) | **niciun rând** | captură: „Q6 inițial” |
| I-5 | phpMyAdmin | **Q7** (sesizările existente) | lista sesizărilor existente, cu stadiul fiecăreia | captură: „Q7 inițial” |
| I-6 | phpMyAdmin | **proba interogărilor:** **Q1**, **Q2** și **Q3**, lăsând `TM-A` și `TM-B` exact cum sunt scrise (nu există asemenea sesizări) | fiecare rulează **fără eroare** și întoarce zero rânduri | trei capturi |
| I-7 | B | `/#admin` → autentificare ca `super_admin` → „C. Sesizări” → „Fluxul către Primărie (super_admin)” (numai deschideți panoul; nu salvați) | setările curente | captura panoului, cu destinatarul acoperit |
| I-8 | — | **notați din Q5 valoarea „contor TM”. O numesc N.** | — | — |

Rostul pasului I-6: toate interogările folosite mai târziu sunt încercate acum, cât timp nu s-a schimbat nimic. O interogare care nu merge pe baza de date a găzduirii se vede aici, nu în mijlocul probei.

**Condiții de pornire.** Proba începe numai dacă toate sunt îndeplinite; altfel vă opriți (§3):

| Ce arată starea inițială | Trebuie să fie |
|---|---|
| I-1…I-6 | toate interogările au rulat fără eroare |
| Q0, `registry.flow_enabled` | `true` |
| Q0, `registry.primaria_mode` | `"email_only"` |
| Q0, `registry.recipient_email` | o amprentă (nu `null`); în panou (I-7) se vede adresa dvs. de test |
| panoul (I-7), modul e-mail al serverului | „staging: numai adresele din listă” |
| Q6 | **niciun rând**: niciun mesaj în starea `on_hold`, `queued` sau `sending` |
| Q5, conturi Admin | un singur rând: `super_admin / active`, cu valoarea 2; niciun rând de operator |

De ce contează Q6: la repornirea fluxului (pasul 10) aplicația repune în coadă **toate** mesajele către Primărie aflate în așteptare, nu numai pe cel al probei. Dacă ar exista unele vechi, ar pleca și ele, iar sesizările lor și-ar schimba stadiul.

## 6. Pregătirea

| Pas | Fereastra | Ce faceți | Ce trebuie să vedeți | Dovada |
|---|---|---|---|---|
| P-1 | cPanel | Setup Node.js App → aplicația → „Run JS script” → `civic-backup-db` → Run | `backup:db: civic-backup-…`, fără erori | captura ieșirii |
| P-2 | B | „Conturi” → „Cont nou”: e-mail (**o adresă pe care o controlați**, folosită numai pentru acest test), nume afișat „Operator test Faza 6”, rolul **„Operator Primărie”** → „Creează contul”. Notați parola temporară pentru dvs., apoi apăsați „Am transmis parola, ascunde” | contul apare în listă, activ | captura **listei**, după ascunderea parolei (e-mailurile acoperite) |
| P-3 | C | `/#admin` → e-mailul operatorului + parola temporară → setați o parolă nouă | „Panou de Administrare Informații” | captură |

Pe adresa operatorului nu se trimite niciun e-mail: parola temporară apare numai pe ecran.

## 7. Proba M1 — fluxul unei sesizări

**Înainte de fiecare „Salvează” din panoul „Fluxul către Primărie” (pașii 1, 10, 16 și R-3):** uitați-vă la câmpul „Destinatarul tehnic al sesizărilor”. Trebuie să arate adresa dvs. de test, neschimbată. Nu scrieți în el. Dacă browserul l-a completat cu altceva, **nu salvați**: vă opriți (§3).

| Pas | Rând | Fereastra | Ce faceți | Ce trebuie să vedeți | Dovada |
|---|---|---|---|---|---|
| 1 | F7n | B | panoul „Fluxul către Primărie”: **debifați „Fluxul este pornit”**; nu schimbați altceva; verificați destinatarul → „Salvează” | „Setările fluxului către Primărie au fost salvate.” | captură (destinatarul acoperit) |
| 2 | F1 | A | „Sesizări” → „Depune o sesizare”, fără să fiți autentificat (dacă sunteți, apăsați „Ieșire”) | ecranul „Contul meu”; formularul nu apare | captură |
| 3 | F2 | A | bifați regulile → autentificare cu adresa de test (cod primit pe e-mail sau Google) | bara „Autentificat ca …” | captură (adresa acoperită) |
| 4 | F3 | A | formularul: categoria „Iluminat public”; descrierea „TEST Faza 6 – M1, sesizare cu transmitere”; locația (text); un pin pe hartă; o fotografie neutră (fără persoane, fără numere de înmatriculare); bifați **„Transmite sesizarea către Primărie”** și **„Anunță-mă pe e-mail când se schimbă stadiul”** → „Trimite sesizarea” | „Sesizarea a fost înregistrată”, cu numărul **`TM-` urmat de N + 1** | captură. **Acesta este `TM-A`.** Dacă numărul este altul, vă opriți (§3) |
| 5 | F5 | A | „Hartă”, imediat → click pe punctul sesizării | sesizarea este pe hartă, cu fotografia și stadiul „Nouă”; în fereastra ei nu apare adresa dvs. de e-mail | captură |
| 6 | F7n | A, B | A: „Sesizări” → „Sesizările mele”. B: „C. Sesizări” → căutați `TM-A` | A: `TM-A`, stadiul **„Nouă”**. B: pe card scrie **„În așteptare (flux oprit)”** | două capturi |
| 7 | F7n | e-mail | așteptați 3 minute | **niciun** mesaj „Sesizare TM-A — …” | confirmați în scris |
| 8 | F4, F7n | phpMyAdmin | **Q1** și **Q2**, cu `TM-A` | Q1: `new`, `pin`, o fotografie, transmitere cerută = 1. Q2: un singur rând, `registry_notification`, starea `on_hold` | captura celor două rezultate |
| 9 | — | phpMyAdmin | **Q6**, imediat înaintea repornirii fluxului | **exact un rând**: `TM-A`, `registry_notification`, `on_hold`. Dacă lipsește, dacă sunt mai multe rânduri sau dacă rândul arată altfel: **nu reporniți fluxul**; vă opriți (§3) | captura rezultatului |
| 10 | F6 | B | **numai dacă pasul 9 a arătat exact rândul așteptat:** panoul „Fluxul către Primărie”: **bifați „Fluxul este pornit”**; verificați destinatarul → „Salvează” | „Setările au fost salvate; 1 mesaje „în așteptare” au fost repuse în coadă.” | captură (destinatarul acoperit) |
| 11 | F6 | e-mail | așteptați până la 3 minute | mesajul „Sesizare TM-A — Iluminat public”, cu fotografia atașată | captura mesajului (adresele acoperite) |
| 12 | F7 | e-mail, A | așteptați încă până la 3 minute; apoi „Sesizările mele” → „Actualizează” | mesajul „Sesizarea TM-A — Iluminat public: în analiză”; în listă, stadiul **„În analiză”** | captura mesajului și captura listei |
| 13 | F6, F7 | phpMyAdmin | **Q1** și **Q2**, cu `TM-A` | Q1: `in_analysis`. Q2: `registry_notification` cu starea `sent` și `citizen_status_update` cu starea `sent`; ora de creare a celui de-al doilea rând (`created_at`) nu este mai mică decât ora trimiterii primului (`sent_at`) | captura rezultatelor |

**Protecția la repornirea fluxului.**

- **Protecția principală este pasul 9.** Fluxul se repornește numai după ce Q6 a arătat că singurul mesaj aflat în așteptare, în coadă sau în curs de trimitere este cel al sesizării `TM-A`.
- **Măsura de limitare, numai dacă la pasul 10 mesajul afișat arată alt număr decât 1:** debifați imediat „Fluxul este pornit” și apăsați „Salvează”; apoi vă opriți (§3). Aceasta este singura acțiune de „reparare” permisă în tot ghidul.
- **Măsura de limitare nu este o garanție.** Mesajele repuse în coadă pleacă la următoarea rulare a cozii, în cel mult 2 minute, dar posibil după numai câteva secunde. Dacă fluxul este oprit înaintea acelei rulări, mesajele se întorc în așteptare (`server/src/reports/outbox.ts`, rândurile 226–231); dacă nu, au plecat deja. Oprirea imediată reduce efectele, nu le exclude. Ce a plecat se vede apoi din Q6, din Q7 și din căsuța de test.

Ce dovedesc pașii 6–13: cât timp mesajul nu a plecat, sesizarea rămâne „Nouă”; devine „În analiză” numai după ce transmiterea este confirmată.

Opțional, pentru lipsa antetului `Reply-To`: în Gmail, la mesajul de la pasul 11, meniul ⋮ → „Afișează originalul”. O captură a antetelor, cu adresele acoperite.

## 8. Proba M2 — tranziții și permisiuni

**Atenție la sesizările existente.** De la pasul 16, cu Primăria „în platformă”, operatorul poate marca „rezolvată” orice sesizare „în analiză”, inclusiv pe cea rămasă din 08.10.2026. **„Rezolvată” este o stare finală: nu se poate readuce din aplicație.** Acționați numai asupra cardului pe care scrie `TM-A`. Nu apăsați „Preia de către Primărie” și „Marchează rezolvată” la nicio altă sesizare. Inventarul final (Q7) arată orice abatere, dar nu o repară.

| Pas | Rând | Fereastra | Ce faceți | Ce trebuie să vedeți | Dovada |
|---|---|---|---|---|---|
| 14 | F8n | B | „C. Sesizări” → căutați `TM-A` | **nu** există butonul „Marchează rezolvată”; există „Asumă” | captură |
| 15 | F8n | C | „C. Sesizări” → căutați `TM-A` → „Marchează rezolvată” | mesaj roșu: „Primăria nu participă prin platformă; starea „rezolvată” nu este disponibilă.” Stadiul rămâne „În analiză” | captură |
| 16 | — | B | panoul „Fluxul către Primărie”: participarea = **„Primăria lucrează în platformă (poate marca „rezolvată”)”**; „Fluxul este pornit” rămâne bifat; verificați destinatarul → „Salvează” | „Setările fluxului către Primărie au fost salvate.” | captură (destinatarul acoperit) |
| 17 | F8 | C | reîncărcați pagina (F5) → „C. Sesizări” → căutați `TM-A` → verificați că pe card scrie `TM-A` → „Marchează rezolvată” | stadiul devine **„Rezolvată”**; butonul dispare | captură |
| 18 | F8 | e-mail | căsuța adresei de test | mesajul „Sesizarea TM-A — Iluminat public: rezolvată” | captura mesajului |
| 19 | F8 | A | „Sesizările mele” → „Actualizează”; apoi „Hartă” → punctul sesizării | „Rezolvată” în listă și pe hartă | două capturi |
| 20 | F8 | phpMyAdmin | **Q1** și **Q3**, cu `TM-A` | Q1: `resolved`. Q3: un rând `report.resolution` | captura rezultatelor |
| 21 | F6n | A | a doua sesizare: descrierea „TEST Faza 6 – M2, fără transmitere”; locație și pin; **fără** bifa „Transmite sesizarea către Primărie” → „Trimite sesizarea” | confirmare cu numărul **`TM-` urmat de N + 2** | captură. **Acesta este `TM-B`.** Dacă numărul este altul, vă opriți (§3) |
| 22 | F6n | e-mail, phpMyAdmin | așteptați 3 minute; apoi **Q1** și **Q2**, cu `TM-B` | niciun mesaj nou pentru „Primărie”. Q1: `new`, transmitere cerută = 0. Q2: niciun rând | captura rezultatelor; confirmați în scris că nu a sosit niciun mesaj |
| 23 | F8n | C | „C. Sesizări” → căutați `TM-B` | **nu** există butonul „Marchează rezolvată” (sesizarea este „Nouă”) | captură |
| 24 | F9 | C | la `TM-A`: „Detalii și acțiuni” | **nu** apar: e-mailul autorului, „Jurnal e-mail”, „Drepturi exclusive super_admin”, „Șterge definitiv” | captură |
| 25 | F9 | B | la `TM-A`: „Detalii și acțiuni” | apar: e-mailul autorului, „Jurnal e-mail”, „Șterge definitiv” | captură (e-mailul acoperit) |

Pasul 20 se face **înaintea** ștergerilor: rândul de audit al rezolvării dispare odată cu sesizarea.

**Ștergerile.** Sunt definitive. Înaintea fiecărui „Da, șterge”, comparați numărul de pe ecran cu cel notat. Ștergeți numai `TM-A` și `TM-B`; nicio altă sesizare.

| Pas | Rând | Fereastra | Ce faceți | Ce trebuie să vedeți | Dovada |
|---|---|---|---|---|---|
| 26 | F10 | A | „Sesizările mele” → la rândul pe care scrie **`TM-B`**: „Șterge sesizarea” → verificați numărul → „Da, șterge” | `TM-B` dispare din listă; pe hartă nu mai apare | captură |
| 27 | F10 | B | „C. Sesizări” → căutați `TM-A` → la cardul pe care scrie **`TM-A`**: „Detalii și acțiuni” → „Șterge definitiv” → verificați numărul → „Da, șterge” | „Sesizarea TM-A a fost ștearsă definitiv.” | captură |
| 28 | F10 | phpMyAdmin | **Q1**, cu `TM-A` și `TM-B` | niciun rând | captura rezultatului |

## 9. Proba M3 — un vot la un sondaj de test

Sondajele demo nu se ating. Sondajul se creează, se votează și se închide; rămâne în arhivă (§2).

| Pas | Fereastra | Ce faceți | Ce trebuie să vedeți | Dovada |
|---|---|---|---|---|
| S-1 | B | „D. Sondaje Civice (4B)” → „Sondaj Nou”. Titlul: „TEST Faza 6 – sondaj de probă”. Descrierea: „Sondaj creat numai pentru proba manuală. Nu este o consultare reală.” Întrebarea: „Proba funcționează?”, cu variantele „Da” și „Nu”. „Status sondaj”: **„Activ (Deschis consultării)”**. „Vizibilitatea rezultatelor”: lăsați **„După închiderea consultării (recomandat)”**. Datele: lăsați-le cum sunt → „Salvează Sondajul” | sondajul apare în listă, activ, cu 0 voturi | captură |
| S-2 | A | „Sondaje” → la „TEST Faza 6 – sondaj de probă”: „Participă” → alegeți „Da” → „Trimite Răspunsurile” | „Răspunsurile dumneavoastră au fost înregistrate!” | captură |
| S-3 | A | „Închide fereastra” → lista sondajelor | la sondajul de test scrie „Ai participat deja”; butonul „Rezultate” **nu** apare la el (rezultatele se văd numai după închidere) | captură |
| S-4 | phpMyAdmin | **Q4** | la sondajul de test: `active`, 1 vot. La sondajele demo: aceleași numere ca în „Q4 inițial” | captura rezultatului |
| S-5 | A | al doilea vot, refuzat de server: F12 → fila „Application” → „Local Storage” → `https://test.urbisactiv.ro` → click dreapta pe rândul `tmc_survey_participation_hint` → „Delete”; închideți panoul (F12); reîncărcați pagina (F5); la sondajul de test: „Participă” → „Da” → „Trimite Răspunsurile” | „Ați participat deja la acest sondaj”; **nu** apare „Răspunsurile dumneavoastră au fost înregistrate!” | captură |
| S-6 | phpMyAdmin | **Q4** | la sondajul de test: tot 1 vot | captura rezultatului |
| S-7 | B | „D. Sondaje Civice (4B)” → la rândul „TEST Faza 6 – sondaj de probă”: „Inspectează” | întrebarea și rezultatele, vizibile în Admin; 1 vot | captură |
| S-8 | B | la **același rând**, „TEST Faza 6 – sondaj de probă”: „Închide”. **Închiderea este definitivă și nu cere confirmare: verificați titlul rândului înainte de a apăsa.** Nu apăsați coșul de gunoi | starea devine „Închis / Finalizat”; butoanele „Editează” și „Închide” dispar | captură |
| S-9 | A | „Sondaje” → reîncărcați (F5) → „Arhiva consultărilor încheiate” → „TEST Faza 6 – sondaj de probă” → „Rezultate” | rezultatele: 1 răspuns, „Da” 100% | captură |
| S-10 | phpMyAdmin | **Q4** | sondajul de test: `closed`, 1 vot; sondajele demo: neschimbate | captura rezultatului: „Q4 final” |

De știut la S-5: ștergeți numai rândul `tmc_survey_participation_hint`. Este un indiciu ținut în browser („Ai participat deja”); regula „un singur vot” o aplică serverul, iar pasul S-5 tocmai asta verifică.

## 10. Readucerea la starea inițială

Ordinea contează: **întâi se dezactivează operatorul, apoi se readuce modul.** Cât timp Primăria este „în platformă” și operatorul este activ, o sesizare existentă ar putea fi marcată „rezolvată” din greșeală.

| Pas | Fereastra | Ce faceți | Ce trebuie să vedeți | Dovada |
|---|---|---|---|---|
| R-1 | B | „Conturi” → la rândul „Operator test Faza 6”: „Dezactivează”. Verificați numele rândului înainte; nu apăsați la alt cont | starea contului: dezactivat; butonul devine „Reactivează” | captura listei (e-mailurile acoperite) |
| R-2 | C | **sesiunea operatorului nu mai este validă:** în fereastra C, în care operatorul era autentificat, reîncărcați pagina (F5); apoi încercați autentificarea cu e-mailul și parola lui | după reîncărcare apare ecranul de autentificare, nu panoul Admin; autentificarea este refuzată | două capturi: ecranul de după reîncărcare și refuzul |
| R-3 | B | panoul „Fluxul către Primărie”: participarea = **„Primăria primește numai e-mailuri”**; „Fluxul este pornit” rămâne **bifat**; verificați destinatarul → „Salvează” | „Setările fluxului către Primărie au fost salvate.” (fără mențiunea unor mesaje repuse în coadă) | captura panoului după salvare (destinatarul acoperit) |
| R-4 | A, B | „Ieșire” în ambele ferestre | — | — |

De ce trebuie să reușească R-2: la dezactivarea unui cont, aplicația îi închide și sesiunile deschise (`server/src/routes/adminAccounts.ts`, rândul 100). Dacă după reîncărcare fereastra C arată încă panoul Admin, vă opriți (§3).

## 11. Starea finală și comparația

| Pas | Unde | Ce faceți | Ce trebuie să vedeți | Dovada |
|---|---|---|---|---|
| Z-1 | phpMyAdmin | **Q0** | aceleași valori ca în „Q0 inițial” | captură: „Q0 final” |
| Z-2 | phpMyAdmin | **Q5** | diferențele din tabelul de mai jos | captură: „Q5 final” |
| Z-3 | phpMyAdmin | **Q6** | **niciun rând** | captură: „Q6 final” |
| Z-4 | phpMyAdmin | **Q7** | aceleași rânduri ca în „Q7 inițial” | captură: „Q7 final” |

„Q4 final” este captura de la pasul S-10.

**Ce trebuie să iasă la comparație.** Orice altă diferență este o abatere și se raportează:

| Ce se verifică | Interogarea | Final față de inițial |
|---|---|---|
| **setările fluxului au revenit:** `registry.flow_enabled`, `registry.primaria_mode`, amprenta din `registry.recipient_email`, `registry.agreement_reference` | Q0 | **identice**, valoare cu valoare (numai coloana `updated_at` diferă, pentru că setările au fost salvate) |
| **niciun mesaj în așteptare, în coadă sau în curs de trimitere** (`on_hold`, `queued`, `sending`) | Q6 | **niciun rând**, la fel ca la început |
| **sesizările existente nu și-au schimbat starea** | Q7 | **aceleași rânduri**, cu același stadiu, aceeași valoare la „preluată” și aceeași oră `updated_at`; `TM-A` și `TM-B` nu apar |
| sesizări, pe stadii | Q5 | identice |
| contor TM | Q5 | **+2** |
| conturi Admin | Q5 | `super_admin / active` tot 2; **un rând nou:** `primarie_operator / disabled`, cu valoarea 1 |
| conturi de cetățean | Q5 | identice |
| voturi | Q5 | **+1** |
| e-mail, rândurile `registry_notification` și `citizen_status_update` | Q5 | identice (mesajele lui `TM-A` s-au șters odată cu sesizarea) |
| e-mail, `citizen_login_code` | Q5 | + numărul de coduri cerute în probă (0, dacă v-ați autentificat cu Google) |
| sondajele demo | Q4 | identice |
| sondajul de test | Q4 | un rând nou: `closed`, 1 vot |

Comparația o fac eu, din capturi; dvs. nu trebuie să calculați nimic.

## 12. Interogările (numai citire)

În cPanel: Databases → phpMyAdmin → baza de date a aplicației → fila „SQL” → lipiți interogarea → „Go”. Înlocuiți `TM-A` și `TM-B` cu numerele notate (de exemplu `TM-012`); la pasul I-6 le lăsați neschimbate.

Interogările nu afișează adrese de e-mail, parole sau chei.

**Ce este verificat și ce nu:**

- **Verificat:** pe MySQL 8.0.46, în mediul local de test, cu schema creată de migrațiile proiectului și cu modul strict `ONLY_FULL_GROUP_BY` activ. Toate cele opt interogări rulează, iar fiecare tabelă și coloană folosită există în schemă.
- **Neverificat:** pe MariaDB 11.4, baza de date a staging-ului. Nicio interogare nu a fost rulată pe această versiune. De aceea pasul I-6 le încearcă pe toate înaintea oricărei modificări.

**Dacă una dă eroare, nu se schimbă nimic în baza de date; vă opriți (§3) și îmi trimiteți textul erorii.**

**Q0 — setările fluxului** (destinatarul apare numai ca amprentă de 8 caractere)

```sql
SELECT `key`,
       CASE WHEN `key` = 'registry.recipient_email'
            THEN CONCAT('amprenta: ', LEFT(SHA2(CAST(value AS CHAR), 256), 8))
            ELSE CAST(value AS CHAR) END AS valoare,
       updated_at
FROM settings WHERE `key` LIKE 'registry.%' ORDER BY `key`;
```

**Q1 — starea sesizărilor de test**

```sql
SELECT r.reference_number, r.resolution_status, r.location_source,
       r.city_hall_transmission_requested AS transmitere_ceruta, r.notify_opt_in AS notificari,
       (SELECT COUNT(*) FROM report_photos p WHERE p.report_id = r.id) AS fotografii, r.created_at
FROM reports r WHERE r.reference_number IN ('TM-A', 'TM-B');
```

**Q2 — e-mailurile unei sesizări (fără destinatari)**

```sql
SELECT r.reference_number, o.kind, o.status, o.mode_at_send, o.transport, o.attempts, o.created_at, o.sent_at
FROM email_outbox o JOIN reports r ON r.id = o.report_id
WHERE r.reference_number IN ('TM-A', 'TM-B') ORDER BY o.created_at;
```

**Q3 — auditul rezolvării**

```sql
SELECT r.reference_number, a.action, a.occurred_at, a.details
FROM audit_log a JOIN reports r ON r.id = a.target_id
WHERE a.action = 'report.resolution' AND r.reference_number = 'TM-A';
```

**Q4 — sondajele**

```sql
SELECT s.title, s.status, s.results_visibility, s.first_submission_at IS NOT NULL AS are_voturi, COUNT(x.id) AS voturi
FROM surveys s LEFT JOIN survey_submissions x ON x.survey_id = s.id
GROUP BY s.id, s.title, s.status, s.results_visibility, s.first_submission_at, s.created_at
ORDER BY s.created_at;
```

**Q5 — inventarul**

```sql
SELECT 'sesizari' AS ce, resolution_status AS detaliu, COUNT(*) AS n FROM reports GROUP BY resolution_status
UNION ALL SELECT 'contor TM', 'ultimul numar', `last_value` FROM report_counter
UNION ALL SELECT 'conturi Admin', CONCAT(role, ' / ', status), COUNT(*) FROM admin_users GROUP BY role, status
UNION ALL SELECT 'conturi de cetatean', status, COUNT(*) FROM citizen_accounts GROUP BY status
UNION ALL SELECT 'voturi', 'toate sondajele', COUNT(*) FROM survey_submissions
UNION ALL SELECT 'e-mail', CONCAT(kind, ' / ', status), COUNT(*) FROM email_outbox GROUP BY kind, status;
```

**Q6 — mesajele în așteptare, în coadă sau în curs de trimitere** (toate, de orice fel; fără destinatari)

```sql
SELECT COALESCE(r.reference_number, '(fara sesizare)') AS sesizare, o.kind, o.status, o.created_at
FROM email_outbox o LEFT JOIN reports r ON r.id = o.report_id
WHERE o.status IN ('on_hold', 'queued', 'sending') ORDER BY o.created_at;
```

**Q7 — sesizările existente** (numai numărul și starea; fără autor, fără descriere)

```sql
SELECT reference_number, resolution_status, city_hall_taken_over AS preluata, is_demo, updated_at
FROM reports ORDER BY reference_number;
```

## 13. Ce îmi trimiteți la final

1. Capturile, în ordinea pașilor, cu numărul pasului în numele fișierului (de exemplu `M1-04.png`, `Q5-initial.png`).
2. Valoarea N și numerele `TM-A` și `TM-B`.
3. Ora aproximativă a fiecărei probe.
4. Orice pas care a arătat altfel decât în ghid, chiar dacă vi se pare neimportant.

Eu trec fiecare rând într-una dintre listele raportului: trecut (cu dovada), eșuat, neefectuat. Un pas fără dovada cerută rămâne „neefectuat” (`FAZA_6_PLAN.md` §4).

## 14. Ce nu acoperă aceste probe

Rămân dovedite numai de testul automat (`tests/e2e/test_faza6_flux_critic.py`) și de testele serverului; în raport se trec ca atare, nu ca probe manuale:

- coordonatele publice cu cel mult 4 zecimale și fotografia publică fără EXIF;
- refuzurile serverului pentru cereri care nu au buton în interfață (de exemplu `super_admin` care ar cere „rezolvată”, operatorul care ar cere ștergerea);
- setarea manuală a stadiului „în analiză” (interfața nu are un asemenea buton);
- retenția de 45 de zile.

Nu fac parte din aceste probe: modul e-mail `live` și adresa reală a Primăriei; limitele pe adresă IP (Pasul 2, `TRUST_PROXY`); restaurarea unui backup (M4, ghid separat).

## 15. Constatare pentru reauditul de securitate (Pasul 4)

Consemnată aici la cererea proprietarului (10.10.2026). **Nu ține de probele M1–M3 și nu le împiedică. Codul de mentenanță nu a fost modificat.**

**Ce cere designul** (`docs/faza4/FAZA_4_B1_MODEL_DATE.md`, rândurile 267 și 346): `rate_limits` se păstrează cel mult 48 de ore (N4-4); `rejected_attempts`, 30 de zile (N4-8). Aceleași termene sunt scrise și în comentariile schemei (`server/src/db/schema/antiabuse.ts`, rândurile 14 și 29).

**Ce am găsit în cod** (căutare în tot `server/src`, la `e10c6e8`): nicio instrucțiune care să șteargă rânduri din `rate_limits` sau din `rejected_attempts`. Comanda de retenție (`server/src/maintenance.ts`, `purgeRetention`) șterge blocările expirate, auditul vechi, e-mailurile de cont vechi, textele libere ale sondajelor și încercările OAuth expirate, dar nu aceste două tabele.

**Urmarea, dacă se confirmă:** rândurile lor, care conțin amprente de IP (nu adrese), se adună fără limită, peste termenele din design.

**Observație din aceeași căutare, în afara cererii:** nici pentru `sessions` și `citizen_login_codes` nu am găsit o curățare periodică (codurile nefolosite se șterg numai la rotirea cheii TOTP). De verificat tot la reaudit.

**Limita acestei constatări:** este rezultatul unei căutări în cod, nu al unei probe. Nu am verificat dacă există o curățare în afara aplicației (de exemplu o sarcină a bazei de date) și nu am măsurat tabelele de pe staging.

**Propunere:** punctul intră în reauditul de securitate, la domeniile S4 (date personale) și S6 (limite anti-abuz) din `FAZA_6_PLAN.md`. Remedierea se decide separat; cere modificarea codului de mentenanță, deci aprobare.
