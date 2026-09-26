# RAPORT AUDIT ETAPA 6 — TESTARE ȘI CONSOLIDARE MVP (6A–6E)

**Proiect:** Turnu Măgurele Civic
**Data:** 26 septembrie 2026
**Tip:** audit de testare. Codul aplicației **nu a fost modificat**: nicio remediere, nicio refactorizare, niciun commit, niciun push.

**Baza testată**

| Element | Valoare |
|---|---|
| Repository | `sergiuiordan2000-ctrl/Platforma-interactiva`, copie de lucru `/home/claude/turnu-recovery` |
| Branch | `recovery-etapa-5-0e2cc20` |
| HEAD | `fff9507062ee7a9be7a2bee21118d8ae522ce193` (lanț `fff9507` → `2198ebe` → `0e2cc20` → `672bbea`) |
| `main` | neatins, `d9bc2c9f53cec27dafc846889b0457eea8495d20` |
| Working tree la start | curat |

**Metodă**
- **Build de producție** (`npm run build`), servit local cu `vite preview`.
- **Teste automate în browser real** (Playwright + Chromium). Fiecare scenariu rulează într-un context de browser nou, cu `localStorage` gol, deci teste izolate.
- **Analiză de cod** pentru tot ce nu se poate observa din browser.
- **Scripturile de test sunt în afara repository-ului**, în directorul temporar al sesiunii. Nu au fost adăugate în proiect.

**Rezultat global: 85 de verificări automate — 70 PASS, 12 FAIL, 3 PARTIAL.** La acestea se adaugă verificările responsive (6B), performanța (6E) și constatările din analiza de cod.

> **Notă de onestitate asupra procesului.** În prima rulare au apărut FAIL-uri cauzate de **scriptul meu de test**, nu de aplicație: selectori greșiți, câmpul opțiunii de sondaj se numește `text`, stadiul de soluționare se schimbă prin butoane, nu prin `<select>`, iar numele imaginii comprimate e `*_opt.webp`. Le-am investigat pe fiecare, am corectat scriptul și am rerulat. În acest raport apar **doar defecte confirmate ale aplicației**.

> **Context arhitectural obligatoriu pentru interpretarea severităților.** Aplicația este 100% client-side: toate datele stau în `localStorage` în browserul fiecărui utilizator și nu există server sau bază de date comună. Consecința practică: astăzi, un atac (ștergere, XSS, sesiune falsificată) afectează **doar datele din browserul în care se execută** (de exemplu un calculator partajat la ghișeu sau un chioșc). **În momentul în care datele devin comune (backend), aceleași defecte devin direct exploatabile de la distanță.** Pentru fiecare problemă indic ambele impacturi.

---

## 1. 6A — TESTARE FUNCȚIONALĂ

**Rezultat: 54 PASS, 1 PARTIAL, 0 FAIL.** Toate fluxurile funcționale principale merg corect.

| Modul | Funcționalități verificate | Status |
|---|---|---|
| **Navigație** | 6 rute publice, rută necunoscută → Acasă (fără ecran alb), butonul Back din browser, 0 erori JS | **PASS** |
| **Acasă** | titlu, ultimul comunicat publicat | **PASS** |
| **Comunicate (public)** | listare (7 demo), filtrare pe categorie (Evenimente = 3), deschidere detaliu | **PASS** |
| **Comunicate (Admin)** | validare formular gol (câmpuri obligatorii), creare → persistat cu `published` → vizibil public după reîncărcare | **PASS** |
| **Sesizări — depunere** | GPS la cerere, confirmare cu `TM-004`, persistență după reîncărcare (pending, preferință publică, coordonate), contor persistat, numerotare secvențială `TM-005` | **PASS** |
| **Sesizări — validări** | formular gol → 3 erori (categorie, descriere, locație), fără creare; descriere < 15 caractere, > 1000 caractere, sau din spații respinsă; telefon < 7 cifre respins; e-mail invalid blocat (de validarea nativă a browserului) | **PASS** |
| **Hartă** | doar sesizările publice + aprobate + cu GPS (2 din seed); `TM-003` (privată) absentă; popup-urile nu conțin date de contact; filtru pe categorie | **PASS** |
| **Moderare** | sesizarea în așteptare nu apare pe hartă; operatorul aprobă → apare pe hartă; o sesizare **privată** aprobată tot **nu** apare; stadiu soluționare „În lucru” persistat; răspuns administrativ adăugat în istoric; **0 butoane de ștergere în panoul de moderare** | **PASS** |
| **Moderare — „preluare/asumare”** | nu există conceptul de responsabil desemnat pentru o sesizare; există doar stadiul „În lucru” | **PARTIAL** (cerință de produs neacoperită complet) |
| **Sondaje** | listă eligibile, vot fără răspunsuri → validare fără înregistrare, vot valid (single + multiple + text liber) → submisie + marker local, re-votare blocată pe același browser, submisia nu conține date de identificare, modal rezultate | **PASS** |
| **Ghidul Primăriei** | 4 sub-tab-uri fără erori, Quick Dial cu 22 de linkuri `tel:`, persistență date, formular editabil pentru `super_admin` | **PASS** |
| **Roluri** | operatorul: fără „Sondaj Nou”, Date Instituționale în `fieldset` dezactivat | **PASS** |
| **Autentificare** | logout curăță ambele storage-uri; parolă greșită → mesaj, fără sesiune; e-mail cu spații/majuscule normalizat | **PASS** |
| **E-mail (simulat)** | notificare registratură generată cu status `simulated`, niciodată `sent` | **PASS** |

**Interacțiunea cu servicii/backend:** nu există backend. Toate modulele scriu și citesc corect prin serviciile singleton din `src/services/`. Singura rețea reală folosită sunt tile-urile OpenStreetMap (și imaginile Unsplash din comunicatele demo).

