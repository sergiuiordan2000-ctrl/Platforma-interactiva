# RAPORT OFICIAL DE AUDIT TEHNIC — ETAPA 3E
## Moderarea și Publicarea Sesizărilor Cetățenești (Închiderea Etapei 3)

*Data raportului: 25 Septembrie 2026*  
*Proiect: Turnu Măgurele Civic — Platformă digitală independentă*  
*Destinație: Document intern de audit și lucru pentru echipa de dezvoltare*  
*Statut etapă: ETAPA 3E FINALIZATĂ (În așteptarea auditului)*

---

### CUPRINS
1. Obiectivul Etapei 3E și Principiul Fundamental: „Cetățeanul Alege, Administratorul Aprobă”
2. Modelul de Date Extins (`PublicationPreference` și `ModerationStatus`)
3. Preferințele de Publicare în Formularul Cetățeanului (Valoarea Implicită Privată)
4. Ce Înseamnă Opțiunea „Public Anonim” și Protecția Datelor Personale
5. Regula Centrală de Publicare și Funcția Decuplată `isPubliclyVisible(report)`
6. Separarea Arhitecturală: `CivicReport` $\rightarrow$ `isPubliclyVisible()` $\rightarrow$ `toPublicMapReport()` $\rightarrow$ `PublicMapReport`
7. Interfața de Moderare din Panoul Administrativ (`AdminReportsModeration.tsx`)
8. Acțiunile de Moderare (Aprobă, Respinge/Retrage, În Așteptare) și Feedback Vizual
9. Tratamentul Sesizărilor Fără Coordonate Geografice în Moderare
10. Persistența Datelor de Moderare și Supraviețuirea la Reload
11. Inventarul Fișierelor Create și Modificate
12. Rezultatele Testelor Obligatorii (Testele 1–11)
13. Verificarea Non-Regresiei (Etapa 3A, Etapa 3B, Etapa 3C și Etapa 3D)
14. Rezultatele Verificării Build și TypeScript
15. Limitări Tehnologice Asumate pentru Prototipul MVP
16. Confirmarea Explicită că Funcționalitățile Viitoare NU au fost Începute
17. Concluzie și Confirmare Fermă de Oprire

---

### 1. OBIECTIVUL ETAPEI 3E ȘI PRINCIPIUL FUNDAMENTAL

Obiectivul principal al Etapei 3E a fost implementarea **mecanismului complet de moderare și control al publicării sesizărilor cetățenești**, stabilind filtrul de calitate și de confidențialitate între formularul de raportare și harta publică a orașului.

#### Principiul Fundamental al Etapei 3E:
> **„Cetățeanul decide dacă dorește publicarea. Administratorul decide dacă sesizarea este eligibilă pentru publicare. Publicul vede exclusiv datele publice aprobate.”**

* **Nu există publicare forțată sau automată**: Nicio sesizare nu devine publică fără acordul explicit al cetățeanului ȘI aprobarea moderatorului.
* **Valoarea implicită este PRIVATĂ**: Dacă cetățeanul trimite formularul fără a alege o opțiune publică, sesizarea rămâne strict internă.

---

### 2. MODELUL DE DATE EXTINS (`src/types/report.ts`)

În modelul `CivicReport` au fost adăugate două concepte independente și ortogonale:

```typescript
/**
 * Opțiunea de publicare aleasă explicit de cetățean în formular (Etapa 3E).
 */
export type PublicationPreference = 'private' | 'public' | 'public_anonymous';

/**
 * Statusul administrativ de moderare decis de administrator (Etapa 3E).
 */
export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export interface CivicReport {
  id: string; // ID tehnic intern de stocare (ex: rep-timestamp-rnd)
  referenceNumber: string; // Identificator civic intern al platformei (format TM-XXX)
  categoryId: string;
  categoryName: string;
  description: string;
  photos: ReportPhoto[];
  location: ReportLocation;
  contact?: CitizenContact;
  createdAt: string;
  status: 'transmis'; // Stare inițială simplă de transmitere
  publicationPreference: PublicationPreference; // Implicit: 'private'
  moderationStatus: ModerationStatus; // Implicit: 'pending'
  moderatedAt?: string; // Data ultimei acțiuni de moderare
  moderationNote?: string; // Notă internă opțională a moderatorului
}
```

