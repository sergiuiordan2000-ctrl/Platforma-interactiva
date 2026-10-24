"""Etapa 7, 7B.5 — constatarea 1 (varianta B, aprobată la 25.10.2026): fereastra unui marker de pe hartă.

Emulare Chromium (Playwright) — NU test pe telefon real. Sesizări fără fotografie (cazul în care butonul „×” cade peste
antet), inclusiv cele mai lungi denumiri de categorie („Spații verzi & parcuri”, „Salubritate & deșeuri”):
- la 390 și 360 px (mobil): butonul „×” are cel puțin 44 × 44 px (A21-2) și nu se intersectează cu niciun element din
  conținutul ferestrei (numărul TM, eticheta categoriei, stadiul, textul);
- la 1280 px (calculator): butonul rămâne 24 × 24 px și nu se intersectează cu conținutul.
Suită separată (server și DB proprii).
"""
import sys; sys.dont_write_bytecode = True
import json
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
from harness import *

res = Results('7B.5 FEREASTRA MARKERULUI (E2E, server real, emulare Chromium)')
CITIZEN = 'b75p.e2e@exemplu.test'
REPORTS = [('spatii_verzi', 'Spații verzi & parcuri', 43.7460, 24.8745), ('salubritate', 'Salubritate & deșeuri', 43.7495, 24.8700),
           ('drumuri', 'Drumuri / carosabil', 43.7430, 24.8800)]

MEASURE = r"""(i) => {
  const icons = [...document.querySelectorAll('.leaflet-marker-icon.custom-civic-marker')];
  if (!icons[i]) return null;
  icons[i].click();
  const pop = document.querySelector('.leaflet-popup'); if (!pop) return {missing: true};
  const btn = pop.querySelector('a.leaflet-popup-close-button');
  const content = pop.querySelector('.leaflet-popup-content');
  const rect = (e) => e.getBoundingClientRect();
  const b = rect(btn);
  const inter = (a, c) => Math.max(0, Math.min(a.right, c.right) - Math.max(a.left, c.left)) * Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top));
  // elementele de conținut care se văd (frunze cu text), fără imagine
  const leaves = [...content.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.trim() && rect(e).width > 0 && !e.closest('img'));
  const hits = leaves.map(e => ({text: e.textContent.trim().slice(0, 30), area: Math.round(inter(b, rect(e)))})).filter(x => x.area > 0);
  const hdr = content.querySelector('.flex.items-center.justify-between'); const sp = hdr ? hdr.querySelectorAll(':scope > span') : [];
  const r2 = (e) => { const q = rect(e); return [Math.round(q.left * 10) / 10, Math.round(q.right * 10) / 10]; };
  return {photo: !!content.querySelector('img'), category: sp[1] ? sp[1].textContent.trim() : null, tm: sp[0] ? sp[0].textContent.trim() : null,
          w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10, close_x: r2(btn), tm_x: sp[0] ? r2(sp[0]) : null,
          category_x: sp[1] ? r2(sp[1]) : null, hits};
}"""

with backend_server(5992) as B, sync_playwright() as pw:
    URL = B['url']
    b = pw.chromium.launch()
    errors = []
    try:
        s = b.new_context(); citizen_login_api(s, URL, CITIZEN)
        for slug, _, lat, lng in REPORTS:
            r = submit_report_api(s, URL, form_token(s, URL), f'Sesizare de test pentru fereastra markerului ({slug}).',
                                  {'text': 'Punct de test', 'lat': lat, 'lng': lng, 'source': 'pin'}, category=slug)
            assert r.status in (200, 201), r.text()
        s.close()
        for (w, h, mob) in [(390, 844, True), (360, 800, True), (1280, 900, False)]:
            c = b.new_context(viewport={'width': w, 'height': h}, is_mobile=mob, has_touch=mob)
            c.route('https://*.tile.openstreetmap.org/**', lambda q: q.abort())
            p = c.new_page(); p.on('pageerror', lambda e: errors.append(str(e)[:160]))
            p.goto(URL + '/#harta'); p.wait_for_load_state('networkidle'); p.wait_for_timeout(1200)
            n = p.locator('.leaflet-marker-icon.custom-civic-marker').count()
            seen = []
            for i in range(n):
                m = p.evaluate(MEASURE, i); p.wait_for_timeout(250)
                if m and not m.get('missing') and not m['photo']:
                    seen.append(m)
            cats = {m['category'] for m in seen}
            want = {name for _, name, _, _ in REPORTS}
            size_ok = all((m['w'] >= 44 - 0.5 and m['h'] >= 44 - 0.5) if mob else (abs(m['w'] - 24) < 0.5 and abs(m['h'] - 24) < 0.5) for m in seen)
            res.check(f'{w} px: „×” fără nicio intersecție cu numărul TM, categoria sau restul conținutului '
                      f'({"≥ 44 × 44" if mob else "24 × 24"}), inclusiv la categoriile cu nume lung',
                      want <= cats and size_ok and all(not m['hits'] for m in seen),
                      json.dumps([{k: m[k] for k in ('category', 'w', 'h', 'close_x', 'tm_x', 'category_x', 'hits')} for m in seen], ensure_ascii=False))
            c.close()
        res.check('fără erori JavaScript necaptate în pagini', not errors, '; '.join(errors[:3]))
    finally:
        b.close()

sys.exit(0 if res.report() else 1)
