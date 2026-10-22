"""Faza 6, Pasul 3A — testul automat cap-coadă al fluxului critic (docs/faza6/FAZA_6_PLAN.md §2).

Un singur drum, fără întrerupere, pe aplicația pornită local, cu un server SMTP local de test (niciun mesaj real):

  Cetățean (cont) → DB → Hartă (imediat) → E-mail către Primărie (numai la cerere) → „în analiză”
  → „rezolvată” (subcontul Primăriei) → ștergere.

Rândurile F1–F10 și probele negative F6n, F7n, F8n sunt cele din plan. Bucățile fluxului sunt testate și separat
(`test_5_4_sesizari.py`, `server/test/integration/reports.test.ts`, `email.test.ts`); aici se verifică legătura lor.
Testul nu modifică aplicația: e-mailul trece prin transportul SMTP real al aplicației (TLS, autentificare), către
`tests/lib/fake_smtp.mjs`; mesajele din coadă se trimit cu `outbox:process`, comanda rulată de cron pe staging.
"""
import sys; sys.dont_write_bytecode = True
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
from harness import *

res = Results('FAZA 6 — FLUXUL CRITIC, CAP-COADĂ (E2E, server real, SMTP local)')
FIX = Path(REPO) / 'server' / 'test' / 'fixtures'
APP_PORT, SMTP_PORT = 6299, 6399
CITIZEN = 'ana.flux@exemplu.test'
REGISTRY = 'registratura.flux@exemplu.test'
DESC = 'Capacul de canal din fața blocului este deplasat și prezintă pericol pentru pietoni.'
DESC2 = 'A doua sesizare a fluxului: fără transmitere către Primărie.'


def goto(page, route):
    page.goto(URL + '/#' + route); page.wait_for_load_state('networkidle'); page.wait_for_timeout(300)


def map_popup_html(page, ref):
    """Deschide pe hartă punctul sesizării și întoarce HTML-ul popup-ului ('' dacă sesizarea nu este pe hartă)."""
    goto(page, 'harta')
    page.reload(); page.wait_for_load_state('networkidle')
    try:
        page.wait_for_selector('.custom-civic-marker', timeout=5000)
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


def wait_mail(pred, timeout=15):
    """Așteaptă un mesaj care îndeplinește condiția; întoarce mesajul sau None."""
    t0 = time.time()
    while time.time() - t0 < timeout:
        hit = [m for m in SMTP['messages']() if pred(m)]
        if hit:
            return hit[-1]
        time.sleep(0.4)
    return None


def is_image(data):
    """Fotografia rescrisă de aplicație: JPEG sau WebP (după semnătura fișierului), nu un fișier gol."""
    return len(data) > 100 and (data[:3] == b'\xff\xd8\xff' or (data[:4] == b'RIFF' and data[8:12] == b'WEBP'))


def to_registry(m):
    return m['envelope_to'] == [REGISTRY]


def status_mail(word):
    return lambda m: m['envelope_to'] == [CITIZEN] and word in m['subject']


def report_row(ref):
    rows = db_query(
        'SELECT r.id, r.resolution_status AS status, r.location_source AS src, r.city_hall_transmission_requested AS asked, '
        'r.notify_opt_in AS notify, a.email_normalized AS author, '
        '(SELECT COUNT(*) FROM report_photos p WHERE p.report_id = r.id) AS photos '
        'FROM reports r LEFT JOIN citizen_accounts a ON a.id = r.author_account_id WHERE r.reference_number = ?', [ref])
    return rows[0] if rows else None


def outbox(report_id, kind):
    return db_query('SELECT status, recipient, mode_at_send AS mode, transport FROM email_outbox WHERE report_id = ? AND kind = ? '
                    'ORDER BY created_at, id', [report_id, kind])


def my_reports_text(page):
    goto(page, 'sesizari')
    page.click('text=Sesizările mele'); page.wait_for_timeout(600)
    if page.get_by_text('Actualizează').count():
        page.get_by_text('Actualizează').first.click(); page.wait_for_timeout(800)
    box = page.locator('[data-testid=my-reports]')
    return box.inner_text() if box.count() else ''


def my_report_item(page, ref):
    return page.locator('[data-testid=my-reports] > div', has_text=ref)


