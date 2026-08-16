---
type: Decision
title: Pipeline-Only Data Correction
description: Terra Insight is read-only; data corrections belong in the pipeline and reprocessing.
tags: [project-knowledge, decision, pipeline, data-quality, terra-insight]
status: active
---

# Context

The owner does not want to review or correct Issues or events in the application. Those actions
would create a second, inconsistent source of truth beside the processing pipeline.

# Decision

All corrections happen in the responsible pipeline stage: prompts, validation, reference data,
schema, or workflow. Affected source articles are then reprocessed with run history retained.

Terra Insight is read-only analysis. It must not provide Issue or event review, approval, editing,
rejection, archival, deletion, or correction controls. Only fully pipeline-valid Issues and events
appear there. Failed or withheld processing stays in pipeline observability rather than analytical
output.

Actor arcs may appear only where the source article explicitly supports both actor locations and
the pipeline has resolved those locations locally. Missing locations are shown as unavailable; they
are never inferred.

# First-release scope

The owner deliberately reduced the first release to a parallel validated Issue data path, one new
read-only Issues screen, and evidence-backed actor arcs. Analytics, pipeline-status UI, reprocessing
the existing database, and removal of existing screens are deferred. The current application and
pipeline remain the fallback until the owner has seen the new version working with safe test data.

# Consequences

- Each Issue belongs to one source article; Issues are not merged across articles.
- A newer failed pipeline run suppresses older analytical output for that source.
- A valid Issue/event may appear without an arc when endpoints cannot be proven.
- Future removal of current application paths requires owner approval after live verification.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Issue-first Implementation](../plans/2026-08-15-issue-first-terra-insight-implementation.md)
- [Project Knowledge](../Project-knowledge-Index.md)
