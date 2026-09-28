# FAZA 4 — B1: PERSISTENȚĂ (MODELUL DE DATE) ȘI MIGRAREA DIN `localStorage`

**Proiect:** Turnu Măgurele Civic · **Data:** 27.09.2026 · **Stare:** proiect, **NEÎNGHEȚAT**; se îngheață numai la aprobarea checkpoint-ului Fazei 4.
**Bază:** RULES §6, §11 (deciziile Fazei 3); tipurile din `src/types/*`; serviciile din `src/services/*` (la `cb9f47e`).
**Revizia 1 (SET-01, 27.09.2026):** aplică DN-01, DN-02, DN-09, DN-12, DN-21, E-3, pct. 7 și clarificările C-1…C-4 (`FAZA_4_DECIZII_NOI.md` §0). Modificările sunt marcate **[SET-01]**; punctele deschise P-x sunt în `FAZA_4_DECIZII_NOI.md` §C.
**Revizia 2 (SET-A-01, 27.09.2026):** aplică D8–D31 și A-1…A-9 (`FAZA_4_DECIZII_NOI.md` §0.3). Modificările sunt marcate **[SET-A-01]**; problemele deschise B-x sunt în §D.
**Revizia 3 (SET-A-02, 27.09.2026):** aplică `TMC_FAZA_4_INSTRUCTIUNI_CLAUDE_SET_A_02.md` (2.1–2.15) și corecturile obligatorii 1–13 (`FAZA_4_DECIZII_NOI.md` §0.4). Modificările sunt marcate **[SET-A-02]**. Numărul final de tabele: **30** (§7).
**Revizia 4 (SET-A-03, 28.09.2026):** aplică `istoric/Turnu_Magurele_Civic_INSTRUCTIUNI_SET_A03.md` (K-A02-3, REC-01, B-7, K-A02-4, DN-19; DN-04 fără modificări). Modificările sunt marcate **[SET-A-03]**; consecințele tehnice T-C1…T-C9 sunt în `FAZA_4_DECIZII_NOI.md` §0.5. Numărul de tabele rămâne **30** (fără tabele noi; o coloană nouă: `email_outbox.retention_anchor_at`).
**Revizia 5 (SET-A-04, 28.09.2026):** aplică `istoric/Turnu_Magurele_Civic_SET_DECIZII_INTEGRARE.md` (retenția de 45 de zile fără excepția de ≈ 90 de zile; contul cetățeanului fără ștergere automată; auditul administrativ 6 luni; DN-04, DN-05, DN-07, DN-19). Modificările sunt marcate **[SET-A-04]**; rezumatul în `FAZA_4_DECIZII_NOI.md` §0.6.
**Revizia 6 (SET-A-05, 28.09.2026):** aplică `istoric/Turnu_Magurele_Civic_SET-A-05_FINAL_RETENTIE.md` (REC-02 (c), (d), (e) și T-C8). Modificările sunt marcate **[SET-A-05]**; rezumatul în `FAZA_4_DECIZII_NOI.md` §0.7. Numărul de tabele rămâne **30**; coloana `email_outbox.retention_anchor_at` (Revizia 4) este eliminată.

---

## 1. Convenții generale (propuse)

| Element | Convenție |
|---|---|
| Motor | MySQL 8.4 LTS (producție, dezvoltare), 8.0.37 (staging temporar); InnoDB; `utf8mb4` / `utf8mb4_0900_ai_ci` (G2, B-6) |
| Identificatori | **ULID** (`CHAR(26)`, sortabil în timp, generat în aplicație) pentru entitățile de domeniu; `BIGINT AUTO_INCREMENT` pentru jurnale (audit, răspunsuri la sondaje); cheile de configurare sunt text |
| Timp | `DATETIME(3)` în **UTC**; conversia la ora României se face numai la afișare |
| Ștergere | **fără ștergere fizică** acolo unde regulile o interzic (~~sesizări,~~ comunicate, conturi Admin, sondaje cu voturi); în rest, ștergere controlată. **[SET-A-01] A-1:** sesizările **se șterg definitiv** (autorul sau `super_admin`), vezi §3.8. |
| Chei străine | `ON DELETE RESTRICT` implicit; `CASCADE` numai unde este sigur (de exemplu întrebările unui sondaj fără voturi). **[SET-A-01]** `CASCADE` și pentru dependențele unei sesizări (§3.8). |
| Marcaj demo | `is_demo BOOLEAN NOT NULL DEFAULT FALSE` pe entitățile de conținut (D10-3) |
| Compatibilitate | numai elemente comune MySQL 8.0 și 8.4 (B-6); fără funcții spațiale; `CHECK` permis (≥ 8.0.16) |
| Migrații | Drizzle (dialect MySQL), fișiere SQL versionate în `server/migrations/` (5.1) |
| Fișiere binare | **niciodată în DB**: fotografiile stau pe disc, în afara docroot-ului; în DB se păstrează doar metadatele (N-2) |

## 2. Diagrama relațiilor (textuală)

```
admin_users 1─* sessions                    [SET-A-01] citizen_accounts 1─* sessions (principal_type)
[SET-A-01] citizen_accounts 1─* reports (autor) · citizen_accounts 1─* citizen_login_codes · citizen_accounts 1─* citizen_blocks
[SET-A-02] admin_users 1─* admin_recovery_codes (2.15) · citizen_blocks păstrează email_hash (2.6, 2.7)
admin_users 1─* audit_log (actor)          settings (cheie → valoare; modificată de admin_users)
admin_users 1─* report_assignees *─1 reports
report_categories 1─* reports ~~1─1 report_contacts~~   ([SET-A-01] eliminat: e-mailul stă în citizen_accounts)
                         reports 1─* report_photos        (metadate; fișierul pe disc)
                         reports 1─* report_responses     (notă internă; [SET-A-02] fără „răspuns către cetățean”, 2.2)
                         reports 1─* email_outbox         (confirmare, notificări D9, Primărie — N-3 / A-17)
report_counter (1 rând, TM-XXX)
announcements (inclusiv evenimente)
directory_institution (1 rând) · directory_departments 1─* directory_services · directory_links
quickdial_categories 1─* quickdial_contacts
surveys 1─* survey_questions 1─* survey_options
surveys 1─* survey_submissions 1─* survey_answers *─1 survey_questions / survey_options
rate_limits · rejected_attempts · used_pow_challenges       (anti-abuz — B7 / N-4)
```

## 3. Entitățile

### 3.1 Conturi, sesiuni, audit, setări (B3, B4, D8, N3-5, A17-4)

**`admin_users`**

