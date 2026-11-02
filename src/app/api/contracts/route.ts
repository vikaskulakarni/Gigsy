import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Please sign in." }, { status: 401 });
  try {
    const [rows] = await pool.execute(
      `SELECT gc.contract_id AS id,gc.status,gc.agreed_amount AS agreedAmount,
              gc.delivery_days AS deliveryDays,gc.created_at AS createdAt,
              g.gig_id AS gigId,g.title,
              CASE WHEN ?='Client' THEN freelancer_user.name ELSE client_user.name END AS otherPartyName,
              (SELECT COUNT(*) FROM gigsy_milestones m WHERE m.contract_id=gc.contract_id) AS milestoneCount,
              (SELECT COUNT(*) FROM gigsy_milestones m WHERE m.contract_id=gc.contract_id AND m.status='Completed') AS completedMilestones
       FROM gigsy_contracts gc
       JOIN gig g ON g.gig_id=gc.gig_id
       JOIN client c ON c.client_id=gc.client_id
       JOIN users client_user ON client_user.user_id=c.user_id
       JOIN freelancer f ON f.freelancer_id=gc.freelancer_id
       JOIN users freelancer_user ON freelancer_user.user_id=f.user_id
       WHERE (?='Client' AND c.user_id=?) OR (?='Freelancer' AND f.user_id=?)
       ORDER BY gc.created_at DESC`,
      [user.user_type,user.user_type,user.user_id,user.user_type,user.user_id]
    );
    return NextResponse.json({ success: true, role: user.user_type, contracts: rows });
  } catch (error) {
    console.error("Contracts GET", error);
    return NextResponse.json({ success: false, message: "Could not load contracts. Apply the hiring workflow migration first." }, { status: 500 });
  }
}
