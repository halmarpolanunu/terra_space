---
type: Plan
title: Phase 5C Timeline and Geography Implementation Plan
description: Test-first plan for adding honest timeline references, approved event coordinates, typed actor geography, and reviewed unresolved-reference suggestions to the existing Phase 5 workflow.
tags: [project-knowledge, plan, phase-5, phase-5c, n8n, supabase, timeline, geography]
status: planned
---

# Phase 5C Timeline and Geography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this
> plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking. Do not use subagents unless
> the owner explicitly requests them.

**Goal:** Add conservative timeline, event-geography, and actor-network preparation to every
accepted Phase 5B event without guessing dates, coordinates, identities, or affiliations.

**Architecture:** Five additive Supabase tables provide approved local references, deduplicated
review suggestions, latest Phase 5C results, and append-only history. Pure JavaScript prepares
timeline and geography snapshots deterministically; an optional local-model call can enrich a new
unresolved suggestion but never authorizes a match. The existing inactive Phase 5 workflow gains
one connected 5C group after 5B and processes one event at a time.

**Tech Stack:** Local Supabase/PostgreSQL 17, n8n Manual Trigger/Webhook/Supabase/Code/HTTP
Request/IF/Loop Over Items nodes, optional LM Studio OpenAI-compatible API, the checked-in
GeoNames-based gazetteer, and Node.js built-in test runner.

**Spec:** [Phase 5C Timeline and Geography](../decisions/Phase-5C-Timeline-and-Geography.md)

## Global constraints

- Keep Phase 5A-5E in the one existing n8n workflow **Terra Space - Phase 5 - Generate and Qualify
  Events** (`FAxBx6a9fnXjLfVO`) in folder `Terra_Space`.
- Add only Phase 5C. Do not add Phase 5D or 5E placeholders.
- Phase 1-4 and Phase 5A/5B tables, rows, prompts, statuses, reasons, evidence, and facts are
  read-only.
- Preserve Phase 4 event dates and precision unchanged. Publication date is a separately labelled
  timeline reference and never an inferred event date.
- Coordinates come only from approved local references derived from the checked-in gazetteer or
  an explicit owner decision. No network geocoder, model-generated coordinate, nearest-place
  selection, centroid, or placeholder pin is allowed.
- Event Geography and Actor Network are separate outputs. Never use an actor reference as the
  event location.
- Store at most one primary typed geographic relationship per approved actor in the first version.
- Missing or unresolved geography is retained and visible; only a technical error is `FAILED`.
- Local AI may optionally prepare a `PENDING_REVIEW` suggestion but cannot approve or apply any
  coordinate, actor identity, alias, or relationship.
- Keep the workflow inactive and owner-started. A webhook may remain available for controlled MCP
  runs, but the workflow must be deactivated immediately afterward.
- Stop for owner review after every task that changes durable data or workflow state.
- Database application, reference-data application, workflow edit, pilot execution, full
  execution, review mutation, Phase 5D work, and final publication each require separate explicit
  owner approval.
- Do not commit changes unless the owner explicitly asks for a commit.

## Files and responsibilities

- Create `supabase/tests/phase5c_timeline_geography.sql`: rollback-only schema, status, reference,
  suggestion, retry, and upstream-immutability contract.
- Create `supabase/migrations/20260918110834_phase5c_timeline_geography.sql`: five additive Phase 5C
  tables, validation triggers, indexes, RLS, comments, and pending-input view.
- Create `supabase/seed/20260918_phase5c_baseline_references.sql`: coding-agent-reviewed reference rows
  for only the current 109-event baseline.
- Create `tools/n8n/phase5c-timeline-geography.mjs`: pure date, alias, place, actor, suggestion,
  status, and persistence-payload functions.
- Create `tools/tests/phase5c-timeline-geography.test.mjs`: focused conservative-behaviour tests.
- Create `tools/tests/phase5c-workflow-contract.test.mjs`: exported-workflow topology and boundary
  checks.
- Modify the existing n8n workflow only after separate approval: add one connected Phase 5C canvas
  group without creating another workflow.
