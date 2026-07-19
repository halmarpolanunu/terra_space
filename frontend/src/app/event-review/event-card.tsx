"use client";

import { useState, type FormEvent } from "react";

import { EpistemicStatusControl } from "@/app/event-review/epistemic-status-control";
import { EventTypeDescription } from "@/components/event-type-description";
import { FramedPanel } from "@/components/framed-panel";
import { isFullTaxonomyLeaf } from "@/lib/events-api";
import type {
  ActorInput,
  ActorRead,
  DatePrecision,
  EventRead,
  EventTypeRead,
  EventUpdate,
  LocationInput,
  LocationRead,
} from "@/lib/events-api";

const DATE_PRECISIONS: DatePrecision[] = ["exact", "month", "year", "unknown"];

type EventCardProps = {
  event: EventRead;
  eventTypeOptions: EventTypeRead[];
  actorOptions: ActorRead[];
  onApprove: () => void;
  onReject: () => void;
  onSave: (patch: EventUpdate) => void;
  approveDisabledReason: string | null;
};

function formatDate(date: string | null, precision: DatePrecision | null): string {
  if (!date) {
    return "Date unknown — kept blank";
  }
  return precision && precision !== "exact" ? `${date} (${precision})` : date;
}

function formatLocation(location: LocationRead): string {
  return [location.city_regency, location.admin1, location.country].filter(Boolean).join(", ");
}

function toLocationInputs(event: EventRead): LocationInput[] {
  return event.locations.map((location) => ({
    country: location.country,
    admin1: location.admin1,
    city_regency: location.city_regency,
  }));
}

function toActorInputs(event: EventRead): ActorInput[] {
  return event.actors.map((eventActor) => ({
    name: eventActor.actor.name,
    role: eventActor.role,
  }));
}

