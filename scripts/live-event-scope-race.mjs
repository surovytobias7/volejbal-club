// Explicit fictional-data acceptance; no DDL, deletes, Auth creation or mail.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { client, config, checked } from "./live-runtime.mjs";
import { createReport } from "./live-support.mjs";

process.loadEnvFile(".env.live.local");
const report = createReport();
const sessions = [];
const statePath = "test-results/live-event-scope-race-state.json";
const state = { project: config.url, events: [] };
let reserved = false;
let stage = "overenie testovacieho cieľa";
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
  if (
    !profile?.roles.includes(role.toLowerCase()) ||
    profile.roles.length !== 1
  )
    throw new Error("Single-role fixture required");
  return { db, profile };
}
const insert = async (db, table, data) =>
  checked(
    await db.from(table).insert(data).select("id").single(),
    "Testovací zápis",
  ).id;

try {
  const history = JSON.parse(
    await readFile("test-results/live-migrations.json", "utf8"),
  );
  if (
    !process.argv.includes("--write-test-data") ||
    config.url !== new URL(process.env.LIVE_TEST_PROJECT_URL).origin ||
    history.status !== "verified" ||
    history.pending.length ||
    history.unknown.length ||
    !Number.isFinite(Date.parse(history.at)) ||
    Date.now() - Date.parse(history.at) > 3600000
  )
    throw new Error("Confirmed target and recent migration history required");
  for (const role of ["ADMIN", "COACH", "PLAYER"])
    if (
      !process.env[`LIVE_${role}_EMAIL`] ||
      !process.env[`LIVE_${role}_PASSWORD`]
    )
      throw new Error("Fixture identity mismatch");
  await mkdir("test-results", { recursive: true });
  await writeFile(statePath, JSON.stringify(state), {
    flag: "wx",
    mode: 0o600,
  });
  reserved = true;
  const admin = await login("ADMIN");
  const coach = await login("COACH");
  const player = await login("PLAYER");
  stage = "izolované tímy";
  state.source = await insert(admin.db, "teams", {
    name: "TEST súbeh – pôvodný tím",
    category: "U16",
  });
  await checkpoint();
  state.target = await insert(admin.db, "teams", {
    name: "TEST súbeh – cieľový tím",
    category: "U16",
  });
  await checkpoint();
  checked(
    await admin.db.from("team_memberships").insert([
      { team_id: state.source, profile_id: coach.profile.id, kind: "coach" },
      { team_id: state.source, profile_id: player.profile.id, kind: "player" },
    ]),
    "Členstvo",
  );
  const start = new Date(Date.now() + 86400000).toISOString();
  const end = new Date(Date.now() + 90000000).toISOString();
  for (const table of ["attendance", "availability", "internal_notes"]) {
    for (const order of ["write-first", "move-first", "parallel"]) {
      stage = `${table}: ${order}`;
      const event = await insert(admin.db, "events", {
        team_id: state.source,
        title: `TEST súbeh ${table} ${order}`,
        kind: "training",
        starts_at: start,
        ends_at: end,
        venue: "Testovacia hala",
      });
      state.events.push({ event, table, order });
      await checkpoint();
      const move = () =>
        admin.db
          .from("events")
          .update({ team_id: state.target })
          .eq("id", event)
          .select("id");
      const write = () =>
        table === "attendance"
          ? coach.db.rpc("save_attendance", {
              p_event: event,
              p_changes: [
                {
                  player_id: player.profile.id,
                  status: "present",
                  reason: "",
                  expected_version: 0,
                },
              ],
            })
          : table === "availability"
            ? player.db
                .from(table)
                .insert({
                  event_id: event,
                  player_id: player.profile.id,
                  response: "yes",
                })
                .select("event_id")
            : coach.db
                .from(table)
                .insert({
                  event_id: event,
                  body: "Fiktívna interná poznámka pre skúšku súbehu.",
                })
                .select("id");
      let moved, written;
      if (order === "write-first") {
        written = await write();
        moved = await move();
      } else if (order === "move-first") {
        moved = await move();
        written = await write();
      } else {
        [moved, written] = await Promise.all([move(), write()]);
      }
      const team = checked(
        await admin.db
          .from("events")
          .select("team_id")
          .eq("id", event)
          .single(),
        "Overenie tímu",
      ).team_id;
      const records = checked(
        await admin.db.from(table).select("event_id").eq("event_id", event),
        "Overenie záznamov",
      );
      const writeWon =
        !written.error &&
        written.data?.length === 1 &&
        moved.error?.code === "23514" &&
        team === state.source &&
        records.length === 1;
      const moveWon =
        !moved.error &&
        moved.data?.length === 1 &&
        written.error?.code === "42501" &&
        team === state.target &&
        records.length === 0;
      assert(
        `${stage}: jeden úspech bez prenosu súkromného záznamu`,
        order === "write-first"
          ? writeWon
          : order === "move-first"
            ? moveWon
            : writeWon || moveWon,
      );
      state.events.at(-1).winner = writeWon ? "write" : "move";
      await checkpoint();
      const coachEvents = checked(
        await coach.db.from("events").select("id").eq("id", event),
        "Rozsah trénera",
      );
      assert(
        `${stage}: tréner číta iba udalosť pôvodného tímu`,
        coachEvents.length === (writeWon ? 1 : 0),
      );
    }
  }
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
  const result = { ...report.result(), scope: "live-event-scope-race" };
  // A refused rerun must not overwrite the evidence from a completed run.
  if (reserved)
    await writeFile(
      "test-results/live-event-scope-race.json",
      JSON.stringify(result, null, 2),
    );
  for (const check of result.checks)
    console.log(`${check.status.toUpperCase()}: ${check.name}`);
  process.exitCode = result.passed ? 0 : 1;
}
