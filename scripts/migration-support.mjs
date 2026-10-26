// Management diagnostics must never return tokens, URLs, response bodies or SQL.
export const migrationReasons = {
  invalid_target: "Chýba platný hostovaný Supabase projekt.",
  unconfirmed_target: "Testovací projekt nie je výslovne potvrdený.",
  linked_target_mismatch:
    "Lokálne prepojený projekt sa nezhoduje s testovacím cieľom.",
  missing_token:
    "Chýba SUPABASE_ACCESS_TOKEN. Prihlásenie aplikácie ani databázové heslo ho nenahrádza.",
  malformed_token:
    "SUPABASE_ACCESS_TOKEN nemá formát osobného prístupového tokenu alebo obsahuje biele znaky.",
  invalid_local_history:
    "Lokálne migrácie majú neplatné alebo duplicitné verzie.",
  invalid_remote_history:
    "Vzdialená migračná história má neplatný formát alebo duplicitné verzie.",
  unauthorized:
    "Management HTTP 401: token nebol prijatý; overte jeho platnosť, expiráciu alebo odvolanie.",
  forbidden:
    "Management HTTP 403: overte rozsah projektu, Migrations → Read a prístup vlastníka tokenu k projektu.",
  unavailable_project:
    "Management HTTP 404: projekt alebo história nie sú dostupné; overte cieľ a prístup.",
  rate_limited:
    "Management HTTP 429: limit požiadaviek; kontrolu zopakujte neskôr.",
  management_failed: "Management API kontrolu nedokončilo.",
  network_failed:
    "Pripojenie zlyhalo alebo vypršal čas; história nie je overená.",
  history_review:
    "História obsahuje neznáme verzie, medzery v poradí alebo je prázdna. Vyžaduje kontrolu.",
};

export function compareMigrationHistory(local, rows) {
  const validLocal =
    Array.isArray(local) &&
    local.length > 0 &&
    local.every(
      (name) =>
        typeof name === "string" && /^\d{14}_[a-zA-Z0-9_-]+\.sql$/.test(name),
    );
  if (
    !validLocal ||
    new Set(local.map((name) => name.slice(0, 14))).size !== local.length
  )
    return { status: "blocked", code: "invalid_local_history" };
  if (
    !Array.isArray(rows) ||
    rows.some(
      (row) =>
        !row ||
        typeof row.version !== "string" ||
        !/^\d{14}$/.test(row.version),
    )
  )
    return { status: "blocked", code: "invalid_remote_history" };
  const applied = rows.map((row) => row.version).sort();
  if (new Set(applied).size !== applied.length)
    return { status: "blocked", code: "invalid_remote_history" };
  const pending = local
    .filter((name) => !applied.includes(name.slice(0, 14)))
    .sort();
  const unknown = applied.filter(
    (version) => !local.some((name) => name.startsWith(version + "_")),
  );
  const outOfOrder = pending.some((name) =>
    applied.some((version) => version > name.slice(0, 14)),
  );
  const review = unknown.length > 0 || outOfOrder || applied.length === 0;
  return {
    status: review ? "review" : "verified",
    ...(review ? { code: "history_review" } : {}),
    applied,
    pending,
    unknown,
    outOfOrder,
  };
}

/**
 * @param {{ env: Record<string, string | undefined>, local: string[], linkedRef?: string | null, request?: typeof fetch }} options
 */
export async function inspectMigrationHistory({
  env,
  local,
  linkedRef = null,
  request = fetch,
}) {
  const diagnostics = {
    tokenPresent: Boolean(env.SUPABASE_ACCESS_TOKEN),
    targetConfirmed: false,
    linkedProjectMatches: null,
  };
  const blocked = (code, http) => ({
    status: "blocked",
    code,
    ...(http ? { http } : {}),
    diagnostics,
  });
  let target;
  try {
    target = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
    if (
      target.protocol !== "https:" ||
      !/^[a-z]{20}\.supabase\.co$/.test(target.hostname) ||
      target.port ||
      target.username ||
      target.password ||
      target.search ||
      target.hash ||
      target.pathname !== "/"
    )
      return blocked("invalid_target");
  } catch {
    return blocked("invalid_target");
  }
  try {
    // The confirmation must identify the same origin without paths or credentials.
    const confirmed = new URL(env.LIVE_TEST_PROJECT_URL);
    diagnostics.targetConfirmed = confirmed.href === target.href;
  } catch {
    return blocked("unconfirmed_target");
  }
  if (!diagnostics.targetConfirmed) return blocked("unconfirmed_target");
  const ref = target.hostname.split(".")[0];
  diagnostics.linkedProjectMatches =
    linkedRef === null ? null : linkedRef === ref;
  if (diagnostics.linkedProjectMatches === false)
    return blocked("linked_target_mismatch");
  const token = env.SUPABASE_ACCESS_TOKEN;
  if (!token) return blocked("missing_token");
  if (!/^sbp_[A-Za-z0-9_-]+$/.test(token)) return blocked("malformed_token");
  // Validate local names before making any remote request.
  if (compareMigrationHistory(local, []).code === "invalid_local_history")
    return blocked("invalid_local_history");
  try {
    const response = await request(
      `https://api.supabase.com/v1/projects/${ref}/database/migrations`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        redirect: "error",
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!response.ok) {
      const code =
        {
          401: "unauthorized",
          403: "forbidden",
          404: "unavailable_project",
          429: "rate_limited",
        }[response.status] || "management_failed";
      return blocked(code, response.status);
    }
    let rows;
    try {
      rows = await response.json();
    } catch {
      return blocked("invalid_remote_history");
    }
    return { ...compareMigrationHistory(local, rows), diagnostics };
  } catch {
    return blocked("network_failed");
  }
}
