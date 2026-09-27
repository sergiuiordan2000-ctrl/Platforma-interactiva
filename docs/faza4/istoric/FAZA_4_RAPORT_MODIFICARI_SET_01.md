# FAZA 4 — RAPORT DE MODIFICĂRI · SETUL 01

**Proiect:** Turnu Măgurele Civic · **Data:** 27.09.2026
**Instrucțiune:** `FAZA_4_INSTRUCTIUNI_CLAUDE_01.md` · **Executant:** Claude
**Bază:** cele 8 documente ale primei proiectări a Fazei 4 (revizia 0) → **revizia 1**

> **Repository neatins:** HEAD `cb9f47e` = GitHub, working tree curat, `main` = `d9bc2c9`.
> - Nu am scris cod, nu am instalat nimic, nu am făcut commit sau push.
> - Documentele revizuite sunt în afara repository-ului.
> - **Designul rămâne neaprobat și neînghețat.**

---

## 1. Decizii aplicate

| Decizie | Sursa |
|---|---|
| DN-01, DN-02, E-3, DN-12, DN-21, DN-09, pct. 7 | `FAZA_4_INSTRUCTIUNI_CLAUDE_01.md` |
| **C-1…C-4** (răspunsurile lui Sergiu la 4 întrebări puse înainte de aplicare, pentru că setul intra în conflict cu decizii deja consemnate) | chat, 27.09.2026 |

| # | Întrebare | Răspuns |
|---|---|---|
| C-1 | „Contul cetățeanului” (DN-12), deși nu există conturi de cetățeni | **fără conturi; numai e-mail**; numele și telefonul nu se mai cer |
| C-2 | Soarta stării `closed` | **numai 3 stări**; D9 notifică la „în analiză” și „rezolvată” |
| C-3 | Regula 6.6-g (asumarea trece sesizarea în „în lucru”) | **asumarea și preluarea nu mai schimbă starea** |
| C-4 | Pct. 7 față de A17-3 | **pct. 7 înlocuiește A17-3** |

## 2. Documente și secțiuni modificate

Toate modificările sunt marcate **[SET-01]** în text. Textul înlocuit apare tăiat (~~…~~) acolo unde contează trasabilitatea.

| Document | Secțiuni modificate | Ce s-a schimbat |
|---|---|---|
| `FAZA_4_DECIZII_NOI.md` | antet; **§0 nou** (deciziile S1-1…S1-7 + C-1…C-4); §A (K-2, K-3, K-5, K-6); DN-01, DN-02, DN-09, DN-10, DN-11, DN-12, DN-21, DN-22; **§C nou** (P-1…P-13) | stările deciziilor; clarificările; punctele deschise noi |
| `FAZA_4_00_ARHITECTURA_SI_INDEX.md` | antet; §8 (R-7, R-10, R-12, **R-13 și R-14 noi**); §9; §10 | nota de revizie; riscuri; stadiul checkpoint-ului |
| `FAZA_4_B1_MODEL_DATE.md` | antet; §2; §3.1 (`audit_log`, `settings.primaria_mode`); §3.2 (`reports`, `report_contacts`, `report_assignees`); §3.4 (`surveys`); §4; §6 | enum-ul stărilor cu 3 valori; `city_hall_transmission_requested` (nou) în locul `contact_share_consent`; `report_contacts` numai cu `email` (fără `name`, `phone`, `anonymized_at`); închiderea automată a sondajelor; 4 reguli de integritate noi |
| `FAZA_4_B2_API.md` | antet; §2 (CLI: `purge:contacts` eliminat, `surveys:close-expired` nou); §3 (arhiva sondajelor); §4 (`POST /public/reports`: `email?`, `transmitToCityHall`); §6.1 (listă, detaliu, `resolution`, `assume`, `takeover`, **endpoint-ul de anonimizare eliminat**); §6.5 (setări) | contractele aliniate la deciziile setului 01 |
| `FAZA_4_B3_B4_AUTENTIFICARE_AUTORIZARE.md` | antet; B3 §1; B4 §2.2; §3 (matricea: contact, stadii, asumare, preluare); §4; §5 | exact 3 permisiuni; `resolved` numai prin subcontul Primăriei; fără audit pentru asumări; anonimizarea eliminată din audit |
| `FAZA_4_B5_B8_SESIZARI_DATE_PERSONALE.md` | antet; B5 §1 (fluxul); §3 (`publicLocation.text`); §4 (stadii, asumare); §5 (e-mail); B8 §1 (inventar); §3 (GDPR); §4 | transmiterea opțională; numai e-mail; textul locației public; stadiile noi |
| `FAZA_4_B6_B7_EMAIL_ANTISPAM.md` | antet; B6 §3 (condițiile `registry_notification`); §4 (conținutul); B7 §3 | condiția „cerută de cetățean”; numai e-mailul către Primărie; textele stadiilor |
| `FAZA_4_B10_TESTARE.md` | antet; §3 (autorizare, moderare / stadii / asumare, e-mail, sondaje, **rând nou** „date personale și publicare”) | teste pentru fiecare decizie aprobată |
| `FAZA_4_RAPORT_MODIFICARI_SET_01.md` | **nou** | acest raport |

