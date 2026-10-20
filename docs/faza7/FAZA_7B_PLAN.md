# Plan de execuție — Faza 7B
## Urbis Activ / Turnu Măgurele Civic

**Versiunea 1.2 (rectificată la §10.3) — PLAN APROBAT de proprietar la 20.10.2026; execuția neautorizată**\
**Data:** 20 octombrie 2026\
**Stare:** plan aprobat; nicio subetapă, modificare, commit, push sau operațiune pe staging nu este autorizată prin această aprobare. Integrează amendamentele AM-1…AM-10 și rectificarea §10.3 (vezi §14).\
**Referință declarată:** branch `faza-5-backend`, HEAD `841d219`; `main` `d9bc2c9`; staging `f6d3456`.

> **Starea aprobării, consemnată exact:** AM-1…AM-8 acceptate de proprietar la 20.10.2026. **20.10.2026, 11:19 — proprietarul: „Accept AM-9 și AM-10 și aprob planul Faza 7B, versiunea 1.2 rectificată la §10.3.”** Pasul 10.2.1 este îndeplinit; urmează pașii 10.2.2–10.2.5 (commitul documentar, push-ul, verificarea), fiecare cu aprobare separată, apoi autorizarea 7B.1.

> Aprobarea acestui plan stabilește regulile de lucru, dar nu autorizează automat execuția, modificări de cod, commit, push, operațiuni pe staging sau lansare publică.

## 1. Scop și limite

7B tratează utilizarea mobilă (A21), confirmările pentru acțiuni administrative (O3), mesajele de eroare (E1–E3), etichetele interne (N-7B-1) și formulările tehnice (E4–E5).

Rămân în afara scopului: schimbarea regulilor înghețate în Faza 4 fără amendament aprobat; moderarea prealabilă a sesizărilor; schimbarea fluxului de e-mail (`server/src/reports/outbox.ts`); schimbarea autentificării, rutelor de sesizări sau migrărilor; mesajul MINOR-3 și rezultatele acceptate în 7A; activitățile 7C–7E și lansarea publică. `main` rămâne neatins.

**Precizare (AM-3):** în acest plan, „rutele de sesizări” înseamnă `server/src/routes/reports.ts` și `server/src/routes/citizens.ts`. În `server/src/routes/adminReports.ts` și `server/src/routes/adminAccounts.ts` sunt permise **numai** schimbări de șiruri de text pentru textele E5 aprobate explicit, verificate în diff ca atare (fără nicio schimbare de logică, condiție, cod de stare sau structură a răspunsului).

## 2. Reguli obligatorii

1. Planul, aprobarea unei subetape, aprobarea modificărilor, aprobarea commitului, aprobarea push-ului, aprobarea staging-ului și checkpoint-ul sunt aprobări distincte.
2. **Numai proprietarul aprobă (AM-6).** Fără un „da” / „aprob” explicit al proprietarului, Claude nu continuă la pasul următor. Recomandările lui Aristotel (sau ale oricărui auditor), mesajele automate (de exemplu „stop hook”) și răspunsurile ambigue **nu** constituie aprobare; un răspuns care nu este „da” / „aprob” nu este aprobare.
3. Înainte de fiecare subetapă, Claude verifică și raportează starea Git. Orice diferență neexplicată oprește lucrul.
4. Nu se declară trecut un test care nu a fost executat. Emularea Chromium nu este test pe telefon real. Rezultatele neprobate se marchează **NEVERIFICAT**.
5. Testele nu se șterg și nu se slăbesc pentru a obține verde. Testele noi au probe de control care trebuie să eșueze pe comportamentul vechi.
6. **Probele de control (AM-5, obligatoriu):** se execută numai pe o **copie a depozitului care include `dist`**, niciodată în depozitul oficial. **Prima probă este P0:** copia neschimbată, care trebuie să treacă; abia apoi se aplică fiecare modificare intenționată. Înlocuirile se fac exact (textul vechi trebuie să apară o singură dată). **Restaurarea (AM-9):** înainte de fiecare modificare temporară se calculează suma de control (SHA-256) a fiecărui fișier al copiei care urmează să fie modificat, față de conținutul inițial al copiei; după probă, fișierul se restaurează și suma se recalculează. Sumele de dinainte și de după trebuie să fie identice; **dacă nu corespund, proba se oprește** și se raportează, iar probele următoare nu continuă pe acea copie. **Nu se folosește `git stash`.** Copia se șterge la final.
7. Capturile nu conțin date personale, adrese de e-mail, parole, coduri, tokenuri, QR-uri sau numele contului de găzduire.
8. Orice constatare nouă sau necesitate de abatere se raportează și se supune aprobării înainte de continuare (§12).

