---
type: Implementation Plan
title: n8n Phase-Prefixed Table Transition Implementation Plan
description: Rewire the four inactive Terra Space n8n workflows to the fresh Phase 1, Phase 2, and Phase 3 Supabase contracts.
tags: [project-knowledge, plan, n8n, supabase, pipeline]
status: in-progress
---

# n8n Phase-Prefixed Table Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the verified one-click pipeline to the new phase-prefixed tables while preserving grounding, taxonomy, safeguard, retry, no-candidate, and human-authority rules.

**Architecture:** Update each existing stage in place after saving an export/version backup. Phase 1 writes `phase1_sources`; Phase 2 uses latest-plus-history tables; Phase 3 appends attempt history and creates authoritative events through `phase3_create_pipeline_event`. The master continues orchestrating the same three workflow IDs.

**Tech Stack:** n8n Code, Supabase, HTTP Request/RPC, Execute Sub-workflow, local LM Studio.

## Global Constraints

- Prerequisite: the Supabase foundation completion gate has passed.
- Keep all four workflows inactive throughout this plan.
- Preserve workflow IDs: Phase 1 `gABPryH3jTe2Ktz5`, Phase 2 `pO6m1mpaHz2Ae5ZR`, Phase 3 `qsbIodzbMPxgQeRg`, master `SwXzUU9aHg4NZ9Kx`.
- Do not change prompts, model, temperature, timeouts, exact-quote grounding, taxonomy selection, local gazetteer logic, independent safeguard, or one-retry behavior.
- Do not delete or rename legacy Supabase tables.
- A repeated candidate key must not create a duplicate `phase3_events` row or overwrite a human edit.
- Use the private local service credential for RPC; never put a key directly in node JSON or Code source.

---

### Task 1: Save recoverable workflow baselines

**Files:**
- Create: `project-knowledge/plans/evidence/2026-08-10-n8n-transition/README.md` only if durable evidence paths are needed; keep secret-bearing exports outside Git.

**Interfaces:**
- Produces: version/export rollback points for all four workflow IDs.

- [x] Record workflow metadata, structure, activation state, validation result, and current version ID for all four workflows.
- [x] Export full workflow JSON to a dated ignored backup directory and verify each export can be parsed.
- [x] Confirm all workflows are inactive before the first update operation.

### Task 2: Move Phase 1 to `phase1_sources`

**Files:**
- Modify: n8n workflow `Terra Space - Input News Manual` (`gABPryH3jTe2Ktz5`).

**Interfaces:**
- Consumes the existing six-field form/internal contract.
- Produces `{stage:'PHASE_1', status:'SUCCESS', p1_uuid:<phase1_sources.id>, p1_title, cleaned_character_count}`.

- [x] Change `Save Manual News to Supabase` from `terra_space_news_v2` to `phase1_sources` with this explicit mapping:

```text
id: omit/default
title <- p1_title
publication_date <- p1_published_date
raw_content_text <- p1_raw_content_text
cleaned_content_text <- p1_clean_content_text
source_domain <- p1_source_domain
source_url <- p1_source_url
author <- p1_author
collection_source <- manual_input
processing_status <- completed
processing_error <- null
```

- [x] Change `Build Phase 1 Stage Result` to read the returned `id` and expose it as `p1_uuid` for backward-compatible sub-workflow handoff.
- [x] Add `Save Phase 1 Processing Run` after the source save with `SUCCESS`, model/prompt values, character count, raw cleaning output, and processed time.
- [x] Test valid input. Confirmed by master execution `1669`: `phase1_sources` got exactly one row (`id 81322f2f-a959-438e-a77e-0ce5adc0f582`) and `phase1_processing_runs` got exactly one matching `SUCCESS` row (2,890 characters both places).
- [ ] **Not yet run — needs the owner.** Test blank raw text creates neither row. (Earlier attempts with this exact article failed before reaching a real blank-input test — see the ad-iframe defect below — so this specific negative case is still open.)
- [x] Validate with 0 errors and 0 warnings and create a workflow-version checkpoint.

### Task 3: Move Phase 2 latest and history persistence

**Files:**
- Modify: n8n workflow `Terra Space - Event Candidates` (`pO6m1mpaHz2Ae5ZR`).

**Interfaces:**
- Consumes `{p1_uuid}` where the value is `phase1_sources.id`.
- Produces the unchanged Phase 2 stage result contract.

- [x] Change `Get Phase 1 Article` to `phase1_sources`, filter `id = p1_uuid`, and update Code expressions to use `cleaned_content_text`, `title`, and `id`.
- [x] Change `Create Run History` to `phase2_candidate_runs` and map `p1_news_uuid` expressions to `phase1_source_id`.
- [x] Change latest lookup/create/update nodes to `phase2_event_candidates`, using `phase1_source_id` as the unique lookup field.
- [x] Preserve history-before-latest ordering and preserve structured JSONB values without stringifying them.
- [ ] **Not yet run — needs the owner.** Test a grounded article twice: two run rows, one latest row, identical source ID, and no duplicate latest result.
- [ ] **Not yet run — needs the owner.** Test `NO_MAIN_ISSUE`: Phase 2 returns successful `NO_EVENT_CANDIDATE`, writes history/latest, and does not invoke Phase 3 through the master.
- [x] Validate with 0 errors and 0 warnings and create a workflow-version checkpoint.

