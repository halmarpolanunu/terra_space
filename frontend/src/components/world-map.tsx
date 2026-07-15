"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import maplibregl, {
  type ExpressionSpecification,
  type MapLayerMouseEvent,
  type StyleSpecification,
} from "maplibre-gl";
import { PMTiles, Protocol } from "pmtiles";
import { useEffect, useRef, useState } from "react";

export const WORLD_PMTILES_URL = "/api/backend/api/maps/world.pmtiles";
export const MAP_UNAVAILABLE_MESSAGE = "Map package is not installed.";
export const EVENT_PIN_SOURCE_ID = "event-pins";
export const EVENT_PIN_LAYER_ID = "event-pins";
export const EVENT_PIN_HALO_LAYER_ID = "event-pin-halo";

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

export type MapProjectionMode = "globe" | "flat" | "unavailable";

type NumericPaintValue = number | ExpressionSpecification;

function selectedPaintValue(
  selectedEventId: string | undefined,
  selectedValue: number,
  restingValue: number,
): NumericPaintValue {
  if (!selectedEventId) return restingValue;
  return ["case", ["==", ["get", "eventId"], selectedEventId], selectedValue, restingValue];
}

function haloRadius(selectedEventId: string | undefined, expanded = false): NumericPaintValue {
  return selectedPaintValue(selectedEventId, expanded ? 18 : 15, expanded ? 15 : 11);
}

function haloOpacity(selectedEventId: string | undefined, expanded = false): NumericPaintValue {
  return selectedPaintValue(selectedEventId, expanded ? 0.22 : 0.48, expanded ? 0.12 : 0.34);
}

function applySelectedPinPaint(
  map: maplibregl.Map,
  selectedEventId: string | undefined,
  haloExpanded = false,
) {
  map.setPaintProperty(EVENT_PIN_HALO_LAYER_ID, "circle-radius", haloRadius(selectedEventId, haloExpanded));
  map.setPaintProperty(EVENT_PIN_HALO_LAYER_ID, "circle-opacity", haloOpacity(selectedEventId, haloExpanded));
  map.setPaintProperty(EVENT_PIN_LAYER_ID, "circle-radius", selectedPaintValue(selectedEventId, 7.5, 6));
  map.setPaintProperty(EVENT_PIN_LAYER_ID, "circle-opacity", selectedPaintValue(selectedEventId, 1, selectedEventId ? 0.78 : 1));
  map.setPaintProperty(EVENT_PIN_LAYER_ID, "circle-stroke-width", selectedPaintValue(selectedEventId, 2, 1));
}

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
  onProjectionModeChange?: (mode: MapProjectionMode) => void;
  selectedEventId?: string;
};

