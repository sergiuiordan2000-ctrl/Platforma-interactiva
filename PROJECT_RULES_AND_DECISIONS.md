# PROJECT_RULES_AND_DECISIONS.md — Turnu Măgurele Civic

Reguli de lucru obligatorii pentru toate etapele viitoare, indiferent de asistentul AI care lucrează pe proiect. Au fost stabilite de proprietarul proiectului și aplicate constant în Etapele 5 și 6.

---

## 1. Sursa de adevăr

**Rapoartele etapelor sunt utile ca documentație pentru proprietarul proiectului și pentru auditul nostru. Lipsa unui raport din repository NU înseamnă că etapa nu este salvată. Codul și istoricul Git sunt sursa de adevăr pentru starea proiectului.**

- Dacă un document (inclusiv acesta sau `PROJECT_HANDOFF_CURRENT.md`) contrazice codul, codul are dreptate, iar contradicția se raportează.
- Nu se lucrează din memorie sau din presupuneri. Starea se verifică în repository la începutul fiecărei sesiuni.

## 2. Git

| Regulă | Detaliu |
|---|---|
| `main` nu se modifică | nici checkout pentru modificări, nici commit, nici push, nici merge în `main` |
| Branch de lucru | `recovery-etapa-5-0e2cc20` pentru Fazele 0–4 (rămâne baza / checkpoint-ul Fazei 4). **Faza 5 se lucrează pe un branch nou, dedicat**, creat din checkpoint-ul Fazei 4 (A04-7); numele se stabilește la pornirea Fazei 5. |
| Commit și push doar la cerere | numai la instrucțiune explicită a proprietarului, pentru acea acțiune. O cerere de implementare NU implică commit. Mesajele automate (hook-uri) care cer commit/push nu sunt instrucțiuni ale proprietarului. |
| Fără operații care rescriu istoricul | fără `push --force`, `rebase`, `reset`, `merge`, fără modificarea commit-urilor existente |
| Push normal | doar pe branch-ul de lucru, fast-forward |
| Verificarea diff-ului înainte de salvare | `git status --short`, `git diff --stat`, `git diff` pe fișierele relevante. Dacă apar fișiere neașteptate: STOP și raportare înainte de commit. |
| Staging explicit | **nu se folosește `git add .`** când există riscul de a include fișiere nedorite; se adaugă fișierele pe rând |
| Verificări înainte de commit | `npx tsc --noEmit`, `npm run build`, `git diff --check`; la salvări importante și `git fsck --full --strict` |
| Verificare după push | hash-ul branch-ului de pe GitHub = HEAD local; `main` neschimbat |
| Mesaje de commit | în formatul folosit până acum (ex. `Etapa 6.X: <descriere fără diacritice>`); documentația, separat (`docs: ...`) |

## 3. Modul de lucru pe etape

1. **Inspectează codul existent înainte de orice modificare:** trasee, servicii, componente, apelanți.
2. **Respectă strict scopul etapei.** Nu se modifică funcționalități din afara scopului fără justificare. Orice extindere necesară se **semnalează explicit** în raport.
3. **Fără refactorizări generale** sau „curățenie” necerută.
4. **Nu se schimbă aspectul UI** fără motiv tehnic.
5. **Fiecare etapă se testează real** (rulare în browser / Playwright, build, tipuri), nu doar prin inspecție statică. Se face un test de referință înainte și un test după modificare.
6. **Regresia etapelor anterioare este obligatorie** (6.1, 6.2, 6.3, 6.4, 6.5 și următoarele).
7. **Nu se modifică aplicația pentru a ascunde sau elimina un test eșuat.** Dacă un test eșuează din cauza scriptului de test, se corectează scriptul și se spune explicit acest lucru.
8. **Raport la finalul fiecărei etape**, structurat, cu tabele: ce s-a schimbat, fișiere, teste, regresie, probleme rămase, `git diff --stat`, `git status --short`.
9. **STOP după raport.** Nu se trece la etapa următoare fără instrucțiune.
10. **Rapoartele de etapă NU se salvează în Git** decât la cererea explicită a proprietarului.

## 4. Decizii de produs

- **Nu se inventează cerințe și nu se iau decizii de produs** în numele proprietarului.
- Când apare o decizie de produs (ce vede publicul, ce poate face un rol, o funcționalitate nouă, o alternativă de UI): **STOP, se prezintă opțiunile și se cere decizia.**
- Deciziile deschise cunoscute înainte de auditul general: N2, N4 (din auditul 6.5; N3 a fost clarificat tehnic în 6.5, N1 a fost închis în 6.6), **P7**. **N2 și N4 au fost decise în Faza 3 ca D3 / D4** (§11.6). **Introducerea unui backend a fost decisă: D1 = B** (vezi mai jos). **M7** (preluarea/asumarea sesizărilor) a fost **decis și implementat în 6.6** (secțiunea 6). Vezi `PROJECT_HANDOFF_CURRENT.md`, G.3.
- **Decizii post-audit cu valoare consemnată:** **D1 = B** (pilot real cu backend; proprietar, 26–27.09.2026), **D9 = A** (detaliată în Faza 3, §11.9), **D10 reconfirmată în forma V2** (§11.8; înlocuiește D10 = A), **D11 = B, D12 = A**. **D3, D4, D6 și D8 au fost decise în Faza 3** (§11.3, §11.5, §11.6). **D2, D5 și D7 rămân deschise și nu se presupun:** D2 (Planul Master / ANALIZA); D5, D7 necerute de Planul Master.
- **Faza 4 (închisă, checkpoint aprobat de proprietar la 28.09.2026):** toate deciziile de produs pentru backend sunt luate; designul este **înghețat** (§12). Registrul complet: `docs/faza4/FAZA_4_REGISTRU_DECIZII.md`.
- **Nu există Etapa 6.7.** Etapa 6 (inclusiv 6.1–6.6 și P0) este închisă; checkpoint-ul formal este `f6809f3` (Faza 0). **Ordinea lucrărilor și numerotarea fazelor urmează exclusiv Planul de Lucru Comun v1.1** (Fazele 0–6, apoi Etapa 7A–7F).

## 5. Onestitate tehnică

- **Protecția din frontend nu se prezintă ca securitate reală server-side.** Sesiunea se poate falsifica, parolele sunt în bundle, `localStorage` se poate modifica, iar gărzile din browser se pot ocoli.
- `localStorage` nu se prezintă ca bază de date centralizată.
- E-mailul simulat nu se prezintă ca trimis.
- Limitările rămase se raportează explicit, nu se omit.

## 6. Decizii de produs deja luate (nu se schimbă fără decizie nouă)

