import { beforeEach, expect, it, vi } from "vitest";
import type { Role } from "../../src/lib/auth";
import Settings from "../../src/app/klub/nastavenia/page";
import Audit from "../../src/app/klub/audit/page";
import FeePlans from "../../src/app/klub/platby/plany/page";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  redirect: () => {
    throw new Error("REDIRECT");
  },
}));
vi.mock("../../src/lib/env", () => ({ publicEnvironment: () => true }));
const { db } = vi.hoisted(() => ({
  db: {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "test-auth" } },
        error: null,
      })),
    },
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));
vi.mock("../../src/lib/supabase/server", () => ({ database: async () => db }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
it.each([
  ["coach"],
  ["player"],
  ["guardian"],
  ["coach", "guardian"],
  ["coach", "player"],
] as Role[][])(
  "uses not-found fallbacks for admin pages with roles %s",
  async (...roles) => {
    db.rpc.mockResolvedValue({
      data: {
        id: "00000000-0000-4000-8000-000000000004",
        name: "Fiktívny člen",
        roles,
        can_finance: true,
      },
      error: null,
    });
    await expect(Settings()).rejects.toThrow("NOT_FOUND");
    await expect(Audit({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "NOT_FOUND",
    );
    await expect(
      FeePlans({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("NOT_FOUND");
    expect(db.from).not.toHaveBeenCalled();
    expect(db.rpc.mock.calls.every(([name]) => name === "viewer_context")).toBe(
      true,
    );
  },
);
