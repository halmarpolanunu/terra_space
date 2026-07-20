"use client";

import { useEffect, useState } from "react";

import { ActorInspector } from "@/app/sense/actor-inspector";
import { ActorsList } from "@/app/sense/actors-list";
import { AppShell } from "@/components/app-shell";
import { FramedPanel } from "@/components/framed-panel";
import { PageHeader } from "@/components/page-header";
import { listActorManagement, type ActorManagementRead } from "@/lib/actors-api";

export function ActorsWorkspace() {
  const [actors, setActors] = useState<ActorManagementRead[]>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    void listActorManagement()
      .then((next) => {
        if (!active) return;
        setActors(next);
        setSelectedId((current) => current ?? next[0]?.id ?? null);
        setError(undefined);
      })
      .catch(() => {
        if (active) setError("Unable to load actors. Try again after the backend starts.");
      });
    return () => {
      active = false;
    };
  }, []);

  async function reload(preferredId?: string) {
    try {
      const next = await listActorManagement();
      setActors(next);
      if (preferredId && next.some((actor) => actor.id === preferredId)) {
        setSelectedId(preferredId);
      } else if (!selectedId || !next.some((actor) => actor.id === selectedId)) {
        setSelectedId(next[0]?.id ?? null);
      }
      setError(undefined);
    } catch (reloadError) {
      setError(reloadError instanceof Error ? reloadError.message : "Unable to reload actors.");
    }
  }

  const selectedActor = actors?.find((actor) => actor.id === selectedId) ?? null;

  return (
    <AppShell currentPath="/sense/actors">
      <section aria-labelledby="actors-title" className="settings-page">
        <PageHeader
          description="Manage the actors local AI can match, plus the aliases you supply so near-duplicate names consolidate into one actor."
          eyebrow="Terra Sense"
          title="Actors"
          titleId="actors-title"
        />
        {error && <p className="document-error">{error}</p>}
        {actors === undefined && !error && <p>Loading actors…</p>}
        {actors !== undefined && (
          <FramedPanel className="taxonomy-workspace-panel">
            <div className="taxonomy-workspace">
              <ActorsList
                actors={actors}
                onQueryChange={setQuery}
                onSelect={(actor) => setSelectedId(actor.id)}
                query={query}
                selectedId={selectedId}
              />
              <ActorInspector
                actor={selectedActor}
                key={selectedActor?.id ?? "none"}
                onError={setError}
                onMutated={reload}
              />
            </div>
          </FramedPanel>
        )}
      </section>
    </AppShell>
  );
}
