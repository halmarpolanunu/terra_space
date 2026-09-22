---
type: Decision
title: Phase 5C Timeline and Geography
description: Phase 5C prepares honest timeline references, reviewed event coordinates, and typed actor geography without turning suggestions into facts.
tags: [project-knowledge, decision, phase-5, phase-5c, timeline, geography, actors, n8n]
status: active
---

# Context

Phase 5A has 109 verified prepared event records and Phase 5B has 109 accepted-for-progression
classifications. The Phase 5C baseline contains 34 events with an actual event date and 75 without
one; all 109 retain a source publication date. Forty-four events contain 48 Phase 4 event-location
references, while 90 events contain 164 actor references. None of those Phase 4 location objects
contains coordinates, and the active Supabase schema has no canonical location, actor,
affiliation, or coordinate reference tables.

Terra Space needs useful timeline and map data without converting an article date into a claimed
event date, guessing coordinates, or presenting an actor's affiliation as the physical location of
an event. The owner also wants actors and recipients available for geographic network views.

# Decision

## Scope and authority

Phase 5C is added to the existing inactive n8n workflow **Terra Space - Phase 5 - Generate and
Qualify Events** (`FAxBx6a9fnXjLfVO`) in the `Terra_Space` folder. It reads Phase 5A records and
accepted Phase 5B results, writes only new Phase 5C objects, and does not modify Phase 1-5B.

Coordinates and actor relationships become authoritative only when they match approved local
reference data. A language model may optionally prepare a review suggestion, but it cannot create,
approve, or apply a coordinate, actor identity, or geographic relationship.

## Timeline

- Preserve Phase 4 `event_date` and `event_date_precision` unchanged.
- An exact date uses that date for display and ordering.
- A month-only or year-only date keeps its original display precision. A derived first-day value
  may be stored only as a technical sorting key and is never displayed as an exact event date.
- When the event date is unknown, use the source publication date as
  `timeline_reference_date` with basis `SOURCE_PUBLICATION_DATE`.
- A source publication date is a timeline reference, not an inferred event date.

## Geographic reference authority

Use a hybrid local reference system:

1. Reuse the checked-in GeoNames-based offline gazetteer as the coordinate source.
2. Store only coding-agent-verified canonical places and aliases needed by the current baseline in the
   active Phase 5C reference tables.
3. Expand those references incrementally when new articles introduce new names.
4. Never call a network geocoder at runtime, accept model-generated coordinates, fuzzy-select a
   nearest name, or silently resolve an ambiguous alias.

An unmatched label remains unresolved. Phase 5C creates or reuses one review suggestion for the
same normalized unresolved subject. Review is optional and deferred: Phase 5C does not wait for the
owner or a coding agent to resolve it. Only when the owner later requests a pipeline review may a
coding agent such as Codex or Claude investigate the item, record sources and rationale, and
approve or reject it under these conservative rules. An approved suggestion queues only affected Phase 5C records for a later
owner-started targeted rerun. Mapping a suggestion also approves that exact normalized input as an
alias of the selected reference, so future occurrences reuse the completed decision instead of
opening another suggestion.

Runtime AI suggestions remain non-authoritative. A pipeline run cannot promote its own suggestion
to an approved reference; agent review is a separate, auditable maintenance action requested by
the owner. If the agent cannot verify a match confidently, the item remains unresolved without
coordinates.

The initial baseline must not add a contextual-review schema solely to improve map coverage.
Context-sensitive labels remain unresolved until the owner asks for review later.

## Event Geography

- Resolve every supported Phase 4 event location and retain all distinct resolved locations for an
  event.
- Preserve the original location name, level, and exact Phase 4 evidence alongside the approved
  canonical reference, coordinates, source, and coordinate precision.
- Event locations never borrow coordinates from actors or recipients.
- Events without map coordinates remain visible beside the map with one of two explanations:
  `NO_LOCATION_STATED` or `AWAITING_REFERENCE_REVIEW`.
- Never invent a centroid or placeholder coordinate.

## Actor Network

- Apply the same resolution rules to Phase 4 `source`, `participant`, and `recipient` actor roles.
- The first version stores at most one primary typed geographic reference per approved actor.
- Supported initial relationship types are `REPRESENTED_COUNTRY`, `HEADQUARTERS`, and
  `NATIONALITY`. Use only the relationship appropriate to the reviewed actor record.
- A country relationship uses the approved country-capital coordinate as a labelled geographic
  reference point. It does not claim that the actor is physically present there.
- An approved organization headquarters may use its approved headquarters place.
- Private home locations are excluded.
- Unknown actors remain visible without a map point and enter the reference-review queue.

## Storage

Phase 5C initially uses five additive tables:

1. `terra_space_phase5_geographic_references` stores approved canonical places, aliases,
   coordinates, precision, provenance, and active state.
