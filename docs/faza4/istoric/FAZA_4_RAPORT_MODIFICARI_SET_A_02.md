# FAZA 4 — RAPORT DE MODIFICĂRI · SETUL A-02 (REVIZIA 3)

**Proiect:** Turnu Măgurele Civic · **Data:** 27.09.2026 · **Executant:** Claude
**Instrucțiune:** `TMC_FAZA_4_INSTRUCTIUNI_CLAUDE_SET_A_02.md`
**Bază:** revizia 2 (SET-A-01) → **revizia 3**. Marcaj **[SET-A-02]**; textul înlocuit rămâne tăiat (~~…~~).

> **Repository neatins:** HEAD `cb9f47e` = GitHub; fără modificări urmărite; `main` = `d9bc2c9`. Fără cod, fără instalări, fără commit sau push. **Designul rămâne neînghețat.**

---

## 1. Decizii integrate

| # | Decizie | Unde |
|---|---|---|
| 2.1 | `nouă` → `în analiză` automat, numai la trimiterea efectivă | B1 `resolution_status`, `email_outbox.status`, §4; B2 `PATCH …/resolution`; B4 §3; B5 §1, §4; B6 §1; B10 |
| 2.2 | notificări numai la cele două schimbări de stare | B1 `email_outbox.kind`, `report_responses`; B2 `…/responses`; B4 §4; B5 §5; B6 §3–§5; B10 |
| 2.3 | fără moderare; `reports.moderate` și endpoint-urile eliminate | B1 `reports`; B2 §6.1; B4 §2.1, §3, §5; B5 §3–§4; B6 B7 §3; B10 |
| 2.4 | locația: pin sau adresă geocodată (aproximativ), fără poziție → nu apare pe hartă | B1 `lat/lng`, `location_source`, `location_approximate`; B2 `/citizen/geocode`, `POST /citizen/reports`, `map-reports`; B5 §1, §3; B8; 00 §5; B10 |
| 2.5 | retenție 45 de zile | B1 **§3.9 nou**; B2 `purge:retention`; B5 §6, B8 §1; B6 §6; 00 §5, R-10, R-17, R-20; B10 |
| 2.6 | blocarea: numai `super_admin`, ridicare manuală, legată de cont / e-mail | B1 `citizen_blocks`; B2 `…/lift`, `/citizen/me`; B3 §8; B4 §2.4, §5; B10 |
| 2.7 | ștergerea contului; sesizările rămân | B1 `author_account_id` (SET NULL), §3.7; B2 `DELETE /citizen/account`; B3 §8; B8; B10 |
| 2.8 | fără „Public / Public anonim” | B1; B2; B5 §3; B10 |
| 2.9 | bifa politicii de utilizare la crearea contului | B1 §3.7; B2 `/citizen/auth/start`; B3 §8; B10 |
| 2.10 | fotografii publice imediat, fără verificare | B5 §2; B8; B6 B7 §3; B10 |
| 2.11 | poziția, reîncercarea e-mailului, jurnalul e-mail: exclusiv `super_admin` | B2 §6.1, §6.5; B4 §2.3, §2.4, §3; B6 §6; B10 |
| 2.12 | numai în UAT, verificat pe server | B1; B2; B5 §1; 00 §5 (`UAT_BOUNDARY_FILE`); B10 |
| 2.13 | flux indisponibil → în așteptare, reluare automată | B1 `on_hold`; B2 setări; B5 §1; B6 §1, §3; B10 |
| 2.14 | maximum 3 transmiteri / utilizator / 24 h, pe backend | B1 §4; B2 `POST /citizen/reports`; B5 §1; B6 §3, B7 §2; B10 |
| 2.15 | recuperarea TOTP: coduri + alt `super_admin` | B1 `admin_recovery_codes`; B2 `/auth/mfa/recovery*`, `reset-mfa`; B3 §5; B4 §5; 00 R-6; B10 |

## 2. Corecturile obligatorii 1–13

| # | Corectura | Aplicată în |
|---|---|---|
| 1 | `admin_only` eliminat | B1 §3.4; B2 §3 |
| 2 | mecanismul de moderare eliminat | vezi 2.3 |
| 3 | operatorul nu vede e-mailul nici prin jurnal | B2 `GET /admin/reports/:id`, `email-log`; B4 §2.3; B6 §6; B10 |
| 4 | câmpurile și testele lipsă | `locationApproximate`, `countsByCategory` (E-7), indicatorul „pe hartă”; testele pentru dezabonare, starea transmiterii, D6-6 (E-8) |
| 5 | numărul de tabele | **30**, cu listă și istoric (B1 §7) |
| 6 | fluxul e-mail ↔ `nouă → în analiză` | vezi 2.1 |
| 7 | retenția de 45 de zile | vezi 2.5 |
| 8 | ștergerea contului | vezi 2.7 |
| 9 | blocarea | vezi 2.6 |
| 10 | fotografiile publice | vezi 2.10 |
| 11 | limita geografică | vezi 2.12 |
| 12 | testele anti-spam 3 / 24 h | B10 (API direct + concurență) |
| 13 | recuperarea TOTP | vezi 2.15 |

