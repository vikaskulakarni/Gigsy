import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabaseMock } from "./utils/database";
import { createRequest } from "./utils/request";

const database = createDatabaseMock();
let getHandler: (request: Request) => Promise<Response>;

async function get(options: Parameters<typeof createRequest>[0] = {}) {
  return getHandler(createRequest(options));
}

beforeEach(async () => {
  vi.doMock("@/lib/db", () => ({ default: database.pool }));
  vi.doMock("@/lib/auth", () => ({
    getCurrentUser: vi.fn(),
  }));
  ({ GET: getHandler } = await import("../src/app/api/gigs/route"));

  database.pool.execute.mockReset();
  database.pool.execute.mockResolvedValue([[], []]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/gigs", () => {
  it("returns normalized gigs with the expected response structure", async () => {
    database.pool.execute.mockResolvedValueOnce([
      [
        {
          id: "12",
          title: "Build a dashboard",
          description: "Create a reporting dashboard for a growing business.",
          budgetMin: "1000.50",
          budgetMax: 2500,
          deadline: "2026-12-01",
          status: "Open",
          postedDate: "2026-11-01",
          clientName: "Example Client",
          skills: "React,TypeScript",
        },
      ],
      [],
    ]);

    const response = await get();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      count: 1,
      gigs: [
        {
          id: 12,
          title: "Build a dashboard",
          description: "Create a reporting dashboard for a growing business.",
          budgetMin: 1000.5,
          budgetMax: 2500,
          deadline: "2026-12-01",
          status: "Open",
          postedDate: "2026-11-01",
          clientName: "Example Client",
          skills: "React,TypeScript",
          tags: ["React", "TypeScript"],
        },
      ],
    });
  });

  it("uses Open as the default status and does not add a search filter", async () => {
    await get();

    const [query, parameters] = database.pool.execute.mock.calls[0];
    expect(query).toContain("WHERE g.status = ?");
    expect(query).toContain("ORDER BY g.posted_date DESC, g.gig_id DESC");
    expect(query).not.toContain("g.title LIKE ?");
    expect(parameters).toEqual(["Open"]);
  });

  it("passes a custom status to the query", async () => {
    await get({ query: { status: "Closed" } });

    expect(database.pool.execute.mock.calls[0][1]).toEqual(["Closed"]);
  });

  it("adds the search term to title, description, and skill filters", async () => {
    await get({ query: { q: "  React " } });

    const [query, parameters] = database.pool.execute.mock.calls[0];
    expect(query).toContain("g.title LIKE ?");
    expect(query).toContain("g.description LIKE ?");
    expect(query).toContain("s.skill_name LIKE ?");
    expect(parameters).toEqual(["Open", "%React%", "%React%", "%React%"]);
  });

  it("combines custom status and search parameters in query order", async () => {
    await get({ query: { status: "Paused", q: "design" } });

    expect(database.pool.execute.mock.calls[0][1]).toEqual([
      "Paused",
      "%design%",
      "%design%",
      "%design%",
    ]);
  });

  it("returns an empty collection when no gigs match", async () => {
    database.pool.execute.mockResolvedValueOnce([[], []]);

    const response = await get({ query: { q: "missing" } });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      count: 0,
      gigs: [],
    });
  });

  it("maps missing skills to an empty tags array", async () => {
    database.pool.execute.mockResolvedValueOnce([
      [
        {
          id: 4,
          budgetMin: 0,
          budgetMax: null,
          skills: null,
        },
      ],
      [],
    ]);

    const response = await get();
    const body = await response.json();

    expect(body.gigs).toEqual([
      expect.objectContaining({
        id: 4,
        budgetMin: 0,
        budgetMax: 0,
        tags: [],
      }),
    ]);
  });

  it("returns a 500 response when the database query fails", async () => {
    database.pool.execute.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await get();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Unable to fetch gigs; verify MySQL schema and connection.",
    });
  });

  it("does not require a session for public retrieval", async () => {
    await get();

    expect(database.pool.execute).toHaveBeenCalledOnce();
  });
});
