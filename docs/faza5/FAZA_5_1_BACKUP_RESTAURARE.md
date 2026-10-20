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
  account-deletions/                 ← R18 (Etapa 7, §7): câte un fișier pe cont de cetățean șters de titular
    <ID intern>.json                 ← { accountId, deletedAt }; fără adresă de e-mail; nu expiră
  civic-backup-<data UTC>/
    manifest.json                    ← format „civic-backup/2”, schema, numărul de rânduri, SHA-256
    db.jsonl.gz                      ← rândurile tabelelor
    markers.json                     ← fotografia marcajelor (contorul, ștergerile de sesizări și, din formatul „civic-markers/2”, ștergerile de conturi), luată după instantaneul bazei (§6.4)
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
8. **Mesajele reținute (R19, §7.3):** raportul comenzii de la pasul 6 listează mesajele sesizărilor neplecate în copie, trecute în starea „failed”. Pentru fiecare, un `super_admin` verifică **întâi** dacă mesajul a ajuns la destinatar și abia apoi decide, în detaliul sesizării din Admin, dacă îl reîncearcă. Nimic nu se retrimite automat. Mesajele de stadiu ale sesizărilor fără autor (contul autorului a fost șters) nu sunt reținute: sunt anulate și nu pot fi reîncercate (MINOR-3, §7.3).

**Refuzuri fără nicio ocolire, toate înainte de prima scriere:**
- DB țintă cu rânduri sau cu schema nu la zi;
- director de fișiere care nu este gol sau se suprapune cu `BACKUP_DIR`;
- copia în afara `BACKUP_DIR`;
- **marcaje corupte** (marcajul contorului, o intrare de ștergere a unei sesizări sau, din Etapa 7, a unui cont, ilizibilă sau cu alte câmpuri decât cele permise): refuz **inclusiv cu `--allow-missing-markers`**;
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

- **Numai arhiva:** dacă `BACKUP_DIR` este înlocuit cu totul de o arhivă veche (inclusiv la o restaurare a întregului cont de către furnizor), ștergerile de după arhivă nu pot fi cunoscute, iar numerele sunt protejate numai prin N. Se evită prin procedură. Răspunsul furnizorului (13.10.2026): copiile proprii ale contului sunt incrementale, păstrate 3 luni (prima zi a fiecărei luni) și 7 zile (luna curentă); se restaurează numai pe serverele lor, fără arhive pentru client. O restaurare a contului de către furnizor este deci exact cazul „numai arhiva”: după ea se urmează procedura din **§8** (`host-restore:recover --at-least N`). *(Corectat în 7A, R20: textul anterior trimitea la `restore:db` / `markers:rebuild-counter`, care nu se aplică aici — `restore:db` nu intervine într-o restaurare a contului, iar `markers:rebuild-counter` refuză când marcajul există, ceea ce, după o restaurare a contului, este cazul: marcajul vechi există.)*
- Evenimentele de după cea mai nouă copie supraviețuitoare (cel mult o zi), când marcajele curente sunt pierdute.
- O restaurare făcută cu o versiune a aplicației dinaintea remedierii: o refuză singură pentru copiile `/2`, dar nu are niciuna dintre protecțiile de mai sus.

### 6.8 Teste

Local (MySQL 8.0.46, Node 22) și în CI (MySQL 8.0 / 8.4, MariaDB 11.4): server 375/375 la `6da2f68`. Fișierele: `backup.test.ts`, `backupRoutes.test.ts`, `backupSafety.test.ts`, `counterWatermarkA1.test.ts`, `restoreMarkersFormat.test.ts`, `restoreArchiveG2.test.ts`, `markers.test.ts`. 65 de probe cu cod stricat intenționat, toate detectate. Refuzul copiilor `/2` de către versiunea veche este verificat pe codul real `d23ddd5` (identic, pe `server/src`, cu `08f4dc3`).

Proba de restaurare pe găzduire (M4) **a fost executată la 13.10.2026**, după instalarea remedierii pe staging, cu o copie făcută după instalare; criteriile au fost îndeplinite (jurnalul staging-ului, intervențiile 41–48; abaterea: observația 9). *(Corectat în 7A, R20: textul anterior spunea că M4 nu este încă făcută.)*

## 7. Amendament (Etapa 7, 7A, 16.10.2026): conturile șterse (R18) și coada de e-mail (R19) la restaurare

