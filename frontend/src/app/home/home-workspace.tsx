"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EventGlobe } from "@/app/dashboard/event-globe";
import { listPhase5Events, type Phase5Event } from "@/lib/bridge-api";
import { phase5MapEvents, summarizePhase5Events } from "@/lib/phase5-view-model";
import type { EventRead } from "@/lib/events-api";
import styles from "./home.module.css";

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; events: Phase5Event[] };

export function HomeWorkspace() {
  const presentation = useSearchParams().get("present") === "1";
  const [state, setState] = useState<State>({ kind: "loading" });
  const [cluster, setCluster] = useState<{ label: string; events: EventRead[] } | null>(null);
  const load = useCallback(() => {
    setState({ kind: "loading" });
    void listPhase5Events().then((events) => setState({ kind: "ready", events })).catch(() => setState({ kind: "error" }));
  }, []);
  useEffect(() => {
    void listPhase5Events().then((events) => setState({ kind: "ready", events })).catch(() => setState({ kind: "error" }));
  }, []);

  const summary = state.kind === "ready" ? summarizePhase5Events(state.events) : null;
  const mapped = state.kind === "ready" ? phase5MapEvents(state.events) : [];
  return <AppShell currentPath="/home" presentation={presentation}>
    <div className={styles.home}>
      <header className={styles.intro}>
        <div><p className={styles.scope}><span>Current Phase 5 events</span> · Read-only pipeline output</p><h1>Where the world shifts.</h1>
          <p>Explore grounded events across places, time, and original evidence.</p></div>
        {presentation ? <Link className={styles.action} href="/home">Exit presentation</Link> : <div className={styles.actions}><Link href="/home?present=1">Presentation view</Link><Link className={styles.action} href="/explore">Explore events <span aria-hidden="true">↗</span></Link></div>}
      </header>
      {state.kind === "loading" && <p role="status">Loading current Phase 5 events…</p>}
      {state.kind === "error" && <div role="alert" className={styles.notice}><p>Could not load current Phase 5 events.</p><button onClick={load} type="button">Retry</button></div>}
      {state.kind === "ready" && <>
        {state.events.length === 0 ? <div className={styles.notice}><p>No current Phase 5 events yet. Run the local pipeline, then return here.</p><Link href="/prepare">Inspect pipeline</Link></div> : <>
          <div className={styles.hero}>
            <section className={styles.globePanel} aria-label="Phase 5 event globe">
              <div className={styles.globeHeading}><h2>Events in place</h2><p>{summary?.mapped} mapped events · select a point to explore</p></div>
              {mapped.some((event) => event.locations.length > 0) ? <EventGlobe events={mapped} onSelect={(event) => { window.location.href = `/explore?event=${encodeURIComponent(event.id)}`; }} onSelectCluster={(events, label) => setCluster({ events, label })} /> : <div className={styles.mapEmpty}>No resolved Event Geography locations yet.</div>}
              {cluster && <div className={styles.cluster} role="region" aria-label={`Events at ${cluster.label}`}><div><strong>{cluster.label}</strong><button type="button" onClick={() => setCluster(null)} aria-label="Close shared marker">×</button></div><ul>{cluster.events.map((event) => <li key={event.id}><Link href={`/explore?event=${encodeURIComponent(event.id)}`}>{event.title}</Link></li>)}</ul></div>}
              <div className={styles.globeFooter} aria-label="Current Phase 5 summary">
                <Link href="/explore"><strong>{summary?.total}</strong> retained signals</Link><span>·</span>
                <Link href="/explore?status=FINAL"><strong>{summary?.final}</strong> final events</Link><span>·</span>
                <Link href="/explore?location=mapped"><strong>{summary?.mapped}</strong> mapped</Link>
              </div>
            </section>
            <aside className={styles.heroAside} aria-label="Current picture">
              <section className={styles.brief}><span className={styles.eyebrow}>Current picture</span><h2>Explore the events behind the pattern.</h2><p>Select a place on the globe, then trace an event to its original evidence.</p><Link href="/explore">Open Explore ↗</Link></section>
              <Link href="/explore?status=NOT_FINAL" className={styles.attention}><strong>{summary?.notFinal}</strong><span><b>Need attention</b><small>Records outside final output remain visible for review.</small><em>Inspect records ↗</em></span></Link>
            </aside>
          </div>
          <div className={styles.insights}>
              <section className={styles.chart} aria-label="Event types"><div className={styles.panelTitle}><div><span>01 / DISTRIBUTION</span><h2>What is happening</h2></div></div>
                {summary?.byType.map((item) => <Link className={styles.barRow} href={`/explore?type=${encodeURIComponent(item.label)}`} key={item.label}><span>{item.label}</span><span className={styles.barTrack}><span style={{ width: `${100 * item.count / summary.total}%` }} /></span><strong>{item.count}</strong></Link>)}
              </section>
              <section className={styles.chart} aria-label="Events by month"><div className={styles.panelTitle}><div><span>02 / TIME</span><h2>When they happened</h2></div></div>
                {summary?.byMonth.length ? summary.byMonth.map((item) => <Link href={`/explore?month=${item.month}`} className={styles.barRow} key={item.month}><span>{item.month}</span><span className={styles.barTrack}><span style={{ width: `${100 * item.count / summary.total}%` }} /></span><strong>{item.count}</strong></Link>) : <p>No known event dates yet.</p>}
                <p className={styles.caption}><Link href="/explore?date=unknown">{summary?.undated} event dates unknown</Link> · publication dates excluded from chart</p>
              </section>
              <section className={styles.chart} aria-label="Qualification status"><div className={styles.panelTitle}><div><span>03 / QUALIFICATION</span><h2>Qualification</h2></div></div>
                <div className={styles.statusRow}><Link href="/explore?status=FINAL">Final <strong>{summary?.final}</strong></Link><Link href="/explore?status=NOT_FINAL">Not Final <strong>{summary?.notFinal}</strong></Link><Link href="/explore?status=PENDING">Pending <strong>{summary?.unqualified}</strong></Link></div>
              </section>
          </div>
          <section className={styles.recent}><div className={styles.panelTitle}><div><span>05 / LATEST</span><h2>Recent signals</h2></div><Link href="/explore">View all →</Link></div>
            <ul>{[...state.events].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 4).map((event) => <li key={event.id}><Link href={`/explore?event=${encodeURIComponent(event.id)}`}>{event.title}</Link><span>{event.qualification.status ?? "Pending"}</span></li>)}</ul>
          </section>
        </>}
      </>}
    </div>
  </AppShell>;
}
