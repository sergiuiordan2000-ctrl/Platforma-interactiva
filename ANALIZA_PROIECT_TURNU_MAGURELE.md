# PROIECT CIVIC TURNU MĂGURELE
## Document Oficial de Arhitectură Tehnică, Strategie și Plan de Dezvoltare (Versiunea Actualizată MVP)

*Data documentului: Septembrie 2026*  
*Statut: Document de referință aprobat pentru demararea implementării*  
*Destinație: Platformă civică digitală independentă pentru municipiul Turnu Măgurele*

---

## CUPRINS
1. Viziunea și Principiile Fundamentale ale Proiectului
2. Structura Generală a MVP-ului
3. Modulele Aplicației și Funcțiile Cheie
4. Separarea dintre Portalul Cetățeanului și Panoul de Administrare
5. Sistemul de Roluri și Permisiuni (Structură Minimă Extensibilă)
6. Clasificarea Funcționalităților: MUST HAVE / SHOULD HAVE / LATER
7. Arhitectura Tehnică: PWA vs. Nativ și Alegerea Stack-ului
8. Decizia privind Calendarul: Integrare în Modulul Comunicate
9. Sistemul de Sesizări și Transmiterea pe E-mail către Primărie
10. Motorul Generic de Sondaje (Configurabil Fără Cod)
11. Matricea Riscurilor Tehnice și Măsurile Preventive
12. Planul de Dezvoltare Etapizată (5 Etape Verificabile)

---

## 1. Viziunea și Principiile Fundamentale ale Proiectului

Aplicația civică pentru Turnu Măgurele este un instrument independent creat pentru a apropia cetățenii de viața orașului și de administrația locală, facilitând comunicarea bidirecțională rapidă, transparentă și civilizată.

### Principii cheie:
* **Fricțiune zero pentru cetățean**: Nu este necesară instalarea din app store-uri și nu este obligatorie crearea unui cont de utilizator pentru a citi comunicate sau a trimite o sesizare.
* **Delimitare instituțională clară**: Platforma este independentă. Aceasta **nu pretinde și nu emite numere oficiale de înregistrare la registratura Primăriei**. Sesizările sunt recepționate intern, identificate printr-un cod de referință intern (ex: `TM-042`) și expediate pe e-mail către Primărie, instituția fiind singura care decide modul oficial de înregistrare.
* **Design modular și extensibil**: Codul este organizat astfel încât noi funcționalități să poată fi adăugate în etape viitoare fără rescrierea nucleului aplicației.
* **Control complet al conținutului**: Comunicate, evenimente, sondaje și date de contact sunt gestionate 100% dinamic din panoul de administrare, fără intervenție în codul sursă.

---

## 2. Structura Generală a MVP-ului

Platforma este împărțită funcțional în două componente majore:

### A. Portalul Public al Cetățeanului (Mobile-First Web / PWA)
* **Acasă (Tablou de bord civic)**:
  * Banner de alertă prioritară (afișat doar dacă există o notificare activă urgentă, ex: avarie rețea de apă);
  * Acces rapid (Buton proeminent: „Trimite o Sesizare”);
  * Secțiune cu cele mai proaspete comunicate și evenimente;
  * Sondajul civic activ cu posibilitatea de a vota pe loc;
  * Bară rapidă de contact pentru dispecerate locale.
* **Comunicate & Evenimente**:
  * Flux cronologic unic, cu comutator rapid de categorii (*Toate, Notificări/Alerte, Anunțuri, Știri, Evenimente*).
* **Sesizări Cetățenești**:
  * Formular simplificat în 3 pași (Categorie -> Poze -> Locație pe hartă/GPS -> Trimitere).
  * Confirmare imediată cu număr intern de identificare.
* **Harta Orașului**:
  * Hartă centrată pe Turnu Măgurele (`43.7486, 24.8722`), cu marcaje colorate pe categorii pentru sesizările aprobate și stadiul lor (*Trimisă, În lucru, Soluționată*).
* **Sondaje**:
  * Pagină dedicată consultărilor publice active și arhiva celor încheiate, cu rezultate vizuale grafice.
* **Ghid Primărie & Servicii Utile**:
  * Contacte directe, program de lucru, orar audiențe și listă de numere de urgență locale cu apelare la un singur click.