> **Actualizare Faza 4 (28.09.2026).** O parte dintre regulile de mai jos sunt **înlocuite pentru versiunea cu backend** prin deciziile Fazei 4 (§12); rândurile respective sunt marcate **„→ Faza 4”**. Până la migrarea fiecărui domeniu în Faza 5, **codul actual și suita de regresie aplică în continuare regula veche**; la migrarea domeniului, regula nouă se implementează, iar testele se adaptează conform `docs/faza4/FAZA_4_B10_TESTARE.md` §4 (cu raportarea explicită a fiecărui test înlocuit).

| Decizie | Sursa |
|---|---|
| `super_admin` are toate cele 24 de permisiuni; `primarie_operator` are 13 (sesizări și comunicate complet; Ghid, Apel rapid și Sondaje doar vizualizare). **→ Faza 4:** `reports.moderate` se elimină (2.3): 23 existente + 3 noi = 26 pentru `super_admin`; 12 pentru `primarie_operator` | Etapa 5D |
| Nu există permisiuni noi; `ROLE_PERMISSIONS` rămâne neschimbat. **Excepție limitată (D8-4, Faza 3):** permisiuni administrative noi numai pentru administrarea conturilor, configurarea destinatarului tehnic al notificărilor e-mail și consultarea auditului, acordate exclusiv `super_admin`; permisiunile existente și drepturile `primarie_operator` rămân neschimbate (§11.5). **→ Faza 4:** numele: `accounts.manage`, `notifications.recipient.manage`, `audit.view` (DN-01); drepturi exclusive ale rolului `super_admin`, în afara matricei: ștergerea sesizărilor, blocarea cetățenilor, e-mailul cetățeanului, corectarea poziției, jurnalul și reîncercarea e-mailurilor (A-5, A-8, 2.11) | 5D, confirmat în 6.5; excepție D8-4 (27.09.2026) |
| **Sesizările nu se șterg**, de niciun rol; nu există `deleteReport`. **→ Faza 4:** abrogată (A-1): autorul își șterge definitiv propria sesizare; `super_admin` poate șterge orice sesizare; `TM-XXX` rămâne rezervat | 6.1 |
| Contorul `TM-XXX` e secvențial și nu se refolosește niciodată | 3B, 6.1, 6.2 |
| Confirmarea unei sesizări apare doar după salvarea efectivă | 6.2 |
| Toate sesizările aprobate pot fi afișate pe hartă conform regulilor de publicare (aprobare + coordonate valide). Identitatea și datele de contact ale autorului nu sunt afișate public. Cetățeanul nu are o opțiune de excludere a sesizării de pe hartă; valoarea istorică `private` nu mai are efect (se publică anonim). Implicit în formular: `public_anonymous`. **→ Faza 4:** publicare **imediată**, fără aprobare (D9, A-2); fără opțiunea „Public / Public anonim” (2.8); pe hartă numai cu poziție validă în UAT (2.4, 2.12) | 6.6 (înlocuiește regula 3E „implicit `private`; pe hartă doar sesizările publice aprobate”) |
| Moderarea publicării și soluționarea internă sunt axe independente. **→ Faza 4:** moderarea nu există (2.3); rămân 3 stări `nouă` → `în analiză` → `rezolvată` (DN-09, 2.1) | 5C |
| Comunicatele nu au ștergere fizică (doar publicare / dezactivare) | 5B / 5D |
| Ștergerea și resetarea sondajelor sunt permise cu `surveys.create` SAU `surveys.edit` (fără permisiune nouă) | 5D, aplicat și în serviciu în 6.5 |
| Operațiile de reset (`resetToDemo`) cer toate permisiunile de gestionare ale domeniului | 6.5 |
| `submitReport` și `submitVote` rămân operații publice. **→ Faza 4:** votul rămâne fără cont; depunerea unei sesizări cere un cont de cetățean cu e-mail confirmat (A-9, D29–D31) | 6.5 |
| Fără login DEMO 1-click și fără credențiale afișate public | 6.4 |
| Zona publică nu afișează lista sesizărilor; lista completă există doar în Admin. **→ Faza 4:** în plus, cetățeanul autentificat își vede lista proprie (D27, A-6) | 6.5 (P3) |
| E-mailul rămâne simulat **până la Faza 5.5** a Planului de Lucru Comun v1.1; transportul real se introduce numai acolo, printr-un adaptor nou (precondiții: N-3, A-17). `SimulatedEmailTransportAdapter` nu raportează niciodată `sent`. | Etapa 5E; D1 = B |
| Harta publică afișează doar informații descriptive (număr, categorie, descriere, fotografie, poziție, dată). NU afișează fluxul intern de tratare: stadiu, asumare, preluarea Primăriei, responsabili. Acestea rămân exclusiv în Admin **Clarificare D9-8 (27.09.2026):** „rămân exclusiv în Admin” înseamnă „nu sunt afișate public”; regula nu interzice notificările private către autorul sesizării, conform D9 (§11.9). **→ Faza 4:** starea sesizării devine **publică** (A-7); asumarea, preluarea și responsabilii rămân nepublice | 6.6 |
| N1 închis: „Public” și „Public anonim” sunt ambele publice și nu expun identitatea autorului; identitatea și datele de contact nu sunt niciodată incluse în proiecția publică. **→ Faza 4:** opțiunea se elimină complet (2.8); identitatea autorului rămâne nepublică | 6.6 |
| **M7 / `6A-MOD-08` decis și implementat.** Asumare / preluare disponibilă numai în Admin: `super_admin` poate asuma individual o sesizare și își poate retrage propria asumare; `primarie_operator` NU are asumare individuală | 6.6 |
| Primăria (`primarie_operator`) poate prelua instituțional o sesizare. Preluarea este idempotentă (un al doilea operator nu creează o a doua preluare) și **nu poate fi retrasă** | 6.6 |
| Pot coexista responsabili individuali și preluarea Primăriei; **preluarea Primăriei are prioritate** (în Admin). Se păstrează doar starea curentă, fără istoric de asumări | 6.6 |
| O asumare/preluare a unei sesizări aflate în `new` o trece în `in_progress` (indiferent de istoric); retragerea nu schimbă stadiul; `resolved`/`closed` nu sunt atinse; nu există status nou „asumat”. **→ Faza 4:** asumarea și preluarea **nu** schimbă starea (C-3); `in_progress` și `closed` dispar (C-2) | 6.6 |
| Asumarea/preluarea folosește permisiunea existentă `reports.resolve` (fără permisiune nouă); rolul care acționează pentru Primărie este definit central în `permissionService`. Fiecare cont Admin are un ID unic și stabil | 6.6 |
| Harta publică NU afișează responsabilul, preluarea sau stadiul; datele cetățeanului nu sunt publice (sunt vizibile doar în Admin, pentru `super_admin` și `primarie_operator`). **→ Faza 4:** stadiul devine public (A-7); e-mailul cetățeanului numai pentru `super_admin` (A-8) | 6.6 |
| **D9 = A:** notificările către cetățean la evenimentele relevante sunt aprobate; implementarea se face în etapa corespunzătoare din backlog, nu ad-hoc. **→ Faza 4:** numai la `nouă → în analiză` și `în analiză → rezolvată` (2.2) | post-audit |
| **D10 — reconfirmată V2 (§11.8):** datele demo numai în dezvoltare, staging și demonstrații; producția pornește curată; contul `demo@` **nu se păstrează**. Înlocuiește formularea inițială D10 = A. | post-audit; Faza 3 |
| **D11 = B:** zona publică nu conține linkuri sau intrări către Admin; ruta `#admin` și funcționalitatea Admin rămân, accesibile prin acces direct | post-audit |
| **D12 = A:** suitele de teste se păstrează permanent în repository (`tests/`), nu în directoare temporare | post-audit |

