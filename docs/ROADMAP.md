# Product UI roadmap

Updated: 2026-10-19. It records the current implementation and redesign; it does not replace the live acceptance gates in M4_LIVE_ACCEPTANCE.md. PRODUCT.md and DESIGN.md hold the confirmed usage context and design rules.

## Design direction

The user-confirmed identity is **ŠŠK Gymnázium Bilíkova Bratislava**: original supplied logo, deep blue #252b80, white #ffffff and red #ce2637. Manrope serves operational text; Barlow Condensed serves headings, times and scores. Blue carries navigation/actions, red marks selection and emphasis; semantic status labels always accompany color. The superseded petrol/peach identity must not return.

Use a compact desktop navigation rail, an immediate next-event feature and dense operational lists. On phones, use direct program/navigation access and labelled records instead of horizontally scrolling administrative tables. Preserve server rendering, RLS, additive roles, Slovak and Bratislava time.

## Implemented before this continuation

- Shared typography, palette, shell, role-dependent navigation and dashboard.
- Team cards, announcements, authentication court illustration, profiles, finance summary and calendar.
- Labelled action forms, password reveal, pending/error/success feedback, focus-managed dialogs and navigation.
- Functional Supabase integration; selected authenticated browser acceptance in PROGRESS.md.

## Current stage: operational mobile workflows

- Implemented: mobile quick navigation; selected-page state in isolated previews; responsive labelled tables across members, attendance, team/event rosters, payments and audit.
- Implemented: grouped daily agenda on phones/tablets and explicit event-type/cancellation labels in the desktop calendar; one date index per render.
- Implemented: first-invalid-control focus; dialog triggers no longer imply every action creates a record; fee-plan active/archive selection.
- Implemented: compact guardian/player dashboard metrics; distinct event time/venue brief with response actions before the mobile roster; direct accessible contact links.
- Completed Impeccable pass in `8cbd61f`: shared tokens, Radix mobile navigation, accessible motion/focus, open dashboard/announcement sections, team directory and shared preview/live record components. Prior check/test/build and production-preview confirmation passed.
- Completed locally 2026-10-16: open member contacts and program links, distinct training time/venue composition, player-specific upcoming responses and approved internal player/training notes. Notes use current-role RLS, author/admin editing, audit, pagination and version checks; see INTERNAL_NOTES.md.
- Implemented 18 October: official club branding, shared identity/config and original logo, new login/navigation composition, program-first dashboard and consistent blue/white/red shared UI. See BRAND_REVIEW.md. Latest local suite: 169 / 12 files; final repeated validation is recorded in PROGRESS.md.
- Notes migration applied to dedicated test Supabase (18 migrations, 19 RLS tables, 21 RPCs). Fictional coach dataset and real coach Auth/local SSR checks passed; broader hosted notes matrix remains open.

## Remaining acceptance and next work

1. Complete the remaining hosted notes matrix in INTERNAL_NOTES.md: editing/audit, second coach, current-role revocation, concurrent stale versions and mobile mutation UI. Local PGlite and interactive previews remain separate evidence.
2. Continue remaining authenticated UI review: settings, notifications, fee details, family-link pagination and empty/error/loading states. Profile/training presentation has now been inspected at desktop/tablet/phone widths; full authenticated pages and real-device/screen-reader checks remain.
3. Preserve check/test/build evidence per milestone. Existing root Graphify was reused for targeted navigation; it predates the new notes files, so inspect their current source directly or incrementally refresh when needed.
4. Follow-up acceptance: screen-reader/real mobile-device testing, complete live mutation matrix, invitation partial-failure rehearsal, SMTP delivery, backup restore and deployment checks remain distinct gates. Do not call the product production-ready based on visual checks.

## Navigation for the next session

Use root graphify-out/graph.json first: `graphify explain "Shell"`, `graphify explain "CalendarView"`, `graphify explain "ActionForm"`, and targeted queries. Confirm source lines because a graph may predate edits. No earlier club repository was inspected. The ignored src/graphify-out/ is a redundant source-only extraction; root graphify-out/ is authoritative.

No automatic commit, push, merge or deployment. The additive notes migration is applied only to the dedicated test project; production rollout remains a separate release gate.
