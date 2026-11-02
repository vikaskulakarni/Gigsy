import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
export default function Register(){return <main className="auth-shell"><Link href="/" className="logo">gigsy<span>.</span></Link><AuthForm mode="register"/></main>}
