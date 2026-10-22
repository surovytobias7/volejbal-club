import { z } from "zod";
import { attendanceStatus } from "@/lib/attendance";
export { attendanceStatus } from "@/lib/attendance";
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
  late: count,
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
      audience: z.enum(["club", "teams", "people"]),
      can_manage: z.boolean(),
      author_name: z.string(),
      important: z.boolean(),
      archived: z.boolean(),
      created_at: timestamp,
    }),
  ),
  has_more: z.boolean(),
});
