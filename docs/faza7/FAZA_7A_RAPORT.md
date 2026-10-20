# FAZA 7A — RAPORT

**Proiect:** Urbis Activ · **Branch:** `faza-5-backend` · **Ultimul commit 7A:** `f6d3456` · **Data:** 20.10.2026
**Stare:** proiect de raport, de aprobat de proprietar. **Checkpoint-ul 7A nu este cerut încă:** lipsește instalarea pe staging cu proba scurtă (`FAZA_7_PLAN.md` §2, „Checkpoint 7A”), care are aprobare separată.
**Baza:** `FAZA_7_PLAN.md` §2; `FAZA_7A_INVENTAR_R.md` (ordinea din §5, aprobată la 15.10.2026).
**Anexe (rămân documentele de detaliu):** `FAZA_7A_RAPORT_sectiunea_D7-3.md` (R18 + R19) și `FAZA_7A_RAPORT_sectiunea_R20.md` (R20).

## 0. Metoda și termenii

- Raportul **adună** ce este deja consemnat: mesajele commiturilor, anexele, documentul de transfer din 15.10.2026, rulările CI de pe GitHub. Pentru acest raport **nu** s-au rulat teste, probe sau audituri noi.
- **Verificat (local):** testul a rulat pe MySQL 8.0.46, în mediul de lucru. **Verificat (CI):** rularea GitHub Actions a commitului, cu 6 joburi: backend Node 20 și Node 24 cu MySQL 8.0 și 8.4, backend Node 24 cu MariaDB 11.4, E2E (Python + Playwright).
- **Simulat:** testul reproduce situația prin alt mijloc decât cel real (de exemplu, o oprire imitată prin omiterea unui pas).
- **Neverificat:** nu există nicio probă, locală, în CI sau pe găzduire.
- Numerele suitelor sunt cele consemnate la commitul respectiv; unde commitul nu menționează o suită, tabelul spune „neconsemnat”.

## 1. Rezumat

| # | Punct | Decizia | Commit | Teste noi | Suita serverului (local) | Suita Python (local) | CI (rularea) |
|---|---|---|---|---|---|---|---|
| 1 | L11 / N1, footerul | D7-1 | `a1c6858` | — (A-06 adaptat) | neconsemnat (fără cod de server) | 167/167; suprafețe publice 9/9 | 38690589379, 6/6 |
| 2 | CL-4, fereastra TOTP | 15.10.2026 | `2366157` | 7 | 420/420, înaintea testului pentru zona 60–61 | neconsemnat | 38709355132, 6/6 |
| 3 | R7 + R9, curățările | 15.10.2026 | `d53b28a` | 9 | 430/430 | neconsemnat | 38736649226, 6/6 |
| 4 | R8, fotografiile orfane | 15.10.2026 | `f2b49bd` | 6 | 436/436 | neconsemnat | 38792906105, 6/6 |
| 5 | R15, conturile `pending` | D7-5 | `c6ea8b7` | 7 | 443/443 | neconsemnat | 38797262092, 6/6 |
| 6 | R18 + R19, restaurarea | D7-3, D7-3a și deciziile de după audit | `cbcd444` (+ `5e9421d`, documentația CI) | 48 | 489/489, înaintea testului D6 | 167/167 | 39302591937, 6/6 (`5e9421d`: 39305003443, 6/6) |
| 7 | R20, restaurarea contului de către furnizor | D7-6 = B (vezi §2) | `2a79d56` | 10 | 501/501 | 167/167 | 39314502351, 6/6 |
| 8 | MINOR-3, mesajele conturilor șterse | B (20.10.2026) | `f6d3456` | 5 | 506/506 | 167/167 | 39373053254, 6/6 |

Toate rulările CI de mai sus sunt verzi pe toate cele 6 joburi, inclusiv MariaDB 11.4 (verificat în GitHub Actions la 20.10.2026). `main` = `d9bc2c9`, neatins. **Staging-ul rulează `32e082e`: niciun commit 7A nu este instalat.** Nicio migrare nouă în 7A.

## 2. Deciziile

