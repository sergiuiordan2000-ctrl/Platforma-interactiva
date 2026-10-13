# Faza 6, Pasul 3B — Raportul probelor manuale M1–M3 pe staging

**Proiect:** Urbis Activ · **Staging:** `https://test.urbisactiv.ro` · **Executate:** 10.10.2026 (16:44–17:45) și 11.10.2026 (08:45–09:51), ora României
**Ghid:** `docs/faza6/FAZA_6_GHID_PROBA_STAGING.md`, versiunea 3 (commit `d23ddd5`, amprenta fișierului `97c718e91a742599…`)
**Cine a executat:** proprietarul, pas cu pas; Claude a verificat fiecare dovadă înaintea pasului următor și nu a avut acces la staging, la cPanel sau la căsuța de e-mail.
**Stare:** **acceptat de proprietar la 14.10.2026, fără observații** (verdictul A). Scris la 11.10.2026 și păstrat neschimbat până la acceptare; adăugat în depozit la 14.10.2026. Nu conține adrese de e-mail personale, numele contului de găzduire, numele bazei de date sau secrete.

> **Note de la adăugarea în depozit (14.10.2026; textul raportului nu s-a schimbat):**
> - probele au rulat pe `08f4dc3`; de atunci, pe staging s-au instalat `27b1b5f` și `cb4cc45` (`docs/faza5/STAGING_URBISACTIV_JURNAL.md`). Fluxul de bază a fost reverificat parțial la instalarea `cb4cc45` (intervențiile 52–54);
> - O1 (§10): cauza era deja confirmată la 08.10.2026 (jurnalul staging-ului, observația 2): serverul web adaugă cererea de parolă a lacătului la orice răspuns 401; numai pe staging;
> - O2 este constatarea R15; erorile ghidului (§7) sunt corectate în `FAZA_6_GHID_PROBA_STAGING_ERATA.md`.

---

## 1. Verdict

| Proba | Verdict | Observație |
|---|---|---|
| **M1** — fluxul unei sesizări (pașii 1–13) | **trecută** | dovezi la fiecare pas; două abateri de execuție, fără efect asupra rezultatului (§7, A1 și A2) |
| **M2** — tranziții și permisiuni (pașii 14–28) | **trecută** | dovezi la fiecare pas |
| **M3** — un vot la un sondaj de test (S-1…S-10) | **trecută, cu o rezervă la S-5** | refuzul celui de-al doilea vot este dovedit de server prin deducție din captură, plus confirmarea proprietarului și numărătoarea din baza de date (§5, S-5) |
| Readucerea (R-1…R-4) și starea finală (Z-1…Z-4) | **conformă, cu o abatere** | conturi de cetățean `pending`: +2 față de inițial (§6, §7 A2) |

Nu s-a executat proba M4 (restaurarea unui backup). Nu s-a modificat cod, `civic.env`, configurația găzduirii, DNS-ul sau sarcinile cron. Modul e-mail a rămas `allowlist` pe toată durata.

**Ce nu dovedesc aceste probe** este în §9.

---

## 2. Starea inițială și condițiile de pornire (10.10.2026, numai citire)

| Pas | Rezultat | Dovada |
|---|---|---|
| I-1, Q0 | 4 rânduri: `flow_enabled` = `true`; `primaria_mode` = `"email_only"`; destinatar = amprenta `c0aa82e0`; `agreement_reference` = `null`; toate salvate la 2026-10-08 15:36:59 UTC | text copiat din phpMyAdmin |
| I-2, Q5 | sesizări: `new` 4, `in_analysis` 1; contor TM 5; conturi Admin: `super_admin / active` 2; conturi de cetățean: `pending` 1, `active` 1; voturi 27; e-mail: `registry_notification / sent` 1, `citizen_status_update / sent` 1, `citizen_login_code / sent` 2 | text copiat |
| I-3, Q4 | 3 sondaje demo: `draft` 0 voturi, `active` 0, `closed` 27 | text copiat |
| I-4, Q6 | niciun rând | captură |
| I-5, Q7 | TM-001…TM-004: `new`, nepreluate, demo, 2026-10-07 18:45:03.828; TM-005: `in_analysis`, nepreluată, ne-demo, 2026-10-08 15:41:15.547 | text copiat |
| I-6 | Q1, Q2 și Q3 rulează pe MariaDB fără eroare, zero rânduri | trei capturi |
| I-7 | panoul „Fluxul către Primărie”: „staging: numai adresele din listă”, destinatarul = adresa de test, „Primăria primește numai e-mailuri”, flux bifat | captură |
| I-8 | N = 5 | din Q5 |

