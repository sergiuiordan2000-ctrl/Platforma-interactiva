# Turnu Măgurele Civic — SET-A-05
## Ultimele decizii REC-02 și T-C8

### Instrucțiune pentru Claude

Integrează în documentația Fazei 4 **doar** cele patru decizii de mai jos.

Nu reinterpreta, nu redeschide și nu modifica alte decizii deja închise.

Marchează modificările cu `[SET-A-05]` și păstrează trasabilitatea.

---

## 1. REC-02(c) — jurnalele aplicației și sesiunile expirate

**Decizie:**

- Jurnalele aplicației se păstrează **6 luni**.
- Sesiunile expirate se păstrează **6 luni**.

După expirarea perioadei de 6 luni, datele respective se șterg automat.

---

## 2. REC-02(d) — textele libere din sondaje

**Decizie:**

- Textele introduse liber de cetățeni în sondaje se păstrează **6 luni**.
- După 6 luni, aceste date se șterg automat.

---

## 3. REC-02(e) — blocarea temporară

**Decizie:**

- Pentru o blocare temporară de 15 zile, după expirarea blocării sau după ridicarea ei de către `super_admin`, informația despre blocare se păstrează în **auditul administrativ**.
- Se aplică retenția deja stabilită pentru auditul administrativ: **6 luni**.
- După 6 luni, informația se șterge conform retenției auditului administrativ.

---

## 4. T-C8 — jurnalul e-mailului unei sesizări șterse

**Decizie:**

- Dacă o sesizare este ștearsă, jurnalul e-mailului aferent acelei sesizări se șterge **odată cu sesizarea**.
- Nu se păstrează jurnalul e-mailului până la expirarea celor 45 de zile.

---

# Reguli de integrare

1. Actualizează toate documentele Fazei 4 afectate.
2. Elimină contradicțiile rezultate direct din aceste patru decizii.
3. Nu redeschide întrebările deja închise.
4. Nu introduce noi decizii de produs.
5. Nu modifica codul.
6. Nu începe implementarea Fazei 5.
7. Păstrează istoricul și trasabilitatea setului.

## Git

După integrare:

1. rulează verificările relevante;
2. verifică `git diff --check`;
3. verifică `git status`;
4. verifică să nu existe modificări de cod necerute;
5. creează raportul de modificări și copiile necesare pentru trasabilitate;
6. commit și push pe branch-ul actual al Fazei 4;
7. `main` rămâne neatins.

**Nu este nevoie să ceri o nouă confirmare pentru aceste patru decizii. Sunt deja stabilite.**

Mesaj de commit:

`docs(faza-4): integrate final retention decisions`

Nu folosi `git add .`; adaugă explicit fișierele modificate/noi.

---

## Starea de referință

Checkpoint anterior:

`ddc9ef8`

Branch:

`recovery-etapa-5-0e2cc20`

Acest set este destinat închiderii ultimelor patru întrebări de retenție enumerate în raportul Reviziei 5.

**Nu face alte modificări în afara celor cerute mai sus.**
