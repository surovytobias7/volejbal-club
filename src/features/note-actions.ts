"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth";
import { noteInputSchema, savedNoteSchema } from "@/lib/notes";
import type { NoteFormState } from "@/features/note-form";

export async function saveInternalNote(
  _: NoteFormState,
  form: FormData,
): Promise<NoteFormState> {
  const viewer = await requireViewer();
  if (!viewer.roles.includes("admin") && !viewer.roles.includes("coach"))
    return { error: "Na interné poznámky nemáte oprávnenie." };
  const parsed = noteInputSchema.safeParse({
    id: form.get("id") || undefined,
    version: form.get("version") ? Number(form.get("version")) : undefined,
    player_id: form.get("player_id") || null,
    event_id: form.get("event_id") || null,
    body: form.get("body"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const input = parsed.data;
  const { db } = viewer;
  try {
    const permission = await db.rpc("can_access_internal_notes", {
      p_player: input.player_id,
      p_event: input.event_id,
    });
    if (permission.error)
      return {
        error: "Prístup k poznámke sa nepodarilo overiť. Skúste to znova.",
      };
    if (!permission.data)
      return { error: "K tomuto hráčovi alebo tréningu už nemáte prístup." };
    if (input.id) {
      const current = await db
        .from("internal_notes")
        .select("author_id,player_id,event_id")
        .eq("id", input.id)
        .maybeSingle();
      if (
        current.error ||
        !current.data ||
        (current.data.author_id !== viewer.id &&
          !viewer.roles.includes("admin")) ||
        current.data.player_id !== input.player_id ||
        current.data.event_id !== input.event_id
      )
        return { error: "Túto poznámku nemôžete upravovať." };
    }
    const result = input.id
      ? await db
          .from("internal_notes")
          .update({ body: input.body })
          .eq("id", input.id)
          .eq("version", input.version!)
          .select("id,body,version")
          .maybeSingle()
      : await db
          .from("internal_notes")
          .insert({
            player_id: input.player_id,
            event_id: input.event_id,
            body: input.body,
          })
          .select("id,body,version")
          .single();
    if (result.error)
      return {
        error:
          "Poznámku sa nepodarilo uložiť. Text zostal vo formulári; skúste to znova.",
      };
    if (!result.data && input.id) {
      // A zero-row UPDATE can mean a concurrent edit or revoked access. Re-read
      // through RLS and recheck edit scope before returning any private text.
      const latest = await db
        .from("internal_notes")
        .select("id,body,version,author_id,player_id,event_id")
        .eq("id", input.id)
        .maybeSingle();
      const snapshot = savedNoteSchema.safeParse(latest.data);
      if (
        !latest.error &&
        latest.data &&
        snapshot.success &&
        snapshot.data.id === input.id &&
        snapshot.data.version > input.version! &&
        latest.data.player_id === input.player_id &&
        latest.data.event_id === input.event_id &&
        (latest.data.author_id === viewer.id || viewer.roles.includes("admin"))
      )
        return {
          error:
            "Poznámku medzitým upravil niekto iný. Váš text zostal zachovaný. Porovnajte ho s uloženou verziou.",
          conflict: snapshot.data,
        };
      return {
        error:
          "Poznámka sa medzitým zmenila alebo už nemáte prístup. Text zostal vo formulári; skúste to znova.",
      };
    }
    const saved = savedNoteSchema.safeParse(result.data);
    if (
      !saved.success ||
      saved.data.body !== input.body ||
      (input.id &&
        (saved.data.id !== input.id ||
          saved.data.version !== input.version! + 1)) ||
      (!input.id && saved.data.version !== 1)
    )
      return {
        error:
          "Uloženie sa nepodarilo potvrdiť. Text zostal vo formulári. Pred ďalším pridaním skontrolujte zoznam poznámok.",
      };
    revalidatePath(
      input.player_id
        ? `/klub/clenovia/${input.player_id}`
        : `/klub/kalendar/${input.event_id}`,
    );
    revalidatePath("/klub/audit");
    revalidatePath("/klub");
    return {
      success: input.id
        ? "Poznámka bola upravená."
        : "Interná poznámka bola pridaná.",
      note: saved.data,
    };
  } catch {
    return {
      error:
        "Uloženie sa nepodarilo potvrdiť. Text zostal vo formulári. Skontrolujte pripojenie a zoznam poznámok pred ďalším pokusom.",
    };
  }
}
