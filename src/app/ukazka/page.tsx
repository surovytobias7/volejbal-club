import { notFound } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/layout";
import { Dashboard, type DashboardData } from "@/features/dashboard";
import { EventList, PageHeading, Panel } from "@/components/shared";
import { Volleyball, ArrowUpRight } from "lucide-react";
import { localToUtc, dateTime } from "@/lib/utils";
export const dynamic = "force-dynamic";
export default async function Preview({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  if (process.env.ENABLE_DESIGN_PREVIEW !== "true") notFound();
  const { view } = await searchParams;
  const day = dateTime(new Date().toISOString(), "yyyy-MM-dd");
  const fixture: DashboardData = {
    name: "Martin Novák",
    roles: ["admin"],
    teamCount: 3,
    playerCount: 42,
    eventCount: 6,
    balance: 18500,
    participation: 86,
    teams: { u16: "Kadetky U16", u18: "Juniorky U18", senior: "Ženy" },
    events: [
      {
        id: "a",
        team_id: "u16",
        title: "Tréning kadetiek",
        kind: "training",
        starts_at: localToUtc(`${day}T16:00`),
        ends_at: localToUtc(`${day}T17:30`),
        venue: "Športová hala, ihrisko A",
        status: "scheduled",
      },
      {
        id: "b",
        team_id: "u18",
        title: "Herná príprava junioriek",
        kind: "training",
        starts_at: localToUtc(`${day}T17:30`),
        ends_at: localToUtc(`${day}T19:00`),
        venue: "Športová hala, ihrisko B",
        status: "scheduled",
      },
      {
        id: "c",
        team_id: "senior",
        title: "Volej klub – VK Slávia",
        kind: "match",
        starts_at: localToUtc(`${day}T19:00`),
        ends_at: localToUtc(`${day}T21:00`),
        venue: "Mestská športová hala",
        status: "scheduled",
      },
    ],
    announcements: [
      {
        id: "1",
        title: "Spoločne do novej sezóny",
        body: "Všetky informácie o tréningoch, zápasoch a dochádzke teraz nájdete vo svojom klubovom priestore.",
        important: true,
        created_at: new Date().toISOString(),
      },
      {
        id: "2",
        title: "Príprava na víkendový turnaj",
        body: "Nezabudnite si potvrdiť účasť a skontrolovať čas stretnutia v kalendári.",
        important: false,
        created_at: new Date().toISOString(),
      },
    ],
  };
  if (view === "rodic") {
    fixture.name = "Lucia Ukážková";
    fixture.roles = ["guardian"];
    fixture.childCount = 2;
    fixture.children = [
      {
        id: "child-a",
        full_name: "Nina Ukážková",
        next_event: {
          id: "a",
          title: "Tréning kadetiek",
          starts_at: localToUtc(`${day}T16:00`),
          venue: "Športová hala, ihrisko A",
          response: null,
        },
        attendance: { recorded: 12, present: 10 },
        remaining: 1500,
      },
      {
        id: "child-b",
        full_name: "Adam Ukážkový",
        next_event: null,
        attendance: { recorded: 0, present: 0 },
        remaining: 0,
      },
    ];
    fixture.balance = 1500;
  }
  return (
    <Shell name={fixture.name} club="Volej klub" roles={fixture.roles} preview>
      <div className="notice">
        <strong>Ukážka rozhrania s fiktívnymi údajmi.</strong> Nie ste
        prihlásení. Zmeny sa neukladajú.{" "}
        <Link href="/nastavenie">Nastavenie aplikácie</Link>
        {" · "}
        <Link href="/ukazka?view=rodic">Ukážka rodičovského prehľadu</Link>
      </div>
      {view === "kalendar" || view === "dochadzka" ? (
        <>
          <PageHeading
            title={view === "dochadzka" ? "Dochádzka" : "Kalendár"}
            description="Ukážkový program. Skutočné udalosti budú dostupné po pripojení databázy."
          />
          <Panel title="Dnešný program">
            <EventList events={fixture.events} teams={fixture.teams} preview />
          </Panel>
        </>
      ) : view === "timy" ? (
        <>
          <PageHeading
            title="Naše tímy"
            description="Každá kategória, jeden spoločný klub."
          />
          <div className="team-grid">
            {Object.entries(fixture.teams).map(([id, name]) => (
              <div className="team-card" key={id}>
                <span className="team-card-icon">
                  <Volleyball />
                </span>
                <span className="badge">Ukážkový tím</span>
                <h2>{name}</h2>
                <p>Spoločne rastieme, spoločne hráme.</p>
                <div className="team-card-footer">
                  Ukážka tímovej karty
                  <ArrowUpRight size={17} />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : view === "oznamy" ? (
        <>
          <PageHeading
            title="Klubová nástenka"
            description="Správy, ktoré držia klub pohromade."
          />
          <Panel title="Ukážkové oznamy">
            {fixture.announcements.map((a) => (
              <article className="announcement-item" key={a.id}>
                <h2>{a.title}</h2>
                <p>{a.body}</p>
              </article>
            ))}
          </Panel>
        </>
      ) : view && !["klub", "rodic"].includes(view) ? (
        <>
          <PageHeading
            title="Ukážka klubového priestoru"
            description="Členské údaje a finančné operácie vyžadujú prihlásenie a pripojenie k databáze."
          />
          <Link className="text-link" href="/ukazka">
            Späť na prehľad
          </Link>
        </>
      ) : (
        <Dashboard data={fixture} preview />
      )}
    </Shell>
  );
}
