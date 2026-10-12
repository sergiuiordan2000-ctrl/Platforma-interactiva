# FAZA 6 — PLAN DETALIAT (aprobat)

**Proiect:** Urbis Activ (fost „Turnu Măgurele Civic”) · **Branch:** `faza-5-backend` · **Data:** 10.10.2026
**Stare:** **aprobat de proprietar la 10.10.2026** (versiunea 2, cu precizarea D-5 pentru T3). Autorizat la aceeași dată: Pasul 3A (numai cod de test), pregătirea ghidului pentru M1–M3 și verificările locale ale testului. Restul rămâne neautorizat (§0).
**Istoric:** versiunea 1 (propunerea); versiunea 2 (deciziile D-1…D-4, condițiile sursei B, criteriul T3 cu metoda de test, regula dovezilor armonizată); aprobarea, cu D-5.
**Baza:** Planul de Lucru Comun v1.1, Faza 6 („Integrare și checkpoint MVP”), citit cu `docs/AMENDAMENTE_PLAN_V1_1_SI_MASTER_PLAN.md`; designul înghețat din `docs/faza4/` și amendamentele aprobate (`PROJECT_RULES_AND_DECISIONS.md` §13); `docs/faza5/FAZA_5_RAPORT_FINAL.md` (§6, §7, §11).
**Stare Git la redactare:** `faza-5-backend` = `490c07b`; `main` = `d9bc2c9`, neatins. Staging: `08f4dc3`.

## 0. Deciziile proprietarului și limitele autorizării (10.10.2026)

| # | Decizia |
|---|---|
| D-1 | Structura generală și cele cinci etape ale Fazei 6 sunt aprobate. |
| D-2 | **Sursa B pentru `TRUST_PROXY`: aprobată condiționat**, numai dacă răspunsul furnizorului întârzie sau este insuficient, cu condițiile din Pasul 2. Nu autorizează aplicarea configurației finale. |
| D-3 | **Regula dovezilor: aprobată**, cu precizarea că o probă manuală poate fi susținută și prin alte dovezi adecvate (un e-mail de test primit, rezultatul unei comenzi, o interogare verificabilă). O relatare fără dovezi suficiente nu se declară test trecut. Capturile rămân necesare pentru verificările vizuale, dacă nu există o dovadă alternativă adecvată (§4). |
| D-4 | **Ordinea:** testul automat cap-coadă și probele manuale M1–M3 pot începe înainte de rezolvarea `TRUST_PROXY`, în limitele de siguranță din plan. **Reauditul de securitate nu se închide înainte de verificarea `TRUST_PROXY`.** |
| D-5 | **Precizare pentru T3:** cererile normale și cele cu antet falsificat se fac **sub pragul limitei**; se compară **aceeași cheie** din `rate_limits`, pentru **același endpoint**, înainte și după fiecare cerere; dacă limita este atinsă, rezultatul este ambiguu sau apar chei neașteptate, proba **se oprește** și se raportează. Un rezultat neconcludent nu se declară test trecut. |

**Autorizat (10.10.2026):** Pasul 3A, exclusiv în codul de test; ghidul `FAZA_6_GHID_PROBA_STAGING.md` pentru M1–M3; verificările locale care arată că testul automat detectează abaterile din plan.

**Neautorizate încă:** modificări ale codului aplicației, ale schemei sau ale contractelor API; commit sau push; deploy; modificări ale `civic.env`, ale setărilor staging-ului sau ale altor configurații de găzduire; începerea probelor manuale pe staging; orice modificare pe `main`. Fiecare intervenție pe găzduire cere aprobare separată.

Despre numerotare: Planul v1.1 nu numerotează pașii Fazei 6. Îi numesc „Pasul 1 … Pasul 5 al Fazei 6”. Nu folosesc „6.1 … 6.5”, pentru că aceste numere aparțin deja Etapei 6 (istorice, închise).

## 0.1 Amendamente și erate (11–12.10.2026)

> Au prioritate față de textul de mai jos, acolo unde se contrazic. Textul original rămâne ca istoric.