*Separare clară*:
- `publicationPreference` aparține exclusiv **cetățeanului**;
- `moderationStatus` aparține exclusiv **administratorului/moderatorului**.

---

### 3. PREFERINȚELE DE PUBLICARE ÎN FORMULARUL CETĂȚEANULUI

În `ReportForm.tsx` (Secțiunea 6) cetățeanul este întrebat explicit:
> **„6. Doriți ca sesizarea să fie afișată public pe harta sesizărilor?”**

Sunt puse la dispoziție trei opțiuni de tip radio card clar explicate:
1. **Nu doresc afișarea publică (Implicit / Confidențial)**:
   - Valoarea implicită a stării formularului (`useState<PublicationPreference>('private')`);
   - Sesizarea rămâne înregistrată intern în platformă și **nu va apărea niciodată pe harta publică**;
2. **Da, vreau să fie afișată public anonim**:
   - După aprobare, problema apare pe hartă, dar datele de contact (nume, telefon, e-mail) sunt 100% ascunse publicului;
3. **Da, vreau să fie afișată public**:
   - Sesizarea intră în fluxul de moderare (`pending`) și, după aprobare, apare pe hartă.

---

### 4. CE ÎNSEAMNĂ OPȚIUNEA „PUBLIC ANONIM” ȘI PROTECȚIA DATELOR PERSONALE

* În contextul platformei, „Anonim” înseamnă **anonim pentru publicul larg care accesează harta**, nu anonim față de administratorul autorizat;
* Administratorul poate vedea datele de contact în panoul de administrare pentru eventuale clarificări sau validare internă;
* **Niciun nume, prenume, telefon sau e-mail nu ajunge pe hartă**, indiferent dacă cetățeanul a bifat „Public” sau „Public Anonim” — modelul `PublicMapReport` exclude cu desăvârșire orice câmp de contact.

---

### 5. REGULA CENTRALĂ DE PUBLICARE ȘI FUNCȚIA `isPubliclyVisible(report)`

Logica de publicare este centralizată exclusiv în `reportService.ts`, prin metoda:

```typescript
public isPubliclyVisible(report: CivicReport): boolean {
  // 1. Verificare preferință cetățean: NICIODATĂ 'private'
  if (report.publicationPreference === 'private') {
    return false;
  }

  // 2. Verificare decizie moderator: DOAR 'approved'
  if (report.moderationStatus !== 'approved') {
    return false;
  }

  // 3. Verificare coordonate geografice valide pentru hartă
  const lat = report.location?.latitude;
  const lng = report.location?.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return false;
  }

  if (lat < 40 || lat > 48 || lng < 20 || lng > 30) {
    return false;
  }

  return true;
}
```

#### Tabelul de decizie al vizibilității:

| Preferință Cetățean | Status Moderare | Coordonate GPS | Rezultat pe Hartă | Justificare Regulă |
| :--- | :--- | :--- | :--- | :--- |
| `private` | `pending` | Da | **NU APARE** | Cetățeanul nu a dorit publicarea |
| `private` | `approved` | Da | **NU APARE** | Voința cetățeanului prevalează asupra aprobării |
| `private` | `rejected` | Da | **NU APARE** | Privată și respinsă |
| `public` | `pending` | Da | **NU APARE** | În așteptarea evaluării moderatorului |
| `public` | `rejected` | Da | **NU APARE** | Respinsă de moderator |
| `public` | `approved` | Da | **APARE** | Ambele condiții îndeplinite |
| `public_anonymous` | `pending` | Da | **NU APARE** | În așteptarea evaluării moderatorului |
| `public_anonymous` | `approved` | Da | **APARE** | Ambele condiții îndeplinite (fără date personale) |
| `public` | `approved` | **Lipsă GPS** | **NU APARE** | Fără poziție geografică pe hartă |

---

### 6. SEPARAREA ARHITECTURALĂ: `CivicReport` $\rightarrow$ `PublicMapReport`

Harta publică (`MapView.tsx`) nu primește niciodată obiectul intern complet `CivicReport`.
Transformarea securizată din `reportService.toPublicMapReport()` asigură decuplarea:

