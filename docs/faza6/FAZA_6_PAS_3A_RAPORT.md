# FAZA 6 — PASUL 3A: TESTUL AUTOMAT CAP-COADĂ (raport)

**Proiect:** Urbis Activ · **Branch:** `faza-5-backend` · **Data:** 10.10.2026 · **Plan:** `FAZA_6_PLAN.md`, Pasul 3A
**Stare:** lucrul autorizat este făcut și verificat; commit-ul și push-ul au fost aprobate de proprietar la 10.10.2026, numai pentru fișierele din §1. Codul aplicației, schema, contractele API, `civic.env` și staging-ul nu au fost atinse.
**Baza:** `faza-5-backend` = `490c07b`; `main` = `d9bc2c9`, neatins.

## 1. Ce s-a făcut

| Fișier | Stare | Conținut |
|---|---|---|
| `tests/e2e/test_faza6_flux_critic.py` | nou | testul cap-coadă: 17 verificări, un singur drum prin F1–F10, cu probele negative |
| `tests/lib/fake_smtp.mjs` | nou | server SMTP fals, local: cere STARTTLS și autentificare, scrie mesajele într-un fișier temporar, nu retransmite nimic |
| `tests/lib/harness.py` | modificat | `fake_smtp()` (pornește serverul fals, generează certificatul TLS la rulare, citește mesajele, șterge la ieșire tot ce a creat: §6); `run_cli()` (rulează o comandă a aplicației cu setările serverului de test); `backend_server()` întoarce și setările de mediu |
| `tests/run_all.py` | modificat | suita nouă, adăugată în listă |
| `tests/README.md` | modificat | două rânduri de descriere |
| `docs/faza6/` | nou | planul aprobat, ghidul probelor manuale M1–M3, acest raport |

**Testul a putut fi scris fără nicio modificare a aplicației.** E-mailul trece prin transportul SMTP real al aplicației (TLS obligatoriu, autentificare, atașamente). Certificatul serverului fals ajunge la aplicație prin variabila standard `NODE_EXTRA_CA_CERTS`. Mesajele din coadă se trimit cu `outbox:process`, aceeași comandă pe care o rulează cron pe staging.

## 2. Ce verifică testul

Un cetățean, un vizitator fără cont, un `super_admin` și un operator al Primăriei, fiecare în browserul lui, pe aplicația pornită local.

| Verificare | Rândul din plan | Pe scurt |
|---|---|---|
| F1 | F1 | fără cont nu se depune; harta merge fără cont |
| F2 | F2 | fără bifa regulilor: refuz și niciun e-mail; cu bifă: codul sosește prin SMTP, cu TLS, și autentifică |
| F3 | F3 | depunere cu fotografie, pin, transmitere și notificări → `TM-XXX` |
| F4 | F4 | ce s-a salvat: autorul, poziția, fotografia, stadiul „nouă” |
| F5 | F5 | pe hartă imediat; fără e-mail și fără ID intern; coordonate cu cel mult 4 zecimale; fotografie fără EXIF |
| F7n(1) | F7n | transmitere cerută, dar fluxul oprit: mesajul așteaptă, stadiul rămâne „nouă” |
| F6 | F6 | la pornirea fluxului pleacă mesajul către Primărie: TLS, fără `Reply-To`, cu fotografia atașată; coada: `sent` |
| F7 | F7 | abia după `sent`: „în analiză” (DB, listă, hartă, Admin) și notificarea autorului |
| F6n | F6n | fără cererea cetățeanului: niciun rând de transmitere, niciun e-mail |
| F7n(2) | F7n | „în analiză” nu se poate seta manual (409 pentru ambele roluri) |
| F8n(1) | F8n | cu Primăria „numai e-mailuri”, nimeni nu poate marca „rezolvată” |
| F8n(2) | F8n | cu Primăria „în platformă”: o sesizare „nouă” nu poate deveni „rezolvată” (409); `super_admin` rămâne refuzat (403) |
| F8 | F8 | operatorul marchează „rezolvată”: stadiu, notificare, audit; a doua oară 409 |
| F9 | F9 | operatorul nu vede e-mailul autorului, jurnalul e-mail, nu poate șterge; fără sesiune: 401 |
| F10 | F10 | ștergere de autor și de `super_admin`; numărul `TM` nu se refolosește |
| E-mail | — | în tot fluxul: exact 4 mesaje, toate cu TLS, numai către adresele din listă |
| JS | — | nicio eroare JavaScript în pagini |

## 3. Rezultate

Rulate de Claude la 10.10.2026, în mediul local de lucru (MySQL 8.0.46, Node 22.22, Chromium). Nimic nu a rulat pe staging. Toate au fost rulate din nou, complet, după corecția din §6; rezultatele de mai jos sunt cele de după corecție.