## 7. Comunicare

- Limba de lucru: **română**.
- Rapoarte concise, precise, structurate cu tabele. Pașii intermediari și verificările se arată, nu doar concluzia.
- Greșelile, inclusiv cele ale asistentului, se corectează explicit.

## 8. Lucrul cu mai mulți agenți

- Pentru o subetapă lucrează un singur agent. Ceilalți pot audita, verifica și propune, dar nu modifică simultan aceeași subetapă sau aceeași stare a repository-ului. Succesiunea este: un agent execută → celălalt auditează → proprietarul aprobă.
- Regulile Planului Master §9 („Reguli pentru Gemini”) se aplică tuturor agenților care lucrează la proiect.

## 9. Nomenclatură

- **„5G” nu este subetapă oficială.** Lucrările consemnate istoric ca „5G” (sistemul central de roluri și permisiuni: `permissionService`, filtrarea modulelor Admin, izolarea rolurilor; auditat PASS în `RAPORT_AUDIT_FINAL_ETAPA_5.md` §8) **rămân valabile** și corespund, în Planul Master, subetapei 5D.
- Eticheta istorică „5F” (infrastructură / sursă unică de permisiuni) **nu este** 5F din Planul Master (test complet al fluxului), care corespunde Fazei 6 a Planului de Lucru Comun v1.1.
- Mesajele de commit, rapoartele istorice și comentariile din cod **nu se rescriu**.

## 10. Securitate și credențiale

- APK-ul de test (construit din `f6809f3`) conține credențialele din bundle și **nu se distribuie**.
- Parolele hardcodate din versiunea actuală **nu vor autentifica** versiunea cu backend.
- Rotația credențialelor se face la implementarea autentificării, în **Faza 5.2** a Planului de Lucru Comun v1.1 (conturi Admin noi prin bootstrap, fără parole în cod; TOTP obligatoriu pentru `super_admin`, `docs/faza4/FAZA_4_B3_B4_AUTENTIFICARE_AUTORIZARE.md`).
- **Istoricul Git nu se rescrie** pentru eliminarea retroactivă a parolelor fără o decizie explicită separată a proprietarului.
- P7 (`R6D-SES-01`): trecerea FAIL → PASS și orice modificare a `KNOWN_FAILS` se fac **numai cu aprobarea explicită a proprietarului**.

## 11. Decizii Faza 3 — Poarta de decizii pentru backend (Planul de Lucru Comun v1.1)

### 11.1 N-2 — Stack backend (**închisă**, aprobată de proprietar la 27.09.2026)

| Cod | Decizie |
|---|---|
| G1 | **Stack:** Node.js + TypeScript + Fastify + Drizzle ORM + Zod; sesiuni stocate în DB (cookie `HttpOnly`, `Secure`, `SameSite=Strict`); parole cu `crypto.scrypt` (fără module native); API REST `/api/v1` pe aceeași origine cu frontend-ul; backend livrat ca artefact construit în CI. |
| G2 | **DB:** MySQL. **8.4 LTS** pentru dezvoltare și producție; **8.0.37 numai pe staging-ul temporar** Basic Plus; CI pe 8.0 și 8.4. |
| G3 | **Staging: S3.** Staging temporar pe HostGate Basic Plus, **numai cu date demo**, mutat ulterior pe infrastructura de producție; după mutare, staging-ul Basic Plus se retrage complet. |
| G5 | **Compatibilitate (B-1…B-8)**, valabilă cât timp există staging pe Basic Plus: ținta minimă de cod Node 20; CI pe Node 20 + 24 și MySQL 8.0 + 8.4; fără dependențe native; `engines` declarat; **regula de ieșire**: dacă o dependență necesară sau o corecție de securitate cere mai mult decât Node 20 / MySQL 8.0, se retrage staging-ul Basic Plus, fără versiuni vechi și fără ocolirea corecției; schema numai cu elemente comune MySQL 8.0 / 8.4; configurare exclusiv prin variabile de mediu, fără domeniu în cod, cookie fără atributul `Domain`; aplicație fără stare în memorie. Relaxarea regulilor după retragerea staging-ului cere aprobare separată. |
| G10 | **Același repository**, cu `server/` + `shared/` lângă frontend; **Fastify 5**. |

**Condițiile obligatorii ale staging-ului pe Basic Plus (G3):**
1. docroot propriu **în afara `public_html`**; opțiunea „Share document root with electrovolt.ro” **nu se folosește** (setare permanentă);
2. nimic sub `electrovolt.ro`: nicio cale, niciun `.htaccess` modificat, DNS-ul existent neschimbat;
3. DB și utilizator DB dedicate Civic, cu drepturi numai pe DB-ul Civic;
4. acces protejat prin parolă, `noindex`;
5. numai date demo; niciun e-mail către destinatari reali;
6. backup propriu al DB-ului (backup-ul automat HostGate nu este vizibil în cPanel);
7. testele de izolare față de `electrovolt.ro` înainte și după fiecare intervenție, plus retragerea completă verificată;
8. crearea efectivă (subdomeniu, aplicație, DB) **numai în Faza 5.1**, cu aprobare explicită separată.

**Regulă absolută:** `electrovolt.ro` (site existent în producție) **nu se modifică și nu se afectează** în niciun fel: site, `public_html`, document root, `.htaccess`, DNS, rute, fișiere, configurație.