### B. Panoul de Administrare (`/admin`)
* Autentificare securizată cu e-mail și parolă.
* Gestiunea unificată a comunicatelor și a evenimentelor locale.
* Trierea sesizărilor primite, actualizarea statusului și comutator pentru aprobarea publicării pe hartă.
* Constructor vizual de sondaje generice (adăugare întrebări, opțiuni, setare dată expirare).
* Editarea datelor de contact și a numerelor utile ale Primăriei.
* Administrarea conturilor de acces și a permisiunilor.

---

## 3. Modulele Aplicației și Funcțiile Cheie

Am structurat sistemul în **6 module decuplate**:

### 1. `modules/announcements` (Comunicate & Evenimente)
* **Tipuri suportate**: Notificare (Alerte scurte), Anunț (Utilitate publică), Știre (Articol informativ), Eveniment (Cu dată/oră și locație).
* **Atribute**: Titlu, Tip, Conținut/Text, Imagine reprezentativă, Dată publicare, Dată eveniment (opțional), Locație eveniment (opțional), Marcaj alertă prioritară.

### 2. `modules/issues` (Sesizări Cetățenești)
* **Categorii predefinite**: Iluminat public, Carosabil / Gropi, Salubritate / Deșeuri, Spații verzi, Apă / Canalizare, Semnalizare rutieră, Animale fără stăpân, Alte probleme.
* **Generare ID intern**: Cod secvențial prietenos (ex: `TM-042`) specificat clar ca „ID intern de evidență al platformei”.
* **Procesare foto**: Compresie automată pe telefon înainte de trimitere pentru a reduce pozele de 15MB la sub 1-2MB.
* **Localizare**: Preluare automată GPS sau selecție prin pin pe harta orașului.
* **Expediere e-mail**: Serviciu automat de trimitere a sesizării către adresa Primăriei.

### 3. `modules/map` (Harta Sesizărilor & Geospațial)
* **Centrare oraș**: Harta municipiului Turnu Măgurele (`43.7486, 24.8722`).
* **Marcaje vizuale**: Filtre pe categorii și statusuri (*Nouă, În lucru, Soluționată*).
* **Filtru de moderare**: Afișare doar a sesizărilor validate de administratori.

### 4. `modules/surveys` (Motor Generic de Sondaje)
* **Configurare dinamică**: Fără cod, direct din interfața de administrare.
* **Tipuri de întrebări suportate**:
  * Alegere unică (Single choice - Radio buttons);
  * Alegere multiplă (Multi choice - Checkboxes);
  * Rating / Evaluare (scală 1-5 puncte);
  * Răspuns scurt opțional.
* **Mecanism vot MVP**: Sistem simplificat anti-vot dublu bazat pe `localStorage` și sesiune unică de browser.
* **Afișare rezultate**: Bare procentuale animate în timp real după trimiterea votului.

### 5. `modules/directory` (Ghid Primărie & Dispecerate Locale)
* Informații despre structura Primăriei Turnu Măgurele (conducere, audiențe, program ghișee).
* Director de apelare rapidă (Quick Dial) pentru dispecerate locale: Apă-Canal, Salubritate, Poliția Locală, Iluminat public.

### 6. `modules/admin` (Gestiune & Roluri)
* Panou securizat accesibil pe rută dedicată (`/admin`).
* Tabele responsive pentru conținut, filtre de căutare și formulare de editare.
* Moderare sesizări (Aprobare/Respingere pentru vizibilitate pe harta publică).

---

## 4. Separarea dintre Portalul Cetățeanului și Panoul de Administrare

* **Experiență optimizată pentru dispozitive**:
  * Cetățeanul folosește cu precădere telefonul -> Interfață verticală, elemente mari tactile, contrast ridicat, încărcare ultra-rapidă.
  * Administratorul lucrează de regulă pe laptop/desktop -> Tabele late cu multe date, căutare rapidă, comutatoare de stare dintr-un click, ferestre modale de editare.
