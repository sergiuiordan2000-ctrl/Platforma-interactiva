# Urbis Activ: planul de acțiune până la MVP 1.0 READY

**Versiunea 2.4 · 25.10.2026 · propunere de lucru pentru aprobare**

> **STARE: PROPUNERE. PLANUL v2.4 NU ESTE APROBAT. ETAPA E1 (7C) NU ESTE AUTORIZATĂ.**
> Această versiune integrează constatările analizei critice v2.3. Opțiunile care țin de proprietar rămân deschise până la o decizie explicită. Nicio prevedere de aici nu autorizează execuția. Fiecare etapă, fiecare commit/push și fiecare operație pe staging sau producție cer aprobare explicită și separată.

**Ce s-a schimbat în această versiune:** propunerea v2.4 păstrează structura E0–E9 și materialul tehnic din v2.3, dar integrează constatările CR-1–CR-3, IM-1–IM-11 și MI-1–MI-8 din analiza critică. Revizia curentă corectează și clasificarea deciziilor din §11, separă deciziile înainte de 7C de cele înainte de E4, mută G6 în criteriile de închidere E1 și definește opțiuni distincte pentru datele de test create în E7. Sunt aliniate și referințele din §9, starea T-N5, dovezile/limitele `host-restore:recover --check`, DEC-1(c), observația `TRUST_PROXY` și cerința de criptare la G6. Au fost adăugate porți explicite pentru accesul la producție și e-mailuri, corectată specificația testului `APP_ENV=test`, extinsă DEC-20 la datele create în 7F și clarificate instalarea, revenirea după defecte, commitul candidat și criteriile E8. Recomandările care cer decizia proprietarului sunt marcate ca deschise. Această versiune este o propunere documentară; nu implică modificări în repository, cod, configurații, staging sau producție.

**Baza planului:**
- branch-ul `faza-5-backend` = `24fa43f`, arbore curat, CI verde (run 40199879453);
- `main` = `d9bc2c9`, neatins;
- checkpoint-ul 7B acordat la 25.10.2026, cu 7 rezerve (`FAZA_7B_RAPORT.md` §9); lansarea nu este aprobată;
- staging-ul rulează `711a7ae`, cu `health` OK (intervenția 106);
- sursele de analiză: Plan de Lucru Comun v1.1 (26.09.2026), raportul de stare, analiza critică a structurii propuse de Aristotel, cele 4 verificări read-only și verificarea read-only TOTP (versiunea 2.1).

**Cum sunt marcate punctele:**
- **[CONFIRMAT]**: o hotărâre de principiu a proprietarului (25.10.2026) sau un fapt cu dovadă consemnată;
- **[PROPUNERE]**: formularea mea, care așteaptă decizia proprietarului;
- **[DOVEZI]**: nu se poate decide sau închide fără o dovadă care încă nu există;
- **DESCHISĂ / PRINCIPIU / AȘTEAPTĂ DOVEZI**: starea unei decizii din registru (§6).

**Codurile DEC-x** sunt numerotarea acestui plan. Le-am ales ca să nu se confunde cu codurile existente (D7-x, C1–C6, G6 etc.).

---

## 1. Structura etapelor

**[CONFIRMAT]** Structura E0–E9, cu staging separat (E3), documentația în ciornă (E2) și apoi finală (E5), poarta „date reale” înainte de 7F ca structură inițială și decizia separată de lansare publică (E9).

```
E0  Aliniere: dovezi read-only + decizii + consemnare
 │
E1  7C — curățarea codului (perimetru închis în E0)
 │
E2  7D-ciornă — documentația tehnică, în variantă de lucru
 │
E3  Versiunea candidată pe STAGING și verificarea ei
 │
E4  7E — producția: build final, găzduire, cron, backup, restaurare de probă, CI
 │
E5  7D-final — documentația declarată finală, pe baza producției verificate
 │
E6  Poarta „date reale” (GDPR, acordul Primăriei, D10)
 │
E7  7F — testul final de acceptanță
 │
E8  Declararea MVP 1.0 READY (decizia proprietarului)
 ══════════════════════════════════════════
E9  DECIZIA SEPARATĂ de lansare publică
```

**Regulile de execuție [PROPUNERE]:**
1. Fiecare etapă cere aprobarea explicită de pornire și un checkpoint de închidere. Aprobarea unei etape nu o autorizează pe următoarea.
2. Fiecare commit/push și fiecare operație pe staging sau producție au aprobare distinctă. Pe găzduire se lucrează un pas o dată, cu confirmarea proprietarului.
3. E0 este numai documentară. E1 este etapa planificată pentru modificările de cod aprobate. Dacă E3, E4 sau E7 identifică un defect care cere cod, lucrul se oprește; se documentează defectul și se cere aprobare explicită pentru redeschiderea controlată a E1. După remediere se repetă E3 și toate verificările afectate din E4; dacă se schimbă artefactul instalat, E4 se reexecută în perimetrul aprobat. Nu se fac remedieri improvizate direct pe staging sau producție.
4. Nicio probă pe producție fără aprobare distinctă [CONFIRMAT].
5. Lansarea nu este implicată de nicio etapă anterioară [CONFIRMAT].

**Diferențe față de structura propusă inițial de Aristotel** (acceptate de principiu):
- E3 (staging) apare explicit, separat de 7E;
- 7D este împărțit în ciornă (E2) și final (E5);
- poarta „date reale” rămâne înainte de 7F, ca în Plan v1.1. Mutarea ei după 7F rămâne o opțiune de rezervă, decisă explicit (DEC-1).

---

## 2. Etapele în detaliu

### E0 — Aliniere

**Scop:** contradicțiile și deciziile deschise se rezolvă înaintea oricărui cod, ca 7C să aibă un perimetru închis.

**Dependențe:** niciuna.

**E0.1 — Dovezi read-only.** Delimitarea completă este în §7.

| # | Dovada | Pentru decizia | Starea |
|---|---|---|---|
| E0.1-a | inventarul redenumirii (texte vizibile, identificatori interni) | DEC-14 | neexecutată; necesară înaintea 7C **numai** dacă DEC-14 = opțiunea 1 |
| E0.1-b | impunerea TOTP pentru `super_admin` | DEC-18 | **obținută**, prin citire statică (§4); punctele T-N1…T-N6 rămân nedeterminate |
| E0.1-c | dovezile istorice pentru numărul de teste la `7ca5940` (rezerva 5 din 7B) | DEC-19 | neexecutată; cere descărcarea jurnalelor rulării 40187048898 de către proprietar, din GitHub; eu extrag numărătorile. Nu blochează 7C |
| E0.1-d | `npm ls source-map-js` și `npm audit`, situația de bază | DEC-3b | mutată ca **primul pas al E1**, înaintea eliminării `autoprefixer`. Nu blochează 7C |

**E0.2 — Decizii.** Registrul este în §6.

**E0.3 — Consemnare.** Deciziile se înregistrează în repository numai cu aprobarea commitului și a push-ului.

**Livrabile:**
- registrul deciziilor, cu opțiunile alese de proprietar;
- C1–C6, fiecare cu decizia ei: C1 → DEC-4; C2, C4, C5 → DEC-5; C3 (D8-8) → DEC-18; C6 → DEC-10;
- perimetrul 7C ca listă închisă;
- tratarea ghidului 5.5B (DEC-6) și a handoff-ului (DEC-5).

**Criterii de închidere:**
- deciziile marcate „înainte de 7C” au o opțiune aleasă și consemnată;
- perimetrul 7C este o listă închisă;
- dovezile necesare înainte de perimetru (§7.1) sunt fie obținute, fie declarate indisponibile, cu decizie de acceptare.

**Riscuri:** o decizie amânată care se dovedește necesară în E4 înseamnă cod nou și refacerea E1–E4.

**Aprobări:** proprietarul, pentru fiecare decizie; commit/push separat.

### E1 — 7C: curățarea codului

**Scop:** cod curat, fără elemente de diagnostic și fără dependențe moarte, gata de build final.

**Dependențe:** E0 închis. Închiderea E1/checkpoint-ul 7C cere clarificarea G6 în măsura în care alegerea găzduirii poate impune modificări de cod (criteriul 10 de mai jos).

**Perimetrul confirmat de principiu [CONFIRMAT]:**
1. `tsc --noUnusedLocals` și remedierea rezultatelor;
2. eliminarea `autoprefixer`, **după** verificarea build-ului;
3. eliminarea codului de diagnostic (L5: `server/src/routes/diagnostics.ts` și legăturile lui din `config.ts`/`app.ts`);
4. controlul noindex `SEARCH_INDEXING`, cu testele din §3.

**Elemente condiționate de deciziile din E0 [PROPUNERE]:**
5. schimbările de texte vizibile pentru redenumire, numai dacă DEC-14 = opțiunea 1;
6. testele suplimentare TOTP (modul `production`, resetarea, promovarea), dacă DEC-18 = (b);
7. corectarea `README.md:4` („moderate”, N2);
8. cod pentru numerotarea TM, numai dacă DEC-20 = C și procedura cere cod.

