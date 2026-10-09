import { describe, it, expect } from "vitest";
import { localToUtc, balance, dateTime } from "../../src/lib/utils";
describe("Slovak club dates and money", () => {
  it("keeps the same wall clock time across DST", () => {
    expect(localToUtc("2026-10-20T17:00")).toBe("2026-10-20T15:00:00.000Z");
    expect(localToUtc("2026-10-27T17:00")).toBe("2026-10-27T16:00:00.000Z");
  });
  it("rejects nonexistent and ambiguous wall clock times", () => {
    expect(() => localToUtc("2026-03-29T02:30")).toThrow();
    expect(() => localToUtc("2026-10-25T02:30")).toThrow();
  });
  it("formats an event in Bratislava independent of server zone", () =>
    expect(dateTime("2026-01-10T16:00:00Z", "HH:mm")).toBe("17:00"));
  it("derives the balance from partial payments and reversals", () =>
    expect(balance(5000, [1500, 1000, -1000])).toBe(3500));
});
