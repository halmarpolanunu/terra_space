import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EventList } from "@/components/event-list";
import type { EventRead } from "@/lib/events-api";

function makeEvent(overrides: Partial<EventRead> = {}): EventRead {
  return {
    id: "event-1",
    title: "Bridge crossing reported",
    summary: "A convoy crossed the bridge.",
    start_date: null,
    start_date_precision: null,
    end_date: null,
    end_date_precision: null,
    epistemic_status: "claim",
    review_status: "approved",
    event_type: { id: "type-1", name: "Movement", is_active: true },
    actors: [],
    locations: [],
    sources: [
      { source_id: "source-1", document_id: "doc-1", reference_label: "Report A", evidence_quote: null },
      { source_id: "source-2", document_id: "doc-2", reference_label: "Report B", evidence_quote: null },
    ],
    duplicate_flags: [],
    created_at: "2026-07-14T00:00:00Z",
    updated_at: "2026-07-14T00:00:00Z",
    ...overrides,
  };
}

describe("EventList", () => {
  it("renders required event facts and explicit unknown values", () => {
    render(
      <EventList
        events={[makeEvent()]}
        hasActiveFilters={false}
        onSelect={vi.fn()}
        onSortChange={vi.fn()}
        sort=""
      />,
    );

    expect(screen.getByText("Bridge crossing reported")).toBeInTheDocument();
    expect(screen.getByText("Claim")).toBeInTheDocument();
    expect(screen.getByText("Movement")).toBeInTheDocument();
    expect(screen.getByText("Date unknown")).toBeInTheDocument();
    expect(screen.getByText("Not stated")).toBeInTheDocument();
    expect(screen.getByText("2 sources")).toBeInTheDocument();
  });

  it("selects an event from its list row", () => {
    const onSelect = vi.fn();
    render(
      <EventList
        events={[makeEvent()]}
        hasActiveFilters={false}
        onSelect={onSelect}
        onSortChange={vi.fn()}
        sort=""
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /bridge crossing reported/i }));
    expect(onSelect).toHaveBeenCalledWith(makeEvent());
  });

  it("shows a count and column headers so the table's contents are clear", () => {
    render(
      <EventList
        events={[makeEvent(), makeEvent({ id: "event-2", title: "Second event" })]}
        hasActiveFilters={false}
        onSelect={vi.fn()}
        onSortChange={vi.fn()}
        sort=""
      />,
    );

    expect(screen.getByText("2 approved events")).toBeInTheDocument();
    ["Title", "Status", "Type", "Date", "Location", "Sources"].forEach((header) =>
      expect(screen.getByText(header)).toBeInTheDocument(),
    );
  });

  it("reports sort changes from its own toolbar", () => {
    const onSortChange = vi.fn();
    render(
      <EventList
        events={[makeEvent()]}
        hasActiveFilters={false}
        onSelect={vi.fn()}
        onSortChange={onSortChange}
        sort=""
      />,
    );

    fireEvent.change(screen.getByLabelText("Sort order"), { target: { value: "title_asc" } });
    expect(onSortChange).toHaveBeenCalledWith("title_asc");
  });

  it("shows a no-data message with a link to Event Review when there are no filters and no approved events", () => {
    render(
      <EventList events={[]} hasActiveFilters={false} onSelect={vi.fn()} onSortChange={vi.fn()} sort="" />,
    );

    expect(screen.getByText("No approved events yet.")).toBeVisible();
    expect(
      screen.getByRole("link", { name: /approve extracted events in event review/i }),
    ).toHaveAttribute("href", "/event-review");
  });

  it("shows a filtered-empty message with a working Clear filters button when filters are active", () => {
    const onClearFilters = vi.fn();
    render(
      <EventList
        events={[]}
        hasActiveFilters
        onClearFilters={onClearFilters}
        onSelect={vi.fn()}
        onSortChange={vi.fn()}
        sort=""
      />,
    );

    expect(screen.getByText("No events match these filters.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClearFilters).toHaveBeenCalled();
  });
});
