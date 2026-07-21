import { describe, expect, it } from "vitest";

import { summarizeDashboardEvents } from "@/app/dashboard/dashboard-summary";
import type { EventRead } from "@/lib/events-api";

function makeEvent(overrides: Partial<EventRead> = {}): EventRead {
  return {
    id: "event-1",
    title: "Bridge crossing reported",
    summary: "A convoy crossed the bridge.",
    event_date: "2026-07-10",
    event_date_precision: "exact",
    epistemic_status: "claim",
    review_status: "approved",
    event_type: null,
    actors: [],
    locations: [],
    sources: [],
    duplicate_flags: [],
    extraction_incomplete: false,
    extraction_incomplete_stages: [],
    created_at: "2026-07-14T00:00:00Z",
    updated_at: "2026-07-14T00:00:00Z",
    ...overrides,
  };
}

describe("summarizeDashboardEvents", () => {
  it("counts an unknown Event Date as incomplete", () => {
    const summary = summarizeDashboardEvents([
      makeEvent(),
      makeEvent({ id: "event-2", event_date: null, event_date_precision: "unknown" }),
    ]);

    expect(summary.incomplete_date_count).toBe(1);
  });
});
