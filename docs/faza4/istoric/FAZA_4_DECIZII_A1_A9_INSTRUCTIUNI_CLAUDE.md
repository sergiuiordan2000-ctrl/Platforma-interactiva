# FAZA 4 — DECIZII A-1 … A-9
## Instrucțiuni pentru Claude — aplicarea deciziilor după analiza deciziilor 8–31

**Scop:** Aplică în documentația Fazei 4 numai deciziile de mai jos, stabilite explicit de Sergiu împreună cu ChatGPT după analiza Claude a deciziilor 8–31.

**Important:**
- Aceste decizii se adaugă istoricului deja aprobat (deciziile 1–7 și 8–31).
- NU reanaliza și NU modifica deciziile 1–7 sau 8–31 decât în punctele de mai jos, unde se precizează explicit că o regulă anterioară este înlocuită.
- Nu implementa nimic în repository.
- Nu instala pachete.
- Nu face commit sau push.
- Actualizează doar documentația Fazei 4.
- Marchează modificările clar, de exemplu `[SET-A-01]`.
- După aplicare, raportează exact documentele și secțiunile modificate și orice contradicție rămasă.
- Dacă o consecință este pur tehnică și nu necesită o nouă decizie de produs, proiecteaz-o fără a transforma-o într-o întrebare inutilă.
- Nu considera acest set drept aprobarea întregului design Fazei 4. Designul rămâne neînghețat până la închiderea tuturor problemelor relevante.

---

## A-1 — Ștergerea definitivă a sesizărilor

**Decizie: A**

Regula veche 6.1 („Sesizările nu se șterg, de niciun rol; nu există `deleteReport`”) este **abrogată**.

Noua regulă:
- autorul își poate șterge definitiv propria sesizare;
- `super_admin` poate șterge definitiv orice sesizare;
- ștergerea este o decizie de produs și nu trebuie tratată ca o modificare făcută doar pentru a face testele să treacă.

Testul vechi `R6.1`, care verifica inexistența unei operații de ștergere, trebuie revizuit în conformitate cu noua regulă.

---

## A-2 — Publicarea imediată pe hartă

**Decizie: A**

Decizia 9 privind publicarea imediată a sesizării pe harta publică **înlocuiește regulile anterioare** care cereau moderare/aprobare înainte de publicare.

Se înlocuiește inclusiv fluxul:
`Admin → Moderare → Hartă`.

Consecință documentară:
- Master Planul și Planul de Lucru Comun v1.1 vor trebui amendate ulterior pentru această schimbare.
- Nu reintroduce moderarea prealabilă ca cerință pentru publicarea pe hartă.

---

## A-3 — Textul locației este public

**Decizie: A**

Decizia 9 înlocuiește și regula din Setul 01 / DN-21 conform căreia textul locației devenea public numai după moderare.

Regula actuală:
- sesizarea este publicată imediat;
- locația problemei este publică;
- textul locației este public;
- nu se publică informații despre identitatea autorului.

Exemplu: dacă cetățeanul indică o stradă, un bloc sau un număr de casă, aceasta este considerată locația problemei și poate fi publică; nu rezultă din aceasta identitatea autorului.

---

## A-4 — Cont de cetățean necesar numai pentru sesizări

**Decizie: A**

D29–D31 înlocuiesc C-1 și regula anterioară „fără conturi de cetățeni”.

Regula actuală:
- aplicația este complet funcțională pentru utilizarea generală fără cont;
- contul este necesar numai când cetățeanul dorește să depună o sesizare;
- contul are o adresă de e-mail;
- adresa de e-mail este verificată;
- un e-mail = un singur cont.

Nu introduce alte date personale obligatorii pentru cont.

---

## A-5 — Drepturi exclusive ale super_admin

**Decizie: B**

Nu se introduc permisiuni noi în matricea celor trei permisiuni aprobate.

Următoarele sunt drepturi exclusive ale rolului `super_admin`, separate de matricea obișnuită de permisiuni:
1. ștergerea definitivă a sesizărilor;
2. blocarea utilizatorilor de la depunerea de sesizări.

`primarie_operator` nu primește aceste drepturi prin permisiuni `reports.*`.

---

## A-6 — Lista propriilor sesizări în MVP

**Decizie: A**

D27 înlocuiește D9-6.

În MVP există o zonă privată în care cetățeanul autentificat își poate vedea propriile sesizări.

