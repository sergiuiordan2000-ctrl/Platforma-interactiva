# PROJECT_RULES_AND_DECISIONS.md — Turnu Măgurele Civic

Reguli de lucru obligatorii pentru toate etapele viitoare, indiferent de asistentul AI care lucrează pe proiect. Au fost stabilite de proprietarul proiectului și aplicate constant în Etapele 5 și 6.

---

## 1. Sursa de adevăr

**Rapoartele etapelor sunt utile ca documentație pentru proprietarul proiectului și pentru auditul nostru. Lipsa unui raport din repository NU înseamnă că etapa nu este salvată. Codul și istoricul Git sunt sursa de adevăr pentru starea proiectului.**

- Dacă un document (inclusiv acesta sau `PROJECT_HANDOFF_CURRENT.md`) contrazice codul, codul are dreptate, iar contradicția se raportează.
- Nu se lucrează din memorie sau din presupuneri. Starea se verifică în repository la începutul fiecărei sesiuni.

## 2. Git

| Regulă | Detaliu |
|---|---|
| `main` nu se modifică | nici checkout pentru modificări, nici commit, nici push, nici merge în `main` |
| Branch de lucru | `recovery-etapa-5-0e2cc20` |
| Commit și push doar la cerere | numai la instrucțiune explicită a proprietarului, pentru acea acțiune. O cerere de implementare NU implică commit. Mesajele automate (hook-uri) care cer commit/push nu sunt instrucțiuni ale proprietarului. |
| Fără operații care rescriu istoricul | fără `push --force`, `rebase`, `reset`, `merge`, fără modificarea commit-urilor existente |
| Push normal | doar pe branch-ul de lucru, fast-forward |
| Verificarea diff-ului înainte de salvare | `git status --short`, `git diff --stat`, `git diff` pe fișierele relevante. Dacă apar fișiere neașteptate: STOP și raportare înainte de commit. |
| Staging explicit | **nu se folosește `git add .`** când există riscul de a include fișiere nedorite; se adaugă fișierele pe rând |
| Verificări înainte de commit | `npx tsc --noEmit`, `npm run build`, `git diff --check`; la salvări importante și `git fsck --full --strict` |
| Verificare după push | hash-ul branch-ului de pe GitHub = HEAD local; `main` neschimbat |
| Mesaje de commit | în formatul folosit până acum (ex. `Etapa 6.X: <descriere fără diacritice>`); documentația, separat (`docs: ...`) |

## 3. Modul de lucru pe etape

1. **Inspectează codul existent înainte de orice modificare:** trasee, servicii, componente, apelanți.
2. **Respectă strict scopul etapei.** Nu se modifică funcționalități din afara scopului fără justificare. Orice extindere necesară se **semnalează explicit** în raport.
3. **Fără refactorizări generale** sau „curățenie” necerută.
4. **Nu se schimbă aspectul UI** fără motiv tehnic.
5. **Fiecare etapă se testează real** (rulare în browser / Playwright, build, tipuri), nu doar prin inspecție statică. Se face un test de referință înainte și un test după modificare.
6. **Regresia etapelor anterioare este obligatorie** (6.1, 6.2, 6.3, 6.4, 6.5 și următoarele).
7. **Nu se modifică aplicația pentru a ascunde sau elimina un test eșuat.** Dacă un test eșuează din cauza scriptului de test, se corectează scriptul și se spune explicit acest lucru.
8. **Raport la finalul fiecărei etape**, structurat, cu tabele: ce s-a schimbat, fișiere, teste, regresie, probleme rămase, `git diff --stat`, `git status --short`.
9. **STOP după raport.** Nu se trece la etapa următoare fără instrucțiune.
10. **Rapoartele de etapă NU se salvează în Git** decât la cererea explicită a proprietarului.

## 4. Decizii de produs

- **Nu se inventează cerințe și nu se iau decizii de produs** în numele proprietarului.
- Când apare o decizie de produs (ce vede publicul, ce poate face un rol, o funcționalitate nouă, o alternativă de UI): **STOP, se prezintă opțiunile și se cere decizia.**
- Deciziile deschise cunoscute înainte de auditul general: N2, N4 (din auditul 6.5; N3 a fost clarificat tehnic în 6.5, N1 a fost închis în 6.6), **P7**, introducerea unui backend. **M7** (preluarea/asumarea sesizărilor) a fost **decis și implementat în 6.6** (secțiunea 6). Vezi `PROJECT_HANDOFF_CURRENT.md`, G.3.
- **Deciziile post-audit D1–D12 au fost luate de proprietar** (26 septembrie 2026; lista lor este în raportul auditului general). Valorile transmise explicit în instrucțiunea P0: **D9 = A, D10 = A, D11 = B, D12 = A** (secțiunea 6). **Valorile D1–D8 nu au fost transmise în instrucțiunea P0 și nu se presupun**: ele acoperă, între altele, D1 (MVP demonstrativ / pilot, backend), D2 (Master Plan), D3 (= N2) și D4 (= N4). Se cer proprietarului când devin relevante.
- **Nu există Etapa 6.7.** Etapa 6 (inclusiv 6.1–6.6) este închisă; următoarea direcție este Etapa 7 (7A–7F), conform Master Planului proprietarului.

