"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NoteContext } from "@/lib/notes";

export type NoteFormState = {
  error?: string;
  success?: string;
  note?: { id: string; body: string; version: number };
  conflict?: { id: string; body: string; version: number };
};
export type NoteAction = (
  state: NoteFormState,
  data: FormData,
) => Promise<NoteFormState>;
export function NoteForm({
  action,
  context,
  note,
}: {
  action: NoteAction;
  context: NoteContext;
  note?: { id: string; body: string; version: number };
}) {
  const [body, setBody] = useState(note?.body ?? "");
  // Keep the version belonging to this draft even if another user refreshes the
  // surrounding RSC data. A stale draft must not overwrite their newer text.
  const [version, setVersion] = useState(note?.version);
  const [previousDraft, setPreviousDraft] = useState<string | null>(null);
  const [state, submit, pending] = useActionState<NoteFormState, FormData>(
    async (previous, data) => {
      try {
        const result = await action(previous, data);
        if (result.success && result.note) {
          setBody(note ? result.note.body : "");
          setVersion(result.note.version);
          setPreviousDraft(null);
        }
        return { ...result, note: result.note ?? previous.note };
      } catch {
        // Transport failures must not replace this form with an error boundary.
        return {
          note: previous.note,
          error:
            "Uloženie sa nepodarilo potvrdiť. Váš text zostal zachovaný. Skontrolujte pripojenie a zoznam poznámok pred ďalším pokusom.",
        };
      }
    },
    {},
  );
  const id = useId();
  const input = useRef<HTMLTextAreaElement>(null);
  const conflict =
    state.conflict?.version !== version ? state.conflict : undefined;
  const error = state.conflict && !conflict ? undefined : state.error;
  useEffect(() => {
    if (state.error) input.current?.focus();
  }, [state]);
  return (
    <form action={submit} className="action-form note-form" aria-busy={pending}>
      <input type="hidden" name="player_id" value={context.playerId ?? ""} />
      <input type="hidden" name="event_id" value={context.eventId ?? ""} />
      {note && (
        <>
          <input type="hidden" name="id" value={note.id} />
          <input type="hidden" name="version" value={version} />
        </>
      )}
      <div className="field">
        <label htmlFor={id}>Interná poznámka</label>
        <textarea
          ref={input}
          id={id}
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          maxLength={4000}
          required
          readOnly={pending}
          aria-invalid={!!error}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
        />
        <small id={`${id}-hint`} className="muted">
          Najviac 4 000 znakov. Uvádzajte iba informácie potrebné na vedenie
          tréningu.
        </small>
      </div>
      {error && (
        <p id={`${id}-error`} className="feedback feedback-error" role="alert">
          {error}
        </p>
      )}
      {conflict && (
        <div className="note-conflict" aria-label="Porovnanie verzií poznámky">
          <strong>Aktuálne uložený text</strong>
          <p
            className="note-body"
            tabIndex={0}
            aria-label="Aktuálne uložený text"
          >
            {conflict.body}
          </p>
          <p className="muted">
            Vyberte text, upravte ho a až potom uložte poznámku.
          </p>
          <div className="note-conflict-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setVersion(conflict.version);
                input.current?.focus();
              }}
            >
              Pokračovať s mojím textom
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setPreviousDraft(body);
                setBody(conflict.body);
                setVersion(conflict.version);
                input.current?.focus();
              }}
            >
              Použiť uložený text
            </Button>
          </div>
        </div>
      )}
      {previousDraft !== null && (
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            setBody(previousDraft);
            setPreviousDraft(null);
            input.current?.focus();
          }}
        >
          Vrátiť môj rozpracovaný text
        </Button>
      )}
      {state.success && (note ? body === state.note?.body : body === "") && (
        <p className="feedback feedback-success" role="status">
          {state.success}
        </p>
      )}
      <Button type="submit" disabled={pending || !!conflict}>
        {pending && (
          <LoaderCircle className="pending-icon" size={16} aria-hidden />
        )}
        {pending ? "Ukladám…" : note ? "Uložiť poznámku" : "Pridať poznámku"}
      </Button>
    </form>
  );
}