- Modify `.n8n-backups/20260910/terra-space-phase5-generate-and-qualify-events.json`: keep the
  credential-free recovery export aligned with the accepted inactive workflow.
- Modify Project Knowledge only when observed checkpoints change the continuation point.

---

### Task 1: Freeze the baseline and write the failing Phase 5C database contract

**Files:**

- Create: `supabase/tests/phase5c_timeline_geography.sql`
- Read: `supabase/migrations/202609100001_phase5a_event_records.sql`
- Read: `supabase/migrations/20260910161039_phase5b_event_type_classification.sql`

**Interfaces:**

- Consumes: the verified 109 Phase 5A records and 109 accepted-for-progression Phase 5B results.
- Produces: a transaction-wrapped executable contract for the five tables and pending view.

- [x] **Step 1: Record protected counts and fingerprints read-only.**

  Record counts and full-row fingerprints for every Phase 1-5B latest/history table. Confirm 109
  Phase 5A records, 109 latest Phase 5B classifications, 56 `CLASSIFIED`, 53 `UNCLASSIFIED`, zero
  `FAILED`, and 40 `PENDING_REVIEW` Event Type proposals. Hash article-bearing rows inside
  PostgreSQL; do not print article text.

- [x] **Step 2: Write the red object-existence test.**

  Start the SQL file with `begin;`, require the following missing relations, and finish with
  `rollback;`:

  ```sql
  public.terra_space_phase5_geographic_references
  public.terra_space_phase5_actor_geographic_references
  public.terra_space_phase5_reference_suggestions
  public.terra_space_phase5_timeline_geographies
  public.terra_space_phase5_timeline_geography_runs
  public.terra_space_phase5_pending_timeline_geographies
  ```

- [x] **Step 3: Add exact constraint tests.**

  The contract must assert coordinate bounds, allowed reference kinds and precision, nonblank
  provenance, alias normalization, no alias collision across active references, valid actor kinds
  and relationship types, one primary reference per actor, deduplicated pending suggestions, one
  latest result per event, unique history submission keys, and immutable history rows.

  Test these status invariants:

  ```text
  PREPARED => error_message null
  FAILED   => error_message nonblank
  missing or unresolved geography => PREPARED, never FAILED
  EVENT_DATE basis => event_date present
  SOURCE_PUBLICATION_DATE basis => event_date null and publication date present
  ```

- [x] **Step 4: Add pending and upstream-immutability tests.**

  Assert that no-result and latest-FAILED events are pending, accepted completed results are not
  pending, and a newly mapped suggestion returns only affected completed events to the queue. Assert
  all Phase 1-5B counts and fingerprints are unchanged before rollback.

- [x] **Step 5: Run the contract and verify the intended red failure.**

  ```powershell
  Get-Content -Raw .\supabase\tests\phase5c_timeline_geography.sql |
    docker exec -i supabase_db_local-supabase psql -U postgres -d postgres -v ON_ERROR_STOP=1
  ```

  Expected: failure because the first Phase 5C table does not exist. Recheck protected
  fingerprints and stop for owner review before Task 2.

  Observed 2026-09-11: the contract stopped with
  `PHASE5C_RED: required relation public.terra_space_phase5_geographic_references does not exist`.
  All 15 protected Phase 1-5B counts and fingerprints matched before and after the run.

---

### Task 2: Create and apply the additive Phase 5C Supabase foundation

**Files:**

- Create: `supabase/migrations/20260918110834_phase5c_timeline_geography.sql`
- Test: `supabase/tests/phase5c_timeline_geography.sql`

**Interfaces:**

- Consumes: Phase 5A event identity, accepted Phase 5B classification identity, and the Task 1
  database contract.
- Produces: empty approved-reference, suggestion, latest/history storage and 109 pending inputs.

- [x] **Step 1: Verify the migration number is unused.**

  Check `supabase/migrations/` and `supabase_migrations.schema_migrations`. If
  `202609110001` is already registered, choose the next unused timestamp and use it consistently;
  never rename an applied migration.

