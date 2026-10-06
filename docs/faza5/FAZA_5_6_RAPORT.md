# FAZA 5.6 — RAPORT FINAL (5.6.1–5.6.8)

**Proiect:** Turnu Măgurele Civic · **Branch:** `faza-5-backend` · **Data:** 01.10–05.10.2026
**Plan:** `FAZA_5_6_PLAN.md` (aprobat 01.10.2026; starea pe pași: §6–§12) · **Design:** RULES §11.6–§11.7 (D3, D4, N4-1…N4-12); B1 §3.4, §3.6, §3.9; B2 §2, §3, §6.4, §7; B3 / B4; B7; B8; B10 §6 (înghețat, fără extinderi)

## 1. Pașii

| Pas | Rezultat | Commit |
|---|---|---|
| 5.6.1–5.6.4, 5.6.6 | scheme Zod; API public (listă, arhivă, structură, rezultate după D3, ALTCHA, vot anonim); API Admin (creare, editare cu blocare după primul vot, stare, ștergere, rezultate, texte libere, integritate, ALTCHA, respingeri, tablou de bord); `surveys:close-expired`; retenția textelor libere; `rotate:keys` cu T-6; jurnal fără IP pe rutele sondajelor; seed demo P-4 | `7f73cd7` |
| 5.6.5 | interfața pe API: lista deschisă + arhiva, „Rezultate” după D3, N4-1, ora României, ecranele 403 / 409 / 422 / 429; Admin fără „Reset Demo”, cu vizibilitate, blocare, ALTCHA, integritate, texte libere; datele demo și tipurile vechi din frontend eliminate; corecția ALTCHA din browser (§5, nota 1) | `e0d25f6` |
| 5.6.7 | suitele vechi adaptate (`R-00`, `R6.5a`) și `R-HINT` nou (§4) | `044ca26` |
| 5.6.7 | E2E `e2e/test_5_6_sondaje.py` (32 de verificări) | `26a8807` |
| 5.6.7 | E2E `e2e/test_5_4_altcha_sesizari.py` (4 verificări) | `3f22682` |
| 5.6.7 | ecranele 422 / 429 ale votului în E2E (36 de verificări în suita de sondaje) | `79a1b2a` |
| 5.6.8 | staging: deploy `79a1b2a`, `civic-seed-demo`, proba de vot a proprietarului, cron `surveys:close-expired` la 5 minute; T-ISO înainte și după: identice. Jurnal: `FAZA_5_1_STAGING_JURNAL.md` §10 | `28c1456` |