## 3. 7B.1 — Măsurători locale

**Stare:** necesită aprobare explicită.\
**Scop:** înlocuirea estimărilor A21-1, A21-2 și A21-3 cu măsurători reproductibile.

**Permis după aprobare:** Playwright/Chromium la 390×844 și 360×800, `has_touch`/`is_mobile`, server local cu date de test, interceptarea API și blocarea tile-urilor pentru a forța bannerele. Scripturile și rezultatele rămân în afara depozitului; build-ul, dacă este necesar, se face pe o clonă de lucru separată.

**Interzis:** modificări în depozitul oficial, staging, commit, push, atingerea `main` sau concluzii despre Safari/telefon real.

**Măsurători:** dreptunghiurile elementelor interactive vizibile pe Acasă, Hartă, Sesizări/formular, Contul meu, Sondaje și toate tab-urile Admin; elemente sub 24 px și sub 44 px; intersecția bannerelor cu zoom-ul și între ele; înălțimea tab-urilor, rândurile și lățimea benzii față de ecran.

**Acceptare:** raport complet cu pagina, elementul, dimensiunile măsurate și capturi fără date personale. Raportul precizează „emulare Chromium — nu telefon real”. Estimările se etichetează ca atare.

**Livrabil și oprire:** raport de măsurători, fără modificări de produs. Claude se oprește. Proprietarul decide A21-2 **și A21-3b (AM-1)** și confirmă criteriile A21-1/A21-3.

## 4. 7B.2 — Remedieri tehnice cu risc redus

**Stare:** necesită aprobarea separată după 7B.1.

**Condiții de intrare:** raportul 7B.1 acceptat; criteriile A21-1/A21-3 confirmate; **decizia A21-3b luată (AM-1)**; aprobarea explicită a 7B.2 și starea Git verificată.

**Scop și fișiere propuse:**
- A21-1: `src/views/MapView.tsx`; bannerele nu acoperă zoom-ul și nu se suprapun.
- A21-3a: `src/views/AdminView.tsx`; tab-uri pe un singur rând, `nowrap`/`shrink-0`, tab activ derulat în vizor. **Intră în 7B.2 numai dacă la A21-3b s-a ales varianta A sau B; dacă s-a ales varianta C (două rânduri), A21-3a se mută în 7B.3, împreună cu A21-3b (AM-1).** Nu se consideră A21-3 complet rezolvat fără indiciu vizibil și accesibil pentru derulare.
- E1: `src/services/apiClient.ts`, `src/hooks/useAsync.ts` și locurile directe inventariate în `MapView`, `IssuesView`, `MyReports`, `SurveyVotingModal`, `PublicSurveysList`, `AdminReports`, `AdminSurveysManager`, `RegistrySettingsPanel`, `ReportForm`. Mesajele `ApiError` legitime se păstrează; erorile JavaScript neașteptate primesc mesaj generic în română.
- E2: `src/services/imageCompressionService.ts`, `ReportForm.tsx`; tip distinct pentru erorile cunoscute de procesare, mesaj generic pentru erorile neașteptate.
- E3: `SurveyFormModal.tsx`; se elimină căile brute necunoscute, păstrând informația utilă despre întrebare/opțiune.

**Teste propuse:** T-A21-1 (zero intersecții la 390 și 360 px); T-A21-3a (un rând, tab activ vizibil, desktop neschimbat la 1280 px); T-E1 (eroare neașteptată generică și mesaj `ApiError` exact); T-E2 (fișier corupt cu mesaj explicit, eroare Canvas neașteptată generică); T-E3 (422 cu `questions.1.options.2` și cheie necunoscută, fără cale brută). Fiecare cu probă de control conform §2.6.

**Acceptare:** testele noi trec, probele de control pică, suitele existente trec, `tsc` și `git diff --check` curate, fără teste slăbite/șterse, fără schimbări neaprobate. Se raportează comenzile, rezultatele și numărul testelor.

**Oprire:** Claude prezintă diff-ul și rezultatele. Commitul necesită aprobare separată.

## 5. 7B.3 — Decizii de produs și implementare aprobată

Nicio decizie din această secțiune nu este aprobată implicit. Se implementează numai variantele și textele aprobate explicit.

