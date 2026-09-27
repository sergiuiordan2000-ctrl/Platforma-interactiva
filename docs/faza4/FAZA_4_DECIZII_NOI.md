# FAZA 4 — DECIZII NOI ȘI CONTRADICȚII

**Proiect:** Turnu Măgurele Civic · **Data:** 27.09.2026
**Revizia 1 (SET-01):** 27.09.2026, după `FAZA_4_INSTRUCTIUNI_CLAUDE_01.md` și clarificările C-1…C-4. Modificările sunt marcate **[SET-01]**.
**Revizia 2 (SET-A-01):** 27.09.2026, după `FAZA_4_DECIZII_8_31_INSTRUCTIUNI_CLAUDE.md` (deciziile D8–D31) și `FAZA_4_DECIZII_A1_A9_INSTRUCTIUNI_CLAUDE.md` (A-1…A-9). Modificările sunt marcate **[SET-A-01]**; textul înlocuit rămâne vizibil (tăiat).
**Revizia 3 (SET-A-02):** 27.09.2026, după `TMC_FAZA_4_INSTRUCTIUNI_CLAUDE_SET_A_02.md` (2.1–2.15 + corecturile 1–13). Marcaj **[SET-A-02]**; rezumatul în §0.4, starea finală a punctelor în §E.

Punctele **nemarcate [SET-01] — APROBAT** rămân **`DECIZIE NOUĂ — NECESITĂ APROBARE`**.

---

## 0. [SET-01] Decizii aprobate și clarificări (27.09.2026)

### 0.1 Deciziile aprobate (`FAZA_4_INSTRUCTIUNI_CLAUDE_01.md`)

| # | Decizie | Esența aprobată | Înlocuiește / modifică |
|---|---|---|---|
| S1-1 | **DN-01** | exact 3 permisiuni noi: `accounts.manage`, `notifications.recipient.manage`, `audit.view`; toate exclusiv `super_admin`; **fără** o a 4-a permisiune pentru anonimizare | închide K-6 (partea de permisiune) |
| S1-2 | **DN-02** | regula 6.6 rămâne: fără istoric al asumărilor individuale; auditul poate păstra operațiile administrative; auditul **nu** se folosește pentru a reconstrui un istoric al asumărilor | închide K-2 |
| S1-3 | **E-3** | închiderea automată pe server la `endDate`: sondajul devine `closed`, voturile noi sunt respinse, rezultatele finale intră în arhiva publică, fără intervenție manuală | — (confirmă o cerință care nu fusese aprobată explicit) |
| S1-4 | **DN-12** | fără funcție de anonimizare și fără a 4-a permisiune. Aplicația cunoaște numai datele necesare, inclusiv e-mailul. Identitatea autorului nu apare public. Cetățeanul decide la depunere dacă sesizarea se transmite Primăriei; dacă da, Primăria primește **numai adresa de e-mail**. | închide K-6; **modifică A17-5 / A17-6** (partea despre contact) |
| S1-5 | **DN-21** | textul locației este **public după moderare** (poate conține strada, numărul, blocul etc.); descrie locul problemei, nu identifică autorul | închide K-3 |
| S1-6 | **DN-09** | stări strict controlate: `nouă` (depusă) → `în analiză` (transmisă Primăriei) → `rezolvată` (numai prin subcontul Primăriei, dacă Primăria participă); fără tranziții arbitrare. Transmiterea prin e-mail **nu depinde** de existența subcontului. | **modifică 5C (setul de stadii), 6.6-g, D9-3** |
| S1-7 | **Pct. 7** | transmiterea către Primărie este **opțională**, la alegerea cetățeanului. Fără cerere: sesizarea rămâne în aplicație, starea rămâne `nouă`, nu se transmite; după moderare poate apărea pe hartă. | **înlocuiește A17-3** (C-4) |

> **[SET-A-01]** S1-5 și S1-7 (partea „după moderare”) sunt înlocuite de A-2 / A-3; C-1 este înlocuit de A-4 (vezi §0.3).

### 0.2 Clarificările proprietarului la setul 01 (27.09.2026, răspunsuri la întrebările lui Claude)

| # | Întrebare | Răspunsul lui Sergiu | Efect în design |
|---|---|---|---|
| **C-1** | „Contul cetățeanului” din DN-12, în condițiile în care nu există conturi de cetățeni (N4-2) | ~~**Fără conturi de cetățeni; numai e-mail.**~~ **[SET-A-01] ÎNLOCUIT de D29–D31 / A-4:** cont de cetățean cu e-mail verificat, necesar **numai** pentru depunerea sesizărilor. Rămâne valabil: numele și telefonul nu se cer; Primăria primește numai e-mailul. | ~~`report_contacts` păstrează numai `email`~~ → **[SET-A-01]** e-mailul stă în `citizen_accounts`; formularul fără nume și telefon |
| **C-2** | Soarta stării `closed` a sesizărilor | **Numai 3 stări.** `closed` dispare; D9-3 notifică numai la „în analiză” și „rezolvată”. | enum cu 3 valori; D9-3 ajustat |
| **C-3** | Regula 6.6-g (asumarea / preluarea unei sesizări `new` o trece în `in_progress`) față de DN-09 | **Asumarea și preluarea nu mai schimbă starea;** 6.6-g se modifică explicit. | asumarea / preluarea nu ating `resolution_status` |
| **C-4** | Punctul 7 față de A17-3 (coadă automată pentru orice sesizare) | **Punctul 7 înlocuiește A17-3.** Coada către Primărie se creează numai la cererea cetățeanului; comutatorul A17-4 și acordul Primăriei (A17-1) rămân valabile. | `registry_notification` numai dacă cetățeanul a cerut transmiterea |

> **Consecință pentru RULES:** S1-4, S1-6, S1-7 și C-1…C-4 **modifică decizii consemnate** în RULES §6 (5C, 6.6-g) și §11 (A17-3, A17-5, A17-6, D9-3). N4-2 („fără cont de cetățean”) rămâne neschimbată. Consemnarea lor în `PROJECT_RULES_AND_DECISIONS.md` se face numai la cererea explicită a proprietarului (nu am modificat repository-ul).


### 0.3 [SET-A-01] Deciziile D8–D31 și A-1…A-9 (aprobate)

**Surse:**
- `FAZA_4_DECIZII_8_31_INSTRUCTIUNI_CLAUDE.md` (problemele 8–31, aprobate);
- `FAZA_4_DECIZII_A1_A9_INSTRUCTIUNI_CLAUDE.md` (A-1…A-9, stabilite de Sergiu cu ChatGPT după analiza lui Claude).

**Rezumatul deciziilor D8–D31:**

