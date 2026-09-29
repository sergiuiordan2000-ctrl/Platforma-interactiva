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