**Amendamentul D-2 (decizia proprietarului din 12.10.2026).** Sursa B pentru `TRUST_PROXY` este **pagina de diagnostic din aplicație** (`GET /api/v1/diag/client-ip`, commit `f982896`), nu o aplicație separată, cum cerea D-2. Motivul: măsoară exact drumul real al cererilor către Urbis Activ. Condițiile care o înlocuiesc pe prima („separată de Urbis Activ”):
- pagina există numai cu `DIAG_CLIENT_IP=on` în `civic.env` (altfel 404); în producție configurarea refuză setarea (aplicația nu pornește);
- pe staging stă în spatele lacătului, cu `noindex`; nu scrie nimic, nu atinge baza de date;
- întoarce valori numai pentru 12 anteturi de adresă; pentru celelalte, numai numele (niciodată `Cookie`, `Authorization`, variabile de mediu);
- pornirea și oprirea pe staging sunt intervenții pe găzduire, fiecare cu aprobare separată;
- **după închiderea Pasului 2, codul paginii se scoate din aplicație, printr-un commit separat**, înaintea versiunii de lansare.
Celelalte condiții ale D-2 rămân. Aprobarea paginii nu autorizează aplicarea configurației finale `TRUST_PROXY`.

**Erată la Pasul 2, punctul 2 (constatarea R11).** Afirmația „aplicația acceptă un număr de niveluri” este greșită în efect: în Fastify 5.12.5, o valoare numerică pentru `TRUST_PROXY` este primită de configurare, dar **nu are niciun efect**. Formele cu efect sunt `true` și o listă de adrese. Comentariile din `server/src/config.ts` și `.env.example` se corectează odată cu Pasul 2.

**Sursa A (furnizorul).** Tichetul din 09.10.2026 nu avea răspuns la 12.10.2026; a fost marcat „rezolvat” fără răspuns. La 12.10.2026 s-au trimis din nou întrebările, plus două noi (păstrarea jurnalului de accesări; copiile proprii ale contului), iar furnizorul a fost contactat telefonic.

**M4 (rândul din tabelul Pasului 3B), după remedierea backup-ului (`961fc76`, `6da2f68`):**
- copia folosită este făcută **după** instalarea remedierii pe staging (formatul `civic-backup/2`); copiile anterioare nu se restaurează;
- întâi `restore:db <copie> --check`, apoi `--confirm`; țintele: o bază nouă, separată, cu utilizator propriu, și un director de fișiere **nou, gol**; copia stă direct în `BACKUP_DIR`;
- scenariul: două sesizări de probă A și B (cu fotografie, fără transmitere către Primărie) → backup la cerere → A ștearsă din aplicație, C depusă → restaurare în baza nouă;
- criterii: comanda se încheie fără erori; A lipsește, B există cu fotografia, C lipsește; contorul din baza nouă este numărul lui C; interogările de citire pe baza activă, lista bazelor de date și lista fișierelor active sunt identice înainte și după;
- oprire la orice eroare sau la orice cale activă apărută în `--check`; la final se șterg baza de probă, utilizatorul ei, directorul, setările și sarcina cron de probă.
Procedura completă: `docs/faza5/FAZA_5_1_BACKUP_RESTAURARE.md`, §6.

## 1. Obiectiv

Planul v1.1 cere pentru Faza 6: verificarea fluxului critic de la un capăt la altul, reauditul de securitate și un checkpoint formal înainte de Etapa 7.

Faza 6 **verifică**; nu adaugă funcții. Ce nu face:

- nu pornește modul e-mail `live` și nu folosește date reale ale cetățenilor;
- nu redeschide subfazele 5.1–5.7;
- nu rezolvă condițiile dinaintea datelor reale care nu țin de verificare (politica de utilizare, acordul Primăriei, paginile Google pentru producție): acestea rămân în registrul problemelor deschise.

## 2. Fluxul critic: scenariul și criteriile lui

Fluxul din Planul v1.1, citit cu amendamentele (fără „Moderare”):

**Cetățean (cont) → DB → Hartă (imediat) → E-mail către Primărie (numai la cerere) → „în analiză” → „rezolvată” (subcontul Primăriei).**

