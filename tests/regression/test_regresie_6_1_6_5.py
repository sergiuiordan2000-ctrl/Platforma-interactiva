"""Regresie compactă 6.1–6.5, revizuită la Faza 5.4 (sesizările pe server; B10 §7).

- R6.1 revizuit conform A-1 (decizie de produs, nu ajustare pentru a trece): ștergerea NU mai este interzisă;
  este permisă numai autorului (propria sesizare) și lui super_admin, pe server; contorul TM rămâne strict crescător
  și un număr șters nu se refolosește (D25–D26).
- R6.2 (cota `localStorage`) → echivalentul pe server: o eroare la salvare nu afișează confirmarea și păstrează formularul (6.2).
- R6.3 XSS pe hartă, R6.4 sesiunea Admin, R6.5 gărzi și modelul public: aceleași reguli, verificate pe serverul real.
Corespondența completă: docs/faza5/FAZA_5_4_RAPORT.md.
"""
import sys; sys.dont_write_bytecode = True
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
import harness
from harness import *

res = Results('REGRESIE 6.1-6.5 (revizuită 5.4)')
creds = dev_users()
ADMIN, OP = 'admin@turnumagurele.ro', 'operator@turnumagurele.ro'
LOGIN = "const login = (e) => { authService.setUserForDevTests(null); authService.setUserForDevTests(arg.creds[e]); if (!authService.getCurrentUser()) throw new Error('login'); };"
PIN = {'text': 'Str. R', 'lat': 43.7518, 'lng': 24.8692, 'source': 'pin'}
XSS = '<img src=x onerror="window.__xss=1">'

