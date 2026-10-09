# AMENDAMENT — AUTENTIFICAREA CETĂȚEANULUI CU GOOGLE

**Proiect:** Turnu Măgurele Civic · **Data:** 05.10.2026 · **Stare:** **versiunea finală, aprobată pentru implementare.** Deciziile G-1…G-7 au fost luate de proprietar la 05.10.2026 (§6). La checkpoint-ul din 08.10.2026 au fost aprobate §8 A–D și §9.2–§9.6; tabela `citizen_oauth_attempts` (§9.1) a fost acceptată de proprietar, iar clarificările `POST` / `Path=/` sunt în §11. **Implementat:** serverul (pasul 2, §12), interfața (pasul 3, §13) și informarea despre Google de pe ecran (pasul 4, §14). Aplicația este înregistrată la Google (pasul 5, §15). Pasul 6 (staging) este în curs (§16). Commit și push numai cu aprobarea explicită a proprietarului.
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
2. Server: rutele, verificarea jetonului, setările, testele (G-T1…G-T10). **Făcut 08.10.2026 (§12); comis: `abfee77`, `71b5516`.**
3. Interfață: butonul, ordinea pe ecran, mesajele de eroare, E2E. **Făcut 09.10.2026 (§13).**
4. Politica de utilizare actualizată (G-5). **Făcut 09.10.2026 în forma decisă de proprietar: rând de informare pe ecran (§14).**
5. Proprietarul: înregistrarea în Google Cloud Console (ghid la execuție). **Făcut 09.10.2026 (§15).**
6. Staging pe domeniul Civic: deploy, probă reală, T-ISO înainte și după; raport și checkpoint. **Început la 09.10.2026 (§16): instalat, proba principală reușită; o modificare decisă în urma probei.**

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

## 13. Implementarea interfeței (pasul 3; 09.10.2026)

### 13.1 Deciziile proprietarului (09.10.2026)

| # | Întrebarea | Decizia |
|---|---|---|
| 13.1-a | Cum se testează interfața: (A) lanțul real, cu un furnizor de identitate fals și o setare nouă pe server, acceptată numai în dezvoltare; (B) simulare numai în browser, fără modificări pe server | **A** |
| 13.1-b | Textele mesajelor de la întoarcere și rândul de sub titlul „Contul meu” | **aprobate**, cu corecția proprietarului: „codul **primit** pe e-mail” (nu „codul pe e-mail”) |

Textele aprobate:

| Motiv (`/#sesizari?google=…`) | Text |
|---|---|
| `eroare` | „Autentificarea cu Google nu a reușit. Încercați din nou sau folosiți codul primit pe e-mail.” |
| `anulat` | „Ați renunțat la autentificarea cu Google. Puteți încerca din nou sau puteți folosi codul primit pe e-mail.” |
| `blocat` | „Această adresă nu mai poate fi folosită pentru un cont nou.” (textul din e-mailul existent `citizen_account_blocked`) |
| `limita` | „Prea multe încercări. Reveniți mai târziu.” |
| sub titlu, numai când butonul există | „Pentru a depune o sesizare aveți nevoie de un cont. Nu cerem nume, telefon sau parolă: intrați cu contul Google sau cu un cod primit pe e-mail. Restul aplicației se folosește fără cont.” |

Textul bifei (regulile de utilizare) **nu** a fost schimbat: ține de pasul 4 (G-5).

### 13.2 Setarea de test `DEV_OIDC_PROVIDER_URL` (decizia 13.1-a)

**Ce este:** adresa furnizorului de identitate fals al testelor E2E (`tests/lib/fake_oidc.mjs`). Cu ea, serverul vorbește cu furnizorul fals în loc de Google (G-T10: fără apeluri reale la Google în teste).

**Riscul și blocarea:** cine controlează furnizorul poate declara orice adresă de e-mail. De aceea:

1. `config.ts`: cu `APP_ENV=staging` sau `production`, **aplicația refuză să pornească** dacă setarea există (mesajul numește setarea);
2. `config.ts`: și în dezvoltare, se acceptă numai `http://localhost:<port>` sau `http://127.0.0.1:<port>` (fără cale, fără utilizator) și, **după audit (§13.7)**, numai dacă și `PUBLIC_BASE_URL` este o adresă locală (un `APP_ENV=development` pus din greșeală pe un server public nu ajunge);
3. `googleOAuth.ts` (`devOidcProviderFor`): a doua verificare, la alegerea furnizorului (mediul și, după audit, cele două adrese locale); altfel întoarce `undefined`, deci se folosește Google;
4. setarea nu se scrie în `civic.env`; o pun numai testele, pe durata rulării. `tests/` nu intră în pachetul de instalare (`package-release.py`: `dist`, `server/dist`, `server/migrations`, `server/seeds`, `server/data`);
5. la pornire, serverul scrie un avertisment în jurnal când furnizorul fals este activ;
6. **după audit (§13.7):** interfața acceptă adresa furnizorului local numai când aplicația însăși este deschisă de pe calculatorul local.

