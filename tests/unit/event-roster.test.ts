import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/types/database";
import { loadEventRoster } from "../../src/lib/event-roster";
vi.mock("server-only", () => ({}));
const uid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const player = (index: number) => ({
  profile_id: uid(index),
  full_name: `Hráč ${index}`,
  active: true,
  current_member: true,
  can_respond: false,
  availability: null,
  attendance: null,
  attendance_reason: "",
  attendance_version: 0,
  attendance_updated_at: null,
});
describe("complete attendance roster", () => {
  it.each([
    { items: [player(2)], total: 2, has_more: false, can_manage: false },
    { items: [player(2)], total: 3, has_more: false, can_manage: true },
    { items: [], total: 2, has_more: false, can_manage: true },
    { items: [player(1)], total: 2, has_more: false, can_manage: true },
  ])(
    "rejects a changing scope, partial roster or duplicated page %j",
    async (page) => {
      const rpc = vi
        .fn()
        .mockResolvedValueOnce({
          data: {
            items: [player(1)],
            total: 2,
            has_more: true,
            can_manage: true,
          },
          error: null,
        })
        .mockResolvedValueOnce({ data: page, error: null });
      await expect(
        loadEventRoster(
          { rpc } as unknown as SupabaseClient<Database>,
          uid(80),
        ),
      ).rejects.toThrow();
    },
  );
  it("loads players beyond the first 25 and preserves the cursor", async () => {
    const first = Array.from({ length: 25 }, (_, index) => player(index + 1));
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: { items: first, total: 26, has_more: true, can_manage: true },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          items: [player(26)],
          total: 26,
          has_more: false,
          can_manage: true,
        },
        error: null,
      });
    const result = await loadEventRoster(
      { rpc } as unknown as SupabaseClient<Database>,
      uid(80),
    );
    expect(result.players).toHaveLength(26);
    expect(result.players.at(-1)?.profile_id).toBe(uid(26));
    expect(rpc).toHaveBeenLastCalledWith("event_roster_page", {
      p_event: uid(80),
      p_query: "",
      p_name: "Hráč 25",
      p_id: uid(25),
    });
  });
  it("fails the entire load when a later query fails instead of presenting a partial/demo roster", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          items: [player(1)],
          total: 26,
          has_more: true,
          can_manage: true,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Query failed" },
      });
    await expect(
      loadEventRoster({ rpc } as unknown as SupabaseClient<Database>, uid(80)),
    ).rejects.toThrow();
  });
});