**În afara perimetrului:**
- Finding 2 rămâne limitare acceptată (cauza este nedeterminată) [PROPUNERE];
- camera/HEIC rămân neschimbate, prin decizia proprietarului [CONFIRMAT];
- `TRUST_PROXY` rămâne limitare acceptată (DEC-4) [CONFIRMAT];
- identificatorii interni nu se schimbă (DEC-14) [CONFIRMAT].

**Ordinea de lucru [PROPUNERE]:**
1. Situația de bază: build, teste, `npm ls source-map-js`, `npm audit`.
2. Analiza artefactului: este `source-map-js` prezent în `dist/` frontend și în `server/dist/`?
3. Curățarea `--noUnusedLocals`.
4. Eliminarea codului de diagnostic.
5. `SEARCH_INDEXING`, cu teste.
6. Elementele condiționate aprobate.
7. Eliminarea `autoprefixer`, apoi build, `npm ls` și `npm audit` refăcute.
8. CI.

**Livrabile:** commituri pe `faza-5-backend`; `FAZA_7C_RAPORT.md`; dovezile `source-map-js`.

**Criterii de închidere [PROPUNERE]:**
1. CI verde pe toate cele 6 joburi la commitul final 7C.
2. Numărul de teste al rulării 7C consemnat, dintr-o rulare locală dacă jurnalele CI rămân inaccesibile. **Acest număr nu închide rezerva 5 din 7B** [CONFIRMAT].
3. Build-ul frontend reușește fără `autoprefixer`.
4. `npm ls` și `npm audit` consemnate înainte și după eliminare, plus analiza artefactului. Riscul rezidual și opțiunile se prezintă **numai după aceste dovezi**. Nu se presupune că eliminarea `autoprefixer` rezolvă vulnerabilitatea [CONFIRMAT].
5. Nicio referință rămasă la codul de diagnostic, cu căutarea consemnată.
6. Toate testele din §3 trec.
7. Testele DEC-18 trec, dacă DEC-18 = (b).
8. DEC-3b și DEC-19 sunt decise înaintea checkpoint-ului.
9. Checkpoint-ul 7C acordat de proprietar.
10. G6 este clarificat suficient înaintea checkpoint-ului 7C pentru a identifica cerințele care ar impune modificări de cod. Dacă dovezile nu sunt disponibile, proprietarul decide explicit dacă acceptă riscul de refacere. Aceasta este condiție pentru închiderea E1/checkpoint-ul 7C, nu pentru închiderea E0.

**Riscuri:** cod „nefolosit” care este folosit totuși la rulare (plasa de siguranță: testele unitare, API, de integrare și E2E) · `source-map-js` poate rămâne și după eliminarea `autoprefixer`.

**Aprobări:** pornirea E1; fiecare commit/push; checkpoint-ul 7C.

### E2 — 7D-ciornă

**Scop:** documentația necesară pentru E3 și E4, fără improvizație.

**Dependențe:** E1. Poate începe spre sfârșitul E1, dar se închide după E1.

**Livrabile:** ciornele din §10.1.

**[CONFIRMAT de principiu]** Ghidul 5.5B se păstrează ca document istoric. Instrucțiunile operaționale actuale se mută în manualul din 7D.

**Criterii de închidere:**
- fiecare document este marcat „CIORNĂ — de finalizat după 7E”;
- fiecare comandă și variabilă de mediu din documente este verificată față de cod (`config.ts`, `cli.ts`, `package-release.py`).

**Riscuri:** o ciornă luată drept document final. Se evită prin marcaj.

**Aprobări:** revizia ciornelor; commit/push.

### E3 — Versiunea candidată pe staging

**Scop:** versiunea 7C rulează pe `test.urbisactiv.ro`, iar punctele neverificate ale staging-ului se închid.

**Dependențe:** E1; E2 (manualul de instalare, în ciornă).

**Livrabile:** intervenții noi în `STAGING_URBISACTIV_JURNAL.md`.

**Criterii de închidere [PROPUNERE]:**
1. Este identificat și consemnat commitul candidat: SHA-ul exact instalat pe staging, adică ultimul commit inclus în artefactul instalat (inclusiv commiturile de documentație din E2 dacă au fost incluse). `health` și verificarea CI trebuie să corespundă exact acestui SHA.
2. Pe domeniul real de staging se verifică noindex pentru pagina rădăcină, un fișier static, o rută API și `robots.txt`; se confirmă că antetul există și nu este ocolit de servirea statică directă prin LiteSpeed.
3. Cele 4 sarcini cron există, cu dovadă: `backup:db`, `purge:retention`, `surveys:close-expired`, `outbox:process`. `purge:pow` nu are nevoie de sarcină separată: este inclus în `purge:retention` din `d53b28a`.
4. Ieșirea primei rulări `purge:retention` după instalare a fost citită (închide punctul „neverificat” din `FAZA_7A_RAPORT.md:128`).
5. `backup.log` arată o copie reușită după instalare.
6. noindex este activ pe staging (`SEARCH_INDEXING` absent sau `off`): antetul și `robots.txt` verificate; nicio rută verificată nu este expusă la indexare.
7. Ruta de diagnostic nu mai răspunde.
8. Fusul orar al orelor cron consemnat.
9. Opțional, cu aprobare separată: proba de siguranță `host-restore:recover --check`, cu baza verificată ca neschimbată (pentru DEC-9).

**Riscuri:** operații pe găzduire. Se lucrează un pas o dată, cu confirmarea proprietarului.

**Aprobări:** aprobare separată pentru instalare și pentru fiecare operație.

### E4 — 7E: producția

**Scop**, după `FAZA_7_PLAN.md:111`: „producția rulează versiunea candidată, cu `health`, backup și o restaurare de probă; CI verde la acel commit; `FAZA_7E_RAPORT.md`”.

**Dependențe:**
- E3 închis;
- G6 confirmat (DEC-7), cu reevaluarea `TRUST_PROXY` (DEC-4);
- D7-4 (DEC-8);
- perimetrul restaurării de probă (DEC-9);
- **DEC-20 decisă înaintea probei** [CONFIRMAT];
- **procedura de recuperare a ultimului `super_admin` scrisă și aprobată** (T-N5) [CONFIRMAT ca condiție de intrare];
- operatorul care monitorizează backup-ul (DEC-16);
- DEC-21–DEC-25 decise și aplicate după caz înainte de E4: restricția de acces, conturile `super_admin`, backup-ul extern, branch-ul-sursă și gardul de e-mail;
- acordurile și condițiile de prelucrare aplicabile găzduirii și furnizorului de e-mail (G-3) clarificate înainte de a introduce date personale reale ori secrete operaționale în serviciile respective;
- G6 clarificat înainte de checkpoint-ul 7C dacă poate cere modificări de cod.

**Criterii de închidere [PROPUNERE]:**

**Versiune**
1. `health` = `ok`, cu versiunea commitului candidat.
2. CI verde la acel commit, cu matricea decisă în D7-4.

**Configurare și protecții obligatorii înainte de pornirea pe domeniul de producție**
3. `APP_ENV=production`; niciodată `staging` (§3.5).
4. `SEARCH_INDEXING` absent sau `off`; antetul `X-Robots-Tag` și `robots.txt` verificate pe domeniul real pentru pagina rădăcină, un fișier static, o rută API și `robots.txt` însuși. Se confirmă că LiteSpeed nu ocolește antetul aplicației.
5. **Restricția de acces este instalată și verificată înainte de pornirea aplicației pe domeniul de producție.** O cerere fără credențiale trebuie să fie refuzată (de regulă 401/403, în funcție de mecanism). Mecanismul concret este DEC-21 și rămâne de decis de proprietar. Restricția se menține până la aprobarea explicită E9. `noindex` nu este control de acces. Deoarece pe staging s-a observat o fereastră Basic repetată la anumite răspunsuri 401, mecanismul ales trebuie testat pentru mai multe rute și răspunsuri; dacă defectul reapare, E4 nu se închide până la corectarea mecanismului.
6. Până la închiderea E6: **nu poate pleca niciun e-mail real către Primărie**. Se folosește fluxul oprit sau un destinatar de test controlat de proprietar. Dacă se alege destinatar de test, adresa reală a Primăriei este absentă din `EMAIL_ALLOWLIST`, iar lista efectivă este verificată și consemnată în evidența privată a operației. `allowlist` singur nu este considerat gard suficient. Modul `live` este interzis înainte de E6 și de aprobarea separată a activării.
7. `check:no-demo` trecut (D10).
8. Conturile `super_admin` au TOTP configurat (T-N4). Cerința de minimum două conturi active, cu dispozitive separate, este DEC-22 și rămâne deschisă până la decizia proprietarului.
9. Domeniul, certificatul TLS și redirecționarea HTTP→HTTPS sunt verificate; secretele de producție sunt generate unic și nu sunt copiate de pe staging; procedura primului `super_admin` este executată și consemnată fără a expune secretele.

