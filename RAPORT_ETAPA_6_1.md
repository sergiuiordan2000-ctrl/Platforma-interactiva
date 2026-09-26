# RAPORT ETAPA 6.1 — Eliminarea ștergerii neautorizate a sesizărilor

**Proiect:** Turnu Măgurele Civic
**Data:** 26 septembrie 2026
**Branch:** `recovery-etapa-5-0e2cc20`
**HEAD** (neschimbat, fără commit): `fff9507062ee7a9be7a2bee21118d8ae522ce193`
**Referință audit:** `RAPORT_AUDIT_ETAPA_6.md`, problema **C2 / S1** (teste 6D-DEL-01, 6D-DEL-02)

---

## 1. Problema identificată

Sesizările cetățenilor puteau fi **șterse fizic și definitiv** din zona publică, fără autentificare, prin butonul „Șterge (Test 6)” din tab-ul „Evidență Locală” al paginii `#sesizari`.

Inspecția a arătat că problema **nu era doar vizuală**. Metoda de serviciu `reportService.deleteReport()` nu avea nicio verificare de rol sau autentificare. Orice cod care ajungea la serviciu putea șterge date, **indiferent de rol**: public, `primarie_operator` sau `super_admin`. Asta încălca regula de produs: *Primăria vede și administrează sesizările, dar nu le șterge prin interfața obișnuită.*

## 2. Fișiere inspectate

| Fișier | Motiv |
|---|---|
| `src/views/IssuesView.tsx` | pagina publică Sesizări (formular + „Evidență Locală”) |
| `src/components/report/ReportForm.tsx`, `ReportConfirmation.tsx` | depunere și confirmare (fără logică de ștergere) |
| `src/services/reportService.ts` | serviciul unic al sesizărilor (persistență `localStorage`) |
| `src/components/admin/reports/AdminReportsModeration.tsx` | panoul Admin de moderare |
| `src/views/AdminView.tsx`, `src/components/admin/AdminDashboard.tsx` | accesul la tab-ul Sesizări |
| `src/services/permissionService.ts` | permisiunile `reports.*` |
| `src/views/MapView.tsx` | afișarea publică pe hartă (doar citire) |
| Toate fișierele din `src/` | căutare globală după `deleteReport`, `turnu_civic_reports_store`, `removeItem`, `localStorage.clear`, `splice`, `this.reports =`, „Șterge”, `Trash2` |

**Unde se afișează sesizările:** `IssuesView` (tab „Evidență Locală”), `AdminReportsModeration` și `MapView` (doar cele publice aprobate).

**Controale de rol existente:** `reports.view` / `reports.moderate` / `reports.resolve` / `reports.reply` (`permissionService.ts`). **Nu exista și nu există nicio permisiune de ștergere.** Tab-ul Admin e protejat prin `reports.view` (`AdminView.tsx:60`).

## 3. Mecanismul inițial de ștergere

| Nivel | Element | Protecție |
|---|---|---|
| Interfață publică | buton „Șterge (Test 6)” (`IssuesView.tsx`, liniile 194–202), afișat pe fiecare sesizare din „Evidență Locală” | **niciuna**; doar `window.confirm()` |
| Handler | `handleDeleteTestReport(id, refNum)` (`IssuesView.tsx`, liniile 56–61) → `reportService.deleteReport(id)` | **niciuna** |
| Serviciu | `reportService.deleteReport(id)` (`reportService.ts`, liniile 312–320): filtrează sesizarea din listă și salvează în `localStorage` | **niciuna** (fără verificare de autentificare sau rol) |
| Interfață Admin | `AdminReportsModeration.tsx`: **nicio** cale de ștergere; handlerele sunt doar `handleUpdateStatus`, `handleChangeResolutionStatus`, `handleAddResponse` | nu se aplică |

**Apelanți ai funcției de ștergere:** exact **unul**, `IssuesView.handleDeleteTestReport`. Alte căi de ștergere a sesizărilor (`removeItem`, `clear`, `resetToDemo` pentru sesizări): **nu există**.

**Test de referință înainte de modificare** (declanșare directă, prin importul modulului real `reportService` în aplicația care rulează, deci aceeași instanță folosită de interfață):

| Rol | Rezultat înainte |
|---|---|
| public (neautentificat) | 3 → **2** sesizări (ștergere reușită) |
| `primarie_operator` | 3 → **2** (ștergere reușită) |
| `super_admin` | 3 → **2** (ștergere reușită) |

Concluzie: vulnerabilitatea exista **la nivel de logică**, nu doar la nivel de buton.

## 4. Cauza problemei

Un **artefact de test din Etapa 3B**, creat pentru a verifica „nerefolosirea numărului TM după ștergere” (Testul 6), a rămas activ în zona publică. Metoda de serviciu pe care o folosea nu avea nicio verificare. Nu a existat vreodată o cerință de produs pentru ștergerea sesizărilor.

