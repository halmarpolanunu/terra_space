---
type: Implementation Plan
title: Supabase Read-Only Bridge Implementation Plan
description: Task-by-task plan for making the backend read the phase-prefixed local Supabase database read-only and showing that data on Sources, Event Review, Events, and Dashboard.
tags: [project-knowledge, plan, supabase, backend, frontend, read-only]
status: completed
---

# Supabase Read-Only Bridge Implementation Plan

**Goal:** Implement the approved [Supabase Read-Only Bridge Design](2026-08-11-supabase-read-only-bridge-design.md) — the FastAPI backend reads the local Supabase/PostgreSQL database directly, the browser never receives a database credential, and Sources, Event Review, Events, and Dashboard show that data with every write control removed or disabled. SQLite stays untouched as rollback material.

**Architecture:** A new, separate read-only query layer (`app/db/supabase_bridge.py` + `app/services/supabase_bridge.py` + `app/schemas/supabase_bridge.py` + `app/api/routes/supabase_bridge.py`) sits beside the existing SQLite-backed domain code without replacing it. It uses plain parameterized SQL (no ORM mapping, no `Base.metadata.create_all()`), and every connection is placed in a genuine PostgreSQL read-only transaction (`execution_options={"postgresql_readonly": True}`) so the database itself — not just careful code — refuses any write. The frontend gets a matching `bridge-api.ts` that returns the same `EventRead`/`EventTypeRead`/`ActorRead`/`DashboardSummaryRead` shapes the existing Dashboard/Events UI already consumes, so the globe, timeline, filter bar, and list panel work unmodified against real Supabase data. Sources and Event Review get new, honestly-scoped read-only views instead, because Phase 1/Phase 2 records don't share the old SQLite Document/Event shape.

**Tech Stack:** FastAPI, SQLAlchemy Core (`text()`), psycopg 3, PostgreSQL/Supabase, Next.js/TypeScript, Vitest, pytest, Docker Compose.

## Pre-existing discrepancy found and corrected before implementation

On 2026-08-11, before this plan's work started, the owner and Codex renamed every phase-prefixed table (and `app_settings`) in the live local Supabase database to carry an explicit `terra_space_` prefix (for example `phase1_sources` → `terra_space_phase1_sources`), because this local Postgres instance is shared with unrelated datasets (`gdelt_doc_articles`, `NIRES_Pipeline`, `news_media_NDC`, and others). That rename was applied directly to the database as three real migrations and was never committed to git or recorded in Project Knowledge, so the checked-in migration, the checked-in `supabase/tests/*.sql`, and every plan/status doc still described the old bare names. This was confirmed as intentional by the owner.

Fixed as the first task of this plan, before writing any bridge code, so the bridge is built against real table names and the repository stops disagreeing with the live database:

- Backfilled the three missing migrations into `supabase/migrations/` (`20260811124327_rename_legacy_terra_space_tables.sql`, `20260811125624_rename_active_tables_to_terra_space_prefix.sql`, `20260811125738_refresh_renamed_pipeline_authority_function.sql`), reproducing the exact SQL already applied (read back from `supabase_migrations.schema_migrations`). These are documentation-only backfills; they are not re-run against the live database, which already has them applied.
- Renamed every bare `phase1_/phase2_/phase3_`/`app_settings`/`phase3_create_pipeline_event` identifier in `supabase/tests/phase_prefixed_foundation.sql`, `supabase/tests/phase3_reference_data.sql`, and `supabase/seed/20260810_phase3_reference_data.sql` to its `terra_space_`-prefixed form, including a `LIKE 'terra_space_phase_?_%'` pattern fix in the RLS check that a plain identifier rename would have missed.
- All bridge code, tests, and documentation below use the real, current `terra_space_`-prefixed names.

## Global Constraints

- Supabase stays read-only from the application's perspective: no create/update/delete/approve/reject/reprocess/publish action reaches Supabase through this bridge.
- SQLite is never written to or copied from by this work; the existing SQLite-backed CRUD code and tests are left in place, untouched, as rollback material.
- The PostgreSQL URL and any Supabase credential are backend-only (`TERRA_SUPABASE_URL`); the browser only ever calls the existing Terra Space backend.
- Do not call `Base.metadata.create_all()` or any SQLAlchemy ORM mapping against Supabase; use plain parameterized `text()` queries only.
- Every bridge database connection uses a real PostgreSQL read-only transaction, verified by a test that a write attempt through it is rejected by PostgreSQL itself.
- Tests apply the checked-in Supabase migrations (in order) to an isolated, disposable local PostgreSQL service — never the live local Supabase database.
- Widening `EpistemicStatus` to the approved 6-value set (`confirmed|reported|alleged|planned|denied|unknown`) is in scope because the bridge cannot honestly display real Phase 3 data otherwise; changing approve/reject/publish authority behavior is not in scope.
- Automatic-visibility rules and the Dashboard filter set stay exactly as they are today; this plan does not add or change filtering behavior.

