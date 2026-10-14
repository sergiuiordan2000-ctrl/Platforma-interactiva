# Faza 6, Pasul 2 — `TRUST_PROXY`: identificarea configurației reale

**Data:** 13.10.2026. **Staging:** `test.urbisactiv.ro` (ClausWeb, LiteSpeed, Node 24), versiunea `27b1b5f`.
**Planul:** `docs/faza6/FAZA_6_PLAN.md`, Pasul 2, cu amendamentul D-2 din 12.10.2026 (sursa B = pagina de diagnostic din aplicație).
**Starea:** **oprit la condiția din plan** („serverul web nu curăță antetul primit de la vizitator”). **Nu s-a activat nimic.** `TRUST_PROXY` rămâne nesetat.
**Actualizare (14.10.2026):** Pasul 2 este **încheiat** prin decizia proprietarului din 14.10.2026, AI-1, varianta A: verificarea a fost făcută, o configurație sigură nu s-a putut obține, iar protecția anti-abuz trece pe varianta B (§6). Adresa reală a vizitatorului **nu** a fost obținută.

## 1. Sursele

| Sursa | Rezultat |
|---|---|
| A — furnizorul (tichetul din 09.10.2026, reluat la 12.10.2026) | fără răspuns la întrebarea despre IP; la 13.10.2026 au răspuns numai despre copiile contului și jurnale (jurnalul staging-ului, observația 11). Tichetul nou (varianta A, 13.10.2026): fără răspuns |
| B — pagina de diagnostic `GET /api/v1/diag/client-ip` (`DIAG_CLIENT_IP=on`) | pornită la 13.10.2026, ~06:48; oprită la ~07:04 (404 confirmat) |
| probă `curl` din exterior, fără memoria HSTS a browserului | 12.10.2026, ~21:36 |

Dovezile: capturile proprietarului; jurnalul staging-ului, intervențiile 29, 32, 36–38 (`docs/faza5/STAGING_URBISACTIV_JURNAL.md`). Adresele IP reale nu se consemnează.

## 2. Constatările

| Întrebarea | Ce s-a văzut | Concluzia |
|---|---|---|
| 1a. De la ce adresă vede aplicația conexiunea | `remoteAddress` = `127.0.0.1`, `remoteFamily` și `localAddress` goale, la calculator și la telefon | serverul web predă cererea local, printr-un canal intern; aplicația vede **aceeași adresă pentru toți** (explică R10) |
| 1b. Antetul cu adresa vizitatorului | `X-Forwarded-For`, cu **o singură** adresă publică; **diferită** la calculator și la telefonul pe date mobile | antetul poartă adresa vizitatorului atunci când vizitatorul nu trimite el însuși antetul |
| **1c. Antetul trimis de vizitator** | cerere cu `X-Forwarded-For: 203.0.113.7` → aplicația primește `203.0.113.7, 203.0.113.7,203.0.113.7`; **adresa reală lipsește** | serverul web **crede** antetul vizitatorului și îl folosește drept adresa clientului. Deducție (neconfirmată de furnizor): setarea LiteSpeed de preluare a adresei clientului din antet este activă |
| 1d. Alt proxy sau CDN | fără `X-Real-IP`, `Forwarded`, `CF-Connecting-IP`, `Via` | niciunul vizibil |
| 2. Redirecționarea `http` → `https` | `curl -I http://test.urbisactiv.ro` → `401`, fără `301`/`302` | **nu există**; lacătul cere parola și pe `http` (parola ar circula necriptată la o primă vizită pe `http`) |
| 3. Jurnalul aplicației | o pornire refuzată intenționat a scris mesajul în `civic-test-app/stderr.log` | **erorile de pornire se pot citi** în `stderr.log`. Unde ajunge ieșirea standard (jurnalul obișnuit) **nu s-a aflat** |

Alte observații: `X-Forwarded-Proto` = `https` (corect); pagina de diagnostic a fost protejată de lacăt; valoarea antetului `Authorization` nu a fost afișată.

## 3. Ce înseamnă pentru `TRUST_PROXY`

- **Nicio valoare a lui `TRUST_PROXY` nu este sigură pe această găzduire.** Orice formă care citește `X-Forwarded-For` (`true`, o listă cu `127.0.0.1`) ar lua adresa aleasă de vizitator: oricine și-ar putea schimba adresa la fiecare cerere și ar ocoli limitele pe IP (B7, T-SEC-9).
- **Starea actuală** (`TRUST_PROXY` nesetat) nu este falsificabilă, dar toți vizitatorii au aceeași adresă: **limitele pe IP sunt comune întregului site** (de exemplu, cele 20 de porniri ale autentificării Google pe oră). Un singur abuzator le poate consuma pentru toți.
- Criteriile T1–T4 **nu pot fi îndeplinite** până la o schimbare pe găzduire.

