---
type: Plan
title: Phase 5A Prepare Event Records Implementation Plan
description: Test-first plan for the first internal stage of the single Phase 5 n8n workflow, creating traceable normal and limited event records from verified Phase 4 results.
tags: [project-knowledge, plan, phase-5, phase-5a, n8n, supabase]
status: completed
---

# Phase 5A Prepare Event Records Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this
> plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking. Do not use subagents unless
> the owner explicitly requests them.

**Goal:** Create the deterministic 5A foundation of the single Phase 5 workflow, preserving every
approved upstream field while routing Phase 4 results to normal or limited prepared event records.

**Architecture:** An additive Supabase contract stores one latest Phase 5 event record per Phase 4
result plus append-only attempt history and a retry-aware pending view. One inactive manual n8n
workflow processes one result at a time through a pure deterministic transformer; later 5B-5E nodes
will be added to this same workflow only after 5A is accepted as production-ready.

**Tech Stack:** Local Supabase/PostgreSQL 17, n8n Manual Trigger/Supabase/Code/IF/Loop Over Items
nodes, and Node.js built-in test runner.

**Spec:** [Phase 5 Event Generation and Qualification](../decisions/Phase-5-Conservative-Event-Drafts.md)

## Global constraints

- All 5A-5E stages must live in one n8n workflow named **Terra Space - Phase 5 - Generate and
  Qualify Events** in folder `Terra_Space`.
- Implement only 5A in this plan. Do not add placeholder 5B-5E nodes.
- Do not modify Phase 1-4 tables, rows, workflows, prompts, statuses, or verified baselines.
- 5A makes no LM Studio or cloud AI call.
- Copy title, description, evidence, facts, upstream statuses, and upstream reasons without
  rewriting or enrichment.
- Map Phase 4 `VALID` to `NORMAL`; map `INCOMPLETE` and `NEEDS_REVIEW` to `LIMITED`.
- Do not consume Phase 4 `FAILED` results.
- Preserve null dates, `unknown` precision, empty actors, and empty locations.
- Process one item at a time and retain one append-only run for every completed attempt.
- Retry only a latest technical `FAILED` 5A record. Never overwrite a latest `PREPARED` record.
- Do not classify Event Types, normalize entities, add coordinates, compare duplicates, qualify a
  final event, write to Terra Space application tables, or publish anything.
- Migration application, workflow creation/edit, pilot execution, and full execution each require
  separate explicit owner approval.

## Files and responsibilities

- Create `supabase/tests/phase5a_event_records.sql`: rollback-only database contract and upstream
  immutability checks.
- Create `supabase/migrations/202609100001_phase5a_event_records.sql`: latest table, append-only run
  table, pending view, constraints, indexes, comments, trigger, and RLS.
- Create `tools/n8n/phase5a-prepare-event-record.mjs`: pure deterministic item transformer shared
  by local tests and the n8n Code node.
- Create `tools/tests/phase5a-prepare-event-record.test.mjs`: behavior and no-inference tests.
- Create `.n8n-backups/20260910/terra-space-phase5-generate-and-qualify-events.json`: credential-free
  recovery export of the same inactive Phase 5 workflow that will later receive 5B-5E.
- Modify Project Knowledge only after observed milestones materially change.

---

### Task 1: Freeze the Phase 1-4 baseline and write the failing 5A contract test

**Files:**

- Create: `supabase/tests/phase5a_event_records.sql`
- Read: `supabase/migrations/202608270003_phase4_event_fact_extraction.sql`
- Read: `supabase/migrations/202609080001_phase4_incomplete_status.sql`

**Interfaces:**

- Consumes: the verified 109-row Phase 4 latest-result baseline.
- Produces: a rollback-only executable specification for the Phase 5A storage contract.

- [x] **Step 1: Record read-only counts and fingerprints.**

  Record counts for every Phase 1-4 latest and history table, plus stable MD5 fingerprints ordered
  by each table's primary key. Confirm Phase 4 has 109 latest results: 43 `VALID`, 56 `INCOMPLETE`,
  10 `NEEDS_REVIEW`, zero `FAILED`, and zero pending. Do not export article text.

