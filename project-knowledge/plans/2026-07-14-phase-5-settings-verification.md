---
type: Plan
title: Phase 5 - Settings and Verification Implementation Plan
description: Task-by-task plan for runtime-configurable local LM Studio settings, simple event-type management, and the final end-to-end and failure-case verification of the whole MVP.
tags: [project-knowledge, plan, phase-5]
status: planned
---

# Phase 5 - Settings and Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user configure the local LM Studio connection and manage event types from a Settings screen, then prove the entire document-to-event MVP works end-to-end and fails safely.

**Scope:** Roadmap Phase 5 only. It builds the Settings screen (LM Studio connection + simple event-type management) and runs the final MVP verification pass. It does not add attachment upload, authentication, cloud services, automatic ingestion, address-level geocoding, automatic duplicate merging, taxonomy merge/synonyms/hierarchy, or any new extraction generation parameters. It is not an aesthetic design pass — see [Design Pass Sequencing](../decisions/Design-Pass-Sequencing.md).

**Builds on:** Phase 4 on `main`, the [Visual Design Direction](../decisions/Visual-Design-Direction.md), the [Document & Event Data Model](../decisions/Document-Event-Data-Model.md), and [Design Pass Sequencing](../decisions/Design-Pass-Sequencing.md) (which names the Tailwind Plus categories — Settings Screens, Toggles, Radio Groups, Action Panels — to consult while building this screen).

**Architecture:** Today the LM Studio base URL is baked in once at startup: `create_app` in `backend/app/main.py` constructs a single `LmStudioClient(settings.lm_studio_url)` and hands it by reference to the processing router's background tasks and to the health check; `Settings` in `backend/app/core/config.py` only reads the `TERRA_LM_STUDIO_URL` environment variable; and `_discover_model` always picks the first model, so a user's model choice has nowhere to live and is never honored. Phase 5 adds a persisted single-row `app_settings` table and makes the client resolve its base URL and preferred model from that row **at the moment of each call**, so saving new settings takes effect immediately — for the next processing run and the health check — without restarting containers. Event types are already stored as data (`event_types.is_active`); this phase adds the write operations to manage them. No screen is redesigned for polish; only the still-placeholder Settings screen is built, with the Tailwind Plus structural references in mind.

**Tech stack:** Existing Next.js 16.2.10, React 19.2.4, FastAPI, SQLAlchemy, Alembic, SQLite, Pytest, Vitest, and Playwright. No runtime network dependency or new package is required.

## Global constraints

