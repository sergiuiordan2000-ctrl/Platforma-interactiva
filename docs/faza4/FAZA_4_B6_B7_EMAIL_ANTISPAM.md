# FAZA 4 — B6 E-MAIL REAL ȘI JURNAL · B7 PROTECȚII ANTI-SPAM

**Proiect:** Turnu Măgurele Civic · **Data:** 27.09.2026 · **Stare:** proiect, neînghețat
**Bază:** N-3 (RULES §11.2), D9 (§11.9), A-17 (§11.10), N-4 (§11.7), B1, B2, B5
**Revizia 1 (SET-01, 27.09.2026):** modificările sunt marcate **[SET-01]** (vezi `FAZA_4_DECIZII_NOI.md` §0 și §C).
**Revizia 2 (SET-A-01, 27.09.2026):** D8–D31 și A-1…A-9; modificările sunt marcate **[SET-A-01]** (§0.3, §D).
**Revizia 3 (SET-A-02, 27.09.2026):** 2.1, 2.2, 2.11, 2.13, 2.14 + corecturile 3, 6, 12 și E-5; marcaj **[SET-A-02]**.

> Pragurile numerice sunt **propuneri inițiale** (DN-15). N-4 și D9-4 cer fixarea lor în Faza 4 / 5.6; ele rămân configurabile.

---

# B6 — E-MAIL

## 1. Arhitectura (N3-1…N3-3)

```
tranzacția de domeniu (sesizare / stadiu)     [SET-A-02] răspunsurile nu mai generează e-mail (2.2)
    └─ [SET-A-02] registry_notification: flux activ → 'queued'; flux oprit / indisponibil → 'on_hold' (2.13)
    └─ INSERT email_outbox (status=queued, dedupe_key UNIQUE)          ← idempotență
COMMIT
    └─ declanșare neblocantă: processOne(id)                         ← încercare imediată, dacă procesul trăiește
cron outbox:process (la 2 min)                                       ← garanția: nimic nu depinde de memorie (B-8)
    └─ lease: UPDATE … SET status='sending', locked_until=now+2min
              WHERE id=? AND status IN ('queued','failed') AND next_attempt_at<=now AND (locked_until IS NULL OR locked_until<now)
    └─ transport după EMAIL_MODE:
         simulated → status 'simulated' (nicio rețea; niciodată 'sent')
         allowlist → destinatarul este în EMAIL_ALLOWLIST ? SMTP : status 'blocked'
         live      → SMTP
    └─ succes: 'sent' (acceptat de serverul SMTP; ≠ livrat) + provider_message_id
       [SET-A-02] registry_notification 'sent' → în aceeași tranzacție: sesizarea new → in_analysis (2.1)
                  + citizen_status_update către autor (opt-in, 2.2). 'simulated' / 'blocked' / 'failed' NU schimbă starea.
    [SET-A-02] reactivarea fluxului (flow_enabled false → true): toate rândurile 'on_hold' → 'queued' (2.13)
       eșec:   attempts+1; next_attempt_at conform pauzelor; după ultima încercare → 'failed' (vizibil în Admin, A17-9)
```

| Element | Proiect |
|---|---|
| Pauze între încercări (**propunere**) | 1 min, 5 min, 30 min, 2 h, 12 h (5 încercări, ≈ 15 h) |
| Idempotență | `dedupe_key` UNIQUE: ~~`confirm:<report>`~~, `registry:<report>`, ~~`status:<report>:<data UTC>` (grupare)~~, ~~`reply:<response>`~~ **[SET-A-02]** (tipurile `confirm` și `reply` eliminate); `status:<report>:<tranziție>` |
| Lease | `locked_until`: un proces oprit brusc nu blochează mesajul |
| Stări | `queued`, `sending`, `sent`, `failed`, `blocked`, `simulated`, `cancelled` (anulat, de exemplu dezabonare înainte de trimitere) **[SET-A-01]** și la ștergerea sesizării: toate rândurile netrimise ale ei → `cancelled`, corpul șters (D20, D23, D24; T-A4) |
| Reîncercare manuală | Admin, numai pentru `failed` (A17-9) → `queued`, `attempts` repornește |

## 2. Moduri și configurare (N3-3, N3-4)

