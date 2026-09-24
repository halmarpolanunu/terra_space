"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EventGlobe } from "@/app/dashboard/event-globe";
import { listBridgeCandidateReviews, listPhase5Events, type BridgeCandidateReview, type Phase5Event } from "@/lib/bridge-api";
import { buildMainIssueStories } from "@/lib/main-issue-view-model";
import { phase5MapEvents, summarizePhase5Events } from "@/lib/phase5-view-model";
import type { EventRead } from "@/lib/events-api";
import styles from "./home.module.css";

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; events: Phase5Event[]; reviews: BridgeCandidateReview[] };

function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

export function HomeWorkspace() {
  const presentation = useSearchParams().get("present") === "1";
  const [state, setState] = useState<State>({ kind: "loading" });
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [cluster, setCluster] = useState<{ label: string; events: EventRead[] } | null>(null);
  const load = useCallback(() => {
    setState({ kind: "loading" });
    void Promise.all([listPhase5Events(), listBridgeCandidateReviews()]).then(([events, reviews]) => setState({ kind: "ready", events, reviews })).catch(() => setState({ kind: "error" }));
  }, []);
  useEffect(() => {
    void Promise.all([listPhase5Events(), listBridgeCandidateReviews()]).then(([events, reviews]) => setState({ kind: "ready", events, reviews })).catch(() => setState({ kind: "error" }));
  }, []);

  const stories = state.kind === "ready" ? buildMainIssueStories(state.reviews, state.events) : [];
  const linkedEvents = stories.flatMap((issue) => issue.events);
  const selectedIssue = stories.find((issue) => issue.sourceId === selectedIssueId) ?? stories[0];
  const issueSummary = selectedIssue ? summarizePhase5Events(selectedIssue.events) : null;
  const summary = state.kind === "ready" ? summarizePhase5Events(linkedEvents) : null;
  const mapped = selectedIssue ? phase5MapEvents(selectedIssue.events) : [];
  const mostCommonType = summary?.byType[0]?.count ?? 1;
  const maxMonthCount = Math.max(1, ...(summary?.byMonth.map((item) => item.count) ?? []));
  const hiddenTypeCount = Math.max(0, (summary?.byType.length ?? 0) - 5);
  const finalShare = summary?.total ? 100 * summary.final / summary.total : 0;
  const notFinalShare = summary?.total ? 100 * (summary.final + summary.notFinal) / summary.total : 0;
  return <AppShell currentPath="/home" presentation={presentation}>
    <div className={styles.home}>
      <header className={styles.intro}>
        <div><p className={styles.scope}><span>Phase 2 Main Issues</span> · Linked Phase 5 events</p><h1>Start with the issue.</h1>
          <p>Follow a source-grounded question into the events, places, and evidence behind it.</p></div>
        {presentation ? <Link className={styles.action} href="/home">Exit presentation</Link> : <div className={styles.actions}><Link href="/home?present=1">Presentation view</Link><Link className={styles.action} href="/explore">Explore issues <span aria-hidden="true">↗</span></Link></div>}
      </header>
      {state.kind === "loading" && <p role="status">Loading Main Issues and linked events…</p>}
      {state.kind === "error" && <div role="alert" className={styles.notice}><p>Could not load Main Issues or linked events.</p><button onClick={load} type="button">Retry</button></div>}
      {state.kind === "ready" && <>
        {stories.length === 0 ? <div className={styles.notice}><p>No Phase 2 Main Issues yet. Run the local pipeline, then return here.</p><Link href="/prepare">Inspect pipeline</Link></div> : <>
          <section className={styles.issueSelector} aria-label="Main Issue stories">
            <div className={styles.issueSelectorHeading}><span>01 / MAIN ISSUES</span><strong>{stories.length} source-grounded issues</strong><Link href="/explore">Browse all ↗</Link></div>
            <div className={styles.issueCards}>{stories.slice(0, 5).map((issue, index) => <button key={issue.sourceId} type="button" data-selected={selectedIssue?.sourceId === issue.sourceId} onClick={() => { setSelectedIssueId(issue.sourceId); setCluster(null); }}><span>{String(index + 1).padStart(2, "0")} / {issue.events.length} events</span><strong>{issue.label}</strong></button>)}</div>
          </section>
          <div className={styles.hero}>
            <section className={styles.globePanel} aria-label="Selected Main Issue event globe">
              <div className={styles.globeHeading}><h2>Where this issue unfolds</h2><p>{issueSummary?.mapped ?? 0} of {selectedIssue?.events.length ?? 0} linked events mapped</p></div>
              {mapped.some((event) => event.locations.length > 0) ? <EventGlobe events={mapped} onSelect={(event) => { window.location.href = `/explore?issue=${encodeURIComponent(selectedIssue!.sourceId)}&event=${encodeURIComponent(event.id)}`; }} onSelectCluster={(events, label) => setCluster({ events, label })} /> : <div className={styles.mapEmpty}>No resolved Event Geography for this issue yet.</div>}
              {cluster && <div className={styles.cluster} role="region" aria-label={`Events at ${cluster.label}`}><div><strong>{cluster.label}</strong><button type="button" onClick={() => setCluster(null)} aria-label="Close shared marker">×</button></div><ul>{cluster.events.map((event) => <li key={event.id}><Link href={`/explore?issue=${encodeURIComponent(selectedIssue!.sourceId)}&event=${encodeURIComponent(event.id)}`}>{event.title}</Link></li>)}</ul></div>}
              <div className={styles.globeFooter} aria-label="Current Phase 5 summary">
                <Link href={`/explore?issue=${encodeURIComponent(selectedIssue!.sourceId)}`}><strong>{issueSummary?.total}</strong> linked events</Link><span>·</span>
                <Link href={`/explore?issue=${encodeURIComponent(selectedIssue!.sourceId)}&status=FINAL`}><strong>{issueSummary?.final}</strong> final</Link><span>·</span>
                <Link href={`/explore?issue=${encodeURIComponent(selectedIssue!.sourceId)}&location=mapped`}><strong>{issueSummary?.mapped}</strong> mapped</Link>
              </div>
            </section>
            <aside className={styles.heroAside} aria-label="Current picture">
              <section className={styles.brief}><span className={styles.eyebrow}>Featured Main Issue / Phase 2</span><h2>{selectedIssue?.label}</h2><p>{selectedIssue?.summary || selectedIssue?.sourceTitle}</p><p className={styles.issueSource}>Source: {selectedIssue?.sourceTitle}</p><Link href={`/explore?issue=${encodeURIComponent(selectedIssue!.sourceId)}`}>Follow this issue ↗</Link></section>
              <Link href={`/explore?issue=${encodeURIComponent(selectedIssue!.sourceId)}&status=NOT_FINAL`} className={styles.attention}><strong>{issueSummary?.notFinal}</strong><span><b>Linked events not final</b><small>Retained records remain visible with their reasons.</small><em>Inspect events ↗</em></span></Link>
            </aside>
          </div>
          <div className={styles.corpusLabel}><span>02 / ACROSS ALL {stories.length} MAIN ISSUES</span><p>These charts count Phase 5 events across the full set. Select an issue above to focus the globe.</p></div>
          <div className={styles.insights}>
            <section className={`${styles.chart} ${styles.typeChart}`} aria-label="Event types">
              <div className={styles.panelTitle}><div><span>01 / DISTRIBUTION</span><h2>What is happening</h2></div></div>
              <p className={styles.chartIntro}>Most common event types. Bars compare with the largest type.</p>
              <div className={styles.typeList}>
                {summary?.byType.slice(0, 5).map((item, index) => <Link className={styles.typeRow} href={`/explore?scope=all&type=${encodeURIComponent(item.label)}`} key={item.label} aria-label={`${item.label}: ${item.count} ${item.count === 1 ? "record" : "records"}; explore events`}>
                  <span className={styles.typeRank}>{String(index + 1).padStart(2, "0")}</span><span className={styles.typeName}>{item.label}</span><span className={styles.typeTrack}><span style={{ width: `${100 * item.count / mostCommonType}%` }} /></span><strong>{item.count}</strong>
                </Link>)}
              </div>
              {hiddenTypeCount > 0 && <details className={styles.moreTypes}><summary>Show {hiddenTypeCount} more event types</summary><div className={styles.typeList}>
                {summary?.byType.slice(5).map((item, index) => <Link className={styles.typeRow} href={`/explore?scope=all&type=${encodeURIComponent(item.label)}`} key={item.label} aria-label={`${item.label}: ${item.count} ${item.count === 1 ? "record" : "records"}; explore events`}>
                  <span className={styles.typeRank}>{String(index + 6).padStart(2, "0")}</span><span className={styles.typeName}>{item.label}</span><span className={styles.typeTrack}><span style={{ width: `${100 * item.count / mostCommonType}%` }} /></span><strong>{item.count}</strong>
                </Link>)}
              </div></details>}
            </section>
            <section className={`${styles.chart} ${styles.timeChart}`} aria-label="Events by month">
              <div className={styles.panelTitle}><div><span>02 / TIME</span><h2>When they happened</h2></div></div>
              <p className={styles.chartIntro}>{summary && summary.total - summary.undated} events have an event date.</p>
              {summary?.byMonth.length ? <div className={styles.monthChart} aria-label="Dated events by month">{summary.byMonth.map((item) => <Link href={`/explore?scope=all&month=${item.month}`} className={styles.monthColumn} key={item.month} aria-label={`${monthLabel(item.month)}: ${item.count} ${item.count === 1 ? "event" : "events"}; explore events`}>
                <strong>{item.count}</strong><span className={styles.monthTrack}><span style={{ height: `${100 * item.count / maxMonthCount}%` }} /></span><span>{monthLabel(item.month)}</span>
              </Link>)}</div> : <p className={styles.emptyChart}>No known event dates yet.</p>}
              <Link href="/explore?scope=all&date=unknown" className={styles.unknownDate}><strong>{summary?.undated}</strong><span>Event dates unknown<small>Publication dates excluded</small></span><span aria-hidden="true">↗</span></Link>
            </section>
            <section className={`${styles.chart} ${styles.qualificationChart}`} aria-label="Qualification status">
              <div className={styles.panelTitle}><div><span>03 / QUALIFICATION</span><h2>Qualification</h2></div></div>
              <p className={styles.chartIntro}>All retained Phase 5 records, by current outcome.</p>
              <div className={styles.qualificationBody}>
                <div className={styles.donut} role="img" aria-label={`${summary?.final} Final, ${summary?.notFinal} Not Final, ${summary?.unqualified} Pending`} style={{ background: `conic-gradient(#f2c780 0 ${finalShare}%, #9d7950 ${finalShare}% ${notFinalShare}%, #51615b ${notFinalShare}% 100%)` }}><span><strong>{Math.round(finalShare)}%</strong><small>Final</small></span></div>
                <div className={styles.statusRow}><Link href="/explore?scope=all&status=FINAL"><span className={styles.finalKey}>Final</span><strong>{summary?.final}</strong></Link><Link href="/explore?scope=all&status=NOT_FINAL"><span className={styles.notFinalKey}>Not Final</span><strong>{summary?.notFinal}</strong></Link><Link href="/explore?scope=all&status=PENDING"><span className={styles.pendingKey}>Pending</span><strong>{summary?.unqualified}</strong></Link></div>
              </div>
            </section>
          </div>
          <section className={styles.recent}><div className={styles.panelTitle}><div><span>04 / LATEST</span><h2>Recent signals</h2></div><Link href="/explore">View all →</Link></div>
            <ul>{[...linkedEvents].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 4).map((event) => <li key={event.id}><Link className={styles.signalCard} href={`/explore?issue=${encodeURIComponent(event.phase1_source_id)}&event=${encodeURIComponent(event.id)}`}><span className={styles.signalMeta}><span>{event.classification.event_type_name || "Unclassified"}</span><span data-status={event.qualification.status ?? "PENDING"}>{event.qualification.status === "FINAL" ? "Final" : event.qualification.status === "NOT_FINAL" ? "Not Final" : "Pending"}</span></span><strong>{event.title}</strong><span className={styles.signalFoot}>View evidence <span aria-hidden="true">↗</span></span></Link></li>)}</ul>
          </section>
        </>}
      </>}
    </div>
  </AppShell>;
}
