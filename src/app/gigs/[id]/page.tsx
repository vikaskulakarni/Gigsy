import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { MapPin, Clock3, ShieldCheck, ArrowLeft } from "lucide-react";
import { ProposalForm } from "@/components/ProposalForm";
import { ClientProposalManager } from "@/components/ClientProposalManager";

export const dynamic = "force-dynamic";
export default async function GigDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let gig: any;
  try {
    const [rows] = await pool.execute(
      `SELECT g.gig_id AS id,g.title,g.description,g.budget_min AS budgetMin,g.budget_max AS budgetMax,g.deadline,g.status,g.posted_date AS postedDate,u.name AS clientName,c.user_id AS clientUserId,(SELECT GROUP_CONCAT(s.skill_name ORDER BY s.skill_name SEPARATOR ',') FROM gig_skill gs JOIN skill s ON s.skill_id=gs.skill_id WHERE gs.gig_id=g.gig_id) AS skills
       FROM gig g JOIN client c ON c.client_id=g.client_id JOIN users u ON u.user_id=c.user_id WHERE g.gig_id=? LIMIT 1`, [id]);
    gig = (rows as any[])[0];
  } catch (error) { console.error("Gig detail query failed", error); throw error; }
  if (!gig) notFound();
  const user = await getCurrentUser();
  const isOwner = user?.user_type === "Client" && Number(user.user_id) === Number(gig.clientUserId);
  const isFreelancer = user?.user_type === "Freelancer";
  const tags = gig.skills ? String(gig.skills).split(",") : [];
  const budget = `₹${Number(gig.budgetMin).toLocaleString("en-IN")} – ₹${Number(gig.budgetMax).toLocaleString("en-IN")}`;
  return <><Header/><main className="container detail-page"><Link href={isOwner?"/projects":"/explore"} className="back-link"><ArrowLeft size={15}/> Back to {isOwner?"your gigs":"opportunities"}</Link>
    <div className="detail-layout"><div><article className="detail-card"><div className="detail-title-row"><div className="company-mark large-mark blue">{String(gig.clientName||"G").slice(0,1)}</div><div><span className="eyebrow">{gig.status==="Open"?"OPEN OPPORTUNITY":gig.status.toUpperCase()}</span><h1>{gig.title}</h1><p>{gig.clientName} · Posted {String(gig.postedDate).slice(0,10)}</p></div></div>
    <div className="detail-facts"><span><MapPin/> Location not specified</span><span><Clock3/> Project</span><span><ShieldCheck/> Verified client account</span></div>
    <h2>About this opportunity</h2><p>{gig.description}</p><h2>Skills and experience</h2><div className="tag-row">{tags.map((t:string)=><span className="skill-tag" key={t}>{t}</span>)}</div><h2>Project status</h2><p>{gig.status==="Closed"?"A freelancer has been selected.":gig.status}</p></article>
    {isOwner?<ClientProposalManager gigId={Number(gig.id)}/>:isFreelancer&&gig.status==="Open"?<ProposalForm gigTitle={gig.title} gigId={Number(gig.id)}/>:user?.user_type==="Client"?<section className="detail-card"><h2>Client view</h2><p>This gig belongs to another client account. You can browse opportunities, but only the owner can manage its applicants.</p></section>:!user?<section className="detail-card"><h2>Interested in this opportunity?</h2><p>Sign in with your Freelancer account to submit a proposal.</p><Link href="/login" className="button">Sign in to apply</Link></section>:<section className="detail-card"><h2>Applications are closed</h2><p>This opportunity is no longer accepting proposals.</p></section>}
    </div><aside className="detail-aside"><div className="detail-card"><span className="eyebrow">PROJECT BUDGET</span><h2 className="budget-heading">{budget}</h2><p className="muted">Budget range stored in Gigsy MySQL</p><div className="aside-rule"/><span className="eyebrow">GIGSY AI MATCH</span><strong className="detail-match">✦</strong><p className="muted">Semantic matching is powered by ChromaDB. Match information appears when available.</p>{isOwner?<><div className="aside-rule"/><p className="muted">Review applicants and accept the proposal that best fits your project.</p></>:null}</div></aside></div></main><Footer/></>;
}
