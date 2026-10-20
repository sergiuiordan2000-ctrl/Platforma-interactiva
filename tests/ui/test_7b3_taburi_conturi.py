"""Etapa 7, 7B.3, grupul 1 — A21-3b (bara de derulare vizibilă) și AM-11 (conturile Admin ca un card pe ecrane înguste).

Planul `docs/faza7/FAZA_7B_PLAN.md` §5 și §15 (A21-3b = A; AM-11 = A; criteriile A21-3 confirmate).
Emulare Chromium (Playwright, `is_mobile` + `has_touch`) — NU test pe telefon real.
- T-A21-3b: la 390 și 360 px bara apare (tab-urile nu încap), „cursorul” are lățimea părții vizibile și ajunge la
  capăt când fâșia e derulată până la capăt; la 1280 px (tab-urile încap) bara nu apare.
- T-AM-11: la 390 și 360 px fiecare cont e un card: numele, rolul, starea și butoanele în interiorul ecranului,
  fără derularea orizontală a paginii; la 1280 px tabelul de dinainte (antet vizibil, rânduri de tabel).
Suită separată (server și DB proprii).
"""
import sys; sys.dont_write_bytecode = True
import json
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'lib'))
from harness import *

res = Results('7B.3 TABURI SI CONTURI (E2E, server real, emulare Chromium)')

BAR = r"""() => {
  const strip = document.querySelector('[data-admin-tab]').parentElement;
  const bar = document.querySelector('[data-testid=admin-tabs-scrollbar]');
  const out = {overflow: strip.scrollWidth > strip.clientWidth + 1, ratio: strip.clientWidth / strip.scrollWidth, bar: !!bar};
  if (bar) { const b = bar.getBoundingClientRect(), t = bar.firstElementChild.getBoundingClientRect();
    out.visible = b.width > 0 && b.height > 0 && getComputedStyle(bar).visibility !== 'hidden';
    out.thumb = t.width / b.width; out.thumbEnd = (t.right - b.left) / b.width; out.height = b.height; }
  return out;
}"""

ACCOUNTS = r"""() => {
  const W = window.innerWidth;
  const rows = [...document.querySelectorAll('[data-testid=admin-account]')];
  const inside = (e) => { const r = e.getBoundingClientRect(); return r.left >= -0.5 && r.right <= W + 0.5; };
  return {n: rows.length, pageOverflow: document.documentElement.scrollWidth > W + 1,
          allInside: rows.every(row => [...row.querySelectorAll('button, select')].every(inside)),
          buttons: rows.reduce((k, row) => k + row.querySelectorAll('button').length, 0),
          table: getComputedStyle(document.querySelector('[data-testid=admin-account]').closest('table')).display,
          thead: getComputedStyle(document.querySelector('[data-testid=admin-account]').closest('table').querySelector('thead')).display,
          row: getComputedStyle(rows[0]).display};
}"""

with backend_server(5996) as B, sync_playwright() as pw:
    URL = B['url']
    b = pw.chromium.launch()
    errors = []
    try:
        c = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        p = c.new_page(); p.on('pageerror', lambda e: errors.append(str(e)[:160]))
        admin_login(p, URL, B, B['admin'])
        for (w, h) in [(390, 844), (360, 800)]:
            p.set_viewport_size({'width': w, 'height': h}); p.wait_for_timeout(500)
            p.evaluate("() => { document.querySelector('[data-admin-tab]').parentElement.scrollLeft = 0; }"); p.wait_for_timeout(300)
            s0 = p.evaluate(BAR)
            p.evaluate("() => { const s = document.querySelector('[data-admin-tab]').parentElement; s.scrollLeft = s.scrollWidth; }"); p.wait_for_timeout(300)
            s1 = p.evaluate(BAR)
            res.check(f'T-A21-3b {w} px: tab-urile nu încap și bara de derulare e vizibilă; cursorul = partea vizibilă, la capăt după derulare',
                      s0['overflow'] and s0['bar'] and s0.get('visible') and abs(s0['thumb'] - s0['ratio']) < 0.02 and s1.get('thumbEnd', 0) > 0.98,
                      json.dumps({'inceput': s0, 'capat': s1}))
        p.locator('[data-admin-tab="accounts"]').click(); p.wait_for_timeout(800)
        for (w, h) in [(390, 844), (360, 800)]:
            p.set_viewport_size({'width': w, 'height': h}); p.wait_for_timeout(500)
            a = p.evaluate(ACCOUNTS)
            res.check(f'T-AM-11 {w} px: fiecare cont e un card; butoanele și rolul în ecran; pagina fără derulare orizontală',
                      a['n'] >= 2 and a['buttons'] == 3 * a['n'] and a['allInside'] and not a['pageOverflow'] and a['row'] == 'block' and a['thead'] == 'none',
                      json.dumps(a))
        c.close()

        c = b.new_context(viewport={'width': 1280, 'height': 900})
        p = c.new_page(); p.on('pageerror', lambda e: errors.append(str(e)[:160]))
        admin_login(p, URL, B, B['admin'])
        s = p.evaluate(BAR)
        res.check('T-A21-3b 1280 px: tab-urile încap și bara nu apare', not s['overflow'] and not s['bar'], json.dumps(s))
        p.locator('[data-admin-tab="accounts"]').click(); p.wait_for_timeout(800)
        a = p.evaluate(ACCOUNTS)
        res.check('T-AM-11 1280 px: tabelul de dinainte (tabel, antet vizibil, rânduri de tabel)',
                  a['table'] == 'table' and a['thead'] == 'table-header-group' and a['row'] == 'table-row' and a['allInside'], json.dumps(a))
        c.close()
        res.check('fără erori JavaScript necaptate în pagini', not errors, '; '.join(errors[:3]))
    finally:
        b.close()

sys.exit(0 if res.report() else 1)