| # | Esența aprobată |
|---|---|
| D8 | blocarea ulterioară a unui utilizator care abuzează de sesizări; o politică / un disclaimer de utilizare; blocarea nu este o suspendare generală a contului |
| D9 | **publicare imediată** pe hartă după depunere; fără moderare prealabilă obligatorie; fără identitatea autorului |
| D10–D12 | ștergerea definitivă de către administrator; **numai `super_admin`**, orice sesizare, **necondiționat** (fără motiv, aprobare sau procedură obligatorie) |
| D13–D18 | blocarea **numai de `super_admin`**; temporară sau permanentă (tipul și durata le stabilește `super_admin`); afectează **exclusiv** depunerea de sesizări noi; contul, autentificarea, celelalte funcții, sesizările existente, votul și accesul la conținutul public **rămân neafectate** |
| D19–D22 | autorul își poate șterge **definitiv** propria sesizare, indiferent de stare (inclusiv după transmitere, în `în analiză` sau `rezolvată`), fără aprobarea `super_admin`. Se elimină din hartă și din baza de date, împreună cu datele asociate, conform regulilor de retenție / ștergere. E-mailul deja transmis nu se poate retrage. |
| D23 | la ștergerea de către autor **nu** se trimite nicio notificare Primăriei |
| D24 | o sesizare ștearsă nu mai există în aplicație; Primăria nu mai poate opera asupra ei; copia din afara aplicației nu o reactivează |
| D25–D26 | `TM-XXX` unic, **rezervat definitiv**, nerefolosit și nerecalculat după ștergeri |
| D27 | utilizatorul autentificat își vede lista propriilor sesizări (`TM-XXX`, stare, informații publice) cât timp acestea există |
| D28 | autorul vede aceleași informații ca publicul (categorie, descriere, fotografie, locație, stare, `TM-XXX`); **nu** vede starea transmiterii e-mailului, coada, procesarea internă |
| D29 | fără cont pentru utilizarea generală; **cont necesar numai pentru depunerea sesizărilor**; contul conține e-mailul; `super_admin` vede e-mailul; e-mailul nu este public; poate fi transmis Primăriei la cererea cetățeanului |
| D30 | **un e-mail = un singur cont**; fără identificarea persoanei reale în MVP |
| D31 | **confirmarea e-mailului**: link sau cod; contul devine activ după confirmare |

**A-1…A-9:**

| # | Decizie | Înlocuiește |
|---|---|---|
| A-1 | ștergerea definitivă (autor, `super_admin`). **Regula 6.1 este abrogată.** Testul `R6.1` se revizuiește conform noii reguli (decizie de produs, nu ajustare a testului). | RULES §6: 6.1; HANDOFF H (mecanismul 6.1) |
| A-2 | D9 (publicare imediată) înlocuiește moderarea prealabilă, inclusiv fluxul `Admin → Moderare → Hartă`. Master Planul și Planul v1.1 se amendează ulterior. | 3E; 6.6-a (partea „aprobate”); D6-2 (partea „și aprobate”); Master Plan; Plan v1.1, Faza 6 |
| A-3 | D9 înlocuiește și DN-21 / pct. 7 (partea „după moderare”): textul locației este **public**, fără moderare | S1-5, S1-7 (partea „după moderare”) |
| A-4 | D29–D31 înlocuiesc C-1 și regula „fără conturi de cetățeni”. Singura dată obligatorie a contului este e-mailul. | C-1; B3 §1 |
| A-5 | **B:** ștergerea definitivă și blocarea sunt **drepturi exclusive ale rolului `super_admin`**, separate de matricea de permisiuni; **fără permisiuni noi**; `primarie_operator` nu le primește prin `reports.*` | — (păstrează DN-01) |
| A-6 | lista privată a propriilor sesizări există **în MVP** | D9-6 |
| A-7 | **B:** starea sesizării (`nouă` / `în analiză` / `rezolvată`) **devine publică**, pe hartă | 6.6-b și 6.6-i (partea „stadiu”); D9-8 (partea „stadiu”) |
| A-8 | **A:** numai `super_admin` vede e-mailul cetățeanului în Admin; `primarie_operator` **nu** îl vede. Transmiterea către Primărie la cererea cetățeanului nu dă acces operatorului în interfață. | 6.6-i (partea „datele cetățeanului, ambelor roluri”) |
| A-9 | aplicația se folosește complet fără cont; la „Depune o sesizare” se cere autentificarea / crearea contului prin e-mail, cu confirmare; numai după confirmare se poate depune. Singura dată obligatorie: e-mailul. Mecanismul tehnic al confirmării, diferit pe medii, îl proiectează Claude (nu este decizie de produs). | — |

> **Consecință pentru RULES (extinde P-13):** setul A-01 modifică RULES §6 (6.1, 3E, 6.6-a, 6.6-b, 6.6-i), §11 (D6-2, D9-6, D9-8, N3-5 nu se schimbă) și Planul v1.1 / Master Planul (fluxul critic). **Neconsemnat** în repository (numai la cererea proprietarului).


### 0.4 [SET-A-02] Deciziile 2.1–2.15 (aprobate) și corecturile 1–13

| # | Decizie aprobată | Închide / înlocuiește |
|---|---|---|
| 2.1 | `nouă` → `în analiză` **automat, numai după trimiterea efectivă** (e-mailul acceptat de serverul de e-mail); fără cerere sau înainte de trimitere, rămâne `nouă` | P-1, P-2 |
| 2.2 | notificări către cetățean **numai** la `nouă → în analiză` și `în analiză → rezolvată`; nimic pentru asumare, preluare sau alte acțiuni | P-3; D9-3 (preluarea, răspunsul); F-1 din reconciliere |
| 2.3 | **fără moderare după publicare**; `reports.moderate`, endpoint-urile și fluxurile de moderare se elimină; ieșirea din sistem numai prin ștergere (autor, `super_admin`) | B-3, B-13; 5C (axa moderării); 5D (24 / 13 → 23 / 12) |
| 2.4 | locația: punct pe hartă (inclusiv poziția curentă) **sau** adresă geocodată automat, cu pin aproximativ verificabil de utilizator; fără poziție determinabilă: sesizarea se depune și rămâne în sistem, dar nu apare pe hartă | B-4; F-2. **Notă:** geocodarea adresei (adresă → poziție) nu contrazice D6-7, care exclude numai reverse geocoding (poziție → adresă). |
| 2.5 | **retenție 45 de zile** pentru toate categoriile discutate (sesizare, e-mailuri și jurnale, fotografii, datele contului, backup-uri); `TM-XXX` rezervat definitiv | DN-11, B-5, F-3 |
| 2.6 | blocarea: numai `super_admin`; temporară / permanentă; cea temporară se poate ridica manual înainte de termen; asociată contului / e-mailului, nu unei identități reale | B-8, B-14 |
| 2.7 | cetățeanul își poate șterge contul; sesizările rămân conform retenției, fără identitate publică | B-9 |
| 2.8 | opțiunea „Public / Public anonim” **eliminată complet** | B-10, DN-13 |
| 2.9 | bifă explicită de acceptare a politicii de utilizare la crearea contului; conținutul minim al politicii; încălcarea poate duce la blocare | B-11 |
| 2.10 | fotografiile devin publice imediat, fără verificare; responsabilitatea utilizatorului; `super_admin` poate șterge | B-12 |
| 2.11 | **exclusiv `super_admin`:** corectarea poziției, reîncercarea unui e-mail eșuat, accesul la jurnalul e-mailurilor | DN-03 (aceste operații); F-5 |
| 2.12 | sesizări **numai în interiorul UAT Turnu Măgurele**, verificat pe server | DN-08 (decizia); sursa limitei rămâne tehnică |
| 2.13 | cu fluxul către Primărie indisponibil: sesizarea rămâne în așteptare, nu devine `în analiză`, transmiterea se reia **automat** la reactivare | DN-10 |
| 2.14 | **maximum 3 sesizări / utilizator / 24 h către Primărie**, pe backend | DN-22 (parțial; proof-of-work activabil rămâne o măsură tehnică) |
| 2.15 | recuperarea TOTP: **ambele** mecanisme, coduri de recuperare de unică folosință **și** resetarea de către alt `super_admin`; distincte și auditate | DN-18 |

