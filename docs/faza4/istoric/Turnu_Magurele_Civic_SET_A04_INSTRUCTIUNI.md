# Turnu Măgurele Civic — Instrucțiuni SET-A-04
## Continuarea controlată a Fazei 4

**Data:** 28.09.2026\
**Faza curentă:** Faza 4 — Proiectarea backend-ului\
**Revizia de bază:** Revizia 4\
**Checkpoint Git:** `8d87e94654b05521dd82a3faef4d6ee28438b804`\
**Branch:** `recovery-etapa-5-0e2cc20`

---

## 1. SCOP

Continuăm Faza 4 pornind strict de la checkpoint-ul Reviziei 4.

Nu reluăm proiectarea de la zero și nu redeschidem deciziile deja stabilite.

Obiectivul este:
1. să corectăm în următoarea rundă regulile deja clarificate;
2. să identificăm și să închidem ultimele decizii reale ale Fazei 4;
3. să producem ulterior o revizie consolidată;
4. să ajungem la auditul final și la aprobarea Checkpoint-ului Fazei 4;
5. abia după aceea să înceapă implementarea backend-ului din Faza 5.

---

# 2. REGULA IMEDIATĂ — 90 ZILE → 45 ZILE

În Revizia 4 există încă mențiunea privind păstrarea copiilor de siguranță pentru aproximativ 90 de zile.

**Aceasta NU este o decizie aprobată.**

Decizia stabilită este:

> **Retenția este de 45 de zile.**

În următoarea rundă de modificări trebuie:
- eliminată perioada de aproximativ 90 de zile;
- înlocuită cu regula de 45 de zile acolo unde se referă la datele unei sesizări;
- fără inventarea unei excepții de 90 de zile;
- dacă există o limitare tehnică privind backup-urile, aceasta se consemnează ca problemă tehnică de implementare, nu ca regulă de produs care extinde retenția la 90 de zile.

Nu modifica alte reguli doar pentru a rezolva această corecție.

---

# 3. DECIZII DEJA STABILITE — NU SE REDESCHID

Următoarele sunt considerate decise și trebuie tratate ca sursă de adevăr:

### Utilizarea și contul cetățeanului
- Aplicația poate fi utilizată fără cont.
- Autentificarea prin e-mail devine obligatorie numai când cetățeanul dorește să depună o sesizare.
- Contul cetățeanului folosește e-mailul.
- Autentificarea se face fără parolă, prin mecanismul stabilit în documentație.

### Sesizarea și locația
- Sesizarea poate fi localizată:
  1. prin alegerea unui punct pe hartă; sau
  2. prin introducerea unei adrese (stradă + număr).
- Dacă este introdusă o adresă, aplicația o geocodează și poate plasa automat un pin aproximativ, cu toleranță mare.
- Locațiile sunt acceptate numai în UAT Turnu Măgurele.
- O sesizare fără poziție poate fi salvată, dar nu apare pe hartă.

### Publicarea
- Sesizarea este publicată imediat, fără moderare prealabilă.
- Identitatea/e-mailul cetățeanului nu sunt publice.
- Opțiunea „Public / Public anonim” a fost eliminată.
- Moderarea sesizărilor a fost eliminată.

### Stările sesizării
Fluxul este:
`nouă → în analiză → rezolvată`

- „în analiză” apare automat când e-mailul către Primărie a fost transmis efectiv.
- Dacă transmiterea este oprită, sesizarea așteaptă și se transmite la reactivarea fluxului.
- O sesizare netransmisă nu poate deveni „rezolvată”.
- Notificările către cetățean sunt limitate la schimbările de stare stabilite anterior.

### Ștergerea și TM-XXX
- Ștergerea sesizării este definitivă.
- Poate fi făcută de autor sau de `super_admin`, conform regulilor aprobate.
- Numărul `TM-XXX` rămâne rezervat și nu este reutilizat.
- Regula de retenție stabilită pentru datele sesizării este de **45 de zile**.

### Blocarea cetățeanului
- `super_admin` decide între:
  - blocare 15 zile; sau
  - blocare definitivă.
- La blocarea definitivă NU se șterg toate datele necesare identificării.
- Se păstrează identificatorul minim necesar pentru a împiedica recrearea contului cu același e-mail.
- Regula de retenție de 45 de zile nu trebuie interpretată astfel încât să permită unui utilizator blocat definitiv să recreeze contul.
- Nu introduce alte perioade de retenție fără decizie explicită.

### Drepturi
- `super_admin` are drepturile exclusive stabilite în reviziile aprobate.
- Operatorul Primăriei nu trebuie să poată vedea e-mailul cetățeanului.
- Nu reintroduce permisiunea de moderare.

### Alte decizii deja stabilite
- Imaginile comunicatelor provin din aplicație/repository; nu se introduce CDN sau stocare externă pentru această cerință.
- Lista T1–T8 existentă nu a fost modificată prin SET-A-03.
- `main` nu trebuie modificat în această etapă.

