"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import { BriefcaseBusiness,Users,FileText,Star,ArrowUpRight,RefreshCw,Save } from "lucide-react";

type AnyRow=Record<string,any>;
function money(n:any){return `₹${Number(n||0).toLocaleString("en-IN")}`;}
function Shell({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}){
 return <div className="workspace"><aside className="sidebar"><div className="side-label">WORKSPACE</div><Link href="/dashboard">▦　Overview</Link><Link href="/explore">⌕　Explore gigs</Link><Link href="/talent">♙　Find freelancers</Link><Link href="/projects">▤　My projects</Link><Link href="/proposals">▣　Proposals</Link><Link href="/messages">✉　Messages</Link><Link href="/match">✦　AI matching</Link><div className="side-label account-label">YOUR ACCOUNT</div><Link href="/profile">◎　My profile</Link><form action="/api/auth/logout" method="post"><button className="sidebar-logout" type="submit">↪　Log out</button></form></aside><main className="workspace-main"><div className="crumb">WORKSPACE <span>/</span> {title.toUpperCase()}</div><div className="page-heading-row"><div><h1>{title}</h1><p>{subtitle}</p></div><Link href="/explore" className="button">Explore gigs <ArrowUpRight size={15}/></Link></div>{children}</main></div>;
}
function useApi<T>(url:string){const [data,setData]=useState<T|null>(null);const [error,setError]=useState("");const [loading,setLoading]=useState(true);const [reload,setReload]=useState(0);useEffect(()=>{let live=true;setLoading(true);fetch(url,{cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message||"Request failed");return d;}).then(d=>{if(live)setData(d);}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[url,reload]);return {data,error,loading,refresh:()=>setReload(x=>x+1)};}
export function DashboardWorkspace(){
 const {data,error,loading,refresh}=useApi<any>("/api/dashboard");
 const stats=data?.stats||{};const client=data?.user?.role==="Client";
 return <Shell title="Your workspace" subtitle={data?`Welcome back, ${data.user.name}. Here's your latest activity.`:"Your Gigsy activity, projects and opportunities in one place."}>
 {loading?<div className="empty-state">Loading your account dashboard…</div>:error?<div className="empty-state">{error} <button onClick={refresh}>Try again</button><p><Link href="/login">Sign in</Link> if your session has expired.</p></div>:<>
 <div className="stat-grid">
  {(client?[
   ["Your gigs",stats.totalGigs,BriefcaseBusiness],["Open gigs",stats.openGigs,Star],["Proposals received",stats.proposals,FileText],["Contracts",stats.contracts,Users]
  ]:[
   ["Proposals sent",stats.proposals,FileText],["Accepted",stats.accepted,Star],["Active contracts",stats.contracts,BriefcaseBusiness],["Pending replies",stats.pending,Users]
  ]).map(([label,value,Icon]:any)=><div className="stat-card" key={label}><span><Icon size={19}/></span><small>{label}</small><strong>{Number(value||0).toLocaleString("en-IN")}</strong><em>From your Gigsy account</em></div>)}
 </div>
 <div className="section-heading"><div><h2>{client?"Your latest gigs":"Your recent proposals"}</h2><p>{client?"Track applications and project status.":"Track responses from clients."}</p></div><Link href="/projects" className="text-link">View all →</Link></div>
 <div className="simple-list">{(data.recent||[]).map((r:AnyRow)=><Link href={client?`/gigs/${r.id}`:`/gigs/${r.gigId}`} key={r.id}><strong>{r.title}</strong><span>{client?`${r.proposalCount} proposals · ${r.status}`:`${r.proposalStatus} · ${money(r.bidAmount)}`}</span><em>View details →</em></Link>)}</div>
 {!data.recent?.length&&<div className="empty-panel"><h2>No activity yet</h2><p>{client?"Post your first gig to start receiving proposals.":"Explore open gigs and submit your first proposal."}</p><Link className="button" href="/explore">Explore opportunities</Link></div>}
 </>}
 </Shell>;
}
export function ProjectsWorkspace(){
 const {data,error,loading,refresh}=useApi<any>("/api/projects");
 return <Shell title="My projects" subtitle="Track the gigs you manage or the proposals you've submitted.">
 {loading?<div className="empty-state">Loading your projects…</div>:error?<div className="empty-state">{error} <button onClick={refresh}>Retry</button></div>:<>
 <div className="section-heading"><div><h2>{data?.role==="Client"?"Your posted gigs":"Your applications"}</h2><p>{(data?.projects||[]).length} records from your account</p></div><button className="filter-button" onClick={refresh}><RefreshCw size={14}/> Refresh</button></div>
 <div className="simple-list">{(data?.projects||[]).map((p:AnyRow)=><Link href={`/gigs/${p.gigId||p.id}`} key={p.id}><strong>{p.title}</strong><span>{data.role==="Client"?`${p.status} · ${p.proposalCount} proposals · ${money(p.budgetMin)}–${money(p.budgetMax)}`:`${p.proposalStatus} · Bid ${money(p.bidAmount)} · ${p.clientName}`}</span><em>{data.role==="Client"?"Manage gig":"View gig"} →</em></Link>)}</div>
 {(data?.projects||[]).length===0&&<div className="empty-panel"><h2>Nothing here yet</h2><p>{data?.role==="Client"?"Post a gig to start receiving applications.":"Apply to an open gig to see it here."}</p><Link className="button" href="/explore">Explore gigs</Link></div>}
 </>}
 </Shell>;
}
export function ProfileWorkspace(){
 const {data,error,loading,refresh}=useApi<any>("/api/profile");const [form,setForm]=useState<AnyRow>({});const [notice,setNotice]=useState("");const [saving,setSaving]=useState(false);
 useEffect(()=>{if(data?.profile)setForm(data.profile);},[data]);
 function change(k:string,v:any){setForm((f)=>({...f,[k]:v}));}
 async function save(e:React.FormEvent){e.preventDefault();setSaving(true);setNotice("");try{const r=await fetch("/api/profile",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});const d=await r.json();if(!r.ok)throw new Error(d.message);setNotice("Profile saved successfully.");refresh();}catch(e){setNotice(e instanceof Error?e.message:"Could not save profile.");}finally{setSaving(false);}}
 const freelancer=data?.profile&&"headline" in data.profile;
 return <Shell title="Your profile" subtitle="Keep your account details and professional information up to date.">
 {loading?<div className="empty-state">Loading your profile…</div>:error?<div className="empty-state">{error} <button onClick={refresh}>Retry</button></div>:<form className="profile-editor" onSubmit={save}>
 <div className="profile-panel"><div className="avatar avatar-large violet">{String(form.name||"G").split(" ").map((x:string)=>x[0]).slice(0,2).join("").toUpperCase()}</div><div><h2>{form.name}</h2><p>{form.email} · {freelancer?"Freelancer":"Client"}</p>{freelancer&&<p><Star size={14} fill="currentColor"/> {Number(form.rating||0).toFixed(1)} · {form.reviews||0} reviews</p>}</div></div>
 <div className="form-grid"><label>Full name<input value={form.name||""} onChange={e=>change("name",e.target.value)} required/></label><label>Phone<input value={form.phone||""} onChange={e=>change("phone",e.target.value)} placeholder="Phone number"/></label>
 {freelancer?<><label className="wide-field">Professional headline<input value={form.headline||""} onChange={e=>change("headline",e.target.value)} placeholder="e.g. Full-stack developer"/></label><label className="wide-field">About you<textarea value={form.bio||""} onChange={e=>change("bio",e.target.value)} rows={5} placeholder="Describe your experience and strengths"/></label><label>Experience (years)<input type="number" min="0" value={form.experienceYears??0} onChange={e=>change("experienceYears",e.target.value)}/></label><label>Hourly rate (₹)<input type="number" min="0" value={form.hourlyRate??""} onChange={e=>change("hourlyRate",e.target.value)}/></label><label>Availability<select value={form.availability||"Available"} onChange={e=>change("availability",e.target.value)}><option>Available</option><option>Busy</option><option>Away</option></select></label><label>Portfolio URL<input value={form.portfolioUrl||""} onChange={e=>change("portfolioUrl",e.target.value)} placeholder="https://"/></label></>:<><label>Company name<input value={form.companyName||""} onChange={e=>change("companyName",e.target.value)}/></label><label>Website<input value={form.website||""} onChange={e=>change("website",e.target.value)}/></label><label className="wide-field">Company description<textarea rows={4} value={form.companyDescription||""} onChange={e=>change("companyDescription",e.target.value)}/></label><label className="wide-field">Address<input value={form.address||""} onChange={e=>change("address",e.target.value)}/></label></>}
 </div><div className="profile-save-row"><button className="button" disabled={saving}><Save size={15}/>{saving?"Saving…":"Save profile"}</button>{notice&&<span role="status">{notice}</span>}</div>
 </form>}
 </Shell>;
}

