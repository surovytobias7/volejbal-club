import { Dashboard } from "@/features/dashboard";
import { requireViewer } from "@/lib/auth";
import { hasManagedTeam } from "@/lib/team-access";
import { rows, one } from "@/lib/data";
import { financeSummarySchema } from "@/lib/finance";
import { dashboardSummarySchema } from "@/lib/directories";
import { guardianDashboardSchema } from "@/lib/guardian-dashboard";
import {
  playerResponsesSchema,
  withPlayerResponses,
} from "@/lib/player-dashboard";
import { z } from "zod";
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ childAfter?: string }>;
}) {
  const v = await requireViewer();
  const childAfter = z.uuid().safeParse((await searchParams).childAfter).data;
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
    canRecordAttendance,
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
    v.db.rpc("guardian_dashboard", { p_at: at, p_after: childAfter ?? null }),
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
    hasManagedTeam(v),
  ]);
  const stats = dashboardSummarySchema.parse(one(statistics));
  const summary = financeSummarySchema.parse(one(charges));
  const family = guardianDashboardSchema.parse(one(children));
  const upcoming = rows(events);
  const teamIds = [...new Set(upcoming.map((e) => e.team_id))];
  const player = v.roles.includes("player") && upcoming.length > 0;
  const [eventTeams, memberships, responses] = await Promise.all([
    teamIds.length
      ? v.db.from("teams").select("id,name").in("id", teamIds)
      : Promise.resolve({ data: [], error: null }),
    player
      ? v.db
          .from("team_memberships")
          .select("team_id")
          .eq("profile_id", v.id)
          .eq("kind", "player")
          .in("team_id", teamIds)
      : Promise.resolve({ data: [], error: null }),
    player
      ? v.db
          .from("availability")
          .select("event_id,response")
          .eq("player_id", v.id)
          .in(
            "event_id",
            upcoming.map((event) => event.id),
          )
      : Promise.resolve({ data: [], error: null }),
  ]);
  const teams = rows(eventTeams);
  const personalEvents = withPlayerResponses(
    upcoming,
    rows(memberships).map((m) => m.team_id),
    playerResponsesSchema.parse(rows(responses)),
  );
  const finance = v.canFinance;
  return (
    <Dashboard
      data={{
        name: v.name,
        roles: v.roles,
        canRecordAttendance,
        pendingCount: stats.pending_count,
        teamCount: stats.team_count,
        playerCount: stats.player_count,
        eventCount: stats.event_count,
        balance: finance ? summary.remaining : null,
        participation: stats.participation,
        events: personalEvents,
        teams: Object.fromEntries(teams.map((t) => [t.id, t.name])),
        teamCards: Object.fromEntries(
          rows(visibleTeams).map((t) => [t.id, t.name]),
        ),
        childCount: family.total,
        childContinued: !!childAfter,
        childNextHref:
          family.has_more && family.items.at(-1)
            ? `/klub?childAfter=${family.items.at(-1)!.id}#deti`
            : undefined,
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
                internal_notes: "Interná poznámka",
              } as Record<string, string>
            )[a.table_name] ?? "Klubová evidencia",
        })),
        announcements: rows(announcements),
        children: family.items,
      }}
    />
  );
}
