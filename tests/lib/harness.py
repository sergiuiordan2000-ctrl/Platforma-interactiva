"""Harness comun pentru testele Turnu Măgurele Civic (Python + Playwright).

- `dev_server()` pornește serverul Vite de dezvoltare, pentru testele care importă modulele
  reale din `src/` direct în pagină (aceeași instanță singleton ca aplicația).
- `preview_server()` construiește aplicația (`npm run build`) și o servește cu `vite preview`,
  pentru testele pe build-ul de producție.
- Faza 5.2: nu mai există conturi sau parole în frontend. Testele de serviciu (Vite dev) fixează
  utilizatorul prin `authService.setUserForDevTests` (numai în modul dev); testele UI cu login real
  pornesc serverul Node (`backend_server`) pe un DB de test, cu parolă și secret TOTP generate aleator
  la fiecare rulare (B10 §4).

Testele nu modifică fișierele urmărite de Git: `npm run build` scrie în `dist/` (ignorat),
iar datele de test trăiesc doar în `localStorage`-ul browserului de test.
"""
import os
import re
import signal
import socket
import subprocess
import sys
import time
import json  # noqa: F401  (reexportat pentru testele care folosesc `from harness import *`)
from contextlib import contextmanager
from pathlib import Path

from playwright.sync_api import sync_playwright  # noqa: F401  (reexportat)

sys.dont_write_bytecode = True

# tests/lib/harness.py -> rădăcina repository-ului
REPO = str(Path(__file__).resolve().parents[2])
PORT = int(os.environ.get('E66_PORT', '5199'))
BASE = f'http://127.0.0.1:{PORT}'


# Utilizatori sintetici pentru testele de serviciu (Vite dev; `setUserForDevTests`). ID-urile istorice
# se păstrează ca testele 6.6 (identitate unică) să rămână comparabile. Fără parole.
DEV_USERS = {
    'admin@turnumagurele.ro': {'id': 'usr-admin-01', 'email': 'admin@turnumagurele.ro', 'name': 'Administrator Platformă',
                               'role': 'super_admin', 'permissions': [], 'mfaEnabled': True},
    'operator@turnumagurele.ro': {'id': 'usr-operator-01', 'email': 'operator@turnumagurele.ro', 'name': 'Operator Primărie',
                                  'role': 'primarie_operator', 'permissions': [], 'mfaEnabled': False},
    'demo@turnumagurele.ro': {'id': 'usr-operator-02', 'email': 'demo@turnumagurele.ro', 'name': 'Operator Primărie',
                              'role': 'primarie_operator', 'permissions': [], 'mfaEnabled': False},
}


def dev_users():
    return DEV_USERS


