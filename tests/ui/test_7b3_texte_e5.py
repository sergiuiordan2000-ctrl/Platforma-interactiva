"""Etapa 7, 7B.3 — E5: formulările tehnice (planul `docs/faza7/FAZA_7B_PLAN.md` §5; deciziile din 23.10.2026).

- E5-1: bannerul hărții când fundalul nu se încarcă — textul aprobat, fără textul vechi.
- E5-4: jurnalul e-mail (super_admin) — etichetele aprobate pentru cele 4 tipuri și cele 8 stări (inclusiv `sending`,
  „în curs de trimitere”); `last_error` rămâne afișat brut (E4, varianta A); valorile brute nu mai apar ca etichete.
E5-2 este verificat în testele serverului (email.test.ts, reports.test.ts). E5-3 („ultimul super_admin”) este o protecție
defensivă care nu se poate declanșa prin API; schimbarea este numai de text, verificată în diff.
Suită separată (server și DB proprii).
"""
import sys; sys.dont_write_bytecode = True
import json, re
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
from harness import *

res = Results('7B.3 TEXTE E5 (E2E, server real)')
CITIZEN = 'b73e5.e2e@exemplu.test'
MAP_NEW = 'Fundalul hărții nu s-a putut încărca (verificați conexiunea). Sesizările rămân afișate.'
MAP_OLD = 'Tile-urile OpenStreetMap'
RAW_ERROR = 'eroare SMTP de test: 550 mailbox unavailable'
STATUS = {'sent': 'trimis', 'failed': 'eșuat', 'on_hold': 'în așteptare', 'queued': 'în coadă', 'cancelled': 'anulat',
          'blocked': 'blocat', 'simulated': 'simulat', 'sending': 'în curs de trimitere'}
KIND = {'registry_notification': 'Notificare către Primărie', 'citizen_status_update': 'Mesaj de stadiu către cetățean',
        'citizen_login_code': 'Cod de autentificare', 'citizen_account_blocked': 'Anunț de blocare'}


def norm(s):
    return re.sub(r'\s+', ' ', s or '').strip()


with backend_server(5998) as B, sync_playwright() as pw:
    URL = B['url']
    b = pw.chromium.launch()
    errors = []
    try:
        setup = b.new_context()
        citizen_login_api(setup, URL, CITIZEN)
        r = submit_report_api(setup, URL, form_token(setup, URL), 'Sesizare de test pentru textele E5.', {'text': 'Punct de test', 'lat': 43.7460, 'lng': 24.8745, 'source': 'pin'})
        assert r.status in (200, 201), r.text()
        setup.close()
        rep = db_query('SELECT id, reference_number AS ref FROM reports ORDER BY created_at DESC LIMIT 1')[0]
        RID, REF = rep['id'], rep['ref']
        # mesajele de test: o stare pe rând (tipul „Notificare către Primărie”), apoi celelalte trei tipuri; cele în
        # coadă / în curs nu sunt luate de procesorul cozii (termen în viitor)
        rows = [(k, 'registry_notification', st) for k, st in enumerate(STATUS)] + \
               [(10 + k, kind, 'sent') for k, kind in enumerate(list(KIND)[1:])]
        for n, kind, st in rows:
            db_exec("INSERT INTO email_outbox (id, kind, report_id, recipient, subject, body_text, status, attempts, last_error, mode_at_send, "
                    "next_attempt_at, locked_until, created_at) VALUES (?, ?, ?, 'registratura@exemplu.test', 'Subiect', 'corp', ?, 1, ?, 'simulated', "
                    "DATE_ADD(NOW(3), INTERVAL 1 DAY), ?, DATE_ADD(NOW(3), INTERVAL ? SECOND))",
                    [f'01JB7B3E50000000000000{n:04d}', kind, RID, st, RAW_ERROR if st == 'failed' else None,
                     None if st != 'sending' else '2099-01-01 00:00:00.000', n])

        # ——— E5-1: bannerul hărții ———
        c = b.new_context(viewport={'width': 1280, 'height': 900}); c.route('https://*.tile.openstreetmap.org/**', lambda r: r.abort())
        p = c.new_page(); p.on('pageerror', lambda e: errors.append(str(e)[:160]))
        p.goto(URL + '/#harta'); p.wait_for_load_state('networkidle'); p.wait_for_timeout(1500)
        banners = norm(p.locator('[data-testid=map-banners]').text_content() if p.locator('[data-testid=map-banners]').count() else '')
        res.check('E5-1 bannerul hărții: textul aprobat, fără textul vechi', MAP_NEW in banners and MAP_OLD not in banners, banners[:200])
        c.close()

        # ——— E5-4: jurnalul e-mail (super_admin) ———
        c = b.new_context(viewport={'width': 1280, 'height': 900}); p = c.new_page(); p.on('pageerror', lambda e: errors.append(str(e)[:160]))
        admin_login(p, URL, B, B['admin'])
        p.evaluate("() => document.querySelector('[data-admin-tab=reports]').click()"); p.wait_for_timeout(800)
        box = 'input[placeholder^="Caută TM-XXX"]'
        p.fill(box, REF); p.press(box, 'Enter'); p.wait_for_timeout(900)
        card = p.locator('[data-testid=admin-report-card]', has_text=REF).first
        card.get_by_text('Detalii și acțiuni').click(); p.wait_for_timeout(1000)
        log = card.locator('div.space-y-1').filter(has_text='Jurnal e-mail').first
        lines = [norm(x) for x in log.locator(':scope > div.flex').all_text_contents()]
        want_status = [f'{KIND["registry_notification"]} · {lbl} · 1 încercări' for lbl in STATUS.values()]
        miss_status = [w for w in want_status if not any(l.startswith(w) for l in lines)]
        res.check('E5-4 cele 8 stări cu etichetele aprobate (inclusiv „în curs de trimitere”), cu tipul „Notificare către Primărie”',
                  not miss_status, json.dumps({'lipsă': miss_status, 'rânduri': lines[:12]}, ensure_ascii=False))
        miss_kind = [k for k in list(KIND.values())[1:] if not any(l.startswith(f'{k} · trimis') for l in lines)]
        res.check('E5-4 celelalte trei tipuri cu etichetele aprobate', not miss_kind, json.dumps({'lipsă': miss_kind}, ensure_ascii=False))
        failed = [l for l in lines if l.startswith(f'{KIND["registry_notification"]} · eșuat')]
        res.check('E5-4 / E4 A: eroarea furnizorului rămâne afișată brut', len(failed) == 1 and RAW_ERROR in failed[0], json.dumps(failed, ensure_ascii=False))
        raw = [v for v in list(STATUS) + list(KIND) if any(re.search(rf'(^|· ){re.escape(v)}( ·|$)', l) for l in lines)]
        res.check('E5-4 valorile brute nu mai apar ca etichete de tip sau de stare', not raw, json.dumps(raw))
        c.close()
        res.check('fără erori JavaScript necaptate în pagini', not errors, '; '.join(errors[:3]))
    finally:
        b.close()

sys.exit(0 if res.report() else 1)
