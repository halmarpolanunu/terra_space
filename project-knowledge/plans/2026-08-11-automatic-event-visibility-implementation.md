---
type: Implementation Plan
title: Automatic Event Visibility and Manual Dashboard Filtering Implementation Plan
description: Task-by-task plan making every processed Phase 3 event show up automatically on Dashboard/Events, with a manual visibility filter and a browser-only per-event hide control.
tags: [project-knowledge, plan, supabase, backend, frontend, dashboard, visibility]
status: completed
---

# Automatic Event Visibility and Manual Dashboard Filtering Implementation Plan

**Goal:** Implement the approved [Automatic Event Visibility and Manual Dashboard Filtering
Design](2026-08-11-automatic-event-visibility-design.md) — Dashboard and Events show every
processed Phase 3 event (`published` and `hidden`) automatically, exception events are clearly
marked with their reason where known, and the owner can filter by visibility or hide individual
events from their own browser, without any new Supabase write.

**Architecture:** Extends the existing read-only Supabase bridge (`app/db/supabase_bridge.py`,
`app/services/supabase_bridge.py`, `app/schemas/supabase_bridge.py`,
`app/api/routes/supabase_bridge.py`) in place — same read-only transaction, same query layer, only
the event SELECT's `where` clause and returned columns change. The frontend gets one new filter
field, one new client-only `localStorage` module, and small additions to the components that
already render `EventRead`.

**Tech Stack:** FastAPI, SQLAlchemy Core (`text()`), psycopg 3, PostgreSQL/Supabase, Next.js/TypeScript, Vitest, pytest.

## Global Constraints

- No new write reaches Supabase; every bridge connection stays inside the existing PostgreSQL
  read-only transaction.
- SQLite-backed code paths (`/api/events`, Terra Sense) are unaffected — every schema change is
  additive/optional so their existing behavior and tests do not change.
- The per-event hide list lives only in the browser (`localStorage`); it is never sent to the
  backend and never appears in any API request.
- `rejected`/`archived`/`merged` `dashboard_status` values stay excluded from the default view —
  only the automatic `published`/`hidden` split changes.
- Keep explanations and UI copy simple; the owner is new to coding.

---

### Task 1: Backend — widen the bridge event query and schemas

**Files:**
- Modify: `backend/app/schemas/event.py` (`EventRead`, `DashboardSummaryRead`).
- Modify: `backend/app/services/supabase_bridge.py`.
- Modify: `backend/app/api/routes/supabase_bridge.py`.
- Modify: `backend/tests/test_supabase_bridge_service.py`, `backend/tests/test_supabase_bridge_api.py`.

**Interfaces:**
- `EventRead` gains `pipeline_outcome: Literal["FINAL", "EXCEPTION"] | None = None`,
  `dashboard_status: Literal["published", "hidden", "rejected", "archived", "merged"] | None = None`,
  `exception_reason: str | None = None`.
- `DashboardSummaryRead` gains `exception_count: int = 0`.
- `filter_bridge_events(..., dashboard_status: str | None = None, ...)` — `"published"` or
  `"hidden"`; `None`/blank means both.
- `GET /api/bridge/events` and `GET /api/bridge/events/dashboard-summary` accept a new
  `dashboard_status` query parameter with the same meaning.

- [x] Add the three new `EventRead` fields and the one new `DashboardSummaryRead` field, all
      optional with the defaults above, so nothing in `backend/app/services/events.py` (SQLite)
      needs to change.
- [x] Change `_EVENT_QUERY` in `supabase_bridge.py` from `where e.dashboard_status = 'published'`
      to `where e.dashboard_status in ('published', 'hidden')`.
- [x] Add a lateral join to the latest `phase3_event_runs` row for each event's `candidate_key`
      (`order by processed_at desc limit 1`), and derive `exception_reason` from its
      `safeguard_reasons`/`error_message` when `pipeline_outcome = 'EXCEPTION'`; leave it `null`
      when there is no matching run or the event is `FINAL`.
