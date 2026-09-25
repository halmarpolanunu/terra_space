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
export const ACTOR_ARC_SOURCE_ID = "actor-relationship-arcs";
export const ACTOR_ARC_LAYER_ID = "actor-relationship-arcs";
export const ACTOR_ENDPOINT_SOURCE_ID = "actor-relationship-endpoints";
export const ACTOR_ENDPOINT_LAYER_ID = "actor-relationship-endpoints";

// Distinct pin color for a pipeline exception (dashboard_status: hidden), so a cluster of pins
// is honest about which events are fully validated versus retained with caveats -- see
// decisions/Automatic-Event-Visibility-With-Manual-Filtering.md.
const EXCEPTION_PIN_COLOR_EXPRESSION: ExpressionSpecification = [
  "case",
  ["==", ["get", "isException"], true],
  "#e5544b",
  "#f2a93b",
];
const EXCEPTION_PIN_STROKE_COLOR_EXPRESSION: ExpressionSpecification = [
  "case",
  ["==", ["get", "isException"], true],
  "#ffb199",
  "#ffd17a",
];

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
      // Pipeline exception (dashboard_status: hidden) -- see
      // decisions/Automatic-Event-Visibility-With-Manual-Filtering.md. Drives the distinct pin
      // color below so an exception is never shown identically to a validated event.
      isException: boolean;
    };
  }[];
};

export type EventPinCluster = {
  coordinates: [number, number];
  count: number;
  eventIds: string[];
  locationLabel: string;
  ariaLabel?: string;
  selected?: boolean;
};

export type RelationshipArcInput = {
  id: string;
  evidence_quote: string;
  source: {
    actor_name: string;
    location: { longitude: number; latitude: number };
  };
  target: {
    actor_name: string;
    location: { longitude: number; latitude: number };
  };
};

export type RelationshipArcFeatureCollection = {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    geometry: { type: "LineString"; coordinates: [number, number][] };
    properties: {
      relationshipId: string;
      sourceName: string;
      targetName: string;
      evidenceQuote: string;
    };
  }[];
};

export type RelationshipEndpointFeatureCollection = {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: {
      relationshipId: string;
      role: "source" | "target";
      actorName: string;
    };
  }[];
};

export function buildRelationshipArcs(
  relationships: RelationshipArcInput[],
): RelationshipArcFeatureCollection {
  return {
    type: "FeatureCollection",
    features: relationships.map((relationship) => ({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [relationship.source.location.longitude, relationship.source.location.latitude],
          [relationship.target.location.longitude, relationship.target.location.latitude],
        ],
      },
      properties: {
        relationshipId: relationship.id,
        sourceName: relationship.source.actor_name,
        targetName: relationship.target.actor_name,
        evidenceQuote: relationship.evidence_quote,
      },
    })),
  };
}

export function buildRelationshipEndpoints(
  relationshipArcs: RelationshipArcFeatureCollection,
): RelationshipEndpointFeatureCollection {
  return {
    type: "FeatureCollection",
    features: relationshipArcs.features.flatMap((arc) => [
      {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: arc.geometry.coordinates[0] },
        properties: {
          relationshipId: arc.properties.relationshipId,
          role: "source" as const,
          actorName: arc.properties.sourceName,
        },
      },
      {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: arc.geometry.coordinates[1] },
        properties: {
          relationshipId: arc.properties.relationshipId,
          role: "target" as const,
          actorName: arc.properties.targetName,
        },
      },
    ]),
  };
}

const EMPTY_EVENT_PINS: EventPinFeatureCollection = { type: "FeatureCollection", features: [] };
const EMPTY_CLUSTERS: EventPinCluster[] = [];
const EMPTY_RELATIONSHIP_ARCS: RelationshipArcFeatureCollection = { type: "FeatureCollection", features: [] };

export type MapProjectionMode = "globe" | "flat" | "unavailable";

type NumericPaintValue = number | ExpressionSpecification;

function selectedPaintValue(
  selectedEventId: string | readonly string[] | undefined,
  selectedValue: number,
  restingValue: number,
): NumericPaintValue {
  if (!selectedEventId || (Array.isArray(selectedEventId) && selectedEventId.length === 0)) return restingValue;
  const selected: ExpressionSpecification = typeof selectedEventId !== "string"
    ? ["in", ["get", "eventId"], ["literal", selectedEventId]]
    : ["==", ["get", "eventId"], selectedEventId];
  return ["case", selected, selectedValue, restingValue];
}

