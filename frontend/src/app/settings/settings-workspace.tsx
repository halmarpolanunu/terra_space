"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { AppearanceSettings } from "@/app/settings/appearance-settings";
import { LmStudioSettings } from "@/app/settings/lm-studio-settings";
import { getSettings, type Settings } from "@/lib/settings-api";

export function SettingsWorkspace() {
  const [settings, setSettings] = useState<Settings>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    void getSettings()
      .then((nextSettings) => {
        if (!active) return;
        setSettings(nextSettings);
        setError(undefined);
      })
      .catch(() => {
        if (active) setError("Unable to load settings. Try again after the backend starts.");
      });
    return () => {
      active = false;
    };
  }, []);

  const loaded = settings !== undefined;

  return (
    <AppShell currentPath="/settings">
      <section aria-labelledby="settings-title" className="settings-page">
        <PageHeader
          description="Configure the local LM Studio connection used to process documents."
          eyebrow="Local configuration"
          title="Settings"
          titleId="settings-title"
        />
        {error && <p className="document-error">{error}</p>}
        {!loaded && !error && <p>Loading settings…</p>}
        {loaded && (
          <div className="settings-grid">
            <LmStudioSettings onSaved={setSettings} settings={settings} />
            <p className="settings-hint">
              Event types affect local AI classification and are managed in Terra Sense. {" "}
              <a href="/sense/event-types">Manage Event Types in Terra Sense</a>
            </p>
            <AppearanceSettings />
          </div>
        )}
      </section>
    </AppShell>
  );
}
