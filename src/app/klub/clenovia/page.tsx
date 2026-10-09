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
            placeholder="Meno alebo priezvisko"
          />
        </label>
        <Button variant="secondary">Hľadať</Button>
      </form>
      <Panel title={`Členovia (${page.total})`}>
        {members.length ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Meno</th>
                  <th>Roly</th>
                  <th>Stav</th>
                  <th>Profil</th>
                </tr>
              </thead>
              <tbody>
                {members.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.full_name}</strong>
                      <small>
                        {p.user_id
                          ? "Prepojený účet"
                          : "Bez prihlasovacieho účtu"}
                      </small>
                    </td>
                    <td>{p.roles.map((r) => roleNames[r]).join(", ")}</td>
                    <td>
                      <span
                        className={`badge ${p.active ? "success" : "danger"}`}
                      >
                        {p.active ? "Aktívny" : "Neaktívny"}
                      </span>
                    </td>
                    <td>
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
