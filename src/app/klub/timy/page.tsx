import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { one } from "@/lib/data";
import { Pagination } from "@/components/pagination";
import {
  teamPageSchema,
  directoryCursor,
  directoryHref,
  type DirectorySearch,
} from "@/lib/directories";
import { PageHeading, Empty, TeamList } from "@/components/shared";
import { ActionForm } from "@/components/forms";
import { FormDialog } from "@/components/ui/dialog";
import { mutate } from "@/features/actions";
import { teamFields } from "@/features/fields";
export default async function Teams({
  searchParams,
}: {
  searchParams: DirectorySearch;
}) {
  const v = await requireViewer();
  const params = await searchParams;
  const archived = params.archived === "true";
  const cursor = directoryCursor(params);
  const admin = v.roles.includes("admin");
  const categories = admin
    ? one(await v.db.from("club_settings").select("categories").single())
        .categories
    : [];
  const page = teamPageSchema.parse(
    one(
      await v.db.rpc("team_page", {
        p_archived: archived,
        p_after_name: cursor?.after ?? null,
        p_after_id: cursor?.id ?? null,
      }),
    ),
  );
  const teams = page.items;
  const last = teams.at(-1);
  const filters: Record<string, string> = archived ? { archived: "true" } : {};
  return (
    <>
      <PageHeading
        title="Naše tímy"
        description="Každá kategória, jeden spoločný klub."
        action={
          admin && (
            <FormDialog
              title="Nový tím"
              description="Vytvorte tím a následne priraďte trénerov a hráčov."
            >
              <ActionForm
                action={mutate}
                hidden={{ command: "team" }}
                fields={teamFields(categories)}
                submit="Vytvoriť tím"
              />
            </FormDialog>
          )
        }
      />
      <div className="toolbar">
        <div className="tabs">
          <Link
            href="/klub/timy"
            className={!archived ? "active" : ""}
            aria-current={!archived ? "page" : undefined}
          >
            Aktívne tímy
          </Link>
          <Link
            href="/klub/timy?archived=true"
            className={archived ? "active" : ""}
            aria-current={archived ? "page" : undefined}
          >
            Archív
          </Link>
        </div>
      </div>
      {teams.length ? (
        <TeamList teams={teams} />
      ) : (
        <Empty
          title="Každý tím má svoj začiatok"
          description={
            admin
              ? "Vytvorte prvý tím tlačidlom Nový tím."
              : "Správca vám zatiaľ nepriradil žiadny tím."
          }
        />
      )}
      <Pagination
        firstHref={directoryHref("/klub/timy", filters)}
        continued={!!cursor}
        count={teams.length}
        nextHref={
          page.has_more && last
            ? directoryHref("/klub/timy", filters, {
                name: last.name,
                id: last.id,
              })
            : undefined
        }
      />
    </>
  );
}
