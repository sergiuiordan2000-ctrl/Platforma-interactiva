# AMENDAMENT — AUTENTIFICAREA CETĂȚEANULUI CU GOOGLE

**Proiect:** Turnu Măgurele Civic · **Data:** 05.10.2026 · **Stare:** **deciziile G-1…G-7 luate de proprietar la 05.10.2026 (§6); nimic implementat.** Implementarea așteaptă domeniul Civic și checkpoint-ul pe acest plan.
**Origine:** cererea proprietarului din 05.10.2026: autentificarea cu contul Google să fie prima variantă pentru cetățean; codul pe e-mail să rămână varianta a doua.
**Ce modifică din designul înghețat (Faza 4):** B3 §8, rândul „Mecanism” (astăzi: numai cod de 6 cifre pe e-mail, T-A2); B2 §4.1 (rutele `/citizen/auth/*`); B8 (date personale: apare un furnizor extern de identitate); politica de utilizare (2.9). Regulile A-9, D29–D31 (cont numai pentru depunere; contul are numai e-mailul; un e-mail = un cont) **rămân neschimbate**.
**Condiție:** domeniul Civic (ca la 5.5b). Fără el, nu se poate înregistra aplicația la Google.

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
| G-T2 | Rute noi | `GET /api/v1/citizen/auth/google/start` (cere bifa politicii; pune `state`, `nonce` și verificatorul PKCE într-un cookie scurt, semnat; redirecționează la Google) și `GET /api/v1/citizen/auth/google/callback` (verifică `state`; schimbă codul pe jeton; verifică jetonul; creează sesiunea; redirecționează la `/#sesizari`). |
| G-T3 | Date cerute de la Google | numai `openid email`. **Fără** `profile` (nume, fotografie). Din jeton se folosesc `email` și `email_verified`; nimic altceva nu se salvează. |
| G-T4 | Verificarea jetonului | semnătura (cheile publice Google), emitentul, destinatarul (ID-ul nostru de client), expirarea, `nonce`; **`email_verified` trebuie să fie adevărat**, altfel refuz. |
| G-T5 | Legarea de cont | după e-mailul normalizat: dacă există cont cu acea adresă, se intră în el; dacă nu, se creează (cu versiunea și data acceptării politicii). Același cont, indiferent dacă persoana intră cu Google sau cu cod. Nu se salvează identificatorul Google (`sub`). |
| G-T6 | Cookie-ul de `state` | `HttpOnly`, `Secure`, `SameSite=Lax` (trebuie trimis la întoarcerea de la Google), 10 minute, șters la folosire. Sesiunea rămâne cum este. |
| G-T7 | Setări noi | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` (secret; numai în `civic.env`, niciodată în repository). Fără ele, butonul nu apare și rutele răspund 404: aplicația merge ca acum. |
| G-T8 | Staging | modul `allowlist` rămâne valabil: cu Google pot intra numai adresele din `EMAIL_ALLOWLIST` (G3-c5). |
| G-T9 | Blocări, limite, audit | blocarea are același efect (numai asupra depunerii). Limite pe IP pentru rutele noi. Audit: autentificare reușită / refuzată, fără date în plus. |
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

## 7. Pași

1. ~~Aprobarea deciziilor G-1…G-7~~ (făcut, 05.10.2026). Rămân: checkpoint ChatGPT pe acest plan, apoi trecerea deciziilor în RULES.
2. Server: rutele, verificarea jetonului, setările, testele (G-T1…G-T10).
3. Interfață: butonul, ordinea pe ecran, mesajele de eroare, E2E.
4. Politica de utilizare actualizată (G-5).
5. Proprietarul: înregistrarea în Google Cloud Console (ghid la execuție).
6. Staging pe domeniul Civic: deploy, probă reală, T-ISO înainte și după; raport și checkpoint.