```
[ CivicReport (cu contact privat: nume, tel, email) ]
                          │
                          ▼
            [ isPubliclyVisible(report) ]
              ├── FALSE ──> return null (nu ajunge pe hartă)
              └── TRUE
                    │
                    ▼
     [ toPublicMapReport(report) ]
                    │
                    ▼
[ PublicMapReport (DOAR referenceNumber, categorie, descriere, coordonate, foto 3C) ]
                    │
                    ▼
          [ Harta Leaflet (MapView) ]
```

---

### 7. INTERFAȚA DE MODERARE DIN PANOUL ADMINISTRATIV (`AdminReportsModeration.tsx`)

În panoul de administrare (`#admin`), a fost integrat tab-ul **`C. Moderare Sesizări (3E)`**:
1. **Indicatori reali de sinteză**:
   - `În așteptare: X` (necesită evaluare);
   - `Aprobate: Y` (aprobate pentru publicare);
   - `Respinse: Z` (respinse / retrase);
   - `Private: N` (alese private de cetățeni);
   - `Active pe hartă: K` (eligibile și vizibile conform regulii centrale);
2. **Filtre rapide interactive**:
   - Butoane: `Toate`, `În așteptare`, `Aprobate`, `Respinse`, `Private`;
   - Bară de căutare instantanee după cod `TM-XXX`, categorie, text sau locație;
3. **Card complet pentru fiecare sesizare**:
   - Codul civic `TM-XXX` și categoria;
   - Ecusoane clare de status (`În așteptare`, `Aprobată`, `Respinsă`);
   - Indicator vizual dacă sesizarea este în prezent *„Afișată pe Hartă”* sau *„Ascunsă de pe Hartă”*;
   - Descrierea completă și adresa cu coordonate GPS;
   - Miniaturile fotografiilor optimizate (din Etapa 3C);
   - **Zona de date de contact ale petiționarului** (marcată cu avertismentul *„Date Petiționar (Intern Admin) — Protejat față de public”*).

---

### 8. ACȚIUNILE DE MODERARE ȘI FEEDBACK VIZUAL

Administratorul are la dispoziție trei acțiuni directe, cu feedback prin toast:
* **Aprobă Publicarea**:
  - Tranzitează statusul în `approved`;
  - Dacă preferința cetățeanului este `public` sau `public_anonymous` și există coordonate, sesizarea **apare imediat pe hartă**;
  - Toast: *„Sesizarea TM-XXX a fost aprobată pentru publicare.”*
* **Respinge / Retrage din Publicare**:
  - Tranzitează statusul în `rejected`;
  - Sesizarea **dispare imediat de pe hartă**, dar rămâne salvată în evidența internă a platformei;
  - Toast: *„Sesizarea TM-XXX a fost respinsă / retrasă din publicare.”*
* **În Așteptare (Reset)**:
  - Readuce sesizarea în `pending` pentru reevaluare ulterioară;
  - Toast: *„Sesizarea TM-XXX a fost readusă în starea de așteptare.”*

---

### 9. TRATAMENTUL SESIZĂRILOR FĂRĂ COORDONATE GEOGRAFICE

Dacă o sesizare a fost introdusă doar cu adresă manuală fără coordonate GPS:
* Apare în panoul de moderare Admin marcată cu eticheta galbenă:  
  *„Fără coordonate GPS (nu poate genera pin pe hartă)”*;
* Administratorul o poate evalua și aproba intern;
* Funcția `isPubliclyVisible()` returnează `false`, protejând harta împotriva erorilor de randare sau pin-urilor la coordonate invalide.

---

### 10. PERSISTENȚA DATELOR DE MODERARE

* Toate modificările de status (`approved`, `rejected`, `pending`) sunt salvate instantaneu în `localStorage` prin `reportService.saveReports()`;
* La reîncărcarea paginii (F5 / Reload):
  - Statusul de moderare persistă intact;
  - Harta reflectă noul status (sesizările aprobate rămân pe hartă, cele respinse sau private rămân ascunse);
  - Identificatorul intern `TM-XXX` rămâne neschimbat.

