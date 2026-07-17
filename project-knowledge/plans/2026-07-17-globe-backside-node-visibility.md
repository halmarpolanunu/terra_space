---
type: Implementation Plan
title: Globe Backside Node Visibility Plan
description: Hide location nodes that are on the far side of the 3D globe from the viewer.
tags: [dashboard, globe, maplibre, locations]
status: planned
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

## Navigation

- [Current Status](../Current-Status.md)
- [Dashboard Location Visibility Implementation Plan](2026-07-16-dashboard-location-visibility.md)
- [Visual Design Direction](../decisions/Visual-Design-Direction.md)
