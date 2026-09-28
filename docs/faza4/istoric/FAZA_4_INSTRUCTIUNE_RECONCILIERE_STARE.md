# INSTRUCȚIUNE — RECONCILIEREA STĂRII PROIECTULUI
## Turnu Măgurele Civic — Faza 4

Claude,

Înainte să continuăm cu orice decizie sau modificare, trebuie să facem o reconciliere completă a stării proiectului.

Am avut mai multe sesiuni de lucru și mai multe seturi de decizii. În acest moment nu vrem să mai „ghicim” ce s-a decis și nici să reluăm întrebări deja închise.

## 1. PUNCT DE REFERINȚĂ

Folosește ca punct tehnic de revenire:

- branch: `recovery-etapa-5-0e2cc20`
- commit checkpoint: `3c586d0fab43ebec0e6c03a1b1e9cd54812a0f62`
- mesaj commit: `docs(faza-4): checkpoint revizia 3 dupa SET-A-02`

Commitul conține documentația Reviziei 3 și istoricul aferent.

Repository-ul de la acest checkpoint trebuie considerat punctul de siguranță.

## 2. SURSELE CARE TREBUIE VERIFICATE

Verifică efectiv, în repository:

- `docs/faza4/`
- `docs/faza4/istoric/`
- `FAZA_4_DECIZII_NOI.md` / documentul consolidat echivalent, dacă există
- Revizia 3
- rapoartele SET-01, SET-A-01 și SET-A-02
- documentele RULES
- HANDOFF
- Planul Master / Planul v1.1, în măsura în care sunt disponibile în repository
- testele existente
- orice alte documente pe care Revizia 3 le indică drept sursă.

Nu presupune că o afirmație dintr-un raport anterior este corectă doar pentru că apare acolo.

Urmărește sursa originală a fiecărei decizii.

## 3. CE ESTE DEJA DECIS

Construiește un tabel cu toate deciziile pe care le poți considera confirmate explicit de Sergiu.

Pentru fiecare:

- ID / denumire;
- decizia;
- sursa;
- unde este integrată;
- ce reguli anterioare înlocuiește;
- status: `APROBAT`.

Nu transforma în „APROBAT” o decizie pe care ai dedus-o tu.

## 4. CE A FOST DOAR PROPUNERE TEHNICĂ

Construiește separat o listă cu:

- decizii tehnice propuse de Claude;
- consecințe tehnice deduse de Claude;
- DN-uri / T-B / erate / alte elemente pe care Claude le-a aplicat fără o aprobare explicită a lui Sergiu.

Pentru fiecare:

- ce ai presupus;
- unde ai aplicat presupunerea;
- ce documente sunt afectate;
- status: `NECONFIRMAT`.

Foarte important:

NU transforma o consecință tehnică rezonabilă într-o „decizie a utilizatorului”.

## 5. CE ESTE CONTRADICTORIU

Construiește o listă unică a contradicțiilor reale.

Pentru fiecare contradicție:

- documentul;
- regula A;
- regula B;
- sursa fiecăreia;
- dacă una dintre ele este mai recentă;
- dacă există o decizie explicită ulterioară care rezolvă contradicția.

Dacă există o decizie ulterioară explicită, marchează contradicția ca:

`REZOLVATĂ — NU MAI NECESITĂ DECIZIE`

Nu o mai pune ulterior pe lista întrebărilor pentru Sergiu.

## 6. CE ESTE CU ADEVĂRAT NEDECIS

După eliminarea:

- deciziilor deja aprobate;
- consecințelor tehnice;
- contradicțiilor deja rezolvate;
- dublurilor;
- întrebărilor generate de propriile tale presupuneri;

produce lista finală a deciziilor care chiar mai trebuie luate.

Pentru fiecare decizie:

- ID stabil;
- întrebarea exactă;
- de ce este necesară;
- ce alte decizii depind de ea;
- ce documente va afecta.

NU propune soluții și NU cere încă răspunsul lui Sergiu.

## 7. FOARTE IMPORTANT — REGULA PRIVIND CONTUL CETĂȚEANULUI

Păstrează explicit următoarea decizie, care este deja stabilită:

> Aplicația este complet funcțională pentru cetățean fără cont.
>
> Un utilizator nu trebuie să își creeze cont și nu trebuie să se autentifice pentru a folosi aplicația, a vedea comunicate, evenimente, hartă, sondaje, ghidul Primăriei etc.
>
> Contul/autentificarea prin e-mail devine obligatorie numai în momentul în care utilizatorul dorește să depună o sesizare.
>
> Prin urmare, existența unui cont nu este o condiție generală pentru utilizarea aplicației.

