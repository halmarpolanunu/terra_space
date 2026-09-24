"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EventGlobe } from "@/app/dashboard/event-globe";
import { getBridgeSource, listPhase5Events, type BridgeSource, type Phase5Event } from "@/lib/bridge-api";
import type { EventRead } from "@/lib/events-api";
import { filterPhase5Events, phase5EventMonth, phase5MapEvents, summarizePhase5Events, type Phase5Filters } from "@/lib/phase5-view-model";
import styles from "./explore.module.css";

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; events: Phase5Event[] };

export function ExploreWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const filters = useMemo<Phase5Filters>(() => {
    const params = new URLSearchParams(search);
    const status = params.get("status");
    return { q: params.get("q") ?? "", status: status === "FINAL" || status === "NOT_FINAL" || status === "PENDING" ? status : "all", type: params.get("type") ?? "",
      month: /^\d{4}-\d{2}$/.test(params.get("month") ?? "") ? params.get("month")! : undefined,
      date: params.get("date") === "unknown" ? "unknown" : undefined,
      location: params.get("location") === "mapped" ? "mapped" : undefined };
  }, [search]);
  const [state, setState] = useState<State>({ kind: "loading" });
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("event"));
  const [cluster, setCluster] = useState<{ label: string; events: EventRead[] } | null>(null);
  const paramsRef = useRef(new URLSearchParams(search));
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  useEffect(() => {
    paramsRef.current = new URLSearchParams(search);
    if (!searchTimerRef.current && searchInputRef.current) searchInputRef.current.value = filters.q;
  }, [search, filters.q]);
  useEffect(() => () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); }, []);
  const visible = state.kind === "ready" ? filterPhase5Events(state.events, filters) : [];
  const summary = summarizePhase5Events(visible);
  const mapEvents = phase5MapEvents(visible);
  const datedEvents = [...visible].filter((event) => phase5EventMonth(event) !== null).sort((a, b) => (a.timeline.event_date ?? "").localeCompare(b.timeline.event_date ?? ""));
  const undatedEvents = visible.filter((event) => phase5EventMonth(event) === null);
  const selected = state.kind === "ready" ? state.events.find((event) => event.id === selectedId) : undefined;
  useEffect(() => { if (selected) closeRef.current?.focus(); }, [selected]);
  function openEvent(id: string, trigger?: HTMLElement) { triggerRef.current = trigger ?? null; setSelectedId(id); }
  function closeDetail() { setSelectedId(null); setSource(null); triggerRef.current?.focus(); }
  function updateFilter(key: keyof Phase5Filters, value: string) {
    const params = new URLSearchParams(paramsRef.current);
    params.delete("event");
    setSelectedId(null);
    if (value && value !== "all") params.set(key, value); else params.delete(key);
    paramsRef.current = params;
    router.push(`/explore${params.toString() ? `?${params}` : ""}`);
  }
  function scheduleSearch(value: string) {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => { searchTimerRef.current = null; updateFilter("q", value); }, 250);
  }
  function openSource(event: Phase5Event) {
    setSource(null); setSourceError(false);
    void getBridgeSource(event.phase1_source_id).then(setSource).catch(() => setSourceError(true));
  }
  return <AppShell currentPath="/explore"><div className={styles.explore}>
    <header className={styles.header}><div><p className="eyebrow">Terra Space / Explore</p><h1>Follow the evidence.</h1><p>Trace each signal across place, time, and its original source.</p></div>
      <div className={styles.otherViews}><Link href="/issues">Issues and relationships ↗</Link><Link href="/events">Earlier events</Link></div></header>
    <p className={styles.scope}>Current Phase 5 events <span>· {state.kind === "ready" ? `${summary.total} of ${state.events.length} shown` : "Read-only pipeline output"}</span></p>
    {state.kind === "loading" && <p role="status">Loading current Phase 5 events…</p>}
    {state.kind === "error" && <div role="alert" className={styles.notice}><p>Could not load current Phase 5 events.</p><button onClick={load} type="button">Retry</button></div>}
    {state.kind === "ready" && <>
      <div className={styles.filters} aria-label="Explore filters"><label className={styles.searchLabel}>Search events<input ref={searchInputRef} type="search" placeholder="Search titles or evidence" defaultValue={filters.q} onChange={(event) => scheduleSearch(event.target.value)} /></label>
        <label>Qualification<select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}><option value="all">All statuses</option><option value="FINAL">Final</option><option value="NOT_FINAL">Not Final</option><option value="PENDING">Pending</option></select></label>
        <label>Event type<select value={filters.type} onChange={(event) => updateFilter("type", event.target.value)}><option value="">All types</option>{[...new Set(state.events.map((event) => event.classification.event_type_name || "Unclassified"))].sort().map((type) => <option key={type}>{type}</option>)}</select></label>
      </div>
      {(filters.month || filters.date || filters.location) && <div className={styles.activeFilters} aria-label="Chart filters">{filters.month && <button type="button" onClick={() => updateFilter("month", "")}>Month {filters.month} ×</button>}{filters.date && <button type="button" onClick={() => updateFilter("date", "")}>Date unknown ×</button>}{filters.location && <button type="button" onClick={() => updateFilter("location", "")}>Mapped only ×</button>}</div>}
      {visible.length > 0 && <nav className={styles.viewNav} aria-label="Explore views"><a href="#explore-place"><span>01</span> Place <strong>{summary.mapped} mapped</strong></a><a href="#explore-time"><span>02</span> Time <strong>{datedEvents.length} dated</strong></a><a href="#explore-records"><span>03</span> Records <strong>{summary.total} shown</strong></a></nav>}
      {state.events.length === 0 ? <p className={styles.notice}>No current Phase 5 events yet.</p> : visible.length === 0 ? <p className={styles.notice}>No events match these filters. Change a filter to see more.</p> : <div className={styles.grid}>
        <section id="explore-place" className={styles.map} aria-label="Filtered event map"><div className={styles.mapHeader}><div className={styles.heading}><span>01 / PLACE</span><h2>Where it happened</h2><p>Select a point to open its event and source evidence.</p></div><div className={styles.mapTelemetry}><div><strong>{summary.mapped}</strong><span>mapped</span></div><div><strong>{summary.total - summary.mapped}</strong><span>location unresolved</span></div></div></div>
          {mapEvents.some((event) => event.locations.length > 0) ? <EventGlobe events={mapEvents} onSelect={(event) => openEvent(event.id)} onSelectCluster={(events, label) => setCluster({ events, label })} selectedEventId={selectedId ?? undefined} /> : <p className={styles.mapEmpty}>No resolved Event Geography in this selection.</p>}
          {cluster && <div className={styles.cluster} role="region" aria-label={`Events at ${cluster.label}`}><div><strong>{cluster.label}</strong><button type="button" onClick={() => setCluster(null)} aria-label="Close shared marker">×</button></div><ul>{cluster.events.map((event) => <li key={event.id}><button type="button" onClick={(click) => { openEvent(event.id, click.currentTarget); setCluster(null); }}>{event.title}</button></li>)}</ul></div>}
          <p className={styles.caption}>Only resolved Event Geography appears on the map. All other records remain in the index below.</p>
        </section>
        <section id="explore-time" className={styles.timeline} aria-label="Filtered timeline"><div className={styles.sectionHeader}><div className={styles.heading}><span>02 / TIME</span><h2>Timeline</h2><p>Known event dates, in order.</p></div><strong>{datedEvents.length} dated</strong></div>
          {datedEvents.length > 0 ? <ol className={styles.datedList}>{datedEvents.map((event) => <li key={event.id}><span>{event.timeline.event_date}</span><button type="button" onClick={(click) => openEvent(event.id, click.currentTarget)}>{event.title}</button></li>)}</ol> : <p className={styles.emptyTimeline}>No known event dates in this selection.</p>}
          {undatedEvents.length > 0 && <details className={styles.unknownGroup} open={filters.date === "unknown"}><summary><span>Date unknown</span><strong>{summary.undated}</strong><small>Publication dates are references, not event dates</small></summary><ol>{undatedEvents.map((event) => <li key={event.id}><button type="button" onClick={(click) => openEvent(event.id, click.currentTarget)}>{event.title}</button><small>{event.timeline.reference_date ? `Publication reference ${event.timeline.reference_date}` : "No date reference"}</small></li>)}</ol></details>}
        </section>
        <section id="explore-records" className={styles.list} aria-label="Filtered event list"><div className={styles.sectionHeader}><div className={styles.heading}><span>03 / RECORDS</span><h2>Event index</h2><p>Every record in this selection, with its evidence one click away.</p></div><strong>{summary.total} signals</strong></div>
          <ul>{visible.map((event, index) => <li key={event.id}><button type="button" onClick={(click) => openEvent(event.id, click.currentTarget)} aria-label={event.title} data-status={event.qualification.status ?? "PENDING"} data-selected={selectedId === event.id}><span className={styles.recordNumber}>{String(index + 1).padStart(2, "0")}</span><span className={styles.recordContent}><span className={styles.recordMeta}><span>{event.classification.event_type_name || "Unclassified"}</span><span>{event.qualification.status === "FINAL" ? "Final" : event.qualification.status === "NOT_FINAL" ? "Not Final" : "Pending"}</span></span><strong>{event.title}</strong><small>{phase5EventMonth(event) ? event.timeline.event_date : "No verified event date"}</small></span><span className={styles.recordArrow} aria-hidden="true">↗</span></button></li>)}</ul>
        </section>
      </div>}
      {selected && <aside className={styles.detail} aria-label="Event evidence detail" onKeyDown={(event) => { if (event.key === "Escape") closeDetail(); }}><button ref={closeRef} className={styles.close} type="button" onClick={closeDetail}>Close detail ×</button>
        <p className="eyebrow">Phase 5 / Evidence detail</p><h2>{selected.title}</h2><p className={styles.status}>{selected.qualification.status ?? "Pending qualification"} · {selected.classification.event_type_name ?? "Unclassified"}</p>
        <p>{selected.description}</p><h3>Source evidence</h3><blockquote>{selected.evidence_quote || "No evidence quote retained."}</blockquote>
        <dl><dt>Event date</dt><dd>{phase5EventMonth(selected) ? selected.timeline.event_date : "Unknown"}</dd><dt>Publication reference</dt><dd>{selected.timeline.reference_date ?? "None"}</dd><dt>Event geography</dt><dd>{phase5MapEvents([selected])[0].locations.length ? "Resolved event location" : "No resolved event location"}</dd></dl>
        {selected.qualification.reason_codes.length > 0 && <><h3>Qualification reasons</h3><ul>{selected.qualification.reason_codes.map((reason) => <li key={reason}>{reason}</li>)}</ul></>}
        {selected.timeline.limitations.length > 0 && <p>Limitations: {selected.timeline.limitations.join(", ")}</p>}
        <button type="button" onClick={() => openSource(selected)}>Open source record</button>
        {source && <section><h3>{source.title}</h3><p>{source.raw_content_text}</p></section>}
        {sourceError && <p role="alert">Could not load the source record. Event evidence remains available above.</p>}
      </aside>}
    </>}
  </div></AppShell>;
}
