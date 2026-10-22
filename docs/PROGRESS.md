# Progress - 2026-10-22

## Integrácia dochádzky a bezpečnostného auditu — 22. október

- Zachovaná vetva `feature/authenticated-workflow-acceptance` aj pripravené zmeny vrátane nesúvisiaceho súboru používateľa. Odstránené doslovné konfliktné značky v šiestich súboroch; bezpečný `viewer_context` zostáva zdrojom aktuálnych rolí a finančných oprávnení. Starý serverový príkaz dochádzky bez verzie je odmietnutý; zápis používa existujúci `saveAttendance` a atomický RPC.
- Reprodukovaný spoločný základ: 290 úspešných / 3 zlyhania. Dve zlyhania boli testy odstráneného príkazu; tretie odhalilo konflikt databázových triggerov pri oprave histórie po odchode hráča. Testy starého príkazu teraz overujú jeho odmietnutie; kontrola odmietnutia po zmene oprávnení zostáva aj na novom RPC a dostupnosti.
- Nová nedestruktívna migrácia `20261022184845_reconcile_attendance_access.sql` zjednocuje triggery bez zmeny historických migrácií či záznamov. Historické opravy sú možné len aktuálnemu správcovi udalosti; nové zápisy vyžadujú oprávneného aktívneho člena. Identita, autor, čas, verzia, zámok udalosti a zákaz zápisu do zrušeného tréningu zostávajú v databáze. Duplicitné ochranné triggery sú odstránené, audit zostáva.
- Regresie rozšírené o odobratie hráčskej roly, deaktiváciu a následné odobratie trénerstva. Integrovaná sada prešla **296/296 testov v 17 súboroch**. Typy obsahujú 19 tabuliek a 27 RPC; lokálne je 22 migrácií.
- Read-only `npm run db:status` opäť skončil **Management HTTP 401**. Žiadna migrácia ani klubový záznam nebol vzdialene zmenený. Aktuálna vzdialená história nie je potvrdená; historický základ je 18 migrácií. Štyri lokálne migrácie nad týmto základom: `20261021201352`, `20261022081940`, `20261022081942`, `20261022184845`, presne v tomto poradí. Pred aplikovaním treba znovu overiť vzdialenú históriu; žiadny reset/seed.
- Build upozornil na zraniteľnosti Next.js 16.4.0; `npm audit` ich nezávisle potvrdil (GHSA-2464-fhr4-w9xw, GHSA-p3m5-59mp-jv5r, GHSA-673q-mjm6-r5xr). Next.js aj eslint-config-next sú aktualizované na **16.4.2**, lockfile zachovaný a aktualizovaný npm. Prvý audit potreboval systémový CA store; TLS overovanie nebolo vypnuté.
- Záverečné kontroly po aktualizácii: **`npm run check` prešlo**, **`npm test -- --reporter=dot`: 296/296, 17 súborov**, **`npm run build` prešlo** bez pôvodného bezpečnostného zastavenia. **`npm audit --omit=dev`: 0 zraniteľností**. Úplný audit má 5 high hlásení v jednom vývojovom reťazci `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces` (GHSA-vfj7-8cjw-p6xm). Npm navrhuje nekompatibilný downgrade na 14.2.35; nebol vykonaný. Zostáva pôvodné konfiguračné upozornenie Vitest na CommonJS/ESM.
- T3 nad aktuálnou produkčnou zostavou s explicitným fiktívnym náhľadom: 20 neoznačených hráčok, hromadné označenie, individuálne meškanie a potvrdené uloženie v pamäti (19 prítomných, 1 meškanie). DOM bez vodorovného pretekania na 1280 × 800, 320 × 740 a 390 × 844; stavové tlačidlá pri 320 px majú výšku aspoň 74 px. `preview_snapshot` stále vracia `PreviewAutomationExecutionError`; snímková kontrola nie je potvrdená. Náhľad na porte 3000 ostáva spustený. Skutočné uloženie cez Auth/PostgREST a paralelné spojenia toto overenie nenahrádza.
- Pracovné súbory už nemajú konfliktné značky a `git diff --check` prešlo. Index nebol menený automatickým stagingom: pred budúcim commitom treba pripraviť vyriešené pracovné verzie, nie commitnúť starý obsah indexu. Žiadny commit, push, merge, vzdialená migrácia ani nasadenie.