## 5. Comportamentul corect (confirmat înainte de modificare)

| Rol | Poate | NU poate |
|---|---|---|
| **Cetățean** | trimite sesizarea; vedea confirmarea și numărul TM; vedea sesizările publice aprobate pe hartă (funcționalitatea existentă) | șterge sesizări |
| **`primarie_operator`** | vedea sesizările; aproba/respinge publicarea (`reports.moderate`); schimba stadiul soluționării (`reports.resolve`); adăuga răspunsuri (`reports.reply`) | șterge sesizări |
| **`super_admin`** | aceleași acțiuni administrative | șterge sesizări (**nu** primește acest drept automat) |

**Nu s-a creat nicio permisiune nouă.** `permissionService.ts` a rămas neatins.

## 6. Modificările efectuate (cea mai mică modificare sigură)

1. **`src/views/IssuesView.tsx`**, doar eliminări (21 de linii):
   - handlerul `handleDeleteTestReport` (cu `window.confirm` și apelul `reportService.deleteReport`);
   - blocul butonului „Șterge (Test 6)”;
   - importul `Trash2`, rămas nefolosit.
2. **`src/services/reportService.ts`**:
   - **metoda `deleteReport()` a fost eliminată complet** (11 linii de cod). Serviciul nu mai expune nicio operație de ștergere, deci nu există nimic de declanșat direct;
   - comentariul metodei a fost înlocuit cu o notă de 6 linii care documentează regula (fără ștergere, contorul TM nu se decrementează).

**De ce eliminare și nu un guard:** o verificare de rol în browser (de exemplu `if (!isAdmin) return`) ar fi fost falsă ca protecție. Și `super_admin` ar fi putut șterge, ceea ce contrazice regula, iar sesiunea poate fi falsificată (M1 din audit). Codul care nu există nu poate fi apelat.

**Statistică diff:** 2 fișiere, 6 inserări, 32 ștergeri.

## 7. Fișiere modificate

| Fișier | Tip |
|---|---|
| `src/views/IssuesView.tsx` | doar eliminări |
| `src/services/reportService.ts` | eliminarea metodei + comentariu |
| `RAPORT_ETAPA_6_1.md` | nou (acest raport) |

## 8. Ce NU a fost modificat

- `ReportForm`, `ReportConfirmation`: crearea sesizărilor, validările, fotografiile, GPS, preferința de publicare.
- Numerotarea `TM-XXX` și contorul (regula 3B: nu se decrementează).
- `AdminReportsModeration`: moderare, soluționare, răspunsuri.
- `permissionService.ts`: matricea de roluri, nicio permisiune nouă.
- `MapView`: regula de publicare și afișare pe hartă.
- Tipurile de date (`src/types/*`) și cheile `localStorage`.
- **Tab-ul „Evidență Locală” și lista lui rămân** (problema M3, expunerea sesizărilor private și a ID-urilor tehnice, e explicit în afara scopului 6.1). Doar butonul de ștergere a dispărut.
- C1, C3, C4, M4, „Preluare/Asumare”: neatinse.
- Nicio dependență instalată sau modificată. Niciun commit, niciun push.

## 9. Teste efectuate și rezultate

**Metodă:** Playwright + Chromium, browser real. Fiecare rol rulează într-un context nou, cu `localStorage` curat (3 sesizări demo). **Declanșarea directă a logicii:** în pagina aplicației care rulează se importă modulul real `/src/services/reportService.ts`, adică aceeași instanță singleton folosită de interfață. Se listează toate metodele serviciului cu nume distructiv (`delete|remove|clear|purge|erase|destroy`), se apelează `deleteReport` și fiecare metodă găsită, apoi se recitesc datele din memorie și din `localStorage`. Scriptul de test e în afara repository-ului.

### A. Public (neautentificat)

| ID | Verificare | Înainte | După |
|---|---|---|---|
| PUB-01 | Nicio opțiune de ștergere pe `#sesizari` / „Evidență Locală” | FAIL (3 butoane) | **PASS** (0) |
| PUB-02 | Declanșarea directă a logicii de ștergere nu șterge date | FAIL (3 → 2) | **PASS**: metode distructive = `[]`, `deleteReport` = inexistent, 3 → 3 (memorie + storage) |
| PUB-03 | Sesizările existente sunt intacte după reîncărcare | FAIL | **PASS** (TM-001, TM-002, TM-003) |
| PUB-04 | Regresie: cetățeanul trimite sesizare → TM-004 persistată | — | **PASS** |
| PUB-05 | Regresie: harta publică afișează cele 2 sesizări aprobate | — | **PASS** |
| PUB-06 | Fără erori JS | PASS | **PASS** |

