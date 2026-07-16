import { describe, expect, it } from "vitest";

import { getWorkspaceBackground } from "@/lib/workspace-backgrounds";

describe("getWorkspaceBackground", () => {
  it.each([
    ["/dashboard", "/backgrounds/dashboard.webp"],
    ["/documents", "/backgrounds/documents.webp"],
    ["/event-review", "/backgrounds/event-review.webp"],
    ["/events", "/backgrounds/events.webp"],
    ["/settings", "/backgrounds/settings.webp"],
  ])("maps %s to its local visual-family asset", (route, asset) => {
    expect(getWorkspaceBackground(route)).toBe(asset);
  });

  it("uses the Dashboard family asset for an unknown shell route", () => {
    expect(getWorkspaceBackground("/unknown")).toBe("/backgrounds/dashboard.webp");
  });
});
