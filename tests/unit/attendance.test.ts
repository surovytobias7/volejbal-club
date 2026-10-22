import { describe, it, expect } from "vitest";
import {
  attendanceChanges,
  attendanceInputSchema,
} from "../../src/lib/attendance";

const id = "00000000-0000-4000-8000-000000000030";
const player = {
  profile_id: id,
  attendance: null,
  attendance_reason: "",
  attendance_version: 0,
};
describe("attendance changes and input", () => {
  it("sends only edited players, never infers absence from unmarked", () => {
    expect(
      attendanceChanges([player], { [id]: { status: null, reason: "" } }),
    ).toEqual([]);
    expect(attendanceChanges([player], {})).toEqual([]);
    expect(
      attendanceChanges([player], { [id]: { status: "late", reason: "" } }),
    ).toEqual([
      { player_id: id, status: "late", reason: "", expected_version: 0 },
    ]);
  });
  it("keeps the last saved version when clearing recorded attendance", () => {
    expect(
      attendanceChanges(
        [{ ...player, attendance: "present", attendance_version: 7 }],
        { [id]: { status: null, reason: "" } },
      )[0],
    ).toMatchObject({ status: null, expected_version: 7 });
  });
  it("normalizes a reason and rejects duplicate players and non-excused reasons", () => {
    const changes = attendanceChanges([player], {
      [id]: { status: "excused", reason: " Rodinný program " },
    });
    expect(changes[0].reason).toBe("Rodinný program");
    expect(
      attendanceInputSchema.safeParse({ event_id: id, changes }).success,
    ).toBe(true);
    expect(
      attendanceInputSchema.safeParse({
        event_id: id,
        changes: [...changes, ...changes],
      }).success,
    ).toBe(false);
    expect(
      attendanceInputSchema.safeParse({
        event_id: id,
        changes: [{ ...changes[0], status: "present" }],
      }).success,
    ).toBe(false);
  });
});
