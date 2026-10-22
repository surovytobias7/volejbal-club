import { z } from "zod";
import { attendanceStatus } from "@/lib/attendance";
export const eventRosterSchema = z.object({
  items: z.array(
    z.object({
      profile_id: z.uuid(),
      full_name: z.string(),
      active: z.boolean(),
      current_member: z.boolean(),
      can_respond: z.boolean(),
      availability: z
        .object({
          response: z.enum(["yes", "no", "maybe"]),
          reason: z.string().nullable(),
        })
        .nullable(),
      attendance: attendanceStatus.nullable(),
      attendance_reason: z.string(),
      attendance_version: z.number().int().nonnegative(),
      attendance_updated_at: z.iso.datetime({ offset: true }).nullable(),
    }),
  ),
  has_more: z.boolean(),
  total: z.number().int().nonnegative(),
  can_manage: z.boolean(),
});
export type EventRosterPlayer = z.infer<
  typeof eventRosterSchema
>["items"][number];
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
