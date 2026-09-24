---
type: Update Log
title: Project Knowledge Log
description: Chronological record of meaningful changes to the Project Knowledge bundle.
tags: [project-knowledge, history]
status: active
---

# Project Knowledge Log

## 2026-09-24 — Editorial Spectrum for Across all issues

- The owner approved a visual wireframe that simplifies the lower Home section. The
  [Atlas Stage decision](decisions/Atlas-Stage-Issue-Level-Home-Design.md) records two leading
  measures above a full-width linked-event type spectrum and an interactive legend.
- Live browser review showed 50 Main Issues, 19 countries, 109 linked Phase 5 events, and an
  Unclassified legend link that opens 53 filtered Explore records. The narrow layout was also
  inspected. No database or n8n content changed.
- Verification: 247 frontend tests, lint, production build, and Project Knowledge validation
  passed without errors or warnings.

## 2026-09-24 — Cinematic Field Notes Home visual amendment

- The owner approved Option B after comparing it with the rigid first Home implementation.
  The [Atlas Stage decision](decisions/Atlas-Stage-Issue-Level-Home-Design.md) now records the
  continuous globe scene, focused selected-Issue location, asymmetric story filmstrip, and
  staggered statistics. Decorative story artwork is disclosed as illustration, not evidence.
- Local Docker frontend review showed the live 50 Main Issues, 19 mapped countries, and 109
  linked Phase 5 events with the selected Issue's map location visible. No database or n8n
  content changed.

## 2026-09-24 — Atlas Stage Home implemented

- Home now uses a pure Issue-place model, with one marker per source-grounded Main Issue and
  unique resolved Event Geography place. Multiple Issues sharing coordinates open a chooser;
  Issues without a resolved place stay searchable. Event-level map and evidence remain in Explore.
- The live local Home showed 50 Issues, 27 Issue-place markers, 19 unique mapped countries,
  and 109 linked retained events. Its Unclassified link opened 53 filtered Explore records.
- The cinematic Home uses the existing globe, wordmark, compass, amber palette, and local
  background. A live mobile capture caught a conflicting old globe positioning rule; removing
  that rule restored the map and caption within the 390-pixel viewport.
- Verification: 246 frontend tests across 46 files, lint, production build, and Project
  Knowledge validation passed. Desktop and mobile browser captures were inspected. Effective
  viewport widths corresponding to 90–150% zoom had no horizontal overflow; actual browser
  zoom remains unverified. No n8n workflow or database write was issued for this UI change.

## 2026-09-24 — Atlas Stage specification approved and planned

- The owner approved the written [Atlas Stage Home design](decisions/Atlas-Stage-Issue-Level-Home-Design.md).
  It is now an active decision.
- A four-task [implementation plan](plans/2026-09-24-atlas-stage-issue-home.md) covers the pure
  Issue-place model, globe behavior, Home interaction and measures, and visual/live-data checks.
  The plan awaits owner review; no UI or pipeline content changed during this planning step.

## 2026-09-24 — Atlas Stage Home design drafted

- The owner selected the Atlas Stage wireframe and approved a cinematic Home whose globe shows
  all Main Issues through their unique resolved related places, with the selected Issue
  highlighted. Home points select Issues; Explore retains event-level investigation.
- The [draft design specification](decisions/Atlas-Stage-Issue-Level-Home-Design.md) defines
  the open **Across all issues** measures, live-data rules, shared-location chooser, missing
  geography behavior, accessibility, and responsive checks. It awaits the owner's review
  before an implementation plan or UI changes.

## 2026-09-24 — Phase 2 Main Issue leads Terra Insight

- The owner approved a North Star change: current Phase 2 Main Issues now lead Home and Explore;
  Phase 5 events, geography, timeline, qualification, and evidence follow each Issue by source ID.
  The [decision](decisions/Phase-2-Main-Issue-Led-Terra-Insight.md) supersedes the event-led entry
  in the guided command center design while retaining its navigation and visual direction.
- A read-only local API audit found 50 Main Issues and 109 linked Phase 5 events. The current
  dataset had no unmatched Phase 5 events. The UI change involved no database or n8n writes.

## 2026-09-24 — Explore visual pass

- The owner asked for a more engaging Explore screen. The filtered Phase 5 investigation view
  now has direct Place, Time, and Records navigation, a map with explicit location coverage,
  a dated timeline with expandable unknown-date records, and a richer event index. The source
  evidence drawer uses a clearer reading hierarchy without changing its data.
- Live browser review with 109 local records confirmed 31 mapped and 78 unresolved locations,
  an expandable group of 78 unknown event dates, a Not Final filter with 10 records, and an
  event opening its retained evidence. Desktop and narrow-screen layouts had no page-level
  horizontal overflow. The four focused Explore tests, component ESLint, and production build
  passed. No pipeline or database content changed.

## 2026-09-24 — Home insight visual pass

- The owner asked for more engaging visuals in the lower Home section. The event-type ranking,
  monthly chart, qualification proportion, and recent-event cards now have distinct visual
  roles and direct links to the underlying filtered Phase 5 records.
- The design keeps the five less common types accessible in an expandable list and separates
  78 unknown event dates from the 31 dated records. The visible status chart reflects 99 Final,
  10 Not Final, and zero Pending records in the local read-only data. No pipeline or database
  content changed.
- The five focused Home tests, component ESLint, and production build passed. Live desktop and
  mobile browser review showed the new layout without horizontal clipping; the expandable
  category list and unknown-date link worked, with Explore showing 78 of 109 records. Project
  Knowledge validation passed with zero errors and warnings.

## 2026-09-24 — Owner-approved cinematic visual refinement

- The owner preferred the cinematic Atlas-first example after finding the first implementation's
  buttons, typography, and repeated square panels too rigid. The guided command center decision
  now records that visual amendment.
- Home now puts the existing globe and live Phase 5 totals in the first-screen composition.
  Explore has a full-width map canvas, and Prepare's stages read as a connected sequence.
  A compact top navigation joins the three new destinations while earlier screens keep their
  previous shell. Browser review with the live local API showed 109 events and 31 mapped records.
- The focused Home, Explore, and Prepare tests passed 10/10. The changed components passed
  ESLint and the final production build passed. A live browser check confirmed the globe, linked
  totals, and pipeline counts; a narrow viewport showed Home stacking without horizontal
  clipping. Project Knowledge validation passed with 0 errors and 0 warnings.

## 2026-09-23 — Guided command center live-data check

- Started the owner's local Supabase and Terra Space containers, reusing copies of the existing
  local connection file and offline map package in this worktree. The read-only UI showed 109
  Phase 5 records, including 31 mapped records; the globe, clustered marker selection, evidence
  detail, and presentation state rendered with live data.
- Fixed a narrow-screen evidence-panel stacking issue. Added a current Phase 2/3 read endpoint
  for Prepare because its former candidate-review API queried a retired table. Live Prepare now
  shows 50 source reviews, 109 candidates, 10 candidates needing review, and 109 Phase 5 records.
  Phase 4 distinguishes 10 requiring review from 56 safe but incomplete results.
- Frontend tests passed 243/243, lint and production build passed, backend compiled, and the new
  read endpoint returned 50 reviews. Isolated Chrome captures at effective 90–150% widths showed
  no horizontal clipping. The first 16:9 capture showed too little of the globe above the fold;
  a tighter Home header improved its placement, and a final 16:9 capture showed the map. Direct
  browser page zoom remains untested because the in-app browser ignored its zoom shortcuts. The
  older Event Review route was also updated to read the current split Phase 2/3 tables; the live
  screen showed source 1 of 50 with its issue and candidates.

## 2026-09-23 — Guided command center implementation checkpoint

- Final review repairs: shared map markers now reveal their events; Explore search keeps rapid
  typing before updating its URL; pending qualification is navigable; malformed dates stay in
  the unknown-date group; Phase 5C place names are read correctly. Prepare labels the unit of
  each attention count and explains the current API's pre-preparation gap. Final checks passed:
  243 frontend tests, lint, and production build.
- Added the four-part navigation and the new Home, Explore, and Prepare routes on
  `codex/guided-command-center`. Home and Explore use the current Phase 5 read API; earlier routes
  remain available separately. Prepare reads sources, candidate reviews, and Phase 5 records
  without adding pipeline edits or execution controls.
- A pure view model keeps `FINAL`, `NOT_FINAL`, and pending qualification separate; unknown dates
  are excluded from dated charts; only resolved Event Geography creates map pins. Chart and
  summary links open their filtered records, and event detail shows the exact evidence quote.
- Verification: 237/237 frontend tests, lint, and production build passed. Browser QA with a
  temporary read-only fixture checked populated Home, Explore, Prepare, presentation mode, and
  narrow-screen navigation. Browser QA caught and fixed a menu overlay and evidence panel header
  overlap. The fixture was kept outside tracked product files.
- Real-data visual QA remains open: Docker was unavailable, the app's normal backend did not run,
  and the generated offline map package is absent in this worktree. The live Phase 5 API response,
  globe rendering, and 90–150% zoom acceptance still need a pass on the owner's running setup.

## 2026-09-23 — Guided command center design approved and planned

- The owner approved the written redesign direction. Its decision status is now active.
- Added the [implementation plan](plans/2026-09-23-guided-command-center-redesign.md) with six
  independently reviewable tasks and explicit checks for unknown values, map pins, final status,
  API errors, and filter continuity. Product UI code has not changed yet.

## 2026-09-23 — Guided command center redesign draft

- The owner selected equal weight for daily usability and portfolio presentation, then approved
  a guided command center with Home, Explore, Prepare, and Settings. Phase 5 is the primary event
  set; earlier events remain separately labeled.
- Added the [draft design](decisions/Terra-Space-Guided-Command-Center-Redesign.md) after reviewing
  the existing frontend, brand kit, six backgrounds, globe, and relevant authority decisions.
- No product UI code or data was changed. The draft awaits owner review before implementation
  planning.

## 2026-09-22 — Portable n8n workflow setup package

- Added a credential-free export of the seven current workflows in the Terra_Space n8n folder
  under tools/n8n/portable/workflows.
- Added a Docker n8n import command, a package test, and an import manifest. The package keeps
  every imported workflow inactive and intentionally excludes credentials and local data.
- Recorded the exact other-device setup procedure in
  [Terra Space n8n Portable Setup](Terra-Space-n8n-Portable-Setup.md).

## 2026-09-22 - Terra Space schema location

- Owner replaced the former public-schema choice. The live Terra Space tables, supporting views,
  and identity sequences now live in the dedicated `terra_space` PostgreSQL schema.
- The local Supabase API exposes that schema, and all 30 Supabase nodes in the inactive Phase 5
  workflow explicitly select it. Database location and preserved Phase 5 totals were verified;
  the workflow remains inactive.
- Added a credential-free Phase 5 workflow export at
  `tools/n8n/terra-space-phase5-workflow.json`. The workflow contract tests now use this portable
  export rather than a private local backup, so another device can import the same workflow and
  attach its own credentials.

## 2026-09-22 - Phase 5E pilot and review gate

- Approved the lean [Phase 5E design](plans/2026-09-22-phase-5e-visibility-qualification-design.md)
  and [implementation plan](plans/2026-09-22-phase-5e-visibility-qualification-implementation.md).
- Added deterministic Phase 5E qualification, latest/history storage, the 5E branch inside the
  existing inactive workflow, and separate read-only Phase 5 Events/Dashboard views.
- Exact three-ID pilot execution `2197` produced two `FINAL` and one `NOT_FINAL`, as predicted;
  latest and history contain three rows each. Normal workflow wiring and inactive state were
  restored. Full baseline run and live application check remain unapproved/unverified.

## 2026-09-21 - Phase 5D temporary pilot filter removed

- After owner approval, removed only the eight-ID filter from the inactive Phase 5 workflow and
  local backup; did not run the full baseline or start Phase 5E.
- n8n validates with 54 nodes, 68 valid connections, zero errors/warnings; 169 JavaScript tests
  pass. Phase 5D latest/history remain empty, matching the read-only full-baseline finding of zero
  qualifying pairs under the approved strict rule.
- Phase 5D is accepted for the current baseline, with the live positive-write path deferred until
  a real pair qualifies. Work stops before Phase 5E.

## 2026-09-21 - Phase 5D eight-event pilot completed without writes

- Execution `2195` ran once through the n8n MCP webhook with an exact eight-event temporary
  Phase 5D filter. All upstream Phase 5 pending queues were empty before the run.
- The workflow considered 28 pairs: 23 lacked the same actual exact date, five failed the strict
  title gate, and none became a recommendation. No model or write node executed.
- Phase 5A-5C fingerprints were unchanged, Phase 5D latest/history stayed at zero rows, and the
  workflow was deactivated. The live positive-write route remains untested; the pilot filter stays
  until a separately approved next step.

## 2026-09-21 - Phase 5D added to the inactive Phase 5 workflow

- Added one connected deterministic Phase 5D group to the existing n8n workflow via MCP. Phase 5C
  now hands off once even when its pending queue is empty; Phase 5D has no model call, merge, or
  publishing step.
- Runtime validation: 54 nodes, 68 valid connections, zero errors or warnings. JavaScript tests:
  168/168 pass. Workflow stayed inactive and both Phase 5D tables stayed empty.
- Read-only baseline evaluation found 31 actual same-date pairs among 109 events; all 31 failed
  the strict title gate, giving zero current recommendations. This is allowed by the approved rule.
- n8n removed the Phase 5C canvas group label during the edit but retained all nodes and
  connections. No pilot was executed; owner review is next.

## 2026-09-21 - Phase 5D storage migration applied after owner approval

- Added the two Phase 5D recommendation tables to local Supabase, with RLS, date/pair checks,
  append-only history protection, and indexes. Both tables are empty.
- Rollback-only SQL contract passes. Phase 5A-5C remain at 109 rows each, with before/after
  fingerprints identical. No workflow edit, execution, merge, or publication occurred.

## 2026-09-21 - Phase 5D local implementation artifacts tested without application

- Added a strict, model-free duplicate matcher and seven focused tests. The full JavaScript suite
  passes 155/155.
- Prepared two additive Phase 5D tables as a migration file. The SQL contract failed before the
  migration existed, then passed with the migration staged in a rolled-back transaction.
- Read-only confirmation showed the tables still absent and the 109 event records unchanged.
  No n8n workflow edit or Phase 5D data run occurred; migration application awaits owner approval.

## 2026-09-21 - Phase 5D deterministic design and plan ready for owner review

- Agreed to strict deterministic comparison only: same actual exact event date, strong action-title
  overlap, and a specific shared actor/recipient or non-country approved location. Same-article and
  cross-article pairs use the same rule; distinct actions in one story remain separate.
- Added the Phase 5D decision and a checkpointed implementation plan. They specify explainable
  recommendations only, no model calls, no automatic merge, and separate pilot/full-run acceptance.
  No technical Phase 5D object or data was created.

## 2026-09-21 - Phase 5C full 109-event baseline completed

- The owner accepted the 12-event pilot and authorized continuation. Removed only the pilot filter,
  confirmed 97 pending inputs, and executed the remaining set once through the n8n MCP webhook.
- The complete Phase 5C baseline has 109 latest results, 109 unique history rows, zero pending or
  failed results, and 110 deduplicated unresolved-reference suggestions covering all unresolved
  event/actor names.
- Production audit found zero invalid event or actor coordinate mappings, zero timeline-basis
  mismatches, and zero duplicate latest/history identities. The workflow was deactivated
  immediately after execution.
- Simplified suggestion persistence to batch-level deduplication followed by direct insertion,
  removing the Supabase lookup pattern that collapsed multiple empty results. Focused tests pass
  35/35; n8n runtime validation reports 39 nodes, 50 connections, zero errors, and zero warnings.
- The legacy rollback contract is unsuitable after real Phase 5C rows exist because its synthetic
  identity collides with a completed row; the failed transaction rolled back. Read-only production
  integrity checks replace it at this checkpoint. Phase 5C-specific advisors reported only
  expected informational RLS/no-policy and unused-index notices.
- Stopped before Phase 5D design or implementation. No merge or final event publication occurred.

## 2026-09-21 - Phase 5C controlled pilot reached the owner-acceptance stop

- Rollback-tested and applied a one-time additive backfill derived only from unresolved fields in
  the 12 saved pilot results. It inserted exactly 13 missing `SYSTEM_UNRESOLVED` suggestions; all
  15 unique unresolved pilot subjects now have one pending suggestion.
- Final database audit found 12 latest rows, 12 history rows, zero pilot inputs pending, zero
  unresolved subjects without a suggestion, zero invalid event/actor coordinate mappings, zero
  failed results, and zero timeline-reference-basis mismatches.
- The workflow fix retains the single Phase 5 workflow, removes conflicting nested loops, and keeps
  event-result and suggestion writes in simple batch branches. It remains inactive and validates
  with 42 nodes, 53 valid connections, zero errors, and zero warnings.
- Stopped for owner acceptance. The exact 12-ID filter remains; the remaining 97 baseline events
  were not processed, and Phase 5D/5E were not started.

## 2026-09-19 - Phase 5C pilot saved results but stopped before suggestion backfill

- The approved 12-event pilot produced exactly 12 latest and 12 history rows; zero selected pilot
  inputs remain pending. The workflow was deactivated after every execution attempt.
- Execution `2193` prepared the remaining 11 events and 13 unresolved suggestions. Its event-result
  branch completed, but the suggestion branch failed because the empty deduplication lookup output
  did not retain the source suggestion fields. Only two earlier suggestions are stored.
- Replaced the conflicting nested loops with two simple batch branches and corrected suggestion
  expressions to reference their prepared source item. Focused tests pass 7/7 and n8n runtime
  validation reports 42 nodes, 53 valid connections, zero errors, and zero warnings.
- Stopped without deleting, resetting, or rerunning any completed result. The next decision is a
  narrow non-destructive suggestion backfill followed by full pilot audit and owner acceptance.

## 2026-09-19 - Phase 5C pilot indexes applied

- After explicit owner approval, applied exactly two covering indexes for the Phase 5C latest and
  history `phase5b_classification_id` foreign keys.
- Performance advisor output no longer reports either Phase 5C unindexed-foreign-key notice. New
  indexes are expected to appear as unused until the pilot actually queries/writes these tables.
- No event data changed: suggestions, latest results, and history remain empty; 109 inputs remain
  pending. The Phase 5 workflow remains inactive.

## 2026-09-19 - Phase 5C Task 5 added to the inactive Phase 5 workflow

- After explicit owner approval, used the n8n MCP to add 13 Phase 5C nodes to the existing single
  Phase 5 workflow. No separate workflow and no Phase 5D/5E placeholder were created.
- The group reads the 5C pending view after Phase 5B, transforms one event at a time, persists only
  conservative unresolved suggestions, and writes latest plus append-only history results. Phase
  5C makes no model call and never invents coordinates.
- Added a live suggestion lookup so repeated unresolved labels across events reuse an existing
  pending item instead of violating the unique subject constraint.
- n8n runtime validation reports 42 nodes, 56 valid connections, zero invalid connections, zero
  errors, and zero warnings. The workflow contract passes 7/7, all 147 JavaScript tests pass, and
  the rollback-only database contract passes with protected fingerprints unchanged.
- The workflow remains inactive. No event was processed; suggestions/results remain empty and all
  109 inputs remain pending. Work is stopped before the controlled 12-event pilot.

## 2026-09-19 - Phase 5C Task 4 pure transformer completed

- Added six pure Phase 5C functions for timeline preparation, approved event/actor geography
  resolution, bounded non-authoritative suggestions, and final result construction.
- Added 17 focused tests. Test-first review caught and fixed same-place multi-alias status handling
  and rejection of coordinates outside valid latitude/longitude ranges.
- All 17 focused tests and the complete 140-test JavaScript suite pass. The implementation uses no
  network or filesystem access.
- No n8n workflow was edited or run and no event was processed. The workflow remains inactive;
  work is stopped before Task 5. Two known non-blocking indexes remain due before the pilot.

## 2026-09-19 - Phase 5C Task 3 safe references applied and verified

- After explicit owner approval, applied exactly 38 geographic references and 24 actor references
  through the local Supabase MCP.
- Confirmed 32/48 location occurrences across 21 events and 55/164 actor occurrences across 30
  events now have approved reference matches. No suggestion or Phase 5C result row was created;
  the pending queue remains 109.
- The first post-seed contract run exposed a test-isolation issue: its real `United States` and
  `US` fixture aliases now correctly collided with production reference aliases. Replaced only the
  rollback-contained fixtures with fictional `Contractland` aliases, then reran the complete
  contract successfully.
- The n8n MCP inventory confirms the single Phase 5 workflow remains inactive. Advisor review found
  no Phase 5C security warning. Two previously known non-blocking foreign-key-index notices remain
  to be corrected before the pilot. No workflow or event processing was run.

## 2026-09-18 - Phase 5C Task 3 safe seed completed, awaiting application approval

- Removed the mixed-context Iran, Syria, and Ukraine country references and six dependent actor
  mappings from the unapplied draft.
- The safe seed now contains 38 geographic references and 24 actor references. Its rollback-only
  double-run remained at exactly 38/24, and the complete Phase 5C database contract passed.
- Projected coverage is 32/48 location occurrences across 21 events and 55/164 actor occurrences
  across 30 events. Thirteen unique location labels and 97 unique actor labels remain unresolved
  without guessed coordinates or affiliations.
- Live Phase 5C tables remain empty, the pending queue remains 109, and the Phase 5 workflow remains
  inactive. No reference or event data was inserted.

## 2026-09-18 - Contextual Phase 5C reference review deferred

- The owner chose not to add a contextual-review table or make row review part of ordinary Phase
  5C processing.
- Context-sensitive and unmatched labels will remain visible without map points. A coding agent
  may investigate them later only when the owner explicitly requests a pipeline review.
- The unapplied draft seed must be trimmed to universally safe references before returning to the
  reference-application approval gate.

## 2026-09-18 - Phase 5C Task 3 draft exposed contextual-location gap

- Reviewed 39 unique extracted location names and 132 unique actor labels using the conservative
  coding-agent policy, the checked-in GeoNames snapshot, and retained Phase 4 evidence.
