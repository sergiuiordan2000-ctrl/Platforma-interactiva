# ETAPA_6_STATUS_FINAL.md — Turnu Măgurele Civic

**Stare la:** 26 septembrie 2026, branch `recovery-etapa-5-0e2cc20`. Ultimul commit de cod: `d89fd1ceba903faed2940d7d59b79fdbaac98d89`. Peste el există doar commit-ul de documentație `docs: finalize project handoff after stage 6.5`. `main` a rămas la `d9bc2c9`, neatins.

Punctul de plecare: `RAPORT_AUDIT_ETAPA_6.md` (6A–6E: 85 de verificări, 70 PASS, 12 FAIL, 3 PARTIAL), cu problemele critice C1–C4 și majore M1–M7.

| Etapă | Status | Commit | Rezultat |
|---|---|---|---|
| 6.1 | FINALIZAT | `3b8d6ca` | C2 rezolvat: ștergerea publică a sesizărilor eliminată (buton, handler și `deleteReport()`); nicio cale de ștergere pentru niciun rol; contorul TM nu scade |
| 6.2 | FINALIZAT | `441afb9` | C1 rezolvat: salvare tranzacțională, `QuotaExceededError` tratat, fără confirmare falsă, formular păstrat, contor TM reconciliat, fără numere duplicate; **17/17 PASS** |
| 6.3 | FINALIZAT | `3c8d952` | C3 rezolvat: `escapeHtml` pe markere, popup-uri și atribute; sursa imaginii acceptată doar ca `data:image` base64 validată; **11/11 PASS** |
| 6.4 | FINALIZAT | inclus în `d89fd1c` | C4 rezolvat: fără login DEMO 1-click, fără credențiale afișate, sesiune validată structural; **17/17 PASS** |
| 6.5 | FINALIZAT | inclus în `d89fd1c` | M3 rezolvat, M4 rezolvat în frontend (P1–P6): gărzi în servicii, fără listă publică de sesizări, `PublicMapReport` redus, `getPublicById`, gărzi pe acțiune în Admin; **19/19 PASS**. P7 și N1–N4 lăsate deschise, conform instrucțiunii |
| 6.6 | IMPLEMENTAT (necomis la data actualizării) | — | M7 / `6A-MOD-08` decis și implementat: asumare individuală `super_admin`; preluare instituțională a Primăriei (prioritară, fără retragere); operatorii fără asumare individuală; harta publică fără responsabil / preluare / stadiu; datele cetățeanului nepublice; sesizările `private` aprobate apar pe hartă anonim; N1 închis |

**Verificări tehnice la salvarea `d89fd1c`:** `tsc` exit 0, build exit 0, `git diff --check` exit 0, `git fsck --full --strict` exit 0. Branch-ul de pe GitHub este identic cu HEAD, verificat și într-o clonă separată.

**Regresia suitei Etapei 6:** 61 PASS, 1 PARTIAL (`6A-MOD-08`), 1 FAIL (`6D-SES-01`), 2 ERROR (scenarii învechite `sec_delete` / `sec_demo`, care caută butoane eliminate intenționat). Nicio regresie nouă.

## Limitări de cunoscut înainte de 6.6

1. **Nu există backend.** Toată protecția este în frontend și poate fi ocolită. Nu se prezintă ca securitate server-side.
2. **`6D-SES-01` rămâne FAIL:** o sesiune falsificată în `localStorage`, cu structură validă, dă acces Admin (M1 / P7).
3. **Credențialele sunt în bundle** (M2).
4. **Sesiunea nu expiră** (m3 / `6D-SES-03` PARTIAL).
5. **N1–N4:** formularea originală din raportul 6.5 a fost recuperată și este consemnată în `PROJECT_HANDOFF_CURRENT.md`, G.3. N2 și N4 sunt decizii de produs deschise, N3 a fost clarificat tehnic în 6.5 (P1/P2), iar N1 a fost închis în 6.6. **P7** este descris în `PROJECT_HANDOFF_CURRENT.md`, G.4: sesiunea client-side falsificabilă (`6D-SES-01`). Este nerezolvat și necesită backend pentru o remediere reală.
6. **M7 / `6A-MOD-08`:** DECIS / IMPLEMENTAT în 6.6 (asumare / preluare, vezi `PROJECT_HANDOFF_CURRENT.md`, D, 6.6). Fără backend, starea asumării nu e sincronizată între browsere.
7. **Încă deschise din auditul Etapei 6:** M5 (ecran alb pe `#sondaje` la date corupte, fără error boundary), M6 (footer-ul afirmă trimitere prin e-mail), S10 (jurnalul de e-mail conține date de contact local), m1 și m4–m17.
8. **Mesajele de refuz** apar doar în Moderare și Comunicate. Ghidul, Apel rapid și Sondaje nu afișează refuzul serviciului (operatorul nu are acolo butoane de modificare).
9. **Scripturile de test Playwright nu sunt în repository.** Regresia 6.1–6.5 trebuie rescrisă de noul chat dacă este necesară.
10. **Rapoartele 6.2–6.5 nu sunt în repository** (doar `RAPORT_AUDIT_ETAPA_6.md` și `RAPORT_ETAPA_6_1.md`). Codul și Git rămân sursa de adevăr.
