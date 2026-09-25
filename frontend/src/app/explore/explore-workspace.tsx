"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EventGlobe } from "@/app/dashboard/event-globe";
import { ExploreCountryMap } from "@/app/explore/explore-country-map";
import { getBridgeSource, listBridgeCandidateReviews, listPhase5Events, type BridgeCandidateReview, type BridgeSource, type Phase5Event } from "@/lib/bridge-api";
import { buildExploreCountries, eventsForIssueSet } from "@/lib/explore-country-model";
import { buildIssueAtlas } from "@/lib/issue-atlas-model";
import { buildMainIssueStories } from "@/lib/main-issue-view-model";
import type { EventRead } from "@/lib/events-api";
import { filterPhase5Events, phase5EventMonth, phase5MapEvents, summarizePhase5Events, type Phase5Filters } from "@/lib/phase5-view-model";
import styles from "./explore.module.css";

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; events: Phase5Event[]; reviews: BridgeCandidateReview[] };

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
  const [issueQuery, setIssueQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("event"));
  const [cluster, setCluster] = useState<{ label: string; events: EventRead[] } | null>(null);
  const paramsRef = useRef(new URLSearchParams(search));
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [source, setSource] = useState<BridgeSource | null>(null);
  const [sourceError, setSourceError] = useState(false);
  const [issueSource, setIssueSource] = useState<BridgeSource | null>(null);
  const [issueSourceError, setIssueSourceError] = useState<string | null>(null);
  const load = useCallback(() => {
    setState({ kind: "loading" });
    void Promise.all([listPhase5Events(), listBridgeCandidateReviews()]).then(([events, reviews]) => setState({ kind: "ready", events, reviews })).catch(() => setState({ kind: "error" }));
  }, []);
  useEffect(() => {
    void Promise.all([listPhase5Events(), listBridgeCandidateReviews()]).then(([events, reviews]) => setState({ kind: "ready", events, reviews })).catch(() => setState({ kind: "error" }));
  }, []);
  useEffect(() => {
    paramsRef.current = new URLSearchParams(search);
    if (!searchTimerRef.current && searchInputRef.current) searchInputRef.current.value = filters.q;
  }, [search, filters.q]);
  useEffect(() => () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); }, []);
  const stories = useMemo(() => state.kind === "ready" ? buildMainIssueStories(state.reviews, state.events) : [], [state]);
  const atlas = useMemo(() => state.kind === "ready" ? buildIssueAtlas(stories, state.events) : null, [stories, state]);
  const geography = useMemo(() => buildExploreCountries(stories, atlas?.places ?? []), [stories, atlas]);
  const linkedEvents = useMemo(() => eventsForIssueSet(stories), [stories]);
  const issueParam = searchParams.get("issue");
  const eventParam = searchParams.get("event");
  const eventSourceId = state.kind === "ready" && eventParam ? state.events.find((event) => event.id === eventParam)?.phase1_source_id : undefined;
  const selectedIssue = stories.find((issue) => issue.sourceId === (issueParam ?? eventSourceId));
  const countryCode = searchParams.get("country")?.toUpperCase() ?? null;
  const selectedCountry = geography.countries.find((country) => country.code === countryCode);
  const countryIssueIds = new Set(selectedCountry?.issueSourceIds ?? []);
  const scopedStories = selectedIssue ? [selectedIssue] : selectedCountry ? stories.filter((issue) => countryIssueIds.has(issue.sourceId)) : stories;
  const scopedEvents = eventsForIssueSet(scopedStories);
  const scopedSummary = summarizePhase5Events(scopedEvents);
  const visible = filterPhase5Events(scopedEvents, filters);
  const summary = summarizePhase5Events(visible);
  const mapEvents = selectedIssue ? phase5MapEvents(scopedEvents) : [];
  const issuePlaces = selectedIssue ? atlas?.places.filter((place) => place.issueSourceId === selectedIssue.sourceId) ?? [] : [];
  const datedEvents = [...visible].filter((event) => phase5EventMonth(event) !== null).sort((a, b) => (a.timeline.event_date ?? "").localeCompare(b.timeline.event_date ?? ""));
  const undatedEvents = visible.filter((event) => phase5EventMonth(event) === null);
  const selected = state.kind === "ready" && scopedEvents.some((event) => event.id === selectedId) ? state.events.find((event) => event.id === selectedId) : undefined;
  const matchingIssues = scopedStories.filter((issue) => `${issue.label} ${issue.sourceTitle}`.toLocaleLowerCase().includes(issueQuery.trim().toLocaleLowerCase()));
  const scopeLabel = selectedIssue ? selectedIssue.label : selectedCountry ? `Issues related to ${selectedCountry.name}` : "All Main Issues";
  const countryHref = selectedCountry ? `/explore?country=${selectedCountry.code}` : "/explore";
  const issueHref = (sourceId: string) => `/explore?issue=${encodeURIComponent(sourceId)}${selectedCountry ? `&country=${selectedCountry.code}` : ""}`;
  const filterHref = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (selectedIssue) params.set("issue", selectedIssue.sourceId);
    if (selectedCountry) params.set("country", selectedCountry.code);
    params.set(key, value);
    return `/explore?${params}#explore-records`;
  };
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
  function openIssueSource(sourceId: string) {
    setIssueSource(null); setIssueSourceError(null);
    void getBridgeSource(sourceId).then(setIssueSource).catch(() => setIssueSourceError(sourceId));
  }
  return <AppShell currentPath="/explore"><div className={styles.explore}>
    <header className={styles.header}><div><p className="eyebrow">Terra Space / Explore / {selectedIssue ? "One Main Issue" : "All Issues"}</p><h1>{selectedIssue ? "Follow the issue." : "Where do the issues connect?"}</h1><p>{selectedIssue ? "See every related place, then trace linked events through time and source evidence." : "Find geographic patterns across Main Issues, then open one to examine the full story."}</p></div>
      <div className={styles.otherViews}><Link href="/issues">Earlier Issues</Link><Link href="/events">Earlier events</Link></div></header>
    <p className={styles.scope}>{selectedIssue ? <><Link href="/explore">All Issues</Link>{selectedCountry && <><span>›</span><Link href={countryHref}>{selectedCountry.name}</Link></>}<span>›</span><span>One Main Issue</span></> : <><span>Current Phase 2 Main Issues</span><span>· {state.kind === "ready" ? `${stories.length} issues / ${linkedEvents.length} linked Phase 5 events` : "Read-only pipeline output"}</span></>}</p>
    {state.kind === "loading" && <p role="status">Loading Main Issues and linked events…</p>}
    {state.kind === "error" && <div role="alert" className={styles.notice}><p>Could not load Main Issues or linked events.</p><button onClick={load} type="button">Retry</button></div>}
    {state.kind === "ready" && <>
      {stories.length === 0 ? <p className={styles.notice}>No current Phase 2 Main Issues yet.</p> : selectedIssue ? <>
        <section className={styles.issueIntro} aria-label="Selected Main Issue context"><div><span>MAIN ISSUE / PHASE 2</span><h2>{selectedIssue.label}</h2><p>{selectedIssue.summary || "No summary retained for this Issue."}</p>{selectedIssue.evidenceQuote && selectedIssue.evidenceQuote.trim() !== selectedIssue.summary.trim() && <blockquote>{selectedIssue.evidenceQuote}</blockquote>}</div><div className={styles.sourceLink}><span>Source: {selectedIssue.sourceTitle}</span><button type="button" onClick={() => openIssueSource(selectedIssue.sourceId)}>Read source article ↗</button>{issueSourceError === selectedIssue.sourceId && <small role="alert">Could not load the source article.</small>}</div></section>
        {issueSource?.id === selectedIssue.sourceId && <section className={styles.sourcePanel} aria-label="Main Issue source article"><div><h3>{issueSource.title}</h3><button type="button" onClick={() => setIssueSource(null)}>Close ×</button></div><p>{issueSource.raw_content_text}</p></section>}
        <div className={styles.issueStage}>
          <section id="explore-place" className={styles.map} aria-label="Full Issue event map"><div className={styles.mapHeader}><div className={styles.heading}><span>01 / ISSUE PLACES</span><h2>Every verified related place.</h2><p>All linked event locations are shown, including places outside {selectedCountry?.name ?? "the country you came from"}.</p></div><div className={styles.mapTelemetry}><div><strong>{issuePlaces.length}</strong><span>unique places</span></div><div><strong>{scopedSummary.total - scopedSummary.mapped}</strong><span>events unmapped</span></div></div></div>
            {selectedCountry && <p className={styles.entryCountry}>Entered via {selectedCountry.name} · Full Issue shown</p>}
            {mapEvents.some((event) => event.locations.length > 0) ? <EventGlobe events={mapEvents} onSelect={(event) => openEvent(event.id)} onSelectCluster={(events, label) => setCluster({ events, label })} selectedEventId={selectedId ?? undefined} /> : <p className={styles.mapEmpty}>No resolved Event Geography for this Issue. Its events remain in the index below.</p>}
            {cluster && <div className={styles.cluster} role="region" aria-label={`Events at ${cluster.label}`}><div><strong>{cluster.label}</strong><button type="button" onClick={() => setCluster(null)} aria-label="Close shared marker">×</button></div><ul>{cluster.events.map((event) => <li key={event.id}><button type="button" onClick={(click) => { openEvent(event.id, click.currentTarget); setCluster(null); }}>{event.title}</button></li>)}</ul></div>}
            <p className={styles.caption}>Only resolved Event Geography appears on this map. Actor locations are excluded.</p>
          </section>
          <aside className={styles.issueProfile} aria-label="Issue statistics"><span>ISSUE PROFILE / ALL LINKED EVENTS</span><strong className={styles.profileTotal}>{scopedSummary.total}</strong><p>linked Phase 5 events</p><dl><div><dt>Places</dt><dd>{issuePlaces.length} verified · {scopedSummary.total - scopedSummary.mapped} events unmapped</dd></div><div><dt>Dates</dt><dd>{scopedSummary.total - scopedSummary.undated} known · {scopedSummary.undated} unknown</dd></div><div><dt>Qualification</dt><dd>{scopedSummary.final} Final · {scopedSummary.notFinal} Not Final · {scopedSummary.unqualified} Pending</dd></div></dl><h3>Event types</h3><div className={styles.profileTypes}>{scopedSummary.byType.map((item) => <Link key={item.label} href={filterHref("type", item.label)}><span>{item.label}</span><strong>{item.count}</strong></Link>)}</div><a className={styles.profileAction} href="#explore-records">Inspect all event records →</a></aside>
        </div>
      </> : <>
        <section className={styles.overviewStage} aria-label="All Issues geographic overview">
          <div id="explore-place" className={styles.countryMap}><div className={styles.countryMapHead}><span>01 / VERIFIED RELATED PLACES</span><h2>Place reveals the pattern.</h2><p>Each marker counts distinct Main Issues connected to that country through resolved Event Geography.</p></div>
            {geography.countries.length > 0 ? <ExploreCountryMap countries={geography.countries} selectedCode={selectedCountry?.code ?? null} onSelectCountry={(code) => { setIssueQuery(""); router.push(`/explore?country=${code}`); }} /> : <p className={styles.mapEmpty}>No verified related country yet. Every Main Issue remains searchable beside the map.</p>}
            <div className={styles.countryRail} role="group" aria-label="Countries with related Issues">{geography.countries.map((country) => <Link key={country.code} href={`/explore?country=${country.code}`} data-selected={country.code === selectedCountry?.code}>{country.name} <strong>{country.issueCount}</strong></Link>)}</div>
            <p className={styles.caption}>One Issue counts once per country. An Issue can count in more than one country. Markers sit at verified related locations; actor geography is excluded.</p>
          </div>
          <aside className={styles.countryLens} aria-label="Country lens and Main Issues"><span>{selectedCountry ? "COUNTRY LENS / SELECTED" : "ALL ISSUES / COUNTRY LENS"}</span><h2>{selectedCountry?.name ?? "Across all countries"}</h2><p className={styles.lensCount}><strong>{scopedStories.length}</strong> Main Issues</p><p>{selectedCountry ? "with verified related event locations here" : `${geography.countries.length} countries with verified related event locations`}</p>{selectedCountry && <Link className={styles.clearCountry} href="/explore">Clear country selection ×</Link>}
            <label className={styles.issueSearch}>Find a Main Issue<input type="search" value={issueQuery} onChange={(event) => setIssueQuery(event.target.value)} placeholder="Search Issue or source" /></label>
            <div className={styles.countryIssueList} role="group" aria-label="Main Issues in current scope">{matchingIssues.length ? matchingIssues.map((issue) => <Link key={issue.sourceId} href={issueHref(issue.sourceId)}><strong>{issue.label}</strong><small>{issue.events.length} linked events · {issue.sourceTitle}</small><span aria-hidden="true">↗</span></Link>) : <p>No Issues match this search in the current scope.</p>}</div>
            {geography.withoutVerifiedCountry.length > 0 && !selectedCountry && <details className={styles.unlocatedIssues}><summary>{geography.withoutVerifiedCountry.length} Issues without a verified country</summary><div>{geography.withoutVerifiedCountry.map((issue) => <Link key={issue.sourceId} href={issueHref(issue.sourceId)}>{issue.label} ↗</Link>)}</div></details>}
          </aside>
        </section>
        <section className={styles.patternBand} aria-label="Patterns for current Issues"><div className={styles.patternHeading}><span>02 / SUPPORTING PATTERNS</span><h2>{selectedCountry ? `Issues related to ${selectedCountry.name}` : "Across all Main Issues"}</h2><p>Statistics include all events linked to these Issues, wherever those events occurred.</p></div>
          <div className={styles.patternTotals}><p><strong>{scopedStories.length}</strong><span>Main Issues</span></p><p><strong>{scopedSummary.total}</strong><span>linked events</span></p><p><strong>{geography.withoutVerifiedCountry.length}</strong><span>Issues without a verified country overall</span></p></div>
          <div className={styles.patternColumns}><div><h3>Event types</h3>{scopedSummary.byType.slice(0, 5).map((item) => <Link key={item.label} href={filterHref("type", item.label)}><span>{item.label}</span><strong>{item.count}</strong></Link>)}</div><div><h3>Time coverage</h3><a href="#explore-time"><span>Known event dates</span><strong>{scopedSummary.total - scopedSummary.undated}</strong></a><Link href={filterHref("date", "unknown")}><span>Dates unknown</span><strong>{scopedSummary.undated}</strong></Link><small>Publication dates are not event dates.</small></div><div><h3>Qualification</h3><Link href={filterHref("status", "FINAL")}><span>Final</span><strong>{scopedSummary.final}</strong></Link><Link href={filterHref("status", "NOT_FINAL")}><span>Not Final</span><strong>{scopedSummary.notFinal}</strong></Link><Link href={filterHref("status", "PENDING")}><span>Pending</span><strong>{scopedSummary.unqualified}</strong></Link></div></div>
        </section>
      </>}
      {stories.length > 0 && <>
      <p className={styles.selectionScope}>Event records for {scopeLabel} · {summary.total} shown from {scopedSummary.total} linked events</p>
      <div className={styles.filters} aria-label="Explore filters"><label className={styles.searchLabel}>Search events<input ref={searchInputRef} type="search" placeholder="Search titles or evidence" defaultValue={filters.q} onChange={(event) => scheduleSearch(event.target.value)} /></label>
        <label>Qualification<select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}><option value="all">All statuses</option><option value="FINAL">Final</option><option value="NOT_FINAL">Not Final</option><option value="PENDING">Pending</option></select></label>
        <label>Event type<select value={filters.type} onChange={(event) => updateFilter("type", event.target.value)}><option value="">All types</option>{[...new Set(state.events.map((event) => event.classification.event_type_name || "Unclassified"))].sort().map((type) => <option key={type}>{type}</option>)}</select></label>
      </div>
      {(filters.month || filters.date || filters.location) && <div className={styles.activeFilters} aria-label="Chart filters">{filters.month && <button type="button" onClick={() => updateFilter("month", "")}>Month {filters.month} ×</button>}{filters.date && <button type="button" onClick={() => updateFilter("date", "")}>Date unknown ×</button>}{filters.location && <button type="button" onClick={() => updateFilter("location", "")}>Mapped only ×</button>}</div>}
      {visible.length > 0 && <nav className={styles.viewNav} aria-label="Explore views"><a href="#explore-place"><span>01</span> Place <strong>{summary.mapped} mapped</strong></a><a href="#explore-time"><span>02</span> Time <strong>{datedEvents.length} dated</strong></a><a href="#explore-records"><span>03</span> Records <strong>{summary.total} shown</strong></a></nav>}
      {scopedEvents.length === 0 ? <p className={styles.notice}>No Phase 5 events are linked to these Main Issues yet.</p> : visible.length === 0 ? <p className={styles.notice}>No events match these filters. Change a filter to see more.</p> : <div className={styles.grid}>
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
        {stories.find((issue) => issue.sourceId === selected.phase1_source_id) && <p>From Main Issue: {stories.find((issue) => issue.sourceId === selected.phase1_source_id)?.label}</p>}
        <p>{selected.description}</p><h3>Source evidence</h3><blockquote>{selected.evidence_quote || "No evidence quote retained."}</blockquote>
        <dl><dt>Event date</dt><dd>{phase5EventMonth(selected) ? selected.timeline.event_date : "Unknown"}</dd><dt>Publication reference</dt><dd>{selected.timeline.reference_date ?? "None"}</dd><dt>Event geography</dt><dd>{phase5MapEvents([selected])[0].locations.length ? "Resolved event location" : "No resolved event location"}</dd></dl>
        {selected.qualification.reason_codes.length > 0 && <><h3>Qualification reasons</h3><ul>{selected.qualification.reason_codes.map((reason) => <li key={reason}>{reason}</li>)}</ul></>}
        {selected.timeline.limitations.length > 0 && <p>Limitations: {selected.timeline.limitations.join(", ")}</p>}
        <button type="button" onClick={() => openSource(selected)}>Open source record</button>
        {source && <section><h3>{source.title}</h3><p>{source.raw_content_text}</p></section>}
        {sourceError && <p role="alert">Could not load the source record. Event evidence remains available above.</p>}
      </aside>}
      </>}
    </>}
  </div></AppShell>;
}
