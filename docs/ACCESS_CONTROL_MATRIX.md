# Access control, architecture and privacy audit

Audit started 2026-10-19. This is a product policy and verification register, not a production-security or GDPR certification. Existing changes were retained on `feature/authenticated-workflow-acceptance`. No production records are fixtures.

## Authority and scope

`AGENTS.md`, `PRODUCT.md`, `docs/DATABASE.md` and the user's approved internal-notes scope are authoritative. Four **additive** roles: administrator (A), coach (C), player (P), guardian (G). Permissions combine only for the records justified by each role. Coaching never grants financial access. An Auth account alone does not establish a club role. Current database identity, active status, roles and relationships must be rechecked; JWT role metadata is not authoritative.

Scopes: **club** = entire club; **teams** = current assigned coaching teams; **own** = current person's records; **children** = explicit current guardian links; **shared** = relevant team/club communications; **forbidden** = no access. An archive does not broaden scope. Personal historical attendance remains readable after leaving a team; it does not restore access to that team's current schedule or other players. Changing/removing a relationship is administrative and audited.

Read includes direct Data API/RPC, embeds, counts, search, filters and cursor pages. A readable record does not imply permission to edit it. No general approval workflow exists. Administrative creation/assignment is the authorization step. No implemented bulk export, file upload, payment gateway, public team directory or chat exists; those are not implicitly authorized by a table's read permission.

## Implemented inventory

| Surface / route | Data and important operations |
| --- | --- |
| `/`, `/prihlasenie`, `/obnova-hesla`, `/nove-heslo`, `/auth/confirm`, `/auth/callback`, `/nastavenie` | Login/logout, recovery, invite confirmation, session/password activation, configuration status. Redirects are allowlisted. |
| `/klub` | Scoped dashboard, upcoming events, pending responses, attendance aggregates, family pagination, finance totals, administrator recent audit. Self reminder refresh. |
| `/klub/clenovia`, `/klub/clenovia/[id]`, `/klub/profil` | Directory/search, own/authorized contact view, member create/edit, active status, roles, Auth invitation/link, family-link creation/removal, internal player notes. |
| `/klub/timy`, `/klub/timy/[id]` | Active/archive directory, scoped roster and program; admin team create/edit/archive/restore and coach/player membership assignment/removal. |
| `/klub/kalendar`, `/klub/kalendar/[id]` | Month/week/agenda, date/team/type/child filters, paginated roster, recurring event batch, individual edit/status, match details, availability, actual attendance, reminders, training notes. |
| `/klub/dochadzka` | Read-only actual attendance history/search/status/player filters and complete scoped statistics; corrections occur in event detail. |
| `/klub/oznamy` | Club/multi-team/named-recipient notices, create/edit/archive, priority, search and pagination; audience expansion notifications. |
| `/klub/notifikacie` | Own scoped notification history, mark read, reminder generation; current source/relationship recheck. |
| `/klub/platby`, `/klub/platby/[id]`, `/klub/platby/plany` | Plans and archive/restore, dated charges, corrected totals, payments, whole-entry reversal, immutable adjustment history, scoped complete aggregates/cursors. |
| `/klub/nastavenia`, `/klub/audit` | Club identity/contact/venue/categories; immutable administrative audit, actor names. |
| `/ukazka` | Explicit fictional design preview, feature-gated and isolated from authentication. Never a fallback after a failed database query. |
| Server-only infrastructure | User-session Supabase client, `requireViewer`, mutation dispatcher, note action, selector action, CSP/no-store proxy, narrow Auth-admin invitation client, trusted scheduled reminder worker. No application Storage use. |

### Database entities (19 before corrections)

`profiles`, `member_details`, `user_roles`, `club_settings`, `teams`, `team_memberships`, `guardian_players`, `event_series`, `events`, `availability`, `attendance`, `announcements`, `fee_plans`, `charges`, `payments`, `charge_adjustments`, `notifications`, `audit_logs`, `internal_notes`.

### Public RPC inventory (21 before corrections)

Writes: `create_member`, `edit_member`, `update_own_profile`, `create_event_batch`, `refresh_my_reminders`, `send_event_reminders`.

Reads: `finance_summary`, `charge_page`, `payment_page`, `dashboard_summary`, `member_page`, `team_page`, `attendance_page`, `announcement_page`, `selector_options`, `event_roster_page`, `team_roster_page`, `calendar_page`, `guardian_dashboard`, `can_access_internal_notes`, `internal_notes_page`.

All must be authenticated-only. Public invokers retain RLS; private definer helpers must use an empty search path, qualified names and caller-derived identity with explicit scope checks. The bulk reminder worker and trigger functions are not callable by application roles. Graphify traced `requireViewer` into pages, selectors and actions; source review supplements the graph because it predates notes and branding. No extraction/rebuild was needed.

## Complete permission matrix

`—` = forbidden. `I` = implementation reviewed; `F` = correction identified; `T/L/B` = local PostgreSQL / hosted Supabase / browser evidence. Verification is recorded per boundary in the evidence section; source review alone is not a passed test.