- [x] **Step 2: Define geographic and actor reference tables.**

  `terra_space_phase5_geographic_references` stores UUID identity, canonical name, normalized
  aliases, `country|admin1|city_regency|special_area` kind, ISO3 country, optional admin/city
  labels, latitude, longitude, `country|admin1|city_regency|special_area` precision, source name,
  source version, active state, review reason, reviewer, and timestamps.

  `terra_space_phase5_actor_geographic_references` stores UUID identity, canonical actor name,
  normalized aliases, `country|government|official|organization|person|other` actor kind,
  `REPRESENTED_COUNTRY|HEADQUARTERS|NATIONALITY` relationship, one geographic-reference foreign
  key, provenance, active state, review reason, reviewer, and timestamps.

- [x] **Step 3: Enforce alias and authority rules.**

  Add validation triggers that normalize aliases with trimmed lowercase whitespace, reject blank
  or duplicate aliases, prevent overlap between active records of the same reference class, and
  reject actor references whose linked place is inactive. Coordinates must be paired and satisfy
  latitude `-90..90` and longitude `-180..180`.

- [x] **Step 4: Define the suggestion table.**

  Store `LOCATION|ACTOR` kind, normalized input, display input, optional proposed canonical name,
  proposed relationship, proposed reference ID, `SYSTEM_UNRESOLVED|LOCAL_AI` source, model and
  prompt version, reason, bounded supporting occurrences, raw output, review status
  `PENDING_REVIEW|MAPPED_TO_REFERENCE|REJECTED`, reviewer fields, and timestamps. Enforce one open
  suggestion per kind and normalized input. Mapping requires an active approved reference.

- [x] **Step 5: Define latest and append-only result tables.**

  Store Phase 5A/5B IDs, original event date and precision, technical sort date,
  `timeline_reference_date`, `EVENT_DATE|SOURCE_PUBLICATION_DATE` basis, event-geography JSON,
  actor-geography JSON, component statuses, reasons, `PREPARED|FAILED`, error, and processed time.
  The history table repeats the complete snapshot with identity `run_id` and unique
  `submission_key`. Reject update/delete on history.

- [x] **Step 6: Define targeted pending input.**

  Create `terra_space_phase5_pending_timeline_geographies` from Phase 5A plus latest Phase 5B. It
  includes CLASSIFIED and UNCLASSIFIED results, excludes only Phase 5B FAILED, and returns an event
  when it has no Phase 5C result, its latest result is FAILED, or a suggestion referenced by that
  result was mapped after it was processed.

- [x] **Step 7: Add indexes, RLS, API hardening, and comments.**

  Index normalized aliases, active reference state, suggestion review state, result component
  statuses, processed time, and upstream IDs. Enable RLS. Revoke direct `anon` and `authenticated`
  access to Phase 5C tables/view while preserving service-role n8n access. Comment every table,
  view, status, coordinate, provenance, and date-basis field in plain language.

- [x] **Step 8: Obtain explicit application approval.**

  State exactly that the migration creates five empty tables, one view, validation triggers,
  indexes, RLS, comments, and no Phase 1-5B writes. Do not apply it without owner approval.

  Creation checkpoint 2026-09-11: migration `202609110001` was confirmed unused and the migration
  file was created. Application checkpoint 2026-09-18: the owner explicitly approved application;
  local Supabase registered the migration with authoritative version `20260918110834`, and the
  local file was aligned to that registered version.

- [x] **Step 9: Apply only the approved migration and run verification.**

  Apply through the local Supabase MCP, register the migration, run the rollback-only contract,
  confirm 109 pending Phase 5C inputs and zero Phase 5C data rows, and recheck all protected
  fingerprints. Run Supabase security and performance advisors and report any Phase 5C finding.

  Verification checkpoint 2026-09-18: the rollback-only contract passed; all 15 protected counts
  and fingerprints matched; the five new tables contain zero rows; the pending view contains 109
  inputs; direct `anon` and `authenticated` grants are absent; and the Phase 5 workflow is inactive.
  Advisor review found only expected empty-table notices plus two non-blocking missing foreign-key
  index notes, which must be corrected before the pilot under a separately approved migration.