**Sarcini, backup și monitorizare**
10. Cele 4 sarcini cron permanente sunt configurate, cu dovadă și ținte verificate: `backup:db`, `purge:retention`, `surveys:close-expired`, `outbox:process`.
11. `BACKUP_DIR` este în afara oricărui docroot, cu acces restrâns și separat de `STORAGE_DIR`. **Metoda de criptare, gestionarea cheii și dovada verificării sunt de definit la G6**; criteriul nu poate fi bifat până când această definiție și dovada nu există (`FAZA_5_1` §2, §6.2).
12. O copie `backup:db` reușită, în formatul `civic-backup/2`.
13. DEC-23 (copie de backup în afara contului de găzduire) este decisă: fie implementată cu criptare și acces controlat, fie riscul este acceptat explicit în scris. Absența unei copii externe nu poate rămâne neobservată.
14. Manualul 7D definește verificarea periodică a `backup.log`, a cozii de e-mail și a `health`, cu operator numit, frecvență, dovadă și escaladare la eșec (DEC-16). Limitările jurnalelor suprascrise sunt consemnate.

**Restaurarea de probă** [CONFIRMAT de principiu: scenariul M4 + verificarea R19; `host-restore:recover --check` numai dacă siguranța lui se confirmă]
15. DB nou și gol, `STORAGE_DIR` nou și gol, copia direct în `BACKUP_DIR`, conform procedurii `FAZA_5_1` §6.6.
16. `restore:db <copie> --check` = „PERMISĂ”.
17. După `--confirm`: rândurile egale cu manifestul; fotografiile restaurate fără lipsuri neexplicate; ștergerea de după copie nu reapare; contorul TM ≥ maximul emis.
18. **R19:** un mesaj de sesizare aflat în coadă în copie apare ca „reținut”, iar nimic nu pleacă automat.
19. A doua rulare `--confirm` este refuzată, fără scriere.
20. Baza activă și fișierele active rămân neschimbate.
21. Curățenia este completă: baza și utilizatorul de probă, directorul de probă, sarcinile cron cu parole.
22. Dacă DEC-20 = B: se consemnează explicit ce nu a exersat proba (§5.5) și decizia proprietarului despre criteriul 7E.

**Livrabile:** producția instalată; jurnalul intervențiilor de producție; `FAZA_7E_RAPORT.md`.

**Riscuri:**
- **cea mai riscantă etapă;**
- o greșeală de țintă în linia cron (observația 9: `CIVIC_ENV_FILE` ignorat; ținta se dă direct în linie);
- găzduirea poate să nu permită o a doua bază;
- numerele TM consumate de probă (DEC-20);
- backup-uri simultane (`FAZA_5_1` §6.4), dacă proba manuală coincide cu cronul.

**Branch și proveniența artefactului:** înainte de E4, DEC-24 stabilește branch-ul-sursă (`faza-5-backend` sau un `main` actualizat). Nu se actualizează `main` și nu se schimbă branch-ul fără decizie și aprobare distinctă. Commitul candidat este SHA-ul exact al codului și configurației livrate; CI trebuie să fie verde pentru acel SHA. Commiturile de documentație E5 nu schimbă artefactul instalat și nu cer reinstalare dacă nu modifică fișiere livrate/configurație; orice modificare care afectează artefactul sau configurarea obligă la reevaluare și, dacă e cazul, refacerea E3/E4.

**Aprobări:** G6; fiecare operație pe producție, separat; checkpoint-ul 7E.

### E5 — 7D-final

**Scop:** documentația declarată finală, pe baza producției verificate.

**Dependențe:** E4 închis; DEC-14 (textele finale); inventarul redenumirii înaintea E5 [CONFIRMAT ca cerință].

**Livrabile:**
- documentele din §10.2, cu marcajul „CIORNĂ” eliminat;
- ghidul 5.5B marcat istoric;
- contradicțiile C2, C4 și C5 corectate.

**Criterii de închidere:**
- fiecare valoare de producție trimite la o intervenție din jurnalul E4;
- commiturile exclusiv documentare din E5 sunt identificate separat și nu sunt prezentate ca versiune de aplicație instalată; dacă un commit schimbă codul livrat sau configurația de runtime, se aplică regula de redeschidere E1 și reverificare E3/E4;
- nicio mențiune „de stabilit” fără o decizie consemnată;
- textele sunt coerente cu decizia de redenumire.

**Aprobări:** checkpoint-ul 7D.

### E6 — Poarta „date reale”

**Scop:** condițiile Plan v1.1: verificarea legală/GDPR, acordul Primăriei pentru e-mailul real, datele demo conform D10.

**Dependențe:** E4; E5. Părțile GDPR și acordul Primăriei pot fi pregătite în paralel, încă din E0. Cerințele contractuale și de prelucrare G-3 pentru furnizorii care vor primi date personale ori secrete operaționale trebuie clarificate înainte de E4; închiderea completă a porții GDPR rămâne la E6.

**[CONFIRMAT]** Existența politicii de confidențialitate nu echivalează cu o verificare juridică suficientă.

**Dovezile pentru închiderea porții GDPR [PROPUNERE].** Nu sunt jurist; lista definește dovezi verificabile, nu un aviz juridic.

| # | Dovada | Conținutul |
|---|---|---|
| G-1 | inventarul datelor personale | ce se colectează (adrese de e-mail, fotografii, poziția pinului, secretele TOTP ale administratorilor, jurnalul de audit, jurnalele de acces ale găzduirii cu IP-uri), scopul, temeiul legal, termenele aprobate (45 de zile, 6 luni etc.) |
| G-2 | stabilirea rolurilor | operatorul, persoana împuternicită, rolul Primăriei față de datele primite prin e-mail. Coerentă cu acordul Primăriei |
| G-3 | acordurile cu împuterniciții | înainte de E4: verificarea condițiilor contractuale/de prelucrare pentru găzduire și furnizorul de e-mail, înainte ca aceștia să primească date personale sau secrete operaționale; la E6: confirmarea documentelor, rolurilor și locului prelucrării. Transferurile în afara SEE: [DOVEZI] |
| G-4 | politica de confidențialitate revizuită față de G-1–G-3 | informațiile obligatorii pentru persoana vizată |
| G-5 | procedura pentru drepturile persoanei vizate | accesul, ștergerea (ștergerea contului există în aplicație), termenele de răspuns |
| G-6 | procedura pentru incidente | cine constată, cine notifică și în ce termen |
| G-7 | evaluarea necesității unei analize de impact | o concluzie scrisă, oricare ar fi ea |
| G-8 | fotografiile | expunerea publică a primei fotografii este confirmată de citirea statică (`projection.ts` 11, 33, 46; `reports.ts` 120); trebuie stabilite condițiile exacte de includere în proiecție și măsurile pentru persoane/numere de înmatriculare. Moderarea a fost eliminată prin amendament (C4), deci punctul cere o concluzie explicită. Condițiile exacte: [DOVEZI] |
| G-9 | măsurile de securitate documentate | TOTP, criptarea backup-ului (G6), accesul la `BACKUP_DIR` |
| G-10 | concluzia de închidere | avizul scris al unui specialist (dacă DEC-12 = b) sau declarația proprietarului de acceptare a riscului pe baza G-1–G-9 |

**Celelalte condiții:**
- acordul scris al Primăriei, a cărui referință devine `agreementReference` (`adminReports.ts` 495–496). **Acordul nu activează singur modul `live`;**
- D10: nicio dată demo în producție, verificat cu `check:no-demo`.

**Riscuri:** termene dependente de terți (Primăria, eventual un specialist).

**Aprobări:** proprietarul, pentru fiecare dovadă.

### E7 — 7F: acceptanța

**Scop:** fluxul critic validat în producție: Cetățean → DB → E-mail → Admin → Hartă. Moderarea a fost eliminată prin amendament (C4) și nu se testează ca pas obligatoriu, dacă DEC-5 confirmă.

**Dependențe:** E6; DEC-10; DEC-11; DEC-15.

**[CONFIRMAT de principiu]** Restricția de acces public se păstrează până la aprobarea E9. Pentru E7, până când poarta E6 și aprobările aplicabile sunt închise, fluxul către Primărie rămâne oprit sau este configurat exclusiv către un destinatar de test controlat de proprietar. Adresa reală a Primăriei nu poate figura în `EMAIL_ALLOWLIST` în această perioadă. `allowlist` singur nu garantează absența expedierii reale. Orice test `live` către Primărie cere acordul relevant și aprobare separată. noindex nu înlocuiește blocarea (§3.4).

**Ce NU validează un test numai cu adrese de test** [cerința de documentare este CONFIRMATĂ; lista este PROPUNERE]:
1. livrarea efectivă către serverul de e-mail al Primăriei (filtrele lor antispam, acceptarea de către domeniul lor);
2. fluxul de lucru intern al Primăriei: primirea, repartizarea, răspunsul;
3. calea de cod `live`, inclusiv verificarea `agreementReference`;
4. livrarea către domenii de cetățeni din afara listei, alese de utilizatori reali;
5. comportamentul la volum real față de limitele planului Brevo;
6. tratarea adreselor greșite sau inexistente introduse de cetățeni reali;
7. experiența unui cetățean care nu cunoaște platforma și nu are acces prin blocarea Basic.

**Ce validează testul:** fluxul complet în aplicație, generarea și conținutul mesajelor, trimiterea prin Brevo cu domeniul `urbisactiv.ro`, refuzul adreselor din afara listei.