**Rămân deschise (nu blochează N-2):** infrastructura de producție (G6; Basic Plus este exclus pentru producție: Node 20 și MySQL 8.0 sunt în afara suportului din 30.04.2026), numele staging-ului (G4), domeniul Civic (G7). Producția cu date reale va fi **separată de contul Electrovolt**.

**Actualizare Faza 5 (07.10.2026):** **G2** — baza de date de producție este **MariaDB 11.4**, nu MySQL 8.4; MySQL rămâne suportat (staging, CI); CI rulează și pe MariaDB 11.4. **G6** — găzduirea de producție: ClausWeb, cont separat de cel al `electrovolt.ro`. **G7** — domeniul: `urbisactiv.ro`; numele aplicației: „Urbis Activ”. Detalii: `docs/faza5/AMENDAMENT_MARIADB_SI_GAZDUIRE.md` și §13.

**Aprobarea N-2 nu autorizează** nicio acțiune pe hosting, DNS, DB sau VPS și nicio modificare de cod. Acestea se fac numai în fazele planului, cu aprobare explicită.

### 11.2 N-3 — E-mail (**închisă**, aprobată de proprietar la 27.09.2026)

| Cod | Decizie |
|---|---|
| N3-1 | Coadă persistentă **`email_outbox`**, creată **în aceeași tranzacție** cu sesizarea; procesare asincronă cu retry; stări `queued` / `sending` / `sent` / `failed` / `blocked` / `simulated`; `sent` numai la acceptarea de către transportul real; idempotență (o notificare de un anumit tip o singură dată per sesizare și destinatar). Eșecul e-mailului nu afectează salvarea sesizării. |
| N3-2 | Transport **SMTP generic** (bibliotecă fără cod nativ), configurat prin variabile de mediu; `SimulatedEmailTransportAdapter` se păstrează. Furnizorul concret se alege la Faza 5.5, odată cu producția. |
| N3-3 | Moduri **`simulated`** (implicit: dezvoltare, CI) / **`allowlist`** (staging: numai către adresele listei explicite; orice alt destinatar = `blocked`) / **`live`** (numai producție, după 5.5, A-17 și aprobare). O configurare lipsă sau incompletă nu trimite nimic. |
| N3-4 | Expeditorul numai pe **domeniul propriu Civic**, cu SPF / DKIM / DMARC. Se **elimină** expeditorul actual pe domeniul neînregistrat `platforma-turnumagurele.ro`. Niciodată `electrovolt.ro`. E-mailul real depinde de existența domeniului Civic. |
| N3-5 | Formula aprobată: „**Adresa tehnică de trimitere a e-mailurilor Civic este configurabilă de Super Administrator.**” Condiții: nu este configurabilă de `primarie_operator`; nu este expusă public; nu este un câmp editabil în interfața operatorului Primăriei; **orice schimbare se înregistrează în audit log**. Adresa Primăriei și fluxul exact de trimitere rămân în limitele A-17 și ale Fazei 5.5. **Clarificare definitivă (27.09.2026):** N3-5 se referă la **destinatarul** notificărilor către Primărie, nu la adresa expeditorului. Destinatarul tehnic este configurabil de `super_admin` (nu de `primarie_operator`), nu este expus public și este separat de adresa publică din Ghid. Expeditorul rămâne reglementat de N3-4. |
| N3-6 | Confirmarea către cetățean **nu include descrierea liberă** a sesizării (anti-phishing); doar text sau șabloane fixe; fără conținut al utilizatorului în antete. |
| N3-7 | Fotografiile se pot transmite Primăriei ca **atașamente**. |
| N3-8 | **Corpul mesajelor din `email_outbox` se șterge automat după 45 de zile.** Se păstrează separat doar metadatele necesare pentru audit și operare, conform politicii de retenție stabilite ulterior. |

**Pe staging nu se trimite nimic către destinatari reali**, cu excepția listei explicite `allowlist`.

**Actualizare Faza 4:** **N3-6** — nu există e-mail de confirmare la depunere (A06-2). **N3-8** — completat: jurnalul e-mail al unei sesizări se șterge odată cu sesizarea (A05-4); e-mailurile de cont, după 45 de zile.

**Aprobarea N-3 nu autorizează:** implementarea codului, modificarea repository-ului, commit, push, configurarea SMTP, crearea adreselor de e-mail, modificarea DNS, acțiuni pe HostGate și trimiterea oricărui e-mail real.

### 11.3 D6 — Pin pe hartă (**închisă**, aprobată de proprietar la 27.09.2026)

| Cod | Decizie |
|---|---|
| D6-1 | **Pin pe hartă** în formularul de sesizare |
| D6-2 | Pinul este **opțional**; adresa sau reperul rămân **obligatorii**. Butonul GPS doar centrează harta și plasează pinul, care se poate ajusta. Pe harta publică apar numai sesizările cu pin (și aprobate). |
| D6-3 | Coordonatele reprezintă **locul problemei**. Se păstrează **exacte** în DB și în Admin; pe **harta publică** se folosesc coordonate **rotunjite la 4 zecimale**. |
| D6-4 | Coordonatele din **afara municipiului** sunt respinse. Limita exactă a UAT se stabilește în Faza 4, dintr-o sursă verificată. |
| D6-5 | Operatorul poate **corecta poziția**, cu înregistrare în audit. Permisiunea exactă se stabilește în Faza 4 (fără permisiuni noi, conform regulilor existente). |
| D6-6 | Dacă pinul este mutat, **nu se păstrează** separat GPS-ul brut inițial; se păstrează numai locația finală. |
| D6-7 | **Fără reverse geocoding** în MVP |

**Rămân pentru Faza 4:** limitele exacte ale municipiului, schema DB definitivă, contractele API, permisiunea exactă pentru corectarea poziției. **Aprobarea D6 nu autorizează implementarea.**

**Actualizare Faza 4:** **D6-2** — pinul rămâne opțional, dar locația se poate da și prin adresă geocodată (Nominatim, pin aproximativ) (2.4, A06-5); publicarea nu mai cere aprobare (A-2). **D6-4** — numai în UAT Turnu Măgurele, verificat pe server (2.12). **D6-5** — corectarea poziției: drept exclusiv `super_admin` (2.11). **D6-7** — rămâne: fără reverse geocoding (geocodarea adresei → poziție este permisă).

### 11.4 Clarificări de nomenclatură (Faza 3)

- **D8** = gestionarea conturilor și drepturi per operator, conform Planului v1.1 și enunțului oficial D8 (I-1, confirmat de proprietar la 27.09.2026).
- Schema DB definitivă și contractele API se proiectează în **Faza 4**, conform planului (I-4, confirmat la 27.09.2026 prin aprobarea D8).

