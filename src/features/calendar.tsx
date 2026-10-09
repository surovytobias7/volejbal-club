import Link from "next/link";
import { EventList, type EventRow } from "@/components/shared";
import { dateTime } from "@/lib/utils";
export function CalendarView({
  events,
  days,
  teams,
  view,
}: {
  events: EventRow[];
  days: string[];
  teams: Record<string, string>;
  view: string;
}) {
  if (view === "agenda")
    return (
      <div className="panel">
        <EventList events={events} teams={teams} />
      </div>
    );
  const today = dateTime(new Date().toISOString(), "yyyy-MM-dd");
  return (
    <>
      <div className="calendar-desktop">
        <div className="calendar-grid">
          {[
            "Pondelok",
            "Utorok",
            "Streda",
            "Štvrtok",
            "Piatok",
            "Sobota",
            "Nedeľa",
          ].map((d) => (
            <div className="calendar-header" key={d}>
              {d}
            </div>
          ))}
          {days.map((day) => (
            <div
              className={`calendar-day ${today === day ? "today" : ""}`}
              key={day}
            >
              <span>
                {Number(day.slice(-2))}.{" "}
                {view === "week" ? Number(day.slice(5, 7)) + "." : ""}
              </span>
              {events
                .filter((e) => dateTime(e.starts_at, "yyyy-MM-dd") === day)
                .map((e) => (
                  <Link
                    className={`calendar-event ${e.kind} ${e.status}`}
                    key={e.id}
                    href={`/klub/kalendar/${e.id}`}
                  >
                    <strong>{dateTime(e.starts_at, "HH:mm")}</strong> {e.title}
                    <br />
                    <span>{teams[e.team_id]}</span>
                    {e.status === "scheduled" && !!e.participant_count && (
                      <>
                        <br />
                        <span>
                          {e.pending_count
                            ? `Čaká na odpoveď: ${e.pending_count}`
                            : "Všetci odpovedali"}
                        </span>
                      </>
                    )}
                  </Link>
                ))}
            </div>
          ))}
        </div>
      </div>
      <div className="calendar-mobile">
        <div className="panel">
          <EventList events={events} teams={teams} />
        </div>
      </div>
    </>
  );
}
