# FAZA 7E — RAPORT (instalarea producției, E4)

**Proiect:** Urbis Activ (Turnu Măgurele Civic) · **Etapa:** E4 / 7E · **Executată:** 16–18.11.2026
**Stare:** E4 executată. Criteriile aplicabile instalării (1–14) sunt îndeplinite; criteriile 15–22 (restaurarea de probă) sunt exceptate prin D-B4-1 = B, cu riscul rezidual acceptat de proprietar și prima copie externă verificată cu succes (DEC-23) (registrul §53.1). **Checkpointul 7E: propus, neacordat.** Lansarea publică **nu** este aprobată: producția rulează sub lacăt.

## 1. Ce s-a instalat

| Element | Valoarea |
|---|---|
| artefactul | `civic-4198e8d.zip`, SHA-256 `8d89f83ae329d28d4ca59e1f5429df0297d5f035f779494227840decaee67ac7`; commitul `4198e8d` |
| domeniul | `https://urbisactiv.ro`, docroot `/public_html`, `http` → `301` → `https` |
| aplicația | `civic-app`, Node 24.22.3, Production, `CIVIC_ENV_FILE=/home2/<cont>/civic-data/civic.env` |
| baza | `<cont>_civic_prod` (MariaDB 11.4.13), utilizatorul `<cont>_prod` |
| accesul | lacătul „Urbis Activ” pe `public_html`, credențiale proprii producției |
| administratorii | 2 × `super_admin`, TOTP pe două telefoane, coduri de recuperare pe hârtie |
| e-mailul | Brevo, `allowlist` numai cu adresele proprietarului; fluxul către Primărie oprit |
| Google | clientul „Urbis Activ productie”, în „Testing” |
| copiile | `backup:db` zilnic la 03:17, criptat (`age`, cheia publică din §50); `purge:retention` la 03:47; `outbox:process` la 2 minute; `surveys:close-expired` la 5 minute |

## 2. Dovezi

Jurnalul pas cu pas: `docs/faza7/PRODUCTIE_URBISACTIV_JURNAL.md`. Deciziile, abaterile și criteriile: registrul §53. Evidența DEC-16 de producție: la proprietar, în afara depozitului (D16-a).

## 3. Lecții pentru operațiile următoare

- Verificarea anti-robot a găzduirii poate intercepta o salvare în cPanel: se verifică starea înainte de a repeta (jurnal, O1).
- „Run JS script” apare numai cu aplicația pornită (jurnal, O2).
- În modul `allowlist`, autentificarea Google acceptă numai adresele din listă (registrul §53.2, D-E4-2).
- În managerul de parole, fraza cheii `age` e în câmpul „Password”; „Notes” conține cheia publică (jurnal, rândul 39).
- Credențialele introduse în PowerShell se pierd la închiderea ferestrei; o singură fereastră pe toată sesiunea.

## 4. Checkpointul 7E

**Starea: propus, neacordat.** Propunerea: checkpointul 7E se acordă pe baza §53.1 (criteriile 1–14 îndeplinite; 15–22 exceptate prin D-B4-1 = B, cu riscul rezidual acceptat și DEC-23 reușit) și a abaterilor din §53.3, toate fără efect asupra rezultatului. Se acordă numai prin decizia scrisă a proprietarului, consemnată separat. Acordarea nu aprobă lansarea publică.

## 5. Pasul următor

Planul lansării publice; apoi lotul PWA și aplicația Android în Google Play (registrul §53.4–§53.5).
