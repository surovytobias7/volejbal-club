# Aktuálny kontrakt — 26. 10. 2026

Lokálne **22 migrácií / 19 tabuliek / 27 verejných RPC**, vrátane verziovanej dochádzky a zjednotenej ochrany historických opráv. V tejto relácii nebola pridaná migrácia. Aktuálnu vzdialenú históriu blokuje Management HTTP 401; usporiadaná integračná brána je v [M4_LIVE_ACCEPTANCE.md](M4_LIVE_ACCEPTANCE.md). Počty v historickom odseku nižšie predchádzajú integrácii dochádzky.

# Zmeny kontraktu — 22. 10. 2026 (historicky)

Lokálne migrácie `20261022081940_access_integrity.sql` a `20261022081942_private_fields_and_access_context.sql` nadväzujú na pôvodných 18 migrácií. Celý reťazec prešiel v PGlite; aktuálne 19 RLS tabuliek a 26 verejných RPC. Hosted aplikovanie čaká na overenie histórie (`npm run db:status`, aktuálne Management HTTP 401).

`profiles.user_id`, `member_details.birth_date` a `announcements.recipient_ids` nemajú všeobecný SELECT grant. Nepoužívať `select('*')` na týchto troch tabuľkách ani filtrovanie cez skryté stĺpce. Identita ide cez `viewer_context()`, údaje cez oprávnené `member_private_details(uuid)`, prepojenie účtu cez admin-only `link_member_account(uuid,uuid)` a mená v audite cez bounded admin-only `audit_actor_names(uuid[])`. `member_page` vracia `account_linked` iba administrátorovi. `announcement_page` vracia `audience` a adresátov iba správcovi publika; `can_manage_announcement(uuid)` preveruje aktuálny rozsah pre Server Actions. Definer implementácie sú v súkromnej schéme, s prázdnym search_path a explicitnou autorizáciou; verejné wrappery sú invoker.

Nové migrácie nemenia ani nemažú existujúce záznamy. Obmedzujú nepoužívané DELETE oprávnenia, odstraňujú iba duplicitný auditný trigger, chránia väzby udalosti/účasti a databázové časové/autorové údaje. Server-only rozhodnutia o administrátorskej role sú pre výkon uložené iba počas SQL statementu, nikdy medzi požiadavkami. Staršie migrácie neupravovať ani naslepo opakovať.

# Database

## Entities

| Tables                               | Responsibility                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| profiles, member_details, user_roles | Auth identity mapping, minimal contacts, date of birth for adult financial eligibility, additive roles |
| teams, team_memberships              | Category, archival status, coach/player assignments; many teams per player                             |
| guardian_players                     | Explicit administrator-controlled many-to-many family links                                            |
| club_settings                        | Singleton branding, contacts, venue, categories and fixed Bratislava timezone                          |
| event_series, events                 | Weekly materialized series, shared event fields, optional match details                                |
| availability, attendance             | Planned response and coach-recorded participation, separate composite keys                             |
| announcements                        | Club, multi-team or selected-member audience, important/archive flags, immutable author snapshot       |
| fee_plans, charges, payments         | Fee definitions, dated member assignments, append-only transactions and reversals                      |
| notifications                        | Recipient, scope, internal link and read timestamp                                                     |
| audit_logs                           | Append-only old/new records for administrative, attendance and financial changes                       |

Migrations are ordered in `supabase/migrations`. Start from a dedicated Supabase project. Never edit an applied migration to fix a bug; append another migration. Use the CLI to create filenames. `npm run db:types` applies all migrations to disposable PostgreSQL in PGlite and derives the TypeScript table/relationship/RPC contract from the catalog.

## Access matrix

| Domain                         | Admin           | Coach                | Player                           | Guardian                     |
| ------------------------------ | --------------- | -------------------- | -------------------------------- | ---------------------------- |
| Member names/contacts          | All             | Assigned roster      | Own                              | Linked children and own      |
| Team/event reads               | All             | Assigned teams       | Membership teams                 | Linked children's teams      |
| Team/member/role/family writes | Yes             | No                   | No                               | No                           |
| Event writes                   | All             | Assigned teams       | No                               | No                           |
| Availability writes            | Own/family only | Own/family only      | Own event membership             | Linked children's membership |
| Actual attendance writes       | All             | Assigned teams       | No                               | No                           |
| Financial reads                | All             | None from coach role | Own, verified date of birth >=18 | Linked children              |
| Financial writes               | Yes             | No                   | No                               | No                           |
| Announcements                  | Club/team       | Assigned team        | Relevant read                    | Relevant read                |
| Notifications                  | Own             | Own                  | Own                              | Own                          |
| Audit                          | Read            | No                   | No                               | No                           |

