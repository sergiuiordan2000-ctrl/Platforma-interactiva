# Erata ghidului probelor manuale M1–M3 (versiunea 3)

**Se aplică la:** `docs/faza6/FAZA_6_GHID_PROBA_STAGING.md`, versiunea 3 (commit `d23ddd5`), după care s-au executat probele M1–M3 la 10–11.10.2026.
**Data:** 12.10.2026. **Sursa:** raportul probelor M1–M3 (abaterile A2, A7, A8) și analiza de după probe.
Ghidul nu se rescrie: corecțiile de mai jos se aplică dacă ghidul se refolosește.

| Nr. | Unde | Ce scrie ghidul | Corect |
|---|---|---|---|
| E1 | §2 (urmele probelor) | rămân „două intrări în lista de ștergeri” | versiunea instalată atunci (`08f4dc3`) **nu scria deloc** lista de ștergeri (constatarea R1). De la remedierea `961fc76` se scrie câte un marcaj în `deletions/` pentru fiecare sesizare ștearsă |
| E2 | §2 (urmele probelor) | lista urmelor posibile nu pomenește conturile de cetățean | o cerere de cod pentru o adresă nouă creează un cont `pending`, care rămâne (R15). La probe au rămas 2 conturi `pending`; ele nu se șterg |
| E3 | pasul 3 (autentificarea cetățeanului) | nu precizează adresa | pe staging (modul `allowlist`) **numai adresa de test** a proprietarului primește cod; o altă adresă creează un cont `pending` fără e-mail (abaterea A2) |
| E4 | S-5 (al doilea vot) | ștergerea indiciului din browser prin meniul de click dreapta | versiunea curentă de Chrome nu mai are „Delete” acolo; ștergerea se face din bara panoului (Application → Local Storage). Captura intermediară trebuie făcută înainte de al doilea vot (abaterea A7) |
| E5 | S-7 (rezultatele înainte de închidere) | „Inspectează” arată rezultatele | „Inspectează” arată structura sondajului și numărul de voturi; rezultatele sunt la butonul **„Rezultate”** (abaterea A8) |
| E6 | general | lipsesc punctele de pauză | fiecare etapă se încheie cu un punct de pauză: raport, apoi continuare numai cu aprobarea proprietarului |
| E7 | general | lipsește avertismentul despre mesajele de confirmare | mesajele de confirmare din interfață dispar în câteva secunde: captura se pregătește **înainte** de click |