| Coloană | Tip | Reguli |
|---|---|---|
| `id` | CHAR(26) PK | stabil, **nerefolosibil** (6.6, D8-2) |
| `email` | VARCHAR(254) UNIQUE | normalizat (litere mici); numai adrese controlate de proiect sau furnizate de Primărie (D8-6) |
| `display_name` | VARCHAR(100) | afișat în Admin (nu cetățenilor, D9-7) |
| `role` | ENUM(`super_admin`,`primarie_operator`) | 2 roluri fixe (D8-3) |
| `status` | ENUM(`active`,`disabled`) | fără ștergere (D8-2) |
| `password_hash` | VARCHAR(255) | format `scrypt$N$r$p$salt$hash` (B3) |
| `must_change_password` | BOOLEAN | după bootstrap și după resetare (D8-5, D8-7) |
| `failed_login_count`, `locked_until` | INT, DATETIME NULL | blocare temporară (D8) |
| `totp_secret_enc` | VARBINARY(255) NULL | secret TOTP criptat AES-256-GCM (cheie din mediu) (D8-8) |
| `totp_enabled_at`, `totp_last_step` | DATETIME NULL, BIGINT NULL | anti-reluare a codului TOTP |
| **[SET-A-02]** (tabel separat `admin_recovery_codes`) | — | codurile de recuperare TOTP (2.15), vezi mai jos |
| `created_at`, `created_by`, `updated_at`, `last_login_at`, `disabled_at`, `disabled_by` | — | `created_by` / `disabled_by` sunt FK spre `admin_users`, NULL pentru bootstrap |

Constrângere de aplicație (tranzacțională): **cel puțin un `super_admin` activ** în orice moment (D8, protecții).

**[SET-A-02] `admin_recovery_codes`** (2.15-A)

| Coloană | Tip | Reguli |
|---|---|---|
| `id` | CHAR(26) PK | — |
| `user_id` | FK → `admin_users` | — |
| `code_hash` | CHAR(64) | HMAC al codului; codul în clar se afișează **o singură dată**, la configurarea TOTP |
| `used_at` | DATETIME NULL | **o singură folosire** |
| `created_at` | DATETIME | un set nou (de exemplu 10 coduri) invalidează setul anterior |

Folosirea unui cod și resetarea TOTP de către alt `super_admin` (2.15-B) se înregistrează în `audit_log`, ca proceduri distincte.

**`sessions`**

| Coloană | Tip | Reguli |
|---|---|---|
| `id` | CHAR(64) PK | **SHA-256 al jetonului**; jetonul în clar există numai în cookie |
| `user_id` | FK → `admin_users` | index |
| `created_at`, `last_seen_at`, `idle_expires_at`, `absolute_expires_at` | DATETIME | expirare prin inactivitate + absolută (B3) |
| `mfa_state` | ENUM(`pending`,`verified`,`not_required`) | sesiune „pre-MFA” limitată la pașii TOTP |
| `revoked_at`, `revoke_reason` | NULL / VARCHAR(32) | logout, dezactivare, schimbarea rolului, resetarea parolei (D8) |
| `ip_hash`, `user_agent` | CHAR(64), VARCHAR(160) | pentru afișare „sesiuni active”; fără IP în clar |

**`audit_log`**

| Coloană | Tip | Reguli |
|---|---|---|
| `id` | BIGINT AI PK | — |
| `occurred_at` | DATETIME(3) | index |
| `actor_type` | ENUM(`admin`,`system`) | — |
| `actor_user_id` | FK NULL | index (`actor_user_id`, `occurred_at`) |
| `action` | VARCHAR(64) | de exemplu `account.create`, `settings.registry.update`, `report.location.correct`, `survey.integrity.flag` |
| `target_type`, `target_id` | VARCHAR(32), VARCHAR(64) | index (`target_type`, `target_id`) |
| `details` | JSON | valorile înainte / după **minimizate**; **fără** parole, hash-uri, secrete TOTP sau corpuri de e-mail |
| `ip_hash` | CHAR(64) NULL | — |

Ce se auditează: vezi B4 §5. **[SET-01] DN-02 aprobat:** asumarea și retragerea asumării individuale **nu** se scriu în `audit_log`; auditul nu se folosește pentru a reconstrui un istoric al asumărilor (regula 6.6).
Retenția: ~~DN-11~~ ~~**[SET-A-02] 45 de zile** (2.5, §3.9).~~ **[SET-A-03]** rândurile care privesc o sesizare (`target_type = 'report'`) se șterg **odată cu sesizarea**, la ștergerea definitivă sau la expirarea retenției (B-7, REC-01, §3.8, T-C3). Ștergerea definitivă **nu** se auditează (B-7). ~~Retenția rândurilor care nu privesc o sesizare: **REC-02 (deschis)**; până la decizie rămâne propunerea din Revizia 3 (45 de zile), **neconfirmată**.~~ **[SET-A-04]** Rândurile care **nu** privesc o sesizare (auditul administrativ) se păstrează **6 luni** și apoi se șterg automat (decizia 4, SET-A-04).

**`settings`**

| Coloană | Tip | Reguli |
|---|---|---|
| `key` | VARCHAR(64) PK | listă închisă, definită în cod |
| `value` | JSON | validat cu Zod per cheie |
| `updated_at`, `updated_by` | — | orice schimbare → `audit_log` |

Chei inițiale:
- `registry.recipient_email`: destinatarul notificărilor către Primărie (N3-5, A17-2); **nu este expus public**;
- `registry.flow_enabled`: comutatorul fluxului către Primărie (A17-4), implicit `false`;
- `registry.agreement_reference`: referința confirmării scrise a Primăriei (A17-1), text;
- `registry.primaria_mode`: `platform` / `email_only` / `none` (A17-8), implicit `none`. **[SET-01]** Valoarea `platform` este **propunerea tehnică** pentru condiția DN-09 „Primăria participă și are subcont”, care permite starea `resolved` (P-9, de confirmat). Transmiterea prin e-mail **nu depinde** de această valoare (S1-6).

### 3.2 Sesizări (B5, D6, D9, A-17, B8)

**`report_categories`** (configurare; seed în **toate** mediile)

| Coloană | Tip |
|---|---|
| `id` | VARCHAR(32) PK: ID-urile actuale (`iluminat`, `drumuri`, `trotuare`, `apa_canal`, `salubritate`, `spatii_verzi`, `semnalizare`, `altele`) |
| `name`, `description`, `icon_name`, `sort_order`, `is_active` | — |

**`report_counter`**: un singur rând: `id TINYINT PK = 1`, `last_value INT UNSIGNED`. Folosit exclusiv cu `SELECT … FOR UPDATE` în tranzacția de creare (B5 §1).

**`reports`**

