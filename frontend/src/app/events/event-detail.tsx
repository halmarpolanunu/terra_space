import Link from "next/link";

import { FramedPanel } from "@/components/framed-panel";
import { StatusChip } from "@/components/status-chip";
import { isExceptionEvent, type EventRead, type LocationRead } from "@/lib/events-api";

type EventDetailProps = {
  event: EventRead;
  eventsPath: string;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  // Dashboard-status authority actions (see
  // decisions/Fresh-Phase-Prefixed-Supabase-Architecture.md). onPublish makes a hidden event
  // visible for the first time; onRestore un-rejects/un-archives (same end state, different
  // starting point) -- both hit the same backend action, kept separate here only so the button
  // label matches what the owner is actually doing.
  onPublish?: () => void;
  onReject?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  // Browser-only manual visibility (see decisions/Automatic-Event-Visibility-With-Manual-Filtering.md).
  // Independent of the authority actions above and unrelated to the pipeline's own dashboard_status:
  // this never writes to Supabase or the backend.
  isManuallyHidden?: boolean;
  onHide?: () => void;
  onUnhide?: () => void;
};

const EPISTEMIC_LABELS = {
  confirmed: "Confirmed",
  reported: "Reported",
  alleged: "Alleged",
  planned: "Planned",
  denied: "Denied",
  unknown: "Unknown",
} as const;

const EPISTEMIC_COLORS = {
  confirmed: "--status-confirmed",
  reported: "--status-reported",
  alleged: "--status-alleged",
  planned: "--status-planned",
  denied: "--status-denied",
  unknown: "--status-unknown",
} as const;

const DASHBOARD_STATUS_LABELS = {
  published: "Published",
  hidden: "Hidden (pipeline exception)",
  rejected: "Rejected",
  archived: "Archived",
  merged: "Merged into another event",
} as const;

function formatLocation(location: LocationRead): string {
  const name = [location.city_regency, location.admin1, location.country].filter(Boolean).join(", ") || "Not stated";
  const precision = location.coordinate_precision?.replace("_", "/");
  return precision ? `${name} (${precision} coordinates)` : name;
}

function formatEventDate(event: EventRead): string {
  if (!event.event_date) {
    return "Date unknown — kept blank";
  }
  return event.event_date_precision && event.event_date_precision !== "exact"
    ? `${event.event_date} (${event.event_date_precision})`
    : event.event_date;
}

export function EventDetail({
  event,
  eventsPath,
  onClose,
  onEdit,
  onDelete,
  onPublish,
  onReject,
  onArchive,
  onRestore,
  isManuallyHidden,
  onHide,
  onUnhide,
}: EventDetailProps) {
  // "merged" is the one status that blocks direct edit/delete/restore -- see
  // decisions/Fresh-Phase-Prefixed-Supabase-Architecture.md's Dashboard authority table.
  const editable = event.dashboard_status !== "merged";
  const deletable = editable;
  const status = event.dashboard_status;

  return (
    <FramedPanel className="event-detail" title="Event detail">
      <div className="event-detail-heading">
        <h3>{event.title}</h3>
        <button className="btn" onClick={onClose} type="button">Back to list</button>
      </div>
      {isExceptionEvent(event) && (
        <div className="event-exception-callout" role="note">
          <p><strong>Pipeline exception</strong> — retained but not fully validated.</p>
          {event.exception_reason && <p>{event.exception_reason}</p>}
        </div>
      )}
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
        {status && (
          <div>
            <span className="field-label">Status</span>
            <p>
              {DASHBOARD_STATUS_LABELS[status]}
              {event.origin === "manual" ? " · Manually added" : event.origin === "pipeline" ? " · AI generated" : ""}
            </p>
          </div>
        )}
        <div><span className="field-label">Event date</span><p>{formatEventDate(event)}</p></div>
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
      {event.human_modified_at && (
        <p className="event-read-only-note">
          Last edited by you on {new Date(event.human_modified_at).toLocaleString()}.
        </p>
      )}
      {(onHide || onUnhide) && (
        <p className="event-read-only-note">
          Hiding an event is a preference saved only in this browser — it is not sent to Supabase
          and will not carry over to a different browser or device.
        </p>
      )}
      <div className="form-actions">
        {editable && onEdit && <button className="btn btn-primary" onClick={onEdit} type="button">Edit</button>}
        {status === "hidden" && onPublish && <button className="btn btn-primary" onClick={onPublish} type="button">Publish</button>}
        {(status === "rejected" || status === "archived") && onRestore && (
          <button className="btn btn-primary" onClick={onRestore} type="button">Restore</button>
        )}
        {(status === "hidden" || status === "published" || status === "archived") && onReject && (
          <button className="btn" onClick={onReject} type="button">Reject</button>
        )}
        {(status === "hidden" || status === "published" || status === "rejected") && onArchive && (
          <button className="btn" onClick={onArchive} type="button">Archive</button>
        )}
        {deletable && onDelete && <button className="btn btn-destructive" onClick={onDelete} type="button">Delete</button>}
        {!isManuallyHidden && onHide && <button className="btn" onClick={onHide} type="button">Hide</button>}
        {isManuallyHidden && onUnhide && <button className="btn" onClick={onUnhide} type="button">Unhide</button>}
      </div>
    </FramedPanel>
  );
}
