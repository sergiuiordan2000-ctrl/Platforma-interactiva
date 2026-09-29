#!/usr/bin/env python3
"""Pachetul de deploy (staging): o arhivă .zip cu tot ce rulează pe server, fără node_modules.

Conținut: dist/ (frontend), server/dist/ (artefactul app.js), server/migrations/, server/seeds/,
package.json minimal. Fără .env, fără secrete, fără date.

Rulare (din rădăcina repository-ului, după `npm run build` și `npm run build -w server`):
    python3 server/scripts/package-release.py
"""
import hashlib, json, pathlib, subprocess, sys, zipfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
INCLUDE = ['dist', 'server/dist', 'server/migrations', 'server/seeds']
FORBIDDEN = ('.env', '.map')

def main() -> int:
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
        z.writestr('package.json', json.dumps({'name': 'turnu-magurele-civic', 'private': True, 'version': sha}, indent=2) + '\n')
        z.writestr('RELEASE.txt', f'Turnu Magurele Civic\ncommit: {sha}{" (modificari necomise)" if dirty else ""}\nstartup: server/dist/app.js\n')
    digest = hashlib.sha256(out.read_bytes()).hexdigest()
    print(f'{out.relative_to(ROOT)}  ({len(files)} fișiere, {out.stat().st_size // 1024} KB)')
    print(f'SHA-256: {digest}')
    return 0

if __name__ == '__main__':
    sys.exit(main())
