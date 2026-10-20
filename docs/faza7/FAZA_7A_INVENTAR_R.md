# ETAPA 7A — INVENTARUL CONSTATĂRILOR R1–R20

**Proiect:** Urbis Activ · **Branch:** `faza-5-backend` (codul identic cu `32e082e`) · **Data:** 15.10.2026
**Stare:** **aprobat de proprietar la 15.10.2026**, împreună cu ordinea de lucru din §5. Aprobarea nu autorizează implementarea: fiecare remediere începe cu aprobarea ei.
**Baza:** `docs/faza7/FAZA_7_PLAN.md` §2 (primul pas al 7A, cu clarificarea 1 din D7-0).

## 0. Metoda

- **Surse:** întregul depozit și istoricul Git (toate commiturile, inclusiv mesajele lor), la `8f1c7f1`; pentru R6, R13, R14 și R16, căutarea proprietarului în istoricul conversațiilor și în documentele din afara depozitului (`URBIS_ACTIV_RAPORT_TRANSFER_2026-10-11.md`, `TEXTE_DOCUMENTATIE_2026-10-12.md`; nu sunt în depozit).
- **Originea seriei:** analiza de după probele M1–M3 (11.10.2026). **Alte serii, cu nume asemănătoare, nu fac parte din inventar:** `R-1…R-4` (pașii de readucere din `FAZA_6_PROBE_M1_M3_RAPORT.md`), `R6.x` (testele de regresie Python, `tests/regression/test_regresie_6_1_6_5.py`) și R6 din documentația Fazei 3 (configurarea prin variabile de mediu).
- **Regulile (clarificarea 1 din D7-0):** o mențiune într-un document nu este, singură, dovadă de rezolvare; ce este consemnat ca rezolvat nu se redeschide fără o dovadă concretă; ce nu este verificat rămâne „neverificat”; descrierile care nu pot fi recuperate rămân „descriere lipsă”, fără o problemă presupusă.
- „**Confirmat în cod**” înseamnă verificat de Claude în fișierul indicat, la commitul de mai sus.

## 1. Inventarul

