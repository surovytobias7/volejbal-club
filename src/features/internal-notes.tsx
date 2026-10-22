import { requireViewer } from "@/lib/auth";
import {
  notesCursor,
  notesHref,
  notesPageSchema,
  type NoteContext,
  type NotesSearch,
} from "@/lib/notes";
import { NotesView } from "@/components/notes-view";
import { Pagination } from "@/components/pagination";
import { saveInternalNote } from "@/features/note-actions";

export async function InternalNotes({
  context,
  search,
}: {
  context: NoteContext;
  search: NotesSearch;
}) {
  const viewer = await requireViewer();
  if (!viewer.roles.includes("admin") && !viewer.roles.includes("coach"))
    return null;
  const cursor = notesCursor(search);
  const result = await viewer.db.rpc("internal_notes_page", {
    p_player: context.playerId ?? null,
    p_event: context.eventId ?? null,
    p_before_at: cursor?.notesAt ?? null,
    p_before_id: cursor?.notesId ?? null,
  });
  const parsed = result.error ? null : notesPageSchema.safeParse(result.data);
  if (!parsed?.success)
    return (
      <section
        className="notes-section"
        id="poznamky"
        aria-labelledby="notes-error-title"
      >
        <h2 id="notes-error-title">Interné poznámky</h2>
        <p className="feedback feedback-error" role="alert">
          Poznámky sa nepodarilo načítať. Obnovte stránku a skúste to znova.
          Ostatné údaje môžete naďalej používať.
        </p>
      </section>
    );
  const data = parsed.data;
  if (!data.can_write) return null;
  const path = context.playerId
    ? `/klub/clenovia/${context.playerId}`
    : `/klub/kalendar/${context.eventId}`;
  const last = data.items.at(-1);
  return (
    <NotesView
      context={context}
      notes={data.items}
      action={saveInternalNote}
      pagination={
        <Pagination
          firstHref={notesHref(path, search)}
          continued={!!cursor}
          count={data.items.length}
          nextHref={
            data.has_more && last ? notesHref(path, search, last) : undefined
          }
        />
      }
    />
  );
}
