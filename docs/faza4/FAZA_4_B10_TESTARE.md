# FAZA 4 — B10: STRATEGIA DE TESTARE

**Proiect:** Turnu Măgurele Civic · **Data:** 27.09.2026 · **Stare:** proiect, neînghețat
**Bază:** suita existentă `tests/` (Python + Playwright, 102/103, P7 = FAIL cunoscut); G5 (B-2: CI pe Node 20 + 24, MySQL 8.0 + 8.4); testele de staging din analiza N-2 v3 §6; deciziile Fazei 3
**Revizia 1 (SET-01, 27.09.2026):** modificările sunt marcate **[SET-01]** (vezi `FAZA_4_DECIZII_NOI.md` §0 și §C).
**Revizia 2 (SET-A-01, 27.09.2026):** D8–D31 și A-1…A-9; modificările sunt marcate **[SET-A-01]** (§0.3, §D).
**Revizia 3 (SET-A-02, 27.09.2026):** teste pentru 2.1–2.15 și corecturile 1–13 (în special 4, 12, 13); marcaj **[SET-A-02]**.

---

## 1. Niveluri și instrumente

| Nivel | Ce testează | Instrument propus | Unde rulează |
|---|---|---|---|
| **Unitar** | funcții pure: validări Zod, formatarea `TM-XXX`, rotunjirea coordonatelor, verificarea UAT, **[SET-A-02]** geocodarea (cu serviciu simulat), codurile de recuperare TOTP, hash-ul IP, HMAC-ul de participare, parolele (`scrypt`), TOTP, filtrul EXIF, semnăturile imaginilor, șabloanele de e-mail | **`node:test`** (inclus în Node; fără dependență). Motivul: Vitest 5 cere Node ≥ 22.12, incompatibil cu matricea Node 20 (B-2); vezi **DN-23**. | local + CI |
| **Integrare DB** | tranzacții, constrângeri (`UNIQUE`, `CHECK`, FK `RESTRICT`), migrații pe DB gol + idempotente, seed-uri | `node:test` + MySQL real (CI: containere 8.0 și 8.4) | CI |
| **API** | fiecare endpoint din B2: coduri, validare, permisiuni, efecte în DB | `node:test` + `fastify.inject` (fără port) + MySQL real | CI |
| **E2E** | fluxurile din browser: sesizare, hartă, sondaje, Admin | **suita Playwright existentă**, adaptată progresiv | local + CI + staging |
| **Securitate** | suprafețele publice, P7 pe server, CSRF, antete, scurgeri de date | suita `security/` extinsă + teste API dedicate | CI + staging |
| **Staging** | izolarea față de Electrovolt, deploy, restart, cron, backup (T-ISO, T-RUN, T-SEC, T-UPL, T-REP, T-CRON, T-MAIL, T-LOG, T-BAK, T-RB; N-2 v3 §6) | scripturi de verificare + liste de control | staging |

## 2. Matricea CI (G5, B-2)

| Axă | Valori |
|---|---|
| Node | **20.x** (cât timp există staging pe Basic Plus) și **24.x** |
| MySQL | **8.0** și **8.4** |
| Etape | lint (`tsc --noEmit`) → build (frontend + artefactul backend) → unitare → integrare DB → API → E2E (pe o singură combinație, 24 + 8.4) |
| Regula | orice eșec blochează integrarea (B-2) |

Furnizorul CI (GitHub Actions) și fișierul de configurare se stabilesc la 5.1.

## 3. Acoperirea pe domenii (legată de deciziile Fazei 3)

