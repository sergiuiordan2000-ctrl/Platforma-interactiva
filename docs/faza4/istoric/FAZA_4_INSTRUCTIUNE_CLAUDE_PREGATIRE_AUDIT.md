# TURNŪ MĂGURELE CIVIC --- INSTRUCȚIUNE CLAUDE

## Pregătirea materialului necesar pentru auditul Fazei 4

**Data:** 27.09.2026\
**Proiect:** Turnu Măgurele Civic\
**Scop:** pregătirea bazei documentare pentru auditul primei proiectări
a Fazei 4

------------------------------------------------------------------------

## 1. Context

Începem oficial **Faza 4 --- PROIECTAREA BACKEND-ULUI** conform
**Planului de Lucru Comun v1.1**, documentul agreat în comun și
documentul de referință pentru această fază.

Tu ai realizat deja o **primă analiză/proiectare a Fazei 4**,
materializată în cele 8 documente:

1.  `FAZA_4_00_ARHITECTURA_SI_INDEX.md`
2.  `FAZA_4_DECIZII_NOI.md`
3.  `FAZA_4_B1_MODEL_DATE.md`
4.  `FAZA_4_B2_API.md`
5.  `FAZA_4_B3_B4_AUTENTIFICARE_AUTORIZARE.md`
6.  `FAZA_4_B5_B8_SESIZARI_DATE_PERSONALE.md`
7.  `FAZA_4_B6_B7_EMAIL_ANTISPAM.md`
8.  `FAZA_4_B10_TESTARE.md`

Aceste documente sunt tratate ca **propunere de design / material de
analiză**, nu ca design aprobat și nici ca decizii aprobate.

Înainte ca ChatGPT să înceapă auditul, vreau să pregătești exact
informațiile necesare pentru ca auditul să poată fi făcut **strict pe
baza documentelor și deciziilor proiectului**, fără presupuneri și fără
completări arbitrare.

------------------------------------------------------------------------

# 2. Regula principală

**Nu implementa nimic.**

În această etapă:

-   nu modifica repository-ul;
-   nu crea `server/`;
-   nu crea `shared/`;
-   nu instala dependențe;
-   nu modifica `package.json`;
-   nu modifica schema DB;
-   nu modifica frontend-ul;
-   nu modifica hostingul;
-   nu modifica DNS;
-   nu configura MySQL;
-   nu face commit;
-   nu face push;
-   nu modifica `main`;
-   nu modifica branch-ul de lucru.

Poți doar să **citești, verifici, inventariezi și documentezi**.

------------------------------------------------------------------------

# 3. Obiectivul concret

Pregătește un singur document Markdown:

`FAZA_4_INPUT_AUDIT_CHATGPT.md`

Documentul trebuie să permită lui ChatGPT să înceapă auditul Fazei 4
fără să fie nevoit să ghicească sau să caute informații care pot fi
furnizate explicit de tine.

Nu este nevoie să refaci cele 8 documente de design.

Acest document trebuie să fie un **pachet de intrare pentru audit**.

------------------------------------------------------------------------

# 4. Secțiunea A --- Sursele oficiale

Listează exact documentele pe care le-ai folosit ca surse pentru prima
proiectare Faza 4.

Pentru fiecare indică:

-   numele fișierului;
-   versiunea/data, dacă există;
-   ce parte din Faza 4 fundamentează;
-   dacă este **decizie aprobată**, **document de referință**,
    **material de analiză** sau **propunere**.

Acordă atenție specială:

-   Planului de Lucru Comun v1.1;
-   Master Planului;
-   HANDOFF;
-   RULES / deciziilor Fazei 3;
-   rapoartelor Fazei 3;
-   codului actual de la commit-ul de bază.

------------------------------------------------------------------------

# 5. Secțiunea B --- Starea exactă a repository-ului

Confirmă, prin verificare efectivă:

-   branch-ul curent;
-   HEAD;
-   commit-ul de bază al Fazei 4;
-   starea `git status`;
-   poziția branch-ului față de GitHub;
-   poziția `main`;
-   existența sau inexistența `server/`;
-   existența sau inexistența `shared/`;
-   dacă `package.json` a fost modificat;
-   dacă lockfile-ul a fost modificat;
-   dacă există instalări/dependențe noi;
-   dacă există modificări necommitted.

