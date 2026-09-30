"""Faza 5.4 — E2E (B10 §6): sesizările pe serverul real, cu DB-ul de test.

Înlocuiește `ui/test_6_6_ui.py` (modelul din `localStorage`). Regulile noi (decizii): fără moderare (2.3),
fără „Public / Public anonim” (2.8), publicare imediată (D9, A-2), stadiul public (A-7), asumarea / preluarea
nu schimbă stadiul (C-3) și nu sunt publice, e-mailul autorului numai pentru super_admin (A-8), ștergerea de
către autor și super_admin (A-1). Corespondența cu verificările vechi: docs/faza5/FAZA_5_4_RAPORT.md.
"""
import sys; sys.dont_write_bytecode = True
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
from harness import *

res = Results('5.4 SESIZARI (E2E, server real)')
FIX = Path(REPO) / 'server' / 'test' / 'fixtures'
CENTER = {'lat': 43.7518306, 'lng': 24.8691717}


def goto(page, route):
    page.goto(URL + '/#' + route); page.wait_for_load_state('networkidle'); page.wait_for_timeout(300)


def map_popup_html(page, ref):
    """Deschide pe hartă punctul sau zona sesizării și întoarce HTML-ul popup-ului."""
    goto(page, 'harta')
    page.reload(); page.wait_for_load_state('networkidle')  # aceeași adresă (#harta) nu reîncarcă datele
    try:
        page.wait_for_selector('.custom-civic-marker', timeout=5000)  # datele hărții vin asincron
    except Exception:
        pass
    page.wait_for_timeout(300)
    marker = page.locator('.custom-civic-marker', has_text=ref)
    if not marker.count():
        return ''
    marker.first.scroll_into_view_if_needed()
    marker.first.locator('div').first.click(force=True); page.wait_for_timeout(500)
    pop = page.locator('.leaflet-popup-content')
    return pop.first.inner_html() if pop.count() else ''


