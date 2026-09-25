# RAPORT OFICIAL DE AUDIT TEHNIC — ETAPA 3B
## Identificator Intern și Persistența Sesizării

*Data raportului: 25 Septembrie 2026*  
*Proiect: Turnu Măgurele Civic — Platformă digitală independentă*  
*Destinație: Document intern de audit și lucru pentru echipa de dezvoltare*  
*Statut etapă: ETAPA 3B FINALIZATĂ (În așteptarea auditului)*

---

### CUPRINS
1. Obiectivele Etapei 3B și Principiul Fundamental
2. Mecanismul de Generare Deterministă a Identificatorului `TM-XXX`
3. Separarea Arhitecturală: ID Tehnic (`id`) vs. Identificator Civic (`referenceNumber`)
4. Modelul de Date Extins (`src/types/report.ts`)
5. Momentul Alocării și Protecția la Abandon / Erori
6. Mecanismul de Persistență și Garanția Nereutilizării Numerelor (Monotonic Counter)
7. Confirmarea Către Cetățean, Acțiunea de Copiere și Delimitarea Instituțională
8. Listarea Tehnică Minimală și Protecția Datelor Personale (Confidențialitate)
9. Inventarul Fișierelor Create și Modificate
10. Metodologia de Testare și Rezultatele Verificărilor (Testele 1–8)
11. Testele de Non-Regresie (Etapa 3A și Modulele Anterioare)
12. Rezultatele Verificării Build și TypeScript
13. Limitări Tehnologice Asumate pentru Prototip
14. Confirmarea Explicită că Etapele 3C, 3D și 3E NU au fost Începute
15. Concluzie și Confirmare Fermă de Oprire

---

### 1. OBIECTIVELE ETAPEI 3B ȘI PRINCIPIUL FUNDAMENTAL

Obiectivul principal al Etapei 3B a fost introducerea **identificatorului intern al sesizării**, în formatul oficial stabilit în proiect:

$$\mathbf{TM\text{-}XXX} \quad (\text{ex: } TM\text{-}001, \, TM\text{-}002, \, TM\text{-}003)$$

#### Caracteristicile fundamentale ale identificatorului:
1. Este **identificatorul intern al platformei civice independente**, utilizat pentru evidența proprie a sesizărilor și comunicabil cetățeanului;
2. **DELIMITARE OBLIGATORIE**:
   * **NU este număr de înregistrare al Primăriei Municipiului Turnu Măgurele**;
   * **NU este număr oficial de registratură**;
   * **NU reprezintă o dovadă că sesizarea a fost înregistrată la Primărie**.
3. Este **unic**, **determinist**, **secvențial**, **permanent asociat** sesizării respective și **imposibil de alterat accidental**.
4. Numerele deja alocate **nu sunt refolosite niciodată**, chiar dacă o sesizare anterioară este ștearsă sau dezactivată.

---

### 2. MECANISMUL DE GENERARE DETERMINISTĂ A IDENTIFICATORULUI `TM-XXX`

Logica de alocare este complet izolată în `reportService.ts`:
* Nu este hardcodată în componentele React;
* Utilizează un contor persistent separat (`turnu_civic_reports_counter`);
* Formatare vizuală: `TM-` concatenat cu numărul secvențial formatat cu zero-uri la stânga pe minimum 3 cifre (`padStart(3, '0')`):
  * `1` $\rightarrow$ `TM-001`
  * `2` $\rightarrow$ `TM-002`
  * ...
  * `42` $\rightarrow$ `TM-042`
  * `1000` $\rightarrow$ `TM-1000`
* Dacă o sesizare este eliminată, contorul global **nu este decrementat**. Următoarea sesizare primește $N+1$, garantând că nu vor exista coliziuni istorice.

---

### 3. SEPARAREA ARHITECTURALĂ: ID TEHNIC (`id`) VS. IDENTIFICATOR CIVIC (`referenceNumber`)

S-a implementat o distincție riguroasă între cele două concepte:

| Criteriu | ID Tehnic (`id`) | Identificator Civic (`referenceNumber`) |
| :--- | :--- | :--- |
| **Exemplu format** | `rep-1727271829000-a8f3b` | `TM-001` |
| **Destinație** | Cheie primară tehnică în depozit / baza de date | Identificator de referință pentru cetățean și platformă |
| **Vizibilitate** | Strict internă de sistem | Afișat în ecranul de confirmare, căutare și evidență civică |
| **Generare** | Timestamp + entropie pseudo-aleatorie | Secvențiere strict monotonică (1, 2, 3...) cu prefix `TM-` |
| **Confuzie** | Nu se afișează ca număr de evidență | Nu este cheie tehnică de stocare internă |

---

### 4. MODELUL DE DATE EXTINS (`src/types/report.ts`)

```typescript
export interface CivicReport {
  id: string; // ID tehnic intern de stocare (ex: rep-timestamp-rnd)
  referenceNumber: string; // Identificator civic intern al platformei (ex: TM-001)
  categoryId: string;
  categoryName: string;
  description: string;
  photos: ReportPhoto[];
  location: ReportLocation;
  contact?: CitizenContact;
  createdAt: string;
  status: 'transmis'; // Stare inițială simplă de transmitere a formularului
}
```

*Notă de delimitare*: Câmpurile sau statusurile specifice moderării (ex: `approved`, `published`, `hidden`, note administrative etc.) **NU au fost introduse**, acestea fiind rezervate exclusiv **Etapei 3E**.

---

### 5. MOMENTUL ALOCĂRII ȘI PROTECȚIA LA ABANDON / ERORI

Identificatorul `TM-XXX` este generat **strict în momentul în care o sesizare a trecut de toate validările și este acceptată pentru salvare**:
* **Deschiderea formularului** $\rightarrow$ Contorul rămâne neschimbat (nu se consumă număr);
* **Completarea parțială și abandonarea paginii** $\rightarrow$ Contorul rămâne neschimbat;
* **Apăsarea pe submit cu erori de validare** $\rightarrow$ Formularul blochează transmiterea, contorul rămâne neschimbat;
* **Trimitere validă confirmată** $\rightarrow$ Se incrementează contorul, se generează `TM-XXX`, se asociază permanent obiectului salvat și se persistă în storage.

---

### 6. MECANISMUL DE PERSISTENȚĂ ȘI GARANȚIA NEREUTILIZĂRII NUMERELOR

Persistența locală a prototipului folosește două structuri de date independente:
1. `turnu_civic_reports_store`: Lista sesizărilor salvate persistent ca obiecte serializate JSON;
2. `turnu_civic_reports_counter`: Valoarea scalară a contorului istoric de secvență.

**Regula de aur**: Contorul este independent de lungimea tabloului `reports.length`.
* Exemplu: Dacă sunt create `TM-001` și `TM-002`, iar `TM-002` este ștearsă din evidență (`reports.length` devine 1), contorul rămâne la valoarea `2`. Următoarea sesizare va primi garantat `TM-003`, prevenind refolosirea identificatorului `TM-002`.

---

### 7. CONFIRMAREA CĂTRE CETĂȚEAN, ACȚIUNEA DE COPIERE ȘI DELIMITAREA INSTITUȚIONALĂ

Componenta `ReportConfirmation.tsx` a fost actualizată pentru Etapa 3B:
1. **Evidențiere mare a identificatorului**:
   * Ecuson stilizat cu font monospațiat de mari dimensiuni: **`TM-001`**;
   * Text explicativ: *„Păstrează acest identificator pentru referințe ulterioare în cadrul platformei.”*;
2. **Butonul „Copiază” (UX Enhancement)**:
   * Permite copierea directă în clipboard a codului `TM-XXX`;
   * Oferă feedback vizual imediat prin comutarea pictogramei în bifă verde și textul *„Copiat!”*;
   * Include fallback compatibil pentru browsere în care Clipboard API nu este disponibil;
3. **Avertisment obligatoriu de delimitare instituțională**:
   * Încadrat într-un container distinct cu fundal galben/chihlimbar și pictogramă de alertă;
   * Formulare exactă conform specificațiilor:  
     *„Atenție: Codul TM-XXX este identificatorul intern de evidență al platformei civice. NU este număr oficial de înregistrare al Primăriei Municipiului Turnu Măgurele și NU reprezintă număr oficial de registratură.”*

---

### 8. LISTAREA TEHNICĂ MINIMALĂ ȘI PROTECȚIA DATELOR PERSONALE (CONFIDENȚIALITATE)