| Coloană | Tip | Reguli / sursă |
|---|---|---|
| `id` | CHAR(26) PK | intern; **nu apare public** (6.5 P4) |
| `author_account_id` | **[SET-A-01]** FK → `citizen_accounts`, ~~NOT NULL, `ON DELETE RESTRICT`~~ **[SET-A-02]** NULL, `ON DELETE SET NULL` (2.7: ștergerea contului nu șterge sesizările; după ștergere, sesizarea nu mai are autor în aplicație) | autorul (D29, A-4); **nu apare public** (D9, A-7); cheia pentru lista proprie (D27) și pentru ștergerea de către autor (D19). Pentru seed-urile demo: conturi demo cu adrese controlate (D10-2). |
| `reference_number` | VARCHAR(16) UNIQUE | `TM-001`… (format actual `TM-` + minimum 3 cifre); nerefolosibil. **[SET-A-01] D25–D26:** rămâne rezervat și după ștergere; garanția vine din `report_counter` (monoton), nu din `UNIQUE`, care nu mai vede rândurile șterse. |
| `category_id` | FK → `report_categories` | — |
| `description` | TEXT | 15–1000 de caractere (validarea actuală a formularului) |
| `location_text` | VARCHAR(300) | obligatoriu (D6-2). **[SET-01] DN-21:** public ~~după moderare~~ **[SET-A-01] imediat** (A-3); poate conține strada, numărul, blocul; descrie locul problemei, nu autorul |
| `lat`, `lng` | DECIMAL(9,6) NULL | locul problemei, exact (D6-3); `CHECK ((lat IS NULL) = (lng IS NULL))`; în limitele UAT (D6-4, **[SET-A-02] 2.12:** verificare obligatorie pe server, în afara UAT → 422). **[SET-A-02] 2.4:** NULL dacă poziția nu a putut fi determinată; sesizarea se salvează, dar nu apare pe hartă până la o poziție validă. |
| `location_source` | ENUM(`text`,`pin`,`gps_pin`, **[SET-A-02]** `geocoded`, `admin_corrected`) | D6; **[SET-A-02] 2.4:** punct ales pe hartă sau poziția curentă (`pin` / `gps_pin`); adresă geocodată automat (`geocoded`); corectată de `super_admin` (`admin_corrected`, 2.11); numai text, fără poziție (`text`) |
| `gps_accuracy_m` | DECIMAL(7,1) NULL | numai pentru `gps_pin` neajustat (D6-6) |
| `location_approximate` | **[SET-A-02]** BOOLEAN NOT NULL DEFAULT FALSE | `true` pentru `geocoded` neajustat de utilizator (2.4: pin **aproximativ**); harta îl afișează ca zonă, nu ca punct precis (decizie tehnică) |
| ~~`publication_preference`~~ | — | **[SET-A-02] eliminat (2.8):** fără opțiunea „Public / Public anonim”; închide B-10 și DN-13 |
| ~~`moderation_status`~~, ~~`moderated_at`~~, ~~`moderated_by`~~, ~~`moderation_note`~~ | — | **[SET-A-02] eliminate (2.3):** nu există moderare, nici înainte, nici după publicare; închide B-3 |
| `resolution_status` | **[SET-01]** ENUM(`new`,`in_analysis`,`resolved`) | implicit `new`. **DN-09 + C-2:** numai 3 stări (`closed` eliminat); tranziții permise numai `new` → `in_analysis` → `resolved` (P-4, P-5: propunere tehnică). ~~Mecanismul `new` → `in_analysis`: nedecis (P-1).~~ **[SET-A-02] 2.1:** `new` → `in_analysis` **automat**, numai când e-mailul către Primărie devine `sent` (acceptat de serverul de e-mail); fără transmitere cerută sau înainte de trimiterea efectivă, rămâne `new`. `resolved` numai prin subcontul Primăriei (confirmat în A-02 §3). **Consecință:** o sesizare netransmisă nu poate deveni `resolved` (tranzițiile sunt strict ordonate). |
| `city_hall_taken_over`, `…_at`, `…_by` | BOOLEAN, DATETIME, FK | ireversibil (6.6). **[SET-01] C-3:** preluarea **nu** schimbă `resolution_status` |
| `city_hall_transmission_requested`, `…_at` | **[SET-01]** BOOLEAN NOT NULL DEFAULT FALSE, DATETIME NULL | **pct. 7 / S1-4:** alegerea cetățeanului la depunere. Fără cerere: nicio transmitere, starea rămâne `new`. Cu cerere: Primăria primește numai e-mailul (P-7: acordul A17-5). |
| `location_corrected_at`, `location_corrected_by` | NULL | D6-5 (valorile inițiale în `audit_log`) |
| `notify_opt_in`, `notify_opt_in_at` | BOOLEAN, DATETIME NULL | D9-2 |
| `unsubscribe_token_hash`, `notify_unsubscribed_at` | CHAR(64) NULL, DATETIME NULL | D9-2 (jetonul în clar numai în e-mail) |
| ~~`contact_share_consent`, `contact_share_consent_at`~~ | — | **[SET-01] eliminat:** înlocuit de `city_hall_transmission_requested` (S1-4, C-1; P-7) |
| `idempotency_key` | CHAR(36) UNIQUE NULL | retrimiterea formularului nu creează o a doua sesizare (B7) |
| `is_demo` | BOOLEAN | D10-3 |
| `created_at`, `updated_at` | DATETIME(3) | — |

Indexuri: **[SET-A-01]** (`author_account_id`, `created_at`) (D27), ~~(`moderation_status`, `created_at`)~~ **[SET-A-02]** (`created_at`) pentru retenție, (`resolution_status`, `created_at`), (`category_id`), (`city_hall_taken_over`), (`is_demo`).
Starea transmiterii către Primărie (A17-7) **nu se stochează dublat**: se derivă din `email_outbox` (tipul `registry_notification`), ~~cu starea `oprit` când nu există rând (fluxul dezactivat; DN-10)~~ **[SET-A-02] 2.13:** cu fluxul oprit, rândul există în starea `on_hold` („în așteptare”) și se trimite automat la reactivare (închide DN-10). **[SET-01]** Când `city_hall_transmission_requested = false`, valoarea derivată este „nesolicitat” (propunere tehnică, P-12).

~~**`report_contacts`**~~ **[SET-A-01] ELIMINAT** (A-4, D29): e-mailul este data contului (`citizen_accounts.email`), nu a sesizării. Tabelul de mai jos rămâne numai pentru istoric.

| Coloană | Tip | Reguli |
|---|---|---|
| `report_id` | PK, FK → `reports` | 1:1; rând creat numai dacă cetățeanul a completat e-mailul |
| ~~`name`~~, ~~`phone`~~ | — | **[SET-01] eliminate (C-1):** numele și telefonul nu se mai cer |
| `email` | VARCHAR(254) **[SET-01]** | singura dată de contact (C-1). ~~Obligativitatea: nedecisă (P-6).~~ **[SET-A-01/02]** tabel eliminat; P-6 închis (A-9). |
| ~~`anonymized_at`~~ | — | **[SET-01] eliminat (DN-12):** fără funcție de anonimizare. Tratamentul la expirarea retenției: DN-11 (deschis). |

**`report_assignees`** (starea curentă, 6.6): PK (`report_id`, `user_id`), `assigned_at`. Retragerea șterge rândul (fără istoric, 6.6). **[SET-01] DN-02:** asumarea și retragerea nu scriu în `audit_log`. **C-3:** asumarea nu schimbă `resolution_status`.

**`report_photos`**

| Coloană | Tip | Reguli |
|---|---|---|
| `id` | CHAR(26) PK | apare în URL-ul public al fotografiei principale (nu este ID-ul sesizării) |
| `report_id` | FK **[SET-A-01] `ON DELETE CASCADE`** | UNIQUE (`report_id`, `ordinal`); fișierul de pe disc se șterge după COMMIT (§3.8) |
| `ordinal` | TINYINT 1–4 | maximum 4 (formularul actual) |
| `storage_key` | VARCHAR(200) UNIQUE | nume aleator; **fără numele original** (6.5 P4) |
| `mime` | ENUM(`image/webp`,`image/jpeg`) | verificat prin semnătura fișierului (B5) |
| `size_bytes`, `width`, `height`, `sha256` | — | — |
| `created_at` | — | — |

**`report_responses`**