Aplicate și: E-2 (închis = arhivă publică), E-5 (fluxul Primăriei testabil pe staging, cu `allowlist`), E-6 (schimbările de UI), E-9.

## 3. Decizii tehnice luate fără decizie de produs nouă

Sunt documentate în `FAZA_4_DECIZII_NOI.md` §0.4, T-B1…T-B10:
- dispare tipul „răspuns către cetățean”;
- o sesizare netransmisă nu poate deveni `rezolvată`;
- `în analiză` nu se poate seta manual;
- starea `on_hold` pentru transmiterile în așteptare;
- proxy de geocodare pe server;
- limita UAT din OSM, verificată vizual de proprietar;
- codurile de recuperare stocate ca HMAC;
- efectele ștergerii contului;
- ce vede utilizatorul blocat;
- ridicarea blocărilor.

În plus, DN-06, DN-14, DN-15, DN-16, DN-17, DN-20, DN-23 și DN-24 sunt tratate ca decizii tehnice (se aplică propunerile).

## 4. Documente și volum

| Document | Linii noi / modificate | Marcaje [SET-A-02] |
|---|---|---|
| `FAZA_4_DECIZII_NOI.md` | 123 (§0.4 nou, §E nou, stări DN, §C / §D închise) | 25 |
| `FAZA_4_B1_MODEL_DATE.md` | 83 (§3.9 și §7 noi, `admin_recovery_codes`) | 36 |
| `FAZA_4_B2_API.md` | 28 | 28 |
| `FAZA_4_B3_B4_AUTENTIFICARE_AUTORIZARE.md` | 33 | 30 |
| `FAZA_4_B5_B8_SESIZARI_DATE_PERSONALE.md` | 38 | 31 |
| `FAZA_4_B6_B7_EMAIL_ANTISPAM.md` | 22 | 20 |
| `FAZA_4_B10_TESTARE.md` | 13 | 13 |
| `FAZA_4_00_ARHITECTURA_SI_INDEX.md` | 14 (R-19, R-20 noi; `GEOCODER_URL`, `RETENTION_DAYS`) | 12 |

**Verificare:** am căutat în toate documentele termenii vechi (moderare, `reports.moderate`, `admin_only`, `publicationPreference`, `isAnonymous`, `citizen_confirmation`, `citizen_reply`, „13 permisiuni”, „24 + 3”, `in_progress`, B-3…B-14, P-1, P-6, P-7, DN-10, DN-11, DN-18). Aparițiile rămase sunt tăiate, marcate ca înlocuite sau fără legătură (de exemplu B-3 / B-5 / B-8 din regulile G5 de compatibilitate, alt spațiu de nume).

## 5. Contradicții rămase

| # | Contradicție | Între |
|---|---|---|
| 1 | Durata de 45 de zile este fixată, dar momentul de start nu | 2.5 față de D9 / D27 / A-7 (harta, lista proprie, starea publică) → **K-A02-3** |
| 2 | Confirmarea la depunere (N3-6, Faza 3) față de „notificări **numai** pentru două schimbări de stare” (2.2) | → **K-A02-1** (am aplicat eliminarea) |
| 3 | Blocarea permanentă legată de e-mail (2.6) față de retenția de 45 de zile a datelor contului (2.5) | → **K-A02-4** (am păstrat numai `email_hash`) |
| 4 | Textele RULES, Plan v1.1 și Master Plan sunt depășite | acțiune la cerere (P-13) |

## 6. Mai necesită o decizie a lui Sergiu

În ordinea propusă:
1. **K-A02-3:** momentul de start al celor 45 de zile, pentru sesizări și conturi.
2. **K-A02-1:** păstrarea sau eliminarea e-mailului de confirmare la depunere.
3. **K-A02-4:** confirmarea interpretărilor de retenție (blocarea permanentă, `rejected_attempts` la 30 de zile, sondajele în afara regulii).
4. **B-7:** auditul ștergerilor.
5. **DN-19:** imaginile comunicatelor în producție.
6. **DN-05:** branch-urile pentru Faza 5.
7. **DN-04:** lista T1–T8.

Informație necesară: sistemul de operare local (DN-07).

---

## STATUS

**Faza 4 — documentație actualizată după setul de decizii A-02 (revizia 3); implementarea backend-ului nu începe încă.**