Conform cerințelor din secțiunile 11 și 15 ale instrucțiunilor, în `IssuesView.tsx` a fost inclusă o listă tehnică minimală accesibilă evaluatorilor și cetățenilor de pe dispozitivul respectiv:
* **Informații afișate**:
  * Identificatorul `TM-XXX`;
  * Categoria sesizării;
  * Locația (stradă/reper);
  * Data și ora creării;
  * Numărul de fotografii atașate;
  * Previzualizarea ID-ului tehnic intern (`id: rep-...`), demonstrând diferențierea față de `TM-XXX`;
  * Buton tehnic „Șterge (Test 6)” pentru verificarea nerefolosirii numerelor;
* **CONFIDENȚIALITATE STRICTĂ (Secțiunea 15)**:
  * **Nu se afișează**: numărul de telefon, adresa de e-mail sau numele petiționarului;
  * Datele de contact rămân strict interne obiectului de sesizare și nu sunt expuse în lista de verificare.

---

### 9. INVENTARUL FIȘIERELOR CREATE ȘI MODIFICATE

| Cale Fișier | Tip Acțiune | Linii Cod | Descriere Tehnică |
| :--- | :--- | :--- | :--- |
| `src/types/report.ts` | **Modificat** | 50 | Includere câmpuri `id` (ID tehnic) și `referenceNumber` (TM-XXX) în `CivicReport` |
| `src/services/reportService.ts` | **Modificat** | 185 | Implementare generator secvențial `generateNextReferenceNumber()`, persistență contor și sesizări, metode `deleteReport()`, `getReportByReferenceNumber()` |
| `src/components/report/ReportConfirmation.tsx` | **Modificat** | 185 | Randare proeminentă `TM-XXX`, buton de copiere cu feedback, avertisment de delimitare |
| `src/views/IssuesView.tsx` | **Modificat** | 200 | Integrare ecran confirmare 3B, comutator formular / listă tehnică de verificare a identificatorilor |
| `src/views/HomeView.tsx` | **Modificat** | 405 | Actualizare badge `Activ (3B)` și notă metodologică de status în Home |

*Total fișiere modificate: 5 fișiere.*  
*Nicio modificare a altor module existente.*

---

### 10. METODOLOGIA DE TESTARE ȘI REZULTATELE VERIFICĂRILOR (TESTELE 1–8)

S-au rulat riguros toate cele 8 teste obligatorii specificate în instrucțiuni:

| Test Obligatoriu | Procedură Executată | Rezultat Obținut | Statut |
| :--- | :--- | :--- | :--- |
| **Test 1 — Prima sesizare** | Completare formular valid cu categoria „Iluminat public” $\rightarrow$ Trimitere | S-a generat și afișat identificatorul **`TM-001`** | **PASSED** |
| **Test 2 — A doua sesizare** | Completare altă sesizare validă cu categoria „Drumuri / carosabil” $\rightarrow$ Trimitere | S-a generat și afișat identificatorul **`TM-002`** | **PASSED** |
| **Test 3 — Reload** | Reîncărcare completă pagină (F5 / Refresh) $\rightarrow$ Verificare listă sesizări | Identificatorii `TM-001` și `TM-002` rămân identici și persistenți | **PASSED** |
| **Test 4 — Abandon** | Deschidere formular $\rightarrow$ introducere text parțial $\rightarrow$ navigare la Acasă fără submit | Contorul a rămas neschimbat (niciun identificator consumat) | **PASSED** |
| **Test 5 — Formular invalid** | Apăsare submit cu descriere goală sau sub 15 caractere | Validarea a blocat trimiterea; contorul a rămas neschimbat | **PASSED** |
| **Test 6 — Eliminarea unei sesizări** | Ștergere sesizare `TM-002` $\rightarrow$ Trimitere sesizare nouă validă | Sesizarea nouă a primit **`TM-003`** (numărul `TM-002` **nu a fost refolosit**) | **PASSED** |
| **Test 7 — Separarea ID-urilor** | Verificare structură obiect sesizare în consola de test și în listă | `id` este `rep-17272...` (tehnic), iar `referenceNumber` este `TM-003` (civic) | **PASSED** |
| **Test 8 — Non-regresie 3A** | Verificare funcționare: categorii, descriere, contor, foto, GPS/locație, contact opțional | Toate componentele și fluxul din 3A funcționează fără alterări | **PASSED** |