Este o adăugare la serverul aprobat la checkpoint-ul din 08.10.2026: **de trimis la audit împreună cu pasul 3.** Rutele, verificarea jetonului, cookie-urile și auditul din §12 sunt neschimbate; `googleProvider()` a fost numai reorganizat (aceleași adrese Google, verificate de un test nou).

### 13.3 Ce s-a implementat

**Fișiere noi:** `tests/lib/fake_oidc.mjs` (furnizorul fals: pagina „furnizorului”, schimbul codului cu PKCE, cheia publică; ascultă numai pe adresa locală; fără dependențe); `tests/e2e/test_google_autentificare.py` (17 verificări); `server/test/unit/oidcProvider.test.ts` (4 teste).
**Fișiere modificate:** `src/components/report/CitizenLogin.tsx` (butonul, ordinea, mesajele); `src/services/citizenService.ts` (`googleEnabled`, `googleStart`, textele, curățarea adresei); `src/views/IssuesView.tsx` (mesajul de la întoarcere); `server/src/config.ts`, `server/src/auth/googleOAuth.ts`, `server/src/main.ts`, `.env.example` (setarea de test); `server/test/unit/config.test.ts` (5 teste noi); `tests/lib/harness.py` (`fake_oidc`, `backend_server(..., extra_env)`); `tests/run_all.py`, `tests/README.md`.

**Comportament:**

- Butonul „Continuă cu Google” apare numai dacă `GET /api/v1/citizen/auth/google` răspunde 200 (§12.1 a). Altfel (404, eroare de rețea), ecranul este **cel de dinainte**, neschimbat.
- Cu butonul: bifa regulilor → „Continuă cu Google” → „sau” → adresa de e-mail → „Trimite codul pe e-mail” (G-1, §2).
- Fără bifă: mesajul existent („Pentru a continua, acceptați regulile de utilizare.”), sub buton; nu se trimite nimic (§8 A; serverul verifică oricum).
- Cu bifă: `POST …/google/start` prin clientul API, apoi navigare la `authorizationUrl` (§11.1), **numai după validarea strictă a adresei (după audit, §13.7)**. Dacă pornirea este refuzată, mesajul apare sub buton, iar butonul rămâne utilizabil.
- La întoarcerea cu refuz, mesajul apare o singură dată în „Contul meu”, iar adresa se curăță la `/#sesizari` (`history.replaceState`), deci mesajul nu reapare la reîncărcare și nu rămâne în istoric. Un motiv necunoscut nu produce mesaj. Mesajul dispare la o încercare nouă.
- La revenirea cu „Înapoi” de la Google, butonul nu rămâne blocat (`pageshow`).
- În pagină nu se încarcă nimic de la Google (G-T1): sigla este desenată în pagină (SVG).

### 13.4 Butonul și regulile Google (G-T11, verificate la 09.10.2026)

Sursa: pagina Google „Sign in with Google Branding Guidelines”. Aplicat: textul „Continuă cu Google” (traducerea este permisă); sigla „G” standard, în culorile ei, nerecolorată, pe fond alb; tema deschisă (fond `#FFFFFF`, contur `#747775` de 1 px, text `#1F1F1F`); text 14/20, greutate medie; 12 px până la siglă, 10 px între siglă și text, 12 px după text; forma „pilulă”; butonul are lățimea și înălțimea butonului „Trimite codul pe e-mail” (cerința de vizibilitate cel puțin egală).

**Abatere, de știut:** regulile cer fontul „Google Sans”. Încărcarea lui de la Google ar însemna o cerere către Google la fiecare deschidere a paginii, ceea ce contrazice G-T1. Butonul folosește „Google Sans” sau „Roboto” numai dacă există deja pe dispozitiv; altfel, fontul sistemului. Dacă Google cere altceva la verificarea aplicației (pasul 5), fontul se poate include în aplicație, printr-o decizie separată.

### 13.5 Teste

**E2E (`tests/e2e/test_google_autentificare.py`, 17 verificări):** furnizorul fals rulează pe `localhost`, aplicația pe `127.0.0.1`. Pentru browser sunt site-uri diferite, deci întoarcerea este o navigare de pe alt site, ca la Google.

| Verificare | Ce acoperă |
|---|---|
| GU-1 | fără configurare: 404, fără buton, ecranul de dinainte |
| GU-2, GU-3 | ordinea pe ecran (G-1); nimic cerut de la Google sau de la furnizor la încărcare (G-T1) |
| GU-4 | bifa obligatorie: mesaj, nicio cerere, nicio încercare pe server (§8 A) |
| GU-5 | `POST …/start`; numai `openid email`; PKCE S256, `state`, `nonce`; adresa de întoarcere (G-2, §11.1) |
| GU-6 | cont nou: `/#sesizari`, bara contului, cont activ cu versiunea politicii, niciun cod trimis |
| GU-7 | **§9.3:** cookie-ul de sesiune `SameSite=Strict`, `HttpOnly`; după întoarcerea de pe alt site și reîncărcare, sesiunea funcționează; cookie-ul încercării este șters |
| GU-8, GU-9 | același cont la a doua autentificare și după un cont creat prin cod (G-3) |
| GU-10…GU-13 | mesajele `anulat`, `eroare` (adresă neverificată), `blocat` (§9.5), `limita`; motiv necunoscut; adresa curățată |
| GU-14 | pornire refuzată (429): mesaj, butonul rămâne utilizabil |
| GU-15 | codul pe e-mail funcționează ca înainte |
| GU-16 | nicio încercare OAuth nefolosită după scenarii |

