"use client";

import { useState } from "react";
import Link from "next/link";

type Match = {
  score: number;
  gig: {
    id: number;
    title: string;
    budgetMin: number;
    budgetMax: number;
  };
};

export function SemanticSearch() {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice("");
    setMatches([]);

    try {
      const response = await fetch("/api/match/gigs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Semantic search unavailable");
      }

      setMatches(data.matches || []);

      if (!data.matches?.length) {
        setNotice("No semantic matches found. Index open gigs first.");
      }
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Search failed"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="semantic-box">
      <span className="eyebrow">VECTOR INTELLIGENCE</span>

      <h2>Find work by meaning, not just keywords</h2>

      <p>
        Describe your skills or ideal project. ChromaDB ranks
        related opportunities by semantic similarity.
      </p>

      <form onSubmit={search} className="semantic-form">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. automate cloud deployments using containers"
          required
          minLength={3}
          maxLength={2000}
        />

        <button className="button" disabled={busy}>
          {busy ? "Matching..." : "Find matches"}
        </button>
      </form>

      {notice && <p role="status">{notice}</p>}

      {matches.map((match) => (
        <Link
          key={match.gig.id}
          href={`/gigs/${match.gig.id}`}
          className="semantic-result"
        >
          <strong>{match.gig.title}</strong>
          <span>
            {Math.round(match.score * 100)}% similarity
          </span>
        </Link>
      ))}
    </section>
  );
}