---

## 2. 6B — TESTARE RESPONSIVE

**Viewport-uri testate:** telefon 360×740, telefon 390×844, tabletă 768×1024, tabletă landscape 1024×768, desktop 1440×900.

**Ecrane testate (18 pe viewport):** 7 rute publice, detaliu comunicat, Evidență Locală, modal vot, modal rezultate, Dashboard Admin, 5 tab-uri Admin și modalul „Sondaj Nou”.

**Rezultat măsurat pe toate cele 90 de combinații:**

| Criteriu | Rezultat |
|---|---|
| Overflow orizontal al paginii | **0** |
| Elemente ieșite din ecran (în afara zonelor cu derulare intenționată) | **0** |
| Text tăiat (fără ellipsis sau limitare intenționată) | **0** |
| Modal vot pe telefon: butonul „Trimite Răspunsurile” poate fi atins | **Da**, pe toate viewport-urile |
| Bara de navigare fixă de jos acoperă conținut la final de pagină | **Nu**. Verificat vizual: footer-ul are spațiu liber sub bară. |
| Hartă | se adaptează la lățime (324 → 1020 px), înălțime fixă 400 px |

**Probleme reale (toate minore):**
1. **Bannerul „Tile-urile OpenStreetMap nu au putut fi încărcate” acoperă butoanele de zoom (+/−)** ale hărții. Vizibil pe telefon, captura `telefon-360_harta`. Fișier: `src/views/MapView.tsx` (bannerul de la liniile ~343–350).
2. **Ținte tactile sub 44 px:** pastilele de filtrare (28–30 px), tab-urile Formular/Evidență (28 px), linkurile din footer (16 px) și săgețile de reordonare din Admin Quick Dial (91 de elemente sub 32 px în acel ecran). Utilizabile, dar sub recomandarea de accesibilitate de 44 px.
3. **Admin pe telefon:** tab-urile principale se înghesuie pe 3–4 rânduri („B. Numere Utile / Quick Dial”), iar sub-tab-urile sunt parțial ascunse într-o zonă cu derulare orizontală fără indiciu vizual. Toast-ul „V-ați autentificat cu succes” rămâne peste conținut până la închidere.
4. **Etichete tehnice de etapă vizibile public**, de exemplu în footer: „Versiune: **Etapa 1A (Scheletul Aplicației)**”, „DEMO • ETAPA 1B”, „Modul Funcțional • Etapa 1C”, „(Etapa 3E)”, „ETAPA 2C”. Sunt învechite și nu au rol pentru cetățean. Fișiere: `Footer.tsx:28`, `AnnouncementDetail.tsx:63`, `AnnouncementsView.tsx:103`, `HomeView.tsx:210/222/400`, componentele Admin.

**Diferențe normale de layout (nu sunt probleme):** meniul de sus devine bară de navigare jos pe telefon; grilele trec de la 4 la 2 coloane; filtrele de categorie de pe hartă devin o bandă cu derulare orizontală, intenționat.

**Limitare a testului:** emulare Chromium. Nu am testat pe dispozitive fizice și nici în Safari iOS. În sandbox, tile-urile hărții și imaginile Unsplash nu se încarcă, deci aspectul hărții cu fundal real e **NEVERIFICAT**.

---

## 3. 6C — TESTARE ERORI

**Rezultat: 13 PASS, 4 FAIL, 1 PARTIAL.**

| Caz | Ce se întâmplă | Gestionare elegantă | Feedback utilizator | Risc stare inconsistentă | Status |
|---|---|---|---|---|---|
| Formulare invalide / câmpuri obligatorii | mesaje pe câmp, fără salvare (Sesizări, Comunicate, Sondaje, Ghid) | Da | Da | Nu | **PASS** |
| Date invalide (e-mail, telefon, URL, lungimi) | respinse; e-mailul prin validarea nativă a browserului | Da | Da (e-mail: tooltip-ul browserului, nu mesajul propriu) | Nu | **PASS** |
| Fișier „.jpg” care nu e imagine | mesaj clar, formular utilizabil | Da | Da | Nu | **PASS** |
| Imagine > 15 MB | respinsă: „depășește limita maximă de 15 MB (are 16.0 MB)” | Da | Da | Nu | **PASS** |
| 6 imagini selectate | limitate la 4 | Da | Da | Nu | **PASS** |
| GPS refuzat | „Accesul la locația GPS a fost refuzat. Vă rugăm să introduceți adresa manual.” | Da | Da | Nu | **PASS** |
| Lipsă internet (după încărcare) | markerii rămân; mesaj dedicat de tile-uri; sesizarea se salvează local; 0 erori JS | Da | Da | Nu | **PASS** |
| E-mail nereușit (`registryEmail` lipsă) | sesizarea se salvează; intrare `failed` în jurnal | Da | **Nu**: eșecul e vizibil doar în jurnalul din `localStorage`, nu în vreo interfață | Nu | **PARTIAL** |
| JSON corupt în toate cheile | toate cele 7 pagini randează (serviciile revin la datele demo) | Da | — | Nu | **PASS** |
| JSON valid, dar formă greșită în `turnu_civic_surveys_store` (`{"x":1}` sau `null`) | **ecran complet alb pe `#sondaje`**: `this.getAllSurveys(...).filter is not a function` | **Nu** | **Nu** | **Da**: pagina rămâne inutilizabilă pentru acel browser până la ștergerea manuală a datelor | **FAIL** |
| **Depășirea cotei `localStorage` (~5 MB)** | cetățeanul primește confirmarea cu număr TM, dar **sesizarea nu e salvată** și **dispare la reîncărcare**; eroarea apare doar în consolă | **Nu** | **Nu**: i se afișează o confirmare falsă | **Da**: numărul TM e consumat (contorul s-a salvat), sesizarea nu există | **FAIL** (3 verificări) |
| Acces neautorizat | vezi 6D | — | — | — | vezi 6D |
| Servicii indisponibile / API invalid | **nu se aplică**: nu există API sau backend. Echivalentul testat: date corupte (mai sus) și rețea absentă. | — | — | — | N/A |

