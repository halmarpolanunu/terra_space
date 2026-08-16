"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { FramedPanel } from "@/components/framed-panel";
import { PageHeader } from "@/components/page-header";
import { buildRelationshipArcs, WorldMap } from "@/components/world-map";
import { RelationshipPanel } from "@/app/issues/relationship-panel";
import {
  getIssue,
  getIssueEvent,
  listIssues,
  type IssueDetail,
  type IssueEventDetail,
  type IssueListItem,
} from "@/lib/issues-api";

type IssueGlobeSlotProps = {
  event?: IssueEventDetail;
  selectedRelationshipId?: string;
};

/** Renders only locations that the selected event's validated relationships explicitly support. */
export function IssueGlobeSlot({ event, selectedRelationshipId }: IssueGlobeSlotProps) {
  if (!event) {
    return <p className="issues-map-empty">Select a related event to see proven actor locations.</p>;
  }
  if (event.relationships.length === 0) {
    return <p className="issues-map-empty">No proven actor-to-actor locations for this event</p>;
  }
  return (
    <div
      aria-label="Proven actor relationship map"
      className="issues-globe"
      data-selected-event-id={event.id}
    >
      <WorldMap
        relationshipArcs={buildRelationshipArcs(event.relationships)}
        selectedRelationshipId={selectedRelationshipId}
      />
    </div>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The validated Issue analysis could not be loaded.";
}

export function IssuesWorkspace() {
  const [issues, setIssues] = useState<IssueListItem[]>([]);
  const [selectedIssueId, setSelectedIssueId] = useState<string>();
  const [selectedEventId, setSelectedEventId] = useState<string>();
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string>();
  const [issue, setIssue] = useState<IssueDetail>();
  const [event, setEvent] = useState<IssueEventDetail>();
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [error, setError] = useState<string>();
  const loadingIssue = Boolean(selectedIssueId && !issue && !error);
  const loadingEvent = Boolean(selectedIssueId && selectedEventId && !event && !error);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!selectedIssueId) return;
    let active = true;
    void getIssue(selectedIssueId)
      .then((nextIssue) => {
        if (!active) return;
        setIssue(nextIssue);
        setSelectedEventId(nextIssue.events[0]?.id);
        setError(undefined);
      })
      .catch((nextError: unknown) => {
        if (active) setError(errorMessage(nextError));
      })
    return () => { active = false; };
  }, [selectedIssueId]);

  useEffect(() => {
    if (!selectedIssueId || !selectedEventId) return;
    let active = true;
    void getIssueEvent(selectedIssueId, selectedEventId)
      .then((nextEvent) => {
        if (!active) return;
        setEvent(nextEvent);
        setSelectedRelationshipId(undefined);
        setError(undefined);
      })
      .catch((nextError: unknown) => {
        if (active) setError(errorMessage(nextError));
      })
    return () => { active = false; };
  }, [selectedEventId, selectedIssueId]);

  function selectIssue(issueId: string) {
    if (issueId === selectedIssueId) return;
    setSelectedIssueId(issueId);
    setSelectedEventId(undefined);
    setSelectedRelationshipId(undefined);
    setIssue(undefined);
    setEvent(undefined);
    setError(undefined);
  }

  function selectEvent(eventId: string) {
    if (eventId === selectedEventId) return;
    setSelectedEventId(eventId);
    setSelectedRelationshipId(undefined);
    setEvent(undefined);
    setError(undefined);
  }

  function selectRelationship(relationshipId: string) {
    setSelectedRelationshipId(relationshipId);
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
          <FramedPanel className="issues-list-panel" meta={loadingIssues ? "Loading" : `${issues.length} valid`} title="Article Issues">
            {loadingIssues ? (
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
          <div className="issues-detail-column">
            {loadingIssue ? (
              <FramedPanel className="issues-detail-panel" title="Selected Issue"><p className="issues-empty-state">Loading selected Issue…</p></FramedPanel>
            ) : issue ? (
              <>
                <FramedPanel className="issues-detail-panel" meta="Validated" title="Selected Issue">
                  <p className="issues-source-label">Source article</p>
                  <p className="issues-source-title">{issue.source_title}</p>
                  <h2>{issue.label}</h2>
                  <p className="issues-summary">{issue.summary}</p>
                  <blockquote className="evidence-quote">{issue.evidence_quote}</blockquote>
                </FramedPanel>
                <div className="issues-exploration-grid">
                  <FramedPanel className="issues-events-panel" meta={`${issue.events.length} event${issue.events.length === 1 ? "" : "s"}`} title="Related events">
                    {issue.events.length === 0 ? (
                      <p className="issues-empty-state">No mapped events yet</p>
                    ) : (
                      <ul className="issues-events-list">
                        {issue.events.map((candidate) => (
                          <li key={candidate.id}>
                            <button
                              aria-pressed={candidate.id === selectedEventId}
                              className="issues-event-item"
                              onClick={() => selectEvent(candidate.id)}
                              type="button"
                            >
                              {candidate.title}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {loadingEvent ? <p className="issues-event-detail">Loading event evidence…</p> : event && (
                      <div className="issues-event-detail">
                        <p className="field-label">Event evidence</p>
                        <blockquote className="evidence-quote">{event.evidence_quote}</blockquote>
                        <RelationshipPanel
                          onSelect={selectRelationship}
                          relationships={event.relationships}
                          selectedRelationshipId={selectedRelationshipId}
                        />
                      </div>
                    )}
                  </FramedPanel>
                  <FramedPanel className="issues-map-panel" title="Event map">
                    {loadingEvent ? (
                      <p className="issues-map-empty">Loading proven actor locations…</p>
                    ) : (
                      <IssueGlobeSlot event={event} selectedRelationshipId={selectedRelationshipId} />
                    )}
                  </FramedPanel>
                </div>
              </>
            ) : !loadingIssues && !error ? (
              <FramedPanel className="issues-detail-panel" title="Selected Issue"><p className="issues-empty-state">Select a validated Issue to explore its source article and related events.</p></FramedPanel>
            ) : null}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
