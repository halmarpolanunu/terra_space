---
type: Decision
title: Phase 5B Event Type Classification
description: Defines conservative two-pass local classification, controlled retries, Unclassified handling, and database-reviewed Event Type proposals for prepared Phase 5 events.
tags: [project-knowledge, decision, phase-5, phase-5b, event-types, taxonomy, lm-studio]
status: active
---

# Context

Phase 5A has produced 109 verified prepared event records: 43 `NORMAL` and 66 `LIMITED`. Every
record preserves its Phase 1, Phase 3, and Phase 4 source fields exactly. Phase 5B must add one
Event Type classification without rewriting those records, hiding limited events, forcing an
uncertain match, or expanding the official taxonomy without human authority.

The clean Supabase pipeline currently has no Event Type table. Project Knowledge already contains
an approved four-level international-relations taxonomy with 12 selectable leaf types and reviewed
descriptions. The owner chose to reuse those 12 types and to allow optional new-type proposals for
direct database review.

# Decision

Phase 5B will be added to the existing inactive n8n workflow **Terra Space - Phase 5 - Generate
and Qualify Events**. It classifies both `NORMAL` and `LIMITED` Phase 5A records, one record at a
time, using the same local LM Studio model for a classifier prompt and a separate safeguard prompt.

Each event may receive at most one primary Event Type. A type is saved only when the safeguard
accepts one exact active leaf from the approved taxonomy. Ambiguous or repeatedly rejected results
remain visible as `UNCLASSIFIED`; Phase 5B never forces the closest type.

# Approved taxonomy

The initial classification vocabulary is the 12-leaf tree defined in [Event Taxonomy Tree and
Management](Event-Taxonomy-Tree-and-Management.md). Its exact leaf names, definitions, and paths
are authoritative. The classifier receives only active leaves and their complete
domain/category/subcategory/type paths.

The Supabase reference contract will store each leaf's stable ID, exact name, description, domain,
category, subcategory, active state, and audit timestamps. Upper taxonomy levels organize and
explain the selectable leaves; they are never assigned to an event.

# Classification inputs and outputs

The classifier receives only the bounded prepared event:

- title, description, and exact candidate evidence;
- retained Phase 4 facts;
- normal or limited path;
- preserved upstream statuses and reasons;
- the active approved Event Type definitions.

It does not receive the complete article, external knowledge, another event from the article, or
facts rejected by Phase 4.

The latest Phase 5B result stores:

- the Phase 5A event-record identity;
- nullable approved Event Type identity and exact name snapshot;
- `CLASSIFIED`, `UNCLASSIFIED`, or retryable technical `FAILED` status;
- `AI_ASSIGNED` as the assignment source for an accepted match;
- a short classification reason grounded in the event and type definition;
- final safeguard status and reason;
- corrective retry count from zero through two;
- model and prompt versions, raw outputs, technical error, and processing time.

Phase 5A content remains unchanged. The Phase 5B latest result is unique per Phase 5A identity,
while an append-only processing table retains every completed Phase 5B attempt and its complete
classifier/safeguard trace.

# Classifier and safeguard flow

1. The classifier returns one exact active Event Type or `UNCLASSIFIED`, a short reason, and an
   optional proposed type when it identifies a clear taxonomy gap.
2. Deterministic code rejects malformed output and any selected name that is not an exact active
   taxonomy leaf.
3. The safeguard independently checks the event evidence, the selected definition, the reason,
   and—when present—the optional proposal.
4. An accepted exact type becomes `CLASSIFIED + AI_ASSIGNED`.
5. An accepted no-match result becomes `UNCLASSIFIED`.
6. A safeguard rejection returns concise feedback to the classifier for an immediate corrective
   attempt.
7. The flow permits the initial attempt plus at most two corrective attempts. If the third result
   is still rejected, the event becomes `UNCLASSIFIED` with the rejection trace retained.
