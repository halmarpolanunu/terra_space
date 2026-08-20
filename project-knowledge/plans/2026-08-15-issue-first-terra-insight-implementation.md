---
type: Implementation Plan
title: Issue-First Terra Insight Implementation Plan
description: Builds the parallel Issue-first pipeline and analysis surface, verifies a full reprocess, then retires the current event-first version only after owner approval.
tags: [project-knowledge, plan, terra-insight, supabase, n8n, issues, actor-arcs]
status: planned
---

# Issue-First Terra Insight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a small, safe parallel Issue-first prototype: validated article-level Main Issues, their evidence-backed event relationships, and one new Issues screen.

**Architecture:** Add a versioned Issue-first schema and pipeline contract alongside the current phase-prefixed model. A read-only API exposes only valid Issues, their events, and supported actor relationships to a new `/issues` workspace. Keep all existing routes and workflows untouched until the owner completes the full reprocess and confirms the new version is sound.

**Tech Stack:** Local Supabase/PostgreSQL, n8n, FastAPI, SQLAlchemy, Pydantic, Next.js/TypeScript, MapLibre, Vitest, pytest, Playwright.

## Global Constraints

- Do not modify or delete current live data, current tables, or current n8n workflows during parallel build.
- Do not issue destructive Supabase SQL without first describing the exact target and obtaining explicit owner confirmation in chat.
- Only pipeline-valid Issues and events may be returned by the Issue-first API.
- No browser control may edit, approve, reject, archive, delete, hide, or otherwise correct an Issue/event/relationship.
- Each Main Issue belongs to one source article; no cross-article merge is in scope.
- Render an arc only for a validated relationship with explicitly grounded source and target locations.
- Preserve all pipeline run history. Do not reprocess existing articles in this release.
- Keep all current routes, workflows, and menus unchanged; the current application is the fallback.
- Do not build Analytics, Pipeline Status, menu retirement, or full-release switching in this plan.

---

## File structure

| Path | Responsibility |
|---|---|
| `supabase/migrations/<timestamp>_issue_first_parallel.sql` | Adds new parallel Issue, event-version, relationship, location, and run tables plus read-only views; never alters current tables. |
| `supabase/tests/issue_first_parallel.sql` | Applies the migration to a disposable database and asserts constraints, validity gates, and preservation of existing tables. |
| `backend/app/db/models.py` | Adds read-only mappings for the new Issue-first views after their schema is stable. |
| `backend/app/schemas/issues.py` | Defines API response types for Issues, events, endpoint locations, relationships, and evidence. |
| `backend/app/services/issues.py` | Performs valid-only queries with no write functions. |
| `backend/app/api/routes/issues.py` | Exposes GET-only Issue routes. |
| `frontend/src/lib/issues-api.ts` | Typed GET client for the new routes. |
| `frontend/src/app/issues/*` | Issues workspace, selected-event pane, and relationship panel. |
| `frontend/src/components/world-map.tsx` | Adds an optional read-only relationship-arc GeoJSON source/layer without changing existing event pins. |
| `frontend/src/components/navigation.tsx` | Switches new-version navigation to Issues and removes Events/Event Review only after cutover. |

## Task 1: Lock the parallel data contract in an executable Supabase migration

**Files:**
- Create: `supabase/migrations/<timestamp>_issue_first_parallel.sql`
- Create: `supabase/tests/issue_first_parallel.sql`
- Modify: `backend/tests/supabase_bridge_test_support.py`

**Interfaces:**
- Produces `terra_space_issue_v2_issues`, `terra_space_issue_v2_events`, `terra_space_issue_v2_relationships`, `terra_space_issue_v2_relationship_endpoints`, and append-only `terra_space_issue_v2_runs`.
- `issues.validated_at IS NOT NULL` and `events.validated_at IS NOT NULL` are the database-level validity gates for analytical reads.
- A relationship has exactly one `source` and one `target` endpoint, each referencing an explicit location and evidence quote.

