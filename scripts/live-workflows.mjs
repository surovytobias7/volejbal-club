// Explicit live test-data writes; no deletion or automatic cleanup.
import { readFile, writeFile } from "node:fs/promises";
import { client, config, checked } from "./live-runtime.mjs";
import { createReport, deniedOrEmpty } from "./live-support.mjs";

const report = createReport();
const sessions = {};
const created = {};
const assert = (name, condition) => {
  report.add(name, !!condition);
  if (!condition) throw new Error("Test assertion failed");
};
try {
  const state = JSON.parse(
    await readFile("test-results/live-identities.json", "utf8"),
  );
  if (
    state.project !== config.url ||
    !process.argv.includes("--write-test-data")
  )
    throw new Error("Explicit matching test target required");
  for (const label of ["ADMIN", "COACH", "GUARDIAN", "PLAYER", "STRANGER"]) {
    const db = client();
    const identity = state.accounts[label];
    checked(
      await db.auth.signInWithPassword({
        email: identity.email,
        password: identity.password,
      }),
      "Test login",
    );
    sessions[label] = db;
  }
  const {
    ADMIN: admin,
    COACH: coach,
    GUARDIAN: guardian,
    PLAYER: player,
    STRANGER: stranger,
  } = sessions;
  const id = (label) => state.accounts[label].profileId;
  const insert = async (db, table, data) =>
    checked(
      await db
        .from(table)
        .insert(data)
        .select(
          table === "announcements"
            ? "id,team_id,title,body,author_id,author_name"
            : "*",
        )
        .single(),
      `Insert ${table}`,
    );
  const child = checked(
    await admin.rpc("create_member", {
      p_name: "Test dieťa A",
      p_email: "",
      p_phone: "",
      p_birth: "2013-01-01",
      p_role: "player",
    }),
    "Create child",
  );
  const sibling = checked(
    await admin.rpc("create_member", {
      p_name: "Test dieťa B",
      p_email: "",
      p_phone: "",
      p_birth: "2014-01-01",
      p_role: "player",
    }),
    "Create sibling",
  );
  const team = await insert(admin, "teams", {
    name: "Test tím – integrácia",
    category: "U14",
  });
  const other = await insert(admin, "teams", {
    name: "Test cudzí tím",
    category: "Seniori",
  });
  Object.assign(created, {
    child,
    sibling,
    team: team.id,
    otherTeam: other.id,
  });
  checked(
    await admin.from("team_memberships").insert([
      { team_id: team.id, profile_id: id("COACH"), kind: "coach" },
      ...[child, sibling].map((profile_id) => ({
        team_id: team.id,
        profile_id,
        kind: "player",
      })),
      { team_id: other.id, profile_id: id("PLAYER"), kind: "player" },
    ]),
    "Team assignments",
  );
  checked(
    await admin.from("guardian_players").insert(
      [child, sibling].map((player_id) => ({
        guardian_id: id("GUARDIAN"),
        player_id,
      })),
    ),
    "Family links",
  );
  assert("Správca vytvorí členov, tímy a rodinné väzby", true);
  const start = new Date(Date.now() + 24 * 3600000).toISOString();
  const end = new Date(Date.now() + 25 * 3600000).toISOString();
  const event = await insert(coach, "events", {
    team_id: team.id,
    title: "Test tréning",
    kind: "training",
    starts_at: start,
    ends_at: end,
    venue: "Test hala",
  });
  created.event = event.id;
  assert(
    "Tréner vytvorí udalosť iba vo vlastnom tíme",
    !!(
      await coach.from("events").insert({
        team_id: other.id,
        title: "Test zamietnutie",
        kind: "training",
        starts_at: start,
        ends_at: end,
        venue: "Test",
      })
    ).error,
  );
  await insert(guardian, "availability", {
    event_id: event.id,
    player_id: child,
    response: "no",
    reason: "Test ospravedlnenie",
  });
  assert(
    "Cudzí rodič nesmie odpovedať za dieťa",
    !!(
      await stranger
        .from("availability")
        .insert({ event_id: event.id, player_id: sibling, response: "yes" })
    ).error,
  );
  await insert(coach, "attendance", {
    event_id: event.id,
    player_id: child,
    status: "present",
  });
  assert(
    "Rodič nesmie meniť skutočnú dochádzku",
    deniedOrEmpty(
      await guardian
        .from("attendance")
        .update({ status: "absent" })
        .eq("event_id", event.id)
        .eq("player_id", child)
        .select(),
    ),
  );
  const availability = checked(
    await guardian
      .from("availability")
      .select("response")
      .eq("event_id", event.id)
      .eq("player_id", child)
      .single(),
    "Read response",
  );
  const attendance = checked(
    await guardian
      .from("attendance")
      .select("status")
      .eq("event_id", event.id)
      .eq("player_id", child)
      .single(),
    "Read attendance",
  );
  assert(
    "Plánovaná odpoveď a skutočná účasť zostávajú oddelené",
    availability.response === "no" && attendance.status === "present",
  );
  const plan = await insert(admin, "fee_plans", {
    name: "Test členské",
    amount_cents: 5000,
  });
  const charge = await insert(admin, "charges", {
    player_id: child,
    plan_id: plan.id,
    label: "Test členský predpis",
    amount_cents: 5000,
    due_date: start.slice(0, 10),
    period_start: "2026-10-01",
    period_end: "2026-10-31",
  });
  created.charge = charge.id;
  const payment = await insert(admin, "payments", {
    charge_id: charge.id,
    amount_cents: 1500,
    note: "Test čiastočná úhrada",
  });
  await insert(admin, "charge_adjustments", {
    charge_id: charge.id,
    new_total_cents: 4500,
    note: "Test oprava predpisu",
  });
  const sum = () => guardian.rpc("finance_summary", { p_charge_id: charge.id });
  assert(
    "Čiastočná úhrada a oprava dávajú presný zostatok",
    checked(await sum(), "Finance summary").remaining === 3000,
  );
  await insert(admin, "payments", {
    charge_id: charge.id,
    amount_cents: -1500,
    reverses_id: payment.id,
    note: "Test storno úhrady",
  });
  assert(
    "Storno zachová pôvodnú platbu a obnoví zostatok",
    checked(await sum(), "Reversal summary").remaining === 4500,
  );
  assert(
    "Tréner nemá finančný prístup",
    deniedOrEmpty(
      await coach.from("charges").select("id").eq("id", charge.id),
    ) &&
      !!(
        await coach.from("payments").insert({
          charge_id: charge.id,
          amount_cents: 1,
          note: "Test zamietnutie",
        })
      ).error,
  );
  assert(
    "Nesúvisiaci hráč nevidí poplatok dieťaťa",
    deniedOrEmpty(
      await player.from("charges").select("id").eq("id", charge.id),
    ),
  );
  assert(
    "Rodič nemôže prideliť administrátorskú rolu",
    !!(
      await guardian
        .from("user_roles")
        .insert({ profile_id: id("GUARDIAN"), role: "admin" })
    ).error,
  );
  checked(
    await admin.from("fee_plans").update({ archived: true }).eq("id", plan.id),
    "Archive plan",
  );
  assert(
    "Archivovaný plán nemožno priradiť",
    !!(
      await admin.from("charges").insert({
        player_id: sibling,
        plan_id: plan.id,
        label: "Test zamietnutie",
        amount_cents: 5000,
        due_date: start.slice(0, 10),
      })
    ).error,
  );
  const notice = await insert(coach, "announcements", {
    team_id: team.id,
    title: "Test tímový oznam",
    body: "Fiktívny oznam pre integračný test.",
    author_id: id("COACH"),
  });
  assert(
    "Rodič vidí tímový oznam, cudzí rodič nie",
    checked(
      await guardian.from("announcements").select("id").eq("id", notice.id),
      "Notice scope",
    ).length === 1 &&
      deniedOrEmpty(
        await stranger.from("announcements").select("id").eq("id", notice.id),
      ),
  );
  const first = checked(
    await guardian.rpc("refresh_my_reminders"),
    "Reminder creation",
  );
  const second = checked(
    await guardian.rpc("refresh_my_reminders"),
    "Reminder deduplication",
  );
  assert(
    "Pripomienky čakajúcich odpovedí sa neduplikujú",
    first >= 1 && second === 0,
  );
  // Repeated acceptance runs retain fictional records. Traverse the real
  // cursor so the assertion does not depend on this child's UUID ordering.
  let family;
  let after = null;
  const visited = new Set();
  do {
    family = checked(
      await guardian.rpc("guardian_dashboard", {
        p_at: new Date().toISOString(),
        p_after: after,
      }),
      "Family dashboard",
    );
    if (family.items.some((c) => c.id === child) || !family.has_more) break;
    after = family.items.at(-1)?.id;
    if (!after || visited.has(after)) throw new Error("Invalid family cursor");
    visited.add(after);
  } while (true);
  assert(
    "Rodinný prehľad načíta skutočné dáta",
    family.items.some(
      (c) =>
        c.id === child &&
        c.remaining === 4500 &&
        c.next_event?.response === "no" &&
        c.attendance.present === 1,
    ),
  );
  const concurrentCharge = await insert(admin, "charges", {
    player_id: child,
    label: "Test súbežné platby",
    amount_cents: 100,
    due_date: start.slice(0, 10),
  });
  const parallel = await Promise.all(
    [1, 2].map(() =>
      admin.from("payments").insert({
        charge_id: concurrentCharge.id,
        amount_cents: 70,
        note: "Test súbehu",
      }),
    ),
  );
  assert(
    "Súbežné platby nemôžu preplatiť predpis",
    parallel.filter((r) => !r.error).length === 1 &&
      checked(
        await admin.rpc("finance_summary", {
          p_charge_id: concurrentCharge.id,
        }),
        "Concurrency balance",
      ).remaining === 30,
  );
  checked(
    await admin
      .from("profiles")
      .update({ active: false })
      .eq("id", id("GUARDIAN")),
    "Deactivate guardian",
  );
  try {
    assert(
      "Deaktivácia okamžite odoberie prístup bez obnovenia JWT",
      deniedOrEmpty(
        await guardian.from("charges").select("id").eq("id", charge.id),
      ) &&
        checked(
          await guardian.rpc("guardian_dashboard", {
            p_at: start,
            p_after: null,
          }),
          "Inactive scope",
        ).total === 0,
    );
  } finally {
    checked(
      await admin
        .from("profiles")
        .update({ active: true })
        .eq("id", id("GUARDIAN")),
      "Restore test guardian",
    );
  }
  assert(
    "Finančné zmeny majú audit",
    checked(
      await admin
        .from("audit_logs")
        .select("id")
        .eq("table_name", "charge_adjustments")
        .limit(1),
      "Audit",
    ).length === 1,
  );
} catch (e) {
  report.add("Dokončenie živého scenára", false);
  // Only our controlled checked() labels/codes; never SDK details or records.
  console.log(
    /^Insert |^Test login:|^Create |^Read |^Finance |^Reversal |^Reminder |^Family |^Audit:/.test(
      e.message,
    )
      ? e.message
      : "Živý scenár sa zastavil; výsledky zostali uložené.",
  );
} finally {
  for (const db of Object.values(sessions))
    await db.auth.signOut({ scope: "local" });
  await writeFile(
    "test-results/live-created-records.json",
    JSON.stringify(created, null, 2),
  );
}
const result = report.result();
result.scope = "live-auth-postgrest-test-data-workflows";
await writeFile(
  "test-results/live-workflows.json",
  JSON.stringify(result, null, 2),
);
for (const check of result.checks)
  console.log(`${check.status.toUpperCase()}: ${check.name}`);
process.exitCode = result.passed ? 0 : 1;
