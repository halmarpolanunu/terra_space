---
type: Update Log
title: Project Knowledge Log
description: Chronological record of meaningful changes to the Project Knowledge bundle.
tags: [project-knowledge, history]
status: active
---

# Project Knowledge Log

## 2026-07-15 - Fixed the design pass audit's four priority usability defects

- Fixed all four prioritized usability defects from the
  [Design Pass Audit](plans/2026-07-15-design-pass-audit.md), per
  [Design Pass Sequencing](decisions/Design-Pass-Sequencing.md)'s rule that usability defects get
  fixed regardless of design-pass timing:
  1. Replaced the internal "Phase 2"/"Phase 3" roadmap labels shown on Documents and Event Review
     with real eyebrow text ("Source intake", "Extraction queue").
  2. Gave Event Review's dead-end empty state ("No documents are waiting for review." alone on a
     black screen) a framed panel with an orientation sentence and a button linking to Documents.
  3. Taught the shared `EventList` and `EventTimeline` components (used by both Dashboard and
     Events) to distinguish "no approved events exist at all" (shows "No approved events yet." with
     a link to Event Review) from "the current filters excluded everything" (keeps the original
     message and adds a "Clear filters" action) — previously both cases showed the same misleading
     "No events match these filters." even with no filters set on an empty database.
  4. Titled the Documents queue panel ("Document queue") with its own "No documents yet" empty
     state, and fixed disabled primary buttons fading to near-invisible by switching
     `.btn:disabled` from the `--text-dim` token (~2.2:1 contrast) to the already-used
     `--text-muted` token (~3.9:1); removed `--text-dim` since nothing referenced it afterward.
  Item 5 ("Compress the shared filter block") and the runners-up remain for the design pass's
  implementation half.
- Verified with 88 frontend tests (6 new, covering both empty-state branches on `EventList`,
  `EventTimeline`, the Documents queue panel, and the Event Review empty state), lint, a production
  build, and a live browser check of all four affected screens — including both the "no data" and
  "filters active" empty-state branches on Events, confirmed with real screenshots.
- Also discovered and cleaned up in passing: the earlier `.claude/worktrees/design-pass` git
  worktree, prepared for the design pass, was never actually used — the session that ran the audit
  worked directly in this checkout instead, leaving the worktree's branch unchanged from its
  creation point. Removed the unused worktree and branch after confirming no work would be lost.

## 2026-07-15 - Design pass audit completed (read-only)

- Ran the deferred design pass's audit half as a read-only review: the app was started from the
  `design-pass` worktree, all five screens were captured as full-page and viewport screenshots,
  and each screenshot was reviewed against the locked
  [Visual Design Direction](decisions/Visual-Design-Direction.md) and the Tailwind Plus category
  map in [Design Pass Sequencing](decisions/Design-Pass-Sequencing.md). No source files were
  modified. Findings are recorded in the
  [Design Pass Audit](plans/2026-07-15-design-pass-audit.md): four usability defects (roadmap
  "PHASE 2"/"PHASE 3" labels visible in the UI, a dead-end Event Review empty state, a
  misleading "No events match these filters" message shown on an empty database, and an
  unlabeled Documents queue panel with near-invisible disabled buttons), plus prioritized polish
  items, the biggest being compressing the shared Dashboard/Events filter block so the globe is
  visible without scrolling.
- Audit caveat recorded in the document itself: all screenshots were taken against an empty
  database, so the populated views (review card, events table, facts grid, globe pins,
  attachment thumbnails) still need a follow-up capture with sample data before or during the
  implementation half of the pass.

## 2026-07-14 - Local attachment storage built, closing the last open Roadmap item

