
"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  Star
} from "lucide-react";

type ContractData = {
  role: "Client" | "Freelancer";
  contract: any;
  milestones: any[];
  review: {
    id: number;
    rating: number;
    comment: string | null;
    createdAt: string;
  } | null;
};

export function ContractDetailWorkspace({
  contractId
}: {
  contractId: number;
}) {
  const [data, setData] = useState<ContractData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);

  const router = useRouter();

  async function load() {
    setLoading(true);
    setError("");

    try {
      const r = await fetch(`/api/contracts/${contractId}`, {
        cache: "no-store"
      });

      const d = await r.json();

      if (!r.ok) {
        throw new Error(d.message || "Could not load contract");
      }

      setData(d);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load contract"
      );
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
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          milestoneId: m.id,
          status
        })
      });

      const d = await r.json();

      if (!r.ok) {
        throw new Error(d.message || "Could not update milestone");
      }

      setNotice(d.message);
      await load();
      router.refresh();
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "Could not update milestone"
      );
    } finally {
      setBusy(null);
    }
  }

  async function submitReview(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (rating < 1 || rating > 5) {
      setNotice("Please select a rating.");
      return;
    }

    setReviewBusy(true);
    setNotice("");

    try {
      const r = await fetch(`/api/contracts/${contractId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          rating,
          comment
        })
      });

      const d = await r.json();

      if (!r.ok) {
        throw new Error(d.message || "Could not submit review");
      }

      setNotice(d.message);
      setRating(0);
      setComment("");

      await load();
      router.refresh();
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "Could not submit review"
      );
    } finally {
      setReviewBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="container contract-detail-page">
        <div className="empty-state">
          Loading your project workspace…
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="container contract-detail-page">
        <div className="empty-state">
          {error || "Contract unavailable"}
          <p>
            <Link href="/contracts">Back to contracts</Link>
          </p>
        </div>
      </main>
    );
  }

  const c = data.contract;
  const client = data.role === "Client";

  const completed = data.milestones.filter(
    (m) => m.status === "Completed"
  ).length;

  return (
    <main className="container contract-detail-page">

      <style jsx>{`
        .freelancer-review-card {
          padding: 30px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          border-radius: 18px;
          background: linear-gradient(145deg, #151d30, #101827);
        }

        .review-heading {
          margin-bottom: 28px;
        }

        .review-heading h2 {
          margin: 12px 0 8px;
          color: #f8fafc;
          font-size: 25px;
          font-weight: 700;
        }

        .review-heading p {
          max-width: 520px;
          color: #a9b8d0;
          font-size: 14px;
          line-height: 1.7;
        }

        .review-form {
          display: flex;
          flex-direction: column;
          gap: 27px;
        }

        .review-field {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
          width: 100%;
        }

        .review-field label {
          color: #f1f5f9;
          font-size: 15px;
          font-weight: 600;
        }

        .review-field label span {
          color: #94a3b8;
          font-weight: 400;
        }

        .review-star-picker {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .review-star-button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5px;
          border: none;
          border-radius: 9px;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          transition: transform 0.2s, color 0.2s;
        }

        .review-star-button:hover {
          color: #f5a623;
          transform: scale(1.15);
        }

        .review-star-button.selected {
          color: #f5a623;
        }

        .review-star-button:focus-visible {
          outline: 2px solid #a855f7;
          outline-offset: 3px;
        }

        .review-rating-hint {
          color: #a9b8d0;
          font-size: 13px;
        }

        .review-textarea {
          display: block;
          width: 100%;
          min-height: 135px;
          padding: 16px;
          resize: vertical;
          border: 1px solid #344158;
          border-radius: 12px;
          outline: none;
          background: #0b1220;
          color: #f8fafc;
          font: inherit;
          font-size: 14px;
          line-height: 1.6;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }

        .review-textarea::placeholder {
          color: #718096;
        }

        .review-textarea:focus {
          border-color: #9333ea;
          box-shadow: 0 0 0 3px rgba(147, 51, 234, 0.15);
        }

        .review-character-count {
          align-self: flex-end;
          color: #8493aa;
          font-size: 12px;
        }

        .review-submit-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: fit-content;
          min-width: 190px;
          padding: 14px 23px;
          border: none;
          border-radius: 11px;
          background: linear-gradient(100deg, #9333ea, #6d35ed);
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, opacity 0.2s;
        }

        .review-submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .review-submit-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .review-display {
          padding: 22px;
          border: 1px solid rgba(34, 197, 94, 0.2);
          border-radius: 14px;
          background: rgba(34, 197, 94, 0.05);
        }

        .review-display-heading {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          color: #4ade80;
        }

        .review-stars-display {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          color: #f5a623;
        }

        .review-stars-display strong {
          margin-left: 8px;
          color: #f8fafc;
        }

        .review-comment {
          margin-top: 18px;
          color: #d4deed;
          line-height: 1.7;
          overflow-wrap: anywhere;
        }

        .review-thank-you {
          display: block;
          margin-top: 16px;
          color: #86efac;
          font-size: 13px;
        }

        .review-waiting {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #a9b8d0;
        }

        .review-waiting p {
          margin: 0;
        }

        .review-notice {
          margin-top: 18px;
          padding: 12px 15px;
          border: 1px solid rgba(168, 85, 247, 0.25);
          border-radius: 10px;
          background: rgba(147, 51, 234, 0.08);
          color: #d8b4fe;
          font-size: 14px;
        }

        @media (max-width: 600px) {
          .freelancer-review-card {
            padding: 20px;
          }

          .review-heading h2 {
            font-size: 21px;
          }

          .review-star-picker {
            gap: 5px;
          }

          .review-star-button :global(svg) {
            width: 29px;
            height: 29px;
          }

          .review-submit-button {
            width: 100%;
          }
        }
      `}</style>

      <Link href="/contracts" className="back-link">
        <ArrowLeft size={15} />
        Back to contracts
      </Link>

      <section className="contract-hero">
        <div>
          <span className="eyebrow">
            GIGSY PROJECT WORKSPACE · CONTRACT #{c.id}
          </span>

          <h1>{c.title}</h1>

          <p>
            {client ? "You are working with" : "You have been hired by"}{" "}
            <strong>
              {client ? c.freelancerName : c.clientName}
            </strong>
          </p>
        </div>

        <span className={`status-pill ${String(c.status).toLowerCase()}`}>
          {c.status}
        </span>
      </section>

      <div className="contract-detail-grid">

        <div className="contract-main-column">

          {/* CONTRACT SUMMARY */}

          <section className="detail-card contract-summary">

            <div className="contract-summary-item">
              <small>AGREED PROJECT BUDGET</small>
              <strong>
                ₹{Number(c.agreedAmount).toLocaleString("en-IN")}
              </strong>
            </div>

            <div className="contract-summary-item">
              <small>DELIVERY ESTIMATE</small>
              <strong>{c.deliveryDays} days</strong>
            </div>

            <div className="contract-summary-item">
              <small>PROJECT PROGRESS</small>
              <strong>
                {completed}/{data.milestones.length} milestones
              </strong>
            </div>

          </section>

          {/* PROJECT MILESTONES */}

          <section className="detail-card">

            <div className="applicant-heading">
              <div>
                <span className="eyebrow">YOUR NEXT STEPS</span>
                <h2>Project milestones</h2>
                <p>Follow this plan to keep the project moving.</p>
              </div>

              <button className="filter-button" onClick={load}>
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>

            <div className="milestone-list">

              {data.milestones.map((m, i) => (
                <article className="milestone-item" key={m.id}>

                  <div
                    className={`milestone-marker ${
                      m.status === "Completed"
                        ? "done"
                        : m.status === "In Progress"
                        ? "active"
                        : ""
                    }`}
                  >
                    {m.status === "Completed"
                      ? <CheckCircle2 size={17} />
                      : i + 1}
                  </div>

                  <div className="milestone-content">

                    <div className="milestone-title-row">
                      <h3>{m.title}</h3>

                      <span
                        className={`status-pill ${String(m.status)
                          .toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        {m.status}
                      </span>
                    </div>

                    <p>{m.description}</p>

                    <div className="milestone-facts">
                      <span>
                        <Clock3 size={13} />
                        Due {String(m.dueDate).slice(0, 10)}
                      </span>

                      <strong>
                        ₹{Number(m.amount).toLocaleString("en-IN")}
                      </strong>
                    </div>

                    {data.role === "Freelancer" &&
                    m.status === "Pending" ? (
                      <button
                        className="button milestone-action"
                        disabled={busy === m.id}
                        onClick={() => update(m, "In Progress")}
                      >
                        {busy === m.id ? "Updating…" : "Start milestone"}
                      </button>
                    ) : data.role === "Freelancer" &&
                      m.status === "In Progress" ? (
                      <button
                        className="button milestone-action"
                        disabled={busy === m.id}
                        onClick={() => update(m, "Submitted")}
                      >
                        <Send size={14} />
                        Submit for client review
                      </button>
                    ) : client && m.status === "Submitted" ? (
                      <button
                        className="button milestone-action"
                        disabled={busy === m.id}
                        onClick={() => update(m, "Completed")}
                      >
                        <CheckCircle2 size={14} />
                        Approve milestone
                      </button>
                    ) : null}

                  </div>
                </article>
              ))}

            </div>

            {notice && (
              <p className="workflow-notice" role="status">
                {notice}
              </p>
            )}

            {c.status === "Completed" && (
              <div className="completion-banner">
                <CheckCircle2 size={22} />
                <div>
                  <strong>Project completed!</strong>
                  <p>
                    All milestones have been approved.
                    You can now exchange final feedback and reviews.
                  </p>
                </div>
              </div>
            )}

          </section>

          {/* FREELANCER REVIEW */}

          {c.status === "Completed" && (
            <section className="detail-card freelancer-review-card">

              <div className="review-heading">
                <span className="eyebrow">PROJECT FEEDBACK</span>

                <h2>Freelancer Review</h2>

                <p>
                  {client
                    ? `Share your experience working with ${c.freelancerName}. Your feedback helps build trust in the Gigsy community.`
                    : "See the feedback shared by your client."}
                </p>
              </div>

              {data.review ? (

                <div className="review-display">

                  <div className="review-display-heading">
                    <CheckCircle2 size={20} />
                    <strong>Thank you for your feedback!</strong>
                  </div>

                  <div className="review-stars-display">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={25}
                        fill={
                          star <= Number(data.review!.rating)
                            ? "currentColor"
                            : "none"
                        }
                        color={
                          star <= Number(data.review!.rating)
                            ? "#F5A623"
                            : "#64748b"
                        }
                      />
                    ))}

                    <strong>{data.review.rating}/5</strong>
                  </div>

                  {data.review.comment && (
                    <p className="review-comment">
                      "{data.review.comment}"
                    </p>
                  )}

                  <span className="review-thank-you">
                    Your review has been successfully published.
                  </span>

                </div>

              ) : client ? (

                <form onSubmit={submitReview} className="review-form">

                  <div className="review-field">
                    <label>Your rating</label>

                    <div className="review-star-picker">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className={`review-star-button ${
                            star <= rating ? "selected" : ""
                          }`}
                          aria-label={`Rate ${star} out of 5 stars`}
                          aria-pressed={rating === star}
                          onClick={() => setRating(star)}
                        >
                          <Star
                            size={34}
                            fill={
                              star <= rating ? "currentColor" : "none"
                            }
                          />
                        </button>
                      ))}
                    </div>

                    <span className="review-rating-hint">
                      {rating === 0
                        ? "Select your overall experience"
                        : `${rating} out of 5 stars selected`}
                    </span>
                  </div>

                  <div className="review-field">
                    <label htmlFor="review-comment">
                      Write your feedback <span>(Optional)</span>
                    </label>

                    <textarea
                      id="review-comment"
                      className="review-textarea"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      maxLength={2000}
                      rows={5}
                      placeholder="Tell us about your experience working with this freelancer..."
                    />

                    <span className="review-character-count">
                      {comment.length}/2000 characters
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="review-submit-button"
                    disabled={reviewBusy || rating === 0}
                  >
                    {reviewBusy
                      ? "Submitting..."
                      : "Submit your review"}

                    {!reviewBusy && <Send size={16} />}
                  </button>

                  {notice && (
                    <p className="review-notice" role="status">
                      {notice}
                    </p>
                  )}

                </form>

              ) : (

                <div className="review-waiting">
                  <Clock3 size={19} />
                  <p>Waiting for the client to submit a review.</p>
                </div>

              )}

            </section>
          )}

        </div>

        {/* SIDEBAR */}

        <aside className="contract-side-column">

          <section className="detail-card">

            <span className="eyebrow">PROJECT CONTACT</span>

            <h2>
              {client ? c.freelancerName : c.clientName}
            </h2>

            <p className="muted">
              {client ? "Your hired freelancer" : "Your client"}
            </p>

            <Link className="button full-button" href="/messages">
              <MessageSquare size={15} />
              Open messages
            </Link>

            <div className="aside-rule" />

            <p className="tiny-note">
              <ShieldCheck size={13} />
              Contract access is restricted to its two participants.
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
