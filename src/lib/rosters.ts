import { z } from "zod";
export const eventRosterSchema = z.object({
  items: z.array(
    z.object({
      profile_id: z.uuid(),
      full_name: z.string(),
      active: z.boolean(),
      can_respond: z.boolean(),
      availability: z
        .object({
          response: z.enum(["yes", "no", "maybe"]),
          reason: z.string().nullable(),
        })
        .nullable(),
      attendance: z.enum(["present", "absent", "excused"]).nullable(),
    }),
  ),
  has_more: z.boolean(),
  total: z.number().int().nonnegative(),
  can_manage: z.boolean(),
});
export const teamRosterSchema = z.object({
  items: z.array(
    z.object({
      profile_id: z.uuid(),
      full_name: z.string(),
      kind: z.enum(["player", "coach"]),
    }),
  ),
  has_more: z.boolean(),
});