**Verificare suplimentară, locală:** amprenta adresei afișate în panou, calculată de Claude cu aceeași formulă, este `c0aa82e0`, identică cu cea din Q0. Destinatarul din baza de date este deci adresa din panou.

**Toate condițiile de pornire din §5 al ghidului au fost îndeplinite** înaintea primei modificări. Riscul rămas din ghid (interogări nerulate niciodată pe MariaDB 11.4) s-a închis la I-1…I-6.

**Pregătirea:** P-1 backup `civic-backup-20261010T135915126Z`, `stderr` gol (captură); P-2 cont „Operator test Faza 6”, rol „Operator Primărie”, „activ · parolă temporară” (captura listei); P-3 prima autentificare a operatorului, panou fără fila „Conturi” (captură).

---

## 3. Proba M1 — fluxul unei sesizări (10.10.2026)

| Pas | Rând | Ce s-a verificat | Rezultat | Dovada |
|---|---|---|---|---|
| 1 | F7n | oprirea fluxului | flux oprit, destinatar și mod neschimbate | captura panoului după reîncărcare; captura mesajului de salvare (vezi A1) |
| 2 | F1 | fără cont nu se poate depune | ecranul „Contul meu”, fără formular | captură |
| 3 | F2 | autentificarea cetățeanului | „Autentificat ca …” (adresa de test), prin Google | captură (vezi A2) |
| 4 | F3 | depunere cu transmitere și notificări | „Sesizarea a fost înregistrată”, **TM-006** = N + 1, 17:31 | captură |
| 5 | F5 | apariția imediată pe hartă | pe hartă, cu fotografia, „Nouă”, fără e-mailul autorului | captură |
| 6 | F7n | stadiul cât timp fluxul e oprit | cetățean: „Nouă”; Admin: „În așteptare (flux oprit)” | două capturi |
| 7 | F7n | niciun e-mail cât timp fluxul e oprit | niciun mesaj pentru TM-006 la 5 minute după depunere | confirmare scrisă + Q2 de la pasul 8 |
| 8 | F4, F7n | datele salvate | Q1: `new`, `pin`, transmitere 1, notificări 1, 1 fotografie. Q2: un rând, `registry_notification`, `on_hold`, 0 încercări, `sent_at` gol | două capturi |
| 9 | — | **verificarea dinaintea repornirii** | Q6: **exact un rând**, TM-006 / `registry_notification` / `on_hold` | captură |
| 10 | F6 | repornirea fluxului | „Setările au fost salvate; **1** mesaje „în așteptare” au fost repuse în coadă.” | captură |
| 11 | F6 | e-mailul către „Primărie” | „Sesizare TM-006 — Iluminat public”, de la `no-reply@urbisactiv.ro`, un atașament (fotografia) | două capturi |
| 12 | F7 | trecerea la „în analiză” și notificarea | mesajul „Sesizarea TM-006 — Iluminat public: în analiză”; în lista cetățeanului „În analiză” | două capturi |
| 13 | F6, F7 | ordinea în baza de date | Q1: `in_analysis`. Q2: `registry_notification` `sent` la 14:40:02.708 UTC; `citizen_status_update` creat la 14:40:02.711 UTC, `sent` la 14:42:02.668 UTC | două capturi |

**Ce dovedește M1:** cât timp mesajul către Primărie nu a plecat, sesizarea rămâne „Nouă”; trece la „În analiză” numai după trimiterea confirmată; notificarea cetățeanului este creată după trimiterea către Primărie. Măsura de limitare de la pasul 10 nu a fost necesară.

Verificarea opțională a antetului `Reply-To` nu s-a făcut.

---

## 4. Proba M2 — tranziții și permisiuni (11.10.2026)

