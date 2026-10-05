# FAZA 5.7 — RAPORT: CURĂȚAREA CHEILOR VECHI DIN `localStorage`

**Proiect:** Turnu Măgurele Civic · **Branch:** `faza-5-backend` · **Data:** 05.10.2026
**Design (înghețat):** B1 §5.1 (inventarul cheilor), B8 §2 (regula 4), D10-5, A-19, N4-12; B10 §5 („Migrarea `localStorage`”) și §6 (rândul 5.7)
**Criteriu (B10 §6):** „5.7 | nicio dependență de `localStorage` pentru date; curățarea cheilor vechi verificată”.

## 1. Ce s-a făcut

| Element | Rezultat |
|---|---|
| Curățarea | `src/services/legacyStorageCleanup.ts`: la pornirea aplicației (`src/main.tsx`, înainte de randare) se șterg cele 11 chei din inventarul B1 §5.1 din `localStorage` și sesiunea Admin veche din `sessionStorage`. Datele nu se migrează (D10-5). |
| Ce rămâne în browser | o singură cheie: `tmc_survey_participation_hint`, indiciul „Ai participat deja” (N4-12): o listă de ID-uri de sondaje, fără date personale. Cheile care nu sunt în inventar nu se ating. |
| Dependența de `localStorage` pentru date | niciuna: comunicatele, Ghidul, Apelul rapid (5.3), sesizările și contul (5.4) și sondajele (5.6) vin de la server; sesiunile sunt cookie-uri `HttpOnly`. |

Cheile șterse: `turnu_civic_reports_store`, `turnu_civic_reports_counter`, `turnu_civic_email_log_store`, `turnu_civic_announcements`, `turnu_civic_city_hall_directory`, `turnu_civic_quickdial_contacts`, `turnu_civic_quickdial_categories`, `turnu_civic_surveys_store`, `turnu_civic_survey_submissions_store`, `turnu_civic_user_participated_surveys`, `turnu_civic_admin_session`.

## 2. Teste

| Verificare | Ce verifică |
|---|---|
| `R-5.7a` (`ui/test_robustete_stocare.py`) | pe build-ul de producție: cele 11 chei, puse în browser cu date de test, dispar la pornire, împreună cu sesiunea Admin din `sessionStorage`; indiciul de vot rămâne și funcționează („Ai participat deja”); o cheie străină rămâne. Lista cheilor este scrisă în test independent de codul aplicației. |
| `R-5.7b` (aceeași suită) | în sursă (`src/`), `localStorage` / `sessionStorage` se folosesc numai în: curățare, eliminarea sesiunii vechi din `authService` (5.2) și indiciul de vot din `surveyService`. |
| `C-7` (`e2e/test_5_4_sesizari.py`) | după cont de cetățean, sesizare și „Sesizările mele”: nimic în `localStorage` și `sessionStorage` (B8 §2, regula 4). |
| existente | `S-4`, `S-8` (sondaje: nimic la deschidere; indiciul conține numai ID-ul sondajului); `S-1` din E2E 5.3 (nicio dată a domeniilor 5.3 în `localStorage`); `R-A05`, `R-HINT`, `R-ALL` (chei corupte). |

Probă de control (cod stricat intenționat, apoi restaurat): cu o cheie scoasă din lista de curățare, `R-5.7a` pică (cheia rămâne în browser); cu e-mailul cetățeanului scris în `localStorage` la confirmarea codului, pică `R-5.7b` și `C-7`.

Verificări: `tsc`, `typecheck` server, build, `git diff --check`: trec; server 202/202; suita Python 115/115.

## 3. De știut

- Curățarea rulează la fiecare pornire a aplicației; după prima rulare nu mai are ce șterge.
- Cine a votat în prototip (în browser) apare ca nevotat: voturile vechi nu au fost mutate pe server (plan 5.6, §5), iar marcajul vechi „am votat” se șterge acum.
- Pe staging, curățarea ajunge la următorul deploy (staging rulează `79a1b2a`, dinainte de 5.7).
