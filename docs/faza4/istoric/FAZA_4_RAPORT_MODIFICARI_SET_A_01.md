# FAZA 4 — RAPORT DE MODIFICĂRI · SETUL A-01

**Proiect:** Turnu Măgurele Civic · **Data:** 27.09.2026 · **Executant:** Claude
**Instrucțiuni:**
- `FAZA_4_DECIZII_8_31_INSTRUCTIUNI_CLAUDE.md` (D8–D31, aprobate);
- `FAZA_4_DECIZII_A1_A9_INSTRUCTIUNI_CLAUDE.md` (A-1…A-9).

**Bază:** revizia 1 (setul 01) → **revizia 2**. Modificările sunt marcate **[SET-A-01]**; textul înlocuit rămâne tăiat (~~…~~).

> **Repository neatins:** HEAD `cb9f47e` = GitHub, working tree curat, `main` = `d9bc2c9`.
> - Nu am scris cod, nu am instalat nimic, nu am făcut commit sau push.
> - **Designul rămâne neînghețat.**

---

## 1. Documente și secțiuni modificate

| Document | Secțiuni | Ce s-a schimbat |
|---|---|---|
| `FAZA_4_DECIZII_NOI.md` | antet; **§0.3 nou** (D8–D31, A-1…A-9); nota de la §0.1; C-1 (înlocuit); DN-12, DN-13, DN-21; DN-15 (valori pentru conturi); P-6, P-7, P-8, P-12, P-13; **§D nou** (B-1…B-14, T-A1…T-A10) | istoricul deciziilor; problemele deschise; consecințele tehnice |
| `FAZA_4_B1_MODEL_DATE.md` | antet; §1 (ștergere, chei străine); §2; §3.2 (`reports`: `author_account_id`, moderare, `TM`, text locație; `report_contacts` **eliminat**; `report_photos` / `report_responses` CASCADE); §3.5 (`email_outbox.kind`, `report_id SET NULL`); §3.6; **§3.7 nou** (`citizen_accounts`, `citizen_login_codes`, `citizen_blocks`, `sessions.principal_type`); **§3.8 nou** (ștergerea definitivă); §4 (5 reguli de integritate noi, una abrogată); §5.2 | conturile cetățenilor, blocarea, ștergerea |
| `FAZA_4_B2_API.md` | antet; §1; §3 (`map-reports`: publicare imediată + `status`; fotografia); §4 (**§4.1 contul** și **§4.2 sesizările proprii**, noi; `POST /public/reports` → `POST /citizen/reports`); §6.1 (e-mailul numai pentru `super_admin`; moderarea; **`DELETE /admin/reports/:id`**); §6.5 (**`/admin/citizens`**, blocări); §7 (zona cetățeanului, harta) | contracte noi |
| `FAZA_4_B3_B4_AUTENTIFICARE_AUTORIZARE.md` | antet; B3 §1; **B3 §8 nou** (contul cetățeanului); **B4 §2.4 nou** (drepturile exclusive ale `super_admin`); §3 (matricea: depunere, lista proprie, contact, moderare, ștergere, blocare); §4 (stadiul public); §5 (audit) | autentificare și autorizare |
| `FAZA_4_B5_B8_SESIZARI_DATE_PERSONALE.md` | antet; B5 §1 (fluxul: cont, fără e-mail în formular, publicare imediată); §3 (condiția de publicare, `status`); §4; §5; **§6 nou** (ștergerea definitivă); §7; B8 §1 (inventar), §2 (expunere), §3 (GDPR) | sesizări și date personale |
| `FAZA_4_B6_B7_EMAIL_ANTISPAM.md` | antet; B6 §1 (anulare la ștergere), §2 (coduri pe medii), §3 (`citizen_login_code`), §4 (șablonul codului), §7; B7 §2 (sesizări, coduri de cont), §3 (garanții, reducere, riscuri noi) | e-mail și anti-abuz |
| `FAZA_4_B10_TESTARE.md` | antet; §3 (sesizări / ștergere, proiecția publică, **conturi de cetățeni**, **drepturi exclusive**, regresie); §4 (**revizuirea `R6.1`**); §6 (5.2) | teste |
| `FAZA_4_00_ARHITECTURA_SI_INDEX.md` | antet; §3 (rutele `/citizen/*`); §8 (**R-15…R-18 noi**); §9 | index, riscuri |
| `FAZA_4_RAPORT_MODIFICARI_SET_A_01.md` | **nou** | acest raport |

## 2. Rezolvate prin acest set

