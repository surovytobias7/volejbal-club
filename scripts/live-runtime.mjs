import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { liveConfiguration } from "./live-support.mjs";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
export const config = liveConfiguration(process.env);
if (!config) throw new Error("Chýba platné testovacie pripojenie.");
export function client(key = config.key) {
  return createClient(config.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url, options) =>
        fetch(url, {
          ...options,
          redirect: "error",
          signal: AbortSignal.timeout(20000),
        }),
    },
  });
}
export async function management(path, body, method = "POST") {
  const ref = new URL(config.url).hostname.split(".")[0];
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
      redirect: "error",
    },
  );
  if (!response.ok) {
    const error = new Error(`Management HTTP ${response.status}`);
    if (response.status === 400) {
      const body = await response.json().catch(() => null);
      // Recognize only this fixed provider restriction; never expose raw
      // Management response bodies, which may contain configuration values.
      if (
        body?.message ===
        "Email template modification is not available for free tier projects using the default email provider. Please upgrade your plan or configure a custom SMTP provider."
      )
        error.code = "templates_require_smtp_or_paid_plan";
    }
    throw error;
  }
  return response.json();
}
export function checked(result, label) {
  if (result.error)
    throw new Error(
      `${label}: ${/^[A-Z0-9_]{2,20}$/i.test(result.error.code || "") ? result.error.code : "request_failed"}`,
    );
  return result.data;
}
