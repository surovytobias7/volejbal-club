import { beforeEach, expect, it, vi } from "vitest";
import { requireViewer, type Role } from "../../src/lib/auth";
import Members from "../../src/app/klub/clenovia/page";
import Payments from "../../src/app/klub/platby/page";
import Charge from "../../src/app/klub/platby/[id]/page";

vi.mock("server-only", () => ({}));
vi.mock("../../src/lib/auth", () => ({
  requireViewer: vi.fn(),
  roleNames: {},
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
const db = { from: vi.fn(), rpc: vi.fn() };
beforeEach(() => vi.clearAllMocks());
function viewer(roles: Role[]) {
  vi.mocked(requireViewer).mockResolvedValue({
    id: "00000000-0000-4000-8000-000000000004",
    name: "Fiktívny člen",
    roles,
    canFinance: false,
    db,
  } as unknown as Awaited<ReturnType<typeof requireViewer>>);
}
it.each(["player", "guardian"] as const)(
  "rejects direct member-administration navigation for %s before querying a directory",
  async (role) => {
    viewer([role]);
    await expect(
      Members({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("NOT_FOUND");
    expect(db.rpc).not.toHaveBeenCalled();
    expect(db.from).not.toHaveBeenCalled();
  },
);
it.each(["coach", "player", "guardian"] as const)(
  "rejects finance routes when %s has no current eligible financial scope",
  async (role) => {
    viewer([role]);
    await expect(
      Payments({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("NOT_FOUND");
    await expect(
      Charge({
        params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000040" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NOT_FOUND");
    expect(db.rpc).not.toHaveBeenCalled();
    expect(db.from).not.toHaveBeenCalled();
  },
);
