"use client";

import { useState, type FormEvent } from "react";

import { EpistemicStatusControl } from "@/app/event-review/epistemic-status-control";
import { EventTypeDescription } from "@/components/event-type-description";
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
  const selectedType = eventTypeOptions.find(
    (type) => type.name.toLocaleLowerCase() === eventTypeName.trim().toLocaleLowerCase(),
  );
  const activeEventTypeOptions = eventTypeOptions.filter((type) => type.is_active);

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
      event_type: eventTypeName.trim() ? { existing: eventTypeName.trim() } : undefined,
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
          <select
            id="add-event-type"
            onChange={(event) => setEventTypeName(event.target.value)}
            value={eventTypeName}
          >
            <option value="">Select an active Event Type</option>
            {activeEventTypeOptions.map((eventType) => (
              <option key={eventType.id} value={eventType.name}>{eventType.name}</option>
            ))}
          </select>
          <EventTypeDescription eventType={selectedType} />
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
