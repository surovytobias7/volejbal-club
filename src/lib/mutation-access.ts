import "server-only";
import type { requireViewer } from "@/lib/auth";

type Viewer = Awaited<ReturnType<typeof requireViewer>>;
const denied = () => new Error("Na túto zmenu nemáte oprávnenie.");

export async function requireManagedTeam(v: Viewer, teamId: string) {
  if (v.roles.includes("admin")) return;
  if (!v.roles.includes("coach")) throw denied();
  const membership = await v.db
    .from("team_memberships")
    .select("team_id")
    .eq("team_id", teamId)
    .eq("profile_id", v.id)
    .eq("kind", "coach")
    .maybeSingle();
  if (membership.error || !membership.data) throw denied();
}

export async function requireEvent(
  v: Viewer,
  eventId: string,
  manage: boolean,
) {
  if (manage && !v.roles.some((r) => r === "admin" || r === "coach"))
    throw denied();
  const result = await v.db
    .from("events")
    .select("id,team_id,status")
    .eq("id", eventId)
    .maybeSingle();
  if (result.error || !result.data) throw denied();
  if (manage) await requireManagedTeam(v, result.data.team_id);
  return result.data;
}

export async function requireParticipation(
  v: Viewer,
  eventId: string,
  playerId: string,
  actual: boolean,
) {
  if (!actual && !(playerId === v.id && v.roles.includes("player"))) {
    if (!v.roles.includes("guardian")) throw denied();
    const link = await v.db
      .from("guardian_players")
      .select("player_id")
      .eq("guardian_id", v.id)
      .eq("player_id", playerId)
      .maybeSingle();
    if (link.error || !link.data) throw denied();
  }
  const event = await requireEvent(v, eventId, actual);
  if (event.status === "cancelled")
    throw new Error("Zrušená udalosť neprijíma zmeny účasti.");
  const [membership, profile, role] = await Promise.all([
    v.db
      .from("team_memberships")
      .select("profile_id")
      .eq("team_id", event.team_id)
      .eq("profile_id", playerId)
      .eq("kind", "player")
      .maybeSingle(),
    v.db
      .from("profiles")
      .select("id")
      .eq("id", playerId)
      .eq("active", true)
      .maybeSingle(),
    v.db
      .from("user_roles")
      .select("profile_id")
      .eq("profile_id", playerId)
      .eq("role", "player")
      .maybeSingle(),
  ]);
  if ([membership, profile, role].some((r) => r.error || !r.data))
    throw denied();
}

export async function requireManagedAnnouncement(v: Viewer, id: string) {
  if (!v.roles.some((r) => r === "admin" || r === "coach")) throw denied();
  const access = await v.db.rpc("can_manage_announcement", { p_id: id });
  if (access.error || access.data !== true) throw denied();
}