Roles combine without expanding unrelated scopes. `private.viewer()` returns no identity for deactivated profiles, so RLS closes access without JWT refresh. RLS is enabled on every public domain table. Anonymous access and public function execution are denied. Guardian relationships cannot be fabricated by a parent. Players cannot edit birth dates or elevate roles through profile updates.

Notifications recheck current team/financial scope on read/update. The notification-scope migration suppresses earlier unscoped announcement/financial notifications to avoid retaining private titles after relationship removal. Full audit records are administrator-only and require a club-specific retention policy before production.

## Integrity

Foreign keys, role checks, unique membership pairs, positive charges, time ordering and match-only fields are enforced. Event batches/member creation are transactional invoker RPCs. Availability/attendance writes require an active roster player and a noncancelled event. Updating an event cannot attach a series from another team. Actual attendance corrections are audited.

`payments` entries cannot be updated/deleted by application users, including admins. Reversal is negative and must exactly negate a positive entry for the same charge; each entry can be reversed only once. Charge locking prevents a second concurrent insert from using a stale balance. Multi-session concurrency is not yet stress-tested. Charge-total corrections use immutable charge_adjustments with reason, authenticated actor and database-derived delta. Their trigger locks the same charge as payments, rejects totals below paid amounts, and stamps actor/time. Totals and payment validation include adjustments; original charge data remains unchanged. Each payment applies to one charge; allocation and charge reassignment/date correction remain unimplemented. No card data is collected.

## Verification boundary

`finance_summary(uuid)` aggregates all RLS-visible charges and ledger entries before API row limits. A null charge ID selects the caller's entire financial scope. `charge_page(date, uuid)` and `payment_page(uuid, timestamptz, uuid)` return 25 records and a `has_more` flag using indexed, deterministic keyset order. The latter checks reversal existence across the entire ledger. These stable invoker RPCs have an empty search path and authenticated-only execution; direct supplied IDs cannot expand RLS scope. Overdue totals use the Bratislava calendar date. JSON responses are validated at the application boundary; timestamps retain PostgreSQL precision in cursors.

Authorization tests use real PostgreSQL roles/RLS in PGlite and an isolated test-only Auth schema. They test anonymous denial, role escalation, multi-role scope, guardian isolation, deactivation, attendance separation, cancellation, payment corrections and atomic batches. They do not exercise the PostgREST relationship embedding layer, hosted Auth, email delivery, Storage or operational backups. Run the complete live UI workflow on disposable Supabase before release.

## Dashboard and directory reads

`dashboard_summary(timestamptz)` calculates visible team/player/event counts, attendance percentage and unanswered responses for the next five events under invoker RLS. The page uses the same timestamp and `(starts_at, id)` ordering for its event list. Inactive players and revoked player roles do not contribute pending responses; any availability response counts as answered.

`member_page(text,text,uuid)` performs literal case-insensitive substring search before pagination and returns the full filtered count. `team_page(boolean,text,uuid)` preserves archived/active scope. Both use 25-row keyset pages and name/UUID tie-breakers, with runtime JSON validation. Notification/audit history uses validated timestamp/UUID PostgREST cursors and indexes; live PostgREST verification remains pending.

## Attendance, audiences and selectors

`attendance_page` returns a bounded history and complete filtered counts under invoker RLS. The cursor uses updated time, event UUID and player UUID. `announcement_page` orders by importance, publication time and UUID, and reports whether the caller may manage each notice.

Announcement audience IDs are validated on write; team scopes include linked guardians, while selected-member scopes are exact recipients (guardians must be explicitly selected). Coaches must manage all target teams; named recipients and club-wide publishing require admin. Notifications reference their source announcement, enforce its current RLS scope, and deduplicate audience-expansion fanout. Legacy announcement notifications lacking source IDs are hidden without deletion. Announcement changes are audited.

`selector_options` performs authenticated literal search and label/UUID cursor pagination; selected values may be resolved in a bounded batch. Lookups never elevate the caller's RLS access. The JSON contracts are validated in the application.
