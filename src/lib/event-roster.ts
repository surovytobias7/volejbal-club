import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { one } from "@/lib/data";
import { eventRosterSchema, type EventRosterPlayer } from "@/lib/rosters";

// Collect every page before offering bulk marking. Never silently mark only the
// first PostgREST page or only the players matching a UI search.
export async function loadEventRoster(
  db: SupabaseClient<Database>,
  eventId: string,
) {
  const players: EventRosterPlayer[] = [];
  let last: EventRosterPlayer | undefined;
  for (;;) {
    const page = eventRosterSchema.parse(
      one(
        await db.rpc("event_roster_page", {
          p_event: eventId,
          p_query: "",
          p_name: last?.full_name ?? null,
          p_id: last?.profile_id ?? null,
        }),
      ),
    );
    players.push(...page.items);
    if (players.length > 1000)
      throw new Error(
        "Súpis presahuje 1 000 hráčov. Skontrolujte členstvo v tíme.",
      );
    if (!page.has_more) return { players, canManage: page.can_manage };
    const next = page.items.at(-1);
    if (!next || next.profile_id === last?.profile_id)
      throw new Error("Celý súpis sa nepodarilo načítať. Obnovte stránku.");
    last = next;
  }
}
