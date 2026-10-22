import Link from "next/link";
import { z } from "zod";
import { notFound } from "next/navigation";
import { EventBrief } from "@/components/event-brief";
import { requireViewer } from "@/lib/auth";
import { one } from "@/lib/data";
import { loadEventRoster } from "@/lib/event-roster";
import { AttendanceBoard } from "@/components/attendance-board";
import {
  saveAttendance,
  reloadAttendance,
} from "@/features/attendance-actions";
import { attendanceLabels } from "@/lib/attendance";
import type { DirectorySearch } from "@/lib/directories";
import { dateTime } from "@/lib/utils";
import { PageHeading, Panel, kindNames, Empty } from "@/components/shared";
import { ActionForm } from "@/components/forms";
import { FormDialog } from "@/components/ui/dialog";
import { mutate } from "@/features/actions";
import { eventFields } from "@/features/fields";
import { InternalNotes } from "@/features/internal-notes";
const availabilityNames: Record<string, string> = {
  yes: "Príde",
  no: "Nepríde",
  maybe: "Ešte nevie",
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
  const [teamResult, rosterResult] = await Promise.all([
    v.db.from("teams").select("id,name").eq("id", event.team_id).single(),
    loadEventRoster(v.db, id),
  ]);
  const team = one(teamResult);
  const manage = rosterResult.canManage;
  const players = rosterResult.players.map((p) => ({
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
      <EventBrief event={event} compact={manage && event.kind === "training"} />
      {manage && (
        <AttendanceBoard
          key={id}
          eventId={id}
          initialPlayers={rosterResult.players}
          readOnly={event.status === "cancelled"}
          saveAction={saveAttendance}
          reloadAction={reloadAttendance}
        />
      )}
      <div
        className={`two-columns event-detail-layout ${manage ? "" : "event-detail-personal"}`}
      >
        {!manage && (
          <div className="stack">
            <Panel title="Vaša účasť">
              {players.length ? (
                <div className="data-table-wrap">
                  <table className="data-table responsive-table" role="table">
                    <caption className="sr-only">
                      Plánované odpovede a skutočná účasť hráčov
                    </caption>
                    <thead role="rowgroup">
                      <tr role="row">
                        <th scope="col" role="columnheader">
                          Hráč
                        </th>
                        <th scope="col" role="columnheader">
                          Odpoveď
                        </th>
                        <th scope="col" role="columnheader">
                          Skutočná účasť
                        </th>
                      </tr>
                    </thead>
                    <tbody role="rowgroup">
                      {players.map((p) => {
                        const r = availability.find(
                          (a) => a.player_id === p.profile_id,
                        );
                        const a = attendance.find(
                          (a) => a.player_id === p.profile_id,
                        );
                        return (
                          <tr role="row" key={p.profile_id}>
                            <td role="cell" data-label="Hráč">
                              <Link
                                className="text-link"
                                href={`/klub/clenovia/${p.profile_id}`}
                              >
                                {p.full_name}
                              </Link>
                            </td>
                            <td role="cell" data-label="Odpoveď">
                              <span
                                className={`badge ${r?.response === "yes" ? "success" : ""}`}
                              >
                                {r
                                  ? availabilityNames[r.response]
                                  : "Čaká na odpoveď"}
                              </span>
                              {r?.reason && <small>{r.reason}</small>}
                            </td>
                            <td role="cell" data-label="Skutočná účasť">
                              <span className="badge">
                                {a
                                  ? attendanceLabels[a.status]
                                  : "Nezaznamenaná"}
                              </span>
                              {p.attendance_reason && (
                                <small>{p.attendance_reason}</small>
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
            </Panel>
          </div>
        )}
        <div className="stack event-actions" id="odpovede">
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
      {manage && event.kind === "training" && (
        <InternalNotes context={{ eventId: id }} search={search} />
      )}
    </>
  );
}