**Condiție de intrare (AM-4):** 7B.3 pornește numai după **commitul 7B.2**, pentru a evita conflictele în fișierele atinse de ambele subetape (`MapView.tsx`, `AdminView.tsx`, `AdminReports.tsx`).

### O3 — confirmări
Acțiuni propuse:
1. Reîncearcă e-mailul.
2. **Pornirea fluxului către Primărie: confirmare la fiecare trecere din oprit în pornit (AM-2).** Interfața nu poate ști dinainte dacă există mesaje în așteptare fără o rută nouă de API, care este în afara scopului; de aceea confirmarea apare la fiecare astfel de trecere, iar o salvare cu fluxul deja pornit nu cere confirmare.
3. Marchează sesizarea rezolvată.
4. Închide sondajul.
5. Șterge categoria.

Variante: toate cinci; numai 1, 2 și 5; sau niciuna (limitare acceptată). Recomandarea lui Claude este toate cinci cu `window.confirm`. Confirmarea nu previne tehnic duplicatele de e-mail. Fluxul de trimitere nu se modifică.

Texte propuse:
- Reîncercare: „Verificați întâi dacă mesajul a ajuns la destinatar. Dacă a plecat deja, reîncercarea trimite un duplicat. Continuați?”
- Pornire flux (AM-2): „Eventualele mesaje către Primărie aflate în așteptare vor fi trimise acum către destinatarul salvat. Continuați?”
- Rezolvare: „Marcați sesizarea {TM} ca rezolvată? Stadiul nu se mai poate schimba.”
- Închidere sondaj: „Închideți sondajul „{titlu}”? Închiderea este definitivă.”
- Ștergere categorie: „Sigur doriți să ștergeți categoria „{nume}”?”

Testele trebuie să confirme că „Anulează” nu trimite nicio cerere, „OK” trimite una singură, iar confirmarea fluxului apare la fiecare trecere din oprit în pornit și numai atunci.

### A21-2 — ținte tactile
Decizia se ia numai după 7B.1:
- A: 44 px peste tot pe mobil;
- B: 44 px pe paginile publice și acțiunile Admin, minim 24 px în rest;
- C: păstrarea limitării.
Nicio țintă nu se mărește înainte de alegerea explicită.

### A21-3b — indiciu de derulare
Variante: A) bară subțire vizibilă; B) umbră la margine plus etichetă accesibilă; C) tab-uri pe două rânduri. Se aprobă o variantă sau se acceptă explicit limitarea. **Decizia se ia după 7B.1, odată cu A21-2 (AM-1); dacă se alege C, A21-3a se implementează aici, în 7B.3, nu în 7B.2.** Nu se instalează pe staging o versiune care ascunde tab-uri fără indiciu vizibil.

### N-7B-1 — etichete interne
Inventarul din raportul Claude:
1. Footer: „Versiune: Etapa 1A (Scheletul Aplicației)” — decizie separată.
2. Acasă: „Etapa 1B” — eliminare propusă.
3. Acasă: „Activ (3E)”, „Activ (1B)”, „Activ (3D)” — „Activ” propus.
4. Acasă: „Status Dezvoltare: Faza 5 (versiune de test pe server)” — păstrare/reformulare/eliminare, decizie separată.
5. Comunicate: „Modul Funcțional • Etapa 1C (Evenimente Integrate)” — eliminarea etapei propusă.
6. Ghid: „Modul Funcțional • Etapa 2B” — eliminarea etapei propusă.
7. Ghid: „Status Modul: Etapa 2B…” și referințe la 2A/2B/2C — decizie separată, păstrând informația utilă.
8. Admin: „CMS Activ • Etapa 2C” — „CMS Activ” propus.
9. Taburi Admin: „Comunicate (5B)”, „D. Sondaje Civice (4B)” — eliminarea codurilor propusă.
10. Dashboard Admin: „(Etapa 5B)”, „(Etapa 4B)” — eliminare propusă.
11. Manager sondaje: „… • Etapa 4B” — eliminare propusă.
12. Formular sondaj: „Etapa 4B • Panou Administrativ” — „Panou Administrativ” propus.

Nu se elimină automat informațiile utile cetățenilor împreună cu titlurile tehnice. Schimbarea etichetelor tab-urilor și adaptarea selectoarelor automate se fac împreună, în același grup. Comentariile tehnice din cod sunt în afara scopului.

