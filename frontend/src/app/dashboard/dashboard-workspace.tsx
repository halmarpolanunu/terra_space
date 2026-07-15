"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { EventDetail } from "@/app/events/event-detail";
import { DashboardSummary } from "@/app/dashboard/dashboard-summary";
import { EventGlobe, eventLocationsToFeatureCollection } from "@/app/dashboard/event-globe";
import { AppShell } from "@/components/app-shell";
import { EventFilterBar, type DocumentOption } from "@/components/event-filter-bar";
import { EventList } from "@/components/event-list";
import { EventTimeline } from "@/components/event-timeline";
import { FramedPanel } from "@/components/framed-panel";
import { PageHeader } from "@/components/page-header";
import { clearEventFilters, hasActiveEventFilters, parseEventFilters, toEventFilterSearch, type EventFilters, type EventSort } from "@/lib/event-filters";
import {
  getDashboardSummary,
  listActors,
  listEvents,
  listEventTypes,
  type ActorRead,
  type EventRead,
  type EventTypeRead,
} from "@/lib/events-api";
import { listDocuments } from "@/lib/documents-api";

export function DashboardWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const filters = useMemo(() => parseEventFilters(search), [search]);
  const [events, setEvents] = useState<EventRead[]>([]);
  const [eventTypes, setEventTypes] = useState<EventTypeRead[]>([]);
  const [actors, setActors] = useState<ActorRead[]>([]);
  const [documents, setDocuments] = useState<DocumentOption[]>([]);
  const [error, setError] = useState<string>();
  const [selectedEvent, setSelectedEvent] = useState<EventRead | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      listEvents(filters),
      getDashboardSummary(filters),
      listEventTypes(),
      listActors(),
      listDocuments(),
    ]).then(([nextEvents, , nextEventTypes, nextActors, nextDocuments]) => {
      if (!active) return;
      setEvents(nextEvents);
      setEventTypes(nextEventTypes);
      setActors(nextActors);
      setDocuments(nextDocuments.map(({ id, title }) => ({ id, title })));
      setError(undefined);
    }).catch(() => {
      if (active) setError("Terra Space backend is unavailable. Try again after it starts.");
    });
    return () => { active = false; };
  }, [filters]);

  function changeFilters(nextFilters: EventFilters) {
    setSelectedEvent(null);
    const nextSearch = toEventFilterSearch(nextFilters);
    router.replace(nextSearch ? `/dashboard?${nextSearch}` : "/dashboard");
  }

  function changeSort(sort: EventSort) {
    changeFilters({ ...filters, sort });
  }

  const dashboardPath = `/dashboard${search ? `?${search}` : ""}`;
  const eventsPath = `/events${search ? `?${search}` : ""}`;
  const markerCount = eventLocationsToFeatureCollection(events).features.length;

  return (
    <AppShell currentPath="/dashboard">
      <section aria-labelledby="dashboard-title" className="dashboard-page">
        <PageHeader
          action={<Link className="btn btn-primary" href={eventsPath}>Open Events</Link>}
          description="One filtered view across the summary, globe, timeline, and event list."
          eyebrow="Approved intelligence"
          title="Dashboard"
          titleId="dashboard-title"
        />
        <EventFilterBar actorOptions={actors} documentOptions={documents} eventTypeOptions={eventTypes} onChange={changeFilters} value={filters} />
        {error && <p className="document-error">{error}</p>}
        {selectedEvent ? <EventDetail event={selectedEvent} eventsPath={dashboardPath} onClose={() => setSelectedEvent(null)} /> : <>
          <DashboardSummary events={events} />
          <div className="dashboard-primary-grid">
            <FramedPanel className="dashboard-globe-panel" meta={<span aria-live="polite">Markers {markerCount}</span>} title="Event locations"><EventGlobe events={events} onSelect={setSelectedEvent} /></FramedPanel>
            <FramedPanel className="dashboard-timeline-panel" title="Timeline"><EventTimeline events={events} hasActiveFilters={hasActiveEventFilters(filters)} onClearFilters={() => changeFilters(clearEventFilters(filters))} sort={filters.sort} /></FramedPanel>
          </div>
          <FramedPanel className="dashboard-event-list-panel" title="Filtered events"><EventList events={events} hasActiveFilters={hasActiveEventFilters(filters)} onClearFilters={() => changeFilters(clearEventFilters(filters))} onSelect={setSelectedEvent} onSortChange={changeSort} sort={filters.sort} /></FramedPanel>
        </>}
      </section>
    </AppShell>
  );
}
