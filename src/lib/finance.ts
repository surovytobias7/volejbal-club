import { z } from "zod";

const cents = z.number().int().safe();
export const financeSummarySchema = z.object({
  count: z.number().int().nonnegative(),
  charged: cents,
  paid: cents,
  remaining: cents,
  overdue: cents,
});
export const chargePageSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      label: z.string(),
      full_name: z.string().nullable(),
      amount_cents: cents,
      remaining: cents,
      due_date: z.iso.date(),
    }),
  ),
  has_more: z.boolean(),
});
export const paymentPageSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      amount_cents: cents,
      note: z.string(),
      // Preserve PostgreSQL's timestamp precision for the next keyset cursor.
      created_at: z.iso.datetime({ offset: true }),
      reversed: z.boolean(),
    }),
  ),
  has_more: z.boolean(),
});

export type FinanceSearch = Promise<
  Record<string, string | string[] | undefined>
>;
export function financeCursor(
  params: Awaited<FinanceSearch>,
  kind: "charges" | "payments",
) {
  const result = z
    .object({
      at: kind === "charges" ? z.iso.date() : z.iso.datetime({ offset: true }),
      id: z.uuid(),
    })
    .safeParse(params);
  return result.success ? result.data : null;
}
export function financePageHref(path: string, at: string, id: string) {
  return `${path}?${new URLSearchParams({ at, id })}`;
}