- Created a draft `supabase/seed/20260918_phase5c_baseline_references.sql` with 41 geographic
  references and 30 actor references. Generic, ambiguous, compound, and weakly attributable actors
  remain unresolved.
- A rollback-only double execution proved the seed idempotent at 41 geography and 30 actor rows.
  Projected coverage is 37/48 location occurrences across 25 events and 73/164 actor occurrences
  across 35 events; nine unique location labels and 88 unique actor labels remain unresolved.
- Review then found that a global place alias can create a false pin when the same place is a true
  event location in one record but only the subject of another. The existing five-table design has
  no per-event include/exclude decision. The draft is marked `DO NOT APPLY`.
- The full Phase 5C database contract passed after testing. Live Phase 5C tables remain empty, the
  pending view remains at 109, and the Phase 5 workflow remains inactive. No seed was applied and
  no event was processed.

## 2026-09-18 - Phase 5C reference review delegated to coding agents

- The owner declined row-by-row manual review of gazetteer matches, coordinates, actor links, and
  unresolved suggestions.
- Codex, Claude, or another coding agent will perform conservative, sourced reference verification
  during owner-requested pipeline reviews. Unverifiable items remain unresolved without guessed
  coordinates.
- Runtime AI remains non-authoritative. Owner approval is still required before inserting reviewed
  reference rows or running targeted processing, but the owner receives an aggregate checkpoint
  instead of an item-by-item coordinate review.

## 2026-09-18 - Phase 5C Task 2 database foundation applied and verified

- After explicit owner approval, applied the additive Phase 5C migration through the local
  Supabase MCP. Supabase registered authoritative version `20260918110834`; the local migration
  filename was aligned to that registered version.
- The rollback-only database contract passed. All 15 protected Phase 1-5B counts and fingerprints
  remained identical, all five Phase 5C tables remained empty, and the pending view returned 109
  inputs.
- Confirmed RLS on all five tables, no direct `anon` or `authenticated` table/view grants, and an
  inactive Phase 5 n8n workflow. The advisor's no-policy and unused-index notices are expected for
  service-role-only empty tables. Two non-blocking Phase 5C foreign-key indexes are still needed
  before the pilot and require a separately approved follow-up migration.
- No reference rows were seeded, no Phase 5C data was processed, and no n8n workflow was edited or
  run. Work is stopped before Task 3.

## 2026-09-11 - Phase 5C Task 2 migration artifact created

- Confirmed migration version `202609110001` is unused on disk and in local Supabase, then created
  `supabase/migrations/202609110001_phase5c_timeline_geography.sql` without applying it.
- The artifact defines five empty tables, one targeted pending view, approved-reference and alias
  validation, honest timeline-basis enforcement against retained Phase 4 facts and publication
  dates, append-only history, indexes, RLS, API restrictions, and comments.
- Static scope review found no Phase 1-5B alteration, deletion, or truncation. Supabase still has
  zero Phase 5C relations, and the rollback-only contract remains red at the intended first missing
  table.
- Work is stopped at the separate migration-application approval gate. The Phase 5 workflow remains
  inactive and no reference, result, model, or pipeline run occurred.

## 2026-09-11 - Phase 5C Task 1 red database contract completed

- Froze counts and full-row fingerprints for 15 protected Phase 1-5B latest, history, taxonomy, and
  proposal relations without printing article contents.
- Added `supabase/tests/phase5c_timeline_geography.sql`, a transaction-wrapped contract covering
  five Phase 5C tables, the pending view, coordinate and alias authority, actor relationships,
  suggestion deduplication, honest timeline bases, visible unresolved geography, targeted reruns,
  immutable history, and upstream immutability.
- The first test run failed exactly at the intended TDD boundary because
  `terra_space_phase5_geographic_references` does not exist. All protected counts and fingerprints
  matched afterward.
- No migration, database row, n8n change, model call, or data execution occurred. Work is stopped
  before Task 2 and the Phase 5 workflow remains inactive.

## 2026-09-11 - Phase 5C design and implementation plan approved

- The owner approved the Phase 5C timeline, event-geography, actor-network, database, workflow, and
  production-readiness design while explicitly retaining the option to revisit it later.
- Authoritative resolution is deterministic from approved local references. Optional local AI may
  enrich a new unresolved suggestion, but the suggestion remains pending and cannot apply a
  coordinate, actor identity, or relationship.
- Added the [Phase 5C Timeline and Geography](decisions/Phase-5C-Timeline-and-Geography.md) decision
  and its seven-task [implementation plan](plans/2026-09-11-phase-5c-timeline-geography.md).
- Work is stopped before Task 1. The Phase 5 workflow remains inactive, and no migration, reference
  row, workflow edit, model call, or data execution occurred.

## 2026-09-11 - Phase 5B accepted for progression and Phase 5C design started

- The owner accepted moving to Phase 5C without first consolidating the 40 isolated Event Type
  proposals. The 12-type taxonomy remains provisional and may be refined later; proposal review is
  still required before Phase 5E qualification or production release.
- Phase 5B remains technically clean at 109 latest classifications: 56 `CLASSIFIED`, 53 visible
  `UNCLASSIFIED`, zero `FAILED`, and safeguard `ACCEPT` on every latest result. No proposal was
  approved, mapped, activated, or deleted.
- A read-only Phase 5C baseline check found 34 events with actual event dates, 75 without them, all
  109 with source publication dates, 44 events with 48 event-location references, and 90 events with
  164 actor references. The active database has no canonical location, actor, affiliation, or
  coordinate reference tables.
- The one Phase 5 n8n workflow is inactive. Phase 5C remains design-only until the owner approves
  its timeline and geography contract.

## 2026-09-11 - Phase 5B controlled pilot accepted

- The owner explicitly accepted the complete 12-record Phase 5B pilot: 10 `CLASSIFIED`, 2
  `UNCLASSIFIED`, zero `FAILED`, and one isolated `PENDING_REVIEW` proposal.
- Task 6 is complete. The acceptance does not authorize processing the remaining 97 records or
  beginning Phase 5C.
- The exact pilot filter remains installed and the single Phase 5 workflow remains inactive. The
  next action requires separate explicit approval for Task 7's full Phase 5B run.

## 2026-09-11 - Phase 5B Task 6 evidence-boundary repair passed

- Added an owner-approved classifier instruction requiring proposal evidence to be copied verbatim
  from prepared evidence; when that is impossible, the classifier must retain a visible
  Unclassified result without a proposal. The strict parser and evidence boundary were not relaxed.
- A test-first regression check failed before the correction and passed afterward. The complete
  JavaScript suite now passes 120/120, while live n8n validation remains at 29 nodes, 38 valid
  connections, zero errors, and zero warnings.
- Execution `2146` reprocessed exactly the two retryable pilot failures. Both became
  `UNCLASSIFIED`: the climate-economic-impact event has one safeguard-accepted proposal with an
  exact evidence excerpt and `PENDING_REVIEW`; the shortened-drills event ended after three audited
  attempts with safeguard `REJECT` and no retained proposal or selected type.
- The complete pilot now has 10 `CLASSIFIED`, 2 `UNCLASSIFIED`, zero `FAILED`, one isolated proposal,
  and 62 append-only history rows across preserved attempts. The remaining pending count is 97.
- The workflow was deactivated immediately after the run and the exact 12-record pilot filter
  remains installed. Work is stopped for owner acceptance before any full run or Phase 5C work.

## 2026-09-11 - Phase 5B Task 6 pilot reached the production-readiness stop

- Execution `2145` processed exactly the 12 filtered pilot records through the n8n MCP webhook and
  finished successfully in about 70 seconds. The workflow was deactivated immediately afterward.
- Ten records are `CLASSIFIED` with independent safeguard `ACCEPT`; all use exact active Event Type
  references, none required a corrective retry, and none has a technical error.
- Two records remain retryable `FAILED` because proposed Event Type evidence was not an exact
  excerpt of prepared evidence. The strict boundary removed the proposed type and proposal and did
  not run the safeguard, so no unsupported data was retained.
- Persistence audit found 12 unique latest identities, 12 new history rows for execution `2145`,
  60 pilot history rows across five preserved technical attempts, zero duplicate submission keys,
  zero invalid active-type references, and zero proposals. The pending view now contains 99 rows.
- Before the successful run, owner-approved systemic repairs added safe zero-Phase-5A continuation,
  removed unsupported `structuredClone` calls from n8n Code wrappers, required LM Studio
  `json_schema` structured output, and passed each schema as workflow data rather than embedding it
  inside an n8n HTTP expression. Regression coverage is 9/9 workflow-contract tests and 119/119
  JavaScript tests; live validation is 29 nodes, 38 connections, zero errors, and zero warnings.
- The exact pilot filter remains installed. Work is stopped for owner review; no remaining baseline
  run, Phase 5C work, merge, final event publication, or Phase 1-4 execution occurred.

## 2026-09-10 - Phase 5B Task 5 controlled pilot selected and filtered

- Read-only profiling confirmed 109 pending records: 43 NORMAL and 66 LIMITED. Selected an exact
  12-record review set spanning security, diplomacy, economy/energy, clear definitions, overlaps,
  sparse facts, and likely no-approved-match behavior without assigning ground truth in advance.
- The selected mix is 8 NORMAL and 4 LIMITED; 7 have no exact event date, 3 have no actors, and 6
  have no locations. Exact IDs and purposes are recorded in the implementation plan.
- Added only the exact-ID temporary filter to `Get Pending Phase 5B Events` and mirrored it in the
  credential-free recovery export. All 6 workflow contract tests pass; live validation reports zero
  errors and warnings.
- The workflow remains inactive. No execution, model call, or data write occurred, and all 109
  records remain pending. Stopped for explicit approval before the 12-event pilot run.

## 2026-09-10 - Phase 5B Task 4 installed in the inactive Phase 5 workflow

- After explicit owner approval, added one connected 18-node Phase 5B group to existing workflow
  `FAxBx6a9fnXjLfVO`; no separate workflow or trigger was created.
- Installed bounded local classification, independent safeguard, two corrective retries,
  conservative Unclassified fallback, retryable FAILED persistence, append-only history, and
  optional PENDING_REVIEW proposal routing. No Phase 5C-5E or publication behavior was added.
- Runtime validation reports 26 nodes, 34 valid connections, zero errors, and zero warnings. The
  credential-free recovery export passes all five workflow contract tests.
- The workflow remains inactive. No execution or model call occurred, and the database remains at
  109 pending inputs with zero Phase 5B latest, history, or proposal rows. Stopped before Task 5.

## 2026-09-10 - Phase 5B Task 3 pure classification logic completed

- Implemented the bounded classifier and independent safeguard prompt builders, strict JSON
  parsers, exact approved-type matching, evidence-grounded optional proposals, two corrective
  retries, conservative Unclassified finalization, complete attempt history, and retryable
  technical-failure payload.
- Followed test-first development. All 22 focused Phase 5B tests pass, including the final audit
  guard that requires the retry count to match the saved attempt trace; the complete JavaScript
  suite passes all 110 tests.
- No n8n workflow was edited, no model was called, and no database or event data was written.
  Stopped for owner review before Task 4.

## 2026-09-10 - Phase 5B database foundation hardened

- With owner approval, applied Phase 5B-only hardening migration `20260910161832` to revoke direct
  access/discovery privileges from `anon` and `authenticated` while preserving backend/n8n access.
- Added the advisor-requested index for reviewed proposal mappings and strengthened the database
  contract to verify both permission and index requirements.
- The full contract passes. New-object GraphQL discoverability warnings and the unindexed-foreign-key
  notice are resolved; remaining notices are expected information about private empty tables and
  unused new indexes.
- Phase 1-5A fingerprints remain unchanged. Phase 5B remains at 109 pending inputs with zero latest,
  history, or proposal rows, and work is stopped before Task 3.

## 2026-09-10 - Phase 5B Task 2 database foundation applied and verified

- After explicit approval, applied the additive migration. Local Supabase assigned authoritative
  registry version `20260910161039`; the repository filename was aligned to that version.
- The full rollback-only database contract passed across the exact 12 types and 33-node paths,
  classification routes, active taxonomy guards, bounded retries, append-only history, proposal
  review rules, pending behavior, RLS, and protected upstream fingerprints.
- Durable state now has 109 pending Phase 5B inputs (43 NORMAL and 66 LIMITED), zero latest
  classifications, zero history rows, and zero proposals. All ten Phase 1-5A counts and fingerprints
  remain unchanged.
- Supabase advisors found no Phase 5B security error. Remaining notices are GraphQL schema
  discoverability while RLS still blocks anonymous rows, intentional RLS-without-policy notices,
  and one low-priority missing index for optional proposal mappings. These remain for owner review
  rather than being changed implicitly.
- Stopped before Task 3. No n8n workflow node changed and no model was called.

## 2026-09-10 - Phase 5B Task 2 migration drafted, not applied

- After explicit file-creation approval, confirmed the planned draft version `202609100002` was
  unused. The later application tool assigned the authoritative registry version recorded above.
- Drafted five additive Phase 5B tables, one retry-aware pending view, the exact 12 stable Event
  Types and 33-node taxonomy, classification and proposal guards, indexes, audit triggers, RLS,
  and complete plain-language table/column comments.
- Added database enforcement that a proposal can exist only for a final UNCLASSIFIED event and
  that classification requires a fully active Domain-to-Event-Type path.
- Static audit found no persistent data mutation or schema alteration for Phase 1-5A. The migration
  remains unapplied, the database contract remains intentionally red, and the n8n workflow is
  unchanged.

## 2026-09-10 - Phase 5B Task 1 database contract checkpoint

- Froze all ten Phase 1-5A latest/history counts and full-row fingerprints without printing article
  text. Phase 5A remains 109 latest and 109 history rows: 43 NORMAL, 66 LIMITED, zero FAILED, and
  zero pending.
- Corrected the planned taxonomy total from 31 to 33 after verifying that the authoritative tree
  and seed contain 3 domains, 6 categories, 12 subcategories, and 12 Event Type leaves.
- Added the rollback-only Phase 5B database contract. Its first run failed at the intended missing
  `terra_space_phase5_event_types` assertion, automatically rolled back, and left every protected
  fingerprint unchanged.
- Stopped before creating or applying any migration. No workflow or event data changed.

## 2026-09-10 - Phase 5B implementation plan approved

- Added the test-first Phase 5B implementation plan covering the database contract, pure
  classifier and safeguard logic, extension of the same inactive Phase 5 workflow, a 12-record
  pilot, and the separately approved full run.
- Preserved separate owner approval gates before migration creation/application, workflow edits,
  pilot execution, and full execution. Every stage stops for review, and Phase 5C remains outside
  this plan.
- No database object, n8n workflow node, model call, or event row changed. The next action is only
  to freeze the read-only baseline and write the intentionally failing database contract test.

## 2026-09-10 - Phase 5B Event Type classification design approved

- Approved one primary Event Type per NORMAL or LIMITED event using the existing 12 active taxonomy
  leaves and only the bounded prepared-event content.
- Selected a local classifier plus independent safeguard with up to two immediate corrective
  classifier attempts. Repeated semantic rejection becomes Unclassified; technical errors remain
  retryable FAILED results.
- Accepted matches are auditable `AI_ASSIGNED` classifications. Unclassified events may optionally
  create one event-linked pending proposal for direct database review, with no automatic grouping,
  official type creation, or activation.
- Added the detailed Phase 5B decision and marked the earlier blanket closed-taxonomy policy
  superseded for this pipeline. No database or workflow implementation occurred.

## 2026-09-10 - Phase 5A complete baseline verified

- After the owner delegated the decision, accepted the clean pilot and removed only the temporary
  six-ID input restriction from the same inactive Phase 5 workflow.
- Manual n8n execution `2138` successfully processed all 103 remaining inputs. Phase 5A now has
  109 unique latest records and 109 unique history snapshots: 43 NORMAL and 66 LIMITED, all
  PREPARED, with zero pending records or failures.
- Whole-baseline comparison found zero upstream-copy mismatches, zero latest/history mismatches,
  zero duplicate Phase 4 identities, and zero LIMITED records without a preserved reason. All
  eight protected Phase 1-4 counts and fingerprints remain unchanged.
- The database contract, all 88 JavaScript tests, n8n runtime validation, and Project Knowledge
  validation pass. The credential-free workflow backup was aligned with the unrestricted input.
  The workflow remains inactive and work is stopped before Phase 5B.

## 2026-09-10 - Phase 5A six-record pilot passed

- With explicit owner approval, manually ran inactive workflow `FAxBx6a9fnXjLfVO` once. n8n
  execution `2137` succeeded and processed exactly the six restricted pilot identities.
- The database now contains six latest and six append-only history records: two
  `VALID -> NORMAL`, two `INCOMPLETE -> LIMITED`, and two `NEEDS_REVIEW -> LIMITED`. All are
  `PREPARED`; none failed. The remaining general pending count is 103.
- Independent comparison found zero mismatches across every preserved Phase 1/3/4 field and zero
  differences between each latest record and its history snapshot. All eight protected upstream
  counts and full-row fingerprints remain identical to the frozen baseline.
- The rollback-only database contract, 8 focused transformer tests, all 88 local JavaScript tests,
  and n8n runtime validation pass. The temporary six-ID filter remains installed, the workflow
  remains inactive, and work is stopped for owner review before any full 5A run or 5B work.

## 2026-09-10 - Phase 5A workflow restricted to six-record pilot

- With owner approval, added a temporary read filter containing only the six reviewed Phase 4 IDs
  to the existing inactive Phase 5 workflow; no other workflow behavior changed.
- Runtime validation remains at zero errors and zero warnings. The workflow still has zero
  executions, both Phase 5A tables remain empty, and all 109 eligible inputs remain in the general
  pending view.
- Updated the credential-free recovery export with the same filter and stopped before execution.

## 2026-09-10 - Six-record Phase 5A pilot set selected read-only

- Selected two VALID, two INCOMPLETE, and two NEEDS_REVIEW Phase 4 identities for the controlled
  5A pilot. Together they cover exact and unknown dates, populated and empty actors/locations, and
  result-level plus candidate-level Phase 3 review context.
- Verified that all six exact identities are currently present in the Phase 5A pending view.
- No workflow filter, database row, execution, or upstream phase changed. The pilot still requires
  an approved temporary workflow filter and separate execution approval.

## 2026-09-10 - Single inactive Phase 5 workflow created with 5A only

- With separate owner approval, created inactive workflow `FAxBx6a9fnXjLfVO`, **Terra Space -
  Phase 5 - Generate and Qualify Events**, in n8n folder `Terra_Space`.
- The eight-node 5A group reads pending input, processes one record at a time, copies and routes it
  deterministically, creates or retries an exact latest identity, and appends attempt history. It
  contains no model call, Phase 1-4 write, later Phase 5 stage, merge, final-event, or publication
  node.
- Runtime validation reports zero errors and zero warnings. The workflow remains inactive and has
  zero executions; both Phase 5A tables remain empty and all 109 inputs remain pending.
- Added a credential-free recovery export under `.n8n-backups/20260910/` and stopped before pilot
  selection or execution.

## 2026-09-10 - Phase 5A deterministic transformer verified

- Added the pure local Phase 5A transformer and eight behavior tests through a red-green TDD cycle.
- Verified exact upstream copying, deterministic NORMAL/LIMITED routing, deep-cloned facts,
  preserved null/empty values, rejected ineligible inputs, required limited reasons, and unique
  attempt UUIDs. The transformer creates no field belonging to 5B-5E.
- Focused tests pass 8/8 and the complete local JavaScript suite passes 88/88.
- No n8n workflow was created or executed; Phase 5A latest/history tables remain empty.

## 2026-09-10 - Phase 5A database contract applied and verified

- With separate owner approval, atomically applied and registered migration `202609100001`,
  creating only two empty RLS-protected Phase 5A tables, four indexes, one updated-at trigger, and
  one retry-aware pending view.
- The rollback-only database contract passed. It temporarily exercised NORMAL/LIMITED routing,
  exact upstream preservation, retry selection, and append-only history retention, then removed all
  test rows through rollback.
- Final state: zero latest Phase 5A rows, zero Phase 5A history rows, and 109 pending inputs. All
  eight Phase 1-4 counts and full-row fingerprints exactly match the frozen Task 1 baseline.
- Stopped before the deterministic transformer and n8n workflow work.

## 2026-09-10 - Phase 5A additive migration file prepared

- Added the unapplied `202609100001_phase5a_event_records.sql` migration file defining two empty
  Phase 5A tables and one retry-aware pending view.
- The file preserves complete Phase 1/3/4 snapshots, constrains VALID to NORMAL and
  INCOMPLETE/NEEDS_REVIEW to LIMITED, supports technical retries, and adds indexes, RLS, an
  updated-at trigger, and comments for all 49 table columns.
- Static safety checks found no Phase 1-4 mutation or destructive SQL. The migration was not run,
  so no database object or row changed. Application awaits separate owner approval.

## 2026-09-10 - Phase 5A Task 1 baseline and failing contract recorded

- Froze read-only counts and stable full-row fingerprints for all eight Phase 1-4 latest/history
  tables without displaying article content.
- Added `supabase/tests/phase5a_event_records.sql`, a transaction-wrapped contract covering the
  pending queue, status routing, exact upstream preservation, retry behavior, history retention,
  and Phase 1-4 immutability.
- The initial test passed all baseline assertions and then failed as expected because the Phase 5A
  pending view does not exist. Post-test fingerprints matched exactly; no database object, row, or
  n8n workflow was created or changed.
- Stopped before the additive Phase 5A migration, pending explicit owner approval.

## 2026-09-10 - Lean Phase 5 redesign and 5A plan prepared

- Reframed Phase 5 around the owner's expected output: all retained events remain visible, while
  safe events may qualify as final even when incomplete, review-marked, or Unclassified, with their
  limitations preserved.
- Kept all 5A-5E stages in one workflow and separated Event Geography from typed actor geographic
  references. Publication dates may support clearly labelled timeline placement but never replace
  unknown event dates.
- Recorded direct database review for new Event Type suggestions and retained the prohibition on
  automatic duplicate merging.
