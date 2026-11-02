import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
export const dynamic="force-dynamic";
export async function GET(){
 const user=await getCurrentUser();if(!user)return NextResponse.json({success:false,message:"Please sign in."},{status:401});
 try{
  if(user.user_type==="Freelancer"){
   const [rows]=await pool.execute(`SELECT p.proposal_id AS id,p.status,p.bid_amount AS bidAmount,p.cover_letter AS coverLetter,p.proposed_date AS proposedDate,p.estimated_days AS estimatedDays,g.gig_id AS gigId,g.title,g.status AS gigStatus,u.name AS clientName FROM proposal p JOIN freelancer f ON f.freelancer_id=p.freelancer_id JOIN gig g ON g.gig_id=p.gig_id JOIN client c ON c.client_id=g.client_id JOIN users u ON u.user_id=c.user_id WHERE f.user_id=? ORDER BY p.proposed_date DESC,p.proposal_id DESC`,[user.user_id]);
   return NextResponse.json({success:true,role:"Freelancer",proposals:rows});
  }
  const [rows]=await pool.execute(`SELECT p.proposal_id AS id,p.status,p.bid_amount AS bidAmount,p.cover_letter AS coverLetter,p.proposed_date AS proposedDate,p.estimated_days AS estimatedDays,g.gig_id AS gigId,g.title,u.name AS freelancerName FROM proposal p JOIN gig g ON g.gig_id=p.gig_id JOIN client c ON c.client_id=g.client_id JOIN users owner ON owner.user_id=c.user_id JOIN freelancer f ON f.freelancer_id=p.freelancer_id JOIN users u ON u.user_id=f.user_id WHERE owner.user_id=? ORDER BY p.proposed_date DESC,p.proposal_id DESC`,[user.user_id]);
  return NextResponse.json({success:true,role:"Client",proposals:rows});
 }catch(e){console.error("Proposals GET",e);return NextResponse.json({success:false,message:"Could not load proposals."},{status:500});}
}
export async function POST(req:Request){
 const u=await getCurrentUser();if(!u)return NextResponse.json({success:false,message:"Sign in before submitting a proposal."},{status:401});
 if(u.user_type!=="Freelancer")return NextResponse.json({success:false,message:"Only freelancers can submit proposals."},{status:403});
 try{
  const b=await req.json(),gigId=Number(b.gigId),bid=Number(b.bidAmount),cover=String(b.coverLetter||"").trim(),days=Number(b.estimatedDays||7);
  if(!Number.isInteger(gigId)||gigId<1||!Number.isFinite(bid)||bid<=0||!cover||!Number.isInteger(days)||days<1)return NextResponse.json({success:false,message:"Provide valid gig, bid, proposal and delivery days."},{status:400});
  const [f]=await pool.execute("SELECT freelancer_id FROM freelancer WHERE user_id=? LIMIT 1",[u.user_id]);const fr=(f as any[])[0];
  if(!fr)return NextResponse.json({success:false,message:"Freelancer profile not found."},{status:404});
  const [g]=await pool.execute("SELECT gig_id FROM gig WHERE gig_id=? AND status='Open'",[gigId]);if(!(g as any[]).length)return NextResponse.json({success:false,message:"Gig is no longer open."},{status:404});
  await pool.execute("INSERT INTO proposal(gig_id,freelancer_id,bid_amount,cover_letter,proposed_date,estimated_days,status) VALUES(?,?,?,?,CURDATE(),?,'Pending')",[gigId,fr.freelancer_id,bid,cover,days]);
  return NextResponse.json({success:true,message:"Proposal submitted."},{status:201});
 }catch(e:any){if(e.code==="ER_DUP_ENTRY")return NextResponse.json({success:false,message:"You have already applied to this gig."},{status:409});console.error(e);return NextResponse.json({success:false,message:"Could not submit proposal."},{status:500});}
}
