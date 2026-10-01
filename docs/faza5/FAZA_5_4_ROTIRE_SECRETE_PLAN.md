# ROTIREA SECRETELOR DE PE STAGING — PLAN (varianta A, decizia din 30.09.2026)

**Proiect:** Turnu Măgurele Civic · **Data:** 01.10.2026 · **Branch:** `faza-5-backend`
**Motiv:** pe 30.09 au ajuns în conversație capturi ale fișierului `civic.env` de pe staging. Valorile se consideră compromise și se înlocuiesc. Proprietarul a ales varianta A: parola DB și cele 4 chei „ușoare” acum; `TOTP_ENC_KEY` mai târziu, planificat, după al doilea `super_admin`.

## 1. Ce se schimbă

| Secret | Unde e folosit | Efectul schimbării | Cine îl schimbă |
|---|---|---|---|
| parola utilizatorului DB (în `DATABASE_URL`) | conexiunea aplicației la MySQL | niciunul, dacă parola nouă e pusă în **ambele** locuri: cPanel și `civic.env` | proprietarul (cPanel → Manage My Databases + editorul File Manager) |
| `IP_HASH_SECRET` | hash-ul zilnic al IP-ului (limite de rată, încercări respinse, sesiuni) | contoarele de limită ale zilei curente pornesc de la zero; nimic vizibil | comanda nouă `civic-rotate-keys` |
| `FORM_TOKEN_SECRET` | jetonul semnat al formularului de sesizare (24 h) | un formular deschis exact în momentul schimbării trebuie reîncărcat | comanda nouă |
| `POW_HMAC_KEY` | provocările ALTCHA (oprite implicit) | nimic, cât timp ALTCHA e oprit | comanda nouă |
| `PARTICIPATION_HMAC_SECRET` | sondajele (5.6); încă nefolosit | nimic | comanda nouă |

**Nu se schimbă acum:** `TOTP_ENC_KEY`. Din ea derivă criptarea TOTP a conturilor Admin, hash-ul e-mailurilor din blocările definitive și hash-ul codurilor de cetățean. Schimbarea ei cere o migrare a datelor și se face planificat (decizia din 30.09).

**Sesiunile rămân valabile** (jetoanele sunt aleatoare, nu derivate din aceste chei): nici Admin, nici cetățenii nu sunt deconectați.

## 2. Comanda nouă `rotate:keys` (cod, cu teste)

- generează pe server 4 valori noi, fiecare de 32 de octeți aleatori (`crypto.randomBytes`), în base64url (43 de caractere, peste minimul cerut);
- înlocuiește în fișierul numit de `CIVIC_ENV_FILE` **numai** cele 4 rânduri; restul fișierului (inclusiv `DATABASE_URL` și `TOTP_ENC_KEY`) rămâne neschimbat, caracter cu caracter;
- scrie atomic: fișier temporar în același folder, cu drepturi 600, apoi redenumire; fără copie de rezervă (valorile vechi sunt oricum compromise);
- refuză dacă: `CIVIC_ENV_FILE` lipsește, fișierul nu are drepturi 600 / 400, una dintre cele 4 chei lipsește sau apare de două ori;
- **nu afișează nicio valoare**, nici veche, nici nouă; afișează numai numele cheilor schimbate și mesajul „Reporniți aplicația (Restart)”;
- scrie un rând de audit (`system.keys.rotate`, actor `system`, numai numele cheilor);
- în pachet: scriptul npm `civic-rotate-keys` („Run JS script”, fără argumente).

**Teste:** fișier temporar cu cele 4 chei + alte rânduri (comentarii, ghilimele, `DATABASE_URL`) → numai cele 4 valori se schimbă, sunt diferite de cele vechi și între ele, drepturile rămân 600, ieșirea comenzii nu conține nicio valoare; refuzurile (drepturi 644, cheie lipsă, cheie dublă, variabila lipsă); pornirea serverului cu fișierul rotit trece validarea configurației.

## 3. Ordinea pe staging (proprietarul, cu ghid pas cu pas la implementare)

0. T-ISO înainte (Claude: 1, 2, 4, 6; proprietarul: 5, 7).
1. Deploy-ul pachetului nou (Upload, Extract, Restart; `health` → noul cod).
2. **„Run JS script” → `civic-rotate-keys`** → mesajul „4 chei schimbate”.
3. **Parola DB:** în cPanel → Manage My Databases → utilizatorul bazei → Change Password; parolă generată **numai din litere și cifre** (fără simboluri, care ar strica adresa `mysql://`). Imediat după, în File Manager → `civic-test-data/civic.env` → Edit: se înlocuiește în rândul `DATABASE_URL` numai parola veche cu cea nouă → Save. **Fără capturi ale acestui fișier.**
4. **Restart** în Setup Node.js App.
5. Verificare: `health` → `ok`; Acasă și „Contul meu” se încarcă; `civic-migrate-status` → „Versiunea schemei: 1”. Dacă `health` nu răspunde după pasul 4, cauza aproape sigură este parola DB diferită între cPanel și `civic.env`; se corectează în `civic.env` și se repetă Restart.
6. T-ISO după; jurnal (§9) și raport.

Între pașii 3 și 4, aplicația care rulează păstrează conexiunile deschise; o eroare temporară în acest interval (sub un minut) este posibilă și acceptabilă pe staging.

## 4. Commit-uri propuse (cu aprobare)

1. după cod și teste: comanda `rotate:keys`, scriptul în pachet, planul;
2. după staging: jurnalul §9 și nota în raport.