### E4 — detalii SMTP
Variante: A) păstrare pentru `super_admin`; B) text scurt și detalii la cerere; C) reducerea informației stocate. Recomandarea raportului este A, deoarece jurnalul aplicației nu este accesibil pe hosting. Nicio variantă nu se implementează fără decizie.

### E5 — texte propuse
- Hartă: „Fundalul hărții nu s-a putut încărca (verificați conexiunea). Sesizările rămân afișate.”
- EMAIL_ALLOWLIST: „Pe staging, destinatarul trebuie să fie în lista de adrese permise a serverului.”
- Eliminarea „(A17-1)” din mesajul către Admin.
- Conturi: „Trebuie să rămână cel puțin un administrator principal (super_admin) activ.”
- Jurnal e-mail: „Notificare către Primărie”, „Mesaj de stadiu către cetățean”, „Cod de autentificare”, „Anunț de blocare”; stări: „trimis”, „eșuat”, „în așteptare”, „în coadă”, „anulat”, „blocat”, „simulat”.

Fiecare grup de texte necesită aprobare explicită. Mesajul MINOR-3 nu se modifică. Textele E5 din `adminReports.ts` și `adminAccounts.ts` se limitează la schimbarea șirurilor de text (AM-3, §1).

**Teste și commituri:** testele afectate se adaptează explicit, fără a fi slăbite. Schimbările de texte și selectoarele dependente se livrează în același grup/commit. După fiecare grup, Claude prezintă diff-ul și rezultatele, apoi așteaptă aprobarea commitului.

## 6. 7B.4 — Regresie completă

**Intrare:** grupurile aprobate implementate local, commiturile autorizate și niciun fișier neexplicat.

**Verificări:** suita serverului, suita Python, `tsc`, toate testele noi; măsurători înainte/după; verificare la 1280 px; diff cumulat față de `841d219`; confirmarea că `server/src/reports/outbox.ts`, rutele de sesizări (`server/src/routes/reports.ts`, `server/src/routes/citizens.ts`), autentificarea și migrările nu au fost schimbate, iar în `adminReports.ts` și `adminAccounts.ts` apar numai schimbările de text E5 aprobate (AM-3).

**Acceptare:** niciun eșec neașteptat, numărul testelor explicat, criteriile aprobate îndeplinite, fișierele excluse neatinse. Orice abatere oprește etapa.

**Oprire:** raport către proprietar și aprobare separată pentru push. După push se verifică CI; nu se trece automat la staging.

## 7. 7B.5 — staging și telefon real

**Intrare:** CI verde, aprobare separată pentru instalare și pentru fiecare operațiune pe hosting, acces pregătit și dispozitive disponibile. Crearea unui sondaj activ pentru testare necesită aprobare separată.

**Procedura pe găzduire (AM-7):** aceeași ca la instalarea 7A: proprietarul execută click-urile în cPanel, câte un pas pe rând, după ghidul lui Claude; cererea de captură se pune în pasul în care este necesară, numai acolo unde e nevoie de dovadă. Capturile nu conțin numele contului cPanel, adrese de e-mail, parole, coduri sau QR-uri.

**Probe:** T1 hartă/gesturi/markere; T2 bannere; T3 autentificare și sesiune; T4 sesizare cu fotografie; T5 vot dacă există sondaj activ; T6 Admin pe telefon; T7 confirmările O3 aprobate; T8 fotografie HEIC/camera/galerie în limita dispozitivelor disponibile.

Ideal: iPhone/Safari și Android/Chrome. Ce nu poate fi probat se marchează NEVERIFICAT. Capturile nu conțin date personale. Nu se schimbă setări, nu se trimit e-mailuri în afara scenariului aprobat și nu se șterg datele altor utilizatori.

**Livrabile:** jurnalul operațiunilor staging și proiectul `FAZA_7B_RAPORT.md`. Commitul și push-ul acestei documentații au aprobări separate (AM-8). Proprietarul decide checkpoint-ul 7B separat. Acesta nu aprobă lansarea publică.

## 8. Matrice de trasabilitate

