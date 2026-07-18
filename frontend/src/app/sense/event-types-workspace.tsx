"use client";

import { useEffect, useState } from "react";

import { EventTypeSettings } from "@/app/settings/event-type-settings";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { listEventTypes, type EventTypeRead } from "@/lib/events-api";

export function EventTypesWorkspace() {
  const [eventTypes, setEventTypes] = useState<EventTypeRead[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    void listEventTypes()
      .then((nextTypes) => {
        if (!active) return;
        setEventTypes(nextTypes);
        setError(undefined);
      })
      .catch(() => {
        if (active) setError("Unable to load event types. Try again after the backend starts.");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell currentPath="/sense/event-types">
      <section aria-labelledby="event-types-title" className="settings-page">
        <PageHeader
          description="Manage the types that guide local AI classification and appear during review."
          eyebrow="Terra Sense"
          title="Event Types"
          titleId="event-types-title"
        />
        {error && <p className="document-error">{error}</p>}
        {eventTypes === undefined && !error && <p>Loading event types…</p>}
        {eventTypes !== undefined && <EventTypeSettings eventTypes={eventTypes} />}
      </section>
    </AppShell>
  );
}
