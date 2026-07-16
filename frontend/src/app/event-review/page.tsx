"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AddEventForm } from "@/app/event-review/add-event-form";
import { DuplicateComparePanel } from "@/app/event-review/duplicate-compare-panel";
import { EventCard } from "@/app/event-review/event-card";
import { ReviewBar } from "@/app/event-review/review-bar";
import { SourcePanel } from "@/app/event-review/source-panel";
import { AppShell } from "@/components/app-shell";
import { eventTypeNeedsDescription } from "@/components/event-type-description";
import { FramedPanel } from "@/components/framed-panel";
import { PageHeader } from "@/components/page-header";
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
  const [eventsDocumentId, setEventsDocumentId] = useState<string | null>(null);
  const [eventTypeOptions, setEventTypeOptions] = useState<EventTypeRead[]>([]);
  const [actorOptions, setActorOptions] = useState<ActorRead[]>([]);
  const [motionDirection, setMotionDirection] = useState<"next" | "previous">("next");
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
  const currentDocumentId = currentDocument?.id ?? null;

  useEffect(() => {
    if (!currentDocumentId) {
      return;
    }
    let active = true;
    listEventsForDocument(currentDocumentId)
      .then((allEvents) => {
        if (!active) return;
        setEvents(allEvents.filter((event) => event.review_status === "draft"));
        setEventIndex(0);
        setEventsDocumentId(currentDocumentId);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      });
    return () => { active = false; };
  }, [currentDocumentId]);

  const eventsLoading = Boolean(currentDocumentId && eventsDocumentId !== currentDocumentId);
  const reviewEvents = eventsLoading ? [] : events;
  const currentEvent = reviewEvents[eventIndex];

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
    setMotionDirection("previous");
    if (eventIndex > 0) {
      setEventIndex((index) => index - 1);
    } else if (documentIndex > 0) {
      setDocumentIndex((index) => index - 1);
    }
  }

  function goNext() {
    setMotionDirection("next");
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
          ? `Approved ${result.approved_event_ids.length}; skipped ${result.skipped.length} event(s) that need review.`
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
      : eventTypeNeedsDescription(currentEvent?.event_type)
        ? "Add a description in Settings before approving this suggested type."
        : null;

  return (
    <AppShell currentPath="/event-review">
      <section aria-labelledby="event-review-title" className="event-review-page">
      <PageHeader
        description="Review extracted events against their source evidence, one decision at a time."
        eyebrow="Extraction queue"
        title="Event Review"
        titleId="event-review-title"
      />
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
            canNext={documentIndex < documents.length - 1 || eventIndex < reviewEvents.length - 1}
            canPrev={documentIndex > 0 || eventIndex > 0}
            documentCount={documents.length}
            documentIndex={documentIndex}
            eventCount={reviewEvents.length}
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
          <div
            className="event-review-columns event-review-transition"
            data-motion-direction={motionDirection}
            key={`${currentDocument?.id ?? "none"}:${currentEvent?.id ?? "none"}`}
          >
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
              <div className="panel review-event-card">
                <div className="panel-heading"><h2 className="panel-title">Event</h2></div>
                <p>{eventsLoading ? "Loading extracted events…" : "No draft events for this document."}</p>
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
      </section>
    </AppShell>
  );
}