| ID | Etapă | Fișiere principale | Dovezi/criteriu |
|---|---|---|---|
| A21-1 | 7B.1/7B.2 | `MapView.tsx` | zero intersecții la 390/360 px |
| A21-2 | 7B.1/7B.3 | componente stabilite după măsurare | prag ales respectat înainte/după |
| A21-3a/b | 7B.1–7B.3 (A21-3a în 7B.2 numai la variantele A/B; la C, în 7B.3 — AM-1) | `AdminView.tsx` | tab-uri utilizabile și indiciu vizibil |
| E1 | 7B.2 | `apiClient.ts`, `useAsync.ts`, componente inventariate | API legitim păstrat, erori neașteptate generice |
| E2 | 7B.2/7B.5 | `imageCompressionService.ts`, `ReportForm.tsx` | erori cunoscute explicite; probe reale unde disponibile |
| E3 | 7B.2 | `SurveyFormModal.tsx` | fără căi brute |
| O3 | 7B.3 | componente Admin aprobate | anulare fără cerere; OK o singură cerere; confirmarea fluxului la fiecare trecere din oprit în pornit (AM-2) |
| N-7B-1/E5 | 7B.3 | componente și rute afectate (în `adminReports.ts`/`adminAccounts.ts` numai șiruri de text — AM-3) | texte exacte, teste dependente adaptate |
| E4 | 7B.3, dacă se aprobă | conform variantei | diagnostic păstrat conform deciziei |
| Regresie | 7B.4 | diff cumulat | toate criteriile îndeplinite |
| Telefon | 7B.5 | jurnal/raport | rezultat dovedit sau NEVERIFICAT |

## 9. Registrul riscurilor și opririlor

- **Duplicat e-mail:** confirmarea nu garantează prevenirea lui; dacă se propune schimbarea fluxului, oprire și amendament.
- **Densitate Admin:** A21-2 numai după măsurători.
- **Tab-uri ascunse:** A21-3 nu se închide fără indiciu vizibil sau acceptarea explicită a limitării.
- **Lucru refăcut la tab-uri (AM-1):** A21-3b se decide înaintea implementării A21-3a.
- **Conflicte între 7B.2 și 7B.3 (AM-4):** 7B.3 pornește numai după commitul 7B.2.
- **Mesaje utile ascunse:** E1/E2 necesită inventar și probe negative.
- **Teste fragile după schimbarea textelor:** adaptare împreună cu textul, fără slăbire.
- **Diagnostic SMTP:** nu se elimină înainte de decizie și evaluarea alternativei.
- **Safari/HEIC:** nu se declară testate fără dispozitiv real.
- **Date personale:** capturile neconforme se exclud.
- **Aprobări presupuse (AM-6):** numai proprietarul aprobă; orice alt mesaj nu este aprobare.
- **Derivă de scop/stare Git neașteptată:** oprire și raportare înainte de continuare.

## 10. Ordinea aprobărilor

1. Acord explicit asupra acestui plan și asupra eventualelor amendamente.
2. **Salvarea planului canonic (AM-8, AM-10):** planul aprobat se salvează în depozit ca `docs/faza7/FAZA_7B_PLAN.md`, **singura sursă de referință** pentru 7B. Aprobarea planului **nu** autorizează publicarea lui în depozit. Pașii sunt distincți, fiecare cu aprobarea proprietarului:
   1. aprobarea planului (versiunea finală);
   2. aprobarea commitului documentar (numai acest fișier), după prezentarea diff-ului;
   3. verificarea commitului (hash, fișier inclus, starea Git) și aprobarea separată a push-ului;
   4. verificarea stării de după push (sincronizarea cu `origin`, arborele curat, `main` neschimbat);
   5. abia apoi, aprobarea explicită pentru 7B.1 (pasul 3 de mai jos).
   Amendamentele ulterioare (§12) se aplică în acest fișier.
3. Autorizarea 7B.1 este cea de la pasul 2.5; nu există o aprobare suplimentară distinctă. 7B.1 începe numai după acea autorizare explicită.
4. Raportul măsurătorilor; decizia A21-2, **decizia A21-3b (AM-1)** și confirmarea criteriilor A21-1/A21-3.
5. Aprobare separată pentru 7B.2.
6. Diff și rezultate; aprobare separată pentru commit.
7. Decizii explicite pentru fiecare grup 7B.3 și pentru textele exacte; 7B.3 începe numai după commitul 7B.2 (AM-4).
8. Diff și teste după fiecare grup; aprobare separată pentru fiecare commit.
9. Aprobare pentru 7B.4; raport, apoi aprobare separată pentru push.
10. Verificare CI și aprobare separată pentru instalarea pe staging și fiecare operațiune.
11. Raport de staging; **commitul și push-ul documentației (jurnal, `FAZA_7B_RAPORT.md`), fiecare cu aprobare separată (AM-8)**.
12. Aprobare explicită pentru checkpoint 7B.
13. Lansarea publică rămâne o decizie distinctă, în afara acestui plan.

