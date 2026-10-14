# FAZA 6 — RAPORTUL (cerere de checkpoint)

**Proiect:** Urbis Activ · **Branch:** `faza-5-backend` = `f6d5f2d` · `main` = `d9bc2c9`, neatins · **Data:** 14.10.2026
**Staging (`test.urbisactiv.ro`):** rulează **`f6d5f2d`**, versiunea pentru care se cere checkpoint-ul (instalată la 14.10.2026, ~00:16; jurnalul staging-ului, intervențiile 55–59).
**Planul:** `docs/faza6/FAZA_6_PLAN.md` (aprobat la 10.10.2026), Pasul 5, cu amendamentele din §0.1 ale planului.
**Starea:** **cerere de checkpoint.** Faza 6 se închide numai prin decizia proprietarului (§9).
**Limită:** raportul și reauditul sunt scrise de Claude, care a scris și codul. Planul prevede un audit independent la checkpoint.

## 1. Rezumat

- **Fluxul critic** (F1–F10) trece: automat (local și în CI) și manual, pe staging (M1–M3, raport acceptat de proprietar la 14.10.2026).
- **Restaurarea unui backup** (M4) trece pe staging, cu datele active neatinse.
- **`TRUST_PROXY`** (Pasul 2) **nu se poate rezolva** pe această găzduire: serverul web crede antetul `X-Forwarded-For` trimis de vizitator. Proprietarul a ales **varianta B** (13.10.2026): protecția anti-abuz nu se mai bazează pe adresa IP. Criteriile T1–T4 rămân neîndeplinite. **Prin decizia proprietarului din 14.10.2026, AI-1, varianta A, Pasul 2 este încheiat** (verificarea făcută, fără configurație sigură), iar închiderea Pasului 4 se aprobă în condițiile variantei B (`FAZA_6_PLAN.md` §0.2). Adresa reală a vizitatorului **nu** a fost obținută.
- **Reauditul de securitate** (Pasul 4) a găsit 10 constatări (RA-1…RA-10), niciuna critică. Toate sunt remediate în cod sau acceptate prin decizie; remedierile sunt **toate instalate pe staging** (`f6d5f2d`).
- **Greșeli ale lui Claude** în această fază, corectate: §8.

## 2. Lista 1 — verificări trecute

