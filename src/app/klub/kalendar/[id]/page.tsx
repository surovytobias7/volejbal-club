import Link from "next/link";
import { z } from "zod";
import { notFound } from "next/navigation";
import { MapPin, Clock } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { one } from "@/lib/data";
import { eventRosterSchema } from "@/lib/rosters";
import {
  directoryCursor,
  directoryHref,
  directoryQuery,
  type DirectorySearch,
} from "@/lib/directories";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { dateTime } from "@/lib/utils";
import { PageHeading, Panel, kindNames, Empty } from "@/components/shared";
import { ActionForm } from "@/components/forms";
import { FormDialog } from "@/components/ui/dialog";
import { mutate } from "@/features/actions";
import { eventFields } from "@/features/fields";
const availabilityNames: Record<string, string> = {
  yes: "Príde",
  no: "Nepríde",
  maybe: "Ešte nevie",
};
const attendanceNames: Record<string, string> = {
  present: "Prítomný",
  absent: "Neprítomný",
  excused: "Ospravedlnený",
};
export default async function EventDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: DirectorySearch;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const v = await requireViewer();
  const eventResult = await v.db
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  // RLS-hidden and missing events have the same result. Real query failures
  // still reach the error boundary instead of looking like an empty record.
  if (!eventResult.error && !eventResult.data) notFound();
  const event = one(eventResult);
  const search = await searchParams;
  const q = directoryQuery(search);
  const cursor = directoryCursor(search);
  const [teamResult, rosterResult] = await Promise.all([
    v.db.from("teams").select("id,name").eq("id", event.team_id).single(),
    v.db.rpc("event_roster_page", {
      p_event: id,
      p_query: q,
      p_name: cursor?.after ?? null,
      p_id: cursor?.id ?? null,
    }),
  ]);
  const team = one(teamResult);
  const roster = eventRosterSchema.parse(one(rosterResult));
  const manage = roster.can_manage;
  const players = roster.items.map((p) => ({
    ...p,
    profiles: { full_name: p.full_name, active: p.active },
  }));
  const availability = players.flatMap((p) =>
    p.availability
      ? [
          {
            player_id: p.profile_id,
            response: p.availability.response,
            reason: p.availability.reason ?? "",
          },
        ]
      : [],
  );
  const attendance = players.flatMap((p) =>
    p.attendance ? [{ player_id: p.profile_id, status: p.attendance }] : [],
  );
  const respondFor = players.filter((p) => p.can_respond);
  const last = roster.items.at(-1);
  const editValues = {
    ...event,
    home: String(event.home),
    starts_at: dateTime(event.starts_at, "yyyy-MM-dd'T'HH:mm"),
    ends_at: dateTime(event.ends_at, "yyyy-MM-dd'T'HH:mm"),
  };
  return (
    <>
      <Link className="text-link" href="/klub/kalendar">
        Späť na kalendár
      </Link>
      <PageHeading
        title={event.title}
        description={`${kindNames[event.kind]} · ${team.name}`}
        action={
          manage && (
            <FormDialog
              title="Upraviť udalosť"
              description="Upravíte iba tento výskyt. O zmene času alebo miesta dostanú členovia upozornenie."
            >
              <ActionForm
                action={mutate}
                hidden={{ command: "event", id }}
                fields={eventFields(editValues)}
              />
            </FormDialog>
          )
        }
      />
      {event.status === "cancelled" && (
        <div className="feedback feedback-error mb-6">
          Táto udalosť bola zrušená. Dochádzku už nie je možné meniť.
        </div>
      )}
      <div className="two-columns">
        <div className="stack">
          <Panel title="Informácie o udalosti">
            <div className="panel-body">
              <div className="detail-meta">
                <span>
                  <Clock size={16} />
                  {dateTime(event.starts_at)} –{" "}
                  {dateTime(event.ends_at, "HH:mm")}
                </span>
                <span>
                  <MapPin size={16} />
                  {event.venue}
                </span>
              </div>
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
                  Súčasť opakovanej série. Zmeny tohto výskytu neovplyvnia
                  ostatné termíny.
                </p>
              )}
            </div>
          </Panel>
          <Panel title={manage ? "Tímová dochádzka" : "Vaša účasť"}>
            <form className="toolbar p-4">
              <label className="field">
                Hľadať hráča
                <input name="q" defaultValue={q} maxLength={160} />
              </label>
              <Button variant="secondary">Hľadať</Button>
              <span className="muted">Hráči podľa filtra: {roster.total}</span>
            </form>
            {players.length ? (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Hráč</th>
                      <th>Odpoveď</th>
                      <th>Skutočná účasť</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p) => {
                      const r = availability.find(
                        (a) => a.player_id === p.profile_id,
                      );
                      const a = attendance.find(
                        (a) => a.player_id === p.profile_id,
                      );
                      return (
                        <tr key={p.profile_id}>
                          <td>
                            <Link
                              className="text-link"
                              href={`/klub/clenovia/${p.profile_id}`}
                            >
                              {p.full_name}
                            </Link>
                          </td>
                          <td>
                            <span
                              className={`badge ${r?.response === "yes" ? "success" : ""}`}
                            >
                              {r
                                ? availabilityNames[r.response]
                                : "Čaká na odpoveď"}
                            </span>
                            {r?.reason && <small>{r.reason}</small>}
                          </td>
                          <td>
                            {manage && event.status !== "cancelled" ? (
                              <ActionForm
                                action={mutate}
                                hidden={{
                                  command: "attendance",
                                  event_id: id,
                                  player_id: p.profile_id,
                                }}
                                fields={[
                                  {
                                    name: "status",
                                    label: "Zaznamenať účasť",
                                    value: a?.status,
                                    options: Object.entries(
                                      attendanceNames,
                                    ).map(([value, label]) => ({
                                      value,
                                      label,
                                    })),
                                  },
                                ]}
                                submit="Uložiť účasť"
                              />
                            ) : (
                              <span className="badge">
                                {a
                                  ? attendanceNames[a.status]
                                  : "Nezaznamenaná"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty description="Pre túto udalosť zatiaľ nemáte dostupných hráčov." />
            )}
            <Pagination
              firstHref={directoryHref(`/klub/kalendar/${id}`, { q })}
              continued={!!cursor}
              count={players.length}
              nextHref={
                roster.has_more && last
                  ? directoryHref(
                      `/klub/kalendar/${id}`,
                      { q },
                      { name: last.full_name, id: last.profile_id },
                    )
                  : undefined
              }
            />
          </Panel>
        </div>
        <div className="stack">
          {manage && event.status === "scheduled" && (
            <Panel title="Chýbajúce odpovede">
              <div className="panel-body">
                <p className="muted mb-4">
                  Pripomienky dostanú hráči a ich rodičia bez odpovede, ak
                  udalosť začína do 48 hodín. Každý dostane pre hráča jednu
                  pripomienku.
                </p>
                <ActionForm
                  action={mutate}
                  hidden={{ command: "send-reminders", event_id: id }}
                  fields={[]}
                  submit="Vytvoriť pripomienky"
                />
              </div>
            </Panel>
          )}
          {event.status !== "cancelled" &&
            respondFor.map((p) => {
              const response = availability.find(
                (a) => a.player_id === p.profile_id,
              );
              return (
                <Panel
                  key={p.profile_id}
                  title={
                    (p.profiles as unknown as { full_name: string })
                      ?.full_name || "Potvrdenie účasti"
                  }
                >
                  <div className="panel-body">
                    <p className="muted">
                      Dajte trénerovi vedieť, či sa zúčastníte.
                    </p>
                    <ActionForm
                      action={mutate}
                      hidden={{
                        command: "availability",
                        event_id: id,
                        player_id: p.profile_id,
                      }}
                      fields={[
                        {
                          name: "response",
                          label: "Plánovaná účasť",
                          value: response?.response,
                          options: [
                            { value: "yes", label: "Prídem" },
                            { value: "no", label: "Neprídem" },
                            { value: "maybe", label: "Ešte neviem" },
                          ],
                        },
                        {
                          name: "reason",
                          label: "Poznámka pre trénera",
                          type: "textarea",
                          required: false,
                          value: response?.reason,
                          hint: "Uvádzajte iba nevyhnutné informácie, bez zdravotných detailov.",
                        },
                      ]}
                      submit="Potvrdiť odpoveď"
                    />
                  </div>
                </Panel>
              );
            })}
          {manage && (
            <Panel title="Stav udalosti">
              <div className="panel-body">
                <ActionForm
                  action={mutate}
                  hidden={{ command: "event-status", id }}
                  fields={[
                    {
                      name: "status",
                      label: "Stav",
                      value: event.status,
                      options: [
                        { value: "scheduled", label: "Naplánovaná" },
                        { value: "completed", label: "Ukončená" },
                        { value: "cancelled", label: "Zrušená" },
                      ],
                    },
                  ]}
                  submit="Zmeniť stav"
                />
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
