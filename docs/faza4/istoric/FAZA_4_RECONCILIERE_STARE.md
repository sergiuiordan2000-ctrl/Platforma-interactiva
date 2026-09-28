# FAZA 4 — RECONCILIEREA STĂRII PROIECTULUI

**Proiect:** Turnu Măgurele Civic · **Data:** 28.09.2026 · **Executant:** Claude
**Instrucțiune:** „INSTRUCȚIUNE — RECONCILIEREA STĂRII PROIECTULUI” (28.09.2026)

> Repository nemodificat. Nu am creat Revizia 4, nu am modificat documente, RULES, HANDOFF sau Master Plan, nu am făcut commit sau push și nu am luat nicio decizie.
>
> Neconcordanțele găsite sunt **marcate**, nu reparate.
>
> Unde sursele nu permit o concluzie: **NECLAR / NECONFIRMAT**.

**Prescurtări folosite pentru documente** (toate la commitul `3c586d0`):

| Prescurtare | Document |
|---|---|
| `IDX` | `docs/faza4/FAZA_4_00_ARHITECTURA_SI_INDEX.md` |
| `B1` | `docs/faza4/FAZA_4_B1_MODEL_DATE.md` |
| `B2` | `docs/faza4/FAZA_4_B2_API.md` |
| `B34` | `docs/faza4/FAZA_4_B3_B4_AUTENTIFICARE_AUTORIZARE.md` |
| `B58` | `docs/faza4/FAZA_4_B5_B8_SESIZARI_DATE_PERSONALE.md` |
| `B67` | `docs/faza4/FAZA_4_B6_B7_EMAIL_ANTISPAM.md` |
| `B10` | `docs/faza4/FAZA_4_B10_TESTARE.md` |
| `DN` | `docs/faza4/FAZA_4_DECIZII_NOI.md` |
| `S01` | `docs/faza4/istoric/FAZA_4_INSTRUCTIUNI_CLAUDE_01.md` |
| `R01` | `docs/faza4/istoric/FAZA_4_RAPORT_MODIFICARI_SET_01.md` (conține răspunsurile C-1…C-4) |
| `D831` | `docs/faza4/istoric/FAZA_4_DECIZII_8_31_INSTRUCTIUNI_CLAUDE.md` |
| `A19` | `docs/faza4/istoric/FAZA_4_DECIZII_A1_A9_INSTRUCTIUNI_CLAUDE.md` |
| `RA01` | `docs/faza4/istoric/FAZA_4_RAPORT_MODIFICARI_SET_A_01.md` |
| `SA02` | `docs/faza4/istoric/TMC_FAZA_4_INSTRUCTIUNI_CLAUDE_SET_A_02.md` |
| `RA02` | `docs/faza4/FAZA_4_RAPORT_MODIFICARI_SET_A_02.md` |
| `RULES` | `PROJECT_RULES_AND_DECISIONS.md` |
| `HANDOFF` | `PROJECT_HANDOFF_CURRENT.md` |
| `INSTR-REC` | instrucțiunea de reconciliere de azi, §7–§13 |

---

## 1. Punctul de revenire

| Element | Valoare / constatare |
|---|---|
| Branch | `recovery-etapa-5-0e2cc20` |
| Commit checkpoint | `3c586d0fab43ebec0e6c03a1b1e9cd54812a0f62`: „docs(faza-4): checkpoint revizia 3 dupa SET-A-02” (Claude, celălalt chat, 27.09.2026, 23:02) |
| GitHub | branch-ul = `3c586d0`; `main` = `d9bc2c9` (neatins). Verificat cu `git ls-remote`. |
| Conținutul commitului | 21 de fișiere noi, **toate** sub `docs/faza4/`; niciun fișier de cod. Codul este identic cu `cb9f47e`. |
| Verificări | în mesajul commitului: tsc, build, 102/103 (P7 = `R6D-SES-01`, FAIL cunoscut). **Nu le-am rerulat**: diferența este numai documentară. |
| Clona locală din această sesiune | la `cb9f47e`, curată, cu un commit în urma GitHub. Numai `git fetch`, fără pull. |
| Planul v1.1 și Master Planul | **nu sunt în repository.** Există numai în pachetul de transfer, în afara repository-ului. Le-am verificat indirect, prin citatele din `DN` / `A19`. |
| Testele existente | `tests/` (Python + Playwright) reflectă regulile Fazelor 0–3 (vezi §5, rândul R-19) |

---

## 2. Ce este aprobat

Includ numai deciziile care au sursă scrisă: o instrucțiune a lui Sergiu / ChatGPT sau un răspuns al lui Sergiu consemnat. Statusul tuturor este **APROBAT**.

**Coloana „Integrare”** indică unde apare decizia în Revizia 3. Coloana „Înlocuiește” trimite la regulile din RULES (Faza 3) sau la decizii anterioare ale Fazei 4.

