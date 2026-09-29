# FAZA 5.3 — NOTE DE IMPLEMENTARE

Detalii tehnice pe care B2 nu le fixează, alese în limitele designului înghețat. Nu schimbă nicio regulă de produs.

## Server (5.3.1–5.3.4)

| # | Subiect | Alegerea |
|---|---|---|
| 1 | Cursorul listelor de comunicate | opac (base64url): cheia de sortare (data publicării sau data evenimentului) + ID-ul ultimului element. B2 §1 descrie cursorul ca ULID, dar comunicatele se sortează după dată (permis de B2 §1: „după ID sau dată”); un ULID singur nu ar păstra ordinea pentru datele demo. |
| 2 | Răspunsul mutațiilor Admin | creare → `201 { id }`; modificare, stare, activare, ordonare, ștergere → `204`. Frontend-ul reîncarcă explicit după fiecare mutație (B2 §7). |
| 3 | `PATCH …/toggle` | corpul `{ isActive }` explicit (idempotent), nu o inversare oarbă: două clicuri trimise de două ori nu anulează operația. |
| 4 | `PUT …/order` | lista trebuie să conțină **exact** toate ID-urile colecției, o singură dată; altfel 422. |
| 5 | Imaginile comunicatelor (DN-19, T-C9) | lista = fișierele din `public/images/comunicate/` (după build: `dist/images/comunicate/`), citită la pornire; formate `webp`, `jpg`, `png`. Endpoint nou `GET /admin/announcements/images` (`announcements.view`), necesar câmpului de imagine din Admin (B2 §7). Decizia proprietarului (varianta A): folderul pornește gol. |
| 6 | Câmpurile tipului de comunicat | la schimbarea tipului, câmpurile de eveniment se golesc pentru alte tipuri și `isUrgent` rămâne numai la notificări (regula formularului actual, 5B). Un `event` fără dată → 422. |
| 7 | Instituția fără date (ex. producție fără demo) | prima completare prin `PATCH /admin/directory/institution` cere toate câmpurile obligatorii; programul și audiențele se pot salva numai după aceea (409). |
| 8 | Regula publică pentru ghid și apel rapid | fiecare element apare dacă el însuși este activ (aceeași regulă ca frontend-ul actual). |
| 9 | ID-uri invalide în URL | tratate ca inexistente (404), fără interogare. |

## Frontend (5.3.5–5.3.6)

| # | Subiect | Alegerea |
|---|---|---|
| 10 | Încărcarea datelor | un hook comun `useAsync` (încărcare / eroare / reîncărcare explicită); componente comune `LoadingBlock` și `ErrorBlock` („Încearcă din nou”). Aspectul ecranelor existente nu se schimbă. |
| 11 | Validarea în frontend (T4) | aceleași scheme Zod ca serverul, înainte de trimitere; bundle-ul crește cu ~19 KB gzip. |
| 12 | Apel rapid: filtrare și căutare | locale (lista e mică), aceleași reguli ca înainte; urgențele primele în zona publică. |
| 13 | Reordonarea contactelor pe o listă filtrată | cele două contacte își schimbă locul în lista completă (serverul cere ordinea completă, nota 4). |
| 14 | Mesajele de eroare în Admin | mesajul serverului (ex. 409 „Direcția are servicii…”) apare într-o bandă de eroare; `alert()` eliminat. |
| 15 | Date demo în frontend | fișierele `src/data/mockAnnouncements.ts`, `mockDirectory.ts`, `mockQuickDial.ts` eliminate: sursa este seed-ul serverului. |

## Teste (5.3.7)

| # | Suită | Modificare |
|---|---|---|
| 16 | `dev:e2e-setup` | încarcă și datele demo (`seed:demo`), numai în dezvoltare, pe un DB de test. |
| 17 | `tests/e2e/test_5_3_continut_public.py` (nou) | B10 §6: Acasă, Comunicate, Ghid, Apel rapid cu serverul real; Admin → public; operator numai vizualizare; eroare de rețea + reîncercare; nicio cheie `localStorage` pentru domeniile 5.3. |
| 18 | `test_regresie_6_1_6_5.py` (R6.5a) | resetările la demo pentru comunicate / ghid / apel rapid nu mai există (D4); permisiunile acestor domenii se verifică pe server (`adminContent.test.ts`). Verificarea rămâne pentru moderare, rezolvare și sondaje (încă locale). |
| 19 | `test_suprafete_publice.py` (SEC-JS) | linkul `javascript:` nu mai poate fi injectat prin `localStorage`; testul scrie un rând corupt direct în DB-ul de test (ocolind validarea API-ului, care îl respinge cu 422) și verifică randarea fără execuție. |
