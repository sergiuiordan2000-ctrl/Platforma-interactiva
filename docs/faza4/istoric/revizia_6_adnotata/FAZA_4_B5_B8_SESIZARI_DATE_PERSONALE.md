# FAZA 4 — B5 SESIZĂRI (TM-XXX, FOTOGRAFII, PublicMapReport) · B8 DATE PERSONALE NUMAI PE SERVER

**Proiect:** Turnu Măgurele Civic · **Data:** 27.09.2026 · **Stare:** proiect, neînghețat
**Bază:** RULES §6 (3B, 5C, 6.1–6.6), D6, D9, A-17, N-3, B1, B2
**Revizia 1 (SET-01, 27.09.2026):** modificările sunt marcate **[SET-01]** (vezi `FAZA_4_DECIZII_NOI.md` §0 și §C).
**Revizia 2 (SET-A-01, 27.09.2026):** D8–D31 și A-1…A-9; modificările sunt marcate **[SET-A-01]** (§0.3, §D). Ștergerea definitivă: §6 (nou).
**Revizia 3 (SET-A-02, 27.09.2026):** 2.1–2.15 + corecturile 1–13; marcaj **[SET-A-02]** (`FAZA_4_DECIZII_NOI.md` §0.4).
**Revizia 4 (SET-A-03, 28.09.2026):** K-A02-3, REC-01, B-7, K-A02-4; marcaj **[SET-A-03]** (`FAZA_4_DECIZII_NOI.md` §0.5).
**Revizia 5 (SET-A-04, 28.09.2026):** retenția fără ≈ 90 de zile; contul fără ștergere automată; auditul administrativ 6 luni; marcaj **[SET-A-04]** (`FAZA_4_DECIZII_NOI.md` §0.6).
**Revizia 6 (SET-A-05, 28.09.2026):** jurnalul e-mail șters cu sesizarea; jurnale, sesiuni, texte libere 6 luni; marcaj **[SET-A-05]** (`FAZA_4_DECIZII_NOI.md` §0.7).

---

# B5 — SESIZĂRI

## 1. Fluxul de depunere (tranzacțional)

```
0. [SET-A-01] Sesiune de cetățean cu cont `active` (A-9) → 401 altfel; nicio blocare activă (D15) → 403 altfel
1. Primire multipart → limite de mărime (B2) → anti-abuz (B7: capcană, timp minim, rate limit, Idempotency-Key)
2. Validare Zod: categorie activă; descriere 15–1000 de caractere; text de locație obligatoriu;
   [SET-A-02] locația (2.4): punct pe hartă / poziția curentă (`pin` / `gps_pin`) SAU adresă geocodată (`geocoded`,
   pin aproximativ, verificat de utilizator) SAU numai text (fără poziție: se salvează, dar nu apare pe hartă);
   coordonate ambele sau niciuna + în limitele UAT (D6-4; [SET-A-02] 2.12: în afara UAT → 422); ~~e-mail valid ([SET-01] C-1…; P-6)~~ [SET-A-01] fără câmp
   de e-mail: e-mailul este al contului (A-9); opt-in-uri booleene + [SET-01] `transmitToCityHall` (pct. 7);
   [SET-A-02] fără `publicationPreference` (2.8); dacă `transmitToCityHall` și contul are deja 3 transmiteri în 24 h → 429 (2.14)
3. Fotografii (fiecare): semnătură JPEG / WebP; dimensiuni ≤ 4096 px (propunere); eliminarea metadatelor EXIF / XMP;
   scriere într-un fișier TEMPORAR, cu nume aleator, în STORAGE_DIR/tmp
4. BEGIN
   SELECT last_value FROM report_counter WHERE id=1 FOR UPDATE      ← serializează numerotarea
   next = last_value + 1 ; UPDATE report_counter
   INSERT reports (reference_number = format(next), resolution_status = 'new',
                   city_hall_transmission_requested = <alegerea cetățeanului>,  ← [SET-01]
                   author_account_id = <contul din sesiune>)                    ← [SET-A-01]
   ~~INSERT report_contacts~~                                                   ← [SET-A-01] eliminat
   INSERT report_photos (metadate)
   ~~INSERT email_outbox: confirmarea către cetățean~~   ← [SET-A-02] eliminat (2.2; vezi K-A02-1)
   INSERT email_outbox `registry_notification`: numai dacă cetățeanul a cerut transmiterea (pct. 7);
                        [SET-A-02] fluxul activ → `queued`; fluxul oprit / indisponibil → `on_hold` (2.13),
                        reluat automat la reactivare; ~~altfel niciun rând (DN-10)~~
   COMMIT
5. După COMMIT: fișierele temporare se mută în STORAGE_DIR/photos/<storage_key>
   (la eroare în 4: ROLLBACK + ștergerea fișierelor temporare → numărul nu este consumat)
6. Răspuns 201 { referenceNumber, createdAt }  ← confirmarea apare numai după salvarea efectivă (6.2)
   [SET-A-01] Sesizarea este PUBLICĂ imediat (D9, A-2), dacă are coordonate valide în UAT ([SET-A-02] 2.4, 2.12)
8. [SET-A-02] La trimiterea efectivă (`registry_notification` = `sent`): `new` → `in_analysis` în aceeași tranzacție (2.1)
   + notificarea `citizen_status_update` către autor, dacă are opt-in (2.2)
7. Declanșare neblocantă a procesării cozii (B6); eșecul e-mailului nu afectează sesizarea (N3-1)
```