* **Protecția intimității și a datelor (GDPR)**:
  * Datele de contact opționale completate de petiționar (nume, număr de telefon, e-mail) sunt vizibile **doar** în panoul de administrare și în e-mailul trimis către Primărie.
  * Pe harta publică a sesizărilor apar exclusiv categoria, descrierea problemei, fotografia și stadiul de rezolvare. Nicio dată personală nu ajunge în interfața publică.

---

## 5. Sistemul de Roluri și Permisiuni (Structură Minimă Extensibilă)

Pentru a menține MVP-ul simplu și stabil, definim **două roluri fundamentale**, construite pe o matrice internă de permisiuni granulare:

1. **Super-Admin (Echipa independentă a platformei)**:
   * Control absolut: gestionare utilizatori, configurare e-mailuri de dispecerat, moderare sesizări, creare sondaje, publicare comunicate.
2. **Operator / Reprezentant Primărie**:
   * Cont cu drepturi delegate configurabile:
     * *Drept A*: Publicare și editare de Comunicate, Anunțuri și Evenimente oficiale.
     * *Drept B*: Vizualizare sesizări și actualizarea stadiului lor („În lucru”, „Soluționată”) + adăugare scurtă notă informativă despre remediere.
   * Super-adminul poate bifa aceste drepturi direct din interfață pentru fiecare cont în parte, fără modificări în cod.

---

## 6. Clasificarea Funcționalităților: MUST HAVE / SHOULD HAVE / LATER

| Categorie | Funcționalitate | Justificare |
| :--- | :--- | :--- |
| **MUST HAVE** | **Formular sesizări cu ID intern** | Nucleul implicării cetățenești; simplu, clar delimitat de numerele oficiale. |
| **MUST HAVE** | **Expediere automată pe e-mail către Primărie** | Asigură fluxul real de rezolvare fără a impune o integrare tehnică Primăriei. |
| **MUST HAVE** | **Modul unic Comunicate & Evenimente** | Oferă informația esențială din oraș (Alerte, Știri, Anunțuri, Evenimente). |
| **MUST HAVE** | **Numere utile & dispecerate cu apelare rapidă** | Utilitate imediată zilnică pentru cetățeni de pe telefon. |
| **MUST HAVE** | **Harta sesizărilor cu moderare simplă** | Transparență vizuală, protejată de spam sau conținut vulgar printr-un click de aprobare. |
| **MUST HAVE** | **Sondaje configurabile dinamic (JSON)** | Permite lansarea oricărei consultări publice fără modificări de cod. |
| **MUST HAVE** | **Panou de administrare securizat cu 2 roluri** | Permite echipei și Primăriei să opereze platforma independent. |
| **MUST HAVE** | **Compresie automată foto pe telefon** | Esențială pentru conexiunile mobile slabe și pentru evitarea e-mailurilor blocate. |
| **SHOULD HAVE** | **Export date (CSV/Excel)** | Util pentru statistici lunare, programabil în etapa a 2-a. |
| **SHOULD HAVE** | **Urmărire sesizare după ID de către cetățean** | Poate fi adăugată ușor ulterior; în MVP, utilizatorul vede sesizarea aprobată direct pe hartă. |
| **SHOULD HAVE** | **Filtrare avansată și căutare în arhivă** | Utilă pe măsură ce volumul de articole crește în timp. |
| **LATER** | **Notificări Web Push native pe iOS/Android** | Tehnologie dependentă de permisiunile Apple PWA; înlocuită eficient în MVP de bannerul de alertă. |
| **LATER** | **Mod complet offline (IndexedDB draft)** | Nu este critic pentru un oraș cu acoperire GSM 4G/5G bună. |
| **LATER** | **Integrare directă prin API cu softul Primăriei** | Depinde exclusiv de deschiderea tehnică viitoare a municipalității. |

---

## 7. Arhitectura Tehnică: PWA vs. Nativ și Stack-ul Recomandat

