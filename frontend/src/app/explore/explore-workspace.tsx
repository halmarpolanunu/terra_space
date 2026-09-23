"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EventGlobe } from "@/app/dashboard/event-globe";
import { getBridgeSource, listPhase5Events, type BridgeSource, type Phase5Event } from "@/lib/bridge-api";
import { filterPhase5Events, phase5MapEvents, summarizePhase5Events, type Phase5Filters } from "@/lib/phase5-view-model";
import styles from "./explore.module.css";

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; events: Phase5Event[] };

export function ExploreWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const filters = useMemo<Phase5Filters>(() => {
    const params = new URLSearchParams(search);
    const status = params.get("status");
    return { q: params.get("q") ?? "", status: status === "FINAL" || status === "NOT_FINAL" ? status : "all", type: params.get("type") ?? "",
      month: /^\d{4}-\d{2}$/.test(params.get("month") ?? "") ? params.get("month")! : undefined,
      date: params.get("date") === "unknown" ? "unknown" : undefined,
      location: params.get("location") === "mapped" ? "mapped" : undefined };
  }, [search]);
  const [state, setState] = useState<State>({ kind: "loading" });
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("event"));
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [source, setSource] = useState<BridgeSource | null>(null);
  const [sourceError, setSourceError] = useState(false);
  const load = useCallback(() => {
    setState({ kind: "loading" });
    void listPhase5Events().then((events) => setState({ kind: "ready", events })).catch(() => setState({ kind: "error" }));
  }, []);
  useEffect(() => {
    void listPhase5Events().then((events) => setState({ kind: "ready", events })).catch(() => setState({ kind: "error" }));
  }, []);
  const visible = state.kind === "ready" ? filterPhase5Events(state.events, filters) : [];
  const summary = summarizePhase5Events(visible);
  const mapEvents = phase5MapEvents(visible);
  const selected = state.kind === "ready" ? state.events.find((event) => event.id === selectedId) : undefined;
  useEffect(() => { if (selected) closeRef.current?.focus(); }, [selected]);
  function openEvent(id: string, trigger?: HTMLElement) { triggerRef.current = trigger ?? null; setSelectedId(id); }
  function closeDetail() { setSelectedId(null); setSource(null); triggerRef.current?.focus(); }
  function updateFilter(key: keyof Phase5Filters, value: string) {
    const params = new URLSearchParams(search);
    params.delete("event");
    setSelectedId(null);
    if (value && value !== "all") params.set(key, value); else params.delete(key);
    router.push(`/explore${params.toString() ? `?${params}` : ""}`);
  }
  function openSource(event: Phase5Event) {
    setSource(null); setSourceError(false);
    void getBridgeSource(event.phase1_source_id).then(setSource).catch(() => setSourceError(true));
  }
  return <AppShell currentPath="/explore"><div className={styles.explore}>
    <header className={styles.header}><div><p className="eyebrow">Terra Space / Explore</p><h1>Follow the evidence.</h1><p>One filtered set across the map, timeline, and event list.</p></div>
      <div className={styles.otherViews}><Link href="/issues">Issues and relationships ↗</Link><Link href="/events">Earlier events</Link></div></header>
    <p className={styles.scope}>Current Phase 5 events <span>· {state.kind === "ready" ? `${summary.total} of ${state.events.length} shown` : "Read-only pipeline output"}</span></p>
    {state.kind === "loading" && <p role="status">Loading current Phase 5 events…</p>}
    {state.kind === "error" && <div role="alert" className={styles.notice}><p>Could not load current Phase 5 events.</p><button onClick={load} type="button">Retry</button></div>}
    {state.kind === "ready" && <>
      <div className={styles.filters} aria-label="Explore filters"><label>Search events<input type="search" value={filters.q} onChange={(event) => updateFilter("q", event.target.value)} /></label>
        <label>Qualification<select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}><option value="all">All statuses</option><option value="FINAL">Final</option><option value="NOT_FINAL">Not Final</option></select></label>
        <label>Event type<select value={filters.type} onChange={(event) => updateFilter("type", event.target.value)}><option value="">All types</option>{[...new Set(state.events.map((event) => event.classification.event_type_name || "Unclassified"))].sort().map((type) => <option key={type}>{type}</option>)}</select></label>
      </div>
      {(filters.month || filters.date || filters.location) && <div className={styles.activeFilters} aria-label="Chart filters">{filters.month && <button type="button" onClick={() => updateFilter("month", "")}>Month {filters.month} ×</button>}{filters.date && <button type="button" onClick={() => updateFilter("date", "")}>Date unknown ×</button>}{filters.location && <button type="button" onClick={() => updateFilter("location", "")}>Mapped only ×</button>}</div>}
      {state.events.length === 0 ? <p className={styles.notice}>No current Phase 5 events yet.</p> : visible.length === 0 ? <p className={styles.notice}>No events match these filters. Change a filter to see more.</p> : <div className={styles.grid}>
        <section className={styles.map} aria-label="Filtered event map"><div className={styles.heading}><span>01 / PLACE</span><h2>Map</h2></div>
          {mapEvents.some((event) => event.locations.length > 0) ? <EventGlobe events={mapEvents} onSelect={(event) => openEvent(event.id)} selectedEventId={selectedId ?? undefined} /> : <p className={styles.mapEmpty}>No resolved Event Geography in this selection.</p>}
          <p className={styles.caption}>{summary.mapped} mapped · {summary.total - summary.mapped} without resolved event location</p>
        </section>
        <section className={styles.timeline} aria-label="Filtered timeline"><div className={styles.heading}><span>02 / TIME</span><h2>Timeline</h2></div>
          <ol>{[...visible].filter((event) => event.timeline.event_date).sort((a, b) => (a.timeline.event_date ?? "").localeCompare(b.timeline.event_date ?? "")).map((event) => <li key={event.id}><span>{event.timeline.event_date}</span><button type="button" onClick={(click) => openEvent(event.id, click.currentTarget)}>{event.title}</button></li>)}</ol>
          <h3>Date unknown · {summary.undated}</h3><ol>{visible.filter((event) => !event.timeline.event_date).map((event) => <li key={event.id}><button type="button" onClick={(click) => openEvent(event.id, click.currentTarget)}>{event.title}</button><small>{event.timeline.reference_date ? `Publication reference ${event.timeline.reference_date}` : "No date reference"}</small></li>)}</ol>
        </section>
        <section className={styles.list} aria-label="Filtered event list"><div className={styles.heading}><span>03 / RECORDS</span><h2>Events</h2></div>
          <ul>{visible.map((event) => <li key={event.id}><button type="button" onClick={(click) => openEvent(event.id, click.currentTarget)}>{event.title}</button><span>{event.qualification.status ?? "Pending"} · {event.classification.event_type_name ?? "Unclassified"}</span></li>)}</ul>
        </section>
      </div>}
      {selected && <aside className={styles.detail} aria-label="Event evidence detail" onKeyDown={(event) => { if (event.key === "Escape") closeDetail(); }}><button ref={closeRef} className={styles.close} type="button" onClick={closeDetail}>Close detail ×</button>
        <p className="eyebrow">Phase 5 / Evidence detail</p><h2>{selected.title}</h2><p className={styles.status}>{selected.qualification.status ?? "Pending qualification"} · {selected.classification.event_type_name ?? "Unclassified"}</p>
        <p>{selected.description}</p><h3>Source evidence</h3><blockquote>{selected.evidence_quote || "No evidence quote retained."}</blockquote>
        <dl><dt>Event date</dt><dd>{selected.timeline.event_date ?? "Unknown"}</dd><dt>Publication reference</dt><dd>{selected.timeline.reference_date ?? "None"}</dd><dt>Event geography</dt><dd>{phase5MapEvents([selected])[0].locations.length ? "Resolved event location" : "No resolved event location"}</dd></dl>
        {selected.qualification.reason_codes.length > 0 && <><h3>Qualification reasons</h3><ul>{selected.qualification.reason_codes.map((reason) => <li key={reason}>{reason}</li>)}</ul></>}
        {selected.timeline.limitations.length > 0 && <p>Limitations: {selected.timeline.limitations.join(", ")}</p>}
        <button type="button" onClick={() => openSource(selected)}>Open source record</button>
        {source && <section><h3>{source.title}</h3><p>{source.raw_content_text}</p></section>}
        {sourceError && <p role="alert">Could not load the source record. Event evidence remains available above.</p>}
      </aside>}
    </>}
  </div></AppShell>;
}
