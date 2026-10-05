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

Faza 5.7 (B10 §6: „nicio dependență de `localStorage` pentru date; curățarea cheilor vechi verificată”):
- R-5.7a: cheile vechi din inventarul B1 §5.1 se șterg la pornire; indiciul de vot și cheile străine rămân.
- R-5.7b: în sursă, stocarea browserului se folosește numai în cele trei locuri permise.
"""
import sys; sys.dont_write_bytecode = True
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
from harness import *

res = Results('ROBUSTETE STOCARE (A-05, build productie)')
ROUTES = ['home', 'comunicate', 'sesizari', 'harta', 'sondaje', 'ghid']
SURVEY_VARIANTS = ['{"x":1}', '"text"', 'null', '123', '[{"id":"x"}]', '[null]', 'nu-e-json']
HINT_KEY = 'tmc_survey_participation_hint'
DEMO_OPEN = '01M3JMZC00Y9CTNMQ1MBDR40Y9'  # sondajul demo deschis (server/seeds/demo/surveys.json)
# Inventarul din B1 §5.1, scris aici independent de codul aplicației
LEGACY_KEYS = ['turnu_civic_reports_store', 'turnu_civic_reports_counter', 'turnu_civic_email_log_store',
               'turnu_civic_announcements', 'turnu_civic_city_hall_directory', 'turnu_civic_quickdial_contacts',
               'turnu_civic_quickdial_categories', 'turnu_civic_surveys_store', 'turnu_civic_survey_submissions_store',
               'turnu_civic_user_participated_surveys', 'turnu_civic_admin_session']
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
    # 4. Faza 5.7 (B1 §5.1, D10-5, A-19): cheile vechi ale prototipului se șterg la pornirea aplicației.
    #    Indiciul de vot (N4-12) și orice altă cheie care nu e în inventar rămân neatinse.
    page.goto(URL + '/'); page.evaluate('localStorage.clear(); sessionStorage.clear()')
    page.evaluate("""([keys, hint, demo]) => {
      for (const k of keys) localStorage.setItem(k, '[{"nume":"Persoană de test","telefon":"0700000000"}]');
      sessionStorage.setItem('turnu_civic_admin_session', '{"role":"super_admin"}');
      localStorage.setItem(hint, JSON.stringify([demo]));
      localStorage.setItem('alta_cheie_din_browser', 'x');
    }""", [LEGACY_KEYS, HINT_KEY, DEMO_OPEN])
    errs.clear()
    page.goto(URL + '/#sondaje'); page.reload(); page.wait_for_load_state('networkidle'); page.wait_for_timeout(300)
    left = page.evaluate("({ local: Object.keys(localStorage).sort(), session: Object.keys(sessionStorage) })")
    res.check('R-5.7a cele 11 chei vechi (și sesiunea Admin din sessionStorage) sunt șterse la pornire; indiciul de vot și cheile străine rămân',
              left == {'local': ['alta_cheie_din_browser', HINT_KEY], 'session': []} and 'Ai participat deja' in page.inner_text('body') and not errs,
              json.dumps(left, ensure_ascii=False) + ' ' + '; '.join(errs))

    # 5. Faza 5.7 (B10 §6): nicio dependență de `localStorage` pentru date. În sursă, stocarea browserului se
    #    folosește numai în: curățarea cheilor vechi, eliminarea sesiunii vechi (5.2) și indiciul de vot (N4-12).
    used = {}
    for f in sorted(Path(REPO, 'src').rglob('*.ts*')):
        hits = [l.strip() for l in f.read_text(encoding='utf-8').splitlines() if re.search(r'\b(localStorage|sessionStorage)\s*[.\[]', l)]
        if hits:
            used[str(f.relative_to(REPO))] = hits
    allowed = {'src/services/legacyStorageCleanup.ts', 'src/services/authService.ts', 'src/services/surveyService.ts'}
    survey_ok = all('PARTICIPATION_HINT_KEY' in l for l in used.get('src/services/surveyService.ts', []))
    auth_ok = all('removeItem(LEGACY_SESSION_KEY)' in l for l in used.get('src/services/authService.ts', []))
    res.check('R-5.7b în sursă, stocarea browserului apare numai în curățare, în eliminarea sesiunii vechi și în indiciul de vot',
              set(used) == allowed and survey_ok and auth_ok, json.dumps({k: v for k, v in used.items() if k not in allowed} or sorted(used), ensure_ascii=False)[:300])

    b.close()

ok = res.report()
sys.exit(0 if ok else 1)
