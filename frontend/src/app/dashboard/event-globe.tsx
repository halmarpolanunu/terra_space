"use client";

import {
  WorldMap,
  type EventPinCluster,
  type EventPinFeatureCollection,
  type MapProjectionMode,
} from "@/components/world-map";
import type { EventRead, LocationRead } from "@/lib/events-api";

type EventGlobeProps = {
  events: EventRead[];
  onProjectionModeChange?: (mode: MapProjectionMode) => void;
  onSelect: (event: EventRead) => void;
  onSelectCluster?: (events: EventRead[], locationLabel: string) => void;
  selectedEventId?: string;
};

function locationLabel(location: LocationRead): string {
  return [location.city_regency, location.admin1, location.country].filter(Boolean).join(", ") || "Not stated";
}

export function locationIsResolved(location: LocationRead): boolean {
  return location.latitude !== null && location.longitude !== null;
}

export function countResolvedEventLocations(events: EventRead[]): number {
  return events.flatMap((event) => event.locations).filter(locationIsResolved).length;
}

export function buildEventMapData(
  events: EventRead[],
): { pins: EventPinFeatureCollection; clusters: EventPinCluster[] } {
  const groups = new Map<string, { event: EventRead; location: LocationRead }[]>();
  for (const event of events) {
    for (const location of event.locations) {
      if (!locationIsResolved(location)) continue;
      const key = `${location.latitude}:${location.longitude}`;
      const group = groups.get(key);
      if (group) group.push({ event, location });
      else groups.set(key, [{ event, location }]);
    }
  }

  const pins: EventPinFeatureCollection["features"] = [];
  const clusters: EventPinCluster[] = [];
  for (const group of groups.values()) {
    const eventIds = [...new Set(group.map(({ event }) => event.id))];
    const { location } = group[0];
    const coordinates: [number, number] = [location.longitude as number, location.latitude as number];
    if (eventIds.length === 1) {
      const { event, location: eventLocation } = group[0];
      pins.push({
        type: "Feature",
        geometry: { type: "Point", coordinates },
        properties: {
          eventId: event.id,
          title: event.title,
          locationLabel: locationLabel(eventLocation),
          epistemicStatus: event.epistemic_status,
          coordinatePrecision: eventLocation.coordinate_precision ?? "unknown",
        },
      });
    } else {
      clusters.push({ coordinates, count: eventIds.length, eventIds, locationLabel: locationLabel(location) });
    }
  }
  return { pins: { type: "FeatureCollection", features: pins }, clusters };
}

export function eventLocationsToFeatureCollection(events: EventRead[]): EventPinFeatureCollection {
  return buildEventMapData(events).pins;
}

export function eventLocationsToClusters(events: EventRead[]): EventPinCluster[] {
  return buildEventMapData(events).clusters;
}

export function EventGlobe({
  events,
  onProjectionModeChange,
  onSelect,
  onSelectCluster,
  selectedEventId,
}: EventGlobeProps) {
  const { pins, clusters } = buildEventMapData(events);

  return (
    <WorldMap
      clusters={clusters}
      geojson={pins}
      onClusterSelect={(cluster) => {
        const clusterEvents = events.filter((event) => cluster.eventIds.includes(event.id));
        onSelectCluster?.(clusterEvents, cluster.locationLabel);
      }}
      onProjectionModeChange={onProjectionModeChange}
      onFeatureSelect={(eventId) => {
        const event = events.find((candidate) => candidate.id === eventId);
        if (event) onSelect(event);
      }}
      selectedEventId={selectedEventId}
    />
  );
}
