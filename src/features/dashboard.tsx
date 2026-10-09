import Link from "next/link";
import {
  Users,
  Volleyball,
  CalendarDays,
  CreditCard,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import {
  PageHeading,
  Panel,
  EventList,
  Empty,
  type EventRow,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { money, dateTime } from "@/lib/utils";
export type DashboardData = {
  name: string;
  roles: string[];
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
  children?: { id: string; full_name: string }[];
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
      value:
        admin || coach
          ? data.playerCount
          : guardian
            ? (data.childCount ?? data.children?.length ?? 0)
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
      <PageHeading
        title={`Dobrý deň, ${data.name.split(" ")[0]}`}
        description={description}
        action={
          <Button asChild variant="secondary">
            <Link href={preview ? "/ukazka?view=kalendar" : "/klub/kalendar"}>
              <CalendarDays size={16} />
              Otvoriť kalendár
            </Link>
          </Button>
        }
      />
      {data.children && data.children.length > 0 && (
        <div className="notice">
          Vaše deti:{" "}
          {data.children.map((c, i) => (
            <span key={c.id}>
              {i > 0 ? ", " : ""}
              <Link href={`/klub/kalendar?child=${c.id}`}>{c.full_name}</Link>
              {" · "}
              <Link href={`/klub/clenovia/${c.id}`}>Profil</Link>
            </span>
          ))}
          {(data.childCount ?? 0) > data.children.length && (
            <Link className="text-link" href="/klub/clenovia">
              {" "}
              Všetci prepojení členovia
            </Link>
          )}
        </div>
      )}
      {!!data.pendingCount && (
        <div className="notice">
          <strong>{data.pendingCount} odpovedí na účasť ešte chýba.</strong>{" "}
          Skontrolujte potvrdenia pri najbližších piatich udalostiach.
        </div>
      )}
      <div className="dashboard-stats">
        {stats.map((s) => (
          <section className="stat" key={s.label}>
            <div className="stat-top">
              <span>{s.label}</span>
              <span className="stat-icon">
                <s.icon size={17} />
              </span>
            </div>
            <strong>{s.value}</strong>
            <small>{s.hint}</small>
          </section>
        ))}
      </div>
      <div className="dashboard-grid">
        <div className="stack">
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
            <Panel title="Zaznamenaná účasť" href="/klub/dochadzka">
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
            <div className="court" aria-hidden />
            <span className="badge lime">Klubový život</span>
            <h2>Na každý tréning pripravení.</h2>
            <p>
              Potvrďte účasť v detaile udalosti. Tréner tak vie, s kým môže
              počítať.
            </p>
            <Link
              className="text-link"
              href={preview ? "/ukazka?view=kalendar" : "/klub/kalendar"}
            >
              Pozrieť program <ArrowUpRight size={16} />
            </Link>
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
