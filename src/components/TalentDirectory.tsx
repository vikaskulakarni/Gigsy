"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Star, ArrowUpRight, SlidersHorizontal, RotateCcw } from "lucide-react";

type Talent = {
  id: number;
  name: string;
  headline?: string;
  bio?: string;
  hourlyRate?: number;
  rating?: number;
  reviews?: number;
  skills?: string[];
};

type EligibleContract = {
  contractId: number;
  freelancerId: number;
  gigTitle: string;
};



export function TalentDirectory() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Talent[]>([]);
  const [eligible, setEligible] = useState<EligibleContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewError, setReviewError] = useState("");

  const [minimumRating, setMinimumRating] = useState("0");
  const [maximumRate, setMaximumRate] = useState("all");
  const [selectedSkill, setSelectedSkill] = useState("all");
  const [sortBy, setSortBy] = useState("rating");

  async function load(query = q) {
    setLoading(true);
    setError("");

    try {
      const r = await fetch(`/api/talent?q=${encodeURIComponent(query)}`, {
        cache: "no-store"
      });
      const d = await r.json();

      if (!r.ok) throw new Error(d.message || "Could not load talent");

      setItems(d.talent || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadEligibleReviews() {
    try {
      const r = await fetch("/api/reviews", { cache: "no-store" });
      if (!r.ok) {
        setEligible([]);
        return;
      }

      const d = await r.json();
      setEligible(d.eligibleContracts || []);
    } catch {
      setEligible([]);
    }
  }

  useEffect(() => {
    load("");
    loadEligibleReviews();
  }, []);

  const allSkills = useMemo(
    () => Array.from(new Set(items.flatMap(t => t.skills || []))).sort(),
    [items]
  );

  const filteredItems = useMemo(() => {
    const result = items.filter(t => {
      const score = Number(t.rating || 0);
      const rate = Number(t.hourlyRate || 0);

      return (
        score >= Number(minimumRating) &&
        (maximumRate === "all" || rate <= Number(maximumRate)) &&
        (selectedSkill === "all" || (t.skills || []).includes(selectedSkill))
      );
    });

    return result.sort((a, b) => {
      if (sortBy === "rating") {
        return Number(b.rating || 0) - Number(a.rating || 0);
      }
      if (sortBy === "reviews") {
        return Number(b.reviews || 0) - Number(a.reviews || 0);
      }
      if (sortBy === "price-low") {
        return Number(a.hourlyRate || Infinity) - Number(b.hourlyRate || Infinity);
      }
      if (sortBy === "price-high") {
        return Number(b.hourlyRate || 0) - Number(a.hourlyRate || 0);
      }
      return a.name.localeCompare(b.name);
    });
  }, [items, minimumRating, maximumRate, selectedSkill, sortBy]);

  function resetFilters() {
    setMinimumRating("0");
    setMaximumRate("all");
    setSelectedSkill("all");
    setSortBy("rating");
    setQ("");
    load("");
  }

  async function submitReview(contract: EligibleContract) {
    setSubmitting(true);
    setReviewError("");
    setReviewMessage("");

    try {
      const r = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId: contract.contractId,
          freelancerId: contract.freelancerId,
          rating,
          reviewText
        })
      });

      const d = await r.json();

      if (!r.ok) {
        throw new Error(d.message || "Could not submit review.");
      }

      setReviewMessage("Your review was submitted successfully.");
      setReviewText("");
      setEligible(prev =>
        prev.filter(item => item.contractId !== contract.contractId)
      );

      await load();
      await loadEligibleReviews();
    } catch (e) {
      setReviewError(
        e instanceof Error ? e.message : "Review submission failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container inner-page">
      <span className="eyebrow">TALENT DIRECTORY · EXPLORE EXPERTS</span>

      <div className="page-heading-row">
        <div>
          <h1>Find people who move work forward.</h1>
          <p>Discover independent specialists with the skills your next project needs.</p>
        </div>
      </div>

      <form
        className="directory-toolbar"
        onSubmit={e => {
          e.preventDefault();
          load();
        }}
      >
        <div className="directory-search-field">
          <Search size={17} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search name, skill or role..."
          />
          <button type="submit" className="button">Search</button>
        </div>

        <select
          aria-label="Filter by minimum rating"
          value={minimumRating}
          onChange={e => setMinimumRating(e.target.value)}
        >
          <option value="0">Any rating</option>
          <option value="3">3+ stars</option>
          <option value="4">4+ stars</option>
          <option value="4.5">4.5+ stars</option>
          <option value="5">5 stars</option>
        </select>

        <select
          aria-label="Filter by maximum hourly rate"
          value={maximumRate}
          onChange={e => setMaximumRate(e.target.value)}
        >
          <option value="all">Any hourly rate</option>
          <option value="800">Under ₹800/hr</option>
          <option value="1000">Under ₹1,000/hr</option>
          <option value="1200">Under ₹1,200/hr</option>
          <option value="1500">Under ₹1,500/hr</option>
        </select>

        <select
          aria-label="Filter by skill"
          value={selectedSkill}
          onChange={e => setSelectedSkill(e.target.value)}
        >
          <option value="all">All skills</option>
          {allSkills.map(skill => (
            <option value={skill} key={skill}>{skill}</option>
          ))}
        </select>

        <select
          aria-label="Sort freelancers"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
        >
          <option value="rating">Highest rated</option>
          <option value="reviews">Most reviewed</option>
          <option value="price-low">Price: low to high</option>
          <option value="price-high">Price: high to low</option>
          <option value="name">Name: A to Z</option>
        </select>

        <button type="button" className="talent-filter-reset" onClick={resetFilters}>
          <RotateCcw size={13} /> Reset filters
        </button>
      </form>

      <div className="directory-results-row">
        <div>
          <strong><SlidersHorizontal size={14} style={{ verticalAlign: "middle", marginRight: 7 }} />Discover talent</strong>
          <span style={{ marginLeft: 10 }}>{filteredItems.length} freelancers found</span>
        </div>
        <span>Sorted by {sortBy === "rating" ? "highest rating" : sortBy === "reviews" ? "most reviews" : sortBy === "price-low" ? "lowest rate" : sortBy === "price-high" ? "highest rate" : "name"}</span>
      </div>

      {loading ? (
        <div className="empty-state">Loading freelancer profiles from MySQL...</div>
      ) : error ? (
        <div className="empty-state">{error}</div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-panel">
          <h2>No matching freelancers</h2>
          <p>Try changing your search or adjusting the filters.</p>
          <button type="button" className="button" style={{ marginTop: 18 }} onClick={resetFilters}>
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="talent-grid">
          {filteredItems.map((t, index) => {
            const contract = eligible.find(
              item => Number(item.freelancerId) === Number(t.id)
            );

            const initials = String(t.name || "G")
              .split(" ")
              .map(x => x[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();

            const score = Number(t.rating || 0);
            const reviewCount = Number(t.reviews || 0);

            return (
              <article className="talent-card" key={t.id}>
                <div className="talent-card-head">
                  <img
                    className="talent-avatar"
                    src={`/avatars/avatar-${(Math.abs(Number(t.id)) % 10) + 1}.png`}
                    alt={`${t.name} profile avatar`}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/avatars/avatar-1.png";
                    }}
                  />
                  <span className="availability">AVAILABLE PROFILE</span>
                </div>

                <div className="talent-identity">
                  <div>
                    <h3>{t.name}</h3>
                    <p>{t.headline || "Independent professional"}</p>
                  </div>
                </div>

                <div className="talent-rating-badge">
                  <Star size={14} fill="currentColor" />
                  {score.toFixed(1)}
                  <small>({reviewCount} reviews)</small>
                </div>

                <p className="talent-card-description">
                  {t.bio || "This freelancer is building their Gigsy profile."}
                </p>

                <div className="talent-skills">
                  {(t.skills || []).map(s => (
                    <span className="skill-tag" key={s}>{s}</span>
                  ))}
                  {(!t.skills || t.skills.length === 0) && (
                    <span className="muted">Skills not added yet</span>
                  )}
                </div>

                <div className="talent-card-bottom">
                  <strong>
                    {t.hourlyRate
                      ? `₹${Number(t.hourlyRate).toLocaleString("en-IN")}/hr`
                      : "Rate not set"}
                  </strong>

                  <div className="talent-card-actions">
                    <Link
                      href={`/talent/${encodeURIComponent(t.id)}`}
                      className="talent-profile-link"
                    >
                      View Profile <ArrowUpRight size={14} />
                    </Link>

                    <Link
                      href={`/messages?with=${encodeURIComponent(t.id)}`}
                      className="outline-link"
                    >
                      Contact <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </div>

                {contract && (
                  <div className="review-form" style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border, #334155)" }}>
                    <h4>Rate your experience</h4>
                    <p className="muted">{contract.gigTitle}</p>

                    <div style={{ display: "flex", gap: 7, margin: "12px 0" }}>
                      {[1, 2, 3, 4, 5].map(value => (
                        <button
                          key={value}
                          type="button"
                          aria-label={`Rate ${value} stars`}
                          onClick={() => setRating(value)}
                          style={{
                            border: "none",
                            background: "transparent",
                            padding: 2,
                            cursor: "pointer",
                            color: value <= rating ? "#f59e0b" : "#94a3b8"
                          }}
                        >
                          <Star size={25} fill={value <= rating ? "currentColor" : "none"} />
                        </button>
                      ))}
                    </div>

                    <textarea
                      value={reviewText}
                      onChange={e => setReviewText(e.target.value)}
                      maxLength={2000}
                      placeholder="Share your experience with this freelancer..."
                      rows={3}
                      style={{ width: "100%", padding: 10, borderRadius: 8, marginBottom: 10 }}
                    />

                    <button
                      type="button"
                      className="button"
                      disabled={submitting}
                      onClick={() => submitReview(contract)}
                    >
                      {submitting ? "Submitting..." : "Submit review"}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {reviewMessage && (
        <p role="status" style={{ color: "#16a34a", marginTop: 16 }}>
          {reviewMessage}
        </p>
      )}

      {reviewError && (
        <p role="alert" style={{ color: "#ef4444", marginTop: 16 }}>
          {reviewError}
        </p>
      )}
    </main>
  );
}