- Executed the
  [Local Attachment Storage Implementation Plan](plans/2026-07-14-local-attachment-storage.md).
  The `Attachment` table and `data/attachments/` directory already existed from Phase 1, but a
  repo-wide search confirmed no attachment route, service, or UI existed anywhere — this was
  genuinely greenfield. Added a storage service restricted to `image/jpeg`, `image/png`,
  `image/gif`, and `image/webp` up to a 10 MB cap, writing files under a server-generated path
  (never the client's filename, to avoid path traversal) with a SHA-256 checksum computed at
  upload time. Added nested `/api/documents/{id}/attachments` routes (upload, file-serving,
  delete), gated behind the same draft/failed edit-lock already used for document edits, plus a
  thumbnail/upload/delete UI on the Documents page.
- Found and fixed a real gap while building this: deleting a document only removed `attachments`
  rows via the foreign key's `ON DELETE CASCADE` — it never removed the files themselves from
  disk. The SQLAlchemy relationship now cascades too, so `delete_document` cleans up every
  attachment file it owns before the document row is deleted.
- Verified with 117 backend tests, 82 frontend tests, frontend lint (one pre-existing-pattern
  `next/image` performance warning, not an error, accepted as-is for small dynamic thumbnails
  served from a same-origin backend proxy), a production build, and the full browser e2e suite —
  extended to upload an attachment, delete it, upload a second, and confirm after processing
  completes that the surviving file's bytes on disk still match its stored checksum.
- Also discovered that `docker compose run --rm backend/frontend ...` — written into the Phase 4
  and Phase 5 plans and copied into this one — can never actually work: both Dockerfiles are
  multi-stage builds whose final runtime image strips out `uv`/dev dependencies (backend) or
  `node_modules`/test tooling (frontend) entirely. Every phase's real verification, including this
  one, used `docker run` directly against the `uv` base image (backend) and `npm run
  test/lint/build` on the host (frontend) instead — the plan documents' command list was never
  literally executable as written.
- With this item closed, every Roadmap checkbox across all five MVP phases is now complete. The
  next focus is the deferred aesthetic design pass; a separate git worktree
  (`.claude/worktrees/design-pass`, branch `worktree-design-pass`) is already prepared for it.

## 2026-07-14 - Phase 5 (Settings and Verification) built and MVP verified end-to-end

- Executed the [Phase 5 Implementation Plan](plans/2026-07-14-phase-5-settings-verification.md).
  The grounding inspection confirmed the key constraint: the LM Studio base URL was baked in once at
  startup (`create_app` built a single `LmStudioClient(settings.lm_studio_url)` and passed it to the
  processing background tasks and health check) and `_discover_model` always picked the first model,
  so a user's model choice had nowhere to live. Fixed by adding a persisted single-row `app_settings`
  table (migration `0005_phase5_app_settings`) and a `config_provider` on `LmStudioClient` that
  resolves the current base URL and preferred model from that row on every call — saved settings now
  take effect for the next processing run and health check without a restart, and the selected model
  is honored by extraction (auto-detect when unset).
- Added `GET/PATCH /api/settings` (network-free read, base-URL validation, model clearable to
  auto-detect) and `POST /api/settings/lm-studio/test` (lists the models a candidate or saved URL
  reports; never mutates stored settings; offline is reported calmly). Added event-type management —
  `POST/PATCH/DELETE /api/event-types` for create, rename, activate/deactivate, and
  delete-only-when-unreferenced (409 otherwise) — with an `in_use` flag added to the event-type list
  read so the Settings UI offers delete only for unused types. No merge, synonyms, or hierarchy;
  renaming and deactivating never touch existing event links.
- Built the Settings screen (LM Studio connection panel with a live connection test and model
  selector; event-type panel), replacing the placeholder, with the Tailwind Plus categories from the
  [Design Pass Sequencing](decisions/Design-Pass-Sequencing.md) decision as structural references and
  the pure-black/amber mission-brief system preserved. The screen loads and saves with LM Studio
  offline.
- Verified end-to-end: 106 backend tests, 79 frontend tests, frontend lint and production build, and
  the browser e2e suite. Added a Phase 5 settings scenario that, through the UI, tests the LM Studio
  connection against a stub, selects and saves a model, and creates/deletes/deactivates event types,
  then drives a two-document batch where one document fails and is recovered by retry — the stub
  enhanced to fail a document a set number of times so a single run exercises process → fail → retry
  → success. `app_settings` persistence, event-type state, and document recovery are all confirmed by
  inspecting SQLite. Partial-batch failure, retry, reprocessing confirmation, and already-queued
  conflicts are also covered directly by backend tests. Project Knowledge validation passed.
- With Phase 5 complete, all five MVP phases are implemented and the whole document-to-event workflow
  is proven. The next focus is the deferred aesthetic design pass.

## 2026-07-14 - Fixed a missed coordinate backfill and removed stale assets

- A high-level scan of the project for unused files turned up a real bug: the
  [Local Location Coordinate Resolution](decisions/Local-Location-Coordinate-Resolution.md)
  decision and the Phase 4 plan both call for the migration to run an idempotent coordinate
  backfill, and `backend/app/services/locations.py`'s `backfill_missing_coordinates()` exists and
  is unit-tested, but the actual Phase 4 migration never called it — only `approved_at` was
  backfilled. Confirmed live: 3 of 4 `locations` rows for the same place had `NULL`
  coordinates, and the Dashboard's own "Incomplete location" metric read `1`.
  Added `backend/alembic/versions/0004_coordinate_backfill.py`, which resolves and fills
  coordinates for any location still missing them, so existing local databases (not just this
  one) get fixed on upgrade. Added `test_migration_0004.py` and updated three pre-existing tests
  that hardcoded "0003 is HEAD" (`test_database.py`, `test_migration_0002.py`,
  `test_migration_0003.py`) now that 0004 is head. Verified: 81 backend tests pass, and the live
  database's "Incomplete location" metric dropped to `0` after rebuilding the backend container.
- The same scan found the frontend still shipping the stock `create-next-app` scaffolding:
  `frontend/src/app/favicon.ico` (the generic Next.js icon, still being served live at
  `/favicon.ico` alongside the real logo) and five unreferenced starter SVGs in
  `frontend/public/` (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`). Removed
  all six; `/favicon.ico` now 404s (harmless) and `/icon.svg` (the real Terra Space mark) is the
  only icon served. Verified: frontend lint clean, 66 frontend tests pass.
- Also found, but did not act on without confirmation: `backend;D/` (an empty, untracked,
  oddly-named directory at the repo root, likely a shell-typo artifact), two completed git
  worktrees (`.worktrees/phase-1-foundation`, `.worktrees/phase-4-events-dashboard`), and five
  local branches already merged into `main` (`phase-1-foundation`, `phase-2-documents-processing`,
  `phase-4-events-dashboard`, `phase_3`, `visual-design`).

## 2026-07-14 - Events page revised from owner testing feedback

- The owner manually tested Phase 4's Events page and reported six issues. Investigated each
  against the running app before changing anything:
  - No clear "approved events only" marker — the page eyebrow/intro existed but sat far from
    the actual list. Fixed by adding an "N approved events" count directly above the table and
    strengthening the eyebrow to "Approved intelligence only".
  - Search "not working" — reproduced in the browser and confirmed the filter genuinely works
    (verified it narrows 2 events to 1 to 0). The likely cause: the two seed events share the
    words "depot"/"airstrike", so a broad search didn't visibly change the result count, and
    search only matches title/summary, not the actor/location text also shown in the row. Asked
    the owner whether to broaden search scope to those fields; they chose to keep it to
    title/summary only, so the fix was clarifying the label to "Search title & summary" with a
    matching placeholder instead of changing behavior.
  - Filter bar caused cognitive overload — regrouped the 10 filters into four labelled clusters
    (Search & date, Classification, Location, Source) with left-border dividers, per this
    decision's existing "group, don't stretch" rule. No filters were removed.
  - Sort order and missing table headers — moved Sort order out of the filter form into a new
    toolbar directly above the event list (next to the approved-event count), and added a
    column header row (Title/Status/Type/Date/Location/Sources) matching the row's own grid so
    the table reads clearly. Applied to both the Events page and the Dashboard's embedded
    "Filtered events" panel.
  - No visible source document link — the link existed in the event detail view but had no
    underline and sat low on the page; added an underline and a trailing arrow so it reads as
    unmistakably clickable. Confirmed by clicking it end-to-end to the read-only source page.
  - Confirmed edit already worked as expected; no change needed.
- Found one regression risk while adding the table header: the Dashboard embeds the same event
  list in a narrower panel, and the row's minimum column widths (about 41rem) already exceeded
  that panel's available width. Fixed by making the list panel scroll horizontally as one unit
  (toolbar, header, and rows together) instead of letting flex/grid children compress
  independently, which had briefly squashed the sort control to a single visible character.
- Left a stray test-data artifact in place rather than fixing it live: one `event_types` row
  (id `fa8c879b-...`) has its `name` literally set to another row's UUID, a leftover from an
  earlier verification session, and renders as a raw UUID in the Events table and Dashboard type
  breakdown. A direct database edit to remove it was blocked by the harness as an
  unauthorized live-data change; needs the owner's explicit go-ahead.
- Verified: frontend lint clean, 66 frontend tests passing (2 new, 4 updated for the relabeled
  search field and the table's new required sort props), rebuilt the Docker frontend image, and
  checked the result visually (desktop, the Dashboard's narrower panel, and a 420px mobile
  width) plus an end-to-end click-through from a source link to its document.

## 2026-07-14 - Fixed broken "A" glyph in the brand kit wordmark

- The owner spotted both letter A's in the sidebar wordmark rendering as thin, malformed
  slivers with no crossbar. Traced it to the brand kit's vector conversion: the `A` glyph is
  two paper-thin hairline quadrilaterals, while every other letter (T, E, R, S, P, C) is a
  solid bold fill — a real defect in the kit's SVG, not a rendering quirk, confirmed by reading
  the raw path data.
- Rather than hand-patch a font-conversion bug with no access to the source font, dropped the
  kit's baked-in vector text and went back to rendering `TERRA`/amber `SPACE` as live text in
  the app's own monospace type — which also matches the Visual Design Direction's existing
  typography rule for system chrome more closely than the kit's custom lettering did. Kept only
  the kit's icon (compass ring, cardinal pointers, diamond hub), which has no text and no defect,
  reused for both the sidebar and the favicon.
- Removed the broken `terraspace-compact-dark.svg` from `frontend/public/brand/` (the archived
  original at `brand/terraspace-brand-kit-v3/` is untouched, so the same `A` defect likely
  affects the kit's other text-bearing variants — horizontal, stacked — if pulled in later, e.g.
  for the README).
- Verified: rebuilt the frontend Docker image, screenshotted the corrected sidebar mark, ran
  frontend lint (clean) and the full frontend test suite (64 passed), and confirmed the favicon
  and brand asset routes still serve.

## 2026-07-14 - Official logo replaced with owner-supplied brand kit

- Superseded the earlier hand-drawn placeholder logo with the owner-supplied
  `terraspace-brand-kit-v3` (compass ring, four cardinal pointers, diamond hub, `TERRA`/`SPACE`
  wordmark baked into one vector lockup). Archived the kit verbatim at
  `brand/terraspace-brand-kit-v3/` for its unused sizes, light-theme variants, and source
  templates.
- Found the kit's own color spec (`#DFA750` gold, `#050608` canvas) did not match the already
  locked Visual Design Direction palette (`#f2a93b` amber, `#000000` black), which every existing
  screen already uses. Asked the owner rather than picking silently; they chose to keep the
  existing amber/black tokens and recolor the kit's shapes to match, so the logo has no second
  accent color competing with the rest of the interface.
- Wired only the kit's `-dark` compact and micro variants into the app (recolored), replacing the
  earlier `logo-mark.tsx` component and hand-drawn SVGs, which were deleted. Did not adopt the
  kit's own React/CSS templates, since they introduce a parallel `--ts-*` token system alongside
  the one this decision already defines.
- Verified by rebuilding the frontend Docker image, confirming `/icon.svg` and the brand SVG
  route serve correctly, screenshotting the rendered sidebar mark, running frontend lint (clean,
  including the `next/image` conversion), and running the full frontend test suite (64 passed).

## 2026-07-14 - Official logo mark added

- Added the Terra Space logo: a compass ring with three network nodes converging on an amber
  diamond hub, beside the existing `TERRA`/amber `SPACE` wordmark. Implemented as an inline SVG
  component for the navigation rail, the browser favicon, and a flat lockup file for use outside
  the app. Recorded under the Visual Design Direction decision's Signature components.
- Verified by rebuilding the frontend Docker image, confirming `/icon.svg` serves correctly, and
  screenshotting the running Dashboard to check the sidebar rendering. Frontend lint passed.

## 2026-07-14 - Phase 4 (Events and Dashboard) shipped

- Built and verified approved-event exploration: the Events list supports search, shared filters,
  sorting, detail, source links, and safe editing of approved events. Dashboard summary, map,
  timeline, and list share one URL filter, so every view reports the same approved-event result.
- Added fully local coordinate resolution with stored city/admin1/country precision. Unmatched
  locations remain blank rather than guessed. The offline globe uses local map data and keeps a
  labelled flat-map fallback when globe projection is not available.
- Verified 80 backend tests, 64 frontend tests, frontend lint, the Docker production build, and
  all four browser scenarios. The Phase 4 scenario confirms shared filtering, approved-event
  editing, source reading, coordinate precision, approval timestamps, and that rejected events
  stay out of approved-only endpoints.
- Moved the continuation point to Phase 5 planning: Settings and final MVP verification.

## 2026-07-14 - Phase 4 implementation plan and local coordinate policy prepared

- Wrote the [Phase 4 Implementation Plan](plans/2026-07-14-phase-4-events-dashboard.md), grounded
  in the existing Phase 3 API, schema, frontend placeholders, local PMTiles route, and installed
  MapLibre version. It plans the approved Events list, Dashboard summary, globe map, timeline,
  shared filters, source navigation, approved-event editing, tests, and end-to-end verification.
- Recorded the [Local Location Coordinate Resolution](decisions/Local-Location-Coordinate-Resolution.md)
  decision. Coordinates will be populated only by exact lookup against a checked-in local
  GeoNames-derived gazetteer, with city/admin1/country precision stored explicitly; no runtime
  network geocoding, AI coordinates, fuzzy matching, or guessed pins are allowed.
- Moved the continuation point from writing Phase 4's plan to executing it task by task.

## 2026-07-14 — Phase 3 (Event Review and Deduplication) shipped

- Built and verified the full Phase 3 Implementation Plan on `main`: an events read/write API
  (list, detail, edit, approve, reject, manual add, approve-all); a duplicate-detection
  heuristic (same event type, dates within 3 days, shared actor or location) that only ever
  compares a fresh draft event against already-`approved` events, run automatically after both
  AI extraction and manual add; a duplicate-flag resolution endpoint (keep separate / link and
  merge, the latter moving the merged event's evidence-bearing source onto the matched approved
  event and setting the merged event's own status to `merged` rather than deleting it);
  read-only event-type/actor lookup endpoints exposing AI-suggested rows for the review
  screen's pickers; two new shared design components (`FramedPanel`, `StatusChip`); and the full
  Event Review screen (review bar, evidence-quote-highlighting source panel, an editable event
  card with explicit "unknown"/"not stated" labels, an epistemic-status control, a manual
  add-event form, and a duplicate compare panel).
- Approval is blocked while an event has an unresolved duplicate flag — a rule the Phase 3 plan
  introduced itself (not fixed by any earlier decision document) to enforce "no silent merges"
  at the one point it would otherwise be bypassable.
- End-to-end verification: 71 backend tests, 38 frontend tests, frontend lint and production
  build, and a new Playwright scenario driving four documents through the full review flow
  (approve with suggestion confirmation, reject, keep-separate then approve, and link/merge),
  confirmed against the SQLite database directly since the Events list page is still Phase 4.
  Project Knowledge validation passed with 0 errors and 0 warnings.
- Found and fixed one real regression during verification: the new Event Review page had no
  `<h1>` heading in any of its states, breaking the Phase 1 foundation test that expects every
  nav route to expose a heading matching its label. Fixed by giving the page one persistent
  header above its conditional content.
- Extended the e2e LM Studio HTTP stub to route its canned response by matching a substring of
  the incoming request body against a table of `{match, extraction}` pairs, instead of always
  returning one fixed response — needed so a single test run can drive several documents that
  each require a different structured extraction result.
- Latitude/longitude population was intentionally left out of Phase 3's scope: event locations
  created or edited here carry only `country`/`admin1`/`city_regency`. How coordinates get
  populated for the map view is a decision the Phase 4 plan must make.
- Moved the continuation point to writing the Phase 4 (Events and Dashboard) implementation
  plan.

## 2026-07-14 — Phase 3 implementation plan written

- Wrote the Phase 3 (Event Review and Deduplication) implementation plan in
  `project-knowledge/plans/`, grounded in a direct inspection of the current codebase: confirmed
  `DuplicateFlag` and its migration already existed from Phase 2 (no new migration needed), that
  no events API or shared design-system components existed yet, and that both
  `event-review/page.tsx` and `events/page.tsx` were still placeholders.
- Moved the continuation point to executing this plan.

## 2026-07-14 — Phase 2 (Documents and Batch Processing) shipped

- Built and verified the full Phase 2 Implementation Plan on `phase-2-documents-processing`:
  the Document & Event Data Model migration; document draft CRUD; the Documents page styled
  per the Visual Design Direction, with its design tokens promoted into shared CSS for the
  first time; LM Studio structured extraction with model auto-discovery; evidence-quote
  validation enforcing "never invent"; batch processing orchestration with per-document
  failure isolation and a forward-looking reprocessing-approval warning; and the frontend
  batch-processing UX (status polling, retry, reprocess-confirmation dialog).
- End-to-end verification: 48 backend tests, 18 frontend tests, frontend lint and production
  build, and two Playwright scenarios (LM Studio genuinely offline; a document processed
  against a local LM Studio HTTP stub, with the resulting draft event and its evidence_quote
  confirmed by inspecting the SQLite database directly, since no Events API exists before
  Phase 3). Project Knowledge validation passed with 0 errors and 0 warnings.
- Found and fixed two real environment defects while verifying, unrelated to Phase 2's own
  logic: `backend/docker-entrypoint.sh` had CRLF line endings with no `.gitattributes` to
  prevent it, breaking container startup on a Windows checkout — added `.gitattributes`
  forcing LF for `*.sh`; and the e2e LM Studio stub had to become its own OS process, since
  `spawnSync` (used for the Docker/PowerShell calls in the e2e runner) blocks the whole Node
  event loop for the child process's lifetime and would otherwise freeze an in-process stub.
- Optional image attachment upload was intentionally deferred: it depends on Phase 1's
  still-planned local attachment storage item, which does not exist yet.
- Moved the continuation point to writing the Phase 3 (Event Review and Deduplication)
  implementation plan.

## 2026-07-14 — Phase 2 implementation plan written

- Wrote the Phase 2 (Documents and Batch Processing) implementation plan in
  `project-knowledge/plans/`, scoped to Roadmap Phase 2 only: the full Document & Event Data
  Model migration, document draft CRUD, a Documents page styled per the Visual Design
  Direction, LM Studio structured extraction, evidence-quote validation enforcing "never
  invent," batch orchestration with per-document failure isolation, retry, a forward-looking
  reprocessing-approval warning, and end-to-end verification.
- Moved the continuation point to executing this plan; Phase 3 gets its own plan afterward.

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