**Corecturile 1–13 aplicate:**
1. `admin_only` eliminat;
2. moderarea eliminată;
3. operatorul nu vede e-mailul cetățeanului nici prin jurnal;
4. câmpurile și testele lipsă (E-7, E-8);
5. 30 de tabele (B1 §7);
6. fluxul e-mail aliniat la 2.1;
7. retenția de 45 de zile;
8. ștergerea contului;
9. blocarea;
10. fotografiile;
11. limita UAT;
12. testele pentru limita de 3 / 24 h;
13. recuperarea TOTP.

Aplicate și eratele E-2 (închis = arhivă publică, prin E-3), E-5 (fluxul testabil pe staging), E-6 (schimbările de UI) și E-9.

**Decizii tehnice derivate (fără decizie de produs nouă):**
- **T-B1:** tipul „răspuns către cetățean” dispare; toate răspunsurile devin note interne (2.2 + D28 nu lasă niciun canal către autor).
- **T-B2:** o sesizare netransmisă nu poate deveni `rezolvată` (stările sunt strict ordonate).
- **T-B3:** `in_analysis` nu se poate seta manual prin API.
- **T-B4:** starea `on_hold` pentru transmisiile în așteptare.
- **T-B5:** geocodarea printr-un proxy pe server (`GEOCODER_URL`), iar harta arată pinul aproximativ ca zonă.
- **T-B6:** limita UAT din OSM, verificată vizual de proprietar.
- **T-B7:** codurile de recuperare stocate ca HMAC; un set nou invalidează setul vechi; procedura CLI de urgență numai pentru pierderea tuturor accesurilor.
- **T-B8:** la ștergerea contului, notificările către cetățean se anulează, iar notificările către Primărie aflate în coadă pleacă fără e-mailul cetățeanului.
- **T-B9:** utilizatorul blocat vede că este blocat și termenul, nu și nota internă.
- **T-B10:** ridicarea blocării se face prin același endpoint și pentru blocările permanente.

> **Consecință pentru RULES (extinde P-13):** 5D (matricea 23 / 12), 5C (fără moderare), D6-5 (corectarea poziției: exclusiv `super_admin`), D9-3 / D9-4 / D9-5 (notificările și răspunsurile), N3-6 (confirmarea, vezi K-A02-1), N4-8 (neschimbat). Neconsemnat în repository (numai la cererea proprietarului).

---

## A. Contradicții și tensiuni găsite (prezentate, nerezolvate tacit)

| # | Constatare | Surse | Decizia legată |
|---|---|---|---|
| **K-1** | **T1–T8 nu sunt definite** în niciun document disponibil (Plan v1.0 / v1.1 le menționează, dar fără listă; nu apar nici în evaluarea inițială, nici în rapoarte) | Plan v1.1, Faza 4 | DN-04 |
| **K-2** | Regula 6.6 „se păstrează doar starea curentă, **fără istoric de asumări**” față de auditul aprobat în D8-4 / N3-5 / D6-5: un audit al asumărilor ar crea istoric | RULES §6 (6.6), §11 | DN-02. **[SET-01] ÎNCHIS** prin DN-02 (S1-2). |
| **K-3** | D6-3 ascunde coordonatele exacte pe hartă (confidențialitate), dar textul locației și descrierea, publice după moderare (6.6), pot conține **adresa exactă** a autorului | D6-3, RULES §6 (6.6) | DN-21. **[SET-01] ÎNCHIS** prin DN-21 (S1-5): textul locației este public după moderare. |
| **K-4** | Compatibilitatea cu Node 20 (G5, B-1 / B-2): cele mai noi versiuni **Vitest 5** (cere Node ^22.12 \|\| ^24) și **`file-type` 22** (cere Node ≥ 22) nu pot fi folosite. **Nu este o încălcare**: există alternative compatibile (`node:test`, validare proprie); B-5 nu se declanșează. | registrul npm, 27.09.2026 | DN-23 |
| **K-5** | A17-3 (e-mailul către Primărie **înainte de moderare**) expune Primăria spamului care trece de B7 | A17-3, B7 | DN-22. **[SET-01] MODIFICAT:** A17-3 este înlocuit de pct. 7 (transmitere numai la cererea cetățeanului). Riscul rămâne pentru sesizările cu transmitere cerută; **DN-22 rămâne deschisă.** |
| **K-6** | Anonimizarea datelor de contact (cerută de GDPR / B8) nu are o permisiune în lista închisă D8-4 | D8-4, B8 | DN-12. **[SET-01] ÎNCHIS** prin DN-12 (S1-4): fără funcție de anonimizare, fără a 4-a permisiune. Ce se întâmplă cu e-mailul la expirarea retenției: **DN-11 (deschisă)**. |

## B. Decizii noi

### DN-01 — Numele permisiunilor noi (D8-4) — **[SET-01] APROBAT**
- **Decizia (S1-1):** se păstrează **exact trei** permisiuni noi: `accounts.manage`, `notifications.recipient.manage`, `audit.view`. Toate trei sunt exclusiv ale `super_admin`. **Nu există** o a 4-a permisiune (nici pentru anonimizare).
- **Rămâne deschis:** dacă `notifications.recipient.manage` acoperă, pe lângă destinatar (D8-4 (2)), și comutatorul A17-4, modul A17-8 și referința acordului A17-1. Prima propunere le includea; aprobarea din setul 01 nu se pronunță explicit (observația O-12 din inputul de audit). Vezi §C, P-10.
- **Impact:** `shared/permissions`, B2, B4, teste.

