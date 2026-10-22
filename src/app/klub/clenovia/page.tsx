import { MemberTable } from "@/components/records";
import { requireViewer } from "@/lib/auth";
import { notFound } from "next/navigation";
import { canBrowseMembers } from "@/lib/access";
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
  if (!canBrowseMembers(v.roles)) notFound();
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
        title={admin ? "Členovia klubu" : "Členovia mojich tímov"}
        description={
          admin
            ? "Hráči, tréneri a rodičia. Prepojení v jednom klube."
            : "Profily a kontakty členov tímov, ktoré vediete."
        }
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
          <MemberTable members={members} />
        ) : (
          <Empty
            description={
              admin
                ? "Vytvorte prvý členský profil alebo upravte vyhľadávanie."
                : "Upravte vyhľadávanie. Členov do tímu priraďuje správca klubu."
            }
          />
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
