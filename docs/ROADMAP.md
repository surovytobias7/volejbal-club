# Product UI roadmap

Updated: 2026-10-29. It records the current implementation and redesign; it does not replace the live acceptance gates in M4_LIVE_ACCEPTANCE.md. PRODUCT.md and DESIGN.md hold the confirmed usage context and design rules.

## Aktuálne pokračovanie — živá dochádzka a interné poznámky

- [x] 29. október: nový live runner a jeho ochrana pred opakovaním overené; **406/406 lokálnych testov**, check a build prešli. Prvý timeout pri paralelnom builde a úspešný samostatný rerun sú zaznamenané v PROGRESS.md. Graphify AST aktualizovaný na 1 140 uzlov.

- [x] Obnovený Management prístup a overená vzdialená história: **23 aplikovaných / 0 čakajúcich migrácií**. Štyri pôvodne čakajúce migrácie sú aplikované a skontrolované; existujúca 23. migrácia sa neopakovala.
- [x] Živé Auth/RLS mutácie: hromadná/atomická dochádzka, oddelená dostupnosť, história, súbeh, oba druhy poznámok, druhý tréner, admin audit a okamžitá revokácia. Presné reporty a limity v [LIVE_ATTENDANCE_NOTES.md](LIVE_ATTENDANCE_NOTES.md).
- [x] Autentifikovaný T3: trénerské uloženie, mobilná úprava tréningovej poznámky a reload; osobný/rodinný pohľad a odmietnutie členského adresára. Opravená anglická 404.
- [x] Lokálna sada **406 testov**, typecheck, lint bez upozornení a produkčný build prešli 28. októbra; evidencia v PROGRESS.md.
- [x] Viditeľnosť podľa oprávnení: žiadne zamknuté položky; vytváranie udalostí/oznamov vyžaduje aktuálny aktívny trénerský tím, skratka dochádzky aktuálne trénerstvo. Admin adresy majú slovenskú 404. Lokálne regresie vrátane aditívnych rolí; rozsah prehliadačových kontrol v ACCESS_CONTROL_MATRIX.md.
- [x] Poznámky: **17/17 nových živých kontrol** pre hráča aj tréning (26 záznamov, kurzory, 4 000/4 001 znakov, súkromie, absencia notifikácií). T3 overilo konflikt dvoch formulárov, výber verzie/vrátenie textu, simulovanú chybu odoslania, následné uloženie a reload. Mobilné stránkovanie 25 + 1 a dlhý text bez pretekania.
- [x] Dochádzka: **9/9 nových živých kontrol** súpisu 30 hráčov (25 + 5), atomicity a osobného/rodinného rozsahu. T3: hromadné označenie pri vyhľadávaní, oprava s dôvodom, konflikt vyvolaný druhou Auth reláciou, explicitné prevzatie uloženého stavu a zachovanie nekonfliktného návrhu, uloženie a opätovné načítanie. Mobilná obnova po zrušení skryje všetky ovládacie prvky dochádzky.
- [x] Reload dochádzky vracia aktuálny stav udalosti; potvrdená strata oprávnenia odstráni súpis aj návrhy. Prechodná chyba databázy sa nepovažuje za revokáciu. Bez novej migrácie.
- [x] Súbeh presunu udalosti: **18/18 živých kontrol** cez Auth/PostgREST pre dochádzku, dostupnosť a poznámky; obe postupné poradia aj súčasné HTTP požiadavky. Záznam sa nepreniesol do cudzieho tímu, tréner stratil čítanie presunutej udalosti. Nejde o deterministické vynútenie prekrytia DB zámkov ani záťažový test.
- [x] Dochádzka: browser obnova po odobratí trénerstva — **7/7 živých kontrol** v headless Chromium (390 × 844), pretože T3 nemal dostupného hostiteľa. Otvorený návrh sa neuložil, reload odstránil súpis/ovládanie, nový load odmietol udalosť, Auth cookies zostali nezmenené. Testovacie priradenie obnovené a potvrdené.
- [ ] Ďalší míľnik: rodinné prepojenia/stránkovanie, finančné detaily a opravy, nastavenia/notifikácie.
- [ ] SMTP/doručenie a hosted obnova pozvánky, fyzický mobil/čítačka, zálohy a nasadenie.

