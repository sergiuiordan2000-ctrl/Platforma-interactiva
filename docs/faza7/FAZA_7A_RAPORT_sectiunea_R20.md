# FAZA 7A — RAPORT, secțiunea R20 (restaurarea întregului cont de către furnizor)

> Secțiunea raportului 7A pentru R20. Raportul 7A complet se scrie la sfârșitul 7A.

## Decizia

**D7-4 = B (proprietarul, 19.10.2026):** procedura și o comandă minimă de recuperare (`host-restore:recover`). Sesizările și conturile șterse după copia furnizorului rămân limite acceptate (o copie a marcajelor în afara contului — varianta C — nu a fost aleasă).

## Constatările care au motivat-o (din cod, 19.10.2026)

| Problema | Starea dinaintea R20 |
|---|---|
| Numerele TM după o restaurare a contului | contorul și marcajul revin amândouă la valoarea veche; procedura scrisă (`markers:rebuild-counter --at-least N`) **nu funcționa**: comanda refuză când marcajul există, iar marcajul vechi există |
| Coada de e-mail | R19 se aplica numai în `restore:db`; după o restaurare a contului, `outbox:process` (cronul la 2 minute) ar fi retrimis mesajele `queued` / `sending` |
| Sesizările vechi (copii de până la 3 luni) | eliminate numai de rularea următoare a `purge:retention` |
| Corectura M4 | `FAZA_5_1_BACKUP_RESTAURARE.md` §6.8 spunea „M4 nu este încă făcută”; M4 a fost executată la 13.10.2026 |

## Ce s-a schimbat

| Fișier | Schimbare |
|---|---|
| `server/src/db/hostRestore.ts` (nou) | `recoverAfterHostRestore`: verificările înaintea oricărei scrieri; contorul și marcajul ridicate la max(bază, marcaj, N) (marcajul înainte de COMMIT); R19 pe baza vie; reconcilierea intențiilor R18; retenția; auditul `host_restore.recovered`; modul `check` numai cu citiri; raportul fără adrese și fără ID-uri de cont |
| `server/src/db/reportCounter.ts` | `raiseReportCounterAtLeast`: ridicarea contorului (bază + marcaj, înainte de COMMIT, fără coborâre), aici pentru ca regula „un singur loc scrie contorul” (garda statică din `backupSafety.test.ts`) să rămână adevărată |
| `server/src/db/backup.ts` | regulile R19 mutate, neschimbate, în funcția comună `holdOutboxAfterRollback` (folosită de `restore:db` și de comanda nouă); testele R19 existente trec neschimbate |
| `server/src/cli.ts` | comanda `host-restore:recover --at-least N --check \| --confirm` |
| `docs/faza5/FAZA_5_1_BACKUP_RESTAURARE.md` | §8 nou (procedura); §6.7 (procedura greșită, corectată); §6.8 (M4, corectat) |

## Teste

- **Nou:** `d74RestaurareFurnizor.test.ts` (10: F1 + F3 + F7 într-un test, F2, F4, F5, F6 în cinci cazuri, F8).
- **Testele R19 existente** (`d73RestaurareConturiEmail.test.ts`, 21/21) trec neschimbate după mutarea codului R19.
- **Suite (MySQL 8.0.46, local):** serverul 501/501 (0 eșecuri, 0 anulate); suita Python 167/167; `tsc` fără erori; `git diff --check` curat.

**Constatare pe parcurs (spusă deschis):** prima variantă scria `UPDATE report_counter` direct în `hostRestore.ts`; suita completă a picat garda statică „un singur loc emite numere TM” (500/501). Garda **nu** a fost adaptată: ridicarea contorului a fost mutată în `reportCounter.ts`; apoi suita completă 501/501, iar probele de control au fost refăcute pe noua structură (rezultatele de mai jos).

## Probele de control (pe o copie cu `dist`, nu în depozit)

| Probă | Modificarea intenționată | Pică |
|---|---|---|
| P0 | niciuna | nimic (10/10) |
| Ra | contorul nu e ridicat la N | F1, F4, F8 |
| Rb | R19 neaplicat | F1, F4 |
| Rc | `--check` scrie | F4 (amprenta schimbată), F1, F8 |
| Rd | retenția omisă | F1 |
| Re | verificările mutate după scriere | F6 (amprenta schimbată / refuzul lipsă), F1 |

## Ce nu este verificat

- **Pe găzduire:** comanda nu a fost rulată pe staging; o restaurare reală a contului de către furnizor nu a fost probată.
- **Pașii operatorului** (aplicația oprită, cronurile dezactivate) nu pot fi verificați de comandă.
- **CI** (MySQL 8.0 / 8.4, MariaDB 11.4): după publicare.