| Garanție | Mecanism |
|---|---|
| `TM-XXX` unic și nerefolosit (3B, ~~6.1,~~ 6.2; **[SET-A-01]** D25–D26) | `FOR UPDATE` pe contor + `UNIQUE (reference_number)`; la rollback, contorul nu avansează. **[SET-A-01]** După ștergere, numărul rămâne rezervat: contorul nu scade și nu se recalculează. |
| Concurență | tranzacțiile concurente se serializează pe rândul contorului (cost neglijabil la volumul unui municipiu); **test concurent obligatoriu** (B10) |
| Retrimiterea aceluiași formular | `Idempotency-Key` UNIQUE → aceeași cheie întoarce 201 cu același `referenceNumber`, fără o sesizare nouă |
| Fișiere orfane | curățarea periodică a `STORAGE_DIR/tmp` (fișiere > 1 h) |
| Formatul numărului | `TM-` + minimum 3 cifre (`TM-001` … `TM-999`, apoi `TM-1000`), ca în regula actuală |

## 2. Fotografiile

| Aspect | Proiect |
|---|---|
| Acceptate | numai `image/jpeg` și `image/webp` (compresia din browser produce doar aceste formate); tipul se verifică prin **semnătura binară**, nu prin extensie sau antet |
| Validare | **fără dependență externă**: semnăturile JPEG / WebP sunt verificate în cod propriu (vezi dependențe: `file-type` actual cere Node ≥ 22, incompatibil cu B-1) |
| Metadate | eliminarea segmentelor EXIF / XMP (JPEG APP1; WebP `EXIF` / `XMP `) printr-un filtru propriu, fără re-encodare (fără `sharp`, B-3). Imaginile produse de compresia din browser nu au EXIF; filtrul este apărare în profunzime (T-UPL-3). |
| Limite (**propunere**) | ≤ 4 fotografii; ≤ 3 MB fiecare; ≤ 4096 × 4096 px |
| Stocare | disc, în afara oricărui docroot (`STORAGE_DIR`); nume aleator; fără numele original (6.5 P4). Stratul de stocare este interschimbabil (disc / S3-compatibil) pentru producție (G6). |
| **[SET-A-02]** Publicare (2.10) | fotografiile devin publice **imediat**, împreună cu sesizarea, **fără verificare prealabilă**; responsabilitatea aparține utilizatorului (politica, 2.9); `super_admin` poate șterge sesizarea abuzivă |
| Acces | public: numai fotografia principală a unei sesizări ~~`approved`~~ **[SET-A-01]** existente (D9), cu coordonate, prin `/public/photos/:photoId`. Admin: toate, prin `/admin/reports/:id/photos/:photoId`. Altfel 404. |
| E-mail către Primărie | atașamente (N3-7, A17-6), citite din stocare la trimitere; plafonul total per mesaj se stabilește cu furnizorul (5.5) |
| Backup | inclus în backup-ul propriu (B10: T-BAK-3) |

