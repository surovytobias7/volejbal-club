// Explicit fictional-data acceptance. Never prints identities, tokens or notes.
// Retain the private state file; no automatic deletion of accounts or records.
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { client, config, checked } from "./live-runtime.mjs";
import { createReport, deniedOrEmpty } from "./live-support.mjs";

if (existsSync(".env.live.local")) process.loadEnvFile(".env.live.local");
const statePath = "test-results/live-attendance-notes-state.json";
const report = createReport();
const sessions = [];
const restore = [];
let state = { project: config.url, run: randomUUID(), records: {} };
const resumeNotes = process.argv.includes("--resume-notes");
let stage = "overenie testovacieho cieľa";
const save = () =>
  writeFile(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });
const assert = (name, condition) => {
  report.add(name, Boolean(condition));
  if (!condition) throw new Error("Acceptance assertion failed");
};
const login = async (identity) => {
  const db = client();
  checked(
    await db.auth.signInWithPassword({
      email: identity.email,
      password: identity.password,
    }),
    "Prihlásenie testu",
  );
  sessions.push(db);
  return db;
};
const identity = async (db) =>
  checked(await db.rpc("viewer_context"), "Kontext testu");
const insert = async (db, table, data) =>
  checked(
    await db.from(table).insert(data).select("id").single(),
    "Vytvorenie testu",
  ).id;
const changes = (player, status, version = 0, reason = "") => ({
  player_id: player,
  status,
  reason,
  expected_version: version,
});
const attendance = async (db, event) =>
  checked(
    await db
      .from("attendance")
      .select("player_id,status,reason,version")
      .eq("event_id", event)
      .order("player_id"),
    "Čítanie dochádzky",
  );
const notes = async (db, player, event = null) =>
  checked(
    await db.rpc("internal_notes_page", {
      p_player: player,
      p_event: event,
      p_before_at: null,
      p_before_id: null,
    }),
    "Čítanie poznámok",
  );

