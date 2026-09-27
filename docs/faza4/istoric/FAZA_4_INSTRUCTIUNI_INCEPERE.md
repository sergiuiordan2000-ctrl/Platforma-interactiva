# FAZA 4 — ÎNCEPERE PROIECTARE BACKEND

Proiect: Turnu Măgurele Civic

## 1. AUTORIZARE

Începem oficial Faza 4 — PROIECTAREA BACKEND-ULUI.

Checkpoint-ul Fazei 3 este închis și publicat:

- commit: `cb9f47e9b13d337198e42cfdbf34ee42a6995635`
- branch: `recovery-etapa-5-0e2cc20`
- local și GitHub sincronizate;
- `main` este neatins;
- working tree este curat.

Faza 4 este acum autorizată pentru ANALIZĂ ȘI PROIECTARE.

## 2. OBIECTIV

Proiectează complet backend-ul aplicației Turnu Măgurele Civic înainte de orice implementare.

Respectă strict numerotarea B din documentația proiectului:

- B1 — persistență (server + bază de date) și migrarea datelor din localStorage
- B2 — API și model asincron în frontend
- B3 — autentificare și sesiuni pe server
- B4 — autorizare pe server (matricea de permisiuni și regulile 6.1–6.6)
- B5 — sesizări: TM-XXX, fotografii și PublicMapReport pe server
- B6 — e-mail real și jurnal
- B7 — protecții anti-spam
- B8 — date personale și de contact doar pe server
- B10 — strategia de testare

B9 NU SE FOLOSEȘTE.

Staging-ul, găzduirea, secretele, branch-urile și dependențele tehnice T1–T8 se tratează în proiectare.

## 3. REGULĂ FUNDAMENTALĂ

NU IMPLEMENTA NIMIC.

În această etapă:

- nu crea `server/`;
- nu crea `shared/`;
- nu modifica frontend-ul;
- nu modifica niciun fișier de cod;
- nu instala dependențe;
- nu modifica `package.json`;
- nu crea schema DB în cod;
- nu crea migrații;
- nu crea endpoint-uri;
- nu configura hosting;
- nu configura MySQL;
- nu configura DNS;
- nu configura VPS/staging;
- nu face deploy.

Poți crea DOAR documentația necesară pentru proiectarea Fazei 4, dacă aceasta este cerută de workflow-ul proiectului.

## 4. SURSE OBLIGATORII

Înainte de proiectare, citește și folosește ca surse de referință:

- `PROJECT_RULES_AND_DECISIONS.md`
- `PROJECT_HANDOFF_CURRENT.md`
- documentația aprobată a Fazei 3;
- Master Plan v1.1;
- documentul care definește Faza 4 și numerotarea B1–B10;
- codul existent din repository, pentru a identifica exact ce trebuie migrat și ce contracte există deja.

Nu inventa decizii care nu sunt consemnate.

Dacă există o contradicție între documente, NU o rezolva tacit. Identific-o și prezint-o ca problemă de decizie.

## 5. B1 — PERSISTENȚĂ

Proiectează:

- modelul complet de persistență;
- entitățile și relațiile;
- identificatorii;
- cheile primare și externe;
- constrângerile de integritate;
- indexurile necesare;
- auditul;
- sesizările;
- sondajele și voturile;
- conturile și sesiunile;
- configurările;
- coada de e-mail;
- rate limiting / anti-abuz;
- fotografiile și metadatele lor;
- datele personale și separarea lor;
- datele publice necesare hărții.

Analizează explicit migrarea din `localStorage`.

Separă:

- date care trebuie migrate;
- date demo care NU trebuie migrate în producție;
- date care trebuie regenerate;
- date care trebuie eliminate.

Nu îngheța încă schema dacă există decizii care necesită clarificare.

## 6. B2 — API

Proiectează contractele API la nivel suficient pentru implementare ulterioară:

- endpoint;
- metodă HTTP;
- autentificare necesară;
- rol/permisie;
- request;
- response;
- erori;
- validare;
- reguli de securitate;
- efecte asupra DB.

Separă clar:

- API public;
- API cetățean;
- API Admin;
- autentificare;
- operații interne.

Nu implementa endpoint-urile.

## 7. B3 — AUTENTIFICARE

Proiectează:

- conturile;
- parolele;
- hashing;
- sesiunea server-side;
- cookie-urile;
- expirarea;
- revocarea;
- resetarea parolei;
- blocarea după încercări repetate;
- anularea sesiunilor după schimbări sensibile;
- 2FA obligatoriu pentru `super_admin`;
- procedura de creare a primului `super_admin`.

Respectă deciziile D8 deja aprobate.

Nu introduce mecanisme noi fără să le marchezi ca propuneri.

## 8. B4 — AUTORIZARE

Pornește de la matricea existentă și de la regulile 6.1–6.6.

Verifică fiecare operație:

- cine o poate executa;
- ce date poate vedea;
- ce poate modifica;
- ce poate șterge;
- ce rămâne strict intern;
- ce poate deveni notificare privată către cetățean.

