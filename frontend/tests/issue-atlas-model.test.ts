import { describe, expect, it } from "vitest";
import { buildIssueAtlas } from "@/lib/issue-atlas-model";
import type { MainIssueStory } from "@/lib/main-issue-view-model";
import type { Phase5Event } from "@/lib/bridge-api";

function event(id: string, source: string, type: string | null, places: Record<string, unknown>[], actors: Record<string, unknown>[] = []): Phase5Event {
  return { id, phase1_source_id: source, classification: { event_type_name: type }, event_geographies: places, actor_geographies: actors } as Phase5Event;
}

function story(sourceId: string, events: Phase5Event[]): MainIssueStory {
  return { sourceId, sourceTitle: `Source ${sourceId}`, label: `Issue ${sourceId}`, summary: "", evidenceQuote: "", processedAt: "2026-09-01", events };
}

describe("buildIssueAtlas", () => {
  it("keeps one marker per source and place when a review appears twice", () => {
    const place = { geographic_reference_id: "ref-a", canonical_name: "City", country_iso3: "ARG", latitude: -34, longitude: -58, resolution_status: "RESOLVED" };
    const linked = event("event-a", "source-a", "Diplomacy", [place]);
    const result = buildIssueAtlas([story("source-a", [linked]), story("source-a", [linked])], [linked]);
    expect(result.places).toHaveLength(1);
    expect(result.metrics).toMatchObject({ issueCount: 1, eventCount: 1, countryCount: 1 });
  });

  it("collapses repeated event places within an Issue while preserving every Issue and unique place", () => {
    const shared = { geographic_reference_id: "place-1", canonical_geography_name: "Buenos Aires", country_iso3: "arg", latitude: -34.6, longitude: -58.4, resolution_status: "RESOLVED" };
    const second = { geographic_reference_id: "place-2", canonical_geography_name: "Montevideo", country_iso3: "URY", latitude: -34.9, longitude: -56.2, resolution_status: "RESOLVED" };
    const noCountry = { canonical_name: "Sea area", latitude: -33, longitude: -55, resolution_status: "RESOLVED" };
    const a1 = event("a1", "source-a", "Diplomacy", [shared, second, noCountry, { ...shared, resolution_status: "UNRESOLVED" }], [{ resolution_status: "RESOLVED", latitude: 1, longitude: 1, country_iso3: "USA" }]);
    const a2 = event("a2", "source-a", null, [shared, { ...shared, latitude: 99 }]);
    const b1 = event("b1", "source-b", "Diplomacy", [{ ...shared, geographic_reference_id: "other-reference", canonical_name: "Overlapping place" }]);
    const orphan = event("orphan", "source-x", "Security", [shared]);
    const stories = [story("source-a", [a1, a2]), story("source-b", [b1]), story("source-c", [])];
    const result = buildIssueAtlas(stories, [a1, a2, b1, orphan]);
    expect(result.places.filter((place) => place.issueSourceId === "source-a")).toHaveLength(3);
    expect(result.places.filter((place) => place.issueSourceId === "source-b")).toHaveLength(1);
    expect(result.places.find((place) => place.placeLabel === "Sea area")?.countryIso3).toBeNull();
    expect(result.metrics).toMatchObject({ issueCount: 3, countryCount: 2, eventCount: 3, unmappedIssueCount: 1, unlinkedEventCount: 1 });
    expect(result.metrics.byType).toEqual([{ label: "Diplomacy", count: 2 }, { label: "Unclassified", count: 1 }]);
    expect(result.places.every((place) => place.latitude <= 90 && place.latitude >= -90)).toBe(true);
    expect(stories[0].events).toHaveLength(2);
  });
});