**Deciziile proprietarului (16.10.2026):** D7-3 partea 1 — R18: varianta A; D7-3a — marcajele de cont fără termen: varianta A; D7-3 partea 2 — R19: varianta B, inclusiv mesajele `on_hold`; după auditul D7-3: intenții de ștergere cu reconciliere, intențiile nereconciliate neaplicate la restaurare (varianta B), backup-ul refuzat la intenții ilizibile (A), fără ID-uri de cont în mesajele pentru operator (B), avertismentul pentru intențiile nereconciliate (D). **Cod:** branch `faza-5-backend`, commitul care introduce acest paragraf.

### 7.1 De ce

- **R18:** restaurarea re-ștergea sesizările marcate, dar nu avea marcaje pentru conturi. Un cont șters de cetățean după data copiei reapărea, cu adresa și acceptarea politicii.
- **R19:** coada de e-mail se restaura cu starea din copie. Un mesaj `queued` sau `sending` în copie, plecat între timp, pleca a doua oară (pentru Primărie: aceeași sesizare, același număr TM).

### 7.2 Conturile șterse (R18): intenție, confirmare, reconciliere

| Regulă | Detaliu |
|---|---|
| Intenția | în tranzacția de ștergere, după blocarea rândului contului și **înainte** de confirmare, se scrie durabil `account-deletions-pending/<ID intern>.json` = `{ accountId, deletedAt }`. Dacă nu poate fi scrisă, contul **nu** se șterge (eroare 500) |
| Marcajul definitiv | după confirmarea tranzacției, intenția este mutată atomic în `account-deletions/`. Numai câmpurile `accountId` și `deletedAt`, **fără adresă de e-mail** |
| Păstrarea | marcajele definitive se păstrează **fără termen**, fără curățare automată (D7-3a) |
| Reconcilierea | la pornirea aplicației și la fiecare backup (înaintea fotografiei marcajelor): contul lipsește → marcaj definitiv; contul există, creat înaintea intenției → tranzacția nu a fost confirmată, intenția se elimină; contul creat după intenție → intenția rămâne, cazul se raportează; eroare (bază, citire, mutare) → intenția rămâne neschimbată, pentru o rulare ulterioară |
| Backup-ul | **refuzat** dacă există intenții ilizibile, înaintea oricărei scrieri: copiile existente și rotația lor nu sunt atinse. O eroare temporară de reconciliere **nu** oprește backup-ul: copia reflectă baza, iar intenția rămâne pentru rularea următoare |
| Restaurarea | marcajele definitive și intențiile (curente și din fotografiile copiilor) se citesc și se validează **înainte de prima scriere**; un marcaj sau o intenție coruptă → refuz. Restaurarea repetă ștergerea făcută de titular (blocarea definitivă redusă la datele minime, mesajele de stadiu neplecate anulate, mesajele de cont șterse, contul șters), **numai după ID** și numai pentru un cont creat **înainte** de `deletedAt` |
| Intențiile nereconciliate | **nu se aplică** la restaurare. Se raportează separat: „Starea ștergerii este necunoscută: poate fi o ștergere anulată sau o ștergere confirmată înainte de reconciliere. Contul rămâne în baza de date; administratorul trebuie să investigheze situația și să decidă ce urmează.” |
| Mesajele pentru operator | numai numere și directoare, fără ID-uri de cont și fără adrese (`--check`, raportul restaurării, ieșirea backup-ului, jurnalul mutării eșuate) |
| Inițializarea directoarelor | `account-deletions/` și `account-deletions-pending/` se creează automat **numai la prima inițializare** (instalare nouă sau `BACKUP_DIR` de dinaintea R18); după ele se scrie martorul `account-markers-initialized.json` |
| Directoare pierdute după inițializare | dovada: martorul sau o copie `civic-markers/2` din `BACKUP_DIR`. Pornirea, backup-ul și `seed:demo` **refuză**; verificarea se face înaintea sincronizării contorului. La refuz: **contorul TM din bază și marcajul lui rămân neschimbate**; **directorul temporar al backup-ului și copia propriu-zisă nu sunt create**. Înaintea verificării rulează numai pregătirea `BACKUP_DIR` (`prepareBackupDir`), comună tuturor pornirilor: **creează `BACKUP_DIR` numai dacă acesta lipsește** și **scrie un fișier de probă, șters imediat**; restaurarea refuză și continuă numai cu `--allow-missing-markers --at-least N`, care reface directoarele și intrările cunoscute din copii. Refacerea pe instalarea vie: comanda `markers:recreate-account-deletions` (intrările din fotografiile copiilor, cu suma SHA-256 verificată). Ștergerile de după cea mai nouă copie nu pot fi cunoscute. **Dacă lipsesc atât marcajul contorului, cât și directoarele R18:** întâi `markers:recreate-account-deletions`, apoi `markers:rebuild-counter` (aceasta din urmă cere directoarele R18 prezente) |
| Copiile vechi | fotografiile `civic-markers/1` (fără conturi) rămân restaurabile; fără nicio dovadă de inițializare R18, un `account-deletions/` absent produce numai un avertisment |
| Conturile `pending` (D7-5) | nu primesc marcaj: `purge:retention` le șterge din nou |
| Dezvoltare, fără `BACKUP_DIR` | nu se scrie nicio intenție și niciun marcaj (ca la sesizări) |

