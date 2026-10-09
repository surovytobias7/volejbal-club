import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
export function rows<T>(result: {
  data: T[] | null;
  error: PostgrestError | null;
}): T[] {
  if (result.error) throw new Error("Údaje sa nepodarilo načítať.");
  return result.data || [];
}
export function one<T extends { data: unknown; error: PostgrestError | null }>(
  result: T,
): NonNullable<T["data"]> {
  if (result.error || !result.data) throw new Error("Záznam nie je dostupný.");
  return result.data as NonNullable<T["data"]>;
}
