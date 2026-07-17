---
type: Project Status
title: terra_space Current Status
description: Current continuation point for Terra Space MVP.
tags: [project-knowledge, status]
status: active
---

# terra_space Current Status

## Current focus

The MVP remains implemented and verified. Five owner-requested follow-up initiatives are now
documented but **not implemented**: a locally hosted Supabase migration, a full reconsideration
of event detection, a re-polish of route-specific UI backgrounds, corrected halo behavior while
globe zoom changes, and hiding nodes on the globe's far side. See the linked plans in the
[Project Knowledge Index](Project-knowledge-Index.md). The Supabase direction preserves the North
Star's local-first boundary; detailed deployment, migration, and rollback choices remain planned
work.

Implemented and verified the
[Event Type Descriptions Implementation Plan](plans/2026-07-16-event-type-descriptions.md). Event
types now carry normalized descriptions through the database and API; new active types and
inactive-to-active transitions require a description, while legacy active blank types remain usable
until deactivated. Local extraction receives active type names and descriptions in deterministic
order, preserves draft descriptions only for newly suggested inactive types, and never overwrites
an existing human definition. Settings manages each name and description together and explains
blocked activation; Event Review add/edit and Events edit show the selected definition while compact
filters and summaries remain name-only.

Fresh verification passed: 143 backend tests; 161 frontend tests across 29 files; clean frontend
lint; and a successful production build. A separate 10-test evidence run named the prompt,
active-only, legacy migration, activation, AI draft, non-overwrite, single-approval, and approve-all
guarantees. The normal containers were rebuilt and checked read-only against the owner's database.
All write-path browser checks used an isolated Compose project and database: creation and returned
definition, legacy deactivation, blank-type blocking, editable inactive AI draft, and definition
hints in Settings, Event Review, and Events all passed. The temporary
`Verification — event type description` type reported `in_use: false`, was deleted with HTTP 204,
and the isolated volume was removed. The normal containers are healthy again; the owner database
contains no type with that verification name. Project Knowledge validation passed with zero errors
and zero warnings. No North Star or Roadmap milestone changed.

## Previous focus

Implemented the
[Globe Rotation Controls Implementation Plan](plans/2026-07-16-globe-rotation-controls.md): a
play/pause button and a speed/direction mini controller for the Dashboard globe's ambient
rotation, requested directly by the owner as a small cinematic touch. Live testing surfaced that
the *pre-existing* ambient rotation (shipped before this session) was not actually working in the
owner's real browser at all — root-caused by grabbing the live MapLibre instance directly out of
the running page (via React fiber internals) and confirming camera animations were getting
permanently stuck. The cause: the pin-halo pulse animation keeps a MapLibre style transition
perpetually in progress (a 1400ms transition retriggered every 1400ms, back to back, forever), and
rotation was gated on MapLibre's `"idle"` event, which only fires when *no* transition is in
progress — so once the halo pulse started, rotation was permanently starved. Fixed by replacing
`"idle"`/`"move"`-based gating with a simple interaction-cooldown timestamp keyed only to direct
user input (`mousedown`/`touchstart`/`dragstart`/`zoomstart`/`keydown` — deliberately not
`"move"`/`"movestart"`, since rotation's own camera movement fires those too, a second related
self-blocking bug). Also switched the rotation mechanism from bearing (`rotateTo`, an in-place
compass spin) to panning the camera's center longitude (revealing new geography, "like the real
Earth" per the owner's own clarification of what "rotation axis" should mean), and — after the
owner reported the now-working rotation looked "patah-patah" (choppy) — replaced the once-a-second
`easeTo` step with a `requestAnimationFrame` loop calling `jumpTo` every frame with a tiny
proportional increment, removing the accelerate/decelerate/stop pattern at each 1-second boundary.
Verified with 152 frontend tests (11 new/updated; the rotation tests rely on Vitest's built-in fake
`requestAnimationFrame` via `vi.advanceTimersByTime`, after an earlier attempt at a custom
`requestAnimationFrame` stub turned out to silently conflict with `vi.useFakeTimers()`'s own rAF
fake), clean lint, and a successful production build after every stage; rebuilt and restarted the
real frontend container after each stage. The automated browser tool used for live diagnosis in
this session reports its tab as `document.visibilityState: "hidden"`, which fully suspends
`requestAnimationFrame` — so the final smoothing stage could be verified via the test suite and
direct state inspection (grabbing the live map instance and confirming `jumpTo` calls/arguments)
but not by watching the tool's own browser pane; final visual confirmation is the owner's own
"great to see the result!!" after checking their real browser. No Roadmap milestone changed; this
was a direct owner feature request, not a Feedback Backlog item.

