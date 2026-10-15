import Link from "next/link";
import { requireViewer, roleNames } from "@/lib/auth";
import { one } from "@/lib/data";
import { Pagination } from "@/components/pagination";
import {
  memberPageSchema,
  directoryCursor,
  directoryHref,
  directoryQuery,
  type DirectorySearch,
} from "@/lib/directories";
import { PageHeading, Panel, Empty } from "@/components/shared";
import { FormDialog } from "@/components/ui/dialog";
import { ActionForm } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { mutate } from "@/features/actions";
import { memberFields, roleOptions } from "@/features/fields";
export default async function Members({
  searchParams,
}: {
  searchParams: DirectorySearch;
}) {
  const v = await requireViewer();
  const admin = v.roles.includes("admin");
  const params = await searchParams;
  const q = directoryQuery(params);
  const cursor = directoryCursor(params);
  const page = memberPageSchema.parse(
    one(
      await v.db.rpc("member_page", {
        p_query: q,
        p_after_name: cursor?.after ?? null,
        p_after_id: cursor?.id ?? null,
      }),
    ),
  );
  const members = page.items;
  const last = members.at(-1);
  const filters: Record<string, string> = q ? { q } : {};
  return (
    <>
      <PageHeading
        title="Členovia klubu"
        description="Hráči, tréneri a rodičia. Prepojení v jednom klube."
        action={
          admin && (
            <FormDialog
              title="Nový člen"
              description="Profil môže existovať aj bez prihlasovacieho účtu. Pozvánku odošlete z detailu člena."
            >
              <ActionForm
                action={mutate}
                hidden={{ command: "member" }}
                fields={[
                  ...memberFields,
                  {
                    name: "role",
                    label: "Počiatočná rola",
                    options: roleOptions,
                  },
                ]}
                submit="Vytvoriť profil"
              />
            </FormDialog>
          )
        }
      />
      <form className="toolbar">
        <label className="field">
          Hľadať člena
          <input
            name="q"
            maxLength={160}
            defaultValue={q}
            placeholder="Meno alebo priezvisko…"
            autoComplete="off"
          />
        </label>
        <Button variant="secondary">Hľadať</Button>
      </form>
      <Panel title={`Členovia (${page.total})`}>
        {members.length ? (
          <div className="data-table-wrap">
            <table className="data-table responsive-table" role="table">
              <thead role="rowgroup">
                <tr role="row">
                  <th scope="col" role="columnheader">
                    Meno
                  </th>
                  <th scope="col" role="columnheader">
                    Roly
                  </th>
                  <th scope="col" role="columnheader">
                    Stav
                  </th>
                  <th scope="col" role="columnheader">
                    Profil
                  </th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {members.map((p) => (
                  <tr role="row" key={p.id}>
                    <td role="cell" data-label="Meno">
                      <div className="member-identity">
                        <span className="avatar" aria-hidden>
                          {p.full_name
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <div>
                          <strong>{p.full_name}</strong>
                          <small>
                            {p.user_id
                              ? "Prepojený účet"
                              : "Bez prihlasovacieho účtu"}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td role="cell" data-label="Roly">
                      {p.roles.map((r) => roleNames[r]).join(", ")}
                    </td>
                    <td role="cell" data-label="Stav">
                      <span
                        className={`badge ${p.active ? "success" : "danger"}`}
                      >
                        {p.active ? "Aktívny" : "Neaktívny"}
                      </span>
                    </td>
                    <td role="cell" data-label="Profil">
                      <Link
                        className="text-link"
                        href={`/klub/clenovia/${p.id}`}
                      >
                        Otvoriť profil
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty description="Vytvorte prvý členský profil alebo upravte vyhľadávanie." />
        )}
        <Pagination
          firstHref={directoryHref("/klub/clenovia", filters)}
          continued={!!cursor}
          count={members.length}
          nextHref={
            page.has_more && last
              ? directoryHref("/klub/clenovia", filters, {
                  name: last.full_name,
                  id: last.id,
                })
              : undefined
          }
        />
      </Panel>
    </>
  );
}
