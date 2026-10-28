// Opt-in continuation of the existing fictional acceptance dataset. No DDL,
// service-role access, account creation, email or deletion. Never print state.
import { writeFile } from "node:fs/promises";
import { client, config, checked } from "./live-runtime.mjs";
import { createReport } from "./live-support.mjs";

process.loadEnvFile(".env.live.local");
const report = createReport();
const sessions = [];
const statePath = "test-results/live-notes-boundaries-state.json";
let stage = "overenie testovacieho cieľa";
let reserved = false;
const state = { project: config.url, notes: [] };
const save = () =>
  writeFile(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });
const assert = (label, condition) => {
  report.add(label, Boolean(condition));
  if (!condition) throw new Error("Acceptance assertion failed");
};
async function login(role) {
  stage = `overenie testovacej roly ${role}`;
  const db = client();
  checked(
    await db.auth.signInWithPassword({
      email: process.env[`LIVE_${role}_EMAIL`],
      password: process.env[`LIVE_${role}_PASSWORD`],
    }),
    "Testovacie prihlásenie",
  );
  sessions.push(db);
  const context = checked(await db.rpc("viewer_context"), "Aktuálna rola");
  if (
    !context?.roles.includes(role.toLowerCase()) ||
    (role !== "ADMIN" && !context.name.startsWith("Test "))
  )
    throw new Error("Invalid fictional role");
  return { db, context };
}
async function page(db, context, cursor) {
  return checked(
    await db.rpc("internal_notes_page", {
      p_player: context.player_id ?? null,
      p_event: context.event_id ?? null,
      p_before_at: cursor?.created_at ?? null,
      p_before_id: cursor?.id ?? null,
    }),
    "Stránka poznámok",
  );
}
async function notificationCount(db, recipients) {
  const result = await db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .in("recipient_id", recipients);
  checked(result, "Počet upozornení");
  if (!Number.isSafeInteger(result.count)) throw new Error("Invalid count");
  return result.count;
}

