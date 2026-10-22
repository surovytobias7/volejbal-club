import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { one } from "@/lib/data";
import { dateTime } from "@/lib/utils";
import { PageHeading, Panel, Empty } from "@/components/shared";
import { ActionForm, type Field } from "@/components/forms";
import { FormDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/pagination";
import { mutate } from "@/features/actions";
import {
  announcementPageSchema,
  announcementCursorSchema,
} from "@/lib/activity";
import { directoryQuery, type DirectorySearch } from "@/lib/directories";
export default async function Announcements({
  searchParams,
}: {
  searchParams: DirectorySearch;
}) {
  const v = await requireViewer();
  const admin = v.roles.includes("admin");
  const params = await searchParams;
  const q = directoryQuery(params);
  const archived = params.archived === "true";
  const cursor = announcementCursorSchema.safeParse(params).data;
  const page = announcementPageSchema.parse(
    one(
      await v.db.rpc("announcement_page", {
        p_query: q,
        p_archived: archived,
        p_important: cursor ? cursor.important === "true" : null,
        p_at: cursor?.at ?? null,
        p_id: cursor?.id ?? null,
      }),
    ),
  );
  const filters = new URLSearchParams({ q, archived: String(archived) });
  const firstHref = `/klub/oznamy?${filters}`;
  const last = page.items.at(-1);
  if (last) {
    filters.set("at", last.created_at);
    filters.set("id", last.id);
    filters.set("important", String(last.important));
  }
  const fields: Field[] = [
    { name: "title", label: "Nadpis" },
    { name: "body", label: "Text oznamu", type: "textarea" },
    {
      name: "audience",
      label: "Komu sa oznam zobrazí",
      value: admin ? "club" : "teams",
      options: [
        ...(admin ? [{ value: "club", label: "Celý klub" }] : []),
        { value: "teams", label: "Vybrané tímy" },
        ...(admin ? [{ value: "people", label: "Konkrétni členovia" }] : []),
      ],
    },
    {
      name: "teams",
      label: "Vybrané tímy",
      source: "managed-teams",
      multiple: true,
      required: false,
      hint: "Použije sa iba pri publiku Vybrané tímy. Najviac 50 tímov.",
    },
    ...(admin
      ? [
          {
            name: "recipients",
            label: "Konkrétni príjemcovia",
            source: "members",
            multiple: true,
            required: false,
            hint: "Použije sa iba pri publiku Konkrétni členovia. Rodiča vyberte samostatne.",
          } satisfies Field,
        ]
      : []),
    {
      name: "important",
      label: "Dôležitosť",
      value: "false",
      options: [
        { value: "false", label: "Bežný oznam" },
        { value: "true", label: "Dôležitý oznam" },
      ],
    },
  ];
  return (
    <>
      <PageHeading
        title="Klubová nástenka"
        description="Správy, ktoré držia klub pohromade."
        action={
          (admin || v.roles.includes("coach")) && (
            <FormDialog
              title="Nový oznam"
              description="Vyberte publikum. Tréner môže publikovať iba pre tímy, ktoré vedie."
            >
              <ActionForm
                action={mutate}
                hidden={{ command: "announcement" }}
                fields={fields}
                submit="Zverejniť oznam"
              />
            </FormDialog>
          )
        }
      />
      <form className="toolbar">
        <label className="field">
          Hľadať oznam
          <input name="q" defaultValue={q} maxLength={160} />
        </label>
        <label className="field">
          Zobraziť
          <select name="archived" defaultValue={String(archived)}>
            <option value="false">Aktuálne oznamy</option>
            <option value="true">Archív oznamov</option>
          </select>
        </label>
        <Button variant="secondary">Filtrovať</Button>
        <Link className="text-link" href="/klub/oznamy">
          Zrušiť filtre
        </Link>
      </form>
      {page.items.length ? (
        <div className="stack announcement-feed">
          {page.items.map((a) => (
            <Panel key={a.id} title={a.title} plain>
              <div className="panel-body">
                <div className="event-meta">
                  <span className="badge">
                    {a.audience === "people"
                      ? "Konkrétni členovia"
                      : a.team_id || a.extra_team_ids.length
                        ? `Vybrané tímy (${a.extra_team_ids.length + (a.team_id ? 1 : 0)})`
                        : "Celý klub"}
                  </span>
                  {a.important && <span className="badge match">Dôležité</span>}
                  <span>
                    {dateTime(a.created_at, "d. MMMM yyyy")} · {a.author_name}
                  </span>
                </div>
                <p className="body-copy mt-4">{a.body}</p>
                {a.can_manage && (
                  <div className="toolbar mt-5">
                    <FormDialog
                      title="Upraviť oznam"
                      label="Upraviť"
                      variant="secondary"
                      description="Zmena publika okamžite mení prístup k oznamu aj jeho upozorneniam."
                    >
                      <ActionForm
                        action={mutate}
                        hidden={{ command: "announcement", id: a.id }}
                        fields={fields.map((f) => ({
                          ...f,
                          value: (
                            {
                              title: a.title,
                              body: a.body,
                              important: String(a.important),
                              audience: a.recipient_ids.length
                                ? "people"
                                : a.team_id || a.extra_team_ids.length
                                  ? "teams"
                                  : "club",
                              teams: [a.team_id, ...a.extra_team_ids]
                                .filter(Boolean)
                                .join(","),
                              recipients: a.recipient_ids.join(","),
                            } as Record<string, string>
                          )[f.name],
                        }))}
                      />
                    </FormDialog>
                    {!a.archived && (
                      <ActionForm
                        action={mutate}
                        hidden={{ command: "archive-announcement", id: a.id }}
                        fields={[]}
                        submit="Archivovať oznam"
                        variant="secondary"
                      />
                    )}
                  </div>
                )}
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <Panel title="Oznamy">
          <Empty
            title="Žiadne zodpovedajúce oznamy"
            description="Upravte vyhľadávanie alebo prepnite na aktuálne oznamy."
          />
        </Panel>
      )}
      <Pagination
        firstHref={firstHref}
        continued={!!cursor}
        count={page.items.length}
        nextHref={page.has_more && last ? `/klub/oznamy?${filters}` : undefined}
      />
    </>
  );
}
