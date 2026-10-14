import { readFile, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { management } from "./live-runtime.mjs";
import { createReport } from "./live-support.mjs";
const report = createReport();
try {
  const before = await management("config/auth", undefined, "GET");
  const templates = {
    mailer_templates_invite_content: await readFile(
      "supabase/templates/invite.html",
      "utf8",
    ),
    mailer_templates_recovery_content: await readFile(
      "supabase/templates/recovery.html",
      "utf8",
    ),
  };
  for (const [key, value] of Object.entries(templates)) {
    const type = key.includes("invite") ? "invite" : "recovery";
    if (
      !value.includes(
        `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=${type}`,
      )
    )
      throw new Error("Invalid template contract");
  }
  await management("config/auth", templates, "PATCH");
  const after = await management("config/auth", undefined, "GET");
  const otherSettings = (settings) =>
    Object.fromEntries(
      Object.entries(settings).filter(([key]) => !(key in templates)),
    );
  report.add(
    "Všetky ostatné nastavenia Auth zostali zachované",
    isDeepStrictEqual(otherSettings(before), otherSettings(after)),
  );
  report.add(
    "Pozvánková šablóna uložená a overená",
    after.mailer_templates_invite_content ===
      templates.mailer_templates_invite_content,
  );
  report.add(
    "Šablóna obnovy hesla uložená a overená",
    after.mailer_templates_recovery_content ===
      templates.mailer_templates_recovery_content,
  );
  for (const key of [
    "disable_signup",
    "external_anonymous_users_enabled",
    "password_min_length",
    "site_url",
    "uri_allow_list",
  ])
    report.add(`Zachované nastavenie ${key}`, before[key] === after[key]);
  report.add(
    "Verejná registrácia zostala vypnutá",
    after.disable_signup === true,
  );
  report.add(
    "Minimálna dĺžka hesla zostala 12",
    after.password_min_length === 12,
  );
} catch (error) {
  report.blocked(
    error.code === "templates_require_smtp_or_paid_plan"
      ? "Free projekt vyžaduje vlastné SMTP alebo platený plán na úpravu šablón"
      : error.message === "Management HTTP 403"
        ? "Token nemá oprávnenie meniť Auth konfiguráciu (HTTP 403)"
        : /^Management HTTP \d{3}$/.test(error.message)
          ? `Aktualizácia šablón zlyhala (${error.message})`
          : "Aktualizácia šablón zlyhala",
  );
}
const result = report.result();
result.scope = "management-auth-template-configuration";
await writeFile(
  "test-results/live-auth-templates.json",
  JSON.stringify(result, null, 2),
);
for (const check of result.checks)
  console.log(`${check.status.toUpperCase()}: ${check.name}`);
console.log("Doručenie e-mailov cez SMTP nebolo overené.");
process.exitCode = result.passed ? 0 : 1;
