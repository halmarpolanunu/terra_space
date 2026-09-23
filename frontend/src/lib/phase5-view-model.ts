import type { Phase5Event } from "@/lib/bridge-api";
import type { EventRead, LocationRead } from "@/lib/events-api";

export type Phase5Filters = { q: string; status: "all" | "FINAL" | "NOT_FINAL"; type: string };

export function filterPhase5Events(events: Phase5Event[], filters: Phase5Filters): Phase5Event[] {
  const query = filters.q.trim().toLocaleLowerCase();
  return events.filter((event) =>
    (filters.status === "all" || event.qualification.status === filters.status) &&
    (!filters.type || event.classification.event_type_name === filters.type) &&
    (!query || `${event.title} ${event.description} ${event.evidence_quote}`.toLocaleLowerCase().includes(query))
  );
}

export function phase5MapEvents(events: Phase5Event[]): EventRead[] {
  return events.map((event) => ({
    id: event.id, title: event.title, summary: event.description,
    event_date: event.timeline.event_date,
    event_date_precision: event.timeline.event_date_precision as EventRead["event_date_precision"],
    epistemic_status: "unknown", event_type: null, actors: [],
    locations: event.event_geographies.flatMap((place, index): LocationRead[] => {
      if (place.resolution_status !== "RESOLVED" || typeof place.latitude !== "number" || typeof place.longitude !== "number" || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude) || Math.abs(place.latitude) > 90 || Math.abs(place.longitude) > 180) return [];
      return [{ id: String(place.geographic_reference_id ?? `${event.id}-${index}`),
        country: typeof place.country_iso3 === "string" ? place.country_iso3 : null,
        admin1: null, city_regency: typeof place.canonical_name === "string" ? place.canonical_name : null,
        latitude: place.latitude, longitude: place.longitude,
        coordinate_precision: place.coordinate_precision === "country" || place.coordinate_precision === "admin1" || place.coordinate_precision === "city_regency" ? place.coordinate_precision : null }];
    }),
    sources: [], duplicate_flags: [], extraction_incomplete: false, extraction_incomplete_stages: [],
    created_at: event.created_at, updated_at: event.updated_at,
  }));
}

export function summarizePhase5Events(events: Phase5Event[]) {
  const typeCounts = new Map<string, number>();
  const monthCounts = new Map<string, number>();
  for (const event of events) {
    const type = event.classification.event_type_name || "Unclassified";
    typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
    const date = event.timeline.event_date;
    if (date && /^\d{4}-\d{2}(?:-\d{2})?$/.test(date)) {
      const month = date.slice(0, 7);
      monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
    }
  }
  return {
    total: events.length,
    final: events.filter((event) => event.qualification.status === "FINAL").length,
    notFinal: events.filter((event) => event.qualification.status === "NOT_FINAL").length,
    unqualified: events.filter((event) => event.qualification.status === null).length,
    mapped: phase5MapEvents(events).filter((event) => event.locations.length > 0).length,
    undated: events.filter((event) => !event.timeline.event_date || !/^\d{4}-\d{2}(?:-\d{2})?$/.test(event.timeline.event_date)).length,
    byType: [...typeCounts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    byMonth: [...monthCounts].sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count })),
  };
}
