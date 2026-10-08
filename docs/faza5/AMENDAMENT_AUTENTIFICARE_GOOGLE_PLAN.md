# AMENDAMENT — AUTENTIFICAREA CETĂȚEANULUI CU GOOGLE

**Proiect:** Turnu Măgurele Civic · **Data:** 05.10.2026 · **Stare:** **versiunea finală, aprobată pentru implementare.** Deciziile G-1…G-7 au fost luate de proprietar la 05.10.2026 (§6). La checkpoint-ul din 08.10.2026 au fost aprobate §8 A–D și §9.2–§9.6; tabela `citizen_oauth_attempts` (§9.1) a fost acceptată de proprietar, iar clarificările `POST` / `Path=/` sunt în §11. **Nimic implementat.** Implementarea începe numai cu acordul proprietarului; commit și push numai cu aprobare explicită.
**Origine:** cererea proprietarului din 05.10.2026: autentificarea cu contul Google să fie prima variantă pentru cetățean; codul pe e-mail să rămână varianta a doua.
**Ce modifică din designul înghețat (Faza 4):** B3 §8, rândul „Mecanism” (astăzi: numai cod de 6 cifre pe e-mail, T-A2); B2 §4.1 (rutele `/citizen/auth/*`); B8 (date personale: apare un furnizor extern de identitate); politica de utilizare (2.9). Regulile A-9, D29–D31 (cont numai pentru depunere; contul are numai e-mailul; un e-mail = un cont) **rămân neschimbate**.
**Condiție:** domeniul Civic (ca la 5.5b). Fără el, nu se poate înregistra aplicația la Google. **Îndeplinită din 07.10.2026:** domeniul este `urbisactiv.ro` (G7), iar staging-ul este `test.urbisactiv.ro`.

## 1. Context

- Astăzi, cetățeanul primește la fiecare autentificare un cod pe e-mail. Constatarea 5.4.9: limita de 3 coduri pe zi pe adresă este silențioasă.
- Reparația mică, făcută separat la 05.10.2026: formularul afișează mereu rândul „Se pot cere cel mult 3 coduri pe zi pentru o adresă de e-mail.”, la pasul „e-mail” și la pasul „cod” (testul `C-2b`). Textul este fix, deci nu dezvăluie dacă o adresă are cont.
- Sesiunea de cetățean nu expiră (varianta B, 30.09.2026), deci autentificarea este rară: la primul dispozitiv, după „Ieșire” sau după ștergerea cookie-urilor.

## 2. Ce se propune

Pe ecranul „Contul meu”, în ordine:

1. bifa pentru regulile de utilizare (neschimbată; obligatorie pentru ambele variante, 2.9);
2. butonul **„Continuă cu Google”** (prima variantă);
3. „sau” + câmpul de e-mail și **„Trimite codul pe e-mail”** (varianta a doua, neschimbată).

După Google, rezultatul este același ca după cod: sesiunea de cetățean existentă (`__Host-civic_sid`), aceleași drepturi, aceleași blocări, același ecran.

**Principiu:** Google dovedește că persoana controlează adresa de e-mail, exact ce dovedește și codul. Contul rămâne „numai e-mailul”.

## 3. Ce NU se schimbă

- Aplicația se folosește fără cont; contul se cere numai la „Depune o sesizare” (A-9).
- Votul în sondaje rămâne fără cont și fără nicio legătură cu identitatea (N4-2, N4-7).
- Conturile Admin: parolă + TOTP, fără Google.
- Codul pe e-mail rămâne disponibil (iPhone fără cont Google, adrese care nu sunt Google, persoane care nu vor Google).
- E-mailurile aplicației (coduri, notificări) merg tot prin SMTP, de pe domeniul Civic (5.5b).

## 4. Proiect tehnic (propunere)

