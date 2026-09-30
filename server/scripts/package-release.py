#!/usr/bin/env python3
"""Pachetul de deploy (staging): o arhivă .zip cu tot ce rulează pe server, fără node_modules.

Conținut: dist/ (frontend), server/dist/ (artefactul app.js), server/migrations/, server/seeds/, server/data/,
package.json minimal. Fără .env, fără secrete, fără date.

Rulare (din rădăcina repository-ului, după `npm run build` și `npm run build -w server`):
    python3 server/scripts/package-release.py
    python3 server/scripts/package-release.py --bootstrap-email <adresă> [--bootstrap-name "Nume"]

Scripturile npm din package.json (5.4: civic-seed-demo, civic-show-latest-code, civic-outbox-process,
civic-purge-retention, civic-report-pow-*) se rulează din cPanel → Node.js → „Run JS script”.
Cu --bootstrap-email, package.json din pachet primește și scriptul `civic-bootstrap-admin`, rulat din
cPanel → Node.js → „Run JS script” (care nu acceptă argumente). Parola temporară apare numai în
ieșirea comenzii, nu într-un fișier (B3 §6). Adresa ajunge numai în pachet, nu în repository.
"""
import argparse, hashlib, json, pathlib, re, shlex, subprocess, sys, zipfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
INCLUDE = ['dist', 'server/dist', 'server/migrations', 'server/seeds', 'server/data']
FORBIDDEN = ('.env', '.map')

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--bootstrap-email')
    ap.add_argument('--bootstrap-name')
    a = ap.parse_args()
    if a.bootstrap_name and not a.bootstrap_email:
        print('--bootstrap-name cere --bootstrap-email', file=sys.stderr)
        return 2
    if a.bootstrap_email and not re.fullmatch(r'[^@\s"\'`$\\]+@[^@\s"\'`$\\]+\.[^@\s"\'`$\\]+', a.bootstrap_email):
        print('adresă de e-mail invalidă', file=sys.stderr)
        return 2
    if a.bootstrap_name and re.search(r'["`$\\\n]', a.bootstrap_name):
        print('numele nu poate conține ghilimele, `, $, \\ sau linii noi', file=sys.stderr)
        return 2
    for d in INCLUDE:
        if not (ROOT / d).is_dir():
            print(f'lipsește {d}: rulați întâi build-ul', file=sys.stderr)
            return 1
    if not (ROOT / 'server/dist/app.js').is_file() or not (ROOT / 'dist/index.html').is_file():
        print('build incomplet', file=sys.stderr)
        return 1
    sha = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=ROOT, capture_output=True, text=True).stdout.strip() or 'unknown'
    dirty = subprocess.run(['git', 'status', '--porcelain'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    out_dir = ROOT / 'server' / 'release'
    out_dir.mkdir(exist_ok=True)
    name = f'civic-{sha}{"-dirty" if dirty else ""}.zip'
    out = out_dir / name
    files = []
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for d in INCLUDE:
            for p in sorted((ROOT / d).rglob('*')):
                if p.is_file():
                    rel = p.relative_to(ROOT).as_posix()
                    if p.name.startswith('.env') or p.suffix in FORBIDDEN:
                        continue
                    z.write(p, rel)
                    files.append(rel)
        pkg = {'name': 'turnu-magurele-civic', 'private': True, 'version': sha}
        # 5.4: comenzile fără argumente pentru cPanel → Setup Node.js App → „Run JS script” (fără Terminal pe staging)
        app = 'node server/dist/app.js'
        pkg['scripts'] = {
            'civic-migrate-status': f'{app} migrate:status',
            'civic-seed-demo': f'{app} seed:demo',
            'civic-show-latest-code': f'{app} dev:show-code --latest',
            'civic-outbox-process': f'{app} outbox:process',
            'civic-purge-retention': f'{app} purge:retention',
            'civic-report-pow-status': f'{app} settings:report-pow status',
            'civic-report-pow-on': f'{app} settings:report-pow on',
            'civic-report-pow-off': f'{app} settings:report-pow off',
        }
        if a.bootstrap_email:
            cmd = ['node', 'server/dist/app.js', 'bootstrap-admin', '--email', a.bootstrap_email, '--name', a.bootstrap_name or 'Administrator']
            pkg['scripts']['civic-bootstrap-admin'] = ' '.join(shlex.quote(c) for c in cmd)
        z.writestr('package.json', json.dumps(pkg, indent=2, ensure_ascii=False) + '\n')
        z.writestr('RELEASE.txt', f'Turnu Magurele Civic\ncommit: {sha}{" (modificari necomise)" if dirty else ""}\nstartup: server/dist/app.js\n')
    digest = hashlib.sha256(out.read_bytes()).hexdigest()
    print(f'{out.relative_to(ROOT)}  ({len(files)} fișiere, {out.stat().st_size // 1024} KB)')
    print(f'SHA-256: {digest}')
    return 0

if __name__ == '__main__':
    sys.exit(main())
