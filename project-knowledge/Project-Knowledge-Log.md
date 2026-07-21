---
type: Update Log
title: Project Knowledge Log
description: Chronological record of meaningful changes to the Project Knowledge bundle.
tags: [project-knowledge, history]
status: active
---

# Project Knowledge Log

## 2026-07-21 - Route backgrounds re-polished (Deferred UI Polish Plan, Scope 1)

- Implemented Scope 1 of the
  [Deferred UI Polish Plan](plans/2026-07-17-ui-polish-deferred.md) (now `in-progress`; Scope 2,
  the Settings layout, still open). The owner reviewed a before/after artifact of all six route
  backgrounds, chose a full re-polish, and the six were regenerated from one shared procedurally
  drawn HUD/orrery vocabulary (a local canvas generator — no external image requests), fixing the
  two inconsistencies the review surfaced (Sense's off-family nebula; Settings being the busiest
  asset) while giving each route a distinct purpose-fit motif and keeping the centre clear for
  content; the set also shrank 308 KB → ~205 KB. Two owner tweaks followed: the Dashboard's
  round/spiral corner clusters were replaced with angular HUD framing, and two non-destructive
  layers were added and tuned live with the owner — a subtle CSS background blur (1px) and a
  reduced-motion-aware "animus"-style ambient canvas (drifting amber motes + a slow reconstruction
  scan) in `frontend/src/components/workspace-ambiance.tsx`. Verified with 206 frontend tests,
  lint, a production build, and a live read-only browser pass (all routes + a 150% zoom check);
  deployed to the owner's live frontend container. Committed locally at the owner's request and
  **not pushed**. Follow-up the owner asked for and not yet built: expose the blur/motion as a
  user-facing "Appearance" setting (recommended as a per-device localStorage preference), which
  would also advance Scope 2.

## 2026-07-21 - Staged Event Detection Pipeline plan closed out

