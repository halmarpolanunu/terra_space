---
type: Plan
title: Phase 4 - Events and Dashboard Implementation Plan
description: Task-by-task plan for approved-event exploration, shared filters, summary, globe map, timeline, and deterministic local coordinates.
tags: [project-knowledge, plan, phase-4]
status: planned
---

# Phase 4 - Events and Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user explore approved events through an editable Events list and a Dashboard whose summary, map, timeline, and event list always reflect the same filters.

**Scope:** Roadmap Phase 4 only. This builds approved-event exploration and the Dashboard; it does not add Settings, attachment upload, cloud services, automatic ingestion, address-level geocoding, automatic duplicate merging, or multi-user features.

**Builds on:** Phase 3 on `main`, the [Visual Design Direction](../decisions/Visual-Design-Direction.md), the [Document & Event Data Model](../decisions/Document-Event-Data-Model.md), and [Local Location Coordinate Resolution](../decisions/Local-Location-Coordinate-Resolution.md).

**Architecture:** FastAPI owns SQLite queries, deterministic coordinate resolution, and filter meaning. One `EventFilters` URL-query representation is shared by Dashboard and Events; both call the same approved-event API and render its same event set. Existing MapLibre GL JS 5.24.0 and local PMTiles render the globe entirely offline; local MapLibre types confirm support for globe projection and `setProjection`.

**Tech stack:** Existing Next.js 16.2.10, React 19.2.4, FastAPI, SQLAlchemy, Alembic, SQLite, MapLibre GL JS 5.24.0, PMTiles 4.4.1, Pytest, Vitest, and Playwright. No runtime network dependency or new package is required.

## Global constraints

- English UI; local, single-user; normal use needs no internet connection.
- Every list, summary, map marker, and timeline item filters on `review_status = "approved"`; draft, rejected, and merged records never appear in approved-only views.
- The shared filter vocabulary is free-text search, inclusive start/end date range, event type, epistemic status, actor, country, province/state (`admin1`), city/regency, source document, and sort order. It is kept in the URL so Dashboard, Events, Back/Forward, and copied links agree.
- A date range includes an event only if its known date interval overlaps it. `exact`, `month`, and `year` precision expand to calendar intervals. Unknown dates do not match an active date range and otherwise appear in a separate `Date unknown` timeline group.
- "New events" means filtered events approved in the last seven calendar days. Add `events.approved_at`, set it when a draft is approved, and seed existing approved rows from their current `updated_at` because their original approval time was not stored.
- "Incomplete date" means `start_date` is null or its precision is `unknown`. "Incomplete location" means no event location has both latitude and longitude after deterministic resolution.
- Coordinates never come from AI or a remote service. The local-only resolver, fallback order, and stored precision are fixed in the coordinate decision.
- Roadmap-required approved-event editing changes the Phase 3 draft-only rule: draft and approved records can be edited; rejected and merged audit records remain immutable. An approved edit never changes sources/evidence or re-runs duplicate detection.
- Preserve the mission-brief system: pure black, amber, framed panels, mono labels/readouts, sans UI, serif source text, visible text with color, keyboard access, quiet motion, and `prefers-reduced-motion` support.

## Planned file structure

```text
backend/
├── alembic/versions/0003_phase4_events_dashboard.py
├── app/
│   ├── api/routes/events.py                    (approved query + summary)
│   ├── data/location-gazetteer.json            (generated local GeoNames subset)
│   ├── db/models.py                            (approved_at + coordinate_precision)
│   ├── schemas/event.py                        (filters, summary, expanded reads)
│   └── services/{events.py,locations.py}       (filtering, editing, exact lookup/backfill)
└── tests/{test_event_exploration_api.py,test_event_filters_summary.py,test_location_coordinates.py,test_migration_0003.py}
frontend/
├── src/
│   ├── app/dashboard/{page.tsx,dashboard-workspace.tsx,dashboard-summary.tsx,event-globe.tsx}
│   ├── app/documents/[documentId]/page.tsx
│   ├── app/events/{page.tsx,event-detail.tsx,event-editor.tsx}
│   ├── components/{event-filter-bar.tsx,event-list.tsx,event-timeline.tsx}
│   └── lib/{event-filters.ts,events-api.ts}
└── tests/{event-filter-bar,event-list,event-timeline,events-page,dashboard-workspace,event-globe}.test.tsx
tests/e2e/events-dashboard.spec.ts
project-knowledge/{Current-Status.md,Project-Knowledge-Log.md,Roadmap.md}
```

