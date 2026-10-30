// Opt-in, isolated fictional family acceptance. No Auth creation, mail or DDL.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { client, config, checked } from "./live-runtime.mjs";
import { createReport, deniedOrEmpty } from "./live-support.mjs";

process.loadEnvFile(".env.live.local");
const report = createReport();
const sessions = [];
const statePath = "test-results/live-family-state.json";
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
  if (
    profile?.roles.length !== 1 ||
    profile.roles[0] !== role.toLowerCase() ||
    (role !== "ADMIN" && !/^Test\b/i.test(profile.name ?? ""))
  )
    throw new Error("Fictional single-role identity required");
  return { db, profile };
}
async function family(db, after = null) {
  return checked(
    await db.rpc("guardian_dashboard", {
      p_at: new Date().toISOString(),
      p_after: after,
    }),
    "Rodinný prehľad",
  );
}
async function allChildren(db) {
  const ids = [];
  const sizes = [];
  let after = null;
  let total;
  for (let page = 0; page < 100; page++) {
    const result = await family(db, after);
    total ??= result.total;
    if (
      result.total !== total ||
      result.items.length > 4 ||
      (result.has_more && !result.items.length)
    )
      throw new Error("Inconsistent pagination");
    sizes.push(result.items.length);
    for (const child of result.items) {
      if (ids.includes(child.id) || (after && child.id <= after))
        throw new Error("Repeated cursor");
      ids.push(child.id);
    }
    if (!result.has_more) {
      if (ids.length !== total) throw new Error("Incomplete family");
      return { ids, sizes, total };
    }
    after = result.items.at(-1).id;
  }
  throw new Error("Family page limit");
}

