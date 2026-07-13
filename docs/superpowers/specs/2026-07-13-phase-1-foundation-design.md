# Terra Space Phase 1 Foundation Design

**Status:** Approved in conversation; awaiting review of this written specification  
**Date:** 2026-07-13

## Purpose

Build the technical foundation for Terra Space as a local web application. Phase 1 must make the application easy to start with Docker Compose, establish safe local storage, and provide the page structure needed by later MVP phases.

Detailed visual design is deliberately deferred to a dedicated design session before the final interface is implemented. Phase 1 must not make visual choices that are difficult to change later.

## Product boundaries

- The application is for one local user.
- It opens in a browser and is started from PowerShell with Docker Compose.
- Documents, events, settings, attachments, map data, and AI processing remain local.
- LM Studio is the only AI provider in the MVP.
- The application remains usable when LM Studio is offline.
- Authentication, cloud hosting, synchronization, and multi-user features are excluded.
- All user-interface text is in English.

## Architecture

Terra Space uses separate frontend and backend services with focused responsibilities:

- **Next.js with TypeScript** renders the browser interface and manages page navigation and interaction.
- **FastAPI with Python** owns application rules, database access, file storage, batch-processing coordination, validation, and LM Studio communication.
- **SQLite** stores structured application data in one local database file.
- **MapLibre GL JS with PMTiles** renders a low-detail world map entirely from local files.
- **Docker Compose** starts the frontend and backend services together.

The frontend communicates only with the local FastAPI backend. The backend reaches LM Studio running on Windows through a configurable URL whose Docker default is `http://host.docker.internal:1234`.

## Local storage

Persistent data is mounted from the Windows host into the backend container:

```text
data/
├── database/
│   └── terra-space.db
├── attachments/
├── maps/
│   └── world-low-detail.pmtiles
└── logs/
```

Deleting or rebuilding a container must not delete these files. The map package is replaceable so more detailed regional or global packages can be introduced later.

## Application pages

The application shell provides five navigation entries:

1. **Dashboard** — summary, world map, timeline, and recent approved events.
2. **Documents** — manual document creation, editing, selection, and processing controls.
3. **Event Review** — source document and extracted draft-event review.
4. **Events** — approved-event search, filters, details, and editing.
5. **Settings** — LM Studio connection, event types, and local storage status.

Phase 1 establishes the navigation and page boundaries. Later roadmap phases add their complete behavior.

## Visual-design boundary

The application will have a modern intelligence-workspace appearance, but the exact palette, typography, component style, spacing, light/dark behavior, and motion language will be decided in a separate design session.

The foundation must therefore:

- use reusable interface components and design tokens;
- avoid hard-coding visual decisions across individual pages;
- remain desktop-first while preserving a usable tablet layout;
- support accessible keyboard navigation, focus states, and readable contrast;
- avoid external font, icon, script, or stylesheet requests at runtime.

## Data flow

The later end-to-end workflow supported by this foundation is:

```text
Document draft
  -> selected for processing
  -> LM Studio extracts draft events
  -> user reviews and corrects events
  -> possible duplicates are flagged
  -> user approves or rejects
  -> approved events appear in Events and Dashboard
```

AI output never becomes an approved event automatically. Invalid output is rejected before database persistence. One failed document does not fail the rest of a batch. Reprocessing never deletes or overwrites approved events automatically.

## Offline map

The MVP uses a low-detail world PMTiles package containing the geographic context required for a global overview, such as coastlines, countries, administrative context where available, and major cities. Runtime map rendering must make no internet requests.

More detailed map packages can be revisited later. The map source path and style configuration must remain replaceable without changing event records or the dashboard's public interface.

## Failure handling

- Terra Space starts even when LM Studio is unavailable.
- Missing or unreadable persistent-storage folders produce a clear startup or health message.
- A missing map package disables the map panel with a clear message but does not disable the rest of the application.
- AI parsing and validation failures preserve the source document and approved data.
- Individual batch failures are recorded independently and can be retried.
- Technical detail is written to local logs; the interface presents short, actionable English messages.
- SQLite backup uses a database-safe backup operation while the application is running.

## Verification strategy

Phase 1 verification includes:

- backend unit tests for configuration, storage paths, database initialization, and health checks;
- frontend component tests for navigation and service-state messages;
- an API integration test between the frontend contract and FastAPI;
- a Docker Compose smoke test confirming the application opens locally;
- an offline test confirming no runtime internet dependency and local map availability;
- a failure test confirming the application remains usable when LM Studio is offline;
- a persistence test confirming container rebuilds do not remove the database, attachments, maps, or logs.

Later phases add workflow-specific tests for extraction, review, duplicate detection, approval, dashboard filtering, backup, and recovery.

## Phase 1 completion criteria

Phase 1 is complete when:

- `docker compose up` starts Terra Space successfully;
- the browser interface provides all five navigation entries;
- the frontend can read backend health information;
- SQLite and persistent local directories initialize safely;
- the application reports LM Studio availability without requiring it to start;
- the local low-detail world map can be loaded without internet access;
- automated tests and the Docker smoke test pass;
- setup and recovery instructions are understandable to a non-coder;
- the dedicated visual-design session has occurred before final interface styling begins.

