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

export type EventPinCluster = {
  coordinates: [number, number];
  count: number;
  eventIds: string[];
  locationLabel: string;
};

const EMPTY_EVENT_PINS: EventPinFeatureCollection = { type: "FeatureCollection", features: [] };
const EMPTY_CLUSTERS: EventPinCluster[] = [];

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

function wrapLongitude(lng: number): number {
  return ((lng + 180) % 360 + 360) % 360 - 180;
}

type LngLat = { lng: number; lat: number };

// A point is on the far side of the globe from the viewer when it is more than a
// quarter-turn (90 degrees) of great-circle angle away from the point currently facing
// the viewer (the map's center, for this orthographic-style globe view). MapLibre's own
// `transform.isLocationOccluded` does not reliably report this for our circle-layer pins
// and marker-based clusters in this setup, so this is computed directly instead.
export function isBehindGlobe(center: LngLat, point: LngLat): boolean {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const centerLatRad = toRadians(center.lat);
  const pointLatRad = toRadians(point.lat);
  const deltaLngRad = toRadians(point.lng - center.lng);
  const cosAngle =
    Math.sin(centerLatRad) * Math.sin(pointLatRad) +
    Math.cos(centerLatRad) * Math.cos(pointLatRad) * Math.cos(deltaLngRad);
  return cosAngle < 0;
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
  clusters?: EventPinCluster[];
  geojson?: EventPinFeatureCollection;
  onClusterSelect?: (cluster: EventPinCluster) => void;
  onFeatureSelect?: (eventId: string) => void;
  onProjectionModeChange?: (mode: MapProjectionMode) => void;
  selectedEventId?: string;
};

function syncClusterMarkers(
  map: maplibregl.Map,
  clusters: EventPinCluster[],
  clusterMarkersRef: { current: maplibregl.Marker[] },
  clusterSelectionRef: { current: ((cluster: EventPinCluster) => void) | undefined },
) {
  clusterMarkersRef.current.forEach((marker) => marker.remove());
  clusterMarkersRef.current = clusters.map((cluster) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "event-pin-cluster";
    el.textContent = String(cluster.count);
    el.setAttribute("aria-label", `${cluster.count} events at ${cluster.locationLabel}`);
    el.addEventListener("click", (event) => {
      event.stopPropagation();
      clusterSelectionRef.current?.(cluster);
    });
    return new maplibregl.Marker({ element: el }).setLngLat(cluster.coordinates).addTo(map);
  });
}