Limita pe IP a serverului nu se atinge în E2E (ar cere peste 20 de porniri); regula este testată în `citizenGoogle.test.ts`. GU-13 verifică numai afișarea mesajului.

**Server (unit):** `config.test.ts` (setarea acceptată în dezvoltare; refuzată pe staging și în producție; adrese nelocale refuzate) și `oidcProvider.test.ts` (furnizor de test numai în dezvoltare; adresele locale; furnizorul real folosește numai adresele Google).

**Probe de control** (codul stricat intenționat, pe o copie a proiectului; apoi copia a fost refăcută):

| Proba | Ce a picat |
|---|---|
| S1 setarea acceptată și în afara dezvoltării | `config.test.ts` (staging și producție) |
| S2 orice adresă acceptată ca furnizor | `config.test.ts` |
| S3 furnizorul ales fără verificarea mediului | `oidcProvider.test.ts` |
| U1 butonul afișat fără a întreba serverul | GU-1 |
| U2 fără verificarea bifei în interfață | GU-4, GU-5, GU-16 |
| U3 bifa rămasă sub e-mail | GU-2 |
| U4 adresa necurățată | GU-10…GU-13 |
| U5 motiv necunoscut afișat ca eroare | GU-13 |
| U6 mesajul neafișat | GU-10…GU-13 |
| U7 sigla încărcată de la Google | GU-3 |
| U8 cookie-ul de sesiune cu `SameSite=Lax` | GU-7 |
| U9 butonul blocat după o pornire refuzată | GU-14 |
| U10 se cere și `profile` | GU-5 |
| U11 mesajul vechi rămâne la o încercare nouă | GU-11 |

**Rezultate la commit-ul `0ed3cd0` (local, MySQL 8.0, 09.10.2026; valorile de după corecțiile de audit sunt în §13.7):** lint (frontend, server, shared) și build-urile: OK; suita backend completă: **262/262** (253 + 9 teste noi); `tests/run_all.py`: **143/143** (126 + 17). MariaDB 11.4 și Node 24: prin CI, după push.

### 13.6 De știut înainte de pașii 4–6

1. **Pe staging (`allowlist`)**, o adresă Google care nu este în `EMAIL_ALLOWLIST` primește mesajul `eroare` (G-T8), fără altă explicație.
2. **`TRUST_PROXY` nesetat pe staging** (observație deschisă din HANDOFF §0.4): dacă serverul vede adresa proxy-ului în locul celei a vizitatorului, limita de 20 de porniri pe oră se aplică tuturor împreună. De verificat la pasul 6.
3. **Observație existentă, nemodificată:** în `IssuesView`, un mesaj general (`notice`, de exemplu „Contul a fost șters…”) apare de două ori când cetățeanul nu este autentificat: o dată sus și o dată în „Contul meu”. Mesajul Google apare o singură dată. Reparația este mică, dar este în afara pasului 3.
4. Pasul 6 cere `migrate` (0002) pe staging, ca în §12 punctul 4.

### 13.7 Corecțiile de după audit (09.10.2026)

Auditul pasului 3 (ChatGPT, 09.10.2026) a cerut, înainte de închiderea pasului și de instalarea pe staging: (1) validarea strictă a `authorizationUrl` în interfață, cu teste negative; (2) confirmarea prin teste de integrare că limitarea cererilor este aplicată pe server și că furnizorul de test nu poate fi activat pe staging sau în producție, nici prin configurație greșită; (3) actualizarea documentului de audit. Fără schimbări de arhitectură, de rute sau de contracte API.

**Aprobare (proprietar, 09.10.2026):** corecțiile tehnice din această secțiune sunt aprobate pentru commit. **Aprobarea nu este validarea finală a pasului 3:** aceasta rămâne proba pe staging, cu Google real (pasul 6, §13.7.6).

#### 13.7.1 Validarea strictă a adresei de autorizare

**Problema:** interfața naviga la orice adresă primită de la `POST …/google/start` care începea cu `http://` sau `https://`.

**Corecția:** `shared/src/googleAuthUrl.ts` (`safeGoogleAuthorizationUrl`), folosită în `citizenService.googleStart()`. Interfața navighează numai dacă adresa trece toate regulile; altfel rămâne pe loc, cu mesajul „Autentificarea cu Google nu a putut fi pornită…”. Regulile:

1. valoarea este un șir de cel mult 4096 de caractere ASCII tipăribile (fără spații, fără „\”, fără caractere de control);
2. fără utilizator / parolă în adresă și fără fragment (`#…`);
3. destinația este **exact** una dintre:
   - `https://accounts.google.com/o/oauth2/v2/auth` (portul implicit), de oriunde este deschisă aplicația;
   - `http://localhost:<port>/authorize` sau `http://127.0.0.1:<port>/authorize`, **numai dacă aplicația însăși este deschisă de pe `http://localhost` sau `http://127.0.0.1`**. Pe staging și în producție aplicația este pe HTTPS, pe domeniul ei, deci furnizorul local este respins acolo;
