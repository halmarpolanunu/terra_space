---
type: Implementation Plan
title: Terra Space Supabase Application Transition Implementation Plan
description: Move the Terra Space backend and Dashboard from SQLite to the shared phase-prefixed local Supabase database.
tags: [project-knowledge, plan, backend, frontend, supabase, dashboard]
status: planned
---

# Terra Space Supabase Application Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing Terra Space application use local Supabase/PostgreSQL as its only live database and treat `phase3_events` as immediately visible, human-authoritative Dashboard data.

**Architecture:** Retain FastAPI and SQLAlchemy, replace SQLite connection/bootstrap behavior with an environment-provided PostgreSQL URL, and map existing domain services onto phase-prefixed tables. Preserve frontend API boundaries where practical, then add explicit published/hidden/rejected/archived authority behavior to Dashboard and event detail.

**Tech Stack:** Python 3.13, FastAPI, SQLAlchemy 2, psycopg 3, PostgreSQL/Supabase, Next.js/TypeScript, Vitest, Playwright, Docker Compose.

## Global Constraints

- Prerequisite: Supabase foundation and n8n transition completion gates have passed.
- Do not copy old SQLite application rows into Supabase.
- Preserve the SQLite database and local attachments unchanged as rollback material.
- Do not expose the PostgreSQL URL, Supabase service key, or database password to frontend code.
- Do not run `Base.metadata.create_all()` against Supabase; checked-in Supabase migrations own schema.
- Pipeline reruns may append history but may not overwrite authoritative event fields.
- `FINAL/published` appears immediately; hidden, rejected, archived, merged, and exception records stay outside normal Dashboard queries.
- Keep the application usable when LM Studio is offline.

---

### Task 1: Add PostgreSQL configuration and isolated tests

**Files:**
- Modify: `backend/pyproject.toml` and lock file.
- Modify: `backend/app/core/config.py`.
- Modify: `backend/app/db/session.py`.
- Modify: `backend/app/main.py`.
- Modify: `docker-compose.yml` and `.env.example`.
- Create: `docker-compose.postgres-test.yml`.
- Create: `backend/tests/test_postgres_session.py`.

**Interfaces:**
- Produces `Settings.database_url` from `TERRA_DATABASE_URL` and `create_session_factory(database_url)` without schema creation.

- [ ] Write a failing test asserting `Settings` requires `TERRA_DATABASE_URL` outside explicitly configured SQLite unit tests.
- [ ] Add psycopg 3 as the PostgreSQL SQLAlchemy driver using the repository's exact-version dependency convention and regenerate the lock file.
- [ ] Replace unconditional SQLite setup with dialect-aware setup:

```python
def create_session_factory(database_url: str) -> sessionmaker:
    engine = create_engine(database_url, pool_pre_ping=True)
    if engine.dialect.name == "sqlite":
        configure_sqlite_connection(engine)
    return sessionmaker(bind=engine, expire_on_commit=False)
```

Do not call `Base.metadata.create_all()`.
- [ ] Make `create_app()` use `settings.database_url`; keep SQLite URLs injectable in unit tests only.
- [ ] Add backend-only `TERRA_DATABASE_URL` to Compose. Do not add it to the frontend service.
- [ ] Add a private PostgreSQL test service with a separate test database and no host port; tests apply the checked-in Supabase migration before running PostgreSQL integration cases.
- [ ] Run focused session/config tests and verify the backend starts against the test PostgreSQL service.

### Task 2: Map SQLAlchemy models to phase-prefixed tables

**Files:**
- Modify: `backend/app/db/models.py`.
- Create: `backend/tests/test_phase_prefixed_models.py`.
- Read: `supabase/migrations/202608100001_fresh_phase_prefixed_foundation.sql`.

**Interfaces:**
- Preserves Python domain class names where useful while mapping them to the new database contract.

