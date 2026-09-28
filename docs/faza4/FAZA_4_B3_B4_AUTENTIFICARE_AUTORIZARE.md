# FAZA 4 — B3 AUTENTIFICARE ȘI SESIUNI · B4 AUTORIZARE PE SERVER

**Proiect:** Turnu Măgurele Civic · **Data:** 27.09.2026 · **Stare:** proiect, neînghețat
**Bază:** D8 (RULES §11.5), G1 (N-2), RULES §6 (regulile 5D, 6.1–6.6), `permissionService.ts`, `authService.ts` (**parolele actuale nu se reproduc**); deciziile din `FAZA_4_REGISTRU_DECIZII.md`

> **Revizia 7, versiune curată (28.09.2026).** Conține numai regulile valabile. Istoricul reviziilor 1–6 (text tăiat, marcaje de set) este în `istoric/revizia_6_adnotata/`; sursa fiecărei decizii este în `FAZA_4_REGISTRU_DECIZII.md`. Valorile marcate „propunere” sau „propunere tehnică” se confirmă la auditul final.

> Valorile numerice de mai jos (durate, praguri, parametri) sunt **PROPUNERI** marcate ca atare. Ele se confirmă la aprobarea checkpoint-ului Fazei 4 (DN-15).

---

# B3 — AUTENTIFICARE ȘI SESIUNI

## 1. Conturile

- **A-4 / D29:** două tipuri de cont: **Admin** (acest capitol, §1–§7) și **cetățean** (§8, necesar **numai** pentru depunerea sesizărilor). Votul rămâne fără cont (N4-2, D17).
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
| Obligativitate | obligatoriu pe staging și în producție, de la 5.2 (propunerea DN-17, tehnică; D8-8 cere „înainte de date reale”) |
| Pierderea telefonului | **2.15, ambele mecanisme, proceduri distincte și auditate:** (A) **coduri de recuperare** generate la configurarea TOTP (de exemplu 10), afișate o singură dată, stocate numai ca HMAC (`admin_recovery_codes`), fiecare de unică folosință; (B) **resetarea TOTP de către alt `super_admin`** (`accounts.manage`), care revocă sesiunile și codurile contului. Recomandarea „minimum 2 `super_admin` activi” rămâne. Procedura CLI de urgență rămâne numai pentru pierderea tuturor accesurilor (propunere tehnică T-B7). |
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

## 8. Contul cetățeanului (D29–D31, D8, D13–D18, A-4, A-9)

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
| Blocarea (D8, D13–D18) | numai `super_admin` (drept exclusiv, B4 §2.4); temporară / permanentă; efect numai asupra `POST /citizen/reports` (403 cu mesaj generic); autentificarea, lista proprie, ștergerea propriilor sesizări, votul și conținutul public neafectate | **aprobat**. **K-A02-4:** `super_admin` alege la blocare între **15 zile** (expirare automată) și **definitiv** (fără expirare automată). **2.6, A06-4:** `super_admin` poate ridica manual orice blocare, cu audit. Blocarea este asociată contului / e-mailului (`email_hash`), nu unei identități reale. Pentru blocarea definitivă se păstrează numai identificatorul minim (`email_hash`), care împiedică recrearea contului și depunerea de sesizări (T-C6, T-C7); la o încercare de recreare, titularul primește pe e-mail „Această adresă nu mai poate fi folosită pentru un cont nou.” (A06-6) |
| Politica de utilizare (D8) | **2.9:** bifă explicită „am citit și accept” la **crearea contului**; se păstrează versiunea și data acceptării. Conținut minim: sesizări reale, informații corecte, limbaj decent, utilizare neabuzivă, responsabilitatea pentru conținut (inclusiv fotografii, 2.10); încălcarea poate duce la blocare. **Textul efectiv** se redactează (sarcină documentară, nu decizie). | **aprobat** |
| Ștergerea contului | **2.7:** cetățeanul își poate șterge contul (`DELETE /citizen/account`); sesizările **rămân**, conform retenției, fără autor în aplicație și fără identitate publică. Contul **nu** se șterge automat; există până când cetățeanul îl șterge (A04-2) | **aprobat** |

---

# B4 — AUTORIZARE PE SERVER

## 1. Principii

1. **Sursă unică:** matricea `ROLE_PERMISSIONS` se mută în `shared/` și este impusă de server pe fiecare endpoint. Frontend-ul o folosește **numai pentru afișare**.
2. **Fără `role === …`** în handler-e (5D); excepție existentă, regula `actsForCityHall` (6.6), centralizată.
3. Verificările de stare (sondaj închis, structură blocată, ultimul `super_admin`) se fac **în serviciu**, în tranzacție.
4. Refuz = **403** cu cod de eroare; nicio operație parțială.