Ďalší krok: obnoviť prístup k migračnej histórii vyhradeného Supabase, potvrdiť predchodcov, aplikovať štyri chýbajúce migrácie v poradí a vykonať hosted attendance/notes acceptance vrátane súbehu, revokácie a obnovenia stránky. Samostatne sledovať opravu vývojovej závislosti `braces`; neznižovať Next.js/ESLint na nekompatibilnú hlavnú verziu.

Nasledujúce staršie výsledky sú historické. Tri pôvodné chyby súkromných polí už opravuje zachovaný bezpečnostný audit; nie sú aktuálnymi zlyhaniami.

## Pokračovanie auditu oprávnení — 22. október

- Obnovený skutočný stav: vetva `feature/authenticated-workflow-acceptance`, commit `99e375d`, čistý pracovný strom. Rozpracované zmeny boli už v commite. Prvý beh mal **169 úspešných a 9 zlyhávajúcich testov (178 spolu)**, nie hlásených 218/3. Všetkých deväť zlyhaní boli reprodukované bezpečnostné chyby v už pridanom audite; žiadny test nebol vypnutý.
- Dve nové, lokálne overené migrácie: `20261022081940_access_integrity.sql` a `20261022081942_private_fields_and_access_context.sql`. Pôvodných 18 migrácií zostalo bez zmeny. Spolu **20 lokálnych migrácií, 19 RLS tabuliek a 26 verejných RPC**; typy regenerované z PGlite.
- Udalosť s odpoveďami, skutočnou dochádzkou alebo internými poznámkami nemožno presunúť do iného tímu. Väzby udalosti/hráča sú nemenné; databáza určuje autora a čas zápisu účasti aj platieb. Zápisy do udalosti používajú zámok spoločný s úpravou jej tímu. Bežné opravy a presun prázdnej udalosti zostali funkčné. Finančný audit zostáva zachovaný; duplicitný audit oznamov bol odstránený.
- Aktuálna rola a rodinná väzba sa preverujú aj pri kombinovaných rolách. Odobratie poslednej roly uzatvára klubový prístup. Nový minimálny `viewer_context` poskytuje aktuálne finančné oprávnenie; neobsahuje Auth ID ani dátum narodenia.
- Column grants zakazujú priame čítanie/filtrovanie Auth ID, presného dátumu narodenia a zoznamu adresátov. Úzke RPC zachovávajú oprávnené osobné/rodičovské/administrátorské čítanie, prepojenie účtu a audit. Oznam príjemcovi neprezrádza ďalších adresátov; správca môže publikum naďalej upravovať. Trénerovi sa presný dátum narodenia neposkytuje.
- Server Actions overujú starý aj nový tím udalosti, aktuálne trénerstvo, oprávneného hráča/rodiča, platné členstvo a všetky tímy publika oznamu pred zápisom. RLS ostáva konečnou kontrolou pri súbehu a priamom API prístupe. Navigácia aj priame stránky blokujú členský adresár osobným rolám a financie bez oprávneného rozsahu. Profily vlastných/prepojených členov zostávajú dostupné cez scoped detail.
- Pridaných **72 regresných prípadov**: 30 databázových, 37 izolovaných testov Server Actions a 5 testov priamych stránok. Aktuálne `npm test -- --reporter=dot`: **250/250, 14 súborov** (161 PGlite, 89 unit/mocked). Test nad 1 000 záznamov najprv prekročil pôvodných 20 s; optimalizované boli statement-local RLS kontroly a výpočet stavu účtu iba na zobrazenej stránke. Limit a rozsah testu sa nezmenili.
- Finálny `npm run check`, produkčný build a T3 kontrola: výsledok sa doplní po dokončení overenia.

### Živá databáza a blokátory

- Read-only preflight: **11/11**. Pôvodný kontrakt živej databázy: **64/64** kontrol Auth/PostgREST, vrátane štyroch aktívnych rolí a deaktivovaného účtu. Toto overuje existujúcu schému, nie nové opravy.
- Aktualizovaný `npm run test:live`: **26 úspešných, 5 blokovaných**, pretože `viewer_context` na vzdialenej Data API chýba (`PGRST202`). Neúspech schémy sa nepočíta ako úspešné odmietnutie oprávnenia.
- Nový read-only `npm run db:status` zisťuje verzie, neznáme migrácie a nesprávne poradie. Teraz blokovaný: **Management HTTP 401**. Priame TLS pripojenie cez štandardný DB hostname skončilo `ENOTFOUND`. Aktuálnu vzdialenú migračnú históriu preto nemožno potvrdiť; **18 aplikovaných migrácií je historicky doložený stav z 18. októbra**.
- Nové dve migrácie neboli vzdialene aplikované. Žiadne vzdialené klubové záznamy neboli vytvorené, upravené ani odstránené; live runner iba prihlásil a odhlásil vlastné testovacie relácie. Reporty sú v ignorovanom `test-results/`, bez prihlasovacích údajov.

