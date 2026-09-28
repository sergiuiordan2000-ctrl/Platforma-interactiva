# FAZA 4 — B1: PERSISTENȚĂ (MODELUL DE DATE) ȘI MIGRAREA DIN `localStorage`

**Proiect:** Turnu Măgurele Civic · **Data:** 27.09.2026 · **Stare:** **ÎNGHEȚAT** (checkpoint-ul Fazei 4 aprobat la 28.09.2026).
**Bază:** RULES §6, §11 (deciziile Fazei 3); tipurile din `src/types/*`; serviciile din `src/services/*` (la `cb9f47e`); deciziile din `FAZA_4_REGISTRU_DECIZII.md`.

> **Revizia 7, versiune curată (28.09.2026).** Conține numai regulile valabile. Istoricul reviziilor 1–6 (text tăiat, marcaje de set) este în `istoric/revizia_6_adnotata/`; sursa fiecărei decizii este în `FAZA_4_REGISTRU_DECIZII.md`. Valorile marcate „propunere” sau „propunere tehnică” fac parte din designul înghețat; valorile numerice (DN-15) rămân configurabile.

---

## 1. Convenții generale (propuse)

| Element | Convenție |
|---|---|
| Motor | MySQL 8.4 LTS (producție, dezvoltare), 8.0.37 (staging temporar); InnoDB; `utf8mb4` / `utf8mb4_0900_ai_ci` (G2, B-6) |
| Identificatori | **ULID** (`CHAR(26)`, sortabil în timp, generat în aplicație) pentru entitățile de domeniu; `BIGINT AUTO_INCREMENT` pentru jurnale (audit, răspunsuri la sondaje); cheile de configurare sunt text |
| Timp | `DATETIME(3)` în **UTC**; conversia la ora României se face numai la afișare |
| Ștergere | **fără ștergere fizică** acolo unde regulile o interzic (comunicate, conturi Admin, sondaje cu voturi); în rest, ștergere controlată. **A-1:** sesizările **se șterg definitiv** (autorul sau `super_admin`), vezi §3.8. |
| Chei străine | `ON DELETE RESTRICT` implicit; `CASCADE` numai unde este sigur (de exemplu întrebările unui sondaj fără voturi). `CASCADE` și pentru dependențele unei sesizări (§3.8). |
| Marcaj demo | `is_demo BOOLEAN NOT NULL DEFAULT FALSE` pe entitățile de conținut (D10-3) |
| Compatibilitate | numai elemente comune MySQL 8.0 și 8.4 (B-6); fără funcții spațiale; `CHECK` permis (≥ 8.0.16) |
| Migrații | Drizzle (dialect MySQL), fișiere SQL versionate în `server/migrations/` (5.1) |
| Fișiere binare | **niciodată în DB**: fotografiile stau pe disc, în afara docroot-ului; în DB se păstrează doar metadatele (N-2) |

## 2. Diagrama relațiilor (textuală)

