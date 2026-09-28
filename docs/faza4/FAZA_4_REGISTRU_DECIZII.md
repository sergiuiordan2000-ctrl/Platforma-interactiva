# FAZA 4 — REGISTRUL DECIZIILOR

**Proiect:** Turnu Măgurele Civic · **Revizia 7 (versiune curată), 28.09.2026** · **Executant:** Claude · **Aprobare:** Sergiu

> Acest registru înlocuiește `FAZA_4_DECIZII_NOI.md` (versiunea adnotată rămâne în `istoric/revizia_6_adnotata/`).
>
> Conține numai deciziile **valabile**, fiecare cu sursa ei. Deciziile înlocuite nu mai apar aici; istoricul lor este în `istoric/`.

---

## 1. Surse și identificatori

| ID | Sursa (în `istoric/`) | Data |
|---|---|---|
| **DN-xx, S1-x, E-3, pct. 7, C-1…C-4** | `FAZA_4_INSTRUCTIUNI_CLAUDE_01.md`; răspunsurile C-1…C-4 în `FAZA_4_RAPORT_MODIFICARI_SET_01.md` | 27.09.2026 |
| **D8…D31** | `FAZA_4_DECIZII_8_31_INSTRUCTIUNI_CLAUDE.md` | 27.09.2026 |
| **A-1…A-9** | `FAZA_4_DECIZII_A1_A9_INSTRUCTIUNI_CLAUDE.md` | 27.09.2026 |
| **2.1…2.15**, corecturile 1–13 | `TMC_FAZA_4_INSTRUCTIUNI_CLAUDE_SET_A_02.md` | 27.09.2026 |
| **K-A02-3, REC-01, B-7, K-A02-4, DN-19, DN-04** | `Turnu_Magurele_Civic_INSTRUCTIUNI_SET_A03.md` | 28.09.2026 |
| **A04-1…A04-8** | `Turnu_Magurele_Civic_SET_DECIZII_INTEGRARE.md` (+ corecția din conversație: contul nu se șterge automat) | 28.09.2026 |
| **A05-1…A05-4** | `Turnu_Magurele_Civic_SET-A-05_FINAL_RETENTIE.md` | 28.09.2026 |
| **A06-1…A06-6** | răspunsurile directe ale lui Sergiu în conversație, consemnate în `FAZA_4_RAPORT_MODIFICARI_REVIZIA_7.md` | 28.09.2026 |
| **Faza 3** (N-2, N-3, D6, D8, D3/D4, N-4, D10, D9, A-17) | `PROJECT_RULES_AND_DECISIONS.md` §11 | 27.09.2026 |

---

## 2. Deciziile valabile

### 2.1 Utilizarea aplicației și contul cetățeanului

| ID | Decizia |
|---|---|
| A-9, D29 | Aplicația se folosește **complet fără cont** (Acasă, Comunicate, Hartă, Sondaje, Ghid etc.). Contul se cere **numai** la „Depune o sesizare”. |
| N4-2 | Votul rămâne public, fără cont. |
| A-9, D29 | Contul are **numai e-mailul**; fără nume, telefon, CNP sau adresă. |
| D30 | Un e-mail = un singur cont; fără identificarea persoanei reale. |
| D31 | Contul devine activ după confirmarea e-mailului. |
| 2.9 | La crearea contului, bifă explicită de acceptare a politicii de utilizare (sesizări reale, informații corecte, limbaj decent, utilizare neabuzivă, responsabilitate pentru conținut). |
| 2.7 | Cetățeanul își poate șterge contul; sesizările lui rămân (până la termenul lor), fără identitate publică. |
| **A04-2** | Contul cetățeanului **nu se șterge automat** (nici după 45 de zile, nici după inactivitate). |
| A-8 | Numai `super_admin` vede e-mailul cetățeanului în Admin; `primarie_operator` nu îl vede, nici indirect (corectura 3). |

### 2.2 Sesizarea: depunere, locație, publicare

| ID | Decizia |
|---|---|
| D9, A-2 | Sesizarea apare **imediat** pe hartă; fără moderare prealabilă. |
| 2.3 | **Nu există moderare** (nici înainte, nici după publicare); `reports.moderate` se elimină. |
| D9, DN-12 | Identitatea / e-mailul autorului nu sunt niciodată publice. |
| 2.8 | Fără opțiunea „Public / Public anonim”. |
| A-3, DN-21 | Textul locației este public imediat; descrie locul problemei, nu autorul. |
| 2.4 | Locația: punct pe hartă (inclusiv poziția curentă) **sau** adresă (stradă + număr) geocodată automat, cu pin aproximativ verificabil. Fără poziție validă: sesizarea se salvează, dar nu apare pe hartă. |
| **A06-5** | Geocodarea folosește **serviciul public OpenStreetMap (Nominatim)**. |
| 2.12 | Sesizări numai în interiorul **UAT Turnu Măgurele**, verificat pe server. |
| 2.10 | Fotografiile devin publice imediat, fără verificare; responsabilitatea aparține utilizatorului. |
| A-7 | Starea sesizării este publică. |
| D27, D28, A-6 | Lista proprie a sesizărilor există în MVP; autorul vede exact ce vede publicul (inclusiv starea). |

