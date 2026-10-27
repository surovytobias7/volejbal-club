import "server-only";
import type { requireViewer } from "@/lib/auth";

// Visibility uses current memberships through the caller's RLS. A readable
// team (e.g. through a child) does not grant coaching controls. Mutations still
// authorize the specific team independently.
export async function hasManagedTeam(
  viewer: Awaited<ReturnType<typeof requireViewer>>,
  activeOnly = false,
) {
  if (viewer.roles.includes("admin")) return true;
  if (!viewer.roles.includes("coach")) return false;
  let query = viewer.db
    .from("team_memberships")
    .select("team_id, teams!inner(archived)")
    .eq("profile_id", viewer.id)
    .eq("kind", "coach");
  if (activeOnly) query = query.eq("teams.archived", false);
  const result = await query.limit(1);
  if (result.error) throw new Error("Oprávnenia tímu sa nepodarilo načítať.");
  return !!result.data?.length;
}
