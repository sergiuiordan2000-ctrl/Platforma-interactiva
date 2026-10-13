"""Faza 5.6 — E2E (B10 §6): sondajele pe server, în interfață, cu serverul real și DB-ul de test.

Public: lista deschisă și arhiva (D3), „Rezultate” numai când e permis, textul N4-1, ora României (P-5),
votul (validare, timpul minim, confirmare), indiciul „Ai participat deja” (N4-12), 409, 403, 422 și 429 în interfață,
votul cu ALTCHA pornită (N4-5), marcajul de integritate numai în arhivă (P-2), textele libere niciodată publice.
Admin: fără „Reset Demo” (D4), creare, blocarea după primul vot (T-4, P-6), ALTCHA și marcajul de integritate,
ștergerea cu voturi refuzată (409), închis = definitiv (P-1), textele libere după închidere, cu audit (N4-9).
Operator: numai vizualizare (B4).
"""
import sys; sys.dont_write_bytecode = True
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
from harness import *

res = Results('5.6 SONDAJE (E2E, server real)')
HINT = 'tmc_survey_participation_hint'
DEMO_OPEN = '01M3JMZC00Y9CTNMQ1MBDR40Y9'  # sondajul demo deschis (server/seeds/demo/surveys.json)


def goto(page, url, route):
    page.goto(url + '/#' + route); page.wait_for_load_state('networkidle'); page.wait_for_timeout(300)