```
admin_users 1─* sessions                    citizen_accounts 1─* sessions (principal_type)
citizen_accounts 1─* reports (autor) · citizen_accounts 1─* citizen_login_codes · citizen_accounts 1─* citizen_blocks
admin_users 1─* admin_recovery_codes (2.15) · citizen_blocks păstrează email_hash (2.6, K-A02-4)
admin_users 1─* audit_log (actor)          settings (cheie → valoare; modificată de admin_users)
admin_users 1─* report_assignees *─1 reports
report_categories 1─* reports
                         reports 1─* report_photos        (metadate; fișierul pe disc)
                         reports 1─* report_responses     (numai note interne, A06-3)
                         reports 1─* email_outbox         (notificări de stare, Primărie; se șterg cu sesizarea, A05-4)
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
| (tabel separat `admin_recovery_codes`) | — | codurile de recuperare TOTP (2.15), vezi mai jos |
| `created_at`, `created_by`, `updated_at`, `last_login_at`, `disabled_at`, `disabled_by` | — | `created_by` / `disabled_by` sunt FK spre `admin_users`, NULL pentru bootstrap |

Constrângere de aplicație (tranzacțională): **cel puțin un `super_admin` activ** în orice moment (D8, protecții).

**`admin_recovery_codes`** (2.15-A)

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

Ce se auditează: vezi B4 §5. **DN-02:** asumarea și retragerea asumării individuale **nu** se scriu în `audit_log`; auditul nu se folosește pentru a reconstrui un istoric al asumărilor (regula 6.6).
Retenția: rândurile care privesc o sesizare (`target_type = 'report'`) se șterg **odată cu sesizarea**, la ștergerea definitivă sau la expirarea retenției (B-7, REC-01, §3.8, T-C3). Ștergerea definitivă **nu** se auditează (B-7). Rândurile care **nu** privesc o sesizare (auditul administrativ) se păstrează **6 luni** și apoi se șterg automat (A04-4).

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
- `registry.primaria_mode`: `platform` / `email_only` / `none` (A17-8), implicit `none`. Valoarea `platform` traduce condiția DN-09 „Primăria participă și are subcont”, care permite starea `resolved` (propunere tehnică P-9). Transmiterea prin e-mail **nu depinde** de această valoare (S1-6).

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
| `author_account_id` | FK → `citizen_accounts`, NULL, `ON DELETE SET NULL` (2.7: ștergerea contului nu șterge sesizările; după ștergere, sesizarea nu mai are autor în aplicație) | autorul (D29, A-4); **nu apare public** (D9, A-7); cheia pentru lista proprie (D27) și pentru ștergerea de către autor (D19). Pentru seed-urile demo: conturi demo cu adrese controlate (D10-2). |
| `reference_number` | VARCHAR(16) UNIQUE | `TM-001`… (format actual `TM-` + minimum 3 cifre); nerefolosibil. **D25–D26:** rămâne rezervat și după ștergere; garanția vine din `report_counter` (monoton), nu din `UNIQUE`, care nu mai vede rândurile șterse. |
| `category_id` | FK → `report_categories` | — |
| `description` | TEXT | 15–1000 de caractere (validarea actuală a formularului) |
| `location_text` | VARCHAR(300) | obligatoriu (D6-2). **DN-21:** public **imediat** (A-3); poate conține strada, numărul, blocul; descrie locul problemei, nu autorul |
| `lat`, `lng` | DECIMAL(9,6) NULL | locul problemei, exact (D6-3); `CHECK ((lat IS NULL) = (lng IS NULL))`; în limitele UAT (D6-4, **2.12:** verificare obligatorie pe server, în afara UAT → 422). **2.4:** NULL dacă poziția nu a putut fi determinată; sesizarea se salvează, dar nu apare pe hartă până la o poziție validă. |
| `location_source` | ENUM(`text`,`pin`,`gps_pin`, `geocoded`, `admin_corrected`) | D6; **2.4:** punct ales pe hartă sau poziția curentă (`pin` / `gps_pin`); adresă geocodată automat (`geocoded`); corectată de `super_admin` (`admin_corrected`, 2.11); numai text, fără poziție (`text`) |
| `gps_accuracy_m` | DECIMAL(7,1) NULL | numai pentru `gps_pin` neajustat (D6-6) |
| `location_approximate` | BOOLEAN NOT NULL DEFAULT FALSE | `true` pentru `geocoded` neajustat de utilizator (2.4: pin **aproximativ**); harta îl afișează ca zonă, nu ca punct precis (decizie tehnică) |
| `resolution_status` | ENUM(`new`,`in_analysis`,`resolved`) | implicit `new`. **DN-09 + C-2:** numai 3 stări (`closed` eliminat); tranziții permise numai `new` → `in_analysis` → `resolved` (P-4, P-5: propunere tehnică). **2.1:** `new` → `in_analysis` **automat**, numai când e-mailul către Primărie devine `sent` (acceptat de serverul de e-mail); fără transmitere cerută sau înainte de trimiterea efectivă, rămâne `new`. `resolved` numai prin subcontul Primăriei (SET-A-02 §3). **Consecință:** o sesizare netransmisă nu poate deveni `resolved` (tranzițiile sunt strict ordonate). |
| `city_hall_taken_over`, `…_at`, `…_by` | BOOLEAN, DATETIME, FK | ireversibil (6.6). **C-3:** preluarea **nu** schimbă `resolution_status` |
| `city_hall_transmission_requested`, `…_at` | BOOLEAN NOT NULL DEFAULT FALSE, DATETIME NULL | **pct. 7 / S1-4:** alegerea cetățeanului la depunere. Fără cerere: nicio transmitere, starea rămâne `new`. Cu cerere: Primăria primește numai e-mailul contului (D29: cererea de transmitere este acordul). |
| `location_corrected_at`, `location_corrected_by` | NULL | D6-5 (valorile inițiale în `audit_log`) |
| `notify_opt_in`, `notify_opt_in_at` | BOOLEAN, DATETIME NULL | D9-2 |
| `unsubscribe_token_hash`, `notify_unsubscribed_at` | CHAR(64) NULL, DATETIME NULL | D9-2 (jetonul în clar numai în e-mail) |
| `idempotency_key` | CHAR(36) UNIQUE NULL | retrimiterea formularului nu creează o a doua sesizare (B7) |
| `is_demo` | BOOLEAN | D10-3 |
| `created_at`, `updated_at` | DATETIME(3) | — |

Indexuri: (`author_account_id`, `created_at`) (D27), (`created_at`) pentru retenție, (`resolution_status`, `created_at`), (`category_id`), (`city_hall_taken_over`), (`is_demo`).
Starea transmiterii către Primărie (A17-7) **nu se stochează dublat**: se derivă din `email_outbox` (tipul `registry_notification`); **2.13:** cu fluxul oprit, rândul există în starea `on_hold` („în așteptare”) și se trimite automat la reactivare (închide DN-10). Când `city_hall_transmission_requested = false`, valoarea derivată este „nesolicitat” (propunere tehnică, P-12).

E-mailul cetățeanului este data contului (`citizen_accounts.email`, A-4, D29), nu a sesizării.

**`report_assignees`** (starea curentă, 6.6): PK (`report_id`, `user_id`), `assigned_at`. Retragerea șterge rândul (fără istoric, 6.6). **DN-02:** asumarea și retragerea nu scriu în `audit_log`. **C-3:** asumarea nu schimbă `resolution_status`.

**`report_photos`**

| Coloană | Tip | Reguli |
|---|---|---|
| `id` | CHAR(26) PK | apare în URL-ul public al fotografiei principale (nu este ID-ul sesizării) |
| `report_id` | FK **`ON DELETE CASCADE`** | UNIQUE (`report_id`, `ordinal`); fișierul de pe disc se șterge după COMMIT (§3.8) |
| `ordinal` | TINYINT 1–4 | maximum 4 (formularul actual) |
| `storage_key` | VARCHAR(200) UNIQUE | nume aleator; **fără numele original** (6.5 P4) |
| `mime` | ENUM(`image/webp`,`image/jpeg`) | verificat prin semnătura fișierului (B5) |
| `size_bytes`, `width`, `height`, `sha256` | — | — |
| `created_at` | — | — |

**`report_responses`**

| Coloană | Tip | Reguli |
|---|---|---|
| `id` | CHAR(26) PK | — |
| `report_id` | FK | index (`report_id`, `created_at`). **Numai note interne** (A06-3): nu există „răspuns către cetățean” și nicio notificare. |
| `message` | TEXT | limită propusă: 2000 de caractere |
| `author_user_id` | FK | numele autorului nu apare în e-mail (D9-7) |
| `created_at` | — | fără editare, fără ștergere individuală (5C: istoricul complet se păstrează). Se șterg odată cu sesizarea (`ON DELETE CASCADE`, D20). |

### 3.3 Conținut (comunicate, Ghid, Apel rapid)

**`announcements`**:
- coloanele actuale: `type` ENUM(`notification`,`announcement`,`news`,`event`), `title`, `summary`, `content` TEXT, `published_at`, `author` (text afișat), `category`, `image_url` NULL (**DN-19 / A04-5:** numai calea relativă a unei imagini păstrate în repository și publicate odată cu aplicația; T-C9), `is_urgent`, `expires_at` NULL, `status` ENUM(`published`,`draft`), `event_date` DATE NULL, `event_time` TIME NULL, `event_location`, `event_organizer`;
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
| `results_visibility` | ENUM(`live`,`after_close`) | implicit `after_close` (D3; fără `admin_only`, corectura 1) |
| `pow_enabled` | BOOLEAN | N4-5 / N4-10 |
| `integrity_flag`, `integrity_note` | BOOLEAN, VARCHAR(500) | N4-10, vizibile public în arhivă |
| `first_submission_at` | DATETIME NULL | **blocarea structurii** după primul vot (D3/D4) |
| `is_demo`, `created_*`, `updated_*` | — | — |

Starea efectivă „deschis” = `status = 'active'` **și** `start_at ≤ acum < end_at`, calculată pe server.
**E-3:** la `end_at` sondajul devine `closed` automat, pe server, fără intervenție manuală; voturile noi sunt respinse; rezultatele finale intră în arhiva publică. Mecanism (propunere tehnică, P-11): verificarea `acum ≥ end_at` la fiecare cerere + comanda `surveys:close-expired` (cron), care persistă `status = 'closed'`, cu audit (actor `system`).

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

**`survey_answers`**: `id` BIGINT AI, `submission_id` FK, `question_id` FK, `option_id` FK NULL (un rând per opțiune aleasă), `text_value` TEXT NULL (numai pentru `free_text`; limită propusă 2000). Index (`question_id`, `option_id`) pentru agregare. Retenția textelor libere: **6 luni de la închiderea sondajului** (A05-2, A06-1; §3.9).

### 3.5 E-mail (B6, N-3, D9, A-17)

**`email_outbox`**

| Coloană | Tip | Reguli |
|---|---|---|
| `id` | CHAR(26) PK | — |
| `kind` | ENUM(`registry_notification`, `citizen_status_update`, `citizen_login_code`, `citizen_account_blocked`) | `citizen_status_update` numai la `nouă → în analiză` și `în analiză → rezolvată` (2.2); fără e-mail de confirmare la depunere (A06-2) și fără răspuns către cetățean (A06-3); `citizen_login_code`: codul de confirmare / autentificare (D31, A-9); `citizen_account_blocked`: mesajul către titularul unui e-mail blocat definitiv care încearcă să creeze un cont nou (A06-6) |
| `report_id` | FK NULL | index. `ON DELETE CASCADE`: jurnalul e-mail al unei sesizări se șterge **odată cu sesizarea** (A05-4), la ștergerea definitivă sau la expirarea celor 45 de zile de la depunere; NULL numai pentru e-mailurile fără sesizare (e-mailurile de cont) |
| `dedupe_key` | VARCHAR(128) UNIQUE | idempotență (N3-1): de exemplu `registry:<report>`, `status:<report>:in_analysis`, `status:<report>:resolved`; codurile de cont fără `dedupe_key` |
| `recipient` | VARCHAR(254) | — |
| `subject` | VARCHAR(200) | numai din șabloane (fără conținutul utilizatorului în antete) |
| `body_text` | MEDIUMTEXT NULL | pentru e-mailurile fără sesizare: **șters după 45 de zile** (N3-8) → `NULL` + `body_purged_at`; pentru cele legate de o sesizare, rândul întreg dispare odată cu sesizarea (A05-4) |
| `attachment_photo_ids` | JSON NULL | referințe; fișierele se citesc la trimitere (N3-7) |
| `status` | ENUM(`queued`,`sending`,`sent`,`failed`,`blocked`,`simulated`,`cancelled`, `on_hold`) | N3-1 / N3-3. **2.13:** `on_hold` = transmitere cerută, cu fluxul către Primărie oprit sau indisponibil; la reactivarea fluxului, toate rândurile `on_hold` trec automat în `queued`. **2.1:** trecerea unui `registry_notification` în `sent` mută sesizarea `new` → `in_analysis`, în aceeași tranzacție. |
| `attempts`, `next_attempt_at`, `locked_until`, `last_error` | — | retry cu pauze crescătoare; `locked_until` = lease pentru procesare |
| `mode_at_send`, `transport` | ENUM | `simulated` / `allowlist` / `live`; `simulated` / `smtp` |
| `provider_message_id` | VARCHAR(200) NULL | — |
| `created_at`, `sent_at`, `body_purged_at` | — | index (`status`, `next_attempt_at`), (`created_at`) |

### 3.6 Anti-abuz (B7, N-4)

| Tabel | Conținut | Păstrare |
|---|---|---|
| `rate_limits` | PK (`bucket_key`, `window_start`), `count`, `expires_at`; `bucket_key` conține numai hash-uri (de exemplu `vote:ip:<hash>:<survey>`) | ≤ 48 h (N4-4) |
| `rejected_attempts` | PK (`hour`, `area`, `target_id`, `reason`, `ip_hash`), `count`; `area` ∈ {`vote`,`report`,`login`, `citizen_code`}; `reason` + `blocked`; `reason` ∈ {`duplicate`,`rate_limited`,`closed`,`honeypot`,`too_fast`,`pow_invalid`,`invalid`} | **30 de zile** (N4-8) |
| `used_pow_challenges` | PK `challenge_hash`, `expires_at` | până la expirarea provocării (anti-reluare proof-of-work) |

`ip_hash` = HMAC-SHA256(cheia zilei, IP), unde cheia zilei = HMAC(`IP_HASH_SECRET`, data UTC). Rotația este zilnică, prin construcție (N4-4).

### 3.7 Conturile cetățenilor (D29–D31, D8, D13–D18, A-4, A-8, A-9)

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
| `kind` | ENUM(`temporary`,`permanent`) | **K-A02-4:** `temporary` = **15 zile**, cu expirare automată; `permanent` = **definitivă**, fără expirare automată. Alegerea o face `super_admin` la blocare. |
| `starts_at`, `ends_at` | DATETIME, DATETIME NULL | `ends_at` obligatoriu pentru `temporary`, NULL pentru `permanent` (`CHECK`). `ends_at = starts_at + 15 zile`, calculat de server; API-ul nu mai primește o durată (T-C5). `starts_at` devine NULL la reducerea blocării definitive la datele minime (T-C6). |
| `created_by` | FK → `admin_users` NULL | **numai `super_admin`** (D13, A-5); devine NULL la reducerea blocării definitive la datele minime (T-C6) |
| `note` | VARCHAR(500) NULL | internă. Utilizatorul vede numai că depunerea îi este blocată și, pentru o blocare temporară, termenul (decizie tehnică) |
| `lifted_at`, `lifted_by` | NULL | **2.6, A06-4:** orice blocare (temporară sau definitivă) poate fi ridicată manual, **numai de `super_admin`**; cu audit. După ridicare sau expirare, rândul se șterge, iar informația rămâne în auditul administrativ (A05-3, T-E1) |
| `email_hash` | CHAR(64) | HMAC al e-mailului normalizat (2.6: blocarea este asociată contului / e-mailului). `account_id` devine NULL la ștergerea contului. **K-A02-4:** pentru o blocare **definitivă**, `email_hash` este identificatorul minim păstrat: împiedică recrearea contului cu același e-mail și depunerea de sesizări (T-C7, A06-6). O blocare temporară rămâne legată de `email_hash` până la expirarea celor 15 zile (dacă titularul își șterge și recreează contul, blocarea continuă până la termen). |

Efect (D15–D18): o blocare activă respinge **numai** depunerea unei sesizări noi (403). Autentificarea, lista proprie, ștergerea propriilor sesizări, votul și conținutul public rămân neafectate. Sesizările existente nu se ating (D16).

**Date minime pentru blocarea definitivă (K-A02-4; propunere tehnică T-C6):** la ștergerea contului de către cetățean (2.7; contul nu se șterge automat, A04-2), rândul unei blocări definitive active se reduce la `id`, `kind` și `email_hash`; `account_id`, `note`, `created_by` și `starts_at` devin NULL. Nu se păstrează alte date (K-A02-4: „nu se păstrează mai multe date decât sunt necesare”).

**Politica de utilizare (2.9):** `citizen_accounts.policy_version` + `policy_accepted_at` (NOT NULL). Contul nu se creează fără bifarea explicită a acceptării (422 la API).

**Ștergerea contului (2.7):** `DELETE` pe `citizen_accounts`. Sesiunile și codurile se șterg (CASCADE); sesizările rămân, cu `author_account_id = NULL`; notificările către cetățean ale acestor sesizări se anulează (nu mai există adresă). Notificările către Primărie aflate în coadă se trimit fără e-mailul cetățeanului, care nu mai există (decizii tehnice derivate). Blocările păstrează `email_hash`. O blocare definitivă se reduce la datele minime (T-C6); cât timp este activă, contul nu poate fi recreat cu același e-mail (T-C7). O blocare temporară rămâne valabilă până la expirarea celor 15 zile.

**`sessions`** (extins): coloana `principal_type` ENUM(`admin`,`citizen`) + `citizen_account_id` FK NULL. Sesiunile cetățenilor nu au `mfa_state` (propunere tehnică).

### 3.8 Ștergerea definitivă a unei sesizări (A-1, D10–D12, D19–D24)

O singură tranzacție (propunere tehnică, T-A4):
1. verificarea dreptului: autorul (`author_account_id`) **sau** rolul `super_admin` (B4 §2.4);
2. `DELETE FROM email_outbox WHERE report_id = ?`: **toate** rândurile jurnalului e-mail al sesizării (netrimise și trimise) se șterg în aceeași tranzacție (A05-4); nimic din coadă nu mai pleacă (D23). Un rând aflat în `sending` în acel moment: lucrătorul verifică existența rândului înainte să-l marcheze trimis (propunere tehnică T-E2);
3. `DELETE FROM reports WHERE id=?`: `report_photos`, `report_responses`, `report_assignees` se șterg prin `CASCADE`;
4. COMMIT, apoi ștergerea fișierelor foto de pe disc (la eșec: reîncercare prin `purge:orphan-files`);
5. `report_counter` **nu** se atinge (D25–D26);
6. **B-7:** pentru ștergere **nu** se scrie niciun rând în `audit_log`; rândurile existente care privesc sesizarea (`target_type = 'report'`, `target_id` = sesizarea) se șterg în aceeași tranzacție, ca să nu rămână în audit o urmă care să permită reconstituirea ei (propunere tehnică T-C3). Același pas se aplică la ștergerea prin retenție (§3.9).

E-mailul deja primit de Primărie nu se poate retrage (D21). Regula de produs rămâne **45 de zile de la depunere**, fără excepție pentru backup-uri (A04-1); modul în care copiile de siguranță respectă această regulă este o **problemă tehnică de implementare** (T-D1).

### 3.9 Retenția

**Reguli aprobate:** datele unei sesizări — sesizarea, fotografiile, e-mailurile și alte date aferente — se păstrează **45 de zile de la depunere** (2.5, K-A02-3, REC-01, A04-1), în măsura în care ștergerea este posibilă legal și tehnic. `TM-XXX` rămâne rezervat definitiv. Contul cetățeanului **nu** se șterge automat (A04-2). Auditul administrativ, jurnalele aplicației și sesiunile expirate: **6 luni** (A04-4, A05-1). Textele libere din sondaje: **6 luni de la închiderea sondajului** (A05-2, A06-1). Blocarea definitivă este tratată separat de retenție (K-A02-4).

| Date | Termen | Mecanism (tehnic) |
|---|---|---|
| sesizarea + fotografiile + răspunsurile + responsabilii + jurnalul ei e-mail + rândurile `audit_log` ale sesizării | 45 de zile **de la depunere** (`reports.created_at`), indiferent de stare | `purge:retention` zilnic: aceeași ștergere definitivă ca în §3.8, inclusiv pasul 6 (B-7) |
| `email_outbox` fără sesizare (e-mailurile de cont) | 45 de zile de la creare (N3-8) | `purge:retention` |
| contul cetățeanului (`citizen_accounts`) | **fără ștergere automată** (A04-2): contul rămâne până când cetățeanul îl șterge (2.7). Codurile de autentificare expiră și se curăță zilnic (neschimbat). | `purge:retention` **nu** atinge conturile |
| `citizen_blocks` | după expirare sau ridicare: rândul se șterge, informația rămâne în **auditul administrativ** (6 luni; A05-3, T-E1); **o blocare definitivă activă se păstrează** fără termen, la ștergerea contului redusă la datele minime (K-A02-4, T-C6) | `purge:retention` |
| backup-uri | 45 de zile (rotație). Regula de produs rămâne 45 de zile de la depunere; respectarea ei în copiile de siguranță = problemă tehnică de implementare (T-D1) | `backup:db` + ștergerea copiilor mai vechi |
| `audit_log` fără legătură cu o sesizare | **6 luni**, apoi ștergere automată (A04-4) | `purge:retention` |
| jurnalele aplicației, sesiunile expirate | **6 luni**, apoi ștergere automată (A05-1): jurnalele de la scriere (rotație), sesiunile de la expirare | `purge:retention`; rotația jurnalelor |
| `rejected_attempts` | **30 de zile** (N4-8, decizie anterioară, mai strictă) | neschimbat |
| sondajele, voturile agregate, arhiva publică | **nu intră** în regula de 45 de zile (D3: arhivă publică, cu rezultatele finale) | — |
| textele libere din sondaje | **6 luni de la închiderea sondajului**, apoi ștergere automată (A05-2, A06-1) | `purge:retention` |

## 4. Integritate: rezumat

| Regulă | Unde este garantată |
|---|---|
| `TM-XXX` unic și nerefolosit | `UNIQUE` + contor în tranzacție `FOR UPDATE` |
| Un vot per jeton per sondaj | `UNIQUE (survey_id, participation_fingerprint)` |
| Sondajul cu voturi nu se șterge | FK `RESTRICT` + verificare 409 |
| Structura blocată după primul vot | `first_submission_at` + verificare în serviciu |
| Ștergerea definitivă numai de autor sau de `super_admin` (D11–D12, D19, A-5) | verificare în serviciu: `author_account_id = contul curent` sau rolul `super_admin` (lista exclusivă, B4 §2.4) |
| `TM-XXX` rezervat după ștergere (D25–D26) | `report_counter` nu scade și nu se recalculează; ștergerea nu atinge contorul |
| Un e-mail = un cont (D30) | `citizen_accounts.email_normalized UNIQUE` |
| Sesizare numai din cont confirmat și neblocat (A-9, D15) | verificare în serviciu, în tranzacția de depunere (`status = active` + nicio blocare activă) |
| `new` → `in_analysis` numai după trimiterea efectivă (2.1) | tranziția se face numai în tranzacția care marchează `registry_notification` = `sent`; nicio altă cale |
| Maximum 3 transmiteri către Primărie / cont / 24 h (2.14) | numărare în tranzacția de depunere (`city_hall_transmission_requested = true`, ultimele 24 h, același cont); a 4-a cerere → 429 |
| Locația în interiorul UAT (2.12) | point-in-polygon pe server, la depunere și la corectare |
| Retenția sesizării: 45 de zile de la depunere (K-A02-3, REC-01) | `purge:retention` după `reports.created_at` (jurnalul e-mail urmează sesizarea prin cascadă); test obligatoriu |
| Ștergerea nu lasă urme în audit (B-7) | în tranzacția de ștergere: niciun rând nou + ștergerea rândurilor `target_type = 'report'` ale sesizării |
| Blocare temporară = 15 zile (K-A02-4) | `ends_at` calculat de server; `CHECK` (`kind = 'temporary'` ⇒ `ends_at` NOT NULL) |
| Fără recrearea contului sub blocare definitivă (K-A02-4) | verificarea `email_hash` la crearea contului (T-C7) |
| Auditul administrativ: 6 luni (A04-4) | `purge:retention` șterge rândurile `audit_log` cu `target_type ≠ 'report'` mai vechi de 6 luni; test obligatoriu |
| Contul cetățeanului nu se șterge automat (A04-2) | `purge:retention` nu conține nicio regulă pentru `citizen_accounts`; test obligatoriu |
| Jurnalul e-mail dispare odată cu sesizarea (A05-4) | `email_outbox.report_id` `ON DELETE CASCADE` + ștergere explicită în tranzacția §3.8 |
| Jurnale și sesiuni expirate: 6 luni; texte libere: 6 luni de la închidere (A05-1, A05-2, A06-1) | `purge:retention` / rotație; test obligatoriu |
| Coordonatele: ambele sau niciuna | `CHECK` |
| O notificare de un anumit tip o singură dată | `email_outbox.dedupe_key UNIQUE` |
| Cel puțin un `super_admin` activ | verificare tranzacțională în serviciul de conturi |
| Nicio dată demo în producție | verificare la pornire (§5.3) |
| Numai tranzițiile `new` → `in_analysis` → `resolved` (DN-09) | ENUM cu 3 valori + verificare în serviciu, în tranzacție (409) |
| `resolved` numai prin subcontul Primăriei (DN-09) | verificare în serviciu: `actsForCityHall` + `primaria_mode = platform` (P-9) |
| Fără transmitere către Primărie fără cererea cetățeanului (pct. 7) | niciun rând `registry_notification` dacă `city_hall_transmission_requested = false` |
| Vot respins după `end_at` (E-3) | verificare pe server + închidere automată |

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
| **Date care trebuie migrate** | **niciuna** (D10-5); nici conturi de cetățeni (nu există în versiunea actuală) |
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

## 6. Decizii

Toate deciziile folosite în acest document, cu sursa lor, sunt în `FAZA_4_REGISTRU_DECIZII.md`.

## 7. Numărul de tabele

**30 de tabele:**

| Grup | Tabele |
|---|---|
| Admin și sistem | `admin_users`, **`admin_recovery_codes`**, `sessions`, `audit_log`, `settings` |
| Cetățeni | **`citizen_accounts`**, **`citizen_login_codes`**, **`citizen_blocks`** |
| Sesizări | `report_categories`, `report_counter`, `reports`, `report_assignees`, `report_photos`, `report_responses` |
| Conținut | `announcements`, `directory_institution`, `directory_departments`, `directory_services`, `directory_links`, `quickdial_categories`, `quickdial_contacts` |
| Sondaje | `surveys`, `survey_questions`, `survey_options`, `survey_submissions`, `survey_answers` |
| E-mail și anti-abuz | `email_outbox`, `rate_limits`, `rejected_attempts`, `used_pow_challenges` |

Istoric: 27 de tabele în revizia 0; −1 (`report_contacts`) +3 (conturile cetățenilor) în revizia 2; +1 (`admin_recovery_codes`) în revizia 3 = **30**.