| Id | Descrierea susținută de dovezi | Starea | Dovada | Riscul concret | Decizie / subetapă | Certitudine |
|---|---|---|---|---|---|---|
| R1 | ștergerea unei sesizări nu scria lista de ștergeri; o restaurare ar fi readus sesizări șterse | rezolvată | `961fc76`; `server/src/db/reportDeletion.ts`; `server/test/integration/backupRoutes.test.ts` (R1); staging: M4 (jurnalul staging-ului, intervențiile 41–48) | — | — | mare |
| R2 | marcajul contorului TM nu se scria; o restaurare ar fi reemis numere deja comunicate | rezolvată | `961fc76`, `6da2f68`; `server/src/db/reportCounter.ts`; `backupRoutes.test.ts` (R2); M4 (contorul 10) | — | — | mare |
| R3 | restaurarea nu verifica totul înainte de prima scriere | rezolvată | `961fc76` (`restore:db --check`, o singură tranzacție); `server/test/integration/backupSafety.test.ts`; M4 | — | — | mare |
| R4 | lipseau testele prin rutele reale | rezolvată | `961fc76`; `backupRoutes.test.ts` | — | — | mare |
| R5 | condițiile restaurării (director de fișiere gol, copia în `BACKUP_DIR`, marcajele prezente) | rezolvată | `961fc76`; `backupSafety.test.ts` (R1–R5); M4 | — | — | mare; commitul grupează „R3, R5”, iar delimitarea exactă dintre ele nu este scrisă |
| R6 | **descriere lipsă** | descriere lipsă, în așteptare | nicio mențiune în depozit, în istoricul Git sau în sursele recuperate de proprietar | necunoscut | fără acțiune până la o sursă mai bună | — |
| R7 | curățări lipsă: `rate_limits`, codurile de cetățean expirate, `rejected_attempts`, sesiunile | nerezolvată | `FAZA_6_RAPORT.md`, L9; **confirmat în cod:** `purgeRetention` (`server/src/maintenance.ts`) nu atinge aceste tabele; `rate_limits` se șterge numai pentru cheia TOTP, la autentificarea reușită (`server/src/routes/auth.ts`); `citizen_login_codes` numai la rotirea cheii TOTP (`server/src/rotateTotpKey.ts`) | tabele care cresc nelimitat; sesiuni și coduri expirate păstrate peste nevoie | 7A, cod | mare |
| R8 | fotografii orfane | nerezolvată | `FAZA_6_RAPORT.md`, L9; **confirmat în cod:** nicio rutină nu compară fișierele din `photos/` cu baza; `purgeTmpFiles` curăță numai `tmp/` | fișiere fără sesizare, păstrate pe disc peste 45 de zile | 7A, cod | medie: scenariul exact în care apar orfanele nu este descris în depozit |
| R9 | provocările ALTCHA fără sarcină cron | nerezolvată (pe găzduire) | `FAZA_6_RAPORT.md`, L9; comanda `purge:pow` există (`maintenance.ts`, `cli.ts`); sarcinile cron consemnate pe staging (jurnalul staging-ului, intervenția 9) sunt numai `backup:db`, `surveys:close-expired`, `purge:retention` | tabelul `used_pow_challenges` crește | 7A: sarcina cron sau includerea în `purge:retention` (acțiunea pe găzduire, cu aprobare separată) | mare |
| R10 | (dedus) aplicația vede aceeași adresă pentru toți vizitatorii, deci limitele pe IP numără toți vizitatorii împreună | rezolvată prin decizie: varianta B (limitele pe IP oprite), limitare acceptată | `FAZA_6_TRUST_PROXY.md` §1a („explică R10”); jurnalul staging-ului, observația 4; `FAZA_6_ANTIABUZ_FARA_IP.md` (D-B1…D-B5) | limitarea din Lista 4 a raportului Fazei 6 | — | medie: documentul spune că fenomenul „explică R10”, fără să definească R10 |
| R11 | `TRUST_PROXY` numeric nu are efect în Fastify 5.12.5 | rezolvată documentar (erată) | `FAZA_6_PLAN.md` §0.1, erata R11; `server/src/config.ts:70`; `TRUST_PROXY` nesetat | — | — | mare |
| R12 | jurnalul aplicației pe găzduire: erorile de pornire ajung în `stderr.log`; ieșirea obișnuită nu s-a găsit | parțial rezolvată | jurnalul staging-ului, intervenția 32 (probă intenționată) și observația 4; `FAZA_6_RAPORT.md`, L10 | erori din funcționare neobservate | 7E | mare |
| R13 | indiciu documentar: legată de L1 (jurnalul de accesări al serverului web, circa o lună, cu IP; copiile furnizorului, circa trei luni) | neverificată; identificarea nu este definitivă | `FAZA_6_RAPORT.md`, L1 („observația 11; R13”); sursele recuperate de proprietar confirmă legătura, nu și conținutul integral | GDPR (deducție) | poarta „date reale” (L1) | mică |
| R14 | **descriere lipsă** | descriere lipsă, în așteptare | ca la R6 | necunoscut | fără acțiune | — |
| R15 | o cerere de cod pentru o adresă nouă creează un cont `pending`, care rămâne permanent | nerezolvată | `FAZA_6_GHID_PROBA_STAGING_ERATA.md`, E2; `FAZA_6_PROBE_M1_M3_RAPORT.md` (O2, +2 conturi); **confirmat în cod:** nicio curățare a conturilor `pending` | adrese de e-mail păstrate fără termen, fără cont activ | **D7-5** (retenția conturilor `pending`; decizia proprietarului din 15.10.2026: intră în 7A), apoi cod; conturile `pending` existente pe staging nu se ating | mare |
| R16 | **descriere lipsă** | descriere lipsă, în așteptare | ca la R6 | necunoscut | fără acțiune | — |
| R17 | erorile rutelor `/api/v1` trimiteau clientului mesajul brut al erorii | rezolvată | RA-10 în `f6d5f2d`; `server/test/api/errorsRA10.test.ts`; instalată pe staging (intervențiile 55–59) | — | — | mare |
| R18 | un cont de cetățean șters reapare după o restaurare | nerezolvată | `FAZA_6_RAPORT.md`, L8; **confirmat în cod:** marcajele de ștergere există numai pentru sesizări (`server/src/db/markers.ts`) | o ștergere cerută de cetățean anulată de o restaurare | **D7-3**, apoi cod (7A) | mare |
| R19 | e-mailurile din coadă se retrimit după o restaurare | nerezolvată | `FAZA_6_RAPORT.md`, L8; **confirmat în cod:** `email_outbox` se copiază și se restaurează cu starea lui (`server/src/db/backup.ts`), fără tratare pentru mesajele `queued` | mesaje duble către cetățeni sau către Primărie | **D7-3**, apoi cod (7A) | mare |
| R20 | restaurarea întregului cont de către furnizor („numai arhiva”): ștergerile de după copie se pierd | nerezolvată (limită cunoscută; procedura lipsește) | `FAZA_6_RAPORT.md`, L7; `docs/faza5/FAZA_5_1_BACKUP_RESTAURARE.md` §6.7 | sesizări șterse care reapar; numerele TM protejate numai prin `--at-least N` | 7A (procedura), 7D (documentul) | mare |