### 2.1 Setul 01 (sursa: `S01`; C-1…C-4: `R01` §1, răspunsurile lui Sergiu din chat, consemnate de Claude)

| ID | Decizia | Integrare | Înlocuiește |
|---|---|---|---|
| DN-01 | exact 3 permisiuni noi (`accounts.manage`, `notifications.recipient.manage`, `audit.view`), exclusiv `super_admin`; fără a 4-a | B34 §2.2; `DN` DN-01 | — |
| DN-02 | fără istoric al asumărilor individuale; auditul nu reconstituie asumările | B1 `audit_log`; B34 §5 | — (confirmă 6.6) |
| E-3 | închiderea automată a sondajelor la `endDate`, pe server | B1 §3.4; B2 §2; B10 | — |
| DN-12 | fără funcție de anonimizare; identitatea autorului nu este publică; Primăria primește numai e-mailul, la cererea cetățeanului | B2; B58 §5; B8 | A17-5 / A17-6 (partea despre datele de contact) |
| DN-09 | 3 stări strict controlate: `nouă` → `în analiză` → `rezolvată`; `rezolvată` numai prin subcontul Primăriei; e-mailul nu depinde de subcont | B1; B2; B34 §3; B58 §4 | 5C (stadiile), D9-3 |
| Pct. 7 | transmiterea către Primărie este opțională; fără cerere, sesizarea rămâne `nouă` | B2 `transmitToCityHall`; B58 §1; B67 §3 | A17-3 |
| C-2 | numai 3 stări; `closed` dispare pentru sesizări | idem DN-09 | 5C |
| C-3 | asumarea și preluarea nu schimbă starea | B58 §4; B10 | 6.6-g |
| C-4 | pct. 7 înlocuiește A17-3 | B67 §3 | A17-3 |
| DN-21 | textul locației este public; descrie locul problemei, nu identifică autorul | B58 §3 | — (partea „după moderare” a fost înlocuită de A-3) |

### 2.2 Deciziile 8–31 (sursa: `D831`)

| ID | Decizia | Integrare | Înlocuiește |
|---|---|---|---|
| D8 | blocarea abuzului la sesizări + politica de utilizare | B1 `citizen_blocks`; B34 §8 | — |
| D9 | publicare imediată pe hartă; fără moderare prealabilă; fără identitatea autorului | B58 §3; B2 `map-reports` | 3E, 6.6-a, D6-2 („și aprobate”) |
| D10–D12 | ștergerea definitivă a oricărei sesizări, numai de `super_admin`, necondiționat | B2 `DELETE /admin/reports/:id`; B1 §3.8 | 6.1 |
| D13–D18 | blocarea: numai `super_admin`, temporară sau permanentă, numai pentru depunerea de sesizări noi | B1; B2; B34 §2.4 | — |
| D19–D24 | autorul își șterge sesizarea definitiv, în orice stare; fără notificarea Primăriei; sesizarea ștearsă nu mai poate fi operată | B58 §6; B67 §1 | 6.1 |
| D25–D26 | `TM-XXX` unic, rezervat definitiv | B1; B10 | — |
| D27–D28 | lista proprie; autorul vede exact ce vede publicul | B2 §4.2 | D9-6 |
| D29–D31 | cont numai pentru depunerea sesizărilor; un e-mail = un cont; e-mail confirmat | B1 §3.7; B34 §8 | C-1 |

### 2.3 A-1…A-9 (sursa: `A19`)

| ID | Decizia | Integrare | Înlocuiește |
|---|---|---|---|
| A-1 | ștergerea definitivă; 6.1 abrogată; `R6.1` se revizuiește | B10 §4 | RULES 6.1 |
| A-2 | publicarea imediată înlocuiește moderarea prealabilă | B58 §3 | 3E, 6.6-a, D6-2, Master Plan, Plan v1.1 |
| A-3 | textul locației public imediat | B58 §3 | DN-21 / pct. 7 („după moderare”) |
| A-4 | contul de cetățean (numai e-mail) | B34 §8 | C-1 |
| A-5 | ștergerea și blocarea: drepturi exclusive `super_admin`, fără permisiuni noi | B34 §2.4 | — |
| A-6 | lista proprie există în MVP | B2 §4.2 | D9-6 |
| A-7 | starea sesizării este publică | B2 `map-reports`; B58 §3 | 6.6-b, 6.6-i, D9-8 („stadiu”) |
| A-8 | numai `super_admin` vede e-mailul cetățeanului | B2 §6.1; B34 | 6.6-i („datele cetățeanului”) |
| A-9 | aplicația funcționează fără cont; contul cu e-mail confirmat se cere numai la depunerea sesizării | B34 §8; B2 §4.1 | — |

### 2.4 SET-A-02 (sursa: `SA02` §2 și §5)

