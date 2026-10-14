// Generates links without sending mail. Tokens/passwords remain in memory.
// Leaves one fictional, unlinked Auth identity per explicitly authorized run.
import { randomBytes, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { client, config, checked } from "./live-runtime.mjs";
import { createReport } from "./live-support.mjs";

const report = createReport();
const origin = "http://localhost:3000";
const assert = (label, passed) => {
  report.add(label, !!passed);
  if (!passed) throw new Error("Assertion failed");
};
const decode = (s) =>
  s
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&");
try {
  const state = JSON.parse(
    await readFile("test-results/live-identities.json", "utf8"),
  );
  if (
    state.project !== config.url ||
    !process.argv.includes("--write-test-data")
  )
    throw new Error("Explicit matching test target required");
  // Ensure the application is available before creating a test identity.
  const preflight = await fetch(origin + "/prihlasenie", {
    signal: AbortSignal.timeout(10000),
  });
  if (!preflight.ok) throw new Error("App unavailable");
  if (!process.env.SUPABASE_SECRET_KEY) throw new Error("Server key missing");
  const admin = client(process.env.SUPABASE_SECRET_KEY);
  const email = `auth-link-${randomUUID()}@example.com`;
  for (const type of ["invite", "recovery"]) {
    const data = checked(
      await admin.auth.admin.generateLink({ type, email }),
      "Generate test link",
    );
    const token = data.properties.hashed_token;
    const jar = new Map();
    const request = async (path, options = {}) => {
      const response = await fetch(origin + path, {
        ...options,
        headers: {
          ...options.headers,
          Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
        },
        redirect: "manual",
        signal: AbortSignal.timeout(20000),
      });
      for (const cookie of response.headers.getSetCookie()) {
        const pair = cookie.split(";")[0];
        const pos = pair.indexOf("=");
        jar.set(pair.slice(0, pos), pair.slice(pos + 1));
      }
      return response;
    };
    const path = `/auth/confirm?token_hash=${encodeURIComponent(token)}&type=${type}`;
    const confirmed = await request(path);
    assert(
      `${type}: TokenHash vytvorí reláciu a otvorí nové heslo`,
      confirmed.status === 307 &&
        confirmed.headers.get("location") === origin + "/nove-heslo" &&
        jar.size > 0,
    );
    const replay = await request(path);
    assert(
      `${type}: použitý TokenHash nemožno použiť znova`,
      replay.status === 307 &&
        replay.headers.get("location") ===
          origin + "/prihlasenie?status=expired",
    );
    const page = await request("/nove-heslo");
    const html = await page.text();
    const form = [...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].find(
      (m) => m[1].includes('name="password"'),
    )?.[1];
    if (!form) throw new Error("Password form missing");
    const body = new FormData();
    for (const input of form.matchAll(/<input\b([^>]+)>/g)) {
      const attrs = Object.fromEntries(
        [...input[1].matchAll(/([\w$:-]+)="([^"]*)"/g)].map((m) => [
          m[1],
          decode(m[2]),
        ]),
      );
      if (attrs.type === "hidden" && attrs.name)
        body.append(attrs.name, attrs.value || "");
    }
    const password = randomBytes(30).toString("base64url");
    body.set("password", password);
    const changed = await request("/nove-heslo", {
      method: "POST",
      headers: { Origin: origin },
      body,
    });
    assert(
      `${type}: formulár uloží nové heslo`,
      changed.status === 303 && changed.headers.get("location") === "/klub",
    );
    const db = client();
    try {
      const login = await db.auth.signInWithPassword({ email, password });
      assert(
        `${type}: nové heslo umožní prihlásenie`,
        !login.error && login.data.user?.id === data.user.id,
      );
      const profiles = checked(
        await db.from("profiles").select("id"),
        "Unlinked profile scope",
      );
      assert(
        `${type}: neprepojený účet nezíska klubové údaje`,
        profiles.length === 0,
      );
    } finally {
      await db.auth.signOut({ scope: "local" });
    }
    // Discard this HTTP session's local cookies. The unlinked test identity
    // has no club permissions; no browser/user session is affected.
    jar.clear();
  }
} catch {
  report.blocked("Scenár aktivačných a recovery odkazov sa nedokončil");
}
const result = report.result();
result.scope = "live-tokenhash-next-password-forms-no-email";
await writeFile(
  "test-results/live-auth-links.json",
  JSON.stringify(result, null, 2),
);
for (const c of result.checks)
  console.log(`${c.status.toUpperCase()}: ${c.name}`);
process.exitCode = result.passed ? 0 : 1;
