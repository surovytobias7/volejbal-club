import { describe, it, expect } from "vitest";
import {
  attendanceCursorSchema,
  announcementCursorSchema,
} from "../../src/lib/activity";
import { selectedIds } from "../../src/lib/selectors";
const id = "00000000-0000-4000-8000-000000000040";
describe("activity filters and audiences", () => {
  it("keeps composite cursor precision and requires every tie-breaker", () => {
    const at = "2026-10-08T12:00:00.123456+02:00";
    expect(
      attendanceCursorSchema.parse({ at, event: id, cursorPlayer: id }).at,
    ).toBe(at);
    expect(attendanceCursorSchema.safeParse({ at, event: id }).success).toBe(
      false,
    );
    expect(
      announcementCursorSchema.safeParse({ at, id, important: "false" })
        .success,
    ).toBe(true);
    expect(
      announcementCursorSchema.safeParse({ at, id, important: "invalid" })
        .success,
    ).toBe(false);
  });
  it("validates bounded, deduplicated audience IDs", () => {
    expect(selectedIds.parse("")).toEqual([]);
    expect(selectedIds.parse(`${id},${id}`)).toEqual([id]);
    expect(selectedIds.safeParse("not-a-uuid").success).toBe(false);
    expect(selectedIds.safeParse(Array(51).fill(id).join(",")).success).toBe(
      false,
    );
  });
});