### Nasledujúce úlohy

1. Obnoviť súkromne prístup k histórii testovacieho Supabase; spustiť `npm run db:status`. Potvrdiť presných 18 predchodcov a následne aplikovať iba uvedené dve migrácie v poradí, bez seedu/resetu. Aplikácia teraz vyžaduje nový RPC kontrakt; nenasadzovať ju pred migráciami.
2. Zopakovať aktuálny live runner a celý negatívny audit cez Auth/PostgREST; overiť aj súbeh vloženia účasti/poznámky s presunom udalosti v samostatných databázových reláciách. PGlite to nenahrádza.
3. Pokračovať v živých úpravách/revokácii/súbehu poznámok a autentifikovaných mobilných formulároch, potom rodinné a finančné workflow. SMTP/doména, pozvánky pri čiastočnom zlyhaní, obnova zálohy a nasadenie ostávajú otvorené.

Graphify bol použitý bez obnovy grafu; zdroje skontrolované priamo, pretože graf predchádza auditu. Žiadny skorší klubový repozitár ani agent nebol použitý. Supabase skill/konektor v tejto relácii nebol dostupný; overené boli oficiálne dokumenty RLS/column grants a existujúce lokálne nástroje. Použité React, frontend-design a Impeccable pravidlá; branding a logo zachované. Žiadny commit, push, merge alebo nasadenie.

## Historické míľniky
### Historical attendance verification - 2026-10-21

## Trénerova dochádzka — 21. október

- Existujúci detail udalosti má nový mobilný súpis so štyrmi priamymi stavmi, neoznačeným východiskovým stavom, počtami, vyhľadávaním, filtrom neoznačených, označením celého tímu a spoločným uložením. Doplnili sa priame vstupy z dochádzky, tímu a trénerovho prehľadu; kalendár používa rovnaký detail. Plánované odpovede zostávajú oddelené. Stručný kontext tréningu zachováva dátum/čas, miesto, tím a dostupné pokyny bez veľkého úvodného bloku.
- Jedna nová lokálna migrácia rozširuje existujúcu tabuľku a RPC: meškanie, dôvod, verzie, atomická dávka, kontrola konfliktov, bezpečné opakovanie, databázový autor/čas a audit. Zachováva historické záznamy po zmene členstva, blokuje zrušené udalosti a presun udalosti so súkromnými záznamami do iného tímu. RLS a server kontrolujú aktuálne roly/pridelenia; odobratie poslednej roly aj deaktivácia účinkujú bez obnovy JWT.
- Východiskové testy pred zmenami: **169 prešlo, 9 zlyhalo**. Opravených je šesť súvisiacich regresií. Tri pôvodné zlyhania mimo pracovného postupu dochádzky zostávajú: priame čítanie Auth identifikátora profilu, dátumu narodenia a zoznamu adresátov oznamu. Testy ostali zachované; úplný zelený výsledok sa netvrdí.
- T3 náhľad s 20 fiktívnymi hráčkami: označenie, hromadná akcia a vrátenie, výnimky, dôvod, uloženie a znovuotvorenie, filtrovanie, zachovanie zmien pri chybe, konflikt a zrušenie overené. DOM rozmery na **1280 × 800, 390 × 844 a 320 × 740** bez vodorovného pretekania; stavové tlačidlá na mobile minimálne 60 px vysoké. `preview_snapshot` na detaile opakovane zlyháva, ostatné T3 nástroje fungujú; vizuálne screenshotové schválenie nie je potvrdené.
- Záverečné overenie: **`npm run check` prešlo** (TypeScript + ESLint); **`npm test`: 218 prešlo / 3 pôvodné zlyhania, spolu 221 testov v 15 súboroch**. Všetkých **43 nových testov** prešlo. **`npm run build` prešlo**. `git diff --check` bez chýb bielych znakov. Zostáva pôvodné upozornenie Vitest na ESM/CommonJS konfiguráciu.
- Produkčné zostavenie spustené lokálne na porte 3001: explicitný náhľad sa načíta s 20 neoznačenými hráčmi, na 320 px bez vodorovného pretekania. Živá databáza sa pri tejto kontrole nepoužíva. T3 snímkovanie zlyháva aj v produkčnom náhľade.
- **Živý Supabase:** nová migrácia nebola aplikovaná vzdialene; nové Auth/PostgREST, prehliadačové ukladanie do Supabase a skutočná paralelnosť spojení neboli overené. PGlite ani explicitný pamäťový náhľad ich nenahrádzajú. Podrobnosti a hranice: [ATTENDANCE.md](ATTENDANCE.md).
- Bez commitu, pushu, merge alebo nasadenia. Práca prebehla v hlavnej relácii, bez agentov a bez kontroly staršieho klubového repozitára. Použitý existujúci Graphify na navigáciu; starší graf nebol regenerovaný.

