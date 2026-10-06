"""Faza 5.4 — E2E: locația în formularul de sesizare, după decizia proprietarului din 06.10.2026
(docs/faza5/AMENDAMENT_LOCATIE_FORMULAR.md).

De ce există: pe staging, o adresă scrisă numai în câmpul „Locația” nu punea pin, iar sesizarea se salva fără
poziție, fără niciun avertisment (jurnalul de staging §8). Acum: un singur câmp de adresă („Caută pe hartă”
folosește textul din „Locația”) și, la trimiterea fără pin, o întrebare cu trei variante. Pinul rămâne opțional (D6-2).
Suită separată (server și DB proprii), ca limitele de depunere pe oră să nu depindă de alte scenarii.
Căutarea adresei este simulată la nivelul browserului (în testare nu există geocodor); regulile serverului
pentru geocodare sunt testate în server/test/integration/reports.test.ts.
"""
import sys; sys.dont_write_bytecode = True
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
from harness import *

res = Results('5.4 LOCATIA IN FORMULAR (E2E, server real)')
EMAIL = 'locatie.e2e@exemplu.test'
SPOT = {'lat': 43.7460, 'lng': 24.8745}
ADDRESS = 'Strada Republicii 10'
PROMPT = '[data-testid=no-pin-prompt]'
SUBMIT = 'button[type=submit]:has-text("Trimite sesizarea")'


def open_form(page, url):
    page.goto(url + '/#sesizari'); page.reload(); page.wait_for_load_state('networkidle'); page.wait_for_timeout(800)
    return time.time()


def fill_form(page, description, location=ADDRESS):
    page.click('text=Iluminat public'); page.fill('#report-desc', description); page.fill('#report-location', location)


def wait_min_time(t_form):
    while time.time() - t_form < 9:  # timpul minim al formularului (B7)
        time.sleep(0.5)


def confirmed_ref(page):
    try:
        page.wait_for_selector('text=Sesizarea a fost înregistrată', timeout=15000)
    except Exception:
        return None
    return (re.search(r'TM-\d{3,}', page.inner_text('body')) or [None])[0]


def db_location(description):
    return db_query('SELECT location_source AS src, lat, lng FROM reports WHERE description = ?', [description])


