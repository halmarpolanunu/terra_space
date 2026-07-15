import Link from "next/link";

import { FramedPanel } from "@/components/framed-panel";
import { StatusChip } from "@/components/status-chip";
import type { EventRead, LocationRead } from "@/lib/events-api";

type EventDetailProps = {
  event: EventRead;
  eventsPath: string;
  onClose: () => void;
  onEdit?: () => void;
};

const EPISTEMIC_LABELS = {
  confirmed: "Confirmed",
  claim: "Claim",
  rumor: "Rumor",
  denied: "Denied",
} as const;

const EPISTEMIC_COLORS = {
  confirmed: "--status-confirmed",
  claim: "--status-claim",
  rumor: "--status-rumor",
  denied: "--status-denied",
} as const;

function formatLocation(location: LocationRead): string {
  const name = [location.city_regency, location.admin1, location.country].filter(Boolean).join(", ") || "Not stated";
  const precision = location.coordinate_precision?.replace("_", "/");
  return precision ? `${name} (${precision} coordinates)` : name;
}

export function EventDetail({ event, eventsPath, onClose, onEdit }: EventDetailProps) {
  const editable = event.review_status === "draft" || event.review_status === "approved";

  return (
    <FramedPanel className="event-detail" title="Event detail">
      <div className="event-detail-heading">
        <h3>{event.title}</h3>
        <button className="btn" onClick={onClose} type="button">Back to list</button>
      </div>
      <div className="facts-grid">
        <div><span className="field-label">Type</span><p>{event.event_type?.name ?? "Not stated"}</p></div>
        <div>
          <span className="field-label">Epistemic status</span>
          <StatusChip
            colorVar={EPISTEMIC_COLORS[event.epistemic_status]}
            label={EPISTEMIC_LABELS[event.epistemic_status]}
            value={event.epistemic_status}
          />
        </div>
        <div><span className="field-label">Start date</span><p>{event.start_date ?? "Date unknown"}</p></div>
        <div><span className="field-label">End date</span><p>{event.end_date ?? "Not stated"}</p></div>
        <div><span className="field-label">Actors</span><p>{event.actors.length ? event.actors.map(({ actor, role }) => `${actor.name} (${role})`).join("; ") : "Not stated"}</p></div>
        <div><span className="field-label">Locations</span><p>{event.locations.length ? event.locations.map(formatLocation).join("; ") : "Not stated"}</p></div>
      </div>
      <div className="field"><span className="field-label">Summary</span><p>{event.summary}</p></div>
      <div className="field">
        <span className="field-label">Sources</span>
        {event.sources.length ? <ul className="event-source-links">{event.sources.map((source) => (
          <li key={source.source_id}>
            {source.document_id ? <Link href={`/documents/${source.document_id}?from=${encodeURIComponent(eventsPath)}`}>{source.reference_label}</Link> : source.reference_label}
          </li>
        ))}</ul> : <p>Not stated</p>}
      </div>
      <p className="event-read-only-note">Sources and evidence are read-only.</p>
      <div className="form-actions">
        {editable && onEdit && <button className="btn btn-primary" onClick={onEdit} type="button">Edit</button>}
      </div>
    </FramedPanel>
  );
}
