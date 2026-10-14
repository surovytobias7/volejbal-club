# Supabase configuration and end-to-end acceptance

Status: dedicated test Supabase configured; live acceptance is in progress (see M4_LIVE_ACCEPTANCE.md). This is not production readiness. The application has the core workflows and local contracts needed for the master scenario; only real Supabase can verify Auth, PostgREST, email and concurrent sessions.

## Configuration gate

- Follow [README.md](../README.md#supabase-connection) for `.env.local`, exact app origin, Auth redirects, Slovak templates and first-administrator bootstrap. Keep credentials out of chat, logs and version control. Disable public signup and anonymous sign-in.
- Apply all ordered migrations to the empty staging database. Verify exposed-table grants, RLS and RPC discovery through PostgREST. The empty historical charge-period migration is intentionally preserved; the later fee-plan migration contains the actual changes.
- Use test-only accounts: admin, coach, guardian with two children, unrelated guardian/player, adult player and inactive member. Add a coach+guardian identity to check additive permissions. Use fictional member records only.
- Configure SMTP or a local mail catcher for invitation/recovery testing. A hosted project without working email can test some authenticated flows but cannot complete invitation acceptance.
- Set `ENABLE_DESIGN_PREVIEW=false` for the authenticated run. The `/ukazka?view=rodic` fixture is visual evidence only.
- Install [schedule-reminders.sql](../supabase/schedule-reminders.sql) in the trusted SQL console after enabling Supabase Cron; check actual job execution and deduplication. Do not expose the private scheduler as a public endpoint.

## Master workflow and expected results

| Step | Action                                                                                 | Expected evidence                                                                                                                                                                                                    |
| ---- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Bootstrap admin; change club venue/categories                                          | New event has saved venue; team category selector reflects configuration; editing an older team preserves its category.                                                                                              |
| 2    | Create profiles/roles, invite coach and parent; activate, log out/in, recover password | Real email and session flows work with configured origin. Errors do not report success. Record any partial invitation failure and reconcile the intended Auth/profile identity using the documented trusted process. |
| 3    | Assign two children to teams and link parent                                           | Parent sees only their linked children. Coach sees assigned sports records and appropriate contact views without financial data.                                                                                     |
| 4    | Create recurring training across a Bratislava DST boundary; move/cancel one occurrence | Local training time stays stable; exceptions affect only the chosen event; calendar and notifications agree.                                                                                                         |
| 5    | Parent answers for one child, leaves sibling pending; coach records actual attendance  | Planned response and actual attendance stay separate. Child cards show independent response/history and next scheduled event.                                                                                        |
| 6    | Create plan and dated charge; partial payment, correction, reversal                    | Integer-cent balance agrees across detail, ledger, parent card and dashboard. Audit retains original entries. Plan edit/archive never changes issued charges; archived plan cannot be assigned.                      |
| 7    | Publish team/named notice and trigger reminders                                        | Only eligible users receive/read records. Duplicate reminder runs do not duplicate notices; response and relationship changes suppress/revoke access.                                                                |
| 8    | Remove parent-child link or deactivate logged-in account                               | Subsequent UI/API reads and writes lose access immediately without JWT refresh. Other linked children remain available.                                                                                              |
| 9    | Repeat archive/payment/correction requests concurrently                                | Database locks preserve valid balances and prevent assignment after completed archival. PGlite single-session tests do not prove this.                                                                               |

## Direct API and UI checks

Use signed-in user clients for ordinary operations, never the privileged service client. Test direct table/RPC calls as well as buttons: unrelated child IDs, foreign team IDs, child cursor manipulation, coach finance queries, role escalation and inactive accounts must not reveal or modify unauthorized records. Check anonymous RPC denial and revoked relationships with an existing session.

Verify desktop and mobile, keyboard/focus/error summaries, empty/long lists, all pagination, duplicate names, lost network/database errors and no fallback fixtures. Exercise financial dialogs and settings/category controls in the real authenticated interface; those cannot be accepted from the public preview.

## Record results

Record environment, migration version, date, role, expected/actual result and redacted evidence for each scenario. Current row-level execution evidence is in [M4_LIVE_ACCEPTANCE.md](M4_LIVE_ACCEPTANCE.md); scripted live checks and selected browser scenarios have passed, while the full matrix remains incomplete. Local suite and isolated browser preview results are in [PROGRESS.md](PROGRESS.md).

Remaining product follow-ups do not prevent staging configuration: charge reassignment/date-correction and multi-charge allocation workflows, richer player-specific dashboard response display, and invitation reconciliation UI. Manual invitation reconciliation already has an operational procedure; it still needs a failure-path rehearsal.

Before real member onboarding, complete [deployment gates](DEPLOYMENT.md): live role acceptance, origin/session/header checks, query/concurrency performance, backup restoration, privacy/retention ownership and SMTP delivery. Do not treat successful staging setup as release approval or a deployment claim.
