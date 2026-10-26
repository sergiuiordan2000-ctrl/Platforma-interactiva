# FAZA 7C — RAPORT (curățarea codului, E1)

**Proiect:** Urbis Activ (Turnu Măgurele Civic) · **Etapa:** E1 / 7C · **Început:** 26.10.2026
**Perimetrul aprobat:** P1–P8 (`docs/faza7/FAZA_7_E0_REGISTRU_DECIZII.md` §2.4 și Anexa A).
**Stare:** în lucru. Checkpoint-ul 7C nu este acordat. Lansarea publică nu este aprobată.

---

## 1. Situația de bază (înaintea oricărei modificări de cod)

**Commitul de bază:** `97aa3a8498d61a61c8033db7af9fa122783a2780` (`faza-5-backend`), rulată la 26.10.2026.
**Mediul local:** Node v22.23.4; MySQL 8.0.46 (Ubuntu); Python Playwright 1.63; dependențe instalate cu `npm ci`. CI folosește Node 20/24 și MySQL 8.0/8.4, MariaDB 11.4; validarea finală rămâne CI (criteriul E1.1).

| Verificarea | Comanda | Rezultatul |
|---|---|---|
| lint frontend | `npx tsc --noEmit` | trece |
| lint server, shared | `npm run typecheck --workspaces` | trece |
| build frontend | `npm run build` | trece (avertismentul cunoscut: fișiere peste 500 kB) |
| build server | `npm run build -w server` | trece (`0.0.0+97aa3a8`) |
| teste unitare | `npm run test:unit -w server` | tests 104 · pass 104 · fail 0 · cancelled 0 · skipped 0 · todo 0 |
| teste API | `npm run test:api -w server` | tests 20 · pass 20 · fail 0 · cancelled 0 · skipped 0 · todo 0 |
| teste de integrare | `npm run test:integration -w server` | tests 383 · pass 383 · fail 0 · cancelled 0 · skipped 0 · todo 0 |
| E2E | `python3 tests/run_all.py` | 17 suite, `TOTAL: 276/276 PASS`, `REZULTAT: OK` |

### 1.1 Dovezile `source-map-js` și `autoprefixer` (P2, DEC-3b) — înaintea eliminării

- `npm ls source-map-js --all`: `source-map-js@1.2.2`, adus de `@tailwindcss/vite@4.3.3` → `@tailwindcss/node@4.3.3` și de `autoprefixer@10.6.1` → `postcss@8.5.28` (deduplicat).
- `npm ls autoprefixer --all`: `autoprefixer@10.6.1`, dependență directă a pachetului rădăcină.
- Analiza artefactului: 0 apariții ale `source-map-js` (sau `SourceMapConsumer`/`SourceMapGenerator`) în `dist/` (frontend) și în `server/dist/app.js`.
- `npm audit` (26.10.2026): `source-map-js` **nu** este raportat. Reauditul din Faza 6 semnalase GHSA-68fv-2mgg-jv7q la versiunea 1.2.1; lockfile-ul conține acum 1.2.2.

### 1.2 Alte constatări `npm audit` (în afara perimetrului P1–P8)

`npm audit` (26.10.2026) raportează 7 vulnerabilități: 3 mari, 3 moderate, 1 scăzută.

| Pachetul | Severitatea | Proveniența | În artefactul livrat |
|---|---|---|---|
| `zod` 4.6.5 | mare (GHSA-mrhx-c7xc-m3w5) | direct: server, shared | da (bundle server) |
| `vite` 8.3.x | mare (GHSA-587h-7wmj-h5pm și altele) | direct: build/dezvoltare | nu |
| `body-parser` 1.20.8 | mare (GHSA-27r3-jxmh-p828) | indirect: `altcha-lib` → `express` | nu |
| `nodemailer` 10.0.13 | moderată (3 avertismente) | direct: server | da |
| `smtp-server` 3.19.16 | moderată (prin `nodemailer`) | direct: server, dezvoltare | nu |
| `fast-uri` 3.1.8 / 4.2.1 | moderată | indirect: `fastify` → `ajv` | da |
| `fastify` 5.12.5 | scăzută (GHSA-389g-gv7q-r4x8) | direct: server | da |

