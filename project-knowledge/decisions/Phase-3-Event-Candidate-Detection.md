---
type: Decision
title: Phase 3 Event Candidate Detection
description: Phase 3 detects evidence-grounded event candidates from every complete Phase 2 Main Issue without treating a review flag as a pipeline stop.
tags: [project-knowledge, decision, n8n, supabase, phase-3]
status: planned
---

# Context

Phase 1 has an owner-verified cleaned-article baseline. Phase 2 has produced a complete Main Issue
for each of the 29 articles: title, neutral description, and evidence quote. A `VALID` Phase 2
Issue has a verified quote and safeguard acceptance; a `NEEDS_REVIEW` Issue keeps the same complete
payload but records a reason for later checking. The review flag must not make the normal pipeline
drop data or stop processing later articles.

The next smallest useful step is to identify the concrete events mentioned in the article. Detailed
event enrichment, actor and country normalization, relationships, taxonomy assignment, duplicate
handling, and final event records are deliberately later work.

# Decision

Create one inactive, manually started n8n workflow in the `Terra_Space` folder named **Terra Space
- Phase 3 - Detect Event Candidates**.

The workflow reads a completed Phase 1 cleaned article and its complete Phase 2 Main Issue when
the Phase 2 status is either `VALID` or `NEEDS_REVIEW`. The Phase 2 status is retained as input
context; it never blocks Phase 3.

For each article, Phase 3 produces one latest result containing a JSON array of zero or more Event
Candidates. Each candidate has only:

- a short neutral title;
- a one-sentence neutral description;
- an evidence quote copied from the cleaned article;
- its own `VALID` or `NEEDS_REVIEW` status; and
- a review reason when it needs checking.

The enclosing result is `VALID` when every candidate is valid (including a valid empty array for an
article with no stated event), `NEEDS_REVIEW` when any retained candidate needs checking, or
`FAILED` only for a technical failure before a usable result can be prepared. A candidate must not
be removed or have its fields cleared merely because it needs review. Therefore a single article
may retain both valid and review-flagged candidates.

Candidate detection uses one local LM Studio call and a separate local LM Studio safeguard call.
The workflow deterministically checks every candidate quote against the Phase 1 cleaned text before
the safeguard is called. The safeguard decides each candidate independently, using only its title,
description, and quote. Phase 3 continues one article at a time after a result is saved.

A later owner-started manual run retries only a latest result with status `FAILED`. It does not
retry `VALID` or `NEEDS_REVIEW` results. The retry updates that one latest result through a
Supabase node and appends another immutable processing-run record, so earlier technical failures
remain traceable without requiring a deletion.

Use one latest-result table, one append-only run table, and one pending-source view, all named with
the `terra_space_phase3_` prefix. Normal source reads and result/run writes use Supabase nodes;
Code nodes are limited to JSON handling, quote checking, request creation, and value preparation.

# Alternatives considered

- Process only Phase 2 `VALID` Issues. Rejected because it turns a review flag into a pipeline stop
  and loses useful candidate detection for otherwise complete articles.
- Extract actors, countries, locations, dates, relationships, and taxonomy now. Rejected because it
  combines several reliability questions before basic candidate detection is proven.
- Save one database row per candidate immediately. Rejected for this stage because an article-level
  latest result plus a candidate array is simpler, represents a genuine no-event result, and still
  gives every candidate its own status.
- Discard candidates rejected by the safeguard. Rejected because reviewable, complete output is
  more useful than a silent loss of data.

# Reasons

This keeps the pipeline small and testable: Phase 3 answers only “which events does this article
state?” and always retains the evidence needed to inspect that answer. Candidate-level statuses
avoid making good candidates disappear because another candidate from the same article is uncertain.
The workflow mirrors the familiar Phase 2 manual, local-first, Supabase-node-led pattern.

# Consequences

- Phase 3 will not create final events or write to Dashboard-facing event tables.
- The later final-event stage can consume only valid candidates while still exposing review-flagged
  candidates for inspection or reprocessing.
- The phase allocation in [Fresh Phase-Prefixed Supabase Architecture](Fresh-Phase-Prefixed-Supabase-Architecture.md)
  is amended for the post-reset rebuild: Main Issues are Phase 2 and Event Candidate detection is
  Phase 3. The table-prefix and local-first rules remain unchanged.
- A future change to the candidate field set, model prompt, status rules, or automatic reprocessing
  requires a new owner-approved plan.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Phase 2 Main-Issue Detection](Phase-2-Main-Issue-Detection.md)
- [Phase 2 Review-Flagged Results](Phase-2-Review-Flagged-Results.md)
- [Phase 3 Event Candidate Detection Implementation Plan](../plans/2026-08-27-phase-3-event-candidate-detection.md)
- [Project Knowledge](../Project-knowledge-Index.md)
