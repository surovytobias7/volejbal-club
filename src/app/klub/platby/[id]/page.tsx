import Link from "next/link";
import { feePeriodLabel } from "@/lib/fee-period";
import { z } from "zod";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { one, rows } from "@/lib/data";
import { historyCursor, historyFilter, historyPage } from "@/lib/history";
import {
  paymentPageSchema,
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
import { money, dateTime } from "@/lib/utils";
export default async function Charge({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: FinanceSearch;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const v = await requireViewer();
  const admin = v.roles.includes("admin");
  const charge = one(
    await v.db
      .from("charges")
      .select("*,profiles(full_name)")
      .eq("id", id)
      .single(),
  );
  const search = await searchParams;
  const cursor = financeCursor(search, "payments");
  const adjustmentCursor = historyCursor({
    at: search.adjustAt,
    id: search.adjustId,
  });
  let adjustmentRequest = v.db
    .from("charge_adjustments")
    .select("*")
    .eq("charge_id", id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(26);
  if (adjustmentCursor)
    adjustmentRequest = adjustmentRequest.or(historyFilter(adjustmentCursor));
  const adjustments = historyPage(rows(await adjustmentRequest));
  const adjustmentLast = adjustments.items.at(-1);
  const [summaryResult, pageResult] = await Promise.all([
    v.db.rpc("finance_summary", { p_charge_id: id }),
    v.db.rpc("payment_page", {
      p_charge_id: id,
      p_before_created: cursor?.at ?? null,
      p_before_id: cursor?.id ?? null,
    }),
  ]);
  const { remaining, charged } = financeSummarySchema.parse(one(summaryResult));
  const page = paymentPageSchema.parse(one(pageResult));
  const payments = page.items;
  const last = payments.at(-1);
  return (
    <>
      <Link className="text-link" href="/klub/platby">
        Späť na platby
      </Link>
      <PageHeading
        title={charge.label}
        description={
          (charge.profiles as unknown as { full_name: string })?.full_name ||
          "Členský poplatok"
        }
      />
      <div className="two-columns charge-layout">
        <Panel title="Prehľad poplatku">
          <div className="panel-body">
            <div className="metric-line">
              <span>Predpísaná suma</span>
              <strong>{money(charge.amount_cents)}</strong>
            </div>
            <div className="metric-line">
              <span>Suma po opravách</span>
              <strong>{money(charged)}</strong>
            </div>
            <div className="metric-line">
              <span>Zostáva uhradiť</span>
              <strong>{money(remaining)}</strong>
            </div>
            <div className="metric-line">
              <span>Obdobie</span>
              <strong>
                {feePeriodLabel(charge.period_start, charge.period_end)}
              </strong>
            </div>
            <div className="metric-line">
              <span>Splatnosť</span>
              <strong>{charge.due_date.split("-").reverse().join(". ")}</strong>
            </div>
            {admin && remaining > 0 && (
              <ActionForm
                action={mutate}
                hidden={{ command: "payment", charge_id: id }}
                fields={[
                  {
                    name: "amount_cents",
                    label: "Prijatá suma v EUR",
                    value: (remaining / 100).toFixed(2),
                  },
                  {
                    name: "note",
                    label: "Poznámka k úhrade",
                    hint: "Napríklad dátum prijatia a variabilný symbol.",
                  },
                ]}
                submit="Zaevidovať úhradu"
              />
            )}
            {admin && (
              <FormDialog
                title="Opraviť poplatok"
                variant="secondary"
                description="Zadajte novú celkovú sumu, nie rozdiel. Pôvodný predpis zostane zachovaný. Sumu nemožno znížiť pod prijaté úhrady; najprv stornujte nesprávnu platbu."
              >
                <ActionForm
                  action={mutate}
                  hidden={{ command: "adjust-charge", charge_id: id }}
                  fields={[
                    {
                      name: "new_total_cents",
                      label: "Nová celková suma v EUR",
                      value: (charged / 100).toFixed(2),
                      hint: "Nula zruší neuhradený predpis.",
                    },
                    { name: "note", label: "Dôvod opravy", type: "textarea" },
                  ]}
                  submit="Zaznamenať opravu"
                  danger
                />
              </FormDialog>
            )}
          </div>
        </Panel>
        <Panel title="História platieb">
          {payments.length ? (
            payments.map((p) => (
              <div className="announcement-item" key={p.id}>
                <div className="metric-line">
                  <strong>{money(p.amount_cents)}</strong>
                  <small>{dateTime(p.created_at)}</small>
                </div>
                <p>{p.note}</p>
                {admin && p.amount_cents > 0 && !p.reversed && (
                  <FormDialog
                    title="Stornovať platbu"
                    description="Pôvodný záznam zostane zachovaný. Vytvorí sa opačná transakcia a obnoví sa dlžná suma."
                    label="Stornovať"
                  >
                    <ActionForm
                      action={mutate}
                      hidden={{ command: "reverse-payment", id: p.id }}
                      fields={[
                        {
                          name: "note",
                          label: "Dôvod storna",
                          type: "textarea",
                        },
                      ]}
                      submit="Potvrdiť storno"
                      danger
                    />
                  </FormDialog>
                )}
              </div>
            ))
          ) : (
            <Empty
              title="Zatiaľ bez úhrady"
              description="Zaevidované platby sa zobrazia v tejto histórii."
            />
          )}
          <FinancePagination
            firstHref={`/klub/platby/${id}`}
            continued={!!cursor}
            count={payments.length}
            nextHref={
              page.has_more && last
                ? financePageHref(
                    `/klub/platby/${id}`,
                    last.created_at,
                    last.id,
                  )
                : undefined
            }
          />
        </Panel>
      </div>
      <div className="mt-6">
        <Panel title="Opravy predpisu">
          {adjustments.items.length ? (
            adjustments.items.map((a) => (
              <article className="announcement-item" key={a.id}>
                <div className="metric-line">
                  <strong>
                    {money(a.delta_cents)} · Nová suma{" "}
                    {money(a.new_total_cents)}
                  </strong>
                  <small>{dateTime(a.created_at)}</small>
                </div>
                <p>{a.note}</p>
              </article>
            ))
          ) : (
            <Empty description="Predpis zatiaľ nebol opravovaný." />
          )}
          <FinancePagination
            firstHref={`/klub/platby/${id}`}
            count={adjustments.items.length}
            continued={!!adjustmentCursor}
            nextHref={
              adjustments.hasMore && adjustmentLast
                ? `/klub/platby/${id}?${new URLSearchParams({ adjustAt: adjustmentLast.created_at, adjustId: adjustmentLast.id })}`
                : undefined
            }
          />
        </Panel>
      </div>
    </>
  );
}
