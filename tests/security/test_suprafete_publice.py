"""Securitate și confidențialitate pe suprafețele publice (post-audit).

- D11 = B: nicio intrare publică spre Admin (public -> Admin = 0); ruta `#admin` rămâne accesibilă direct.
- Datele cetățeanului (nume, e-mail, telefon) nu apar în DOM-ul niciunei pagini publice.
- Un link util `javascript:` injectat în stocare nu se execută.
- A-06 / A-07 / A-08: afirmațiile neconforme nu mai apar.
"""
import sys; sys.dont_write_bytecode = True
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
from harness import *

res = Results('SUPRAFETE PUBLICE (D11, confidentialitate, texte, build productie)')
creds = credentials()
ROUTES = ['home', 'comunicate', 'sesizari', 'harta', 'sondaje', 'ghid']
ADMIN_RE = r'/(^|[^a-zăâîșț])(admin|panou administrare|panou cms|panou de administrare)([^a-zăâîșț]|$)|#admin/i'
PRIVATE = {"id": "rep-sec-priv", "referenceNumber": "TM-095", "categoryId": "iluminat", "categoryName": "Iluminat public",
           "description": "Sesizare de test pentru confidentialitate", "photos": [],
           "location": {"addressOrDetails": "Str. Test 5", "latitude": 43.7489, "longitude": 24.8701, "source": "manual"},
           "contact": {"name": "Radu Confidential", "email": "radu.confidential@example.com", "phone": "0766123456"},
           "createdAt": "2026-01-07T10:00:00.000Z", "status": "transmis", "publicationPreference": "private", "moderationStatus": "approved",
           "resolutionStatus": "in_progress", "cityHallTakenOver": True, "assigneeIds": ["usr-admin-01"]}
# date de contact din seed (TM-001 / TM-002) și din sesizarea injectată
PII = ['Cetățean Demo', 'cetatean@exemplu.ro', '0700000001', 'Anonim Demo',
       'Radu Confidential', 'radu.confidential@example.com', '0766123456', 'usr-admin-01', 'usr-operator']

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

with preview_server(5499) as URL, sync_playwright() as pw:
    b = pw.chromium.launch()

    def fresh(page, extra=None):
        page.goto(URL + '/'); page.evaluate('localStorage.clear(); sessionStorage.clear()'); page.reload(); page.wait_for_load_state('networkidle')
        if extra:
            page.evaluate("r => { const s = JSON.parse(localStorage.getItem('turnu_civic_reports_store')); s.push(r); localStorage.setItem('turnu_civic_reports_store', JSON.stringify(s)); }", extra)
            page.reload(); page.wait_for_load_state('networkidle')

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
    page.fill('input[type="email"]', 'admin@turnumagurele.ro'); page.fill('input[type="password"]', creds['admin@turnumagurele.ro'])
    page.click('button[type="submit"]'); page.wait_for_timeout(500)
    in_admin = page.get_by_role('button', name='Ieșire (Logout)').count() == 1
    res.check('D11-c ruta #admin accesibilă direct: formular de login și autentificare funcționale', has_form and in_admin, f'form={has_form} admin={in_admin}')

    # 4. A-08: textul din Admin Moderare
    page.get_by_text('Moderare Sesizări').first.click(); page.wait_for_timeout(300)
    mod = page.inner_text('body')
    res.check('A-08 Admin Moderare: fără „Cetățeanul alege dacă dorește publicarea”', 'Cetățeanul alege' not in mod and 'Administratorul aprobă sau respinge publicarea' in mod, '')
    page.get_by_role('button', name='Ieșire (Logout)').click(); page.wait_for_timeout(300)

    # 5. A-07: nota de pe pagina de login
    page.goto(URL + '/#admin'); page.wait_for_load_state('networkidle')
    login_txt = page.inner_text('body')
    res.check('A-07 login Admin: fără promisiunea „programat conform Master Planului pentru Etapa 5”',
              'programat conform Master Planului' not in login_txt and 'nu este implementat în această versiune' in login_txt, '')

    # 6. A-06: footer-ul public pe toate paginile
    bad_footer = []
    for route in ROUTES:
        page.goto(URL + '/#' + route); page.wait_for_load_state('networkidle')
        ft = page.locator('footer').inner_text() if page.locator('footer').count() else ''
        if 'redirecționate pe e-mail' in ft or 'nu este activă în această versiune' not in ft:
            bad_footer.append(route)
    res.check('A-06 footer: fără „redirecționate pe e-mail”, cu mențiunea că trimiterea automată nu e activă (6 pagini)', bad_footer == [], str(bad_footer))

    # 7. Date personale: DOM complet al tuturor paginilor publice, cu o sesizare private + preluată + asumată
    fresh(page, PRIVATE)
    # DOM-ul complet, cu excepția atributelor `placeholder` (textul de exemplu al câmpului de e-mail din
    # formular, „cetatean@exemplu.ro”, coincide cu adresa demo din seed și nu reprezintă date ale unei sesizări).
    DOM_JS = "() => { const c = document.documentElement.cloneNode(true); c.querySelectorAll('[placeholder]').forEach(e => e.removeAttribute('placeholder')); return c.outerHTML; }"
    leaks, popup = {}, ''
    for route in ROUTES:
        page.goto(URL + '/#' + route); page.wait_for_load_state('networkidle'); page.wait_for_timeout(400)
        if route == 'harta':
            m = page.locator('.custom-civic-marker', has_text='TM-095')
            if m.count():
                m.first.click(force=True); page.wait_for_timeout(400)
                if page.locator('.leaflet-popup-content').count():
                    popup = page.locator('.leaflet-popup-content').first.inner_html()
        html = page.evaluate(DOM_JS)
        f = [v for v in PII if v in html]
        if f: leaks[route] = f
    res.check('PII-1 date de contact și ID-uri interne absente din DOM-ul complet al celor 6 pagini publice (inclusiv popup deschis)', leaks == {}, json.dumps(leaks, ensure_ascii=False))
    res.check('PII-2 popup-ul sesizării private: vizibil, fără stadiu / preluare / responsabil',
              'TM-095' in popup and all(v not in popup for v in ['Status', 'Preluată', 'În lucru', 'Administrator Platformă']), '')

    # 8. Link util javascript: injectat în stocare nu se execută
    page.goto(URL + '/'); page.evaluate("""() => localStorage.setItem('turnu_civic_city_hall_directory', JSON.stringify({ usefulLinks: [{ id: 'x', title: 'LinkTest', category: 'test', url: 'javascript:window.__jsx=1', description: 'x', isActive: true, order: 0 }] }))""")
    page.goto(URL + '/#ghid'); page.reload(); page.wait_for_load_state('networkidle')
    page.get_by_text('Link-uri Utile').first.click(); page.wait_for_timeout(300)
    lk = page.locator('a', has_text='LinkTest')
    if lk.count():
        try: lk.first.click(timeout=2000)
        except Exception: pass
        page.wait_for_timeout(300)
    res.check('SEC-JS link `javascript:` injectat în stocare: randat, dar neexecutat', lk.count() == 1 and page.evaluate('window.__jsx !== 1'), '')
    b.close()

ok = res.report()
sys.exit(0 if ok else 1)