## Sidebar height correction — 19 October

- Preserved existing uncommitted branding/feature work. Changed only shell navigation structure/styles and relevant documentation: logo and user profile are fixed flex regions; season, primary links and administrative links share the available middle region. Native `overflow-y: auto` activates only when needed. An outer auto-scroll fallback keeps content accessible in exceptionally short windows; no scrollbar hiding or clipped links.
- At desktop heights up to 800 px, header minimum height is 128 px, navigation targets remain 44 px and vertical gaps tighten. Taller windows retain the 154 px header and 46 px links. Brand colors, role conditions, routing and mobile dialog behavior remain intact.
- T3 production-preview inspection/screenshots at **1366×768, 1440×900, 1920×1080**, plus DOM inspection at **1024×768**: sidebar and middle region have equal scroll/client heights, all nine links fit and profile bottom stays 20 px above the viewport edge. The two admin-only links were temporarily inserted into the preview DOM using source-matched labels/classes; these are layout stress fixtures, **not real authenticated admin or permission evidence**. Removed fixtures by navigation afterward.
- At **1280×600 and 1280×480**, only the middle region scrolls; at 480 px, keyboard Tab revealed the final administrative link with the profile still anchored. Scrolling the main page left sidebar top at 0 and sidebar scrollTop at 0. Mobile **390×844** visually checked; at **390×480**, focus revealed the last link without outer/horizontal overflow. Escape closed the drawer and returned focus to its trigger.
- `npm run check` (TypeScript/ESLint), `npm test` (**169 tests / 12 files**), `npm run build`, Impeccable layout detector (`[]`) and `git diff --check` passed. Existing Vitest config warning remains. No live Supabase operations or new authentication acceptance in this follow-up.
- Production preview restarted at `http://localhost:3000/ukazka`. No commit/push. No sidebar blocker found; next broader task remains the hosted notes acceptance matrix below.

## Current milestone — Bilíkova branding and fictional coach demo

- Resumed the uncommitted work on `feature/authenticated-workflow-acceptance` without restarting the redesign. Preserved the earlier notes, personal responses and UI changes. PRODUCT.md and DESIGN.md now record the user-confirmed **ŠŠK Gymnázium Bilíkova Bratislava** identity.
- Original supplied PNG is preserved byte-for-byte (6,834 bytes, 145 × 200 px). Shared identity/config supplies login, sidebar, mobile header, metadata and app icon; configurable authenticated name/HTTPS logo remains supported. The dedicated test club name was updated through administrator RLS, leaving other settings intact.
- Blue/white/red tokens now cover forms, tables, calendar, attendance, finances, announcements, details and shared states. Login/navigation composition was refined. Dashboard prioritizes the next event, program and direct tasks; summary metrics follow the working sections. Existing authentication, authorization, Slovak formatting and reduced-motion behavior remain. See [BRAND_REVIEW.md](BRAND_REVIEW.md).
- On 18 October, created the requested fictional coach account and seeded **3 teams, 30 players, 24 events, 90 attendance records, 30 availability responses, 6 announcements and 15 notes**. Coach scope is 2 teams/22 players; the third team and finances are inaccessible. Credentials remain only in ignored local files. Repeat seed passed without resetting later edits; existing records retained. See [DEMO_CLUB.md](DEMO_CLUB.md).
- Applied only reviewed additive migration `20261016090000_internal_notes.sql` to the explicitly matched test Supabase, transactionally recorded its history and reloaded PostgREST. Verified **18 migrations, 19 RLS tables, 21 public RPCs**. Authenticated coach/admin creation, coach RPC/SSR reads and guardian/unassigned-team isolation passed. Full hosted edit/revocation/concurrency/browser acceptance is still open.
- Final 19 October verification: `npm run check`, `npm test` (**169 tests / 12 files**) and `npm run build` passed. Existing Vitest CommonJS-config warning remains. **13 real coach Auth/local production SSR checks** passed again, plus **23 admin/guardian/player Auth/SSR/logout checks**, covering settings, members, fee plans/payments, announcements, notifications and role dashboards. These 36 checks use the dedicated fictional-data Supabase and local production app; they are not full browser mutation acceptance.
- First T3 pass covered login, all four role previews, teams, calendar, members, payments and training detail at selected 1280/768/390/320 px widths, without horizontal overflow or broken visible logos. Menu focus/Escape return and preview note submission passed. Preview interactions are separate from authenticated Supabase evidence.
- Final production T3 confirmation: dashboard at 1280, login/training at 390 and player view at 320 showed no overflow/broken visible logos. Visible mobile input text is 16 px; mobile brand target is 44 px. Corrected the close button's focus color on its white background and verified keyboard-visible red focus. Escape closure/focus return was confirmed after the exit animation; an early timing check was inconclusive. T3 final mobile screenshot capture failed, while DOM/keyboard inspection worked; a desktop screenshot was saved. No fallback browser or app workaround was added.
- Local production server retained at `http://localhost:3000` with explicit design previews enabled. `/ukazka` is unauthenticated fictional UI; `/prihlasenie` uses the real test accounts. Sanitized evidence: ignored `club-demo-http.json`, `club-brand-roles.json`, `brand-browser-report.json`; credentials remain ignored. `git diff --check` passed.

