# AMENDAMENT — LOCAȚIA ÎN FORMULARUL DE SESIZARE

**Proiect:** Turnu Măgurele Civic · **Data:** 06.10.2026 · **Branch:** `faza-5-backend` · **Stare:** **decis de proprietar și implementat local, cu teste; nu este încă pe staging.**
**Origine:** constatarea de la 5.4.9 (jurnalul de staging §8; `FAZA_5_4_RAPORT.md` §6): formularul avea două câmpuri de adresă. Proprietarul a scris adresa numai în „Locația”; textul singur nu pune pin, deci sesizarea s-a salvat fără poziție și nu a apărut pe hartă. Formularul nu a avertizat.
**Ce modifică din designul înghețat (Faza 4):** ecranul formularului de sesizare, pasul 4 „Locația incidentului”, și zona butonului „Trimite sesizarea”. **Nu modifică** regulile: D6-2 (textul obligatoriu, pinul opțional), 2.4 (adresă geocodată → pin aproximativ), 2.12 (numai în UAT), D6-7. Fără modificări pe server, în schemă sau în contractele API.

## 1. Decizia proprietarului (06.10.2026)

Variantele prezentate: (1) un singur câmp + întrebare la trimitere; (2) numai întrebarea la trimitere; (3) căutarea automată a adresei; (4) fără schimbări. **Aleasă: varianta 1** (și recomandarea lui Claude). Varianta 3 a fost descurajată: un pin greșit ar putea ajunge public neobservat, iar textul ar pleca spre serviciul de hărți fără o acțiune explicită.

## 2. Ce s-a schimbat pe ecran

| Înainte | Acum |
|---|---|
| câmpul „Locația” (text obligatoriu, public) **și** un al doilea câmp, „Caută adresa: stradă și număr”, cu butonul „Caută adresa” | un singur câmp: „Locația”. Butonul **„Caută pe hartă”** caută textul scris acolo. Fără text: mesaj care îl cere, fără nicio căutare trimisă. |
| „Trimite sesizarea” fără pin: sesizarea pleca direct, fără poziție | „Trimite sesizarea” fără pin: apare întrebarea **„Sesizarea nu are poziție pe hartă”**, cu trei butoane (mai jos); nimic nu pleacă spre server până la alegere |

Butoanele întrebării:

- **„Caută adresa scrisă”**: caută textul din „Locația” și aduce harta în vizor. Rezultatul este un pin propus, aproximativ, pe care cetățeanul îl vede și îl poate muta (ca până acum).
- **„Pun pinul pe hartă”**: aduce harta în vizor.
- **„Trimit fără hartă”**: trimite sesizarea fără poziție (comportamentul vechi, acum ales explicit).

Detalii: întrebarea dispare când există pin. După „Trimit fără hartă”, o reîncercare (de exemplu după o eroare de server) nu mai întreabă a doua oară; dacă între timp se pune și se șterge un pin, întreabă din nou. Butonul „Poziția mea”, harta, mutarea pinului și „Șterge pinul” sunt neschimbate.

## 3. Cod și teste

- Cod: `src/components/report/LocationPicker.tsx`, `src/components/report/ReportForm.tsx`.
- Suită nouă: `tests/e2e/test_5_4_locatie_formular.py` (10 verificări, server și DB proprii): un singur câmp (`LF-1`); căutare fără text (`LF-2`); întrebarea la trimiterea fără pin, fără nicio cerere spre server (`LF-3`); cele trei butoane (`LF-4`, `LF-5`, `LF-7`); cu pin nu se mai întreabă, iar în DB poziția este `geocoded` (`LF-6`); fără hartă, în DB poziția este `text`, fără coordonate (`LF-7`); reîncercarea după eroare (`LF-8`); resetarea alegerii (`LF-9`).
- În această suită căutarea adresei este simulată în browser (în testare nu există geocodor). Regulile serverului pentru geocodare rămân testate în `server/test/integration/reports.test.ts`.
- Probe de control (cod stricat intenționat, apoi restaurat; 6 variante, fiecare prinsă de cel puțin un test): fără întrebare; „Caută adresa scrisă” care nu caută; alegerea „fără hartă” neresetată; alegerea nereținută; căutare trimisă fără text; harta neadusă în vizor.

**Teste vechi adaptate (B10 §7), fără slăbirea verificărilor:**

| Verificare | De ce pica | Adaptarea |
|---|---|---|
| `L-1` (`e2e/test_5_4_sesizari.py`) | completa al doilea câmp, care nu mai există | apasă „Caută pe hartă” cu textul deja scris în „Locația”; verificarea este aceeași (căutare indisponibilă → mesaj, formularul rămâne utilizabil) |
| `R6.2` (`regression/test_regresie_6_1_6_5.py`) | trimitea fără pin și aștepta răspunsul serverului | după „Trimite sesizarea” alege „Trimit fără hartă”; verificarea este aceeași (eroare de server → mesaj, fără confirmare, datele păstrate) |
| `AS-2` (`e2e/test_5_4_altcha_sesizari.py`) | la fel | la fel; verificarea este aceeași (ALTCHA rezolvată în browser, confirmare cu TM-XXX) |

## 4. De știut

- Un text de tip reper („lângă piață”, „în dreptul blocului F25”) poate să nu fie găsit ca adresă. Mesajul serverului îndeamnă atunci la punerea pinului pe hartă; trimiterea fără hartă rămâne posibilă.
- Textul din „Locația” ajunge la serviciul de hărți (prin server) numai la apăsarea unui buton de căutare, ca până acum.
- Sesizările fără poziție apar în continuare numai în „Sesizările mele” și în Admin, până când `super_admin` le stabilește poziția (2.11).
- Întrebarea este afișată în pagină, deasupra butonului de trimitere, nu ca fereastră separată.
