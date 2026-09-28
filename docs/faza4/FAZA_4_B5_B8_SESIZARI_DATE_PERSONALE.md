# FAZA 4 — B5 SESIZĂRI (TM-XXX, FOTOGRAFII, PublicMapReport) · B8 DATE PERSONALE NUMAI PE SERVER

**Proiect:** Turnu Măgurele Civic · **Data:** 27.09.2026 · **Stare:** proiect, neînghețat
**Bază:** RULES §6 (3B, 5C, 6.1–6.6), D6, D9, A-17, N-3, B1, B2; deciziile din `FAZA_4_REGISTRU_DECIZII.md`

> **Revizia 7, versiune curată (28.09.2026).** Conține numai regulile valabile. Istoricul reviziilor 1–6 (text tăiat, marcaje de set) este în `istoric/revizia_6_adnotata/`; sursa fiecărei decizii este în `FAZA_4_REGISTRU_DECIZII.md`. Valorile marcate „propunere” sau „propunere tehnică” se confirmă la auditul final.

---

# B5 — SESIZĂRI

## 1. Fluxul de depunere (tranzacțional)

```
0. Sesiune de cetățean cu cont `active` (A-9) → 401 altfel; nicio blocare activă (D15) → 403 altfel
1. Primire multipart → limite de mărime (B2) → anti-abuz (B7: capcană, timp minim, rate limit, Idempotency-Key)
2. Validare Zod: categorie activă; descriere 15–1000 de caractere; text de locație obligatoriu;
   locația (2.4): punct pe hartă / poziția curentă (`pin` / `gps_pin`) SAU adresă geocodată (`geocoded`,
   pin aproximativ, verificat de utilizator) SAU numai text (fără poziție: se salvează, dar nu apare pe hartă);
   coordonate ambele sau niciuna + în limitele UAT (D6-4; 2.12: în afara UAT → 422); fără câmp
   de e-mail: e-mailul este al contului (A-9); opt-in-uri booleene + `transmitToCityHall` (pct. 7);
   fără `publicationPreference` (2.8); dacă `transmitToCityHall` și contul are deja 3 transmiteri în 24 h → 429 (2.14)
3. Fotografii (fiecare): semnătură JPEG / WebP; dimensiuni ≤ 4096 px (propunere); eliminarea metadatelor EXIF / XMP;
   scriere într-un fișier TEMPORAR, cu nume aleator, în STORAGE_DIR/tmp
4. BEGIN
   SELECT last_value FROM report_counter WHERE id=1 FOR UPDATE      ← serializează numerotarea
   next = last_value + 1 ; UPDATE report_counter
   INSERT reports (reference_number = format(next), resolution_status = 'new',
                  city_hall_transmission_requested = <alegerea cetățeanului>,
                  author_account_id = <contul din sesiune>)
   INSERT report_photos (metadate)
   (fără e-mail de confirmare către cetățean, A06-2)
   INSERT email_outbox `registry_notification`: numai dacă cetățeanul a cerut transmiterea (pct. 7);
   fluxul activ → `queued`; fluxul oprit / indisponibil → `on_hold` (2.13),
   reluat automat la reactivare;
   COMMIT
5. După COMMIT: fișierele temporare se mută în STORAGE_DIR/photos/<storage_key>
   (la eroare în 4: ROLLBACK + ștergerea fișierelor temporare → numărul nu este consumat)
6. Răspuns 201 { referenceNumber, createdAt }  ← confirmarea apare numai după salvarea efectivă (6.2)
   Sesizarea este PUBLICĂ imediat (D9, A-2), dacă are coordonate valide în UAT (2.4, 2.12)
7. Declanșare neblocantă a procesării cozii (B6); eșecul e-mailului nu afectează sesizarea (N3-1)
8. La trimiterea efectivă (`registry_notification` = `sent`): `new` → `in_analysis` în aceeași tranzacție (2.1)
   + notificarea `citizen_status_update` către autor, dacă are opt-in (2.2)
```

| Garanție | Mecanism |
|---|---|
| `TM-XXX` unic și nerefolosit (3B, 6.2; D25–D26) | `FOR UPDATE` pe contor + `UNIQUE (reference_number)`; la rollback, contorul nu avansează. După ștergere, numărul rămâne rezervat: contorul nu scade și nu se recalculează. |
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
| Publicare (2.10) | fotografiile devin publice **imediat**, împreună cu sesizarea, **fără verificare prealabilă**; responsabilitatea aparține utilizatorului (politica, 2.9); `super_admin` poate șterge sesizarea abuzivă |
| Acces | public: numai fotografia principală a unei sesizări existente (D9), cu coordonate, prin `/public/photos/:photoId`. Admin: toate, prin `/admin/reports/:id/photos/:photoId`. Altfel 404. |
| E-mail către Primărie | atașamente (N3-7, A17-6), citite din stocare la trimitere; plafonul total per mesaj se stabilește cu furnizorul (5.5) |
| Backup | inclus în backup-ul propriu (B10: T-BAK-3) |

