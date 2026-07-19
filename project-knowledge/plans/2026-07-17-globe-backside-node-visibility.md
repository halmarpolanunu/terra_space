---
type: Implementation Plan
title: Globe Backside Node Visibility Plan
description: Hide location nodes that are on the far side of the 3D globe from the viewer.
tags: [dashboard, globe, maplibre, locations]
status: completed
okf_version: "0.1"
---

# Globe Backside Node Visibility Plan

## Goal

Show a location node only when its location is on the viewer-facing side of the 3D globe. Nodes on the far side should be hidden until globe rotation or user movement brings them into view.

## Work to plan before implementation

- Confirm how current nodes are rendered and whether MapLibre already exposes the required visibility or projection information.
- Define the exact rule for clusters, individual nodes, selected nodes, and keyboard focus when a node moves behind the globe.
- Update node visibility whenever the globe moves, rotates, tilts, or zooms, without causing excessive rendering work.
- Preserve accessible event access through the Event Register and list views even when a map node is hidden.
- Test front-facing, edge-of-globe, and far-side positions during manual rotation and ambient rotation.

## Acceptance checks

- Far-side nodes do not show through the globe.
- Nodes near the globe edge behave smoothly, without obvious flicker.
- Clustering, clicking a visible node, filters, and the unresolved-locations list continue to work.

## Resolution (2026-07-19)

Confirmed (by grabbing the live MapLibre instance in a browser and calling it directly) that
MapLibre's own automatic far-side handling — `map.transform.isLocationOccluded()`, which `Marker`
and `Popup` normally use to fade themselves out — returns the stub value `false` unconditionally in
this app's actual runtime setup, for both mercator-facing and exact-antipodal test points. It cannot
be relied on as-is. Implemented an independent, self-contained check instead:
`isBehindGlobe(center, point)` in `frontend/src/components/world-map.tsx` computes the great-circle
angular distance between a point and the globe's current viewer-facing center (`map.getCenter()`)
using the standard spherical dot-product test — a point is on the far side once that angle exceeds
90°. On every `move` event (which fires for pans, zooms, and the existing ambient-rotation
`jumpTo` calls) and after any pin/cluster data change, this recomputes which event IDs are
currently visible and applies it two ways: a MapLibre `filter` expression
(`["in", ["get","eventId"], ["literal", visibleIds]]`) on both the pin and pin-halo circle layers,
and a `display: none` toggle on each cluster's DOM `Marker` element. Selected/focused nodes follow
the same rule as any other node — no camera auto-rotation was added to reveal a hidden selection,
since that was out of scope. The Event Register and other list-based views are unaffected, since
they read from the same underlying event/cluster data independently of the map's own filter state.
Verified with a pure-function unit test for `isBehindGlobe` against known coordinates, an
integration test confirming the filter and marker-display calls fire correctly on a `move` event,
the full 190-test frontend suite, clean lint, and a successful production build. A live-browser
pixel check was attempted but blocked by unrelated tooling friction in this environment (the
isolated test map's tile source did not finish loading); the fix's correctness rests on the
automated tests and the manual spherical-geometry verification recorded during this work, not a
live visual confirmation. Recommend the owner do a real-browser check once they have approved
events with resolved locations on both sides of the globe.

## Navigation

- [Current Status](../Current-Status.md)
- [Dashboard Location Visibility Implementation Plan](2026-07-16-dashboard-location-visibility.md)
- [Visual Design Direction](../decisions/Visual-Design-Direction.md)
