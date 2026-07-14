import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
        sort="date_asc"
      />,
    );

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Older event",
      "Newer event",
    ]);
  });
});