with backend_server(5799) as BACKEND, dev_server(api_proxy=f'http://127.0.0.1:5799'), sync_playwright() as pw:
    URL = BACKEND['url']
    b = pw.chromium.launch()
    errors = []
    try:
        # ——— R6.1 (A-1): ștergere numai de autor / super_admin; contor strict crescător, fără refolosire ———
        c1 = b.new_context(); citizen_login_api(c1, URL, 'autor.r61@exemplu.test')
        c2 = b.new_context(); citizen_login_api(c2, URL, 'altul.r61@exemplu.test')
        tok = form_token(c1, URL)
        n1 = submit_report_api(c1, URL, tok, 'Prima sesizare pentru regresia R6.1.', PIN).json()['referenceNumber']
        n2 = submit_report_api(c1, URL, tok, 'A doua sesizare pentru regresia R6.1.', PIN).json()['referenceNumber']
        anon = b.new_context()
        del_anon = anon.request.delete(URL + f'/api/v1/citizen/reports/{n2}', headers=CSRF).status
        del_other = c2.request.delete(URL + f'/api/v1/citizen/reports/{n2}', headers=CSRF).status
        del_own = c1.request.delete(URL + f'/api/v1/citizen/reports/{n2}', headers=CSRF).status
        n3 = submit_report_api(c1, URL, tok, 'A treia sesizare pentru regresia R6.1.', PIN).json()['referenceNumber']
        seq = [int(x[3:]) for x in (n1, n2, n3)]
        opc = b.new_context(); opage = opc.new_page(); admin_login(opage, URL, BACKEND, BACKEND['op'])
        rid1 = db_query('SELECT id FROM reports WHERE reference_number = ?', [n1])[0]['id']
        del_op = opc.request.delete(URL + f'/api/v1/admin/reports/{rid1}', headers=CSRF).status
        r61 = dict(seq=seq, anon=del_anon, other=del_other, own=del_own, op=del_op)
        res.check('R6.1 (A-1) ștergere: fără sesiune 401, a altuia 404, proprie 204, operator 403; TM strict crescător, fără refolosire',
                  seq[1] == seq[0] + 1 and seq[2] == seq[1] + 1 and (del_anon, del_other, del_own, del_op) == (401, 404, 204, 403), json.dumps(r61))

        # ——— R6.2: eroare la salvare → fără confirmare, formularul păstrat ———
        fctx = b.new_context(viewport={'width': 1280, 'height': 900}); fctx.route('https://*.tile.openstreetmap.org/**', lambda r: r.abort())
        citizen_login_api(fctx, URL, 'autor.r61@exemplu.test')
        fp = fctx.new_page(); fp.on('pageerror', lambda e: errors.append(str(e)[:160]))
        fp.route('**/api/v1/citizen/reports', lambda r: r.fulfill(status=500, content_type='application/json',
                 body='{"error":{"code":"INTERNAL","message":"A apărut o eroare internă."}}') if r.request.method == 'POST' else r.continue_())
        fp.goto(URL + '/#sesizari'); fp.wait_for_load_state('networkidle'); fp.wait_for_timeout(800)
        fp.click('text=Drumuri / carosabil'); fp.fill('#report-desc', 'Groapă mare pe carosabil, test R6.2.'); fp.fill('#report-location', 'Str. R6.2')
        fp.click('button[type=submit]:has-text("Trimite sesizarea")'); fp.wait_for_timeout(1500)
        alert = '; '.join(fp.locator('[role=alert]').all_inner_texts())
        kept = fp.input_value('#report-desc') == 'Groapă mare pe carosabil, test R6.2.'
        res.check('R6.2 eroare pe server la trimitere: mesaj „NU a fost înregistrată”, fără confirmare, datele păstrate (6.2)',
                  'NU a fost înregistrată' in alert and 'Sesizarea a fost înregistrată' not in fp.inner_text('body') and kept, alert[:160])

        # ——— R6.3: XSS pe hartă (descriere și loc), cu asumare ———
        rx = submit_report_api(c1, URL, tok, XSS + ' descriere de test', {**PIN, 'lat': 43.7465, 'lng': 24.8745, 'text': XSS}).json()['referenceNumber']  # poziție proprie: fără marcaje suprapuse
        sa = b.new_context(); spage = sa.new_page(); admin_login(spage, URL, BACKEND, BACKEND['admin'])
        ridx = db_query('SELECT id FROM reports WHERE reference_number = ?', [rx])[0]['id']
        sa.request.post(URL + f'/api/v1/admin/reports/{ridx}/assume', headers=CSRF)
        mctx = b.new_context(viewport={'width': 1280, 'height': 900}); mctx.route('https://*.tile.openstreetmap.org/**', lambda r: r.abort())
        mp = mctx.new_page(); mp.on('pageerror', lambda e: errors.append(str(e)[:160]))
        mp.goto(URL + '/#harta'); mp.wait_for_load_state('networkidle'); mp.wait_for_selector('.custom-civic-marker', timeout=5000); mp.wait_for_timeout(300)
        mk = mp.locator('.custom-civic-marker', has_text=rx).first
        mk.scroll_into_view_if_needed(); mk.locator('div').first.click(force=True); mp.wait_for_timeout(500)
        popup_text = mp.locator('.leaflet-popup-content').first.inner_text() if mp.locator('.leaflet-popup-content').count() else ''
        shown = 'onerror' in popup_text and '<img' in popup_text  # afișat literal, ca text
        injected = mp.evaluate("document.querySelectorAll('.leaflet-pane img[src=\"x\"]').length")
        xss = mp.evaluate('window.__xss === 1')
        res.check('R6.3 XSS: popup-ul sesizării deschis, payload afișat ca text, niciun <img src=x>, nicio execuție', shown and injected == 0 and not xss, f'img={injected} exec={xss} popupText={shown}')

        # ——— R6.4: login fără DEMO; sesiune falsificată în browser respinsă (dev, servicii reale) ———
        dctx = b.new_context(); page = dctx.new_page(); page.on('pageerror', lambda e: errors.append(str(e)[:160]))
        page.goto(BASE + '/#admin'); page.wait_for_load_state('networkidle')
        body = page.inner_text('body')
        res.check('R6.4a fără login DEMO și fără credențiale afișate',
                  'DEMO' not in body.upper().replace('DEMONSTR', '') and all(u['email'] not in body for u in creds.values())
                  and 'password ===' not in open(os.path.join(REPO, 'src/services/authService.ts'), encoding='utf-8').read(), '')
        run_js(page, "localStorage.setItem('turnu_civic_admin_session', JSON.stringify({ role: 'super_admin' })); return 1;")
        page.reload(); page.wait_for_load_state('networkidle')
        r64 = run_js(page, "return { user: authService.getCurrentUser(), stored: localStorage.getItem('turnu_civic_admin_session') };")
        res.check('R6.4b sesiune cu formă invalidă: respinsă și ștearsă', r64 == {'user': None, 'stored': None}, json.dumps(r64))
        run_js(page, "localStorage.setItem('turnu_civic_admin_session', JSON.stringify({ id: 'usr-fals', email: 'x@y.z', name: 'Fals', role: 'super_admin', lastLogin: '' })); return 1;")
        page.reload(); page.wait_for_load_state('networkidle')
        p7 = run_js(page, """
          const r = await fetch('/api/v1/admin/reports', { credentials: 'same-origin' });
          const pub = await (await fetch('/api/v1/public/map-reports')).text();
          return { user: authService.getCurrentUser(), status: r.status, leak: pub.includes('usr-fals') || pub.includes('Fals') };""")
        res.check('R6D-SES-01 (P7): sesiunea falsificată în browser nu are acces la API-ul Admin (401)', p7['user'] is None and p7['status'] == 401, json.dumps(p7))
        res.check('R6.6-P7 ID-ul / numele sesiunii falsificate nu apar în modelul public', not p7['leak'], json.dumps(p7))

        # ——— R6.5: gărzi (server) și modelul public ———
        pub_list = anon.request.get(URL + '/api/v1/admin/reports').status
        op_list = opc.request.get(URL + '/api/v1/admin/reports').status
        sa_resolve = sa.request.patch(URL + f'/api/v1/admin/reports/{ridx}/resolution', headers=CSRF, data={'status': 'resolved'}).status
        moderation = sa.request.patch(URL + f'/api/v1/admin/reports/{ridx}/moderation', headers=CSRF, data={'status': 'approved'}).status
        survey = run_js(page, LOGIN + """
          const s = (await import(loaded('surveyService'))).surveyService; const out = {};
          for (const who of [null, arg.op, arg.admin]) { authService.setUserForDevTests(null); if (who) login(who); out[who || 'public'] = s.resetToDemo(); }
          authService.setUserForDevTests(null); return out;""", {'creds': creds, 'op': OP, 'admin': ADMIN})
        g = dict(public_list=pub_list, operator_list=op_list, super_resolved=sa_resolve, moderation=moderation, survey=survey)
        res.check('R6.5a gărzi: Admin fără sesiune 401; operator listează; super_admin nu marchează „rezolvată” (403, P-9); moderarea nu există (404); sondaje locale conforme matricei',
                  (pub_list, op_list, sa_resolve, moderation) == (401, 200, 403, 404) and survey == {'public': False, OP: False, ADMIN: True}, json.dumps(g))
        pm = anon.request.get(URL + '/api/v1/public/map-reports').json()
        keys = sorted({k for x in pm for k in x.keys()})
        res.check('R6.5b PublicMapReport: numai câmpurile B5 §3 (fără id, contact, autor, asumare, preluare)',
                  keys == sorted(['referenceNumber', 'categoryId', 'categoryName', 'publicDescription', 'publicLocation', 'photoUrl',
                                  'createdAt', 'locationApproximate', 'status']), json.dumps(keys))
        page.goto(BASE + '/#sesizari'); page.wait_for_load_state('networkidle')
        res.check('R6.5c zona publică fără lista „Evidență Locală”', 'Evidență Locală' not in page.inner_text('body'), '')
        ann = run_js(page, "const a = (await import(loaded('announcementService'))).announcementService; return typeof a.getPublicById;")
        res.check('R6.5d getPublicById există (zona publică: numai comunicate publice, 404 altfel)', ann == 'function', ann)
    except Exception as exc:
        res.check('EXCEPTIE în scenariu', False, repr(exc)[:300])

    res.check('R fără erori JS', not errors, '; '.join(errors)[:300])
    b.close()

ok = res.report()
sys.exit(0 if ok else 1)
