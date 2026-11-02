import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import pool from "@/lib/db";
import { MapPin, Clock3, ShieldCheck, ArrowLeft, CheckCircle2 } from "lucide-react";
import { ProposalForm } from "@/components/ProposalForm";

export const dynamic = "force-dynamic";
export default async function GigDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let gig: any;
  try {
    const [rows] = await pool.execute(`SELECT g.gig_id AS id,g.title,g.description,g.budget_min AS budgetMin,g.budget_max AS budgetMax,g.deadline,g.status,g.posted_date AS postedDate,u.name AS clientName,(SELECT GROUP_CONCAT(s.skill_name ORDER BY s.skill_name SEPARATOR ',') FROM gig_skill gs JOIN skill s ON s.skill_id=gs.skill_id WHERE gs.gig_id=g.gig_id) AS skills FROM gig g JOIN client c ON c.client_id=g.client_id JOIN users u ON u.user_id=c.user_id WHERE g.gig_id=? LIMIT 1`, [id]);
    gig = (rows as any[])[0];
  } catch (error) { console.error("Gig detail query failed", error); throw error; }
  if (!gig) notFound();
  const tags = gig.skills ? String(gig.skills).split(",") : [];
  const budget = `₹${Number(gig.budgetMin).toLocaleString("en-IN")} – ₹${Number(gig.budgetMax).toLocaleString("en-IN")}`;
  return <><Header/><main className="container detail-page"><Link href="/explore" className="back-link"><ArrowLeft size={15}/> Back to opportunities</Link><div className="detail-layout"><div><article className="detail-card"><div className="detail-title-row"><div className="company-mark large-mark blue">{String(gig.clientName||"G").slice(0,1)}</div><div><span className="eyebrow">OPEN OPPORTUNITY</span><h1>{gig.title}</h1><p>{gig.clientName} · Posted {String(gig.postedDate).slice(0,10)}</p></div></div><div className="detail-facts"><span><MapPin/> Location not specified</span><span><Clock3/> Project</span><span><ShieldCheck/> Client account</span></div><h2>About this opportunity</h2><p>{gig.description}</p><h2>Skills and experience</h2><div className="tag-row">{tags.map((t:string)=><span className="skill-tag" key={t}>{t}</span>)}</div><h2>Project status</h2><p>{gig.status}</p></article><ProposalForm gigTitle={gig.title} gigId={Number(gig.id)}/></div><aside className="detail-aside"><div className="detail-card"><span className="eyebrow">PROJECT BUDGET</span><h2 className="budget-heading">{budget}</h2><p className="muted">Budget range stored in Gigsy MySQL</p><div className="aside-rule"/><span className="eyebrow">GIGSY MATCH</span><strong className="detail-match">—</strong><p className="muted">Personalized semantic match scores will appear after Qdrant indexing.</p><div className="aside-rule"/><Link href="/login" className="button full-button">Sign in to apply</Link><p className="tiny-note">Sign in with a freelancer account to submit a proposal.</p></div></aside></div></main><Footer/></>;
}