Verificări la ultimul commit de cod (`79a1b2a`): `tsc`, `typecheck` server, build, `git diff --check`: trec; server 202/202; suita Python 112/112. CI: verde la `044ca26` (#31) și `26a8807` (#32), confirmate de proprietar; rulările pentru `3f22682`, `79a1b2a` și `28c1456` nu au fost urmărite.

## 2. Criteriile (B10 §6, rândul 5.6: „sondaje + anti-vot + D3 / D4”)

| # | Criteriu | Unde se verifică | Rezultat |
|---|---|---|---|
| 1 | unicitatea votului per sondaj, în DB; concurență cu același jeton → un rând | server: „vot → 201 … același cookie → 409”, „concurență: 6 voturi simultane”; E2E `S-9`, `S-10` | îndeplinit |
| 2 | amprenta HMAC diferă între sondaje; fără IP lângă vot; fără IP în jurnal pe rutele de vot | server: același test de vot; „rutele sondajelor nu scriu IP-ul în jurnal” | îndeplinit |
| 3 | vot după `end_at` → 403 înainte de cron; cron-ul salvează `closed` | server: „E-3 …”; E2E `S-16`; staging: cron la 5 minute | îndeplinit |
| 4 | D3: `after_close` / `live`; arhiva publică; textele libere niciodată publice | server: „after_close: 403 cât e deschis …”, „arhiva se paginează”; E2E `S-1`, `S-2`, `S-5`, `S-11`, `S-12`, `S-15` | îndeplinit |
| 5 | D4: fără „Reset Demo” (nici buton, nici endpoint) | server: „… D4: fără endpoint de resetare”; E2E `SA-1`; regresie `R6.5a` | îndeplinit |
| 6 | integritate: structura blocată după primul vot (409); ștergere cu voturi → 409; marcajul public numai în arhivă (P-2) | server: „după primul vot …”, „ștergerea …”, „P-2 …”; E2E `SA-6`, `SA-7`, `SA-10`, `S-13`, `S-15` | îndeplinit |
| 7 | textele libere: numai `super_admin`, numai după închidere, cu audit; șterse la 6 luni, nu mai devreme | server: „numai super_admin, numai după închidere, cu audit; golite la 6 luni …”; E2E `SA-8`, `SA-12`, `SO-2` | îndeplinit |
| 8 | anti-abuz: capcană, timp minim, 429 + `Retry-After`, `X-Forwarded-For` falsificat, ALTCHA validă / invalidă / refolosită | server: „capcana → 422 …”, „P-7 …”, „ALTCHA per sondaj …”; E2E `S-14` (ALTCHA în browser), `S-17`–`S-19` (ecranele) | îndeplinit |
| 9 | permisiunile B4 pentru sondaje | server: „… operatorul: numai vizualizare; publicul: 401”; E2E `SO-1`, `SO-2`; regresie `R6.5a` | îndeplinit |
| 10 | regresie fără FAIL-uri noi neexplicate | suita Python 112/112; cele două adaptări sunt explicate în §4 | îndeplinit |

## 3. Decizii ale proprietarului (01.10.2026)

P-1 (a): închis = definitiv. P-2 (b): marcajul de integritate public numai în arhivă. P-3: textul N4-1 aprobat. P-4 (a): sondajul demo activ până la 30.06.2027, voturi demo la cel închis. P-5 (a): data și ora, în ora României. P-6 (a): vizibilitatea rezultatelor blocată după primul vot. P-7 (modificat): timp minim 6 s; maximum 10 voturi / oră / rețea / sondaj; 300 / oră global. T-1…T-9: aprobate integral. Detalii: plan §3–§4.

La 5.6.8 (05.10.2026): cron-ul `surveys:close-expired` la 5 minute (valoarea din B2).

## 4. Testele vechi: ce s-a păstrat, ce s-a schimbat și de ce (B10 §7)

| Verificare | De ce pica după 5.6.5 | Adaptarea |
|---|---|---|
| `R-00` (`ui/test_robustete_stocare.py`) | suita rula pe `vite preview`, fără server; sondajele nu mai sunt în `localStorage` | build-ul de producție este servit de serverul Node, pe DB-ul de test cu datele demo. Verificarea este aceeași (pagina se randează și oferă „Participă”). `R-A05` și `R-ALL`: neschimbate. |
| `R6.5a`, partea de sondaje (`regression/test_regresie_6_1_6_5.py`) | apela `surveyService.resetToDemo()`, eliminat prin D4 | aceeași matrice, pe server: fără sesiune 401; operatorul listează (200), dar nu creează (403); endpoint de resetare inexistent (404) și funcția inexistentă în interfață. Restul lui `R6.5a`: neschimbat. |

Nicio verificare nu a fost slăbită sau scoasă. Teste noi: `R-HINT`; `e2e/test_5_6_sondaje.py` (36); `e2e/test_5_4_altcha_sesizari.py` (4); server `integration/surveys.test.ts` (19).

Probe de control (cod stricat intenționat, apoi restaurat), pentru fiecare grup de teste noi: `R-HINT` (fără protecția din `readHint`); `R6.5a` (creare deschisă operatorului); `S-2`, `S-11` („Rezultate” afișat mereu); `SA-6` (blocarea dezactivată în formular); `S-17`–`S-19` (ramurile 429 / 422 scoase); `AS-2`, `AS-3` (varianta veche a algoritmului ALTCHA); pe server: fără blocarea structurii și fără restricția P-2 (plan §6).

## 5. Probleme găsite și reparate pe parcurs

1. **ALTCHA în browser (defect din 5.4).** Interfața folosea varianta pentru Node a algoritmului (`altcha-lib/algorithms/sha`), care nu funcționează în browser. Cu ALTCHA pornită, trimiterea din interfață eșua, și la sesizări. Nu s-a văzut la 5.4 pentru că ALTCHA este oprită implicit și nu avea E2E în browser. Corectat în `src/services/powSolver.ts` (varianta Web Crypto), comun sesizărilor și sondajelor; acoperit acum de `S-14` și de `e2e/test_5_4_altcha_sesizari.py`. Staging a rulat versiunea cu defectul până la deploy-ul din 05.10.
2. **Timpul minim și voturile rapide.** Un vot dat în mai puțin de 6 s ar fi fost respins cu un mesaj generic. `SURVEY_MIN_FORM_SECONDS` este acum în `shared/`, iar interfața așteaptă diferența înainte de trimitere. Valoarea de pe server este aceeași.
3. **Așteptare greșită într-un test nou.** `AS-1` presupunea 400 la o sesizare fără soluție ALTCHA; serverul răspunde, prin design, cu 422 generic. A fost corectată așteptarea testului (422 + motivul `pow_invalid` înregistrat), nu codul.
4. **`civic-seed-demo` pe staging.** Înainte de rulare, proprietarului i s-a spus că sesizările rămân neatinse; comanda a recreat două sesizări demo care lipseau (comportament proiectat la 5.4). Sesizările existente și conturile nu au fost atinse. Consemnat în jurnal §10.

## 6. Constatări și limitări

- **Fără ecran în Admin:** respingerile agregate (`GET /admin/surveys/:id/rejections`) și contoarele din `/admin/dashboard` există pe server și sunt testate, dar nu erau în lista 5.6.5.
- **Ecranele 422 / 429 în E2E:** răspunsul serverului este simulat în `S-17`–`S-19`; se verifică numai ce afișează formularul. Regulile reale sunt testate pe server.
- **Ecranul de confirmare a votului** nu mai afișează un identificator al participării: votul este anonim, iar serverul nu întoarce niciun ID. Este o abatere vizibilă de la ecranul din designul înghețat, impusă de N4-7.
- **Indiciul „Ai participat deja”** stă în `localStorage` și poate rămâne în urmă dacă voturile de pe staging sunt șterse (de exemplu, la refacerea DB-ului de test). Ține numai de interfață; serverul decide.
- **P-7:** mai mulți votanți legitimi din aceeași rețea se pot opri la 10 voturi pe oră (efect acceptat de proprietar; plan §3).
- **Staging:** `purge:retention` și `outbox:process` nu sunt programate prin cron (al doilea vine la 5.5b). T-ISO-7 (e-mail) nu a fost refăcut la deploy-ul din 05.10.
- **Voturile date înainte de 5.6 în browser** nu au fost mutate pe server (plan §5), iar cheile vechi din `localStorage` rămân până la 5.7.

## 7. Cerere de checkpoint

Faza 5.6 este încheiată: criteriile B10 §6 (§2) sunt îndeplinite local și pe staging (§1, jurnal §10). Se cere checkpoint-ul 5.6 (audit ChatGPT), cu atenție la:

1. anonimatul votului: cookie-ul de participare, amprenta HMAC per sondaj, lipsa IP-ului lângă vot și în jurnal (N4-3, N4-7, T-5);
2. pragurile P-7 (6 s; 10 voturi / oră / rețea / sondaj) și așteptarea din interfață înaintea trimiterii (§5, nota 2);
3. corecția ALTCHA din browser și faptul că defectul a existat pe staging între 5.4 și 05.10 (§5, nota 1);
4. testele vechi adaptate (§4), fără slăbirea verificărilor;
5. abaterea de la ecranul de confirmare a votului (§6).

După checkpoint: 5.7 (curățarea cheilor vechi din `localStorage`), apoi 5.5b (e-mail real, când există domeniul Civic).

**Checkpoint 5.6 (06.10.2026):** proprietarul a transmis acest raport lui ChatGPT și a relatat rezultatul: „e ok”. Răspunsul auditului nu a fost transmis lui Claude, deci eventualele observații nu sunt consemnate aici. Nu au fost încă trimise la audit: `FAZA_5_7_RAPORT.md`, `AMENDAMENT_AUTENTIFICARE_GOOGLE_PLAN.md`, `FAZA_5_4_ROTIRE_TOTP_PLAN.md`, `AMENDAMENT_LOCATIE_FORMULAR.md`.
