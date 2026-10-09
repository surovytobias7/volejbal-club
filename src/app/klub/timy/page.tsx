import Link from "next/link";
import { Volleyball, ArrowUpRight } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { one } from "@/lib/data";
import { Pagination } from "@/components/pagination";
import {
  teamPageSchema,
  directoryCursor,
  directoryHref,
  type DirectorySearch,
} from "@/lib/directories";
import { PageHeading, Empty } from "@/components/shared";
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
                fields={teamFields}
                submit="Vytvoriť tím"
              />
            </FormDialog>
          )
        }
      />
      <div className="toolbar">
        <div className="tabs">
          <Link href="/klub/timy" className={!archived ? "active" : ""}>
            Aktívne tímy
          </Link>
          <Link
            href="/klub/timy?archived=true"
            className={archived ? "active" : ""}
          >
            Archív
          </Link>
        </div>
      </div>
      {teams.length ? (
        <div className="team-grid">
          {teams.map((t) => (
            <Link className="team-card" href={`/klub/timy/${t.id}`} key={t.id}>
              <span className="team-card-icon">
                <Volleyball size={26} />
              </span>
              <span className="badge">{t.category}</span>
              <h2>{t.name}</h2>
              <p>{t.description || "Tréningy, hráči a tímové informácie."}</p>
              <div className="team-card-footer">
                Otvoriť tím
                <ArrowUpRight size={17} />
              </div>
            </Link>
          ))}
        </div>
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
