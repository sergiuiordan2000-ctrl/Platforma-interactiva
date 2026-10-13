# FAZA 5.1 — BACKUP ȘI RESTAURARE (T-D1)

**Proiect:** Turnu Măgurele Civic · **Pas:** 5.1.8 · **Data:** 29.09.2026
**Decizia tehnică aprobată (5.1, decizia 3):** backup „cu fereastră”: R = 7 zile, backup-ul exclude sesizările mai vechi de 38 de zile, lista ID-urilor șterse păstrată 7 zile.
**Regula de produs (neschimbată):** datele unei sesizări se păstrează 45 de zile de la depunere, fără excepție pentru backup-uri (A04-1).

> **Amendament (Faza 6, 11–12.10.2026): §6 de mai jos are prioritate.** Înlocuiește, din §1, rândurile despre lista de ștergeri și contorul TM; §2 (structura); ultimul punct din §3; §4 (restaurarea) și §5 (testele). Restul secțiunilor 1–3 rămâne valabil. Textul vechi se păstrează ca istoric.

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

---

## 6. Amendament (Faza 6, 11–12.10.2026): marcajele de lângă copii și restaurarea sigură

**Cod:** commit-urile `961fc76` (R1–R5, A1, A8, G1–G3) și `6da2f68` (decizia B), branch `faza-5-backend`; CI verde pe toate joburile, inclusiv MariaDB 11.4. **Deciziile proprietarului:** 11.10.2026 (numerotarea TM, păstrarea marcajelor, cele 8 alegeri de remediere, G1–G3) și 12.10.2026 (C1–C4, varianta B).

### 6.1 De ce

Probele M1–M3 și analiza de după ele (11.10.2026) au arătat că lista de ștergeri și marcajul contorului **nu se scriau deloc**: o restaurare ar fi readus sesizări șterse și ar fi emis din nou numere TM deja comunicate (constatările R1–R5).

### 6.2 Regulile în vigoare

| Regulă | Sursa |
|---|---|
| Un număr TM nu se reutilizează **niciodată**; golurile în numerotare sunt acceptate (după o eroare, o cădere sau o restaurare) | D25–D26; decizia din 11.10.2026 |
| Un singur loc emite numere TM; numărul este rezervat în marcaj **înainte** de confirmarea depunerii | R2 |
| La ștergerea unei sesizări (autor sau `super_admin`), marcajul de ștergere se scrie **înainte** de confirmare | R1 |
| Un marcaj de ștergere se păstrează până la **„data depunerii + 46 de zile”** (45 + o zi de rezervă) | decizia 1 din 11.10.2026 |
| `BACKUP_DIR` este obligatoriu pe staging și în producție și separat de `STORAGE_DIR`; altfel aplicația nu pornește | decizia 3 din 11.10.2026 |
| Marcajul contorului pierdut nu se reface automat; dacă lipsesc **toate** marcajele, iar baza are deja numere emise, pornirea, backup-ul și `seed:demo` refuză | A1; decizia B din 12.10.2026 |
| Copiile au formatul `civic-backup/2` și conțin fotografia marcajelor; copiile `civic-backup/1` (dinaintea remedierii) **nu se restaurează** | G2, G3 |

### 6.3 Ce se află în `BACKUP_DIR`

```
BACKUP_DIR/
  report-counter-watermark.json      ← { lastValue }: cel mai mare număr TM rezervat
  deletions/
    <ID intern>.json                 ← { reportId, reportCreatedAt, deletedAt }, câte un fișier pe sesizare ștearsă
  civic-backup-<data UTC>/
    manifest.json                    ← format „civic-backup/2”, schema, numărul de rânduri, SHA-256
    db.jsonl.gz                      ← rândurile tabelelor
    markers.json                     ← fotografia marcajelor (contorul și ștergerile), luată după instantaneul bazei (§6.4)
    photos/…
```

Marcajele nu conțin date personale: numai ID-ul intern al sesizării, două date calendaristice și un număr. Fișierul vechi `deletion-list.jsonl` se mai citește, dar nu se mai scrie.

### 6.4 Backup-ul zilnic (`backup:db`)

**Ordinea operațiilor** (codul publicat la `6da2f68`, neschimbat la `f982896`; `server/src/db/backup.ts`, funcția `createBackup`). **Nu este o singură tranzacție atomică:** sunt trei momente distincte.

| Pas | Ce se întâmplă | Tranzacție / blocare |
|---|---|---|
| 1 | **Sincronizarea contorului:** contorul din bază și marcajul sunt aduse la maximul dintre ele; dacă a fost ridicat contorul din bază, comanda scrie o linie explicită (A8) | tranzacție scurtă, separată, cu rândul `report_counter` blocat; blocarea se eliberează la sfârșitul pasului |
| 2 | **Instantaneul bazei** (momentul T1): toate tabelele sunt citite la același moment | altă tranzacție, numai-citire, `REPEATABLE READ` cu instantaneu consistent |
| 3 | scrierea `db.jsonl.gz` | — |
| 4 | **Fotografia marcajelor** (momentul T2, după T1): marcajul contorului și intrările din `deletions/`, citite din `BACKUP_DIR` | fără tranzacție și fără blocare; fiecare marcaj este scris atomic, deci se citește întreg sau deloc |
| 5 | copierea fotografiilor sesizărilor din copie, din directorul activ de fișiere | după T2 |
| 6 | manifestul, redenumirea (abia acum copia devine vizibilă), rotația copiilor, curățarea marcajelor (regula de 46 de zile) | — |

