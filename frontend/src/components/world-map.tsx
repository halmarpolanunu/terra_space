"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import maplibregl, { type StyleSpecification } from "maplibre-gl";
import { PMTiles, Protocol } from "pmtiles";
import { useEffect, useRef, useState } from "react";

export const WORLD_PMTILES_URL = "/api/backend/api/maps/world.pmtiles";
export const MAP_UNAVAILABLE_MESSAGE = "Map package is not installed.";

export const worldMapStyle: StyleSpecification = {
  version: 8,
  sources: {
    world: { type: "vector", url: `pmtiles://${WORLD_PMTILES_URL}` },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#eef2f4" } },
    {
      id: "land",
      type: "fill",
      source: "world",
      "source-layer": "land",
      paint: { "fill-color": "#dce6d8" },
    },
    {
      id: "countries",
      type: "line",
      source: "world",
      "source-layer": "countries",
      paint: { "line-color": "#9ba8b0", "line-width": 0.75 },
    },
    {
      id: "admin1",
      type: "line",
      source: "world",
      "source-layer": "admin1",
      minzoom: 3,
      paint: { "line-color": "#c5ced4", "line-width": 0.5 },
    },
  ],
};

export function WorldMap() {
  const container = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!container.current) {
      return;
    }
    const protocol = new Protocol();
    const archive = new PMTiles(WORLD_PMTILES_URL);
    protocol.add(archive);
    maplibregl.addProtocol("pmtiles", protocol.tile);
    const map = new maplibregl.Map({
      container: container.current,
      style: worldMapStyle,
      center: [0, 20],
      zoom: 1,
      attributionControl: false,
    });
    map.on("error", () => setUnavailable(true));
    return () => map.remove();
  }, []);

  if (unavailable) {
    return <p role="alert">{MAP_UNAVAILABLE_MESSAGE}</p>;
  }
  return <div aria-label="Offline world map" className="world-map" ref={container} />;
}
