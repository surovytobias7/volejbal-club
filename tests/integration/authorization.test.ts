import { PGlite } from "@electric-sql/pglite";
import {
  savedAttendanceSchema,
  type AttendanceInput,
} from "../../src/lib/attendance";
import { notesPageSchema } from "../../src/lib/notes";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { eventRosterSchema, teamRosterSchema } from "../../src/lib/rosters";
import { calendarPageSchema } from "../../src/lib/calendar-data";
import { guardianDashboardSchema } from "../../src/lib/guardian-dashboard";
import {
  playerResponsesSchema,
  withPlayerResponses,
} from "../../src/lib/player-dashboard";
import {
  attendancePageSchema,
  announcementPageSchema,
} from "../../src/lib/activity";
import { selectorResult } from "../../src/lib/selectors";
import {
  dashboardSummarySchema,
  memberPageSchema,
  teamPageSchema,
} from "../../src/lib/directories";
import {
  financeSummarySchema,
  chargePageSchema,
  paymentPageSchema,
} from "../../src/lib/finance";
import {
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  describe,
  it,
  expect,
} from "vitest";

const uid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ids = {
  admin: uid(1),
  coach: uid(2),
  parent: uid(3),
  child: uid(4),
  sibling: uid(5),
  stranger: uid(6),
  adult: uid(7),
  inactive: uid(8),
  team: uid(20),
  other: uid(21),
  event: uid(30),
  otherEvent: uid(31),
  charge: uid(40),
  otherCharge: uid(41),
};
let db: PGlite;
async function as(n: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [n]);
  await db.exec("set role authenticated");
}
const count = async (table: string) =>
  Number(
    (await db.query<{ n: number }>(`select count(*) as n from public.${table}`))
      .rows[0].n,
  );
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth,public to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`,
  );
  for (const file of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(join("supabase/migrations", file), "utf8"));
  for (const [name, n] of Object.entries(ids).slice(0, 8)) {
    await db.query("insert into auth.users(id) values($1)", [n]);
    await db.query(
      "insert into public.profiles(id,user_id,full_name,active) values($1,$1,$2,$3)",
      [n, `Fixture ${name}`, name !== "inactive"],
    );
    await db.query(
      "insert into public.member_details(profile_id,birth_date) values($1,$2)",
      [n, name === "adult" ? "1995-01-01" : "2012-01-01"],
    );
  }
  await db.exec(`insert into public.user_roles values('${ids.admin}','admin'),('${ids.coach}','coach'),('${ids.parent}','guardian'),('${ids.child}','player'),('${ids.sibling}','player'),('${ids.stranger}','player'),('${ids.adult}','player'),('${ids.inactive}','admin');
  insert into public.teams(id,name,category) values('${ids.team}','Kadetky','U16'),('${ids.other}','Juniorky','U18');
  insert into public.team_memberships values('${ids.team}','${ids.coach}','coach'),('${ids.team}','${ids.child}','player'),('${ids.team}','${ids.sibling}','player'),('${ids.other}','${ids.stranger}','player'),('${ids.other}','${ids.adult}','player');
  insert into public.guardian_players values('${ids.parent}','${ids.child}'),('${ids.parent}','${ids.sibling}');
  insert into public.events(id,team_id,title,kind,starts_at,ends_at,venue) values('${ids.event}','${ids.team}','Tréning','training','2026-12-10 16:00Z','2026-12-10 17:00Z','Hala'),('${ids.otherEvent}','${ids.other}','Tréning','training','2026-12-10 16:00Z','2026-12-10 17:00Z','Hala');
  insert into public.charges(id,player_id,label,amount_cents,due_date) values('${ids.charge}','${ids.child}','Členské',5000,'2026-12-01'),('${ids.otherCharge}','${ids.adult}','Členské',5000,'2026-12-01');`);
});
beforeEach(async () => {
  await db.exec("begin");
});
afterEach(async () => {
  await db.exec("rollback; reset role");
});
afterAll(async () => {
  await db.close();
});

describe("comprehensive access audit regressions", () => {
  it.each(["admin", "coach", "parent", "child", "adult", "inactive"] as const)(
    "returns a minimal current viewer context for %s",
    async (role) => {
      await as(ids[role]);
      const result = (
        await db.query<{ data: Record<string, unknown> | null }>(
          "select public.viewer_context() as data",
        )
      ).rows[0].data;
      if (role === "inactive") expect(result).toBeNull();
      else {
        expect(result).toMatchObject({
          id: ids[role],
          can_finance: ["admin", "parent", "adult"].includes(role),
        });
        expect(Object.keys(result!).sort()).toEqual([
          "can_finance",
          "id",
          "name",
          "roles",
        ]);
      }
    },
  );
  it.each(["coach", "inactive"] as const)(
    "denies private details to %s including null-viewer bypass",
    async (role) => {
      await as(ids[role]);
      await expect(
        db.query("select public.member_private_details($1)", [ids.child]),
      ).rejects.toThrow();
    },
  );
  it.each(["parent", "child", "admin"] as const)(
    "retains authorized birth-date access without exposing Auth identifiers for %s",
    async (role) => {
      await as(ids[role]);
      const { rows } = await db.query<{ data: Record<string, unknown> }>(
        "select public.member_private_details($1) as data",
        [ids.child],
      );
      expect(rows[0].data.birth_date).toBe("2012-01-01");
      expect(rows[0].data.account_linked).toBe(role === "admin" ? true : null);
      expect(rows[0].data).not.toHaveProperty("user_id");
    },
  );
  it("does not permit Auth-ID predicates on otherwise readable profiles", async () => {
    await as(ids.coach);
    await expect(
      db.query("select id from public.profiles where user_id=$1", [ids.child]),
    ).rejects.toThrow();
  });
  it("keeps member administration out of personal directory RPCs", async () => {
    for (const id of [ids.parent, ids.child]) {
      await as(id);
      const { rows } = await db.query<{
        data: { items: unknown[]; total: number };
      }>("select public.member_page(null,null,null) as data");
      expect(rows[0].data).toMatchObject({ items: [], total: 0 });
    }
  });
  it("masks account state for coaches but preserves administrator directory management", async () => {
    for (const id of [ids.admin, ids.coach]) {
      await as(id);
      const { rows } = await db.query<{
        data: { items: Record<string, unknown>[] };
      }>("select public.member_page(null,null,null) as data");
      expect(rows[0].data.items.length).toBeGreaterThan(0);
      for (const item of rows[0].data.items) {
        expect(item).not.toHaveProperty("user_id");
        expect(item.account_linked).toBe(id === ids.admin ? true : null);
      }
    }
  });
  it("revokes guardian links even when an unrelated coach role remains", async () => {
    await as(ids.admin);
    await db.query("insert into public.user_roles values($1,'coach')", [
      ids.parent,
    ]);
    await db.query(
      "delete from public.user_roles where profile_id=$1 and role='guardian'",
      [ids.parent],
    );
    await as(ids.parent);
    expect(await count("guardian_players")).toBe(0);
    expect(await count("charges")).toBe(0);
    expect(await count("events")).toBe(0);
    const { rows } = await db.query<{ data: { can_finance: boolean } }>(
      "select public.viewer_context() as data",
    );
    expect(rows[0].data.can_finance).toBe(false);
  });
  it("cannot impersonate availability using administrator access alone", async () => {
    await as(ids.admin);
    await expect(
      db.query(
        "insert into public.availability(event_id,player_id,response) values($1,$2,'yes')",
        [ids.event, ids.child],
      ),
    ).rejects.toThrow();
  });
  it("preserves independent availability and attendance, with database actor/time stamps on correction", async () => {
    await as(ids.parent);
    await db.query(
      "insert into public.availability(event_id,player_id,response) values($1,$2,'no')",
      [ids.event, ids.child],
    );
    await as(ids.coach);
    await db.query(
      "insert into public.attendance(event_id,player_id,status) values($1,$2,'present')",
      [ids.event, ids.child],
    );
    const { rows } = await db.query<{ updated_by: string; trusted: boolean }>(
      "update public.attendance set status='excused',updated_by=$1,updated_at='1900-01-01' returning updated_by,updated_at>'2020-01-01' as trusted",
      [ids.parent],
    );
    expect(rows).toEqual([{ updated_by: ids.coach, trusted: true }]);
    expect(
      (
        await db.query<{ response: string }>(
          "select response from public.availability",
        )
      ).rows[0].response,
    ).toBe("no");
  });
  it("still permits empty event transfer and ordinary edits to populated events", async () => {
    await as(ids.admin);
    await db.query("update public.events set team_id=$1 where id=$2", [
      ids.team,
      ids.otherEvent,
    ]);
    await db.query(
      "insert into public.attendance(event_id,player_id,status) values($1,$2,'present')",
      [ids.event, ids.child],
    );
    await db.query("update public.events set venue='Druhá hala' where id=$1", [
      ids.event,
    ]);
    expect(
      (
        await db.query<{ venue: string }>(
          "select venue from public.events where id=$1",
          [ids.event],
        )
      ).rows[0].venue,
    ).toBe("Druhá hala");
  });
  it("cannot transfer an event that only has planned availability", async () => {
    await as(ids.child);
    await db.query(
      "insert into public.availability(event_id,player_id,response) values($1,$2,'yes')",
      [ids.event, ids.child],
    );
    await as(ids.admin);
    await expect(
      db.query("update public.events set team_id=$1 where id=$2", [
        ids.other,
        ids.event,
      ]),
    ).rejects.toThrow();
  });
  it("masks named audiences on the page RPC while preserving manager editing and one audit record", async () => {
    await as(ids.admin);
    await db.query(
      "insert into public.announcements(title,body,author_id,recipient_ids) values('Adresný oznam','Pokyny',$1,array[$2,$3]::uuid[])",
      [ids.admin, ids.parent, ids.adult],
    );
    expect(
      (
        await db.query(
          "select id from public.audit_logs where table_name='announcements'",
        )
      ).rows,
    ).toHaveLength(1);
    for (const id of [ids.admin, ids.parent, ids.child]) {
      await as(id);
      const { rows } = await db.query<{
        data: { items: { recipient_ids: string[]; audience: string }[] };
      }>("select public.announcement_page(null,false,null,null,null) as data");
      if (id === ids.child) expect(rows[0].data.items).toEqual([]);
      else
        expect(rows[0].data.items[0]).toMatchObject({
          audience: "people",
          recipient_ids: id === ids.admin ? [ids.parent, ids.adult] : [],
        });
    }
  });
  it.each([
    "profiles",
    "member_details",
    "teams",
    "club_settings",
    "fee_plans",
  ])(
    "denies unsupported destructive deletion of %s even for administrators",
    async (table) => {
      await as(ids.admin);
      await expect(db.exec(`delete from public.${table}`)).rejects.toThrow();
    },
  );
  it("requires an administrator for account linking", async () => {
    await as(ids.child);
    await expect(
      db.query("select public.link_member_account($1,$2)", [
        ids.child,
        ids.adult,
      ]),
    ).rejects.toThrow();
  });
  it("stamps payment provenance and preserves its financial audit", async () => {
    await as(ids.admin);
    const { rows } = await db.query<{
      id: string;
      recorded_by: string;
      trusted: boolean;
    }>(
      "insert into public.payments(charge_id,amount_cents,note,recorded_by,created_at) values($1,1000,'Fiktívna úhrada',$2,'1900-01-01') returning id,recorded_by,created_at>'2020-01-01' as trusted",
      [ids.charge, ids.coach],
    );
    expect(rows[0]).toMatchObject({ recorded_by: ids.admin, trusted: true });
    const audit = await db.query<{ actor_id: string; recorded_by: string }>(
      "select actor_id,new_data->>'recorded_by' as recorded_by from public.audit_logs where table_name='payments' and record_id=$1",
      [rows[0].id],
    );
    expect(audit.rows).toEqual([
      { actor_id: ids.admin, recorded_by: ids.admin },
    ]);
  });
  it("links only an active unlinked profile, without exposing the Auth ID", async () => {
    await as(ids.admin);
    const profile = (
      await db.query<{ id: string }>(
        "select public.create_member('Fiktívny člen',null,null,null,'player') as id",
      )
    ).rows[0].id;
    await db.exec("reset role");
    await db.query("insert into auth.users(id) values($1)", [uid(99)]);
    await as(ids.admin);
    await db.query("select public.link_member_account($1,$2)", [
      profile,
      uid(99),
    ]);
    expect(
      (
        await db.query<{ data: { account_linked: boolean } }>(
          "select public.member_private_details($1) as data",
          [profile],
        )
      ).rows[0].data.account_linked,
    ).toBe(true);
    await expect(
      db.query("select public.link_member_account($1,$2)", [
        profile,
        ids.adult,
      ]),
    ).rejects.toThrow();
  });
  it("denies audit actor lookup outside administration", async () => {
    await as(ids.coach);
    await expect(
      db.query("select public.audit_actor_names(array[$1]::uuid[])", [
        ids.admin,
      ]),
    ).rejects.toThrow();
  });
  it("keeps an orphan invitation isolated until an administrator reconciles it", async () => {
    await db.query("insert into auth.users(id) values($1)", [uid(99)]);
    await as(ids.admin);
    const profile = (
      await db.query<{ id: string }>(
        "select public.create_member('Fiktívna pozvánka',null,null,null,'player') as id",
      )
    ).rows[0].id;
    await as(uid(99));
    expect(
      (
        await db.query<{ data: unknown }>(
          "select public.viewer_context() as data",
        )
      ).rows[0].data,
    ).toBeNull();
    expect(await count("profiles")).toBe(0);
    expect(await count("charges")).toBe(0);
    await as(ids.admin);
    await db.query("select public.link_member_account($1,$2)", [
      profile,
      uid(99),
    ]);
    const audit = await db.query<{ actor_id: string }>(
      "select actor_id from public.audit_logs where table_name='profiles' and record_id=$1 and new_data->>'user_id'=$2",
      [profile, uid(99)],
    );
    expect(audit.rows).toEqual([{ actor_id: ids.admin }]);
    // Same Auth identity, no JWT refresh after reconciliation.
    await as(uid(99));
    const context = (
      await db.query<{ data: { id: string; roles: string[] } }>(
        "select public.viewer_context() as data",
      )
    ).rows[0].data;
    expect(context).toMatchObject({ id: profile, roles: ["player"] });
    expect(await count("profiles")).toBe(1);
    expect(await count("charges")).toBe(0);
  });
  it.each(["coach", "parent", "inactive"] as const)(
    "denies invitation reconciliation to %s",
    async (role) => {
      await as(ids[role]);
      await expect(
        db.query("select public.link_member_account($1,$2)", [
          ids.child,
          uid(99),
        ]),
      ).rejects.toThrow(/Administrator required/);
    },
  );
  it("denies linking when the administrator role was revoked without JWT refresh", async () => {
    await as(ids.admin);
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      ids.coach,
    ]);
    await db.query("delete from public.user_roles where profile_id=$1", [
      ids.admin,
    ]);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      ids.admin,
    ]);
    await db.exec("set role authenticated");
    await expect(
      db.query("select public.link_member_account($1,$2)", [
        ids.child,
        uid(99),
      ]),
    ).rejects.toThrow(/Administrator required/);
  });
  it("does not assign an existing Auth identity to a second profile", async () => {
    await as(ids.admin);
    const profile = (
      await db.query<{ id: string }>(
        "select public.create_member('Fiktívny duplikát',null,null,null,'player') as id",
      )
    ).rows[0].id;
    await expect(
      db.query("select public.link_member_account($1,$2)", [
        profile,
        ids.adult,
      ]),
    ).rejects.toThrow(/unique/);
  });
  it("keeps the new public and private helpers inaccessible to anonymous callers", async () => {
    const { rows } = await db.query<{ allowed: boolean }>(
      "select has_function_privilege('anon',p.oid,'execute') as allowed from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname in ('viewer_context','member_private_details','member_account_linked','link_member_account','audit_actor_names','can_manage_announcement')",
    );
    expect(rows.length).toBeGreaterThan(10);
    expect(rows.every((r) => !r.allowed)).toBe(true);
  });
  it("cannot transfer an event with private player records to a new team", async () => {
    await as(ids.coach);
    await db.query(
      "insert into public.attendance(event_id,player_id,status) values($1,$2,'present')",
      [ids.event, ids.child],
    );
    await as(ids.admin);
    await expect(
      db.query("update public.events set team_id=$1 where id=$2", [
        ids.other,
        ids.event,
      ]),
    ).rejects.toThrow();
  });
  it("cannot transfer a training note to another team through its event", async () => {
    await as(ids.coach);
    await db.query(
      "insert into public.internal_notes(event_id,body) values($1,'Súkromný tréningový plán')",
      [ids.event],
    );
    await as(ids.admin);
    await expect(
      db.query("update public.events set team_id=$1 where id=$2", [
        ids.other,
        ids.event,
      ]),
    ).rejects.toThrow();
  });
  it("cannot move an availability response between linked children", async () => {
    await as(ids.parent);
    await db.query(
      "insert into public.availability(event_id,player_id,response) values($1,$2,'yes')",
      [ids.event, ids.child],
    );
    await expect(
      db.query(
        "update public.availability set player_id=$1 where event_id=$2 and player_id=$3",
        [ids.sibling, ids.event, ids.child],
      ),
    ).rejects.toThrow();
  });
  it("cannot move recorded attendance between roster players", async () => {
    await as(ids.coach);
    await db.query(
      "insert into public.attendance(event_id,player_id,status) values($1,$2,'present')",
      [ids.event, ids.child],
    );
    await expect(
      db.query(
        "update public.attendance set player_id=$1 where event_id=$2 and player_id=$3",
        [ids.sibling, ids.event, ids.child],
      ),
    ).rejects.toThrow();
  });
  it("stamps availability time in the database instead of trusting a caller", async () => {
    await as(ids.parent);
    const result = await db.query<{ trusted: boolean }>(
      "insert into public.availability(event_id,player_id,response,updated_at) values($1,$2,'yes','1900-01-01') returning updated_at > '2020-01-01' as trusted",
      [ids.event, ids.child],
    );
    expect(result.rows[0].trusted).toBe(true);
  });
  it("denies private Auth identifiers even for an otherwise readable roster player", async () => {
    await as(ids.coach);
    expect(await count("profiles")).toBeGreaterThan(0);
    await expect(
      db.query("select user_id from public.profiles where id=$1", [ids.child]),
    ).rejects.toThrow();
  });
  it("denies direct birth-date selection to the generic API role", async () => {
    await as(ids.coach);
    await expect(
      db.query(
        "select birth_date from public.member_details where profile_id=$1",
        [ids.child],
      ),
    ).rejects.toThrow();
  });
  it("does not disclose all named recipients to one recipient", async () => {
    await as(ids.admin);
    await db.query(
      "insert into public.announcements(title,body,author_id,recipient_ids) values('Adresné pokyny','Súkromné pokyny',$1,array[$2,$3]::uuid[])",
      [ids.admin, ids.parent, ids.adult],
    );
    await as(ids.parent);
    expect(await count("announcements")).toBe(1);
    await expect(
      db.query("select recipient_ids from public.announcements"),
    ).rejects.toThrow();
  });
  it("closes club access when the last role is removed without refreshing a JWT", async () => {
    await as(ids.admin);
    await db.query("delete from public.user_roles where profile_id=$1", [
      ids.parent,
    ]);
    await as(ids.parent);
    expect(await count("club_settings")).toBe(0);
    expect(await count("guardian_players")).toBe(0);
  });
});

describe("coach attendance workflow", () => {
  const change = (
    player_id = ids.child,
    status: AttendanceInput["changes"][number]["status"] = "present",
    expected_version = 0,
    reason = "",
  ) => ({ player_id, status, expected_version, reason });
  async function save(changes = [change()], event = ids.event) {
    return savedAttendanceSchema.parse(
      (
        await db.query<{ data: unknown }>(
          "select public.save_attendance($1,$2::jsonb) as data",
          [event, JSON.stringify(changes)],
        )
      ).rows[0].data,
    );
  }
  async function roster(event = ids.event) {
    return eventRosterSchema.parse(
      (
        await db.query<{ data: unknown }>(
          "select public.event_roster_page($1,'',null,null) as data",
          [event],
        )
      ).rows[0].data,
    );
  }
  async function history() {
    return attendancePageSchema.parse(
      (
        await db.query<{ data: unknown }>(
          "select public.attendance_page('',null,null,null,null,null) as data",
        )
      ).rows[0].data,
    );
  }
  it("starts unmarked, saves a batch, persists on roster reread and keeps availability separate", async () => {
    await as(ids.parent);
    await db.query(
      "insert into public.availability(event_id,player_id,response,reason) values($1,$2,'yes',''),($1,$3,'no','Rodinný program')",
      [ids.event, ids.child, ids.sibling],
    );
    await as(ids.coach);
    expect(
      (await roster()).items.every(
        (p) => p.attendance === null && p.attendance_version === 0,
      ),
    ).toBe(true);
    const result = await save([
      change(ids.child, "absent"),
      change(ids.sibling, "present"),
    ]);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.version === 1)).toBe(true);
    const reread = (await roster()).items;
    expect(reread.find((p) => p.profile_id === ids.child)).toMatchObject({
      attendance: "absent",
      availability: { response: "yes" },
    });
    expect(reread.find((p) => p.profile_id === ids.sibling)).toMatchObject({
      attendance: "present",
      availability: { response: "no", reason: "Rodinný program" },
    });
    expect(await count("attendance")).toBe(2);
  });
  it("does not create absences for players omitted from a partial save", async () => {
    await as(ids.coach);
    await save();
    expect(
      (await roster()).items.find((p) => p.profile_id === ids.sibling)
        ?.attendance_version,
    ).toBe(0);
    expect((await history()).total).toBe(1);
  });
  it("audits corrections, authentic actor and database time, and excludes an unmarked correction from statistics", async () => {
    await as(ids.coach);
    await save();
    await save([change(ids.child, "excused", 1, "Rodinný program")]);
    await save([change(ids.child, null, 2)]);
    expect(
      (await roster()).items.find((p) => p.profile_id === ids.child),
    ).toMatchObject({
      attendance: null,
      attendance_version: 3,
      attendance_reason: "",
    });
    expect((await history()).total).toBe(0);
    await as(ids.admin);
    const audit = await db.query<{
      actor_id: string;
      old_data: { status: string };
      new_data: { status: null; version: number };
    }>(
      "select actor_id,old_data,new_data from public.audit_logs where table_name='attendance' and new_data->>'version'='3'",
    );
    expect(audit.rows[0]).toMatchObject({
      actor_id: ids.coach,
      old_data: { status: "excused" },
      new_data: { status: null, version: 3 },
    });
    await db.query(
      "update public.attendance set status='late',updated_by=$1,updated_at='1900-01-01',version=800 where event_id=$2",
      [ids.coach, ids.event],
    );
    const record = (
      await db.query<{ updated_by: string; version: number; stamped: boolean }>(
        "select updated_by,version,updated_at>'2020-01-01' as stamped from public.attendance",
      )
    ).rows[0];
    expect(record).toEqual({
      updated_by: ids.admin,
      version: 4,
      stamped: true,
    });
  });
  it("treats late as attended in dashboard/family statistics while keeping a separate history count", async () => {
    await as(ids.coach);
    await save([change(ids.child, "late")]);
    expect(await history()).toMatchObject({ total: 1, present: 0, late: 1 });
    const summary = (
      await db.query<{ data: { participation: number } }>(
        "select public.dashboard_summary(now()) as data",
      )
    ).rows[0].data;
    expect(summary.participation).toBe(100);
    await as(ids.parent);
    const family = guardianDashboardSchema.parse(
      (
        await db.query<{ data: unknown }>(
          "select public.guardian_dashboard(now(),null) as data",
        )
      ).rows[0].data,
    );
    expect(family.items.find((p) => p.id === ids.child)?.attendance).toEqual({
      recorded: 1,
      present: 1,
    });
  });
  it("rejects a stale correction and rolls back the entire batch", async () => {
    await as(ids.coach);
    await save([change(ids.child), change(ids.sibling)]);
    await save([change(ids.sibling, "late", 1)]);
    await db.exec("savepoint stale_save");
    await expect(
      save([change(ids.child, "absent", 1), change(ids.sibling, "absent", 1)]),
    ).rejects.toMatchObject({ code: "PT409" });
    await db.exec("rollback to savepoint stale_save");
    const page = await roster();
    expect(page.items.find((p) => p.profile_id === ids.child)?.attendance).toBe(
      "present",
    );
    expect(
      page.items.find((p) => p.profile_id === ids.sibling)?.attendance,
    ).toBe("late");
  });
  it("safely retries an acknowledged-lost batch without duplicate records or audit updates", async () => {
    await as(ids.coach);
    const first = await save();
    expect(await save()).toEqual(first);
    expect(await count("attendance")).toBe(1);
    await as(ids.admin);
    expect(
      Number(
        (
          await db.query<{ n: number }>(
            "select count(*) as n from public.audit_logs where table_name='attendance'",
          )
        ).rows[0].n,
      ),
    ).toBe(1);
  });
  it.each(["child", "parent", "stranger", "inactive"] as const)(
    "denies actual attendance writes by %s",
    async (role) => {
      await as(ids[role]);
      await expect(save()).rejects.toMatchObject({ code: "42501" });
    },
  );
  it("denies a coach's unassigned session even with a second guardian role", async () => {
    await as(ids.admin);
    await db.query("insert into public.user_roles values($1,'guardian')", [
      ids.coach,
    ]);
    await db.query("insert into public.guardian_players values($1,$2)", [
      ids.coach,
      ids.stranger,
    ]);
    await as(ids.coach);
    expect((await roster(ids.otherEvent)).can_manage).toBe(false);
    await expect(
      save([change(ids.stranger)], ids.otherEvent),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("lets the administrator manage another team", async () => {
    await as(ids.admin);
    expect(await save([change(ids.stranger)], ids.otherEvent)).toHaveLength(1);
  });
  it.each(["child", "parent"] as const)(
    "prevents direct Data API corrections by %s",
    async (role) => {
      await as(ids.coach);
      await save();
      await as(ids[role]);
      const result = await db.query(
        "update public.attendance set status='absent' where event_id=$1",
        [ids.event],
      );
      expect(result.affectedRows).toBe(0);
      expect((await history()).items[0].status).toBe("present");
    },
  );
  it("scopes both roster and history to self/linked children, including reasons", async () => {
    await as(ids.admin);
    await save([
      change(ids.child, "excused", 0, "Rodinný program"),
      change(ids.sibling),
    ]);
    await save([change(ids.stranger)], ids.otherEvent);
    await as(ids.child);
    expect((await roster()).items.map((p) => p.profile_id)).toEqual([
      ids.child,
    ]);
    expect((await history()).items.map((p) => p.player_id)).toEqual([
      ids.child,
    ]);
    await as(ids.parent);
    expect((await roster()).items.map((p) => p.profile_id).sort()).toEqual([
      ids.child,
      ids.sibling,
    ]);
    expect((await history()).total).toBe(2);
    await as(ids.admin);
    await db.query(
      "delete from public.guardian_players where guardian_id=$1 and player_id=$2",
      [ids.parent, ids.child],
    );
    await as(ids.parent);
    expect((await history()).items.map((p) => p.player_id)).toEqual([
      ids.sibling,
    ]);
    expect((await roster()).items.map((p) => p.profile_id)).toEqual([
      ids.sibling,
    ]);
  });
  it.each(["membership", "role", "active"])(
    "immediately rejects the same JWT after coach %s is revoked",
    async (kind) => {
      await as(ids.coach);
      await save();
      await as(ids.admin);
      if (kind === "membership")
        await db.query(
          "delete from public.team_memberships where profile_id=$1",
          [ids.coach],
        );
      if (kind === "role")
        await db.query("delete from public.user_roles where profile_id=$1", [
          ids.coach,
        ]);
      if (kind === "active")
        await db.query("update public.profiles set active=false where id=$1", [
          ids.coach,
        ]);
      await as(ids.coach);
      expect((await history()).total).toBe(0);
      await expect(
        save([change(ids.child, "absent", 1)]),
      ).rejects.toMatchObject({ code: "42501" });
    },
  );
  it.each(["membership", "role", "deactivation"])(
    "preserves historical attendance after player %s removal and permits an authorized correction",
    async (removed) => {
      await as(ids.coach);
      await save();
      await as(ids.admin);
      if (removed === "membership")
        await db.query(
          "delete from public.team_memberships where profile_id=$1",
          [ids.child],
        );
      else if (removed === "role")
        await db.query(
          "delete from public.user_roles where profile_id=$1 and role='player'",
          [ids.child],
        );
      else
        await db.query("update public.profiles set active=false where id=$1", [
          ids.child,
        ]);
      await as(ids.coach);
      expect(
        (await roster()).items.find((p) => p.profile_id === ids.child),
      ).toMatchObject({
        attendance: "present",
        full_name: "Fixture child",
        current_member: false,
        can_respond: false,
      });
      expect((await save([change(ids.child, "late", 1)]))[0]).toMatchObject({
        status: "late",
        version: 2,
      });
      await as(ids.admin);
      await db.query(
        "delete from public.team_memberships where profile_id=$1",
        [ids.coach],
      );
      await as(ids.coach);
      await expect(
        save([change(ids.child, "absent", 2)]),
      ).rejects.toMatchObject({ code: "42501" });
    },
  );
  it("rejects inserting a departed player and rolls back valid earlier entries", async () => {
    await as(ids.admin);
    await db.query("delete from public.team_memberships where profile_id=$1", [
      ids.sibling,
    ]);
    await as(ids.coach);
    await db.exec("savepoint removed_player");
    await expect(
      save([change(ids.child), change(ids.sibling)]),
    ).rejects.toMatchObject({ code: "42501" });
    await db.exec("rollback to savepoint removed_player");
    expect(await count("attendance")).toBe(0);
  });
  it("rejects batch and direct changes to a cancelled session", async () => {
    await as(ids.coach);
    await save();
    await db.query("update public.events set status='cancelled' where id=$1", [
      ids.event,
    ]);
    await db.exec("savepoint cancelled_save");
    await expect(save([change(ids.child, "absent", 1)])).rejects.toMatchObject({
      code: "42501",
    });
    await db.exec("rollback to savepoint cancelled_save");
    await expect(
      db.query(
        "update public.attendance set status='absent' where event_id=$1",
        [ids.event],
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it.each([
    [change(), change()],
    [change(ids.child, "excused", 0, "x".repeat(201))],
    [change(ids.child, "present", 0, "Reason on wrong status")],
    [],
  ])("rejects invalid or duplicated batch input", async (...changes) => {
    await as(ids.coach);
    await expect(save(changes)).rejects.toMatchObject({ code: "22023" });
  });
});

describe("internal player and training notes", () => {
  async function addNote(
    player: string | null = ids.child,
    event: string | null = null,
    body = "Precvičiť príjem podania.",
  ) {
    return (
      await db.query<{
        id: string;
        body: string;
        version: number;
        author_id: string;
        author_name: string;
      }>(
        "insert into public.internal_notes(player_id,event_id,body) values($1,$2,$3) returning *",
        [player, event, body],
      )
    ).rows[0];
  }
  async function page(
    player: string | null = ids.child,
    event: string | null = null,
    cursor?: { created_at: string; id: string },
  ) {
    return notesPageSchema.parse(
      (
        await db.query<{ data: unknown }>(
          "select public.internal_notes_page($1,$2,$3,$4) as data",
          [player, event, cursor?.created_at ?? null, cursor?.id ?? null],
        )
      ).rows[0].data,
    );
  }

  it("creates both contexts with server authorship, records corrections and rejects stale edits", async () => {
    await as(ids.coach);
    const note = await addNote();
    await addNote(null, ids.event);
    expect(note).toMatchObject({
      author_id: ids.coach,
      author_name: "Fixture coach",
      version: 1,
    });
    expect((await page()).items[0].can_edit).toBe(true);
    expect((await page(null, ids.event)).items).toHaveLength(1);
    const updated = await db.query<{ version: number }>(
      "update public.internal_notes set body='Upravený tréningový cieľ.' where id=$1 and version=1 returning version",
      [note.id],
    );
    expect(updated.rows[0].version).toBe(2);
    expect(
      (
        await db.query(
          "update public.internal_notes set body='Stará verzia' where id=$1 and version=1 returning id",
          [note.id],
        )
      ).rows,
    ).toHaveLength(0);
    expect(await count("audit_logs")).toBe(0);
    await as(ids.admin);
    await db.query(
      "update public.internal_notes set body='Oprava správcom.' where id=$1",
      [note.id],
    );
    const audit = await db.query<{ old_body: string; new_body: string }>(
      "select old_data->>'body' as old_body,new_data->>'body' as new_body from public.audit_logs where table_name='internal_notes' and record_id=$1 and operation='UPDATE' order by created_at,id",
      [note.id],
    );
    expect(audit.rows).toHaveLength(2);
    expect(
      audit.rows.some(
        (r) =>
          r.old_body === "Upravený tréningový cieľ." &&
          r.new_body === "Oprava správcom.",
      ),
    ).toBe(true);
  });

  it.each(["child", "parent", "stranger", "inactive"] as const)(
    "hides notes from %s, including direct RPC reads",
    async (role) => {
      await as(ids.coach);
      await addNote();
      await addNote(null, ids.event);
      await as(ids[role]);
      expect(await count("internal_notes")).toBe(0);
      expect(await page()).toEqual({
        can_write: false,
        items: [],
        has_more: false,
      });
      expect((await page(null, ids.event)).items).toHaveLength(0);
    },
  );

  it.each(["child", "parent", "stranger", "inactive"] as const)(
    "rejects writes by %s",
    async (role) => {
      await as(ids[role]);
      await expect(addNote()).rejects.toThrow();
    },
  );

  it("allows other assigned coaches to read, but only the author or admin can edit", async () => {
    await as(ids.coach);
    const note = await addNote();
    await as(ids.admin);
    await db.query("insert into public.user_roles values($1,'coach')", [
      ids.adult,
    ]);
    await db.query(
      "insert into public.team_memberships values($1,$2,'coach')",
      [ids.team, ids.adult],
    );
    await as(ids.adult);
    expect((await page()).items[0].can_edit).toBe(false);
    expect(
      (
        await db.query(
          "update public.internal_notes set body='Cudzia úprava' where id=$1 returning id",
          [note.id],
        )
      ).rows,
    ).toHaveLength(0);
    expect((await page()).items[0].body).toBe(note.body);
  });

  it.each(["membership", "role", "active"] as const)(
    "revokes the author's access immediately after changing %s",
    async (change) => {
      await as(ids.coach);
      const note = await addNote();
      await addNote(null, ids.event);
      await as(ids.admin);
      if (change === "membership")
        await db.query(
          "delete from public.team_memberships where profile_id=$1",
          [ids.coach],
        );
      if (change === "role")
        await db.query("delete from public.user_roles where profile_id=$1", [
          ids.coach,
        ]);
      if (change === "active")
        await db.query("update public.profiles set active=false where id=$1", [
          ids.coach,
        ]);
      await as(ids.coach);
      expect((await page()).can_write).toBe(false);
      expect(await count("internal_notes")).toBe(0);
      expect(
        (
          await db.query(
            "update public.internal_notes set body='Stratený prístup' where id=$1 returning id",
            [note.id],
          )
        ).rows,
      ).toHaveLength(0);
    },
  );

  it("denies a coach access to unrelated players and teams", async () => {
    await as(ids.admin);
    await addNote(ids.stranger);
    await addNote(null, ids.otherEvent);
    await as(ids.coach);
    expect((await page(ids.stranger)).can_write).toBe(false);
    expect((await page(null, ids.otherEvent)).items).toHaveLength(0);
    await expect(addNote(ids.stranger)).rejects.toThrow();
  });

  it.each(["body-empty", "body-long", "both", "neither", "nonplayer", "match"])(
    "rejects invalid context/content: %s",
    async (scenario) => {
      await as(ids.admin);
      if (scenario === "match")
        await db.query("update public.events set kind='match' where id=$1", [
          ids.event,
        ]);
      await expect(
        addNote(
          scenario === "neither" || scenario === "match"
            ? null
            : scenario === "nonplayer"
              ? ids.coach
              : ids.child,
          scenario === "both" || scenario === "match" ? ids.event : null,
          scenario === "body-empty"
            ? " \n\t "
            : scenario === "body-long"
              ? "x".repeat(4001)
              : "Poznámka",
        ),
      ).rejects.toThrow();
    },
  );

  it.each([
    "player_id",
    "event_id",
    "author_id",
    "version",
    "created_at",
    "author_name",
  ])("protects note provenance: %s", async (column) => {
    await as(ids.coach);
    const note = await addNote();
    await expect(
      db.query(
        `update public.internal_notes set ${column}=${column} where id=$1`,
        [note.id],
      ),
    ).rejects.toThrow();
  });

  it("cannot forge an author or erase a note, even as admin", async () => {
    await as(ids.admin);
    expect(
      (
        await db.query<{ allowed: boolean }>(
          "select has_table_privilege('authenticated','public.internal_notes','DELETE') as allowed",
        )
      ).rows[0].allowed,
    ).toBe(false);
    await expect(
      db.query(
        "insert into public.internal_notes(player_id,body,author_id) values($1,'Falošný autor',$2)",
        [ids.child, ids.coach],
      ),
    ).rejects.toThrow();
  });

  it("paginates all notes with bounded pages and no duplicates", async () => {
    await as(ids.coach);
    await db.query(
      "insert into public.internal_notes(player_id,body) select $1,'Poznámka '||n from generate_series(1,27) n",
      [ids.child],
    );
    const first = await page();
    expect(first.items).toHaveLength(25);
    expect(first.has_more).toBe(true);
    const second = await page(ids.child, null, first.items.at(-1));
    expect(second.items).toHaveLength(2);
    expect(second.has_more).toBe(false);
    expect(
      new Set([...first.items, ...second.items].map((n) => n.id)).size,
    ).toBe(27);
  });

  it("does not expose notes or helper RPCs to anonymous users", async () => {
    const permissions = await db.query<{ allowed: boolean }>(
      "select has_function_privilege('anon',p.oid,'execute') as allowed from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname in ('can_access_internal_notes','internal_notes_page','guard_internal_note')",
    );
    expect(permissions.rows.every((r) => !r.allowed)).toBe(true);
    await db.exec("set role anon");
    await expect(
      db.query("select * from public.internal_notes"),
    ).rejects.toThrow();
  });
});

describe("player dashboard response reads", () => {
  async function upcomingFor(profileId: string) {
    // Same bounded, caller-RLS reads as the server dashboard; no privileged RPC.
    const events = (
      await db.query<{ id: string; team_id: string; status: string }>(
        "select id,team_id,status from public.events where status='scheduled' and starts_at >= '2026-10-01' order by starts_at,id limit 5",
      )
    ).rows;
    const memberships = (
      await db.query<{ team_id: string }>(
        "select team_id from public.team_memberships where profile_id=$1 and kind='player' and team_id=any($2::uuid[])",
        [profileId, events.map((e) => e.team_id)],
      )
    ).rows;
    const responses = (
      await db.query(
        "select event_id,response from public.availability where player_id=$1 and event_id=any($2::uuid[])",
        [profileId, events.map((e) => e.id)],
      )
    ).rows;
    return withPlayerResponses(
      events,
      memberships.map((m) => m.team_id),
      playerResponsesSchema.parse(responses),
    );
  }

  it("shows a player's own answer without confusing it with a sibling's answer", async () => {
    await as(ids.sibling);
    await db.query(
      "insert into public.availability(event_id,player_id,response) values($1,$2,'no')",
      [ids.event, ids.sibling],
    );
    await as(ids.child);
    expect(await upcomingFor(ids.child)).toEqual([
      {
        id: ids.event,
        team_id: ids.team,
        status: "scheduled",
        own_response: "pending",
      },
    ]);
    await db.query(
      "insert into public.availability(event_id,player_id,response) values($1,$2,'maybe')",
      [ids.event, ids.child],
    );
    expect((await upcomingFor(ids.child))[0].own_response).toBe("maybe");
  });

  it("scopes combined coach/player roles and immediately respects revocation and deactivation", async () => {
    await as(ids.admin);
    await db.query("insert into public.user_roles values($1,'player')", [
      ids.coach,
    ]);
    await db.query(
      "insert into public.team_memberships values($1,$2,'player')",
      [ids.other, ids.coach],
    );
    await as(ids.coach);
    await db.query(
      "insert into public.availability(event_id,player_id,response) values($1,$2,'yes')",
      [ids.otherEvent, ids.coach],
    );
    await as(ids.coach);
    const combined = await upcomingFor(ids.coach);
    expect(
      combined.find((e) => e.id === ids.event)?.own_response,
    ).toBeUndefined();
    expect(combined.find((e) => e.id === ids.otherEvent)?.own_response).toBe(
      "yes",
    );
    await as(ids.admin);
    await db.query(
      "delete from public.team_memberships where profile_id=$1 and kind='player'",
      [ids.coach],
    );
    await as(ids.coach);
    expect(await upcomingFor(ids.coach)).toEqual([
      {
        id: ids.event,
        team_id: ids.team,
        status: "scheduled",
        own_response: undefined,
      },
    ]);
    await as(ids.admin);
    await db.query("update public.profiles set active=false where id=$1", [
      ids.coach,
    ]);
    await as(ids.coach);
    expect(await upcomingFor(ids.coach)).toEqual([]);
  });
});

describe("PostgreSQL row-level authorization", () => {
  const family = async (after: string | null = null) =>
    guardianDashboardSchema.parse(
      (
        await db.query<{ data: unknown }>(
          "select public.guardian_dashboard('2026-12-01'::timestamptz,$1) as data",
          [after],
        )
      ).rows[0].data,
    );
  it("shows each child's own event, response, attendance and corrected balance", async () => {
    await as(ids.admin);
    await db.query(
      "insert into public.payments(charge_id,amount_cents,note) values($1,1500,'Partial payment')",
      [ids.charge],
    );
    await db.query(
      "insert into public.charge_adjustments(charge_id,new_total_cents,note) values($1,4500,'Corrected fee')",
      [ids.charge],
    );
    await db.query(
      "insert into public.attendance(event_id,player_id,status) values($1,$2,'present')",
      [ids.event, ids.child],
    );
    await as(ids.parent);
    await db.query(
      "insert into public.availability(event_id,player_id,response) values($1,$2,'yes')",
      [ids.event, ids.child],
    );
    const result = await family();
    expect(result.total).toBe(2);
    expect(result.items[0]).toMatchObject({
      id: ids.child,
      remaining: 3000,
      attendance: { recorded: 1, present: 1 },
      next_event: { id: ids.event, response: "yes" },
    });
    expect(result.items[1]).toMatchObject({
      id: ids.sibling,
      remaining: 0,
      attendance: { recorded: 0, present: 0 },
      next_event: { id: ids.event, response: null },
    });
  });
  it.each(["coach", "child", "stranger", "admin", "inactive"] as const)(
    "does not expose guardian summaries to unrelated %s",
    async (role) => {
      await as(ids[role]);
      expect(await family()).toEqual({ items: [], has_more: false, total: 0 });
    },
  );
  it("revokes a family summary immediately when a relationship is removed", async () => {
    await as(ids.parent);
    expect((await family()).total).toBe(2);
    await as(ids.admin);
    await db.query(
      "delete from public.guardian_players where guardian_id=$1 and player_id=$2",
      [ids.parent, ids.child],
    );
    await as(ids.parent);
    expect((await family()).items.map((c) => c.id)).toEqual([ids.sibling]);
  });
  it("excludes inactive children and cancelled events without losing empty histories", async () => {
    await as(ids.admin);
    await db.query("update public.profiles set active=false where id=$1", [
      ids.child,
    ]);
    await db.query("update public.events set status='cancelled' where id=$1", [
      ids.event,
    ]);
    await as(ids.parent);
    const result = await family();
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: ids.sibling,
      next_event: null,
      remaining: 0,
      attendance: { recorded: 0, present: 0 },
    });
  });
  it("paginates family links without duplicate or missing children", async () => {
    await as(ids.admin);
    await db.exec(`insert into public.profiles(id,full_name) select ('00000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,'Extra child' from generate_series(100,106) n;
      insert into public.user_roles(profile_id,role) select id,'player' from public.profiles where full_name='Extra child';
      insert into public.guardian_players(guardian_id,player_id) select '${ids.parent}',id from public.profiles where full_name='Extra child';`);
    await as(ids.parent);
    const first = await family();
    const second = await family(first.items.at(-1)!.id);
    const third = await family(second.items.at(-1)!.id);
    expect([
      first.items.length,
      second.items.length,
      third.items.length,
    ]).toEqual([4, 4, 1]);
    expect([first.has_more, second.has_more, third.has_more]).toEqual([
      true,
      true,
      false,
    ]);
    expect(
      new Set(
        [...first.items, ...second.items, ...third.items].map((c) => c.id),
      ).size,
    ).toBe(9);
    expect(third.total).toBe(9);
  });
  it("keeps a coach-parent scoped to their own children", async () => {
    await as(ids.admin);
    await db.query(
      "insert into public.user_roles(profile_id,role) values($1,'coach')",
      [ids.parent],
    );
    await db.query(
      "insert into public.team_memberships(team_id,profile_id,kind) values($1,$2,'coach')",
      [ids.other, ids.parent],
    );
    await as(ids.parent);
    expect((await family()).items.map((c) => c.id)).toEqual([
      ids.child,
      ids.sibling,
    ]);
  });
  it("paginates more than 1,000 plans without losing duplicate names", async () => {
    await as(ids.admin);
    await db.exec(
      "insert into public.fee_plans(name,amount_cents) select 'Same name',3500 from generate_series(1,1001)",
    );
    const seen = new Set<string>();
    let after: string | null = null;
    while (true) {
      const result: { rows: { id: string }[] } = await db.query(
        "select id from public.fee_plans where not archived and ($1::uuid is null or id > $1) order by id limit 26",
        [after],
      );
      for (const item of result.rows.slice(0, 25)) {
        expect(seen.has(item.id)).toBe(false);
        seen.add(item.id);
      }
      if (result.rows.length <= 25) break;
      after = result.rows[24].id;
    }
    expect(seen.size).toBe(1001);
  });
  it("keeps issued amounts and periods intact after audited plan edits and archival", async () => {
    await as(ids.admin);
    await db.query(
      "insert into public.fee_plans(id,name,amount_cents) values($1,'Season',3500)",
      [uid(90)],
    );
    await db.query(
      "insert into public.charges(id,player_id,plan_id,label,amount_cents,due_date,period_start,period_end) values($1,$2,$3,'Season',3500,'2026-10-15','2026-09-01','2027-06-30')",
      [uid(91), ids.child, uid(90)],
    );
    await db.query(
      "update public.fee_plans set name='Updated season',amount_cents=4000,archived=true where id=$1",
      [uid(90)],
    );
    const charge = (
      await db.query<{ amount_cents: number; period: string }>(
        "select amount_cents,period_start::text as period from public.charges where id=$1",
        [uid(91)],
      )
    ).rows[0];
    expect(charge).toEqual({ amount_cents: 3500, period: "2026-09-01" });
    expect(
      (
        await db.query(
          "select id from public.audit_logs where table_name='fee_plans' and operation='UPDATE'",
        )
      ).rows,
    ).toHaveLength(1);
    await as(ids.parent);
    expect(
      (
        await db.query("select period_start from public.charges where id=$1", [
          uid(91),
        ])
      ).rows,
    ).toHaveLength(1);
    await as(ids.coach);
    expect(await count("fee_plans")).toBe(0);
    expect(
      (await db.query("select id from public.charges where id=$1", [uid(91)]))
        .rows,
    ).toHaveLength(0);
  });
  it("rejects issuance against an archived plan", async () => {
    await as(ids.admin);
    await db.query(
      "insert into public.fee_plans(id,name,amount_cents,archived) values($1,'Archived',3500,true)",
      [uid(90)],
    );
    await expect(
      db.query(
        "insert into public.charges(player_id,plan_id,label,amount_cents,due_date) values($1,$2,'Season',3500,'2026-10-15')",
        [ids.child, uid(90)],
      ),
    ).rejects.toThrow();
  });
  it("allows restored plans to be assigned again", async () => {
    await as(ids.admin);
    await db.query(
      "insert into public.fee_plans(id,name,amount_cents,archived) values($1,'Restored',3500,true)",
      [uid(90)],
    );
    await db.query("update public.fee_plans set archived=false where id=$1", [
      uid(90),
    ]);
    await db.query(
      "insert into public.charges(player_id,plan_id,label,amount_cents,due_date) values($1,$2,'Season',3500,'2026-10-15')",
      [ids.child, uid(90)],
    );
  });
  it.each([
    [null, "2026-10-31"],
    ["2026-10-01", null],
    ["2026-11-01", "2026-10-31"],
    ["2026-10-01", "infinity"],
  ])("rejects invalid database period %s to %s", async (start, end) => {
    await as(ids.admin);
    await expect(
      db.query(
        "insert into public.charges(player_id,label,amount_cents,due_date,period_start,period_end) values($1,'Season',3500,'2026-10-15',$2,$3)",
        [ids.child, start, end],
      ),
    ).rejects.toThrow();
  });
  it.each(["coach", "parent", "inactive"] as const)(
    "denies plan mutation to %s",
    async (role) => {
      await as(ids.admin);
      await db.query(
        "insert into public.fee_plans(id,name,amount_cents) values($1,'Season',3500)",
        [uid(90)],
      );
      await as(ids[role]);
      expect(
        (
          await db.query(
            "update public.fee_plans set archived=true where id=$1 returning id",
            [uid(90)],
          )
        ).rows,
      ).toHaveLength(0);
      await expect(
        db.query(
          "insert into public.fee_plans(name,amount_cents) values('Unauthorized',3500)",
        ),
      ).rejects.toThrow();
    },
  );
  const reminderCount = async () =>
    Number(
      (
        await db.query<{ n: number }>(
          "select count(*) as n from public.notifications where reminder_event_id is not null",
        )
      ).rows[0].n,
    );
  const soon = async () => {
    await as(ids.admin);
    await db.query(
      "update public.events set starts_at=now()+interval '1 hour',ends_at=now()+interval '2 hours' where id=$1",
      [ids.event],
    );
  };
  const eventRoster = async (
    event = ids.event,
    name: string | null = null,
    id: string | null = null,
  ) =>
    eventRosterSchema.parse(
      (
        await db.query<{ value: unknown }>(
          "select public.event_roster_page($1,'',$2,$3) as value",
          [event, name, id],
        )
      ).rows[0].value,
    );
  const calendar = async (
    player: string | null = null,
    at: string | null = null,
    id: string | null = null,
  ) =>
    calendarPageSchema.parse(
      (
        await db.query<{ value: unknown }>(
          "select public.calendar_page('2026-10-01','2027-01-01',null,null,$1,$2,$3) as value",
          [player, at, id],
        )
      ).rows[0].value,
    );
  it("coaches create deduplicated in-app reminders only for pending players and guardians", async () => {
    await soon();
    await as(ids.coach);
    expect(
      (
        await db.query<{ n: number }>(
          "select public.send_event_reminders($1) as n",
          [ids.event],
        )
      ).rows[0].n,
    ).toBe(4);
    expect(
      (
        await db.query<{ n: number }>(
          "select public.send_event_reminders($1) as n",
          [ids.event],
        )
      ).rows[0].n,
    ).toBe(0);
    expect(await reminderCount()).toBe(0);
    await as(ids.parent);
    expect(await reminderCount()).toBe(2);
    await as(ids.child);
    expect(await reminderCount()).toBe(1);
    await as(ids.stranger);
    expect(await reminderCount()).toBe(0);
  });
  it("self-refresh cannot fan out reminders to other accounts", async () => {
    await soon();
    await as(ids.child);
    expect(
      (
        await db.query<{ n: number }>(
          "select public.refresh_my_reminders() as n",
        )
      ).rows[0].n,
    ).toBe(1);
    await as(ids.parent);
    expect(await reminderCount()).toBe(0);
    expect(
      (
        await db.query<{ n: number }>(
          "select public.refresh_my_reminders() as n",
        )
      ).rows[0].n,
    ).toBe(2);
    expect(
      (
        await db.query<{ n: number }>(
          "select public.refresh_my_reminders() as n",
        )
      ).rows[0].n,
    ).toBe(0);
  });
  it("responses and family-link revocation immediately hide reminders", async () => {
    await soon();
    await as(ids.parent);
    await db.query("select public.refresh_my_reminders()");
    await db.query(
      "insert into public.availability(event_id,player_id,response) values($1,$2,'no')",
      [ids.event, ids.child],
    );
    expect(await reminderCount()).toBe(1);
    await as(ids.admin);
    await db.query(
      "delete from public.guardian_players where guardian_id=$1 and player_id=$2",
      [ids.parent, ids.sibling],
    );
    await as(ids.parent);
    expect(await reminderCount()).toBe(0);
  });
  it("cancelled and distant events do not produce actionable reminders", async () => {
    await soon();
    await as(ids.parent);
    await db.query("select public.refresh_my_reminders()");
    await as(ids.admin);
    await db.query("update public.events set status='cancelled' where id=$1", [
      ids.event,
    ]);
    await as(ids.parent);
    expect(await reminderCount()).toBe(0);
    await as(ids.admin);
    await db.query(
      "update public.events set status='scheduled',starts_at=now()+interval '4 days',ends_at=now()+interval '4 days 1 hour' where id=$1",
      [ids.event],
    );
    expect(
      (
        await db.query<{ n: number }>(
          "select public.send_event_reminders($1) as n",
          [ids.event],
        )
      ).rows[0].n,
    ).toBe(0);
  });
  it("unassigned coaches cannot send another team's reminders", async () => {
    await as(ids.coach);
    await expect(
      db.query("select public.send_event_reminders($1)", [ids.otherEvent]),
    ).rejects.toThrow("Event management required");
  });
  it("inactive accounts cannot refresh and application roles cannot invoke the bulk worker", async () => {
    expect(
      (
        await db.query<{ allowed: boolean }>(
          "select has_function_privilege('authenticated','private.generate_pending_reminders(uuid,uuid,timestamptz)','execute') as allowed",
        )
      ).rows[0].allowed,
    ).toBe(false);
    expect(
      (
        await db.query<{ allowed: boolean }>(
          "select has_function_privilege('anon','public.refresh_my_reminders()','execute') as allowed",
        )
      ).rows[0].allowed,
    ).toBe(false);
    await as(ids.inactive);
    await expect(
      db.query("select public.refresh_my_reminders()"),
    ).rejects.toThrow("Active account required");
  });
  it("event rosters and calendar response counts respect each viewer", async () => {
    await as(ids.parent);
    await db.query(
      "insert into public.availability(event_id,player_id,response) values($1,$2,'yes')",
      [ids.event, ids.child],
    );
    expect((await eventRoster()).items).toHaveLength(2);
    expect((await eventRoster()).can_manage).toBe(false);
    expect((await calendar(ids.child)).items[0]).toMatchObject({
      participant_count: 1,
      pending_count: 0,
    });
    expect((await calendar(ids.stranger)).items).toHaveLength(0);
    await as(ids.coach);
    expect((await eventRoster()).can_manage).toBe(true);
    expect((await eventRoster()).items.every((p) => !p.can_respond)).toBe(true);
    expect((await calendar()).items[0]).toMatchObject({
      participant_count: 2,
      pending_count: 1,
    });
    expect((await eventRoster(ids.otherEvent)).items).toHaveLength(0);
    await as(ids.child);
    expect((await eventRoster()).items).toHaveLength(1);
  });
  it("contact views allow linked guardians and assigned coaches but reject unrelated users", async () => {
    await as(ids.admin);
    await db.query(
      "update public.member_details set email='fixture@example.invalid',phone='0900000000' where profile_id=$1",
      [ids.child],
    );
    for (const viewer of [ids.parent, ids.coach, ids.child]) {
      await as(viewer);
      expect(
        (
          await db.query(
            "select email,phone from public.member_details where profile_id=$1",
            [ids.child],
          )
        ).rows,
      ).toHaveLength(1);
    }
    await as(ids.stranger);
    expect(
      (
        await db.query(
          "select email,phone from public.member_details where profile_id=$1",
          [ids.child],
        )
      ).rows,
    ).toHaveLength(0);
  });
  const announcementNotifications = async (id: string) =>
    Number(
      (
        await db.query<{ n: number }>(
          "select count(*) as n from public.notifications where announcement_id=$1",
          [id],
        )
      ).rows[0].n,
    );
  const activity = async (
    player: string | null = null,
    status: string | null = null,
    at: string | null = null,
    event: string | null = null,
    cursorPlayer: string | null = null,
  ) =>
    attendancePageSchema.parse(
      (
        await db.query<{ value: unknown }>(
          "select public.attendance_page('', $1,$2,$3,$4,$5) as value",
          [player, status, at, event, cursorPlayer],
        )
      ).rows[0].value,
    );
  const announcements = async (
    archived = false,
    important: boolean | null = null,
    at: string | null = null,
    id: string | null = null,
  ) =>
    announcementPageSchema.parse(
      (
        await db.query<{ value: unknown }>(
          "select public.announcement_page('', $1,$2,$3,$4) as value",
          [archived, important, at, id],
        )
      ).rows[0].value,
    );
  const options = async (
    kind: string,
    query = "",
    afterLabel: string | null = null,
    afterId: string | null = null,
  ) =>
    selectorResult.parse(
      (
        await db.query<{ value: unknown }>(
          "select public.selector_options($1,$2,$3,$4,null) as value",
          [kind, query, afterLabel, afterId],
        )
      ).rows[0].value,
    );
  it("attendance filters, full totals and pagination preserve guardian scope", async () => {
    await as(ids.admin);
    await db.query(
      "insert into public.attendance(event_id,player_id,status) values($1,$2,'present'),($1,$3,'absent'),($4,$5,'excused')",
      [ids.event, ids.child, ids.sibling, ids.otherEvent, ids.stranger],
    );
    await as(ids.parent);
    expect(await activity()).toMatchObject({
      total: 2,
      present: 1,
      absent: 1,
      excused: 0,
    });
    expect((await activity(ids.stranger)).total).toBe(0);
    expect((await activity(null, "present")).total).toBe(1);
    await as(ids.child);
    expect((await activity()).total).toBe(1);
    await as(ids.inactive);
    expect((await activity()).total).toBe(0);
  });
  it("announcement pages preserve priority and traverse equal timestamps into ordinary notices", async () => {
    await as(ids.admin);
    await db.query(
      "insert into public.announcements(title,body,author_id,important) select 'Dôležitý oznam','Text oznamu',$1,true from generate_series(1,26)",
      [ids.admin],
    );
    await db.query(
      "insert into public.announcements(title,body,author_id,important) values('Bežný oznam','Text oznamu',$1,false)",
      [ids.admin],
    );
    const first = await announcements();
    expect(first.items).toHaveLength(25);
    expect(first.items.every((a) => a.important)).toBe(true);
    const last = first.items.at(-1)!;
    const next = await announcements(
      false,
      last.important,
      last.created_at,
      last.id,
    );
    expect(next.items.map((a) => a.important)).toEqual([true, false]);
    expect(next.has_more).toBe(false);
    expect(next.items.some((a) => first.items.some((b) => a.id === b.id))).toBe(
      false,
    );
    await db.query(
      "update public.announcements set archived=true where id=$1",
      [last.id],
    );
    expect((await announcements(true)).items).toHaveLength(1);
  });
  it("multi-team audiences notify relevant guardians and revoke access with memberships", async () => {
    await as(ids.admin);
    const result = await db.query<{ id: string }>(
      "insert into public.announcements(title,body,author_id,team_id,extra_team_ids) values('Viac tímov','Pokyny pre tímy',$1,$2,array[$3]::uuid[]) returning id",
      [ids.admin, ids.team, ids.other],
    );
    await as(ids.parent);
    expect((await announcements()).items).toHaveLength(1);
    expect(await announcementNotifications(result.rows[0].id)).toBe(1);
    await as(ids.stranger);
    expect((await announcements()).items).toHaveLength(1);
    await as(ids.admin);
    await db.query(
      "update public.announcements set extra_team_ids='{}' where id=$1",
      [result.rows[0].id],
    );
    await as(ids.stranger);
    expect((await announcements()).items).toHaveLength(0);
    expect(await announcementNotifications(result.rows[0].id)).toBe(0);
    await as(ids.parent);
    expect(await announcementNotifications(result.rows[0].id)).toBe(1);
  });
  it("specific recipients are private and audience edits notify only newly authorized members", async () => {
    await as(ids.admin);
    const result = await db.query<{ id: string }>(
      "insert into public.announcements(title,body,author_id,recipient_ids) values('Súkromné pokyny','Pokyny pre rodiča',$1,array[$2]::uuid[]) returning id",
      [ids.admin, ids.parent],
    );
    await as(ids.child);
    expect((await announcements()).items).toHaveLength(0);
    expect(await announcementNotifications(result.rows[0].id)).toBe(0);
    await as(ids.parent);
    expect((await announcements()).items).toHaveLength(1);
    expect(await announcementNotifications(result.rows[0].id)).toBe(1);
    await as(ids.admin);
    await db.query(
      "update public.announcements set recipient_ids=array[$1]::uuid[] where id=$2",
      [ids.adult, result.rows[0].id],
    );
    await as(ids.parent);
    expect(await announcementNotifications(result.rows[0].id)).toBe(0);
    await as(ids.adult);
    expect((await announcements()).items).toHaveLength(1);
    expect(await announcementNotifications(result.rows[0].id)).toBe(1);
  });
  it.each(["extra-team", "people"])(
    "coach cannot publish unauthorized audience %s",
    async (kind) => {
      await as(ids.coach);
      const sql =
        kind === "extra-team"
          ? "insert into public.announcements(title,body,author_id,team_id,extra_team_ids) values('Neoprávnený oznam','Text oznamu',$1,$2,array[$3]::uuid[])"
          : "insert into public.announcements(title,body,author_id,recipient_ids) values('Neoprávnený oznam','Text oznamu',$1,array[$3]::uuid[])";
      // Keep each query's parameter count explicit.
      if (kind === "people")
        await expect(
          db.query(
            "insert into public.announcements(title,body,author_id,recipient_ids) values('Neoprávnený oznam','Text oznamu',$1,array[$2]::uuid[])",
            [ids.coach, ids.parent],
          ),
        ).rejects.toThrow();
      else
        await expect(
          db.query(sql, [ids.coach, ids.team, ids.other]),
        ).rejects.toThrow();
    },
  );
  it("coach can publish across all assigned teams but a partial-scope coach cannot edit it", async () => {
    await as(ids.admin);
    await db.query(
      "insert into public.team_memberships(team_id,profile_id,kind) values($1,$2,'coach')",
      [ids.other, ids.coach],
    );
    await as(ids.coach);
    const r = await db.query<{ id: string }>(
      "insert into public.announcements(title,body,author_id,team_id,extra_team_ids) values('Spoločný oznam','Pokyny pre tímy',$1,$2,array[$3]::uuid[]) returning id",
      [ids.coach, ids.team, ids.other],
    );
    expect((await announcements()).items[0].can_manage).toBe(true);
    await as(ids.admin);
    await db.query(
      "delete from public.team_memberships where profile_id=$1 and team_id=$2",
      [ids.coach, ids.other],
    );
    await as(ids.coach);
    expect((await announcements()).items[0].can_manage).toBe(false);
    expect(
      (
        await db.query(
          "update public.announcements set title='Zmena' where id=$1 returning id",
          [r.rows[0].id],
        )
      ).rows,
    ).toHaveLength(0);
  });
  it("selector search is role-scoped and includes no unrelated members or financial plans", async () => {
    await as(ids.parent);
    expect((await options("players")).items.map((p) => p.id).sort()).toEqual(
      [ids.child, ids.sibling].sort(),
    );
    expect((await options("members", "stranger")).items).toHaveLength(0);
    await as(ids.coach);
    expect((await options("managed-teams")).items.map((t) => t.id)).toEqual([
      ids.team,
    ]);
    expect((await options("plans")).items).toHaveLength(0);
    await as(ids.inactive);
    expect((await options("members")).items).toHaveLength(0);
  });
  it("charge correction keeps original evidence, stamps the actor and updates financial totals", async () => {
    await as(ids.admin);
    await db.query(
      "insert into public.charge_adjustments(charge_id,new_total_cents,delta_cents,note,recorded_by) values($1,3000,999,'Oprava predpisu',$2)",
      [ids.charge, ids.coach],
    );
    const correction = (
      await db.query<{ delta_cents: number; recorded_by: string }>(
        "select delta_cents,recorded_by from public.charge_adjustments",
      )
    ).rows[0];
    expect(correction).toEqual({ delta_cents: -2000, recorded_by: ids.admin });
    expect(
      (
        await db.query<{ amount_cents: number }>(
          "select amount_cents from public.charges where id=$1",
          [ids.charge],
        )
      ).rows[0].amount_cents,
    ).toBe(5000);
    expect(
      (
        await db.query(
          "select id from public.audit_logs where table_name='charge_adjustments' and operation='INSERT'",
        )
      ).rows,
    ).toHaveLength(1);
    await as(ids.parent);
    expect((await summary()).remaining).toBe(3000);
    expect((await chargePage()).items[0].amount_cents).toBe(3000);
    expect(await count("charge_adjustments")).toBe(1);
    await as(ids.coach);
    expect(await count("charge_adjustments")).toBe(0);
  });
  it("charge correction cannot reduce below payments already received", async () => {
    await as(ids.admin);
    await db.query(
      "insert into public.payments(charge_id,amount_cents,note) values($1,2500,'Prijatá úhrada')",
      [ids.charge],
    );
    await expect(
      db.query(
        "insert into public.charge_adjustments(charge_id,new_total_cents,note) values($1,2000,'Príliš nízka suma')",
        [ids.charge],
      ),
    ).rejects.toThrow("Reverse excess payments");
  });
  it("corrected charge caps new payments and can be cancelled after reversal", async () => {
    await as(ids.admin);
    await db.query(
      "insert into public.charge_adjustments(charge_id,new_total_cents,note) values($1,3000,'Zníženie predpisu')",
      [ids.charge],
    );
    const p = await db.query<{ id: string }>(
      "insert into public.payments(charge_id,amount_cents,note) values($1,3000,'Prijatá úhrada') returning id",
      [ids.charge],
    );
    await db.exec("savepoint excess");
    await expect(
      db.query(
        "insert into public.payments(charge_id,amount_cents,note) values($1,1,'Preplatok')",
        [ids.charge],
      ),
    ).rejects.toThrow("Payment exceeds");
    await db.exec("rollback to savepoint excess");
    await db.query(
      "insert into public.payments(charge_id,amount_cents,note,reverses_id) values($1,-3000,'Storno úhrady',$2)",
      [ids.charge, p.rows[0].id],
    );
    await db.query(
      "insert into public.charge_adjustments(charge_id,new_total_cents,note) values($1,0,'Zrušenie predpisu')",
      [ids.charge],
    );
    expect(await summary(ids.charge)).toMatchObject({
      charged: 0,
      paid: 0,
      remaining: 0,
    });
  });
  it.each(["update", "delete"])(
    "even administrators cannot %s correction evidence",
    async (operation) => {
      await as(ids.admin);
      await db.query(
        "insert into public.charge_adjustments(charge_id,new_total_cents,note) values($1,4000,'Oprava sumy')",
        [ids.charge],
      );
      await expect(
        db.exec(
          operation === "update"
            ? "update public.charge_adjustments set note='Zmenená poznámka'"
            : "delete from public.charge_adjustments",
        ),
      ).rejects.toThrow("permission denied");
    },
  );
  it("parents cannot issue financial corrections", async () => {
    await as(ids.parent);
    await expect(
      db.query(
        "insert into public.charge_adjustments(charge_id,new_total_cents,note) values($1,0,'Neoprávnené zrušenie')",
        [ids.charge],
      ),
    ).rejects.toThrow();
  });
  const dashboard = async () =>
    dashboardSummarySchema.parse(
      (
        await db.query<{ value: unknown }>(
          "select public.dashboard_summary('2026-10-01') as value",
        )
      ).rows[0].value,
    );
  const memberPage = async (
    query = "",
    name: string | null = null,
    id: string | null = null,
  ) =>
    memberPageSchema.parse(
      (
        await db.query<{ value: unknown }>(
          "select public.member_page($1,$2,$3) as value",
          [query, name, id],
        )
      ).rows[0].value,
    );
  const teamPage = async (
    archived = false,
    name: string | null = null,
    id: string | null = null,
  ) =>
    teamPageSchema.parse(
      (
        await db.query<{ value: unknown }>(
          "select public.team_page($1,$2,$3) as value",
          [archived, name, id],
        )
      ).rows[0].value,
    );
  it("dashboard statistics respect each role's live scope", async () => {
    for (const [role, teams, players, events, pending] of [
      [ids.admin, 2, 4, 2, 4],
      [ids.coach, 1, 2, 1, 2],
      [ids.parent, 1, 2, 1, 2],
      [ids.child, 1, 1, 1, 1],
      [ids.adult, 1, 1, 1, 1],
      [ids.inactive, 0, 0, 0, 0],
    ] as const) {
      await as(role);
      expect(await dashboard()).toEqual({
        team_count: teams,
        player_count: players,
        event_count: events,
        pending_count: pending,
        participation: null,
      });
      expect((await teamPage()).items).toHaveLength(teams);
    }
    await as(ids.parent);
    expect((await memberPage("Fixture stranger")).total).toBe(0);
    await as(ids.admin);
    await db.query("delete from public.guardian_players where guardian_id=$1", [
      ids.parent,
    ]);
    await as(ids.parent);
    expect(await dashboard()).toMatchObject({
      team_count: 0,
      player_count: 0,
      event_count: 0,
      pending_count: 0,
    });
  });
  it("dashboard excludes responses, inactive players, revoked roles and cancelled events from pending counts", async () => {
    await as(ids.parent);
    await db.query(
      "insert into public.availability(event_id,player_id,response) values($1,$2,'no')",
      [ids.event, ids.child],
    );
    expect((await dashboard()).pending_count).toBe(1);
    await as(ids.admin);
    await db.query("update public.profiles set active=false where id=$1", [
      ids.sibling,
    ]);
    expect((await dashboard()).pending_count).toBe(2);
    await db.query(
      "delete from public.user_roles where profile_id=$1 and role='player'",
      [ids.stranger],
    );
    expect((await dashboard()).pending_count).toBe(1);
    await db.query("update public.events set status='cancelled' where id=$1", [
      ids.otherEvent,
    ]);
    expect((await dashboard()).pending_count).toBe(0);
  });
  it("dashboard aggregates and directory search include records beyond 1000 rows", async () => {
    await as(ids.admin);
    await db.exec(`
      insert into public.profiles(id,full_name) select ('00000000-0000-4000-8000-' || lpad((10000+n)::text,12,'0'))::uuid,'Bulk player' from generate_series(1,1001) n;
      insert into public.user_roles(profile_id,role) select id,'player' from public.profiles where full_name='Bulk player';
      insert into public.team_memberships(team_id,profile_id,kind) select '${ids.team}',id,'player' from public.profiles where full_name='Bulk player';
      insert into public.teams(name,category) select 'Bulk team','U16' from generate_series(1,1001);
      insert into public.events(id,team_id,title,kind,starts_at,ends_at,venue)
        select ('00000000-0000-4000-8000-' || lpad((20000+n)::text,12,'0'))::uuid,'${ids.team}','Bulk training','training','2026-11-01 16:00Z','2026-11-01 17:00Z','Hala' from generate_series(1,1001) n;
      insert into public.attendance(event_id,player_id,status)
        select ('00000000-0000-4000-8000-' || lpad((20000+n)::text,12,'0'))::uuid,'${ids.child}',case when n<=600 then 'present' else 'absent' end from generate_series(1,1001) n;
    `);
    await as(ids.parent);
    await db.query(
      "insert into public.availability(event_id,player_id,response) values($1,$2,'yes')",
      [uid(20001), ids.child],
    );
    await as(ids.admin);
    expect(await dashboard()).toEqual({
      team_count: 1003,
      player_count: 1005,
      event_count: 1003,
      pending_count: 5014,
      participation: 60,
    });
    const history = await activity();
    expect(history).toMatchObject({ total: 1001, present: 600, absent: 401 });
    expect(history.items).toHaveLength(25);
    const historyLast = history.items.at(-1)!;
    const historyNext = await activity(
      null,
      null,
      historyLast.updated_at,
      historyLast.event_id,
      historyLast.player_id,
    );
    expect(historyNext.items).toHaveLength(25);
    expect(
      historyNext.items.some((r) =>
        history.items.some(
          (f) => r.event_id === f.event_id && r.player_id === f.player_id,
        ),
      ),
    ).toBe(false);
    const choices = await options("players", "Bulk");
    const rosterFirst = await eventRoster();
    expect(rosterFirst.total).toBe(1003);
    expect(rosterFirst.items).toHaveLength(25);
    const rosterTail = await eventRoster(ids.event, "Bulk player", uid(11000));
    expect(rosterTail.items.some((p) => p.profile_id === uid(11001))).toBe(
      true,
    );
    const calendarFirst = await calendar();
    expect(calendarFirst.total).toBe(1003);
    expect(calendarFirst.items).toHaveLength(50);
    const calendarLast = calendarFirst.items.at(-1)!;
    const calendarNext = await calendar(
      null,
      calendarLast.starts_at,
      calendarLast.id,
    );
    expect(calendarNext.items).toHaveLength(50);
    expect(
      calendarNext.items.some((e) =>
        calendarFirst.items.some((f) => e.id === f.id),
      ),
    ).toBe(false);
    const teamRoster = teamRosterSchema.parse(
      (
        await db.query<{ value: unknown }>(
          "select public.team_roster_page($1,'Bulk','Bulk player',$2,'player') as value",
          [ids.team, uid(11000)],
        )
      ).rows[0].value,
    );
    expect(teamRoster.items.map((p) => p.profile_id)).toEqual([uid(11001)]);
    expect(choices.items).toHaveLength(25);
    expect(choices.has_more).toBe(true);
    const choiceTail = await options(
      "players",
      "Bulk",
      "Bulk player",
      uid(11000),
    );
    expect(choiceTail.items.map((p) => p.id)).toEqual([uid(11001)]);
    const first = await memberPage("BULK PLAYER");
    expect(first.total).toBe(1001);
    expect(first.items).toHaveLength(25);
    const last = first.items.at(-1)!;
    const next = await memberPage("BULK PLAYER", last.full_name, last.id);
    expect(next.items).toHaveLength(25);
    expect(next.items.some((p) => first.items.some((f) => f.id === p.id))).toBe(
      false,
    );
    const tail = await memberPage("Bulk player", "Bulk player", uid(11000));
    expect(tail.items.map((p) => p.id)).toEqual([uid(11001)]);
    expect(tail.has_more).toBe(false);
    const teams = await teamPage();
    expect(teams.items).toHaveLength(25);
    const teamLast = teams.items.at(-1)!;
    const teamNext = await teamPage(false, teamLast.name, teamLast.id);
    expect(teamNext.items).toHaveLength(25);
    expect(
      teamNext.items.some((t) => teams.items.some((f) => f.id === t.id)),
    ).toBe(false);
  });
  it("directory search treats punctuation literally and archived teams remain separate", async () => {
    await as(ids.admin);
    await db.query(
      "insert into public.profiles(full_name) values('Hráč %_ Novák')",
    );
    expect((await memberPage("%_")).items.map((p) => p.full_name)).toEqual([
      "Hráč %_ Novák",
    ]);
    expect((await memberPage("no-match")).items).toEqual([]);
    await db.query("update public.teams set archived=true where id=$1", [
      ids.team,
    ]);
    expect((await teamPage()).items.map((t) => t.id)).toEqual([ids.other]);
    expect((await teamPage(true)).items.map((t) => t.id)).toEqual([ids.team]);
    await as(ids.inactive);
    expect((await memberPage()).total).toBe(0);
    expect((await teamPage(true)).items).toEqual([]);
  });
  it("anonymous users cannot execute dashboard or directory endpoints", async () => {
    const result = await db.query<{ allowed: boolean }>(
      "select has_function_privilege('anon',p.oid,'execute') as allowed from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('dashboard_summary','member_page','team_page')",
    );
    expect(result.rows).toEqual([
      { allowed: false },
      { allowed: false },
      { allowed: false },
    ]);
  });
  const summary = async (charge: string | null = null) =>
    financeSummarySchema.parse(
      (
        await db.query<{ value: unknown }>(
          "select public.finance_summary($1) as value",
          [charge],
        )
      ).rows[0].value,
    );
  const chargePage = async (
    due: string | null = null,
    id: string | null = null,
  ) =>
    chargePageSchema.parse(
      (
        await db.query<{ value: unknown }>(
          "select public.charge_page($1,$2) as value",
          [due, id],
        )
      ).rows[0].value,
    );
  const paymentPage = async (
    charge: string,
    at: string | null = null,
    id: string | null = null,
  ) =>
    paymentPageSchema.parse(
      (
        await db.query<{ value: unknown }>(
          "select public.payment_page($1,$2,$3) as value",
          [charge, at, id],
        )
      ).rows[0].value,
    );
  it("financial summaries retain RLS for every role and explicit charge IDs", async () => {
    for (const [role, expected] of [
      [ids.admin, 10000],
      [ids.parent, 5000],
      [ids.adult, 5000],
      [ids.coach, 0],
      [ids.child, 0],
      [ids.stranger, 0],
      [ids.inactive, 0],
    ] as const) {
      await as(role);
      expect((await summary()).charged).toBe(expected);
      expect((await chargePage()).items.length).toBe(expected / 5000);
    }
    await as(ids.parent);
    expect((await summary(ids.otherCharge)).count).toBe(0);
    expect((await paymentPage(ids.otherCharge)).items).toEqual([]);
    await as(ids.admin);
    await db.query("delete from public.guardian_players where guardian_id=$1", [
      ids.parent,
    ]);
    await as(ids.parent);
    expect((await summary()).charged).toBe(0);
  });
  it("anonymous callers cannot execute financial read endpoints", async () => {
    await db.exec("set role anon");
    expect(
      (
        await db.query<{ allowed: boolean }>(
          `select has_function_privilege('anon', p.oid, 'execute') as allowed from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('finance_summary','charge_page','payment_page')`,
        )
      ).rows,
    ).toEqual([{ allowed: false }, { allowed: false }, { allowed: false }]);
    await expect(
      db.query("select public.finance_summary(null)"),
    ).rejects.toThrow("permission denied");
  });
  it("totals include over 1000 charges and keyset pages handle equal due dates", async () => {
    await as(ids.admin);
    const baseline = await summary();
    await db.query(
      "insert into public.charges(player_id,label,amount_cents,due_date) select $1,'Historické členské',100,'2000-01-01' from generate_series(1,1001)",
      [ids.child],
    );
    expect(await summary()).toMatchObject({
      count: 1003,
      charged: 110100,
      paid: 0,
      remaining: 110100,
      overdue: baseline.overdue + 100100,
    });
    const first = await chargePage();
    expect(first.items).toHaveLength(25);
    expect(first.has_more).toBe(true);
    const last = first.items.at(-1)!;
    const second = await chargePage(last.due_date, last.id);
    expect(second.items).toHaveLength(25);
    expect(
      second.items.some((c) => first.items.some((p) => p.id === c.id)),
    ).toBe(false);
    expect(await chargePage("2099-01-01", ids.charge)).toEqual({
      items: [],
      has_more: false,
    });
  });
  it("large payment ledgers keep exact balances and reversal state across pages", async () => {
    await as(ids.admin);
    await db.query(
      "insert into public.payments(charge_id,amount_cents,note,created_at) select $1,1,'Čiastočná úhrada','2000-01-01T00:00:00.123456Z' from generate_series(1,1001)",
      [ids.charge],
    );
    const first = await paymentPage(ids.charge);
    const original = first.items.at(-1)!;
    await db.query(
      "insert into public.payments(charge_id,amount_cents,note,reverses_id,created_at) values($1,-1,'Storno úhrady',$2,'2001-01-01')",
      [ids.charge, original.id],
    );
    await as(ids.parent);
    expect(await summary()).toMatchObject({
      charged: 5000,
      paid: 1000,
      remaining: 4000,
    });
    const current = await paymentPage(ids.charge);
    expect(current.items).toHaveLength(25);
    const last = current.items.at(-1)!;
    const second = await paymentPage(ids.charge, last.created_at, last.id);
    // The reversal is on the first page, its original entry on the second.
    expect(second.items.find((p) => p.id === original.id)?.reversed).toBe(true);
    expect(second.items).toHaveLength(25);
    expect(
      second.items.some((p) => current.items.some((c) => c.id === p.id)),
    ).toBe(false);
    await as(ids.coach);
    expect((await paymentPage(ids.charge)).items).toEqual([]);
  });
  it("development fixtures apply twice without duplicating members", async () => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub','',false)");
    const seed = readFileSync("supabase/seed.sql", "utf8");
    await db.exec(seed);
    await db.exec(seed);
    expect(await count("profiles")).toBe(12);
  });
  it("invalid member role rolls back all parts of member creation", async () => {
    await as(ids.admin);
    await db.exec("savepoint invalid_member");
    await expect(
      db.query(
        "select public.create_member('Chybný profil',null,null,null,'root')",
      ),
    ).rejects.toThrow();
    await db.exec("rollback to savepoint invalid_member");
    expect(await count("profiles")).toBe(8);
  });
  it("coach publishes only to their own team and authorship cannot be forged", async () => {
    await as(ids.coach);
    const result = await db.query<{ id: string; author_name: string }>(
      "insert into public.announcements(team_id,title,body,author_id,author_name) values($1,'Tréning zajtra','Pokyny pre tím',$2,'Forged') returning id,author_name",
      [ids.team, ids.coach],
    );
    expect(result.rows[0].author_name).toBe("Fixture coach");
    await db.query(
      "update public.announcements set author_id=$1,author_name='Forged' where id=$2",
      [ids.admin, result.rows[0].id],
    );
    expect(
      (
        await db.query<{ author_id: string }>(
          "select author_id from public.announcements",
        )
      ).rows[0].author_id,
    ).toBe(ids.coach);
    await as(ids.stranger);
    expect(await count("announcements")).toBe(0);
  });
  it("coach cannot publish club-wide announcements", async () => {
    await as(ids.coach);
    await expect(
      db.query(
        "insert into public.announcements(title,body,author_id) values('Celý klub','Zakázaná správa',$1)",
        [ids.coach],
      ),
    ).rejects.toThrow();
  });
  it("removing team membership hides existing team notifications", async () => {
    await as(ids.coach);
    await db.query(
      "insert into public.announcements(team_id,title,body,author_id) values($1,'Nový oznam','Pokyny pre tím',$2)",
      [ids.team, ids.coach],
    );
    await as(ids.child);
    expect(await count("notifications")).toBe(1);
    await as(ids.admin);
    await db.query("delete from public.team_memberships where profile_id=$1", [
      ids.child,
    ]);
    await as(ids.child);
    expect(await count("notifications")).toBe(0);
  });
  it("partial payment is visible to the parent with the correct remaining balance", async () => {
    await as(ids.admin);
    await db.query(
      "insert into public.payments(charge_id,amount_cents,note) values($1,1500,'Čiastočná úhrada')",
      [ids.charge],
    );
    await as(ids.parent);
    const result = await db.query<{ balance: number }>(
      "select c.amount_cents - coalesce((select sum(p.amount_cents) from public.payments p where p.charge_id=c.id),0)::int as balance from public.charges c",
    );
    expect(result.rows).toEqual([{ balance: 3500 }]);
  });
  it("duplicate reversal is rejected", async () => {
    await as(ids.admin);
    const p = await db.query<{ id: string }>(
      "insert into public.payments(charge_id,amount_cents,note) values($1,1500,'Úhrada') returning id",
      [ids.charge],
    );
    await db.query(
      "insert into public.payments(charge_id,amount_cents,note,reverses_id) values($1,-1500,'Storno',$2)",
      [ids.charge, p.rows[0].id],
    );
    await expect(
      db.query(
        "insert into public.payments(charge_id,amount_cents,note,reverses_id) values($1,-1500,'Druhé storno',$2)",
        [ids.charge, p.rows[0].id],
      ),
    ).rejects.toThrow();
  });
  it("all public domain tables enable RLS", async () => {
    await db.exec("reset role");
    const result = await db.query<{ relname: string }>(
      "select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity",
    );
    expect(result.rows).toEqual([]);
  });
  it("removing guardian link hides previous financial notifications", async () => {
    await as(ids.admin);
    await db.query(
      "delete from public.guardian_players where guardian_id=$1 and player_id=$2",
      [ids.parent, ids.child],
    );
    await as(ids.parent);
    expect(await count("notifications")).toBe(0);
    expect(await count("charges")).toBe(0);
  });
  it("revoking player role removes team access despite stale memberships", async () => {
    await as(ids.admin);
    await db.query(
      "delete from public.user_roles where profile_id=$1 and role='player'",
      [ids.child],
    );
    await as(ids.child);
    expect(await count("teams")).toBe(0);
    await expect(
      db.query(
        "insert into public.availability(event_id,player_id,response) values($1,$2,'yes')",
        [ids.event, ids.child],
      ),
    ).rejects.toThrow();
  });
  it("coach can identify player roles without seeing their other roles", async () => {
    await as(ids.admin);
    await db.query("insert into public.user_roles values($1,'guardian')", [
      ids.child,
    ]);
    await as(ids.coach);
    const r = await db.query<{ role: string }>(
      "select role from public.user_roles where profile_id=$1",
      [ids.child],
    );
    expect(r.rows).toEqual([{ role: "player" }]);
  });
  it("recurring event batch is atomic when one occurrence is invalid", async () => {
    await as(ids.coach);
    const events = [
      {
        team_id: ids.team,
        title: "Tréning 1",
        kind: "training",
        venue: "Hala",
        starts_at: "2026-12-12T16:00Z",
        ends_at: "2026-12-12T17:00Z",
      },
      {
        team_id: ids.team,
        title: "Tréning 2",
        kind: "training",
        venue: "Hala",
        starts_at: "2026-12-19T17:00Z",
        ends_at: "2026-12-19T16:00Z",
      },
    ];
    await db.exec("savepoint batch");
    await expect(
      db.query("select public.create_event_batch($1::jsonb)", [
        JSON.stringify(events),
      ]),
    ).rejects.toThrow();
    await db.exec("rollback to savepoint batch");
    expect(await count("event_series")).toBe(0);
    expect(await count("events")).toBe(1);
  });
  it("anonymous callers cannot invoke privileged profile updates", async () => {
    await db.exec("reset role; set role anon");
    await expect(
      db.query("select public.update_own_profile('Neoprávnený','')"),
    ).rejects.toThrow();
  });
  it("admin can edit another member and their own name", async () => {
    await as(ids.admin);
    await db.query(
      "select public.edit_member($1,'Upravený hráč',null,null,'2012-01-01')",
      [ids.child],
    );
    await db.query("select public.update_own_profile('Upravený správca','')");
    expect(
      (
        await db.query<{ full_name: string }>(
          "select full_name from public.profiles where id=$1",
          [ids.child],
        )
      ).rows[0].full_name,
    ).toBe("Upravený hráč");
  });
  it("admin cannot deactivate their own account", async () => {
    await as(ids.admin);
    await expect(
      db.query("update public.profiles set active=false where id=$1", [
        ids.admin,
      ]),
    ).rejects.toThrow("Cannot deactivate own account");
  });
  it("admin cannot remove their own administrator role", async () => {
    await as(ids.admin);
    await expect(
      db.query(
        "delete from public.user_roles where profile_id=$1 and role='admin'",
        [ids.admin],
      ),
    ).rejects.toThrow("Cannot remove own administrator role");
  });
  it("admin can remove another member's role", async () => {
    await as(ids.admin);
    await db.query("delete from public.user_roles where profile_id=$1", [
      ids.stranger,
    ]);
    expect(
      (
        await db.query(
          "select role from public.user_roles where profile_id=$1",
          [ids.stranger],
        )
      ).rows,
    ).toHaveLength(0);
  });
  it("admin can read all teams, guardian only linked teams, coach only assigned teams", async () => {
    await as(ids.admin);
    expect(await count("teams")).toBe(2);
    await as(ids.parent);
    expect(await count("teams")).toBe(1);
    await as(ids.coach);
    expect(await count("teams")).toBe(1);
  });
  it("guardian sees both children but no unrelated profile", async () => {
    await as(ids.parent);
    const r = await db.query<{ id: string }>("select id from public.profiles");
    expect(r.rows.map((x) => x.id).sort()).toEqual(
      [ids.parent, ids.child, ids.sibling].sort(),
    );
  });
  it("players cannot see their teammates' private records", async () => {
    await as(ids.child);
    expect(await count("profiles")).toBe(1);
    expect(await count("member_details")).toBe(1);
  });
  it("coach cannot read financial records", async () => {
    await as(ids.coach);
    expect(await count("charges")).toBe(0);
    expect(await count("payments")).toBe(0);
  });
  it("minor cannot read own finances but guardian and adult can", async () => {
    await as(ids.child);
    expect(await count("charges")).toBe(0);
    await as(ids.parent);
    expect(await count("charges")).toBe(1);
    await as(ids.adult);
    expect(await count("charges")).toBe(1);
  });
  it("deactivation immediately removes all data access", async () => {
    await as(ids.inactive);
    expect(await count("profiles")).toBe(0);
    expect(await count("teams")).toBe(0);
    expect(await count("charges")).toBe(0);
  });
  it("player cannot grant themselves administrator", async () => {
    await as(ids.child);
    await expect(
      db.query("insert into public.user_roles values($1,'admin')", [ids.child]),
    ).rejects.toThrow();
  });
  it("parent cannot fabricate a guardian relationship", async () => {
    await as(ids.parent);
    await expect(
      db.query("insert into public.guardian_players values($1,$2)", [
        ids.parent,
        ids.stranger,
      ]),
    ).rejects.toThrow();
  });
  it("coach cannot create an event for an unassigned team", async () => {
    await as(ids.coach);
    await expect(
      db.query(
        "insert into public.events(team_id,title,kind,starts_at,ends_at,venue) values($1,'Zakázané','training','2026-12-11 16:00Z','2026-12-11 17:00Z','Hala')",
        [ids.other],
      ),
    ).rejects.toThrow();
  });
  it("guardian response is separate from recorded participation", async () => {
    await as(ids.parent);
    await db.query(
      "insert into public.availability(event_id,player_id,response) values($1,$2,'yes')",
      [ids.event, ids.child],
    );
    expect(await count("availability")).toBe(1);
    expect(await count("attendance")).toBe(0);
  });
  it("guardian cannot record actual attendance", async () => {
    await as(ids.parent);
    await expect(
      db.query(
        "insert into public.attendance(event_id,player_id,status) values($1,$2,'present')",
        [ids.event, ids.child],
      ),
    ).rejects.toThrow();
  });
  it("coach can correct actual attendance", async () => {
    await as(ids.coach);
    await db.query(
      "insert into public.attendance(event_id,player_id,status) values($1,$2,'absent')",
      [ids.event, ids.child],
    );
    await db.query(
      "update public.attendance set status='excused' where player_id=$1",
      [ids.child],
    );
    expect(
      (
        await db.query<{ status: string }>(
          "select status from public.attendance",
        )
      ).rows[0].status,
    ).toBe("excused");
  });
  it("cancelled events reject availability changes", async () => {
    await as(ids.admin);
    await db.query("update public.events set status='cancelled' where id=$1", [
      ids.event,
    ]);
    await as(ids.parent);
    await expect(
      db.query(
        "insert into public.availability(event_id,player_id,response) values($1,$2,'yes')",
        [ids.event, ids.child],
      ),
    ).rejects.toThrow();
  });
  it("cannot move an attendance response to an unrelated child", async () => {
    await as(ids.parent);
    await db.query(
      "insert into public.availability(event_id,player_id,response) values($1,$2,'yes')",
      [ids.event, ids.child],
    );
    await expect(
      db.query("update public.availability set player_id=$1", [ids.stranger]),
    ).rejects.toThrow();
  });
  it("multi-role coach/guardian receives only linked financial access", async () => {
    await as(ids.admin);
    await db.query("insert into public.user_roles values($1,'guardian')", [
      ids.coach,
    ]);
    await db.query("insert into public.guardian_players values($1,$2)", [
      ids.coach,
      ids.child,
    ]);
    await as(ids.coach);
    expect(await count("charges")).toBe(1);
    expect(await count("teams")).toBe(1);
  });
  it("partial payment and reversal retain audited history", async () => {
    await as(ids.admin);
    const p = await db.query<{ id: string }>(
      "insert into public.payments(charge_id,amount_cents,note) values($1,1500,'Bankový prevod') returning id",
      [ids.charge],
    );
    await db.query(
      "insert into public.payments(charge_id,amount_cents,note,reverses_id) values($1,-1500,'Oprava omylu',$2)",
      [ids.charge, p.rows[0].id],
    );
    expect(await count("payments")).toBe(2);
    const audit = await db.query(
      "select id from public.audit_logs where table_name='payments'",
    );
    expect(audit.rows).toHaveLength(2);
  });
  it("rejects overpayment", async () => {
    await as(ids.admin);
    await expect(
      db.query(
        "insert into public.payments(charge_id,amount_cents,note) values($1,6000,'Bankový prevod')",
        [ids.charge],
      ),
    ).rejects.toThrow();
  });
  it("parent cannot insert payments", async () => {
    await as(ids.parent);
    await expect(
      db.query(
        "insert into public.payments(charge_id,amount_cents,note) values($1,1500,'Bankový prevod')",
        [ids.charge],
      ),
    ).rejects.toThrow();
  });
  it("payments are immutable", async () => {
    await as(ids.admin);
    await db.query(
      "insert into public.payments(charge_id,amount_cents,note) values($1,1500,'Bankový prevod')",
      [ids.charge],
    );
    await expect(
      db.exec("update public.payments set amount_cents=2000"),
    ).rejects.toThrow();
  });
  it("member creation is atomic and rejects unknown roles", async () => {
    await as(ids.admin);
    const r = await db.query<{ id: string }>(
      "select public.create_member('Nový hráč',null,null,'2012-01-01','player') as id",
    );
    expect(r.rows[0].id).toBeTruthy();
    expect(await count("profiles")).toBe(9);
  });
  it("notifications restrict recipients and editable columns", async () => {
    await as(ids.parent);
    expect(await count("notifications")).toBe(1);
    await expect(
      db.exec("update public.notifications set title='Podvod'"),
    ).rejects.toThrow();
  });
  it("self profile editing cannot change birth date or roles", async () => {
    await as(ids.child);
    await db.query(
      "select public.update_own_profile('Upravené meno','0900123456')",
    );
    expect(
      (
        await db.query<{ full_name: string }>(
          "select full_name from public.profiles",
        )
      ).rows[0].full_name,
    ).toBe("Upravené meno");
    await expect(
      db.exec("update public.member_details set birth_date='1990-01-01'"),
    ).resolves.toBeDefined();
    expect(
      (
        await db.query<{ birth_date: string }>(
          "select public.member_private_details(private.viewer())->>'birth_date' as birth_date",
        )
      ).rows[0].birth_date,
    ).toBe("2012-01-01");
  });
});
