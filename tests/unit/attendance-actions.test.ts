import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireViewer } from "../../src/lib/auth";
import {
  saveAttendance,
  reloadAttendance,
} from "../../src/features/attendance-actions";
import { loadEventRoster } from "../../src/lib/event-roster";
import { revalidatePath } from "next/cache";
vi.mock("../../src/lib/auth", () => ({ requireViewer: vi.fn() }));
vi.mock("../../src/lib/event-roster", () => ({ loadEventRoster: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const uid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const query = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
};
const db = { from: vi.fn(() => query), rpc: vi.fn() };
const abortSignal = vi.fn();
const input = {
  event_id: uid(30),
  changes: [
    {
      player_id: uid(4),
      status: "present" as const,
      reason: "",
      expected_version: 0,
    },
  ],
};
function viewer(
  roles: ("admin" | "coach" | "player" | "guardian")[] = ["coach"],
) {
  vi.mocked(requireViewer).mockResolvedValue({
    id: uid(2),
    name: "Tréner",
    roles,
    canFinance: roles.includes("admin"),
    db,
  } as unknown as Awaited<ReturnType<typeof requireViewer>>);
}
beforeEach(() => {
  vi.clearAllMocks();
  query.maybeSingle.mockReset();
  viewer();
  query.maybeSingle.mockResolvedValueOnce({
    data: { team_id: uid(20), status: "scheduled" },
    error: null,
  });
  query.maybeSingle.mockResolvedValue({
    data: { profile_id: uid(2) },
    error: null,
  });
  abortSignal.mockResolvedValue({
    data: [
      {
        player_id: uid(4),
        status: "present",
        reason: "",
        version: 1,
        updated_at: "2026-10-21T12:00:00Z",
      },
    ],
    error: null,
  });
  db.rpc.mockReturnValue({ abortSignal });
  vi.mocked(loadEventRoster).mockResolvedValue({
    players: [],
    canManage: true,
  });
});
describe("attendance reload authorization and cancellation", () => {
  it.each(["scheduled", "completed", "cancelled"])(
    "returns the current %s session state with the authorized roster",
    async (status) => {
      query.maybeSingle
        .mockReset()
        .mockResolvedValue({ data: { status }, error: null });
      expect(await reloadAttendance(uid(30))).toEqual({
        players: [],
        readOnly: status === "cancelled",
      });
    },
  );
  it("marks confirmed assignment revocation as unavailable without returning a roster", async () => {
    vi.mocked(loadEventRoster).mockResolvedValue({
      players: [],
      canManage: false,
    });
    const result = await reloadAttendance(uid(30));
    expect(result).toMatchObject({ unavailable: true });
    expect(result).not.toHaveProperty("players");
  });
  it("rechecks the event after loading the roster and hides a newly inaccessible event", async () => {
    query.maybeSingle
      .mockReset()
      .mockResolvedValue({ data: null, error: null });
    expect(await reloadAttendance(uid(30))).toMatchObject({
      unavailable: true,
    });
  });
  it("does not mistake a database failure for confirmed revocation", async () => {
    query.maybeSingle
      .mockReset()
      .mockResolvedValue({ data: null, error: { message: "private detail" } });
    const result = await reloadAttendance(uid(30));
    expect(result).toHaveProperty("error");
    expect(result).not.toHaveProperty("players");
    expect(result).not.toHaveProperty("unavailable", true);
    expect(JSON.stringify(result)).not.toContain("private detail");
  });
  it.each(["player", "guardian"] as const)(
    "rejects %s before loading a coach roster",
    async (role) => {
      viewer([role]);
      expect(await reloadAttendance(uid(30))).toMatchObject({
        unavailable: true,
      });
      expect(loadEventRoster).not.toHaveBeenCalled();
    },
  );
});
describe("attendance server authorization", () => {
  it.each(["player", "guardian"] as const)(
    "rejects %s without querying or mutating attendance",
    async (role) => {
      viewer([role]);
      expect((await saveAttendance(input)).error).toBeTruthy();
      expect(db.from).not.toHaveBeenCalled();
      expect(db.rpc).not.toHaveBeenCalled();
    },
  );
  it("requires current team assignment even when another role grants event visibility", async () => {
    viewer(["coach", "guardian"]);
    query.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await saveAttendance(input)).error).toBeTruthy();
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it.each([
    { data: null, error: null },
    { data: null, error: { message: "private detail" } },
    { data: { team_id: uid(20), status: "cancelled" }, error: null },
  ])("fails closed on unavailable or cancelled session", async (result) => {
    query.maybeSingle.mockReset().mockResolvedValue(result);
    expect((await saveAttendance(input)).error).toBeTruthy();
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("rejects malformed input before reaching the database", async () => {
    expect(
      (await saveAttendance({ ...input, changes: [] })).error,
    ).toBeTruthy();
    expect(db.from).not.toHaveBeenCalled();
  });
  it("sends one atomic batch and invalidates connected views only on confirmed success", async () => {
    expect((await saveAttendance(input)).records).toHaveLength(1);
    expect(db.rpc).toHaveBeenCalledExactlyOnceWith("save_attendance", {
      p_event: input.event_id,
      p_changes: input.changes,
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/klub/kalendar/${uid(30)}`);
    expect(revalidatePath).toHaveBeenCalledWith("/klub/dochadzka");
    expect(revalidatePath).toHaveBeenCalledWith("/klub");
  });
  it("permits an administrator without coach membership", async () => {
    viewer(["admin"]);
    expect((await saveAttendance(input)).records).toHaveLength(1);
    expect(query.maybeSingle).toHaveBeenCalledTimes(1);
  });
  it.each(["PT409", "40001"])(
    "returns conflict %s without leaking database text or claiming persistence",
    async (code) => {
      abortSignal.mockResolvedValue({
        data: null,
        error: { code, message: "private database detail" },
      });
      const result = await saveAttendance(input);
      expect(result.conflict).toBe(true);
      expect(result.error).not.toContain("private");
      expect(result.records).toBeUndefined();
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );
  it("does not claim persistence when RLS rejects revoked access after the server check", async () => {
    abortSignal.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "private database detail" },
    });
    const result = await saveAttendance(input);
    expect(db.rpc).toHaveBeenCalledOnce();
    expect(result.error).toBeTruthy();
    expect(result.error).not.toContain("private database");
    expect(result.records).toBeUndefined();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it.each(
    [
      null,
      [],
      [
        {
          player_id: uid(99),
          status: "present",
          reason: "",
          version: 1,
          updated_at: "2026-10-21T12:00:00Z",
        },
      ],
    ].map((data) => ({ data })),
  )("requires a matching acknowledgement", async ({ data }) => {
    abortSignal.mockResolvedValue({ data, error: null });
    expect((await saveAttendance(input)).error).toBeTruthy();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it.each([
    { status: "absent" },
    { reason: "Unexpected reason" },
    { version: 2 },
  ])(
    "rejects mismatched saved values or an older version %j",
    async (override) => {
      abortSignal.mockResolvedValue({
        data: [
          {
            player_id: uid(4),
            status: "present",
            reason: "",
            version: 4,
            updated_at: "2026-10-26T12:00:00Z",
            ...override,
          },
        ],
        error: null,
      });
      const result = await saveAttendance({
        ...input,
        changes: [{ ...input.changes[0], expected_version: 3 }],
      });
      expect(result.error).toBeTruthy();
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );
  it("accepts an idempotent acknowledgement at the current version", async () => {
    const result = await saveAttendance({
      ...input,
      changes: [{ ...input.changes[0], expected_version: 1 }],
    });
    expect(result.records).toHaveLength(1);
  });
  it("bounds the RPC and never confirms a timed-out write", async () => {
    abortSignal.mockResolvedValue({
      data: null,
      error: { code: "", message: "TimeoutError: private connection detail" },
    });
    const result = await saveAttendance(input);
    expect(abortSignal).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(result.records).toBeUndefined();
    expect(result.error).toBeTruthy();
    expect(result.error).not.toContain("private connection");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