## 3. PublicMapReport (proiecția publică)

| Câmp public | Sursă | Transformare |
|---|---|---|
| `referenceNumber` | `reports.reference_number` | — |
| `categoryId`, `categoryName` | categoria | — |
| `publicDescription` | `description` | integral, ~~**după moderare** (6.6; DN-21)~~ **[SET-A-01] imediat** (D9, A-2) |
| `publicLocation.text` | `location_text` | integral, ~~după moderare~~ **[SET-A-01] imediat (A-3)**. **[SET-01] DN-21 aprobat:** textul locației este public; poate conține strada, numărul, blocul; descrie locul problemei, **nu** identifică autorul |
| `publicLocation.lat` / `lng` | coordonate exacte | **rotunjite la 4 zecimale** (D6-3) |
| `photoUrl` | fotografia `ordinal = 1` | URL `/public/photos/:photoId` |
| `createdAt` | — | — |
| ~~`isAnonymous`~~ | — | **[SET-A-02] eliminat (2.8)** |
| **[SET-A-02]** `locationApproximate` | `reports.location_approximate` | `true` pentru adresele geocodate (2.4); harta arată o zonă, nu un punct |
| **[SET-A-01]** `status` | `resolution_status` | `new` / `in_analysis` / `resolved` (A-7: starea este publică) |

**Nu apar niciodată:** ID-ul intern, datele de contact, ~~stadiul,~~ ~~moderarea,~~ (**[SET-A-02]** nu mai există), asumarea, preluarea, responsabilii, răspunsurile (6.5, 6.6), **[SET-A-01]** contul sau e-mailul autorului (D9, D29, A-8).
**Condiția de publicare:** ~~`moderation_status = approved` **și**~~ **[SET-A-01] (D9, A-2):** sesizarea există (nu a fost ștearsă) **și** are coordonate, în limitele UAT. ~~Sesizările fără coordonate: B-4 (deschis).~~ **[SET-A-02] 2.4:** sesizările fără poziție validă rămân în sistem (Admin, lista proprie) și **nu** apar pe hartă până când `super_admin` le corectează poziția (2.11). Proiecția se calculează la cerere; nu se stochează. **Aceeași proiecție + `status`** este ce vede autorul în lista proprie (D28).

## 4. Moderare, stadii, asumare / preluare

