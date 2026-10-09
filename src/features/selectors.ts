"use server";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { one } from "@/lib/data";
import { selectorKind, selectorResult } from "@/lib/selectors";
const input = z.object({
  kind: selectorKind,
  query: z.string().max(160),
  after: z.object({ id: z.uuid(), label: z.string().max(160) }).optional(),
  ids: z.array(z.uuid()).max(50).optional(),
});
export async function lookupOptions(value: unknown) {
  const v = await requireViewer();
  try {
    const p = input.parse(value);
    const result = selectorResult.parse(
      one(
        await v.db.rpc("selector_options", {
          p_kind: p.kind,
          p_query: p.query,
          p_after_label: p.after?.label ?? null,
          p_after_id: p.after?.id ?? null,
          p_ids: p.ids ?? null,
        }),
      ),
    );
    return { ...result, error: undefined };
  } catch {
    return {
      items: [],
      has_more: false,
      error: "Možnosti sa nepodarilo načítať. Skúste to znova.",
    };
  }
}