**Decizia proprietarului (26.10.2026, varianta a):** perimetrul P1–P8 rămâne neschimbat; dependențele nu se actualizează în 7C. Vulnerabilitățile **nu sunt acceptate definitiv**: remedierea lor, în special a celor din pachetele livrate în server, cere o decizie separată.

## 2. P1 — `tsc --noUnusedLocals`: rezultatele brute (înaintea remedierii)

Comenzi: `npx tsc --noEmit --noUnusedLocals` (frontend); `npx tsc --noEmit --noUnusedLocals -p tsconfig.json` în `server/` și în `shared/`.

| Proiectul | Rezultatul |
|---|---|
| frontend | 41 de constatări TS6133 |
| server | 1 constatare TS6133 (într-un fișier de test) |
| shared | 0 |

**Lista integrală (TS6133, „declared but its value is never read”):**

```
src/App.tsx(6,8): 'React'
src/components/admin/AdminLoginForm.tsx(7,58): 'ArrowRight'
src/components/admin/directory/AdminDepartmentsManager.tsx(15,3): 'Check'
src/components/admin/directory/AdminDepartmentsManager.tsx(17,3): 'AlertCircle'
src/components/admin/directory/AdminDepartmentsManager.tsx(21,3): 'Clock'
src/components/admin/directory/AdminDepartmentsManager.tsx(22,3): 'UserCheck'
src/components/admin/directory/AdminScheduleManager.tsx(7,52): 'Check'
src/components/admin/directory/AdminServicesManager.tsx(15,3): 'Check'
src/components/admin/directory/AdminServicesManager.tsx(19,3): 'Building2'
src/components/admin/directory/AdminUsefulLinksManager.tsx(17,3): 'AlertCircle'
src/components/admin/quickdial/AdminCategoriesManager.tsx(15,3): 'AlertCircle'
src/components/admin/quickdial/AdminQuickDialManager.tsx(21,3): 'AlertCircle'
src/components/admin/surveys/SurveyQuestionEditor.tsx(12,3): 'HelpCircle'
src/components/announcements/AnnouncementDetail.tsx(13,3): 'Share2'
src/components/announcements/AnnouncementDetail.tsx(16,3): 'ShieldAlert'
src/components/directory/UsefulLinksList.tsx(7,31): 'ShieldCheck'
src/components/layout/Header.tsx(4,3): 'ShieldCheck'
src/components/layout/Header.tsx(5,3): 'MapPin'
src/components/quickdial/QuickDialCard.tsx(13,3): 'AlertTriangle'
src/components/quickdial/QuickDialCard.tsx(15,3): 'Building2'
src/components/quickdial/QuickDialView.tsx(8,3): 'PhoneCall'
src/components/quickdial/QuickDialView.tsx(11,3): 'Info'
src/components/quickdial/QuickDialView.tsx(14,3): 'Flame'
src/components/quickdial/QuickDialView.tsx(38,9): 'emergencyContacts'
src/components/report/LocationPicker.tsx(19,8): 'React'
src/components/report/ReportConfirmation.tsx(18,3): 'FileText'
src/views/AdminView.tsx(20,3): 'Sparkles'
src/views/AnnouncementsView.tsx(9,3): 'RotateCcw'
src/views/AnnouncementsView.tsx(11,3): 'Search'
src/views/AnnouncementsView.tsx(13,3): 'Calendar'
src/views/DirectoryView.tsx(10,3): 'Clock'
src/views/DirectoryView.tsx(11,3): 'MapPin'
src/views/HomeView.tsx(15,3): 'ShieldCheck'
src/views/MapView.tsx(10,3): 'MapPin'
src/views/MapView.tsx(12,3): 'Layers'
src/views/MapView.tsx(15,3): 'Calendar'
src/views/MapView.tsx(16,3): 'Sparkles'
src/views/MapView.tsx(19,3): 'Camera'
src/views/MapView.tsx(20,3): 'Tag'
src/views/MapView.tsx(102,10): 'mapLoaded'
src/views/SurveysView.tsx(7,10): 'Vote'
server: test/unit/oidcProvider.test.ts(6,41): 'safeGoogleAuthorizationUrl'
```

