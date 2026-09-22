---
type: Plan
title: Phase 5E Visibility and Qualification Design
description: Lean proposed rules for showing every retained Phase 5 event and marking only grounded events Final.
tags: [project-knowledge, phase-5, design]
status: draft
---

# Purpose

Finish the existing single Phase 5 workflow without hiding useful events or inventing missing facts. Every retained Phase 5A event must be visible in Events; Final is a separate qualification, not a visibility requirement. This design is for owner review and does not authorize implementation or execution.

# Recommended approach

Use the existing Phase 5A record as the event identity and source of title, description, evidence, statuses, reasons, and retained facts. Join its latest Phase 5B and 5C results and Phase 5D recommendations for display. Add one deterministic 5E qualification result per event, with a short reason and append-only run history. Keep this as the last stage of the existing n8n workflow in `Terra_Space`; do not create another workflow.

Two alternatives were considered and rejected: marking every prepared record Final would weaken the safeguard boundary; requiring every optional date, type, actor, and map coordinate would hide sound events for unrelated gaps.

# Visibility and qualification

- **Visible:** Every retained Phase 5A `PREPARED` record appears in Events, including limited, unclassified, unlocated, and not-final records. A technical failure in a later stage stays visible with its failure reason; it must not silently disappear. No event is automatically published to a separate external destination.
- **Final:** The Phase 3 candidate object identified by the retained `candidate_id` must have `status = VALID`, `quote_validation_status = VERIFIED`, and `safeguard_status = ACCEPT`. These are per-candidate fields inside `terra_space_phase3_event_candidates.candidates`; the overall Phase 3 result status may still be `NEEDS_REVIEW` because of another candidate or inherited context. Phase 5A, 5B, and 5C latest results must be technically successful, and any assigned Event Type must be active and safeguard-accepted. An `UNCLASSIFIED` result with an accepted classification safeguard is also eligible. A rejected core-event safeguard, unsupported core claim, or technical failure is not Final.
- **Not automatic blockers:** inherited `INCOMPLETE` or `NEEDS_REVIEW` labels; an omitted/rejected *optional* Phase 4 actor, location, date, or epistemic fact; no exact event date; no map coordinate; no actor reference; an accepted `UNCLASSIFIED` classification; and a Phase 5D possible-duplicate recommendation. Each limitation remains visible. A possible duplicate is never merged automatically.
- **Date and geography:** A publication-date timeline reference stays explicitly labelled as such, never as the actual event date. Event Geography uses only resolved event locations; Actor Network uses only typed actor references. Missing coordinates do not acquire a substitute point.
- **Review information:** The event detail shows original Phase 3 and 4 statuses/reasons, Phase 5 path and classification, date basis, geography limitations, 5D recommendations, and the 5E qualification reason. `Final` must not imply that every optional field is complete.

# Taxonomy checkpoint

Keep the 12 active Event Types unchanged for this release. The 40 pending suggestions are mostly overlapping families (notably legal/judicial, cyber, defense spending, and military exercises); no proposal becomes authoritative automatically. Unmatched events remain visibly `Unclassified`. Specific additions or mappings can be decided later through direct database review and a separately approved change. This grouped review satisfies the design checkpoint without turning 40 suggestions into 40 new types.

# Failure and verification

Qualification is deterministic and makes no new model call. Processing one event must not block another. Reprocessing updates only the latest Phase 5E result for that event and appends history; Phase 1–4 data and earlier Phase 5 results stay unchanged. Tests must cover normal/limited, classified/unclassified, optional safeguard rejection versus core rejection, unknown date, unresolved geography, possible duplicate, technical failure, idempotent replay, and visible reasons. After tests and inactive-workflow validation, run only a separately approved pilot, stop, review it with the owner, then seek separate approval for any larger run or activation.

# Open implementation boundary

The current application Events read path uses the older `terra_space_phase3_events` table, not the new Phase 5 records. Phase 5E therefore needs a separate, read-only Phase 5 projection for Events (and the matching Dashboard views) rather than copying Phase 5 results into or altering the older table. Existing older records must not silently vanish during this transition. Any required schema, app, or n8n edits need their own explicit approval.

# Related knowledge

- [Phase 5 Event Generation and Qualification](../decisions/Phase-5-Conservative-Event-Drafts.md)
- [North Star](../North-Star.md)
- [Current Status](../Current-Status.md)