Lista include cel puțin:
- identificatorul `TM-XXX`;
- starea sesizării;
- informațiile publice relevante ale sesizării.

Funcția nu se amână pentru Etapa 7.

---

## A-7 — Starea sesizării este publică

**Decizie: B**

Starea sesizării devine informație publică.

Prin urmare:
- starea este afișată pe harta publică;
- autorul vede aceeași stare ca publicul;
- formularea D28 „autorul vede exact aceleași informații pe care le vede publicul” rămâne coerentă în acest punct.

Stările deja stabilite pentru sesizări rămân:
- `nouă`
- `în analiză`
- `rezolvată`

Nu introduce alte stări fără o decizie nouă.

---

## A-8 — Vizibilitatea e-mailului cetățeanului

**Decizie: A**

Doar `super_admin` poate vedea adresa de e-mail a cetățeanului în zona administrativă a aplicației.

`primarie_operator` NU are acces la e-mailul autorului în aplicație.

Separat:
- dacă cetățeanul solicită transmiterea sesizării către Primărie, e-mailul său poate fi transmis Primăriei, conform regulilor deja stabilite;
- aceasta nu acordă `primarie_operator` acces automat la e-mail în interfața Admin.

---

## A-9 — Autentificarea prin e-mail este necesară numai pentru depunerea unei sesizări

**Decizie finală**

Regula de produs este:

> Aplicația poate fi utilizată complet fără cont. În momentul în care cetățeanul dorește să depună o sesizare, trebuie să își creeze un cont folosind o adresă de e-mail și să confirme acea adresă. Numai după confirmarea e-mailului poate depune sesizarea.

Concret:
- Acasă, Comunicate, Hartă, Sondaje etc. → fără cont;
- la acțiunea „Depune o sesizare” → se solicită autentificare/creare cont;
- utilizatorul introduce adresa de e-mail;
- adresa trebuie confirmată;
- numai după confirmare poate depune sesizarea;
- ulterior, contul permite accesul la lista propriilor sesizări.

Date obligatorii:
- e-mail.

Nu se cer pentru cont:
- nume;
- telefon;
- CNP;
- adresă personală;
- alte date personale.

E-mailul are două roluri:
1. identificarea și autentificarea contului cetățeanului;
2. poate fi transmis Primăriei atunci când cetățeanul solicită transmiterea sesizării.

**Important:** modul tehnic de confirmare a e-mailului diferă în funcție de mediu (staging/producție) și trebuie proiectat tehnic de Claude. Nu transforma această diferență de implementare într-o nouă decizie de produs.

---

# SINTEZĂ OBLIGATORIE

După aplicarea acestui set, designul trebuie să reflecte cumulativ următoarele reguli:

1. Sesizările pot fi șterse definitiv de autor sau de `super_admin`.
2. Sesizarea este publicată imediat pe hartă, fără moderare prealabilă.
3. Locația/textul locației este public.
4. Identitatea autorului nu este publicată.
5. Aplicația funcționează fără cont pentru utilizarea generală.
6. Contul este necesar numai pentru depunerea unei sesizări.
7. Contul folosește e-mail verificat.
8. Doar `super_admin` poate șterge sesizări și bloca utilizatori de la depunerea de sesizări.
9. Cetățeanul are în MVP o listă privată cu propriile sesizări.
10. Starea sesizării este publică.
11. Doar `super_admin` vede e-mailul autorului în Admin.
12. Nu se colectează nume, telefon sau alte date personale obligatorii pentru cetățean.

---

# CERINȚĂ FINALĂ PENTRU CLAUDE

Aplică acest set în documentația Fazei 4 și:

1. identifică toate regulile/porțiunile de documentație care trebuie actualizate;
2. marchează fiecare modificare `[SET-A-01]`;
3. păstrează vizibil istoricul modificărilor;
4. NU modifica repository-ul;
5. NU implementa cod;
6. NU instala nimic;
7. NU face commit/push;
8. raportează contradicțiile rămase după aplicare;
9. separă clar:
   - decizii rezolvate prin acest set;
   - probleme care încă necesită o decizie de produs;
   - consecințe tehnice care pot fi proiectate fără o nouă decizie;
10. așteaptă următorul set de decizii.

**STATUS după aplicare:** DOCUMENTAȚIE Faza 4 — revizie următoare, design încă neînghețat.
