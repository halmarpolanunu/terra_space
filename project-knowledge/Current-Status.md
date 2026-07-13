---
type: Project Status
title: terra_space Current Status
description: Current continuation point for Terra Space MVP.
tags: [project-knowledge, status]
status: active
---

# terra_space Current Status

## Current focus

The Phase 1 foundation checkpoint is complete. The next step is the dedicated visual-design session; final visual direction is intentionally not chosen yet.

## Recent progress

- Created the isolated `phase-1-foundation` branch and worktree for implementation.
- Built the Next.js frontend and FastAPI backend skeleton with locked dependencies and automated tests.
- Implemented safe local data-directory initialization and a health endpoint that reports offline LM Studio without blocking application startup.
- Added the SQLite schema and reversible Alembic migration for documents, attachments, events, event types, actors, locations, sources, and their event relationships.
- Verified the current backend suite with 14 passing tests.
- Added the neutral English navigation shell for Dashboard, Documents, Event Review, Events, and Settings.
- Added a local-only LM Studio availability check and clear offline status messages.
- Built and verified a 4.7 MB low-detail world PMTiles package from Natural Earth data; it remains outside Git in the local `data/maps/` folder.
- Added a two-service Docker Compose runtime: the frontend is available only at `http://localhost:3000`, while the backend remains on the private Docker network.
- Added beginner-friendly PowerShell start and stop helpers, along with clear instructions for the first map build, local LM Studio, backup, and restore.
- Verified that the SQLite database retains a sentinel record after containers are stopped and started again.
- Added a browser end-to-end test that confirms all five English routes, local map rendering, LM Studio offline usability, and no external browser network requests.
- Approved the written Phase 1 foundation design.
- Prepared a task-by-task implementation plan covering Docker, storage, SQLite, navigation, service health, the offline world map, and verification.
- Inspected the repository and confirmed it currently contains Project Knowledge and setup files, but no application implementation.
- Agreed on a local browser application started with Docker Compose.
- Selected Next.js and TypeScript for the frontend, FastAPI and Python for the backend, and SQLite for local structured data.
- Selected MapLibre and a replaceable low-detail world PMTiles package for fully offline maps.
- Confirmed that the user interface will be in English.
- Reserved a separate design session for detailed visual direction before final interface implementation.
- Lean Project Knowledge setup installed at the `terra_space` project root.
- MVP brief ingested into North Star and Roadmap.
- Terra Space direction is now local-first, single-user, LM Studio based, and focused on document-to-event intelligence workflow.
- MVP scope is limited to Documents, batch processing, Event Review, deduplication recommendation, Events, Dashboard, and Settings.

## Blockers

- Detailed visual direction remains intentionally undecided until the dedicated design session.

## Next actions

- Hold the dedicated visual-design session before final interface styling.
- Design the detailed document and event data model before Phase 2 implementation.

## Related knowledge

- [Back to Project Knowledge](Project-knowledge-Index.md)
- [North Star](North-Star.md)
- [Roadmap](Roadmap.md)
- [Local-First MVP Decision](decisions/MVP-Local-First-Architecture.md)