### Next task and remaining gates

1. Complete the remaining hosted notes matrix: second assigned coach editing denial, admin edits/audit, revoked author, concurrent versions and authenticated mobile mutation UI.
2. Finish the full authenticated role/device review, family-link/finance workflows, screen-reader and physical-device checks.
3. SMTP/domain, invitation partial-failure rehearsal, backup restoration and deployment remain separate release gates. No commit, push, merge or production deployment. Keep the local demonstration server available for the user.

## Historical local milestone — 2026-10-16

### UI refinement and internal notes

- Continued from clean branch `feature/authenticated-workflow-acceptance`, commit `8cbd61f`; preserved the committed Impeccable design system and shell. Used the existing Graphify graph for targeted navigation and confirmed current source; no broad re-extraction or subagents.
- Completed player-specific upcoming response presentation: pending/yes/no/maybe in the next event and program, direct links to response controls. Reads are bounded to five visible events, scoped to the current player's memberships and availability, including combined roles. Database errors remain errors.
- Refined member contacts/program composition and the shared training brief. Added full end dates for events crossing midnight. Internal notes use an open chronological list, responsive composition and existing focus-managed dialogs; reduced-motion rules also cover profile-link motion.
- User confirmed notes scope on 2026-10-16. Implemented notes for player profiles and individual training events: current assigned coaches/admin read, author/admin edit, immediate revocation, server-controlled authorship, 4,000-character limit, 25-row cursor pagination, optimistic edit version and audit of old/new content. Notes remain separate from availability reasons and public event instructions. See [INTERNAL_NOTES.md](INTERNAL_NOTES.md).
- Added migration `20261016090000_internal_notes.sql` and regenerated types: **18 local migrations, 19 RLS tables, 21 public RPCs**. **The new migration has not been applied to hosted Supabase.** Missing/unavailable notes show an honest section error while the existing profile/event stays usable. No fixture fallback.
- Local verification: **165 tests / 11 files passed** (PGlite plus unit tests, including server action authorization, direct database access, revocation, provenance, pagination and stale edits). Final TypeScript/ESLint and production build passed; production-preview confirmation also passed, including Escape focus return and mobile DOM order. Details in UI_REVIEW.md. Existing Vitest CommonJS warning remains.
- T3 production-preview checks at 1280, 768, 390 and 320 px: profile/training notes and all four player response states; no horizontal overflow in checked views. Preview form creation, repeated edits, validation focus, retained draft and retained version after error passed. This uses explicit fictional in-memory preview data, **not hosted note persistence**.
- Prior Impeccable shell/main-screen pass is committed in `8cbd61f`: its 113-test suite/check/build and final production-preview confirmation passed. Corrected the previously unfinished build entry in UI_REVIEW.md.
- No automatic commit, push, merge or deployment. Existing hosted schema and historical live evidence below are unchanged.

### Next task and remaining gates

1. Review/apply only the new notes migration to the dedicated fictional-data Supabase project, then verify real Auth/PostgREST creation/editing and denial for guardian/player/unassigned coach, revoked author and stale concurrent editor. No hosted notes acceptance is claimed here.
2. Complete the remaining authenticated UI review: settings, notifications, fee details, family-link pagination, empty/error/loading states and the full role/device matrix. Screen-reader and physical mobile-device checks remain open.
3. SMTP/domain and actual delivery, invitation partial-failure rehearsal, backup restoration and deployment remain separate release gates. Notes do not require SMTP.