### B. `primarie_operator`

| ID | Verificare | Înainte | După |
|---|---|---|---|
| op-00 | Autentificare | PASS | **PASS** |
| op-01 | Sesizările vizibile în Moderare (TM-001..003) | PASS | **PASS** |
| op-02 | Nicio opțiune de ștergere în Admin | PASS | **PASS** (0) |
| op-03 | Acțiuni existente: aprobare + stadiu „În lucru” + răspuns, persistate | PASS | **PASS** |
| op-04 | Declanșarea directă a ștergerii nu modifică datele | FAIL (3 → 2) | **PASS** (3 → 3) |
| op-05 | Date intacte după reîncărcare | FAIL | **PASS** |

### C. `super_admin`

| ID | Verificare | Înainte | După |
|---|---|---|---|
| sa-00 | Autentificare | PASS | **PASS** |
| sa-01 | Sesizările vizibile | PASS | **PASS** |
| sa-02 | Nicio opțiune de ștergere | PASS | **PASS** (0) |
| sa-03 | Acțiuni administrative existente | PASS | **PASS** |
| sa-04 | Declanșarea directă a ștergerii nu modifică datele | FAIL (3 → 2) | **PASS** (3 → 3) |
| sa-05 | Date intacte după reîncărcare | FAIL | **PASS** |

**Total test 6.1:** înainte 9 PASS / 10 FAIL; **după: 18 / 18 PASS**, rulat și pe codul final.

### D. Regresie (suita Etapei 6, build de producție, scenariile care ating sesizările)

Scenarii: navigație, depunere sesizare, validări, reguli hartă, moderare, roluri și autentificare, ștergere.

| Rezultat | Detaliu |
|---|---|
| **40 PASS** | toate verificările 6A relevante (NAV, REP-01..06, VAL-01..06, MAP-01..04, MOD-01..07, ROL, AUTH) + **6D-DEL-01** |
| **0 regresii** | nicio verificare PASS din auditul 6 nu a devenit FAIL |
| 2 FAIL așteptate | 6D-PRV-01 / 6D-PRV-02: problema **M3**, în afara scopului, neschimbată |
| 1 PARTIAL așteptat | 6A-MOD-08 „Preluare/Asumare”, în afara scopului |
| 1 eroare de script | scenariul vechi `sec_delete` încearcă să apese butonul „Șterge”, care nu mai există; confirmă indirect eliminarea |

### Protecția la nivel de logică (cerința din Pasul 6)

- `grep -rn "deleteReport" src/` → singura apariție e în comentariul explicativ.
- În bundle-ul de producție (`dist/assets/*.js`): **0 apariții** `deleteReport`.
- Enumerarea completă a metodelor serviciului la rulare: **nicio metodă distructivă**.
- Declanșarea directă returnează „inexistent”, iar datele rămân 3 → 3 pentru toate cele trei roluri.

## 10. `npx tsc --noEmit`
Exit code **0**, fără erori.

## 11. `npm run build`
Exit code **0**, `✓ built`. Bundle `index-CADEHYSP.js` 771,71 kB (gzip 195,77 kB). Avertismentul preexistent de dimensiune chunk > 500 kB e neschimbat.

## 12. `git diff --check`
Exit code **0**, fără probleme de whitespace.

## 13. `git status --short`
```
 M src/services/reportService.ts
 M src/views/IssuesView.tsx
?? RAPORT_AUDIT_ETAPA_6.md
?? RAPORT_ETAPA_6_1.md
```
Niciun commit, niciun push. HEAD a rămas `fff9507`, iar `main` e neatins.

## 14. Limitări rămase

1. **Garanția absolută e imposibilă în arhitectura actuală.** Aplicația e 100% client-side. Oricine are acces la DevTools poate modifica direct `localStorage` (inclusiv ștergerea unei sesizări), fără să treacă prin cod. 6.1 elimină **orice cale oferită de aplicație**, dar interdicția „nimeni nu poate șterge” poate fi impusă și auditată doar pe un **server** (backend, cu jurnal de operații).
2. **Tab-ul public „Evidență Locală” rămâne** și afișează în continuare toate sesizările (inclusiv private/nemoderate) și ID-urile tehnice: **M3**, 6D-PRV-01/02, planificat separat.
3. **Scripturile de test sunt în afara repository-ului**, în directorul temporar al sesiunii. Dacă sesiunea se închide, se pierd (decizia D7 din planul 6F e încă deschisă).
4. Testul de regresie `sec_delete` din suita Etapei 6 va trebui adaptat (încearcă să apese butonul eliminat).

---

**STOP.** Etapa 6.1 e completă. Nu am făcut commit sau push. Aștept verificarea raportului înainte de orice altă modificare.