| Regulă | Proiect pe server |
|---|---|
| ~~Moderarea și soluționarea sunt axe independente (5C)~~ | **[SET-A-02] 2.3:** moderarea **nu există** (nici înainte, nici după publicare); rămâne numai axa stărilor. O sesizare iese din sistem numai prin ștergere definitivă (autor, `super_admin`) sau prin retenție (2.5). |
| **[SET-A-02]** Răspunsuri | numai note interne (`report_responses`), fără notificare (2.2) |
| **[SET-01]** Stadii (DN-09, C-2): `new` (depusă) / `in_analysis` (transmisă Primăriei) / `resolved` (numai prin subcontul Primăriei, dacă Primăria participă) | tranziții permise numai `new` → `in_analysis` → `resolved` (P-4); celelalte → 409. ~~Mecanismul: nedecis (P-1).~~ **[SET-A-02] 2.1:** automat, numai la trimiterea efectivă (`registry_notification` = `sent`), în aceeași tranzacție; cu fluxul oprit, sesizarea rămâne `new`, iar transmiterea este `on_hold` (2.13). O sesizare netransmisă nu poate deveni `resolved`. `resolved`: `actsForCityHall` + `primaria_mode = platform` (P-9). Fără cerere de transmitere, sesizarea rămâne `new` (pct. 7). **Înlocuiește** regula 5C „orice tranziție” și stadiul `closed`. |
| Asumarea individuală: numai `super_admin`; se retrage numai propria asumare (6.6) | `reports.resolve` + NOT `actsForCityHall`; tabelul `report_assignees` |
| Preluarea instituțională: numai `primarie_operator`; idempotentă; ireversibilă (6.6) | `reports.resolve` + `actsForCityHall`; coloanele `city_hall_taken_over*` |
| ~~Asumarea sau preluarea unei sesizări `new` o trece în `in_progress` (6.6)~~ | **[SET-01] C-3:** asumarea și preluarea **nu** mai schimbă starea (6.6-g modificat explicit) |
| Preluarea are prioritate în Admin (6.6) | ordonare și afișare în răspunsul Admin |
| Fără istoric de asumări (6.6) | `report_assignees` = starea curentă. **[SET-01] DN-02 aprobat:** asumările nu se auditează |
| ~~Sesizările nu se șterg (6.1)~~ | ~~nu există operație de ștergere~~ **[SET-A-01] abrogat (A-1):** vezi §6 |

## 5. Relația cu e-mailul

| Eveniment | Rând în `email_outbox` | Condiții |
|---|---|---|
| ~~Depunere~~ | ~~`citizen_confirmation`~~ **[SET-A-02] eliminat (2.2, K-A02-1)** | ~~e-mail completat~~ **[SET-A-01]** la e-mailul contului (confirmarea nu cere opt-in). Fără descrierea liberă (N3-6). |
| Depunere | `registry_notification` | **[SET-01]** `city_hall_transmission_requested = true` (pct. 7; înlocuiește A17-3) + `registry.flow_enabled = true` + destinatar configurat + mod `live` (A17-1, A17-4). Conținut conform A17-6; **datele de contact = numai e-mailul** (S1-4, C-1; P-7). Transmiterea **nu depinde** de `primaria_mode` / subcont (S1-6). |
| ~~Preluare,~~ stadiu **[SET-A-02]** `new → in_analysis` și `in_analysis → resolved` (2.2) | `citizen_status_update` | `notify_opt_in` + e-mailul contului + neabonat (D9-2). **[SET-A-02]** Fără notificări la preluare, asumare sau alte acțiuni administrative (2.2). |
| ~~Răspuns `citizen_reply`~~ | ~~`citizen_reply`~~ **[SET-A-02] eliminat (2.2)** | aceleași condiții; textul răspunsului, fără numele operatorului (D9-7) |

## 6. [SET-A-01] Ștergerea definitivă (A-1, D10–D12, D19–D24)

| Cine | Condiții | Efect |
|---|---|---|
| **autorul** | propria sesizare, **indiferent de stare** (`new` / `in_analysis` / `resolved`), inclusiv după transmiterea către Primărie și cu blocare activă (D15, D19–D22) | ștergere definitivă (B1 §3.8); dispare de pe hartă și din lista proprie (D20, D27) |
| **`super_admin`** | orice sesizare, necondiționat, fără motiv obligatoriu (D10–D12); drept exclusiv (A-5) | idem |
| `primarie_operator` | **nu poate șterge** (D11) | — |

