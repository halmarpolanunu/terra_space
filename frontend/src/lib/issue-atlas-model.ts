import type { Phase5Event } from "@/lib/bridge-api";
import type { MainIssueStory } from "@/lib/main-issue-view-model";

export type IssueAtlasPlace = {
  id: string;
  issueSourceId: string;
  issueLabel: string;
  placeLabel: string;
  latitude: number;
  longitude: number;
  countryIso3: string | null;
};

export type IssueAtlasMetrics = {
  issueCount: number;
  countryCount: number;
  eventCount: number;
  byType: { label: string; count: number }[];
  unmappedIssueCount: number;
  unlinkedEventCount: number;
};

function name(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function country(value: unknown): string | null {
  const code = name(value)?.toUpperCase() ?? null;
  return code && /^[A-Z]{3}$/.test(code) ? code : null;
}

function resolvedPlace(place: Record<string, unknown>) {
  const latitude = place.latitude;
  const longitude = place.longitude;
  if (place.resolution_status !== "RESOLVED" || typeof latitude !== "number" || typeof longitude !== "number" ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  const placeLabel = name(place.canonical_geography_name) ?? name(place.canonical_name) ?? name(place.geography_name) ?? "Related location";
  const countryIso3 = country(place.country_iso3);
  const reference = name(place.geographic_reference_id);
  const identity = reference ? `reference:${reference}` : `place:${placeLabel.toLocaleLowerCase()}:${countryIso3 ?? ""}:${latitude}:${longitude}`;
  return { latitude, longitude, placeLabel, countryIso3, identity };
}

export function buildIssueAtlas(stories: MainIssueStory[], allEvents: Phase5Event[]): { places: IssueAtlasPlace[]; metrics: IssueAtlasMetrics } {
  const places: IssueAtlasPlace[] = [];
  const linkedById = new Map<string, Phase5Event>();
  let unmappedIssueCount = 0;

  for (const story of stories) {
    const seenPlaces = new Set<string>();
    for (const event of story.events) {
      linkedById.set(event.id, event);
      for (const raw of event.event_geographies) {
        const place = resolvedPlace(raw);
        if (!place || seenPlaces.has(place.identity)) continue;
        seenPlaces.add(place.identity);
        places.push({
          id: `${story.sourceId}:${place.identity}`,
          issueSourceId: story.sourceId,
          issueLabel: story.label,
          placeLabel: place.placeLabel,
          latitude: place.latitude,
          longitude: place.longitude,
          countryIso3: place.countryIso3,
        });
      }
    }
    if (seenPlaces.size === 0) unmappedIssueCount++;
  }

  const byType = new Map<string, number>();
  for (const event of linkedById.values()) {
    const label = event.classification.event_type_name?.trim() || "Unclassified";
    byType.set(label, (byType.get(label) ?? 0) + 1);
  }
  const metrics: IssueAtlasMetrics = {
    issueCount: new Set(stories.map((story) => story.sourceId)).size,
    countryCount: new Set(places.map((place) => place.countryIso3).filter((code): code is string => code !== null)).size,
    eventCount: linkedById.size,
    byType: [...byType].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    unmappedIssueCount,
    unlinkedEventCount: new Set(allEvents.filter((event) => !linkedById.has(event.id)).map((event) => event.id)).size,
  };
  return { places, metrics };
}
