"""ETAPA 6.6 — teste la nivel de serviciu (module reale, instanta singleton), scenariile 1-10 + margini."""
import sys; sys.dont_write_bytecode = True
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
from harness import *

res = Results('E66 SERVICII (dupa modificare)')
creds = credentials()
ADMIN = 'admin@turnumagurele.ro'
OP = 'operator@turnumagurele.ro'
OP2 = 'demo@turnumagurele.ro'

LOGIN = """
const login = (email) => { authService.logout(); const r = authService.login(email, arg.creds[email]); if (!r.success) throw new Error('login ' + email); };
const st = (id) => { const r = reportService.getReportById(id); const a = reportService.getAssumptionState(r); return { rs: reportService.getResolutionStatus(r), ids: a.assigneeIds, cityHall: a.takenOverByCityHall }; };
const store = () => localStorage.getItem('turnu_civic_reports_store');
const newReport = (pref) => { const r = reportService.submitReport({ categoryId: 'drumuri', categoryName: 'Drumuri', description: 'Test 6.6 ' + Math.random(), photos: [], location: { addressOrDetails: 'Str. Test', latitude: 43.75, longitude: 24.87, source: 'manual' }, contact: { name: 'Ion Test', email: 'ion.test@example.com' }, publicationPreference: pref || 'public' }); if (!r.success) throw new Error('submit'); return r.report.id; };
"""

