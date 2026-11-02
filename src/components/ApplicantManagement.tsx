"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Clock3, UserRound, Users } from "lucide-react";

type Applicant = {
  id:number;
  freelancerName:string;
  status:string;
  bidAmount:number;
  estimatedDays:number;
  coverLetter:string;
  proposedDate:string;
  skills:string[];
};

export function ApplicantManagement({
  gigId,
  applicants
}:{gigId:number;applicants:Applicant[]}) {
  const router = useRouter();
  const [busy,setBusy] = useState<number|null>(null);
  const [error,setError] = useState("");
  const [success,setSuccess] = useState("");

  async function updateProposal(proposalId:number,status:"Accepted"|"Rejected") {
    setBusy(proposalId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/proposals", {
        method:"PATCH",
        credentials:"same-origin",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({proposalId,gigId,status})
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not update proposal.");
      setSuccess(data.message || "Proposal updated.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(null);
    }
  }

  const pending = applicants.filter(a=>a.status==="Pending").length;
  const accepted = applicants.filter(a=>a.status==="Accepted").length;

  return <section className="gig-applicant-panel">
    <div className="gig-applicant-heading">
      <div>
        <span className="gig-eyebrow">CLIENT MANAGEMENT</span>
        <h2>Proposals received</h2>
        <p>Review freelancers interested in your project.</p>
      </div>
      <div className="gig-applicant-count">
        <Users size={19}/>
        <strong>{applicants.length}</strong>
        <small>Applicants</small>
      </div>
    </div>

    <div className="gig-applicant-stats">
      <div><strong>{applicants.length}</strong><span>Total proposals</span></div>
      <div><strong>{pending}</strong><span>Awaiting review</span></div>
      <div><strong>{accepted}</strong><span>Accepted</span></div>
    </div>

    {error && <p className="gig-feedback gig-feedback-error">{error}</p>}
    {success && <p className="gig-feedback gig-feedback-success">{success}</p>}

    {applicants.length===0 ? (
      <div className="gig-applicant-empty">
        <Users size={30}/>
        <h3>No proposals yet</h3>
        <p>Your project is published. Freelancer applications will appear here.</p>
      </div>
    ) : (
      <div className="gig-applicant-list">
        {applicants.map(applicant=><article className="gig-applicant-card" key={applicant.id}>
          <div className="gig-applicant-top">
            <div className="gig-applicant-avatar"><UserRound size={20}/></div>
            <div className="gig-applicant-person">
              <h3>{applicant.freelancerName}</h3>
              <span>Applied {applicant.proposedDate || "recently"}</span>
            </div>
            <span className={`gig-proposal-status ${applicant.status.toLowerCase()}`}>{applicant.status}</span>
          </div>

          <div className="gig-applicant-metrics">
            <div><small>Proposed budget</small><strong>₹{applicant.bidAmount.toLocaleString("en-IN")}</strong></div>
            <div><small>Delivery estimate</small><strong>{applicant.estimatedDays} days</strong></div>
          </div>

          <p className="gig-applicant-cover">{applicant.coverLetter}</p>

          {applicant.skills.length>0 && <div className="gig-skill-list">
            {applicant.skills.map(skill=><span className="gig-skill" key={skill}>{skill}</span>)}
          </div>}

          {applicant.status==="Pending" && <div className="gig-applicant-actions">
            <button disabled={busy!==null} onClick={()=>updateProposal(applicant.id,"Accepted")} className="gig-accept-button">
              <Check size={15}/>{busy===applicant.id?"Updating…":"Accept proposal"}
            </button>
            <button disabled={busy!==null} onClick={()=>updateProposal(applicant.id,"Rejected")} className="gig-reject-button">
              <X size={15}/>Reject
            </button>
          </div>}
          {applicant.status==="Accepted" && <p className="gig-accepted-note"><Check size={14}/> This proposal has been accepted.</p>}
        </article>)}
      </div>
    )}
  </section>;
}
