import Link from "next/link";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { rows } from "@/lib/data";
import { historyPage, type HistorySearch } from "@/lib/history";
import { money } from "@/lib/utils";
import { PageHeading, Panel, Empty } from "@/components/shared";
import { ActionForm } from "@/components/forms";
import { FormDialog } from "@/components/ui/dialog";
import { FinancePagination } from "@/components/finance-pagination";
import { mutate } from "@/features/actions";

export default async function FeePlans({
  searchParams,
}: {
  searchParams: HistorySearch;
}) {
  const v = await requireAdmin();
  const params = await searchParams;
  const archived = params.archived === "true";
  const cursor = z.uuid().safeParse(params.after);
  let request = v.db
    .from("fee_plans")
    .select("*")
    .eq("archived", archived)
    .order("id")
    .limit(26);
  if (cursor.success) request = request.gt("id", cursor.data);
  const page = historyPage(rows(await request));
  const base = `/klub/platby/plany?archived=${archived}`;
  const last = page.items.at(-1);
  return (
    <>
      <Link className="text-link" href="/klub/platby">
        Späť na platby
      </Link>
      <PageHeading
        title="Poplatkové plány"
        description="Šablóny názvov a odporúčaných súm. Úprava plánu nemení už priradené poplatky."
        action={
          <FormDialog
            title="Nový poplatkový plán"
            description="Uložte názov a odporúčanú sumu opakovaného poplatku."
          >
            <ActionForm
              action={mutate}
              hidden={{ command: "fee-plan" }}
              fields={[
                { name: "name", label: "Názov plánu" },
                { name: "amount_cents", label: "Suma v EUR" },
              ]}
              submit="Vytvoriť plán"
            />
          </FormDialog>
        }
      />
      <nav aria-label="Stav poplatkových plánov" className="flex gap-4 mb-6">
        <Link
          className="text-link"
          aria-current={!archived ? "page" : undefined}
          href="/klub/platby/plany"
        >
          Aktívne plány
        </Link>
        <Link
          className="text-link"
          aria-current={archived ? "page" : undefined}
          href="/klub/platby/plany?archived=true"
        >
          Archív
        </Link>
      </nav>
      <Panel title={archived ? "Archivované plány" : "Aktívne plány"}>
        {page.items.length ? (
          page.items.map((p) => (
            <article className="announcement-item" key={p.id}>
              <div className="metric-line">
                <strong>{p.name}</strong>
                <span>{money(p.amount_cents)}</span>
              </div>
              <div className="flex flex-wrap gap-3 mt-3">
                <FormDialog
                  title="Upraviť poplatkový plán"
                  label="Upraviť"
                  description="Nové údaje platia pre plán. Existujúce predpisy a úhrady zostanú zachované."
                >
                  <ActionForm
                    action={mutate}
                    hidden={{ command: "fee-plan", id: p.id }}
                    fields={[
                      { name: "name", label: "Názov plánu", value: p.name },
                      {
                        name: "amount_cents",
                        label: "Suma v EUR",
                        value: (p.amount_cents / 100).toFixed(2),
                      },
                    ]}
                  />
                </FormDialog>
                <FormDialog
                  title={archived ? "Obnoviť plán" : "Archivovať plán"}
                  description={
                    archived
                      ? "Plán sa znovu sprístupní pri priraďovaní poplatkov."
                      : "Plán už nebude možné priradiť k novému poplatku. Existujúce predpisy zostanú zachované."
                  }
                >
                  <ActionForm
                    action={mutate}
                    hidden={{
                      command: "archive-fee-plan",
                      id: p.id,
                      archived: String(!archived),
                    }}
                    fields={[]}
                    submit={archived ? "Obnoviť plán" : "Archivovať plán"}
                    danger={!archived}
                  />
                </FormDialog>
              </div>
            </article>
          ))
        ) : (
          <Empty
            title="Žiadne plány"
            description={
              archived ? "Archív je prázdny." : "Vytvorte prvý poplatkový plán."
            }
          />
        )}
        <FinancePagination
          firstHref={base}
          continued={cursor.success}
          count={page.items.length}
          nextHref={
            page.hasMore && last ? `${base}&after=${last.id}` : undefined
          }
        />
      </Panel>
    </>
  );
}