## 3. PublicMapReport (proiecția publică)

| Câmp public | Sursă | Transformare |
|---|---|---|
| `referenceNumber` | `reports.reference_number` | — |
| `categoryId`, `categoryName` | categoria | — |
| `publicDescription` | `description` | integral, **imediat** (D9, A-2) |
| `publicLocation.text` | `location_text` | integral, **imediat (A-3)**. **DN-21:** textul locației este public; poate conține strada, numărul, blocul; descrie locul problemei, **nu** identifică autorul |
| `publicLocation.lat` / `lng` | coordonate exacte | **rotunjite la 4 zecimale** (D6-3) |
| `photoUrl` | fotografia `ordinal = 1` | URL `/public/photos/:photoId` |
| `createdAt` | — | — |
| `locationApproximate` | `reports.location_approximate` | `true` pentru adresele geocodate (2.4); harta arată o zonă, nu un punct |
| `status` | `resolution_status` | `new` / `in_analysis` / `resolved` (A-7: starea este publică) |

**Nu apar niciodată:** ID-ul intern, datele de contact, asumarea, preluarea, responsabilii, răspunsurile (6.5, 6.6), contul sau e-mailul autorului (D9, D29, A-8).
**Condiția de publicare (D9, A-2):** sesizarea există (nu a fost ștearsă) **și** are coordonate, în limitele UAT. **2.4:** sesizările fără poziție validă rămân în sistem (Admin, lista proprie) și **nu** apar pe hartă până când `super_admin` le corectează poziția (2.11). Proiecția se calculează la cerere; nu se stochează. **Aceeași proiecție + `status`** este ce vede autorul în lista proprie (D28).

## 4. Stadii, asumare / preluare

| Regulă | Proiect pe server |
|---|---|
| Fără moderare | **2.3:** moderarea **nu există** (nici înainte, nici după publicare); rămâne numai axa stărilor. O sesizare iese din sistem numai prin ștergere definitivă (autor, `super_admin`) sau prin retenție (45 de zile de la depunere). |
| Răspunsuri | numai note interne (`report_responses`), fără notificare (A06-3, 2.2) |
| Stadii (DN-09, C-2): `new` (depusă) / `in_analysis` (transmisă Primăriei) / `resolved` (numai prin subcontul Primăriei, dacă Primăria participă) | tranziții permise numai `new` → `in_analysis` → `resolved` (P-4); celelalte → 409. **2.1:** automat, numai la trimiterea efectivă (`registry_notification` = `sent`), în aceeași tranzacție; cu fluxul oprit, sesizarea rămâne `new`, iar transmiterea este `on_hold` (2.13). O sesizare netransmisă nu poate deveni `resolved`. `resolved`: `actsForCityHall` + `primaria_mode = platform` (P-9). Fără cerere de transmitere, sesizarea rămâne `new` (pct. 7). Înlocuiește regula 5C „orice tranziție” și stadiul `closed`. |
| Asumarea individuală: numai `super_admin`; se retrage numai propria asumare (6.6) | `reports.resolve` + NOT `actsForCityHall`; tabelul `report_assignees` |
| Preluarea instituțională: numai `primarie_operator`; idempotentă; ireversibilă (6.6) | `reports.resolve` + `actsForCityHall`; coloanele `city_hall_taken_over*` |
| Asumarea și preluarea nu schimbă starea | **C-3** (modifică 6.6-g) |
| Preluarea are prioritate în Admin (6.6) | ordonare și afișare în răspunsul Admin |
| Fără istoric de asumări (6.6) | `report_assignees` = starea curentă. **DN-02:** asumările nu se auditează |

## 5. Relația cu e-mailul

