// Explicit fictional-data seed for the configured test project only.
// Auth administration creates the demo identity; club writes use authenticated RLS.
// Retain the ignored state file to resume without duplicating or resetting data.
import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { checked, client, config } from "./live-runtime.mjs";

const statePath = "test-results/club-demo-state.json";
const loginPath = "test-results/coach-login.txt";
const zone = "Europe/Bratislava";
const sessions = [];
let stage = "configuration";

async function save(state) {
  await writeFile(`${statePath}.tmp`, JSON.stringify(state, null, 2), {
    mode: 0o600,
  });
  await rename(`${statePath}.tmp`, statePath);
}

function createState() {
  const seedId = randomUUID();
  const today = formatInTimeZone(new Date(), zone, "yyyy-MM-dd");
  const at = (offset, time) => {
    const day = new Date(`${today}T12:00:00Z`);
    day.setUTCDate(day.getUTCDate() + offset);
    return fromZonedTime(
      `${day.toISOString().slice(0, 10)}T${time}:00`,
      zone,
    ).toISOString();
  };
  const first = [
    "Ema",
    "Nina",
    "Sofia",
    "Laura",
    "Viktória",
    "Natália",
    "Tamara",
    "Zuzana",
    "Lucia",
    "Hana",
    "Petra",
    "Michaela",
  ];
  const last = [
    "Kováčová",
    "Novotná",
    "Horváthová",
    "Bieliková",
    "Urbanová",
    "Malíková",
    "Králová",
    "Poláková",
    "Tóthová",
    "Šimková",
    "Kučerová",
    "Vargová",
  ];
  const teams = [
    { name: "Juniorky U18 · ukážka", category: "U18", size: 12, age: 17 },
    { name: "Kadetky U16 · ukážka", category: "U16", size: 10, age: 15 },
    { name: "Prípravka U12 · ukážka", category: "U12", size: 8, age: 11 },
  ].map((team, index) => ({
    id: randomUUID(),
    name: team.name,
    category: team.category,
    players: Array.from({ length: team.size }, (_, i) => ({
      id: randomUUID(),
      name: `${first[(i + index * 3) % first.length]} ${last[(i * 5 + index) % last.length]}`,
      birth: `${Number(today.slice(0, 4)) - team.age}-${String(randomInt(1, 10)).padStart(2, "0")}-${String(randomInt(1, 28)).padStart(2, "0")}`,
    })),
  }));
  const themes = [
    "Príjem a prvý útok",
    "Podanie pod tlakom",
    "Obrana v poli",
    "Súhra a blok",
    "Herné situácie",
    "Rýchlosť a koordinácia",
    "Príprava na zápas",
  ];
  const events = teams.flatMap((team, ti) =>
    [-10, -7, -3, 1, 3, 8, 10, 15].map((offset, i) => ({
      id: randomUUID(),
      team_id: team.id,
      title: i === 7 ? "Prípravný zápas" : `Tréning · ${themes[i]}`,
      kind: i === 7 ? "match" : "training",
      starts_at: at(offset, ti === 0 ? "17:00" : ti === 1 ? "15:30" : "14:00"),
      ends_at: at(offset, ti === 0 ? "18:30" : ti === 1 ? "17:00" : "15:30"),
      venue:
        ti === 2 ? "Malá telocvičňa · ukážka" : "Športová hala Javor · ukážka",
      description:
        i === 7
          ? "Fiktívny prípravný zápas. Stretnutie v hale 30 minút pred začiatkom."
          : "Ukážkový tréning: rozohriatie, technika a hra. Prineste si vodu a halovú obuv.",
      status: offset < 0 ? "completed" : "scheduled",
      opponent: i === 7 ? "VK Lipa · ukážka" : null,
      home: i === 7 ? true : null,
    })),
  );
  const attendance = events
    .filter((event) => event.status === "completed")
    .flatMap((event) => {
      const team = teams.find((item) => item.id === event.team_id);
      return team.players.map((player) => ({
        event_id: event.id,
        player_id: player.id,
        status: [
          "present",
          "present",
          "present",
          "present",
          "excused",
          "absent",
        ][randomInt(6)],
      }));
    });
  return {
    version: 1,
    seedId,
    project: config.url,
    createdAt: new Date().toISOString(),
    coach: {
      profileId: randomUUID(),
      email: `trener-${seedId.slice(0, 8)}@example.com`,
      password: randomBytes(24).toString("base64url"),
    },
    teams,
    events,
    attendance,
    notes: {},
    announcements: teams.flatMap((team) => [
      {
        id: randomUUID(),
        team_id: team.id,
        title: "Program na najbližšie týždne",
        body: "Ukážkové údaje: tréningy a prípravný zápas nájdete v kalendári. Prosíme potvrdiť účasť vopred, aby sme vedeli pripraviť zostavy.",
        important: true,
      },
      {
        id: randomUUID(),
        team_id: team.id,
        title: "Čo si priniesť na tréning",
        body: "Ukážkový oznam: halová obuv, chrániče kolien, voda a klubové tričko. Príďte desať minút pred začiatkom.",
        important: false,
      },
    ]),
  };
}