**Ce reprezintă fotografia marcajelor:** starea marcajelor din `BACKUP_DIR` la T2, nu la T1. Între pasul 1 și pasul 4, depunerile și ștergerile continuă normal.

**Garanțiile, din ordinea de scriere a aplicației** (marcajul se scrie **înainte** de confirmarea depunerii sau a ștergerii, iar marcajul contorului nu coboară niciodată):
- **Numere TM:** orice număr prezent în copie a fost confirmat până la T1, iar marcajul lui a fost scris înainte de confirmare. De aici rezultă că marcajul din fotografie este ≥ contorul copiei, **numai în aceste condiții:**
  1. aplicația și comanda de backup folosesc **același `BACKUP_DIR`** (pe staging, același `civic.env`); codul nu verifică acest lucru;
  2. fișierele marcajelor **nu sunt schimbate din afara aplicației** între pașii 1 și 4 (șterse, înlocuite, aduse dintr-o arhivă). Un marcaj al contorului șters în acest interval dă o fotografie fără marcaj (`null`), iar backup-ul se încheie fără eroare;
  3. orice scriere a contorului trece prin codul care scrie marcajul înainte de confirmare (emiterea, sincronizarea, `markers:rebuild-counter`); un test static verifică faptul că, în afară de restaurare, contorul se scrie numai în `server/src/db/reportCounter.ts`.

  **Backup-ul nu compară** marcajul din fotografie cu contorul copiei. Dacă o condiție nu este îndeplinită, consecința este limitată: fotografia se folosește la restaurare numai ca maxim sau reuniune, deci nu poate coborî contorul restaurat. Restaurarea verifică separat marcajul **curent** față de contorul copiei și refuză dacă este mai mic (§6.6). Numerele emise după T2 nu sunt în fotografie; le cunosc marcajele curente sau o copie ulterioară.
- **Ștergeri:**
  - confirmată înainte de T1 → sesizarea lipsește din copie;
  - marcaj scris înainte de T2, confirmare după T1 → sesizarea este în copie, dar intrarea este în fotografie: restaurarea o elimină;
  - marcaj scris după T2 → copia singură nu o cunoaște; o cunosc marcajele curente sau o copie ulterioară (§6.6, §6.7).
- O ștergere anulată după scrierea marcajului lasă intrarea (compromisul documentat în cod): la o restaurare, sesizarea ar fi eliminată, deși ștergerea nu s-a confirmat.

**Limite de consistență:**
- **Fișierele foto nu fac parte din instantaneu.** Ele se copiază după T2, din directorul activ. O sesizare confirmată chiar înainte de T1, al cărei fișier este mutat în directorul final abia după confirmare, sau una ștearsă după T1 poate apărea în copie fără fotografie. La restaurare, ea apare în rezumat ca „fotografii lipsă”.
- **Nu există o protecție explicită împotriva a două backup-uri pornite simultan** (de exemplu, cron și o comandă manuală în aceeași clipă). Riscul este mic, fiindcă backup-ul rulează o dată pe zi.

**Alte reguli față de §3:**
- un marcaj corupt oprește backup-ul (decizia C2): eșecul se vede numai în `backup.log`, care se verifică periodic;
- curățarea marcajelor de ștergere urmează regula de 46 de zile, nu de 7.

### 6.5 Prima instalare peste o bază cu date

Dacă `BACKUP_DIR` nu are încă marcaje, iar baza are deja numere TM emise (cazul staging-ului la instalarea remedierii), aplicația **nu pornește** până la crearea explicită a marcajelor:

```bash
node server/dist/app.js markers:rebuild-counter --at-least <cel mai mare număr TM comunicat vreodată>
# sau, numai dacă baza nu a fost readusă la o stare mai veche:
node server/dist/app.js markers:rebuild-counter --from-db
```

Comanda nu coboară niciodată contorul, refuză dacă marcajul există deja și nu atinge intrările din `deletions/`. Pe găzduire se rulează printr-o sarcină cron temporară.

### 6.6 Restaurarea, pas cu pas (înlocuiește §4)

1. **Opriți aplicația.**
2. **Creați un DB nou** și rulați `migrate` pe el (ca în §4).
3. **Pregătiți un director de fișiere nou, gol** (noul `STORAGE_DIR`). Directorul vechi rămâne neatins până la confirmare.
4. **Copia de restaurat trebuie să stea direct în `BACKUP_DIR`**, lângă marcajele **curente**. O copie veche, adusă din arhivă, se pune lângă marcajele la zi, nu împreună cu marcajele arhivate odată cu ea.
5. **Verificați, fără să scrieți nimic:**
   ```bash
   node server/dist/app.js restore:db "$BACKUP_DIR/civic-backup-<data>" --check
   ```
   Raportul arată copia, ținta, marcajele și fotografiile marcajelor din copiile aflate în director; la final: „PERMISĂ” sau „REFUZATĂ”, cu motivele.