| Rând | Ce | Dovada | Data |
|---|---|---|---|
| F1–F10, F6n, F7n, F8n | fluxul critic, cap-coadă, cu probele negative | test automat `tests/e2e/test_faza6_flux_critic.py` (17 verificări), 16 probe de control pe o copie (`FAZA_6_PAS_3A_RAPORT.md`); CI verde la `f6d5f2d` (rularea 38465768311, jobul E2E) | 10.10.2026; reluat la 14.10.2026 |
| retenția de 45 de zile | ștergerea automată | teste automate cu ceas simulat (suita serverului); **nu** s-a probat manual, cum prevede planul (§2) | 13.10.2026 |
| M1 | fluxul unei sesizări pe staging (F1–F8) | `FAZA_6_PROBE_M1_M3_RAPORT.md` §3: capturi, interogări, e-mailurile de test primite | 10.10.2026 |
| M2 | tranziții și permisiuni pe staging (F6n, F8n, F9, F10) | același raport, §4 | 11.10.2026 |
| M3 | votul pe staging: un vot numărat, rezultatele după regula sondajului | același raport, §5 (S-1…S-4, S-6…S-10). **Fără S-5** (Lista 3) | 11.10.2026 |
| M4 | restaurarea unui backup într-o bază și un director noi | jurnalul staging-ului, intervențiile 41–48 (capturi, ieșirea comenzilor); datele active identice înainte și după; a doua restaurare refuzată | 13.10.2026 |
| S1 | autentificarea: parole, blocare, TOTP, coduri de recuperare, codul pe e-mail, Google | reauditul §2 (cod) și testele automate; RA-1, RA-3, RA-4 remediate (Lista 2). **Pe staging (`f6d5f2d`, probe K3):** mesajul generic la parolă greșită / adresă inexistentă, cod TOTP greșit apoi corect, cod pe e-mail greșit apoi corect (intervențiile 63–65) | 13.10.2026; 14.10.2026 |
| S2 | sesiunile: cookie, durate, ieșire, CSRF | reauditul §2 (cod, teste); atributele cookie-ului verificate pe staging pe cookie-ul de participare (S7). **Pe staging (`f6d5f2d`, probe K3):** cookie-ul de sesiune Admin (Session) și cetățean (400 de zile), cu atributele lor; ieșirea revocă sesiunea pe server (`logout`), iar autentificarea cu TOTP o rotește (`rotated`) (intervențiile 60–62) | 13.10.2026; 14.10.2026 |
| S3 | autorizarea: fiecare rută cu garda ei; matricea 26 / 12 | reauditul §2, tabelul rută → gardă generat din cod (91 de înregistrări); `permissions.test.ts` | 13.10.2026 |
| S4 | datele expuse public | reauditul §2 (cod, testele de suprafață publică); RA-2 remediată. **Pe staging (`f6d5f2d`, probe K3):** proiecția publică a hărții; fotografia publică fără metadate (verificată octet cu octet); tabelul voturilor fără IP / cont; același răspuns cu cont sau fără (intervențiile 66–69) | 13.10.2026; 14.10.2026 |
| S5 | datele de intrare: validare, SQL parametrizat, XSS | reauditul §2 (cod: 20 de interogări cu interpolare verificate una câte una) | 13.10.2026 |
| S7 | antetele de securitate și `http` → `https` (301) pe staging | `curl` de pe calculatorul proprietarului (capturi); jurnalul staging-ului, intervențiile 39–40; antetele reverificate pe `f6d5f2d`, identice (intervenția 71) | 13.10.2026; 14.10.2026 |
| S8 | încărcarea fotografiilor | reauditul §2 (cod, teste); RA-6 remediată | 13.10.2026 |
| S9 | dependențele | `npm audit`: 0 vulnerabilități (server și rădăcină), după RA-7 | 13.10.2026 |
| S10 | secrete și configurare | căutare în fișiere și în tot istoricul Git; `civic.env` 0600 pe staging (captură) | 13.10.2026 |
| S11 | erori și jurnal | după RA-10: `server/test/api/errorsRA10.test.ts`, cu probă de control | 13.10.2026 |
| S12 | constatările vechi: Etapa 6 (11) și auditul general (A-01…A-32, D1–D12), cu starea de acum | reauditul §4: tabelul verificat la `f6d5f2d`, în cod și în documente (fără probe noi pe staging; fără A-21 și A-24, Lista 3) | 14.10.2026 |
| varianta B pe staging | ALTCHA la cod, sesizare și vot; limitele pe IP oprite; Admin cu limita de simultaneitate | jurnalul staging-ului, intervențiile 50–54 (capturi, interogări) | 13.10.2026 |
| instalarea `f6d5f2d` pe staging | `RELEASE.txt`, `health` cu versiunea nouă; autentificarea cetățeanului; sesizare de probă (TM-012); autentificarea Admin cu TOTP | jurnalul staging-ului, intervențiile 55–59 (capturi) | 14.10.2026 |

**Suitele, la `f6d5f2d`:** serverul **409 / 409**, suita Python **167 / 167** (local: MySQL 8.0, Node 22, Chromium, 13.10.2026); CI: toate cele 6 joburi verzi, inclusiv MariaDB 11.4 (rularea 38465768311).

## 3. Lista 2 — verificări eșuate

| Rând | Ce a eșuat | Dovada | Starea acum |
|---|---|---|---|
| T1 | adresa reală a vizitatorului: telefonul pe date mobile și calculatorul au **aceeași** amprentă de IP | jurnalul staging-ului, intervenția 28 (captura interogării) | **neîndeplinibil** pe această găzduire; varianta B (Lista 4) |
| Pasul 2, 1c | un antet `X-Forwarded-For` trimis de vizitator **înlocuiește** adresa lui reală | `curl` cu antet falsificat, intervenția 37 (captură); `FAZA_6_TRUST_PROXY.md` | condiția de oprire din plan; furnizorul a refuzat schimbarea (13.10.2026); `TRUST_PROXY` rămâne nesetat; Pasul 2 încheiat prin varianta B (14.10.2026; `FAZA_6_TRUST_PROXY.md` §6) |
| S1 (RA-1) | limita de 5 încercări a codului de cetățean depășită prin cereri simultane | probă locală (reauditul §3) | remediată în `c69c146`; **instalată** (`cb4cc45`) |
| S4 (RA-2) | `start` fără bifa politicii arăta dacă o adresă are cont | probă locală | remediată în `c69c146`; **instalată** |
| S1 (RA-3) | contoare citite, apoi scrise (parolă, pas TOTP) | cod; testele noi pică pe vechiul cod | remediată în `9a1e08b`; **instalată** (`f6d5f2d`) |
| S1 (RA-4) | încercările TOTP limitate numai pe sesiune | cod | remediată în `9a1e08b`; **instalată** (`f6d5f2d`) |
| S6 (RA-9) | fără adresa reală, fiecare limită pe IP devenea o limită pentru tot orașul | `FAZA_6_ANTIABUZ_FARA_IP.md` §1 | remediată prin varianta B în `cb4cc45`; **instalată** |
| S11 (RA-10, R17) | erorile rutelor `/api/v1` trimiteau clientului mesajul brut al erorii | probă locală (reauditul §3) | remediată în `f6d5f2d`; **instalată** |

