"use client";

import { useState, type FormEvent } from "react";

import { EpistemicStatusControl } from "@/app/event-review/epistemic-status-control";
import { FramedPanel } from "@/components/framed-panel";
import type { EpistemicStatus, EventCreate, EventTypeRead } from "@/lib/events-api";

type AddEventFormValues = Omit<EventCreate, "document_id">;

type AddEventFormProps = {
  eventTypeOptions: EventTypeRead[];
  onSubmit: (values: AddEventFormValues) => void;
  onCancel: () => void;
};

export function AddEventForm({ eventTypeOptions, onSubmit, onCancel }: AddEventFormProps) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [evidenceQuote, setEvidenceQuote] = useState("");
  const [eventTypeName, setEventTypeName] = useState("");
  const [epistemicStatus, setEpistemicStatus] = useState<EpistemicStatus>("claim");

  const canSubmit = title.trim() !== "" && summary.trim() !== "" && evidenceQuote.trim() !== "";

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    onSubmit({
      title,
      summary,
      evidence_quote: evidenceQuote,
      epistemic_status: epistemicStatus,
      event_type: eventTypeName.trim() ? { suggested: eventTypeName.trim() } : undefined,
    });
  }

  return (
    <FramedPanel title="Add Event">
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="add-event-title">Title</label>
          <input
            id="add-event-title"
            onChange={(event) => setTitle(event.target.value)}
            value={title}
          />
        </div>
        <div className="field">
          <label htmlFor="add-event-summary">Summary</label>
          <textarea
            id="add-event-summary"
            onChange={(event) => setSummary(event.target.value)}
            value={summary}
          />
        </div>
        <div className="field">
          <label htmlFor="add-event-quote">Evidence quote</label>
          <textarea
            className="serif"
            id="add-event-quote"
            onChange={(event) => setEvidenceQuote(event.target.value)}
            value={evidenceQuote}
          />
        </div>
        <div className="field">
          <label htmlFor="add-event-type">Event type</label>
          <input
            id="add-event-type"
            list="add-event-type-options"
            onChange={(event) => setEventTypeName(event.target.value)}
            value={eventTypeName}
          />
          <datalist id="add-event-type-options">
            {eventTypeOptions.map((eventType) => (
              <option key={eventType.id} value={eventType.name} />
            ))}
          </datalist>
        </div>
        <div className="field">
          <label>Epistemic status</label>
          <EpistemicStatusControl onChange={setEpistemicStatus} value={epistemicStatus} />
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" disabled={!canSubmit} type="submit">
            Add event
          </button>
          <button className="btn" onClick={onCancel} type="button">
            Cancel
          </button>
        </div>
      </form>
    </FramedPanel>
  );
}
