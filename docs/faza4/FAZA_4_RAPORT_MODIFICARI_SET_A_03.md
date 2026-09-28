# FAZA 4 — RAPORT DE MODIFICĂRI · SETUL A-03 (REVIZIA 4)

**Proiect:** Turnu Măgurele Civic · **Data:** 28.09.2026 · **Executant:** Claude

| | |
|---|---|
| **Instrucțiune** | `istoric/Turnu_Magurele_Civic_INSTRUCTIUNI_SET_A03.md` |
| **Bază** | Revizia 3, checkpoint `3c586d0` |
| **Rezultat** | **Revizia 4** |
| **Marcaj** | **[SET-A-03]**; textul înlocuit rămâne vizibil, tăiat (~~…~~) |

> Numai documentație: fără cod, fără instalări, fără modificări ale RULES, HANDOFF sau Master Planului. **Designul rămâne neînghețat.**

---

## 1. Decizii integrate

| ID | Decizie | Unde |
|---|---|---|
| **K-A02-3** | 45 de zile de la **depunerea sesizării** | B1 §3.9, §4, §6; B2 `purge:retention`; B5 §6; B8 §1, §3, §4; B6 §6; B10 „Retenție”; `00` R-10, R-20; `DECIZII_NOI` §0.5, DN-11, §F |
| **REC-01** | 45 de zile pentru **toate datele legate de sesizare** (sesizare, fotografii, e-mailuri, alte date aferente), în limita posibilității legale și tehnice | B1 `audit_log`, `email_outbox` (`retention_anchor_at`), §3.8, §3.9; B2 `purge:*`; B5 §6; B8 §1 (rând nou); B6 §6; B10; `00` R-17 |
| **B-7** | ștergerile definitive **nu** se auditează; fără urmă în audit care să permită reconstituirea | B1 `audit_log`, §3.8 (pasul 6), §4; B2 `DELETE /admin/reports/:id`, `DELETE /citizen/reports/:tm`; B4 §5; B5 §6, §7; B8 §1; B10 „Sesizări” |
| **K-A02-4** | blocare **15 zile** (expirare automată) sau **definitivă**; retenția nu anulează blocarea definitivă; numai identificatorul minim | B1 `citizen_blocks`, §3.7, §4; B2 `/citizen/auth/start`, `/admin/citizens/:id/blocks`, `…/lift`, `DELETE /citizen/account`, §7; B3 §8; B4 §2.4; B8 §1; B7 §3; B10 „Conturi de cetățeni”; `DECIZII_NOI` D13–D18 |
| **DN-19** | imaginile comunicatelor fac parte din aplicație / repository; fără CDN sau stocare externă (decizie tehnică C) | B1 `announcements.image_url`; B2 §1 (CSP), `/admin/announcements`, §7; B10 (rând nou); `00` R-21; `DECIZII_NOI` DN-19 |
| **DN-04** | temporar deschis; lista T1–T8 **nemodificată** | numai analiza (§4); `00` §6 și corpul DN-04 sunt identice cu `3c586d0` (verificat cu `diff`) |

Consecințele tehnice sunt documentate ca **propuneri neconfirmate** T-C1…T-C9 (`DECIZII_NOI` §0.5):

| ID | Consecință |
|---|---|
| T-C1 | momentul de referință = `reports.created_at` |
| T-C2 | coloana nouă `email_outbox.retention_anchor_at` |
| T-C3 | rândurile de audit ale sesizării se șterg odată cu ea |
| T-C4 | limita backup-urilor anterioare ștergerii |
| T-C5 | 15 zile calculate de server |
| T-C6 | datele minime ale blocării definitive |
| T-C7 | recrearea contului refuzată fără enumerare |
| T-C8 | jurnalul e-mail nu este audit (**de confirmat**) |
| T-C9 | validarea imaginilor comunicatelor + CSP |

## 2. Documente și secțiuni modificate