export function ProposalsWorkspace(){
 const {data,error,loading,refresh}=useApi<any>("/api/proposals");
 return <Shell title="Proposals" subtitle="Review the applications you've sent or the offers freelancers have submitted.">
 {loading?<div className="empty-state">Loading proposals…</div>:error?<div className="empty-state">{error} <button onClick={refresh}>Retry</button></div>:<>
 <div className="section-heading"><div><h2>{data?.role==="Client"?"Proposals received":"Proposals sent"}</h2><p>{(data?.proposals||[]).length} records from your account</p></div><button className="filter-button" onClick={refresh}><RefreshCw size={14}/> Refresh</button></div>
 <div className="simple-list">{(data?.proposals||[]).map((p:AnyRow)=><Link href={`/gigs/${p.gigId}`} key={p.id}><strong>{p.title}</strong><span>{data.role==="Client"?`${p.freelancerName} · `:`${p.clientName} · `}{p.status} · {money(p.bidAmount)} · {p.estimatedDays} days</span><em>View gig →</em></Link>)}</div>
 {(data?.proposals||[]).length===0&&<div className="empty-panel"><h2>No proposals yet</h2><p>{data?.role==="Client"?"Proposals on your gigs will appear here.":"Your submitted applications will appear here."}</p><Link className="button" href="/explore">Explore gigs</Link></div>}
 </>}
 </Shell>;
}