| Variabilă de mediu | Rol |
|---|---|
| `EMAIL_MODE` | `simulated` (**implicit**) / `allowlist` / `live`. Orice valoare lipsă sau invalidă = `simulated`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | furnizorul ales la 5.5 (N3-2); TLS obligatoriu |
| `MAIL_FROM` | adresa pe **domeniul Civic** (N3-4); verificare la pornire: domeniul adresei = `CIVIC_MAIL_DOMAIN`; niciodată `electrovolt.ro` |
| `EMAIL_ALLOWLIST` | adresele de test permise pe staging |

`live` pornește **numai** dacă toate setările SMTP și `MAIL_FROM` sunt valide. Altfel aplicația înregistrează eroarea și rămâne în `simulated`.
Pe staging: `allowlist` sau `simulated` (G3, condiția 5). **[SET-A-01]** Codurile de cont urmează aceleași moduri: în `simulated` se citesc numai prin CLI / harness (niciodată în producție); în `allowlist`, numai adresele listei pot primi coduri, deci pot crea conturi (B3 §8, T-A3). În producție (`live`), fără domeniul Civic nu se pot trimite coduri, deci nu se pot crea conturi (G7).

**[SET-A-02] Corectura E-5 (fluxul către Primărie pe staging):** în `allowlist`, `registry_notification` se trimite **numai** dacă destinatarul configurat este în `EMAIL_ALLOWLIST` (o căsuță de test controlată de proiect, niciodată adresa reală a Primăriei, G3-c5). Condiția acordului scris (A17-1) se aplică **numai** în `live`. Astfel fluxul complet (`on_hold` → `queued` → `sent` → `in_analysis`) se poate testa pe staging.

## 3. Expeditor și destinatari

| Tip | Destinatar | Condiții |
|---|---|---|
| `registry_notification` | `settings.registry.recipient_email` (configurat de `super_admin`, N3-5, A17-2); **niciodată** adresa din Ghid | **[SET-A-01/02]** cetățeanul a cerut transmiterea (pct. 7) + `registry.flow_enabled` (A17-4); **[SET-A-02]** dacă fluxul este oprit → `on_hold`, reluat automat (2.13); mod `live`: destinatar + acordul scris A17-1; mod `allowlist`: destinatar din listă (E-5). Maximum **3 / cont / 24 h** (2.14). Nu depinde de subcontul Primăriei (S1-6). |
| ~~`citizen_confirmation`~~ | — | **[SET-A-02] eliminat (2.2; K-A02-1)** |
| **[SET-A-01]** `citizen_login_code` | e-mailul introdus la `/citizen/auth/start` | D31 / A-9: codul de confirmare / autentificare; **prioritar** în coadă; fără `dedupe_key` pe zi (fiecare cerere, un cod), limitat de B7 |
| `citizen_status_update` (**[SET-A-02]** ~~`citizen_reply`~~ eliminat) | e-mailul contului | `notify_opt_in` + neabonat (D9-2); **numai** la `new → in_analysis` și `in_analysis → resolved` (2.2) |

Fără `Reply-To` către cetățean (A17-6). Antetul `List-Unsubscribe` (+ `List-Unsubscribe-Post`) este prezent la notificările D9.

## 4. Conținut (șabloane fixe, text simplu UTF-8)

| Tip | Conține | Nu conține |
|---|---|---|
| Către Primărie (A17-6) | `TM-XXX`, categoria, **descrierea completă**, textul locației, **coordonatele exacte** + link OSM, data; **[SET-01]** dintre datele de contact **numai adresa de e-mail** a cetățeanului (S1-4, C-1; P-7), dacă există; fotografiile atașate (N3-7); mențiunea obligatorie despre platforma independentă și faptul că `TM-XXX` nu este număr oficial | note interne, numele operatorilor, **[SET-01]** nume sau telefon (nu se mai colectează) |
| ~~Confirmare către cetățean~~ | **[SET-A-02] eliminat (2.2; K-A02-1)** | — |
| **[SET-A-01]** Cod de autentificare | codul, termenul de valabilitate, text fix („dacă nu ați cerut, ignorați mesajul”) | orice alt conținut; linkuri externe |
| Notificare de stadiu (D9) | `TM-XXX`, categoria, noul stadiu (text fix: **[SET-01]** „în analiză” sau „rezolvată”, C-2), link de dezabonare | descrierea, numele operatorilor, note interne (D9-7) |
| ~~Răspuns către cetățean (D9-5)~~ | **[SET-A-02] eliminat (2.2)** | — |

