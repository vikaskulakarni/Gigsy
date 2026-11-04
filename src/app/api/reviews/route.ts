import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Sign in required." },
      { status: 401 }
    );
  }

  if (user.user_type !== "Client") {
    return NextResponse.json(
      { success: false, message: "Only clients can submit reviews." },
      { status: 403 }
    );
  }

  try {
    const [rows] = await pool.execute(
      `SELECT
         c.contract_id AS contractId,
         c.freelancer_id AS freelancerId,
         g.title AS gigTitle
       FROM client cl
       JOIN gig g ON g.client_id = cl.client_id
       JOIN proposal p ON p.gig_id = g.gig_id
       JOIN contract c ON c.proposal_id = p.proposal_id
       LEFT JOIN review r ON r.contract_id = c.contract_id
       WHERE cl.user_id = ?
         AND c.status = 'Completed'
         AND r.review_id IS NULL
       ORDER BY c.contract_id DESC`,
      [user.user_id]
    );

    return NextResponse.json({
      success: true,
      eligibleContracts: rows
    });
  } catch (error) {
    console.error("Review eligibility error:", error);
    return NextResponse.json(
      { success: false, message: "Could not load eligible reviews." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Sign in required." },
      { status: 401 }
    );
  }

  if (user.user_type !== "Client") {
    return NextResponse.json(
      { success: false, message: "Only clients can submit reviews." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const contractId = Number(body.contractId);
    const freelancerId = Number(body.freelancerId);
    const rating = Number(body.rating);
    const reviewText = String(body.reviewText || "").trim();

    if (
      !Number.isSafeInteger(contractId) || contractId < 1 ||
      !Number.isSafeInteger(freelancerId) || freelancerId < 1 ||
      !Number.isInteger(rating) || rating < 1 || rating > 5 ||
      reviewText.length > 2000
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid contract, freelancer or rating. Rating must be 1–5 stars." },
        { status: 400 }
      );
    }

    const [eligible] = await pool.execute(
      `SELECT cl.client_id, c.freelancer_id
       FROM contract c
       JOIN proposal p ON p.proposal_id = c.proposal_id
       JOIN gig g ON g.gig_id = p.gig_id
       JOIN client cl ON cl.client_id = g.client_id
       WHERE c.contract_id = ?
         AND c.freelancer_id = ?
         AND cl.user_id = ?
         AND c.status = 'Completed'
         AND NOT EXISTS (
           SELECT 1 FROM review r
           WHERE r.contract_id = c.contract_id
         )
       LIMIT 1`,
      [contractId, freelancerId, user.user_id]
    );

    const matches = eligible as Array<{
      client_id: number;
      freelancer_id: number;
    }>;

    if (!matches.length) {
      return NextResponse.json(
        { success: false, message: "This contract is not eligible for review. It may not be completed, may belong to another client, or may already have a review." },
        { status: 403 }
      );
    }

    await pool.execute(
      `INSERT INTO review
       (contract_id, client_id, freelancer_id, rating, review_text)
       VALUES (?, ?, ?, ?, ?)`,
      [
        contractId,
        matches[0].client_id,
        matches[0].freelancer_id,
        rating,
        reviewText || null
      ]
    );

    return NextResponse.json(
      { success: true, message: "Your review was submitted successfully." },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Review submission error:", error);

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