| Document | Secțiuni |
|---|---|
| `FAZA_4_DECIZII_NOI.md` | antet; **§0.5 nou**; §0.3 (D13–D18); DN-04 (numai titlul: starea); DN-11 (titlul); DN-19 (titlul); §E.2 (trimitere); **§F nou** |
| `FAZA_4_B1_MODEL_DATE.md` | antet; §3.1 `audit_log`; §3.3 `announcements`; §3.5 `email_outbox` (`report_id`, `body_text`, **coloana `retention_anchor_at`**); §3.7 `citizen_blocks` + datele minime + ștergerea contului; §3.8 (pasul 6); §3.9; §4 (4 reguli noi); §6 |
| `FAZA_4_B2_API.md` | antet; §1 (CSP); §2 (`purge:email-bodies`, `purge:retention`); §4.1 (`/citizen/auth/start`, `DELETE /citizen/account`); §4.2 (`DELETE /citizen/reports/:tm`); §6.1 (`DELETE /admin/reports/:id`); §6.2 (comunicate); §6.5 (blocări); §7 (2 rânduri noi) |
| `FAZA_4_B3_B4_AUTENTIFICARE_AUTORIZARE.md` | antet; B3 §8 (blocarea, ștergerea contului); B4 §2.4; B4 §5 |
| `FAZA_4_B5_B8_SESIZARI_DATE_PERSONALE.md` | antet; B5 §6, §7; B8 §1 (rând nou + 7 rânduri), §3, §4 |
| `FAZA_4_B6_B7_EMAIL_ANTISPAM.md` | antet; B6 §6; B7 §3 |
| `FAZA_4_B10_TESTARE.md` | antet; §3: „Sesizări”, „Conturi de cetățeni”, „Retenție”, **rând nou** „Imaginile comunicatelor” |
| `FAZA_4_00_ARHITECTURA_SI_INDEX.md` | antet (Revizia 4); §8: R-10, R-17, R-20, **R-21 nou**; §9. **§6 nemodificat.** |
| `FAZA_4_RAPORT_MODIFICARI_SET_A_03.md` | **nou**: acest raport |
| `istoric/Turnu_Magurele_Civic_INSTRUCTIUNI_SET_A03.md` | **nou**: instrucțiunea, copiată fără modificări (trasabilitate) |
| `istoric/FAZA_4_INSTRUCTIUNE_RECONCILIERE_STARE.md` | **nou**: instrucțiunea de reconciliere din 28.09.2026, fără modificări |
| `istoric/FAZA_4_RECONCILIERE_STARE.md` | **nou**: documentul de reconciliere, sursa ID-urilor REC-01 și R-14 |

Numărul de tabele rămâne **30**. Singura schimbare de schemă este coloana `email_outbox.retention_anchor_at` (propunere tehnică T-C2).

## 3. Verificările cerute

| Verificare | Rezultat |
|---|---|
| Referințele la retenția de 45 de zile | toate aparițiile cu „momentul de referință K-A02-3 (DE DECIS)” au fost înlocuite. Rămâne o singură apariție nedecisă, **intenționat**: contul cetățeanului (REC-02). |
| Referințele la auditul ștergerilor | nicio apariție activă „B-7 (deschis)”; toate sunt tăiate și înlocuite cu decizia B |
| Referințele la blocarea cetățenilor | 15 zile / definitiv în B1, B2, B3, B4, B7, B10 și `DECIZII_NOI`; `endsAt` eliminat din cererea de blocare. `endsAt` rămâne numai în răspunsul `/citizen/me`, pentru afișarea termenului. |
| Referințele la contul cetățeanului | neschimbate, cu excepția blocării și a retenției (REC-02) |
| Referințele la imaginile comunicatelor | CSP, validare, UI, test, risc R-21 |
| Aplicația funcționează fără cont | neschimbat: A-9 în B2 §7 („restul aplicației rămâne fără cont”), B3 §8, B10 („restul aplicației funcționează fără cont”); votul fără cont (N4-2) |
| T1–T8 nemodificate | `00` §6 identic cu `3c586d0`; corpul DN-04 identic (verificat cu `diff`) |

## 4. Analiza T1–T8 (DN-04: numai investigație, **nimic modificat**)

**Ce există în surse:**
- **Planul v1.1** (în afara repository-ului, pachetul de transfer) și `istoric/FAZA_4_INSTRUCTIUNI_INCEPERE.md` spun numai că „dependențele tehnice T1–T8” se tratează în proiectare.
- **Instrucțiunea de pornire, §14 „DEPENDENȚE ȘI T1–T8”**, cere pentru fiecare dependență: rol, versiune propusă, motiv, compatibilitate, risc, alternativă.
- **Nicio sursă nu definește cele 8 elemente.**
- Singura listă numerotată T1–T8 este **gruparea propusă de Claude** în revizia 0 (`00` §6, `DECIZII_NOI` DN-04).
- **Alte apariții „T1”:**
  - în raportul Fazei 0 (R-3, „…testele scriu în `localStorage` (T1)”), nelămurită;
  - în analizele Fazei 3 (N-3, D9), unde T1…T3 sunt **etichete locale** (variante sau tensiuni numerotate în acel document), fără legătură cu o listă T1–T8.

**Corectură la clarificările mele anterioare** (`istoric/FAZA_4_CLARIFICARI_DIN_CHATUL_ANTERIOR.md` §2, E-10):
- Afirmația că interpretarea „grupe de dependențe” este „foarte probabil greșită” **nu este susținută de surse**. §14 al instrucțiunii de pornire leagă T1–T8 tocmai de analiza dependențelor.
- Originea numerotării rămâne **NECONFIRMATĂ**.