- Closed out the last open items of the
  [Staged Event Detection Pipeline Implementation Plan](plans/2026-07-20-staged-event-detection-pipeline.md)
  (now `status: completed`). Its migrations had already reached the live database via an ordinary
  container restart rather than the plan's own deliberate backup-then-migrate Task 8 sequence
  (discovered and verified intact in the prior session); what remained was a live, read-only
  browser check of the three new UI pieces and documentation closeout. Confirmed, against the
  owner's real running containers (`docker compose up -d`, no rebuild, no data touched) and real
  data: the Event Review "extraction incomplete" note renders correctly on a genuinely incomplete
  draft event; the Documents "Extraction log" view renders real per-stage, per-candidate log
  entries; and the Actors workspace matches the owner's own earlier screenshot. Also found and
  recorded a new, more specific lead for the still-open
  [location-reliability investigation](Feedback-Backlog.md#event-locations-do-not-reliably-reach-the-dashboard-globe-2026-07-16):
  the extraction log showed two candidates failing every classifier stage with "LM Studio returned
  HTTP 400," rather than the sometimes-zero-locations symptom recorded before — pointing at a
  possible request-construction issue for specific candidate content rather than only generic model
  non-determinism. The owner did not recall what restarted their containers, so that remains
  unconfirmed. No code changed this session.

## 2026-07-20 - Staged Event Detection Pipeline decision approved and planned

- The owner asked to redesign event detection, sharing their own staged "SMC" (Signal, Mechanism,
  Context) detection framework as inspiration. After a brainstorming session (visual pipeline
  diagrams reviewed and iterated by the owner), recorded the approved
  [Staged Event Detection Pipeline](decisions/Staged-Event-Detection-Pipeline.md) decision: the
  single LM Studio extraction call is replaced with a Signal Parser call plus four narrow
  per-candidate classifiers (Event Type, Date, Locations, Actors with separate source/recipient
  lists), keeping the existing deterministic resolution stage. Locked choices: ISO 3166-1 alpha-3
  country codes (replacing alpha-2, with gazetteer regeneration and data migration), owner-managed
  actor aliases plus a first actor-management workspace, a per-stage extraction log, per-attribute
  failure tolerance ("extraction incomplete" instead of whole-document failure), per-call timeout
  semantics, and Mechanism/Context deferred as a future classifier slot. Wrote the matching
  [implementation plan](plans/2026-07-20-staged-event-detection-pipeline.md) (8 checkpointed,
  test-first tasks, written to be executable by a fresh session). This effectively delivers what
  the superseded Event Detection Reconsideration Plan once asked for. No code changed yet.

## 2026-07-19 - UI Background Re-polish and Settings UI/UX Polish plans merged

- At the owner's request ("merge point 4 & 5, since its the same"), merged
  [UI Background Re-polish](plans/2026-07-17-ui-background-repolish.md) and
  [Settings UI and UX Polish](plans/2026-07-17-settings-ui-ux-polish.md) into one new
  [Deferred UI Polish Plan (Backgrounds and Settings)](plans/2026-07-17-ui-polish-deferred.md),
  since both were the same kind of item: a deferred visual/UX polish pass shown to the owner once as
  a concrete review artifact and put off without a direction ("nanti saja" for each). The two
  original plans are marked `status: superseded` with their content preserved and a pointer to the
  merged plan, rather than deleted. Updated the Project Knowledge Index, and both places in Current
  Status that referenced the two separate plans, to point at the merged plan instead. No code
  changed; the actual scope of the two original plans is unchanged, only their tracking is combined.

## 2026-07-19 - Event Detection Reconsideration Plan scrapped

- At the owner's explicit request ("scrap point number 7 ... since its should had been done"),
  marked the [Event Detection Reconsideration Plan](plans/2026-07-17-event-detection-reconsideration.md)
  `status: superseded` instead of deleting it. Its own investigation questions were effectively
  already answered by separate completed work: the extraction location prompt and document
  metadata context fixes, the Event Type Descriptions and Closed Event Type Taxonomy decisions, and
  the Event Taxonomy Tree. Removed it from the Project Knowledge Index's active reading list and
  from Current Status's list of not-yet-started initiatives (now just the Local Supabase Migration).
  No diagram or baseline measurement set was ever produced under this plan, so this is a scope call,
  not a literal completion of every original deliverable.

## 2026-07-19 - Globe fixes shipped, repository tidied to a single `main` branch

- Fixed [Globe Halo Zoom Behavior](plans/2026-07-17-globe-halo-zoom-behavior.md) (symmetric fade
  zooming in or out from rest, not just zoom-in) and
  [Globe Backside Node Visibility](plans/2026-07-17-globe-backside-node-visibility.md) (pins and
  clusters on the far side of the globe now hidden via a self-built spherical-geometry check, after
  finding MapLibre's own occlusion API does not work in this app's setup). Verified with 190
  frontend tests, clean lint, and a successful build; deployed to the owner's live containers.
  Neither has been visually confirmed by the owner in their real browser yet (see
  [Current Status](Current-Status.md) for why — no approved events with locations exist right now).
- Prepared and showed the owner a side-by-side review artifact for the two remaining backlog items
  ([UI Background Re-polish](plans/2026-07-17-ui-background-repolish.md) and
  [Settings UI and UX Polish](plans/2026-07-17-settings-ui-ux-polish.md)): all six current route
  backgrounds together, and a current-vs-proposed Settings mockup. The owner deferred both without
  giving a direction ("nanti saja") — both plans remain `status: planned` with no code changed.
- Fixed two stale Project Knowledge records found while investigating what to work on next: the
  [Terra Insight and Terra Sense Organization](plans/2026-07-18-terra-insight-terra-sense-organization.md)
  plan was still marked `planned` despite being fully implemented and shipped, and `Roadmap.md`'s
  "Deferred Beyond MVP" list still named hierarchical taxonomy as deferred despite the Event
  Taxonomy Tree now being in the MVP.
- At the owner's explicit request ("saya ingin rapi"), tidied the repository: committed the globe
  fixes plus the Event Taxonomy Tree work (previous entry below) as two commits on
  `terra-insight-sense`, fast-forward merged that branch into `main` (clean, no conflicts), pushed
  `main` to GitHub, then deleted `terra-insight-sense` on both GitHub and locally. The repository
  now has only `main` and the pre-existing `Terra-Space-V1-backup` branch.

## 2026-07-19 - Event Taxonomy tree delivered and applied to the live database

- Completed the [Event Taxonomy Tree Implementation Plan](plans/2026-07-19-event-taxonomy-tree.md):
  reviewed and confirmed the Task 3 approval guard (fixing 6 unrelated stale test regressions found
  by a full-suite run), built and verified the Task 4 tree-plus-inspector UI (finding and fixing a
  real pre-existing bug where the Events approved-event editor sent a type's id instead of its name),
  then ran Task 5's backup and live migration.
- Task 5 uncovered a pre-existing issue not caused by this session: the live database already held
  an incomplete, unrecorded partial application of this same migration (an empty `taxonomy_nodes`
  table with `alembic_version` still at `0008`) from an earlier, untracked attempt. Fixed by safely
  dropping the empty table, then re-verified and re-applied the migration cleanly. See
  [Current Status](Current-Status.md) for full detail, backup path, and verification counts.
- The owner's live database is now on revision `0009_event_taxonomy_tree` with the full 33-node
  approved tree; no event, event type, or document data was altered. None of this work (Tasks 1–5)
  is committed to git yet — the owner has not asked for a commit.

## 2026-07-19 - Event Taxonomy backend paused before UI and deployment

- Began the approved [Event Taxonomy Tree Implementation Plan](plans/2026-07-19-event-taxonomy-tree.md)
  in the owner-approved shared dirty workspace. No commit, Docker rebuild, live Alembic migration,
  UI change, or owner-data write was performed.
- Added the uncommitted `0009_event_taxonomy_tree` migration and taxonomy model. It uses a
  validate-before-write sequence, preserves data on rejected preconditions, creates/links the
  twelve approved leaves, handles absent/draft/non-draft Airstrike safely, and has 9 passing
  isolated migration tests.
- Added the uncommitted taxonomy API and closed-taxonomy guards. Focused API work reached 21
  passing tests; focused local-AI work reached 43 passing tests and the later path regression set
  reached 21 passing tests. Legacy direct creation is blocked, only full active leaves reach local
  AI, and malformed outputs remain untyped.
- Paused at the explicit owner request before starting the selected calm tree-plus-inspector UI.
  The first required continuation check is the uncommitted approval guard in
  `backend/app/services/events.py`: rerun focused approval tests and independently review that
  inactive or incomplete-path types cannot be approved. See [Current Status](Current-Status.md).

## 2026-07-19 - Event taxonomy tree direction approved

- The owner approved a real four-level `Domain → Category → Subcategory → Event Type` taxonomy
  tree for Terra Sense, with only Event Type leaves assignable to events or local AI.
- The approved delivery replaces the cluttered flat Event Type list with a calm tree-plus-inspector
  workspace. It permits controlled node management but excludes drag-and-drop and free workflow
  editing.
- The twelve approved global IR Event Types will move into the new tree. The legacy `Airstrike`
  Event Type will be removed safely: affected draft events remain and become untyped for review.
- This direction brings hierarchical taxonomy management into the MVP while preserving the
  closed-taxonomy rule. See [Event Taxonomy Tree and Management](decisions/Event-Taxonomy-Tree-and-Management.md).
- Added the test-first [Event Taxonomy Tree Implementation Plan](plans/2026-07-19-event-taxonomy-tree.md).
  It covers the safe database migration, 12-leaf seed tree, Airstrike handling, closed local-AI
  path context, calm tree-plus-inspector UI, and owner-data backup/verification sequence.

- Completed the approved [Single Source Date and Event Date Implementation Plan](plans/2026-07-18-single-source-date-event-date.md).
  Document intake now has one required, non-blank Publication Date, defined as the date the source
  document was made. Events now have one optional Event Date and precision rather than a start/end
  range. The local AI receives Publication Date only as source context and may not infer Event Date
  from it without supporting source content and evidence.
- Added a migration safety regression covering a full linked SQLite graph with foreign keys enabled.
  The migration preserves and restores source links, attachments, event-source evidence, actor and
  location links, and duplicate flags while SQLite rebuilds the affected parent tables. It checks
  foreign-key integrity after upgrade and downgrade. After creating a consistent backup, the live
  database was migrated to `0008_single_source_event_date`; read-only counts and
  `PRAGMA foreign_key_check` confirmed that relationships remain intact.

## 2026-07-18 - Document metadata added to local AI extraction context

- LM Studio extraction now receives the source title, document date, publication date when present,
  and source content as labelled context. The prompt expressly keeps source dates from becoming
  event dates unless the document evidence supports them.
- A missing publication date is represented as `Not provided`; no owner data was changed during
  verification. The [implementation plan](plans/2026-07-18-document-metadata-extraction-context.md)
  is complete. Backend verification passed with 141 tests; frontend lint and the production build
  also passed.

## 2026-07-18 - Closed Event Type taxonomy implemented pending isolated browser verification

- LM Studio extraction now accepts only an exact active Event Type name or `null`. Unknown and
  inactive names are saved as untyped drafts; extraction never creates or describes an Event Type.
- Event Review now makes an untyped event clear, limits manual assignment to active owner-managed
  types, and removes Event Type suggestion wording from the relevant interface.
- Verified with 139 backend tests, 177 frontend tests, frontend lint, and a production build. A
  focused Playwright scenario is present and syntax-checked but remains unrun because the current
  runner resets Docker data; it must be isolated before browser execution. See the
  [implementation plan](plans/2026-07-18-closed-event-type-taxonomy.md).

## 2026-07-18 - Initial global IR event type names shortened

- Renamed the twelve active event types into concise English titles for consistent use in the
  English interface and compact filters. Their descriptions, active state, and taxonomy meaning
  did not change.

## 2026-07-18 - Initial global IR event types configured

- Created the twelve active Event Types from the approved [Initial Global IR Event Types
  Configuration Plan](plans/2026-07-18-initial-global-ir-event-types.md), each with an AI guidance
  description.
- Kept the existing suggested `Airstrike` type because it is already used by a draft event. The
  local API reported 13 total types and 12 active approved taxonomy types after configuration.

## 2026-07-18 - Initial global IR event taxonomy decided

- The owner selected a concise, domain-first initial taxonomy for global monitoring: Security &
  Conflict, Diplomacy, and Economy & Energy, with four event types under each domain.
- Signals such as official statements and threats are recorded separately from later material
  actions. Existing flat Event Type storage remains in place for the first delivery.

## 2026-07-18 - Terra Insight and Terra Sense implementation plan prepared

- Added the [Terra Insight and Terra Sense Organization Implementation Plan](plans/2026-07-18-terra-insight-terra-sense-organization.md), based on the current navigation, routes, document
  statuses, event review statuses, and local API contracts.
- The proposed first delivery keeps existing routes, adds a read-only `/sense` flow monitor, groups
  navigation into Terra Insight, Terra Sense, and Settings, and moves Event Type management into
  Terra Sense. It excludes external automatic ingestion, a second app, and a workflow editor.
- No application code, route, UI, database, roadmap milestone, or North Star statement changed.

## 2026-07-18 - Terra Insight and Terra Sense product organization approved

- The owner clarified that Terra Space should focus on presenting and analysing trusted data. The
  approved [product organization decision](decisions/Terra-Insight-and-Terra-Sense-Product-Organization.md)
  establishes Terra Insight for analysis and Terra Sense for source intake, local AI processing,
  pipeline visibility, duplicate checks, and Event Review.
- Updated the North Star and Roadmap to reflect the approved direction. No application code,
  database, deployed-service boundary, or automatic external ingestion capability changed.

## 2026-07-17 - Settings UI and UX polish planned

- Added the [Settings UI and UX Polish Plan](plans/2026-07-17-settings-ui-ux-polish.md) after the
  owner reported that the current screen exposes too much at once. The future design will put
  everyday actions first and progressively disclose advanced technical controls, without removing
  access to existing settings or changing any setting silently.
- No application code, database, roadmap milestone, or North Star statement changed.

## 2026-07-17 - Five owner-requested follow-up initiatives documented

- Recorded five planned follow-ups: a [local Supabase migration](plans/2026-07-17-local-supabase-migration.md),
  [event-detection reconsideration](plans/2026-07-17-event-detection-reconsideration.md),
  [UI background re-polish](plans/2026-07-17-ui-background-repolish.md),
  [globe halo zoom behavior](plans/2026-07-17-globe-halo-zoom-behavior.md), and
  [far-side globe-node visibility](plans/2026-07-17-globe-backside-node-visibility.md).
- Added the active [Local Supabase Storage Direction](decisions/Local-Supabase-Storage-Direction.md):
  Supabase must be hosted locally, existing SQLite data remains untouched until a tested migration
  and rollback plan are accepted, and no cloud or multi-user capability is implied.
- No application code, database, roadmap milestone, or North Star statement changed.

## 2026-07-17 - Event type descriptions implemented and verified

- Completed the
  [Event Type Descriptions Implementation Plan](plans/2026-07-16-event-type-descriptions.md):
  descriptions now flow through storage, APIs, Settings, review/edit guidance, and local LM Studio
  classification without allowing AI output to overwrite an existing definition.
- Preserved safe legacy behavior: an already-active blank type remains usable until deactivated,
  while new activation, single approval, and approve-all cannot activate an inactive blank type.
- Verified 143 backend tests, 161 frontend tests across 29 files, clean lint, a successful production
  build, and a focused 10-test prompt/activation evidence set. Browser write checks ran in a fully
  isolated Compose database; the temporary type was confirmed unused, deleted, and the isolated
  volume removed before the healthy normal containers were restored. Project Knowledge validation
  passed with zero errors and zero warnings. No Roadmap milestone changed.

## 2026-07-16 - Event type descriptions and AI classification direction approved

- The owner chose the integrated solution for the remaining Event Types backlog item: every type
  can carry a human-readable description, and active types require one while existing active
  records receive a safe migration exception.
- LM Studio will receive existing active type names and descriptions first, prefer a matching
  existing definition, and only then propose a new inactive type with a draft description. AI
  output cannot overwrite human-authored definitions.
- Settings will manage names and descriptions together, while Event Review and Events editing will
  show the selected definition beneath the type control. See
  [Event Type Descriptions and AI Classification](decisions/Event-Type-Descriptions-and-AI-Classification.md).
- Prepared the test-first
  [Event Type Descriptions Implementation Plan](plans/2026-07-16-event-type-descriptions.md), split
  into independently verifiable database/API, extraction persistence, LM Studio prompt, Settings,
  selection guidance, and end-to-end completion tasks.

## 2026-07-16 - Globe rotation play/pause, speed/axis controller, and a real stall bug fixed

- The owner asked for a play/pause button on the Dashboard globe, then a mini controller to adjust
  rotation speed and axis, as a small cinematic touch — a direct feature request, not a Feedback
  Backlog item. See the
  [Globe Rotation Controls Implementation Plan](plans/2026-07-16-globe-rotation-controls.md).
- Live testing surfaced that the ambient rotation shipped before this session was not actually
  working in the owner's real browser at all. Root-caused by grabbing the live MapLibre instance
  directly out of the running page (via React fiber internals, since the map isn't otherwise
  exposed) and confirming camera animations were getting permanently stuck. Cause: the pin-halo
  pulse animation keeps a MapLibre style transition perpetually in progress (a 1400ms transition
  retriggered every 1400ms, back to back, forever), and rotation was gated on MapLibre's `"idle"`
  event, which only fires when no transition is in progress — so once the halo pulse started,
  rotation was permanently starved. Fixed by replacing `"idle"`/`"move"`-based gating with a simple
  interaction-cooldown timestamp keyed only to direct user input, deliberately excluding `"move"`/
  `"movestart"` since rotation's own camera movement fires those too (a second, related
  self-blocking bug).
- Switched the rotation mechanism from bearing (`rotateTo`, an in-place compass spin) to panning
  the camera's center longitude, after the owner clarified "rotation axis" should mean spinning
  like the real Earth (revealing new geography) rather than the original in-place spin. After the
  owner reported the now-working rotation looked "patah-patah" (choppy), replaced the
  once-a-second `easeTo` step with a `requestAnimationFrame` loop calling `jumpTo` every frame with
  a tiny proportional increment, removing the accelerate/decelerate/stop pattern at each 1-second
  boundary — the standard technique for continuous camera motion.
- Verified with 152 frontend tests (11 new/updated across the four stages; the rotation tests rely
  on Vitest's built-in fake `requestAnimationFrame` via `vi.advanceTimersByTime`, after an earlier
  attempt at a custom `requestAnimationFrame` stub turned out to silently conflict with
  `vi.useFakeTimers()`'s own rAF fake), clean lint, and a successful production build after every
  stage; rebuilt and restarted the real frontend container each time. Final visual confirmation is
  the owner's own report after checking their real browser each stage, ending with "great to see
  the result!!" No Roadmap milestone changed.

## 2026-07-16 - Extraction prompt strengthened for location reliability

- Fixed the second still-open root cause behind
  "[Event locations do not reliably reach the Dashboard globe](Feedback-Backlog.md)" via the
  [Extraction Location Prompt Implementation Plan](plans/2026-07-16-extraction-location-prompt.md).
  Root-caused live: the owner's real "US military reimposes naval blockade on Iranian ports..."
  document produced draft events with zero locations across two manual test runs, despite the text
  plainly describing Iranian ports, Kuwait, Bahrain, and the Strait of Hormuz. Reading the exact
  request sent to LM Studio confirmed why: `EXTRACTION_SYSTEM_PROMPT`
  (`backend/app/services/lm_studio.py`) never mentioned locations at all, and `ExtractedLocation`'s
  fields (`backend/app/schemas/extraction.py`) had no `Field(description=...)`, so the JSON schema
  sent via structured output (`response_format: json_schema`) was bare for `locations` — plus a
  second, independent bug: nothing told the model `country` must be an ISO 3166-1 alpha-2 code, so
  even a model that did try would silently fail the gazetteer's exact-match resolver.
- Fixed in two prompt iterations: the first added explicit location-extraction instructions to the
  system prompt plus schema field descriptions, but a `docker exec` check confirmed both really
  were reaching the model correctly and the owner's reprocessed document still came back with zero
  locations — the abstract instruction alone wasn't enough for the owner's local model
  (`qwen/qwen3.5-9b`). The second iteration added a concrete worked example (a sample sentence and
  its expected `locations` output) to the system prompt, a well-established technique for smaller
  local models that abstract instructions alone often fail to induce compliance from.
- Paired the prompt change with a new location-level "never invent" grounding check in
  `persist_extraction` (`backend/app/services/extraction.py`), since asking the model to extract
  more aggressively raises the stakes of it inventing a place name: a location is now dropped
  unless at least one of its non-null `admin1`/`city_regency` values is found in that event's own
  `evidence_quote` (reusing the existing `quote_found` helper); country-only locations are trusted
  without grounding, since an ISO code never appears literally in prose. Scoped only to AI
  extraction, not manual add/edit. No change to the locked
  [Local Location Coordinate Resolution](decisions/Local-Location-Coordinate-Resolution.md)
  decision.
- Verified with 127 backend tests (fixed two pre-existing fixtures whose locations predated the new
  grounding check and would otherwise have started failing; added three new grounding tests),
  rebuilt and restarted the real backend container after each iteration, and had the owner reject
  the stale drafts and reprocess their real document themselves each time. The owner reported
  "seems good for now" after the second iteration, but a precise before/after location count across
  more than one document was not captured in this session — recorded as an open follow-up in
  [Current Status](Current-Status.md). Updated the
  [Feedback Backlog](Feedback-Backlog.md) entry accordingly. No Roadmap milestone changed.

## 2026-07-16 - Dashboard cluster markers and unresolved-locations list shipped

- Implemented the visibility half of
  "[Event locations do not reliably reach the Dashboard globe](Feedback-Backlog.md)" via the
  [Dashboard Location Visibility Implementation Plan](plans/2026-07-16-dashboard-location-visibility.md).
  The owner had also separately noticed, while testing the previous session's amber-glass/zoom
  work, that events sharing an identical gazetteer coordinate (same city/province/country) stack
  pixel-for-pixel on one invisible pin, since the resolver returns one fixed point per place name.
- Grouped co-located pins into one numbered `maplibregl.Marker` DOM element per shared coordinate
  (not MapLibre's built-in distance-based clustering, since identical coordinates can never be
  separated by zooming, and not a GeoJSON `symbol` layer, since the map style has no configured
  glyph source and GeoJSON array/object feature properties are silently stringified with no
  decode-side parse). Clicking a cluster or the new "Unresolved locations" Dashboard stat both open
  one new generic `"list"` drawer panel added to `LayeredCommandDeck`, reusing the existing
  detail-panel interaction language rather than introducing a floating popup (no prior precedent in
  this codebase). `markerCount` was switched from counting GeoJSON features to
  `countResolvedEventLocations`, so clustering can no longer silently shrink the "Markers · N" /
  "Mapped locations" figures. Entirely frontend; no change to the locked
  [Local Location Coordinate Resolution](decisions/Local-Location-Coordinate-Resolution.md)
  decision.
- Verified with 148 frontend tests across 29 files (11 new/updated), clean lint, and a production
  build. Since the owner's live database had 0 approved events, full visual confirmation used a
  separate, fully isolated Docker Compose stack (own project name, ports, and scratch database —
  the real containers and database were never touched) seeded with three test events via the API,
  confirmed end to end in a real browser, then completely torn down.
- The owner's own manual testing afterward surfaced the still-open extraction-reliability root
  cause, addressed in the following session entry above.

## 2026-07-16 - Amber glass backgrounds and browser zoom implemented

- Completed the
  [Amber Glass Background and Browser Zoom Implementation Plan](plans/2026-07-16-amber-glass-background-browser-zoom.md):
  five original route-specific local amber-on-black WebP backgrounds, restrained shell and
  Dashboard glass, opaque workflow surfaces, and one bounded `1664 x 872` whole-canvas Dashboard
  scale. The five assets total `306572` bytes and make no external runtime request.
- Verified with 137 frontend tests across 27 files, lint, a production build, the full isolated
  end-to-end runner (10 Playwright tests plus database verification scripts), and read-only browser
  QA at 90%, 100%, 110%, 125%, and 150% effective zoom. At the 150% viewport the complete deck
  reported scale `0.8718` with zero horizontal overflow; reduced-motion kept the background static
  and reduced transitions to `0.00001s`. Nine screenshots were saved under
  `D:\tmp\terra-space-amber-glass-qa\`.
- Repaired the end-to-end runner's database reset after the earlier database move to a
  Docker-managed volume, and aligned stale browser selectors with the current required-field and
  Layered Command Deck UI. QA used an isolated copy of the owner's current database and attachment;
  live data was not changed. Marked both related Feedback Backlog items resolved. No North Star or
  Roadmap milestone changed.

## 2026-07-16 - Amber glass and browser zoom implementation plan prepared

- Added the owner-approved
  [Amber Glass Background and Browser Zoom Implementation Plan](plans/2026-07-16-amber-glass-background-browser-zoom.md).
  Six test-first tasks now specify the five original local asset prompts and normalization limit,
  the route-to-background contract, restrained shell/Dashboard glass with opaque work surfaces,
  one `1664 x 872` Dashboard design canvas with bounded whole-canvas scaling, isolated Playwright
  coverage, and populated read-only visual QA.
- Updated the two related Feedback Backlog items to `planned` and moved the continuation point to
  executing the plan in a fresh session, as requested by the owner. No application code, North
  Star, or Roadmap milestone changed.

## 2026-07-16 - Amber glass background and browser zoom design approved

- Recorded the owner's approved
  [Amber Glass Background and Browser Zoom](decisions/Amber-Glass-Background-and-Browser-Zoom.md)
  direction. Terra Space keeps its existing pure-black/amber palette and typography, adds a
  restrained translucent shell, and gains five original local amber-on-black backgrounds from
  one visual family with a distinct motif for Dashboard, Documents, Event Review, Events, and
  Settings. The owner explicitly rejected the explored blue-black atmosphere.
- Locked browser page-zoom behavior: the Dashboard Layered Command Deck shrinks as one composed
  unit at 90%, 100%, 110%, 125%, and 150%, while the other menus reflow normally. Updated the two
  related Feedback Backlog items and moved the continuation point to owner review of the written
  decision before implementation planning. No application code, North Star, or Roadmap milestone
  changed.

## 2026-07-16 - Documents layout and Dashboard globe ring feedback items resolved

- Resolved two open [Feedback Backlog](Feedback-Backlog.md) items. Documents: the "New Document"
  form panel had a hard `width: min(100%, 52rem)` cap while the page itself is up to `86rem` wide
  and the Document Queue panel below it had no such cap, so the form panel stopped well short of
  the page's right edge while the queue panel didn't; removed the cap and moved the Source URL
  field into the same row as Document date/Publication date so the reclaimed width is used instead
  of sitting empty. Dashboard: the amber atmosphere ring around the globe
  (`.command-deck-globe::after`) is a fixed-size decorative overlay sized for the resting globe
  view and never tracked the MapLibre globe's actual zoom, so zooming in made the enlarged globe
  surface grow past it and appear covered; `WorldMap` now fades the ring out via a
  `--globe-ring-opacity` CSS variable as the user zooms in.
- The Dashboard panel-parallax half of that same backlog item remains open, since removing it
  conflicts with the locked
  [Visual Design Direction](decisions/Visual-Design-Direction.md) decision and needs owner
  approval first.
- Verified with 127 frontend tests (2 new/updated), lint, a production build, and a live desktop
  browser check at `1920 × 1080` against the owner's real local database (read-only navigation, no
  data changed). No Roadmap phase or milestone changed.

## 2026-07-16 - Two more Feedback Backlog items recorded (Dashboard motion, Documents layout)

- Added a fifth item to `project-knowledge/Feedback-Backlog.md`: the owner does not want the
  Situation Summary, Recent Signals, and Event Register panels moving with the pointer (this
  parallax is a deliberate feature of the locked
  [Visual Design Direction](decisions/Visual-Design-Direction.md) decision, so this conflicts and
  needs a decision update, not just a code change); and the amber atmosphere ring around the
  Dashboard globe stays static and covers the globe when zoomed in, which reads as a behavior
  defect rather than an intended design choice.
- Added a sixth item: the Documents page's overall layout composition feels disproportionate
  between the "New Document" form panel and the "Document Queue" panel below it.
- Per the owner's request to reduce verification overhead, both items were captured as-reported
  without opening the frontend code first; verification is deferred to whenever either item is
  actually scheduled for a fix. No code changed, no decision made — backlog entries only.

## 2026-07-16 - Fourth Feedback Backlog item recorded (event types have no description)

- Added a fourth item to `project-knowledge/Feedback-Backlog.md`: the owner finds event types
  "too shallow" since Settings only collects a bare name. Confirmed in code before writing
  anything down — `EventType` (`backend/app/db/models.py:76-84`) has only `name` and `is_active`
  columns, and extraction (`backend/app/services/extraction.py:58-65`) matches/creates types by
  exact name only, with no description passed anywhere (UI or LLM prompt) to disambiguate similar
  types. Recorded the open question: whether a description should just be a human-readable field
  for Settings/pickers, or also feed the LM Studio extraction prompt to improve classification —
  needs the owner's choice before scoping an implementation plan (either way requires a migration,
  API, and UI change).
- No code changed, no decision made — backlog entry only.

## 2026-07-16 - Two more Feedback Backlog items recorded (Event Review editing, background emptiness)

- Added a second item to `project-knowledge/Feedback-Backlog.md`: the owner wants to edit every
  draft field directly on the Event Review card. Checked `frontend/src/app/event-review/event-card.tsx`
  before writing anything down — an `Edit` button already swaps the whole card into a form
  covering title, summary, dates/precision, event type, actors, and locations, so full-field
  editing already exists there. Recorded the real open question instead: whether the owner didn't
  notice the existing `Edit` button (discoverability) or wants fields editable inline without a
  separate view/edit toggle (a design change) — flagged as needing the owner's clarification
  before any fix is scoped, so a future agent doesn't just re-add a feature that's already built.
- Added a third item: the owner wants an accent, picture, or texture on the sidebar/Dashboard
  background instead of pure black, calling the current look "too empty and void." Checked this
  against the locked [Visual Design Direction](decisions/Visual-Design-Direction.md) decision,
  which explicitly fixes "Background is always pure black" and lists a more decorated/light-mode
  treatment as considered and rejected. Recorded this as a real conflict with a locked decision,
  not a simple styling tweak — any fix needs an explicit decision update/supersession with the
  owner's approval first, per the same "never change silently" rule `AGENTS.md` applies to the
  North Star.
- No code changed and no decision was updated in this pass — both items are backlog entries only,
  pending the rest of the owner's feedback.

## 2026-07-16 - Database storage moved to fix slow startup

- Recorded the
  [Database Storage Moved to a Docker-Managed Volume](decisions/Database-Storage-Location.md)
  decision: only the SQLite database moves from the Windows-mounted `data` folder into a
  Docker-managed volume, cutting `Start-TerraSpace.ps1` startup from about 70 seconds to about 8.5
  seconds. `data/maps`, `data/attachments`, and `data/logs` are unaffected. Migrated the owner's
  existing database with no data loss (verified row counts before/after: 1 document, 4 events, 1
  attachment) and kept a pre-migration safety copy at `data/database.pre-migration-backup/`
  (git-ignored). Added `Backup-TerraSpaceDatabase.ps1` and `Restore-TerraSpaceDatabase.ps1`
  (both verified working end-to-end, including a real restore-and-restart check) since the
  database can no longer be backed up by copying the `data` folder alone, and updated the README's
  "Backup and restore" section to match.
- Found and fixed an unrelated pre-existing bug while verifying: the backend health check's
  hardcoded 2-second internal timeout was too tight for this machine's normal ~2-second loopback
  latency, so the check failed most of the time regardless of the database change — confirmed by
  reproducing the identical failure on the unmodified prior configuration before making any
  change. Widened both the Dockerfile's built-in `HEALTHCHECK` and `docker-compose.yml`'s override
  to a 5-second internal / 6-second outer timeout.

## 2026-07-16 - Feedback Backlog started; first item recorded (globe location gaps)

- Added `project-knowledge/Feedback-Backlog.md`, a new standing home for owner-reported gaps and
  future development requests that are not yet an approved decision or scheduled Roadmap item.
  Linked it from `Project-knowledge-Index.md` and added it as a documented home in `AGENTS.md`
  so Claude, Codex, and Gemini all check it, not just this session.
- Recorded the first item from the owner's live testing: approved events frequently reach
  Events/Dashboard without a usable location, so they never get a globe pin, and there is
  currently no visibility into which approved events are missing one or why. Traced the likely
  cause to two compounding gaps against the existing
  [Local Location Coordinate Resolution](decisions/Local-Location-Coordinate-Resolution.md)
  decision: AI extraction does not always produce location text, and the decision's deliberate
  exact-match-only gazetteer lookup (no fuzzy matching, by design) silently leaves near-misses
  uncoordinated. No fix was scoped or implemented — this is a backlog entry only, pending the
  owner's remaining feedback items and a follow-up decision/plan.

## 2026-07-15 - Delete moved into the Events list row too

- After reviewing the detail-only Delete control live, the owner expected Delete to be reachable
  directly from each row in the Events list rather than only after opening an event's detail panel.
  Updated the [Event Deletion Design](plans/2026-07-15-event-deletion-design.md) to record Delete
  as offered wherever a deletable event is visible (list row and detail), not detail-only.
- Added an `Actions` column and a per-row `Delete` button to `frontend/src/components/event-list.tsx`
  (shown only for `draft`/`approved` rows, matching the existing detail-view rule), widened the
  list's CSS grid in `frontend/src/app/globals.css` (base layout plus both `72rem` responsive
  overrides, and a full-width placement at the `48rem` mobile breakpoint) to fit the new column, and
  generalized `EventsWorkspace`'s single-event delete handler into `removeEvent(event)` so the same
  confirm/call/refresh logic runs whether Delete is triggered from a list row or the open detail
  panel; closing the detail panel now only happens if the deleted event was the one open.
- Added a failing frontend test first (delete an event directly from its list row without opening
  detail, confirming the row disappears and a sibling row survives), confirmed it failed, then
  implemented the change above and confirmed it passed along with the full 126-test frontend suite,
  lint, and a production build. No backend change was required. Visually verified with a throwaway
  Playwright script (mocked event data on a local dev server, screenshots before/after) rather than
  the owner's live database, so their running instance and data were left untouched; the script and
  its screenshots were deleted after verification.

## 2026-07-15 - Protected event deletion added

- Executed the
  [Event Deletion Implementation Plan](plans/2026-07-15-event-deletion-implementation.md)
  test-first: added failing backend tests for successful draft/approved deletion, a missing-event
  404, and rejected/merged 409 protection, confirmed they failed (405, since no route existed),
  then added `delete_event()` in `backend/app/services/events.py` (reusing
  `EDITABLE_REVIEW_STATUSES`) and `DELETE /api/events/{event_id}` in
  `backend/app/api/routes/events.py`.
- Found and fixed a real gap while making the first two tests pass: the ORM `Event.event_sources`
  and `Event.duplicate_flags` relationships had no `cascade="all, delete-orphan"`, so
  `db.delete(event)` raised a SQLAlchemy `AssertionError` trying to null out non-nullable link
  columns instead of deleting the link rows. Added the same cascade already used on
  `Event.event_actors`. No migration was needed: the database's `ON DELETE CASCADE` constraints
  already matched; only the ORM's in-session delete behavior was wrong. Source documents,
  attachments, actors, locations, event types, and shared `Source` rows are untouched, since none
  of those relationships were changed.
- Added failing frontend tests (delete confirmation and success, declined confirmation, delete
  failure showing an error, and Delete button visibility limited to draft/approved), confirmed
  they failed, then added `deleteEvent()` to `frontend/src/lib/events-api.ts`, a `Delete` button
  (reusing the existing `btn-destructive` class) in `EventDetail`, and a `removeSelectedEvent`
  handler in `EventsWorkspace` that confirms via `window.confirm` naming the event title and
  stating the source document remains, then removes the event from local state and closes the
  detail panel on success, or shows the existing error banner on failure.
- Verified with the full suite: 124 backend tests (13 new), 125 frontend tests (4 new), clean
  frontend lint, a successful production build, Project Knowledge validation (0 errors, 0
  warnings), and a clean `git diff --check`. No North Star or Roadmap change.

## 2026-07-15 - Configurable LM Studio processing timeout added

- Owner testing showed that the fixed two-minute extraction limit could expire before a local
  model answered. Added a persisted per-document timeout to `app_settings` through migration
  `0006_lm_studio_timeout`; existing and new databases use a five-minute default.
- The Settings screen now offers 2, 5 (recommended), and 10 minutes. The saved choice is applied
  to the next LM Studio extraction without restarting Terra Space. A longer choice helps slower
  local models finish, while the explanatory text makes clear that it also delays subsequent
  batch documents if LM Studio is unresponsive. Existing failure isolation and Retry behavior are
  unchanged.
- Used test-first coverage for stored/default/range validation, API persistence, and the Settings
  control. Final verification: 119 backend tests, 121 frontend tests, frontend lint, and a
  production build all passed. No North Star, Roadmap phase, or long-term architecture decision
  changed.

## 2026-07-15 - Layered Command Deck verification completed

- Completed all five checkpoints in the
  [Layered Command Deck Motion Implementation Plan](plans/2026-07-15-layered-command-deck-motion-implementation.md).
  The final isolated browser workbench passed its contract with 9 documents, 6 approved events,
  2 drafts, 1 rejected event, 8 mapped locations, 1 pending duplicate, and 2 attachments.
- Inspected Dashboard at `1920 × 930` and `1920 × 900`, plus populated Documents, Event Review,
  Events, and Settings states in a real browser. Also confirmed reduced-motion behavior disables
  parallax and continuous animation while leaving controls operational.
- Reproduced and fixed two final integration defects test-first: Event Review could briefly pair a
  newly selected source document with a stale event, and the Dashboard filter drawer required a
  second click to reveal the shared controls. The new final verification passed: 120 frontend tests
  across 25 files, lint, production build, and a clean `git diff --check`. The isolated Docker
  data, local stub, QA frontend, browser sessions, and temporary artifacts were removed without
  touching the owner's normal database. No Roadmap phase or milestone changed.

## 2026-07-15 - Layered Command Deck implementation checkpointed

- Added the
  [Layered Command Deck Motion Implementation Plan](plans/2026-07-15-layered-command-deck-motion-implementation.md)
  after the owner authorized execution. Work is split into five observable checkpoints with
  focused tests and local commits; full tests, lint, build, and acceptance QA remain concentrated
  in the final checkpoint to limit unnecessary repetition.
- Corrected the implementation sequence during self-review so an isolated, realistic database is
  populated through the real document-extraction workflow before Dashboard layout work begins,
  rather than waiting until final QA. That workbench covers populated review cards, tables, facts,
  attachments, duplicate state, real globe pins, and mixed epistemic/review states without
  touching the owner's normal data.

## 2026-07-15 - Layered Command Deck and controlled-cinematic motion approved

- The owner compared three 3D Dashboard alternatives, initially selected Orbital HUD, then found
  its high-fidelity cockpit-like preview too elaborate and approved the calmer **Layered Command
  Deck** in the final [motion design](plans/2026-07-15-layered-command-deck-motion-design.md). The
  MapLibre globe becomes the dominant viewport-height hero; a small Situation Summary and Recent
  Signals panel occupy subtle edge depth planes; Event Register and Filters share one slim bottom
  dock. Compact instruments advance when focused without covering the globe's center.
- Refined the [Visual Design Direction](decisions/Visual-Design-Direction.md) from broadly calm
  motion to **controlled cinematic**: globe-first staging and restrained 3D depth on the Dashboard,
  lighter motion on Documents/Events/Settings, and almost no ambient motion on evidence-heavy
  Event Review. Scanlines, blinking, bounce, flicker, and aggressive bloom remain rejected.
- Fixed the acceptance environment to the owner's `1920 × 1080` display at `100%` Windows scale,
  with `1920 × 930` as the primary maximized-browser viewport and `1920 × 900` as the short-height
  check. Terra Space remains desktop-only; no Roadmap phase or milestone changed.

## 2026-07-15 - Deferred aesthetic design pass implemented

- Completed every open finding in the
  [Design Pass Audit](plans/2026-07-15-design-pass-audit.md): one shared header pattern across all
  five screens, the locked permanent status bar, a brighter muted-text token, the compact shared
  Dashboard/Events filter, and the remaining Dashboard, Documents, Event Review, Events, and
  Settings polish. Existing shared components and CSS classes remain the visual foundation; no
  parallel design system was introduced.
- Filled the audit's empty-database gap with an isolated sample database containing nine realistic
  documents and events spanning multiple event types, epistemic statuses, approval states,
  dates, locations, duplicate decisions, and image attachments. Inspected all five populated
  screens in a real desktop browser, including source evidence, one-at-a-time review, duplicate
  comparison, event facts, attachment thumbnails, the approved-events table, and glowing globe
  pins. The owner's normal database was not changed.
- Recorded the owner's explicit product boundary in the
  [Visual Design Direction](decisions/Visual-Design-Direction.md): Terra Space is a desktop
  browser application only, and phone/mobile presentation is not supported or an acceptance
  target. Also updated the muted token to `#7b8990` and brought the documented Dashboard layout
  in line with the completed implementation. No Roadmap phase or milestone changed.
- Verified 100 frontend tests across 22 files, clean lint with the earlier dynamic-thumbnail
  warning removed by using Next Image, and a successful production build. Project Knowledge
  validation passed with 0 errors and 0 warnings.

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
