import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EventTimeline } from "@/components/event-timeline";
import type { EventRead } from "@/lib/events-api";

function makeEvent(id: string, title: string, startDate: string | null): EventRead {
  return {
    id,
    title,
    summary: "Summary",
    start_date: startDate,
    start_date_precision: startDate ? "exact" : null,
    end_date: null,
    end_date_precision: null,
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

describe("EventTimeline", () => {
  it("orders known dates in the requested direction and keeps Date unknown last", () => {
    render(
      <EventTimeline
        events={[
          makeEvent("old", "Older event", "2026-01-01"),
          makeEvent("unknown", "Undated event", null),
          makeEvent("new", "Newer event", "2026-07-14"),
        ]}
        hasActiveFilters={false}
        sort="date_desc"
      />,
    );

    const titles = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(titles).toEqual(["Newer event", "Older event", "Undated event"]);
    expect(screen.getByRole("heading", { name: "Date unknown" })).toBeInTheDocument();
  });

  it("uses ascending order when requested", () => {
    render(
      <EventTimeline
        events={[makeEvent("new", "Newer event", "2026-07-14"), makeEvent("old", "Older event", "2026-01-01")]}
        hasActiveFilters={false}
        sort="date_asc"
      />,
    );

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Older event",
      "Newer event",
    ]);
  });

  it("shows a no-data message with a link to Event Review when there are no filters and no approved events", () => {
    render(<EventTimeline events={[]} hasActiveFilters={false} sort="date_desc" />);

    expect(screen.getByText("No approved events yet.")).toBeVisible();
    expect(
      screen.getByRole("link", { name: /approve extracted events in event review/i }),
    ).toHaveAttribute("href", "/event-review");
  });

  it("shows a filtered-empty message with a working Clear filters button when filters are active", () => {
    const onClearFilters = vi.fn();
    render(
      <EventTimeline events={[]} hasActiveFilters onClearFilters={onClearFilters} sort="date_desc" />,
    );

    expect(screen.getByText("No events match these filters.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClearFilters).toHaveBeenCalled();
  });
});
