// Never return credentials, URLs, SDK errors or response records in reports.
export function liveConfiguration(env) {
  try {
    const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/" ||
      (url.protocol !== "https:" && !(local && url.protocol === "http:"))
    )
      return null;
    const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
    const publishable = key.startsWith("sb_publishable_") && key.length > 20;
    let legacyAnon = false;
    if (key.split(".").length === 3) {
      try {
        legacyAnon =
          JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString())
            .role === "anon";
      } catch {}
    }
    if (!publishable && !legacyAnon) return null;
    return { url: url.origin, key };
  } catch {
    return null;
  }
}

export function deniedOrEmpty(result) {
  // Network/schema errors are failures, not evidence of authorization.
  return (
    result.error?.code === "42501" ||
    (!result.error && Array.isArray(result.data) && result.data.length === 0)
  );
}

export function createReport() {
  const checks = [];
  return {
    add(name, passed) {
      checks.push({ name, status: passed ? "pass" : "fail" });
    },
    blocked(name) {
      checks.push({ name, status: "blocked" });
    },
    result() {
      return {
        at: new Date().toISOString(),
        scope: "read-only-auth-and-postgrest",
        checks: [...checks],
        passed: checks.length > 0 && checks.every((c) => c.status === "pass"),
      };
    },
  };
}