**Clasificarea:**
- 40 de importuri nefolosite: iconițe `lucide-react`, importul implicit `React` (proiectul folosește `"jsx": "react-jsx"`, deci importul nu este necesar) și un import dintr-un test de server. Eliminarea lor nu schimbă comportamentul.
- `emergencyContacts` (`QuickDialView.tsx:38`): un `useMemo` cu un filtru pur, al cărui rezultat nu este folosit. Eliminarea nu schimbă comportamentul.
- `mapLoaded` (`MapView.tsx:102`): valoarea stării nu este citită, dar funcția `setMapLoaded` este apelată (rândul 164). Remedierea păstrează starea și apelul (`const [, setMapLoaded]`), ca să nu schimbe comportamentul de randare.

## 3. Pașii E1 executați (commituri locale; niciun push)

| Pas | Commit | Ce s-a schimbat | Verificarea |
|---|---|---|---|
| P1 | `e084413` | 23 de fișiere: eliminate cele 42 de constatări din §2 (40 de importuri, `useMemo`-ul `emergencyContacts`, valoarea `mapLoaded` — `setMapLoaded` păstrat) | `tsc --noUnusedLocals`: 0 constatări în frontend, server și shared; build-urile și testele serverului trec |
| P3 | `aed3cb7` | șters `server/src/routes/diagnostics.ts`; eliminate `DIAG_CLIENT_IP` și `diagClientIp` din `config.ts`, înregistrarea rutei din `app.ts`; `diagnostics.test.ts` înlocuit cu DG-1, DG-2 | DG-1, DG-2 trec; căutarea codului de diagnostic în afara `docs/`: vezi §4 |
| P4 | `91b3fd8` | `SEARCH_INDEXING` în `config.ts` (valori exacte `off`/`on`; `on` numai cu `APP_ENV=production`) și în `app.ts` (antetul `noindex, nofollow` și `robots.txt`, după control, nu după mediu); test nou `searchIndexing.test.ts` (SI-1…SI-9); testul „dezvoltare” din `app.test.ts` inversat (S5) | SI-1…SI-9 trec; 5 probe de control (cod stricat intenționat), toate detectate |
| P5 | `f9dac71` | `.github/workflows/ci.yml`, pasul „Artefactul”: antetul pe `/`, pe `/favicon.svg` și pe `/api/v1/health`; conținutul exact al `/robots.txt` | pasul simulat local cu `bash -eo pipefail` pe artefactul construit: trece; 2 probe de control (valoare așteptată greșită, `robots.txt` greșit): pasul eșuează |
| P6 | `5504ed7` | test nou `c7TotpImpunere.test.ts` (TO-1…TO-3), în modul `production`; codul aplicației neschimbat | TO-1…TO-3 trec; 3 probe de control (super_admin fără înrolare, fără revocare la schimbarea rolului, fără revocare la resetare): toate detectate |
| P7 | `a76f524` | 8 fișiere, 11 texte (A1, A2, A4–A8, B1, C1–C3), conform registrului §2.3; eticheta „CIVIC” eliminată | RN-1…RN-5 trec |
| P8 | `9a40c02` | test E2E nou `tests/ui/test_7c_redenumire.py` (RN-1, RN-2; antetul verificat pe calculator și pe mobil), înregistrat în `tests/run_all.py`; test de server nou `c7RedenumireEmail.test.ts` (RN-3…RN-5; RN-5 verifică mesajul generat, fără trimitere) | probe de control: textele vechi fac testele să pice (RN-1, RN-2: 6/7 verificări eșuează; RN-3, RN-4, RN-5: câte un eșec) |
| P2 | `df5301e` | `autoprefixer` eliminat din `package.json`; din `package-lock.json` au dispărut numai 10 pachete (`autoprefixer` și dependențele lui exclusive), fără nicio adăugare sau actualizare | build-ul frontend trece; **build-ul este identic octet cu octet** cu cel făcut, din același cod, cu `autoprefixer` instalat |

### 3.1 Dovezile `source-map-js` după eliminarea `autoprefixer` (P2, DEC-3b)

