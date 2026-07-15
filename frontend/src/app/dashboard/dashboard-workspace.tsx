"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { EventDetail } from "@/app/events/event-detail";
import { DashboardSummaryContent } from "@/app/dashboard/dashboard-summary";
import { EventGlobe, eventLocationsToFeatureCollection } from "@/app/dashboard/event-globe";
import { LayeredCommandDeck, type CommandDeckPanel } from "@/app/dashboard/layered-command-deck";
import { AppShell } from "@/components/app-shell";
import { EventFilterBar, type DocumentOption } from "@/components/event-filter-bar";
import { EventList } from "@/components/event-list";
import { EventTimeline } from "@/components/event-timeline";
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
  const [activePanel, setActivePanel] = useState<CommandDeckPanel>(null);

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

  function selectEvent(event: EventRead) {
    setSelectedEvent(event);
    setActivePanel("detail");
  }

  const dashboardPath = `/dashboard${search ? `?${search}` : ""}`;
  const eventsPath = `/events${search ? `?${search}` : ""}`;
  const markerCount = eventLocationsToFeatureCollection(events).features.length;
  const activeFilterCount = ACTIVE_FILTER_KEYS.filter((key) => Boolean(filters[key].trim())).length;
  const sortLabel = EVENT_SORT_OPTIONS.find(([value]) => value === filters.sort)?.[1]
    ?? EVENT_SORT_OPTIONS[0][1];

  return (
    <AppShell currentPath="/dashboard">
      <section aria-labelledby="dashboard-title" className="dashboard-page">
        <LayeredCommandDeck
          activeFilterCount={activeFilterCount}
          activePanel={activePanel}
          detail={selectedEvent ? (
            <EventDetail
              event={selectedEvent}
              eventsPath={dashboardPath}
              onClose={() => {
                setSelectedEvent(null);
                setActivePanel(null);
              }}
            />
          ) : undefined}
          eventCount={events.length}
          eventsHref={eventsPath}
          eyebrow="Approved intelligence"
          filters={(
            <EventFilterBar
              actorOptions={actors}
              documentOptions={documents}
              eventTypeOptions={eventTypes}
              onChange={changeFilters}
              value={filters}
            />
          )}
          globe={(
            <>
              {error && <p className="document-error command-deck-error">{error}</p>}
              <EventGlobe events={events} onSelect={selectEvent} />
            </>
          )}
          markerCount={markerCount}
          onActivePanelChange={setActivePanel}
          register={(
            <EventList
              events={events}
              hasActiveFilters={hasActiveEventFilters(filters)}
              onClearFilters={() => changeFilters(clearEventFilters(filters))}
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
          summary={<DashboardSummaryContent events={events} markerCount={markerCount} />}
          title="Dashboard"
        />
      </section>
    </AppShell>
  );
}
