"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { EventDetail } from "@/app/events/event-detail";
import { EventEditor } from "@/app/events/event-editor";
import { DashboardSummaryContent, exceptionEvents, unresolvedLocationEvents } from "@/app/dashboard/dashboard-summary";
import { EventGlobe, countResolvedEventLocations } from "@/app/dashboard/event-globe";
import { EventListPanel } from "@/app/dashboard/event-list-panel";
import { LayeredCommandDeck, type CommandDeckPanel } from "@/app/dashboard/layered-command-deck";
import { CommandDeckViewport } from "@/app/dashboard/command-deck-viewport";
import { AppShell } from "@/components/app-shell";
import { EventFilterBar, type DocumentOption } from "@/components/event-filter-bar";
import { EventList } from "@/components/event-list";
import { EventTimeline } from "@/components/event-timeline";
import { Phase5EventSection } from "@/components/phase5-event-section";
import {
  ACTIVE_FILTER_KEYS,
  EVENT_SORT_OPTIONS,
  clearEventFilters,
  hasActiveEventFilters,
  parseEventFilters,
  toEventFilterSearch,
  type EventFilters,
  type EventSort,
} from "@/lib/event-filters";
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
import { listPhase5Events, type Phase5Event } from "@/lib/bridge-api";

export function DashboardWorkspace() {
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
  const [phase5Events, setPhase5Events] = useState<Phase5Event[]>([]);
  const [editing, setEditing] = useState(false);
  const [activePanel, setActivePanel] = useState<CommandDeckPanel>(null);
  const [projectionMode, setProjectionMode] = useState<"globe" | "flat" | "unavailable">("globe");
  const [listPanel, setListPanel] = useState<{
    description?: string;
    emptyMessage?: string;
    events: EventRead[];
    title: string;
    // See decisions/Automatic-Event-Visibility-With-Manual-Filtering.md: this one list panel
    // needs its content and its row action recomputed live (from allEvents + hiddenEventIds)
    // rather than the snapshot every other list panel uses, so an Unhide click updates it
    // immediately instead of only after the panel is reopened.
    isHiddenByOwnerPanel?: boolean;
  } | null>(null);
  const hiddenEventIds = useHiddenEventIds();

  // Browser-only manual visibility filter (see decisions/Automatic-Event-Visibility-With-Manual-Filtering.md):
  // never sent to the backend, applied only to what is already shown.
  const events = useMemo(
    () => allEvents.filter((event) => !hiddenEventIds.includes(event.id)),
    [allEvents, hiddenEventIds],
  );
  const hiddenByOwnerEvents = useMemo(
    () => allEvents.filter((event) => hiddenEventIds.includes(event.id)),
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
      listPhase5Events().catch(() => []),
    ]).then(([nextEvents, nextEventTypes, nextActors, nextDocuments, nextPhase5Events]) => {
      if (!active) return;
      setAllEvents(nextEvents);
      setEventTypes(nextEventTypes);
      setActors(nextActors);
      setDocuments(nextDocuments.map(({ id, title }) => ({ id, title })));
      setPhase5Events(nextPhase5Events);
      setError(undefined);
    }).catch(() => {
      if (active) setError("Terra Space backend is unavailable. Try again after it starts.");
    });
    return () => { active = false; };
  }, [filters]);

  function changeFilters(nextFilters: EventFilters) {
    setSelectedEvent(null);
    setEditing(false);
    setListPanel(null);
    const nextSearch = toEventFilterSearch(nextFilters);
    router.replace(nextSearch ? `/dashboard?${nextSearch}` : "/dashboard");
  }

  function changeSort(sort: EventSort) {
    changeFilters({ ...filters, sort });
  }

  function selectEvent(event: EventRead) {
    setSelectedEvent(event);
    setEditing(false);
    setActivePanel("detail");
  }

  function showList(context: {
    description?: string;
    emptyMessage?: string;
    events: EventRead[];
    title: string;
    isHiddenByOwnerPanel?: boolean;
  }) {
    setListPanel(context);
    setActivePanel("list");
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
      setActivePanel(null);
      await refetchEvents();
      setError(undefined);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "That event could not be deleted.");
    }
  }

  const dashboardPath = `/dashboard${search ? `?${search}` : ""}`;
  const eventsPath = `/events${search ? `?${search}` : ""}`;
  const markerCount = countResolvedEventLocations(events);
  const activeFilterCount = ACTIVE_FILTER_KEYS.filter((key) => Boolean(filters[key].trim())).length;
  const sortLabel = EVENT_SORT_OPTIONS.find(([value]) => value === filters.sort)?.[1]
    ?? EVENT_SORT_OPTIONS[0][1];

  return (
    <AppShell currentPath="/dashboard">
      <section aria-labelledby="dashboard-title" className="dashboard-page">
        <CommandDeckViewport>
        <LayeredCommandDeck
          activeFilterCount={activeFilterCount}
          activePanel={activePanel}
          detail={selectedEvent ? (
            editing ? (
              <EventEditor
                actorOptions={actors}
                event={selectedEvent}
                eventTypeOptions={eventTypes}
                onCancel={() => setEditing(false)}
                onSave={saveEdit}
              />
            ) : (
              <EventDetail
                event={selectedEvent}
                eventsPath={dashboardPath}
                isManuallyHidden={hiddenEventIds.includes(selectedEvent.id)}
                onArchive={() => runTransition(archiveEvent, selectedEvent)}
                onClose={() => {
                  setSelectedEvent(null);
                  setEditing(false);
                  setActivePanel(null);
                }}
                onDelete={() => removeEvent(selectedEvent)}
                onEdit={() => setEditing(true)}
                onHide={() => hideEvent(selectedEvent.id)}
                onPublish={() => runTransition(publishEvent, selectedEvent)}
                onReject={() => runTransition(rejectEvent, selectedEvent)}
                onRestore={() => runTransition(restoreEvent, selectedEvent)}
                onUnhide={() => unhideEvent(selectedEvent.id)}
              />
            )
          ) : undefined}
          eventCount={events.length}
          eventsHref={eventsPath}
          eyebrow="Processed intelligence"
          filters={(
            <EventFilterBar
              actorOptions={actors}
              documentOptions={documents}
              eventTypeOptions={eventTypes}
              initiallyExpanded
              onChange={changeFilters}
              value={filters}
            />
          )}
          globe={(
            <>
              {error && <p className="document-error command-deck-error">{error}</p>}
              <EventGlobe
                events={events}
                onProjectionModeChange={setProjectionMode}
                onSelect={selectEvent}
                onSelectCluster={(clusterEvents, locationLabel) => showList({
                  title: `${clusterEvents.length} events at ${locationLabel}`,
                  events: clusterEvents,
                })}
                selectedEventId={selectedEvent?.id}
              />
            </>
          )}
          list={listPanel ? (
            <EventListPanel
              description={listPanel.description}
              emptyMessage={listPanel.emptyMessage}
              events={listPanel.isHiddenByOwnerPanel ? hiddenByOwnerEvents : listPanel.events}
              onClose={() => {
                setListPanel(null);
                setActivePanel(null);
              }}
              onSelect={selectEvent}
              renderRowAction={listPanel.isHiddenByOwnerPanel ? (event) => (
                <button className="btn" onClick={() => unhideEvent(event.id)} type="button">
                  Unhide
                </button>
              ) : undefined}
              title={listPanel.title}
            />
          ) : undefined}
          markerCount={markerCount}
          onActivePanelChange={setActivePanel}
          parallaxEnabled={projectionMode === "globe"}
          register={(
            <EventList
              events={events}
              hasActiveFilters={hasActiveEventFilters(filters)}
              onClearFilters={() => changeFilters(clearEventFilters(filters))}
              onDelete={removeEvent}
              onSelect={selectEvent}
              onSortChange={changeSort}
              sort={filters.sort}
            />
          )}
          signals={(
            <EventTimeline
              events={events}
              hasActiveFilters={hasActiveEventFilters(filters)}
              limit={3}
              onClearFilters={() => changeFilters(clearEventFilters(filters))}
              onSelect={selectEvent}
              sort={filters.sort}
            />
          )}
          sortLabel={sortLabel}
          stageLabel="Global operating picture"
          summary={(
            <>
            <DashboardSummaryContent
              events={events}
              hiddenByOwnerCount={hiddenByOwnerEvents.length}
              markerCount={markerCount}
              onShowExceptions={() => showList({
                title: "Pipeline exceptions",
                description: "Events the pipeline could not fully validate, but retained.",
                events: exceptionEvents(events),
                emptyMessage: "No pipeline exceptions in this view.",
              })}
              onShowHiddenByOwner={() => showList({
                title: "Hidden by you",
                description: "Events you hid in this browser. Hiding is not saved to Supabase.",
                events: hiddenByOwnerEvents,
                emptyMessage: "You have not hidden any events.",
                isHiddenByOwnerPanel: true,
              })}
              onShowUnresolvedLocations={() => showList({
                title: "Unresolved locations",
                description: "Events with no resolved coordinates on the map.",
                events: unresolvedLocationEvents(events),
                emptyMessage: "Every event in this view has a resolved location.",
              })}
            />
            <Phase5EventSection events={phase5Events} />
            </>
          )}
          title="Dashboard"
        />
        </CommandDeckViewport>
      </section>
    </AppShell>
  );
}