| ID | Decizia | Integrare (după `RA02` §1) | Înlocuiește |
|---|---|---|---|
| 2.1 | `nouă` → `în analiză` numai după trimiterea efectivă | B1; B2; B34 §3; B58 §1, §4; B67 §1 | — |
| 2.2 | notificări către cetățean **numai** la cele două schimbări de stare | B1; B2; B58 §5; B67 §3–§5 | D9-3, D9-5 (răspunsul către cetățean), N3-6 (vezi §4, rândul 2) |
| 2.3 | fără moderare după publicare; `reports.moderate` eliminat | B1; B2 §6.1; B34 | 5C (axa moderării), 5D |
| 2.4 | locația: punct pe hartă / poziția curentă **sau** adresă geocodată cu pin aproximativ; fără poziție validă → nu apare pe hartă | B1; B2; B58 §1, §3 | — |
| 2.5 | retenție 45 de zile (sesizare, e-mailuri / jurnale e-mail, fotografii, date cont, backup-uri); `TM-XXX` rezervat | B1 §3.9; B2; B58 §6; B67 §6 | — |
| 2.6 | blocarea: temporară sau permanentă; ridicare manuală de `super_admin`; legată de cont / e-mail | B1; B2; B34 §8 | — |
| 2.7 | ștergerea contului; sesizările rămân | B1; B2; B34 §8 | — |
| 2.8 | fără „Public / Public anonim” | B1; B2; B58 §3 | — |
| 2.9 | acceptarea explicită a politicii de utilizare la crearea contului | B1 §3.7; B2; B34 §8 | — |
| 2.10 | fotografiile sunt publice imediat, fără verificare | B58 §2 | — |
| 2.11 | corectarea poziției, reîncercarea e-mailului și jurnalul e-mail: exclusiv `super_admin` | B2; B34; B67 §6 | D6-5 („operatorul”) |
| 2.12 | numai în UAT Turnu Măgurele, verificat pe server | B1; B2; B58 §1 | — |
| 2.13 | flux indisponibil → în așteptare (rămâne `nouă`), reluare automată | B1 `on_hold`; B58 §1; B67 | propunerea DN-10 (revizia 0) |
| 2.14 | maximum 3 transmiteri către Primărie / utilizator / 24 h, pe backend | B2; B67 §3, B7 §2; B10 | — |
| 2.15 | recuperarea TOTP: coduri de unică folosință + resetare de către alt `super_admin`, auditate | B1; B2; B34 §5 | propunerea DN-18 |
| §5, pct. 1–13 | corecturile obligatorii (`admin_only` eliminat; operatorul nu vede e-mailul nici prin jurnal; câmpurile și testele lipsă; numărul de tabele etc.) | `RA02` §2 | — |

### 2.5 Reconfirmate explicit prin `INSTR-REC` §7–§13

Toate corespund deciziilor de mai sus; nu aduc reguli noi.

- §7 = A-9 / D29
- §8 = 2.4 + 2.12 (+ D6-3)
- §9 = 2.1 / 2.13
- §10 = 2.5 (durata)
- §11 = D9 / A-2 / 2.3
- §12 = A-1 / D19–D26
- §13 = A-5 / A-8 / 2.11

### 2.6 Deciziile Fazei 3

`RULES` §11.1–§11.10 rămân **APROBATE** acolo unde nu sunt înlocuite de cele de mai sus.

---

## 3. Ce este integrat

| Set | Integrat în Revizia 3 | Marcaj | Raport |
|---|---|---|---|
| Setul 01 + C-1…C-4 | da (din Revizia 1) | [SET-01] | `R01` |
| D8–D31 + A-1…A-9 | da (din Revizia 2) | [SET-A-01] | `RA01` |
| 2.1–2.15 + corecturile 1–13 | da | [SET-A-02] | `RA02` §1–§2 |
| Deciziile Fazei 3 | da, în designul inițial (revizia 0) | — | `IDX` §10 |

**Neintegrate în afara `docs/faza4/`:**
- `RULES`, `HANDOFF`, Planul v1.1 și Master Planul **nu** conțin nicio decizie a Fazei 4 (P-13; §8).

**Integrare incompletă** (reziduuri documentare; §6.B):
- deciziile sunt aplicate, dar în mai multe locuri a rămas text vechi nemarcat.

---

## 4. Ce este doar propunere tehnică

Toate elementele de mai jos au statusul **NECONFIRMAT**: le-am propus sau le-am dedus eu (Claude), și nu există o aprobare explicită a lui Sergiu.

- **Sunt aplicate în Revizia 3.**
- **Nu sunt decizii ale utilizatorului.**
- Unele sunt consecințe directe ale textului aprobat; le marchez „consecință literală”, dar tot NECONFIRMAT.

