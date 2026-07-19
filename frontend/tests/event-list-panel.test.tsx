import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EventListPanel } from "@/app/dashboard/event-list-panel";
import type { EventRead } from "@/lib/events-api";

function makeEvent(id: string, title: string): EventRead {
  return {
    id,
    title,
    summary: "Summary",
    event_date: null,
    event_date_precision: null,
    epistemic_status: "confirmed",
    review_status: "approved",
    event_type: null,
    actors: [],
    locations: [],
    sources: [],
    duplicate_flags: [],
    created_at: "2026-07-14T00:00:00Z",
    updated_at: "2026-07-14T00:00:00Z",
  };
}

describe("EventListPanel", () => {
  it("shows the title, item count, description, and each event as a selectable row", () => {
    const onSelect = vi.fn();
    const eventA = makeEvent("event-1", "First report");
    const eventB = makeEvent("event-2", "Second report");

    render(
      <EventListPanel
        description="Events with no resolved coordinates on the map."
        events={[eventA, eventB]}
        onClose={vi.fn()}
        onSelect={onSelect}
        title="Unresolved locations"
      />,
    );

    expect(screen.getByRole("heading", { name: "Unresolved locations" })).toBeVisible();
    expect(screen.getByText("2")).toBeVisible();
    expect(screen.getByText("Events with no resolved coordinates on the map.")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Second report" }));
    expect(onSelect).toHaveBeenCalledWith(eventB);
  });

  it("shows a custom empty message when there are no events", () => {
    render(
      <EventListPanel
        emptyMessage="Every event in this view has a resolved location."
        events={[]}
        onClose={vi.fn()}
        onSelect={vi.fn()}
        title="Unresolved locations"
      />,
    );

    expect(screen.getByText("Every event in this view has a resolved location.")).toBeVisible();
  });

  it("calls onClose when the Close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <EventListPanel events={[]} onClose={onClose} onSelect={vi.fn()} title="Events at this point" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