with backend_server(5899) as B, sync_playwright() as pw:
    URL = B['url']
    b = pw.chromium.launch()
    errs = []
    try:
        ctx = b.new_context(viewport={'width': 1100, 'height': 900}); page = ctx.new_page()
        page.on('pageerror', lambda e: errs.append(str(e)[:200]))

        # 1. lista publică
        goto(page, URL, 'sondaje')
        body = page.inner_text('body')
        res.check('S-1 lista deschisă + arhiva + N4-1', 'Participă' in body and 'Arhiva consultărilor încheiate' in body
                  and 'Consultare orientativă' in body and 'zonelor verzi' in body and 'Consultare încheiată' in body, '')
        open_list = page.locator('[data-testid=surveys-open-list]')
        arch = page.locator('[data-testid=surveys-archive]')
        res.check('S-2 D3: fără „Rezultate” la sondajul deschis (after_close); cu „Rezultate” în arhivă',
                  open_list.get_by_role('button', name='Rezultate').count() == 0 and arch.get_by_role('button', name='Rezultate').count() == 1, '')
        res.check('S-3 ora României la închidere (30 iun. 2027, 20:00)', '30 iun. 2027, 20:00' in body, body[body.find('Valabil'):][:60])
        keys = page.evaluate("Object.keys(localStorage)")
        res.check('S-4 nimic în localStorage la simpla deschidere', keys == [], str(keys))

        # 2. rezultatele din arhivă
        arch.get_by_role('button', name='Rezultate').click(); page.wait_for_timeout(600)
        t = page.inner_text('body')
        res.check('S-5 rezultate arhivă: agregate de la server', 'REZULTATE AGREGATE' in t.upper() and '27 răspunsuri' in t and '51.9%' in t, '')
        page.get_by_role('button', name='Închide', exact=True).last.click(); page.wait_for_timeout(200)

        # 3. vot: validare, apoi succes
        open_list.get_by_role('button', name='Participă').click(); page.wait_for_timeout(700)
        page.get_by_role('button', name='Trimite Răspunsurile').click(); page.wait_for_timeout(300)
        res.check('S-6 validare în browser: întrebarea obligatorie', 'răspuns obligatoriu' in page.inner_text('body'), '')
        page.locator('#question-card-' + page.evaluate("document.querySelector('[id^=question-card-]').id.replace('question-card-','')") + ' label').first.click()
        page.fill('textarea', 'Mai multe bănci în parc.')
        t0 = time.time()
        page.get_by_role('button', name='Trimite Răspunsurile').click()
        page.wait_for_selector('text=Răspunsurile dumneavoastră au fost înregistrate!', timeout=15000)
        res.check('S-7 vot înregistrat (cu așteptarea timpului minim)', True, f'{time.time()-t0:.1f}s')
        page.get_by_text('Închide fereastra').click(); page.wait_for_timeout(300)
        body = page.inner_text('body')
        hint = page.evaluate(f"localStorage.getItem('{HINT}')")
        res.check('S-8 „Ai participat deja” + indiciul (numai ID-ul sondajului) în localStorage', 'Ai participat deja' in body and 'Vezi detalii' in body and hint.startswith('["01'), str(hint))
        n = db_query('SELECT COUNT(*) AS n FROM survey_submissions WHERE is_demo = FALSE')[0]['n']
        res.check('S-9 un vot în DB', n == 1, str(n))

        # 4. 409: fără indiciu, cu același cookie de participare
        page.evaluate("localStorage.clear()"); page.reload(); page.wait_for_load_state('networkidle'); page.wait_for_timeout(300)
        page.locator('[data-testid=surveys-open-list]').get_by_role('button', name='Participă').click(); page.wait_for_timeout(700)
        page.locator('[id^=question-card-] label').first.click()
        page.get_by_role('button', name='Trimite Răspunsurile').click()
        page.wait_for_selector('text=Ați participat deja la acest sondaj', timeout=15000)
        n = db_query('SELECT COUNT(*) AS n FROM survey_submissions WHERE is_demo = FALSE')[0]['n']
        res.check('S-10 409: ecranul „Ați participat deja”, tot un vot în DB', n == 1, str(n))
        page.get_by_role('button', name='Înapoi la lista de sondaje').click()

        # 5. Admin (super_admin, alt context)
        actx = b.new_context(viewport={'width': 1200, 'height': 950}); ap = actx.new_page()
        ap.on('pageerror', lambda e: errs.append('admin: ' + str(e)[:200]))
        admin_login(ap, URL, B, B['admin'])
        ap.get_by_role('button', name='D. Sondaje Civice (4B)').click(); ap.wait_for_timeout(700)
        t = ap.inner_text('body')
        res.check('SA-1 lista Admin de la server; fără „Reset Demo”; 1 vot', 'Reset Demo' not in t and 'Administrare Sondaje Cetățenești (3)' in t and '1 vot' in t, '')

        # creare: sondaj nou, activ, rezultate în timp real
        ap.get_by_role('button', name='Sondaj Nou').click(); ap.wait_for_timeout(300)
        ap.get_by_role('button', name='Salvează Sondajul').click(); ap.wait_for_timeout(200)
        res.check('SA-2 validarea formularului', 'minim 5 caractere' in ap.inner_text('body'), '')
        ap.fill('input[placeholder^="Ex: Consultare privind"]', 'E2E 5.6: iluminatul din centru')
        ap.fill('textarea[placeholder^="Explicați cetățenilor"]', 'Sondaj de probă creat din interfața Admin.')
        ap.fill('input[placeholder^="Ex: Cât de des"]', 'Este suficient iluminatul din centru?')
        opts = ap.locator('input[placeholder="Text variantă de răspuns..."]')
        opts.nth(0).fill('Da'); opts.nth(1).fill('Nu')
        ap.get_by_role('button', name='Adaugă întrebare').click()
        ap.locator('select').filter(has_text='Alegere unică (Radio)').nth(1).select_option('free_text')
        ap.locator('input[placeholder^="Ex: Cât de des"]').nth(1).fill('Ce ați schimba?')
        ap.locator('input[type=checkbox]').nth(1).uncheck()
        sel = ap.locator('select')
        sel.filter(has_text='Ciornă / În lucru').select_option('active')
        sel.filter(has_text='După închiderea consultării').select_option('live')
        dt = ap.locator('input[type="datetime-local"]')
        res.check('SA-3 data și ora: câmpuri datetime-local, sfârșit la 23:59', dt.count() == 2 and dt.nth(1).input_value().endswith('T23:59'), dt.nth(1).input_value())
        ap.get_by_role('button', name='Salvează Sondajul').click(); ap.wait_for_timeout(900)
        t = ap.inner_text('body')
        res.check('SA-4 sondaj creat și activ', 'Administrare Sondaje Cetățenești (4)' in t and 'E2E 5.6' in t, t[-200:] if 'Probă' not in t else '')
        row = db_query("SELECT id, status, results_visibility AS v, start_at AS s, end_at AS e FROM surveys WHERE title LIKE 'E2E 5.6%'")[0]
        res.check('SA-5 în DB: activ, live', row['status'] == 'active' and row['v'] == 'live', json.dumps(row))
        SID = row['id']

        # public: sondajul nou are „Rezultate” (live); votează un alt browser
        c2 = b.new_context(); p2 = c2.new_page(); goto(p2, URL, 'sondaje')
        card_btns = p2.locator('[data-testid=surveys-open-list]').get_by_role('button', name='Rezultate')
        res.check('S-11 D3 live: butonul „Rezultate” apare la sondajul nou; nota generală dispare',
                  card_btns.count() == 1 and 'Rezultatele vor fi disponibile la finalizarea' not in p2.inner_text('body'), str(card_btns.count()))
        p2.locator('[data-testid=surveys-open-list] > div.grid > div').filter(has_text='E2E 5.6').get_by_role('button', name='Participă').click(); p2.wait_for_timeout(600)
        p2.locator('[id^=question-card-] label').first.click(); p2.fill('textarea', 'Text liber de probă.')
        p2.get_by_role('button', name='Trimite Răspunsurile').click()
        p2.wait_for_selector('text=Răspunsurile dumneavoastră au fost înregistrate!', timeout=15000)
        p2.get_by_text('Închide fereastra').click()
        card_btns.click(); p2.wait_for_timeout(600)
        t = p2.inner_text('body')
        res.check('S-12 rezultate live: 1 răspuns, 100%, textul liber NU apare', '1 răspuns' in t and '100%' in t and 'Text liber de probă' not in t and '1 mesaje înregistrate' in t, '')

        # Admin: blocarea după primul vot
        ap.reload(); ap.wait_for_load_state('networkidle'); ap.get_by_role('button', name='D. Sondaje Civice (4B)').click(); ap.wait_for_timeout(600)
        rowp = ap.locator('div.space-y-3 > div').filter(has_text='E2E 5.6')
        rowp.get_by_role('button', name='Editează').click(); ap.wait_for_timeout(300)
        t = ap.inner_text('body')
        locked_inputs = ap.locator('input[placeholder^="Ex: Cât de des"]').first.is_disabled() and ap.locator('input[type="datetime-local"]').first.is_disabled()
        res.check('SA-6 editare după primul vot: nota de blocare, câmpurile de structură dezactivate, fără „Salvează ca Draft”',
                  'Sondajul a primit voturi' in t and locked_inputs and ap.get_by_role('button', name='Salvează ca Draft').count() == 0, '')
        ap.fill('input[placeholder^="Ex: Consultare privind"]', 'E2E 5.6: iluminatul din centru (titlu corectat)')
        ap.get_by_role('button', name='Actualizează Sondajul').click(); ap.wait_for_timeout(900)
        res.check('SA-7 titlul se poate modifica după primul vot', '(titlu corectat)' in ap.inner_text('body') and ap.locator('[role=alert]').count() == 0, ap.inner_text('body')[:150])

        # inspectare: ALTCHA, integritate; textele libere numai după închidere
        rowp = ap.locator('div.space-y-3 > div').filter(has_text='E2E 5.6')
        rowp.get_by_role('button', name='Inspectează').click(); ap.wait_for_timeout(300)
        t = ap.inner_text('body')
        res.check('SA-8 inspectare: vizibilitate, voturi, textele libere numai după închidere',
                  'În timp real' in t and 'Răspunsurile libere se pot citi numai după închiderea sondajului' in t and ap.get_by_role('button', name='Citește răspunsurile libere').count() == 0, '')
        prot = ap.locator('[data-testid=survey-protection]')
        # D-B3 (13.10.2026): ALTCHA obligatoriu la vot; în locul comutatorului, o notă (singura bifă rămasă: integritatea)
        pow_note = prot.locator('[data-testid=survey-pow-required]').inner_text() if prot.locator('[data-testid=survey-pow-required]').count() else ''
        prot.locator('input[type=checkbox]').nth(0).check()
        prot.locator('textarea').fill('Voturi repetate observate din aceeași rețea.')
        prot.get_by_role('button', name='Salvează marcajul').click(); ap.wait_for_timeout(600)
        row = db_query('SELECT pow_enabled AS p, integrity_flag AS f, integrity_note AS n FROM surveys WHERE id = ?', [SID])[0]
        res.check('SA-9 ALTCHA afișat ca obligatoriu (fără comutator); marcajul de integritate salvat',
                  'obligatorie' in pow_note and row['f'] == 1 and 'aceeași rețea' in row['n'], json.dumps(row, ensure_ascii=False) + ' | ' + pow_note)
        ap.get_by_role('button', name='Închide', exact=True).last.click(); ap.wait_for_timeout(200)

        # vot cu ALTCHA pornit (al treilea browser)
        c3 = b.new_context(); p3 = c3.new_page(); goto(p3, URL, 'sondaje')
        res.check('S-13 P-2: marcajul de integritate NU apare public cât sondajul e deschis', 'Rezultate posibil afectate' not in p3.inner_text('body'), '')
        p3.locator('[data-testid=surveys-open-list] > div.grid > div').filter(has_text='E2E 5.6').get_by_role('button', name='Participă').click(); p3.wait_for_timeout(600)
        p3.locator('[id^=question-card-] label').nth(1).click()
        p3.get_by_role('button', name='Trimite Răspunsurile').click()
        try:
            p3.wait_for_selector('text=Răspunsurile dumneavoastră au fost înregistrate!', timeout=40000); okpow = True
        except Exception:
            okpow = False
        res.check('S-14 vot cu ALTCHA pornit', okpow, '' if okpow else ' | '.join(p3.locator('.bg-red-50').all_inner_texts()))

        # ștergere cu voturi → 409, mesaj
        rowp.locator('button[title="Șterge sondajul"]').click(); ap.wait_for_timeout(200)
        ap.get_by_role('button', name='Da, șterge definitiv').click(); ap.wait_for_timeout(700)
        res.check('SA-10 ștergere cu voturi: refuzată cu mesaj (409)', 'Un sondaj cu voturi nu se șterge' in ap.inner_text('body'), '')
        ap.locator('[role=alert] button').first.click()

        # închidere → arhivă publică cu marcaj; texte libere în Admin
        rowp.get_by_role('button', name='Închide').click(); ap.wait_for_timeout(900)
        rowp = ap.locator('div.space-y-3 > div').filter(has_text='E2E 5.6')
        t = rowp.inner_text()
        res.check('SA-11 după închidere: fără Editează / Activează / Închide (P-1)', 'Închis / Finalizat' in t and rowp.get_by_role('button', name='Editează').count() == 0
                  and rowp.get_by_role('button', name='Activează').count() == 0 and rowp.get_by_role('button', name='Închide').count() == 0, t[:120])
        rowp.get_by_role('button', name='Inspectează').click(); ap.wait_for_timeout(300)
        ap.get_by_role('button', name='Citește răspunsurile libere').click(); ap.wait_for_timeout(700)
        t = ap.inner_text('[data-testid=survey-free-texts]')
        aud = db_query("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'survey.free_text.read' AND target_id = ?", [SID])[0]['n']
        res.check('SA-12 textele libere după închidere, cu audit', 'Text liber de probă.' in t and aud == 1, f'audit={aud} {t[:80]}')
        ap.get_by_role('button', name='Închide', exact=True).last.click()
        rowp.get_by_role('button', name='Rezultate').click(); ap.wait_for_timeout(600)
        res.check('SA-13 rezultate Admin: 2 răspunsuri', '2 răspunsuri' in ap.inner_text('body'), '')
        ap.get_by_role('button', name='Închide', exact=True).last.click()

        p3.reload(); p3.wait_for_load_state('networkidle'); p3.wait_for_timeout(300); t = p3.inner_text('[data-testid=surveys-archive]')
        res.check('S-15 arhiva: sondajul închis, cu marcajul și nota de integritate', 'E2E 5.6' in t and 'Rezultate posibil afectate' in t and 'aceeași rețea' in t, t[:400])

        # 422 / 429 în interfață. Răspunsurile serverului la POST sunt simulate aici (regulile reale: integration/surveys.test.ts);
        # se verifică numai ce afișează formularul și că răspunsurile completate rămân.
        c5 = b.new_context(); p5 = c5.new_page(); p5.on('pageerror', lambda e: errs.append('p5: ' + str(e)[:200]))
        mode = {'status': 429, 'fields': None}
        detail_calls = []

        def fake_submit(route):
            if route.request.method != 'POST':
                return route.continue_()
            err = {'code': 'RATE_LIMITED' if mode['status'] == 429 else 'VALIDATION', 'message': 'mesaj de test al serverului'}
            if mode['fields']:
                err['fields'] = mode['fields']
            route.fulfill(status=mode['status'], content_type='application/json', body=json.dumps({'error': err}),
                          headers={'Retry-After': '3600'} if mode['status'] == 429 else {})

        p5.route('**/api/v1/public/surveys/*/submissions', fake_submit)
        p5.on('requestfinished', lambda r: detail_calls.append(1) if r.url.endswith('/api/v1/public/surveys/' + DEMO_OPEN) else None)
        goto(p5, URL, 'sondaje')
        p5.locator('[data-testid=surveys-open-list] > div.grid > div').filter(has_text='zonelor verzi').get_by_role('button', name='Participă').click(); p5.wait_for_timeout(700)
        qid = p5.evaluate("document.querySelector('[id^=question-card-]').id.replace('question-card-', '')")
        p5.locator('#question-card-' + qid + ' label').first.click(); p5.fill('textarea', 'Răspuns păstrat după eroare.')
        submit = p5.get_by_role('button', name='Trimite Răspunsurile')
        submit.click(); p5.wait_for_selector('.bg-red-50', timeout=15000)
        t = ' | '.join(p5.locator('.bg-red-50').all_inner_texts())
        res.check('S-17 429 în interfață: mesajul „prea multe voturi din această rețea”, fără confirmare, răspunsurile păstrate',
                  'Prea multe voturi' in t and 'au fost înregistrate' not in p5.inner_text('body') and p5.input_value('textarea') == 'Răspuns păstrat după eroare.', t[:160])
        mode.update(status=422, fields={qid: 'răspuns obligatoriu'})
        submit.click(); p5.wait_for_timeout(1200)
        card = p5.inner_text('#question-card-' + qid); t = ' | '.join(p5.locator('.bg-red-50').all_inner_texts())
        res.check('S-18 422 cu câmpuri: eroarea apare la întrebarea indicată de server, cu mesajul general de corectare',
                  'răspuns obligatoriu' in card and 'corectați răspunsurile marcate' in t, (card[-120:] + ' || ' + t[:120]))
        before = len(detail_calls)
        mode.update(status=422, fields=None)
        submit.click(); p5.wait_for_timeout(1500)
        t = ' | '.join(p5.locator('.bg-red-50').all_inner_texts())
        res.check('S-19 422 fără câmpuri (formular expirat): formularul se reînnoiește de la server, răspunsurile rămân',
                  'Formularul a fost reîmprospătat' in t and len(detail_calls) == before + 1 and p5.input_value('textarea') == 'Răspuns păstrat după eroare.',
                  f'{t[:140]} detalii={before}->{len(detail_calls)}')
        n = db_query("SELECT COUNT(*) AS n FROM survey_submissions WHERE survey_id = ? AND is_demo = FALSE", [DEMO_OPEN])[0]['n']
        res.check('S-20 după erori: niciun vot în plus în DB', n == 1, str(n))

        # 403 în interfață: sondajul deschis în formular, închis între timp (simulat în DB)
        goto(p2, URL, 'sondaje')
        c4 = b.new_context(); p4 = c4.new_page(); goto(p4, URL, 'sondaje')
        p4.locator('[data-testid=surveys-open-list]').get_by_role('button', name='Participă').click(); p4.wait_for_timeout(600)
        db_exec("UPDATE surveys SET end_at = NOW() - INTERVAL 1 MINUTE WHERE id = ?", [DEMO_OPEN])
        p4.locator('[id^=question-card-] label').first.click()
        p4.get_by_role('button', name='Trimite Răspunsurile').click()
        try:
            p4.wait_for_selector('text=Consultarea nu este deschisă pentru vot', timeout=15000); ok403 = True
        except Exception:
            ok403 = False
        res.check('S-16 403: ecranul „Consultarea nu este deschisă pentru vot”', ok403, '' if ok403 else p4.inner_text('body')[-200:])

        # 6. operator: numai vizualizare
        octx = b.new_context(viewport={'width': 1200, 'height': 900}); op = octx.new_page()
        admin_login(op, URL, B, B['op'])
        op.get_by_role('button', name='D. Sondaje Civice (4B)').click(); op.wait_for_timeout(700)
        t = op.inner_text('body')
        res.check('SO-1 operator: vede lista, fără Sondaj Nou / Editează / Închide / Șterge',
                  'Administrare Sondaje' in t and all(op.get_by_role('button', name=n).count() == 0 for n in ['Sondaj Nou', 'Editează', 'Activează', 'Închide'])
                  and op.locator('button[title="Șterge sondajul"]').count() == 0, '')
        op.get_by_role('button', name='Inspectează').first.click(); op.wait_for_timeout(300)
        res.check('SO-2 operator: fără secțiunea de protecție și fără texte libere', op.locator('[data-testid=survey-protection]').count() == 0 and 'Citește răspunsurile libere' not in op.inner_text('body'), '')

    except Exception as exc:  # orice excepție = FAIL raportat, nu oprire fără rezumat
        res.check('EXCEPTIE în scenariu', False, repr(exc)[:300])

    res.check('JS fără erori în pagini', not errs, '; '.join(errs)[:300])
    b.close()

ok = res.report()
sys.exit(0 if ok else 1)