export function EventCard({
  event,
  eventTypeOptions,
  actorOptions,
  onApprove,
  onReject,
  onSave,
  approveDisabledReason,
}: EventCardProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [summary, setSummary] = useState(event.summary);
  const [eventDate, setEventDate] = useState(event.event_date ?? "");
  const [eventDatePrecision, setEventDatePrecision] = useState<DatePrecision | "">(
    event.event_date_precision ?? "",
  );
  const [eventTypeName, setEventTypeName] = useState(
    event.event_type && isFullTaxonomyLeaf(event.event_type) ? event.event_type.name : "",
  );
  const [actorRows, setActorRows] = useState<ActorInput[]>(toActorInputs(event));
  const [locationRows, setLocationRows] = useState<LocationInput[]>(toLocationInputs(event));

  const evidenceQuote = event.sources[0]?.evidence_quote;
  const isDraft = event.review_status === "draft";
  const selectedType = eventTypeOptions.find(
    (type) => type.name.toLocaleLowerCase() === eventTypeName.trim().toLocaleLowerCase(),
  );
  const activeEventTypeOptions = eventTypeOptions.filter(isFullTaxonomyLeaf);

  function startEditing() {
    setTitle(event.title);
    setSummary(event.summary);
    setEventDate(event.event_date ?? "");
    setEventDatePrecision(event.event_date_precision ?? "");
    setEventTypeName(event.event_type && isFullTaxonomyLeaf(event.event_type) ? event.event_type.name : "");
    setActorRows(toActorInputs(event));
    setLocationRows(toLocationInputs(event));
    setEditing(true);
  }

  function handleSaveEdit(formEvent: FormEvent) {
    formEvent.preventDefault();
    onSave({
      title,
      summary,
      event_date: eventDate || null,
      event_date_precision: (eventDatePrecision || null) as DatePrecision | null,
      event_type: eventTypeName.trim() ? { existing: eventTypeName.trim() } : undefined,
      actors: actorRows.filter((row) => row.name.trim() !== ""),
      locations: locationRows.filter((row) => row.country || row.admin1 || row.city_regency),
    });
    setEditing(false);
  }

  function addActorRow() {
    setActorRows((rows) => [...rows, { name: "", role: "source" }]);
  }

  function updateActorRow(index: number, patch: Partial<ActorInput>) {
    setActorRows((rows) =>
      rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    );
  }

  function removeActorRow(index: number) {
    setActorRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index));
  }

  function addLocationRow() {
    setLocationRows((rows) => [...rows, { country: "", admin1: "", city_regency: "" }]);
  }

  function updateLocationRow(index: number, patch: Partial<LocationInput>) {
    setLocationRows((rows) =>
      rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    );
  }

  function removeLocationRow(index: number) {
    setLocationRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index));
  }

  if (editing) {
    return (
      <FramedPanel className="review-event-card" title="Edit Event">
        <form onSubmit={handleSaveEdit}>
          <div className="field">
            <label htmlFor="event-title">Title</label>
            <input id="event-title" onChange={(e) => setTitle(e.target.value)} value={title} />
          </div>
          <div className="field">
            <label htmlFor="event-summary">Summary</label>
            <textarea
              id="event-summary"
              onChange={(e) => setSummary(e.target.value)}
              value={summary}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="event-date">Event date</label>
              <input
                id="event-date"
                onChange={(e) => setEventDate(e.target.value)}
                placeholder="YYYY-MM-DD, YYYY-MM, or YYYY"
                type="text"
                value={eventDate}
              />
            </div>
            <div className="field">
              <label htmlFor="event-date-precision">Event date precision</label>
              <select
                id="event-date-precision"
                onChange={(e) => setEventDatePrecision(e.target.value as DatePrecision | "")}
                value={eventDatePrecision}
              >
                <option value="">Unknown / not set</option>
                {DATE_PRECISIONS.map((precision) => (
                  <option key={precision} value={precision}>
                    {precision}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="event-type">Event type</label>
            <select
              id="event-type"
              onChange={(e) => setEventTypeName(e.target.value)}
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
            <label>Actors</label>
            {actorRows.map((row, index) => (
              <div className="actor-row" key={index}>
                <input
                  aria-label={`Actor ${index + 1} name`}
                  list="actor-name-options"
                  onChange={(e) => updateActorRow(index, { name: e.target.value })}
                  value={row.name}
                />
                <select
                  aria-label={`Actor ${index + 1} role`}
                  onChange={(e) =>
                    updateActorRow(index, { role: e.target.value as ActorInput["role"] })
                  }
                  value={row.role}
                >
                  <option value="source">Source</option>
                  <option value="target">Target</option>
                </select>
                <button className="btn" onClick={() => removeActorRow(index)} type="button">
                  Remove
                </button>
              </div>
            ))}
            <datalist id="actor-name-options">
              {actorOptions.map((actor) => (
                <option key={actor.id} value={actor.name} />
              ))}
            </datalist>
            <button className="btn" onClick={addActorRow} type="button">
              Add actor
            </button>
          </div>

          <div className="field">
            <label>Locations</label>
            {locationRows.map((row, index) => (
              <div className="location-row" key={index}>
                <input
                  aria-label={`Location ${index + 1} country`}
                  onChange={(e) => updateLocationRow(index, { country: e.target.value })}
                  placeholder="Country"
                  value={row.country ?? ""}
                />
                <input
                  aria-label={`Location ${index + 1} admin1`}
                  onChange={(e) => updateLocationRow(index, { admin1: e.target.value })}
                  placeholder="Province/State"
                  value={row.admin1 ?? ""}
                />
                <input
                  aria-label={`Location ${index + 1} city`}
                  onChange={(e) => updateLocationRow(index, { city_regency: e.target.value })}
                  placeholder="City/Regency"
                  value={row.city_regency ?? ""}
                />
                <button className="btn" onClick={() => removeLocationRow(index)} type="button">
                  Remove
                </button>
              </div>
            ))}
            <button className="btn" onClick={addLocationRow} type="button">
              Add location
            </button>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" type="submit">
              Save
            </button>
            <button className="btn" onClick={() => setEditing(false)} type="button">
              Cancel
            </button>
          </div>
        </form>
      </FramedPanel>
    );
  }

  return (
    <FramedPanel className="review-event-card" meta="Draft intelligence" title="Event">
      {evidenceQuote && <p className="evidence-quote">&ldquo;{evidenceQuote}&rdquo;</p>}

      <div className="facts-grid">
        <div>
          <span className="field-label">Title</span>
          <p>{event.title}</p>
        </div>
        <div>
          <span className="field-label">Type</span>
          <p>
            {event.event_type ? event.event_type.name : "Not stated"}
          </p>
          <EventTypeDescription
            eventType={event.event_type ?? undefined}
            needsSelection={!event.event_type}
          />
        </div>
        <div>
          <span className="field-label">Event date</span>
          <p>{formatDate(event.event_date, event.event_date_precision)}</p>
        </div>
        <div>
          <span className="field-label">Locations</span>
          <p>
            {event.locations.length > 0
              ? event.locations.map(formatLocation).join("; ")
              : "Not stated"}
          </p>
        </div>
        <div>
          <span className="field-label">Actors</span>
          <p>
            {event.actors.length > 0
              ? event.actors
                  .map(
                    (eventActor) =>
                      `${eventActor.actor.name} (${eventActor.role})${
                        eventActor.actor.is_active ? "" : " — suggested"
                      }`,
                  )
                  .join("; ")
              : "Not stated"}
          </p>
        </div>
      </div>

      <div className="field">
        <span className="field-label">Summary</span>
        <p>{event.summary}</p>
      </div>

      <div className="field">
        <span className="field-label">Epistemic status</span>
        <EpistemicStatusControl
          onChange={(value) => onSave({ epistemic_status: value })}
          value={event.epistemic_status}
        />
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" disabled={!isDraft} onClick={startEditing} type="button">
          Edit fields
        </button>
        <button className="btn" disabled={!isDraft} onClick={onReject} type="button">
          Reject
        </button>
        <button
          className="btn btn-primary"
          disabled={!isDraft || Boolean(approveDisabledReason)}
          onClick={onApprove}
          title={approveDisabledReason ?? undefined}
          type="button"
        >
          Approve
        </button>
      </div>
      {approveDisabledReason && <p className="document-error">{approveDisabledReason}</p>}
    </FramedPanel>
  );
}
