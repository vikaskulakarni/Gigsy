"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft,CheckCircle2,Clock3,MessageSquare,RefreshCw,Send,ShieldCheck } from "lucide-react";

type ContractData={role:"Client"|"Freelancer";contract:any;milestones:any[]};
export function ContractDetailWorkspace({contractId}:{contractId:number}){
 const [data,setData]=useState<ContractData|null>(null);const [error,setError]=useState("");const [loading,setLoading]=useState(true);const [busy,setBusy]=useState<number|null>(null);const [notice,setNotice]=useState("");const router=useRouter();
 async function load(){setLoading(true);setError("");try{const r=await fetch(`/api/contracts/${contractId}`,{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.message||"Could not load contract");setData(d);}catch(e){setError(e instanceof Error?e.message:"Could not load contract");}finally{setLoading(false);}}
 useEffect(()=>{load();},[contractId]);
 async function update(m:any,status:string){setBusy(m.id);setNotice("");try{const r=await fetch(`/api/contracts/${contractId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({milestoneId:m.id,status})});const d=await r.json();if(!r.ok)throw new Error(d.message||"Could not update milestone");setNotice(d.message);await load();router.refresh();}catch(e){setNotice(e instanceof Error?e.message:"Could not update milestone");}finally{setBusy(null);}}
 if(loading)return <main className="container contract-detail-page"><div className="empty-state">Loading your project workspace…</div></main>;
 if(error||!data)return <main className="container contract-detail-page"><div className="empty-state">{error||"Contract unavailable"} <p><Link href="/contracts">Back to contracts</Link></p></div></main>;
 const c=data.contract;const client=data.role==="Client";const completed=data.milestones.filter(m=>m.status==="Completed").length;
 return <main className="container contract-detail-page">
 <Link href="/contracts" className="back-link"><ArrowLeft size={15}/> Back to contracts</Link>
 <section className="contract-hero"><div><span className="eyebrow">GIGSY PROJECT WORKSPACE · CONTRACT #{c.id}</span><h1>{c.title}</h1><p>{client?"You are working with":"You have been hired by"} <strong>{client?c.freelancerName:c.clientName}</strong></p></div><span className={`status-pill ${String(c.status).toLowerCase()}`}>{c.status}</span></section>
 <div className="contract-detail-grid"><div className="contract-main-column">
 <section className="detail-card contract-summary"><div className="contract-summary-item"><small>AGREED PROJECT BUDGET</small><strong>₹{Number(c.agreedAmount).toLocaleString("en-IN")}</strong></div><div className="contract-summary-item"><small>DELIVERY ESTIMATE</small><strong>{c.deliveryDays} days</strong></div><div className="contract-summary-item"><small>PROJECT PROGRESS</small><strong>{completed}/{data.milestones.length} milestones</strong></div></section>
 <section className="detail-card"><div className="applicant-heading"><div><span className="eyebrow">YOUR NEXT STEPS</span><h2>Project milestones</h2><p>Follow this plan to keep the project moving.</p></div><button className="filter-button" onClick={load}><RefreshCw size={14}/> Refresh</button></div>
 <div className="milestone-list">{data.milestones.map((m,i)=><article className="milestone-item" key={m.id}><div className={`milestone-marker ${m.status==="Completed"?"done":m.status==="In Progress"?"active":""}`}>{m.status==="Completed"?<CheckCircle2 size={17}/>:i+1}</div><div className="milestone-content"><div className="milestone-title-row"><h3>{m.title}</h3><span className={`status-pill ${String(m.status).toLowerCase().replace(" ","-")}`}>{m.status}</span></div><p>{m.description}</p><div className="milestone-facts"><span><Clock3 size={13}/> Due {String(m.dueDate).slice(0,10)}</span><strong>₹{Number(m.amount).toLocaleString("en-IN")}</strong></div>
 {data.role==="Freelancer"&&m.status==="Pending"?<button className="button milestone-action" disabled={busy===m.id} onClick={()=>update(m,"In Progress")}>{busy===m.id?"Updating…":"Start milestone"}</button>:data.role==="Freelancer"&&m.status==="In Progress"?<button className="button milestone-action" disabled={busy===m.id} onClick={()=>update(m,"Submitted")}><Send size={14}/> Submit for client review</button>:client&&m.status==="Submitted"?<button className="button milestone-action" disabled={busy===m.id} onClick={()=>update(m,"Completed")}><CheckCircle2 size={14}/> Approve milestone</button>:null}
 </div></article>)}</div>{notice&&<p className="workflow-notice" role="status">{notice}</p>}
 {c.status==="Completed"&&<div className="completion-banner"><CheckCircle2 size={22}/><div><strong>Project completed!</strong><p>All milestones have been approved. You can now exchange final feedback and reviews.</p></div></div>}
 </section></div>
 <aside className="contract-side-column"><section className="detail-card"><span className="eyebrow">PROJECT CONTACT</span><h2>{client?c.freelancerName:c.clientName}</h2><p className="muted">{client?"Your hired freelancer":"Your client"}</p><Link className="button full-button" href="/messages"><MessageSquare size={15}/> Open messages</Link><div className="aside-rule"/><p className="tiny-note"><ShieldCheck size={13}/> Contract access is restricted to its two participants.</p></section>
 <section className="detail-card"><span className="eyebrow">PROJECT CHECKLIST</span><p>1. Review the scope and delivery plan.</p><p>2. Use messages to clarify requirements.</p><p>3. Submit each milestone for review.</p><p>4. Client approves milestones to complete the project.</p></section></aside></div>
 </main>;
}
