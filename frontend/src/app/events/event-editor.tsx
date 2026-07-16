"use client";

import { useState, type FormEvent } from "react";

import { FramedPanel } from "@/components/framed-panel";
import { EventTypeDescription } from "@/components/event-type-description";
import type { ActorInput, ActorRead, DatePrecision, EventRead, EventTypeRead, EventUpdate, LocationInput } from "@/lib/events-api";

type EventEditorProps = {
  event: EventRead;
  eventTypeOptions: EventTypeRead[];
  actorOptions: ActorRead[];
  onCancel: () => void;
  onSave: (patch: EventUpdate) => Promise<void>;
};

const DATE_PRECISIONS: DatePrecision[] = ["exact", "month", "year", "unknown"];

export function EventEditor({ event, eventTypeOptions, actorOptions, onCancel, onSave }: EventEditorProps) {
  const [title, setTitle] = useState(event.title);
  const [summary, setSummary] = useState(event.summary);
  const [typeId, setTypeId] = useState(event.event_type?.id ?? "");
  const [startDate, setStartDate] = useState(event.start_date ?? "");
  const [startPrecision, setStartPrecision] = useState<DatePrecision | "">(event.start_date_precision ?? "");
  const [endDate, setEndDate] = useState(event.end_date ?? "");
  const [endPrecision, setEndPrecision] = useState<DatePrecision | "">(event.end_date_precision ?? "");
  const [epistemicStatus, setEpistemicStatus] = useState(event.epistemic_status);
  const [actors, setActors] = useState<ActorInput[]>(event.actors.map(({ actor, role }) => ({ name: actor.name, role })));
  const [locations, setLocations] = useState<LocationInput[]>(event.locations.map(({ country, admin1, city_regency }) => ({ country, admin1, city_regency })));
  const [saving, setSaving] = useState(false);
  const selectedType = eventTypeOptions.find((type) => type.id === typeId);

  async function submit(formEvent: FormEvent) {
    formEvent.preventDefault();
    setSaving(true);
    try {
      await onSave({
        title: title.trim(), summary: summary.trim(),
        event_type: typeId ? { existing: typeId } : undefined,
        start_date: startDate || null, start_date_precision: (startPrecision || null) as DatePrecision | null,
        end_date: endDate || null, end_date_precision: (endPrecision || null) as DatePrecision | null,
        epistemic_status: epistemicStatus,
        actors: actors.filter(({ name }) => name.trim()).map(({ name, role }) => ({ name: name.trim(), role })),
        locations: locations.filter((location) => location.country || location.admin1 || location.city_regency),
      });
    } finally { setSaving(false); }
  }

  return (
    <FramedPanel title="Edit approved event">
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="event-title">Title</label><input id="event-title" onChange={(e) => setTitle(e.target.value)} required value={title} /></div>
        <div className="field"><label htmlFor="event-summary">Summary</label><textarea id="event-summary" onChange={(e) => setSummary(e.target.value)} required value={summary} /></div>
        <div className="field"><label htmlFor="event-type">Event type</label><select id="event-type" onChange={(e) => setTypeId(e.target.value)} value={typeId}><option disabled value="">Choose an event type</option>{eventTypeOptions.filter((type) => type.is_active).map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select><EventTypeDescription eventType={selectedType} /></div>
        <div className="field-row">
          <div className="field"><label htmlFor="event-start-date">Start date</label><input id="event-start-date" onChange={(e) => setStartDate(e.target.value)} type="date" value={startDate} /></div>
          <div className="field"><label htmlFor="event-start-precision">Start date precision</label><select id="event-start-precision" onChange={(e) => setStartPrecision(e.target.value as DatePrecision | "")} value={startPrecision}><option value="">Not stated</option>{DATE_PRECISIONS.map((precision) => <option key={precision} value={precision}>{precision}</option>)}</select></div>
        </div>
        <div className="field-row">
          <div className="field"><label htmlFor="event-end-date">End date</label><input id="event-end-date" onChange={(e) => setEndDate(e.target.value)} type="date" value={endDate} /></div>
          <div className="field"><label htmlFor="event-end-precision">End date precision</label><select id="event-end-precision" onChange={(e) => setEndPrecision(e.target.value as DatePrecision | "")} value={endPrecision}><option value="">Not stated</option>{DATE_PRECISIONS.map((precision) => <option key={precision} value={precision}>{precision}</option>)}</select></div>
        </div>
        <div className="field"><label htmlFor="event-epistemic-status">Epistemic status</label><select id="event-epistemic-status" onChange={(e) => setEpistemicStatus(e.target.value as EventRead["epistemic_status"])} value={epistemicStatus}>{["confirmed", "claim", "rumor", "denied"].map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
        <div className="field"><span className="field-label">Actors</span>{actors.map((actor, index) => <div className="actor-row" key={index}><input aria-label={`Actor ${index + 1} name`} list="event-actor-options" onChange={(e) => setActors((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, name: e.target.value } : row))} value={actor.name} /><select aria-label={`Actor ${index + 1} role`} onChange={(e) => setActors((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, role: e.target.value as ActorInput["role"] } : row))} value={actor.role}><option value="source">Source</option><option value="target">Target</option></select><button className="btn" onClick={() => setActors((rows) => rows.filter((_, rowIndex) => rowIndex !== index))} type="button">Remove</button></div>)}<datalist id="event-actor-options">{actorOptions.filter((actor) => actor.is_active).map((actor) => <option key={actor.id} value={actor.name} />)}</datalist><button className="btn" onClick={() => setActors((rows) => [...rows, { name: "", role: "source" }])} type="button">Add actor</button></div>
        <div className="field"><span className="field-label">Locations</span>{locations.map((location, index) => <div className="location-row" key={index}>{(["country", "admin1", "city_regency"] as const).map((field) => <input aria-label={`Location ${index + 1} ${field === "admin1" ? "province or state" : field === "city_regency" ? "city or regency" : field}`} key={field} onChange={(e) => setLocations((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: e.target.value } : row))} placeholder={field === "admin1" ? "Province/state" : field === "city_regency" ? "City/regency" : "Country"} value={location[field] ?? ""} />)}<button className="btn" onClick={() => setLocations((rows) => rows.filter((_, rowIndex) => rowIndex !== index))} type="button">Remove</button></div>)}<button className="btn" onClick={() => setLocations((rows) => [...rows, { country: "", admin1: "", city_regency: "" }])} type="button">Add location</button></div>
        <p className="event-read-only-note">Sources and evidence are read-only and cannot be changed here.</p>
        <div className="form-actions"><button className="btn btn-primary" disabled={saving} type="submit">Save</button><button className="btn" disabled={saving} onClick={onCancel} type="button">Cancel</button></div>
      </form>
    </FramedPanel>
  );
}
