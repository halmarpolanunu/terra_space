---
type: Decision
title: Phase 4 Event Fact Extraction
description: Phase 4 extracts evidence-grounded event facts through narrow date, actor, and location steps without creating final events.
tags: [project-knowledge, decision, n8n, supabase, phase-4]
status: active
---

# Context

The verified post-reset pipeline now has 29 complete Phase 3 article results containing 109 Event
Candidates: 81 `VALID` and 28 `NEEDS_REVIEW`. Every candidate has a title, description, and evidence
quote. Phase 3 deliberately does not extract dates, epistemic status, actors, locations, taxonomy,
duplicates, or final event records.

The next stage needs to add the smallest useful set of structured event facts without turning one
local-model call into a large final-event pipeline. Review flags must continue to retain complete
output and must not stop later candidates from processing.

After Phase 4 completed, a controlled repeat against the same 109 candidates showed that dates
were stable in all 109 results, while actor arrays changed in 29 and location arrays changed in 25.
The complete facts payload matched exactly in 72 results. This shows that the combined extraction
call asks the local model to handle too many factual responsibilities at once, especially for
actors and locations. The owner chose to improve a single Phase 4 run before considering a design
that depends on multiple repeated runs.

# Decision

Create a later owner-approved Phase 4 named **Extract Event Facts**. Its inactive, manually started
n8n workflow will be named **Terra Space - Phase 4 - Extract Event Facts** and will be placed in
the n8n `Terra_Space` folder.

Phase 4 processes one Phase 3 Event Candidate at a time. Both `VALID` and `NEEDS_REVIEW` candidates
are eligible. The Phase 3 status is retained as context and never used as a pipeline stop. Each
candidate receives its Phase 1 cleaned article, Phase 2 Main Issue, candidate title, candidate
description, and candidate evidence quote as input.

The local model extracts only:

- one nullable event date and its precision: `exact`, `month`, `year`, or `unknown`;
- one epistemic status from the existing vocabulary: `confirmed`, `reported`, `alleged`,
  `planned`, `denied`, or `unknown`;
- zero or more actors, each with the name as written, a simple `source`, `recipient`, or
  `participant` role, and an evidence quote;
- zero or more locations, each with the name as written, a simple `country`, `admin1`,
  `city_regency`, or `unknown` level, and an evidence quote.

Phase 4 does not infer missing facts. A relative date such as "Thursday" may be resolved only when
the cleaned article and its publication date make the calendar date deterministic. Otherwise the
date remains null. Every non-null date, actor, and location must have a verbatim supporting quote
found in the cleaned article. Missing optional facts are valid empty or null values; uncertainty
about an extracted fact produces `NEEDS_REVIEW` while retaining all usable fields.

One local LM Studio extraction call is made per candidate. Deterministic checks then validate the
allowed vocabularies, date shape, and evidence-quote presence. A separate local LM Studio safeguard
reviews the complete candidate-fact result. The workflow continues with the next candidate after
each result is saved.

The planned storage contract follows the Phase 1-3 pattern:

- `terra_space_phase4_event_facts` stores one latest result per Phase 3 candidate;
- `terra_space_phase4_event_fact_processing_runs` stores append-only attempt history;
- `terra_space_phase4_pending_event_candidates` exposes candidates with no latest result or a
  latest technical `FAILED` result.

The stable candidate identity will be the Phase 3 result ID plus the candidate's `candidate_id`.
A rerun updates only a latest `FAILED` result and appends a new run. It never retries or overwrites a
latest `VALID` or `NEEDS_REVIEW` result automatically.

Normal reads and writes use Supabase nodes. Code nodes are limited to expanding the Phase 3 JSON
array into candidates, preparing model requests, parsing JSON, validating evidence and allowed
values, and preparing rows for Supabase.

# Approved reliability amendment — 2026-08-31

The existing Phase 4 workflow will remain the Phase 4 boundary, but its combined factual extraction
and safeguard will be split into narrower responsibilities:

1. Extract and validate the event date and epistemic status.
2. Extract actors only, then validate actor evidence deterministically.
3. Review actors with a separate actor-only safeguard.
4. Extract locations only, then validate location evidence deterministically.
5. Review locations with a separate location-only safeguard.
6. Combine all usable fields and save the Phase 4 latest result and append-only processing run.

Every narrow extractor receives the complete Phase 1 cleaned article. It also receives the
candidate identity and the context required to understand which candidate it is processing. The
actor extractor cannot produce dates or locations, and the location extractor cannot produce
dates or actors.

