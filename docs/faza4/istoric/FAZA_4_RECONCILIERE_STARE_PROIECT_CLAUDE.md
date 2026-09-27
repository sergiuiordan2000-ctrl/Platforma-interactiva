# FAZA 4 — SOLICITARE DE RECONCILIERE ȘI STARE OFICIALĂ A PROIECTULUI

## Instrucțiune pentru Claude

Claude,

Avem nevoie să ne oprim puțin și să refacem sincronizarea proiectului.

Suntem încă în **FAZA 4 — PROIECTAREA BACKEND-ULUI**.

Nu vrem să începem implementarea și nu vrem să trecem la altă fază.

În acest moment, ChatGPT și Sergiu ne-am pierdut parțial în succesiunea deciziilor și a reviziilor documentației. Nu mai vrem să presupunem ce este decis, ce este deja aplicat și ce mai este deschis.

**Consideră-ne, sincer, „rătăciți”: avem nevoie să ne spui tu exact unde suntem.**

Imaginea de referință pentru faza este:

- B1 — persistență / server + bază de date / migrarea localStorage
- B2 — API și model asincron frontend
- B3 — autentificare și sesiuni pe server
- B4 — autorizare pe server
- B5 — sesizări / TM-XXX / fotografii / PublicMapReport
- B6 — e-mail real și jurnal
- B7 — protecții anti-spam
- B8 — date personale și de contact doar pe server
- B10 — strategie de testare
- B9 NU se folosește ca etapă B.
- Staging-ul, secretele, branch-urile și dependențele T1–T8 sunt tratate în proiectarea Fazei 4.
- Checkpoint-ul Fazei 4 este: **design complet, revizuit și aprobat**.

---

# CE ÎȚI CEREM

## 1. Stabilește starea oficială actuală

Fără să modifici nimic, spune-ne:

1. Care este ultima revizie oficială a documentației Fazei 4?
2. Care sunt exact documentele care constituie acea revizie?
3. Care sunt deciziile de produs deja aprobate?
4. Care dintre ele au fost deja integrate în documentație?
5. Care dintre ele sunt doar discutate/aprobate în conversație, dar încă nu sunt integrate?
6. Care sunt deciziile care NU sunt încă luate?
7. Care sunt contradicțiile încă existente?
8. Care sunt punctele care trebuie clarificate înainte de checkpoint?

Nu presupune că o decizie este deschisă dacă există deja o aprobare explicită în istoricul transmis ție.

---

# 2. RECONCILIAZĂ TOATE SETURILE DE DECIZII

Te rugăm să urmărești explicit succesiunea:

- deciziile inițiale ale Fazei 4;
- setul 01;
- deciziile 8–31;
- A-1 … A-9;
- Revizia 1;
- Revizia 2;
- orice alte corecturi/erate pe care le-ai aplicat între timp.

Pentru fiecare, indică:

| Element | Status |
|---|---|
| Decizie | aprobată / neaprobată |
| Integrată în documentație? | da / nu |
| Revizie în care a fost integrată | ... |
| Înlocuiește o regulă anterioară? | da / nu |
| Regula anterioară abrogată | ... |
| Mai necesită acțiune? | ... |

**Nu modifica documentele în această etapă.**

---

# 3. FOARTE IMPORTANT — NU NE MAI DA O LISTĂ URIAȘĂ DE ÎNTREBĂRI

După reconciliere, vrem să lucrăm din nou **o singură problemă odată**.

Prin urmare, după ce stabilești situația:

### NU cere simultan răspunsul la toate B-urile, P-urile, DN-urile și E-urile.

În schimb:

1. elimină din lista de întrebări tot ce este deja decis;
2. elimină întrebările care sunt doar consecințe tehnice și pot fi rezolvate de tine fără o nouă decizie de produs;
3. elimină întrebările duplicate;
4. grupează contradicțiile care sunt deja rezolvate printr-o decizie ulterioară;
5. păstrează numai problemele pentru care este într-adevăr necesară o decizie de produs din partea lui Sergiu.

Apoi prezintă-ne **DOAR PRIMA problemă rămasă care necesită o decizie**.

Noi vom răspunde.

După răspuns:
- o marchezi ca decisă;
- o integrezi în lista internă de stare;
- treci la următoarea problemă.

**Exact așa vom continua până la închiderea tuturor deciziilor.**

---

# 4. NU MODIFICA ÎNCĂ NIMIC

Pentru această solicitare:

- nu modifica repository-ul;
- nu modifica codul;
- nu instala pachete;
- nu face commit;
- nu face push;
- nu modifica documentele Fazei 4;
- nu modifica RULES;
- nu modifica Planul v1.1;
- nu modifica Master Planul.

Vrem mai întâi **starea de adevăr a proiectului**.

---

# 5. NU INVENTA ISTORIC

Dacă o decizie nu poate fi demonstrată din materialele pe care le ai, marcheaz-o:

**NEVERIFICATĂ / NECONFIRMATĂ**

Nu o transforma automat în întrebare nouă și nu presupune că este anulată.

Dacă există două documente contradictorii, spune-ne exact care sunt cele două formulări și unde apar.

---

# 6. FORMATUL RĂSPUNSULUI

Răspunsul tău trebuie să aibă exact aceste secțiuni:

## A. UNDE SUNTEM ACUM

- Faza:
- Revizia documentației:
- Repository:
- Implementare:
- Checkpoint:

## B. CE ESTE DEJA DECIS

Listă scurtă, consolidată.

## C. CE ESTE DEJA INTEGRAT ÎN DOCUMENTAȚIE

Listă scurtă.

## D. CE ESTE DECIS, DAR NU ESTE ÎNCĂ INTEGRAT

Listă scurtă.

## E. CE ESTE CU ADEVĂRAT NEDECIS

Numai problemele care necesită decizie de produs.

## F. CONTRADICȚII RĂMASE

Numai contradicțiile reale, nu cele deja rezolvate.

## G. PRIMA DECIZIE CARE TREBUIE LUATĂ

Prezintă **o singură problemă**, cu variante explicate clar și fără jargon inutil.

Apoi STOP.

---

# 7. REGULA NOASTRĂ DE LUCRU DE ACUM ÎNAINTE

Vom lucra astfel:

**Claude identifică problema → Sergiu decide → ChatGPT confirmă formularea → Claude o consemnează → Claude trece la următoarea problemă.**

Nu vrem să vedem 10–20 de întrebări deodată.

Vrem să închidem Faza 4 metodic, una câte una.

---

## OBSERVAȚIE FINALĂ

Nu considera această instrucțiune o nouă decizie de produs.

Este doar o cerere de **reconciliere a stării proiectului** și de stabilire a ordinii corecte de lucru.

**Suntem încă în FAZA 4.**

**STOP după secțiunea G. Așteaptă răspunsul lui Sergiu.**