- [x] **Step 10: Stop for owner review before reference preparation.**

---

### Task 3: Prepare and approve the current-baseline reference set

**Files:**

- Create: `supabase/seed/20260918_phase5c_baseline_references.sql`
- Read: `backend/app/data/location-gazetteer.json`
- Test: `supabase/tests/phase5c_timeline_geography.sql`

**Interfaces:**

- Consumes: 39 distinct Phase 4 location label/level pairs, distinct actor/recipient names, exact
  Phase 4 evidence, and the offline gazetteer snapshot dated `2026-07-14`.
- Produces: an idempotent, coding-agent-reviewed initial approved reference set for the 109-event baseline.

- [x] **Step 1: Export the review inventory read-only.**

  Group exact location labels by level and actor labels by role without modifying data. Include
  supporting event IDs and evidence for review, but do not copy full articles into the seed file.

- [x] **Step 2: Resolve only unambiguous gazetteer entries.**

  Use exact country context and the checked-in gazetteer. Record canonical name, aliases, ISO3,
  coordinate, precision, GeoNames snapshot version, and review rationale. Leave ambiguous labels
  such as a place without sufficient country context unresolved. Exclude institutions and private
  homes from place references.

- [x] **Step 3: Prepare actor references conservatively.**

  For each proposed actor match, record canonical actor name, aliases, actor kind, one appropriate
  relationship, linked geographic reference, and evidence/provenance. Use a country-capital point
  only as a labelled affiliation anchor. Do not infer a relationship solely from a person's name.

- [x] **Step 4: Write an idempotent seed with stable explicit UUIDs.**

  Use guarded `insert ... on conflict do nothing` statements. The file must contain only entries
  individually verified by a coding agent; it must not bulk-load the full gazetteer.

- [x] **Step 5: Complete coding-agent review and present an aggregate owner checkpoint.**

  A coding agent verifies candidates using the checked-in GeoNames snapshot and reliable sources,
  records provenance and rationale, and leaves uncertain items unresolved. Present the owner with
  aggregate counts, material exceptions, alias collisions, and exclusions in plain language; do
  not require the owner to inspect individual names or coordinates. The owner may approve, edit,
  remove, or defer groups. Do not apply the seed yet.

  Draft checkpoint 2026-09-18: a 41-geography/30-actor draft passed rollback-only idempotency, but
  coding-agent review exposed a context problem. A global alias such as `Iran` would correctly map
  a government appointment while incorrectly mapping another event where Iran is only the subject
  of a warning. The current five-table design cannot record per-event include/exclude decisions.
  The draft seed is marked `DO NOT APPLY`. The owner chose to defer contextual review rather than
  add another table now. Before completing Steps 4-5, remove context-sensitive global aliases and
  accept lower initial map coverage; those items remain unresolved until an owner-requested later
  review. The live Phase 5C tables remain empty and the workflow remains inactive.

  Safe-baseline checkpoint 2026-09-18: removed the mixed-context Iran, Syria, and Ukraine country
  references and their dependent actor mappings. The remaining seed contains 38 geography and 24
  actor references. A rollback-only double-run stayed at 38/24, the full Phase 5C contract passed,
  all live Phase 5C tables remained empty, and the workflow remained inactive. Projected initial
  coverage is 32/48 location occurrences across 21 events and 55/164 actor occurrences across 30
  events. Thirteen unique location labels and 97 unique actor labels intentionally remain
  unresolved until an optional owner-requested later review.

- [x] **Step 6: Apply only the explicitly approved rows.**

  After separate approval, apply through the local Supabase MCP, rerun the database contract and
  advisor checks, confirm Phase 1-5B fingerprints are unchanged, and stop before Task 4.

  Application checkpoint 2026-09-19: after explicit owner approval, applied exactly 38 geographic
  and 24 actor references through the local Supabase MCP. No suggestions or Phase 5C results were
  created; 109 inputs remain pending. The pre-seed contract fixture used real `United States`/`US`
  aliases and therefore correctly collided with the new seed; replacing only those rollback-only
  fixtures with fictional `Contractland` aliases restored test isolation, and the full contract
  passed. The Phase 5 workflow is confirmed inactive through the n8n MCP inventory. Advisor review
  found no Phase 5C security warning and retained the two known non-blocking foreign-key-index
  notices for correction before the pilot.