| Role | Resource / operation | Read | Create | Update | Delete | Data scope / special conditions | Implementation / required correction | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A | Member directory, names, contacts, birth dates | Yes | Yes | Yes | — | Club; deactivate instead of erasing | I; narrow Auth metadata access | Pending |
| C | Member directory and contacts | Yes | — | — | — | Assigned rosters, plus own/family from other roles; exact birth-date policy pending | F: staff page guard, reduce metadata | Pending |
| P | Member profile | Yes | — | Name/phone on own profile | — | Own only; no member administration or birth-date edits | F: remove directory navigation/page | Pending |
| G | Member profiles | Yes | — | Name/phone on own profile | — | Own and linked children; child corrections through admin | F: remove directory navigation/page | Pending |
| A | Roles, coach/player assignments | Yes | Yes | Yes | Remove relationship | Club; cannot remove own admin role | I; DB guards, audit | Pending |
| C/P/G | Roles and team memberships | Scoped | — | — | — | Own roles; C roster memberships; P own memberships; G linked children; no other users' additive roles | I; stale-role cases to test | Pending |
| A | Guardian-child relationships | Yes | Yes | Yes | Unlink | Club; guardian/player roles required; many-to-many | I | Pending |
| G | Guardian-child relationships | Yes | — | — | — | Own explicit links only, requires current guardian role | F: consistent role revocation | Pending |
| P | Guardian-child relationships | Own links | — | — | — | Own relationship identifiers only; no unrelated family | I | Pending |
| C | Guardian-child relationships | — | — | — | — | Coaching alone never grants family administration | I | Pending |
| A | Team definitions | Yes | Yes | Yes/archive/restore | — | Club; archival preserves history | I; tighten unused destructive grants | Pending |
| C | Team definitions/rosters | Yes | — | — | — | Assigned teams; personal/family teams read-only under additional roles | I | Pending |
| P | Teams/rosters | Yes | — | — | — | Own membership only; no private teammate roster | I; clarify roster labels | Pending |
| G | Teams/rosters | Yes | — | — | — | Linked children's memberships only | I; clarify roster labels | Pending |
| A | Events, matches, series | Yes | Yes | Yes/cancel/complete | — | Club; series atomic, one-occurrence edits | F: prevent transferring attached private records | Pending |
| C | Events, matches, series | Yes | Yes | Yes/cancel/complete | — | Current assigned coaching team on both old and new record; read permission alone insufficient | F: explicit action scope checks | Pending |
| P | Calendar/event detail | Yes | — | — | — | Membership teams; scoped counts | I | Pending |
| G | Calendar/event detail | Yes | — | — | — | Teams of linked children; child filter cannot broaden scope | I | Pending |
| A/C | Actual attendance | Yes | Yes | Correct status | — | Club / assigned event teams; active roster player, noncancelled event | F: immutable event/player keys; database timestamps | Pending |
| P | Actual attendance/history/stats | Yes | — | — | — | Own only, including retained historical rows | I; direct-ID and aggregate regression cases | Pending |
| G | Actual attendance/history/stats | Yes | — | — | — | Linked children only; revoked link removes access immediately | I; multi-child/multi-guardian cases | Pending |
| A/C | Planned availability | Scoped | Own/family only | Own/family only | — | Team coaches read; coaching/admin role alone cannot impersonate a player's reply | F: explicit server scope; immutable keys | Pending |
| P | Planned availability/reason | Yes | Yes | Yes | — | Own, active player membership, noncancelled event | F: database actor/time stamps | Pending |
| G | Planned availability/reason | Yes | Yes | Yes | — | Currently linked children meeting event-player conditions | I/F: revocation and key integrity | Pending |
| A | Fee plans, charges | Yes | Yes | Plan edit/archive; charge via adjustment only | — | Club; money integer cents, issued charge immutable | I; revoke unused plan deletion | Pending |
| C | Financial information | — | — | — | — | Coach role grants none; additional personal/family scope remains separate | I; hide/deny finance routes without eligible scope | Pending |
| P | Charges/payments/adjustments | Yes if adult | — | — | — | Own; verified birth date at least 18; missing date denies | I; navigation must use actual eligibility | Pending |
| G | Charges/payments/adjustments | Yes | — | — | — | Linked children only; no other household's data | I | Pending |
| A | Payment/reversal/charge adjustment | Yes | Yes | — | — | Append-only; lock charge, prevent overpayment, audit corrections | I; server-owned payment timestamp | Pending |
| A | Announcements | Yes | Yes | Yes/archive | — | Club, teams or named recipients | F: recipient list only to managers | Pending |
| C | Announcements | Scoped | Assigned teams | If manages every audience team | — | No club-wide or selected-person publishing; authorship alone gives no permanent access | F: explicit server check; audience masking | Pending |
| P/G | Announcements/archive | Scoped | — | — | — | Relevant team/club notices or exact named recipient; named children do not implicitly share with guardians | F: no disclosure of other named recipients | Pending |
| A/C/P/G | Notifications | Own/current scope | — | Own read timestamp | — | Recheck source, team/finance/family scope; no arbitrary title/href writes | I | Pending |
| A/C | Event reminders | Scoped | Trigger fanout | — | — | Club/assigned team only; 48 hours, pending responses, deduplication | I; explicit action guard | Pending |
| P/G | Self reminder refresh | Own | Own eligible reminders | — | — | Cannot choose another recipient or invoke bulk worker | I | Pending |
| A | Internal player/training notes | Yes | Yes | Yes | — | Club, approved context; immutable author/context, correction audit | I; event scope must not move underneath note | Pending |
| C | Internal player/training notes | Yes | Yes | Author only | — | Current assigned player teams / training team; author loses rights after revocation | I; full hosted edit/revocation coverage needed | Pending |
| P/G | Internal notes | — | — | — | — | No automatic sharing, even when note concerns own child/self | I; direct table/RPC tests | Pending |
| A | Settings and audit | Yes | — | Settings only | — | Club; audit immutable, raw old/new data private | I; bounded actor lookup | Pending |
| C/P/G | Settings identity | Shared fields | — | — | — | Club name/logo/contact/venue/categories; management page/audit forbidden | I; page guard consistency | Pending |
| A | Invitations/account linking | Linked status | Invite/link | Activate/deactivate | — | Active unlinked member, current admin; Auth service key used only server-side | F: narrow account-link RPC and status, no general Auth-ID exposure | Pending |
| C/P/G | Invitations/access administration | — | — | — | — | Cannot bind identities or change roles | I | Pending |
| All / anonymous | Login, recovery, password change | Auth UX | Recovery request | Own verified Auth session | Logout session | Generic recovery response, password rules, allowlisted callbacks; club deactivation still denies data | I | Pending |
| Inactive/unlinked/no-role | Club data and actions | — | — | — | — | No stale-token bypass; auth recovery itself may still work | F: roleless-account closure | Pending |