| Verificare | Rezultat |
|---|---|
| `npm run lint`, `typecheck` (server), build frontend, build server | trec |
| suita serverului | **289 / 289** (neschimbată) |
| suita Python (`tests/run_all.py`) | **167 / 167** (150 de dinainte + 17 noi) |
| testul nou, singur | 17 / 17, în circa 95 de secunde |
| `git diff --check` | curat |

**CI:** rulează după publicarea acestor fișiere; rezultatul se consemnează în raportul Fazei 6. Jobul E2E din CI are nevoie de `openssl` (există pe imaginea folosită) și de `smtp-server` (dependență de test deja instalată).

## 4. Așteptări ale testului corectate în timpul scrierii

La prima rulare, 3 din 16 verificări au picat. În toate trei era greșită **așteptarea mea**, nu aplicația. Le consemnez, pentru că sunt adaptări ale testului:

| Verificare | Ce presupusesem | Ce face aplicația | Corecția |
|---|---|---|---|
| F5 | fotografia publică are peste 1000 de octeți | fotografia de probă, rescrisă de aplicație, are 566 de octeți | testul verifică semnătura fișierului (JPEG sau WebP), nu o mărime arbitrară; verificarea „fără EXIF” a rămas |
| F6 | atașamentul este `image/jpeg` | atașamentul este `foto-1.webp` | testul acceptă JPEG sau WebP și cere ca atașamentul să aibă exact mărimea fotografiei publice |
| F8n | operatorul primește 409 la o sesizare „nouă” | cu Primăria „numai e-mailuri”, serverul răspunde întâi 403 (participarea), apoi ar verifica stadiul | verificarea a fost împărțită: F8n(1) în modul „numai e-mailuri”, F8n(2) în modul „în platformă”, unde apare 409 |

Niciuna nu a slăbit o regulă: în toate cazurile, criteriul din plan este verificat în continuare.

A patra schimbare: ordinea de la F10. Inițial, numărul `TM` era verificat cât timp exista încă o sesizare cu număr mai mare, caz în care un număr refolosit nu ar fi fost observat. Acum ambele sesizări ale fluxului sunt șterse înainte de depunerea celei de-a treia (proba de control M14 arată că testul prinde refolosirea).

## 5. Probele de control

Pe o copie a proiectului (în afara repository-ului, fără `git stash`), codul aplicației a fost stricat intenționat, câte o regulă pe rând; testul a fost rulat de fiecare dată, apoi fișierul a fost readus la original. Martor: testul nemodificat, în aceeași copie, 17 / 17.

| # | Regula stricată | Verificarea care a picat |
|---|---|---|
| M1 | harta ascunde sesizările „noi” (ca și cum ar exista moderare) | F5 |
| M2 | e-mailul către Primărie pleacă și fără cererea cetățeanului | F6n |
| M3 | „în analiză” se pune la depunere, înaintea transmiterii | F7n(1), F4 |
| M4 | după trimiterea confirmată, stadiul nu se mai schimbă | F7 |
| M5 | „în analiză” se poate seta manual | F7n(2) |
| M6 | `super_admin` poate marca „rezolvată” | **F8n(2)**, nu F8n(1) (vezi mai jos) |
| M7 | „rezolvată” este permisă și cu Primăria „numai e-mailuri” | F8n(1) |
| M8 | o sesizare „nouă” poate deveni „rezolvată” | F8n(2) |
| M9 | la „rezolvată” autorul nu mai este anunțat | F8 |
| M10 | operatorul poate șterge o sesizare | F9 |
| M11 | mesajele pleacă cu `Reply-To` | F6 |
| M12 | fotografia nu mai este atașată la mesajul către Primărie | F6 |
| M13 | coordonatele publice nu mai sunt rotunjite | F5 |
| M14 | numărul `TM` se refolosește după ștergere | F10 |
| M15 | ștergerea de către autor nu șterge nimic | F10 |
| M16 | la „în analiză” autorul nu mai este anunțat | F7 |

**16 din 16 abateri au fost detectate; 15 la verificarea la care mă așteptam.** Excepția, M6: mă așteptam să pice F8n(1), dar a picat F8n(2). Explicația: în modul „numai e-mailuri”, `super_admin` este refuzat oricum, din cauza modului, deci F8n(1) nu poate deosebi cele două reguli. Regula „`super_admin` nu poate marca rezolvată” este păzită de F8n(2), în modul „în platformă”.

Tranzițiile de stare cerute de plan sunt toate acoperite: „nouă” → „în analiză” (M3, M4, M5), „în analiză” → „rezolvată” (M6, M7, M8), transmiterea numai la cerere (M2).

## 6. Verificarea fișierelor temporare (cerută de proprietar înainte de commit)