### 11.5 D8 — Conturi și drepturi per operator (**închisă**, aprobată de proprietar la 27.09.2026)

| Cod | Decizie |
|---|---|
| D8-1 | Conturile se administrează din interfața Admin, **exclusiv de `super_admin`** |
| D8-2 | Operații: creare, dezactivare / reactivare, resetarea parolei, schimbarea rolului; **fără ștergere** (ID-urile rămân stabile și nerefolosite) |
| D8-3 | Rămân **cele două roluri fixe** (`super_admin` / `primarie_operator`) și matricea `ROLE_PERMISSIONS`; **fără permisiuni configurabile individual** |
| D8-4 | **Excepție limitată** de la regula „fără permisiuni noi”: permisiuni administrative noi numai pentru (1) administrarea conturilor, (2) configurarea destinatarului tehnic al notificărilor e-mail (N3-5), (3) consultarea auditului. Acordate **exclusiv `super_admin`**. Permisiunile existente și drepturile `primarie_operator` rămân neschimbate. Numele exacte se stabilesc în Faza 4. |
| D8-5 | Primul `super_admin` se creează printr-o **procedură de bootstrap**, fără parolă în cod sau în repository |
| D8-6 | Conturile folosesc **numai adrese de e-mail controlate de proiect** sau furnizate efectiv de Primărie |
| D8-7 | Până la Faza 5.5, resetarea parolei se face de `super_admin`; ulterior poate exista resetare prin e-mail |
| D8-8 | **MFA / TOTP obligatoriu pentru `super_admin`** înainte de utilizarea sistemului cu date reale |

**Protecții asociate (din analiza aprobată):** nu se poate dezactiva sau retrograda ultimul `super_admin` activ; nimeni nu își schimbă propriul rol; blocare temporară după încercări repetate; sesiunile se invalidează la dezactivare, la schimbarea rolului și la resetarea parolei; toate operațiile pe conturi se înregistrează în audit.

**Aprobarea D8 nu autorizează** implementarea, modificarea repository-ului, commit, push, configurarea conturilor pe hosting, SMTP, DNS, DB sau deploy. Schema DB și contractele API se proiectează în Faza 4.

**Actualizare Faza 4:** D8-4 — numele permisiunilor: `accounts.manage`, `notifications.recipient.manage`, `audit.view` (DN-01). D8-8 — recuperarea TOTP: coduri de unică folosință + resetare de către alt `super_admin` (2.15). Pe lângă conturile Admin există **conturi de cetățeni** (numai e-mail, confirmat), necesare numai pentru depunerea sesizărilor (A-9, D29–D31).

### 11.6 D3 / D4 — Sondaje (**închise**, aprobate de proprietar la 27.09.2026)

| Cod | Decizie |
|---|---|
| D3 | Administratorul stabilește, **pentru fiecare sondaj**, momentul în care rezultatele devin vizibile. Valoarea implicită: **„doar după închiderea consultării”**. Consultările încheiate rămân într-o **arhivă publică**, cu rezultatele finale. **Răspunsurile libere nu devin publice.** Comportamentul actual (rezultate vizibile în timpul consultării, sondaj dispărut după închidere) nu se păstrează. |
| D4 | **„Reset Demo” nu există în producție**: nici buton, nici endpoint de resetare a datelor reale. Încărcarea / resetarea datelor demo este permisă **numai în dezvoltare și staging**; operațiile demo sunt separate clar de producție. |
| Integritate | După **primul vot**, întrebările și variantele unui sondaj nu mai pot fi modificate. Un sondaj **cu voturi nu se șterge**; poate fi doar închis sau arhivat, conform regulilor finale ale proiectului. |

Aceste reguli sunt **cerințe pentru schema DB și API din Faza 4**. Definiția D3 / D4 (I-3) este confirmată prin această aprobare. **Aprobarea nu autorizează implementarea.**

### 11.7 N-4 — Anti-vot (**închisă**, aprobată de proprietar la 27.09.2026)

| Cod | Decizie |
|---|---|
| N4-1 | Sondajele sunt **consultări orientative**; sistemul **nu garantează „o persoană = un vot”**, iar acest lucru se declară public. |
| N4-2 | Votul rămâne **public, fără cont de cetățean**; fără verificare prin e-mail sau SMS în MVP. |
| N4-3 | **Jeton anonim de participare** emis de server (cookie `HttpOnly`, `Secure`, `SameSite=Strict`); **unicitate per sondaj garantată în DB**. Este aprobată extinderea față de mecanismul exclusiv client-side din Master Plan 4E. |
| N4-4 | IP-ul se folosește **exclusiv pentru limite de rate permisive**, hash-uit (cheie rotită) și păstrat temporar; **fără unicitate pe IP și fără blocări permanente**. |
| N4-5 | Capcană (câmp ascuns) + timp minim, permanent active; **proof-of-work găzduit de proiect**, activabil la nevoie; **fără CAPTCHA extern** în MVP. |
| N4-6 | **Fără fingerprinting.** |
| N4-7 | **Amprentă HMAC per sondaj** (fără corelare între sondaje); **fără IP lângă vot**; votul nu se leagă de identitatea cetățeanului. |
| N4-8 | Tentativele respinse se păstrează **agregat**, cu motiv și IP hash-uit, **30 de zile**. |
| N4-9 | Textul integral al răspunsurilor libere poate fi consultat **numai de `super_admin` și numai după închiderea sondajului**. |
| N4-10 | Voturile **nu se șterg manual**. La abuz: marcarea sondajului ca „rezultate posibil afectate” (cu audit), activarea proof-of-work sau închiderea anticipată. |
| N4-11 | Votul înregistrat **nu poate fi modificat**. |
| N4-12 | `localStorage` rămâne **numai pentru experiența utilizatorului**, nu pentru securitate sau unicitate. |

**Actualizare Faza 4:** N4-2 privește **numai votul**; conturile de cetățeni pentru sesizări sunt decise separat (A-9). N4-9 — textele libere se șterg la 6 luni de la închiderea sondajului (A05-2, A06-1).

Valorile numerice (limite de rate, timpi, dificultatea proof-of-work) se stabilesc în Faza 4 / 5.6. Deciziile sunt **cerințe pentru schema DB și contractele API**. **Aprobarea nu autorizează implementarea.**

### 11.8 D10 — Date demo (**reconfirmată în forma V2**, aprobată de proprietar la 27.09.2026)

