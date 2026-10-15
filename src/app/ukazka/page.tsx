import { notFound } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/layout";
import { Dashboard, type DashboardData } from "@/features/dashboard";
import { PageHeading, Panel, TeamList, Empty } from "@/components/shared";
import {
  MemberTable,
  ChargeTable,
  FinanceSummary,
  AttendanceTable,
} from "@/components/records";
import { DesignPreviewForm } from "@/features/design-preview-form";
import { localToUtc, dateTime } from "@/lib/utils";
import { CalendarView } from "@/features/calendar";
export const dynamic = "force-dynamic";
export default async function Preview({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; mode?: string; q?: string }>;
}) {
  if (process.env.ENABLE_DESIGN_PREVIEW !== "true") notFound();
  const { view, mode, q = "" } = await searchParams;
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
  if (view === "trener") {
    fixture.roles = ["coach"];
    fixture.balance = null;
    fixture.pendingCount = 4;
  }
  if (view === "hrac") {
    fixture.roles = ["player"];
    fixture.teamCount = 1;
    fixture.balance = 1500;
    fixture.events = fixture.events.filter((event) => event.team_id === "u16");
    fixture.teams = { u16: "Kadetky U16" };
    fixture.eventCount = fixture.events.length;
  }
  const members = [
    {
      id: "nina",
      full_name: "Nina Ukážková",
      roles: ["player"] as const,
      active: true,
      user_id: "preview-nina",
    },
    {
      id: "adam",
      full_name: "Adam Ukážkový",
      roles: ["player"] as const,
      active: true,
      user_id: null,
    },
    {
      id: "lucia",
      full_name: "Lucia Ukážková",
      roles: ["guardian"] as const,
      active: true,
      user_id: "preview-lucia",
    },
    {
      id: "peter",
      full_name: "Peter Ukážkový",
      roles: ["coach"] as const,
      active: false,
      user_id: "preview-peter",
    },
  ].map((member) => ({ ...member, roles: [...member.roles] }));
  const filteredMembers = members.filter((member) =>
    member.full_name
      .toLocaleLowerCase("sk-SK")
      .includes(q.toLocaleLowerCase("sk-SK")),
  );
  const charges = [
    {
      id: "c1",
      full_name: "Nina Ukážková",
      label: "Členské – ukážkové obdobie",
      amount_cents: 3500,
      remaining: 1500,
      due_date: day,
    },
    {
      id: "c2",
      full_name: "Adam Ukážkový",
      label: "Členské – ukážkové obdobie",
      amount_cents: 3500,
      remaining: 0,
      due_date: day,
    },
    {
      id: "c3",
      full_name: "Nina Ukážková",
      label: "Účasť na turnaji – ukážka",
      amount_cents: 2000,
      remaining: 2000,
      due_date: "2025-01-01",
    },
  ];
  const calendarMode = mode === "month" || mode === "week" ? mode : "agenda";
  const calendarStart = new Date(
    `${calendarMode === "month" ? day.slice(0, 8) + "01" : day}T12:00:00Z`,
  );
  calendarStart.setUTCDate(
    calendarStart.getUTCDate() - ((calendarStart.getUTCDay() + 6) % 7),
  );
  const days = Array.from(
    { length: calendarMode === "month" ? 42 : 7 },
    (_, index) =>
      new Date(calendarStart.getTime() + index * 86400000)
        .toISOString()
        .slice(0, 10),
  );
  return (
    <Shell
      name={fixture.name}
      club="Volej klub"
      roles={fixture.roles}
      preview
      previewView={view}
      finance={!fixture.roles.includes("coach")}
    >
      <details className="preview-banner">
        <summary>
          <strong>Ukážka s fiktívnymi údajmi.</strong> Zmeny sa neukladajú.
        </summary>
        <div className="preview-banner-content">
          <p>
            Nie ste prihlásení. Vyberte ukážku roly alebo nastavte aplikáciu.
          </p>
          <div className="preview-banner-links">
            <Link href="/nastavenie">Nastavenie aplikácie</Link>
            <Link href="/ukazka">Administrátor</Link>
            <Link href="/ukazka?view=rodic">Ukážka rodičovského prehľadu</Link>
            <Link href="/ukazka?view=trener">Tréner</Link>
            <Link href="/ukazka?view=hrac">Hráč</Link>
          </div>
        </div>
      </details>
      {view === "kalendar" ? (
        <>
          <PageHeading
            title="Kalendár"
            description="Ukážkový program tréningov a zápasov."
          />
          <div className="toolbar calendar-toolbar">
            <h2>{dateTime(new Date().toISOString(), "LLLL yyyy")}</h2>
            <nav className="tabs" aria-label="Zobrazenie kalendára">
              {(
                [
                  ["month", "Mesiac"],
                  ["week", "Týždeň"],
                  ["agenda", "Program"],
                ] as const
              ).map(([value, label]) => (
                <Link
                  key={value}
                  href={`/ukazka?view=kalendar&mode=${value}`}
                  aria-current={calendarMode === value ? "page" : undefined}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <CalendarView
            events={fixture.events}
            teams={fixture.teams}
            days={days}
            view={calendarMode}
            preview
          />
        </>
      ) : view === "timy" ? (
        <>
          <PageHeading
            title="Naše tímy"
            description="Každá kategória, jeden spoločný klub."
          />
          <TeamList
            preview
            teams={Object.entries(fixture.teams).map(([id, name]) => ({
              id,
              name,
              category: id === "senior" ? "Dospelí" : id.toUpperCase(),
              description: "Tréningy, hráči a tímové informácie.",
            }))}
          />
        </>
      ) : view === "clenovia" ? (
        <>
          <PageHeading
            title="Členovia klubu"
            description="Hráči, tréneri a rodičia. Prepojení v jednom klube."
            action={<DesignPreviewForm />}
          />
          <form className="toolbar" action="/ukazka">
            <input type="hidden" name="view" value="clenovia" />
            <label className="field">
              Hľadať člena
              <input
                name="q"
                defaultValue={q}
                placeholder="Meno alebo priezvisko…"
                maxLength={160}
              />
            </label>
            <button className="button button-secondary" type="submit">
              Hľadať
            </button>
          </form>
          <Panel title={`Členovia (${filteredMembers.length})`}>
            {filteredMembers.length ? (
              <MemberTable members={filteredMembers} preview />
            ) : (
              <Empty description="Žiadny ukážkový člen nezodpovedá vyhľadávaniu. Upravte meno." />
            )}
          </Panel>
        </>
      ) : view === "platby" ? (
        <>
          <PageHeading
            title="Členské a platby"
            description="Prehľad poplatkov a úhrad evidovaných klubom."
          />
          <FinanceSummary
            summary={{
              count: 3,
              charged: 9000,
              paid: 5500,
              remaining: 3500,
              overdue: 2000,
            }}
          />
          <Panel title="Členské poplatky">
            <ChargeTable records={charges} today={day} preview />
          </Panel>
        </>
      ) : view === "dochadzka" ? (
        <>
          <PageHeading
            title="Dochádzka"
            description="Skutočná účasť zaznamenaná trénerom. Potvrdenie účasti sa do štatistiky nezapočítava."
          />
          <Panel title="História účasti">
            <AttendanceTable
              preview
              records={members
                .slice(0, 3)
                .map((member, index) => ({
                  event_id: "a",
                  player_id: member.id,
                  updated_at: new Date().toISOString(),
                  full_name: member.full_name,
                  title: "Tréning kadetiek",
                  starts_at: localToUtc(`${day}T16:00`),
                  status: (["present", "excused", "absent"] as const)[index],
                }))}
            />
          </Panel>
        </>
      ) : view === "oznamy" ? (
        <>
          <PageHeading
            title="Klubová nástenka"
            description="Správy, ktoré držia klub pohromade."
          />
          <div className="stack announcement-feed">
            {fixture.announcements.map((a) => (
              <Panel title={a.title} key={a.id} plain>
                <div className="panel-body">
                  <div className="event-meta">
                    <span className="badge">Celý klub</span>
                    {a.important && (
                      <span className="badge match">Dôležité</span>
                    )}
                    <span>{dateTime(a.created_at, "d. MMMM yyyy")}</span>
                  </div>
                  <p className="body-copy mt-4">{a.body}</p>
                </div>
              </Panel>
            ))}
          </div>
        </>
      ) : view && !["klub", "rodic", "trener", "hrac"].includes(view) ? (
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
