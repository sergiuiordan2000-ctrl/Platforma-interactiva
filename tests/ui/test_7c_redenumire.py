"""Etapa 7, 7C, P8 — redenumirea „Turnu Măgurele Civic” → „Urbis Activ” (DEC-14, perimetrul aprobat).

RN-1: titlul paginii este exact „Urbis Activ”, iar `og:title` are conținutul „Urbis Activ”.
RN-2: antetul conține „Urbis Activ” și „Turnu Măgurele”, nu conține eticheta „CIVIC” și nu conține „Turnu Măgurele Civic”.
Criteriile: docs/faza7/FAZA_7_E0_REGISTRU_DECIZII.md, Anexa A.4. Antetul se verifică pe calculator și pe mobil.
Suită separată (server și DB proprii).
"""
import sys; sys.dont_write_bytecode = True
import json, re
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
from harness import *

res = Results('7C REDENUMIRE RN-1, RN-2 (E2E, server real)')


def header_text(pg):
    # textContent: textul din DOM, fără transformările CSS, ca să se compare exact textele aprobate
    return re.sub(r'\s+', ' ', pg.locator('header').first.evaluate('(el) => el.textContent'))


with backend_server(5991) as B, sync_playwright() as pw:
    URL = B['url']
    b = pw.chromium.launch()
    errors = []
    try:
        for label, viewport in (('calculator', {'width': 1280, 'height': 900}), ('mobil', {'width': 375, 'height': 812})):
            c = b.new_context(viewport=viewport); c.route('https://*.tile.openstreetmap.org/**', lambda r: r.abort())
            p = c.new_page(); p.on('pageerror', lambda e: errors.append(str(e)[:160]))
            p.goto(URL + '/#home'); p.wait_for_load_state('networkidle'); p.wait_for_timeout(600)
            if label == 'calculator':
                title = p.title()
                og = p.locator('meta[property="og:title"]').get_attribute('content')
                res.check('RN-1: titlul paginii este exact „Urbis Activ”', title == 'Urbis Activ', json.dumps(title, ensure_ascii=False))
                res.check('RN-1: og:title are conținutul „Urbis Activ”', og == 'Urbis Activ', json.dumps(og, ensure_ascii=False))
            t = header_text(p)
            visible = p.locator('header').first.get_by_text('Urbis Activ', exact=True)
            res.check(f'RN-2 ({label}): antetul conține „Urbis Activ” (vizibil) și „Turnu Măgurele”',
                      'Urbis Activ' in t and 'Turnu Măgurele' in t and visible.count() >= 1 and visible.first.is_visible(), t[:160])
            res.check(f'RN-2 ({label}): antetul nu conține eticheta „CIVIC” și nu conține „Turnu Măgurele Civic”',
                      'CIVIC' not in t and 'Turnu Măgurele Civic' not in t, t[:160])
            c.close()
        res.check('fără erori JavaScript necaptate în pagini', not errors, '; '.join(errors[:3]))
    finally:
        b.close()

sys.exit(0 if res.report() else 1)
