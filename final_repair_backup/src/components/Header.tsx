"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, Menu, X, ArrowUpRight, UserCircle } from "lucide-react";

type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: "Client" | "Freelancer";
};

export function Header() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (active) setUser(d.user || null);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => { active = false; };
  }, []);

  const client = user?.role === "Client";
  const initials = user?.name
    ? user.name.split(" ").map(x => x[0]).slice(0, 2).join("").toUpperCase()
    : "";

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href={user ? "/dashboard" : "/"} className="logo">
          gigsy<span>.</span>
        </Link>

        <nav className={open ? "nav-links nav-open" : "nav-links"}>
          {user ? (
            <>
              {client ? (
                <>
                  <Link href="/gigs/new">Post a gig</Link>
                  <Link href="/projects">My gigs</Link>
                  <Link href="/proposals">Proposals received</Link>
                  <Link href="/talent">Find talent</Link>
                </>
              ) : (
                <>
                  <Link href="/explore">Explore gigs</Link>
                  <Link href="/projects">My applications</Link>
                  <Link href="/proposals">Proposals sent</Link>
                  <Link href="/match">AI matching</Link>
                </>
              )}
            </>
          ) : (
            <>
              <Link href="/explore">Explore</Link>
              <Link href="/talent">Find talent</Link>
              <a href="/#how">How it works</a>
              <a href="/#pricing">Pricing</a>
            </>
          )}
        </nav>

        <div className="top-actions">
          <Link href={client ? "/talent" : "/explore"} className="global-search">
            <Search size={15}/>
            <span>{client ? "Search freelancers and skills..." : "Search gigs and skills..."}</span>
            <kbd>⌘ K</kbd>
          </Link>

          {loaded && user ? (
            <>
              <Link href="/profile" className="header-user">
                <span className="header-avatar">{initials || <UserCircle size={18}/>}</span>
                <span className="header-user-name">{user.name}</span>
                <span className="header-role">{user.role}</span>
              </Link>
              <Link href="/dashboard" className="button button-small">
                My workspace <ArrowUpRight size={14}/>
              </Link>
            </>
          ) : loaded ? (
            <>
              <Link href="/login" className="login-link">Log in</Link>
              <Link href="/register" className="button button-small">
                Join Gigsy <ArrowUpRight size={14}/>
              </Link>
            </>
          ) : (
            <span className="header-loading">Loading account…</span>
          )}
        </div>

        <button className="mobile-menu"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu">
          {open ? <X/> : <Menu/>}
        </button>
      </div>
    </header>
  );
}