## 4. Decizia proprietarului (13.10.2026)

**Varianta A:** cerere precisă către furnizor: dezactivarea preluării adresei clientului din antet (în LiteSpeed, setarea de tip „Use Client IP in Header”) pentru `urbisactiv.ro` și `test.urbisactiv.ro`, sau limitarea ei la adresele proxy-ului propriu („Trusted IP Only”). Tichet nou, trimis la 13.10.2026, ~07:10.

**Până la răspuns:** varianta B, adică `TRUST_PROXY` rămâne nesetat (starea actuală).

**Variantele neluate, de reconsiderat dacă A eșuează:** B ca soluție de durată (limitele pe IP rămân comune; se întăresc alte protecții: pe cont, pe adresa de e-mail, ALTCHA; analiză și cod nou) sau C, altă găzduire pentru producție.

**Urmarea (13.10.2026):** furnizorul a refuzat schimbarea și a recomandat VPS sau server dedicat; proprietarul a ales **B** ca soluție de durată (D-B1, `FAZA_6_ANTIABUZ_FARA_IP.md` §5), instalată pe staging în `cb4cc45`.

## 5. Pașii următori

1. ~~La răspunsul furnizorului: proba se reface~~ — furnizorul a refuzat (13.10.2026). Proba se reface numai la o schimbare a găzduirii (varianta C) sau a configurației furnizorului (pagina de diagnostic pornită temporar, cu aprobare separată), inclusiv brațul cu antetul falsificat.
2. Numai dacă adresa reală apare, nefalsificabil: configurația `TRUST_PROXY` se stabilește aici, motivată, apoi se aplică pe staging cu aprobare și se verifică după T1–T4. Până atunci, `TRUST_PROXY` rămâne nesetat.
3. După închiderea Pasului 2: codul paginii de diagnostic se scoate din aplicație, printr-un commit separat (amendamentul D-2). **Pasul 2 fiind încheiat (14.10.2026), condiția se aplică acum;** rămâne o problemă de lansare (`FAZA_6_RAPORT.md`, Lista 6, L5).
4. Redirecționarea `http` → `https`: **rezolvată pe staging la 13.10.2026** printr-o regulă `.htaccess` cu 301, aplicată înaintea lacătului (jurnalul staging-ului, intervențiile 39–40). Pentru `urbisactiv.ro` aceeași regulă se pune la instalarea producției, cu aceeași probă `curl`.

~~**Lansarea nu este posibilă** cât timp 1c rămâne așa: este o condiție obligatorie a Fazei 6.~~ Înlocuit prin §6 (14.10.2026).

## 6. Amendament: încheierea Pasului 2 prin varianta B (decizia proprietarului din 14.10.2026, AI-1, varianta A)

- **Verificarea a fost făcută** (13.10.2026, intervențiile 36–38 din jurnalul staging-ului): serverul web crede antetul `X-Forwarded-For` trimis de vizitator (1c); **o configurație sigură a `TRUST_PROXY` nu se poate obține** pe această găzduire.
- **Proprietarul a acceptat varianta B:** protecția anti-abuz nu se mai bazează pe adresa IP a vizitatorului (D-B1…D-B5 și riscurile acceptate, `FAZA_6_ANTIABUZ_FARA_IP.md` §5).
- **Acceptarea nu echivalează cu obținerea adresei IP reale.** Criteriile T1–T4 rămân **neîndeplinite** și nu se consemnează ca trecute (`FAZA_6_RAPORT.md`, Listele 2 și 3). Lipsa adresei reale este o **limitare acceptată**, nu o problemă rezolvată.
- **Urmarea pentru Faza 6:** 1c nu mai este o condiție de închidere a Fazei 6. Condiția D-4 a planului (verificarea `TRUST_PROXY` înaintea închiderii reauditului) este îndeplinită prin verificarea făcută (`FAZA_6_PLAN.md`, §0.2).
- **Ce nu schimbă:** blocajele pentru pilot, pentru folosirea datelor reale și pentru lansarea publică rămân separate (`FAZA_6_RAPORT.md`, Lista 6) și nu sunt rezolvate prin această decizie. Varianta C (altă găzduire, cu adresa reală) rămâne calea de reevaluare.
