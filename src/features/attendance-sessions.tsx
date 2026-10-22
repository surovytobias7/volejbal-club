import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { rows } from "@/lib/data";
import { dateTime, localToUtc } from "@/lib/utils";
import { EventList } from "@/components/shared";

export async function AttendanceSessions({ teamId }: { teamId?: string }) {
  const viewer = await requireViewer();
  if (!viewer.roles.some((role) => role === "coach" || role === "admin"))
    return null;
  let teamIds: string[] | undefined;
  if (!viewer.roles.includes("admin")) {
    teamIds = rows(
      await viewer.db
        .from("team_memberships")
        .select("team_id")
        .eq("profile_id", viewer.id)
        .eq("kind", "coach"),
    ).map((m) => m.team_id);
    if (!teamIds.length || (teamId && !teamIds.includes(teamId))) return null;
  }
  const today = dateTime(new Date().toISOString(), "yyyy-MM-dd");
  let query = viewer.db
    .from("events")
    .select("*, teams(name)")
    .eq("kind", "training")
    .neq("status", "cancelled")
    .lte("starts_at", localToUtc(`${today}T23:59:59`))
    .order("starts_at", { ascending: false })
    .limit(5);
  if (teamId) query = query.eq("team_id", teamId);
  if (teamIds) query = query.in("team_id", teamIds);
  const events = rows(await query);
  return (
    <section
      className="attendance-session-links"
      aria-label="Výber tréningu na zápis dochádzky"
    >
      <h2>Dnes a posledné tréningy</h2>
      {events.length ? (
        <EventList
          events={events}
          teams={Object.fromEntries(
            events.map((e) => [e.team_id, e.teams?.name ?? ""]),
          )}
        />
      ) : (
        <p className="muted">Zatiaľ nemáte tréning na zápis dochádzky.</p>
      )}
      <p>
        <Link
          className="text-link"
          href={`/klub/kalendar?view=agenda&kind=training${teamId ? `&team=${teamId}` : ""}`}
        >
          Vybrať iný tréning v kalendári
        </Link>
      </p>
    </section>
  );
}