### DN-02 — Auditul asumărilor față de regula 6.6 (K-2) — **[SET-01] APROBAT**
- **Decizia (S1-2):** regula 6.6 rămâne neschimbată:
  - nu se păstrează istoric al asumărilor individuale;
  - jurnalul de audit poate păstra operațiile administrative care trebuie urmărite;
  - auditul **nu** se folosește pentru a reconstrui un istoric ascuns al asumărilor.
- **Efect în design:** asumarea și retragerea asumării individuale **nu scriu** în `audit_log`. Lista operațiilor administrative auditate (B4 §5) rămâne propunere.
- **Impact:** B1 (`audit_log`), B4 §5, B10.

### DN-03 — Maparea operațiilor noi pe permisiuni existente · **[SET-A-02] ÎNCHIS** (2.11 + tehnic, §E.1)
- **Propunere:**
  - corectarea poziției (D6-5): `reports.moderate`;
  - textele libere (N4-9): `surveys.edit` + sondaj închis;
  - integritate și proof-of-work (N4-10): `surveys.edit`;
  - statisticile respingerilor: `surveys.view`;
  - jurnalul e-mail per sesizare: `reports.view`; jurnalul global: `audit.view`;
  - reîncercarea e-mailului (A17-9): `reports.resolve`.
- **Impact:** B2, B4, teste de autorizare.

### DN-04 — Definiția T1–T8 (K-1) · **[SET-A-02] DESCHIS** (§E.2)
- **Propunere:** dacă proprietarul nu are lista originală, T1–T8 = grupele de dependențe tehnice din `FAZA_4_00_ARHITECTURA_SI_INDEX.md` §6:
  - T1 runtime;
  - T2 framework HTTP;
  - T3 DB / driver / ORM;
  - T4 validare;
  - T5 criptografie și autentificare;
  - T6 e-mail;
  - T7 fișiere și anti-abuz;
  - T8 build și testare.
- **Alternativă:** lista originală, dacă există la ChatGPT sau la proprietar.

### DN-05 — Strategia de branch-uri pentru Faza 5 · **[SET-A-02] DESCHIS** (§E.2)
- **Opțiuni:**
  - (a) se continuă pe `recovery-etapa-5-0e2cc20`, cu commit-uri per subetapă (practica actuală);
  - (b) branch per subfază 5.x, integrat în branch-ul de lucru după audit.
- `main` rămâne neatins până la o decizie separată (regula D-5).
- **Propunere:** **(a)** + CI pe fiecare push.

### DN-06 — Structura repository-ului (G10: „detaliile în Faza 4”) · **[SET-A-02] TEHNIC** (se aplică propunerea)
- **Opțiuni:**
  - (a) **npm workspaces**: `package.json` rădăcină + `server/` + `shared/` (frontend-ul rămâne la rădăcină);
  - (b) `server/` cu propriul `package.json` și importuri relative din `shared/`.
- **Propunere:** **(a)**. Modifică `package.json` rădăcină la 5.1.

### DN-07 — Mediul de dezvoltare local · **[SET-A-02]** necesită o informație (sistemul de operare)
- **Problema:** G3 = dezvoltare locală + CI. MySQL 8.4 local cere Docker sau o instalare nativă pe calculatorul proprietarului, iar sistemul de operare local nu este cunoscut.
- **Propunere:** Docker (MySQL 8.4 + captare SMTP), cu instalarea nativă ca alternativă.
- **De stabilit:** sistemul de operare și preferința proprietarului.

### DN-08 — Limitele UAT (D6-4) · **[SET-A-02] ÎNCHIS** (2.12 + T-B6)
- **Opțiuni:**
  - (a) poligonul limitei administrative din OpenStreetMap (licență ODbL, cu atribuire), stocat ca GeoJSON de configurare, cu verificare point-in-polygon în cod propriu;
  - (b) un dreptunghi (bbox) cu marjă;
  - (c) o sursă oficială (ANCPI / INIS), dacă este accesibilă.
- **Propunere:** **(a)**, verificat vizual de proprietar față de o sursă oficială.
- **Precizare:** datele nu au fost descărcate acum.

### DN-09 — Stările sesizării și tranzițiile — **[SET-01] APROBAT** (cu C-2, C-3)
- **Decizia (S1-6):** stările sunt **strict controlate**:
  1. `nouă`: sesizarea a fost depusă;
  2. `în analiză`: sesizarea a fost transmisă către Primărie;
  3. `rezolvată`: poate fi setată **numai** dacă Primăria participă la proiect și are un subcont de administrare care poate opera asupra sesizării.
- **Fără tranziții arbitrare.**
- Transmiterea prin e-mail **nu depinde** de existența subcontului Primăriei.
- **C-2:** există **numai aceste 3 stări**; `closed` dispare.
- **C-3:** asumarea și preluarea **nu mai schimbă starea** (modifică explicit 6.6-g).
- **Traducerea în design (propunere tehnică, fără decizie nouă):**
  - valorile tehnice sunt `new` / `in_analysis` / `resolved`;
  - tranzițiile permise: `new` → `in_analysis` și `in_analysis` → `resolved`;
  - orice altă tranziție (inclusiv înapoi, sau direct `new` → `resolved`) este respinsă cu 409.
- **Rămân deschise:**
  - mecanismul prin care `nouă` devine `în analiză` (automat, la confirmarea transmiterii, sau manual), **nedecis explicit** (§C, P-1);
  - dacă se trimite notificarea D9 la trecerea în `în analiză` (P-3);
  - confirmarea că tranziția directă `new` → `resolved` și revenirile sunt excluse (P-4);
  - identificatorii tehnici (P-5).
- **Prima propunere, variantele (a) / (b):** înlocuită.

### DN-10 — Fluxul către Primărie dezactivat (A17-4) · **[SET-A-02] ÎNCHIS** (2.13: reluare automată; propunerea „fără coadă retroactivă” este respinsă)
- **Problema:** ce se întâmplă cu sesizările depuse cât timp fluxul este oprit.
- **Propunere:** **nu se pun în coadă retroactiv**. La activare se trimit numai sesizările noi. Starea afișată pentru cele vechi: „oprit”.
- **Alternativă:** coadă retroactivă la activare (risc: trimiterea în masă a unor sesizări vechi).
- **[SET-01] Precizare:** de acum, întrebarea privește **numai** sesizările la care cetățeanul a cerut transmiterea (pct. 7); celelalte nu intră niciodată în coadă. DN-10 rămâne **deschisă**.

