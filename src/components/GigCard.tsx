"use client";
import Link from "next/link";
import { Bookmark, ArrowUpRight, MapPin } from "lucide-react";
import { useState } from "react";
import type { Gig } from "@/lib/data";

export function GigCard({ gig }: { gig: Gig }) {
  const [saved, setSaved] = useState(false);
  return <article className="gig-card">
    <div className="gig-card-top"><div className={`company-mark ${gig.color}`}>{gig.company.slice(0,1)}</div><div className="gig-meta"><div className="gig-badges">{gig.badge && <span className={`badge ${gig.badge.toLowerCase()}`}>{gig.badge}</span>}<span className="posted">{gig.age}</span></div><h3>{gig.title}</h3><p>{gig.company} <span>·</span> <MapPin size={12}/>{gig.location}</p></div><button className={saved ? "icon-button saved" : "icon-button"} onClick={() => setSaved(!saved)} aria-label={saved ? "Unsave project" : "Save project"}><Bookmark size={18} fill={saved ? "currentColor" : "none"}/></button></div>
    <p className="gig-description">{gig.description}</p>
    <div className="tag-row">{gig.tags.map(tag => <span className="skill-tag" key={tag}>{tag}</span>)}</div>
    <div className="gig-card-bottom"><strong>{gig.budget}</strong><span className="match-score">{gig.match}% match</span><Link href={`/gigs/${gig.id}`} className="card-arrow" aria-label={`View ${gig.title}`}><ArrowUpRight size={17}/></Link></div>
  </article>;
}
