# FAZA 5.1 — GHID WINDOWS 11 (mediul local)

**Proiect:** Turnu Măgurele Civic · **Pas:** 5.1.9 · **Data:** 29.09.2026
**Decizia 4 (aprobată la 29.09.2026):** nivelul **Minim**: Git + Node.js 24. Nivelul Complet (serverul cu baza de date pe calculator) rămâne opțional, pentru mai târziu (§5).

> Pentru lucrul la proiect nu este obligatoriu nimic din acest ghid: construcția și testele rulează automat pe GitHub (CI) la fiecare modificare. Ghidul este pentru cazul în care vrei să vezi singur aplicația, pe calculator sau pe telefon.

---

## 1. Ce instalezi (o singură dată, ~15 minute)

| # | Program | De unde | Opțiuni la instalare |
|---|---|---|---|
| 1 | **Git for Windows** | git-scm.com → Download for Windows | lași opțiunile implicite (Next → Next → Install) |
| 2 | **Node.js 24 LTS** | nodejs.org → butonul „LTS” (Windows Installer, `.msi`) | lași opțiunile implicite; bifa „Automatically install the necessary tools” **nu** este necesară |

După instalare **închizi și redeschizi** PowerShell (Start → scrii „PowerShell” → Enter), ca să fie găsite programele noi.

**Verificare** (în PowerShell):

```powershell
git --version     # git version 2.x
node -v           # v24.x.x
npm -v            # 11.x (sau mai nou)
```

Dacă `npm -v` dă eroarea *„running scripts is disabled on this system”*, rulezi o singură dată:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

și răspunzi `Y`. Alternativ, poți scrie `npm.cmd` în loc de `npm`.

## 2. Descarci proiectul (o singură dată)

```powershell
cd $HOME\Documents
git clone https://github.com/sergiuiordan2000-ctrl/Platforma-interactiva.git
cd Platforma-interactiva
git switch faza-5-backend
npm ci
```

- `git clone` copiază proiectul de pe GitHub în `Documente\Platforma-interactiva`;
- `git switch faza-5-backend` trece pe branch-ul Fazei 5 (`main` rămâne neatins);
- `npm ci` instalează dependențele exact cum sunt fixate în proiect (1–3 minute).

Sfârșiturile de linie sunt gestionate de `.gitattributes`: fișierele rămân identice pe Windows și Linux, indiferent de setarea Git aleasă la instalare.

## 3. Pornești aplicația și o vezi pe calculator

```powershell
npm run dev
```

Deschizi în browser: **http://localhost:3000**

Oprirea: în fereastra PowerShell apeși **Ctrl + C**.

La nivelul Minim, aplicația rulează ca până acum, cu datele demo salvate în browser (`localStorage`); serverul nou nu este pornit. Asta este normal: frontend-ul trece pe server domeniu cu domeniu, de la 5.2 încolo.

## 4. O vezi pe telefon (prin Wi-Fi)

1. Telefonul și calculatorul sunt în **aceeași rețea Wi-Fi** (de acasă).
2. Afli adresa calculatorului:
   ```powershell
   ipconfig
   ```
   La adaptorul Wi-Fi, rândul **IPv4 Address**, de exemplu `192.168.1.23`.
3. Pornești aplicația (`npm run dev`).
4. Pe telefon deschizi: **http://192.168.1.23:3000** (cu adresa ta).
5. La prima pornire, Windows poate întreba de firewall pentru Node.js: bifezi **numai „Private networks”** și apeși „Allow”.

> Folosește acest mod numai în rețeaua de acasă. Pe o rețea publică (cafenea, hotel), aplicația ar fi vizibilă și altor persoane din rețea.

## 5. Actualizarea (când apar modificări noi)

```powershell
cd $HOME\Documents\Platforma-interactiva
git pull
npm ci
npm run dev
```

## 6. Probleme frecvente

| Mesaj | Cauză | Soluție |
|---|---|---|
| `'git' / 'node' is not recognized…` | PowerShell a rămas deschis de dinainte de instalare | închizi și redeschizi PowerShell |
| `running scripts is disabled on this system` | politica implicită a PowerShell | §1: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` sau `npm.cmd` |
| `Port 3000 is already in use` | aplicația rulează deja în altă fereastră | închizi cealaltă fereastră (Ctrl + C) |
| pe telefon pagina nu se încarcă | rețele diferite sau firewall | aceeași rețea Wi-Fi; firewall: Node.js permis pe „Private networks” |
| `npm ci` dă erori de rețea | conexiune instabilă | rulezi din nou `npm ci` |

## 7. Nivelul Complet (opțional, pentru mai târziu)

Numai dacă vei vrea să rulezi **și serverul cu baza de date** pe calculator. Cere virtualizarea activă în BIOS și WSL 2 (T-D5).

1. **Docker Desktop** (docker.com → Download for Windows); la instalare lași bifat „Use WSL 2”; repornești calculatorul.
2. Pornești MySQL 8.4 și Mailpit (captarea e-mailurilor de test):
   ```powershell
   docker run -d --name civic-mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=<parolă-locală> -e MYSQL_DATABASE=civic_dev -e MYSQL_USER=civic -e MYSQL_PASSWORD=<parolă-locală-2> mysql:8.4
   docker run -d --name civic-mailpit -p 8025:8025 -p 1025:1025 axllent/mailpit
   ```
3. Copiezi `.env.example` în `.env` și completezi `DATABASE_URL` (cu utilizatorul `civic`) și secretele (comanda de generare este scrisă în `.env.example`). Fișierul `.env` nu intră niciodată în Git.
4. Creezi schema, datele de configurare și datele demo, apoi pornești serverul:
   ```powershell
   npm run migrate -w server
   npm run seed:config -w server
   npm run seed:demo -w server
   npm run build
   npm run dev -w server
   ```
5. Verificare: **http://localhost:3000/api/v1/health** → `{"status":"ok",…}` (portul din `.env`).

Parolele locale le alegi tu; nu le trimite nimănui și nu le scrie în fișierele proiectului, în afară de `.env`.
