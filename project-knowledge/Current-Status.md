---
type: Project Status
title: terra_space Current Status
description: Current continuation point for Terra Space MVP.
tags: [project-knowledge, status]
status: active
---

# terra_space Current Status

## Current focus

Every Roadmap item across all five phases is now complete, including Phase 1's
"Prepare local attachment storage," which had been deferred since Phase 1 and was just closed
using the
[Local Attachment Storage Implementation Plan](plans/2026-07-14-local-attachment-storage.md). The
next continuation point is the deferred aesthetic design pass described in
[Design Pass Sequencing](decisions/Design-Pass-Sequencing.md); a separate git worktree
(`.claude/worktrees/design-pass`, branch `worktree-design-pass`) has been prepared for that work so
it can proceed without touching this checkout.

## Recent progress

- Executed the
  [Local Attachment Storage Implementation Plan](plans/2026-07-14-local-attachment-storage.md),
  closing the only Roadmap item left open across the whole MVP. The `Attachment` table and
  `data/attachments/` directory already existed from Phase 1, but no attachment route, service, or
  UI existed anywhere in the codebase — confirmed by a repo-wide search before writing the plan.
  Added a storage service that accepts only common image media types (`image/jpeg`, `image/png`,
  `image/gif`, `image/webp`) up to a 10 MB cap, writes files under a server-generated path (never
  the client's filename, avoiding path traversal), and computes a SHA-256 checksum at upload time.
  Added nested `/api/documents/{id}/attachments` routes (upload, file-serving, delete), gated behind
  the same draft/failed edit-lock already used for editing a document's own fields. Fixed a real gap
  found while building this: deleting a document only removed `attachments` rows via the foreign
  key's `ON DELETE CASCADE`, never their files on disk — the SQLAlchemy relationship now cascades
  too, so `delete_document` cleans up every attachment file it owns. Built a thumbnail
  grid/upload/delete UI on the Documents page. Verified with 117 backend tests, 82 frontend tests,
  frontend lint (one pre-existing-pattern `next/image` performance warning, not an error, left as-is
  since these are small dynamic thumbnails from a same-origin backend proxy), a production build,
  and the full e2e suite — which now uploads an attachment, deletes it, uploads a second one, and
  confirms after processing completes that the surviving file's bytes on disk still match its
  stored checksum. Also discovered, while trying to follow this plan's own verification commands,
  that `docker compose run --rm backend/frontend ...` (written into the Phase 4 and Phase 5 plans
  and copied into this one) can never work: both Dockerfiles are multi-stage builds whose final
  image strips out `uv`/dev dependencies (backend) or `node_modules`/test tooling (frontend) —
  verification in every phase, including this one, actually used `docker run` against the `uv` base
  image (backend) and `npm run test/lint/build` directly (frontend) instead.

- Executed the [Phase 5 Implementation Plan](plans/2026-07-14-phase-5-settings-verification.md)
  task by task. Added a persisted single-row `app_settings` table (migration
  `0005_phase5_app_settings`) and made `LmStudioClient` resolve its base URL and preferred model
  from that row on every call, so saving new settings takes effect for the next processing run and
  the health check without restarting containers; the selected model is now honored by extraction
  instead of always using the first discovered model. Added `GET/PATCH /api/settings` (offline-safe
  read, URL validation, model can be cleared to auto-detect) and an
  `POST /api/settings/lm-studio/test` connection test that lists a candidate or saved URL's models
  without mutating stored settings. Added create/rename/activate-deactivate/delete-when-unreferenced
  event-type management (`POST/PATCH/DELETE /api/event-types`, with an `in_use` flag on the list so
  the UI only offers delete for unused types). Built the Settings screen (LM Studio connection panel
  with a live connection test, and an event-type panel), replacing the placeholder, with the
  Tailwind Plus categories from Design Pass Sequencing in mind. Verified with 106 backend tests, 79
  frontend tests, frontend lint, a frontend production build, and the browser e2e suite — which now
  includes a Phase 5 settings scenario that configures LM Studio and manages event types through the
  UI, then drives a two-document batch where one document fails and is recovered by retry (the stub
  fails that document once, then succeeds), with `app_settings`, event-type state, and document
  recovery all confirmed by inspecting SQLite. Partial-batch failure, retry, reprocessing
  confirmation, and already-queued conflicts are also covered directly by backend tests.

- Wrote the [Phase 5 Implementation Plan](plans/2026-07-14-phase-5-settings-verification.md) from a
  direct inspection of the current codebase. The grounding surfaced the key architectural fact that
  shapes the phase: the LM Studio base URL is baked in once at startup (`create_app` builds a single
  `LmStudioClient(settings.lm_studio_url)` from the `TERRA_LM_STUDIO_URL` env var and hands it to the
  processing background tasks and health check), and `_discover_model` always picks `models[0]`, so a
  user's model choice has nowhere to live and is never honored. The plan adds a persisted single-row
  `app_settings` table and makes the client resolve base URL and model from it on every call, so saved
  settings take effect immediately without a restart. It also adds create/rename/activate-deactivate/
  delete-if-unreferenced event-type management (the read-only `GET /api/event-types` already exists and
  types are already `is_active` data), builds the still-placeholder Settings screen with the Tailwind
  Plus categories named in [Design Pass Sequencing](decisions/Design-Pass-Sequencing.md), and closes
  with the final MVP end-to-end and failure-case verification pass (explicitly auditing partial-batch
  failure and retry as the one failure case not clearly covered by existing e2e specs). It fixes
  "required extraction settings" to mean base URL + selected model, with no new generation knobs.

- Did a high-level unused-files scan of the whole project and acted on every finding: added
  migration `0004_coordinate_backfill` after finding the Phase 4 migration never actually called
  the already-written, already-tested `backfill_missing_coordinates()` (confirmed live — 3 of 4
  location rows for one place had `NULL` coordinates; the Dashboard's "Incomplete location"
  metric read `1` and now reads `0`); removed leftover `create-next-app` scaffolding
  (`favicon.ico` still being served over the real logo, five unused starter SVGs); and cleaned up
  repo cruft — an empty stray `backend;D/` folder, the two completed git worktrees
  (`phase-1-foundation`, `phase-4-events-dashboard`), and 5 branches already merged into `main`
  (deleted locally and, for the 2 that were still pushed, on GitHub too). All committed and
  pushed to `main`; 81 backend tests and 66 frontend tests passing.
- Recorded the [Design Pass Sequencing](decisions/Design-Pass-Sequencing.md) decision: defer any
  further aesthetic design pass until after Phase 5, while mapping which Tailwind Plus
  Application UI categories should inform Phase 5's Settings screen and the eventual pass.
- Revised the Events page and Dashboard's embedded event list from the owner's manual testing
  feedback: grouped the filter bar into four labeled clusters, moved Sort order into a toolbar
  above the list with an approved-event count and column headers, clarified the Search field's
  scope, and made the source document link visibly clickable. Also fixed a layout overflow the
  new header exposed in the Dashboard's narrower panel.
- Replaced the placeholder hand-drawn logo with the owner-supplied `terraspace-brand-kit-v3`,
  recolored to the existing amber so it matches the rest of the interface, and fixed a broken
  "A" glyph in the kit's own wordmark by rendering the wordmark as live text instead.
- Executed the [Phase 4 Implementation Plan](plans/2026-07-14-phase-4-events-dashboard.md):
  approved events can now be searched, filtered, sorted, opened, edited, and traced back to their
  read-only source documents. Dashboard summary, globe map, timeline, and event list use the same
  filter URL, so they always describe the same approved-event result. Locations use only the
  checked-in local gazetteer and show their country/admin1/city precision; unmatched locations
  stay blank instead of being guessed. The globe stays local and shows a clear flat-map fallback
  if globe mode is unavailable.
- Verified Phase 4 with 80 backend tests, 64 frontend tests, frontend lint, a Docker production
  build, and all four browser scenarios. The final browser scenario creates approved, rejected,
  date-unknown, and unmatched-location events, checks the shared Dashboard/Events filter, edits
  an approved event, reads its source, and inspects SQLite/API state for coordinates, precision,
  approval time, and approved-only visibility.
- Wrote the [Phase 4 Implementation Plan](plans/2026-07-14-phase-4-events-dashboard.md) from a
  direct inspection of the current codebase. It covers the approved Events list (search, shared
  filters, sorting, detail, source links, and approved-event editing), Dashboard summary, map,
  timeline, and one URL-backed filter contract shared by all four Dashboard views and Events.
  It also records the exact meanings of "new", incomplete date, incomplete location, partial
  date-range matching, and map fallback so implementation has no hidden product choices.
- Resolved Phase 3's deferred coordinate question in the
  [Local Location Coordinate Resolution](decisions/Local-Location-Coordinate-Resolution.md)
  decision: a generated, checked-in GeoNames-based gazetteer performs exact local
  city/admin1/country lookups, saves coordinate precision, never calls a geocoding service at
  runtime, never uses AI-generated coordinates, and leaves ambiguous/unmatched locations blank.
  The plan adds a migration and idempotent backfill for already-saved locations.
- Reconciled a Phase 3 implementation constraint with the Roadmap: approved events are currently
  immutable, but Phase 4 requires approved-event edit support. The plan permits direct approved
  edits while rejected/merged records remain immutable audit history; sources/evidence stay
  read-only and editing does not re-run duplicate detection.

- Executed the [Phase 3 Implementation Plan](plans/2026-07-14-phase-3-event-review-deduplication.md)
  task by task: an events read/write API (list, detail, edit, approve, reject, manual add,
  approve-all); a duplicate-detection heuristic (same event type, dates within 3 days, and a
  shared actor or location) that runs automatically after both AI extraction and manual add,
  comparing only against already-`approved` events; a duplicate-flag resolution endpoint
  supporting keep-separate and link/merge (the merged event's evidence-bearing source moves onto
  the matched approved event, and the merged event's own status becomes `merged`, never
  deleted); read-only `/api/event-types` and `/api/actors` lookups exposing AI-suggested
  (`is_active = false`) rows for the review screen's pickers; two new shared design components
  (`FramedPanel`, `StatusChip`, the latter absorbing `ProcessingStatusBadge`); and the full Event
  Review screen (review bar, source panel with case/whitespace-insensitive evidence-quote
  highlighting, an editable event card with an explicit "Date unknown"/"Not stated" for missing
  facts, a four-segment epistemic-status control, a manual add-event form, and a duplicate
  compare panel offering Keep Separate / Link to This Event). Approval is blocked while an event
  has an unresolved duplicate flag — a rule introduced in the Phase 3 plan, not one of the
  pre-existing decisions, since no earlier document had fixed it.
- Verified end-to-end: 71 backend tests, 38 frontend tests, frontend lint and production build,
  and a new Playwright scenario that creates four documents against a content-routed LM Studio
  stub and drives the full review flow through the browser — approving one event (confirming its
  suggested type and actor flip to `is_active = true`), rejecting another, resolving one
  duplicate flag as "keep separate" then approving that event too, and resolving a second
  duplicate flag as "link" — with the final state (`approved`/`rejected`/`merged` statuses, both
  resolution kinds, and the merged event's evidence quote landing on the approved target)
  confirmed by inspecting the SQLite database directly, since the Events list page is still
  Phase 4. Project Knowledge validation passed with 0 errors and 0 warnings.
- Found and fixed one real regression while verifying: the new Event Review page had no
  `<h1>Event Review</h1>` heading in any of its loading/empty/main states, breaking the Phase 1
  foundation test that expects every nav route to expose a heading matching its label — fixed by
  giving the page a single persistent header above its conditional content, matching the pattern
  already used on the Documents page.
- Extended the e2e LM Studio HTTP stub to route by a substring match against the incoming
  request body (which contains the document's own text) rather than always returning one fixed
  canned response, so a single test run can exercise multiple documents that each need a
  different structured extraction result.
- Wrote the [Phase 3 Implementation Plan](plans/2026-07-14-phase-3-event-review-deduplication.md),
  grounded in a direct inspection of the current codebase rather than assumptions: confirmed
  `DuplicateFlag` and its migration already exist from Phase 2 (no new migration needed), no
  events API or shared design-system components exist yet, and both `event-review/page.tsx` and
  `events/page.tsx` are still placeholders. The plan covers the events read/write API, a
  duplicate-detection heuristic and its resolution (keep separate / link-merge) endpoint,
  event-type/actor lookups, and the Event Review screen per the locked Visual Design Direction.
  It introduces one new rule beyond existing decisions: approval is blocked while an event has a
  pending duplicate flag, to enforce "no silent merges" at the one point it would otherwise be
  bypassable.
- Executed the [Phase 2 Implementation Plan](plans/2026-07-14-phase-2-documents-processing.md)
  task by task: the Document & Event Data Model migration; document draft CRUD; the Documents
  page styled per the Visual Design Direction (design tokens promoted into shared CSS); LM
  Studio structured extraction with model auto-discovery; evidence-quote validation enforcing
  "never invent"; batch processing orchestration with per-document failure isolation and a
  forward-looking reprocessing-approval warning; and the frontend batch-processing UX (polling,
  retry, reprocess-confirmation dialog).
- Verified end-to-end: 48 backend tests, 18 frontend tests, frontend lint and production build,
  and two Playwright scenarios — LM Studio genuinely offline (Documents CRUD still works) and a
  document processed against a local LM Studio stub (confirmed a `draft` event with the correct
  `evidence_quote` by inspecting the SQLite database directly, since no Events API exists yet).
  Project Knowledge validation passed with 0 errors and 0 warnings.
- Fixed two environment issues found during this verification, both real defects rather than
  Phase 2 logic bugs: `backend/docker-entrypoint.sh` had CRLF line endings (breaking container
  startup on a Windows checkout) with no `.gitattributes` to prevent it — added
  `.gitattributes` forcing LF for `*.sh` and fixed the file; and the e2e LM Studio stub server
  had to run as its own OS process rather than in the same Node process that calls
  `spawnSync` for Docker/PowerShell, since `spawnSync` blocks that whole process's event loop
  for the child's lifetime and would otherwise freeze the stub mid-request.
- Optional image attachment upload was intentionally not built in Phase 2: it depends on
  Phase 1's still-planned local attachment storage, which does not exist yet.
- Wrote the Phase 2 (Documents and Batch Processing) implementation plan, scoped to Roadmap
  Phase 2 only, in `project-knowledge/plans/`.
- Designed the Phase 2/3 data model extension and recorded it as the Document & Event Data
  Model decision: document dates, evidence-on-source-link, a persistent duplicate-flags
  table, actor source/target roles, AI-suggestion tracking via `is_active`, and numeric
  latitude/longitude for the map.
- Held the dedicated visual-design session and locked the visual direction: a calm "mission
  brief" tactical look on pure black, with a 3D globe, amber accent, serif source documents,
  and one-thing-at-a-time dense screens. Recorded as the Visual Design Direction decision.
- Validated two screens (Dashboard and Event Review) as concept mockups during the session.
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
- Merged and pushed the completed Phase 1 foundation to `main` (`7fe43a7`).
- Approved the Phase 1 foundation design.
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

- None at this checkpoint.

## Previous next action

- Write the Roadmap Phase 4 (Events and Dashboard) implementation plan: the approved Events
  list with filters/search/sorting, the Dashboard summary, the map view, the timeline view, and
  synchronized filters across all four. The Phase 4 plan must decide how map-view coordinates get
  populated — Phase 3 intentionally left `locations.latitude`/`longitude` unpopulated, since no
  geocoding mechanism has been chosen yet.

## Next actions

- Hold the deferred aesthetic design pass now that the MVP is complete and verified — including
  the local attachment storage item, so the design pass now covers a fully finished product with
  no remaining Roadmap gaps. Re-open both
  [Design Pass Sequencing](decisions/Design-Pass-Sequencing.md) and
  [Visual Design Direction](decisions/Visual-Design-Direction.md) together, and work through the
  Tailwind Plus category mapping recorded in the Design Pass Sequencing decision (Stats, Tables,
  Description Lists, Badges, Alerts, Empty States, Settings Screens, Toggles, Radio Groups, Action
  Panels) as structural references, keeping the pure-black/amber mission-brief system. Keep fixing
  genuine usability defects as they surface in the meantime. A separate git worktree
  (`.claude/worktrees/design-pass`, branch `worktree-design-pass`, branched from this work) is
  already prepared so this pass can proceed in its own checkout.

## Related knowledge

- [Back to Project Knowledge](Project-knowledge-Index.md)
- [Phase 3 Implementation Plan](plans/2026-07-14-phase-3-event-review-deduplication.md)
- [Phase 2 Implementation Plan](plans/2026-07-14-phase-2-documents-processing.md)
- [North Star](North-Star.md)
- [Roadmap](Roadmap.md)
- [Document & Event Data Model](decisions/Document-Event-Data-Model.md)
- [Local-First MVP Decision](decisions/MVP-Local-First-Architecture.md)
- [Visual Design Direction](decisions/Visual-Design-Direction.md)
- [Design Pass Sequencing](decisions/Design-Pass-Sequencing.md)
