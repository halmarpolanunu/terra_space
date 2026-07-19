import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DuplicateComparePanel } from "@/app/event-review/duplicate-compare-panel";
import type { DuplicateFlagRead, EventRead } from "@/lib/events-api";

function makeFlag(overrides: Partial<DuplicateFlagRead> = {}): DuplicateFlagRead {
  return {
    id: "flag-1",
    matched_event_id: "matched-1",
    matched_reason: "Same type (Airstrike); same city (Sana'a); dates 1 day apart",
    resolution: "pending",
    resolved_at: null,
    ...overrides,
  };
}

function makeMatchedEvent(overrides: Partial<EventRead> = {}): EventRead {
  return {
    id: "matched-1",
    title: "Airstrike on fuel depot",
    summary: "An airstrike hit a fuel depot in Sana'a.",
    event_date: "2026-07-10",
    event_date_precision: "exact",
    epistemic_status: "confirmed",
    review_status: "approved",
    event_type: { id: "type-1", name: "Airstrike", description: null, is_active: true },
    actors: [],
    locations: [],
    sources: [],
    duplicate_flags: [],
    created_at: "2026-07-14T00:00:00Z",
    updated_at: "2026-07-14T00:00:00Z",
    ...overrides,
  };
}

describe("DuplicateComparePanel", () => {
  it("renders nothing when there are no pending flags", () => {
    const { container } = render(
      <DuplicateComparePanel
        flags={[makeFlag({ resolution: "kept_separate" })]}
        matchedEvents={{}}
        onResolve={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("shows the matched reason and the matched approved event's summary", () => {
    const matched = makeMatchedEvent();
    render(
      <DuplicateComparePanel
        flags={[makeFlag()]}
        matchedEvents={{ [matched.id]: matched }}
        onResolve={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Same type (Airstrike); same city (Sana'a); dates 1 day apart"),
    ).toBeInTheDocument();
    expect(screen.getByText("Airstrike on fuel depot")).toBeInTheDocument();
  });

  it("calls onResolve with the flag id and chosen resolution", () => {
    const onResolve = vi.fn();
    const matched = makeMatchedEvent();
    render(
      <DuplicateComparePanel
        flags={[makeFlag()]}
        matchedEvents={{ [matched.id]: matched }}
        onResolve={onResolve}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /keep separate/i }));
    expect(onResolve).toHaveBeenCalledWith("flag-1", "kept_separate");

    fireEvent.click(screen.getByRole("button", { name: /link to this event/i }));
    expect(onResolve).toHaveBeenCalledWith("flag-1", "linked");
  });
});