- Added the test-first 5A implementation plan with separate approval gates for migration, workflow
  creation, six-record pilot, full run, and the transition to 5B.
- No database, n8n workflow, Phase 1-4 data, pilot, final event, or publication was changed.

## 2026-09-09 - Phase 5A-5E one-workflow design documented

- Expanded the approved Conservative Event Draft direction into one inactive n8n workflow with
  five internal stages: draft creation, Event Type classification, actor/location normalization,
  possible-duplicate recommendation, and readiness assessment.
- Added a mandatory production-readiness stop, controlled pilot, owner review, and explicit
  approval gate after every sub-phase before the next stage is implemented.
- Recorded that the clean 109-result Phase 4 baseline is ready for 5A, while Event Type, canonical
  entity, duplicate-reference, and final-event contracts do not yet exist and must be designed at
  the 5B-5D checkpoints.
- No migration, n8n workflow, pilot, processing run, merge, or publication was performed.

## 2026-09-09 - Clean Phase 4 baseline repaired and verified

- Audited all 109 Phase 4 results and found one retained location whose evidence extended beyond
  its Phase 3 candidate boundary: sequence 59 candidate c1 stored `EU` as a country location.
- Added a failing regression case, tightened the same inactive workflow's deterministic location
  validator, bumped the extraction version, and verified the complete suite at 80/80 passing tests.
- With explicit owner confirmation, deleted and regenerated exactly the affected result and run.
- Final baseline: 109 results and 109 runs; 43 `VALID`, 56 `INCOMPLETE`, and 10 genuine inherited
  `NEEDS_REVIEW`; zero failed results/runs, zero pending candidates, and zero malformed payloads.
  All 341 retained evidence fields are exact article substrings and remain inside their candidate
  boundaries. Phase 5 was not run and the Phase 4 workflow remains inactive.

## 2026-09-09 - Clean Phase 3 baseline repaired and accepted for Phase 4 input

- Audited the 16 initially review-flagged candidates and identified six non-contiguous model quotes
  plus two false safeguard rejections; the remaining unsupported-detail cases were genuine reviews.
- Repaired the same inactive Phase 3 workflow with stronger single-source evidence instructions,
  literal-detail safeguard checks, prompt-version tracking, and a narrowly scoped parser repair for
  Gemma's observed malformed `\\u201n` opening-quote escape.
- With explicit owner confirmation, selectively deleted and regenerated eight results/runs, then
  three results/runs. A technical JSON failure on sequence 53 was retried through the workflow's
  normal failed-result path and succeeded.
- Verified 50 latest results, 109 complete candidates (99 `VALID`, 10 genuine `NEEDS_REVIEW`), zero
  non-exact or non-verified evidence quotes, zero failed latest results, zero Phase 3 pending, and
  exactly 109 Phase 4 pending inputs. Two failed sequence-53 attempts remain only as immutable audit
  history and are not consumed by Phase 4. Phase 4 tables remain empty; 79/79 tests pass.

## 2026-09-09 - Clean Phase 3 replay completed with audit required

- Verified one Phase 3 result for every Phase 2 source and an empty Phase 3 pending queue.
- Counted 108 candidates: 92 `VALID` and 16 `NEEDS_REVIEW` across 15 review-level article results;
  all payloads are complete and every review candidate has a reason.
- Found six candidate evidence quotes that are not exact cleaned-source substrings and only 102
  candidates exposed to the Phase 4 pending view. Phase 4 must remain unrun until the 16 review
  cases, quote mismatches, and six-candidate count difference are audited and repaired as needed.

## 2026-09-09 - Stale Phase 1 failure history removed

- With explicit owner confirmation, deleted exactly 50 Phase 1 `FAILED` processing runs created
  while LM Studio was offline.
- Verified the clean baseline now contains 50 completed sources, 50 successful Phase 1 runs, 50
  valid Phase 2 results, and 50 valid Phase 2 runs; Phase 3 and Phase 4 remain empty.
- Preserved the truthful deterministic-fallback warnings on 20 successful Phase 1 runs because
  they describe valid successful processing rather than stale failures.

## 2026-09-09 - Clean Phase 2 baseline repaired and verified

- Replaced contiguous-string named-detail validation with meaningful-token validation and added
  four regression cases while retaining the absent-person-name rejection case.
- After browser text entry stripped regex backslashes and halted before saving, restored the same
  workflow through n8n export/import and verified its node code exactly matches the tested source.
- With explicit owner confirmation, removed four old result rows and four old run rows for
  sequences 98, 101, 105, and 114, then selectively replayed exactly those four sources.
- Verified the final baseline: 50 `VALID + ACCEPT + VERIFIED` results for 50 sources, 50 processing
  runs, zero errors, zero non-exact quotes, zero Phase 2 pending, and 50 Phase 3 pending. The
  workflow remains inactive; Phase 3–5 were not run.

## 2026-09-09 - Four clean Phase 2 review flags audited as false positives

- Confirmed sequences 98, 101, 105, and 114 have complete grounded issue payloads, exact source
  quotes, and raw model-safeguard `ACCEPT` decisions.
- Traced all four false flags to the deterministic named-phrase check: contiguous acronym/name
  wording (98), separately supported possessive wording (101), the invalid extracted phrase
  `Americans of` (105), and retained terminal punctuation (114).
- Made no data or workflow changes during the audit. Phase 2 requires validator repair, tests,
  workflow update, and selective regeneration of these four records before Phase 3 runs.

## 2026-09-09 - Clean Phase 2 replay completed with four review flags

- Verified one Phase 2 result for each of the 50 retained sources: 46 `VALID + ACCEPT` and four
  `NEEDS_REVIEW + REJECT` (sequences 98, 101, 105, and 114).
- Confirmed all 50 results have complete issue payloads and evidence quotes that are exact cleaned-
  source substrings; no Phase 2 result is technically failed.
- Kept the four named-detail safeguard flags pending focused audit before production acceptance.
  All 50 results are available to Phase 3, which has not yet been run in the clean replay.

## 2026-09-09 - Clean Phase 1 replay completed

- The first replay attempt failed all 50 sources because LM Studio was unreachable from n8n on
  port 1234; no derived Phase 2–4 data was created.
- After LM Studio was started, confirmed HTTP 200 model-list access from Windows and from inside
  the n8n container, then the owner retried the workflow.
- Verified 50 `completed` Phase 1 sources, 50 non-empty cleaned texts, and zero processing errors.
  Phase 2–4 remain empty and Phase 5 remains paused.

## 2026-09-09 - Clean full-pipeline replay baseline prepared

- With explicit owner confirmation, removed 826 derived rows: 113 Phase 1 runs; 50 Phase 2
  results and 57 runs; 50 Phase 3 results and 73 runs; and 166 Phase 4 results and 317 runs.
- Preserved all 50 original Phase 1 source articles and metadata and cleared their prior cleaned
  text and processing errors. An initial reset to `draft` caused the Phase 1 queue query to return
  zero items; all 50 were then corrected to the workflow-compatible `queued` status.
- Verified that every Phase 1–4 result/run table is empty and the 50 sources are ready for a
  clean replay. Phase 5 remains paused and unimplemented.

## 2026-09-08 - Phase 4 second batch classification repair verified

- Repaired false review classification after safely rejected optional facts, deterministic
  location levels, unresolved actor references, and actor-specific source-role attribution.
- Aligned both Phase 4 result and processing-run database constraints so reason-bearing
  `INCOMPLETE + REJECT` is valid while `VALID` still requires safeguard `ACCEPT`.
- Regenerated only the eight approved latest results; the first replay stopped before saving on
  the old constraint, then all eight completed after the contract repair. Corrected China’s role
  in 110 c1 deterministically without another model call.
- Final sequences 108–117 state is 8 `VALID`, 10 `INCOMPLETE`, 2 inherited `NEEDS_REVIEW`, 0
  `FAILED`, 28 processing attempts, and no pending candidate. The workflow is inactive and Phase
  5 remains paused.

## 2026-09-08 - Phase 4 second batch run audited

- Audited all 20 Phase 4 results for sequences 108–117: 8 `VALID`, 8 `INCOMPLETE`, 4
  `NEEDS_REVIEW`, 0 `FAILED`, 20 history attempts, and no pending candidate.
- Confirmed all retained fact evidence is an exact cleaned-source substring and every non-valid
  result has a reason.
- Identified false review tags in 108 c2 and 113 c1 after rejected optional actors had already
  been omitted, incorrect location levels for Gaza/Gaza Strip, southern Iran, and the Falklands,
  and unresolved actor label `the official` in 114 c3.
- Phase 4 requires workflow repair and selective regeneration before acceptance. Phase 5 was not
  run and remains paused.

## 2026-09-08 - Phase 3 second batch repair and selective retries verified

- Repaired evidence completeness, duplicate-event splitting, neutral reporting-verb entailment,
  and literal escaped paragraph-break matching in the existing Phase 3 workflow.
- Deleted and regenerated only the approved latest results for sequences 111, 113–117, then
  selectively retried 113 once after the newline validator repair; 17 processing attempts remain
  preserved.
- Final batch state is 21 candidates: 18 `VALID` and 3 genuine `NEEDS_REVIEW`. All valid evidence
  is an exact cleaned-source substring and every review has a concrete reason.
- The workflow is inactive, validates with 0 errors and 0 warnings, and all 12 focused tests pass.
  Phase 4 was not run and Phase 5 remains paused.

## 2026-09-08 - Phase 3 second batch run audited

- Audited all ten latest Phase 3 results for sequences 108–117: 10 processing attempts, 25
  candidates, no failed source, and no pending input.
- Found 16 `VALID` and 9 `NEEDS_REVIEW` candidates across four fully valid and six partially
  reviewed source results; all review candidates have reasons.
- Confirmed one non-exact evidence quote in sequence 114 and identified recurring narrow-evidence
  and unsupported-description defects, plus an overly literal safeguard rejection in sequence
  116 candidate c3.
- Phase 4 was not run. Phase 3 requires workflow repair and selective regeneration before this
  batch is accepted; Phase 5 remains paused.

## 2026-09-08 - Phase 2 second batch named-detail repair verified

- Audited sequences 108–117 and found unsupported named people in accepted results for sequences
  111 and 115, despite otherwise grounded Main Issues.
- Strengthened the existing workflow prompt and added a deterministic named-detail check; fixed a
  cross-field false positive test-first so title and description are scanned independently.
- Regenerated the two approved targets, retained the corrected sequence 115 result, and changed
  sequence 111's already-correct result from a false `NEEDS_REVIEW` to `VALID` without another
  model call.
- Final batch state is 10 `VALID` latest results, 0 errors, 14 processing attempts, exact-source
  evidence for all ten, and 10 Phase 3-pending sources with no Phase 3 result yet.
- All 10 focused tests pass. The 21-node Phase 2 workflow has 0 validation errors or warnings and
  remains inactive; Phase 5 remains paused.

## 2026-09-08 - Phase 1 second batch cleaning repair verified

- Processed sequences 108–117 and found five retained publisher-noise formats across sources 108,
  109, 113, 114, and 116.
- Added regression coverage and repaired the deterministic cleaner for standalone advertisements,
  an alert promo, Reuters caption/credit pairs, a leading video heading, and an escaped Anadolu
  sharing footer.
- Reprocessed only the five affected sources. All ten sources are complete with no processing
  errors, the targeted artifacts are absent, and all 15 Phase 1 attempts remain in history.
- The existing 16-node Phase 1 workflow remains inactive. No Phase 2–4 result was created and
  Phase 5 remains paused.

## 2026-09-08 - Phase 4 final selective retry verified

- Deleted and regenerated only the owner-confirmed latest result for sequence 107 candidate c1;
  all earlier processing history was preserved.
- The v9 statement-date rule produced a `VALID` result dated `2026-09-01`, with `reported`
  epistemic status, grounded actors, exact evidence, and no invented location.
- Final sequences 98–107 state is 17 `VALID`, 8 `INCOMPLETE`, 5 genuine `NEEDS_REVIEW`, 0
  `FAILED`, 37 append-only attempts, and no pending candidate.
- Restored the inactive 28-node workflow to its normal pending source and removed the temporary
  one-candidate view. The three older sequence 97 candidates and Phase 5 remain untouched.

## 2026-09-08 - Phase 4 audited statuses applied and four defects regenerated

- Reclassified the five audited false-review results as `VALID` and seven safe partial results as
  `INCOMPLETE`; left the five inherited Phase 3 review cases unchanged.
- Deleted and regenerated only 101 c4, 105 c3, 105 c4, and 107 c1, preserving 32 earlier history
  rows and appending four new attempts.
- Verified grounded dates for 101 c4 (`2026-08-23`), 105 c3 (`2026-06`), and 105 c4 (`2026-07`),
  and removed Russia from 101 c4's neighboring launch clause.
- The live 107 c1 retry remained safely `INCOMPLETE`; its date response confused the Tuesday
  statement with the older June agreement. Added a test-first deterministic statement-date rule
  and installed `phase4-narrow-extraction-v9-statement-date` without rerunning data.
- Current sequences 98–107 state is 16 `VALID`, 9 `INCOMPLETE`, 5 `NEEDS_REVIEW`, 0 `FAILED`, and
  36 history attempts. The workflow is inactive on its normal source; Phase 5 remains paused.

## 2026-09-08 - Phase 4 incomplete status and extraction repairs installed

- Added the approved `INCOMPLETE` database status for safe partial results with a concrete reason;
  `NEEDS_REVIEW` remains reserved for inherited evidence problems, safeguard/technical failures,
  and other material uncertainty.
- Repaired grounded month-name normalization, accepted model precision `day` as `exact` before
  validation, rejected actors from clearly neighboring temporal clauses, and strengthened the
  date prompt to focus on the candidate action instead of older referenced events.
- Installed `phase4-narrow-extraction-v8-incomplete-status` into the same inactive 28-node Phase 4
  workflow on its normal pending source. No workflow execution occurred.
- Verified 36 focused JavaScript tests and the rollback-only database contract test. Existing
  Phase 4 latest rows and history remain unchanged; Phase 5 remains paused.

## 2026-09-08 - Phase 4 review flags manually classified

- Reviewed all 21 Phase 4 review results from sequences 98–107 against complete cleaned sources,
  candidate evidence, retained facts, raw model output, and reasons.
- Classified 5 as false review tags with usable output, 7 as incomplete because optional details
  are not safely available within the candidate evidence, and 9 as true reviews.
- Five true reviews inherit Phase 3 evidence problems; four expose Phase 4 defects in 101 c4,
  105 c3, 105 c4, and 107 c1.
- Recorded the candidate-level evidence and repair direction in
  [Phase 4 Review Audit — 2026-09-08](Phase-4-Review-Audit-2026-09-08.md). No data or workflow was
  changed, and Phase 5 remains paused.

## 2026-09-08 - Phase 4 weekday repair selectively regenerated and verified

- Loaded-model retry regenerated only sequence 98 candidate c1 and saved the correct Wednesday
  date, `2026-09-02`, as `VALID` with safeguard `ACCEPT` under the v7 extraction policy.
- Final sequences 98–107 state is 30 latest rows: 9 `VALID`, 21 `NEEDS_REVIEW`, 0 `FAILED`; 32
  append-only attempts; and no pending new-batch candidate.
- Corrected the offline date-policy audit to pass candidate title and description into the same
  validator used by the workflow. Both Phase 4 dry-runs now propose zero changes across 143 rows,
  all new-batch evidence is exact source text, and every review result has a reason.
- Restored the normal pending source, removed the temporary repair view, and verified the 28-node
  workflow is inactive. The three older sequence 97 candidates and Phase 5 were untouched.

## 2026-09-07 - Phase 4 weekday repair installed; live retry awaits configured model

- Reproduced the sequence 98 c1 date bug with a test: a Tuesday `2026-09-01` publication and
  planned Wednesday event incorrectly became `2026-08-26` instead of `2026-09-02`.
- Repaired the validator to retain a proposed ISO date only when its weekday matches the evidence
  and it is within six days of publication. All 26 focused Phase 4 policy tests pass.
- Installed version `phase4-narrow-extraction-v7-weekday-direction` in the inactive workflow.
- The selective retry produced no local-model responses because the configured
  `google/gemma-4-12b-qat` model is not currently loaded in LM Studio. Removed only that unusable
  placeholder, restored the normal pending view, and left sequence 98 c1 pending. Processing
  history remains preserved. Phase 5 was not run.

## 2026-09-07 - Phase 4 new batch processed; weekday blocker found

- Scoped the manual Phase 4 run to the 30 candidates from sequences 98–107, excluding three older
  pending candidates from sequence 97.
- The run completed with 9 `VALID`, 21 `NEEDS_REVIEW`, 0 `FAILED`, 30 history rows, and an empty
  new-batch queue. Retained evidence is exact and all review rows have reasons.
- Restored the workflow to its normal pending view, removed the temporary batch-only view, and
  confirmed the workflow remains inactive.
- Post-run validation found sequence 98 c1 stored `2026-08-26` for “Wednesday” after a Tuesday
  `2026-09-01` publication date, while the raw local-model proposal was correctly `2026-09-02`.
  Phase 4 is not accepted for this batch until the weekday normalizer is repaired and that one row
  is selectively regenerated. Phase 5 was not run.

## 2026-09-07 - Phase 3 safeguard false positive repaired

- Added a test-first safeguard rule that accepts meaning-preserving grammatical paraphrases,
  including active/passive wording, when the exact quote supports every factual detail.
- Required every rejection reason to identify a concrete absent or contradicted fact instead of
  rejecting equivalent wording or sentence structure.
- Deleted and regenerated only the owner-approved latest result for sequence 102. Candidate c2 is
  now correctly `VALID` with safeguard `ACCEPT`; all processing history was preserved.
- Final batch state is 6 `VALID`, 4 `NEEDS_REVIEW`, 0 `FAILED`; 30 candidates (25 valid, 5
  review); 14 history runs; and an empty queue. Nine focused Phase 3 tests pass. The workflow is
  inactive, Phase 4 was not run for this batch, and Phase 5 remains paused and untouched.

## 2026-09-07 - Phase 3 review flags manually classified

- Compared all six review-flagged candidates with their full cleaned articles and Phase 2 Issues.
- Confirmed five flags are correct because their saved descriptions contain details not supported
  by their selected quotes (sequence 100 c1/c3, 103 c5, 104 c1, and 107 c3).
- Found one false-positive flag: sequence 102 c2. Its evidence explicitly supports an
  EEAS-organized conference formally launching the initiative, while the safeguard rejection
  reason incorrectly claims that relationship is absent.
- No data or workflow was changed, and Phase 4/5 were not run. Next action is a narrow safeguard
  repair and selective sequence 102 regeneration after owner approval.

## 2026-09-07 - Phase 3 JSON and Main-Issue relevance blockers repaired

- Added test-first handling for an unescaped spoken quote inside the detector's strict
  `evidence_quote` field and restored the exact source slice after parsing.
- Restored the approved requirement that every Phase 3 candidate be directly relevant to its
  supplied Phase 2 Main Issue and explicitly excluded unrelated same-article events.
- Retried failed sequence 98 through the normal update path and deleted/regenerated only the
  owner-approved latest row for sequence 106. All append-only history was preserved.
- Final ten-article state: 5 `VALID`, 5 `NEEDS_REVIEW`, 0 `FAILED`; 30 complete candidates (24
  valid, 6 review); 13 history runs; empty queue. All valid quotes are exact source substrings,
  every review candidate has a reason, and the unrelated Kevin Warsh candidates are absent.
- Verified eight focused tests and kept the Phase 3 workflow inactive. Phase 4 was not run and
  Phase 5 remains paused and untouched.

## 2026-09-07 - Phase 3 new-batch run exposed two production blockers

- Ran the inactive Phase 3 workflow on owner-approved sequences 98–107 and retried only its one
  failed result. Current state: 4 `VALID`, 5 `NEEDS_REVIEW`, 1 `FAILED`; 28 retained candidates
  (22 valid, 6 review, 0 incomplete); 11 append-only processing runs; one failed source pending.
- Sequence 98 reproducibly fails on an unescaped quotation mark inside otherwise usable detector
  JSON. The current narrow JSON repair does not recognize that malformed shape.
- Manual review found two false-valid Kevin Warsh candidates in sequence 106 that are unrelated to
  its Bessent/Iran Main Issue. The live detector prompt omitted the plan's explicit relevance rule,
  and the safeguard has no Main Issue context with which to catch the omission.
- Kept the workflow inactive and stopped before Phase 4. Phase 5 remains paused and untouched.

## 2026-09-04 - Phase 2 centrality and causal grounding repaired

- Found two false-valid secondary issues in the new ten-article batch: sequences 103 and 106.
- Updated the inactive Phase 2 detector, safeguard, and repair prompts to use article headline and
  opening context, preserve the central subject/action, and reject unsupported causal wording.
- Regenerated only the affected latest results while preserving 13 append-only processing runs.
  Final batch state is 10 `VALID`, 10 evidence `VERIFIED`, 10 safeguard `ACCEPT`, 0 review/failed,
  and 0 Phase 3 candidates. Phase 5 remains paused and untouched.

## 2026-09-04 - Phase 1 new-batch cleaning residue repaired

- Audited ten new Phase 1 articles and found two opening image captions, one standalone live-update
  navigation link, and one Anadolu subscription footer in four sources.
- Added four test-first deterministic-cleaning regressions, including a safety case that preserves
  an unrelated opening paragraph, and updated the existing inactive Phase 1 processing workflow.
- Reprocessed only sequences 100, 103, 105, and 106 through the normal manual n8n execution. The
  batch now has 10 completed sources, 14 preserved Phase 1 history runs, and no Phase 2 results.

## 2026-09-04 - Phase 1 workflows renamed for clarity

- Renamed workflow `gABPryH3jTe2Ktz5` to **Terra Space - Phase 1 - Input New Article** and workflow
  `aAVDCkvD02JWkbvJ` to **Terra Space - Phase 1 - Process New Articles**.
- Verified both workflow structures are unchanged and both remain inactive.

## 2026-09-04 - Phase 4 production-readiness repair completed