## 2. Rezumat

| Grup | Constatări |
|---|---|
| rezolvate | R1–R5, R11, R17 |
| rezolvată prin decizie (limitare acceptată) | R10 |
| parțial rezolvată | R12 (7E) |
| nerezolvate, în 7A | R7, R8, R9, R15 (D7-5), R18 și R19 (D7-3), R20 |
| indiciu documentar | R13 (poarta „date reale”) |
| descriere lipsă, în așteptare | R6, R14, R16 |

## 3. Contradicții găsite

1. `docs/faza5/FAZA_5_1_BACKUP_RESTAURARE.md` §6.8 spune că proba de restaurare pe găzduire (M4) „nu este încă făcută”; M4 a fost executat la 13.10.2026 (jurnalul staging-ului, intervențiile 41–48; `FAZA_6_RAPORT.md`, Lista 1). Documentul este depășit; corectura se face în 7A, odată cu procedura R20.
2. `FAZA_7_PLAN.md` §1, rândul 7 („celelalte constatări R7–R19 rămase”) include, prin formulare, și constatări rezolvate (R10, R11, R17) și nu pomenește R15. Acest inventar înlocuiește formularea.
3. Pentru R1–R5, R11, R12 și R17 nu s-au găsit contradicții între documente și commituri.

## 4. Decizie nouă

| Nr. | Decizia | Când |
|---|---|---|
| D7-5 | retenția conturilor de cetățean `pending` (de exemplu, ștergerea automată după N zile fără activare) | 7A, înaintea codului pentru R15 |

## 5. Ordinea de lucru în 7A (aprobată la 15.10.2026)

1. **L11 / N1:** textul din footer (D7-1), apoi modificarea.
2. **CL-4:** fereastra mobilă pentru codurile TOTP greșite, cu test și probă de control.
3. **R7 + R9:** curățările (în `purge:retention` sau prin sarcina cron pentru `purge:pow`).
4. **R8:** curățarea fotografiilor orfane.
5. **R15:** după D7-5.
6. **R18 / R19:** după D7-3.
7. **R20:** procedura cu furnizorul și corectura contradicției 1.

**D7-2** (RA-6, cazul C) rămâne limitare acceptată, explicit în registrul limitărilor, ca risc deschis. *(Confirmată formal de proprietar la 20.10.2026: limitarea se păstrează pentru MVP, fără re-codare acum; reevaluare înaintea lansării publice / a API-ului; `FAZA_7A_RAPORT.md` §2.)*
