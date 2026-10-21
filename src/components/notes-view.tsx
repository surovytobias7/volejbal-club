import { Empty } from "@/components/shared";
import { FormDialog } from "@/components/ui/dialog";
import { NoteForm, type NoteAction } from "@/features/note-form";
import { dateTime } from "@/lib/utils";
import type { InternalNote, NoteContext } from "@/lib/notes";
import type { ReactNode } from "react";

export function NotesView({
  notes,
  context,
  action,
  pagination,
}: {
  notes: InternalNote[];
  context: NoteContext;
  action: NoteAction;
  pagination?: ReactNode;
}) {
  return (
    <section
      className="notes-section"
      id="poznamky"
      aria-labelledby="notes-title"
    >
      <div className="notes-heading">
        <h2 id="notes-title">Interné poznámky</h2>
        <p>
          Vidí ich administrátor a priradení tréneri. Hráčom ani rodičom sa
          nezobrazujú.
        </p>
      </div>
      <div className="notes-layout">
        <details className="notes-compose" open>
          <summary>Pridať internú poznámku</summary>
          <NoteForm action={action} context={context} />
        </details>
        <div>
          {notes.length ? (
            <ol className="notes-list">
              {notes.map((note) => (
                <li key={note.id}>
                  <article>
                    <header className="note-meta">
                      <div>
                        <strong>{note.author_name}</strong>
                        <time dateTime={note.created_at}>
                          {dateTime(note.created_at)}
                        </time>
                      </div>
                      {note.can_edit && (
                        <FormDialog
                          title="Upraviť internú poznámku"
                          description="Zmeny zostanú v administrátorskom audite."
                          label="Upraviť"
                          variant="secondary"
                        >
                          <NoteForm
                            action={action}
                            context={context}
                            note={note}
                          />
                        </FormDialog>
                      )}
                    </header>
                    <p className="note-body">{note.body}</p>
                    {note.version > 1 && (
                      <small className="muted">
                        Upravené{" "}
                        <time dateTime={note.updated_at}>
                          {dateTime(note.updated_at)}
                        </time>
                      </small>
                    )}
                  </article>
                </li>
              ))}
            </ol>
          ) : (
            <Empty
              title="Zatiaľ bez interných poznámok"
              description="Zapíšte si pozorovanie z tréningu alebo podnet na ďalšiu prípravu."
            />
          )}
          {pagination}
        </div>
      </div>
    </section>
  );
}
