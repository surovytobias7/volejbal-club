# Aktuálna brána — 27. 10. 2026

Management prístup je obnovený; **23 aplikovaných / 0 čakajúcich migrácií** potvrdených čítaním vzdialenej histórie. Živé preflight 11/11 a rolové kontroly 64/64 prešli 26. októbra. Nové mutačné skúšky a T3 trénerské/hráčske/rodičovské postupy z 27. októbra dokumentuje [LIVE_ATTENDANCE_NOTES.md](LIVE_ATTENDANCE_NOTES.md), vrátane pôvodného neúspešného očakávania testu a následného úspešného pokračovania 21/21. Nie je to úplné uzavretie M4; zostávajúce scenáre sú v tomto registri a roadmape. SMTP/doména, obnova pozvánky, zálohy a deployment ostávajú otvorené.

# Historická brána — 26. 10. 2026

Read-only `npm run db:status` opäť vracia **Management HTTP 401**. Lokálne je **22 migrácií / 19 tabuliek / 27 RPC**; aktuálna vzdialená história nie je potvrdená. Posledný historicky overený základ je 18 migrácií po `20261016090000`. Najprv obnoviť prístup a overiť usporiadaný prefix; potom aplikovať iba skutočne chýbajúce verzie v poradí `20261021201352`, `20261022081940`, `20261022081942`, `20261022184845`. Tento zoznam nie je náhradou kontroly histórie. Starší pokyn nižšie uvádzajúci iba dve migrácie je historický a nepatrí k aktuálnemu integrovanému stavu.

Pozvánky: lokálna simulácia chýb a databázovej obnovy prešla; [INVITATIONS.md](INVITATIONS.md) určuje manuálny postup. Žiadna správa ani vzdialená mutácia sa pri tejto skúške nevykonala. Hosted Auth/PostgREST, SMTP, paralelné spojenia a prehliadačové mutácie zostávajú otvorené.

# Historické pokračovanie 22. 10. 2026

- Obnovený stav má 20 lokálnych migrácií; dve nové opravy auditu sa na hosted databázu neaplikovali. Posledná historicky potvrdená aplikovaná verzia je `20261016090000` (18 migrácií, 18. október). Aktuálna história **nie je potvrdená**.
- `npm run live:check`: 11 úspešných kontrol. Pred zmenou kontraktu runnera `npm run test:live`: 64 úspešných kontrol pôvodného Auth/PostgREST rozhrania. Zachované sanitizované dôkazy: `test-results/live-preflight.json`, `test-results/live-accounts-before-access.json`.
- Aktualizovaný runner pre nový kontrakt: 26 úspešných a 5 blokovaných. Každá rola sa prihlási, ale `viewer_context` chýba (`PGRST202`); runner to označuje ako blokátor schémy, nie ako úspešný bezpečnostný test. Dôkaz: `test-results/live-accounts.json`.
- Nový `npm run db:status`: Management HTTP 401. Priamy DB hostname sa nevyriešil (`ENOTFOUND`); TLS sa neobchádzalo. Dôkaz o stave histórie: `test-results/live-migrations.json`. Žiadny reset, seed ani vzdialený zápis klubových údajov.
- Po súkromnom obnovení prístupu overiť presný usporiadaný prefix histórie. Aplikovať iba `20261022081940_access_integrity.sql`, potom `20261022081942_private_fields_and_access_context.sql`, zaznamenať históriu a obnoviť PostgREST schému. Nepoužiť `--include-seed` ani opakovanie už aplikovaných migrácií. Nasadenie aplikácie závisí od oboch migrácií.
- Nasleduje nové `npm run test:live`, priame negatívne API prípady z matice, hosted notes acceptance a autentifikované desktop/mobile mutácie. Súbeh presunu udalosti s novým súkromným záznamom overiť v dvoch nezávislých reláciách; PGlite pokrýva sériovú integritu, nie tento hosted súbeh.

Nasleduje historický runbook a staršie dôkazy.

# M4 - live integration execution