async function login(email, password) {
  const db = client();
  checked(await db.auth.signInWithPassword({ email, password }), "login");
  sessions.push(db);
  return db;
}

async function insertOnce(db, table, rows, onConflict = "id") {
  if (!rows.length) return;
  // DO NOTHING on an existing seed key: preserve later edits in the demo UI.
  checked(
    await db.from(table).upsert(rows, { onConflict, ignoreDuplicates: true }),
    table,
  );
}

try {
  if (existsSync(".env.live.local")) process.loadEnvFile(".env.live.local");
  if (
    !process.argv.includes("--write-test-data") ||
    process.env.LIVE_TEST_PROJECT_URL !== config.url
  )
    throw new Error("matching_test_target_required");
  for (const name of [
    "LIVE_ADMIN_EMAIL",
    "LIVE_ADMIN_PASSWORD",
    "LIVE_GUARDIAN_EMAIL",
    "LIVE_GUARDIAN_PASSWORD",
    "SUPABASE_SECRET_KEY",
  ])
    if (!process.env[name]) throw new Error("private_configuration_missing");
  for (const path of [statePath, `${statePath}.tmp`, loginPath])
    execFileSync("git", ["check-ignore", "-q", path], { stdio: "ignore" });
  await mkdir("test-results", { recursive: true });
  const state = existsSync(statePath)
    ? JSON.parse(await readFile(statePath, "utf8"))
    : createState();
  if (state.version !== 1 || state.project !== config.url)
    throw new Error("state_target_mismatch");
  await save(state);

  stage = "admin_login";
  const admin = await login(
    process.env.LIVE_ADMIN_EMAIL,
    process.env.LIVE_ADMIN_PASSWORD,
  );
  const adminProfile = checked(
    await admin.rpc("viewer_context"),
    "admin_profile",
  );
  const adminRoles = checked(
    await admin
      .from("user_roles")
      .select("role")
      .eq("profile_id", adminProfile.id),
    "admin_roles",
  );
  if (!adminProfile || !adminRoles.some((row) => row.role === "admin"))
    throw new Error("active_admin_required");
  // Fail before creating an identity if the pending notes migration is absent.
  checked(
    await admin.from("internal_notes").select("id").limit(0),
    "notes_schema",
  );

  stage = "coach_identity";
  if (!state.coach.userId) {
    const authAdmin = client(process.env.SUPABASE_SECRET_KEY);
    const created = await authAdmin.auth.admin.createUser({
      email: state.coach.email,
      password: state.coach.password,
      email_confirm: true,
    });
    if (created.error) {
      // Recover only this generated identity after an interrupted checkpoint.
      if (!["email_exists", "user_already_exists"].includes(created.error.code))
        checked(created, "create_coach");
      const recovered = await login(state.coach.email, state.coach.password);
      state.coach.userId = checked(
        await recovered.auth.getUser(),
        "recover_coach",
      ).user.id;
    } else state.coach.userId = created.data.user.id;
    await save(state);
  }
  await insertOnce(admin, "profiles", [
    {
      id: state.coach.profileId,
      user_id: state.coach.userId,
      full_name: "Martin Volej · ukážkový tréner",
    },
  ]);
  await insertOnce(
    admin,
    "member_details",
    [
      {
        profile_id: state.coach.profileId,
        email: state.coach.email,
        phone: "",
      },
    ],
    "profile_id",
  );
  await insertOnce(
    admin,
    "user_roles",
    [{ profile_id: state.coach.profileId, role: "coach" }],
    "profile_id,role",
  );
  const coach = await login(state.coach.email, state.coach.password);

  stage = "teams_and_players";
  await insertOnce(
    admin,
    "teams",
    state.teams.map(({ id, name, category }) => ({
      id,
      name,
      category,
      description:
        "Fiktívny tím na predvedenie aplikácie. Neobsahuje údaje skutočných členov.",
    })),
  );
  const players = state.teams.flatMap((team) => team.players);
  await insertOnce(
    admin,
    "profiles",
    players.map((player) => ({ id: player.id, full_name: player.name })),
  );
  await insertOnce(
    admin,
    "member_details",
    players.map((player, i) => ({
      profile_id: player.id,
      birth_date: player.birth,
      email: `hracka-${i + 1}-${state.seedId.slice(0, 8)}@example.com`,
      phone: "",
    })),
    "profile_id",
  );
  await insertOnce(
    admin,
    "user_roles",
    players.map((player) => ({ profile_id: player.id, role: "player" })),
    "profile_id,role",
  );
  await insertOnce(
    admin,
    "team_memberships",
    [
      ...state.teams.slice(0, 2).map((team) => ({
        team_id: team.id,
        profile_id: state.coach.profileId,
        kind: "coach",
      })),
      ...state.teams.flatMap((team) =>
        team.players.map((player) => ({
          team_id: team.id,
          profile_id: player.id,
          kind: "player",
        })),
      ),
    ],
    "team_id,profile_id,kind",
  );
  console.log("OK: ukážkový tréner, 3 tímy, 30 hráčok");

  stage = "program_and_attendance";
  const assigned = new Set(state.teams.slice(0, 2).map((team) => team.id));
  for (const [db, own] of [
    [coach, true],
    [admin, false],
  ]) {
    const events = state.events.filter(
      (event) => assigned.has(event.team_id) === own,
    );
    await insertOnce(db, "events", events);
    const ids = new Set(events.map((event) => event.id));
    await insertOnce(
      db,
      "attendance",
      state.attendance.filter((row) => ids.has(row.event_id)),
      "event_id,player_id",
    );
    await insertOnce(
      db,
      "announcements",
      state.announcements
        .filter((row) => assigned.has(row.team_id) === own)
        .map((row) => ({
          ...row,
          author_id: own ? state.coach.profileId : adminProfile.id,
        })),
    );
  }

  stage = "guardian_availability";
  const guardian = await login(
    process.env.LIVE_GUARDIAN_EMAIL,
    process.env.LIVE_GUARDIAN_PASSWORD,
  );
  const guardianProfile = checked(
    await guardian.rpc("viewer_context"),
    "guardian_profile",
  );
  const children = state.teams
    .slice(0, 2)
    .flatMap((team) => team.players.slice(0, 3));
  await insertOnce(
    admin,
    "guardian_players",
    children.map((player) => ({
      guardian_id: guardianProfile.id,
      player_id: player.id,
    })),
    "guardian_id,player_id",
  );
  const responses = state.events
    .filter(
      (event) => assigned.has(event.team_id) && event.status === "scheduled",
    )
    .flatMap((event) => {
      const team = state.teams.find((row) => row.id === event.team_id);
      return team.players.slice(0, 3).map((player, i) => ({
        event_id: event.id,
        player_id: player.id,
        response: ["yes", "no", "maybe"][i],
        reason:
          i === 1
            ? "Ukážka: rodinný program."
            : i === 2
              ? "Ukážka: účasť ešte potvrdíme."
              : "",
      }));
    });
  await insertOnce(guardian, "availability", responses, "event_id,player_id");

  stage = "internal_notes";
  // Notes have column-level grants: IDs are assigned by the database.
  const noteContexts = state.teams.flatMap((team) => [
    ...team.players.slice(0, 3).map((player) => ({
      player_id: player.id,
      body: "Ukážková interná poznámka: istý príjem, pri podaní sa sústrediť na pravidelný nadhod. Na najbližšom tréningu zaradiť krátky individuálny blok.",
    })),
    ...state.events
      .filter(
        (event) =>
          event.team_id === team.id &&
          event.kind === "training" &&
          event.status === "scheduled",
      )
      .slice(0, 2)
      .map((event) => ({
        event_id: event.id,
        body: "Ukážkový plán trénera: 15 min rozohriatie, 25 min technika príjmu, 30 min herné situácie, 20 min hra a zhodnotenie. Poznámka je určená iba realizačnému tímu.",
      })),
  ]);
  for (const row of noteContexts) {
    const key = row.player_id || row.event_id;
    if (state.notes[key]) continue;
    const team = state.teams.find(
      (item) =>
        item.players.some((player) => player.id === row.player_id) ||
        state.events.some(
          (event) => event.id === row.event_id && event.team_id === item.id,
        ),
    );
    const db = assigned.has(team.id) ? coach : admin;
    const column = row.player_id ? "player_id" : "event_id";
    const existing = checked(
      await db
        .from("internal_notes")
        .select("id")
        .eq(column, key)
        .eq("body", row.body)
        .limit(1),
      "note_checkpoint",
    );
    state.notes[key] =
      existing[0]?.id ||
      checked(
        await db.from("internal_notes").insert(row).select("id").single(),
        "create_note",
      ).id;
    await save(state);
  }

  stage = "live_scope_verification";
  const teamIds = state.teams.map((team) => team.id);
  const visibleTeams = checked(
    await coach.from("teams").select("id").in("id", teamIds),
    "coach_teams",
  );
  const visiblePlayers = checked(
    await coach
      .from("profiles")
      .select("id")
      .in(
        "id",
        players.map((player) => player.id),
      ),
    "coach_players",
  );
  if (visibleTeams.length !== 2 || visiblePlayers.length !== 22)
    throw new Error("coach_scope_failed");
  const hidden = checked(
    await coach
      .from("internal_notes")
      .select("id")
      .eq("player_id", state.teams[2].players[0].id),
    "unassigned_notes",
  );
  const guardianNotes = checked(
    await guardian
      .from("internal_notes")
      .select("id")
      .eq("player_id", children[0].id),
    "guardian_notes",
  );
  const financial = checked(
    await coach.from("charges").select("id").limit(1),
    "coach_finances",
  );
  if (hidden.length || guardianNotes.length || financial.length)
    throw new Error("role_isolation_failed");
  const notePage = checked(
    await coach.rpc("internal_notes_page", {
      p_player: children[0].id,
      p_event: null,
      p_before_at: null,
      p_before_id: null,
    }),
    "coach_notes_page",
  );
  if (!notePage.can_write || !notePage.items.length)
    throw new Error("notes_page_failed");
  state.completedAt = new Date().toISOString();
  state.counts = {
    teams: 3,
    players: players.length,
    events: state.events.length,
    attendance: state.attendance.length,
    availability: responses.length,
    announcements: state.announcements.length,
    notes: Object.keys(state.notes).length,
  };
  await save(state);
  await writeFile(
    loginPath,
    [
      "VOLEJ KLUB — testovací účet trénera",
      "",
      "Prihlásenie: http://localhost:3000/prihlasenie",
      `E-mail: ${state.coach.email}`,
      `Heslo: ${state.coach.password}`,
      "",
      "Účet má rolu trénera. Vidí 2 pridelené tímy a ich 22 hráčok; financie nevidí.",
      "Údaje sú fiktívne a uložené v testovacom Supabase. Zmeny sa ukladajú.",
      "E-mail je ukážkový a neprijíma poštu. Tento súbor je vylúčený z Gitu.",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      status: "passed",
      counts: state.counts,
      credentialsFile: loginPath,
    }),
  );
} catch (error) {
  // Only fixed stage + safe SQL/Auth code; never SDK bodies, URLs or credentials.
  const code =
    error instanceof Error
      ? error.message.match(/: ([A-Z0-9_]+)$/i)?.[1]
      : null;
  console.error(`FAILED: ${stage}${code ? ` (${code})` : ""}`);
  process.exitCode = 1;
} finally {
  await Promise.allSettled(
    sessions.map((db) => db.auth.signOut({ scope: "local" })),
  );
}