| # | Ce am propus / presupus | Unde este aplicat | Documente afectate |
|---|---|---|---|
| 1 | **T-B1:** tipul „răspuns către cetățean” dispare; toate răspunsurile devin note interne (dedus din 2.2 + D28) | B1 `report_responses`; B2 `…/responses` | B1, B2, B58, B67, B10 |
| 2 | **Eliminarea e-mailului de confirmare la depunere** (N3-6), prin citirea literală a lui 2.2 („numai”) | B1 `email_outbox.kind`; B58; B67; B10 | idem |
| 3 | **T-B2:** o sesizare netransmisă nu poate deveni `rezolvată` | B58 §4; B10 | B58, B10 |
| 4 | **T-B3:** `in_analysis` nu se poate seta manual prin API (consecință literală a lui 2.1) | B2; B10 | B2, B10 |
| 5 | **T-B4:** starea tehnică `on_hold` a transmiterii | B1; B67 | B1, B67, B10 |
| 6 | **T-B5:** geocodare printr-un proxy pe server, serviciu „compatibil Nominatim” (`GEOCODER_URL`); adresa ajunge la un serviciu extern. Harta arată pinul aproximativ ca zonă. | IDX §5; B2 `/citizen/geocode` | IDX, B2, B58, B8 |
| 7 | **T-B6:** limita UAT din OpenStreetMap, verificată vizual de proprietar (datele nu sunt descărcate) | IDX §5 `UAT_BOUNDARY_FILE`; `DN` DN-08 | IDX, B1, B2 |
| 8 | **T-B7:** codurile de recuperare stocate ca HMAC; un set nou invalidează setul vechi; procedură CLI de urgență | B1 `admin_recovery_codes`; B34 §5 | B1, B2, B34 |
| 9 | **T-B8:** la ștergerea contului, notificările către cetățean se anulează; cele către Primărie pleacă fără e-mailul cetățeanului | B1; B34 §8 | B1, B67 |
| 10 | **T-B9 / T-B10:** utilizatorul blocat vede că este blocat și termenul (nu și nota); ridicarea prin același endpoint și pentru blocările permanente | B2; B34 §8 | B2, B34 |
| 11 | **T-A1…T-A10** (revizia 2). Între ele: autentificarea cetățeanului prin cod de 6 cifre pe e-mail, fără parolă; confirmarea diferită pe medii; lista `SUPER_ADMIN_EXCLUSIVE`. A-9 lasă explicit mecanismul pe seama lui Claude, dar forma concretă rămâne propunere. | B1 §3.7; B34 §8; B67 | B1, B2, B34, B67, B10 |
| 12 | **P-4, P-5, P-10, P-11, P-12** închise ca tehnice: tranzițiile excluse → 409; identificatorii `new` / `in_analysis` / `resolved`; `notifications.recipient.manage` acoperă comutatorul, modul și acordul Primăriei; închiderea sondajelor prin calcul la cerere + cron; valoarea „nesolicitat” | `DN` §E.1 | B1, B2, B34, B10 |
| 13 | **P-9:** `super_admin` **nu** poate seta `rezolvată` (consecință literală a formulei „numai subcontul Primăriei”, `SA02` §3). Condiția tehnică: `primaria_mode = platform` + cont `primarie_operator`. | B34 §3; B58 §4; B10 | B34, B58, B10 |
| 14 | **DN-06** (npm workspaces; modifică `package.json` la 5.1), **DN-14** (seed de referință versionat), **DN-15** (toate valorile numerice, configurabile), **DN-16** (`qrcode`), **DN-17** (TOTP obligatoriu și pe staging de la 5.2), **DN-20** (migrații ca pas explicit la deploy), **DN-23** (`node:test`), **DN-24** (Mailpit numai în CI / local). Declarate „tehnice” în `DN` §E.1, deși în revizia 0 erau decizii care cereau aprobare. | `DN` §E.1 | IDX, B1–B10 |
| 15 | **DN-03 (restul mapării):** integritatea și proof-of-work → `surveys.edit`; respingerile → `surveys.view`; textele libere → numai `super_admin` după închidere | `DN` §E.1 | B2, B34 |
| 16 | **DN-22 (restul):** proof-of-work activabil și pentru sesizări | `DN` §E.1 | B67 |
| 17 | **Aplicarea retenției de 45 de zile și la `audit_log` și la jurnalele aplicației** (testul de retenție din B10 include „audit, jurnale”). `SA02` 2.5 nu numește aceste categorii. | B10 §3; B1 §3.9 | B1, B10 |
| 18 | **Păstrarea blocării permanente după ștergerea contului** prin `email_hash`, fără termen | B1; B10 | B1, B34, B10 |
| 19 | **`rejected_attempts` la 30 de zile și sondajele în afara regulii de 45 de zile.** Lăsate conform N4-8 / D3; 2.5 nu le numește. | B1 §3.9; B10 | B1, B10 |
| 20 | **Eratele din clarificările mele**, aplicate fără aprobare per erată: E-2 (închis = arhivă), E-5 (fluxul Primăriei pe staging, cu `allowlist`), E-6 (schimbările de UI), E-9. E-1 (`admin_only`) și E-7 / E-8 sunt acoperite explicit de `SA02` §5, pct. 1 și 4. | `RA02` §2 | B1, B2, B10, IDX |
| 21 | **DN-04 (propunerea):** T1–T8 = grupe de biblioteci npm. Retrasă de mine în clarificări, dar încă prezentă în IDX §6 și `DN`. | IDX §6; `DN` DN-04 | IDX, `DN` |
| 22 | **Numărul de 30 de tabele**: rezultatul modelului propus, nu o decizie | B1 §7 | B1 |