---

### Task 1: Backend read-only Supabase connection and query layer

**Files:**
- Modify: `backend/pyproject.toml`, `backend/uv.lock`.
- Modify: `backend/app/core/config.py`.
- Create: `backend/app/db/supabase_bridge.py`.
- Create: `backend/app/services/supabase_bridge.py`.
- Create: `backend/app/schemas/supabase_bridge.py`.
- Modify: `backend/app/schemas/event.py` (widen `EpistemicStatus`).
- Create: `docker-compose.supabase-bridge-test.yml`.
- Create: `backend/tests/supabase_bridge_test_support.py`.
- Create: `backend/tests/test_supabase_bridge_readonly_enforcement.py`.
- Create: `backend/tests/test_supabase_bridge_service.py`.

**Interfaces:**
- `create_supabase_read_only_engine(database_url: str) -> Engine` — every connection runs in a PostgreSQL read-only transaction.
- `list_bridge_sources`, `get_bridge_source`, `list_bridge_candidate_reviews`, `list_bridge_events`, `bridge_dashboard_summary`, `list_bridge_event_types`, `list_bridge_actors` service functions, each taking an `Engine`/`Connection` and returning Pydantic schema instances (`BridgeSourceRead`, `BridgeCandidateReviewRead`, `EventRead`, `DashboardSummaryRead`, `EventTypeRead`, `ActorRead`).

- [x] Add `Settings.supabase_url: str | None` from `TERRA_SUPABASE_URL`.
- [x] Add `psycopg[binary]` as a pinned dependency and regenerate the lock file.
- [x] Write `create_supabase_read_only_engine`, and a failing-first test proving a write statement through it raises a PostgreSQL read-only-transaction error while a read succeeds.
- [x] Write the bridge service functions against `terra_space_phase1_sources`, `terra_space_phase2_event_candidates`, `terra_space_phase3_events` (joined to `terra_space_phase3_event_types`, `terra_space_phase3_actors`, `terra_space_phase3_locations`, `terra_space_phase3_event_sources`), `terra_space_phase3_event_types`, and `terra_space_phase3_actors`.
- [x] Add `docker-compose.supabase-bridge-test.yml`: a disposable `postgres:17-alpine` service, tmpfs data, no persistent volume.
- [x] Add `backend/tests/supabase_bridge_test_support.py`: applies the four checked-in migrations in order to the disposable database once per test session and truncates business tables between tests; skips the whole module with a clear message if the test database is not reachable.
- [x] Widen `EpistemicStatus` in `backend/app/schemas/event.py` to `confirmed|reported|alleged|planned|denied|unknown` (additive; existing SQLite code paths only ever produce the original four).
- [x] Run the new backend tests against the disposable PostgreSQL service.

### Task 2: Read-only API routes

**Files:**
- Create: `backend/app/api/routes/supabase_bridge.py`.
- Modify: `backend/app/main.py`.
- Modify: `docker-compose.yml`, `.env.example`.
- Create: `backend/tests/test_supabase_bridge_api.py`.

**Interfaces:**
- `GET /api/bridge/mode`, `GET /api/bridge/sources`, `GET /api/bridge/sources/{id}`, `GET /api/bridge/event-candidates`, `GET /api/bridge/events` (same filter params as `/api/events`), `GET /api/bridge/events/{id}`, `GET /api/bridge/events/dashboard-summary`, `GET /api/bridge/event-types`, `GET /api/bridge/actors`. No write verbs exist on this router.

- [x] Build the router; every route is a plain `GET`. When `TERRA_SUPABASE_URL` is not configured, every bridge route returns `503` with a beginner-readable message instead of silently falling back to SQLite.
- [x] Wire the router into `create_app()`, building the Supabase engine once at startup only if configured.
- [x] Add `TERRA_SUPABASE_URL` to the backend service environment in `docker-compose.yml` (backend-only, not added to the frontend service) and document it in `.env.example`.
- [x] Add API-level tests: each route against the disposable database, the `503` when unconfigured, and a test asserting the router exposes no `POST`/`PATCH`/`DELETE` routes at all.