- [x] **Step 2: Write the rollback-only SQL test skeleton.**

  Begin with `begin;`, use existing Phase 4 rows as read-only fixtures, create test Phase 5A rows
  only inside the transaction, and finish with `rollback;`. The first assertion checks that the
  pending view exposes every eligible Phase 4 result and excludes `FAILED`.

  ```sql
  begin;

  do $$
  declare
    v_eligible integer;
    v_pending integer;
  begin
    select count(*) into v_eligible
    from public.terra_space_phase4_event_facts
    where status in ('VALID', 'INCOMPLETE', 'NEEDS_REVIEW');

    select count(*) into v_pending
    from public.terra_space_phase5_pending_event_records;

    if v_pending <> v_eligible then
      raise exception 'FAIL: expected % pending 5A inputs, found %', v_eligible, v_pending;
    end if;
  end;
  $$;

  rollback;
  ```

- [x] **Step 3: Add exact contract assertions.**

  The test must assert:

  - `phase4_event_fact_id` is unique in the latest table;
  - `VALID` accepts only `NORMAL + PREPARED`;
  - `INCOMPLETE` and `NEEDS_REVIEW` accept only `LIMITED + PREPARED`;
  - `LIMITED` preserves a non-empty Phase 4 reason;
  - copied title, description, candidate evidence, `facts`, statuses, and reasons equal their
    upstream values;
  - unknown date and empty arrays remain unchanged;
  - a latest `FAILED` row remains pending while `PREPARED` does not;
  - retrying a failed latest row does not remove its earlier run history;
  - the transaction leaves Phase 1-4 counts and fingerprints unchanged.

- [x] **Step 4: Run the test and verify the expected failure.**

  ```powershell
  Get-Content -Raw .\supabase\tests\phase5a_event_records.sql |
    docker exec -i supabase_db_local-supabase psql -U postgres -d postgres -v ON_ERROR_STOP=1
  ```

  Expected: failure because `terra_space_phase5_pending_event_records` does not exist.

- [x] **Step 5: Stop before creating the migration.**

  Report the recorded baseline and failing-test result. Obtain explicit owner approval for Task 2;
  approval of this plan alone does not authorize applying or creating the live database contract.

---

### Task 2: Add the Phase 5A Supabase contract

**Files:**

- Create: `supabase/migrations/202609100001_phase5a_event_records.sql`
- Test: `supabase/tests/phase5a_event_records.sql`

**Interfaces:**

- Consumes: Phase 1 source metadata, Phase 3 candidate JSON, and Phase 4 latest Event Facts.
- Produces: `terra_space_phase5_event_records`,
  `terra_space_phase5_event_record_processing_runs`, and
  `terra_space_phase5_pending_event_records`.

- [x] **Step 1: Verify that the migration name is unused.**

  Check the migration folder and local migration history read-only. If `202609100001` exists, stop
  and choose the next unused timestamp without renaming an applied migration.

- [x] **Step 2: Create the latest table.**

  Use this exact core shape, followed by comments for every table and column:

  ```sql
  create table public.terra_space_phase5_event_records (
    id uuid primary key default gen_random_uuid(),
    phase4_event_fact_id uuid not null unique
      references public.terra_space_phase4_event_facts(id) on delete restrict,
    phase3_event_candidate_result_id uuid not null
      references public.terra_space_phase3_event_candidates(id) on delete restrict,
    phase1_source_id uuid not null
      references public.terra_space_phase1_sources(id) on delete restrict,
    candidate_id text not null check (nullif(btrim(candidate_id), '') is not null),
    source_publication_date text,
    phase3_result_status text not null check (phase3_result_status in ('VALID', 'NEEDS_REVIEW')),
    phase3_result_reason text,
    phase3_candidate_status text not null check (phase3_candidate_status in ('VALID', 'NEEDS_REVIEW')),
    phase3_candidate_reason text,
    candidate_title text not null check (nullif(btrim(candidate_title), '') is not null),
    candidate_description text not null check (nullif(btrim(candidate_description), '') is not null),
    candidate_evidence_quote text not null check (nullif(btrim(candidate_evidence_quote), '') is not null),
    phase4_status text not null check (phase4_status in ('VALID', 'INCOMPLETE', 'NEEDS_REVIEW')),
    phase4_extraction_status text not null check (phase4_extraction_status in ('FACTS_FOUND', 'NO_ADDITIONAL_FACTS', 'FAILED')),
    phase4_safeguard_status text not null check (phase4_safeguard_status in ('ACCEPT', 'REJECT', 'FAILED', 'NOT_RUN')),
    phase4_review_reason text,
    phase4_error_message text,
    facts jsonb not null,
    event_path text not null check (event_path in ('NORMAL', 'LIMITED')),
    phase5a_status text not null check (phase5a_status in ('PREPARED', 'FAILED')),
    error_message text,
    processed_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint terra_space_phase5_event_records_route_check check (
      (phase5a_status = 'FAILED')
      or (phase4_status = 'VALID' and event_path = 'NORMAL')
      or (phase4_status in ('INCOMPLETE', 'NEEDS_REVIEW') and event_path = 'LIMITED')
    ),
    constraint terra_space_phase5_event_records_reason_check check (
      phase4_status = 'VALID' or nullif(btrim(phase4_review_reason), '') is not null
    )
  );
  ```

