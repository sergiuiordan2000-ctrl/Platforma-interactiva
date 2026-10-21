"""Etapa 7, 7B.3 — A21-2: țintele de atingere pe mobil (planul `docs/faza7/FAZA_7B_PLAN.md` §15: decizia B cu clarificările
din 21.10.2026).

Emulare Chromium (Playwright, `is_mobile` + `has_touch`) — NU test pe telefon real. La 390 și 360 px:
- paginile publice (Acasă, Hartă, Sondaje, Comunicate, Ghid, formularul de sesizare, Contul meu): fiecare țintă
  (buton, legătură, listă de selecție, zoom-ul hărții) are cel puțin 44 × 44 px; căsuța de bifat: eticheta ei are cel
  puțin 44 px înălțime; markerii hărții: zona de atingere acoperă 44 × 44 px (desenul rămâne de 32 px). Excepție:
  legăturile din atribuirea hărții (Leaflet / OpenStreetMap);
- Admin (toate tab-urile și sub-tab-urile, detaliile unei sesizări; și la 700 px, între `sm` și `md`): orice buton
  cu text vizibil are cel puțin 44 × 44 px, chiar dacă e marcat `tinta-iconita`;
  butoanele strict iconografice sunt marcate `tinta-iconita` și au cel puțin 24 × 24 px; celelalte ținte cel puțin
  24 × 24 px.
Peste tot: textul nu iese din caseta țintei (o țintă strânsă sub lățimea textului ar fi o regresie de aspect).
La 1280 px regulile de mobil nu se aplică (desktop neschimbat).
Suită separată (server și DB proprii).
"""
import sys; sys.dont_write_bytecode = True
import json
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
from harness import *

res = Results('7B.3 TINTE DE ATINGERE (E2E, server real, emulare Chromium)')
CITIZEN = 'b73t.e2e@exemplu.test'
TABS = ['dashboard', 'announcements', 'directory', 'quickdial', 'reports', 'surveys', 'accounts']
DIR_SUB = ['Date Instituționale', 'Direcții & Departamente', 'Servicii & Acte Cetățeni', 'Program & Audiențe', 'Link-uri Utile']
QD_SUB = ['Contacte & Numere Utile', 'Gestiune Categorii']
T = 0.5  # toleranță de rotunjire (px)

COLLECT = r"""() => {
  const sel = 'button, a[href], select, summary, [role=button], .leaflet-control-zoom a';
  const out = []; const seen = new Set();
  for (const el of document.querySelectorAll(sel)) {
    if (seen.has(el)) continue; seen.add(el);
    if (el.closest('.leaflet-control-attribution')) continue;           // excepția: atribuirea hărții
    if (el.closest('.custom-civic-marker')) continue;                     // markerii: verificați separat
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || cs.display === 'none') continue;
    const text = (el.innerText || '').replace(/\s+/g, ' ').trim();
    let label = (text || el.getAttribute('aria-label') || el.getAttribute('title') || el.tagName).slice(0, 50);
    if (/@/.test(label)) label = '[adresă]';
    out.push({tag: el.tagName.toLowerCase(), label, text: text.length > 0, icon: el.classList.contains('tinta-iconita'),
              w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10,
              over: el.scrollWidth > el.clientWidth + 1});                // textul iese din casetă (ținta strânsă)
  }
  const boxes = [...document.querySelectorAll('input[type=checkbox], input[type=radio]')].filter(i => i.getBoundingClientRect().width > 0)
    .map(i => { const l = i.closest('label'); const r = (l || i).getBoundingClientRect(); return {label: l ? 'etichetă' : 'fără etichetă', h: Math.round(r.height * 10) / 10}; });
  // markerii: zona de atingere = caseta markerului plus pseudo-elementul `::before` (centrat pe cerc); se verifică
  // geometric (elementFromPoint nu e folosibil: bannerele hărții sau marginea hărții pot acoperi punctul).
  // Desenul (cercul) trebuie să rămână de 32 px.
  const markers = [...document.querySelectorAll('.custom-civic-marker')].map(m => { const r = m.getBoundingClientRect();
    const b = getComputedStyle(m, '::before'); const px = (v) => parseFloat(v) || 0;
    const bx = r.left + px(b.left), by = r.top + px(b.top), bw = b.content === 'none' ? 0 : px(b.width), bh = b.content === 'none' ? 0 : px(b.height);
    const L = Math.min(r.left, bw ? bx : r.left), R = Math.max(r.right, bw ? bx + bw : r.right);
    const T = Math.min(r.top, bh ? by : r.top), Bo = Math.max(r.bottom, bh ? by + bh : r.bottom);
    const cx = r.left + 16, cy = r.top + 16;          // centrul cercului (desen de 32 px în colțul stânga-sus)
    const circle = m.querySelector('.w-8.h-8'); const cr = circle ? circle.getBoundingClientRect() : {width: 0};
    return {ok: cx - L >= 22 - 0.5 && R - cx >= 22 - 0.5 && cy - T >= 22 - 0.5 && Bo - cy >= 22 - 0.5, desen: Math.round(cr.width)}; });
  return {els: out, boxes, markers};
}"""


def check_public(page, name, w):
    d = page.evaluate(COLLECT)
    bad = [e for e in d['els'] if min(e['w'], e['h']) < 44 - T]
    bad_boxes = [b for b in d['boxes'] if b['h'] < 44 - T]
    bad_markers = [m for m in d['markers'] if not m['ok'] or m['desen'] != 32]
    over = [e for e in d['els'] if e['over']]
    res.check(f'{w} px public „{name}”: toate țintele ≥ 44 px, textul în casetă (fără atribuirea hărții)',
              not bad and not bad_boxes and not bad_markers and not over and d['els'],
              json.dumps({'n': len(d['els']), 'sub44': bad[:6], 'casute': bad_boxes[:3], 'markeri': len(d['markers']), 'markeri_sub44': len(bad_markers),
                          'text_iesit': over[:6]}, ensure_ascii=False))


