import { ChargeTable, FinanceSummary } from "@/components/records";
import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { one } from "@/lib/data";
import {
  chargePageSchema,
  financeSummarySchema,
  financeCursor,
  financePageHref,
  type FinanceSearch,
} from "@/lib/finance";
import { FinancePagination } from "@/components/finance-pagination";
import { PageHeading, Panel, Empty } from "@/components/shared";
import { ActionForm } from "@/components/forms";
import { FormDialog } from "@/components/ui/dialog";
import { mutate } from "@/features/actions";
import { dateTime } from "@/lib/utils";
export default async function Payments({
  searchParams,
}: {
  searchParams: FinanceSearch;
}) {
  const v = await requireViewer();
  const admin = v.roles.includes("admin");
  const cursor = financeCursor(await searchParams, "charges");
  const [summaryResult, pageResult] = await Promise.all([
    v.db.rpc("finance_summary", { p_charge_id: null }),
    v.db.rpc("charge_page", {
      p_after_due: cursor?.at ?? null,
      p_after_id: cursor?.id ?? null,
    }),
  ]);
  const summary = financeSummarySchema.parse(one(summaryResult));
  const page = chargePageSchema.parse(one(pageResult));
  const records = page.items;
  const last = records.at(-1);
  const today = dateTime(new Date().toISOString(), "yyyy-MM-dd");
  return (
    <>
      <PageHeading
        title="Členské a platby"
        description="Prehľad poplatkov a úhrad evidovaných klubom."
        action={
          admin && (
            <FormDialog
              title="Priradiť poplatok"
              description="Suma a obdobie sa uložia do členskej evidencie. Online platba nie je súčasťou aplikácie."
            >
              <ActionForm
                action={mutate}
                hidden={{ command: "charge" }}
                fields={[
                  {
                    name: "player_id",
                    label: "Hráč",
                    source: "players",
                  },
                  {
                    name: "plan_id",
                    label: "Poplatkový plán (voliteľné)",
                    required: false,
                    source: "plans",
                  },
                  {
                    name: "label",
                    label: "Názov poplatku",
                    hint: "Napríklad Členské – október 2026",
                  },
                  {
                    name: "amount_cents",
                    label: "Suma v EUR",
                    hint: "Napríklad 35,00",
                  },
                  { name: "period_start", label: "Obdobie od", type: "date" },
                  { name: "period_end", label: "Obdobie do", type: "date" },
                  { name: "due_date", label: "Dátum splatnosti", type: "date" },
                ]}
                submit="Priradiť poplatok"
              />
            </FormDialog>
          )
        }
      />
      <FinanceSummary summary={summary} />
      <Panel title="Členské poplatky">
        {records.length ? (
          <ChargeTable records={records} today={today} />
        ) : (
          <Empty
            title="Žiadne dostupné poplatky"
            description="Poplatky sa zobrazia po ich priradení. Finančné údaje sú dostupné iba oprávneným osobám."
          />
        )}
        <FinancePagination
          firstHref="/klub/platby"
          continued={!!cursor}
          count={records.length}
          nextHref={
            page.has_more && last
              ? financePageHref("/klub/platby", last.due_date, last.id)
              : undefined
          }
        />
      </Panel>
      {admin && (
        <div className="mt-6">
          <Link className="text-link" href="/klub/platby/plany">
            Spravovať poplatkové plány →
          </Link>
        </div>
      )}
    </>
  );
}
