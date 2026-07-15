"use client";

import {
  WorldMap,
  type EventPinFeatureCollection,
  type MapProjectionMode,
} from "@/components/world-map";
import type { EventRead, LocationRead } from "@/lib/events-api";

type EventGlobeProps = {
  events: EventRead[];
  onProjectionModeChange?: (mode: MapProjectionMode) => void;
  onSelect: (event: EventRead) => void;
  selectedEventId?: string;
};

function locationLabel(location: LocationRead): string {
  return [location.city_regency, location.admin1, location.country].filter(Boolean).join(", ") || "Not stated";
}

export function eventLocationsToFeatureCollection(events: EventRead[]): EventPinFeatureCollection {
  return {
    type: "FeatureCollection",
    features: events.flatMap((event) => event.locations.flatMap((location) => {
      if (location.latitude === null || location.longitude === null) return [];
      return [{
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [location.longitude, location.latitude] as [number, number] },
        properties: {
          eventId: event.id,
          title: event.title,
          locationLabel: locationLabel(location),
          epistemicStatus: event.epistemic_status,
          coordinatePrecision: location.coordinate_precision ?? "unknown",
        },
      }];
    })),
  };
}

export function EventGlobe({
  events,
  onProjectionModeChange,
  onSelect,
  selectedEventId,
}: EventGlobeProps) {
  const pins = eventLocationsToFeatureCollection(events);

  return (
    <WorldMap
      geojson={pins}
      onProjectionModeChange={onProjectionModeChange}
      onFeatureSelect={(eventId) => {
        const event = events.find((candidate) => candidate.id === eventId);
        if (event) onSelect(event);
      }}
      selectedEventId={selectedEventId}
    />
  );
}
