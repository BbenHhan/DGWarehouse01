import { afterEach, describe, expect, it, vi } from "vitest";

// specs/049-end-to-end-scenarios FR-009 to FR-011. The browser-driven suite can
// only run with sign-in switched off, so the switch exists — and the only thing
// standing between it and an open deployment is this rule.

const ORIGINAL = { ...process.env };

async function load(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return import("@/lib/auth-config");
}

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("the sign-in switch", () => {
  it("requires sign-in when nothing is set — every normal run", async () => {
    const { AUTH_REQUIRED } = await load({ AUTH_REQUIRED: undefined, VERCEL: undefined });
    expect(AUTH_REQUIRED).toBe(true);
  });

  it("can be switched off locally, which is what lets the browser suite run", async () => {
    const { AUTH_REQUIRED } = await load({ AUTH_REQUIRED: "false", VERCEL: undefined });
    expect(AUTH_REQUIRED).toBe(false);
  });

  // The whole point: a forgotten variable must not be able to open a deployment.
  it("ignores the switch on a deployment, however it is set", async () => {
    for (const value of ["false", "FALSE", "0", "", undefined]) {
      const { AUTH_REQUIRED } = await load({ AUTH_REQUIRED: value, VERCEL: "1" });
      expect(AUTH_REQUIRED).toBe(true);
    }
  });

  it("requires sign-in for any value other than exactly \"false\"", async () => {
    for (const value of ["true", "no", "0", "False"]) {
      const { AUTH_REQUIRED } = await load({ AUTH_REQUIRED: value, VERCEL: undefined });
      expect(AUTH_REQUIRED).toBe(true);
    }
  });
});

describe("the data source", () => {
  async function loadDataConfig(value: string | undefined) {
    vi.resetModules();
    if (value === undefined) delete process.env.NEXT_PUBLIC_DATA_SOURCE;
    else process.env.NEXT_PUBLIC_DATA_SOURCE = value;
    return import("@/lib/data-config");
  }

  it("is the live project when nothing is set", async () => {
    expect((await loadDataConfig(undefined)).DATA_SOURCE).toBe("supabase");
  });

  it("can be pointed at the local backend for a test run", async () => {
    expect((await loadDataConfig("local")).DATA_SOURCE).toBe("local");
  });

  it("falls back to the live project for anything unrecognised", async () => {
    expect((await loadDataConfig("nonsense")).DATA_SOURCE).toBe("supabase");
  });
});
