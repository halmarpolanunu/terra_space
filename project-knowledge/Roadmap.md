---
type: Roadmap
title: terra_space Roadmap
description: Long-term Terra Space direction organized by MVP phases and measurable milestones.
tags: [project-knowledge, roadmap]
status: active
---

# terra_space Roadmap

Use this file for long-term planning by phase or milestone. Dates are optional. Add detail only when it helps implementation.

## Phase 1: Application Foundation

- [x] **Verify local foundation runtime** - Docker Compose, offline browser behavior, and SQLite persistence have been checked. Status: completed.
- [x] **Inspect current codebase and stack** - confirmed that the repository has Project Knowledge and setup files but no existing application implementation to reuse. Status: completed.
- [x] **Create basic navigation** - Dashboard, Documents, Event Review, Events, and Settings entry points are available in the neutral application shell. Status: completed.
- [x] **Set up local database foundation** - SQLite schema and reversible migration now define local storage for documents, events, locations, actors, event types, sources, attachments, and event relationships. Status: completed.
- [x] **Prepare local attachment storage** - store image attachments locally and keep database references consistent. Images only (jpeg/png/gif/webp), 10 MB cap, server-generated file paths, gated behind the same draft/failed edit-lock as document edits; deleting a document now cleans up its attachment files too. Status: completed.

## Phase 2: Documents and Batch Processing

- [x] **Build manual document input** - support required title, content, document date, optional publication date and source URL, and automatic input date. Status: completed. Optional image attachment upload is deferred: it depends on Phase 1's still-planned "Prepare local attachment storage" item, which this phase did not build.
- [x] **Support document drafts and list management** - create, save, reopen, edit, list, and select documents with checkbox selection. Status: completed.
- [x] **Track document processing status** - use draft, queued, processing, ready_for_review, completed, and failed with clear failure messages. Status: completed.
- [x] **Integrate LM Studio locally** - process selected documents through a locally discovered LM Studio model over the OpenAI-compatible chat-completions endpoint. Status: completed.
- [x] **Validate structured LLM output** - reject invalid parsing safely without corrupting the document or approved data. Status: completed.
- [x] **Support retry and reprocessing** - retry failed processing and warn before reprocessing documents that already have approved events. Status: completed.

## Phase 3: Event Review and Deduplication

- [x] **Build side-by-side review** - show source document on the left and extracted draft events on the right, with the current event's evidence quote highlighted in the source text. Status: completed.
- [x] **Allow event correction** - edit, approve, reject, save changes, add event manually, and approve all. Status: completed.
- [x] **Confirm event type and actor suggestions** - let AI suggest new types or actors, but require user confirmation; approving an event flips its suggested type/actor to active. Status: completed.
- [x] **Support event timing, location, actors, evidence, and epistemic status** - keep unknown values explicit ("Date unknown — kept blank", "Not stated") and never force guessed values. Status: completed.
- [x] **Flag possible duplicates** - compare type, date proximity, actors, and location for a draft event against every approved event. Status: completed.
- [x] **Let user decide duplicate handling** - merge source document into an existing event (link) or save as a separate event (keep separate); approval is blocked while a flag is unresolved. Status: completed.

## Phase 4: Events and Dashboard

- [x] **Build approved Events list** - show approved events with search, filters, sorting, detail, source links, and edit support. Status: completed.
- [x] **Add event filters** - support time range, event type, epistemic status, actor, country, province/state, city/regency, and source document. Status: completed.
- [x] **Build Dashboard summary** - show total events, new events, distribution by type, incomplete date count, and incomplete location count. Status: completed.
- [x] **Build map view** - show approved events with valid location data at country, province/state, and city/regency levels. Status: completed.
- [x] **Build timeline view** - order events by start date and group unknown-date events separately. Status: completed.
- [x] **Synchronize dashboard filters** - make summary, map, timeline, and list use the same active filters. Status: completed.

## Phase 5: Settings and Verification

- [x] **Build LM Studio settings** - configure base URL, model selection when available, connection test, connection status, and required extraction settings. Base URL and selected model are persisted in a single-row `app_settings` table and resolved at call time, so saved changes take effect without a restart; the selected model is now honored by extraction. Status: completed.
- [x] **Build simple event type management** - create, rename, activate/deactivate, and delete-when-unused event types as data, with no merge, synonyms, or hierarchy. Status: completed.
- [x] **Verify end-to-end flow** - document draft, batch processing, review, approval, Events, and Dashboard are exercised across the documents, event-review, and events-dashboard browser scenarios. Status: completed.
- [x] **Verify offline and failure cases** - LM Studio offline (foundation scenario), partial batch failure and retry recovery (settings scenario and backend tests), reprocessing confirmation, and incomplete time/location and duplicate handling (events-dashboard and event-review scenarios) are all covered. Status: completed.

