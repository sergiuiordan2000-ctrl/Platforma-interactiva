# Teste — Turnu Măgurele Civic

Suite de teste end-to-end (Python + Playwright) care rulează aplicația reală: serverul Vite de dezvoltare
(pentru testele care importă direct serviciile din `src/`) și build-ul de producție servit cu `vite preview`
(pentru testele de interfață). Decizia D12 = A: testele se păstrează permanent în repository.

## Structură

| Director | Suită | Ce verifică | Server |
|---|---|---|---|
| `services/` | `test_6_6_asumare_preluare.py` | Etapa 6.6 la nivel de serviciu: identitate unică a conturilor, matricea de permisiuni, asumare individuală (`super_admin`), preluare instituțională a Primăriei, regula `new → in_progress`, proiecția publică minimă, sesizările istorice `private`, N1, e-mailul simulat (nu înseamnă preluare), eșec de stocare, date vechi | dev |
| `ui/` | `test_6_6_ui.py` | Etapa 6.6 în interfață: butoanele din Admin pentru cele 3 conturi, popup-ul hărții fără flux intern, e-mailul cetățeanului vizibil în Admin, formularul fără opțiunea de ascundere | build de producție |
| `ui/` | `test_robustete_stocare.py` | A-05: nicio pagină publică nu rămâne albă la date corupte în `localStorage`; Sondaje funcționează normal | build de producție |
| `security/` | `test_suprafete_publice.py` | D11: public → Admin = 0 (scanare + click pe fiecare element clicabil), acces direct la `#admin`; datele cetățeanului absente din DOM-ul tuturor paginilor publice; link `javascript:` neexecutat; textele A-06 / A-07 / A-08 | build de producție |
| `regression/` | `test_regresie_6_1_6_5.py` | regresie compactă 6.1–6.5: fără ștergere de sesizări, cota de stocare, XSS pe hartă, login fără DEMO 1-click, validarea sesiunii, gărzile din servicii, modelul public redus | dev |
| `lib/` | `harness.py` | pornirea/oprirea serverelor, credențialele (citite din `authService.ts`), importul modulelor reale | — |

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

## Rezultate de referință

| Suită | Rezultat |
|---|---|
| servicii 6.6 | 54/54 |
| UI 6.6 | 19/19 |
| robustețe stocare (A-05) | 9/9 |
| suprafețe publice (D11, confidențialitate) | 9/9 |
| regresie 6.1–6.5 | 11/12: singurul FAIL este cel cunoscut, `R6D-SES-01` |

## FAIL cunoscut (nu se transformă în PASS)

- **`R6D-SES-01` / P7 / `6D-SES-01`:** o sesiune JSON validă structural, scrisă manual în `localStorage`, este
  acceptată ca sesiune Admin. Este o **limitare arhitecturală** (fără backend, validarea din 6.4 verifică structura,
  nu autenticitatea). Remedierea reală necesită autentificare pe server. `run_all.py` îl raportează separat ca
  „FAIL CUNOSCUT”.
  Trecerea FAIL → PASS și orice modificare a `KNOWN_FAILS` se fac numai cu aprobarea explicită a proprietarului.

## Limitări ale testelor

- Porturi folosite: 5199 (dev), 5299, 5399, 5499 (preview). Dacă un port este ocupat, testul se oprește cu
  un mesaj explicit, în loc să se conecteze la un server vechi.
- `npm run build` scrie în `dist/` (ignorat de Git); datele de test trăiesc doar în browserul de test.
- Suita de regresie 6.1–6.5 este o rescriere compactă: suita originală a Etapei 6 (61+ verificări) și
  scripturile 6.1–6.5 nu au fost păstrate.
- Neacoperite încă: fluxurile de interfață din Comunicate, Ghid și Apel rapid, administrarea sondajelor în
  interfață, accesibilitatea, conținutul e-mailurilor.
- Resursele externe (tile-uri OpenStreetMap, imagini Unsplash) pot lipsi într-un mediu fără rețea; testele nu
  depind de ele.
