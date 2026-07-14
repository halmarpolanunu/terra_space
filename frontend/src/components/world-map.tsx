"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import maplibregl, { type StyleSpecification } from "maplibre-gl";
import { PMTiles, Protocol } from "pmtiles";
import { useEffect, useRef, useState } from "react";

export const WORLD_PMTILES_URL = "/api/backend/api/maps/world.pmtiles";
export const MAP_UNAVAILABLE_MESSAGE = "Map package is not installed.";
export const EVENT_PIN_SOURCE_ID = "event-pins";
export const EVENT_PIN_LAYER_ID = "event-pins";

export type EventPinFeatureCollection = {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: {
      eventId: string;
      title: string;
      locationLabel: string;
      epistemicStatus: string;
      coordinatePrecision: string;
    };
  }[];
};

const EMPTY_EVENT_PINS: EventPinFeatureCollection = { type: "FeatureCollection", features: [] };

export const worldMapStyle: StyleSpecification = {
  version: 8,
  sources: {
    world: { type: "vector", url: `pmtiles://${WORLD_PMTILES_URL}` },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#030506" } },
    {
      id: "land",
      type: "fill",
      source: "world",
      "source-layer": "land",
      paint: { "fill-color": "#10191b" },
    },
    {
      id: "countries",
      type: "line",
      source: "world",
      "source-layer": "countries",
      paint: { "line-color": "#35434a", "line-width": 0.75 },
    },
    {
      id: "admin1",
      type: "line",
      source: "world",
      "source-layer": "admin1",
      minzoom: 3,
      paint: { "line-color": "#263238", "line-width": 0.5 },
    },
  ],
};

type WorldMapProps = {
  geojson?: EventPinFeatureCollection;
  onFeatureSelect?: (eventId: string) => void;
};

export function WorldMap({ geojson = EMPTY_EVENT_PINS, onFeatureSelect }: WorldMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const pinsRef = useRef(geojson);
  const selectionRef = useRef(onFeatureSelect);
  const mapLoaded = useRef(false);
  const [unavailable, setUnavailable] = useState(false);
  const [flatFallback, setFlatFallback] = useState(false);

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
    mapRef.current = map;
    map.on("error", () => setUnavailable(true));
    map.on("load", () => {
      try {
        map.setProjection({ type: "globe" });
      } catch {
        setFlatFallback(true);
      }
      try {
        map.setSky({
          "sky-color": "#030506",
          "horizon-color": "#2d1b05",
          "atmosphere-blend": 0.65,
          "sky-horizon-blend": 0.75,
        });
      } catch { /* The globe projection remains usable without optional sky styling. */ }
      map.addSource(EVENT_PIN_SOURCE_ID, { type: "geojson", data: pinsRef.current as never });
      map.addLayer({
        id: EVENT_PIN_LAYER_ID,
        type: "circle",
        source: EVENT_PIN_SOURCE_ID,
        paint: {
          "circle-color": "#f2a93b",
          "circle-radius": 5,
          "circle-stroke-color": "#161005",
          "circle-stroke-width": 1,
          "circle-opacity": 0.9,
        },
      });
      map.on("click", EVENT_PIN_LAYER_ID, (event) => {
        const eventId = event.features?.[0]?.properties?.eventId;
        if (eventId) selectionRef.current?.(eventId);
      });
      mapLoaded.current = true;
    });

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let idle = false;
    const pauseRotation = () => { idle = false; };
    const resumeRotation = () => { idle = true; };
    map.on("mousedown", pauseRotation);
    map.on("touchstart", pauseRotation);
    map.on("dragstart", pauseRotation);
    map.on("zoomstart", pauseRotation);
    map.on("movestart", pauseRotation);
    map.on("move", pauseRotation);
    map.on("keydown", pauseRotation);
    map.on("idle", resumeRotation);
    const rotation = reduceMotion ? undefined : window.setInterval(() => {
      if (idle) map.rotateTo(map.getBearing() + 1, { duration: 1000, essential: false });
    }, 1000);

    return () => {
      if (rotation) window.clearInterval(rotation);
      mapLoaded.current = false;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    pinsRef.current = geojson;
    selectionRef.current = onFeatureSelect;
    if (!mapLoaded.current || !mapRef.current) return;
    const source = mapRef.current.getSource(EVENT_PIN_SOURCE_ID) as { setData: (data: EventPinFeatureCollection) => void } | undefined;
    source?.setData(geojson);
  }, [geojson, onFeatureSelect]);

  if (unavailable) {
    return <p role="alert">{MAP_UNAVAILABLE_MESSAGE}</p>;
  }
  return <>{flatFallback && <p className="map-flat-fallback">Flat map fallback</p>}<div aria-label="Offline world map" className="world-map" ref={container} /></>;
}