Această regulă este APROBATĂ și nu trebuie redeschisă ca întrebare.

## 8. LOCAȚIA SESIZĂRII

Păstrează explicit și această decizie:

Cetățeanul poate indica locația sesizării în două moduri:

1. selectează un punct pe hartă, inclusiv folosind locația curentă a dispozitivului;
2. introduce o adresă, de tip stradă + număr.

În cazul introducerii unei adrese:

- aplicația folosește geocodarea pentru a determina poziția;
- poziția rezultată este tratată cu toleranță/precizie geografică adecvată pentru protejarea vieții private;
- dacă este necesar, pinul public poate fi generalizat;
- locația trebuie să aparțină UAT Turnu Măgurele.

Aceasta este o decizie de produs și nu trebuie redeschisă ca întrebare.

## 9. PRINCIPIUL PENTRU „ÎN ANALIZĂ”

Este deja stabilit:

O sesizare trece din `nouă` în `în analiză` numai atunci când transmiterea către Primărie a fost efectiv realizată cu succes.

Nu presupune transmiterea doar pentru că utilizatorul a solicitat-o.

Dacă transmiterea nu este disponibilă temporar, sesizarea rămâne `nouă`, iar transmiterea se reia conform mecanismului stabilit.

Nu redeschide această decizie.

## 10. PRINCIPIUL RETENȚIEI

Este stabilit că perioada de retenție este de:

**45 de zile.**

Dacă momentul exact de la care începe să curgă această perioadă nu este încă decis, păstrează doar această întrebare ca decizie deschisă.

Nu transforma durata de 45 de zile într-o întrebare nouă.

## 11. PRINCIPIUL PUBLICĂRII

Este deja decis:

- sesizarea poate apărea pe hartă imediat;
- nu există moderare prealabilă înainte de publicare;
- identitatea autorului nu este publică.

Nu redeschide problema existenței moderării prealabile.

## 12. PRINCIPIUL ȘTERGERII

Este deja decis:

- autorul poate șterge definitiv propria sesizare;
- `super_admin` poate șterge definitiv orice sesizare;
- numărul `TM-XXX` rămâne rezervat chiar dacă sesizarea este ștearsă.

Nu redeschide aceste decizii.

## 13. PRINCIPIUL PERMISIUNILOR

Este deja decis:

- `super_admin` are drepturile exclusive stabilite pentru operațiile administrative sensibile;
- `primarie_operator` nu trebuie să primească acces la datele personale ale cetățeanului care sunt rezervate `super_admin`.

Nu transforma aceste decizii în întrebări noi decât dacă găsești o contradicție documentară reală.

## 14. CE NU AI VOIE SĂ FACI ACUM

În această etapă:

- NU modifica repository-ul;
- NU modifica documentele;
- NU crea Revizia 4;
- NU face commit;
- NU face push;
- NU modifica RULES;
- NU modifica Master Planul;
- NU modifica HANDOFF;
- NU implementa cod;
- NU lua decizii în locul lui Sergiu.

## 15. DOCUMENTUL FINAL

Creează un singur document:

`FAZA_4_RECONCILIERE_STARE.md`

Structura obligatorie:

1. Punctul de revenire
2. Ce este aprobat
3. Ce este integrat
4. Ce este doar propunere tehnică
5. Contradicții rezolvate
6. Contradicții reale rămase
7. Decizii încă necesare
8. Documente care trebuie ulterior actualizate
9. Ce NU trebuie rediscutat
10. Starea exactă a proiectului la finalul reconcilierii

La final scrie explicit:

### VERDICT DE STARE

Una dintre:

- `FAZA 4 — PREGĂTITĂ PENTRU ULTIMELE DECIZII`
- `FAZA 4 — NECESITĂ RECONCILIERE SUPLIMENTARĂ`

Nu folosi „checkpoint atins” decât dacă toate condițiile reale pentru checkpoint sunt îndeplinite.

## 16. IMPORTANT

Dacă găsești neconcordanțe între propriile documente, nu încerca să le „repari” singur.

Marchează-le.

Obiectivul acestei operațiuni este să aflăm exact:

**CE AM DECIS NOI, CE AI PROPUS TU ȘI CE MAI TREBUIE DECIS.**

Nu vrem o nouă interpretare creativă a proiectului.

După ce produci `FAZA_4_RECONCILIERE_STARE.md`, oprește-te și așteaptă instrucțiunile noastre.