---

## 5. Contradicții rezolvate

Toate au statusul **REZOLVATĂ — NU MAI NECESITĂ DECIZIE**. Pentru fiecare există o decizie explicită ulterioară.

| # | Regula A (mai veche) | Regula B (mai recentă) | Rezolvată prin |
|---|---|---|---|
| R-1 | RULES 6.1 „sesizările nu se șterg” | ștergerea definitivă (D10–D22) | A-1 |
| R-2 | moderarea prealabilă (3E, 6.6-a, D6-2, Master Plan) | publicarea imediată (D9) | A-2, 2.3 |
| R-3 | DN-21 / pct. 7: text public „după moderare” (S01) | text public imediat | A-3 |
| R-4 | C-1 „fără conturi de cetățeni” (R01) | cont numai pentru sesizări (D29–D31) | A-4 |
| R-5 | 6.6-b, 6.6-i: stadiul nepublic; contactul vizibil ambelor roluri | starea publică; e-mailul numai pentru `super_admin` | A-7, A-8 |
| R-6 | D9-6: urmărire numai prin e-mail | lista proprie în MVP | A-6 |
| R-7 | A17-3: transmitere automată | transmitere numai la cerere | pct. 7, C-4 |
| R-8 | 5C / 6.6-g: 4 stadii; asumarea schimbă starea | 3 stări; asumarea nu schimbă starea | DN-09, C-2, C-3 |
| R-9 | propunerea de permisiune pentru anonimizare (K-6, E-4) | fără anonimizare, fără a 4-a permisiune | DN-01, DN-12 |
| R-10 | K-2: audit față de 6.6 | fără istoric al asumărilor | DN-02 |
| R-11 | A17-5: acord separat pentru transmiterea contactului | cererea de transmitere = mecanismul (D29: e-mailul „poate fi transmis Primăriei dacă utilizatorul solicită transmiterea”) | DN-12, D29 |
| R-12 | D6-5: operatorul corectează poziția | exclusiv `super_admin` | 2.11 |
| R-13 | D9-3 / D9-5: notificări la preluare, răspuns către cetățean | numai la cele două schimbări de stare, „nimic pentru … alte acțiuni administrative” | 2.2 |
| R-14 | N3-6 (confirmarea la depunere) | notificări „**numai** pentru două schimbări de stare” | 2.2 (literal). *Notă: 2.2 nu numește explicit confirmarea; Revizia 3 a păstrat-o ca întrebare (K-A02-1). După regula `INSTR-REC` §5, decizia ulterioară explicită o închide. Elimin K-A02-1 de pe lista întrebărilor.* |
| R-15 | B-4: sesizări fără pin față de „publicată imediat pe hartă” | fără poziție validă → în sistem, dar nu pe hartă | 2.4 |
| R-16 | K-5 / DN-22: spamul către Primărie | limita de 3 / 24 h | 2.14 |
| R-17 | propunerea DN-10 „fără coadă retroactivă”; propunerea DN-18 „fără coduri de recuperare” | reluare automată; ambele mecanisme | 2.13, 2.15 |
| R-18 | `admin_only` (revizia 0) față de D3 (arhivă publică) | eliminat | `SA02` §5, pct. 1 |
| R-19 | **testele existente** (`R6.1` fără ștergere; `test_6_6_asumare_preluare.py` S2–S8 cu `in_progress`; `test_6_6_ui.py` UI2 / UI9 „În lucru”; `test_suprafete_publice.py` PII-2 „fără stadiu”; verificările `moderate` din regresie) | A-1, C-3, A-7, 2.3 | deciziile respective. Adaptarea este planificată în Faza 5, domeniu cu domeniu (B10 §3 „Regresie”, §4). `R6.1` este numit explicit; celelalte sunt acoperite de rândul general „Regresie”. P7 rămâne neatins. |
| R-20 | D20 („eliminată … cu datele asociate”) față de corpul e-mailului păstrat 45 de zile și backup-uri (B-5) | 45 de zile pentru toate, inclusiv backup-urile | 2.5 (durata). Momentul de start rămâne deschis: §7, K-A02-3. |