**Criterii de închidere [PROPUNERE]:**
- toate scenariile executate, fiecare cu dovadă;
- lista de sesizări, fotografii, adrese și numere TM create în 7F este inventariată într-o evidență controlată; se consemnează ce date rămân, ce se șterge conform unei proceduri aprobate și ce retenții/audituri/backup-uri împiedică ștergerea imediată;
- nicio fotografie sau sesizare de test nu este lăsată accidental în proiecția publică la E9; verificarea și tratarea lor sunt criteriu E9 și parte din DEC-20 extinsă;
- cel puțin un iPhone/Safari (rezerva 4 din 7B), un Android și un desktop;
- rezervele 7B care pot fi reverificate sunt incluse în scenarii;
- cele 7 elemente nevalidate sunt consemnate în `FAZA_7F_RAPORT.md`, fiecare cu decizia proprietarului: acceptat, testat separat sau amânat până la E9;
- nicio problemă blocantă deschisă.

**Aprobări:** scenariile; pornirea 7F; checkpoint-ul 7F.

### E8 — MVP 1.0 READY

Decizia proprietarului, după E7, pe baza rapoartelor 7C–7F. Nu este o operație tehnică și nu autorizează lansarea.

**Checklist obligatoriu pentru decizia E8 [PROPUNERE]:**
1. checkpoint-urile 7C, 7D și 7E sunt acordate, iar 7F este închis cu dovezi;
2. fiecare dintre cele 7 rezerve din 7B este închisă cu dovadă sau acceptată explicit de proprietar ca limitare;
3. nicio problemă blocantă nu rămâne deschisă; orice risc rezidual are proprietar, consecință și acceptare explicită;
4. elementele nevalidate din E7 au o decizie consemnată: testare separată, acceptare sau amânare până la E9;
5. procedurile E4 pentru acces restricționat, e-mail, backup/restaurare, monitorizare și recuperarea administratorului sunt aprobate;
6. G-3 a fost verificat înainte de E4, iar poarta E6 are o concluzie documentată; READY nu înseamnă automat autorizarea datelor reale ori a trimiterii `live`;
7. DEC-20 extinsă acoperă atât datele probei de restaurare, cât și datele/numerele TM produse în E7;
8. este consemnat explicit că accesul public rămâne blocat, `SEARCH_INDEXING` rămâne `off`, iar `live` rămâne dezactivat până la decizia separată E9.

### E9 — Decizia separată de lansare publică

**Ce cuprinde:**
- activarea indexării prin procedura din §3.3;
- ridicarea blocării accesului;
- modul `live` numai cu `agreementReference`;
- operatorul numit pentru `backup.log` și coada de e-mail;
- lista de verificare a lansării (DEC-17);
- tratarea datelor de probă rămase și a datelor create în E7 (DEC-20 extinsă): inventar, retenție, fotografii publice, mesaje reținute și numere TM;
- confirmarea că restricția de acces este ridicată numai prin această aprobare și că `SEARCH_INDEXING=on` și `live` sunt activate separat, după verificarea fiecărei condiții.

**Aprobări:** aprobare explicită de lansare.

---

## 3. noindex: specificația `SEARCH_INDEXING` [PROPUNERE, opțiunea recomandată]

### 3.1 Regulile

| Situația | Rezultatul |
|---|---|
| variabila **absentă** | `off`, indiferent de mediu |
| `off` | permis în **toate** mediile |
| `on` cu `APP_ENV=production` | permis: indexarea este activă |
| `on` cu `APP_ENV=staging` sau `development` | **refuz explicit la pornire** |
| `on` cu `APP_ENV=test` | nu este un caz de configurare valid: `test` nu face parte din schema `APP_ENV` actuală; pornirea este refuzată de schemă |
| orice valoare diferită exact de `off` sau `on`: variabila goală, majuscule (`ON`, `Off`), `true`, `1` etc. | **refuz explicit la pornire** |

**Comportamentul în situațiile permise:**

| Starea efectivă | `X-Robots-Tag` | `robots.txt` |
|---|---|---|
| `off` (absent sau explicit) | `noindex` pe toate răspunsurile | `Disallow: /` |
| `on` (numai în producție) | absent | fără `Disallow` |

Pentru mediile admise de schema actuală (`development`, `staging`, `production`), starea `off` sau variabila absentă nu depinde de `APP_ENV`. `APP_ENV=test` rămâne invalid în schema actuală și se testează separat.

### 3.2 Testele cerute

1. **Valoarea implicită:** fără variabilă, în toate mediile admise, antetul `X-Robots-Tag: noindex` apare pe pagina HTML, pe API și pe un fișier static.
2. **`off` explicit:** același rezultat ca testul 1, în toate mediile.
3. **`robots.txt`:** conținutul exact, pentru `off` și pentru `on`.
4. **Activarea controlată:** `on` cu `APP_ENV=production` → antetul lipsește, iar `robots.txt` permite indexarea.
5. **`on` cu `APP_ENV=staging`** → refuz la pornire, cu mesajul explicit.
6. **`on` cu `APP_ENV=development`** → refuz la pornire, cu mesajul explicit.
7. **`APP_ENV=test`** → test separat care confirmă refuzul de către schema existentă și verifică motivul/mesajul schemei. Acest test nu este prezentat ca dovadă că `SEARCH_INDEXING` a refuzat pornirea.
8. **Valori invalide:** variabila goală, `ON`, `Off`, `true`, `1` → refuz la pornire, cu mesajul explicit.
9. **Independența de mediu în situațiile permise:** pentru `off` și pentru variabila absentă, schimbarea `APP_ENV` nu schimbă starea indexării.
10. **Artefactul real:** pasul CI care pornește `server/dist/app.js` verifică antetul și `robots.txt` pentru valoarea implicită.

**[CONFIRMAT de analiza critică v2.3; necesită reconfirmare în E1 înainte de implementare]:** `APP_ENVS` conține `development`, `staging`, `production`, iar schema folosește `z.enum`; prin urmare `APP_ENV=test` este respins de schemă înainte ca logica `SEARCH_INDEXING` să poată fi testată. E1 trebuie să păstreze schema existentă, să elimine `test` din lista mediilor în care `SEARCH_INDEXING=on` este verificat și să includă un test separat al respingerii `APP_ENV=test` de către schemă. Nu se adaugă `test` în schemă ca parte a acestei propuneri.

### 3.3 Impactul asupra E4 și E9

- **E4:** `SEARCH_INDEXING` absent sau `off`; antetul și `robots.txt` citite în producție (criteriul 4).
- **E9 (lansare):** `SEARCH_INDEXING=on`, restartul aplicației, verificarea absenței antetului și a conținutului `robots.txt`.
- **Revenirea:** `off`, restart, reverificare.
- Lansarea nu cere un build nou. Antetul și `robots.txt` se schimbă împreună: un `Disallow` lăsat activ ar împiedica motoarele să citească noua stare.

### 3.4 Limita principală

**noindex nu înlocuiește autentificarea sau restricțiile de acces** [CONFIRMAT]. Mecanismul doar cere motoarelor de căutare să nu indexeze; nu împiedică pe nimeni să deschidă paginile. Accesul înaintea lansării se controlează separat prin mecanismul de restricție decis în DEC-21, plus autentificarea aplicației. Nu se presupune că Basic este obligatoriu sau suficient până când mecanismul nu este decis și verificat.

### 3.5 Alternative respinse sau secundare

- **Producția rulată cu `APP_ENV=staging`: respinsă.** Ar dezactiva protecțiile legate de modul `production`, de ex. refuzul `seed:demo` (`assertDemoAllowed`) și interdicția `DIAG_CLIENT_IP` (`config.ts:204`).
- **Antete puse din găzduire (LiteSpeed):** secundară. Este în afara CI și dependentă de furnizor, iar funcționarea pentru răspunsurile aplicației Node este nedovedită (N-15).
- **Renunțarea la cerință:** nerecomandată. Contrazice `FAZA_7_PLAN.md` §6.

---

## 4. DEC-18: dovezile pentru impunerea TOTP la `super_admin`

Citire statică la `24fa43f`; testele nu au fost rulate.

### 4.1 Ce arată codul

| # | Constatarea | Sursa |
|---|---|---|
| T-1 | pasul după parolă: cont cu TOTP → `required` (orice rol); `super_admin` fără TOTP → `enroll`; celelalte roluri fără TOTP → `none` | `server/src/routes/auth.ts` 90–93 |
| T-2 | pentru `required` și `enroll`, sesiunea are starea `pending`; numai `none` primește `not_required` | `auth.ts` 152–156 |
| T-3 | garda centrală refuză orice sesiune `pending` (403 `MFA_REQUIRED`), în afara rutelor marcate `allowPendingMfa` | `server/src/auth/guards.ts` 80–81 |
| T-4 | rutele `allowPendingMfa` sunt numai pașii TOTP: `mfa/verify`, `mfa/recovery`, `mfa/enroll/start`, `mfa/enroll/confirm` | `auth.ts` 96, 172, 221, 254, 267 |
| T-5 | sesiunea `verified` se creează numai după un factor reușit (cod TOTP, cod de recuperare, confirmarea înrolării), cu jetonul rotit | `auth.ts` 69, 217, 250, 286 |
| T-6 | numai două locuri creează sesiuni Admin; fluxul Google OIDC de dezvoltare este limitat la `development` | `server/src`; `googleOAuth.ts` 102 |
| T-7 | autentificarea nu se ramifică după `appEnv` (în afară de numele cookie-ului, `secure` și OIDC-ul de dezvoltare) | `routes/auth.ts`, `auth/*.ts`; `sessions.ts` 28, 71 |
| T-8 | resetarea TOTP a altui cont șterge TOTP-ul, codurile și sesiunile; propriul TOTP nu se resetează de aici | `routes/adminAccounts.ts` 140–151 |
| T-9 | schimbarea rolului revocă sesiunile contului | `adminAccounts.ts` 98–100 |
| T-10 | codurile de recuperare (10) sunt un al doilea factor alternativ; TOTP rămâne configurat; sunt refuzate pentru un cont blocat | `auth.ts` 221–251 |
| T-11 | `TOTP_ENC_KEY` este obligatorie; nu există niciun comutator care să dezactiveze impunerea | `config.ts` 28–29, 120 |

