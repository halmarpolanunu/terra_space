"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { FramedPanel } from "@/components/framed-panel";
import { PageHeader } from "@/components/page-header";
import { buildRelationshipArcs, WorldMap } from "@/components/world-map";
import {
  getIssue,
  getIssueEvent,
  listIssues,
  type ActorRelationshipRead,
  type IssueDetail,
  type IssueEventDetail,
  type IssueListItem,
} from "@/lib/issues-api";

type IssueGlobeSlotProps = { relationships: ActorRelationshipRead[] };

type IssuesWorkspaceProps = {
  initialIssues?: IssueListItem[];
  initialIssue?: IssueDetail;
  initialEvents?: IssueEventDetail[];
  initialError?: string;
};

/** Shows every source-grounded actor arc from the selected Issue without inventing event locations. */
export function IssueGlobeSlot({ relationships }: IssueGlobeSlotProps) {
  return (
    <div aria-label="Proven actor relationship map" className="issues-globe issues-globe-only">
      <WorldMap relationshipArcs={buildRelationshipArcs(relationships)} />
    </div>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The validated Issue analysis could not be loaded.";
}

export function IssuesWorkspace({ initialIssues, initialIssue, initialEvents, initialError }: IssuesWorkspaceProps) {
  const [issues, setIssues] = useState<IssueListItem[]>(initialIssues ?? []);
  const [selectedIssueId, setSelectedIssueId] = useState<string | undefined>(
    initialIssue?.id ?? initialIssues?.[0]?.id,
  );
  const [issue, setIssue] = useState<IssueDetail | undefined>(initialIssue);
  const [eventDetails, setEventDetails] = useState<IssueEventDetail[]>(initialEvents ?? []);
  const [loadingIssues, setLoadingIssues] = useState(initialIssues === undefined && !initialError);
  const [error, setError] = useState<string | undefined>(initialError);
  const loadingIssue = Boolean(selectedIssueId && !issue && !error);
  const loadingRelationships = Boolean(issue && eventDetails.length < issue.events.length && !error);
  const relationships = eventDetails.flatMap((event) => event.relationships);

  useEffect(() => {
    if (initialIssues !== undefined || initialError) return;
    let active = true;
    void listIssues()
      .then((nextIssues) => {
        if (!active) return;
        setIssues(nextIssues);
        setSelectedIssueId(nextIssues[0]?.id);
        setError(undefined);
      })
      .catch((nextError: unknown) => {
        if (active) setError(errorMessage(nextError));
      })
      .finally(() => {
        if (active) setLoadingIssues(false);
      });
    return () => { active = false; };
  }, [initialError, initialIssues]);

  useEffect(() => {
    if (!selectedIssueId) return;
    if (initialIssue?.id === selectedIssueId && initialEvents !== undefined) return;
    let active = true;
    void getIssue(selectedIssueId)
      .then(async (nextIssue) => {
        if (!active) return;
        setIssue(nextIssue);
        setError(undefined);
        const nextEvents = await Promise.all(
          nextIssue.events.map((candidate) => getIssueEvent(selectedIssueId, candidate.id)),
        );
        if (active) setEventDetails(nextEvents);
      })
      .catch((nextError: unknown) => {
        if (active) setError(errorMessage(nextError));
      });
    return () => { active = false; };
  }, [initialEvents, initialIssue, selectedIssueId]);

  function selectIssue(issueId: string) {
    if (issueId === selectedIssueId) return;
    setSelectedIssueId(issueId);
    setIssue(undefined);
    setEventDetails([]);
    setError(undefined);
  }

  return (
    <AppShell currentPath="/issues">
      <section aria-labelledby="issues-title" className="issues-page">
        <PageHeader
          description="Explore only Issues the pipeline has fully validated. Each Issue belongs to one source article and remains read-only here."
          eyebrow="Terra Insight"
          title="Issues"
          titleId="issues-title"
        />
        {error && <p className="document-error" role="alert">{error}</p>}
        <div className="issues-workspace-layout">
          <FramedPanel className="issues-list-panel" meta={error ? "Unavailable" : loadingIssues ? "Loading" : `${issues.length} valid`} title="Article Issues">
            {error ? (
              <p className="issues-empty-state">Validated Issue service is unavailable.</p>
            ) : loadingIssues ? (
              <p className="issues-empty-state">Loading valid Issues…</p>
            ) : issues.length === 0 ? (
              <p className="issues-empty-state">No validated Issues yet. Processed articles will appear here only after the pipeline accepts them.</p>
            ) : (
              <ul className="issues-list">
                {issues.map((candidate) => (
                  <li key={candidate.id}>
                    <button
                      aria-pressed={candidate.id === selectedIssueId}
                      className="issue-list-item"
                      onClick={() => selectIssue(candidate.id)}
                      type="button"
                    >
                      <span className="issue-list-label">{candidate.label}</span>
                      <span className="issue-list-source">{candidate.source_title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </FramedPanel>
          <div aria-busy={loadingIssue || loadingRelationships} className="issues-globe-column">
            <IssueGlobeSlot relationships={relationships} />
          </div>
        </div>
      </section>
    </AppShell>
  );
}
