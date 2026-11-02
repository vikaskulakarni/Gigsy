import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success:false, message:"Please sign in." }, { status:401 });
  try {
    if (user.user_type === "Client") {
      const [clientRows] = await pool.execute("SELECT client_id FROM client WHERE user_id=? LIMIT 1", [user.user_id]);
      const client = (clientRows as any[])[0];
      if (!client) return NextResponse.json({success:false,message:"Client profile not found."},{status:404});
      const [statsRows] = await pool.execute(`
        SELECT
          (SELECT COUNT(*) FROM gig WHERE client_id=?) AS totalGigs,
          (SELECT COUNT(*) FROM gig WHERE client_id=? AND status='Open') AS openGigs,
          (SELECT COUNT(*) FROM proposal p JOIN gig g ON g.gig_id=p.gig_id WHERE g.client_id=?) AS proposals,
          (SELECT COUNT(*) FROM gigsy_contracts WHERE client_id=?) AS contracts
      `,[client.client_id,client.client_id,client.client_id,client.client_id]);
      const [recentRows] = await pool.execute(`
        SELECT g.gig_id AS id,g.title,g.status,g.budget_min AS budgetMin,g.budget_max AS budgetMax,g.posted_date AS postedDate,
        (SELECT COUNT(*) FROM proposal p WHERE p.gig_id=g.gig_id) AS proposalCount
        FROM gig g WHERE g.client_id=? ORDER BY g.created_at DESC LIMIT 5
      `,[client.client_id]);
      return NextResponse.json({success:true,user:{name:user.name,role:user.user_type},stats:(statsRows as any[])[0],recent:recentRows});
    }
    const [frRows] = await pool.execute("SELECT freelancer_id,average_rating,total_reviews FROM freelancer WHERE user_id=? LIMIT 1",[user.user_id]);
    const freelancer=(frRows as any[])[0];
    if(!freelancer)return NextResponse.json({success:false,message:"Freelancer profile not found."},{status:404});
    const [statsRows]=await pool.execute(`
      SELECT
       (SELECT COUNT(*) FROM proposal WHERE freelancer_id=?) AS proposals,
       (SELECT COUNT(*) FROM proposal WHERE freelancer_id=? AND status='Accepted') AS accepted,
       (SELECT COUNT(*) FROM gigsy_contracts WHERE freelancer_id=?) AS contracts,
       (SELECT COUNT(*) FROM proposal WHERE freelancer_id=? AND status='Pending') AS pending
    `,[freelancer.freelancer_id,freelancer.freelancer_id,freelancer.freelancer_id,freelancer.freelancer_id]);
    const [recentRows]=await pool.execute(`
      SELECT p.proposal_id AS id,p.status,p.bid_amount AS bidAmount,p.proposed_date AS proposedDate,g.gig_id AS gigId,g.title,g.status AS gigStatus,gc.contract_id AS contractId
      FROM proposal p JOIN gig g ON g.gig_id=p.gig_id LEFT JOIN gigsy_contracts gc ON gc.proposal_id=p.proposal_id WHERE p.freelancer_id=? ORDER BY p.proposed_date DESC,p.proposal_id DESC LIMIT 5
    `,[freelancer.freelancer_id]);
    return NextResponse.json({success:true,user:{name:user.name,role:user.user_type},stats:{...(statsRows as any[])[0],rating:Number(freelancer.average_rating||0),reviews:Number(freelancer.total_reviews||0)},recent:recentRows});
  } catch(e) { console.error("Dashboard API",e); return NextResponse.json({success:false,message:"Could not load dashboard data."},{status:500}); }
}
