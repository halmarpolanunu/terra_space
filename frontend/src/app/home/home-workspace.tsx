"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { IssueGlobe } from "@/app/home/issue-globe";
import { listBridgeCandidateReviews, listPhase5Events, type BridgeCandidateReview, type Phase5Event } from "@/lib/bridge-api";
import { buildMainIssueStories } from "@/lib/main-issue-view-model";
import { buildIssueAtlas, type IssueAtlasPlace } from "@/lib/issue-atlas-model";
import styles from "./home.module.css";

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; events: Phase5Event[]; reviews: BridgeCandidateReview[] };

export function HomeWorkspace() {
  const presentation = useSearchParams().get("present") === "1";
  const [state, setState] = useState<State>({ kind: "loading" });
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [issueQuery, setIssueQuery] = useState("");
  const [sharedPlace, setSharedPlace] = useState<{ label: string; places: IssueAtlasPlace[] } | null>(null);

  const request = useCallback(() => {
    void Promise.all([listPhase5Events(), listBridgeCandidateReviews()])
      .then(([events, reviews]) => setState({ kind: "ready", events, reviews }))
      .catch(() => setState({ kind: "error" }));
  }, []);
  const load = useCallback(() => { setState({ kind: "loading" }); request(); }, [request]);
  useEffect(request, [request]);

  const stories = useMemo(() => state.kind === "ready" ? buildMainIssueStories(state.reviews, state.events) : [], [state]);
  const atlas = useMemo(() => state.kind === "ready" ? buildIssueAtlas(stories, state.events) : null, [stories, state]);
  const selectedIssue = stories.find((issue) => issue.sourceId === selectedIssueId) ?? stories[0];
  const selectedPlaces = atlas?.places.filter((place) => place.issueSourceId === selectedIssue?.sourceId) ?? [];
  const matchingIssues = issueQuery.trim()
    ? stories.filter((issue) => `${issue.label} ${issue.sourceTitle}`.toLocaleLowerCase().includes(issueQuery.trim().toLocaleLowerCase()))
    : [];
  const exploreHref = selectedIssue ? `/explore?issue=${encodeURIComponent(selectedIssue.sourceId)}` : "/explore";
  const maxTypeCount = Math.max(1, ...(atlas?.metrics.byType.map((item) => item.count) ?? []));

  function selectIssue(sourceId: string) {
    setSelectedIssueId(sourceId);
    setSharedPlace(null);
  }

  return <AppShell currentPath="/home" presentation={presentation}>
    <div className={styles.home}>
      <header className={styles.intro}>
        <div><p className={styles.scope}>Terra Space <span>/</span> Phase 2 Main Issues</p><h1>Read the world<br /><em>through the issue.</em></h1>
          <p>One source-grounded question opens the map. Follow its related places, then examine the events and evidence in Explore.</p></div>
        <div className={styles.actions}>{presentation ? <Link href="/home">Exit presentation</Link> : <Link href="/home?present=1">Presentation view ↗</Link>}</div>
      </header>

      {state.kind === "loading" && <p className={styles.notice} role="status">Loading Main Issues and related places…</p>}
      {state.kind === "error" && <div className={styles.notice} role="alert"><p>Could not load Main Issues and linked events.</p><button type="button" onClick={load}>Retry</button></div>}
      {state.kind === "ready" && (stories.length === 0 ? <div className={styles.notice}><p>No Phase 2 Main Issues yet.</p><p>They will appear after the local pipeline has produced a source-grounded Main Issue.</p><Link href="/prepare">Inspect pipeline ↗</Link></div> : <>
        <section className={styles.atlasStage} aria-label="Main Issue Atlas Stage">
          <div className={styles.issueNarrative}>
            <div className={styles.storyTop}><span>01 / MAIN ISSUE</span><span>{atlas?.metrics.issueCount} issues in view</span></div>
            <div className={styles.storyBody}>
              <p className={styles.storyKicker}>Selected Main Issue · Phase 2</p>
              <h2>{selectedIssue.label}</h2>
              <p className={styles.storySummary}>{selectedIssue.summary || "No summary retained for this Issue."}</p>
              <p className={styles.storySource}>Source: {selectedIssue.sourceTitle}</p>
              <Link className={styles.primaryAction} href={exploreHref}>Explore this issue <span aria-hidden="true">↗</span></Link>
            </div>
            <p className={styles.storyLocation}>{selectedPlaces.length > 0
              ? `${selectedPlaces.length} resolved related ${selectedPlaces.length === 1 ? "location" : "locations"} from linked events`
              : "No resolved related locations for this Issue. It remains available in Explore."}</p>
          </div>
          <div className={styles.globePanel} aria-label="All Main Issues and their related locations">
            {atlas && atlas.places.length > 0 ? <IssueGlobe places={atlas.places} selectedIssueSourceId={selectedIssue.sourceId}
              onSelectIssue={selectIssue} onSelectSharedPlace={(label, places) => setSharedPlace({ label, places })} />
              : <p className={styles.mapEmpty}>No resolved Event Geography across the current Main Issues.</p>}
            <div className={styles.globeCaption}><span>All Main Issues</span><span>Selected Issue highlighted</span><span>Related locations from linked events</span></div>
            {sharedPlace && <div className={styles.chooser} role="region" aria-label={`Issues at ${sharedPlace.label}`}>
              <div className={styles.chooserHead}><strong>{sharedPlace.label}</strong><button type="button" onClick={() => setSharedPlace(null)} aria-label="Close Issue chooser">×</button></div>
              <p>Choose an Issue to follow</p>
              <ul>{[...new Map(sharedPlace.places.map((place) => [place.issueSourceId, place])).values()].map((place) => <li key={place.issueSourceId}><button type="button" onClick={() => selectIssue(place.issueSourceId)}>{place.issueLabel}</button></li>)}</ul>
            </div>}
          </div>
        </section>

        <section className={styles.issueSelector} aria-label="Choose a Main Issue">
          <div className={styles.selectorHeading}><div><span>02 / THE STORIES</span><h2>Choose a question to follow.</h2></div><Link href="/explore?scope=all">Browse in Explore ↗</Link></div>
          <div className={styles.selectorRail}>{stories.slice(0, 5).map((issue, index) => <button type="button" key={issue.sourceId} data-selected={issue.sourceId === selectedIssue.sourceId} onClick={() => selectIssue(issue.sourceId)}><small>{String(index + 1).padStart(2, "0")}</small><span>{issue.label}</span></button>)}</div>
          <div className={styles.issueSearch}><label htmlFor="home-issue-search">Find an issue</label><input id="home-issue-search" type="search" value={issueQuery} onChange={(event) => setIssueQuery(event.target.value)} placeholder="Search all Main Issues" />
            {issueQuery.trim() && <div className={styles.searchResults} role="group" aria-label="Matching Main Issues">{matchingIssues.length ? matchingIssues.map((issue) => <button key={issue.sourceId} type="button" onClick={() => { selectIssue(issue.sourceId); setIssueQuery(""); }}>{issue.label}<small>{issue.sourceTitle}</small></button>) : <p>No Main Issues match this search.</p>}</div>}
          </div>
        </section>

        <section className={styles.across} aria-label="Across all issues">
          <div className={styles.acrossHeading}><span>03 / ACROSS ALL ISSUES</span><h2>The wider picture.</h2><p>Current source-grounded Main Issues and their linked retained Phase 5 events. Final, Not Final, and pending outcomes are included.</p></div>
          <div className={styles.metricRow}>
            <Link className={styles.metric} href="/explore?scope=all"><strong>{atlas?.metrics.issueCount}</strong><span>Main Issues</span><small>Browse all Issues ↗</small></Link>
            <Link className={styles.metric} href="/explore?scope=all&location=mapped" aria-label={`Explore mapped events in ${atlas?.metrics.countryCount} countries`}><strong>{atlas?.metrics.countryCount}</strong><span>Countries with related event locations</span><small>Explore mapped events ↗</small></Link>
            <div className={styles.typeMetric}><div><strong>{atlas?.metrics.eventCount}</strong><span>Linked events by type</span></div><div className={styles.typeList}>{atlas?.metrics.byType.map((item) => <Link key={item.label} href={`/explore?scope=all&type=${encodeURIComponent(item.label)}`} aria-label={`${item.label} ${item.count}`}><span>{item.label}</span><span className={styles.typeTrack}><span style={{ width: `${100 * item.count / maxTypeCount}%` }} /></span><strong>{item.count}</strong></Link>)}</div></div>
          </div>
          <p className={styles.dataNote}>Countries count unique ISO3 codes from resolved Event Geography with valid coordinates. Actor locations are excluded. {atlas?.metrics.unmappedIssueCount ? `${atlas.metrics.unmappedIssueCount} ${atlas.metrics.unmappedIssueCount === 1 ? "Issue has" : "Issues have"} no resolved related location. ` : ""}{atlas?.metrics.unlinkedEventCount ? `${atlas.metrics.unlinkedEventCount} unlinked Phase 5 ${atlas.metrics.unlinkedEventCount === 1 ? "record is" : "records are"} excluded.` : ""}</p>
        </section>
      </>)}
    </div>
  </AppShell>;
}