## Product Organization

- [x] **Organize the product around Terra Insight and Terra Sense** - navigation is grouped into
  Terra Insight (Dashboard, Events), Terra Sense (Overview, Sources, Event Review, Event Taxonomy),
  and Settings (Local AI). Terra Sense has a read-only pipeline overview at `/sense`. See the
  [Terra Insight and Terra Sense Organization Implementation Plan](plans/2026-07-18-terra-insight-terra-sense-organization.md).
  Status: completed.

## Event Taxonomy Tree

- [x] **Owner-managed hierarchical Event Taxonomy** - a Domain -> Category -> Subcategory -> Event
  Type tree replaces the flat Event Type list in Terra Sense. Only the Event Type leaf is
  assignable to an event or selectable by local AI; local AI may never suggest or create a new
  type. See the [Event Taxonomy Tree and Management](decisions/Event-Taxonomy-Tree-and-Management.md)
  decision and its [implementation plan](plans/2026-07-19-event-taxonomy-tree.md), applied to the
  owner's live database. Status: completed.

## Fresh Local Supabase Consolidation

- [x] **Create the phase-prefixed Supabase foundation** - build the fresh local schema, constraints,
  descriptions, reference data, backup procedure, and verification. See the
  [Fresh Phase-Prefixed Supabase Foundation Plan](plans/2026-08-10-fresh-supabase-foundation.md).
  Status: completed.
- [x] **Move the n8n pipeline to the shared schema** - update the four inactive workflows to use
  Phase 1, Phase 2, and Phase 3 table contracts and verify the full pipeline. All six live tests
  (full grounded run, quote grounding, idempotency, human-edit survival, eventless article, blank
  input) pass against real Supabase data; all four workflows remain inactive. See the
  [n8n Phase-Prefixed Table Transition Implementation Plan](plans/2026-08-10-n8n-phase-table-transition.md).
  Status: completed.
- [x] **Show the live Supabase pipeline data read-only** - a verification-first bridge before the
  full cutover: the backend reads local Supabase directly for Sources, Event Review, Events, and
  Dashboard, with every write control removed; SQLite stays untouched. Verified against real live
  data. See the [Supabase Read-Only Bridge Design](plans/2026-08-11-supabase-read-only-bridge-design.md)
  and its [implementation plan](plans/2026-08-11-supabase-read-only-bridge-implementation.md).
  Status: completed.
- [x] **Move Terra Space application storage to Supabase** - backend persistence, the Documents
  CRUD API, and Dashboard/Events authority (publish/reject/archive/restore/edit/delete) now use
  local Supabase/PostgreSQL instead of SQLite; the visible Sources page deliberately remains the
  earlier read-only Supabase bridge until its full CRUD interface is brought back in a follow-up.
  SQLite is preserved untouched as rollback material. Terra Space's own staged extraction pipeline
  was retired (n8n is now the sole event-detection path) -- see the [retirement
  decision](decisions/Retire-Terra-Space-Own-Extraction-Pipeline.md). Verified by 237 backend tests
  (SQLite unit + real PostgreSQL integration) and 218 frontend tests, clean lint, clean production build. See the
  [Terra Space Supabase Application Transition Plan](plans/2026-08-10-terra-space-supabase-transition.md).
  Status: completed (implementation and automated verification); live browser verification against
  real local Supabase is still owner-pending, see below.
- [ ] **Verify and approve cutover** - run the live browser scenarios (Documents, Event Review,
  Events/Dashboard, Settings, offline LM Studio, responsive) against the real local Supabase
  instance, confirm the archived SQLite checksum is still unchanged after a live restart, then
  activate. Deliberately not run automatically: those scenarios publish/reject/archive/delete real
  event rows, which needs the owner's own confirmation first. Status: planned.

## Post-reset Detection Pipeline

- [x] **Phase 1: Clean source articles** - the owner-verified local cleaning baseline produces
  complete cleaned articles. Status: completed.
- [x] **Phase 2: Detect Main Issues** - every article has a complete Main Issue and any uncertainty
  is retained as `NEEDS_REVIEW`, not treated as a pipeline stop. Status: completed.