### De ce alegem PWA (Mobile-First Web App) în locul unei aplicații native:
1. **Adopție maximă**: Cetățeanul apasă pe un link primit pe Facebook/WhatsApp sau scanează un cod QR dintr-un afiș și este imediat în aplicație. Nu este nevoie să meargă în Google Play/App Store, să aștepte descărcarea a 60MB și să își amintească parola contului.
2. **Cost și mentenanță reduse la jumătate**: Se întreține o singură bază de cod modernă. Nu există taxe anuale de dezvoltator Apple ($99/an), aprobări anevoioase de versiuni sau incompatibilități între versiuni diferite de Android.
3. **Actualizări la secundă**: Orice modificare este instantaneu disponibilă tuturor cetățenilor la următoarea accesare.
4. **Instalare opțională**: Cetățeanul are opțiunea „Adaugă pe ecranul principal”, aplicația comportându-se identic cu o aplicație nativă (fără bara de browser).

### Stack-ul tehnic recomandat:
* **Frontend**: React cu TypeScript și Tailwind CSS.
  * *Argument*: Interfață extrem de rapidă, componentizată, cu unelte excelente pentru animații fluide și redare mobilă.
* **Backend**: Node.js cu Express integrat în mod unificat.
  * *Argument*: Tratează rutele API pentru primirea sesizărilor, procesarea upload-urilor și trimiterea automată a e-mailurilor prin SMTP curat.
* **Bază de date**: Model de date flexibil (Firestore sau PostgreSQL ușor).
  * *Argument*: Permite stocarea întrebărilor de sondaj ca scheme dinamice JSON fără a necesita rescrierea tabelelor bazei de date la fiecare sondaj nou.

---

## 8. Decizia privind Calendarul: Integrare în Modulul Comunicate

Confirmăm integrarea evenimentelor locale ca un tip de conținut în cadrul modulului Comunicate:
* Un **Eveniment** conține aceleași elemente de bază ca o știre (titlu, descriere, fotografie), la care se adaugă două câmpuri: `data_eveniment` și `locatie`.
* **Beneficiu pentru administrator**: Când publică o postare nouă, selectează tipul „Eveniment” și completează data și locul. Nu trebuie să învețe o a doua interfață separată.
* **Beneficiu pentru cetățean**: Nu este obligat să parcurgă o grilă de calendar greu de citit pe telefon, ci vede o listă curată cronologică a ceea ce urmează să se întâmple în Turnu Măgurele, cu filtre clare.

---

## 9. Sistemul de Sesizări și Transmiterea pe E-mail către Primărie

### Fluxul complet al unei sesizări:
1. **Completare**: Cetățeanul alege categoria, adaugă 1-3 fotografii (comprimate automat în browser la sub 1MB), marchează poziția pe harta orașului și scrie o descriere succintă. Datele de contact (nume/telefon/mail) sunt opționale.
2. **Salvare și Generare ID**: Sistemul generează identificatorul intern `TM-XXXX` și salvează sesizarea în baza de date cu status `NOUĂ`.
3. **Expediere automată pe E-mail**:
   * **Destinatar**: Adresa oficială stabilită a Primăriei / Dispeceratului tehnic.
   * **Subiect**: `[Sesizare Cetățean TM-XXXX] Categorie: [Iluminat Public] - Str. Dunării`
   * **Conținut**:
     * Dată, oră și codul intern de evidență.
     * Categorie și descriere detaliată.
     * Locație exactă: adresă și link direct către coordonatele Google Maps pentru echipajul de intervenție.
     * Date de contact dacă au fost completate (sau mențiunea „Transmis anonim”).
     * Fotografiile atașate sau link securizat pentru descărcare.
     * Subsol standardizat: *„Această sesizare a fost recepționată prin intermediul platformei civice independente Turnu Măgurele. Ea este transmisă spre informare și înregistrare în conformitate cu procedurile interne ale instituției.”*
4. **Moderare pentru Hartă**: În panoul de administrare, sesizarea apare în lista de așteptare. Administratorul verifică să nu conțină elemente defăimătoare și apasă „Aprobă pentru Hartă”. Punctul devine astfel vizibil pentru toți cetățenii.

---

## 10. Motorul Generic de Sondaje (Configurabil Fără Cod)

Fiecare sondaj este definit printr-o structură declarativă:
* Titlu, descriere, imagine de fundal (opțională), dată de start și dată de expirare.
* Listă de întrebări configurabile direct din Admin:
  * Textul întrebării;
  * Tipul: *Alegere unică (Radio)* sau *Alegere multiplă (Bife)* sau *Rating (1-5)*;
  * Variantele de răspuns (pot fi adăugate oricâte opțiuni prin butonul „+ Adaugă variantă”).
