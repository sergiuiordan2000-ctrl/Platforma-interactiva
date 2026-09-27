# TURNu MĂGURELE CIVIC — INSTRUCȚIUNI PENTRU CLAUDE
## Faza 4 — Integrarea deciziilor suplimentare și pregătirea reviziei următoare

**STATUS:** implementare în documentația Fazei 4; NU modifica repository-ul și NU implementa cod.

---

## 1. SCOP

Integrează cumulativ în documentația Fazei 4 toate deciziile aprobate în conversația de clarificare de după reconcilierea reviziei 2.

Aceste decizii sunt aprobate de Sergiu și trebuie tratate ca reguli de produs, nu ca propuneri.

**Nu redeschide deciziile de mai jos.**

Păstrează istoricul modificărilor și marchează modificările cu un identificator clar, de exemplu `[SET-A-02]`.

Nu modifica repository-ul, nu face commit și nu face push.

---

# 2. DECIZII APROBATE

## 2.1 Tranziția `nouă` → `în analiză`

O sesizare trece automat din `nouă` în `în analiză` **numai după ce e-mailul către Primărie a fost trimis efectiv/acceptat de serverul de e-mail**.

Consecințe:

- dacă cetățeanul nu solicită transmiterea către Primărie, sesizarea rămâne `nouă`;
- dacă transmiterea este solicitată, dar e-mailul nu a fost încă trimis, sesizarea rămâne `nouă`;
- după confirmarea trimiterii efective, starea devine `în analiză`.

Nu considera simpla apăsare a butonului de trimitere drept transmitere efectivă.

---

## 2.2 Notificările către cetățean

Cetățeanul primește notificări numai pentru două schimbări de stare:

1. `nouă` → `în analiză`;
2. `în analiză` → `rezolvată`.

Nu se trimit notificări separate pentru:

- asumare;
- preluare;
- alte evenimente intermediare;
- alte acțiuni administrative.

---

## 2.3 Moderarea

**Nu există moderare după publicare.**

Sesizarea este publică imediat după depunere, conform regulilor deja aprobate.

Nu există mecanism prin care o sesizare să fie „ascunsă” temporar prin moderare.

Prin urmare, documentația trebuie să elimine/neutralizeze:

- `reports.moderate`;
- endpoint-urile de moderare;
- fluxurile de moderare rămase din proiectarea anterioară.

Sesizarea poate ieși din sistem prin ștergerea definitivă de către:

- autor;
- `super_admin`.

---

## 2.4 Locația / pinul

Cetățeanul poate indica locația în două moduri:

### Varianta 1 — punct pe hartă
Poate alege manual un punct pe hartă, inclusiv poziția sa curentă.

### Varianta 2 — adresă
Poate introduce o adresă, de tip:

`stradă + număr`

Aplicația încearcă să determine automat poziția prin geocodarea adresei și să plaseze un pin **aproximativ**, cu toleranță suficient de mare încât să nu pretindă o precizie nejustificată.

Utilizatorul trebuie să poată verifica poziția propusă.

Dacă poziția nu poate fi determinată rezonabil:

- sesizarea poate fi depusă;
- sesizarea rămâne în sistem;
- sesizarea NU apare pe hartă până când nu există o poziție geografică validă.

Pinul nu este obligatoriu ca acțiune manuală a cetățeanului.

---

## 2.5 Retenția datelor

Politica de retenție decisă este:

**45 de zile pentru toate categoriile de date discutate.**

Se aplică inclusiv:

- sesizării;
- e-mailurilor/jurnalelor e-mail;
- fotografiilor;
- datelor contului cetățeanului;
- backup-urilor.

După expirarea perioadei se aplică ștergerea conform politicii de retenție.

**Excepție:** identificatorul `TM-XXX` rămâne rezervat definitiv și nu este reutilizat.

---

## 2.6 Blocarea cetățeanului

Doar `super_admin` poate bloca un utilizator de la depunerea de sesizări.

Blocarea poate fi:

- temporară;
- permanentă.

O blocare temporară poate fi ridicată manual înainte de termen de către `super_admin`.

Blocarea este asociată contului/e-mailului, nu unei identități reale.

---

## 2.7 Ștergerea contului cetățeanului

Cetățeanul își poate șterge contul.

Ștergerea contului:

- NU șterge automat sesizările existente;
- sesizările rămân în platformă conform politicii de retenție;
- identitatea autorului nu este afișată public.

---

## 2.8 Opțiunea „Public / Public anonim”

Opțiunea este eliminată complet.

Nu mai există în formular alegerea:

- „Public”;
- „Public anonim”.

Toate sesizările sunt publicate conform regulilor platformei, fără afișarea identității autorului.

---

## 2.9 Politica de utilizare

La crearea contului de cetățean, utilizatorul trebuie să bifeze explicit că:

- a citit;
- acceptă

politica de utilizare a platformei.

Politica trebuie să includă reguli privind, între altele:

- sesizări reale;
- informații corecte;
- limbaj decent;
- utilizarea neabuzivă a platformei;
- responsabilitatea pentru conținutul transmis.

Încălcarea regulilor poate conduce la blocarea contului de către `super_admin`.

---

## 2.10 Fotografii

Fotografiile atașate unei sesizări devin publice imediat împreună cu sesizarea.

Nu există verificare/moderare prealabilă a fotografiilor.

Responsabilitatea pentru conținut revine utilizatorului, conform politicii acceptate.

`super_admin` poate șterge sesizarea dacă este abuzivă.

---

## 2.11 Operații administrative exclusive `super_admin`

Următoarele operații sunt exclusiv ale `super_admin`:

- corectarea poziției unei sesizări;
- reîncercarea trimiterii unui e-mail eșuat;
- accesul la jurnalul e-mailurilor.

`primarie_operator` NU poate efectua aceste operații.

---

## 2.12 Limita geografică

Platforma acceptă sesizări numai în interiorul:

**UAT Turnu Măgurele.**

Backend-ul trebuie să verifice apartenența locației la limita administrativă definită pentru UAT.

---

## 2.13 Flux e-mail către Primărie indisponibil

Dacă cetățeanul a solicitat transmiterea sesizării către Primărie, dar fluxul de e-mail este temporar indisponibil:

- sesizarea rămâne în așteptare;
- nu devine `în analiză`;
- transmiterea se reia automat când fluxul este reactivat;
- cetățeanul nu trebuie să depună/retrimită manual sesizarea.

---

## 2.14 Limită anti-spam către Primărie

Se introduce o limită automată de:

**maximum 3 sesizări / utilizator / 24 de ore către Primărie.**

Limita trebuie aplicată la nivel de backend, nu doar în UI.

---

## 2.15 Recuperarea accesului `super_admin` / TOTP

Se acceptă **ambele mecanisme**:

### A. Coduri de recuperare
La configurarea TOTP se generează coduri de recuperare unice.

Fiecare cod poate fi folosit o singură dată.

### B. Recuperare de către alt `super_admin`
Un alt `super_admin` autorizat poate reseta configurația TOTP a administratorului.

Implementarea trebuie să trateze aceste mecanisme ca proceduri de recuperare distincte și auditate.

---

# 3. REGULI DEJA STABILITE CARE RĂMÂN VALABILE

Nu modifica următoarele reguli deja aprobate:

- aplicația este complet utilizabilă fără cont;
- contul cetățeanului este cerut numai când utilizatorul dorește să depună o sesizare;
- contul conține doar e-mailul;
- e-mailul este confirmat;
- autentificarea cetățeanului se face prin e-mail;
- un e-mail = un cont;
- identitatea autorului nu este afișată public;
- locația sesizării este publică;
- stările sunt exact:
  - `nouă`
  - `în analiză`
  - `rezolvată`
- `rezolvată` poate fi setată numai de subcontul Primăriei;
- asumarea/preluarea nu schimbă starea;
- transmiterea către Primărie este opțională și se face la cererea cetățeanului;
- Primăria primește doar adresa de e-mail a cetățeanului;
- doar `super_admin` vede e-mailul cetățeanului în Admin;
- numărul `TM-XXX` rămâne rezervat definitiv;
- ștergerea definitivă poate fi făcută de autor sau `super_admin`;
- sondajele se închid automat la data de sfârșit.

---

# 4. CE TREBUIE ACTUALIZAT

Integrează deciziile de mai sus cumulativ în toate documentele Fazei 4 unde sunt relevante.

În special verifică:

- modelul de date;
- API;
- autentificare;
- autorizare;
- sesizări;
- date personale;
- e-mail;
- anti-spam;
- testare;
- arhitectura și indexul;
- documentul DECIZII_NOI.

Elimină contradicțiile create de regulile noi.

Nu păstra simultan reguli vechi și noi care se contrazic.

---

# 5. CORECTURI OBLIGATORII IDENTIFICATE LA RECONCILIERE

Aplică și corecțiile tehnice/documentare care NU necesită o nouă decizie de produs:

1. elimină `admin_only`, deoarece contrazice deciziile aprobate;
2. elimină mecanismul de moderare;
3. asigură că `primarie_operator` nu poate vedea e-mailul cetățeanului nici indirect prin jurnalul e-mailurilor;
4. actualizează câmpurile și testele lipsă;
5. corectează numărul total de tabele conform modelului final;
6. aliniază documentația privind fluxul de e-mail cu regula `nouă` → `în analiză`;
7. aliniază documentația privind retenția la 45 de zile;
8. aliniază documentația privind ștergerea contului;
9. aliniază documentația privind blocarea;
10. aliniază documentația privind fotografiile publice;
11. aliniază documentația privind limita geografică;
12. aliniază testele anti-spam la limita de 3/24h;
13. aliniază documentația și testele pentru recuperarea TOTP.

---

# 6. IMPORTANT — NU IMPLEMENTA COD

Această etapă este exclusiv pentru **documentația Fazei 4**.

Nu modifica:

- repository-ul;
- codul;
- branch-urile;
- Git;
- commit-uri;
- push-uri.

---

# 7. LIVRABILE

După integrare, livrează:

1. arhiva completă a documentației Fazei 4, cu revizia următoare;
2. raportul de modificări;
3. lista exactă a deciziilor integrate;
4. lista eventualelor contradicții rămase;
5. lista punctelor care chiar mai necesită o decizie a lui Sergiu.

Pentru fiecare modificare nouă folosește marcajul:

`[SET-A-02]`

Păstrează istoricul modificărilor vizibil, conform modului folosit la reviziile precedente.

---

# 8. REGULA DE OPRIRE

După integrare:

**NU inventa noi întrebări dacă problema este doar o consecință tehnică.**

Dacă un aspect poate fi proiectat tehnic fără schimbarea unei decizii de produs, rezolvă-l în documentație și marchează-l ca decizie tehnică.

Dacă există într-adevăr o contradicție care necesită alegerea lui Sergiu, listeaz-o separat și explică exact de ce este necesară.

**Nu modifica repository-ul.**

**STATUS AȘTEPTAT:** Faza 4 — documentație actualizată după setul de decizii; implementarea backend-ului nu începe încă.