try {
  if (
    !process.argv.includes("--write-test-data") ||
    new URL(process.env.LIVE_TEST_PROJECT_URL).origin !== config.url
  )
    throw new Error("Explicit test target required");
  if (existsSync(statePath) && !resumeNotes)
    throw new Error(
      "Existing acceptance state must be reviewed before another run",
    );
  if (resumeNotes) {
    state = JSON.parse(await readFile(statePath, "utf8"));
    if (
      state.project !== config.url ||
      state.completedAt ||
      state.records.playerNote ||
      !state.coach?.profileId ||
      !state.records.event ||
      !state.records.child ||
      !state.records.sibling
    )
      throw new Error("Only the reviewed pre-notes checkpoint can be resumed");
  }
  const accounts = Object.fromEntries(
    ["ADMIN", "COACH", "GUARDIAN", "PLAYER"].map((role) => [
      role,
      {
        email: process.env[`LIVE_${role}_EMAIL`],
        password: process.env[`LIVE_${role}_PASSWORD`],
      },
    ]),
  );
  if (
    Object.values(accounts).some(
      (account) => !account.email || !account.password,
    )
  )
    throw new Error("Missing private test accounts");
  const demo = JSON.parse(
    await readFile("test-results/club-demo-state.json", "utf8"),
  );
  if (demo.project !== config.url) throw new Error("Fixture target mismatch");
  const admin = await login(accounts.ADMIN);
  const second = await login(accounts.COACH);
  const guardian = await login(accounts.GUARDIAN);
  const player = await login(accounts.PLAYER);
  const unassigned = await login(demo.coach);
  const contexts = await Promise.all(
    [admin, second, guardian, player, unassigned].map(identity),
  );
  assert(
    "Pred zápisom: aktuálne roly piatich fiktívnych účtov",
    contexts.every(Boolean) &&
      contexts[0].roles.includes("admin") &&
      contexts[1].roles.includes("coach") &&
      contexts[2].roles.includes("guardian") &&
      contexts[3].roles.includes("player") &&
      contexts[4].roles.includes("coach"),
  );
  const [, secondProfile, guardianProfile, playerProfile] = contexts;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key && !resumeNotes) throw new Error("Missing Auth administration key");
  const r = state.records;
  const start = new Date(Date.now() + 86400000).toISOString();
  const end = new Date(Date.now() + 90000000).toISOString();
  if (!resumeNotes) {
    stage = "vytvorenie izolovaných fiktívnych záznamov";
    await mkdir("test-results", { recursive: true });
    state.coach = {
      email: `acceptance-${state.run}@example.invalid`,
      password: randomBytes(24).toString("base64url"),
    };
    await save();
    const authAdmin = client(key);
    const authUser = checked(
      await authAdmin.auth.admin.createUser({
        ...state.coach,
        email_confirm: true,
      }),
      "Testovací Auth účet",
    ).user;
    if (!authUser) throw new Error("Missing test identity");
    state.coach.userId = authUser.id;
    await save();
    const member = async (name, role = "player", email = null) =>
      checked(
        await admin.rpc("create_member", {
          p_name: name,
          p_role: role,
          p_email: email,
          p_phone: null,
          p_birth: role === "player" ? "2013-01-01" : null,
        }),
        "Testovací profil",
      );
    state.coach.profileId = await member(
      "Test tréner – živá akceptácia",
      "coach",
      state.coach.email,
    );
    await save();
    checked(
      await admin.rpc("link_member_account", {
        p_id: state.coach.profileId,
        p_user: authUser.id,
      }),
      "Prepojenie testu",
    );
    r.child = await member("Test dieťa – dochádzka A");
    await save();
    r.sibling = await member("Test dieťa – dochádzka B");
    await save();
    r.team = await insert(admin, "teams", {
      name: "Test tím – dochádzka a poznámky",
      category: "U14",
    });
    await save();
    r.player = playerProfile.id;
    r.guardian = guardianProfile.id;
    r.secondCoach = secondProfile.id;
    checked(
      await admin.from("team_memberships").insert([
        ...[state.coach.profileId, secondProfile.id].map((profile_id) => ({
          team_id: r.team,
          profile_id,
          kind: "coach",
        })),
        ...[r.child, r.sibling, r.player].map((profile_id) => ({
          team_id: r.team,
          profile_id,
          kind: "player",
        })),
      ]),
      "Testovacie členstvá",
    );
    checked(
      await admin.from("guardian_players").insert(
        [r.child, r.sibling].map((player_id) => ({
          guardian_id: r.guardian,
          player_id,
        })),
      ),
      "Testovacie rodinné väzby",
    );
    r.event = await insert(admin, "events", {
      team_id: r.team,
      title: "Test tréning – živá akceptácia",
      kind: "training",
      starts_at: start,
      ends_at: end,
      venue: "Testovacia hala",
    });
    await save();
  }
  const coach = await login(state.coach);
  const originalToken = (await coach.auth.getSession()).data.session
    ?.access_token;

  stage = "atomická dochádzka a súkromie";
  if (!resumeNotes) {
    checked(
      await guardian.from("availability").insert({
        event_id: r.event,
        player_id: r.child,
        response: "no",
        reason: "Fiktívna plánovaná neprítomnosť",
      }),
      "Plánovaná odpoveď",
    );
    const bulk = [r.child, r.sibling, r.player].map((p) =>
      changes(p, "present"),
    );
    const saved = checked(
      await coach.rpc("save_attendance", { p_event: r.event, p_changes: bulk }),
      "Hromadné uloženie",
    );
    assert(
      "Dochádzka: hromadný zápis troch hráčov",
      saved.length === 3 &&
        saved.every((row) => row.version === 1 && row.status === "present"),
    );
    assert(
      "Dostupnosť zostáva oddelená od skutočnej účasti",
      checked(
        await guardian
          .from("availability")
          .select("response")
          .eq("event_id", r.event)
          .eq("player_id", r.child)
          .single(),
        "Oddelená odpoveď",
      ).response === "no",
    );
    const retry = checked(
      await coach.rpc("save_attendance", { p_event: r.event, p_changes: bulk }),
      "Opakovanie zápisu",
    );
    assert(
      "Dochádzka: opakovanie nezvyšuje verzie",
      retry.every((row) => row.version === 1),
    );
    const own = await attendance(player, r.event);
    const family = await attendance(guardian, r.event);
    assert(
      "Hráč číta iba vlastnú súkromnú dochádzku",
      own.length === 1 && own[0].player_id === r.player,
    );
    assert(
      "Rodič číta iba dve prepojené deti",
      family.length === 2 &&
        family.every((row) => [r.child, r.sibling].includes(row.player_id)),
    );
    assert(
      "Nepriradený tréner nečíta dochádzku",
      (await attendance(unassigned, r.event)).length === 0,
    );
    for (const [label, db] of [
      ["Hráč", player],
      ["Rodič", guardian],
      ["Nepriradený tréner", unassigned],
    ]) {
      assert(
        `${label}: zápis skutočnej dochádzky odmietnutý`,
        (
          await db.rpc("save_attendance", {
            p_event: r.event,
            p_changes: [changes(r.child, "absent", 1)],
          })
        ).error?.code === "42501",
      );
    }
    const beforeAtomic = await attendance(coach, r.event);
    const invalidBatch = await coach.rpc("save_attendance", {
      p_event: r.event,
      p_changes: [
        changes(r.child, "late", 1),
        changes(randomUUID(), "present"),
      ],
    });
    assert(
      "Neplatný člen zruší celú dávku bez čiastočného zápisu",
      invalidBatch.error?.code === "42501" &&
        JSON.stringify(await attendance(coach, r.event)) ===
          JSON.stringify(beforeAtomic),
    );
  }
  const raceBefore = (await attendance(coach, r.event)).find(
    (row) => row.player_id === r.child,
  );
  const raceStates = ["present", "absent", "late", "excused"].filter(
    (value) => value !== raceBefore.status,
  );
  const simultaneous = await Promise.all([
    coach.rpc("save_attendance", {
      p_event: r.event,
      p_changes: [changes(r.child, raceStates[0], raceBefore.version)],
    }),
    second.rpc("save_attendance", {
      p_event: r.event,
      p_changes: [changes(r.child, raceStates[1], raceBefore.version)],
    }),
  ]);
  assert(
    "Súbeh dvoch Auth relácií: jedno uloženie, jeden konflikt",
    simultaneous.filter((x) => !x.error).length === 1 &&
      simultaneous.filter((x) => x.error?.code === "PT409" && x.status === 409)
        .length === 1,
  );

  stage = "interné poznámky a súbeh";
  r.playerNote = await insert(coach, "internal_notes", {
    player_id: r.child,
    body: "Fiktívny technický cieľ hráča.",
  });
  r.eventNote = await insert(coach, "internal_notes", {
    event_id: r.event,
    body: "Fiktívna interná príprava tréningu.",
  });
  await save();
  assert(
    "Tréner vytvorí a znovu načíta oba druhy poznámok",
    (await notes(coach, r.child)).items.some((n) => n.id === r.playerNote) &&
      (await notes(coach, null, r.event)).items.some(
        (n) => n.id === r.eventNote,
      ),
  );
  assert(
    "Druhý priradený tréner číta poznámku",
    (await notes(second, r.child)).items.some(
      (n) => n.id === r.playerNote && !n.can_edit,
    ),
  );
  assert(
    "Druhý tréner neupraví cudziu poznámku",
    deniedOrEmpty(
      await second
        .from("internal_notes")
        .update({ body: "Nepovolená zmena" })
        .eq("id", r.playerNote)
        .select("id"),
    ),
  );
  for (const [label, db] of [
    ["Hráč", player],
    ["Rodič", guardian],
    ["Nepriradený tréner", unassigned],
  ]) {
    const denied = await notes(db, r.child);
    assert(
      `${label}: interné poznámky sú skryté cez RPC aj tabuľku`,
      !denied.can_write &&
        denied.items.length === 0 &&
        deniedOrEmpty(
          await db
            .from("internal_notes")
            .select("id")
            .in("id", [r.playerNote, r.eventNote]),
        ),
    );
    assert(
      `${label}: vytvorenie poznámky odmietnuté`,
      (
        await db
          .from("internal_notes")
          .insert({ player_id: r.child, body: "Nepovolená poznámka" })
      ).error?.code === "42501",
    );
  }
  const noteRace = await Promise.all([
    coach
      .from("internal_notes")
      .update({ body: "Fiktívna úprava autora." })
      .eq("id", r.playerNote)
      .eq("version", 1)
      .select("id,version"),
    admin
      .from("internal_notes")
      .update({ body: "Fiktívna úprava správcu." })
      .eq("id", r.playerNote)
      .eq("version", 1)
      .select("id,version"),
  ]);
  assert(
    "Poznámky: súbeh zachová jednu verziu bez prepísania",
    noteRace.every((x) => !x.error) &&
      noteRace.filter((x) => x.data?.length === 1 && x.data[0].version === 2)
        .length === 1 &&
      noteRace.filter((x) => x.data?.length === 0).length === 1,
  );
  checked(
    await admin
      .from("internal_notes")
      .update({ body: "Potvrdená fiktívna oprava správcu." })
      .eq("id", r.playerNote)
      .eq("version", 2)
      .select("id")
      .single(),
    "Administrátorská oprava",
  );
  const audit = checked(
    await admin
      .from("audit_logs")
      .select("old_data,new_data,actor_id")
      .eq("table_name", "internal_notes")
      .eq("record_id", r.playerNote),
    "Audit poznámky",
  );
  assert(
    "Správca upraví poznámku; audit uchová starý aj nový obsah",
    audit.some(
      (row) =>
        row.old_data?.version === 2 &&
        row.new_data?.version === 3 &&
        row.new_data?.body === "Potvrdená fiktívna oprava správcu.",
    ),
  );

  stage = "revokácia a historická dochádzka";
  const membership = {
    team_id: r.team,
    profile_id: state.coach.profileId,
    kind: "coach",
  };
  const restoreCoach = async () =>
    checked(
      await admin.from("team_memberships").upsert(membership),
      "Obnovenie testovacieho trénera",
    );
  restore.push(restoreCoach);
  checked(
    await admin.from("team_memberships").delete().match(membership),
    "Odobratie testovacieho trénerstva",
  );
  assert(
    "Autor po odobratí trénerstva nečíta svoje poznámky",
    (await notes(coach, r.child)).items.length === 0 &&
      (await notes(coach, null, r.event)).items.length === 0,
  );
  assert(
    "Odobratý tréner neupraví dochádzku",
    (
      await coach.rpc("save_attendance", {
        p_event: r.event,
        p_changes: [changes(r.sibling, "absent", 1)],
      })
    ).error?.code === "42501",
  );
  await restoreCoach();
  restore.pop();
  const restoreActive = async () =>
    checked(
      await admin
        .from("profiles")
        .update({ active: true })
        .eq("id", state.coach.profileId)
        .select("id")
        .single(),
      "Obnovenie aktivity testu",
    );
  restore.push(restoreActive);
  checked(
    await admin
      .from("profiles")
      .update({ active: false })
      .eq("id", state.coach.profileId)
      .select("id")
      .single(),
    "Deaktivácia testu",
  );
  assert(
    "Deaktivácia autora okamžite odoberie klubový kontext",
    (await identity(coach)) === null &&
      (await notes(coach, r.child)).items.length === 0,
  );
  assert(
    "Revokácia účinkuje bez obnovy JWT",
    (await coach.auth.getSession()).data.session?.access_token ===
      originalToken,
  );
  await restoreActive();
  restore.pop();
  const playerMembership = {
    team_id: r.team,
    profile_id: r.child,
    kind: "player",
  };
  checked(
    await admin.from("team_memberships").delete().match(playerMembership),
    "Historický odchod hráča",
  );
  const historical = (await attendance(coach, r.event)).find(
    (row) => row.player_id === r.child,
  );
  const correction = checked(
    await coach.rpc("save_attendance", {
      p_event: r.event,
      p_changes: [changes(r.child, "absent", historical.version)],
    }),
    "Historická oprava",
  );
  assert(
    "Historická dochádzka sa dá opraviť po odchode hráča",
    correction[0].status === "absent" &&
      correction[0].version === historical.version + 1,
  );
  checked(
    await admin
      .from("profiles")
      .update({ active: false })
      .eq("id", r.child)
      .select("id")
      .single(),
    "Deaktivácia historického hráča",
  );
  const historicalInactive = checked(
    await coach.rpc("save_attendance", {
      p_event: r.event,
      p_changes: [
        changes(
          r.child,
          "excused",
          correction[0].version,
          "Fiktívna historická oprava",
        ),
      ],
    }),
    "Oprava neaktívneho hráča",
  );
  assert(
    "Historická oprava funguje aj po deaktivácii hráča",
    historicalInactive[0].status === "excused",
  );
  // This child remains an intentionally departed/inactive history fixture.
  const auditRows = checked(
    await admin
      .from("audit_logs")
      .select("id")
      .eq("table_name", "attendance")
      .contains("new_data", { event_id: r.event, player_id: r.child }),
    "Audit dochádzky",
  );
  assert(
    "Historické opravy dochádzky zostávajú v audite",
    auditRows.length >= 4,
  );
  checked(
    await admin
      .from("events")
      .update({ status: "cancelled" })
      .eq("id", r.event)
      .select("id")
      .single(),
    "Zrušenie testovacieho tréningu",
  );
  assert(
    "Zrušený tréning odmietne ďalšiu dochádzku",
    (
      await coach.rpc("save_attendance", {
        p_event: r.event,
        p_changes: [changes(r.sibling, "late", 1)],
      })
    ).error?.code === "42501",
  );
  // Leave a fresh scheduled event for subsequent authenticated browser checks.
  r.browserEvent = await insert(admin, "events", {
    team_id: r.team,
    title: "Test tréning – mobilné overenie",
    kind: "training",
    starts_at: start,
    ends_at: end,
    venue: "Testovacia hala",
  });
  state.completedAt = new Date().toISOString();
  await save();
} catch {
  report.add(`Dokončenie: ${stage}`, false);
} finally {
  for (const undo of restore.reverse()) {
    try {
      await undo();
    } catch {
      report.add("Obnovenie dočasne zmeneného testovacieho prístupu", false);
    }
  }
  for (const db of sessions) {
    try {
      checked(await db.auth.signOut({ scope: "local" }), "Odhlásenie testu");
    } catch {
      report.add("Odhlásenie testovacej relácie", false);
    }
  }
  const result = {
    ...report.result(),
    scope: resumeNotes
      ? "live-test-attendance-notes-resumed"
      : "live-test-attendance-notes-mutations",
  };
  await mkdir("test-results", { recursive: true });
  await writeFile(
    "test-results/live-attendance-notes.json",
    JSON.stringify(result, null, 2),
  );
  for (const check of result.checks)
    console.log(`${check.status.toUpperCase()}: ${check.name}`);
  process.exitCode = result.passed ? 0 : 1;
}