function haloRadius(selectedEventId: string | readonly string[] | undefined, expanded = false): NumericPaintValue {
  if (Array.isArray(selectedEventId)) return selectedPaintValue(selectedEventId, expanded ? 23 : 20, 9);
  return selectedPaintValue(selectedEventId, expanded ? 18 : 15, expanded ? 15 : 11);
}

function haloOpacity(selectedEventId: string | readonly string[] | undefined, expanded = false): NumericPaintValue {
  if (Array.isArray(selectedEventId)) return selectedPaintValue(selectedEventId, expanded ? 0.27 : 0.55, 0.08);
  return selectedPaintValue(selectedEventId, expanded ? 0.22 : 0.48, expanded ? 0.12 : 0.34);
}

function pinRadius(selection: string | readonly string[] | undefined): NumericPaintValue {
  return Array.isArray(selection) ? selectedPaintValue(selection, 9, 4.5) : selectedPaintValue(selection, 7.5, 6);
}

function pinOpacity(selection: string | readonly string[] | undefined): NumericPaintValue {
  return Array.isArray(selection) ? selectedPaintValue(selection, 1, 0.48) : selectedPaintValue(selection, 1, selection ? 0.78 : 1);
}

function pinStrokeWidth(selection: string | readonly string[] | undefined): NumericPaintValue {
  return Array.isArray(selection) ? selectedPaintValue(selection, 2.5, 0.8) : selectedPaintValue(selection, 2, 1);
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
  selectedEventId: string | readonly string[] | undefined,
  haloExpanded = false,
) {
  map.setPaintProperty(EVENT_PIN_HALO_LAYER_ID, "circle-radius", haloRadius(selectedEventId, haloExpanded));
  map.setPaintProperty(EVENT_PIN_HALO_LAYER_ID, "circle-opacity", haloOpacity(selectedEventId, haloExpanded));
  map.setPaintProperty(EVENT_PIN_LAYER_ID, "circle-radius", pinRadius(selectedEventId));
  map.setPaintProperty(EVENT_PIN_LAYER_ID, "circle-opacity", pinOpacity(selectedEventId));
  map.setPaintProperty(EVENT_PIN_LAYER_ID, "circle-stroke-width", pinStrokeWidth(selectedEventId));
}

function arcOpacity(selectedRelationshipId: string | undefined): NumericPaintValue {
  if (!selectedRelationshipId) return 0.78;
  return [
    "case",
    ["==", ["get", "relationshipId"], selectedRelationshipId],
    1,
    0.24,
  ];
}

function arcColor(selectedRelationshipId: string | undefined): string | ExpressionSpecification {
  if (!selectedRelationshipId) return "#f2a93b";
  return [
    "case",
    ["==", ["get", "relationshipId"], selectedRelationshipId],
    "#ffe0a3",
    "#8f6a36",
  ];
}

function applySelectedArcPaint(map: maplibregl.Map, selectedRelationshipId: string | undefined) {
  if (!map.getLayer(ACTOR_ARC_LAYER_ID)) return;
  map.setPaintProperty(ACTOR_ARC_LAYER_ID, "line-opacity", arcOpacity(selectedRelationshipId));
  map.setPaintProperty(ACTOR_ARC_LAYER_ID, "line-color", arcColor(selectedRelationshipId));
}

