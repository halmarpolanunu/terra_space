---
type: Plan
title: Orbital HUD and Motion Design
description: Approved design specification for a globe-dominant 3D Orbital HUD Dashboard and controlled cinematic motion across the Terra Space desktop interface.
tags: [project-knowledge, plan, design, motion, dashboard, globe]
status: planned
---

# Orbital HUD and Motion Design

**Approved:** 2026-07-15. The owner selected the **Orbital HUD** concept after comparing three
visual directions, then approved its layout, Dashboard choreography, lighter motion on the other
four screens, and technical boundaries section by section.

## Purpose

Make Terra Space feel more cinematic and alive while preserving the pure-black/amber personal
intelligence language, local-first behavior, evidence-first review workflow, and long-session
readability. The Dashboard's globe becomes the dominant experience instead of one panel among
several. Other information behaves like 3D instruments floating around the globe.

This work supports the [North Star](../North-Star.md): it changes presentation and interaction,
not the document-to-event workflow, data model, approval rules, or offline boundary.

## Target environment

- Terra Space remains a **desktop browser application only**. Phone/mobile presentation is not
  supported or an acceptance target.
- Owner's display: `1920 × 1080`, Windows display scale `100%`, browser zoom assumed `100%`.
- Primary browser viewport for acceptance: `1920 × 930`, representing maximized Chrome after its
  own chrome and the Windows taskbar consume part of the physical screen.
- Secondary short-height check: `1920 × 900`, representing an extra bookmarks bar or similar
  browser UI. A `1280 × 720` desktop safety check may catch overflow, but it does not establish
  phone/mobile support.

## Refined motion identity

The approved personality is **controlled cinematic**: strong staging and depth on the Dashboard,
clear spatial transitions elsewhere, and no aggressive visual noise.

- Signature easing: `cubic-bezier(0.05, 0.7, 0.1, 1)` for entrances and focus changes.
- Duration palette: quick `140 ms`, standard `320 ms`, cinematic `650–700 ms`, ambient `1.4 s+`.
- Entrance pattern: the hero appears first, followed by supporting controls in an orbit-aligned
  stagger. Total stagger should stay below `400 ms`.
- Movement uses opacity and transforms. Normal UI movement stays within `4–12 px`; 3D panel focus
  uses perspective/`translateZ` rather than large screen-crossing travel.
- No bounce, scanlines, vignette flicker, blinking UI, heavy glow bloom, or fast/aggressive loops.

## Dashboard — approved Orbital HUD

### Composition

The top status bar and left navigation rail remain fixed and visually stable. The remaining
Dashboard area becomes one viewport-height stage rather than a long sequence of stacked panels.

- The interactive MapLibre globe stays centered and occupies roughly `65–75%` of the stage. It is
  always the largest and most visually dominant object.
- **Situation Summary** floats to the left of the globe on the nearest-left orbit.
- **Filter Control** floats at the upper right on a slightly deeper orbit.
- **Recent Signals / Timeline** floats at the lower right on a nearer orbit.
- **Event Register** becomes a slim dock along the bottom edge. It shows the approved-event count
  and current filter state while collapsed, then rises into a focused drawer on request.
- The center of the globe remains substantially unobstructed. Floating panels may overlap its
  outer edge, but not cover the main pin field or turn the globe into a background texture.
- Summary, pins, Recent Signals, and Event Register continue to consume the same URL-backed
  approved-event filter state. Focusing or moving an instrument changes presentation only; it
  does not create a second filter or data contract.

### Real 3D depth

"Floating" means spatial depth, not ordinary flat overlays:

- The HUD layer uses CSS perspective and distinct Z planes. Panels have small opposing rotations
  so they visually face the user from different positions around the globe.
- Pointer movement produces restrained parallax: foreground panels move more than deep panels;
  the globe and map controls remain stable enough for accurate pointing and dragging.
- The MapLibre canvas is not placed inside a strongly transformed 3D plane. Its existing globe
  projection remains the real interactive hero; CSS depth belongs primarily to the overlay HUD.
- Thin amber connectors can relate a focused panel to the selected map pin. Connectors are
  informational emphasis, not decoration that is always moving.

### Panel states

Panels are compact in their resting orbit. Selecting a panel moves it forward, enlarges it, and
mutes the competing panels slightly while the globe remains visible.

- Mouse, keyboard, and visible focus all trigger the same state.
- `Escape`, the panel's Close/Return control, or selecting another instrument returns it to orbit.
- Long content scrolls inside the focused panel; it must not expand the overall Dashboard page.
- Controls that are visually hidden or collapsed are immediately removed from keyboard focus.
- Opening and closing a panel never waits for animation before updating real application state.

### Choreography

1. The stable shell is already present; the globe resolves into view over `650–700 ms`.
2. Orbit lines and available pins become legible without a bright flash.
3. Summary, Filter Control, Recent Signals, and the Event Register dock enter in sequence, about
   `70–90 ms` apart, following their orbital direction.
