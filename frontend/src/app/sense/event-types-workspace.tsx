"use client";

import { useEffect, useState } from "react";

import { EventTypeSettings } from "@/app/settings/event-type-settings";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { listEventTaxonomy, type TaxonomyNodeRead } from "@/lib/events-api";

export function EventTypesWorkspace() {
  const [nodes, setNodes] = useState<TaxonomyNodeRead[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    void listEventTaxonomy()
      .then((nextNodes) => {
        if (!active) return;
        setNodes(nextNodes);
        setError(undefined);
      })
      .catch(() => {
        if (active) setError("Unable to load the Event Taxonomy. Try again after the backend starts.");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell currentPath="/sense/event-types">
      <section aria-labelledby="event-types-title" className="settings-page">
        <PageHeader
          description="Manage the Domain, Category, Subcategory, and Event Type tree that guides local AI classification and review."
          eyebrow="Terra Sense"
          title="Event Taxonomy"
          titleId="event-types-title"
        />
        {error && <p className="document-error">{error}</p>}
        {nodes === undefined && !error && <p>Loading the Event Taxonomy…</p>}
        {nodes !== undefined && <EventTypeSettings nodes={nodes} />}
      </section>
    </AppShell>
  );
}
