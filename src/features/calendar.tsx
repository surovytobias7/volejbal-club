import Link from "next/link";
import {
  Empty,
  EventList,
  kindNames,
  type EventRow,
} from "@/components/shared";
import { dateTime } from "@/lib/utils";
export function CalendarView({
  events,
  days,
  teams,
  view,
  preview = false,
}: {
  events: EventRow[];
  days: string[];
  teams: Record<string, string>;
  view: string;
  preview?: boolean;
}) {
  const byDay = new Map<string, EventRow[]>();
  for (const event of events) {
    const day = dateTime(event.starts_at, "yyyy-MM-dd");
    const group = byDay.get(day) ?? [];
    group.push(event);
    byDay.set(day, group);
  }
  const today = dateTime(new Date().toISOString(), "yyyy-MM-dd");
  const agenda = events.length ? (
    <div className="agenda-list">
      {[...byDay.entries()].map(([day, entries]) => (
        <section className="agenda-day" key={day}>
          <h2 className="agenda-day-heading">
            <time dateTime={day}>
              {dateTime(`${day}T12:00:00Z`, "EEEE, d. MMMM")}
            </time>
            {day === today && <span className="badge training">Dnes</span>}
          </h2>
          <EventList
            events={entries}
            teams={teams}
            preview={preview}
            showDate={false}
          />
        </section>
      ))}
    </div>
  ) : (
    <div className="panel">
      <Empty
        title="Voľný program"
        description="V tomto výbere nie sú udalosti. Skúste iné obdobie alebo upravte filtre."
      />
    </div>
  );
  if (view === "agenda") return agenda;
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
              <span aria-current={today === day ? "date" : undefined}>
                {Number(day.slice(-2))}.{" "}
                {view === "week" ? Number(day.slice(5, 7)) + "." : ""}
              </span>
              {(byDay.get(day) ?? []).map((e) => (
                <Link
                  className={`calendar-event ${e.kind} ${e.status}`}
                  key={e.id}
                  href={
                    preview ? "/ukazka?view=kalendar" : `/klub/kalendar/${e.id}`
                  }
                >
                  <span className="calendar-event-kind">
                    {kindNames[e.kind]}
                    {e.status === "cancelled" ? " · Zrušené" : ""}
                  </span>
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
      <div className="calendar-mobile">{agenda}</div>
    </>
  );
}