| # | Element | Propunere |
|---|---|---|
| G-T1 | Fluxul | OAuth 2.0 / OpenID Connect, „authorization code” cu PKCE, **prin redirecționare pe server**. Fără scripturi Google încărcate în pagină: browserul ajunge la Google numai când cetățeanul apasă butonul. |
| G-T2 | Rute noi | **`POST /api/v1/citizen/auth/google/start`** (corp JSON `{ policyAccepted: true, policyVersion }`; verifică bifa politicii pe server; creează încercarea OAuth pe server, §8 D; pune cookie-ul `__Host-civic_oauth`; răspunde 200 `{ authorizationUrl }`, iar interfața navighează la Google) și `GET /api/v1/citizen/auth/google/callback` (verifică `state`; schimbă codul pe jeton; verifică jetonul; creează sesiunea; redirecționează la `/#sesizari`). **De ce `POST` la `start` și `GET` la `callback`: §11.1.** |
| G-T3 | Date cerute de la Google | numai `openid email`. **Fără** `profile` (nume, fotografie). Din jeton se folosesc `email` și `email_verified`; nimic altceva nu se salvează. |
| G-T4 | Verificarea jetonului | semnătura (cheile publice Google), emitentul, destinatarul (ID-ul nostru de client), expirarea, `nonce`; **`email_verified` trebuie să fie adevărat**, altfel refuz. |
| G-T5 | Legarea de cont | după e-mailul normalizat: dacă există cont cu acea adresă, se intră în el; dacă nu, se creează (cu versiunea și data acceptării politicii). Același cont, indiferent dacă persoana intră cu Google sau cu cod. Nu se salvează identificatorul Google (`sub`). |
| G-T6 | Cookie-ul de `state` | `__Host-civic_oauth`: `Secure`, `HttpOnly`, `SameSite=Lax`, **`Path=/`, fără `Domain`** (trebuie trimis la întoarcerea de la Google), 10 minute, șters la folosire. Sesiunea rămâne cum este. **Precizat în §8 D** (folosire unică verificată pe server). |
| G-T7 | Setări noi | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` (secret; numai în `civic.env`, niciodată în repository). Fără ele, butonul nu apare și rutele răspund 404: aplicația merge ca acum. |
| G-T8 | Staging | modul `allowlist` rămâne valabil: cu Google pot intra numai adresele din `EMAIL_ALLOWLIST` (G3-c5). |
| G-T9 | Blocări, limite, audit | blocarea are același efect (numai asupra depunerii). **O adresă cu blocare definitivă și fără cont nu primește cont nou** (T-C7, ca la cod; §9.5). Limite pe IP pentru rutele noi. Audit: autentificare reușită / refuzată, fără date în plus (fără `sub`, §8 C). |
| G-T10 | Teste | server: jeton cu semnătură greșită, alt destinatar, expirat, `nonce` greșit, `email_verified` fals, `state` lipsă sau refolosit, cont blocat, `allowlist`; E2E în interfață cu un furnizor de identitate fals, local (permis numai în dezvoltare / CI). Fără apeluri reale la Google în teste. |
| G-T11 | Butonul | propriu, după regulile de identitate vizuală ale Google pentru „Sign in with Google” (de verificat la execuție). |

## 5. Efecte de știut

- **Confidențialitate:** Google află că un anumit cont Google s-a autentificat pe platformă și când. Platforma primește de la Google numai adresa de e-mail. Asta trebuie scris în politica de utilizare și în informarea privind datele personale. **De verificat juridic** (nu este o concluzie a lui Claude).
- **Independența platformei:** apare o dependență de un furnizor extern. Dacă Google este indisponibil sau schimbă condițiile, rămâne codul pe e-mail.
- **Înregistrarea la Google** (proprietarul, Google Cloud Console): proiect, ecran de consimțământ cu numele aplicației, domeniul Civic verificat, adresa de întoarcere exactă. Pașii din consolă se schimbă în timp; ghidul se scrie la execuție, pe ecranele de atunci.
- **Cine controlează căsuța controlează contul:** la fel ca la cod. Dacă o adresă este reatribuită altei persoane (posibil la adrese de firmă), noua persoană intră în contul vechi. Efect limitat: vede și poate șterge sesizările acelui cont.
- **Efort estimat:** două sesiuni de lucru (server + teste; interfață + E2E), plus 30–45 de minute ale proprietarului în Google Cloud Console și un deploy pe staging.

## 6. De decis de proprietar

| # | Întrebare | Variante | Recomandarea lui Claude |
|---|---|---|---|
| G-1 | Ordinea pe ecran | (a) Google primul, codul al doilea; (b) codul primul | **(a)**, conform cererii |
| G-2 | Date de la Google | (a) numai e-mailul; (b) și numele / fotografia | **(a)**: păstrează regula „contul are numai e-mailul” (A-9) |
| G-3 | Același cont pentru Google și pentru cod | (a) da, după e-mailul verificat; (b) conturi separate | **(a)**: un e-mail = un cont (D30) |
| G-4 | Unde se testează | (a) numai pe domeniul Civic; (b) și pe `civic-test.electrovolt.ro` | **(a)**: aplicația înregistrată la Google nu ar trebui legată de `electrovolt.ro` (aceeași separare ca la e-mail, N3-4) |
| G-5 | Textul politicii de utilizare | menționarea autentificării cu Google și a datelor primite | text nou, cu verificare juridică |
| G-6 | Când se face | (a) după 5.5b, ca amendament separat, cu checkpoint propriu; (b) împreună cu 5.5b | **(a)**: nu se amestecă două schimbări de autentificare / e-mail în același pas |
| G-7 | Ce se întâmplă cu limita de coduri | (a) rămâne 3 pe zi, cu textul fix deja afișat; (b) altă valoare | **(a)** |

**Decis de proprietar (05.10.2026):**
- G-1 (a): Google este prima variantă pe ecran; codul pe e-mail, a doua.
- G-2 (a): de la Google se cere numai adresa de e-mail (fără nume, fără fotografie).
- G-3 (a): același cont pentru Google și pentru cod, după e-mailul verificat.
- G-4 (a): testarea se face numai pe domeniul Civic, nu pe `civic-test.electrovolt.ro`.
- G-5: textul politicii de utilizare va menționa autentificarea cu Google. Verificarea juridică a textului rămâne recomandarea lui Claude; proprietarul nu s-a pronunțat asupra ei.
- G-6 (a): se face după 5.5b, ca amendament separat, cu checkpoint propriu.
- G-7 (a): limita rămâne 3 coduri pe zi, cu textul fix deja afișat.

**Precizare la G-4 (08.10.2026, fără schimbarea deciziei):** „domeniul Civic” înseamnă acum `test.urbisactiv.ro` (staging) și `urbisactiv.ro` (producție), conform G7. Aplicația înregistrată la Google nu primește nicio adresă de întoarcere pe `electrovolt.ro`.

## 7. Pași

1. ~~Aprobarea deciziilor G-1…G-7~~ (făcut, 05.10.2026). ~~Checkpoint ChatGPT pe direcție și arhitectură~~ (făcut, 08.10.2026, cu clarificările A–D din §8, trecute și în RULES §13.1). ~~Checkpoint pe §8–§9 și decizia §9.1~~ (făcut, 08.10.2026). ~~Clarificările `POST` și `Path=/`~~ (§11).
2. Server: rutele, verificarea jetonului, setările, testele (G-T1…G-T10). **Făcut 08.10.2026, necomis la data scrierii (§12).**
3. Interfață: butonul, ordinea pe ecran, mesajele de eroare, E2E.
4. Politica de utilizare actualizată (G-5).
5. Proprietarul: înregistrarea în Google Cloud Console (ghid la execuție).
6. Staging pe domeniul Civic: deploy, probă reală, T-ISO înainte și după; raport și checkpoint.

## 8. Clarificări obligatorii de securitate (checkpoint 08.10.2026)

Cerute la checkpoint, înainte de implementare. Sunt **cerințe**, nu recomandări. Fiecare are cel puțin un test pe server (G-T10).

| # | Cerința | Cum se aplică (propunere tehnică) | Testul |
|---|---|---|---|
| **A** | **Acceptarea politicii este obligatorie la Google și se verifică pe server.** Apelul direct al rutelor OAuth nu o poate ocoli. | `POST /citizen/auth/google/start` refuză cu 422 `POLICY_REQUIRED` (fără încercare creată, fără cookie, fără adresă Google) dacă `policyAccepted` nu este `true` sau `policyVersion` diferă de `CITIZEN_POLICY_VERSION` (aceeași regulă și același cod ca la `/citizen/auth/start`). Versiunea acceptată se leagă de încercare (§8 D). La `callback`, contul se creează numai dacă încercarea are versiunea acceptată. Callback-ul nu primește bifa din URL, deci un atacator nu o poate adăuga acolo. Spre deosebire de cod (unde bifa se cere numai la crearea unui cont nou, B2 §4.1), la Google bifa se cere **la fiecare autentificare**, pentru că serverul nu știe dinainte dacă adresa are cont. | `start` fără bifă / fără versiune / cu versiune greșită → 422, fără încercare și fără cookie; `callback` cu o încercare fără versiune acceptată → refuz, fără cont creat |
| **B** | **`email_verified === true`**, după verificarea completă a jetonului. | Ordinea, fără scurtături: (1) `state` valid și nefolosit; (2) codul schimbat pe jeton la Google, cu verificatorul PKCE; (3) jetonul verificat (semnătura cu cheile publice Google, emitentul, destinatarul = ID-ul nostru de client, expirarea, `nonce`); (4) `email_verified` este exact boolean `true` (nu șirul `"true"`, nu lipsă); (5) abia apoi căutarea contului după e-mailul normalizat sau crearea lui. Orice eșec la 1–4 → refuz, fără acces la tabela de conturi. | jeton cu semnătură greșită / alt emitent / alt destinatar / expirat / `nonce` greșit / `email_verified` fals, lipsă sau șir → refuz, fără cont creat și fără sesiune |
| **C** | **`sub` nu se stochează: decizie deliberată de minimizare a datelor**, nu omisiune. | Identitatea contului Urbis Activ rămâne **e-mailul verificat** (A-9, D30: un e-mail = un cont). `sub` (identificatorul Google) nu se scrie în baza de date, în jurnale sau în audit. Consecință acceptată: dacă un cont Google își schimbă adresa, persoana intră cu adresa nouă într-un cont nou (sau într-unul existent cu acea adresă), exact ca la cod. Riscul adreselor reatribuite este cel din §5, identic cu cel de la cod. | testul verifică că nicio tabelă și nicio linie de audit nu conține valoarea `sub` din jetonul de test |
| **D** | **`state`: aleator criptografic, legat de încercare, acceptat o singură dată.** Cookie: `HttpOnly`, `Secure`, `SameSite=Lax`, **`Path=/`, fără `Domain`**, expirare scurtă, invalidat după folosire. | `state` și `nonce`: câte 32 de octeți din generatorul criptografic (`crypto.randomBytes`), base64url. Verificatorul PKCE: 32 de octeți, `S256`. **Folosirea unică este verificată pe server**, nu numai prin ștergerea cookie-ului: încercarea se salvează pe server (hash-ul `state`, `nonce`, verificatorul PKCE, versiunea politicii, data creării, data folosirii) și se marchează „folosită” atomic, la primul `callback` (`UPDATE … WHERE consumed_at IS NULL`, cu exact un rând afectat). Cookie-ul `__Host-civic_oauth` (`Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, fără `Domain`, `Max-Age=600`; prefixul `__Host-` obligă browserul să refuze cookie-ul dacă oricare dintre `Secure`, `Path=/` sau lipsa `Domain` nu este respectată) conține numai `state` și se leagă de încercare: `state` din URL trebuie să fie egal cu cel din cookie **și** să existe nefolosit pe server. Expirarea: 10 minute (cookie și server). La `callback` cookie-ul se șterge indiferent de rezultat (`Max-Age=0`, cu aceleași atribute `Path=/`, `Secure`, fără `Domain`). Încercările expirate sau folosite se șterg automat (aceeași comandă `purge:retention`). | `state` lipsă / diferit de cookie / necunoscut / expirat / **refolosit** (al doilea `callback` cu același `state` și același cookie) → refuz; atributele cookie-ului verificate în răspuns: `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, fără `Domain`, `Max-Age=600`; la callback, ștergerea cu aceleași atribute |

## 9. Ce atinge din designul înghețat (Faza 4) și contradicțiile găsite

Ce atinge amendamentul, numai prin adăugare și numai în limitele deciziilor G-1…G-7: B3 §8 („Mecanism”: a doua variantă de autentificare), B2 §4.1 (două rute noi: `POST …/google/start`, `GET …/google/callback`), B8 și politica de utilizare (G-5). Nu atinge: conturile Admin, autentificarea prin cod, sesizările, sondajele, permisiunile, modelul contului (fără nume, fotografie, `sub` sau conturi Google separate).

| # | Punctul | Analiza | Propunerea |
|---|---|---|---|
| 9.1 | **B1 (modelul de date): §8 D cere o tabelă nouă** pentru încercările OAuth (`citizen_oauth_attempts`: hash `state`, `nonce`, verificator PKCE, versiunea politicii, `created_at`, `expires_at`, `consumed_at`), deci o migrare nouă. Datele sunt ale noastre, temporare (≤ 10 minute + curățare), nu date Google. | Contradicție de formă cu B1 înghețat: tabelă nouă. Alternativa fără tabelă (numai cookie semnat) nu poate garanta „o singură dată” pe server: un cookie copiat ar putea fi refolosit în cele 10 minute. | **Tabela nouă**, consemnată în amendament ca adăugare la B1. **Decis de proprietar la 08.10.2026: DA**, adăugare explicită la B1 (§11.3). |
| 9.2 | **Bifa politicii: Google o cere la fiecare autentificare, codul numai la contul nou** (B2 §4.1, 2.9). | Nu contrazice 2.9 (mai strict, nu mai permisiv). Pe ecran nu se schimbă nimic: bifa este deja deasupra ambelor variante (§2). La un cont existent, versiunea politicii salvată în cont **nu** se actualizează la autentificarea cu Google (la fel ca la cod), ca modelul contului să rămână neschimbat. | fără schimbare de decizie; de reținut |
| 9.3 | **Cookie-ul de sesiune are `SameSite=Strict`** (B3 §3); întoarcerea de la Google este o navigare de pe alt site. | Cookie-ul de sesiune se **setează** corect în răspunsul `callback`. Prima pagină după redirecționare poate să nu-l primească (lanț pornit de pe alt site), dar cererile aplicației (`/citizen/me?optional=1`) sunt pe aceeași origine și îl trimit. Nu cere schimbarea `Strict`. | se verifică în E2E și la proba reală; `Strict` rămâne |
| 9.4 | **Cookie nou cu `SameSite=Lax`** (`__Host-civic_oauth`; `Secure`, `HttpOnly`, `Path=/`, fără `Domain`), deși B3 cere `Strict` pentru sesiune. | Nu este cookie de sesiune: conține numai `state`, nu dă acces la nimic și trăiește 10 minute. `Lax` este necesar ca să fie trimis la întoarcerea de la Google (G-T6, §8 D). | adăugare la B3 §3, consemnată în amendament |
| 9.5 | **Blocarea definitivă fără cont** (T-C7, K-A02-4): codul nu recreează contul. | La Google trebuie același comportament: adresă cu blocare definitivă și fără cont → refuz, fără cont nou. Nu era scris explicit în §4. | adăugat la G-T9; test nou |
| 9.6 | **Lacătul de pe staging** (Directory Privacy, G3-c4). | Întoarcerea de la Google ajunge la `test.urbisactiv.ro`, unde browserul are deja parola lacătului. Nu cere schimbări. | se verifică la proba reală |

Alte contradicții cu designul înghețat: **nu am găsit**.

## 10. Propunerea de checkpoint pe această versiune

Se trimit la checkpoint: acest fișier (§8–§9 sunt noi) și rândul din RULES §13.1.

Întrebări pentru checkpoint:
1. §8 A–D sunt formulate complet și verificabil prin teste?
2. §9.1: tabela nouă pentru încercările OAuth (adăugare la B1) este acceptabilă sau se preferă o altă formă de folosire unică pe server?
3. §9.2–9.6: analiza este corectă?

**Rezultat (08.10.2026):** checkpoint aprobat pentru §8 A–D și §9.2–§9.6; §9.1 decis de proprietar: DA. Au mai fost cerute două clarificări, tratate în §11.

## 11. Clarificările finale (08.10.2026)

### 11.1 `POST` pentru pornirea fluxului

**Concluzie: `POST /citizen/auth/google/start`. Arhitectura existentă nu impune `GET`.** Numai `callback` rămâne `GET`.

- **De ce `POST` la `start`:** pornirea creează o încercare pe server (§8 D), deci are efect. Cu `POST`, ruta intră automat sub protecția CSRF existentă (B3 §3, `registerCsrf`): antetul `X-Civic-Request: 1` plus `Origin` egal cu originea aplicației. Un alt site, un link, o preîncărcare a browserului sau un robot nu pot crea încercări. Bifa politicii vine în corpul JSON, ca la `POST /citizen/auth/start` (aceeași validare, același 422). Ruta este consecventă cu restul API-ului.
- **Consecința tehnică (fără schimbare de design):** un formular HTML trimis direct nu poate pune antetul CSRF, deci serverul nu răspunde cu redirecționare. `start` se apelează prin clientul API existent (`fetch`, aceeași origine), primește 200 `{ authorizationUrl }` și cookie-ul `__Host-civic_oauth`, iar interfața navighează la adresa Google. Aplicația este deja una pe o singură pagină și cere JavaScript, deci nimic nu se pierde. Fără JavaScript, butonul Google nu există; codul pe e-mail funcționează ca acum.
- **De ce `callback` rămâne `GET`:** Google se întoarce la adresa noastră printr-o redirecționare `GET`, cu `code` și `state` în URL (fluxul „authorization code” standard). Varianta `response_mode=form_post` (un `POST` venit de la Google) nu este potrivită: este un `POST` de pe alt site, deci (1) ar fi respins de protecția CSRF existentă, iar (2) cookie-ul `SameSite=Lax` nu ar fi trimis la un `POST` de pe alt site, deci legarea de încercare (§8 D) nu ar funcționa. Efectul `callback`-ului (sesiunea) este protejat de `state` (verificat pe server, o singură dată), de cookie-ul legat de browser și de PKCE, nu de metoda HTTP. Protecția CSRF existentă privește numai metodele care modifică date, deci nu are nevoie de excepții.
- **Limite:** `start` primește limita pe IP (G-T9), la fel ca `/citizen/auth/start`.

### 11.2 Atributele cookie-ului `__Host-civic_oauth`

| Atribut | Valoare |
|---|---|
| Nume | `__Host-civic_oauth` |
| `Secure` | da |
| `HttpOnly` | da |
| `SameSite` | `Lax` |
| `Path` | **`/`** |
| `Domain` | **absent** |
| `Max-Age` | `600` (10 minute); la `callback`: `0`, cu aceleași `Path=/`, `Secure`, fără `Domain` |
| Conținut | numai `state` (aleator, 32 de octeți, base64url); restul datelor încercării sunt pe server |

Prefixul `__Host-` face ca browserul să refuze cookie-ul dacă lipsește `Secure`, dacă `Path` nu este `/` sau dacă există `Domain`. Este aceeași convenție ca la cookie-ul de sesiune (`__Host-civic_sid`, B3 §3, B-7). Testele verifică atributele în răspunsul serverului (§8 D).

### 11.3 Tabela `citizen_oauth_attempts` (decizia §9.1)

Acceptată de proprietar la 08.10.2026 ca **adăugare explicită la B1**. Justificare: folosirea unică a `state`, verificată pe server și atomic (§8 D). Se adaugă printr-o migrare nouă. Migrarea inițială nu se modifică. Conține numai date generate de noi, temporare: hash-ul `state`, `nonce`, verificatorul PKCE, versiunea politicii acceptate, `created_at`, `expires_at`, `consumed_at`. **Fără date Google** (fără e-mail, fără `sub`, fără jetoane). Încercările expirate sau folosite se șterg prin `purge:retention`. Compatibilitatea cu MariaDB 11.4 și MySQL 8 este acoperită de testele de integrare și de jobul CI pe MariaDB.

**Fără alte modificări de design.**

## 12. Implementarea serverului (pasul 2; 08.10.2026)

**Fișiere noi:** `server/migrations/0002_citizen_oauth_attempts.sql`; `server/src/auth/googleOAuth.ts` (furnizorul Google, PKCE, verificarea locală a jetonului cu `node:crypto`, fără dependențe noi); `server/src/routes/citizenGoogle.ts` (cele două rute); `server/test/integration/citizenGoogle.test.ts` (33 de teste, furnizor fals local, fără apeluri la Google).
**Fișiere modificate:** `config.ts` (`GOOGLE_OAUTH_CLIENT_ID` / `_SECRET`: ambele sau niciuna, altfel aplicația nu pornește; mesajul nu conține valorile); `context.ts` (furnizorul înlocuibil în teste; limitele); `schema/citizens.ts` + `schema/index.ts` (tabela, în Drizzle); `maintenance.ts` (`purge:retention` șterge încercările expirate); `app.ts` (înregistrarea rutelor; jurnalul cererilor nu conține `code` / `state` din întoarcere); `shared/src/auth.ts` (schema corpului `start`); `.env.example`.

**Teste existente adaptate (explicație):** `schema.test.ts`, `db.test.ts` și `migrations.test.ts` presupuneau exact 30 de tabele și o singură migrație. Acum verifică cele 30 de tabele B1 **plus** lista explicită a tabelelor adăugate prin amendamente (`citizen_oauth_attempts`), respectiv migrațiile 0001 + 0002. Ce verificau a rămas neschimbat (lista exactă de tabele, motorul, colațiunea, coloanele, cheile străine, refuzul unei migrații modificate sau necunoscute). Numărul cheilor străine rămâne 34, pentru că tabela nouă nu are chei străine.

**Probe de control** (codul stricat intenționat, pe copii, apoi refăcut): A (fără verificarea bifei la `start`; fără verificarea versiunii la întoarcere), B (`email_verified` acceptat ca valoare „adevărată” oarecare; semnătura neverificată; `nonce` neverificat), C (`sub` scris în audit), D (fără `consumed_at IS NULL`; fără expirare; cookie neverificat; `SameSite=Strict`; cookie neșters la întoarcere). Fiecare a făcut să pice cel puțin testul corespunzător. **Constatare la proba D (folosire multiplă):** testul inițial trecea și cu codul stricat, pentru că cele două întoarceri aveau loc la aceeași oră a ceasului de test, iar MySQL raportează 0 rânduri modificate când valoarea nu se schimbă. Testul a fost întărit (ceasul avansează un minut între cele două întoarceri); proba refăcută pică, cum trebuie.

**Rezultate:** suita backend completă, local, pe MySQL 8.0: **252/252**. Lint (frontend, server, shared) și build-urile: OK. MariaDB 11.4: prin jobul CI, după push.

**Decis de proprietar (08.10.2026):** 12.1 → **(a)**: ruta de citire `GET /citizen/auth/google` (200 `{ enabled: true }` / 404, fără efect), adăugată cu test; 12.2 → **A**: auditul rămâne ca la cod (refuzurile numărate agregat în `rejected_attempts`, fără e-mail și fără `sub`; reușitele nu se scriu în `audit_log`).

**De decis / de știut înainte de pasul 3 (interfața)** (formularea inițială; 12.1 și 12.2 sunt decise mai sus):
1. **(12.1) Cum află interfața dacă butonul Google trebuie afișat** (G-T7: fără configurare, butonul nu apare). Nu există încă o rută pentru asta, iar adăugarea ei ar fi o rută nouă, în afara celor două din plan. Variante: (a) o rută de citire, fără efect, de exemplu `GET /citizen/auth/google` → 200 `{ enabled: true }` / 404; (b) interfața afișează butonul mereu, iar dacă pornirea răspunde 404, afișează „indisponibil”. Recomandarea lui Claude: (a).
2. **(12.2) Auditul (G-T9).** Planul spune „audit: autentificare reușită / refuzată”. Autentificarea prin cod nu scrie în `audit_log`, care este auditul administrativ (B4 §5: actor `admin` sau `system`). Implementarea a urmat același comportament ca la cod: refuzurile sunt numărate agregat în `rejected_attempts` (`citizen_code`, `target_id = google`, fără e-mail și fără `sub`), iar reușitele nu se scriu în audit. Dacă se dorește audit pentru fiecare autentificare cu Google, cere o decizie (date personale noi în audit).
3. **Motivele la refuz:** întoarcerea redirecționează la `/#sesizari?google=eroare|anulat|blocat|limita`. Mesajele afișate se stabilesc la pasul 3.
4. **Pe staging, după deploy, trebuie rulată migrația 0002** (`migrate`, ca la instalare): fără ea, aplicația refuză să pornească (schema nu este la versiunea cerută).