| Eveniment | Rând în `email_outbox` | Condiții |
|---|---|---|
| Depunere | `registry_notification` | `city_hall_transmission_requested = true` (pct. 7; înlocuiește A17-3) + `registry.flow_enabled = true` + destinatar configurat + mod `live` (A17-1, A17-4). Conținut conform A17-6; **datele de contact = numai e-mailul contului** (S1-4, D29). Transmiterea **nu depinde** de `primaria_mode` / subcont (S1-6). |
| stadiu `new → in_analysis` și `in_analysis → resolved` (2.2) | `citizen_status_update` | `notify_opt_in` + e-mailul contului + neabonat (D9-2). Fără notificări la preluare, asumare sau alte acțiuni administrative (2.2). |
| Depunere | — | **fără e-mail de confirmare** către cetățean (A06-2); cetățeanul vede sesizarea în „Contul meu” |
| Notă internă | — | fără e-mail (A06-3) |

## 6. Ștergerea definitivă (A-1, D10–D12, D19–D24)

| Cine | Condiții | Efect |
|---|---|---|
| **autorul** | propria sesizare, **indiferent de stare** (`new` / `in_analysis` / `resolved`), inclusiv după transmiterea către Primărie și cu blocare activă (D15, D19–D22) | ștergere definitivă (B1 §3.8); dispare de pe hartă și din lista proprie (D20, D27) |
| **`super_admin`** | orice sesizare, necondiționat, fără motiv obligatoriu (D10–D12); drept exclusiv (A-5) | idem |
| `primarie_operator` | **nu poate șterge** (D11) | — |

- **Fără notificare** către Primărie (D23).
- **Tot jurnalul e-mail al sesizării** (netrimise și trimise) se șterge odată cu sesizarea (A05-4); nimic din coadă nu mai pleacă. E-mailul deja trimis nu se poate retrage (D21).
- Sesizarea ștearsă nu mai există: niciun endpoint Admin nu o mai găsește (404); Primăria nu o mai poate marca `rezolvată` (D24).
- **`TM-XXX` rămâne rezervat** (D25–D26).
- Ștergerea **nu se auditează** și nu lasă în audit o urmă care să permită reconstituirea sesizării (B-7).
- Regula de retenție rămâne 45 de zile de la depunere (K-A02-3, A04-1); copiile de siguranță sunt o problemă tehnică de implementare (T-D1), nu o prelungire a retenției.

## 7. Auditul pe sesizări

Vezi B4 §5 (propunere) și **DN-02** (asumările). Ștergerile: nu se auditează (B-7).

---

# B8 — DATE PERSONALE NUMAI PE SERVER

## 1. Inventar și reguli

