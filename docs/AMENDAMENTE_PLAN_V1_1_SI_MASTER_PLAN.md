# Amendamente la Planul de Lucru Comun v1.1 și la Master Plan, după Faza 4

**Proiect:** Turnu Măgurele Civic · **Data:** 28.09.2026 · **Aprobare:** Sergiu (P-13, varianta A)

> Planul de Lucru Comun v1.1 și Master Planul (PDF, v1.0, 25.09.2026) **nu sunt în repository**; originalele rămân la proprietar și **nu se modifică**.
>
> Acest document consemnează ce se schimbă în ele după deciziile Fazei 4 (designul backend-ului, înghețat la 28.09.2026). Deciziile complete, cu sursa lor: `docs/faza4/FAZA_4_REGISTRU_DECIZII.md`.

---

## 1. Planul de Lucru Comun v1.1

| Pasajul din Plan | Se citește acum | Decizia |
|---|---|---|
| Faza 5, 5.2: „autentificare + sesiuni + autorizare (B3, B4)” | la fel, **plus conturile de cetățeni** (cont cu e-mail confirmat, cod pe e-mail, fără parolă), cu coduri `simulated` pe dezvoltare și staging | A-9, D29–D31 |
| Faza 5, 5.4: „sesizări (B5, B7): `TM-XXX`, fotografii, anti-spam, proiecție publică, **moderare**, asumare / preluare” | sesizări: `TM-XXX`, fotografii, anti-spam, proiecție publică, **publicare imediată, fără moderare**, asumare / preluare, **ștergere definitivă (autor / `super_admin`)**, locație prin pin sau adresă geocodată, retenția de 45 de zile; depinde de conturile de cetățeni (5.2) și de coada de e-mail simulată | 2.3, A-1, 2.4, K-A02-3 |
| Faza 5, 5.5: „e-mail real + jurnal (B6)” | la fel; notificările către cetățean numai la cele două schimbări de stare; fără confirmare la depunere | 2.2, A06-2 |
| Faza 6, fluxul critic: „Cetățean → DB → E-mail → Admin → **Moderare** → Hartă” | **Cetățean (cont) → DB → Hartă (imediat) → E-mail către Primărie (numai la cerere) → `în analiză` → `rezolvată` (subcontul Primăriei)** | A-2, pct. 7, 2.1, DN-09 |
| Faza 4: „branch-uri” | Faza 5 se lucrează pe un **branch nou, dedicat**, creat din checkpoint-ul Fazei 4 | A04-7 |
| Faza 4: „dependențele tehnice T1–T8” | lista T1–T8 din `docs/faza4/FAZA_4_00_ARHITECTURA_SI_INDEX.md` §6, păstrată exact | A04-6 |

## 2. Master Planul (v1.0)

| Pasajul din Master Plan | Se citește acum | Decizia |
|---|---|---|
| Harta: „Sesizările nu sunt publicate automat pe hartă. Ele pot trece printr-o moderare simplă înainte de afișarea publică.” | Sesizările sunt publicate **imediat** pe hartă, **fără moderare**; ies din sistem numai prin ștergere (autor, `super_admin`) sau după 45 de zile de la depunere. | D9, A-2, 2.3, A-1, K-A02-3 |
| Fluxul sesizării: „Cetățean → formular → salvare în aplicație → e-mail automat către Primărie” | Cetățean (**cont cu e-mail confirmat**) → formular → salvare → hartă; e-mailul către Primărie **numai dacă cetățeanul îl cere**; Primăria primește numai e-mailul contului. | A-9, pct. 7, DN-12 |
| Testul complet (5F): „Cetățean → Sesizare → DB → E-mail Primărie → Admin → Moderare → Hartă” | vezi fluxul critic din §1 (fără pasul „Moderare”). | A-2 |
| Conturile: „Primăria poate primi conturi cu permisiuni limitate.” | rămâne; în plus, **cetățenii au cont (numai e-mail)**, cerut numai pentru depunerea sesizărilor. Aplicația rămâne complet utilizabilă fără cont. | A-4, A-9 |
| Harta (3D): „poziționarea manuală; localizarea GPS, dacă este disponibilă” | la fel, **plus adresa (stradă + număr) geocodată** prin OpenStreetMap Nominatim, cu pin aproximativ; numai în UAT Turnu Măgurele. | 2.4, A06-5, 2.12 |
| Votul multiplu (4E): mecanisme client-side (`localStorage`) | jeton anonim emis de server, unicitate în DB (deja aprobat în Faza 3). | N4-3 |
| E-mailul (5E): „transmiterea sesizării; … jurnal minimal al transmiterii” | la fel; jurnalul e-mail al unei sesizări se șterge odată cu sesizarea. | A05-4 |

## 3. Ce nu se schimbă

- Scopul platformei: **independentă**, neoficială, neoperată de Primărie.
- Ordinea fazelor din Planul v1.1: Faza 5 (5.1–5.7), Faza 6, apoi Etapa 7A–7F.
- Regulile de lucru: `main` neatins, commit / push numai la cererea proprietarului, P7 numai cu aprobare, `electrovolt.ro` neatins.