| Coloană | Tip | Reguli |
|---|---|---|
| `id` | CHAR(26) PK | — |
| `report_id` | FK | index (`report_id`, `created_at`) |
| ~~`kind`~~ | ~~ENUM(`internal_note`,`citizen_reply`)~~ | **[SET-A-02] eliminat:** 2.2 permite notificări numai la cele două schimbări de stare, iar D28 exclude afișarea către autor a datelor nepublice. Un „răspuns către cetățean” nu mai are niciun canal. Toate răspunsurile sunt **note interne** (decizie tehnică derivată; vezi §0.4, consecința K-A02-2). |
| `message` | TEXT | limită propusă: 2000 de caractere |
| `author_user_id` | FK | numele autorului nu apare în e-mail (D9-7) |
| `created_at` | — | fără editare, fără ștergere individuală (5C: istoricul complet se păstrează). **[SET-A-01]** Se șterg odată cu sesizarea (`ON DELETE CASCADE`, D20). |

### 3.3 Conținut (comunicate, Ghid, Apel rapid)

**`announcements`**:
- coloanele actuale: `type` ENUM(`notification`,`announcement`,`news`,`event`), `title`, `summary`, `content` TEXT, `published_at`, `author` (text afișat), `category`, `image_url` NULL (**[SET-A-03]** **DN-19:** numai calea relativă a unei imagini publicate odată cu aplicația; T-C9), `is_urgent`, `expires_at` NULL, `status` ENUM(`published`,`draft`), `event_date` DATE NULL, `event_time` TIME NULL, `event_location`, `event_organizer`;
- în plus: `is_demo`, `created_at` / `created_by`, `updated_at` / `updated_by`;
- **fără ștergere** (5B / 5D);
- indexuri: (`status`, `published_at`), (`type`, `event_date`), (`expires_at`).

**`directory_institution`** (un singur rând):
- câmpurile scalare din `CityHallInfo` (inclusiv `registry_email`, **numai informativ**, D10-6);
- `schedule` și `audience_schedule` ca JSON;
- `is_demo`, `verified_at`, `verified_source` (D10-6), `updated_*`.

**`directory_departments`**, **`directory_services`** (FK → departament, `ON DELETE RESTRICT`; `documents_required` JSON), **`directory_links`** (`category` ENUM cu cele 4 valori actuale):
- câmpurile actuale + `is_active`, `sort_order`, `is_demo`, `verified_at`, `verified_source`;
- ștergerea rămâne permisă (există azi), cu `RESTRICT` dacă există servicii legate.

**`quickdial_categories`**, **`quickdial_contacts`** (FK → categorie):
- câmpurile actuale (`phone`, `formatted_phone`, `availability`, `is_emergency`, `address`…) + `is_demo`, `verified_at`, `verified_source`;
- regula existentă „categoria cu contacte nu se șterge” devine `RESTRICT`.

### 3.4 Sondaje și voturi (D3/D4, N-4)

**`surveys`**

| Coloană | Tip | Reguli |
|---|---|---|
| `id` | CHAR(26) PK | — |
| `title`, `description`, `category` | — | modelul 4A |
| `start_at`, `end_at` | DATETIME | `CHECK (end_at > start_at)` |
| `status` | ENUM(`draft`,`active`,`closed`) | — |
| `results_visibility` | ENUM(`live`,`after_close`) **[SET-A-02]** ~~`admin_only`~~ eliminat (corectura 1: contrazice D3, „arhivă publică, cu rezultatele finale”) | implicit `after_close` (D3) |
| `pow_enabled` | BOOLEAN | N4-5 / N4-10 |
| `integrity_flag`, `integrity_note` | BOOLEAN, VARCHAR(500) | N4-10, vizibile public în arhivă |
| `first_submission_at` | DATETIME NULL | **blocarea structurii** după primul vot (D3/D4) |
| `is_demo`, `created_*`, `updated_*` | — | — |

Starea efectivă „deschis” = `status = 'active'` **și** `start_at ≤ acum < end_at`, calculată pe server.
**[SET-01] E-3 aprobat (S1-3):** la `end_at` sondajul devine `closed` automat, pe server, fără intervenție manuală; voturile noi sunt respinse; rezultatele finale intră în arhiva publică. Mecanism (propunere tehnică, P-11): verificarea `acum ≥ end_at` la fiecare cerere + comanda `surveys:close-expired` (cron), care persistă `status = 'closed'`, cu audit (actor `system`). Trimiterea anterioară la „D34-3” (ID din analiză, neaprobat) se înlocuiește cu S1-3.

**`survey_questions`**: `id`, `survey_id` FK, `ordinal` (UNIQUE per sondaj), `text`, `type` ENUM(`single_choice`,`multiple_choice`,`free_text`), `is_required`, `help_text`.
**`survey_options`**: `id`, `question_id` FK, `ordinal` (UNIQUE per întrebare), `text`.
Modificarea sau ștergerea lor este interzisă dacă `surveys.first_submission_at IS NOT NULL` (verificare în aplicație + test).

**`survey_submissions`**

| Coloană | Tip | Reguli |
|---|---|---|
| `id` | CHAR(26) PK | — |
| `survey_id` | FK **RESTRICT** | un sondaj cu voturi nu se șterge (D3/D4) |
| `participation_fingerprint` | CHAR(64) | HMAC-SHA256(cheie, jeton + ID sondaj) (N4-3, N4-7) |
| `submitted_at`, `is_demo` | — | — |
| — | **UNIQUE (`survey_id`, `participation_fingerprint`)** | **garanția** „un vot per jeton per sondaj” |

Fără IP, fără user-agent, fără legătură cu identitatea (N4-7).

**`survey_answers`**: `id` BIGINT AI, `submission_id` FK, `question_id` FK, `option_id` FK NULL (un rând per opțiune aleasă), `text_value` TEXT NULL (numai pentru `free_text`; limită propusă 2000). Index (`question_id`, `option_id`) pentru agregare. Retenția textelor libere: ~~DN-11~~ **[SET-A-02] 45 de zile după închiderea sondajului** (§3.9).

### 3.5 E-mail (B6, N-3, D9, A-17)

**`email_outbox`**