with backend_server(5699) as BACKEND, sync_playwright() as pw:
    URL = BACKEND['url']
    b = pw.chromium.launch()
    errors = []

    try:
        # ——— 1. Cetățeanul, în interfață: cont → formular → confirmare ———
        cctx = b.new_context(viewport={'width': 430, 'height': 900})
        cctx.route('https://*.tile.openstreetmap.org/**', lambda r: r.abort())
        page = cctx.new_page(); page.on('pageerror', lambda e: errors.append(str(e)[:160]))
        goto(page, 'sesizari')
        res.check('C-1 „Depune o sesizare” cere contul (A-9): ecranul „Contul meu”, fără formular',
                  page.locator('[data-testid=citizen-login]').count() == 1 and page.locator('#report-desc').count() == 0, '')
        email = 'maria.e2e@exemplu.test'
        page.fill('#citizen-email', email)
        page.click('text=Trimite codul pe e-mail'); page.wait_for_timeout(300)
        no_policy = page.locator('[role=alert]').count() == 1
        page.check('[data-testid=citizen-login] input[type=checkbox]')
        page.click('text=Trimite codul pe e-mail'); page.wait_for_timeout(600)
        page.fill('#citizen-code', citizen_code(email)); page.click('text=Confirmă codul'); page.wait_for_timeout(1200)
        res.check('C-2 cont nou: politica obligatorie (2.9); codul din e-mail autentifică; bara contului afișată',
                  no_policy and page.locator('[data-testid=citizen-account-bar]').count() == 1 and email in page.inner_text('body'), '')
        body = page.inner_text('body')
        res.check('C-3 formular: fără date de contact, fără „Public / Public anonim” / „Nu doresc afișarea” (A-9, 2.8)',
                  all(t not in body for t in ['Nume și prenume', 'Număr telefon', 'Afișare publică anonimă', 'Nu doresc afișarea'])
                  and 'Transmite sesizarea către Primărie' in body, '')
        t_form = time.time()

        page.click('text=Iluminat public')
        page.fill('#report-desc', 'Stâlpul de iluminat de lângă scară nu mai funcționează de o săptămână.')
        page.fill('#report-location', 'Str. 1 Mai, în dreptul blocului F25')
        page.set_input_files('#photo-upload-input', str(FIX / 'exif.jpg')); page.wait_for_timeout(1500)
        # geocodarea: fără GEOCODER_URL în testare → mesaj clar, formularul rămâne utilizabil (2.4)
        page.fill('input[aria-label="Caută adresa pe hartă"]', 'Strada 1 Mai'); page.click('text=Caută adresa'); page.wait_for_timeout(800)
        geo_msg = page.locator('[role=status]').all_inner_texts()
        res.check('L-1 căutarea adresei indisponibilă → mesaj, fără blocarea formularului',
                  any('nu este disponibilă' in m for m in geo_msg), json.dumps(geo_msg, ensure_ascii=False)[:200])
        m = page.locator('[data-testid=location-picker-map]'); m.scroll_into_view_if_needed(); page.wait_for_timeout(300)
        bb = m.bounding_box(); page.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); page.wait_for_timeout(300)
        status_txt = page.locator('[data-testid=location-picker-status]').inner_text() if page.locator('[data-testid=location-picker-status]').count() else ''
        res.check('L-2 pin manual pe hartă (D6-2): atingerea hărții pune pinul, poziție exactă', 'Punct pe hartă' in status_txt, status_txt)
        while time.time() - t_form < 9:
            time.sleep(0.5)
        page.click('button[type=submit]:has-text("Trimite sesizarea")'); page.wait_for_timeout(2500)
        body = page.inner_text('body')
        ref = (re.search(r'TM-\d{3,}', body) or [None])[0] if 'Sesizarea a fost înregistrată' in body else None
        res.check('C-4 depunere → confirmare cu TM-XXX, după salvarea pe server (6.2)', ref is not None, ('; '.join(page.locator('[role=alert]').all_inner_texts()) or body[:200]) if not ref else ref)
        rows = db_query('SELECT r.id, r.location_source AS src, r.lat, (SELECT COUNT(*) FROM report_photos p WHERE p.report_id = r.id) AS photos, '
                        'a.email_normalized AS author FROM reports r LEFT JOIN citizen_accounts a ON a.id = r.author_account_id '
                        'WHERE r.reference_number = ?', [ref]) if ref else []
        res.check('C-5 în DB: autorul = contul, poziția `pin`, fotografia salvată',
                  len(rows) == 1 and rows[0]['author'] == email and rows[0]['src'] == 'pin' and rows[0]['photos'] == 1, json.dumps(rows)[:200])
        report_id = rows[0]['id'] if rows else ''

        page.click('text=Sesizările mele'); page.wait_for_timeout(800)
        mine = page.locator('[data-testid=my-reports]').inner_text() if page.locator('[data-testid=my-reports]').count() else ''
        res.check('C-6 „Sesizările mele”: sesizarea proprie, cu stadiul „Nouă” (D28)', bool(ref) and ref in mine and 'NOUĂ' in mine.upper(), mine[:160])

        # ——— 2. Harta publică: imediat, fără date personale; stadiul public ———
        pub = b.new_context(viewport={'width': 1280, 'height': 900}); pub.route('https://*.tile.openstreetmap.org/**', lambda r: r.abort())
        ppage = pub.new_page(); ppage.on('pageerror', lambda e: errors.append(str(e)[:160]))
        popup = map_popup_html(ppage, ref) if ref else ''
        res.check('H-1 sesizarea apare imediat pe hartă, fără moderare (D9, 2.3), cu stadiul public (A-7)',
                  bool(popup) and ref in popup and 'Nouă' in popup, popup[:160])
        res.check('H-2 popup: fotografia servită de aplicație (/api/v1/public/photos), fără e-mailul autorului',
                  '/api/v1/public/photos/' in popup and email not in popup, '')
        dom = ppage.content()
        res.check('H-3 DOM-ul hărții: fără e-mailul autorului și fără ID-ul intern al sesizării', email not in dom and report_id not in dom, '')

        # ——— 3. Admin: super_admin asumă; operatorii preiau; fără schimbarea stadiului (C-3) ———
        actx = b.new_context(viewport={'width': 1280, 'height': 900}); apage = actx.new_page(); apage.on('pageerror', lambda e: errors.append(str(e)[:160]))

        def open_card(pg):
            pg.get_by_text('C. Sesizări').first.click(); pg.wait_for_timeout(800)
            pg.fill('input[placeholder^="Caută TM-XXX"]', ref); pg.press('input[placeholder^="Caută TM-XXX"]', 'Enter'); pg.wait_for_timeout(800)
            card = pg.locator('[data-testid=admin-report-card]', has_text=ref).first
            card.get_by_text('Detalii și acțiuni').click(); pg.wait_for_timeout(800)
            return card

        admin_login(apage, URL, BACKEND, BACKEND['admin'])
        card = open_card(apage)
        t = card.inner_text()
        res.check('A-1 super_admin: „Asumă”, fără „Preia de către Primărie”; e-mailul autorului vizibil (A-8); fără moderare',
                  'Asumă' in t and 'Preia de către Primărie' not in t and email in t and 'Aprobă' not in t and 'Respinge' not in t, '')
        card.get_by_role('button', name='Asumă').click(); apage.wait_for_timeout(1000)
        t = card.inner_text()
        res.check('A-2 după asumare: „Renunță la asumare”, responsabil „(dvs.)”, stadiul rămâne „Nouă” (C-3)',
                  'Renunță la asumare' in t and '(dvs.)' in t and 'NOUĂ' in t.upper() and 'ÎN ANALIZĂ' not in t.upper(), t[:200])
        res.check('A-3 jurnal e-mail (2.11): vizibil numai pentru super_admin', 'Jurnal e-mail' in t, '')

        admin_login(apage, URL, BACKEND, BACKEND['op'])
        card = open_card(apage)
        t = card.inner_text()
        res.check('A-4 operator: „Preia de către Primărie”, fără „Asumă”; fără e-mailul autorului și fără drepturile super_admin',
                  'Preia de către Primărie' in t and 'Asumă' not in t.replace('asumare', '') and email not in t and 'Drepturi exclusive' not in t, '')
        card.get_by_role('button', name='Preia de către Primărie').click(); apage.wait_for_timeout(1000)
        t = card.inner_text()
        res.check('A-5 după preluare: „Preluată de Primărie”, stadiul rămâne „Nouă” (C-3), fără acțiune de renunțare',
                  'Preluată de Primărie' in t and 'NOUĂ' in t.upper() and 'Preia de către Primărie' not in t, '')
        card.locator('textarea').fill('Echipa a verificat locul.'); card.get_by_role('button', name='Adaugă nota').click(); apage.wait_for_timeout(800)
        res.check('A-6 notă internă adăugată de operator (fără e-mail, A06-3)',
                  'Echipa a verificat locul.' in card.inner_text() and db_query("SELECT COUNT(*) AS n FROM email_outbox WHERE kind = 'citizen_status_update'")[0]['n'] == 0, '')

        admin_login(apage, URL, BACKEND, BACKEND['op2'])
        card = open_card(apage)
        res.check('A-7 al doilea operator: sesizare deja preluată → fără buton de preluare', 'Preia de către Primărie' not in card.inner_text(), '')

        admin_login(apage, URL, BACKEND, BACKEND['admin'])
        card = open_card(apage)
        card.get_by_role('button', name='Renunță la asumare').click(); apage.wait_for_timeout(1000)
        t = card.inner_text()
        res.check('A-8 super_admin renunță: Primăria rămâne preluată, stadiul „Nouă”', 'Preluată de Primărie' in t and 'Asumă' in t and 'NOUĂ' in t.upper(), '')

        popup = map_popup_html(ppage, ref)
        res.check('P-1 popup după asumare și preluare: fără „Preluată”, fără responsabili sau operatori (6.6, D9)',
                  bool(popup) and all(v not in popup for v in ['Preluată', 'Administrator Platformă', 'Operator Primărie', 'Echipa a verificat']), popup[:160])

        # ——— 4. Ștergerea (A-1): autorul, apoi super_admin ———
        token = form_token(cctx, URL)
        r2 = submit_report_api(cctx, URL, token, 'A doua sesizare de test, pentru ștergerea de către super_admin.',
                               {'text': 'Str. Test 2', **CENTER, 'source': 'pin'})
        ref2 = r2.json().get('referenceNumber') if r2.status == 201 else None
        page.click('text=Sesizările mele'); page.wait_for_timeout(300); page.click('text=Actualizează'); page.wait_for_timeout(800)
        item = page.locator('[data-testid=my-reports] > div', has_text=ref)
        item.get_by_role('button', name='Șterge sesizarea').click(); item.get_by_role('button', name='Da, șterge').click(); page.wait_for_timeout(1000)
        gone_db = db_query('SELECT COUNT(*) AS n FROM reports WHERE reference_number = ?', [ref])[0]['n'] == 0
        in_list = ref in page.locator('[data-testid=my-reports]').inner_text()
        on_map = map_popup_html(ppage, ref) != ''
        res.check('D-1 autorul își șterge sesizarea (preluată de Primărie) → dispare din listă, din DB și de pe hartă (D19–D22)',
                  gone_db and not in_list and not on_map, f'db_gone={gone_db} list={in_list} map={on_map}')

        apage.get_by_text('C. Sesizări').first.click(); apage.wait_for_timeout(600)
        apage.fill('input[placeholder^="Caută TM-XXX"]', ref2 or 'x'); apage.press('input[placeholder^="Caută TM-XXX"]', 'Enter'); apage.wait_for_timeout(800)
        card = apage.locator('[data-testid=admin-report-card]', has_text=ref2 or 'x').first
        card.get_by_text('Detalii și acțiuni').click(); apage.wait_for_timeout(800)
        card.get_by_role('button', name='Șterge definitiv').click(); card.get_by_role('button', name='Da, șterge').click(); apage.wait_for_timeout(1000)
        res.check('D-2 super_admin șterge definitiv din Admin (A-5)',
                  bool(ref2) and db_query('SELECT COUNT(*) AS n FROM reports WHERE reference_number = ?', [ref2])[0]['n'] == 0, str(ref2))

        # ——— 5. Dezabonarea: link invalid → mesaj; fără cont ———
        ppage.goto(URL + '/#dezabonare?token=' + 'A' * 43); ppage.wait_for_load_state('networkidle'); ppage.wait_for_timeout(800)
        note = ppage.locator('[data-testid=unsubscribe-notice]').inner_text() if ppage.locator('[data-testid=unsubscribe-notice]').count() else ''
        res.check('U-1 dezabonare cu link invalid → mesaj „nu mai este valabil”; jetonul dispare din bara de adrese',
                  'nu mai este valabil' in note and 'token=' not in ppage.url, note)

    except Exception as exc:  # orice excepție = FAIL raportat, nu oprire fără rezumat
        res.check('EXCEPTIE în scenariu', False, repr(exc)[:300])

    res.check('JS fără erori în pagini', not errors, '; '.join(errors)[:300])
    b.close()

ok = res.report()
sys.exit(0 if ok else 1)
