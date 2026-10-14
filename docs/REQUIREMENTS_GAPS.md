# Requirements gap analysis - 2026-10-14

Refreshed against the preserved requirements assessment and latest implementation milestones. Graphify supplied navigation; targeted source inspection verified settings, dashboard, finance and scoped-profile details. This is not a new review of an earlier repository or a live acceptance claim.

Completed implementation below means a workflow exists, not that hosted Auth/PostgREST/UI has passed. Scripted Auth/RLS and 17 database workflow checks now pass; browser acceptance remains incomplete. See M4_LIVE_ACCEPTANCE.md for evidence and limits.

| Requirement                                               | Implementation                        | Remaining evidence or scope                                                                                                                          |
| --------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single club, Slovak, EUR, Bratislava/DST                  | Completed                             | Live time-zone rendering                                                                                                                             |
| Additive admin/coach/player/guardian permissions          | Completed locally                     | Core live API and immediate deactivation checks pass; broader combined-role browser acceptance remains                                               |
| Login/logout, recovery, activation/invitations, bootstrap | Completed with operational limitation | Auth/profile linking is non-atomic; manual reconciliation documented. Live email/session flows and failure rehearsal required                        |
| Administrator dashboard                                   | Completed core                        | Counts, activity, upcoming events, attendance and finance present; live totals/performance                                                           |
| Coach/player/parent dashboards                            | Completed core, refinement open       | All accessible team cards, child cards with response/attendance/balance and pagination. Player-specific upcoming response badges remain a refinement |
| Team CRUD/archive/categories/membership                   | Completed                             | Configured category selection preserves legacy values; live forms                                                                                    |
| Member profiles and family links                          | Completed core                        | Scoped parent/coach read-only views exist. Admin family links now use 25-row cursor pagination; browser traversal remains to verify                  |
| Recurrence, exceptions, event types and matches           | Completed                             | Live DST/notification acceptance; per-event coach override optional                                                                                  |
| Planned availability and actual attendance                | Completed                             | Separate records, reasons, audited corrections; live workflow/concurrency                                                                            |
| Attendance history/statistics                             | Completed                             | Paginated filters and full SQL totals; representative hosted load                                                                                    |
| Calendar views, filters, indicators and detail rosters    | Completed                             | Calendar and rosters paginated, selectors searchable; live keyboard/mobile workflow                                                                  |
| Club/team/named announcements and archive                 | Completed                             | Important-first search/pagination, scoped recipients and audit; live audience changes                                                                |
| Fee definitions, periods, assignment and due dates        | Completed                             | Editable/archivable/restorable plans; dated charge periods, legacy unknown periods preserved; live forms                                             |
| Partial payments, balance, overdue and history            | Completed                             | Exact aggregates and append-only ledger; live concurrent writes                                                                                      |
| Financial corrections and audit                           | Completed core                        | Immutable total corrections and payment reversal; charge metadata/reassignment and multi-charge allocation remain follow-ups                         |
| Event/announcement/finance notifications                  | Completed                             | Relationship revocation and deduplication local tests; live notifications                                                                            |
| Pending-response reminders                                | Completed implementation              | 48-hour in-app producer and hourly installer exist; Supabase Cron installed with 13 successful scheduled runs; broader recipient acceptance remains  |
| Club settings and branding                                | Completed core                        | Name/logo/contact, venue default and category choices wired; live persistence                                                                        |
| Premium responsive UI/UX                                  | Partial acceptance                    | Existing visual system retained; parent cards inspected on desktop/mobile. Authenticated forms, screen-reader and keyboard acceptance outstanding    |

## Engineering and operational gaps

- 113 local tests plus typecheck/lint/build. PGlite verifies SQL/RLS contracts, not hosted Auth, PostgREST or independent concurrent sessions.
- Pagination covers main directories, calendar, rosters, history, plans and parent cards. Bounded dashboard previews are deliberate. Admin family links are now paginated; representative performance still needs verification.
- Supabase outages must show honest errors. No fixture fallback or privileged client used for ordinary reads/writes.
- Session expiry, deployed CSP/cookies/origin behavior, database advisors and full security/accessibility review remain unverified.
- Privacy retention/export/removal ownership, backup restoration, real SMTP and deployment remain operational release gates.

## Next work and readiness

The dedicated Supabase test project is configured and scripted integration checks pass. Continue the remaining browser/email scenarios in [LIVE_ACCEPTANCE.md](LIVE_ACCEPTANCE.md); further local feature work cannot substitute for acceptance. Credentials must be configured privately, not pasted into chat. T3 browser and local server are available.

In parallel or after acceptance findings: improve player-specific response presentation, rehearse invitation partial failure, and prioritize financial metadata/allocation extensions if required. These remaining refinements have not been claimed completed.

Outside initial scope: online payment processing/card storage, complex chat, external push beyond account email flows and multi-tenant SaaS. Optional event-coach overrides and automatic announcement expiry remain extensions; archival exists.

Seventeen hosted migrations and scripted live role/workflow checks completed. Full browser/email acceptance, deployment and production readiness are not claimed. Template application awaits resolution of the free-tier default-provider restriction (custom SMTP or paid plan); token permissions are now sufficient. SMTP remains absent.

TokenHash invite/recovery integration: 10 new live checks passed without sending email (confirmation, replay denial, password form, login, unlinked account isolation). Remote templates remain unapplied due to the provider restriction. Delayed fee-plan archive and subsequent restore confirmed; active state and 1375-cent amount verified. Full invitation/profile/email and browser acceptance remain open.