---

### Task 4: Implement the pure Phase 5C transformer and optional suggestion helper

**Files:**

- Create: `tools/n8n/phase5c-timeline-geography.mjs`
- Create: `tools/tests/phase5c-timeline-geography.test.mjs`

**Interfaces:**

- Consumes: one pending event, approved geographic references, approved actor references, existing
  unresolved suggestions, and optional local-model suggestion output.
- Produces: one validated `PREPARED` or technical `FAILED` latest/history payload and zero or more
  deduplicated pending-suggestion payloads.

- [x] **Step 1: Write failing timeline tests.**

  Define and test:

  ```js
  prepareTimeline({ eventDate, precision, publicationDate })
  // => { eventDate, precision, timelineSortDate,
  //      timelineReferenceDate, timelineReferenceBasis }
  ```

  Cover exact dates, month/year technical first-day sorting, unknown-date publication fallback,
  invalid formats, and the guarantee that the original event date/precision are never rewritten.

- [x] **Step 2: Write failing event-geography tests.**

  Define `resolveEventGeographies(locations, approvedPlaces, suggestions)`. Assert all distinct
  exact approved matches are retained, coordinates/provenance are copied exactly, unresolved and
  missing locations remain visible, repeated labels reuse a suggestion, and no actor reference or
  invented coordinate can enter the event-geography array.

- [x] **Step 3: Write failing actor-geography tests.**

  Define `resolveActorGeographies(actors, approvedActors, approvedPlaces, suggestions)`. Cover
  source, participant, and recipient roles; one primary typed relationship; country-capital labels;
  organization headquarters; unknown actors; alias collisions; and private-home exclusion.

- [x] **Step 4: Write failing suggestion-helper tests.**

  Define `buildSuggestionPrompt(subject)` and `parseSuggestionOutput(raw)`. The prompt may include
  only the unresolved name, kind, role/level, and bounded evidence. The parser may return a proposed
  canonical name, relationship, and reason, never coordinates. Invalid/offline output falls back
  to a `SYSTEM_UNRESOLVED` pending suggestion and does not fail the event.

- [x] **Step 5: Write failing finalization tests.**

  Define `buildPhase5cResult(input)`. Assert component statuses, `PREPARED` for missing/unresolved
  geography, `FAILED` only for technical validation/persistence errors, deterministic submission
  keys, exact upstream IDs, and no mutation of the input object.

- [x] **Step 6: Implement the minimal pure functions.**

  Export the exact functions named in Steps 1-5. Use no network or filesystem access in the module;
  workflow nodes provide reference rows and optional model output as ordinary JSON.

- [x] **Step 7: Run focused and complete JavaScript suites.**

  ```powershell
  node --test .\tools\tests\phase5c-timeline-geography.test.mjs
  node --test .\tools\tests\*.test.mjs
  ```

  Expected: all tests pass. Stop for owner review before editing n8n.

**Task 4 checkpoint (2026-09-19):** implemented all six pure exports without network or
filesystem access. Seventeen focused tests and all 140 JavaScript tests pass. Test-first review
also caught and fixed two conservative-resolution defects: multiple aliases for one approved place
no longer create a false partial result, and out-of-range coordinates are never accepted. No n8n
workflow was edited or run, and no event was processed. Work is stopped before Task 5.

---

### Task 5: Add Phase 5C to the one existing inactive n8n workflow

**Files:**

- Create: `tools/tests/phase5c-workflow-contract.test.mjs`
- Modify: `.n8n-backups/20260910/terra-space-phase5-generate-and-qualify-events.json`
- Modify through n8n MCP: workflow `FAxBx6a9fnXjLfVO`

**Interfaces:**