### DN-11 — Politica de retenție · **[SET-A-02] ÎNCHIS** (2.5: 45 de zile; momentul de referință: K-A02-3)
Nicio valoare nu este decisă; toate sunt **propuneri**:

| Date | Propunere |
|---|---|
| e-mailul cetățeanului (**[SET-01]:** singura dată de contact, C-1) | ~~anonimizare automată la 12 luni după `closed` / `resolved`~~ → **[SET-01] de redefinit:** DN-12 exclude funcția de anonimizare, iar `closed` nu mai există (C-2). Tratamentul la expirarea retenției rămâne deschis. |
| `audit_log` | 24 de luni |
| metadatele `email_outbox` | 12 luni |
| răspunsurile libere | 24 de luni după închiderea sondajului |
| sesiunile expirate | 30 de zile |
| jurnalele aplicației | 14 zile |
| `rejected_attempts` | 30 de zile (decis N4-8) |
| corpul e-mailurilor | 45 de zile (decis N3-8) |

Necesită și verificare juridică.

### DN-12 — Datele de contact și anonimizarea (K-6) — **[SET-01] APROBAT** (cu C-1) · **[SET-A-01] MODIFICAT** (D29–D31, A-4, A-8)

> **[SET-A-01]:** e-mailul nu mai stă în `report_contacts` (tabel eliminat); stă în contul cetățeanului (`citizen_accounts`), verificat. Numai `super_admin` îl vede în Admin (A-8). Rămân valabile: fără anonimizare, fără a 4-a permisiune, Primăria primește numai e-mailul, la cererea cetățeanului.
- **Decizia (S1-4):**
  - nu se introduce o funcție separată de anonimizare a contactului și nici o a 4-a permisiune;
  - aplicația cunoaște numai datele necesare proiectului, inclusiv adresa de e-mail;
  - identitatea autorului **nu** apare în proiecția publică; harta arată locația problemei și informațiile publice, fără numele, contul sau e-mailul autorului;
  - cetățeanul decide la depunere dacă dorește transmiterea către Primărie;
  - dacă o cere, Primăria primește **numai adresa de e-mail**, prin acest mecanism;
  - nu există o operație administrativă de „anonimizare”.
- **C-1:** **fără conturi de cetățeni** (N4-2 rămâne); „contul” = adresa de e-mail din formular; numele și telefonul **nu se mai cer**.
- **Efecte în design:**
  - ~~`report_contacts` păstrează numai `email`;~~ **[SET-A-01]** e-mailul stă în `citizen_accounts` (A-4);
  - fără endpoint și fără permisiune de anonimizare;
  - comanda `purge:contacts` și coloana `anonymized_at` **se scot din design**. Ce se întâmplă cu e-mailul la expirarea retenției se decide în **DN-11**, care rămâne deschisă.
- **Prima propunere, variantele (a) / (b) / (c):** înlocuită (respinsă prin S1-4).
- **Rămân deschise:**
  - dacă e-mailul este obligatoriu (în general sau numai când se cere transmiterea) (P-6);
  - dacă alegerea „transmite către Primărie” constituie singură acordul explicit cerut de A17-5 pentru trimiterea e-mailului (P-7).

### DN-13 — Valoarea istorică `private` (**[SET-A-01]:** vezi și B-10, rostul opțiunii „Public / Public anonim”) · **[SET-A-02] ÎNCHIS** (2.8)
- **Propunere:** backend-ul nu mai are valoarea `private` (datele nu se migrează, D10-5).
- **Impact:** tipurile și textele din Admin.

### DN-14 — Datele de referință în producție (D10-6) · **[SET-A-02] TEHNIC**
- **Opțiuni:**
  - (a) **seed de referință** versionat, cu sursa și data verificării per înregistrare, revizuit de proprietar;
  - (b) introducere manuală în Admin.
- **Propunere:** **(a)**, cu (b) pentru modificările ulterioare.

### DN-15 — Valorile numerice inițiale · **[SET-A-02] TEHNIC** (valori configurabile)
Grupate din B2 / B3 / B6 / B7:

| Categorie | Valori propuse |
|---|---|
| Sesiuni | 60 min inactivitate / 12 h absolut / 5 min pre-MFA |
| Blocare | 5 eșecuri → 15 min; 20 / 15 min / IP |
| `scrypt` | `N=2^15, r=8, p=3` |
| Fișiere | ≤ 3 MB, ≤ 4096 px |
| Voturi | timp minim 3 s; 50 / h / IP / sondaj; cookie de participare 1 an |
| Sesizări | timp minim 8 s; 5 / h și 20 / zi per IP; 3 confirmări / zi / adresă |
| Retry e-mail | 1 min, 5 min, 30 min, 2 h, 12 h |
| Grupare D9 | 10 min; 3 mesaje / sesizare / zi |
| API global | 600 / 10 min / IP |
| **[SET-A-01]** Conturi de cetățeni | cod de 6 cifre valabil 15 min, 5 încercări; 5 cereri de cod / oră / adresă, 20 / oră / IP; sesiune 30 de zile absolut / 7 zile inactivitate; 5 sesizări / zi / cont |

Toate sunt configurabile; se ajustează în 5.x pe baza testelor.

### DN-16 — Codul QR pentru înrolarea TOTP · **[SET-A-02] TEHNIC**
- **Opțiuni:**
  - (a) bibliotecă `qrcode` (MIT, JavaScript pur) în frontend;
  - (b) numai secretul afișat ca text.
- **Propunere:** **(a)**, cu (b) ca rezervă.

### DN-17 — Unde devine obligatoriu TOTP (D8-8) · **[SET-A-02] TEHNIC**
- **Opțiuni:**
  - (a) obligatoriu pe staging și în producție de la 5.2;
  - (b) numai în producție, înainte de date reale.
- **Propunere:** **(a)**: același comportament testat pe staging.

### DN-18 — Recuperarea accesului TOTP · **[SET-A-02] ÎNCHIS** (2.15: ambele mecanisme; propunerea „fără coduri de recuperare” este respinsă)
- **Propunere:**
  - resetarea TOTP de către **alt** `super_admin` (`accounts.manage`, cu audit);
  - procedură de urgență prin CLI pe server, cu acces tehnic;
  - recomandare: cel puțin **2 conturi `super_admin`** active;
  - fără coduri de recuperare în MVP.
- **Alternativă:** coduri de recuperare de unică folosință.

