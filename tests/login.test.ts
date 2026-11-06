import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSession,
  hashPassword,
  readSession,
  sessionCookie,
  verifyPassword,
} from "../src/lib/auth";
import { createDatabaseMock } from "./utils/database";
import { createJsonRequest } from "./utils/request";

const database = createDatabaseMock();
let postHandler: (request: Request) => Promise<Response>;
const authMock = {
  createSession: vi.fn(createSession),
  verifyPassword: vi.fn(verifyPassword),
  sessionCookie,
};

function validLogin() {
  return {
    email: "  USER@EXAMPLE.COM ",
    password: "correct password",
  };
}

function storedUser(role: "Client" | "Freelancer" = "Client") {
  return {
    user_id: role === "Client" ? 7 : 8,
    name: role === "Client" ? "Test Client" : "Test Freelancer",
    email: role === "Client" ? "user@example.com" : "freelancer@example.com",
    password_hash: hashPassword("correct password"),
    user_type: role,
  };
}

async function post(body: unknown): Promise<Response> {
  return postHandler(createJsonRequest("POST", body));
}

beforeEach(async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("SESSION_SECRET", "login-test-secret");
  vi.doMock("@/lib/db", () => ({ default: database.pool }));
  vi.doMock("@/lib/auth", () => ({
    createSession: authMock.createSession,
    sessionCookie: authMock.sessionCookie,
    verifyPassword: authMock.verifyPassword,
  }));
  ({ POST: postHandler } = await import("../src/app/api/auth/login/route"));

  database.pool.execute.mockReset();
  database.pool.execute.mockResolvedValue([[], []]);
  authMock.createSession.mockClear();
  authMock.createSession.mockImplementation(createSession);
  authMock.verifyPassword.mockClear();
  authMock.verifyPassword.mockImplementation(verifyPassword);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/auth/login", () => {
  it.each(["Client", "Freelancer"] as const)(
    "authenticates a valid %s user",
    async (role) => {
      const user = storedUser(role);
      database.pool.execute.mockResolvedValueOnce([[user], []]);

      const response = await post(validLogin());

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        success: true,
        user: {
          id: user.user_id,
          name: user.name,
          email: user.email,
          role,
        },
      });
      expect(database.pool.execute).toHaveBeenCalledWith(
        expect.stringContaining("SELECT user_id,name,email,password_hash,user_type"),
        ["user@example.com"],
      );
      expect(authMock.verifyPassword).toHaveBeenCalledWith(
        "correct password",
        user.password_hash,
      );
      expect(authMock.createSession).toHaveBeenCalledWith({
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        user_type: user.user_type,
      });
    },
  );

  it("normalizes the email before querying", async () => {
    database.pool.execute.mockResolvedValueOnce([[storedUser()], []]);

    await post(validLogin());

    expect(database.pool.execute.mock.calls[0][1]).toEqual(["user@example.com"]);
  });

  it("rejects an incorrect password without creating a session", async () => {
    database.pool.execute.mockResolvedValueOnce([[storedUser()], []]);

    const response = await post({ ...validLogin(), password: "wrong password" });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Invalid email or password.",
    });
    expect(authMock.createSession).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects a nonexistent email without creating a session", async () => {
    database.pool.execute.mockResolvedValueOnce([[], []]);

    const response = await post(validLogin());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Invalid email or password.",
    });
    expect(authMock.verifyPassword).not.toHaveBeenCalled();
    expect(authMock.createSession).not.toHaveBeenCalled();
  });

  it.each([
    ["missing email", { password: "correct password" }],
    ["empty email", { email: "", password: "correct password" }],
    ["missing password", { email: "user@example.com" }],
    ["empty password", { email: "user@example.com", password: "" }],
  ])("returns 401 for %s", async (_case, body) => {
    database.pool.execute.mockResolvedValueOnce([[], []]);

    const response = await post(body);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Invalid email or password.",
    });
    expect(authMock.createSession).not.toHaveBeenCalled();
  });

  it("returns 500 for malformed JSON", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      body: "{invalid json",
      headers: { "content-type": "application/json" },
    });

    const response = await postHandler(request);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Unable to sign in.",
    });
    expect(database.pool.execute).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("returns 500 when the database query fails", async () => {
    database.pool.execute.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await post(validLogin());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Unable to sign in.",
    });
    expect(authMock.createSession).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("returns 500 when session creation fails", async () => {
    database.pool.execute.mockResolvedValueOnce([[storedUser()], []]);
    authMock.createSession.mockImplementationOnce(() => {
      throw new Error("session creation failed");
    });

    const response = await post(validLogin());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Unable to sign in.",
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("sets a secure session cookie with the expected attributes", async () => {
    const user = storedUser();
    database.pool.execute.mockResolvedValueOnce([[user], []]);

    const response = await post(validLogin());
    const cookie = response.headers.get("set-cookie") ?? "";
    const token = cookie.match(/gigsy_session=([^;]+)/)?.[1];

    expect(cookie).toContain(`${sessionCookie}=`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Max-Age=604800");
    expect(token).toBeDefined();
    expect(readSession(token ?? "")).toMatchObject({
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      user_type: user.user_type,
    });
  });

  it("does not return the password or password hash", async () => {
    const user = storedUser();
    database.pool.execute.mockResolvedValueOnce([[user], []]);

    const response = await post(validLogin());
    const body = await response.json();

    expect(body.user).not.toHaveProperty("password");
    expect(body.user).not.toHaveProperty("password_hash");
    expect(JSON.stringify(body)).not.toContain(user.password_hash);
  });
});
