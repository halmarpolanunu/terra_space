"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { EventDetail } from "@/app/events/event-detail";
import { DashboardSummary } from "@/app/dashboard/dashboard-summary";
import { EventGlobe } from "@/app/dashboard/event-globe";
import { AppShell } from "@/components/app-shell";
import { EventFilterBar, type DocumentOption } from "@/components/event-filter-bar";
import { EventList } from "@/components/event-list";
import { EventTimeline } from "@/components/event-timeline";
import { FramedPanel } from "@/components/framed-panel";
import { ServiceStatusPanel } from "@/components/service-status";
import { parseEventFilters, toEventFilterSearch, type EventFilters } from "@/lib/event-filters";
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

  const dashboardPath = `/dashboard${search ? `?${search}` : ""}`;
  const eventsPath = `/events${search ? `?${search}` : ""}`;

  return (
    <AppShell currentPath="/dashboard">
      <section aria-labelledby="dashboard-title" className="dashboard-page">
        <div className="dashboard-heading">
          <div><p className="eyebrow">Approved intelligence</p><h1 id="dashboard-title">Dashboard</h1></div>
          <Link className="btn btn-primary" href={eventsPath}>Open Events</Link>
        </div>
        <p className="dashboard-intro">One filtered view across the summary, globe, timeline, and event list.</p>
        <ServiceStatusPanel />
        <EventFilterBar actorOptions={actors} documentOptions={documents} eventTypeOptions={eventTypes} onChange={changeFilters} value={filters} />
        {error && <p className="document-error">{error}</p>}
        {selectedEvent ? <EventDetail event={selectedEvent} eventsPath={dashboardPath} onClose={() => setSelectedEvent(null)} /> : <>
          <DashboardSummary events={events} />
          <FramedPanel className="dashboard-globe-panel" title="Event locations"><EventGlobe events={events} onSelect={setSelectedEvent} /></FramedPanel>
          <div className="dashboard-lower-grid">
            <FramedPanel title="Timeline"><EventTimeline events={events} sort={filters.sort} /></FramedPanel>
            <FramedPanel title="Filtered events"><EventList events={events} onSelect={setSelectedEvent} /></FramedPanel>
          </div>
        </>}
      </section>
    </AppShell>
  );
}