## Latest live milestone — 2026-10-14 (historical evidence, not repeated here)

- Browser continuation: authenticated T3 checks passed for administrator settings persistence, venue/category defaults, two weekly events across Bratislava DST (22/29 October at 18:00), coach single-occurrence venue edit and actual attendance, guardian independent sibling response, and player own response/contact persistence. Desktop 1280x800 and mobile 390x844 were used; this is selected workflow coverage, not the complete role/device matrix. Details in M4_LIVE_ACCEPTANCE.md.
- Fixed reproduced UI issues: settings/audit/brand links now close mobile navigation; admin links indicate the active page; utility pages and fee plans show the correct section label. Verified mobile settings/audit navigation and Escape focus return in the rebuilt production app. Inaccessible/missing event details now show a Slovak unavailable page; actual database failures remain errors. Player denial and nonexistent UUID both verified, accessible event still works.
- User confirmed no domain yet. Added [SMTP_SETUP.md](SMTP_SETUP.md) with Resend/domain/DNS setup and delivery acceptance. Domain registration and provider configuration require manual action; no template PATCH retry, email send, purchase or upgrade this continuation.
- Final code checks: `npm run check`, `npm test` (113 tests / eight files), `npm run build` passed after both fixes. Existing Vitest configuration warning remains. No push, deployment, destructive cleanup or schema change. Existing uncommitted work preserved. Graphify reused without rebuilding (no extraction tokens; overall session token cost unavailable).

- New `live-auth-links.mjs --write-test-data`: 10 live invite/recovery checks passed using internally generated links, no mail sent. Real `/auth/confirm` and password Server Action tested, one-use tokens enforced, new-password login verified, unlinked identity denied club profiles. One fictional unlinked Auth identity retained; no automatic deletion. This is not email-delivery or Auth/profile invitation-linking acceptance.

- Dedicated fictional-data Supabase project configured: 17 applied migrations, 18 public tables with RLS, 19 public RPCs. Test Auth accounts and administrator bootstrap installed. No production records or deployment.
- Live account checks passed on 2026-10-14. All 17 mutation/workflow checks passed again: scoped coach/guardian/player access, role-escalation denial, separate availability/attendance, financial adjustments/reversal/audit, concurrent overpayment prevention and immediate deactivation without JWT refresh.
- Prior 50 real Next login/SSR/logout checks remain valid and were not repeated. T3 admin create/edit passed previously. The timed-out archive completed later (confirmed in the archive on this continuation); restoration now also passed, with direct DB readback showing the plan active at 1375 cents. Full browser matrix remains open.
- Hourly `volej-pending-attendance` Cron is installed; inspection found 13 successful scheduled runs and no failed status group on 2026-10-14. In-app reminder deduplication passed.
- Reloaded the replacement Management token. Auth template PATCH now passes authorization but returns HTTP 400: free-tier projects using the default email provider cannot customize templates without custom SMTP or a paid plan. Neither remote template matches the local version; nothing was claimed applied. Readback confirms disabled signup/anonymous login, minimum 12, site URL and allowed redirects. SMTP remains a separate pending task; no plan upgrade performed.
- Administrator member details now paginate family links (25 rows, validated UUID cursor, linked child profiles). Live workflow runner traverses guardian-dashboard pages so retained fictional records do not invalidate repeat runs.
- `npm run check`, `npm test` (113 tests / eight files) and `npm run build` passed. Existing Vitest CommonJS configuration warning remains.
- Existing Graphify reused without rebuilding. Node commands use system CA trust; direct database setup used verified Supabase TLS. Added pinned `postgres` development dependency. Reports and test credentials stay ignored; no credentials printed.
- Remaining gates: provider restriction on custom templates, SMTP/delivery, full authenticated browser acceptance, invitation partial-failure rehearsal, backup restoration and deployment checks. No production-readiness claim.

See [M4_LIVE_ACCEPTANCE.md](M4_LIVE_ACCEPTANCE.md) for commands and evidence. Entries below are historical, including resolved blockers.

## Historical milestones - 2026-10-09

## Current phase

Phase 10: remaining functionality and acceptance. See [REQUIREMENTS_GAPS.md](REQUIREMENTS_GAPS.md) for the completed/partial/missing assessment against the original master specification. Existing work preserved; no commits or remote yet. No production-readiness claim.

## Latest completed milestone