- **Fără notificare** către Primărie (D23).
- ~~E-mailurile netrimise ale sesizării se anulează (`cancelled`), inclusiv notificarea către Primărie aflată în coadă.~~ **[SET-A-05]** **Tot jurnalul e-mail al sesizării** (netrimise și trimise) se șterge odată cu sesizarea (T-C8); nimic din coadă nu mai pleacă. E-mailul deja trimis nu se poate retrage (D21). ~~Anularea este o consecință tehnică din D20 / D24 (T-A4).~~
- Sesizarea ștearsă nu mai există: niciun endpoint Admin nu o mai găsește (404); Primăria nu o mai poate marca `rezolvată` (D24).
- **`TM-XXX` rămâne rezervat** (D25–D26).
- ~~**Deschise:** email_outbox și backup-uri (B-5)~~ **[SET-A-02] 2.5:** rândurile deja trimise și backup-urile expiră în cel mult **45 de zile**. ~~**Rămâne deschis:** auditul ștergerii (**B-7**).~~ **[SET-A-03]** Ștergerea **nu se auditează** și nu lasă în audit o urmă care să permită reconstituirea sesizării (B-7). Termenul de 45 de zile curge de la depunere (K-A02-3). ~~O copie de siguranță realizată înainte de ștergere rămâne până la rotația ei: limita tehnică din REC-01 (T-C4).~~ **[SET-A-04]** Regula rămâne 45 de zile de la depunere; copiile de siguranță = problemă tehnică de implementare (T-D1), nu o prelungire a retenției.

## 7. Auditul pe sesizări

Vezi B4 §5 (propunere) și **DN-02** (asumările). **[SET-A-01]** Ștergerile: ~~B-7~~ **[SET-A-03]** nu se auditează (B-7).

---

# B8 — DATE PERSONALE NUMAI PE SERVER

## 1. Inventar și reguli