- [x] **Step 3: Create the append-only processing-run table.**

  Store the same complete snapshot, plus `run_id bigint generated always as identity primary key`
  and unique `submission_key uuid`. Use `ON DELETE SET NULL` on upstream foreign keys so audit
  history survives a separately approved future upstream removal. Do not add an update trigger.

- [x] **Step 4: Create the retry-aware pending view.**

  Join Phase 4 to Phase 3, expand the matching candidate JSON, and join Phase 1 for publication
  date. Include only eligible Phase 4 statuses with no latest 5A row or latest `FAILED`:

  ```sql
  where phase4.status in ('VALID', 'INCOMPLETE', 'NEEDS_REVIEW')
    and (latest.id is null or latest.phase5a_status = 'FAILED')
  ```

  Return every field needed by the 5A transformer, including separate Phase 3 result-level and
  candidate-level statuses and reasons.

- [x] **Step 5: Add indexes, updated-at trigger, RLS, and plain-language comments.**

  Index `processed_at desc` and upstream identity fields. Reuse the established updated-at trigger
  function. Enable RLS on both tables. Do not add policies that broaden anonymous access.

- [x] **Step 6: Request explicit approval before applying the migration.**

  State that the additive migration creates two empty tables, one view, constraints, indexes,
  comments, a trigger, and RLS. It updates or deletes no Phase 1-4 row. Apply only after the owner
  explicitly approves this exact database change.

- [x] **Step 7: Run the contract and baseline checks.**

  Expected: the rollback-only test passes, the pending view contains 109 rows before a pilot, and
  all Phase 1-4 counts and fingerprints exactly match Task 1.

---

### Task 3: Implement and test the deterministic 5A transformer

**Files:**

- Create: `tools/n8n/phase5a-prepare-event-record.mjs`
- Create: `tools/tests/phase5a-prepare-event-record.test.mjs`

**Interfaces:**

- Consumes: one row from `terra_space_phase5_pending_event_records`.
- Produces: one complete latest/history payload with `submission_key` and no enriched fields.

- [x] **Step 1: Write failing route tests.**

  ```javascript
  import test from 'node:test';
  import assert from 'node:assert/strict';
  import {preparePhase5ARecord} from '../n8n/phase5a-prepare-event-record.mjs';

  test('routes VALID to NORMAL', () => {
    const result = preparePhase5ARecord(fixture({phase4_status: 'VALID'}));
    assert.equal(result.event_path, 'NORMAL');
    assert.equal(result.phase5a_status, 'PREPARED');
  });

  test('routes incomplete and review results to LIMITED', () => {
    for (const status of ['INCOMPLETE', 'NEEDS_REVIEW']) {
      const result = preparePhase5ARecord(fixture({phase4_status: status}));
      assert.equal(result.event_path, 'LIMITED');
    }
  });
  ```

- [x] **Step 2: Run the tests and verify they fail.**

  ```powershell
  node --test .\tools\tests\phase5a-prepare-event-record.test.mjs
  ```

  Expected: module-not-found failure for `phase5a-prepare-event-record.mjs`.

