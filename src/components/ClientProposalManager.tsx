"use client";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Clock3, RefreshCw } from "lucide-react";

type Proposal = {id:number;gigId:number;status:string;bidAmount:number;coverLetter:string;estimatedDays:number;freelancerName:string;freelancerUserId?:number;headline?:string;rating?:number;contractId?:number|null};

export function ClientProposalManager({gigId}:{gigId:number}){
 const [rows,setRows]=useState<Proposal[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState<number|null>(null);
 const [notice,setNotice]=useState("");
 const router=useRouter();

 async function load(){
  setLoading(true);setError("");
  try{
   const r=await fetch(`/api/proposals?gigId=${gigId}`,{cache:"no-store"});
   const d=await r.json();
   if(!r.ok)throw new Error(d.message||"Could not load applicants");
   setRows(d.proposals||[]);
  }catch(e){
   setError(e instanceof Error?e.message:"Could not load applicants");
  }finally{setLoading(false);}
 }

 useEffect(()=>{load();},[gigId]);

 async function decide(p:Proposal,status:"Accepted"|"Rejected"){
  setBusy(p.id);setNotice("");
  try{
   const r=await fetch("/api/proposals",{
    method:"PATCH",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({proposalId:p.id,gigId,status})
   });
   const d=await r.json();
   if(!r.ok)throw new Error(d.message||"Could not update proposal");
   if(status==="Accepted"&&d.contractId){
    router.push(`/contracts/${d.contractId}`);
    return;
   }
   setNotice(d.message||"Action completed.");
   await load();
  }catch(e){
   setNotice(e instanceof Error?e.message:"Action failed");
  }finally{setBusy(null);}
 }

 return <section className="detail-card applicant-panel">
  <div className="applicant-heading">
   <div>
    <span className="eyebrow">CLIENT WORKSPACE</span>
    <h2>Applicants for this gig</h2>
    <p>Compare proposals and hire the right freelancer.</p>
   </div>
   <button className="filter-button" onClick={load}><RefreshCw size={14}/> Refresh</button>
  </div>
  {loading?<div className="empty-state">Loading proposals…</div>
  :error?<div className="empty-state">{error}</div>
  :rows.length===0?<div className="empty-state">No proposals yet. New freelancer applications will appear here.</div>
  :<div className="applicant-list">
   {rows.map(p=><article className="applicant-card" key={p.id}>
    <div className="applicant-card-head">
     <img
       className="applicant-avatar"
       src={`/avatars/avatar-${(Math.abs(Number(p.freelancerUserId || p.id)) % 10) + 1}.png`}
       alt={`${p.freelancerName} profile avatar`}
       onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = "/avatars/avatar-1.png";
       }}
      />
     <div className="applicant-person">
      <strong>{p.freelancerName}</strong>
      <span>{p.headline||"Freelancer"}{p.rating?` · ★ ${Number(p.rating).toFixed(1)}`:""}</span>
     </div>
     <span className={`status-pill ${p.status.toLowerCase()}`}>{p.status}</span>
    </div>
    <p className="applicant-cover">{p.coverLetter}</p>
    <div className="applicant-meta">
     <strong>₹{Number(p.bidAmount).toLocaleString("en-IN")}</strong>
     <span><Clock3 size={13}/> {p.estimatedDays} days</span>
    </div>
    {p.status==="Pending"?
     <div className="applicant-actions">
      <button className="button accept-button" disabled={busy===p.id} onClick={()=>decide(p,"Accepted")}>
       <CheckCircle2 size={15}/>{busy===p.id?"Processing…":"Accept & create contract"}
      </button>
      <button className="button reject-button" disabled={busy===p.id} onClick={()=>decide(p,"Rejected")}>
       <XCircle size={15}/> Reject
      </button>
     </div>
    :p.status==="Accepted"&&p.contractId?
     <a className="button full-button" href={`/contracts/${p.contractId}`}>Open contract</a>
    :p.status==="Accepted"?
     <div className="applicant-actions">
      <button className="button accept-button" disabled={busy===p.id} onClick={()=>decide(p,"Accepted")}>
       <CheckCircle2 size={15}/>{busy===p.id?"Creating contract…":"Complete contract setup"}
      </button>
     </div>
    :null}
   </article>)}
  </div>}
  {notice&&<p className="workflow-notice" role="status">{notice}</p>}
 </section>;
}

