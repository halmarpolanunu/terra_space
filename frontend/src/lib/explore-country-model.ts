import type { Phase5Event } from "@/lib/bridge-api";
import type { IssueAtlasPlace } from "@/lib/issue-atlas-model";
import type { MainIssueStory } from "@/lib/main-issue-view-model";
import countryNames from "@/lib/iso3-country-names.json";

const nameByCode = new Map(countryNames.map(({ code, name }) => [code, name]));

export type ExploreCountry = {
  code: string;
  name: string;
  issueSourceIds: string[];
  issueCount: number;
  /** A real verified related location used to position the country-count marker. */
  anchor: [number, number];
};

export function buildExploreCountries(stories: MainIssueStory[], places: IssueAtlasPlace[]) {
  const byCode = new Map<string, { issueIds: Set<string>; anchor: [number, number] }>();
  const locatedIds = new Set<string>();
  for (const place of places) {
    if (!place.countryIso3) continue;
    locatedIds.add(place.issueSourceId);
    const entry = byCode.get(place.countryIso3) ?? {
      issueIds: new Set<string>(),
      anchor: [place.longitude, place.latitude] as [number, number],
    };
    entry.issueIds.add(place.issueSourceId);
    byCode.set(place.countryIso3, entry);
  }

  const countries: ExploreCountry[] = [...byCode].map(([code, entry]) => ({
    code,
    name: nameByCode.get(code) ?? code,
    issueSourceIds: [...entry.issueIds],
    issueCount: entry.issueIds.size,
    anchor: entry.anchor,
  })).sort((a, b) => b.issueCount - a.issueCount || a.name.localeCompare(b.name));

  return {
    countries,
    withoutVerifiedCountry: stories.filter((story) => !locatedIds.has(story.sourceId)),
  };
}

export function eventsForIssueSet(stories: MainIssueStory[]): Phase5Event[] {
  return [...new Map(stories.flatMap((story) => story.events).map((event) => [event.id, event])).values()];
}
