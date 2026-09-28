# Turnu Măgurele Civic

Platformă civică digitală **independentă** pentru municipiul Turnu Măgurele: comunicate și
evenimente, sesizări cetățenești cu fotografie și localizare (moderate și afișate pe hartă),
consultări publice (sondaje), Ghidul Primăriei și numere utile.
Platforma nu este oficială și nu este operată de Primărie.

## Stare

- Aplicație web React + TypeScript + Vite, rulată integral în browser; datele sunt păstrate
  local (`localStorage`). Nu există încă backend, iar e-mailul este simulat.
- Direcția decisă: **pilot real cu backend (D1 = B)**, conform Planului de Lucru Comun v1.1.
  Designul backend-ului (Faza 4) este încheiat și înghețat: `docs/faza4/` (registrul deciziilor:
  `docs/faza4/FAZA_4_REGISTRU_DECIZII.md`). Implementarea urmează în Faza 5.
- Autentificarea Admin este demonstrativă, doar în browser; **build-ul actual nu trebuie
  publicat** și nu se folosește cu date reale.

## Cerințe

- Node.js 22.12+ (sau 20.19+) și npm
- Pentru teste: Python 3.10+ și Playwright (`tests/requirements.txt`)

## Rulare locală

    npm ci
    npm run dev        # server de dezvoltare
    npm run build      # build de producție în dist/
    npm run preview    # servește build-ul
    npm run lint       # verificare TypeScript (tsc --noEmit)

## Teste

    pip install -r tests/requirements.txt
    python3 -m playwright install chromium
    python3 tests/run_all.py

Detalii în `tests/README.md`.

## Documentație

- `PROJECT_RULES_AND_DECISIONS.md` — reguli de lucru și decizii
- `PROJECT_HANDOFF_CURRENT.md` — starea curentă a proiectului
- `ETAPA_6_STATUS_FINAL.md` — situația Etapei 6
