import { Dashboard } from "@/features/dashboard";
import { requireViewer } from "@/lib/auth";
import { rows, one } from "@/lib/data";
import { financeSummarySchema } from "@/lib/finance";
import { dashboardSummarySchema } from "@/lib/directories";
export default async function DashboardPage() {
  const v = await requireViewer();
  const reminders = await v.db.rpc("refresh_my_reminders");
  if (reminders.error) throw new Error("Pripomienky sa nepodarilo načítať.");
  const at = new Date().toISOString();
  const [
    statistics,
    events,
    announcements,
    charges,
    children,
    visibleTeams,
    activity,
  ] = await Promise.all([
    v.db.rpc("dashboard_summary", { p_at: at }),
    v.db
      .from("events")
      .select("*")
      .gte("starts_at", at)
      .eq("status", "scheduled")
      .order("starts_at")
      .order("id")
      .limit(5),
    v.db
      .from("announcements")
      .select("id,title,body,important,created_at")
      .eq("archived", false)
      .order("important", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id")
      .limit(3),
    v.db.rpc("finance_summary", { p_charge_id: null }),
    v.db
      .from("guardian_players")
      .select(
        "player_id,profiles!guardian_players_player_id_fkey(id,full_name)",
        { count: "exact" },
      )
      .eq("guardian_id", v.id)
      .order("player_id")
      .limit(4),
    v.db
      .from("teams")
      .select("id,name")
      .eq("archived", false)
      .order("name")
      .order("id")
      .limit(4),
    v.roles.includes("admin")
      ? v.db
          .from("audit_logs")
          .select("id,created_at,table_name,operation")
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const stats = dashboardSummarySchema.parse(one(statistics));
  const summary = financeSummarySchema.parse(one(charges));
  const upcoming = rows(events);
  const teamIds = [...new Set(upcoming.map((e) => e.team_id))];
  const teams = teamIds.length
    ? rows(await v.db.from("teams").select("id,name").in("id", teamIds))
    : [];
  const finance =
    v.roles.includes("admin") ||
    v.roles.includes("guardian") ||
    summary.count > 0;
  return (
    <Dashboard
      data={{
        name: v.name,
        roles: v.roles,
        pendingCount: stats.pending_count,
        teamCount: stats.team_count,
        playerCount: stats.player_count,
        eventCount: stats.event_count,
        balance: finance ? summary.remaining : null,
        participation: stats.participation,
        events: upcoming,
        teams: Object.fromEntries(teams.map((t) => [t.id, t.name])),
        teamCards: Object.fromEntries(
          rows(visibleTeams).map((t) => [t.id, t.name]),
        ),
        childCount: children.count ?? 0,
        recentActivity: rows(activity).map((a) => ({
          id: a.id,
          created_at: a.created_at,
          label:
            (
              {
                profiles: "Členský profil",
                member_details: "Kontaktné údaje",
                user_roles: "Prístupové roly",
                teams: "Tím",
                team_memberships: "Členstvo v tíme",
                guardian_players: "Rodinné prepojenie",
                events: "Udalosť",
                attendance: "Dochádzka",
                fee_plans: "Poplatkový plán",
                charges: "Členský poplatok",
                payments: "Platba",
                charge_adjustments: "Oprava poplatku",
                announcements: "Oznam",
                club_settings: "Nastavenia klubu",
              } as Record<string, string>
            )[a.table_name] ?? "Klubová evidencia",
        })),
        announcements: rows(announcements),
        children: rows(children).map(
          (c) => c.profiles as unknown as { id: string; full_name: string },
        ),
      }}
    />
  );
}