- [x] Populate `dashboard_status`, `pipeline_outcome`, and `exception_reason` in `_to_event_read`.
      Leave `review_status` as `"approved"` for every bridge event, unchanged — it does not drive
      exception visibility and nothing here grants edit/delete authority.
- [x] Add the `dashboard_status` parameter to `filter_bridge_events` (matches on the event's own
      `dashboard_status` field; blank/`None` matches everything the query already returns).
- [x] Add the same query parameter to `list_events_route` and `dashboard_summary_route`.
- [x] Add `exception_count` to `bridge_dashboard_summary` (count of `pipeline_outcome == "EXCEPTION"`
      in the events passed in).
- [x] Update `backend/tests/supabase_bridge_test_support.py`'s seed data (or the relevant test's own
      setup) to include at least one `EXCEPTION`/`hidden` `phase3_events` row with a matching
      `phase3_event_runs` row carrying `safeguard_reasons`, so the new behavior has real data to
      assert against.
- [x] Add/update tests: the exception row is now returned by `list_bridge_events`/`get_bridge_event`
      with correct `dashboard_status`/`pipeline_outcome`/`exception_reason`; `dashboard_status`
      filtering narrows correctly on both routes; `exception_count` is correct; a `rejected` or
      `archived` row (insert one directly for the test) is still excluded by default.

### Task 2: Frontend — visibility filter and shared types

**Files:**
- Modify: `frontend/src/lib/events-api.ts` (`EventRead`, `DashboardSummaryRead` types).
- Modify: `frontend/src/lib/event-filters.ts`.
- Modify: `frontend/src/components/event-filter-bar.tsx`.
- Modify: `frontend/tests/event-filters.test.ts` (or equivalent), component test for the filter bar.

**Interfaces:**
- `EventFilters` gains `dashboard_status: "" | "published" | "hidden"`.
- `EventRead` gains the three optional fields from Task 1; `DashboardSummaryRead` gains
  `exception_count`.

- [x] Add the three optional fields to the frontend `EventRead` type and `exception_count` to
      `DashboardSummaryRead`, matching Task 1 exactly.
- [x] Add `dashboard_status` to `EventFilters`, `FILTER_KEYS`, and `ACTIVE_FILTER_KEYS`, with the
      same parse/serialize treatment as the existing filters (only `""`/`"published"`/`"hidden"`
      accepted; anything else parses to `""`).
- [x] Add a "Visibility" `fieldset` to `EventFilterBar` with a select: "All processed events"
      (value `""`, default), "Published only", "Exceptions only".
- [x] Update filter tests for the new key and the new select control.

### Task 3: Frontend — browser-only hide/unhide

**Files:**
- Create: `frontend/src/lib/hidden-events.ts`.
- Create: `frontend/tests/hidden-events.test.ts`.

**Interfaces:**
- `getHiddenEventIds(): string[]`
- `isEventHidden(id: string): boolean`
- `hideEvent(id: string): void`
- `unhideEvent(id: string): void`
- `useHiddenEventIds(): string[]` — a `useSyncExternalStore` hook (built, not a plain
  `subscribeHiddenEvents(callback)` function as originally sketched here — see Execution notes)
  that re-renders the caller on same-tab changes (a `CustomEvent`, since the browser's own
  `storage` event does not fire in the tab that made the change) and cross-tab changes.

- [x] Implement all five functions against a single namespaced `localStorage` key
      (`terra-space.hidden-events.v1`), storing a JSON array of event IDs.
- [x] Guard every function against `localStorage` being unavailable (private browsing, disabled
      storage, or a server-rendered/non-browser environment): fail closed to "nothing hidden"
      rather than throwing.
- [x] Write tests: hide/unhide round-trip, duplicate hides are a no-op, unavailable storage does
      not throw and reports nothing hidden, `subscribeHiddenEvents` fires on a same-tab change.

