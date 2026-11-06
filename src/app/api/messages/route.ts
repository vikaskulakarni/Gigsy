import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { messageSchema } from "@/lib/message-schema";

export const dynamic = "force-dynamic";

const noCache = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function GET(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Sign in required" },
      { status: 401, headers: noCache }
    );
  }

  try {
    const s = await messageSchema();
    const peer = Number(new URL(req.url).searchParams.get("with"));

    if (!Number.isSafeInteger(peer) || peer < 1 || peer === user.user_id) {
      return NextResponse.json(
        { success: false, message: "Choose a valid conversation." },
        { status: 400, headers: noCache }
      );
    }

    const [rows] = await pool.execute(
      `SELECT
        m.\`${s.id}\` AS id,
        m.sender_id AS senderId,
        m.receiver_id AS receiverId,
        m.\`${s.body}\` AS body
        ${s.date ? `, m.\`${s.date}\` AS sentAt` : ""}
       FROM message m
       WHERE (m.sender_id=? AND m.receiver_id=?)
          OR (m.sender_id=? AND m.receiver_id=?)
       ORDER BY m.\`${s.id}\` ASC
       LIMIT 200`,
      [user.user_id, peer, peer, user.user_id]
    );

    return NextResponse.json(
      { success: true, messages: rows },
      { headers: noCache }
    );
  } catch (e) {
    console.error("GET messages error:", e);
    return NextResponse.json(
      { success: false, message: "Could not load conversation." },
      { status: 500, headers: noCache }
    );
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Sign in required" },
      { status: 401, headers: noCache }
    );
  }

  try {
    const b = await req.json();
    const peer = Number(b.receiverId);
    const body = String(b.body ?? "").trim();

    if (
      !Number.isSafeInteger(peer) ||
      peer < 1 ||
      peer === user.user_id ||
      !body ||
      body.length > 5000
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid recipient or message (maximum 5000 characters)." },
        { status: 400, headers: noCache }
      );
    }

    const [target] = await pool.execute(
      "SELECT user_id FROM users WHERE user_id=? LIMIT 1",
      [peer]
    );

    if (!(target as any[]).length) {
      return NextResponse.json(
        { success: false, message: "Recipient not found." },
        { status: 404, headers: noCache }
      );
    }

    const s = await messageSchema();

    const [insertResult]: any = await pool.execute(
      `INSERT INTO message(sender_id, receiver_id, \`${s.body}\`)
       VALUES (?, ?, ?)`,
      [user.user_id, peer, body]
    );

    const [savedRows]: any = await pool.execute(
      `SELECT
        m.\`${s.id}\` AS id,
        m.sender_id AS senderId,
        m.receiver_id AS receiverId,
        m.\`${s.body}\` AS body
        ${s.date ? `, m.\`${s.date}\` AS sentAt` : ""}
       FROM message m
       WHERE m.\`${s.id}\`=?
       LIMIT 1`,
      [insertResult.insertId]
    );

    if (!savedRows.length) {
      throw new Error("Message was inserted but could not be retrieved.");
    }

    return NextResponse.json(
      { success: true, message: savedRows[0] },
      { status: 201, headers: noCache }
    );
  } catch (e) {
    console.error("POST message error:", e);
    return NextResponse.json(
      { success: false, message: "Message could not be saved. Please try again." },
      { status: 500, headers: noCache }
    );
  }
}