| ID | Ce este (în lista existentă) | Sursa | Impact asupra Fazei 4 | Tip | Modificat? |
|---|---|---|---|---|---|
| T1 | Runtime: Node.js 24 LTS (producție, dezvoltare), 20.20.2 (staging) | propunerea Claude (`00` §6), pe baza G3 / G5 / N-2 (RULES §11.1) și a confirmării HostGate | fixează matricea CI Node 20 + 24 și regula B-5 (retragerea staging-ului) | cerință tehnică (derivată din decizii aprobate) | **NU** |
| T2 | HTTP: `fastify` + `@fastify/cookie`, `multipart`, `helmet`, `static` | propunerea Claude; Fastify ales în N-2 / G10 | structura API (B2), CSP (DN-19), limitele de încărcare (B5) | implementare (alegerea cadrului = decizie aprobată; versiunile = implementare) | **NU** |
| T3 | Bază de date: `mysql2`, `drizzle-orm`, `drizzle-kit` | propunerea Claude; Drizzle + MySQL 8.4 / 8.0.37 din N-2 / G2 | modelul de date (B1), migrațiile (DN-20); risc: Drizzle < 1.0 (R-4) | implementare | **NU** |
| T4 | Validare: `zod` | propunerea Claude; Zod din N-2 | schemele partajate `shared/` (B2) | implementare | **NU** |
| T5 | Criptografie / autentificare: `node:crypto`, `otpauth`, `qrcode`, `ulid` | propunerea Claude; `scrypt` și TOTP din D8 / N-2; `qrcode` = DN-16 | B3 (parole, sesiuni, TOTP, recuperare 2.15), codurile cetățenilor | implementare | **NU** |
| T6 | E-mail: `nodemailer` | propunerea Claude; adaptor SMTP generic din N3-2 | B6 (coada, modurile) | implementare | **NU** |
| T7 | Fișiere / anti-abuz: cod propriu (semnături, EXIF, point-in-polygon UAT), `altcha-lib`, `pino` | propunerea Claude; N-4 (proof-of-work), D6 / 2.12 (UAT), B5 | B5, B7, 2.12; risc: cod propriu de testat (R-5) | implementare + testare | **NU** |
| T8 | Build / teste: `esbuild`, `node:test`, Playwright (existent), captare SMTP în CI | propunerea Claude; DN-23, DN-24; nota A-22 | B10 (CI, suita existentă, P7) | testare | **NU** |

**Starea DN-04:** temporar deschis. Rămâne de stabilit de către Sergiu dacă lista de mai sus este acceptată ca definiție a T1–T8 sau dacă există o listă originală cu alt conținut. Nu am presupus niciuna dintre variante.

## 5. Rămân realmente deschise

| ID | Ce |
|---|---|
| **REC-02** | retenția datelor **fără legătură cu o sesizare**: (a) momentul de start al celor 45 de zile pentru **contul cetățeanului**; (b) auditul care nu privește o sesizare; (c) jurnalele aplicației și sesiunile; (d) textele libere din sondaje; (e) blocările temporare după expirare. **Motiv:** K-A02-3 a fost decis numai pentru sesizare, iar REC-01 acoperă numai datele sesizării. Până la decizie, valorile din Revizia 3 rămân propuneri neconfirmate. |
| **DN-04** | T1–T8 (temporar deschis) |
| **DN-05** | branch-urile pentru Faza 5 |

**Informație necesară:** DN-07 (sistemul de operare).

**De confirmat la audit, nu decizii noi:**
- propunerile tehnice T-B1…T-B10 și T-C1…T-C9, în special **T-C8**;
- K-A02-1 (tratat ca rezolvat prin 2.2 în reconciliere; SET-A-03 nu îl menționează).

## 6. Observații, fără a fi contradicții care blochează

1. **D14 → K-A02-4:**
   - D14 lăsa durata la alegerea `super_admin`; K-A02-4 o fixează la 15 zile. Este o **înlocuire** printr-o decizie ulterioară explicită, consemnată ca atare (`DECIZII_NOI` §0.5).
   - Ridicarea manuală înainte de termen (2.6) nu este revocată și a rămas.
2. **Recrearea contului:**
   - Revizia 3 permitea recrearea contului sub blocare, cu blocarea păstrată.
   - K-A02-4 cere împiedicarea recreării pentru blocarea **definitivă**. Am aplicat decizia nouă; pentru blocarea temporară, comportamentul din Revizia 3 rămâne.
3. **Neconcordanțele documentare** listate în `istoric/FAZA_4_RECONCILIERE_STARE.md` §6.B au fost corectate numai acolo unde țin de retenție, blocare și audit:
   - DN-11;
   - rândurile B8.

   Celelalte (N-1…N-9, N-11…N-16) **nu** au fost atinse, pentru că nu fac parte din acest set.

---

## STATUS

**Faza 4 — Revizia 4 (SET-A-03): documentație actualizată; design neînghețat; checkpoint-ul Fazei 4 nu este atins.** Fără commit și fără push până la confirmarea proprietarului.