| Pas | Rând | Ce s-a verificat | Rezultat | Dovada |
|---|---|---|---|---|
| 14 | F8n | `super_admin` nu poate marca „rezolvată” | la TM-006 există „Asumă”, nu există „Marchează rezolvată” | captură |
| 15 | F8n | operatorul, în modul „numai e-mailuri” | mesaj roșu: „Primăria nu participă prin platformă; starea „rezolvată” nu este disponibilă.”; stadiul rămâne „În analiză”; „Rezolvate” = 0 | captură |
| 16 | — | trecerea la „Primăria lucrează în platformă” | panoul înainte de salvare (mod nou, flux bifat, destinatar neschimbat) + mesajul de salvare | două capturi |
| 17 | F8 | operatorul marchează „rezolvată” | „Sesizarea TM-006 a fost marcată „rezolvată”.”; cardul „Rezolvată”, butonul dispare | două capturi |
| 18 | F8 | notificarea cetățeanului | mesajul „Sesizarea TM-006 — Iluminat public: rezolvată” | captură |
| 19 | F8 | stadiul public | „Rezolvată” în lista cetățeanului și pe hartă; TM-005 neatinsă | două capturi |
| 20 | F8 | urma în baza de date | Q1: `resolved`. Q3: un rând `report.resolution`, `in_analysis` → `resolved`, 05:50:31 UTC | două capturi |
| 21 | F6n | a doua sesizare, fără transmitere | **TM-007** = N + 2, 08:57; „Fără transmitere către Primărie”, „Fără notificări” | captură |
| 22 | F6n | nimic nu pleacă fără bifă | niciun mesaj la peste 5 minute; Q1: `new`, transmitere 0; Q2: niciun rând | confirmare scrisă + două capturi |
| 23 | F8n | operatorul, la o sesizare „Nouă” | la TM-007 nu există „Marchează rezolvată” | captură |
| 24 | F9 | ce vede operatorul | la TM-006: poziție, fotografie, note interne; **nu** apar e-mailul autorului, „Jurnal e-mail”, „Drepturi exclusive super_admin”, „Șterge definitiv” | captură |
| 25 | F9 | ce vede `super_admin` | la TM-006: e-mailul autorului, „Drepturi exclusive super_admin”, „Jurnal e-mail (3)” (toate `sent`), „Șterge definitiv” | captură |
| 26 | F10 | autorul își șterge sesizarea | TM-007 dispare din listă; harta revine la 5 sesizări | două capturi |
| 27 | F10 | `super_admin` șterge definitiv | „Sesizarea TM-006 a fost ștearsă definitiv.”; lista: 5 sesizări | două capturi |
| 28 | F10 | baza de date | Q1 pentru TM-006 și TM-007: niciun rând | captură |

**Ce dovedește M2:** „rezolvată” este disponibilă numai operatorului Primăriei și numai în modul „în platformă”; operatorul nu vede datele autorului și nu poate șterge; ambele căi de ștergere (autor, `super_admin`) elimină sesizarea.

---

## 5. Proba M3 — un vot la un sondaj de test (11.10.2026)

| Pas | Ce s-a verificat | Rezultat | Dovada |
|---|---|---|---|
| S-1 | crearea sondajului de test | „TEST Faza 6 – sondaj de probă”, activ, 1 întrebare, 0 voturi; sondajele demo neschimbate | formularul înainte de salvare + lista |
| S-2 | votul | „Răspunsurile dumneavoastră au fost înregistrate!” | captură |
| S-3 | indiciul și vizibilitatea rezultatelor | „Ai participat deja”; buton „Vezi detalii”; fără „Rezultate” la sondajul de test | captură |
| S-4 | Q4 | sondajul de test `active`, 1 vot; demo 0 / 0 / 27 | captură |
| S-5 | al doilea vot, refuzat | „Ați participat deja la acest sondaj” | captură + confirmare (vezi mai jos) |
| S-6 | Q4 | sondajul de test: tot **1** vot | captură |
| S-7 | Admin vede rezultatele înainte de închidere | „Inspectează”: structura, 1 vot. „Rezultate”: 1 răspuns, „Da” 100% | două capturi (vezi A8) |
| S-8 | închiderea | „Sondajul „TEST Faza 6 – sondaj de probă” a fost închis și arhivat.”; „Închis / Finalizat”; fără „Editează” și „Închide” | două capturi |
| S-9 | rezultatele publice după închidere | în arhivă: 1 răspuns, „Da” 100%, „Nu” 0% | captură |
| S-10 | Q4 final | sondajul de test `closed`, 1 vot; demo neschimbate | captură (a doua încercare, vezi A9) |