### DN-19 — Resursele externe și CSP · **[SET-A-02] DESCHIS** (§E.2)
- **Problema:** harta folosește tile-uri OSM; comunicatele demo folosesc imagini externe (Unsplash, m16).
- **Propunere:** CSP care permite **numai** tile-urile OSM. În producție, imaginile comunicatelor numai de pe domeniul propriu. Încărcarea imaginilor pentru comunicate **nu există azi** și ar fi o funcționalitate nouă; până atunci, comunicatele de producție fără imagine sau cu o listă de domenii permise aprobată.

### DN-20 — Rularea migrațiilor · **[SET-A-02] TEHNIC**
- **Opțiuni:**
  - (a) pas explicit la deploy (`migrate`, prin cPanel „Run JS script” / CLI), înainte de repornire;
  - (b) automat la pornire, cu blocare `GET_LOCK`.
- **Propunere:** **(a)**: controlabil și auditabil; aplicația refuză să pornească dacă schema nu este la versiunea așteptată.

### DN-21 — Textul locației public (K-3) — **[SET-01] APROBAT** · **[SET-A-01] MODIFICAT** (A-3): public **imediat**, fără moderare
- **Decizia (S1-5):**
  - textul locației problemei este **public** ~~după moderare~~ (**[SET-A-01]** imediat, A-3);
  - poate conține strada, numărul imobilului, blocul și alte elemente care descriu locul problemei;
  - publicarea descrie locul problemei și **nu** identifică autorul;
  - nu se presupune că proprietarul imobilului indicat este autorul sesizării.
- **Prima propunere (a) / (b):** varianta (b) (nepublicarea textului) este respinsă. Elementele suplimentare din (a) (indicația din formular și regula pentru moderator) **nu au fost aprobate explicit**; le-am scos din design. Vezi §C, P-8.

### DN-22 — Spamul către Primărie (K-5) · **[SET-A-02] ÎNCHIS** (2.14 + proof-of-work tehnic)
- **Propunere:**
  - proof-of-work **activabil** și pentru sesizări (același mecanism N4-5);
  - posibilitatea ca `super_admin` să oprească temporar fluxul (A17-4 există deja);
  - plafon zilnic de notificări către Primărie (valoare în DN-15).
- **Alternativă:** trimiterea către Primărie numai după o verificare (contrazice A17-3; nu o recomand).
- **[SET-01] Precizare:** A17-3 este înlocuit de pct. 7. Expunerea la spam se reduce la sesizările cu transmitere cerută. Propunerea DN-22 rămâne **deschisă**; mențiunea „contrazice A17-3” trebuie reevaluată față de pct. 7.

### DN-23 — Instrumentul de teste (K-4) · **[SET-A-02] TEHNIC**
- **Opțiuni:**
  - (a) `node:test` (inclus în Node, fără dependență, compatibil cu 20 și 24);
  - (b) Vitest 4.1.x (compatibil cu Node 20).
- **Propunere:** **(a)** pentru backend.
- **Notă:** Vitest 5 este exclus cât timp există matricea Node 20.

### DN-24 — Serverul SMTP de test în CI · **[SET-A-02] TEHNIC**
- **Propunere:** un container de captare SMTP (de exemplu Mailpit) **numai în CI și local**, niciodată în producție.
- **Alternativă:** un server SMTP minimal scris în teste.

---

## C. [SET-01] Puncte deschise rezultate din setul 01 · **[SET-A-02] toate închise sau tehnice (§E.1); P-13 = acțiune la cerere**

Le-am identificat aplicând setul 01. **Nu le-am rezolvat.** Acolo unde designul are nevoie de o valoare de lucru, am scris-o ca **propunere tehnică** și am marcat-o.

| # | Punct deschis | Sursa | Unde apare în design | Starea în design |
|---|---|---|---|---|
| **P-1** | Mecanismul exact prin care `nouă` devine `în analiză` (automat, la confirmarea transmiterii e-mailului, sau manual) | instrucțiunea 01, „ce nu este decis” | B1 §3.2; B2 §6.1; B5 §4; B6 | **nedecis**; niciun automatism, niciun rol stabilit |
| **P-2** | Ce stare are o sesizare cu transmitere cerută, dar netrimisă (fluxul oprit, A17-4; modul Primăriei `none`; eșec de trimitere) | S1-6 + S1-7 + A17-4 / A17-9 | B5 §5; B6 §3 | rămâne `nouă` până la decizia P-1 (consecința directă a regulii „`în analiză` = transmisă”) |
| **P-3** | Dacă trecerea în `în analiză` generează notificarea D9 către cetățean | C-2 (D9-3 notifică la „în analiză” și „rezolvată”) + P-1 | B6 §5 | notificarea este **prevăzută** (C-2); momentul depinde de P-1 |
| **P-4** | Confirmarea că tranziția directă `new` → `resolved` și revenirile (`resolved` → `in_analysis`, `in_analysis` → `new`) sunt excluse | S1-6 („fără tranziții arbitrare”, ordinea 1 → 2 → 3) | B5 §4; B10 | **propunere tehnică:** excluse (409) |
| **P-5** | Identificatorii tehnici `new` / `in_analysis` / `resolved` | S1-6 | B1, B2, `shared/` | **propunere tehnică** |
| **P-6** | Dacă e-mailul este obligatoriu (la orice sesizare, numai la cererea de transmitere sau niciodată) | S1-4, C-1 | B1 §3.2; B2 §4; B5 §1 | **nedecis**; rămâne opțional ca în codul actual, până la decizie **[SET-A-01] ÎNCHIS:** e-mailul este obligatoriu, ca dată a contului (A-9) |
| **P-7** | Dacă alegerea „transmite către Primărie” constituie singură acordul explicit cerut de A17-5 pentru trimiterea e-mailului | S1-4 („dacă solicită transmiterea, Primăria primește doar adresa de e-mail…, prin acest mecanism”) | B1 §3.2; B5 §5 | **propunere tehnică:** un singur câmp (`city_hall_transmission_requested`), separat de opt-in-ul D9-2; de confirmat **[SET-A-01] ÎNCHIS:** cererea de transmitere este mecanismul prin care e-mailul contului poate fi transmis Primăriei (D29, A-8) |
| **P-8** | Indicația din formular și regula pentru moderator (elementele suplimentare din prima propunere DN-21 (a)) | S1-5 | B5 §3 | **scoase** din design; se pot reintroduce numai prin decizie **[SET-A-01] CADUC:** fără moderare prealabilă (A-2, A-3) |
| **P-9** | Traducerea tehnică a condiției pentru `rezolvată` („Primăria participă și are subcont”) | S1-6 | B4 §3; B5 §4 | **propunere tehnică:** `settings.registry.primaria_mode = platform` **și** operația executată de un cont `primarie_operator` activ (`reports.resolve` + `actsForCityHall`). **Consecință:** `super_admin` **nu** mai poate seta `rezolvată`. De confirmat. |
| **P-10** | Acoperirea `notifications.recipient.manage`: comutatorul A17-4, modul A17-8 și referința acordului A17-1 | DN-01 (S1-1); O-12 | B2 §6.5; B4 §2.2 | rămâne ca în prima propunere (incluse), **marcat de confirmat** |
| **P-11** | Mecanismul tehnic al închiderii automate (E-3) | S1-3 | B1 §3.4; B2 §2; B10 | **propunere tehnică:** starea efectivă „închis” se calculează la fiecare cerere (`now ≥ end_at`); comanda CLI `surveys:close-expired` (cron) persistă `status = closed`, cu audit (actor `system`) |
| **P-12** | Valoarea afișată în Admin pentru sesizările fără transmitere cerută (A17-7: oprit / în coadă / trimis / eșuat) | S1-7 + A17-7 | B1 §3.2; B2 §6.1 | **propunere tehnică:** valoarea suplimentară „nesolicitat” **[SET-A-01]** valoarea nu este vizibilă autorului (D28) |
| **P-13** | Consemnarea în RULES a modificărilor aduse 5C, 6.6-g, A17-3, A17-5, A17-6 și D9-3 | §0 | repository | **neefectuată** (repository neatins; numai la cererea proprietarului) **[SET-A-01] EXTINS:** plus 6.1, 3E, 6.6-a / 6.6-b / 6.6-i, D6-2, D9-6, D9-8, Plan v1.1 și Master Plan (fluxul critic) |

