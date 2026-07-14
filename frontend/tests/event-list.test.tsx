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
    render(<EventList events={[makeEvent()]} onSelect={vi.fn()} />);

    expect(screen.getByText("Bridge crossing reported")).toBeInTheDocument();
    expect(screen.getByText("Claim")).toBeInTheDocument();
    expect(screen.getByText("Movement")).toBeInTheDocument();
    expect(screen.getByText("Date unknown")).toBeInTheDocument();
    expect(screen.getByText("Not stated")).toBeInTheDocument();
    expect(screen.getByText("2 sources")).toBeInTheDocument();
  });

  it("selects an event from its list row", () => {
    const onSelect = vi.fn();
    render(<EventList events={[makeEvent()]} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: /bridge crossing reported/i }));
    expect(onSelect).toHaveBeenCalledWith(makeEvent());
  });
});
