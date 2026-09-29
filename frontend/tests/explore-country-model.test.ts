import { describe, expect, it } from "vitest";
import { buildExploreCountries, eventsForIssueSet } from "@/lib/explore-country-model";
import { buildIssueAtlas } from "@/lib/issue-atlas-model";
import type { MainIssueStory } from "@/lib/main-issue-view-model";
import type { Phase5Event } from "@/lib/bridge-api";

function event(id: string, sourceId: string, places: Record<string, unknown>[], actors: Record<string, unknown>[] = []): Phase5Event {
  return { id, phase1_source_id: sourceId, classification: { event_type_name: "Diplomacy" }, event_geographies: places, actor_geographies: actors } as Phase5Event;
}

function story(sourceId: string, events: Phase5Event[]): MainIssueStory {
  return { sourceId, sourceTitle: sourceId, label: sourceId, summary: "", evidenceQuote: "", processedAt: "2026-09-01", events };
}

const place = (country: string, latitude: number, longitude: number) => ({ resolution_status: "RESOLVED", country_iso3: country, latitude, longitude });

describe("Explore country model", () => {
  it("counts a Main Issue once per verified country and excludes actor-only or invalid geography", () => {
    const a1 = event("a1", "a", [place("ARG", -34, -58), place("ARG", -35, -59), place("URY", -34, -56)]);
    const a2 = event("a2", "a", [place("ARG", -34, -58)]);
    const b1 = event("b1", "b", [place("ARG", -33, -57)]);
    const c1 = event("c1", "c", [{ ...place("BRA", 92, -47) }], [place("USA", 38, -77)]);
    const stories = [story("a", [a1, a2]), story("b", [b1]), story("c", [c1])];
    const atlas = buildIssueAtlas(stories, [a1, a2, b1, c1]);
    const result = buildExploreCountries(stories, atlas.places);
    expect(result.countries.map(({ code, issueCount }) => [code, issueCount])).toEqual([["ARG", 2], ["URY", 1]]);
    expect(result.countries.find((country) => country.code === "ARG")?.issueSourceIds).toEqual(["a", "b"]);
    expect(result.withoutVerifiedCountry.map((issue) => issue.sourceId)).toEqual(["c"]);
  });

  it("keeps every event for a country-selected Issue, including events elsewhere", () => {
    const argentina = event("in-country", "a", [place("ARG", -34, -58)]);
    const elsewhere = event("elsewhere", "a", [place("URY", -34, -56)]);
    const stories = [story("a", [argentina, elsewhere])];
    const { countries } = buildExploreCountries(stories, buildIssueAtlas(stories, [argentina, elsewhere]).places);
    const selectedIds = new Set(countries.find((country) => country.code === "ARG")?.issueSourceIds);
    expect(eventsForIssueSet(stories.filter((issue) => selectedIds.has(issue.sourceId))).map((item) => item.id)).toEqual(["in-country", "elsewhere"]);
  });
});
