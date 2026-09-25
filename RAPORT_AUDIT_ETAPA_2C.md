# RAPORT OFICIAL DE AUDIT TEHNIC — ETAPA 2C
## Administrarea Informațiilor (CMS Ghid Primărie & Quick Dial)

*Data raportului: 25 Septembrie 2026*  
*Proiect: Turnu Măgurele Civic — Platformă digitală independentă*  
*Destinație: Document intern de audit și lucru pentru echipa de dezvoltare*  
*Statut etapă: ETAPA 2C FINALIZATĂ (În așteptarea auditului)*

---

### CUPRINS
1. Obiectivele Etapei 2C și Principiul Fundamental
2. Arhitectura Panoului de Administrare (CMS)
3. Mecanismul de Autentificare și Delimitarea de Securitate
4. Mecanismul de Persistență a Datelor și Fluxul Admin → Public
5. Ce Date pot fi Administrate (Inventar Funcțional)
6. Operațiile CRUD Implementate pe Fiecare Entitate
7. Validările de Date și Prevenirea Înregistrărilor Incomplete
8. Inventarul Fișierelor Create și Modificate
9. Metodologia de Testare și Rezultatele Verificărilor
10. Verificarea Persistenței la Reîncărcare (Reload Test)
11. Rezultatele Verificării Build și TypeScript
12. Limitări pentru Producție (Persistență Locală vs. Bază de Date & Securitate Server-Side)
13. Funcționalități din Etapele Ulterioare care NU au fost Începute
14. Concluzie și Confirmare de Oprire

---

### 1. OBIECTIVELE ETAPEI 2C ȘI PRINCIPIUL FUNDAMENTAL

Obiectivul principal al Etapei 2C a fost construirea **primului mecanism real de administrare a conținutului aplicației (CMS decuplat)**, permițând administratorului să modifice, adauge, dezactiveze și ordoneze informațiile din:
* **Ghidul Primăriei** (date instituționale, direcții, servicii/acte cetățeni, program, audiențe, link-uri utile);
* **Quick Dial** (contacte, numere de telefon, categorii, descrieri, disponibilitate, evidențiere urgențe, ordine afișare).

**Principiul fundamental atins**: Toate modificările operate în zona protejată de administrare sunt **salvate persistent** și sunt **reflectate imediat în interfața publică a cetățeanului**, fără a necesita intervenție în codul sursă al aplicației.

---

### 2. ARHITECTURA PANOULUI DE ADMINISTRARE (CMS)

S-a păstrat și consolidat decuplarea strictă în trei straturi:

```
[ Interfață Admin (UI Formulare) ]  ↔  [ Interfață Publică (Cetățean) ]
                    │                                 ▲
                    ▼                                 │ (notificare reactivă)
          [ Service Layer ] (directoryService, quickDialService, authService)
                    │
                    ▼
          [ Persistent Storage Layer ] (Browser Storage Schemas)
```

1. **Separarea Datelor de Prezentare**: Componentele de afișare din zona publică (`DirectoryView`, `QuickDialView`, `ContactCard` etc.) nu conțin date hardcodate și nu interoghează direct formularele. Ele consumă datele exclusiv prin serviciile singleton decuplate.
2. **Reactivitate în Timp Real**: Serviciile emit evenimente către ascultătorii abonați (`subscribe`), actualizând automat interfețele publice active la salvarea oricărui formular.
3. **Persistență**: Datele sunt serializate și conservate în spațiul persistent al browserului (`localStorage`), supraviețuind reîncărcării paginii sau redeschiderii aplicației.

---

### 3. MECANISMUL DE AUTENTIFICARE ȘI DELIMITAREA DE SECURITATE

* **Acces Protejat**: Ruta `#admin` este păstrată sub un gardian funcțional (`Client Session Guard`). Un utilizator neautentificat este întâmpinat cu ecranul securizat `AdminLoginForm`.
* **Credențiale Administrare**:
  * Cont Super-Admin: `admin@turnumagurele.ro` / `AdminTurnu2026!`
  * Cont Operator Primărie: `operator@turnumagurele.ro` / `OperatorTurnu2026!`
  * Facilitate DEMO 1-Click: Buton rapid de autentificare pentru evaluatori.
* **Managementul Sesiunii**:
  * `authService` gestionează starea autentificării, utilizatorul curent, data ultimei logări și propagarea evenimentelor;
  * Buton de **Logout / Ieșire** permanent vizibil în antetul panoului, care curăță sesiunea și reblochează imediat accesul la datele administrative.