**Problemă găsită și corectată, numai în codul de test.** În prima formă, `fake_smtp()` crea un director temporar (cheia privată TLS, certificatul, fișierul cu mesajele primite) și **nu îl ștergea**. După rulările de până atunci rămăseseră 22 de asemenea directoare în directorul temporar al sistemului, în afara repository-ului. Le-am șters.

**Corecția** (`tests/lib/harness.py`, numai funcția `fake_smtp()`): tot ce urmează creării directorului este într-un bloc `try … finally`, care oprește serverul fals și șterge directorul în orice situație. Lipsa lui `openssl` este tratată explicit. Fișierele se închid după citire. Aplicația nu a fost atinsă.

Verificat cu un script de lucru (în afara repository-ului), care numără directoarele rămase după fiecare situație:

| Situația | Rămân fișiere? |
|---|---|
| ieșire normală | nu |
| excepție în corpul testului | nu |
| `sys.exit` în corpul testului | nu |
| întrerupere de la tastatură (Ctrl + C) | nu |
| `openssl` lipsește | nu |
| `openssl` eșuează | nu |
| serverul SMTP fals nu pornește | nu |
| testul real, oprit de o eroare la pornire (fără baza de date) | nu |
| testul real, complet (17 / 17) | nu |

Probă de control: cu linia de ștergere scoasă (pe copie), același script raportează „rămân fișiere” în toate cele șapte situații ale lui.

În timpul rulării: directorul are drepturile `0700`, cheia privată `0600`, iar directorul este în afara repository-ului.

**Ce nu poate fi garantat:** dacă procesul de test este oprit forțat (`kill -9`, pană de curent), blocul `finally` nu mai rulează și directorul rămâne. Conține numai o cheie de test, generată la acea rulare și valabilă două zile, și mesaje de test cu adrese fictive (`exemplu.test`).

**Repository-ul:**

- în arborele de lucru nu există niciun fișier `.pem`, `.key`, `.crt`, `.jsonl` sau `.env`;
- în fișierele comise nu există chei private, certificate, mesaje de test, adrese reale de e-mail, numele contului de găzduire sau parole. Parola serverului SMTP fals se generează aleator la fiecare rulare și nu este scrisă nicăieri;
- un fișier generat a apărut în timpul verificării: `tests/lib/__pycache__/…pyc`, produs de scriptul meu de lucru, nu de teste. L-am șters; nu este comis. Suitele de teste nu produc asemenea fișiere (opresc scrierea lor înainte de a încărca harness-ul).

**Observație, neschimbată:** `backend_server()` creează de mult (din 5.4) un director temporar pentru fotografiile de test și nu îl șterge. Privește toate suitele, nu Pasul 3A, așa că nu l-am modificat; conține numai copii ale fotografiei de probă din repository. O corecție se poate decide separat.

## 7. Limite

1. **Serverul de e-mail este fals și local.** Testul dovedește drumul aplicației (TLS, autentificare, expeditor, atașament, coadă), nu livrarea printr-un furnizor real. Aceasta rămâne pentru proba manuală M1.
2. **`outbox:process` este rulat de test**, în locul sarcinii cron. Faptul că cron rulează pe găzduire se vede numai pe staging.
3. **Fără probă de control în această rundă** pentru: F1 (fără cont), bifa regulilor din F2 și lipsa EXIF din F5. Aici aceste reguli sunt numai verificate, nu și stricate intenționat. Ele sunt verificate și de testele lor proprii (`C-1`, `C-2` din suita 5.4; fotografia fără EXIF în testele serverului).
4. **Retenția de 45 de zile** nu face parte din acest test; rămâne în testele serverului, cu ceas simulat.
5. Testul adaugă circa 95 de secunde la suita Python.
6. Testul rulează pe MySQL 8.0 local. Pe MariaDB 11.4 nu a rulat (în CI, suita Python rulează numai pe MySQL 8.4).

## 8. Observații, fără nicio modificare făcută

1. **Semnătura mesajului către Primărie** spune „platforma independentă Turnu Măgurele Civic” (numele vechi). Ține de decizia deschisă despre redenumirea în „Urbis Activ”; nu am schimbat nimic.
2. **Notificarea „în analiză”** pleacă la următoarea rulare a cozii (cel mult 2 minute pe staging), nu în aceeași clipă cu mesajul către Primărie. Este comportamentul proiectat; ghidul probei manuale ține cont de el.
3. **Butonul „Marchează rezolvată”** îi apare operatorului și când Primăria primește „numai e-mailuri”; apăsarea lui dă mesajul de refuz al serverului. Regula este respectată; este numai o observație de interfață.

## 9. Ce urmează (fiecare cu aprobare separată)

1. CI pentru commit-ul acestor fișiere.
2. Probele manuale M1–M3, după `FAZA_6_GHID_PROBA_STAGING.md`.
3. Proba M4 (restaurarea), Pasul 2 (`TRUST_PROXY`), Pasul 4 (reauditul), conform planului.