## Earlier focus

Implemented and deployed a fix for the second still-open root cause behind
"[Event locations do not reliably reach the Dashboard globe](Feedback-Backlog.md)": AI extraction
was not consistently producing `country`/`admin1`/`city_regency` text at all, confirmed live when
the owner's own real document ("US military reimposes naval blockade on Iranian ports...") produced
5-8 draft events with zero locations across two separate manual test runs, despite the source text
plainly describing Iranian ports, Kuwait, Bahrain, and the Strait of Hormuz. Root-caused by reading
the exact request sent to LM Studio: `EXTRACTION_SYSTEM_PROMPT`
(`backend/app/services/lm_studio.py`) never mentioned locations at all, and none of
`ExtractedLocation`'s fields (`backend/app/schemas/extraction.py`) had a `Field(description=...)`,
so the JSON schema sent to the model via structured output (`response_format: json_schema`) was
bare for `locations` — plus a second, independent bug: nothing told the model `country` must be an
ISO 3166-1 alpha-2 code, so even a model that *did* try (writing "Iran" instead of "IR") would
silently fail the gazetteer's exact-match resolver. Fixed in three parts: (1) added an explicit
location-extraction paragraph plus a concrete worked example to `EXTRACTION_SYSTEM_PROMPT`, since a
first pass with only abstract instructions plus schema descriptions still produced zero locations
against the owner's real local model (`qwen/qwen3.5-9b`) — confirmed via `docker exec` that both the
system prompt and the JSON schema (with descriptions) really were reaching the model correctly, so
the abstract instruction alone just wasn't enough for this model and a one-shot example was added as
the next escalation; (2) added `Field(description=...)` to `ExtractedLocation`'s three fields and
`ExtractedEvent.locations`, since structured-output schemas carry this text straight to the model;
(3) added a location-level "never invent" grounding check in `persist_extraction`
(`backend/app/services/extraction.py`) — reusing the existing `quote_found` helper, a location is
now dropped unless at least one of its non-null `admin1`/`city_regency` values is actually present
in that event's own `evidence_quote` (country-only locations are trusted, since an ISO code never
appears literally in prose) — scoped only to AI extraction, not manual add/edit, since raising how
aggressively the model is asked to extract locations also raises the stakes of it inventing a place
name. No change to the locked
[Local Location Coordinate Resolution](decisions/Local-Location-Coordinate-Resolution.md) decision
(still exact-gazetteer-match only). Verified with 127 backend tests (2 fixed pre-existing fixtures
that had ungrounded locations predating the new check, 3 new grounding tests), rebuilt and restarted
the real backend container twice (once per prompt iteration), and had the owner reprocess their real
document between each iteration ("seems good for now" after the second iteration with the worked
example added) — a precise before/after location count was not captured in this session, so full
confirmation is still the owner's to make as they continue reviewing. No Roadmap milestone changed.

## Recent progress