| Dată | Unde stă | Cine vede | Public? | Către Primărie | Retenție |
|---|---|---|---|---|---|
| **[SET-01] E-mail** (singura dată de contact, C-1; numele și telefonul nu se mai colectează) | ~~`report_contacts` (tabel separat)~~ **[SET-A-01]** `citizen_accounts.email` (A-4) | ~~Admin: ambele roluri, numai în detaliu (6.6)~~ **[SET-A-01] numai `super_admin`** (A-8), numai în detaliu și în lista cetățenilor | **niciodată** | **numai dacă cetățeanul a cerut transmiterea** (pct. 7, S1-4) | ~~DN-11~~ **[SET-A-02] 45 de zile** (2.5, K-A02-3); ~~**[SET-A-03]** momentul de start pentru cont: **REC-02 (deschis)**;~~ **[SET-A-04]** contul și e-mailul lui **nu** se șterg automat (decizia 2); **fără** funcție de anonimizare (DN-12); șters la ștergerea contului (2.7) |
| **E-mailul pentru notificări** | ~~`report_contacts.email`~~ **[SET-A-01]** e-mailul contului + opt-in pe `reports` | idem | niciodată | — | idem |
| **[SET-A-01] Contul cetățeanului** (stare, date, blocări; **[SET-A-02]** acceptarea politicii, 2.9) | `citizen_accounts`, `citizen_blocks`, `citizen_login_codes`, `sessions` | numai `super_admin` | niciodată | — | **[SET-A-02]** ștergerea contului de către cetățean (2.7); retenție **45 de zile** (2.5; ~~**[SET-A-03]** start pentru cont: REC-02~~; **[SET-A-04]** **fără ștergere automată a contului**, decizia 2); blocările păstrează numai `email_hash` (2.6; **[SET-A-03]** blocarea definitivă: numai identificatorul minim, fără termen, K-A02-4); codurile: expirare scurtă, curățate zilnic |
| **[SET-A-03]** **Sesizarea și toate datele legate de ea** | `reports`, `report_photos` + fișierele, `report_responses`, `report_assignees`, rândurile `email_outbox` legate, rândurile `audit_log` ale sesizării | — | — | — | **45 de zile de la depunere** (K-A02-3, REC-01), indiferent de stare; limite: e-mailul deja primit de Primărie (D21) și ~~copiile de siguranță anterioare (T-C4)~~ **[SET-A-04]** copiile de siguranță: problemă tehnică de implementare (T-D1), fără prelungirea termenului |
| **Textul locației / adresa** | `reports.location_text` | Admin | **da,** ~~după moderare~~ **[SET-A-01] imediat** (A-3; **[SET-01] DN-21 aprobat**) | da, dacă s-a cerut transmiterea | ca sesizarea |
| **Descrierea** | `reports.description` | Admin | **da,** ~~după moderare~~ **[SET-A-01] imediat** (D9) | da | ca sesizarea |
| **Fotografii** | disc + `report_photos` | Admin: toate | numai principala, ~~după aprobare~~ **[SET-A-01] imediat** (D9; **[SET-A-02] 2.10:** fără verificare, responsabilitatea utilizatorului) | da (atașamente) | ca sesizarea; EXIF eliminat |
| **Coordonate exacte** | `reports.lat` / `lng` | Admin | **rotunjite** (D6-3) | exacte (A17-6) | ca sesizarea |
| **Precizia GPS** | `reports.gps_accuracy_m` | Admin | nu | nu | ca sesizarea |
| **Date de sondaj** | `survey_submissions` / `survey_answers` | agregate | agregate, conform D3 | — | cu sondajul |
| **Răspunsuri libere** | `survey_answers.text_value` | **numai `super_admin`, după închidere** (N4-9) | **niciodată** | — | ~~DN-11~~ **[SET-A-02] 45 de zile după închiderea sondajului** (2.5). ~~**[SET-A-03]** Neacoperit de REC-01: propunere neconfirmată (REC-02); **[SET-A-04]** încă nedecis~~ **[SET-A-05]** **6 luni**, apoi ștergere automată (momentul de start: vezi O-A05-1) |
| **Jeton de participare** | numai în cookie; în DB doar HMAC per sondaj | nimeni | — | — | cu votul |
| **IP** | numai HMAC cu cheie zilnică, în `rate_limits` (≤ 48 h), `rejected_attempts` (30 de zile), `sessions`, `audit_log` | `super_admin` (audit) | niciodată | — | conform tabelului |
| **Datele operatorilor** (e-mail, nume) | `admin_users` | `super_admin`; celelalte roluri văd numai numele afișate | niciodată (nici în e-mailuri, D9-7) | — | durata contului Admin (conturile Admin nu se șterg, D8-2) |
| **Audit** | `audit_log` (fără secrete, fără corpuri de e-mail) | `super_admin` | nu | — | ~~DN-11~~ ~~**[SET-A-02] 45 de zile** (2.5)~~ **[SET-A-03]** rândurile unei sesizări: odată cu sesizarea (B-7, REC-01); celelalte: ~~REC-02 (Revizia 3: 45 de zile, neconfirmat)~~ **[SET-A-04]** **6 luni**, apoi ștergere automată (decizia 4). Ștergerile definitive nu se auditează (B-7). |
| **[SET-A-02] Adresa pentru geocodare** | trimisă serviciului de geocodare configurat (numai textul adresei, fără date ale contului) | — | — | — | nu se stochează (2.4) |
| **Corpul e-mailurilor** | `email_outbox.body_text` | `super_admin` (jurnal global, fără corp în listă) | nu | — | **45 de zile** (N3-8); **[SET-A-03]** pentru un e-mail legat de o sesizare: cel târziu la 45 de zile de la depunerea ei (REC-01) |
| **Jurnale de aplicație** | fișiere sau ieșirea procesului | administratorul tehnic | nu | — | **redactare automată** (pino `redact`): parole, cookie-uri, jetoane, e-mail, telefon, nume, `Authorization`; rotație (propunere 14 zile). ~~**[SET-A-03]** REC-02; **[SET-A-04]** încă nedecis~~ **[SET-A-05]** **6 luni** (în locul propunerii de 14 zile), apoi ștergere automată |
| **Backup-uri** | staging: export propriu; producție: G6 | administratorul tehnic | nu | — | **[SET-A-02] rotație 45 de zile** (2.5); ~~**[SET-A-03]** limita tehnică din REC-01 (T-C4)~~ **[SET-A-04]** fără prelungirea regulii de 45 de zile; problemă tehnică de implementare (T-D1) | staging: numai date demo (G3); producție: criptare + retenție de decis la G6 |