- Repaired the semantic gaps found by the 20-row audit: candidate-scoped epistemic evidence,
  actor and location metonyms, actor roles, Markdown-grounded quotes, grounded month-day dates,
  actor-affiliation countries, and locations belonging to neighboring visit clauses.
- Selectively regenerated only owner-approved affected latest rows and preserved all history.
  Final state: 113 latest results, 16 `VALID`, 97 `NEEDS_REVIEW`, 0 `FAILED`, empty queue, and 249
  append-only processing-history rows.
- All 31 focused Phase 3/4 tests pass and the 113-row whole-table dry run reports zero affected
  rows. The protected replay workflow is unpublished; Phase 5 remains paused and untouched.
- Created and verified a clean D:-drive Supabase backup at
  `data/backups/supabase/20260904-165741/local-supabase.dump` (24,024,890 bytes; 1,098 readable
  `pg_restore --list` lines; SHA-256
  `3b2b34370ebb828faf3d145db3b5b787978d3a9099c661288cf85092bd1cf044`).

## 2026-09-04 - Phase 4 post-repair audit found remaining semantic gaps

- Manually audited a deterministic sample of ten `VALID` and ten `NEEDS_REVIEW` Phase 4 rows
  against each Phase 3 candidate and its evidence. Only 6/10 valid rows and 4/10 review rows were
  fully clean; four valid rows were false-valid, while six review rows retained at least one unsafe
  fact despite having the correct overall review status.
- A whole-table read-only check found 15/113 rows with epistemic evidence outside the candidate
  boundary and 4/89 locations whose name is absent from its own evidence; the latter includes both
  legitimate aliases and at least one unsupported location (`Orsk`).
- No database data changed and no clean-baseline backup was created. Phase 4 was reopened as
  `in-progress`; Phase 5 remains paused.

## 2026-09-04 - Phase 4 candidate-boundary repair completed

- Added deterministic date and location candidate-boundary validation with focused regression
  coverage for the four observed false-valid patterns.
- With owner approval, selectively regenerated the 42 affected latest rows while preserving 71
  unaffected rows and all prior processing history. The final state is 113 latest rows: 39
  `VALID`, 74 `NEEDS_REVIEW`, 0 `FAILED`, with an empty queue.
- All 13 focused Phase 3/4 tests pass, the full 113-row boundary dry run reports 0 affected rows,
  and the Phase 4 n8n workflow validates with 0 errors and 0 warnings.
- Repaired the protected replay webhook credential link, used it only for the controlled run, and
  unpublished the workflow immediately afterward. Phase 5 remains paused and untouched.

## 2026-09-03 - Phase 4 quality audit reopened reliability work

- Read-only audited five `VALID` and five representative `NEEDS_REVIEW` results against original
  Phase 1 articles. All five review rows were appropriately conservative, but only one of five
  sampled valid rows was clean.
- Confirmed false-valid date and location cases: a future programme-launch year used as the date of
  an earlier agreement, an actor/state label stored as geography, a location borrowed from a
  neighboring candidate event, and an incorrect relative-weekday resolution.
- Root cause is a validation gap: current deterministic checks enforce exact quote presence and
  output shape but do not prove candidate-level semantic relevance. Phase 4 reliability is reopened
  and Phase 5 remains blocked pending date/location boundary repairs and a new audit.

## 2026-09-03 - Phase 4 controlled replay completed

- Added and applied migration `202609030001_phase4_verified_evidence_gate.sql`, requiring verified
  Phase 3 evidence before a candidate may enter the Phase 4 pending queue. The updated database
  contract test confirms rejected evidence is excluded.
- Controlled execution `2030` processed all 113 eligible candidates. Final latest-result counts are
  50 `VALID`, 63 `NEEDS_REVIEW`, and 0 technical failures; the queue is empty.
- Diagnosed a reproducible actor-safeguard omission on a nine-actor candidate. Updated the prompt to
  require an exact decision count and complete index range, added a regression test, and repaired
  the row successfully in execution `2032`.
- Verified all 454 retained Phase 4 evidence quotes are exact cleaned-article excerpts. Processing
  history contains 115 append-only attempts. Phase 4 was unpublished afterward and Phase 5 remains
  paused.

## 2026-09-03 - Phase 3 review labels retouched and verified

- Added deterministic exact-quote restoration across harmless Markdown emphasis markers,
  capitalization differences, and spacing immediately inside quotation marks. All 6 focused
  validator tests pass; unsupported added words still fail evidence validation.
- With owner approval, deleted only the 11 latest Phase 3 `NEEDS_REVIEW` rows while preserving the
  18 valid latest rows and all processing history, then regenerated those 11 through controlled
  execution `2029`.
- Final Phase 3 state is 29 source results, 18 `VALID`, 11 `NEEDS_REVIEW`, and 0 `FAILED`, with 114
  candidates. Of these, 113 use exact source excerpts. The one rejected quote is a genuine
  non-contiguous combination of separated paragraphs; 17 other candidates remain under review
  because their descriptions contain claims not supported by their own evidence quote.
- Phase 3 was unpublished after execution. Phase 4 was not started and Phase 5 remains paused.

## 2026-09-03 - Phase 3 clean replay completed with strict evidence handling

- Replayed Phase 3 across all 29 Phase 1 sources. Final latest state is 18 `VALID`, 11
  `NEEDS_REVIEW`, and 0 `FAILED`, containing 116 event candidates.
- Verified 110 candidate evidence quotes as exact cleaned-article excerpts. The remaining 6 are
  explicitly rejected and retained for review; safeguard checks also flag descriptions whose
  claims are broader than their supporting quote.
- Diagnosed one LM Studio response containing a stray quote after an `evidence_quote` field. Added
  a narrowly scoped JSON repair with a regression test; all 3 validator tests pass.
- Resume execution `2028` finished successfully. The Phase 3 workflow validates with 0 errors and
  0 warnings and was unpublished afterward. Phase 4 was not started and Phase 5 remains paused.

## 2026-09-02 - Controlled n8n webhook access repaired

- Root-cause testing showed that the Webhook node's **Ignore Bots** option rejected n8n MCP's own
  automated request with HTTP 403. Removing that filter allowed an authenticated Phase 2 webhook
  verification call to return HTTP 200.
- Confirmed an n8n 2.32.5 operational limitation: MCP publication updates the saved active state,
  but a local n8n restart is required before the new production webhook is registered. Preserve
  this publish-then-restart step for the Phase 3 and Phase 4 controlled replay.
- Removed the same bot filter from the protected Phase 3 and Phase 4 webhook triggers. All three
  workflows validate with 0 errors and 0 warnings and are unpublished after testing.
- The Phase 2 verification used an empty pending queue. Phase 1 remains at 29 rows, Phase 2 remains
  at 29 latest and 29 history rows, and Phase 3/4 remain empty. Phase 5 remains paused.

## 2026-09-02 - Clean Phase 2 replay completed; stopped before Phase 3

- With explicit owner approval, removed 777 generated Phase 2–4 rows in dependency-safe order:
  501 processing-history rows and 276 latest-result rows. The guarded transaction preserved all 29
  Phase 1 sources.
- Owner-started Phase 2 execution `2021` completed successfully and created 29 latest rows plus 29
  new history rows. All are `VALID`, complete, and use exact cleaned-article evidence quotes.
- Phase 1 retained its baseline fingerprint. Phase 3 and Phase 4 remain empty and were not run.
- Added protected replay webhook triggers to the same inactive Phase 2–4 workflows. Automated calls
  were rejected by n8n's webhook registry before execution, so the manual Phase 2 trigger was used.
  All three workflows are unpublished. Work stopped after Phase 2 at the owner's request.

## 2026-09-02 - Phase 2 exact-evidence repair dry run passed

- Updated the inactive **Terra Space - Phase 2 - Detect Main Issues** workflow to restore accepted
  evidence quotes to exact cleaned-article substrings and to attempt at most two narrow automatic
  corrections before retaining a genuine `NEEDS_REVIEW` result.
- Added regression tests for exact quotes, invisible characters, typography normalization,
  contiguous excerpts, unsupported added words, and empty quotes; all six pass.
- A read-only dry run against the same 29 saved Phase 1 articles passed 29/29. n8n runtime
  validation reports 0 errors and 0 warnings across 20 nodes and 24 valid connections.
- The workflow remains inactive. No execution ran, no Supabase data changed, no HTML report was
  created, and Phase 5 remains paused.

## 2026-08-31 - Phase 5 conservative event-draft direction approved

- The owner chose not to manually review the 60 Phase 4 `NEEDS_REVIEW` results.
- Recorded the next planned direction: all 109 results continue automatically. The 49 `VALID`
  results become normal drafts; the 60 `NEEDS_REVIEW` results become limited drafts using only
  retained grounded facts, with rejected details omitted and unknown values left unknown.
- Review reasons and exact evidence remain traceable. Draft creation does not authorize automatic
  final-event publication or duplicate merging.
- This records direction only. No workflow, migration, table, processing run, or data change was
  created.

## 2026-08-31 - Phase 4 temporary reliability inputs removed

- With explicit owner approval, deleted exactly three empty read-only views in dependency order:
  `terra_space_phase4_exact_quote_repair_candidates`,
  `terra_space_phase4_reliability_replay_candidates`, and
  `terra_space_phase4_narrow_pilot_candidates`.
- Post-cleanup verification confirms 0 temporary views, 109 latest Phase 4 results (49 `VALID`, 60
  `NEEDS_REVIEW`, 0 `FAILED`), 392 append-only history rows, an empty normal queue, and 411/411
  retained evidence quotes found exactly in cleaned articles with none truncated.
- The inactive production workflow reads only the normal queue and validates with 0 errors and 0
  warnings across 27 nodes and 35 valid connections. The recovery workflow remains untouched.

## 2026-08-31 - Phase 4 narrow reliability replay and exact-quote repair verified

- Tightened actor and location scope around the Phase 3 candidate evidence quote while keeping the
  complete cleaned article as supporting context. Reporters, commenters, background facts, and
  related events are excluded unless they directly participate in the candidate event.
- Added conservative grounded-date preservation: an unknown or conflicting rerun date retains the
  existing grounded date and marks the result `NEEDS_REVIEW` instead of silently replacing it.
- Executions `2017` and `2018` produced identical statuses and complete fact payloads for all five
  bounded reliability candidates. Execution `2019` then completed the controlled 109-candidate
  replay with 0 failures.
- The full quote audit found three model quotes that matched only after normalization. Replaced
  normalized quote acceptance with exact cleaned-article substring validation and used execution
  `2020` to repair only those three candidates. Latest results are 49 `VALID`, 60 `NEEDS_REVIEW`,
  and 0 `FAILED`; all 411 retained evidence quotes are exact and none is truncated.
- Append-only Phase 4 history contains 392 rows. The obsolete pilot-limit pass-through node was
  removed, so the inactive workflow reads the normal empty queue directly. It validates with 0
  errors and 0 warnings across 27 nodes and 35 valid connections and retains its untouched
  recovery copy. Three
  temporary read-only input views remain disconnected and await explicit owner approval for
  deletion.

## 2026-08-31 - Phase 4 narrow pilot retained partial safeguard approvals

- Owner-started executions `2011` and `2012` each processed exactly the same five approved
  candidates and appended five history rows. Phase 4 now has 109 latest rows and 255 history rows.
- A test-first correction changed the actor and location safeguard result nodes to retain every
  valid indexed `ACCEPT` decision while omitting missing, invalid, duplicate, or rejected items.
  Eight stored-node behavior checks passed, and n8n runtime validation reports 0 errors and 0
  warnings across 28 nodes and 36 valid connections.
- The second pilot retained 6 of 7 proposed locations for one candidate and 10 of 11 proposed
  actors for another, instead of discarding the complete affected arrays. Both remain
  `NEEDS_REVIEW` with concrete omission reasons. All 34 retained evidence quotes are grounded and
  non-truncated.
- One candidate's date changed from `2026-08-11` to unknown between the two narrow runs. A full
  replay is therefore not approved. The workflow remains inactive on the five-candidate pilot
  input pending a minimal date-stability decision.

## 2026-08-31 - Phase 4 inactive narrow workflow prepared

- Created an inactive exact recovery copy of the original Phase 4 workflow in `Terra_Space`:
  **Terra Space - Phase 4 - Extract Event Facts - Backup 2026-08-31** (`Ixbz3rFqr2sbuFOs`).
- Updated the original inactive workflow to separate date/epistemic, actor, and location extraction
  and to use separate indexed actor and location safeguards. Runtime validation passes with 0
  errors and 0 warnings; non-writing structural and behavior-contract assertions also pass.
- No workflow execution or database write occurred. Read-only verification remains 109 Phase 4
  latest rows, 245 history rows, and an empty normal queue. A five-candidate pilot still requires
  separate owner approval.

## 2026-08-31 - Phase 4 narrow-extraction implementation plan prepared

- Read-only inspection of the live inactive workflow and the Phase 4 database contract confirmed
  that the existing tables can store grouped raw outputs from three narrow extraction calls and two
  narrow safeguards. No migration is needed.
- Added the implementation plan for narrow date/epistemic, actor, and location extraction,
  item-level actor/location safeguard decisions, partial-result retention, non-writing behavior
  tests, and a separately approved five-candidate pilot.
- No workflow, table, migration, or data was changed while preparing the plan.

## 2026-08-31 - Phase 4 narrow extraction adjustment approved

- The owner chose to address Phase 4's actor and location variability by improving one workflow
  run before considering stabilization through repeated runs.
- The approved design keeps the complete cleaned article as input but separates date/epistemic,
  actor-only, and location-only extraction. Actors and locations each receive a deterministic
  evidence check and a separate narrow safeguard. An unsupported individual fact is omitted and
  recorded as `NEEDS_REVIEW` without erasing other usable fields.
- The existing Phase 4 workflow remains inactive in `Terra_Space`. No workflow, migration, table,
  or data was changed while recording this amendment. All implementation and processing actions
  remain behind separate owner approval gates.

## 2026-08-28 - Phase 4 temporary operational views removed

- With explicit owner approval, removed exactly two unused view definitions:
  `terra_space_phase4_pilot_replay_candidates` and
  `terra_space_phase4_reliability_reprocess_candidates`. They contained no stored results and were
  no longer connected to the workflow.
- Verification confirms the inactive Phase 4 workflow reads the normal pending view; Phase 4 still
  has 16 `VALID` and 93 `NEEDS_REVIEW` latest rows (109 total) plus 245 append-only history rows.

## 2026-08-28 - Phase 4 controlled reliability comparison verified

- Owner-started execution `2010` ran the latest Phase 4 workflow against the same 109 Phase 3
  candidate inputs used by the initial Phase 4 attempts. The comparison baseline is the earliest
  stored attempt per candidate (five early pilot attempts plus 105 first normal-run attempts).
  The test appended exactly 109 history rows, bringing append-only history to 245 rows.
- Overall result status matched the initial result for 104/109 candidates (95.4%); the full JSON
  facts payload matched exactly for 72/109 (66.1%). Dates were identical for all 109 candidates,
  while epistemic status changed in 5, actors in 29, and locations in 25. The initial distribution
  was 16 `VALID`, 89 `NEEDS_REVIEW`, and 4 `FAILED`; the latest retest distribution is 16 `VALID`,
  93 `NEEDS_REVIEW`, and 0 `FAILED`.
- All 523 retained actor/location evidence quotes in the latest results are grounded in their
  cleaned article, none is truncated, and every review result has a reason. Phase 1-3 fingerprints
  remain unchanged. The workflow was restored to its normal empty pending view and remains inactive
  in `Terra_Space`.

## 2026-08-28 - Phase 4 controlled reliability comparison prepared

- The owner approved a single comparison run of the latest Phase 4 workflow against the same 109
  Phase 3 candidate inputs. The baseline is the earliest stored Phase 4 attempt per candidate,
  rather than execution `2005` alone, because five pilot candidates were completed before `2005`.
  That complete 109-candidate baseline contains 16 `VALID`, 89 `NEEDS_REVIEW`, and 4 `FAILED`.
- The inactive workflow now reads the temporary
  `terra_space_phase4_reliability_reprocess_candidates` view. Read-only verification found exactly
  109 inputs and an existing latest-result identifier for each, so the established update route and
  append-only history will preserve both old and new attempts. No Phase 1-3 row or Phase 4 result
  was changed while preparing the test.

## 2026-08-28 - Phase 4 Extract Event Facts completed

- Owner-started execution `2009` retried the final two technical failures successfully. Phase 4
  now has one latest result for each of the 109 retained Phase 3 Event Candidates: 17 `VALID`, 92
  `NEEDS_REVIEW`, and 0 `FAILED`. The normal pending view is empty and append-only history contains
  136 runs.
- All 536 retained actor/location evidence quotes are grounded in their linked cleaned article and
  zero are truncated. Every review result retains a concrete reason. Phase 1-3 stable fingerprints
  exactly match their recorded pre-Phase-4 baseline values. Phase 4 remains an inactive manual n8n
  workflow in `Terra_Space`; no final-event, taxonomy, normalization, duplicate, Dashboard, or
  Phase 1-3 change was made.

## 2026-08-28 - Phase 4 narrow near-JSON parser correction ready

- Root-cause inspection of the two repeated `FAILED` raw responses found a single predictable
  defect: the model emitted an allowed `epistemic_status` token without JSON quotes. The workflow
  now repairs only that field and only its six allowed vocabulary values before parsing. It does not
  repair unknown values or arbitrary malformed JSON.
- A test first reproduced the stored failure, then passed after the correction while confirming an
  unknown bare status remains `FAILED`. Both currently failed stored responses pass the corrected
  validator in non-writing checks: one would be `VALID` and the other `NEEDS_REVIEW`. No Phase 4
  row or history entry changed during this prepare-and-test step; the owner must manually retry the
  two pending candidates.

## 2026-08-28 - Phase 4 second technical retry verified

- Owner-started execution `2008` retried the 3 remaining technical failures. One recovered to
  `VALID`; two remain `FAILED` because the local model again returned non-JSON. Phase 4 now has
  17 `VALID`, 90 `NEEDS_REVIEW`, and 2 `FAILED` latest results, plus 134 append-only runs and 2
  normal pending retry candidates.
- All 529 retained actor/location evidence quotes are grounded in their Phase 1 cleaned article
  and none is truncated. The Phase 1, Phase 2, and Phase 3 stable fingerprints exactly match their
  recorded pre-Phase-4 values.

## 2026-08-28 - Phase 4 technical retry verified

- Owner-started execution `2007` successfully retried the 4 pending `FAILED` candidates without
  touching any completed Phase 4 result. One recovered to a complete `NEEDS_REVIEW` result with a
  concrete safeguard reason; three remain `FAILED` because the local model returned non-JSON again.
- Phase 4 latest results are now 16 `VALID`, 90 `NEEDS_REVIEW`, and 3 `FAILED` (109 total), with
  131 append-only processing runs and 3 normal pending retry candidates. All 507 retained
  actor/location evidence quotes are present in their cleaned articles and zero are truncated.

## 2026-08-27 - Phase 4 full normal run verified

- Owner-started execution `2005` successfully processed the approved normal queue. Phase 4 now
  covers all 109 retained Phase 3 Event Candidates with exactly 109 latest results: 16 `VALID`, 89
  `NEEDS_REVIEW`, and 4 `FAILED`. Every `NEEDS_REVIEW` result retains a reason and every `FAILED`
  result retains its technical error message. Append-only history contains 127 runs.
- Direct evidence verification found all 322 retained actor quotes and all 183 retained location
  quotes in their linked Phase 1 cleaned article, with zero retained truncation markers. The 4
  remaining failures are all non-JSON responses from the local model, not database or workflow
  write failures. The normal pending view therefore contains exactly those 4 retry candidates.
- A later manual execution `2006` was canceled after two individual retry attempts completed; the
  per-candidate design preserved those attempts without losing earlier output. Phase 1-3 remain
  unchanged: 29 sources, 29 main-issue results, 29 Event-Candidate results, 109 candidates, and
  their recorded stable fingerprints match the pre-Phase-4 baseline exactly.

## 2026-08-27 - Phase 4 normal queue restored after owner approval

- The owner approved the post-pilot normal run. The inactive Phase 4 workflow now reads the normal
  pending-candidate view rather than the temporary replay view, and the former five-candidate pilot
  node is a pass-through. A configuration check confirms that the next owner-started run will
  process all 105 eligible candidates one at a time.
- The temporary replay view was retained as an unused operational artifact; no Phase 4 results,
  history, or Phase 1-3 baseline data were deleted or changed while restoring the normal queue.

## 2026-08-27 - Phase 4 corrected pilot verified

- Owner-started execution `2004` completed successfully with the temporary five-candidate replay
limit. The latest table remains exactly 5 rows and the append-only history now has 20 runs. Four
complete results were accepted by the safeguard; their `NEEDS_REVIEW` status is caused only by
deterministic omissions such as a date not supported by a quote or an omitted unsupported location.
- Direct checks found zero retained `...`/`…` truncated actor or location quotes and zero retained
quotes absent from their Phase 1 cleaned article. This confirms both evidence protections work in a
live run, not just in the behavior tests.
- One local-model response remains non-JSON and is correctly retained as `FAILED`, without stopping
the batch. Consequently the normal pending queue is 105 candidates: 104 never processed and 1
technical retry. Phase 1-3 remain unchanged at 29/29/29 rows and 109 candidates. The temporary
replay limit remains in place pending explicit owner approval to restore the normal queue.

## 2026-08-27 - Phase 4 evidence and safeguard-boundary correction ready

- Root-cause testing showed that the validator removed trailing full stops before checking a quote,
  so a model-generated `...` truncation could be treated as ordinary terminal punctuation. The
  workflow now rejects both `...` and `…` before normal quote comparison. The test first reproduced
  the false acceptance; it then passed with the new rule. Owner-started execution `2003` succeeded
  and left zero truncated actor/location quotes in the five stored pilot results.
- The same execution received one non-JSON local-model extraction response. It is correctly stored
  as one `FAILED` latest result, so only that candidate joins the normal retry queue; the workflow
  continued and preserved all output.
