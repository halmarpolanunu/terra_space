"use client";

import type { ReactNode } from "react";

import { FramedPanel } from "@/components/framed-panel";
import type { EventRead } from "@/lib/events-api";

export type EventListPanelProps = {
  description?: string;
  emptyMessage?: string;
  events: EventRead[];
  onClose: () => void;
  onSelect: (event: EventRead) => void;
  title: string;
  // Optional per-row action (e.g. "Unhide" in the "Hidden by you" panel). Most callers of this
  // read-only "select to view" panel don't need one.
  renderRowAction?: (event: EventRead) => ReactNode;
};

export function EventListPanel({
  description,
  emptyMessage,
  events,
  onClose,
  onSelect,
  title,
  renderRowAction,
}: EventListPanelProps) {
  return (
    <FramedPanel className="dashboard-list-panel" meta={String(events.length)} title={title}>
      {description && <p className="dashboard-list-panel-description">{description}</p>}
      {events.length === 0 ? (
        <p className="event-empty-state">{emptyMessage ?? "No events to show."}</p>
      ) : (
        <ul className="dashboard-list-panel-items">
          {events.map((event) => (
            <li className="dashboard-list-panel-row" key={event.id}>
              <button className="dashboard-list-panel-item" onClick={() => onSelect(event)} type="button">
                {event.title}
              </button>
              {renderRowAction?.(event)}
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
