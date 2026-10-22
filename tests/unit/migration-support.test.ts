import { describe, expect, it, vi } from "vitest";
import {
  compareMigrationHistory,
  inspectMigrationHistory,
} from "../../scripts/migration-support.mjs";

const ref = "abcdefghijklmnopqrst";
const env = {
  NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
  LIVE_TEST_PROJECT_URL: `https://${ref}.supabase.co`,
  SUPABASE_ACCESS_TOKEN: "sbp_fc_fictional_test_only",
};
const local = [
  "20261001000000_first.sql",
  "20261002000000_second.sql",
  "20261003000000_third.sql",
];
const rows = [
  { version: "20261001000000", name: "not-returned-private-value" },
];

describe("read-only migration diagnostics", () => {
  it("uses only the scoped history GET endpoint without public keys or a database password", async () => {
    const request = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => rows });
    const result = await inspectMigrationHistory({
      env,
      local,
      linkedRef: ref,
      request,
    });
    expect(result).toMatchObject({
      status: "verified",
      applied: [rows[0].version],
      pending: local.slice(1),
    });
    expect(request).toHaveBeenCalledExactlyOnceWith(
      `https://api.supabase.com/v1/projects/${ref}/database/migrations`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}` },
        redirect: "error",
        signal: expect.any(AbortSignal),
      },
    );
    expect(JSON.stringify(result)).not.toContain(env.SUPABASE_ACCESS_TOKEN);
    expect(JSON.stringify(result)).not.toContain(ref);
    expect(JSON.stringify(result)).not.toContain(rows[0].name);
  });
  it.each([
    [{ SUPABASE_ACCESS_TOKEN: "" }, "missing_token"],
    [
      { SUPABASE_ACCESS_TOKEN: "sb_secret_wrong_credential" },
      "malformed_token",
    ],
    [{ SUPABASE_ACCESS_TOKEN: "sbp_token\n" }, "malformed_token"],
    [
      { LIVE_TEST_PROJECT_URL: "https://different.supabase.co" },
      "unconfirmed_target",
    ],
    [
      { NEXT_PUBLIC_SUPABASE_URL: "https://user:secret@example.com" },
      "invalid_target",
    ],
    [
      { NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co.evil.test` },
      "invalid_target",
    ],
  ])(
    "fails before sending credentials for invalid configuration %j",
    async (override, code) => {
      const request = vi.fn();
      expect(
        await inspectMigrationHistory({
          env: { ...env, ...override },
          local,
          request,
        }),
      ).toMatchObject({ status: "blocked", code });
      expect(request).not.toHaveBeenCalled();
    },
  );
  it("refuses an inconsistent CLI project link", async () => {
    const request = vi.fn();
    expect(
      await inspectMigrationHistory({
        env,
        local,
        linkedRef: "different",
        request,
      }),
    ).toMatchObject({ code: "linked_target_mismatch" });
    expect(request).not.toHaveBeenCalled();
  });
  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "unavailable_project"],
    [429, "rate_limited"],
    [503, "management_failed"],
  ])(
    "classifies HTTP %s without reading or disclosing provider errors",
    async (status, code) => {
      const json = vi
        .fn()
        .mockResolvedValue({ message: "private database response" });
      const request = vi.fn().mockResolvedValue({ ok: false, status, json });
      const result = await inspectMigrationHistory({ env, local, request });
      expect(result).toMatchObject({ status: "blocked", code, http: status });
      expect(json).not.toHaveBeenCalled();
      expect(result).not.toHaveProperty("pending");
    },
  );
  it("redacts connection failures and does not substitute historical migration data", async () => {
    const request = vi
      .fn()
      .mockRejectedValue(new Error(env.SUPABASE_ACCESS_TOKEN));
    const result = await inspectMigrationHistory({ env, local, request });
    expect(result).toMatchObject({ status: "blocked", code: "network_failed" });
    expect(result).not.toHaveProperty("applied");
    expect(JSON.stringify(result)).not.toContain(env.SUPABASE_ACCESS_TOKEN);
  });
  it("rejects a non-JSON successful response", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error("private response");
      },
    });
    expect(
      await inspectMigrationHistory({ env, local, request }),
    ).toMatchObject({ code: "invalid_remote_history" });
  });
});

describe("migration history comparison", () => {
  it("flags missing predecessors even if the API returns unsorted versions", () => {
    expect(
      compareMigrationHistory(local, [{ version: "20261003000000" }, ...rows]),
    ).toMatchObject({
      status: "review",
      outOfOrder: true,
      pending: [local[1]],
    });
  });
  it("flags unknown migrations and an empty remote history", () => {
    expect(
      compareMigrationHistory(local, [...rows, { version: "20260901000000" }]),
    ).toMatchObject({ status: "review", unknown: ["20260901000000"] });
    expect(compareMigrationHistory(local, [])).toMatchObject({
      status: "review",
      pending: local,
    });
  });
  it.each([
    null,
    {},
    [null],
    [{ version: 20261001000000 }],
    [{ version: "private-value" }],
    [rows[0], rows[0]],
  ])("rejects malformed/duplicate history %j", (remote) => {
    expect(compareMigrationHistory(local, remote)).toEqual({
      status: "blocked",
      code: "invalid_remote_history",
    });
  });
  it.each([[], ["invalid.sql"], [local[0], "20261001000000_duplicate.sql"]])(
    "rejects unsafe local history %j",
    (...files) => {
      expect(compareMigrationHistory(files, rows)).toMatchObject({
        code: "invalid_local_history",
      });
    },
  );
});
