# ETAPA 7 — FINALIZARE MVP 1.0: PLANUL

**Proiect:** Urbis Activ (Turnu Măgurele Civic) · **Branch:** `faza-5-backend` (ultimul commit de cod `32e082e`) · `main` = `d9bc2c9`, neatins · **Data:** 15.10.2026
**Staging (`test.urbisactiv.ro`):** rulează `32e082e`, versiunea la care s-a închis Faza 6.
**Stare:** **aprobat de proprietar la 15.10.2026** (D7-0), cu cele trei clarificări (inventarul R1–R20, RA-6 cazul C, producția și CI). Aprobarea privește ordinea de lucru; planul nu autorizează nicio implementare. Fiecare subetapă începe numai cu aprobarea proprietarului (Planul v1.1, „Reguli de execuție”).

**Baza:**
- Planul de Lucru Comun v1.1, „Etapa 7 — Finalizare MVP 1.0” și „Poarta «date reale» și MVP 1.0 READY” (documentul este la proprietar, în afara depozitului; textul a fost dat lui Claude la 15.10.2026), citit cu `docs/AMENDAMENTE_PLAN_V1_1_SI_MASTER_PLAN.md`;
- `docs/faza6/FAZA_6_RAPORT.md`: decizia de checkpoint din 14.10.2026 (Faza 6 închisă la `32e082e`; Listele 4 și 6 preluate în Etapa 7);
- `docs/faza6/FAZA_6_REAUDIT_SECURITATE.md` (CL-4, N1–N4, S12);
- `PROJECT_RULES_AND_DECISIONS.md` și designul înghețat din `docs/faza4/` (se modifică numai prin amendament aprobat).

---

## 0. Reguli pentru Etapa 7

1. **Ordinea și numerotarea** sunt cele din Planul v1.1: 7A, 7B, 7C, 7D, 7E, poarta „date reale”, 7F.
2. **Fiecare subetapă:** verificare → teste → regresie → checkpoint, cu aprobarea proprietarului. Un singur agent implementează o subetapă; celălalt o poate audita după încheiere, fără să modifice simultan aceeași subetapă sau același depozit.
3. **Lansarea publică nu este aprobată.** MVP 1.0 READY se declară numai după trecerea 7F; 7F se execută numai după trecerea porții „date reale”.
4. Regulile permanente rămân în vigoare: commit și push numai cu aprobare explicită; `main` neatins; fișierele adăugate explicit; testele nu se falsifică, iar testele noi au probă de control pe o copie; fiecare acțiune pe găzduire are aprobare separată; în depozit nu intră secrete, adrese de e-mail, numele contului cPanel sau adrese IP complete; P7 / `KNOWN_FAILS` se modifică numai cu aprobarea proprietarului (`tests/run_all.py`: `KNOWN_FAILS = {}`).
5. **Sesizările se publică direct, fără moderare** (amendamentul la fluxul critic din Planul v1.1; decizia A-2).
6. Deciziile de produs sunt ale proprietarului. Unde planul cere o decizie, ea apare în §9, cu variante și recomandare, și nu se implementează înainte de răspuns.

## 1. Inventarul punctelor preluate din Faza 6

Toate punctele de mai jos sunt deja consemnate în documentele Fazei 6; aici primesc numai subetapa propusă.

