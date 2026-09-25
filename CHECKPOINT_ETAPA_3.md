# RAPORT DE AUDIT — CHECKPOINT COMPLET AL ETAPEI 3
## Integrarea Sistemului de Sesizări Cetățenești (Etapele 3A, 3B, 3C, 3D și 3E)

*Data checkpoint-ului: 25 Septembrie 2026*  
*Proiect: Turnu Măgurele Civic — Platformă digitală independentă*  
*Destinație: Document intern de audit și verificare arhitecturală*  
*Statut: VERIFICARE COMPLETĂ (Nu s-au efectuat modificări de cod)*

---

### CUPRINS
1. Obiectivul Checkpoint-ului
2. Validarea Lanțului Integrat (Fluxul Complet de Date)
3. Auditul Securității și Protecției Datelor Personale (Confidențialitate Strictă)
4. Verificarea Fiecarei Subetape (3A $\rightarrow$ 3E)
5. Matricea Testelor Funcționale și de Non-Regresie Executate
6. Verificarea Tehnică a Compilării și a Sistemului de Tipuri (Build & Lint)
7. Probleme sau Riscuri Tehnice Identificate (Dacă Există)
8. Concluzie Finală privind Starea Etapei 3 și Confirmare de Oprire

---

### 1. OBIECTIVUL CHECKPOINT-ULUI

Prezentul document constituie **verificarea integrală a convergenței tehnice** pentru toate componentele dezvoltate în cadrul Etapei 3:
* **Etapa 3A**: Formularul de sesizare, categorii civice, validare, geolocalizare GPS la cerere;
* **Etapa 3B**: Identificatorul civic intern `TM-XXX` (determinist, secvențial, nereutilizabil, decuplat de ID-ul tehnic);
* **Etapa 3C**: Compresia și redimensionarea fotografiilor (max 1920px, WebP/JPEG, raport de reducere, orientare EXIF);
* **Etapa 3D**: Harta geospațială Leaflet + OpenStreetMap centrată pe Turnu Măgurele ($43.7486^\circ \text{ N}, 24.8722^\circ \text{ E}$);
* **Etapa 3E**: Controlul publicării de către cetățean (implicit privat), moderarea administrativă și regula de publicare.

Verificarea a fost efectuată **în regim strict de citire și testare**, fără a introduce modificări în fișierele de cod ale aplicației.

---

### 2. VALIDAREA LANȚULUI INTEGRAT (FLUXUL COMPLET)

Fluxul operațional complet investigat și verificat:

```text
1. CETĂȚEAN (Formular 3A)
   ├── Completează categoria și descrierea
   ├── Captează locația (Adresă manuală și/sau coordonate GPS)
   ├── Încarcă fotografii ────> [ Serviciu Compresie 3C ]
   │                            (Redimensionare max 1920px + WebP/JPEG + EXIF)
   ├── Date de contact (opționale: nume, telefon, email)
   └── ALEGE OPȚIUNEA PUBLICARE (3E)
       ├── 'private' (VALOARE IMPLICITĂ OBLIGATORIE)
       ├── 'public'
       └── 'public_anonymous'
   │
   ▼
2. SALVARE & PERSISTENȚĂ (Serviciu 3B)
   ├── ID tehnic unic: `rep-timestamp-random`
   ├── Identificator civic unic: `TM-XXX` (contor secvențial strict persistent)
   ├── ModerationStatus inițial: `pending`
   └── Salvare în storage local (`turnu_civic_reports_store`)
   │
   ▼
3. PANOUL DE ADMINISTRARE / MODERARE (Modul 3E)
   ├── Administratorul evaluează sesizarea și datele petiționarului (strict intern)
   ├── Decizie moderator:
   │   ├── `approved` (Aprobă publicarea)
   │   ├── `rejected` (Respinge / Retrage din publicare)
   │   └── `pending` (Readuce în așteptare)
   └── Modificarea statusului persistă la reload
   │
   ▼
4. FILTRUL CENTRAL DE PUBLICARE (`isPubliclyVisible()`)
   ├── Verificare 1: Preferință cetățean != 'private'
   ├── Verificare 2: Decizie moderator == 'approved'
   └── Verificare 3: Coordonate GPS numerice valide
   │
   ▼
5. EXPUNERE SECURIZATĂ (`toPublicMapReport()`)
   ├── Transformare în `PublicMapReport`
   └── PROTECȚIE DATE DIRECTE DE CONTACT (Datele directe de contact — nume, telefon, email — nu sunt expuse în PublicMapReport și în interfața publică; descrierea și locația publică rămân supuse regulilor de publicare și moderare)
   │
   ▼
6. HARTA PUBLICĂ LEAFLET (Modul 3D)
   ├── Randare markeri colorați pe categorii
   ├── Popup informativ cu TM-XXX, categorie, descriere, dată și foto optimizată (3C)
   └── Zero date directe de contact (nume, telefon, email) în interfață sau DOM
```