try {
  const history = JSON.parse(
    await readFile("test-results/live-migrations.json", "utf8"),
  );
  const age = Date.now() - Date.parse(history.at);
  if (
    !process.argv.includes("--write-test-data") ||
    config.url !== new URL(process.env.LIVE_TEST_PROJECT_URL).origin ||
    history.status !== "verified" ||
    history.pending.length ||
    history.unknown.length ||
    !Number.isFinite(age) ||
    age < 0 ||
    age > 3600000
  )
    throw new Error("Exact test target and recent migration history required");
  await mkdir("test-results", { recursive: true });
  await writeFile(statePath, JSON.stringify(state), {
    flag: "wx",
    mode: 0o600,
  });
  reserved = true;
  const admin = await login("ADMIN");
  const guardian = await login("GUARDIAN");
  const coach = await login("COACH");
  const player = await login("PLAYER");
  state.accountGuardian = guardian.profile.id;
  const baseline = await allChildren(guardian.db);
  const token = checked(
    await guardian.db.auth.getSession(),
    "Testovacia relácia",
  ).session.access_token;
  stage = "izolované fiktívne profily";
  const member = async (name, role) =>
    checked(
      await admin.db.rpc("create_member", {
        p_name: name,
        p_email: null,
        p_phone: null,
        p_birth: null,
        p_role: role,
      }),
      "Fiktívny profil",
    );
  state.guardian = await member("Test rodina – stránkovanie", "guardian");
  await checkpoint();
  for (let n = 1; n <= 26; n++) {
    state.players.push(
      await member(`Test rodina dieťa ${String(n).padStart(2, "0")}`, "player"),
    );
    await checkpoint();
  }
  checked(
    await admin.db.from("guardian_players").insert(
      state.players.map((player_id) => ({
        guardian_id: state.guardian,
        player_id,
      })),
    ),
    "26 rodinných prepojení",
  );
  checked(
    await admin.db.from("guardian_players").insert(
      state.players.slice(0, 5).map((player_id) => ({
        guardian_id: guardian.profile.id,
        player_id,
      })),
    ),
    "Rodičovský prehľad",
  );
  stage = "stránkovanie a rozsah";
  const adminPage = async (after) => {
    let request = admin.db
      .from("guardian_players")
      .select("player_id,profiles!guardian_players_player_id_fkey(full_name)")
      .eq("guardian_id", state.guardian)
      .order("player_id")
      .limit(26);
    if (after) request = request.gt("player_id", after);
    return checked(await request, "Správcovský súpis");
  };
  const first = await adminPage();
  const second = await adminPage(first[24]?.player_id);
  assert(
    "Správca: stránky 25 + 1 bez duplicít a s menami",
    first.length === 26 &&
      second.length === 1 &&
      new Set([...first.slice(0, 25), ...second].map((r) => r.player_id))
        .size === 26 &&
      first.every((r) =>
        r.profiles?.full_name?.startsWith("Test rodina dieťa"),
      ),
  );
  const linked = await allChildren(guardian.db);
  assert(
    "Rodič: úplné štvorčlenné stránky, iba pôvodné a päť nových detí",
    linked.total === baseline.total + 5 &&
      linked.ids.every(
        (id) =>
          baseline.ids.includes(id) || state.players.slice(0, 5).includes(id),
      ) &&
      linked.sizes.slice(0, -1).every((size) => size === 4),
  );
  const tail = await family(guardian.db, linked.ids.at(-1));
  assert(
    "Prázdna stránka za koncom zachová celkový počet rodiny",
    !tail.items.length && !tail.has_more && tail.total === linked.total,
  );
  const own = checked(
    await guardian.db.from("guardian_players").select("guardian_id,player_id"),
    "Rozsah väzieb",
  );
  assert(
    "Rodič nevidí väzby iného rodiča ani spoločného dieťaťa",
    own.every((r) => r.guardian_id === guardian.profile.id),
  );
  const other = state.players[25];
  const stolen = await family(guardian.db, other);
  assert(
    "Cudzí kurzor nesprístupní cudzie deti",
    stolen.total === linked.total &&
      stolen.items.every((r) => linked.ids.includes(r.id)),
  );
  assert(
    "Cudzí profil zostáva skrytý",
    deniedOrEmpty(
      await guardian.db.from("profiles").select("id").eq("id", other),
    ),
  );
  assert(
    "Duplicitné prepojenie odmietnuté",
    (
      await admin.db
        .from("guardian_players")
        .insert({ guardian_id: state.guardian, player_id: other })
    ).error?.code === "23505",
  );
  stage = "odmietnutie neoprávnenej správy";
  for (const [role, account] of [
    ["Rodič", guardian],
    ["Tréner", coach],
    ["Hráč", player],
  ]) {
    const add = await account.db
      .from("guardian_players")
      .insert({ guardian_id: guardian.profile.id, player_id: other });
    assert(
      `${role}: nemôže vytvoriť rodinné prepojenie`,
      add.error?.code === "42501",
    );
    const remove = await account.db
      .from("guardian_players")
      .delete()
      .eq("guardian_id", guardian.profile.id)
      .eq("player_id", state.players[0])
      .select("player_id");
    assert(
      `${role}: nemôže odstrániť rodinné prepojenie`,
      deniedOrEmpty(remove),
    );
  }
  assert(
    "Odmietnuté mutácie zachovali všetkých päť väzieb",
    checked(
      await admin.db
        .from("guardian_players")
        .select("player_id")
        .eq("guardian_id", guardian.profile.id)
        .in("player_id", state.players),
      "Read-back",
    ).length === 5,
  );
  stage = "revokácia iba novej testovacej väzby";
  checked(
    await admin.db
      .from("guardian_players")
      .delete()
      .eq("guardian_id", guardian.profile.id)
      .eq("player_id", state.players[0])
      .select("player_id")
      .single(),
    "Odpojenie novej fixture",
  );
  const after = await allChildren(guardian.db);
  assert(
    "Odpojenie okamžite odstráni iba zvolené dieťa z prehľadu",
    after.total === linked.total - 1 &&
      !after.ids.includes(state.players[0]) &&
      linked.ids
        .filter((id) => id !== state.players[0])
        .every((id) => after.ids.includes(id)),
  );
  assert(
    "Odpojený profil je okamžite neprístupný",
    deniedOrEmpty(
      await guardian.db
        .from("profiles")
        .select("id")
        .eq("id", state.players[0]),
    ),
  );
  assert(
    "Revokácia nevyžadovala obnovu JWT",
    checked(await guardian.db.auth.getSession(), "Relácia po odpojení").session
      .access_token === token,
  );
  assert(
    "Druhý rodič si zachoval svoje prepojenie",
    checked(
      await admin.db
        .from("guardian_players")
        .select("player_id")
        .eq("guardian_id", state.guardian)
        .eq("player_id", state.players[0])
        .single(),
      "Druhý rodič",
    ).player_id === state.players[0],
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
    scope: "live-test-family-links-pagination",
  };
  if (reserved)
    await writeFile(
      "test-results/live-family-links.json",
      JSON.stringify(result, null, 2),
    );
  for (const check of result.checks)
    console.log(`${check.status.toUpperCase()}: ${check.name}`);
  process.exitCode = result.passed ? 0 : 1;
}
