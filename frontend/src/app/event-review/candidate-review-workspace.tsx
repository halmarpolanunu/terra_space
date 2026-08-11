"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { FramedPanel } from "@/components/framed-panel";
import { PageHeader } from "@/components/page-header";
import { ReadOnlyBridgeNotice } from "@/components/read-only-bridge-notice";
import { listBridgeCandidateReviews, type BridgeCandidateReview } from "@/lib/bridge-api";

const MAIN_ISSUE_LABELS: Record<BridgeCandidateReview["main_issue_status"], string> = {
  MAIN_ISSUE_FOUND: "Main issue found",
  NO_MAIN_ISSUE: "No main issue",
  FAILED: "Main issue detection failed",
};

const CANDIDATE_LABELS: Record<BridgeCandidateReview["event_detection_status"], string> = {
  EVENT_CANDIDATES_FOUND: "Candidates found",
  NO_EVENT_CANDIDATE: "No candidates",
  NOT_RUN: "Not run (no main issue)",
  FAILED: "Candidate detection failed",
};

// Read-only Phase 2 pipeline output: one main issue plus its event candidates per source, with
// no approve/reject/add-event/duplicate actions. See
// project-knowledge/plans/2026-08-11-supabase-read-only-bridge-design.md.
export function CandidateReviewWorkspace() {
  const [reviews, setReviews] = useState<BridgeCandidateReview[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listBridgeCandidateReviews()
      .then((result) => {
        setReviews(result);
        setIndex(0);
      })
      .catch((fetchError: Error) => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, []);

  const current = reviews[index];

  return (
    <AppShell currentPath="/event-review">
    <section aria-labelledby="event-review-title" className="event-review-page">
      <PageHeader
        description="Read-only Phase 2 pipeline output: the main issue and event candidates detected for each source, before any final event is created."
        eyebrow="Read-only Supabase preview"
        title="Event Review"
        titleId="event-review-title"
      />
      <ReadOnlyBridgeNotice />
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p>Loading pipeline results…</p>
      ) : reviews.length === 0 ? (
        <FramedPanel>
          <p>No sources have a Phase 2 result yet.</p>
          <p className="event-review-empty-hint">
            Run the pipeline against a source in n8n, then check back here.
          </p>
          <Link className="btn btn-primary" href="/documents">
            Open Sources
          </Link>
        </FramedPanel>
      ) : (
        <>
          <div className="review-bar">
            <span className="review-bar-title">Event Review</span>
            <span className="review-bar-progress">
              Source {index + 1} of {reviews.length}
            </span>
            <div className="review-bar-actions">
              <button
                className="btn"
                disabled={index === 0}
                onClick={() => setIndex((value) => value - 1)}
                type="button"
              >
                Prev
              </button>
              <button
                className="btn"
                disabled={index >= reviews.length - 1}
                onClick={() => setIndex((value) => value + 1)}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
          {current && <CandidateReviewCard review={current} />}
        </>
      )}
    </section>
    </AppShell>
  );
}

function CandidateReviewCard({ review }: { review: BridgeCandidateReview }) {
  return (
    <div className="panel review-event-card">
      <div className="panel-heading">
        <h2 className="panel-title">{review.source_title}</h2>
        <span className="document-meta">
          Processed {new Date(review.processed_at).toLocaleString()}
        </span>
      </div>

      <div className="field">
        <span className="field-label">Main issue</span>
        <p>{MAIN_ISSUE_LABELS[review.main_issue_status]}</p>
        {review.main_issue && (
          <>
            <p>
              <strong>{review.main_issue.label}</strong>
            </p>
            <p>{review.main_issue.summary}</p>
            <p className="event-read-only-note">
              “{review.main_issue.evidence_quote}”
              {review.main_issue.quote_grounded === false && " (not grounded in the source text)"}
            </p>
          </>
        )}
      </div>

      <div className="field">
        <span className="field-label">Event candidates</span>
        <p>{CANDIDATE_LABELS[review.event_detection_status]}</p>
        {review.event_candidates.length > 0 && (
          <ul className="document-list">
            {review.event_candidates.map((candidate, candidateIndex) => (
              <li className="document-row" key={candidateIndex}>
                <div className="document-row-main">
                  <span className="document-title">{candidate.working_title}</span>
                  <span className="document-meta">
                    {candidate.classification ?? "Unclassified"}
                    {candidate.entities.length > 0 ? ` · ${candidate.entities.join(", ")}` : ""}
                  </span>
                  <p>{candidate.phenomenon}</p>
                  <p className="event-read-only-note">
                    “{candidate.evidence_quote}”
                    {candidate.quote_grounded === false && " (not grounded in the source text)"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
