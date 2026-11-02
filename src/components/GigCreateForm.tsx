"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function GigCreateForm() {
  const router = useRouter();
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [skills,setSkills] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/gigs", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          title:f.get("title"),
          description:f.get("description"),
          budgetMin:f.get("budgetMin"),
          budgetMax:f.get("budgetMax"),
          deadline:f.get("deadline"),
          skills
        })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Could not publish gig.");
      router.push("/projects?created=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish gig.");
    } finally {
      setBusy(false);
    }
  }

  return <form className="profile-editor gig-create-form" onSubmit={submit}>
    <div className="form-grid">
      <label className="wide-field">Gig title
        <input name="title" required minLength={5} maxLength={150}
          placeholder="e.g. Build a responsive Next.js website"/>
      </label>
      <label className="wide-field">Project description
        <textarea name="description" required minLength={30} rows={7}
          placeholder="Explain the project, deliverables and expectations..."/>
      </label>
      <label>Minimum budget (₹)
        <input name="budgetMin" type="number" min="1" required placeholder="10000"/>
      </label>
      <label>Maximum budget (₹)
        <input name="budgetMax" type="number" min="1" required placeholder="25000"/>
      </label>
      <label>Application deadline
        <input name="deadline" type="date"/>
      </label>
      <label>Required skills
        <input value={skills} onChange={e=>setSkills(e.target.value)}
          placeholder="React, TypeScript, MySQL"/>
        <small>Separate skills with commas.</small>
      </label>
    </div>
    {error && <p className="success-message" role="alert" style={{color:"#ff8d9a"}}>{error}</p>}
    <div className="profile-save-row">
      <button className="button" type="submit" disabled={busy}>
        {busy ? "Publishing…" : "Publish gig"}
      </button>
      <span className="tiny-note">Your gig will become visible to freelancers.</span>
    </div>
  </form>;
}