**Rămân deschise, neatinse de setul 01:**
- DN-03…DN-08, DN-10, DN-11, DN-13…DN-20, DN-22…DN-24;
- K-1 (T1–T8) și K-4;
- eratele E-1, E-2, E-5…E-10 din `FAZA_4_CLARIFICARI_DIN_CHATUL_ANTERIOR.md` (E-3 este aprobată în S1-3; E-4 și O-1 dispar, pentru că endpoint-ul de anonimizare s-a eliminat, S1-4);
- observațiile O-1…O-16 din inputul de audit care nu sunt închise mai sus.


---

## D. [SET-A-01] Starea problemelor B-1…B-12 (analiza deciziilor 8–31) și punctele deschise

### D.1 Rezolvate prin setul A-01 (sau prin D8–D31)

| # | Problema | Rezolvare |
|---|---|---|
| B-1 | Permisiunile pentru ștergere și blocare | **A-5 (B):** drepturi exclusive ale rolului `super_admin`, în afara matricei; fără permisiuni noi |
| B-2 | Autentificarea cetățeanului | **A-9:** autentificare prin e-mail. Mecanismul tehnic este proiectat în B3 §8: cod unic trimis pe e-mail, fără parolă (**consecință tehnică**, fără decizie nouă) |
| B-6 | E-mailurile netrimise la ștergere | **consecință tehnică** din D20 / D23 / D24: toate rândurile din coadă ale sesizării șterse, încă netrimise, trec în `cancelled` în aceeași tranzacție; nimic nu se mai trimite (B6 §1) |
| — | A-1…A-9 | vezi §0.3 |

### D.2 ~~Încă necesită o decizie de produs~~ **[SET-A-02] Toate închise (§E.1), cu excepția B-7 (§E.2)**

| # | Problema | De ce contează | Unde apare |
|---|---|---|---|
| **B-3** | Mai există moderare **după** publicare? (de exemplu ascunderea unei sesizări fără ștergere, de către `primarie_operator` sau `super_admin`) Dacă nu: câmpurile de moderare dispar, iar `primarie_operator` nu mai are nicio acțiune asupra conținutului public. | axa 5C „moderare”; permisiunea existentă `reports.moderate` (ambele roluri) | B1 `reports.moderation_*`; B2 `PATCH …/moderation`; B4 |
| **B-4** | Sesizările **fără pin** (D6-2: pin opțional) față de D9 („publicată imediat pe hartă”) | o sesizare fără coordonate nu poate apărea pe hartă; lista publică nu există (6.5-P3) | B5 §3 |
| **B-5** | Ce rămâne după o ștergere definitivă: metadatele `email_outbox`, corpurile (N3-8: 45 de zile), fotografiile de pe disc, backup-urile (nu se pot curăța retroactiv) | D20 trimite la „regulile de retenție”, iar DN-11 este deschisă | B1, B6, B8 |
| **B-7** | Auditul ștergerilor: se înregistrează (`TM-XXX`, actorul, data) sau nu? | o urmă ar contrazice parțial D20 („eliminată”); lipsa ei elimină trasabilitatea acțiunilor `super_admin` | B4 §5 |
| **B-8** | Detaliile blocării: deblocarea manuală înainte de termen; dacă utilizatorul vede motivul sau termenul; mesajul afișat la încercarea de depunere | D14 lasă tipul și durata la `super_admin`, dar nu spune nimic despre ridicarea blocării | B1, B2, UI |
| **B-9** | Ștergerea **contului** cetățeanului (la cerere, GDPR): permisă? Ce se întâmplă cu sesizările lui? | nedecis în D8–D31 | B8 |
| **B-10** | Rostul opțiunii „Public” / „Public anonim” (`publicationPreference`) când identitatea autorului nu este niciodată publică (+ DN-13) | câmp fără efect | B1, formularul |
| **B-11** | Politica de utilizare (D8): textul, locul unde apare, **acceptarea explicită** la crearea contului sau la depunere | verificarea juridică (E-6) | UI, B1 |
| **B-12** | Fotografiile publicate imediat, fără verificare (fețe, numere de înmatriculare, date ale unor terți) | risc de confidențialitate / juridic nou (D9) | B5, B8 |
| **B-13** | **nou:** ce poate face `primarie_operator` cu o sesizare după A-8 și D9: vede sesizarea fără e-mail; poate prelua (6.6), răspunde, marca `rezolvată` (DN-09). Rămâne `reports.moderate` cu vreun efect? (legat de B-3) | coerența matricei celor 13 permisiuni | B4 §3 |
| **B-14** | **nou:** blocarea și regula D30 („un e-mail = un cont”): un utilizator blocat își poate face un alt cont cu alt e-mail. Riscul este acceptat (D30: fără identificarea persoanei), dar nu este consemnat explicit. | confirmare de risc | B7 §3 |

**[SET-A-02] Starea actuală: §E.** ~~Rămân deschise și:~~
- ~~P-1…P-5, P-9, P-10, P-11 (propunere tehnică), P-13 (§C);~~
- DN-03…DN-08, DN-10, DN-11, DN-13…DN-20, DN-22…DN-24;
- K-1, K-4;
- eratele E-1, E-2, E-5…E-10.
- **E-6 (butoanele „Reset Demo”, câmpul `registryEmail` din Ghid)** și **E-7 (câmpurile Admin)** sunt parțial depășite: `isOnPublicMap` devine „are coordonate” (D9); `privateCount` depinde de B-10.