Toate verigile acestui flux funcționează sincronizat și respectă separarea architecturală impusă:  
**UI $\rightarrow$ Service $\rightarrow$ Storage $\rightarrow$ Moderation $\rightarrow$ Public Transformation $\rightarrow$ Map**.

---

### 3. AUDITUL CONFIDENȚIALITĂȚII ȘI PROTECȚIEI DATELOR PERSONALE

S-a efectuat un audit aprofundat al modelului `PublicMapReport` (`src/types/report.ts`) și al datelor randate în `MapView.tsx`:

#### Structura Modelului Public:
```typescript
export interface PublicMapReport {
  id: string; // ID tehnic de referință
  referenceNumber: string; // TM-XXX
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
  isAnonymous: boolean;
}
```

#### Constatări de audit:
1. **Modelul `PublicMapReport` NU are câmpurile**: `contact`, `name`, `phone`, `email` sau `address`. Datele directe de contact (nume, telefon, email) nu sunt expuse în `PublicMapReport` și în interfața publică; descrierea și locația publică rămân supuse regulilor de publicare și moderare.
2. Funcția `toPublicMapReport()` din `reportService.ts`:
   * Nu propagă niciodată obiectul `report.contact`;
   * Nu pasează string-uri de contact;
   * Verifică mai întâi `isPubliclyVisible(report)` — dacă returnează `false`, nu se emite niciun obiect (returnează `null`).
3. Cardul popup din `MapView.tsx`:
   * Template-ul HTML din popup conține strict: `referenceNumber`, `categoryName`, `publicDescription`, `publicLocation.addressOrDetails`, data formatată și fotografia procesată;
   * Nicio referință către variabile de contact direct;
   * DOM-ul generat de Leaflet nu conține date directe de contact (nume, telefon, email). Datele descriptive și de locație publică rămân supuse regulilor de publicare și moderare.
4. **Aspect de confidențialitate privind precizia GPS**: Precizia coordonatelor afișate public reprezintă un factor relevant de confidențialitate (nu doar un detaliu tehnic), deoarece o locație exactă poate deveni identificabilă indirect (ex: locuință individuală izolată).

---

### 4. VERIFICAREA INTEGRĂRII SUBETAPELOR (3A $\rightarrow$ 3E)

#### 4.1. Subetapa 3A — Formularul de Sesizare
* **Categorii**: Cele 9 categorii municipale sunt disponibile și selectabile;
* **Descriere**: Validare lungime (min 15 caractere, max 1000 caractere);
* **Locație**: Câmp de adresă/reper obligatoriu; butonul „Preia poziția GPS” funcționează la cerere (fără tracking continuu ascuns);
* **Date de contact**: Opționale (nume, telefon, e-mail) cu validare format e-mail și telefon dacă sunt completate.

#### 4.2. Subetapa 3B — Identificator Civic Intern `TM-XXX`
* **Format**: Prefix fix `TM-` urmat de minim 3 cifre padded (`TM-001`, `TM-002` etc.);
* **Generare deterministă**: Apelată strict la momentul `submitReport()`;
* **Nereutilizare numere**: Contorul `turnu_civic_reports_counter` este independent de lungimea array-ului de sesizări; la ștergerea unei sesizări, contorul rămâne la valoarea curentă și nu este decrementat;
* **Ecran confirmare**: Afișează codul, avertismentul că nu reprezintă număr oficial al Primăriei și buton de copiere în clipboard.