- Implemented and verified the first half of the owner-reported
  "[Event locations do not reliably reach the Dashboard globe](Feedback-Backlog.md)" gap, per the
  [Dashboard Location Visibility Implementation Plan](plans/2026-07-16-dashboard-location-visibility.md):
  pins that share an identical gazetteer coordinate (same city/province/country) now group into one
  numbered cluster marker instead of stacking invisibly, and events whose location never resolved
  to any coordinate are now surfaced as a clickable "Unresolved locations" stat on the Dashboard
  that opens a list of the affected events. Both are frontend-only; the locked
  [Local Location Coordinate Resolution](decisions/Local-Location-Coordinate-Resolution.md)
  decision is unchanged (no fuzzy matching, no manual coordinate override, no invented precision).
  Clustering is done in application code rather than MapLibre's built-in distance-based clustering,
  since co-located pins share the *exact* same coordinate (zooming can never separate them); cluster
  markers render as DOM elements via `maplibregl.Marker` rather than a GeoJSON `symbol` layer, since
  the map style has no configured glyph source and GeoJSON array/object feature properties are
  silently stringified with no decode-side parse. Both the cluster-contents list and the
  unresolved-locations list reuse one new generic `"list"` drawer panel added to
  `LayeredCommandDeck`. `markerCount` ("Markers · N", "Mapped locations") was switched from
  counting GeoJSON features to `countResolvedEventLocations`, so it keeps reflecting the true
  resolved-location count regardless of clustering. Verified with 148 frontend tests across 29
  files, clean lint, and a successful production build. Since the owner's live database had 0
  approved events at the time, full visual confirmation used a separate, fully isolated Docker
  Compose stack (own project name, ports, and scratch database; the real containers and database
  were never touched) seeded with three test events via the API (two sharing one Jakarta
  coordinate, one with an unresolvable location) — this confirmed the cluster marker ("2 events at
  Jakarta, Jakarta, ID"), cluster-click → list → detail flow, the "Unresolved locations · 1" stat
  and its list, and correct "Markers"/"Mapped locations" counts, all end to end in a real browser.
  The isolated stack, its images, and its volume were fully torn down afterward. The owner then
  manually tested the real Dashboard and Event Review themselves, which surfaced the extraction
  root cause fixed in the Previous focus above.
- Implemented and verified the owner-approved
  [Amber Glass Background and Browser Zoom](decisions/Amber-Glass-Background-and-Browser-Zoom.md)
  direction through the complete
  [implementation plan](plans/2026-07-16-amber-glass-background-browser-zoom.md). Terra Space now
  uses five original, route-specific local amber-on-black WebP backgrounds; the shared status bar
  and sidebar use restrained dark glass; Dashboard HUD surfaces use slightly stronger glass; and
  workflow reading/editing surfaces remain nearly opaque. The old blue-gray Dashboard atmosphere
  was removed. The five `1920 x 1080` assets total `306572` bytes (each below `650 KiB`) and
  require no external runtime request. The Dashboard now renders inside one `1664 x 872`
  `CommandDeckViewport` and applies one bounded scale to the complete composition as effective
  browser zoom increases; Documents, Event Review, Events, and Settings continue to reflow
  normally. Verified with 137 frontend tests across 27 test files, lint, a successful production
  build, and the full isolated end-to-end runner (10 Playwright tests plus database verification
  scripts) after repairing its stale pre-required-field selectors and obsolete bind-mounted
  database reset. Browser QA covered 90%, 100%, 110%, 125%, and 150% effective zoom: the 150%
  viewport reported scale `0.8718`, zero horizontal overflow, static background artwork, and a
  `0.00001s` reduced-motion transition. Read-only QA used an isolated copy of the owner's current
  database (1 document, 4 draft events, 0 approved events) and copied attachment, so the owner's
  live database was not changed. No Roadmap milestone changed.
- Fixed the Event Review "Edit" button discoverability gap from the owner's live-testing
  [Feedback Backlog](Feedback-Backlog.md) report ("i want to be able to edit each draft
  intelligence's fields in this menu"). That entry recorded two possible interpretations — a
  discoverability problem versus a request for always-editable inline fields — and needed the
  owner's choice before any code changed; the owner confirmed it was the discoverability problem.
  In `frontend/src/app/event-review/event-card.tsx`, the button is now labeled "Edit fields"
  instead of the bare "Edit", moved to the first position in the action row (ahead of
  Reject/Approve, so the "modify" action reads before the two terminal decisions), and given the
  same amber `btn-primary` accent already used for the equivalent Edit action on the Events detail
  view, instead of blending in with Reject's plain neutral style — the underlying edit form itself
  was already complete and unchanged. No new button color or design-token was introduced. Verified
  with 127 frontend tests, lint, a production build, and a live check against a rebuilt Docker
  frontend image (the running container was a prior build with no source volume mount, so the
  change was invisible until rebuilt) using the owner's real draft events (4 existing drafts):
  confirmed the relabeled, repositioned, accented button reads clearly and still opens the
  existing full-field edit form — read-only, no data changed. The Feedback Backlog entry is marked
  resolved. No Roadmap phase or milestone changed.
- Reduced the Dashboard's pointer-parallax intensity per the owner's live-testing
  [Feedback Backlog](Feedback-Backlog.md) report that the Situation Summary, Recent Signals, and
  Event Register panels moved too much with the mouse pointer. Asked the owner to confirm scope
  first since the locked [Visual Design Direction](decisions/Visual-Design-Direction.md) decision
  explicitly calls for "small pointer parallax" as part of the Dashboard motion signature; the
  owner chose to keep parallax but make it subtler rather than remove it, so no decision update
  was needed. In `frontend/src/app/dashboard/layered-command-deck.tsx`, the pointer-move handler
  now scales travel to a max of 3px horizontal / 2px vertical (previously 8px / 5px) through the
  same shared `--deck-parallax-x`/`--deck-parallax-y` CSS variables every affected panel already
  reads, so all three panels calmed down from one change. Verified with 127 frontend tests (1
  existing test updated to the new bounded values), lint, a production build, and a live check:
  rebuilt the frontend Docker image (the running container was a prior build with no source
  volume mount, so the change was invisible until rebuilt), then drove the real Dashboard at
  `1920 × 1080` with Playwright to confirm the on-page CSS variables now read the smaller bounds
  and that the globe, panels, and dock still render correctly — read-only navigation only, no data
  changed. The Feedback Backlog entry is marked resolved. No Roadmap phase or milestone changed.

- Fixed two items from the owner's live-testing
  [Feedback Backlog](Feedback-Backlog.md): the Documents page's disproportionate top/bottom layout,
  and the Dashboard globe's atmosphere ring staying static and covering the globe when zoomed in.
  On Documents, the "New Document" form panel was hard-capped to a `52rem` width inside a page that
  can be up to `86rem` wide, leaving a large empty area to its right while the Document Queue panel
  below it correctly stretched full width; removed the cap so both panels match, and moved the
  Source URL field into the same row as Document date/Publication date (using an auto-fit grid) so
  the reclaimed width is used instead of sitting empty inside the form. On the Dashboard, the amber
  ring drawn by `.command-deck-globe::after` is a fixed-size decorative overlay sized for the
  resting globe view (zoom `2.2`); it does not track the MapLibre globe's own zoom, so zooming in
  made the enlarged globe surface grow past it and appear covered by a static ring. `WorldMap` now
  tracks the map's zoom level and sets a `--globe-ring-opacity` CSS variable on the ring's container,
  fading the ring out over about two zoom levels past resting so it only shows at the intended
  full-globe view. Verified with 127 frontend tests (2 new/updated, covering the ring's zoom-fade
  behavior and the added `zoom` listener cleanup), lint, a production build, and a live desktop
  browser check at `1920 × 1080` (Documents before/after, Dashboard at rest and after a simulated
  wheel-zoom) against the owner's real local database — read-only navigation only, no data changed.
  Both closed items are marked resolved in the Feedback Backlog; the remaining Dashboard panel
  parallax issue in that same entry is still open, since removing parallax conflicts with the locked
  Visual Design Direction decision and needs owner approval first. No Roadmap phase or milestone
  changed.
- Fixed slow local startup: `Start-TerraSpace.ps1` was taking about 70 seconds because the SQLite
  database lived on the Windows-mounted `data` folder, where Docker Desktop's bind-mount I/O is
  slow for SQLite's frequent small writes. Per the
  [Database Storage Moved to a Docker-Managed Volume](decisions/Database-Storage-Location.md)
  decision, only the database now lives in a Docker-managed volume; `data/maps`,
  `data/attachments`, and `data/logs` are unchanged and still visible in Windows Explorer. Startup
  is now about 8.5 seconds. Added `Backup-TerraSpaceDatabase.ps1` and
  `Restore-TerraSpaceDatabase.ps1` (both verified working) since the database can no longer be
  backed up by just copying the `data` folder, and updated the README's "Backup and restore"
  section accordingly. While verifying, also fixed an unrelated pre-existing bug found along the
  way: the backend health check's hardcoded 2-second internal timeout was too tight for this
  machine's ~2-second normal loopback latency, causing the health check to fail most of the time
  regardless of the database change (confirmed by reproducing the same failure on the unmodified
  prior configuration); both the Dockerfile's `HEALTHCHECK` and `docker-compose.yml`'s override
  were widened. No Roadmap phase or milestone changed.
- Protected event deletion is implemented and verified per the
  [Event Deletion Design](plans/2026-07-15-event-deletion-design.md). Owners can permanently
  delete `draft` and `approved` events either directly from an Events list row or from the Events
  detail view, after an explicit confirmation naming the event; `rejected` and `merged` events
  remain immutable audit history with no Delete control and a `409` from the API. Deletion never
  touches the source document, attachments, actors, locations, event types, or shared source
  records. The target remains the owner's `1920 × 1080` display at `100%` Windows scale, with
  phone/mobile explicitly unsupported. No Roadmap phase or milestone changed.

- Moved Delete from a detail-only control to an inline action in every Events list row (plus
  keeping it in the detail view), after the owner's live testing showed the detail-only placement
  read as "no delete option" from the list. Added an `Actions` column to `EventList` and widened
  its grid (including both responsive breakpoints) to fit a `Delete` button per deletable row;
  `EventsWorkspace` now has one shared `removeEvent(event)` handler used by both the list row and
  the detail panel, so either entry point confirms, calls the same `DELETE` endpoint, updates
  local state, and closes the detail panel only if the deleted event was the one open. Verified
  with a new list-row test plus the full 126-test frontend suite, lint, and a production build; no
  backend change was needed. Visually confirmed in a real browser against mocked event data
  (Delete button per row, correct confirmation copy, row removal, and count update on success).
- Executed the
  [Event Deletion Implementation Plan](plans/2026-07-15-event-deletion-implementation.md)
  test-first: added `DELETE /api/events/{event_id}` (`204` on success, `404` if missing, `409` for
  `rejected`/`merged`) and a `Delete` control on the Events detail view that confirms via a dialog
  naming the event and stating the source document remains, then closes the detail panel and
  refreshes the Events list on success or shows the existing error banner on failure. Fixed a real
  ORM gap found while implementing: `Event.event_sources` and `Event.duplicate_flags` needed
  `cascade="all, delete-orphan"` (matching the existing `Event.event_actors` pattern) for
  `db.delete(event)` to work at all — no migration was needed, since the database's own
  `ON DELETE CASCADE` constraints already matched. Verified with 124 backend tests (13 new), 125
  frontend tests (4 new), clean lint, a production build, Project Knowledge validation, and a clean
  `git diff --check`.

- Added a configurable per-document LM Studio processing timeout after the owner's live testing
  exposed the previous fixed two-minute limit. The Settings screen now offers 2, 5 (default and
  recommended), or 10 minutes; the chosen value is saved locally in `app_settings` and used by
  the very next extraction without a restart. The backend still fails only the affected document
  and preserves the existing Retry flow if LM Studio does not respond. Migration
  `0006_lm_studio_timeout` supplies the five-minute default for existing local databases.
  Verified with 119 backend tests, 121 frontend tests, frontend lint, and a production build.

- Completed all five checkpoints in the
  [Layered Command Deck Motion Implementation Plan](plans/2026-07-15-layered-command-deck-motion-implementation.md).
  The final isolated workbench contained 9 documents, 6 approved events, 2 drafts, 1 rejected
  event, 8 mapped locations, 1 pending duplicate, and 2 attachments. Real-browser checks covered
  all five populated screens, Dashboard at `1920 × 930` and `1920 × 900`, normal and reduced-motion
  behavior, and the full interaction set. Final verification passed: 120 frontend tests in 25
  files, lint, production build, `git diff --check`, and Project Knowledge validation. The
  isolated Docker volume, stub, frontend process, QA browsers, and temporary artifacts were removed.

- Wrote and self-reviewed the
  [Layered Command Deck Motion Implementation Plan](plans/2026-07-15-layered-command-deck-motion-implementation.md)
  as five locally committed checkpoints. It uses focused tests and one commit per checkpoint to
  keep progress observable and credit use controlled. An isolated nine-document workbench is
  populated through the real LM Studio extraction flow before Dashboard layout work begins, then
  remains available for visual judgment through the final `1920 × 930`/`1920 × 900` browser pass;
  the owner's normal database is never mounted or changed.

- Completed the motion-design session and high-fidelity comparison. The owner initially chose the
  Orbital HUD, found its rendered cockpit-like density excessive, and approved the calmer Layered
  Command Deck: a viewport-height Dashboard with a 65–70% globe; a three-metric Situation Summary
  at the far left; three-row Recent Signals at the far right; one slim Event Register/Filters dock;
  three subtle CSS 3D depth planes with only 3–5° tilt; limited parallax and connector emphasis;
  lighter motion on Documents, Event Review, Events, and Settings; reduced-motion behavior; and
  browser QA at `1920 × 930` plus `1920 × 900`. The refinement stays within the pure-black/amber
  mission-brief language and adds no phone/mobile target.

- Completed the implementation half of the deferred aesthetic pass across Dashboard, Documents,
  Event Review, Events, and Settings. Added one shared page-header pattern and permanent status
  bar; compressed the shared Dashboard/Events filter into search plus expandable advanced
  controls; brightened muted text; tightened hierarchy, spacing, and action grouping; and polished
  populated tables, facts, attachments, duplicate review, and real globe pins without introducing
  a second styling system. Created an isolated realistic sample database with nine documents and
  mixed event types, epistemic/review states, dates, locations, duplicate states, and attachments,
  then inspected every changed screen in a real desktop browser. Verified 100 frontend tests
  across 22 files, clean lint, and a successful production build.

- Fixed the four prioritized usability defects from the
  [Design Pass Audit](plans/2026-07-15-design-pass-audit.md): replaced the internal "Phase 2" /
  "Phase 3" roadmap labels on Documents and Event Review with real eyebrow text ("Source intake",
  "Extraction queue"); gave Event Review's dead-end empty state a framed orientation message and a
  button to Documents; taught the shared `EventList`/`EventTimeline` components to distinguish "no
  approved events exist yet" (with a link to Event Review) from "filters excluded everything"
  (kept message plus a Clear filters action) on Dashboard and Events; and titled the Documents
  queue panel with its own empty state, plus fixed disabled primary buttons fading to
  near-invisible by switching `.btn:disabled` from the unused `--text-dim` token to the already-used
  `--text-muted` token (removing `--text-dim` as dead CSS). Verified with 88 frontend tests (6 new),
  lint, a production build, and a live browser check of all four affected screens in both the
  "no data" and "filters active" empty-state branches.

- Ran the audit half of the deferred design pass as a read-only review (no code changed): the
  app was started from the `design-pass` worktree, all five screens were captured as full-page
  and viewport screenshots, and each was evaluated against the locked
  [Visual Design Direction](decisions/Visual-Design-Direction.md) and the Tailwind Plus category
  map in [Design Pass Sequencing](decisions/Design-Pass-Sequencing.md). Findings are recorded in
  the [Design Pass Audit](plans/2026-07-15-design-pass-audit.md): four usability defects
  (visible "PHASE 2"/"PHASE 3" roadmap labels on Documents and Event Review, a dead-end Event
  Review empty state, a misleading "No events match these filters" message shown on an empty
  database, and an unlabeled Documents queue panel with near-invisible disabled buttons), plus
  prioritized polish items led by compressing the shared Dashboard/Events filter block so the
  globe is visible without scrolling. Caveat recorded in the audit: all screenshots were of an
  empty database, so the populated views (review card, events table, facts grid, globe pins,
  attachment thumbnails) still need a follow-up capture with sample data before or during the
  implementation half.
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

- Confirm with the owner, with an actual before/after location count, whether the improved
  extraction prompt reliably populates locations across more than one document — only one real
  document has been reprocessed against it so far ("seems good for now", not yet precisely
  measured). If gaps remain, consider whether they're prompt-following limits of the current local
  model (`qwen/qwen3.5-9b`) rather than something further prompt changes can fix.
- Once approved events with resolved locations exist in the owner's live database again, do a
  direct visual check of the cluster marker and "Unresolved locations" list against real data (the
  only confirmation so far used an isolated, fully torn-down test stack, not the live database).
- Review the completed desktop experience at the target resolution when the owner is ready.

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
- [Layered Command Deck and Motion Design](plans/2026-07-15-layered-command-deck-motion-design.md)
- [Dashboard Location Visibility Implementation Plan](plans/2026-07-16-dashboard-location-visibility.md)
- [Extraction Location Prompt Implementation Plan](plans/2026-07-16-extraction-location-prompt.md)
- [Globe Rotation Controls Implementation Plan](plans/2026-07-16-globe-rotation-controls.md)
- [Local Location Coordinate Resolution](decisions/Local-Location-Coordinate-Resolution.md)