This file records the live phase. The existing [LIVE_ACCEPTANCE.md](LIVE_ACCEPTANCE.md) contains the full workflow matrix. No M4 file existed in this checkout when this phase began; this entry point now makes the requested milestone explicit.

## Current status

2026-10-19 branding completion: production build, 169 local tests and TypeScript/ESLint passed. Repeated the 13 coach Auth/local production SSR checks and added 23 admin/guardian/player login/SSR/logout checks, including settings, members, fees/plans, announcements and notifications. All passed; ignored sanitized reports are `club-demo-http.json` and `club-brand-roles.json`. This verifies real test Auth and server rendering, not the complete live browser mutation matrix. No new database writes were needed on this continuation.

2026-10-18: applied only reviewed additive migration `20261016090000_internal_notes.sql` to the explicitly matched test project after verifying the preceding 17-version history. SQL and migration-history insertion committed together, followed by PostgREST schema reload. Readback: **18 migrations, 19 RLS tables, 21 public RPCs**. The fictional coach demo created player/training notes through authenticated RLS; coach page RPC/SSR reads and guardian/unassigned-team isolation passed. Full edit, revocation, concurrent version and browser matrix in [INTERNAL_NOTES.md](INTERNAL_NOTES.md) remains open. See [DEMO_CLUB.md](DEMO_CLUB.md) for the guarded seed and real Next login/SSR script (13 checks after branding). Test club branding was updated through administrator RLS; other settings were preserved. No mail sent or production data used. The following 14 October entry is historical.

Updated 2026-10-14: dedicated test Supabase is connected and all 17 migrations are applied. Eighteen public tables have RLS; 19 public RPCs are available. Fictional Auth identities and administrator bootstrap are installed. Live account and database workflow checks pass. Selected T3 workflows for all four active roles now pass (latest ledger below). Full authenticated browser acceptance remains incomplete. SMTP requires a domain, which the user does not yet have; see [SMTP_SETUP.md](SMTP_SETUP.md). No production deployment or readiness claim.

The setup sections below are reference instructions for a fresh project, not instructions to reapply this project's schema or recreate accounts.

## 1. Create and configure the staging project

Use a new empty Supabase project dedicated to fictional acceptance data. Keep the database password in a password manager. Configure `.env.local` privately from `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`: project API URL from the Connect dialog.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: publishable key (legacy anon supported); never the secret/service-role key.
- `SUPABASE_SECRET_KEY`: server-only project secret key, used for administrator invitations.
- `APP_URL=http://localhost:3000`; `ENABLE_DESIGN_PREVIEW=false`.

Do not put secrets in chat, CLI arguments, screenshots, source files or test reports. Restart/rebuild the app after changing public environment variables. Local `supabase/config.toml` does not configure hosted Auth.

In Auth settings, disable new public signups and anonymous sign-in; use minimum password length 12. Enable email/password login. Site URL is `http://localhost:3000`; allow the exact callback/recovery URLs described in README.md. Configure SMTP and install the Slovak invitation/recovery templates from `supabase/templates/` before invitation acceptance. Settings are saved. Template updates can use the Management API with a project-scoped token authorized to write Auth configuration; SMTP setup requires provider details.

## 2. Review and apply migrations

API keys do not grant CLI migration access. Privately authenticate the CLI or set a scoped `SUPABASE_ACCESS_TOKEN` in the terminal environment, then link the test project. Supply a database password through a private prompt/environment, never a command-line argument. CLI commands were checked against the installed help:

```powershell
npx supabase link --project-ref <test-project-reference>
npx supabase db push --linked --dry-run --skip-vault
```

Confirm the linked project is the intended empty test database and review the ordered pending migrations. Then apply the reviewed plan with `npx supabase db push --linked --skip-vault`. Do not add `--include-seed`; use fictional records through the app. Do not run `db reset` on a hosted project. Any populated or unexpected target needs inspection before proceeding; destructive changes require explicit confirmation.

If CLI access cannot be configured, use the trusted SQL editor after reviewing the migration files in order; record what was applied and reconcile migration history before later CLI pushes. Do not apply the same schema twice.

## 3. Check connectivity and anonymous permissions

