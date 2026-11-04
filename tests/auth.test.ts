import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clientUser,
  freelancerUser,
} from "./utils/auth";

const { cookiesMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

import {
  createSession,
  getCurrentUser,
  hashPassword,
  readSession,
  sessionCookie,
  verifyPassword,
} from "../src/lib/auth";

const sessionSecret = "auth-test-secret";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

function signPayload(payload: string): string {
  return createHmac("sha256", sessionSecret).update(payload).digest("hex");
}

function createSignedPayload(payload: object): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

describe("password helpers", () => {
  it("hashes a password into a scrypt record", () => {
    const stored = hashPassword("correct horse battery staple");
    const [kind, salt, hash] = stored.split(":");

    expect(kind).toBe("scrypt");
    expect(salt).toMatch(/^[a-f0-9]{32}$/);
    expect(hash).toMatch(/^[a-f0-9]{128}$/);
    expect(stored).not.toContain("correct horse battery staple");
  });

  it("verifies the correct password and rejects an incorrect password", () => {
    const stored = hashPassword("correct password");

    expect(verifyPassword("correct password", stored)).toBe(true);
    expect(verifyPassword("incorrect password", stored)).toBe(false);
  });

  it.each([
    "",
    "plain-text",
    "bcrypt:salt:hash",
    "scrypt::hash",
    "scrypt:salt:",
  ])("rejects malformed stored password %j", (stored) => {
    expect(verifyPassword("password", stored)).toBe(false);
  });
});

describe("session helpers", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", sessionSecret);
  });

  it("creates a signed token with a base64url payload and hex signature", () => {
    const token = createSession(clientUser);
    const [payload, signature] = token.split(".");

    expect(token.split(".")).toHaveLength(2);
    expect(payload).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(signature).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.parse(Buffer.from(payload, "base64url").toString())).toMatchObject({
      ...clientUser,
      exp: expect.any(Number),
    });
  });

  it("includes only the required session fields", () => {
    const token = createSession({
      ...clientUser,
      password_hash: "scrypt:secret",
      extra: "not-for-session",
    } as typeof clientUser & { password_hash: string; extra: string });
    const [payload] = token.split(".");

    expect(JSON.parse(Buffer.from(payload, "base64url").toString())).toEqual({
      ...clientUser,
      exp: expect.any(Number),
    });
  });

  it("fails safely when production has no session secret", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "");

    expect(() => createSession(clientUser)).toThrow(
      "SESSION_SECRET is required in production",
    );
  });

  it("accepts a configured production session secret", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "configured-production-secret");

    expect(() => createSession(clientUser)).not.toThrow();
  });

  it("continues to support the development fallback secret", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SESSION_SECRET", "");
    const token = createSession(clientUser);

    expect(readSession(token)).toMatchObject(clientUser);
  });

  it.each([clientUser, freelancerUser])(
    "reads a valid %s session",
    (user) => {
      const token = createSession(user);

      expect(readSession(token)).toMatchObject(user);
      expect(readSession(token)?.exp).toBeGreaterThan(Date.now());
    },
  );

  it("rejects a token with an invalid signature", () => {
    const token = createSession(clientUser);
    const [payload] = token.split(".");

    expect(readSession(`${payload}.${"0".repeat(64)}`)).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const token = createSession(clientUser);
    const [payload, signature] = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...clientUser, name: "Tampered user" }),
    ).toString("base64url");

    expect(readSession(`${tamperedPayload}.${signature}`)).toBeNull();
  });

  it("rejects an expired token", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const token = createSession(clientUser);
    vi.setSystemTime(new Date("2026-01-08T00:00:00.000Z"));

    expect(readSession(token)).toBeNull();
  });

  it("rejects a token at the exact expiration boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const token = createSession(clientUser);
    vi.setSystemTime(new Date("2026-01-08T00:00:00.000Z"));

    expect(readSession(token)).toBeNull();
  });

  it.each(["", "not-a-token", ".", "payload.", ".signature", "a.b.c"])(
    "rejects an invalid token format: %j",
    (token) => {
      expect(readSession(token)).toBeNull();
    },
  );

  it("rejects a token whose signed payload is not valid JSON", () => {
    const payload = Buffer.from("not-json").toString("base64url");

    expect(readSession(`${payload}.${signPayload(payload)}`)).toBeNull();
  });

  it.each([
    ["missing user ID", { name: clientUser.name, email: clientUser.email, user_type: "Client" }],
    ["invalid user ID", { user_id: 0, name: clientUser.name, email: clientUser.email, user_type: "Client" }],
    ["missing name", { user_id: clientUser.user_id, email: clientUser.email, user_type: "Client" }],
    ["missing email", { user_id: clientUser.user_id, name: clientUser.name, user_type: "Client" }],
    ["unsupported role", { user_id: clientUser.user_id, name: clientUser.name, email: clientUser.email, user_type: "Admin" }],
  ])("rejects a session with %s", (_case, payload) => {
    expect(readSession(createSignedPayload({
      ...payload,
      exp: Date.now() + 60_000,
    }))).toBeNull();
  });

  it("rejects a session with a non-safe user ID", () => {
    expect(readSession(createSignedPayload({
      ...clientUser,
      user_id: Number.MAX_SAFE_INTEGER + 1,
      exp: Date.now() + 60_000,
    }))).toBeNull();
  });
});

describe("getCurrentUser", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", sessionSecret);
  });

  it("reads and verifies the session cookie", async () => {
    const token = createSession(clientUser);
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: token }),
    });

    await expect(getCurrentUser()).resolves.toMatchObject(clientUser);
    expect(cookiesMock).toHaveBeenCalledOnce();
  });

  it("returns null when the session cookie is absent", async () => {
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("uses the configured session cookie name", async () => {
    const getCookie = vi.fn().mockReturnValue(undefined);
    cookiesMock.mockResolvedValue({ get: getCookie });

    await getCurrentUser();

    expect(getCookie).toHaveBeenCalledWith(sessionCookie);
  });
});
