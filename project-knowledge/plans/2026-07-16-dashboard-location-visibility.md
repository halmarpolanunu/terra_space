---
type: Implementation Plan
title: Dashboard Location Visibility Implementation Plan
description: Frontend-only plan to cluster overlapping globe pins that share an identical gazetteer coordinate and surface a visible unresolved-locations list on the Dashboard.
tags: [dashboard, map, locations, frontend, implementation]
status: completed
okf_version: "0.1"
---

# Dashboard Location Visibility Implementation Plan

> **For agentic workers:** Execute inline task-by-task; this repository does not authorize
> subagent-driven execution by default. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the open
"[Event locations do not reliably reach the Dashboard globe](../Feedback-Backlog.md)" report from
two angles the owner approved: (1) events that resolve to the exact same gazetteer coordinate
currently stack invisibly on one pin — group them into a single marker with a count instead; (2)
events whose location never resolves to any coordinate are currently invisible with no way to tell
— add a visible, clickable "Unresolved locations" list on the Dashboard.

**Architecture:** Entirely frontend. Coordinate grouping happens in application code
(`buildEventMapData`) before data reaches MapLibre, because pins in the same group share an
*identical* coordinate (zooming can never separate them) and because MapLibre GeoJSON sources
silently `JSON.stringify` array/object feature properties with no decode-side parse, and this
style has no configured glyph source (a `symbol` text layer would trip the map's blanket error
handler and hide the whole globe). Cluster markers are therefore rendered as DOM elements via
`maplibregl.Marker`, entirely outside the existing GeoJSON pin source/layers. Both the
cluster-contents list and the unresolved-locations list reuse one new generic list-panel drawer
kind added to the existing `LayeredCommandDeck` (`"list"`), rather than a floating MapLibre Popup
(no existing precedent in this codebase) or two separate one-off UI pieces.

**Tech Stack:** Next.js, TypeScript, MapLibre GL JS, Vitest, Testing Library.

## Global Constraints

- No backend, schema, or API change. No change to the locked
  [Local Location Coordinate Resolution](../decisions/Local-Location-Coordinate-Resolution.md)
  decision — matching stays exact-only, coordinates stay exactly as resolved today.
- No manual coordinate override and no fuzzy/alternate-name gazetteer matching — the owner
  explicitly scoped this to visibility only.
- The "Unresolved locations" list is scoped to the Dashboard's already-filtered approved-event set
  (the same array already driving the map/list/timeline), not Event Review drafts.
- `markerCount` ("Markers · N" header, "Mapped locations" stat) must keep counting resolved
  *locations*, not GeoJSON features, so clustering cannot silently shrink it.
- Keep the existing pin halo/pulse/selection behavior for solo (non-clustered) pins unchanged.

---

### Task 1: Group co-located pins and add resolved-location counting

- [x] In `frontend/src/app/dashboard/event-globe.tsx`, add `locationIsResolved(location)`.
- [x] Add `buildEventMapData(events)`: group resolved `(event, location)` pairs by exact
      `${latitude}:${longitude}`; a group with exactly one distinct event id stays a normal pin
      feature; a group with 2+ distinct event ids becomes one `EventPinCluster`
      (`{ coordinates, count, eventIds, locationLabel }`). Dedupe by event id so one event with two
      same-coordinate locations never becomes a 1-event "cluster."
- [x] Keep `eventLocationsToFeatureCollection(events)` as a thin wrapper over
      `buildEventMapData(events).pins` (unchanged output shape for solo pins).
- [x] Add `eventLocationsToClusters(events)` and `countResolvedEventLocations(events)` (flat count
      of every resolved location, independent of grouping).
- [x] Add `onSelectCluster?: (events: EventRead[], locationLabel: string) => void` to
      `EventGlobeProps`; resolve `cluster.eventIds` back to full `EventRead` objects before calling
      it.

### Task 2: Render cluster markers in the map component

- [x] In `frontend/src/components/world-map.tsx`, add the `EventPinCluster` type and
      `clusters`/`onClusterSelect` props to `WorldMapProps`.
- [x] Add `clustersRef`/`clusterSelectionRef`/`clusterMarkersRef` refs, following the existing
      `pinsRef`/`selectionRef` pattern.
- [x] Add `syncClusterMarkers(map, clusters)`: remove previously tracked markers, then create one
      `<button>` DOM element per cluster (count as text, `aria-label` with count + location) wrapped
      in `new maplibregl.Marker({ element }).setLngLat(...).addTo(map)`, click invokes
      `clusterSelectionRef.current?.(cluster)`.
