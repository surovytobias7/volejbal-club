import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnvironment } from "@/lib/env";
import type { Database } from "@/types/database";

export async function database() {
  const env = publicEnvironment();
  if (!env) throw new Error("Chýba konfigurácia databázy.");
  const jar = await cookies();
  return createServerClient<Database>(env.url, env.key, {
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.APP_URL?.startsWith("https://") === true,
    },
    cookies: {
      getAll: () => jar.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) =>
            jar.set(name, value, options),
          );
        } catch {
          /* Server Components cannot write cookies; proxy refreshes them. */
        }
      },
    },
  });
}
