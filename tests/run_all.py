"""Rulează toate suitele de teste din `tests/` și afișează un rezumat.

Utilizare (din rădăcina repository-ului):
    python3 tests/run_all.py            # toate suitele
    python3 tests/run_all.py services   # doar suitele al căror director/nume conține „services”

Codul de ieșire este 0 doar dacă toate verificările trec, cu excepția FAIL-urilor cunoscute și
documentate (KNOWN_FAILS). Un FAIL cunoscut NU este transformat în PASS: este afișat separat.
"""
import os
import re
import subprocess
import sys
import time
from pathlib import Path

TESTS = Path(__file__).resolve().parent
SUITES = [
    # Faza 5.4: services/test_6_6_asumare_preluare.py și ui/test_6_6_ui.py (modelul din `localStorage`) sunt înlocuite de
    # server/test/integration/reports.test.ts și e2e/test_5_4_sesizari.py (corespondența: docs/faza5/FAZA_5_4_RAPORT.md)
    'ui/test_robustete_stocare.py',
    'security/test_suprafete_publice.py',
    'regression/test_regresie_6_1_6_5.py',
    'e2e/test_5_3_continut_public.py',
    'e2e/test_5_4_sesizari.py',
    'e2e/test_5_4_altcha_sesizari.py',
    'e2e/test_5_4_locatie_formular.py',
    'e2e/test_5_6_sondaje.py',
    # amendamentul Google, pasul 3: interfața, cu un furnizor de identitate fals, local (tests/lib/fake_oidc.mjs)
    'e2e/test_google_autentificare.py',
    # Faza 6, Pasul 3A: fluxul critic cap-coadă, cu un server SMTP fals, local (tests/lib/fake_smtp.mjs)
    'e2e/test_faza6_flux_critic.py',
    # Etapa 7, 7B.2: remedierile cu risc redus (bannerele hărții, tab-urile Admin, mesajele de eroare); emulare Chromium
    'ui/test_7b2_mobil_erori.py',
]
# Limitări cunoscute, documentate în PROJECT_HANDOFF_CURRENT.md (G.4 / P7). Nu sunt bug-uri de regresie.
# P7 / R6D-SES-01 închis formal la Faza 5.2 (sesiune validată pe server); orice FAIL al lui este acum regresie.
KNOWN_FAILS = {}


def main():
    filt = sys.argv[1] if len(sys.argv) > 1 else ''
    selected = [s for s in SUITES if filt in s]
    env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')
    total_pass = total = 0
    unexpected, known = [], []
    for suite in selected:
        t0 = time.time()
        r = subprocess.run([sys.executable, str(TESTS / suite)], capture_output=True, text=True, env=env)
        out = r.stdout + r.stderr
        m = re.search(r'^=== (.+): (\d+)/(\d+) PASS ===$', out, re.M)
        if not m:
            print(f'[EROARE] {suite}: suita nu a produs un rezumat (cod {r.returncode})')
            print(out[-1500:])
            unexpected.append(f'{suite}: fără rezumat')
            continue
        p, n = int(m.group(2)), int(m.group(3))
        total_pass += p; total += n
        print(f'{suite:45} {p:>3}/{n:<3} ({time.time() - t0:.0f}s)')
        for line in re.findall(r'^FAIL \| (.+)$', out, re.M):
            name = line.split(' ')[0]
            (known if name in KNOWN_FAILS else unexpected).append(f'{suite}: {line[:160]}')
    print(f'\nTOTAL: {total_pass}/{total} PASS')
    for k in known:
        print(f'  FAIL CUNOSCUT: {k}')
    for u in unexpected:
        print(f'  FAIL NEAȘTEPTAT: {u}')
    print('REZULTAT:', 'EȘEC' if unexpected else ('OK (doar FAIL-uri cunoscute)' if known else 'OK'))
    sys.exit(0 if not unexpected else 1)


if __name__ == '__main__':
    main()
