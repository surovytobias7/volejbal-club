# Project instructions

Build a new single-club volleyball management application. Never inspect or copy an earlier club repository. Work in the main session; do not spawn agents.

- All user-facing text is Slovak, with sk-SK formatting, EUR and Europe/Bratislava. Identifiers are English.
- Use Next.js App Router, strict TypeScript, Supabase Auth and PostgreSQL RLS. Authorize every mutation on the server and database.
- Roles are additive. Coaches never inherit financial access. Guardian access is relationship-scoped. Deactivation must take effect without waiting for JWT refresh.
- Keep planned availability and actual attendance separate. Store money in integer cents. Audit financial corrections.
- Never substitute demo fixtures for a failed database query. Development previews must be explicit and isolated from authentication.
- Never commit secrets, print credentials, use production records as fixtures, or claim unverified deployment/readiness.
- Use the T3 collaborative preview for browser inspection when available.
- Update docs/PROGRESS.md and docs/FEATURES.md with actual implementation and verification, including blockers.
- Run npm run check, npm test and npm run build before handoff. Database tests use PGlite; this does not replace live Supabase integration testing.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