**Detaliu măsurat, depășirea cotei:**
- O fotografie realistă de 12 MP (~3,3 MB) devine după compresie ~260 KB. Ca `dataURL` în `localStorage` ocupă **~345 KB**.
- **Cu 4 fotografii pe sesizare, se păstrează doar 3 sesizări.** A 4-a și următoarele au fost confirmate cetățeanului și **toate pierdute** (`TM-007` … `TM-011`).
- Cu 1 fotografie pe sesizare, 8 din 8 au fost păstrate. Capacitatea estimată e ~14 sesizări.
- Mecanism: `reportService.saveReports()` prinde `QuotaExceededError` cu `console.warn`, iar `submitReport()` returnează sesizarea ca și cum ar fi fost salvată.
- **Consecință logică, netestată separat:** odată cota plină, eșuează în același mod și orice altă scriere (comunicate, sondaje, Ghid), pentru că toate folosesc aceeași cotă.

**Cauze și fișiere**

| Problemă | Fișier | Funcție / linii |
|---|---|---|
| Cota plină, eșec tăcut | `src/services/reportService.ts` | `saveReports()` (liniile 175–182) și `submitReport()` (liniile 242–284) |
| Ecran alb la date de formă greșită | `src/services/surveyService.ts` | `getAllSurveys()` (liniile 69–80): `JSON.parse` fără verificare `Array.isArray` |
| Lipsa „error boundary” | `src/` | 0 fișiere cu `ErrorBoundary`/`componentDidCatch`: orice excepție la randare produce ecran alb |

---

## 4. 6D — TESTARE SECURITATE DE BAZĂ

**Rezultat: 3 PASS, 8 FAIL, 1 PARTIAL**, plus constatările din analiza de cod.

### 4.1 Cerința de produs „PRIMĂRIA NU poate ȘTERGE sesizările”

| Verificare | Rezultat |
|---|---|
| Buton sau handler de ștergere în panoul de moderare (operator și `super_admin`) | **Nu există.** 0 butoane; handlerele sunt doar `handleUpdateStatus`, `handleChangeResolutionStatus`, `handleAddResponse`. **Respectat în Admin.** |
| Metodă de ștergere în serviciu | **Există:** `reportService.deleteReport(id)` (`reportService.ts:312–320`), **fără nicio verificare** de autentificare sau rol. |
| Cale de apel | **Pagina publică** `#sesizari` → tab „Evidență Locală” → buton „Șterge (Test 6)” (`IssuesView.tsx:56–61`, `196–201`), accesibilă fără autentificare. **Confirmat empiric:** 3 sesizări → 2 după un clic. |
| Concluzie | **Cerința NU este respectată în aplicație ca întreg.** Oricine folosește browserul (inclusiv personalul Primăriei, pe un calculator comun) poate șterge sesizări din zona publică, ocolind complet panoul Admin. |

### 4.2 Constatări de securitate

| # | Severitate | Problemă | Fișier / funcție | Dovadă | Impact azi (local) | Impact cu backend | Recomandare |
|---|---|---|---|---|---|---|---|
| S1 | **CRITIC** | Ștergere fizică publică, neautentificată, a sesizărilor | `IssuesView.tsx` `handleDeleteTestReport`; `reportService.deleteReport` | 6D-DEL-01/02 FAIL | ștergere din browserul respectiv (calculator partajat, chioșc) | ștergerea oricărei sesizări de către oricine | eliminarea tab-ului de test și a butonului; fără ștergere fizică expusă; eventual arhivare doar pentru `super_admin`, pe server |
| S2 | **CRITIC** | **XSS stocat în popup-ul hărții.** Descrierea și adresa cetățeanului sunt inserate neescapate în HTML-ul Leaflet (`bindPopup` cu template string). | `src/views/MapView.tsx` (liniile ~181–230) | 6D-XSS-01 FAIL: `<img src=x onerror=...>` **s-a executat** după aprobarea de către operator. Panoul Admin (React) escapează corect (6D-XSS-00 PASS). | cod executat în browserul care vede harta (inclusiv cu sesiunea Admin deschisă) | cod executat la **toți** vizitatorii hărții | escapare HTML a tuturor câmpurilor sau construirea popup-ului prin DOM (`textContent`) |
| S3 | **CRITIC** (pentru publicare) | **Credențialele `super_admin` sunt afișate public** pe pagina de login și există buton **„Autentificare rapidă DEMO (1-Click)” care loghează ca `super_admin`** | `src/components/admin/AdminLoginForm.tsx` (liniile 49–52, 135–147) | 6D-CRD-01/02 FAIL | orice vizitator obține interfața de administrare completă | la fel, pe date reale | eliminarea butonului și a textului de credențiale înainte de orice publicare |
| S4 | **MAJOR** | **Sesiunea Admin se poate falsifica:** un obiect JSON cu `role:"super_admin"` pus în `localStorage` dă acces complet, **fără parolă** | `src/services/authService.ts` `init()` | 6D-SES-01 FAIL | escaladare trivială în browser | irelevant dacă autentificarea se mută pe server, **critic** dacă se păstrează modelul actual | autentificare și sesiune pe server (token semnat, verificat de server) |
| S5 | **MAJOR** | Credențiale hardcodate în bundle-ul livrat | `authService.ts` → `dist/assets/*.js` | `AdminTurnu2026` apare de 4 ori în bundle, `OperatorTurnu2026` o dată, `demo1234` o dată | parolele se pot citi din sursa paginii | la fel | autentificare pe server; nicio parolă în frontend |
| S6 | **MAJOR** | **Pagina publică „Evidență Locală” listează toate sesizările**, inclusiv **private și nemoderate** (descriere + adresă), plus ID-ul tehnic intern | `src/views/IssuesView.tsx` (liniile 120–205) | 6D-PRV-01/02 FAIL: `TM-003` (privată, în așteptare) afișată public | pe dispozitiv partajat, un cetățean vede sesizările private ale altuia | expunere publică a sesizărilor private | eliminarea tab-ului; datele interne doar în Admin |
| S7 | **MAJOR** (arhitectural) | **Protecția e doar în interfață.** Niciun serviciu nu verifică autorizarea (0 referințe la `authService`/`permissionService` în `src/services/*` în afara lor înseși). Toate mutațiile (`delete*`, `update*`, `resetToDemo`) pot fi apelate de oricine ajunge la cod. | toate `src/services/*.ts` | analiză de cod | limitare documentată a MVP-ului | **critic**: fără verificare pe server | autorizare pe server pentru fiecare operație |
| S8 | **MINOR** (latent) | `AdminReportsModeration` și `AdminAnnouncementsManager` **nu verifică permisiunea per acțiune** (`reports.moderate/resolve/reply`, `announcements.*`), doar accesul la tab. Azi nu e exploatabil, pentru că ambele roluri au aceste permisiuni. | cele două componente (0 referințe la `permissionService`) | analiză de cod | niciunul azi | apare la prima restrângere de rol | același tipar ca în 5D: guard în handler + UI |
| S9 | **MINOR** | Sesiunea nu expiră: persistă în `localStorage` și după închiderea browserului, iar `lastLogin` nu e verificat | `authService.ts` | 6D-SES-03 PARTIAL | sesiune rămasă deschisă pe calculator comun | la fel | expirare, doar `sessionStorage` sau token cu durată limitată |
| S10 | **MINOR** | Jurnalul de e-mail salvează local datele de contact ale cetățeanului și detaliile sesizării | `emailService.ts` → `turnu_civic_email_log_store` | analiză de cod | vizibile oricui folosește același browser | pe server, cu acces controlat | jurnal doar pe server |