| Nr. | Punctul | Sursa | Subetapa propusă |
|---|---|---|---|
| 1 | CL-4: limita RA-4 (3 coduri TOTP greșite) pe fereastră aliniată la ora fixă | reauditul, RA-4; raportul, Lista 4 | 7A |
| 2 | N1 / L11: footerul spune public că trimiterea către Primărie „nu este activă”; afirmația este falsă din Faza 5 | reauditul, N1; raportul, L11 | 7A (înainte de pilot) |
| 3 | L9: curățările lipsă (R7: `rate_limits`, coduri expirate, `rejected_attempts`, sesiuni; R8: fotografii orfane; R9: provocările ALTCHA fără sarcină cron) | raportul, L9 | 7A |
| 4 | L8: deciziile pentru R18 (contul șters reapare după restaurare) și R19 (e-mailurile din coadă retrimise după restaurare) | raportul, L8 | 7A (decizie, apoi cod) |
| 5 | L7 / R20: restaurarea întregului cont de către furnizor („numai arhiva”) | raportul, L7 | 7A (procedura); 7D (documentul) |
| 6 | RA-6, cazul C: re-codarea fotografiilor | raportul, Lista 4 | decizie de produs (§9, D7-2) |
| 7 | celelalte constatări R7–R19 rămase (în afară de R12, R17, R18, R19, care au rând propriu) | handoff, §0A | 7A: **inventarul complet se reface la începutul subetapei** (în depozit nu există o listă completă R1–R20) |
| 8 | A-21: afișarea pe mobil (bannerul hărții, ținte sub 44 px, tab-urile și mesajele Admin) | raportul, Lista 3 | 7B |
| 9 | O3: confirmarea la acțiunile definitive din interfață | handoff, §0A | 7B |
| 10 | probele de pe telefon și cu mai mulți utilizatori (făcute până acum de un singur tester, de pe calculator) | raportul, Lista 3 | 7B (telefon); 7F (acceptanța) |
| 11 | A-24: declarații nefolosite, cod mort (`tsc --noUnusedLocals --noUnusedParameters`) | raportul, Lista 3 | 7C |
| 12 | N3: `autoprefixer` nefolosit în `devDependencies` | reauditul, N3 | 7C |
| 13 | L5: pagina de diagnostic scoasă din cod, printr-un commit separat | raportul, L5; amendamentul D-2 | 7C |
| 14 | N2: `README.md` descrie sesizările ca „moderate” | reauditul, N2 | 7D |
| 15 | `FAZA_5_5B_GHID.md` descrie încă staging-ul vechi | jurnalul staging-ului, §5 | 7D |
| 16 | N4: documentele spun „A-01…A-27”; auditul are A-01…A-32 | reauditul, N4 | 7D |
| 17 | L4: producția pe `urbisactiv.ro`, cu `http` → `https` (301) și proba `curl` | raportul, L4 | 7E |
| 18 | L10 / R12: jurnalul aplicației pe găzduire (ieșirea obișnuită negăsită) | raportul, L10 | 7E |
| 19 | L6: aplicația Google trecută din „Testing” în producție | raportul, L6 | 7E (tehnic); poarta (paginile publice) |
| 20 | matricea CI (joburile MySQL și Node 20 față de producția MariaDB); suita Python numai pe MySQL 8.4 | handoff, §0A; raportul, Lista 3 | 7E (decizie, §8, D7-4) |
| 21 | verificarea telefonului în Brevo (amânată) | jurnalul staging-ului, §5 | 7E |
| 22 | L1: politica de confidențialitate (copiile furnizorului, circa 3 luni; jurnalul de accesări, o lună, cu IP) | raportul, L1; jurnalul staging-ului, observația 11 | poarta „date reale” |
| 23 | L2: acordul Primăriei pentru e-mailul real; modul `live` | raportul, L2 | poarta „date reale” |
| 24 | L3: datele demo (D10 V2: producția pornește curată; contul `demo@` nu se păstrează) | raportul, L3; `PROJECT_RULES_AND_DECISIONS.md` §11.8 | poarta „date reale” |

**Limitările din Lista 4 a raportului Fazei 6** (varianta B fără IP, RA-5, sesiunea de cetățean fără expirare pe server etc.) rămân **limitări acceptate**. Etapa 7 nu le redeschide, cu excepția CL-4 (punctul 1) și a cazului C (punctul 6), care au fost transferate explicit.

## 2. 7A — Corectarea problemelor rămase

