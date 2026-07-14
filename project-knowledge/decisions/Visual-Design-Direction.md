---
type: Decision
title: Visual Design Direction
description: Terra Space uses a calm "mission brief" tactical intelligence look on pure black, with a 3D globe, amber accent, and one-thing-at-a-time dense screens.
tags: [project-knowledge, decision, design, ui]
status: active
---

# Context

Phase 1 shipped a deliberately neutral navigation shell and reserved all visual
decisions for a dedicated design session. That session is now complete. This decision
records the locked visual direction so every screen built from Phase 2 onward stays
consistent. It covers only look, feel, layout, and motion — not features or the data model.

# Decision

Terra Space looks and feels like a **personal intelligence "mission brief"**: a calm,
tactical command center on pure black. The mood is inspired by military mission-briefing
screens, but deliberately dialed back for daily, hours-long use — restrained energy,
tasteful motion, high readability.

## Guiding UX principles

1. **One thing at a time.** Dense workflow screens present one decision at a time, not a
   wall of choices (e.g. review one event at a time).
2. **Evidence first.** Always show the exact source sentence an extracted event came from,
   and link source to event. The evidence quote is the focus of a review card.
3. **Never invent.** Unknown values stay explicit ("Date unknown — kept blank", "Not
   stated"). AI suggestions (new type/actor) appear as "confirm?" chips the user approves.
4. **No silent merges.** Possible duplicates are flagged with a clear choice (keep separate /
   link–merge / compare); nothing merges automatically.
5. **Clarity over decoration.** Buttons look like buttons; related controls group closely;
   text labels always accompany color and icons.

## Palette (dark only, pure black)

No light mode in the MVP. Background is always pure black.

- Base background `#000000`; panel surface `#080b0d`; insets/fields `#0a0f12` / `#0c1215`.
- Borders: subtle `#182127`, bright `#2b3a41`.
- Primary accent — **amber `#f2a93b`** (brand, active state, primary actions, corner brackets).
- Text `#cdd7dc`; muted `#5f6d75`; dim `#39454b`.
- Epistemic status colors (always shown with a text label, never color alone):
  Confirmed = green `#3dd68c`, Claim = amber `#f2a93b`, Rumor = blue `#54b8ef`, Denied = red `#e5544b`.

## Typography

- **System / UI chrome & data → monospace** (labels, readouts, coordinates, counts, buttons;
  uppercase with wide letter-spacing for labels).
- **Titles & body UI → sans** (Inter / system UI).
- **Source documents → serif** (Georgia-class) so human-authored content reads distinctly
  from the tactical system chrome.

## Signature components

- **Corner-bracket framed panels** — the signature motif (thin, low-opacity amber L-brackets).
- **Top status bar** — `TERRA` + amber `SPACE` wordmark, and mono readouts including
  `LOCAL // OFFLINE-SAFE` and `LM STUDIO ● OFFLINE`, reinforcing local-first/offline-safe.
- **Logo mark** — a compass ring with four cardinal pointers and a diamond hub, beside the
  `TERRA`/amber `SPACE` wordmark. The icon is sourced from the owner-supplied
  `terraspace-brand-kit-v3` (archived verbatim at `brand/terraspace-brand-kit-v3/` for its
  unused sizes, light-theme variants, and source React/CSS templates); only the kit's `-dark`
  micro variant is wired into the app, recolored from the kit's own gold (`#DFA750`) to this
  decision's amber (`#f2a93b`) so the logo matches every other accent-colored element instead of
  introducing a second gold. The recolored working copy lives at
  `frontend/public/brand/terraspace-micro-dark.svg`, reused for both the navigation rail brand
  row and the browser favicon (`frontend/src/app/icon.svg`, which adds a black backdrop for tab
  visibility). The wordmark itself is **not** the kit's baked-in vector text: the kit's `A`
  glyph renders as two mismatched hairline slivers with no crossbar (a font-to-path conversion
  defect, clearly visible next to every other letter's solid bold fill), so the wordmark is
  rendered as live text in the app's own monospace type instead, matching this decision's
  typography rule for system chrome. The kit's own React/CSS templates (a separate `--ts-*`
  token system) were not adopted, to avoid a second design-token system alongside this
  decision's existing CSS variables.
- **Left navigation rail** — numbered items with visible text labels (Dashboard, Documents,
  Event Review, Events, Settings); active item marked by amber left-border and subtle wash.
- **Buttons** — bordered, mono, uppercase; primary = amber, destructive = red, approve = green.
- **Epistemic status control** — the four statuses as bordered, color-coded, labeled segments.

## Map — 3D globe

- The map is a **3D globe the user can spin and tilt**, rendered with MapLibre's globe
  projection using the existing offline PMTiles package (no new data required).
- It is **not** 3D terrain elevation (out of MVP scope). "3D" means a rotating/tiltable globe.
- Dark globe on black with atmosphere glow, faint starfield, slow auto-rotation, day/night
  shading, glowing location pins with pulse rings, and optional flowing data arcs.
- **Implementation check:** confirm the installed MapLibre version supports globe projection
  (MapLibre GL JS v5+). If unavailable or not performant offline, fall back to a styled flat
  map with the same dark tactical treatment; the globe is the target, not a hard blocker.

## Motion

- **Keep (calm):** globe auto-rotation, gentle pin pulses, slow flowing arc dashes, a slow
  muted activity ticker.
- **Remove (too much):** scanlines, vignette flicker, blinking elements, heavy glow bloom,
  fast/aggressive animation.
- **On dense reading/decision screens (Event Review) motion is essentially off** — mood comes
  from borders, color, and type, not movement.

## Layout rules

- **Full-width alignment:** the top status bar, sub-bars, and content panels span the same
  width with consistent page padding — no narrow centered content in wide black gutters.
- **Group, don't stretch:** related controls cluster with thin dividers instead of being
  pushed to opposite edges.

## Validated screens

- **Dashboard:** status bar → 3 columns (nav rail | globe centerpiece | Recent Intake list).
  The old summary stat tiles were removed as low-value; the Recent Intake list expands instead.
- **Event Review:** status bar → tight clustered review bar
  (`Event Review │ Document X of Y │ progress Event N of M │ Prev · Skip · Next`) → 2 columns
  (source document | one focused event). Left panel highlights only the current event's source
  sentence; right panel leads with the evidence quote, then an airy facts grid, epistemic
  selector, and Reject / Edit / Approve.

# Alternatives considered

- **Focused & calm** (Linear/Notion-style) and **warm editorial** moods — rejected; the owner
  chose the mission-brief tactical direction.
- **Full cinematic/aggressive** treatment (CLASSIFIED banner, scanlines, vignette, blinking
  alerts, heavy glow) — rejected as too much for daily, hours-long use.
- **Flat 2D tactical map** — rejected in favor of a 3D globe (kept only as fallback).
- **All extracted events shown at once** in Event Review — rejected as overwhelming; replaced
  with one-event-at-a-time review.
- **Four summary stat tiles** on the Dashboard — removed as low-value.
- **Light mode / dual theme** — out of scope for the MVP.

# Reasons

- The tactical intelligence look matches the product's job (who/what/where/when + certainty)
  and is the direction the owner chose.
- Dialing energy back and keeping motion calm supports long working sessions without fatigue.
- One-thing-at-a-time directly resolved the owner's "too much to follow" feedback.
- Serif source documents vs mono/sans chrome keeps "the source" and "the system" distinct.
- A 3D globe is achievable on the existing offline tiles, so it adds no data dependency.

# Consequences

- Every new screen inherits this palette, typography, component language, and layout rules.
- Accessibility must be verified: amber-on-black and each status color must meet comfortable
  contrast at the sizes used, and color is never the only signal (status, nav, and actions all
  carry text labels) — this preserves the keyboard-accessible, label-readable constraint.
- Still to settle during implementation planning: exact type/spacing scales and border-radius
  tokens; whether/when to add a Dashboard "Action Queue" summary strip; and the specific
  layouts of the remaining screens (Documents, Events, Settings), which inherit this system.
- The visual-design checkpoint is closed; the next continuation point moves to the detailed
  document/event data model before Phase 2 implementation.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Project Knowledge](../Project-knowledge-Index.md)
- [Current Status](../Current-Status.md)
