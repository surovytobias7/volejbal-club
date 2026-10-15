# Product UI roadmap

Updated: 2026-10-15. This file was absent at the start of this continuation. It records the existing implementation and the current redesign; it does not replace the live acceptance gates in M4_LIVE_ACCEPTANCE.md.

## Design direction

Continue the existing volleyball identity: deep petrol #123e43, action teal #17676a, peach #f4ae85, court-orange #d86b3c, cool green-grey #f1f4f3 and white surfaces. Manrope serves operational text; Barlow Condensed serves headings, times and scores. Orange marks orientation, not success. Semantic status labels always accompany color.

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
- Verification is in progress. See the newest PROGRESS.md entry for exact outcomes, not historical counts.

## Remaining acceptance and next work

1. Complete browser review of the current changes at desktop, tablet and phone widths. Check live member/finance/event records, dialog focus, mobile navigation and role-specific previews.
2. Inspect remaining settings, profiles, announcements, notifications, fee details and empty/error/loading screens for consistency; correct any regressions found.
3. Run final check/test/build, refresh the code graph after final source edits, and record concrete evidence and limitations.
4. Follow-up acceptance: screen-reader/real mobile-device testing, complete live mutation matrix, invitation partial-failure rehearsal, SMTP delivery, backup restore and deployment checks remain distinct gates. Do not call the product production-ready based on visual checks.

## Navigation for the next session

Use root graphify-out/graph.json first: `graphify explain "Shell"`, `graphify explain "CalendarView"`, `graphify explain "ActionForm"`, and targeted queries. Confirm source lines because a graph may predate edits. No earlier club repository was inspected. The ignored src/graphify-out/ is a redundant source-only extraction; root graphify-out/ is authoritative.

No automatic commit, push, merge, schema change or deployment is part of this redesign.
