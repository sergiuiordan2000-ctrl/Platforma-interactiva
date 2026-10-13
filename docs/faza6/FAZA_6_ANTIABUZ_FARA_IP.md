# Faza 6 — Protecția anti-abuz fără adresa IP a vizitatorului (analiză pentru varianta B)

**Data:** 13.10.2026. **Versiunea analizată:** `d0fbd86`. **Starea:** analiză, **fără modificări de cod**. Numerele din §3 sunt propunerile inițiale; **deciziile proprietarului din 13.10.2026 sunt în §5** (D-B1…D-B5) și au întâietate.

## 0. De ce

- Proba din 13.10.2026 (`FAZA_6_TRUST_PROXY.md`, 1c): serverul web al găzduirii înlocuiește adresa vizitatorului cu valoarea din antetul `X-Forwarded-For` trimis chiar de vizitator. Nicio valoare a lui `TRUST_PROXY` nu este sigură.
- Răspunsul furnizorului (13.10.2026, după cererea precisă din varianta A): pe găzduirea partajată nu modifică această configurare; recomandă VPS sau server dedicat.
- Planul (§4 din `FAZA_6_TRUST_PROXY.md`): dacă A eșuează, se alege între **B** (rămânem; protecția nu se mai bazează pe IP) și **C** (altă găzduire).

Cu `TRUST_PROXY` nesetat (starea de acum, singura sigură), aplicația vede **aceeași adresă pentru toți vizitatorii**. Fiecare limită „pe IP” devine o **limită comună întregului oraș**.

## 1. Constatare nouă: limitele pe IP devin plafoane pentru tot orașul (RA-9, blocantă pentru lansare)

Aceasta lărgește RA-5 din reaudit: nu este doar o problemă de securitate, ci una de funcționare. Cu toți vizitatorii pe aceeași „adresă”, valorile de acum înseamnă, pentru **toată platforma**:

| Ce | Limita de acum (pe IP) | Ce înseamnă pentru tot orașul | Fișierul |
|---|---|---|---|
| sesizări | 5 / oră și 20 / zi | **cel mult 5 sesizări pe oră și 20 pe zi, în tot orașul** | `routes/reports.ts:288–289` |
| voturi la un sondaj | 10 / oră / sondaj; 300 / oră în total | **cel mult 10 voturi pe oră la un sondaj** | `routes/surveys.ts:118–119` |
| cereri de cod (cetățean) | 20 / oră | 20 de persoane pe oră se pot autentifica cu cod | `routes/citizens.ts:82` |
| verificări de cod | 40 / oră | 40 de verificări pe oră, pentru toți | `routes/citizens.ts:154` |
| autentificare Google | 20 / oră (pornire) + 20 / oră (întoarcere) | 20 de autentificări Google pe oră | `routes/citizenGoogle.ts:66, 112` |
| autentificare Admin | 20 / 15 min | oricine poate consuma limita; atunci nimeni nu mai intră în Admin 15 minute | `routes/auth.ts:97` |
| căutarea adresei pe hartă | 30 / oră (+ 50 / min global) | 30 de căutări pe oră, pentru toți | `routes/reports.ts:185–186` |
| dezabonare | 30 / oră | 30 de dezabonări pe oră | `routes/reports.ts:137` |

Pe staging, cu un singur om, nu se observă. **La lansare, aceste limite ar bloca utilizarea normală** (de exemplu, a 21-a sesizare dintr-o zi), iar un singur abuzator ar putea consuma oricare dintre ele pentru toată lumea.

**Corectură:** la 13.10.2026 am spus că votul nu folosește IP-ul. Este greșit: voturile au două limite pe IP (rândul de mai sus). Amprenta votului (jetonul din browser) nu folosește IP-ul, dar limitele de frecvență îl folosesc.

## 2. Ce protecții nu depind de IP (există deja)

| Protecția | Unde |
|---|---|
| contul confirmat prin cod pe e-mail (sau Google) pentru orice sesizare | `requireCitizen` |
| cel mult 5 sesizări / cont / 24 h; cel mult 3 transmiteri către Primărie / cont / 24 h | `routes/reports.ts` |
| cel mult 5 cereri de cod / adresă / oră și 3 e-mailuri de cont / adresă / zi | `routes/citizens.ts` |
| cel mult 5 încercări pe cod (atomic, RA-1) | `routes/citizens.ts` |
| blocarea contului Admin după 5 parole greșite (15 min); TOTP pentru `super_admin` | `routes/auth.ts` |
| vot: un vot pe jeton de browser și sondaj; câmp-capcană; timp minim de completare; ALTCHA opțional pe sondaj | `routes/surveys.ts`, `surveys.ts` |
| sesizări: câmp-capcană; timp minim; ALTCHA opțional (`reports.pow_enabled`) | `routes/reports.ts`, `settings.ts` |
| blocarea cetățenilor de către `super_admin` (15 zile sau definitiv) | `routes/citizens.ts` |
| limita globală a căutărilor de adresă (cerința Nominatim: o cerere pe secundă) | `routes/reports.ts:186` |

## 3. Propunerea pentru varianta B, limită cu limită