Antetele (`Subject`) sunt construite **numai** din `TM-XXX` și din categorie. Conținutul introdus de utilizatori nu ajunge niciodată în antete.

## 5. Grupare și plafoane (D9-4) (**propunere**) · **[SET-A-02]** gruparea nu mai este necesară (2.2: numai două evenimente)

- ~~Gruparea D9-4 la 10 minute~~ **[SET-A-02]** există numai două evenimente notificabile per sesizare (2.2), deci gruparea nu mai este necesară. Plafonul per sesizare rămâne ca protecție tehnică.
- Plafon: **3 mesaje / sesizare / zi** (toate tipurile către cetățean); peste plafon → `cancelled`, cu motiv.
- Plafon anti-abuz: **3 confirmări / adresă de e-mail / zi** (B7). **[SET-A-02]** Se aplică codurilor de cont (`citizen_login_code`).

## 6. Jurnal și retenție

| Element | Regulă |
|---|---|
| Jurnalul | tabelul `email_outbox` însuși (starea, încercările, eroarea, datele) |
| Corpul | **șters după 45 de zile** (N3-8), prin `purge:email-bodies` |
| Metadatele | ~~conform DN-11~~ **[SET-A-02] 45 de zile** (2.5) |
| Acces | ~~per sesizare: `reports.view`; global: `audit.view`~~ **[SET-A-02] drept exclusiv `super_admin`** (2.11), per sesizare și global. `primarie_operator` vede numai starea derivată a transmiterii, fără destinatari (corectura 3). Reîncercarea: exclusiv `super_admin`. |
| Indicator de eșec | contor pe tabloul de bord și pe sesizare (A17-9) |

## 7. Stadiul pe faze (D9-1)

5.4: coada + șabloanele + modul `simulated` (**[SET-A-01]** inclusiv codurile de cont, necesare pentru depunere; T-A10) · 5.5: SMTP, `allowlist` pe staging, `live` numai în producție (după A17-1, domeniul Civic, furnizor, aprobare).

---

# B7 — PROTECȚII ANTI-SPAM ȘI ANTI-ABUZ

## 1. Mecanisme comune

| Mecanism | Proiect |
|---|---|
| **IP real** | `trustProxy` configurat exact pentru proxy-ul din față (LiteSpeed / Passenger pe staging; reverse proxy în producție). Altfel `X-Forwarded-For` poate fi falsificat (T-SEC-9). |
| **Hash IP** | HMAC-SHA256 cu cheia zilei (derivată din `IP_HASH_SECRET` + data UTC); IP-ul în clar nu se stochează (N4-4) |
| **Rate limiting** | contoare în fereastră fixă în tabelul `rate_limits` (DB, nu memorie: B-8); răspuns 429 + `Retry-After`; **fără blocări permanente** (N4-4) |
| **Capcană** | câmpul ascuns `hp`: dacă este completat → respingere cu 422 generic, fără a indica motivul + contor în `rejected_attempts` |
| **Timp minim** | `formStartedAt` semnat de server la afișare (HMAC, anti-falsificare); sub prag → 422 generic |
| **Proof-of-work** | ALTCHA (`altcha-lib`, MIT, JavaScript pur): provocare semnată HMAC, cu expirare; soluția este verificată pe server; provocările folosite sunt reținute în `used_pow_challenges` până la expirare (anti-reluare); **activabil** per sondaj (N4-5) și, opțional, pentru sesizări (DN-22) |
| **Idempotență** | sesizări: `Idempotency-Key`; voturi: unicitatea jetonului; e-mail: `dedupe_key` |
| **Limite de mărime** | corp JSON 64 KB; multipart conform B2; timeout de cerere configurat la nivel de proxy |
| **Jurnal de respingeri** | `rejected_attempts`, agregat pe oră / zonă / țintă / motiv / hash IP; **30 de zile** (N4-8) |

## 2. Pe zone (**praguri propuse**, configurabile)