## 3. Contradicții eliminate

| # | Contradicția din revizia 0 | Rezolvarea (sursa) |
|---|---|---|
| 1 | Anonimizarea: B2 cerea `accounts.manage`?, iar DN-12 propunea `reports.contact.anonymize` (O-1 / E-4) | operația și permisiunea eliminate (S1-1, S1-4) |
| 2 | K-6: anonimizarea în afara listei D8-4 | închis: nu există operație de anonimizare (S1-4) |
| 3 | K-2: regula 6.6 față de auditul asumărilor | închis: fără audit pentru asumări (S1-2) |
| 4 | K-3: textul locației față de D6-3 | închis: textul este public după moderare (S1-5) |
| 5 | D34-3 citat în B1 ca decizie, deși nu fusese aprobat | înlocuit de S1-3 (E-3 aprobat) |
| 6 | 4 stadii și orice tranziție permisă (5C) față de DN-09 | 3 stadii, tranziții controlate (S1-6, C-2) |
| 7 | Asumarea schimba starea (6.6-g) față de DN-09 („în analiză” = transmisă) | asumarea și preluarea nu mai schimbă starea (C-3) |
| 8 | Transmiterea automată către Primărie (A17-3) față de opțiunea cetățeanului | numai la cerere (pct. 7, C-4) |
| 9 | Contact cu nume și telefon față de „numai e-mail” | `report_contacts` = numai e-mail (C-1) |
| 10 | Participarea Primăriei (subcontul) amestecată cu transmiterea prin e-mail | separate: transmiterea nu depinde de subcont; `resolved` depinde (S1-6) |

## 4. Puncte care rămân deschise

**Noi, rezultate din setul 01** (detaliate în `FAZA_4_DECIZII_NOI.md` §C):

| # | Punct |
|---|---|
| **P-1** | mecanismul `nouă` → `în analiză` (automat sau manual); **nedecis, conform instrucțiunii** |
| P-2 | starea unei sesizări cu transmitere cerută, dar netrimisă (flux oprit, mod `none`, eșec) |
| P-3 | momentul notificării D9 la `în analiză` |
| P-4 | confirmarea că tranziția directă `new` → `resolved` și revenirile sunt excluse |
| P-5 | identificatorii tehnici `new` / `in_analysis` / `resolved` |
| P-6 | obligativitatea e-mailului |
| P-7 | dacă alegerea „transmite către Primărie” este singură acordul A17-5 |
| P-8 | indicația din formular și regula pentru moderator (DN-21 (a)): scoase, neaprobate |
| **P-9** | traducerea condiției pentru `rezolvată` (`primaria_mode = platform` + `primarie_operator`); **consecință: `super_admin` nu mai poate rezolva** |
| P-10 | acoperirea `notifications.recipient.manage` (comutatorul, modul, acordul) |
| P-11 | mecanismul tehnic al închiderii automate (verificare la cerere + cron) |
| P-12 | valoarea „nesolicitat” pentru starea transmiterii (A17-7) |
| **P-13** | consemnarea în RULES a modificărilor aduse 5C, 6.6-g, A17-3, A17-5, A17-6 și D9-3 |

**Neatinse de setul 01:**
- DN-03…DN-08, DN-10, DN-11, DN-13…DN-20, DN-22…DN-24;
- K-1 (T1–T8), K-4, K-5 (redusă);
- eratele E-1, E-2, E-5…E-10;
- observațiile O-x rămase;
- **DN-08 (UAT), DN-11 (retenție), DN-15 (valori), DN-18 (recuperarea TOTP):** neatinse, conform instrucțiunii.

## 5. Verificare

- Am căutat în documentele revizuite termenii vechi (`in_progress`, `closed` pentru sesizări, `contact_share_consent`, `contactShareConsent`, anonimizare, `D34`, nume / telefon ca date de contact, A17-3). Toate aparițiile rămase sunt marcate [SET-01], tăiate sau fără legătură (de exemplu `closed` pentru sondaje, telefonul din Apel rapid, pierderea telefonului cu aplicația TOTP).
- Modificări pe document: 00 (11 linii), B1 (28), B2 (13), B3/B4 (17), B5/B8 (23), B6/B7 (5), B10 (6), DECIZII_NOI (119).

---

## STATUS

**DOCUMENTAȚIE ACTUALIZATĂ — AȘTEAPTĂ URMĂTORUL SET DE DECIZII**
