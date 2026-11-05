import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientUser, freelancerUser } from "./utils/auth";
import { createDatabaseMock } from "./utils/database";
import { createJsonRequest } from "./utils/request";

const database = createDatabaseMock();
const auth = { getCurrentUser: vi.fn() };
let postHandler: (request: Request) => Promise<Response>;

const validProposal = {
  gigId: 42,
  bidAmount: 1500,
  coverLetter: "I can deliver this project with the requested quality and timeline.",
  estimatedDays: 14,
};

async function post(body: unknown): Promise<Response> {
  return postHandler(createJsonRequest("POST", body));
}

function configureAvailableGig(freelancerId = 8) {
  database.pool.execute.mockResolvedValueOnce([[{ freelancer_id: freelancerId }], []]);
  database.connection.execute.mockResolvedValueOnce([[{ gig_id: validProposal.gigId }], []]);
}

beforeEach(async () => {
  vi.doMock("@/lib/db", () => ({ default: database.pool }));
  vi.doMock("@/lib/auth", () => ({ getCurrentUser: auth.getCurrentUser }));
  ({ POST: postHandler } = await import("../src/app/api/proposals/route"));

  auth.getCurrentUser.mockReset().mockResolvedValue(freelancerUser);
  database.pool.execute.mockReset().mockResolvedValue([[], []]);
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

describe("POST /api/proposals", () => {
  it("rejects unauthenticated requests without querying the database", async () => {
    auth.getCurrentUser.mockResolvedValueOnce(null);

    const response = await post(validProposal);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Sign in before submitting a proposal.",
    });
    expect(database.pool.execute).not.toHaveBeenCalled();
  });

  it("allows only Freelancer accounts to submit proposals", async () => {
    auth.getCurrentUser.mockResolvedValueOnce(clientUser);

    const response = await post(validProposal);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Only Freelancer accounts can submit proposals.",
    });
    expect(database.pool.execute).not.toHaveBeenCalled();
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
      message: "Could not submit proposal.",
    });
    expect(database.pool.execute).not.toHaveBeenCalled();
  });

  it.each([
    ["missing gig ID", { ...validProposal, gigId: undefined }],
    ["non-integer gig ID", { ...validProposal, gigId: 1.5 }],
    ["non-positive gig ID", { ...validProposal, gigId: 0 }],
    ["missing bid", { ...validProposal, bidAmount: undefined }],
    ["non-positive bid", { ...validProposal, bidAmount: 0 }],
    ["non-finite bid", { ...validProposal, bidAmount: "not-a-number" }],
    ["empty cover letter", { ...validProposal, coverLetter: "   " }],
    ["delivery above 365 days", { ...validProposal, estimatedDays: 366 }],
    ["fractional delivery", { ...validProposal, estimatedDays: 1.5 }],
  ])("rejects %s with a 400 response", async (_case, body) => {
    const response = await post(body);

    expect(response.status).toBe(400);
    expect((await response.json()).success).toBe(false);
    expect(database.pool.execute).not.toHaveBeenCalled();
    expect(database.pool.getConnection).not.toHaveBeenCalled();
  });

  it("submits a valid proposal for the authenticated freelancer and gig", async () => {
    configureAvailableGig(18);

    const response = await post(validProposal);

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "Proposal submitted successfully.",
    });
    expect(database.pool.execute).toHaveBeenNthCalledWith(
      1,
      "SELECT freelancer_id FROM freelancer WHERE user_id=? LIMIT 1",
      [freelancerUser.user_id],
    );
    expect(database.connection.beginTransaction).toHaveBeenCalledOnce();
    expect(database.connection.execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("WHERE g.gig_id=? AND g.status='Open'"),
      [validProposal.gigId, freelancerUser.user_id],
    );
    expect(database.connection.execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO proposal"),
      [
        validProposal.gigId,
        18,
        validProposal.bidAmount,
        validProposal.coverLetter,
        validProposal.estimatedDays,
      ],
    );
    expect(database.connection.commit).toHaveBeenCalledOnce();
    expect(database.connection.rollback).not.toHaveBeenCalled();
    expect(database.connection.release).toHaveBeenCalledOnce();
  });

  it("defaults the delivery estimate to seven days", async () => {
    configureAvailableGig();

    const response = await post({
      gigId: validProposal.gigId,
      bidAmount: validProposal.bidAmount,
      coverLetter: validProposal.coverLetter,
    });

    expect(response.status).toBe(201);
    expect(database.connection.execute.mock.calls[1][1]).toEqual([
      validProposal.gigId,
      8,
      validProposal.bidAmount,
      validProposal.coverLetter,
      7,
    ]);
  });

  it("trims the cover letter before insertion", async () => {
    configureAvailableGig();

    await post({
      ...validProposal,
      coverLetter: `  ${validProposal.coverLetter}  `,
    });

    expect(database.connection.execute.mock.calls[1][1]).toEqual([
      validProposal.gigId,
      8,
      validProposal.bidAmount,
      validProposal.coverLetter,
      validProposal.estimatedDays,
    ]);
  });

  it("returns 404 when the freelancer profile does not exist", async () => {
    database.pool.execute.mockResolvedValueOnce([[], []]);

    const response = await post(validProposal);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Freelancer profile not found.",
    });
    expect(database.pool.getConnection).not.toHaveBeenCalled();
  });

  it("rolls back and returns 404 when the gig is unavailable", async () => {
    database.pool.execute.mockResolvedValueOnce([[{ freelancer_id: 8 }], []]);
    database.connection.execute.mockResolvedValueOnce([[], []]);

    const response = await post(validProposal);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "This gig is unavailable or belongs to your own account.",
    });
    expect(database.connection.rollback).toHaveBeenCalledOnce();
    expect(database.connection.commit).not.toHaveBeenCalled();
    expect(database.connection.release).toHaveBeenCalledOnce();
  });

  it("prevents submitting a proposal to the freelancer's own gig", async () => {
    database.pool.execute.mockResolvedValueOnce([[{ freelancer_id: 8 }], []]);
    database.connection.execute.mockResolvedValueOnce([[], []]);

    const response = await post(validProposal);

    expect(response.status).toBe(404);
    expect(database.connection.execute.mock.calls[0][0]).toContain(
      "NOT EXISTS (SELECT 1 FROM client",
    );
  });

  it("maps duplicate proposal errors to a 409 response", async () => {
    configureAvailableGig();
    database.connection.execute.mockRejectedValueOnce(
      Object.assign(new Error("duplicate proposal"), { code: "ER_DUP_ENTRY" }),
    );

    const response = await post(validProposal);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "You have already applied to this gig.",
    });
    expect(database.connection.rollback).toHaveBeenCalledOnce();
    expect(database.connection.commit).not.toHaveBeenCalled();
    expect(database.connection.release).toHaveBeenCalledOnce();
  });

  it("rolls back and returns 500 when proposal insertion fails", async () => {
    configureAvailableGig();
    database.connection.execute.mockRejectedValueOnce(new Error("insert failed"));

    const response = await post(validProposal);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Could not submit proposal.",
    });
    expect(database.connection.rollback).toHaveBeenCalledOnce();
    expect(database.connection.commit).not.toHaveBeenCalled();
    expect(database.connection.release).toHaveBeenCalledOnce();
  });

  it("returns 500 when the freelancer lookup fails", async () => {
    database.pool.execute.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await post(validProposal);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Could not submit proposal.",
    });
    expect(database.pool.getConnection).not.toHaveBeenCalled();
  });
});