```powershell
npm run live:check
```

Uses only the publishable key. Checks Auth settings, protected table reads and anonymous RPC denial. It never writes club records. Unknown schema/network errors fail instead of masquerading as access denial. A passing result is a preflight only, not authenticated acceptance. Sanitized results: `test-results/live-preflight.json` (gitignored).

## 4. Bootstrap and test authenticated accounts

Create a confirmed administrator Auth account in the trusted dashboard and execute the reviewed `supabase/bootstrap.sql` with its UUID substituted only in the SQL editor. Sign in to the app. Through the administrator workflows create fictional coaches, players and guardians, link two children, and invite the test identities. Keep one linked test account inactive. The core test expects distinct accounts with exactly one role each; combined-role cases remain in the manual matrix.

For automated read-only role checks, create gitignored `.env.live.local` privately:

```dotenv
LIVE_TEST_PROJECT_URL=https://your-test-project.supabase.co
LIVE_ADMIN_EMAIL=
LIVE_ADMIN_PASSWORD=
LIVE_COACH_EMAIL=
LIVE_COACH_PASSWORD=
LIVE_GUARDIAN_EMAIL=
LIVE_GUARDIAN_PASSWORD=
LIVE_PLAYER_EMAIL=
LIVE_PLAYER_PASSWORD=
LIVE_INACTIVE_EMAIL=
LIVE_INACTIVE_PASSWORD=
```

The URL must exactly match the configured project origin. Use dedicated test identities, not club members or production records. Never reuse production passwords. Run `npm run test:live` after setup. It signs in each account, verifies identity/profile/role, reads settings and summary RPCs, checks coach financial isolation and sampled guardian/player record scope, then signs out only its own session. Missing accounts block a complete result. Sanitized results: `test-results/live-accounts.json` (gitignored). No emails, tokens, IDs or database response bodies are included in the report.

These checks do not establish cross-tenant safety for every possible ID or test mutation policies. Execute the full [master workflow](LIVE_ACCEPTANCE.md), including direct unauthorized mutations, revocation without token refresh, recurrence/DST, attendance, audited finance, notifications and concurrent requests, and record actual evidence below. T3 collaborative browser is preferred for UI acceptance.

## Repeatable live checks

```powershell
npm run live:check
npm run test:live
node --use-system-ca scripts/live-workflows.mjs --write-test-data
npm run build
npm run start
# In another terminal, with the app listening on localhost:3000:
node --use-system-ca scripts/live-http.mjs
node --use-system-ca scripts/sync-auth-templates.mjs
```

The workflow runner requires the exact private test-project match and explicit write flag. Every run adds fictional members, teams, events and ledger records; it does not delete them. One earlier failed assertion also left fictional records. No destructive cleanup has been performed. It traverses guardian-card cursors, avoiding assumptions about the first page. An RLS-denied UPDATE can return zero rows; tests accept this only for denial/empty results and verify the stored value is unchanged.

The HTTP harness submits actual Next login/logout Server Actions and reads protected SSR pages using separate test sessions. It is not a browser mutation/keyboard/mobile test. Reports contain fixed labels and statuses, not cookies, tokens or record bodies, under ignored `test-results/`.

The template script PATCHes only `mailer_templates_invite_content` and `mailer_templates_recovery_content`, then GET-verifies exact contents and preserved signup/anonymous/password/site/redirect settings. Both local templates use `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=invite` (or `recovery`), matching the application's `verifyOtp` route. The replacement token resolved HTTP 403. PATCH now returns HTTP 400: free-tier projects with the default email provider cannot modify email templates without custom SMTP or a paid plan. No upgrade or SMTP configuration performed. Readback confirms neither template matches the local file and the required signup/password/site/redirect settings remain intact. Do not retry unchanged requests until the provider prerequisite is resolved. No mail is sent by this script; SMTP delivery remains unverified.

## Evidence ledger - 2026-10-14

