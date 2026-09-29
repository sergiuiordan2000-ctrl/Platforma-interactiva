"""Faza 5.3 — E2E (B10 §6): conținutul public servit din API, cu serverul real și DB-ul de test.

Acasă, Comunicate, Ghid, Apel rapid: datele vin de la server (seed demo), nu din `localStorage`;
modificările din Admin apar în zona publică după reîncărcare; stările „se încarcă” / „eroare” funcționează.
"""
import sys; sys.dont_write_bytecode = True
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
from harness import *
import time
import urllib.request

res = Results('5.3 CONTINUT PUBLIC DIN API (E2E, server real)')
_last_totp = {'step': 0}
STORAGE_KEYS_5_3 = ['turnu_civic_announcements', 'turnu_civic_city_hall_directory',
                    'turnu_civic_quickdial_contacts', 'turnu_civic_quickdial_categories']


def api_get(path):
    with urllib.request.urlopen(URL + '/api/v1' + path) as r:
        return json.loads(r.read().decode('utf-8'))


def goto(page, route):
    page.goto(URL + '/#' + route); page.wait_for_load_state('networkidle'); page.wait_for_timeout(250)


def login(page, email):
    page.goto(URL + '/#admin'); page.wait_for_load_state('networkidle')
    out = page.get_by_role('button', name='Ieșire (Logout)')
    if out.count():
        out.first.click(); page.wait_for_timeout(200)
    page.fill('input[type="email"]', email)
    page.fill('input[type="password"]', BACKEND['password'])
    page.click('button[type="submit"]'); page.wait_for_timeout(500)
    if email == BACKEND['admin']:
        while int(time.time() // 30) <= _last_totp['step']:
            time.sleep(1)
        _last_totp['step'] = int(time.time() // 30)
        page.fill('input[aria-label="Cod de 6 cifre"]', totp_code(BACKEND['totp_secret']))
        page.click('button[type="submit"]'); page.wait_for_timeout(500)
    page.wait_for_selector('text=Panou de Administrare Informații')


with backend_server(5599) as BACKEND, sync_playwright() as pw:
    URL = BACKEND['url']
    b = pw.chromium.launch()
    page = b.new_context(viewport={'width': 1280, 'height': 900}).new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)[:160]))
    page.goto(URL + '/'); page.evaluate('localStorage.clear(); sessionStorage.clear()')

    hl = api_get('/public/announcements/highlights')
    directory = api_get('/public/directory')
    quick = api_get('/public/quickdial')

    # 1. Acasă: alerta urgentă și ultimul comunicat, de la server
    goto(page, 'home')
    body = page.inner_text('body')
    res.check('A-1 Acasă: alerta urgentă și ultimul comunicat vin de la server',
              hl['urgentAlert'] and hl['urgentAlert']['title'] in body and hl['latest']['title'] in body, '')

    # 2. Comunicate: lista, filtrul pe tip, detaliul
    goto(page, 'comunicate')
    cards = page.locator('article h2', has_text='[DEMO]')
    res.check('C-1 Comunicate: lista publică are exact elementele serverului', cards.count() == hl['counts']['all'], f'{cards.count()} vs {hl["counts"]["all"]}')
    page.get_by_role('button', name=re.compile('Evenimente')).first.click(); page.wait_for_timeout(400)
    ev = page.locator('article h2', has_text='[DEMO]').count()
    res.check('C-2 filtrul „Evenimente” (serverul filtrează și sortează după data desfășurării)', ev == hl['counts']['event'], str(ev))
    page.locator('article h2', has_text='[DEMO]').first.click(); page.wait_for_timeout(300)
    res.check('C-3 detaliul unui comunicat se deschide', page.get_by_text('Înapoi', exact=False).count() >= 1, '')

    # 3. Ghid: instituția, direcțiile, link-urile
    goto(page, 'ghid')
    body = page.inner_text('body')
    res.check('G-1 Ghid: datele instituției vin de la server', directory['institution']['institutionName'] in body, '')
    page.get_by_role('button', name='Direcții & Servicii').first.click(); page.wait_for_timeout(300)
    body = page.inner_text('body')
    res.check('G-2 Ghid: direcțiile active de la server', all(d['name'] in body for d in directory['departments']), '')
    page.get_by_role('button', name='Link-uri Utile').first.click(); page.wait_for_timeout(300)
    body = page.inner_text('body')
    res.check('G-3 Ghid: link-urile utile active de la server', all(l['title'] in body for l in directory['links']), '')

    # 4. Apel rapid: contactele active și căutarea locală
    page.get_by_role('button', name=re.compile('Quick Dial')).first.click(); page.wait_for_timeout(400)
    body = page.inner_text('body')
    first = quick['contacts'][0]
    res.check('Q-1 Apel rapid: contactele de la server', first['name'] in body and first['formattedPhone'] in body, '')
    search = page.locator('input[type="text"]').first
    search.fill(first['name']); page.wait_for_timeout(200)
    res.check('Q-2 Apel rapid: căutarea locală găsește contactul', page.get_by_text(first['name']).count() >= 1, '')

    # 5. Nicio cheie `localStorage` pentru domeniile 5.3
    keys = page.evaluate('Object.keys(localStorage)')
    res.check('S-1 nicio dată a domeniilor 5.3 în localStorage', not any(k in keys for k in STORAGE_KEYS_5_3), json.dumps(keys))

    # 6. Admin (operator): creare comunicat -> apare public; dezactivare -> dispare
    login(page, BACKEND['op'])
    page.get_by_text('Comunicate (5B)').first.click(); page.wait_for_timeout(500)
    page.get_by_role('button', name='Adaugă Comunicat Nou').click(); page.wait_for_timeout(200)
    title = 'E2E Comunicat 5.3'
    page.fill('input[placeholder="ex: Infrastructură, Cultură, Sănătate"]', 'Administrație')
    page.fill('input[placeholder="Titlul comunicatului"]', title)
    page.fill('input[placeholder="Rezumat de 1-2 fraze"]', 'Rezumat E2E')
    page.fill('textarea[placeholder^="Textul integral"]', 'Conținut E2E')
    page.fill('input[placeholder="ex: Primăria Turnu Măgurele"]', 'Primăria')
    page.get_by_role('button', name='Salvează și Publică').click(); page.wait_for_timeout(800)
    in_admin = page.get_by_text(title).count() >= 1
    goto(page, 'comunicate')
    res.check('ADM-1 comunicat creat în Admin (operator) → vizibil în zona publică', in_admin and page.get_by_text(title).count() >= 1, f'admin={in_admin}')

    page.goto(URL + '/#admin'); page.wait_for_load_state('networkidle'); page.wait_for_timeout(300)
    page.get_by_text('Comunicate (5B)').first.click(); page.wait_for_timeout(500)
    row = page.locator('div.bg-white.rounded-2xl', has_text=title).last
    row.locator('button[title="Dezactivează (ciornă)"]').click(); page.wait_for_timeout(700)
    goto(page, 'comunicate')
    res.check('ADM-2 comunicat dezactivat → dispare din zona publică', page.get_by_text(title).count() == 0, '')

    # 7. Operatorul vede Ghidul în Admin, dar nu îl poate modifica (B4)
    page.goto(URL + '/#admin'); page.wait_for_load_state('networkidle'); page.wait_for_timeout(300)
    page.get_by_text('A. Ghidul Primăriei').first.click(); page.wait_for_timeout(300)
    page.get_by_role('button', name='Link-uri Utile').first.click(); page.wait_for_timeout(500)
    res.check('ADM-3 operator: Ghid numai vizualizare (fără „Adaugă Link Nou”)', page.get_by_role('button', name='Adaugă Link Nou').count() == 0, '')

    # 8. super_admin: dezactivează un link -> dispare public; reactivare -> reapare
    login(page, BACKEND['admin'])
    page.get_by_text('A. Ghidul Primăriei').first.click(); page.wait_for_timeout(300)
    page.get_by_role('button', name='Link-uri Utile').first.click(); page.wait_for_timeout(500)
    link_title = directory['links'][0]['title']
    lrow = page.locator('div', has_text=link_title).filter(has=page.locator('button[title="Dezactivează din zona publică"]')).last
    lrow.locator('button[title="Dezactivează din zona publică"]').click(); page.wait_for_timeout(700)
    gone = link_title not in [l['title'] for l in api_get('/public/directory')['links']]
    lrow = page.locator('div', has_text=link_title).filter(has=page.locator('button[title="Activează în zona publică"]')).last
    lrow.locator('button[title="Activează în zona publică"]').click(); page.wait_for_timeout(700)
    back = link_title in [l['title'] for l in api_get('/public/directory')['links']]
    res.check('ADM-4 super_admin: link dezactivat dispare din public și reapare la reactivare', gone and back, f'gone={gone} back={back}')

    # 9. Starea de eroare și reîncercarea (serverul indisponibil pentru o cerere)
    ctx2 = b.new_context(); p2 = ctx2.new_page()
    p2.on('pageerror', lambda e: errors.append(str(e)[:160]))
    blocked = {'on': True}
    p2.route('**/api/v1/public/directory', lambda route: route.abort() if blocked['on'] else route.continue_())
    p2.goto(URL + '/#ghid'); p2.wait_for_load_state('networkidle'); p2.wait_for_timeout(400)
    has_err = p2.locator('[data-testid="load-state-error"]').count() == 1
    blocked['on'] = False
    p2.get_by_role('button', name='Încearcă din nou').click(); p2.wait_for_timeout(800)
    recovered = directory['institution']['institutionName'] in p2.inner_text('body')
    res.check('E-1 eroare de rețea: mesaj + „Încearcă din nou” reîncarcă datele', has_err and recovered, f'err={has_err} ok={recovered}')
    ctx2.close()

    res.check('fără erori JS', not errors, '; '.join(errors))
    b.close()

ok = res.report()
sys.exit(0 if ok else 1)
