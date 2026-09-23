"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { listBridgeCandidateReviews, listBridgeSources, listPhase5Events, type BridgeCandidateReview, type BridgeSource, type Phase5Event } from "@/lib/bridge-api";
import { summarizePipelineStages } from "./pipeline-stage-summary";
import styles from "./prepare.module.css";

type Load<T> = { kind: "loading" } | { kind: "error" } | { kind: "ready"; data: T };

export function PrepareWorkspace() {
  const [sources, setSources] = useState<Load<BridgeSource[]>>({ kind: "loading" });
  const [reviews, setReviews] = useState<Load<BridgeCandidateReview[]>>({ kind: "loading" });
  const [events, setEvents] = useState<Load<Phase5Event[]>>({ kind: "loading" });
  const load = useCallback(() => {
    setSources({ kind: "loading" }); setReviews({ kind: "loading" }); setEvents({ kind: "loading" });
    void listBridgeSources().then((data) => setSources({ kind: "ready", data })).catch(() => setSources({ kind: "error" }));
    void listBridgeCandidateReviews().then((data) => setReviews({ kind: "ready", data })).catch(() => setReviews({ kind: "error" }));
    void listPhase5Events().then((data) => setEvents({ kind: "ready", data })).catch(() => setEvents({ kind: "error" }));
  }, []);
  useEffect(() => {
    void listBridgeSources().then((data) => setSources({ kind: "ready", data })).catch(() => setSources({ kind: "error" }));
    void listBridgeCandidateReviews().then((data) => setReviews({ kind: "ready", data })).catch(() => setReviews({ kind: "error" }));
    void listPhase5Events().then((data) => setEvents({ kind: "ready", data })).catch(() => setEvents({ kind: "error" }));
  }, []);
  const stages = summarizePipelineStages(sources.kind === "ready" ? sources.data : [], reviews.kind === "ready" ? reviews.data : [], events.kind === "ready" ? events.data : []);
  const availability = [sources, reviews, reviews, events, events, events];
  return <AppShell currentPath="/prepare"><div className={styles.prepare}>
    <header className={styles.header}><p className="eyebrow">Terra Space / Prepare</p><h1>From source to signal.</h1><p>Track what the local pipeline produced and where attention is needed. This view does not change pipeline records.</p></header>
    <div className={styles.meta}><span>READ-ONLY PIPELINE VIEW</span><Link href="/documents">Sources</Link><Link href="/sense/event-types">Event taxonomy</Link><Link href="/sense/actors">Actors</Link></div>
    <div className={styles.flow} aria-label="Pipeline progression">{stages.map((stage, index) => <section className={styles.stage} key={stage.id}>
      <span className={styles.index}>{String(index + 1).padStart(2, "0")} / 06</span><h2>{stage.label}</h2><p>{stage.description}</p>
      {availability[index].kind === "loading" ? <p role="status">Loading…</p> : availability[index].kind === "error" ? <p className={styles.error}>Count unavailable</p> : <div className={styles.count}><strong>{stage.total}</strong><span>{stage.scope}</span></div>}
      {availability[index].kind === "ready" && <p className={styles.attention}>{stage.attention} need attention</p>}
      <Link href={stage.href}>Inspect {stage.label.toLowerCase()} →</Link>
    </section>)}</div>
    <section className={styles.attentionPanel}><h2>Attention and next steps</h2>
      {sources.kind === "error" && <p role="alert">Could not load sources.</p>}
      {reviews.kind === "error" && <p role="alert">Could not load candidate reviews.</p>}
      {events.kind === "error" && <p role="alert">Could not load Phase 5 events.</p>}
      {sources.kind === "ready" && sources.data.filter((source) => source.processing_status === "failed").map((source) => <p key={source.id}><strong>{source.title}</strong>: source processing failed. <Link href="/documents">Inspect source</Link></p>)}
      {events.kind === "ready" && events.data.filter((event) => event.phase4_status !== "PREPARED" || event.classification.status !== "CLASSIFIED" || event.qualification.status !== "FINAL").slice(0, 8).map((event) => <p key={event.id}><strong>{event.title}</strong>: {event.phase4_status !== "PREPARED" ? "event facts incomplete" : event.classification.status !== "CLASSIFIED" ? "event type unclassified" : event.qualification.status === "NOT_FINAL" ? "not final" : "qualification pending"}. <Link href={`/explore?event=${encodeURIComponent(event.id)}`}>Inspect event</Link></p>)}
      <p className={styles.note}>Current Phase 5 corrections happen in the pipeline. <Link href="/event-review">Earlier Event Review</Link> remains available for older records.</p>
      {(sources.kind === "error" || reviews.kind === "error" || events.kind === "error") && <button type="button" onClick={load}>Retry loading</button>}
    </section>
    {reviews.kind === "ready" && <section className={styles.attentionPanel} id="candidates"><h2>Retained candidate reviews</h2>
      {reviews.data.length === 0 ? <p>No candidate reviews retained yet.</p> : reviews.data.map((review) => <div key={review.phase1_source_id}>
        <h3>{review.source_title}</h3><p>Main Issue: {review.main_issue_status.replaceAll("_", " ")} · Event detection: {review.event_detection_status.replaceAll("_", " ")}</p>
        {review.event_candidates.length > 0 && <ul>{review.event_candidates.map((candidate, index) => <li key={`${review.phase1_source_id}-${index}`}>{candidate.working_title || "Untitled candidate"}</li>)}</ul>}
      </div>)}
    </section>}
  </div></AppShell>;
}
