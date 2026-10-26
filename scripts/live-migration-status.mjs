// Read-only history inspection. Never applies migrations or prints connection data.
import { existsSync } from "node:fs";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import nextEnv from "@next/env";
import {
  inspectMigrationHistory,
  compareMigrationHistory,
  migrationReasons,
} from "./migration-support.mjs";
import postgres from "postgres";

// Preserve the established environment precedence; never print loaded values.
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
if (existsSync(".env.live.local")) process.loadEnvFile(".env.live.local");
const local = (await readdir("supabase/migrations"))
  .filter((name) => name.endsWith(".sql"))
  .sort();
// Explicit alternative when Management credentials are unavailable. Never fall
// back silently to privileged database access and never apply schema changes.
async function directHistory() {
  let sql;
  try {
    const target = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const ref = target.hostname.split(".")[0];
    const linked = (
      await readFile("supabase/.temp/project-ref", "utf8")
    ).trim();
    const pooler = new URL(
      (await readFile("supabase/.temp/pooler-url", "utf8")).trim(),
    );
    if (
      !/^[a-z]{20}\.supabase\.co$/.test(target.hostname) ||
      target.protocol !== "https:" ||
      target.href !== new URL(process.env.LIVE_TEST_PROJECT_URL).href ||
      linked !== ref ||
      pooler.protocol !== "postgresql:" ||
      !/^[a-z0-9-]+\.pooler\.supabase\.com$/.test(pooler.hostname) ||
      decodeURIComponent(pooler.username) !== `postgres.${ref}` ||
      pooler.pathname !== "/postgres" ||
      !["5432", "6543"].includes(pooler.port) ||
      pooler.search ||
      pooler.hash ||
      pooler.password ||
      !process.env.SUPABASE_DB_PASSWORD
    )
      return { status: "blocked", code: "unconfirmed_target" };
    sql = postgres(pooler.toString(), {
      password: process.env.SUPABASE_DB_PASSWORD,
      ssl: {
        rejectUnauthorized: true,
        ...(process.env.SUPABASE_DB_CA_FILE
          ? { ca: await readFile(process.env.SUPABASE_DB_CA_FILE, "utf8") }
          : {}),
      },
      connect_timeout: 15,
      max: 1,
      onnotice() {},
    });
    const rows = await sql.begin(
      "read only",
      (tx) =>
        tx`select version from supabase_migrations.schema_migrations order by version`,
    );
    return compareMigrationHistory(local, rows);
  } catch {
    return { status: "blocked", code: "network_failed" };
  } finally {
    if (sql) await sql.end({ timeout: 2 });
  }
}
const direct = process.argv.includes("--direct");
const report = {
  at: new Date().toISOString(),
  scope: "read-only-migration-history",
  local,
  method: direct ? "postgres-tls-read-only" : "management-api",
  ...(direct
    ? await directHistory()
    : await inspectMigrationHistory({
        env: process.env,
        local,
        linkedRef: existsSync("supabase/.temp/project-ref")
          ? (await readFile("supabase/.temp/project-ref", "utf8")).trim()
          : null,
      })),
};
if (report.code) report.reason = migrationReasons[report.code];
await mkdir("test-results", { recursive: true });
await writeFile(
  "test-results/live-migrations.json",
  JSON.stringify(report, null, 2),
);
if (report.status === "verified") {
  console.log(
    `Overené migrácie: ${report.applied.length}. Čakajúce: ${report.pending.length}.`,
  );
  for (const name of report.pending) console.log(`ČAKÁ: ${name}`);
} else {
  console.log(
    `Migračná história nie je overená. ${report.reason || "Neznáme verzie alebo nesprávne poradie vyžadujú kontrolu."}`,
  );
  process.exitCode = 1;
}
console.log(
  "Databáza nebola zmenená. Výsledok: test-results/live-migrations.json.",
);