- [x] Call it once in `handleLoad` and again whenever `clusters` changes in the reactive
      `useEffect`; remove tracked markers in the mount effect's cleanup.
- [x] Leave the existing `EVENT_PIN_LAYER_ID`/`EVENT_PIN_HALO_LAYER_ID` layers and click handlers
      untouched.

### Task 3: Add a reusable list panel

- [x] Add `frontend/src/app/dashboard/event-list-panel.tsx`: `FramedPanel` + a plain list of event
      title buttons (modeled on `EventTimeline`'s row pattern), taking `title`, optional
      `description`/`emptyMessage`, `events`, `onSelect`, `onClose`.

### Task 4: Wire the new drawer panel kind

- [x] In `frontend/src/app/dashboard/layered-command-deck.tsx`, add `"list"` to `CommandDeckPanel`
      and a `list?: ReactNode` prop; extend the drawer ternary to render it.

### Task 5: Surface the unresolved-locations stat

- [x] In `frontend/src/app/dashboard/dashboard-summary.tsx`, add `hasResolvedLocation(event)` and
      `unresolvedLocationEvents(events)` built on `locationIsResolved`; point
      `summarizeDashboardEvents`'s `incomplete_location_count` at
      `unresolvedLocationEvents(events).length`.
- [x] Add a 4th compact stat, "Unresolved locations", to `DashboardSummaryContent` as a `<button>`
      wired to a new `onShowUnresolvedLocations?: () => void` prop, `disabled` at zero (still
      visible).

### Task 6: Wire workspace state

- [x] In `frontend/src/app/dashboard/dashboard-workspace.tsx`, switch `markerCount` to
      `countResolvedEventLocations(events)`.
- [x] Add `listPanel` state and a `showList(...)` helper; reset `listPanel` to `null` inside
      `changeFilters` alongside the existing `setSelectedEvent(null)`.
- [x] Wire `EventGlobe`'s `onSelectCluster` and `DashboardSummaryContent`'s
      `onShowUnresolvedLocations` to `showList(...)`; pass the result as the new `list` prop to
      `LayeredCommandDeck`. Selecting an event from the list calls the existing `selectEvent`.

### Task 7: Styling

- [x] Add `.event-pin-cluster`, `.dashboard-list-panel*`, and `.dashboard-summary-stat-button`
      rules to `frontend/src/app/globals.css` (distinct from the existing
      `.command-deck-drawer > .event-list-panel` rule already used by the register panel).

### Task 8: Tests

- [x] `frontend/tests/event-globe.test.tsx`: `buildEventMapData` grouping and dedupe cases,
      `countResolvedEventLocations` unaffected by grouping.
- [x] `frontend/tests/world-map.test.tsx`: extend the `maplibre-gl` mock with `Marker`; verify
      marker-per-cluster creation, click → `onClusterSelect`, replace-on-update, cleanup-on-unmount.
- [x] `frontend/tests/layered-command-deck.test.tsx`: new case for the `"list"` drawer branch.
- [x] `frontend/tests/event-list-panel.test.tsx` (new): title/description/empty-state/select/close.
- [x] `frontend/tests/dashboard-workspace.test.tsx`: extend the `event-globe` mock with
      `countResolvedEventLocations`; end-to-end case (stat → list → detail) and disabled-at-zero
      case.

### Task 9: Verify

- [x] `npm run lint`, `npm test`, and `npm run build` in `frontend/` — 148 tests passing (11
      new/updated), clean lint, successful production build.
- [x] Live browser check against the owner's real local database (read-only): rebuilt and
      restarted the frontend Docker container, confirmed the new "Unresolved locations" stat
      renders with the correct accessible label and disabled-at-zero state, and confirmed no
      console or network errors. **Caveat:** the owner's live database currently has 0 approved
      events, so cluster markers and a populated unresolved-locations list could not be visually
      confirmed against real data this session — that check is deferred to when approved events
      with locations exist. The exact scenarios (co-located clustering, click → list → detail,
      unresolved-location filtering) are covered by the automated tests above using real
      API-shaped fixtures.
- [x] Updated `Current-Status.md`; marked the overlapping-pins/unresolved-visibility part of the
      [Feedback Backlog](../Feedback-Backlog.md) entry resolved (root-cause matching/extraction
      accuracy remains explicitly open); ran `tools/Validate-ProjectKnowledge.ps1`.

## Navigation

- [Back to Project Knowledge](../Project-knowledge-Index.md)
- [Current Status](../Current-Status.md)
- [Feedback Backlog](../Feedback-Backlog.md)
- [Local Location Coordinate Resolution](../decisions/Local-Location-Coordinate-Resolution.md)