---

### Task 1: Persist deterministic local coordinates and approval time

**Files:**
- Create: `backend/alembic/versions/0003_phase4_events_dashboard.py`, `backend/app/data/location-gazetteer.json`, `backend/app/services/locations.py`, `backend/tests/test_location_coordinates.py`, `backend/tests/test_migration_0003.py`
- Modify: `backend/app/db/models.py`, `backend/app/schemas/event.py`, `backend/app/schemas/extraction.py`, `backend/app/services/extraction.py`, `backend/app/services/events.py`

**Interfaces:** `resolve_location(country, admin1, city_regency) -> ResolvedLocation | None` returns latitude, longitude, and `CoordinatePrecision = Literal["country", "admin1", "city_regency"]`; `apply_coordinates(location)` updates one `Location`; `backfill_missing_coordinates(db) -> int` fills only rows whose two coordinates are null. `EventRead` gains nullable `approved_at`; `LocationRead` gains nullable `coordinate_precision`.

- [ ] **Step 1: Write failing migration and resolver tests**

  Assert `events.approved_at` and `locations.coordinate_precision` are nullable, existing approved records receive migration-time `updated_at`, and non-approved rows do not. Assert city wins over admin1, admin1 wins over country, and country-only uses the local country-capital reference point. An unmatched city only falls back when the country/admin1 exactly matches; absent country and ambiguous/unmatched values leave coordinates and precision null. Call backfill twice and assert the second call returns zero.

- [ ] **Step 2: Verify the tests fail**

  Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest tests/test_location_coordinates.py tests/test_migration_0003.py -q`

  Expected: FAIL because migration `0003`, `coordinate_precision`, and the resolver do not exist.

- [ ] **Step 3: Implement the migration, gazetteer, and resolver**

  Add nullable `approved_at: DateTime(timezone=True)` to `Event` and nullable `coordinate_precision: String(16)` to `Location`; make the Alembic migration from current head `0002_phase2_data_model`. In `upgrade()`, add both columns and apply `approved_at = updated_at` only where `review_status = 'approved'` and `approved_at IS NULL`.

  Generate and commit the JSON asset from GeoNames `countryInfo.txt`, `admin1CodesASCII.txt`, and `cities500.zip`. Include top-level `source`, `license`, and `snapshot_date` metadata plus exact country, admin1, and city maps. Use ISO alpha-2 uppercase country keys and case-folded/whitespace-collapsed name keys. The running application reads only committed JSON: no nearest-place, substring, or remote lookup.

  Call `apply_coordinates` from `persist_extraction`, `create_manual_event`, and replacement-location handling in `update_event`. Set `event.approved_at = utc_now()` in `approve_event`. Run idempotent coordinate backfill in the migration, never at every startup.

- [ ] **Step 4: Run focused then complete backend tests**

  Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest tests/test_location_coordinates.py tests/test_migration_0003.py -q`

  Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest -q`

  Expected: PASS, including current numeric-coordinate migration coverage.

- [ ] **Step 5: Commit**

  ```powershell
  git add backend
  git commit -m "feat: resolve event locations with local gazetteer data"
  ```

### Task 2: Add approved-event querying, summary, and approved-event editing

**Files:**
- Create: `backend/tests/test_event_exploration_api.py`, `backend/tests/test_event_filters_summary.py`
- Modify: `backend/app/schemas/event.py`, `backend/app/services/events.py`, `backend/app/api/routes/events.py`, `backend/tests/test_event_edit_approve_reject.py`

**Interfaces:**
- `GET /api/events?review_status=approved&q=&date_from=&date_to=&event_type_id=&epistemic_status=&actor_id=&country=&admin1=&city_regency=&document_id=&sort=` returns matching `EventRead` rows. Valid sort values: `date_desc`, `date_asc`, `created_desc`, `title_asc`.
- `GET /api/events/dashboard-summary` accepts the exact same filters and returns `DashboardSummaryRead { total_events, new_events, by_event_type, incomplete_date_count, incomplete_location_count }`.
- `PATCH /api/events/{id}` accepts draft/approved records, returns 409 for rejected/merged records, and never edits sources/evidence.

- [ ] **Step 1: Write failing API tests**

  Seed approved, draft, rejected, and merged events differing by type, actor, country/admin1/city, source document, epistemic status, date precision, coordinate completeness, approval date, and title. Assert supplied filters combine with AND, relation joins never duplicate multi-actor/multi-location/multi-source events, search matches title/summary case-insensitively, and invalid date/sort/status parameters return 422.

  Assert exact/month/year events match when their calendar intervals overlap; unknown dates do not match active ranges. Assert summary uses exactly the filtered result: null types become `Uncategorized`, new means `approved_at` in seven days, and incomplete counts follow global definitions. Assert approved PATCH recomputes locations and rejected/merged PATCH returns 409.

- [ ] **Step 2: Verify tests fail**

  Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest tests/test_event_exploration_api.py tests/test_event_filters_summary.py -q`

  Expected: FAIL because `/api/events` only accepts `review_status` and there is no summary endpoint.

