// Isolated fictional roster acceptance. Never reseeds, deletes or sends email.
import { readFile, writeFile } from "node:fs/promises";
import { client, config, checked } from "./live-runtime.mjs";
import { createReport } from "./live-support.mjs";
process.loadEnvFile(".env.live.local");
const report = createReport();
const sessions = [];
const statePath = "test-results/live-attendance-roster-state.json";
const state = { project: config.url, players: [] };
let reserved = false;
let stage = "testovací cieľ";
const checkpoint = () =>
  writeFile(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });
const assert = (name, value) => {
  report.add(name, Boolean(value));
  if (!value) throw new Error("Acceptance failed");
};
async function login(role) {
  const db = client();
  checked(
    await db.auth.signInWithPassword({
      email: process.env[`LIVE_${role}_EMAIL`],
      password: process.env[`LIVE_${role}_PASSWORD`],
    }),
    "Prihlásenie",
  );
  sessions.push(db);
  const profile = checked(await db.rpc("viewer_context"), "Kontext");
  if (!profile?.roles.includes(role.toLowerCase()))
    throw new Error("Role mismatch");
  return { db, profile };
}
const change = (player_id, status, expected_version = 0, reason = "") => ({
  player_id,
  status,
  expected_version,
  reason,
});
const save = (db, event, changes) =>
  db.rpc("save_attendance", { p_event: event, p_changes: changes });
const insert = async (db, table, data) =>
  checked(
    await db.from(table).insert(data).select("id").single(),
    "Testovací zápis",
  ).id;