4. parametrii sunt cei ai fluxului nostru: `response_type=code`, numai `openid email` (G-2), PKCE `S256`, cu `client_id`, `redirect_uri`, `state`, `nonce` și `code_challenge` prezente, fiecare o singură dată;
5. navigarea se face la forma normalizată de analizorul de adrese al browserului (aceeași pe care au fost verificate regulile).

**De știut:** interfața nu cunoaște mediul serverului și nici portul furnizorului de test, deci regula locală este „orice port de pe calculatorul local, numai când și pagina este locală”. Serverul nu a primit nicio rută și niciun câmp nou. Fluxul valid nu este schimbat: adresa construită de server pentru Google trece validarea neschimbată (test de integrare) și este aceeași constantă ca în interfață (test unitar).

#### 13.7.2 Limitarea cererilor (G-T9), verificată pe server

Limita era implementată și testată din pasul 2 (un test). La audit s-au adăugat două teste de integrare care apelează rutele reale, cu baza de date și ceasul de test (fără simulare în browser). Confirmat:

| Regula | Verificat |
|---|---|
| pornirea: 20 pe oră pe IP | a 21-a → 429 `RATE_LIMITED`, `Retry-After: 3600`, fără `authorizationUrl`, fără cookie, fără încercare creată |
| întoarcerea: 20 pe oră pe IP | a 21-a → `/#sesizari?google=limita` chiar cu o încercare validă: furnizorul nu este contactat, fără cont, fără sesiune; cookie-ul încercării este șters |
| pe IP, nu global | alt IP nu este afectat, în același moment |
| limite separate | un IP limitat la pornire poate încă primi întoarceri |
| fereastra | un minut înainte de ora următoare: încă refuzat; în ora următoare: permis |
| evidența | refuzurile sunt numărate agregat în `rejected_attempts` (`citizen_code`, `google`, `rate_limited`), fără e-mail |

**Constatări (comportament existent, nemodificat; de știut):**

- fereastra este ora ceasului (nu „ultimele 60 de minute”), ca la toate limitele aplicației: la granița orei pot trece până la 40 de porniri într-un interval scurt;
- cererile refuzate pentru bifă (422) nu creează nimic și nu se numără la limită;
- un refuz pentru limită la întoarcere nu consumă încercarea: aceeași întoarcere, de pe un IP care nu este limitat, reușește în cele 10 minute (cere în continuare `state`, cookie-ul și PKCE);
- limita este pe IP-ul văzut de server: pe staging depinde de `TRUST_PROXY` (§13.6 punctul 2).

#### 13.7.3 Furnizorul de test nu poate fi activat pe staging sau în producție

Patru blocări independente, fiecare cu test și probă de control:

| # | Blocarea | Unde | Testul |
|---|---|---|---|
| 1 | cu `APP_ENV=staging` / `production`, aplicația nu pornește dacă setarea există (inclusiv cu orice valoare, cu sau fără cheile Google) | `config.ts` | `config.test.ts`; **`devOidcStartup.test.ts`: procesul real al aplicației se oprește la configurare, înainte de baza de date**, și când setarea vine din fișierul `CIVIC_ENV_FILE` |
| 2 | **nou:** cu `APP_ENV=development`, dar cu `PUBLIC_BASE_URL` public, aplicația nu pornește dacă setarea există | `config.ts` | `config.test.ts`, `devOidcStartup.test.ts` |
| 3 | la alegerea furnizorului: în afara dezvoltării, sau dacă furnizorul ori aplicația nu sunt locale, se folosește Google, chiar dacă valoarea ar ajunge în configurare pe altă cale | `devOidcProviderFor` | `oidcProvider.test.ts`; integrare: pe staging, cu valoarea pusă direct în configurarea încărcată, `start` întoarce adresa Google |
| 4 | **nou:** interfața respinge adresa furnizorului local când aplicația nu este deschisă de pe calculatorul local | `googleAuthUrl.ts` | `googleAuthUrl.test.ts`; E2E GU-21 |

Un `APP_ENV` scris greșit (de exemplu „Development”) oprește aplicația la pornire (valorile permise sunt exact trei). O setare rămasă goală în fișier nu activează nimic.

**Ce rămâne, onest:** un calculator configurat complet ca unul de dezvoltare (`APP_ENV=development`, `PUBLIC_BASE_URL` local, setarea de test) folosește furnizorul fals. Acesta este scopul setării; un asemenea server nu poate servi domeniul public (adresa de întoarcere este locală), iar interfața de pe domeniul public respinge adresa locală.

#### 13.7.4 Teste noi și probe de control

