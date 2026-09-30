"""Securitate și confidențialitate pe suprafețele publice (post-audit).

- D11 = B: nicio intrare publică spre Admin (public -> Admin = 0); ruta `#admin` rămâne accesibilă direct.
- Datele cetățeanului (nume, e-mail, telefon) nu apar în DOM-ul niciunei pagini publice.
- Un link util `javascript:` (rând corupt în DB, ocolind validarea API-ului) nu se execută.
- A-06 / A-07 / A-08: afirmațiile neconforme nu mai apar.

Faza 5.4: sesizarea de test nu se mai injectează în `localStorage`; se creează prin API, dintr-un cont de cetățean,
apoi este preluată de Primărie și asumată de super_admin. PII-2 urmează A-7: stadiul este public; preluarea,
responsabilii și autorul nu sunt. A-08: ecranul Admin „Sesizări” nu mai are moderare (2.3).
"""
import sys; sys.dont_write_bytecode = True
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
import harness
from harness import *

res = Results('SUPRAFETE PUBLICE (D11, confidentialitate, texte, build productie)')
ROUTES = ['home', 'comunicate', 'sesizari', 'harta', 'sondaje', 'ghid']
ADMIN_RE = r'/(^|[^a-zăâîșț])(admin|panou administrare|panou cms|panou de administrare)([^a-zăâîșț]|$)|#admin/i'
CITIZEN = 'radu.confidential@example.com'
# datele care nu au voie să apară public: e-mailul contului autorului, e-mailurile și numele operatorilor,
# ID-urile interne (ale sesizării și ale conturilor Admin) — completate după crearea sesizării
PII = [CITIZEN, 'e2e-admin@exemplu.test', 'e2e-operator@exemplu.test', 'Administrator Platformă', 'Operator Primărie']

SCAN_JS = """(re) => {
  const rx = new RegExp(re.slice(1, re.lastIndexOf('/')), re.slice(re.lastIndexOf('/') + 1));
  const clickable = [...document.querySelectorAll('body *')].filter(e => {
    const tag = e.tagName.toLowerCase();
    return tag === 'a' || tag === 'button' || e.getAttribute('role') === 'button' || getComputedStyle(e).cursor === 'pointer';
  });
  return clickable.filter(e => {
    const t = [e.innerText || '', e.getAttribute('title') || '', e.getAttribute('aria-label') || '', e.getAttribute('href') || ''].join(' ');
    return rx.test(t);
  }).map(e => (e.innerText || e.getAttribute('title') || e.getAttribute('href') || '').trim().slice(0, 50));
}"""

