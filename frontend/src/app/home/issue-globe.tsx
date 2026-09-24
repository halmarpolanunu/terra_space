"use client";

import { WorldMap, type EventPinCluster, type EventPinFeatureCollection } from "@/components/world-map";
import type { IssueAtlasPlace } from "@/lib/issue-atlas-model";

type Props = {
  places: IssueAtlasPlace[];
  selectedIssueSourceId: string;
  onSelectIssue: (sourceId: string) => void;
  onSelectSharedPlace: (placeLabel: string, candidates: IssueAtlasPlace[]) => void;
};

export function buildIssueGlobeData(places: IssueAtlasPlace[]): { pins: EventPinFeatureCollection; clusters: EventPinCluster[] } {
  const grouped = new Map<string, IssueAtlasPlace[]>();
  for (const place of places) {
    const key = `${place.latitude}:${place.longitude}`;
    const group = grouped.get(key);
    if (group) group.push(place);
    else grouped.set(key, [place]);
  }
  const pins: EventPinFeatureCollection["features"] = [];
  const clusters: EventPinCluster[] = [];
  for (const group of grouped.values()) {
    const first = group[0];
    const coordinates: [number, number] = [first.longitude, first.latitude];
    if (group.length === 1) {
      pins.push({ type: "Feature", geometry: { type: "Point", coordinates }, properties: {
        eventId: first.id, title: first.issueLabel, locationLabel: first.placeLabel,
        epistemicStatus: "unknown", coordinatePrecision: "unknown", isException: false,
      } });
    } else {
      clusters.push({ coordinates, count: group.length, eventIds: group.map((place) => place.id),
        locationLabel: first.placeLabel, ariaLabel: `${group.length} Issue locations at ${first.placeLabel}` });
    }
  }
  return { pins: { type: "FeatureCollection", features: pins }, clusters };
}

export function IssueGlobe({ places, selectedIssueSourceId, onSelectIssue, onSelectSharedPlace }: Props) {
  const { pins, clusters } = buildIssueGlobeData(places);
  const byId = new Map(places.map((place) => [place.id, place]));
  const selectedPinIds = places.filter((place) => place.issueSourceId === selectedIssueSourceId).map((place) => place.id);
  const displayedClusters = clusters.map((cluster) => ({ ...cluster, selected: cluster.eventIds.some((id) => selectedPinIds.includes(id)) }));

  return <>
    <WorldMap geojson={pins} clusters={displayedClusters} selectedPinIds={selectedPinIds}
      onFeatureSelect={(markerId) => {
        const place = byId.get(markerId);
        if (place) onSelectIssue(place.issueSourceId);
      }}
      onClusterSelect={(cluster) => {
        const candidates = cluster.eventIds.flatMap((id) => { const place = byId.get(id); return place ? [place] : []; });
        const issues = new Set(candidates.map((place) => place.issueSourceId));
        if (issues.size === 1) onSelectIssue(candidates[0].issueSourceId);
        else if (candidates.length > 1) onSelectSharedPlace(cluster.locationLabel, candidates);
      }} />
    <details className="issue-place-list"><summary>Browse mapped Issue locations ({places.length})</summary>
      <ul>{places.map((place) => <li key={place.id}><button type="button" onClick={() => onSelectIssue(place.issueSourceId)}>
        {place.issueLabel} · {place.placeLabel}
      </button></li>)}</ul>
    </details>
  </>;
}