### D.3 Consecințe tehnice proiectate fără decizie nouă (marcate „propunere tehnică” în B1–B10)

| # | Consecință | Unde |
|---|---|---|
| T-A1 | tabelele noi `citizen_accounts`, `citizen_login_codes`, `citizen_blocks`; `sessions` pentru ambele tipuri de cont (`principal_type`) | B1 §3.7 |
| T-A2 | autentificarea cetățeanului prin **cod unic pe e-mail** (fără parolă): prima confirmare activează contul; aceleași coduri servesc la autentificările ulterioare | B3 §8 |
| T-A3 | confirmarea pe medii: `simulated` (dezvoltare, CI: codul se citește din coada simulată, numai prin CLI / harness, niciodată în producție); staging (numai adresele din `EMAIL_ALLOWLIST` pot crea conturi; înainte de 5.5, fără SMTP, prin coada simulată); producție `live` | B3 §8; B6 §2 |
| T-A4 | ștergerea definitivă: tranzacție cu `DELETE` pe sesizare și `CASCADE` pe fotografii, răspunsuri, responsabili; coada netrimisă → `cancelled` + corp șters; fișierele șterse după COMMIT; contorul `TM` neatins | B1, B5 §6 |
| T-A5 | publicarea imediată: proiecția publică = sesizare existentă + coordonate valide (în UAT) + **starea** (A-7) | B5 §3 |
| T-A6 | drepturile exclusive ale rolului `super_admin` într-o listă centralizată în `shared/` (`SUPER_ADMIN_EXCLUSIVE`: ștergerea sesizărilor, blocarea, vizualizarea e-mailului cetățeanului), verificată de server; nu sunt permisiuni în matrice | B4 §2.4 |
| T-A7 | anti-abuz pentru conturi: limite pe IP și pe adresă la cererea de coduri; expirarea și numărul maxim de încercări pentru cod; plafonul existent „3 e-mailuri / zi / adresă” extins | B7 |
| T-A8 | e-mailul normalizat (trim, litere mici) cu `UNIQUE` pentru D30 | B1 |
| T-A9 | test nou: ștergerea `TM-015` → următorul `TM-016` (D25–D26); testul `R6.1` revizuit (A-1) | B10 |
| T-A10 | subfaza 5.4 (sesizări) depinde de conturile de cetățeni și de coada de e-mail simulată; SMTP-ul real rămâne la 5.5. Ordinea din Planul v1.1 se păstrează; conținutul 5.2 / 5.4 se completează (de amendat în Plan, P-13). | 00 §10 |


---

## E. [SET-A-02] Starea finală a punctelor după revizia 3

### E.1 Închise în această revizie

| Punct | Închis prin |
|---|---|
| P-1, P-2 | 2.1, 2.13 |
| P-3 | 2.2 |
| P-4, P-5, P-10, P-11, P-12 | decizii tehnice (documentate) |
| P-9 | A-02 §3 („numai subcontul Primăriei”) + T-B2 |
| B-3, B-13 | 2.3 |
| B-4 | 2.4 |
| B-5 | 2.5 |
| B-8, B-14 | 2.6 |
| B-9 | 2.7 |
| B-10, DN-13 | 2.8 |
| B-11 | 2.9 (textul politicii = sarcină de redactare) |
| B-12 | 2.10 |
| DN-03 | 2.11 (operațiile e-mail și poziția); restul mapării, tehnic: integritatea și proof-of-work → `surveys.edit`, respingerile → `surveys.view`, textele libere → numai `super_admin` după închidere (N4-9) |
| DN-08 | 2.12 + T-B6 |
| DN-10 | 2.13 |
| DN-11 | 2.5 |
| DN-18 | 2.15 |
| DN-22 | 2.14 (+ proof-of-work activabil, tehnic) |
| DN-06, DN-14, DN-15, DN-16, DN-17, DN-20, DN-23, DN-24 | **decizii tehnice**: se aplică propunerile din revizia 0, marcate tehnic; valorile DN-15 rămân configurabile |
| K-2, K-3, K-5, K-6 | seturile 01 / A-01 / A-02 |
| K-4 | tehnic (DN-23) |
| E-1…E-10 | aplicate sau caduce |

### E.2 Mai necesită o decizie a lui Sergiu

| # | Problema | De ce este necesară |
|---|---|---|
| **K-A02-3** | **Momentul de la care curg cele 45 de zile** pentru o sesizare și pentru un cont de cetățean (de la depunere / creare, de la `rezolvată`, de la ultima activitate sau după ștergere) | Decizia 2.5 fixează durata, nu și momentul de start. Diferența este mare: „de la depunere” șterge automat de pe hartă orice sesizare după 45 de zile, chiar și una încă `în analiză`. |
| **K-A02-1** | **E-mailul de confirmare la depunere** (N3-6, aprobat în Faza 3) | Aplicat literal, 2.2 („notificări **numai** pentru două schimbări de stare”) îl elimină, și așa am aplicat. Confirmarea nu este însă o schimbare de stare; trebuie confirmat că eliminarea este intenționată. |
| **K-A02-4** | **Păstrarea blocării permanente** după ștergerea contului: am păstrat numai `email_hash`, fără termen | 2.6 (blocare asociată e-mailului, permanentă) și 2.5 (45 de zile pentru datele contului) se ciocnesc aici. Am ales varianta care respectă 2.6; trebuie confirmată. Aceeași confirmare pentru `rejected_attempts`, lăsat la 30 de zile (N4-8), și pentru sondaje, lăsate în afara regulii de 45 de zile (D3: arhivă publică). |
| **B-7** | **Auditul ștergerilor** (se înregistrează numărul `TM`, cine și când?) | Neacoperit de 2.1–2.15; cu retenția de 45 de zile, urma ar dispărea oricum după 45 de zile. |
| **DN-04** | Lista originală **T1–T8** | Nu există în sursele disponibile; o poate da numai proprietarul / ChatGPT (sau se redefinește). |
| **DN-05** | **Branch-urile** pentru Faza 5 | Decizie de proces a proprietarului. |
| **DN-19** | **Imaginile comunicatelor** în producție (URL-uri externe permise sau numai de pe domeniul propriu) | Afectează politica CSP și conținutul existent (imagini Unsplash). |

**Informație necesară (nu decizie):** sistemul de operare al calculatorului lui Sergiu (DN-07).
**Acțiune la cerere (nu decizie):** consemnarea în RULES, Plan v1.1 și Master Plan (P-13).
