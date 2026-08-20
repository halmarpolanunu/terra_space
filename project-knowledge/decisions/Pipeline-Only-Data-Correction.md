---
type: Decision
title: Pipeline-Only Data Correction
description: Terra Insight and Terra Sense do not provide event or issue review; data defects are corrected in the pipeline and corrected sources are reprocessed.
tags: [project-knowledge, decision, pipeline, data-quality, terra-insight]
status: active
---

# Context

Terra Space currently retains legacy Event Review language and some human event-authority controls.
The owner has clarified that neither events nor Main Issues should be reviewed or corrected in the
application. The analysis experience must consume pipeline results rather than become a second
place for data correction.

# Decision

All data correction happens at the pipeline level. When an issue, event, actor relationship, or
location is wrong or incomplete, the remedy is to correct the relevant pipeline prompt, validation,
schema, reference data, or workflow and then reprocess the affected source articles.

Terra Insight is read-only analysis. It does not provide event or issue review, approval, editing,
rejecting, archiving, deleting, or data-correction controls. Its Issue screen may make pipeline
status and missing evidence clear, but it must not turn those signals into a manual review queue.

Only fully pipeline-valid Main Issues and their valid events enter Terra Insight. Pipeline
exceptions remain available to Terra Sense's pipeline observability, where their upstream failure
can be diagnosed and corrected; they do not appear as analytic Issues, globe pins, or arcs.

Terra Sense may show source and pipeline-run observability, including failures and withheld
results, but does not provide an Event Review workspace. It points the owner to the responsible
pipeline stage when correction is needed.

# Alternatives considered

- Keep event or Main Issue review/editing in Terra Space alongside the pipeline.
- Correct only the affected final record manually after a pipeline run.
- Hide incomplete records without exposing why the pipeline withheld an analytic feature.

# Reasons

- A single correction path avoids the pipeline and application drifting into conflicting versions
  of the same intelligence record.
- Reprocessing after an upstream fix makes improvements repeatable for all affected articles.
- Read-only analysis keeps Terra Insight focused on understanding the data, not maintaining it.
- Clear pipeline status still makes gaps visible without asking the owner to repair records by hand.

# Consequences

- The planned Issue-first Terra Insight redesign removes the standalone Events and Event Review
  menus. Events remain drill-down material inside an Issue; a future Analytics menu analyses all
  Issues together.
- The existing application authority controls conflict with this decision and must be removed or
  made unavailable in the eventual implementation plan.
- This decision amends the earlier [Automatic Event Visibility With Manual Filtering](Automatic-Event-Visibility-With-Manual-Filtering.md)
  direction: exceptions no longer enter Terra Insight automatically, because analytic output must
  contain only pipeline-valid data.
- Reprocessing must preserve run history and make the replacement result traceable to its source
  and pipeline version; it must not silently discard prior history.
- Once the new pipeline and schema are implemented and verified, the owner intends to reprocess
  every article currently stored in the Terra Space database. This is a planned, owner-triggered
  migration step, not an unattended action.
- The current application and pipeline remain the fallback while the redesigned version is built,
  tested, and checked against the full reprocessed dataset. The current version is removed only
  after the owner confirms the new version is solid in live use; no current schema, workflow, or
  usable application path is removed earlier.
- The new actor-arc feature may render only relationships whose source and target actor locations
  are explicitly supported by the article and pass pipeline validation. Missing information shows
  as unavailable, never inferred.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Terra Insight and Terra Sense Product Organization](Terra-Insight-and-Terra-Sense-Product-Organization.md)
- [Automated Final Event Record Pipeline](Automated-Final-Event-Record-Pipeline.md)
- [Project Knowledge](../Project-knowledge-Index.md)
