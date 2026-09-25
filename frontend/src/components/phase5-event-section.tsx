"use client";

import { useState } from "react";
import type { Phase5Event } from "@/lib/bridge-api";
import { EventGlobe } from "@/components/event-globe";
import type { EventRead, LocationRead } from "@/lib/events-api";

function mapEvents(events: Phase5Event[]): EventRead[] {
  return events.map((event) => ({
    id: event.id,
    title: event.title,
    summary: event.description,
    event_date: event.timeline.event_date,
    event_date_precision: event.timeline.event_date_precision as EventRead["event_date_precision"],
    epistemic_status: "unknown",
    event_type: null,
    actors: [],
    // Only Phase 5C Event Geography rows marked RESOLVED get a pin. Actor Geography is never
    // used as a substitute location for an event.
    locations: event.event_geographies.filter((place) => place.resolution_status === "RESOLVED").map((place, index) => ({
      id: String(place.geographic_reference_id ?? `${event.id}-${index}`),
      country: typeof place.country_iso3 === "string" ? place.country_iso3 : null,
      admin1: null,
      city_regency: typeof place.canonical_name === "string" ? place.canonical_name : null,
      latitude: typeof place.latitude === "number" ? place.latitude : null,
      longitude: typeof place.longitude === "number" ? place.longitude : null,
      coordinate_precision: place.coordinate_precision === "country" || place.coordinate_precision === "admin1" || place.coordinate_precision === "city_regency" ? place.coordinate_precision : null,
    })) as LocationRead[],
    sources: [], duplicate_flags: [], extraction_incomplete: false, extraction_incomplete_stages: [],
    created_at: event.created_at, updated_at: event.updated_at,
  }));
}

export function Phase5EventSection({ events, showMap = true }: { events: Phase5Event[]; showMap?: boolean }) {
  const geographyMapEvents = mapEvents(events);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = events.find((event) => event.id === selectedId) ?? null;
  return (
    <section aria-label="Phase 5 pipeline records" className="phase5-event-section">
      <h2>Phase 5 pipeline records</h2>
      <p>Shown separately from older bridge events. These records are read-only and remain visible even when not Final.</p>
      {events.length === 0 ? <p>No retained Phase 5 records yet.</p> : <ul>
        {events.map((event) => <li key={event.id}>
          <button className="event-list-title" onClick={() => setSelectedId(event.id)} type="button">{event.title}</button>
          <p>{event.qualification.status === "FINAL" ? "Final" : event.qualification.status === "NOT_FINAL" ? "Not Final" : "Pending"} · {event.classification.status === "CLASSIFIED" ? event.classification.event_type_name : "Unclassified"}</p>
          {event.timeline.event_date ? <p>Event date: {event.timeline.event_date}</p> : event.timeline.reference_date ? <p>Publication date reference: {event.timeline.reference_date}</p> : <p>Event date unknown</p>}
          {event.qualification.reason_codes.length > 0 && <p>Qualification reasons: {event.qualification.reason_codes.join(", ")}</p>}
          {event.event_geographies.length === 0 && <p>Event geography: {event.event_geography_status ?? "not resolved"}</p>}
        </li>)}
      </ul>}
      {selected && <section aria-label="Phase 5 record detail" className="phase5-event-detail">
        <h3>Phase 5 record detail</h3>
        <p><strong>{selected.title}</strong></p>
        <p><span className="field-label">Source ID</span> {selected.phase1_source_id}</p>
        <p><span className="field-label">Description</span> {selected.description}</p>
        <p><span className="field-label">Evidence</span> {selected.evidence_quote}</p>
        <p>Phase 3 result: {selected.phase3_result_status}{selected.phase3_result_reason ? ` — ${selected.phase3_result_reason}` : ""}</p>
        <p>Phase 4: {selected.phase4_status}</p>
        <p>Phase 4 extraction/safeguard: {selected.phase4_extraction_status} / {selected.phase4_safeguard_status}</p>
        {selected.phase4_review_reason && <p>{selected.phase4_review_reason}</p>}
        {selected.phase4_error_message && <p>{selected.phase4_error_message}</p>}
        <p>Classification: {selected.classification.status ?? "Not processed"}{selected.classification.reason ? ` — ${selected.classification.reason}` : ""}</p>
        <p>Timeline: {selected.timeline.event_date ?? "Event date unknown"}; {selected.timeline.reference_basis ?? "no reference basis"}</p>
        {selected.timeline.limitations.length > 0 && <p>Geography/date limitations: {selected.timeline.limitations.join(", ")}</p>}
        <p>Possible duplicate recommendations: {selected.duplicate_recommendations.length}</p>
        <p>Extracted facts</p><pre>{JSON.stringify(selected.facts, null, 2)}</pre>
      </section>}
      <section aria-label="Phase 5 timeline">
        <h3>Phase 5 timeline</h3>
        {events.map((event) => <p key={event.id}>{event.title}: {event.timeline.event_date ?? (event.timeline.reference_date ? `Publication date reference: ${event.timeline.reference_date}` : "Event date unknown")}</p>)}
      </section>
      {showMap && <section aria-label="Phase 5 Event Geography map">
        <h3>Phase 5 Event Geography map</h3>
        <p>Only resolved Event Geography coordinates appear here. This map does not use Actor Network locations.</p>
        {geographyMapEvents.some((event) => event.locations.length > 0)
          ? <EventGlobe events={geographyMapEvents} onSelect={(event) => setSelectedId(event.id)} selectedEventId={selectedId ?? undefined} />
          : <p>No resolved Event Geography coordinates yet.</p>}
      </section>}
    </section>
  );
}
