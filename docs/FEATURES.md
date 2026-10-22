# Feature status - 2026-10-22

## Aktuálne doplnenie — oprávnenia

- Lokálne dokončené: serverové kontroly tímov, osobnej/rodičovskej odpovede a publika oznamov; odobratie poslednej roly a rodičovskej roly bez obnovy JWT; nemenné väzby účasti a ochrana presunu udalosti so súkromnou históriou.
- Osobné roly nemajú členský adresár. Tréner číta dostupné profily a spravuje iba priradené tímy. Finančné stránky a navigácia používajú aktuálnu oprávnenosť administrátora, dospelého hráča alebo rodiča s prepojením; samotný tréner financie nezískava.
- Minimalizované údaje: Auth identifikátory sa nevracajú v profiloch/adresári, presný dátum narodenia nie je dostupný trénerovi a adresný oznam neodhaľuje ďalších príjemcov. Administrácia účtu, oprávnené osobné údaje a audit používajú úzke RPC.
- **250/250 lokálnych testov**, 14 súborov: 161 PGlite a 89 unit/mocked; 72 nových prípadov. Podrobné výsledky a limity: [PROGRESS.md](PROGRESS.md), aktuálne pravidlá: [ACCESS_CONTROL_MATRIX.md](ACCESS_CONTROL_MATRIX.md).
- **Dve nové migrácie čakajú na živé overenie/aplikovanie.** Lokálne 20 migrácií / 19 RLS tabuliek / 26 RPC. Historicky na teste aplikovaných 18; aktuálnu históriu blokuje Management HTTP 401. Existujúci živý kontrakt prešiel 64 kontrolami; nový runner má 26 úspešných a 5 blokovaných kvôli chýbajúcemu `viewer_context`. Nové opravy zatiaľ nemajú hosted acceptance.

Nasledujúce odseky opisujú historický stav do 19. októbra; aktuálne blokátory a postup majú prednosť.

Implementation and local verification are separate from live acceptance. See [requirements gaps](REQUIREMENTS_GAPS.md) and the [live acceptance runbook](LIVE_ACCEPTANCE.md).

Sidebar layout follow-up (19 October): fixed logo/profile with an independently scrollable navigation region only when content exceeds available height. Laptop spacing retains 44 px targets; 768/900/1080 px desktop heights fit without a sidebar scrollbar. Verified production-preview desktop/mobile layout, short-window keyboard access and Escape focus return; admin-only links were DOM-only layout fixtures, not an authenticated permission test. `npm run check`, all 169 tests and `npm run build` passed. No database or authorization changes.

Latest continuation: the original **Bilíkova** logo and blue/white/red identity cover the shared shell, login, navigation, metadata and operational screens. Dashboard composition prioritizes the program and tasks. **169 local tests, TypeScript/ESLint, production build and 36 test Auth/local SSR checks passed on 19 October**; scope and browser limitations are in [progress](PROGRESS.md). Internal player/training notes are implemented and their additive migration is applied to the dedicated test Supabase. Selected creation/read/isolation checks passed; full hosted edit/revocation/browser acceptance remains open. See [brand review](BRAND_REVIEW.md), [fictional coach demo](DEMO_CLUB.md) and [notes](INTERNAL_NOTES.md).

Earlier authenticated T3 admin/coach/guardian/player checks passed selected settings/defaults, DST recurrence, one-occurrence edits, attendance, sibling availability and player contacts. Those checks do not cover the new notes. Full browser finance, family administration, accessibility and failure-path acceptance remain open. [SMTP setup](SMTP_SETUP.md) still requires the club domain/provider. No delivery, push or deployment this continuation.

| Module          | Implemented                                                                                                                         | Remaining                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Foundation/auth | Next.js, Slovak/EUR/Bratislava, 19 local/hosted RLS tables, additive roles, immediate deactivation, invite/recovery/bootstrap | Complete hosted notes matrix; SMTP/session acceptance; invitation failure rehearsal |
| Members/teams   | CRUD, archive, family links, scoped parent/coach profiles, searchable assignments, paginated directories/rosters/admin family links | Live browser family-link pagination acceptance                                                |
| Calendar/events | Month/week/agenda, DST recurrence/exceptions, matches, paginated calendar, searchable filters, response indicators                  | Live calendar/edit/filter acceptance and representative load                                  |
| Attendance      | Planned responses separate from actual attendance; audited corrections; filtered paginated history and complete aggregates          | Live coach/guardian workflow and concurrency                                                  |
| Communication   | Scoped multi-team/named notices, search/archive pagination, audit, deduplicated 48-hour reminders and hourly schedule installer     | Broader live recipient checks; SMTP email delivery                                            |
| Finance         | Plans with edit/archive/restore and pagination; dated charges; partial payments, reversals, immutable corrections and full balances | Charge reassignment/date corrections, multi-charge allocation; live financial workflow        |
| Dashboards      | Team/activity/attendance/finance summaries, paginated child summaries; own player response on upcoming events with direct response links | Live verification of the new personal response presentation and combined roles |
| Internal notes | Player/training notes; assigned coach/admin reads, author/admin edits; audit, pagination and versions; migration applied with selected live checks | Complete hosted edit/revocation/concurrency/browser matrix |
| Settings        | Club branding/contact, venue defaults, configured team-category choices with legacy-value preservation                              | Live form and persistence acceptance                                                          |
| Brand/UI | Official Bilíkova logo, blue/white/red tokens, club navigation/login, time-led dashboard and responsive shared components | Full authenticated role/device acceptance |
| Validation      | 169 local tests; TypeScript/ESLint/build; selected T3 previews at 320–1280 px; 36 real test Auth/local SSR checks across four roles | Full role E2E, screen-reader/physical-device/security/performance, restore rehearsal |

Test Supabase is configured: **18 migrations, 19 RLS tables, 21 RPCs**. Historical live role/17 workflow checks and 13 successful scheduler runs were recorded on 14 October; seeded coach scope and 13 new Auth/local SSR checks passed on 18 October. Broader browser mutation and SMTP acceptance remain open. No deployment or production readiness claim. Online payment processing and complex chat remain out of scope.

## M4 live-testing tooling

Added read-only live preflight and authenticated role smoke commands, guarded private account configuration and sanitized ignored reports. Execution guide: [M4_LIVE_ACCEPTANCE.md](M4_LIVE_ACCEPTANCE.md). The historical M4 milestone had 113 passing local tests; the latest suite has 169. Earlier live connection/Auth/PostgREST and scripted mutation scenarios passed; full browser acceptance remains pending. Auth template PATCH is blocked by the free-tier default-provider restriction (HTTP 400); the replacement token is authorized. Custom SMTP or a paid plan is required. SMTP delivery is unverified.

Authenticated T3 administrator fee-plan create/edit and reload persistence passed; mobile 390px layout had no horizontal overflow. The archive initially timed out but completed later; subsequent restore and the active 1375-cent value were verified. Broader browser matrix remains open.

TokenHash invite/recovery integration: 10 new live checks passed without sending email (confirmation, replay denial, password form, login, unlinked account isolation). Remote templates remain unapplied due to the provider restriction. Delayed fee-plan archive and subsequent restore confirmed; active state and 1375-cent amount verified. Full invitation/profile/email and browser acceptance remain open.
