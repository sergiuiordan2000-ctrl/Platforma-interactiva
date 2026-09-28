Am făcut auditul final pe cele **8 documente din arhiva Revizia 7**, folosind `FAZA_4_REGISTRU_DECIZII.md` ca sursă de adevăr, exact cum cere cererea de audit. Cererea stabilește explicit că nu trebuie redeschise deciziile din §2 și că trebuie verificate conformitatea, coerența, testarea, propunerile tehnice și securitatea.

## Audit final — Faza 4, Revizia 7

| #      | Document și secțiune                          | Constatarea                                                                                                                                                                                                                                                                                                              | Tip                | Gravitate       |
| ------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | --------------- |
| **1**  | `B1 §3.9` — retenție                          | Regula de 45 zile este implementată coerent pentru sesizare, fotografii, `email_outbox` și auditul sesizării. **Nu am găsit o contradicție.**                                                                                                                                                                            | observație         | minoră          |
| **2**  | `B1 §3.7`, `B2 /citizen/account`              | Ștergerea contului cetățeanului păstrează corect sesizările și `email_hash` pentru blocarea definitivă. Este coerent cu decizia că **contul nu se șterge automat**, dar poate fi șters voluntar.                                                                                                                         | observație         | minoră          |
| **3**  | `B1 §3.9`, `B10 §3`                           | Retenția textelor libere este corect aliniată: **6 luni de la închiderea sondajului**, nu de la introducerea textului.                                                                                                                                                                                                   | observație         | minoră          |
| **4**  | `B6 §1`, `B2 §7`, `B10`                       | Fluxul `new → in_analysis` este legat de `sent`, iar e-mailul de confirmare la depunere este eliminat. Coerență bună între API, e-mail și teste.                                                                                                                                                                         | observație         | minoră          |
| **5**  | `B1 §3.8`, `B2 DELETE report`, `B10 Sesizări` | Ștergerea sesizării elimină și jurnalul e-mailului, inclusiv mesajele deja trimise și cele netrimise. Este conform cu A05-4.                                                                                                                                                                                             | observație         | minoră          |
| **6**  | `B1 §3.7`, `B2 /blocks`, `B10 Conturi`        | Blocarea definitivă este păstrată prin `email_hash`, iar ridicarea ei permite ulterior recrearea contului. Fluxul este coerent.                                                                                                                                                                                          | observație         | minoră          |
| **7**  | `B5 §retention`, `B1 §3.9`                    | Pentru e-mailul **deja primit de Primărie**, documentația precizează corect că aplicația nu îl poate șterge. Este o limitare tehnică reală, nu o modificare a regulii de produs.                                                                                                                                         | observație         | minoră          |
| **8**  | `B2 §4`, `B3 §5`, `B10`                       | Recuperarea TOTP are cele două mecanisme distincte cerute: coduri de recuperare și resetare de către alt `super_admin`.                                                                                                                                                                                                  | observație         | minoră          |
| **9**  | `B2 /citizen/geocode`, `B5`, `B10`            | Geocodarea prin Nominatim este coerent descrisă: server/proxy, pin aproximativ, verificarea UAT și posibilitatea mutării pinului.                                                                                                                                                                                        | observație         | minoră          |
| **10** | `B3 §8`, `B2 §6`, `B10`                       | Matricea de permisiuni este coerentă: 26 pentru `super_admin`, 12 pentru `primarie_operator`, fără `reports.moderate`.                                                                                                                                                                                                   | observație         | minoră          |
| **11** | `B10 §3 — acoperirea prin teste`              | Documentul B10 oferă teste pe domenii și acoperă deciziile importante, însă **nu există o trasare unu-la-unu explicită pentru fiecare ID din registru**. De exemplu, decizii de proces precum DN-04, DN-05, DN-07 sau unele decizii istorice nu au un test dedicat.                                                      | observație         | minoră          |
| **12** | `B1 §3.9`, `00 R-17`                          | Backup-urile apar ca problemă tehnică pentru Faza 5, dar B1/B10 includ deja formularea că backup-urile mai vechi de 45 zile vor fi șterse într-un test de staging. Implementarea efectivă este încă neproiectată.                                                                                                        | observație         | minoră          |
| **13** | `B2 GET /citizen/geocode?address=`            | Adresa este transmisă către server prin query parameter. Ca proiectare de securitate, ar fi preferabil ca adresa să nu apară în URL/access logs. Nu contrazice o decizie a ta, dar merită corectat înainte de implementare.                                                                                              | **eroare tehnică** | **de corectat** |
| **14** | `B6 §2`                                       | Modul `allowlist` permite testarea completă a fluxului către Primărie pe staging, dar documentația trebuie să garanteze tehnic că o adresă reală a Primăriei nu poate fi folosită accidental în staging. În prezent protecția este descrisă prin allowlist, ceea ce este rezonabil, dar merită un test explicit negativ. | observație         | minoră          |
| **15** | `B1 §3.7`, `B10 Conturi`                      | La ștergerea voluntară a contului, o blocare temporară rămâne valabilă, iar o blocare definitivă rămâne prin `email_hash`. Este corect și important; nu am identificat contradicție cu deciziile.                                                                                                                        | observație         | minoră          |

### Constatări importante

**Nu am găsit o contradicție de produs cu registrul deciziilor.** În special, am verificat explicit lucrurile pe care le-am schimbat în ultimele runde:

* sesizare → **45 zile de la depunere**;
* cont cetățean → **nu se șterge automat**;
* blocare → **15 zile sau definitivă**;
* audit administrativ → **6 luni**;
* jurnale/sesiuni expirate → **6 luni**;
* texte libere → **6 luni de la închiderea sondajului**;
* jurnal e-mail al sesizării → **șters odată cu sesizarea**;
* fără e-mail de confirmare;
* fără răspuns al Primăriei către cetățean;
* fără moderare;
* Nominatim + pin aproximativ;
* `primarie_operator` nu primește e-mailul cetățeanului.

### Singurul punct pe care l-aș corecta înainte de checkpoint

**Constatarea #13: `/citizen/geocode?address=`.**

Nu este o problemă de funcționalitate, ci de proiectare a datelor. O adresă introdusă de cetățean pusă în query string poate ajunge în logurile serverului, proxy-ului sau monitorizării. Mai curat este un `POST /citizen/geocode`, cu adresa în body.

Asta este **o corecție tehnică**, nu o nouă decizie de produs.

### Verdict

Conform criteriilor din cererea de audit, verdictul meu este:

> **DESIGN APROBABIL — fără constatări blocante.**

Eu **nu aș mai deschide acum alte discuții de produs**. Avem o singură corecție tehnică rezonabilă (#13), plus câteva observații minore. Cererea de audit spune că după audit Claude trebuie să corecteze numai constatările acceptate de proprietar, după care proprietarul aprobă checkpoint-ul Fazei 4.

Aș face deci foarte simplu: **îi spunem lui Claude să corecteze doar #13**, apoi verificăm, commit/push și **închidem Faza 4**.