**Teste noi (26 pe server, 5 E2E):** `server/test/unit/googleAuthUrl.test.ts` (9: adresa Google acceptată; furnizorul local numai de pe pagină locală; adrese externe și asemănătoare; scheme; adrese neconforme; parametri); `server/test/unit/devOidcStartup.test.ts` (7: procesul real); `config.test.ts` (+3); `oidcProvider.test.ts` (+2); `citizenGoogle.test.ts` (+5: două de limitare, trei pentru adresa de autorizare și furnizor); `tests/e2e/test_google_autentificare.py` GU-17…GU-21 (prin interfața reală: adrese externe, scheme, adrese neconforme și răspunsuri de alt tip; adresa Google acceptată; pagină deschisă de pe un nume care nu este local). În E2E, nicio cerere nu pleacă spre Google: cererile din afara aplicației sunt oprite de test și numărate.

**Teste existente adaptate (explicație):** `oidcProvider.test.ts`: `devOidcProviderFor` primește acum și adresa aplicației, deci cele 3 apeluri existente au primit acest parametru; ce verificau a rămas neschimbat și au fost adăugate cazuri. Niciun test nu a fost eliminat sau slăbit.

**Probe de control** (codul stricat intenționat, pe o copie; copia a fost apoi ștearsă):

| Proba | Ce a picat |
|---|---|
| A1 orice site https acceptat ca Google | `googleAuthUrl.test.ts`; GU-17 |
| A2 furnizorul local acceptat de pe orice pagină | `googleAuthUrl.test.ts`; GU-21 |
| A3 calea adresei Google neverificată | `googleAuthUrl.test.ts`; GU-17 |
| A4 utilizator / parolă / fragment acceptate | `googleAuthUrl.test.ts`; GU-17 |
| A5 parametrii neverificați | `googleAuthUrl.test.ts`; GU-19 |
| A6 `http` acceptat spre Google | `googleAuthUrl.test.ts`; GU-18 |
| A7 interfața folosește adresa fără validare | GU-17, GU-18, GU-19, GU-21 (testele unitare trec: funcția este intactă, dar nefolosită) |
| A8 spații și caractere de control acceptate | `googleAuthUrl.test.ts`; GU-18 |
| A9 adresa Google reală respinsă (fluxul valid stricat) | `googleAuthUrl.test.ts`; integrare („fluxul real”); GU-20, GU-21 |
| B1 furnizor de test acceptat cu adresă publică (config) | `config.test.ts`, `devOidcStartup.test.ts` |
| B2 furnizor ales fără verificarea adreselor locale | `oidcProvider.test.ts` |
| B3 setarea acceptată în afara dezvoltării (S1 refăcută) | `config.test.ts`, `devOidcStartup.test.ts` (staging, producție, fișierul de setări) |
| B4 furnizor ales fără verificarea mediului (S3 refăcută) | `oidcProvider.test.ts`; integrare („configurație greșită: pe staging…”) |
| C1 fără limită la pornire | integrare: testul existent și cel nou |
| C2 fără limită la întoarcere | integrare: testul existent și cel nou |
| C3, C4 limită globală în loc de pe IP | integrare (pică și multe teste existente) |
| C5 refuzul pentru limită nenumărat | integrare (testul nou) |
| C6 încercare creată înainte de verificarea limitei | integrare (testul nou) |

**Constatare la probe:** în prima formă, GU-17…GU-21 se opreau cu o excepție când codul stricat lăsa interfața să navigheze (testul pica, dar fără să spună ce verificare). Testul a fost întărit: așteaptă un rezultat clar (respins / navigat / blocat) și continuă; probele refăcute arată verificarea exactă.

#### 13.7.5 Rezultate (local, MySQL 8.0, Node 22, 09.10.2026)

| Comanda | Rezultat |
|---|---|
| `npm run lint` (frontend) | OK |
| `npm run typecheck -w server` | OK |
| `npm run typecheck -w shared` | OK |
| `(cd server && CIVIC_TEST_DATABASE_URL=… node test/run.mjs all)` | **288/288** (63 de suite; 0 picate, 0 sărite). Înainte de corecții: 262 |
| `npm run build` și `npm run build -w server` | OK |
| `git diff --check` | OK |
| `CIVIC_TEST_DATABASE_URL=… python3 tests/run_all.py` | **148/148** (9 suite). Suita Google: 22/22. Înainte de corecții: 143 |

MariaDB 11.4 și Node 24: prin CI, după push (nerulat încă pentru aceste modificări).

#### 13.7.6 Ce nu se poate verifica automat: de făcut pe staging, cu Google real (pasul 6)

Testele automate nu contactează Google. La proba de pe `test.urbisactiv.ro` se verifică:

1. butonul apare numai după setarea cheilor Google; ecranul Google arată numele aplicației și cere numai adresa de e-mail;
2. adresa reală construită de server este acceptată de validarea din interfață și de Google (inclusiv adresa de întoarcere înregistrată în Google Cloud Console);
3. întoarcerea ajunge la aplicație prin lacătul Directory Privacy (§9.6);
4. sesiunea după întoarcere, pe HTTPS, cu cookie-urile `__Host-` (§9.3, §11.2);
5. verificarea jetonului real (semnătura cu cheile Google, emitentul, destinatarul, `nonce`);
6. „Anulează” pe ecranul Google → mesajul de renunțare; o adresă din afara `EMAIL_ALLOWLIST` → mesajul de eroare;
7. același cont ca la codul primit pe e-mail (G-3);
8. IP-ul văzut de server (`TRUST_PROXY`), de care depinde limita pe IP;
9. aspectul butonului pe un telefon real (§13.4);
10. T-ISO înainte și după; `electrovolt.ro` neatins.

