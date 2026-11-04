import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientUser, freelancerUser } from "./utils/auth";
import { createDatabaseMock } from "./utils/database";
import { createJsonRequest, createRequest } from "./utils/request";

const database = createDatabaseMock();
const auth = { getCurrentUser: vi.fn() };
const messageSchema = vi.fn();
let messagesGet: (request: Request) => Promise<Response>;
let messagesPost: (request: Request) => Promise<Response>;
let contactsGet: () => Promise<Response>;
let peopleGet: () => Promise<Response>;

async function getMessages(withUser?: string | number) {
  return messagesGet(
    createRequest({
      query: withUser === undefined ? {} : { with: withUser },
    }),
  );
}

async function sendMessage(body: unknown) {
  return messagesPost(createJsonRequest("POST", body));
}

beforeEach(async () => {
  vi.doMock("@/lib/db", () => ({ default: database.pool }));
  vi.doMock("@/lib/auth", () => ({ getCurrentUser: auth.getCurrentUser }));
  vi.doMock("@/lib/message-schema", () => ({ messageSchema }));

  const messages = await import("../src/app/api/messages/route");
  const contacts = await import("../src/app/api/messages/contacts/route");
  const people = await import("../src/app/api/messages/people/route");
  messagesGet = messages.GET;
  messagesPost = messages.POST;
  contactsGet = contacts.GET;
  peopleGet = people.GET;

  auth.getCurrentUser.mockReset().mockResolvedValue(clientUser);
  messageSchema.mockReset().mockResolvedValue({
    body: "body",
    date: "created_at",
    id: "id",
  });
  database.pool.execute.mockReset().mockResolvedValue([[], []]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/messages", () => {
  it("requires authentication without querying the database", async () => {
    auth.getCurrentUser.mockResolvedValueOnce(null);

    const response = await getMessages(2);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Sign in required",
    });
    expect(database.pool.execute).not.toHaveBeenCalled();
  });

  it.each([
    ["missing conversation", undefined],
    ["zero conversation ID", 0],
    ["negative conversation ID", -2],
    ["fractional conversation ID", 1.5],
    ["non-numeric conversation ID", "abc"],
  ])("rejects %s", async (_case, peer) => {
    const response = await getMessages(peer);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Choose a conversation.",
    });
    expect(database.pool.execute).not.toHaveBeenCalled();
  });

  it("returns messages in the database ordering with normalized fields", async () => {
    database.pool.execute
      .mockResolvedValueOnce([
        [
          {
            id: 8,
            senderId: 1,
            receiverId: 2,
            body: "Hello",
            sentAt: "2026-11-04T10:00:00.000Z",
          },
          {
            id: 9,
            senderId: 2,
            receiverId: 1,
            body: "Hi",
            sentAt: "2026-11-04T10:01:00.000Z",
          },
        ],
        [],
      ]);

    const response = await getMessages(2);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      messages: [
        {
          id: 8,
          senderId: 1,
          receiverId: 2,
          body: "Hello",
          sentAt: "2026-11-04T10:00:00.000Z",
        },
        {
          id: 9,
          senderId: 2,
          receiverId: 1,
          body: "Hi",
          sentAt: "2026-11-04T10:01:00.000Z",
        },
      ],
    });
    expect(database.pool.execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("ORDER BY m.`id` ASC LIMIT 200"),
      [1, 2, 2, 1],
    );
  });

  it("returns an empty message list for a conversation without messages", async () => {
    database.pool.execute
      .mockResolvedValueOnce([[], []]);

    const response = await getMessages(2);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      messages: [],
    });
  });

  it("returns a database error when the message schema or query is unavailable", async () => {
    messageSchema.mockRejectedValueOnce(new Error("schema unavailable"));

    const response = await getMessages(2);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Message schema or database unavailable.",
    });
  });
});