---

# 4. CE NU ESTE ÎNCĂ DECIS

Nu inventa răspunsuri pentru următoarele.

## REC-02 — retenția datelor care NU țin de o sesizare

Trebuie clarificat separat ce perioadă se aplică pentru:
- contul cetățeanului;
- audit fără legătură cu o sesizare;
- sesiuni;
- jurnalele generale ale aplicației;
- textele libere din sondaje;
- blocările temporare după expirare.

Important:
- K-A02-3 și REC-01 stabilesc deja regula pentru datele legate de sesizare.
- REC-02 este o problemă separată.
- Nu extinde automat regula de 45 de zile la toate aceste categorii fără decizie.

## DN-04 — T1–T8

Lista existentă T1–T8 rămâne neschimbată.

Dacă există o ambiguitate privind descrierea sau originea lor, prezintă problema fără să modifici lista și fără să inventezi o interpretare.

## DN-05 — branch-urile pentru Faza 5

Trebuie stabilită strategia de branch-uri pentru implementarea Fazei 5.

Nu o modifica fără decizie.

## DN-07 — sistemul de operare pentru mediul local

Este necesară doar informația privind sistemul de operare al calculatorului de dezvoltare.

Nu presupune Windows/Linux/macOS fără confirmare.

---

# 5. PROPUNERI TEHNICE NEAPROBATE

În documentația actuală există propuneri tehnice marcate ca neconfirmate, inclusiv T-C1…T-C9.

Nu le transforma automat în reguli aprobate.

Dacă una dintre ele este necesară pentru implementare, prezintă separat:
- problema;
- opțiunile;
- consecința tehnică;
- decizia necesară de la Sergiu.

---

# 6. MODUL DE LUCRU DE ACUM ÎNAINTE

Pentru a evita pierderea timpului și reluarea discuțiilor:

### A. Nu relua deciziile închise
Nu mai întreba despre lucruri deja stabilite în secțiunea 3.

### B. Întrebările se pun UNA CÂTE UNA
Pentru fiecare problemă rămasă:
1. explică simplu ce trebuie decis;
2. oferă variante clare;
3. explică pe scurt consecința fiecăreia;
4. așteaptă răspunsul lui Sergiu;
5. consemnează decizia;
6. treci la următoarea.

### C. Nu modifica documentația după fiecare răspuns
Strânge deciziile într-un set nou.

După ce avem suficiente decizii, Sergiu va cere explicit integrarea lor în documentație.

### D. Nu face commit/push automat
Nu face commit sau push decât după instrucțiune explicită.

---

# 7. ORDINEA DE LUCRU RECOMANDATĂ

1. Corectarea conceptuală pregătită pentru următoarea revizie:
   **90 zile → 45 zile**.
2. REC-02 — retenția datelor care nu țin de o sesizare.
3. DN-04 — confirmarea tratării listei T1–T8.
4. DN-05 — strategia de branch-uri pentru Faza 5.
5. DN-07 — sistemul de operare.
6. Confirmarea/închiderea propunerilor tehnice care chiar necesită decizie.
7. Consolidarea tuturor deciziilor într-un singur set.
8. Generarea următoarei revizii a documentației.
9. Audit final al Fazei 4.
10. Aprobarea Checkpoint-ului Fazei 4.
11. Actualizarea documentelor generale depășite (RULES, HANDOFF, Plan, Master Plan), înainte de Faza 5.
12. Abia apoi începe implementarea backend-ului.

---

# 8. CE NU TREBUIE FĂCUT ACUM

- Nu implementa backend-ul.
- Nu modifica codul aplicației.
- Nu modifica `main`.
- Nu începe Faza 5.
- Nu redeschide deciziile aprobate.
- Nu transforma propuneri tehnice în decizii aprobate.
- Nu introduce perioade de retenție noi.
- Nu interpreta 90 de zile ca regulă aprobată.
- Nu face commit/push fără instrucțiune explicită.

---

# 9. CHECKPOINT DE REFERINȚĂ

Punctul de pornire este:

**Commit:** `8d87e94654b05521dd82a3faef4d6ee28438b804`\
**Branch:** `recovery-etapa-5-0e2cc20`\
**Stare:** working tree curat\
**main:** `d9bc2c9` și neatins

Revizia 4 este un **checkpoint de lucru**, nu aprobarea finală a designului Fazei 4.

---

# 10. PRIMA ACȚIUNE CERUTĂ DE LA CLAUDE

Nu modifica încă documentele.

Confirmă că ai preluat corect starea de mai sus și prezintă **prima întrebare rămasă deschisă: REC-02**, cu variante simple și consecințele lor.

Așteaptă răspunsul lui Sergiu înainte de a continua.