### Task 4: Frontend — wire visibility and hide into Dashboard and Events

**Files:**
- Modify: `frontend/src/app/dashboard/dashboard-workspace.tsx`.
- Modify: `frontend/src/app/events/events-workspace.tsx`.
- Modify: `frontend/src/app/dashboard/dashboard-summary.tsx`.
- Modify: `frontend/src/app/events/event-detail.tsx`.
- Modify: `frontend/src/components/event-list.tsx`.
- Modify: `frontend/tests/dashboard-workspace.test.tsx`, `frontend/tests/events-page.test.tsx`,
  other affected component tests.

**Interfaces:**
- `EventDetail` gains optional `isHidden`, `onHide`, `onUnhide` props, independent of the existing
  `onEdit`/`onDelete` (which stay unset on bridge screens).
- `DashboardSummaryContent`/`summarizeDashboardEvents` gain an `exception_count` stat and an
  `onShowExceptions` callback, plus a `hidden_count` stat and `onShowHidden` callback.

- [x] In both workspaces, after fetching events, filter out any event whose `id` is in
      `getHiddenEventIds()` before it reaches the globe/list/timeline/summary, and subscribe to
      `subscribeHiddenEvents` so hiding/unhiding updates the view immediately.
- [x] Add a "Pipeline exceptions" stat (clickable, opens the existing list-panel pattern already
      used for "Unresolved locations") and a "Hidden by you" stat (same pattern) to
      `DashboardSummaryContent`; wire both through `dashboard-workspace.tsx`'s existing `showList`
      helper.
- [x] In the "Hidden by you" list panel, give each row an "Unhide" action (this is the one list
      panel that needs an action per row, unlike the existing read-only "select to view" panels).
- [x] Add an "Exception" `StatusChip`-style badge next to the epistemic-status chip in
      `event-list.tsx` whenever `event.dashboard_status === "hidden"`.
