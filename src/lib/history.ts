import { z } from "zod";

export type HistorySearch = Promise<
  Record<string, string | string[] | undefined>
>;
const cursorSchema = z.object({
  at: z.iso.datetime({ offset: true }),
  id: z.uuid(),
});
export function historyCursor(params: Awaited<HistorySearch>) {
  const parsed = cursorSchema.safeParse(params);
  return parsed.success ? parsed.data : null;
}
// Only validated ISO timestamps and UUIDs may enter the PostgREST filter grammar.
export function historyFilter(value: unknown) {
  const cursor = cursorSchema.parse(value);
  return `created_at.lt.${cursor.at},and(created_at.eq.${cursor.at},id.lt.${cursor.id})`;
}
export function historyHref(
  path: string,
  cursor: { created_at: string; id: string },
) {
  return `${path}?${new URLSearchParams({ at: cursor.created_at, id: cursor.id })}`;
}
export function historyPage<T>(records: T[]) {
  return { items: records.slice(0, 25), hasMore: records.length > 25 };
}