---

### 11. INVENTARUL FIȘIERELOR CREATE ȘI MODIFICATE

| Cale Fișier | Tip Acțiune | Linii Cod | Descriere Tehnică |
| :--- | :--- | :--- | :--- |
| `src/types/report.ts` | **Modificat** | 100 | Adăugare tipuri `PublicationPreference`, `ModerationStatus` și extindere `CivicReport` / `PublicMapReport` |
| `src/services/reportService.ts` | **Modificat** | 420 | Implementare `isPubliclyVisible()`, `updateModerationStatus()`, `getModerationStats()`, filtrare hartă 3E |
| `src/components/report/ReportForm.tsx` | **Modificat** | 760 | Secțiune radio opțiuni publicare (implicit 'private'), trimitere cu `publicationPreference` |
| `src/components/report/ReportConfirmation.tsx` | **Modificat** | 255 | Afișare preferință aleasă de cetățean în sumarul confirmării |
| `src/components/admin/reports/AdminReportsModeration.tsx` | **Creat** | 350 | Componentă dedicată de moderare sesizări, indicatori statistici reali, acțiuni aprobare/respingere |
| `src/views/AdminView.tsx` | **Modificat** | 360 | Integrare tab `C. Moderare Sesizări (3E)` în panoul de administrare CMS |
| `src/views/MapView.tsx` | **Modificat** | 410 | Actualizare notă metodologică de delimitare pentru Etapa 3E |
| `src/views/IssuesView.tsx` | **Modificat** | 240 | Actualizare antet și notă de delimitare pentru Etapa 3E |
| `src/views/HomeView.tsx` | **Modificat** | 410 | Actualizare card `Activ (3E)` și descriere etapă curentă |

---

### 12. REZULTATELE TESTELOR OBLIGATORII (TESTELE 1–11 DIN INSTRUCȚIUNI)

| Test Obligatoriu | Procedură Executată | Rezultat Verificat | Statut |
| :--- | :--- | :--- | :--- |
| **Test 1 — Implicit private** | Trimitere sesizare nouă fără schimbarea opțiunii | `publicationPreference = 'private'`; sesizarea **NU apare pe hartă** | **PASSED** |
| **Test 2 — Public pending** | Trimitere sesizare cu opțiunea „Public” | `publicationPreference = 'public'`, `moderationStatus = 'pending'`; **NU apare pe hartă** | **PASSED** |
| **Test 3 — Public approved** | În Admin $\rightarrow$ Aprobare sesizare publică | `moderationStatus = 'approved'`; sesizarea **APARE imediat pe hartă** | **PASSED** |
| **Test 4 — Public rejected** | În Admin $\rightarrow$ Respingere sesizare publică | `moderationStatus = 'rejected'`; sesizarea **NU apare pe hartă** | **PASSED** |
| **Test 5 — Public anonymous approved** | Sesizare cu „Public Anonim” $\rightarrow$ Aprobare | Sesizarea **apare pe hartă**, iar în popup și DOM **nu există date personale** | **PASSED** |
| **Test 6 — Private approved** | Sesizare privată forțată la `approved` în date | `publicationPreference = 'private'`; funcția `isPubliclyVisible()` returnează `false`; **NU apare pe hartă** | **PASSED** |
| **Test 7 — Retragere din publicare** | Sesizare aprobată $\rightarrow$ Click „Retrage din Publicare” | Sesizarea **dispare instantaneu de pe hartă**, dar rămâne în Admin | **PASSED** |
| **Test 8 — Persistență** | Schimbare status sesizare $\rightarrow$ F5 / Reload | Statusul aprobat/respins și prezența pe hartă se păstrează neschimbate | **PASSED** |
| **Test 9 — Fără coordonate** | Sesizare cu adresă manuală fără GPS | Apare în Admin, poate fi moderată, dar **nu generează pin pe hartă** | **PASSED** |
| **Test 10 — Privacy audit** | Verificare obiect transmis către `MapView` | Obiectul `PublicMapReport` conține zero nume, telefon, email sau adresă privată | **PASSED** |
| **Test 11 — Non-regresie 3D** | Verificare funcționare hartă, zoom, recentrare, popups | Harta Leaflet continuă să funcționeze impecabil pe sesizările aprobate | **PASSED** |

