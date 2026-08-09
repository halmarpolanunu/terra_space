---
type: Decision
title: One-Click Full News Processing
description: Add a master n8n workflow that runs the existing local news-cleaning, candidate-detection, and guarded event-record stages as reusable internal sub-workflows.
tags: [project-knowledge, decision, n8n, orchestration]
status: active
---

# Implementation note (2026-08-09)

This decision is implemented and verified end to end. `Terra Space - Full News Processing`
(`SwXzUU9aHg4NZ9Kx`) runs the three stages from one form submission; all four workflows are still
inactive pending a separate activation decision. See the
[implementation plan](../plans/2026-08-08-one-click-full-news-processing.md).

One rule below — "Phase 3 continues to process candidates independently: one candidate's exception
must not erase other candidates' final records" — turned out not to hold in the Phase 3 workflow as
built on 2026-08-07, and the gap was only visible once an article produced more than one candidate.
Candidates whose location did not resolve against the local gazetteer were silently deleted rather
than retained as exceptions, and the batch persistence loop could drop a completed record. Both were
fixed on 2026-08-09 with the owner's approval, without changing any grounding, taxonomy, safeguard,
or retry rule. The rule stands as written; the implementation now actually meets it.

# Context

Terra Space currently has three separate n8n workflows: manual source input and cleaning, event-candidate detection, and guarded final event-record processing. Each has to be started separately with a Phase 1 article UUID. This is useful for testing, but it requires manual handoff between stages.

# Decision

Create `Terra Space - Full News Processing` as the single user-facing form and orchestration workflow. It will submit one article, then run the three existing processing stages in order without further user input.

The processing logic will remain separated into internally callable n8n sub-workflows. The existing form/chat workflows will remain as manual testing and recovery entry points, using the same shared stage logic rather than duplicated node graphs.

# Architecture

1. The master form collects the existing Phase 1 fields: publication date, title, raw article text, source domain, URL, and author.
2. It calls the input-and-cleaning stage. On success, it receives the generated Phase 1 UUID.
3. It calls the event-candidate stage with that UUID. The stage saves its history and latest result as it does today.
4. If no grounded candidates exist, the master workflow finishes successfully with a clear `NO_EVENT_CANDIDATE` result; it does not call final processing.
5. Otherwise, it calls the event-record stage with the same UUID. That stage retains its factual grounding, local coordinate lookup, closed-taxonomy classification, independent safeguard, one retry per candidate, and final/exception behavior.
6. The master workflow returns a concise completion summary: Phase 1 UUID, source status, candidate count/status, final-record count, exception count, and any stage-level error.

# Failure and data rules

- Stop immediately if input cleaning fails; do not save a partial Phase 1 record.
- Preserve Phase 1 and Phase 2 outputs if Phase 3 is not reached or has exceptions.
- Never bypass the Phase 2 exact-quote grounding rule or Phase 3 finalization safeguard.
- Phase 3 continues to process candidates independently: one candidate's exception must not erase other candidates' final records.
- Keep the existing latest-plus-history tables. The master workflow is an orchestrator, not a new source of truth.
- Keep all AI calls, Supabase storage, and location lookup local, consistent with the North Star.

# Alternatives considered

- Merge all existing nodes into one large workflow. Rejected because it would be difficult to test and repair.
- Trigger the current form/chat endpoints from a fourth workflow. Rejected because it couples the pipeline to interactive trigger behavior and weakens error handling.

# Consequences

The normal workflow becomes one form submission, while operators retain independent stage entry points for controlled reruns and diagnosis. The implementation needs a modest n8n refactor: each stage must expose an Execute Workflow Trigger-compatible internal interface, and existing interactive triggers become thin wrappers around the shared stage logic.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Automated Final Event Record Pipeline](Automated-Final-Event-Record-Pipeline.md)
- [Project Knowledge](../Project-knowledge-Index.md)