8. A technical request, parsing, or persistence problem becomes `FAILED` and remains eligible for
   a later owner-started retry. Technical failure is never presented as a semantic no-match.

The safeguard also reviews an initial `UNCLASSIFIED` result: it checks that no approved type is a
clear match. It may reject that result and trigger corrective reclassification, but it cannot
select or save a type itself.

# Optional new-type proposals

An Unclassified event is not required to create a proposal. The classifier may propose one only
when the event exposes a clear gap in the approved definitions.

Each proposal belongs to one supporting event and stores a proposed name, description, reason,
possible overlap with approved types, supporting evidence, and one of these review statuses:

- `PENDING_REVIEW`
- `APPROVED`
- `MAPPED_TO_EXISTING`
- `REJECTED`

Similar proposals from different events remain separate. Phase 5B does not automatically group,
merge, create, or activate them. The owner and agent review proposals through direct local database
queries. An explicit owner decision is required to approve a new official type, map the event to an
existing type, or reject the proposal. Approval or mapping is followed by an explicit reprocessing
of the supporting event; it is not a hidden database side effect.

This controlled proposal path supersedes the blanket no-suggestion rule in [Closed Event Type
Taxonomy](Closed-Event-Type-Taxonomy.md). Human authority and the prohibition on automatic
taxonomy expansion remain unchanged.

# Production-readiness gates

Implementation will use test-first database and transformer contracts. A controlled pilot runs
before the complete Phase 5B baseline and includes:

- clear matches across Security & Conflict, Diplomacy, and Economy & Energy;
- both normal and limited inputs;
- a plausible overlap between approved types;
- a genuine Unclassified result;
- an optional new-type proposal;
- safeguard rejection followed by immediate corrective processing;
- final rejection after two corrective attempts;
- technical failure and idempotent retry behavior.

Review checks exact upstream preservation, exact taxonomy-name enforcement, reason quality,
retry limits, latest/history consistency, proposal isolation, zero automatic taxonomy expansion,
and unchanged Phase 1-4 fingerprints. The workflow remains inactive. Work stops after the pilot
and again after the full 5B run. Phase 5C does not begin until Phase 5B is explicitly accepted.

# Alternatives considered

- **One classifier without a safeguard.** Rejected because the owner chose independent
  verification and immediate corrective reprocessing.
- **Force the nearest approved type.** Rejected because a visible Unclassified result is more
  trustworthy than an incorrect assignment.
- **Automatically combine similar proposals.** Rejected as an unnecessary second matching system
  before human review.
- **Require approval for every accepted existing type.** Rejected because accepted matches are
  stored as auditable `AI_ASSIGNED` results and evaluated through pilot and sampling gates.
- **Classify only normal records.** Rejected because a limitation does not prevent an otherwise
  clear type match.
- **Use the complete article.** Rejected because neighboring events could contaminate the bounded
  candidate classification.

# Consequences

- Phase 5B needs an additive taxonomy reference contract, latest classification storage,
  append-only history, retry-aware pending input, and separate proposal review storage.
- The existing Phase 5 workflow gains a 5B group after the accepted 5A group; no second Phase 5
  workflow is created.
- The two-pass flow can make up to six local model calls per event: three classifier calls and
  three safeguards. Normal accepted cases use only one classifier and one safeguard.
- Unclassified and limited events remain usable inputs for later Phase 5 stages.
- This decision authorizes documentation and planning only. It does not authorize a migration,
  workflow edit, pilot, full data run, taxonomy review mutation, or publication.

# Navigation

- [Phase 5 Event Generation and Qualification](Phase-5-Conservative-Event-Drafts.md)
- [Event Taxonomy Tree and Management](Event-Taxonomy-Tree-and-Management.md)
- [Initial Global International Relations Event Taxonomy](Initial-Global-IR-Event-Taxonomy.md)
- [Decisions Index](Decisions-Index.md)
- [Project Knowledge](../Project-knowledge-Index.md)