## Prioritized findings and correction plan

1. **High — scope transfer through mutable parent records.** An event can be reassigned to a different team even after private availability/attendance/training notes exist. Policies then evaluate the new team and can expose old players' records. Reproduce, then deny a team transfer once attached private/history records exist, while retaining edits and empty-event reassignment.
2. **Medium — record provenance mutable through direct API.** Availability/attendance event-player keys and timestamps accept client values. RLS prevents unrelated targets but allows moving a legitimate row to another authorized child/event and falsifying correction time. Make keys immutable and stamp actor/time in DB; preserve status/response corrections.
3. **Medium — unnecessary field exposure.** Profile Auth IDs and named-announcement recipient IDs are directly readable with authorized rows. IDs are not credentials, but their exposure is not required. Replace broad access with safe columns, bounded checked helpers and manager-only audience details. Birth-date exposure needs the policy decision below.
4. **Medium — roleless/revoked role consistency.** Active profile without roles can retain shared club access; family helpers need an explicit current guardian role rather than relying on incidental join behavior. Align helpers, pages and tests.
5. **Medium — server action defense and UX.** Several coaching actions rely exclusively on RLS after authentication. Add explicit resource checks before writes; retain RLS for races/direct clients. Finance navigation currently uses the player role, not age/relationship eligibility. Member administration is offered to personal roles. Correct both navigation and route guards.
6. **Low — redundant/unused privileges and audit.** Admin delete grants exist for records whose UI promises archival/history preservation. Restrict these to implemented relationship removals. Announcement audit has two triggers; retain one to avoid duplicate audit entries.

## Privacy decisions

- **Awaiting club decision:** exact birth date for assigned coaches; requested safe option is name/contact access without exact date. Existing UI does not display the date. Do not silently broaden this.
- **Awaiting club decision:** guardian access after a child's 18th birthday. Existing documented behavior retains an explicit link until admin revocation; no automatic new sharing or consent is inferred.
- **Before deployment:** club management must define retention periods and lawful administrative processes for account removal, attendance, financial ledgers, notes, audit snapshots and backups; who can approve an erasure/export; verification of guardian authority; access review and staff departure procedures. No speculative automated erasure or export implemented.
- Internal notes keep the previously approved single private scope. No public/shared note type or medical dossier added. Note/absence text should describe useful sporting context without unnecessary health or family detail.

## Evidence register

Pending execution in this audit. Historical 169-test and live results in PROGRESS.md are context, not proof of newly identified cases. Local tests execute actual PostgreSQL RLS in PGlite; live tests must use real fictional Auth sessions and the explicitly matched test Supabase. Browser evidence must distinguish authenticated pages from `/ukazka` fixtures.

Technical references reviewed: [Supabase RLS and grants](https://supabase.com/docs/guides/database/postgres/row-level-security), [column privileges](https://supabase.com/docs/guides/database/postgres/column-level-security). Both grants and row policies must permit an operation; row visibility alone does not minimize returned columns.
