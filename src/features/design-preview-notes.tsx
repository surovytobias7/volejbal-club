"use client";

import { useState } from "react";
import { NotesView } from "@/components/notes-view";
import {
  noteInputSchema,
  type InternalNote,
  type NoteContext,
} from "@/lib/notes";
import type { NoteFormState } from "@/features/note-form";

// Only the explicitly gated /ukazka imports this local interaction preview.
// It never reads or writes Supabase, and has no persistence across reloads.
export function DesignPreviewNotes({
  context,
  at,
}: {
  context: NoteContext;
  at: string;
}) {
  const [notes, setNotes] = useState<InternalNote[]>([
    {
      id: "00000000-0000-4000-8000-000000000091",
      author_id: "00000000-0000-4000-8000-000000000002",
      author_name: "Peter Ukážkový",
      body: "Príjem podania je istejší. Na ďalšom tréningu sa zamerať na presun pod loptu a komunikáciu v poli.",
      created_at: at,
      updated_at: at,
      version: 1,
      can_edit: true,
    },
    {
      id: "00000000-0000-4000-8000-000000000092",
      author_id: "00000000-0000-4000-8000-000000000003",
      author_name: "Jana Ukážková",
      body: "V hernej príprave zopakovať postavenie pri príjme.",
      created_at: at,
      updated_at: at,
      version: 1,
      can_edit: false,
    },
  ]);
  async function previewAction(
    _: NoteFormState,
    form: FormData,
  ): Promise<NoteFormState> {
    const parsed = noteInputSchema.safeParse({
      id: form.get("id") || undefined,
      version: form.get("version") ? Number(form.get("version")) : undefined,
      player_id: context.playerId ?? null,
      event_id: context.eventId ?? null,
      body: form.get("body"),
    });
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const input = parsed.data;
    const previous = input.id
      ? notes.find((note) => note.id === input.id)
      : undefined;
    if (input.id && (!previous?.can_edit || previous.version !== input.version))
      return {
        error: "Poznámka sa zmenila alebo ju nemôžete upraviť. Obnovte ukážku.",
      };
    const now = new Date().toISOString();
    const note: InternalNote = {
      id: previous?.id ?? crypto.randomUUID(),
      author_id: previous?.author_id ?? "00000000-0000-4000-8000-000000000002",
      author_name: previous?.author_name ?? "Peter Ukážkový",
      body: input.body,
      created_at: previous?.created_at ?? now,
      updated_at: now,
      version: (previous?.version ?? 0) + 1,
      can_edit: true,
    };
    setNotes((current) =>
      previous
        ? current.map((item) => (item.id === note.id ? note : item))
        : [note, ...current],
    );
    return {
      success:
        "Ukážka poznámky bola aktualizovaná. Po obnovení stránky zmeny zmiznú.",
      note,
    };
  }
  return <NotesView context={context} notes={notes} action={previewAction} />;
}
