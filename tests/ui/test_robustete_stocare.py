"""A-05 (post-audit) — robustețea paginilor publice la date corupte în `localStorage`.

Cauza A-05: `surveyService.getAllSurveys()` întorcea direct rezultatul `JSON.parse`, fără să verifice că
este o listă; un JSON valid cu formă greșită bloca randarea `#sondaje` (ecran alb). Suita verifică, pe
build-ul de producție, că nicio pagină publică nu mai rămâne albă și că Sondaje funcționează normal.
"""
import sys; sys.dont_write_bytecode = True
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
from harness import *

res = Results('ROBUSTETE STOCARE (A-05, build productie)')
ROUTES = ['home', 'comunicate', 'sesizari', 'harta', 'sondaje', 'ghid']
SURVEY_VARIANTS = ['{"x":1}', '"text"', 'null', '123', '[{"id":"x"}]', '[null]', 'nu-e-json']
OTHER_KEYS = ['turnu_civic_announcements', 'turnu_civic_reports_store', 'turnu_civic_survey_submissions_store',
              'turnu_civic_quickdial_contacts', 'turnu_civic_quickdial_categories', 'turnu_civic_city_hall_directory']


def root_text(page):
    return page.evaluate("document.getElementById('root').innerText.trim().length")


with preview_server(5399) as URL, sync_playwright() as pw:
    b = pw.chromium.launch(); page = b.new_context().new_page()
    errs = []; page.on('pageerror', lambda e: errs.append(str(e)[:140]))

    def open_with(key, value, route):
        errs.clear()
        page.goto(URL + '/'); page.evaluate('localStorage.clear(); sessionStorage.clear()')
        if key is not None:
            page.evaluate("([k, v]) => localStorage.setItem(k, v)", [key, value])
        page.goto(URL + '/#' + route); page.reload(); page.wait_for_load_state('networkidle'); page.wait_for_timeout(300)

    # 1. Sondaje în starea normală: pagina se randează și oferă acțiunea de participare
    open_with(None, None, 'sondaje')
    body = page.inner_text('body')
    res.check('R-00 Sondaje (stare normală): randare, consultare activă și buton „Participă”',
              root_text(page) > 200 and 'Consultare Publică Activă' in body and page.get_by_role('button', name='Participă').count() >= 1 and not errs,
              '; '.join(errs))

    # 2. A-05: forme corupte ale stocării sondajelor -> fără ecran alb, fără erori JS
    for v in SURVEY_VARIANTS:
        open_with('turnu_civic_surveys_store', v, 'sondaje')
        n = root_text(page)
        res.check(f'R-A05 #sondaje cu turnu_civic_surveys_store = {v}: fără ecran alb, fără erori JS', n > 200 and not errs, f'root_len={n} erori={errs[:1]}')

    # 3. Aceeași formă greșită în celelalte chei: nicio pagină publică albă
    bad = {}
    for key in OTHER_KEYS:
        for route in ROUTES:
            open_with(key, '{"x":1}', route)
            if root_text(page) < 20 or errs:
                bad[f'{key}@{route}'] = errs[:1]
    res.check('R-ALL celelalte chei corupte ({"x":1}) nu produc ecran alb sau erori pe paginile publice', bad == {}, json.dumps(bad, ensure_ascii=False))
    b.close()

ok = res.report()
sys.exit(0 if ok else 1)