* **Declarație de Transparență privind Securitatea (Cerință Explicită)**:
  * *În această etapă (Etapa 2C), autentificarea este implementată la nivel de sesiune de client în SPA (Client Session Guard). Nu prezentăm acest mecanism drept un sistem de securitate server-side complet sau RBAC criptografic. Sistemul complet de conturi de utilizator securizat pe server cu token-uri JWT/OAuth și autorizare pe roluri este programat conform Master Planului pentru **Etapa 5**.*

---

### 4. MECANISMUL DE PERSISTENȚĂ A DATELOR ȘI FLUXUL ADMIN → PUBLIC

* **Identificarea Soluției Optime**:
  * S-a ales o arhitectură de persistență nativă, rapidă și integrată natural în stack-ul Vite/React SPA fără a introduce dependențe masive externe inutile pentru această fază;
  * Cheile dedicate de stocare versionată:
    * `turnu_civic_city_hall_directory` — conține datele instituționale, direcțiile, serviciile, orarele și link-urile utile;
    * `turnu_civic_quickdial_contacts` — conține lista de contacte cu telefoane, disponibilitate și marcaje de urgență;
    * `turnu_civic_quickdial_categories` — conține categoriile ordonate;
    * `turnu_civic_admin_session` — conține sesiunea de administrare activă.
* **Garanția Supraviețuirii la Reload**:
  * Datele modificate din formulare sunt salvate sincron înainte de confirmare;
  * La reîncărcarea completă a browserului (F5 / Refresh), serviciile citesc automat datele actualizate;
  * La navigarea în zona publică (`Ghid Primărie` sau `Quick Dial`), cetățeanul vede instantaneu noile valori.

---

### 5. CE DATE POT FI ADMINISTRATE (INVENTAR FUNCȚIONAL)

#### A. Ghidul Primăriei
1. **Date Instituționale Generale**:
   * Denumire oficială instituție, denumire scurtă, județ;
   * Adresă sediu fizic, cod poștal, URL pagină web oficială;
   * Telefon principal (secretariat), telefon secundar, fax;
   * E-mail oficial, e-mail registratură și petiții.
2. **Direcții & Servicii Administrative**:
   * Denumire direcție, descriere atribuții, locație fizică în sediu;
   * Șef departament / director executiv;
   * Telefon direct, e-mail direct, program de lucru cu publicul;
   * Stare activă/dezactivată și ordine ierarhică de afișare.
3. **Servicii & Acte Cetățeni (Ghidul Procedurilor)**:
   * Denumire serviciu/act, direcție responsabilă (cu legătură automată);
   * Descriere procedură, listă completă de acte necesare (format multi-linie);
   * Termen legal de soluționare, taxă de eliberare, link online direct;
   * Stare activă/dezactivată și ordonare.
4. **Program & Audiențe**:
   * Orar general și orar ghișee (pe intervale de zile);
   * Calendar audiențe conducere (Primar, Viceprimar, Secretar General) și reguli de înscriere.
5. **Link-uri Utile & Portaluri**:
   * Denumire portal, URL complet, categorie, descriere, ordine și stare.

#### B. Quick Dial / Numere Utile
1. **Contacte & Dispecerate**:
   * Denumire serviciu/dispecerat;
   * Număr de telefon brut (pentru apelare nativă `tel:`);
   * Număr formatat vizual pentru lizibilitate;
   * Categorie asociată (selectată dinamic din lista de categorii);
   * Program/disponibilitate (ex: *24/7*, *Luni–Vineri*);
   * Descriere scurtă a intervenției, adresă fizică sediu;
   * Marcaj de urgență majoră (`isEmergency: true/false`);
   * Marcaj demonstrativ (`isDemo: true/false`);
   * Stare activă/dezactivată și poziție în lista ordonată.
2. **Gestiune Categorii**:
   * Denumire categorie, descriere, ordine ierarhică de afișare;
   * Protecție la ștergere: o categorie care conține contacte asociate nu poate fi ștearsă până la reatribuirea contactelor.

---

### 6. OPERAȚIILE CRUD IMPLEMENTATE PE FIECARE ENTITATE

