import { z } from "zod";
const timestamp = z.iso.datetime({ offset: true });
export const calendarCursorSchema = z.object({
  afterAt: timestamp,
  afterId: z.uuid(),
});
export const calendarPageSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      team_id: z.uuid(),
      title: z.string(),
      kind: z.string(),
      starts_at: timestamp,
      ends_at: timestamp,
      venue: z.string(),
      status: z.string(),
      description: z.string(),
      team_name: z.string().nullable(),
      participant_count: z.number().int().nonnegative(),
      pending_count: z.number().int().nonnegative(),
    }),
  ),
  has_more: z.boolean(),
  total: z.number().int().nonnegative(),
});
