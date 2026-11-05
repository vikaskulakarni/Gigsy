import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sessionCookie } from "../src/lib/auth";

let postHandler: () => Promise<Response>;

beforeEach(async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.doMock("@/lib/auth", () => ({ sessionCookie }));
  ({ POST: postHandler } = await import("../src/app/api/auth/logout/route"));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/auth/logout", () => {
  it("returns success and clears the session cookie", async () => {
    const response = await postHandler();
    const cookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(cookie).toContain(`${sessionCookie}=`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  });

  it("clears the cookie even when no session exists", async () => {
    const response = await postHandler();

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("is safe to call repeatedly", async () => {
    const first = await postHandler();
    const second = await postHandler();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    await expect(first.json()).resolves.toEqual({ success: true });
    await expect(second.json()).resolves.toEqual({ success: true });
    expect(first.headers.get("set-cookie")).toContain(`${sessionCookie}=`);
    expect(second.headers.get("set-cookie")).toContain(`${sessionCookie}=`);
  });
});