**Rezerva de la S-5.** Mesajul „Ați participat deja la acest sondaj” apare în aplicație în două situații: din indiciul ținut în browser, fără nicio cerere către server, sau după refuzul serverului (409). Captura singură nu le deosebește. Că refuzul a venit de la server rezultă din trei elemente luate împreună:

1. în captură, în spatele ferestrei, ambele sondaje deschise au butonul „Participă”; înainte de ștergerea indiciului, sondajul de test avea „Vezi detalii”. Indiciul din browser nu mai exista, deci fereastra s-a deschis cu formularul;
2. proprietarul a confirmat că a bifat „Da” și a apăsat „Trimite Răspunsurile” înaintea mesajului;
3. Q4 de la S-6 arată tot 1 vot.

Captura tabelului gol din „Local Storage”, cerută înaintea votului, lipsește. O dovadă directă (de exemplu rândul din `rejected_attempts`) ar fi cerut o interogare în afara ghidului și nu s-a făcut.

---

## 6. Readucerea și starea finală

| Pas | Rezultat | Dovada |
|---|---|---|
| R-1 | „Operator test Faza 6”: „dezactivat”, buton „Reactivează”; conturile `super_admin` active | captura listei |
| R-2 | fereastra operatorului arată ecranul de autentificare; autentificarea refuzată: „E-mail sau parolă incorecte.” | două capturi |
| R-3 | „Primăria primește numai e-mailuri”, flux bifat, destinatar neschimbat; mesajul de salvare fără mesaje repuse în coadă | captura mesajului + captura panoului după reîncărcare |
| R-4 | ieșirea din conturi | fără dovadă (ghidul nu cere) |

La R-2, ultima activitate a operatorului fusese cu 37 de minute înainte, sub limita de 60 de minute. Sesiunea a fost deci închisă de dezactivare, nu de expirare.

**Comparația finală (11.10.2026, 09:48–09:51):**

| Ce se verifică | Interogarea | Inițial | Final | Așteptat | Rezultat |
|---|---|---|---|---|---|
| `registry.flow_enabled` | Q0 | `true` | `true` | identic | ✔ |
| `registry.primaria_mode` | Q0 | `"email_only"` | `"email_only"` | identic | ✔ |
| amprenta destinatarului | Q0 | `c0aa82e0` | `c0aa82e0` | identic | ✔ |
| `registry.agreement_reference` | Q0 | `null` | `null` | identic | ✔ |
| mesaje `on_hold` / `queued` / `sending` | Q6 | niciun rând | niciun rând | niciun rând | ✔ |
| sesizările existente (stadiu, preluare, `updated_at`) | Q7 | TM-001…TM-005 | aceleași 5 rânduri, valoare cu valoare | identic | ✔ |
| sesizări pe stadii | Q5 | 4 `new`, 1 `in_analysis` | 4, 1 | identic | ✔ |
| contor TM | Q5 | 5 | 7 | +2 | ✔ |
| `super_admin / active` | Q5 | 2 | 2 | identic | ✔ |
| `primarie_operator / disabled` | Q5 | — | 1 | rând nou | ✔ |
| conturi de cetățean `active` | Q5 | 1 | 1 | identic | ✔ |
| **conturi de cetățean `pending`** | Q5 | **1** | **3** | **identic** | **abatere: +2** |
| voturi | Q5 | 27 | 28 | +1 | ✔ |
| `registry_notification / sent` | Q5 | 1 | 1 | identic | ✔ |
| `citizen_status_update / sent` | Q5 | 1 | 1 | identic | ✔ |
| `citizen_login_code / sent` | Q5 | 2 | 2 | +0 (Google) | ✔ |
| sondajele demo | Q4 | 0 / 0 / 27 | 0 / 0 / 27 | identic | ✔ |
| sondajul de test | Q4 | — | `closed`, 1 vot | rând nou | ✔ |

Setările diferă numai la `updated_at` (acum 2026-10-11 06:44:57 UTC), cum prevede ghidul.

