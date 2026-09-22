---
type: Decision
title: Phase 5 Event Generation and Qualification
description: Defines one checkpointed n8n workflow that turns Phase 4 facts into visible events, enriches them for timeline and map use, and qualifies safe events without automatic merging.
tags: [project-knowledge, decision, phase-5, events, map, taxonomy, normalization, deduplication]
status: active
---

# Context

The verified Phase 4 baseline contains 109 latest results: 43 `VALID`, 56 `INCOMPLETE`, 10 genuine
inherited `NEEDS_REVIEW`, zero `FAILED`, and zero pending. All 341 retained evidence fields are
exact cleaned-source substrings inside their Phase 3 candidate boundaries.

The owner re-approached Phase 5 around the product output rather than treating Conservative Event
Drafts as the whole phase. Phase 5 should make every retained event visible in Terra Space and
allow qualified events to become final. Missing optional facts, an unclassified Event Type, or a
visible limited status must not by themselves erase an otherwise usable event.

# Decision

All Phase 5A-5E work lives in one n8n workflow named **Terra Space - Phase 5 - Generate and Qualify
Events** in the `Terra_Space` folder. The workflow is built progressively and remains inactive and
owner-started during development.

1. **5A — Prepare Event Records.** Copy the Phase 3 title, description, evidence, statuses, reasons,
   and complete retained Phase 4 facts without adding information. Route `VALID` to `NORMAL` and
   both `INCOMPLETE` and `NEEDS_REVIEW` to `LIMITED`.
2. **5B — Classify Event Type.** Match approved active Event Types. Events without a match remain
   visible as **Unclassified**. Local AI may save a proposed new type for direct database review by
   the owner and agent, but cannot create or activate an official type.
3. **5C — Prepare Timeline and Geography.** Preserve the actual event date when known. When it is
   unknown, use the article publication date only as a separately labelled timeline reference.
   Resolve event locations and typed actor geographic references from approved reference data.
4. **5D — Recommend Possible Duplicates.** Store explainable duplicate recommendations without
   merging records.
5. **5E — Determine Visibility and Qualification.** Make all retained events visible in Terra
   Space. Qualify safe events as final under rules agreed at the 5E checkpoint. `INCOMPLETE`,
   `NEEDS_REVIEW`, and `Unclassified` records may qualify when their retained content satisfies
   those rules, while their limitations remain visible.

After every sub-phase, implementation stops for tests, an owner-approved pilot, manual review,
repairs, and explicit acceptance before the next sub-phase is designed or added.

# Shared safety boundary

- Phase 1-4 tables, data, workflows, prompts, and verified baselines are read-only to Phase 5.
- Missing facts stay missing. Phase 5 never restores a rejected or omitted Phase 4 fact.
- Original title, description, evidence, facts, statuses, and reasons remain preserved.
- One candidate failure does not stop the remaining candidates.
- Latest state is idempotent and every attempt is retained in append-only history.
- No automatic duplicate merge is permitted.
- Database changes used for direct review require explicit owner confirmation.
- Each migration, workflow creation/edit, pilot, replay, full run, or publication action needs its
  own explicit owner approval.

# 5A contract

5A is deterministic and makes no LM Studio call. It consumes Phase 4 `VALID`, `INCOMPLETE`, and
`NEEDS_REVIEW` results; a Phase 4 `FAILED` result remains upstream.

| Phase 4 status | Event path | 5A status |
| --- | --- | --- |
| `VALID` | `NORMAL` | `PREPARED` |
| `INCOMPLETE` | `LIMITED` | `PREPARED` |
| `NEEDS_REVIEW` | `LIMITED` | `PREPARED` |
| `FAILED` | no 5A record | no 5A status |

Every 5A record preserves:

- Phase 1 source ID and publication date;
- Phase 3 result ID, result status and reason;
- Phase 3 candidate ID, title, description, exact evidence, candidate status and reason;
- Phase 4 result ID, status, extraction status, safeguard status, review reason and error message;
- the complete Phase 4 `facts` object unchanged;
- `NORMAL` or `LIMITED` path and `PREPARED` or technical `FAILED` 5A status.

Unknown dates remain null with `unknown` precision. Empty actor and location arrays remain empty.
The current baseline would produce 43 normal and 66 limited records.

# 5B checkpoint