Aktuálna prevádzková hranica: **29. októbra Management API funguje a potvrdilo 23 aplikovaných / 0 čakajúcich migrácií**. Priame DB spojenie v tomto behu zlyhalo; nevypínalo sa TLS overovanie. Žiadna nová migrácia ani reset. Reálny dlhodobý výpadok siete a strata odpovede po commite nie sú prehliadačovým testom simulovaného odmietnutia odoslania pokryté.

Staršie odseky nižšie sú historické; aktuálny poradovník a blokátory sú vyššie.

## Historické pokračovanie — pozvánky a Graphify (26. október)

- [x] Lokálna skúška čiastočného zlyhania pozvánky a opravy chýb: neistý výsledok služby, bezpečné výnimky, aktuálny neprepojený profil a overená identita. Manuálna obnova a hranice sú v [INVITATIONS.md](INVITATIONS.md).
- [x] 28 nových serverových/PGlite prípadov; celkovo **350 testov**, check a build prešli. Závislosti zosúladené s existujúcim lockfilom (Next.js 16.4.2).
- [x] Hlavný Graphify graf obnovený vrátane SQL migrácií a dokumentácie; zastarané architektúrne údaje opravené.
- [ ] Hosted obnova pozvánky, SMTP a úplná akceptácia poznámok/dochádzky. Migračná história bola opäť zablokovaná HTTP 401; žiadny vzdialený zápis.

Ďalší krok: obnoviť súkromný prístup k testovacej migračnej histórii a overiť presný usporiadaný prefix pred aplikovaním chýbajúcich migrácií. Nasledujúce míľniky a počty sú historické.

Latest integration: resolved restored attendance/security conflicts, retained private viewer context, retired unversioned attendance writes and reconciled historical attendance correction guards. **296/296 local tests pass**, check and build pass on patched Next.js 16.4.2. Production dependency audit is clean; five development-only ESLint/braces findings remain. There are 22 local migrations and 27 RPCs. Four migrations above the historical 18-migration hosted baseline need confirmed remote history and ordered application; read-only inspection still returns Management HTTP 401. Next: hosted attendance/notes acceptance after restoring history access, and track the upstream development dependency fix. Earlier milestone counts below are historical.

22 October continuation: completed the nine reproduced authorization defects, explicit mutation guards, personal-role directory denial and finance eligibility navigation. The local suite now passes 250 tests. Two reviewed local migrations require a renewed Management connection/history inspection before applying to the dedicated test database. `npm run db:status` is read-only; no remote migration was applied. The app's new `viewer_context` dependency must be migrated before deployment. Current evidence and next steps are in PROGRESS.md and ACCESS_CONTROL_MATRIX.md; historical counts below remain milestone context.
## Dochádzka trénera — aktuálny míľnik

- [x] Integrovaný mobilný súpis na existujúcom detaile, štyri priame stavy, neoznačení hráči, počty, vyhľadávanie, celý tím prítomný a vrátenie, dôvod, spoločné uloženie a opravy.
- [x] Serverové overenie tímu a aktuálnych rolí, RLS, atomická dávka, audit, verzie/konflikty, opakovanie požiadavky, zrušený tréning a historické záznamy po zmene členstva. Oddelená plánovaná dostupnosť.
- [x] Lokálne cielené PGlite/jednotkové testy a T3 interakcie pri desktopových/mobilných rozmeroch; detaily v [ATTENDANCE.md](ATTENDANCE.md).
- [ ] Aplikovať novú migráciu do vyhradeného testovacieho Supabase a overiť reálny Auth/PostgREST, obnovenie stránky po uložení, všetky roly a súbežné spojenia.
- [ ] Dokončiť snímkovú vizuálnu kontrolu po odstránení chyby T3 `preview_snapshot`, čítačku obrazovky a fyzický mobil.
- [x] Opraviť tri regresie súkromných polí a overiť ich spolu s dochádzkou; aktuálny integrovaný výsledok je v PROGRESS.md.

