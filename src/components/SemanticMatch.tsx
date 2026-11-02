
"use client";
import {useState} from "react";
import Link from "next/link";
export function SemanticMatch(){
 const [query,setQuery]=useState(""),[matches,setMatches]=useState<any[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState(false),[searched,setSearched]=useState(false);
 async function run(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");setSearched(false);try{const r=await fetch("/api/match/gigs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query})});const d=await r.json();if(!r.ok)throw Error(d.message);setMatches(d.matches||[]);setSearched(true);}catch(e){setError(e instanceof Error?e.message:"Matching failed");}finally{setBusy(false);}}
 return <section className="semantic-panel"><span className="eyebrow">GIGSY INTELLIGENCE</span><h2>Find gigs by meaning, not just keywords.</h2><p>Describe your skills and local semantic search will rank relevant open projects.</p><form onSubmit={run} className="semantic-form"><textarea value={query} onChange={e=>setQuery(e.target.value)} maxLength={2000} required placeholder="Example: I build cloud infrastructure on AWS and automate CI/CD with Docker…" rows={3}/><button className="button" disabled={busy}>{busy?"Matching…":"Find semantic matches"}</button></form>{error&&<p role="alert">{error}</p>}{searched&&matches.length===0&&<p>No matching indexed gigs yet.</p>}{matches.map(m=><Link href={`/gigs/${m.gig.id}`} className="semantic-result" key={m.gig.id}><strong>{m.gig.title}</strong><span>{Math.round(m.score*100)}% vector similarity · ₹{Number(m.gig.budgetMin).toLocaleString("en-IN")}–₹{Number(m.gig.budgetMax).toLocaleString("en-IN")}</span></Link>)}</section>;
}
