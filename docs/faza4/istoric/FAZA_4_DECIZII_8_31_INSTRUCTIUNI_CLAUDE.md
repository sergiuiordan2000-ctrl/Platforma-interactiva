# FAZA_4_DECIZII_8_31_INSTRUCTIUNI_CLAUDE.md

## Instrucțiune pentru Claude

Acest document consemnează deciziile aprobate în analiza Fazei 4, de la Problema 8 până la Problema 31.

Aceste decizii sunt aprobate și trebuie tratate ca reguli de proiect. Nu le reinterpreta și nu le înlocui. La reluarea lucrului, verifică designul Fazei 4 (B1–B10) în raport cu ele.

**Nu implementa nimic. Nu face commit. Nu face push. Nu modifica repository-ul.**

După verificare, prezintă doar contradicțiile rămase și problemele care necesită o nouă decizie.

---

# Decizia 8 — Sesizări și politica împotriva abuzului

Sistemul va permite blocarea ulterioară a unui utilizator care abuzează de mecanismul de sesizări.

Va exista un disclaimer / o politică de utilizare a sesizărilor, prin care utilizatorilor li se explică obligația de a formula sesizări decente și veridice și de a utiliza responsabil sistemul.

Blocarea este o măsură pentru abuzurile privind depunerea sesizărilor și nu reprezintă o suspendare generală a contului.

---

# Decizia 9 — Publicarea imediată a sesizării

Sesizarea este publicată imediat pe harta publică după depunere.

Nu există moderare prealabilă obligatorie înainte de publicarea inițială.

Sesizarea publică nu afișează identitatea autorului.

---

# Decizia 10 — Ștergerea definitivă a unei sesizări

O sesizare poate fi ștearsă definitiv de administrator.

Ștergerea este distinctă de blocarea utilizatorului.

---

# Decizia 11 — Cine poate șterge definitiv

Doar `super_admin` poate șterge definitiv o sesizare.

`primarie_operator` nu are acest drept.

---

# Decizia 12 — Dreptul de ștergere al `super_admin`

`super_admin` poate șterge definitiv orice sesizare.

Dreptul este necondiționat.

Nu este obligatoriu, prin această decizie, un motiv de ștergere, o aprobare suplimentară sau o procedură prealabilă.

---

# Decizia 13 — Cine poate bloca un utilizator

Doar `super_admin` poate bloca un utilizator de la depunerea de noi sesizări.

`primarie_operator` nu are acest drept.

---

# Decizia 14 — Durata blocării

Blocarea poate fi:

- temporară;
- permanentă.

`super_admin` stabilește tipul și durata blocării.

---

# Decizia 15 — Efectul blocării

Blocarea afectează exclusiv dreptul de a depune sesizări noi.

Utilizatorul blocat:

- își păstrează contul;
- se poate autentifica;
- poate utiliza celelalte funcții disponibile;
- nu poate crea sesizări noi cât timp blocarea este activă.

---

# Decizia 16 — Sesizările existente ale utilizatorului blocat

Blocarea nu afectează automat sesizările existente.

Sesizările existente:

- rămân în sistem;
- rămân pe harta publică, conform regulilor lor.

Eliminarea unei sesizări existente este o operație distinctă.

---

# Decizia 17 — Utilizatorul blocat și sondajele

Blocarea este strict legată de modulul de sesizări.

Utilizatorul blocat:

- poate vota în continuare la sondaje;
- poate utiliza celelalte funcții disponibile contului său.

---

# Decizia 18 — Accesul la conținutul public

Utilizatorul blocat:

- poate vedea harta publică;
- poate vedea sesizările publice;
- poate consulta informațiile publice ale acestora.

Blocarea nu limitează accesul la conținutul public.

---

# Decizia 19 — Ștergerea propriei sesizări

Utilizatorul își poate retrage / șterge propria sesizare, inclusiv după publicare.

Această operație este distinctă de ștergerea administrativă efectuată de `super_admin`.

---

# Decizia 20 — Efectul ștergerii propriei sesizări

Când utilizatorul își șterge propria sesizare:

- ștergerea este definitivă;
- sesizarea dispare de pe hartă;
- este eliminată din baza de date;
- sunt eliminate și datele asociate, conform regulilor de retenție / ștergere stabilite în proiect.

---

# Decizia 21 — Ștergerea după transmiterea către Primărie

Utilizatorul își poate șterge definitiv propria sesizare chiar dacă aceasta:

- a fost deja transmisă Primăriei;
- este `în analiză`.

Ștergerea din aplicație nu poate retrage:

- e-mailul deja transmis;
- copia pe care Primăria a primit-o.

---

# Decizia 22 — Ștergerea unei sesizări `rezolvată`

Autorul își păstrează dreptul de a șterge definitiv propria sesizare indiferent de starea ei.

Inclusiv dacă Primăria a marcat-o `rezolvată`.

Nu este necesară aprobarea `super_admin`.

---

# Decizia 23 — Notificarea Primăriei la ștergerea de către autor

Când autorul își șterge propria sesizare:

- aplicația NU trimite notificare Primăriei despre ștergere;
- regula se aplică și dacă sesizarea fusese deja transmisă Primăriei;
- regula se aplică și dacă fusese deja marcată `rezolvată`.

