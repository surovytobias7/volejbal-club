// Opt-in fictional data only. Ordinary authenticated clients exercise RLS;
// no service key, email, schema mutation, deletion or automatic cleanup.
import nextEnv from "@next/env";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import {
  liveConfiguration,
  createReport,
  deniedOrEmpty,
} from "./live-support.mjs";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
process.loadEnvFile(".env.live.local");
const config = liveConfiguration(process.env);
const report = createReport();
const clients = [];
const created = {};
let step = "Potvrdený testovací cieľ a migračná história";
const assert = (name, condition) => {
  report.add(name, !!condition);
  if (!condition) throw new Error("Assertion failed");
};
const checked = (result) => {
  if (result.error) {
    report.add(
      `${step}: ${/^[A-Z0-9_]{2,20}$/i.test(result.error.code || "") ? result.error.code : "request_failed"}`,
      false,
    );
    throw new Error("Request failed");
  }
  return result.data;
};
function client() {
  const db = createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url, options) =>
        fetch(url, {
          ...options,
          redirect: "error",
          signal: AbortSignal.timeout(20000),
        }),
    },
  });
  clients.push(db);
  return db;
}
async function login(label) {
  const db = client();
  const auth = checked(
    await db.auth.signInWithPassword({
      email: process.env[`LIVE_${label}_EMAIL`],
      password: process.env[`LIVE_${label}_PASSWORD`],
    }),
  );
  const profile = checked(await db.rpc("viewer_context"));
  return { db, profile, authId: auth.user.id };
}
const insert = async (db, table, data) =>
  checked(await db.from(table).insert(data).select("*").single());
const save = (db, event, changes) =>
  db.rpc("save_attendance", { p_event: event, p_changes: changes });
const change = (player_id, status, expected_version = 0, reason = "") => ({
  player_id,
  status,
  expected_version,
  reason,
});
const roster = async (db, event) =>
  checked(
    await db.rpc("event_roster_page", {
      p_event: event,
      p_query: "",
      p_name: null,
      p_id: null,
    }),
  );