---

## 6. Contradicții reale rămase

### 6.A De fond, între decizii aprobate

| # | Document | Regula A | Regula B | Mai recentă? | Decizie ulterioară? |
|---|---|---|---|---|---|
| K-1 | B1 §3.9; B10 | 2.6: blocare **permanentă**, asociată contului / e-mailului (`SA02`) | 2.5: **datele contului** se șterg după 45 de zile (`SA02`) | nu, ambele din același set | **nu** → §7, K-A02-4 |
| K-2 | IDX R-20; B1 §3.9 | 2.5: retenție 45 de zile pentru sesizare (`SA02`) | D9 / D27 / A-7 / 2.1: sesizarea rămâne pe hartă și în lista proprie cu starea ei, inclusiv `în analiză` → `rezolvată` | 2.5 este mai recentă, dar nu fixează momentul de start | **nu** → §7, K-A02-3 |

### 6.B Neconcordanțe documentare (marcate, nereparate; nu cer decizie)

| # | Loc (la `3c586d0`) | Textul rămas | Contrazice |
|---|---|---|---|
| N-1 | IDX, casetele din antet | „lipsesc … deciziile DN-01…DN-24”; „HEAD `cb9f47e` … Documentele sunt în afara repository-ului” | starea reală (`3c586d0`, documentele în repository) |
| N-2 | IDX §10 | tabelul este la nivelul reviziei 0 / 1 | `DN` §E |
| N-3 | IDX §9, rândul „Contradicțiile” | „K-1, K-4 deschise” | `DN` §E.1 (K-4 tehnic) |
| N-4 | B10 l. 49 | textul locației public „după moderare (DN-21)” | A-3, 2.3 |
| N-5 | B10 l. 48 | „matricea rămâne 24 + 3” | B34 l. 150 „23 + 3 = 26” |
| N-6 | B10 l. 43 | „confirmarea fără descrierea liberă”, în același rând cu „fără e-mail de confirmare la depunere” | contradicție internă (R-14) |
| N-7 | B2 l. 88 (`POST /citizen/reports`) | „`email_outbox` (confirmare către e-mailul contului …)” | B1 `email_outbox.kind` (confirmarea eliminată) |
| N-8 | `DN` l. 260 (DN-12) | „C-1: fără conturi de cetățeni (N4-2 rămâne)”, netăiat | A-4 |
| N-9 | `DN` DN-09, „Rămân deschise” | P-1, P-3, P-4, P-5 prezentate ca deschise | `DN` §E.1 |
| N-10 | `DN` DN-11, tabelul | propunerile vechi (`audit_log` 24 de luni, `email_outbox` 12 luni, sesiuni 30 de zile, jurnale 14 zile), sub „ÎNCHIS (2.5)” | B10 (45 de zile pentru audit); legat de §7, REC-01 |
| N-11 | `DN` K-5 și DN-22 | „DN-22 rămâne deschisă” | `DN` §E.1 |
| N-12 | `DN` DN-15 | „3 confirmări / zi / adresă” | confirmarea eliminată (R-14) |
| N-13 | IDX §6 și `DN` DN-04 | T1–T8 = biblioteci npm (propunere) | clarificările mele (E-10) |
| N-14 | `DN` §0.4 | trimiteri la „F-1, F-2, F-3, F-5 din reconciliere” | lista F nu există în repository → **NECLAR / NECONFIRMAT** |
| N-15 | `DN` l. 37; B34 l. 20 (tăiat) | N4-2 citată ca „fără cont de cetățean” în general | `RULES` l. 209: N4-2 privește **numai votul**. Nu este o contradicție de fond: N4-2 rămâne valabilă pentru vot. |
| N-16 | două liste **E-1…E-10** | lista din checkpoint-ul Fazei 3 (elemente deschise: G6/G7, G4, valori, UAT, acordul Primăriei, verificări juridice, furnizorul de e-mail, HostGate, D2/D5/D7, P7) și eratele din clarificările mele | `DN` §E.1 spune „E-1…E-10 aplicate sau caduce” și se referă numai la erate. Statutul listei din Faza 3 nu apare în documentația Fazei 4 → **NECLAR** (vezi §8). |

---

## 7. Decizii încă necesare

Lista rămâne după eliminarea deciziilor aprobate, a consecințelor tehnice, a contradicțiilor rezolvate și a întrebărilor generate de presupunerile mele.

**Fără soluții propuse; nu cer încă răspunsuri.**