### 4.2 Testele existente (citite, nerulate)

| Comportamentul | Testul | Acoperire |
|---|---|---|
| `super_admin` fără TOTP → `enroll`; orice altă operație refuzată; jeton rotit | `server/test/integration/auth.test.ts` 73–98 | directă |
| fluxul de înrolare în ajutoarele de test | `server/test/helpers/reportFlow.ts` 46–48; `accounts.test.ts` 31–33 | indirectă |
| resetarea TOTP: starea din bază și auditul | `accounts.test.ts` 126–139 | directă pentru bază; fără verificarea `enroll` la autentificarea următoare |
| promovarea la `super_admin` → `enroll` | — | nu am găsit un test |

Testele rulează cu `APP_ENV: 'development'`.

### 4.3 Concluzia și punctele nedeterminate

Dovezile statice arată că impunerea există și nu depinde de `APP_ENV`.

| # | Ce rămâne nedeterminat | Dovada care l-ar închide |
|---|---|---|
| T-N1 | comportamentul efectiv în modul `production` | un test în modul `production` (E1) sau proba din E4 |
| T-N2 | `enroll` după resetarea TOTP | un test (E1); `cl4TotpFereastraMobila.test.ts` nu a fost citit integral |
| T-N3 | `enroll` după promovarea la `super_admin` | un test (E1) |
| T-N4 | starea conturilor în producție | verificarea în E4 |
| T-N5 | recuperarea ultimului `super_admin` care a pierdut și dispozitivul, și codurile; `civic-bootstrap-admin` refuză dacă există deja un `super_admin` activ (`server/src/accounts.ts` 39–42), deci nu rezolvă cazul | procedură de recuperare scrisă și aprobată, **obligatorie înainte de E4** [CONFIRMAT ca cerință; procedura concretă trebuie încă validată] |
| T-N6 | aspectele procedurale (dispozitive separate, păstrarea codurilor). Pe staging, ambele conturi au TOTP pe același telefon (problema cunoscută nr. 4) | procedura din manualul 7D |

---

## 5. DEC-20: numerotarea TM și restaurarea de probă

**Regula [CONFIRMAT]:** un număr TM emis nu se refolosește niciodată (D25–D26).

**Starea: DESCHISĂ.** Se decide după confirmarea G6 și înaintea probei. În v2.4, domeniul DEC-20 este extins: acoperă atât datele/numerele create de proba de restaurare, cât și toate sesizările, fotografiile, adresele și numerele TM create în E7. Nu presupun acceptarea golurilor, ștergerea datelor sau alegerea unei instanțe izolate și nu aleg o variantă în locul proprietarului.

### 5.1 Ce consumă proba

Scenariul M4 + R19 cere sesizări în baza în care rulează proba:
- o sesizare depusă înainte de copie;
- o sesizare ștearsă după copie;
- una depusă după copie;
- un mesaj rămas în coadă.

Pe staging, M4 a consumat 3 numere (TM-008 – TM-010). Contorul și marcajul lui nu pot fi coborâte de niciun instrument.

### 5.2 Consecințele publice, dacă proba rulează în baza de producție înaintea primei sesizări reale

- Prima sesizare reală nu va fi TM-001.
- Numerele sunt vizibile în e-mailuri, în Admin și, dacă se afișează, pe hartă. Golurile pot fi percepute ca sesizări ascunse sau șterse, ceea ce atinge încrederea într-o platformă civică.
- Primăria primește o numerotare care nu începe de la 1; fără o explicație, poate cere lămuriri.
- O notă publică explicativă este posibilă, dar devine un angajament de comunicare.

### 5.3 Consecințele operaționale, în aceeași variantă

- **Datele de probă rămân temporar în producție:**
  - sesizarea păstrată, până la 45 de zile sau până la ștergerea manuală;
  - marcajul de ștergere, până la data depunerii + 46 de zile;
  - auditul, 6 luni;
  - copiile din `BACKUP_DIR`, 7 zile.
- Mesajul R19 rămâne „reținut” (`failed`) în Admin până la o decizie a unui `super_admin`.
- Dacă lansarea are loc în primele 45 de zile după probă, sesizările de probă pot fi încă vizibile. Trebuie verificate sau șterse înaintea lansării.
- 7D-final trebuie să consemneze golurile și cauza lor.

### 5.4 Variantele

| Varianta | Ce înseamnă | Consecințe | Cod sau procedură nouă |
|---|---|---|---|
| **A. Goluri acceptate** | proba rulează în baza de producție, înaintea datelor reale | §5.2 și §5.3 | curățenia probei și documentarea |
| **B. Instanță de probă izolată** pe găzduirea de producție | bază, `STORAGE_DIR` și `BACKUP_DIR` separate; baza și contorul de producție nu sunt atinse | numerotarea reală poate începe de la 1 · **limitele din §5.5** | procedura unei a doua instanțe; fezabilitatea pe G6: [DOVEZI] |
| **C. Probă urmată de reinițializarea producției** | proba rulează în producție; baza și `BACKUP_DIR` sunt recreate înaintea datelor reale | numerotarea pornește de la 1 · trebuie interpretat dacă regula se aplică numerelor de probă necomunicate public (interpretarea aparține proprietarului) · operație riscantă, fără procedură azi | procedură nouă, de proiectat, testat și aprobat; posibil cod (atunci intră în 7C) |

### 5.6 DEC-20: tratarea datelor create în E7

DEC-20 include acum și sesizările, fotografiile, adresele, mesajele și numerele TM create în acceptanța E7. Variantele A/B/C din §5.4 privesc exclusiv locul probei de restaurare și nu decid automat ce se întâmplă cu datele E7. Pentru acest al doilea subiect, trebuie aleasă și consemnată separat una dintre următoarele variante înainte de E7:

| Varianta | Ce înseamnă | Consecințe și condiții |
|---|---|---|
| **D. Păstrare până la expirarea retenției** | Datele de test sunt marcate și inventariate; rămân numai cât este necesar conform retenției aplicabile și sunt excluse din proiecția publică înainte de E9. | Nu se șterg automat doar pentru a cosmetiza numerotarea. Trebuie stabilite temeiul, termenul și măsura prin care datele nu apar ca sesizări reale; TM rămân consumate. |
| **E. Ștergere controlată înainte de E9** | Un `super_admin` șterge sesizările de test prin mecanismul suportat de aplicație, după inventariere și după ce se verifică impactul asupra fotografiilor și al proiecției publice. | Numerele TM rămân consumate; marcajele de ștergere, auditul și backup-urile pot rămâne până la expirarea retenției lor. Nu se promite ștergere fizică imediată din toate copiile. Este necesară verificarea că fotografiile nu mai sunt public accesibile. |
| **F. Altă variantă aprobată** | Proprietarul stabilește o procedură alternativă, cu perimetru, dovezi și consecințe explicite. | Dacă necesită cod, se aplică regula de redeschidere E1; dacă afectează baza ori fișierele de producție, necesită aprobare operațională separată. |

**Criteriu de închidere:** înainte de E7, proprietarul alege D, E sau F și aprobă procedura. Înainte de E9 există inventar și dovezi pentru fiecare sesizare/fotografie/mesaj de test, tratamentul numărului TM și confirmarea că datele de test nu sunt prezentate public drept sesizări reale. Nicio opțiune nu permite reutilizarea unui număr TM emis.

### 5.5 Limitele variantei B

O instanță izolată dovedește că procedura de restaurare funcționează **pe aceeași găzduire**, cu aceleași versiuni și același mecanism cron. **Nu dovedește automat restaurarea configurației reale de producție și a cronurilor acesteia.** Nu exersează:
- fișierul de setări real (`civic.env`) și impunerea lui asupra sarcinilor cron (comportamentul `nodevenv`, observația 9);
- `BACKUP_DIR`-ul real, cu marcajele reale: contorul, ștergerile, intențiile R18;
- `STORAGE_DIR`-ul real și fotografiile lui;
- sarcinile cron reale: liniile, orele, jurnalele;
- drepturile reale ale utilizatorului bazei de producție.

Dacă se alege B, proprietarul decide separat dacă proba îndeplinește criteriul 7E sau dacă se completează cu verificări read-only ale configurației reale.

---

## 6. Registrul deciziilor