| # | Actor | Acțiune | Criteriu verificabil | Regula |
|---|---|---|---|---|
| F1 | vizitator | deschide „Depune o sesizare” fără cont | vede „Contul meu”, nu formularul; restul aplicației merge fără cont | A-9 |
| F2 | cetățean | se autentifică (cod primit pe e-mail sau Google), cu regulile bifate | apare bara „Autentificat ca …”; fără bifă, autentificarea este refuzată | A-9, 2.9, amendamentul Google |
| F3 | cetățean | completează formularul: categorie, descriere, locație (text și pin în UAT), fotografie, cere transmiterea către Primărie și notificări | confirmare cu `TM-XXX`, afișată numai după salvarea pe server | D6-2, 2.12 |
| F4 | sistem | salvează sesizarea | în DB: autorul este contul; fotografia fără EXIF; stadiul „nouă”; numărul `TM` nerefolosit | B5, D25–D26 |
| F5 | oricine | deschide harta | sesizarea apare **imediat, fără moderare**; în popup și în pagină nu apar e-mailul autorului sau ID-ul intern; coordonatele publice au 4 zecimale | D9, 2.3, A-7 |
| F6 | sistem | trimite e-mailul către Primărie | mesajul pleacă **numai pentru că cetățeanul a cerut**; are fotografia atașată; nu are `Reply-To`; rândul din coadă devine `sent` | pct. 7, N3-7, A17-6 |
| F6n | — | proba negativă | o sesizare **fără** cererea de transmitere nu produce niciun e-mail către Primărie și rămâne „nouă” | pct. 7 |
| F7 | sistem | schimbă stadiul | „în analiză” apare **numai după** ce transmiterea este confirmată (`sent`); autorul primește notificarea, dacă a cerut-o | DN-09, D9, 2.2 |
| F7n | — | proba negativă | nimeni nu poate seta manual „în analiză” (409); cu e-mailul nelivrat (`simulated`, `blocked`) stadiul rămâne „nouă” | DN-09 |
| F8 | subcontul Primăriei (`primarie_operator`) | marchează „rezolvată” | reușește numai pentru o sesizare „în analiză” și numai când Primăria participă prin platformă; autorul primește notificarea; harta arată „rezolvată” | 2.1, P-9 |
| F8n | — | probele negative | `super_admin` nu poate marca „rezolvată” (403); operatorul nu poate rezolva o sesizare „nouă” (409); cu Primăria „numai pe e-mail”, „rezolvată” nu este disponibilă (403) | 2.1 |
| F9 | operator, public | permisiuni | operatorul nu vede e-mailul autorului, nu poate șterge, nu vede jurnalul e-mail; publicul nu ajunge în Admin | B4, A-8, 2.11 |
| F10 | autor / `super_admin` | șterge sesizarea | dispare din listă, din DB și de pe hartă; numărul `TM` nu se refolosește | A-1 |

Retenția de 45 de zile face parte din ciclul sesizării, dar nu poate fi probată manual într-o zi: rămâne acoperită de testele automate cu ceas simulat și este declarată ca atare în raport.

## 3. Pașii Fazei 6

### Pasul 1 — Planul

Acest document. Criteriu: aprobat de proprietar. Dovada: commit-ul planului, după aprobare.

### Pasul 2 — `TRUST_PROXY`

**Ordinea de lucru (cea aprobată):**

1. **Identificarea configurației reale.** Trei întrebări de lămurit: de la ce adresă vede aplicația conexiunea serverului web; în ce antet se află adresa vizitatorului; ce face serverul web cu un antet de același fel trimis de vizitator (îl înlocuiește sau îl păstrează).
   - Sursa A: răspunsul furnizorului la tichetul din 09.10.2026.
   - Sursa B (aprobată condiționat, D-2: numai dacă A întârzie sau este insuficientă): o mică aplicație de diagnostic, pe un subdomeniu temporar. Condițiile ei:
     - este **separată de Urbis Activ**: alt folder, altă aplicație Node; nu folosește codul, baza de date, fișierul de setări sau cheile aplicației;
     - este **protejată prin parolă** (același fel de lacăt ca staging-ul) și are `noindex`;
     - **expune numai ce este necesar**: adresa conexiunii văzută de aplicație și antetele legate de adresa clientului (`X-Forwarded-For`, `X-Real-IP`, `Forwarded` și cele pe care le indică furnizorul). Nu afișează antetele `Authorization` și `Cookie` și nici variabilele de mediu;
     - **nu păstrează nimic**: fără bază de date, fără fișiere scrise, fără jurnal propriu, fără secrete sau date de autentificare;
     - **se elimină după verificare** (aplicația, subdomeniul, folderul, parola), iar eliminarea se consemnează în jurnal;
     - crearea și ștergerea ei sunt intervenții pe găzduire, fiecare cu aprobare separată. Aprobarea sursei B **nu** autorizează aplicarea configurației finale `TRUST_PROXY`.
   - Răspunsul furnizorului nu se ia de bun fără probă: configurația se confirmă prin testele de mai jos.