| Coloană | Tip | Reguli |
|---|---|---|
| `id` | CHAR(26) PK | — |
| `kind` | ENUM(`registry_notification`, ~~`citizen_confirmation`~~, `citizen_status_update`, ~~`citizen_reply`~~, **[SET-A-01]** `citizen_login_code`) **[SET-A-02]** `citizen_confirmation` și `citizen_reply` eliminate (2.2: numai notificări la `nouă → în analiză` și `în analiză → rezolvată`; vezi K-A02-1) | N-3 + D9; **[SET-A-01]** codul de confirmare / autentificare (D31, A-9) |
| `report_id` | FK NULL | index. **[SET-A-01]** ~~`ON DELETE SET NULL` (propunere tehnică), ca ștergerea sesizării să nu fie blocată;~~ **[SET-A-05]** `ON DELETE CASCADE`: jurnalul e-mail al unei sesizări se șterge **odată cu sesizarea** (T-C8, decizia 4); NULL numai pentru e-mailurile fără sesizare (codurile de cont); ~~păstrarea sau ștergerea rândurilor deja trimise: **B-5 / DN-11**~~ **[SET-A-03]** rândurile legate de o sesizare, inclusiv cele deja trimise, se șterg la 45 de zile de la **depunerea** sesizării, prin `retention_anchor_at` (K-A02-3, REC-01, T-C2) **[SET-A-05]** ~~prin `retention_anchor_at`~~: prin ștergerea sesizării (cascadă) |
| `dedupe_key` | VARCHAR(128) UNIQUE | idempotență (N3-1): de exemplu `registry:<report>`, ~~`confirm:<report>`, `reply:<response>`, `status:<report>:<zi>`~~ **[SET-A-02]** `status:<report>:in_analysis`, `status:<report>:resolved`; codurile de cont fără `dedupe_key` |
| `recipient` | VARCHAR(254) | — |
| `subject` | VARCHAR(200) | numai din șabloane (fără conținutul utilizatorului în antete) |
| `body_text` | MEDIUMTEXT NULL | **șters după 45 de zile** (N3-8) → `NULL` + `body_purged_at`. **[SET-A-03]** Pentru un e-mail legat de o sesizare, **rândul întreg** dispare cel târziu la 45 de zile de la depunerea sesizării (REC-01, ~~T-C2~~ **[SET-A-05]** odată cu sesizarea, T-C8) |
| `attachment_photo_ids` | JSON NULL | referințe; fișierele se citesc la trimitere (N3-7) |
| `status` | ENUM(`queued`,`sending`,`sent`,`failed`,`blocked`,`simulated`,`cancelled`, **[SET-A-02]** `on_hold`) | N3-1 / N3-3. **[SET-A-02] 2.13:** `on_hold` = transmitere cerută, cu fluxul către Primărie oprit sau indisponibil; la reactivarea fluxului, toate rândurile `on_hold` trec automat în `queued`. **2.1:** trecerea unui `registry_notification` în `sent` mută sesizarea `new` → `in_analysis`, în aceeași tranzacție. |
| `attempts`, `next_attempt_at`, `locked_until`, `last_error` | — | retry cu pauze crescătoare; `locked_until` = lease pentru procesare |
| `mode_at_send`, `transport` | ENUM | `simulated` / `allowlist` / `live`; `simulated` / `smtp` |
| `provider_message_id` | VARCHAR(200) NULL | — |
| `created_at`, `sent_at`, `body_purged_at` | — | index (`status`, `next_attempt_at`), (`created_at`) |
| ~~**[SET-A-03]** `retention_anchor_at`~~ **[SET-A-05]** **eliminată** (T-C8: rândurile nu mai supraviețuiesc sesizării) | ~~DATETIME NULL~~ | = `reports.created_at` pentru rândurile legate de o sesizare (copiat la creare; rămâne și după `report_id = NULL`); NULL pentru e-mailurile fără sesizare (codurile de cont, N3-8). Index. Propunere tehnică **T-C2**. |

### 3.6 Anti-abuz (B7, N-4)

| Tabel | Conținut | Păstrare |
|---|---|---|
| `rate_limits` | PK (`bucket_key`, `window_start`), `count`, `expires_at`; `bucket_key` conține numai hash-uri (de exemplu `vote:ip:<hash>:<survey>`) | ≤ 48 h (N4-4) |
| `rejected_attempts` | PK (`hour`, `area`, `target_id`, `reason`, `ip_hash`), `count`; `area` ∈ {`vote`,`report`,`login`, **[SET-A-01]** `citizen_code`}; **[SET-A-01]** `reason` + `blocked`; `reason` ∈ {`duplicate`,`rate_limited`,`closed`,`honeypot`,`too_fast`,`pow_invalid`,`invalid`} | **30 de zile** (N4-8) |
| `used_pow_challenges` | PK `challenge_hash`, `expires_at` | până la expirarea provocării (anti-reluare proof-of-work) |

`ip_hash` = HMAC-SHA256(cheia zilei, IP), unde cheia zilei = HMAC(`IP_HASH_SECRET`, data UTC). Rotația este zilnică, prin construcție (N4-4).

### 3.7 [SET-A-01] Conturile cetățenilor (D29–D31, D8, D13–D18, A-4, A-8, A-9)

**`citizen_accounts`**

| Coloană | Tip | Reguli |
|---|---|---|
| `id` | CHAR(26) PK | — |
| `email` | VARCHAR(254) | singura dată a contului (A-9); **vizibilă numai `super_admin`** în Admin (A-8); niciodată publică (D29) |
| `email_normalized` | VARCHAR(254) **UNIQUE** | trim + litere mici (propunere tehnică, T-A8); **un e-mail = un cont** (D30) |
| `status` | ENUM(`pending`,`active`) | `pending` până la confirmarea e-mailului; `active` după confirmare (D31) |
| `confirmed_at`, `created_at`, `last_login_at` | DATETIME | — |
| `is_demo` | BOOLEAN | D10 (conturi demo numai în afara producției) |

Fără nume, telefon, CNP sau adresă (A-9). Fără parolă (autentificare prin cod pe e-mail, B3 §8; propunere tehnică T-A2).

**`citizen_login_codes`** (propunere tehnică, T-A2 / T-A3)

| Coloană | Tip | Reguli |
|---|---|---|
| `id` | CHAR(26) PK | — |
| `account_id` | FK → `citizen_accounts` `ON DELETE CASCADE` | — |
| `code_hash` | CHAR(64) | HMAC al codului; codul în clar există numai în e-mail |
| `purpose` | ENUM(`confirm`,`login`) | prima confirmare activează contul |
| `expires_at`, `attempts`, `consumed_at` | — | expirare scurtă și număr maxim de încercări (valori în DN-15) |

**`citizen_blocks`** (D8, D13–D16, A-5)

| Coloană | Tip | Reguli |
|---|---|---|
| `id` | CHAR(26) PK | — |
| `account_id` | FK → `citizen_accounts` | — |
| `kind` | ENUM(`temporary`,`permanent`) | D14. **[SET-A-03]** **K-A02-4:** `temporary` = **15 zile**, cu expirare automată; `permanent` = **definitivă**, fără expirare automată. Alegerea o face `super_admin` la blocare. |
| `starts_at`, `ends_at` | DATETIME, DATETIME NULL | `ends_at` obligatoriu pentru `temporary`, NULL pentru `permanent` (`CHECK`). **[SET-A-03]** `ends_at = starts_at + 15 zile`, calculat de server; API-ul nu mai primește o durată (T-C5). `starts_at` devine NULL la reducerea blocării definitive la datele minime (T-C6). |
| `created_by` | FK → `admin_users` **[SET-A-03]** NULL | **numai `super_admin`** (D13, A-5). **[SET-A-03]** devine NULL la reducerea blocării definitive la datele minime (T-C6) |
| `note` | VARCHAR(500) NULL | internă. Utilizatorul vede numai că depunerea îi este blocată și, pentru o blocare temporară, termenul (decizie tehnică) |
| `lifted_at`, `lifted_by` | NULL | **[SET-A-02] 2.6:** o blocare temporară poate fi ridicată manual înainte de termen, **numai de `super_admin`**; cu audit |
| `email_hash` | **[SET-A-02]** CHAR(64) | HMAC al e-mailului normalizat (2.6: blocarea este asociată contului / e-mailului). Blocarea rămâne valabilă dacă titularul își șterge contul și îl recreează cu același e-mail (decizie tehnică derivată din 2.6 + 2.7). `account_id` devine NULL la ștergerea contului. **[SET-A-03]** **K-A02-4:** pentru o blocare **definitivă**, `email_hash` este identificatorul minim păstrat: împiedică recrearea contului cu același e-mail și depunerea de sesizări (T-C7); retenția de 45 de zile nu o anulează. O blocare temporară rămâne legată de `email_hash` numai până la expirarea celor 15 zile. |