### 2.3 Stările și transmiterea către Primărie

| ID | Decizia |
|---|---|
| DN-09, C-2 | Numai 3 stări: `nouă` → `în analiză` → `rezolvată`; fără tranziții arbitrare. |
| 2.1 | `nouă` → `în analiză` **automat, numai** după trimiterea efectivă a e-mailului către Primărie. |
| DN-09, SET-A-02 §3 | `rezolvată` numai prin subcontul Primăriei (dacă Primăria participă). O sesizare netransmisă nu poate deveni `rezolvată`. |
| C-3 | Asumarea și preluarea nu schimbă starea. |
| pct. 7, C-4 | Transmiterea către Primărie este **opțională**, la cererea cetățeanului; fără cerere, sesizarea rămâne `nouă`. |
| DN-12, D29 | Dacă cere transmiterea, Primăria primește numai e-mailul contului. |
| S1-6 | Transmiterea prin e-mail nu depinde de existența subcontului Primăriei. |
| 2.13 | Flux către Primărie oprit: sesizarea rămâne `nouă`, transmiterea așteaptă și se reia **automat** la reactivare. |
| 2.14 | Maximum **3 transmiteri către Primărie / cont / 24 h**, pe backend. |

### 2.4 Notificări și e-mailuri către cetățean

| ID | Decizia |
|---|---|
| 2.2 | Notificări de stare **numai** la `nouă → în analiză` și `în analiză → rezolvată`. |
| **A06-2** | **Fără e-mail de confirmare** la depunere. |
| **A06-3** | **Fără răspuns al Primăriei către cetățean** prin aplicație; numai note interne. |
| **A06-6** | La încercarea de a crea un cont nou cu un e-mail blocat definitiv, titularul primește pe e-mail „Această adresă nu mai poate fi folosită pentru un cont nou.”; pe ecran apare mesajul generic obișnuit. |

### 2.5 Ștergerea și numerotarea

| ID | Decizia |
|---|---|
| A-1, D19–D22 | Autorul își poate șterge **definitiv** sesizarea, în orice stare (regula 6.1 este abrogată). |
| D10–D12, A-5 | `super_admin` poate șterge definitiv orice sesizare, necondiționat. |
| D23, D24 | Fără notificarea Primăriei la ștergere; sesizarea ștearsă nu mai poate fi operată. |
| D25, D26 | `TM-XXX` unic, rezervat definitiv, nereutilizat. |
| **B-7** | Ștergerile definitive **nu** se auditează; nu rămâne în audit o urmă care să permită reconstituirea. |
| **A05-4** | Jurnalul e-mail al unei sesizări se șterge **odată cu sesizarea**. |

### 2.6 Blocarea cetățeanului

| ID | Decizia |
|---|---|
| D8, D13–D18, A-5 | Numai `super_admin` blochează; blocarea afectează **numai** depunerea de sesizări noi (contul, autentificarea, votul, conținutul public rămân). |
| **K-A02-4** | Blocare **15 zile** (expirare automată) sau **definitivă**. Pentru blocarea definitivă se păstrează numai identificatorul minim care împiedică recrearea contului cu același e-mail; retenția nu o anulează. |
| 2.6 | Blocarea este asociată contului / e-mailului, nu unei identități reale. |
| 2.6, **A06-4** | `super_admin` poate ridica manual **orice** blocare (temporară înainte de termen sau definitivă), cu audit. |
| **A05-3** | După expirarea sau ridicarea unei blocări temporare, informația rămâne în auditul administrativ (6 luni). |

### 2.7 Retenția datelor

| ID | Decizia |
|---|---|
| 2.5, **K-A02-3**, **REC-01**, **A04-1** | Datele unei sesizări (sesizarea, fotografiile, e-mailurile și alte date aferente) se păstrează **45 de zile de la depunere**, în măsura în care ștergerea este posibilă legal și tehnic. **Fără** excepție de ≈ 90 de zile; backup-urile sunt o problemă tehnică de implementare. |
| **A04-4** | Auditul administrativ (fără legătură cu o sesizare): **6 luni**, apoi ștergere automată. |
| **A05-1** | Jurnalele aplicației: **6 luni**. Sesiunile expirate: **6 luni**. |
| **A05-2**, **A06-1** | Textele libere din sondaje: **6 luni de la închiderea sondajului**. |
| N4-8 | `rejected_attempts`: 30 de zile. |
| D3 | Sondajele și arhiva publică nu intră în regula de 45 de zile. |