| ID | Întrebarea exactă | De ce este necesară | Depind de ea | Documente afectate |
|---|---|---|---|---|
| **K-A02-3** | De la ce moment curg cele 45 de zile de retenție pentru o **sesizare** și pentru un **cont de cetățean**? | 2.5 fixează durata, nu momentul de start; de el depinde cât timp rămâne o sesizare pe hartă și în lista proprie (K-2) | K-A02-4, REC-01, B-7 | B1 §3.9, B2 (`purge:retention`), B58 §6, B8, B67 §6, B10, IDX R-20 |
| **REC-01** | Regula de 45 de zile se aplică și `audit_log`, sesiunilor și jurnalelor aplicației? | `SA02` 2.5 spune „toate categoriile de date discutate” și enumeră „inclusiv” sesizarea, e-mailurile / jurnalele e-mail, fotografiile, datele contului, backup-urile. Discuția originală nu este în repository → **NECLAR** dacă aceste categorii au fost incluse. Revizia 3 a extins regula la audit fără aprobare (§4, rândul 17). | B-7 | B1 §3.9, `DN` DN-11, B10 |
| **B-7** | Se înregistrează în audit ștergerile definitive (`TM-XXX`, cine, când)? | nicio decizie nu acoperă punctul; D12 spune „necondiționat”, dar nu spune nimic despre urmă | — (depinde de REC-01) | B34 §5, B1 `audit_log`, B10 |
| **K-A02-4** | Blocarea **permanentă** a unui cont se mai păstrează după ștergerea contului sau după expirarea celor 45 de zile, și sub ce formă? | contradicția K-1 (2.6 față de 2.5), din același set | — (depinde de K-A02-3) | B1 `citizen_blocks`, B34 §8, B10 |
| **DN-19** | Imaginile comunicatelor în producție: sunt permise URL-uri externe sau numai de pe domeniul propriu? | afectează politica CSP și imaginile existente (Unsplash); nicio decizie existentă | — | IDX §5, B2 §7, B67 |
| **DN-04** | Care este lista T1–T8? | Planul v1.1 cere tratarea T1–T8 în Faza 4; lista nu există în repository; propunerea mea este retrasă (N-13) | — | IDX §6, `DN` |
| **DN-05** | Ce strategie de branch-uri se folosește în Faza 5? | decizie de proces, necesară înainte de 5.1 | — | IDX, `DN`, HANDOFF |

**Informație necesară (nu decizie):**
- DN-07: sistemul de operare al calculatorului lui Sergiu.

**Validare necesară (nu decizie de produs):**
- confirmarea sau respingerea propunerilor tehnice din §4;
- auditul ChatGPT al designului;
- aprobarea finală a lui Sergiu.

**Eliminate din lista anterioară** (`DN` §E.2):
- **K-A02-1:** rezolvat prin 2.2 (R-14);
- din **K-A02-4**, părțile despre `rejected_attempts` și sondaje: 2.5 nu le numește, iar N4-8 și D3 rămân în vigoare, deci nu există contradicție. Întrebarea fusese generată de extinderea mea.

---

## 8. Documente care trebuie ulterior actualizate

Numai după deciziile din §7 și la instrucțiunea voastră.

| Document | Ce trebuie actualizat | Motiv |
|---|---|---|
| `docs/faza4/*` (viitoarea Revizia 4) | deciziile din §7; reziduurile N-1…N-16; statutul propunerilor din §4, după validare | coerență |
| `RULES` §6 | 6.1 (abrogat), 3E, 5C, 5D, 6.6-a, 6.6-b, 6.6-g, 6.6-i | A-1, A-2, A-7, A-8, DN-09, C-3, 2.3 |
| `RULES` §11 | D6-2, D6-5, D9-3, D9-5, D9-6, D9-8, A17-3, A17-5, A17-6, N3-6; N4-2 (precizarea „pentru vot”) | seturile 01, A-01, A-02 |
| `HANDOFF` | l. 371 „Faza 4 nu a început”; starea Fazei 4; noul punct de revenire `3c586d0` | depășit |
| Planul v1.1 (în afara repository-ului) | fluxul critic `Admin → Moderare → Hartă`; conținutul subfazelor 5.2 / 5.4 (T-A10) | A-2 |
| Master Planul (în afara repository-ului) | publicarea (moderarea), conturile de cetățeni | A-2, A-4 |
| `tests/` (în Faza 5, nu acum) | R6.1, testele 6.6, PII-2, regresia de moderare | R-19 |
| Lista E-1…E-10 a Fazei 3 | redenumirea sau clarificarea statutului, față de eratele cu aceleași numere | N-16 |

---

## 9. Ce NU trebuie rediscutat

