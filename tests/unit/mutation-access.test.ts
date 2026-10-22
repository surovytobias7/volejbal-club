import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireViewer, type Role } from "../../src/lib/auth";
import { mutate } from "../../src/features/actions";

vi.mock("server-only", () => ({}));
vi.mock("../../src/lib/auth", () => ({ requireViewer: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const writes: { table: string; value: unknown }[] = [];
let assigned: boolean;
let linked: boolean;
let active: boolean;
let currentPlayer: boolean;
let cancelled: boolean;
let oldAnnouncement: boolean;
let queryError: boolean;
let writeError: boolean;

const db = {
  from: vi.fn((table: string) => {
    const filters: Record<string, unknown> = {};
    let writing = false;
    const result = () => {
      if (writing)
        return {
          data: { id: id(90) },
          error: writeError ? { code: "42501" } : null,
        };
      if (queryError)
        return { data: null, error: { message: "Private database detail" } };
      let data: unknown = null;
      if (table === "events")
        data = {
          id: id(30),
          team_id: id(20),
          status: cancelled ? "cancelled" : "scheduled",
        };
      if (table === "team_memberships")
        data = (
          filters.kind === "coach"
            ? assigned && filters.team_id === id(20)
            : true
        )
          ? { profile_id: id(4), team_id: id(20) }
          : null;
      if (table === "guardian_players")
        data = linked ? { player_id: id(4) } : null;
      if (table === "profiles") data = active ? { id: id(4) } : null;
      if (table === "user_roles")
        data = currentPlayer ? { profile_id: id(4) } : null;
      return { data, error: null };
    };
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn((key: string, value: unknown) => {
        filters[key] = value;
        return query;
      }),
      maybeSingle: vi.fn(async () => result()),
      single: vi.fn(async () => result()),
      insert: vi.fn((value: unknown) => {
        writing = true;
        writes.push({ table, value });
        return query;
      }),
      update: vi.fn((value: unknown) => {
        writing = true;
        writes.push({ table, value });
        return query;
      }),
      upsert: vi.fn((value: unknown) => {
        writing = true;
        writes.push({ table, value });
        return query;
      }),
      then: (resolve: (value: ReturnType<typeof result>) => unknown) =>
        Promise.resolve(result()).then(resolve),
    };
    return query;
  }),
  rpc: vi.fn(async (name: string) => ({
    data: name === "can_manage_announcement" ? oldAnnouncement : null,
    error: queryError ? { code: "connection_error" } : null,
  })),
};

function viewer(roles: Role[], own = id(2)) {
  vi.mocked(requireViewer).mockResolvedValue({
    id: own,
    name: "Fiktívny člen",
    roles,
    canFinance: false,
    db,
  } as unknown as Awaited<ReturnType<typeof requireViewer>>);
}
const fields: Record<string, string> = {
  id: id(30),
  event_id: id(30),
  player_id: id(4),
  team_id: id(20),
  status: "present",
  response: "yes",
  reason: "",
  title: "Tréning",
  kind: "training",
  venue: "Hala",
  starts_at: "2026-12-10T16:00",
  ends_at: "2026-12-10T17:00",
  weeks: "1",
  audience: "teams",
  teams: id(20),
  recipients: "",
  body: "Tímové pokyny",
  important: "false",
};
async function run(command: string, changes: Record<string, string> = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...fields, command, ...changes }))
    form.set(key, value);
  return mutate({}, form);
}
beforeEach(() => {
  vi.clearAllMocks();
  writes.length = 0;
  assigned = linked = active = currentPlayer = oldAnnouncement = true;
  cancelled = queryError = writeError = false;
  viewer(["coach"]);
});