---

## 7. Abateri

| Nr. | Pas | Abaterea | Efect | Cum s-a tratat |
|---|---|---|---|---|
| A1 | 1 | setările fluxului s-au salvat de două ori (a doua oară pentru a prinde mesajul în captură) | niciunul: aceeași valoare, flux oprit | starea dovedită prin captura panoului după reîncărcare |
| A2 | 3 | s-a cerut cod de autentificare pentru adrese din afara listei permise (două adrese, după spusele proprietarului), în locul adresei de test | **+2 conturi de cetățean `pending`**, permanente; niciun e-mail trimis (numărătoarea codurilor a rămas 2) | oprire, raport, apoi reluare cu adresa de test, cu aprobarea proprietarului. Numărul de două adrese se sprijină pe declarația proprietarului și pe numărătoarea din Q5 |
| A3 | toate | ferestrele: B în Edge, C în Chrome obișnuit, A în Chrome incognito (ghidul: B Chrome privat, C alt browser, A Chrome obișnuit) | niciunul: trei sesiuni separate | — |
| A4 | — | probele s-au întins pe două zile; între M1 și M2 a fost o pauză de circa 15 ore, cu operatorul activ și modul „numai e-mailuri” | niciunul constatat: Q7 final arată sesizările existente neschimbate | ghidul nu prevedea pauza |
| A5 | — | commit și push al ghidului V3 (`d23ddd5`) în timpul probelor | numai documentație | excepție aprobată explicit de proprietar, pentru un singur fișier |
| A6 | S-1 | descrierea sondajului fără diacritică și punct („reala”); întrebarea de tip „Alegere multiplă” (ghidul nu preciza tipul) | rămâne așa în arhivă | — |
| A7 | S-5 | ștergerea indiciului s-a făcut din bara panoului, nu din meniul de click dreapta (versiunea de Chrome nu mai are „Delete” acolo); captura intermediară lipsește | dovada refuzului este parțial dedusă (§5) | — |
| A8 | S-7 | ghidul greșea: „Inspectează” arată structura și numărul de voturi, nu rezultatele | un click în plus, numai privit, pe „Rezultate” | oprire, raport, aprobarea proprietarului |
| A9 | S-10 | prima încercare a fost respinsă de cPanel („Error code: 403”, sesiune expirată); interogarea nu a rulat | niciunul | oprire, raport, repetată o singură dată cu aprobarea proprietarului |
| A10 | 11, R-3 | prima captură era incompletă (fără subiect și atașament, respectiv fără panou) | niciunul | completată cu o a doua captură |

**phpMyAdmin:** 25 de rulări reușite, cât permite ghidul, toate `SELECT` din §12, plus o încercare respinsă de cPanel (A9). În cPanel nu s-a făcut altceva decât backupul de la P-1.

**Erori ale ghidului de corectat dacă se refolosește:** textul de la S-7 (A8); metoda de ștergere de la S-5 (A7); la pasul 3 trebuie spus explicit că numai adresa de test primește cod; conturile de cetățean `pending` nu erau în lista urmelor posibile; mesajele de confirmare dispar în câteva secunde, deci captura trebuie pregătită înainte.

---

## 8. Urme permanente și e-mailuri trimise

**E-mailuri trimise: 3, toate către adresa de test a proprietarului.**

| Mesaj | Când | Dovada |
|---|---|---|
| „Sesizare TM-006 — Iluminat public”, cu fotografia | 10.10.2026, 17:40 | captură + Q2 |
| „Sesizarea TM-006 — Iluminat public: în analiză” | 10.10.2026, 17:42 | captură + Q2 |
| „Sesizarea TM-006 — Iluminat public: rezolvată” | 11.10.2026, după 08:50 | captură + „Jurnal e-mail (3)” |

Niciun cod de autentificare (intrarea s-a făcut cu Google). Niciun mesaj către alte adrese: modul a rămas `allowlist`, iar pentru adresele din afara listei aplicația nu pune nimic în coadă.

**Ce rămâne pe staging:**

