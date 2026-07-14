"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { EventDetail } from "@/app/events/event-detail";
import { EventEditor } from "@/app/events/event-editor";
import { EventFilterBar, type DocumentOption } from "@/components/event-filter-bar";
import { EventList } from "@/components/event-list";
import { emptyEventFilters, hasActiveEventFilters, parseEventFilters, toEventFilterSearch, type EventFilters, type EventSort } from "@/lib/event-filters";
import { listActors, listEventTypes, listEvents, updateEvent, type EventUpdate, type ActorRead, type EventRead, type EventTypeRead } from "@/lib/events-api";
import { listDocuments } from "@/lib/documents-api";

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
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([listEvents(filters), listEventTypes(), listActors(), listDocuments()]).then(([nextEvents, nextEventTypes, nextActors, nextDocuments]) => {
      if (!active) return;
      setEvents(nextEvents.filter((event) => event.review_status === "approved"));
      setEventTypes(nextEventTypes); setActors(nextActors); setDocuments(nextDocuments.map(({ id, title }) => ({ id, title }))); setError(undefined);
    }).catch(() => { if (active) setError("Terra Space backend is unavailable. Try again after it starts."); });
    return () => { active = false; };
  }, [filters]);

  function changeFilters(nextFilters: EventFilters) {
    setSelectedEvent(null);
    setEditing(false);
    const nextSearch = toEventFilterSearch(nextFilters);
    router.replace(nextSearch ? `/events?${nextSearch}` : "/events");
  }

  async function saveEvent(patch: EventUpdate) {
    if (!selectedEvent) return;
    try {
      const updated = await updateEvent(selectedEvent.id, patch);
      setEvents((current) => current.map((event) => event.id === updated.id ? updated : event));
      setSelectedEvent(updated); setEditing(false); setError(undefined);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to save this event."); }
  }

  function changeSort(sort: EventSort) {
    changeFilters({ ...filters, sort });
  }

  return <AppShell currentPath="/events"><section className="events-page" aria-labelledby="events-title">
    <p className="eyebrow">Approved intelligence only</p><h1 id="events-title">Events</h1><p className="events-intro">Search and explore approved events. Sources and evidence stay read-only.</p>
    <EventFilterBar actorOptions={actors} documentOptions={documents} eventTypeOptions={eventTypes} onChange={changeFilters} value={filters} />
    {error && <p className="document-error">{error}</p>}
    {selectedEvent ? editing ? <EventEditor actorOptions={actors} event={selectedEvent} eventTypeOptions={eventTypes} onCancel={() => setEditing(false)} onSave={saveEvent} /> : <EventDetail event={selectedEvent} eventsPath={`/events${search ? `?${search}` : ""}`} onClose={() => setSelectedEvent(null)} onEdit={() => setEditing(true)} /> : <EventList events={events} hasActiveFilters={hasActiveEventFilters(filters)} onClearFilters={() => changeFilters(emptyEventFilters())} onSelect={setSelectedEvent} onSortChange={changeSort} sort={filters.sort} />}
  </section></AppShell>;
}