| Area                               | Live status            | Evidence / limit                                                                                                                            |
| ---------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Test project/schema                | Passed                 | 17 applied migrations, 18 RLS tables, 19 public RPCs; fictional data only                                                                   |
| Auth settings                      | Passed                 | Signup and anonymous login disabled; minimum 12; localhost site/callback/recovery redirects retained                                        |
| Anonymous/Auth preflight           | Passed                 | Sanitized `live-preflight.json`; denial distinguished from schema/network errors                                                            |
| Account login/profile/roles        | Passed                 | Fresh `npm run test:live`; separate admin, coach, guardian, player and inactive identities                                                  |
| Mutations and immediate revocation | 17 checks passed       | Fresh `live-workflows.json`; event/team/family scope, role denial, availability/attendance, notifications, finance audit and deactivation   |
| Concurrent finance                 | Passed for tested race | Independent simultaneous payments cannot overpay one charge; not an exhaustive load test                                                    |
| Next login/SSR/logout              | 50 checks passed       | Fresh `live-http.json`; server actions and protected routes, not browser mutation acceptance                                                |
| Hourly reminder scheduler          | Passed                 | Installed/active; 13 successful scheduled executions, no failed status group at inspection; deduplication tested                            |
| Invite/recovery templates          | Blocked                | Correct local TokenHash contract; new token accepted, but HTTP 400 requires custom SMTP or paid plan on this free project                   |
| Email delivery                     | Unverified             | No SMTP configured; no delivery or clicked-email acceptance claimed                                                                         |
| Master UI/mobile/keyboard          | Pending                | Admin T3: created plan at EUR 12.50, edited to EUR 13.75, reload persisted; 390px layout had no horizontal overflow. Full matrix still open |
| Backup restore and deployment      | Not run                | Separate release gates                                                                                                                      |

Local verification: 113 tests across eight files, TypeScript/ESLint and production build pass. Existing Vitest configuration warning remains. Security advisor reported leaked-password protection disabled. Node HTTPS uses system CA trust; direct database operations used TLS with the official Supabase root certificate. No insecure TLS override.

No database reset/deletion, production records, GitHub push or deployment. Keep invitation partial-failure reconciliation, full browser acceptance, representative load and backup restoration open.

### Browser evidence

Authenticated admin create/edit fee-plan forms passed in T3 with fictional data on 2026-10-14. Reload confirmed persistence. Mobile viewport 390x844: document width 390, no horizontal overflow; snapshot console was empty. The subsequent archive confirmation click timed out. Read-only DB inspection confirmed exactly one matching fictional plan, still active at 1375 cents; archival did not complete. T3 status/snapshot also timed out, blocking further browser steps. Full role/mobile/keyboard workflow acceptance remains open.

### Continuation: provider restriction and TokenHash integration

The previous archive click completed after its timeout; the archived plan appeared in T3 on continuation. Its restore form succeeded; a direct read confirmed exactly one matching fictional plan, active at 1375 cents. No duplicate archive mutation was submitted.

`node --use-system-ca scripts/live-auth-links.mjs --write-test-data` passed 10 new checks: invite/recovery TokenHash verification through the real Next route, replay rejection, password Server Action, login with the new password and absence of accessible profiles for an unlinked identity. Auth admin `generateLink` sends no mail. One new fictional unlinked Auth identity remains; generated passwords and tokens were kept only in memory. Test login sessions were signed out; HTTP cookie jars were discarded (discarding a jar is not server-side session revocation). This does not verify email delivery, delivered links, profile linking or partial invitation reconciliation.

An initial attempt stopped at app preflight because the local server was no longer running; no Auth identity was created by that failed attempt. Restarting the production app allowed the new test to complete. Existing successful live account, HTTP route and database workflow suites were not rerun. Required local check/test/build were rerun after script changes.

Sanitized evidence: `test-results/live-auth-template-verification.json` (five required settings checks true, both template-match checks false) and `test-results/live-auth-links.json` (10 passed). Raw Management configuration, tokens, passwords and generated links are never reported. SMTP setup and email delivery remain separate pending tasks; template deployment is dependent on the provider restriction being resolved.

### Continuation: authenticated T3 workflows and UI corrections