### Task 4: Move Phase 3 reads and append-only history

**Files:**
- Modify: n8n workflow `Terra Space - Event Records` (`qsbIodzbMPxgQeRg`).

**Interfaces:**
- Consumes `{p1_uuid}` where the value is `phase1_sources.id`.
- Produces per-candidate run history plus one idempotent authoritative event per candidate key.

- [x] Change source, candidate, taxonomy, and gazetteer nodes:

```text
Get Phase 1 Source -> phase1_sources, id
Get Latest Event Candidates -> phase2_event_candidates, phase1_source_id
Get Active Event Types -> phase3_event_types
Resolve Primary Location Locally -> phase3_location_gazetteer
Save Event Record Run -> phase3_event_runs
Get This Run's Record Runs -> phase3_event_runs, phase1_source_id + processed_at
```

**Execution note — the taxonomy source differs from what this task assumed.** The legacy
`terra_space_event_types` table carried `domain_name`/`category_name`/`subcategory_name` directly
on each flat row. The new `phase3_event_types` table is deliberately normalized (`id`, `name`,
`description`, `is_active` only); the four-level path now lives in the separate
`phase3_taxonomy_nodes` tree (`id`, `name`, `level`, `parent_id`, `event_type_id`, `is_active`),
per the approved [Event Taxonomy Tree and Management](../decisions/Event-Taxonomy-Tree-and-Management.md)
decision. A single `getAll` filter can no longer reconstruct the path a candidate's taxonomy prompt
needs. Added one new read-only node, `Get Taxonomy Nodes` (`phase3_taxonomy_nodes`, all 33 rows,
between `Get Active Event Types` and `Collect Active Event Types`), and rewrote `Collect Active
Event Types` to walk each active `event_type`-level node up through its subcategory, category, and
domain parents and join it back to its active `phase3_event_types` row. The resulting `active_types`
array has the exact same shape (`event_type_id`, `event_type_name`, `event_type_description`,
`domain_name`, `category_name`, `subcategory_name`, `is_active`) the rest of the pipeline already
expected, so `Build Taxonomy Request` and `Validate Taxonomy Result` needed no changes at all.

- [x] Keep candidate keys deterministic as `<phase1 source UUID>:<evidence_start>:<evidence_end>`.
- [x] Remove legacy latest-row create/update persistence to `terra_space_event_records` only after the replacement RPC path is connected and validated.
- [x] Add `Create Authoritative Phase 3 Event`, calling `phase3_create_pipeline_event` with a structured payload containing candidate key, source ID, candidate, event snapshot, outcome, taxonomy ID, evidence, actors, locations, and processed time. Store the local service credential in n8n credentials, not expressions.
- [x] For an existing candidate key, accept the returned existing event ID and continue without changing the event's authoritative fields. *(Guaranteed by the function's own idempotency check — `phase3_create_pipeline_event` returns the existing event id and performs no further writes when `candidate_key` already exists; the n8n side does not need to detect this itself.)*
- [x] Keep `phase3_event_runs` append-only for attempt 1 and optional attempt 2 before calling the authoritative-event function.
- [x] Rebuild `Build Phase 3 Stage Result` from this execution's Phase 3 run rows, using the highest attempt per candidate key. Count `FINAL`, `EXCEPTION`, and processed candidates exactly as before. *(No code change was needed — `phase3_event_runs` kept the exact same `candidate_key`/`attempt_number`/`outcome_payload` columns this node already read.)*
- [x] Test a multi-candidate article. Confirmed by execution `1672`: 3 candidates, 3 `phase3_event_runs` rows, 3 `phase3_events` rows, all `FINAL`/`published`. *(Partial: no retry was needed this run — all 3 candidates were accepted on attempt 1 — and no candidate had an unresolved location, so the retry path and the unresolved-location-stays-null path specifically are still unexercised. Both were already exercised once before this plan, on the legacy tables, per the 2026-08-09 production-readiness verification in Current Status; not re-proven yet on the new tables.)*
- [x] Simulate a human edit in `phase3_events`, rerun Phase 3, and verify the title, summary, status, and `human_modified_at` remain unchanged. Confirmed by execution `1673`: title `SET` to `"TEST EDIT — should survive rerun"` with `human_modified_at 2026-08-10 15:01:47` and `human_modified_fields ["title"]` via an explicitly-confirmed SQL `UPDATE`, then Phase 3 re-run for the same `p1_uuid` unchanged. Afterward: `phase3_events` still held exactly 3 rows (no duplicate created), the edited row's title/`human_modified_at`/`updated_at` were byte-for-byte unchanged, and all 3 rows' `updated_at` stayed at their original values even though `phase3_event_runs` correctly grew by 3 fresh append-only rows (run IDs 8-10) — proving the rerun reprocessed every candidate but `phase3_create_pipeline_event` wrote nothing further to the authoritative table for an existing `candidate_key`.
- [x] Validate with 0 errors and 0 warnings and create a workflow-version checkpoint.

