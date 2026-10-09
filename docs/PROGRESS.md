# Progress — 2026-10-09

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
