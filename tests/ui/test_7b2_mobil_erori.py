"""Etapa 7, 7B.2 — remedierile cu risc redus (planul `docs/faza7/FAZA_7B_PLAN.md` §4; criteriile din §15).

Emulare Chromium (Playwright, `is_mobile` + `has_touch`) — NU test pe telefon real.
- T-A21-1: bannerele hărții nu acoperă butoanele de zoom și nu se suprapun între ele (390 și 360 px);
  atingerea pe „+” / „−” ajunge la controlul de zoom.
- T-A21-3a: tab-urile Admin au aceeași înălțime și un singur rând (390 și 360 px); tab-ul activ ajunge complet
  în vizor; la 1280 px fâșia nu derulează, iar cele patru tab-uri cu text lung se rup ca înainte (aspect neschimbat).
- T-E1: o eroare JavaScript neașteptată → mesajul generic în română; un mesaj API → afișat exact.
- T-E2: fotografia coruptă → mesajul explicit „Nu s-a putut decoda…”; o eroare neașteptată a Canvas → mesajul generic.
- T-E3: o eroare 422 cu căi tehnice → „Întrebarea #2, opțiunea #3” și „alte câmpuri”, fără căi brute.
Suită separată (server și DB proprii).
"""
import sys; sys.dont_write_bytecode = True
import base64, json, tempfile, os
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
from harness import *

res = Results('7B.2 MOBIL SI ERORI (E2E, server real, emulare Chromium)')
CITIZEN = 'b72.e2e@exemplu.test'
GENERIC = 'A apărut o eroare. Încercați din nou.'
PHOTO_GENERIC = 'Una dintre fotografii nu a putut fi procesată'
TABS = ['Dashboard', 'Comunicate', 'A. Ghidul Primăriei', 'B. Numere Utile / Quick Dial', 'C. Sesizări',
        'D. Sondaje Civice', 'Conturi']
LONG_TABS = ['A. Ghidul Primăriei', 'B. Numere Utile / Quick Dial', 'C. Sesizări', 'D. Sondaje Civice']
PNG_1PX = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')

BANNERS = r"""() => {
  const rect = (e) => { const r = e.getBoundingClientRect(); return {x: r.left, y: r.top, w: r.width, h: r.height}; };
  const hit = (a, b) => !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
  const zoom = document.querySelector('.leaflet-control-zoom');
  const wrap = document.querySelector('[data-testid=map-banners]');
  const banners = wrap ? [...wrap.children].map(rect) : [];
  const z = zoom ? rect(zoom) : null;
  const overZoom = banners.some(b => z && hit(b, z));
  let pairs = false; for (let i = 0; i < banners.length; i++) for (let j = i + 1; j < banners.length; j++) if (hit(banners[i], banners[j])) pairs = true;
  const taps = zoom ? [...zoom.querySelectorAll('a')].map(a => { const r = a.getBoundingClientRect();
    const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!(t && t.closest('.leaflet-control-zoom')); }) : [];
  return {n: banners.length, overZoom, pairs, taps};
}"""

TAB_INFO = r"""(labels) => {
  const btns = [...document.querySelectorAll('[data-admin-tab]')];
  const strip = btns[0].parentElement; const s = strip.getBoundingClientRect();
  return {scrollWidth: strip.scrollWidth, clientWidth: strip.clientWidth,
          tabs: btns.map(b => { const r = b.getBoundingClientRect(); const sp = b.querySelector('span');
            const lh = parseFloat(getComputedStyle(sp).lineHeight) || 16;
            return {label: b.innerText.replace(/\s+/g, ' ').trim(), h: Math.round(r.height), lines: Math.round(sp.getBoundingClientRect().height / lh),
                    inStrip: r.left >= s.left - 0.5 && r.right <= s.right + 0.5, ws: getComputedStyle(b).whiteSpace}; })};
}"""

