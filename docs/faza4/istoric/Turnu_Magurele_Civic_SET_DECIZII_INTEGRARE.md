# Turnu Măgurele Civic — SET DECIZII PENTRU INTEGRARE

## Scop

Acest document transmite lui Claude deciziile stabilite după Revizia 4.

**Nu reinterpreta deciziile. Nu redeschide punctele închise. Nu modifica repository-ul în afara instrucțiunilor de mai jos.**

Integrează toate deciziile de mai jos în documentația Fazei 4, păstrează trasabilitatea și marchează modificările cu `[SET-A-04]` (sau următorul identificator de set dacă numerotarea internă impune asta).

La final, pregătește modificările pentru verificare și commit/push numai conform instrucțiunilor Git de mai jos.

---

## 1. Retenția sesizărilor

- Datele aferente unei sesizări se păstrează **45 de zile de la depunerea sesizării**.
- Elimină orice formulare care introduce o retenție de aproximativ 90 de zile ca regulă de produs.
- Backup-urile sunt o problemă tehnică de implementare și nu modifică regula de produs de 45 de zile.

## 2. Contul cetățeanului

- **Contul cetățeanului NU se șterge automat după 45 de zile.**
- Cele 45 de zile se referă la datele aferente sesizării, nu la existența contului.
- Nu introduce o regulă de ștergere automată a contului după ultima activitate, creare sau ultima sesizare.

## 3. Blocarea cetățeanului

- Blocarea este decisă de `super_admin`.
- Durata posibilă este:
  - **15 zile**, cu expirare automată;
  - **definitivă**.
- În cazul blocării definitive se păstrează identificatorul minim necesar pentru a împiedica recrearea contului cu același e-mail.
- Nu elimina această informație doar pentru că datele obișnuite ale sesizării au termen de 45 de zile.

## 4. Audit administrativ

Pentru jurnalul de audit al operațiilor administrative care NU țin de o sesizare:

- retenția este de **6 luni**;
- după 6 luni, intrările sunt șterse automat.

Se păstrează separat distincția față de auditul aferent unei sesizări.

Pentru auditul aferent unei sesizări rămâne regula deja decisă: acesta dispare odată cu sesizarea, iar ștergerea sesizării nu generează un eveniment de audit.

## 5. Imaginile comunicatelor — DN-19

În producție:

- imaginile comunicatelor sunt păstrate în **repository**;
- sunt livrate direct de aplicație;
- nu se introduce CDN;
- nu se introduce storage extern.

A fost aleasă această variantă pentru simplitatea aplicației.

## 6. Lista T1–T8 — DN-04

- Se păstrează **exact lista existentă T1–T8**.
- Nu modifica lista.
- Nu o reinterpreta și nu o înlocui.

## 7. Branch-urile pentru Faza 5 — DN-05

- La începutul Fazei 5 se creează **un branch nou, dedicat Fazei 5**.
- Acesta pornește din checkpoint-ul actual al Fazei 4.
- Branch-ul `recovery-etapa-5-0e2cc20` rămâne baza/checkpoint-ul Fazei 4.

## 8. Sistem de operare — DN-07

Mediul local de dezvoltare este:

- **Windows 11**.

---

# 9. Regula de lucru pentru punctele tehnice

Punctele T-C1…T-C9 au fost marcate anterior drept propuneri tehnice neconfirmate.

**Nu le transforma automat în decizii de produs.**

Pentru orice punct care mai necesită efectiv o decizie din partea lui Sergiu:
- prezintă-l separat;
- explică foarte scurt ce trebuie decis;
- nu modifica documentația până la răspuns.

Pentru aspectele care sunt pur tehnice și rezultă direct din deciziile de mai sus, nu cere o nouă decizie de produs.

---

# 10. Reguli de integrare

- Nu redeschide deciziile deja stabilite.
- Nu introduce noi interpretări de produs.
- Nu schimba sensul deciziilor.
- Păstrează istoricul și trasabilitatea.
- Actualizează documentele afectate din Revizia 4.
- Elimină contradicțiile documentare rezultate direct din deciziile de mai sus.
- Nu modifica `main`.

## Git

Checkpoint-ul actual al Fazei 4 este:

`8d87e94654b05521dd82a3faef4d6ee28438b804`

Branch:

`recovery-etapa-5-0e2cc20`

Pentru această rundă, după integrare și verificări:

1. rulează verificările relevante;
2. verifică `git diff --check`;
3. verifică faptul că nu există modificări de cod necerute;
4. prezintă sumarul modificărilor;
5. apoi **commit și push** pe branch-ul Fazei 4, deoarece această instrucțiune autorizează salvarea deciziilor de mai sus;
6. `main` trebuie să rămână neatins.

Mesaj de commit propus:

`docs(faza-4): integrate consolidated decisions`

Nu folosi `git add .`; adaugă explicit fișierele modificate/noi.

---

# 11. Important

Acest set reprezintă deciziile deja luate. **Nu cere din nou confirmarea lor.**

Dacă mai există puncte care necesită o alegere reală de produs, oprește-te la acestea și prezintă-le separat, fără să modifici sensul deciziilor de mai sus.

Nu începe implementarea Fazei 5. Această rundă este pentru închiderea și salvarea documentației Fazei 4.
