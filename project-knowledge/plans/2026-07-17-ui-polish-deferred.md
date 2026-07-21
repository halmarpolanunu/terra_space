---
type: Design Plan
title: Deferred UI Polish Plan (Backgrounds and Settings)
description: Combined plan for the two deferred visual/UX polish items the owner has looked at once and put off without a direction - route backgrounds and Settings layout.
tags: [ui, ux, design, backgrounds, settings, dashboard]
status: in-progress
okf_version: "0.1"
---

# Deferred UI Polish Plan (Backgrounds and Settings)

## Why this is one plan

This merges two previously separate plans, [UI Background Re-polish](2026-07-17-ui-background-repolish.md)
and [Settings UI and UX Polish](2026-07-17-settings-ui-ux-polish.md), at the owner's request
("merge point 4 & 5, since its the same"). Both are the same kind of item: a deferred visual/UX
polish pass that was shown to the owner once as a concrete review artifact (all six route
backgrounds together; a current-vs-proposed Settings mockup), and deferred without a direction
("background nanti saja", "nanti saja juga") — neither has had its own required "show the owner
concrete options and get a direction" step actually completed, only attempted. The two scopes
(route backgrounds vs. the Settings screen's information architecture) remain distinct work below;
merging only combines their tracking as one deferred backlog item, not their content.

## Scope 1 - Route backgrounds — implemented 2026-07-21

**Status: done (committed locally; not yet pushed at the owner's request).** After the owner chose
"full re-polish" from a review artifact, all six route backgrounds were regenerated from **one shared
procedurally-drawn HUD/orrery vocabulary** (a local canvas generator, no external image requests) so
they finally read as one family — this fixed the two long-standing inconsistencies the review
surfaced (Sense had drifted to an off-family nebula; Settings was the busiest asset). Each route keeps
a distinct, purpose-fit motif (Dashboard = telemetry, Documents = layered sources, Event Review =
viewfinder/scrutiny, Events = quiet ledger, Sense = signal-flow, Settings = calm calibration dial),
the centre is kept clear for content, and the whole set is smaller on disk (308 KB → ~205 KB). The
owner then requested two tweaks, both applied: (1) the Dashboard's round/spiral corner clusters were
removed entirely in favour of angular HUD framing; (2) two new non-destructive layers were added and
tuned with the owner via a live interactive preview — a subtle CSS **background blur** (`1px`,
`--workspace-bg-blur` on `.app-shell::before`) so content stays the focus, and an **"animus"-style
ambient animation** (`frontend/src/components/workspace-ambiance.tsx`: slow-drifting amber data motes
plus a slow reconstruction scan band, rendered on a fixed canvas behind content). The animation
honours reduced-motion, pauses when the tab is hidden, and its tuned values (motion 150%, drift 2.0×,
scan 110%) live as named constants. Verified: 206 frontend tests, lint, production build, and a live
read-only browser pass across all routes plus a 150% browser-zoom check. **Follow-up the owner
requested (not yet built): expose the blur/motion as a user setting** — recommended as a per-device
browser (localStorage) preference with a small "Appearance" section in Settings, which would also
advance Scope 2 below. The tuned values above become its defaults.

### Goal

Polish the current unique backgrounds so they feel intentional and cohesive, while keeping text,
forms, and event-review work easy to read.

### Work to plan before implementation

- Capture the five current routes at the owner's normal display size and common browser zoom levels.
- Review each background for distraction, contrast, visual balance, repeated motifs, and whether it
  supports the screen's job.
- Establish one shared visual family, plus a clear purpose for each route's unique motif.
- Define safe contrast and opacity rules for background art, glass surfaces, panels, buttons, and
  long-form source text.
- Offer a small set of visual directions to the owner before replacing assets or changing the
  approved visual design direction.
- Generate or revise local assets only after the owner chooses a direction; no external runtime
  image requests are allowed.
- Verify all five routes, reduced-motion behavior, accessibility, file sizes, and browser zoom.

### Guardrails

- Keep the black-and-amber, local intelligence-workspace identity unless the owner explicitly
  approves a new direction.
- Backgrounds must never make controls, text, evidence quotes, or epistemic status harder to read.

## Scope 2 - Settings layout

### Goal

Make Settings feel calm and understandable for a non-technical single user. The screen should show
the few choices needed for normal use first, rather than exposing every technical detail at once.

### Design principles

- Use plain-language labels and short explanations of what a setting changes.
- Separate everyday controls from advanced or rarely used technical controls.
- Keep local-only status visible, but do not make the user interpret implementation details.
- Reveal extra detail progressively: show it when it is needed, not all at once.
- Preserve access to every existing capability; this is a reorganization and clarity pass, not
  hidden removal of important controls.

### Work to plan before implementation

- Inventory every current Settings control, its purpose, how often it is used, and what can go
  wrong if it is changed.
- Group controls into clear areas such as AI connection, event-type management, data/storage, and
  advanced diagnostics, based on the actual current feature set.
- Identify the default view for a normal user and which details should live behind an "Advanced"
  disclosure or separate sub-panel.
- Create a simple screen proposal and review it with the owner before changing the layout.
- Ensure connection errors, offline LM Studio status, save results, and blocked actions remain
  clear and actionable.
- Verify keyboard navigation, browser zoom, empty states, and both normal and offline local-AI
  conditions.

### Acceptance checks

- A first-time user can understand what the screen is for without needing technical knowledge.
- Routine tasks, such as choosing the local AI model or managing event types, remain easy to find.
- Technical details stay available when needed, but no longer dominate the first screen view.
- No setting is silently changed by the redesign.

## Next step when resumed

Start by asking the owner what specifically they want different (or showing a review artifact
again, covering both scopes) - neither scope has had its direction actually chosen yet. Do not
guess a direction and start generating assets or changing the Settings layout.

## Navigation

- [North Star](../North-Star.md)
- [Current Status](../Current-Status.md)
- [Visual Design Direction](../decisions/Visual-Design-Direction.md)
- [Amber Glass Background and Browser Zoom](../decisions/Amber-Glass-Background-and-Browser-Zoom.md)
- [Event Type Descriptions and AI Classification](../decisions/Event-Type-Descriptions-and-AI-Classification.md)