- [x] **Step 3: Implement the minimal transformer.**

  ```javascript
  import {randomUUID} from 'node:crypto';

  export function preparePhase5ARecord(input) {
    if (!['VALID', 'INCOMPLETE', 'NEEDS_REVIEW'].includes(input.phase4_status)) {
      throw new Error(`Phase 4 status is not eligible for Phase 5A: ${input.phase4_status}`);
    }
    const limited = input.phase4_status !== 'VALID';
    if (limited && !String(input.phase4_review_reason ?? '').trim()) {
      throw new Error('A limited record must preserve its Phase 4 reason.');
    }
    return {
      phase4_event_fact_id: input.phase4_event_fact_id,
      phase3_event_candidate_result_id: input.phase3_event_candidate_result_id,
      phase1_source_id: input.phase1_source_id,
      candidate_id: input.candidate_id,
      source_publication_date: input.source_publication_date ?? null,
      phase3_result_status: input.phase3_result_status,
      phase3_result_reason: input.phase3_result_reason ?? null,
      phase3_candidate_status: input.phase3_candidate_status,
      phase3_candidate_reason: input.phase3_candidate_reason ?? null,
      candidate_title: input.candidate_title,
      candidate_description: input.candidate_description,
      candidate_evidence_quote: input.candidate_evidence_quote,
      phase4_status: input.phase4_status,
      phase4_extraction_status: input.phase4_extraction_status,
      phase4_safeguard_status: input.phase4_safeguard_status,
      phase4_review_reason: input.phase4_review_reason ?? null,
      phase4_error_message: input.phase4_error_message ?? null,
      facts: structuredClone(input.facts),
      event_path: limited ? 'LIMITED' : 'NORMAL',
      phase5a_status: 'PREPARED',
      error_message: null,
      submission_key: randomUUID()
    };
  }
  ```

- [x] **Step 4: Add preservation and rejection tests.**

  Assert deep equality for `facts`, exact equality for title/description/evidence/reasons, preserved
  null dates and empty arrays, rejected `FAILED` and unknown statuses, rejected limited rows without
  reasons, and a new UUID per attempt. Assert the output has no Event Type, canonical entity,
  coordinate, duplicate, final-status, or publication field.

- [x] **Step 5: Run focused and existing JavaScript tests.**

  ```powershell
  node --test .\tools\tests\phase5a-prepare-event-record.test.mjs
  node --test .\tools\tests\*.test.mjs
  ```

  Expected: all tests pass with no Phase 1-4 fixture changes.

---

### Task 4: Create the inactive single Phase 5 workflow with 5A only

**Files:**

- Create in n8n: **Terra Space - Phase 5 - Generate and Qualify Events**
- Create: `.n8n-backups/20260910/terra-space-phase5-generate-and-qualify-events.json`

**Interfaces:**

- Consumes: pending Phase 5A rows and the tested transformer.
- Produces: one latest prepared record and one append-only processing run per item.

- [x] **Step 1: Request explicit approval to create the inactive workflow.**

  Explain that this creates one inactive workflow in `Terra_Space`, containing 5A only. It does not
  execute the workflow or add separate workflows for later sub-phases.

- [x] **Step 2: Create the 5A workflow skeleton.**

  Add these nodes in order:

  ```text
  Manual Trigger
  → Get Pending Phase 5A Records
  → Process One Record at a Time
  → Prepare Phase 5A Record
  → Is Failed Retry?
  → Create Latest Record / Update Failed Latest Record
  → Append Processing Run
  → return to Process One Record at a Time
  ```

  Use the existing local Supabase credential. Sort pending input by source sequence and candidate
  ID. Batch size is one. Keep the workflow inactive.

- [x] **Step 3: Install the tested transformer in the Code node.**

  Adapt only the module wrapper required by n8n. The core eligibility, routing, preservation, and
  reason checks must remain byte-equivalent to the tested source logic.

- [x] **Step 4: Configure idempotent persistence.**

  Create a latest row only when `existing_phase5_record_id` is null. Update only the exact existing
  ID when its carried status is `FAILED`. Always append a new processing run after a successful
  latest write. Never delete and reinsert.

- [x] **Step 5: Validate without execution.**

  Confirm the workflow is inactive, is in `Terra_Space`, processes one item at a time, has no model
  call, has no Phase 1-4 write node, and contains no 5B-5E, application, final-event, merge, or
  publication node.

- [x] **Step 6: Export a credential-free recovery copy.**

  Export to the specified backup path, inspect it for secrets, and confirm it represents the same
  workflow that will later receive 5B-5E.

---

### Task 5: Select and run the controlled 5A pilot

**Files:**

- Modify only after observed results: `project-knowledge/Current-Status.md`
- Modify only after observed results: `project-knowledge/Project-Knowledge-Log.md`
- Modify only after acceptance: this plan's status and implementation record

**Interfaces:**

- Consumes: the validated inactive workflow and separate owner approval for six exact inputs.
- Produces: six manually reviewed Phase 5A records and a go/no-go decision for full processing.