with backend_server(6099) as BACKEND, sync_playwright() as pw:
    URL = BACKEND['url']
    b = pw.chromium.launch()
    errors = []
    try:
        ctx = b.new_context(viewport={'width': 430, 'height': 900})
        ctx.route('https://*.tile.openstreetmap.org/**', lambda r: r.abort())
        geo_calls = []

        def geocode(route):
            geo_calls.append(json.loads(route.request.post_data or '{}'))
            route.fulfill(status=200, content_type='application/json', body=json.dumps({**SPOT, 'approximate': True}))

        ctx.route('**/api/v1/citizen/geocode', geocode)
        citizen_login_api(ctx, URL, EMAIL)

        # ——— 1. Un singur câmp de adresă; căutarea folosește textul din „Locația” ———
        page = ctx.new_page(); page.on('pageerror', lambda e: errors.append(str(e)[:160]))
        posts = []
        page.on('request', lambda r: posts.append(r.url) if r.method == 'POST' and r.url.endswith('/api/v1/citizen/reports') else None)
        t_form = open_form(page, URL)
        section = page.locator('#report-location').locator('xpath=ancestor::div[contains(@class, "rounded-3xl")][1]')
        res.check('LF-1 secțiunea „Locația” are un singur câmp de text; al doilea câmp („Caută adresa”) nu mai există',
                  section.locator('input[type=text]').count() == 1 and page.locator('input[aria-label="Caută adresa pe hartă"]').count() == 0
                  and page.locator('[data-testid=location-search]').inner_text().strip() == 'Caută pe hartă', '')
        page.click('[data-testid=location-search]'); page.wait_for_timeout(400)
        msg = '; '.join(page.locator('[role=status]').all_inner_texts())
        res.check('LF-2 „Caută pe hartă” fără text în „Locația”: mesaj care cere întâi textul; nicio căutare trimisă',
                  'Scrieți întâi locul' in msg and geo_calls == [], msg[:160])

        # ——— 2. Trimitere fără pin → întrebarea; nimic nu pleacă spre server ———
        DESC_A = 'Stâlp de iluminat defect, test E2E pentru întrebarea fără pin.'
        fill_form(page, DESC_A)
        wait_min_time(t_form)
        page.click(SUBMIT); page.wait_for_timeout(600)
        prompt_txt = page.locator(PROMPT).inner_text() if page.locator(PROMPT).count() else ''
        res.check('LF-3 trimitere fără pin: apare întrebarea, cu cele trei variante; sesizarea NU este trimisă',
                  all(t in prompt_txt for t in ['Sesizarea nu are poziție pe hartă', 'Caută adresa scrisă', 'Pun pinul pe hartă', 'Trimit fără hartă'])
                  and posts == [] and 'Sesizarea a fost înregistrată' not in page.inner_text('body'), prompt_txt[:200] + f' posts={len(posts)}')

        page.click(f'{PROMPT} >> text=Pun pinul pe hartă'); page.wait_for_timeout(1200)
        in_view = page.evaluate("""() => { const r = document.querySelector('[data-testid=location-picker-map]').getBoundingClientRect();
          return r.top >= 0 && r.bottom <= window.innerHeight; }""")
        res.check('LF-4 „Pun pinul pe hartă”: întrebarea dispare, harta este adusă în vizor, nimic trimis',
                  page.locator(PROMPT).count() == 0 and in_view and posts == [], f'in_view={in_view} posts={len(posts)}')

        page.click(SUBMIT); page.wait_for_timeout(600)
        asked_again = page.locator(PROMPT).count() == 1
        page.click(f'{PROMPT} >> text=Caută adresa scrisă'); page.wait_for_timeout(1200)
        status = page.locator('[data-testid=location-picker-status]').inner_text() if page.locator('[data-testid=location-picker-status]').count() else ''
        res.check('LF-5 „Caută adresa scrisă”: se caută textul din „Locația”; pin propus ca zonă aproximativă; întrebarea dispare',
                  asked_again and len(geo_calls) == 1 and geo_calls[0].get('address', '').startswith(ADDRESS)
                  and 'Zonă aproximativă' in status and page.locator(PROMPT).count() == 0 and posts == [],
                  f'asked_again={asked_again} geo={json.dumps(geo_calls, ensure_ascii=False)[:120]} status={status[:60]}')

        page.click(SUBMIT)
        ref_a = confirmed_ref(page)
        rows = db_location(DESC_A)
        res.check('LF-6 cu pin, trimiterea nu mai întreabă: confirmare cu TM-XXX; în DB poziția este `geocoded`, cu coordonate',
                  ref_a is not None and len(posts) == 1 and len(rows) == 1 and rows[0]['src'] == 'geocoded' and rows[0]['lat'] is not None,
                  f'ref={ref_a} posts={len(posts)} rows={json.dumps(rows, default=str)[:160]}')

        # ——— 3. „Trimit fără hartă”: sesizarea se salvează fără poziție (D6-2: pinul rămâne opțional) ———
        posts.clear()
        t_form = open_form(page, URL)
        DESC_B = 'Bancă ruptă în parc, test E2E pentru trimiterea fără hartă.'
        fill_form(page, DESC_B, 'Parcul central, lângă fântână')
        wait_min_time(t_form)
        page.click(SUBMIT); page.wait_for_timeout(600)
        page.click(f'{PROMPT} >> text=Trimit fără hartă')
        ref_b = confirmed_ref(page)
        rows = db_location(DESC_B)
        res.check('LF-7 „Trimit fără hartă”: confirmare cu TM-XXX; în DB poziția este `text`, fără coordonate; o singură trimitere',
                  ref_b is not None and len(posts) == 1 and len(rows) == 1 and rows[0]['src'] == 'text' and rows[0]['lat'] is None,
                  f'ref={ref_b} posts={len(posts)} rows={json.dumps(rows, default=str)[:160]}')

        # ——— 4. După „Trimit fără hartă”, o reîncercare nu mai întreabă; după punerea și ștergerea pinului, întreabă din nou ———
        fpage = ctx.new_page(); fpage.on('pageerror', lambda e: errors.append(str(e)[:160]))
        fposts = []
        fpage.route('**/api/v1/citizen/reports', lambda r: (fposts.append(1), r.fulfill(status=500, content_type='application/json',
                    body='{"error":{"code":"INTERNAL","message":"A apărut o eroare internă."}}'))[1] if r.request.method == 'POST' else r.continue_())
        open_form(fpage, URL)
        fill_form(fpage, 'Groapă în carosabil, test E2E pentru reîncercare.')
        fpage.click(SUBMIT); fpage.wait_for_timeout(600)
        fpage.click(f'{PROMPT} >> text=Trimit fără hartă'); fpage.wait_for_timeout(1500)
        alert = '; '.join(fpage.locator('[role=alert]').all_inner_texts())
        fpage.click(SUBMIT); fpage.wait_for_timeout(1500)
        res.check('LF-8 eroare de server după „Trimit fără hartă”: reîncercarea trimite direct, fără a întreba a doua oară',
                  'NU a fost înregistrată' in alert and len(fposts) == 2 and fpage.locator(PROMPT).count() == 0, f'alert={alert[:80]} posts={len(fposts)}')
        m = fpage.locator('[data-testid=location-picker-map]'); m.scroll_into_view_if_needed(); fpage.wait_for_timeout(300)
        bb = m.bounding_box(); fpage.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); fpage.wait_for_timeout(300)
        had_pin = fpage.locator('[data-testid=location-picker-status]').count() == 1
        fpage.click('text=Șterge pinul'); fpage.wait_for_timeout(300)
        fpage.click(SUBMIT); fpage.wait_for_timeout(600)
        res.check('LF-9 pin pus, apoi șters: alegerea „fără hartă” nu mai este valabilă, formularul întreabă din nou',
                  had_pin and fpage.locator(PROMPT).count() == 1 and len(fposts) == 2, f'had_pin={had_pin} posts={len(fposts)}')
    except Exception as exc:  # orice excepție = FAIL raportat, nu oprire fără rezumat
        res.check('EXCEPTIE în scenariu', False, repr(exc)[:300])

    res.check('JS fără erori în pagini', not errors, '; '.join(errors)[:300])
    b.close()

ok = res.report()
sys.exit(0 if ok else 1)