### Task 3: Frontend bridge client and shared display fixes

**Files:**
- Create: `frontend/src/lib/bridge-api.ts`.
- Modify: `frontend/src/lib/events-api.ts` (widen `EpistemicStatus`).
- Modify: `frontend/src/components/event-list.tsx`, `frontend/src/app/events/event-detail.tsx` (epistemic label/color maps).
- Modify: `frontend/src/app/globals.css` (four new `--status-*` variables).
- Create: `frontend/src/components/read-only-bridge-notice.tsx`.

**Interfaces:**
- `bridge-api.ts` exports `getBridgeMode`, `listBridgeSources`, `getBridgeSource`, `listBridgeCandidateReviews`, `listBridgeEvents(filters)`, `getBridgeEvent(id)`, `getBridgeDashboardSummary(filters)`, `listBridgeEventTypes`, `listBridgeActors` — reusing the existing `EventRead`/`EventTypeRead`/`ActorRead`/`DashboardSummaryRead` TypeScript types.

- [x] Add the six new epistemic values to both label maps and to `globals.css`.
- [x] Write `bridge-api.ts` against the Task 2 routes, mapping every returned Phase 3 event's `dashboard_status: "published"` to `review_status: "approved"` for display and `document_id: null` on each source reference (Sources stay reachable only from the Sources screen for this bridge; see Non-goals).
- [x] Add `ReadOnlyBridgeNotice`, a small shared banner used by all four screens.

### Task 4: Repoint Dashboard and Events to the bridge, remove editing

**Files:**
- Modify: `frontend/src/app/dashboard/dashboard-workspace.tsx`.
- Modify: `frontend/src/app/events/events-workspace.tsx`.
- Modify: `frontend/tests/dashboard-workspace.test.tsx`, `frontend/tests/events-page.test.tsx`.

- [x] Swap both workspaces' data calls from `events-api`/`documents-api` to `bridge-api`.
- [x] Remove `EventEditor`, `saveEvent`, `removeEvent`, and the `editing` state from `events-workspace.tsx`; `EventDetail` renders with no `onEdit`/`onDelete` handlers.
- [x] Add the read-only notice and updated `PageHeader` copy to both pages.
- [x] Update both test files to mock `bridge-api` and assert no edit/delete control renders.

### Task 5: Read-only Sources view

**Files:**
- Create: `frontend/src/app/documents/source-bridge-list.tsx`.
- Modify: `frontend/src/app/documents/page.tsx`.
- Modify: `frontend/tests/documents-page.test.tsx`.

- [x] Replace the page body with a read-only list read from `listBridgeSources()`: title, publication date, source domain/URL, processing status, and cleaned/raw text shown inline (expandable), matching the design's "Sources displays ... cleaned or raw text where available."
- [x] Remove the add/edit form, upload, process, retry, and delete controls from this route; add the read-only notice.
- [x] Update the test file for the new read-only behavior.

### Task 6: Read-only Event Review view

**Files:**
- Create: `frontend/src/app/event-review/candidate-review-workspace.tsx`.
- Modify: `frontend/src/app/event-review/page.tsx`.
- Modify: `frontend/tests/event-review.test.tsx`, `frontend/tests/event-review-empty-state.test.tsx`, `frontend/tests/event-review-page-motion.test.tsx`.

