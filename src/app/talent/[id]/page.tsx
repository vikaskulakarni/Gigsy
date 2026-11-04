"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, ArrowUpRight, Star, Clock, Briefcase,
  CheckCircle2, MessageCircle, UserRound
} from "lucide-react";

type TalentProfile = {
  id: number;
  name: string;
  headline?: string;
  bio?: string;
  experience?: number;
  hourlyRate?: number;
  availability?: string;
  portfolioUrl?: string;
  profilePicture?: string;
  rating?: number;
  reviewCount?: number;
  skills: {
    name: string;
    proficiency: string;
    yearsExperience?: number;
  }[];
  reviews: {
    id: number;
    rating: number;
    reviewText?: string;
    reviewDate: string;
    reviewerName: string;
  }[];
};

export default function TalentProfilePage() {
  const params = useParams();
  const id = params.id as string;

  const [profile, setProfile] = useState<TalentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    async function loadProfile() {
      try {
        const response = await fetch(`/api/talent/${encodeURIComponent(id)}`, {
          cache: "no-store"
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load profile.");
        }

        setProfile(data.talent);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Request failed.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [id]);

  if (loading) {
    return <main className="container inner-page"><div className="empty-state">Loading freelancer profile...</div></main>;
  }

  if (error || !profile) {
    return (
      <main className="container inner-page">
        <div className="empty-panel">
          <h2>Profile unavailable</h2>
          <p>{error || "This freelancer could not be found."}</p>
          <Link href="/talent" className="button" style={{ marginTop: 18 }}>
            Back to talent directory
          </Link>
        </div>
      </main>
    );
  }

  const initials = profile.name
    .split(" ")
    .map(part => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <main className="container detail-page">
      <Link href="/talent" className="back-link">
        <ArrowLeft size={15} /> Back to Talent Directory
      </Link>

      <section className="detail-card talent-profile-hero">
        <div className="detail-title-row">
          <img
            className="talent-avatar talent-profile-avatar"
            src={profile.profilePicture || `/avatars/avatar-${(Math.abs(Number(profile.id)) % 10) + 1}.png`}
            alt={`${profile.name} profile avatar`}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/avatars/avatar-1.png";
            }}
          />

          <div>
            <span className="eyebrow">FREELANCER PROFILE</span>
            <h1>{profile.name}</h1>
            <p>{profile.headline || "Independent Professional"}</p>
          </div>
        </div>

        <div className="detail-facts">
          <span><Star size={15} fill="currentColor" /> {Number(profile.rating || 0).toFixed(1)} ({profile.reviewCount || 0} reviews)</span>
          <span><Briefcase size={15} /> {profile.experience || 0} years experience</span>
          <span><CheckCircle2 size={15} /> {profile.availability || "Available"}</span>
        </div>

        <div className="talent-profile-actions">
          <Link href={`/messages?with=${profile.id}`} className="button">
            <MessageCircle size={16} /> Contact Freelancer <ArrowUpRight size={15} />
          </Link>

          {profile.portfolioUrl && (
            <a href={profile.portfolioUrl} target="_blank" rel="noreferrer" className="outline-link">
              View Portfolio <ArrowUpRight size={14} />
            </a>
          )}
        </div>
      </section>

      <div className="detail-layout">
        <div>
          <section className="detail-card">
            <h2>About {profile.name.split(" ")[0]}</h2>
            <p>{profile.bio || "No biography has been added yet."}</p>
          </section>

          <section className="detail-card">
            <h2>Skills & Expertise</h2>
            <div className="talent-profile-skills">
              {profile.skills.map(skill => (
                <div className="talent-profile-skill" key={skill.name}>
                  <div>
                    <strong>{skill.name}</strong>
                    <span>{skill.proficiency}</span>
                  </div>
                  {skill.yearsExperience != null && (
                    <small>{skill.yearsExperience} years</small>
                  )}
                </div>
              ))}
              {profile.skills.length === 0 && (
                <p className="muted">No skills have been listed yet.</p>
              )}
            </div>
          </section>

          <section className="detail-card">
            <div className="section-heading compact">
              <div>
                <h2>Client Reviews</h2>
                <p>Feedback from completed projects</p>
              </div>
              <span className="count-label">{profile.reviewCount || 0} REVIEWS</span>
            </div>

            {profile.reviews.length === 0 ? (
              <p className="muted">No reviews yet.</p>
            ) : (
              <div className="talent-review-list">
                {profile.reviews.map(review => (
                  <article className="talent-review" key={review.id}>
                    <div className="talent-review-top">
                      <div className="talent-review-person">
                        <span className="avatar blue">
                          {review.reviewerName?.charAt(0).toUpperCase() || <UserRound size={15} />}
                        </span>
                        <div>
                          <strong>{review.reviewerName}</strong>
                          <small>{String(review.reviewDate).slice(0, 10)}</small>
                        </div>
                      </div>

                      <span className="talent-review-rating">
                        <Star size={13} fill="currentColor" /> {review.rating}/5
                      </span>
                    </div>

                    <p>{review.reviewText || "No written feedback provided."}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="detail-aside">
          <section className="detail-card">
            <span className="eyebrow">FREELANCER RATE</span>
            <div className="budget-heading">
              ₹{Number(profile.hourlyRate || 0).toLocaleString("en-IN")}
              <span style={{ fontSize: 12, color: "#9aa7c2" }}>/hr</span>
            </div>
            <div className="aside-rule" />
            <p><Clock size={14} style={{ verticalAlign: "middle", marginRight: 7 }} /> {profile.availability || "Availability not specified"}</p>
            <p><Briefcase size={14} style={{ verticalAlign: "middle", marginRight: 7 }} /> {profile.experience || 0} years of experience</p>
            <Link href={`/messages?with=${profile.id}`} className="button full-button">
              Contact Freelancer <ArrowUpRight size={15} />
            </Link>
            <p className="tiny-note">Start a conversation about your project.</p>
          </section>
        </aside>
      </div>
    </main>
  );
}


