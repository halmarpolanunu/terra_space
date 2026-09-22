---
type: Decision
title: Phase 2 Main-Issue Detection
description: Phase 2 will detect and validate at most one grounded Main Issue per completed Phase 1 article before any event-candidate work is introduced.
tags: [project-knowledge, decision, n8n, supabase, phase-2]
status: active
---

# Context

The verified Phase 1 baseline now produces safe, non-empty cleaned news articles. The prior
post-Phase-1 pipeline and its Phase 2 tables were intentionally deleted during the 2026-08-24
reset. Terra Space needs a small, testable next step rather than restoring the former full event
pipeline.

# Decision

Create one inactive, manually started n8n workflow in the `Terra_Space` folder named **Terra Space
- Phase 2 - Detect Main Issues**.

For every Phase 1 source whose `processing_status` is `completed` and that has no Phase 2 latest
result, the workflow processes one article at a time and creates at most one Main Issue. A Main
Issue contains only:

- a short, neutral title;
- a one-sentence neutral description; and
- one exact evidence quote from the cleaned article.

Phase 2 does not extract structured countries, actors, relationships, event candidates, or final
events.

A result is `VALID` only when the evidence quote appears verbatim in the cleaned article and a
separate local-LM-Studio safeguard says that the title and description are supported by that quote.
When the article has no clear supported Main Issue, or either validation rejects it, the result is
`WITHHELD`; it does not invent an issue. A technical or model-response failure is `FAILED`. Every
attempt is appended to history, including raw model output, safeguard output, model name, prompt
versions, and any reason for withholding or failure.

Use Supabase nodes for reading the pending-source view and for creating latest-result and
append-only-run rows. Use Code nodes only for the transformations and validations a Supabase node
cannot perform, such as parsing local-model JSON and verifying an exact quote. The local database
will provide the pending-source view so n8n does not need an ad-hoc join or PostgreSQL node.

All new database-object names follow the existing Phase 1 format: begin with
`terra_space_phase2_`, use lowercase snake case, and state the object role plainly. The planned
names are `terra_space_phase2_main_issues` (one latest result per Phase 1 source),
`terra_space_phase2_main_issue_processing_runs` (append-only history), and
`terra_space_phase2_pending_main_issue_sources` (read-only pending-source view).

# Alternatives considered

- Restore the former Main-Issue-plus-event-candidate workflow immediately.
- Detect countries and actors alongside the Main Issue.
- Accept a Main Issue based solely on one local-model call.
- Require manual selection of one article each time the workflow runs.

# Reasons

Starting with one grounded Main Issue isolates the core reliability question: can Terra Space state
what an article is mainly about without inventing facts? It keeps Phase 2 small, preserves the
verified Phase 1 safety posture, and gives the owner one manual action that catches up every
unprocessed completed article. The exact quote protects source traceability, while the independent
local-AI safeguard allows a natural title and description rather than forcing them to copy the
quote word for word.

# Consequences

- New local Supabase tables will store the latest result and append-only run history, plus a
  read-only view listing eligible Phase 1 sources.
- A valid issue can later be used as context for event-candidate design, but this decision creates
  no event candidates or downstream records.
- A withheld result is a safe, reviewable outcome, not an error to silently retry or overwrite.
- Future reprocessing or changes to the prompt, model, safeguards, or result shape require owner
  approval and a new verification plan.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Verified Phase 1 Cleaning Baseline](Verified-Phase-1-Cleaning-Baseline.md)
- [Project Knowledge](../Project-knowledge-Index.md)
