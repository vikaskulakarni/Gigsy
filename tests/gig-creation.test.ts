import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientUser, freelancerUser } from "./utils/auth";
import { createDatabaseMock } from "./utils/database";
import { createJsonRequest } from "./utils/request";

const database = createDatabaseMock();
const auth = {
  getCurrentUser: vi.fn(),
};
let postHandler: (request: Request) => Promise<Response>;

const validGig = {
  title: "Build a reporting dashboard",
  description:
    "Create a responsive reporting dashboard for a growing business.",
  budgetMin: 1000,
  budgetMax: 2500,
  deadline: "2026-12-01",
  skills: "React, TypeScript",
};

async function post(body: unknown): Promise<Response> {
  return postHandler(createJsonRequest("POST", body));
}

function configureClientAndGig(gigId = 91, clientId = 12) {
  database.connection.execute
    .mockResolvedValueOnce([[{ client_id: clientId }], []])
    .mockResolvedValueOnce([{ insertId: gigId }, []]);
}

beforeEach(async () => {
  vi.doMock("@/lib/db", () => ({ default: database.pool }));
  vi.doMock("@/lib/auth", () => ({ getCurrentUser: auth.getCurrentUser }));
  ({ POST: postHandler } = await import("../src/app/api/gigs/route"));

  auth.getCurrentUser.mockReset().mockResolvedValue(clientUser);
  database.pool.getConnection.mockReset().mockResolvedValue(database.connection);
  database.connection.execute.mockReset().mockResolvedValue([[], []]);
  database.connection.beginTransaction.mockReset().mockResolvedValue();
  database.connection.commit.mockReset().mockResolvedValue();
  database.connection.rollback.mockReset().mockResolvedValue();
  database.connection.release.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/gigs", () => {
  it("rejects unauthenticated requests before accessing the database", async () => {
    auth.getCurrentUser.mockResolvedValueOnce(null);

    const response = await post(validGig);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Please sign in.",
    });
    expect(database.pool.getConnection).not.toHaveBeenCalled();
  });

  it("rejects freelancers from publishing gigs", async () => {
    auth.getCurrentUser.mockResolvedValueOnce(freelancerUser);

    const response = await post(validGig);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Only clients can publish gigs.",
    });
    expect(database.pool.getConnection).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      body: "{invalid json",
      headers: { "content-type": "application/json" },
    });

    const response = await postHandler(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Invalid request body.",
    });
    expect(database.pool.getConnection).not.toHaveBeenCalled();
  });

  it.each([
    ["short title", { ...validGig, title: "Test" }],
    ["long title", { ...validGig, title: "x".repeat(151) }],
    ["short description", { ...validGig, description: "Too short" }],
    ["invalid minimum budget", { ...validGig, budgetMin: 0 }],
    ["maximum below minimum", { ...validGig, budgetMin: 2000, budgetMax: 1000 }],
    ["non-numeric budget", { ...validGig, budgetMin: "not-a-number" }],
    ["invalid deadline format", { ...validGig, deadline: "12/01/2026" }],
    ["invalid calendar date", { ...validGig, deadline: "2026-02-30" }],
  ])("rejects %s with a 400 response", async (_case, body) => {
    const response = await post(body);

    expect(response.status).toBe(400);
    expect(database.pool.getConnection).not.toHaveBeenCalled();
    expect(database.connection.execute).not.toHaveBeenCalled();
  });

  it("creates a gig with the authenticated client's profile and defaults", async () => {
    configureClientAndGig();
    const body = { ...validGig, deadline: undefined, skills: undefined };

    const response = await post(body);

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "Gig published successfully.",
      gigId: 91,
    });
    expect(database.connection.beginTransaction).toHaveBeenCalledOnce();
    expect(database.connection.execute).toHaveBeenNthCalledWith(
      1,
      "SELECT client_id FROM client WHERE user_id = ? LIMIT 1",
      [clientUser.user_id],
    );
    expect(database.connection.execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO gig"),
      [12, validGig.title, validGig.description, 1000, 2500, null],
    );
    expect(database.connection.commit).toHaveBeenCalledOnce();
    expect(database.connection.rollback).not.toHaveBeenCalled();
    expect(database.connection.release).toHaveBeenCalledOnce();
  });

  it("trims fields and creates deduplicated skill associations", async () => {
    configureClientAndGig(92, 13);
    database.connection.execute
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([[{ skill_id: 3 }], []])
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([[{ skill_id: 4 }], []])
      .mockResolvedValueOnce([[], []]);

    const response = await post({
      ...validGig,
      title: `  ${validGig.title}  `,
      description: `  ${validGig.description}  `,
      skills: " React, react, TypeScript ",
    });

    expect(response.status).toBe(201);
    expect(database.connection.execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO gig"),
      [13, validGig.title, validGig.description, 1000, 2500, validGig.deadline],
    );
    expect(database.connection.execute).toHaveBeenNthCalledWith(
      3,
      "INSERT IGNORE INTO skill (skill_name) VALUES (?)",
      ["react"],
    );
    expect(database.connection.execute).toHaveBeenNthCalledWith(
      4,
      "SELECT skill_id FROM skill WHERE skill_name = ? LIMIT 1",
      ["react"],
    );
    expect(database.connection.execute).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining("INSERT INTO gig_skill"),
      [92, 3],
    );
    expect(database.connection.execute).toHaveBeenNthCalledWith(
      6,
      "INSERT IGNORE INTO skill (skill_name) VALUES (?)",
      ["TypeScript"],
    );
    expect(database.connection.execute).toHaveBeenNthCalledWith(
      7,
      "SELECT skill_id FROM skill WHERE skill_name = ? LIMIT 1",
      ["TypeScript"],
    );
    expect(database.connection.execute).toHaveBeenNthCalledWith(
      8,
      expect.stringContaining("INSERT INTO gig_skill"),
      [92, 4],
    );
  });

  it("commits without a gig-skill link when a skill lookup has no row", async () => {
    configureClientAndGig();
    database.connection.execute.mockResolvedValueOnce([[], []]).mockResolvedValueOnce([[], []]);

    const response = await post({ ...validGig, skills: "Unknown" });

    expect(response.status).toBe(201);
    expect(database.connection.execute).toHaveBeenCalledTimes(4);
    expect(database.connection.commit).toHaveBeenCalledOnce();
  });

  it("rejects requests with more than 20 skills", async () => {
    const skills = Array.from({ length: 21 }, (_, index) => `Skill ${index}`).join(",");

    const response = await post({ ...validGig, skills });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "You can add up to 20 skills.",
    });
    expect(database.pool.getConnection).not.toHaveBeenCalled();
  });

  it("returns 404 and rolls back when the client profile is missing", async () => {
    database.connection.execute.mockResolvedValueOnce([[], []]);

    const response = await post(validGig);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Client profile not found.",
    });
    expect(database.connection.rollback).toHaveBeenCalledOnce();
    expect(database.connection.commit).not.toHaveBeenCalled();
    expect(database.connection.release).toHaveBeenCalledOnce();
  });

  it("rolls back and returns 500 when gig insertion fails", async () => {
    database.connection.execute
      .mockResolvedValueOnce([[{ client_id: 12 }], []])
      .mockRejectedValueOnce(new Error("insert failed"));

    const response = await post(validGig);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Could not publish gig. Please verify the database schema and try again.",
    });
    expect(database.connection.rollback).toHaveBeenCalledOnce();
    expect(database.connection.commit).not.toHaveBeenCalled();
    expect(database.connection.release).toHaveBeenCalledOnce();
  });

  it("rolls back when a skill operation fails", async () => {
    configureClientAndGig();
    database.connection.execute.mockRejectedValueOnce(new Error("skill insert failed"));

    const response = await post(validGig);

    expect(response.status).toBe(500);
    expect(database.connection.rollback).toHaveBeenCalledOnce();
    expect(database.connection.commit).not.toHaveBeenCalled();
    expect(database.connection.release).toHaveBeenCalledOnce();
  });
});
