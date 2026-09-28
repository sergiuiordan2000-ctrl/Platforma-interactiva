# Turnu Măgurele Civic — Instrucțiuni Claude
## Faza 4 — set consolidat de decizii după Revizia 3

**Scop:** integrează cumulativ deciziile de mai jos în documentația Fazei 4. Nu începe implementarea aplicației.

### 1. Decizii noi

#### K-A02-3 — Retenția de 45 de zile
**Decizie: A.** Cele 45 de zile încep să curgă din momentul depunerii sesizării.

#### REC-01 — Date supuse retenției
**Decizie: A.** Regula de 45 de zile se aplică tuturor datelor legate de sesizare și datelor asociate acesteia: sesizare, fotografii, e-mailuri și alte date aferente, în măsura în care eliminarea este posibilă legal și tehnic.

#### B-7 — Auditul ștergerilor
**Decizie: B.** Ștergerile definitive NU se înregistrează în audit. Nu se păstrează în audit o urmă care să permită reconstituirea sesizării șterse.

#### K-A02-4 — Blocarea cetățeanului
`super_admin` decide la blocare între:
- **15 zile**, cu expirare automată;
- **definitiv**, fără expirare automată.

Regula de retenție de 45 de zile nu trebuie să anuleze o blocare definitivă. Pentru blocarea definitivă se păstrează doar identificatorul minim necesar pentru a împiedica recrearea contului și depunerea de sesizări. Nu se păstrează mai multe date decât sunt necesare pentru acest scop.

#### DN-19 — Imaginile comunicatelor
**Decizie tehnică: C.** Pentru MVP, imaginile comunicatelor fac parte din aplicație/repository și sunt publicate odată cu versiunea software. Nu introduce CDN sau serviciu extern de stocare doar pentru această funcție.

#### DN-04 — T1–T8
**Decizie: B, temporar deschis.** Nu elimina, nu muta și nu modifica lista T1–T8. Pregătește o analiză pentru fiecare:
1. ce reprezintă;
2. sursa;
3. impactul asupra Fazei 4;
4. tipul: decizie / cerință tehnică / implementare / testare / altceva.

Nu modifica T1–T8 până la o decizie ulterioară a utilizatorului.

---

### 2. Reguli deja stabilite — NU le redeschide

- Aplicația este complet utilizabilă fără cont.
- Contul cu e-mail este cerut **numai când utilizatorul dorește să depună o sesizare**.
- Utilizatorul nu trebuie să aibă cont pentru navigare, comunicate, hartă, sondaje, ghid etc., dacă funcția respectivă nu presupune depunerea unei sesizări.
- Contul cetățeanului folosește e-mailul și confirmarea prin e-mail.
- Sesizarea apare imediat pe hartă, fără moderare prealabilă.
- Stările sunt: `nouă` → `în analiză` → `rezolvată`.
- `în analiză` se setează automat numai când e-mailul către Primărie a fost transmis efectiv.
- Dacă transmiterea către Primărie este oprită, sesizarea așteaptă și transmiterea se reia la reactivare.
- O sesizare netransmisă nu poate deveni `rezolvată`.
- Notificările de stare către cetățean sunt numai la `nouă → în analiză` și `în analiză → rezolvată`.
- Locația se poate indica prin alegerea unui punct pe hartă sau prin introducerea unei adrese (stradă + număr).
- Adresa poate fi geocodată, iar aplicația plasează automat un pin cu toleranță/precizie aproximativă.
- Locațiile acceptate trebuie să fie în UAT Turnu Măgurele.
- O sesizare fără poziție utilizabilă se poate salva, dar nu apare pe hartă.
- Autorul poate șterge definitiv propria sesizare.
- `super_admin` poate șterge definitiv orice sesizare.
- `TM-XXX` rămâne rezervat definitiv chiar după ștergere.
- Ștergerile definitive nu intră în audit.
- `super_admin` poate bloca un cetățean 15 zile sau definitiv.
- `primarie_operator` nu vede e-mailul cetățeanului, conform regulilor deja stabilite.
- Retenția de bază este 45 de zile de la depunerea sesizării.
- Retenția se aplică tuturor datelor asociate sesizării, cu limita posibilității legale și tehnice de ștergere.
- Blocarea definitivă este tratată separat de retenția sesizării.
- Imaginile comunicatelor sunt parte din aplicație/repository pentru MVP.

---

### 3. Ce trebuie făcut acum

1. Citește documentația din checkpoint-ul Git `3c586d0`.
2. Integrează deciziile de la secțiunea 1 cumulativ în documentația Fazei 4.
3. Actualizează `DECIZII_NOI` și toate documentele afectate.
4. Folosește un marcaj clar pentru modificări, de exemplu `[SET-A-03]`.
5. Păstrează trasabilitatea.
6. Nu modifica codul și nu începe implementarea aplicației.
7. Nu inventa decizii pentru punctele rămase deschise.
8. Nu redeschide regulile din secțiunea 2.
9. Pentru T1–T8 doar investighează și raportează.

### 4. Verificări

Verifică explicit:
- toate referințele la retenția de 45 zile;
- toate referințele la auditul ștergerilor;
- toate referințele la blocarea cetățenilor;
- toate referințele la contul cetățeanului;
- toate referințele la imaginile comunicatelor;
- faptul că aplicația rămâne funcțională fără cont pentru funcțiile care nu cer sesizare;
- faptul că T1–T8 nu au fost modificate.

### 5. Raportul final

Raportează:
- documentele modificate;
- secțiunile modificate;
- numărul reviziei;
- marcajul folosit;
- deciziile integrate: K-A02-3, REC-01, B-7, K-A02-4, DN-19;
- tabelul T1–T8: ID / ce este / sursă / impact Faza 4 / tip / modificat? — coloana „modificat?” trebuie să fie NU;
- numai deciziile care rămân realmente deschise.

### 6. Git

După actualizare:
1. arată `git status`;
2. arată lista exactă a fișierelor care intră în commit;
3. rulează verificările relevante;
4. **nu face commit/push până nu prezinți sumarul verificărilor și fișierele incluse și primești confirmarea utilizatorului.**

Branch-ul este:
`recovery-etapa-5-0e2cc20`

`main` nu se modifică.

Mesaj propus:
`docs(faza-4): integrate decisions after revizia 3`

### Principiu obligatoriu

**Nu ghici și nu completa golurile prin presupuneri.** Dacă apare o contradicție reală între aceste instrucțiuni și documentația anterioară, oprește-te și indică regula veche, decizia nouă, documentele afectate și motivul contradicției. Nu modifica regula nouă fără acordul utilizatorului.
