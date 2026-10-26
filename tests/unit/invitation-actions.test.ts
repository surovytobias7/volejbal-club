import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireViewer, type Role } from "../../src/lib/auth";
import { appUrl, publicEnvironment } from "../../src/lib/env";
import { mutate } from "../../src/features/actions";

vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../../src/lib/auth", () => ({ requireViewer: vi.fn() }));
vi.mock("../../src/lib/env", () => ({
  appUrl: vi.fn(),
  publicEnvironment: vi.fn(),
}));

const profileId = "00000000-0000-4000-8000-000000000090";
const userId = "00000000-0000-4000-8000-000000000091";
const email = "invitation-fixture@example.invalid";
const privateError = "PRIVATE fixture provider response and credential";
const details = {
  birth_date: null,
  email,
  phone: null,
  account_linked: false,
};
const query = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
};
const db = { from: vi.fn(() => query), rpc: vi.fn() };
const inviteUserByEmail = vi.fn();

function viewer(roles: Role[] = ["admin"]) {
  vi.mocked(requireViewer).mockResolvedValue({
    id: "00000000-0000-4000-8000-000000000001",
    name: "Fiktívny správca",
    roles,
    canFinance: true,
    db,
  } as unknown as Awaited<ReturnType<typeof requireViewer>>);
}

async function invite(extra: Record<string, string> = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    command: "invite",
    id: profileId,
    ...extra,
  }))
    form.set(key, value);
  return mutate({}, form);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPABASE_SECRET_KEY", "fictional-server-key");
  viewer();
  query.single.mockReset().mockResolvedValue({
    data: { id: profileId, active: true },
    error: null,
  });
  db.rpc.mockReset().mockImplementation(async (name: string) => ({
    data: name === "member_private_details" ? details : null,
    error: null,
  }));
  inviteUserByEmail.mockReset().mockResolvedValue({
    data: { user: { id: userId, email } },
    error: null,
  });
  vi.mocked(createClient).mockReturnValue({
    auth: { admin: { inviteUserByEmail } },
  } as unknown as ReturnType<typeof createClient>);
  vi.mocked(publicEnvironment).mockReturnValue({
    url: "https://fixture.supabase.invalid",
    key: "fictional-public-key",
  });
  vi.mocked(appUrl).mockReturnValue("https://club.example.invalid");
});
afterEach(() => vi.unstubAllEnvs());

describe("invitation failure rehearsal (no network or mail)", () => {
  it.each<Role[]>([["coach"], ["player"], ["guardian"], ["coach", "guardian"]])(
    "denies non-admin roles %j before privileged access",
    async (...roles) => {
      viewer(roles);
      expect((await invite()).error).toBeTruthy();
      expect(db.from).not.toHaveBeenCalled();
      expect(createClient).not.toHaveBeenCalled();
    },
  );
  it("uses stored contact and provider identity, ignoring forged form fields", async () => {
    viewer(["coach", "admin"]);
    expect(
      (await invite({ email: "forged@example.invalid", user_id: profileId }))
        .success,
    ).toBeTruthy();
    expect(inviteUserByEmail).toHaveBeenCalledExactlyOnceWith(email, {
      redirectTo: "https://club.example.invalid/nove-heslo",
    });
    expect(db.rpc).toHaveBeenCalledWith("link_member_account", {
      p_id: profileId,
      p_user: userId,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/klub", "layout");
  });
  it.each([true, null])(
    "requires an explicitly unlinked account, got %s",
    async (linked) => {
      db.rpc.mockResolvedValue({
        data: { ...details, account_linked: linked },
        error: null,
      });
      expect((await invite()).error).toBeTruthy();
      expect(inviteUserByEmail).not.toHaveBeenCalled();
    },
  );
  it.each([null, { id: profileId, active: false }])(
    "denies missing/inactive profiles",
    async (profile) => {
      query.single.mockResolvedValue({ data: profile, error: null });
      expect((await invite()).error).toBeTruthy();
      expect(inviteUserByEmail).not.toHaveBeenCalled();
    },
  );
  it.each([null, "invalid"])(
    "does not invite an invalid stored email %s",
    async (value) => {
      db.rpc.mockResolvedValue({
        data: { ...details, email: value },
        error: null,
      });
      expect((await invite()).error).toBeTruthy();
      expect(inviteUserByEmail).not.toHaveBeenCalled();
    },
  );
  it("does not disclose a thrown database error or send after a failed read", async () => {
    query.single.mockRejectedValue(new Error(privateError));
    const result = await invite();
    expect(result.error).toBeTruthy();
    expect(result.error).not.toContain(privateError);
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });
  it("fails closed when current private details cannot be read", async () => {
    db.rpc.mockResolvedValue({ data: null, error: { message: privateError } });
    const result = await invite();
    expect(result.error).toBeTruthy();
    expect(result.error).not.toContain(privateError);
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });
  it("validates the configured origin before asking the provider to send", async () => {
    vi.mocked(appUrl).mockImplementation(() => {
      throw new Error(privateError);
    });
    const result = await invite();
    expect(result.error).toBeTruthy();
    expect(result.error).not.toContain(privateError);
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });
  it("does not send without a server key", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect((await invite()).error).toBeTruthy();
    expect(createClient).not.toHaveBeenCalled();
  });
  it.each(["returned", "thrown"])(
    "reports an unknown provider outcome (%s) without linking or retrying",
    async (mode) => {
      if (mode === "thrown")
        inviteUserByEmail.mockRejectedValue(new Error(privateError));
      else
        inviteUserByEmail.mockResolvedValue({
          data: { user: null },
          error: { message: privateError },
        });
      const result = await invite();
      expect(result.error).toContain("nepodarilo potvrdiť");
      expect(result.error).not.toContain(privateError);
      expect(result.success).toBeUndefined();
      expect(inviteUserByEmail).toHaveBeenCalledTimes(1);
      expect(db.rpc).not.toHaveBeenCalledWith(
        "link_member_account",
        expect.anything(),
      );
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );
  it.each([
    null,
    { id: "invalid", email },
    { id: userId, email: "other@example.invalid" },
  ])(
    "does not link an absent, malformed or mismatched provider identity",
    async (user) => {
      inviteUserByEmail.mockResolvedValue({ data: { user }, error: null });
      expect((await invite()).error).toBeTruthy();
      expect(db.rpc).not.toHaveBeenCalledWith(
        "link_member_account",
        expect.anything(),
      );
    },
  );
  it.each(["returned", "thrown"])(
    "preserves partial-failure guidance when linking fails (%s)",
    async (mode) => {
      db.rpc.mockImplementation(async (name: string) => {
        if (name === "member_private_details")
          return { data: details, error: null };
        if (mode === "thrown") throw new Error(privateError);
        return { data: null, error: { message: privateError } };
      });
      const result = await invite();
      expect(result.error).toContain("prepojenie");
      expect(result.error).toContain("Supabase");
      expect(result.error).not.toContain(privateError);
      expect(result.success).toBeUndefined();
      expect(inviteUserByEmail).toHaveBeenCalledTimes(1);
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );
});