2. **Stabilirea configurației sigure**, scrisă și motivată într-un document (`docs/faza6/FAZA_6_TRUST_PROXY.md`), înainte de a fi aplicată. Aplicația acceptă deja pentru `TRUST_PROXY` un număr de niveluri sau o listă de adrese; dacă una dintre aceste forme ajunge, schimbarea este o singură linie în `civic.env`, fără cod.
3. **Aplicarea pe staging** (intervenție pe găzduire, cu aprobare separată) și verificarea.

**Criterii de acceptare (cele patru condiții ale proprietarului):**

| # | Condiția | Cum se verifică pe staging | Dovada |
|---|---|---|---|
| T1 | aplicația identifică adresa reală a clientului | două autentificări în aceeași zi, de pe calculator și de pe telefon cu date mobile; amprentele de IP din tabela `sessions` trebuie să fie **diferite** (la 09.10.2026 erau identice) | rezultatul interogării (numai citire) |
| T2 | limitele funcționează separat pe client | clientul A atinge o limită pe IP (de exemplu a 21-a pornire Google într-o oră → mesajul de limită); clientul B, de pe altă rețea, nu este afectat | rezultatul interogării pe `rate_limits` (două rânduri, cu amprente diferite și contoare separate); captura mesajului de limită la A și a ecranului nelimitat la B |
| T3 | un antet falsificat nu schimbă adresa clientului identificată de aplicație | metoda este descrisă mai jos, sub tabel | linia antetului trimis; rezultatul interogării, înainte și după |
| T4 | comportament corect pe staging | `health`, autentificarea Admin și a cetățeanului, o sesizare, un vot | capturi |

**Metoda de test pentru T3** (pe staging, după aplicarea configurației):

1. **Ce se observă.** Aplicația ține, pentru fiecare limită pe IP, un rând în tabela `rate_limits`, al cărui nume conține amprenta adresei clientului (de exemplu `citizen:google:start:ip:<amprenta>`), și un contor. O interogare numai de citire arată deci direct ce adresă a identificat aplicația pentru o cerere.
2. **Cum se trimite antetul.** Cererea se trimite cu `curl` de pe calculatorul proprietarului (comandă dată de Claude). `curl` trimite antetele exact cum sunt scrise, spre deosebire de un formular din pagină. Dovada transmiterii efective: linia antetului din ieșirea comenzii (`> X-Forwarded-For: …`), filtrată astfel încât să nu apară linia `Authorization` (parola lacătului).
3. **Brațul normal (N).** Cererea fără antet fals. Interogarea arată rândul cu amprenta A, contor +1.
4. **Brațul falsificat (S).** Aceeași cerere, de pe același calculator, în aceeași oră, cu antetul fals `X-Forwarded-For: 203.0.113.7` (adresă rezervată pentru documentație). Se repetă pentru fiecare formă relevantă: mai multe valori în același antet; `X-Real-IP`; `Forwarded`; orice alt antet pe care identificarea configurației (punctul 1 al Pasului 2) îl arată ca folosit de găzduire.
5. **Criteriul.** **Trecut** numai dacă, după fiecare cerere din brațul S, contorul crește pe **același** rând (amprenta A) și **nu apare niciun rând nou**. **Eșuat** dacă apare un rând cu altă amprentă: aplicația a crezut antetul.
   - **Sub prag (D-5):** toate cererile probei, normale și falsificate, rămân sub limita endpoint-ului (20 pe oră la pornirea Google). Înainte de probă se citește contorul curent; proba folosește cel mult 6 cereri și nu începe dacă, împreună cu ele, contorul ar trece de 15.
   - **Aceeași cheie, același endpoint (D-5):** interogarea se rulează înainte și după **fiecare** cerere și urmărește o singură cheie, a aceluiași endpoint; se notează contorul de fiecare dată (de exemplu 3 → 4 → 5).
   - **Oprire (D-5):** dacă o cerere primește răspunsul de limită (429), dacă contorul nu crește cu exact 1, dacă apare o cheie neașteptată sau dacă rezultatul nu poate fi citit fără dubiu, proba se oprește și se raportează ca **neconcludentă**. Un rezultat neconcludent nu este „trecut” și nu este „eșuat”.
