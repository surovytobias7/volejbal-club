# Feature status - 2026-10-14

Implementation and local verification are separate from live acceptance. See [requirements gaps](REQUIREMENTS_GAPS.md) and the [live acceptance runbook](LIVE_ACCEPTANCE.md).

| Module          | Implemented                                                                                                                         | Remaining                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Foundation/auth | Next.js, Slovak/EUR/Bratislava, 18 RLS tables, additive roles, immediate deactivation, invite/recovery/bootstrap                    | Live Auth/SMTP/session acceptance; invitation partial-failure rehearsal and reconciliation UI |
| Members/teams   | CRUD, archive, family links, scoped parent/coach profiles, searchable assignments, paginated directories/rosters/admin family links | Live browser family-link pagination acceptance                                                |
| Calendar/events | Month/week/agenda, DST recurrence/exceptions, matches, paginated calendar, searchable filters, response indicators                  | Live calendar/edit/filter acceptance and representative load                                  |
| Attendance      | Planned responses separate from actual attendance; audited corrections; filtered paginated history and complete aggregates          | Live coach/guardian workflow and concurrency                                                  |
| Communication   | Scoped multi-team/named notices, search/archive pagination, audit, deduplicated 48-hour reminders and hourly schedule installer     | Broader live recipient checks; SMTP email delivery                                            |
| Finance         | Plans with edit/archive/restore and pagination; dated charges; partial payments, reversals, immutable corrections and full balances | Charge reassignment/date corrections, multi-charge allocation; live financial workflow        |
| Dashboards      | Teams without upcoming events, activity, attendance/finance, paginated child cards with next event/response/history/balance         | Richer player-specific response badges; live acceptance                                       |
| Settings        | Club branding/contact, venue defaults, configured team-category choices with legacy-value preservation                              | Live form and persistence acceptance                                                          |
| Validation      | 113 local tests; TypeScript/ESLint/build; isolated desktop/mobile T3 parent preview                                                 | Full live role E2E, authenticated UI/accessibility/security/performance, restore rehearsal    |

Test Supabase is configured: 17 migrations applied, live role checks and 17 database workflow checks pass. Scheduler has 13 successful automatic runs. Browser mutation and SMTP acceptance remain open. No deployment or production readiness claim. Online payment processing and complex chat remain out of scope.

## M4 live-testing tooling

Added read-only live preflight and authenticated role smoke commands, guarded private account configuration and sanitized ignored reports. Execution guide: [M4_LIVE_ACCEPTANCE.md](M4_LIVE_ACCEPTANCE.md). Local suite now has 113 passing tests; check/build pass. Live connection/Auth/PostgREST and the scripted mutation scenarios pass; full browser acceptance remains pending. Auth template PATCH is blocked by the free-tier default-provider restriction (HTTP 400); the replacement token is authorized. Custom SMTP or a paid plan is required. SMTP delivery is unverified.

Authenticated T3 administrator fee-plan create/edit and reload persistence passed; mobile 390px layout had no horizontal overflow. Archive confirmation timed out; read-only DB inspection confirmed the plan remains active at 1375 cents. Broader browser matrix remains open.

TokenHash invite/recovery integration: 10 new live checks passed without sending email (confirmation, replay denial, password form, login, unlinked account isolation). Remote templates remain unapplied due to the provider restriction. Delayed fee-plan archive and subsequent restore confirmed; active state and 1375-cent amount verified. Full invitation/profile/email and browser acceptance remain open.