- [x] Build a read-only per-source pager (reusing `ReviewBar`'s prev/next shape) showing `main_issue` and each `event_candidates[]` entry (`working_title`, `classification`, `phenomenon`, `entities`, `evidence_quote`, `quote_grounded`) from `listBridgeCandidateReviews()`.
- [x] Remove `AddEventForm`, `EventCard`, `DuplicateComparePanel`, approve/reject/approve-all from this route; add the read-only notice.
- [x] Update the three test files for the new read-only behavior (component tests for `AddEventForm`/`EventCard`/`DuplicateComparePanel` themselves are untouched — only this route's usage changes).

### Task 7: Verification

**Files:**
- Modify: `project-knowledge/Current-Status.md`, `project-knowledge/Project-Knowledge-Log.md`.

- [x] Run the full backend suite (SQLite-backed tests unaffected; new bridge tests against the disposable PostgreSQL service).
- [x] Run frontend tests, lint, and production build.
- [x] Manually verify against the real local Supabase: the Sources count in Terra Space matches `terra_space_phase1_sources`, Phase 2 candidates appear on Event Review, and published Phase 3 events appear on Events/Dashboard.
- [x] Confirm the archived SQLite database checksum is unchanged and no bridge code path opens a write connection to Supabase.
- [x] Run Project Knowledge validation and update Current-Status.

## Execution notes

Recorded on 2026-08-11, when this plan was carried out in full. Everything below is a difference
between what the plan said and what the machine actually offered, not a change of intent.

- **psycopg3 loads PostgreSQL `uuid` columns as `uuid.UUID` objects, not strings.** Every bridge
  Pydantic schema declares ID fields as `str` (matching the frontend's TypeScript types), so this
  failed validation on the very first query. Fixed once, centrally, in
  `create_supabase_read_only_engine`: a `connect` event registers
  `psycopg.types.string.TextLoader` for the `uuid` type on every connection this engine hands
  out, instead of adding `::text` casts to a dozen places across the SQL.
- **The Postgres role names Supabase normally provisions (`anon`, `authenticated`,
  `service_role`) do not exist on plain `postgres:17-alpine`.** The checked-in foundation
  migration's `REVOKE`/RLS-grant statements reference them, so the disposable test database
  creates these three roles (empty, no login) before applying migrations. This lives only in
  `backend/tests/supabase_bridge_test_support.py`, not in any checked-in migration.
- **The rename discrepancy went one level deeper than table names.** Fixing
  `supabase/seed/20260810_phase3_reference_data.sql` and `supabase/tests/phase3_reference_data.sql`
  needed a second pass: the legacy-rename migration (`20260811124327`) also renamed the
  *pre-phase* production tables the seed script copies data *from* (for example
  `terra_space_location_gazetteer` → `terra_space_legacy_location_gazetteer`,
  `terra_space_event_types` → `terra_space_legacy_event_types`). The first identifier-rename pass
  only caught the new phase-prefixed *destination* tables. Both files now reference the correct
  legacy source names; this cannot be exercised against the disposable test database (which never
  had the real legacy production rows) but matters for any future re-run against the live
  database.
- **The disposable test database applies three of the four checked-in migrations, not all
  four.** `20260811124327_rename_legacy_terra_space_tables.sql` renames tables
  (`terra_space_news_v2` and six others) that predate this repository's migration history and
  were never created by any checked-in migration -- a fresh test database has nothing for it to
  rename, and running it errors. `backend/tests/supabase_bridge_test_support.py` documents this
  and skips only that one file.
- **Live verification exceeded the design's own bar.** Beyond matching counts (6 sources, 4
  candidate reviews, 5 published events), the Events screen correctly displayed
  `"TEST EDIT — should survive rerun"` -- the exact human-edited title from the n8n transition
  plan's idempotency test -- proving the bridge surfaces human authority edits correctly, not
  just pipeline output.
- **Dashboard's own `getDashboardSummary`/`getBridgeDashboardSummary` return value is fetched but
  never rendered** -- `dashboard-summary.tsx` already recomputes the same numbers client-side from
  the event list (pre-existing behavior, unchanged by this plan). The bridge endpoint was still
  built and tested for parity and because `dashboard-workspace.tsx`'s `Promise.all` needs it to
  resolve without throwing.
- **One frontend test flaked under full-suite parallel load** (a 5-second timeout on
  `dashboard-workspace.test.tsx`'s heaviest test), reproduced once and not since; it passes
  reliably alone and in three repeated full-suite runs. Not a regression from this plan's changes.

## Non-goals carried forward from the design

- No editing, deleting, approving, rejecting, archiving, or reprocessing through Supabase.
- No change to which events are automatically visible on the Dashboard, and no new Dashboard filter behavior.
- The Sources screen does not gain a per-source detail sub-page in this bridge; event-source references show as plain text rather than a deep link, since the existing `/documents/[documentId]` detail route is SQLite-shaped and out of scope here.
- `/sense` (Terra Sense Overview) keeps reading SQLite counts; it is not one of the four screens the design names, and reconciling its pipeline-stage counts with Supabase is a follow-up.
- Sense's Event Taxonomy and Actors management screens are untouched; they keep managing the separate SQLite reference data.

# Navigation

- [Design](2026-08-11-supabase-read-only-bridge-design.md)
- [Terra Space Supabase Application Transition Plan](2026-08-10-terra-space-supabase-transition.md)
- [Project Knowledge](../Project-knowledge-Index.md)
