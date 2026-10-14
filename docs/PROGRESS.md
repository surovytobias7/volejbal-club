# Progress - 2026-10-14

## Current live milestone (supersedes the historical entries below)

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