| Urmă | Detaliu |
|---|---|
| contorul TM | 7; numerele TM-006 și TM-007 nu se mai folosesc |
| cont Admin | „Operator test Faza 6”, `primarie_operator / disabled` |
| conturi de cetățean | 2 conturi `pending` în plus (A2), cu codurile lor nefolosite |
| sondaj | „TEST Faza 6 – sondaj de probă”, închis, 1 vot, vizibil în arhiva publică a staging-ului |
| vot | 1 rând în plus |
| backup | `civic-backup-20261010T135915126Z` |
| setări | aceleași valori; alt `updated_at` |
| jurnal de audit, limite de trafic, încercări respinse | rânduri noi, neinventariate (interogările ghidului nu le acoperă) |

Sesizările TM-006 și TM-007 nu mai există. Rândurile lor din coada de e-mail au dispărut odată cu ele (Q5: 1 / 1, ca la început).

---

## 9. Limitele dovezilor

- **Nu s-a verificat direct** că ștergerea definitivă a eliminat fișierele fotografiilor de pe disc și rândurile din jurnalul de audit ale sesizării. S-a verificat că sesizarea și e-mailurile ei nu mai există în baza de date.
- **Lipsa unui e-mail** (pașii 7 și 22) se sprijină pe confirmarea scrisă a proprietarului și pe Q2 (`on_hold`, respectiv niciun rând). Împreună sunt suficiente; confirmarea singură nu ar fi fost.
- **S-5:** vezi rezerva din §5.
- **Versiunea de pe staging** (`08f4dc3`, după jurnal) nu a fost reverificată în cadrul acestor probe.
- Probele au rulat în modul `allowlist`, cu un singur tester, de pe un singur calculator. Nu spun nimic despre modul `live`, despre telefon sau despre mai mulți utilizatori simultan.
- Capturile au fost trimise în conversație și nu sunt în depozit. Unele conțin adrese de e-mail neacoperite; nu se publică.

---

## 10. Observații pentru reauditul de securitate (Pasul 4) și riscuri rămase

| Nr. | Observație | Stare |
|---|---|---|
| O1 | La autentificarea în Admin pe staging reapare caseta lacătului site-ului („Sign in”), inclusiv la o parolă greșită. Ipoteză neverificată: răspunsul „neautorizat” al aplicației este luat de browser drept cerere a lacătului. | de lămurit; pe site-ul public, fără lacăt, nu ar trebui să apară |
| O2 | O cerere de cod pentru o adresă nouă creează un cont de cetățean `pending` înainte de verificarea listei permise. Conturile rămân. Nu am verificat dacă există o curățare a lor. | de verificat, împreună cu constatarea existentă despre lipsa curățării (`rate_limits`, `rejected_attempts`, `sessions`, `citizen_login_codes`) |
| O3 | „Marchează rezolvată” și „Închide” (sondaj) sunt definitive și nu cer confirmare. În modul „în platformă”, operatorul poate rezolva orice sesizare „în analiză”. | funcționează cum a fost proiectat; o eventuală confirmare este decizie de produs, a proprietarului, și ar modifica designul înghețat |
| O4 | Mesajul de salvare a setărilor fluxului este același indiferent de valoarea salvată, deci nu confirmă starea. | minor |
| O5 | În conversație au ajuns de trei ori adrese cPanel cu identificatorul sesiunii. Sesiunile au expirat între timp. | fără acțiune; de evitat pe viitor |

**Riscuri și blocaje rămase, neschimbate de aceste probe:**

- `TRUST_PROXY` este nerezolvat: aplicația vede aceeași adresă pentru toți vizitatorii, deci limitele pe IP sunt comune. Rămâne blocant pentru reauditul de securitate și pentru lansare. Tichetul către furnizor nu are încă răspuns consemnat.
- Proba M4 (restaurarea unui backup) nu este făcută.
- Pasul 2 (verificarea `TRUST_PROXY`), Pasul 4 (reauditul de securitate) și Pasul 5 (raportul Fazei 6) sunt nefăcute.
- `PROJECT_HANDOFF_CURRENT.md` nu este actualizat cu Faza 6.

---

## 11. Ce urmează (numai cu aprobarea proprietarului)

1. Auditul acestui raport.
2. Dacă este acceptat: adăugarea lui în `docs/faza6/` și commit, cu aprobare separată.
3. Decizia asupra pașilor rămași din planul Fazei 6.
