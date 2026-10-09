import { describe, it, expect } from "vitest";
import {
  historyCursor,
  historyFilter,
  historyHref,
  historyPage,
} from "../../src/lib/history";
const id = "00000000-0000-4000-8000-000000000040";
describe("history pagination", () => {
  it("preserves microsecond timestamps and offsets in cursor URLs", () => {
    const created_at = "2026-10-08T12:00:00.123456+02:00";
    const url = new URL(
      historyHref("/klub/audit", { created_at, id }),
      "https://club.example",
    );
    const cursor = historyCursor(Object.fromEntries(url.searchParams));
    expect(cursor).toEqual({ at: created_at, id });
    expect(historyFilter(cursor)).toContain(
      `created_at.eq.${created_at},id.lt.${id}`,
    );
  });
  it("rejects filter injection, repeated parameters and incomplete cursors", () => {
    for (const value of [
      { at: "2026-01-01T00:00:00Z),id.neq.null", id },
      { at: "2026-01-01T00:00:00Z", id: "x),id.neq.null" },
      { at: ["2026-01-01T00:00:00Z"], id },
      { id },
    ]) {
      expect(historyCursor(value)).toBeNull();
      expect(() => historyFilter(value)).toThrow();
    }
  });
  it("uses the lookahead row only to detect a following page", () => {
    expect(historyPage([])).toEqual({ items: [], hasMore: false });
    expect(historyPage(Array.from({ length: 25 }, (_, i) => i)).hasMore).toBe(
      false,
    );
    const page = historyPage(Array.from({ length: 26 }, (_, i) => i));
    expect(page.items).toHaveLength(25);
    expect(page.items.at(-1)).toBe(24);
    expect(page.hasMore).toBe(true);
  });
});