- Consumes: the Phase 5C pending view and Task 4 pure functions.
- Produces: a connected one-item-at-a-time 5C workflow group using the existing manual/webhook entry
  and loop continuation pattern.

- [x] **Step 1: Write the failing workflow-contract test.**

  Assert there is still one manual trigger and one controlled webhook; Phase 5A and 5B node IDs and
  parameters are unchanged; a 5C pending-read path exists; each item prepares timeline, fetches
  approved references, resolves geography, optionally enriches only new unresolved suggestions,
  validates, writes latest/history, and returns to the loop; no 5D/5E node exists.

- [x] **Step 2: Run the contract red.**

  ```powershell
  node --test .\tools\tests\phase5c-workflow-contract.test.mjs
  ```

  Expected: failure because Phase 5C nodes are absent.

- [x] **Step 3: Obtain explicit workflow-edit approval.**

  Report the exact node group and confirm the workflow is inactive. Do not edit n8n before approval.

- [x] **Step 4: Add the Phase 5C group through n8n MCP.**

  Use PostgREST/Supabase nodes for pending inputs, approved references, suggestions, latest, and
  history. Use Code nodes backed by the tested pure functions. Call LM Studio at most once for a
  newly created unresolved subject and treat the call as optional. Both success and failure outputs
  must converge on a pending suggestion with no coordinate authority.

- [x] **Step 5: Validate the workflow and backup.**

  Run n8n runtime validation through MCP, require zero errors and warnings, confirm `active=false`,
  run focused and complete JS suites, export a credential-free backup, and compare Phase 1-5B node
  fingerprints to the pre-edit baseline. Stop before any execution.

**Task 5 checkpoint (2026-09-19):** added the Phase 5C group to the existing workflow through the
n8n MCP. It reads 5C pending inputs after 5B completes, processes one event at a time, creates only
deduplicated `SYSTEM_UNRESOLVED` suggestions, writes latest/history records, and returns to the
loop. A live pre-insert lookup prevents duplicate unresolved names across events from stopping the
run. No local-model call is used in 5C, and no 5D/5E placeholder was added. Runtime validation
reports 42 nodes, 56 valid connections, zero invalid connections, zero errors, and zero warnings.
The focused workflow contract passes 7/7, the complete JavaScript suite passes 147/147, and the
rollback-only database contract passes with protected fingerprints unchanged. The backup is
credential-free, the workflow is inactive, and no event was processed. Work is stopped before the
Task 6 pilot.

**Pilot-readiness follow-up (2026-09-19):** after separate owner approval, applied the two missing
covering indexes for `phase5b_classification_id` on the Phase 5C latest and history tables. The
related performance-advisor notices are cleared. No event data was processed.

---

### Task 6: Select, execute, and review the controlled 12-event pilot

**Files:**

- Modify only for the temporary pilot filter:
  `.n8n-backups/20260910/terra-space-phase5-generate-and-qualify-events.json`
- Test: `supabase/tests/phase5c_timeline_geography.sql`

**Interfaces:**

- Consumes: the 109 pending inputs and approved baseline references.
- Produces: exactly 12 latest Phase 5C results, 12 initial history rows, and deduplicated pending
  reference suggestions.

- [x] **Step 1: Select 12 pilot IDs read-only.**

  Cover exact, month, year, and unknown event dates; publication fallback; single, multiple,
  missing, resolved, and unresolved locations; resolved and unresolved actors/recipients; repeated
  unresolved subjects; NORMAL/LIMITED and CLASSIFIED/UNCLASSIFIED paths. Record why each ID is in
  the pilot.

- [x] **Step 2: Install only the exact pilot filter and revalidate.**

  Modify the 5C pending read only. Confirm 12 pilot rows, 97 untouched pending rows, zero workflow
  validation errors/warnings, unchanged Phase 1-5B fingerprints, and `active=false`.

- [x] **Step 3: Obtain separate pilot-execution approval.**

  Disclose the exact 12 IDs, maximum new latest/history/suggestion rows, and upper bound of optional
  local-model calls based on distinct new unresolved subjects.