function syncRelationshipArcs(
  map: maplibregl.Map,
  relationshipArcs: RelationshipArcFeatureCollection,
  selectedRelationshipId: string | undefined,
  arcsWereActive: boolean,
): boolean {
  const source = map.getSource(ACTOR_ARC_SOURCE_ID) as {
    setData: (data: RelationshipArcFeatureCollection) => void;
  } | undefined;
  if (relationshipArcs.features.length === 0) {
    if (!arcsWereActive) return false;
    if (map.getLayer(ACTOR_ARC_LAYER_ID)) map.removeLayer(ACTOR_ARC_LAYER_ID);
    map.removeSource(ACTOR_ARC_SOURCE_ID);
    const endpointSource = map.getSource(ACTOR_ENDPOINT_SOURCE_ID);
    if (endpointSource) {
      if (map.getLayer(ACTOR_ENDPOINT_LAYER_ID)) map.removeLayer(ACTOR_ENDPOINT_LAYER_ID);
      map.removeSource(ACTOR_ENDPOINT_SOURCE_ID);
    }
    return false;
  }
  if (source) {
    source.setData(relationshipArcs);
  } else {
    map.addSource(ACTOR_ARC_SOURCE_ID, { type: "geojson", data: relationshipArcs as never });
  }
  if (!map.getLayer(ACTOR_ARC_LAYER_ID)) {
    map.addLayer({
      id: ACTOR_ARC_LAYER_ID,
      type: "line",
      source: ACTOR_ARC_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": arcColor(selectedRelationshipId),
        "line-opacity": arcOpacity(selectedRelationshipId),
        "line-width": 2.25,
      },
    });
  } else {
    applySelectedArcPaint(map, selectedRelationshipId);
  }
  const relationshipEndpoints = buildRelationshipEndpoints(relationshipArcs);
  const endpointSource = map.getSource(ACTOR_ENDPOINT_SOURCE_ID) as {
    setData: (data: RelationshipEndpointFeatureCollection) => void;
  } | undefined;
  if (endpointSource) {
    endpointSource.setData(relationshipEndpoints);
  } else {
    map.addSource(ACTOR_ENDPOINT_SOURCE_ID, { type: "geojson", data: relationshipEndpoints as never });
  }
  if (!map.getLayer(ACTOR_ENDPOINT_LAYER_ID)) {
    map.addLayer({
      id: ACTOR_ENDPOINT_LAYER_ID,
      type: "circle",
      source: ACTOR_ENDPOINT_SOURCE_ID,
      paint: {
        "circle-color": ["case", ["==", ["get", "role"], "source"], "#ffd17a", "#9ed4e3"],
        "circle-opacity": arcOpacity(selectedRelationshipId),
        "circle-radius": 5.5,
        "circle-stroke-color": "#030506",
        "circle-stroke-width": 1.25,
      },
    });
  } else if (map.getLayer(ACTOR_ENDPOINT_LAYER_ID)) {
    map.setPaintProperty(ACTOR_ENDPOINT_LAYER_ID, "circle-opacity", arcOpacity(selectedRelationshipId));
  }
  return true;
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
  autoRotate?: boolean;
  clusters?: EventPinCluster[];
  focusCoordinates?: [number, number];
  geojson?: EventPinFeatureCollection;
  initialZoom?: number;
  projectionMode?: "globe" | "flat";
  onClusterSelect?: (cluster: EventPinCluster) => void;
  onFeatureSelect?: (eventId: string) => void;
  onProjectionModeChange?: (mode: MapProjectionMode) => void;
  relationshipArcs?: RelationshipArcFeatureCollection;
  selectedEventId?: string;
  selectedPinIds?: string[];
  selectedRelationshipId?: string;
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
    el.className = cluster.selected ? "event-pin-cluster event-pin-cluster-selected" : "event-pin-cluster";
    el.textContent = String(cluster.count);
    el.setAttribute("aria-label", cluster.ariaLabel ?? `${cluster.count} events at ${cluster.locationLabel}`);
    el.addEventListener("click", (event) => {
      event.stopPropagation();
      clusterSelectionRef.current?.(cluster);
    });
    return new maplibregl.Marker({ element: el }).setLngLat(cluster.coordinates).addTo(map);
  });
}

