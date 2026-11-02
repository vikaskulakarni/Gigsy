import Link from "next/link";
export function Footer() {
  return <footer className="footer"><div className="footer-inner"><Link href="/" className="logo">gigsy<span>.</span></Link><p>Discover skills. Find meaningful work. Build better together.</p><div className="footer-links"><Link href="/explore">Explore</Link><Link href="/talent">Find talent</Link><Link href="/login">Log in</Link><Link href="/register">Join Gigsy</Link></div><small>© 2026 Gigsy. Connecting skills with opportunities.</small></div></footer>;
}