**Ce este corect (PASS):** rolul necunoscut în sesiune → niciun modul accesibil (fail-safe); contorul TM nu scade la ștergere; React escapează conținutul în Admin; popup-urile hărții nu conțin date de contact; submisiile la sondaje nu conțin date de identificare; nu există chei API sau secrete reale în cod (`GEMINI_API_KEY` doar ca nume în `.env.example`, nefolosit).

---

## 5. 6E — TESTARE PERFORMANȚĂ

**Bundle (build de producție):**

| Fișier | Brut | gzip -9 |
|---|---|---|
| `index-8m8ofEnh.js` (bundle unic, fără code-splitting) | 754,5 KB | 188,8 KB |
| `index-D6Yp1-Vc.css` | 96,5 KB | 18,8 KB |
| **Transfer total măsurat la prima vizită** | | **211 KB** |

**Compoziția bundle-ului JS** (atribuire prin sourcemap, build separat în afara repository-ului):

| Sursă | KB | % |
|---|---|---|
| `src/components` (inclusiv toată zona Admin) | 254,0 | 33,8 |
| `react-dom` | 202,5 | 26,9 |
| `leaflet` | 145,3 | 19,3 |
| `src/views` | 53,3 | 7,1 |
| `src/services` | 35,1 | 4,7 |
| `src/data` (date demo) | 23,1 | 3,1 |
| `lucide-react` (tree-shaken corect) | 17,7 | 2,4 |

`motion`, `@google/genai`, `express`, `dotenv` **nu ajung în bundle**, pentru că nu sunt importate. Sunt dependențe moarte în `package.json`.

**Încărcare, pagina Acasă** (mediana a 3 rulări, cache dezactivat):

| Scenariu | FCP / LCP | DOMContentLoaded | Long tasks | Heap JS |
|---|---|---|---|---|
| Desktop, fără limitare | 228 ms | 113 ms | 0 | 9,5 MB |
| Mobil emulat: Slow 4G (1,6 Mbps, 150 ms) + CPU 4× mai lent | 1864 ms | 1575 ms | 3 (470 ms total) | 9,5 MB |

**Alte măsurători:**

| Măsurătoare | Rezultat |
|---|---|
| Navigare SPA între rute | 70–171 ms |
| Inițializare hartă până la markeri | 43 ms |
| Compresie 4 fotografii de 12 MP (desktop) | 1,99 s |
| Compresie 4 fotografii de 12 MP (CPU mobil 4×) | 7,07 s (cu indicator de progres vizibil) |
| Scrieri `localStorage` la prima vizită | 7 (28 KB, seed-ul demo) |
| Scrieri `localStorage` la a doua vizită | 0 |
| Scrieri `localStorage` la navigare între rute | 0 |
| Scrieri `localStorage` la tastarea a 50 de caractere | 0, deci nu există scrieri inutile la fiecare tastă |
| Abonamente la servicii (`subscribe`) | toate 5 returnează funcție de dezabonare; nu există scurgeri de memorie și nici `setInterval` |

