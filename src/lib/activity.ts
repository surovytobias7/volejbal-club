import { z } from "zod";
export const attendanceStatus = z.enum(["present", "absent", "excused"]);
const timestamp = z.iso.datetime({ offset: true });
const count = z.number().int().nonnegative().safe();
export const attendancePageSchema = z.object({
  items: z.array(
    z.object({
      event_id: z.uuid(),
      player_id: z.uuid(),
      updated_at: timestamp,
      status: attendanceStatus,
      full_name: z.string().nullable(),
      title: z.string().nullable(),
      starts_at: timestamp.nullable(),
    }),
  ),
  has_more: z.boolean(),
  total: count,
  present: count,
  absent: count,
  excused: count,
});
export const attendanceCursorSchema = z.object({
  at: timestamp,
  event: z.uuid(),
  cursorPlayer: z.uuid(),
});
export const announcementCursorSchema = z.object({
  at: timestamp,
  id: z.uuid(),
  important: z.enum(["true", "false"]),
});
export const announcementPageSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      title: z.string(),
      body: z.string(),
      team_id: z.uuid().nullable(),
      extra_team_ids: z.array(z.uuid()),
      recipient_ids: z.array(z.uuid()),
      can_manage: z.boolean(),
      author_name: z.string(),
      important: z.boolean(),
      archived: z.boolean(),
      created_at: timestamp,
    }),
  ),
  has_more: z.boolean(),
});