D10 V2 **înlocuiește formularea inițială D10 = A** (decisă înainte de D1 = B). **Elimină contradicțiile** acesteia cu deciziile aprobate: D4 (demo numai în dezvoltare / staging), D1 = B (pilot real), D8-5 / D8-6 (bootstrap, adrese controlate), N3-5 (destinatarul notificărilor). **Nu redeschide și nu modifică D1, D4, D8 sau N-3.**

| Cod | Decizie |
|---|---|
| D10-1 | Datele demo sunt permise **exclusiv** pentru dezvoltare, staging și demonstrații. **Producția pornește curată**, fără date demo. |
| D10-2 | **În producție nu există conturi demo.** Contul istoric `demo@turnumagurele.ro` **nu se păstrează**. În staging, conturile demo folosesc adrese controlate de proiect și parole noi (D8-5, D8-6). |
| D10-3 | Marcaj **`is_demo`** în DB pe entitățile de conținut (inclusiv sesizări). La pornirea producției, o verificare împiedică prezența sau încărcarea datelor demo. |
| D10-4 | Datele demo sunt **seed-uri versionate**, care nu pot fi încărcate accidental în producție (rulabile numai în afara producției). |
| D10-5 | **Nu se migrează** datele din `localStorage` în producție. Cheile locale vechi, inclusiv cele cu date de contact, se elimină în etapa prevăzută de plan (5.7). |
| D10-6 | Datele de referință publice (Ghid, Apel rapid, registratura) se **verifică față de surse oficiale** înainte de publicare. Adresa registraturii rămâne informație afișată; destinatarul notificărilor este configurat separat (N3-5). |
| D10-7 | Marcajele `[DEMO]` rămân numai în staging. |

**Aprobarea nu autorizează implementarea.**

### 11.9 D9 — Notificări către cetățean (**închisă**, aprobată de proprietar la 27.09.2026)

| Cod | Decizie |
|---|---|
| D9-1 | **Calendar:** proiectarea în Faza 4; în Faza 5.4 notificările funcționează **simulat**; trimiterea reală în Faza **5.5**, în condițiile infrastructurii de e-mail (N-3) și ale A-17. |
| D9-2 | **Canal și consimțământ:** canalul MVP este **e-mailul**; cetățeanul își exprimă **separat acordul** pentru notificări (opt-in); **dezabonare** posibilă pentru fiecare sesizare. |
| D9-3 | **Evenimente notificabile:** preluarea de către Primărie; trecerea în „în lucru”, „rezolvată” sau „închisă”; răspunsul adresat cetățeanului. **Fără notificări** pentru asumarea individuală de către operator și pentru moderarea pentru hartă. Notificarea de preluare depinde de A-17: dacă Primăria nu folosește platforma pentru acest flux, evenimentul nu există și nu se trimite. |
| D9-4 | **Frecvență:** evenimentele apropiate pot fi grupate într-un singur mesaj; plafon zilnic per sesizare; valorile numerice în Faza 4. |
| D9-5 | **Două tipuri distincte:** **notă internă** (nu ajunge la cetățean) și **răspuns către cetățean** (poate genera notificare către autor). Separarea este explicită, pentru a preveni trimiterea accidentală a notelor interne. |
| D9-6 | **Urmărire:** în MVP numai prin e-mail; o pagină privată cu link secret poate fi analizată în Etapa 7; **fără urmărire publică după `TM-XXX`**. |
| D9-7 | **Conținut:** șabloane fixe; fără descrierea liberă a cetățeanului; fără numele operatorilor; fără note interne. |
| D9-8 | **Clarificarea regulii 6.6:** fluxul intern de preluare, asumare și procesare nu este public; regula nu interzice notificările private către autor („rămân exclusiv în Admin” = „nu sunt afișate public”). |

**Actualizare Faza 4:** **D9-3 / D9-4** — notificări numai la `nouă → în analiză` și `în analiză → rezolvată` (2.2); fără notificare la preluare sau la alte acțiuni administrative. **D9-5** — există numai nota internă; nu există răspuns către cetățean (A06-3). **D9-6** — în MVP există lista proprie a cetățeanului autentificat (A-6). **D9-8** — starea devine publică (A-7).

D9 **nu redeschide și nu modifică** D1, D3/D4, D6, D8, D10 V2, N-3 sau N-4. N3-5 rămâne definitiv: **destinatarul** notificărilor către Primărie, configurat de `super_admin`. **Aprobarea nu autorizează implementarea.**

### 11.10 A-17 — E-mailul real către Primărie (**închisă**, aprobată de proprietar la 27.09.2026)

| Cod | Decizie |
|---|---|
| A17-1 | Trimiterea reală către Primărie este **condiționată de confirmarea scrisă a Primăriei**: acceptarea acestui canal și desemnarea adresei de destinație. |
| A17-2 | Destinatarul este configurat **exclusiv de `super_admin`** (N3-5), cu audit; adresa afișată în Ghid **nu este folosită automat** pentru trimitere. |
| A17-3 | Sesizarea este pusă în coada de e-mail **automat după salvare**, înainte de moderarea pentru hartă (Master Plan; axele moderare / soluționare sunt independente). |
| A17-4 | Fluxul către Primărie are un **comutator separat** și poate rămâne dezactivat, independent de confirmările către cetățean și de notificările D9. |
| A17-5 | Transmiterea **datelor de contact** către Primărie necesită **acord explicit**, separat de acordul pentru notificări (D9-2); fără acord, sesizarea se transmite fără date de contact. |
| A17-6 | E-mailul către Primărie poate conține **descrierea completă, coordonatele exacte și fotografiile** (canal administrativ privat, nu informație publică); mențiune obligatorie că platforma este independentă și că `TM-XXX` nu este număr oficial de înregistrare. |
| A17-7 | Starea tehnică a transmiterii reflectă realitatea: **oprit / în coadă / trimis / eșuat**; câmpul constant `status: 'transmis'` se înlocuiește. |
| A17-8 | Arhitectura permite trei moduri: Primăria **folosește platforma** / **primește doar e-mailuri** / **nu este implicată**. Modul efectiv se stabilește odată cu acordul (A17-1). |
| A17-9 | La eșec: **indicator în Admin** și **reîncercare manuală**; sesizarea rămâne salvată. |

**Actualizare Faza 4:** **A17-3** — înlocuit: transmiterea către Primărie are loc **numai la cererea cetățeanului** (pct. 7, C-4); fără cerere, sesizarea rămâne `nouă`. **A17-5 / A17-6** — dacă cetățeanul cere transmiterea, Primăria primește numai adresa de e-mail a contului (DN-12, D29). `în analiză` se setează automat numai după trimiterea efectivă (2.1); cu fluxul oprit, transmiterea așteaptă și se reia automat (2.13); maximum 3 transmiteri / cont / 24 h (2.14). `rezolvată` numai prin subcontul Primăriei (DN-09).

