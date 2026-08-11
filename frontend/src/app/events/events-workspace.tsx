"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { EventDetail } from "@/app/events/event-detail";
import { EventEditor } from "@/app/events/event-editor";
import { EventFilterBar, type DocumentOption } from "@/components/event-filter-bar";
import { EventList } from "@/components/event-list";
import { FramedPanel } from "@/components/framed-panel";
import { PageHeader } from "@/components/page-header";
import { clearEventFilters, hasActiveEventFilters, parseEventFilters, toEventFilterSearch, type EventFilters, type EventSort } from "@/lib/event-filters";
import {
  archiveEvent,
  deleteEvent,
  getEvent,
  listActors,
  listEventTypes,
  listEvents,
  publishEvent,
  rejectEvent,
  restoreEvent,
  updateEvent,
  type ActorRead,
  type EventRead,
  type EventTypeRead,
  type EventUpdate,
} from "@/lib/events-api";
import { listDocuments } from "@/lib/documents-api";
import { hideEvent, unhideEvent, useHiddenEventIds } from "@/lib/hidden-events";

// Full read/write authority now lives here -- Supabase's phase3_events is the source of truth
// (see project-knowledge/decisions/Fresh-Phase-Prefixed-Supabase-Architecture.md). This replaced
// the earlier read-only Supabase preview once the full application cutover landed.
export function EventsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const filters = useMemo(() => parseEventFilters(search), [search]);
  const [allEvents, setAllEvents] = useState<EventRead[]>([]);
  const [eventTypes, setEventTypes] = useState<EventTypeRead[]>([]);
  const [actors, setActors] = useState<ActorRead[]>([]);
  const [documents, setDocuments] = useState<DocumentOption[]>([]);
  const [error, setError] = useState<string>();
  const [selectedEvent, setSelectedEvent] = useState<EventRead | null>(null);
  const [editing, setEditing] = useState(false);
  const hiddenEventIds = useHiddenEventIds();

  // Browser-only manual visibility filter (see decisions/Automatic-Event-Visibility-With-Manual-Filtering.md):
  // never sent to the backend. Review or restore a hidden event from Dashboard's "Hidden by you" panel.
  const events = useMemo(
    () => allEvents.filter((event) => !hiddenEventIds.includes(event.id)),
    [allEvents, hiddenEventIds],
  );

  const refetchEvents = useCallback(() => {
    return listEvents(filters).then((nextEvents) => {
      setAllEvents(nextEvents);
      return nextEvents;
    });
  }, [filters]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      listEvents(filters),
      listEventTypes(),
      listActors(),
      listDocuments(),
    ]).then(([nextEvents, nextEventTypes, nextActors, nextDocuments]) => {
      if (!active) return;
      setAllEvents(nextEvents);
      setEventTypes(nextEventTypes);
      setActors(nextActors);
      setDocuments(nextDocuments.map(({ id, title }) => ({ id, title })));
      setError(undefined);
    }).catch(() => { if (active) setError("Terra Space backend is unavailable. Try again after it starts."); });
    return () => { active = false; };
  }, [filters]);

  function changeFilters(nextFilters: EventFilters) {
    setSelectedEvent(null);
    setEditing(false);
    const nextSearch = toEventFilterSearch(nextFilters);
    router.replace(nextSearch ? `/events?${nextSearch}` : "/events");
  }

  function changeSort(sort: EventSort) {
    changeFilters({ ...filters, sort });
  }

  async function refreshSelected(eventId: string) {
    const [nextEvent] = await Promise.all([getEvent(eventId), refetchEvents()]);
    setSelectedEvent(nextEvent);
    return nextEvent;
  }

  async function runTransition(action: (eventId: string) => Promise<EventRead>, event: EventRead) {
    try {
      await action(event.id);
      await refreshSelected(event.id);
      setError(undefined);
    } catch (transitionError) {
      setError(transitionError instanceof Error ? transitionError.message : "That action could not be completed.");
    }
  }

  async function saveEdit(patch: EventUpdate) {
    if (!selectedEvent) return;
    try {
      await updateEvent(selectedEvent.id, patch);
      await refreshSelected(selectedEvent.id);
      setEditing(false);
      setError(undefined);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "That change could not be saved.");
    }
  }

  async function removeEvent(event: EventRead) {
    if (!window.confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
    try {
      await deleteEvent(event.id);
      setSelectedEvent(null);
      setEditing(false);
      await refetchEvents();
      setError(undefined);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "That event could not be deleted.");
    }
  }

  const currentView = editing ? "edit" : selectedEvent ? "detail" : "list";

  return <AppShell currentPath="/events"><section className="events-page" aria-labelledby="events-title">
    <PageHeader
      description="Search and explore processed events, including pipeline exceptions. Publish, reject, archive, restore, and edit events here."
      eyebrow="Terra Insight"
      title="Events"
      titleId="events-title"
    />
    <EventFilterBar actorOptions={actors} documentOptions={documents} eventTypeOptions={eventTypes} onChange={changeFilters} value={filters} />
    {error && <p className="document-error" role="alert">{error}</p>}
    <div className="events-view" data-view={currentView} key={currentView}>
      {editing && selectedEvent ? (
        <EventEditor
          actorOptions={actors}
          event={selectedEvent}
          eventTypeOptions={eventTypes}
          onCancel={() => setEditing(false)}
          onSave={saveEdit}
        />
      ) : selectedEvent ? (
        <EventDetail
          event={selectedEvent}
          eventsPath={`/events${search ? `?${search}` : ""}`}
          isManuallyHidden={hiddenEventIds.includes(selectedEvent.id)}
          onArchive={() => runTransition(archiveEvent, selectedEvent)}
          onClose={() => { setSelectedEvent(null); setEditing(false); }}
          onDelete={() => removeEvent(selectedEvent)}
          onEdit={() => setEditing(true)}
          onHide={() => hideEvent(selectedEvent.id)}
          onPublish={() => runTransition(publishEvent, selectedEvent)}
          onReject={() => runTransition(rejectEvent, selectedEvent)}
          onRestore={() => runTransition(restoreEvent, selectedEvent)}
          onUnhide={() => unhideEvent(selectedEvent.id)}
        />
      ) : <FramedPanel className="events-list-panel" title="Event register"><EventList events={events} hasActiveFilters={hasActiveEventFilters(filters)} onClearFilters={() => changeFilters(clearEventFilters(filters))} onDelete={removeEvent} onSelect={setSelectedEvent} onSortChange={changeSort} sort={filters.sort} /></FramedPanel>}
    </div>
  </section></AppShell>;
}