### 2.8 Drepturi, permisiuni, administrare

| ID | Decizia |
|---|---|
| DN-01 | Exact 3 permisiuni noi, numai `super_admin`: `accounts.manage`, `notifications.recipient.manage`, `audit.view`. Fără a 4-a permisiune. |
| A-5 | Ștergerea sesizărilor și blocarea sunt drepturi exclusive ale rolului `super_admin`, în afara matricei. |
| 2.11 | Exclusiv `super_admin`: corectarea poziției, reîncercarea unui e-mail eșuat, jurnalul e-mailurilor. |
| DN-02 | Fără istoric al asumărilor individuale; auditul nu reconstituie asumările. |
| DN-12 | Fără funcție separată de anonimizare. |
| 2.15 | Recuperarea TOTP: coduri de unică folosință **și** resetare de către alt `super_admin`, distincte și auditate. |

### 2.9 Sondaje

| ID | Decizia |
|---|---|
| E-3 | Închidere automată pe server la `endDate`; voturile noi respinse; rezultatele finale în arhiva publică. |
| corectura 1 | Fără vizibilitatea `admin_only` a rezultatelor (D3: arhivă publică). |

### 2.10 Comunicate, proces, mediu

| ID | Decizia |
|---|---|
| DN-19, **A04-5** | Imaginile comunicatelor sunt păstrate în repository și livrate de aplicație; fără CDN, fără stocare externă. |
| DN-04, **A04-6** | Lista T1–T8 din `FAZA_4_00_ARHITECTURA_SI_INDEX.md` §6 se păstrează **exact**. |
| DN-05, **A04-7** | La începutul Fazei 5 se creează un **branch nou, dedicat Fazei 5**, din checkpoint-ul Fazei 4; `recovery-etapa-5-0e2cc20` rămâne baza Fazei 4. |
| DN-07, **A04-8** | Mediul local de dezvoltare: **Windows 11**. |

---

## 3. Reguli din RULES (Faza 3) înlocuite de Faza 4

Se consemnează în `PROJECT_RULES_AND_DECISIONS.md` și `PROJECT_HANDOFF_CURRENT.md` la **P-13**, la cererea proprietarului, înainte de Faza 5.

| Regula din RULES | Înlocuită de |
|---|---|
| 6.1 „sesizările nu se șterg” | A-1 |
| 3E, 6.6-a, D6-2 („și aprobate”): moderarea prealabilă | D9, A-2, 2.3 |
| 5C (4 stadii, orice tranziție; axa moderării), 6.6-g | DN-09, C-2, C-3, 2.3 |
| 5D (24 / 13 permisiuni) | 23 / 12 (2.3) + 3 noi (DN-01) |
| 6.6-b, 6.6-i (stadiul nepublic; contactul vizibil ambelor roluri) | A-7, A-8 |
| A17-3 (transmitere automată) | pct. 7, C-4 |
| A17-5, A17-6 (acordul separat; datele de contact) | DN-12, D29 |
| D6-5 (operatorul corectează poziția) | 2.11 |
| D9-3, D9-4, D9-5 (preluarea notificată; răspunsul către cetățean) | 2.2, A06-3 |
| D9-6 (urmărire numai prin e-mail) | A-6 |
| D9-8 (stadiul nepublic) | A-7 |
| N3-6 (confirmarea la depunere) | A06-2 |
| N4-2 (interpretată larg ca „fără conturi de cetățeni”) | rămâne valabilă **numai pentru vot**; conturile pentru sesizări: A-4, D29 |
| D14 (durata blocării la alegere) | K-A02-4 (15 zile sau definitiv) |
| Plan v1.1 / Master Plan: fluxul `Admin → Moderare → Hartă` | A-2 |

---

## 4. Propuneri tehnice de confirmat la auditul final

Nu sunt decizii de produs. Au fost proiectate de Claude ca consecințe ale deciziilor de mai sus.