| Decizia | Conținutul | Data | Starea |
|---|---|---|---|
| D7-0 | planul Etapei 7 | 15.10.2026 | aprobată |
| D7-1 | textul nou din footer | 15.10.2026 | aprobată, implementată (`a1c6858`) |
| CL-4 | fereastra mobilă de 60 de minute | 15.10.2026 | aprobată, implementată (`2366157`) |
| R7 + R9 | termenele curățărilor; sesiunile de cetățean: numai cele revocate (A); lunile la sfârșit de lună: limitate la ultima zi, **numai pentru sesiuni** (A); R9 prin `purge:retention` | 15.10.2026 | aprobate, implementate (`d53b28a`) |
| R8 | condițiile ștergerii fișierelor orfane | 15.10.2026 | aprobată, implementată (`f2b49bd`) |
| D7-5 | R15: 45 de zile (B); fără ștergere cu blocare activă (A) | 15.10.2026 | aprobată, implementată (`c6ea8b7`) |
| D7-3, D7-3a | R18 = A, fără termen de expirare (A); R19 = B, inclusiv `on_hold`; apoi deciziile de după audit (intenții, B, A, B, D; ordinea inițializării, A) | 16 și 19.10.2026 | aprobate, implementate (`cbcd444`); detaliile în anexa D7-3 |
| **D7-6** | R20: procedura + comanda `host-restore:recover` (B) | 19.10.2026 | aprobată, implementată (`2a79d56`). **Numerotarea:** decizia a fost notată inițial „D7-4 = B” (inclusiv în mesajul commitului `2a79d56`, care nu se rescrie); D7-4 rămâne rezervată matricei CI din plan. Identificatorul D7-6 este înregistrat aici, ca D7-5 în inventar (corectura aprobată la 20.10.2026) |
| MINOR-3 | mesajele de stadiu fără autor: anulate la restaurare, refuzate la reîncercare (B) | 20.10.2026 | aprobată, implementată (`f6d3456`) |
| **D7-2** | RA-6, cazul C: re-codarea fotografiilor sau păstrarea limitării | — | **de confirmat formal.** Recomandarea din plan: limitarea rămâne pentru MVP, ca risc deschis, explicit în registrul limitărilor, cu reevaluare după pilot. **Nu este o decizie aprobată.** Până la confirmare, cazul C rămâne risc deschis, fără schimbare de cod |

## 3. Punctele 7A

### 3.1 L11 / N1 — footerul (`a1c6858`)
Fraza „Trimiterea automată pe e-mail către autoritatea locală nu este activă în această versiune.” devenise falsă din Faza 5. Textul nou (D7-1) rămâne adevărat și cu fluxul oprit sau simulat și distinge transmiterea de înregistrarea oficială. **Adaptarea testului A-06** (`tests/security/test_suprafete_publice.py`), explicată în comentariu: cere textul nou, lipsa frazei vechi și delimitarea „nu reprezintă registratura oficială”. Probe de control: 2 (fraza veche; delimitarea scoasă), detectate.

### 3.2 CL-4 — codurile TOTP greșite (`2366157`)
Pragul RA-4 (3 coduri greșite → blocare 15 minute) se număra pe o oră aliniată la ora fixă; acum, pe suma ultimelor 61 de găleți de un minut din `rate_limits`, fără schimbarea schemei. Blocarea, revocarea și resetarea neschimbate; `reauditB.test.ts` nemodificat, 6/6. Probe de control: 7, detectate.

### 3.3 R7 + R9 — curățările (`d53b28a`)
`purge:retention` șterge acum: rândurile expirate din `rate_limits`, codurile de cetățean expirate, `rejected_attempts` după 30 de zile, sesiunile încheiate după 6 luni calendaristice (cele de cetățean nerevocate rămân) și, prin `purgePow`, provocările ALTCHA expirate (R9 rezolvată fără acțiune pe găzduire: cronul `purge:retention` există). **Adaptarea `surveys.test.ts`:** blocul de retenție a sondajelor (care mută ceasul cu 186 de zile) a fost mutat neschimbat la final, fiindcă noua curățare a sesiunilor ștergea sesiunile testelor următoare; blocul trece și rulat singur. Probe de control: 13, detectate.

### 3.4 R8 — fotografiile orfane (`f2b49bd`)
`purge:retention` (pasul 13) șterge un fișier din `STORAGE_DIR/photos` numai dacă este fișier obișnuit, are numele în forma generată, lipsește din `report_photos` și este mai vechi de o oră; legăturile simbolice și directoarele nu se ating; cazul invers se numără, fără acțiune. Probe de control: 10 (K1–K9, K3b), detectate.

