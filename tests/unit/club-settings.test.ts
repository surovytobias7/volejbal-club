import { describe, expect, it } from "vitest";
import { categoriesSchema } from "../../src/lib/club-settings";

describe("configured categories", () => {
  it("normalizes whitespace and duplicate names", () => {
    expect(categoriesSchema.parse(" U14, U16, U14, , Seniori ")).toEqual([
      "U14",
      "U16",
      "Seniori",
    ]);
    expect(categoriesSchema.parse("")).toEqual([]);
  });
  it("rejects categories that cannot be saved on a team", () => {
    expect(categoriesSchema.safeParse("a".repeat(51)).success).toBe(false);
  });
});
