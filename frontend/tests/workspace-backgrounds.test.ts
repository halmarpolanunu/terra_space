import { describe, expect, it } from "vitest";

import { getWorkspaceBackground } from "@/lib/workspace-backgrounds";

describe("getWorkspaceBackground", () => {
  it.each([
    ["/home", "/backgrounds/dashboard.webp"],
    ["/explore", "/backgrounds/events.webp"],
    ["/prepare", "/backgrounds/sense.webp"],
    ["/documents", "/backgrounds/documents.webp"],
    ["/event-review", "/backgrounds/event-review.webp"],
    ["/settings", "/backgrounds/settings.webp"],
    ["/sense", "/backgrounds/sense.webp"],
    ["/sense/event-types", "/backgrounds/sense.webp"],
  ])("maps %s to its local visual-family asset", (route, asset) => {
    expect(getWorkspaceBackground(route)).toBe(asset);
  });

  it("uses the Home family asset for an unknown shell route", () => {
    expect(getWorkspaceBackground("/unknown")).toBe("/backgrounds/dashboard.webp");
  });
});