- [ ] **Step 3: Implement one filter service**

  Add Pydantic `EventFilterQuery` and `DashboardSummaryRead`. Keep `/api/events` backward-compatible for Event Review, but every Phase 4 request sends `review_status=approved`. Put all filtering in `list_filtered_events`; have `dashboard_summary` consume that same result.

  Expand partial dates in Python after loading the local user's small approved-event set: exact is one day, month is first through last day, year is January 1 through December 31. Apply actor/location/source filters, de-duplicate by event id before date filtering, then sort. Change `EDITABLE_REVIEW_STATUSES` to `{"draft", "approved"}`; retain approved status and `approved_at`, source/evidence immutability, and no duplicate detection during approved edits.

- [ ] **Step 4: Run backend verification**

  Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest -q`

  Expected: PASS for all current and new backend tests.

- [ ] **Step 5: Commit**

  ```powershell
  git add backend
  git commit -m "feat: add approved event filters summary and editing"
  ```

### Task 3: Create shared filter, list, and timeline frontend primitives

**Files:**
- Create: `frontend/src/lib/event-filters.ts`, `frontend/src/components/event-filter-bar.tsx`, `frontend/src/components/event-list.tsx`, `frontend/src/components/event-timeline.tsx`, `frontend/tests/event-filter-bar.test.tsx`, `frontend/tests/event-list.test.tsx`, `frontend/tests/event-timeline.test.tsx`
- Modify: `frontend/src/lib/events-api.ts`, `frontend/src/app/globals.css`

**Interfaces:** `EventFilters` mirrors Task 2. `parseEventFilters(search)` and `toEventFilterSearch(filters)` omit empty values and produce stable URLs. `listEvents(filters)` and `getDashboardSummary(filters)` use the same serializer. `EventFilterBar` receives `value`, active type/actor/document options, and `onChange`; EventList receives approved events plus `onSelect`; EventTimeline receives the same events and fetches nothing.

- [ ] **Step 1: Write failing component and URL-state tests**

  Assert a copied Dashboard query parses and serializes canonically, clearing one control removes only that value, and any control emits the full next filter object. Assert all Roadmap filters have labelled controls and Clear filters appears only when active.

  Assert EventList renders title, epistemic text, type, date or `Date unknown`, location or `Not stated`, and source count. Assert EventTimeline orders known dates in requested direction and puts a labelled Date unknown group after them.

- [ ] **Step 2: Verify tests fail, then implement**

  Keep state as strings/ids with `URLSearchParams`, not a state library. Offer active type/actor options only here; Event Review keeps its existing all-row picker. Use text-bearing StatusChip states. Add responsive CSS for the filter strip, list rows, source links, timeline groups, and empty states.

- [ ] **Step 3: Run frontend checks**

  ```powershell
  npm.cmd run test --prefix frontend
  npm.cmd run lint --prefix frontend
  npm.cmd run build --prefix frontend
  ```

  Expected: all commands exit 0.

- [ ] **Step 4: Commit**

  ```powershell
  git add frontend
  git commit -m "feat: add shared event filters list and timeline"
  ```

### Task 4: Build approved Events list, detail, sources, and editor

**Files:**
- Create: `frontend/src/app/events/event-detail.tsx`, `frontend/src/app/events/event-editor.tsx`, `frontend/src/app/documents/[documentId]/page.tsx`, `frontend/tests/events-page.test.tsx`
- Modify: `frontend/src/app/events/page.tsx`, `frontend/src/lib/documents-api.ts`, `frontend/src/app/globals.css`

**Interfaces:** `/events` reads/writes EventFilters in its URL, calls `listEvents(filters)`, and renders EventFilterBar/EventList. Selecting opens EventDetail; Save calls `updateEvent(id, patch)`. Document sources link to `/documents/{documentId}`; that route loads the existing document endpoint and renders title, dates, optional source URL, full serif content, and a Back to Events link preserving the Events URL.

- [ ] **Step 1: Write failing page tests**

  Mock two approved events and one rejected event. Assert Events sends `review_status=approved`, hides rejected rows, restores URL filters, and replaces URL on change. Assert detail shows summary, actors with roles, locations with precision, epistemic label, and sources. Assert Save sends an approved-event patch and refreshes its row; rejected/merged records expose no Edit. Assert source view renders serif text and a clear unknown-id error.

- [ ] **Step 2: Implement Events and source navigation**

  Replace the Events placeholder with a client workspace in AppShell. Use `useSearchParams`, `useRouter`, and `router.replace`; do not add global state. Add the read-only source route instead of trying to make the editable Documents form display completed documents. The editor may change title, summary, active type, dates/precision, epistemic status, locations, and actors. It states that sources/evidence are read-only and never offers deletion or review actions.

- [ ] **Step 3: Run page checks**

  ```powershell
  npm.cmd run test --prefix frontend
  npm.cmd run lint --prefix frontend
  npm.cmd run build --prefix frontend
  ```

  Expected: all commands exit 0; Event Review tests remain unchanged.

- [ ] **Step 4: Commit**

  ```powershell
  git add frontend
  git commit -m "feat: build approved events list detail and editing"
  ```

### Task 5: Build synchronized Dashboard summary, globe, timeline, and list

**Files:**
- Create: `frontend/src/app/dashboard/dashboard-workspace.tsx`, `frontend/src/app/dashboard/dashboard-summary.tsx`, `frontend/src/app/dashboard/event-globe.tsx`, `frontend/tests/dashboard-workspace.test.tsx`, `frontend/tests/event-globe.test.tsx`
- Modify: `frontend/src/app/dashboard/page.tsx`, `frontend/src/components/world-map.tsx`, `frontend/src/app/globals.css`, `frontend/tests/world-map.test.tsx`

**Interfaces:** DashboardWorkspace owns one EventFilters value, requests `listEvents(filters)` and `getDashboardSummary(filters)` together, and passes that exact event array to DashboardSummary, EventGlobe, EventTimeline, and EventList. It writes URL filters and provides an Open Events link with the same query. EventGlobe accepts `events: EventRead[]`, creates one GeoJSON point per pin-ready event-location, and never fetches event data.

- [ ] **Step 1: Write failing Dashboard and map tests**

  Mock a pin-ready event, unknown-date event, and event without coordinates. Assert one filter change produces the same filter object for summary/events; summary counts, timeline entries, map feature count, and list rows change together; Open Events carries the exact query. Assert labels Total events, New in last 7 days, distribution by type, Incomplete date, and Incomplete location, including zero states.

  Extend the MapLibre mock to assert globe projection, local PMTiles only, GeoJSON source/layers after load, and removal on unmount. Assert map error retains the current unavailable message and a null coordinate makes no marker.

- [ ] **Step 2: Implement Dashboard and globe**

  Replace Dashboard placeholder and neutral WorldMap with title, compact filter bar, summary, interactive globe, timeline, and filtered list. Rework worldMapStyle to dark land, subdued borders, amber atmosphere/pins, and globe projection. Call `map.setProjection({ type: "globe" })` after load; if it throws, keep the styled flat map and show a non-blocking `Flat map fallback` label.

  Use one MapLibre GeoJSON source and `setData` on filter changes. Marker features carry event id, title, location label, epistemic status, and precision; selection opens EventDetail. Auto-rotate slowly only while idle, stop for interaction, and disable it for reduced motion. Add no terrain or external tiles.

- [ ] **Step 3: Run frontend verification**

  ```powershell
  npm.cmd run test --prefix frontend
  npm.cmd run lint --prefix frontend
  npm.cmd run build --prefix frontend
  ```

  Expected: all commands exit 0, including revised offline PMTiles coverage.

- [ ] **Step 4: Commit**

  ```powershell
  git add frontend
  git commit -m "feat: add synchronized dashboard globe and timeline"
  ```

### Task 6: Verify complete Phase 4 flow and update Project Knowledge

**Files:**
- Create: `tests/e2e/events-dashboard.spec.ts`
- Modify: `tests/e2e/run-foundation.mjs`, `project-knowledge/Current-Status.md`, `project-knowledge/Roadmap.md`, `project-knowledge/Project-Knowledge-Log.md`

**Interfaces:** The E2E runner adds a Phase 4 scenario after Phase 3. It creates documents with the local LM Studio stub, approves map-ready/incomplete events, and verifies Events/Dashboard against the same filter. Project Knowledge marks Phase 4 complete only after the suite passes.

- [ ] **Step 1: Write failing browser scenario**

  Extend stub data with two approved events at different country/admin1/city values/dates, one approved unknown-date event, one approved unmatched/missing-country location, and one rejected event. Drive review. On Dashboard, filter by type and assert the same remaining count in summary, map legend, timeline, and list; follow Open Events and assert identical filter/rows; clear filters, edit an approved title, then follow a source link and assert source text.

  Inspect SQLite through the existing runner: known city/admin/country locations have numeric coordinates and expected precision, unmatched location is null, `approved_at` exists only for approved rows, and rejected events are absent from approved endpoints.

- [ ] **Step 2: Run full verification**

  ```powershell
  docker compose run --rm backend uv run pytest -q
  docker compose run --rm frontend npm run test
  docker compose run --rm frontend npm run lint
  docker compose run --rm frontend npm run build
  npm.cmd run test:e2e
  powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1
  ```

  Expected: every command exits 0. The existing offline LM Studio scenario remains part of `test:e2e`.

- [ ] **Step 3: Update Project Knowledge after verification**

  Mark every Phase 4 Roadmap checkbox completed. Update Current Status to Phase 4 built/verified and Phase 5 planning as next. Add a top log entry covering approved-event exploration, shared filter URLs, local coordinates/precision, globe fallback, and verification totals. Do not change North Star.

- [ ] **Step 4: Commit**

  ```powershell
  git add tests project-knowledge
  git commit -m "test: verify phase 4 events and dashboard"
  ```

## Plan self-review

- **Roadmap coverage:** Task 4 supplies approved Events list, search, filters, sorting, detail, source links, and editing. Tasks 2/3 define all filters. Tasks 2/5 deliver summary, map, and timeline. Tasks 3/5 share one URL contract across summary, map, timeline, list, Dashboard, and Events.
- **Coordinate decision:** Task 1 implements exact city/admin/country local lookup, stored precision, no network, no AI coordinates, and backfill. This is grounded in current code: coordinates are numeric and MapLibre/PMTiles exist, but extraction/manual/edit code creates locations with no values.
- **Current-codebase checks:** Events/Dashboard pages are placeholders; `/api/events` only filters review status; WorldMap already calls local PMTiles but is neutral; MapLibre 5.24.0 supports globe. The plan extends those real files rather than inventing another stack.
- **No hidden data loss:** sources/evidence stay immutable; rejected/merged records stay audit history; approved-only filtering happens server-side; unmatched locations remain visibly incomplete rather than guessed pins.

## Navigation

- [Back to Project Knowledge](../Project-knowledge-Index.md)
- [Roadmap](../Roadmap.md)
- [Document & Event Data Model](../decisions/Document-Event-Data-Model.md)
- [Local Location Coordinate Resolution](../decisions/Local-Location-Coordinate-Resolution.md)
- [Visual Design Direction](../decisions/Visual-Design-Direction.md)
- [Phase 3 Implementation Plan](2026-07-14-phase-3-event-review-deduplication.md)