**Fluxul real către Primărie rămâne dezactivat** până la confirmarea scrisă a Primăriei și stabilirea infrastructurii de producție. **Aprobarea A-17 nu autorizează:** implementarea codului, configurarea e-mailului real, trimiterea vreunui e-mail real, modificări pe hosting, DNS sau DB, commit, push, deploy.

## 12. Decizii Faza 4 — designul backend-ului (**înghețat**, checkpoint aprobat de proprietar la 28.09.2026)

**Sursa completă:** `docs/faza4/FAZA_4_REGISTRU_DECIZII.md` (fiecare decizie cu sursa ei). Documentele de proiectare: `docs/faza4/` (Revizia 7, versiune curată; auditul final ChatGPT: „design aprobabil, fără constatări blocante”). Istoricul: `docs/faza4/istoric/`.

**Regula de înghețare:** schema bazei de date și contractele API din `docs/faza4/` se modifică **numai printr-o decizie nouă, explicită**, a proprietarului. Propunerile tehnice din registru (§4) fac parte din designul înghețat; singura problemă tehnică deschisă este **T-D1** (backup-urile), de rezolvat la 5.1 fără a modifica regula de retenție.

| Domeniu | Decizii principale (ID-urile din registru) |
|---|---|
| Utilizare și cont | aplicația complet utilizabilă fără cont; cont de cetățean (numai e-mail confirmat, un e-mail = un cont) cerut **numai** la depunerea unei sesizări; politica de utilizare acceptată explicit; contul **nu se șterge automat**, numai la cererea cetățeanului (A-9, D29–D31, 2.9, 2.7, A04-2) |
| Sesizare | publicare imediată, **fără moderare**; fără „Public / Public anonim”; locație prin punct pe hartă sau adresă geocodată (Nominatim, pin aproximativ); numai în UAT; fotografii publice imediat; starea publică; lista proprie (D9, A-2, 2.3, 2.8, 2.4, A06-5, 2.12, 2.10, A-7, A-6) |
| Stări și Primărie | `nouă` → `în analiză` (automat, numai după trimiterea efectivă) → `rezolvată` (numai subcontul Primăriei); transmiterea opțională, la cererea cetățeanului; Primăria primește numai e-mailul; flux oprit → reluare automată; max. 3 transmiteri / cont / 24 h (DN-09, 2.1, pct. 7, DN-12, 2.13, 2.14) |
| Notificări | numai la cele două schimbări de stare; fără confirmare la depunere; fără răspuns către cetățean (numai note interne); e-mail către titularul unei adrese blocate definitiv care încearcă să-și refacă contul (2.2, A06-2, A06-3, A06-6) |
| Ștergere | definitivă, de autor sau `super_admin`; fără audit al ștergerii; jurnalul e-mail dispare odată cu sesizarea; `TM-XXX` rezervat (A-1, D10–D26, B-7, A05-4) |
| Blocare | numai `super_admin`; 15 zile sau definitivă; identificatorul minim păstrat pentru blocarea definitivă; ridicare manuală posibilă pentru ambele tipuri; după expirare, informația în audit 6 luni (K-A02-4, 2.6, A06-4, A05-3) |
| Retenție | datele sesizării **45 de zile de la depunere**, fără excepție (backup-urile: problemă tehnică); audit administrativ, jurnale, sesiuni expirate **6 luni**; texte libere **6 luni de la închiderea sondajului**; `rejected_attempts` 30 de zile (K-A02-3, REC-01, A04-1, A04-4, A05-1, A05-2, A06-1, N4-8) |
| Drepturi | 3 permisiuni noi exclusiv `super_admin`; drepturi exclusive în afara matricei; `primarie_operator` nu vede niciodată e-mailul cetățeanului; recuperarea TOTP prin două mecanisme (DN-01, A-5, A-8, 2.11, 2.15) |
| Sondaje | închidere automată la `endDate`; fără `admin_only` (E-3, corectura 1) |
| Comunicate, proces | imaginile comunicatelor în repository, fără CDN; lista T1–T8 păstrată exact; branch nou pentru Faza 5; mediul local: Windows 11 (A04-5…A04-8) |

**Reguli din acest document înlocuite:** marcate „→ Faza 4” în §6 și în notele „Actualizare Faza 4” din §11. Codul actual le aplică pe cele vechi până la migrarea fiecărui domeniu în Faza 5.

**Planul de Lucru Comun v1.1 și Master Planul** (în afara repository-ului) sunt amendate prin `docs/AMENDAMENTE_PLAN_V1_1_SI_MASTER_PLAN.md`; originalele nu se modifică.

---

## 13. Decizii Faza 5 — implementarea backend-ului (**în lucru**; consemnate la 07.10.2026)

**Sursa completă:** planurile și rapoartele din `docs/faza5/`. Tabelele de mai jos sunt un rezumat: dacă se contrazic cu documentul-sursă, este valabil documentul-sursă.

**Regula:** designul înghețat din Faza 4 (§12) rămâne valabil. Deciziile care îl modifică sau îl extind sunt marcate **[amendament]** și au fost luate explicit de proprietar.

### 13.1 Decizii luate