Nu modifica nimic.

Dacă există orice diferență față de starea comunicată anterior, descrie
exact diferența.

------------------------------------------------------------------------

# 6. Secțiunea C --- Deciziile anterioare care constrâng Faza 4

Construiește o listă clară cu **toate deciziile deja aprobate** care
influențează direct backend-ul.

Nu le interpreta și nu le modifica.

Pentru fiecare:

-   ID-ul deciziei;
-   formularea/rezumatul exact al regulii;
-   documentul-sursă;
-   ce parte din B1--B10 afectează.

Acordă atenție specială regulilor:

-   5C;
-   6.1--6.6;
-   D3/D4;
-   D6;
-   D8;
-   D9;
-   A-17;
-   N-3;
-   N-4;
-   orice alte reguli marcate în documentația proiectului ca fiind
    obligatorii pentru Faza 4.

------------------------------------------------------------------------

# 7. Secțiunea D --- K-1 ... K-6

Reproduce într-un tabel cele 6 probleme/întrebări de arhitectură pe care
le-ai identificat:

-   K-1
-   K-2
-   K-3
-   K-4
-   K-5
-   K-6

Pentru fiecare:

1.  problema;
2.  documentele care au generat-o;
3.  regula anterioară afectată;
4.  propunerea ta actuală;
5.  ce parte este doar ipoteză/propunere;
6.  ce informație lipsește pentru a lua decizia.

**Foarte important pentru K-1:** dacă T1--T8 nu pot fi găsite într-o
sursă originală, spune explicit acest lucru. Nu prezenta lista propusă
de tine drept „lista originală".

------------------------------------------------------------------------

# 8. Secțiunea E --- T1--T8

Verifică din nou toate documentele disponibile pentru a vedea dacă
există o definiție originală a T1--T8.

Rezultatul trebuie să fie explicit:

### Varianta 1

Ai găsit sursa originală.

Atunci:

-   indică documentul;
-   indică secțiunea;
-   reproduce lista;
-   nu o modifica.

### Varianta 2

Nu există sursă originală identificabilă.

Atunci spune explicit:

> „T1--T8 nu au fost identificate în sursele disponibile; lista din
> prima analiză este o propunere nouă și nu trebuie tratată ca decizie
> existentă."

Nu încerca să rezolvi problema singur.

------------------------------------------------------------------------

# 9. Secțiunea F --- DN-01 ... DN-24

Fă un tabel complet cu toate cele 24 de decizii noi.

Coloane obligatorii:

  ---------------------------------------------------------------------------
  ID          Problema    Propunerea   Sursa/Regula   Impact      Necesită
                          Claude       afectată       B1--B10     decizie?
  ----------- ----------- ------------ -------------- ----------- -----------

  ---------------------------------------------------------------------------

Nu marca nicio DN ca „aprobată".

Dacă există o propunere pe care o consideri tehnic evidentă, păstreaz-o
tot ca **propunere**.

------------------------------------------------------------------------

# 10. Secțiunea G --- Matrice de trasabilitate

Construiește o matrice:

**Decizie existentă → componentă B1--B10 → document Faza 4 →
endpoint/tabel/test afectat**

Scopul este să putem vedea dacă o decizie luată într-o zonă produce
efecte în alte zone.

Exemplu conceptual:

`D6-3 → B5/B8 → PublicMapReport → GET /public/reports/map → teste privacy`

Nu este nevoie să folosești exact acest exemplu dacă documentația reală
indică altceva.

------------------------------------------------------------------------

# 11. Secțiunea H --- Inventarul actual al serviciilor frontend

Din codul existent, inventariază serviciile și metodele publice
relevante pentru migrarea către backend.

Pentru fiecare:

-   fișier;
-   serviciu;
-   metode publice;
-   ce date citește;
-   ce date scrie;
-   ce reguli de permisiune aplică;
-   ce endpoint backend propus corespunde;
-   ce informații lipsesc pentru migrare.

Acordă atenție specială serviciilor:

-   `announcementService`
-   `authService`
-   `directoryService`
-   `quickDialService`
-   `reportService`
-   `surveyService`
-   `imageCompressionService`

