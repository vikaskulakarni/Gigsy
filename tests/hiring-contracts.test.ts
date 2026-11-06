import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientUser, freelancerUser } from "./utils/auth";
import { createDatabaseMock } from "./utils/database";
import { createJsonRequest } from "./utils/request";

const database = createDatabaseMock();
const auth = { getCurrentUser: vi.fn() };
let proposalPatch: (
  request: Request,
  context: Record<string, never>,
) => Promise<Response>;
let contractPatch: (
  request: Request,
  context: { params: Promise<{ id: string }> },
) => Promise<Response>;

const hiringRequest = {
  proposalId: 14,
  gigId: 27,
  status: "Accepted",
};

const proposalRow = {
  proposal_id: 14,
  status: "Pending",
  bid_amount: 2400,
  estimated_days: 10,
  freelancer_id: 8,
  freelancer_user_id: 2,
  title: "Build a dashboard",
};

async function patchProposal(body: unknown): Promise<Response> {
  return proposalPatch(createJsonRequest("PATCH", body), {} as never);
}

async function patchContract(
  body: unknown,
  contractId = "55",
): Promise<Response> {
  return contractPatch(createJsonRequest("PATCH", body), {
    params: Promise.resolve({ id: contractId }),
  });
}

function configureSuccessfulHiring() {
  database.connection.execute
    .mockResolvedValueOnce([[{ gig_id: 27, client_id: 3 }], []])
    .mockResolvedValueOnce([[proposalRow], []])
    .mockResolvedValueOnce([[], []])
    .mockResolvedValueOnce([[], []])
    .mockResolvedValueOnce([[], []])
    .mockResolvedValueOnce([[], []])
    .mockResolvedValueOnce([{ insertId: 55 }, []])
    .mockResolvedValueOnce([[], []])
    .mockResolvedValueOnce([[], []])
    .mockResolvedValueOnce([[], []])
    .mockResolvedValueOnce([[], []])
    .mockResolvedValueOnce([[], []])
    .mockResolvedValueOnce([[], []]);
}