2. `terra_space_phase5_actor_geographic_references` stores approved actor names and aliases, actor
   kind, one primary typed relationship, and its geographic reference.
3. `terra_space_phase5_reference_suggestions` stores deduplicated unresolved location or actor
   subjects and optional local-model suggestions for direct review.
4. `terra_space_phase5_timeline_geographies` stores one latest Phase 5C result per Phase 5A event.
5. `terra_space_phase5_timeline_geography_runs` stores append-only Phase 5C history snapshots.

The latest and history snapshots retain links to the Phase 5A record and Phase 5B classification,
the original timeline fields, the separate timeline reference, resolved and unresolved event
geographies, resolved and unresolved actor geographies, component statuses, reasons, technical
errors, and processing time.

Component geography statuses are `RESOLVED`, `PARTIAL`, `NO_LOCATION_STATED`,
`NO_ACTORS_STATED`, or `AWAITING_REFERENCE_REVIEW` as applicable. The overall Phase 5C processing
status is `PREPARED` or technical `FAILED`. Missing or unresolved geography is a retained
limitation, not a technical failure and not a reason to remove the event.

## Workflow processing and optional AI assistance

The workflow processes one pending event at a time. It prepares the timeline deterministically,
looks up event locations, looks up actors and recipients, creates or reuses unresolved-reference
suggestions, validates the complete result, writes the latest snapshot, appends history, and
continues.

Exact approved matches require no model call. For a previously unseen unresolved subject, local AI
may optionally suggest a canonical name or actor relationship. The suggestion stores its model,
prompt version, reason, and raw output, remains `PENDING_REVIEW`, and has no authority. If the model
is offline or its output is invalid, the event still completes with a plain unresolved suggestion.

The workflow stays inactive except during a separately approved MCP-triggered run. It never merges
events, publishes final events, or starts Phase 5D/5E work.

## Production-readiness checkpoint

Begin with the current 109-event baseline, not a comprehensive global registry. A controlled
12-event pilot must cover exact, month-only, year-only, and unknown dates; publication-date
fallback; single, multiple, missing, resolved, and unresolved event locations; resolved and
unresolved actors/recipients; repeated unresolved subjects; and NORMAL, LIMITED, CLASSIFIED, and
UNCLASSIFIED inputs.

The pilot passes only when dates and labels are honest, every coordinate exactly matches an
approved reference, event and actor geography remain separate, suggestions deduplicate, missing
geography remains visible, targeted reruns affect only related Phase 5C records, history is
preserved, Phase 1-5B fingerprints are unchanged, tests and n8n validation pass, the workflow is
inactive, and the owner accepts the aggregate review result and material exceptions.

After the pilot, stop for owner review of aggregate results and exceptions; the owner does not need
to inspect every reference row. A full Phase 5C baseline run requires separate approval and
must be followed by another production-readiness stop before Phase 5D.

# Alternatives considered

- **Use only exact entries already present in the gazetteer** — safer than guessing but provides no
  reviewed alias path and would leave avoidable gaps unresolved.
- **Build a comprehensive global place and actor registry first** — deferred because it is larger
  than the current single-owner baseline requires.
- **Use an online geocoder or automatic model inference** — rejected because it leaks local data,
  is not reproducible offline, and can turn uncertain names or affiliations into false facts.
- **Use actor coordinates when an event location is missing** — rejected because actor affiliation
  and event occurrence are different claims.
- **Hide unmapped events or give them placeholder pins** — rejected because hiding loses visibility
  and placeholder coordinates misrepresent geography.

# Reasons

- Deterministic approved references make production results reproducible and auditable.
- Optional AI suggestions reduce review effort without granting AI authority.
- Separate Event Geography and Actor Network modes prevent a common and serious semantic error.
- A baseline-first registry is small enough to review and can expand without redesigning the
  pipeline.
- Latest plus append-only history follows the already verified Phase 5A/5B pattern.

# Consequences

- Initial map coverage will remain incomplete until reference suggestions are reviewed.
- Country-capital points are symbolic relationship anchors and must always display that meaning.
- Actor affiliations can change; a conflicting or uncertain relationship remains unresolved rather
  than silently replacing an approved one. More advanced time-versioned actor affiliations may be
  added later if real data demonstrates the need.
- The five-table structure, statuses, supported relationships, reference set, and optional AI
  suggestion policy may be revisited before Phase 5C is declared production-ready.
- Phase 5B's 40 taxonomy proposals remain deferred but must be reviewed before Phase 5E
  qualification or production release.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Project Knowledge](../Project-knowledge-Index.md)
- [Phase 5 Event Generation and Qualification](Phase-5-Conservative-Event-Drafts.md)
- [Local Location Coordinate Resolution](Local-Location-Coordinate-Resolution.md)
