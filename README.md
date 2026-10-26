# Volej klub

Slovak, single-club volleyball management application. Next.js App Router, React, strict TypeScript, Tailwind, Radix components, Supabase Auth and PostgreSQL RLS. This is an implementation in progress, not a verified production release. See [progress](docs/PROGRESS.md) and [feature status](docs/FEATURES.md).

## Run on Windows

Requires Node.js 24 LTS and npm. Run from this directory:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000. Without Supabase configuration, the app shows setup instructions; it never substitutes fixtures for live queries. For an explicitly labelled visual preview, set `ENABLE_DESIGN_PREVIEW=true` in `.env.local` and visit `/ukazka`. Disable it on public deployments. Preview actions do not save records.

## Supabase connection

Use a new dedicated Supabase project, or local Supabase with Docker Desktop. Required values in `.env.local`:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key; legacy anon key also works |
| `SUPABASE_SECRET_KEY` | Server-only secret/service-role key for invitations |
| `APP_URL` | Exact application origin; HTTPS in production |
| `ENABLE_DESIGN_PREVIEW` | Optional isolated fixture preview, normally `false` |

Never paste keys into chat or commit `.env.local`. All regular reads/writes use the signed-in user's client and RLS. The privileged client is used only for administrator-authorized Auth invitations.

For a local instance, install/start Docker, then use the installed CLI's `--help` to verify commands:

```powershell
npx supabase start
npx supabase db reset
```

`db reset` is destructive and is for disposable **local development databases only**. It applies migrations and clearly labelled fictional seed records. Seed profiles have no Auth identities/passwords; use invitations to connect test accounts. No production fixtures or authentication bypass exist.

For a hosted project, use Supabase CLI linking and migration push after reviewing `npx supabase link --help` and `npx supabase db push --help`. Review migration history and back up any populated database first. Do not run the local seed on production. Local `config.toml` does not automatically configure hosted Auth.

In Supabase Auth settings:

1. Disable public email registration and anonymous sign-in. Set minimum password length to 12.
2. Set Site URL to `APP_URL`; allow exact `/auth/callback` and `/nove-heslo` redirect URLs.
3. Configure real SMTP delivery and suitable rate limits before inviting club members.
4. Copy the Slovak invite and recovery templates from `supabase/templates/`. They use `/auth/confirm?token_hash=…&type=…` for server-side token verification. Do not leave the default browser-hash invitation template in place.

## First administrator

1. In the trusted Supabase Auth dashboard, create a confirmed account for the club administrator. Choose a unique strong password; never put it in repository files.
2. Copy that account's UUID into the placeholder in `supabase/bootstrap.sql`, then execute the reviewed script in the trusted SQL editor. It runs transactionally and refuses to run if an administrator already exists.
3. Sign in at `/prihlasenie`. Update the administrator name and club settings.
4. Create member profiles, grant the required roles, link parents to players, create teams and assign coaches/players. Invite only members who need their own login. Minors may participate through their guardian's account.

Invitation creation and profile linking span Auth and the database and cannot be one transaction. The app distinguishes unknown provider outcomes from accepted invitations with unconfirmed linking. Verify the intended identity and actual link before retrying; use the current administrator's `link_member_account` RPC for reconciliation. Do not overwrite links or create duplicate people or roles. Follow [the invitation recovery runbook](docs/INVITATIONS.md).

## Checks

```powershell
npm run check       # strict TypeScript and ESLint
npm test            # Vitest domain and PostgreSQL authorization tests
npm run db:types    # regenerate typed DB contract from migrations in PGlite
npm run build
npm start
```

Database tests execute real PostgreSQL RLS/constraints under authenticated and anonymous roles in PGlite. The test-only `auth.uid()` fixture models Supabase identity context. These tests do **not** validate hosted Supabase Auth, PostgREST, SMTP, or concurrent backend sessions. T3 browser inspection covers locally accessible UI; live authenticated end-to-end tests still require a configured disposable Supabase environment.

`npm run format` formats source/tests/documentation. Lockfile is committed with the project when changes are committed. Production dependency audit was clean at the last check; the development lint chain has an unpatched `braces` advisory (see progress).

## Architecture and operation

- [Architecture and design decisions](docs/ARCHITECTURE.md)
- [Database and access rules](docs/DATABASE.md)
- [Deployment and recovery](docs/DEPLOYMENT.md)
- [Feature status](docs/FEATURES.md)
- [Progress and next tasks](docs/PROGRESS.md)
- [Graphify report](graphify-out/GRAPH_REPORT.md) and [interactive graph](graphify-out/graph.html)

No online payment gateway, card processing, external push delivery, deployment, or legal compliance certification is included.
