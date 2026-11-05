"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, Clock3, MessageSquare,
  RefreshCw, Send, ShieldCheck
} from "lucide-react";

type ContractData = {
  role: "Client" | "Freelancer";
  contract: any;
  milestones: any[];
};

type ReviewInfo = {
  id: number;
  rating: number;
  reviewText: string | null;
  reviewDate: string;
} | null;

export function ContractDetailWorkspace({ contractId }: { contractId: number }) {
  const [data, setData] = useState<ContractData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [review, setReview] = useState<ReviewInfo>(null);
  const [canReview, setCanReview] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const router = useRouter();

  async function load() {
    setLoading(true);
    setError("");

    try {
      const r = await fetch(`/api/contracts/${contractId}`, { cache: "no-store" });
      const d = await r.json();

      if (!r.ok) throw new Error(d.message || "Could not load contract");

      setData(d);

      const rr = await fetch(`/api/contracts/${contractId}/review`, {
        cache: "no-store"
      });
      const rd = await rr.json();

      if (!rr.ok) {
        setReviewError(rd.message || "Could not load review information.");
      } else {
        setReview(rd.review || null);
        setCanReview(Boolean(rd.canReview));
        setReviewError("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load contract");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [contractId]);

  async function update(m: any, status: string) {
    setBusy(m.id);
    setNotice("");

    try {
      const r = await fetch(`/api/contracts/${contractId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId: m.id, status })
      });

      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Could not update milestone");

      setNotice(d.message);
      await load();
      router.refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not update milestone");
    } finally {
      setBusy(null);
    }
  }

  async function submitReview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setReviewBusy(true);
    setReviewError("");
    setNotice("");

    try {
      const r = await fetch(`/api/contracts/${contractId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, reviewText })
      });

      const d = await r.json();

      if (!r.ok) throw new Error(d.message || "Could not submit review");

      setNotice(d.message || "Review submitted successfully.");
      setReviewText("");

      const rr = await fetch(`/api/contracts/${contractId}/review`, {
        cache: "no-store"
      });
      const rd = await rr.json();

      if (rr.ok) {
        setReview(rd.review || null);
        setCanReview(Boolean(rd.canReview));
      }
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : "Could not submit review.");
    } finally {
      setReviewBusy(false);
    }
  }

  if (loading) {
    return <main className="container contract-detail-page">
      <div className="empty-state">Loading your project workspace...</div>
    </main>;
  }

  if (error || !data) {
    return <main className="container contract-detail-page">
      <div className="empty-state">
        {error || "Contract unavailable"}
        <p><Link href="/contracts">Back to contracts</Link></p>
      </div>
    </main>;
  }

  const c = data.contract;
  const client = data.role === "Client";
  const completed = data.milestones.filter(m => m.status === "Completed").length;

  return (
    <main className="container contract-detail-page">
      <Link href="/contracts" className="back-link">
        <ArrowLeft size={15} /> Back to contracts
      </Link>

      <section className="contract-hero">
        <div>
          <span className="eyebrow">GIGSY PROJECT WORKSPACE · CONTRACT #{c.id}</span>
          <h1>{c.title}</h1>
          <p>
            {client ? "You are working with" : "You have been hired by"}{" "}
            <strong>{client ? c.freelancerName : c.clientName}</strong>
          </p>
        </div>
        <span className={`status-pill ${String(c.status).toLowerCase()}`}>
          {c.status}
        </span>
      </section>

      <div className="contract-detail-grid">
        <div className="contract-main-column">
          <section className="detail-card contract-summary">
            <div className="contract-summary-item">
              <small>AGREED PROJECT BUDGET</small>
              <strong>₹{Number(c.agreedAmount).toLocaleString("en-IN")}</strong>
            </div>
            <div className="contract-summary-item">
              <small>DELIVERY ESTIMATE</small>
              <strong>{c.deliveryDays} days</strong>
            </div>
            <div className="contract-summary-item">
              <small>PROJECT PROGRESS</small>
              <strong>{completed}/{data.milestones.length} milestones</strong>
            </div>
          </section>

          <section className="detail-card">
            <div className="applicant-heading">
              <div>
                <span className="eyebrow">YOUR NEXT STEPS</span>
                <h2>Project milestones</h2>
                <p>Follow this plan to keep the project moving.</p>
              </div>
              <button className="filter-button" onClick={load}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            <div className="milestone-list">
              {data.milestones.map((m, i) => (
                <article className="milestone-item" key={m.id}>
                  <div className={`milestone-marker ${
                    m.status === "Completed" ? "done" :
                    m.status === "In Progress" ? "active" : ""
                  }`}>
                    {m.status === "Completed" ? <CheckCircle2 size={17} /> : i + 1}
                  </div>

                  <div className="milestone-content">
                    <div className="milestone-title-row">
                      <h3>{m.title}</h3>
                      <span className={`status-pill ${
                        String(m.status).toLowerCase().replace(" ", "-")
                      }`}>
                        {m.status}
                      </span>
                    </div>

                    <p>{m.description}</p>

                    <div className="milestone-facts">
                      <span><Clock3 size={13} /> Due {String(m.dueDate).slice(0, 10)}</span>
                      <strong>₹{Number(m.amount).toLocaleString("en-IN")}</strong>
                    </div>

                    {data.role === "Freelancer" && m.status === "Pending" ? (
                      <button className="button milestone-action"
                        disabled={busy === m.id}
                        onClick={() => update(m, "In Progress")}>
                        {busy === m.id ? "Updating..." : "Start milestone"}
                      </button>
                    ) : data.role === "Freelancer" && m.status === "In Progress" ? (
                      <button className="button milestone-action"
                        disabled={busy === m.id}
                        onClick={() => update(m, "Submitted")}>
                        <Send size={14} /> Submit for client review
                      </button>
                    ) : client && m.status === "Submitted" ? (
                      <button className="button milestone-action"
                        disabled={busy === m.id}
                        onClick={() => update(m, "Completed")}>
                        <CheckCircle2 size={14} /> Approve milestone
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>

            {notice && <p className="workflow-notice" role="status">{notice}</p>}

            {c.status === "Completed" && (
              <div className="completion-banner">
                <CheckCircle2 size={22} />
                <div>
                  <strong>Project completed!</strong>
                  <p>All milestones have been approved. You can now exchange final feedback and reviews.</p>
                </div>
              </div>
            )}
          </section>

          {c.status === "Completed" && client && (
            <section className="detail-card">
              <span className="eyebrow">CLIENT FEEDBACK</span>
              <h2>Rate your freelancer</h2>
              <p>Share your experience working on this project.</p>

              {reviewLoading ? (
                <p>Loading review...</p>
              ) : review ? (
                <div className="completion-banner">
                  <CheckCircle2 size={22} />
                  <div>
                    <strong>Review submitted</strong>
                    <p>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)} ({review.rating}/5)</p>
                    {review.reviewText && <p>{review.reviewText}</p>}
                    <small>Review date: {String(review.reviewDate).slice(0, 10)}</small>
                  </div>
                </div>
              ) : canReview ? (
                <form onSubmit={submitReview} className="review-form">
                  <label><strong>Your rating</strong></label>
                  <div style={{ display: "flex", gap: "8px", margin: "12px 0" }}>
                    {[1, 2, 3, 4, 5].map(value => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        aria-label={`Rate ${value} out of 5`}
                        aria-pressed={rating === value}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: "30px",
                          color: value <= rating ? "#e5a000" : "#999",
                          padding: "2px"
                        }}
                      >
                        ★
                      </button>
                    ))}
                    <strong style={{ alignSelf: "center" }}>{rating}/5</strong>
                  </div>

                  <label htmlFor="reviewText"><strong>Written feedback</strong></label>
                  <textarea
                    id="reviewText"
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                    placeholder="Describe your experience with this freelancer..."
                    maxLength={2000}
                    rows={4}
                    style={{ width: "100%", marginTop: "10px" }}
                  />

                  <button className="button milestone-action"
                    type="submit" disabled={reviewBusy}>
                    <Send size={14} />
                    {reviewBusy ? "Submitting..." : "Submit review"}
                  </button>
                </form>
              ) : (
                <p className="muted">
                  {reviewError || "A review is not available for this contract."}
                </p>
              )}

              {reviewError && <p className="workflow-notice" role="alert">{reviewError}</p>}
            </section>
          )}
        </div>

        <aside className="contract-side-column">
          <section className="detail-card">
            <span className="eyebrow">PROJECT CONTACT</span>
            <h2>{client ? c.freelancerName : c.clientName}</h2>
            <p className="muted">{client ? "Your hired freelancer" : "Your client"}</p>
            <Link className="button full-button" href="/messages">
              <MessageSquare size={15} /> Open messages
            </Link>
            <div className="aside-rule" />
            <p className="tiny-note">
              <ShieldCheck size={13} /> Contract access is restricted to its two participants.
            </p>
          </section>

          <section className="detail-card">
            <span className="eyebrow">PROJECT CHECKLIST</span>
            <p>1. Review the scope and delivery plan.</p>
            <p>2. Use messages to clarify requirements.</p>
            <p>3. Submit each milestone for review.</p>
            <p>4. Client approves milestones to complete the project.</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