- [x] **Step 4: Execute through the permanent MCP webhook and retain the execution record.**

  Publish only for the approved run if required by n8n, invoke once, monitor the execution through
  n8n MCP, and deactivate in a guaranteed cleanup step. Never retrigger after an MCP timeout without
  first checking the execution state.

  Observed: retries were stopped after each inspected failure and the workflow was deactivated.
  Execution `2193` saved all 12 selected latest/history identities across the pilot attempts, but
  its separate suggestion branch failed before inserting 13 prepared suggestions. No completed
  result was deleted or reset.

- [x] **Step 5: Audit every pilot result.**

  Verify timeline labels and sort keys, exact approved coordinates/provenance, event/actor
  separation, recipient handling, unresolved visibility, suggestion deduplication, history,
  idempotency, protected fingerprints, workflow inactivity, and the rollback-only database
  contract.

  Observed on 2026-09-21: 12 latest, 12 history, 15 deduplicated suggestions, zero selected inputs
  pending, zero missing suggestion coverage, zero invalid coordinate mappings, zero failed results,
  and zero timeline-basis mismatches. The workflow was inactive and runtime validation was clean.

- [x] **Step 6: Stop for manual owner acceptance.**

  Repair and rerun only affected Phase 5C identities if the owner approves a narrow correction. Do
  not remove the pilot filter or process the remaining 97 records without separate approval.

---

### Task 7: Process the remaining baseline and stop before Phase 5D

**Files:**

- Modify: `.n8n-backups/20260910/terra-space-phase5-generate-and-qualify-events.json`
- Modify: `project-knowledge/Current-Status.md`
- Modify: `project-knowledge/Roadmap.md`
- Modify: `project-knowledge/Project-Knowledge-Log.md`

**Interfaces:**

- Consumes: an owner-accepted pilot and the remaining exact Phase 5C pending set.
- Produces: one latest Phase 5C result for every eligible baseline event and a documented 5D stop.

- [x] **Step 1: Remove only the pilot filter and revalidate.**

  Confirm the general pending count equals the untouched remainder plus any explicitly retryable
  pilot failures. Recheck workflow topology, test suites, protected fingerprints, and inactivity.

- [x] **Step 2: Obtain separate full-run approval.**

  State the exact pending count, maximum database writes, possible suggestion rows, optional-model
  call bound, and cleanup behaviour.

- [x] **Step 3: Execute the remaining set once and deactivate.**

  Use the permanent MCP webhook, monitor through n8n MCP, avoid duplicate triggers, and guarantee
  `active=false` after completion or failure.

- [x] **Step 4: Run the full production-readiness audit.**

  Require one latest result per eligible event, unique submission keys, complete history, valid
  component statuses, exact reference coordinates, zero actor/event geography leakage, visible
  unresolved cases, correct targeted-pending behaviour, zero Phase 1-5B fingerprint changes, clean
  Supabase advisors for Phase 5C, passing SQL/JS contracts, and zero n8n validation errors/warnings.

- [x] **Step 5: Update Project Knowledge and stop.**

  Record observed counts and unresolved-reference workload, run:

  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1
  ```

  Expected: zero errors and warnings. Keep the workflow inactive and require owner acceptance of
  Phase 5C before designing or implementing Phase 5D.

---

## Self-review record

- **Spec coverage:** Tasks 1-7 cover timeline precision, publication fallback, approved coordinate
  authority, Event Geography, Actor Network, optional non-authoritative AI suggestions, direct
  database review, targeted reruns, audit history, pilot, full-run verification, and the 5D stop.
- **Scope:** The plan changes only Phase 5C and the existing Phase 5 workflow. It does not implement
  Terra Space UI, Phase 5D duplicates, Phase 5E qualification, final publication, or taxonomy
  proposal consolidation.
- **Type consistency:** The plan consistently uses `PREPARED|FAILED`,
  `EVENT_DATE|SOURCE_PUBLICATION_DATE`, the five approved component geography statuses, and the
  three initial actor relationship types from the decision.
- **Placeholder scan:** All tasks name concrete files, interfaces, commands, expected outcomes, and
  approval gates; no unspecified implementation step remains.
