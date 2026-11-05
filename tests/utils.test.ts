import { describe, expect, it } from "vitest";
import {
  clientUser,
  createAuthMock,
  freelancerUser,
} from "./utils/auth";
import { createDatabaseMock } from "./utils/database";
import { createGetRequest, createJsonRequest } from "./utils/request";

describe("API test utilities", () => {
  it("supports authenticated, role-specific, and unauthenticated users", async () => {
    const auth = createAuthMock(clientUser);

    await expect(auth.getCurrentUser()).resolves.toEqual(clientUser);
    auth.setCurrentUser(freelancerUser);
    await expect(auth.getCurrentUser()).resolves.toEqual(freelancerUser);
    auth.setCurrentUser(null);
    await expect(auth.getCurrentUser()).resolves.toBeNull();
  });

  it("supports configurable query results and transactions", async () => {
    const database = createDatabaseMock();
    const rows = [{ id: 1 }];
    database.setExecuteResult([rows, []]);

    await expect(database.pool.execute("SELECT 1")).resolves.toEqual([rows, []]);
    const connection = await database.pool.getConnection();
    await connection.beginTransaction();
    await connection.commit();
    connection.release();

    expect(connection.beginTransaction).toHaveBeenCalledOnce();
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it("supports simulated database errors", async () => {
    const database = createDatabaseMock();
    const error = new Error("database unavailable");
    database.setQueryError(error);

    await expect(database.pool.query("SELECT 1")).rejects.toBe(error);
  });

  it("creates JSON requests with query parameters and cookies", async () => {
    const request = createJsonRequest(
      "POST",
      { title: "Test gig" },
      { query: { status: "Open", page: 2 }, cookies: { gigsy_session: "token" } },
    );

    expect(request.method).toBe("POST");
    expect(new URL(request.url).search).toBe("?status=Open&page=2");
    expect(request.headers.get("cookie")).toBe("gigsy_session=token");
    await expect(request.json()).resolves.toEqual({ title: "Test gig" });

    const getRequest = createGetRequest({ query: { q: "design" } });
    expect(new URL(getRequest.url).searchParams.get("q")).toBe("design");
  });
});