**Observații de performanță:**
1. **Bundle unic:** cetățeanul descarcă și toată zona Admin (o mare parte din cei 254 KB de componente) și Leaflet (145 KB) chiar dacă nu deschide harta. Vite avertizează la fiecare build (chunk > 500 KB). Impactul real e moderat (~189 KB gzip) și e cel mai vizibil pe conexiuni lente.
2. **Fotografiile ca `dataURL` în `localStorage`** reprezintă și problema de performanță, și cauza pierderii de date (6C). Fiecare citire sau scriere a sesizărilor serializează tot JSON-ul, inclusiv toate imaginile.
3. **Imagini Unsplash în comunicatele demo** (6 linkuri externe): dependență de terți la încărcare, transmit adresa IP a vizitatorului către un terț și ridică întrebări de licențiere. Nu au putut fi măsurate în sandbox.
4. **Fără service worker:** fără internet, aplicația nu se poate deschide deloc. După încărcare, funcționează offline (6C).

**Concluzie 6E:** performanță **bună** pentru un MVP. Nu există randări repetate evidente, scrieri inutile sau operații blocante, cu excepția compresiei foto, care e normală și are feedback vizual. Singura problemă de performanță cu impact funcțional e stocarea fotografiilor în `localStorage`.

---

## 6. PROBLEME CRITICE

| # | Problemă | Secțiune | Blochează |
|---|---|---|---|
| C1 | **Pierdere tăcută a sesizărilor la depășirea cotei `localStorage`**, cu confirmare falsă către cetățean (de la a 4-a sesizare cu 4 fotografii) | 6C | orice pilot cu cetățeni reali |
| C2 | **Ștergere publică, neautentificată, a sesizărilor** (încalcă cerința „Primăria NU poate șterge”) | 6D S1 | orice pilot |
| C3 | **XSS stocat în popup-ul hărții** | 6D S2 | orice date partajate / pilot |
| C4 | **Login public 1-click ca `super_admin` + credențiale afișate** | 6D S3 | orice publicare online |

## 7. PROBLEME MAJORE

| # | Problemă | Secțiune |
|---|---|---|
| M1 | Sesiune Admin falsificabilă din `localStorage` (fără parolă) | 6D S4 |
| M2 | Credențiale hardcodate în bundle-ul livrat | 6D S5 |
| M3 | Pagina publică „Evidență Locală” expune sesizările private/nemoderate și ID-urile tehnice | 6D S6 |
| M4 | Nicio autorizare la nivel de serviciu; protecția e doar în UI (arhitectural) | 6D S7 |
| M5 | Fără „error boundary” + `getAllSurveys()` fără validare → ecran alb permanent pe `#sondaje` | 6C |
| M6 | **Afirmație publică neadevărată:** footer-ul spune că sesizările „sunt redirecționate pe e-mail către autoritatea locală”, deși e-mailul e simulat. Contrazice și textul formularului, și cardul hărții („aparțin etapelor ulterioare”). Fișier: `src/components/layout/Footer.tsx:39`. | 6A/6B |
| M7 | Cerința „preluare/asumare” a sesizărilor nu e implementată: nu există responsabil desemnat, doar stadiul „În lucru” | 6A |

## 8. PROBLEME MINORE

| # | Problemă | Fișier |
|---|---|---|
| m1 | Eșecul notificării e-mail nu e vizibil în nicio interfață (doar în jurnalul local) | `emailService.ts` |
| m2 | Permisiunile per acțiune lipsesc în `AdminReportsModeration` și `AdminAnnouncementsManager` (latent) | cele două componente |
| m3 | Sesiunea Admin nu expiră | `authService.ts` |
| m4 | Bannerul de eroare al hărții acoperă butoanele de zoom | `MapView.tsx` |
| m5 | Ținte tactile sub 44 px (filtre, tab-uri, footer, reordonare Quick Dial) | mai multe |
| m6 | Tab-urile Admin se înghesuie pe telefon; toast-ul rămâne peste conținut | `AdminView.tsx` |
| m7 | Etichete de etapă învechite vizibile public („Versiune: Etapa 1A” etc.) | `Footer.tsx:28` și altele (vezi 6B) |
| m8 | Culorile categoriilor pe hartă nu corespund ID-urilor reale: `trotuare`, `apa_canal`, `spatii_verzi`, `semnalizare` primesc culoarea implicită (reconfirmat în cod) | `MapView.tsx` `CATEGORY_COLORS` |
| m9 | Sesizarea demo `rep-seed-003` are `categoryId: 'spatii-verzi'` în loc de `spatii_verzi` (reconfirmat) | `reportService.ts:88` |
| m10 | „Public” și „Public anonim” se afișează identic pe hartă (niciuna nu arată numele), deci distincția oferită cetățeanului nu are efect | `reportService.toPublicMapReport` |
| m11 | Mesajul pentru e-mail invalid vine din browser, nu din formular (inconsistent cu celelalte câmpuri) | `ReportForm.tsx` |
| m12 | Butonul „Trimite sesizarea” rămâne activ în timpul compresiei foto; fotografiile în curs de procesare pot fi pierdute (analiză de cod, netestat) | `ReportForm.tsx:827` |
| m13 | Ștergerea unui sondaj și „Reset Demo” nu șterg submisiile asociate (date orfane; analiză de cod) | `surveyService.ts` |
| m14 | Bundle unic de 755 KB (Admin + Leaflet încărcate pentru toți) | build |
| m15 | Dependențe moarte (`express`, `@google/genai`, `dotenv`, `motion`); `npm ci` eșuează fără `--legacy-peer-deps` (conflict `esbuild` 0.25 față de `vite` 8.3.1) | `package.json` |
| m16 | Imagini demo de pe Unsplash (terț, confidențialitate, licență) | `src/data/mockAnnouncements.ts` |
| m17 | Nu există teste automate în repository | — |

