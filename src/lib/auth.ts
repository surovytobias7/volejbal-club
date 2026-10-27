import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { database } from "@/lib/supabase/server";
import { publicEnvironment } from "@/lib/env";
import { viewerContextSchema } from "@/lib/access";

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
  const context = await db.rpc("viewer_context");
  if (context.error) throw new Error("Oprávnenia sa nepodarilo načítať.");
  if (!context.data) redirect("/prihlasenie?status=inactive");
  const profile = viewerContextSchema.parse(context.data);
  return {
    id: profile.id,
    name: profile.name,
    roles: profile.roles,
    canFinance: profile.can_finance,
    db,
  };
});

export async function requireAdmin() {
  const viewer = await requireViewer();
  if (!viewer.roles.includes("admin")) notFound();
  return viewer;
}
