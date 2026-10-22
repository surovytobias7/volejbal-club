import { z } from "zod";

export const attendanceStatus = z.enum([
  "present",
  "absent",
  "late",
  "excused",
]);
export type AttendanceStatus = z.infer<typeof attendanceStatus>;
export const attendanceLabels = {
  present: "Prítomný",
  absent: "Neprítomný",
  late: "Meškanie",
  excused: "Ospravedlnený",
} satisfies Record<AttendanceStatus, string>;

const changeSchema = z
  .object({
    player_id: z.uuid(),
    status: attendanceStatus.nullable(),
    reason: z.string().trim().max(200),
    expected_version: z.number().int().nonnegative().max(2147483646),
  })
  .refine((value) => value.status === "excused" || value.reason === "", {
    message: "Dôvod patrí iba k ospravedlnenej neúčasti.",
  });
export const attendanceInputSchema = z.object({
  event_id: z.uuid(),
  changes: z
    .array(changeSchema)
    .min(1)
    .max(1000)
    .refine(
      (values) =>
        new Set(values.map((value) => value.player_id)).size === values.length,
      "Hráč je v zozname viackrát.",
    ),
});
export const savedAttendanceSchema = z.array(
  z.object({
    player_id: z.uuid(),
    status: attendanceStatus.nullable(),
    reason: z.string(),
    version: z.number().int().positive(),
    updated_at: z.iso.datetime({ offset: true }),
  }),
);
export type AttendanceInput = z.infer<typeof attendanceInputSchema>;
export type SavedAttendance = z.infer<typeof savedAttendanceSchema>;
export type AttendanceSaveResult =
  | { records: SavedAttendance; error?: never; conflict?: never }
  | { error: string; conflict?: boolean; records?: never };
export type AttendanceDraft = {
  status: AttendanceStatus | null;
  reason: string;
};

export function attendanceChanges(
  players: {
    profile_id: string;
    attendance: AttendanceStatus | null;
    attendance_reason: string;
    attendance_version: number;
  }[],
  drafts: Record<string, AttendanceDraft>,
): AttendanceInput["changes"] {
  return players.flatMap((player) => {
    const draft = drafts[player.profile_id];
    if (
      !draft ||
      (draft.status === player.attendance &&
        draft.reason.trim() === player.attendance_reason)
    )
      return [];
    return [
      {
        player_id: player.profile_id,
        status: draft.status,
        reason: draft.reason.trim(),
        expected_version: player.attendance_version,
      },
    ];
  });
}