beforeEach(async () => {
  vi.doMock("@/lib/db", () => ({ default: database.pool }));
  vi.doMock("@/lib/auth", () => ({ getCurrentUser: auth.getCurrentUser }));
  ({ PATCH: proposalPatch } = await import("../src/app/api/proposals/route"));
  ({ PATCH: contractPatch } = await import("../src/app/api/contracts/[id]/route"));

  auth.getCurrentUser.mockReset().mockResolvedValue(clientUser);
  database.pool.getConnection.mockReset().mockResolvedValue(database.connection);
  database.pool.execute.mockReset().mockResolvedValue([[], []]);
  database.connection.execute.mockReset().mockResolvedValue([[], []]);
  database.connection.beginTransaction.mockReset().mockResolvedValue();
  database.connection.commit.mockReset().mockResolvedValue();
  database.connection.rollback.mockReset().mockResolvedValue();
  database.connection.release.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PATCH /api/proposals hiring workflow", () => {
  it("requires authentication", async () => {
    auth.getCurrentUser.mockResolvedValueOnce(null);

    const response = await patchProposal(hiringRequest);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Please sign in.",
    });
    expect(database.pool.getConnection).not.toHaveBeenCalled();
  });

  it("allows only Client accounts to review proposals", async () => {
    auth.getCurrentUser.mockResolvedValueOnce(freelancerUser);

    const response = await patchProposal(hiringRequest);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Only the Client who owns this gig can review proposals.",
    });
  });

  it.each([
    ["invalid proposal ID", { ...hiringRequest, proposalId: 0 }],
    ["invalid gig ID", { ...hiringRequest, gigId: 0 }],
    ["unsupported decision", { ...hiringRequest, status: "Pending" }],
  ])("rejects %s", async (_case, body) => {
    const response = await patchProposal(body);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Invalid proposal action.",
    });
    expect(database.pool.getConnection).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON", async () => {
    const request = new Request("http://localhost", {
      method: "PATCH",
      body: "{invalid json",
      headers: { "content-type": "application/json" },
    });

    const response = await proposalPatch(request, {} as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Invalid request body.",
    });
  });

  it("rejects a proposal when the client does not own the gig", async () => {
    database.connection.execute.mockResolvedValueOnce([[], []]);

    const response = await patchProposal({ ...hiringRequest, status: "Rejected" });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "You do not own this gig.",
    });
    expect(database.connection.rollback).toHaveBeenCalledOnce();
    expect(database.connection.release).toHaveBeenCalledOnce();
  });

  it("returns 404 when the proposal is not attached to the gig", async () => {
    database.connection.execute
      .mockResolvedValueOnce([[{ gig_id: 27, client_id: 3 }], []])
      .mockResolvedValueOnce([[], []]);

    const response = await patchProposal(hiringRequest);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Proposal not found for this gig.",
    });
    expect(database.connection.rollback).toHaveBeenCalledOnce();
  });

  it("rejects already-reviewed proposals", async () => {
    database.connection.execute
      .mockResolvedValueOnce([[{ gig_id: 27, client_id: 3 }], []])
      .mockResolvedValueOnce([[{ ...proposalRow, status: "Rejected" }], []]);

    const response = await patchProposal({ ...hiringRequest, status: "Rejected" });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "This proposal has already been reviewed.",
    });
    expect(database.connection.rollback).toHaveBeenCalledOnce();
  });

  it("accepts a proposal and creates an active contract with milestones", async () => {
    configureSuccessfulHiring();

    const response = await patchProposal(hiringRequest);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      contractId: 55,
      message:
        "Congratulations! The proposal was accepted, the contract was created, and the gig is now in progress and closed to new proposals.",
    });
    expect(database.connection.execute).toHaveBeenNthCalledWith(
      7,
      expect.stringContaining("INSERT INTO gigsy_contracts"),
      [14, 27, 8, 3, 2400, 10],
    );
    expect(database.connection.execute).toHaveBeenNthCalledWith(
      8,
      expect.stringContaining("INSERT INTO gigsy_milestones"),
      [55, "Project kickoff", expect.any(String), 1, 480, "In Progress", 1],
    );
    expect(database.connection.execute).toHaveBeenNthCalledWith(
      10,
      expect.stringContaining("INSERT INTO gigsy_milestones"),
      [55, "Final delivery", expect.any(String), 10, 1200, "Pending", 3],
    );
    expect(database.connection.execute).toHaveBeenNthCalledWith(
      11,
      "UPDATE gig SET status='In Progress' WHERE gig_id=?",
      [27],
    );
    expect(database.connection.commit).toHaveBeenCalledOnce();
    expect(database.connection.rollback).not.toHaveBeenCalled();
    expect(database.connection.release).toHaveBeenCalledOnce();
  });

  it("updates proposal states and rejects other pending proposals", async () => {
    configureSuccessfulHiring();

    await patchProposal(hiringRequest);

    expect(database.connection.execute).toHaveBeenNthCalledWith(
      5,
      "UPDATE proposal SET status='Accepted' WHERE proposal_id=? AND status='Pending'",
      [14],
    );
    expect(database.connection.execute).toHaveBeenNthCalledWith(
      6,
      "UPDATE proposal SET status='Rejected' WHERE gig_id=? AND proposal_id<>? AND status='Pending'",
      [27, 14],
    );
  });

  it("rejects a competing contract for the same gig", async () => {
    database.connection.execute
      .mockResolvedValueOnce([[{ gig_id: 27, client_id: 3 }], []])
      .mockResolvedValueOnce([[proposalRow], []])
      .mockResolvedValueOnce([[{ contract_id: 44, proposal_id: 99 }], []]);

    const response = await patchProposal(hiringRequest);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Another proposal already has a contract for this gig.",
    });
    expect(database.connection.rollback).toHaveBeenCalledOnce();
    expect(database.connection.commit).not.toHaveBeenCalled();
  });

  it("reuses an existing contract for the same proposal", async () => {
    database.connection.execute
      .mockResolvedValueOnce([[{ gig_id: 27, client_id: 3 }], []])
      .mockResolvedValueOnce([[proposalRow], []])
      .mockResolvedValueOnce([[{ contract_id: 55, proposal_id: 14 }], []]);

    const response = await patchProposal(hiringRequest);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      contractId: 55,
      message: "This proposal already has a contract. Opening the existing contract.",
    });
    expect(database.connection.commit).toHaveBeenCalledOnce();
    expect(database.connection.release).toHaveBeenCalledOnce();
  });

  it("maps duplicate contract insertion to a conflict", async () => {
    database.connection.execute
      .mockResolvedValueOnce([[{ gig_id: 27, client_id: 3 }], []])
      .mockResolvedValueOnce([[proposalRow], []])
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([[], []])
      .mockRejectedValueOnce(
        Object.assign(new Error("duplicate"), { code: "ER_DUP_ENTRY" }),
      );

    const response = await patchProposal(hiringRequest);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "A contract already exists for this gig. Refresh your workspace.",
    });
    expect(database.connection.rollback).toHaveBeenCalledOnce();
  });

  it("rolls back and returns 500 when hiring fails", async () => {
    database.connection.execute
      .mockResolvedValueOnce([[{ gig_id: 27, client_id: 3 }], []])
      .mockResolvedValueOnce([[proposalRow], []])
      .mockRejectedValueOnce(new Error("contract lookup failed"));

    const response = await patchProposal(hiringRequest);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      message: "Could not complete hiring. No changes were saved; check that the Gigsy hiring workflow migration has been applied.",
    });
    expect(database.connection.rollback).toHaveBeenCalledOnce();
    expect(database.connection.commit).not.toHaveBeenCalled();
    expect(database.connection.release).toHaveBeenCalledOnce();
  });
});

