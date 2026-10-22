import { notFound } from "next/navigation";
import Link from "next/link";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { teamRosterSchema } from "@/lib/rosters";
import {
  directoryCursor,
  directoryHref,
  directoryQuery,
  type DirectorySearch,
} from "@/lib/directories";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { rows, one } from "@/lib/data";
import { PageHeading, Panel, EventList, Empty } from "@/components/shared";
import { ActionForm } from "@/components/forms";
import { FormDialog } from "@/components/ui/dialog";
import { mutate } from "@/features/actions";
import { teamFields, formValues } from "@/features/fields";
export default async function Team({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: DirectorySearch;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const v = await requireViewer();
  const admin = v.roles.includes("admin");
  const categories = admin
    ? one(await v.db.from("club_settings").select("categories").single())
        .categories
    : [];
  const teamResult = await v.db
    .from("teams")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (teamResult.error) throw new Error("Tím sa nepodarilo načítať.");
  if (!teamResult.data) notFound();
  const team = teamResult.data;
  const search = await searchParams;
  const q = directoryQuery(search);
  const baseCursor = directoryCursor(search);
  const cursorKind = z
    .enum(["player", "coach"])
    .safeParse(search.cursorKind).data;
  const cursor = cursorKind ? baseCursor : null;
  const roster = teamRosterSchema.parse(
    one(
      await v.db.rpc("team_roster_page", {
        p_team: id,
        p_query: q,
        p_name: cursor?.after ?? null,
        p_id: cursor?.id ?? null,
        p_kind: cursor ? cursorKind! : null,
      }),
    ),
  );
  const memberships = roster.items;
  const last = memberships.at(-1);
  const events = rows(
    await v.db
      .from("events")
      .select("*")
      .eq("team_id", id)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(10),
  );
  return (
    <>
      <PageHeading
        title={team.name}
        description={`${team.category} · ${team.archived ? "Archivovaný tím" : team.description || "Tímový priestor"}`}
        action={
          admin && (
            <FormDialog
              title="Upraviť tím"
              description="Zmeny sa zobrazia všetkým členom tímu."
            >
              <ActionForm
                action={mutate}
                hidden={{ command: "team", id }}
                fields={teamFields(categories, formValues(team))}
              />
            </FormDialog>
          )
        }
      />
      <div className="two-columns">
        <div className="stack">
          <Panel title="Najbližší program">
            <EventList events={events} />
          </Panel>
          <Panel
            title={
              v.roles.some((r) => r === "admin" || r === "coach")
                ? "Členovia tímu"
                : "Vaše členstvá v tíme"
            }
          >
            {memberships.length ? (
              <div className="data-table-wrap">
                <table className="data-table responsive-table" role="table">
                  <thead role="rowgroup">
                    <tr role="row">
                      <th scope="col" role="columnheader">
                        Meno
                      </th>
                      <th scope="col" role="columnheader">
                        Úloha
                      </th>
                      {admin && (
                        <th scope="col" role="columnheader">
                          Správa
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody role="rowgroup">
                    {memberships.map((m) => (
                      <tr role="row" key={`${m.profile_id}-${m.kind}`}>
                        <td role="cell" data-label="Meno">
                          <Link
                            className="text-link"
                            href={`/klub/clenovia/${m.profile_id}`}
                          >
                            {m.full_name}
                          </Link>
                        </td>
                        <td role="cell" data-label="Úloha">
                          <span className="badge">
                            {m.kind === "coach" ? "Tréner" : "Hráč"}
                          </span>
                        </td>
                        {admin && (
                          <td role="cell" data-label="Správa">
                            <ActionForm
                              action={mutate}
                              hidden={{
                                command: "membership",
                                team_id: id,
                                profile_id: m.profile_id,
                                kind: m.kind,
                                remove: "true",
                              }}
                              fields={[]}
                              submit="Odobrať z tímu"
                              danger
                            />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty description="Tento tím zatiaľ nemá priradených členov." />
            )}
            <form className="toolbar p-4">
              <label className="field">
                Hľadať člena
                <input name="q" defaultValue={q} maxLength={160} />
              </label>
              <Button variant="secondary">Hľadať</Button>
            </form>
            <Pagination
              firstHref={directoryHref(`/klub/timy/${id}`, { q })}
              count={memberships.length}
              continued={!!cursor}
              nextHref={
                roster.has_more && last
                  ? directoryHref(
                      `/klub/timy/${id}`,
                      { q, cursorKind: last.kind },
                      { name: last.full_name, id: last.profile_id },
                    )
                  : undefined
              }
            />
          </Panel>
        </div>
        {admin && (
          <div className="stack">
            <Panel title="Priradiť člena">
              <div className="panel-body">
                <ActionForm
                  action={mutate}
                  hidden={{ command: "membership", team_id: id }}
                  fields={[
                    {
                      name: "profile_id",
                      label: "Člen",
                      source: "members",
                    },
                    {
                      name: "kind",
                      label: "Úloha v tíme",
                      options: [
                        { value: "player", label: "Hráč" },
                        { value: "coach", label: "Tréner" },
                      ],
                      hint: "Člen musí mať rovnakú rolu vo svojom profile.",
                    },
                  ]}
                  submit="Priradiť do tímu"
                />
              </div>
            </Panel>
            <Panel title="Stav tímu">
              <div className="panel-body">
                <p className="muted">
                  Archivácia zachová históriu tímu a jeho udalostí.
                </p>
                <ActionForm
                  action={mutate}
                  hidden={{
                    command: "archive-team",
                    id,
                    archived: String(!team.archived),
                  }}
                  fields={[]}
                  submit={team.archived ? "Obnoviť tím" : "Archivovať tím"}
                  danger={!team.archived}
                />
              </div>
            </Panel>
          </div>
        )}
      </div>
    </>
  );
}
