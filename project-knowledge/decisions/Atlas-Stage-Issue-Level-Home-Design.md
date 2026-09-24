---
type: Decision
title: Atlas Stage Issue-Level Home Design
description: Approved wireframe direction and reviewable visual specification for a cinematic, Issue-led Terra Space Home.
tags: [project-knowledge, decision, design, home, issues]
status: active
---

# Context

The owner chose the **Atlas Stage** wireframe for a full Home/dashboard overhaul. Home must give
Phase 2 Main Issues equal weight as a useful daily entry point and a compelling portfolio view.
The owner approved a cinematic presentation, reuse of current Terra Space assets, and an
Issue-level globe. The owner approved this written specification before implementation planning.

This design refines [Phase 2 Main Issue Led Terra Insight](Phase-2-Main-Issue-Led-Terra-Insight.md).
It replaces that decision's selected-Issue-only Home globe presentation while keeping its
Issue-first data relationship and Explore behavior. The four destinations from the
[guided command center decision](Terra-Space-Guided-Command-Center-Redesign.md) remain.

# Decision

## Screen structure and visual language

- Keep Home, Explore, Prepare, and Settings as the four clear destinations.
- Make the existing interactive globe the main Home stage. Place one readable selected-Issue
  narrative beside or over it: Issue title, short source-grounded summary, source attribution,
  and a clear **Explore this issue** action. Keep a compact recent-Issue selector and a way to
  search or browse all Issues so the selected story can change without visiting Explore.
- Use the current wordmark, compass, amber-on-dark palette, restrained network background, and
  live globe. Larger editorial type, open spacing, soft light, and subtle transitions replace
  repeated square cards and rigid button rows. The globe and information must stay readable;
  decorative light and motion must not obscure labels or controls.
- Remove the redundant Source → Main Issue → Phase 5 events process strip from Home. Show the
  provenance near the selected Issue instead. Keep event-level map, timeline, record list,
  qualification, and evidence in Explore.
- Follow the stage with one clearly titled **Across all issues** section. Use an open editorial
  layout for the three approved measures below. Keep the denominator and missing-data scope
  visible in plain language.
- On narrow screens, present the selected Issue and selector before the globe, then the measures.
  Preserve a usable map viewport and controls rather than squeezing a desktop composition.

## Globe data and interaction

- A Main Issue is a current Phase 2 review with `main_issue_status = MAIN_ISSUE_FOUND` and a
  usable label. Its identity is its `phase1_source_id`; similar labels from different sources
  remain separate Issues.
- For each Issue, find linked Phase 5 events by the same `phase1_source_id`. Use only those
  events' **Event Geography** entries with `resolution_status = RESOLVED` and valid finite
  latitude/longitude within geographic bounds. Never use Actor Network geography or infer
  coordinates from Issue text.
- Produce one marker per **Issue × unique resolved place**. Multiple events at that place for
  one Issue produce one marker. Prefer `geographic_reference_id` as the place identity; when
  absent, use a stable combination of normalized place name, country code, and coordinates.
  The displayed place label comes from Event Geography. Multiple unique places linked to one
  Issue produce multiple markers, all selecting that Issue.
- Show markers for **all** Issues together. The selected Issue's markers receive stronger
  emphasis; the others stay visible and selectable. A marker click selects its Issue and updates
  the narrative. It never opens an event directly. If several Issues share a location or
  overlapping screen position, show a chooser listing those Issues rather than hiding one.
  The **Explore this issue** action opens Explore with that Issue selected.
- Explain the map as **verified related locations from linked events**. A marker is a place
  associated with an Issue through a resolved event location; it is not a directly geocoded
  Phase 2 Issue or a claim that the Issue itself occurred at that point. An Issue without a
  resolved place remains in the selector, with an honest no-location message when selected.
- Marker labels, selection, chooser, and Explore action work by keyboard and assistive
  technology. Motion respects reduced-motion settings; selection and data remain clear without
  animation. Provide legible loading, error, and empty states.

## Across all issues

All three measures use the current Phase 2 Main Issues and their linked retained Phase 5 events.
Count each Phase 5 event once by event ID, including both `FINAL` and `NOT_FINAL` and any pending
qualification. Unlinked events are excluded from this Issue-scoped section and, if present,
their exclusion is disclosed.

1. **Main Issues:** count distinct eligible Phase 2 Main Issue source IDs.
2. **Countries with related event locations:** count distinct valid `country_iso3` codes from
   resolved Event Geography attached to linked events with valid coordinates, using the same
   location eligibility as the globe. Do not count Actor Network countries.
   Locations with missing country codes may appear on the globe if coordinates are valid but
   cannot increase the country measure. Do not estimate a country from coordinates.
3. **Events by type:** count linked Phase 5 event IDs by their classified Event Type. Show
   missing classification as **Unclassified**. The distribution must make every type available,
   even if the first view emphasizes the most common ones.

An interactive measure or type opens Explore with the corresponding Issue/event scope or filter.
If a measure cannot be represented by an existing Explore filter, its interaction must first
lead to an explicitly labeled all-Issues view rather than imply a filter that was not applied.
Actual values come from live data; mockup numbers and illustrative map positions are never
shipped as data.

## States and presentation checks

- Desktop: the selected Issue, globe, all-Issue markers, selector, and primary action should be
  understandable in a 16:9 capture without requiring the lower measures to share the hero area.
- Mobile and browser zoom from 90% to 150%: no horizontal page overflow or hidden primary action.
- Show source-grounded summary and location coverage separately. A loading or failed data request
  must not appear as zero Issues; an empty eligible dataset must explain the absence of Issues.
- Reuse the real map, current source data, and current visual assets. The approved mockup is a
  composition reference, not a data source or a replacement for the functional globe.

# Alternatives considered

- **Issue Dossier:** a document-led first screen with the globe as supporting context. It gave
  the Issue more reading space but less of the cinematic map presence the owner preferred.
- **Event-pin Atlas:** the same visual stage with one pin per Phase 5 event. The owner rejected
  event-level points on Home; that level of detail belongs in Explore.
- **Selected-Issue-only map:** simpler, but it hides the broader Issue landscape. The owner chose
  all Issues visible with the selection highlighted.

# Reasons

The Atlas Stage makes one Issue easy to understand while showing the wider field of related
places. Source-linked Event Geography provides a traceable basis for pins without inventing a
direct Issue location. The open measure section conveys scope without returning to the rigid,
box-heavy dashboard the owner wanted to change.

# Consequences

Home needs a derived Issue-place view and shared selection state for the globe, chooser, and
Issue selector. Explore remains the place for event-level investigation. Existing Home event
pins and event-focused hero totals will be replaced when this design is implemented. No database
or n8n change is part of this design.

The implementation plan should include meaningful checks: duplicate events at one place yield
one Issue marker; an Issue with two places yields two markers; overlapping Issues remain
selectable; an unlocated Issue remains selectable; invalid or unresolved geography yields no
marker; country count deduplicates ISO3 codes; event-type totals count each linked event once;
and Home marker actions never open an event detail.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Project Knowledge](../Project-knowledge-Index.md)