| Zonă | Protecții | Praguri inițiale propuse |
|---|---|---|
| **Voturi** (N-4) | cookie de participare (`__Host-civic_pid`, aleator, HttpOnly, 1 an); unicitate în DB prin HMAC per sondaj; capcană; timp minim; proof-of-work activabil; rate limit pe IP | timp minim 3 s; 50 de voturi / oră / IP / sondaj (permisiv pentru CGNAT); 300 / oră / IP global |
| **Sesizări** | capcană; timp minim; `Idempotency-Key`; rate limit pe IP; plafonul de confirmări per adresă; limite de fișiere; moderarea înainte de publicare | timp minim 8 s; 5 / oră și 20 / zi per IP; 3 confirmări / zi / adresă de e-mail **[SET-A-01]** + cont confirmat (A-9); + blocare de către `super_admin` (D8, D13); + limite **per cont** (propunere: 5 / zi); fără moderare prealabilă (A-2); **[SET-A-02] maximum 3 transmiteri către Primărie / cont / 24 h (2.14)**, verificat pe server; a 4-a cerere → 429 |
| **Login** | per cont (blocare) + per IP (B3 §4) | 5 eșecuri → 15 min; 20 / 15 min / IP |
| **[SET-A-01] Coduri de cont** (`/citizen/auth/*`) | răspuns generic (fără enumerare); coduri cu expirare scurtă și încercări limitate; limite pe IP și pe adresă; plafonul „3 e-mailuri / zi / adresă” se aplică și codurilor (T-A7) | propuneri în DN-15: cod valabil 15 min, 5 încercări, 5 cereri / oră / adresă, 20 / oră / IP |
| **Dezabonare** | jeton aleator de 256 de biți; 404 uniform | 30 / oră / IP |
| **API general** | limită globală per IP pentru endpoint-urile publice | 600 / 10 min / IP |

## 3. Ce este garantat, ce reduce abuzul, ce nu poate fi garantat

| Categorie | Conținut |
|---|---|
| **Garantat** (în DB / pe server) | un vot per jeton per sondaj; votul numai în perioada deschisă; numerotarea `TM-XXX` fără duplicate; fără sesizare dublă la retrimiterea aceleiași cereri; aceeași notificare trimisă o singură dată; respectarea limitelor configurate pentru o sursă IP dată; **[SET-A-01]** un e-mail = un cont (D30); depunere numai din cont confirmat și neblocat (A-9, D15) |
| **Reduce abuzul** | capcana, timpul minim, proof-of-work, limitele pe IP, plafoanele de e-mail, ~~moderarea~~ **[SET-A-01]** contul confirmat, blocarea de către `super_admin`, ștergerea de către `super_admin` (A-2: moderarea prealabilă nu mai există) |
| **Nu poate fi garantat** | „o persoană = un vot” (N4-1: alt browser sau dispozitiv = alt jeton); oprirea unui atacator distribuit pe multe IP-uri; oprirea completă a spamului în sesizări (~~moderarea rămâne filtrul final…~~ **[SET-A-02]** nu există moderare, 2.3; limita de 3 / 24 h către Primărie, 2.14; **[SET-01]** expunerea se limitează la sesizările cu transmitere cerută, pct. 7) |
| **[SET-A-01] Riscuri noi** | publicarea imediată (D9) scoate filtrul dinaintea hărții: conținutul abuziv sau fotografiile cu date ale unor terți apar public până la ștergerea de către `super_admin` (**B-12**). Un utilizator blocat își poate crea alt cont cu alt e-mail (D30, **B-14**). **[SET-A-02]** Riscuri asumate prin decizie: fără moderare (2.3), fotografii publice fără verificare (2.10), blocarea legată de e-mail, nu de identitate (2.6). Atenuare: politica acceptată (2.9), blocarea, ștergerea de către `super_admin`, limita de 3 / 24 h către Primărie (2.14). |

## 4. Legături

- Comunicarea publică „consultare orientativă” (N4-1): text în interfață (5.6 / 7B).
- Datele anti-abuz nu conțin IP-uri în clar și nu se leagă de voturi (N4-7).
- Marcajul „rezultate posibil afectate” se folosește la abuz dovedit (N4-10).