Constatările informative RA-6, RA-7, RA-8 nu sunt eșecuri ale unei verificări; sunt în §7.

## 4. Lista 3 — verificări neefectuate

| Rând | Ce | De ce |
|---|---|---|
| T2, T3, T4 | limitele separate pe client; antetul falsificat respins; comportamentul cu setarea aplicată | precondiția (T1) nu poate fi îndeplinită; nicio setare nu a fost aplicată; Pasul 2 încheiat fără ele (14.10.2026) |
| S6 | limitele cu adresa reală a clientului | idem; protecția a trecut pe cont, pe adresa de e-mail și pe ALTCHA (varianta B); varianta B este evaluată în reaudit, S6 |
| S1, S2 pe staging, rămase | blocarea Admin după 5 parole; blocarea după 3 coduri TOTP; expirarea codului de cetățean după 15 minute; limita zilnică de coduri; expirarea sesiunii Admin după 60 de minute | intenționat neexecutate (ar bloca sau ar întârzia conturi reale); acoperite de testele automate. ~~„probele S1, S2, S4 pe staging … fără probe dedicate”~~: făcute la 14.10.2026 (Lista 1; intervențiile 60–69) |
| S12, A-21 și A-24 | auditul general: A-21 (afișarea pe mobil: banner, ținte sub 44 px, tab-uri) și A-24 (declarații nefolosite, cod mort) | cer o probă în browser, respectiv `tsc --noUnusedLocals`; nefăcute. Restul S12 este verificat (Lista 1). ~~„A-01…A-27 … documentele nu sunt în depozit”~~: auditul are 32 de constatări și a fost dat de proprietar la 14.10.2026 |
| M3, S-5 | refuzul celui de-al doilea vot **de către server** | numai dedus (captură + confirmarea proprietarului + numărătoarea din bază); `FAZA_6_PROBE_M1_M3_RAPORT.md` §5 |
| M2, F10 | ștergerea fișierelor fotografiilor de pe disc și a rândurilor de audit, după ștergerea definitivă | neverificată direct pe staging (același raport, §9); acoperită de testele automate |
| RA-4 pe staging | blocarea după 3 coduri TOTP greșite | intenționat: ar bloca un cont Admin real 15 minute; acoperită de testele automate, cu probe de control |
| e-mailul `live` | trimiterea către alte adrese decât cea de test | exclus din Faza 6 (planul, §1) |
| suita Python pe MariaDB | testul cap-coadă pe MariaDB 11.4 | în CI, suita Python rulează numai pe MySQL 8.4; serverul rulează și pe MariaDB |
| mai mulți utilizatori, telefon | probele manuale | un singur tester, de pe un calculator (cu excepția probelor de adresă de la Pasul 2) |

## 5. Lista 4 — limitări acceptate explicit

| Limitarea | Decizia | Data |
|---|---|---|
| varianta B: protecția anti-abuz fără adresa IP; `TRUST_PROXY` nesetat | D-B1…D-B5 (`FAZA_6_ANTIABUZ_FARA_IP.md` §5) | 13.10.2026 |
| Pasul 2 încheiat fără adresa reală a vizitatorului (T1–T4 neîndeplinite); închiderea Pasului 4 în condițiile variantei B, cu S6 evaluat pe varianta B | AI-1, varianta A (`FAZA_6_PLAN.md` §0.2; `FAZA_6_TRUST_PROXY.md` §6) | 14.10.2026 |
| riscurile rămase după varianta B: voturi repetate (jeton golit + ALTCHA rezolvat din nou), conturi multiple cu adrese diferite; reevaluare după lansare | același document, „Limitare acceptată explicit” | 13.10.2026 |
| RA-5: un cont Admin poate fi blocat 15 minute de cine îi știe adresa (5 parole greșite); adresele Admin nu sunt publice | D-B4 (riscul rămas al limitei de simultaneitate) | 13.10.2026 |
| ALTCHA pornit implicit la sesizări, oprirea numai prin comandă (`settings:report-pow off`), fără comutator în Admin | D-B3, cu erata din 14.10.2026 (AI-2, varianta A; decizia A1 din 30.09.2026) | 13.10.2026; 14.10.2026 |
| RA-6: profilul de culoare și celelalte segmente `APPn` rămân; imaginea nu se re-codează | decizia A la RA-6 | 13.10.2026 |
| RA-8: pe staging (`allowlist`), codul de cetățean rămâne în coadă, pentru `dev:show-code` | decizia A la RA-8 | 13.10.2026 |
| sesiunea de cetățean fără expirare pe server (cookie 400 de zile) | varianta B | 30.09.2026 |
| renunțarea la ecranul Google („Anulează”) nu s-a probat | excepție documentată (`docs/faza5/AMENDAMENT_AUTENTIFICARE_GOOGLE_PLAN.md`, §16.4 și tabelul probelor, rândul 6) | 09.10.2026 |
| raportul M1–M3, cu rezerva de la S-5 | acceptat fără observații (verdictul A) | 14.10.2026 |
| retenția de 45 de zile verificată numai automat | planul Fazei 6, §2 (aprobat) | 10.10.2026 |
| reauditul făcut de autorul codului | planul Fazei 6, Pasul 4 (aprobat) | 10.10.2026 |

