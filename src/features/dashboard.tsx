import Link from "next/link";
import {
  Users,
  Volleyball,
  CalendarDays,
  CreditCard,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import { Panel, EventList, Empty, type EventRow } from "@/components/shared";
import { money, dateTime } from "@/lib/utils";
import type { GuardianChild } from "@/lib/guardian-dashboard";
import type { Role } from "@/lib/auth";
import { Pagination } from "@/components/pagination";
export type DashboardData = {
  name: string;
  roles: Role[];
  teamCount: number;
  playerCount: number;
  eventCount: number;
  balance: number | null;
  participation: number | null;
  pendingCount?: number;
  events: EventRow[];
  teams: Record<string, string>;
  teamCards?: Record<string, string>;
  childCount?: number;
  recentActivity?: { id: string; label: string; created_at: string }[];
  announcements: {
    id: string;
    title: string;
    body: string;
    important: boolean;
    created_at: string;
  }[];
  children?: GuardianChild[];
  childContinued?: boolean;
  childNextHref?: string;
};
export function Dashboard({
  data,
  preview = false,
}: {
  data: DashboardData;
  preview?: boolean;
}) {
  const { roles } = data;
  const admin = roles.includes("admin");
  const coach = roles.includes("coach");
  const guardian = roles.includes("guardian");
  const nextEvent = data.events.find((event) => event.status === "scheduled");
  const calendarHref = preview ? "/ukazka?view=kalendar" : "/klub/kalendar";
  const description = admin
    ? "Všetko dôležité o vašom klube. Pripravení na ďalší spoločný deň."
    : coach
      ? "Vaše tímy, najbližšie tréningy a dochádzka hráčov."
      : guardian
        ? "Tréningy, oznamy a členské vašich detí na jednom mieste."
        : "Váš tím, najbližší tréning a všetko, čo potrebujete vedieť.";
  const stats = [
    {
      label: admin
        ? "Aktívni hráči"
        : guardian
          ? "Prepojené deti"
          : coach
            ? "Hráči vašich tímov"
            : "Vaše tímy",
      value: admin
        ? data.playerCount
        : guardian
          ? (data.childCount ?? data.children?.length ?? 0)
          : coach
            ? data.playerCount
            : data.teamCount,
      hint: admin ? "V klubovej evidencii" : "Vo vašom klubovom priestore",
      icon: Users,
    },
    {
      label: "Tímy",
      value: data.teamCount,
      hint: admin ? "Aktívne v klube" : "Tímy, ku ktorým máte prístup",
      icon: Volleyball,
    },
    {
      label: "Najbližšie udalosti",
      value: data.eventCount,
      hint: "Naplánované od dnešného dňa",
      icon: CalendarDays,
    },
    {
      label: data.balance !== null ? "Zostáva uhradiť" : "Zaznamenaná účasť",
      value:
        data.balance !== null
          ? money(data.balance)
          : data.participation === null
            ? "—"
            : `${data.participation} %`,
      hint:
        data.balance !== null
          ? "Podľa evidovaných platieb"
          : "Z vyhodnotených tréningov",
      icon: data.balance !== null ? CreditCard : Activity,
    },
  ];
  return (
    <>
      <div className="dashboard-hero">
        <div className="dashboard-welcome">
          <h1>{`Dobrý deň, ${data.name.split(" ")[0]}`}</h1>
          <p>{description}</p>
          <Link className="text-link" href={calendarHref}>
            <CalendarDays size={17} aria-hidden /> Otvoriť kalendár
          </Link>
        </div>
        {nextEvent ? (
          <Link
            className="next-session"
            href={preview ? calendarHref : `/klub/kalendar/${nextEvent.id}`}
          >
            <div className="next-session-label">
              <span>Najbližšie na ihrisku</span>
              <ArrowUpRight size={19} aria-hidden />
            </div>
            <div className="next-session-time">
              <strong>{dateTime(nextEvent.starts_at, "HH:mm")}</strong>
              <span>{dateTime(nextEvent.starts_at, "EEEE, d. MMMM")}</span>
            </div>
            <h2>{nextEvent.title}</h2>
            <p>
              {data.teams[nextEvent.team_id]}
              <br />
              {nextEvent.venue}
            </p>
          </Link>
        ) : (
          <div className="next-session">
            <CalendarDays size={26} aria-hidden />
            <h2>Priestor na ďalší tréning</h2>
            <p>
              Keď pribudne nová udalosť, jej čas a miesto nájdete priamo tu.
            </p>
          </div>
        )}
      </div>
      {!!data.pendingCount && (
        <div className="notice notice-action">
          <div>
            <strong>Čakáme na odpovede: {data.pendingCount}.</strong> Pri
            najbližších piatich udalostiach ešte nie je potvrdená účasť.
          </div>
          <Link href={calendarHref} className="text-link">
            Skontrolovať účasť <ArrowUpRight size={16} aria-hidden />
          </Link>
        </div>
      )}
      <div className="dashboard-stats">
        {stats.map((s) => (
          <section className="stat" key={s.label}>
            <div className="stat-top">
              <span>{s.label}</span>
              <span className="stat-icon">
                <s.icon size={17} aria-hidden />
              </span>
            </div>
            <strong>{s.value}</strong>
            <small>{s.hint}</small>
          </section>
        ))}
      </div>
      <div className="dashboard-grid">
        <div className="stack">
          {(guardian || !!data.children?.length) && (
            <div id="deti">
              <Panel title="Vaše deti">
                {data.children?.length ? (
                  data.children.map((child) => (
                    <article
                      className="announcement-item child-summary"
                      key={child.id}
                    >
                      <div className="metric-line">
                        <h3>{child.full_name}</h3>
                        <Link
                          className="text-link"
                          href={
                            preview
                              ? "/ukazka?view=rodic"
                              : `/klub/clenovia/${child.id}`
                          }
                        >
                          Profil
                        </Link>
                      </div>
                      {child.next_event ? (
                        <>
                          <Link
                            className="text-link"
                            href={
                              preview
                                ? "/ukazka?view=kalendar"
                                : `/klub/kalendar/${child.next_event.id}`
                            }
                          >
                            {child.next_event.title} <ArrowUpRight size={16} />
                          </Link>
                          <p>
                            {dateTime(child.next_event.starts_at)} ·{" "}
                            {child.next_event.venue}
                          </p>
                          <span
                            className={`badge ${child.next_event.response === "yes" ? "success" : child.next_event.response === "no" ? "danger" : "match"}`}
                          >
                            {
                              {
                                yes: "Účasť potvrdená",
                                no: "Nezúčastní sa",
                                maybe: "Účasť neistá",
                                pending: "Čaká na vašu odpoveď",
                              }[child.next_event.response ?? "pending"]
                            }
                          </span>
                        </>
                      ) : (
                        <p className="muted">Žiadna najbližšia udalosť.</p>
                      )}
                      <div className="metric-line mt-4">
                        <span>Skutočná účasť</span>
                        <strong>
                          {child.attendance.recorded
                            ? `${child.attendance.present} / ${child.attendance.recorded}`
                            : "Zatiaľ bez záznamu"}
                        </strong>
                      </div>
                      <div className="metric-line">
                        <span>Zostáva uhradiť</span>
                        <strong>{money(child.remaining)}</strong>
                      </div>
                      <Link
                        className="text-link mt-3"
                        href={
                          preview
                            ? "/ukazka?view=kalendar"
                            : `/klub/kalendar?child=${child.id}`
                        }
                      >
                        Kalendár dieťaťa <ArrowUpRight size={16} />
                      </Link>
                    </article>
                  ))
                ) : (
                  <Empty
                    title="Žiadne dostupné deti"
                    description="Správca klubu vám priradí deti. Pri zmene prepojenia sa ich dostupnosť aktualizuje."
                  />
                )}
                <Pagination
                  firstHref={preview ? "/ukazka?view=rodic" : "/klub#deti"}
                  continued={!!data.childContinued}
                  count={data.children?.length ?? 0}
                  nextHref={data.childNextHref}
                />
              </Panel>
            </div>
          )}
          <Panel
            title="Najbližšie na ihrisku"
            href={preview ? "/ukazka?view=kalendar" : "/klub/kalendar"}
            label="Celý kalendár"
          >
            <EventList
              events={data.events}
              teams={data.teams}
              preview={preview}
            />
          </Panel>
          <Panel
            title="Vaše tímy"
            href={preview ? "/ukazka?view=timy" : "/klub/timy"}
          >
            {Object.keys(data.teamCards ?? data.teams).length ? (
              <div className="panel-body">
                {Object.entries(data.teamCards ?? data.teams)
                  .slice(0, 4)
                  .map(([id, name]) => (
                    <Link
                      className="metric-line"
                      href={preview ? "/ukazka?view=timy" : `/klub/timy/${id}`}
                      key={id}
                    >
                      <span>{name}</span>
                      <ArrowUpRight size={17} />
                    </Link>
                  ))}
              </div>
            ) : (
              <Empty
                title="Každý tím má svoj začiatok"
                description="Po priradení do tímu tu nájdete jeho prehľad."
              />
            )}
          </Panel>
        </div>
        <div className="stack">
          {data.balance !== null && (
            <Panel
              title="Zaznamenaná účasť"
              href={preview ? "/ukazka?view=dochadzka" : "/klub/dochadzka"}
            >
              <div className="panel-body">
                <div className="metric-line">
                  <span>Skutočná účasť v dostupnej histórii</span>
                  <strong>
                    {data.participation === null
                      ? "—"
                      : `${data.participation} %`}
                  </strong>
                </div>
              </div>
            </Panel>
          )}
          {admin && !!data.recentActivity?.length && (
            <Panel title="Posledné zmeny" href="/klub/audit">
              <div className="panel-body">
                {data.recentActivity.map((a) => (
                  <div className="metric-line" key={a.id}>
                    <span>{a.label}</span>
                    <small>{dateTime(a.created_at)}</small>
                  </div>
                ))}
              </div>
            </Panel>
          )}
          <div className="feature-card">
            <h2>
              {admin
                ? "Klub pod kontrolou"
                : coach
                  ? "Príprava na tréning"
                  : "Pripravení na ihrisko"}
            </h2>
            <p>
              {admin
                ? "Členská evidencia, program a klubové správy. Najčastejšie úlohy máte poruke."
                : coach
                  ? "Otvorte tréning, skontrolujte odpovede a zaznamenajte skutočnú účasť."
                  : "Potvrďte účasť v detaile udalosti. Tréner tak vie, s kým môže počítať."}
            </p>
            <Link
              className="text-link"
              href={preview ? "/ukazka?view=kalendar" : "/klub/kalendar"}
            >
              Pozrieť program <ArrowUpRight size={16} />
            </Link>
            {admin && (
              <Link
                className="metric-line"
                href={preview ? "/ukazka?view=clenovia" : "/klub/clenovia"}
              >
                Členská evidencia <Users size={17} aria-hidden />
              </Link>
            )}
            {(admin || coach) && (
              <Link
                className="metric-line"
                href={preview ? "/ukazka?view=oznamy" : "/klub/oznamy"}
              >
                Klubové oznamy <ArrowUpRight size={17} aria-hidden />
              </Link>
            )}
          </div>
          <Panel
            title="Klubová nástenka"
            href={preview ? "/ukazka?view=oznamy" : "/klub/oznamy"}
            label="Všetky oznamy"
          >
            {data.announcements.length ? (
              data.announcements.map((a) => (
                <article className="announcement-item" key={a.id}>
                  {a.important && <span className="badge match">Dôležité</span>}
                  <h3>{a.title}</h3>
                  <p>
                    {a.body.slice(0, 115)}
                    {a.body.length > 115 ? "…" : ""}
                  </p>
                  <small>{dateTime(a.created_at, "d. MMMM")}</small>
                </article>
              ))
            ) : (
              <Empty
                title="Žiadne nové oznamy"
                description="Klubové a tímové správy nájdete tu."
              />
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
