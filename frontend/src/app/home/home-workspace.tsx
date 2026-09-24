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
const spectrumColors = ["#d8b577", "#b7a17d", "#968d79", "#7c8578", "#6c7d76", "#5b6e68", "#4d605b", "#40554f", "#384c47", "#30433f"];

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
  const featuredIssues = selectedIssue
    ? [selectedIssue, ...stories.filter((issue) => issue.sourceId !== selectedIssue.sourceId)].slice(0, 5)
    : [];
  const selectedPlaces = atlas?.places.filter((place) => place.issueSourceId === selectedIssue?.sourceId) ?? [];
  const matchingIssues = issueQuery.trim()
    ? stories.filter((issue) => `${issue.label} ${issue.sourceTitle}`.toLocaleLowerCase().includes(issueQuery.trim().toLocaleLowerCase()))
    : [];
  const exploreHref = selectedIssue ? `/explore?issue=${encodeURIComponent(selectedIssue.sourceId)}` : "/explore";

  function selectIssue(sourceId: string) {
    setSelectedIssueId(sourceId);
    setSharedPlace(null);
  }

  return <AppShell currentPath="/home" presentation={presentation}>
    <div className={styles.home}>
      <div className={styles.actions}>{presentation ? <Link href="/home">Exit presentation</Link> : <Link href="/home?present=1">Presentation view ↗</Link>}</div>
      {state.kind === "loading" && <p className={styles.notice} role="status">Loading Main Issues and related places…</p>}
      {state.kind === "error" && <div className={styles.notice} role="alert"><p>Could not load Main Issues and linked events.</p><button type="button" onClick={load}>Retry</button></div>}
      {state.kind === "ready" && (stories.length === 0 ? <div className={styles.notice}><p>No Phase 2 Main Issues yet.</p><p>They will appear after the local pipeline has produced a source-grounded Main Issue.</p><Link href="/prepare">Inspect pipeline ↗</Link></div> : <>
        <section className={styles.atlasStage} aria-label="Main Issue Atlas Stage">
          <div className={styles.globePanel} aria-label="All Main Issues and their related locations">
            {atlas && atlas.places.length > 0 ? <IssueGlobe places={atlas.places} selectedIssueSourceId={selectedIssue.sourceId}
              onSelectIssue={selectIssue} onSelectSharedPlace={(label, places) => setSharedPlace({ label, places })} />
              : <p className={styles.mapEmpty}>No resolved Event Geography across the current Main Issues.</p>}
            {sharedPlace && <div className={styles.chooser} role="region" aria-label={`Issues at ${sharedPlace.label}`}>
              <div className={styles.chooserHead}><strong>{sharedPlace.label}</strong><button type="button" onClick={() => setSharedPlace(null)} aria-label="Close Issue chooser">×</button></div>
              <p>Choose an Issue to follow</p>
              <ul>{[...new Map(sharedPlace.places.map((place) => [place.issueSourceId, place])).values()].map((place) => <li key={place.issueSourceId}><button type="button" onClick={() => selectIssue(place.issueSourceId)}>{place.issueLabel}</button></li>)}</ul>
            </div>}
          </div>
          <div className={styles.issueNarrative}>
            <div className={styles.storyTop}><span>Phase 2 / Main Issue</span><span>{atlas?.metrics.issueCount} issues in view</span></div>
            <div className={styles.storyBody}>
              <h1>{selectedIssue.label}</h1>
              <p className={styles.storySummary}>{selectedIssue.summary || "No summary retained for this Issue."}</p>
              <p className={styles.storySource}>Source: {selectedIssue.sourceTitle}</p>
              <Link className={styles.primaryAction} href={exploreHref}>Explore this issue <span aria-hidden="true">→</span></Link>
            </div>
            <p className={styles.storyLocation}>{selectedPlaces.length > 0
              ? `${selectedPlaces.length} resolved related ${selectedPlaces.length === 1 ? "location" : "locations"} from linked events`
              : "No resolved related locations for this Issue. It remains available in Explore."}</p>
          </div>
          <p className={styles.globeCaption}>All Main Issues <span>·</span> Selected Issue highlighted <span>·</span> Verified related event locations</p>
        </section>

        <section className={styles.issueSelector} aria-label="Choose a Main Issue">
          <div className={styles.selectorHeading}><div><span>02 / THE STORIES</span><h2>Choose a question to follow.</h2></div><Link href="/explore?scope=all">Browse in Explore ↗</Link></div>
          <div className={styles.selectorRail}>{featuredIssues.map((issue, index) => <button type="button" key={issue.sourceId} className={styles.storyTile} data-selected={issue.sourceId === selectedIssue.sourceId} onClick={() => selectIssue(issue.sourceId)}><span className={styles.storyArt} data-art={index} aria-hidden="true" /><span className={styles.tileCopy}><small>{String(index + 1).padStart(2, "0")}{index === 0 ? " / SELECTED" : ""}</small><span>{issue.label}</span>{index === 0 && <span className={styles.tileHint}>Follow this Issue <span aria-hidden="true">↗</span></span>}</span></button>)}</div>
          <div className={styles.issueSearch}><label htmlFor="home-issue-search">Find an issue</label><input id="home-issue-search" type="search" value={issueQuery} onChange={(event) => setIssueQuery(event.target.value)} placeholder="Search all Main Issues" />
            {issueQuery.trim() && <div className={styles.searchResults} role="group" aria-label="Matching Main Issues">{matchingIssues.length ? matchingIssues.map((issue) => <button key={issue.sourceId} type="button" onClick={() => { selectIssue(issue.sourceId); setIssueQuery(""); }}>{issue.label}<small>{issue.sourceTitle}</small></button>) : <p>No Main Issues match this search.</p>}</div>}
          </div>
          <p className={styles.artNote}>Story artwork is illustrative. Open an Issue for source evidence.</p>
        </section>

        <section className={styles.across} aria-label="Across all issues">
          <div className={styles.acrossTop}>
            <div className={styles.acrossHeading}><span>03 / ACROSS ALL ISSUES</span><h2>The wider picture.</h2><p>A quick reading of the current Issue landscape.</p></div>
            <div className={styles.metricRow}>
              <Link className={styles.metric} href="/explore?scope=all"><strong>{atlas?.metrics.issueCount}</strong><span>Main Issues</span><small>Browse all Issues ↗</small></Link>
              <Link className={styles.metric} href="/explore?scope=all&location=mapped" aria-label={`Explore mapped events in ${atlas?.metrics.countryCount} countries`}><strong>{atlas?.metrics.countryCount}</strong><span>Countries</span><small>Verified related event locations</small></Link>
              <p className={styles.countryNote}>Verified Event Geography only; actor locations excluded. {atlas?.metrics.unmappedIssueCount ? `${atlas.metrics.unmappedIssueCount} ${atlas.metrics.unmappedIssueCount === 1 ? "Issue has" : "Issues have"} no resolved related location.` : ""}</p>
            </div>
          </div>
          <div className={styles.spectrum}>
            <div className={styles.spectrumHeading}><Link href="/explore?scope=all" aria-label={`Explore all ${atlas?.metrics.eventCount} linked Phase 5 events`}><strong>{atlas?.metrics.eventCount}</strong><span>linked Phase 5 events</span></Link><p>Distribution by event type · Select a type to explore its records</p></div>
            {atlas?.metrics.byType.length ? <>
              <div className={styles.spectrumBar} role="group" aria-label="Linked events by event type">
                {atlas.metrics.byType.map((item, index) => <Link key={item.label} href={`/explore?scope=all&type=${encodeURIComponent(item.label)}`} aria-label={`Open event type ${item.label}`} title={`${item.label}: ${item.count}`} style={{ flexGrow: item.count, backgroundColor: spectrumColors[index % spectrumColors.length] }}>
                  {index === 0 && item.count / atlas.metrics.eventCount >= .25 ? <span>{item.label} {item.count}</span> : null}
                </Link>)}
              </div>
              <ul className={styles.spectrumLegend}>{atlas.metrics.byType.map((item, index) => <li key={item.label}><Link href={`/explore?scope=all&type=${encodeURIComponent(item.label)}`} aria-label={`${item.label} ${item.count}`}><span className={styles.legendDot} style={{ backgroundColor: spectrumColors[index % spectrumColors.length] }} aria-hidden="true" /><span>{item.label}</span><strong>{item.count}</strong></Link></li>)}</ul>
            </> : <p className={styles.spectrumEmpty}>No linked Phase 5 events yet.</p>}
          </div>
          <p className={styles.dataNote}>Counts include retained Final, Not Final, and pending records linked to current Main Issues. {atlas?.metrics.unlinkedEventCount ? `${atlas.metrics.unlinkedEventCount} unlinked Phase 5 ${atlas.metrics.unlinkedEventCount === 1 ? "record is" : "records are"} excluded.` : ""}</p>
        </section>
      </>)}
    </div>
  </AppShell>;
}