describe("server mutation authorization with an otherwise permissive database mock", () => {
  it.each([
    "member",
    "member-edit",
    "member-active",
    "role",
    "membership",
    "guardian",
    "invite",
    "settings",
    "fee-plan",
    "charge",
    "payment",
    "reverse-payment",
    "adjust-charge",
  ])("denies coach member/finance administration: %s", async (command) => {
    expect((await run(command)).error).toBeTruthy();
    expect(writes).toEqual([]);
    expect(db.from).not.toHaveBeenCalled();
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it.each(["player", "guardian"] as const)(
    "denies actual attendance for %s before a write",
    async (role) => {
      viewer([role], id(4));
      expect((await run("attendance")).error).toBeTruthy();
      expect(writes).toEqual([]);
      expect(db.from).not.toHaveBeenCalled();
    },
  );
  it.each(["attendance", "event", "event-status", "send-reminders"])(
    "denies readable but unassigned event management: %s",
    async (command) => {
      assigned = false;
      expect(
        (
          await run(command, {
            status: command === "event-status" ? "completed" : "present",
          })
        ).error,
      ).toBeTruthy();
      expect(writes).toEqual([]);
      expect(db.rpc).not.toHaveBeenCalled();
    },
  );
  it("checks both old and new team when editing an event", async () => {
    expect((await run("event", { team_id: id(21) })).error).toBeTruthy();
    expect(writes).toEqual([]);
  });
  it("records actual attendance only, leaving actor and time to the database", async () => {
    expect((await run("attendance")).success).toBeTruthy();
    expect(writes).toEqual([
      {
        table: "attendance",
        value: { event_id: id(30), player_id: id(4), status: "present" },
      },
    ]);
  });
  it.each(["admin", "coach"] as const)(
    "does not grant availability impersonation to %s",
    async (role) => {
      viewer([role]);
      expect((await run("availability")).error).toBeTruthy();
      expect(writes).toEqual([]);
    },
  );
  it("accepts the current player's own planned response", async () => {
    viewer(["player"], id(4));
    expect((await run("availability")).success).toBeTruthy();
    expect(writes).toEqual([
      {
        table: "availability",
        value: {
          event_id: id(30),
          player_id: id(4),
          response: "yes",
          reason: "",
        },
      },
    ]);
  });
  it("accepts a legitimately linked child under additive coach/guardian roles", async () => {
    viewer(["coach", "guardian"]);
    expect((await run("availability")).success).toBeTruthy();
    expect(writes[0].table).toBe("availability");
  });
  it("denies a removed guardian link before a response write", async () => {
    viewer(["guardian"]);
    linked = false;
    expect((await run("availability")).error).toBeTruthy();
    expect(writes).toEqual([]);
  });
  it.each(["inactive", "no-player-role", "cancelled", "database-error"])(
    "fails closed for participation: %s",
    async (reason) => {
      active = reason !== "inactive";
      currentPlayer = reason !== "no-player-role";
      cancelled = reason === "cancelled";
      queryError = reason === "database-error";
      const result = await run("attendance");
      expect(result.error).toBeTruthy();
      expect(result.error).not.toContain("Private database");
      expect(writes).toEqual([]);
    },
  );
  it("does not report success after RLS rejects a race at mutation time", async () => {
    writeError = true;
    expect((await run("attendance")).error).toBeTruthy();
    expect(writes).toHaveLength(1);
  });
  it("requires management of every requested announcement team", async () => {
    expect(
      (await run("announcement", { teams: `${id(20)},${id(21)}` })).error,
    ).toBeTruthy();
    expect(writes).toEqual([]);
  });
  it.each(["announcement", "archive-announcement"])(
    "checks existing announcement access before %s",
    async (command) => {
      oldAnnouncement = false;
      expect((await run(command)).error).toBeTruthy();
      expect(writes).toEqual([]);
    },
  );
  it.each(["club", "people"])(
    "denies coach publishing to %s",
    async (audience) => {
      expect(
        (await run("announcement", { audience, recipients: id(4) })).error,
      ).toBeTruthy();
      expect(writes).toEqual([]);
    },
  );
  it("accepts an assigned team's announcement edit", async () => {
    expect((await run("announcement")).success).toBeTruthy();
    expect(writes[0].table).toBe("announcements");
  });
});
