import { MapPin } from "lucide-react";
import { dateTime } from "@/lib/utils";
import type { EventRow } from "@/components/shared";

export function EventBrief({
  event,
  compact = false,
}: {
  event: EventRow & { home?: boolean | null; series_id?: string | null };
  compact?: boolean;
}) {
  const sameDay =
    dateTime(event.starts_at, "yyyy-MM-dd") ===
    dateTime(event.ends_at, "yyyy-MM-dd");
  if (compact)
    return (
      <section
        className="attendance-session-brief"
        aria-label="Informácie o tréningu"
      >
        <p>
          <strong>{dateTime(event.starts_at, "EEEE, d. MMMM yyyy")}</strong>
          <span>
            {dateTime(event.starts_at, "HH:mm")} –{" "}
            {dateTime(event.ends_at, sameDay ? "HH:mm" : "d. M. yyyy, HH:mm")}
          </span>
        </p>
        <p>
          <MapPin size={18} aria-hidden />
          {event.venue}
        </p>
        {(event.description || event.series_id) && (
          <details>
            <summary>Pokyny k tréningu</summary>
            <p>{event.description}</p>
            {event.series_id && (
              <p className="muted">
                Súčasť opakovanej série. Dochádzku zapisujete iba pre tento
                termín.
              </p>
            )}
          </details>
        )}
      </section>
    );
  return (
    <section className="event-brief" aria-label="Informácie o udalosti">
      <div className="event-brief-time">
        <strong>
          <time dateTime={event.starts_at}>
            {dateTime(event.starts_at, "HH:mm")}
          </time>
        </strong>
        <span>
          do{" "}
          <time dateTime={event.ends_at}>
            {dateTime(event.ends_at, sameDay ? "HH:mm" : "d. M. yyyy, HH:mm")}
          </time>
        </span>
        <p>{dateTime(event.starts_at, "EEEE, d. MMMM yyyy")}</p>
      </div>
      <div className="event-brief-body">
        <p className="event-brief-venue">
          <MapPin size={20} aria-hidden />
          {event.venue}
        </p>
        <p className="body-copy">
          {event.description || "Bez ďalších pokynov."}
        </p>
        {event.kind === "match" && (
          <p className="body-copy mt-4">
            {event.home ? "Domáci" : "Vonkajší"} zápas ·{" "}
            {event.opponent || "Súper zatiaľ neurčený"}
            {event.score ? ` · Výsledok: ${event.score}` : ""}
          </p>
        )}
        {event.series_id && (
          <p className="muted mt-4">
            Súčasť opakovanej série. Zmeny tohto výskytu neovplyvnia ostatné
            termíny.
          </p>
        )}
      </div>
    </section>
  );
}