* **Prevenirea votului multiplu în MVP**:
  * La exprimarea votului, un identificator unic al sondajului este salvat în memoria locală (`localStorage`) a browserului utilizatorului.
  * Dacă utilizatorul reintră pe pagină, interfața detectează votul și îi afișează direct rezultatele procentuale, fără a-i mai permite să voteze a doua oară.
  * Soluția este ușoară, robustă și perfectă pentru nivelul unui MVP.

---

## 11. Matricea Riscurilor Tehnice și Măsurile Preventive

| Risc Tehnic | Impact | Măsură Preventivă Implementată |
| :--- | :--- | :--- |
| **Fotografii uriașe făcute cu telefonul** (15-20MB) | Blocarea upload-ului pe date mobile, e-mailuri refuzate de serverul Primăriei | Compresie nativă automată pe client (Canvas API) la maximum 1-2MB înainte de trimitere. |
| **E-mailurile cu sesizări ajung în SPAM la Primărie** | Lipsă de reacție a administrației locale | Utilizarea unui server SMTP autorizat cu înregistrări SPF, DKIM și formatare e-mail simplă (text + HTML curat). |
| **Spam sau sesizări triviale/răuvoitoare** | Aglomerarea dispeceratului și a hărții | Moderare obligatorie de către administrator înainte de publicarea pe hartă; limitare la trimitere pe sesiune. |
| **Confuzie privind statutul oficial al sesizării** | Așteptări greșite din partea cetățeanului | Mențiuni vizibile în aplicație și în confirmare: „Acesta este un număr de evidență intern al platformei civice, nu un număr de registru al Primăriei”. |

---

## 12. Planul de Dezvoltare Etapizată (5 Etape Verificabile)

Fiecare etapă va fi dezvoltată secvențial și testată independent:

* **Etapa 1: Scheletul Vizual Mobile-First & Modulul Comunicate și Evenimente**
  * Structura paginii (Antet cu identitatea orașului, navigație optimizată pentru telefon, ecran Acasă).
  * Modulul unificat de Comunicate cu filtre funcționale (*Alerte, Anunțuri, Știri, Evenimente*).
  * *Livrabil testabil*: Aplicație funcțională unde se pot parcurge și filtra comunicatele și evenimentele locale.

* **Etapa 2: Modulul Ghid Primărie & Dispecerate Locale (Quick Dial)**
  * Secțiunea informativă a Primăriei (program, servicii, adrese).
  * Lista dispeceratelor de intervenție rapidă cu apelare dintr-un singur click de pe mobil.
  * *Livrabil testabil*: Verificare apelare directă și accesibilitate a numerelor de urgență.

* **Etapa 3: Formularul de Sesizări & Harta Municipiului**
  * Formular pas-cu-pas de sesizare (categorii, încărcare foto comprimată, selecție locație pe hartă).
  * Generarea ID-ului intern `TM-XXX` și confirmare prietenoasă.
  * Harta interactivă a municipiului Turnu Măgurele cu afișarea sesizărilor pe categorii.
  * *Livrabil testabil*: Trimiterea unei sesizări demonstrative și localizarea ei vizuală pe harta orașului.

* **Etapa 4: Modulul Sondaje Dinamice**
  * Motorul de interpretare a întrebărilor (alegere simplă, multiplă, rating).
  * Salvarea votului și calculul procentual instantaneu al rezultatelor.
  * *Livrabil testabil*: Completarea unui sondaj demonstrativ și afișarea barelor de vot.

* **Etapa 5: Panoul de Administrare, Sistemul de Roluri & Expedierea E-mailurilor**
  * Autentificare securizată `/admin`.
  * Gestiune comunicate, sondaje și moderarea sesizărilor pentru afișarea pe hartă.
  * Integrarea serviciului de transmitere automată pe e-mail către Primărie.
  * *Livrabil testabil*: Circuit complet de la trimiterea sesizării -> recepționare e-mail -> aprobare în admin -> afișare pe hartă.

---

*Documentul a fost finalizat și salvat în spațiul de lucru al proiectului ca ghid de referință tehnică pentru municipiul Turnu Măgurele.*