def totp_code(secret_b32, at=None):
    """RFC 6238 (SHA-1, 6 cifre, 30 s), ca aplicația de pe telefon."""
    import base64, hashlib, hmac, struct
    key = base64.b32decode(secret_b32 + '=' * ((8 - len(secret_b32) % 8) % 8))
    counter = int((at if at is not None else time.time()) // 30)
    digest = hmac.new(key, struct.pack('>Q', counter), hashlib.sha1).digest()
    o = digest[-1] & 15
    return '%06d' % ((struct.unpack('>I', digest[o:o + 4])[0] & 0x7fffffff) % 1000000)


E2E_ACCOUNTS = {'admin': 'e2e-admin@exemplu.test', 'op': 'e2e-operator@exemplu.test', 'op2': 'e2e-operator2@exemplu.test'}


@contextmanager
def backend_server(port):
    """Serverul Node (artefactul construit) pe DB-ul de test, servind build-ul frontend-ului.
    Cere CIVIC_TEST_DATABASE_URL (un DB cu „test” în nume). Parola și secretul TOTP se generează aleator."""
    import secrets, base64, tempfile
    db = os.environ.get('CIVIC_TEST_DATABASE_URL')
    if not db:
        raise RuntimeError('Testele UI cu autentificare cer CIVIC_TEST_DATABASE_URL (MySQL, DB de test).')
    password = secrets.token_urlsafe(18)
    totp_secret = base64.b32encode(secrets.token_bytes(20)).decode().rstrip('=')
    env = dict(os.environ, APP_ENV='development', HOST='127.0.0.1', PORT=str(port),
               PUBLIC_BASE_URL=f'http://127.0.0.1:{port}', DATABASE_URL=db, STORAGE_DIR=tempfile.mkdtemp(),
               IP_HASH_SECRET=secrets.token_hex(32), PARTICIPATION_HMAC_SECRET=secrets.token_hex(32),
               FORM_TOKEN_SECRET=secrets.token_hex(32), POW_HMAC_KEY=secrets.token_hex(32), TOTP_ENC_KEY=secrets.token_hex(32),
               LOG_LEVEL='warn', CIVIC_E2E_PASSWORD=password, CIVIC_E2E_TOTP_SECRET=totp_secret)
    env.pop('CIVIC_ENV_FILE', None)
    b = subprocess.run(['npm', 'run', 'build', '-w', 'server'], cwd=REPO, capture_output=True, text=True)
    if b.returncode != 0:
        raise RuntimeError('build server eșuat: ' + b.stderr[-500:])
    s = subprocess.run(['node', 'server/dist/app.js', 'dev:e2e-setup'], cwd=REPO, env=env, capture_output=True, text=True)
    if s.returncode != 0:
        raise RuntimeError('dev:e2e-setup eșuat: ' + (s.stderr or s.stdout)[-500:])
    if _port_in_use(port):
        raise RuntimeError(f'Portul {port} este deja ocupat.')
    proc = subprocess.Popen(['node', 'server/dist/app.js'], cwd=REPO, env=env, stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL, start_new_session=True)
    try:
        for _ in range(60):
            if _port_in_use(port):
                break
            time.sleep(0.25)
        else:
            raise RuntimeError('serverul Node nu a pornit')
        yield {'url': f'http://127.0.0.1:{port}', 'password': password, 'totp_secret': totp_secret, **E2E_ACCOUNTS}
    finally:
        _stop_server(proc)


def _port_in_use(port):
    with socket.socket() as s:
        return s.connect_ex(('127.0.0.1', port)) == 0


def _start_server(args, port):
    """Pornește un server Vite într-un grup de procese propriu.
    Refuză pornirea dacă portul e deja ocupat: altfel testul s-ar conecta tacit la un server
    vechi (de exemplu rămas orfan dintr-o rulare anterioară), care poate servi alt cod."""
    if _port_in_use(port):
        raise RuntimeError(f'Portul {port} este deja ocupat (posibil un server Vite rămas dintr-o rulare anterioară). Opriți-l și reluați testul.')
    return subprocess.Popen(args, cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)


def _stop_server(proc):
    """Oprește întregul grup de procese (npx + procesul vite pornit de el)."""
    try:
        os.killpg(proc.pid, signal.SIGTERM)
    except ProcessLookupError:
        return
    try:
        proc.wait(timeout=10)
    except Exception:
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass


def _wait_port(port, timeout=60):
    t0 = time.time()
    while time.time() - t0 < timeout:
        with socket.socket() as s:
            if s.connect_ex(('127.0.0.1', port)) == 0:
                return True
        time.sleep(0.3)
    return False


@contextmanager
def dev_server():
    proc = _start_server(['npx', 'vite', '--port', str(PORT), '--strictPort', '--host', '127.0.0.1'], PORT)
    try:
        if not _wait_port(PORT):
            raise RuntimeError('Vite nu a pornit')
        yield
    finally:
        _stop_server(proc)


@contextmanager
def preview_server(port, build=True):
    """Build de producție + `vite preview` pe portul dat. Întoarce URL-ul de bază."""
    if build:
        r = subprocess.run(['npm', 'run', 'build'], cwd=REPO, capture_output=True, text=True)
        if r.returncode != 0:
            raise RuntimeError('npm run build a eșuat:\n' + r.stdout[-2000:] + r.stderr[-2000:])
    proc = _start_server(['npx', 'vite', 'preview', '--port', str(port), '--strictPort', '--host', '127.0.0.1'], port)
    try:
        if not _wait_port(port):
            raise RuntimeError('vite preview nu a pornit')
        yield f'http://127.0.0.1:{port}'
    finally:
        _stop_server(proc)


class Results:
    def __init__(self, title):
        self.title = title
        self.rows = []

    def check(self, name, cond, detail=''):
        self.rows.append((name, bool(cond), detail))

    def report(self):
        ok = sum(1 for r in self.rows if r[1])
        print(f'=== {self.title}: {ok}/{len(self.rows)} PASS ===')
        for name, passed, detail in self.rows:
            print(f"{'PASS' if passed else 'FAIL'} | {name}" + (f' | {detail}' if detail else ''))
        return ok == len(self.rows)


def new_page(pw, storage=None):
    browser = pw.chromium.launch()
    ctx = browser.new_context()
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(BASE + '/')
    if storage is not None:
        page.evaluate("s => { localStorage.clear(); sessionStorage.clear(); for (const [k,v] of Object.entries(s)) localStorage.setItem(k, v); }", storage)
        page.reload()
    page.wait_for_load_state('networkidle')
    return browser, page, errors


def run_js(page, body, arg=None):
    """Execută cod async în pagină, cu serviciile reale importate (aceeași instanță singleton).
    Vite poate servi modulele aplicației cu `?t=...`; un import fără acel parametru ar crea
    o A DOUA instanță a serviciului. Se importă deci exact URL-ul încărcat de aplicație
    (prima intrare din `performance`). În corpul testului este disponibilă și `loaded(nume)`."""
    script = """async (arg) => {
      const loaded = (n) => {
        const urls = performance.getEntriesByType('resource').map(e => e.name)
          .filter(u => new URL(u).pathname === '/src/services/' + n + '.ts');
        return urls.length ? urls[0] : '/src/services/' + n + '.ts';
      };
      const { reportService } = await import(loaded('reportService'));
      const { authService } = await import(loaded('authService'));
      const { permissionService } = await import(loaded('permissionService'));
      %s
    }""" % body
    return page.evaluate(script, arg)
