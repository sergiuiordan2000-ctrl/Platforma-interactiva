"""ETAPA 6.6 — teste UI pe build-ul de productie (vite preview): Admin + harta publica."""
import sys; sys.dont_write_bytecode = True
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
import subprocess
from harness import *

PREVIEW_PORT = 5299
URL = f'http://127.0.0.1:{PREVIEW_PORT}'
res = Results('E66 UI (build productie)')
# Faza 5.2: login real pe serverul Node (DB de test), conturi de test create de `dev:e2e-setup` (B10 §4)
ADMIN, OP, OP2 = E2E_ACCOUNTS['admin'], E2E_ACCOUNTS['op'], E2E_ACCOUNTS['op2']
BACKEND = {}
_last_totp = {'step': -1}

LEGACY = {"id": "rep-legacy-ui", "referenceNumber": "TM-090", "categoryId": "drumuri", "categoryName": "Drumuri",
          "description": "Sesizare veche fara campuri 6.6", "photos": [],
          "location": {"addressOrDetails": "Str. Veche 1", "latitude": 43.752, "longitude": 24.872, "source": "manual"},
          "contact": {"name": "Maria Cetatean", "email": "maria.cetatean@example.com"},
          "createdAt": "2026-01-05T10:00:00.000Z", "status": "transmis", "publicationPreference": "public", "moderationStatus": "approved"}


LEGACY_PRIV = {"id": "rep-legacy-priv", "referenceNumber": "TM-091", "categoryId": "iluminat", "categoryName": "Iluminat public",
               "description": "Stalp de iluminat defect (sesizare privata istorica)", "photos": [],
               "location": {"addressOrDetails": "Str. Privata 9", "latitude": 43.7485, "longitude": 24.8655, "source": "manual"},
               "contact": {"name": "Dan Confidential", "email": "dan.confidential@example.com", "phone": "0744111222"},
               "createdAt": "2026-01-06T10:00:00.000Z", "status": "transmis", "publicationPreference": "private", "moderationStatus": "approved",
               "resolutionStatus": "in_progress", "cityHallTakenOver": True}