export function WorldMap({
  autoRotate = true,
  clusters = EMPTY_CLUSTERS,
  focusCoordinates,
  geojson = EMPTY_EVENT_PINS,
  initialZoom = 2.2,
  projectionMode = "globe",
  onClusterSelect,
  onFeatureSelect,
  onProjectionModeChange,
  relationshipArcs = EMPTY_RELATIONSHIP_ARCS,
  selectedEventId,
  selectedPinIds,
  selectedRelationshipId,
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
  const selectedEventRef = useRef<string | readonly string[] | undefined>(selectedPinIds?.length ? selectedPinIds : selectedEventId);
  const relationshipArcsRef = useRef(relationshipArcs);
  const selectedRelationshipRef = useRef(selectedRelationshipId);
  const relationshipArcsActiveRef = useRef(false);
  const selectionRef = useRef(onFeatureSelect);
  const mapLoaded = useRef(false);
  const pinPulseExpanded = useRef(false);
  const rotationEnabledRef = useRef(autoRotate);
  const rotationSpeedRef = useRef(4);
  const rotationDirectionRef = useRef<1 | -1>(1);
  const [unavailable, setUnavailable] = useState(false);
  const [flatFallback, setFlatFallback] = useState(false);
  const [rotationPlaying, setRotationPlaying] = useState(autoRotate);
  const [rotationSpeed, setRotationSpeed] = useState(4);
  const [rotationDirection, setRotationDirection] = useState<1 | -1>(1);
  const [controlsOpen, setControlsOpen] = useState(false);
  const initialViewRef = useRef({ center: focusCoordinates ?? ([0, 20] as [number, number]), zoom: initialZoom });
  const focusLongitude = focusCoordinates?.[0];
  const focusLatitude = focusCoordinates?.[1];
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
      center: initialViewRef.current.center,
      zoom: initialViewRef.current.zoom,
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
        if (projectionMode === "globe") map.setProjection({ type: "globe" });
        else isGlobeModeRef.current = false;
        projectionModeChangeRef.current?.(projectionMode);
      } catch {
        isGlobeModeRef.current = false;
        setFlatFallback(true);
        projectionModeChangeRef.current?.("flat");
      }
      relationshipArcsActiveRef.current = syncRelationshipArcs(
        map,
        relationshipArcsRef.current,
        selectedRelationshipRef.current,
        relationshipArcsActiveRef.current,
      );
      map.addSource(EVENT_PIN_SOURCE_ID, { type: "geojson", data: pinsRef.current as never });
      map.addLayer({
        id: EVENT_PIN_HALO_LAYER_ID,
        type: "circle",
        source: EVENT_PIN_SOURCE_ID,
        paint: {
          "circle-color": EXCEPTION_PIN_COLOR_EXPRESSION,
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
          "circle-color": EXCEPTION_PIN_COLOR_EXPRESSION,
          "circle-radius": pinRadius(selectedEventRef.current),
          "circle-stroke-color": EXCEPTION_PIN_STROKE_COLOR_EXPRESSION,
          "circle-stroke-width": pinStrokeWidth(selectedEventRef.current),
          "circle-opacity": pinOpacity(selectedEventRef.current),
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
      updatePinOcclusion();
    };

    map.on("error", handleMapError);
    map.on("load", handleLoad);
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
      relationshipArcsActiveRef.current = false;
      pinPulseExpanded.current = false;
      mapRef.current = null;
      map.remove();
    };
  }, [projectionMode]);

  useEffect(() => {
    if (focusLongitude === undefined || focusLatitude === undefined || !mapRef.current || !mapLoaded.current) return;
    mapRef.current.easeTo({ center: [focusLongitude, focusLatitude], duration: reduceMotionAtMount ? 0 : 850 });
  }, [focusLongitude, focusLatitude, reduceMotionAtMount]);

  useEffect(() => {
    pinsRef.current = geojson;
    clustersRef.current = clusters;
    clusterSelectionRef.current = onClusterSelect;
    projectionModeChangeRef.current = onProjectionModeChange;
    const selection = selectedPinIds?.length ? selectedPinIds : selectedEventId;
    selectedEventRef.current = selection;
    relationshipArcsRef.current = relationshipArcs;
    selectedRelationshipRef.current = selectedRelationshipId;
    selectionRef.current = onFeatureSelect;
    if (!mapLoaded.current || !mapRef.current) return;
    const source = mapRef.current.getSource(EVENT_PIN_SOURCE_ID) as { setData: (data: EventPinFeatureCollection) => void } | undefined;
    source?.setData(geojson);
    relationshipArcsActiveRef.current = syncRelationshipArcs(
      mapRef.current,
      relationshipArcs,
      selectedRelationshipId,
      relationshipArcsActiveRef.current,
    );
    applySelectedPinPaint(mapRef.current, selection, pinPulseExpanded.current);
    syncClusterMarkers(mapRef.current, clusters, clusterMarkersRef, clusterSelectionRef);
    updatePinOcclusionRef.current();
  }, [
    clusters,
    geojson,
    onClusterSelect,
    onFeatureSelect,
    onProjectionModeChange,
    relationshipArcs,
    selectedEventId,
    selectedPinIds,
    selectedRelationshipId,
  ]);

  if (unavailable) {
    return <p role="alert">{MAP_UNAVAILABLE_MESSAGE}</p>;
  }
  return (
    <>
      {flatFallback && <p className="map-flat-fallback">Flat map fallback</p>}
      <div aria-label="Offline world map" className="world-map" ref={container} />
      {!reduceMotionAtMount && projectionMode === "globe" && (
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