| ID | Decizia | Starea | Opțiunile → consecințe | Recomandarea mea [PROPUNERE] | Blochează pornirea 7C? |
|---|---|---|---|---|---|
| DEC-1 | structura E0–E9 | PRINCIPIU; **aprobarea formală este deschisă** | (a) poarta înainte de 7F · (b) poarta după 7F, înainte de lansare · (c) fără E3 și fără împărțirea 7D — **respinsă în v2.4**, deoarece contrazice structura acceptată de principiu | (a); (b) numai ca rezervă decisă explicit | **da** |
| DEC-2 | noindex prin controlul aplicației | PRINCIPIU | — | specificația din §3 | **da** |
| DEC-2a | numele, valorile și valoarea exactă a antetului | DESCHISĂ | `SEARCH_INDEXING=off\|on`; la `off`, alegere între `X-Robots-Tag: noindex` și valoarea observată pe staging `noindex, nofollow` | păstrarea `noindex, nofollow` pentru a evita schimbarea accidentală; după decizie, alinierea §3 și a testelor la valoarea aleasă | **da** |
| DEC-2b | `on` în alte medii decât producția | DESCHISĂ | refuz la pornire în mediile admise `staging` și `development`; `APP_ENV=test` este respins separat de schema existentă | ca în §3.1 | **da** |
| DEC-2c | valori invalide (inclusiv variabila goală, majuscule, `true`, `1`) | DESCHISĂ | refuz la pornire | ca în §3.1 | **da** |
| DEC-3 | perimetrul 7C | PRINCIPIU | §2, E1: patru puncte confirmate și elemente condiționate | închiderea după DEC-2, DEC-14 și DEC-18 | **da** |
| DEC-3b | riscul rezidual `source-map-js` | AȘTEAPTĂ DOVEZI (`npm ls`, `npm audit`, artefactul, în E1) | se formulează după dovezi | niciuna înainte de dovezi | nu (înaintea checkpoint-ului 7C) |
| DEC-4 | `TRUST_PROXY` (C1) | PRINCIPIU: limitare acceptată, reevaluată la G6 | — | consemnare în E0.3; nu este blocaj de lansare fără dovezi sau o decizie nouă | nu |
| DEC-5 | C2 (restaurarea marcată „neexersată” vs. M4), C4 (moderarea din fluxul critic), C5 (handoff) și corectura observației 4 din jurnal privind `TRUST_PROXY` | DESCHISĂ | confirmare → corectură în E2/E5; observația 4 trebuie aliniată cu DEC-4/AI-1, fără a transforma limitarea acceptată într-un blocaj de lansare automat | confirmarea tuturor punctelor | nu |
| DEC-6 | ghidul 5.5B | PRINCIPIU: istoric | — | antetul „executat la 08.10.2026, intervențiile 11–19; descrie staging-ul vechi; în vigoare: manualul 7D” | nu |
| DEC-7 | G6, găzduirea de producție | DESCHISĂ / [DOVEZI] | — | confirmare cât mai devreme; cerințele sunt în E4 | nu (blochează E4) |
| DEC-8 | D7-4, matricea CI | DESCHISĂ | (a) actuală · (b) redusă · (c) actuală + versiunea de producție | (a) până la G6, apoi (c) | nu (blochează E4) |
| DEC-9 | perimetrul restaurării de probă | PRINCIPIU: M4 + R19; `host-restore --check` condiționat | — | proba de siguranță pe staging în E3, aprobată separat | nu (blochează E4) |
| DEC-10 | blocarea și e-mailul în 7F (C6) | PRINCIPIU: restricție de acces + testare e-mail cu gard suplimentar | — | cele 7 elemente nevalidate, fiecare cu o decizie; DEC-25 controlează e-mailurile reale | nu |
| DEC-11 | participanții și dispozitivele 7F | DESCHISĂ | — | iPhone/Safari obligatoriu; cel puțin un participant din afara echipei de dezvoltare | nu |
| DEC-12 | nivelul verificării GDPR | DESCHISĂ | (a) declarația proprietarului pe baza G-1–G-9 · (b) avizul unui specialist | (b) | nu |
| DEC-13 | D10 în producție | DESCHISĂ | — | nicio dată demo; `check:no-demo` în E4 | nu |
| DEC-14 | redenumirea „Turnu Măgurele Civic” → „Urbis Activ” | **DESCHISĂ** | **1.** textele vizibile (UI, e-mailuri, titlul și metadatele paginii, textele publice, inclusiv politica de confidențialitate) schimbate înainte de MVP → intră în 7C; cere inventarul E0.1-a înaintea perimetrului; 7F validează textele finale · **2.** amânarea după MVP → nimic în 7C; 7F validează texte care se vor schimba; după schimbare sunt necesare o nouă verificare a textelor, posibil actualizarea politicii și a referințelor din acordul Primăriei, plus o regresie a e-mailurilor; inventarul se face oricum înaintea 7D-final. **În ambele variante, identificatorii interni rămân neschimbați în lipsa unui motiv tehnic demonstrat** [CONFIRMAT] | fără recomandare: ține de calendarul și de comunicarea publică | **da**, numai pentru opțiunea 1 |
| DEC-15 | rezervele 7B care pot fi reverificate | DESCHISĂ | — | incluse în scenariile E3/E7 | nu |
| DEC-16 | monitorizarea `backup.log` și a cozii de e-mail | DESCHISĂ | — | un operator numit și o frecvență în manualul 7D, înainte de E4 | nu |
| DEC-17 | criteriile lansării (E9) | DESCHISĂ | — | definite înainte de E8 | nu |
| DEC-18 | D8-8: TOTP pentru `super_admin` în producție (C3) | DESCHISĂ; dovezile statice sunt obținute (§4) | (a) impunerea existentă + cerințele procedurale · (b) = (a) + testele pentru modul `production`, resetarea TOTP și promovarea la `super_admin` · (c) TOTP și pentru alte roluri | **(b)**. În toate variantele: procedura de recuperare a ultimului `super_admin` este obligatorie înainte de E4; dispozitive separate; codurile păstrate offline | **da**, dacă (b) sau (c) |
| DEC-19 | rezerva 5 din 7B (numărul testelor la `7ca5940`) | AȘTEAPTĂ DOVEZI (E0.1-c) | (a) jurnalele recuperate → rezerva închisă cu dovadă · (b) jurnalele indisponibile → acceptarea limitei ca permanentă | încercarea (a); dacă eșuează, decizie explicită (b). Rularea 7C nu închide rezerva | nu (înaintea checkpoint-ului 7C) |
| DEC-20 | numerotarea TM / restaurarea de probă | **DESCHISĂ**; se decide după G6, înaintea probei | A / B / C (§5.4), cu limitele B din §5.5 | fără alegere în locul proprietarului | numai dacă se alege C, iar procedura cere cod |
| DEC-21 | mecanismul restricției de acces în producție până la E9 | **DESCHISĂ; blochează E4** | (a) Basic la nivelul găzduirii, cu riscul ferestrei 401; (b) alt mecanism oferit/validat de găzduire, de ex. restricție IP; (c) alt mecanism documentat și testat. Fără restricție este respins ca variantă de lucru | restricție activă înainte de pornire pe domeniu; test fără credențiale refuzat; menținută până la aprobarea E9 | **nu (blochează E4 și E9; dacă cere cod, decizie înainte de checkpoint-ul 7C)** |
| DEC-22 | minimum două conturi `super_admin` active, pe dispozitive separate | **DESCHISĂ; blochează E4 până la decizie** | (a) obligatoriu; (b) nu, cu acceptarea explicită a riscului și procedură de recuperare directă în DB | (a), ca recomandare de reziliență; decizia aparține proprietarului | **nu (blochează E4)** |
| DEC-23 | copie de backup în afara contului de găzduire | **DESCHISĂ; blochează E4 până la decizie** | (a) copie externă criptată, acces restrâns și retenție documentată; (b) acceptarea explicită a riscului de pierdere simultană a contului și copiilor locale | (a), dacă este fezabilă fără a crea un risc mai mare de expunere a datelor; se verifică GDPR și criptarea | **nu (blochează E4)** |
| DEC-24 | branch-ul-sursă pentru instalarea de producție | **DESCHISĂ; blochează E4** | (a) `faza-5-backend` la SHA aprobat; (b) actualizarea controlată a `main`, cu verificările și aprobările necesare | fără alegere automată; nu se actualizează `main` implicit | **nu (blochează E4)** |
| DEC-25 | gardul de e-mail până la E6 | **DESCHISĂ; blochează E4/E7** | (a) fluxul către Primărie oprit; (b) destinatar de test controlat și adresa reală absentă din `EMAIL_ALLOWLIST`, cu lista verificată la fiecare operație | (a) este cea mai sigură; R19 se probează cu mesaj `on_hold` dacă procedura permite | **nu (blochează E4/E7)** |

---

## 7. E0: delimitarea dovezilor

### 7.1 Înainte de închiderea perimetrului 7C

| Dovada | Decizia | Starea | Dacă dovada nu poate fi obținută |
|---|---|---|---|
| E0.1-b: impunerea TOTP | DEC-18 | obținută (§4) | — |
| E0.1-a: inventarul redenumirii | DEC-14 | necesară numai dacă DEC-14 = 1; altfel se mută înaintea E5 | decizia se ia fără o listă completă → risc de redenumire parțială, descoperit abia în 7F |

### 7.2 Înaintea checkpoint-ului 7C (nu blochează pornirea)