def login(page, email):
    page.goto(URL + '/#admin'); page.wait_for_load_state('networkidle')
    logout_btn = page.get_by_role('button', name='Ieșire (Logout)')
    if logout_btn.count():
        logout_btn.first.click(); page.wait_for_timeout(200)
    page.fill('input[type="email"]', email)
    page.fill('input[type="password"]', BACKEND['password'])
    page.click('button[type="submit"]'); page.wait_for_timeout(500)
    if email == ADMIN:
        # TOTP: un cod se acceptă o singură dată (anti-reluare) -> se așteaptă pasul următor dacă e nevoie
        while int(time.time() // 30) <= _last_totp['step']:
            time.sleep(1)
        _last_totp['step'] = int(time.time() // 30)
        page.fill('input[aria-label="Cod de 6 cifre"]', totp_code(BACKEND['totp_secret']))
        page.click('button[type="submit"]'); page.wait_for_timeout(500)
    page.wait_for_selector('text=Panou de Administrare Informații')
    page.get_by_text('Moderare Sesizări').first.click(); page.wait_for_timeout(300)


def card(page, ref):
    span = page.locator('span.font-mono', has_text=ref).first
    return span.locator("xpath=ancestor::div[.//text()[contains(., 'Asumare / Preluare')]][1]")


def assume_block(page, ref):
    return card(page, ref).locator("xpath=.//div[./span[contains(., 'Asumare / Preluare')]]").first


def popup_text(page, ref):
    page.goto(URL + '/#harta'); page.wait_for_load_state('networkidle'); page.wait_for_timeout(600)
    marker = page.locator('.custom-civic-marker', has_text=ref).first
    marker.click(force=True); page.wait_for_timeout(400)
    # DOM complet al popup-ului (markup + text), nu doar textul vizibil
    return page.locator('.leaflet-popup-content').first.inner_html()


build = subprocess.run(['npm', 'run', 'build'], cwd=REPO, capture_output=True, text=True)
res.check('BUILD npm run build', build.returncode == 0, '')
import harness
with backend_server(PREVIEW_PORT) as backend:
    BACKEND.update(backend)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(); ctx = browser.new_context(viewport={'width': 1280, 'height': 1000}); page = ctx.new_page()
        errors = []; page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL + '/'); page.evaluate('localStorage.clear(); sessionStorage.clear();'); page.reload(); page.wait_for_load_state('networkidle')
        # sesizare veche (fara campurile 6.6) adaugata langa seed
        page.evaluate("l => { const s = JSON.parse(localStorage.getItem('turnu_civic_reports_store')); s.push(...l); localStorage.setItem('turnu_civic_reports_store', JSON.stringify(s)); }", [LEGACY, LEGACY_PRIV])
        page.reload(); page.wait_for_load_state('networkidle')

        # Public inainte de orice asumare
        t0 = popup_text(page, 'TM-002')
        res.check('UI0 DOM popup fara asumare: fara „Status” si „Preluată de”', all(v not in t0 for v in ['Status', 'Preluată', 'Preluata', 'În lucru', 'Administrator Platformă', 'Operator Primărie']) and 'TM-002' in t0, '')

        # super_admin
        login(page, ADMIN)
        blk = assume_block(page, 'TM-002').inner_text()
        res.check('UI1 super_admin: Primaria nepreluata, niciun responsabil, buton „Preia / Asumă”, fara „Preia de către Primărie”',
                  'Primăria nu a preluat' in blk and 'niciunul' in blk and 'Preia / Asumă' in blk and 'Preia de către Primărie' not in blk, blk.replace('\n', ' | '))
        assume_block(page, 'TM-002').get_by_role('button', name='Preia / Asumă').click(); page.wait_for_timeout(300)
        blk = assume_block(page, 'TM-002').inner_text(); c = card(page, 'TM-002').inner_text()
        res.check('UI2 dupa asumare: „Renunță la asumare”, responsabil „Administrator Platformă (dvs.)”, stadiu „În lucru”',
                  'Renunță la asumare' in blk and 'Administrator Platformă (dvs.)' in blk and 'Preia / Asumă' not in blk and 'ÎN LUCRU' in c.upper(), blk.replace('\n', ' | '))
        t1 = popup_text(page, 'TM-002')
        res.check('UI3 DOM popup dupa asumare super_admin: fara „Status”, „Preluată de” sau numele responsabilului', all(v not in t1 for v in ['Status', 'Preluată', 'Preluata', 'În lucru', 'Administrator Platformă', 'Operator Primărie']) and 'TM-002' in t1, '')

        # primarie_operator
        login(page, OP)
        blk = assume_block(page, 'TM-002').inner_text()
        res.check('UI4 operator: buton „Preia de către Primărie”; fara „Preia / Asumă” / „Renunță”; vede responsabilul existent',
                  'Preia de către Primărie' in blk and 'Preia / Asumă' not in blk and 'Renunță' not in blk and 'Administrator Platformă' in blk, blk.replace('\n', ' | '))
        assume_block(page, 'TM-002').get_by_role('button', name='Preia de către Primărie').click(); page.wait_for_timeout(300)
        blk = assume_block(page, 'TM-002').inner_text()
        res.check('UI5 dupa preluare: „Preluată de Primărie”, nicio actiune de renuntare pentru Primarie',
                  'Preluată de Primărie' in blk and 'Renunță' not in blk and 'Preia de către Primărie' not in blk, blk.replace('\n', ' | '))
        c_legacy = card(page, 'TM-090').inner_text()
        res.check('UI6 operatorul vede e-mailul cetateanului in Admin; sesizarea veche se afiseaza fara eroare',
                  'maria.cetatean@example.com' in c_legacy and 'Primăria nu a preluat' in c_legacy and 'niciunul' in c_legacy, '')

        t2 = popup_text(page, 'TM-002')
        res.check('UI7 DOM popup dupa preluarea Primariei: fara „Status”, „Preluată de” sau nume', all(v not in t2 for v in ['Status', 'Preluată', 'Preluata', 'În lucru', 'Administrator Platformă', 'Operator Primărie']) and 'TM-002' in t2, '')

        # al doilea operator
        login(page, OP2)
        blk = assume_block(page, 'TM-002').inner_text()
        res.check('UI8 al doilea operator: sesizare deja preluata -> fara buton de preluare sau renuntare',
                  'Preluată de Primărie' in blk and 'Preia de către Primărie' not in blk and 'Renunță' not in blk, blk.replace('\n', ' | '))

        # super_admin renunta -> Primaria ramane
        login(page, ADMIN)
        assume_block(page, 'TM-002').get_by_role('button', name='Renunță la asumare').click(); page.wait_for_timeout(300)
        blk = assume_block(page, 'TM-002').inner_text(); c = card(page, 'TM-002').inner_text()
        res.check('UI9 super_admin renunta: Primaria ramane preluata, stadiu ramane „În lucru”',
                  'Preluată de Primărie' in blk and 'niciunul' in blk and 'Preia / Asumă' in blk and 'ÎN LUCRU' in c.upper(), blk.replace('\n', ' | '))
        res.check('UI10 super_admin vede e-mailul cetateanului in Admin', 'maria.cetatean@example.com' in card(page, 'TM-090').inner_text(), '')
        t3 = popup_text(page, 'TM-002')
        res.check('UI11 DOM popup dupa retragere: fara „Status” / „Preluată de”', all(v not in t3 for v in ['Status', 'Preluată', 'Preluata', 'În lucru', 'Administrator Platformă', 'Operator Primărie']) and 'TM-002' in t3, '')

        # PRIV-4: popup-ul unei sesizari istorice 'private', aprobate si preluate de Primarie
        tp = popup_text(page, 'TM-091')
        res.check('PRIV-4 popup sesizare private (preluata de Primarie): vizibila, cu numar/categorie/descriere; fara flux intern si fara datele autorului',
                  'TM-091' in tp and 'Iluminat public' in tp and 'Stalp de iluminat defect' in tp and all(v not in tp for v in ['Status', 'Preluată', 'Preluata', 'În lucru', 'Administrator Platformă', 'Operator Primărie'])
                  and all(v not in tp for v in ['Dan Confidential', 'dan.confidential@example.com', '0744111222']), '')
        html_map = page.content()
        res.check('PRIV-4b datele autorului absente din tot DOM-ul hartii', all(v not in html_map for v in ['Dan Confidential', 'dan.confidential@example.com', '0744111222', 'Maria Cetatean', 'maria.cetatean@example.com']), '')
        # Toate suprafetele publice: acasa, comunicate, sesizari (formular), harta, sondaje, ghid
        leaks = {}
        for route in ['home', 'comunicate', 'sesizari', 'harta', 'sondaje', 'ghid']:
            page.goto(URL + '/#' + route); page.wait_for_load_state('networkidle'); page.wait_for_timeout(300)
            html_r = page.content()
            found = [v for v in ['Dan Confidential', 'dan.confidential@example.com', '0744111222', 'Maria Cetatean', 'maria.cetatean@example.com', 'Anonim Demo'] if v in html_r]
            if found: leaks[route] = found
        res.check('SURF datele cetatenilor nu apar pe nicio pagina publica (DOM complet)', leaks == {}, json.dumps(leaks))

        # PRIV-5: formularul cetateanului nu mai ofera ascunderea de pe harta
        page.goto(URL + '/#sesizari'); page.wait_for_load_state('networkidle'); page.wait_for_timeout(300)
        radios = page.locator('input[name="publicationPreference"]')
        vals = [radios.nth(i).get_attribute('value') for i in range(radios.count())]
        checked = page.locator('input[name="publicationPreference"]:checked').get_attribute('value')
        form_txt = page.inner_text('body')
        bad = [t for t in ['Nu doresc afișarea publică', 'nu va apărea niciodată pe harta', 'Doriți ca sesizarea să fie afișată'] if t in form_txt]
        res.check('PRIV-5 formular: fara optiunea „Nu doresc afișarea publică” sau echivalent; doar variante de afisare',
                  'private' not in vals and sorted(vals) == ['public', 'public_anonymous'] and bad == [], f'valori={vals} texte={bad}')
        res.check('PRIV-5b formular: implicit „public_anonymous”', checked == 'public_anonymous', str(checked))

        res.check('UI12 fara erori JS in pagina', not errors, '; '.join(errors))
        browser.close()

ok = res.report()
sys.exit(0 if ok else 1)
