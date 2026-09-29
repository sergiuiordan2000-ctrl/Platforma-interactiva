# FAZA 5.1 — RAPORT FINAL (cerere de checkpoint)

**Proiect:** Turnu Măgurele Civic · **Branch:** `faza-5-backend` · **Data:** 29.09.2026
**Plan:** `FAZA_5_1_PLAN` (aprobat 28.09.2026) · **Design:** `docs/faza4/` (înghețat, neschimbat)

## 1. Pașii

| Pas | Rezultat | Commit |
|---|---|---|
| 5.1.1 | branch `faza-5-backend` din `0d328a6`; `main` neatins (`d9bc2c9`) | — |
| 5.1.2 | npm workspaces (`server/`, `shared/`), `.gitattributes` | `929c649` |
| 5.1.3–5.1.6 | server Fastify (config Zod, `/api/v1/health`, CSP, `dist/`); schema Drizzle 30 de tabele + migrația `0001`; `migrate`, seed-uri, `check:no-demo`; teste `node:test` | `522842d` |
| 5.1.7 | CI GitHub Actions: Node 20 / 24 × MySQL 8.0 / 8.4 + suita E2E | `b59fa0e` |
| 5.1.8 | backup / restaurare cu fereastră (T-D1), lista de ștergeri, contorul TM; Tailwind numai din `src/` | `1ccfc5e` |
| 5.1.9 | ghid Windows 11 (nivelul Minim, decizia 4) | `425c070` |
| 5.1.10 | staging `civic-test.electrovolt.ro` (G4): aplicația rulează, parolă, `noindex`, backup zilnic; decizia tehnică 5.1-A (`CIVIC_ENV_FILE`) | `425c070`, `2ce0d98`, `d61f890` + acest commit |
| 5.1.11 | acest raport | acest commit |

## 2. Criteriile checkpoint-ului (plan §7)

| # | Criteriu | Rezultat |
|---|---|---|
| 1 | CI verde pe toată matricea | ✅ (fiecare push, inclusiv `2ce0d98`) |
| 2 | migrații pe DB gol; a doua rulare fără efect | ✅ teste + CI + staging (`cli.log`) |
| 3 | seed-uri și `check:no-demo` conform D10 | ✅ (`seed:demo` refuzat în producție; producția refuză pornirea cu date demo) |
| 4 | backup / restaurare | ✅ 11 teste (ceas simulat); backup real pe staging |
| 5 | staging: T-ISO / T-RUN verzi | ✅ `FAZA_5_1_STAGING_JURNAL.md` |
| 6 | suita existentă 102/103, P7 FAIL cunoscut, `KNOWN_FAILS` neschimbat | ✅ |
| 7 | `tsc`, `build`, `git diff --check`; frontend identic | ✅ JS identic byte cu byte; CSS fără 3 clase nefolosite; 14 capturi identice pixel cu pixel |

Teste backend: **78/78** (Node 20.20.2 și 22, MySQL 8.0 local; Node 24 și MySQL 8.4 în CI).

## 3. Decizii luate în 5.1 (proprietarul)

| Decizie | Conținut |
|---|---|
| 1–5 (plan §9) | branch `faza-5-backend`; schema completă într-o migrație; backup R = 7 / 38 zile + listă de ID-uri; Windows „Minim”; GitHub Actions |
| G4 | `civic-test.electrovolt.ro`, cu condiția ca site-ul să nu fie afectat |
| T-ISO | lista T-ISO-1…7 propusă de Claude (N-2 v3 §6 nu e în repository) |
| **5.1-A** | setările staging într-un fișier `CIVIC_ENV_FILE` (600), pentru că nu există Terminal și cron nu vede variabilele aplicației. **Abatere de la textul `00` §5.** |

## 4. Constatări și limitări

- `drizzle-kit` nu este dependență (avertismente de securitate în dependențele lui); SQL-ul se revizuiește manual, testul de integrare verifică potrivirea DB ↔ schema.
- Detaliile de implementare nespecificate în B1 (lungimi, valori implicite, tabelul `schema_migrations`, `BACKUP_DIR`, contorul TM în afara DB-ului): `FAZA_5_1_NOTE_IMPLEMENTARE.md`.
- Pe staging rulează **frontend-ul actual** (date în `localStorage`, moderare, login Admin client-side / P7). Regulile noi (publicare imediată, conturi pe server, locație prin pin / GPS / adresă) vin la 5.2–5.4, conform designului.
- Imaginile demo ale comunicatelor (URL-uri externe) sunt blocate de CSP până la 5.3 (DN-19).
- Restaurarea completă nu a fost exersată pe staging (cere un DB nou); este acoperită de teste.

## 5. Cerere

**Checkpoint 5.1: toate criteriile sunt îndeplinite. Cer aprobarea proprietarului pentru închiderea Fazei 5.1 și intrarea în 5.2** (autentificare, sesiuni, autorizare, conturi de cetățeni; P7 numai cu aprobare explicită).

**Aprobat de proprietar la 29.09.2026, 10:33:** commit-ul raportului și închiderea checkpoint-ului 5.1. Eventualele observații din auditul ChatGPT se tratează la începutul 5.2.
