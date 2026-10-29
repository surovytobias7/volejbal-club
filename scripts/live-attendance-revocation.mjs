// Headless fallback only when the collaborative T3 browser is unavailable.
// Uses an existing fictional team; restores its coach membership in finally.
import { readFile, writeFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import { client, config, checked } from "./live-runtime.mjs";
import { createReport } from "./live-support.mjs";
process.loadEnvFile(".env.live.local");
const report = createReport();
const admin = client();
let browser, page, membership;
let restoreNeeded = false;
let stage = "preflight";
const assert = (name, ok) => {
  report.add(name, Boolean(ok));
  if (!ok) throw new Error("Acceptance failed");
};
try {
  if (
    !process.argv.includes("--write-test-data") ||
    config.url !== new URL(process.env.LIVE_TEST_PROJECT_URL).origin
  )
    throw new Error("Explicit test target required");
  const state = JSON.parse(
    await readFile("test-results/live-event-scope-race-state.json", "utf8"),
  );
  if (state.project !== config.url || !state.completedAt)
    throw new Error("Completed fixtures required");
  const event = state.events.find(
    (x) =>
      x.table === "attendance" &&
      x.order === "write-first" &&
      x.winner === "write",
  )?.event;
  if (!event) throw new Error("Missing fixture");
  checked(
    await admin.auth.signInWithPassword({
      email: process.env.LIVE_ADMIN_EMAIL,
      password: process.env.LIVE_ADMIN_PASSWORD,
    }),
    "Admin login",
  );
  const context = checked(await admin.rpc("viewer_context"), "Admin context");
  if (!context?.roles.includes("admin")) throw new Error("Admin required");
  const coaches = checked(
    await admin
      .from("team_memberships")
      .select("team_id,profile_id,kind")
      .eq("team_id", state.source)
      .eq("kind", "coach"),
    "Membership",
  );
  if (coaches.length !== 1) throw new Error("Unexpected fixture membership");
  membership = coaches[0];
  const original = checked(
    await admin
      .from("attendance")
      .select("player_id,status,reason,version")
      .eq("event_id", event),
    "Baseline",
  );
  const eventRow = checked(
    await admin
      .from("events")
      .select("team_id,status")
      .eq("id", event)
      .single(),
    "Event",
  );
  if (
    original.length !== 1 ||
    eventRow.team_id !== state.source ||
    eventRow.status === "cancelled"
  )
    throw new Error("Fixture changed");
  stage = "prehliadač a skutočné prihlásenie";
  browser = await chromium.launch({ headless: true });
  stage = "načítanie prihlasovacej stránky";
  const browserContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  page = await browserContext.newPage();
  page.setDefaultTimeout(15000);
  await page.goto("http://localhost:3000/prihlasenie");
  stage = "prihlásenie trénera";
  await page
    .getByLabel("E-mail", { exact: true })
    .fill(process.env.LIVE_COACH_EMAIL);
  await page
    .getByLabel("Heslo", { exact: true })
    .fill(process.env.LIVE_COACH_PASSWORD);
  await page.getByRole("button", { name: "Prihlásiť sa", exact: true }).click();
  await page.waitForURL("http://localhost:3000/klub");
  stage = "načítanie testovacej udalosti";
  await page.goto(`http://localhost:3000/klub/kalendar/${event}`);
  const board = page.locator("#dochadzka");
  await expect(board).toBeVisible();
  const cookieState = async () =>
    JSON.stringify(
      (await browserContext.cookies())
        .filter((c) => c.name.startsWith("sb-"))
        .map((c) => [c.name, c.value])
        .sort(),
    );
  const initialCookies = await cookieState();
  assert(
    "Autentifikovaný mobilný tréner vidí jedinú testovaciu dochádzku",
    (await board.getByRole("group").count()) === 1,
  );
  const nextStatus = original[0].status === "late" ? "Prítomný" : "Meškanie";
  await board.getByRole("button", { name: nextStatus, exact: true }).click();
  await expect(
    board.getByText("Neuložené zmeny: 1", { exact: true }),
  ).toBeVisible();
  stage = "odobraté trénerstvo";
  restoreNeeded = true;
  const removed = checked(
    await admin
      .from("team_memberships")
      .delete()
      .match(membership)
      .select("profile_id"),
    "Revocation",
  );
  assert(
    "Druhá Auth relácia odobrala iba testovacie priradenie",
    removed.length === 1,
  );
  await board
    .getByRole("button", { name: "Uložiť dochádzku", exact: true })
    .click();
  await expect(board.getByRole("alert")).toContainText("už nemáte prístup");
  assert(
    "Server odmietol uloženie otvoreného návrhu",
    JSON.stringify(
      checked(
        await admin
          .from("attendance")
          .select("player_id,status,reason,version")
          .eq("event_id", event),
        "Readback",
      ),
    ) === JSON.stringify(original),
  );
  await board
    .getByRole("button", { name: "Načítať aktuálne záznamy", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "K dochádzke už nemáte prístup." }),
  ).toBeVisible();
  await expect(board).toHaveCount(0);
  assert(
    "Reload odstránil súpis, návrh aj ovládanie dochádzky",
    (await page
      .getByRole("button", { name: "Uložiť dochádzku", exact: true })
      .count()) === 0 &&
      (await page.getByText("Neuložené zmeny: 1", { exact: true }).count()) ===
        0,
  );
  assert(
    "Revokácia fungovala bez zmeny Auth cookies",
    initialCookies !== "[]" && initialCookies === (await cookieState()),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Udalosť nie je dostupná" }),
  ).toBeVisible();
  assert(
    "Nové načítanie neposkytne neprístupnú udalosť",
    (await page.locator("#dochadzka").count()) === 0,
  );
} catch {
  report.add(`Dokončenie: ${stage}`, false);
} finally {
  if (restoreNeeded) {
    try {
      const restored = checked(
        await admin
          .from("team_memberships")
          .upsert(membership)
          .select("profile_id"),
        "Restore",
      );
      assert(
        "Testovacie trénerstvo obnovené a potvrdené",
        restored.length === 1,
      );
    } catch {
      report.add("Obnovenie testovacieho trénerstva", false);
    }
  }
  if (page) {
    try {
      await page.goto("http://localhost:3000/klub");
      await page
        .getByRole("button", { name: "Odhlásiť sa", exact: true })
        .click();
      await page.waitForURL("**/prihlasenie");
    } catch {
      report.add("Odhlásenie browser relácie", false);
    }
  }
  if (browser) await browser.close();
  try {
    checked(await admin.auth.signOut({ scope: "local" }), "Logout");
  } catch {
    report.add("Odhlásenie administrátorskej relácie", false);
  }
  const result = {
    ...report.result(),
    scope: "headless-chromium-live-attendance-revocation",
  };
  await writeFile(
    "test-results/live-attendance-revocation.json",
    JSON.stringify(result, null, 2),
  );
  for (const check of result.checks)
    console.log(`${check.status.toUpperCase()}: ${check.name}`);
  process.exitCode = result.passed ? 0 : 1;
}