- Attendance: 25-row composite-cursor history; player/name/status filters; SQL totals across the complete filtered history. Removed the 200-row statistics cutoff.
- Announcements: important-first pagination, literal text search and archive filtering; multi-team and explicitly selected-member audiences. Coaches must manage every selected team; named audiences require admin. Authorship remains immutable and changes are audited.
- Announcement notifications carry a source ID. Current audience/relationship permissions are rechecked; audience expansion notifies newly eligible recipients once. Legacy source-less announcement notices are retained but hidden.
- Searchable, paginated selectors for announcements, fee assignment/plans, guardian linking, team assignment and event team selection. Existing values persist; all lookups use authenticated RLS. Calendar filter dropdowns still need migration.
- Financial corrections: immutable `charge_adjustments` record requested total, database-derived delta, reason, actor and time. Charge row locks serialize adjustments with payments. Original charges are preserved; reductions below received payments are rejected. Zero cancels an unpaid charge. Totals, payment limits, notifications and audit incorporate corrections; correction history is paginated.
- Eleven migrations, 18 RLS tables, 13 public RPCs; generated types updated. No hosted migrations applied.

## Actual verification

- `npm test`: **75 passed**, six files (62 integration / 13 unit). Covers >1,000-record history/statistics/selectors, cursor tie-breakers, audience scope/revocation, notification deduplication, correction audit/immutability, financial limits and role isolation.
- `npm run check`: TypeScript and ESLint passed.
- `npm run build`: passed, including route generation.
- `npm run db:types`: passed after schema changes.
- Two initial notification assertions counted existing charge notifications; corrected them to count the announcement's source ID. No production authorization relaxed.
- Generated backup directories caused TypeScript to discover stale validators; narrowly excluded `.next/cache` and `*-.next` artifacts from checks. Original artifacts preserved. Prior OneDrive cleanup issue did not block the final build.
- Graphify reused and code graph updated: **511 nodes / 1,299 edges / 33 communities**. No semantic/deep extraction; documentation semantics remain stale. Zero extraction counters do not represent total session usage.
- New selectors, financial corrections and authenticated workflows remain unverified in a browser/live Supabase. Prior mobile/desktop preview checks are not acceptance for these changes. No restriction bypass attempted.
- Existing Vitest CommonJS-config warning remains. Prior production dependency audit was clean; prior full dev audit reported five high findings from `braces`. Audit not repeated this milestone.

## Next recommended work

1. Calendar/detail-list pagination and filter options; calendar attendance indicators.
2. Parent/coach read-only profile/contact views, dashboard team/child/activity completeness, settings defaults.
3. Pending-response notification producer/scheduler with deduplication.
4. Structured fee periods and fee-plan management; richer charge metadata/reassignment corrections and multi-charge allocation as follow-up scope.
5. Full live Auth/PostgREST/UI acceptance, accessibility, performance/concurrency testing, production headers and backup restore.

## External blockers

No hosted Supabase credentials, Docker/Postgres service or SMTP configuration supplied. PGlite does not verify hosted Auth, PostgREST, delivery or multi-session concurrency. Browser server startup was previously rejected by environment approval policy; not retried through a bypass. Invitation Auth creation/profile linking remains non-atomic and needs reconciliation after partial failure. No deployment performed.

## Milestone in progress — reminders and scoped views

83 tests, TypeScript/ESLint and production build passed. Added deduplicated 48-hour in-app reminders (self refresh and authorized event dispatch), trusted hourly schedule installer, scoped parent/coach profile views, paginated team/event rosters, paginated calendar with response indicators and searchable team filter, dashboard team/activity/attendance improvements. The calendar reuses a materialized authorized roster to avoid repeated RLS work. Cron installation and new authenticated UI remain externally unverified. Next: fee periods and fee-plan maintenance, then refresh the requirements audit.

## Completed continuation - fee periods and plan maintenance (2026-10-09)

This milestone supersedes older counts and next-work lists above.