Before 5B, stop and prepare the initial Event Taxonomy because the new pipeline currently has no
Event Type table. An unmatched event displays **Unclassified** and may still qualify as final.

The detailed two-pass classifier, safeguard, corrective retry, storage, proposal review, and pilot
contract is defined in [Phase 5B Event Type Classification](Phase-5B-Event-Type-Classification.md).

If local AI proposes a new Event Type, store its name, description, reason, supporting event IDs,
possible overlap, and `PENDING_REVIEW` status. The owner and agent inspect suggestions through
read-only database queries. Only an explicit owner decision may approve, edit-and-approve, map to
an existing type, or reject a suggestion.

# 5C checkpoint

Before 5C, stop and agree on canonical location, actor, affiliation, and coordinate reference
data. Current Phase 4 locations contain `name`, `level`, and `evidence_quote`; none of the 48
locations has latitude or longitude.

The timeline keeps `event_date` distinct from `timeline_reference_date`. If `event_date` is
unknown, the publication date may provide the reference with a visible
`SOURCE_PUBLICATION_DATE` basis.

The map has two modes:

- **Event Geography** uses only supported event-location coordinates. Missing or unresolved event
  locations never borrow actor coordinates.
- **Actor Network** supports an actor-to-recipient overview and an event-centred detail view.
  Actors may have multiple typed geographic references such as represented country, official seat,
  nationality, headquarters, or evidenced event presence. These are not event locations or claims
  of a person's current physical position. Private home locations are excluded.

# 5D checkpoint

Before 5D, stop and define the comparison corpus, the difference between duplicate and related
events, explainable signals, and a reviewed example set. Phase 5 stores recommendations only and
never merges automatically.

# 5E checkpoint

Before 5E, stop and define the smallest qualification policy needed to implement the product
expectation:

- every retained event is visible in Events;
- geographically resolved events are available to Event Geography;
- typed actor references are available to Actor Network;
- qualified events may become final;
- `INCOMPLETE`, `NEEDS_REVIEW`, and `Unclassified` do not automatically block qualification;
- all limitations, upstream reasons, date basis, and classification state remain visible.

Exact final status names and qualification checks are deliberately deferred to this checkpoint so
5A does not over-engineer later behavior.

# Production-readiness gates

Each sub-phase is accepted only after behavior and database tests pass, the inactive workflow
validates, a separately approved pilot is reviewed, retries are idempotent, append-only history is
intact, Phase 1-4 fingerprints are unchanged, and the owner explicitly approves continuing.

The proposed 5A pilot contains two `VALID`, two `INCOMPLETE`, and two `NEEDS_REVIEW` inputs. The six
exact identities must be shown before execution.

# Alternatives considered

- **Separate workflows for 5A-5E.** Rejected because the owner requires one Phase 5 workflow.
- **Hide incomplete, review, or unclassified events.** Rejected because every retained event must
  remain visible and useful.
- **Use publication date as the actual event date.** Rejected because a timeline reference must not
  become a false event-date claim.
- **Use actor coordinates as missing event coordinates.** Rejected because affiliation is not
  evidence of event location.
- **Review Event Type suggestions in Terra Space.** Rejected; review happens directly in the local
  database with explicit owner decisions.
- **Create conservative rewritten titles for review events.** Rejected as unnecessary complexity;
  original upstream content, status, evidence, and reasons remain visible.
- **Automatic duplicate merge.** Rejected because a recommendation must not silently change event
  identity or evidence.

# Consequences

- Phase 5 has one workflow and five separately accepted internal stages.
- 5A can be planned from the verified Phase 4 baseline without designing later reference systems.
- Event Taxonomy and geographic reference data must be prepared before 5B and 5C respectively.
- Terra Space will distinguish event geography, actor geographic references, actual event dates,
  and publication-date timeline references.
- Final qualification is part of 5E rather than a separate assumed Phase 6, but its exact policy
  requires a future owner checkpoint.
- This decision authorizes documentation and planning only. It does not authorize a migration,
  workflow change, pilot, data run, merge, or publication.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Phase 4 Event Fact Extraction](Phase-4-Event-Fact-Extraction.md)
- [Terra Space n8n Workflow Folder Placement](Terra-Space-n8n-Workflow-Folder-Placement.md)
- [Project Knowledge](../Project-knowledge-Index.md)
