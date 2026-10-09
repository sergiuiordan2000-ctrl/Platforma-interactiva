"""Amendamentul Google, pasul 3 — E2E: interfața autentificării cetățeanului cu Google
(docs/faza5/AMENDAMENT_AUTENTIFICARE_GOOGLE_PLAN.md: G-1, §2, §8 A, §9.3, §11.1, §12.1, G-T10).

Drumul real, cap-coadă: butonul „Continuă cu Google” → `POST …/google/start` → furnizorul → întoarcerea →
sesiunea de cetățean. În locul lui Google se folosește un furnizor de identitate FALS, local
(`tests/lib/fake_oidc.mjs`), permis numai cu APP_ENV=development (`DEV_OIDC_PROVIDER_URL`). Fără apeluri la Google.
Furnizorul rulează pe `localhost`, aplicația pe `127.0.0.1`: pentru browser sunt site-uri diferite, deci
întoarcerea este o navigare de pe alt site, ca la Google (§9.3: cookie-ul de sesiune `SameSite=Strict`).

Regulile serverului (jetonul, `state`, PKCE, limitele, auditul) sunt testate în
server/test/integration/citizenGoogle.test.ts; aici se verifică interfața și lanțul complet.
Suită separată (server și DB proprii).
"""
import sys; sys.dont_write_bytecode = True
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
from harness import *

res = Results('GOOGLE INTERFATA (E2E, furnizor fals)')
APP_PORT, FAKE_PORT = 6099, 6199
POLICY = '[data-testid=citizen-policy] input[type=checkbox]'
GOOGLE = '[data-testid=citizen-google]'
MESSAGE = '[data-testid=citizen-google-message]'
BAR = '[data-testid=citizen-account-bar]'
CODE_BUTTON = 'button:has-text("Trimite codul pe e-mail")'
TEXTS = {
    'eroare': 'Autentificarea cu Google nu a reușit. Încercați din nou sau folosiți codul primit pe e-mail.',
    'anulat': 'Ați renunțat la autentificarea cu Google. Puteți încerca din nou sau puteți folosi codul primit pe e-mail.',
    'blocat': 'Această adresă nu mai poate fi folosită pentru un cont nou.',
    'limita': 'Prea multe încercări. Reveniți mai târziu.',
}

# build-ul frontend-ului servit de serverul Node: construit aici, ca suita să nu ruleze pe un `dist/` vechi
_build = subprocess.run(['npm', 'run', 'build'], cwd=REPO, capture_output=True, text=True)
if _build.returncode != 0:
    raise RuntimeError('npm run build a eșuat:\n' + _build.stdout[-2000:] + _build.stderr[-2000:])


def open_login(page, url):
    """Ecranul „Contul meu” (neautentificat), după ce interfața a aflat dacă Google este configurat."""
    page.goto(url + '/#sesizari'); page.reload(); page.wait_for_load_state('networkidle')
    page.wait_for_selector('[data-testid=citizen-login]'); page.wait_for_timeout(400)


def top(page, selector):
    return page.locator(selector).first.bounding_box()['y']


def message(page):
    loc = page.locator(MESSAGE)
    return loc.first.inner_text().strip() if loc.count() else ''


def accounts(email):
    return db_query('SELECT id, status, policy_version AS pv FROM citizen_accounts WHERE email_normalized = ?', [email.lower()])


def via_google(page, url, fake, email, verified=True, allow=True):
    """Bifa → „Continuă cu Google” → pagina furnizorului fals → Permite / Refuză → înapoi în aplicație."""
    open_login(page, url)
    page.check(POLICY)
    page.click(GOOGLE)
    page.wait_for_url(fake['url'] + '/authorize**', timeout=15000)
    at_provider = page.url
    scope = page.inner_text('#scope')
    page.fill('#fake-email', email)
    if not verified:
        page.uncheck('#fake-verified')
    page.click('#fake-allow' if allow else '#fake-deny')
    page.wait_for_url(re.compile('^' + re.escape(url) + r'/#sesizari'), timeout=15000)
    page.wait_for_load_state('networkidle'); page.wait_for_timeout(700)
    return at_provider, scope


def logout(page):
    page.click('button:has-text("Ieșire")'); page.wait_for_selector('[data-testid=citizen-login]'); page.wait_for_timeout(400)