**Limita cunoscută:** dacă ștergerea a fost confirmată, dar intenția nu a fost încă reconciliată (oprire bruscă după confirmare), iar baza de date este pierdută sau readusă la o stare anterioară înainte de reconciliere, contul poate reapărea. Acest caz **nu** este rezolvat automat la restaurare: este raportat cu avertismentul de mai sus.

### 7.3 Coada de e-mail (R19)

**Starea din copie nu arată dacă un mesaj a plecat după copie.** De aceea, la restaurare:

| Mesaje neplecate în copie | Devin |
|---|---|
| codurile de autentificare și anunțurile de blocare (`queued`, `sending`) | `cancelled`, motivul „anulat la restaurare (R19)” |
| mesajele sesizărilor de tip `registry_notification` și `citizen_status_update` (`queued`, `sending`, `on_hold`), cu excepția rândului următor | `failed`, motivul „reținut la restaurare (R19): verificați dacă a plecat înainte de reîncercare”; `next_attempt_at` și `locked_until` golite |
| mesajele `citizen_status_update` (`queued`, `sending`, `on_hold`) ale unei sesizări fără autor (contul autorului a fost șters; MINOR-3, 20.10.2026) | `cancelled`, motivul „anulat la restaurare (R19): contul autorului a fost șters”; nu apar în lista mesajelor reținute și nu au intrare `email.held_on_restore` |
| orice alt mesaj (alt tip sau stare finală) | neschimbat |

- **Nicio retrimitere automată**, nici la reactivarea fluxului către Primărie.
- Raportul `restore:db` listează fiecare mesaj reținut: numărul TM, tipul, starea din copie, data creării și ID-ul mesajului; fără destinatar.
- Auditul: câte o intrare `email.held_on_restore` pe mesaj reținut și o intrare `restore.completed` cu numerele restaurării.
- **Starea `failed` cuprinde două situații:** o eroare de transmitere sau un mesaj reținut deliberat la restaurare; motivul din `last_error`, vizibil în Admin, le deosebește.
- **Reîncercarea poate produce un duplicat** dacă mesajul a plecat totuși după copie. Înainte de reîncercare se verifică la destinatar, mai ales pentru `registry_notification`.
- **Mesajele de stadiu ale sesizărilor fără autor nu se reîncearcă (MINOR-3):** ruta de reîncercare din Admin refuză un `citizen_status_update` al unei sesizări fără autor (409, „contul autorului a fost șters”), inclusiv unul `failed` dinaintea restaurării; `registry_notification` a aceleiași sesizări rămâne reîncercabilă. Aceleași reguli se aplică la recuperarea R20 (§8).

### 7.4 Teste

`server/test/integration/d73RestaurareConturiEmail.test.ts`, `server/test/integration/d73IntentiiConturi.test.ts` și `server/test/integration/d73DirectoareR18.test.ts`. Rezultatele, adaptările testelor existente și probele de control: `docs/faza7/FAZA_7A_RAPORT_sectiunea_D7-3.md`. MINOR-3: `server/test/integration/d73Minor3MesajeConturiSterse.test.ts`; rezultatele și probele: `docs/faza7/FAZA_7A_RAPORT.md` §3.8.

## 8. Restaurarea întregului cont de către furnizor (R20; Etapa 7, 7A, 19.10.2026)

**Decizia proprietarului:** D7-6 = B (19.10.2026): procedura și o comandă minimă de recuperare. (Notată inițial „D7-4 = B”, inclusiv în mesajul commitului `2a79d56`; D7-4 rămâne rezervată matricei CI din `FAZA_7_PLAN.md`. Corespondența: `docs/faza7/FAZA_7A_RAPORT.md` §2.) **Cod:** branch `faza-5-backend`, commitul care introduce această secțiune.

### 8.1 Ce se întâmplă la o asemenea restaurare

Furnizorul restaurează, pe serverele lui, **întregul cont**: baza de date, fișierele, `BACKUP_DIR` (cu toate marcajele) și sarcinile cron revin **împreună** la aceeași stare veche (copiile furnizorului: 7 zile pentru luna curentă, prima zi a lunii timp de 3 luni). `restore:db` nu intervine, deci protecțiile lui nu se aplică.

