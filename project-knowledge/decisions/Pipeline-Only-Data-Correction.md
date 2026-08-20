---
type: Decision
title: Pipeline-Only Data Correction
description: Terra Insight and Terra Sense do not provide event or issue review; data defects are corrected in the pipeline and corrected sources are reprocessed.
tags: [project-knowledge, decision, pipeline, data-quality, terra-insight]
status: active
---

# Context

The owner does not want Issues or events reviewed or corrected in the application. Doing so would
create a second source of truth beside the processing pipeline.

# Decision

All data correction happens at the pipeline level. If an Issue, event, actor relationship, or
location is wrong or incomplete, correct the relevant prompt, validation, reference data, schema,
or workflow, then reprocess the affected source articles while retaining run history.

Terra Insight is read-only analysis. It provides no Issue/event review, approval, editing,
rejection, archival, deletion, or manual correction. Only fully pipeline-valid Issues and events
appear there; failed and withheld processing remains in Terra Sense observability.

Actor arcs appear only when the article explicitly supports both actor locations and the pipeline
has resolved them locally. Missing locations are unavailable, never inferred.

# Consequences

- Each Issue belongs to one source article and is not merged across articles.
- A newer failed pipeline run suppresses older analytical output for that source.
- A valid Issue or event may appear without an arc when both endpoints cannot be proven.
- The Issue-first rollout reprocessed all currently stored articles only after owner approval.
- Dashboard and Events remain the fallback. Removing any current route or control requires a
  separate owner-approved retirement plan after sustained live use.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Issue-first Implementation](../plans/2026-08-15-issue-first-terra-insight-implementation.md)
- [Terra Insight and Terra Sense Product Organization](Terra-Insight-and-Terra-Sense-Product-Organization.md)
- [Project Knowledge](../Project-knowledge-Index.md)