Refuzul de a porni cu setarea de test **nu** se probează pe staging (ar opri aplicația); este acoperit de testele automate cu procesul real.

## 14. Pasul 4: textul despre Google (G-5; 09.10.2026)

### 14.1 Constatare

În aplicație nu există un document separat „Politica de utilizare”. Singurul text al regulilor este cel de lângă bifă, pe ecranul „Contul meu”. Textul complet al politicii (2.9) este în registrul Fazei 4 ca sarcină documentară nefăcută, iar verificarea juridică (E-6) este cerută înainte de „date reale”.

### 14.2 Deciziile proprietarului (09.10.2026)

| # | Întrebarea | Decizia |
|---|---|---|
| 14.2-a | Unde apare textul despre Google: (A) rând de informare sub buton; (B) în textul bifei; (C) în ambele | **A**: sub butonul „Continuă cu Google”, vizibil numai când butonul există |
| 14.2-b | Textul: (A) cu fraza despre ce află Google; (B) varianta scurtă | **B**: „Dacă alegeți Google, platforma primește de la Google numai adresa dumneavoastră de e-mail, nu și numele sau fotografia.” |

Urmări:

- **Textul bifei și versiunea politicii (`CITIZEN_POLICY_VERSION = '2026-10'`) sunt neschimbate.** Rândul de informare nu face parte din regulile acceptate prin bifă.
- **Față de G-5** („textul politicii de utilizare va menționa autentificarea cu Google”): mențiunea este pe același ecran, dar nu în textul acceptat prin bifă. Varianta a fost aleasă de proprietar, cu această observație prezentată.
- **Față de §5** („Google află că un anumit cont Google s-a autentificat pe platformă și când… trebuie scris în politica de utilizare și în informarea privind datele personale”): fraza despre ce află Google **nu** este pe ecran (varianta scurtă). Rămâne de scris în documentul complet al politicii / în informarea privind datele personale (sarcina 2.9, E-6), cu verificare juridică. **Nedecis.**

### 14.3 Ce s-a implementat

`src/components/report/CitizenLogin.tsx`: rândul de informare (`data-testid="citizen-google-info"`), sub butonul Google (și sub mesajul de eroare al butonului, când există), deasupra separatorului „sau”. Fără Google configurat, rândul nu apare, ca restul blocului Google. Nicio modificare pe server.

### 14.4 Teste

`tests/e2e/test_google_autentificare.py`, **GU-22**: textul exact aprobat; poziția (sub buton, deasupra lui „sau”); textul bifei nu menționează Google. Absența fără Google este acoperită de GU-1 (cuvântul „Google” nu apare pe ecran).

**Probe de control** (pe o copie): P1 rândul lipsește → GU-22; P2 rândul apare și fără Google configurat → GU-1 (și GU-22, pentru poziție); P3 alt text decât cel aprobat → GU-22; P4 rândul sub „sau” → GU-22.

**Rezultate (local, MySQL 8.0, Node 22, 09.10.2026):** lint, `typecheck` (server, shared) și build-urile: OK; suita backend completă: **288/288** (neschimbată: fără modificări pe server); `tests/run_all.py`: **149/149** (148 + GU-22); suita Google: 23/23. MariaDB 11.4 și Node 24: prin CI, după push.

### 14.5 Deschise după pasul 4

1. Documentul complet „Politica de utilizare” și informarea privind datele personale (2.9, E-6), inclusiv paragraful despre Google (ce primește platforma; ce află Google). Verificarea juridică: nedecisă (G-5).
2. Pasul 5: înregistrarea în Google Cloud Console (proprietarul, după ghid). Ecranul de consimțământ Google cere o adresă a politicii de confidențialitate a aplicației: de stabilit atunci ce adresă se dă.

## 15. Pasul 5: înregistrarea la Google (09.10.2026)

Făcută de proprietar, în Google Cloud Console, după ghidul dat de Claude pas cu pas, cu capturi după fiecare etapă. Ecranele sunt cele din „Google Auth Platform” (Overview, Branding, Audience, Clients), verificate în documentația Google în aceeași zi. **În repository nu intră adresa contului, identificatorul clientului sau secretul.**

### 15.1 Deciziile proprietarului

| # | Întrebarea | Decizia |
|---|---|---|
| 15.1-a | În ce cont Google se creează proiectul (adresa lui este afișată cetățenilor ca e-mail de asistență) | **cont Google nou, dedicat aplicației**, cu adresă Gmail nouă |

Contul este **permanent**: de el depinde autentificarea cu Google pe staging și în producție. Adresa de asistență și proprietarul proiectului se pot schimba ulterior (un al doilea cont poate fi adăugat ca „Owner”).

### 15.2 Ce s-a făcut

