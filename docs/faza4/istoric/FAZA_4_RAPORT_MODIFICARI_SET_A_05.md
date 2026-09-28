# FAZA 4 — RAPORT DE MODIFICĂRI · SETUL A-05 (REVIZIA 6)

**Proiect:** Turnu Măgurele Civic · **Data:** 28.09.2026 · **Executant:** Claude

| | |
|---|---|
| **Instrucțiune** | `istoric/Turnu_Magurele_Civic_SET-A-05_FINAL_RETENTIE.md` |
| **Bază** | Revizia 5, checkpoint `ddc9ef8` |
| **Rezultat** | **Revizia 6** |
| **Marcaj** | **[SET-A-05]**; textul înlocuit rămâne vizibil, tăiat |

> Numai documentație: fără cod, fără modificări ale RULES, HANDOFF, Master Planului sau `main`. **Designul rămâne neînghețat.**

---

## 1. Decizii integrate

| # | Decizie | Unde |
|---|---|---|
| 1 | Jurnalele aplicației și sesiunile expirate: **6 luni**, apoi ștergere automată (REC-02 (c)) | B1 §3.9, §4, §6; B2 `purge:sessions`; B8 §1 (jurnale), §4; B10 |
| 2 | Textele libere din sondaje: **6 luni**, apoi ștergere automată (REC-02 (d)) | B1 §3.9; B8 §1; B10 |
| 3 | Blocarea temporară expirată sau ridicată: informația rămâne în auditul administrativ (6 luni) (REC-02 (e)) | B1 `citizen_blocks` (§3.9); B2 `purge:retention`; B4 §5; B10 |
| 4 | Jurnalul e-mail al unei sesizări șterse: **șters odată cu sesizarea** (T-C8) | B1 `email_outbox` (`report_id` CASCADE, coloana `retention_anchor_at` eliminată), §3.8 (pasul 2), §3.9, §4; B5 §6; B6 §6; B10 |

Consecințele tehnice sunt propuneri neconfirmate (`DECIZII_NOI` §0.7):

| ID | Consecință |
|---|---|
| T-E1 | rândul blocării temporare se șterge; expirarea se auditează cu actorul `system` |
| T-E2 | cascadă + verificare în lucrătorul de trimitere |
| T-E3 | rotația jurnalelor; `purge:sessions` |

T-C2 este înlocuit de T-C8.

## 2. Documente modificate

| Document | Ce s-a schimbat |
|---|---|
| `FAZA_4_DECIZII_NOI.md` | antet; §0.5 (T-C2, T-C8); **§0.7 nou**; §G.2 (trimitere); **§H nou** |
| `FAZA_4_B1_MODEL_DATE.md` | antet; §3.5 `email_outbox` (`report_id`, `body_text`, `retention_anchor_at`); §3.8 (pasul 2 și precizările); §3.9 (regula și 4 rânduri); §4 (2 reguli noi); §6 |
| `FAZA_4_B2_API.md` | antet; §2 (`purge:sessions`, `purge:retention`) |
| `FAZA_4_B3_B4_AUTENTIFICARE_AUTORIZARE.md` | antet; B4 §5 (expirarea blocării auditată) |
| `FAZA_4_B5_B8_SESIZARI_DATE_PERSONALE.md` | antet; B5 §6; B8 §1 (texte libere, jurnale), §4 |
| `FAZA_4_B6_B7_EMAIL_ANTISPAM.md` | antet; B6 §6 (corpul, metadatele) |
| `FAZA_4_B10_TESTARE.md` | antet; rândurile „Sesizări” și „Retenție” |
| `FAZA_4_00_ARHITECTURA_SI_INDEX.md` | antet; R-10; §9 |
| `FAZA_4_RAPORT_MODIFICARI_SET_A_05.md` | **nou**: acest raport |
| `istoric/Turnu_Magurele_Civic_SET-A-05_FINAL_RETENTIE.md` | **nou**: instrucțiunea, copiată fără modificări |

Numărul de tabele rămâne **30**. Schimbări de schemă:
- `email_outbox.report_id` trece la `ON DELETE CASCADE`;
- coloana `retention_anchor_at`, propusă în Revizia 4, este eliminată.

`FAZA_4_00` §6 (T1–T8) nu a fost atins.

## 3. Stare după Revizia 6

- **Decizii de produs deschise: niciuna** dintre cele enumerate anterior.
- **De confirmat (observație, nu decizie nouă):** **O-A05-1**.
  - Decizia 2 nu precizează de la ce moment curg cele 6 luni pentru textele libere. Documentația aplică citirea literală: de la introducerea textului.
  - Pentru un sondaj deschis mai mult de 6 luni, textele ar dispărea înainte de închiderea sondajului, deci înainte ca `super_admin` să le poată citi (N4-9).
- **Rămân pentru audit:**
  - propunerile tehnice;
  - T-D1 (backup-urile, problemă tehnică de implementare);
  - K-A02-1.
- **Pașii următori:**
  1. auditul final al Fazei 4;
  2. aprobarea checkpoint-ului;
  3. P-13 (RULES, HANDOFF, Plan v1.1, Master Plan).

---

## STATUS

**Faza 4 — Revizia 6 (SET-A-05): documentație actualizată; toate deciziile de retenție închise; design neînghețat; checkpoint-ul Fazei 4 nu este atins.**
