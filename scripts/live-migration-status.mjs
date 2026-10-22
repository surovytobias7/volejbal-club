// Read-only history inspection. Never applies migrations or prints connection data.
import { existsSync } from "node:fs";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import nextEnv from "@next/env";
import {
  inspectMigrationHistory,
  migrationReasons,
} from "./migration-support.mjs";

// Preserve the established environment precedence; never print loaded values.
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
if (existsSync(".env.live.local")) process.loadEnvFile(".env.live.local");
const local = (await readdir("supabase/migrations"))
  .filter((name) => name.endsWith(".sql"))
  .sort();
const report = {
  at: new Date().toISOString(),
  scope: "read-only-migration-history",
  local,
  ...(await inspectMigrationHistory({
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
