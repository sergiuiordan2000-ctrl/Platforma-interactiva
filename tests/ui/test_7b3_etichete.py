"""Etapa 7, 7B.3 — N-7B-1: etichetele interne (planul `docs/faza7/FAZA_7B_PLAN.md` §5; deciziile din 22.10.2026:
grupul A integral, punctul 5 „Modul Funcțional”; footer A; Acasă B; Ghid B).

Verifică textele exacte aprobate, absența codurilor eliminate și păstrarea informației utile (paragraful de pe Acasă,
caseta din Ghid cu butonul de întoarcere). Pe Comunicate, Ghid și Acasă nu trebuie să rămână niciun cod „Etapa NX” /
„(NX)” / „Faza 5”. În afara deciziilor (nu se verifică): descrierea sondajului demonstrativ („Etapa 4A”, date din
server/seeds). Suită separată (server și DB proprii).

Actualizat la curățarea textelor de test (20.11.2026, după lansarea publică): „Versiune de test” devine „Bine de știut”
(paragraful fără fraza tehnică, cu transmiterea către Primărie); insigna „Activ (2A / 2B)” devine „Activ”; ecusoanele
fixe „Date demonstrative (DEMO)” de pe Comunicate și Ghid dispar; caseta din Ghid devine „Despre aceste informații”.
"""
import sys; sys.dont_write_bytecode = True
import json, re
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
from harness import *

res = Results('7B.3 ETICHETE N-7B-1 (E2E, server real)')
# codurile interne care nu mai trebuie să apară în textul vizibil: „Etapa 1A”…„Etapa 5B”, „(3E)”, „(4B)”, „Faza 5”
CODES = re.compile(r'Etapa \d[A-Z]|\(\d[A-Z]\)|Faza 5|Scheletul Aplicației|Status Dezvoltare')
HOME_INFO = ('Sesizările se depun dintr-un cont confirmat prin e-mail și apar imediat pe hartă, fără moderare; contul și adresa '
             'de e-mail a autorului nu sunt afișate public. La cererea ta, sesizarea poate fi transmisă prin e-mail Primăriei. '
             'Sondajele sunt consultări orientative, fără cont.')
GHID_TITLE = 'Despre aceste informații'
GHID_TEXT = ('Informațiile sunt preluate din surse publice ale Primăriei Municipiului Turnu Măgurele și pot conține mici '
             'neconcordanțe. Înainte de deplasare, verifică programul la numărul de telefon afișat.')
# textele de test care nu mai au voie să apară în paginile publice după lansare
TEST_LABELS = ('Versiune de test', 'Date demonstrative (DEMO)', 'funcționează pe server', 'Status Modul', '(2A / 2B)', 'max 1920px', 'TM-XXX')


def body(pg):
    # textContent: textul din DOM, fără transformările CSS (de ex. `uppercase`), ca să se compare exact textele aprobate
    return re.sub(r'\s+', ' ', pg.evaluate('() => document.body.textContent'))


def codes(text):
    return sorted(set(CODES.findall(text)))