def admin_card(pg, ref):
    """Cardul sesizării în Admin → Sesizări (lista reîncărcată prin căutare)."""
    pg.get_by_text('C. Sesizări').first.click(); pg.wait_for_timeout(800)
    box = 'input[placeholder^="Caută TM-XXX"]'
    pg.fill(box, ''); pg.press(box, 'Enter'); pg.wait_for_timeout(400)  # aceeași căutare repetată nu reîncarcă lista
    pg.fill(box, ref); pg.press(box, 'Enter'); pg.wait_for_timeout(900)
    return pg.locator('[data-testid=admin-report-card]', has_text=ref).first


def set_registry(pg, mode, enabled=True):
    """super_admin, în interfață: destinatarul tehnic, participarea Primăriei, pornirea fluxului."""
    pg.get_by_text('C. Sesizări').first.click(); pg.wait_for_timeout(800)
    panel = pg.locator('[data-testid=registry-settings]')
    if not panel.locator('input[type=email]').count():
        panel.get_by_text('Fluxul către Primărie (super_admin)').click(); pg.wait_for_timeout(800)
    panel.locator('input[type=email]').fill(REGISTRY)
    panel.locator('select').select_option(mode)
    box = panel.locator('input[type=checkbox]')
    if box.is_checked() != enabled:
        box.click()
    panel.get_by_role('button', name='Salvează').click(); pg.wait_for_timeout(1000)
    return '; '.join(panel.locator('[role=alert]').all_inner_texts())


def api(ctx, method, path, data=None):
    r = ctx.request.fetch(URL + '/api/v1' + path, method=method, headers=CSRF, data=data)
    return r.status