---

# Decizia 24 — Sesizare ștearsă și acțiunea Primăriei

Dacă o sesizare a fost ștearsă definitiv de autor:

- ea nu mai există în aplicație;
- Primăria nu mai poate opera asupra ei;
- Primăria nu o mai poate marca `rezolvată`;
- copia/e-mailul primit anterior de Primărie rămâne în afara aplicației;
- această copie nu reactivează sesizarea în aplicație.

---

# Decizia 25 — Numerotarea `TM-XXX`

Identificatorul unei sesizări este unic și nu se reutilizează.

Exemplu:

- `TM-015` este șters;
- următoarea sesizare primește `TM-016`, nu `TM-015`.

Numerotarea nu se recalculează după ștergeri.

---

# Decizia 26 — Rezervarea definitivă a `TM-XXX`

După atribuirea unui identificator `TM-XXX`, numărul rămâne rezervat definitiv.

- Ștergerea sesizării nu eliberează numărul.
- Numărul nu poate fi reutilizat niciodată.
- Regula se aplică indiferent dacă sesizarea a fost transmisă sau nu Primăriei.

---

# Decizia 27 — Lista propriilor sesizări

Utilizatorul autentificat poate vedea lista propriilor sesizări și starea lor cât timp acestea există în aplicație.

Poate vedea:

- `TM-XXX`;
- starea;
- informațiile publice ale sesizării.

După ștergerea definitivă, sesizarea nu mai apare în lista proprie și nu mai este disponibilă în aplicație.

---

# Decizia 28 — Ce vede autorul în propria sesizare

Autorul vede exact aceleași informații pe care le vede publicul:

- categoria;
- descrierea;
- fotografia;
- locația;
- starea;
- `TM-XXX`.

Nu se afișează autorului:

- starea transmiterii e-mailului;
- coada de e-mail;
- procesarea internă;
- alte date administrative nepublice.

---

# Decizia 29 — Contul cetățeanului și e-mailul

Cetățeanul NU are nevoie de cont pentru utilizarea generală a aplicației.

Aplicația rămâne complet funcțională fără autentificare pentru funcțiile publice.

Contul este solicitat **doar când utilizatorul dorește să depună o sesizare**.

Contul conține adresa de e-mail.

`super_admin` poate vedea adresa de e-mail asociată contului în zona administrativă.

E-mailul:

- nu este publicat pe hartă;
- nu este publicat în sesizare;
- poate fi transmis Primăriei dacă utilizatorul solicită transmiterea sesizării către Primărie.

Nu se colectează alte date personale despre cetățean în cadrul acestui flux, în afara celor deja aprobate prin proiect.

---

# Decizia 30 — Conturile cetățenilor

Regula este:

> **un e-mail = un singur cont**

O adresă de e-mail poate fi asociată unui singur cont.

Nu introducem mecanisme suplimentare de identificare a persoanei reale pentru MVP.

---

# Decizia 31 — Verificarea e-mailului

Se aprobă **confirmarea prin e-mail**.

Când cetățeanul dorește să creeze cont pentru a depune o sesizare:

1. introduce adresa de e-mail;
2. aplicația trimite un link sau cod de confirmare;
3. contul devine activ după confirmarea adresei.

---

# Sinteză operațională

Fluxul cetățeanului este:

1. Cetățeanul poate utiliza aplicația fără cont.
2. Pentru depunerea unei sesizări trebuie să aibă cont.
3. Contul este asociat unei singure adrese de e-mail.
4. E-mailul este verificat prin confirmare.
5. Sesizarea primește un `TM-XXX` unic, care nu se reutilizează niciodată.
6. Sesizarea este publicată imediat pe hartă.
7. Identitatea și e-mailul autorului nu sunt publice.
8. Dacă cetățeanul solicită transmiterea către Primărie, sesizarea este trimisă automat la e-mailul Primăriei, iar Primăria primește adresa de e-mail a autorului.
9. Utilizatorul își poate șterge definitiv propria sesizare, indiferent de starea ei.
10. Ștergerea nu retrage e-mailul deja transmis Primăriei și nu notifică Primăria.
11. O sesizare ștearsă nu mai poate fi procesată în aplicație de Primărie.
12. `super_admin` poate șterge definitiv orice sesizare.
13. `super_admin` poate bloca un utilizator de la depunerea de sesizări.
14. Blocarea poate fi temporară sau permanentă.
15. Blocarea nu afectează contul, accesul la conținutul public sau votarea în sondaje.
16. Sesizările existente ale utilizatorului blocat nu sunt afectate automat.

---

# Instrucțiune pentru reluarea Fazei 4

La reluare:

1. tratează deciziile 8–31 de mai sus ca **aprobate**;
2. verifică documentele B1–B10 în raport cu aceste decizii;
3. identifică orice contradicție dintre design și deciziile aprobate;
4. nu implementa nimic;
5. nu face commit;
6. nu face push;
7. nu modifica repository-ul;
8. prezintă doar contradicțiile și problemele care necesită o nouă decizie.

**STOP după verificare.**