| Problema | Fără recuperare | După `host-restore:recover` |
|---|---|---|
| Numerele TM | contorul și marcajul sunt vechi: numerele comunicate după copie s-ar emite din nou | contorul și marcajul ridicate la N; următorul număr: N+1 |
| Coada de e-mail | mesajele `queued` / `sending` din starea veche ar pleca din nou la următoarea rulare `outbox:process` (duplicate la Primărie și la cetățeni) | regulile R19 (§7.3): codurile și anunțurile de blocare anulate; mesajele sesizărilor reținute pentru decizia unui `super_admin`; nimic nu pleacă automat |
| Sesizările mai vechi de 45 de zile | readuse de o copie de până la 3 luni | eliminate de retenție, înaintea pornirii |
| Intențiile de ștergere a conturilor (R18) | rămân din starea veche | reconciliate față de baza restaurată |
| Sesizările și conturile șterse după copie | **reapar** | **reapar** — limită acceptată (8.3) |

### 8.2 Procedura, pas cu pas

1. **Înainte de orice cerere către furnizor, notați N** = cel mai mare număr TM comunicat vreodată: în Admin, cea mai nouă sesizare; dacă aplicația nu mai este accesibilă, din e-mailurile trimise (Primăria, cetățenii) sau din jurnalul serviciului de e-mail.
2. **Restaurarea contului se cere furnizorului numai cu decizia proprietarului**, cu data copiei aleasă explicit.
3. **Imediat după restaurare, înainte de orice altceva:** aplicația oprită („Setup Node.js App” → STOP APP) și **toate sarcinile cron dezactivate** (`outbox:process`, `backup:db`, `purge:retention`, `surveys:close-expired` etc.): restaurarea contului readuce și cronurile vechi. Comanda nu poate verifica singură acest pas.
4. **Verificarea, fără nicio scriere:** `node server/dist/app.js host-restore:recover --at-least N --check` (pe găzduire, ca celelalte comenzi: sarcină cron temporară, cu rezultatul în jurnal; vezi §6.6, „Pe găzduirea cPanel”). Raportul arată contorul și marcajul actuale, valoarea nouă și mesajele care ar fi reținute sau anulate. Comanda refuză, fără nicio scriere, dacă N lipsește sau nu este valid, dacă marcajul contorului este corupt sau lipsește (atunci întâi `markers:rebuild-counter --at-least N`), dacă directoarele R18 au fost pierdute (§7.2) sau dacă există intenții R18 ilizibile.
5. **Aplicarea:** aceeași comandă cu `--confirm`. O a doua rulare nu mai schimbă contorul, coada sau datele; adaugă numai încă o intrare de audit `host_restore.recovered`.
6. **Mesajele reținute:** raportul le listează cu numărul TM. Un `super_admin` verifică **întâi** dacă mesajul a ajuns la destinatar, apoi decide în Admin dacă îl reîncearcă (risc de duplicat, §7.3).
7. **Reactivarea:** sarcinile cron reactivate, aplicația pornită (START APP), `health` verificat.

### 8.3 Limitele rămase (acceptate)

- **Sesizările și conturile șterse după data copiei furnizorului reapar:** marcajele lor au fost readuse și ele la starea veche, deci nu există nicio urmă a ștergerii. Dacă sunt cunoscute (de exemplu, din cererile titularilor), se șterg din nou manual: sesizările de către `super_admin`, conturile de către titulari.
- **Mesajele trimise după copie nu sunt cunoscute:** cele reținute se verifică individual (pasul 6).
- **Pașii 3 și 7 (aplicația și cronurile) depind de operator:** comanda nu îi poate verifica.
- **Recuperarea parțială:** contorul TM și coada de e-mail se confirmă într-o primă tranzacție; reconcilierea intențiilor R18 și retenția rulează **după** ea. Dacă una dintre acestea eșuează, comanda raportează eroarea după ce contorul și coada au fost deja modificate. O nouă rulare `--confirm` continuă recuperarea (contorul și coada nu se mai schimbă) și adaugă încă o intrare de audit.

### 8.4 Teste

`server/test/integration/d74RestaurareFurnizor.test.ts` (F1–F8): contorul și marcajul ridicate la N și numărul următor; R19 pe baza vie, fără trimitere automată; retenția; `--check` fără nicio scriere; a doua rulare fără schimbări; N sub contor (nimic nu coboară); refuzurile înaintea oricărei scrieri; comanda reală (proces). Probele de control: `docs/faza7/FAZA_7A_RAPORT_sectiunea_R20.md`.