### 3.5 R15 / D7-5 — conturile `pending` (`c6ea8b7`)
`purge:retention` (pasul 14) șterge un cont `pending` creat cu peste 45 de zile în urmă, fără cod valabil și fără blocare activă (aceeași funcție ca la cererea unui cod). Limitele pe adresă nu se resetează. **Curățenia de test în `d75ConturiPending.test.ts`** (comentarii în test): două teste își curăță starea, fiindcă testele următoare mută ceasul înainte și numără exact conturile șterse. Probe de control: 11, detectate. Conturile `pending` existente pe staging nu au fost atinse.

### 3.6 R18 + R19 — restaurarea (`cbcd444`, `5e9421d`)
Rezumat: marcaje de ștergere a conturilor, scrise ca intenții înainte de COMMIT și confirmate după COMMIT, cu reconciliere; la restaurare, codurile de cont neplecate devin `cancelled`, iar mesajele sesizărilor neplecate devin `failed` („reținut la restaurare”), fără retrimitere automată; pierderea directoarelor R18 este refuzată înaintea sincronizării contorului TM. **Deciziile, fișierele, testele adaptate, probele de control și limitele: anexa `FAZA_7A_RAPORT_sectiunea_D7-3.md`.** Procedura: `FAZA_5_1_BACKUP_RESTAURARE.md` §7. MINOR-3, constatarea din auditul final al acestei runde: §3.8.

### 3.7 R20 — restaurarea contului de către furnizor (`2a79d56`)
Decizia D7-6 = B. Rezumat: comanda `host-restore:recover --at-least N --check | --confirm` ridică contorul TM și marcajul, aplică R19 pe baza vie, reconciliază intențiile R18 și aplică retenția; procedura greșită din §6.7 și starea M4 din §6.8 au fost corectate. **Detaliile, probele Ra–Re și limitele: anexa `FAZA_7A_RAPORT_sectiunea_R20.md`.** Procedura: `FAZA_5_1_BACKUP_RESTAURARE.md` §8. CI: rularea 39314502351, verde 6/6.

### 3.8 MINOR-3 — mesajele de stadiu ale conturilor șterse (`f6d3456`)
Constatarea din auditul final R18–R19: după R19, un mesaj de stadiu `sending` al unui cont șters devenea `failed` și putea fi reîncercat din Admin către adresa unui titular care își ștersese contul. Acum (decizia B, 20.10.2026), pentru `citizen_status_update` al unei sesizări fără autor (`author_account_id IS NULL`):
- la restaurare și la recuperarea R20 (funcția comună `holdOutboxAfterRollback`), mesajul neplecat (`queued`, `sending`, `on_hold`) devine `cancelled`, cu motivul „anulat la restaurare (R19): contul autorului a fost șters”, și nu apare printre mesajele reținute;
- ruta de reîncercare din Admin îl refuză cu 409, „contul autorului a fost șters”; aceeași condiție este și în `UPDATE`, pentru ștergerea contului în timpul cererii.

`registry_notification` rămâne reîncercabilă; mesajele cu autor existent se comportă ca înainte. Procedura: `FAZA_5_1_BACKUP_RESTAURARE.md` §7.3 (adusă la zi la 20.10.2026).

**Teste:** `d73Minor3MesajeConturiSterse.test.ts` (5: M1 restaurarea; M2 recuperarea R20, inclusiv a doua rulare, cu numai o intrare de audit în plus; M3, M3b, M3c ruta).

**Probe de control** (pe o copie cu `dist`; P0 trece):

| Probă | Modificarea intenționată | Pică |
|---|---|---|
| Pm1 | fără anularea mesajelor fără autor (restaurare / R20) | M1, M2 |
| Pm2 | fără protecțiile din ruta de reîncercare (verificarea prealabilă **și** condiția din `UPDATE`) | M3 |
| Pm3 | garda blochează și notificarea către Primărie | M3c |
| Pm4 | anularea și pentru autorii existenți | M1, M2, M3b |

**Limita:** condiția din `UPDATE` nu este probată separat. Pm2 le elimină pe amândouă deodată, iar niciun test nu șterge contul între verificarea prealabilă și `UPDATE`. Comportamentul în această fereastră de concurență este **neverificat**.

## 4. Adaptările de teste existente (toate explicate în test)

