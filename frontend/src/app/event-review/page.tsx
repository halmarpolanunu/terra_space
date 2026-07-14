"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AddEventForm } from "@/app/event-review/add-event-form";
import { DuplicateComparePanel } from "@/app/event-review/duplicate-compare-panel";
import { EventCard } from "@/app/event-review/event-card";
import { ReviewBar } from "@/app/event-review/review-bar";
import { SourcePanel } from "@/app/event-review/source-panel";
import { AppShell } from "@/components/app-shell";
import { FramedPanel } from "@/components/framed-panel";
import type { Document } from "@/lib/documents-api";
import { listDocuments } from "@/lib/documents-api";
import type {
  ActorRead,
  DuplicateResolution,
  EventCreate,
  EventRead,
  EventTypeRead,
  EventUpdate,
} from "@/lib/events-api";
import {
  approveAllForDocument,
  approveEvent,
  createManualEvent,
  getEvent,
  listActors,
  listEventsForDocument,
  listEventTypes,
  rejectEvent,
  resolveDuplicateFlag,
  updateEvent,
} from "@/lib/events-api";

export default function EventReviewPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentIndex, setDocumentIndex] = useState(0);
  const [events, setEvents] = useState<EventRead[]>([]);
  const [eventIndex, setEventIndex] = useState(0);
  const [eventTypeOptions, setEventTypeOptions] = useState<EventTypeRead[]>([]);
  const [actorOptions, setActorOptions] = useState<ActorRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingEvent, setAddingEvent] = useState(false);
  const [approveAllMessage, setApproveAllMessage] = useState<string | null>(null);
  const [matchedEvents, setMatchedEvents] = useState<Record<string, EventRead>>({});

  useEffect(() => {
    Promise.all([listDocuments("ready_for_review"), listEventTypes(), listActors()])
      .then(([documentsResult, eventTypesResult, actorsResult]) => {
        setDocuments(documentsResult);
        setEventTypeOptions(eventTypesResult);
        setActorOptions(actorsResult);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const currentDocument = documents[documentIndex];

  useEffect(() => {
    if (!currentDocument) {
      return;
    }
    listEventsForDocument(currentDocument.id)
      .then((allEvents) => {
        setEvents(allEvents.filter((event) => event.review_status === "draft"));
        setEventIndex(0);
      })
      .catch((err: Error) => setError(err.message));
  }, [currentDocument]);

  const currentEvent = events[eventIndex];

  useEffect(() => {
    const pendingFlags =
      currentEvent?.duplicate_flags.filter((flag) => flag.resolution === "pending") ?? [];
    if (pendingFlags.length === 0) {
      return;
    }
    Promise.all(pendingFlags.map((flag) => getEvent(flag.matched_event_id)))
      .then((matched) => {
        setMatchedEvents((previous) => {
          const next = { ...previous };
          for (const event of matched) {
            next[event.id] = event;
          }
          return next;
        });
      })
      .catch((err: Error) => setError(err.message));
  }, [currentEvent]);

  function goPrev() {
    if (eventIndex > 0) {
      setEventIndex((index) => index - 1);
    } else if (documentIndex > 0) {
      setDocumentIndex((index) => index - 1);
    }
  }

  function goNext() {
    if (eventIndex < events.length - 1) {
      setEventIndex((index) => index + 1);
    } else if (documentIndex < documents.length - 1) {
      setDocumentIndex((index) => index + 1);
    }
  }

  async function refreshAfterAction() {
    if (!currentDocument) {
      return;
    }
    const allEvents = await listEventsForDocument(currentDocument.id);
    const draftEvents = allEvents.filter((event) => event.review_status === "draft");
    if (draftEvents.length === 0) {
      const remainingDocuments = documents.filter(
        (document) => document.id !== currentDocument.id,
      );
      setDocuments(remainingDocuments);
      setDocumentIndex((index) => Math.min(index, Math.max(remainingDocuments.length - 1, 0)));
    } else {
      setEvents(draftEvents);
      setEventIndex((index) => Math.min(index, draftEvents.length - 1));
    }
  }

  async function handleApprove() {
    if (!currentEvent) {
      return;
    }
    try {
      await approveEvent(currentEvent.id);
      await refreshAfterAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve the event.");
    }
  }

  async function handleReject() {
    if (!currentEvent) {
      return;
    }
    try {
      await rejectEvent(currentEvent.id);
      await refreshAfterAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reject the event.");
    }
  }

  async function handleSave(patch: EventUpdate) {
    if (!currentEvent) {
      return;
    }
    try {
      await updateEvent(currentEvent.id, patch);
      await refreshAfterAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the event.");
    }
  }

  async function handleAddEvent(values: Omit<EventCreate, "document_id">) {
    if (!currentDocument) {
      return;
    }
    try {
      await createManualEvent({ ...values, document_id: currentDocument.id });
      setAddingEvent(false);
      await refreshAfterAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the event.");
    }
  }

  async function handleResolveDuplicate(flagId: string, resolution: DuplicateResolution) {
    if (!currentEvent) {
      return;
    }
    try {
      await resolveDuplicateFlag(currentEvent.id, flagId, resolution);
      await refreshAfterAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resolve the duplicate flag.");
    }
  }

  async function handleApproveAll() {
    if (!currentDocument) {
      return;
    }
    try {
      const result = await approveAllForDocument(currentDocument.id);
      setApproveAllMessage(
        result.skipped.length > 0
          ? `Approved ${result.approved_event_ids.length}; skipped ${result.skipped.length} with a pending duplicate flag.`
          : `Approved ${result.approved_event_ids.length} event(s).`,
      );
      await refreshAfterAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve all events.");
    }
  }

  const approveDisabledReason =
    currentEvent?.duplicate_flags.some((flag) => flag.resolution === "pending")
      ? "Resolve the duplicate flag below first."
      : null;

  return (
    <AppShell currentPath="/event-review">
      <div>
        <p className="eyebrow">Extraction queue</p>
        <h1>Event Review</h1>
      </div>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p>Loading review queue…</p>
      ) : documents.length === 0 ? (
        <FramedPanel>
          <p>No documents are waiting for review.</p>
          <p className="event-review-empty-hint">
            Events extracted from processed documents appear here for one-at-a-time approval.
          </p>
          <Link className="btn btn-primary" href="/documents">
            Add or process documents
          </Link>
        </FramedPanel>
      ) : (
        <>
          <ReviewBar
            canNext={documentIndex < documents.length - 1 || eventIndex < events.length - 1}
            canPrev={documentIndex > 0 || eventIndex > 0}
            documentCount={documents.length}
            documentIndex={documentIndex}
            eventCount={events.length}
            eventIndex={eventIndex}
            onNext={goNext}
            onPrev={goPrev}
            onSkip={goNext}
          />
          <div className="batch-actions">
            <button className="btn" onClick={handleApproveAll} type="button">
              Approve all
            </button>
            <button
              className="btn"
              onClick={() => setAddingEvent((value) => !value)}
              type="button"
            >
              {addingEvent ? "Cancel add event" : "Add event"}
            </button>
            {approveAllMessage && <span className="document-meta">{approveAllMessage}</span>}
          </div>
          {addingEvent && (
            <AddEventForm
              eventTypeOptions={eventTypeOptions}
              onCancel={() => setAddingEvent(false)}
              onSubmit={handleAddEvent}
            />
          )}
          <div className="event-review-columns">
            {currentDocument && (
              <SourcePanel
                content={currentDocument.content}
                evidenceQuote={currentEvent?.sources[0]?.evidence_quote}
              />
            )}
            {currentEvent ? (
              <EventCard
                actorOptions={actorOptions}
                approveDisabledReason={approveDisabledReason}
                event={currentEvent}
                eventTypeOptions={eventTypeOptions}
                key={currentEvent.id}
                onApprove={handleApprove}
                onReject={handleReject}
                onSave={handleSave}
              />
            ) : (
              <div className="panel">
                <p className="panel-title">Event</p>
                <p>No draft events for this document.</p>
              </div>
            )}
          </div>
          {currentEvent && (
            <DuplicateComparePanel
              flags={currentEvent.duplicate_flags}
              matchedEvents={matchedEvents}
              onResolve={handleResolveDuplicate}
            />
          )}
        </>
      )}
    </AppShell>
  );
}
