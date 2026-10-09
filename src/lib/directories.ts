import { z } from "zod";

const count = z.number().int().nonnegative().safe();
export const dashboardSummarySchema = z.object({
  team_count: count,
  player_count: count,
  event_count: count,
  pending_count: count,
  participation: z.number().int().min(0).max(100).nullable(),
});
export const memberPageSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      full_name: z.string(),
      active: z.boolean(),
      user_id: z.uuid().nullable(),
      roles: z.array(z.enum(["admin", "coach", "player", "guardian"])),
    }),
  ),
  has_more: z.boolean(),
  total: count,
});
export const teamPageSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      category: z.string(),
      description: z.string().nullable(),
    }),
  ),
  has_more: z.boolean(),
});
export type DirectorySearch = Promise<
  Record<string, string | string[] | undefined>
>;
export function directoryCursor(params: Awaited<DirectorySearch>) {
  const parsed = z
    .object({ after: z.string().min(1).max(160), id: z.uuid() })
    .safeParse(params);
  return parsed.success ? parsed.data : null;
}
export function directoryHref(
  path: string,
  filters: Record<string, string>,
  cursor?: { name: string; id: string },
) {
  const params = new URLSearchParams(filters);
  if (cursor) {
    params.set("after", cursor.name);
    params.set("id", cursor.id);
  }
  return params.size ? `${path}?${params}` : path;
}
export function directoryQuery(params: Awaited<DirectorySearch>) {
  return typeof params.q === "string" ? params.q.trim().slice(0, 160) : "";
}