- A separate behavior test proved the safeguard was still receiving candidate description and quote
  text, which explained its irrelevant candidate-based rejections. The workflow now sends the
  safeguard only the candidate title as an identity label and the prepared evidence-bearing facts.
  The test fails on the prior prompt and passes for the corrected prompt. The inactive temporary
  five-candidate replay remains the only permitted next execution.

## 2026-08-27 - Phase 4 bounded retry verified

- Owner-started execution `2002` completed successfully after correcting the temporary replay
  route to update an existing Phase 4 latest row instead of attempting a duplicate insert. It
  updated exactly the five pilot rows and appended exactly five processing-run rows; Phase 4 now
  has 5 latest rows, 10 append-only runs, and 104 normal pending candidates.
- The five outcomes remain 1 `VALID` and 4 `NEEDS_REVIEW`. All required stored evidence fields are
  non-empty where applicable. Phase 1-3 counts remain 29 sources, 29 main-issue results, 29
  Event-Candidate results, and 109 Event Candidates.
- This is not approval for a full run: the local safeguard still sometimes cites the shorter Phase 3
  candidate quote after receiving the corrected prompt, and one retained location quote is visibly
  truncated (`...`) rather than found verbatim in the cleaned article. The next change must address
  those validation rules in a new bounded test.

## 2026-08-27 - Phase 4 five-candidate pilot evaluated

- The owner-approved pilot created 5 latest Phase 4 rows and 5 append-only processing runs: 1
  `VALID` and 4 `NEEDS_REVIEW`. All five retain complete factual payloads, and each review row has
  a concrete reason. The remaining pending queue is 104 candidates.
- Phase 1-3 fingerprints are unchanged. The pilot is not approved for a full run because the
  safeguard incorrectly treats the short Phase 3 candidate quote as the sole support for Phase 4
  actors and locations, despite each fact carrying its own quote from the cleaned article.

## 2026-08-27 - Phase 4 storage and inactive workflow prepared

- Applied the approved additive Phase 4 migrations, including a follow-up validation correction for
  JSON `null` unknown dates that changes no stored row. The rollback-only database contract test
  now passes.
- Created the inactive **Terra Space - Phase 4 - Extract Event Facts** workflow
  (`EqBqTU8NoWmGuCsp`) in `Terra_Space`. It has not been executed and created no Phase 4 output.
- Read-only verification found 109 pending Phase 4 candidates, zero Phase 4 latest/history rows,
  and unchanged Phase 1-3 counts and fingerprints.

## 2026-08-27 - Phase 4 implementation plan prepared

- Activated the owner-approved Phase 4 Event Fact Extraction decision and added its test-first
  implementation plan.
- The plan requires separate owner approval before applying the additive migration, running the
  five-candidate pilot, and processing the remaining candidates. No technical pipeline or live data
  change was made while planning.
- Recorded `gpt-5.6-terra` with medium reasoning effort as the recommended execution setting.

## 2026-08-27 - Phase 4 Event Fact Extraction direction approved

- Recorded the owner's choice of a minimal per-candidate Phase 4 that extracts only an
  evidence-grounded date, epistemic status, actors, and locations.
- Kept taxonomy, normalization, deduplication, final events, Dashboard writes, and all changes to
  the verified Phase 1-3 baselines outside scope. The design remains draft pending owner review;
  no workflow, table, migration, or live data was changed.
- Corrected the post-reset Roadmap to show the verified Phase 3 baseline as completed and Phase 4
  design as planned.

## 2026-08-27 - Phase 1 to Phase 3 video redesigned as a living flow

- Replaced the owner-rejected static three-lane visual with a single continuous Remotion world.
  The camera follows a glowing data trace from an article sheet through cleaning, a grounded Main
  Issue, candidate branching, `VALID`/`NEEDS_REVIEW` retention, failed-result retry, and the final
  29 → 29 → 29 / 109-candidate state.
- Added motion-contract tests that require the 15-second duration and reject slide-like Remotion
  `Sequence` composition. Both tests, lint/TypeScript, and six representative-frame reviews passed.
  The revised 1920×1080 H.264 MP4 replaced the prior render at the same output path (6.8 MB).

## 2026-08-27 - Phase 1 to Phase 3 pipeline video delivered

- Added the isolated Remotion composition `TerraSpacePhasePipeline` without modifying the existing
  `TerraWeeklyBrief` timeline. Its 15-second visual explains the verified article-to-candidate
  pipeline, safeguards, retained review status, retry rule, and current aggregate counts.
- Rendered `terra-weekly-brief/out/terra-space-phase-pipeline.mp4` as H.264 at 1920×1080 and 30
  fps (450 frames, 1.8 MB). `npm run lint`, composition registration, and visual review of six
  representative frames passed.

## 2026-08-27 - Phase 1 to Phase 3 pipeline video planned

- Recorded a plan for a separate Remotion composition that explains the verified Phase 1 through
  Phase 3 pipeline in a maximum-15-second, silent, 1920×1080 video. It will use the existing
  `terra-weekly-brief` project but will not modify its existing weekly-brief composition.
- The storyboard covers cleaning, Main Issue detection, Event Candidate detection, evidence and
  safeguard checks, `NEEDS_REVIEW` continuation, manual retry of technical failures, the verified
  29 → 29 → 29 progression, and the 109 retained candidates. Creation and rendering remain
  contingent on owner approval of the storyboard and presentation choices.

## 2026-08-27 - Phase 3 failed-result retry verified

- The owner manually ran the retry workflow. Both former `FAILED` sources (sequences 63 and 64)
  now retain complete Event Candidate output as `NEEDS_REVIEW`; no candidate field was emptied and
  no record was removed. Sequence 63 records `FAILED -> FAILED -> NEEDS_REVIEW`; sequence 64
  records `FAILED -> NEEDS_REVIEW`.
- The latest table has exactly 29 results and the retry queue is empty: 12 `VALID` and 17
  `NEEDS_REVIEW`, holding 109 candidates (81 `VALID`, 28 `NEEDS_REVIEW`). Read-only verification
  found no incomplete candidate, no review candidate missing a reason, and no `VALID` evidence
  quote absent from the associated cleaned article.

## 2026-08-27 - Phase 3 failed-result retry ready

- Owner approved automatic requeueing of a latest technical `FAILED` Phase 3 result on the next
  manual workflow run. Migration `202608270002_phase3_failed_result_retry_queue` changes only the
  pending view: `VALID` and `NEEDS_REVIEW` remain excluded, while a failed row appears with its
  existing result ID.
- Updated **Terra Space - Phase 3 - Detect Event Candidates** so a first result uses a Supabase
  Create node and a retry uses a Supabase Update node. The run-history Supabase node always creates
  a new immutable record. No result or history row was deleted.
- Runtime validation reports 17 enabled nodes, 21 valid connections, 50 expressions, 0 errors, and
  0 warnings. The next manual execution will retry only sequences 63 and 64.

## 2026-08-27 - First Phase 3 Event Candidate pilot evaluated

- Owner-started manual execution `1994` completed with 29 latest Phase 3 results and 29 append-only
  run records for all 29 eligible sources. The pending view is empty; no duplicate latest source
  exists; Phase 1 and Phase 2 retain their 29 rows each.
- Results: 12 `VALID`, 15 `NEEDS_REVIEW`, and 2 `FAILED`. The candidate arrays retain 96 complete
  candidates: 71 `VALID` and 25 `NEEDS_REVIEW`. Read-only verification found no empty candidate
  title/description/quote, no valid quote absent from its cleaned article, and no review candidate
  without a reason.
- The two `FAILED` sources are sequences 63 and 64. Both saved the reason “detector response was
  not valid JSON”; this is a local-model response-format problem, not a data, database, or
  workflow-link failure. Do not delete or reprocess either record without a separate owner approval.

## 2026-08-27 - Phase 3 Event Candidate Detection structure ready

- Applied additive local migration `202608270001_phase3_event_candidate_detection`; it created one
  latest-result table, one append-only run table, and one pending-source view. The rollback-only
  contract test passed, including `VALID` and `NEEDS_REVIEW` Phase 2 input, candidate-array shape,
  candidate-level review protection, and append-only history behavior. The local migration registry
  records the applied version.
- Created inactive **Terra Space - Phase 3 - Detect Event Candidates** workflow
  (`S5HKb5Sfag80cvkd`) in `Terra_Space`. Supabase nodes read the pending view and create both
  latest and history records; Code nodes are limited to prompt/JSON/evidence transformations.
- Runtime validation reports 15 enabled nodes, 18 valid connections, 34 expressions, 0 errors, and
  0 warnings. No owner article was processed: the database remains at 29 Phase 1 sources, 29 Phase
  2 Issues, 29 Phase 3 pending sources, and zero Phase 3 result/history rows.

## 2026-08-27 - Phase 3 Event Candidate Detection planned

- Owner approved the minimal Phase 3 design: every complete Phase 2 Issue proceeds, including
  `NEEDS_REVIEW`; each article retains zero or more complete Event Candidates with individual
  validity/review status and evidence quote.
- Recorded [Phase 3 Event Candidate Detection](decisions/Phase-3-Event-Candidate-Detection.md)
  and its implementation plan. The scope deliberately excludes structured actors, countries,
  relationships, taxonomy, final events, and application UI. No migration or n8n workflow has
  been created, and execution still requires separate owner approval.

## 2026-08-27 - Phase 2 evidence-alignment reprocess verified

- Manual execution `1992` completed successfully with 29 complete latest results. There are no
  pending sources, null source IDs, empty Issue fields, or valid evidence quotes absent from their
  cleaned article.
- The alignment correction increased `VALID` outcomes from 13 to 21 and reduced
  `NEEDS_REVIEW` outcomes from 16 to 8. Seven remaining review rows still have a proposal broader
  than its selected quote, and one has a non-verbatim quote. Every review row retains complete
  fields and an explanatory reason.

## 2026-08-27 - Owner-approved Phase 2 evidence-alignment reprocess prepared

- With explicit owner approval, deleted exactly 29 latest Phase 2 result rows using an atomic count
  guard. All 29 sources are pending again, and all 157 append-only Phase 2 history rows remain
  preserved.
- The workflow was not run during deletion. The next owner-started run uses the quote-alignment
  correction intended to reduce unnecessary `NEEDS_REVIEW` outcomes.

## 2026-08-26 - Phase 2 evidence alignment correction prepared

- Updated detector instructions so its title and description must be supported by one selected
  evidence quote, removing details that quote does not state.
- The quote check now normalizes only harmless whitespace, quotation-mark, and terminal-punctuation
  differences. A stored-node behavioral test reproduced the prior punctuation-only rejection and
  confirmed it now proceeds with `VERIFIED` quote status. Runtime workflow validation passed with
  0 errors and 0 warnings.

## 2026-08-26 - NEEDS_REVIEW quality analysis

- Read-only analysis of the 16 review-flagged latest results found complete Issue fields in every
  row. Thirteen have a proposed title/description that is broader than its selected quote, two
  contain a wording or relationship discrepancy, and one fails only because the proposed quote
  omits terminal punctuation present in the cleaned article.
- The recommended minimal correction is a detector instruction requiring every title and
  description to be supportable by one chosen quote, plus deterministic whitespace and terminal-
  punctuation normalization in the quote check. This keeps the current one-pass pipeline and
  review flag; it does not introduce a retry or repair stage.

## 2026-08-26 - Phase 2 always-retain reprocess verified

- Manual execution `1985` completed successfully and saved 29 latest results for 29 distinct
  Phase 1 sources. There are no pending sources, null source IDs, or empty Issue title,
  description, or evidence-quote fields.
- The result mix is 13 `VALID` and 16 `NEEDS_REVIEW`. All valid rows have a verified quote and
  safeguard acceptance; direct comparison found 0 valid quotes missing from the relevant cleaned
  article. Fifteen review rows retain a verified quote and safeguard reason, while one retains its
  proposed fields with a quote-rejection flag.
- The run confirms the requested baseline behavior: every article retains an Issue payload and
  uncertain outcomes are visible as `NEEDS_REVIEW`, rather than discarded or left blank.

## 2026-08-26 - Owner-approved reprocess after always-retain correction

- With explicit owner approval, deleted exactly 29 latest Phase 2 rows using an atomic count guard.
  All 29 sources are pending again, and all 128 append-only Phase 2 history rows remain preserved.
- The workflow was not run during deletion. The next owner-started run uses the corrected rule that
  every result retains an Issue payload and flags uncertainty as `NEEDS_REVIEW`.

## 2026-08-26 - Phase 2 now always retains Issue output

- Corrected the previous misinterpretation of `NEEDS_REVIEW`: every latest Phase 2 result now
  requires a title, description, and quote. The two existing empty rows were restored from their
  saved detector outputs and marked `NEEDS_REVIEW`.
- The workflow now retains non-verbatim candidate quotes for review, keeps the proposal on safeguard
  failure, and creates a source-grounded headline/opening-text fallback when the detector is
  unavailable. All uncertainty remains explicit in the review status and reason.
- Stored-node behavioral tests confirmed both a quote-rejected candidate and a detector error retain
  non-empty Issue fields. Runtime workflow validation passed with 0 errors and 0 warnings.

## 2026-08-26 - Phase 2 NEEDS_REVIEW reprocess evaluated

- Manual execution `1983` completed successfully and produced one latest result for each of the 29
  completed Phase 1 sources: 13 `VALID`, 14 evidence-grounded `NEEDS_REVIEW` rows with their
  proposal fields retained, one quote-rejected `NEEDS_REVIEW` row without a proposal, and one
  technical `FAILED` row. There are no pending sources and no null source IDs.
- Direct comparison found 0 accepted evidence quotes absent from their cleaned articles. The 14
  retained review proposals each have a verified quote and a clear safeguard reason explaining why
  review is needed.
- The one `FAILED` row records LM Studio's “No models loaded” response. The batch still completed,
  confirming that a single technical failure no longer stops later sources. Retry that article only
  after confirming the model remains loaded.

## 2026-08-26 - Owner-approved Phase 2 full reprocess prepared

- With explicit owner approval, deleted exactly 12 partial latest Phase 2 rows—4 `VALID` and 8
  `NEEDS_REVIEW`—from `terra_space_phase2_main_issues`, using an atomic count guard.
- Verification after deletion: 0 latest results, 29 pending Phase 2 sources, and all 99 append-only
  Phase 2 history rows preserved. The workflow was not run during this deletion.

## 2026-08-26 - Phase 2 review flag renamed to NEEDS_REVIEW

- Applied migration `202608260004_phase2_needs_review_status`, replacing `WITHHELD` with the
  clearer `NEEDS_REVIEW` label in the latest Phase 2 table and its append-only history. It updated
  8 current latest rows and 83 history rows without deleting any row or field.
- The workflow now emits `NEEDS_REVIEW` for review outcomes. `VALID` and `FAILED` retain their
  meanings. n8n runtime validation passed with 0 errors and 0 warnings.

## 2026-08-26 - Phase 2 review-flagged results implemented

- Applied migration `202608260003_phase2_review_flagged_results`. It permits a `WITHHELD` result to
  retain a non-empty title, description, and exact verified quote only when the safeguard returns
  `REJECT`; the existing error message is the review reason. No new table, column, queue, or
  status vocabulary was added.
- Updated the Phase 2 workflow so safeguard rejection preserves the proposal while marking it
  `WITHHELD`, and so both detector and safeguard technical-failure paths always include the source
  ID. This means a technical model failure can be recorded as `FAILED` without stopping later
  sources.
- A rollback-only database test accepted a review-flagged result with its fields retained. Stored
  node-code tests confirmed rejected proposals retain their fields and both failure paths retain a
  source ID. n8n runtime validation passed with 0 errors and 0 warnings. The 12 rows already saved
  by the interrupted prior run retain their old shape; the owner must approve a full reprocess if
  all 29 current rows should follow the new baseline.

## 2026-08-26 - Owner-approved all-result Phase 2 reprocessing prepared

- With explicit owner approval, deleted all 29 current latest Phase 2 result rows—12 `VALID` and
  17 `WITHHELD`—from `terra_space_phase2_main_issues`. An atomic count guard limited the operation
  to exactly 29 rows.
- Verification after deletion: 0 latest results, 29 pending Phase 2 sources, 87 append-only
  Phase 2 processing-history rows preserved, and all 29 completed Phase 1 sources preserved. The
  workflow was not run as part of the deletion.

## 2026-08-26 - Phase 2 Main-Issue result reprocessing evaluated

- The latest-result table now contains exactly 29 rows for 29 distinct completed Phase 1 sources;
  there are no pending Phase 2 sources, no null source IDs, and no orphaned source links.
- Twelve rows are `VALID`, all with `VERIFIED` quote validation and safeguard `ACCEPT`. A direct
  database comparison found 0 valid evidence quotes absent from their respective cleaned articles.
  Manual sample review of all 12 found each title, neutral description, and quote aligned with its
  source article.
- Seventeen rows are safely `WITHHELD`. Their recorded safeguard reasons consistently identify
  content included in the proposed title/description but absent from its supporting quote; no
  unsupported proposal was accepted. Execution `1981` completed successfully and handled the
  remaining pending sources after prior partial executions. The result is ready for owner approval
  as the Phase 2 Main-Issue baseline.

## 2026-08-26 - Phase 2 safeguard-result mapping corrected

- Owner-started execution `1978` stopped at the latest-result Supabase save node because the
  required `status` value was null. Root-cause inspection showed that **Prepare Phase 2 Result**
  read `p2_needs_safeguard` from the raw safeguard HTTP response, which does not carry the
  prepared proposal fields. It therefore forwarded only the HTTP response and source ID.
- Updated that node to obtain the proposal from **Validate Main Issue Evidence**, preserve its
  required fields, and unwrap complete Markdown JSON fences in safeguard responses. A
  non-writing test of the stored node code using the exact fenced `{"decision":"ACCEPT"}`
  response now produces `VALID`, `VERIFIED`, and `ACCEPT` with the source ID retained. n8n runtime
  validation passed with 0 errors and 0 warnings.
- No latest result was created during the failed execution or this correction; all 29 sources are
  still pending. The workflow was not run as part of the fix.

## 2026-08-26 - Owner-approved deletion of Phase 2 withheld latest results

- With explicit owner approval, deleted exactly 29 rows with status `WITHHELD` from
  `terra_space_phase2_main_issues`. The SQL operation included a count guard, so it could delete
  only if the current matching count was exactly 29.
- Verification after deletion: 0 latest Phase 2 rows, 29 sources available through the pending
  view, 58 append-only Phase 2 processing-history rows preserved, and all 29 completed Phase 1
  sources preserved. The workflow was not run as part of this deletion.

## 2026-08-26 - Phase 2 reprocessing result evaluated

- Owner-started manual execution `1977` completed successfully and yielded one latest Phase 2 row
  for each of the 29 completed Phase 1 sources. The latest-result table has 29 distinct non-null
  source IDs, no orphaned source links, and the pending-source view is empty. Phase 1 data was not
  changed.
- The result is not suitable as a Phase 2 baseline: all 29 rows are `WITHHELD`, with zero
  verbatim quotes verified, zero safeguard calls, and zero `VALID` Main Issues. The processing
  rows therefore have valid storage coverage but no accepted analytical output.
- Inspection of saved detector responses found 17 nested `MAIN_ISSUE_FOUND` JSON responses and 12
  Markdown-fenced JSON responses. The currently installed **Validate Main Issue Evidence** node
  still rejects both because it requires only a bare top-level shape. The intended tolerant parser
  correction was not installed in that validator. No records were deleted or reprocessed during
  this read-only review; any deletion/reprocessing requires owner approval.

## 2026-08-26 - Phase 2 detector validator corrected and checked

- Updated the inactive **Terra Space - Phase 2 - Detect Main Issues** workflow's **Validate Main
  Issue Evidence** node to strip complete Markdown JSON fences and accept the observed nested
  `MAIN_ISSUE_FOUND` payload, including the model's optional `decision: YES` field. The validator
  still rejects unrecognized fields, non-JSON response bodies, missing required values, and quotes
  absent from the cleaned article.
- Validate-only update and n8n runtime validation passed with 0 errors and 0 warnings. A
  non-writing behavioral probe executed the stored node code: nested and fenced accepted examples
  reach the safeguard path with `VERIFIED` quotes, while a non-verbatim quote remains `WITHHELD`.
  The workflow was not run and no existing result was changed.

## 2026-08-26 - Phase 2 latest-result save mapping corrected

- Owner-started executions `1975` and `1976` exposed a null `phase1_source_id` at the Supabase
  latest-result create node, even though the preceding result-preparation output contained the ID.
- Updated the inactive **Terra Space - Phase 2 - Detect Main Issues** workflow
  (`AkdHAcebfzmnOSST`) to explicitly emit `p2_phase1_source_id` and map that exact property into
  the required Supabase field. A validate-only update and fresh n8n runtime validation passed with
  0 errors and 0 warnings. The workflow was not run as part of this fix.
- The two interrupted executions left six `WITHHELD` latest rows and 23 pending sources. No stored
  row was deleted or reprocessed during this mapping correction.

## 2026-08-26 - Phase 2 parser correction and owner-approved reprocessing preparation

- Updated the inactive **Terra Space - Phase 2 - Detect Main Issues** workflow
  (`AkdHAcebfzmnOSST`) so its detector parser strips a leading/trailing Markdown `json` fence and
  accepts the observed `{"MAIN_ISSUE_FOUND": {...}}` response with either title/description field
  names, in addition to its original expected result shapes. The verbatim evidence-quote check and
  independent local-AI safeguard remain required for a valid result.
- A static parser update check and n8n runtime validation both passed; runtime reported 0 errors and
  0 warnings. The workflow remains inactive and was not run again.
- With explicit owner approval, deleted exactly 29 `WITHHELD` latest-result rows from
  `terra_space_phase2_main_issues`. All 29 append-only history rows were preserved, all 29 Phase 1
  sources remain unchanged, and the pending-source view now exposes 29 sources for one owner-started
  reprocessing run.

## 2026-08-26 - First Phase 2 Main-Issue run evaluated

