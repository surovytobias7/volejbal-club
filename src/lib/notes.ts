import { z } from "zod";

export const savedNoteSchema = z.object({
  id: z.uuid(),
  body: z.string().min(1).max(4000),
  version: z.number().int().positive(),
});

export const noteInputSchema = z
  .object({
    id: z.uuid().optional(),
    version: z.number().int().positive().optional(),
    player_id: z.uuid().nullable(),
    event_id: z.uuid().nullable(),
    body: z
      .string()
      .trim()
      .min(1, "Napíšte poznámku.")
      .max(4000, "Poznámka môže mať najviac 4 000 znakov."),
  })
  .refine(
    (v) => Number(v.player_id !== null) + Number(v.event_id !== null) === 1,
    "Vyberte hráča alebo tréning.",
  )
  .refine(
    (v) => !v.id || !!v.version,
    "Chýba verzia poznámky. Obnovte stránku.",
  );

export const notesPageSchema = z.object({
  can_write: z.boolean(),
  has_more: z.boolean(),
  items: z.array(
    z.object({
      id: z.uuid(),
      body: z.string(),
      author_id: z.uuid(),
      author_name: z.string(),
      created_at: z.iso.datetime({ offset: true }),
      updated_at: z.iso.datetime({ offset: true }),
      version: z.number().int().positive(),
      can_edit: z.boolean(),
    }),
  ),
});
export type InternalNote = z.infer<typeof notesPageSchema>["items"][number];
export type NoteContext =
  { playerId: string; eventId?: never } | { eventId: string; playerId?: never };
export type NotesSearch = Record<string, string | string[] | undefined>;
const cursorSchema = z.object({
  notesAt: z.iso.datetime({ offset: true }),
  notesId: z.uuid(),
});
export function notesCursor(search: NotesSearch) {
  const parsed = cursorSchema.safeParse(search);
  return parsed.success ? parsed.data : null;
}
export function notesHref(
  path: string,
  search: NotesSearch,
  cursor?: { created_at: string; id: string },
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (typeof value === "string" && key !== "notesAt" && key !== "notesId")
      query.set(key, value);
  }
  if (cursor) {
    query.set("notesAt", cursor.created_at);
    query.set("notesId", cursor.id);
  }
  return `${path}${query.size ? `?${query}` : ""}#poznamky`;
}
