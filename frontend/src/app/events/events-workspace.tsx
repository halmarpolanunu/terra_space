"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { EventDetail } from "@/app/events/event-detail";
import { EventFilterBar, type DocumentOption } from "@/components/event-filter-bar";
import { EventList } from "@/components/event-list";
import { FramedPanel } from "@/components/framed-panel";
import { PageHeader } from "@/components/page-header";
import { ReadOnlyBridgeNotice } from "@/components/read-only-bridge-notice";
import { clearEventFilters, hasActiveEventFilters, parseEventFilters, toEventFilterSearch, type EventFilters, type EventSort } from "@/lib/event-filters";
import type { ActorRead, EventRead, EventTypeRead } from "@/lib/events-api";
import { listBridgeActors, listBridgeEventTypes, listBridgeEvents, listBridgeSources } from "@/lib/bridge-api";

// Editing, approving, and deleting are intentionally absent from this workspace: Events reads
// Supabase read-only (see project-knowledge/plans/2026-08-11-supabase-read-only-bridge-design.md).
export function EventsWorkspace() {
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
      listBridgeEvents(filters),
      listBridgeEventTypes(),
      listBridgeActors(),
      listBridgeSources(),
    ]).then(([nextEvents, nextEventTypes, nextActors, nextDocuments]) => {
      if (!active) return;
      setEvents(nextEvents);
      setEventTypes(nextEventTypes);
      setActors(nextActors);
      setDocuments(nextDocuments.map(({ id, title }) => ({ id, title })));
      setError(undefined);
    }).catch(() => { if (active) setError("Terra Space backend is unavailable. Try again after it starts."); });
    return () => { active = false; };
  }, [filters]);

  function changeFilters(nextFilters: EventFilters) {
    setSelectedEvent(null);
    const nextSearch = toEventFilterSearch(nextFilters);
    router.replace(nextSearch ? `/events?${nextSearch}` : "/events");
  }

  function changeSort(sort: EventSort) {
    changeFilters({ ...filters, sort });
  }

  const currentView = selectedEvent ? "detail" : "list";

  return <AppShell currentPath="/events"><section className="events-page" aria-labelledby="events-title">
    <PageHeader
      description="Search and explore published events from the local Supabase pipeline. Sources, evidence, editing, and approval stay read-only here."
      eyebrow="Read-only Supabase preview"
      title="Events"
      titleId="events-title"
    />
    <ReadOnlyBridgeNotice />
    <EventFilterBar actorOptions={actors} documentOptions={documents} eventTypeOptions={eventTypes} onChange={changeFilters} value={filters} />
    {error && <p className="document-error">{error}</p>}
    <div className="events-view" data-view={currentView} key={currentView}>
      {selectedEvent ? <EventDetail event={selectedEvent} eventsPath={`/events${search ? `?${search}` : ""}`} onClose={() => setSelectedEvent(null)} /> : <FramedPanel className="events-list-panel" title="Published event register"><EventList events={events} hasActiveFilters={hasActiveEventFilters(filters)} onClearFilters={() => changeFilters(clearEventFilters(filters))} onSelect={setSelectedEvent} onSortChange={changeSort} sort={filters.sort} /></FramedPanel>}
    </div>
  </section></AppShell>;
}
