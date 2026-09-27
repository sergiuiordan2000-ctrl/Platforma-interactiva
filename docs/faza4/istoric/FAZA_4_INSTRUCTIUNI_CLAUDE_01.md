# FAZA_4_INSTRUCTIUNI_CLAUDE_01.md

## PROIECT
Turnu Măgurele Civic

## Scop
Actualizează documentația de proiectare a Fazei 4 pe baza deciziilor aprobate mai jos.

**IMPORTANT:**
- Nu implementa nimic în repository.
- Nu crea `server/`, `shared/` sau alte componente de cod.
- Nu instala dependențe.
- Nu modifica `package.json`.
- Nu modifica hostingul, DNS-ul, MySQL sau VPS-ul.
- Nu face commit sau push.
- Lucrează exclusiv asupra documentației Fazei 4.
- Nu lua decizii noi în locul lui Sergiu/ChatGPT.
- Problemele/deciziile care nu sunt menționate mai jos rămân în așteptare pentru următorul set de instrucțiuni.

## DECIZII APROBATE PÂNĂ ACUM

### 1. DN-01 — Permisiuni noi
Se păstrează EXACT trei permisiuni noi:
- `accounts.manage`
- `notifications.recipient.manage`
- `audit.view`

Toate trei sunt exclusiv atributul `super_admin`.

Nu se introduce o a patra permisiune pentru anonimizarea datelor de contact.

### 2. DN-02 — Auditarea asumărilor
Regula 6.6 rămâne neschimbată:
- nu se păstrează istoric al asumărilor individuale ale sesizărilor;
- jurnalul de audit poate păstra operațiunile administrative care trebuie urmărite;
- auditul nu va fi folosit pentru a reconstrui un istoric ascuns al asumărilor.

### 3. E-3 — Închiderea automată a sondajelor
Se aprobă închiderea automată pe server la `endDate`.

La atingerea `endDate`:
- sondajul devine `closed`;
- voturile noi sunt respinse;
- rezultatele finale intră în arhiva publică;
- nu este necesară intervenția manuală a administratorului pentru închiderea normală.

### 4. DN-12 — Datele de contact și anonimizarea
Nu se introduce o funcție separată de anonimizare a contactului.

Nu se introduce o a patra permisiune.

Modelul funcțional aprobat este:
- aplicația cunoaște pentru contul cetățeanului doar datele de cont necesare proiectului, inclusiv adresa de e-mail;
- identitatea autorului NU apare în proiecția publică a sesizării;
- harta publică afișează locația problemei și informațiile publice ale sesizării, fără numele/contul/e-mailul autorului;
- cetățeanul decide la depunere dacă dorește transmiterea sesizării către Primărie;
- dacă solicită transmiterea, Primăria primește doar adresa de e-mail asociată contului, prin acest mecanism;
- nu există o operație administrativă separată de „anonimizare” a contactului.

### 5. DN-21 — Textul locației este public
Textul locației problemei este public după moderare.

Poate conține, de exemplu:
- strada;
- numărul imobilului;
- blocul;
- alte elemente care descriu locul problemei.

Publicarea locației descrie locul problemei și nu trebuie interpretată ca identificare a autorului.

Nu se presupune că proprietarul imobilului indicat este persoana care a făcut sesizarea.

### 6. DN-09 — Stările sesizării și tranzițiile
Stările sunt strict controlate:

1. `nouă` — sesizarea a fost depusă;
2. `în analiză` — sesizarea a fost transmisă către Primărie;
3. `rezolvată` — poate fi setată numai dacă Primăria acceptă să participe la proiect și dispune de un subcont de administrare care poate opera asupra sesizării.

Nu sunt permise tranziții arbitrare între stări.

Separat de existența subcontului:
- sesizarea poate fi transmisă automat prin e-mail către adresa Primăriei;
- transmiterea prin e-mail NU depinde de existența unui subcont al Primăriei.

### 7. Transmiterea către Primărie este opțională
La depunerea sesizării, cetățeanul decide dacă dorește transmiterea către Primărie.

Dacă cetățeanul NU solicită transmiterea:
- sesizarea rămâne în aplicație;
- starea rămâne `nouă`;
- nu se transmite automat către Primărie;
- după moderare, poate deveni publică pe hartă conform regulilor proiectului.

Nu modifica această regulă prin interpretare.

## PUNCT IMPORTANT — CE NU ESTE ÎNCĂ DECIS
Nu lua nicio decizie asupra următoarelor puncte. Ele rămân pentru următorul set de instrucțiuni ChatGPT/Sergiu:
- mecanismul exact prin care `nouă` devine `în analiză`;
- DN-08 și limitele UAT;
- DN-11 retenția datelor;
- DN-15 valorile numerice;
- DN-18 recuperarea TOTP;
- alte DN/K/O/E rămase neînchise;
- orice altă regulă care nu este explicit aprobată mai sus.

În special, NU presupune încă dacă `în analiză` este setată automat la confirmarea transmiterii e-mailului sau manual.

## CE TREBUIE SĂ FACI ACUM

1. Actualizează documentația Fazei 4 pentru a reflecta EXACT deciziile de mai sus.
2. Elimină contradicțiile documentare generate de prima proiectare:
   - cele trei permisiuni rămân exact cele de mai sus;
   - nu există permisiune separată pentru anonimizare;
   - regula 6.6 rămâne fără istoric al asumărilor;
   - sondajele se închid automat la `endDate`;
   - textul locației poate fi public după moderare;
   - participarea administrativă a Primăriei este distinctă de transmiterea prin e-mail;
   - transmiterea către Primărie este opțională pentru cetățean;
   - `rezolvată` este disponibilă doar prin subcontul Primăriei, dacă aceasta participă în proiect.
3. Păstrează trasabilitatea: marchează clar ce a fost modificat ca urmare a acestor decizii.
4. Nu modifica alte decizii și nu „completa” golurile prin presupuneri.
5. Nu implementa cod.

## LIVRABIL
Pregătește documentația revizuită și un scurt raport de modificări:
- ce documente ai modificat;
- ce secțiuni ai modificat;
- ce contradicții ai eliminat;
- ce puncte rămân deschise.

La final, raportează STATUS:
`DOCUMENTAȚIE ACTUALIZATĂ — AȘTEAPTĂ URMĂTORUL SET DE DECIZII`

## REGULĂ DE OPRIRE
După actualizarea documentației, OPREȘTE-TE.

Nu continua cu implementarea, commit, push, instalări sau alte modificări.
