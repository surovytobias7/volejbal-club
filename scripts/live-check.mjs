import nextEnv from "@next/env";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import {
  liveConfiguration,
  deniedOrEmpty,
  createReport,
} from "./live-support.mjs";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
if (existsSync(".env.live.local")) process.loadEnvFile(".env.live.local");
const report = createReport();
const withAccounts = process.argv.includes("--accounts");
const config = liveConfiguration(process.env);
const makeClient = () =>
  createClient(config.url, config.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: async (url, options) => {
        try {
          return await fetch(url, {
            ...options,
            redirect: "error",
            signal: AbortSignal.timeout(15000),
          });
        } catch {
          throw new Error("Pripojenie zlyhalo.");
        }
      },
    },
  });

async function account(label, expectedRole) {
  const email = process.env[`LIVE_${label}_EMAIL`];
  const password = process.env[`LIVE_${label}_PASSWORD`];
  if (!email || !password) {
    report.blocked(`${label}: chýba testovací účet`);
    return;
  }
  const db = makeClient();
  try {
    const login = await db.auth.signInWithPassword({ email, password });
    report.add(
      `${label}: prihlásenie cez Auth`,
      !login.error && !!login.data.user,
    );
    if (login.error || !login.data.user) return;
    const user = await db.auth.getUser();
    report.add(
      `${label}: serverové overenie identity`,
      !user.error && user.data.user?.id === login.data.user.id,
    );
    const context = await db.rpc("viewer_context");
    if (context.error?.code === "PGRST202") {
      report.blocked(`${label}: chýba migrácia prístupového kontextu`);
      return;
    }
    if (label === "INACTIVE") {
      report.add(
        `${label}: profil neprístupný`,
        !context.error && context.data === null,
      );
      for (const table of [
        "charges",
        "events",
        "guardian_players",
        "user_roles",
      ])
        report.add(
          `${label}: ${table} neprístupné`,
          deniedOrEmpty(await db.from(table).select("*").limit(1)),
        );
      return;
    }
    const profile = context.data;
    const linked =
      !context.error &&
      typeof profile?.id === "string" &&
      Array.isArray(profile.roles) &&
      profile.roles.length > 0;
    report.add(`${label}: aktívny prepojený profil`, linked);
    if (!linked) return;
    const roles = await db
      .from("user_roles")
      .select("role")
      .eq("profile_id", profile.id);
    const correctRole =
      !roles.error &&
      roles.data?.length === 1 &&
      roles.data[0].role === expectedRole;
    report.add(`${label}: očakávaná samostatná rola`, correctRole);
    if (!correctRole) return;
    const settings = await db.from("club_settings").select("id").single();
    report.add(
      `${label}: načítanie nastavení`,
      !settings.error && settings.data?.id === true,
    );
    const summary = await db.rpc("dashboard_summary", {
      p_at: new Date().toISOString(),
    });
    report.add(
      `${label}: dashboard RPC`,
      !summary.error && typeof summary.data?.team_count === "number",
    );
    const family = await db.rpc("guardian_dashboard", {
      p_at: new Date().toISOString(),
      p_after: null,
    });
    report.add(
      `${label}: rodinný RPC kontrakt`,
      !family.error &&
        Array.isArray(family.data?.items) &&
        typeof family.data?.total === "number",
    );
    const finance = await db.rpc("finance_summary", { p_charge_id: null });
    report.add(
      `${label}: finančný RPC kontrakt`,
      !finance.error && Number.isSafeInteger(finance.data?.remaining),
    );
    if (label === "COACH") {
      report.add(
        `${label}: bez finančných záznamov`,
        deniedOrEmpty(await db.from("charges").select("id").limit(1)),
      );
      report.add(
        `${label}: bez poplatkových plánov`,
        deniedOrEmpty(await db.from("fee_plans").select("id").limit(1)),
      );
      report.add(
        `${label}: nulový finančný súhrn`,
        !finance.error &&
          finance.data?.count === 0 &&
          finance.data?.remaining === 0,
      );
    }
    if (label === "GUARDIAN" || label === "PLAYER") {
      const links = await db
        .from("guardian_players")
        .select("player_id")
        .eq("guardian_id", profile.id)
        .limit(101);
      const complete = !links.error && links.data.length <= 100;
      report.add(`${label}: rozsah rodinných väzieb načítaný`, complete);
      if (complete) {
        const allowed = new Set(links.data.map((g) => g.player_id));
        report.add(
          `${label}: karty len vlastných detí`,
          !family.error &&
            Array.isArray(family.data?.items) &&
            family.data.items.every((c) => allowed.has(c.id)),
        );
        allowed.add(profile.id);
        const charges = await db.from("charges").select("player_id").limit(100);
        report.add(
          `${label}: vzorka poplatkov len v povolenom rozsahu`,
          !charges.error && charges.data.every((c) => allowed.has(c.player_id)),
        );
      }
    }
  } catch {
    report.add(`${label}: požiadavky dokončené`, false);
  } finally {
    try {
      const logout = await db.auth.signOut({ scope: "local" });
      report.add(`${label}: odhlásenie testovacej relácie`, !logout.error);
    } catch {
      report.add(`${label}: odhlásenie testovacej relácie`, false);
    }
  }
}

try {
  if (!config)
    report.blocked("Chýba platné pripojenie s publishable/anon kľúčom");
  else {
    report.add(
      "Izolovaná ukážka vypnutá",
      process.env.ENABLE_DESIGN_PREVIEW !== "true",
    );
    const db = makeClient();
    // No administrative key, inserts, updates, deletes or mutating RPCs used.
    const settings = await fetch(`${config.url}/auth/v1/settings`, {
      headers: { apikey: config.key },
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    report.add("Auth je dostupný", settings.ok);
    if (settings.ok) {
      const authSettings = await settings.json();
      report.add(
        "Verejná registrácia vypnutá",
        authSettings.disable_signup === true,
      );
      report.add(
        "Anonymné prihlasovanie vypnuté",
        authSettings.external?.anonymous_users === false,
      );
    }
    for (const table of [
      "profiles",
      "user_roles",
      "charges",
      "payments",
      "charge_adjustments",
      "guardian_players",
    ])
      report.add(
        `Anonymný prístup odmietnutý: ${table}`,
        deniedOrEmpty(await db.from(table).select("*").limit(1)),
      );
    const rpc = await db.rpc("guardian_dashboard", {
      p_at: new Date().toISOString(),
      p_after: null,
    });
    report.add("Rodinný RPC vyžaduje prihlásenie", rpc.error?.code === "42501");
    if (withAccounts && process.env.LIVE_TEST_PROJECT_URL !== config.url) {
      report.blocked("Potvrďte testovací projekt cez LIVE_TEST_PROJECT_URL");
    } else if (withAccounts) {
      for (const [label, role] of [
        ["ADMIN", "admin"],
        ["COACH", "coach"],
        ["GUARDIAN", "guardian"],
        ["PLAYER", "player"],
        ["INACTIVE", null],
      ])
        await account(label, role);
    }
  }
} catch {
  report.add("Kontrola pripojenia dokončená", false);
}
const result = report.result();
await mkdir("test-results", { recursive: true });
await writeFile(
  withAccounts
    ? "test-results/live-accounts.json"
    : "test-results/live-preflight.json",
  JSON.stringify(result, null, 2),
);
for (const check of result.checks)
  console.log(`${check.status.toUpperCase()}: ${check.name}`);
console.log(
  "Kontrola nemení klubové záznamy. Úplný E2E scenár sa overuje samostatne.",
);
process.exitCode = result.passed ? 0 : 1;