- [x] **Step 1: Select six candidates read-only.**

  Choose two Phase 4 `VALID`, two `INCOMPLETE`, and two `NEEDS_REVIEW` results. Include one unknown
  date, one empty-actor result, one empty-location result, and one result carrying both Phase 3
  result-level and candidate-level review context. Show source sequence and candidate ID.

- [x] **Step 2: Restrict the input to the six exact identities.**

  Add a temporary filter to the existing Supabase read node without changing eligibility rules.
  Revalidate the inactive workflow and show the selected identities to the owner.

- [x] **Step 3: Request explicit pilot approval.**

  State that execution will create at most six latest Phase 5 records and six processing-run rows.
  It will not modify Phase 1-4 or publish anything. Do not run without explicit approval.

- [x] **Step 4: Execute once and inspect all six results.**

  Compare every copied field to its Phase 1/3/4 source, confirm 2 normal and 4 limited routes,
  verify reasons and null/empty values, verify six unique latest identities and six history rows,
  and recalculate Phase 1-4 fingerprints.

- [x] **Step 5: Stop for production-readiness review.**

  Report every pilot result and any discrepancy. Do not repair data, remove the pilot restriction,
  process remaining inputs, or begin 5B until the owner explicitly approves the next action.

---

### Task 6: Complete 5A only after separate full-run approval

**Files:**

- Modify: `project-knowledge/Current-Status.md`
- Modify: `project-knowledge/Project-Knowledge-Log.md`
- Modify: `project-knowledge/Roadmap.md` only when the 5A milestone is accepted
- Modify: `project-knowledge/plans/2026-09-10-phase-5a-prepare-event-records.md`

**Interfaces:**

- Consumes: an accepted pilot and separate owner approval for remaining eligible Phase 4 results.
- Produces: a verified complete 5A baseline and a mandatory stop before 5B design.

- [x] **Step 1: Restore the normal pending view input and revalidate.**

  Remove only the temporary six-ID filter. Confirm the workflow remains inactive and all safety
  boundaries from Task 4 still pass.

- [x] **Step 2: Request explicit approval for the remaining records.**

  Report the exact pending count. State that the run creates one latest record and one history row
  per pending input, modifies no Phase 1-4 data, and performs no classification or publication.

- [x] **Step 3: Execute once and verify the complete 5A baseline.**

  Expect 109 latest records total: 43 `NORMAL + PREPARED` and 66 `LIMITED + PREPARED`, unless an
  observed technical failure remains retryable. Verify no duplicate Phase 4 identity, every copied
  field equals upstream, all non-valid reasons are retained, and Phase 1-4 fingerprints match.

- [x] **Step 4: Run all focused tests and Project Knowledge validation.**

  ```powershell
  node --test .\tools\tests\*.test.mjs
  Get-Content -Raw .\supabase\tests\phase5a_event_records.sql |
    docker exec -i supabase_db_local-supabase psql -U postgres -d postgres -v ON_ERROR_STOP=1
  powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1
  ```

  Expected: all tests pass; Project Knowledge reports zero errors and warnings.

- [x] **Step 5: Record only observed results and stop.**

  Update the listed Project Knowledge files with actual counts and verification evidence. Keep the
  workflow inactive. Do not design or implement 5B until the owner accepts 5A as production-ready
  and begins the separate Event Taxonomy discussion.

## Plan self-review

- **Spec coverage:** The plan covers deterministic 5A routing, exact upstream preservation, retry,
  append-only history, one-item isolation, one shared Phase 5 workflow, pilot review, Phase 1-4
  immutability, and the mandatory stop before 5B.
- **Scope control:** Event Types, coordinates, actor references, timeline derivation, duplicate
  recommendation, final qualification, Terra Space visibility, and publication are excluded from
  5A implementation and retained for their approved checkpoints.
- **Safety:** Migration application, workflow creation, pilot, and full run each have distinct
  owner approval gates. The rollback-only database test makes no durable data change.
- **Type consistency:** `NORMAL`, `LIMITED`, `PREPARED`, and `FAILED` have the same spelling and
  meaning in the spec, SQL contract, transformer, workflow, pilot, and completion checks.
- **No placeholders:** Every 5A output field, status mapping, file, command, and approval boundary
  is explicit. Later sub-phases are referenced only as excluded scope, not partially designed here.

# Navigation

- [Decision](../decisions/Phase-5-Conservative-Event-Drafts.md)
- [Phase 4 Event Fact Extraction](../decisions/Phase-4-Event-Fact-Extraction.md)
- [Project Knowledge](../Project-knowledge-Index.md)