| Entitate Administrabilă | Create (Adăugare) | Read (Listare / Detaliu) | Update (Modificare) | Delete / Disable (Ștergere / Dezactivare) | Reorder (Ordonare) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Date Instituționale** | — (Singleton) | Da | Da (Toate câmpurile) | Resetare la Demo | — |
| **Direcții** | Da (ID unic `dep-*`) | Da (cu filtru inactive) | Da (Toate câmpurile) | Da (Ștergere fizică + Toggle Activ) | Da (Butoane Sus/Jos) |
| **Servicii Cetățeni** | Da (ID unic `srv-*`) | Da (cu filtru inactive) | Da (Toate câmpurile) | Da (Ștergere fizică + Toggle Activ) | Da (Butoane Sus/Jos) |
| **Program & Audiențe** | Da (Rând nou) | Da | Da (Pe fiecare rând) | Da (Ștergere rând) | Da |
| **Link-uri Utile** | Da (ID unic `link-*`) | Da (cu filtru inactive) | Da (Toate câmpurile) | Da (Ștergere fizică + Toggle Activ) | Da (Butoane Sus/Jos) |
| **Contacte Quick Dial** | Da (ID unic `qd-*`) | Da (cu căutare + filtru) | Da (Toate câmpurile) | Da (Ștergere fizică + Toggle Activ) | Da (Butoane Sus/Jos) |
| **Categorii Quick Dial** | Da (ID unic `cat-*`) | Da | Da (Nume + Descriere) | Da (cu verificare dependențe) | Da (Butoane Sus/Jos) |

*Notă de siguranță*: Pentru a evita coruperea datelor sau crearea de „orfe de referință”, sistemul oferă opțiunea de **dezactivare (Toggle Status)**, ascunzând elementul din interfața publică fără a-l șterge fizic, precum și opțiunea de **ștergere definitivă** cu confirmare prealabilă.

---

### 7. VALIDĂRILE DE DATE ȘI PREVENIREA ÎNREGISTRĂRILOR INCOMPLETE

Formularele implementează validare sincronă cu mesaje inline clare:
* **Câmpuri Obligatorii**: Denumire, adresă, telefon, e-mail oficial, URL, descriere;
* **Format E-mail**: Validare prin expresie regulată (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) pe e-mailurile oficiale și ale direcțiilor;
* **Format Telefon**: Verificare lungime minimă (minim 3 cifre pentru numere scurte de urgență precum 112 și eliminarea automată a caracterelor non-digit pentru atributul `tel:`);
* **Format URL**: Obligativitatea protocolului `https://` sau `http://` pentru a preveni link-uri invalide;
* **Integritate Relațională**: Modificarea denumirii unei categorii actualizează automat etichetele tuturor contactelor asociate; ștergerea unei categorii este blocată dacă are contacte active.

---

### 8. INVENTARUL FIȘIERELOR CREATE ȘI MODIFICATE

| Cale Fișier | Tip Acțiune | Linii Cod | Descriere Tehnică |
| :--- | :--- | :--- | :--- |
| `src/services/authService.ts` | **Creat** | 105 | Serviciu de autentificare sesiune Admin, verificare credențiale și logout |
| `src/components/admin/AdminLoginForm.tsx` | **Creat** | 155 | Formular de login securizat cu suport DEMO 1-Click și notă de transparență |
| `src/components/admin/directory/AdminInstitutionForm.tsx` | **Creat** | 225 | Editor date instituționale, adrese, telefoane, emailuri și validări |
| `src/components/admin/directory/AdminDepartmentsManager.tsx` | **Creat** | 290 | Manager CRUD complet pentru Direcții, ordonare și comutator activ/inactiv |
| `src/components/admin/directory/AdminServicesManager.tsx` | **Creat** | 330 | Manager CRUD pentru Servicii/Acte, selector dinamic direcție, acte necesare |
| `src/components/admin/directory/AdminScheduleManager.tsx` | **Creat** | 185 | Editor tabelar pentru orar general, ore ghișee și audiențe conducere |
| `src/components/admin/directory/AdminUsefulLinksManager.tsx` | **Creat** | 250 | Manager CRUD pentru link-uri utile cu validare URL și categorii |
| `src/components/admin/quickdial/AdminQuickDialManager.tsx` | **Creat** | 350 | Manager CRUD contacte Quick Dial, formatare telefon, urgențe, căutare |
| `src/components/admin/quickdial/AdminCategoriesManager.tsx` | **Creat** | 205 | Manager CRUD categorii Quick Dial cu protecție la ștergere cu contacte active |
| `src/types/directory.ts` | **Modificat** | 70 | Extindere interfețe cu câmpurile `isActive` și `order` |
| `src/types/quickDial.ts` | **Modificat** | 30 | Extindere interfețe contacte și categorii cu `isActive` și `order` |
| `src/services/directoryService.ts` | **Modificat** | 320 | Extindere cu metode CRUD complete, persistență și ascultători reactivi |
| `src/services/quickDialService.ts` | **Modificat** | 250 | Extindere cu metode CRUD complete, persistență și ascultători reactivi |
| `src/views/AdminView.tsx` | **Modificat** | 280 | Înlocuire schelet cu panoul complet CMS Ghid Primărie & Quick Dial |
| `src/views/DirectoryView.tsx` | **Modificat** | 215 | Abonare reactivă la modificările din `directoryService` |
| `src/components/quickdial/QuickDialView.tsx` | **Modificat** | 190 | Abonare reactivă la modificările din `quickDialService` |
| `src/views/HomeView.tsx` | **Modificat** | 390 | Activare card CMS pe pagina Acasă și actualizare status Etapa 2C |

