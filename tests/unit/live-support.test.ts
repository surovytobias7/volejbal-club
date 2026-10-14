import { describe, expect, it } from "vitest";
import {
  liveConfiguration,
  deniedOrEmpty,
  createReport,
} from "../../scripts/live-support.mjs";

const anon = `header.${Buffer.from(JSON.stringify({ role: "anon" })).toString("base64url")}.signature`;
const secret = `header.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.signature`;
describe("live test safeguards", () => {
  it("rejects privileged and malformed public keys before any request", () => {
    for (const key of [secret, "sb_secret_test_secret_value", "", "invalid"])
      expect(
        liveConfiguration({
          NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
        }),
      ).toBeNull();
  });
  it("accepts only secure or loopback origins without embedded credentials", () => {
    for (const url of ["https://test.supabase.co", "http://127.0.0.1:54321"])
      expect(
        liveConfiguration({
          NEXT_PUBLIC_SUPABASE_URL: url,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: anon,
        }),
      ).not.toBeNull();
    for (const url of [
      "http://test.supabase.co",
      "https://user:password@test.supabase.co",
      "https://test.supabase.co/?key=secret",
      "https://test.supabase.co/other",
      "invalid",
    ])
      expect(
        liveConfiguration({
          NEXT_PUBLIC_SUPABASE_URL: url,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: anon,
        }),
      ).toBeNull();
  });
  it("does not confuse network or schema failures with successful authorization denial", () => {
    expect(deniedOrEmpty({ error: { code: "42501" }, data: null })).toBe(true);
    expect(deniedOrEmpty({ error: null, data: [] })).toBe(true);
    for (const code of ["PGRST205", "PGRST202", "FETCH_ERROR", "401"])
      expect(deniedOrEmpty({ error: { code }, data: null })).toBe(false);
    expect(deniedOrEmpty({ error: null, data: [{ id: "private" }] })).toBe(
      false,
    );
  });
  it("never reports missing prerequisites as a successful run", () => {
    const report = createReport();
    report.add("connection", true);
    report.blocked("account missing");
    expect(report.result().passed).toBe(false);
    expect(createReport().result().passed).toBe(false);
  });
});
