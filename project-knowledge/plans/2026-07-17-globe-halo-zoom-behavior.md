---
type: Implementation Plan
title: Globe Halo Zoom Behavior Plan
description: Make the Dashboard globe halo follow the visible globe appropriately while zooming in and out.
tags: [dashboard, globe, maplibre, ui]
status: completed
okf_version: "0.1"
---

# Globe Halo Zoom Behavior Plan

## Goal

Ensure the amber halo around the Dashboard globe stays visually attached to the visible globe when the user zooms in or out, instead of appearing as a fixed overlay that can cover the map.

## Current context

An earlier fix faded the decorative halo as the user zoomed in. The new request requires a fuller review: the halo should behave correctly for both zoom directions and at the normal resting view.

## Work to plan before implementation

- Reproduce the behavior with the real MapLibre globe at rest, zoomed in, and zoomed out.
- Decide whether the halo should scale with the rendered globe, fade beyond defined zoom limits, or use both behaviors; record the chosen behavior before coding.
- Implement the behavior without changing map data, pin coordinates, rotation controls, or the local/offline map requirement.
- Add focused automated checks for zoom state and visual CSS state.
- Perform live browser checks at normal and extreme supported zoom levels, including browser zoom.

## Acceptance checks

- The halo never obscures useful geography or location nodes.
- It stays visually proportional to the globe or deliberately fades according to the approved rule.
- Existing globe rotation, interaction cooldown, and reduced-motion behavior still work.

## Resolution (2026-07-19)

The earlier fix only faded the ring on zoom-in (`1 - (zoom - restingZoom) / 2`); zooming out from
rest left it at full opacity, where it reads as oversized/detached from the now-smaller globe. The
fade rule in `frontend/src/components/world-map.tsx`'s `updateGlobeRingOpacity` was made symmetric
(`1 - Math.abs(zoom - restingZoom) / 2`), so the ring now fades out within two zoom levels of rest
in either direction. No change to rotation, interaction cooldown, or reduced-motion behavior.
Verified with a new zoom-out test alongside the existing zoom-in test (both in
`frontend/tests/world-map.test.tsx`), the full 190-test frontend suite, clean lint, and a successful
production build. Not yet visually re-confirmed in the owner's real browser.

## Navigation

- [Current Status](../Current-Status.md)
- [Visual Design Direction](../decisions/Visual-Design-Direction.md)
