import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { database } from "@/lib/supabase/server";
import { publicEnvironment } from "@/lib/env";

export type Role = "admin" | "coach" | "player" | "guardian";
export const roleNames: Record<Role, string> = {
  admin: "Administrátor",
  coach: "Tréner",
  player: "Hráč",
  guardian: "Rodič",
};
export const requireViewer = cache(async () => {
  if (!publicEnvironment()) redirect("/nastavenie");
  const db = await database();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) redirect("/prihlasenie");
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("id, full_name, active")
    .eq("user_id", user.id)
    .single();
  if (profileError || !profile?.active)
    redirect("/prihlasenie?status=inactive");
  const { data: roles, error: roleError } = await db
    .from("user_roles")
    .select("role")
    .eq("profile_id", profile.id);
  if (roleError) throw new Error("Oprávnenia sa nepodarilo načítať.");
  return {
    id: profile.id as string,
    name: profile.full_name as string,
    roles: (roles || []).map((r) => r.role as Role),
    db,
  };
});

export async function requireAdmin() {
  const viewer = await requireViewer();
  if (!viewer.roles.includes("admin"))
    throw new Error("Na túto zmenu nemáte oprávnenie.");
  return viewer;
}
