import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireViewer } from "../../src/lib/auth";
import { saveAttendance } from "../../src/features/attendance-actions";
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
  db.rpc.mockResolvedValue({
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
  it("returns a conflict without leaking database text or claiming persistence", async () => {
    db.rpc.mockResolvedValue({
      data: null,
      error: { code: "40001", message: "private database detail" },
    });
    const result = await saveAttendance(input);
    expect(result.conflict).toBe(true);
    expect(result.error).not.toContain("private");
    expect(result.records).toBeUndefined();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it("does not claim persistence when RLS rejects revoked access after the server check", async () => {
    db.rpc.mockResolvedValue({
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
    db.rpc.mockResolvedValue({ data, error: null });
    expect((await saveAttendance(input)).error).toBeTruthy();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