| Dovada | Decizia | Momentul | Dacă dovada nu poate fi obținută |
|---|---|---|---|
| `npm ls source-map-js`, `npm audit` (situația de bază) | DEC-3b | primul pas al E1, înaintea eliminării `autoprefixer` | riscul se prezintă numai cu starea finală, iar limita se declară |
| analiza artefactului | DEC-3b | E1, după build | riscul rămâne „neclasificat”, iar decizia se ia cu limita declarată |
| jurnalele CI pentru `7ca5940` | DEC-19 | oricând înaintea checkpoint-ului 7C | acceptarea explicită a limitei ca permanentă |
| testele T-N1…T-N3 | DEC-18 (b) | E1 | — |
| confirmarea că `APP_ENV=test` este respins de schema existentă și testarea separată a motivului refuzului | DEC-2b | începutul E1 | nu se adaugă `test` în schemă; testul nu pretinde că verifică logica `SEARCH_INDEXING` |

### 7.3 Amânate până la etapele ulterioare

| Dovada | Momentul limită | Dependența | Dacă dovada nu poate fi obținută |
|---|---|---|---|
| T-N5: recuperarea ultimului `super_admin` | înainte de E4 (obligatoriu) | DEC-18 | E4 nu începe |
| siguranța `host-restore:recover --check` | înainte de E4 | DEC-9 | dovezi statice: tranzacția folosește `rollback`/`dryRun`; verificările preliminare citesc marcajele; există totuși un lock `FOR UPDATE` pe contor și trebuie verificat dacă inițializarea CLI scrie/șterge un fișier de probă în `BACKUP_DIR`. Dacă siguranța completă nu este demonstrată, comanda se exclude din proba 7E |
| fezabilitatea restaurării pe G6 | la confirmarea G6 | DEC-7, DEC-9, DEC-20 | criteriul 7E nu se poate închide pe acea găzduire → decizie despre găzduire sau despre criteriu |
| T-N4: starea conturilor în producție | E4 | DEC-18 | criteriu neîndeplinit |
| inventarul redenumirii pentru documente | înainte de E5 | DEC-14 | 7D-final nu se poate declara coerent |
| G-8 (fotografiile afișate public), G-3 (transferurile în afara SEE) | înainte de E6 | DEC-12 | poarta GDPR nu se închide |
| N-1…N-16 | conform §8 | — | conform §8 |

---

## 8. Registrul lucrurilor neconfirmate

Aceste puncte nu sunt fapte.

| # | Ce este neconfirmat | Dovada care lipsește | Unde se închide |
|---|---|---|---|
| N-1 | configurația e-mail de pe staging astăzi este identică cu cea din intervenția 13 | citirea setărilor (fără secrete) sau o probă | E3 |
| N-2 | starea DNS (SPF/DKIM/DMARC) azi | o interogare DNS | E3 / E4 |
| N-3 | eliminarea `autoprefixer` nu afectează build-ul și testele | build-ul și testele 7C | E1 |
| N-4 | `source-map-js` vine și prin `@tailwindcss/vite` (afirmația reauditului) | `npm ls` | E1 |
| N-5 | `source-map-js` nu este livrat în producție | analiza artefactului | E1 |
| N-6 | cele 4 sarcini cron există și rulează azi pe staging | confirmarea din cPanel | E3 |
| N-7 | prima rulare a pașilor noi din `purge:retention` după 20.10.2026 | citirea `purge.log` | E3 |
| N-8 | fusul orar al orelor 03:17 și 03:47 | setarea serverului | E3 |
| N-9 | lista formală a criteriilor M4 (documentul Fazei 6, „Pasul 3B”) | citirea documentului | la nevoie |
| N-10 | starea G6 | confirmarea proprietarului | DEC-7 |
| N-11 | găzduirea de producție permite o a doua bază și cron cu variabile în linie | documentația furnizorului | DEC-7 |
| N-12 | numărul exact de teste la `7ca5940` | jurnalele CI | DEC-19 |
| N-13 | comportamentul pe iPhone/Safari | testul pe dispozitiv | E7 |
| N-14 | sondele de control 7A | o nouă rulare | DEC-15 |
| N-15 | antetele din găzduire funcționează pe LiteSpeed pentru aplicația Node | o probă pe găzduire | numai dacă se renunță la varianta din §3 |
| N-16 | locul lui D8-8 în poartă (C3) | decizia proprietarului | DEC-18 |
| T-N1…T-N6 | punctele TOTP nedeterminate | §4.3 | E1 / E4 |
| N-17 | confirmarea în E1 a respingerii `APP_ENV=test` de către schema existentă și a testului care verifică motivul corect | citirea/verificarea schemei și test separat | începutul E1; nu se adaugă `test` în schema fără decizie explicită |
| N-18 | siguranța `host-restore:recover --check` pe o bază activă | proba pe staging | E3 |
| N-19 | condițiile exacte în care fotografiile apar în proiecția publică | expunerea unei prime fotografii prin proiecția publică este parțial confirmată; condițiile exacte necesită citirea completă a interogării | înainte de E6; G-8 actualizat |
| N-20 | transferurile de date în afara SEE | documentele furnizorilor | înainte de E6 |
| N-21 | jurnalele CI pentru `7ca5940` sunt încă păstrate de GitHub | încercarea de descărcare | DEC-19 |
| N-22 | LiteSpeed servește sau nu direct fișierele statice pe domeniul real, ocolind Node | probă pe domeniu real: rădăcină, fișier static, API, `robots.txt` | E3 și E4 |
| N-23 | comanda CLI de restaurare pregătește `BACKUP_DIR` prin scriere/ștergere de fișier de probă | citirea codului de inițializare CLI; probă numai dacă este sigură și aprobată | DEC-9 / E3 |
| N-24 | subtask al N-19: condițiile exacte de publicare a fotografiilor în proiecția publică | citirea completă a interogării și a proiecției; se închide împreună cu N-19/G-8, nu ca verificare separată | înainte de E6 |
| N-25 | fezabilitatea unei copii externe criptate și implicațiile contractuale/GDPR | documentația găzduirii și furnizorilor, procedura propusă | DEC-23 / înainte de E4 |

---

## 9. Integrarea constatărilor recente

| Constatarea | Unde intră în plan |
|---|---|
| **Ghidul 5.5B** este depășit ca stare și context (neexecutat, domeniul nedecis, staging-ul vechi); variabilele sunt încă valabile (toate cele 9 există în `config.ts`) | DEC-6; manualul E2/E5; N-1, N-2 |
| **`autoprefixer`** nu este referit de nimic (`package.json:34` este singura apariție; Tailwind 4 prin `@tailwindcss/vite`) | E1, perimetrul și criteriul 3; N-3 |
| **`source-map-js`** poate rămâne după eliminarea `autoprefixer`; întâi dovezile | E1, criteriul 4; DEC-3b; N-4, N-5 |
| **Sarcinile programate:** 4 sarcini permanente pe staging; `purge:pow` inclus în `purge:retention`; nicio sarcină documentată pentru producție | E3, criteriile 3, 4, 8; E4, criteriul 10; §10; N-6…N-8 |
| **Jurnalele `surveys-cron.log` și `outbox-cron.log` sunt suprascrise** | limitare documentată în manual; DEC-16 |
| **Backup:** `BACKUP_DIR` în afara docroot-ului, separat de `STORAGE_DIR`, criptarea la G6; fără protecție la backup-uri simultane | E4, criteriul 11 și riscurile; DEC-7 |
| **Restaurarea:** procedura §6.6; M4 demonstrat pe staging; R18, R19 și R20 exersate numai în CI | E4, criteriile 15–22; DEC-9; DEC-20; dovezile statice pentru `host-restore:recover --check` sunt în §7.3 și trebuie confirmate ca sigure înainte de orice probă |
| **noindex** este pus numai pe staging (`app.ts` 114–123) | §3; DEC-2 |
| **TOTP** este impus în cod, independent de mediu, cu trei căi acoperite numai prin deducție | §4; DEC-18 |
| **Acces producție înainte de E9** nu era criteriu explicit în E4 | E4, DEC-21; blocarea obligatorie înainte de pornire și până la E9 |
| **`allowlist`** nu exclude singur destinatarul real al Primăriei | E4, E7, DEC-25; flux oprit sau adresă de test și excluderea adresei reale |
| **Datele E7** pot lăsa sesizări, fotografii, adrese și numere TM în producție | DEC-20 extinsă; criterii E7/E9 |
| **G6** poate cere cod după închiderea 7C | E1, criteriul de închidere 10; confirmare înaintea checkpoint-ului 7C dacă afectează codul |
| **Backup extern și monitorizare** nu erau decise/definite suficient | DEC-16, DEC-23; manual 7D și E4 |
| **Instalare producție**: HTTPS/TLS, secrete unice, primul admin, branch | E4; DEC-24 |
| **Antetul noindex pe staging** este `noindex, nofollow`, în timp ce propunerea din §3 menționează `noindex` | înainte de implementare se decide dacă păstrăm `noindex, nofollow` (recomandat pentru a evita schimbarea accidentală) sau aliniem specificația; staging nu se modifică fără aprobare |
| **`host-restore:recover --check`** are rollback/dry-run static, dar poate lua lock `FOR UPDATE` și inițializarea CLI trebuie verificată pentru scrieri în `BACKUP_DIR` | §7.3; se păstrează ca verificare condiționată, cu dovezile statice și riscurile consemnate |
| **DEC-1 opțiunea (c)** contrazice structura E0–E9 deja acceptată de principiu | marcată „respinsă ca variantă în v2.4”; se poate redeschide numai prin decizie explicită nouă |
| **Observația 4 din jurnalul staging** conține formularea veche despre `TRUST_PROXY` | DEC-5: corectura intră în E2/E5; limitarea acceptată conform DEC-4/AI-1 rămâne consecventă |
| **Criptarea backup-ului** nu poate fi bifată înainte de a defini metoda și gestionarea cheii | E4.11 este explicit „de definit la G6”; fără metodă și dovadă, criteriul rămâne deschis |

