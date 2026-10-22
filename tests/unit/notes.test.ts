import { describe, expect, it } from "vitest";
import { noteInputSchema, notesCursor, notesHref } from "../../src/lib/notes";
const id = "00000000-0000-4000-8000-000000000030";
const base = { player_id: id, event_id: null, body: "  Práca na podaní.  " };

describe("internal note input and navigation", () => {
  it("trims notes and requires exactly one valid subject", () => {
    expect(noteInputSchema.parse(base).body).toBe("Práca na podaní.");
    expect(
      noteInputSchema.safeParse({ ...base, player_id: null }).success,
    ).toBe(false);
    expect(noteInputSchema.safeParse({ ...base, event_id: id }).success).toBe(
      false,
    );
    expect(
      noteInputSchema.safeParse({ ...base, player_id: "bad" }).success,
    ).toBe(false);
  });
  it("rejects empty, long or unversioned edits", () => {
    for (const body of [" \n\t ", "x".repeat(4001)])
      expect(noteInputSchema.safeParse({ ...base, body }).success).toBe(false);
    expect(noteInputSchema.safeParse({ ...base, id }).success).toBe(false);
    expect(noteInputSchema.safeParse({ ...base, id, version: 1 }).success).toBe(
      true,
    );
  });
  it("retains roster and family filters while paging notes", () => {
    const at = "2026-10-16T09:00:00Z";
    const path = `/klub/clenovia/${id}`;
    const url = new URL(
      notesHref(
        path,
        { q: "Žiačky & tréning", childAfter: id },
        { id, created_at: at },
      ),
      "https://club.invalid",
    );
    const search = Object.fromEntries(url.searchParams);
    expect(notesCursor(search)).toEqual({ notesAt: at, notesId: id });
    expect(search.q).toBe("Žiačky & tréning");
    expect(search.childAfter).toBe(id);
    expect(url.hash).toBe("#poznamky");
    expect(notesHref(path, search)).not.toContain("notesAt");
    expect(notesCursor({ notesId: id, notesAt: [at] })).toBeNull();
    expect(notesCursor({ notesId: "bad", notesAt: at })).toBeNull();
  });
});
