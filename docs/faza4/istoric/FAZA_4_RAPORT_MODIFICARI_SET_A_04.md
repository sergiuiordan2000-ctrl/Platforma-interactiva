# FAZA 4 — RAPORT DE MODIFICĂRI · SETUL A-04 (REVIZIA 5)

**Proiect:** Turnu Măgurele Civic · **Data:** 28.09.2026 · **Executant:** Claude

| | |
|---|---|
| **Instrucțiune** | `istoric/Turnu_Magurele_Civic_SET_DECIZII_INTEGRARE.md` |
| **Context** | `istoric/Turnu_Magurele_Civic_SET_A04_INSTRUCTIUNI.md`; corecția REC-02.1 din conversație, 28.09.2026 |
| **Bază** | Revizia 4, checkpoint `8d87e94` |
| **Rezultat** | **Revizia 5** |
| **Marcaj** | **[SET-A-04]**; textul înlocuit rămâne vizibil, tăiat |

> Numai documentație: fără cod, fără modificări ale RULES, HANDOFF, Master Planului sau `main`. **Designul rămâne neînghețat.**

---

## 1. Decizii integrate

| # | Decizie | Unde |
|---|---|---|
| 1 | Retenția sesizării: 45 de zile de la depunere; **eliminată** excepția de ≈ 90 de zile; backup-urile = problemă tehnică de implementare (T-D1) | B1 §3.8, §3.9; B5 §6; B8 §1; `00` R-17; `DECIZII_NOI` T-C4, §0.4 (2.5), §0.6 |
| 2 | Contul cetățeanului **nu** se șterge automat | B1 §3.7 (datele minime), §3.9, §4, §6; B2 `purge:retention`; B3 §8; B8 §1, §3, §4; B10; `00` R-10; `DECIZII_NOI` §0.6, DN-11 |
| 3 | Blocarea: 15 zile / definitiv; identificatorul minim | deja integrat în Revizia 4 (K-A02-4); confirmat în §0.6 |
| 4 | Auditul administrativ: **6 luni**, apoi ștergere automată; auditul sesizării dispare cu ea | B1 `audit_log`, §3.9, §4; B4 §5; B8 §1; B10; `DECIZII_NOI` §0.6 |
| 5 | DN-19: imaginile în repository, livrate de aplicație | confirmat în DN-19 (integrat din Revizia 4) |
| 6 | DN-04: lista T1–T8 păstrată exact | `DECIZII_NOI` DN-04 (numai titlul); **`00` §6 identic** (verificat cu `diff`) |
| 7 | DN-05: branch nou dedicat Fazei 5, din checkpoint-ul Fazei 4 | `DECIZII_NOI` DN-05 |
| 8 | DN-07: Windows 11 | `DECIZII_NOI` DN-07; `00` §4 |

**Consecințe tehnice** (propuneri neconfirmate, `DECIZII_NOI` §0.6):

| ID | Consecință |
|---|---|
| T-D1 | backup-urile |
| T-D2 | ștergerea auditului administrativ după 6 luni |
| T-D3 | `purge:retention` nu atinge conturile |
| T-D4 | numele branch-ului Fazei 5 se stabilește la pornire |
| T-D5 | Docker / nativ pe Windows 11 |

## 2. Documente modificate

| Document | Ce s-a schimbat |
|---|---|
| `FAZA_4_DECIZII_NOI.md` | antet; §0.4 (2.5); §0.5 (T-C4, T-C6); **§0.6 nou**; DN-04, DN-05, DN-07, DN-11, DN-19 (titlurile); §F.2 (trimitere); **§G nou** |
| `FAZA_4_B1_MODEL_DATE.md` | antet; `audit_log`; §3.7 (datele minime); §3.8; §3.9 (regula, tabelul: cont, backup-uri, audit, jurnale / sesiuni, texte libere); §4 (2 reguli noi); §6 |
| `FAZA_4_B2_API.md` | antet; §2 (`purge:retention`) |
| `FAZA_4_B3_B4_AUTENTIFICARE_AUTORIZARE.md` | antet; B3 §8 (ștergerea contului); B4 §5 |
| `FAZA_4_B5_B8_SESIZARI_DATE_PERSONALE.md` | antet; B5 §6; B8 §1 (7 rânduri), §3, §4 |
| `FAZA_4_B6_B7_EMAIL_ANTISPAM.md` | antet (fără modificări de fond) |
| `FAZA_4_B10_TESTARE.md` | antet; rândul „Retenție” |
| `FAZA_4_00_ARHITECTURA_SI_INDEX.md` | antet; §4 (Windows 11); §8 (R-10, R-17); §9. **§6 nemodificat.** |
| `FAZA_4_RAPORT_MODIFICARI_SET_A_04.md` | **nou**: acest raport |
| `istoric/Turnu_Magurele_Civic_SET_DECIZII_INTEGRARE.md` | **nou**: instrucțiunea, copiată fără modificări |
| `istoric/Turnu_Magurele_Civic_SET_A04_INSTRUCTIUNI.md` | **nou**: instrucțiunea de context SET-A-04, copiată fără modificări |

Numărul de tabele rămâne **30**; nicio schimbare de schemă.

## 3. Rămân deschise

Se prezintă separat, unul câte unul:

| ID | Întrebare |
|---|---|
| **REC-02 (c)** | cât se păstrează jurnalele aplicației și sesiunile expirate |
| **REC-02 (d)** | cât se păstrează textele libere din sondaje |
| **REC-02 (e)** | ce se întâmplă cu o blocare temporară după expirare sau ridicare |
| **T-C8** | rândurile deja trimise din jurnalul e-mail ale unei sesizări șterse: rămân până la termenul de 45 de zile sau se șterg odată cu sesizarea |

---

## STATUS

**Faza 4 — Revizia 5 (SET-A-04): documentație actualizată; design neînghețat; checkpoint-ul Fazei 4 nu este atins.**