with backend_server(5995) as B, sync_playwright() as pw:
    URL = B['url']
    b = pw.chromium.launch()
    errors = []
    try:
        c = b.new_context(viewport={'width': 1280, 'height': 900}); c.route('https://*.tile.openstreetmap.org/**', lambda r: r.abort())
        p = c.new_page(); p.on('pageerror', lambda e: errors.append(str(e)[:160]))

        # ——— public ———
        p.goto(URL + '/#home'); p.wait_for_load_state('networkidle'); p.wait_for_timeout(800)
        t = body(p)
        footer = re.sub(r'\s+', ' ', p.locator('footer').text_content())
        res.check('Footer (1, A): fără rândul „Versiune: …” și fără punctul verde pulsatoriu',
                  'Versiune:' not in footer and p.locator('footer .animate-pulse').count() == 0,
                  json.dumps({'versiune': 'Versiune:' in footer, 'puncte': p.locator('footer .animate-pulse').count()}))
        res.check('Acasă: titlul „Bine de știut”; paragraful informativ actualizat',
                  p.get_by_text('Bine de știut', exact=True).count() == 1 and HOME_INFO in t, '')
        activ = [re.sub(r'\s+', ' ', x).strip() for x in p.get_by_text(re.compile(r'^\s*Activ')).all_text_contents()]
        res.check('Acasă (2, 3): fără „Etapa 1B”; toate cele patru insigne sunt „Activ”',
                  activ.count('Activ') == 4 and 'Etapa 1B' not in t and not any(f'Activ ({x})' in t for x in ('3E', '1B', '3D', '2A / 2B')),
                  json.dumps(activ, ensure_ascii=False))
        res.check('Acasă: niciun cod „Etapa NX”, „(NX)” sau „Faza 5”', not codes(t), json.dumps(codes(t)))
        res.check('Acasă: niciun text de test', not [x for x in TEST_LABELS if x in t], json.dumps([x for x in TEST_LABELS if x in t], ensure_ascii=False))

        p.goto(URL + '/#comunicate'); p.wait_for_load_state('networkidle'); p.wait_for_timeout(800)
        t = body(p)
        res.check('Comunicate (5): „Modul Funcțional”, fără etapă; niciun cod în textul vizibil',
                  p.get_by_text('Modul Funcțional', exact=True).count() == 1 and 'Evenimente Integrate' not in t and not codes(t), json.dumps(codes(t)))
        res.check('Comunicate: fără ecusonul fix „Date demonstrative (DEMO)”', 'Date demonstrative (DEMO)' not in t, '')

        p.goto(URL + '/#ghid'); p.wait_for_load_state('networkidle'); p.wait_for_timeout(800)
        t = body(p)
        res.check('Ghid (6, 7 B): „Modul Funcțional”; caseta cu titlul și paragraful aprobate; butonul spre Acasă păstrat; niciun cod',
                  p.get_by_text('Modul Funcțional', exact=True).count() == 1 and GHID_TITLE in t and GHID_TEXT in t
                  and p.get_by_text(GHID_TITLE).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]').get_by_role('button').count() == 1
                  and not codes(t), json.dumps(codes(t)))
        res.check('Ghid: niciun text de test', not [x for x in TEST_LABELS if x in t], json.dumps([x for x in TEST_LABELS if x in t], ensure_ascii=False))
        c.close()

        # ——— Admin ———
        c = b.new_context(viewport={'width': 1280, 'height': 900}); p = c.new_page(); p.on('pageerror', lambda e: errors.append(str(e)[:160]))
        admin_login(p, URL, B, B['admin'])
        t = body(p)
        tabs = [re.sub(r'\s+', ' ', x).strip() for x in p.locator('[data-admin-tab]').all_text_contents()]
        res.check('Admin (8, 9): „CMS Activ”; tab-urile „Comunicate” și „D. Sondaje Civice”, fără coduri',
                  p.get_by_text('CMS Activ', exact=True).count() == 1 and 'Comunicate' in tabs and 'D. Sondaje Civice' in tabs
                  and not any(codes(x) for x in tabs), json.dumps(tabs, ensure_ascii=False))
        res.check('Dashboard Admin (10): descrierile fără „(Etapa …)”',
                  'Creare, editare, publicare, dezactivare și evenimente locale.' in t and 'Administrarea sondajelor și consultărilor publice.' in t
                  and not codes(t), json.dumps(codes(t)))
        # navigarea după atribut: textul tab-ului este verificat mai sus (8, 9); așa un tab redenumit nu oprește testul
        p.locator('[data-admin-tab=surveys]').click(); p.wait_for_timeout(800)
        t = body(p)
        res.check('Sondaje Admin (11): „Gestiune Sondaje & Consultări”, fără etapă',
                  p.get_by_text('Gestiune Sondaje & Consultări', exact=True).count() == 1 and 'Etapa 4B' not in t, json.dumps(codes(t)))
        p.get_by_role('button', name='Sondaj Nou').click(); p.wait_for_timeout(500)
        t = body(p)
        res.check('Formular sondaj (12): „Panou Administrativ”, fără etapă',
                  p.get_by_text('Panou Administrativ', exact=True).count() == 1 and 'Etapa 4B' not in t, json.dumps(codes(t)))
        c.close()
        res.check('fără erori JavaScript necaptate în pagini', not errors, '; '.join(errors[:3]))
    finally:
        b.close()

sys.exit(0 if res.report() else 1)
