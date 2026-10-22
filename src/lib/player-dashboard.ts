import { z } from "zod";

export const playerResponsesSchema = z.array(
  z.object({
    event_id: z.uuid(),
    response: z.enum(["yes", "no", "maybe"]),
  }),
);
export type OwnResponse = "yes" | "no" | "maybe" | "pending";
export const ownResponseLabels: Record<OwnResponse, string> = {
  yes: "Vaša odpoveď: Prídem",
  no: "Vaša odpoveď: Neprídem",
  maybe: "Vaša odpoveď: Ešte neviem",
  pending: "Čaká na vašu odpoveď",
};

// A combined-role viewer may see events for teams where they only coach or
// have a child. Only their own player memberships get a personal response.
export function withPlayerResponses<
  T extends { id: string; team_id: string; status: string },
>(
  events: T[],
  playerTeamIds: string[],
  responses: z.infer<typeof playerResponsesSchema>,
): (T & { own_response?: OwnResponse })[] {
  const teams = new Set(playerTeamIds);
  const byEvent = new Map(responses.map((r) => [r.event_id, r.response]));
  return events.map((event) => ({
    ...event,
    own_response:
      event.status === "scheduled" && teams.has(event.team_id)
        ? (byEvent.get(event.id) ?? "pending")
        : undefined,
  }));
}