6. **Martorii, ca testul să nu treacă din greșeală:**
   - *martorul de sensibilitate:* proba T1 arată că amprenta **se schimbă** când adresa reală se schimbă (calculator față de telefon), deci metoda vede o schimbare de adresă atunci când ea există;
   - *martorul de transmitere:* linia antetului din ieșirea `curl` arată că antetul a plecat efectiv;
   - *martorul local:* un test automat, local și în CI, pornește aplicația o dată cu o setare intenționat nesigură (antetul este crezut) și o dată cu setarea aleasă pentru staging. În primul caz antetul fals **schimbă** adresa văzută; în al doilea **nu**. Astfel se arată că testul poate detecta o configurație greșită. Testul este cod nou de test și se scrie numai după aprobare.

**Precondiție:** T3 este valabil numai dacă T1 a trecut **în aceeași configurație**. Fără setare, aplicația vede o singură adresă pentru toți, iar un antet fals nu schimbă nimic: T3 ar „trece” fără să dovedească nimic. De aceea T3 se rulează după T1, nu înaintea lui.

T3 nu se consideră trecut pe baza testului local, a răspunsului furnizorului sau a faptului că aplicația funcționează; este nevoie de brațele N și S pe staging, cu dovezile lor.

**Condiții de oprire:**

- dacă nicio formă existentă a setării nu este sigură pe această găzduire (de exemplu serverul web nu curăță antetul primit de la vizitator) → **mă opresc** și prezint constatările și variantele; nu se activează nimic;
- dacă soluția cere modificarea codului aplicației → mă opresc și prezint modificarea propusă, pentru aprobare;
- dacă T1–T4 nu trec toate → setarea se scoate (o linie din `civic.env`, apoi Restart), iar starea se raportează ca eșec.

Nu se presupune că vreun antet este de încredere și nu se activează o configurație doar ca testele să treacă.

### Pasul 3 — Testul complet al fluxului

**3A. Testul automat cap-coadă** (local și în CI)

Un singur test nou, în browser, care parcurge F1–F10 fără întrerupere, pe aplicația pornită local, cu un server de e-mail local de test (fără niciun mesaj real). Acoperă și probele negative F6n, F7n, F8n.

- Ce există deja: bucățile fluxului sunt testate separat (formularul și harta în browser; e-mailul și tranzițiile pe server). Lipsește un test care să le lege într-un singur drum, cu rezolvarea făcută de operator din interfață.
- Criteriu: testul trece local și în CI; proba de control (codul stricat intenționat, pe o copie → testul pică) este făcută pentru fiecare tranziție de stare.
- Este cod nou de test: se scrie numai după aprobarea începerii lucrărilor. Nu schimbă codul aplicației.
- **Condiție de oprire:** dacă testul nu se poate scrie fără a modifica aplicația, mă opresc și prezint ce ar trebui schimbat.

**3B. Proba manuală pe staging** (proprietarul, după un ghid pas cu pas: `docs/faza6/FAZA_6_GHID_PROBA_STAGING.md`)

Numai date de test; e-mailul rămâne în `allowlist`; destinatarul „Primăriei” rămâne adresa de test.

| Proba | Conținut | Criteriu | Dovezi cerute (§4) |
|---|---|---|---|
| M1: fluxul unei sesizări | F1–F8 pe staging: cont, sesizare cu fotografie și pin, harta, e-mailul de test către „Primărie”, „în analiză”, rezolvarea de către subcontul Primăriei, notificările | fiecare rând F1–F8 îndeplinit | F3: captura confirmării cu `TM-XXX`. F4: interogare numai de citire (stadiul, felul poziției, existența fotografiei). F5: captura hărții cu popup-ul. F6: mesajul de test primit (expeditor, destinatar, ora, atașamentul) și rândul din jurnalul e-mail din Admin. F7: captura stadiului „în analiză” și notificarea primită. F8: captura stadiului „rezolvată” (Admin și hartă) și notificarea primită |
| M2: tranziții și permisiuni | F6n, F8n, F9: sesizare fără transmitere; `super_admin` încearcă „rezolvată”; operatorul pe o sesizare „nouă”; ce vede și ce nu vede operatorul | fiecare refuz apare așa cum este proiectat | F6n: interogare (niciun rând de transmitere pentru acea sesizare; stadiul „nouă”) și lipsa mesajului. F8n, F9: capturi ale ecranelor (verificări vizuale) |
| M3: sondaj pe staging-ul nou | un vot la sondajul activ; al doilea vot refuzat; rezultatele după regula sondajului (D3); rezultatele în Admin | votul numărat o singură dată; rezultatele vizibile numai când regula o permite | captura confirmării votului și a refuzului celui de-al doilea; interogare numai de citire cu numărul de voturi înainte și după (crește cu exact 1); captura rezultatelor din Admin |
| M4: restaurarea unui backup | restaurare **într-o bază de date nouă, separată**, cu un folder de fișiere separat; baza și fișierele existente nu sunt atinse | comanda se încheie fără erori; numărul de rânduri și de fotografii restaurate corespunde backup-ului; baza existentă este neschimbată | ieșirea comenzii de restaurare (rezumatul ei); interogări numai de citire pe baza nouă și pe cea existentă, înainte și după; lista bazelor de date înainte și după (captură) |