**Conținut:** punctele 1–5 și 7 din §1.
- **CL-4:** limita de 3 coduri TOTP greșite numărată pe ultimele 60 de minute (fereastră mobilă), nu pe ora fixă; test nou care pică pe codul actual (trecerea orei), cu probă de control.
- **N1 / L11:** textul din footer reformulat; textul exact îl alege proprietarul (§9, D7-1). Este o modificare de text în interfață, consemnată ca amendament dacă atinge designul înghețat.
- **L9:** curățările lipsă, ca sarcini programate sau ca pas al sarcinilor existente, cu teste pentru fiecare tabel.
- **L8:** codul pentru R18 și R19 numai după decizia proprietarului (§9, D7-3).
- **RA-6, cazul C:** dacă se păstrează limitarea (D7-2), ea rămâne **explicit** în registrul limitărilor (raportul Fazei 6, Lista 4, și raportul 7A), ca risc deschis; păstrarea ei nu înseamnă că problema a fost eliminată.
- **L7:** procedura scrisă pentru o restaurare făcută de furnizor (fără restaurare fără acordul proprietarului; după ea, `markers:rebuild-counter --at-least N`).
- **Primul pas al subetapei:** inventarul complet R1–R20, prezentat proprietarului și aprobat **înainte de cod**. Pentru fiecare constatare: identificatorul, starea actuală, dovada, riscul și decizia necesară. Constatările consemnate ca rezolvate nu se redeschid fără o dovadă concretă; cele neverificate **nu** devin rezolvate prin simpla trecere în inventar (rămân „neverificate” până la o dovadă).

**Checkpoint 7A:** testele serverului și suita Python verzi, local și în CI; probele de control ale testelor noi; instalarea pe staging cu proba scurtă (aprobare separată); raportul `FAZA_7A_RAPORT.md`.

## 3. 7B — UI/UX și mesajele de eroare / refuz

**Conținut:** punctele 8–10 din §1, plus:
- inventarul mesajelor de eroare și de refuz văzute de utilizator (cetățean, Admin, vizitator), cu verificarea că niciunul nu expune detalii interne (în continuarea RA-10);
- proba pe telefon, pe staging: harta, depunerea unei sesizări cu fotografie, autentificarea cetățeanului, votul.
- Modificările de interfață care schimbă designul înghețat din Faza 4 se fac numai prin amendament aprobat.

**Checkpoint 7B:** lista constatărilor A-21 / O3, cu capturi de pe telefon (fără date personale); remedierile aprobate, testate și instalate pe staging; `FAZA_7B_RAPORT.md`.

## 4. 7C — Curățarea codului

**Conținut:** punctele 11–13 din §1.
- `tsc --noUnusedLocals --noUnusedParameters` pe frontend și pe server; fiecare declarație eliminată este verificată (nu se elimină cod folosit dinamic);
- `autoprefixer` scos, cu build-ul și testele refăcute;
- **pagina de diagnostic (L5) scoasă într-un commit separat**, cu testele aferente adaptate și explicate.
- Fără modificări de comportament: suitele trebuie să rămână identice ca număr de teste trecute, cu excepția testelor paginii de diagnostic, explicate în raport.

**Checkpoint 7C:** suitele verzi; diferența de comportament zero (cu excepția explicată); `FAZA_7C_RAPORT.md`.

## 5. 7D — Documentația tehnică minimală

**Conținut:** punctele 14–16 din §1, plus documentul de exploatare minimal pentru producție:
- instalarea unei versiuni noi (pașii folosiți pe staging, intervențiile 55–59 și 72–76);
- backup și restaurare (`docs/faza5/FAZA_5_1_BACKUP_RESTAURARE.md`), cu procedura L7;
- sarcinile programate, comenzile din „Run JS script” și ce face fiecare;
- rotirea secretelor și a cheii TOTP (documentele din `docs/faza5/`);
- `README.md` corectat; `PROJECT_HANDOFF_CURRENT.md` adus la zi.

**Checkpoint 7D:** documentele revizuite de proprietar (diff înainte și după, aprobat).

## 6. 7E — Build final, găzduire, CI și testarea finală

**Conținut:** punctele 17–21 din §1.
- **Producția** pe `urbisactiv.ro`: aplicația separată de staging (bază, director de date și fișier de setări proprii), separată de contul `electrovolt.ro`; `http` → `https` (301); antetele de securitate verificate cu `curl`; fără `noindex` și fără lacăt numai la decizia de lansare;
- jurnalul aplicației (L10 / R12) lămurit, eventual cu furnizorul;
- aplicația Google: partea tehnică pentru producție (adresele de întoarcere, domeniul);
- matricea CI după decizia D7-4; suita completă la versiunea finală;
- **versiunea candidată**: un commit fixat, construit dintr-o clonă curată, instalat întâi pe staging, apoi în producție.
- **Producția rămâne fără date reale și închisă publicului** până la trecerea porții. **Instalarea tehnică nu activează accesul public și nu autorizează e-mailurile reale:** lacătul de acces rămâne pus, `noindex` rămâne, iar modul e-mail rămâne `simulated` sau `allowlist`; scoaterea lor cere decizii separate (poarta, apoi lansarea).
- **Matricea CI (D7-4) se decide înainte de rularea finală**, ținând cont și de costul rulărilor GitHub Actions.

