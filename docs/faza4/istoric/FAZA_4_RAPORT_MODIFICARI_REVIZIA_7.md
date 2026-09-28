# FAZA 4 — RAPORT DE MODIFICĂRI · REVIZIA 7 (VERSIUNE CURATĂ)

**Proiect:** Turnu Măgurele Civic · **Data:** 28.09.2026 · **Executant:** Claude

| | |
|---|---|
| **Bază** | Revizia 6, checkpoint `988d0a1` |
| **Rezultat** | **Revizia 7**: versiunea curată, pregătită pentru auditul final |

> Numai documentație: fără cod, fără modificări ale RULES, HANDOFF, Master Planului sau `main`. **Designul rămâne neînghețat** până la audit și aprobare.

---

## 1. Deciziile directe ale proprietarului (conversația din 28.09.2026, 22:09–22:13)

Procedura: întrebare cu variante, răspuns direct al lui Sergiu, fără instrucțiune intermediară.

| ID | Întrebarea | Răspunsul | Consecința în documentație |
|---|---|---|---|
| **A06-1** | De când curg cele 6 luni pentru textele libere din sondaje? | **A: de la închiderea sondajului** | B1 §3.4, §3.9, §4; B8 §1; B10 (închide observația O-A05-1) |
| **A06-2** | E-mail de confirmare la depunerea sesizării? | **A: nu există** | B1 `email_outbox.kind`; B2 `POST /citizen/reports`; B5 §1, §5; B6 §1, §3–§5; B10 (confirmă eliminarea din Revizia 3; închide K-A02-1) |
| **A06-3** | Răspunsul Primăriei către cetățean prin aplicație? | **A: nu; numai note interne** | B1 `report_responses`; B2 `…/responses`; B4 §2.3, §3; B5 §4–§5; B6 (confirmă T-B1) |
| **A06-4** | Poate `super_admin` ridica o blocare definitivă? | **A: da, cu audit** | B1 `citizen_blocks`; B2 `…/lift`, §7; B3 §8; B4 §3, §5; B10 (confirmă T-B10) |
| **A06-5** | Serviciul de geocodare? | **A: OpenStreetMap Nominatim (public)** | `00` §5, R-19; B2 `/citizen/geocode`; B8 §1; B10 |
| **A06-6** | Ce vede cineva blocat definitiv care încearcă să-și refacă contul? | **B: același mesaj pe ecran + e-mail către titular „Această adresă nu mai poate fi folosită pentru un cont nou.”** | B1 `email_outbox.kind` (`citizen_account_blocked`); B2 `/citizen/auth/start`; B3 §8; B6 §3–§5; B7; B10 |

## 2. Versiunea curată

| Acțiune | Detalii |
|---|---|
| Versiunile adnotate (reviziile 1–6) | mutate în `istoric/revizia_6_adnotata/`, fără modificări: cele 7 documente de proiectare + `FAZA_4_DECIZII_NOI.md` |
| Rapoartele SET-A-02…SET-A-05 | mutate în `istoric/` |
| Documentele de proiectare (`00`, B1, B2, B3/B4, B5/B8, B6/B7, B10) | rescrise fără text tăiat și fără marcaje de set; resturile nealiniate au fost corectate (de exemplu „după moderare” în B10, „24 + 3”, confirmarea la depunere în B2 și B10, antetul și §10 din `00`); identificatorii ambigui „decizia 1 / 2 / 4” au fost înlocuiți cu A04-x / A05-x |
| Registrul | **`FAZA_4_REGISTRU_DECIZII.md` nou**: deciziile valabile, cu sursa fiecăreia; regulile din RULES înlocuite; propunerile tehnice de confirmat; punctele deschise |
| Lista T1–T8 | `FAZA_4_00_ARHITECTURA_SI_INDEX.md` §6 este **identic** cu versiunea anterioară (verificat cu `diff`) |
| Schema | 30 de tabele; tipul nou `citizen_account_blocked` în `email_outbox.kind` (A06-6) |

## 3. Stare

- **Decizii de produs deschise: niciuna.**
- **De confirmat la audit:** propunerile tehnice din registru, §4.
- **Problemă tehnică de implementare:** T-D1 (backup-urile), la 5.1.
- **Pașii următori:**
  1. auditul final (ChatGPT) pe versiunea curată;
  2. aprobarea checkpoint-ului;
  3. P-13;
  4. Faza 5 pe un branch nou.
