---
type: Implementation Plan
title: n8n Phase-Prefixed Table Transition Implementation Plan
description: Rewire the four inactive Terra Space n8n workflows to the fresh Phase 1, Phase 2, and Phase 3 Supabase contracts.
tags: [project-knowledge, plan, n8n, supabase, pipeline]
status: planned
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

- [ ] Record workflow metadata, structure, activation state, validation result, and current version ID for all four workflows.
- [ ] Export full workflow JSON to a dated ignored backup directory and verify each export can be parsed.
- [ ] Confirm all workflows are inactive before the first update operation.

### Task 2: Move Phase 1 to `phase1_sources`

**Files:**
- Modify: n8n workflow `Terra Space - Input News Manual` (`gABPryH3jTe2Ktz5`).

**Interfaces:**
- Consumes the existing six-field form/internal contract.
- Produces `{stage:'PHASE_1', status:'SUCCESS', p1_uuid:<phase1_sources.id>, p1_title, cleaned_character_count}`.

- [ ] Change `Save Manual News to Supabase` from `terra_space_news_v2` to `phase1_sources` with this explicit mapping:

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

- [ ] Change `Build Phase 1 Stage Result` to read the returned `id` and expose it as `p1_uuid` for backward-compatible sub-workflow handoff.
- [ ] Add `Save Phase 1 Processing Run` after the source save with `SUCCESS`, model/prompt values, character count, raw cleaning output, and processed time.
- [ ] Test valid input and blank raw text. Valid input creates exactly one source/run pair; blank input creates neither.
- [ ] Validate with 0 errors and 0 warnings and create a workflow-version checkpoint.

### Task 3: Move Phase 2 latest and history persistence

**Files:**
- Modify: n8n workflow `Terra Space - Event Candidates` (`pO6m1mpaHz2Ae5ZR`).

**Interfaces:**
- Consumes `{p1_uuid}` where the value is `phase1_sources.id`.
- Produces the unchanged Phase 2 stage result contract.

- [ ] Change `Get Phase 1 Article` to `phase1_sources`, filter `id = p1_uuid`, and update Code expressions to use `cleaned_content_text`, `title`, and `id`.
- [ ] Change `Create Run History` to `phase2_candidate_runs` and map `p1_news_uuid` expressions to `phase1_source_id`.
- [ ] Change latest lookup/create/update nodes to `phase2_event_candidates`, using `phase1_source_id` as the unique lookup field.
- [ ] Preserve history-before-latest ordering and preserve structured JSONB values without stringifying them.
- [ ] Test a grounded article twice: two run rows, one latest row, identical source ID, and no duplicate latest result.
- [ ] Test `NO_MAIN_ISSUE`: Phase 2 returns successful `NO_EVENT_CANDIDATE`, writes history/latest, and does not invoke Phase 3 through the master.
- [ ] Validate with 0 errors and 0 warnings and create a workflow-version checkpoint.

### Task 4: Move Phase 3 reads and append-only history

**Files:**
- Modify: n8n workflow `Terra Space - Event Records` (`qsbIodzbMPxgQeRg`).

**Interfaces:**
- Consumes `{p1_uuid}` where the value is `phase1_sources.id`.
- Produces per-candidate run history plus one idempotent authoritative event per candidate key.

- [ ] Change source, candidate, taxonomy, and gazetteer nodes:

```text
Get Phase 1 Source -> phase1_sources, id
Get Latest Event Candidates -> phase2_event_candidates, phase1_source_id
Get Active Event Types -> phase3_event_types
Resolve Primary Location Locally -> phase3_location_gazetteer
Save Event Record Run -> phase3_event_runs
Get This Run's Record Runs -> phase3_event_runs, phase1_source_id + processed_at
```

- [ ] Keep candidate keys deterministic as `<phase1 source UUID>:<evidence_start>:<evidence_end>`.
- [ ] Remove legacy latest-row create/update persistence to `terra_space_event_records` only after the replacement RPC path is connected and validated.
- [ ] Add `Create Authoritative Phase 3 Event`, calling `phase3_create_pipeline_event` with a structured payload containing candidate key, source ID, candidate, event snapshot, outcome, taxonomy ID, evidence, actors, locations, and processed time. Store the local service credential in n8n credentials, not expressions.
- [ ] For an existing candidate key, accept the returned existing event ID and continue without changing the event's authoritative fields.
- [ ] Keep `phase3_event_runs` append-only for attempt 1 and optional attempt 2 before calling the authoritative-event function.
- [ ] Rebuild `Build Phase 3 Stage Result` from this execution's Phase 3 run rows, using the highest attempt per candidate key. Count `FINAL`, `EXCEPTION`, and processed candidates exactly as before.
- [ ] Test a multi-candidate article with unresolved locations and retry outcomes. Every candidate must have a run and one authoritative row; unresolved locations remain null rather than disappearing.
- [ ] Simulate a human edit in `phase3_events`, rerun Phase 3, and verify the title, summary, status, and `human_modified_at` remain unchanged.
- [ ] Validate with 0 errors and 0 warnings and create a workflow-version checkpoint.

### Task 5: Verify the master workflow without changing its contract

**Files:**
- Modify: `Terra Space - Full News Processing` (`SwXzUU9aHg4NZ9Kx`) only if an expression still references a legacy field name.

**Interfaces:**
- Produces the existing master summary and new phase-prefixed database rows.

- [ ] Run the master from the editor using one grounded article and confirm Phase 1, Phase 2, and Phase 3 receive the same UUID without user involvement.
- [ ] Reconcile master counts against `phase2_event_candidates`, `phase3_event_runs`, and `phase3_events`.
- [ ] Run an eventless article and confirm `COMPLETED_NO_CANDIDATE` plus zero Phase 3 rows.
- [ ] Run malformed/blank input tests and confirm no downstream query or write.
- [ ] Verify all exact evidence quotes remain substrings of `phase1_sources.cleaned_content_text`.
- [ ] Validate all four workflows at 0 errors and 0 warnings; leave all four inactive.

### Task 6: Record the n8n checkpoint

**Files:**
- Modify: `project-knowledge/Current-Status.md`.
- Modify: `project-knowledge/Project-Knowledge-Log.md`.
- Modify: this plan's status only after all checks pass.

- [ ] Record execution IDs, source UUIDs, counts, table reconciliation, human-overwrite protection evidence, and workflow validation results.
- [ ] Run Project Knowledge validation and commit only this checkpoint's files.

# Completion gate

Do not start the Terra Space application transition until all four inactive workflows validate cleanly, one-click success/no-candidate/failure paths pass, every candidate persists, repeated keys remain idempotent, and a human-modified Phase 3 event survives a rerun unchanged.

# Navigation

- [Supabase foundation plan](2026-08-10-fresh-supabase-foundation.md)
- [Terra Space transition plan](2026-08-10-terra-space-supabase-transition.md)
- [Architecture decision](../decisions/Fresh-Phase-Prefixed-Supabase-Architecture.md)
