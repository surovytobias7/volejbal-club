// Exercise real Next Server Action login and authenticated SSR without logging
// passwords, action payloads, cookies, page bodies or member records.
import { readFile, writeFile } from "node:fs/promises";
import { config } from "./live-runtime.mjs";
import { createReport } from "./live-support.mjs";
const origin = "http://localhost:3000";
const report = createReport();
const decode = (s) =>
  s
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
try {
  const state = JSON.parse(
    await readFile("test-results/live-identities.json", "utf8"),
  );
  const records = JSON.parse(
    await readFile("test-results/live-created-records.json", "utf8"),
  );
  if (state.project !== config.url) throw new Error("Test target mismatch");
  for (const label of ["ADMIN", "COACH", "GUARDIAN", "PLAYER", "INACTIVE"]) {
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
        const [pair] = cookie.split(";");
        const pos = pair.indexOf("=");
        jar.set(pair.slice(0, pos), pair.slice(pos + 1));
      }
      return response;
    };
    const page = await request("/prihlasenie");
    const html = await page.text();
    const formHtml = [
      ...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g),
    ].find((m) => m[1].includes('name="password"'))?.[1];
    if (!formHtml) throw new Error("Login form missing");
    const form = new FormData();
    for (const input of formHtml.matchAll(/<input\b([^>]+)>/g)) {
      const attrs = Object.fromEntries(
        [...input[1].matchAll(/([\w$:-]+)="([^"]*)"/g)].map((m) => [
          m[1],
          decode(m[2]),
        ]),
      );
      if (attrs.type === "hidden" && attrs.name)
        form.append(attrs.name, attrs.value || "");
    }
    form.set("email", state.accounts[label].email);
    form.set("password", state.accounts[label].password);
    const login = await request("/prihlasenie", {
      method: "POST",
      headers: { Origin: origin },
      body: form,
    });
    const ok =
      login.status === 303 && login.headers.get("location") === "/klub";
    report.add(`${label}: prihlasovací Server Action`, ok);
    if (!ok) continue;
    if (label === "INACTIVE") {
      const denied = await request("/klub");
      report.add(
        "INACTIVE: aplikácia odmietne neaktívny účet",
        denied.status === 307 &&
          denied.headers.get("location")?.includes("status=inactive"),
      );
      continue;
    }
    const routes = [
      "/klub",
      "/klub/timy",
      "/klub/kalendar",
      "/klub/dochadzka",
      "/klub/oznamy",
      "/klub/platby",
      "/klub/notifikacie",
      "/klub/profil",
    ];
    if (label === "ADMIN")
      routes.push(
        "/klub/nastavenia",
        "/klub/audit",
        "/klub/platby/plany",
        `/klub/platby/${records.charge}`,
      );
    if (label === "GUARDIAN" || label === "COACH")
      routes.push(
        `/klub/clenovia/${records.child}`,
        `/klub/kalendar/${records.event}`,
      );
    for (const route of routes) {
      const response = await request(route);
      const body = await response.text();
      report.add(
        `${label}: stránka ${route.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "[test-id]")}`,
        response.status === 200 &&
          !body.includes("Údaje sa nepodarilo načítať") &&
          !body.includes('"digest":'),
      );
    }
    const dashboard = await request("/klub");
    const dashboardHtml = await dashboard.text();
    const logoutForm = [
      ...dashboardHtml.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g),
    ].find((m) => /Odhlásiť/.test(m[1]));
    if (logoutForm) {
      const logoutData = new FormData();
      for (const input of logoutForm[1].matchAll(/<input\b([^>]+)>/g)) {
        const attrs = Object.fromEntries(
          [...input[1].matchAll(/([\w$:-]+)="([^"]*)"/g)].map((m) => [
            m[1],
            decode(m[2]),
          ]),
        );
        if (attrs.type === "hidden" && attrs.name)
          logoutData.append(attrs.name, attrs.value || "");
      }
      const logout = await request("/klub", {
        method: "POST",
        headers: { Origin: origin },
        body: logoutData,
      });
      const denied = await request("/klub");
      report.add(
        `${label}: odhlásenie a ochrana stránky`,
        logout.status === 303 &&
          denied.status === 307 &&
          denied.headers.get("location")?.startsWith("/prihlasenie"),
      );
    } else report.blocked(`${label}: nenašiel sa odhlasovací formulár`);
  }
} catch {
  report.add("Dokončenie HTTP scenára", false);
}
const result = report.result();
result.scope = "live-next-server-actions-and-ssr";
await writeFile("test-results/live-http.json", JSON.stringify(result, null, 2));
for (const c of result.checks)
  console.log(`${c.status.toUpperCase()}: ${c.name}`);
process.exitCode = result.passed ? 0 : 1;