- Manual n8n execution `1974` completed successfully and processed all 29 completed Phase 1
  articles. It created 29 latest Phase 2 rows and 29 append-only history rows; Phase 1 data was
  unchanged.
- All 29 results are safely `WITHHELD`. The detector parser expected
  `{"status":"MAIN_ISSUE_FOUND","main_issue":{...}}`, but the local model returned a different
  `{"MAIN_ISSUE_FOUND":{...}}` shape and often wrapped it in a Markdown JSON fence. The workflow
  therefore never performed exact-quote validation or the independent safeguard, and no result was
  accepted as valid.
- This is a prompt/parser-contract issue, not evidence that the articles lack Main Issues. No
  corrective workflow or data change was made during the read-only evaluation; reprocessing needs
  separate owner approval.

## 2026-08-26 - Terra Space database field descriptions completed

- Applied additive migration `202608260002_terra_space_field_descriptions`, adding plain-language
  descriptions to every column in the current four `terra_space_*` tables.
- Verification found 0 columns without descriptions. No workflow behavior or stored article/Main
  Issue data changed.

## 2026-08-26 - Phase 2 Main-Issue workflow implemented and ready

- Applied additive migration `202608260001_phase2_main_issue_foundation`; its rollback-only
  contract test passed and left the existing 29 Phase 1 sources unchanged with zero Phase 2 rows.
- Created inactive **Terra Space - Phase 2 - Detect Main Issues** (`AkdHAcebfzmnOSST`) in
  `Terra_Space`. It uses Supabase nodes for source selection and persistence, processes one source
  at a time, and runs local Main-Issue detection plus an independent safeguard.
- Runtime validation returned 0 errors and 0 warnings. No article was processed. The next action is
  the owner's first manual execution followed by a read-only quality review.

## 2026-08-26 - Phase 2 Main-Issue detection approved

- The owner approved a new post-reset Phase 2 focused only on detecting one grounded Main Issue
  for each unprocessed completed Phase 1 source. Countries, actors, event candidates, and final
  events are deliberately excluded for now.
- Recorded [Phase 2 Main-Issue Detection](decisions/Phase-2-Main-Issue-Detection.md): an exact
  source-quote check and an independent local-AI safeguard are both required before a result can
  be `VALID`; otherwise it is retained as `WITHHELD` or `FAILED` with append-only run history.

## 2026-08-26 - Verified Phase 1 cleaning baseline locked

- The owner-approved corrected manual processor cleaned all 29 requeued Phase 1 sources (sequences
  46–74). Every saved cleaned result is non-empty and every source is `completed`.
- A read-only article-by-article comparison confirmed no accidental model reply and no missing main
  reporting section. Any removed section was limited to clear page clutter; the four shortest
  retained results were checked individually.
- Recorded [Verified Phase 1 Cleaning Baseline](decisions/Verified-Phase-1-Cleaning-Baseline.md):
  future cleaner changes require owner approval and the same raw-versus-cleaned verification.

## 2026-08-26 - Blank processor results fixed and requeued

- Fixed the processor field-name mismatch by mapping the Supabase `raw_content_text` into the
  pre-cleaner's expected field. Added a **Has Nonempty Cleaned Text** gate so an empty value reaches
  the existing failed/retry path rather than the completed path. n8n runtime validation passed with
  0 errors and 0 warnings.
- With the owner's explicit approval, returned exactly the 29 sources affected by execution `1972`
  (sequences 46–74) from `completed` to `queued`, clearing their blank cleaned values. No
  processing-run history was deleted: all 29 original zero-character `SUCCESS` records remain.

## 2026-08-26 - First manual processor run found blank-output bug

- Manual execution `1972` of **Terra Space - Process All Saved Articles** completed successfully at
  the n8n level, but incorrectly saved empty `cleaned_content_text` for all 29 fetched sources and
  marked all of them `completed`. Their original raw article text remains intact.
- Evidence identifies a field-name mismatch: the pre-cleaner expects `p1_raw_content_text`, while
  the regular Supabase fetch returns `raw_content_text`. LM Studio received no article content, and
  the empty fidelity fallback was incorrectly recorded as a `SUCCESS`. All 29 new run records have
  zero cleaned characters and a guard message. No data or workflow correction was made during this
  read-only review; the affected sources must be returned to `queued` only after an approved fix.

## 2026-08-26 - Processor changed to an n8n Manual Trigger

- At the owner's request, replaced the **Terra Space - Process All Saved Articles** form trigger
  with n8n's Manual Trigger. The workflow is intentionally inactive: the owner opens it in n8n and
  clicks **Execute Workflow** whenever they want to process the queue.
- The workflow retains its regular Supabase queued/failed fetch and one-at-a-time loop. n8n runtime
  validation reported 0 errors and 0 warnings; no queued source was processed during this change.

## 2026-08-26 - Single-run processor simplified to Supabase plus explicit loop

- At the owner's request, removed the PostgreSQL node from active **Terra Space - Process All Saved
  Articles** (`aAVDCkvD02JWkbvJ`). The workflow now fetches `queued` and `failed` sources through the
  regular Supabase node, then uses an explicit batch-size-one loop before each LM Studio request.
- The owner will start only one processor run at a time. The existing claim function remains in the
  database but is no longer invoked. Structural validation passed with 0 errors and 0 warnings; the
  processor form was not run, so the 23 queued sources remain untouched.

## 2026-08-26 - Unique Phase 1 source backup rows re-entered

- The owner requested re-entry of the Excel backup through the ordinary manual intake form. Its 25
  old rows contained 23 unique source URLs and two repeated URLs. One unique article was already
  queued by the owner, so 22 remaining unique rows were submitted one at a time.
- Verification found 23 new source rows, all `queued`, all with empty `cleaned_content_text`, and
  no duplicate source URL. The two repeated old rows (sequences 14 and 33) were intentionally
  skipped by the approved duplicate rule. No new Phase 1 processing run was created; the 25 older,
  detached run-history rows remain unchanged.

## 2026-08-26 - Owner-approved Phase 1 source reset

- Exported all 25 rows and 14 columns from `public.terra_space_phase1_sources` to
  `outputs/2026-08-26-phase1-sources-export/terra-space-phase1-sources-before-reset.xlsx` before
  making any deletion.
- After the owner explicitly confirmed, deleted the 25 Phase 1 source rows. Verification found 0
  source rows remaining. The 25 append-only processing-run rows remain, with all former
  `phase1_source_id` values cleared by their existing `ON DELETE SET NULL` foreign-key rule.

## 2026-08-26 - Manual Source URL duplicate rejection implemented and verified

- Updated active **Terra Space - Input News Manual** (`gABPryH3jTe2Ktz5`) to trim submitted values
  and check the submitted `source_url` before it can reach the queue insert. A matching saved URL
  now returns `REJECTED_DUPLICATE` without creating a source, queue item, or Phase 1 processing run.
- n8n validation reports 0 errors and 0 warnings. Live duplicate submission execution `1938`
  returned the rejection result, did not execute the Supabase save node, and left the 25 saved
  source rows unchanged. See [Separated Manual Intake and Deferred Queue
  Processing](decisions/Separated-Manual-Intake-and-Deferred-Queue-Processing.md).

## 2026-08-25 - Deferred queue processing implemented and verified

- Updated active **Terra Space - Input News Manual** (`gABPryH3jTe2Ktz5`) to queue-only intake:
  author is optional, valid inputs save with `processing_status = queued`, and its execution path
  no longer includes LM Studio or a Phase 1 processing run.
- Created and activated **Terra Space - Process All Saved Articles** (`aAVDCkvD02JWkbvJ`) inside the
  n8n `Terra_Space` folder. Its owner-triggered form repeatedly claims exactly one eligible source,
  runs the existing approved cleaner, records success/failure, and keeps working through the queue.
  Failed items retry on the next owner-triggered run; a source stranded as `processing` becomes
  eligible after 15 minutes.
- Added migration `202608250001_phase1_queue_claim`. Its rollback-only SQL checks passed for queued,
  failed, stale, and empty states; anonymous and authenticated roles cannot call it. Both workflows
  passed n8n validation with 0 errors and 0 warnings. A live empty-queue form submission reached the
  database and completed without changing a source. See [Deferred Phase 1 Queue Processing
  Implementation Plan](plans/2026-08-25-deferred-phase1-queue-processing.md).

## 2026-08-25 - Deferred queue-processing implementation started

- After the owner's instruction to execute the approved direction, wrote the active [Deferred
  Phase 1 Queue Processing Implementation
  Plan](plans/2026-08-25-deferred-phase1-queue-processing.md). It specifies queue-only intake,
  an owner-triggered processor in `Terra_Space`, atomic one-at-a-time database claims, retry of
  failed articles, and validation without synthetic live submissions.

## 2026-08-25 - Deferred manual collection and queue-processing direction

- The owner approved keeping one-at-a-time article entry while decoupling it from AI processing.
  Input News Manual will become intake-only and save each valid article as `queued` without calling
  LM Studio. A separate owner-triggered workflow will process every `queued` and `failed` source,
  continue past individual failures, and retain each outcome for the next run.
- The new workflow will be created in the n8n `Terra_Space` folder. This is a Phase 1 cleaning
  direction only; downstream processing remains part of the post-reset pipeline design. No workflow
  or database change was made while agreeing this direction. See [Separated Manual Intake and
  Deferred Queue Processing](decisions/Separated-Manual-Intake-and-Deferred-Queue-Processing.md).

## 2026-08-25 - Input News Manual cleaning safeguard and n8n placement rule

- The owner approved a conservative update to the active **Terra Space - Input News Manual**
  workflow. It expands deterministic removal of clearly-labelled standalone photo credits,
  contributor credits, and Markdown markers; retains LM Studio cleaning; and rejects any LM Studio
  response that removes a pre-cleaned source paragraph or adds/rewrites a paragraph. Rejected model
  output is preserved as audit evidence while the deterministic text is saved instead.
- The prompt now explicitly keeps reporter-written long/live-blog/BBC content and support/helpline
  text. Existing retained source rows were not changed, and duplicate-submission prevention was not
  added. n8n runtime validation reported 0 errors and 0 warnings. A stale-draft publication omitted
  six required internal-input types; the types were restored immediately and the active workflow was
  revalidated before completion.
- The owner decided that every newly created Terra Space n8n workflow must be placed in n8n's
  `Terra_Space` folder. See [Terra Space n8n Workflow Folder
  Placement](decisions/Terra-Space-n8n-Workflow-Folder-Placement.md).

## 2026-08-25 - Read-only Input News Manual cleaning audit

- At the owner's request, audited the live **Terra Space - Input News Manual** n8n workflow and all
  25 retained `terra_space_phase1_sources` rows, comparing `raw_content_text` against
  `cleaned_content_text` row by row rather than judging by length alone.