---

## 10. Documentația: ciornă vs. final

### 10.1 Poate fi pregătită ca ciornă (E2)

- comenzile CLI și scripturile din „Run JS script” (`cli.ts`, `package-release.py` 71–81);
- variabilele de mediu, inclusiv `SEARCH_INDEXING` și regulile lui;
- procedurile de backup, restaurare și R20 (`FAZA_5_1` §6–§8), cu M4 ca exemplu executat;
- sarcinile programate de pe staging;
- manualul de instalare și operare, care preia operarea din ghidul 5.5B;
- antetul de istoric al ghidului 5.5B;
- handoff-ul actualizat (C5);
- corecturile C2 și C4;
- procedura de recuperare TOTP și a ultimului `super_admin`.

### 10.2 Poate fi declarată finală numai după verificarea producției (E5)

- configurația și căile de producție, versiunile Node și DB;
- sarcinile cron de producție (ore, fus orar, jurnale);
- `BACKUP_DIR` și criptarea;
- rezultatul restaurării de probă și abaterile ei (inclusiv limitele variantei B, dacă este aleasă);
- modul e-mail și DNS-ul de producție;
- starea noindex și procedura de lansare;
- versiunea instalată și rularea CI asociată;
- reevaluarea `TRUST_PROXY` la G6;
- textele finale după redenumire;
- golurile TM și cauza lor, dacă există.

---

## 11. Ce este confirmat, ce este propunere, ce cere dovezi

**Confirmat** (hotărâri de principiu sau fapte consemnate):
- structura E0–E9;
- noindex printr-un control explicit în aplicație, dezactivat implicit;
- noindex nu înlocuiește controlul accesului;
- perimetrul de bază al 7C;
- `TRUST_PROXY`: limitare acceptată, reevaluată la G6;
- ghidul 5.5B: istoric;
- restaurarea de probă: M4 + R19;
- regula „un număr TM nu se refolosește”;
- 7F cu blocare și `allowlist`; documentarea elementelor nevalidate;
- rezerva 5 nu se închide prin rularea 7C;
- `source-map-js`: întâi dovezile;
- politica de confidențialitate ≠ verificare juridică;
- procedura de recuperare a ultimului `super_admin`: obligatorie înainte de E4;
- identificatorii interni rămân neschimbați în lipsa unui motiv tehnic;
- faptele: `autoprefixer` nereferit; cele 4 sarcini cron de staging consemnate la 07–08.10; M4 executat la 13.10; impunerea TOTP prezentă în cod (citire statică).

**Numai propunere (nu este încă aprobare a proprietarului):**
- specificația exactă `SEARCH_INDEXING` (§3) și testele ei, cu `APP_ENV=test` tratat separat ca valoare respinsă de schema actuală;
- criteriile de închidere ale etapelor;
- restricția de acces în producție până la E9 (DEC-21);
- gardul de e-mail până la E6 (DEC-25);
- regula de redeschidere E1 și reverificare E3/E4 după un defect care cere cod;
- extinderea DEC-20 la datele de test din 7F;
- checklist-ul E8 și cerințele suplimentare de instalare, monitorizare și backup;
- dovezile GDPR G-1–G-10;
- lista celor 7 elemente nevalidate de 7F;
- recomandările din registru, inclusiv DEC-18 (b).

**Necesită dovezi:** §7.2, §7.3 și §8.

**Decizii deschise:** toate rândurile din §6 marcate DESCHISĂ sau AȘTEAPTĂ DOVEZI, inclusiv aprobarea formală a DEC-1, DEC-14, DEC-20 și deciziile noi DEC-21, DEC-22, DEC-23, DEC-24 și DEC-25.

---

## 12. Deciziile care vă aparțin efectiv

### 12.1 Înainte de aprobarea planului și de pornirea 7C

| Ordinea | Decizia | De ce în această ordine |
|---|---|---|
| 1 | **Aprobarea explicită a planului, versiunea 2.4 (DEC-1)** | celelalte decizii se raportează la această structură |
| 2 | **DEC-2a/2b/2c:** specificația `SEARCH_INDEXING` din §3, inclusiv valoarea exactă a antetului (`noindex` sau `noindex, nofollow`) observată pe staging | fixează codul și testele din 7C; alegerea se consemnează în DEC-2a, apoi §3 și testele se aliniază la ea |
| 3 | **DEC-18:** (a), (b) sau (c) | (b) și (c) adaugă elemente în perimetrul 7C |
| 4 | **DEC-14:** opțiunea 1 sau 2. Dacă alegeți 1: aprobarea inventarului read-only E0.1-a, apoi decizia de perimetru | numai opțiunea 1 schimbă perimetrul 7C |
| 5 | **DEC-3:** perimetrul 7C declarat închis | se poate închide numai după deciziile 2–4 și clarificarea G6 pentru cerințele care pot impune cod |

**Notă despre DEC-21:** mecanismul de restricție a accesului este, în mod normal, o decizie operațională pentru E4 și nu blochează pornirea 7C. Dacă evaluarea arată că mecanismul ales cere modificări în aplicație, trebuie luată acea decizie înainte de închiderea perimetrului 7C, iar orice cod necesar trebuie inclus explicit în perimetru și aprobat.

### 12.2 Înainte de E4 (și, după caz, E7/E9)

| Ordinea | Decizia | De ce în această ordine |
|---|---|---|
| 1 | **DEC-21:** restricția de acces în producție | mecanismul trebuie decis și verificat înainte de pornirea pe domeniu; restricția rămâne până la E9 |
| 2 | **DEC-22:** două conturi `super_admin` | decideți dacă devine criteriu obligatoriu E4 sau dacă riscul se acceptă explicit |
| 3 | **DEC-23:** backup extern | decideți dacă se implementează copia externă criptată sau se acceptă riscul |
| 4 | **DEC-24:** branch-ul de producție | stabilește proveniența exactă a artefactului și dacă `main` rămâne neatins |
| 5 | **DEC-25:** gardul de e-mail până la E6 | obligatoriu înainte de E4/E7; nu poate rămâne o presupunere bazată doar pe `allowlist` |
| 6 | **DEC-20:** proba de restaurare și datele E7 | DEC-20 se decide după G6 și înaintea probei; varianta pentru datele E7 se alege înainte de E7 |

**Ce nu blochează pornirea 7C:**
- DEC-20, în afara variantei C din §5.4 dacă aceasta cere cod;
- DEC-3b și DEC-19, care trebuie rezolvate înaintea checkpoint-ului 7C, nu înaintea pornirii E1;
- DEC-7, DEC-8 și DEC-9, ca decizii operaționale pentru E4, cu excepția oricărei concluzii G6 care cere cod;
- DEC-21–DEC-25, în măsura în care soluțiile alese sunt operaționale și nu cer modificări de cod;
- restul registrului, conform dependențelor explicite din §6.

## 13. Istoricul versiunilor

| Versiunea | Modificările |
|---|---|
| 1 | primul plan consolidat: E0–E9, registrul deciziilor, punctele neconfirmate, alternativele noindex |
| 2 | integrarea celor 11 hotărâri de principiu; dovezile GDPR G-1–G-10; elementele nevalidate de 7F; E0.1 |
| 2.1 | verificarea read-only TOTP (DEC-18); consecințele numerotării TM (DEC-20); delimitarea dovezilor din E0 |
| 2.2 | specificația `SEARCH_INDEXING`; limitele instanței izolate; DEC-18 (b) și procedura obligatorie înainte de E4; opțiunile DEC-14 |
| 2.3 | regula `SEARCH_INDEXING` pe medii (`on` numai în producție); testele pentru `on` în `development` și `test`; limita „noindex ≠ controlul accesului”; documentul integral |
| 2.4 | integrarea analizei critice: accesul la producție blocat până la E9; gard suplimentar pentru e-mailuri; corectarea testului `APP_ENV=test`; datele de test E7 incluse în DEC-20; revenire controlată după defecte; commit candidat; cerințe de instalare, G6, monitorizare, backup extern și checklist E8; decizii DEC-21–DEC-25 deschise |

---

> **Planul, versiunea 2.4, este o propunere și nu este aprobat. Etapa E1 nu este autorizată.** Documentul integrează recomandările analizei critice, dar nu închide deciziile care aparțin proprietarului. Nu au fost modificate repository-ul, codul sau configurațiile; nu au fost rulate teste; nu s-au făcut commit/push și nu s-a intervenit pe staging sau producție.

Așteaptă revizia proprietarului și aprobarea explicită.