| Regula / problema | Rezolvare |
|---|---|
| 6.1 „sesizările nu se șterg” | **abrogată (A-1)**; ștergere definitivă de către autor sau `super_admin`; `R6.1` se revizuiește |
| Moderarea prealabilă (3E, 6.6-a, D6-2, fluxul `Admin → Moderare → Hartă`) | **înlocuită de D9 (A-2)** |
| Textul locației „după moderare” (setul 01) | **public imediat (A-3)** |
| C-1 / „fără conturi de cetățeni” | **înlocuite de D29–D31 (A-4)** |
| B-1 (permisiunile pentru ștergere și blocare) | **drepturi exclusive ale rolului `super_admin` (A-5)**, fără permisiuni noi |
| D9-6 (urmărire numai prin e-mail) | **înlocuit de D27 (A-6)**: listă privată în MVP |
| Stadiul nepublic (6.6-b) | **starea este publică (A-7)** |
| Contactul vizibil ambelor roluri (6.6-i) | **numai `super_admin` (A-8)** |
| B-2 (autentificarea cetățeanului) | **A-9** + mecanism tehnic (cod pe e-mail, B3 §8) |
| P-6, P-7, P-8 (setul 01) | închise / caduce (§D) |
| B-6 (e-mailurile netrimise la ștergere) | consecință tehnică: `cancelled` (T-A4) |

## 3. Încă necesită o decizie de produs

| # | Problema |
|---|---|
| **B-3** | moderare **după** publicare (ascundere fără ștergere)? rostul `reports.moderate` |
| **B-4** | sesizările fără pin față de „publicată imediat pe hartă” |
| **B-5** | ce rămâne după ștergere: `email_outbox` (metadate, corpuri 45 de zile), backup-uri |
| **B-7** | auditul ștergerilor |
| **B-8** | ridicarea blocării înainte de termen; ce vede utilizatorul blocat |
| **B-9** | ștergerea contului cetățeanului și soarta sesizărilor lui |
| **B-10** | rostul „Public” / „Public anonim” (+ DN-13) |
| **B-11** | politica de utilizare: textul și acceptarea explicită |
| **B-12** | fotografiile publicate imediat, fără verificare |
| **B-13** (nou) | ce acțiuni are `primarie_operator` după A-8 și D9 (legat de B-3) |
| **B-14** (nou) | confirmarea riscului: blocarea se ocolește cu alt e-mail (D30) |
| rămase | P-1…P-5, P-9, P-10, P-13 (extins); DN-03…DN-08, DN-10, DN-11, DN-13…DN-20, DN-22…DN-24; K-1, K-4; eratele E-1, E-2, E-5…E-10 |

## 4. Consecințe tehnice proiectate fără decizie nouă

T-A1…T-A10 (`FAZA_4_DECIZII_NOI.md` §D.3):
- conturile cetățenilor, cu autentificare prin cod pe e-mail, fără parolă;
- confirmarea pe medii (`simulated` / `allowlist` / `live`);
- ștergerea tranzacțională cu anularea cozii;
- publicarea imediată + `status` în proiecția publică;
- lista `SUPER_ADMIN_EXCLUSIVE` în `shared/`;
- limitele anti-abuz pentru coduri;
- e-mailul normalizat + `UNIQUE`;
- testele noi și revizuirea `R6.1`;
- completarea subfazelor 5.2 / 5.4.

**De semnalat, fără a fi decizii de produs:**
- **R-16:** fără domeniul Civic (G7) și fără SMTP, în producție nu se pot crea conturi, deci nu se pot depune sesizări. G7 devine o **precondiție** pentru utilizarea reală.
- **P-13 / R-18:** RULES, Planul v1.1 și Master Planul trebuie amendate. Nu am făcut asta; se face numai la cererea ta.

## 5. Contradicții rămase după aplicare

| # | Contradicție | Între |
|---|---|---|
| 1 | D9 („publicată imediat **pe hartă**”) față de D6-2 (pin opțional) | B-4 |
| 2 | „fără moderare prealabilă” (A-2) față de existența permisiunii `reports.moderate` și a endpoint-ului de moderare | B-3 / B-13 |
| 3 | D20 („eliminată din baza de date, cu datele asociate”) față de N3-8 (corpul e-mailului păstrat 45 de zile) și de backup-uri | B-5 |
| 4 | Textele RULES §6 / §11, Planul v1.1 și Master Planul, încă neactualizate | P-13 / R-18 |

Nicio contradicție nu a fost rezolvată tacit.

---

## STATUS

**DOCUMENTAȚIE Faza 4 — revizia 2 (SET-A-01), design încă neînghețat. Aștept următorul set de decizii.**