- `npm ls source-map-js --all`: `source-map-js@1.2.2` rămâne, adus de `@tailwindcss/vite` → `@tailwindcss/node` și de `vite@8.3.1` → `postcss@8.5.28` (deduplicat). Afirmația reauditului (pachetul rămâne prin `@tailwindcss/vite`) este confirmată.
- `npm ls autoprefixer --all`: gol.
- Analiza artefactului: 0 apariții în `dist/` și în `server/dist/app.js`.
- `npm audit`: aceleași 7 constatări ca în situația de bază (§1.2); `source-map-js` nu apare.
- Riscul rezidual și opțiunile DEC-3b se prezintă proprietarului pe baza acestor dovezi.

## 4. Puncte deschise semnalate în E1 (nerezolvate, fără acțiune în afara perimetrului)

1. **`.env.example` (rândurile 37–39)** conține încă documentația variabilei `DIAG_CLIENT_IP`. Fișierul nu este în lista P3; criteriul E1.5 cere „nicio referință rămasă la codul de diagnostic”. Eliminarea rândurilor cere decizia proprietarului. Alte referințe în afara `docs/`: numai în `PROJECT_HANDOFF_CURRENT.md` (documentație de predare, de actualizat în 7D, C5) și în testul DG nou.
2. **Efectul DG-2:** schema de configurare ignoră variabilele necunoscute. După eliminare, `DIAG_CLIENT_IP` rămasă în `civic.env` nu mai are niciun efect, în niciun mediu; în producție, aplicația nu mai refuză pornirea pentru această variabilă (pagina nu mai există).
3. **Prezentarea antetului (A4):** „Urbis Activ” ca nume; „Turnu Măgurele” ca text secundar lângă nume, vizibil pe toate lățimile (în locul etichetei „CIVIC”, care era ascunsă pe mobil); subtitlul „Platformă Independentă · Teleorman” neschimbat. Forma vizuală se supune verificării proprietarului.
4. **Neconcordanță în registrul E0, §2.3/§2.4:** registrul vorbește de „7 fișiere”; tabelul lui enumeră, corect, 8 fișiere (6 frontend, 2 server). Implementarea urmează tabelul.
5. **Vulnerabilitățile `npm audit`** (§1.2) rămân deschise, conform deciziei proprietarului: nu sunt acceptate definitiv; remedierea cere o decizie separată.
6. **G6** (criteriul E1.10) și **DEC-3b** rămân de decis înaintea checkpoint-ului 7C.

## 5. Verificarea locală după P1–P8 (commitul `df5301e`, 26.10.2026)

Mediul local de la §1. **Nu înlocuiește CI** (criteriul E1.1 cere CI verde pe toate cele 6 joburi la commitul final 7C).

| Verificarea | Rezultatul |
|---|---|
| `tsc` frontend, server, shared | trec |
| `tsc --noUnusedLocals` frontend, server, shared | 0 constatări |
| build frontend, build server | trec |
| teste unitare | tests 104 · pass 104 · fail 0 · cancelled 0 · skipped 0 · todo 0 |
| teste API | tests 25 · pass 25 · fail 0 · cancelled 0 · skipped 0 · todo 0 (20 − 6 teste vechi ale paginii de diagnostic + 2 DG + 9 SI) |
| teste de integrare | tests 389 · pass 389 · fail 0 · cancelled 0 · skipped 0 · todo 0 (383 + 3 TO + 3 RN) |
| E2E | 18 suite, `TOTAL: 283/283 PASS`, `REZULTAT: OK` (276 + 7 RN-1/RN-2) |

**Starea criteriilor checkpoint-ului 7C (planul v2.4, E1):** 1 (CI 6/6) — neîndeplinit până la push și CI; 2 (numărul de teste al rulării 7C) — consemnat local mai sus, de confirmat din CI; 3 — îndeplinit; 4 — dovezile sunt colectate (§1.1, §3.1); 5 — de închis după decizia pentru `.env.example` (§4.1); 6, 7 — îndeplinite local; 8 — DEC-19 decisă, DEC-3b de decis; 9 — neacordat; 10 — G6 neclarificat.