#### 4.3. Subetapa 3C — Compresia Fotografiilor
* **Algoritm**: Utilizare `imageCompressionService` cu `HTMLCanvasElement` în browser;
* **Redimensionare**: Latură maximă 1920px (păstrând aspect ratio);
* **Format**: Conversie automată în `image/webp` (cu fallback `image/jpeg`);
* **Indicator**: Raportul de compresie (ex: -85.5%) și dimensiunea redusă sunt salvate în structura `ReportPhoto` și afișate utilizatorului.

#### 4.4. Subetapa 3D — Harta Sesizărilor
* **Bibliotecă**: Leaflet v1.9.4 + OpenStreetMap tiles;
* **Centrare**: Centrată pe municipiul Turnu Măgurele la coordonatele $43.7486^\circ \text{ N}, 24.8722^\circ \text{ E}$;
* **Markeri**: Pini vectoriali colorați pe categorii, cu etichetă `TM-XXX` la hover pe desktop;
* **Filtre**: Filtrare dinamică orizontală pe categorii, fără reîncărcarea paginii.

#### 4.5. Subetapa 3E — Moderarea și Controlul Publicării
* **Opțiune cetățean**: Valoarea implicită este `private`; opțiunile `public` și `public_anonymous` permit intrarea în fluxul de moderare;
* **Panou Admin**: Tab-ul `C. Moderare Sesizări (3E)` afișează indicatori statistici reali (`În așteptare`, `Aprobate`, `Respinse`, `Private`, `Active pe hartă`);
* **Acțiuni de moderare**: Butoane cu feedback vizual rapid (toast) pentru aprobare, respingere/retragere și readucere în așteptare;
* **Sincronizare hartă**: Doar sesizările cu preferință publică și aprobate apar pe hartă.

---

### 5. MATRICEA TESTELOR FUNCȚIONALE ȘI DE NON-REGRESIE

| ID Test | Descriere Test Funcțional | Comportament Așteptat | Comportament Constatat | Statut |
| :---: | :--- | :--- | :--- | :---: |
| **T-01** | Trimitere sesizare nouă cu setările implicite | `publicationPreference = 'private'`, `moderationStatus = 'pending'`, primește `TM-XXX` secvențial | Salvarea reușește, cod `TM-XXX` alocat, sesizarea NU apare pe hartă | **PASSED** |
| **T-02** | Trimitere sesizare cu bifă „Public” | `publicationPreference = 'public'`, `moderationStatus = 'pending'` | Salvarea reușește, sesizarea intră în moderare, NU apare pe hartă înainte de aprobare | **PASSED** |
| **T-03** | Trimitere sesizare cu bifă „Public Anonim” | `publicationPreference = 'public_anonymous'`, `moderationStatus = 'pending'` | Salvarea reușește, sesizarea intră în moderare, datele de contact sunt salvate intern | **PASSED** |
| **T-04** | Aprobare sesizare publică în Admin | Trecere status în `approved` | Sesizarea APARE imediat pe hartă cu marker colorat corespunzător categoriei | **PASSED** |
| **T-05** | Respingere sesizare publică în Admin | Trecere status în `rejected` | Sesizarea DISPARE imediat de pe hartă, dar rămâne în evidența internă a Admin-ului | **PASSED** |
| **T-06** | Aprobare sesizare marcată 'private' | Forțare status `approved` pe sesizare privată | Regula `isPubliclyVisible()` blochează afișarea: sesizarea NU apare pe hartă | **PASSED** |
| **T-07** | Verificare popup marker pe hartă | Click pe pin-ul de pe hartă | Afișează `TM-XXX`, categorie, descriere, dată, reper și foto optimizată (3C) | **PASSED** |
| **T-08** | Audit date private în popup și DOM | Căutare nume, telefon, email în nodurile DOM ale popup-ului | Niciun câmp de contact nu există în structura DOM sau în proprietățile obiectului | **PASSED** |
| **T-09** | Filtrare pe categorii în MapView | Selectare filtru „Iluminat” $\rightarrow$ „Drumuri” | Markerii se actualizează reactiv fără reîncărcarea paginii | **PASSED** |
| **T-10** | Sesizare cu adresă text fără GPS | Trimitere fără coordonate GPS | Apare în Admin marcată ca lipsită de GPS, poate fi aprobată, dar NU generează pin defect | **PASSED** |
| **T-11** | Compresie foto automată (3C) | Încărcare imagine JPEG mare (ex: 4-8 MB) | Redimensionată la max 1920px, comprimată în WebP/JPEG cu dimensiune redusă drastic | **PASSED** |
| **T-12** | Persistență completă la Reload (F5) | Schimbare decizie moderare $\rightarrow$ Reload | Starea stocată local în localStorage, contorul `TM-XXX` și statusul aprobat/respins se păstrează identic | **PASSED** |
| **T-13** | Non-regresie Etapa 1 și Etapa 2 | Verificare Comunicate (1B), Evenimente (1C), Ghid (2A), Quick Dial (2B), CMS (2C) | Toate modulele anterioare sunt intacte, funcționale și accesibile din navigare | **PASSED** |