și componentelor care le folosesc.

Nu modifica aceste fișiere.

------------------------------------------------------------------------

# 12. Secțiunea I --- Inventarul actual al tipurilor de date

Din `src/types/*` și codul aferent, inventariază:

-   entitățile;
-   enum-urile;
-   statusurile;
-   relațiile logice;
-   datele personale;
-   datele publice;
-   identificatorii;
-   câmpurile folosite pentru permisiuni.

Scopul este să existe o bază clară pentru verificarea B1.

Nu inventa câmpuri care nu există în codul actual; marchează separat
câmpurile noi introduse prin designul backend.

------------------------------------------------------------------------

# 13. Secțiunea J --- Diferențele dintre aplicația actuală și designul backend

Pregătește un tabel:

  --------------------------------------------------------------------------
  Zonă           Actual         Design backend Diferență      Observație
                 frontend       propus
  -------------- -------------- -------------- -------------- --------------

  --------------------------------------------------------------------------

Include cel puțin:

-   persistență;
-   autentificare;
-   permisiuni;
-   sesizări;
-   TM-XXX;
-   fotografii;
-   hartă;
-   sondaje;
-   e-mail;
-   notificări;
-   anti-spam;
-   date personale;
-   audit;
-   administrare.

------------------------------------------------------------------------

# 14. Secțiunea K --- Punctele care NU pot fi stabilite încă

Fă o listă explicită cu toate lucrurile pe care nu le poți determina din
sursele disponibile.

Nu le completa prin presupuneri.

Pentru fiecare:

-   ce lipsește;
-   de ce este necesar;
-   ce document ar trebui să îl clarifice;
-   dacă este blocant pentru B1--B10 sau poate fi decis ulterior.

------------------------------------------------------------------------

# 15. Secțiunea L --- Riscuri și contradicții deja detectate

Reia numai problemele pe care le-ai identificat efectiv.

Nu încerca să le rezolvi acum.

Separă:

-   contradicție reală;
-   ambiguitate;
-   lipsă de informație;
-   propunere care necesită aprobare;
-   risc tehnic;
-   risc de privacy;
-   risc operațional.

------------------------------------------------------------------------

# 16. Ce NU vreau în această etapă

Nu:

-   implementa;
-   modifica designul;
-   modifica Planul v1.1;
-   modifica RULES;
-   inventa decizii;
-   declara DN-uri aprobate;
-   declara K-uri rezolvate;
-   introduce noi permisiuni ca fiind aprobate;
-   schimba numerotarea B1--B10;
-   introduce B9;
-   începe Faza 5;
-   modifica repository-ul.

------------------------------------------------------------------------

# 17. Livrabil

Livrează:

`FAZA_4_INPUT_AUDIT_CHATGPT.md`

și, dacă pentru verificare sunt necesare fișiere suplimentare pe care
ChatGPT nu le are deja, listează-le separat la final:

## Fișiere suplimentare necesare

Pentru fiecare:

-   nume;
-   motivul pentru care este necesar;
-   dacă este document, cod sau raport;
-   dacă poate fi furnizat printr-un singur fișier.

Nu crea copii inutile ale repository-ului.

------------------------------------------------------------------------

# 18. Confirmare finală obligatorie

La finalul documentului scrie:

### STATUS

-   Faza 4 implementată: **NU**
-   Repository modificat: **NU**
-   Commit/push efectuat: **NU**
-   Design Faza 4 aprobat: **NU**
-   DN-01...DN-24 aprobate: **NU**
-   K-1...K-6 rezolvate: **NU**
-   Material pregătit pentru audit ChatGPT: **DA**

------------------------------------------------------------------------

## Instrucțiunea esențială

**Nu încerca să anticipezi deciziile lui Sergiu sau ale ChatGPT.**

Rolul tău acum este să furnizezi o bază factuală, trasabilă și completă
pentru auditul primei proiectări a Fazei 4.

După ce acest document este transmis, ChatGPT va face auditul și va
formula deciziile/modificările care trebuie aplicate ulterior
designului.

**Nu începe implementarea până când Faza 4 nu este declarată explicit
„design complet, revizuit și aprobat".**