Efect (D15–D18): o blocare activă respinge **numai** depunerea unei sesizări noi (403). Autentificarea, lista proprie, ștergerea propriilor sesizări, votul și conținutul public rămân neafectate. Sesizările existente nu se ating (D16).

**[SET-A-03]** **Date minime pentru blocarea definitivă (K-A02-4; propunere tehnică T-C6):** la ștergerea contului (2.7) ~~sau la ștergerea datelor contului prin retenție (REC-02)~~ (**[SET-A-04]** contul nu se șterge automat, decizia 2), rândul unei blocări definitive active se reduce la `id`, `kind` și `email_hash`; `account_id`, `note`, `created_by` și `starts_at` devin NULL. Nu se păstrează alte date (K-A02-4: „nu se păstrează mai multe date decât sunt necesare”).

**[SET-A-02] Politica de utilizare (2.9):** `citizen_accounts.policy_version` + `policy_accepted_at` (NOT NULL). Contul nu se creează fără bifarea explicită a acceptării (422 la API).

**[SET-A-02] Ștergerea contului (2.7):** `DELETE` pe `citizen_accounts`. Sesiunile și codurile se șterg (CASCADE); sesizările rămân, cu `author_account_id = NULL`; notificările către cetățean ale acestor sesizări se anulează (nu mai există adresă). Notificările către Primărie aflate în coadă se trimit fără e-mailul cetățeanului, care nu mai există (decizii tehnice derivate). Blocările păstrează `email_hash`. **[SET-A-03]** O blocare definitivă se reduce la datele minime (T-C6); cât timp este activă, contul nu poate fi recreat cu același e-mail (T-C7). O blocare temporară rămâne valabilă până la expirarea celor 15 zile.

**`sessions`** (extins): coloana `principal_type` ENUM(`admin`,`citizen`) + `citizen_account_id` FK NULL. Sesiunile cetățenilor nu au `mfa_state` (propunere tehnică).

### 3.8 [SET-A-01] Ștergerea definitivă a unei sesizări (A-1, D10–D12, D19–D24)

O singură tranzacție (propunere tehnică, T-A4):
1. verificarea dreptului: autorul (`author_account_id`) **sau** rolul `super_admin` (B4 §2.4);
2. ~~`UPDATE email_outbox SET status='cancelled', body_text=NULL` pentru rândurile netrimise ale sesizării (T-A4, B-6; D23: nicio notificare despre ștergere);~~ **[SET-A-05]** `DELETE FROM email_outbox WHERE report_id = ?`: **toate** rândurile jurnalului e-mail al sesizării (netrimise și trimise) se șterg în aceeași tranzacție (T-C8, decizia 4); nimic din coadă nu mai pleacă (D23). Un rând aflat în `sending` în acel moment: lucrătorul verifică existența rândului înainte să-l marcheze trimis (propunere tehnică T-E2);
3. `DELETE FROM reports WHERE id=?`: `report_photos`, `report_responses`, `report_assignees` se șterg prin `CASCADE`;
4. COMMIT, apoi ștergerea fișierelor foto de pe disc (la eșec: reîncercare prin `purge:orphan-files`);
5. `report_counter` **nu** se atinge (D25–D26).
6. **[SET-A-03]** **B-7:** pentru ștergere **nu** se scrie niciun rând în `audit_log`; rândurile existente care privesc sesizarea (`target_type = 'report'`, `target_id` = sesizarea) se șterg în aceeași tranzacție, ca să nu rămână în audit o urmă care să permită reconstituirea ei (propunere tehnică T-C3). Același pas se aplică la ștergerea prin retenție (§3.9).

~~**Deschise:** rândurile `email_outbox` deja trimise (B-5 + DN-11); auditul (B-7); backup-urile (B-5).~~
**[SET-A-02]** Rândurile `email_outbox` deja trimise rămân, cu `report_id = NULL`, până la expirarea retenției de **45 de zile** (2.5). Backup-urile expiră tot la 45 de zile (2.5), deci o sesizare ștearsă dispare din toate copiile în cel mult 45 de zile. ~~**Rămâne deschis:** B-7, auditul ștergerii.~~ **[SET-A-03]** B-7 decis: ștergerea nu se auditează (pasul 6). ~~Rândurile `email_outbox` deja trimise se șterg la 45 de zile de la **depunerea** sesizării (`retention_anchor_at`; K-A02-3, REC-01, T-C2).~~ **[SET-A-05]** Rândurile `email_outbox` ale sesizării, inclusiv cele trimise, se șterg odată cu sesizarea (pasul 2; T-C8). ~~Precizare față de Revizia 3: o copie de siguranță realizată **înainte** de ștergere se păstrează până la rotația ei de 45 de zile; aceasta este limita tehnică prevăzută de REC-01 (T-C4).~~ **[SET-A-04]** Regula de produs rămâne **45 de zile de la depunere**, fără excepție pentru backup-uri. Modul în care copiile de siguranță respectă această regulă este o **problemă tehnică de implementare** (T-D1), nu o prelungire a retenției. ~~Jurnalul e-mail nu este audit: rândurile trimise ale unei sesizări șterse rămân în `email_outbox` până la termenul de retenție (T-C8, **neconfirmat**).~~ **[SET-A-05]** **T-C8 decis:** jurnalul e-mail al sesizării se șterge odată cu sesizarea (pasul 2); nu se păstrează până la termenul de 45 de zile.

### 3.9 [SET-A-02] Retenția (2.5)

**Regula aprobată:** **45 de zile** pentru toate categoriile de date discutate, inclusiv sesizarea, e-mailurile și jurnalele lor, fotografiile, datele contului cetățeanului și backup-urile. Excepție: `TM-XXX` rămâne rezervat definitiv (contorul nu se atinge). **[SET-A-04]** Partea „datele contului cetățeanului” este înlocuită de decizia 2 (SET-A-04): contul nu se șterge automat.

**[SET-A-03]** **Precizări aprobate (K-A02-3, REC-01, K-A02-4):** termenul de 45 de zile curge de la **depunerea sesizării** și se aplică **tuturor datelor legate de sesizare** și asociate ei (sesizarea, fotografiile, e-mailurile și alte date aferente), în măsura în care ștergerea este posibilă legal și tehnic. Blocarea definitivă este tratată **separat** de retenție. ~~Pentru datele care **nu** sunt legate de o sesizare, termenele din tabel rămân **propuneri tehnice neconfirmate** până la **REC-02** (`FAZA_4_DECIZII_NOI.md` §F).~~ **[SET-A-04]** **Decizii SET-A-04:** fără excepția de ≈ 90 de zile (decizia 1); contul cetățeanului **nu** se șterge automat (decizia 2); auditul administrativ fără legătură cu o sesizare: **6 luni** (decizia 4). ~~Rămân nedecise (REC-02, `FAZA_4_DECIZII_NOI.md` §G): jurnalele aplicației și sesiunile expirate, textele libere din sondaje, blocările temporare după expirare.~~ **[SET-A-05]** **Decizii SET-A-05:** jurnalele aplicației, sesiunile expirate și textele libere din sondaje: **6 luni**, apoi ștergere automată; blocarea temporară expirată sau ridicată: informația rămâne în auditul administrativ (6 luni); jurnalul e-mail al unei sesizări: șters odată cu sesizarea.