- Result: 15 of 25 rows fully clean, 8 with minor leftover photo-caption/credit junk, 2 with
  possible overcleaning (a few genuine sentences dropped on long BBC articles), 0 with material
  junk. Root causes mapped to three nodes: the deterministic caption regex is too narrow, the local
  LM Studio cleaning step is inconsistent on ambiguous captions and long documents, and the
  length-only safety net cannot detect content-level fidelity loss. Recorded in [Feedback
  Backlog](Feedback-Backlog.md#input-news-manual-cleaning-leaves-minor-junk-and-drops-some-real-content-on-long-articles-2026-08-25).
- Strictly read-only: no workflow, data, or schema was changed.

## 2026-08-24 - Owner-approved pipeline and derived-data reset

- Created and verified a full local Supabase recovery backup at
  `data/backups/supabase/20260824-173329/terra-space-before-pipeline-reset.dump`, plus copies of
  the four former live workflows in `.n8n-backups/20260824/`.
- With explicit owner approval, dropped 31 `terra_space_*` tables and four dependent Issue-first
  views. Only `terra_space_phase1_sources` and `terra_space_phase1_processing_runs` remain, so the
  original submitted articles and their Phase 1 history are retained.
- Permanently deleted **Full News Processing**, **Event Candidates**, **Event Records**, and
  **Issue-first Analysis** after deactivating them. **Input News Manual** remains active, and the
  retired n8n experiments remain untouched.
- Marked the former [Terra Space Operating Guide](Terra-Space-Operating-Guide.md) and [Active
  Workflow Boundary](decisions/Active-Workflow-Boundary.md) as superseded. A new approved design
  is required before rebuilding the normal end-to-end pipeline.

## 2026-08-22 - Live workflow boundary and operating guide established

- With owner approval, established five supported n8n workflows for normal Terra Space operation:
  Full News Processing, Input News Manual, Event Candidates, Event Records, and Issue-first
  Analysis. Full News Processing remains the single normal article-submission entry point.
- Moved six confirmed inactive Terra Space experiments to the n8n folder `Terra Space — Retired
  (do not run)` through n8n MCP. They remain inactive and preserved; none was deleted, reactivated,
  or otherwise changed.
- Added the visual, plain-language [Terra Space Operating Guide](Terra-Space-Operating-Guide.md),
  covering the full flow, validation outcomes, and data scheme; recorded the durable [Active
  Workflow Boundary](decisions/Active-Workflow-Boundary.md) decision.

## 2026-08-22 - First new-article validation after Issue-first v3

- The owner submitted the AP News article *Taiwan proposes a record $35B defense budget for 2027
  as China’s military pressure grows* through the normal Full News Processing form. Execution
  `1920` completed successfully: Phase 2 found six candidates and Phase 3 produced four `FINAL`
  Events plus two `EXCEPTION` records.
- The independent Issue-first v3 run succeeded and stored one valid Issue with five valid Issue
  Events. It correctly stored zero relationships because no complete explicit relationship evidence
  qualified. The read API then returned 25 valid Issues. This is a live pipeline result; no Issue,
  Event, relationship, or source was manually edited.

## 2026-08-22 - Local application startup configuration repaired

- With owner approval, repaired the saved local `.env`: it now defines the required primary
  database URL and aligns the read-only Supabase URL with this machine's configured local database
  port (`55422`). Credentials are not recorded in Project Knowledge.
- Fully recreated the Terra Space application from the saved configuration, with no session-only
  override. The backend became healthy, the Issues API returned HTTP 200 with 24 records, and the
  browser screen showed `24 VALID` without an unavailable-data message. This was configuration and
  read-only verification only; no pipeline or database data changed.

## 2026-08-22 - Read-only live Issue screen verified

- Started the local Terra Space application and checked `/issues` through its normal browser
  route. The page and its read API returned 24 valid Issues and the relationship map; this matches
  the latest Issue-first projection. No browser action changed an Issue, Event, or database row.
- The verification exposed a local startup-configuration mismatch: the saved `.env` lacks the
  required primary database URL and its read-only Supabase URL still uses the retired `54322`
  port, while this machine's local Supabase database uses `55422`. A session-only runtime override
  made this verification possible without persisting credentials. The next step requires owner
  approval to repair the local `.env`, followed by a clean-restart check.

## 2026-08-22 - Issue-first v3 non-inferential normalization activated

- With owner approval, updated the active **Terra Space - Issue-first Analysis** workflow through
  n8n MCP. `issue-first-v3` tells the local model that relationships are optional, and a new
  read-only country-reference lookup plus normalizer removes only Events or relationships that do
  not satisfy the pre-existing explicit evidence rules. No field is repaired, expanded, mapped, or
  inferred; the existing guarded database recorder remains the final authority.
- The active workflow has 11 nodes and n8n runtime validation reported 0 errors and 0 warnings.
  Its prior version remains available in n8n version history for rollback.
- A first controlled reprocess did not produce a model response because LM Studio was offline:
  the n8n container received `ECONNREFUSED` when contacting port 1234. The recorder safely kept
  that as a failed historical run. Once LM Studio was restored, all 13 affected sources were
  reprocessed sequentially through Issue-first only. The final latest-run projection is 24
  successful sources, 24 valid Issues, 114 valid Issue Events, and 5 complete relationships. See
  [Issue-first Independent Evidence Retention](decisions/Issue-First-Independent-Evidence-Retention.md).

## 2026-08-22 - Read-only Issue-first withheld-run review

- Reviewed the 13 latest withheld Issue-first runs without changing a workflow or database row.
  Every main-Issue evidence quote is an exact source substring, so the bottleneck is the current
  all-or-nothing outcome for invalid optional Events and relationships, not the article-level
  Issue evidence.
- Applying the existing checks independently shows 48 of 54 proposed Events have valid exact
  evidence quotes, while only 3 of 18 relationships meet every explicit actor, country, ISO,
  location, and quote requirement. The safe follow-up is to drop invalid optional components in
  the pipeline without rewriting or inferring any value, retain the guarded recorder as final
  authority, then reprocess the affected sources after owner approval.

## 2026-08-20 - Issue-first evidence-grounding follow-up recorded

- After the full fresh rebuild, 13 of 24 sources were intentionally withheld from Issues because
  the model output did not satisfy exact quote, actor, or country/location grounding rules.
- Recorded the owner-visible follow-up in the [Feedback Backlog](Feedback-Backlog.md#issue-first-coverage-is-limited-by-evidence-grounding-2026-08-20): improve the pipeline and reprocess
  affected sources, never manually repair the analytical result.

## 2026-08-20 - Owner-approved fresh rebuild from all saved articles

- Created and verified a full local Supabase backup before the reset. The reset retained all 24
  Phase 1 source articles and stable configuration/reference data, while removing only derived
  Phase 2, Phase 3, and Issue-first output and run history.
- Reprocessed every retained source sequentially through the active n8n Phase 2, Phase 3, and
  Issue-first workflows. The existing single-source Phase 2 and Phase 3 chat entry points were
  made explicit and validated through MCP (0 errors / 0 warnings) for this controlled operation;
  the ordinary main workflow remains unchanged.
- Rebuilt outputs: 85 Events (61 `FINAL`, 24 `EXCEPTION`), 11 valid Issues, 48 valid Issue
  events, and 2 complete evidence-backed relationship arcs. All 24 sources have both a Phase 2
  result and an Issue-first run. Thirteen Issue-first results were correctly withheld by pipeline
  validation, with no manual correction or location inference.

## 2026-08-20 - Verbatim evidence quote fix verified in the live Issue-first branch

- Updated the active n8n Issue-first prompt through MCP to `issue-first-v2`: every evidence quote
  must be copied character-for-character as a continuous article substring, with no abbreviation,
  paraphrase, or substitution. Workflow validation reported 0 errors and 0 warnings.
- Reprocessed only the first newly submitted article through the Issue-first branch. The new run
  succeeded, publishing one valid Issue, 5 valid Issue events, and 1 complete evidence-backed
  actor relationship. The prior failed validation run remains in its run history.
- The read API confirms the current total is 10 valid Issues and 40 valid Issue events. This
  resolved the demonstrated prompt-quality defect without manual correction or an inferred fact.

## 2026-08-20 - First live article check after main integration

- The first newly submitted real article completed the main n8n workflow successfully (execution
  `1825`): Phase 2 found 6 candidates, and Phase 3 produced 5 final Event records plus 1
  expected pipeline exception.
- Issue-first processed the same source but withheld the proposed Issue. Its first event quote
  used “The UAE” where the source said “The United Arab Emirates”; quote validation correctly
  requires the exact source wording.
- This is a pipeline-quality finding, not a manual-review task and not a technical workflow
  failure. If pursued, fix the Issue-first prompt/normalization to preserve verbatim quotes and
  reprocess the source through the normal pipeline. The valid Issue total remains 9 Issues and
  35 Issue events.

## 2026-08-20 - Issue-first main release checkpoint and runtime consolidation

- Simplified the application header: the global LM Studio connection indicator was removed.
  Processing is handled by the backend and n8n, while the Local AI controls remain available in
  Settings.
- Improved the Issues screen's failure behavior. If its read-only API connection is unavailable,
  it now shows an unavailable-data message instead of incorrectly showing `0 valid`. The local
  read-only connection was restored and verified with 9 valid Issues and 35 valid Issue events.
- The verified Issue-first work is integrated into local `main` at merge commit `03db2d8` and
  release tag `terra-space-main-2026-08-20`. The pre-merge checkpoint tag
  `issue-first-preview-2026-08-20` remains available as a rollback reference.
- `terra_space` is the single canonical local application runtime. The obsolete Issue-first
  preview and two disposable test database containers were removed without deleting volumes or
  Supabase data. The running main frontend/backend, local Supabase, and n8n services were kept.
- Final checks confirmed that `/api/issues` and the rendered Issues page both report 9 valid
  Issues. The globe currently has no relationship arcs because no accepted article supplied two
  evidence-backed, locally resolved actor locations; no location was inferred.

## 2026-08-20 - Main integrated pipeline activated through n8n MCP

- Repaired the local n8n MCP package connection, then used it to validate and activate the main
  **Terra Space - Full News Processing** workflow and its four referenced child workflows: Phase 1,
  Event Candidates, Event Records, and Issue-first Analysis.
- The main graph remains the single normal entry form. It invokes Issue-first after Phase 1 in
  parallel with the existing Phase 2/3 path; no fallback route, workflow path, or data was removed.
- No test or synthetic article was submitted during activation, so the verified 22-source rollout
  result remains unchanged.

## 2026-08-20 - Issue-first wired into the main processing workflow

- The main **Terra Space - Full News Processing** workflow now invokes the guarded Issue-first
  workflow after Phase 1 successfully saves each article. It runs in parallel with the existing
  Phase 2/3 Event path, which was not removed or rewired.
- Both workflows validated with zero structural errors before later owner-approved activation.

## 2026-08-20 - Issue-first rollout merged to local main

- The verified parallel Issue-first schema, pipeline contract, read-only API, `/issues` workspace,
  and full reprocessing result were merged into local `main`.
- The existing Dashboard and Events routes remain available as the fallback; no current route,
  workflow, or data was removed. The Issue-first workflow remains inactive after the run.

## 2026-08-16 - Issue-first first release reduced

- The owner reduced the Issue-first redesign to a small first release: parallel validated Issue
  data, evidence-backed arcs, and a new Issues screen only.
- Deferred Analytics, Pipeline Status, full-database reprocessing, and any removal of current
  Dashboard, Events, Event Review, or pipeline paths until the owner sees the new screen working
  with safe test data. The current version remains the fallback.

## 2026-08-15 - Pipeline-only data correction and Issue-first Insight direction

- The owner set a new operating rule: Terra Space must not provide event or Main Issue review.
  Data defects are corrected in the responsible pipeline stage and affected source articles are
  reprocessed, with prior run history retained.
- Recorded [Pipeline-Only Data Correction](decisions/Pipeline-Only-Data-Correction.md). It makes
  Terra Insight read-only analysis, removes the eventual standalone Events and Event Review menus,
  reserves a future cross-Issue Analytics menu, and supersedes automatic analytic visibility for
  pipeline exceptions: only fully pipeline-valid Issues enter Terra Insight.
- The in-progress design specifies an article-level Main Issue list beside an Issue-filtered globe.
  Selecting an event will show every evidence-backed source-to-target actor arc, but only when the
  pipeline has explicitly extracted and validated both actor locations.
- After the redesigned pipeline and schema are verified, the owner plans to reprocess every
  article currently available in the Terra Space database. This remains owner-triggered work.
- The current application and pipeline are the required fallback throughout the redesign,
  verification, and full reprocess. They may be removed only after owner-confirmed live success
  of the redesigned version.

## 2026-08-11 - Fixed parallel Phase 3 location-save failure in the n8n pipeline

- Investigated the latest failed `Terra Space - Full News Processing` execution (`1697`): Phase 2
  successfully produced four candidates, then child Phase 3 execution `1700` stopped at `Create
  Authoritative Phase 3 Event` with PostgreSQL error `duplicate key value violates unique
  constraint "phase3_locations_unique_place"`. Several candidates referred to the same
  country-level Syria location.
- Root cause: `terra_space_phase3_create_pipeline_event` first selected a location and then used
  a separate ordinary insert. Parallel n8n HTTP requests could all observe no location before the
  first insert committed, allowing the unique index to reject the others.
- Applied migration `20260811190923_make_phase3_location_creation_atomic`. It replaces only that
  stored function's location block with an atomic insert-or-reuse operation; no existing row was
  created, changed, or deleted by the migration. A real PostgreSQL regression test creates eight
  events concurrently for Syria and confirms one shared location row plus eight event links.
  Focused verification: 5 tests passed; `Terra Space - Event Records` validation reported 0 errors
  and 0 warnings. The master workflow was not rerun automatically because doing so would create
  real pipeline data; owner-triggered execution remains the final live check.
## 2026-08-20 - Full Issue-first reprocessing completed

- With the owner's approval, the separate Issue-first workflow reprocessed all 22 existing Phase
  1 sources sequentially, then returned to inactive. It created 9 valid Issues and 35 valid
  events. Thirteen latest runs were withheld by the pipeline's validation rules; no manual Issue
  or event review/correction occurred.
- No relationship arc was stored because no processed article supplied two fully evidence-backed,
  locally resolved actor locations. This is expected under the owner's no-inference rule, not a
  missing map rendering feature.
- The real local Issues API and screen were verified after reprocessing. The existing
  Dashboard/Events experience remains intact as fallback while the verified branch is prepared
  for its owner-approved local merge to `main`.

## 2026-08-20 - Issue-first n8n controlled pilot succeeded

- The separate Issue-first workflow completed a single real-source pilot through the guarded
  recorder, producing one valid Issue and four valid events. No relationship was stored because
  the source lacked two evidence-backed actor locations; no coordinates or arcs were inferred.
- The workflow was returned to inactive immediately after the pilot. Existing workflows and the
  fallback Dashboard/Events experience remain unchanged.
- Fixed only workflow compatibility and normalization: supported HTTP Request version, a
  per-item Code-node return format, read-only Phase 1 database query, local-model reasoning mode,
  and optional Markdown JSON fences. Pipeline validation rules were not relaxed.

## 2026-08-20 - Owner-approved Issue-first local rollout reached n8n pilot blocker

- A scoped local database backup was completed and all eight additive Issue-first migrations were
  applied to local Supabase without changing the 22 Phase 1 source articles or the fallback
  Dashboard/Events data.
- A separate inactive n8n Issue-first workflow was created and structurally validated. Its pilot
  has not run: n8n 2.32.5 fails activation in its own workflow telemetry node-graph code before
  execution begins.
- At the owner's request, the broken `n8n-nodes-opensearch` community package and its one internal
  registry record were removed after a small local backup. The package warning disappeared, but
  the activation bug remains; no Terra Space analytics data was written.

## 2026-08-16 - Reduced Issue-first Terra Insight release verified

- Implemented the owner-approved small first release: a parallel validated Issue data path,
  read-only API, standalone Issues screen, and source-grounded actor arcs.
- The existing application remains intact as fallback; no live database, current workflow, or
  current route was changed. Real-article reprocessing and replacement planning are deferred.
- Verification passed for focused backend tests (25), frontend tests (229), lint, production build,
  and disposable PostgreSQL schema/pipeline contracts.

## 2026-08-16 - Owner simplified the Issue preview

- The owner reviewed the safe `/issues` preview and kept only the article-level Issue list plus a
  single globe. Removed the selected-article card, related-event list, relationship/evidence text,
  and separate map panel.
- Selecting an Issue now displays every valid, evidence-backed actor arc from all its events on
  the globe. The screen does not invent event locations or arcs.
- Verified after the revision: 228 frontend tests, lint, production build, and Project Knowledge
  validation passed. The local preview, disposable database, local Supabase, and n8n services were
  shut down at the owner's request; no project files or database data were deleted.

## 2026-08-11 - Full Terra Space Supabase application transition implemented; live cutover verification still owner-pending

- Implemented the [Terra Space Supabase Application Transition Plan](plans/2026-08-10-terra-space-supabase-transition.md)
  task by task: backend persistence, models, document/settings services, event authority, and the
  Dashboard/Events UI all now run against local Supabase/PostgreSQL instead of SQLite, with full
  read/write authority (publish/reject/archive/restore/edit/delete) — not the prior read-only
  preview. SQLite is preserved untouched as rollback material.
- A real architectural gap (no Postgres equivalent of Terra Space's own staged extraction pipeline)
  was surfaced to the owner rather than guessed; the owner chose to retire that pipeline now that
  n8n owns event detection end to end. Recorded as [Retire Terra Space's Own Extraction
  Pipeline](decisions/Retire-Terra-Space-Own-Extraction-Pipeline.md), which supersedes the [Staged
  Event Detection Pipeline](decisions/Staged-Event-Detection-Pipeline.md) decision. The related
  [Feedback Backlog](Feedback-Backlog.md) investigation into unreliable location extraction is
  noted as moot rather than resolved, since the subsystem it was about no longer exists.
- Replaced SQLite-specific operational tooling: `Start-TerraSpace.ps1` fails fast with a
  plain-language message when `TERRA_DATABASE_URL` is missing or local Supabase is unreachable;
  `Backup-TerraSpaceDatabase.ps1`/`Restore-TerraSpaceDatabase.ps1` now use `pg_dump`/`pg_restore`
  scoped to Terra Space's own tables plus an attachments manifest, with restore requiring typed
  confirmation and refusing anything but the local Supabase instance; `tools/Test-Persistence.py`
  removes its sentinel row through the real API, not raw SQL.
- Verified with the full automated suite: 237 backend tests (SQLite unit + real PostgreSQL
  integration, including new `test_phase_prefixed_models.py` and `test_phase3_event_authority.py`),
  218 frontend tests, clean lint, clean production build. Live browser verification against the
  owner's real local Supabase instance was deliberately not run in this session — those scenarios
  publish/reject/archive/delete real event rows, and the owner chose to run that pass themselves
  rather than have it run unattended against real data. See `Current-Status.md` and `Roadmap.md`
  for what remains before final cutover activation. Not committed yet, per instruction.
- A second, separate, non-integrated implementation attempt of the same goal was found mid-session
  in a git worktree (`.worktrees/codex-supabase-app-transition`, branch
  `codex/supabase-app-transition`, 3 commits, diverged from an earlier point in `main`'s history).
  Surfaced to the owner, who chose to leave it untouched and continue this implementation on `main`.

## 2026-08-11 - Automatic event visibility and manual Dashboard filtering: pipeline exceptions now show by default

- The owner reported that a real article's four Phase 2 candidates all became Phase 3 `EXCEPTION`
  records and none appeared anywhere in Terra Space, because the just-shipped read-only bridge
  only ever showed `dashboard_status: published`. New direction: every processed event shows
  automatically, exception or not; the owner filters or hides manually instead.
- Recorded as a decision amending, not silently replacing, the locked [Fresh Phase-Prefixed
  Supabase Architecture](decisions/Fresh-Phase-Prefixed-Supabase-Architecture.md) decision's
  Dashboard-authority rule: [Automatic Event Visibility With Manual
  Filtering](decisions/Automatic-Event-Visibility-With-Manual-Filtering.md). Implemented per its
  [design](plans/2026-08-11-automatic-event-visibility-design.md) and [implementation
  plan](plans/2026-08-11-automatic-event-visibility-implementation.md), both now `completed`. The
  not-yet-started [Terra Space Supabase Application Transition
  Plan](plans/2026-08-10-terra-space-supabase-transition.md) was updated to keep this same rule at
  full cutover instead of reverting to automatic exception-hiding.
- Backend: the bridge query now returns `published`+`hidden` events (only owner-decided
  `rejected`/`archived`/`merged` stay excluded); `EventRead`/`DashboardSummaryRead` gained
  additive `pipeline_outcome`/`dashboard_status`/`exception_reason`/`exception_count` fields; a new
  `dashboard_status` query parameter drives the owner's manual filter.
- Frontend: a "Visibility" filter, a browser-only (`localStorage`) per-event hide/unhide via a new
  `hidden-events.ts`, an "Exception" badge and distinct globe pin color for exception events, and
  new "Pipeline exceptions"/"Hidden by you" Dashboard stats. A pre-existing undefined
  `--status-warning` CSS variable was found and fixed along the way, and several bridge-screen
  strings that said "approved"/"published" were corrected to "processed" language.
- Full suites: 291 backend tests and 231 frontend tests pass, clean lint, clean production build.
  Live-verified against the real local Supabase (after rebuilding the Docker images): the owner's
  real four-exception article now shows all four, each with its real recorded reason, and the
  manual visibility filter correctly narrows real data. No Supabase write was added; SQLite
  untouched.

## 2026-08-11 - Supabase Read-Only Bridge implemented; an undocumented live-database table rename discovered and reconciled

- Implemented the [Supabase Read-Only Bridge Design](plans/2026-08-11-supabase-read-only-bridge-design.md)
  per its new [implementation plan](plans/2026-08-11-supabase-read-only-bridge-implementation.md).
  Sources, Event Review, Events, and Dashboard now read local Supabase directly and read-only;
  SQLite is untouched.
- Before writing any bridge code, found that the live local Supabase database's phase-prefixed
  tables had already been renamed with a `terra_space_` prefix on 2026-08-11 (owner + Codex,
  outside git, undocumented). Confirmed intentional, then reconciled: backfilled the three
  missing migrations into `supabase/migrations/`, and corrected every stale bare-name reference
  in the checked-in `supabase/tests/*.sql` and `supabase/seed/*.sql` files, including a legacy
  source-table reference a first pass missed.
- 24 new backend tests (read-only enforcement, service queries, API routes) plus 5 rewritten
  frontend test files. Full suites: 282 backend tests and 214 frontend tests pass, clean lint,
  clean production build. Verified against the real local Supabase: Sources, Event Review, and
  Events/Dashboard all show the correct live counts, including a previously human-edited event
  title surviving correctly through the bridge.
- Both the design and implementation plan are now `status: completed`.

## 2026-08-10 - Restored a node schema accidentally corrupted while setting up a test

- While manually entering test values for `Phase 1 Internal Input`'s schema panel, the six field
  names got replaced by the whole "fieldname: example value" instruction text and lost their
  `type: "string"`. Confirmed via the API that this was saved to the live workflow, not just an
  unsaved editor view.
- Checked the master workflow's execution history before fixing: no run happened between the
  corruption and the fix, so none of the six live-test results recorded for the [n8n
  Phase-Prefixed Table Transition Plan](plans/2026-08-10-n8n-phase-table-transition.md) are
  affected.
- Restored the six fields to plain names (`p1_published_date`, `p1_title`,
  `p1_raw_content_text`, `p1_source_domain`, `p1_source_url`, `p1_author`, all `type: "string"`).
  `Terra Space - Input News Manual` re-validated at 0 errors, 0 warnings.

## 2026-08-10 - n8n Phase-Prefixed Table Transition Plan completed

- The last two live tests passed: an eventless article (master execution `1674`) reconciled at
  exactly 1/1/1/1/0/0 across the six phase-prefixed tables with Phase 3 never invoked; blank-input
  attempts on Phase 1 (`1681`/`1682`) both failed before any Supabase write. A master form
  double-submission incidentally confirmed a canceled execution leaves no partial state.
- All six required live tests from the [n8n Phase-Prefixed Table Transition
  Plan](plans/2026-08-10-n8n-phase-table-transition.md) now pass against real data: full grounded
  run, quote grounding, idempotency, human-edit survival, eventless article, blank input. Plan
  status is now `completed`.
- Three real defects were found and fixed along the way, none present in the legacy pipeline: an
  ad-`<iframe>` false positive in the Phase 1 completeness check, a `runOnceForEachItem`
  return-shape bug, and a taxonomy-lookup fan-out bug that inflated the classification prompt past
  LM Studio's context limit.
- Updated [Roadmap.md](Roadmap.md): both the Supabase foundation and the n8n transition milestones
  are now marked completed (the foundation one had been left `planned` since plan 1 finished).
- Next: the owner decides whether to start plan 3, the [Terra Space Supabase Application Transition
  Plan](plans/2026-08-10-terra-space-supabase-transition.md).

## 2026-08-10 - Idempotency and human-edit protection confirmed live for phase3_create_pipeline_event

- With the owner's explicit approval, ran a plain SQL `UPDATE` on one `phase3_events` row (title,
  `human_modified_at`, `human_modified_fields`) to simulate a human edit, since the Dashboard that
  would normally do this doesn't exist yet.
- The owner then re-ran `Terra Space - Event Records` for the same `p1_uuid` via its chat trigger
  (execution `1673`). Afterward: `phase3_events` still held exactly 3 rows for that source (no
  duplicate created) and the edited row's title/`human_modified_at`/`updated_at` were unchanged,
  as were the other two rows' `updated_at` values — even though `phase3_event_runs` correctly grew
  by 3 fresh append-only rows. Confirms `phase3_create_pipeline_event`'s idempotency and
  human-authority guarantees hold under a real rerun, not only by reading its SQL source.
- Two live tests remain on the [n8n Phase-Prefixed Table Transition
  Plan](plans/2026-08-10-n8n-phase-table-transition.md): an eventless article and a blank-input
  test on Phase 1.

## 2026-08-10 - First fully clean end-to-end run of the phase-prefixed pipeline

- Master execution `1669` (82.6s) ran one real article through Phase 1, Phase 2, and Phase 3 with
  no UUID shown to or typed by the user: `status: COMPLETED`, 3 candidates found, 3 final records
  created, 0 exceptions.
- Reconciled every table by direct read-only query: `phase1_sources` (1, completed, 2,890-char
  cleaned text), `phase1_processing_runs` (1, SUCCESS), `phase2_event_candidates`/`_runs` (1 latest
  + 1 history, 3 candidates), `phase3_event_runs` (3 rows, all attempt 1, all
  SUCCESS/CLASSIFIED/ACCEPT — no retries needed), `phase3_events` (3 rows, all
  `origin: pipeline`/`FINAL`/`published`, real `event_type_id`, `human_modified_at: null`).
- Grounding checked directly: `raw_content_text` still holds the ad `<iframe>` blocks untouched
  (8,822 chars); `cleaned_content_text` has zero `<iframe>` occurrences (2,890 chars); all 3
  candidate evidence quotes and all 3 title evidence quotes are exact substrings of the cleaned
  text.
- Confirms both the ad-iframe fix and the two Phase 3 authority-function fixes hold under a real
  run. Still outstanding: idempotency (rerun same UUID), human-edit survival, the eventless
  article, and blank/malformed-input negative tests.

## 2026-08-10 - Fixed two new defects in Phase 3's authority-function wiring, found by the owner's first real test

- After the ad-iframe fix, the owner's retry got Phase 1 and Phase 2 through cleanly (2 grounded
  candidates), then Phase 3 failed both candidates on every attempt.
- Defect 1: `Prepare Authoritative Event Payload` (added by this plan's Task 4) uses
  `mode: runOnceForEachItem` but incorrectly returned `[{ json: {...} }]` instead of the required
  `{ json: {...} }`, causing "A 'json' property isn't an object." Fixed by removing the array
  wrapper, matching every other per-item Code node in this workflow.
- Defect 2 (more serious): `Classify Event Type` failed with HTTP 400 — "request (13003 tokens)
  exceeds the available context size (8192 tokens)" — because `Get Taxonomy Nodes` (also added by
  Task 4) was connected directly downstream of `Get Active Event Types`, whose 12 output items each
  re-triggered `Get Taxonomy Nodes`'s own query, multiplying the 12 real taxonomy leaves into ~144
  duplicate entries in the classification prompt. Fixed by making both nodes parallel branches off
  `Get Phase 1 Source` (each fed exactly one item, each running exactly once) joined by a new
  `Sync Taxonomy Sources` Merge node before `Collect Active Event Types` runs. No prompt, model, or
  classification logic changed.
- `Terra Space - Event Records` re-validated at 0 errors, 0 warnings (31 nodes), still inactive.
  Neither defect reached `phase3_events` before the fix (0 rows); a re-run still needs the owner.

## 2026-08-10 - Fixed a pre-existing ad-iframe false positive found during live n8n testing

- The owner's first live test of the [n8n Phase-Prefixed Table Transition
  Plan](plans/2026-08-10-n8n-phase-table-transition.md) (executions `1657`/`1659`/`1661`) failed
  three times with "LM Studio returned an incomplete cleaned article." Reading the execution data
  back showed the model's response was actually complete; the test article's raw HTML held two
  large Google ad `<iframe>` blocks that inflated the raw-length denominator
  `Prepare Clean Text for Supabase` uses for its completeness check, so a genuinely complete
  ~2,850-character result failed an artificially high bar.
- Not caused by the table migration — the failure happens in `Remove Obvious Non-Article Text`,
  a node the migration never touched, before any Supabase write is attempted.
- Fixed: `Remove Obvious Non-Article Text` now also strips `<script>...</script>` and
  `<iframe>...</iframe>` blocks as part of its deterministic cleanup, before the completeness check
  ever reads the text. Verified by simulation; a real re-run still needs the owner.
- `Terra Space - Input News Manual` re-validated at 0 errors, 0 warnings, still inactive.

## 2026-08-10 - n8n phase-prefixed table transition: structural migration done, live tests pending

- Executed Tasks 1-5 of the [n8n Phase-Prefixed Table Transition Implementation
  Plan](plans/2026-08-10-n8n-phase-table-transition.md) at the structural/static-validation level.
  Full JSON baselines for all four workflows were exported first (git-ignored, pointer recorded at
  [plans/evidence/2026-08-10-n8n-transition/README.md](plans/evidence/2026-08-10-n8n-transition/README.md)).
- `Terra Space - Input News Manual`: now saves into `phase1_sources` and adds a new
  `phase1_processing_runs` row per submission (9 → 11 nodes).
- `Terra Space - Event Candidates`: now reads `phase1_sources` and persists latest/history into
  `phase2_event_candidates`/`phase2_candidate_runs` (21 nodes, unchanged count).
- `Terra Space - Event Records`: now reads `phase1_sources`/`phase2_event_candidates`, persists
  append-only history to `phase3_event_runs`, and creates authoritative events through the
  `phase3_create_pipeline_event` RPC instead of the removed legacy latest-row create/update path
  (33 → 30 nodes: 6 removed, 3 added). Discovered the taxonomy source is now normalized
  (`phase3_event_types` + `phase3_taxonomy_nodes`) rather than flat, and added a taxonomy-path
  reconstruction step to compensate — see the plan's Task 4 execution note.
- `Terra Space - Full News Processing` (master): needed no changes at all, since every stage-result
  field name it depends on was deliberately preserved across the table migration.
- All four workflows re-validated at 0 errors/0 warnings after their changes and confirmed still
  inactive.
- **Live execution testing is not done.** n8n only accepts external triggers on active workflows,
  and the plan requires all four to stay inactive, so the remaining test checklist items need the
  owner to run them from the n8n editor. See the plan's "Owner handoff" section. Plan status is
  `in-progress`, not `completed`.

## 2026-08-10 - Fresh phase-prefixed Supabase foundation built and verified

- Executed all five tasks of the [Fresh Phase-Prefixed Supabase Foundation Plan](plans/2026-08-10-fresh-supabase-foundation.md).
  Created 18 new phase-prefixed tables, the `phase3_create_pipeline_event` authority function,
  Row Level Security, plain-language comments, and the reference data, all beside the legacy
  tables. Nothing was dropped, emptied, renamed, or overwritten.
- Rollback material captured first: a dated SQLite copy and a 45.9 MB Supabase `pg_dump` archive,
  both checksummed and confirmed readable.
- Verified: 7 foundation checks and 5 reference-data checks pass; the browser-facing key is
  refused on every new table while the service role works; all legacy row counts are unchanged;
  all four n8n workflows remain inactive.
- The database is fresh and empty of application records by the owner's choice. Only reference
  data was carried across: the twelve approved Event Types, the approved taxonomy tree, and
  759,813 gazetteer rows.
- No workflow, application code, or cutover step was changed. Those belong to the next three plans.

## 2026-08-10 - Claude-ready Supabase execution plans written

- Decomposed the approved fresh Supabase architecture into four ordered, checkpointed plans:
  database foundation, inactive n8n transition, Terra Space application transition, and final
  cutover verification.
- The plans define exact phase-prefixed table roles, Dashboard human-authority behavior, database
  and workflow rollback points, PostgreSQL application changes, negative tests, and a separate
  owner approval gate before activation.
- Planning only: no Supabase DDL, workflow update, application change, or activation was performed.

## 2026-08-10 - Fresh phase-prefixed Supabase architecture approved

- The owner chose to replace the application's SQLite database with a fresh start in the existing
  local Supabase deployment; existing SQLite rows will not be migrated, but the database will be
  preserved as a dated read-only rollback archive.
- Approved literal `phase1_`, `phase2_`, and `phase3_` table prefixes plus PostgreSQL table/column
  comments that explain every role in plain language.
- `phase3_events` will be the shared authoritative event table. Pipeline `FINAL` records appear
  immediately in Terra Insight, exceptions remain hidden, and later pipeline executions may not
  silently overwrite human Dashboard decisions.
- Superseded the earlier Local Supabase Storage Direction and migration plan because both assumed
  existing SQLite rows would be copied.
- Planning will be decomposed into Supabase foundation, n8n transition, Terra Space transition, and
  final cutover verification. Implementation is reserved for Claude; no runtime system changed.

## 2026-08-09 - One-click full news processing built, not yet tested

- Implemented the build steps of the
  [One-Click Full News Processing Implementation Plan](plans/2026-08-08-one-click-full-news-processing.md).
  Each of the three existing stages gained an Execute Workflow Trigger and a shared input
  normalizer beside its original interactive trigger, plus one small node that returns the stage's
  agreed result contract. No cleaning rule, grounding check, taxonomy rule, safeguard, retry rule,
  or table was changed, and no existing row was touched.
- Created `Terra Space - Full News Processing` (`SwXzUU9aHg4NZ9Kx`), a nine-node orchestrator whose
  form collects the same six article fields and then calls the three stages in order, waiting for
  each. All four workflows validate at 0 errors and all remain inactive.
- Recorded two deliberate deviations in the plan: the Phase 3 aggregate's UUID fallback now reads
  the shared normalizer rather than the chat-only parse node, which would not run on the master
  path; and the master's no-candidate summary reports a Phase 2 `FAILED` result as a failure
  instead of a completion, so failure isolation stays visible.
- Production-readiness verification run 2026-08-09 with all workflows inactive. Five of six checks
  passed on the first attempt: the empty-article-text guard (`1643`/`1644`), malformed UUIDs on both
  Phase 2 (`1648`/`1649`) and Phase 3 (`1646`), and manual recovery, webhook parity and
  multi-candidate reconciliation together in `1647` and `1650`. The sixth, the no-candidate article
  (`1651`–`1653`), exposed a real defect: an article with no main issue was reported as a Phase 2
  failure rather than a successful no-candidate completion, because `event_detection_status` stays
  `NOT_RUN` and the stage-result mapping had no case for it. The plan's own internal contract table
  had the same omission. Fixed in `Build Phase 2 Stage Result` only, with the owner's approval; the
  data behaviour had been correct all along, including Phase 3 never being invoked. The re-run
  (`1654`–`1656`) confirmed the fix: the master now returns `COMPLETED_NO_CANDIDATE` with the Phase 1
  UUID preserved and no Phase 3 rows. All six checks pass; only the activation decision remains.
- The one-click path is verified end to end by master execution `1638`: one form submission ran all
  three stages in sequence with no manual UUID handling, returning 4 final records and 1 exception
  from 5 candidates, and every count reconciles with the Phase 1, Phase 2, and Phase 3 tables. All
  Phase 2 candidate quotes and Phase 3 source-actor quotes are exact substrings of the cleaned
  article.
- Phase 3 verified end to end by execution `1637`: 6 candidates, 4 `FINAL` and 2 `EXCEPTION`, with
  the stage result, the append-only run history, and the latest table all agreeing. Before the
  fixes, only 2 of the same 6 candidates were ever persisted.
- Phase 3 testing with six candidates exposed two pre-existing defects that silently deleted
  candidates: the gazetteer lookup dropped any candidate it could not match (3 of 6 lost, with no
  record, exception, or history row), and the batch persistence loop was fed twice and lost a
  record, including the run's only `FINAL` one. With the owner's explicit approval, the plan's
  Global Constraint on leaving the Phase 3 pipeline unchanged was amended to allow fixing them.
  Both are fixed by joining lookup results back onto the full candidate list in code and by removing
  the batch loop entirely; the stage summary now aggregates across all persistence runs. No
  grounding rule, prompt, model setting, gazetteer entry, taxonomy rule, safeguard, or retry rule
  was changed. Phase 3 validates at 0 errors and 0 warnings.
- First end-to-end run (master execution `1625`) confirmed the stage handoff works without any
  manual UUID copying: Phase 1 and Phase 2 both returned their contracts for UUID
  `b7c73695-0154-4b16-9dc2-ab917182be1d`, with 6 grounded candidates. Phase 3 failed immediately
  because `Get Latest Event Candidates` still filtered on the chat-only parse node, which does not
  run on the internal path. Repointed it at the shared normalizer; the chat and webhook paths are
  unaffected and Phase 3 re-validates at 0 errors. No data was rolled back.

## 2026-08-07 - Phase 3 local storage and coordinate lookup prepared

- Created Phase 3-only Supabase tables: `terra_space_event_types`,
  `terra_space_event_records`, `terra_space_event_record_runs`, and
  `terra_space_location_gazetteer`. Phase 1 and Phase 2 tables and rows were not modified.
- Seeded the twelve active Event Type leaves from the approved taxonomy tree. Imported the
  existing local GeoNames gazetteer for deterministic exact coordinate lookup: 243 country,
  71,885 admin1, and 687,685 city/regency keys. The n8n workflow is not yet created.

## 2026-08-07 - Phase 3 automated final event-record direction approved

- Recorded the [Automated Final Event Record Pipeline](decisions/Automated-Final-Event-Record-Pipeline.md).
  It supersedes universal human approval for qualified n8n pipeline records and the earlier
  four-classifier design for this pipeline.
- The approved design is: one factual enrichment call, field-level grounding, deterministic local
  coordinate resolution, one closed-taxonomy classification call, an independent local-LLM
  safeguard, and one full automatic retry. Successful records become `FINAL`; a second failure or
  rejection becomes a retained `EXCEPTION` excluded from final outputs.
- Updated the North Star to reflect automatic finalization only after these explicit safeguards.
  No database table or n8n workflow has been changed yet; a detailed schema and implementation
  plan remain subject to owner review.

## 2026-08-07 - Phase 2 Notion reference expanded

- Expanded [Phase 2 — Main Issue & Event Candidate Detection](https://app.notion.com/p/3b471e82e5d48188bccec9ad8c558aac)
  into a full operating reference: workflow input and node map, model/prompt constraints, grounding
  checks, table ownership and field purpose, latest-result versus append-only history behavior,
  status definitions, routing-fix rationale, test totals, and remaining reliability tests.
- Recorded the current live n8n state accurately: `Terra Space - Event Candidates`
  (`pO6m1mpaHz2Ae5ZR`) is inactive and has no published active version as checked on 7 August.
  No workflow settings or data were changed by this documentation update.

## 2026-08-06 - Phase 2 progress documented in Notion

- The owner renamed the active n8n workflow to `Terra Space - Event Candidates`
  (`pO6m1mpaHz2Ae5ZR`).
- Created [Phase 2 — Main Issue & Event Candidate Detection](https://app.notion.com/p/3b471e82e5d48188bccec9ad8c558aac)
  under the Terra Space Notion page. It records the active workflow, tables, grounding rules,
  early three-article repeatability results, and the next high-value tests.

## 2026-08-06 - Phase 2 candidate result table promoted from test naming

- Renamed `public.terra_space_event_candidates_test` to
  `public.terra_space_event_candidates` without deleting or rewriting its existing rows.
- Updated and published the active `Terra Space - Event` workflow so all latest-result reads and
  writes use `terra_space_event_candidates`. Renamed the related nodes to remove “Test” from the
  visible workflow. Corrected remaining internal expressions to reference the renamed preparation
  node. Workflow validation: 0 errors and 0 warnings.

## 2026-08-06 - Third article adds a stable three-run sample

- Evaluated history runs `11`–`13` for Phase 1 UUID `2851bb01-f5d5-49ed-9d47-18d76b9d11be`.
  All three returned `MAIN_ISSUE_FOUND` and `EVENT_CANDIDATES_FOUND`, each with three candidates,
  no error, exact main-issue grounding, and 9/9 exact candidate quote checks.
- All runs retained the same three event phenomena and classifications. The only variation was a
  small main-issue label wording change (“Gaza military presence” versus “Israeli military
  presence”). The latest-result table exactly matches history run `13`.

## 2026-08-06 - Second article confirms stable repeated extraction and routing fix

- Evaluated history runs `5`–`10` for Phase 1 UUID `4f3f8ed0-85fb-42b3-ad01-75af2917d7e7`.
  All six returned `MAIN_ISSUE_FOUND` and `EVENT_CANDIDATES_FOUND`, each with four candidates,
  no stored error, exact main-issue grounding, and 24/24 exact candidate quote checks.
- The same four event phenomena and classifications appeared in every run. Two wording-only title
  variants occurred: singular/plural “Russian strike(s) on cargo vessels” and “EU receives funds
  from Russian assets” versus “EU receipt of seized Russian assets.”
- The latest-result row now exists and exactly matches newest history run `10`, confirming the
  new-UUID Create route and later latest-result replacement work after the IF-condition fix.

## 2026-08-06 - New-UUID latest-result creation defect fixed

- Execution `1577` successfully wrote history `run_id` `5` for a new UUID, but failed in
  `Update Test Result` because a missing latest-result row produced an empty key and the IF node
  used “exists,” which is true even for an empty string. The attempted numeric ID was therefore
  `undefined`.
- Changed the branch to “is not empty,” validated the 18-node workflow with 0 errors and 0
  warnings, and published it. The next new-UUID run will create its latest-result row; subsequent
  runs will update that row. The history result from the failed run was preserved.

## 2026-08-06 - Four-run Phase 2 repeatability check passed for one article

- Evaluated four interactive chat runs (history `run_id` 1–4) for Phase 1 UUID
  `087cdc48-04f4-4fee-8ba9-4fee61174b65`. All four returned `MAIN_ISSUE_FOUND` and
  `EVENT_CANDIDATES_FOUND`, saved four candidates, and had no stored error.
- Verified exact grounding against the Phase 1 clean text: all 16 candidate quotes and all four
  main-issue quotes were present verbatim. The same four event phenomena and classifications were
  retained in every run. Minor wording variation occurred in the main-issue label and one working
  title (“Trump launches Iran war” versus “Trump launches Iran war with Israel”).
- The latest-result table exactly matches run `4`, confirming append-only history plus latest-row
  replacement works. This is a promising repeatability signal for one article only; it does not
  measure coverage or reliability on other article types.

## 2026-08-06 - Append-only Phase 2 run history added

- Created `public.terra_space_event_candidate_runs`, an append-only local Supabase table with a
  sequential `run_id`, Phase 1 UUID link, the same status/JSONB/raw-output fields as the latest
  result, and a `(p1_news_uuid, processed_at)` index for comparisons.
- Added `Create Run History` to the active `Terra Space - Event` workflow before its existing
  latest-result update/create branch. Every real submission will now retain a separate history row
  and still refresh `terra_space_event_candidates_test` as the current result. Workflow validation:
  0 errors and 0 warnings. An interactive chat run is still needed to verify the new write end to
  end because the local MCP chat-test route does not persist executions.

## 2026-08-06 - Phase 2 entry changed from form to chat message

- Replaced the active n8n Form Trigger with `Event Candidate UUID Chat`, followed by `Parse Phase
  1 UUID from Message`. The workflow now accepts one pasted Phase 1 UUID in a chat message and
  preserves the existing lookup, two-stage model flow, grounding checks, and replace-on-rerun
  persistence. Runtime validation: 0 errors and 0 warnings.
- The n8n MCP chat-test request was accepted, but this test route did not create a persisted
  execution record or update the test row. One interactive chat submission is still needed to
  verify this new entry point end to end.

## 2026-08-06 - Headline-style main-issue label and rerun behavior verified

- Updated the active Phase 2 workflow so `main_issue.label` must be an informative 8–15-word
  headline stating the subject, change, and consequence. Real browser execution `1570` completed
  successfully and replaced the existing test result for the same Phase 1 UUID. It stored the
  label “US military depletes long-range missile stocks, threatening future global deterrence,”
  plus four quote-grounded event candidates.
- The rerun exposed and resolved three live-workflow reliability defects: normalizing Supabase's
  numeric existing-row ID before the Update/Create branch, stripping optional Markdown JSON fences
  before parsing Gemma output, and mapping JSONB values as structured JSON rather than quoted text.
  Workflow validation remained at 0 errors and 0 warnings. This remains a single-article rerun,
  not a conclusion about reliability across varied articles.

## 2026-08-06 - First real Phase 2 candidate-detection submission succeeded

- Submitted a real Phase 1 article through the active n8n form in a browser after the MCP
  form-test route proved unable to start an execution. Execution `1563` succeeded and upserted
  one `terra_space_event_candidates_test` row with a quote-grounded main issue and three
  quote-grounded candidates. The first live attempts exposed and then fixed two implementation
  defects: Gemma may wrap valid JSON in Markdown fences, so both validators now remove only an
  outer fence before parsing; and n8n must pass JSONB values as structured values, not
  `JSON.stringify` text. The test remains an initial sample only; reliability across varied
  articles is still required.

## 2026-08-06 - Phase 2 candidate-testing infrastructure built, awaiting live form run

- Created the empty local Supabase table `public.terra_space_event_candidates_test`, linked to
  Phase 1 by a unique `p1_news_uuid` and constrained to the approved issue/candidate statuses and
  JSONB result shapes. No Phase 1 rows or columns were changed. Built and activated the 15-node
  `Terra Space - Event` n8n workflow: form UUID input, source lookup, two sequential direct LM
  Studio calls using `google/gemma-4-12b-qat`, deterministic evidence-quote grounding, and
  create-or-update persistence. n8n validation passed with 0 errors and 0 warnings. The MCP
  form-test endpoint returned n8n's generic form-loading page without creating an execution, so a
  first live browser submission remains necessary before recording reliability results.

## 2026-08-06 - Phase 2 main-issue-first candidate testing design approved

- The owner approved a new reliability-testing design for the n8n candidate detector. It uses one
  local model (`google/gemma-4-12b-qat`) in two sequential calls: first identify and ground the
  article's main issue, then detect and ground provisional event candidates using that issue as
  context. Results will be isolated in a new Supabase test table rather than altering the Phase 1
  news table. Re-running an article replaces its prior test result; raw outputs, prompt version,
  explicit stage statuses, and deterministic quote-offset checks make reliability failures visible.
  See [Phase 2 Main-Issue and Event-Candidate Testing Design](plans/2026-08-06-phase-2-main-issue-event-candidate-testing-design.md).

## 2026-07-21 - Owner: background/animus re-polish shipped but not approved as final

- Both same-day Scope 1 commits (`8ede3a7` background re-polish, `4849653` Appearance setting) were
  pushed to `main` at the owner's request, but the owner then explicitly said not to consider this
  finished — they will revisit the background and the "animus" ambient motion after their Claude
  credit resets, and only the Appearance-setting addition itself is considered settled for now.
  Recorded as an open item in the
  [Feedback Backlog](Feedback-Backlog.md#route-backgrounds-and-ambient-animus-motion-are-not-approved-yet-despite-shipping-2026-07-21)
  with the specific complaints given so far (background still too busy; motion "not the right kind"
  and "distracting rather than ambient"), and Current Status corrected so neither reads as a closed
  success story. The plan file remains `status: in-progress`. No further code changed for this entry.

## 2026-07-21 - Appearance settings added (blur/motion now user-configurable)

- Follow-up to the same-day background re-polish: the owner asked whether the blur/motion tuning
  could become a Settings feature instead of fixed values. Added a new "Appearance" panel to
  Settings backed by a per-device `localStorage` store
  (`frontend/src/lib/appearance-settings.ts` / `frontend/src/app/settings/appearance-settings.tsx`)
  exposing Background motion (on/off), Background blur, Motion intensity, Drift speed, and Scan
  band — the same four axes from the live tuning preview, applying instantly with no save step.
  `WorkspaceAmbiance` now reads these live instead of hardcoded constants. Test-writing caught two
  real bugs before shipping (`resetAppearanceSettings` was re-writing defaults into storage instead
  of clearing it; a floating-point display glitch on one slider). Verified with 217 frontend tests
  (11 new), lint, a production build, and a live browser pass; deployed to the owner's live
  container. See the [Deferred UI Polish Plan](plans/2026-07-17-ui-polish-deferred.md) Scope 1 note.

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

## 2026-09-22 - Phase 5E missing-only baseline completed

- After an exact read-only queue and protected-fingerprint check, owner-approved n8n execution
  `2198` processed only the 106 unqualified Phase 5 event records.
- Phase 5E now contains 109 latest and 109 append-only history rows: 99 `FINAL` and 10
  `NOT_FINAL`. The three earlier pilot rows are unchanged.
- The execution contained only the MCP trigger and Phase 5E nodes; no Phase 5A-5D, LM Studio,
  merge, or publish path ran. The workflow is inactive, its normal wiring is restored, and the
  temporary filter is removed.
- All captured Phase 1-5D content fingerprints were identical before and after. The live API/UI
  was not checked because the application was not running. Owner review is required before the
  next pipeline or UI/UX step.

## 2026-09-11 - Phase 5B repair run completed and stopped for proposal review

- Owner-approved execution `2148` processed exactly 37 repair inputs and finished successfully.
  The complete latest baseline is 56 `CLASSIFIED`, 53 `UNCLASSIFIED`, zero `FAILED`, and zero
  pending, with safeguard `ACCEPT` on all 109 results.
- Verification found 196 unique history rows, zero duplicate latest identities or submission keys,
  zero invalid active-type references, and exact matches for all frozen Phase 1-5A fingerprints.
- The database now contains 40 isolated `PENDING_REVIEW` proposals with exact bounded evidence and
  no automatic review, mapping, activation, merge, or publication. Thirteen Unclassified results
  have no proposal.
- Proposal names contain overlapping families that require owner/database review before Phase 5B
  can be accepted. The workflow remains inactive and Phase 5C has not started.

## 2026-09-11 - Phase 5B exact 37-record repair queue prepared

- With explicit owner approval, guarded the operation by requiring exactly 32 rejected latest rows,
  preserved history for every target, and zero linked proposals, then deleted only those 32 latest
  rows from `terra_space_phase5_event_type_classifications`.
- All 159 append-only history rows and all 10 proposals remain preserved. The database now contains
  77 latest rows and exactly 37 pending inputs: 32 without latest rows plus 5 retryable failures.
- The workflow remains inactive and no new execution occurred. Separate execution approval is still
  required before the exact 37-record repair run.

## 2026-09-11 - Phase 5B proposal and safeguard repair installed without execution

- After owner approval, followed a red-green TDD cycle for deterministic proposal evidence and the
  safeguard's two valid review modes; the complete JavaScript suite passes 123/123.
- Updated only four Phase 5B Code nodes in the existing single workflow and recorded classifier and
  safeguard prompt version `v2`. The credential-free workflow backup is synchronized.
- Live n8n validation reports 29 nodes, 38 valid connections, zero errors, and zero warnings. The
  workflow is inactive, execution `2147` is still the latest run, and Phase 5B database counts are
  unchanged.
- Stopped before reprocessing. The pending view already exposes the 5 retryable failures but
  intentionally excludes finalized results. Reprocessing all 37 affected records therefore needs
  separate approval to remove exactly the 32 rejected latest rows while retaining their append-only
  history, followed by separate execution approval.

## 2026-09-11 - Phase 5B systemic failure cause identified read-only

- Four of the five failed records first produced exact-evidence proposals, but the safeguard
  rejected them because its prompt does not state clearly that a valid Unclassified result may
  include a new-type proposal. Corrective attempts then paraphrased evidence and failed the strict
  exact-substring parser; the fifth record paraphrased immediately.
- All 32 safeguard-rejected Unclassified records exhausted three attempts. Nineteen final reasons
  explicitly treated proposals as forbidden or invalid because no active type was selected; in
  execution `2147`, 68 of 85 proposal-rejection attempts used that same mistaken rationale.
- No workflow, database data, or upstream phase was changed or rerun. The next gate is owner review
  of a narrow safeguard-prompt and deterministic proposal-evidence repair.

## 2026-09-11 - Phase 5B full-baseline run stopped with five conservative failures

- Owner-approved n8n execution `2147` attempted all 97 records remaining after the accepted pilot;
  the complete latest baseline is 53 `CLASSIFIED`, 51 `UNCLASSIFIED`, and 5 retryable `FAILED`.
- Each failure rejected an Event Type proposal whose supporting evidence was not an exact excerpt
  of the prepared event evidence. No failed record retained an assignment or proposal.
- The database contains 159 append-only classification-run rows and 10 isolated Event Type
  proposals, all `PENDING_REVIEW`, with zero duplicate latest identities or submission keys and no
  automatically reviewed or mapped proposal.
- The workflow remains inactive. Phase 5B remains in progress and paused for a narrow diagnosis and
  owner-approved repair before final verification or any Phase 5C work.

## 2026-08-07 - Phase 3 Event Records first end-to-end workflow verification

- Activated `Terra Space - Event Records` (`qsbIodzbMPxgQeRg`) and verified its full local pipeline with the existing Phase 1 UUID `087cdc48-04f4-4fee-8ba9-4fee61174b65`.
- Execution `1602` completed successfully: it read the latest Phase 2 candidate, ran the three local-model steps (factual enrichment, taxonomy, and article-only safeguard), appended an event-record run, and updated the latest Event Record. The tested record is `FINAL`, `CLASSIFIED`, and safeguard `ACCEPT`.
- Fixed a real repeat-run issue: the latest record node originally attempted to create an already-existing `candidate_key`, causing execution `1601` to fail with a unique-key error. It now updates the existing row by `candidate_key`; the history table remains append-only, so every run is still visible for evaluation.
- n8n runtime validation now reports 0 errors and 0 warnings.

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