- Reused existing Graphify data without rebuilding; targeted source inspection confirmed finance dependencies. Preserved the existing empty charge-period migration and added a separate migration.
- Admin-only `/klub/platby/plany`: create/edit/archive/restore, active/archive views and 25-item UUID cursor pagination. Replaces the unbounded overview on the payments page.
- New charge forms require inclusive start/end dates. Server validation and database constraints reject invalid ordering; the database also rejects incomplete and infinite periods. Legacy/API charges may retain both dates as null; no periods inferred from labels. Detail displays dates or an explicit unknown-period label.
- Existing admin RLS and audit triggers protect plan mutations. A new database trigger rejects assignments to archived plans and locks against concurrent archival. Plan edits preserve issued charges/payments.
- Verification: `npm run db:types`, `npm run check`, `npm test` (97 passed, six files), `npm run build` and `git diff --check` passed. Tests include 1,001-plan traversal, audit, preserved charges, archive/restore, relationship-scoped reads, inactive/coach/guardian mutation denial and invalid periods. PGlite does not verify live multi-session concurrency.
- Local dev server and T3 preview now work, superseding the historical startup blocker. The protected plan route correctly redirected to `/nastavenie` without Supabase configuration. Authenticated UI remains unverified. No hosted migrations or deployment. Existing Vitest configuration warning remains.
- Next: configured venue/category defaults, richer per-child dashboard summaries and broader requirements audit refresh. Charge metadata corrections/reassignment and multi-charge allocation remain follow-up scope. Live Supabase/Auth/SMTP, scheduler installation and authenticated browser acceptance require external configuration.

## Completed continuation - settings and guardian dashboard (2026-10-09)

- Existing Graphify data reused without rebuilding. Verified that event venue defaults were already wired; connected configured team categories on create/edit, preserved legacy category values, allowed explicit custom categories when no list exists, and normalized/validated settings entries.
- Added security-invoker `guardian_dashboard` RPC (19 public RPCs total): four children per page with full count, next scheduled event/own response, complete actual-attendance totals and corrected/paid balance. Current family links, active profiles and player role checked under caller RLS; no user-supplied guardian identity.
- Parent cards expose profile/calendar links, pending response and empty states. Combined coach+guardian count now matches its label. New data never uses fixtures on query failure.
- Added explicit `/ukazka?view=rodic` fictional preview, isolated behind the existing preview flag. T3 inspected desktop 1280x800 and mobile 390x844; two child cards rendered and no horizontal document overflow on mobile. This is visual preview evidence, not authenticated acceptance. Historical shared-tab Electron/HMR log errors existed from the prior server; no clean-console claim.
- Verification: 109 tests across seven files pass, including family isolation/revocation, inactive child filtering, separate sibling responses/balances, pagination and coach+guardian scope. Initial typecheck caught the preview's broad role type; aligned DashboardData with shared Role. TypeScript/ESLint and production build passed after that correction; final checks repeated after small category/preview-link alignment.
- Refreshed FEATURES.md and REQUIREMENTS_GAPS.md; added LIVE_ACCEPTANCE.md with staging configuration, master workflow, direct-API checks and result expectations. Supabase staging can be configured now. All live scenarios remain not run; no hosted migrations/deployment.
- Remaining: live Auth/PostgREST/SMTP, scheduler installation, concurrency and authenticated UI acceptance; admin family-link pagination, player dashboard response refinement and invitation partial-failure rehearsal. Financial metadata/reassignment/allocation remain follow-up scope. These do not prevent starting staging integration testing.

## M4 live integration preparation - 2026-10-09

- Existing Graphify graph reused for Auth/server/role relationships. Requested M4_LIVE_ACCEPTANCE.md was absent in this checkout; added docs/M4_LIVE_ACCEPTANCE.md as the execution ledger and configuration guide, retaining the full LIVE_ACCEPTANCE.md scenario matrix.
- User is creating a new dedicated test project. Presence-only inspection found no Supabase URL/public key/server key or CLI credentials configured. Docker executable was not found. No hosted database commands, migrations, test records or account changes performed.
- Added `npm run live:check` for read-only Auth settings and anonymous table/RPC checks; `npm run test:live` for private test-account login, identity/profile/role reads, scoped RPCs, coach financial isolation and sampled guardian/player record scope. Account tests require matching LIVE_TEST_PROJECT_URL; no service key used. The runner never modifies club records and signs out only its test session.
- Secret/service-role keys in the public-key slot are rejected. Network/schema errors cannot pass as authorization denial. Reports contain fixed labels/status only and go to gitignored test-results. Confirmed .env.local and .env.live.local are ignored.
- `npm run live:check`: BLOCKED on absent connection configuration; no live success claimed. Mutation policies, session revocation, SMTP, real UI workflows and concurrency remain not run.
- Local verification: 113 tests across eight files, npm run check, npm run build and git diff --check passed. Existing Vitest config warning remains.
- Next user step: privately configure .env.local for the new empty project and report readiness (no secrets in chat). Then inspect remote migration history/dry-run before applying the reviewed migrations, bootstrap a test administrator, create disposable accounts and execute the live matrix. Destructive changes require confirmation.
