import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("maplibre-gl", () => ({
  default: { addProtocol: vi.fn(), Map: vi.fn() },
}));

vi.mock("pmtiles", () => ({
  PMTiles: vi.fn(),
  Protocol: vi.fn(),
}));

import { MAP_UNAVAILABLE_MESSAGE, WORLD_PMTILES_URL, worldMapStyle } from "@/components/world-map";

describe("offline world map configuration", () => {
  it("uses only a local PMTiles source", () => {
    expect(WORLD_PMTILES_URL).toBe("/api/backend/api/maps/world.pmtiles");
    expect(JSON.stringify(worldMapStyle)).not.toMatch(/https?:\/\//);
  });

  it("explains when the local map package is unavailable", () => {
    render(<p>{MAP_UNAVAILABLE_MESSAGE}</p>);

    expect(screen.getByText("Map package is not installed.")).toBeVisible();
  });
});
