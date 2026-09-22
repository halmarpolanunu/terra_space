---
type: Decision
title: Active Workflow Boundary
description: Historical record of the former five-workflow boundary, superseded by the owner-approved 2026-08-24 reset.
tags: [project-knowledge, decision, operations, n8n]
status: superseded
---

# Context

## Superseded

On 2026-08-24, the owner approved a pipeline reset. The four workflows other than **Input News
Manual** were permanently deleted, and their associated database tables were dropped. Retired
experiments were left untouched. This decision describes the former operating boundary and cannot
be used to define a new pipeline; a replacement design must be approved before rebuilding.

Terra Space accumulated several n8n experiments while its local pipeline was being designed.
These inactive workflows appeared beside the current pipeline and made it difficult for the owner
to identify which workflow should be used for a normal article.

# Decision

Normal Terra Space operation is limited to five active workflows: **Full News Processing**,
**Input News Manual**, **Event Candidates**, **Event Records**, and **Issue-first Analysis**.
The owner submits articles through **Full News Processing**. The other four workflows are its
connected processing stages.

Six confirmed inactive experiments are preserved in the n8n folder **Terra Space — Retired (do
not run)**. They remain inactive and are not deleted. They may be reconsidered only through a new
owner decision.

# Alternatives considered

- Leave every experiment beside the live workflows.
- Permanently delete the inactive experiments.
- Reactivate the old automatic-ingestion and event-detection experiments.

# Reasons

Keeping every experiment visible obscures the normal operating path. Deletion would remove useful
history and make rollback or later comparison harder. Reactivating automatic ingestion conflicts
with the MVP boundary that defers website/API ingestion. A clearly named retirement folder keeps
the n8n workspace understandable without affecting historical workflows or data.

# Consequences

- The owner has one normal entry point: **Full News Processing**.
- The five live workflow names form the supported pipeline boundary.
- Retired workflows are retained but must not be run or reactivated accidentally.
- Future automation work needs a new decision and should start from the current five-workflow
  pipeline, not from an old experiment.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Operating Guide](../Terra-Space-Operating-Guide.md)
- [Project Knowledge](../Project-knowledge-Index.md)
