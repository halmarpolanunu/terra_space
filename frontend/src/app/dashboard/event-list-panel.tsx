"use client";

import { FramedPanel } from "@/components/framed-panel";
import type { EventRead } from "@/lib/events-api";

export type EventListPanelProps = {
  description?: string;
  emptyMessage?: string;
  events: EventRead[];
  onClose: () => void;
  onSelect: (event: EventRead) => void;
  title: string;
};

export function EventListPanel({
  description,
  emptyMessage,
  events,
  onClose,
  onSelect,
  title,
}: EventListPanelProps) {
  return (
    <FramedPanel className="dashboard-list-panel" meta={String(events.length)} title={title}>
      {description && <p className="dashboard-list-panel-description">{description}</p>}
      {events.length === 0 ? (
        <p className="event-empty-state">{emptyMessage ?? "No events to show."}</p>
      ) : (
        <ul className="dashboard-list-panel-items">
          {events.map((event) => (
            <li key={event.id}>
              <button className="dashboard-list-panel-item" onClick={() => onSelect(event)} type="button">
                {event.title}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button className="btn" onClick={onClose} type="button">
        Close
      </button>
    </FramedPanel>
  );
}