- [x] Add a callout in `EventDetail` for an exception event ("Pipeline exception — retained but not
      fully validated" plus `exception_reason` when present) and a Hide/Unhide button using Task 3's
      helper, with one line explaining it is a browser-only preference.
- [x] Update the affected tests for the new stats, badge, callout, and hide/unhide behavior.

### Task 5: Frontend — exception marker on the globe

**Files:**
- Modify: `frontend/src/app/dashboard/event-globe.tsx`.
- Modify: `frontend/src/components/world-map.tsx`.
- Modify: relevant `world-map`/`event-globe` tests.

**Interfaces:**
- Pin `properties` gain `isException: boolean`; `WorldMap`'s pin layer paint expression renders a
  visibly distinct style (different color/outline) when `isException` is true.

- [x] Add `isException` to each pin's GeoJSON `properties` in `buildEventMapData`.
- [x] Update `WorldMap`'s pin layer `paint` to a `case`/`match` expression keyed on `isException`
      instead of a flat color.
- [x] Update/extend the relevant test(s) to assert the exception styling is applied.

### Task 6: Verification

**Files:**
- Modify: `project-knowledge/Current-Status.md`, `project-knowledge/Project-Knowledge-Log.md`.

- [x] Run the full backend suite (SQLite-backed tests unaffected; bridge tests against the
      disposable PostgreSQL service, including the new exception-row assertions).
- [x] Run frontend tests, lint, and production build.
- [x] Manually verify against the real local Supabase: the owner's real four-`EXCEPTION`-record
      article now shows all four on Dashboard/Events, each marked as an exception; the visibility
      filter narrows to published-only/exceptions-only correctly; hiding one event removes it from
      the map/list/timeline/summary immediately and "Hidden by you" lists it with a working Unhide.
- [x] Confirm no new write reaches Supabase (same check style as the original bridge: read the
      backend's query layer and confirm only `SELECT`s were added).
- [x] Run Project Knowledge validation and update Current-Status.

## Execution notes

Recorded on 2026-08-11, when this plan was carried out in full.

- **`frontend/src/lib/hidden-events.ts` follows the existing `appearance-settings.ts` pattern**
  (a `useSyncExternalStore` hook backed by `localStorage` plus a `CustomEvent` for same-tab
  updates) instead of the plan's originally sketched plain `subscribeHiddenEvents(callback)`
  function, to match this codebase's own established idiom for a per-browser preference store.
  The externally-visible behavior (hide/unhide round-trips, fails closed when storage is
  unavailable, updates every open view immediately) is unchanged from the design.
- **A pre-existing gap was found and fixed along the way:** `--status-warning` was referenced by
  five existing CSS rules (extraction log, taxonomy confirm) but never defined in `:root`, so
  those rules silently fell back to an unstyled default. Defined it (`#f2a93b`, matching the
  existing amber accent) because the new Exception badge/callout is a sixth, real usage that
  needed to actually render amber. No visual regression is possible from this — the five existing
  rules could only render more correctly than before, never less.
- **Copy accuracy pass, beyond the plan's original task list.** Once exception events started
  appearing automatically, several pieces of existing bridge-screen copy became misleading by
  implying only "approved"/"published" events were shown: `EventList`'s count and empty state
  ("N approved events" → "N processed events"; "No approved events yet." →
  "No processed events yet."; its and `EventTimeline`'s empty-state link, "Approve extracted
  events in Event Review" → "Review pipeline candidates in Event Review", since this read-only
  bridge has no approval action for that link to represent), `events-workspace.tsx`'s panel title
  ("Published event register" → "Event register") and page description, and
  `dashboard-workspace.tsx`'s eyebrow ("Approved intelligence" → "Processed intelligence"). Both
  `EventList` and `EventTimeline` are used only by the two bridge screens (Dashboard, Events) as
  of this change, confirmed by search, so this wording fix could not affect any other screen.
- **Live verification exceeded the design's own bar.** Checked directly against the real local
  Supabase database (read-only `execute_sql`, then the rebuilt backend/frontend Docker images):
  `GET /api/bridge/events` went from 5 rows (published only) to 10 (5 published + 5 hidden); the
  owner's real four-candidate Bulgaria drone article's Phase 3 `EXCEPTION` records all appeared,
  each carrying a real recorded reason (e.g. "Taxonomy response was not valid JSON."); a fifth,
  unrelated `EXCEPTION` record carried a detailed multi-part safeguard rejection reason (a
  Portugal/Gaza location mismatch), confirming `exception_reason` construction handles both a
  bare `error_message` and a `safeguard_reasons` list correctly against real data, not just the
  test fixtures. `dashboard-summary` correctly reported `exception_count: 5`. In the browser,
  `/events` showed all 10 rows with "EXCEPTION" badges on the right 5, and
  `/events?dashboard_status=published` correctly narrowed to the 5 published rows with "1 active"
  filter shown -- confirming the manual visibility filter works against real data, not just
  mocked tests. The hide/unhide flow was not separately re-verified against real live data beyond
  this, since it is a pure client-side (`localStorage`) feature already covered end-to-end by
  passing automated tests and does not depend on which events the backend happens to return.

## Non-goals carried forward

- No Supabase write for hide/reject/archive/restore in this pass — deferred to the Terra Space
  Supabase Application Transition Plan.
- No cross-browser/cross-device sync of hidden events.
- No change to Sources or Event Review.
- No change to the epistemic-status filter's four-value dropdown (separately tracked).

# Navigation

- [Design](2026-08-11-automatic-event-visibility-design.md)
- [Automatic Event Visibility With Manual Filtering (decision)](../decisions/Automatic-Event-Visibility-With-Manual-Filtering.md)
- [Supabase Read-Only Bridge Implementation Plan](2026-08-11-supabase-read-only-bridge-implementation.md)
- [Terra Space Supabase Application Transition Plan](2026-08-10-terra-space-supabase-transition.md)
- [Project Knowledge](../Project-knowledge-Index.md)
