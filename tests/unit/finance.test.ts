import { describe, expect, it } from "vitest";
import { financeCursor, financePageHref } from "../../src/lib/finance";
import { feePeriodSchema, feePeriodLabel } from "../../src/lib/fee-period";

describe("structured fee periods", () => {
  it("accepts inclusive single-day and cross-year periods", () => {
    for (const [period_start, period_end] of [
      ["2026-10-01", "2026-10-01"],
      ["2026-09-01", "2027-06-30"],
    ])
      expect(
        feePeriodSchema.safeParse({ period_start, period_end }).success,
      ).toBe(true);
  });
  it("rejects missing, impossible and reversed dates", () => {
    for (const period_end of ["", "2026-02-30", "2026-09-30"])
      expect(
        feePeriodSchema.safeParse({ period_start: "2026-10-01", period_end })
          .success,
      ).toBe(false);
  });
  it("does not invent a period for legacy charges", () => {
    expect(feePeriodLabel(null, null)).toBe("Obdobie nebolo uvedené");
    expect(feePeriodLabel("2026-10-01", "2026-10-31")).toBe(
      "01. 10. 2026 – 31. 10. 2026",
    );
  });
});

const id = "00000000-0000-4000-8000-000000000040";
describe("financial pagination URLs", () => {
  it("preserves timestamp precision and timezone through a URL round trip", () => {
    const at = "2026-10-08T12:00:00.123456+02:00";
    const url = new URL(
      financePageHref("/klub/platby", at, id),
      "https://club.example",
    );
    expect(
      financeCursor(Object.fromEntries(url.searchParams), "payments"),
    ).toEqual({ at, id });
  });
  it("invalid or incomplete cursors safely return the first page", () => {
    for (const params of [
      {},
      { at: "2026-02-30", id },
      { at: "2026-10-08", id: "invalid" },
      { at: ["2026-10-08"], id },
      { at: "2026-10-08" },
    ]) {
      expect(financeCursor(params, "charges")).toBeNull();
    }
  });
});