errors = []

# ——— A. Fără Google configurat: ecranul de dinainte (G-T7) ———
with backend_server(APP_PORT) as BACKEND, sync_playwright() as pw:
    URL = BACKEND['url']
    b = pw.chromium.launch()
    try:
        ctx = b.new_context(viewport={'width': 430, 'height': 900})
        page = ctx.new_page(); page.on('pageerror', lambda e: errors.append(str(e)[:160]))
        status = ctx.request.get(URL + '/api/v1/citizen/auth/google').status
        open_login(page, URL)
        body = page.inner_text('[data-testid=citizen-login]')
        res.check('GU-1 fără configurare: ruta răspunde 404; fără buton Google și fără „sau”; ecranul de dinainte (e-mailul deasupra bifei, textul vechi)',
                  status == 404 and page.locator(GOOGLE).count() == 0 and page.locator('[data-testid=citizen-login-or]').count() == 0
                  and top(page, '#citizen-email') < top(page, POLICY) < top(page, CODE_BUTTON)
                  and 'primiți un cod pe e-mail' in body and 'Google' not in body, f'status={status}')
    except Exception as exc:
        res.check('EXCEPTIE în scenariul A', False, repr(exc)[:300])
    b.close()

# ——— B. Cu Google configurat (furnizorul fals) ———
with fake_oidc(FAKE_PORT) as FAKE, backend_server(APP_PORT, FAKE['env']) as BACKEND, sync_playwright() as pw:
    URL = BACKEND['url']
    b = pw.chromium.launch()
    try:
        ctx = b.new_context(viewport={'width': 430, 'height': 900})
        page = ctx.new_page(); page.on('pageerror', lambda e: errors.append(str(e)[:160]))
        requested = []
        page.on('request', lambda r: requested.append(r.url))

        # 1. ecranul
        open_login(page, URL)
        body = page.inner_text('[data-testid=citizen-login]')
        order = [top(page, s) for s in (POLICY, GOOGLE, '[data-testid=citizen-login-or]', '#citizen-email', CODE_BUTTON)]
        res.check('GU-2 cu Google: ordinea pe ecran este bifa → „Continuă cu Google” → „sau” → e-mail → „Trimite codul pe e-mail” (G-1, §2)',
                  order == sorted(order) and len(set(order)) == 5 and page.inner_text(GOOGLE).strip() == 'Continuă cu Google'
                  and 'intrați cu contul Google sau cu un cod primit pe e-mail' in body, str(order))
        foreign = [u for u in requested if not u.startswith(URL) and not u.startswith('data:')]
        res.check('GU-3 la încărcarea paginii nu se cere nimic de la Google sau de la furnizor (G-T1): sigla este desenată în pagină',
                  not foreign and page.locator(GOOGLE + ' svg').count() == 1 and page.locator(GOOGLE + ' img').count() == 0, '; '.join(foreign)[:200])

        # 2. bifa obligatorie (§8 A)
        starts = []
        page.on('request', lambda r: starts.append(r.url) if r.url.endswith('/citizen/auth/google/start') else None)
        page.click(GOOGLE); page.wait_for_timeout(600)
        alert = page.locator('[data-testid=citizen-google-error]')
        res.check('GU-4 fără bifa regulilor: mesaj, nicio cerere de pornire, nicio încercare pe server, pagina rămâne (§8 A)',
                  alert.count() == 1 and 'acceptați regulile de utilizare' in alert.inner_text() and not starts
                  and page.url.startswith(URL) and db_query('SELECT COUNT(*) AS n FROM citizen_oauth_attempts')[0]['n'] == 0, '')

        # 3. drumul complet: cont nou
        ana = 'ana.google@exemplu.test'
        at_provider, scope = via_google(page, URL, FAKE, ana)
        log = ctx.request.get(FAKE['url'] + '/log').json()
        res.check('GU-5 butonul duce la furnizor prin `POST …/start`; se cere numai `openid email`, cu PKCE S256, `state` și `nonce` (G-2, §11.1)',
                  len(starts) == 1 and at_provider.startswith(FAKE['url'] + '/authorize') and scope == 'openid email'
                  and log[-1].get('code_challenge_method') == 'S256' and len(log[-1].get('state', '')) >= 40 and len(log[-1].get('nonce', '')) >= 40
                  and log[-1].get('redirect_uri') == URL + '/api/v1/citizen/auth/google/callback', scope)
        acc = accounts(ana)
        no_code_mail = db_query("SELECT COUNT(*) AS n FROM email_outbox WHERE kind = 'citizen_login_code' AND recipient = ?", [ana])[0]['n'] == 0
        res.check('GU-6 la întoarcere: adresa este `/#sesizari`, bara contului arată e-mailul; cont nou activ, cu versiunea politicii; niciun cod trimis pe e-mail',
                  page.url == URL + '/#sesizari' and page.locator(BAR).count() == 1 and ana in page.inner_text(BAR)
                  and len(acc) == 1 and acc[0]['status'] == 'active' and acc[0]['pv'] == '2026-10' and no_code_mail and message(page) == '', page.url)
        cookies = {c['name']: c for c in ctx.cookies(URL)}
        sid = cookies.get('civic_sid', {})
        page.reload(); page.wait_for_load_state('networkidle'); page.wait_for_timeout(500)
        res.check('GU-7 sesiunea după întoarcerea de pe alt site (§9.3): cookie `SameSite=Strict`, `HttpOnly`; după reîncărcare rămâne autentificat; cookie-ul încercării este șters',
                  sid.get('sameSite') == 'Strict' and sid.get('httpOnly') is True and 'civic_oauth' not in cookies
                  and page.locator(BAR).count() == 1 and ana in page.inner_text(BAR), str(sorted(cookies)))

        # 4. același cont la a doua autentificare și după un cont făcut prin cod (G-3)
        logout(page)
        via_google(page, URL, FAKE, 'Ana.Google@Exemplu.test')
        again = accounts(ana)
        res.check('GU-8 după „Ieșire”, a doua autentificare cu Google (adresa scrisă cu majuscule) intră în același cont (G-3, D30)',
                  page.locator(BAR).count() == 1 and len(again) == 1 and again[0]['id'] == acc[0]['id'], '')
        logout(page)
        dan = 'dan.cod@exemplu.test'
        citizen_login_api(ctx, URL, dan)
        by_code = accounts(dan)
        ctx.request.post(URL + '/api/v1/citizen/auth/logout', headers=CSRF)
        via_google(page, URL, FAKE, dan)
        by_google = accounts(dan)
        res.check('GU-9 un cont creat prin cod pe e-mail: Google cu aceeași adresă intră în același cont (G-3)',
                  page.locator(BAR).count() == 1 and dan in page.inner_text(BAR) and len(by_code) == 1 and len(by_google) == 1
                  and by_google[0]['id'] == by_code[0]['id'], '')
        logout(page)

        # 5. refuzurile: mesajul, adresa curățată, fără sesiune
        via_google(page, URL, FAKE, 'renunt@exemplu.test', allow=False)
        shown, url_after = message(page), page.url
        page.reload(); page.wait_for_load_state('networkidle'); page.wait_for_timeout(500)
        res.check('GU-10 „Refuză” la furnizor: mesajul de renunțare; adresa este curățată la `/#sesizari`; fără cont, fără sesiune; mesajul nu reapare la reîncărcare',
                  shown == TEXTS['anulat'] and url_after == URL + '/#sesizari' and not accounts('renunt@exemplu.test')
                  and page.locator(BAR).count() == 0 and page.locator('[data-testid=citizen-login]').count() == 1 and message(page) == '', f'{shown!r} {url_after}')
        via_google(page, URL, FAKE, 'neverificat@exemplu.test', verified=False)
        shown, url_after = message(page), page.url
        page.click(GOOGLE); page.wait_for_timeout(400)  # o încercare nouă (aici: fără bifă) ascunde mesajul vechi
        res.check('GU-11 adresă neverificată la furnizor: mesajul de eroare; fără cont, fără sesiune; mesajul dispare la o încercare nouă',
                  shown == TEXTS['eroare'] and url_after == URL + '/#sesizari' and not accounts('neverificat@exemplu.test')
                  and page.locator(BAR).count() == 0 and message(page) == '', f'{shown!r}')

        # 6. blocare definitivă rămasă fără cont (§9.5): cont prin cod → blocat de super_admin → contul șters de titular
        eva = 'eva.blocata@exemplu.test'
        bctx = b.new_context()
        citizen_login_api(bctx, URL, eva)
        actx = b.new_context(); apage = actx.new_page()
        admin_login(apage, URL, BACKEND, BACKEND['admin'])
        blocked = actx.request.post(URL + f"/api/v1/admin/citizens/{accounts(eva)[0]['id']}/blocks", headers=CSRF, data={'kind': 'permanent'})
        deleted = bctx.request.delete(URL + '/api/v1/citizen/account', headers=CSRF)
        orphan = db_query("SELECT COUNT(*) AS n FROM citizen_blocks WHERE kind = 'permanent' AND account_id IS NULL")[0]['n']
        via_google(page, URL, FAKE, eva)
        shown = message(page)
        res.check('GU-12 adresă cu blocare definitivă și fără cont: mesajul „nu mai poate fi folosită”; nu se creează cont (§9.5)',
                  blocked.status == 201 and deleted.status == 204 and orphan == 1 and shown == TEXTS['blocat'] and not accounts(eva)
                  and page.url == URL + '/#sesizari' and page.locator(BAR).count() == 0, f'{blocked.status} {deleted.status} {orphan} {shown!r}')
        actx.close(); bctx.close()

        # 7. motivele din adresă, fără furnizor: limita și un motiv necunoscut
        page.goto(URL + '/#sesizari?google=limita'); page.reload(); page.wait_for_load_state('networkidle'); page.wait_for_timeout(500)
        limit_text, limit_url = message(page), page.url
        page.goto(URL + '/#sesizari?google=altceva'); page.reload(); page.wait_for_load_state('networkidle'); page.wait_for_timeout(500)
        res.check('GU-13 `?google=limita` → mesajul limitei; un motiv necunoscut → niciun mesaj; în ambele cazuri adresa este curățată',
                  limit_text == TEXTS['limita'] and limit_url == URL + '/#sesizari' and message(page) == '' and page.url == URL + '/#sesizari',
                  f'{limit_text!r} {limit_url} {page.url}')

        # 8. pornirea refuzată de server (aici: simulată în browser): mesaj sub buton, pagina rămâne, butonul rămâne utilizabil
        def refuse(route):
            route.fulfill(status=429, content_type='application/json',
                          body=json.dumps({'error': {'code': 'RATE_LIMITED', 'message': 'Prea multe cereri. Reveniți mai târziu.'}}))
        ctx.route('**/api/v1/citizen/auth/google/start', refuse)
        open_login(page, URL)
        page.check(POLICY); page.click(GOOGLE); page.wait_for_timeout(700)
        alert = page.locator('[data-testid=citizen-google-error]')
        res.check('GU-14 pornirea refuzată (429): mesajul serverului sub buton; pagina rămâne; butonul nu rămâne blocat',
                  alert.count() == 1 and 'Prea multe cereri' in alert.inner_text() and page.url.startswith(URL)
                  and page.locator(GOOGLE).is_enabled(), '')
        ctx.unroute('**/api/v1/citizen/auth/google/start')

        # 9. codul pe e-mail rămâne disponibil, pe același ecran
        ion = 'ion.cod@exemplu.test'
        open_login(page, URL)
        page.check(POLICY); page.fill('#citizen-email', ion); page.click(CODE_BUTTON); page.wait_for_timeout(700)
        page.fill('#citizen-code', citizen_code(ion)); page.click('text=Confirmă codul'); page.wait_for_timeout(1200)
        res.check('GU-15 cu Google configurat, codul pe e-mail funcționează ca înainte (a doua variantă)',
                  page.locator(BAR).count() == 1 and ion in page.inner_text(BAR) and len(accounts(ion)) == 1, '')

        leaked = db_query("SELECT COUNT(*) AS n FROM citizen_oauth_attempts WHERE consumed_at IS NULL AND expires_at > NOW(3)")[0]['n']
        res.check('GU-16 nicio încercare OAuth nefolosită nu a rămas după scenarii (fiecare pornire a fost urmată de întoarcere)', leaked == 0, f'{leaked}')
    except Exception as exc:  # orice excepție = FAIL raportat, nu oprire fără rezumat
        res.check('EXCEPTIE în scenariul B', False, repr(exc)[:300])
    b.close()

res.check('JS fără erori în pagini', not errors, '; '.join(errors)[:300])
ok = res.report()
sys.exit(0 if ok else 1)