## 2. Permisiunile

### 2.1 Existente (neschimbate; D8-3)

**2.3:** `reports.moderate` **se elimină** (nu există moderare). Rămân **23** de permisiuni existente. `super_admin` = toate. `primarie_operator` = `dashboard.view`, `announcements.*` (5), `reports.view`, `reports.resolve`, `reports.reply` (3), `directory.view`, `quickDial.view`, `surveys.view` (**12**). Modifică 5D (24 / 13); se consemnează în RULES la P-13.

### 2.2 Noi (excepția D8-4; **numai `super_admin`**)

**DN-01: exact trei** permisiuni noi, exclusiv `super_admin`:

| Permisiune | Acoperă (D8-4) |
|---|---|
| `accounts.manage` | administrarea conturilor |
| `notifications.recipient.manage` | configurarea destinatarului tehnic al notificărilor către Primărie (N3-5). Comutatorul A17-4, modul A17-8 și referința acordului A17-1 sunt incluse (propunere tehnică P-10). |
| `audit.view` | consultarea auditului |

**`primarie_operator` nu primește niciuna.** Nu există o a 4-a permisiune (nici pentru anonimizare, DN-12). Teste obligatorii: matricea operatorului are exact **12** permisiuni; `super_admin` are exact **23 + 3 = 26**; `reports.moderate` nu există.

### 2.3 Maparea operațiilor noi pe permisiuni existente (DN-03)

| Operație nouă | Permisiune propusă | Motiv |
|---|---|---|
| Corectarea poziției (D6-5) | **drept exclusiv `super_admin`** (2.11) | — |
| Răspunsurile pe o sesizare | `reports.reply` = numai note interne (A06-3) | fără notificare (2.2); autorul nu vede date nepublice (D28) |
| Textul integral al răspunsurilor libere (N4-9) | `surveys.edit` **+** sondaj închis | `surveys.edit` este azi numai a `super_admin`; fără permisiune nouă |
| Marcarea „rezultate posibil afectate”, proof-of-work (N4-10) | `surveys.edit` | acțiuni pe sondaj |
| Statisticile respingerilor la vot | `surveys.view` | date agregate |
| Jurnalul e-mail al unei sesizări | **drept exclusiv `super_admin`** (2.11, corectura 3) | operatorul vede numai starea derivată a transmiterii, fără destinatari |
| Jurnalul e-mail global | **drept exclusiv `super_admin`** (2.11) | conține adrese ale cetățenilor |
| Reîncercarea manuală a unui e-mail eșuat (A17-9) | **drept exclusiv `super_admin`** (2.11) | — |

### 2.4 Drepturile exclusive ale rolului `super_admin` (A-5, A-8)

Aceste drepturi **nu sunt permisiuni** și **nu intră** în matricea `ROLE_PERMISSIONS`. Matricea rămâne **23 + 3 = 26** (DN-01; `reports.moderate` eliminat, 2.3). `primarie_operator` nu le primește prin nicio permisiune `reports.*`.

| Drept exclusiv | Decizie | Endpoint |
|---|---|---|
| ștergerea definitivă a oricărei sesizări, necondiționat | D10–D12, A-1, A-5 | `DELETE /admin/reports/:id` |
| blocarea unui utilizator de la depunerea sesizărilor (temporar / permanent; **15 zile / definitiv**) | D8, D13–D14, A-5, **K-A02-4** | `POST /admin/citizens/:id/blocks` |
| vizualizarea e-mailului cetățeanului în Admin | D29, A-8 | `GET /admin/reports/:id` (câmpul e-mail), `GET /admin/citizens` |
| corectarea poziției unei sesizări | 2.11 | `PATCH /admin/reports/:id/location` |
| reîncercarea unui e-mail eșuat | 2.11 | `POST /admin/reports/:id/emails/:emailId/retry` |
| accesul la jurnalul e-mailurilor (per sesizare și global) | 2.11 | `GET /admin/reports/:id` (secțiunea jurnal), `GET /admin/email-log` |
| ridicarea unei blocări | 2.6 | `POST /admin/citizens/:id/blocks/:blockId/lift` |

**Implementare (propunere tehnică, T-A6):** o listă unică `SUPER_ADMIN_EXCLUSIVE` în `shared/` și o singură funcție de verificare pe server (`isSuperAdmin(session)`), analogă regulii `actsForCityHall` (6.6), centralizată. Fără verificări `role === …` împrăștiate în handler-e (5D). Frontend-ul folosește lista numai pentru afișare.

## 3. Matricea operațiilor (rezumat; detaliu per endpoint în B2)