| Date | Termen | Mecanism (tehnic) |
|---|---|---|
| sesizarea + fotografiile + răspunsurile + responsabilii **[SET-A-03]** + rândurile `audit_log` ale sesizării | 45 de zile ~~de la **momentul de referință K-A02-3 (DE DECIS)**~~ **[SET-A-03]** **de la depunere** (`reports.created_at`; K-A02-3, REC-01), indiferent de stare | `purge:retention` zilnic: aceeași ștergere definitivă ca în §3.8, inclusiv pasul 6 (B-7) |
| `email_outbox` (corp **și** metadate) | ~~45 de zile de la creare~~ **[SET-A-03]** legate de o sesizare: 45 de zile de la depunerea ei ~~(`retention_anchor_at`, REC-01)~~ **[SET-A-05]** = odată cu sesizarea (ștergere definitivă sau retenție; T-C8); fără sesizare (codurile de cont): 45 de zile de la creare (N3-8) | `purge:retention` |
| contul cetățeanului (`citizen_accounts`) | ~~45 de zile; **[SET-A-03]** **momentul de start pentru cont: NEDECIS (REC-02)**. K-A02-3 a fost decis numai pentru sesizare.~~ **[SET-A-04]** **fără ștergere automată** (decizia 2): contul rămâne până când cetățeanul îl șterge (2.7). Codurile de autentificare expiră și se curăță zilnic (neschimbat). | ~~`purge:retention`, după decizie~~ **[SET-A-04]** `purge:retention` **nu** atinge conturile |
| `citizen_blocks` | ~~o blocare temporară: 45 de zile după expirare sau ridicare;~~ ~~**[SET-A-03]** blocarea temporară (15 zile): păstrarea după expirare sau ridicare = **REC-02** (Revizia 3 propunea 45 de zile, neconfirmat);~~ **[SET-A-05]** blocarea temporară (15 zile): după expirare sau ridicare, informația despre blocare se păstrează în **auditul administrativ**, cu retenția acestuia (**6 luni**); rândul `citizen_blocks` se șterge (propunere tehnică T-E1); **o blocare definitivă se păstrează** fără termen, redusă la datele minime (K-A02-4, T-C6) | `purge:retention` |
| backup-uri | 45 de zile (rotație). ~~**[SET-A-03]** O sesizare ștearsă poate rămâne într-o copie realizată anterior până la rotația acesteia (limita tehnică din REC-01; T-C4)~~ **[SET-A-04]** Regula de produs rămâne 45 de zile de la depunere; respectarea ei în copiile de siguranță = problemă tehnică de implementare (T-D1) | `backup:db` + ștergerea copiilor mai vechi |
| ~~`audit_log`~~ **[SET-A-03]** `audit_log` fără legătură cu o sesizare ~~, jurnalele aplicației, sesiunile expirate~~ | ~~45 de zile: **[SET-A-03]** **propunere tehnică neconfirmată (REC-02)**~~ **[SET-A-04]** **6 luni**, apoi ștergere automată (decizia 4) | `purge:retention` |
| **[SET-A-04]** jurnalele aplicației, sesiunile expirate | ~~**REC-02 (deschis)**; până la decizie, propunerile anterioare (jurnale: 14 zile; sesiuni: 45 de zile) rămân **neconfirmate**~~ **[SET-A-05]** **6 luni**, apoi ștergere automată (decizia 1): jurnalele de la scriere (rotație), sesiunile de la expirare | `purge:retention`; rotația jurnalelor |
| `rejected_attempts` | **30 de zile** (N4-8, decizie anterioară, mai strictă) | neschimbat |
| sondajele, voturile agregate, arhiva publică | **nu intră** în regula de 45 de zile (D3: arhivă publică, cu rezultatele finale) | — |
| textele libere din sondaje | ~~45 de zile după închiderea sondajului: **[SET-A-03]** **propunere tehnică neconfirmată (REC-02)**; **[SET-A-04]** încă nedecis~~ **[SET-A-05]** **6 luni**, apoi ștergere automată (decizia 2). Momentul de start nu este precizat în decizie; citirea literală: de la introducerea textului (vezi observația O-A05-1, `FAZA_4_DECIZII_NOI.md` §0.7) | `purge:retention` |

## 4. Integritate: rezumat

| Regulă | Unde este garantată |
|---|---|
| `TM-XXX` unic și nerefolosit | `UNIQUE` + contor în tranzacție `FOR UPDATE` |
| Un vot per jeton per sondaj | `UNIQUE (survey_id, participation_fingerprint)` |
| Sondajul cu voturi nu se șterge | FK `RESTRICT` + verificare 409 |
| Structura blocată după primul vot | `first_submission_at` + verificare în serviciu |
| ~~Sesizările nu se șterg~~ | ~~nu există endpoint sau operație de ștergere; FK `RESTRICT`~~ **[SET-A-01] abrogat (A-1)** |
| **[SET-A-01]** Ștergerea definitivă numai de autor sau de `super_admin` (D11–D12, D19, A-5) | verificare în serviciu: `author_account_id = contul curent` sau rolul `super_admin` (lista exclusivă, B4 §2.4) |
| **[SET-A-01]** `TM-XXX` rezervat după ștergere (D25–D26) | `report_counter` nu scade și nu se recalculează; ștergerea nu atinge contorul |
| **[SET-A-01]** Un e-mail = un cont (D30) | `citizen_accounts.email_normalized UNIQUE` |
| **[SET-A-01]** Sesizare numai din cont confirmat și neblocat (A-9, D15) | verificare în serviciu, în tranzacția de depunere (`status = active` + nicio blocare activă) |
| **[SET-A-02]** `new` → `in_analysis` numai după trimiterea efectivă (2.1) | tranziția se face numai în tranzacția care marchează `registry_notification` = `sent`; nicio altă cale |
| **[SET-A-02]** Maximum 3 transmiteri către Primărie / cont / 24 h (2.14) | numărare în tranzacția de depunere (`city_hall_transmission_requested = true`, ultimele 24 h, același cont); a 4-a cerere → 429 |
| **[SET-A-02]** Locația în interiorul UAT (2.12) | point-in-polygon pe server, la depunere și la corectare |
| **[SET-A-02]** Retenție 45 de zile (2.5) | `purge:retention` zilnic; test obligatoriu |
| **[SET-A-03]** Retenția sesizării de la depunere (K-A02-3, REC-01) | `purge:retention` după `reports.created_at` ~~și `email_outbox.retention_anchor_at`~~ (**[SET-A-05]** jurnalul e-mail urmează sesizarea prin cascadă); test obligatoriu |
| **[SET-A-03]** Ștergerea nu lasă urme în audit (B-7) | în tranzacția de ștergere: niciun rând nou + ștergerea rândurilor `target_type = 'report'` ale sesizării |
| **[SET-A-03]** Blocare temporară = 15 zile (K-A02-4) | `ends_at` calculat de server; `CHECK` (`kind = 'temporary'` ⇒ `ends_at` NOT NULL) |
| **[SET-A-03]** Fără recrearea contului sub blocare definitivă (K-A02-4) | verificarea `email_hash` la crearea contului (T-C7) |
| **[SET-A-04]** Auditul administrativ: 6 luni (decizia 4) | `purge:retention` șterge rândurile `audit_log` cu `target_type ≠ 'report'` mai vechi de 6 luni; test obligatoriu |
| **[SET-A-04]** Contul cetățeanului nu se șterge automat (decizia 2) | `purge:retention` nu conține nicio regulă pentru `citizen_accounts`; test obligatoriu |
| **[SET-A-05]** Jurnalul e-mail dispare odată cu sesizarea (T-C8) | `email_outbox.report_id` `ON DELETE CASCADE` + ștergere explicită în tranzacția §3.8 |
| **[SET-A-05]** Jurnale, sesiuni expirate, texte libere: 6 luni (REC-02 (c), (d)) | `purge:retention` / rotație; test obligatoriu |
| Coordonatele: ambele sau niciuna | `CHECK` |
| O notificare de un anumit tip o singură dată | `email_outbox.dedupe_key UNIQUE` |
| Cel puțin un `super_admin` activ | verificare tranzacțională în serviciul de conturi |
| Nicio dată demo în producție | verificare la pornire (§5.3) |
| **[SET-01]** Numai tranzițiile `new` → `in_analysis` → `resolved` (DN-09) | ENUM cu 3 valori + verificare în serviciu, în tranzacție (409) |
| **[SET-01]** `resolved` numai prin subcontul Primăriei (DN-09) | verificare în serviciu: `actsForCityHall` + `primaria_mode = platform` (P-9) |
| **[SET-01]** Fără transmitere către Primărie fără cererea cetățeanului (pct. 7) | niciun rând `registry_notification` dacă `city_hall_transmission_requested = false` |
| **[SET-01]** Vot respins după `end_at` (E-3) | verificare pe server + închidere automată |

