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

  it("marks a blank suggested definition as requiring review", () => {
    render(<EventTypeDescription eventType={{
      id: "new", name: "New type", description: null, is_active: false,
    }} />);
    expect(screen.getByText("Suggested type — description required before activation.")).toBeVisible();
  });

  it("requires a definition only for an inactive blank type", () => {
    const base = { id: "type", name: "Type", description: null, is_active: false };
    expect(eventTypeNeedsDescription(base)).toBe(true);
    expect(eventTypeNeedsDescription({ ...base, is_active: true })).toBe(false);
    expect(eventTypeNeedsDescription({ ...base, description: "Defined." })).toBe(false);
    expect(eventTypeNeedsDescription(null)).toBe(false);
  });
});