Respectă excepția D8-4 deja aprobată.

Nu transforma accidental `primarie_operator` în `super_admin`.

## 9. B5 — SESIZĂRI

Proiectează:

- generarea sigură a `TM-XXX`;
- concurența;
- tranzacțiile;
- fotografiile;
- stocarea și accesul;
- PublicMapReport;
- coordonatele exacte vs. coordonatele publice;
- moderarea;
- statusurile;
- preluarea/asumarea;
- auditul;
- relația cu e-mailul;
- protecția datelor personale.

Ține cont de D6, D9 și A-17.

## 10. B6 — E-MAIL

Respectă toate deciziile N-3 și A-17.

Proiectează:

- coada;
- stările;
- retry;
- idempotency;
- jurnalul;
- expeditorul;
- destinatarul;
- configurarea de către `super_admin`;
- confirmarea către cetățean;
- notificările D9;
- fluxul către Primărie;
- modul simulat/staging/producție;
- retenția de 45 de zile;
- atașamentele;
- protecțiile anti-abuz.

Fluxul real către Primărie rămâne oprit până la condițiile A-17.

## 11. B7 — ANTI-SPAM

Respectă N-4 și proiectează concret, dar fără a inventa încă pragurile numerice finale.

Acoperă:

- jetonul anonim;
- cookie-ul server-side;
- rate limiting;
- honeypot;
- timpul minim;
- proof-of-work activabil;
- idempotency;
- protecția API;
- protecția sesizărilor;
- protecția voturilor;
- auditarea tentativelor.

Distinge clar:

- ce este garantat;
- ce doar reduce abuzul;
- ce nu poate fi garantat.

## 12. B8 — DATE PERSONALE

Proiectează separarea datelor personale de datele publice.

Verifică explicit:

- nume;
- e-mail;
- telefon;
- adresă;
- descriere;
- fotografii;
- coordonate;
- datele sondajelor;
- răspunsuri libere;
- audit.

Respectă regula că datele personale și de contact sunt pe server și nu sunt expuse inutil către frontend/public.

## 13. B10 — TESTARE

Propune strategia completă:

- unit;
- integrare;
- API;
- DB;
- autentificare;
- autorizare;
- securitate;
- concurență;
- e-mail;
- retry;
- anti-spam;
- sondaje/vot;
- migrare localStorage;
- teste frontend/backend;
- teste de regresie;
- teste staging;
- criterii de acceptare.

Leagă testele de deciziile și riscurile identificate în Faza 3.

## 14. DEPENDENȚE ȘI T1–T8

Analizează dependențele tehnice și compatibilitatea stabilită în N-2/G5.

Nu instala și nu actualiza nimic.

Pentru fiecare dependență relevantă indică:

- rol;
- versiune propusă;
- motiv;
- compatibilitate;
- risc;
- alternativă, dacă există.

Dacă apare o incompatibilitate cu regulile aprobate, oprește-te și raportează problema.

## 15. REZULTATUL AȘTEPTAT

La final trebuie să existe un pachet de proiectare suficient de clar pentru ca implementarea ulterioară să poată începe fără decizii arhitecturale majore rămase neclare.

Raportul trebuie să includă cel puțin:

1. arhitectura backend;
2. modelul DB;
3. relațiile;
4. API-ul;
5. autentificarea;
6. autorizarea;
7. sesizările;
8. e-mailul;
9. anti-spam;
10. datele personale;
11. migrarea localStorage;
12. strategia de testare;
13. staging și compatibilitate;
14. secrete/configurare;
15. riscuri;
16. decizii care mai trebuie aprobate.

## 16. REGULĂ PENTRU DECIZII NOI

Dacă în timpul proiectării apare o alegere care nu este deja acoperită de deciziile aprobate:

NU o considera aprobată.

Marcheaz-o:

`DECIZIE NOUĂ — NECESITĂ APROBARE`

și prezintă:

- problema;
- opțiunile;
- propunerea;
- impactul;
- ce alte componente afectează.

## 17. CHECKPOINT FAZA 4

Nu declara Faza 4 finalizată doar pentru că documentele au fost generate.

Checkpoint-ul este atins numai când:

- B1–B8 și B10 sunt proiectate;
- schema DB este completă;
- contractele API sunt complete;
- arhitectura este coerentă;
- deciziile restante sunt identificate;
- contradicțiile sunt rezolvate sau prezentate explicit;
- designul a fost revizuit;
- designul este aprobat explicit.

Până la acel moment:

- NU implementa;
- NU face commit;
- NU face push;
- NU începe Faza 5.

## 18. RAPORT FINAL

La finalul analizei raportează concis:

- ce ai analizat;
- documentele create;
- deciziile deja acoperite;
- deciziile noi care necesită aprobare;
- eventualele contradicții;
- ce mai lipsește pentru checkpoint.

Apoi OPREȘTE-TE.

Nu implementa nimic și așteaptă aprobarea mea pentru următorul pas.