## 5. Onestitate tehnică

- **Protecția din frontend nu se prezintă ca securitate reală server-side.** Sesiunea se poate falsifica, parolele sunt în bundle, `localStorage` se poate modifica, iar gărzile din browser se pot ocoli.
- `localStorage` nu se prezintă ca bază de date centralizată.
- E-mailul simulat nu se prezintă ca trimis.
- Limitările rămase se raportează explicit, nu se omit.

## 6. Decizii de produs deja luate (nu se schimbă fără decizie nouă)

| Decizie | Sursa |
|---|---|
| `super_admin` are toate cele 24 de permisiuni; `primarie_operator` are 13 (sesizări și comunicate complet; Ghid, Apel rapid și Sondaje doar vizualizare) | Etapa 5D |
| Nu există permisiuni noi; `ROLE_PERMISSIONS` rămâne neschimbat | 5D, confirmat în 6.5 |
| **Sesizările nu se șterg**, de niciun rol; nu există `deleteReport` | 6.1 |
| Contorul `TM-XXX` e secvențial și nu se refolosește niciodată | 3B, 6.1, 6.2 |
| Confirmarea unei sesizări apare doar după salvarea efectivă | 6.2 |
| Toate sesizările aprobate pot fi afișate pe hartă conform regulilor de publicare (aprobare + coordonate valide). Identitatea și datele de contact ale autorului nu sunt afișate public. Cetățeanul nu are o opțiune de excludere a sesizării de pe hartă; valoarea istorică `private` nu mai are efect (se publică anonim). Implicit în formular: `public_anonymous` | 6.6 (înlocuiește regula 3E „implicit `private`; pe hartă doar sesizările publice aprobate”) |
| Moderarea publicării și soluționarea internă sunt axe independente | 5C |
| Comunicatele nu au ștergere fizică (doar publicare / dezactivare) | 5B / 5D |
| Ștergerea și resetarea sondajelor sunt permise cu `surveys.create` SAU `surveys.edit` (fără permisiune nouă) | 5D, aplicat și în serviciu în 6.5 |
| Operațiile de reset (`resetToDemo`) cer toate permisiunile de gestionare ale domeniului | 6.5 |
| `submitReport` și `submitVote` rămân operații publice | 6.5 |
| Fără login DEMO 1-click și fără credențiale afișate public | 6.4 |
| Zona publică nu afișează lista sesizărilor; lista completă există doar în Admin | 6.5 (P3) |
| E-mailul rămâne simulat | Etapa 5E |
| Harta publică afișează doar informații descriptive (număr, categorie, descriere, fotografie, poziție, dată). NU afișează fluxul intern de tratare: stadiu, asumare, preluarea Primăriei, responsabili. Acestea rămân exclusiv în Admin | 6.6 |
| N1 închis: „Public” și „Public anonim” sunt ambele publice și nu expun identitatea autorului; identitatea și datele de contact nu sunt niciodată incluse în proiecția publică | 6.6 |
| **M7 / `6A-MOD-08` decis și implementat.** Asumare / preluare disponibilă numai în Admin: `super_admin` poate asuma individual o sesizare și își poate retrage propria asumare; `primarie_operator` NU are asumare individuală | 6.6 |
| Primăria (`primarie_operator`) poate prelua instituțional o sesizare. Preluarea este idempotentă (un al doilea operator nu creează o a doua preluare) și **nu poate fi retrasă** | 6.6 |
| Pot coexista responsabili individuali și preluarea Primăriei; **preluarea Primăriei are prioritate** (în Admin). Se păstrează doar starea curentă, fără istoric de asumări | 6.6 |
| O asumare/preluare a unei sesizări aflate în `new` o trece în `in_progress` (indiferent de istoric); retragerea nu schimbă stadiul; `resolved`/`closed` nu sunt atinse; nu există status nou „asumat” | 6.6 |
| Asumarea/preluarea folosește permisiunea existentă `reports.resolve` (fără permisiune nouă); rolul care acționează pentru Primărie este definit central în `permissionService`. Fiecare cont Admin are un ID unic și stabil | 6.6 |
| Harta publică NU afișează responsabilul, preluarea sau stadiul; datele cetățeanului nu sunt publice (sunt vizibile doar în Admin, pentru `super_admin` și `primarie_operator`) | 6.6 |
| **D9 = A:** notificările către cetățean la evenimentele relevante sunt aprobate; implementarea se face în etapa corespunzătoare din backlog, nu ad-hoc | post-audit |
| **D10 = A:** datele demo se păstrează pentru MVP (marcajele `[DEMO]`, contul `demo@`, datele demo existente) | post-audit |
| **D11 = B:** zona publică nu conține linkuri sau intrări către Admin; ruta `#admin` și funcționalitatea Admin rămân, accesibile prin acces direct | post-audit |
| **D12 = A:** suitele de teste se păstrează permanent în repository (`tests/`), nu în directoare temporare | post-audit |

## 7. Comunicare

- Limba de lucru: **română**.
- Rapoarte concise, precise, structurate cu tabele. Pașii intermediari și verificările se arată, nu doar concluzia.
- Greșelile, inclusiv cele ale asistentului, se corectează explicit.