| Domeniu | Operație | Public | `primarie_operator` | `super_admin` | Condiții / reguli |
|---|---|---|---|---|---|
| Sesizări | depunere | ✅ numai cu **cont de cetățean confirmat și neblocat** (A-9, D15) | — | — | anti-abuz (B7) |
| | lista proprie, ștergerea propriei sesizări | autorul (contul său) | — | — | D19–D22, D27, A-6 |
| | listă / detaliu (fără contact) | ❌ (6.5 P3) | ✅ `reports.view` | ✅ | — |
| | datele de contact (numai e-mail, C-1) | ❌ | **❌** (A-8) | ✅ **drept exclusiv** (§2.4) | A-8 |
| | stadiu `new` → `in_analysis` | ❌ | ❌ | ❌ | **2.1:** automat, de sistem, la trimiterea efectivă a e-mailului; nimeni nu îl setează manual |
| | stadiu `in_analysis` → `resolved` | ❌ | ✅ `reports.resolve` + `actsForCityHall` + `primaria_mode = platform` („numai subcontul Primăriei”, SET-A-02 §3) | ❌ | DN-09: numai prin subcontul Primăriei. Nu este o permisiune nouă; este o regulă de stare, ca preluarea (6.6). |
| | asumare / retragere individuală | ❌ | ❌ (6.6) | ✅ `reports.resolve` | numai propria asumare se retrage; nu schimbă starea (C-3); fără audit (DN-02) |
| | preluare instituțională | ❌ | ✅ `reports.resolve` + `actsForCityHall` | ❌ | idempotentă, ireversibilă (6.6); nu schimbă starea (C-3) |
| | notă internă (singurul tip de răspuns, A06-3) | ❌ | ✅ `reports.reply` | ✅ | fără notificare (2.2) |
| | corectarea poziției | ❌ | **❌** | ✅ **drept exclusiv** (2.11) | audit |
| | reîncercare e-mail / jurnal e-mail | ❌ | ❌ | ✅ **drept exclusiv** (2.11) | — |
| | **ștergere** | numai autorul, pentru propria sesizare | ❌ | **✅ drept exclusiv** (§2.4) | A-1 |
| | blocarea / ridicarea blocării unui cetățean | ❌ | ❌ | ✅ **drept exclusiv** (§2.4) | D8, D13–D18, K-A02-4, A06-4 |
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
| Stadiul (`in_analysis`, `resolved`; C-2) | **✅ public (A-7)** | ✅ dacă există opt-in, **numai** la `nouă → în analiză` (după trimiterea efectivă, 2.1) și `în analiză → rezolvată` (2.2) |
| Preluarea instituțională | ❌ | **❌** (2.2) |
| Asumarea individuală, responsabilii | ❌ | ❌ (D9-3) |
| Nota internă | ❌ | ❌ (D9-5) |
| Numele operatorilor | ❌ | ❌ (D9-7) |

## 5. Ce se auditează (propunere)

**DN-02:** regula 6.6 rămâne. Asumarea și retragerea asumării individuale **nu** se auditează; auditul nu se folosește pentru a reconstrui un istoric al asumărilor. Lista de mai jos (operații administrative) rămâne **propunere**.

- **Conturi:** creare, dezactivare / reactivare, schimbarea rolului, resetarea parolei, resetarea TOTP, autentificări reușite și eșuate (agregat).
- **Ștergerea sesizărilor** (de către autor, `super_admin` sau prin retenție): **nu se auditează** (B-7); rândurile de audit care privesc sesizarea ștearsă se șterg (T-C3).
- **Retenție:** auditul administrativ (operațiile care nu privesc o sesizare) se păstrează **6 luni**, apoi se șterge automat (A04-4).
- **Recuperarea TOTP (2.15):** folosirea unui cod de recuperare și resetarea de către alt `super_admin`, ca **acțiuni distincte**; regenerarea codurilor.
- **Blocări:** crearea, ridicarea (2.6, A06-4) și **expirarea** automată a unei blocări temporare (actor `system`), ca informația despre blocare să rămână în auditul administrativ 6 luni după expirare sau ridicare (A05-3, T-E1).
- **Setări:** destinatarul, comutatorul, modul Primăriei, referința acordului.
- **Sesizări:**
  - corectarea poziției;
  - schimbarea stadiului (propus);
  - preluarea instituțională (propus);
  - reîncercarea unui e-mail;
  - rândurile de mai sus se păstrează numai cât există sesizarea: la ștergerea ei (de către autor, `super_admin` sau prin retenție) se șterg (B-7, REC-01).
- **Sondaje:** creare, activare, închidere (inclusiv închiderea automată la `end_at`, actor `system`, E-3), marcaj de integritate, proof-of-work, consultarea textelor libere (acces la date posibil personale).
- **Comunicate:** publicare / dezactivare (propus).