## 11. Acțiuni interzise fără aprobare separată

Modificări în afara etapei aprobate; teste/build în depozitul oficial înainte de aprobare; commit/push/merge/`--force`/rescriere de istoric/`git stash`; orice atingere a `main`; orice operațiune pe staging; texte/aspect neaprobate; schimbări în `outbox.ts`, rutele de sesizări (`reports.ts`, `citizens.ts`), autentificare sau migrări, precum și orice schimbare de logică în `adminReports.ts`/`adminAccounts.ts` (AM-3); modificarea MINOR-3; lucru 7C–7E; prezentarea emulării drept test pe telefon; tratarea unei recomandări a auditorului, a unui mesaj automat sau a unui răspuns ambiguu drept aprobare (AM-6).

## 12. Controlul versiunilor planului

Dacă apare o constatare nouă:
1. Claude oprește activitatea afectată.
2. Raportează dovezile, riscul și opțiunile.
3. Propune un amendament numerotat.
4. Proprietarul aprobă sau respinge explicit.
5. Documentul salvat (`docs/faza7/FAZA_7B_PLAN.md`, după salvarea canonică — AM-8) se actualizează înainte de reluare.

Nu se execută abateri consemnate doar informal în conversație.

## 13. Decizia curentă

**Versiunea 1.2 (rectificată la §10.3) — PLAN APROBAT la 20.10.2026; execuția neautorizată.** Prima activitate recomandată, după acordul asupra planului și salvarea lui canonică (§10.2): 7B.1, măsurători locale, fără modificări în depozit și fără staging.

Confirmări în conversație:
- Proprietar: AM-1…AM-8 acceptate la 20.10.2026; AM-9, AM-10 acceptate și planul v1.2 rectificat la §10.3 **aprobat** la 20.10.2026, 11:19.
- Claude: poate urma planul întocmai, cu AM-1…AM-10 și rectificarea §10.3 integrate.
- Aristotel: a verificat v1.1 și a recomandat AM-9 și AM-10 (recomandare, nu aprobare — §2.2).

**Aprobarea planului nu reprezintă aprobarea execuției, a commitului, push-ului, staging-ului sau lansării publice.**

## 14. Registrul amendamentelor

| Nr. | Rezumat | Integrat în |
|---|---|---|
| AM-1 | A21-3b se decide după 7B.1, odată cu A21-2; A21-3a în 7B.2 numai la variantele A/B, la C în 7B.3 | §3, §4, §5 (A21-3b), §8, §9, §10.4 |
| AM-2 | confirmarea pornirii fluxului la fiecare trecere din oprit în pornit; textul cu „Eventualele” | §5 (O3, punctul 2 și textul), §8 |
| AM-3 | definiția „rutelor de sesizări”; în `adminReports.ts`/`adminAccounts.ts` numai șiruri de text E5 aprobate | §1, §5 (E5), §6, §8, §11 |
| AM-4 | 7B.3 pornește numai după commitul 7B.2 | §5 (condiția de intrare), §9, §10.7 |
| AM-5 | probele de control: copie cu `dist`, P0 întâi, fără `git stash` | §2.6, §4 (teste) |
| AM-6 | numai proprietarul aprobă; auditorul, mesajele automate și răspunsurile ambigue nu sunt aprobare | §2.2, §9, §11, §13 |
| AM-7 | procedura pe găzduire ca la 7A, pas cu pas, capturi numai unde e nevoie, fără date sensibile | §2.7, §7 |
| AM-8 | salvarea canonică `docs/faza7/FAZA_7B_PLAN.md` ca singură sursă; commit/push separate pentru documentația 7B.5 | §7 (livrabile), §10.2, §10.11, §12.5 |
| AM-9 | restaurarea după probele de control: SHA-256 înainte și după, față de conținutul inițial al copiei; nepotrivire → proba se oprește | §2.6 |
| AM-10 | salvarea planului canonic în pași distincți: aprobarea planului, commitul, verificarea și push-ul, verificarea de după push, apoi 7B.1 | §10.2, §10.3, §13 |
| Rectificare | §10.3 formulat ca trimitere la pasul 2.5 (o singură autorizare pentru 7B.1); observație de redactare a lui Aristotel, fără schimbare de fond | §10.3 |

AM-1…AM-8: acceptate de proprietar la 20.10.2026. AM-9, AM-10 și rectificarea §10.3: recomandate de Aristotel, acceptate de proprietar la 20.10.2026, 11:19.
