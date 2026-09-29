# FAZA 5.2 — PLAN: AUTENTIFICARE, SESIUNI, AUTORIZARE, CONTURI

**Proiect:** Turnu Măgurele Civic · **Data:** 29.09.2026 · **Branch:** `faza-5-backend`
**Design (înghețat):** B3 §1–§8, B4, B2 §4.1, §5, §6.5 · **Criteriu (B10 §6):** toate testele de autentificare și autorizare verzi (inclusiv conturile cetățenilor, cu coduri `simulated`); P7 în PASS **numai cu aprobarea proprietarului**.

## 1. Pașii

| Pas | Conținut |
|---|---|
| 5.2.1 | `shared/`: matricea permisiunilor (23 + 3 = 26; `reports.moderate` eliminat), `SUPER_ADMIN_EXCLUSIVE`, scheme Zod pentru autentificare |
| 5.2.2 | nucleul serverului: parole `scrypt`, sesiuni în DB (cookie `__Host-civic_sid`, inactivitate / absolut, rotație, revocare), CSRF (`X-Civic-Request` + `Origin`), limite de rată în DB, `rejected_attempts`, audit, hash-ul zilnic al IP-ului |
| 5.2.3 | autentificarea Admin: `/auth/login`, `logout`, `me`, `change-password`, TOTP (înrolare, verificare, coduri de recuperare), blocarea după 5 eșecuri |
| 5.2.4 | `bootstrap-admin` (CLI): primul `super_admin`, parolă temporară afișată o singură dată |
| 5.2.5 | administrarea conturilor Admin (`accounts.manage`): listă, creare, dezactivare / reactivare, rol, resetarea parolei, resetarea TOTP (alt `super_admin`), protecția „ultimul `super_admin`”; auditul (`audit.view`) |
| 5.2.6 | conturile cetățenilor: `/citizen/auth/start`, `verify`, `logout`, `me`, `DELETE /citizen/account`; coduri în coada `simulated`; `dev:show-code` (refuzat în producție); blocări (`/admin/citizens…`, drept exclusiv `super_admin`) |
| 5.2.7 | frontend: login Admin prin server (parolă → TOTP → schimbarea parolei), permisiunile din `/auth/me`; **conturile hardcodate și parolele lor dispar din cod**; ecranul de conturi Admin |
| 5.2.8 | teste: API (B10 §3: autentificare, autorizare, conturi de cetățeni); suita existentă adaptată (conturile de test create prin seed, credențiale din variabile de mediu, B10 §4); CI cu MySQL și pentru E2E |
| 5.2.9 | P7 (`R6D-SES-01`): cererea de aprobare pentru trecerea în PASS și scoaterea din `KNOWN_FAILS` |
| 5.2.10 | deploy pe staging + `bootstrap-admin` (prin „Run JS script” din cPanel, ca parola temporară să nu ajungă într-un fișier) + T-ISO; raport și checkpoint |

Commit-uri propuse (cu aprobare): după 5.2.3, 5.2.6, 5.2.8 și 5.2.10.

## 2. Tranziție (tehnic, în limitele designului)

- Comunicatele, sesizările și sondajele rămân în `localStorage` până la 5.3 / 5.4 / 5.6. În Admin, **identitatea și rolul vin de la server**, iar ecranele acestor domenii folosesc în continuare regulile actuale ale frontend-ului, inclusiv moderarea, până la migrarea domeniului. Matricea finală (fără `reports.moderate`) se aplică pe server de la 5.2 și în frontend odată cu fiecare domeniu.
- Valorile numerice (DN-15) sunt cele propuse în B3 (sesiune 60 min / 12 h, blocare 5 eșecuri / 15 min, cod cetățean 15 min / 5 încercări); configurabile.

## 3. De confirmat de proprietar

Decis de proprietar (29.09.2026):
- **contul de cetățean:** serverul și testele la 5.2; ecranele la 5.4, împreună cu noul formular de sesizare;
- **conturile Admin:** ecran simplu în Admin la 5.2 (listă, creare, dezactivare / reactivare, rol, resetarea parolei și a TOTP).