with backend_server(5997) as B, sync_playwright() as pw:
    URL = B['url']
    b = pw.chromium.launch()
    errors = []

    def mobile(width, height, state=None):
        c = b.new_context(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True, storage_state=state)
        c.route('https://*.tile.openstreetmap.org/**', lambda r: r.abort())
        return c

    try:
        # ——— T-A21-1: bannerele hărții (eroare la încărcare + tile-uri blocate) ———
        for (w, h) in [(390, 844), (360, 800)]:
            c = mobile(w, h); p = c.new_page(); p.on('pageerror', lambda e: errors.append(str(e)[:160]))
            p.route('**/api/v1/public/map-reports*', lambda r: r.fulfill(status=500, content_type='application/json',
                    body=json.dumps({'error': {'code': 'INTERNAL', 'message': 'A apărut o eroare internă. Încercați din nou mai târziu.'}})))
            p.goto(URL + '/#harta'); p.wait_for_load_state('networkidle'); p.wait_for_timeout(1500)
            info = p.evaluate(BANNERS)
            res.check(f'T-A21-1 {w} px: ambele bannere afișate, niciunul peste zoom, nesuprapuse; „+” și „−” ating zoom-ul',
                      info['n'] == 2 and not info['overZoom'] and not info['pairs'] and info['taps'] == [True, True], json.dumps(info))
            c.close()

        # ——— T-E1: eroare neașteptată (corp `null` → TypeError în serviciu) și mesaj API exact ———
        c = mobile(390, 844); p = c.new_page(); p.on('pageerror', lambda e: errors.append(str(e)[:160]))
        p.route('**/api/v1/public/surveys?state=open*', lambda r: r.fulfill(status=200, content_type='application/json', body='null'))
        p.goto(URL + '/#sondaje'); p.wait_for_load_state('networkidle'); p.wait_for_timeout(800)
        body = p.inner_text('body')
        res.check('T-E1 eroare JavaScript neașteptată → mesajul generic în română, fără textul tehnic al browserului',
                  GENERIC in body and 'Cannot read' not in body and 'properties of' not in body)
        p.unroute('**/api/v1/public/surveys?state=open*')
        p.route('**/api/v1/public/surveys?state=open*', lambda r: r.fulfill(status=409, content_type='application/json',
                body=json.dumps({'error': {'code': 'CONFLICT', 'message': 'Mesaj API de test 7B.2.'}})))
        p.reload(); p.wait_for_load_state('networkidle'); p.wait_for_timeout(800)
        res.check('T-E1 mesajul unei erori API se afișează exact', 'Mesaj API de test 7B.2.' in p.inner_text('body'))
        c.close()

        # ——— T-E2: fotografiile (cetățean autentificat) ———
        tmp = tempfile.mkdtemp()
        bad = os.path.join(tmp, 'corupta.jpg'); open(bad, 'wb').write(b'\xff\xd8\xff\xe0' + b'nu este o imagine' * 20)
        good = os.path.join(tmp, 'buna.png'); open(good, 'wb').write(PNG_1PX)
        setup = b.new_context(); citizen_login_api(setup, URL, CITIZEN); state = setup.storage_state(); setup.close()
        c = mobile(390, 844, state); p = c.new_page(); p.on('pageerror', lambda e: errors.append(str(e)[:160]))
        p.goto(URL + '/#sesizari'); p.wait_for_load_state('networkidle'); p.wait_for_timeout(800)
        p.set_input_files('input[type=file]', bad); p.wait_for_timeout(1500)
        body = p.inner_text('body')
        res.check('T-E2 fotografie coruptă → mesajul explicit „Nu s-a putut decoda imaginea…”', 'Nu s-a putut decoda imaginea' in body)
        c.close()
        c = mobile(390, 844, state)
        c.add_init_script("HTMLCanvasElement.prototype.toDataURL = function () { throw new Error('EroareSinteticaCanvas'); };")
        p = c.new_page(); p.on('pageerror', lambda e: errors.append(str(e)[:160]))
        p.goto(URL + '/#sesizari'); p.wait_for_load_state('networkidle'); p.wait_for_timeout(800)
        p.set_input_files('input[type=file]', good); p.wait_for_timeout(1500)
        body = p.inner_text('body')
        res.check('T-E2 eroare neașteptată a Canvas → mesajul generic, fără textul erorii', PHOTO_GENERIC in body and 'EroareSinteticaCanvas' not in body)
        c.close()

        # ——— T-A21-3a: tab-urile Admin (mobil 390 → 360) ———
        c = mobile(390, 844); p = c.new_page(); p.on('pageerror', lambda e: errors.append(str(e)[:160]))
        admin_login(p, URL, B, B['admin'])
        for (w, h) in [(390, 844), (360, 800)]:
            p.set_viewport_size({'width': w, 'height': h}); p.wait_for_timeout(400)
            t = p.evaluate(TAB_INFO, TABS)
            heights = {x['h'] for x in t['tabs']}
            res.check(f'T-A21-3a {w} px: toate cele 7 tab-uri au aceeași înălțime și un singur rând',
                      len(t['tabs']) == 7 and len(heights) == 1 and all(x['lines'] == 1 for x in t['tabs']),
                      json.dumps([(x['label'][:10], x['h'], x['lines']) for x in t['tabs']], ensure_ascii=False))
        # Atingerea se face pe partea vizibilă a unui tab tăiat la marginea fâșiei, cu coordonate (`mouse.click` nu derulează;
        # `locator.click()` al Playwright ar aduce singur elementul în vizor și testul nu ar mai dovedi nimic).
        pt = p.evaluate(r"""() => {
          const tab = document.querySelector('[data-admin-tab="accounts"]'); const strip = tab.parentElement;
          strip.scrollLeft = tab.offsetLeft + tab.offsetWidth / 2 - strip.clientWidth;
          const s = strip.getBoundingClientRect(), r = tab.getBoundingClientRect();
          return {x: Math.min(r.right, s.right) - 8, y: r.top + r.height / 2, cutBefore: r.right > s.right + 0.5};
        }""")
        p.mouse.click(pt['x'], pt['y']); p.wait_for_timeout(700)
        t = p.evaluate(TAB_INFO, TABS)
        last = [x for x in t['tabs'] if x['label'] == 'Conturi'][0]
        active = p.evaluate("() => !!document.querySelector('[data-admin-tab=accounts].bg-white')")
        res.check('T-A21-3a tab-ul „Conturi”, tăiat la margine și atins, ajunge complet în vizor după selectare',
                  pt['cutBefore'] and active and last['inStrip'], json.dumps({'cutBefore': pt['cutBefore'], 'active': active, **last}, ensure_ascii=False))
        c.close()

        # ——— desktop 1280: neschimbat; T-E3 ———
        c = b.new_context(viewport={'width': 1280, 'height': 900}); p = c.new_page(); p.on('pageerror', lambda e: errors.append(str(e)[:160]))
        admin_login(p, URL, B, B['admin'])
        t = p.evaluate(TAB_INFO, TABS)
        long_ws = [x['ws'] for x in t['tabs'] if x['label'] in LONG_TABS]
        res.check('T-A21-3a 1280 px: fâșia nu derulează, iar tab-urile cu text lung se rup ca înainte (white-space: normal)',
                  t['scrollWidth'] <= t['clientWidth'] and long_ws == ['normal'] * 4, json.dumps({'sw': t['scrollWidth'], 'cw': t['clientWidth'], 'ws': long_ws}))

        p.route('**/api/v1/admin/surveys/*', lambda r: r.fulfill(status=422, content_type='application/json', body=json.dumps(
            {'error': {'code': 'VALIDATION', 'message': 'Datele trimise nu sunt valide.',
                       'fields': {'questions.1.options.2': 'valoare invalidă', 'zzz.necunoscut': 'valoare invalidă'}}})) if r.request.method == 'PUT' else r.continue_())
        p.locator('[data-admin-tab="surveys"]').click(); p.wait_for_timeout(800)
        p.get_by_title('Editează sondajul').first.click(); p.wait_for_timeout(800)
        p.get_by_role('button', name='Actualizează Sondajul').click(); p.wait_for_timeout(1200)
        body = p.inner_text('body')
        res.check('T-E3 422 cu căi tehnice → „Întrebarea #2, opțiunea #3” și „alte câmpuri”, fără căi brute',
                  'Întrebarea #2, opțiunea #3' in body and 'alte câmpuri' in body and 'questions.1' not in body and 'zzz' not in body)
        c.close()

        res.check('fără erori JavaScript necaptate în pagini', not errors, '; '.join(errors[:3]))
    finally:
        b.close()

sys.exit(0 if res.report() else 1)