export function WorldMap({
  geojson = EMPTY_EVENT_PINS,
  onFeatureSelect,
  onProjectionModeChange,
  selectedEventId,
}: WorldMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const pinsRef = useRef(geojson);
  const projectionModeChangeRef = useRef(onProjectionModeChange);
  const selectedEventRef = useRef(selectedEventId);
  const selectionRef = useRef(onFeatureSelect);
  const mapLoaded = useRef(false);
  const pinPulseExpanded = useRef(false);
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
      zoom: 2.2,
      attributionControl: false,
    });
    mapRef.current = map;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let pinPulse: number | undefined;

    const handleMapError = () => {
      setUnavailable(true);
      projectionModeChangeRef.current?.("unavailable");
    };
    const handlePinClick = (event: MapLayerMouseEvent) => {
      const eventId = event.features?.[0]?.properties?.eventId;
      if (eventId) selectionRef.current?.(eventId);
    };
    const handlePinMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const handlePinMouseLeave = () => {
      map.getCanvas().style.cursor = "";
    };
    const handleLoad = () => {
      try {
        map.setProjection({ type: "globe" });
        projectionModeChangeRef.current?.("globe");
      } catch {
        setFlatFallback(true);
        projectionModeChangeRef.current?.("flat");
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
        id: EVENT_PIN_HALO_LAYER_ID,
        type: "circle",
        source: EVENT_PIN_SOURCE_ID,
        paint: {
          "circle-color": "#f2a93b",
          "circle-radius": haloRadius(selectedEventRef.current),
          "circle-blur": 0.55,
          "circle-opacity": haloOpacity(selectedEventRef.current),
        },
      });
      map.addLayer({
        id: EVENT_PIN_LAYER_ID,
        type: "circle",
        source: EVENT_PIN_SOURCE_ID,
        paint: {
          "circle-color": "#f2a93b",
          "circle-radius": selectedPaintValue(selectedEventRef.current, 7.5, 6),
          "circle-stroke-color": "#ffd17a",
          "circle-stroke-width": selectedPaintValue(selectedEventRef.current, 2, 1),
          "circle-opacity": selectedPaintValue(
            selectedEventRef.current,
            1,
            selectedEventRef.current ? 0.78 : 1,
          ),
        },
      });
      map.on("click", EVENT_PIN_LAYER_ID, handlePinClick);
      map.on("mouseenter", EVENT_PIN_LAYER_ID, handlePinMouseEnter);
      map.on("mouseleave", EVENT_PIN_LAYER_ID, handlePinMouseLeave);
      if (!reduceMotion) {
        map.setPaintProperty(EVENT_PIN_HALO_LAYER_ID, "circle-radius-transition", { duration: 1400 });
        map.setPaintProperty(EVENT_PIN_HALO_LAYER_ID, "circle-opacity-transition", { duration: 1400 });
        pinPulse = window.setInterval(() => {
          pinPulseExpanded.current = !pinPulseExpanded.current;
          map.setPaintProperty(
            EVENT_PIN_HALO_LAYER_ID,
            "circle-radius",
            haloRadius(selectedEventRef.current, pinPulseExpanded.current),
          );
          map.setPaintProperty(
            EVENT_PIN_HALO_LAYER_ID,
            "circle-opacity",
            haloOpacity(selectedEventRef.current, pinPulseExpanded.current),
          );
        }, 1400);
      }
      mapLoaded.current = true;
    };

    map.on("error", handleMapError);
    map.on("load", handleLoad);

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
      if (rotation !== undefined) window.clearInterval(rotation);
      if (pinPulse !== undefined) window.clearInterval(pinPulse);
      map.off("error", handleMapError);
      map.off("load", handleLoad);
      map.off("click", EVENT_PIN_LAYER_ID, handlePinClick);
      map.off("mouseenter", EVENT_PIN_LAYER_ID, handlePinMouseEnter);
      map.off("mouseleave", EVENT_PIN_LAYER_ID, handlePinMouseLeave);
      map.off("mousedown", pauseRotation);
      map.off("touchstart", pauseRotation);
      map.off("dragstart", pauseRotation);
      map.off("zoomstart", pauseRotation);
      map.off("movestart", pauseRotation);
      map.off("move", pauseRotation);
      map.off("keydown", pauseRotation);
      map.off("idle", resumeRotation);
      mapLoaded.current = false;
      pinPulseExpanded.current = false;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    pinsRef.current = geojson;
    projectionModeChangeRef.current = onProjectionModeChange;
    selectedEventRef.current = selectedEventId;
    selectionRef.current = onFeatureSelect;
    if (!mapLoaded.current || !mapRef.current) return;
    const source = mapRef.current.getSource(EVENT_PIN_SOURCE_ID) as { setData: (data: EventPinFeatureCollection) => void } | undefined;
    source?.setData(geojson);
    applySelectedPinPaint(mapRef.current, selectedEventId, pinPulseExpanded.current);
  }, [geojson, onFeatureSelect, onProjectionModeChange, selectedEventId]);

  if (unavailable) {
    return <p role="alert">{MAP_UNAVAILABLE_MESSAGE}</p>;
  }
  return <>{flatFallback && <p className="map-flat-fallback">Flat map fallback</p>}<div aria-label="Offline world map" className="world-map" ref={container} /></>;
}