- [ ] Write a failing disposable-Postgres test that attempts to insert a relationship with two source endpoints and expects a CHECK/unique-constraint failure.
- [ ] Run `docker compose -f docker-compose.supabase-bridge-test.yml up -d` and `pytest backend/tests/test_phase_prefixed_models.py -q`; confirm the test fails before the migration exists.
- [ ] Add tables with UUID primary keys, foreign keys restricted to the new parallel tables, non-empty evidence quotes, endpoint roles constrained to `source|target`, and one-source/one-target uniqueness per relationship.
- [ ] Add valid-only SQL views `terra_space_issue_v2_valid_issues` and `terra_space_issue_v2_valid_events` that require the appropriate `validated_at` values and never include failed runs.
- [ ] Extend the disposable migration fixture to replay this migration after existing migrations; seed one valid Issue/event/relationship and one invalid record.
- [ ] Re-run the focused pytest test and `psql` schema test; confirm the valid-only views exclude the invalid record and all existing `terra_space_phase*` tables still exist.
- [ ] Commit only this schema/test task: `git commit -m "feat: add parallel issue-first schema"`.

## Task 2: Version the pipeline payload and write only validated Issue-first records

**Files:**
- Modify: exported n8n workflow JSON/evidence under `project-knowledge/plans/evidence/issue-first/`
- Modify: `supabase/migrations/<timestamp>_issue_first_parallel.sql` (add a guarded RPC)
- Create: `supabase/tests/issue_first_pipeline_contract.sql`

**Interfaces:**
- Pipeline payload: `{ source_id, main_issue: { label, summary, evidence_quote }, events: [{ title, evidence_quote, relationships: [{ source: { name, location, evidence_quote }, target: { name, location, evidence_quote }, evidence_quote }] }] }`.
- RPC `terra_space_issue_v2_record_run(payload jsonb)` validates quotes/roles before inserting one append-only run and its valid analytical rows.

- [ ] Export and save immutable baseline JSON for each current n8n workflow before changing a copy; record filenames and checksums in `project-knowledge/plans/evidence/issue-first/README.md`.
- [ ] Write a failing SQL test with an invented endpoint location quote; expect the RPC to save the failed run but create no row in either valid-only view.
- [ ] Implement the RPC so every quote is checked against the Phase 1 source text, every relationship has both role-specific locations, and any failure is stored with its stage/reason in the run record.
- [ ] Create copied, clearly named Issue-first n8n workflows; leave the current workflows inactive/unchanged. Map the new extraction output to the exact RPC payload and preserve raw output, prompt version, and model name.
- [ ] Run the disposable SQL contract tests and n8n validation; confirm invalid results are observable in runs but absent from analytical views.
- [ ] Commit: `git commit -m "feat: add issue-first pipeline contract"`.

## Task 3: Build GET-only Issue-first backend queries

**Files:**
- Create: `backend/app/schemas/issues.py`
- Create: `backend/app/services/issues.py`
- Create: `backend/app/api/routes/issues.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_issues_service.py`
- Create: `backend/tests/test_issues_api.py`

**Interfaces:**
- `GET /api/issues` returns `IssueListItem[]`, newest valid Issue first.
- `GET /api/issues/{issue_id}` returns `IssueDetail` with only its valid events.
- `GET /api/issues/{issue_id}/events/{event_id}` returns `IssueEventDetail` and every valid relationship/evidence record.
- All routes are `GET`; unknown IDs return `404` and invalid/failed pipeline records are indistinguishable from absent analysis records.

- [ ] Write API tests that seed two sources/issues and assert `/api/issues/{id}` never includes the other Issue’s event.
- [ ] Write a failing test for an incomplete relationship: its event is returned but `relationships` is an empty list.
- [ ] Implement Pydantic reads (`IssueListItem`, `IssueEventRead`, `ActorEndpointRead`, `ActorRelationshipRead`) and parameterized SQLAlchemy queries against the valid-only views.
- [ ] Register the router in `create_app()` and assert route-method inspection finds no POST/PATCH/DELETE Issue route.
- [ ] Run `pytest backend/tests/test_issues_service.py backend/tests/test_issues_api.py -q`; confirm valid-only behavior, relationship ordering, 404s, and read-only routing.
- [ ] Commit: `git commit -m "feat: expose valid issue analysis API"`.

