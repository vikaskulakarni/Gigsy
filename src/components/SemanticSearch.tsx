"use client";
import {useState} from "react";
import Link from "next/link";
export function SemanticSearch(){
 const [query,setQuery]=useState(""),[matches,setMatches]=useState<any[]>([]),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 async function search(e:React.FormEvent){e.preventDefault();setBusy(true);setNotice("");setMatches([]);try{const r=await fetch("/api/match/gigs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query})});const d=await r.json();if(!r.ok)throw Error(d.message||"Semantic search unavailable");setMatches(d.matches||[]);if(!d.matches?.length)setNotice("No semantic matches found. Index open gigs first.");}catch(e){setNotice(e instanceof Error?e.message:"Search failed");}finally{setBusy(false);}}
 return <section className="semantic-box"><span className="eyebrow">VECTOR INTELLIGENCE</span><h2>Find work by meaning, not just keywords</h2><p>Describe your skills or ideal project. ChromaDB ranks related opportunities by semantic similarity.</p><form onSubmit={search} className="semantic-form"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="e.g. automate cloud deployments using containers" required minLength={3}/><button className="button" disabled={busy}>{busy?"Matching…":"Find matches"}</button></form>{notice&&<p role="status">{notice}</p>}{matches.map((m:any)=><Link key={m.id} href={`/gigs/${m.payload?.gig_id||m.id}`} className="semantic-result"><strong>{m.payload?.title||`Gig #${m.id}`}</strong><span>{Math.round(Number(m.score||0)*100)}% similarity</span></Link>)}</section>;
}
