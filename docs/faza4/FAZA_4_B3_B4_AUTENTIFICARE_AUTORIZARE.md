# FAZA 4 — B3 AUTENTIFICARE ȘI SESIUNI · B4 AUTORIZARE PE SERVER

**Proiect:** Turnu Măgurele Civic · **Data:** 27.09.2026 · **Stare:** proiect, neînghețat
**Bază:** D8 (RULES §11.5), G1 (N-2), RULES §6 (regulile 5D, 6.1–6.6), `permissionService.ts`, `authService.ts` (**parolele actuale nu se reproduc**)

> **Revizia 1 (SET-01, 27.09.2026):** modificările sunt marcate **[SET-01]** (vezi `FAZA_4_DECIZII_NOI.md` §0 și §C).
>
> **Revizia 2 (SET-A-01, 27.09.2026):** D8–D31 și A-1…A-9; modificările sunt marcate **[SET-A-01]** (§0.3, §D). Conturile cetățenilor: B3 §8; drepturile exclusive ale `super_admin`: B4 §2.4.
>
> **Revizia 3 (SET-A-02, 27.09.2026):** 2.1–2.15 + corecturile 1–13; marcaj **[SET-A-02]** (`FAZA_4_DECIZII_NOI.md` §0.4). Schimbări principale: `reports.moderate` eliminat (matricea: 23 + 3 = 26 / operator 12); drepturile exclusive extinse (2.11); recuperarea TOTP (2.15).
>
> **Revizia 4 (SET-A-03, 28.09.2026):** K-A02-3, REC-01, B-7, K-A02-4, DN-19; marcaj **[SET-A-03]**. Schimbări principale: blocarea 15 zile / definitivă și datele minime (B3 §8); ștergerile nu se auditează (B4 §5).

> Valorile numerice de mai jos (durate, praguri, parametri) sunt **PROPUNERI** marcate ca atare. Ele se confirmă la aprobarea checkpoint-ului Fazei 4 (DN-15).

---

# B3 — AUTENTIFICARE ȘI SESIUNI

## 1. Conturile

- ~~Numai conturi Admin; **fără conturi de cetățeni** (N4-2). **[SET-01] C-1:** confirmat; „contul” din DN-12 înseamnă numai adresa de e-mail din formularul de sesizare.~~
- **[SET-A-01] A-4 / D29:** două tipuri de cont: **Admin** (acest capitol, §1–§7) și **cetățean** (§8, necesar **numai** pentru depunerea sesizărilor). Votul rămâne fără cont (N4-2, D17).
- Administrare exclusiv de `super_admin`: creare, dezactivare / reactivare, resetarea parolei, schimbarea rolului; **fără ștergere** (D8-1, D8-2).
- Adrese de e-mail numai controlate de proiect sau furnizate de Primărie (D8-6).
- Cele 3 conturi hardcodate și parolele lor **dispar** din cod la 5.2. Parolele istorice **nu autentifică** backend-ul (RULES §10; test obligatoriu, B10).

## 2. Parolele

| Element | Proiect |
|---|---|
| Algoritm | `crypto.scrypt` din Node (G1; fără modul nativ) |
| Parametri (**propunere**) | `N = 2^15`, `r = 8`, `p = 3`, sare de 16 octeți, cheie de 64 de octeți. Aceasta este una dintre configurațiile echivalente recomandate de OWASP (Password Storage Cheat Sheet: `N=2^17,r=8,p=1` ≈ `N=2^15,r=8,p=3`), cu memorie ≈ 32 MiB per hash, potrivită cu 2 GB RAM. **De reconfirmat față de ghidul OWASP la implementare.** |
| Format stocat | `scrypt$<N>$<r>$<p>$<salt-b64>$<hash-b64>`, deci parametrii pot crește ulterior fără migrare (re-hash la următoarea autentificare) |
| Comparare | în timp constant (`crypto.timingSafeEqual`) |
| Politică (**propunere**) | 12–128 de caractere; fără reguli de compoziție; interzise: e-mailul contului și o listă scurtă de parole comune, inclusă în cod; fără expirare periodică |
| Parolă temporară | generată de server (aleatoare, 16+ caractere), **afișată o singură dată** celui care o generează; `must_change_password = true` |

## 3. Sesiunea pe server (G1)