- Aplicația funcționează **complet fără cont**; contul prin e-mail confirmat se cere **numai** la depunerea unei sesizări (A-9, D29–D31; `INSTR-REC` §7). Votul rămâne fără cont (N4-2).
- Un e-mail = un cont; contul are numai e-mailul; nu se cer nume, telefon sau alte date (D30, A-9).
- Locația (`INSTR-REC` §8; 2.4, 2.12; D6-3):
  - punct pe hartă, inclusiv poziția curentă, **sau** adresă geocodată;
  - pinul public este aproximativ sau generalizat (coordonatele publice rotunjite la 4 zecimale);
  - numai în UAT Turnu Măgurele;
  - fără poziție validă, sesizarea nu apare pe hartă;
  - textul locației rămâne obligatoriu (D6-2, neînlocuit).
- `nouă` → `în analiză` **numai** după transmiterea efectivă; fluxul indisponibil → rămâne `nouă`, cu reluare automată (2.1, 2.13; `INSTR-REC` §9).
- Durata retenției este **45 de zile** (2.5; `INSTR-REC` §10). Deschis rămâne numai momentul de start și domeniul (§7).
- Publicarea imediată, fără moderare prealabilă sau ulterioară, fără identitatea autorului (D9, A-2, 2.3; `INSTR-REC` §11).
- Ștergerea definitivă de către autor sau `super_admin`; `TM-XXX` rezervat definitiv (A-1, D19–D26; `INSTR-REC` §12).
- Drepturile exclusive ale `super_admin` (ștergere, blocare, e-mailul cetățeanului, poziție, reîncercarea e-mailului, jurnalul e-mail). `primarie_operator` nu are acces la e-mailul cetățeanului, nici prin jurnal (A-5, A-8, 2.11, corectura 3; `INSTR-REC` §13).
- Cele 3 stări și tranzițiile controlate; `rezolvată` numai prin subcontul Primăriei (DN-09, C-2, C-3).
- Transmiterea către Primărie este opțională, la cerere; Primăria primește numai e-mailul (pct. 7, DN-12, D29).
- Exact 3 permisiuni noi; fără anonimizare (DN-01, DN-12).
- Fotografiile publice imediat; politica de utilizare acceptată explicit (2.9, 2.10).
- Blocarea: numai `super_admin`, temporară sau permanentă, ridicare manuală (D13–D18, 2.6).
- Ștergerea contului; sesizările rămân (2.7). Fără „Public / Public anonim” (2.8).
- Limita de 3 transmiteri / 24 h (2.14); recuperarea TOTP prin ambele mecanisme (2.15); închiderea automată a sondajelor (E-3).

---

## 10. Starea exactă a proiectului la finalul reconcilierii

| Element | Stare |
|---|---|
| Faza | **4 — proiectarea backend-ului**; nicio implementare |
| Punctul de siguranță | `3c586d0` pe `recovery-etapa-5-0e2cc20` (GitHub); `main` = `d9bc2c9` neatins |
| Ultima revizie | **Revizia 3**, neînghețată, neauditată după SET-A-02 (**NECONFIRMAT** dacă ChatGPT a auditat-o), neaprobată |
| Decizii aprobate | setul 01, D8–D31, A-1…A-9, 2.1–2.15 + corecturile 1–13, reconfirmate de `INSTR-REC` §7–§13 |
| Propuneri tehnice neconfirmate | 22 de poziții (§4) |
| Contradicții de fond rămase | 2 (§6.A), ambele acoperite de §7 |
| Neconcordanțe documentare | 16 (§6.B), de corectat în Revizia 4 |
| Decizii încă necesare | **7**: K-A02-3, REC-01, B-7, K-A02-4, DN-19, DN-04, DN-05 |
| Informații necesare | DN-07 (sistemul de operare) |
| Documente normative neactualizate | `RULES`, `HANDOFF`, Plan v1.1, Master Plan (§8) |
| Checkpoint-ul Fazei 4 | **NU este atins** |
| P7 (`R6D-SES-01`) | neatins; rămâne singurul FAIL cunoscut (102/103) |

**Diferențe față de raportul meu de reconectare de azi** (`FAZA_4_RAPORT_RECONECTARE.md`), rezultate din aplicarea regulilor acestei instrucțiuni:
- K-A02-1 este scos de pe lista deciziilor (R-14);
- K-A02-4 este redus la blocarea permanentă;
- REC-01 este adăugat, pentru că domeniul regulii de 45 de zile nu poate fi stabilit din surse;
- au fost găsite două neconcordanțe noi: N-7 (B2 l. 88) și N-15 (N4-2).

### VERDICT DE STARE

**`FAZA 4 — PREGĂTITĂ PENTRU ULTIMELE DECIZII`**

Justificare:
- lista deciziilor rămase (§7) este finită și are surse;
- contradicțiile de fond sunt acoperite de această listă;
- neconcordanțele din §6.B sunt documentare și nu blochează deciziile, dar trebuie corectate în Revizia 4, înainte de audit și de aprobarea finală;
- propunerile tehnice din §4 cer validare la audit.

**STOP.** Aștept instrucțiunile voastre.