| Test | Commit | Adaptarea | Motivul |
|---|---|---|---|
| A-06, `test_suprafete_publice.py` | `a1c6858` | textul nou al footerului, lipsa frazei vechi, delimitarea explicită | D7-1 |
| `surveys.test.ts` | `d53b28a` | blocul de retenție mutat neschimbat la final | curățarea sesiunilor (R7) ștergea sesiunile testelor următoare |
| `d75ConturiPending.test.ts` (test nou) | `c6ea8b7` | curățenia stării în două teste | testele următoare numără exact conturile șterse |
| `backupSafety`, `counterWatermarkA1`, `restoreMarkersFormat`, `markers` | `cbcd444` | numai lista fișierelor din `BACKUP_DIR` | apar directoarele R18 și martorul |
| `d73RestaurareConturiEmail` (T3, T5, T10, T12, T14) | `cbcd444` | detaliile în anexa D7-3 | trecerea la intenții + reconciliere |

Testele R19 existente au trecut **neschimbate** după mutarea codului R19 (`2a79d56`) și după MINOR-3 (`f6d3456`). Gărzile statice nu au fost slăbite; la R20, garda „un singur loc emite numere TM” a impus mutarea codului, nu adaptarea testului (anexa R20).

## 5. Probele de control greșite la prima încercare (spuse deschis)

| Punct | Ce a fost greșit | Ce s-a făcut |
|---|---|---|
| CL-4 | prima rulare a probelor s-a făcut pe o copie fără `dist`; copia pica în întregime, deci proba nu dovedea nimic | reluate pe o copie cu `dist`, începând cu P0 |
| R8 | probele K3–K5 construite greșit la prima încercare | refăcute (consemnat în documentul de transfer, fără detalii în depozit) |
| R18 + R19 | K6, prima variantă Na2, prima rulare N (ajutătorul de test lăsa tranzacția deschisă), prima variantă I9b | refăcute; detaliile în anexa D7-3 |
| R20 | probele făcute pe prima structură (contorul scris direct în `hostRestore.ts`) | refăcute după mutarea în `reportCounter.ts` (anexa R20) |

## 6. Verificat, simulat, neverificat

| Ce | Starea | Dovada sau motivul |
|---|---|---|
| comportamentul punctelor 1–8 pe MySQL 8.0 / 8.4 și MariaDB 11.4, Node 20 / 24 | **verificat (CI)** | rulările din §1, 6/6 fiecare |
| suita Python la `f6d3456` | **verificat (local și CI)** | 167/167 local; jobul E2E verde |
| CL-4: suita completă locală după testul pentru zona 60–61 | **verificat numai prin CI** | local, ultima suită completă consemnată (420/420) a rulat înaintea acelui test |
| R18 + R19: suita completă cu testul D6 | **verificat numai prin CI** | local, după D6, au rulat numai testele țintite (anexa D7-3) |
| MariaDB 11.4 (blocările la reconciliere, `innodb_lock_wait_timeout`) | **verificat numai prin CI** | local s-a testat numai pe MySQL 8.0.46 |
| oprirea procesului după COMMIT, înaintea mutării intenției R18 (I3) | **simulat** | prin omiterea mutării; oprirea reală este testată numai înainte de COMMIT (I2) |
| restaurarea contului de către furnizor (R20) | **simulat** | în teste, starea veche este readusă din copie; o restaurare reală a furnizorului nu a fost probată |
| T14, I10 și garda „un singur loc emite numere TM” | **verificate static** | verifică textul codului, nu comportamentul |
| `fsync` la o cădere de curent | **neverificat** | nu poate fi verificat prin teste |
| MINOR-3: condiția din `UPDATE`, în fereastra de concurență | **neverificat** | §3.8 |
| comanda `host-restore:recover` pe găzduire | **neverificat** | nu a rulat pe staging |
| pașii operatorului la R20 (aplicația oprită, cronurile dezactivate) | **neverificat** | comanda nu îi poate verifica |
| pașii noi din `purge:retention` (R7, R8, R9, R15) rulați de cronul de pe staging | **neverificat** | commiturile nu sunt instalate |
| prima pornire pe staging cu directoarele R18 (crearea martorului peste un `BACKUP_DIR` de dinaintea R18) | **verificat local (T5), neverificat pe găzduire** | commiturile nu sunt instalate |

## 7. Contradicții și lacune găsite la redactare (corectate la 20.10.2026)

