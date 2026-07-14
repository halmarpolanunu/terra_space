"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ServiceStatusPanel } from "@/components/service-status";
import { EventTypeSettings } from "@/app/settings/event-type-settings";
import { LmStudioSettings } from "@/app/settings/lm-studio-settings";
import { listEventTypes, type EventTypeRead } from "@/lib/events-api";
import { getSettings, type Settings } from "@/lib/settings-api";

export function SettingsWorkspace() {
  const [settings, setSettings] = useState<Settings>();
  const [eventTypes, setEventTypes] = useState<EventTypeRead[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    void Promise.all([getSettings(), listEventTypes()])
      .then(([nextSettings, nextTypes]) => {
        if (!active) return;
        setSettings(nextSettings);
        setEventTypes(nextTypes);
        setError(undefined);
      })
      .catch(() => {
        if (active) setError("Unable to load settings. Try again after the backend starts.");
      });
    return () => {
      active = false;
    };
  }, []);

  const loaded = settings !== undefined && eventTypes !== undefined;

  return (
    <AppShell currentPath="/settings">
      <section aria-labelledby="settings-title" className="settings-page">
        <p className="eyebrow">Local configuration</p>
        <h1 id="settings-title">Settings</h1>
        {error && <p className="document-error">{error}</p>}
        {!loaded && !error && <p>Loading settings…</p>}
        {loaded && (
          <div className="settings-grid">
            <ServiceStatusPanel />
            <LmStudioSettings onSaved={setSettings} settings={settings} />
            <EventTypeSettings eventTypes={eventTypes} />
          </div>
        )}
      </section>
    </AppShell>
  );
}