---

### 11. TESTELE DE NON-REGRESIE (ETAPA 3A ȘI MODULELE ANTERIOARE)

S-au verificat toate modulele platformei:
* **Formularul de Sesizare (3A)**: Selectarea categoriilor, încărcarea fotografiilor, introducerea locației manuale sau preluarea GPS funcționează perfect;
* **Comunicate & Evenimente (1B/1C)**: Răsfoirea știrilor locale, filtrelor pe categorii și calendarului de evenimente funcționează neschimbat;
* **Ghidul Primăriei (2A)**: Datele instituționale, audiențele, direcțiile și ghidul serviciilor sunt intacte;
* **Quick Dial (2B)**: Apelarea 1-Click (`tel:`) și categoriile de numere utile funcționează perfect;
* **Panoul de Administrare CMS (2C)**: Editarea datelor din Ghid și Quick Dial funcționează persistent;
* **Navigație mobilă / desktop**: Rutele hash `#sesizari`, `#ghid`, `#comunicate`, `#admin` funcționează fluid.

---

### 12. REZULTATELE VERIFICĂRII BUILD ȘI TYPESCRIPT

* **Validare Statică TypeScript (`lint_applet`)**:
  * Comandă: `tsc --noEmit`
  * Rezultat: `Linting completed successfully`
  * Erori: **0**
* **Compilare Vite (`compile_applet`)**:
  * Comandă: `npm run build`
  * Rezultat: `Build succeeded - the applet is compiled`
  * Erori: **0**

---

### 13. LIMITĂRI TEHNOLOGICE ASUMATE PENTRU PROTOTIP

* **Persistența locală**: În faza actuală de prototip, contorul și sesizările sunt stocate în `localStorage`-ul instanței curente de browser. Această implementare demonstrează funcționalitatea fluxului și separarea arhitecturală completă înainte de conectarea la un backend centralizat cu bază de date (Etapa 5).
* **Izolarea serviciului**: Toată logica de numerotare fiind concentrată în `reportService.ts`, migrarea ulterioară la un API REST/GraphQL de generare server-side se va face prin simpla rescriere a metodei din serviciu, fără a afecta componentele vizuale.

---

### 14. CONFIRMAREA EXPLICITĂ CĂ ETAPELE 3C, 3D ȘI 3E NU AU FOST ÎNCEPUTE

În deplină concordanță cu regula fundamentală de delimitare:
1. **Etapa 3C — Compresia fotografiilor**: **NU a fost începută**. Nu s-a inclus redimensionare canvas, algoritmi de compresie WebP/JPEG sau conversie de formate;
2. **Etapa 3D — Harta sesizărilor**: **NU a fost începută**. Nu s-a instalat Leaflet, Google Maps sau Mapbox, nu s-au desenat markeri și nu s-au afișat sesizările pe hartă;
3. **Etapa 3E — Moderarea sesizărilor**: **NU a fost începută**. Nu există statusuri administrative (`approved`, `published`, `rejected`), nici interfață de moderare în panoul Admin;
4. **Transmiterea către Primărie**: **NU a fost începută**. Nu s-au implementat expedieri automate prin e-mail/SMTP sau integrări de sistem cu Primăria.

---

### 15. CONCLUZIE ȘI CONFIRMARE FERMĂ DE OPRIRE

* **Etapa 3B — Identificator Intern și Persistența Sesizării este COMPLETĂ, TESTATĂ și STRICT DELIMITATĂ.**
* Fluxul funcțional atins:  
  **Cetățean completează sesizarea $\rightarrow$ formular validat $\rightarrow$ sesizarea este salvată $\rightarrow$ platforma alocă determinist `TM-XXX` $\rightarrow$ identificatorul este asociat permanent $\rightarrow$ cetățeanul îl vede în confirmare și îl poate copia cu 1-click.**
* **Execuția este complet oprită.** Așteptăm auditul și aprobarea dumneavoastră oficială înainte de începerea Etapei 3C.

---
*Document extern redactat pentru uzul exclusiv al echipei de dezvoltare și audit tehnic.*