Găsite la prima redactare a raportului și corectate în aceeași rundă documentară, la 20.10.2026. Fără schimbări de cod și fără teste.

| # | Constatarea | Corectura |
|---|---|---|
| 1 | **D7-4 folosit de două ori:** în plan (`FAZA_7_PLAN.md` §1 rândul 20, §5, §9), D7-4 este matricea CI (7E, neluată); decizia R20 a fost notată tot „D7-4 = B” (`2a79d56`, anexa R20, `FAZA_5_1_BACKUP_RESTAURARE.md` §8, handoff §0B). Greșeala de numerotare aparține lui Claude | D7-4 rămâne matricea CI; decizia R20 devine **D7-6** (§2), cu nota de corespondență în anexa R20, `FAZA_5_1` §8 și handoff §0B. Mesajul commitului `2a79d56` nu se rescrie |
| 2 | **`FAZA_5_1_BACKUP_RESTAURARE.md` §7.3 nu cuprindea MINOR-3** (spunea că toate mesajele `citizen_status_update` neplecate devin `failed`) | rând nou în tabelul §7.3 (`cancelled`, cu motivul); paragraf despre refuzul reîncercării (409); propoziție la pasul 8 al procedurii; testul MINOR-3 în §7.4 |
| 3 | **`PROJECT_HANDOFF_CURRENT.md` §0B depășit** (R20 „necommitat”, MINOR-3 „decizie de produs”) | §0B adus la zi: R20 și MINOR-3 commitate, cu CI; raportul 7A; pașii următori; punctele deschise |
| 4 | **Anexele trimiteau la un raport „de scris la sfârșitul 7A”;** anexa R20 trecea CI-ul ca „după publicare” | trimiteri explicite la acest raport în ambele anexe; în anexa R20, rularea 39314502351 |

## 8. Puncte deschise care trec mai departe

Le consemnez aici fără să le transform în sarcini. Fiecare intră în lucru numai cu decizia proprietarului, la momentul prevăzut.

| Punct | Unde a fost consemnat | Momentul prevăzut |
|---|---|---|
| D7-2 (RA-6, cazul C), de confirmat formal | plan §9; §2 de mai sus | înaintea checkpoint-ului 7A |
| instalarea commiturilor 7A pe staging (`32e082e` → `f6d3456`), cu proba scurtă | plan §2, checkpoint 7A | aprobare separată |
| R6, R14, R16: descriere lipsă | inventar §1 | fără acțiune până la o sursă mai bună |
| nota R1: marcajul de sesizare scris înainte de COMMIT rămâne după o tranzacție anulată; numele fișierelor (ID-uri interne) în mesajele despre marcajele corupte | anexa D7-3, „Notă separată” | decizie proprie, separată |
| retenția auditului administrativ: același calcul al lunilor la sfârșit de lună, neschimbat (corectura s-a făcut numai pentru sesiuni) | decizia R7, 15.10.2026 | de semnalat la momentul potrivit |
| R20, limitele acceptate: ștergerile de sesizări și de conturi făcute după copia furnizorului reapar; recuperarea poate rămâne parțială dacă reconcilierea sau retenția eșuează după prima tranzacție | anexa R20; `FAZA_5_1` §8 | limite acceptate (varianta C nealeasă) |
| R18: o ștergere confirmată, nereconciliată înainte de pierderea bazei, poate face contul să reapară (restaurarea o raportează) | anexa D7-3 | limită acceptată |
| R12 (jurnalul aplicației pe găzduire) | inventar | 7E |
| R13 (indiciu L1) | inventar | poarta „date reale” |
| matricea CI (D7-4 din plan) | plan §9 | 7E |

## 9. Checkpoint-ul 7A (`FAZA_7_PLAN.md` §2)

| Condiția | Starea |
|---|---|
| testele serverului și suita Python verzi, local și în CI | îndeplinită la `f6d3456` (local: 506/506 și 167/167; CI 39373053254, 6/6) |
| probele de control ale testelor noi | făcute pentru fiecare punct (§3, anexele) |
| instalarea pe staging, cu proba scurtă | **neîndeplinită**: urmează, cu aprobare separată |
| raportul `FAZA_7A_RAPORT.md` | acest document; de aprobat; de completat cu rezultatul instalării pe staging |
| D7-2 | **de confirmat formal** |
