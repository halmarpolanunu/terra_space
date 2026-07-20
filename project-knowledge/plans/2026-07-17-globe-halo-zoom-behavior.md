---
type: Implementation Plan
title: Globe Halo Zoom Behavior Plan
description: Make the Dashboard globe halo follow the visible globe appropriately while zooming in and out; superseded by outright removal.
tags: [dashboard, globe, maplibre, ui]
status: superseded
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

## Superseded (2026-07-20)

The owner checked this fix live and reported the ring was still visually present/unwanted
regardless of the fade behavior ("Halo ring masih ada. Hapus saja") and asked for it to be removed
outright rather than tuned further. Removed entirely: the `.command-deck-globe::after` ring element,
the `--globe-ring-opacity` CSS variable, and `updateGlobeRingOpacity` (including its `zoom` listener)
in `frontend/src/components/world-map.tsx` and `frontend/src/app/globals.css`. While removing the
`zoom` listener, also fixed a pre-existing frontend test-isolation bug in
`frontend/tests/world-map.test.tsx` unmasked by removing the two ring tests that used to sit between
it and the next test: `"reports globe, flat fallback, and unavailable projection modes..."` left
`map.setProjection` mocked to throw with no reset, which the very next positionally-adjacent test to
depend on a non-throwing default (`"hides pins and cluster markers on the far side of the globe..."`)
silently relied on; that test now resets `map.setProjection`/`map.setSky` itself, matching the
pattern already used by every other test in the file. Verified with the full 188-test frontend suite,
clean lint, a successful production build, a rebuilt/restarted Docker frontend container, and a live
browser check confirming no ring renders around the globe at rest. No location pins existed on the
owner's live database at verification time (see
[Current Status](../Current-Status.md) for why), so pin/halo-adjacent rendering could not be
re-checked in the same pass.

**This did not fully solve it.** The owner reported the ring was still visible after this fix
shipped, and pointed at the `<canvas>` element itself rather than a CSS overlay — meaning the visible
ring was being drawn by MapLibre, not by leftover CSS. Investigated two candidates:

1. `map.setSky({...})` in `world-map.tsx` — MapLibre's native globe atmosphere effect, with a dark
   amber `horizon-color`. This is a real, separate feature from the CSS ring above, and is explicitly
   named in the locked [Visual Design Direction](../decisions/Visual-Design-Direction.md) ("Dark
   globe on black with **atmosphere glow**..."), so removing it changes a locked design element, not
   just a leftover bug. Removed at the owner's explicit, repeated instruction ("REMOVE that RING.
   nothing else") rather than left in a diluted form; this decision element should be considered
   superseded by that instruction going forward.
2. **The actual cause:** `.layered-command-deck::before` in `globals.css` — a third, previously
   unnoticed decorative element (a 1px amber elliptical border, part of the Dashboard's 3D
   depth-plane background styling, unrelated to both the globe-ring and atmosphere work above) sat
   positioned directly over the globe and was the ring still visible after both other removals. Live
   JS inspection of the running map's `getSky()` (confirmed `undefined` — no atmosphere active) ruled
   out candidate 1 as the real cause before finding this one. Removed the whole rule.

All three removals (CSS ring, atmosphere glow, depth-plane ellipse) were verified together: full
187-test frontend suite, clean lint, a successful production build, a rebuilt/restarted Docker
frontend container, and a live browser check confirming the globe renders with no ring or halo of any
kind. Data integrity confirmed unchanged after each of the three container rebuilds this session (16
events: 12 rejected, 4 draft).

## Navigation

- [Current Status](../Current-Status.md)
- [Visual Design Direction](../decisions/Visual-Design-Direction.md)