---

### 6. VERIFICAREA TEHNICĂ A COMPILĂRII ȘI A SISTEMULUI DE TIPURI

Verificarea a fost executată cu uneltele native ale proiectului:

* **Static Type Checking (TypeScript)**:
  * Comandă: `npm run lint` (`tsc --noEmit`)
  * Rezultat: **Exit Code 0 — Linting completed successfully**
  * Erori detectate: **0**
* **Compilare pentru Producție (Vite Build)**:
  * Comandă: `npm run build` (`vite build`)
  * Rezultat: **Build succeeded - the applet is compiled**
  * Erori detectate: **0**
  * Avertismente critice: **0**

---

### 7. PROBLEME SAU RISCURI TEHNICE IDENTIFICATE

În cadrul auditului **nu au fost identificate defecte funcționale, breșe de confidențialitate sau erori de compilare**.

Se reconfirmă următoarele limitări arhitecturale asumate pentru stadiul actual MVP (care nu reprezintă defecte, ci caracteristici documentate ale fazei curente):
1. **Persistența locală**: Toate sesizările și stările de moderare sunt stocate în `localStorage`-ul instanței curente de browser. Sincronizarea multi-utilizator în rețea va fi realizată la conectarea backend-ului centralizat (Etapa 5);
2. **Autentificarea administrativă**: Panoul de administrare folosește o parolă locală de protecție la nivel de interfață client, autentificarea server-side reală cu token-uri și RBAC fiind planificată pentru etapele de producție;
3. **Precizia coordonatelor GPS și confidențialitatea geospațială**: Precizia coordonatelor GPS afișate public (4 zecimale în popup) trebuie tratată ca un aspect de confidențialitate, nu doar ca un aspect tehnic. Locația exactă poate deveni identificabilă indirect (de pildă, în cazul sesizărilor ce vizează imobile individuale sau locații izolate). Descrierea și locația publică rămân supuse regulilor de publicare și moderare, iar pentru etapele viitoare de producție este recomandabilă introducerea unui mecanism de generalizare geografică (ex: snapping la nivel de cartier sau intersecție).

---

### 8. CONCLUZIE FINALĂ ȘI CONFIRMARE DE OPRIRE

* **Etapa 3 (Sesizări Cetățenești) — compusă din subetapele 3A, 3B, 3C, 3D și 3E — este INTEGRATĂ COMPLET, STABILĂ, TESTATĂ ȘI VERIFICATĂ ÎN INTEGRALITATEA EI.**
* Fluxul complet:  
  **Creare sesizare $\rightarrow$ Alocare `TM-XXX` $\rightarrow$ Compresie foto (3C) $\rightarrow$ Coordonate GPS $\rightarrow$ Preferință cetățean (implicit 'private') $\rightarrow$ Moderare în Admin (3E) $\rightarrow$ Afișare pe hartă (3D) cu neexpunerea datelor directe de contact (nume, telefon, email) în PublicMapReport și în interfața publică; descrierea și locația publică rămân supuse regulilor de publicare și moderare.**  
  este complet funcțional și conform cerințelor de confidențialitate.
* Nu s-a implementat nicio funcționalitate viitoare (fără e-mail automat către Primărie, fără backend server-side, fără RBAC real, fără notificări).
* **Nu s-a început Etapa 4.**
* **EXECUȚIA ESTE COMPLET OPRITĂ.** Aștept auditul și dispozițiile dumneavoastră.

---
*Raport intern de audit generat în rădăcina proiectului: `CHECKPOINT_ETAPA_3.md`.*
