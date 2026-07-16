---
type: Implementation Plan
title: Globe Rotation Controls Implementation Plan
description: Adds a play/pause button and a speed/direction mini controller to the Dashboard globe, and fixes the pre-existing ambient rotation being permanently stalled.
tags: [dashboard, map, motion, frontend, implementation]
status: completed
okf_version: "0.1"
---

# Globe Rotation Controls Implementation Plan

> **For agentic workers:** Execute inline task-by-task; this repository does not authorize
> subagent-driven execution by default. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The owner asked for a small cinematic control on the Dashboard globe: a button to
play/pause the ambient rotation, then a mini controller to adjust its speed and rotation axis.
Along the way, live testing surfaced that the pre-existing ambient rotation (shipped before this
session) was not actually working at all in the owner's browser — this plan also covers
root-causing and fixing that.

## Context

`frontend/src/components/world-map.tsx` already had an ambient auto-rotation feature (rotating the
camera's bearing by 1°/second, gated on MapLibre's `"idle"` event so it paused during user
interaction). The owner's first live test ("i clicked but the globe does not rotate") led to
grabbing the live map instance directly in the browser (via React fiber internals, since the map
isn't otherwise exposed) and confirming: `map.rotateTo(...)` calls were getting permanently stuck
mid-animation. Root cause, found by testing `essential: true` (ruling out reduced-motion handling)
and then re-reading the pin-halo pulse code: the halo animation
(`map.setPaintProperty(EVENT_PIN_HALO_LAYER_ID, "circle-radius-transition", { duration: 1400 })`,
retriggered every 1400ms forever) keeps a MapLibre style transition perpetually in progress, and
MapLibre's `"idle"` event only fires when *no* transitions are in progress — so once the halo pulse
started, rotation's `"idle"`-gated interval was permanently starved.

## Approach (in the order implemented)

1. **Play/pause button.** Added `rotationPlaying` state + `rotationEnabledRef` (read fresh by the
   rotation loop each tick) and a toggle button in the globe's corner. Hidden entirely when
   `prefers-reduced-motion: reduce` is set at mount, since there's nothing to toggle.
2. **Speed + direction mini controller**, after the owner clarified "rotation axis" means spinning
   like the real Earth (visible longitude changing, revealing new geography) rather than the
   original in-place bearing spin. Switched the rotation mechanism from `map.rotateTo` (bearing) to
   panning `map.getCenter().lng`. Added a small gear button that expands a compact panel with a
   speed slider (0.5–12°/s, default 4 — 4× the original rate) and a direction-reverse toggle,
   collapsed by default.
3. **Root-cause fix for the permanent stall** (see Context). Replaced the `"idle"`/`"move"`-based
   gating entirely with a simple interaction-cooldown timestamp: a `markInteraction` handler on
   direct user-input events only (`mousedown`, `touchstart`, `dragstart`, `zoomstart`, `keydown` —
   deliberately *not* `"move"`/`"movestart"`, since the rotation's own camera movement fires those
   too, which was a second, related self-blocking bug), checked against a 1.2s cooldown. This
   sidesteps the halo pulse's perpetual transition entirely, since it never touches MapLibre's
   `"idle"` state.
4. **Smoothing**, after the owner reported the now-working rotation looked "patah-patah" (choppy)
   because it moved in one big step per second. Replaced the `window.setInterval` (1/sec) +
   `map.easeTo` (1s eased transition) pattern with a `requestAnimationFrame` loop calling
   `map.jumpTo` (instant, unanimated — the frame loop itself is the animation) with a tiny
   per-frame increment proportional to elapsed time. This is the standard technique for continuous
   camera motion and removes the accelerate/decelerate/stop pattern at each 1-second boundary.

## Files changed

- `frontend/src/components/world-map.tsx` — all rotation state/refs, the interaction-cooldown
  gating, the `requestAnimationFrame`/`jumpTo` loop, `wrapLongitude`, and the play/pause + gear +
  panel UI (grouped in one `.globe-rotation-controls` wrapper, positioned via
  `.command-deck-globe`'s existing `position: absolute` context).
- `frontend/src/app/globals.css` — `.globe-rotation-controls`/`.globe-rotation-toggle`/
  `.globe-rotation-settings-toggle`/`.globe-rotation-panel`/`.globe-rotation-direction-toggle`,
  matching the existing amber-glass control language (`--border-bright`, `--accent`, `--glass-blur`,
  `--focus` tokens).
- `frontend/tests/world-map.test.tsx` — mock `map.jumpTo`/`map.getCenter` (the latter stateful,
  updated by `jumpTo`, so tests can assert on cumulative rotated position rather than exact
  per-frame call counts); rotation tests drive `vi.useFakeTimers()` + `vi.advanceTimersByTime()`
  alone, relying on Vitest's built-in fake `requestAnimationFrame` rather than a custom stub (an
  earlier attempt at manually stubbing `requestAnimationFrame` conflicted with `vi.useFakeTimers()`
  installing its own rAF fake, silently overriding it).

## Verification

- `npm test`, `npm run lint`, `npm run build` in `frontend/` after every stage — 152 frontend tests
  passing (11 new/updated across the four stages), clean lint, successful production build each
  time.
- Rebuilt and restarted the real frontend container after every stage.
- Root-cause diagnosis was done directly against the owner's real running instance: grabbed the
  live MapLibre `Map` object via React fiber internals (`element.__reactFiber$*` → walk `return`
  chain → find the hook whose `memoizedState.current` has `getBearing`), then monkey-patched
  `rotateTo`/`easeTo`/`jumpTo` to log real call arguments and timing, confirming first that calls
  were getting stuck (`isEasing()` staying `true` indefinitely), then that plain `setBearing`/
  `jumpTo` (non-animated) still worked, isolating the fault to the animation/idle path specifically.
  Also discovered and worked around a real limitation of the browser automation tool used for this
  investigation: its tab reports `document.visibilityState: "hidden"`, which suspends
  `requestAnimationFrame` entirely — meaning the final smoothing stage could be verified via the
  automated test suite and live state-inspection, but not via visually watching the tool's own
  browser pane. Final confirmation of "it actually looks smooth" is the owner's own report after
  each deployed stage, most recently "great to see the result."

## Navigation

- [Back to Project Knowledge](../Project-knowledge-Index.md)
- [Current Status](../Current-Status.md)