## 9. ELEMENTE PASS
Navigație și rutare; Acasă; Comunicate (public + CRUD Admin + validări + persistență); depunerea sesizărilor (GPS, validări, TM secvențial nerefolosit, persistență); regula de publicare pe hartă (public + aprobat + GPS; sesizarea privată nu apare niciodată); confidențialitatea popup-urilor; moderare, soluționare, răspunsuri; **nicio ștergere în panoul Admin**; sondaje (vot, validări, anonimat, anti-revot local, rezultate); Ghid și Quick Dial; diferențierea rolurilor (5D); autentificare și logout; e-mail simulat, niciodată `sent`; gestionarea imaginilor invalide sau prea mari; GPS refuzat; funcționare offline după încărcare; toleranță la JSON corupt; fail-safe pentru rol necunoscut; escaparea React în Admin; **responsive fără overflow sau elemente tăiate pe toate cele 5 viewport-uri**; performanță de încărcare și de navigare.

## 10. ELEMENTE PARTIAL
- 6A-MOD-08: „preluare/asumare” a sesizărilor, acoperită doar prin stadiul „În lucru” (M7).
- 6C-EML-02: eșecul e-mailului e înregistrat, dar nu e afișat (m1).
- 6D-SES-03: sesiune fără expirare (m3).

## 11. ELEMENTE FAIL
- 6C-STO-02: ecran alb pe `#sondaje` (M5).
- 6C-QUO-01 / 02 / 03: pierdere tăcută de date la cotă (C1).
- 6D-SES-01: sesiune falsificabilă (M1).
- 6D-DEL-01 / 02: ștergere publică neautentificată (C2).
- 6D-PRV-01 / 02: expunerea sesizărilor private și a ID-urilor tehnice (M3).
- 6D-XSS-01: XSS în popup-ul hărții (C3).
- 6D-CRD-01 / 02: credențiale publice și login 1-click `super_admin` (C4).

## 12. RECOMANDĂRI PENTRU CONSOLIDAREA MVP
Ordine propusă, **pentru decizia ta**. Nimic nu a fost implementat.

1. **Remedieri blocante, mici și locale** (C2, C3, C4, M3, M6), probabil într-o singură sub-etapă:
   - eliminarea tab-ului „Evidență Locală” și a butonului de ștergere din zona publică;
   - escaparea HTML în popup-ul hărții;
   - eliminarea autentificării 1-click și a credențialelor afișate;
   - corectarea textului din footer.
2. **Integritatea datelor** (C1, M5):
   - fie verificarea rezultatului salvării, cu mesaj de eroare real pentru cetățean în loc de confirmare falsă, plus limitarea fotografiilor;
   - fie mutarea fotografiilor din `localStorage` (IndexedDB sau server);
   - validarea formei datelor citite (`Array.isArray`) și un `ErrorBoundary` global.
3. **Decizie de produs necesară:** ce înseamnă concret „preluare/asumare” (M7)? Un câmp „responsabil”, un buton „Preia”, un istoric de atribuire?
4. **Decizie de arhitectură**, cea mai importantă pentru etapa următoare: M1, M2, M4, S9 și C1 **nu pot fi rezolvate complet într-o aplicație 100% client-side**. Pentru orice folosire reală (mai mulți cetățeni, Primăria pe alt calculator) e nevoie de backend cu:
   - autentificare pe server;
   - autorizare per operație;
   - bază de date comună;
   - stocare de fișiere;
   - trimitere reală de e-mail.
   Recomand ca această decizie să preceadă checkpoint-ul MVP.
5. **Minore:** după punctele 1–4, grupate într-o etapă de finisare (UI, accesibilitate, etichete, code-splitting, curățarea dependențelor, teste automate persistate în repository).

---

## Anexa A — Verificări rămase NEVERIFICATE
- Aspectul hărții cu tile-uri reale și imaginile Unsplash (blocate de rețeaua sandbox-ului).
- Dispozitive fizice, Safari iOS, Firefox (s-a testat doar Chromium emulat).
- Comportamentul altor servicii după umplerea cotei (dedus din mecanism, netestat separat).
- m12 și m13 (identificate din cod, netestate în browser).

## Anexa B — Lista completă a verificărilor automate (85)

