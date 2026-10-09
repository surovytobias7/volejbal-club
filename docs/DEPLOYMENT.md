# Deployment and recovery

No deployment has been performed. Do not use development fixtures as production data.

## Before deployment

- Pass `npm ci`, `npm run check`, `npm test`, `npm run build` and `npm audit --omit=dev`.
- Apply ordered migrations to a staging Supabase project and run live role-based workflows. PGlite tests are not a substitute for Auth/PostgREST tests.
- Use a dedicated production Supabase project; review migration changes, especially notification scope backfill, before applying to populated data.
- Disable public signup and anonymous sign-in; configure 12-character passwords, SMTP, exact Site URL and redirect allow-list, and Slovak templates.
- Bootstrap the first administrator using the reviewed private SQL process. Invite additional admins from the app.
- Configure `APP_URL` to the HTTPS production origin, project URL/publishable key and server-only secret key. Set preview flag false. Keep secrets in the hosting provider secret manager.
- Use `next build`/`next start` or a compatible Next.js managed host. Do not publicly expose `next dev`. Self-hosted deployments need an edge/reverse proxy for TLS, request limits and rate limiting.
- Configure stable `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` across replicas if self-hosting multiple instances, according to current Next.js deployment documentation.
- Verify CSP nonces, HttpOnly/SameSite/Secure cookie behavior, no-store authenticated responses, origin checks, error messages and account deactivation on the deployed origin.
- Restrict Supabase dashboard/project ownership and server secrets to operators. Review database advisors and Auth rate limits.

## Acceptance scenario

Admin invites coach → coach activates/signs in → admin creates team and member profiles → assigns coach/players → links one guardian to two children → coach creates recurring training → guardian sees only relevant events and responds → coach records actual attendance → admin creates a charge and partial payment → parent sees the correct remaining balance → admin reverses an incorrect payment → audit retains both entries. Try cross-team, unrelated-child, minor finance and deactivated-user access through direct API requests as well as UI.

Also test unassigned users, expired auth links, multiple roles, cancelled events, incorrect form inputs, Supabase outages and mobile navigation. Verify pending/success/error feedback and that failed writes never report success.

## Backups and incidents

Enable managed database backups/PITR appropriate to the club's recovery requirements. Record who owns restore permissions. Test restoration into an isolated project, including Auth configuration and identity/profile mappings. Never restore over production without an approved recovery plan.

Treat financial/audit retention separately from disposable notifications. Agree personal-data retention, export and removal procedures with the club before real member onboarding. Restore tests, deletion workflows and legal compliance assessment remain release gates.

If credentials leak: rotate the affected secret, revoke compromised sessions, check Auth/audit logs and account roles, assess affected members and follow the club's incident process. Deactivate compromised profiles for immediate application/RLS denial.
