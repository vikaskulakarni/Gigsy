import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GigCreateForm } from "@/components/GigCreateForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewGigPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.user_type !== "Client") redirect("/explore");

  return <>
    <Header/>
    <main className="container inner-page">
      <span className="eyebrow">CLIENT WORKSPACE</span>
      <h1>Post a new gig</h1>
      <p>Describe your project, set your budget and invite skilled freelancers to apply.</p>
      <GigCreateForm/>
    </main>
    <Footer/>
  </>;
}