## 5. Migrarea din `localStorage` (B1, D10-5)

### 5.1 Inventarul cheilor actuale

| Cheie | Conține | Acțiune |
|---|---|---|
| `turnu_civic_reports_store` | sesizări (inclusiv **date de contact**, fotografii base64) | **nu se migrează**; **se elimină** din browser (5.7) |
| `turnu_civic_reports_counter` | contorul `TM` local | nu se migrează; se elimină |
| `turnu_civic_email_log_store` | jurnalul e-mail (adrese de destinatar) | nu se migrează; **se elimină** (A-19) |
| `turnu_civic_announcements` | comunicate (demo sau editate local) | nu se migrează; se elimină |
| `turnu_civic_city_hall_directory` | Ghidul | nu se migrează; se elimină |
| `turnu_civic_quickdial_contacts`, `turnu_civic_quickdial_categories` | Apel rapid | nu se migrează; se elimină |
| `turnu_civic_surveys_store`, `turnu_civic_survey_submissions_store` | sondaje și voturi locale | nu se migrează; se elimină |
| `turnu_civic_user_participated_surveys` | marcaj „am votat” | nu se migrează (ID-uri demo vechi); se elimină. O cheie nouă poate exista **numai pentru UX** (N4-12). |
| `turnu_civic_admin_session` (local + session) | sesiunea Admin client-side (P7) | **se elimină** la 5.2 |

**Motiv:** datele din `localStorage` sunt locale fiecărui browser, demo sau de test, fără valoare de producție. D10-5 interzice migrarea.

### 5.2 Clasificarea cerută de instrucțiune

| Categorie | Conținut |
|---|---|
| **Date care trebuie migrate** | **niciuna** (D10-5); **[SET-A-01]** nici conturi de cetățeni (nu există în versiunea actuală) |
| **Date demo care NU se migrează în producție** | comunicatele, sondajele, sesizările, conturile demo (D10-1, D10-2) |
| **Date care se regenerează** | categoriile de sesizări (**seed de configurare**, toate mediile); datele demo (**seed-uri demo**, numai dezvoltare / staging, D10-4); datele de referință (Ghid, Apel rapid) pentru producție, **după verificare** (D10-6; mecanism: DN-14) |
| **Date care se elimină** | toate cheile din §5.1, din browserele utilizatorilor, la 5.7 (sesiunea Admin la 5.2) |

### 5.3 Seed-uri și protecția producției

| Mecanism | Regulă |
|---|---|
| `seed:config` | categoriile de sesizări (și cheile `settings` cu valorile implicite); rulabil în orice mediu; idempotent |
| `seed:demo` | refuză să ruleze dacă `APP_ENV = production` (D10-4); marchează totul `is_demo = true` |
| Verificarea la pornire | în `production`, aplicația **refuză să pornească** dacă există rânduri `is_demo = true` în orice tabel de conținut (D10-3) |
| Conturile demo (staging) | create prin bootstrap sau seed, pe adrese controlate, cu parole generate, **necomise** (D10-2) |

## 6. Decizii noi rezultate din B1

Detaliate în `FAZA_4_DECIZII_NOI.md`:
- **DN-02:** asumările în audit față de regula 6.6 (**[SET-01] aprobat**);
- **DN-09:** stările și tranzițiile (**[SET-01] aprobat**; **[SET-A-02]** P-1 decis prin 2.1, P-9 confirmat; P-4 / P-5 tehnice);
- **DN-10:** fluxul către Primărie dezactivat: **[SET-A-02] decis (2.13)**, reluare automată;
- **DN-11:** retenția datelor: **[SET-A-02] decis (2.5)**, 45 de zile; ~~momentul de referință: K-A02-3;~~ **[SET-A-03]** de la depunerea sesizării (K-A02-3), pentru toate datele legate de sesizare (REC-01); ~~contul și datele fără legătură cu o sesizare: **REC-02 (deschis)**;~~ **[SET-A-04]** contul: fără ștergere automată; auditul administrativ: 6 luni; ~~jurnalele aplicației, sesiunile, textele libere, blocările temporare expirate: **REC-02 (deschis)**;~~ **[SET-A-05]** jurnalele aplicației, sesiunile expirate, textele libere: 6 luni; blocarea temporară expirată: în auditul administrativ (6 luni);
- **DN-12:** datele de contact (**[SET-01] aprobat**; **[SET-A-01/02]** P-6 și P-7 închise; e-mailul în contul cetățeanului);
- **DN-13:** eliminarea valorii istorice `private`: **[SET-A-02] închis** (2.8, câmpul eliminat);
- **DN-14:** încărcarea datelor de referință în producție (deschis).


## 7. [SET-A-02] Numărul final de tabele (corectura 5)

**30 de tabele:**

| Grup | Tabele |
|---|---|
| Admin și sistem | `admin_users`, **`admin_recovery_codes`**, `sessions`, `audit_log`, `settings` |
| Cetățeni | **`citizen_accounts`**, **`citizen_login_codes`**, **`citizen_blocks`** |
| Sesizări | `report_categories`, `report_counter`, `reports`, `report_assignees`, `report_photos`, `report_responses` |
| Conținut | `announcements`, `directory_institution`, `directory_departments`, `directory_services`, `directory_links`, `quickdial_categories`, `quickdial_contacts` |
| Sondaje | `surveys`, `survey_questions`, `survey_options`, `survey_submissions`, `survey_answers` |
| E-mail și anti-abuz | `email_outbox`, `rate_limits`, `rejected_attempts`, `used_pow_challenges` |

Istoric: revizia 0 = 27 de tabele (în transfer scria „≈ 25”); revizia 2 = −1 (`report_contacts`) +3 (conturile cetățenilor) = 29; revizia 3 = +1 (`admin_recovery_codes`) = **30**.