export function WorldMap({
  clusters = EMPTY_CLUSTERS,
  geojson = EMPTY_EVENT_PINS,
  onClusterSelect,
  onFeatureSelect,
  onProjectionModeChange,
  selectedEventId,
}: WorldMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const pinsRef = useRef(geojson);
  const clustersRef = useRef(clusters);
  const clusterSelectionRef = useRef(onClusterSelect);
  const clusterMarkersRef = useRef<maplibregl.Marker[]>([]);
  const isGlobeModeRef = useRef(true);
  const updatePinOcclusionRef = useRef<() => void>(() => {});
  const projectionModeChangeRef = useRef(onProjectionModeChange);
  const selectedEventRef = useRef(selectedEventId);
  const selectionRef = useRef(onFeatureSelect);
  const mapLoaded = useRef(false);
  const pinPulseExpanded = useRef(false);
  const rotationEnabledRef = useRef(true);
  const rotationSpeedRef = useRef(4);
  const rotationDirectionRef = useRef<1 | -1>(1);
  const [unavailable, setUnavailable] = useState(false);
  const [flatFallback, setFlatFallback] = useState(false);
  const [rotationPlaying, setRotationPlaying] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState(4);
  const [rotationDirection, setRotationDirection] = useState<1 | -1>(1);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [reduceMotionAtMount] = useState(
    () => typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches),
  );

  function toggleRotation() {
    setRotationPlaying((current) => {
      const next = !current;
      rotationEnabledRef.current = next;
      return next;
    });
  }

  function changeRotationSpeed(nextSpeed: number) {
    setRotationSpeed(nextSpeed);
    rotationSpeedRef.current = nextSpeed;
  }

  function toggleRotationDirection() {
    setRotationDirection((current) => {
      const next = current === 1 ? -1 : 1;
      rotationDirectionRef.current = next;
      return next;
    });
  }

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
    const restingZoom = map.getZoom();
    const updateGlobeRingOpacity = () => {
      const wrapper = container.current?.parentElement;
      if (!wrapper) return;
      // The decorative ring is sized for the resting globe view; fade it out as the
      // user zooms away from that view in either direction, so it never sits on top of
      // an enlarged globe surface (zoomed in) or floats oversized around a shrunken one
      // (zoomed out).
      const opacity = Math.max(0, Math.min(1, 1 - Math.abs(map.getZoom() - restingZoom) / 2));
      wrapper.style.setProperty("--globe-ring-opacity", opacity.toString());
    };
    const updatePinOcclusion = () => {
      if (!isGlobeModeRef.current) return;
      const center = map.getCenter();
      const visibleEventIds = pinsRef.current.features
        .filter((feature) => !isBehindGlobe(center, {
          lng: feature.geometry.coordinates[0],
          lat: feature.geometry.coordinates[1],
        }))
        .map((feature) => feature.properties.eventId);
      const pinFilter: ExpressionSpecification = ["in", ["get", "eventId"], ["literal", visibleEventIds]];
      if (map.getLayer(EVENT_PIN_LAYER_ID)) map.setFilter(EVENT_PIN_LAYER_ID, pinFilter);
      if (map.getLayer(EVENT_PIN_HALO_LAYER_ID)) map.setFilter(EVENT_PIN_HALO_LAYER_ID, pinFilter);
      clusterMarkersRef.current.forEach((marker, index) => {
        const cluster = clustersRef.current[index];
        if (!cluster) return;
        const occluded = isBehindGlobe(center, { lng: cluster.coordinates[0], lat: cluster.coordinates[1] });
        marker.getElement().style.display = occluded ? "none" : "";
      });
    };
    updatePinOcclusionRef.current = updatePinOcclusion;
    const handleLoad = () => {
      try {
        map.setProjection({ type: "globe" });
        projectionModeChangeRef.current?.("globe");
      } catch {
        isGlobeModeRef.current = false;
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
      syncClusterMarkers(map, clustersRef.current, clusterMarkersRef, clusterSelectionRef);
      mapLoaded.current = true;
      updateGlobeRingOpacity();
      updatePinOcclusion();
    };

    map.on("error", handleMapError);
    map.on("load", handleLoad);
    map.on("zoom", updateGlobeRingOpacity);
    map.on("move", updatePinOcclusion);

    // Tracks genuine user input only (not MapLibre's "idle"/"move" events, which the
    // continuous pin-halo style transition and the rotation's own camera movement would
    // otherwise keep permanently "not idle", starving rotation of any chance to run).
    const INTERACTION_COOLDOWN_MS = 1200;
    let lastInteractionAt = 0;
    const markInteraction = () => { lastInteractionAt = Date.now(); };
    map.on("mousedown", markInteraction);
    map.on("touchstart", markInteraction);
    map.on("dragstart", markInteraction);
    map.on("zoomstart", markInteraction);
    map.on("keydown", markInteraction);

    // Advances the camera a tiny amount every animation frame (rather than one large
    // eased step per second) so rotation reads as continuous motion instead of a
    // once-a-second stutter. jumpTo is instant/unanimated by design: we are the animation.
    let rotationFrame: number | undefined;
    let lastFrameAt: number | undefined;
    const rotateFrame = () => {
      const now = Date.now();
      if (lastFrameAt !== undefined) {
        const elapsedSeconds = (now - lastFrameAt) / 1000;
        const cooledDown = now - lastInteractionAt > INTERACTION_COOLDOWN_MS;
        if (cooledDown && rotationEnabledRef.current && elapsedSeconds > 0) {
          const center = map.getCenter();
          const nextLng = wrapLongitude(
            center.lng + rotationDirectionRef.current * rotationSpeedRef.current * elapsedSeconds,
          );
          map.jumpTo({ center: [nextLng, center.lat] });
        }
      }
      lastFrameAt = now;
      rotationFrame = window.requestAnimationFrame(rotateFrame);
    };
    if (!reduceMotion) rotationFrame = window.requestAnimationFrame(rotateFrame);

    return () => {
      if (rotationFrame !== undefined) window.cancelAnimationFrame(rotationFrame);
      if (pinPulse !== undefined) window.clearInterval(pinPulse);
      map.off("error", handleMapError);
      map.off("load", handleLoad);
      map.off("zoom", updateGlobeRingOpacity);
      map.off("move", updatePinOcclusion);
      map.off("click", EVENT_PIN_LAYER_ID, handlePinClick);
      map.off("mouseenter", EVENT_PIN_LAYER_ID, handlePinMouseEnter);
      map.off("mouseleave", EVENT_PIN_LAYER_ID, handlePinMouseLeave);
      map.off("mousedown", markInteraction);
      map.off("touchstart", markInteraction);
      map.off("dragstart", markInteraction);
      map.off("zoomstart", markInteraction);
      map.off("keydown", markInteraction);
      clusterMarkersRef.current.forEach((marker) => marker.remove());
      clusterMarkersRef.current = [];
      mapLoaded.current = false;
      pinPulseExpanded.current = false;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    pinsRef.current = geojson;
    clustersRef.current = clusters;
    clusterSelectionRef.current = onClusterSelect;
    projectionModeChangeRef.current = onProjectionModeChange;
    selectedEventRef.current = selectedEventId;
    selectionRef.current = onFeatureSelect;
    if (!mapLoaded.current || !mapRef.current) return;
    const source = mapRef.current.getSource(EVENT_PIN_SOURCE_ID) as { setData: (data: EventPinFeatureCollection) => void } | undefined;
    source?.setData(geojson);
    applySelectedPinPaint(mapRef.current, selectedEventId, pinPulseExpanded.current);
    syncClusterMarkers(mapRef.current, clusters, clusterMarkersRef, clusterSelectionRef);
    updatePinOcclusionRef.current();
  }, [clusters, geojson, onClusterSelect, onFeatureSelect, onProjectionModeChange, selectedEventId]);

  if (unavailable) {
    return <p role="alert">{MAP_UNAVAILABLE_MESSAGE}</p>;
  }
  return (
    <>
      {flatFallback && <p className="map-flat-fallback">Flat map fallback</p>}
      <div aria-label="Offline world map" className="world-map" ref={container} />
      {!reduceMotionAtMount && (
        <div className="globe-rotation-controls">
          <div className="globe-rotation-controls__row">
            <button
              aria-label={rotationPlaying ? "Pause globe rotation" : "Resume globe rotation"}
              className="globe-rotation-toggle"
              onClick={toggleRotation}
              type="button"
            >
              <span aria-hidden="true">{rotationPlaying ? "⏸" : "▶"}</span>
            </button>
            <button
              aria-expanded={controlsOpen}
              aria-label="Rotation settings"
              className="globe-rotation-settings-toggle"
              onClick={() => setControlsOpen((open) => !open)}
              type="button"
            >
              <span aria-hidden="true">⚙</span>
            </button>
          </div>
          {controlsOpen && (
            <div className="globe-rotation-panel">
              <label className="globe-rotation-panel__speed">
                <span>Speed</span>
                <input
                  aria-label="Rotation speed"
                  max={12}
                  min={0.5}
                  onChange={(event) => changeRotationSpeed(Number(event.target.value))}
                  step={0.5}
                  type="range"
                  value={rotationSpeed}
                />
                <span aria-hidden="true">{rotationSpeed.toFixed(1)}°/s</span>
              </label>
              <button
                aria-label={
                  rotationDirection === 1
                    ? "Rotating eastward. Switch to westward."
                    : "Rotating westward. Switch to eastward."
                }
                className="globe-rotation-direction-toggle"
                onClick={toggleRotationDirection}
                type="button"
              >
                <span aria-hidden="true">{rotationDirection === 1 ? "⟳" : "⟲"}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