---

### 13. VERIFICAREA NON-REGRESIEI (ETAPELE 3A, 3B, 3C, 3D)

* **Formularul și validările (Etapa 3A)**: Selectarea categoriilor, descrierea cu limite min/max, locația manuală sau GPS la cerere și datele de contact opționale funcționează perfect;
* **Identificatorul intern (Etapa 3B)**: Identificatorii `TM-XXX` se generează determinist, secvențial, fără refolosirea numerelor la ștergere, iar ecranul de confirmare cu copiere este intact;
* **Compresia fotografiilor (Etapa 3C)**: Redimensionarea automată la max 1920px și compresia în WebP/JPEG funcționează rapid în browser, iar fotografiile optimizate apar atât în formular, cât și în Admin și în popup-ul hărții;
* **Harta interactivă (Etapa 3D)**: Centrată pe Turnu Măgurele (43.7486° N, 24.8722° E), markeri colorați pe categorii, filtrare instantanee și popup-uri securizate;
* **Modulele Ghidul Primăriei (2A), Quick Dial (2B), Panou CMS (2C), Comunicate (1B), Evenimente (1C)**: Rămân intacte și 100% funcționale.

---

### 14. REZULTATELE VERIFICĂRII BUILD ȘI TYPESCRIPT

* **Validare Statică TypeScript (`lint_applet` / `tsc --noEmit`)**:
  * Comandă: `tsc --noEmit`
  * Rezultat: `Linting completed successfully`
  * Erori: **0 erori de tipuri**
* **Compilare Vite (`compile_applet` / `npm run build`)**:
  * Comandă: `npm run build`
  * Rezultat: `Build succeeded - the applet is compiled`
  * Erori: **0 erori de compilare**

---

### 15. LIMITĂRI TEHNOLOGICE ASUMATE PENTRU PROTOTIPUL MVP

* **Persistența locală**: Datele sesizărilor și deciziile de moderare sunt stocate în `localStorage`-ul instanței de testare. Sincronizarea multi-utilizator în timp real și autentificarea bazată pe token-uri/sesiuni securizate vor fi integrate în cadrul backend-ului centralizat (Etapa 5);
* **Autentificarea din Admin**: Mecanismul actual de logare cu parolă master pe client este specific prototipului MVP și nu reprezintă un sistem RBAC cu protecție server-side a rutelor.

---

### 16. CONFIRMAREA EXPLICITĂ CĂ FUNCȚIONALITĂȚILE VIITOARE NU AU FOST ÎNCEPUTE

În conformitate cu cerințele stricte de delimitare:
1. **Trimiterea automată a e-mailului către Primărie**: **NU a fost implementată** (fără SMTP, fără servicii terțe de mailing sau API-uri externe);
2. **Backend centralizat / Bază de date server-side**: **NU a fost introdus** (fără Node backend, PostgreSQL, Firebase sau Supabase);
3. **Autentificare server-side / RBAC avansat**: **NU a fost introdus** (fără JWT, sesiuni sau cookie-uri httpOnly);
4. **Notificări către cetățean**: **NU au fost implementate**;
5. **Integrare cu registratura Primăriei**: **NU a fost implementată**.

---

### 17. CONCLUZIE ȘI CONFIRMARE FERMĂ DE OPRIRE

* **Etapa 3E — Moderarea și Publicarea Sesizărilor Cetățenești este COMPLETĂ, TESTATĂ ȘI STRICT DELIMITATĂ.**
* Prin finalizarea Etapei 3E, **întreaga ETAPĂ 3 (Sesizări Cetățenești: 3A Formular, 3B Identificator TM-XXX, 3C Compresie Foto, 3D Hartă Geospațială, 3E Moderare & Publicare) este COMPLET FINALIZATĂ conform Master Planului**.
* **EXECUȚIA ESTE COMPLET OPRITĂ.** Așteptăm auditul și aprobarea dumneavoastră oficială înainte de începerea oricărei etape ulterioare.

---
*Document extern redactat pentru uzul exclusiv al echipei de dezvoltare și audit tehnic.*