- [ ] Map `Document` to `phase1_sources`, exposing compatibility attributes for title, content/raw text, publication date, source URL, processing status/error, and timestamps; add cleaned text, domain, author, and collection source fields.
- [ ] Map `Attachment` to `phase1_attachments` and replace `document_id` storage with `phase1_source_id` while keeping API serialization stable.
- [ ] Map `Event` to `phase3_events` with `candidate_key`, `origin`, `pipeline_outcome`, `dashboard_status`, pipeline snapshots, human modification fields, and published time.
- [ ] Map Event Type, taxonomy, actors, aliases, locations, event-source/actor/location links, and duplicate flags to their `phase3_` table names.
- [ ] Remove runtime dependency on the old `sources` and `extraction_log_entries` tables. Read evidence from `phase3_event_sources` and pipeline audit from `phase3_event_runs`.
- [ ] Map `AppSettings` to `app_settings` and retain the fixed `default` row behavior.
- [ ] Add tests that compare SQLAlchemy table/column names against PostgreSQL `information_schema` and fail on drift.

### Task 3: Adapt source/document and settings services

**Files:**
- Modify: `backend/app/services/documents.py`, `backend/app/api/routes/documents.py`.
- Modify: `backend/app/services/settings.py`, `backend/app/api/routes/settings.py`.
- Modify: related schemas and tests under `backend/tests/`.

**Interfaces:**
- Existing frontend Documents and Settings endpoints remain available.

- [ ] Update document CRUD to use `phase1_sources`. New Terra Space UI drafts use `collection_source='terra_space_ui'`; n8n-completed sources remain readable in the same list.
- [ ] Preserve edit locks, attachment validation, local file paths, processing-status behavior, and source deletion protections.
- [ ] Ensure deleting a Phase 1 source is blocked when any Phase 2 result or Phase 3 event references it; do not cascade-delete authoritative intelligence.
- [ ] Update settings reads/writes to upsert the single `app_settings.id='default'` row.
- [ ] Run document, attachment, settings, and LM-Studio-offline tests against PostgreSQL.

### Task 4: Adapt event services and authority rules

**Files:**
- Modify: `backend/app/schemas/event.py`.
- Modify: `backend/app/services/events.py`, `backend/app/services/duplicates.py`, `backend/app/services/matching.py`.
- Modify: `backend/app/api/routes/events.py`, `backend/app/api/routes/actors.py`.
- Create: `backend/tests/test_phase3_event_authority.py`.
- Modify: existing event, taxonomy, duplicate, and exploration tests.

**Interfaces:**
- API exposes `dashboard_status: published|hidden|rejected|archived|merged` and `pipeline_outcome: FINAL|EXCEPTION|null`.
- `PATCH /api/events/{id}` records human authority metadata.
- Add `POST /api/events/{id}/publish`, `/reject`, `/archive`, and `/restore` with explicit transitions.

- [ ] Replace the old review-status query contract with Dashboard status while accepting `review_status=approved` temporarily as an internal compatibility alias mapped to `published` until frontend Task 5 lands.
- [ ] On every human event patch, set `human_modified_at=now()` and merge changed field names into `human_modified_fields`; never alter `pipeline_event_snapshot`.
- [ ] Enforce transitions:

```text
hidden -> published|rejected|archived
published -> rejected|archived
rejected -> published|archived
archived -> published|rejected
merged -> no direct edit or restore
```

- [ ] Manual event creation sets `origin='manual'`, `pipeline_outcome=null`, and starts hidden until explicitly published.
- [ ] Protected permanent deletion requires the existing confirmation flow, deletes normalized event relationships, and leaves `phase3_event_runs` audit rows intact by candidate key/source ID.
- [ ] Update duplicate detection to compare reviewable events against `published` events and preserve keep-separate/link behavior.
- [ ] Update epistemic statuses to `confirmed|reported|alleged|planned|denied|unknown`; migrate UI/API labels without guessing a pipeline value.
- [ ] Add tests proving immediate published visibility, hidden exception exclusion, edit metadata, rejected/archived exclusion, restoration, deletion audit retention, and pipeline rerun non-overwrite.

### Task 5: Connect Dashboard and Events UI to the new authority model

