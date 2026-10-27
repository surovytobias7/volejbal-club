import Link from "next/link";
import { z } from "zod";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { hasManagedTeam } from "@/lib/team-access";
import { one } from "@/lib/data";
import { calendarCursorSchema, calendarPageSchema } from "@/lib/calendar-data";
import { SearchSelect } from "@/components/search-select";
import { Pagination } from "@/components/pagination";
import { PageHeading } from "@/components/shared";
import { ActionForm } from "@/components/forms";
import { FormDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { mutate } from "@/features/actions";
import { eventFields } from "@/features/fields";
import { CalendarView } from "@/features/calendar";
import { dateTime, localToUtc } from "@/lib/utils";
export default async function Calendar({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    date?: string;
    team?: string;
    kind?: string;
    child?: string;
    afterAt?: string;
    afterId?: string;
  }>;
}) {
  const v = await requireViewer();
  const query = await searchParams;
  const view = ["month", "week", "agenda"].includes(query.view || "")
    ? query.view!
    : "month";
  const date = z.iso.date().safeParse(query.date).success
    ? query.date!
    : dateTime(new Date().toISOString(), "yyyy-MM-dd");
  const anchor = new Date(`${date}T12:00:00Z`);
  const start = new Date(anchor);
  if (view !== "week") start.setUTCDate(1);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const dayCount = view === "week" ? 7 : 42;
  const day = (offset: number) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  const cursor = calendarCursorSchema.safeParse(query).data;
  const [result, settings, canCreate] = await Promise.all([
    v.db.rpc("calendar_page", {
      p_from: localToUtc(`${day(0)}T00:00`),
      p_to: localToUtc(`${day(dayCount)}T00:00`),
      p_team: z.uuid().safeParse(query.team).data ?? null,
      p_kind: query.kind || null,
      p_player: z.uuid().safeParse(query.child).data ?? null,
      p_after_at: cursor?.afterAt ?? null,
      p_after_id: cursor?.afterId ?? null,
    }),
    v.db.from("club_settings").select("venue").single(),
    hasManagedTeam(v, true),
  ]);
  const page = calendarPageSchema.parse(one(result));
  const club = one(settings);
  const events = page.items;
  const last = events.at(-1);
  const base = Object.fromEntries(
    Object.entries(query).filter(
      ([key, value]) => !!value && key !== "afterAt" && key !== "afterId",
    ),
  );
  const href = (changes: Record<string, string>) =>
    `/klub/kalendar?${new URLSearchParams({ ...base, ...changes })}`;
  const previous = new Date(anchor);
  const next = new Date(anchor);
  if (view === "week") {
    previous.setUTCDate(previous.getUTCDate() - 7);
    next.setUTCDate(next.getUTCDate() + 7);
  } else {
    previous.setUTCDate(1);
    next.setUTCDate(1);
    previous.setUTCMonth(previous.getUTCMonth() - 1);
    next.setUTCMonth(next.getUTCMonth() + 1);
  }
  return (
    <>
      <PageHeading
        title="Kalendár"
        description="Každý tréning a zápas má svoje miesto. Časy sú uvedené pre Bratislavu."
        action={
          canCreate && (
            <FormDialog
              title="Nová udalosť"
              description="Opakované udalosti zachovávajú miestny čas aj pri zmene letného času."
            >
              <ActionForm
                action={mutate}
                hidden={{ command: "event" }}
                fields={eventFields().map((f) =>
                  f.name === "venue" ? { ...f, value: club.venue } : f,
                )}
                submit="Vytvoriť udalosť"
              />
            </FormDialog>
          )
        }
      />
      <div className="toolbar calendar-toolbar">
        <Link
          className="icon-button"
          aria-label="Predchádzajúce obdobie"
          href={href({ date: previous.toISOString().slice(0, 10) })}
        >
          <ChevronLeft size={20} />
        </Link>
        <h2>
          {dateTime(
            `${date}T12:00:00Z`,
            view === "week" ? "d. MMMM yyyy" : "LLLL yyyy",
          )}
        </h2>
        <Link
          className="icon-button"
          aria-label="Nasledujúce obdobie"
          href={href({ date: next.toISOString().slice(0, 10) })}
        >
          <ChevronRight size={20} />
        </Link>
        <Link
          className="text-link"
          href={href({
            date: dateTime(new Date().toISOString(), "yyyy-MM-dd"),
          })}
        >
          Dnes
        </Link>
        <div className="tabs">
          {[
            { id: "month", name: "Mesiac" },
            { id: "week", name: "Týždeň" },
            { id: "agenda", name: "Program" },
          ].map((x) => (
            <Link
              className={view === x.id ? "active" : ""}
              aria-current={view === x.id ? "page" : undefined}
              href={href({ view: x.id })}
              key={x.id}
            >
              {x.name}
            </Link>
          ))}
        </div>
      </div>
      <form className="toolbar">
        <input type="hidden" name="view" value={view} />
        <input type="hidden" name="date" value={date} />
        {query.child && (
          <input type="hidden" name="child" value={query.child} />
        )}
        <SearchSelect
          name="team"
          label="Tím"
          source="teams"
          value={query.team}
        />
        <label className="field">
          Typ udalosti
          <select name="kind" defaultValue={query.kind || ""}>
            <option value="">Všetky udalosti</option>
            <option value="training">Tréningy</option>
            <option value="match">Zápasy</option>
            <option value="tournament">Turnaje</option>
            <option value="meeting">Stretnutia</option>
            <option value="other">Iné udalosti</option>
          </select>
        </label>
        <Button variant="secondary">Filtrovať</Button>
      </form>
      {(page.has_more || cursor) && (
        <p className="notice">
          V období je {page.total} udalostí. Zobrazená je časť programu; ďalšie
          udalosti nájdete cez stránkovanie.
        </p>
      )}
      <CalendarView
        events={events}
        days={Array.from({ length: dayCount }, (_, i) => day(i))}
        teams={Object.fromEntries(
          events.map((e) => [e.team_id, e.team_name ?? "Tím"]),
        )}
        view={view}
      />
      <Pagination
        firstHref={href({})}
        continued={!!cursor}
        count={events.length}
        nextHref={
          page.has_more && last
            ? href({ afterAt: last.starts_at, afterId: last.id })
            : undefined
        }
      />
    </>
  );
}
