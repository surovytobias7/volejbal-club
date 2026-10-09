import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { rows } from "@/lib/data";
import { PageHeading, Panel, Empty } from "@/components/shared";
import { ActionForm } from "@/components/forms";
import { mutate } from "@/features/actions";
import { dateTime } from "@/lib/utils";
import { Pagination } from "@/components/pagination";
import {
  historyCursor,
  historyFilter,
  historyHref,
  historyPage,
  type HistorySearch,
} from "@/lib/history";
export default async function Notifications({
  searchParams,
}: {
  searchParams: HistorySearch;
}) {
  const v = await requireViewer();
  const reminders = await v.db.rpc("refresh_my_reminders");
  if (reminders.error) throw new Error("Pripomienky sa nepodarilo načítať.");
  const cursor = historyCursor(await searchParams);
  let request = v.db
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(26);
  if (cursor) request = request.or(historyFilter(cursor));
  const { items, hasMore } = historyPage(rows(await request));
  const last = items.at(-1);
  return (
    <>
      <PageHeading
        title="Upozornenia"
        description="Zmeny programu, klubové správy a informácie o členskom."
      />
      <Panel title="Vaše upozornenia">
        {items.length ? (
          items.map((n) => (
            <article
              key={n.id}
              className={`announcement-item ${n.read_at ? "" : "notification-unread"}`}
            >
              <div className="event-meta">
                <span>{dateTime(n.created_at)}</span>
                {!n.read_at && <span className="badge training">Nové</span>}
              </div>
              <h3>
                <Link href={n.href}>{n.title}</Link>
              </h3>
              {!n.read_at && (
                <ActionForm
                  action={mutate}
                  hidden={{ command: "read-notification", id: n.id }}
                  fields={[]}
                  submit="Označiť ako prečítané"
                />
              )}
            </article>
          ))
        ) : (
          <Empty
            title="Všetko máte pod kontrolou"
            description="Nové upozornenia sa zobrazia na tomto mieste."
          />
        )}
        <Pagination
          firstHref="/klub/notifikacie"
          continued={!!cursor}
          count={items.length}
          nextHref={
            hasMore && last ? historyHref("/klub/notifikacie", last) : undefined
          }
        />
      </Panel>
    </>
  );
}
