# Teste — Turnu Măgurele Civic

Suite de teste end-to-end (Python + Playwright) care rulează aplicația reală: serverul Vite de dezvoltare
(pentru testele care importă direct serviciile din `src/`) și build-ul de producție servit cu `vite preview`
(pentru testele de interfață). Decizia D12 = A: testele se păstrează permanent în repository.

## Structură

| Director | Suită | Ce verifică | Server |
|---|---|---|---|
| `ui/` | `test_robustete_stocare.py` | A-05: nicio pagină publică nu rămâne albă la date corupte în `localStorage`; Sondaje funcționează normal | build de producție |
| `security/` | `test_suprafete_publice.py` | D11: public → Admin = 0 (scanare + click pe fiecare element clicabil), acces direct la `#admin`; datele cetățeanului absente din DOM-ul tuturor paginilor publice; link `javascript:` neexecutat; textele A-06 / A-07 / A-08 | build de producție |
| `regression/` | `test_regresie_6_1_6_5.py` | regresie 6.1–6.5, revizuită la 5.4: ștergerea numai de autor / super_admin și contorul TM (A-1), eroarea la salvare, XSS pe hartă, login fără DEMO, sesiunea falsificată respinsă de server, gărzile pe server, modelul public | server Node + dev (proxy) |
| `e2e/` | `test_5_3_continut_public.py` | 5.3: Acasă, Comunicate, Ghid, Apel rapid din API | server Node |
| `e2e/` | `test_5_4_sesizari.py` | 5.4: contul cetățeanului, formularul (pin, fotografie), harta publică fără moderare, Admin (asumare, preluare, note, e-mailul autorului numai super_admin), ștergerea, dezabonarea | server Node |
| `lib/` | `harness.py` | pornirea/oprirea serverelor (Node, Vite dev cu proxy, preview), conturile de test, interogări pe DB-ul de test, ajutoare pentru sesizări | — |

## Cerințe

- dependențele Node instalate: `npm ci`;
- Python 3.10+ și Playwright: `pip install -r tests/requirements.txt`, apoi `python3 -m playwright install chromium`.

## Rulare

Din rădăcina repository-ului:

```bash
python3 tests/run_all.py              # toate suitele, cu rezumat
python3 tests/run_all.py security     # doar suitele care conțin „security” în cale
python3 tests/security/test_suprafete_publice.py   # o singură suită
```

Codul de ieșire al `run_all.py` este 0 doar dacă nu există FAIL-uri neașteptate.

## Rezultate de referință (Faza 5.4)

| Suită | Rezultat |
|---|---|
| robustețe stocare (A-05) | 9/9 |
| suprafețe publice (D11, confidențialitate) | 9/9 |
| regresie 6.1–6.5 (revizuită 5.4) | 12/12 |
| E2E 5.3 conținut public | 16/16 |
| E2E 5.4 sesizări | 24/24 |

Nu există FAIL-uri cunoscute: `R6D-SES-01` / P7 a fost închis la Faza 5.2 (sesiunea se validează pe server).
Suitele `services/test_6_6_asumare_preluare.py` și `ui/test_6_6_ui.py` au fost înlocuite la 5.4 (sesizările pe server);
regulile lor încă valabile sunt verificate de `server/test/integration/reports.test.ts` și de `e2e/test_5_4_sesizari.py`.

## Limitări ale testelor

- Porturi folosite: 5199 (dev), 5399, 5499, 5599, 5699, 5799 (server Node / preview). Dacă un port este ocupat, testul se oprește cu
  un mesaj explicit, în loc să se conecteze la un server vechi.
- `npm run build` scrie în `dist/` (ignorat de Git); datele de test trăiesc în DB-ul de test (numele conține „test”), golit la fiecare pornire a serverului de test.
- Suita de regresie 6.1–6.5 este o rescriere compactă: suita originală a Etapei 6 (61+ verificări) și
  scripturile 6.1–6.5 nu au fost păstrate.
- Neacoperite încă: fluxurile de interfață din Comunicate, Ghid și Apel rapid, administrarea sondajelor în
  interfață, accesibilitatea, conținutul e-mailurilor.
- Resursele externe (tile-uri OpenStreetMap, imagini Unsplash) pot lipsi într-un mediu fără rețea; testele nu
  depind de ele.
