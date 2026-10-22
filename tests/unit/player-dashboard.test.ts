import { describe, expect, it } from "vitest";
import {
  ownResponseLabels,
  playerResponsesSchema,
  withPlayerResponses,
} from "../../src/lib/player-dashboard";

const eventId = "00000000-0000-4000-8000-000000000030";
const event = { id: eventId, team_id: "own-team", status: "scheduled" };

describe("personal upcoming responses", () => {
  it.each(["yes", "no", "maybe"] as const)(
    "preserves the %s response",
    (response) => {
      expect(
        withPlayerResponses(
          [event],
          [event.team_id],
          [{ event_id: eventId, response }],
        )[0].own_response,
      ).toBe(response);
      expect(ownResponseLabels[response]).toContain("Vaša odpoveď:");
    },
  );

  it("marks a missing answer as pending only in the player's own team", () => {
    const events = [
      event,
      { ...event, id: "coached", team_id: "coach-team" },
      { ...event, id: "child", team_id: "child-team" },
    ];
    expect(
      withPlayerResponses(events, [event.team_id], []).map(
        (e) => e.own_response,
      ),
    ).toEqual(["pending", undefined, undefined]);
  });

  it("removes personal states when player membership is revoked, even if old answers exist", () => {
    expect(
      withPlayerResponses(
        [event],
        [],
        [{ event_id: eventId, response: "yes" }],
      )[0].own_response,
    ).toBeUndefined();
  });

  it.each(["cancelled", "completed"])(
    "never requests an answer for a %s event",
    (status) => {
      expect(
        withPlayerResponses([{ ...event, status }], [event.team_id], [])[0]
          .own_response,
      ).toBeUndefined();
    },
  );

  it("accepts an empty schedule and does not mutate source records", () => {
    expect(withPlayerResponses([], [], [])).toEqual([]);
    withPlayerResponses([event], [event.team_id], []);
    expect(event).not.toHaveProperty("own_response");
  });

  it("rejects invalid database responses instead of presenting them as pending", () => {
    expect(
      playerResponsesSchema.safeParse([
        { event_id: eventId, response: "present" },
      ]).success,
    ).toBe(false);
    expect(
      playerResponsesSchema.safeParse([{ event_id: eventId, response: null }])
        .success,
    ).toBe(false);
    expect(
      playerResponsesSchema.parse([{ event_id: eventId, response: "yes" }]),
    ).toHaveLength(1);
  });
});
