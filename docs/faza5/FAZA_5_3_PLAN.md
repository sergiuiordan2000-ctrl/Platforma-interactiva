# FAZA 5.3 — PLAN: DATE PUBLICE ȘI MODELUL ASINCRON ÎN FRONTEND

**Proiect:** Turnu Măgurele Civic · **Data:** 29.09.2026 · **Branch:** `faza-5-backend`
**Design (înghețat):** B2 §1, §3, §6.2, §6.3, §7; B4 (permisiunile `announcements.*`, `directory.*`, `quickDial.*`); B1 (tabelele există deja în migrația `0001`)
**Criteriu (B10 §6):** conținutul public servit din API; E2E pentru Acasă, Comunicate, Ghid, Apel rapid; regresie fără FAIL-uri noi.

## 1. Domeniile din 5.3

Trei domenii trec **complet** pe server, fiecare într-o singură subfază (B2 §7, „Tranziție”: fără perioade cu date mixte `localStorage` / API pentru același domeniu):

| Domeniu | Public (B2 §3) | Admin (B2 §6) | Apeluri de adaptat în frontend |
|---|---|---|---|
| Comunicate | `/public/announcements`, `…/highlights`, `…/:id` | §6.2 (fără ștergere și reset: 5B, D4) | ~12 (Acasă, Comunicate, Admin) |
| Ghidul Primăriei | `/public/directory` | §6.3 (instituție, program, public țintă, direcții, servicii, linkuri) | ~35 (Ghid, 5 ecrane Admin, `reportService`) |
| Apel rapid | `/public/quickdial` (cu `countsByCategory`, E-7) | §6.3 (categorii, contacte) | ~22 (Apel rapid, 2 ecrane Admin) |

**Rămân pentru fazele lor:** sesizările și `/public/report-categories` (5.4, același domeniu), sondajele (5.6), tabloul de bord `/admin/dashboard` (contoarele depind de sesizări și sondaje).

## 2. Pașii

| Pas | Conținut |
|---|---|
| 5.3.1 | `shared/`: scheme Zod (`strict`) pentru comunicate, ghid, apel rapid: răspunsurile publice și corpurile cererilor Admin; aceleași scheme și în frontend (T4) |
| 5.3.2 | server, API public (B2 §3): numai elementele publicate / active; comunicatele: numai `published` și neexpirate, `highlights`, 404 pentru cele nepublice; `registry_email` numai informativ (D10-6) |
| 5.3.3 | server, API Admin (B2 §6.2, §6.3): permisiunile B4 per colecție; tranzițiile de stare ale comunicatelor cu permisiunea stării țintă; 409 la ștergerea unei direcții cu servicii / unei categorii cu contacte; ordonare, activare / dezactivare; `verifiedAt` / `verifiedSource` (D10-6); audit la fiecare modificare |
| 5.3.4 | imaginile comunicatelor (DN-19, A04-5, T-C9): lista imaginilor publicate, generată la build; `imageUrl` acceptat numai din listă, altfel 422; în Admin, câmpul imaginii alege numai din listă; fără încărcare de fișiere |
| 5.3.5 | frontend, servicii asincrone: `announcementService`, `directoryService`, `quickDialService` devin clienți ai API-ului (clientul existent din 5.2), returnează `Promise`; `subscribe` înlocuit cu reîncărcarea explicită după o mutație; `reportService` citește adresa informativă a Primăriei asincron (până la 5.4) |
| 5.3.6 | frontend, ecrane: stări încărcare / eroare / gol pentru fiecare listă și formular; fără UI optimist în Admin; butonul „Resetează la valorile demonstrative” eliminat (D4). **Aspectul ecranelor rămâne cel din designul înghețat.** |
| 5.3.7 | teste: API (public + Admin: permisiuni, 404, 409, 422, audit); E2E pentru Acasă, Comunicate, Ghid, Apel rapid (B10 §6); suita existentă adaptată acolo unde citea aceste domenii din `localStorage`; regresie completă |
| 5.3.8 | staging: pachet nou, deploy, verificare cu datele demo deja încărcate la 5.1 (`seed:demo`), T-ISO înainte și după; raport și checkpoint |

Commit-uri propuse (cu aprobare): după 5.3.4 (server), după 5.3.7 (frontend + teste), după 5.3.8 (staging + raport).

## 3. Efecte de știut (tehnic, în limitele designului)

- Ce ai modificat până acum în Admin pentru aceste trei domenii (salvat în browser) **nu se mută** pe server: după 5.3, sursa este DB-ul, cu datele demo din seed. Cheile vechi din `localStorage` se curăță la 5.7 (B8).
- Pe staging, datele demo pentru comunicate, ghid și apel rapid sunt deja în DB din 5.1; nu e nevoie de o comandă nouă.
- Sesizările, harta și sondajele funcționează ca azi (în browser) până la 5.4 / 5.6.

## 4. Decis de proprietar (29.09.2026)

- **Imaginile comunicatelor demo (varianta A):** comunicatele demo rămân fără imagine; lista imaginilor publicate pornește goală; imaginile reale se adaugă în repository când există (DN-19). Testele pentru `imageUrl` (T-C9) folosesc o listă de test, nu imagini publicate.