Principiul: **nicio limită comună nu trebuie să poată fi consumată de un singur om**, cu excepția celor impuse din afară (Nominatim). Protecția trece pe cont, pe adresa de e-mail și pe ALTCHA (o problemă de calcul rezolvată de browser înaintea cererii, care face abuzul în masă costisitor).

| Limita de acum | Propunerea | Ce o înlocuiește | Riscul rămas |
|---|---|---|---|
| sesizări 5 / oră, 20 / zi pe IP | **eliminată** | 5 / cont / 24 h (există); contul cere cod pe e-mail; **ALTCHA pornit implicit** pentru sesizări | cine are multe adrese de e-mail poate crea multe conturi; frânat de codul pe e-mail, de ALTCHA și de blocarea de către Admin |
| voturi 10 / oră / sondaj, 300 / oră pe IP | **eliminate** | un vot pe jeton de browser (există); **ALTCHA obligatoriu** la vot; capcana și timpul minim (există) | cine golește jetonul din browser și rezolvă ALTCHA din nou poate vota de mai multe ori (era posibil și acum, în ritmul limitei); sondajele rămân consultative |
| cereri de cod 20 / oră pe IP | **eliminată** | 5 / adresă / oră și 3 e-mailuri / adresă / zi (există); **ALTCHA la cererea de cod** (nou) | trimiterea de coduri către multe adrese; costul ALTCHA o frânează |
| verificări de cod 40 / oră pe IP | **eliminată** | 5 încercări / cod (atomic) × 3 coduri / zi / adresă = cel mult 15 încercări pe zi pentru o adresă (probabilitate de ghicire ≈ 1 la 67 000 pe zi) | — |
| Google 20 / oră pe IP | **eliminată** | Google limitează singur; încercarea expiră în 10 minute; bifa politicii | pornirea repetată a fluxului fără finalizare (fără efect asupra altora) |
| Admin 20 / 15 min pe IP | **înlocuită** cu o limită de **calcule simultane de parolă** (de exemplu 2 deodată; restul primesc „reveniți peste câteva secunde”) | blocarea contului după 5 eșecuri (există); TOTP | un atacator care știe adresa unui cont Admin îl poate bloca 15 minute (RA-5, compromis cunoscut); adresele Admin nu sunt publice |
| căutare adresă 30 / oră pe IP | **eliminată**; rămâne 50 / min global | numai cetățenii autentificați pot căuta (există) | un cetățean poate consuma limita globală pe un minut; propunere suplimentară: 30 / cont / oră |
| dezabonare 30 / oră pe IP | **eliminată** | jetonul unic din e-mail (există) | — |

Note:
- **Calculele simultane de parolă:** fiecare verificare `scrypt` folosește circa 32 MiB. Fără limită pe IP, un val de cereri ar putea epuiza memoria aplicației pe găzduirea partajată. O limită de simultaneitate protejează serverul fără să blocheze pe nimeni mai mult de câteva secunde.
- **`ip_hash`** rămâne în sesiuni, în jurnalul de audit și în respingeri, dar are aceeași valoare pentru toți (informație fără valoare, inofensivă). Poate fi păstrat pentru o eventuală mutare pe VPS.
- **Limitele rămân în cod, cu valoare „dezactivată” pe găzduirea partajată** (o setare, de exemplu `IP_LIMITS=off`), ca la o mutare pe VPS cu `TRUST_PROXY` corect să poată fi repornite. Alternativa: eliminarea lor din cod.

## 4. Ce ar cere varianta B

1. **Amendament de design** (B7 anti-abuz, DN-15), decis de proprietar: lista de mai sus.
2. **Cod:** limitele pe IP dezactivate prin setare; ALTCHA la cererea de cod; ALTCHA implicit pentru sesizări și obligatoriu la vot; limita de simultaneitate la parolele Admin; eventual limita pe cont la căutarea adresei.
3. **Teste** noi (cu probe de control) și adaptarea celor care verifică limitele pe IP (de explicat una câte una).
4. **Interfața:** ALTCHA la cererea de cod este nou pentru formularul de autentificare (componenta există deja pentru sesizări și sondaje).
5. **Instalare pe staging**, cu aprobare.

Estimare: o sesiune de lucru pentru cod și teste, plus instalarea.

## 5. Decizii cerute proprietarului

| Nr. | Decizia | Variante |
|---|---|---|
| D-B1 | Varianta de durată | **B** (această analiză) sau **C** (VPS / altă găzduire). **Decis la 13.10.2026: B.** |
| D-B2 | Limitele pe IP | dezactivate prin setare (recomandat) sau eliminate din cod. **Decis la 13.10.2026: dezactivate prin setare.** |
| D-B3 | ALTCHA | la cererea de cod (nou), implicit la sesizări, obligatoriu la vot: da / nu, pe rând. **Decis la 13.10.2026: toate trei** (cererea de cod; sesizări pornit implicit, Admin îl poate opri; vot obligatoriu) |
| D-B4 | Parolele Admin | limită de simultaneitate în loc de limita pe IP. **Decis la 13.10.2026: cel mult 2 verificări simultane, fără ALTCHA la Admin** |
| D-B5 | Căutarea adresei | 30 / cont / oră în plus față de limita globală. **Decis la 13.10.2026: 20 / cont / oră** + limita globală |
