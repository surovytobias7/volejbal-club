import { z } from "zod";
export const selectorKind = z.enum([
  "members",
  "players",
  "coaches",
  "guardians",
  "teams",
  "managed-teams",
  "plans",
]);
export type SelectorKind = z.infer<typeof selectorKind>;
export const selectorResult = z.object({
  items: z.array(z.object({ id: z.uuid(), label: z.string() })),
  has_more: z.boolean(),
});
export const selectedIds = z
  .string()
  .transform((v) => (v ? v.split(",") : []))
  .pipe(z.array(z.uuid()).max(50))
  .transform((ids) => [...new Set(ids)]);
