---
type: Update Log
title: Project Knowledge Log
description: Chronological record of meaningful changes to the Project Knowledge bundle.
tags: [project-knowledge, history]
status: active
---

# Project Knowledge Log

## 2026-07-14 — Document & event data model locked

- Designed the Phase 2/3 data model extension and recorded it as the Document & Event Data
  Model decision, extending the Phase 1 schema in place rather than splitting draft/approved
  events into separate tables.
- Key additions: `document_date`/`publication_date` on documents; a fixed `processing_status`
  and `review_status` (including a new `merged` value) vocabulary; `evidence_quote` on the
  event-source link instead of on the event; a persistent `duplicate_flags` table; a
  `source`/`target` role on `event_actors`; reuse of `is_active` on `EventType`/`Actor` for
  AI-suggestion tracking; and numeric `latitude`/`longitude` on locations for the map.
- Moved the continuation point to writing the Phase 2/3 implementation plan.

## 2026-07-13 — Visual design direction locked

- Held the dedicated visual-design session and recorded the Visual Design Direction decision.
- Chose a calm "mission brief" tactical look on pure black: amber accent, 3D globe map,
  serif source documents vs mono/sans system chrome, calm motion, and one-thing-at-a-time
  dense screens (Dashboard and Event Review validated as concept mockups).
- Moved the continuation point from the visual-design checkpoint to the document/event
  data-model design before Phase 2.

## 2026-07-13 — Claude Code continuation handoff prepared

- Documented the completed and merged Phase 1 foundation, local run commands, verification commands, and the next visual-design checkpoint for Claude Code.

## 2026-07-13 — Phase 1 foundation checkpoint verified

- Verified in the `phase-1-foundation` worktree: 14 backend tests, 6 frontend tests, frontend
  lint and production build, and the browser end-to-end check all passed.
- The end-to-end run (`npm.cmd run test:e2e`) confirmed all five English routes, the local map
  canvas, LM Studio offline behavior, and no external browser network requests.
- Persistence confirmed: a SQLite sentinel record survived a `docker compose down` and restart.
- Project Knowledge validation passed with 0 errors and 0 warnings.
- The next planned collaboration point is the separate visual-design session; no final visual decisions were made during implementation.

## 2026-07-13 — Docker Compose runtime verified

- Added the local two-service Docker Compose runtime and PowerShell start/stop helpers.
- The frontend binds only to `127.0.0.1:3000`; the backend database remains private inside the Docker network while its `data/` storage is mounted from the host.
- Confirmed that SQLite data remains available after container restart.

## 2026-07-13 — Phase 1 navigation and offline-map foundation implemented

- Added the neutral five-page navigation shell and LM Studio service-status reporting.
- Added a reproducible, fully offline low-detail world-map package workflow using local PMTiles.

## 2026-07-13 — Phase 1 storage foundation implemented

- Implemented the initial local storage and SQLite foundation on the `phase-1-foundation` branch.
- Added safe data-directory initialization, offline-aware health status, and a reversible migration for core Terra Space records.

## 2026-07-13 — Phase 1 implementation plan prepared

- Approved the Phase 1 foundation design and prepared the detailed implementation plan.
- Kept the dedicated visual-design session as a required checkpoint before final styling.

## 2026-07-13 — Phase 1 foundation direction selected

- Repository inspection confirmed that application implementation has not started.
- Selected Docker Compose, Next.js, FastAPI, SQLite, and local file storage for the MVP foundation.
- Selected a fully offline, replaceable low-detail world PMTiles map package.
- Confirmed an English interface and a separate visual-design session before final styling.

Add new entries at the top only for meaningful changes to direction, roadmap, decisions, or the project's continuation point. Do not log spelling fixes or minor formatting changes.

## 2026-07-13 - MVP brief ingested

- Ingested the Terra Space MVP brief into the North Star, Roadmap, Current Status, and Decisions.
- Defined Terra Space as a local-first single-user intelligence workspace.
- Set MVP scope around manual documents, batch LM Studio processing, event review, deduplication recommendation, approved Events, Dashboard, and Settings.
- Recorded the local-first MVP architecture decision.

## 2026-07-13 - Installed for terra_space

- Installed the lean Project Knowledge setup into the `terra_space` project root.
- Set the current continuation point: define the real North Star before major implementation.
- Preserved the token-saving structure: North Star, Current Status, Roadmap, Knowledge Log, and Decisions.

## 2026-07-13 - Lean Project Knowledge

- Replaced separate capability, use-case, and milestone structures with one phase-based Roadmap.
- Simplified the shared agent workflow and onboarding documents.
- Updated validation for the lean knowledge structure.

## Template initialization

- Created the connected OKF knowledge structure and AI-agent instruction adapters.
- Replace this entry with the first project-specific knowledge update after cloning.

## Related knowledge

- [Back to Project Knowledge](Project-knowledge-Index.md)