## 6. Lista 5 — probleme care blochează checkpoint-ul MVP

**Propunerea lui Claude; decizia este a proprietarului.** Niciuna nu ține de funcționarea fluxului critic.

| Nr. | Problema | Propunerea |
|---|---|---|
| K1 | ~~staging-ul nu rulează versiunea pentru care se cere checkpoint-ul~~ | **rezolvată la 14.10.2026:** versiunea nouă `f6d5f2d` instalată (înainte rula versiunea mai veche `cb4cc45`), cu proba scurtă (intervențiile 55–59) |
| K2 | auditul independent prevăzut de plan la checkpoint | auditul acestui raport și al reauditului, înaintea deciziei |
| K3 | ~~probele S1, S2, S4 pe staging~~ | ~~blocante **sau** acceptate explicit ca limitare (Lista 4); recomandarea mea: acceptate, fiindcă sunt acoperite de cod, de teste și parțial de intervențiile 52–54~~ **Rezolvată la 14.10.2026** (decizia proprietarului: probele executate): P1–P10 pe staging (`f6d5f2d`), toate conforme (intervențiile 60–69); rămân neexecutate, intenționat, cele din Lista 3 |

## 7. Lista 6 — probleme care blochează lansarea publică

| Nr. | Problema | Sursa |
|---|---|---|
| L1 | politica de confidențialitate, inclusiv: copiile furnizorului păstrate circa 3 luni (peste regula de 45 de zile); jurnalul de accesări al serverului web, o lună, cu IP-ul lângă cereri (inclusiv la sondaje, fără conținutul votului) | jurnalul staging-ului, observația 11; R13 |
| L2 | acordul Primăriei pentru e-mailul real; modul `live` | planul Fazei 6, §1; E-5 |
| L3 | datele demo (D10), înaintea datelor reale | Planul v1.1, poarta „date reale” |
| L4 | instalarea producției pe `urbisactiv.ro`, inclusiv `http` → `https` (301) și proba `curl` | `FAZA_6_TRUST_PROXY.md` §5 |
| L5 | pagina de diagnostic scoasă din cod, printr-un commit separat, înaintea versiunii de lansare | amendamentul D-2 |
| L6 | aplicația Google trecută din „Testing” în producție (paginile cerute de Google) | `docs/faza5/AMENDAMENT_AUTENTIFICARE_GOOGLE_PLAN.md` |
| L7 | R20: o restaurare a întregului cont de către furnizor readuce baza și `BACKUP_DIR` la o stare veche (cazul „numai arhiva”): ștergerile de după copie se pierd; procedura cu furnizorul (fără restaurare fără acordul proprietarului; după ea, `markers:rebuild-counter --at-least N`) de stabilit | `docs/faza5/FAZA_5_1_BACKUP_RESTAURARE.md` (cazul „numai arhiva”) |
| L8 | decizii pentru R18 (contul de cetățean șters reapare după restaurare) și R19 (e-mailurile din coadă retrimise după restaurare) | constatările din 11.10.2026 |
| L9 | curățările lipsă (R7: `rate_limits`, coduri expirate, `rejected_attempts`, sesiuni; R8: fotografii orfane; R9: provocările ALTCHA fără sarcină cron) | idem |
| L10 | jurnalul aplicației pe găzduire (R12): erorile de pornire ajung în `stderr.log`; ieșirea obișnuită nu s-a găsit (`LSNODE_CONSOLE_LOG`, neverificat) | jurnalul staging-ului, observația 4 |
| L11 | **înainte de pilot:** footerul spune public că „trimiterea automată pe e-mail către autoritatea locală nu este activă”; din Faza 5, transmiterea către Primărie, la cererea cetățeanului, funcționează (constatarea N1) | reauditul §4 (S12, N1); `src/components/layout/Footer.tsx:39` |