try {
  const fixtureEvent = process.argv
    .find((arg) => arg.startsWith("--fixture-event="))
    ?.split("=")[1];
  if (
    !process.argv.includes("--write-test-data") ||
    new URL(process.env.LIVE_TEST_PROJECT_URL).origin !== config.url ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      fixtureEvent ?? "",
    )
  )
    throw new Error("Confirmed fictional target required");
  const admin = await login("ADMIN");
  const coach = await login("COACH");
  const player = await login("PLAYER");
  const guardian = await login("GUARDIAN");
  stage = "príprava samostatného fiktívneho tréningu";
  const anchor = checked(
    await coach.db
      .from("events")
      .select("team_id,title")
      .eq("id", fixtureEvent)
      .single(),
    "Fiktívna udalosť",
  );
  if (anchor.title !== "Test tréning – mobilné overenie")
    throw new Error("Fictional event required");
  const team = checked(
    await coach.db
      .from("teams")
      .select("id,name")
      .eq("id", anchor.team_id)
      .single(),
    "Fiktívny tím",
  );
  if (team.name !== "Test tím – dochádzka a poznámky")
    throw new Error("Fictional team required");
  const member = checked(
    await coach.db
      .from("team_memberships")
      .select("profile_id,profiles!inner(full_name)")
      .eq("team_id", team.id)
      .eq("kind", "player")
      .eq("profiles.full_name", "Test dieťa – dochádzka B")
      .single(),
    "Fiktívny hráč",
  );
  // Reserve before any write. A failed/complete run must be reviewed, never
  // silently reseeded. Keep its checkpoint even after an unknown write outcome.
  state.fixtureEvent = fixtureEvent;
  state.player = member.profile_id;
  await writeFile(statePath, JSON.stringify(state), {
    flag: "wx",
    mode: 0o600,
  });
  reserved = true;
  const event = checked(
    await coach.db
      .from("events")
      .insert({
        team_id: team.id,
        title: "Test tréning – hranice poznámok",
        kind: "training",
        starts_at: "2026-10-30T15:00:00Z",
        ends_at: "2026-10-30T16:30:00Z",
        venue: "Testovacia hala",
      })
      .select("id")
      .single(),
    "Vytvorenie tréningu",
  );
  state.event = event.id;
  await save();
  const recipients = [player.context.id, guardian.context.id];
  // Event notifications, if any, precede this baseline. Only note writes follow.
  const before = await notificationCount(admin.db, recipients);
  const longBody = "Fiktívny tréningový text. ".repeat(200).slice(0, 4000);
  for (const [kind, context] of [
    ["tréning", { event_id: state.event }],
    ["hráč", { player_id: state.player }],
  ]) {
    stage = `hranice poznámok: ${kind}`;
    const inserted = checked(
      await coach.db
        .from("internal_notes")
        .insert(
          Array.from({ length: 26 }, (_, index) => ({
            ...context,
            body:
              index === 0
                ? longBody
                : `Fiktívna poznámka ${index + 1}: ${kind}, príjem a komunikácia.`,
          })),
        )
        .select("id,body,version"),
      "Vytvorenie poznámok",
    );
    state.notes.push(...inserted.map((note) => note.id));
    await save();
    assert(
      `${kind}: 26 poznámok a presný text s 4 000 znakmi`,
      inserted.length === 26 &&
        inserted.some((note) => note.body === longBody && note.version === 1),
    );
    const ids = new Set();
    let cursor;
    let pages = 0;
    let more;
    do {
      const current = await page(coach.db, context, cursor);
      assert(
        `${kind}: platná stránka ${++pages} bez duplicít`,
        current.can_write === true &&
          current.items.length > 0 &&
          current.items.length <= 25 &&
          current.items.every((note) => !ids.has(note.id)) &&
          new Set(current.items.map((note) => note.id)).size ===
            current.items.length,
      );
      current.items.forEach((note) => ids.add(note.id));
      cursor = current.items.at(-1);
      more = current.has_more;
      if (pages >= 10 && more) throw new Error("Unexpected fixture size");
    } while (more);
    assert(
      `${kind}: všetky nové poznámky dostupné cez najmenej dve stránky`,
      pages >= 2 && inserted.every((note) => ids.has(note.id)),
    );
    const invalid = await coach.db
      .from("internal_notes")
      .insert({ ...context, body: "x".repeat(4001) });
    assert(
      `${kind}: databáza odmieta 4 001 znakov`,
      invalid.error?.code === "23514",
    );
    for (const [role, viewer] of [
      ["hráč", player],
      ["rodič", guardian],
    ]) {
      const hidden = await page(viewer.db, context, cursor);
      assert(
        `${kind}: ${role} nemá prístup ani s platným kurzorom`,
        hidden.can_write === false &&
          hidden.items.length === 0 &&
          hidden.has_more === false,
      );
    }
    const changed = checked(
      await coach.db
        .from("internal_notes")
        .update({ body: "Fiktívna oprava pre kontrolu notifikácií." })
        .eq("id", inserted[1].id)
        .eq("version", 1)
        .select("version")
        .single(),
      "Úprava poznámky",
    );
    assert(`${kind}: úprava zvýši verziu`, changed.version === 2);
  }
  assert(
    "Poznámky ani ich úpravy nepridali upozornenia hráčovi a rodičovi",
    (await notificationCount(admin.db, recipients)) === before,
  );
  state.completedAt = new Date().toISOString();
  await save();
} catch {
  report.add(`Dokončenie: ${stage}`, false);
} finally {
  for (const db of sessions) {
    try {
      checked(await db.auth.signOut({ scope: "local" }), "Odhlásenie testu");
    } catch {
      report.add("Odhlásenie testovacej relácie", false);
    }
  }
  const result = { ...report.result(), scope: "live-test-notes-boundaries" };
  if (reserved)
    await writeFile(
      "test-results/live-notes-boundaries.json",
      JSON.stringify(result, null, 2),
    );
  for (const check of result.checks)
    console.log(`${check.status.toUpperCase()}: ${check.name}`);
  process.exitCode = result.passed ? 0 : 1;
}