| # | Pas | Rezultat (din capturile proprietarului) |
|---|---|---|
| 1 | cont Google dedicat; termenii Google Cloud acceptați (țara România), fără oferta de probă cu card | contul există |
| 2 | proiectul **„Urbis Activ”**, fără organizație | selectat |
| 3 | Google Auth Platform → „Get started”: numele aplicației „Urbis Activ”, e-mailul de asistență = contul dedicat, publicul **External** | „OAuth configuration created!” |
| 4 | Branding → „Authorized domains”: `urbisactiv.ro`. Logo, pagina principală, politica de confidențialitate și termenii: **necompletate** | „Branding changes saved!” |
| 5 | Audience: starea **Testing**, tipul External; un utilizator de test (adresa de test a proprietarului). „Publish app” neapăsat | 1 utilizator din 100 |
| 6 | Clients → client de tip **Web application**, „Urbis Activ staging”; fără „Authorized JavaScript origins”; adresa de întoarcere `https://test.urbisactiv.ro/api/v1/citizen/auth/google/callback` (verificată literă cu literă pe captură) | client creat, secret activ |
| 7 | identificatorul și secretul clientului: salvate de proprietar acolo unde păstrează parolele; nu au trecut prin conversație (secretul); fereastra cu secretul nu a fost capturată | confirmat de proprietar |

### 15.3 Constatări

1. **Utilizatorii de test.** Pagina „Audience” spune: în starea „Testing”, numai utilizatorii de test pot folosi aplicația (cel mult 100, numărați pe toată durata aplicației). Documentația Google spune că, pentru cererile care cer numai `openid` / `email`, lista nu este necesară. Cele două nu au fost puse la probă; adresa de test a fost adăugată în listă, ca proba de pe staging să nu depindă de asta. **Adresa de test trebuie să fie și în `EMAIL_ALLOWLIST`.**
2. **Cât timp aplicația nu este verificată de Google**, pe ecranul Google apare domeniul (`urbisactiv.ro`), nu numele „Urbis Activ”.
3. **Secretul clientului se vede în întregime numai la creare.** Dacă se pierde, se generează altul din pagina clientului („Add secret”), iar cel vechi se dezactivează.
4. Verificarea în doi pași pe contul dedicat: recomandată proprietarului; neconfirmată în conversație.

### 15.4 Rămase pentru lansare (nu pentru proba de pe staging)

- **Înainte de „In production”** Google cere, pentru aplicațiile externe: pagina principală, politica de confidențialitate și termenii (legături pe domeniul autorizat). Aplicația nu are încă o pagină de confidențialitate (§14.5; poarta „date reale”).
- Verificarea mărcii („Verify branding”), ca pe ecranul Google să apară numele și sigla aplicației.
- Un client separat pentru producție (alt secret), cu adresa de întoarcere pe `urbisactiv.ro`; cheile lui intră numai în `civic.env` de producție.
- Declararea datelor cerute (Data Access: `openid`, `email`).

## 16. Pasul 6: staging-ul și proba cu Google real (09.10.2026)

Planul pasului 6 a fost aprobat de proprietar la 09.10.2026, inclusiv comanda `civic-migrate` adăugată în pachet (`f9dfd37`). Intervențiile pe hosting sunt în `STAGING_URBISACTIV_JURNAL.md` (22–25). T-ISO nu a fost rulat: găzduirea este la alt furnizor decât `electrovolt.ro` (aceeași convenție ca la intervențiile 1–20), iar staging-ul vechi a fost retras în aceeași zi.

### 16.1 Instalarea (`civic-f9dfd37.zip`)

Repetiție locală înainte, cu pachetul construit: pe o bază adusă la starea de pe staging (schema 1, cu date demo), codul nou refuză să pornească („rulați «migrate»”); `civic-migrate` aplică numai 0002, datele rămân; a doua rulare nu schimbă nimic; aplicația pornește, cu ruta Google activă.

Pe staging (proprietarul, cu capturi): backup (`civic-backup-20261009T171424982Z`); cele două chei Google adăugate în `civic.env` (fără capturi); pachetul încărcat și extras; `civic-migrate` → „Aplicate: 0002_citizen_oauth_attempts.sql. Schema este la versiunea 2.”; Restart; `health` → `0.0.0+f9dfd37`; pe „Contul meu” apar butonul Google și rândul de informare.

### 16.2 Proba reală (proprietarul, cu adresa din `EMAIL_ALLOWLIST` și din „Test users”)

| # | Verificare (§13.7.6) | Rezultat |
|---|---|---|
| 1 | butonul apare după setarea cheilor; ecranul Google | **OK**: „Alege un cont · Accesează urbisactiv.ro” (domeniul, nu numele aplicației: aplicația nu este verificată de Google) |
| 2 | adresa reală construită de server este acceptată de validarea din interfață și de Google | **OK** (navigarea a avut loc; Google a acceptat adresa de întoarcere) |
| 3 | întoarcerea prin lacătul Directory Privacy (§9.6) | **OK** |
| 4 | sesiunea după întoarcere, pe HTTPS, cu cookie-urile `__Host-` (§9.3) | **OK**: bara „Autentificat ca …”; după reîncărcare rămâne autentificat |
| 5 | verificarea jetonului real (semnătura cu cheile Google, emitentul, destinatarul, `nonce`) | **OK**, implicit: fără ea, autentificarea nu ar fi reușit |
| 7 | același cont ca la codul primit pe e-mail (G-3) | **OK**: în „Sesizările mele” apare sesizarea depusă la 08.10.2026 cu același cont, prin cod |
| 6 | renunțarea; o adresă din afara `EMAIL_ALLOWLIST` | adresa din afara listei: **OK** (16.4, proba D); renunțarea („Anulează”): **nefăcută** |
| 8 | IP-ul văzut de server (`TRUST_PROXY`) | **nefăcut** |
| 9 | aspectul butonului pe un telefon real | **nefăcut** (pe calculator: corect, captura proprietarului) |