Interogările sunt date de Claude, gata de lipit, numai de citire (`SELECT`), și nu afișează adrese de e-mail, parole sau chei.

Pregătiri pe staging pentru M1–M2, toate din aplicație (Admin), nu din cPanel: un cont `primarie_operator` de test; trecerea fluxului către Primărie pe „participă prin platformă” (acum este „numai e-mailuri”).

Pentru M4, înainte de exercițiu: verific în cod și local ce scrie comanda de restaurare în afara bazei noi (fișiere, contorul `TM`), ca exercițiul să nu poată atinge datele existente. Pe găzduire, M4 cere o bază de date nouă și o sarcină cron temporară (comanda are argumente, iar „Run JS script” nu le acceptă); fiecare este o intervenție pe găzduire, cu aprobare separată. Baza de probă se șterge la final.

**Condiții de oprire la 3B:** orice pas care ar putea scrie în baza sau în fișierele existente în timpul M4; orice mesaj plecat către o adresă din afara listei; orice comportament diferit de cel proiectat (se consemnează ca eșec, nu se „repară” pe loc).

### Pasul 4 — Reauditul de securitate

**Se face după ce Pasul 2 este verificat.** Punctul 6 (limitele anti-abuz) nu se poate închide înainte.

| # | Domeniu | Ce se verifică | Cum |
|---|---|---|---|
| S1 | autentificarea | parole, blocarea după eșecuri, TOTP și codurile de recuperare (Admin); codul pe e-mail: expirare, încercări, limita zilnică; Google: PKCE, `state`, `nonce`, `email_verified`, bifa obligatorie | revizuirea codului; testele existente; probe pe staging |
| S2 | sesiunile | cookie `__Host-`, `HttpOnly`, `Secure`, `SameSite`; duratele Admin; sesiunea de cetățean fără expirare (risc acceptat); ieșirea și revocarea; protecția CSRF | cod; teste; antetele reale de pe staging |
| S3 | autorizarea | inventarul complet al rutelor, fiecare cu garda ei, comparat cu matricea B4 (26 / 12) și cu drepturile exclusive `super_admin` | tabel rută → gardă, generat din cod; teste |
| S4 | datele personale expuse public | proiecția publică a sesizării; conținutul paginilor publice; fotografiile fără EXIF; anonimatul votului (fără IP lângă vot și în jurnal); răspunsuri care nu arată dacă o adresă are cont | cod; testele de suprafață publică; probe pe staging |
| S5 | date de intrare | validarea strictă a cererilor; SQL numai parametrizat; afișarea textelor introduse de utilizatori (XSS), inclusiv în popup-ul hărții | cod; teste |
| S6 | limitele anti-abuz | limitele pe IP, pe cont și pe adresă; capcana și timpul minim; ALTCHA; comportamentul cu adresa reală a clientului | după Pasul 2; teste; proba T2 |
| S7 | antetele de securitate | CSP, HSTS, `frame-ancestors`, `nosniff`, politica de referință; redirecționarea HTTPS | antetele reale de pe staging (captură din browser) |
| S8 | încărcarea fotografiilor | tipul real al fișierului, mărimea, numărul, rescrierea imaginii, numele fișierelor, servirea lor | cod; teste |
| S9 | dependențele | vulnerabilități cunoscute în pachetele folosite în producție | `npm audit`, cu lista rezultatelor |
| S10 | secrete și configurare | repository fără secrete; fișierul de setări cu drepturi restrânse; setarea de test refuzată pe staging și în producție; refuzul datelor demo în producție | scanarea repository-ului; teste; confirmarea proprietarului pentru drepturile fișierului |
| S11 | erori și jurnal | fără date personale sau secrete în mesaje și în jurnal | cod; teste |
| S12 | constatările vechi | fiecare constatare din auditurile anterioare (auditul general, P0, Etapa 6): starea ei de acum | tabel constatare → stare |

