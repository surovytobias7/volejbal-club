# Requirements gap analysis - 2026-10-26

Aktualizácia: lokálna skúška čiastočného zlyhania pozvánok je dokončená (serverové chyby, overenie identity, nepripojený účet, oprávnená obnova a audit); hosted skúška a SMTP zostávajú otvorené. Celkovo 350 lokálnych testov, check a build prešli. Hlavný Graphify graf je obnovený. Aktuálnu migračnú históriu blokuje Management HTTP 401; aktuálne lokálne počty sú 22 migrácií / 19 tabuliek / 27 RPC. Staršie živé výsledky a počty nižšie sú historické. Podrobnosti: [PROGRESS.md](PROGRESS.md), [INVITATIONS.md](INVITATIONS.md).

Refreshed against the preserved requirements assessment and latest implementation milestones. Graphify supplied navigation; targeted source inspection verified settings, dashboard, finance and scoped-profile details. This is not a new review of an earlier repository or a live acceptance claim.

Completed implementation below means a workflow exists, not that hosted Auth/PostgREST/UI has passed. Scripted Auth/RLS and 17 database workflow checks now pass; browser acceptance remains incomplete. See M4_LIVE_ACCEPTANCE.md for evidence and limits.

| Requirement                                               | Implementation                        | Remaining evidence or scope                                                                                                                          |
| --------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single club, Slovak, EUR, Bratislava/DST                  | Completed                             | Live time-zone rendering                                                                                                                             |
| Additive admin/coach/player/guardian permissions          | Completed locally                     | Core live API and immediate deactivation checks pass; broader combined-role browser acceptance remains                                               |
| Login/logout, recovery, activation/invitations, bootstrap | Completed with operational limitation | Auth/profile linking is non-atomic; manual reconciliation documented. Live email/session flows and failure rehearsal required                        |
| Administrator dashboard                                   | Completed core                        | Counts, activity, upcoming events, attendance and finance present; live totals/performance                                                           |
| Coach/player/parent dashboards | Completed locally | Player-specific upcoming response states and direct response links now implemented; scoped to own player memberships. New combined-role hosted/browser verification remains. |
| Internal player/training notes | Implemented; migration applied to test Supabase | User-confirmed scope, author/admin editing, current assignment RLS, audit, pagination and versions. Selected live creation/read/isolation passed; complete remaining matrix in INTERNAL_NOTES.md. |
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
| Premium responsive UI/UX | Partial acceptance | Impeccable system/shell and main screens refined; profile/training/notes/player-response previews checked at 320–1280 px. Full authenticated, screen-reader and physical-device acceptance outstanding. |

## Engineering and operational gaps

- 169 local tests, including brand asset/render regressions, plus TypeScript/ESLint/build evidence in PROGRESS.md. PGlite verifies SQL/RLS contracts, not hosted Auth, PostgREST or independent concurrent sessions. Server-action authorization also has dedicated unit tests.
- Pagination covers main directories, calendar, rosters, history, plans and parent cards. Bounded dashboard previews are deliberate. Admin family links are now paginated; representative performance still needs verification.
- Supabase outages must show honest errors. No fixture fallback or privileged client used for ordinary reads/writes.
- Session expiry, deployed CSP/cookies/origin behavior, database advisors and full security/accessibility review remain unverified.
- Privacy retention/export/removal ownership, backup restoration, real SMTP and deployment remain operational release gates.

## Next work and readiness

The dedicated Supabase test project is configured and scripted integration checks pass. Continue the remaining browser/email scenarios in [LIVE_ACCEPTANCE.md](LIVE_ACCEPTANCE.md); further local feature work cannot substitute for acceptance. Credentials must be configured privately, not pasted into chat. T3 browser and local server are available.

Next: complete hosted notes editing, audit, revocation and concurrent-version acceptance; verify the new player-specific response presentation with real accounts. Then rehearse invitation partial failure and prioritize financial metadata/allocation extensions if required. Official Bilíkova branding is implemented; full authenticated role/device coverage remains open.

Outside initial scope: online payment processing/card storage, complex chat, external push beyond account email flows and multi-tenant SaaS. Optional event-coach overrides and automatic announcement expiry remain extensions; archival exists.

Eighteen hosted test migrations and selected live role/workflow checks completed. Full browser/email acceptance, deployment and production readiness are not claimed. Template application awaits resolution of the free-tier default-provider restriction (custom SMTP or paid plan); token permissions are now sufficient. SMTP remains absent.

TokenHash invite/recovery integration: 10 new live checks passed without sending email (confirmation, replay denial, password form, login, unlinked account isolation). Remote templates remain unapplied due to the provider restriction. Delayed fee-plan archive and subsequent restore confirmed; active state and 1375-cent amount verified. Full invitation/profile/email and browser acceptance remain open.