6. **Restaurați:**
   ```bash
   node server/dist/app.js restore:db "$BACKUP_DIR/civic-backup-<data>" --confirm
   ```
7. **Porniți aplicația cu `STORAGE_DIR` pe directorul nou** și verificați `health`.

**Refuzuri fără nicio ocolire, toate înainte de prima scriere:**
- DB țintă cu rânduri sau cu schema nu la zi;
- director de fișiere care nu este gol sau se suprapune cu `BACKUP_DIR`;
- copia în afara `BACKUP_DIR`;
- **marcaje corupte** (marcajul contorului sau o intrare de ștergere ilizibilă): refuz **inclusiv cu `--allow-missing-markers`**;
- marcajul contorului sub contorul copiei;
- copie în formatul `/1`;
- fotografia marcajelor dintr-o copie `/2` nefolosibilă (lipsă, coruptă sau cu suma SHA-256 greșită);
- `--allow-missing-markers` când marcajele sunt prezente.

**Marcaje lipsă** (marcajul contorului, `deletions/` sau ambele): refuz implicit. Restaurarea poate continua **numai** prin procedura de recuperare `--allow-missing-markers --at-least N` (tabelul de mai jos) și numai dacă toate celelalte condiții sunt îndeplinite.

**Marcaje mai vechi decât o copie din director:** refuz fără `--at-least N`; cu N, procedura din tabel.

Un director din `BACKUP_DIR` fără manifest lizibil produce numai un avertisment (decizia C1).

**Cazuri speciale:**

| Situație | Comanda | Ce face |
|---|---|---|
| marcajele **lipsesc** (pierdute definitiv), nu sunt corupte | `--confirm --allow-missing-markers --at-least <N>` | contorul pornește de la cel puțin N; marcajele lipsă sunt refăcute înainte de confirmare. Ștergerile de după copie, necunoscute nicăieri, pot reapărea până la expirarea retenției |
| marcajele din `BACKUP_DIR` sunt mai vechi decât o copie din director (de exemplu, aduse dintr-o arhivă) | `--confirm --at-least <N>` (decizia C3) | se folosesc cele mai noi marcaje cunoscute (cel mai mare contor, reuniunea ștergerilor neexpirate, decizia C4), iar marcajele curente sunt aduse la zi |

N = cel mai mare număr TM comunicat vreodată (din e-mailuri sau din Admin). O valoare sub contorul copiei este refuzată.

**Pe găzduirea cPanel (constatat la M4, 13.10.2026; jurnalul staging-ului, observația 9):** comenzile rulează prin sarcini cron, iar `node` din `nodevenv` pune `CIVIC_ENV_FILE` al aplicației peste cel din linie, deci un al doilea fișier de setări este ignorat. Baza țintă și directorul nou se dau direct în linia cron: `DATABASE_URL='…' STORAGE_DIR=… node server/dist/app.js restore:db … --check` (variabilele din linie au prioritate față de `civic.env`). Linia conține parola bazei: sarcina se șterge imediat după rulare. Orice comandă se verifică întâi cu `--check` (sau `migrate:status`), care arată baza și directorul țintă.

### 6.7 Limitele rămase (cunoscute)

- **Numai arhiva:** dacă `BACKUP_DIR` este înlocuit cu totul de o arhivă veche (inclusiv la o restaurare a întregului cont de către furnizor), ștergerile de după arhivă nu pot fi cunoscute, iar numerele sunt protejate numai prin N. Se evită prin procedură. Întrebarea către furnizor despre copiile proprii ale contului este deschisă.
- Evenimentele de după cea mai nouă copie supraviețuitoare (cel mult o zi), când marcajele curente sunt pierdute.
- O restaurare făcută cu o versiune a aplicației dinaintea remedierii: o refuză singură pentru copiile `/2`, dar nu are niciuna dintre protecțiile de mai sus.

### 6.8 Teste

Local (MySQL 8.0.46, Node 22) și în CI (MySQL 8.0 / 8.4, MariaDB 11.4): server 375/375 la `6da2f68`. Fișierele: `backup.test.ts`, `backupRoutes.test.ts`, `backupSafety.test.ts`, `counterWatermarkA1.test.ts`, `restoreMarkersFormat.test.ts`, `restoreArchiveG2.test.ts`, `markers.test.ts`. 65 de probe cu cod stricat intenționat, toate detectate. Refuzul copiilor `/2` de către versiunea veche este verificat pe codul real `d23ddd5` (identic, pe `server/src`, cu `08f4dc3`).

Proba de restaurare pe găzduire (M4) **nu este încă făcută**; se face după instalarea remedierii pe staging, cu o copie făcută după instalare.