with fake_smtp(SMTP_PORT, [CITIZEN, REGISTRY]) as SMTP, backend_server(APP_PORT, SMTP['env']) as BACKEND, sync_playwright() as pw:
    URL = BACKEND['url']
    b = pw.chromium.launch()
    errors = []

    def ctx_page(width=1280):
        c = b.new_context(viewport={'width': width, 'height': 900})
        c.route('https://*.tile.openstreetmap.org/**', lambda r: r.abort())
        p = c.new_page(); p.on('pageerror', lambda e: errors.append(str(e)[:160]))
        # 7B.3 (O3): acțiunile Admin cer confirmare (window.confirm); aici fluxul se testează cu „OK”.
        # Confirmările („Anulează”/„OK”, textele) se verifică separat în tests/ui/test_7b3_confirmari.py.
        p.on('dialog', lambda d: d.accept())
        return c, p

    try:
        cctx, page = ctx_page(430)      # cetățeanul (lățime de telefon)
        pctx, ppage = ctx_page()        # un vizitator fără cont
        sctx, spage = ctx_page()        # super_admin
        octx, opage = ctx_page()        # subcontul Primăriei (primarie_operator)

        # ——— F1: fără cont nu se depune; restul aplicației merge fără cont ———
        goto(page, 'sesizari')
        f1_login = page.locator('[data-testid=citizen-login]').count() == 1 and page.locator('#report-desc').count() == 0
        goto(ppage, 'harta')
        f1_map = ppage.locator('.leaflet-container').count() >= 1 and ppage.locator('[data-testid=citizen-login]').count() == 0
        res.check('F1 „Depune o sesizare” fără cont → „Contul meu”, fără formular; harta se folosește fără cont (A-9)',
                  f1_login and f1_map, f'login={f1_login} harta={f1_map}')

        # ——— F2: autentificarea, cu regulile bifate; codul sosește prin e-mail (SMTP, TLS) ———
        page.fill('#citizen-email', CITIZEN)
        page.click('text=Trimite codul pe e-mail'); page.wait_for_timeout(400)
        refused = page.locator('[role=alert]').count() == 1 and wait_mail(lambda m: m['envelope_to'] == [CITIZEN], timeout=2) is None
        page.check('[data-testid=citizen-login] input[type=checkbox]')
        page.click('text=Trimite codul pe e-mail'); page.wait_for_timeout(600)
        code_mail = wait_mail(lambda m: m['envelope_to'] == [CITIZEN])
        code = (re.search(r'\b(\d{6})\b', code_mail['text']) or [None, None])[1] if code_mail else None
        page.fill('#citizen-code', code or '000000'); page.click('text=Confirmă codul'); page.wait_for_timeout(1200)
        logged = page.locator('[data-testid=citizen-account-bar]').count() == 1 and CITIZEN in page.inner_text('body')
        res.check('F2 fără bifa regulilor: refuz, niciun e-mail; cu bifă: codul sosește prin SMTP cu TLS, de la expeditorul aplicației; '
                  'codul autentifică (A-9, 2.9)',
                  refused and bool(code_mail) and code_mail['tls'] and code_mail['envelope_from'] == SMTP['mail_from'] and logged,
                  f'refuz={refused} mesaj={bool(code_mail)} autentificat={logged}')
        t_form = time.time()

        # ——— F3: formularul, cu fotografie, pin, transmitere către Primărie și notificări ———
        page.click('text=Iluminat public')
        page.fill('#report-desc', DESC)
        page.fill('#report-location', 'Str. Independenței, în fața blocului B4')
        page.set_input_files('#photo-upload-input', str(FIX / 'exif.jpg')); page.wait_for_timeout(1500)
        m = page.locator('[data-testid=location-picker-map]'); m.scroll_into_view_if_needed(); page.wait_for_timeout(300)
        bb = m.bounding_box(); page.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); page.wait_for_timeout(300)
        page.locator('label', has_text='Transmite sesizarea către Primărie').locator('input[type=checkbox]').check()
        page.locator('label', has_text='Anunță-mă pe e-mail când se schimbă stadiul').locator('input[type=checkbox]').check()
        while time.time() - t_form < 9:
            time.sleep(0.5)
        page.click('button[type=submit]:has-text("Trimite sesizarea")'); page.wait_for_timeout(2500)
        body = page.inner_text('body')
        ref = (re.search(r'TM-\d{3,}', body) or [None])[0] if 'Sesizarea a fost înregistrată' in body else None
        res.check('F3 depunere cu fotografie, pin, transmitere și notificări → confirmare cu TM-XXX, după salvarea pe server',
                  ref is not None, ref or ('; '.join(page.locator('[role=alert]').all_inner_texts()) or body[:200]))
        if not ref:
            raise RuntimeError('fără sesizare nu se poate continua fluxul')

        # ——— F4: ce s-a salvat ———
        row = report_row(ref)
        rid = row['id']
        res.check('F4 în DB: autorul este contul; poziția `pin`; o fotografie; stadiul „nouă”; transmiterea și notificările cerute',
                  row['author'] == CITIZEN and row['src'] == 'pin' and row['photos'] == 1 and row['status'] == 'new'
                  and bool(row['asked']) and bool(row['notify']), json.dumps(row)[:220])

        # ——— F5: harta, imediat, fără moderare și fără date personale ———
        popup = map_popup_html(ppage, ref)
        dom = ppage.content()
        item = [i for i in pctx.request.get(URL + '/api/v1/public/map-reports').json() if i['referenceNumber'] == ref]
        coords_ok = len(item) == 1 and all(len(repr(float(item[0]['publicLocation'][k])).split('.')[-1]) <= 4 for k in ('lat', 'lng'))
        photo = pctx.request.get(URL + item[0]['photoUrl']).body() if item and item[0].get('photoUrl') else b''
        src_exif = b'Exif' in (FIX / 'exif.jpg').read_bytes()
        res.check('F5 sesizarea apare imediat pe hartă, fără moderare, cu stadiul „Nouă”; fără e-mailul autorului și fără ID-ul intern; '
                  'coordonate publice cu cel mult 4 zecimale; fotografia publică fără EXIF (D9, 2.3, A-7)',
                  bool(popup) and ref in popup and 'Nouă' in popup and CITIZEN not in popup and CITIZEN not in dom and rid not in dom
                  and coords_ok and src_exif and is_image(photo) and b'Exif' not in photo and b'EXIF' not in photo,
                  f'popup={bool(popup)} coordonate={coords_ok} exif_sursă={src_exif} foto={len(photo)}')

        # ——— F7n (1): transmiterea cerută, dar nelivrată (fluxul către Primărie este încă oprit) → rămâne „nouă” ———
        run_cli(BACKEND, 'outbox:process')
        held = outbox(rid, 'registry_notification')
        res.check('F7n(1) flux oprit: mesajul stă `on_hold`, nimic nu pleacă spre Primărie, stadiul rămâne „nouă” (DN-09, 2.13)',
                  [h['status'] for h in held] == ['on_hold'] and wait_mail(to_registry, timeout=2) is None and report_row(ref)['status'] == 'new'
                  and 'NOUĂ' in my_reports_text(page).upper(), json.dumps(held)[:160])

        # ——— F6: super_admin pornește fluxul (Primăria „numai e-mailuri”); mesajul pleacă numai acum ———
        admin_login(spage, URL, BACKEND, BACKEND['admin'])
        err = set_registry(spage, 'email_only')
        code_out, out = run_cli(BACKEND, 'outbox:process')   # sarcina cron `outbox:process`
        reg = wait_mail(to_registry)
        sent = outbox(rid, 'registry_notification')
        att = reg['attachments'] if reg else []
        res.check('F6 e-mailul către Primărie: pleacă prin SMTP cu TLS, de la expeditorul aplicației, fără `Reply-To`; conține TM-XXX, '
                  'descrierea și e-mailul contului; fotografia este atașată; rândul din coadă devine `sent` (pct. 7, N3-7, A17-6)',
                  not err and code_out == 0 and bool(reg) and reg['tls'] and reg['envelope_from'] == SMTP['mail_from']
                  and 'reply-to' not in reg['headers'] and ref in reg['subject'] and DESC in reg['text'] and CITIZEN in reg['text']
                  and len(att) == 1 and att[0]['type'] in ('image/jpeg', 'image/webp') and (att[0]['filename'] or '').startswith('foto-1.')
                  and att[0]['bytes'] == len(photo) > 100
                  and [(s_['status'], s_['recipient'], s_['mode'], s_['transport']) for s_ in sent] == [('sent', REGISTRY, 'allowlist', 'smtp')],
                  f'eroare={err!r} cli={out[:80]!r} mesaj={bool(reg)} atașamente={json.dumps(att)} coadă={json.dumps(sent)}'[:300])

        # ——— F7: „în analiză” apare numai după transmiterea confirmată; autorul este anunțat ———
        st_after_send = report_row(ref)['status']
        run_cli(BACKEND, 'outbox:process')   # notificarea autorului pleacă la următoarea rulare a cozii
        n1 = wait_mail(status_mail('în analiză'))
        mine = my_reports_text(page)
        popup = map_popup_html(ppage, ref)
        card = admin_card(spage, ref)
        card_txt = card.inner_text() if card.count() else ''
        res.check('F7 după `sent`: stadiul devine „în analiză” (DB, „Sesizările mele”, hartă, Admin: „Trimisă Primăriei”); autorul primește '
                  'notificarea, cu `List-Unsubscribe` (DN-09, D9, 2.2)',
                  st_after_send == 'in_analysis' and bool(n1) and ref in n1['subject'] and 'list-unsubscribe' in n1['headers']
                  and 'ÎN ANALIZĂ' in mine.upper() and 'În analiză' in popup and 'Trimisă Primăriei' in card_txt and 'ÎN ANALIZĂ' in card_txt.upper(),
                  f'db={st_after_send} notificare={bool(n1)} listă={"ÎN ANALIZĂ" in mine.upper()} hartă={"În analiză" in popup}')

        # ——— F6n: o sesizare fără cererea de transmitere nu produce niciun e-mail către Primărie ———
        n_reg_before = len([m_ for m_ in SMTP['messages']() if to_registry(m_)])
        r2 = submit_report_api(cctx, URL, form_token(cctx, URL), DESC2, {'text': 'Str. Test, nr. 2', 'lat': 43.7518306, 'lng': 24.8691717, 'source': 'pin'},
                               transmit=False, notify=True)
        ref2 = r2.json().get('referenceNumber') if r2.status == 201 else None
        row2 = report_row(ref2) if ref2 else None
        run_cli(BACKEND, 'outbox:process'); time.sleep(1.5)
        n_reg_after = len([m_ for m_ in SMTP['messages']() if to_registry(m_)])
        res.check('F6n fără cererea cetățeanului: niciun rând de transmitere, niciun e-mail către Primărie, stadiul rămâne „nouă” (pct. 7)',
                  bool(row2) and not row2['asked'] and outbox(row2['id'], 'registry_notification') == [] and n_reg_after == n_reg_before == 1
                  and report_row(ref2)['status'] == 'new', f'{ref2} mesaje_primărie={n_reg_before}->{n_reg_after}')
        rid2 = row2['id'] if row2 else ''

        # ——— F7n (2): nimeni nu poate seta manual „în analiză” ———
        admin_login(opage, URL, BACKEND, BACKEND['op'])
        s_manual = api(sctx, 'PATCH', f'/admin/reports/{rid2}/resolution', {'status': 'in_analysis'})
        o_manual = api(octx, 'PATCH', f'/admin/reports/{rid2}/resolution', {'status': 'in_analysis'})
        res.check('F7n(2) „în analiză” nu se poate seta manual: super_admin → 409, operator → 409; sesizarea rămâne „nouă” (DN-09)',
                  s_manual == 409 and o_manual == 409 and report_row(ref2)['status'] == 'new', f'super_admin={s_manual} operator={o_manual}')

        # ——— F8n (1): cât timp Primăria primește „numai e-mailuri”, nimeni nu poate marca „rezolvată” ———
        s_resolve = api(sctx, 'PATCH', f'/admin/reports/{rid}/resolution', {'status': 'resolved'})
        s_button = 'Marchează rezolvată' in card_txt
        ocard = admin_card(opage, ref)
        o_button_email_only = ocard.get_by_role('button', name='Marchează rezolvată').count() == 1
        ocard.get_by_role('button', name='Marchează rezolvată').click(); opage.wait_for_timeout(1000)
        o_alert = '; '.join(opage.locator('[role=alert]').all_inner_texts())
        st_email_only = report_row(ref)['status']
        res.check('F8n(1) super_admin nu poate marca „rezolvată” (403, fără buton); cu Primăria „numai e-mailuri”, operatorul este refuzat '
                  '(mesaj în pagină), iar sesizarea rămâne „în analiză” (2.1, P-9)',
                  s_resolve == 403 and not s_button and o_button_email_only and 'nu participă prin platformă' in o_alert
                  and st_email_only == 'in_analysis',
                  f'super_admin={s_resolve} buton={s_button} alertă={o_alert[:70]!r} db={st_email_only}')

        # ——— F8n (2): Primăria participă prin platformă; o sesizare „nouă” tot nu poate deveni „rezolvată” ———
        err = set_registry(spage, 'platform')
        o_new = api(octx, 'PATCH', f'/admin/reports/{rid2}/resolution', {'status': 'resolved'})
        ocard2 = admin_card(opage, ref2)
        o_button_new = ocard2.get_by_role('button', name='Marchează rezolvată').count()
        s_resolve2 = api(sctx, 'PATCH', f'/admin/reports/{rid}/resolution', {'status': 'resolved'})
        res.check('F8n(2) cu Primăria „în platformă”: operatorul nu poate rezolva o sesizare netransmisă, „nouă” (409, fără buton); '
                  'super_admin rămâne refuzat (403) (2.1)',
                  not err and o_new == 409 and o_button_new == 0 and report_row(ref2)['status'] == 'new' and s_resolve2 == 403
                  and report_row(ref)['status'] == 'in_analysis',
                  f'eroare={err!r} nouă={o_new} buton_nouă={o_button_new} super_admin={s_resolve2}')

        # ——— F8: subcontul Primăriei marchează „rezolvată” ———
        ocard = admin_card(opage, ref)
        ocard.get_by_role('button', name='Marchează rezolvată').click(); opage.wait_for_timeout(1200)
        st_resolved = report_row(ref)['status']
        run_cli(BACKEND, 'outbox:process')
        n2 = wait_mail(status_mail('rezolvată'))
        audit = db_query("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'report.resolution' AND target_id = ?", [rid])[0]['n']
        mine = my_reports_text(page)
        popup = map_popup_html(ppage, ref)
        ocard = admin_card(opage, ref)
        again = api(octx, 'PATCH', f'/admin/reports/{rid}/resolution', {'status': 'resolved'})
        res.check('F8 subcontul Primăriei marchează „rezolvată” o sesizare „în analiză”: stadiul se schimbă (DB, „Sesizările mele”, hartă), '
                  'autorul este anunțat, acțiunea este în audit; a doua oară → 409, fără buton (2.1, P-9)',
                  not err and st_resolved == 'resolved' and bool(n2) and ref in n2['subject'] and audit == 1 and 'REZOLVATĂ' in mine.upper()
                  and 'Rezolvată' in popup and again == 409 and ocard.get_by_role('button', name='Marchează rezolvată').count() == 0,
                  f'eroare={err!r} db={st_resolved} notificare={bool(n2)} audit={audit} din_nou={again}')

        # ——— F9: permisiunile operatorului și ale publicului ———
        ocard.get_by_text('Detalii și acțiuni').click(); opage.wait_for_timeout(900)
        ot = ocard.inner_text()
        spage_card = admin_card(spage, ref); spage_card.get_by_text('Detalii și acțiuni').click(); spage.wait_for_timeout(900)
        st_ = spage_card.inner_text()
        codes = {'ștergere': api(octx, 'DELETE', f'/admin/reports/{rid}'), 'jurnal': api(octx, 'GET', '/admin/email-log'),
                 'setări': api(octx, 'GET', '/admin/settings/registry'), 'public_listă': api(pctx, 'GET', '/admin/reports'),
                 'public_detaliu': api(pctx, 'GET', f'/admin/reports/{rid}')}
        res.check('F9 operatorul nu vede e-mailul autorului, jurnalul e-mail sau drepturile exclusive și nu poate șterge (403); super_admin le vede; '
                  'fără sesiune, Admin răspunde 401 (B4, A-8, 2.11)',
                  CITIZEN not in ot and 'Jurnal e-mail' not in ot and 'Drepturi exclusive' not in ot and 'Șterge definitiv' not in ot
                  and CITIZEN in st_ and 'Jurnal e-mail' in st_
                  and codes == {'ștergere': 403, 'jurnal': 403, 'setări': 403, 'public_listă': 401, 'public_detaliu': 401}
                  and report_row(ref) is not None, json.dumps(codes, ensure_ascii=False))

        # ——— F10: ștergerea de către autor; numărul TM nu se refolosește; ștergerea de către super_admin ———
        goto(page, 'sesizari'); page.click('text=Sesizările mele'); page.wait_for_timeout(600)
        it = my_report_item(page, ref)
        it.get_by_role('button', name='Șterge sesizarea').click(); it.get_by_role('button', name='Da, șterge').click(); page.wait_for_timeout(1000)
        gone = report_row(ref) is None and db_query('SELECT COUNT(*) AS n FROM email_outbox WHERE report_id = ?', [rid])[0]['n'] == 0
        off_list = ref not in my_reports_text(page)
        off_map = map_popup_html(ppage, ref) == ''
        s_delete = api(sctx, 'DELETE', f'/admin/reports/{rid2}')   # super_admin șterge sesizarea cu numărul cel mai mare
        gone2 = s_delete == 204 and report_row(ref2) is None
        # ambele sesizări ale fluxului sunt șterse: următoarea trebuie să primească un număr NOU, nu unul eliberat
        r3 = submit_report_api(cctx, URL, form_token(cctx, URL), 'A treia sesizare a fluxului: verificarea numerotării.',
                               {'text': 'Str. Test, nr. 3', 'lat': 43.7518306, 'lng': 24.8691717, 'source': 'pin'})
        ref3 = r3.json().get('referenceNumber') if r3.status == 201 else None
        num = lambda t: int(t.split('-')[1])
        res.check('F10 autorul șterge sesizarea rezolvată: dispare din listă, din DB (cu jurnalul ei de e-mail) și de pe hartă; super_admin '
                  'poate șterge orice sesizare; după ștergeri, numărul TM nu se refolosește (A-1, A05-4, D25–D26)',
                  gone and off_list and off_map and gone2 and bool(ref3) and num(ref2) == num(ref) + 1 and num(ref3) == num(ref2) + 1,
                  f'db={gone} listă={off_list} hartă={off_map} super_admin={s_delete} numere={ref},{ref2},{ref3}')

        # ——— bilanțul e-mailurilor: exact cele patru așteptate, numai către adresele din listă ———
        run_cli(BACKEND, 'outbox:process'); time.sleep(1)
        msgs = SMTP['messages']()
        kinds = ['primărie' if to_registry(m_) else 'stadiu' if ref in m_['subject'] else 'cod' for m_ in msgs]
        res.check('E-mail: în tot fluxul au plecat exact 4 mesaje (cod, Primărie, „în analiză”, „rezolvată”), toate prin TLS, numai către '
                  'adresele din listă',
                  sorted(kinds) == ['cod', 'primărie', 'stadiu', 'stadiu'] and all(m_['tls'] for m_ in msgs)
                  and all(set(m_['envelope_to']) <= {CITIZEN, REGISTRY} for m_ in msgs), json.dumps(kinds, ensure_ascii=False))

    except Exception as exc:  # orice excepție = FAIL raportat, nu oprire fără rezumat
        res.check('EXCEPTIE în scenariu', False, repr(exc)[:300])

    res.check('JS fără erori în pagini', not errors, '; '.join(errors)[:300])
    b.close()

ok = res.report()
sys.exit(0 if ok else 1)