| Domeniu | Teste obligatorii | Decizie / risc |
|---|---|---|
| **Autentificare** | login corect / greșit (mesaj generic); blocarea după 5 eșecuri; **parolele istorice nu autentifică**; cookie `__Host-` cu atributele corecte; expirarea prin inactivitate și cea absolută; revocarea la logout, dezactivare, schimbarea rolului, resetarea parolei; sesiunea pre-MFA limitată; TOTP: cod valid, invalid, reluat; înrolarea; bootstrap refuzat dacă există un `super_admin` **[SET-A-02] 2.15:** cod de recuperare valid → sesiune completă + audit; cod reutilizat → 401; regenerarea invalidează setul vechi; resetarea TOTP de către **alt** `super_admin` (propriul cont → 403), cu audit distinct și revocarea sesiunilor contului resetat; | D8, RULES §10, P7 |
| **P7 pe server** | o sesiune falsificată sau manipulată este respinsă (401) | P7 → **închis la 5.2 numai cu aprobarea proprietarului pentru `KNOWN_FAILS`** |
| **Autorizare** | pentru **fiecare** endpoint Admin × fiecare rol: permis / 403; `primarie_operator` are exact ~~cele 13~~ **[SET-A-02] 12** permisiuni (fără `reports.moderate`, 2.3) + niciuna dintre cele noi; **[SET-01]** există exact 3 permisiuni noi (DN-01), `super_admin` = ~~27~~ **26**, nu există permisiune de anonimizare; asumarea interzisă operatorului; preluarea interzisă `super_admin`; ultimul `super_admin` nu poate fi dezactivat; nimeni nu își schimbă propriul rol | 5D, 6.5, 6.6, D8-4 |
| **Sesizări** | depunerea validă (201); limite (a 5-a fotografie, fișier prea mare, tip fals); EXIF absent în fișierul servit; coordonate în afara UAT → 422; **concurență: N depuneri simultane → N numere distincte și consecutive**; rollback → număr neconsumat; `Idempotency-Key` repetat → aceeași sesizare; ~~nu există ștergere~~ **[SET-A-01]** ștergerea definitivă: autorul își șterge propria sesizare în orice stare (204), nu și pe a altuia (404); `super_admin` șterge orice sesizare (204); `primarie_operator` → 403; după ștergere: 404 peste tot, fotografia publică 404, fișierele de pe disc șterse, e-mailurile netrimise `cancelled`, nicio notificare către Primărie (D23); **`TM-015` șters → următoarea sesizare `TM-016`** (D25–D26); depunere fără sesiune → 401; cont `pending` → 401; cont blocat → 403, dar autentificarea, lista proprie, ștergerea proprie și votul funcționează (D15–D18) **[SET-A-02]** locația (2.4): pin manual / poziția curentă → poziție exactă; adresă geocodată → pin aproximativ (`locationApproximate = true`); geocodare eșuată → sesizarea se salvează (201), dar lipsește de pe hartă; corectarea de către `super_admin` o aduce pe hartă; coordonate sau adresă în afara UAT → 422 (2.12); fără `publicationPreference` (câmp necunoscut → 400, 2.8); fotografia publică imediat (2.10); D6-6 (GPS brut nepăstrat după mutarea pinului, E-8); | 3B, 6.1, 6.2, D6 |
| **Proiecția publică** | `/public/map-reports` fără ID intern, contact, ~~stadiu~~ sau asumare; coordonate cu 4 zecimale; ~~numai `approved`; fotografia neaprobată → 404~~ **[SET-A-01]** sesizarea apare **imediat** după depunere (D9); câmpul `status` prezent (A-7); fără cont sau e-mail al autorului; lista proprie = proiecția publică + starea, fără starea transmiterii (D28) **[SET-A-02]** fără `isAnonymous`; `locationApproximate` prezent; sesizările fără poziție validă lipsesc; | 6.5, 6.6, D6-3, **D9, A-7, D28** |
| **Moderare / stadii / asumare** | axele independente; ~~`new` → `in_progress` la asumare sau preluare~~ **[SET-01]** asumarea și preluarea **nu** schimbă starea (C-3); asumarea și retragerea **nu** scriu în `audit_log` (DN-02); numai tranzițiile `new` → `in_analysis` → `resolved`, orice altă tranziție → 409 (DN-09, P-4); `resolved` refuzat pentru `super_admin` și pentru `primarie_operator` când `primaria_mode ≠ platform` (P-9); fără stare `closed` (C-2); preluarea ireversibilă și idempotentă ; **[SET-A-02]** `new → in_analysis` numai la `sent` (în `simulated` rămâne `new`; SMTP de captare în CI → `sent` → `in_analysis`); `PATCH …/resolution` cu `in_analysis` → 409; sesizare netransmisă → `resolved` refuzat; **moderarea nu există** (endpoint 404, permisiunea `reports.moderate` absentă) | 5C (modificat), 6.6, DN-02, DN-09, **2.1, 2.3** |
| **E-mail** | tranzacție: sesizare fără rând în coadă = imposibil; `dedupe_key` → o singură notificare; `simulated` nu contactează rețeaua și nu dă niciodată `sent`; `allowlist` → `blocked` în afara listei; retry cu pauze; lease expirat → reluare; **confirmarea fără descrierea liberă**; e-mailul către Primărie numai cu fluxul activ și cu acordul consemnat; **[SET-01]** nicio notificare către Primărie fără cererea cetățeanului (`transmitToCityHall = false` → niciun rând `registry_notification`, starea rămâne `new`); mesajul către Primărie conține dintre datele de contact numai e-mailul (pct. 7, DN-12); ștergerea corpului după 45 de zile; grupare și plafon D9 **[SET-A-02]** fluxul Primăriei: cerere + flux oprit → `on_hold`, sesizarea rămâne `new`; reactivarea → `queued` automat, fără acțiune a cetățeanului (2.13); `sent` → `in_analysis` + notificare (2.1, 2.2); `simulated` / `blocked` / `failed` → starea rămâne `new`; **pe staging, `allowlist` cu destinatar de test → fluxul complet** (E-5); fără e-mail de confirmare la depunere și fără e-mail la răspunsuri, preluare sau asumare (2.2); dezabonarea (D9-2, E-8); starea derivată a transmiterii pentru operator, fără destinatari (A17-7, E-8, corectura 3); | N-3, D9, A-17 |
| **SMTP în CI** | serverul SMTP de test (container de captare, **DN-24**): conținutul exact al mesajelor, atașamentele, antetele | N-3 |
| **Anti-spam** | capcana, timpul minim, rate limit (429 + `Retry-After`), `X-Forwarded-For` falsificat nu ocolește limita, proof-of-work valid / invalid / reluat, `rejected_attempts` agregat, fără IP în clar **[SET-A-02]** a 4-a transmitere către Primărie de la același cont în 24 h → 429, verificată pe server (API direct, fără UI) și concurent (2.14); | N-4, B7 |
| **Sondaje / vot** | **[SET-01]** închiderea automată la `end_at`: sondajul devine `closed` fără acțiune manuală, votul după `end_at` → 403 chiar înainte de rularea cron-ului, rezultatele finale apar în arhivă (E-3, P-11); un vot per jeton (al doilea → 409); vot concurent cu același jeton → un singur rând; vot în afara perioadei → 403; rezultate conform `results_visibility`; arhiva publică; texte libere niciodată publice; texte libere numai pentru `super_admin` și numai după închidere; structura blocată după primul vot (409); sondajul cu voturi nu se șterge (409); fără IP lângă vot; HMAC diferit între sondaje | D3/D4, N-4 |
| **[SET-A-01] Conturi de cetățeni** | e-mail nou → cont `pending` + cod; cod corect → `active`; cod greșit / expirat / reluat → 401; număr maxim de încercări; același 202 pentru adresă existentă sau nu (fără enumerare); un e-mail = un cont (a doua creare → același cont, D30); normalizarea e-mailului; sesiunea de cetățean nu accesează `/admin/*`; restul aplicației funcționează fără cont (A-9); în `allowlist`, adresele din afara listei nu primesc cod; `dev:show-code` refuzat în producție **[SET-A-02]** crearea contului fără bifa politicii → 422 (2.9); ștergerea contului: sesizările rămân fără autor, contul și e-mailul dispar (2.7); o blocare activă rămâne valabilă după ștergerea și recrearea contului cu același e-mail (2.6); blocarea temporară ridicată manual → depunerea funcționează din nou; | D29–D31, A-4, A-9 |
| **[SET-A-01] Drepturi exclusive `super_admin`** | ștergerea, blocarea și vizualizarea e-mailului: permise `super_admin`, 403 pentru `primarie_operator`; răspunsul `GET /admin/reports/:id` pentru operator **nu** conține e-mailul (A-8); matricea rămâne 24 + 3, fără permisiuni noi (A-5) **[SET-A-02]** corectarea poziției, reîncercarea e-mailului, jurnalul e-mailurilor (per sesizare și global) și ridicarea blocării: 403 pentru `primarie_operator`; răspunsul pentru operator nu conține jurnalul e-mail (2.11, corectura 3); | A-5, A-8 |
| **[SET-01] Date personale și publicare** | formularul și API-ul nu acceptă nume sau telefon (C-1; câmp necunoscut → 400, `strict`); nu există endpoint de anonimizare (DN-12); textul locației apare în `/public/map-reports` după moderare (DN-21); identitatea și e-mailul autorului nu apar niciodată public | DN-12, DN-21, C-1 |
| **[SET-A-02] Retenție (2.5)** | `purge:retention` cu ceas simulat: datele mai vechi de 45 de zile dispar (sesizări, fotografii de pe disc, e-mailuri, conturi, audit, jurnale; momentul de referință conform K-A02-3); `TM-XXX` rămâne rezervat; sondajele și arhiva publică nu sunt atinse; `rejected_attempts` la 30 de zile; backup-urile mai vechi de 45 de zile sunt șterse (test de staging) | 2.5, D25–D26, N4-8 |
| **Date demo** | `seed:demo` refuzat în producție; producția refuză pornirea cu rânduri `is_demo` | D10 |
| **Migrarea `localStorage`** | frontend-ul 5.7 șterge toate cheile vechi (listă în B1 §5.1); nicio cheie nouă cu date personale | D10-5, A-19 |
| **Frontend / backend** | E2E: fluxurile complete (~~depunere → moderare → hartă~~ **[SET-A-02]** cont → depunere → hartă (imediat) → transmitere → `în analiză` → `rezolvată`; vot → rezultate; login + TOTP → Admin); tratarea erorilor 409 / 422 / 429 în interfață | B2 §7 |
| **Regresie** | suita existentă, adaptată pe măsură ce fiecare domeniu trece pe API; comportamentele 6.1–6.6 se păstrează, **[SET-A-01]** cu excepția celor abrogate sau modificate explicit (6.1: A-1; publicarea după aprobare: A-2; stadiul nepublic: A-7; contactul vizibil ambelor roluri: A-8; 6.6-g: C-3) | Etapa 6 |

