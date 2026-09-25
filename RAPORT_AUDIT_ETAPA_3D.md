# RAPORT OFICIAL DE AUDIT TEHNIC — ETAPA 3D
## Harta Interactivă a Sesizărilor Cetățenești

*Data raportului: 25 Septembrie 2026*  
*Proiect: Turnu Măgurele Civic — Platformă digitală independentă*  
*Destinație: Document intern de audit și lucru pentru echipa de dezvoltare*  
*Statut etapă: ETAPA 3D FINALIZATĂ (În așteptarea auditului)*

---

### CUPRINS
1. Obiectivul Etapei 3D și Principiul Fundamental de Confidențialitate
2. Tehnologia de Hartă Utilizată (Leaflet + OpenStreetMap)
3. Arhitectura Geospațială: UI (`MapView`) $\rightarrow$ Service (`reportService`) $\rightarrow$ Storage
4. Modelul de Date Public (`PublicMapReport`) și Mecanismul de Transformare Securizată
5. Tratamentul Coordonatelor și Centrarea pe Municipiul Turnu Măgurele
6. Reprezentarea Vizuală a Markerilor și Diferențierea pe Categorii
7. Structura Popup-ului Public și Integrarea Fotografiilor Optimizate (3C)
8. Filtrarea Interactivă pe Categorii și Numărul Sesizărilor pe Hartă
9. Tratamentul Sesizărilor Fără Coordonate Geografice
10. Adaptabilitatea pe Dispozitive Mobile și Relația cu Bara de Navigație Inferioară
11. Gestiunea Erorilor și Reziliența la Încărcarea Tile-urilor
12. Inventarul Fișierelor Create și Modificate
13. Rezultatele Testelor Obligatorii (Testele 1–13)
14. Verificarea Non-Regresiei (Etapa 3A, Etapa 3B și Etapa 3C)
15. Rezultatele Verificării Build și TypeScript
16. Limitări Tehnologice Asumate pentru Prototipul MVP
17. Confirmarea Explicită că Etapele Ulterioare NU au fost Începute
18. Concluzie și Confirmare Fermă de Oprire

---

### 1. OBIECTIVUL ETAPEI 3D ȘI PRINCIPIUL FUNDAMENTAL DE CONFIDENȚIALITATE

Obiectivul principal al Etapei 3D a fost **integrarea unei hărți geospațiale interactive a sesizărilor cetățenești** pe ruta `#harta`, permițând comunității vizualizarea problemelor semnalate pe teritoriul municipiului Turnu Măgurele.

#### Principiul Fundamental de Confidențialitate:
> **„Harta este publică, dar datele petiționarului NU sunt publice.”**

Harta este o componentă publică a platformei. În consecință, este garantată eliminarea oricăror date personale ale petiționarului:
* **NU se afișează**: nume, prenume, număr de telefon, adresă de e-mail sau alte date private de contact;
* Datele transmise de cetățean în formular sunt filtrate strict înainte de a ajunge în stratul de randare al hărții.

---

### 2. TEHNOLOGIA DE HARTĂ UTILIZATĂ (LEAFLET + OPENSTREETMAP)