- English UI; local, single-user; normal use needs no internet connection.
- **Offline-safe Settings.** The Settings screen must load and be fully usable when LM Studio is offline. Saving the base URL or model never requires a reachable LM Studio; only the explicit "Test connection" action touches the network, and a failed test is reported calmly, never as an error that blocks saving. This preserves the North Star rule that the app opens when LM Studio is offline.
- **Immediate effect without restart.** Because the client resolves the current base URL and model from the persisted row on every call, a saved change is used by the very next batch-processing run and by the next health check. Nothing is cached from startup.
- **The persisted extraction settings for the MVP are exactly the LM Studio base URL and the selected model.** These are the "required extraction settings" from the Roadmap. The selected model is now actually consumed by extraction (it was previously ignored in favor of `models[0]`); when no model is selected, extraction keeps auto-discovering the first available model. No new generation knobs (temperature, prompt, max events) are introduced — Phase 2's locked extraction behavior (never invent, verbatim `evidence_quote`, `temperature = 0`, JSON-schema output) is unchanged.
- **Event-type management is create, rename, activate/deactivate, and delete-only-when-unreferenced.** No merge, synonyms, or hierarchy (out of MVP per the North Star). Deactivating a type hides it from the review and edit pickers and from the extraction prompt's known-types list, but never alters events already using it. Renaming updates the one stored name; because type and actor resolution matches by exact case-folded name, historical links are preserved. Deleting is allowed only when no event references the type (otherwise 409), so rejected AI suggestions can be cleaned up without ever orphaning an approved event.
- Type names remain unique case-insensitively (the model's unique constraint plus a case-folded service check).
- Preserve the mission-brief system: pure black, amber, framed panels, mono labels/readouts, sans UI, keyboard access, visible text with color, quiet motion, and `prefers-reduced-motion` support.

## Planned file structure

```text
backend/
├── alembic/versions/0005_phase5_app_settings.py
├── app/
│   ├── api/routes/{settings.py,events.py}      (settings + LM Studio test; event-type write ops)
│   ├── core/config.py                          (env value becomes the seed/default only)
│   ├── db/models.py                            (AppSettings single-row table)
│   ├── main.py                                 (wire a DB-backed config provider into the client)
│   ├── schemas/settings.py                     (SettingsRead/Update, LmStudioTest*, EventType write)
│   ├── services/{settings.py,events.py,lm_studio.py}
│   └── tests/{test_app_settings.py,test_settings_api.py,test_event_type_management.py,
│              test_lm_studio_config.py,test_migration_0005.py}
frontend/
├── src/
│   ├── app/settings/{page.tsx,settings-workspace.tsx,lm-studio-settings.tsx,event-type-settings.tsx}
│   ├── lib/settings-api.ts
│   └── app/globals.css
└── tests/{settings-workspace,lm-studio-settings,event-type-settings}.test.tsx
tests/e2e/settings.spec.ts
project-knowledge/{Current-Status.md,Roadmap.md,Project-Knowledge-Log.md}
```

---

### Task 1: Persist app settings and make LM Studio config runtime-resolved

**Files:**
- Create: `backend/alembic/versions/0005_phase5_app_settings.py`, `backend/app/services/settings.py`, `backend/app/schemas/settings.py`, `backend/tests/test_app_settings.py`, `backend/tests/test_lm_studio_config.py`, `backend/tests/test_migration_0005.py`
- Modify: `backend/app/db/models.py`, `backend/app/services/lm_studio.py`, `backend/app/main.py`, `backend/app/core/config.py`

**Interfaces:**
- New `AppSettings` model: a single row (fixed primary key) with nullable `lm_studio_base_url: String`, nullable `lm_studio_model: String`, and timestamps.
- `get_settings(db, default_base_url) -> AppSettings` lazily creates the row seeded from the env default when absent; `update_settings(db, patch) -> AppSettings` validates and persists.
- `effective_lm_studio_config(db, default_base_url) -> LmStudioRuntimeConfig` returns the base URL to use (stored value, else env default) and the selected model (stored value or `None`).
- `LmStudioClient` gains an optional `config_provider: Callable[[], LmStudioRuntimeConfig]`. When present, `check_connection`, `extract_events`, and a new `list_available_models(base_url=None) -> list[str]` read the current base URL and model from it per call; the constructor `base_url` stays as the fallback so existing tests that build `LmStudioClient(url, transport=...)` keep working. `_discover_model` uses the configured model when set, otherwise the first available model as today.

- [ ] **Step 1: Write failing model, migration, and config tests**

  Assert the `app_settings` migration from head `0004_coordinate_backfill` creates the table with nullable URL and model columns and is reversible. Assert `get_settings` on an empty DB creates exactly one row seeded from the passed default URL and a null model, and returns the same row on a second call (no duplicate). Assert `update_settings` persists a new base URL and model and rejects a malformed base URL. Assert `effective_lm_studio_config` prefers the stored URL over the default and returns the stored model. Assert that a `LmStudioClient` built with a `config_provider` sends the configured model in its request and hits the configured base URL, and that changing the provider's return value changes the next call's target without rebuilding the client.

- [ ] **Step 2: Verify the tests fail**

  Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest tests/test_app_settings.py tests/test_lm_studio_config.py tests/test_migration_0005.py -q`

  Expected: FAIL because `AppSettings`, migration `0005`, the settings service, and the config provider do not exist.

- [ ] **Step 3: Implement persistence and runtime resolution**

  Add the `AppSettings` model and the `0005_phase5_app_settings` migration (`down_revision = "0004_coordinate_backfill"`). Add the settings service and schemas. Add `config_provider` and `list_available_models` to `LmStudioClient`, and honor the configured model in `_discover_model`. In `create_app`, build a provider closure over the `session_factory` and `settings.lm_studio_url` (now only the seed/default) and pass it to the single `LmStudioClient`; the health check and processing background tasks keep using that same client, so both now follow saved settings. Keep the `lm_studio_check`/`lm_studio_client` test overrides working.

- [ ] **Step 4: Run focused then complete backend tests**

  Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest tests/test_app_settings.py tests/test_lm_studio_config.py tests/test_migration_0005.py -q`

  Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest -q`

  Expected: PASS, including the existing LM Studio, processing, and health tests unchanged.

- [ ] **Step 5: Commit**

  ```powershell
  git add backend
  git commit -m "feat: persist app settings and resolve lm studio config at runtime"
  ```

### Task 2: Add settings and LM Studio connection-test API

**Files:**
- Create: `backend/app/api/routes/settings.py`, `backend/tests/test_settings_api.py`
- Modify: `backend/app/main.py`, `backend/app/schemas/settings.py`

**Interfaces:**
- `GET /api/settings` returns `SettingsRead { lm_studio_base_url, lm_studio_model }` from the stored row (no network call, so it works offline and fast).
- `PATCH /api/settings` accepts `SettingsUpdate { lm_studio_base_url?, lm_studio_model? }`, validates the URL, persists, and returns the updated `SettingsRead`. `lm_studio_model` may be set to null to return to auto-detect.
- `POST /api/settings/lm-studio/test` accepts an optional `base_url` (to test a candidate before saving); it tests reachability against that URL or, if omitted, the stored one, and returns `LmStudioTestResult { reachable, models, message }`. It never mutates stored settings.

- [ ] **Step 1: Write failing API tests**

  Assert `GET /api/settings` returns the seeded default on a fresh DB and issues no outbound request. Assert `PATCH` updates URL and model, returns 422 for a malformed URL, and accepts a null model. Assert the test endpoint returns `reachable = true` with the stub's model list against a reachable stubbed transport, `reachable = false` with an empty model list and a clear message when unreachable, and that it tests the supplied candidate URL rather than the stored one when both differ — all without changing what `GET /api/settings` returns.

- [ ] **Step 2: Verify tests fail**

  Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest tests/test_settings_api.py -q`

  Expected: FAIL because the settings router does not exist.

- [ ] **Step 3: Implement the settings router**

  Add `create_settings_router(session_factory, lm_studio_client)` and include it in `create_app`. GET/PATCH use the settings service; the test endpoint calls `lm_studio_client.list_available_models(base_url)` inside a try/except that maps unreachable/timeout/bad-payload to `reachable = false` with a message, mirroring the offline handling already in the health route.

- [ ] **Step 4: Run backend verification**

  Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest -q`

  Expected: PASS for all current and new backend tests.

- [ ] **Step 5: Commit**

  ```powershell
  git add backend
  git commit -m "feat: add settings api and lm studio connection test"
  ```

### Task 3: Add event-type management API

**Files:**
- Create: `backend/tests/test_event_type_management.py`
- Modify: `backend/app/api/routes/events.py`, `backend/app/services/events.py`, `backend/app/schemas/event.py`

**Interfaces:** (extending the events router, which already owns the read-only `GET /api/event-types`)
- `POST /api/event-types` accepts `EventTypeCreate { name }`, creates an **active** type, and returns 409 on a case-insensitive duplicate name.
- `PATCH /api/event-types/{id}` accepts `EventTypeUpdate { name?, is_active? }`, renames and/or toggles active, and returns 409 on a duplicate rename and 404 for an unknown id.
- `DELETE /api/event-types/{id}` returns 204 when the type is referenced by no event, 409 when it is referenced (so approved events are never orphaned), and 404 for an unknown id.

- [ ] **Step 1: Write failing management tests**

  Assert create makes an active type and rejects a duplicate name differing only by case/whitespace. Assert rename updates the stored name and that an event previously linked to that type still resolves to it (exact-name resolution unaffected). Assert deactivating leaves existing event links intact but drops the type from the active-types list used by pickers and the extraction prompt. Assert delete succeeds only for an unreferenced type and returns 409 for a referenced one. Assert unknown ids return 404.

- [ ] **Step 2: Verify tests fail**

  Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest tests/test_event_type_management.py -q`

  Expected: FAIL because only the read route exists.

- [ ] **Step 3: Implement management operations**

  Add `create_event_type`, `rename_or_toggle_event_type`, and `delete_unreferenced_event_type` to the events service with case-folded uniqueness and a reference check (an event pointing at the type via `event_type_id`). Wire the three routes. Keep the existing `GET /api/event-types` and the `is_active` filtering in extraction and the pickers unchanged.

- [ ] **Step 4: Run backend verification**

  Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest -q`

  Expected: PASS for all current and new backend tests.

- [ ] **Step 5: Commit**

  ```powershell
  git add backend
  git commit -m "feat: add simple event type management"
  ```

### Task 4: Build the Settings screen

**Files:**
- Create: `frontend/src/app/settings/settings-workspace.tsx`, `frontend/src/app/settings/lm-studio-settings.tsx`, `frontend/src/app/settings/event-type-settings.tsx`, `frontend/src/lib/settings-api.ts`, `frontend/tests/settings-workspace.test.tsx`, `frontend/tests/lm-studio-settings.test.tsx`, `frontend/tests/event-type-settings.test.tsx`
- Modify: `frontend/src/app/settings/page.tsx`, `frontend/src/app/globals.css`

**Interfaces:** `settings-api.ts` exposes `getSettings()`, `updateSettings(patch)`, `testLmStudio(baseUrl?)`, `createEventType(name)`, `updateEventType(id, patch)`, and `deleteEventType(id)` over the existing `/api/backend/api` proxy and `parseOrThrow` pattern. `page.tsx` replaces the placeholder with `SettingsWorkspace` inside `AppShell` (keeping the existing `ServiceStatusPanel` as the live status readout), and keeps a single persistent `<h1>Settings</h1>` above conditional content (matching the Documents/Event Review heading rule the Phase 1 foundation test enforces).

- [ ] **Step 1: Write failing component tests**

  For the LM Studio panel: assert the base URL and model controls load from `getSettings`, Test connection shows the returned model list and a reachable/offline message, selecting a model then Save calls `updateSettings` with the chosen model, and choosing Auto-detect saves a null model. Assert the panel still renders and Save still works when Test connection reports offline. For the event-type panel: assert active and suggested (inactive) types are listed and visually distinguished, adding a name calls `createEventType`, toggling calls `updateEventType`, renaming calls `updateEventType`, and delete is offered only for unreferenced types and calls `deleteEventType`. Assert the workspace shows a single Settings heading in loading, error, and loaded states.

- [ ] **Step 2: Verify tests fail, then implement**

  Build the two framed panels per [Design Pass Sequencing](../decisions/Design-Pass-Sequencing.md): consult Settings Screens, Toggles, Radio Groups, and Action Panels as structural references while keeping the pure-black/amber mission-brief system, mono labels, `StatusChip`-style connection state, and calm alert text for offline. Use plain `useState`/`fetch`, no global state. Model selection is a labelled select with an explicit Auto-detect option. Event-type toggles are accessible switches; rename is an inline edit; delete is present only when the type is unused. Add responsive CSS for the panels, the model select, and the type list.

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
  git commit -m "feat: build settings screen for lm studio and event types"
  ```

### Task 5: Verify the whole MVP and update Project Knowledge

**Files:**
- Create: `tests/e2e/settings.spec.ts`
- Modify: `tests/e2e/run-foundation.mjs`, `project-knowledge/Current-Status.md`, `project-knowledge/Roadmap.md`, `project-knowledge/Project-Knowledge-Log.md`

**Interfaces:** The E2E runner adds a Phase 5 scenario after the Phase 4 scenario. It drives the Settings screen against the LM Studio stub, then confirms the saved settings are honored by a real processing run, and manages event types through the UI. The same task performs the final MVP verification: it maps each Roadmap Phase 5 verification bullet to the scenario that proves it, and adds coverage only for the genuinely uncovered failure cases.

- [ ] **Step 1: Write the failing Settings browser scenario**

  In `settings.spec.ts`: open Settings, enter the stub's base URL, Test connection and assert the stub's model list appears with a reachable message, select a specific model, Save. Then create a new active event type, deactivate a suggested one, rename one, and delete an unused one; assert each change is reflected in the list. Through the runner's SQLite/Python inspection, assert `app_settings` holds the saved base URL and selected model, and that the created/renamed/deactivated/deleted type states match. Reuse the offline path already covered by `foundation.spec.ts` to assert the Settings screen still loads with LM Studio unreachable.

- [ ] **Step 2: Map and fill the final failure-case pass**

  Confirm each Roadmap Phase 5 verification bullet is exercised by an existing or new scenario, and add only what is missing:
  - End-to-end flow (draft → batch process → review → approval → Events → Dashboard): `documents.spec.ts`, `event-review.spec.ts`, `events-dashboard.spec.ts`.
  - LM Studio offline usability: `foundation.spec.ts`.
  - Incomplete time/location and duplicate handling: `events-dashboard.spec.ts`, `event-review.spec.ts`.
  - **Partial batch failure and retry** — audit whether any current scenario submits a batch where one document fails while another succeeds, then retries the failed one, and add that case (using a stub response that fails for one document's text) if it is not already proven. This is the one failure case not clearly covered by the existing specs and must be verified before Phase 5 is marked complete.
  - Reprocessing warning for documents with approved events: confirm coverage and add if missing.

- [ ] **Step 3: Run full verification**

  ```powershell
  docker compose run --rm backend uv run pytest -q
  docker compose run --rm frontend npm run test
  docker compose run --rm frontend npm run lint
  docker compose run --rm frontend npm run build
  npm.cmd run test:e2e
  powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1
  ```

  Expected: every command exits 0. All prior offline, documents, event-review, and events-dashboard scenarios remain part of `test:e2e`.

- [ ] **Step 4: Update Project Knowledge after verification**

  Mark every Phase 5 Roadmap checkbox completed. Update Current Status to the MVP being built and verified end-to-end, with the deferred aesthetic design pass ([Design Pass Sequencing](../decisions/Design-Pass-Sequencing.md)) as the next focus. Add a top Project Knowledge Log entry covering runtime-configurable LM Studio settings, event-type management, the final verification totals, and the specific failure cases proven. Do not change the North Star.

- [ ] **Step 5: Commit**

  ```powershell
  git add tests project-knowledge
  git commit -m "test: verify phase 5 settings and full mvp flow"
  ```

## Plan self-review

- **Roadmap coverage:** Tasks 1-2 deliver the LM Studio base URL, model selection, connection test, connection status, and the required extraction settings (base URL + model, now actually consumed by extraction). Task 3 delivers simple event-type management with no advanced taxonomy features. Task 4 exposes both through the Settings screen. Task 5 verifies the full end-to-end flow and the offline/partial-failure/retry/incomplete-data/duplicate failure cases.
- **Grounded in current code:** the plan changes the real startup-baked `LmStudioClient` wiring in `main.py`, the env-only `Settings` in `config.py`, the `models[0]` behavior in `_discover_model`, and the placeholder `settings/page.tsx`; it extends the events router that already serves `GET /api/event-types`; and it reuses the established migration chain (head `0004`), the `/api/backend` proxy, `parseOrThrow`, `is_active` picker filtering, and the SQLite-inspecting e2e runner.
- **No hidden product choices:** "required extraction settings" is fixed to base URL + selected model; offline-safe saving, immediate-effect resolution, unique case-folded names, deactivate-preserves-history, and delete-only-when-unreferenced are all stated as constraints so implementation has no open questions.
- **No data loss:** renaming and deactivating never touch existing event links; deletion is refused for referenced types; the persisted extraction settings do not alter Phase 2's locked "never invent" extraction behavior.
- **Design sequencing honored:** only the missing Settings screen is built, with the named Tailwind Plus categories as structural references; no existing screen is restyled for polish, per [Design Pass Sequencing](../decisions/Design-Pass-Sequencing.md).

## Navigation

- [Back to Project Knowledge](../Project-knowledge-Index.md)
- [Roadmap](../Roadmap.md)
- [Design Pass Sequencing](../decisions/Design-Pass-Sequencing.md)
- [Document & Event Data Model](../decisions/Document-Event-Data-Model.md)
- [Visual Design Direction](../decisions/Visual-Design-Direction.md)
- [Phase 4 Implementation Plan](2026-07-14-phase-4-events-dashboard.md)
