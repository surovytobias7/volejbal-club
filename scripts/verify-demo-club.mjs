// Real local Next login/SSR for the fictional coach; no credentials, cookies or
// authenticated page bodies are printed or persisted in the report.
import { readFile, writeFile } from "node:fs/promises";
import { config } from "./live-runtime.mjs";
import { createReport } from "./live-support.mjs";

const origin = "http://localhost:3000";
const report = createReport();
const jar = new Map();
const decode = (value) =>
  value
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
const hiddenFields = (html) => {
  const form = new FormData();
  for (const input of html.matchAll(/<input\b([^>]+)>/g)) {
    const attrs = Object.fromEntries(
      [...input[1].matchAll(/([\w$:-]+)="([^"]*)"/g)].map((m) => [
        m[1],
        decode(m[2]),
      ]),
    );
    if (attrs.type === "hidden" && attrs.name)
      form.append(attrs.name, attrs.value || "");
  }
  return form;
};
const request = async (path, options = {}) => {
  const response = await fetch(origin + path, {
    ...options,
    headers: {
      ...options.headers,
      Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join("; "),
    },
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(";");
    const position = pair.indexOf("=");
    jar.set(pair.slice(0, position), pair.slice(position + 1));
  }
  return response;
};

try {
  const state = JSON.parse(
    await readFile("test-results/club-demo-state.json", "utf8"),
  );
  if (state.project !== config.url || !state.completedAt)
    throw new Error("Matching completed seed required");
  const page = await request("/prihlasenie");
  const loginHtml = await page.text();
  report.add(
    "Prihlásenie: klubová identita Bilíkova",
    loginHtml.includes("Bilíkova") &&
      loginHtml.includes("/brand/bilikova-logo.png"),
  );
  const formHtml = [
    ...loginHtml.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g),
  ].find((m) => m[1].includes('name="password"'))?.[1];
  if (!formHtml) throw new Error("Login form missing");
  const form = hiddenFields(formHtml);
  form.set("email", state.coach.email);
  form.set("password", state.coach.password);
  const login = await request("/prihlasenie", {
    method: "POST",
    headers: { Origin: origin },
    body: form,
  });
  const loggedIn =
    login.status === 303 && login.headers.get("location") === "/klub";
  report.add("Tréner: skutočný prihlasovací Server Action", loggedIn);
  if (!loggedIn) throw new Error("Login failed");
  const event = state.events.find(
    (item) =>
      item.team_id === state.teams[0].id &&
      item.kind === "training" &&
      item.status === "scheduled",
  );
  for (const [label, path, expected] of [
    ["prehľad", "/klub", "Juniorky U18"],
    ["tímy", "/klub/timy", "Kadetky U16"],
    ["kalendár", "/klub/kalendar", "Tréning"],
    ["dochádzka", "/klub/dochadzka", "Dochádzka"],
    ["oznamy", "/klub/oznamy", "Čo si priniesť na tréning"],
    [
      "profil hráčky s poznámkou",
      `/klub/clenovia/${state.teams[0].players[0].id}`,
      "Ukážková interná poznámka",
    ],
    [
      "tréning s poznámkou",
      `/klub/kalendar/${event.id}`,
      "Ukážkový plán trénera",
    ],
    ["vlastný profil", "/klub/profil", "Martin Volej"],
  ]) {
    const response = await request(path);
    const html = await response.text();
    if (path === "/klub")
      report.add(
        "Tréner: klubová identita v autentifikovanom priestore",
        html.includes("ŠŠK Gymnázium Bilíkova Bratislava") &&
          html.includes("/brand/bilikova-logo.png"),
      );
    report.add(
      `Tréner: ${label}`,
      response.status === 200 &&
        html.includes(expected) &&
        !/Údaje sa nepodarilo načítať|Poznámky sa nepodarilo načítať|"digest":/.test(
          html,
        ),
    );
    if (path === "/klub/timy")
      report.add(
        "Tréner: nepriradený tím sa nezobrazuje",
        !html.includes(state.teams[2].name),
      );
  }
  // Separate HTTP checks from the authenticated PostgREST checks in the seed.
  const dashboard = await request("/klub");
  const logoutHtml = [
    ...(await dashboard.text()).matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g),
  ].find((m) => /Odhlásiť/.test(m[1]))?.[1];
  if (!logoutHtml) throw new Error("Logout form missing");
  const logout = await request("/klub", {
    method: "POST",
    headers: { Origin: origin },
    body: hiddenFields(logoutHtml),
  });
  const denied = await request("/klub");
  report.add(
    "Tréner: odhlásenie a ochrana klubu",
    logout.status === 303 &&
      denied.status === 307 &&
      denied.headers.get("location")?.startsWith("/prihlasenie"),
  );
} catch {
  report.add("Dokončenie lokálneho HTTP overenia", false);
}
const result = {
  ...report.result(),
  scope: "fictional-coach-live-auth-local-next-ssr",
};
await writeFile(
  "test-results/club-demo-http.json",
  JSON.stringify(result, null, 2),
);
for (const check of result.checks)
  console.log(`${check.status.toUpperCase()}: ${check.name}`);
process.exitCode = result.passed ? 0 : 1;