## 4. Suita existentă: adaptare

| Aspect actual | Problemă | Plan |
|---|---|---|
| **[SET-A-01]** Testul `R6.1` (`tests/regression/test_regresie_6_1_6_5.py`: „nicio metodă de ștergere a sesizărilor”) | contrazice regula nouă (A-1) | se **revizuiește** conform A-1 (decizie de produs, nu ajustare pentru a trece): verifică noile reguli de ștergere + contorul `TM` strict crescător. Modificarea se face în subfaza în care sesizările trec pe API (5.4) și se raportează explicit. |
| Harness-ul citește **parolele din `authService.ts`** (R-3, Faza 0) | după 5.2, parolele nu mai există în cod | conturile de test se creează prin seed în DB-ul de test; credențialele se citesc din **variabile de mediu** ale testelor (niciodată comise) |
| Testele manipulează direct `localStorage` | după migrarea fiecărui domeniu, nu mai au efect | testele se rescriu pe API / E2E, **domeniu cu domeniu**, în aceeași subfază cu migrarea |
| `KNOWN_FAILS = { R6D-SES-01 (P7) }` | se închide la 5.2 | **numai cu aprobarea explicită a proprietarului** (Plan v1.1, RULES §10) |
| Rezultatul de referință 102/103 | numărul se schimbă pe măsură ce testele se rescriu | fiecare subfază raportează numărul nou și **justificarea fiecărui test eliminat sau înlocuit** |