Rezultatul: `docs/faza6/FAZA_6_REAUDIT_SECURITATE.md`. Fiecare constatare are gravitate, dovadă și o propunere. **Vulnerabilitățile și remedierile se prezintă separat; nimic nu se repară fără aprobare.** Aprobarea acestui plan nu autorizează modificări funcționale sau de arhitectură.

Limită de spus de la început: reauditul este făcut de Claude, care a scris și codul. Auditul independent rămâne cel al lui ChatGPT, la checkpoint.

### Pasul 5 — Raportul și checkpoint-ul

`docs/faza6/FAZA_6_RAPORT.md` va avea șase liste separate:

1. verificări **trecute**;
2. verificări **eșuate**;
3. verificări **neefectuate**;
4. **limitări acceptate explicit** (cu decizia și data);
5. probleme care **blochează checkpoint-ul MVP**;
6. probleme care **blochează lansarea publică**.

## 4. Regula dovezilor (aprobată, D-3)

**Principiul:** o verificare intră în lista „trecute” numai dacă există o dovadă adecvată felului ei. O relatare fără dovezi suficiente („a mers”) **nu** se declară test trecut.

Dovezi acceptate:

| Felul dovezii | Exemple | Pentru ce fel de verificare |
|---|---|---|
| ieșirea unui test automat | rulare locală a lui Claude sau în CI, cu commit-ul și numărul rulării | reguli ale serverului, fluxuri în browser pe aplicația pornită local |
| rezultatul unei comenzi | ieșirea unei comenzi „Run JS script”, a unei sarcini cron, a lui `curl` | migrare, backup, restaurare, antete |
| o interogare verificabilă | un `SELECT` numai de citire, dat de Claude, cu rezultatul lui | starea din baza de date: stadii, contoare, amprente |
| un e-mail de test primit | mesajul, cu expeditorul, destinatarul, ora și atașamentele | transmiterea către „Primărie”, notificările, codul de cont |
| o captură de ecran | ecranul aplicației sau al panoului găzduirii | **verificările vizuale**: ce apare și ce nu apare pe ecran |
| o verificare în cod | fișierul și rândul | existența unei reguli, cu mențiunea că nu este o probă de funcționare |

Reguli:

1. **Verificările vizuale cer captură**, dacă nu există o dovadă alternativă adecvată (de exemplu o interogare care arată aceeași stare). Dovada alternativă se numește explicit în raport.
2. Dovezile cerute pentru fiecare probă manuală sunt cele din tabelul de la Pasul 3B și din tabelul T1–T4. Dacă una lipsește, rândul respectiv nu este „trecut”.
3. **O relatare fără dovezi suficiente** se consemnează la „neefectuate”, cu mențiunea „relatat de proprietar, fără dovadă suficientă”. Nu se trece la „trecute” și nici la „eșuate”.
4. **O deducție** („autentificarea a reușit, deci verificarea X a avut loc”) se consemnează ca deducție, cu ce o susține; nu ca verificare efectuată.
5. O dovadă parțială trece numai partea pe care o arată; restul rândului rămâne „neefectuat”.
6. Criteriile de acceptare nu se modifică după ce se vede rezultatul. Dacă un criteriu se dovedește greșit formulat, se oprește proba și se cere decizia proprietarului.

Capturile și mesajele nu intră în repository; raportul descrie ce arată fiecare dovadă, cu data. Proprietarul nu trimite parole, chei, coduri TOTP, coduri de recuperare, fișierul de setări sau linia `Authorization` din ieșirea unei comenzi; înainte de trimitere, adresele de e-mail din capturi pot fi acoperite.

## 5. Dependențe

| De cine depinde | Ce | Pentru |
|---|---|---|
| furnizorul găzduirii | răspunsul la tichet (sau aprobarea sursei B) | Pasul 2 |
| proprietarul | proba manuală (circa o oră, după ghid); telefon cu date mobile; adresa de test din listă | Pasul 2 (T1–T4), Pasul 3B |
| Pasul 2 | verificat | Pasul 4, punctul S6; închiderea Pasului 4 |
| aprobări separate | fiecare commit, fiecare deploy, fiecare intervenție pe găzduire, orice modificare de cod | toți pașii |

Pașii 3A și 3B (M1–M3) nu depind de Pasul 2 și pot începe înaintea lui.

## 6. Riscuri