2026-10-14, local Next production server at localhost:3000 against the existing fictional-data Supabase project. Existing admin browser session resumed. Other roles used real password login through the existing Next Server Action, with cookies handed to T3 by an ignored, one-use loopback helper. The helper checks the stored test project, rejects cross-site requests and stops after use/60 seconds; it is not an application route or authentication bypass. No password/token was printed. This does **not** claim browser typing/autofill/login-form acceptance for those roles. Browser logout was used between roles.

| Role / viewport             | Scenario and observed result                                                                                                                                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Admin, desktop              | Saved fictional venue `Testovacia hala T3` and categories U14/U16/Seniori; full navigation reload retained both. New event prefilled the venue; new team dialog offered exactly those configured categories.                                                                                     |
| Admin, desktop              | Created two weekly `T3 tréning cez zmenu času` events, 22 and 29 October 2026, 18:00–19:30. Both calendar entries retained local times across DST. Records retained.                                                                                                                             |
| Coach, mobile               | Edited only the first occurrence's venue to `Testovacia hala T3 – presun`; second occurrence remained at the original venue and time. Saved child A actual attendance as absent; planned response stayed pending.                                                                                |
| Coach, mobile               | Direct payments URL showed zero accessible charges and no club financial records. This checks the UI read outcome, not an exhaustive new authorization test.                                                                                                                                     |
| Guardian, mobile/desktop    | Dashboard displayed linked child cards and separate balances. Event roster contained two linked siblings. Saved A planned response as yes; reload showed A `Príde / Neprítomný`, B `Čaká na odpoveď / Nezaznamenaná`. Planned and actual states stayed independent. No actual-attendance editor. |
| Player, desktop/mobile      | Own contact edit persisted after navigation reload. Own-team event `T3 tréning hráča` appeared on the dashboard. Saved `Ešte neviem` on mobile; reload retained it and actual attendance remained unrecorded. No event/attendance management controls.                                           |
| Player, mobile, rebuilt app | Foreign event and nonexistent valid UUID both rendered identical Slovak unavailable text and a calendar return link. Neither exposed the event. Accessible own event still rendered and accepted its response.                                                                                   |
| Admin, mobile, rebuilt app  | Settings and audit menu links closed the drawer. Correct breadcrumb and active settings link verified. Escape closed the drawer and restored focus to the menu opener.                                                                                                                           |
| Selected layouts            | At 390x844, settings, new-team dialog, event/response pages and player profile had no document horizontal overflow. Guardian event also checked at 1280x800. This uses desktop Chromium resized to mobile CSS dimensions, not a physical phone.                                                  |

Reproduced before fixing: settings/audit were outside the shared navigation label lookup and lacked drawer-close handlers. The event detail used `.single()` plus the generic error helper for an RLS-hidden row, incorrectly recommending a connection retry. It now uses `.maybeSingle()` and only maps a successful empty response to `notFound()`; database errors still reach the error boundary. A route-specific Slovak not-found page preserves the existing design. No authorization or database policy changed.

An initial player interaction ran before streamed event content appeared and failed before submitting. Re-inspection after render and a single successful submission completed the test. Browser logs also contained preexisting Electron renderer errors and aborted navigation prefetches; no clean-console claim. No transient mutation was blindly repeated.

Required checks after source changes: `npm run check`, `npm test` (113/eight files), `npm run build` passed; `git diff --check` passed. Vitest still warns about CommonJS config loading. PGlite remains separate from live testing. Existing Graphify reused without extraction/rebuild.

Test state retained: three new fictional events, one actual attendance and two planned responses, fictional venue/categories and player contact update. No deletion, cancellation, financial reversal, schema change, email send, GitHub push or deployment in this continuation. Remaining browser gates include full financial forms/corrections/reversals, family/role administration and pagination, announcement audiences, combined roles, session revocation UI, keyboard/screen-reader coverage and network-failure rehearsal. Other detail routes using generic record errors need a separate UX review. Dashboard singular wording (`1 odpovedí`) remains a minor copy follow-up. SMTP/domain, invitation partial failure and backup restore remain release gates.