try {
  const history = JSON.parse(
    await readFile("test-results/live-migrations.json", "utf8"),
  );
  const identities = JSON.parse(
    await readFile("test-results/live-identities.json", "utf8"),
  );
  if (
    !config ||
    config.url !== process.env.LIVE_TEST_PROJECT_URL ||
    identities.project !== config.url ||
    !process.argv.includes("--write-test-data") ||
    history.status !== "verified" ||
    history.pending.length ||
    history.unknown.length ||
    Date.now() - Date.parse(history.at) > 3600000
  )
    throw new Error("Explicit current verification required");
  for (const label of ["ADMIN", "COACH", "GUARDIAN", "PLAYER", "INACTIVE"])
    if (
      identities.accounts[label]?.email !== process.env[`LIVE_${label}_EMAIL`]
    )
      throw new Error("Fictional account mismatch");
  assert(step, true);
  step = "Prihlásenie fiktívnych účtov";
  const admin = await login("ADMIN");
  const coach = await login("COACH");
  const parent = await login("GUARDIAN");
  const player = await login("PLAYER");
  const inactive = await login("INACTIVE");
  assert(
    step,
    admin.profile.roles.includes("admin") &&
      coach.profile.roles.includes("coach") &&
      parent.profile.roles.includes("guardian") &&
      player.profile.roles.includes("player") &&
      !inactive.profile,
  );
  step = "Izolované fiktívne tímy, hráči a rodinné väzby";
  const suffix = new Date().toISOString();
  const team = await insert(admin.db, "teams", {
    name: `TEST dochádzka ${suffix}`,
    category: "U16",
  });
  const other = await insert(admin.db, "teams", {
    name: `TEST cudzí tím ${suffix}`,
    category: "U16",
  });
  Object.assign(created, { team: team.id, otherTeam: other.id });
  const children = [];
  for (const name of [
    "TEST Dochádzka dieťa A",
    "TEST Dochádzka dieťa B",
    "TEST Dochádzka cudzí hráč",
  ])
    children.push(
      checked(
        await admin.db.rpc("create_member", {
          p_name: name,
          p_email: "",
          p_phone: "",
          p_birth: "2013-01-01",
          p_role: "player",
        }),
      ),
    );
  Object.assign(created, { children, player: player.profile.id });
  checked(
    await admin.db.from("team_memberships").insert([
      { team_id: team.id, profile_id: coach.profile.id, kind: "coach" },
      ...[...children.slice(0, 2), player.profile.id].map((profile_id) => ({
        team_id: team.id,
        profile_id,
        kind: "player",
      })),
      { team_id: other.id, profile_id: children[2], kind: "player" },
    ]),
  );
  checked(
    await admin.db
      .from("guardian_players")
      .insert(
        children
          .slice(0, 2)
          .map((player_id) => ({ guardian_id: parent.profile.id, player_id })),
      ),
  );
  const eventData = {
    title: `TEST tréning dochádzky ${suffix}`,
    kind: "training",
    venue: "Fiktívna testovacia hala",
    starts_at: new Date(Date.now() - 3600000).toISOString(),
    ends_at: new Date().toISOString(),
  };
  const event = await insert(coach.db, "events", {
    ...eventData,
    team_id: team.id,
  });
  const foreign = await insert(admin.db, "events", {
    ...eventData,
    team_id: other.id,
  });
  Object.assign(created, { event: event.id, foreignEvent: foreign.id });
  assert(step, (await roster(coach.db, event.id)).items.length === 3);
  step = "Oddelenie plánovaných odpovedí a skutočnej dochádzky";
  checked(
    await parent.db.from("availability").insert({
      event_id: event.id,
      player_id: children[0],
      response: "no",
      reason: "Fiktívny rodinný program",
    }),
  );
  checked(
    await player.db.from("availability").insert({
      event_id: event.id,
      player_id: player.profile.id,
      response: "yes",
    }),
  );
  const batch = [
    change(children[0], "present"),
    change(player.profile.id, "absent"),
  ];
  const saved = checked(await save(coach.db, event.id, batch));
  const loaded = await roster(coach.db, event.id);
  assert(
    step,
    saved.length === 2 &&
      loaded.items.find((p) => p.profile_id === children[0]).availability
        .response === "no" &&
      loaded.items.find((p) => p.profile_id === children[0]).attendance ===
        "present" &&
      loaded.items.find((p) => p.profile_id === player.profile.id).availability
        .response === "yes" &&
      loaded.items.find((p) => p.profile_id === player.profile.id)
        .attendance === "absent" &&
      loaded.items.find((p) => p.profile_id === children[1]).attendance ===
        null,
  );
  const retry = checked(await save(coach.db, event.id, batch));
  assert(
    "Opakovanie dávky nemení verzie",
    retry.every((r) => r.version === 1),
  );
  step = "Súkromie a odmietnutie nepovolených zápisov";
  assert(
    "Hráč vidí iba vlastnú dochádzku",
    (await roster(player.db, event.id)).items.every(
      (p) => p.profile_id === player.profile.id,
    ),
  );
  const parentRoster = await roster(parent.db, event.id);
  assert(
    "Rodič vidí presne svoje dve deti",
    parentRoster.items.length === 2 &&
      parentRoster.items.every((p) =>
        children.slice(0, 2).includes(p.profile_id),
      ),
  );
  for (const [label, db] of [
    ["Hráč", player.db],
    ["Rodič", parent.db],
    ["Deaktivovaný účet", inactive.db],
  ])
    assert(
      `${label}: zápis skutočnej účasti odmietnutý`,
      (await save(db, event.id, [change(player.profile.id, "present", 1)]))
        .error?.code === "42501",
    );
  assert(
    "Tréner: cudzí tím odmietnutý",
    (await save(coach.db, foreign.id, [change(children[2], "present")])).error
      ?.code === "42501",
  );
  assert(
    "Rodič: odpoveď za cudzieho hráča odmietnutá",
    (
      await parent.db.from("availability").insert({
        event_id: event.id,
        player_id: player.profile.id,
        response: "no",
      })
    ).error?.code === "42501",
  );
  assert(
    "Tréner: finančné údaje neprístupné",
    deniedOrEmpty(await coach.db.from("charges").select("id")),
  );
  step = "Opravy, ospravedlnenie a vymazanie označenia";
  const corrections = checked(
    await save(coach.db, event.id, [
      change(children[0], "late", 1),
      change(children[1], "excused", 0, "Fiktívny rodinný program"),
    ]),
  );
  assert(
    step,
    corrections.some((r) => r.status === "late" && r.version === 2) &&
      corrections.some((r) => r.reason === "Fiktívny rodinný program"),
  );
  assert(
    "Administrátor opraví dochádzku",
    checked(
      await save(admin.db, event.id, [change(player.profile.id, "present", 1)]),
    )[0].version === 2,
  );
  assert(
    "Zrušené označenie zostáva neoznačené s verziou",
    checked(await save(coach.db, event.id, [change(children[1], null, 1)]))[0]
      .status === null,
  );
  const fresh = await login("COACH");
  assert(
    "Nová Auth relácia načíta uloženú opravu",
    (await roster(fresh.db, event.id)).items.find(
      (p) => p.profile_id === children[0],
    ).attendance === "late",
  );
  step = "Skutočné paralelné požiadavky a atomické odmietnutie konfliktu";
  const concurrent = await Promise.all([
    save(coach.db, event.id, [change(children[0], "present", 2)]),
    save(fresh.db, event.id, [change(children[0], "absent", 2)]),
  ]);
  assert(
    "Súbeh potvrdí presne jeden zápis",
    concurrent.filter((r) => !r.error).length === 1,
  );
  if (concurrent.some((r) => ["PT409", "40001"].includes(r.error?.code)))
    assert("Súbeh vráti explicitný konflikt verzie", true);
  else report.blocked("Doručenie konfliktu cez PostgREST: odpoveď vypršala");
  const afterRace = (await roster(coach.db, event.id)).items.find(
    (p) => p.profile_id === children[0],
  );
  const atomic = await save(coach.db, event.id, [
    change(children[1], "present", 2),
    change(children[0], "late", 2),
  ]);
  assert(
    "Konflikt neuloží ani nekonfliktný riadok dávky",
    !!atomic.error &&
      (await roster(coach.db, event.id)).items.find(
        (p) => p.profile_id === children[1],
      ).attendance === null,
  );
  if (!["PT409", "40001"].includes(atomic.error?.code))
    report.blocked(
      "Doručenie odmietnutia dávky cez PostgREST: odpoveď vypršala",
    );
  step = "Historická oprava po deaktivácii fiktívneho hráča";
  checked(
    await admin.db
      .from("profiles")
      .update({ active: false })
      .eq("id", children[0]),
  );
  assert(
    step,
    checked(
      await save(coach.db, event.id, [
        change(
          children[0],
          "excused",
          afterRace.attendance_version,
          "Fiktívna oprava",
        ),
      ]),
    )[0].status === "excused",
  );
  checked(
    await admin.db
      .from("profiles")
      .update({ active: true })
      .eq("id", children[0]),
  );
  step = "Audit autora a času dochádzky";
  const audit = checked(
    await admin.db
      .from("audit_logs")
      .select("actor_id,new_data,created_at")
      .eq("table_name", "attendance")
      .contains("new_data", { event_id: event.id }),
  );
  assert(
    step,
    audit.length >= 7 &&
      audit.every(
        (a) =>
          [coach.authId, admin.authId].includes(a.actor_id) && a.created_at,
      ),
  );
  step = "Interné tréningové a hráčske poznámky";
  for (const context of [{ event_id: event.id }, { player_id: children[0] }]) {
    const note = await insert(coach.db, "internal_notes", {
      ...context,
      body: "Fiktívne: precvičiť príjem podania.",
    });
    const edited = checked(
      await coach.db
        .from("internal_notes")
        .update({ body: "Fiktívne: precvičiť aj komunikáciu." })
        .eq("id", note.id)
        .eq("version", note.version)
        .select("version")
        .single(),
    );
    assert(
      "Poznámka: oprava zvyšuje verziu",
      edited.version === note.version + 1,
    );
    for (const db of [parent.db, player.db])
      assert(
        "Osobná rola nevidí internú poznámku",
        deniedOrEmpty(
          await db.from("internal_notes").select("id").eq("id", note.id),
        ),
      );
  }
  step = "Zrušený tréning odmieta opravy";
  checked(
    await coach.db
      .from("events")
      .update({ status: "cancelled" })
      .eq("id", event.id),
  );
  assert(
    step,
    (await save(coach.db, event.id, [change(children[1], "present", 2)])).error
      ?.code === "42501",
  );
  checked(
    await coach.db
      .from("events")
      .update({ status: "scheduled" })
      .eq("id", event.id),
  );
} catch {
  report.add(`${step}: scenár nedokončený`, false);
} finally {
  for (const db of clients)
    await db.auth.signOut({ scope: "local" }).catch(() => {});
  await mkdir("test-results", { recursive: true });
  await writeFile(
    "test-results/attendance-created-records.json",
    JSON.stringify(created, null, 2),
  );
}
const result = {
  ...report.result(),
  scope: "live-auth-postgrest-fictional-attendance-and-notes",
};
await writeFile(
  "test-results/live-attendance.json",
  JSON.stringify(result, null, 2),
);
for (const check of result.checks)
  console.log(`${check.status.toUpperCase()}: ${check.name}`);
process.exitCode = result.passed ? 0 : 1;