| ID | Zona | Verificare | Rezultat efectiv | Status |
|---|---|---|---|---|
| 6A-HOME-01 | Acasa | Pagina Acasa randeaza titlul si ultimul comunicat | True | **PASS** |
| 6A-NAV-comunicate | Navigatie | Ruta #comunicate randeaza continutul asteptat | True | **PASS** |
| 6A-NAV-sesizari | Navigatie | Ruta #sesizari randeaza continutul asteptat | True | **PASS** |
| 6A-NAV-harta | Navigatie | Ruta #harta randeaza continutul asteptat | True | **PASS** |
| 6A-NAV-sondaje | Navigatie | Ruta #sondaje randeaza continutul asteptat | True | **PASS** |
| 6A-NAV-ghid | Navigatie | Ruta #ghid randeaza continutul asteptat | True | **PASS** |
| 6A-NAV-404 | Navigatie | Ruta necunoscuta -> fallback Acasa (fara ecran alb) | True | **PASS** |
| 6A-NAV-BACK | Navigatie | Butonul Back al browserului functioneaza | http://127.0.0.1:4280/#ruta-inexistenta | **PASS** |
| 6A-HOME-ERR | Acasa | Fara erori JS in consola la navigare | [] | **PASS** |
| 6A-ANN-01 | Comunicate | Lista publica + filtrare pe categorie (Evenimente) | toate=7, evenimente=3 | **PASS** |
| 6A-ANN-02 | Comunicate | Deschidere detaliu comunicat | True | **PASS** |
| 6A-ANN-03 | Comunicate | Validare: formular gol -> mesaje campuri obligatorii | True | **PASS** |
| 6A-ANN-04 | Comunicate | Creare comunicat -> persistat, status published | ['published'] | **PASS** |
| 6A-ANN-05 | Comunicate | Comunicat nou vizibil public dupa reload | True | **PASS** |
| 6A-REP-01 | Sesizari | GPS la cerere (permisiune acordata) -> coordonate afisate | True | **PASS** |
| 6A-REP-02 | Sesizari | Trimitere valida -> ecran confirmare cu identificator TM-XXX | TM-004 | **PASS** |
| 6A-REP-03 | Sesizari | Persistenta dupa reload: TM-004 salvat, pending, preferinta public, GPS | 1 | **PASS** |
| 6A-REP-04 | Sesizari | Contor secvential persistat = 4 | 4 | **PASS** |
| 6A-REP-05 | E-mail | Notificare registratura generata cu status 'simulated' (niciodata 'sent') | [('registry_notification', 'simulated')] | **PASS** |
| 6A-REP-06 | Sesizari | Numerotare secventiala: urmatoarea sesizare = TM-005 | True | **PASS** |
| 6A-REP-ERR | Sesizari | Fara erori JS | [] | **PASS** |
| 6A-VAL-01 | Sesizari | Trimitere formular gol -> 3 erori (categorie, descriere, locatie) | True | **PASS** |
| 6A-VAL-02 | Sesizari | Formular gol NU creeaza sesizare | 3 | **PASS** |
| 6A-VAL-03 | Sesizari | Descriere < 15 caractere respinsa | True | **PASS** |
| 6A-VAL-04a | Sesizari | E-mail invalid -> trimitere blocata (validare nativa HTML5 a browserului) | blocat nativ=True | **PASS** |
| 6A-VAL-04b | Sesizari | Telefon cu < 7 cifre respins cu mesaj propriu | True | **PASS** |
| 6A-VAL-05 | Sesizari | Descriere > 1000 caractere respinsa | True | **PASS** |
| 6A-VAL-06 | Sesizari | Descriere din spatii + 5 caractere respinsa (trim) | True | **PASS** |
| 6A-MAP-01 | Harta | Harta afiseaza doar sesizarile public+aprobate cu GPS (seed: TM-001, TM-002) | 2 | **PASS** |
| 6A-MAP-02 | Harta | TM-003 (private/pending) absent de pe harta | True | **PASS** |
| 6A-MAP-03 | Harta | Popup-urile nu contin date de contact (seed: cetatean@exemplu.ro, 0700000001, 'Cetățean Demo') | True | **PASS** |
| 6A-MAP-04 | Harta | Filtru categorie Iluminat -> 1 marker | 1 | **PASS** |
| 6A-MOD-01 | Moderare | Sesizare noua (pending) NU apare pe harta inainte de aprobare | True | **PASS** |
| 6A-MOD-02 | Moderare | Operator aproba publicarea -> moderationStatus=approved persistat | approved | **PASS** |
| 6A-MOD-03 | Moderare | Dupa aprobare, TM-004 (public_anonymous + GPS) apare pe harta | 3 | **PASS** |
| 6A-MOD-04 | Moderare | TM-003 'private' aprobat de operator tot NU apare pe harta | True | **PASS** |
| 6A-MOD-05 | Moderare | Schimbare stadiu solutionare (in_progress) persistata | True | **PASS** |
| 6A-MOD-06 | Moderare | Raspuns administrativ adaugat si persistat (istoric) | True | **PASS** |
| 6A-MOD-07 | Moderare | Nicio actiune de stergere in panoul de moderare (operator) | True | **PASS** |
| 6A-MOD-08 | Moderare | Exista concept 'preluare/asumare' (responsabil desemnat) pentru sesizare | False — doar stadiul 'in_progress'; fara camp de responsabil/asignare | **PARTIAL** |
| 6A-SRV-01 | Sondaje | Lista sondaje eligibile afisata cu buton Participa | 1 | **PASS** |
| 6A-SRV-02 | Sondaje | Vot fara raspunsuri -> validare, nicio inregistrare | True | **PASS** |
| 6A-SRV-03 | Sondaje | Vot valid -> submisie salvata + marker participare local | subs=1, marker=['srv-demo-001'] | **PASS** |
| 6A-SRV-04 | Sondaje | Dupa vot, sondajul nu mai permite re-votare pe acelasi browser | True | **PASS** |
| 6A-SRV-05 | Sondaje | Submisia nu contine date de identificare a votantului | True | **PASS** |
| 6A-SRV-06 | Sondaje | Modal Rezultate se deschide | True | **PASS** |
| 6A-DIR-01 | Ghid | Toate cele 4 sub-tab-uri ale Ghidului se deschid fara eroare | [] | **PASS** |
| 6A-QD-01 | Quick Dial | Quick Dial afiseaza contacte cu link tel: | 22 | **PASS** |
| 6A-DIR-02 | Ghid Admin | super_admin: formular Date Institutionale editabil | True | **PASS** |
| 6A-DIR-03 | Ghid Admin | Datele Ghidului persistate in localStorage | ['institutionName', 'shortName', 'county', 'address', 'postalCode'] | **PASS** |
| 6A-ROL-01 | Roluri | Operator: fara buton 'Sondaj Nou' | True | **PASS** |
| 6A-ROL-02 | Roluri | Operator: Date Institutionale in fieldset dezactivat | True | **PASS** |
| 6A-AUTH-01 | Autentificare | Logout sterge sesiunea din ambele storage-uri | True | **PASS** |
| 6A-AUTH-02 | Autentificare | Parola gresita -> mesaj eroare, fara sesiune | True | **PASS** |
| 6A-AUTH-03 | Autentificare | E-mail cu spatii/majuscule acceptat (normalizare) | True | **PASS** |
| 6C-STO-01 | Stocare corupta | JSON invalid in toate cheile -> toate paginile randeaza | {'#home': 'ok', '#comunicate': 'ok', '#sesizari': 'ok', '#harta': 'ok', '#sondaje': 'ok', '#ghid': 'ok', '#admin': 'ok'} | **PASS** |
| 6C-STO-02 | Stocare corupta | JSON valid dar forma gresita ({"x":1} in loc de lista) -> paginile randeaza | {'#home': 'ok', '#comunicate': 'ok', '#sesizari': 'ok', '#harta': 'ok', '#sondaje': 'ECRAN ALB', '#ghid': 'ok'} | **FAIL** |
| 6C-QUO-01 | Cota stocare | Fiecare sesizare confirmata cetateanului este si persistata | confirmate=['TM-004', 'TM-005', 'TM-006'], persistate dupa reload=[], PIERDUTE=['TM-004', 'TM-005', 'TM-006'] — localStorage total ~0.03 MB caractere; avertismente consola: ["Eroare la salvarea sesizărilor în storage: QuotaExceededE | **FAIL** |
| 6C-QUO-02 | Cota stocare | Utilizatorul primeste feedback la esecul salvarii | nu (doar console.warn) | **FAIL** |
| 6C-QUO-03 | Cota stocare | Fotografii realiste: toate sesizarile confirmate sunt persistate | [{'foto_per_sesizare': 1, 'kb_base64_per_foto': [346], 'confirmate': 8, 'persistate': 8, 'pierdute': []}, {'foto_per_sesizare': 4, 'kb_ba... | **FAIL** |
| 6C-IMG-01 | Imagini | Fisier .jpg invalid (text) -> mesaj de eroare, formular utilizabil | ['3. Fotografii de la fața locului (Opțional, max 4)', 'Formate acceptate: JPG, PNG, WebP (max 15MB per fișier). Imaginile sunt redimensi... | **PASS** |
| 6C-IMG-02 | Imagini | Fisier > 15 MB -> respins cu mesaj | ['Formate acceptate: JPG, PNG, WebP (max 15MB per fișier). Imaginile sunt redimensionate automat (max 1920px) și comprimate eficient în b... | **PASS** |
| 6C-IMG-03 | Imagini | Selectie 6 imagini -> limitata la 4 | 4 | **PASS** |
| 6C-IMG-04 | Imagini | Trimitere dupa erori foto reuseste | True | **PASS** |
| 6C-GPS-01 | GPS | Permisiune GPS refuzata -> mesaj prietenos, formular utilizabil | ['Folosește locația mea (GPS)', 'Accesul la locația GPS a fost refuzat. Vă rugăm să introduceți adresa manual.'] | **PASS** |
| 6C-NET-01 | Offline | Offline dupa incarcare: harta randeaza markerii (SPA) | markeri=2 | **PASS** |
| 6C-NET-02 | Offline | Offline: mesaj dedicat 'tile-uri neincarcate, verificati conexiunea' | tile-uri incarcate=0, mesaj dedicat afisat=True | **PASS** |
| 6C-NET-03 | Offline | Offline: sesizare trimisa si salvata local (fara backend) | True | **PASS** |
| 6C-NET-04 | Offline | Offline: nicio eroare JS la navigare | ['Failed to load resource: net::ERR_INTERNET_DISCONNECTED', 'Failed to load resource: net::ERR_INTERNET_DISCONNECTED'] | **PASS** |
| 6C-NET-01 | Offline | Offline dupa incarcare: harta randeaza markerii (SPA) | markeri=2 | **PASS** |
| 6C-NET-02 | Offline | Offline: utilizatorul e informat ca fundalul hartii lipseste | tile-uri incarcate=0, mesaj offline=1 | **PASS** |
| 6C-EML-01 | E-mail | registryEmail lipsa -> sesizarea se salveaza, jurnal 'failed' pentru registratura | [('citizen_confirmation', 'simulated'), ('registry_notification', 'failed')] | **PASS** |
| 6C-EML-02 | E-mail | Cetateanul/adminul primeste feedback vizibil despre esecul notificarii | doar in jurnal localStorage | **PARTIAL** |
| 6D-SES-01 | Sesiune | Sesiune falsificata in localStorage (fara parola) NU da acces Admin | acces Admin=True, drepturi super_admin=True | **FAIL** |
| 6D-SES-02 | Sesiune | Rol necunoscut in sesiune -> niciun modul accesibil (fail-safe) | tab-uri vizibile=0 | **PASS** |
| 6D-DEL-01 | Sesizari | Pagina publica NU expune buton de stergere a sesizarilor | 3 | **FAIL** |
| 6D-PRV-01 | Protectia datelor | Pagina publica NU listeaza sesizarile private/nemoderate | TM-003 (private, pending) afisat public | **FAIL** |
| 6D-PRV-02 | Protectia datelor | Pagina publica NU afiseaza ID-uri tehnice interne | ID tehnic afisat | **FAIL** |
| 6D-DEL-02 | Sesizari | Utilizator neautentificat NU poate sterge fizic o sesizare | 2 | **FAIL** |
| 6D-DEL-03 | Sesizari | Contorul TM nu scade dupa stergere | 3 | **PASS** |
| 6D-XSS-00 | XSS | Panoul Admin (React) escapeaza continutul cetateanului | True | **PASS** |
| 6D-XSS-01 | XSS | Popup harta NU executa HTML/JS din descrierea cetateanului | script executat=True, element HTML injectat=0 | **FAIL** |
| 6D-CRD-01 | Autentificare | Pagina de login NU afiseaza public credentialele super_admin | parola super_admin afisata | **FAIL** |
| 6D-CRD-02 | Autentificare | Nu exista autentificare 1-click ca super_admin pentru public | rol obtinut 1-click=super_admin | **FAIL** |
| 6D-SES-03 | Sesiune | Sesiunea expira la inchiderea browserului / are durata limitata | sesiune persistenta, fara expirare (localStorage) | **PARTIAL** |