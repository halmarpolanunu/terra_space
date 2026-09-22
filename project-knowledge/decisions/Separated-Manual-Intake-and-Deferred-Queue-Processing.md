---
type: Decision
title: Separated Manual Intake and Deferred Queue Processing
description: Collect one article at a time, then process all queued and failed Phase 1 sources only when the owner triggers a separate workflow.
tags: [project-knowledge, decision, n8n, phase-1, workflow]
status: active
---

# Context

The owner spends most of their time gathering news articles and does not want the local AI cleaning
step to run after every individual submission. They want to collect articles gradually, then start
processing only when they choose.

# Decision

Keep one-at-a-time article entry, but separate it from processing:

- **Input News Manual** will save each valid article as a Phase 1 source with
  `processing_status = queued`. It will not call LM Studio.
- Before that save, **Input News Manual** trims the submitted `source_url` and checks it against
  saved Phase 1 source URLs. A match returns `REJECTED_DUPLICATE` and does not create a source,
  queue item, or processing run.
- A new **Process All Saved Articles** n8n workflow will be created in the `Terra_Space` folder.
  It remains inactive and the owner starts it deliberately from n8n with **Execute Workflow**.
- That workflow will process every source currently marked `queued` or `failed` through the approved
  Phase 1 cleaner. It fetches those sources through the regular Supabase node and explicitly loops
  over one article at a time. It will continue when an individual source fails.
- A successful source becomes `completed`; an unsuccessful source remains `failed` and is retried
  automatically the next time the owner starts the queue processor.
- The owner runs only one processor execution at a time. This simpler design does not coordinate or lock
  simultaneous processor runs.

This decision covers Phase 1 cleaning only. The downstream post-reset processing pipeline needs its
own approved design before it is recreated.

# Alternatives considered

- Keep immediate cleaning in the one-article input workflow.
- Build a repeatable-card bulk-entry screen before separating processing.
- Require the owner to select individual articles every time they start processing.

# Reasons

The chosen shape preserves the owner's familiar one-article entry method, avoids unnecessary local
AI work during research, and provides one simple manual action when batch processing is wanted.
Automatically retrying failed sources reduces the need for the owner to constantly monitor failed
items, while individual failures do not block the rest of the queue. Rejecting a URL already saved
also prevents accidental repeat collection from silently adding another queue item. A visible
one-at-a-time loop keeps LM Studio work simple without introducing database-locking machinery the
single owner does not need.

# Consequences

- The current active Input News Manual workflow needs a safe update from immediate processing to
  queue-only intake.
- A new Process All Saved Articles workflow is required and must be placed in `Terra_Space`.
- The owner must not start two processor runs at the same time.
- Existing sources are not automatically reprocessed or changed by this decision.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Project Knowledge](../Project-knowledge-Index.md)
