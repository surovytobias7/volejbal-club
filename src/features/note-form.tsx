"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NoteContext } from "@/lib/notes";

export type NoteFormState = {
  error?: string;
  success?: string;
  note?: { id: string; body: string; version: number };
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
  const [initialVersion] = useState(note?.version);
  const [state, submit, pending] = useActionState<NoteFormState, FormData>(
    async (previous, data) => {
      const result = await action(previous, data);
      if (result.success) setBody(note ? (result.note?.body ?? body) : "");
      return { ...result, note: result.note ?? previous.note };
    },
    {},
  );
  const id = useId();
  const input = useRef<HTMLTextAreaElement>(null);
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
          <input
            type="hidden"
            name="version"
            value={state.note?.version ?? initialVersion}
          />
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
          aria-invalid={!!state.error}
          aria-describedby={`${id}-hint${state.error ? ` ${id}-error` : ""}`}
        />
        <small id={`${id}-hint`} className="muted">
          Najviac 4 000 znakov. Uvádzajte iba informácie potrebné na vedenie
          tréningu.
        </small>
      </div>
      {state.error && (
        <p id={`${id}-error`} className="feedback feedback-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="feedback feedback-success" role="status">
          {state.success}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending && (
          <LoaderCircle className="pending-icon" size={16} aria-hidden />
        )}
        {pending ? "Ukladám…" : note ? "Uložiť poznámku" : "Pridať poznámku"}
      </Button>
    </form>
  );
}