def check_admin(page, name, w):
    d = page.evaluate(COLLECT)
    bad = []
    for e in d['els']:
        side = min(e['w'], e['h'])
        if e['tag'] == 'button' and e['text']:          # orice buton cu text vizibil: 44 px, chiar dacă e marcat `tinta-iconita`
            if side < 44 - T: bad.append(('text<44', e))
        elif e['tag'] == 'button' and not e['text'] and not e['icon']:
            bad.append(('iconita nemarcata', e))
        elif side < 24 - T:
            bad.append(('<24', e))
        if e['over']:
            bad.append(('text iesit din caseta', e))
    res.check(f'{w} px Admin „{name}”: butoane cu text ≥ 44 px, iconițe marcate și ≥ 24 px, restul ≥ 24 px, textul în casetă', not bad and d['els'],
              json.dumps({'n': len(d['els']), 'abateri': bad[:6]}, ensure_ascii=False))


with backend_server(5993) as B, sync_playwright() as pw:
    URL = B['url']
    b = pw.chromium.launch()
    errors = []
    try:
        setup = b.new_context()
        citizen_login_api(setup, URL, CITIZEN)
        r = submit_report_api(setup, URL, form_token(setup, URL), 'Sesizare de test pentru țintele de atingere.', {'text': 'Punct de test', 'lat': 43.7460, 'lng': 24.8745, 'source': 'pin'})
        assert r.status in (200, 201), r.text()
        rep = db_query('SELECT id FROM reports ORDER BY created_at DESC LIMIT 1')[0]['id']
        db_exec("INSERT INTO email_outbox (id, kind, report_id, recipient, subject, body_text, status, attempts, last_error, mode_at_send, created_at) "
                "VALUES ('01JB7B3T1NTE00000000000000', 'registry_notification', ?, 'registratura@exemplu.test', 'Subiect', 'corp', 'failed', 1, 'eroare de test', 'simulated', NOW(3))", [rep])
        state = setup.storage_state(); setup.close()

        for (w, h) in [(390, 844), (360, 800)]:
            c = b.new_context(viewport={'width': w, 'height': h}, is_mobile=True, has_touch=True, storage_state=state)
            c.route('https://*.tile.openstreetmap.org/**', lambda r: r.abort())
            p = c.new_page(); p.on('pageerror', lambda e: errors.append(str(e)[:160]))
            for name, hsh in [('Acasă', 'home'), ('Hartă', 'harta'), ('Sondaje', 'sondaje'), ('Comunicate', 'comunicate'), ('Ghid', 'ghid'),
                              ('Sesizare (formular)', 'sesizari'), ('Contul meu', 'contul-meu')]:
                p.goto(f'{URL}/#{hsh}'); p.wait_for_load_state('networkidle'); p.wait_for_timeout(900)
                check_public(p, name, w)
            c.close()

        c = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        p = c.new_page(); p.on('pageerror', lambda e: errors.append(str(e)[:160]))
        admin_login(p, URL, B, B['admin'])
        # 700 px: tot sub `md`, dar peste `sm` — unele butoane-iconiță își arată textul (de ex. „Inspectează”)
        for (w, h) in [(390, 844), (360, 800), (700, 900)]:
            p.set_viewport_size({'width': w, 'height': h}); p.wait_for_timeout(300)
            for t in TABS:
                p.evaluate(f"() => document.querySelector('[data-admin-tab={t}]').click()"); p.wait_for_timeout(700)
                if t == 'directory':
                    for s in DIR_SUB:
                        p.get_by_role('button', name=s).first.click(); p.wait_for_timeout(500); check_admin(p, f'Ghid / {s}', w)
                elif t == 'quickdial':
                    for s in QD_SUB:
                        p.get_by_role('button', name=s).first.click(); p.wait_for_timeout(500); check_admin(p, f'Numere utile / {s}', w)
                elif t == 'reports':
                    p.get_by_text('Detalii și acțiuni').first.click(); p.wait_for_timeout(1000); check_admin(p, 'Sesizări (cu detalii)', w)
                    p.get_by_text('Ascunde detaliile').first.click(); p.wait_for_timeout(300)
                else:
                    check_admin(p, t, w)
        c.close()

        # desktop: regulile de mobil nu se aplică
        c = b.new_context(viewport={'width': 1280, 'height': 900}, storage_state=state)
        c.route('https://*.tile.openstreetmap.org/**', lambda r: r.abort())
        p = c.new_page()
        p.goto(f'{URL}/#harta'); p.wait_for_load_state('networkidle'); p.wait_for_timeout(900)
        dk = p.evaluate(r"""() => ({btnMin: getComputedStyle(document.querySelector('footer button')).minHeight,
                                    zoom: document.querySelector('.leaflet-control-zoom a').getBoundingClientRect().height,
                                    marker: getComputedStyle(document.querySelector('.custom-civic-marker'), '::before').content})""")
        res.check('1280 px: regulile de mobil nu se aplică (min-height implicit, zoom 30 px, fără zona extinsă a markerilor)',
                  dk['btnMin'] in ('auto', '0px') and abs(dk['zoom'] - 30) < 1 and dk['marker'] in ('none', 'normal'), json.dumps(dk))
        c.close()
        res.check('fără erori JavaScript necaptate în pagini', not errors, '; '.join(errors[:3]))
    finally:
        b.close()

sys.exit(0 if res.report() else 1)
