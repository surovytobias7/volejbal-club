import { z } from "zod";

const count = z.number().int().nonnegative().safe();
export const guardianDashboardSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      full_name: z.string(),
      next_event: z
        .object({
          id: z.uuid(),
          title: z.string(),
          starts_at: z.iso.datetime({ offset: true }),
          venue: z.string(),
          response: z.enum(["yes", "no", "maybe"]).nullable(),
        })
        .nullable(),
      attendance: z.object({ recorded: count, present: count }),
      remaining: count,
    }),
  ),
  has_more: z.boolean(),
  total: count,
});
export type GuardianChild = z.infer<
  typeof guardianDashboardSchema
>["items"][number];
