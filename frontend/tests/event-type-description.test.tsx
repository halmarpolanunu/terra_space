import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  EventTypeDescription,
  eventTypeNeedsDescription,
} from "@/components/event-type-description";

describe("EventTypeDescription", () => {
  it("shows a selected type definition", () => {
    render(<EventTypeDescription eventType={{
      id: "protest", name: "Protest",
      description: "Collective public demonstration.",
      is_active: true,
    }} />);
    expect(screen.getByText("Collective public demonstration.")).toBeVisible();
  });

  it("guides the reviewer to choose an active type for an untyped draft", () => {
    render(<EventTypeDescription needsSelection />);
    expect(screen.getByText("Select an active Event Type during review if appropriate.")).toBeVisible();
  });

  it("detects only legacy inactive types that lack a definition", () => {
    const base = { id: "type", name: "Type", description: null, is_active: false };
    expect(eventTypeNeedsDescription(base)).toBe(true);
    expect(eventTypeNeedsDescription({ ...base, is_active: true })).toBe(false);
    expect(eventTypeNeedsDescription({ ...base, description: "Defined." })).toBe(false);
    expect(eventTypeNeedsDescription(null)).toBe(false);
  });
});