describe("PATCH /api/contracts/[id] milestone workflow", () => {
  function configureMilestoneUpdate(
    milestoneStatus = "Submitted",
    remaining = 1,
  ) {
    database.connection.execute
      .mockResolvedValueOnce([[
        { contract_id: 55, gig_id: 27, clientUserId: 1, freelancerUserId: 2 },
      ], []])
      .mockResolvedValueOnce([[
        { milestone_id: 7, status: milestoneStatus },
      ], []])
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([[{ remaining }], []])
      .mockResolvedValueOnce([[], []]);
  }

  it("allows the client to complete a submitted milestone", async () => {
    configureMilestoneUpdate("Submitted", 1);

    const response = await patchContract({ milestoneId: 7, status: "Completed" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "Milestone approved.",
    });
    expect(database.connection.execute).toHaveBeenCalledWith(
      "UPDATE gigsy_milestones SET status=? WHERE milestone_id=?",
      ["Completed", 7],
    );
    expect(database.connection.commit).toHaveBeenCalledOnce();
    expect(database.connection.release).toHaveBeenCalledOnce();
  });

  it("rejects a client approval before freelancer submission", async () => {
    configureMilestoneUpdate("Pending", 1);

    const response = await patchContract({ milestoneId: 7, status: "Completed" });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "The Freelancer must submit this milestone before you approve it.",
    });
    expect(database.connection.rollback).toHaveBeenCalledOnce();
  });

  it("allows a freelancer to submit a milestone", async () => {
    auth.getCurrentUser.mockResolvedValueOnce(freelancerUser);
    configureMilestoneUpdate("In Progress", 2);

    const response = await patchContract({ milestoneId: 7, status: "Submitted" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "Milestone updated.",
    });
    expect(database.connection.commit).toHaveBeenCalledOnce();
  });

  it("rejects unsupported milestone actions for the client", async () => {
    const response = await patchContract({ milestoneId: 7, status: "Submitted" });

    expect(response.status).toBe(403);
    expect(database.pool.getConnection).not.toHaveBeenCalled();
  });

  it("rolls back when a milestone operation fails", async () => {
    database.connection.execute.mockRejectedValueOnce(new Error("contract lookup failed"));

    const response = await patchContract({ milestoneId: 7, status: "Completed" });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Could not update milestone.",
    });
    expect(database.connection.rollback).toHaveBeenCalledOnce();
    expect(database.connection.release).toHaveBeenCalledOnce();
  });
});
