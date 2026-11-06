
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Please sign in." },
      { status: 401 }
    );
  }

  if (user.user_type !== "Client") {
    return NextResponse.json(
      { success: false, message: "Only clients can review freelancers." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const contractId = Number(id);

  if (!Number.isSafeInteger(contractId) || contractId < 1) {
    return NextResponse.json(
      { success: false, message: "Invalid contract." },
      { status: 400 }
    );
  }

  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request." },
      { status: 400 }
    );
  }

  const rating = Number(body.rating);
  const comment = String(body.comment || "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { success: false, message: "Select a rating between 1 and 5." },
      { status: 400 }
    );
  }

  if (comment.length > 2000) {
    return NextResponse.json(
      { success: false, message: "Review must be under 2000 characters." },
      { status: 400 }
    );
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT gc.contract_id, gc.client_id, gc.freelancer_id,
              gc.status, c.user_id AS client_user_id
       FROM gigsy_contracts gc
       JOIN client c ON c.client_id = gc.client_id
       WHERE gc.contract_id = ?
       FOR UPDATE`,
      [contractId]
    );

    const contract = (rows as any[])[0];

    if (!contract) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: "Contract not found." },
        { status: 404 }
      );
    }

    if (Number(contract.client_user_id) !== Number(user.user_id)) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: "Only the contract's client can submit a review." },
        { status: 403 }
      );
    }

    if (contract.status !== "Completed") {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: "You can review a freelancer only after project completion." },
        { status: 409 }
      );
    }

    await connection.execute(
      `INSERT INTO review
       (contract_id, client_id, freelancer_id, rating, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [
        contractId,
        contract.client_id,
        contract.freelancer_id,
        rating,
        comment || null
      ]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "Your review has been submitted successfully."
    });
  } catch (error: any) {
    await connection.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { success: false, message: "You have already reviewed this project." },
        { status: 409 }
      );
    }

    console.error("Review submission error:", error);

    return NextResponse.json(
      { success: false, message: "Could not submit your review." },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