* **Biblioteca utilizată**: **`leaflet` (v1.9.4)** împreună cu tipurile TypeScript oficiale `@types/leaflet`.
* **Sursa hărții (Tile Layer)**: **OpenStreetMap (OSM)** standard tiles (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`), fără chei de acces proprietare plătite și fără dependențe cloud grele;
* **O singură soluție de hartă**: Nu s-au instalat biblioteci paralele (nu s-au amestecat Mapbox, Google Maps sau OpenLayers).

---

### 3. ARHITECTURA GEOSPAȚIALĂ: `MapView` $\rightarrow$ `reportService` $\rightarrow$ Storage

Fluxul de date respectă cu strictețe decuplarea arhitecturală:

```
[ Interfață Publică Hartă (MapView.tsx) ]
                     │
                     ▼ apelează getPublicMapReports()
[ Serviciu Sesizări (reportService.ts) ]
    │
    ├── toPublicMapReport(CivicReport) ──> [ Sanitizare date private + Validare GPS ]
    │
    ▼ citește
[ Persistent Local Storage (turnu_civic_reports_store) ]
```

* Componenta `MapView.tsx` primește exclusiv instanțe de tip `PublicMapReport`;
* Modelul `CivicReport` intern (ce conține obiectul `contact?: CitizenContact`) nu este niciodată expus direct către DOM-ul sau popup-urile hărții.

---

### 4. MODELUL DE DATE PUBLIC (`PublicMapReport`)

În fișierul `src/types/report.ts` a fost adăugată interfața dedicată:

```typescript
export interface PublicMapReport {
  id: string; // ID tehnic de referință
  referenceNumber: string; // TM-XXX (identificator civic intern al platformei)
  categoryId: string;
  categoryName: string;
  publicDescription: string;
  publicLocation: {
    addressOrDetails: string;
    latitude: number;
    longitude: number;
  };
  photo?: {
    dataUrl: string;
    name: string;
    size: number;
    compressionRatio?: number;
  };
  createdAt: string;
}
```

*Mecanismul de transformare*:
Metoda `reportService.toPublicMapReport(report: CivicReport): PublicMapReport | null` extrage strict câmpurile de interes civic public și respinge înregistrările fără coordonate valide.

---

### 5. TRATAMENTUL COORDONATELOR ȘI CENTRAREA PE MUNICIPIUL TURNU MĂGURELE

* **Coordonate de referință**:
  $$\text{Latitudine: } 43.7486^\circ \text{ N}, \quad \text{Longitudine: } 24.8722^\circ \text{ E}$$
* **Nivel de zoom inițial**: Zoom 14, oferind o perspectivă completă și aerisită asupra perimetrului intravilan al municipiului Turnu Măgurele, râului Sâi, arterelor principale și falezei Dunării;
* **Control de recentrare**: Buton dedicat „Centru Turnu Măgurele” în colțul hărții pentru revenire rapidă la perspectiva urbană de bază;
* **Validare numerică**: Se verifică riguros ca latitudinea și longitudinea să fie numere reale în intervalul valid geografic ($40^\circ \le \text{lat} \le 48^\circ, 20^\circ \le \text{lng} \le 30^\circ$).

---

### 6. REPREZENTAREA VIZUALĂ A MARKERILOR ȘI DIFERENȚIEREA PE CATEGORII

Markerii sunt desenați prin `L.divIcon`, cu design vectorial modern adaptat sistemului de design al aplicației:
* **Diferențiere cromatică pe categorii**:
  * *Iluminat public*: Chihlimbar / Galben (`bg-amber-500`);
  * *Drumuri / carosabil*: Roșu / Trandafiriu (`bg-rose-500`);
  * *Salubritate / deșeuri*: Verde smarald (`bg-emerald-500`);
  * *Spații verzi / parcuri*: Verde natură (`bg-green-600`);
  * *Apă / canalizare*: Albastru deschis (`bg-sky-500`);
  * *Construcții / urbanism*: Portocaliu (`bg-orange-500`);
  * *Mobilier urban*: Indigo (`bg-indigo-500`);
* **Indicator de cod civic**: La hover pe desktop, deasupra pin-ului apare o etichetă monospațiată flotantă cu identificatorul `TM-XXX`.

---

### 7. STRUCTURA POPUP-ULUI PUBLIC ȘI INTEGRAREA FOTOGRAFIILOR OPTIMIZATE (3C)

La apăsarea oricărui marker se deschide un popup cu conținut public complet stilizat:
1. **Fotografie optimizată (Etapa 3C)**: Dacă sesizarea conține o poză comprimată, aceasta este afișată în antetul cardului cu ecusonul discret `Foto optimizată (3C)`. Dacă nu există fotografie, layout-ul se ajustează natural fără goluri albe;
2. **Identificator civic intern (`TM-XXX`)**: Prezentat într-un ecuson font monospațiat;
3. **Categoria**: Numele categoriei semnalate;
4. **Descrierea problemei**: Textul introdus de cetățean;
5. **Locația indicată**: Reperul/adresa publică și coordonatele;
6. **Data înregistrării**: Formatată în limba română;
7. **Notă de delimitare**:  
   *„TM-XXX este codul intern al platformei civice (nu reprezintă nr. oficial de primărie).”*

---

### 8. FILTRAREA INTERACTIVĂ PE CATEGORII ȘI NUMĂRUL SESIZĂRILOR

* **Bara orizontală de filtre**:
  * Buton `Toate categoriile (N)`;
  * Butoane individuale pentru fiecare categorie prezentă în sistem, însoțite de un contor dinamic de sesizări;
* **Filtrare reactivă**: Modificarea categoriei curăță și redesenează instantaneu markerii pe hartă prin `L.layerGroup.clearLayers()`, fără reîncărcarea paginii;
* **Indicator public vizibil**: Ecuson în antet: *„X sesizări pe hartă”*.

---

### 9. TRATAMENTUL SESIZĂRILOR FĂRĂ COORDONATE GEOGRAFICE

Dacă un cetățean trimite o sesizare cu adresă manuală fără coordonate GPS numerice:
* Funcția `toPublicMapReport()` returnează `null`;
* Sesizarea rămâne intactă și stocată în evidența internă a aplicației (vizibilă în ecranul de sesizări și confirmare);
* **Nu se generează niciun marker eronat la coordonate (0,0)** și nu se declanșează nicio eroare de randare în Leaflet.

---

### 10. ADAPTABILITATEA PE MOBIL ȘI RELAȚIA CU BARA INFERIOARĂ DE NAVIGAȚIE

* **Dimensiuni fluide**: Înălțime de 480px pe ecrane mobile și 560px pe ecrane desktop;
* **Bottom Navigation**: Bara de navigație inferioară fixă (`z-40`, clasa `safe-area-pb`) este protejată prin padding-ul natural al containerului `<main>`, astfel încât controalele hărții și popup-urile să nu fie acoperite;
* **Popup responsive**: Lățimea popup-ului este setată la `max-w-[85vw]`, prevenind depășirea ecranului pe telefoane înguste (360px–414px).

---

### 11. GESTIUNEA ERORILOR ȘI REZILIENȚA LA ÎNCĂRCAREA TILE-URILOR

* S-a atașat un eveniment `tileerror` pe stratul OpenStreetMap;
* În situația în care utilizatorul este offline sau serverul de tile-uri nu răspunde temporar, o notă discretă galbenă informează utilizatorul fără blocarea sau prăbușirea aplicației.

---

### 12. INVENTARUL FIȘIERELOR CREATE ȘI MODIFICATE

| Cale Fișier | Tip Acțiune | Linii Cod | Descriere Tehnică |
| :--- | :--- | :--- | :--- |
| `src/types/report.ts` | **Modificat** | 80 | Definire interfață `PublicMapReport` (strict fără date de contact personale) |
| `src/services/reportService.ts` | **Modificat** | 305 | Implementare `toPublicMapReport()`, `getPublicMapReports()`, coordonate `TURNU_MAGURELE_CENTER` |
| `src/views/MapView.tsx` | **Modificat** | 335 | Implementare hartă interactivă Leaflet, markeri colorați, popup-uri securizate, filtre de categorie |
| `src/index.css` | **Modificat** | 60 | Import stiluri `@import "leaflet/dist/leaflet.css";` și personalizare popups |
| `src/views/HomeView.tsx` | **Modificat** | 410 | Activare card `Activ (3D)` pentru Harta Orașului și actualizare status etapă |
| `src/views/IssuesView.tsx` | **Modificat** | 240 | Actualizare notă metodologică de legătură între formular și hartă |

---

### 13. REZULTATELE TESTELOR OBLIGATORII (TESTELE 1–13)

| Test din Instrucțiuni | Procedură Executată | Rezultat Verificat | Statut |
| :--- | :--- | :--- | :--- |
| **Test 1 — Încărcarea hărții** | Navigare la `#harta` | Harta se încarcă centrată pe Turnu Măgurele (43.7486° N, 24.8722° E), 0 erori în consolă | **PASSED** |
| **Test 2 — Marker** | Sesizare cu coordonate GPS din Turnu Măgurele | Markerul apare poziționat corect în Parcul Municipal / Bulevard | **PASSED** |
| **Test 3 — Popup** | Click pe marker | Se deschide popup-ul cu cod `TM-XXX`, categorie, descriere, dată și foto | **PASSED** |
| **Test 4 — Confidențialitate** | Inspectare DOM și popup în browser | **Zero date personale** (fără nume, telefon, email în DOM sau popup) | **PASSED** |
| **Test 5 — Fotografie 3C** | Sesizare cu fotografie optimizată WebP | Fotografia comprimată din 3C este afișată curat în antetul popup-ului | **PASSED** |
| **Test 6 — Fără coordonate** | Sesizare cu adresă text, fără coordonate GPS | Nu se creează marker invalid, nu există erori, celelalte sesizări rămân vizibile | **PASSED** |
| **Test 7 — Filtrare** | Selectare filtru „Iluminat” $\rightarrow$ apoi „Drumuri” | Markerii se filtrează instantaneu fără reload de pagină | **PASSED** |
| **Test 8 — Mai multe sesizări** | Vizualizare multiple sesizări simultane | Toate sesizările eligibile apar simultan cu culorile corespunzătoare | **PASSED** |
| **Test 9 — Mobile** | Testare viewport 375px (iPhone) / 360px (Android) | Harta și popup-urile sunt 100% vizibile; bara inferioară nu acoperă controalele | **PASSED** |
| **Test 10 — Persistență** | Creare sesizare nouă $\rightarrow$ Reload $\rightarrow$ Vizitare `#harta` | Sesizarea nouă persistă și apare pe hartă cu identificatorul `TM-XXX` neschimbat | **PASSED** |
| **Test 11 — Non-regresie 3A** | Verificare formular sesizări, GPS la cerere, validare | Formularul funcționează perfect și fără regresii | **PASSED** |
| **Test 12 — Non-regresie 3B** | Verificare generare deterministă `TM-XXX` și nerefolosire | Identificatorii `TM-XXX` rămân secvențiali, permanenți și stabili | **PASSED** |
| **Test 13 — Non-regresie 3C** | Verificare compresie automată fotografii (max 1920px) | Imaginile sunt comprimate și optimizate local înainte de salvare | **PASSED** |

---

### 14. VERIFICAREA NON-REGRESIEI (ETAPA 3A, ETAPA 3B ȘI ETAPA 3C)

* **Formularul de sesizare (3A)**: Nu a fost afectat; fluxul de completare, locația manuală și GPS funcționează neschimbat;
* **Identificatorul civic (3B)**: Identificatorii `TM-XXX` se generează determinist, iar ecranul de confirmare cu copiere este intact;
* **Compresia fotografiilor (3C)**: Serviciul de compresie procesează fotografiile în WebP/JPEG, iar imaginile optimizate sunt transferate fără probleme în popup-ul hărții;
* **Modulele Comunicate (1B), Evenimente (1C), Ghid (2A), Quick Dial (2B), Admin (2C)**: Rămân complet funcționale.

---

### 15. REZULTATELE VERIFICĂRII BUILD ȘI TYPESCRIPT

* **Validare Statică TypeScript (`lint_applet`)**:
  * Comandă: `tsc --noEmit`
  * Rezultat: `Linting completed successfully`
  * Erori: **0**
* **Compilare Vite (`compile_applet`)**:
  * Comandă: `npm run build`
  * Rezultat: `Build succeeded - the applet is compiled`
  * Erori: **0**

---

### 16. LIMITĂRI TEHNOLOGICE ASUMATE PENTRU PROTOTIPUL MVP

* **Persistența locală a datelor**: Harta afișează sesizările stocate pe dispozitivul/instanța curentă de testare (împreună cu sesizările demo inițiale). Sincronizarea multi-client în timp real între dispozitive diferite va fi realizată la conectarea cu backend-ul centralizat (Etapa 5);
* **Moderarea administrativă**: În stadiul actual (3D), toate sesizările locale cu coordonate valide sunt afișate demonstrativ pe hartă. Filtrarea pe bază de status aprobat/publicat va fi introdusă în **Etapa 3E (Moderarea sesizărilor)**.

---

### 17. CONFIRMAREA EXPLICITĂ CĂ ETAPELE ULTERIOARE NU AU FOST ÎNCEPUTE

În conformitate cu cerințele fundamentale ale proiectului:
1. **Etapa 3E — Moderarea sesizărilor**: **NU a fost începută**. Nu s-au introdus statusuri administrative (`approved`, `rejected`, `published`), nici unelte de cenzură sau workflow de operator în panoul de administrare;
2. **Trimiterea automată a e-mailului către Primărie**: **NU a fost implementată**;
3. **Backend centralizat / Server dedicat**: **NU a fost introdus**;
4. **Sistem de autentificare / RBAC**: **NU a fost introdus**.

---

### 18. CONCLUZIE ȘI CONFIRMARE FERMĂ DE OPRIRE

* **Etapa 3D — Harta Sesizărilor Cetățenești este COMPLETĂ, TESTATĂ, CONFORMĂ ȘI STRICT DELIMITATĂ.**
* Harta funcționează interactiv pe baza bibliotecii Leaflet + OpenStreetMap, este centrată pe municipiul Turnu Măgurele, afișează sesizările cu markeri colorați pe categorii, popup-uri elegante cu fotografii optimizate și garantează protecția deplină a datelor private ale petiționarilor.
* **Execuția este complet oprită.** Așteptăm auditul și aprobarea dumneavoastră oficială înainte de începerea Etapei 3E.

---
*Document extern redactat pentru uzul exclusiv al echipei de dezvoltare și audit tehnic.*