## 2. Reguli de expunere către frontend

1. Endpoint-urile **publice** nu primesc niciodată: ID-uri interne ale sesizărilor, date de contact, ~~stadii,~~ note, răspunsuri, responsabili, IP-uri, jetoane, **[SET-A-01]** contul sau e-mailul autorului. (**[SET-A-01]** Stadiul devine public, A-7.)
2. Listele **Admin** nu conțin contactul; acesta apare numai în detaliu (minimizare). **[SET-A-01]** E-mailul apare **numai** în răspunsurile pentru `super_admin` (A-8).
6. **[SET-A-01]** Lista proprie a cetățeanului (`/citizen/reports`) conține numai câmpurile publice + starea (D28), fără starea transmiterii, coadă sau procesare internă.
3. **Niciun** date personal nu se mai scrie în `localStorage` sau `sessionStorage`. Cheile vechi se șterg la 5.7 (D10-5).
4. Frontend-ul nu primește permisiunile altor utilizatori și nici lista completă a conturilor (numai `{ id, displayName }` pentru responsabili).
5. Mesajele de eroare nu includ date personale sau detalii interne.

## 3. Drepturile persoanei vizate (GDPR)

Nu sunt jurist; necesită verificare juridică (E-6 din checkpoint-ul Fazei 3).
- **Acces și rectificare:** prin cerere către administrator; `super_admin` poate consulta și corecta datele de contact.
- **Ștergere:** ~~sesizarea în sine **nu se șterge** (6.1).~~ **[SET-A-01]** autorul își poate șterge definitiv sesizările (A-1, D19). ~~Ștergerea contului: B-9 (deschis).~~ **[SET-A-02]** cetățeanul își poate șterge contul (2.7); sesizările rămân conform retenției (2.5). **[SET-01]** Nu există o operație de anonimizare (DN-12). Tratamentul e-mailului la expirarea retenției și la cererea persoanei rămâne **deschis** (DN-11 + verificarea juridică E-6). ~~**[SET-A-03]** Retenția contului, inclusiv a e-mailului: **REC-02**.~~ **[SET-A-04]** Contul, inclusiv e-mailul, nu se șterge automat; se șterge la cererea cetățeanului (2.7). Datele unei sesizări: 45 de zile de la depunere (K-A02-3, REC-01).
- **Dezabonare** de la notificări: link per sesizare (D9-2).

## 4. Decizii noi din B5 / B8

- **DN-02:** asumările în audit (**[SET-01] aprobat**);
- **DN-09:** stările și tranzițiile (**[SET-01] aprobat**; **[SET-A-02]** P-1 decis prin 2.1);
- **DN-10:** coada Primăriei când fluxul este oprit: **[SET-A-02] decis (2.13)**, `on_hold` + reluare automată;
- **DN-11:** retenția: **[SET-A-02] decis (2.5)**, 45 de zile; ~~momentul de referință: K-A02-3;~~ **[SET-A-03]** de la depunere, pentru toate datele sesizării (K-A02-3, REC-01); ~~contul și datele fără sesizare: REC-02;~~ **[SET-A-04]** contul fără ștergere automată; auditul administrativ 6 luni; ~~restul: REC-02;~~ **[SET-A-05]** jurnale, sesiuni expirate, texte libere: 6 luni; blocarea temporară expirată: în audit (6 luni); jurnalul e-mail: odată cu sesizarea;
- **DN-12:** datele de contact (**[SET-01] aprobat**; **[SET-A-01/02]** P-6 și P-7 închise);
- **DN-21:** textul locației public (**[SET-01] aprobat**; P-8).