describe("POST /api/messages", () => {
  it("requires authentication without querying the database", async () => {
    auth.getCurrentUser.mockResolvedValueOnce(null);

    const response = await sendMessage({ receiverId: 2, body: "Hello" });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Sign in required",
    });
    expect(database.pool.execute).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid json",
    });

    const response = await messagesPost(request);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Message could not be saved. Check message table constraints.",
    });
    expect(database.pool.execute).not.toHaveBeenCalled();
  });

  it.each([
    ["missing recipient", { body: "Hello" }],
    ["invalid recipient", { receiverId: "abc", body: "Hello" }],
    ["self recipient", { receiverId: clientUser.user_id, body: "Hello" }],
    ["missing body", { receiverId: 2 }],
    ["empty body", { receiverId: 2, body: "   " }],
    ["overlong body", { receiverId: 2, body: "x".repeat(5001) }],
  ])("rejects %s", async (_case, body) => {
    const response = await sendMessage(body);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Invalid recipient or message (max 5000 characters). ",
    });
    expect(database.pool.execute).not.toHaveBeenCalled();
  });

  it("returns not found when the recipient does not exist", async () => {
    database.pool.execute.mockResolvedValueOnce([[], []]);

    const response = await sendMessage({ receiverId: 2, body: "Hello" });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Recipient not found.",
    });
    expect(database.pool.execute).toHaveBeenCalledWith(
      "SELECT user_id FROM users WHERE user_id=? LIMIT 1",
      [2],
    );
  });

  it("inserts a trimmed message for the authenticated sender", async () => {
    database.pool.execute
      .mockResolvedValueOnce([[{ user_id: freelancerUser.user_id }], []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const response = await sendMessage({
      receiverId: freelancerUser.user_id,
      body: "  Project details  ",
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(database.pool.execute).toHaveBeenNthCalledWith(
      1,
      "SELECT user_id FROM users WHERE user_id=? LIMIT 1",
      [freelancerUser.user_id],
    );
    expect(database.pool.execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(
        "INSERT INTO message(sender_id,receiver_id,`body`) VALUES(?,?,?)",
      ),
      [clientUser.user_id, freelancerUser.user_id, "Project details"],
    );
  });

  it("allows a message at the 5000-character limit", async () => {
    database.pool.execute
      .mockResolvedValueOnce([[{ user_id: 2 }], []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const response = await sendMessage({
      receiverId: 2,
      body: "x".repeat(5000),
    });

    expect(response.status).toBe(201);
  });

  it("returns a database error when insertion fails", async () => {
    database.pool.execute
      .mockResolvedValueOnce([[{ user_id: 2 }], []])
      .mockRejectedValueOnce(new Error("insert failed"));

    const response = await sendMessage({ receiverId: 2, body: "Hello" });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Message could not be saved. Check message table constraints.",
    });
  });
});

describe("GET /api/messages/contacts", () => {
  it("requires authentication", async () => {
    auth.getCurrentUser.mockResolvedValueOnce(null);

    const response = await contactsGet();

    expect(response.status).toBe(401);
    expect(database.pool.execute).not.toHaveBeenCalled();
  });

  it("returns distinct conversation contacts", async () => {
    const contacts = [
      { id: 2, name: "Test Freelancer", role: "Freelancer" },
    ];
    database.pool.execute.mockResolvedValueOnce([contacts, []]);

    const response = await contactsGet();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      contacts,
    });
    expect(database.pool.execute).toHaveBeenCalledWith(
      expect.stringContaining("SELECT DISTINCT"),
      [clientUser.user_id, clientUser.user_id, clientUser.user_id],
    );
  });

  it("returns an empty contact list when no conversations exist", async () => {
    const response = await contactsGet();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      contacts: [],
    });
  });

  it("returns an error when contacts cannot be loaded", async () => {
    database.pool.execute.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await contactsGet();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Could not load contacts.",
    });
  });
});

describe("GET /api/messages/people", () => {
  it("returns other-role people for the authenticated user", async () => {
    const people = [
      { id: 2, name: "Test Freelancer", role: "Freelancer" },
    ];
    database.pool.execute.mockResolvedValueOnce([people, []]);

    const response = await peopleGet();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      people,
    });
    expect(database.pool.execute).toHaveBeenCalledWith(
      expect.stringContaining("user_type<>?"),
      [clientUser.user_id, clientUser.user_type],
    );
  });

  it("requires authentication without querying people", async () => {
    auth.getCurrentUser.mockResolvedValueOnce(null);

    const response = await peopleGet();

    expect(response.status).toBe(401);
    expect(database.pool.execute).not.toHaveBeenCalled();
  });

  it("returns an empty people list when no eligible users exist", async () => {
    const response = await peopleGet();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      people: [],
    });
  });

  it("returns an error when people cannot be loaded", async () => {
    database.pool.execute.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await peopleGet();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Could not load contacts",
    });
  });
});