| ID | Propunerea | Unde |
|---|---|---|
| T-A1…T-A10 | conturile cetățenilor (tabele, cod de 6 cifre pe e-mail, fără parolă, pe medii), ștergerea tranzacțională, lista `SUPER_ADMIN_EXCLUSIVE`, anti-abuz pentru coduri, e-mail normalizat `UNIQUE`, completarea 5.2 / 5.4 | B1 §3.7, B3 §8, B4 §2.4, B7 |
| T-B2…T-B4, T-B6, T-B7, T-B9 | netransmisă → nu poate deveni `rezolvată`; `in_analysis` nu se setează manual; starea `on_hold`; limita UAT din OSM; codurile de recuperare ca HMAC + CLI de urgență; utilizatorul blocat vede că este blocat și termenul | B1, B2, B3 |
| T-B8 | la ștergerea contului: notificările către cetățean se anulează; cele către Primărie pleacă fără e-mailul cetățeanului | B1 §3.7 |
| T-C1, T-C3 | referința retenției = `reports.created_at`; auditul sesizării se șterge odată cu ea | B1 §3.8, §3.9 |
| T-C5…T-C7 | 15 zile calculate de server; datele minime ale blocării definitive (`id`, `kind`, `email_hash`); refuzul recreării fără enumerare | B1 §3.7, B2 §4.1 |
| T-C9 | validarea `imageUrl` față de lista imaginilor din build; CSP `img-src` fără domenii externe | B1 §3.3, B2 |
| T-D1 | **backup-urile:** respectarea regulii de 45 de zile în copiile de siguranță — problemă tehnică de implementare, de rezolvat la 5.1 (G6) | B1 §3.8, `00` R-17 |
| T-D2, T-D3 | `purge:retention`: audit administrativ la 6 luni; conturile nu sunt atinse | B1 §3.9 |
| T-D4 | numele branch-ului Fazei 5, la pornirea fazei | — |
| T-D5 | mediul local pe Windows 11: Docker Desktop (WSL 2) cu MySQL 8.4 + captare SMTP, sau instalare nativă | `00` §4 |
| T-E1…T-E3 | blocarea expirată: rândul se șterge, expirarea se auditează (`system`); cascadă `email_outbox`; rotația jurnalelor și `purge:sessions` | B1, B2, B4 §5 |
| A06-6 (tehnic) | tipul nou `citizen_account_blocked`; plafon propus 1 / adresă / 24 h | B1 §3.5, B2 §4.1, B6 |
| P-4, P-5, P-9, P-10, P-11, P-12 | tranzițiile excluse → 409; identificatorii `new` / `in_analysis` / `resolved`; `resolved` = `actsForCityHall` + `primaria_mode = platform`; acoperirea `notifications.recipient.manage`; închiderea sondajelor (calcul la cerere + cron); valoarea „nesolicitat” | B1, B2, B4 |
| DN-03 (rest) | integritate / proof-of-work → `surveys.edit`; respingeri → `surveys.view`; textele libere → numai `super_admin`, după închidere | B4 §2.3 |
| DN-06 | npm workspaces (`server/`, `shared/`); modifică `package.json` la 5.1 | `00` §3 |
| DN-14 | datele de referință de producție: seed versionat, revizuit de proprietar | B1 §5 |
| DN-15 | toate valorile numerice (sesiuni, limite, `scrypt`, fișiere, retry), configurabile | B2, B3, B6, B7 |
| DN-16 | biblioteca `qrcode` pentru înrolarea TOTP | B3 §5 |
| DN-17 | TOTP obligatoriu pe staging și în producție de la 5.2 | B3 §5 |
| DN-20 | migrațiile ca pas explicit la deploy | `00` §7 |
| DN-22 (rest) | proof-of-work activabil și pentru sesizări | B7 |
| DN-23, DN-24 | `node:test`; captare SMTP (Mailpit) numai în CI / local | B10, `00` §6 |
| E-2, E-5, E-6, E-9 | „închis” = arhivă publică; fluxul Primăriei testabil pe staging (`allowlist`); schimbările de UI (fără „Reset Demo”, `registryEmail` informativ); numărul de tabele | B2, B6, B1 §7 |

---

## 5. Puncte deschise

| Tip | Punct |
|---|---|
| Decizii de produs | **niciuna** |
| Problemă tehnică de implementare | **T-D1** (backup-urile), la 5.1 |
| Sarcină documentară | textul politicii de utilizare (2.9) |
| Verificare de date | poligonul UAT (T-B6): descărcare și verificare vizuală de către proprietar, la 5.4 |
| Verificare juridică | informarea, consimțămintele, retenția (E-6 din checkpoint-ul Fazei 3), înainte de „date reale” |
| Acțiune la cerere | **P-13:** actualizarea RULES, HANDOFF, Plan v1.1, Master Plan |
| Porți ulterioare (checkpoint-ul Fazei 3, lista E-1…E-10) | infrastructura de producție și domeniul Civic (G6, G7), numele staging-ului (G4), acordul scris al Primăriei (A17-1), furnizorul de e-mail (N3-2), întrebările HostGate, D2 / D5 / D7, P7 (la 5.2, numai cu aprobare) |