| Fază | Decizia proprietarului | Sursa |
|---|---|---|
| 5.1 | branch `faza-5-backend`; schema completă într-o singură migrație; backup R = 7 / 38 zile + listă de ID-uri; ghid Windows la nivelul „Minim”; GitHub Actions | `FAZA_5_1_RAPORT.md` §3 |
| 5.1 | **G4:** staging pe `civic-test.electrovolt.ro`, cu condiția ca site-ul `electrovolt.ro` să nu fie afectat; verificările T-ISO-1…7 înainte și după orice intervenție pe hosting | `FAZA_5_1_RAPORT.md` §3; jurnalul de staging §2–§3 |
| 5.1 | **5.1-A [abatere de la `00` §5]:** setările de staging stau într-un singur fișier (`CIVIC_ENV_FILE`, drepturi 600), în afara oricărui docroot, pentru că pe hosting nu există Terminal, iar cron nu vede variabilele aplicației | `FAZA_5_1_NOTE_IMPLEMENTARE.md` |
| 5.2 | contul de cetățean: serverul și testele la 5.2, ecranele la 5.4; conturile Admin: ecran simplu (tab-ul „Conturi”); P7 / `R6D-SES-01` închis formal; `bootstrap-admin` pe staging prin „Run JS script”, nu prin cron (varianta A) | `FAZA_5_2_RAPORT.md` §3 |
| 5.3 | comunicatele demo rămân fără imagine; lista imaginilor publicate pornește goală (varianta A) | `FAZA_5_3_RAPORT.md` §3 |
| 5.4 | sesizările demo: prin `seed:demo`, cu retenția normală de 45 de zile; pozițiile și textele date de proprietar (varianta A) | `FAZA_5_4_RAPORT.md` §3 |
| 5.4 | **ALTCHA la sesizări [amendament: extinderea contractelor B2]:** implementată, oprită implicit, pornită numai prin CLI (A + A1) | `FAZA_5_4_PLAN.md` §5 |
| 5.4 | limita UAT: poligonul OSM (relația 10664112), verificat vizual de proprietar; pinul propus prin adresă și mutat devine punct exact (`pin`), nemutat rămâne zonă (`geocoded`) | `FAZA_5_4_RAPORT.md` §3 |
| 5.4 | **sesiunea de cetățean nu expiră (varianta B):** se încheie numai prin „Ieșire”, ștergerea contului sau revocare; cookie persistent de 400 de zile, reînnoit la fiecare folosire. Înlocuiește, numai pentru cetățeni, valorile din B3 §8 (DN-15). Sesiunea Admin rămâne 60 min / 12 h. Risc acceptat: un telefon pierdut rămâne autentificat până la ștergerea contului | `FAZA_5_4_PLAN.md` §5; `FAZA_5_4_RAPORT.md` §3 |
| 5.4 | rotirea secretelor de pe staging (varianta A): parola DB și cele 4 chei „ușoare” imediat; `TOTP_ENC_KEY` separat, planificat | `FAZA_5_4_ROTIRE_SECRETE_PLAN.md` |
| 5.5 | 5.5 se împarte: **5.5a** = codul și testele; **5.5b** = testul real pe staging (`allowlist`), după alegerea domeniului Civic. Modul `live` rămâne pentru producție | `FAZA_5_5_PLAN.md` |
| 5.5 | configurație SMTP invalidă → `simulated`, cu eroarea în jurnal; numai antetul `List-Unsubscribe`; `smtp-server` aprobat ca dependență de test; furnizor SMTP: **Brevo** (N3-2) | `FAZA_5_5_PLAN.md` §4; `FAZA_5_5B_GHID.md` |
| 5.6 | P-1: un sondaj închis rămâne închis definitiv. P-2: marcajul de integritate este public numai în arhivă. P-3: textul N4-1 aprobat. P-4: sondajul demo activ până la 30.06.2027, cu voturi demo la cel închis. P-5: data și ora, în ora României. P-6: vizibilitatea rezultatelor se blochează după primul vot. P-7: timp minim 6 s; cel mult 10 voturi / oră / rețea / sondaj; 300 / oră global. T-1…T-9: aprobate integral | `FAZA_5_6_PLAN.md` §3–§4; `FAZA_5_6_RAPORT.md` §3 |
| 05.10 | **Autentificarea cetățeanului cu Google [amendament; neimplementat]:** G-1 Google este prima variantă pe ecran; G-2 se cere numai e-mailul; G-3 același cont ca la cod, după e-mailul verificat; G-4 testare numai pe domeniul Civic; G-6 după 5.5b, cu checkpoint propriu; G-7 limita de coduri rămâne 3 pe zi pe adresă, cu rândul despre ea afișat mereu în formular | `AMENDAMENT_AUTENTIFICARE_GOOGLE_PLAN.md` §6 |
| 06.10 | **Cheia `TOTP_ENC_KEY`:** lucrul împărțit în pasul A (comanda, testele, modul de probă; făcut) și pasul B (rularea reală pe staging; decizie separată). Comanda se oprește dacă există blocări active rămase fără cont și nu șterge nimic singură | `FAZA_5_4_ROTIRE_TOTP_PLAN.md` §0 |
| 06.10 | **Locația în formularul de sesizare [amendament]:** un singur câmp de adresă, „Caută pe hartă”, întrebarea la trimiterea fără pin (varianta 1). Pinul rămâne opțional (D6-2) | `AMENDAMENT_LOCATIE_FORMULAR.md` |
| 06.10 | **Tab de anunțuri / vânzări: respins.** Nu se reia fără cererea proprietarului | comunicată de proprietar la 06.10.2026 |
| 07.10 | **G7: numele aplicației este „Urbis Activ”; domeniul este `urbisactiv.ro`**, înregistrat pe firma proprietarului | `AMENDAMENT_MARIADB_SI_GAZDUIRE.md` §1 |
| 07.10 | **G6: găzduirea de producție este ClausWeb** (plan „NodeJS1” cu cPanel, IP dedicat, „Remote SMTP”), cont separat de cel al `electrovolt.ro` | `AMENDAMENT_MARIADB_SI_GAZDUIRE.md` §1–§2 |
| 07.10 | **Baza de date de producție: MariaDB 11.4 [amendament la G2]**; MySQL rămâne suportat. Codul adaptat și testat pe ambele (`91a43b6`); job CI pe MariaDB 11.4 (`f1d6276`) | `AMENDAMENT_MARIADB_SI_GAZDUIRE.md` §1, §3, §4 |

### 13.2 Decizii deschise (neluate la 07.10.2026)

| Subiect | Starea |
|---|---|
| Suita Python (E2E) în CI și pe MariaDB 11.4 | nedecisă; în CI, pe MariaDB rulează numai testele serverului (`AMENDAMENT_MARIADB_SI_GAZDUIRE.md` §4) |
| Mutarea staging-ului pe găzduirea nouă și retragerea celui vechi (G3) | nedecisă |
| Redenumirea în „Urbis Activ” în interfață, documente și repository | nedecisă |
| Pasul B al cheii `TOTP_ENC_KEY` | nedecis; aprobarea pasului A nu obligă la pasul B |
| G-5: verificarea juridică a textului despre Google din politica de utilizare | proprietarul nu s-a pronunțat |
| Sesizările despre vecini apar public, cu descriere și loc | întrebare de produs și juridică (`FAZA_5_4_RAPORT.md` §6) |
| Respingerile de vot și contoarele din tabloul de bord | există pe server, fără ecran în Admin |
| O blocare definitivă rămasă fără cont | nu poate fi ridicată din Admin (`FAZA_5_4_ROTIRE_TOTP_PLAN.md`, corecția din 06.10.2026) |
| Codurile TOTP ale celor două conturi `super_admin` | al doilea cont există din 06.10.2026 (jurnalul de staging §15); ambele coduri TOTP sunt pe același telefon; recomandare deschisă: unul dintre ele pe alt dispozitiv |