## Task 4: Build the typed client and Issue home

**Files:**
- Create: `frontend/src/lib/issues-api.ts`
- Create: `frontend/src/app/issues/issues-workspace.tsx`
- Create: `frontend/src/app/issues/page.tsx`
- Create: `frontend/tests/issues-workspace.test.tsx`

**Interfaces:**
- `listIssues(): Promise<IssueListItem[]>`, `getIssue(id): Promise<IssueDetail>`, `getIssueEvent(issueId,eventId): Promise<IssueEventDetail>`.
- `IssuesWorkspace` owns `selectedIssueId` and `selectedEventId`; it fetches data but never sends a mutation.

- [ ] Write a failing render test with two Issues that expects the newest one selected on load and only that Issue’s events passed to the globe.
- [ ] Implement the API client with the existing `/api/backend/api` root and the project’s `parseOrThrow` error behavior.
- [ ] Build the side-by-side page: accessible Issue list left, selected-Issue globe right, clear empty/error states, and no review/edit action.
- [ ] Add a test for an Issue with no mappable events: show “No mapped events yet” rather than a false pin or a generic error.
- [ ] Run `npm.cmd test -- issues-workspace.test.tsx` and `npm.cmd run lint` from `frontend/`.
- [ ] Commit: `git commit -m "feat: add issue-first analysis home"`.

## Task 5: Add read-only actor arcs to the globe and event focus

**Files:**
- Modify: `frontend/src/components/world-map.tsx`
- Create: `frontend/src/app/issues/relationship-panel.tsx`
- Modify: `frontend/src/app/issues/issues-workspace.tsx`
- Create: `frontend/tests/relationship-panel.test.tsx`
- Modify: `frontend/tests/world-map.test.tsx`

**Interfaces:**
- `WorldMap` gains optional `relationshipArcs: FeatureCollection<LineString>` and `selectedRelationshipId?: string`.
- Arc feature properties: `{ relationshipId, sourceName, targetName, evidenceQuote }`.
- `RelationshipPanel` receives `relationships: ActorRelationshipRead[]` and `onSelect(id)`.

- [ ] Write a failing map-data test that returns three relationships and expects three LineString features, each with source longitude/latitude followed by target longitude/latitude.
- [ ] Implement a separate MapLibre source/layer for arcs; it must be absent when no valid relationships exist and must dim non-selected arcs rather than remove them.
- [ ] Build the relationship panel with colour-matched Source → Target rows, explicit endpoint labels, and the relationship evidence quote.
- [ ] Write a failing component test that an event with no relationships shows a plain “No supported actor relationships” state and no arc controls.
- [ ] Run focused Vitest tests and the existing globe/map suite; verify reduced-motion mode adds no animated arc behavior.
- [ ] Commit: `git commit -m "feat: show evidence-backed actor arcs"`.

## Deferred after the first release

Tasks 6–8 below are intentionally deferred by the owner on 2026-08-16. Do not implement them
unless the owner explicitly reopens this scope after reviewing the Issues screen with safe test
data.

## Task 6: Add pipeline observability without an Event Review queue

**Files:**
- Create: `frontend/src/app/sense/pipeline-status-workspace.tsx`
- Create: `frontend/src/app/sense/pipeline-status/page.tsx`
- Modify: `frontend/src/app/sense/sense-workspace.tsx`
- Create: `frontend/tests/pipeline-status-workspace.test.tsx`

**Interfaces:**
- `GET /api/issues/pipeline-runs` returns read-only source title, stage, status, reason, processed time, model, and prompt version.
- The workspace links to no mutation route and includes no approve/edit/reprocess button.

