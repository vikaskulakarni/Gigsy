import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
export const dynamic="force-dynamic";
export async function GET(){
 const user=await getCurrentUser(); if(!user)return NextResponse.json({success:false,message:"Please sign in."},{status:401});
 try{
  if(user.user_type==="Client"){
   const [crows]=await pool.execute("SELECT client_id FROM client WHERE user_id=? LIMIT 1",[user.user_id]); const c=(crows as any[])[0];
   if(!c)return NextResponse.json({success:false,message:"Client profile not found."},{status:404});
   const [rows]=await pool.execute(`SELECT g.gig_id AS id,g.title,g.description,g.status,g.budget_min AS budgetMin,g.budget_max AS budgetMax,g.deadline,g.posted_date AS postedDate,(SELECT COUNT(*) FROM proposal p WHERE p.gig_id=g.gig_id) AS proposalCount FROM gig g WHERE g.client_id=? ORDER BY g.created_at DESC`,[c.client_id]);
   return NextResponse.json({success:true,role:"Client",projects:rows});
  }
  const [frows]=await pool.execute("SELECT freelancer_id FROM freelancer WHERE user_id=? LIMIT 1",[user.user_id]);const f=(frows as any[])[0];
  if(!f)return NextResponse.json({success:false,message:"Freelancer profile not found."},{status:404});
  const [rows]=await pool.execute(`SELECT p.proposal_id AS id,p.status AS proposalStatus,p.bid_amount AS bidAmount,p.estimated_days AS estimatedDays,p.proposed_date AS proposedDate,g.gig_id AS gigId,g.title,g.description,g.status AS gigStatus,g.budget_min AS budgetMin,g.budget_max AS budgetMax,u.name AS clientName,gc.contract_id AS contractId,gc.status AS contractStatus FROM proposal p JOIN gig g ON g.gig_id=p.gig_id JOIN client c ON c.client_id=g.client_id JOIN users u ON u.user_id=c.user_id LEFT JOIN gigsy_contracts gc ON gc.proposal_id=p.proposal_id WHERE p.freelancer_id=? ORDER BY p.proposed_date DESC,p.proposal_id DESC`,[f.freelancer_id]);
  return NextResponse.json({success:true,role:"Freelancer",projects:rows});
 }catch(e){console.error("Projects API",e);return NextResponse.json({success:false,message:"Could not load your projects."},{status:500});}
}
