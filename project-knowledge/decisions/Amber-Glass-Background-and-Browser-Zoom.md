---
type: Decision
title: Amber Glass Background and Browser Zoom
description: Terra Space adds a restrained amber-on-black background family and glass shell while scaling the Dashboard command deck for common browser zoom levels.
tags: [project-knowledge, decision, design, ui, accessibility]
status: active
---

# Context

The completed aesthetic pass intentionally used an always-pure-black background. During live
testing, the owner found the sidebar and Dashboard too empty and asked for transparency, blur,
and background imagery without losing the Terra Space identity. The owner also asked for the UI
to adapt to browser page zoom between 90% and 150%. These requests change two previously locked
parts of the [Visual Design Direction](Visual-Design-Direction.md): the undecorated pure-black
background and the Dashboard's fixed target viewport.

The owner compared visual directions in a local companion. They selected restrained tactical
glass, rejected a blue-black atmosphere, chose a shared amber-on-black visual family with a
unique motif for each menu, and chose proportional command-deck shrinking instead of vertical
Dashboard scrolling at higher browser zoom.

# Decision

## Brand rules remain unchanged

Terra Space keeps its existing brand system:

- Base black remains `#000000` and the primary accent remains amber `#f2a93b`.
- Existing epistemic-status colors remain unchanged and continue to use text labels.
- System labels, readouts, and controls remain monospace.
- Titles and normal interface copy remain sans serif.
- Source-document content remains serif.
- The current compass logo, corner brackets, restrained motion, and controlled-cinematic
  Dashboard remain the shared visual language.

This decision changes background treatment and panel material only. It does not introduce a new
palette, typography system, or component library.

## Restrained glass shell

The permanent status bar and navigation sidebar use a dark translucent surface with restrained
backdrop blur on every menu. The Dashboard's floating HUD panels use the same material at a
slightly stronger but still readable level. Documents, Event Review, Events, and Settings keep
their reading and editing surfaces nearly opaque so background artwork never competes with text,
forms, evidence, or tables.

Glass surfaces retain visible borders and sufficient dark fill. If backdrop blur is unavailable,
disabled, or too expensive for the browser, the interface falls back to the existing opaque dark
surface without losing information or hierarchy.

## One background family with five menu motifs

Terra Space uses five original local background images that share one visual family: pure black,
fine amber network lines, restrained data points, coordinate/radar geometry, edge-weighted detail,
and a quiet content area. No blue tint is used. The owner-provided reference image establishes the
desired mood but is not copied into the product as the final artwork.

Each menu receives one distinct motif:

1. **Dashboard** - orbital and radar geometry framing, but not covering, the real MapLibre globe.
2. **Documents** - layered document planes and flowing data points.
3. **Event Review** - evidence brackets and converging extraction lines.
4. **Events** - timeline signals and coordinate markers; the artwork must not imply a knowledge
   graph or relationships the MVP does not store.
5. **Settings** - calibration rings and restrained control geometry.

The images are static, compressed, stored with the frontend, and loaded without any network
request. Important artwork stays near the edges so responsive cropping preserves both the motif
and the quiet reading area.

## Browser zoom behavior

The Dashboard Layered Command Deck responds to the effective viewport created by browser zoom as
one composed unit. At 90% and 100%, it does not grow beyond the approved 100% composition. When
zooming above 100% reduces the available CSS-pixel viewport, its globe, HUD panels, dock, internal
spacing, and typography shrink proportionally together to keep the complete command deck in one
screen at 110%, 125%, and 150% on the owner's `1920 x 1080` display.

The permanent status bar and sidebar keep their normal shell behavior. Documents, Event Review,
Events, and Settings reflow normally rather than being globally scaled. Their backgrounds may
crop at the edges, but controls, text, and page content must not be clipped.

Acceptance at every checked zoom level requires:

- no overlapping Dashboard panels;
- no clipped controls or essential content;
- no unintended horizontal page scrolling;
- legible text and usable controls;
- stable background placement with the central content area kept quiet; and
- no regression to reduced-motion behavior or Dashboard interaction.

# Alternatives considered

- **Retain the existing undecorated pure-black background** - rejected because it does not
  address the owner's report that the shell and Dashboard feel empty.
- **Use a blue-black atmospheric background** - rejected by the owner in favor of Terra Space's
  established pure-black and amber identity.
- **Use the same picture on every menu** - rejected because it gives menus too little individual
  character.
- **Use five unrelated pictures** - rejected because the interface could drift into five visual
  styles and become harder to maintain.
- **Apply transparent glass to every work panel** - rejected because evidence, document text,
  forms, and dense tables need stable high-contrast surfaces.
- **Let the Dashboard reflow into a vertically scrolling layout at high browser zoom** - rejected
  by the owner in favor of preserving and shrinking the complete command-deck composition.

# Reasons

- Amber-on-black technical artwork strengthens the existing Terra Space identity instead of
  introducing a competing palette.
- One visual family with five motifs balances page recognition with product consistency.
- Restricting stronger transparency to the shell and Dashboard keeps long reading and review
  sessions comfortable.
- Local compressed assets preserve the project's offline and local-first requirements.
- Scaling the command deck as one unit preserves the spatial composition the owner approved.

# Consequences

- The implementation requires five original background assets, shared shell/background CSS,
  restrained glass tokens or classes, and a Dashboard scaling mechanism based on available
  viewport dimensions.
- Visual QA must use populated states because empty panels cannot prove text contrast or content
  readability.
- Browser verification must cover all five menus at 90%, 100%, 110%, 125%, and 150% page zoom.
- Background assets need deliberate size and compression limits so local startup and route
  navigation remain fast.
- This decision supersedes only the always-undecorated-background rule and fixed-viewport
  assumption in the Visual Design Direction. All other parts of that decision remain active.
- No Roadmap phase or North Star objective changes.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Project Knowledge](../Project-knowledge-Index.md)
- [Visual Design Direction](Visual-Design-Direction.md)
- [Feedback Backlog](../Feedback-Backlog.md)