async function roster(db, event, cursor) {
  return checked(
    await db.rpc("event_roster_page", {
      p_event: event,
      p_query: "",
      p_name: cursor?.full_name ?? null,
      p_id: cursor?.profile_id ?? null,
    }),
    "Súpis",
  );
}
try {
  const identities = JSON.parse(
    await readFile("test-results/live-identities.json", "utf8"),
  );
  const history = JSON.parse(
    await readFile("test-results/live-migrations.json", "utf8"),
  );
  if (
    !process.argv.includes("--write-test-data") ||
    config.url !== new URL(process.env.LIVE_TEST_PROJECT_URL).origin ||
    identities.project !== config.url ||
    history.status !== "verified" ||
    history.pending.length ||
    history.unknown.length ||
    Date.now() - Date.parse(history.at) > 3600000
  )
    throw new Error("Confirmed test target and migration history required");
  for (const role of ["ADMIN", "COACH", "GUARDIAN", "PLAYER"])
    if (identities.accounts[role]?.email !== process.env[`LIVE_${role}_EMAIL`])
      throw new Error("Fixture identity mismatch");
  // Existence is a stop, including after partial failures or lost responses.
  await writeFile(statePath, JSON.stringify(state), {
    flag: "wx",
    mode: 0o600,
  });
  reserved = true;
  const admin = await login("ADMIN");
  const coach = await login("COACH");
  const guardian = await login("GUARDIAN");
  const player = await login("PLAYER");
  stage = "izolovaný tím a 30 fiktívnych hráčov";
  state.team = await insert(admin.db, "teams", {
    name: "TEST súpis 30 – živá akceptácia",
    category: "U16",
  });
  await checkpoint();
  for (let index = 1; index <= 29; index++) {
    const id = checked(
      await admin.db.rpc("create_member", {
        p_name: `Test súpis hráč ${String(index).padStart(2, "0")}`,
        p_email: "",
        p_phone: "",
        p_birth: "2013-01-01",
        p_role: "player",
      }),
      "Fiktívny hráč",
    );
    state.players.push(id);
    await checkpoint();
  }
  state.players.push(player.profile.id);
  checked(
    await admin.db
      .from("team_memberships")
      .insert([
        { team_id: state.team, profile_id: coach.profile.id, kind: "coach" },
        ...state.players.map((profile_id) => ({
          team_id: state.team,
          profile_id,
          kind: "player",
        })),
      ]),
    "Členstvo",
  );
  checked(
    await admin.db
      .from("guardian_players")
      .insert({
        guardian_id: guardian.profile.id,
        player_id: state.players[0],
      }),
    "Fiktívne rodinné prepojenie",
  );
  const event = {
    team_id: state.team,
    kind: "training",
    venue: "Fiktívna testovacia hala",
    starts_at: "2026-10-28T15:00:00Z",
    ends_at: "2026-10-28T16:30:00Z",
  };
  state.event = await insert(coach.db, "events", {
    ...event,
    title: "TEST súpis 30 – API",
  });
  state.browserEvent = await insert(coach.db, "events", {
    ...event,
    title: "TEST súpis 30 – prehliadač",
  });
  await checkpoint();
  checked(
    await guardian.db
      .from("availability")
      .insert({
        event_id: state.browserEvent,
        player_id: state.players[0],
        response: "no",
        reason: "Fiktívny rodinný program",
      }),
    "Plánovaná odpoveď",
  );
  stage = "úplný stránkovaný súpis";
  const first = await roster(coach.db, state.event);
  const second = await roster(coach.db, state.event, first.items.at(-1));
  const all = [...first.items, ...second.items];
  assert(
    "Súpis 30 hráčov je úplný cez stránky 25 + 5",
    first.total === 30 &&
      first.items.length === 25 &&
      first.has_more &&
      second.items.length === 5 &&
      !second.has_more &&
      new Set(all.map((p) => p.profile_id)).size === 30,
  );
  assert(
    "Nový súpis je celý neoznačený",
    all.every((p) => p.attendance === null && p.attendance_version === 0),
  );
  const batch = all.map((p, i) =>
    change(
      p.profile_id,
      i === 28 ? "late" : i === 29 ? "excused" : "present",
      0,
      i === 29 ? "Fiktívny dôvod" : "",
    ),
  );
  const saved = checked(
    await save(coach.db, state.event, batch),
    "Hromadné uloženie",
  );
  assert(
    "Dávka uloží všetkých 30 vrátane výnimiek za prvou stránkou",
    saved.length === 30 &&
      saved.filter((r) => r.status === "present").length === 28 &&
      saved.some((r) => r.status === "late") &&
      saved.some(
        (r) => r.status === "excused" && r.reason === "Fiktívny dôvod",
      ),
  );
  const persisted = checked(
    await coach.db
      .from("attendance")
      .select("player_id,status,version")
      .eq("event_id", state.event),
    "Persistencia",
  );
  assert(
    "Read-back potvrdzuje 30 jedinečných záznamov verzie 1",
    persisted.length === 30 &&
      new Set(persisted.map((r) => r.player_id)).size === 30 &&
      persisted.every((r) => r.version === 1),
  );
  const stale = await save(coach.db, state.event, [
    change(all[0].profile_id, "absent", 0),
    change(all[1].profile_id, "absent", 1),
  ]);
  assert(
    "Jediný konflikt odmietne celú zmiešanú dávku",
    stale.error?.code === "PT409",
  );
  const untouched = checked(
    await coach.db
      .from("attendance")
      .select("status,version")
      .eq("event_id", state.event)
      .eq("player_id", all[1].profile_id)
      .single(),
    "Atomicita",
  );
  assert(
    "Nekonfliktná časť odmietnutej dávky zostala nezmenená",
    untouched.status === "present" && untouched.version === 1,
  );
  const cleared = checked(
    await save(coach.db, state.event, [change(all[29].profile_id, null, 1)]),
    "Vymazanie označenia",
  );
  assert(
    "Oprava na neoznačené zachová riadok a zvýši verziu",
    cleared[0]?.status === null && cleared[0].version === 2,
  );
  const personal = await roster(player.db, state.browserEvent);
  const family = await roster(guardian.db, state.browserEvent);
  assert(
    "Hráč z veľkého súpisu dostane iba seba bez správy",
    !personal.can_manage &&
      personal.total === 1 &&
      personal.items[0]?.profile_id === player.profile.id,
  );
  assert(
    "Rodič z veľkého súpisu dostane iba prepojené dieťa bez správy",
    !family.can_manage &&
      family.total === 1 &&
      family.items[0]?.profile_id === state.players[0],
  );
  state.completedAt = new Date().toISOString();
  await checkpoint();
} catch {
  report.add(`Dokončenie: ${stage}`, false);
} finally {
  for (const db of sessions) {
    try {
      checked(await db.auth.signOut({ scope: "local" }), "Odhlásenie");
    } catch {
      report.add("Odhlásenie testovacej relácie", false);
    }
  }
  const result = {
    ...report.result(),
    scope: "live-test-attendance-large-roster",
  };
  if (reserved)
    await writeFile(
      "test-results/live-attendance-roster.json",
      JSON.stringify(result, null, 2),
    );
  for (const check of result.checks)
    console.log(`${check.status.toUpperCase()}: ${check.name}`);
  process.exitCode = result.passed ? 0 : 1;
}