| Dată | Unde stă | Cine vede | Public? | Către Primărie | Retenție |
|---|---|---|---|---|---|
| **E-mail** (singura dată a contului; nume și telefon nu se colectează, A-9) | `citizen_accounts.email` (A-4) | **numai `super_admin`** (A-8), numai în detaliu și în lista cetățenilor | **niciodată** | **numai dacă cetățeanul a cerut transmiterea** (pct. 7, S1-4) | contul și e-mailul lui **nu** se șterg automat (A04-2); se șterg la ștergerea contului (2.7); **fără** funcție de anonimizare (DN-12) |
| **E-mailul pentru notificări** | e-mailul contului + opt-in pe `reports` | idem | niciodată | — | idem |
| **Contul cetățeanului** (stare, date, blocări; acceptarea politicii, 2.9) | `citizen_accounts`, `citizen_blocks`, `citizen_login_codes`, `sessions` | numai `super_admin` | niciodată | — | ștergerea contului de către cetățean (2.7); **fără ștergere automată a contului** (A04-2); blocarea definitivă: numai identificatorul minim (`email_hash`), fără termen (K-A02-4); blocările expirate sau ridicate: numai în audit, 6 luni (A05-3); codurile: expirare scurtă, curățate zilnic; sesiunile expirate: 6 luni (A05-1) |
| **Sesizarea și toate datele legate de ea** | `reports`, `report_photos` + fișierele, `report_responses`, `report_assignees`, rândurile `email_outbox` legate, rândurile `audit_log` ale sesizării | — | — | — | **45 de zile de la depunere** (K-A02-3, REC-01, A04-1), indiferent de stare; excepții de fapt: e-mailul deja primit de Primărie (D21); copiile de siguranță: problemă tehnică de implementare (T-D1), fără prelungirea termenului |
| **Textul locației / adresa** | `reports.location_text` | Admin | **da, imediat** (A-3; DN-21) | da, dacă s-a cerut transmiterea | ca sesizarea |
| **Descrierea** | `reports.description` | Admin | **da, imediat** (D9) | da | ca sesizarea |
| **Fotografii** | disc + `report_photos` | Admin: toate | numai principala, **imediat** (D9; **2.10:** fără verificare, responsabilitatea utilizatorului) | da (atașamente) | ca sesizarea; EXIF eliminat |
| **Coordonate exacte** | `reports.lat` / `lng` | Admin | **rotunjite** (D6-3) | exacte (A17-6) | ca sesizarea |
| **Precizia GPS** | `reports.gps_accuracy_m` | Admin | nu | nu | ca sesizarea |
| **Date de sondaj** | `survey_submissions` / `survey_answers` | agregate | agregate, conform D3 | — | cu sondajul |
| **Răspunsuri libere** | `survey_answers.text_value` | **numai `super_admin`, după închidere** (N4-9) | **niciodată** | — | **6 luni de la închiderea sondajului**, apoi ștergere automată (A05-2, A06-1) |
| **Jeton de participare** | numai în cookie; în DB doar HMAC per sondaj | nimeni | — | — | cu votul |
| **IP** | numai HMAC cu cheie zilnică, în `rate_limits` (≤ 48 h), `rejected_attempts` (30 de zile), `sessions`, `audit_log` | `super_admin` (audit) | niciodată | — | conform tabelului |
| **Datele operatorilor** (e-mail, nume) | `admin_users` | `super_admin`; celelalte roluri văd numai numele afișate | niciodată (nici în e-mailuri, D9-7) | — | durata contului Admin (conturile Admin nu se șterg, D8-2) |
| **Audit** | `audit_log` (fără secrete, fără corpuri de e-mail) | `super_admin` | nu | — | rândurile unei sesizări: odată cu sesizarea (B-7, REC-01); celelalte: **6 luni**, apoi ștergere automată (A04-4). Ștergerile definitive nu se auditează (B-7). |
| **Adresa pentru geocodare** | trimisă serviciului public OpenStreetMap Nominatim (A06-5), prin serverul propriu (`POST`, adresa în corpul cererii, nu în URL); numai textul adresei, fără date ale contului; nu apare în jurnalele aplicației | — | — | — | nu se stochează (2.4) |
| **Corpul e-mailurilor** | `email_outbox.body_text` | `super_admin` (jurnal global, fără corp în listă) | nu | — | e-mailuri fără sesizare: **45 de zile** (N3-8); cele legate de o sesizare: odată cu sesizarea (A05-4) |
| **Jurnale de aplicație** | fișiere sau ieșirea procesului | administratorul tehnic | nu | — | **redactare automată** (pino `redact`): parole, cookie-uri, jetoane, e-mail, telefon, nume, `Authorization`; rotație: **6 luni**, apoi ștergere automată (A05-1) |
| **Backup-uri** | staging: export propriu; producție: G6 | administratorul tehnic | nu | — | rotație; fără prelungirea regulii de 45 de zile a datelor sesizărilor — problemă tehnică de implementare (T-D1); staging: numai date demo (G3); producție: criptare (G6) |

## 2. Reguli de expunere către frontend

1. Endpoint-urile **publice** nu primesc niciodată: ID-uri interne ale sesizărilor, date de contact, note, răspunsuri, responsabili, IP-uri, jetoane, contul sau e-mailul autorului. (Stadiul devine public, A-7.)
2. Listele **Admin** nu conțin contactul; acesta apare numai în detaliu (minimizare). E-mailul apare **numai** în răspunsurile pentru `super_admin` (A-8).
3. Lista proprie a cetățeanului (`/citizen/reports`) conține numai câmpurile publice + starea (D28), fără starea transmiterii, coadă sau procesare internă.
4. **Niciun** date personal nu se mai scrie în `localStorage` sau `sessionStorage`. Cheile vechi se șterg la 5.7 (D10-5).
5. Frontend-ul nu primește permisiunile altor utilizatori și nici lista completă a conturilor (numai `{ id, displayName }` pentru responsabili).
6. Mesajele de eroare nu includ date personale sau detalii interne.

## 3. Drepturile persoanei vizate (GDPR)

Nu sunt jurist; necesită verificare juridică (E-6 din checkpoint-ul Fazei 3).
- **Acces și rectificare:** prin cerere către administrator; `super_admin` poate consulta și corecta datele de contact.
- **Ștergere:** autorul își poate șterge definitiv sesizările (A-1, D19). Cetățeanul își poate șterge contul (2.7), inclusiv e-mailul; contul nu se șterge automat (A04-2). Sesizările rămân până la termenul lor (45 de zile de la depunere). Nu există o operație separată de anonimizare (DN-12).
- **Dezabonare** de la notificări: link per sesizare (D9-2).

## 4. Decizii

Toate deciziile folosite în acest document, cu sursa lor, sunt în `FAZA_4_REGISTRU_DECIZII.md`.
