"""ETAPA 6.6 — regresie compacta 6.1-6.5 (scripturile originale nu exista in repository; suita e rescrisa)."""
import sys; sys.dont_write_bytecode = True
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
import subprocess, harness
from harness import *

res = Results('E66 REGRESIE 6.1-6.5')
creds = dev_users()  # Faza 5.2: utilizatori sintetici, fără parole (B10 §4)
ADMIN, OP = 'admin@turnumagurele.ro', 'operator@turnumagurele.ro'
LOGIN = "const login = (e) => { authService.setUserForDevTests(null); authService.setUserForDevTests(arg.creds[e]); if (!authService.getCurrentUser()) throw new Error('login'); };"
SUB = "const sub = (d, pref) => reportService.submitReport({ categoryId: 'drumuri', categoryName: 'Drumuri', description: d, photos: [], location: { addressOrDetails: 'Str. R', latitude: 43.75, longitude: 24.87, source: 'manual' }, publicationPreference: pref || 'public' });"

with dev_server(), sync_playwright() as pw:
    browser, page, errors = new_page(pw, storage={})
    A = {'creds': creds, 'admin': ADMIN, 'op': OP}

    # 6.1
    r61 = run_js(page, LOGIN + SUB + """
      const names = Object.getOwnPropertyNames(Object.getPrototypeOf(reportService));
      const c0 = reportService.getCurrentCounter(); const r = sub('x'); const c1 = reportService.getCurrentCounter();
      return { del: names.filter(n => /delete|remove/i.test(n)), c0, c1, ref: r.report.referenceNumber };
    """, A)
    res.check('R6.1 nicio metoda de stergere a sesizarilor; contor TM strict crescator', r61['del'] == [] and r61['c1'] == r61['c0'] + 1, json.dumps(r61))

    # 6.2
    r62 = run_js(page, LOGIN + SUB + """
      const c0 = reportService.getCurrentCounter(); const n0 = reportService.getAllReports().length; const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function () { throw new DOMException('full', 'QuotaExceededError'); };
      let r; try { r = sub('quota'); } finally { Storage.prototype.setItem = orig; }
      return { r, c: reportService.getCurrentCounter() === c0, n: reportService.getAllReports().length === n0 };
    """, A)
    res.check('R6.2 cota depasita la trimitere: esec explicit, contor si lista neschimbate', r62['r'] == {'success': False, 'reason': 'quota_exceeded'} and r62['c'] and r62['n'], json.dumps(r62))

    # 6.3 — XSS pe harta (valori escapate, inclusiv noua linie de asumare)
    run_js(page, LOGIN + SUB + """
      const r = sub('<img src=x onerror="window.__xss=1">', 'public'); login(arg.admin); reportService.updateModerationStatus(r.report.id, 'approved');
      reportService.assumeReport(r.report.id); authService.setUserForDevTests(null); return r.report.referenceNumber;
    """, A)
    page.goto(BASE + '/#harta'); page.wait_for_load_state('networkidle'); page.wait_for_timeout(700)
    markers = page.locator('.custom-civic-marker')
    for i in range(markers.count()):
        markers.nth(i).click(force=True); page.wait_for_timeout(150)
    injected = page.evaluate("document.querySelectorAll('.leaflet-pane img[src=\"x\"]').length")
    xss = page.evaluate('window.__xss === 1')
    res.check('R6.3 XSS: payload afisat ca text, niciun <img src=x>, nicio executie', injected == 0 and not xss, f'img={injected} exec={xss}')

    # 6.4
    page.goto(BASE + '/#admin'); page.wait_for_load_state('networkidle')
    body = page.inner_text('body')
    res.check('R6.4a fara login DEMO si fara credentiale afisate', 'DEMO' not in body.upper().replace('DEMONSTR', '') and all(u['email'] not in body for u in creds.values()) and 'password ===' not in open(os.path.join(REPO, 'src/services/authService.ts'), encoding='utf-8').read(), '')
    forged_bad = run_js(page, "localStorage.setItem('turnu_civic_admin_session', JSON.stringify({ role: 'super_admin' })); return 1;")
    page.reload(); page.wait_for_load_state('networkidle')
    r64 = run_js(page, "return { user: authService.getCurrentUser(), stored: localStorage.getItem('turnu_civic_admin_session') };")
    res.check('R6.4b sesiune cu forma invalida: respinsa si stearsa', r64 == {'user': None, 'stored': None}, json.dumps(r64))

    # 6D-SES-01 (P7) — limitare cunoscuta, trebuie sa ramana documentata (nu se repara in 6.6)
    run_js(page, "localStorage.setItem('turnu_civic_admin_session', JSON.stringify({ id: 'usr-fals', email: 'x@y.z', name: 'Fals', role: 'super_admin', lastLogin: '' })); return 1;")
    page.reload(); page.wait_for_load_state('networkidle')
    p7 = run_js(page, SUB + "const id = sub('p7').report.id; const r = reportService.assumeReport(id); const leak = JSON.stringify(reportService.getPublicMapReports()).includes('usr-fals') || JSON.stringify(reportService.getPublicMapReports()).includes('Fals'); authService.setUserForDevTests(null); return { can: r.success, pub: leak ? 'LEAK' : null };")
    res.check('R6D-SES-01 (P7) ramane limitare: sesiune falsificata valida structural este acceptata [FAIL asteptat, neschimbat]', not p7['can'], json.dumps(p7))
    res.check('R6.6-P7 ID-ul/numele sesiunii falsificate nu apar in modelul public', p7['pub'] is None, json.dumps(p7))

    # 6.5 — garzi in servicii: 3 roluri x operatii reprezentative
    r65 = run_js(page, LOGIN + """
      const out = {};
      const svc = {
        announcements: (await import(loaded('announcementService'))).announcementService,
        directory: (await import(loaded('directoryService'))).directoryService,
        quickDial: (await import(loaded('quickDialService'))).quickDialService,
        survey: (await import(loaded('surveyService'))).surveyService,
      };
      for (const who of [null, arg.op, arg.admin]) {
        authService.setUserForDevTests(null); if (who) login(who);
        const rid = reportService.getAllReports()[0].id;
        const before = localStorage.getItem('turnu_civic_city_hall_directory');
        out[who || 'public'] = {
          moderate: reportService.updateModerationStatus(rid, reportService.getReportById(rid).moderationStatus),
          resolve: reportService.updateResolutionStatus(rid, reportService.getResolutionStatus(reportService.getReportById(rid))),
          dirReset: svc.directory.resetToDemo(),
          qdReset: svc.quickDial.resetToDemo(),
          surveyReset: svc.survey.resetToDemo(),
          annReset: svc.announcements.resetToDemo(),
        };
      }
      authService.setUserForDevTests(null); return out;
    """, A)
    exp = {'public': dict(moderate=False, resolve=False, dirReset=False, qdReset=False, surveyReset=False, annReset=False),
           OP: dict(moderate=True, resolve=True, dirReset=False, qdReset=False, surveyReset=False, annReset=True),
           ADMIN: dict(moderate=True, resolve=True, dirReset=True, qdReset=True, surveyReset=True, annReset=True)}
    res.check('R6.5a garzi servicii conforme matricei (public / operator / super_admin)', r65 == exp, json.dumps(r65))

    pubm = run_js(page, "const p = reportService.getPublicMapReports(); return { keys: [...new Set(p.flatMap(x => Object.keys(x)))].sort(), photoKeys: [...new Set(p.flatMap(x => x.photo ? Object.keys(x.photo) : []))].sort() };")
    res.check('R6.5b PublicMapReport fara id si photo.name (plus publicAssumption optional)', 'id' not in pubm['keys'] and 'name' not in pubm['photoKeys'], json.dumps(pubm))

    page.goto(BASE + '/#sesizari'); page.wait_for_load_state('networkidle')
    body = page.inner_text('body')
    res.check('R6.5c zona publica fara lista „Evidență Locală”', 'Evidență Locală' not in body, '')
    ann = run_js(page, "const a = (await import(loaded('announcementService'))).announcementService; return typeof a.getPublicById;")
    res.check('R6.5d getPublicById exista', ann == 'function', ann)

    res.check('R fara erori JS', not errors, '; '.join(errors))
    browser.close()

ok = res.report()
sys.exit(0 if ok else 1)