**Rezolvată pentru lansare:** RA-9 (limitele pe IP ca plafoane pentru tot orașul), prin varianta B. **`TRUST_PROXY` (decizia proprietarului din 14.10.2026, AI-1, varianta A):** verificarea a fost făcută, iar adresa reală a vizitatorului nu se poate obține nefalsificabil pe această găzduire. Lipsa ei nu mai este o condiție de închidere a Fazei 6, ci o **limitare acceptată** (Lista 4), **nu o problemă rezolvată**; `TRUST_PROXY` nesetat nu este falsificabil. Limitele variantei B (riscurile acceptate la 13.10.2026) rămân valabile și se reevaluează după lansare; varianta C (altă găzduire) rămâne calea de întărire. **Blocajele de mai sus (L1–L10) rămân, independent de această decizie.**

## 8. Vulnerabilitățile și remedierile (separat)

| Nr. | Gravitate | Remedierea | Commit | Pe staging |
|---|---|---|---|---|
| RA-1 | medie | încercările de cod rezervate atomic | `c69c146` | da |
| RA-2 | scăzută | bifa politicii la fiecare cerere de cod | `c69c146` | da |
| RA-3 | scăzută | numărare atomică (parolă); pas TOTP rezervat atomic | `9a1e08b` | da |
| RA-4 | scăzută | 3 coduri TOTP greșite pe cont pe oră → blocare 15 minute, și pentru codurile de recuperare | `9a1e08b` | da |
| RA-5 | scăzută | acceptată (Lista 4) | — | — |
| RA-6 | informativă | JPEG fără `COM` și fără datele de după EOI | `9a1e08b` | da |
| RA-7 | informativă | dependențe nefolosite scoase; `source-map-js` 1.2.2 | `9a1e08b` | da (efect numai la build) |
| RA-8 | informativă | codul de cetățean șters din coadă după trimitere, în `live` | `9a1e08b` | da (fără efect pe staging, `allowlist`) |
| RA-9 | blocantă pentru lansare | varianta B | `cb4cc45` | da |
| RA-10 | scăzută | handlerul de erori aplicat rutelor `/api/v1` | `f6d5f2d` | da |

Detaliile, probele și testele noi: `FAZA_6_REAUDIT_SECURITATE.md` §3. Fiecare remediere are teste noi și probe de control pe o copie.

**Greșeli ale lui Claude în Faza 6, corectate:**
1. Reauditul a trecut S11 „conform” fără să verifice că handlerul de erori se aplică rutelor (RA-10, corectura din reaudit §2).
2. A afirmat că votul nu folosește adresa IP; folosea (`FAZA_6_ANTIABUZ_FARA_IP.md` §1, „Corectură”).
3. A afirmat că cetățeanul nu își poate șterge sesizarea; poate, din „Contul meu”.
4. A afirmat că Admin poate opri ALTCHA din panou; oprirea se face numai prin comandă.
5. Ghidul M4: la 5 rulări cron, comenzile au citit baza activă (fără scriere), din cauza `nodevenv` (jurnalul staging-ului, observația 9).

## 9. Ce se cere proprietarului

1. Decizia asupra Listei 5 (K2; K1 și K3 rezolvate).
2. Auditul independent al raportului (K2), dacă îl menții.
3. Decizia de checkpoint: Faza 6 închisă, cu Listele 4 și 6 preluate în Faza 7 (7A și poarta „date reale”), sau ce trebuie refăcut.

## 10. Referințe

| Document | Conținut |
|---|---|
| `FAZA_6_PLAN.md` | planul aprobat și amendamentele |
| `FAZA_6_PAS_3A_RAPORT.md` | testul automat cap-coadă |
| `FAZA_6_PROBE_M1_M3_RAPORT.md` | probele manuale M1–M3 (acceptat la 14.10.2026) |
| `FAZA_6_GHID_PROBA_STAGING.md`, `…_ERATA.md` | ghidul probelor și erata |
| `FAZA_6_TRUST_PROXY.md` | Pasul 2 |
| `FAZA_6_ANTIABUZ_FARA_IP.md` | varianta B |
| `FAZA_6_REAUDIT_SECURITATE.md` | Pasul 4 |
| `docs/faza5/STAGING_URBISACTIV_JURNAL.md` | intervențiile pe găzduire, 29–54 |
| `docs/faza5/FAZA_5_1_BACKUP_RESTAURARE.md` | procedura de backup și restaurare (M4) |
