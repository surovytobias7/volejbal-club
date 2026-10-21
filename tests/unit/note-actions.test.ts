import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireViewer } from "../../src/lib/auth";
import { revalidatePath } from "next/cache";
import { saveInternalNote } from "../../src/features/note-actions";

vi.mock("../../src/lib/auth", () => ({ requireViewer: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const uid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const query = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
};
const db = { rpc: vi.fn(), from: vi.fn(() => query) };
function viewer(
  roles: ("admin" | "coach" | "player" | "guardian")[] = ["coach"],
) {
  vi.mocked(requireViewer).mockResolvedValue({
    id: uid(2),
    name: "Tréner",
    roles,
    db,
  } as unknown as Awaited<ReturnType<typeof requireViewer>>);
}
function form(edit = false) {
  const value = new FormData();
  value.set("player_id", uid(4));
  value.set("body", "  Tréningový cieľ  ");
  if (edit) {
    value.set("id", uid(90));
    value.set("version", "1");
  }
  return value;
}
beforeEach(() => {
  vi.clearAllMocks();
  query.maybeSingle.mockReset();
  query.single.mockReset();
  viewer();
  db.rpc.mockResolvedValue({ data: true, error: null });
});
describe("internal note server authorization", () => {
  it.each([["player"], ["guardian"]] as const)(
    "rejects %s before any database mutation",
    async (...roles) => {
      viewer([...roles]);
      expect((await saveInternalNote({}, form())).error).toBeTruthy();
      expect(db.rpc).not.toHaveBeenCalled();
      expect(db.from).not.toHaveBeenCalled();
    },
  );
  it("rejects invalid content before accessing the note", async () => {
    const input = form();
    input.set("body", "   ");
    expect((await saveInternalNote({}, input)).error).toBe("Napíšte poznámku.");
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it.each([
    { data: false, error: null },
    { data: null, error: { message: "Private database detail" } },
  ])("fails closed when current scope cannot be authorized", async (result) => {
    db.rpc.mockResolvedValue(result);
    const state = await saveInternalNote({}, form());
    expect(state.error).toBeTruthy();
    expect(state.error).not.toContain("Private");
    expect(db.from).not.toHaveBeenCalled();
  });
  it("does not accept another coach's note or a changed subject", async () => {
    query.maybeSingle.mockResolvedValue({
      data: { author_id: uid(3), player_id: uid(4), event_id: null },
      error: null,
    });
    expect((await saveInternalNote({}, form(true))).error).toBeTruthy();
    expect(query.update).not.toHaveBeenCalled();
    query.maybeSingle.mockResolvedValue({
      data: { author_id: uid(2), player_id: uid(5), event_id: null },
      error: null,
    });
    expect((await saveInternalNote({}, form(true))).error).toBeTruthy();
    expect(query.update).not.toHaveBeenCalled();
  });
  it("uses a version condition and reports a stale edit without claiming success", async () => {
    query.maybeSingle
      .mockResolvedValueOnce({
        data: { author_id: uid(2), player_id: uid(4), event_id: null },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: null });
    const result = await saveInternalNote({}, form(true));
    expect(query.eq).toHaveBeenCalledWith("version", 1);
    expect(result.error).toContain("medzitým");
    expect(result.success).toBeUndefined();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it("allows admin corrections without changing the original author", async () => {
    viewer(["admin"]);
    query.maybeSingle
      .mockResolvedValueOnce({
        data: { author_id: uid(3), player_id: uid(4), event_id: null },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: uid(90), body: "Tréningový cieľ", version: 2 },
        error: null,
      });
    expect((await saveInternalNote({}, form(true))).note?.version).toBe(2);
    expect(query.update).toHaveBeenCalledWith({ body: "Tréningový cieľ" });
    expect(revalidatePath).toHaveBeenCalledWith(`/klub/clenovia/${uid(4)}`);
  });
  it("creates only validated content and context; the database assigns provenance", async () => {
    query.single.mockResolvedValue({
      data: { id: uid(90), body: "Tréningový cieľ", version: 1 },
      error: null,
    });
    const input = form();
    input.set("author_id", uid(1));
    expect((await saveInternalNote({}, input)).success).toBeTruthy();
    expect(query.insert).toHaveBeenCalledWith({
      body: "Tréningový cieľ",
      player_id: uid(4),
      event_id: null,
    });
  });
});
