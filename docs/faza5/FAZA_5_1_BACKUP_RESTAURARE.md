# FAZA 5.1 — BACKUP ȘI RESTAURARE (T-D1)

**Proiect:** Turnu Măgurele Civic · **Pas:** 5.1.8 · **Data:** 29.09.2026
**Decizia tehnică aprobată (5.1, decizia 3):** backup „cu fereastră”: R = 7 zile, backup-ul exclude sesizările mai vechi de 38 de zile, lista ID-urilor șterse păstrată 7 zile.
**Regula de produs (neschimbată):** datele unei sesizări se păstrează 45 de zile de la depunere, fără excepție pentru backup-uri (A04-1).

---

## 1. Cum respectă backup-ul regula de 45 de zile

| Mecanism | Efect |
|---|---|
| Backup-urile se păstrează **7 zile** (`backup:db` șterge automat directoarele mai vechi) | cea mai veche copie are cel mult 7 zile |
| Fiecare backup conține numai sesizările depuse în ultimele **38 de zile** (45 − 7), cu fotografiile, notele, responsabilii, jurnalul e-mail și rândurile de audit ale lor | nicio copie nu conține date de sesizare mai vechi de 38 + 7 = **45 de zile** |
| Aceeași fereastră pentru: corpul e-mailurilor de cont (45 de zile, N3-8), auditul administrativ (6 luni, A04-4), textele libere din sondajele închise (6 luni, A06-1) | nicio copie nu depășește termenele aprobate |
| **Lista de ștergeri:** la ștergerea definitivă a unei sesizări (autor / `super_admin`, din 5.4) se notează **numai ID-ul intern** și data, într-un fișier lângă backup-uri; intrările se păstrează **7 zile** | o sesizare ștearsă nu reapare după o restaurare |
| **Restaurarea** aplică lista de ștergeri și apoi retenția (sesizările ajunse între timp la 45 de zile dispar) înainte de pornirea aplicației | după restaurare, starea respectă regulile ca și cum nu ar fi existat incidentul |
| Blocările definitive (`citizen_blocks`) intră normal în backup | nu au termen de retenție (K-A02-4) |

**Prețul (acceptat la aprobarea deciziei):** la o restaurare se pierd sesizările din ultimele 7 zile ale termenului lor de 45 de zile. Oricum ar fi fost șterse curând.

**Nu intră în backup** (date efemere): sesiunile, codurile de autentificare ale cetățenilor, limitele de rată, provocările proof-of-work folosite. După o restaurare, toți utilizatorii se autentifică din nou.

**Contorul `TM-XXX` (D25–D26):** sesizările depuse după ultimul backup se pierd la restaurare, dar numerele lor au fost deja comunicate. Valoarea maximă emisă se ține lângă backup-uri (`report-counter-watermark.json`, scrisă din 5.4 la fiecare depunere). Restaurarea pornește contorul de la maximul dintre backup și această valoare, deci niciun număr nu se refolosește.

## 2. Ce conține un backup

```
BACKUP_DIR/
  civic-backup-20260929T030000000Z/   ← un backup (data UTC în nume)
    manifest.json                     ← versiunea schemei, numărul de rânduri, fereastra, SHA-256
    db.jsonl.gz                       ← rândurile tabelelor (JSON, comprimat)
    photos/…                          ← fișierele foto ale sesizărilor din backup
  deletion-list.jsonl                 ← { reportId, deletedAt }, numai ultimele 7 zile
  report-counter-watermark.json       ← { lastValue }
```

`BACKUP_DIR` trebuie să fie **în afara oricărui docroot**, cu acces restrâns (G3, condiția 6). Pe staging: un director în contul de hosting, în afara `public_html` și în afara directorului aplicației (de stabilit la 5.1.10). În producție: la G6 (inclusiv criptarea).

## 3. Backup zilnic (cron)

```bash
node server/dist/app.js backup:db
```

- cere `BACKUP_DIR` în mediu;
- refuză dacă schema DB nu este la versiunea așteptată;
- scrie întâi într-un director temporar și îl redenumește numai la final (un backup întrerupt nu apare ca valid);
- la final șterge backup-urile mai vechi de 7 zile și intrările vechi din lista de ștergeri.

Pe staging, comanda se programează zilnic din cPanel → Cron Jobs (la pasul 5.1.10, cu aprobare).

## 4. Restaurarea, pas cu pas

Restaurarea se face **numai într-un DB nou, gol**. Nu se suprascrie niciodată un DB existent.

1. **Opriți aplicația** (cPanel → Setup Node.js App → Stop), ca să nu se scrie date noi.
2. **Creați un DB nou** (cPanel → MySQL Databases), cu utilizatorul aplicației, și schimbați `DATABASE_URL` spre el.
3. **Creați schema:**
   ```bash
   node server/dist/app.js migrate
   ```
4. **Alegeți backup-ul** (de regulă cel mai recent):
   ```bash
   node server/dist/app.js restore:db            # fără argumente: afișează backup-urile disponibile
   ```
5. **Restaurați:**
   ```bash
   node server/dist/app.js restore:db "$BACKUP_DIR/civic-backup-<data>" --confirm
   ```
   Comanda:
   - verifică suma SHA-256 și versiunea schemei;
   - refuză dacă DB-ul nu este gol;
   - încarcă toate rândurile într-o singură tranzacție și verifică toate cheile străine;
   - copiază fotografiile în `STORAGE_DIR`;
   - aplică lista de ștergeri, apoi retenția de 45 de zile;
   - ridică contorul `TM` la ultima valoare emisă;
   - afișează un rezumat (rânduri, fotografii restaurate / lipsă, sesizări șterse).
6. **Verificați:** `node server/dist/app.js migrate:status` (versiunea așteptată).
7. **Porniți aplicația** și verificați `GET /api/v1/health` = `ok`.
8. Vechiul DB se păstrează până la confirmarea restaurării, apoi se șterge (manual, în cPanel).

## 5. Teste (`server/test/integration/backup.test.ts`)

Cu ceas simulat:
- sesizarea de 40 de zile lipsește din backup, cu fotografia, nota, e-mailul și auditul ei; cele de 1, 2 și 37 de zile sunt prezente;
- corpul e-mailului de cont vechi, auditul administrativ vechi și textul liber al unui sondaj închis de peste 6 luni lipsesc; cele recente sunt prezente;
- sesiunile lipsesc; blocarea definitivă este prezentă;
- rotația șterge backup-ul de 9 zile și îl păstrează pe cel de 5 zile;
- lista de ștergeri conține numai `reportId` și `deletedAt` și își șterge intrările mai vechi de 7 zile;
- restaurarea este refuzată într-un DB care nu este gol și pentru un backup corupt;
- restaurarea în DB nou, la 9 zile după backup: conținutul copiat integral este identic (`CHECKSUM TABLE`); rămâne numai sesizarea de 1 zi (cea de 37 de zile ajunge la 46 → eliminată; cea ștearsă după backup nu reapare); fotografiile numai ale ei; contorul `TM` = ultima valoare emisă; contul cetățeanului nu este atins;
- CLI: fără `BACKUP_DIR` → refuz; `restore:db` fără `--confirm` → cod 2.

Testul de restaurare pe staging (T-BAK) se face la 5.1.10.
