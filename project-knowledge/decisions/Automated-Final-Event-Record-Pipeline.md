---
type: Decision
title: Automated Final Event Record Pipeline
description: Phase 3 automatically turns grounded candidates into final event records through factual enrichment, taxonomy classification, deterministic checks, and an independent local-LLM safeguard.
tags: [project-knowledge, decision, n8n, event-records, automation]
status: active
---

# Context

The Phase 2 n8n workflow now produces grounded event candidates from a Phase 1 news article.
Each candidate has a working title, a broad classification, named entities, and an exact source
quote with character offsets. The next pipeline phase must turn each candidate into a detailed,
traceable event record without mixing facts between candidates or letting unsupported model output
reach the final dataset.

The older staged-pipeline decision prescribed four narrow model calls per candidate and universal
human approval before events could appear in final outputs. The owner chose a faster Phase 3
pipeline: two substantive calls plus an independent LLM safeguard, automatic retry, and
automatic finalization when every gate passes.

# Decision

Phase 3 is the final n8n processing phase. Its workflow will be named **Terra Space - Event
Records** and starts from one Phase 1 article UUID. It reads only the latest Phase 2 candidate
result for that article, then processes every candidate sequentially.

The final record identity is deterministic: `p1_news_uuid + evidence_start + evidence_end` from
the grounded Phase 2 candidate. A changed candidate title therefore does not create a new final
record when its source evidence is unchanged.

## Per-candidate processing

1. **Factual enrichment (local LLM call 1).** Produce one detailed event record: factual title and
   summary; `source_actors` and `target_actors`; event date, date precision, and original date
   wording; one or more locations; and epistemic status.
2. **Field-level grounding.** Every populated factual field must have its own exact source quote
   and deterministic source offsets. Unsupported fields remain empty or explicitly unknown.
   Actor names are saved exactly as written by the source; alias/canonical resolution is deferred.
3. **Local coordinate resolution.** A deterministic local gazetteer resolves each grounded
   location by exact city, then admin1, then country lookup. It stores latitude, longitude,
   coordinate precision, and a resolved/unresolved state. The LLM never supplies coordinates;
   unresolved locations stay blank rather than guessed.
4. **Taxonomy classification (local LLM call 2).** Read the active Event Type leaves from an
   owner-managed Supabase taxonomy table. Return one active leaf, `UNCLASSIFIED`, or `FAILED`.
   The workflow derives the parent taxonomy path from the selected leaf and never creates a type.
5. **Independent safeguard (local LLM call 3).** Check the proposed factual record, field evidence,
   location output, and taxonomy result against the original source. It returns structured
   `ACCEPT` or `REJECT` plus reasons.
6. **Automatic retry.** A reject or failure causes one complete fresh retry of the three LLM calls
   and deterministic checks. Each candidate has at most two complete attempts.
7. **Outcome.** A record becomes `FINAL` only if deterministic checks pass and the safeguard
   accepts it. After a second failure or rejection it becomes `EXCEPTION`: safely stored with all
   reasons but excluded from final outputs.

## Storage

- `terra_space_event_types`: owner-managed active taxonomy leaves, their parent path, description,
  and active state.
- `terra_space_event_records`: one latest Phase 3 output per deterministic candidate identity.
  It holds either `FINAL` or `EXCEPTION` plus the detailed event record and final metadata.
- `terra_space_event_record_runs`: append-only record of every first attempt and retry, including
  raw outputs, grounding/validation results, safeguard decision, and error/rejection reasons.

Downstream consumers query `terra_space_event_records` where `pipeline_outcome = 'FINAL'`.
Exceptions are preserved for audit and deliberate future reprocessing, not a mandatory review
queue.

# Alternatives considered

- **One large model call that extracts and classifies everything.** Rejected because factual
  extraction, classification, and safety checking would be coupled and harder to diagnose.
- **Four narrow factual classifier calls plus taxonomy classification.** Superseded for this n8n
  pipeline by the owner's two-substantive-call design, which lowers runtime and workflow complexity
  while keeping strict field grounding and an independent safeguard.
- **Universal manual approval.** Superseded: qualified records finalize automatically; only
  exceptions are withheld.
- **LLM-generated coordinates or runtime cloud geocoding.** Rejected because both would violate
  the local-first and never-invent rules.

# Reasons

- Candidate-by-candidate processing protects contextual consistency and makes retries isolated.
- The first call builds a coherent event record; the second has a smaller, clearer taxonomy-only
  task; the third independently challenges the result.
- Deterministic quote grounding and coordinate resolution prevent an LLM acceptance from being the
  only safeguard.
- Automatic finalization removes unnecessary review work while retaining a fail-closed exception
  path and complete audit history.

# Consequences

- The North Star's universal human-approval rule is replaced for this pipeline by automatic
  finalization after the defined safeguards.
- The location coordinate work moves into Phase 3, ahead of downstream map use.
- Existing Phase 1 and Phase 2 rows are read-only inputs; this phase adds new tables only.
- A detailed schema and n8n node-by-node implementation plan must be reviewed before any database
  or workflow change.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Staged Event Detection Pipeline](Staged-Event-Detection-Pipeline.md)
- [Event Taxonomy Tree and Management](Event-Taxonomy-Tree-and-Management.md)
- [Local Location Coordinate Resolution](Local-Location-Coordinate-Resolution.md)
- [Project Knowledge](../Project-knowledge-Index.md)
