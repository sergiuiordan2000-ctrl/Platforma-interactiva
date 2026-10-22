"""Etapa 7, 7B.3 — O3: confirmările Admin (planul `docs/faza7/FAZA_7B_PLAN.md` §5, decizia din 22.10.2026: varianta A,
toate cele cinci, cu textele din plan).

Pentru fiecare acțiune: dialogul apare cu textul exact din plan; „Anulează” nu trimite nicio cerere (și starea din DB nu
se schimbă); „OK” trimite exact o cerere (și starea se schimbă).
1. Reîncearcă e-mailul (super_admin, jurnalul e-mail al sesizării).
2. Pornirea fluxului către Primărie (AM-2): confirmarea apare la fiecare trecere din oprit (starea salvată) în pornit și
   numai atunci — nu la o salvare cu fluxul deja pornit, nici la oprire.
3. Marchează sesizarea rezolvată (subcontul Primăriei, Primăria „în platformă”, sesizare „în analiză”).
4. Închide sondajul: butonul „Închide” din lista Admin și, separat, formularul de editare cu starea „Închis / Finalizat”
   (`closed`): „Anulează” → nicio cerere, formularul rămâne deschis; „OK” → o singură salvare (actualizarea + schimbarea
   stării, câte o cerere, ca înainte) și un singur dialog; o salvare fără închidere nu cere confirmare.
5. Șterge categoria (Numere utile → Gestiune Categorii, categorie fără contacte).
Fluxul de trimitere a e-mailurilor nu este verificat aici (nu se schimbă). Suită separată (server și DB proprii).
"""
import sys; sys.dont_write_bytecode = True
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
from harness import *

res = Results('7B.3 CONFIRMARI O3 (E2E, server real)')
CITIZEN = 'b73c.e2e@exemplu.test'
REGISTRY = 'registratura@exemplu.test'
EMAIL_ID = '01JB7B3C0NF100000000000000'
SURVEY_TITLE = 'E2E O3: sondaj de închis'
SURVEY2_TITLE = 'E2E O3: sondaj închis din formular'
CATEGORY = 'E2E O3 categorie de șters'

T_RETRY = 'Verificați întâi dacă mesajul a ajuns la destinatar. Dacă a plecat deja, reîncercarea trimite un duplicat. Continuați?'
T_FLOW = 'Eventualele mesaje către Primărie aflate în așteptare vor fi trimise acum către destinatarul salvat. Continuați?'
T_RESOLVE = 'Marcați sesizarea {TM} ca rezolvată? Stadiul nu se mai poate schimba.'
T_CLOSE = 'Închideți sondajul „{titlu}”? Închiderea este definitivă.'
T_DELETE = 'Sigur doriți să ștergeți categoria „{nume}”?'


class Watch:
    """Dialogurile (acceptate sau refuzate, după `mode`) și cererile API ale unei pagini."""
    def __init__(self, page):
        self.mode, self.dialogs, self.requests = 'dismiss', [], []
        page.on('dialog', self._dialog)
        page.on('request', lambda r: self.requests.append((r.method, r.url.split('/api/v1', 1)[-1])) if '/api/v1/' in r.url else None)

    def _dialog(self, d):
        self.dialogs.append((d.type, d.message))
        d.accept() if self.mode == 'accept' else d.dismiss()

    def reset(self, mode):
        self.mode = mode; self.dialogs.clear(); self.requests.clear()

    def count(self, method, path_end):
        return sum(1 for m, u in self.requests if m == method and u.split('?')[0].endswith(path_end))


def setting(key):
    # textul JSON brut, decodat aici (la fel în MySQL și MariaDB)
    rows = db_query('SELECT CAST(`value` AS CHAR) AS v FROM settings WHERE `key` = ?', [key])
    return json.loads(rows[0]['v']) if rows else None


def set_setting(key, value):
    db_exec('INSERT INTO settings (`key`, `value`, updated_at, updated_by) VALUES (?, ?, NOW(3), NULL) '
            'ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)', [key, json.dumps(value)])


def click(loc, pg, wait):
    """Click numai dacă butonul mai există (fără confirmare, primul click ar fi executat deja acțiunea și butonul ar fi
    dispărut): absența se raportează ca FAIL în verificare, nu ca excepție."""
    if loc.count() == 0:
        return False
    loc.first.click(timeout=5000); pg.wait_for_timeout(wait)
    return True


def report_card(pg, ref):
    pg.evaluate("() => document.querySelector('[data-admin-tab=reports]').click()"); pg.wait_for_timeout(800)
    box = 'input[placeholder^="Caută TM-XXX"]'
    pg.fill(box, ref); pg.press(box, 'Enter'); pg.wait_for_timeout(900)
    return pg.locator('[data-testid=admin-report-card]', has_text=ref).first