| Risc | Urmare | Ce fac |
|---|---|---|
| furnizorul nu răspunde sau taxează răspunsul | Pasul 2 întârzie | sursa B (diagnostic propriu), cu aprobare |
| găzduirea nu permite o configurație sigură | `TRUST_PROXY` rămâne nerezolvat | mă opresc; se prezintă variantele (inclusiv schimbări de cod sau de găzduire), ca decizie a proprietarului |
| testul cap-coadă cere schimbări în aplicație | 3A nu poate fi scris ca test pur | mă opresc și prezint |
| reauditul găsește o vulnerabilitate | apare lucru neplanificat | se documentează separat; remedierea se decide separat |
| exercițiul de restaurare atinge datele existente | pierdere de date de test | bază și folder separate; verificarea comenzii înainte; backup proaspăt înainte de exercițiu |
| o probă manuală rămâne fără dovadă suficientă | verificarea rămâne „neefectuată” | ghidul spune, la fiecare pas, ce dovadă se păstrează (captură, mesaj, interogare); pașii de pe telefon sunt reduși la minimum |
| limitele pe IP, cât timp `TRUST_PROXY` nu este rezolvat, sunt comune tuturor | o probă se poate lovi de o limită consumată de alta | probele manuale se fac puține la număr; la nevoie se așteaptă o oră |

## 7. Condiții generale de oprire

Mă opresc și raportez, fără să continui, dacă:

1. un pas ar cere modificarea codului aplicației, a schemei sau a unui contract API;
2. un test existent pică (nu se adaptează ca să treacă; se raportează);
3. apare o vulnerabilitate sau o abatere de la designul înghețat;
4. o intervenție pe găzduire ar putea afecta datele existente;
5. un rezultat nu poate fi dovedit conform §4;
6. ceva ar atinge `main` sau site-ul `electrovolt.ro`.

## 8. Ce se consemnează în raportul final

- commit-urile și rulările CI pentru fiecare test nou;
- rezultatele complete ale suitelor (server și Python), cu data și mediul în care au rulat;
- pentru fiecare rând F1–F10, T1–T4, M1–M4 și S1–S12: starea (una dintre cele șase liste), dovada și data;
- intervențiile pe găzduire, în `docs/faza5/STAGING_URBISACTIV_JURNAL.md` (numerotarea continuă de la 29);
- configurația `TRUST_PROXY` aleasă și motivarea ei, fără valori care identifică serverul;
- lista vulnerabilităților și a remedierilor propuse, separat;
- registrul problemelor deschise, adus la zi, fără ca vreuna să fie declarată rezolvată fără dovadă.

## 9. Ordinea propusă

| Ordine | Pas | Poate începe | Estimare |
|---|---|---|---|
| 1 | Pasul 1: aprobarea planului | acum | — |
| 2 | Pasul 3A: testul automat cap-coadă | după aprobarea începerii lucrărilor; înaintea Pasului 2 (D-4) | o sesiune |
| 3 | Pasul 3B: ghidul și proba manuală M1–M3 | după 3A | o sesiune, din care circa o oră a proprietarului |
| 4 | Pasul 3B: M4, restaurarea | după aprobarea intervențiilor pe găzduire | o sesiune scurtă |
| 5 | Pasul 2: `TRUST_PROXY` | la răspunsul furnizorului sau la aprobarea sursei B | una–două sesiuni |
| 6 | Pasul 4: reauditul | S1–S5 și S7–S12 pot începe oricând; **nu se închide înainte de verificarea `TRUST_PROXY`** (D-4) | una–două sesiuni |
| 7 | Pasul 5: raportul și checkpoint-ul | după Pasul 4 | o sesiune |

Estimările sunt orientative; depind de răspunsul furnizorului și de ce găsește reauditul.

## 10. Întrebările din versiunea 1 și răspunsurile

| Întrebarea | Răspunsul proprietarului (10.10.2026) |
|---|---|
| sursa B pentru `TRUST_PROXY`, ca variantă de rezervă | aprobată condiționat (D-2); condițiile sunt în Pasul 2 |
| regula dovezilor | aprobată, cu alte dovezi adecvate admise (D-3); §4 |
| pașii 3A și 3B înaintea Pasului 2 | aprobat pentru testul automat și M1–M3 (D-4) |

Confirmate de proprietar la 10.10.2026: metoda de test pentru T3 (cu precizarea D-5) și regula dovezilor armonizată.
