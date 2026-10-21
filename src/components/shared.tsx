import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { dateTime } from "@/lib/utils";
import { ownResponseLabels, type OwnResponse } from "@/lib/player-dashboard";
export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Empty({
  title = "Zatiaľ tu nič nie je",
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p className="muted">{description}</p>
    </div>
  );
}
export function Panel({
  title,
  children,
  href,
  label = "Zobraziť všetko",
  plain = false,
}: {
  title: string;
  children: ReactNode;
  href?: string;
  label?: string;
  plain?: boolean;
}) {
  return (
    <section className={`panel${plain ? " panel-plain" : ""}`}>
      <div className="panel-heading">
        <h2>{title}</h2>
        {href && (
          <Link className="text-link" href={href}>
            {label}
            <ArrowUpRight size={16} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
export const kindNames: Record<string, string> = {
  training: "Tréning",
  match: "Zápas",
  tournament: "Turnaj",
  meeting: "Stretnutie",
  other: "Udalosť",
};
export type EventRow = {
  id: string;
  title: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  venue: string;
  status: string;
  team_id: string;
  description?: string;
  opponent?: string | null;
  score?: string | null;
  pending_count?: number;
  participant_count?: number;
  own_response?: OwnResponse;
};
export function EventList({
  events,
  teams = {},
  preview = false,
  showDate = true,
}: {
  events: EventRow[];
  teams?: Record<string, string>;
  preview?: boolean;
  showDate?: boolean;
}) {
  if (!events.length)
    return (
      <Empty
        title="Ihrisko má zatiaľ voľno"
        description="Naplánované tréningy a zápasy sa zobrazia na tomto mieste."
      />
    );
  return (
    <div className="event-list">
      {events.map((e) => (
        <Link
          className="event-row"
          href={
            preview
              ? `/ukazka?view=udalost&event=${e.id}`
              : `/klub/kalendar/${e.id}${e.own_response ? "#odpovede" : ""}`
          }
          key={e.id}
        >
          {showDate && (
            <div className="event-date">
              <strong>{dateTime(e.starts_at, "dd")}</strong>
              <span>{dateTime(e.starts_at, "MMM")}</span>
            </div>
          )}
          <div className="event-info">
            <div className="event-meta">
              <span className={`badge ${e.kind}`}>{kindNames[e.kind]}</span>
              <span>{teams[e.team_id]}</span>
              {e.status === "scheduled" && !!e.participant_count && (
                <span
                  className={`badge ${e.pending_count ? "match" : "success"}`}
                >
                  {e.pending_count
                    ? `Čaká na odpoveď: ${e.pending_count}`
                    : "Všetci odpovedali"}
                </span>
              )}
              {e.status === "cancelled" && (
                <span className="badge danger">Zrušené</span>
              )}
            </div>
            <h3>{e.title}</h3>
            <p>
              <span>
                <CalendarDays size={13} aria-hidden />
                {dateTime(
                  e.starts_at,
                  showDate ? "EEEE, HH:mm" : "HH:mm",
                )} – {dateTime(e.ends_at, "HH:mm")}
              </span>
              <span>
                <MapPin size={13} aria-hidden />
                {e.venue}
              </span>
            </p>
            {e.status === "scheduled" && e.own_response && (
              <span className={`event-response response-${e.own_response}`}>
                {ownResponseLabels[e.own_response]}
              </span>
            )}
          </div>
          <ArrowUpRight className="event-arrow" size={18} aria-hidden />
        </Link>
      ))}
    </div>
  );
}

export function TeamList({
  teams,
  preview = false,
}: {
  teams: {
    id: string;
    name: string;
    category: string;
    description: string | null;
  }[];
  preview?: boolean;
}) {
  return (
    <ul className="team-list">
      {teams.map((team) => (
        <li key={team.id}>
          <Link
            className="team-row"
            href={preview ? "/ukazka?view=tim" : `/klub/timy/${team.id}`}
          >
            <span className="team-category">{team.category}</span>
            <div className="team-description">
              <h2>{team.name}</h2>
              <p>
                {team.description || "Tréningy, hráči a tímové informácie."}
              </p>
            </div>
            <span className="team-open">
              Otvoriť tím <ArrowRight size={18} aria-hidden />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
