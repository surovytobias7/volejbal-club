import { describe, it, expect } from "vitest";
import {
  directoryCursor,
  directoryHref,
  directoryQuery,
} from "../../src/lib/directories";
const id = "00000000-0000-4000-8000-000000000040";
describe("directory navigation", () => {
  it("preserves Slovak names, search and archive filters through cursor URLs", () => {
    const href = directoryHref(
      "/klub/timy",
      { q: "Novák & dcéra", archived: "true" },
      { name: "Žiačky + U16", id },
    );
    const params = Object.fromEntries(
      new URL(href, "https://club.example").searchParams,
    );
    expect(directoryCursor(params)).toEqual({ after: "Žiačky + U16", id });
    expect(directoryQuery(params)).toBe("Novák & dcéra");
    expect(params.archived).toBe("true");
  });
  it("ignores malformed cursors and repeated query parameters", () => {
    expect(directoryCursor({ after: "Novák", id: "bad" })).toBeNull();
    expect(directoryCursor({ after: ["Novák"], id })).toBeNull();
    expect(directoryCursor({ id })).toBeNull();
    expect(directoryQuery({ q: ["a", "b"] })).toBe("");
    expect(directoryQuery({ q: "x".repeat(161) })).toHaveLength(160);
    expect(directoryHref("/klub/timy", {})).toBe("/klub/timy");
  });
});