### 16.3 Constatare și decizie: alegerea contului

**Constatare:** după „Ieșire”, un click pe „Continuă cu Google” a reintrat direct în cont, fără ecranul „Alege un cont”: Google folosește singur contul deja deschis în browser. Urmări: pe un calculator folosit de mai mulți oameni, cine apasă butonul intră cu contul Google al altcuiva, fără să fie întrebat; „Ieșire” se anulează dintr-un click; probele „renunțare” și „altă adresă” nu au putut fi făcute, pentru că ecranul Google nu mai apare.

**Decizia proprietarului (09.10.2026): Google arată de fiecare dată „Alege un cont”.** Serverul adaugă la adresa de autorizare parametrul `prompt=select_account` (`server/src/routes/citizenGoogle.ts`). Este o modificare a serverului auditat la checkpoint: un singur parametru, fără rute, câmpuri sau reguli noi; validarea din interfață acceptă deja parametri în plus (§13.7.1) și nu a fost schimbată.

**Teste:** integrare: adresa conține `prompt=select_account`, o singură dată (test nou), inclusiv în fluxul real spre Google (verificare adăugată la testul „fluxul real”); E2E **GU-23**: furnizorul primește parametrul. **Probă de control** (pe o copie): fără parametru pe server, pică testul de integrare nou, testul „fluxul real” și GU-23.

**Rezultate (local, MySQL 8.0, Node 22, 09.10.2026):** lint, `typecheck` (server, shared) și build-urile: OK; suita backend completă: **289/289** (288 + testul nou); `tests/run_all.py`: **150/150** (149 + GU-23); suita Google: 24/24. MariaDB 11.4 și Node 24: prin CI, după push.

### 16.4 A doua instalare (`civic-08f4dc3.zip`) și reluarea probei (09.10.2026, seara)

CI la `08f4dc3`: verde pe toate cele 6 joburi (inclusiv MariaDB 11.4 și E2E). Instalarea: pachetul încărcat și extras, Restart; fără migrare și fără schimbări în `civic.env`. `health` → `0.0.0+08f4dc3` (relatat de proprietar, fără captură). Jurnal: intervențiile 26 și 27.

| Proba | Ce s-a verificat | Rezultat |
|---|---|---|
| A | ecranul de alegere a contului apare la apăsarea butonului | **OK** (captură): „Alege un cont · Accesează urbisactiv.ro” |
| B | „Înapoi” din browser, de pe ecranul Google | **OK** (captură): „Contul meu”, regulile bifate, butonul Google utilizabil (corecția `pageshow`, §13) |
| C | autentificarea cu adresa de probă, prin ecranul de alegere | **OK**, relatat de proprietar („totul e ok”), fără captură |
| D | un al doilea cont Google, care nu este în `EMAIL_ALLOWLIST` (confirmat de proprietar) | **OK** (capturi): Google arată ecranul de acord, cu o singură informație cerută: „Adresă de e-mail”; după „Continuă”, aplicația arată „Contul meu” cu mesajul „Autentificarea cu Google nu a reușit. Încercați din nou sau folosiți codul primit pe e-mail.”, **fără** bara „Autentificat ca …” (G-T8) |

Confirmat în plus, din captura probei D: Google cere acordul numai pentru adresa de e-mail (G-2: fără nume, fără fotografie).

Limitele probei D, onest: (1) interfața arată același mesaj pentru orice refuz (așa este proiectat: G-T8, §13.6), deci din captură nu se vede **motivul**; o încercare mai veche de 10 minute ar da același mesaj. Proba a fost reluată de la început, la cererea lui Claude, iar captura a venit la circa 2 minute; refuzul pentru listă este acoperit și de testul de integrare (G-T10). (2) Nu s-a verificat dacă al doilea cont este în lista „Test users” de la Google (§15.3, punctul 1). (3) Renunțarea („Anulează” pe ecranul Google) nu a fost probată cu Google real; este acoperită numai de testele automate, cu furnizorul fals.

### 16.5 Ce rămâne din pasul 6

1. Renunțarea cu Google real: „Anulează” pe ecranul de acord → mesajul „Ați renunțat la autentificarea cu Google…”, neautentificat.
2. `TRUST_PROXY` și aspectul pe telefon (§13.7.6, punctele 8 și 9).
3. Raportul pasului 6 și checkpoint-ul amendamentului (la ChatGPT merge §16, inclusiv modificarea serverului din §16.3).
