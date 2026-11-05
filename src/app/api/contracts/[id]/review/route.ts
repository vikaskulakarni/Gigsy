import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Please sign in." },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const [rows] = await pool.execute(
      `SELECT gc.contract_id, gc.status, gc.freelancer_id,
              gc.client_id, c.user_id AS client_user_id
       FROM gigsy_contracts gc
       JOIN client c ON c.client_id = gc.client_id
       WHERE gc.contract_id = ?
         AND (c.user_id = ? OR EXISTS (
           SELECT 1 FROM freelancer f
           WHERE f.freelancer_id = gc.freelancer_id
             AND f.user_id = ?
         ))
       LIMIT 1`,
      [id, user.user_id, user.user_id]
    );

    const contract = (rows as any[])[0];

    if (!contract) {
      return NextResponse.json(
        { success: false, message: "Contract not found or access denied." },
        { status: 404 }
      );
    }

    const [reviews] = await pool.execute(
      `SELECT review_id AS id, rating, review_text AS reviewText,
              review_date AS reviewDate
       FROM review
       WHERE gigsy_contract_id = ?
       LIMIT 1`,
      [id]
    );

    return NextResponse.json({
      success: true,
      canReview:
        user.user_type === "Client" &&
        Number(contract.client_user_id) === Number(user.user_id) &&
        contract.status === "Completed" &&
        (reviews as any[]).length === 0,
      review: (reviews as any[])[0] || null
    });
  } catch (error) {
    console.error("Gigsy contract review GET:", error);
    return NextResponse.json(
      { success: false, message: "Could not load review information." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, { params }: Params) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Please sign in." },
      { status: 401 }
    );
  }

  if (user.user_type !== "Client") {
    return NextResponse.json(
      { success: false, message: "Only clients can submit reviews." },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const rating = Number(body.rating);
    const reviewText = String(body.reviewText || "").trim();

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5 ||
      reviewText.length > 2000
    ) {
      return NextResponse.json(
        { success: false, message: "Choose a rating from 1 to 5. Review text must be under 2000 characters." },
        { status: 400 }
      );
    }

    const [rows] = await pool.execute(
      `SELECT gc.contract_id, gc.freelancer_id, gc.client_id
       FROM gigsy_contracts gc
       JOIN client c ON c.client_id = gc.client_id
       WHERE gc.contract_id = ?
         AND c.user_id = ?
         AND gc.status = 'Completed'
       LIMIT 1`,
      [id, user.user_id]
    );

    const contract = (rows as any[])[0];

    if (!contract) {
      return NextResponse.json(
        { success: false, message: "Only the client of a completed contract can review it." },
        { status: 403 }
      );
    }

    await pool.execute(
      `INSERT INTO review
       (contract_id, gigsy_contract_id, client_id, freelancer_id, rating, review_text)
       VALUES (NULL, ?, ?, ?, ?, ?)`,
      [
        contract.contract_id,
        contract.client_id,
        contract.freelancer_id,
        rating,
        reviewText || null
      ]
    );

    return NextResponse.json(
      { success: true, message: "Review submitted successfully. Freelancer rating updated." },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Gigsy contract review POST:", error);

    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { success: false, message: "This contract has already been reviewed." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not save your review." },
      { status: 500 }
    );
  }
}
