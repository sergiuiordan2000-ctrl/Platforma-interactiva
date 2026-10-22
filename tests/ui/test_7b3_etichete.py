"""Etapa 7, 7B.3 — N-7B-1: etichetele interne (planul `docs/faza7/FAZA_7B_PLAN.md` §5; deciziile din 22.10.2026:
grupul A integral, punctul 5 „Modul Funcțional”; footer A; Acasă B; Ghid B).

Verifică textele exacte aprobate, absența codurilor eliminate și păstrarea informației utile (paragraful de pe Acasă,
caseta din Ghid cu butonul de întoarcere). Pe Comunicate, Ghid și Acasă nu trebuie să rămână niciun cod „Etapa NX” /
„(NX)” / „Faza 5”. În afara deciziilor (nu se verifică): insigna „Activ (2A / 2B)” de pe Acasă și descrierea sondajului
demonstrativ („Etapa 4A”, date din server/seeds). Suită separată (server și DB proprii).
"""
import sys; sys.dont_write_bytecode = True
import json, re
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
from harness import *

res = Results('7B.3 ETICHETE N-7B-1 (E2E, server real)')
# codurile interne care nu mai trebuie să apară în textul vizibil: „Etapa 1A”…„Etapa 5B”, „(3E)”, „(4B)”, „Faza 5”
CODES = re.compile(r'Etapa \d[A-Z]|\(\d[A-Z]\)|Faza 5|Scheletul Aplicației|Status Dezvoltare')
HOME_INFO = ('Comunicatele, Ghidul Primăriei, Apelul rapid, sesizările și sondajele funcționează pe server. Sesizările se depun dintr-un '
             'cont confirmat prin e-mail și apar imediat pe hartă, fără moderare; contul și adresa de e-mail a autorului nu sunt '
             'afișate public. Sondajele sunt consultări orientative, fără cont.')
GHID_TITLE = 'Status Modul: Ghidul Primăriei & Quick Dial sunt ACTIVE'
GHID_TEXT = ('Informațiile instituționale ale Primăriei și sistemul de apelare rapidă pe categorii sunt complet funcționale. '
             'Administrarea dinamică din zona de Admin este de asemenea implementată și funcțională.')


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
        res.check('Acasă (4, B): titlul „Versiune de test”; paragraful informativ păstrat integral',
                  p.get_by_text('Versiune de test', exact=True).count() == 1 and HOME_INFO in t, '')
        activ = [re.sub(r'\s+', ' ', x).strip() for x in p.get_by_text(re.compile(r'^\s*Activ')).all_text_contents()]
        # „Activ (2A / 2B)” (a patra insignă) nu este în inventarul aprobat: nu se verifică aici (constatare separată)
        res.check('Acasă (2, 3): fără „Etapa 1B”; cele trei insigne aprobate devin „Activ”',
                  activ.count('Activ') == 3 and 'Etapa 1B' not in t and not any(f'Activ ({x})' in t for x in ('3E', '1B', '3D')),
                  json.dumps(activ, ensure_ascii=False))
        res.check('Acasă: niciun cod „Etapa NX”, „(NX)” sau „Faza 5” (insigna „Activ (2A / 2B)” nu este inventariată și rămâne)', not codes(t), json.dumps(codes(t)))

        p.goto(URL + '/#comunicate'); p.wait_for_load_state('networkidle'); p.wait_for_timeout(800)
        t = body(p)
        res.check('Comunicate (5): „Modul Funcțional”, fără etapă; niciun cod în textul vizibil',
                  p.get_by_text('Modul Funcțional', exact=True).count() == 1 and 'Evenimente Integrate' not in t and not codes(t), json.dumps(codes(t)))

        p.goto(URL + '/#ghid'); p.wait_for_load_state('networkidle'); p.wait_for_timeout(800)
        t = body(p)
        res.check('Ghid (6, 7 B): „Modul Funcțional”; caseta cu titlul și paragraful aprobate; butonul spre Acasă păstrat; niciun cod',
                  p.get_by_text('Modul Funcțional', exact=True).count() == 1 and GHID_TITLE in t and GHID_TEXT in t
                  and p.get_by_text(GHID_TITLE).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]').get_by_role('button').count() == 1
                  and not codes(t), json.dumps(codes(t)))
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