## Design direction

The user-confirmed identity is **ŠŠK Gymnázium Bilíkova Bratislava**: original supplied logo, deep blue #252b80, white #ffffff and red #ce2637. Manrope serves operational text; Barlow Condensed serves headings, times and scores. Blue carries navigation/actions, red marks selection and emphasis; semantic status labels always accompany color. The superseded petrol/peach identity must not return.

Use a compact desktop navigation rail, an immediate next-event feature and dense operational lists. On phones, use direct program/navigation access and labelled records instead of horizontally scrolling administrative tables. Preserve server rendering, RLS, additive roles, Slovak and Bratislava time.

## Implemented before this continuation

- Shared typography, palette, shell, role-dependent navigation and dashboard.
- Team cards, announcements, authentication court illustration, profiles, finance summary and calendar.
- Labelled action forms, password reveal, pending/error/success feedback, focus-managed dialogs and navigation.
- Functional Supabase integration; selected authenticated browser acceptance in PROGRESS.md.

## Current stage: operational mobile workflows

- Implemented: mobile quick navigation; selected-page state in isolated previews; responsive labelled tables across members, attendance, team/event rosters, payments and audit.
- Implemented: grouped daily agenda on phones/tablets and explicit event-type/cancellation labels in the desktop calendar; one date index per render.
- Implemented: first-invalid-control focus; dialog triggers no longer imply every action creates a record; fee-plan active/archive selection.
- Implemented: compact guardian/player dashboard metrics; distinct event time/venue brief with response actions before the mobile roster; direct accessible contact links.
- Completed Impeccable pass in `8cbd61f`: shared tokens, Radix mobile navigation, accessible motion/focus, open dashboard/announcement sections, team directory and shared preview/live record components. Prior check/test/build and production-preview confirmation passed.
- Completed locally 2026-10-16: open member contacts and program links, distinct training time/venue composition, player-specific upcoming responses and approved internal player/training notes. Notes use current-role RLS, author/admin editing, audit, pagination and version checks; see INTERNAL_NOTES.md.
- Implemented 18 October: official club branding, shared identity/config and original logo, new login/navigation composition, program-first dashboard and consistent blue/white/red shared UI. See BRAND_REVIEW.md. Latest local suite: 169 / 12 files; final repeated validation is recorded in PROGRESS.md.
- Notes migration applied to dedicated test Supabase (18 migrations, 19 RLS tables, 21 RPCs). Fictional coach dataset and real coach Auth/local SSR checks passed; broader hosted notes matrix remains open.

## Remaining acceptance and next work

1. Notes acceptance, the 30-player roster and attendance browser conflict/cancellation recovery are complete for the documented scenarios. Next: concurrent event movement/private writes and browser assignment-revocation recovery. Prolonged outages, unknown post-commit outcomes and physical devices remain separate resilience checks.
2. Continue remaining authenticated UI review: settings, notifications, fee details, family-link pagination and empty/error/loading states. Profile/training presentation has now been inspected at desktop/tablet/phone widths; full authenticated pages and real-device/screen-reader checks remain.
3. Preserve check/test/build evidence per milestone. Root Graphify was refreshed on 26 October, including notes, attendance and SQL migrations. Confirm source locations after subsequent edits; graph structure is not live acceptance evidence.
4. Follow-up acceptance: screen-reader/real mobile-device testing, complete live mutation matrix, invitation partial-failure rehearsal, SMTP delivery, backup restore and deployment checks remain distinct gates. Do not call the product production-ready based on visual checks.

## Navigation for the next session

Use root graphify-out/graph.json first: `graphify explain "Shell"`, `graphify explain "CalendarView"`, `graphify explain "ActionForm"`, and targeted queries. Confirm source lines because a graph may predate edits. No earlier club repository was inspected. The ignored src/graphify-out/ is a redundant source-only extraction; root graphify-out/ is authoritative.

No automatic commit, push, merge or deployment. The additive notes migration is applied only to the dedicated test project; production rollout remains a separate release gate.