**Files:**
- Modify: `frontend/src/lib/events-api.ts`, `frontend/src/lib/event-filters.ts`.
- Modify: `frontend/src/app/dashboard/dashboard-workspace.tsx`.
- Modify: `frontend/src/app/events/event-detail.tsx`, `event-editor.tsx`, `events-workspace.tsx`.
- Modify: `frontend/src/app/event-review/` components only where hidden/exception terminology changes.
- Modify: relevant frontend tests.

**Interfaces:**
- Dashboard lists `published` events and allows edit, reject, archive, and restore through its event detail panel.

- [ ] Replace frontend `ReviewStatus` with `DashboardStatus`; update list requests to send `dashboard_status=published`.
- [ ] Extend `EventRead` with `origin`, `pipeline_outcome`, `dashboard_status`, `human_modified_at`, and `human_modified_fields`.
- [ ] Keep summary, filters, globe, timeline, register, and detail derived from the same published-event response.
- [ ] Add clear event-detail actions: Edit, Reject, Archive, Restore where allowed, and protected Delete. Show `AI generated` versus `Manually added`, without displaying raw model output in the main Dashboard.
- [ ] After edit/status action, refetch the selected event, event list, and Dashboard summary so the map/timeline/list update immediately.
- [ ] Show hidden Phase 3 exceptions in Terra Sense/Event Review, not Dashboard; allow the owner to inspect and publish a corrected exception.
- [ ] Update epistemic labels and filters for confirmed, reported, alleged, planned, denied, and unknown.
- [ ] Run component tests, frontend lint, and production build.

### Task 6: Replace SQLite-specific operational tooling

**Files:**
- Modify: `Start-TerraSpace.ps1`, `Stop-TerraSpace.ps1`.
- Replace behavior in: `Backup-TerraSpaceDatabase.ps1`, `Restore-TerraSpaceDatabase.ps1` while retaining explicit legacy-SQLite archive instructions.
- Modify: `tools/Test-Persistence.py`, `tools/Test-DockerCompose.ps1`, `README.md`.

**Interfaces:**
- Start/stop and backup/restore operate on local Supabase plus local attachments.

- [ ] Make startup fail with a beginner-readable message when `TERRA_DATABASE_URL` is missing or local Supabase is unavailable; LM Studio unavailability remains non-blocking.
- [ ] Backups must include a PostgreSQL dump and attachment directory manifest. Restore must require confirmation and validate the target is the local Terra Space Supabase database.
- [ ] Keep a separately named legacy SQLite restore instruction; never automatically restore SQLite into Supabase.
- [ ] Replace SQLite table inspection in persistence tooling with PostgreSQL sentinel/readback checks.
- [ ] Verify restart persistence with a disposable test row and remove it through normal API cleanup, not direct destructive SQL.

### Task 7: Run application-wide PostgreSQL verification

**Files:**
- Modify: PostgreSQL test fixtures and all tests whose setup is SQLite-specific.
- Modify: Project Knowledge only after successful verification.

- [ ] Run the complete backend suite against the isolated PostgreSQL test service.
- [ ] Run all frontend tests, lint, and production build.
- [ ] Run browser scenarios for Documents, Event Review, Events/Dashboard, Settings, offline LM Studio, and responsive behavior against the fresh Supabase schema.
- [ ] Verify the live backend process has zero open SQLite connections and the archived SQLite checksum is unchanged.
- [ ] Keep production workflows and cutover inactive; record evidence and commit the application checkpoint.

# Completion gate

Do not perform final cutover until the complete backend/frontend/browser suite passes on PostgreSQL, all Dashboard views agree, human edits survive pipeline reruns, hidden/rejected/archived records remain excluded, attachments work, LM Studio offline is non-blocking, and SQLite remains unchanged.

# Navigation

- [n8n transition plan](2026-08-10-n8n-phase-table-transition.md)
- [Cutover plan](2026-08-10-supabase-cutover-verification.md)
- [Architecture decision](../decisions/Fresh-Phase-Prefixed-Supabase-Architecture.md)