- [ ] Add a failing API/frontend test for a failed run that expects its stage and plain-language reason, but no Issue-review control.
- [ ] Extend the read-only Issue service/router with the run list query and map it into the pipeline-status workspace.
- [ ] Add the new Pipeline status navigation item in the parallel/new-version navigation configuration only.
- [ ] Run API, workspace, and navigation tests; verify keyboard navigation and the empty state.
- [ ] Commit: `git commit -m "feat: add issue pipeline observability"`.

## Task 7: Keep current version as fallback and verify the parallel release

**Files:**
- Modify: `frontend/src/components/navigation.tsx`
- Modify: `frontend/tests/navigation.test.tsx`
- Create: `frontend/tests/issues-release.e2e.ts`
- Modify: `project-knowledge/Current-Status.md`
- Modify: `project-knowledge/Project-Knowledge-Log.md`

**Interfaces:**
- A feature/config switch selects `current` or `issue-first`; default remains `current` until owner approval.
- Both versions continue to use local-only services and share no destructive migration path.

- [ ] Write a failing navigation test for the `issue-first` value: Terra Insight has Issues, no Events; Terra Sense has Pipeline status, no Event Review.
- [ ] Add a configuration-backed switch in the app shell/navigation; keep `/dashboard`, `/events`, and `/event-review` intact and reachable while `current` is active.
- [ ] Write Playwright coverage for selecting an Issue, selecting a pin, selecting one of multiple arcs, and seeing its evidence; add a separate no-arc event scenario.
- [ ] Run full backend tests, frontend tests, lint, production build, and the new browser test against the disposable database; record exact results in Project Knowledge.
- [ ] Show the new version to the owner while the current version remains available. Do not start full reprocessing or remove current paths in this task.
- [ ] Commit: `git commit -m "feat: add issue-first parallel release"`.

## Task 8: Owner-triggered full reprocess and guarded retirement

**Files:**
- Create: `tools/Verify-IssueFirst-Reprocess.ps1`
- Create: `backend/tests/test_issue_first_reprocess_audit.py`
- Modify: `project-knowledge/Current-Status.md`
- Modify: `project-knowledge/Project-Knowledge-Log.md`
- Modify: `project-knowledge/Roadmap.md` only after owner confirms release

**Interfaces:**
- `Verify-IssueFirst-Reprocess.ps1` is read-only and reports source count, latest-run count, valid Issue count, valid event count, relationship count, and sources lacking a latest Issue-first run.
- Retirement requires an explicit owner message after successful verification; it is never an automatic consequence of a passing test.

- [ ] Write a failing audit test that seeds three Phase 1 sources and only two latest Issue-first runs; expect the missing source ID in the report.
- [ ] Implement the read-only audit query/script and test it against the disposable database.
- [ ] After the owner triggers reprocessing for every stored source, run the audit and provide its exact report; resolve pipeline defects upstream and rerun only when the owner requests it.
- [ ] Ask the owner for explicit confirmation that the Issue-first version is solid and the current version may be removed. Do not remove anything before that confirmation.
- [ ] After confirmation, write a separate retirement plan identifying the exact current routes, controls, workflow copies, and schema retention/backup policy. Obtain confirmation again before any destructive removal.

## Plan self-review

- **Spec coverage:** Tasks 1–3 establish valid-only source/Issue/event/relationship data; Tasks 4–5 create the Issue/globe/arc experience; Task 6 replaces review with observability; Task 7 preserves the fallback; Task 8 handles owner-triggered full reprocessing and gated retirement.
- **No placeholders:** Every task names its files, interfaces, assertions, commands, and required acceptance behavior. Timestamped migration naming is intentional because the actual Supabase migration timestamp is assigned when created.
- **Type consistency:** `IssueListItem`, `IssueDetail`, `IssueEventDetail`, `ActorEndpointRead`, and `ActorRelationshipRead` flow from Task 3 through Tasks 4–5; `relationshipId` is used consistently in the API, MapLibre feature properties, and panel selection.

## Navigation

- [Issue-First Terra Insight Design](2026-08-15-issue-first-terra-insight-design.md)
- [Pipeline-Only Data Correction](../decisions/Pipeline-Only-Data-Correction.md)
- [Current Status](../Current-Status.md)
