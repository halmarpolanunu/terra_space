"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ReviewBar } from "@/app/event-review/review-bar";
import { SourcePanel } from "@/app/event-review/source-panel";
import type { Document } from "@/lib/documents-api";
import { listDocuments } from "@/lib/documents-api";
import type { EventRead } from "@/lib/events-api";
import { listEventsForDocument } from "@/lib/events-api";

export default function EventReviewPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentIndex, setDocumentIndex] = useState(0);
  const [events, setEvents] = useState<EventRead[]>([]);
  const [eventIndex, setEventIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDocuments("ready_for_review")
      .then(setDocuments)
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

  if (loading) {
    return (
      <AppShell currentPath="/event-review">
        <p>Loading review queue…</p>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell currentPath="/event-review">
        <p className="document-error">{error}</p>
      </AppShell>
    );
  }

  if (documents.length === 0) {
    return (
      <AppShell currentPath="/event-review">
        <p>No documents are waiting for review.</p>
      </AppShell>
    );
  }

  return (
    <AppShell currentPath="/event-review">
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
      <div className="event-review-columns">
        {currentDocument && (
          <SourcePanel
            content={currentDocument.content}
            evidenceQuote={currentEvent?.sources[0]?.evidence_quote}
          />
        )}
        {currentEvent ? (
          <div className="panel">
            <p className="panel-title">Event</p>
            <p className="evidence-quote">&ldquo;{currentEvent.sources[0]?.evidence_quote}&rdquo;</p>
            <p>{currentEvent.title}</p>
            <p>{currentEvent.summary}</p>
          </div>
        ) : (
          <div className="panel">
            <p className="panel-title">Event</p>
            <p>No draft events for this document.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
