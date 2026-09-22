---
type: Verification
title: Phase 4 Review Audit — 2026-09-08
description: Manual classification of the 21 review-flagged Phase 4 results from article sequences 98 through 107.
tags: [project-knowledge, verification, phase-4, data-quality]
status: completed
---

# Phase 4 Review Audit — 2026-09-08

## Scope and method

All 21 `NEEDS_REVIEW` Phase 4 results from article sequences 98–107 were compared with their Phase
3 candidate, exact candidate evidence, complete cleaned Phase 1 article, retained Phase 4 facts,
raw model responses, and review reasons. This was a read-only review: no database result or n8n
workflow was changed.

The review uses three practical classes:

- **False review tag:** the saved facts are usable and the workflow correctly discarded an
  unnecessary or unsupported model proposal. The discarded proposal should be logged as a warning,
  not make the complete result require review.
- **Incomplete:** a useful result is missing an optional detail because the candidate evidence does
  not state it precisely enough. Nothing should be guessed, and manual review is unnecessary.
- **True review:** the upstream candidate itself is unsupported or the saved Phase 4 output has a
  material extraction error that must be repaired before it is treated as reliable.

## Result

| Classification | Count | Share |
| --- | ---: | ---: |
| False review tag | 5 | 23.8% |
| Incomplete | 7 | 33.3% |
| True review | 9 | 42.9% |
| **Total** | **21** | **100%** |

### False review tags — usable results

| Candidate | Why the review tag is false |
| --- | --- |
| 98 c2 | The unsupported proposal `Alexander Dobrindt` was correctly omitted because its quote only says “he.” Russia, Leipzig, 4 August, and confirmed status remain correctly grounded. |
| 98 c4 | Romania and Estonia were correctly retained as actors and rejected as locations because the sentence uses them metonymically. No event-location fact is required. |
| 99 c1 | The model borrowed 50Hertz and narrower locations from other article passages. Those were correctly omitted; Germany, Tuesday, and confirmed status make the retained result usable. |
| 101 c1 | Russia was correctly retained as the actor and rejected as a geographic event location. An empty location array is valid. |
| 103 c4 | Canada was correctly retained as the actor and rejected as a geographic event location. The date and remaining facts are grounded. |

### Incomplete because the candidate evidence lacks a safe optional detail

| Candidate | Missing or ambiguous detail |
| --- | --- |
| 99 c2 | The service-interruption sentence has no date. Tuesday appears in the preceding explosives event, so transferring it would cross the approved candidate boundary. |
| 100 c2 | The missile-depot sentence has no date or location. Tuesday and Kyiv occur in surrounding text, but the selected evidence does not explicitly bind them to this candidate. |
| 101 c2 | The sentence states the March launch results but does not name Russia or Plesetsk; those details appear elsewhere in the article. |
| 102 c1 | The setup sentence has no event date. The later 7 September date refers to the formal launch, which is a distinct event. |
| 103 c1 | Carney’s rebuke sentence has no date. The model incorrectly borrowed 8 September from the separate Canadian-tariffs event, and the workflow safely omitted it. |
| 103 c2 | “Last week” cannot be converted into one exact day without guessing. |
| 103 c3 | The US-tariffs sentence has no date. The model incorrectly borrowed 8 September from Canada’s separate retaliatory-tariffs event. |

### True review results

Five are true reviews inherited from unsupported Phase 3 descriptions:

| Candidate | Evidence problem |
| --- | --- |
| 100 c1 | The selected quote does not support the claimed six employee deaths. |
| 100 c3 | The selected quote says 600 people were aboard, not that 600 were evacuated. |
| 103 c5 | The selected quote says talks imploded, but not that this caused sweeping tariffs. |
| 104 c1 | The selected quote does not support the added ceremonial-event-in-Palau detail. |
| 107 c3 | “The two sides” does not identify Iran and the United States inside the selected evidence. |

Four expose Phase 4 extraction defects:

| Candidate | Phase 4 defect |
| --- | --- |
| 101 c4 | The explicit 23 August strike date was lost because the model returned unsupported precision `day`; Russia was also retained as a recipient using a clause about a separate launch. |
| 105 c3 | The model returned `June` with month precision; the validator discarded it instead of safely normalizing it to `2026-06`. |
| 105 c4 | The model returned `July` with month precision; the validator discarded it instead of safely normalizing it to `2026-07`. |
| 107 c1 | The extractor focused on the June ceasefire deal instead of Pezeshkian’s Tuesday statement, so it lost the statement date and epistemic status. |

## Recommended repair

1. Add an explicit incomplete outcome so missing optional source details are not presented as
   requiring human review.
2. Treat a correctly rejected unnecessary actor/location proposal as an audit warning when the
   remaining result is usable; do not automatically promote it to `NEEDS_REVIEW`.
3. Normalize grounded month names using the publication year and normalize the model synonym
   `day` to the approved `exact` precision before shape validation.
4. Strengthen date/epistemic focus on the candidate action, especially when the evidence mentions
   both a current statement and an older agreement.
5. Add focused regression tests, update only the inactive Phase 4 workflow, then selectively
   regenerate the four Phase 4-defect candidates. Any latest-row deletion and replay still needs
   separate owner confirmation under the project safety rules.

## Current boundary

The owner approved the classification change. The database contract and inactive Phase 4 workflow
now support `INCOMPLETE`; no stored result was reclassified or regenerated during that installation.
Changing the audited latest rows still requires a separate bounded data action. Phase 5 remains
paused.

## Implementation follow-up

The approved cleanup reclassified the five false tags and seven incomplete results, then
regenerated the four Phase 4 defects. A final separately confirmed retry applied the test-driven
v9 statement-date rule to sequence 107 c1. It is now `VALID` with the grounded `2026-09-01`
statement date, `reported` epistemic status, and source-backed actors. Final sequences 98–107 state
is 17 `VALID`, 8 `INCOMPLETE`, 5 genuine `NEEDS_REVIEW`, 0 `FAILED`, and 37 append-only attempts.
The workflow was restored to its normal source and remains inactive; Phase 5 remains paused.

## Navigation

- [Current Status](Current-Status.md)
- [Phase 4 Event Fact Extraction](decisions/Phase-4-Event-Fact-Extraction.md)
- [Project Knowledge](Project-knowledge-Index.md)