Each actor and location safeguard receives the complete cleaned article, the candidate title as an
identity label, and only the facts it is responsible for reviewing. It judges each fact against
that fact's own evidence quote. The Phase 3 candidate description and general candidate evidence
quote must not be presented as proof for an individual actor or location.

Deterministic validation remains authoritative for allowed values and evidence grounding. Every
retained actor and location needs a non-truncated verbatim quote found in the complete cleaned
article. An unsupported individual actor or location is omitted without erasing other usable
fields. The result keeps a concrete reason and becomes `NEEDS_REVIEW`. `FAILED` is reserved for a
technical problem that prevents the workflow from preparing any usable result.

Raw outputs from the narrow model steps and safeguards remain traceable in append-only Phase 4
processing history. Implementation should reuse the existing Phase 4 storage contract when it can
represent those outputs clearly as structured JSON. A migration is justified only if inspection
proves that the current contract cannot do so safely.

The adjusted workflow remains inactive, manually started, and located in n8n folder `Terra_Space`.
Implementation must begin with non-writing behavior tests, followed by a separately approved
five-candidate pilot. The owner must separately approve any workflow edit, migration, pilot, replay,
or full processing action.

# Result status rules

- `VALID`: a usable result passed deterministic checks and the safeguard; optional facts may be
  null or empty when the article does not state them.
- `INCOMPLETE`: the retained result is safe and usable, but a candidate-level optional fact could
  not be grounded without guessing. It keeps a concrete reason, does not require human review,
  and must remain visibly less complete than `VALID` downstream.
- `NEEDS_REVIEW`: the complete usable output is retained, together with a concrete review reason.
- `FAILED`: a technical failure prevented preparation of a usable result; it remains retryable on
  the next owner-started manual run.

Phase 4 result status does not erase or replace the original Phase 3 candidate status. Both remain
traceable.

# Approved classification amendment — 2026-09-08

The owner approved separating safe incompleteness from genuine review after a manual audit of the
21 review-flagged results in sequences 98–107. A result is not `NEEDS_REVIEW` merely because the
model proposed an unnecessary location metonym or an unsupported source actor that deterministic
validation correctly removed while leaving a usable result. Those discarded raw proposals remain
traceable in the stored model output.

Use `NEEDS_REVIEW` for an inherited Phase 3 evidence problem, a safeguard rejection or failure, an
unusable model response, or another material uncertainty. Use `INCOMPLETE` when a potentially
useful optional candidate fact—such as a date or participant—cannot be grounded inside the approved
candidate evidence boundary. Never fill that missing fact by inference.

The date validator may normalize an explicit English month name to `YYYY-MM` using the publication
year and may treat the model synonym `day` as the approved `exact` precision before normalizing an
explicit month-day. It must still require an exact supporting quote. Actor validation must omit an
actor that appears only in a clearly neighboring temporal clause. Date extraction must focus on
the candidate action rather than an older agreement or neighboring event mentioned in the same
article.

# Alternatives considered

- **Facts plus Event Type taxonomy.** Deferred because combining factual extraction and taxonomy
  classification makes local-model errors harder to diagnose.
- **Create final events immediately.** Rejected because taxonomy assignment, normalization,
  duplicate checks, and final-event authority form a separate, larger reliability boundary.
- **One model call for every candidate in an article.** Rejected for the baseline because one bad
  candidate could damage the complete article result and make retry behavior less precise.
- **Separate model call for every individual field.** The completed reliability comparison proved
  that the combined call is not reliable enough for actors and locations. The approved amendment
  therefore separates the unstable actor and location responsibilities while avoiding a separate
  model call for every small field.
- **Stabilize facts through multiple repeated runs.** Deferred. The owner chose first to improve
  the design of one Phase 4 run rather than depend on repeated model agreement.

# Outside scope

Phase 4 does not include Event Type classification, actor alias matching, actor normalization,
location normalization, country-code conversion, coordinate resolution, geocoding, relationship
graphs, duplicate detection, automatic merge, final events, Dashboard writes, a new review UI, or
changes to the verified Phase 1-3 baselines.

# Acceptance direction

Implementation planning must include an additive migration, database contract tests, an inactive
workflow, a small controlled pilot before all 109 candidates are processed, evidence-grounding
checks, retry verification, and read-only confirmation that Phase 1-3 row contents did not change.
No migration, workflow, or live pilot may run until separately approved by the owner.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Phase 3 Event Candidate Detection](Phase-3-Event-Candidate-Detection.md)
- [Project Knowledge](../Project-knowledge-Index.md)