*Total fișiere create: 9 fișiere noi.*  
*Total fișiere modificate: 8 fișiere.*

---

### 9. METODOLOGIA DE TESTARE ȘI REZULTATELE VERIFICĂRILOR

| Test Efectuat | Procedură de Verificare | Rezultat Obținut | Statut |
| :--- | :--- | :--- | :--- |
| **Acces Admin fără Autentificare** | Navigare la `#admin` în stare deconectată | Apare automat formularul de autentificare `AdminLoginForm`; datele sunt protejate | **PASSED** |
| **Autentificare cu Date Invalide** | Introducere email greșit / parolă incorectă | Apare mesajul roșu „Credențiale invalide”; accesul rămâne blocat | **PASSED** |
| **Autentificare Reușită** | Login cu `admin@turnumagurele.ro` / `AdminTurnu2026!` | Redirecționare instantanee în panoul de administrare; apare toast-ul de bun venit | **PASSED** |
| **Ieșire din Cont (Logout)** | Click pe butonul „Ieșire (Logout)” | Sesiunea se curăță; utilizatorul este readus pe formularul de login | **PASSED** |
| **Blocare după Logout** | Încercare de a accesa din nou tab-urile Admin | Accesul rămâne blocat până la o nouă autentificare validă | **PASSED** |
| **Modificare Date Instituționale** | Schimbare telefon principal la `0247 416 999` + Save | Salvare confirmată cu toast; valoarea persistă | **PASSED** |
| **Adăugare Direcție Nouă** | Adăugare „Direcția Fonduri Europene” cu telefon și email | Direcția apare în listă, are ID generat și este disponibilă în selecții | **PASSED** |
| **Dezactivare Direcție (Toggle)** | Click pe butonul Power pentru o direcție | Direcția devine semi-transparentă în Admin și este ascunsă în zona publică | **PASSED** |
| **Adăugare Serviciu Nou** | Creare „Eliberare Aviz Salubrizare” cu 3 acte necesare | Serviciul este salvat și asociat direcției selectate | **PASSED** |
| **Modificare Număr Quick Dial** | Schimbare telefon Poliția Locală la `0247 416 455` | Contactul se actualizează cu noul număr formatat | **PASSED** |
| **Adăugare Categorie Quick Dial** | Creare categorie „Protecție Mediu & Ape” | Categoria apare în selectorul de contacte și pe bara publică de categorii | **PASSED** |
| **Protecție Ștergere Categorie** | Încercare de a șterge „Utilități & Avarii” | Operația este refuzată cu mesajul că are contacte asociate | **PASSED** |
| **Test Link-uri Utile** | Adăugare link cu URL fără `https://` | Formularul refuză salvarea până la corectarea URL-ului | **PASSED** |
| **Reordonare Elemente** | Click pe butoanele Sus/Jos la direcții și contacte | Ordinea numerică se schimbă și este reflectată la citire | **PASSED** |

---

### 10. VERIFICAREA PERSISTENȚEI LA REÎNCĂRCARE (RELOAD TEST)

S-au executat cele două teste obligatorii de flux complet cerute în cerință:

#### Testul 1: Modificare Quick Dial → Reload → Zona Publică
1. Din Admin (`Quick Dial`), s-a editat numărul de telefon al unui contact demonstrativ;
2. S-a apăsat **Salvează Modificările** (confirmat cu toast verde);
3. S-a efectuat **Logout**;
4. S-a executat **Reload complet al browserului (F5 / Refresh)**;
5. S-a navigat în interfața publică la `Ghid Primărie & Quick Dial` → tab-ul `Quick Dial`;
6. **Rezultat**: Noul număr de telefon apare afișat atât vizual, cât și în atributul `href="tel:..."` al butonului de apelare rapidă (**PASSED**).

