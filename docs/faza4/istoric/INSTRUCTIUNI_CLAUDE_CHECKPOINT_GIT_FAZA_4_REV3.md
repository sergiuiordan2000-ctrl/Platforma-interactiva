# INSTRUCȚIUNI CLAUDE — CHECKPOINT GIT FAZA 4 / REVIZIA 3

## SCOP

Vreau să salvăm URGENT în Git starea actuală a proiectului, ca checkpoint oficial înainte de continuarea ultimelor decizii ale Fazei 4.

Starea care trebuie protejată este:

**Faza 4 — Revizia 3 — după SET-A-02 — documentație actualizată — înaintea ultimelor decizii — fără implementare backend.**

## CE TREBUIE SĂ FACI

1. Verifică starea repository-ului.
2. Confirmă că documentația Reviziei 3 și toate fișierele aferente sunt prezente și sunt exact cele rezultate după SET-A-02.
3. Verifică să NU fie incluse:
   - fișiere temporare;
   - artefacte ale mediului local;
   - `.claude/settings.local.json`;
   - modificări de cod care nu fac parte din documentația aprobată;
   - alte fișiere străine proiectului.
4. Rulează testele/documentația de verificare relevante pentru a confirma că starea este coerentă.
5. Dacă totul este corect, creează un commit Git.

## COMMIT

Folosește un mesaj clar, de exemplu:

`docs(faza-4): checkpoint revizia 3 dupa SET-A-02`

Nu modifica codul pentru a face commit-ul să treacă.

## PUSH

După commit, fă push către branch-ul pe care se află această stare și confirmă explicit:

- branch-ul;
- hash-ul commitului;
- faptul că push-ul a reușit;
- faptul că repository-ul este curat după push.

## IMPORTANT

NU începe implementarea backend-ului.

NU continua cu deciziile rămase.

NU modifica documentația pentru alte motive.

Scopul acestei operații este exclusiv să avem un punct sigur de revenire în Git.

## RAPORT FINAL

După finalizare, răspunde cu:

1. `git status` înainte de commit;
2. ce fișiere au fost incluse în commit;
3. commit hash;
4. branch;
5. rezultatul push;
6. `git status` după push;
7. orice problemă întâlnită.

Dacă găsești ceva neclar sau suspect înainte de commit, OPREȘTE-TE și raportează exact ce ai găsit. Nu ghici și nu include automat fișiere suspecte.

**Nu modifica repository-ul în alt mod decât strict pentru crearea acestui checkpoint Git.**