**Checkpoint 7E:** producția rulează versiunea candidată, cu `health`, backup și o restaurare de probă; CI verde la acel commit; `FAZA_7E_RAPORT.md`.

## 7. Poarta „date reale” (înainte de 7F)

Condițiile din Planul v1.1, cu punctele 22–24 din §1:

| Condiția | Ce înseamnă concret | Cine |
|---|---|---|
| verificarea legală / GDPR | politica de confidențialitate și informarea (L1), inclusiv copiile furnizorului și jurnalul de accesări; paginile cerute de Google pentru producție | proprietarul (cu consultanță, dacă o alege); Claude poate pregăti ciorna |
| acordul Primăriei pentru e-mailul real | acordul scris (A17-1); apoi modul `live`, adresa de destinație și proba unei trimiteri reale | proprietarul |
| datele demo (D10 V2) | producția pornește curată; fără contul `demo@`; verificare în bază după instalare | Claude pregătește verificarea; proprietarul o execută |
| D8-8 | TOTP obligatoriu pentru `super_admin` în producție (implementat; de verificat pe contul real de producție) | proprietarul |

**Poarta se trece numai prin decizia proprietarului**, consemnată în `FAZA_7_POARTA_DATE_REALE.md`.

## 8. 7F — Testul final de acceptanță

**Conținut:** fluxul critic (amendat: cetățean cu cont → bază → hartă imediat → e-mail către Primărie, numai la cerere → `în analiză` → `rezolvată`), executat **în producție**, după poartă, de proprietar și de cel puțin încă un utilizator, de pe calculator și de pe telefon; criteriile de acceptare se scriu și se aprobă înainte de execuție.

**MVP 1.0 READY** se declară numai după trecerea 7F, prin decizia proprietarului. Lansarea publică rămâne o decizie separată.

## 9. Deciziile cerute proprietarului

Se pun câte una, la începutul subetapei în care sunt necesare.

| Nr. | Decizia | Când | Recomandarea lui Claude |
|---|---|---|---|
| D7-0 | aprobarea acestui plan (eventual cu modificări) | acum | — |
| D7-1 | textul nou din footer (N1 / L11) | 7A | o formulare care spune că trimiterea către Primărie se face numai la cererea cetățeanului și că platforma nu este oficială |
| D7-2 | RA-6, cazul C: re-codarea fotografiilor (elimină orice date ascunse, dar schimbă imaginea și cere o bibliotecă de imagini) sau limitarea rămâne | 7A | limitarea rămâne pentru MVP, ca risc deschis, explicit în registrul limitărilor; reevaluare după pilot |
| D7-3 | R18 și R19: ce se întâmplă după o restaurare cu conturile șterse și cu e-mailurile din coadă | 7A | prezentate cu variante la începutul 7A |
| D7-4 | matricea CI: se păstrează joburile MySQL și Node 20 sau CI se aliniază la producție (MariaDB 11.4, Node 24); se decide înainte de rularea finală | 7E | aliniere la producție, cu un singur job MySQL păstrat pentru dezvoltarea locală |

## 10. Ce nu face acest plan

- Aprobarea planului înseamnă aprobarea **ordinii de lucru**, nu implementarea automată a subetapelor: fiecare începe numai cu aprobarea proprietarului, urmată de verificare, teste, regresie și checkpoint; deciziile D7-1…D7-4 se iau la momentul prevăzut.
- Instalările pe staging și în producție, acțiunile pe găzduire, commiturile și push-urile rămân supuse aprobărilor separate.

- Nu autorizează implementarea, instalarea pe staging sau în producție, trimiterea de e-mailuri reale sau lansarea.
- Nu redeschide limitările acceptate în Faza 6 (în afara punctelor 1 și 6 din §1).
- Nu modifică Planul v1.1 sau Master Planul (originalele rămân la proprietar).
