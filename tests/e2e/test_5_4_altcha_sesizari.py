"""Faza 5.4 / 5.6.7 — E2E: depunerea unei sesizări din interfață cu ALTCHA pornită (B7, decizia A1).

De ce există: la 5.6.5 s-a găsit că rezolvarea ALTCHA în browser folosea varianta pentru Node a algoritmului
și eșua (defect din 5.4, nevăzut pentru că ALTCHA este oprită implicit la sesizări și nu avea E2E). Corecția
este în `src/services/powSolver.ts`, comună sesizărilor și sondajelor; aici se verifică la sesizări.
Suită separată (server și DB proprii), ca limitele de depunere pe oră să nu depindă de alte scenarii.
"""
import sys; sys.dont_write_bytecode = True
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
from harness import *

res = Results('5.4 ALTCHA LA SESIZARI (E2E, server real)')
EMAIL = 'altcha.e2e@exemplu.test'
DESC = 'Stâlp de iluminat defect, test E2E cu ALTCHA pornită.'

with backend_server(5999) as BACKEND, sync_playwright() as pw:
    URL = BACKEND['url']
    b = pw.chromium.launch()
    errors = []
    try:
        # ALTCHA pornită, ca prin comanda `settings:report-pow on`
        db_exec("INSERT INTO settings (`key`, `value`, updated_at, updated_by) VALUES ('reports.pow_enabled', CAST('true' AS JSON), NOW(), NULL) "
                "ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), updated_at = VALUES(updated_at)")
        ctx = b.new_context(viewport={'width': 430, 'height': 900})
        ctx.route('https://*.tile.openstreetmap.org/**', lambda r: r.abort())
        citizen_login_api(ctx, URL, EMAIL)

        # reper: cu ALTCHA pornită, serverul refuză o depunere fără soluție (altfel verificarea din interfață nu ar dovedi nimic)
        no_pow = submit_report_api(ctx, URL, form_token(ctx, URL), 'Depunere fără soluția ALTCHA, trebuie refuzată.', {'text': 'Str. Test', 'source': 'text'})
        rej = db_query("SELECT COALESCE(SUM(count), 0) AS n FROM rejected_attempts WHERE area = 'report' AND reason = 'pow_invalid'")[0]['n']
        res.check('AS-1 ALTCHA pornită: depunerea fără soluție este refuzată de server (422 generic, motiv înregistrat `pow_invalid`)',
                  no_pow.status == 422 and int(rej) == 1, f'{no_pow.status} respingeri pow_invalid={rej}')

        page = ctx.new_page(); page.on('pageerror', lambda e: errors.append(str(e)[:160]))
        calls = []
        page.on('requestfinished', lambda r: calls.append(r.url.rsplit('/api/v1', 1)[-1]) if '/api/v1/citizen/reports' in r.url else None)
        page.goto(URL + '/#sesizari'); page.wait_for_load_state('networkidle'); page.wait_for_timeout(800)
        t_form = time.time()
        page.click('text=Iluminat public'); page.fill('#report-desc', DESC); page.fill('#report-location', 'Str. Test, nr. 1')
        while time.time() - t_form < 9:  # timpul minim al formularului (B7)
            time.sleep(0.5)
        page.click('button[type=submit]:has-text("Trimite sesizarea")')
        try:
            page.wait_for_selector('text=Sesizarea a fost înregistrată', timeout=40000)
        except Exception:
            pass
        body = page.inner_text('body')
        ref = (re.search(r'TM-\d{3,}', body) or [None])[0] if 'Sesizarea a fost înregistrată' in body else None
        res.check('AS-2 depunere din interfață cu ALTCHA pornită: provocarea cerută și rezolvată în browser, confirmare cu TM-XXX',
                  ref is not None and '/citizen/reports/pow-challenge' in calls,
                  ref if ref else ('; '.join(page.locator('[role=alert]').all_inner_texts()) or body[:200]) + f' calls={calls}')
        n_rep = db_query('SELECT COUNT(*) AS n FROM reports WHERE description = ?', [DESC])[0]['n']
        n_pow = db_query('SELECT COUNT(*) AS n FROM used_pow_challenges')[0]['n']
        res.check('AS-3 în DB: sesizarea salvată o singură dată; soluția ALTCHA marcată ca folosită', n_rep == 1 and n_pow == 1, f'sesizări={n_rep} soluții={n_pow}')
    except Exception as exc:  # orice excepție = FAIL raportat, nu oprire fără rezumat
        res.check('EXCEPTIE în scenariu', False, repr(exc)[:300])

    res.check('JS fără erori în pagini', not errors, '; '.join(errors)[:300])
    b.close()

ok = res.report()
sys.exit(0 if ok else 1)