- [x] **Phase 3: Detect Event Candidates** - the clean 50-article baseline has 50 latest results and
  109 complete candidates: 99 `VALID` and 10 genuine `NEEDS_REVIEW`. Every evidence quote is an
  exact cleaned-source substring, no latest result is failed, the Phase 3 queue is empty, and all
  109 candidates are ready in the Phase 4 pending view. Status: completed.
- [x] **Phase 4: Extract Event Facts** - extract minimal per-candidate dates, epistemic status,
  actors, locations, and grounded evidence while retaining `NEEDS_REVIEW` output and retrying only
  technical failures. The production-readiness repair covers candidate-scoped dates, epistemic
  evidence, actors and roles, physical locations, metonyms, actor-affiliation countries, neighboring
  clauses, Markdown-grounded evidence, and grounded date normalization. The verified replay contains
  113 results (16 `VALID`, 97 `NEEDS_REVIEW`), zero technical failures, an empty queue, and 249
  preserved processing-history rows. All 31 focused Phase 3/4 tests pass and the whole-table dry run
  reports zero affected rows. The replay workflow is unpublished. Final events remain out of scope.
  The clean replay now contains 109 results and 109 runs: 43 `VALID`, 56 `INCOMPLETE`, and 10
  genuine inherited `NEEDS_REVIEW`, with zero failed or pending results. All 341 retained evidence
  fields are exact article substrings and remain inside their Phase 3 candidate boundaries.
  Status: completed.
- [ ] **Phase 5: Generate and Qualify Events** - use one inactive n8n workflow with five
  checkpointed stages. Phase 5A is completed with 109 verified prepared records: 43 NORMAL and 66
  LIMITED, with exact upstream preservation and no failures. Phase 5B is accepted for progression:
  109 latest results contain 56 `CLASSIFIED`, 53 visible `UNCLASSIFIED`, zero `FAILED`, and 40
  isolated `PENDING_REVIEW` proposals. The provisional 12-type taxonomy may be refined later, but
  proposal consolidation remains required before Phase 5E qualification or production release.
  Phase 5C is complete for the 109-event baseline. It uses 38 universally safe geographic
  references and 24 actor references; uncertain items remain visible rather than guessed. All 109
  events have one latest result and one unique history row, with zero pending or failed results and
  110 deduplicated unresolved-reference suggestions. Audit found zero invalid coordinate mappings,
  timeline-basis mismatches, or duplicate identities. Phase 5D is connected in the same inactive
  workflow and uses strict deterministic possible-duplicate recommendations without merging or
  model calls. Its eight-event pilot completed successfully with zero recommendations and zero
  writes; a read-only full-baseline evaluation also found zero qualifying pairs among 31 actual
  same-date pairs. The temporary pilot filter was removed after owner approval, with no full data
  run. The live positive-write path awaits a real qualifying pair. Work is stopped before Phase 5E.
  It uses approved offline geographic and actor references, separate Event Geography and Actor
  Network outputs, visible unresolved cases, optional non-authoritative AI suggestions, and
  targeted reruns. The 5C database foundation, pure transformer, connected inactive n8n group,
  controlled pilot, and full baseline run are complete.
  Stage 5B assigns
  approved Event Types while keeping unmatched events visibly Unclassified; 5C prepares honest
  timeline references, event geography, and typed actor geography; 5D recommends possible
  duplicates without merging; and 5E makes every retained event visible while qualifying safe
  events as final under separately approved rules. Stop for owner review after every stage. See
  [Phase 5 Event Generation and Qualification](decisions/Phase-5-Conservative-Event-Drafts.md).
  The single Phase 5 workflow remains inactive. Status: in-progress.

## Deferred Beyond MVP

- Terra Brief module integration.
- Authentication, multi-user workflow, and role management.
- Cloud deployment and multi-device sync.
- OCR, image recognition, VLM processing, PDF upload, and DOCX upload.
- Cloud AI fallback.
- Knowledge graph and complex actor relationships.
- Taxonomy synonyms, taxonomy merge, and taxonomy versioning (the tree structure itself is now in
  the MVP; only these further extensions remain deferred).
- Automatic event merge.
- Specific address, building, village, road, or point-of-interest geocoding.
- Automatic ingestion from websites or APIs.
- Notifications and collaborative workflow.

## Navigation

- [Back to Project Knowledge](Project-knowledge-Index.md)
- [North Star](North-Star.md)
- [Current Status](Current-Status.md)
