# FAZA 7 — ACTUALIZĂRILE REGISTRULUI DECIZIILOR (după E0.3)

**Proiect:** Urbis Activ (Turnu Măgurele Civic)
**Registrul de bază:** `docs/faza7/FAZA_7_E0_REGISTRU_DECIZII.md` (commitul `e4e775811129eafe286393900593e3f064dd095e`). Registrul de bază rămâne neschimbat.

Acest document consemnează, în ordine cronologică, schimbările de stare și deciziile luate după commitul E0.3, conform regulii din §3.1 a registrului de bază: schimbările ulterioare de stare se consemnează într-un document ulterior, nu prin reinterpretarea tabelului existent.

> **Acest document consemnează decizii. Nu autorizează implementarea.**
> E1/7C nu este autorizată. Lansarea publică nu este aprobată.

---

## 1. DEC-19 — rezerva 5 din 7B: închisă (varianta a), aprobată la 26.10.2026

**Decizia:** proprietarul a aprobat închiderea rezervei 5 din `FAZA_7B_RAPORT.md` §9 („Numărul exact de teste executate în CI pentru `7ca5940` nu a putut fi confirmat”), pe baza jurnalelor CI recuperate (varianta a din planul v2.4, §6).

**Baza:**

| Câmp | Valoare |
|---|---|
| Rularea CI | 40187048898 (workflow „CI”, prima încercare, declanșată de push, 25.10.2026) |
| Commitul | `7ca59409595ed7f2709a49fd5a4fbc7269e124d2` |
| Ramura | `faza-5-backend` |
| Criteriul aplicat | toate cele 6 joburi ale rulării, fiecare verificat separat |
| SHA-ul în jurnale | pasul de checkout din fiecare job confirmă SHA-ul complet `7ca59409595ed7f2709a49fd5a4fbc7269e124d2` |

**Rezultatele:**

| Jobul | Unitare | API | Integrare | Total | Eșuate / sărite / anulate / `todo` |
|---|---|---|---|---|---|
| backend (Node 20, MySQL 8.0) | 104/104 | 20/20 | 383/383 | 507/507 | 0 / 0 / 0 / 0 |
| backend (Node 20, MySQL 8.4) | 104/104 | 20/20 | 383/383 | 507/507 | 0 / 0 / 0 / 0 |
| backend (Node 24, MySQL 8.0) | 104/104 | 20/20 | 383/383 | 507/507 | 0 / 0 / 0 / 0 |
| backend (Node 24, MySQL 8.4) | 104/104 | 20/20 | 383/383 | 507/507 | 0 / 0 / 0 / 0 |
| backend (Node 24, MariaDB 11.4) | 104/104 | 20/20 | 383/383 | 507/507 | 0 / 0 / 0 / 0 |
| E2E (Python + Playwright) | — | — | — | `TOTAL: 276/276 PASS`, `REZULTAT: OK` (17 suite) | — |

**Proveniența dovezilor:**
- **E2E și backend (Node 20, MySQL 8.0):** citite întâi de proprietar, în interfața GitHub, la 26.10.2026; confirmate apoi prin extragerea automată a jurnalelor brute ale acestor joburi.
- **Celelalte patru joburi backend** (Node 20 / MySQL 8.4, Node 24 / MySQL 8.0, Node 24 / MySQL 8.4, Node 24 / MariaDB 11.4): recuperate automat la 26.10.2026 din jurnalele brute ale joburilor, prin browserul aplicației Claude, folosind sesiunea GitHub a proprietarului.
- Joburile Node 20 prezintă rezumatele `node:test` în format TAP (`# tests`, `# pass` …), iar joburile Node 24 în formatul „spec” (`ℹ tests`, `ℹ pass` …); câmpurile au aceeași semnificație.

**Concordanța:** valorile corespund celor raportate local în `FAZA_7B_RAPORT.md` §4: server 507; Python 272 + 4 verificări suplimentare (`test_7b5_popup_marker`) = 276.

**Efect:**
- Se închide **exclusiv rezerva 5** din `FAZA_7B_RAPORT.md` §9. Textul ei original rămâne în raport ca formulare istorică, însoțit de o actualizare datată.
- Celelalte rezerve 7B și celelalte decizii rămân neschimbate.
- E1/7C rămâne neautorizată.

---

## 2. Închiderea E0 — confirmată de proprietar la 26.10.2026

**Decizia:** proprietarul confirmă închiderea etapei E0 (planul v2.4, §2, „E0 — Aliniere”), pe baza criteriilor și a dovezilor deja acceptate.

**Baza:**
- planul v2.4 aprobat la 25.10.2026 (`docs/faza7/FAZA_7_PLAN_ACTIUNE_MVP_v2.4.md`); deciziile dinaintea 7C (DEC-2a/2b/2c, DEC-18, DEC-14, DEC-3, RN-5, R2) consemnate în registrul de bază, §2;
- perimetrul E1/7C închis la nivel de planificare: P1–P8, cu criteriile de acceptare din Anexa A a registrului de bază;
- documentația E0.3 publicată la commitul `e4e775811129eafe286393900593e3f064dd095e` (CI 40210977980, 6/6 joburi verzi);
- DEC-19 închisă (varianta a) prin commitul `97aa3a8498d61a61c8033db7af9fa122783a2780` (CI 40284714660, 6/6 joburi verzi); vezi §1.

**Limite:**
- Această consemnare nu închide anticipat niciun criteriu al checkpoint-ului 7C (planul v2.4, E1, criteriile 1–10). Rămân de îndeplinit, între altele, DEC-3b (după dovezile `source-map-js`) și clarificarea G6 (criteriul E1.10).
- Închiderea E0 nu autorizează singură implementarea; pornirea E1 se face numai prin aprobarea explicită a proprietarului, în forma R2 (registrul de bază, §2.5).
- Lansarea publică nu este aprobată.
