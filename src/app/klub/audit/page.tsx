import { requireAdmin } from "@/lib/auth";
import { rows } from "@/lib/data";
import { PageHeading, Panel, Empty } from "@/components/shared";
import { dateTime } from "@/lib/utils";
import { Pagination } from "@/components/pagination";
import {
  historyCursor,
  historyFilter,
  historyHref,
  historyPage,
  type HistorySearch,
} from "@/lib/history";
const names: Record<string, string> = {
  profiles: "Členský profil",
  member_details: "Osobné údaje",
  user_roles: "Prístupová rola",
  teams: "Tím",
  team_memberships: "Členstvo v tíme",
  guardian_players: "Prepojenie rodiča",
  events: "Udalosť",
  attendance: "Dochádzka",
  fee_plans: "Poplatkový plán",
  charges: "Členský poplatok",
  payments: "Platba",
  charge_adjustments: "Oprava členského poplatku",
  announcements: "Klubový oznam",
  club_settings: "Nastavenia klubu",
};
export default async function Audit({
  searchParams,
}: {
  searchParams: HistorySearch;
}) {
  const v = await requireAdmin();
  const cursor = historyCursor(await searchParams);
  let request = v.db
    .from("audit_logs")
    .select("id,actor_id,table_name,operation,record_id,created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(26);
  if (cursor) request = request.or(historyFilter(cursor));
  const { items: logs, hasMore } = historyPage(rows(await request));
  const last = logs.at(-1);
  const actorIds = [
    ...new Set(logs.map((l) => l.actor_id).filter((id): id is string => !!id)),
  ];
  const actors = actorIds.length
    ? rows(
        await v.db
          .from("profiles")
          .select("user_id,full_name")
          .in("user_id", actorIds),
      )
    : [];
  return (
    <>
      <PageHeading
        title="História zmien"
        description="História administratívnych zmien. Záznamy nie je možné upravovať cez aplikáciu."
      />
      <Panel title="Auditná stopa">
        {logs.length ? (
          <div className="data-table-wrap">
            <table className="data-table responsive-table" role="table">
              <thead role="rowgroup">
                <tr role="row">
                  <th scope="col" role="columnheader">
                    Kedy
                  </th>
                  <th scope="col" role="columnheader">
                    Kto
                  </th>
                  <th scope="col" role="columnheader">
                    Oblasť
                  </th>
                  <th scope="col" role="columnheader">
                    Zmena
                  </th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {logs.map((l) => (
                  <tr role="row" key={l.id}>
                    <td role="cell" data-label="Kedy">
                      {dateTime(l.created_at)}
                    </td>
                    <td role="cell" data-label="Kto">
                      {actors.find((a) => a.user_id === l.actor_id)
                        ?.full_name || "Systém / odstránený účet"}
                    </td>
                    <td role="cell" data-label="Oblasť">
                      {names[l.table_name] || "Klubový záznam"}
                    </td>
                    <td role="cell" data-label="Zmena">
                      {{
                        INSERT: "Vytvorené",
                        UPDATE: "Upravené",
                        DELETE: "Odstránené",
                      }[l.operation as string] || "Zmena"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty description="Administratívne zmeny sa zaznamenajú automaticky." />
        )}
        <Pagination
          firstHref="/klub/audit"
          continued={!!cursor}
          count={logs.length}
          nextHref={
            hasMore && last ? historyHref("/klub/audit", last) : undefined
          }
        />
      </Panel>
    </>
  );
}
