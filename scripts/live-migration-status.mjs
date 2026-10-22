// Read-only history inspection. Never applies migrations or prints connection data.
import { existsSync } from "node:fs";
import { readdir, mkdir, writeFile } from "node:fs/promises";
import { config, management } from "./live-runtime.mjs";

if (existsSync(".env.live.local")) process.loadEnvFile(".env.live.local");
const local = (await readdir("supabase/migrations"))
  .filter((name) => /^\d{14}_.+\.sql$/.test(name))
  .sort();
const report = {
  at: new Date().toISOString(),
  scope: "read-only-migration-history",
  local,
  status: "blocked",
};
try {
  if (config.url !== process.env.LIVE_TEST_PROJECT_URL) {
    report.reason = "Testovací projekt nie je výslovne potvrdený.";
  } else {
    const rows = await management("database/query", {
      query:
        "select version from supabase_migrations.schema_migrations order by version",
      read_only: true,
    });
    if (
      !Array.isArray(rows) ||
      rows.some((row) => !/^\d{14}$/.test(row.version))
    ) {
      report.reason = "Migračná história nemá očakávaný formát.";
    } else {
      const applied = rows.map((row) => row.version);
      report.applied = applied;
      report.pending = local.filter(
        (name) => !applied.includes(name.slice(0, 14)),
      );
      report.unknown = applied.filter(
        (version) => !local.some((name) => name.startsWith(version + "_")),
      );
      report.outOfOrder = report.pending.some((name) =>
        applied.some((version) => version > name.slice(0, 14)),
      );
      report.status =
        report.unknown.length || report.outOfOrder ? "review" : "verified";
    }
  }
} catch (error) {
  report.reason = /^Management HTTP \d{3}$/.test(error.message)
    ? error.message
    : "Históriu sa nepodarilo načítať; pripojenie nie je overené.";
}
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
