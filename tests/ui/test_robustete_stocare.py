"""A-05 (post-audit) — robustețea paginilor publice la date corupte în `localStorage`.

Cauza A-05: `surveyService.getAllSurveys()` întorcea direct rezultatul `JSON.parse`, fără să verifice că
este o listă; un JSON valid cu formă greșită bloca randarea `#sondaje` (ecran alb). Suita verifică, pe
build-ul de producție, că nicio pagină publică nu mai rămâne albă și că Sondaje funcționează normal.

Adaptare la Faza 5.6.5 (sondajele pe server; docs/faza5/FAZA_5_6_PLAN.md §8):
- Sondajele nu mai stau în `localStorage`, deci „starea normală” (R-00) are nevoie de server. Build-ul de
  producție este servit acum de serverul Node, pe DB-ul de test cu datele demo (înainte: `vite preview`,
  fără server). Verificarea R-00 este aceeași: pagina se randează și oferă butonul „Participă”.
- R-A05 rămâne neschimbat: cheia veche `turnu_civic_surveys_store` nu se mai citește (T-9), iar o valoare
  coruptă rămasă în browser nu trebuie să strice pagina.
- R-HINT (nou): singura cheie de sondaje din `localStorage` este indiciul „Ai participat deja” (N4-12).
  O valoare coruptă nu trebuie să producă ecran alb și nici să ascundă butonul „Participă”.
"""
import sys; sys.dont_write_bytecode = True
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
from harness import *

res = Results('ROBUSTETE STOCARE (A-05, build productie)')
ROUTES = ['home', 'comunicate', 'sesizari', 'harta', 'sondaje', 'ghid']
SURVEY_VARIANTS = ['{"x":1}', '"text"', 'null', '123', '[{"id":"x"}]', '[null]', 'nu-e-json']
HINT_KEY = 'tmc_survey_participation_hint'
HINT_VARIANTS = ['{"x":1}', '"text"', 'null', '123', '[null]', '[{"id":"x"}]', 'nu-e-json']
OTHER_KEYS = ['turnu_civic_announcements', 'turnu_civic_reports_store', 'turnu_civic_survey_submissions_store',
              'turnu_civic_quickdial_contacts', 'turnu_civic_quickdial_categories', 'turnu_civic_city_hall_directory']


def root_text(page):
    return page.evaluate("document.getElementById('root').innerText.trim().length")


# build-ul de producție al interfeței (făcut înainte de `vite preview`; acum îl servește serverul Node)
_build = subprocess.run(['npm', 'run', 'build'], cwd=REPO, capture_output=True, text=True)
if _build.returncode != 0:
    raise RuntimeError('npm run build a eșuat:\n' + _build.stdout[-2000:] + _build.stderr[-2000:])

with backend_server(5399) as BACKEND, sync_playwright() as pw:
    URL = BACKEND['url']
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

    # 2b. Indiciul „Ai participat deja” corupt: fără ecran alb, iar votul rămâne posibil
    bad_hint = {}
    for v in HINT_VARIANTS:
        open_with(HINT_KEY, v, 'sondaje')
        n = root_text(page)
        if n <= 200 or errs or page.get_by_role('button', name='Participă').count() < 1:
            bad_hint[v] = f'root_len={n} erori={errs[:1]}'
    res.check('R-HINT indiciul de participare corupt: fără ecran alb, fără erori JS, „Participă” rămâne disponibil',
              bad_hint == {}, json.dumps(bad_hint, ensure_ascii=False))

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
