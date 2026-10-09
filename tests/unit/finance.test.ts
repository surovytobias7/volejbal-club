import { describe, expect, it } from "vitest";
import { financeCursor, financePageHref } from "../../src/lib/finance";

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