def pair(name, cancel_req, ok_req, before, after_cancel, after_ok, expected_text, dialogs_cancel, dialogs_ok):
    """Rezultatele separate: Anulează / OK."""
    res.check(f'{name} — „Anulează”: dialogul cu textul din plan, nicio cerere, starea neschimbată',
              dialogs_cancel == [('confirm', expected_text)] and cancel_req == 0 and after_cancel == before,
              json.dumps({'dialoguri': dialogs_cancel, 'cereri': cancel_req, 'stare': [before, after_cancel]}, ensure_ascii=False, default=str))
    res.check(f'{name} — „OK”: dialogul cu textul din plan, o singură cerere, starea schimbată',
              dialogs_ok == [('confirm', expected_text)] and ok_req == 1 and after_ok != before,
              json.dumps({'dialoguri': dialogs_ok, 'cereri': ok_req, 'stare': [before, after_ok]}, ensure_ascii=False, default=str))


with backend_server(5994) as B, sync_playwright() as pw:
    URL = B['url']
    b = pw.chromium.launch()
    errors = []
    try:
        # ——— date de test ———
        setup = b.new_context()
        citizen_login_api(setup, URL, CITIZEN)
        r = submit_report_api(setup, URL, form_token(setup, URL), 'Sesizare de test pentru confirmările O3.', {'text': 'Punct de test', 'lat': 43.7460, 'lng': 24.8745, 'source': 'pin'})
        assert r.status in (200, 201), r.text()
        setup.close()
        rep = db_query('SELECT id, reference_number AS ref FROM reports ORDER BY created_at DESC LIMIT 1')[0]
        RID, REF = rep['id'], rep['ref']
        db_exec("INSERT INTO email_outbox (id, kind, report_id, recipient, subject, body_text, status, attempts, last_error, mode_at_send, created_at) "
                "VALUES (?, 'registry_notification', ?, ?, 'Subiect', 'corp', 'failed', 1, 'eroare de test', 'simulated', NOW(3))", [EMAIL_ID, RID, REGISTRY])
        set_setting('registry.recipient_email', REGISTRY)
        set_setting('registry.flow_enabled', False)
        set_setting('registry.primaria_mode', 'platform')
        set_setting('registry.agreement_reference', None)

        c = b.new_context(viewport={'width': 1280, 'height': 900}); c.route('https://*.tile.openstreetmap.org/**', lambda r: r.abort())
        sp = c.new_page(); sp.on('pageerror', lambda e: errors.append(str(e)[:160]))
        admin_login(sp, URL, B, B['admin'])
        W = Watch(sp)
        now = datetime.now(timezone.utc)
        survey_body = {
            'title': SURVEY_TITLE, 'description': 'Sondaj creat pentru testul confirmărilor O3.', 'status': 'active', 'resultsVisibility': 'live',
            'startAt': (now - timedelta(hours=1)).isoformat(), 'endAt': (now + timedelta(days=30)).isoformat(),
            'questions': [{'text': 'Întrebare de test?', 'type': 'single_choice', 'isRequired': True, 'options': [{'text': 'Da'}, {'text': 'Nu'}]}]}
        rq = sp.request.post(URL + '/api/v1/admin/surveys', headers=CSRF, data=survey_body)
        assert rq.status in (200, 201), rq.text()
        SID = rq.json()['id']
        survey_body['title'] = SURVEY2_TITLE
        rq = sp.request.post(URL + '/api/v1/admin/surveys', headers=CSRF, data=survey_body)
        assert rq.status in (200, 201), rq.text()
        SID2 = rq.json()['id']
        rq = sp.request.post(URL + '/api/v1/admin/quickdial/categories', headers=CSRF, data={'name': CATEGORY, 'description': 'Categorie de test.'})
        assert rq.status in (200, 201), rq.text()
        CID = rq.json()['id']

        # ——— 1. Reîncearcă e-mailul ———
        card = report_card(sp, REF)
        card.get_by_text('Detalii și acțiuni').click(); sp.wait_for_timeout(900)
        st = lambda: db_query('SELECT status FROM email_outbox WHERE id = ?', [EMAIL_ID])[0]['status']
        path = f'/admin/reports/{RID}/emails/{EMAIL_ID}/retry'
        before = st()
        W.reset('dismiss'); card.get_by_role('button', name='Reîncearcă').click(); sp.wait_for_timeout(700)
        cancel_req, d_cancel, after_cancel = W.count('POST', path), list(W.dialogs), st()
        W.reset('accept'); click(card.get_by_role('button', name='Reîncearcă'), sp, 1200)
        pair('1. Reîncearcă e-mailul', cancel_req, W.count('POST', path), before, after_cancel, st(), T_RETRY, d_cancel, list(W.dialogs))

        # ——— 2. Pornirea fluxului către Primărie (AM-2) ———
        sp.evaluate("() => document.querySelector('[data-admin-tab=reports]').click()"); sp.wait_for_timeout(800)
        panel = sp.locator('[data-testid=registry-settings]')
        panel.get_by_text('Fluxul către Primărie (super_admin)').click(); sp.wait_for_timeout(900)
        box = panel.locator('input[type=checkbox]')
        save = lambda: (panel.get_by_role('button', name='Salvează').click(), sp.wait_for_timeout(1000))
        put = '/admin/settings/registry'
        flow = lambda: setting('registry.flow_enabled')
        before = flow()
        box.click()                                                     # oprit → pornit (nesalvat)
        W.reset('dismiss'); save()
        cancel_req, d_cancel, after_cancel = W.count('PUT', put), list(W.dialogs), flow()
        W.reset('accept'); save()
        pair('2. Pornirea fluxului (oprit → pornit)', cancel_req, W.count('PUT', put), before, after_cancel, flow(), T_FLOW, d_cancel, list(W.dialogs))

        panel.locator('input[type=text]').fill('acord de test')       # fluxul deja pornit: doar se salvează configurația
        W.reset('dismiss'); save()
        res.check('2. Fluxul deja pornit, configurația salvată: fără confirmare, o singură cerere, fluxul rămâne pornit',
                  W.dialogs == [] and W.count('PUT', put) == 1 and flow() is True and setting('registry.agreement_reference') == 'acord de test',
                  json.dumps({'dialoguri': W.dialogs, 'cereri': W.count('PUT', put), 'flux': flow()}, ensure_ascii=False))
        box.click()                                                     # pornit → oprit
        W.reset('dismiss'); save()
        res.check('2. Oprirea fluxului (pornit → oprit): fără confirmare, o singură cerere, fluxul oprit',
                  W.dialogs == [] and W.count('PUT', put) == 1 and flow() is False,
                  json.dumps({'dialoguri': W.dialogs, 'cereri': W.count('PUT', put), 'flux': flow()}, ensure_ascii=False))
        box.click()                                                     # din nou oprit → pornit
        W.reset('accept'); save()
        res.check('2. A doua trecere oprit → pornit: confirmarea apare din nou; „OK” → o singură cerere, fluxul pornit',
                  W.dialogs == [('confirm', T_FLOW)] and W.count('PUT', put) == 1 and flow() is True,
                  json.dumps({'dialoguri': W.dialogs, 'cereri': W.count('PUT', put), 'flux': flow()}, ensure_ascii=False))

        # ——— 4. Închide sondajul ———
        sp.evaluate("() => document.querySelector('[data-admin-tab=surveys]').click()"); sp.wait_for_timeout(900)
        # cardul sondajului (lista Admin): selectorul rămâne legat de același sondaj și după schimbarea listei
        row = sp.locator('div.space-y-3 > div').filter(has_text=SURVEY_TITLE)
        sstatus = lambda: db_query('SELECT status FROM surveys WHERE id = ?', [SID])[0]['status']
        path = f'/admin/surveys/{SID}/status'
        before = sstatus()
        W.reset('dismiss'); row.locator('button[title="Închide sondajul"]').click(); sp.wait_for_timeout(700)
        cancel_req, d_cancel, after_cancel = W.count('PATCH', path), list(W.dialogs), sstatus()
        W.reset('accept'); click(row.locator('button[title="Închide sondajul"]'), sp, 1200)
        pair('4. Închide sondajul', cancel_req, W.count('PATCH', path), before, after_cancel, sstatus(),
             T_CLOSE.replace('{titlu}', SURVEY_TITLE), d_cancel, list(W.dialogs))

        # ——— 4. Închide sondajul, din formularul de editare ———
        status2 = lambda: db_query('SELECT status FROM surveys WHERE id = ?', [SID2])[0]['status']
        put2, patch2 = f'/admin/surveys/{SID2}', f'/admin/surveys/{SID2}/status'
        update_btn = sp.get_by_role('button', name='Actualizează Sondajul')

        def open_edit():
            sp.locator('div.space-y-3 > div').filter(has_text=SURVEY2_TITLE).locator('button[title="Editează sondajul"]').click(timeout=5000)
            sp.wait_for_timeout(700)

        def close_form_if_open():
            # dacă o salvare nu s-a făcut (de exemplu dialog refuzat), formularul rămâne deschis: se închide cu „Anulează”
            if update_btn.count():
                sp.get_by_role('button', name='Anulează', exact=True).last.click(); sp.wait_for_timeout(400)

        def form_status(value):
            sp.locator('select').filter(has=sp.locator('option[value="closed"]')).select_option(value)

        open_edit()                                                     # salvare fără închidere: fără confirmare
        W.reset('dismiss'); update_btn.click(); sp.wait_for_timeout(1200)
        res.check('4. Formularul: o salvare fără închidere nu cere confirmare; o actualizare, fără schimbarea stării',
                  W.dialogs == [] and W.count('PUT', put2) == 1 and W.count('PATCH', patch2) == 0 and status2() == 'active',
                  json.dumps({'dialoguri': W.dialogs, 'put': W.count('PUT', put2), 'patch': W.count('PATCH', patch2), 'stare': status2()}, ensure_ascii=False))
        close_form_if_open()
        open_edit(); form_status('closed')
        before = status2()
        W.reset('dismiss'); update_btn.click(); sp.wait_for_timeout(900)
        open_form = update_btn.count() == 1
        expected = T_CLOSE.replace('{titlu}', SURVEY2_TITLE)
        res.check('4. Formularul, starea „Închis / Finalizat” — „Anulează”: dialogul cu textul din plan, nicio cerere, '
                  'sondajul rămâne activ, formularul rămâne deschis',
                  W.dialogs == [('confirm', expected)] and W.count('PUT', put2) == 0 and W.count('PATCH', patch2) == 0
                  and status2() == before == 'active' and open_form,
                  json.dumps({'dialoguri': W.dialogs, 'put': W.count('PUT', put2), 'patch': W.count('PATCH', patch2), 'stare': status2(), 'formular': open_form}, ensure_ascii=False))
        W.reset('accept'); click(update_btn, sp, 1500)
        res.check('4. Formularul, starea „Închis / Finalizat” — „OK”: un singur dialog (fără confirmarea de pe butonul din listă), '
                  'o singură salvare (o actualizare + o schimbare de stare), sondajul închis',
                  W.dialogs == [('confirm', expected)] and W.count('PUT', put2) == 1 and W.count('PATCH', patch2) == 1 and status2() == 'closed',
                  json.dumps({'dialoguri': W.dialogs, 'put': W.count('PUT', put2), 'patch': W.count('PATCH', patch2), 'stare': status2()}, ensure_ascii=False))

        # ——— 5. Șterge categoria ———
        sp.evaluate("() => document.querySelector('[data-admin-tab=quickdial]').click()"); sp.wait_for_timeout(800)
        sp.get_by_role('button', name='Gestiune Categorii').first.click(); sp.wait_for_timeout(800)
        # rândul categoriei (după titlul ei exact): după ștergere nu mai există și nu se poate confunda cu altă categorie
        row = sp.locator('div.rounded-2xl.shadow-sm').filter(has=sp.get_by_role('heading', name=CATEGORY, exact=True)).last
        exists = lambda: len(db_query('SELECT id FROM quickdial_categories WHERE id = ?', [CID]))
        path = f'/admin/quickdial/categories/{CID}'
        before = exists()
        W.reset('dismiss'); row.locator('button[title="Șterge categoria"]').click(); sp.wait_for_timeout(700)
        cancel_req, d_cancel, after_cancel = W.count('DELETE', path), list(W.dialogs), exists()
        W.reset('accept'); click(row.locator('button[title="Șterge categoria"]'), sp, 1200)
        pair('5. Șterge categoria', cancel_req, W.count('DELETE', path), before, after_cancel, exists(),
             T_DELETE.replace('{nume}', CATEGORY), d_cancel, list(W.dialogs))
        c.close()

        # ——— 3. Marchează rezolvată (subcontul Primăriei) ———
        db_exec("UPDATE reports SET resolution_status = 'in_analysis' WHERE id = ?", [RID])
        c = b.new_context(viewport={'width': 1280, 'height': 900})
        op = c.new_page(); op.on('pageerror', lambda e: errors.append(str(e)[:160]))
        admin_login(op, URL, B, B['op'])
        O = Watch(op)
        card = report_card(op, REF)
        rstatus = lambda: db_query('SELECT resolution_status AS s FROM reports WHERE id = ?', [RID])[0]['s']
        path = f'/admin/reports/{RID}/resolution'
        before = rstatus()
        O.reset('dismiss'); card.get_by_role('button', name='Marchează rezolvată').click(); op.wait_for_timeout(700)
        cancel_req, d_cancel, after_cancel = O.count('PATCH', path), list(O.dialogs), rstatus()
        O.reset('accept'); click(card.get_by_role('button', name='Marchează rezolvată'), op, 1200)
        pair('3. Marchează sesizarea rezolvată', cancel_req, O.count('PATCH', path), before, after_cancel, rstatus(),
             T_RESOLVE.replace('{TM}', REF), d_cancel, list(O.dialogs))
        c.close()
        res.check('fără erori JavaScript necaptate în pagini', not errors, '; '.join(errors[:3]))
    finally:
        b.close()

sys.exit(0 if res.report() else 1)
