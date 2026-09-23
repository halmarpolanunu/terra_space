---
type: Decision
title: Terra Space Guided Command Center Redesign
description: Draft UI and UX direction for a clear daily workspace with compelling interactive views built from trusted local data and existing Terra Space assets.
tags: [project-knowledge, decision, design, ui, ux]
status: active
---

# Context

The owner wants to replan and redesign Terra Space so a new viewer can understand its menus,
submenus, charts, and features while the product remains engaging enough to show in portfolio
screenshots and short videos. Existing visual assets must be considered for reuse. The owner chose
equal emphasis between everyday work and presentation, then selected a guided command center over
a globe-only experience or a cosmetic pass on the present navigation.

The current Next.js interface already has a compass logo, an amber-and-black identity, six local
page backgrounds, a MapLibre globe, a Dashboard command deck, Events and Issues views, and Terra
Sense workflow screens. Current navigation groups several peer pages under Terra Insight and Terra
Sense. The new Phase 5 event records appear in a separate read-only section after older Events
content; their numbers and status are not yet the main story of Home and Explore. The live app was
not running during this design audit, so this spec describes the code and assets rather than a
completed visual usability test.

# Decision

## Intended outcome and boundaries

Terra Space remains one local-first product with two understandable jobs: explore trusted events
and Issues, and inspect how source material becomes those outputs. A first-time viewer should be
able to identify where to begin, understand what a chart counts, open an event's source evidence,
and see where uncertain or incomplete results are retained. The Home screen should also make a
coherent 16:9 screenshot or short recording using actual local data.

This redesign changes presentation and navigation. It does not change the North Star, invent
data, activate n8n workflows, merge old and new database records, or grant the app a new data
correction authority. Existing routes and write controls remain available until a separate
retirement or authority change is approved and verified.

## Information architecture

| Destination | Purpose | Primary views |
| --- | --- | --- |
| **Home** | Summarize the current situation and lead to the next useful action | Globe, concise status, recent events, focused charts |
| **Explore** | Investigate trusted output | Events, Issues, map, timeline, evidence detail, shared filters |
| **Prepare** | Understand source-to-event progress | Sources, pipeline stages, attention and run status, taxonomy, actors |
| **Settings** | Configure local operation | Local AI and appearance |

The navigation uses four plain-language top-level destinations, with clear submenus inside
Explore and Prepare. The current page and its parent are visibly selected. Each screen has a
short description and a clear way back. The earlier manual Event Review route remains reachable
under a label that identifies it as an earlier workflow; it is not presented as the correction
path for the current Phase 5 pipeline.

## Home: guided command center

The existing interactive globe is the visual center. It shares the first view with a short
situation summary, a small set of meaningful metrics, and recent event signals. Each metric and
chart links to the filtered records behind it. The first view answers: What is in the current
pipeline? What is final? What needs attention? Where and when did resolved events occur?

Charts are selected for the question they answer: event types as a ranked distribution, dated
events over time, and qualification or attention status. Unknown dates and unresolved locations
are shown explicitly and never plotted as known. The Home composition has a presentation state
that reduces navigation and editing chrome for clean screenshots or recordings while preserving
data labels, source scope, and accessibility. It does not use fabricated or demonstration counts.

## Explore: linked views and evidence

Explore offers map, timeline, and event list views that share the same active filters. Selecting
an event opens a detail view with title, status, source evidence, type, date basis, location
resolution, and limitations in a predictable order. Users can move from a chart mark or map pin
to its underlying event and back without losing filters. Issues have their own clearly labeled
view and retain their source-grounded relationship arcs.

Current Phase 5 events are the default set in Home and Explore. Earlier events remain available
in a separate, clearly labeled view. Counts and charts always name the set they use and never
silently combine them. A Phase 5 event marked `FINAL` can be featured as final; `NOT_FINAL`
remains inspectable with its reason codes. Map pins require resolved **Event Geography**
coordinates. Actor Geography cannot substitute for an event location.

## Prepare: readable pipeline and attention

Prepare displays the source-to-event process as a progression rather than a dense list of
technical tables: Sources, Main Issue, Event Candidates, Event Facts, Event Generation, and Final
Qualification. A stage shows counts, its latest status, and the next appropriate action or
inspection link. Technical failures, review flags, unclassified results, and unresolved
references remain visible with plain-language explanations.

The current pipeline's Issues and event defects are corrected in the pipeline and processed
again, following [Pipeline-Only Data Correction](Pipeline-Only-Data-Correction.md). The Prepare
interface provides observability and evidence, not a second manual editor for Phase 5 records.

## Visual and interaction system

Reuse the current compass identity, amber and black palette, page backgrounds, corner brackets,
MapLibre globe, and restrained glass surfaces. Use the brand kit's responsive mark variants where
their shapes help navigation and presentation, while respecting the existing decision to render
the wordmark as live text. Keep document text on stable reading surfaces and reserve the strongest
depth and motion for Home. Explore and Prepare use short, direct transitions; Review and long
reading tasks remain visually calm. Provide a reduced-motion version of every interaction.

The assets are a starting library, not a requirement to place every background on every screen.
Charts use real data and explicit labels. Hover, focus, selected, loading, empty, and error states
must be designed together. Keyboard users can navigate every essential interaction. Text remains
readable at the project's established 90–150% browser zoom checks.

## Delivery order and verification

1. Inspect the running app against current local Supabase data, capturing each major screen and
   confirming Phase 5 read-only output before choosing exact component changes.
2. Redesign the shared shell and Home while preserving existing routes and behavior.
3. Build Explore's linked map, timeline, list, and evidence detail around the explicit Phase 5
   default and earlier-event switch.
4. Build Prepare's pipeline progression and attention states around the existing read APIs.
5. Polish the presentation state, motion, empty and error states, and responsive desktop layout.

Each pass receives focused interaction tests and a real-browser review with populated data.
Acceptance includes: a first-time user can locate Events, Sources, pipeline status, and Settings;
every count reveals its source set; an event's evidence is easy to reach; unknown values remain
honest; current controls still work; and the Home view remains legible in a 16:9 capture and at
90%, 100%, 110%, 125%, and 150% browser zoom.

# Alternatives considered

- **Globe-led experience:** stronger immediate visual impact, but routine review and navigation
  would depend on extra layers over the map.
- **Polish the existing layout:** smaller implementation change, but retains the ambiguous split
  between current Phase 5 output and earlier Events content.

# Reasons

The guided command center balances the owner's two goals. Existing assets give the design a
recognizable character without replacing working visualization code. Explicit data-set labels
protect the evidence-first and no-invention rules while the app has two event paths. A small
number of purposeful charts makes the first screen useful and presentable.

# Consequences

This decision revisits the older [Visual Design Direction](Visual-Design-Direction.md), [Amber Glass
Background and Browser Zoom](Amber-Glass-Background-and-Browser-Zoom.md), and [Terra Insight and
Terra Sense Product Organization](Terra-Insight-and-Terra-Sense-Product-Organization.md) decisions
at the navigation and screen-composition level. Their local-first, evidence, accessibility, and
asset principles remain relevant. The exact route mapping, component boundaries, and release
checkpoints belong in a separate implementation plan after this written design is approved.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Project Knowledge](../Project-knowledge-Index.md)
- [North Star](../North-Star.md)
- [Current Status](../Current-Status.md)
