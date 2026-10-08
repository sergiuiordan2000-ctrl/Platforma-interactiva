# FAZA 5.5 — RAPORT: E-MAIL REAL

**Proiect:** Turnu Măgurele Civic („Urbis Activ”) · **Branch:** `faza-5-backend` · **Data:** 08.10.2026
**Plan:** `FAZA_5_5_PLAN.md` (5.5a: codul; 5.5b: proba reală) · **Ghid:** `FAZA_5_5B_GHID.md` · **Design (înghețat):** B6 §1–§7, B7, B3 §8; N3-2, N3-4, N3-5, A-17, G3 (condiția 5), G7; T6

## 1. Ce s-a făcut

| Parte | Conținut | Unde |
|---|---|---|
| 5.5a (01.10.2026) | transport SMTP cu TLS obligatoriu, validarea la pornire (N3-4, refuzul `electrovolt.ro`), configurație invalidă → `simulated` (B6 §2), codurile de cont trimise imediat, retenția e-mailurilor de cont, teste cu server SMTP local | `FAZA_5_5_PLAN.md` §5; `1f64082` |
| decizii | furnizor **Brevo** (N3-2, 01.10.2026); domeniul **`urbisactiv.ro`** (G7, 07.10.2026); găzduirea de pe care pleacă e-mailul: ClausWeb, cu „Remote SMTP” pe IP dedicat (G6) | `AMENDAMENT_MARIADB_SI_GAZDUIRE.md` |
| 5.5b (08.10.2026) | proba reală pe staging-ul nou (`test.urbisactiv.ro`), în `allowlist` | `STAGING_URBISACTIV_JURNAL.md` §3, intervențiile 11–16 |

Fără modificări de cod în 5.5b: proba a folosit artefactul `999a9d5`, instalat la 07.10.2026.

## 2. Proba 5.5b, pe scurt

| Pas din ghid | Rezultat |
|---|---|
| domeniul autentificat la furnizor (SPF / DKIM / DMARC) | Brevo: „Your domain has been authenticated”. DKIM prin două CNAME, codul Brevo (TXT), DMARC existent modificat (cu `rua`), SPF-ul găzduirii neatins. Verificat de Claude în DNS-ul public |
| setările SMTP în `civic.env`, `allowlist` | `civic-outbox-process` fără mesajul de trecere în `simulated` |
| cron `outbox:process` la 2 minute | adăugat |
| cod de cont primit real, pe o adresă din listă | primit în **Inbox**; autentificarea cu el a reușit |
| sesizare cu transmitere → mesaj către destinatarul de test cu fotografia → „în analiză” → notificarea autorului | **ambele mesaje primite** (cel „pentru Primărie” cu fotografia); stadiul „în analiză” vizibil în „Sesizările mele” |
| T-ISO înainte și după | **nerulat**: staging-ul nou este la alt furnizor și nu atinge `electrovolt.ro` (jurnal §1) |

Cheia SMTP și datele contului Brevo nu au trecut prin conversație și nu sunt în repository.

## 3. Neverificat

- **Proba negativă a listei:** o adresă din afara `EMAIL_ALLOWLIST` nu primește nimic. Acoperită de testele automate (`blocked`), dar nefăcută pe staging.
- **Reîncercările și starea `failed`** cu furnizorul real (acoperite numai de testele automate).
- **Linkul de dezabonare** din notificări, folosit dintr-un client real de e-mail.
- **Livrarea către alți furnizori** decât Gmail (de exemplu Yahoo, Outlook) și reputația domeniului în timp.
- **Modul `live`** și adresa reală a Primăriei: rămân pentru producție, după acordul scris al Primăriei (A17-1).
- **Verificarea telefonului în contul Brevo:** amânată; Brevo o poate cere înainte de volume mai mari.

## 4. De știut

- **Remote SMTP depinde de IP-ul dedicat** al găzduirii; fără el, conexiunile spre Brevo sunt blocate de furnizor.
- **DMARC este `p=none`** (numai raportare). Întărirea lui (`quarantine` / `reject`) este o decizie separată, după câteva săptămâni de rapoarte.
- **Pe staging, destinatarul „Primăriei” este adresa de test a proprietarului.** La trecerea în producție se schimbă din Admin, numai după A17-1.
- **Staging-ul vechi** (`civic-test.electrovolt.ro`) rămâne în `simulated`.
- Observațiile deschise ale staging-ului nou (fereastra de parolă repetată, `TRUST_PROXY`, „Force HTTPS Redirect”) nu țin de e-mail; sunt în jurnal §4.

## 5. Cerere de checkpoint

Pentru audit: (1) proba 5.5b (§2) și limitele ei (§3); (2) DMARC `p=none` pe domeniu; (3) faptul că T-ISO nu a fost rulat la 5.5b (jurnal §1).
