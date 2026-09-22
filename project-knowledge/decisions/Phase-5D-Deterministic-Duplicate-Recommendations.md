---
type: Decision
title: Phase 5D Deterministic Duplicate Recommendations
description: Defines strict, explainable, model-free possible-duplicate recommendations for Phase 5 events without automatic merging.
tags: [project-knowledge, decision, phase-5, deduplication]
status: active
---

# Context

Phase 5A-5C has prepared 109 separate event records. Phase 5D must help prevent accidental double
counting without erasing distinct steps in a story. The owner chose deterministic comparison only,
including same-article and cross-article pairs, and restricted possible-duplicate recommendations
to records describing the same action on the same actual exact event date. A proposal and a later
vote, for example, remain separate related events.

In the current baseline, 30 records have an exact event date. They produce 31 same-date pairs:
four from the same article and 27 from different articles. The same date, article, country, topic,
or Event Type alone is not sufficient evidence of duplication.

# Decision

Phase 5D is added later to the existing **Terra Space - Phase 5 - Generate and Qualify Events** n8n
workflow in the `Terra_Space` folder. It uses no LM Studio or other model call. It reads the
retained Phase 5 event title, description, actors/recipients, Phase 5C event geography, and actual
event date. It does not alter Phase 1-5C records.

## Comparison rule

1. Compare distinct event-record pairs in stable ID order. Same-article and cross-article pairs
   use the same rule.
2. Both events must have `event_date_precision = exact`, non-null actual `event_date`, and the same
   actual date. `timeline_reference_date` and publication date are never substitutes.
3. Normalize title tokens by lowercasing, removing punctuation and a small fixed stopword set, and
   deduplicating tokens. The pair must share at least three meaningful title tokens and have title
   token Jaccard similarity of at least `0.75`. This is a conservative lexical proxy for the same
   action, not a semantic claim.
4. In addition, the pair must share an exact normalized, non-generic actor or recipient name from
   retained facts, or the same approved city/regency or admin-1 geographic-reference ID. A shared
   country alone, an unresolved place alone, Event Type alone, or being from the same article is
   insufficient. A short fixed list of generic actor descriptions such as “people” and “officials”
   is excluded from subject matching.
5. If the pair has an explicit conflicting action token in the two titles (for example, “proposes”
   versus “approves”), do not recommend it even if the other thresholds pass. This contrast list
   is fixed, versioned, and tested; it does not infer an unstated action.
6. When any required signal is absent or ambiguous, emit no recommendation. Zero recommendations
   is a valid Phase 5D result.

The threshold and exclusion lists are versioned implementation constants, not hidden model
judgments. A future change requires a new reviewed rule version and a targeted re-evaluation; it
does not silently rewrite old decisions.

## Stored output

Store one latest decision per unordered event pair and append-only run history. A positive decision
has `POSSIBLE_DUPLICATE`, the two event IDs, exact shared date, rule version, normalized title
overlap score, matched actor/recipient or specific-location identifiers, and short reason codes.
Non-matching pairs need not be stored as persistent rows; a run summary records counts considered,
excluded by each gate, and recommended. A pair can be recomputed idempotently without duplicate
latest rows. No event is merged, deleted, hidden, reclassified, or published by Phase 5D.

Review of recommendations happens later through the database with the owner and a coding agent.
“Related but separate” is an explanation for a non-recommendation in tests and audits, not a new
relationship table in this first version.

## Failure and review boundary

The implementation must validate inputs and never fabricate missing dates, subjects, actions, or
coordinates. Technical errors remain visible and do not modify upstream events. The Phase 5D
stage must support a controlled pilot, repeat-run idempotency, complete baseline audit, and an
owner acceptance stop before Phase 5E. The existing Phase 5 workflow remains inactive outside
explicitly approved runs. Database migration, workflow edit, pilot, and full run each need their
own explicit approval.

# Alternatives considered

- Broader fuzzy-text or embedding matching: rejected for the first version because it could flag
  merely related steps and would require more subjective review.
- Model-assisted borderline matching: deferred; the owner chose deterministic-only comparison.
- Same-article shortcut: rejected because one article can contain several distinct actions.
- Publication-date matching: rejected because publication date is not necessarily event date.
- Automatic merging or hiding: rejected by the Phase 5 safety boundary.

# Reasons

The strict gates favor precision over recall. They are simple to explain, test, and revise. They
may miss true duplicates expressed with very different words or without a specific shared subject;
that is preferable to silently conflating separate events at this checkpoint.

# Consequences

- The initial recommendation count may be zero, even when a human recognizes a same-story pair.
- All 109 events stay separate and visible for later Phase 5E decisions.
- A reviewed example set must include clear duplicates, different actions in one story, unrelated
  same-day events, unknown-date events, same-article pairs, and cross-article pairs.
- The detailed implementation plan must define the exact fixed stopword, generic-subject, and
  action-contrast lists before any code or migration is applied.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Phase 5 Event Generation and Qualification](Phase-5-Conservative-Event-Drafts.md)
- [Project Knowledge](../Project-knowledge-Index.md)