### Task 5: Verify the master workflow without changing its contract

**Files:**
- Modify: `Terra Space - Full News Processing` (`SwXzUU9aHg4NZ9Kx`) only if an expression still references a legacy field name.

**Interfaces:**
- Produces the existing master summary and new phase-prefixed database rows.

The master workflow (`SwXzUU9aHg4NZ9Kx`) needed **no node changes** — every field it reads from a
sub-workflow's stage result (`stage`, `status`, `p1_uuid`, `candidate_count`, `final_count`,
`exception_count`) is exactly the same internal contract name after the table migration, since Task
2/3/4 all preserved those names deliberately for this reason. It was re-validated only.

- [x] Run the master from the editor using one grounded article and confirm Phase 1, Phase 2, and Phase 3 receive the same UUID without user involvement. Confirmed by master execution `1669` (82.6s): `status: COMPLETED`, `p1_uuid 81322f2f-a959-438e-a77e-0ce5adc0f582` flowed unmodified through all three sub-workflow calls.
- [x] Reconcile master counts against `phase2_event_candidates`, `phase3_event_runs`, and `phase3_events`. Master reported "found 3 candidate(s); created 3 final record(s) and 0 exception(s)"; database held exactly 3/3/3 for that `p1_uuid`, all `FINAL`/`published`.
- [ ] **Not yet run — needs the owner.** Run an eventless article and confirm `COMPLETED_NO_CANDIDATE` plus zero Phase 3 rows.
- [ ] **Not yet run — needs the owner.** Run malformed/blank input tests and confirm no downstream query or write.
- [x] Verify all exact evidence quotes remain substrings of `phase1_sources.cleaned_content_text`. Confirmed directly in the database for all 3 candidates: every `evidence_quote` and every `field_evidence.event_title.evidence_quote` is an exact substring of the stored 2,890-character `cleaned_content_text`.
- [x] Validate all four workflows at 0 errors and 0 warnings; leave all four inactive. *(Confirmed inactive and clean immediately after every Task 2–4 change, and again just now: 9/21/30/9 nodes, 0 errors, 0 warnings on all four.)*

### Task 6: Record the n8n checkpoint

**Files:**
- Modify: `project-knowledge/Current-Status.md`.
- Modify: `project-knowledge/Project-Knowledge-Log.md`.
- Modify: this plan's status only after all checks pass.

- [ ] Record execution IDs, source UUIDs, counts, table reconciliation, human-overwrite protection evidence, and workflow validation results. *(Blocked on the owner handoff below — nothing to record until at least one live execution exists.)*
- [ ] Run Project Knowledge validation and commit only this checkpoint's files. *(A structural-only checkpoint was validated and committed separately; this final checkpoint still needs the live-run evidence above.)*

# Owner handoff — live execution tests still needed

Four of six planned live tests are done (see Tasks 2–5 above): a full grounded run
(execution `1669`), idempotency plus human-edit survival on a rerun (execution `1673`), and quote
grounding, all confirmed by direct read-only database checks. Along the way the owner's testing
found and this plan fixed three real defects, none of them present in the legacy pipeline: an
ad-`<iframe>` false positive in the Phase 1 completeness check, a `runOnceForEachItem` return-shape
bug, and a taxonomy-lookup fan-out bug that inflated the classification prompt past LM Studio's
context limit. See the 2026-08-10 entries in [Current Status](../Current-Status.md) for full detail
on each.

Two tests remain, both still needing the owner for the same reason as before — n8n only accepts an
external (webhook/form/chat) trigger on an *active* workflow, and this plan keeps all four inactive:

1. Execute `Terra Space - Full News Processing` with a deliberately eventless article (e.g. a
   recipe) and confirm `COMPLETED_NO_CANDIDATE` with zero Phase 3 rows.
2. Execute `Terra Space - Input News Manual` directly (its `Phase 1 Internal Input` or the form)
   with a blank `p1_raw_content_text` and confirm it fails before any Supabase write.

Optional, lower-priority (already proven once on the legacy tables per the 2026-08-09
production-readiness verification, not yet re-proven on the new ones): running the same article
through Phase 2 twice to confirm no duplicate latest row, and a `NO_MAIN_ISSUE` article to confirm
Phase 2 completes successfully without invoking Phase 3.

Once the two required tests above are run, Task 6 can be finished and this plan's status can move to
`completed`.

# Completion gate

Do not start the Terra Space application transition until all four inactive workflows validate cleanly, one-click success/no-candidate/failure paths pass, every candidate persists, repeated keys remain idempotent, and a human-modified Phase 3 event survives a rerun unchanged. **Structural migration is done and validated; the live-execution evidence in the owner handoff above is still outstanding, so this gate is not yet fully satisfied.**

# Navigation

- [Supabase foundation plan](2026-08-10-fresh-supabase-foundation.md)
- [Terra Space transition plan](2026-08-10-terra-space-supabase-transition.md)
- [Architecture decision](../decisions/Fresh-Phase-Prefixed-Supabase-Architecture.md)
