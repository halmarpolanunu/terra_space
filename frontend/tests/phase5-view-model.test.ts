import { describe, expect, it } from "vitest";
import type { Phase5Event } from "@/lib/bridge-api";
import { filterPhase5Events, phase5MapEvents, summarizePhase5Events } from "@/lib/phase5-view-model";

const base: Phase5Event = {
  id: "one", phase1_source_id: "source", title: "One", description: "Evidence based event", evidence_quote: "Evidence",
  source_publication_date: null, event_path: "NORMAL", phase5a_status: "PREPARED",
  phase3_result_status: "READY", phase3_result_reason: null, phase3_candidate_status: "VALID", phase3_candidate_reason: null,
  phase4_status: "PREPARED", phase4_extraction_status: "FACTS_FOUND", phase4_safeguard_status: "ACCEPT", phase4_review_reason: null, phase4_error_message: null,
  facts: {}, classification: { status: "CLASSIFIED", event_type_id: "type", event_type_name: "Conflict", reason: null, safeguard_status: "ACCEPT", safeguard_reason: null },
  timeline: { status: "PREPARED", event_date: "2026-09-01", event_date_precision: "exact", reference_date: null, reference_basis: null, limitations: [], error_message: null },
  event_geographies: [{ resolution_status: "RESOLVED", latitude: 1, longitude: 2, canonical_name: "Place" }], event_geography_status: "RESOLVED",
  actor_geographies: [], actor_geography_status: null, qualification: { status: "FINAL", reason_codes: [] }, duplicate_recommendations: [],
  created_at: "2026-09-01T00:00:00Z", updated_at: "2026-09-01T00:00:00Z",
};
const notFinal: Phase5Event = { ...base, id: "two", title: "Two", event_geographies: [], actor_geographies: [{ resolution_status: "RESOLVED", latitude: 4, longitude: 5 }], qualification: { status: "NOT_FINAL", reason_codes: ["REVIEW"] } };
const pending: Phase5Event = { ...base, id: "three", title: "Three", timeline: { ...base.timeline, event_date: null, reference_date: "2026-09-03" }, event_geographies: [{ resolution_status: "UNRESOLVED", latitude: 4, longitude: 5 }], qualification: { status: null, reason_codes: [] } };

describe("Phase 5 view model", () => {
  it("separates qualification, unknown dates, and resolved event locations", () => {
    const events = [base, notFinal, pending];
    expect(summarizePhase5Events(events)).toMatchObject({ total: 3, final: 1, notFinal: 1, unqualified: 1, mapped: 1, undated: 1, byMonth: [{ month: "2026-09", count: 2 }] });
    expect(phase5MapEvents(events).flatMap((event) => event.locations)).toHaveLength(1);
    expect(filterPhase5Events(events, { q: "", status: "NOT_FINAL", type: "" })).toEqual([notFinal]);
    expect(events).toHaveLength(3);
  });
  it("opens the unclassified chart segment through its Explore filter", () => {
    const unclassified = { ...pending, classification: { ...pending.classification, event_type_name: null } };
    expect(filterPhase5Events([base, unclassified], { q: "", status: "all", type: "Unclassified" })).toEqual([unclassified]);
  });
  it("filters a chart month, unknown dates, and mapped event locations", () => {
    const events = [base, notFinal, pending];
    expect(filterPhase5Events(events, { q: "", status: "all", type: "", month: "2026-09" })).toEqual([base, notFinal]);
    expect(filterPhase5Events(events, { q: "", status: "all", type: "", date: "unknown" })).toEqual([pending]);
    expect(filterPhase5Events(events, { q: "", status: "all", type: "", location: "mapped" })).toEqual([base]);
  });
  it("keeps malformed dates unknown and uses the canonical geography name", () => {
    const malformed = { ...base, id: "bad-date", timeline: { ...base.timeline, event_date: "not-a-date" }, event_geographies: [{ resolution_status: "RESOLVED", latitude: 1, longitude: 2, canonical_geography_name: "Jakarta" }] };
    expect(summarizePhase5Events([malformed])).toMatchObject({ undated: 1, byMonth: [] });
    expect(filterPhase5Events([malformed], { q: "", status: "all", type: "", date: "unknown" })).toEqual([malformed]);
    expect(phase5MapEvents([malformed])[0].locations[0].city_regency).toBe("Jakarta");
  });
  it("filters pending qualification separately", () => {
    expect(filterPhase5Events([base, pending], { q: "", status: "PENDING", type: "" })).toEqual([pending]);
  });
});