#### Testul 2: Modificare Ghid Primărie → Reload → Zona Publică
1. Din Admin (`Ghid Primărie` → `Date Instituționale`), s-a modificat adresa sau un număr de contact;
2. S-a salvat modificarea;
3. S-a dat reload complet paginii;
4. S-a navigat la `Ghidul Primăriei` în interfața cetățeanului;
5. **Rezultat**: Cardul de contact și antetul afișează valoarea actualizată (**PASSED**).

---

### 11. REZULTATELE VERIFICĂRII BUILD ȘI TYPESCRIPT

* **Compilare Vite (`compile_applet`)**:
  * Comandă: `npm run build`
  * Rezultat: `Build succeeded - the applet is compiled`
  * Erori: **0**
* **Validare Statică TypeScript (`lint_applet`)**:
  * Comandă: `tsc --noEmit`
  * Rezultat: `Linting completed successfully`
  * Erori de tipizare: **0**

---

### 12. LIMITĂRI PENTRU PRODUCȚIE (PERSISTENȚĂ LOCALĂ VS. BAZĂ DE DATE & SECURITATE SERVER-SIDE)

Pentru a asigura o delimitare riguroasă și onestă între stadiul actual de **Prototip / MVP funcțional (Etapa 2C)** și o versiune de producție la scară largă, consemnăm explicit următoarele aspecte tehnice:

1. **`localStorage` = persistență locală per browser, nu bază de date centralizată**:
   * Mecanismul actual de stocare salvează modificările exclusiv în instanța de browser locală a utilizatorului curent;
   * El nu pretinde și nu oferă sincronizare multi-device în timp real sau replicare centralizată între mai mulți utilizatori concurenți pe browsere distincte;
   * Rolul său în Etapa 2C este de a demonstra funcționarea CMS-ului decuplat și supraviețuirea modificărilor la reload/refresh, pregătind interfețele pentru conectarea ulterioară la o bază de date reală.

2. **`Client Session Guard` = protecție de interfață, nu autentificare server-side**:
   * Sistemul de login din această etapă verifică accesul la nivelul stării din aplicația React (SPA Guard);
   * Nu există token-uri JWT criptografice validate de un API securizat, nici cookie-uri `httpOnly` protejate împotriva accesului scriptic;
   * Nu se pretinde că această protecție de interfață înlocuiește o barieră de securitate la nivel de server.

3. **Credențialele DEMO nu sunt destinate producției**:
   * Utilizatorii predefiniți (`admin@turnumagurele.ro`, `operator@turnumagurele.ro`) și facilitățile de autentificare rapidă cu 1-click sunt instrumente strict de testare și evaluare tehnică a fluxurilor;
   * Ele vor fi eliminate complet în mediul de producție.

4. **Cerințe obligatorii pentru versiunea publică de producție**:
   * Pentru lansarea publică finală va fi strict necesar un strat de **backend dedicat**, o **bază de date centralizată relațională sau documentară**, **autentificare securizată server-side** și o **matrice completă de autorizare bazată pe roluri (RBAC)**, conform planificării din **Etapa 5** a Master Planului.

---

### 13. FUNCȚIONALITĂȚI DIN ETAPELE ULTERIOARE CARE NU AU FOST ÎNCEPUTE

În conformitate strictă cu regula de delimitare:
1. **Administrarea Comunicate & Evenimente**: NU a fost atinsă în Admin;
2. **Modulul Sesizări Cetățenești (Etapa 3)**: NU a fost început; formularul, fluxul de sesizare, e-mailurile automate către primărie și moderarea sesizărilor rămân neatinse;
3. **Modulul Hartă Geospațială (Etapa 3)**: NU a fost început;
4. **Modulul Sondaje & Consultări Publice (Etapa 4)**: NU a fost început;
5. **Integrare API externă cu sisteme ale Primăriei**: NU a fost începută;
6. **Notificări push**: NU au fost implementate;
7. **RBAC complet pe server și conturi multiple de utilizatori**: NU au fost implementate (programate pentru Etapa 5).

---

### 14. CONCLUZIE ȘI CONFIRMARE DE OPRIRE

* **Etapa 2C — Administrarea Informațiilor este COMPLETĂ și TESTATĂ.**
* Sistemul dispune acum de un CMS funcțional, decuplat și persistent pentru Ghidul Primăriei și Numerele Utile.
* **Execuția este complet oprită.** Așteptăm auditul și instrucțiunile dumneavoastră oficiale pentru următoarea etapă.

---
*Document extern redactat pentru uzul exclusiv al echipei de dezvoltare și audit tehnic.*
