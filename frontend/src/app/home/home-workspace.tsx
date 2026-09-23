"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EventGlobe } from "@/app/dashboard/event-globe";
import { listPhase5Events, type Phase5Event } from "@/lib/bridge-api";
import { phase5MapEvents, summarizePhase5Events } from "@/lib/phase5-view-model";
import styles from "./home.module.css";

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; events: Phase5Event[] };

export function HomeWorkspace() {
  const presentation = useSearchParams().get("present") === "1";
  const [state, setState] = useState<State>({ kind: "loading" });
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
        <div><p className="eyebrow">Terra Space / Situation room</p><h1>Understand what the world is telling us.</h1>
          <p>Explore source-grounded signals from the current local pipeline.</p></div>
        {presentation ? <Link className={styles.action} href="/home">Exit presentation</Link> : <div className={styles.actions}><Link href="/home?present=1">Presentation view</Link><Link className={styles.action} href="/explore">Explore events <span aria-hidden="true">↗</span></Link></div>}
      </header>
      <p className={styles.scope}>Current Phase 5 events <span>· Read-only pipeline output</span></p>
      {state.kind === "loading" && <p role="status">Loading current Phase 5 events…</p>}
      {state.kind === "error" && <div role="alert" className={styles.notice}><p>Could not load current Phase 5 events.</p><button onClick={load} type="button">Retry</button></div>}
      {state.kind === "ready" && <>
        {state.events.length === 0 ? <div className={styles.notice}><p>No current Phase 5 events yet. Run the local pipeline, then return here.</p><Link href="/prepare">Inspect pipeline</Link></div> : <>
          <div className={styles.metrics} aria-label="Current Phase 5 summary">
            <Link href="/explore" className={styles.metric}><span>Retained signals</span><strong>{summary?.total}</strong><small>All current records</small></Link>
            <Link href="/explore?status=FINAL" className={styles.metric}><span>Final</span><strong>{summary?.final}</strong><small>Qualified events</small></Link>
            <Link href="/explore?status=NOT_FINAL" className={styles.metric}><span>Needs attention</span><strong>{summary?.notFinal}</strong><small>Not Final records</small></Link>
            <Link href="/explore?location=mapped" className={styles.metric}><span>Mapped</span><strong>{summary?.mapped}</strong><small>Events with resolved places</small></Link>
          </div>
          <div className={styles.grid}>
            <section className={styles.globePanel} aria-label="Phase 5 event globe">
              <div className={styles.panelTitle}><div><span>01 / GEOGRAPHY</span><h2>Events in place</h2></div><span>{summary?.mapped} mapped</span></div>
              {mapped.some((event) => event.locations.length > 0) ? <EventGlobe events={mapped} onSelect={(event) => { window.location.href = `/explore?event=${encodeURIComponent(event.id)}`; }} /> : <div className={styles.mapEmpty}>No resolved Event Geography locations yet.</div>}
              <p className={styles.caption}>Only resolved Event Geography is pinned. {summary && summary.total - summary.mapped} records have no resolved event location.</p>
            </section>
            <div className={styles.rail}>
              <section className={styles.chart} aria-label="Event types"><div className={styles.panelTitle}><div><span>02 / DISTRIBUTION</span><h2>What is happening</h2></div></div>
                {summary?.byType.map((item) => <Link className={styles.barRow} href={`/explore?type=${encodeURIComponent(item.label)}`} key={item.label}><span>{item.label}</span><span className={styles.barTrack}><span style={{ width: `${100 * item.count / summary.total}%` }} /></span><strong>{item.count}</strong></Link>)}
              </section>
              <section className={styles.chart} aria-label="Events by month"><div className={styles.panelTitle}><div><span>03 / TIME</span><h2>When they happened</h2></div></div>
                {summary?.byMonth.length ? summary.byMonth.map((item) => <Link href={`/explore?month=${item.month}`} className={styles.barRow} key={item.month}><span>{item.month}</span><span className={styles.barTrack}><span style={{ width: `${100 * item.count / summary.total}%` }} /></span><strong>{item.count}</strong></Link>) : <p>No known event dates yet.</p>}
                <p className={styles.caption}><Link href="/explore?date=unknown">{summary?.undated} event dates unknown</Link> · publication dates excluded from chart</p>
              </section>
              <section className={styles.chart} aria-label="Qualification status"><div className={styles.panelTitle}><div><span>04 / CONFIDENCE</span><h2>Qualification</h2></div></div>
                <div className={styles.statusRow}><Link href="/explore?status=FINAL">Final <strong>{summary?.final}</strong></Link><Link href="/explore?status=NOT_FINAL">Not Final <strong>{summary?.notFinal}</strong></Link><span>Pending <strong>{summary?.unqualified}</strong></span></div>
              </section>
            </div>
          </div>
          <section className={styles.recent}><div className={styles.panelTitle}><div><span>05 / LATEST</span><h2>Recent signals</h2></div><Link href="/explore">View all →</Link></div>
            <ul>{[...state.events].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 4).map((event) => <li key={event.id}><Link href={`/explore?event=${encodeURIComponent(event.id)}`}>{event.title}</Link><span>{event.qualification.status ?? "Pending"}</span></li>)}</ul>
          </section>
        </>}
      </>}
    </div>
  </AppShell>;
}