## 5. Testele de staging

Lista completă este cea din analiza N-2 v3 §6 (45 de teste, 38 blocante), cu **grupul de izolare T-ISO-1…7 rulat înainte și după fiecare intervenție pe hosting** (G3, condiția 7). Sunt obligatorii la primul deploy (5.1) și la fiecare deploy ulterior.

## 6. Criterii de acceptare (pe subfaze ale Fazei 5)

| Subfază | Criteriu |
|---|---|
| 5.1 | CI verde pe matricea completă; migrații pe DB gol; seed-uri; `check:no-demo`; deploy pe staging + T-ISO / T-RUN verzi |
| 5.2 | toate testele de autentificare și autorizare verzi (**[SET-A-01]** inclusiv conturile cetățenilor, cu coduri `simulated`); P7 trecut în PASS **numai cu aprobarea proprietarului** |
| 5.3 | conținutul public servit din API; E2E pentru Acasă, Comunicate, Ghid, Apel rapid |
| 5.4 | sesizări complete + teste de concurență + proiecția publică + coada (`simulated`) |
| 5.5 | e-mail `allowlist` pe staging verificat; `live` **numai** după condițiile A-17 |
| 5.6 | sondaje + anti-vot + D3/D4 |
| 5.7 | nicio dependență de `localStorage` pentru date; curățarea cheilor vechi verificată |
| La fiecare subfază | regresie fără FAIL-uri noi neexplicate; `git diff --check`; raport `.md` |
