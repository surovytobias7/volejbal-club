import { z } from "zod";
import type { Role } from "@/lib/auth";

export const viewerContextSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  roles: z.array(z.enum(["admin", "coach", "player", "guardian"])).min(1),
  can_finance: z.boolean(),
});
export const memberPrivateDetailsSchema = z.object({
  birth_date: z.iso.date().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  account_linked: z.boolean().nullable(),
});
export const auditActorsSchema = z.array(
  z.object({
    user_id: z.uuid(),
    full_name: z.string(),
  }),
);
export function canBrowseMembers(roles: readonly Role[]) {
  return roles.includes("admin") || roles.includes("coach");
}