with backend_server(5499) as BACKEND, sync_playwright() as pw:
    URL = BACKEND['url']
    b = pw.chromium.launch()

    def fresh(page):
        page.goto(URL + '/'); page.evaluate('localStorage.clear(); sessionStorage.clear()'); page.reload(); page.wait_for_load_state('networkidle')

    # 1. D11: scanare text/title/href a elementelor clicabile, mobil + desktop
    found = {}
    for label, vp in [('mobil', {'width': 390, 'height': 844}), ('desktop', {'width': 1280, 'height': 900})]:
        page = b.new_context(viewport=vp).new_page(); fresh(page)
        for route in ROUTES:
            page.goto(URL + '/#' + route); page.wait_for_load_state('networkidle'); page.wait_for_timeout(300)
            hits = page.evaluate(SCAN_JS, ADMIN_RE)
            if hits: found[f'{label}/{route}'] = hits
        page.context.close()
    res.check('D11-a niciun element clicabil public cu „Admin” / „Panou Administrare” / href #admin (6 pagini, mobil + desktop)', found == {}, json.dumps(found, ensure_ascii=False))

    # 2. D11: click pe fiecare element clicabil „exterior” din fiecare pagină publică -> nu ajunge la #admin
    page = b.new_context(viewport={'width': 1280, 'height': 900}).new_page(); fresh(page)
    reached, clicked = [], 0
    for route in ROUTES:
        page.goto(URL + '/#' + route); page.wait_for_load_state('networkidle'); page.wait_for_timeout(300)
        n = page.evaluate("""() => {
          const outer = [...document.querySelectorAll('body *')].filter(e => {
            const tag = e.tagName.toLowerCase(); const href = e.getAttribute('href') || '';
            const ptr = tag === 'a' || tag === 'button' || getComputedStyle(e).cursor === 'pointer';
            if (!ptr || e.closest('input,select,textarea,label') || /^(tel:|mailto:|https?:)/.test(href) || e.getAttribute('target') === '_blank') return false;
            const p = e.parentElement && e.parentElement.closest('a,button,[data-e2e-click]');
            const pc = e.parentElement && getComputedStyle(e.parentElement).cursor === 'pointer';
            return !p && !pc && e.getBoundingClientRect().width > 0;
          });
          outer.forEach((e, i) => e.setAttribute('data-e2e-click', String(i)));
          return outer.length; }""")
        for i in range(n):
            page.goto(URL + '/#' + route); page.wait_for_load_state('networkidle')
            page.evaluate("""() => { const outer = [...document.querySelectorAll('body *')].filter(e => {
                const tag = e.tagName.toLowerCase(); const href = e.getAttribute('href') || '';
                const ptr = tag === 'a' || tag === 'button' || getComputedStyle(e).cursor === 'pointer';
                if (!ptr || e.closest('input,select,textarea,label') || /^(tel:|mailto:|https?:)/.test(href) || e.getAttribute('target') === '_blank') return false;
                const p = e.parentElement && e.parentElement.closest('a,button,[data-e2e-click]');
                const pc = e.parentElement && getComputedStyle(e.parentElement).cursor === 'pointer';
                return !p && !pc && e.getBoundingClientRect().width > 0; });
              outer.forEach((e, j) => e.setAttribute('data-e2e-click', String(j))); }""")
            el = page.locator(f'[data-e2e-click="{i}"]')
            if not el.count():
                continue
            try:
                el.first.click(timeout=1500, force=True); clicked += 1
            except Exception:
                continue
            page.wait_for_timeout(120)
            h = page.evaluate('location.hash').lower()
            if 'admin' in h:
                reached.append(f'{route}#{i}')
    res.check(f'D11-b public -> Admin = 0 (click pe {clicked} elemente clicabile din 6 pagini publice)', reached == [] and clicked > 20, json.dumps(reached))

    # 3. Admin rămâne accesibil prin acces direct
    page.goto(URL + '/#admin'); page.wait_for_load_state('networkidle')
    has_form = page.locator('input[type="email"]').count() == 1 and page.locator('input[type="password"]').count() == 1
    page.fill('input[type="email"]', BACKEND['admin']); page.fill('input[type="password"]', BACKEND['password'])
    page.click('button[type="submit"]'); page.wait_for_timeout(500)
    # 5.2: super_admin cere TOTP (cont de test creat de `dev:e2e-setup`)
    page.fill('input[aria-label="Cod de 6 cifre"]', totp_code(BACKEND['totp_secret']))
    page.click('button[type="submit"]'); page.wait_for_timeout(800)
    harness._LAST_TOTP['step'] = int(time.time() // 30)  # anti-reluare TOTP: următoarea autentificare așteaptă un cod nou
    in_admin = page.get_by_role('button', name='Ieșire (Logout)').count() == 1
    res.check('D11-c ruta #admin accesibilă direct: formular de login și autentificare funcționale', has_form and in_admin, f'form={has_form} admin={in_admin}')

    # 4. A-08 (actualizat la 5.4): ecranul Admin „Sesizări”, fără moderare (2.3) și fără „Cetățeanul alege”
    page.get_by_text('C. Sesizări').first.click(); page.wait_for_timeout(800)
    mod = page.inner_text('body')
    res.check('A-08 Admin Sesizări: fără moderare (2.3) și fără „Cetățeanul alege dacă dorește publicarea”',
              'Cetățeanul alege' not in mod and 'fără moderare' in mod and 'Aprobă' not in mod and 'Respinge' not in mod, '')
    page.get_by_role('button', name='Ieșire (Logout)').click(); page.wait_for_timeout(300)

    # 5. A-07: nota de pe pagina de login
    page.goto(URL + '/#admin'); page.wait_for_load_state('networkidle')
    login_txt = page.inner_text('body')
    res.check('A-07 login Admin: fără promisiunea „programat conform Master Planului pentru Etapa 5”',
              'programat conform Master Planului' not in login_txt and 'Autentificare pe server' in login_txt, '')

    # 6. A-06: footer-ul public pe toate paginile
    bad_footer = []
    for route in ROUTES:
        page.goto(URL + '/#' + route); page.wait_for_load_state('networkidle')
        ft = page.locator('footer').inner_text() if page.locator('footer').count() else ''
        if 'redirecționate pe e-mail' in ft or 'nu este activă în această versiune' not in ft:
            bad_footer.append(route)
    res.check('A-06 footer: fără „redirecționate pe e-mail”, cu mențiunea că trimiterea automată nu e activă (6 pagini)', bad_footer == [], str(bad_footer))

    # 7. Date personale: DOM complet al tuturor paginilor publice, cu o sesizare preluată + asumată (5.4: prin API)
    cctx = b.new_context()
    citizen_login_api(cctx, URL, CITIZEN)
    tok = form_token(cctx, URL)
    rr = submit_report_api(cctx, URL, tok, 'Sesizare de test pentru confidentialitate',
                           {'text': 'Str. Test 5', 'lat': 43.7489, 'lng': 24.8701, 'source': 'pin'}, transmit=True, notify=True)
    ref = rr.json().get('referenceNumber', 'TM-???')
    rid = db_query('SELECT id FROM reports WHERE reference_number = ?', [ref])[0]['id']
    ids = [r['id'] for r in db_query('SELECT id FROM admin_users')]
    PII += [rid] + ids
    op = b.new_context(); opage = op.new_page(); admin_login(opage, URL, BACKEND, BACKEND['op'])
    assert op.request.post(URL + f'/api/v1/admin/reports/{rid}/takeover', headers=CSRF).status == 200
    sa = b.new_context(); spage = sa.new_page(); admin_login(spage, URL, BACKEND, BACKEND['admin'])
    assert sa.request.post(URL + f'/api/v1/admin/reports/{rid}/assume', headers=CSRF).status == 200
    fresh(page)
    # DOM-ul complet, cu excepția atributelor `placeholder` (textul de exemplu al câmpului de e-mail din
    # formular, „cetatean@exemplu.ro”, coincide cu adresa demo din seed și nu reprezintă date ale unei sesizări).
    DOM_JS = "() => { const c = document.documentElement.cloneNode(true); c.querySelectorAll('[placeholder]').forEach(e => e.removeAttribute('placeholder')); return c.outerHTML; }"
    leaks, popup = {}, ''
    for route in ROUTES:
        page.goto(URL + '/#' + route); page.wait_for_load_state('networkidle'); page.wait_for_timeout(400)
        if route == 'harta':
            page.wait_for_timeout(500)
            m = page.locator('.custom-civic-marker', has_text=ref)
            if m.count():
                m.first.scroll_into_view_if_needed(); m.first.locator('div').first.click(force=True); page.wait_for_timeout(500)
                if page.locator('.leaflet-popup-content').count():
                    popup = page.locator('.leaflet-popup-content').first.inner_html()
        html = page.evaluate(DOM_JS)
        f = [v for v in PII if v in html]
        if f: leaks[route] = f
    res.check('PII-1 date de contact și ID-uri interne absente din DOM-ul complet al celor 6 pagini publice (inclusiv popup deschis)', leaks == {}, json.dumps(leaks, ensure_ascii=False))
    res.check('PII-2 popup-ul sesizării preluate și asumate: vizibil, cu stadiul public (A-7), fără preluare / responsabil / autor',
              ref in popup and 'Nouă' in popup and all(v not in popup for v in ['Preluată', 'Administrator Platformă', 'Operator Primărie', CITIZEN]), popup[:120])

    # 8. Link util `javascript:` nu se execută. Faza 5.3: linkurile vin din DB, iar API-ul respinge
    # `javascript:` (422, server/test/integration/adminContent.test.ts); aici se simulează un rând corupt
    # scris direct în DB, ocolind API-ul, pentru a verifica și randarea.
    db_exec("INSERT INTO directory_links (id, title, description, url, category, is_external, is_active, sort_order, is_demo, created_at, updated_at) "
            "VALUES ('01M3JMZC00Y9CTNMQ1MBDR4JSX', 'LinkTest', 'x', 'javascript:window.__jsx=1', 'Servicii Digitale', true, true, 0, true, NOW(3), NOW(3))")
    page.goto(URL + '/#ghid'); page.reload(); page.wait_for_load_state('networkidle')
    page.get_by_text('Link-uri Utile').first.click(); page.wait_for_timeout(300)
    lk = page.locator('a', has_text='LinkTest')
    if lk.count():
        try: lk.first.click(timeout=2000)
        except Exception: pass
        page.wait_for_timeout(300)
    res.check('SEC-JS link `javascript:` (rând corupt în DB): randat, dar neexecutat', lk.count() == 1 and page.evaluate('window.__jsx !== 1'), '')
    b.close()

ok = res.report()
sys.exit(0 if ok else 1)