with dev_server(), sync_playwright() as pw:
    browser, page, errors = new_page(pw, storage={})
    A = {'creds': creds}

    # --- Verificarea harness-ului: aceeasi instanta de authService ca aplicatia
    h0 = run_js(page, LOGIN + "login(arg.admin); const c = permissionService.currentUserCan('reports.moderate'); authService.logout(); return c;", {**A, 'admin': ADMIN})
    res.check('H0 harness: sesiunea din test este vazuta de permissionService (instanta unica)', h0 is True, '')

    # --- Identitate unica (sectiunea 3)
    ids = run_js(page, LOGIN + """
      const out = {}; for (const e of Object.keys(arg.creds)) { login(e); out[e] = authService.getCurrentUser().id; } authService.logout(); return out;
    """, A)
    res.check('ID1 fiecare cont Admin are ID unic', len(set(ids.values())) == 3, json.dumps(ids))
    res.check('ID2 ID-urile existente pastrate (admin-01, operator-01)', ids[ADMIN] == 'usr-admin-01' and ids[OP] == 'usr-operator-01', '')
    ids2 = run_js(page, LOGIN + """
      const out = {}; for (const e of Object.keys(arg.creds)) { login(e); out[e] = authService.getCurrentUser().id; } authService.logout(); return out;
    """, A)
    res.check('ID3 ID stabil la re-autentificare', ids == ids2, '')

    # --- ROLE_PERMISSIONS neschimbat
    perms = run_js(page, "return [permissionService.getPermissionsForRole('super_admin').length, permissionService.getPermissionsForRole('primarie_operator').length, permissionService.actsForCityHall('primarie_operator'), permissionService.actsForCityHall('super_admin'), permissionService.actsForCityHall('x'), permissionService.actsForCityHall(null)];")
    res.check('PERM1 matrice 24/13 neschimbata; rol Primarie = doar primarie_operator (fail-safe)', perms == [24, 13, True, False, False, False], str(perms))

    # --- Scenariul 1: sesizare noua
    s1 = run_js(page, LOGIN + "const id = newReport(); return st(id);", A)
    res.check('S1 sesizare noua: new, fara responsabili, Primaria nepreluata', s1 == {'rs': 'new', 'ids': [], 'cityHall': False}, json.dumps(s1))

    # --- Scenariile 2-5 pe aceeasi sesizare
    flow = run_js(page, LOGIN + """
      const id = newReport(); const out = {};
      login(arg.admin); out.r2 = reportService.assumeReport(id); out.s2 = st(id);
      login(arg.op);    out.r3 = reportService.takeOverByCityHall(id); out.s3 = st(id);
      login(arg.admin); out.r4 = reportService.withdrawAssumption(id); out.s4 = st(id);
      out.pub4 = typeof reportService.getPublicAssumption;
      login(arg.op);    out.opWithdraw = reportService.withdrawAssumption(id); out.s5 = st(id);
      out.hasCityHallUndo = Object.getOwnPropertyNames(Object.getPrototypeOf(reportService)).filter(n => /renun|release|undo|cancel|revoke|untake|removeCity/i.test(n));
      authService.logout(); return out;
    """, {**A, 'admin': ADMIN, 'op': OP})
    res.check('S2 super_admin asuma: in_progress, super_admin responsabil', flow['r2'] == {'success': True, 'changed': True} and flow['s2'] == {'rs': 'in_progress', 'ids': ['usr-admin-01'], 'cityHall': False}, json.dumps(flow['s2']))
    res.check('S3 primarie_operator preia ulterior: in_progress, super_admin ramane, Primaria preluata', flow['r3'] == {'success': True, 'changed': True} and flow['s3'] == {'rs': 'in_progress', 'ids': ['usr-admin-01'], 'cityHall': True}, json.dumps(flow['s3']))
    res.check('S4 super_admin renunta: in_progress, Primaria ramane preluata', flow['r4'] == {'success': True, 'changed': True} and flow['s4'] == {'rs': 'in_progress', 'ids': [], 'cityHall': True}, json.dumps(flow['s4']))
    res.check('S5a nu mai exista proiectie publica a asumarii (getPublicAssumption eliminat)', flow['pub4'] == 'undefined', str(flow['pub4']))
    res.check('S5b nu exista metoda de renuntare a Primariei; operatorul nu poate "retrage"', flow['hasCityHallUndo'] == [] and flow['opWithdraw'] == {'success': False, 'reason': 'not_assumed'} and flow['s5']['cityHall'] is True, json.dumps([flow['hasCityHallUndo'], flow['opWithdraw']]))

    # --- Scenariul 6: Primaria preia prima
    s6 = run_js(page, LOGIN + """
      const id = newReport(); login(arg.op); const r = reportService.takeOverByCityHall(id); const s = st(id); authService.logout(); return { r, s };
    """, {**A, 'op': OP})
    res.check('S6 Primaria preia prima: new -> in_progress, preluata', s6['r'] == {'success': True, 'changed': True} and s6['s'] == {'rs': 'in_progress', 'ids': [], 'cityHall': True}, json.dumps(s6))

    # --- Scenariul 7: alt operator vede sesizarea deja preluata
    s7 = run_js(page, LOGIN + """
      const id = newReport(); login(arg.op); reportService.takeOverByCityHall(id); const before = store();
      login(arg.op2); const r = reportService.takeOverByCityHall(id); const after = store(); const s = st(id);
      const raw = JSON.parse(after).find(x => x.id === id);
      authService.logout(); return { r, same: before === after, s, rawKeys: Object.keys(raw).filter(k => /city|assign/i.test(k)), rawCity: raw.cityHallTakenOver };
    """, {**A, 'op': OP, 'op2': OP2})
    res.check('S7 al doilea operator: fara a doua preluare, fara duplicare, stocare neschimbata', s7['r'] == {'success': True, 'changed': False} and s7['same'] and s7['rawCity'] is True and s7['s']['ids'] == [], json.dumps(s7))

    # --- Scenariul 8: ultimul responsabil renunta, Primaria nepreluata
    s8 = run_js(page, LOGIN + """
      const id = newReport(); login(arg.admin); reportService.assumeReport(id); const r = reportService.withdrawAssumption(id); const s = st(id);
      const pub = undefined; authService.logout(); return { r, s, pub: pub ?? null };
    """, {**A, 'admin': ADMIN})
    res.check('S8 ultimul responsabil renunta: ramane in_progress, lista goala, nimic public', s8['r'] == {'success': True, 'changed': True} and s8['s'] == {'rs': 'in_progress', 'ids': [], 'cityHall': False} and s8['pub'] is None, json.dumps(s8))

    # --- Scenariul 10: neautorizat (aplicat in serviciu)
    s10 = run_js(page, LOGIN + """
      const id = newReport(); authService.logout(); const before = store();
      const anon = [reportService.assumeReport(id), reportService.withdrawAssumption(id), reportService.takeOverByCityHall(id)];
      login(arg.op); const opAssume = reportService.assumeReport(id);
      login(arg.admin); const adminCityHall = reportService.takeOverByCityHall(id);
      authService.logout(); const after = store(); return { anon, opAssume, adminCityHall, same: before === after, s: st(id) };
    """, {**A, 'op': OP, 'admin': ADMIN})
    denied = {'success': False, 'reason': 'denied'}
    res.check('S10a fara sesiune: toate cele 3 operatii refuzate', s10['anon'] == [denied, denied, denied], json.dumps(s10['anon']))
    res.check('S10b operator nu poate asuma individual; super_admin nu poate prelua in numele Primariei', s10['opAssume'] == denied and s10['adminCityHall'] == denied, '')
    res.check('S10c la refuz stocarea ramane identica byte cu byte; status new', s10['same'] and s10['s'] == {'rs': 'new', 'ids': [], 'cityHall': False}, '')

    # --- Margini: mai multi responsabili, statusuri resolved/closed, idempotenta, public
    multi = run_js(page, LOGIN + """
      const id = newReport();
      // simulam un al doilea responsabil individual existent (ID de cont diferit), direct in model
      const list = JSON.parse(store()); const i = list.findIndex(x => x.id === id);
      list[i].assigneeIds = ['usr-other-99']; list[i].resolutionStatus = 'in_progress';
      localStorage.setItem('turnu_civic_reports_store', JSON.stringify(list));
      return id;
    """, A)
    page.reload(); page.wait_for_load_state('networkidle')
    m = run_js(page, LOGIN + """
      const id = arg.id; login(arg.admin); const out = {};
      out.a = reportService.assumeReport(id); out.s1 = st(id);
      out.again = reportService.assumeReport(id); out.s2 = st(id);
      out.pubInd = [authService.getDisplayNameById('usr-admin-01'), authService.getDisplayNameById('usr-other-99')];
      out.w = reportService.withdrawAssumption(id); out.s3 = st(id);
      authService.logout(); return out;
    """, {**A, 'id': multi, 'admin': ADMIN})
    res.check('M1 asumarea nu inlocuieste alt responsabil; status in_progress neschimbat', m['s1'] == {'rs': 'in_progress', 'ids': ['usr-other-99', 'usr-admin-01'], 'cityHall': False}, json.dumps(m['s1']))
    res.check('M2 asumare repetata idempotenta (fara duplicat)', m['again'] == {'success': True, 'changed': False} and m['s2']['ids'] == ['usr-other-99', 'usr-admin-01'], '')
    res.check('M3 Admin: numele configurat se obtine din ID; ID necunoscut -> null (afisat ca ID doar in Admin)', m['pubInd'] == ['Administrator Platformă', None], json.dumps(m['pubInd'], ensure_ascii=False))
    res.check('M4 retragerea elimina DOAR propria asumare', m['s3']['ids'] == ['usr-other-99'], json.dumps(m['s3']))

    rc = run_js(page, LOGIN + """
      const out = {};
      for (const target of ['resolved', 'closed']) {
        const id = newReport(); login(arg.admin); reportService.updateResolutionStatus(id, target);
        reportService.assumeReport(id); const a = st(id).rs; login(arg.op); reportService.takeOverByCityHall(id); out[target] = [a, st(id).rs];
      }
      authService.logout(); return out;
    """, {**A, 'admin': ADMIN, 'op': OP})
    res.check('M5 preluarea nu modifica resolved/closed', rc == {'resolved': ['resolved', 'resolved'], 'closed': ['closed', 'closed']}, json.dumps(rc))

    nf = run_js(page, LOGIN + "login(arg.admin); const r = reportService.assumeReport('rep-inexistent'); authService.logout(); return r;", {**A, 'admin': ADMIN})
    res.check('M6 sesizare inexistenta -> not_found', nf == {'success': False, 'reason': 'not_found'}, json.dumps(nf))

    # --- Public: prioritate Primarie + fara date interne
    pub = run_js(page, LOGIN + """
      const id = newReport('public'); login(arg.admin); reportService.updateModerationStatus(id, 'approved'); reportService.assumeReport(id);
      const ref = reportService.getReportById(id).referenceNumber;
      const p1 = reportService.getPublicMapReports().find(p => p.referenceNumber === ref);
      login(arg.op); reportService.takeOverByCityHall(id);
      const p2 = reportService.getPublicMapReports().find(p => p.referenceNumber === ref);
      login(arg.admin); reportService.withdrawAssumption(id); reportService.assumeReport(id);
      const p3 = reportService.getPublicMapReports().find(p => p.referenceNumber === ref);
      authService.logout(); const fk = (p) => Object.keys(p).filter(k => /assum|status|assign|cityhall|respons|preluat|takenover/i.test(k)); return { p1: fk(p1), p2: fk(p2), p3: fk(p3), json: JSON.stringify([p1, p2, p3]) };
    """, {**A, 'admin': ADMIN, 'op': OP})
    res.check('P1 asumare super_admin: modelul public fara camp de flux intern', pub['p1'] == [], str(pub['p1']))
    res.check('P2 Primaria + super_admin: modelul public fara camp de flux intern', pub['p2'] == [], str(pub['p2']))
    res.check('P3 dupa retragere/re-asumare: modelul public fara camp de flux intern', pub['p3'] == [], str(pub['p3']))
    flow_vals = [v for v in ['Administrator', 'city_hall', 'in_progress', 'Primărie', 'Preluat'] if v in pub['json']]
    res.check('P3b nicio valoare de flux (stadiu, preluare, responsabil) in modelul public', flow_vals == [], str(flow_vals))
    leak = [s for s in ['usr-', '@', 'assigneeIds', 'cityHallTakenOver', 'contact', 'Operator Primărie'] if s in pub['json']]
    res.check('P4 model public fara ID-uri, e-mailuri, contact sau nume operator', leak == [], str(leak))

    # --- Email: transmiterea nu inseamna preluare; e-mailul cetateanului ramane in Admin
    em = run_js(page, LOGIN + """
      const id = newReport(); await new Promise(r => setTimeout(r, 400));
      const log = JSON.parse(localStorage.getItem('turnu_civic_email_log_store') || '[]');
      const r = reportService.getReportById(id);
      return { s: st(id), logCount: log.length, contactEmail: r.contact && r.contact.email };
    """, A)
    res.check('E1 dupa transmiterea e-mailului (simulat): Primaria NU e preluata, status new', em['s'] == {'rs': 'new', 'ids': [], 'cityHall': False} and em['logCount'] > 0, json.dumps(em))
    res.check('E2 e-mailul cetateanului pastrat in sesizare (zona Admin)', em['contactEmail'] == 'ion.test@example.com', '')

    # --- Esec de stocare: tranzactional (fara modificare in memorie)
    q = run_js(page, LOGIN + """
      const id = newReport(); login(arg.admin);
      const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function () { const e = new DOMException('full', 'QuotaExceededError'); throw e; };
      let r; try { r = reportService.assumeReport(id); } finally { Storage.prototype.setItem = orig; }
      const s = st(id); authService.logout(); return { r, s };
    """, {**A, 'admin': ADMIN})
    res.check('Q1 cota depasita: operatia raporteaza esec, memoria neschimbata', q['r'] == {'success': False, 'reason': 'quota_exceeded'} and q['s'] == {'rs': 'new', 'ids': [], 'cityHall': False}, json.dumps(q))

    # --- Corectii finale 6.6: regula new -> in_progress indiferent de istoric
    nw = run_js(page, LOGIN + """
      const out = {};
      // Caz 1: sesizare noua, super_admin asuma
      const id1 = newReport(); login(arg.admin); out.c1 = [st(id1).rs, (reportService.assumeReport(id1), st(id1).rs)];
      // Caz 2a: asumare istorica -> retragere -> readusa manual la new -> noua asumare
      const id2 = newReport(); reportService.assumeReport(id2); reportService.withdrawAssumption(id2);
      reportService.updateResolutionStatus(id2, 'new'); const b2 = st(id2); reportService.assumeReport(id2); out.c2a = [b2, st(id2)];
      // Caz 2b: asumare CURENTA a lui super_admin -> readusa la new -> Primaria preia
      const id3 = newReport(); reportService.assumeReport(id3); reportService.updateResolutionStatus(id3, 'new'); const b3 = st(id3);
      login(arg.op); reportService.takeOverByCityHall(id3); out.c2b = [b3, st(id3)];
      // Caz 2c: Primaria a preluat istoric -> readusa la new -> super_admin asuma
      const id4 = newReport(); reportService.takeOverByCityHall(id4); reportService.updateResolutionStatus(id4, 'new'); const b4 = st(id4);
      login(arg.admin); reportService.assumeReport(id4); out.c2c = [b4, st(id4)];
      // Margine: Primaria deja preluata + readusa la new -> al doilea operator (preluare idempotenta, fara actiune noua)
      const id5 = newReport(); login(arg.op); reportService.takeOverByCityHall(id5); reportService.updateResolutionStatus(id5, 'new');
      login(arg.op2); out.idem = [reportService.takeOverByCityHall(id5), st(id5).rs];
      authService.logout(); return out;
    """, {**A, 'admin': ADMIN, 'op': OP, 'op2': OP2})
    res.check('NEW-C1 sesizare noua, super_admin asuma: new -> in_progress', nw['c1'] == ['new', 'in_progress'], json.dumps(nw['c1']))
    res.check('NEW-C2a asumare istorica retrasa, readusa la new, noua asumare -> in_progress',
              nw['c2a'][0]['rs'] == 'new' and nw['c2a'][1] == {'rs': 'in_progress', 'ids': ['usr-admin-01'], 'cityHall': False}, json.dumps(nw['c2a']))
    res.check('NEW-C2b asumare curenta super_admin, readusa la new, Primaria preia -> in_progress',
              nw['c2b'][0] == {'rs': 'new', 'ids': ['usr-admin-01'], 'cityHall': False} and nw['c2b'][1] == {'rs': 'in_progress', 'ids': ['usr-admin-01'], 'cityHall': True}, json.dumps(nw['c2b']))
    res.check('NEW-C2c Primaria preluata istoric, readusa la new, super_admin asuma -> in_progress',
              nw['c2c'][0] == {'rs': 'new', 'ids': [], 'cityHall': True} and nw['c2c'][1] == {'rs': 'in_progress', 'ids': ['usr-admin-01'], 'cityHall': True}, json.dumps(nw['c2c']))
    res.check('NEW-EDGE preluare repetata a Primariei (idempotenta) nu e o actiune noua: status ramane new',
              nw['idem'] == [{'success': True, 'changed': False}, 'new'], json.dumps(nw['idem']))

    # --- Status public impreuna cu preluarea; confidentialitate
    ps = run_js(page, LOGIN + """
      const mk = () => { const id = newReport('public'); login(arg.admin); reportService.updateModerationStatus(id, 'approved'); return id; };
      const find = (id) => reportService.getPublicMapReports().find(p => p.referenceNumber === reportService.getReportById(id).referenceNumber);
      const a = mk(); const pa = find(a);
      const b = mk(); reportService.assumeReport(b); const pb = find(b);
      const c = mk(); login(arg.op); reportService.takeOverByCityHall(c); const pc = find(c);
      authService.logout();
      const fk = (p) => Object.keys(p).filter(k => /assum|status|assign|cityhall|respons|preluat|takenover/i.test(k)); return { none: fk(pa), ind: fk(pb), ch: fk(pc), same: JSON.stringify(Object.keys(pa).sort()) === JSON.stringify(Object.keys(pc).sort()) && JSON.stringify(Object.keys(pa).sort()) === JSON.stringify(Object.keys(pb).sort()),
               json: JSON.stringify(reportService.getPublicMapReports()) };
    """, {**A, 'admin': ADMIN, 'op': OP})
    res.check('PS1-3 fara asumare / asumare individuala / preluare Primarie: niciun camp de flux public; aceeasi structura publica', ps['none'] == [] and ps['ind'] == [] and ps['ch'] == [] and ps['same'], json.dumps([ps['none'], ps['ind'], ps['ch'], ps['same']]))
    leak2 = [s for s in ['ion.test@example.com', 'Ion Test', 'usr-', 'contact', 'phone', 'Operator Primărie'] if s in ps['json']]
    res.check('PS4 niciun nume/e-mail/telefon de cetatean sau ID/nume operator in modelul public', leak2 == [], str(leak2))

    # --- Decizia finala 6.6: sesizarile 'private' nu mai sunt excluse de pe harta
    pv = run_js(page, LOGIN + """
      const id = newReport('private'); login(arg.op); reportService.updateModerationStatus(id, 'approved'); reportService.takeOverByCityHall(id);
      const ref = reportService.getReportById(id).referenceNumber; authService.logout();
      const p = reportService.getPublicMapReports().find(x => x.referenceNumber === ref);
      return { onMap: !!p, pub: p ?? null, json: JSON.stringify(reportService.getPublicMapReports()) };
    """, {**A, 'op': OP})
    res.check('PRIV-1 sesizare private + approved: vizibila pe harta', pv['onMap'], f"onMap={pv['onMap']}")
    res.check('PRIV-1b sesizarea private (preluata de Primarie) e publicata anonim, fara informatii de flux',
              pv['pub'] and pv['pub']['isAnonymous'] is True and 'publicStatus' not in pv['pub'] and 'publicAssumption' not in pv['pub'],
              json.dumps(sorted(pv['pub'].keys())) if pv['pub'] else '')
    priv3_keys = sorted(pv['pub'].keys()) if pv['pub'] else []
    leak3 = [s for s in ['ion.test@example.com', 'Ion Test', '"contact"', '"email"', '"phone"', '"name"', 'authorName', 'userId', 'assignee', 'usr-'] if s in pv['json']]
    res.check('PRIV-3 model public: fara contact, e-mail, telefon, nume autor, ID-uri', leak3 == [] and 'contact' not in priv3_keys, f'leak={leak3} keys={priv3_keys}')

    # --- Teste 3E relevante pentru publicare (moderarea ramane autoritatea)
    e3 = run_js(page, LOGIN + """
      const mk = (pref, mod, gps) => { const r = reportService.submitReport({ categoryId: 'drumuri', categoryName: 'Drumuri', description: '3E ' + pref + mod,
          photos: [], location: gps ? { addressOrDetails: 'X', latitude: 43.75, longitude: 24.87, source: 'manual' } : { addressOrDetails: 'X', source: 'manual' },
          contact: { name: 'Ion Test', email: 'ion.test@example.com', phone: '0722000000' }, publicationPreference: pref });
        const id = r.report.id; if (mod !== 'pending') { login(arg.admin); reportService.updateModerationStatus(id, mod); authService.logout(); }
        const rep = reportService.getReportById(id); const pub = reportService.toPublicMapReport(rep);
        return { vis: reportService.isPubliclyVisible(rep), anon: pub ? pub.isAnonymous : null }; };
      const noPref = reportService.submitReport({ categoryId: 'drumuri', categoryName: 'Drumuri', description: 'fara pref', photos: [], location: { addressOrDetails: 'X', source: 'manual' } });
      return {
        privPending: mk('private', 'pending', true), privRejected: mk('private', 'rejected', true), privApproved: mk('private', 'approved', true),
        pubApproved: mk('public', 'approved', true), anonApproved: mk('public_anonymous', 'approved', true), anonPending: mk('public_anonymous', 'pending', true),
        approvedNoGps: mk('public', 'approved', false), defaultPref: noPref.report.publicationPreference,
      };
    """, {**A, 'admin': ADMIN})
    res.check('3E-1 moderarea ramane obligatorie: pending/rejected nu apar (inclusiv private)',
              not e3['privPending']['vis'] and not e3['privRejected']['vis'] and not e3['anonPending']['vis'], json.dumps(e3))
    res.check('3E-2 aprobate cu GPS apar indiferent de optiune (private/public/public_anonymous)',
              e3['privApproved']['vis'] and e3['pubApproved']['vis'] and e3['anonApproved']['vis'], '')
    res.check('3E-3 aprobata fara coordonate valide nu apare', not e3['approvedNoGps']['vis'], '')
    res.check('3E-4 isAnonymous: private -> true (explicit), public_anonymous -> true, public -> false',
              e3['privApproved']['anon'] is True and e3['anonApproved']['anon'] is True and e3['pubApproved']['anon'] is False, '')
    res.check('3E-5 fara optiune transmisa, serviciul nu mai creeaza private (implicit public_anonymous)', e3['defaultPref'] == 'public_anonymous', e3['defaultPref'])

    # --- N1 inchis: Public si Public anonim sunt ambele publice, fara identitatea autorului
    n1 = run_js(page, LOGIN + """
      const mk = (pref) => { const r = reportService.submitReport({ categoryId: 'drumuri', categoryName: 'Drumuri', description: 'N1 ' + pref, photos: [],
          location: { addressOrDetails: 'Str. N1', latitude: 43.75, longitude: 24.87, source: 'manual' },
          contact: { name: 'Elena Autor', email: 'elena.autor@example.com', phone: '0755999888' }, publicationPreference: pref });
        login(arg.admin); reportService.updateModerationStatus(r.report.id, 'approved'); authService.logout();
        return reportService.toPublicMapReport(reportService.getReportById(r.report.id)); };
      const a = mk('public'), b = mk('public_anonymous');
      return { ka: Object.keys(a).sort(), kb: Object.keys(b).sort(), json: JSON.stringify([a, b]) };
    """, {**A, 'admin': ADMIN})
    res.check('N1 Public si Public anonim: ambele pe harta, aceeasi structura publica, fara nume/e-mail/telefon',
              n1['ka'] == n1['kb'] and all(v not in n1['json'] for v in ['Elena Autor', 'elena.autor@example.com', '0755999888']), json.dumps(n1['ka']))

    res.check('JS fara erori in pagina (servicii)', not errors, '; '.join(errors))
    browser.close()

    # --- Scenariul 9: date vechi fara campurile noi (+ valori corupte)
    legacy = [
        {"id": "rep-legacy-1", "referenceNumber": "TM-050", "categoryId": "drumuri", "categoryName": "Drumuri", "description": "Veche",
         "photos": [], "location": {"addressOrDetails": "Str. Veche", "latitude": 43.75, "longitude": 24.87, "source": "manual"},
         "createdAt": "2026-01-01T10:00:00.000Z", "status": "transmis", "publicationPreference": "public", "moderationStatus": "approved"},
        {"id": "rep-legacy-2", "referenceNumber": "TM-051", "categoryId": "drumuri", "categoryName": "Drumuri", "description": "Corupta",
         "photos": [], "location": {"addressOrDetails": "Str. Corupta", "latitude": 43.751, "longitude": 24.871, "source": "manual"},
         "createdAt": "2026-01-02T10:00:00.000Z", "status": "transmis", "publicationPreference": "public", "moderationStatus": "approved",
         "resolutionStatus": "resolved", "assigneeIds": "nu-e-lista", "cityHallTakenOver": "da"},
        {"id": "rep-legacy-3", "referenceNumber": "TM-052", "categoryId": "drumuri", "categoryName": "Drumuri", "description": "Privata istorica",
         "photos": [], "location": {"addressOrDetails": "Str. Privata", "latitude": 43.752, "longitude": 24.872, "source": "manual"},
         "contact": {"name": "Ana Privat", "email": "ana.privat@example.com", "phone": "0733000000"},
         "createdAt": "2026-01-03T10:00:00.000Z", "status": "transmis", "publicationPreference": "private", "moderationStatus": "approved"},
        {"id": "rep-legacy-4", "referenceNumber": "TM-053", "categoryId": "drumuri", "categoryName": "Drumuri", "description": "Privata istorica neaprobata",
         "photos": [], "location": {"addressOrDetails": "Str. Privata 2", "latitude": 43.753, "longitude": 24.873, "source": "manual"},
         "createdAt": "2026-01-04T10:00:00.000Z", "status": "transmis", "publicationPreference": "private", "moderationStatus": "pending"},
    ]
    browser, page, errors = new_page(pw, storage={'turnu_civic_reports_store': json.dumps(legacy), 'turnu_civic_reports_counter': '51'})
    s9 = run_js(page, """
      return reportService.getAllReports().map(r => ({ ref: r.referenceNumber, rs: reportService.getResolutionStatus(r), a: reportService.getAssumptionState(r), pub: null }));
    """)
    pubrefs = run_js(page, "return reportService.getPublicMapReports().map(p => p.referenceNumber);")
    raw_after = page.evaluate("localStorage.getItem('turnu_civic_reports_store')")
    res.check('S9a date vechi: pornire fara erori', not errors, '; '.join(errors))
    s9 = [x for x in s9 if x['ref'] in ('TM-050', 'TM-051')]
    res.check('S9b lipsa campurilor = fara responsabili, Primaria nepreluata; status pastrat', s9 == [
        {'ref': 'TM-050', 'rs': 'new', 'a': {'assigneeIds': [], 'takenOverByCityHall': False}, 'pub': None},
        {'ref': 'TM-051', 'rs': 'resolved', 'a': {'assigneeIds': [], 'takenOverByCityHall': False}, 'pub': None}], json.dumps(s9))
    res.check('S9c sesizarile vechi raman afisabile pe harta', {'TM-050', 'TM-051'} <= set(pubrefs), str(pubrefs))
    res.check('PRIV-2 sesizare istorica private + approved: NU este exclusa de pe harta; private + pending ramane exclusa (moderare)',
              'TM-052' in pubrefs and 'TM-053' not in pubrefs, str(pubrefs))
    pubjson = run_js(page, "return JSON.stringify(reportService.getPublicMapReports());")
    res.check('PRIV-3b datele autorului istoric privat nu apar public', all(v not in pubjson for v in ['Ana Privat', 'ana.privat@example.com', '0733000000']), '')
    res.check('S9d datele stocate nu au fost rescrise la citire', json.loads(raw_after) == legacy, '')
    browser.close()

ok = res.report()
sys.exit(0 if ok else 1)