4. Pointer parallax begins only after the entrance settles.
5. Focusing a panel advances it over roughly `320 ms`; its related pin and connector gain amber
   emphasis. Closing reverses the spatial relationship instead of abruptly hiding the panel.

The existing slow globe rotation and gentle pin pulse remain the ambient layer. They pause or
reduce when the user interacts with the globe, as they do today.

## Motion on the other screens

Strong 3D depth is a Dashboard signature because the globe provides its spatial anchor. The other
screens use lighter controlled-cinematic motion so the application feels related without turning
every workflow into a spectacle.

### Documents

- Page heading and intake/queue panels enter in a short coordinated sequence.
- A newly created document row settles into the queue; selection gains an amber wash and edge
  emphasis instead of jumping states.
- New attachment thumbnails use a small scale/opacity settle.
- Queued or processing status may use one restrained activity treatment; completed/error states
  resolve clearly and stop moving.

### Event Review

- Motion remains intentionally minimal because evidence reading and one-at-a-time decisions are
  the priority.
- Previous/Next/Skip changes use a short crossfade plus `4–6 px` directional movement.
- Epistemic status, edit state, and duplicate comparison reveal with direct state transitions;
  there is no ambient motion in the source or evidence panels.

### Events

- Advanced filters disclose smoothly without delaying focus management.
- Filtered/sorted rows enter with a small bounded cascade.
- List → detail → edit uses a consistent shallow depth transition, making the selected record
  feel closer while preserving source visibility and keyboard navigation.

### Settings

- Testing, Saving, and other in-progress actions receive a clear restrained indicator.
- Success and error results enter briefly, then become static text.
- New event-type rows settle into the list; Active/Suggested state changes transition color and
  border without bouncing.

## Accessibility and performance

- `prefers-reduced-motion: reduce` removes parallax, entrance cascades, ambient HUD motion, globe
  auto-rotation, and pin pulse. Information and focus order stay identical.
- Motion never carries meaning alone; labels, counts, status text, borders, and focus indicators
  remain explicit.
- The fixed status bar and navigation rail do not animate position during route changes.
- Use transform and opacity for motion. Avoid layout-property animation and repeated expensive
  blur/shadow work while MapLibre is rendering.
- Parallax amplitude stays small enough to avoid motion discomfort and pointer-target instability.
- Animation cleanup must stop timers/listeners when components unmount.
- No new animation dependency is required unless implementation evidence proves CSS and React are
  insufficient. Reuse the current components and CSS system first.

## Fallback and error states

- If the local map package is missing, the central stage shows the existing explicit map-package
  message in place of the globe. Floating data instruments remain usable; no fake globe is drawn.
- If globe projection falls back to a flat map, the HUD keeps the same hierarchy but disables
  orbit parallax that would falsely imply a 3D sphere.
- If rendering performance drops, pointer parallax and nonessential HUD ambient motion are the
  first effects removed; data interaction and globe controls take priority.
- LM Studio offline/error states remain plain labeled readouts in the fixed status bar. They do
  not blink or trigger an urgent cinematic loop.

## Verification and acceptance

Implementation is complete only when all of the following are true:

1. At `1920 × 930`, the Dashboard stage fits the normal browser viewport, the globe is clearly
   dominant on first view, and no preliminary vertical scrolling is needed to reach it.
2. The same composition remains usable at `1920 × 900`; focused panels use internal scrolling and
   do not cause page overflow.
3. Summary, Filter Control, Recent Signals, and Event Register all work in resting, focused, and
   closing states with mouse and keyboard.
4. Globe dragging, zooming, pin selection, rotation pausing, and map controls remain reliable
   beneath the HUD layer.
5. All five populated screens are inspected in a real browser. Event Review evidence, Documents
   attachments, Events rows/detail, and Settings results must be checked during actual state
   changes, not only as static screenshots.
6. Reduced-motion mode is checked in a browser and has automated coverage for continuous motion.
7. The frontend test suite, lint, and production build pass with no new warnings.
8. No phone/mobile claims, screenshots, acceptance criteria, or new phone-specific styling are
   introduced.

## Alternatives considered

- **Layered Command Deck:** clearer flat-edge composition with three Z planes. Rejected because it
  felt less orbital and less cinematic than the owner's intended floating-3D experience.
- **Holographic Cockpit:** close-up globe with foreground panels occupying more of its surface.
  Rejected because it risked obscuring map data and making routine use tiring.
- **Orbital HUD:** selected because the panels visibly inhabit different 3D orbits while leaving
  the central globe open and dominant.

## Navigation

- [Current Status](../Current-Status.md)
- [North Star](../North-Star.md)
- [Visual Design Direction](../decisions/Visual-Design-Direction.md)
- [Design Pass Audit](2026-07-15-design-pass-audit.md)
- [Back to Project Knowledge](../Project-knowledge-Index.md)
