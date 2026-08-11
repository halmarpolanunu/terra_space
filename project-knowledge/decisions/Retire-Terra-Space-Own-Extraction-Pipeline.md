---
type: Decision
title: "Retire Terra Space's Own Extraction Pipeline"
description: "Retires the in-app staged LM Studio extraction pipeline (Add document -> Process -> draft events -> approve) now that n8n owns event detection end to end; Terra Space keeps only Documents CRUD, editing, and Dashboard authority."
tags: [project-knowledge, decision, event-detection, extraction, supabase, n8n]
status: active
okf_version: "0.1"
---

# Context

Terra Space originally had its own in-app pipeline: add a document, click Process, and a staged
LM Studio call sequence (Signal Parser, then four narrow classifiers) turned it into draft events
that a human reviewed and approved (see [Staged Event Detection
Pipeline](Staged-Event-Detection-Pipeline.md)). That pipeline wrote to SQLite's own
`review_status` (draft/approved/rejected/merged) model.

The [Fresh Phase-Prefixed Supabase Architecture](Fresh-Phase-Prefixed-Supabase-Architecture.md)
decision moved event detection to n8n, writing directly to `phase3_events` with its own
`origin`/`pipeline_outcome`/`dashboard_status` authority model. When implementing the [full
application transition
plan](../plans/2026-08-10-terra-space-supabase-transition.md), this created a genuine gap: the
Postgres schema has no equivalent of the old staged pipeline or its `review_status` states, and
building one would mean either (a) rebuilding Terra Space's own extraction feature to write into
`phase3_events` under a new candidate-key scheme, duplicating what n8n already does, or (b)
retiring it now that n8n is the pipeline's sole event-detection path.

This was surfaced to the owner directly during implementation rather than guessed, since it
materially changes scope in either direction.

# Decision

Retire Terra Space's own extraction pipeline entirely. n8n is the only path that turns a source
document into a Phase 3 event. Terra Space keeps:

- Documents (Phase 1 sources) as plain CRUD: create, edit, delete, attachments -- no Process,
  Retry, or extraction log.
- Full Dashboard/Events authority over `phase3_events`: edit, publish, reject, archive, restore,
  delete -- see the Dashboard authority table in [Fresh Phase-Prefixed Supabase
  Architecture](Fresh-Phase-Prefixed-Supabase-Architecture.md).
- Manual event creation directly against `phase3_events` (`origin: manual`), for events the owner
  wants to add without going through n8n at all.

Removed: the four-classifier extraction pipeline (`extraction.py`, `classifiers.py`,
`signal_parser.py`, `extraction_log.py`), `ExtractionLogEntry`, `candidate_index`,
`extraction_incomplete_stages` as a real column, the universal draft/approve-all workflow, and the
`/api/documents/process`, `/retry`, `/extraction-log`, and `/events/approve-all` routes.

# Alternatives considered

- **Rebuild the staged pipeline against Postgres**, writing into `phase3_events` under a new,
  Terra-Space-local candidate-key scheme alongside n8n's. Rejected: it would duplicate n8n's job,
  create two independent event-detection paths writing to the same authoritative table, and cost
  significant implementation effort for a capability n8n already covers.

# Reasons

n8n already performs staged detection (Phase 1 cleaning, Phase 2 candidate detection, Phase 3
enrichment/validation/safeguard) against the same Postgres schema Terra Space now reads and writes
for authority decisions. Keeping a second, parallel extraction path in the application itself adds
no coverage n8n doesn't already provide, and risks two different `candidate_key` schemes competing
over the same `phase3_events` table.

# Consequences

- Terra Space's UI no longer offers "Process" or "Retry" on a document, and Documents no longer
  shows a processing-status pipeline stage for AI extraction -- only edit/delete/attachments.
- `frontend/src/lib/documents-api.ts`'s `processDocuments`/`retryDocument`/`listExtractionLog`
  helpers and their backend routes are dead going forward; a future pass may remove them from the
  frontend client entirely, but they are harmless (unreachable) as left.
- Terra Sense's Overview flow summary now reports `hidden`/`published` Phase 3 event counts instead
  of the old local draft/approved counts, since there is no local draft-event queue anymore.
- [Staged Event Detection Pipeline](Staged-Event-Detection-Pipeline.md) is superseded by this
  decision.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Fresh Phase-Prefixed Supabase Architecture](Fresh-Phase-Prefixed-Supabase-Architecture.md)
- [Staged Event Detection Pipeline (superseded)](Staged-Event-Detection-Pipeline.md)
- [Terra Space Supabase Application Transition Plan](../plans/2026-08-10-terra-space-supabase-transition.md)
- [Project Knowledge](../Project-knowledge-Index.md)
