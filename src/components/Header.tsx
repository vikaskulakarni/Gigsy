"use client";
import Link from "next/link";
import { Search, Menu, X, ArrowUpRight, LogOut, UserRound } from "lucide-react";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";

type SessionUser={id:number;name:string;email:string;role:"Client"|"Freelancer"};
export function Header() {
 const [open,setOpen]=useState(false);const [user,setUser]=useState<SessionUser|null>(null);const [checking,setChecking]=useState(true);const [loggingOut,setLoggingOut]=useState(false);const router=useRouter();
 useEffect(()=>{let active=true;fetch("/api/auth/me",{cache:"no-store"}).then(r=>r.json()).then(d=>{if(active)setUser(d.user||null);}).catch(()=>{if(active)setUser(null);}).finally(()=>{if(active)setChecking(false);});return()=>{active=false;};},[]);
 async function logout(){setLoggingOut(true);try{await fetch("/api/auth/logout",{method:"POST"});setUser(null);router.push("/");router.refresh();}finally{setLoggingOut(false);}}
 return <header className="topbar"><div className="topbar-inner">
 <Link href={user?"/dashboard":"/"} className="logo">gigsy<span>.</span></Link>
 <nav className={open?"nav-links nav-open":"nav-links"}><Link href="/explore">Explore</Link>{user?.role==="Client"?<><Link href="/gigs/new">Post a gig</Link><Link href="/proposals">Applicants</Link><Link href="/talent">Find talent</Link></>:<><Link href="/talent">Find talent</Link><Link href="/match">AI matching</Link></>}<Link href="/contracts">Contracts</Link></nav>
 <div className="top-actions"><Link href="/explore" className="global-search"><Search size={15}/><span>Search skills, projects or freelancers...</span><kbd>⌘ K</kbd></Link>
 {user?<><Link href="/profile" className="header-account"><span className="header-avatar">{user.name.slice(0,1).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.role}</small></span><UserRound size={14}/></Link><button className="header-logout" onClick={logout} disabled={loggingOut}><LogOut size={15}/>{loggingOut?"Signing out…":"Log out"}</button></>:!checking?<><Link href="/login" className="login-link">Log in</Link><Link href="/register" className="button button-small">Join Gigsy <ArrowUpRight size={14}/></Link></>:<span className="header-loading">Checking session…</span>}
 </div><button className="mobile-menu" onClick={()=>setOpen(!open)} aria-label="Toggle menu">{open?<X/>:<Menu/>}</button>
 </div></header>;
}
