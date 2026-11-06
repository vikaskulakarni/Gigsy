import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSession,
  hashPassword,
  sessionCookie,
  verifyPassword,
} from "../src/lib/auth";
import { createDatabaseMock } from "./utils/database";
import { createJsonRequest } from "./utils/request";

const database = createDatabaseMock();
let postHandler: (request: Request) => Promise<Response>;
const authMock = {
  createSession: vi.fn(createSession),
  hashPassword: vi.fn(hashPassword),
  sessionCookie,
};

beforeEach(async () => {
  vi.doMock("@/lib/db", () => ({
    default: database.pool,
  }));
  vi.doMock("@/lib/auth", () => ({
    createSession: authMock.createSession,
    hashPassword: authMock.hashPassword,
    sessionCookie: authMock.sessionCookie,
  }));
  ({ POST: postHandler } = await import("../src/app/api/auth/register/route"));
});

function validRegistration(role: "Client" | "Freelancer" = "Client") {
  return {
    name: "  Alex Example  ",
    email: "  ALEX@EXAMPLE.COM ",
    password: "correct password",
    role,
  };
}

function configureSuccessfulInsert(id = 42) {
  database.connection.execute
    .mockResolvedValueOnce([{ insertId: id }, []])
    .mockResolvedValueOnce([[], []]);
}

async function post(body: unknown): Promise<Response> {
  return postHandler(createJsonRequest("POST", body));
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", "register-test-secret");
    database.connection.execute.mockReset();
    database.connection.execute.mockResolvedValue([[], []]);
    database.connection.beginTransaction.mockReset();
    database.connection.beginTransaction.mockResolvedValue();
    database.connection.commit.mockReset();
    database.connection.commit.mockResolvedValue();
    database.connection.rollback.mockReset();
    database.connection.rollback.mockResolvedValue();
    database.connection.release.mockReset();
    database.pool.getConnection.mockClear();
    database.pool.getConnection.mockResolvedValue(database.connection);
    authMock.createSession.mockClear();
    authMock.hashPassword.mockReset().mockImplementation(hashPassword);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("registers a client and creates the client profile", async () => {
    configureSuccessfulInsert(42);

    const response = await post(validRegistration("Client"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      user: {
        id: 42,
        name: "Alex Example",
        email: "alex@example.com",
        role: "Client",
      },
    });
    expect(database.connection.execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("INSERT INTO users"),
      ["Alex Example", "alex@example.com", expect.any(String), "Client"],
    );
    expect(database.connection.execute).toHaveBeenNthCalledWith(
      2,
      "INSERT INTO client(user_id) VALUES(?)",
      [42],
    );
    expect(database.connection.commit).toHaveBeenCalledOnce();
    expect(database.connection.rollback).not.toHaveBeenCalled();
  });

  it("registers a freelancer and creates the freelancer profile", async () => {
    configureSuccessfulInsert(43);

    const response = await post(validRegistration("Freelancer"));

    expect(response.status).toBe(200);
    expect(database.connection.execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO freelancer"),
      [43],
    );
    expect(database.connection.commit).toHaveBeenCalledOnce();
  });

  it("hashes the password before inserting and never returns it", async () => {
    configureSuccessfulInsert();

    const response = await post(validRegistration());
    const insertParameters = database.connection.execute.mock.calls[0][1] as unknown[];
    const storedPassword = insertParameters[2] as string;
    const responseBody = await response.json();

    expect(verifyPassword("correct password", storedPassword)).toBe(true);
    expect(storedPassword).not.toBe("correct password");
    expect(JSON.stringify(responseBody)).not.toContain("correct password");
    expect(responseBody.user).not.toHaveProperty("password");
    expect(responseBody.user).not.toHaveProperty("password_hash");
  });

  it("sets a session cookie after a successful registration", async () => {
    configureSuccessfulInsert();

    const response = await post(validRegistration());

    expect(response.headers.get("set-cookie")).toContain("gigsy_session=");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("Path=/");
  });

  it.each([
    ["missing name", { ...validRegistration(), name: undefined }],
    ["empty name", { ...validRegistration(), name: "   " }],
    ["missing email", { ...validRegistration(), email: undefined }],
    ["invalid email", { ...validRegistration(), email: "not-an-email" }],
    ["missing password", { ...validRegistration(), password: undefined }],
    ["short password", { ...validRegistration(), password: "1234567" }],
    ["missing role", { ...validRegistration(), role: undefined }],
    ["unsupported role", { ...validRegistration(), role: "Admin" }],
  ])("rejects %s with a 400 response", async (_case, body) => {
    const response = await post(body);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Enter valid name, email, password (8+ characters), and role.",
    });
    expect(database.connection.beginTransaction).not.toHaveBeenCalled();
    expect(database.connection.execute).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON and rolls back the acquired connection", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      body: "{invalid json",
      headers: { "content-type": "application/json" },
    });

    const response = await postHandler(request);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Registration failed. Check profile table defaults and schema.",
    });
    expect(database.connection.rollback).toHaveBeenCalledOnce();
    expect(database.connection.release).toHaveBeenCalledOnce();
  });

  it("returns 409 and rolls back when the email already exists", async () => {
    const duplicateError = Object.assign(new Error("duplicate"), {
      code: "ER_DUP_ENTRY",
    });
    database.connection.execute.mockRejectedValueOnce(duplicateError);

    const response = await post(validRegistration());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "An account with this email already exists.",
    });
    expect(database.connection.rollback).toHaveBeenCalledOnce();
    expect(database.connection.commit).not.toHaveBeenCalled();
    expect(database.connection.release).toHaveBeenCalledOnce();
  });

  it("rolls back when user insertion fails", async () => {
    database.connection.execute.mockRejectedValueOnce(new Error("insert failed"));

    const response = await post(validRegistration());

    expect(response.status).toBe(500);
    expect(database.connection.rollback).toHaveBeenCalledOnce();
    expect(database.connection.commit).not.toHaveBeenCalled();
  });

  it("rolls back when password hashing fails", async () => {
    authMock.hashPassword.mockImplementationOnce(() => {
      throw new Error("hash failed");
    });

    const response = await post(validRegistration());

    expect(response.status).toBe(500);
    expect(database.connection.execute).not.toHaveBeenCalled();
    expect(database.connection.rollback).toHaveBeenCalledOnce();
    expect(database.connection.commit).not.toHaveBeenCalled();
  });

  it("rolls back when profile insertion fails", async () => {
    database.connection.execute
      .mockResolvedValueOnce([{ insertId: 42 }, []])
      .mockRejectedValueOnce(new Error("profile insert failed"));

    const response = await post(validRegistration("Freelancer"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      message: "Registration failed. Check profile table defaults and schema.",
    });
    expect(database.connection.rollback).toHaveBeenCalledOnce();
    expect(database.connection.commit).not.toHaveBeenCalled();
    expect(database.connection.release).toHaveBeenCalledOnce();
  });

  it("releases the connection after a successful transaction", async () => {
    configureSuccessfulInsert();

    await post(validRegistration());

    expect(database.connection.release).toHaveBeenCalledOnce();
  });
});
