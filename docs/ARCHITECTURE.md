# Architecture

## Boundaries

One club, one modular Next.js application, one Supabase project. No tenants or subscription infrastructure. Server Components load data; small client components handle navigation, accessible dialogs and forms. Server Actions validate inputs with Zod and authenticate via `requireViewer`. The user-scoped Supabase client makes all domain writes; RLS remains authoritative for direct Data API calls.

`src/lib/auth.ts` resolves the current active profile and additive database roles using a server-validated Auth identity. Roles never come from user-editable metadata. Private SQL predicate functions avoid policy recursion with restricted `SECURITY DEFINER`, an empty search path, fully qualified names, and identity derived from `auth.uid()`. Public transactional RPCs are security invokers. Self-profile editing uses a narrow private definer function that can update only the current member's name/phone.

The server-only Auth admin client is isolated to invitations. Auth invitations and profile linking cannot be atomic; the UI distinguishes a delivery request from a successful link. Failure recovery is documented in README.

## Modules

- `src/app/klub`: protected dashboard, team/member, event/calendar, attendance, announcement, payment, notification, settings, profile and audit routes.
- `src/features/actions.ts`: validated mutation dispatcher. Split by domain when this grows further; do not duplicate authorization.
- `src/features/auth/actions.ts`: login, logout, recovery and password activation.
- `src/components`: shell, semantic shared components, action forms, Radix dialog and shadcn-style button primitives.
- `src/lib`: environment, server client, auth, safe query result helpers, Slovak money/time utilities.
- `src/types/database.ts`: generated from migrated PostgreSQL, used by the Supabase client. Regenerate after migrations.
- `supabase/migrations`: schema, RLS, transaction functions and regression fixes.
- `tests`: Vitest domain and PostgreSQL role-context tests.

## Key decisions

- Member records exist independently of Auth identities. A child can have no login and multiple guardians; a guardian can have multiple children.
- Additive roles expose the union of legitimate relationships. A coach role alone never grants financial access. Historical attendance is retained when memberships change.
- PostgreSQL `timestamptz` stores instants. Forms interpret local times in Europe/Bratislava. Weekly recurrence materializes 1–52 events transactionally while preserving local wall time across DST. Ambiguous/nonexistent local times are rejected with a Slovak message. Edits/cancellations affect one occurrence only.
- Availability and actual attendance are separate tables. Only coaches/admins record actual participation.
- Money is integer cents. Payments are append-only, with whole-entry reversal for corrections. A row lock on the charge serializes payment inserts; overpayment and invalid reversal are rejected. Partial payments are supported.
- Server Action forms use React `useActionState` and native controls, rather than adding a separate form state library for simple forms. Zod remains the server validation boundary.
- Authenticated rendering is dynamic with no shared user-data cache. Cookie sessions are HttpOnly; no browser Supabase client is used. CSP uses per-request script nonces; development alone permits eval. Inline style attributes are allowed for Radix layout; inline scripts are not.
- PGlite exists only in development/test scripts. Production uses Supabase, never an embedded or fake backend.

## Design

Midnight navy `#112238`, athletic blue `#225bdf`, lime `#d5f36b`, white panels, cool background `#f4f6fa`. Manrope for readable UI; Barlow Condensed for athletic emphasis. Fonts are self-hosted packages with Slovak support. Icons: Lucide. Visual source: `src/app/globals.css`.

Mobile uses an agenda calendar and a focus-managed navigation drawer. Forms have labels, pending states, live feedback, focused error summaries and per-field invalid states. Destructive membership/role/payment actions require confirmation. Reduced-motion styles and visible focus are included.

## Known scale limits

Dashboard, financial and attendance statistics use RLS-protected SQL aggregates. Main directories, attendance, announcements, finance, notifications/audit and form selectors use bounded cursor pages. Calendar/filter queries, detail rosters, guardian-child display and the fee-plan overview still need scale-safe reads. See REQUIREMENTS_GAPS.md.
