"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth";
import { z } from "zod";
import { loadEventRoster } from "@/lib/event-roster";
import {
  attendanceInputSchema,
  savedAttendanceSchema,
  type AttendanceInput,
  type AttendanceSaveResult,
} from "@/lib/attendance";

export async function reloadAttendance(eventId: string) {
  const viewer = await requireViewer();
  if (
    !z.uuid().safeParse(eventId).success ||
    !viewer.roles.some((role) => role === "admin" || role === "coach")
  )
    return { error: "K dochádzke už nemáte prístup." };
  try {
    const roster = await loadEventRoster(viewer.db, eventId);
    if (!roster.canManage) return { error: "K dochádzke už nemáte prístup." };
    return { players: roster.players };
  } catch {
    return {
      error: "Aktuálne záznamy sa nepodarilo načítať. Skúste to znova.",
    };
  }
}

export async function saveAttendance(
  input: AttendanceInput,
): Promise<AttendanceSaveResult> {
  const viewer = await requireViewer();
  if (!viewer.roles.some((role) => role === "admin" || role === "coach"))
    return { error: "Na zápis skutočnej dochádzky nemáte oprávnenie." };
  const parsed = attendanceInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      error:
        "Skontrolujte záznamy a dôvody ospravedlnenia (najviac 200 znakov).",
    };
  const { db } = viewer;
  const event = await db
    .from("events")
    .select("team_id,status")
    .eq("id", parsed.data.event_id)
    .maybeSingle();
  if (event.error)
    return {
      error:
        "Tréning sa nepodarilo overiť. Zmeny zostali rozpracované; skúste to znova.",
    };
  if (!event.data || event.data.status === "cancelled")
    return { error: "Udalosť je zrušená alebo k nej už nemáte prístup." };
  if (!viewer.roles.includes("admin")) {
    const membership = await db
      .from("team_memberships")
      .select("profile_id")
      .eq("team_id", event.data.team_id)
      .eq("profile_id", viewer.id)
      .eq("kind", "coach")
      .maybeSingle();
    if (membership.error || !membership.data)
      return {
        error: "Dochádzku môžete zapisovať iba svojim prideleným tímom.",
      };
  }
  const result = await db.rpc("save_attendance", {
    p_event: parsed.data.event_id,
    p_changes: parsed.data.changes,
  });
  if (result.error) {
    if (result.error.code === "40001")
      return {
        error:
          "Dochádzku medzitým upravil niekto iný. Vaše zmeny zostali rozpracované. Načítajte aktuálne záznamy a skontrolujte označených hráčov.",
        conflict: true,
      };
    return {
      error:
        "Dochádzku sa nepodarilo uložiť. Zmeny zostali rozpracované. Skúste to znova; ak sa zmenil tím alebo oprávnenia, obnovte stránku.",
    };
  }
  const records = savedAttendanceSchema.safeParse(result.data);
  if (
    !records.success ||
    records.data.length !== parsed.data.changes.length ||
    !parsed.data.changes.every((change) =>
      records.data.some((record) => record.player_id === change.player_id),
    )
  )
    return {
      error:
        "Uloženie sa nepodarilo potvrdiť. Zmeny zostali rozpracované; skúste uloženie zopakovať.",
    };
  revalidatePath(`/klub/kalendar/${parsed.data.event_id}`);
  revalidatePath(`/klub/timy/${event.data.team_id}`);
  revalidatePath("/klub/dochadzka");
  revalidatePath("/klub/audit");
  revalidatePath("/klub");
  return { records: records.data };
}
