import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { requireViewer, type Role } from "../../src/lib/auth";
import { Shell } from "../../src/components/layout";
import { Dashboard } from "../../src/features/dashboard";
import { hasManagedTeam } from "../../src/lib/team-access";
import Calendar from "../../src/app/klub/kalendar/page";
import Announcements from "../../src/app/klub/oznamy/page";
import { AttendanceSessions } from "../../src/features/attendance-sessions";

vi.mock("server-only", () => ({}));
vi.mock("../../src/lib/auth", () => ({ requireViewer: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/klub" }));
vi.mock("../../src/features/auth/actions", () => ({ logout: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const id = "00000000-0000-4000-8000-000000000004";
const team = "00000000-0000-4000-8000-000000000020";
let assigned = false;
let archived = false;
let failed = false;
const filters: Record<string, unknown> = {};
const db = {
  from: vi.fn((table: string) => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn((key: string, value: unknown) => {
        filters[key] = value;
        return query;
      }),
      limit: vi.fn(() => query),
      single: vi.fn(async () => ({
        data: { venue: "Testovacia hala" },
        error: null,
      })),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({
          data:
            table === "team_memberships" &&
            assigned &&
            !(filters["teams.archived"] === false && archived)
              ? [{ team_id: team, teams: { archived } }]
              : [],
          error: failed ? { message: "Private error" } : null,
        }).then(resolve),
    };
    return query;
  }),
  rpc: vi.fn(async () => ({
    data: { items: [], has_more: false, total: 0 },
    error: null,
  })),
};
function viewer(roles: Role[]) {
  const value = {
    id,
    name: "Fiktívny člen",
    roles,
    canFinance: false,
    db,
  } as unknown as Awaited<ReturnType<typeof requireViewer>>;
  vi.mocked(requireViewer).mockResolvedValue(value);
  return value;
}
beforeEach(() => {
  vi.clearAllMocks();
  assigned = archived = failed = false;
  for (const key of Object.keys(filters)) delete filters[key];
});

it.each([
  { roles: ["admin"], finance: true, members: true, admin: true },
  { roles: ["coach"], finance: false, members: true, admin: false },
  { roles: ["player"], finance: false, members: false, admin: false },
  { roles: ["player"], finance: true, members: false, admin: false },
  { roles: ["guardian"], finance: true, members: false, admin: false },
  { roles: ["guardian"], finance: false, members: false, admin: false },
  { roles: ["coach", "guardian"], finance: true, members: true, admin: false },
  { roles: ["coach", "player"], finance: false, members: true, admin: false },
] satisfies {
  roles: Role[];
  finance: boolean;
  members: boolean;
  admin: boolean;
}[])(
  "renders only eligible navigation for $roles (finance $finance)",
  (row) => {
    const shellProps = {
      roles: row.roles,
      finance: row.finance,
      name: "Fiktívny člen",
      club: "Testovací klub",
      children: null,
    };
    const html = renderToStaticMarkup(createElement(Shell, shellProps));
    for (const [href, visible] of [
      ["/klub/clenovia", row.members],
      ["/klub/platby", row.finance],
      ["/klub/nastavenia", row.admin],
      ["/klub/audit", row.admin],
    ] as const)
      expect(html.includes(`href="${href}"`)).toBe(visible);
    expect(html.includes('aria-label="Správa klubu"')).toBe(row.admin);
    expect(html).not.toContain('aria-disabled="true"');
  },
);

it.each([
  { roles: ["admin"], assigned: false, visible: true },
  { roles: ["coach"], assigned: true, visible: true },
  { roles: ["coach"], assigned: false, visible: false },
  { roles: ["coach", "guardian"], assigned: false, visible: false },
  { roles: ["player"], assigned: false, visible: false },
  { roles: ["guardian"], assigned: false, visible: false },
] satisfies { roles: Role[]; assigned: boolean; visible: boolean }[])(
  "gates creation and attendance shortcut by current coaching scope: $roles / $assigned",
  async (row) => {
    assigned = row.assigned;
    const v = viewer(row.roles);
    const canRecordAttendance = await hasManagedTeam(v);
    const dashboard = renderToStaticMarkup(
      createElement(Dashboard, {
        data: {
          name: v.name,
          roles: row.roles,
          canRecordAttendance,
          teamCount: 0,
          playerCount: 0,
          eventCount: 0,
          balance: null,
          participation: null,
          teams: {},
          events: [],
          announcements: [],
        },
      }),
    );
    expect(dashboard.includes("Zapísať dochádzku")).toBe(row.visible);
    const calendar = renderToStaticMarkup(
      await Calendar({ searchParams: Promise.resolve({}) }),
    );
    const announcements = renderToStaticMarkup(
      await Announcements({ searchParams: Promise.resolve({}) }),
    );
    expect(calendar.includes("Nová udalosť")).toBe(row.visible);
    expect(announcements.includes("Nový oznam")).toBe(row.visible);
    if (row.roles.some((role) => role === "coach")) {
      expect(filters.profile_id).toBe(id);
      expect(filters.kind).toBe("coach");
      expect(filters["teams.archived"]).toBe(false);
    }
  },
);

it("hides new-content controls for archived-only teams but retains history correction scope", async () => {
  assigned = archived = true;
  const v = viewer(["coach"]);
  expect(await hasManagedTeam(v)).toBe(true);
  expect(await hasManagedTeam(v, true)).toBe(false);
});
it("does not turn a failed authorization lookup into granted access", async () => {
  failed = true;
  await expect(hasManagedTeam(viewer(["coach"]))).rejects.toThrow(
    "Oprávnenia tímu sa nepodarilo načítať.",
  );
});
it.each([["player"], ["guardian"]] as Role[][])(
  "hides coach session navigation for %s without querying teams",
  async (...roles) => {
    viewer(roles);
    expect(await AttendanceSessions({})).toBeNull();
    expect(db.from).not.toHaveBeenCalled();
  },
);
it("hides session management for a team merely visible through another role", async () => {
  assigned = true;
  viewer(["coach", "guardian"]);
  expect(
    await AttendanceSessions({
      teamId: "00000000-0000-4000-8000-000000000099",
    }),
  ).toBeNull();
  expect(db.from).not.toHaveBeenCalledWith("events");
});