| Element | Proiect |
|---|---|
| Jeton | 32 de octeți aleatori (`crypto.randomBytes`); în DB se stochează numai `SHA-256` (tabelul `sessions`) |
| Cookie | `__Host-civic_sid`; `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, **fără `Domain`** (B-7); fără `Max-Age` (se închide odată cu browserul) sau egal cu expirarea absolută (DN-15) |
| Expirare (**propunere**) | prin inactivitate **60 de minute**; absolută **12 ore** |
| Rotație | jeton nou la autentificare și după trecerea pasului TOTP (anti-fixare) |
| Revocare | logout; dezactivarea contului; schimbarea rolului; resetarea sau schimbarea parolei (se revocă celelalte sesiuni); resetarea TOTP |
| Stare pre-MFA | după o parolă corectă, sesiunea are `mfa_state = pending` și permite **numai** endpoint-urile TOTP și logout; expiră în 5 minute (**propunere**) |
| CSRF | `SameSite=Strict` + verificarea `Origin` / `Referer` pe metodele care modifică date + antetul obligatoriu `X-Civic-Request: 1` (formularele cross-site nu pot seta antete) |
| Stocare | exclusiv DB: aplicația este fără stare în memorie (B-8) |

## 4. Blocarea după încercări repetate

| Nivel | Regulă (**propunere**) |
|---|---|
| Per cont | 5 eșecuri consecutive → `locked_until = acum + 15 min`; se resetează la o autentificare reușită |
| Per IP (hash) | 20 de încercări / 15 min → HTTP 429 (tabelul `rate_limits`) |
| Mesaje | **generice** („E-mail sau parolă incorecte”); nu se dezvăluie existența contului sau blocarea |
| Deblocare | automată, la expirare; sau prin resetarea parolei de către `super_admin` |
| Jurnal | respingerile se agregă în `rejected_attempts` (`area = login`) |

## 5. TOTP pentru `super_admin` (D8-8)

| Element | Proiect |
|---|---|
| Standard | RFC 6238: SHA-1, 6 cifre, pas de 30 s, toleranță ±1 pas; bibliotecă JavaScript pură (`otpauth`) |
| Secret | 160 de biți, criptat AES-256-GCM cu `TOTP_ENC_KEY` (variabilă de mediu); **nu apare** în audit, jurnale sau răspunsuri după activare |
| Anti-reluare | un cod acceptat o singură dată (`totp_last_step`) |
| Înrolare | la prima autentificare a unui `super_admin` fără TOTP: secretul se afișează ca text și cod QR (**DN-16**: bibliotecă QR în frontend) → confirmare cu un cod valid |
| Obligativitate | **DN-17**: din ce mediu devine obligatoriu (D8-8 cere „înainte de date reale”) |
| Pierderea telefonului | ~~**DN-18**~~ **[SET-A-02] 2.15, ambele mecanisme, proceduri distincte și auditate:** (A) **coduri de recuperare** generate la configurarea TOTP (de exemplu 10), afișate o singură dată, stocate numai ca HMAC (`admin_recovery_codes`), fiecare de unică folosință; (B) **resetarea TOTP de către alt `super_admin`** (`accounts.manage`), care revocă sesiunile și codurile contului. Recomandarea „minimum 2 `super_admin` activi” rămâne. Procedura CLI de urgență rămâne numai pentru pierderea tuturor accesurilor (decizie tehnică). |
| `primarie_operator` | TOTP opțional (nu este cerut de D8-8) |

## 6. Primul `super_admin` (D8-5)

1. Comandă CLI unică: `bootstrap-admin --email <adresă controlată>`, rulată de administratorul tehnic.
2. Refuză să ruleze dacă există deja un `super_admin` activ.
3. Generează o parolă temporară aleatoare, **afișată o singură dată** în consolă (nu se scrie în fișiere sau jurnale), cu `must_change_password = true`.
4. La prima autentificare: schimbarea parolei + înrolarea TOTP.
5. Pe staging (fără Terminal): comanda se rulează prin mecanismul cPanel („Run JS script”) sau printr-un cron unic, eliminat după rulare. Procedura exactă se validează la testul K2 (5.1).

## 7. Resetarea parolei

- Până la 5.5: numai de către `super_admin`. Se generează o parolă temporară afișată o dată; sesiunile contului se revocă; se înregistrează în audit (D8-7).
- După 5.5: resetarea prin e-mail este posibilă, dar **nu este proiectată acum** (D8-7: „poate exista”; va fi o decizie separată).


## 8. [SET-A-01] Contul cetățeanului (D29–D31, D8, D13–D18, A-4, A-9)

| Element | Proiect | Statut |
|---|---|---|
| Când se cere | numai la „Depune o sesizare”; restul aplicației funcționează fără cont (A-9) | **aprobat** |
| Date | numai e-mailul, obligatoriu (A-9); fără nume, telefon, CNP, adresă | **aprobat** |
| Unicitate | un e-mail = un cont (D30); e-mail normalizat + `UNIQUE` | aprobat + tehnic |
| Confirmare | contul devine activ după confirmarea e-mailului (D31) | **aprobat** |
| Mecanism | **cod unic de 6 cifre trimis pe e-mail**, folosit la confirmare și la fiecare autentificare ulterioară; **fără parolă**. Motiv: A-9 cere numai e-mailul; o parolă ar adăuga resetări și riscuri fără beneficiu în MVP. | **propunere tehnică (T-A2)** |
| Cod | 6 cifre, aleator (`crypto.randomInt`); în DB numai HMAC; expirare scurtă; număr maxim de încercări; unic (se consumă); un cod nou îl invalidează pe cel anterior | propunere tehnică (valori în DN-15) |
| Enumerare | `POST /citizen/auth/start` răspunde identic indiferent dacă adresa există | propunere tehnică |
| Sesiune | cookie `__Host-civic_sid`, `principal_type = citizen`; aceleași atribute ca la Admin (G1); expirare prin inactivitate + absolută (valori în DN-15); fără MFA | propunere tehnică |
| Pe medii (A-9: „se proiectează tehnic”) | **dezvoltare / CI:** `EMAIL_MODE = simulated`; codul se citește din coada simulată **numai** prin comanda CLI `dev:show-code` sau prin harness-ul de teste; comanda refuză să ruleze în producție. **Staging:** înainte de 5.5 (fără SMTP), ca la dezvoltare; după 5.5, `allowlist`: pot crea conturi numai adresele din `EMAIL_ALLOWLIST` (G3-c5), celelalte primesc același 202 generic, fără e-mail. **Producție:** `live`, expeditorul pe domeniul Civic (N3-4); **fără domeniul Civic (G7), în producție nu se pot crea conturi.** | propunere tehnică (T-A3) |
| Blocarea (D8, D13–D18) | numai `super_admin` (drept exclusiv, B4 §2.4); temporară / permanentă; efect numai asupra `POST /citizen/reports` (403 cu mesaj generic); autentificarea, lista proprie, ștergerea propriilor sesizări, votul și conținutul public neafectate | **aprobat**. **[SET-A-02] 2.6:** blocarea temporară se poate ridica manual înainte de termen de `super_admin`; blocarea este asociată contului / e-mailului (`email_hash`), nu unei identități reale. **[SET-A-03]** **K-A02-4:** `super_admin` alege la blocare între **15 zile** (expirare automată) și **definitiv** (fără expirare automată). Retenția nu anulează blocarea definitivă; pentru ea se păstrează numai identificatorul minim (`email_hash`), care împiedică recrearea contului și depunerea de sesizări (T-C6, T-C7) |
| Politica de utilizare (D8) | **[SET-A-02] 2.9:** bifă explicită „am citit și accept” la **crearea contului**; se păstrează versiunea și data acceptării. Conținut minim: sesizări reale, informații corecte, limbaj decent, utilizare neabuzivă, responsabilitatea pentru conținut (inclusiv fotografii, 2.10); încălcarea poate duce la blocare. **Textul efectiv** se redactează (sarcină documentară, nu decizie). | **aprobat** |
| Ștergerea contului | **[SET-A-02] 2.7:** cetățeanul își poate șterge contul (`DELETE /citizen/account`); sesizările **rămân**, conform retenției, fără autor în aplicație și fără identitate publică. **[SET-A-03]** Retenția datelor contului: **REC-02 (deschis)** | **aprobat** |

---

# B4 — AUTORIZARE PE SERVER

## 1. Principii

1. **Sursă unică:** matricea `ROLE_PERMISSIONS` se mută în `shared/` și este impusă de server pe fiecare endpoint. Frontend-ul o folosește **numai pentru afișare**.
2. **Fără `role === …`** în handler-e (5D); excepție existentă, regula `actsForCityHall` (6.6), centralizată.
3. Verificările de stare (sondaj închis, structură blocată, ultimul `super_admin`) se fac **în serviciu**, în tranzacție.
4. Refuz = **403** cu cod de eroare; nicio operație parțială.

## 2. Permisiunile

### 2.1 Existente (neschimbate; D8-3)

~~24 de permisiuni. `super_admin` = toate. `primarie_operator` = `dashboard.view`, `announcements.*` (5), `reports.*` (4), `directory.view`, `quickDial.view`, `surveys.view` (13).~~

**[SET-A-02] 2.3:** `reports.moderate` **se elimină** (nu există moderare). Rămân **23** de permisiuni existente. `super_admin` = toate. `primarie_operator` = `dashboard.view`, `announcements.*` (5), `reports.view`, `reports.resolve`, `reports.reply` (3), `directory.view`, `quickDial.view`, `surveys.view` (**12**). Modifică decizia 5D (24 / 13); se consemnează în RULES numai la cererea proprietarului.

### 2.2 Noi (excepția D8-4; **numai `super_admin`**)

**[SET-01] DN-01 aprobat:** **exact trei** permisiuni noi, exclusiv `super_admin`:

| Permisiune | Acoperă (D8-4) |
|---|---|
| `accounts.manage` | administrarea conturilor |
| `notifications.recipient.manage` | configurarea destinatarului tehnic al notificărilor către Primărie (N3-5). Comutatorul A17-4, modul A17-8 și referința acordului A17-1 sunt incluse **conform primei propuneri, de confirmat (P-10)**. |
| `audit.view` | consultarea auditului |

**`primarie_operator` nu primește niciuna.** **[SET-01]** Nu există o a 4-a permisiune (nici pentru anonimizare, DN-12). Teste obligatorii: ~~13 / 27~~ **[SET-A-02]** matricea operatorului are exact **12** permisiuni; `super_admin` are exact **23 + 3 = 26**; `reports.moderate` nu există.

### 2.3 Maparea operațiilor noi pe permisiuni existente (Faza 3 a lăsat-o pentru Faza 4; **DN-03**)

| Operație nouă | Permisiune propusă | Motiv |
|---|---|---|
| Corectarea poziției (D6-5) | ~~`reports.moderate`~~ **[SET-A-02] drept exclusiv `super_admin`** (2.11) | — |
| ~~Răspuns către cetățean (D9-5)~~ | `reports.reply` = **[SET-A-02]** numai note interne | 2.2: nicio notificare pentru răspunsuri; D28: autorul nu vede date nepublice |
| Textul integral al răspunsurilor libere (N4-9) | `surveys.edit` **+** sondaj închis | `surveys.edit` este azi numai a `super_admin`; fără permisiune nouă |
| Marcarea „rezultate posibil afectate”, proof-of-work (N4-10) | `surveys.edit` | acțiuni pe sondaj |
| Statisticile respingerilor la vot | `surveys.view` | date agregate |
| Jurnalul e-mail al unei sesizări | ~~`reports.view`~~ **[SET-A-02] drept exclusiv `super_admin`** (2.11, corectura 3) | operatorul vede numai starea derivată a transmiterii, fără destinatari |
| Jurnalul e-mail global | ~~`audit.view`~~ **[SET-A-02] drept exclusiv `super_admin`** (2.11) | conține adrese ale cetățenilor |
| Reîncercarea manuală a unui e-mail eșuat (A17-9) | ~~`reports.resolve`~~ **[SET-A-02] drept exclusiv `super_admin`** (2.11) | — |


### 2.4 [SET-A-01] Drepturile exclusive ale rolului `super_admin` (A-5, A-8)

Aceste drepturi **nu sunt permisiuni** și **nu intră** în matricea `ROLE_PERMISSIONS`. Matricea rămâne ~~24 + 3~~ **[SET-A-02] 23 + 3 = 26** (DN-01; `reports.moderate` eliminat, 2.3). `primarie_operator` nu le primește prin nicio permisiune `reports.*`.

| Drept exclusiv | Decizie | Endpoint |
|---|---|---|
| ștergerea definitivă a oricărei sesizări, necondiționat | D10–D12, A-1, A-5 | `DELETE /admin/reports/:id` |
| blocarea unui utilizator de la depunerea sesizărilor (temporar / permanent; **[SET-A-03]** **15 zile / definitiv**) | D8, D13–D14, A-5, **K-A02-4** | `POST /admin/citizens/:id/blocks` |
| vizualizarea e-mailului cetățeanului în Admin | D29, A-8 | `GET /admin/reports/:id` (câmpul e-mail), `GET /admin/citizens` |
| **[SET-A-02]** corectarea poziției unei sesizări | 2.11 | `PATCH /admin/reports/:id/location` |
| **[SET-A-02]** reîncercarea unui e-mail eșuat | 2.11 | `POST /admin/reports/:id/emails/:emailId/retry` |
| **[SET-A-02]** accesul la jurnalul e-mailurilor (per sesizare și global) | 2.11 | `GET /admin/reports/:id` (secțiunea jurnal), `GET /admin/email-log` |
| **[SET-A-02]** ridicarea unei blocări | 2.6 | `POST /admin/citizens/:id/blocks/:blockId/lift` |

**Implementare (propunere tehnică, T-A6):** o listă unică `SUPER_ADMIN_EXCLUSIVE` în `shared/` și o singură funcție de verificare pe server (`isSuperAdmin(session)`), analogă regulii `actsForCityHall` (6.6), centralizată. Fără verificări `role === …` împrăștiate în handler-e (5D). Frontend-ul folosește lista numai pentru afișare.

## 3. Matricea operațiilor (rezumat; detaliu per endpoint în B2)

| Domeniu | Operație | Public | `primarie_operator` | `super_admin` | Condiții / reguli |
|---|---|---|---|---|---|
| Sesizări | depunere | ~~✅~~ **[SET-A-01]** ✅ numai cu **cont de cetățean confirmat și neblocat** (A-9, D15) | — | — | ~~operație publică (6.5)~~; anti-abuz (B7) |
| | **[SET-A-01]** lista proprie, ștergerea propriei sesizări | autorul (contul său) | — | — | D19–D22, D27, A-6 |
| | listă / detaliu (fără contact) | ❌ (6.5 P3) | ✅ `reports.view` | ✅ | — |
| | datele de contact (**[SET-01]** numai e-mail, C-1) | ❌ | ~~✅~~ **[SET-A-01] ❌** (A-8) | ✅ **drept exclusiv** (§2.4) | ~~6.6: vizibile numai în Admin, ambelor roluri~~ **[SET-A-01]** A-8 |
| | ~~moderare~~ | — | — | — | **[SET-A-02] eliminat (2.3)**; permisiunea `reports.moderate` nu mai există |
| | **[SET-01]** stadiu `new` → `in_analysis` | ❌ | ~~nedecis (P-1)~~ **[SET-A-02]** ❌ | ~~nedecis (P-1)~~ **[SET-A-02]** ❌ | **2.1:** automat, de sistem, la trimiterea efectivă a e-mailului; nimeni nu îl setează manual |
| | **[SET-01]** stadiu `in_analysis` → `resolved` | ❌ | ✅ `reports.resolve` + `actsForCityHall` + `primaria_mode = platform` (**[SET-A-02]** confirmat în A-02 §3: „numai subcontul Primăriei”) | ❌ | DN-09: numai prin subcontul Primăriei. Nu este o permisiune nouă; este o regulă de stare, ca preluarea (6.6). |
| | asumare / retragere individuală | ❌ | ❌ (6.6) | ✅ `reports.resolve` | numai propria asumare se retrage. **[SET-01]** nu schimbă starea (C-3); fără audit (DN-02) |
| | preluare instituțională | ❌ | ✅ `reports.resolve` + `actsForCityHall` | ❌ | idempotentă, ireversibilă (6.6). **[SET-01]** nu schimbă starea (C-3) |
| | notă internă (**[SET-A-02]** fără „răspuns către cetățean”) | ❌ | ✅ `reports.reply` | ✅ | fără notificare (2.2) |
| | corectarea poziției | ❌ | ~~✅ `reports.moderate`~~ **[SET-A-02] ❌** | ✅ **drept exclusiv** (2.11) | audit |
| | **[SET-A-02]** reîncercare e-mail / jurnal e-mail | ❌ | ❌ | ✅ **drept exclusiv** (2.11) | — |
| | **ștergere** | ~~❌~~ **[SET-A-01]** numai autorul, pentru propria sesizare | ❌ | ~~❌~~ **[SET-A-01] ✅ drept exclusiv** (§2.4) | ~~**nu există** (6.1)~~ **[SET-A-01]** A-1 (6.1 abrogat) |
| | **[SET-A-01]** blocarea unui cetățean | ❌ | ❌ | ✅ **drept exclusiv** (§2.4) | D8, D13–D18 |
| Comunicate | citire publică | ✅ (publicate, neexpirate) | ✅ | ✅ | 6.5 P5 |
| | creare / editare / publicare / dezactivare | ❌ | ✅ | ✅ | permisiunea stării țintă (6.5) |
| | ștergere fizică / reset | ❌ | ❌ | ❌ | fără ștergere (5B); fără reset în producție (D4) |
| Ghid / Apel rapid | citire publică | ✅ (active) | ✅ | ✅ | — |
| | modificare | ❌ | ❌ (doar vizualizare) | ✅ permisiunile `directory.*` / `quickDial.*` | 6.5: fiecare colecție cere permisiunea ei |
| Sondaje | citire publică, vot | ✅ | ✅ | ✅ | vot public (6.5, N4-2) |
| | rezultate | conform setării (D3) | ✅ agregate (`surveys.view`) | ✅ | texte libere: DN-03 |
| | creare / editare / activare / închidere | ❌ | ❌ | ✅ | permisiunea stării țintă (6.5); structură blocată după vot |
| | ștergere | ❌ | ❌ | ✅ `surveys.create` SAU `surveys.edit` | **numai fără voturi** (D3/D4) |
| | reset demo | ❌ | ❌ | ❌ în producție | numai dezvoltare / staging (D4) |
| Conturi | toate | ❌ | ❌ | ✅ `accounts.manage` | D8 + protecții |
| Setări (destinatar, comutator) | toate | ❌ | ❌ | ✅ `notifications.recipient.manage` | audit |
| Audit | citire | ❌ | ❌ | ✅ `audit.view` | — |
| Tabloul de bord | citire | ❌ | ✅ | ✅ | — |

## 4. Ce rămâne strict intern și ce poate deveni notificare privată

| Informație | Public | Notificare privată către autor (D9) |
|---|---|---|
| Stadiul (**[SET-01]** `in_analysis`, `resolved`; C-2) | ~~❌ (6.6)~~ **[SET-A-01] ✅ public (A-7)** | ✅ dacă există opt-in, **[SET-A-02] numai** la `nouă → în analiză` (după trimiterea efectivă, 2.1) și `în analiză → rezolvată` (2.2) |
| Preluarea instituțională | ❌ | ~~✅~~ **[SET-A-02] ❌** (2.2) |
| Asumarea individuală, responsabilii | ❌ | ❌ (D9-3) |
| Nota internă | ❌ | ❌ (D9-5) |
| ~~Răspunsul către cetățean~~ | ❌ | ~~✅~~ **[SET-A-02] ❌**: tipul nu mai există (2.2 + D28) |
| ~~Nota de moderare, decizia de moderare~~ | — | **[SET-A-02]** nu mai există (2.3) |
| Numele operatorilor | ❌ | ❌ (D9-7) |

## 5. Ce se auditează (propunere)

**[SET-01] DN-02 aprobat:** regula 6.6 rămâne. Asumarea și retragerea asumării individuale **nu** se auditează; auditul nu se folosește pentru a reconstrui un istoric al asumărilor. Lista de mai jos (operații administrative) rămâne **propunere**.

- **Conturi:** creare, dezactivare / reactivare, schimbarea rolului, resetarea parolei, resetarea TOTP, autentificări reușite și eșuate (agregat).
- **[SET-A-01] Cetățeni:** blocarea (propus). Ștergerea sesizărilor (de către autor sau `super_admin`): ~~**B-7 (deschis)**~~ **[SET-A-03]** **B-7 decis: ștergerile definitive NU se auditează.** În plus, rândurile de audit care privesc sesizarea ștearsă se șterg (T-C3).
- **[SET-A-02] Recuperarea TOTP (2.15):** folosirea unui cod de recuperare și resetarea de către alt `super_admin`, ca **acțiuni distincte**; regenerarea codurilor.
- **[SET-A-02] Blocări:** crearea și ridicarea (2.6).
- **Setări:** destinatarul, comutatorul, modul Primăriei, referința acordului.
- **Sesizări:**
  - corectarea poziției;
  - ~~moderarea (propus, pentru trasabilitate);~~ **[SET-A-02]** nu mai există (2.3);
  - schimbarea stadiului (propus);
  - preluarea instituțională (propus);
  - ~~anonimizarea contactului (DN-12)~~ **[SET-01] eliminat:** operația nu există;
  - reîncercarea unui e-mail.
  - **[SET-A-03]** rândurile de mai sus se păstrează numai cât există sesizarea: la ștergerea ei (de către autor, `super_admin` sau prin retenție) se șterg (B-7, REC-01).
- **Sondaje:** creare, activare, închidere (**[SET-01]** inclusiv închiderea automată la `end_at`, actor `system`, E-3), marcaj de integritate, proof-of-work, consultarea textelor libere (acces la date posibil personale).
- **Comunicate:** publicare / dezactivare (propus).
