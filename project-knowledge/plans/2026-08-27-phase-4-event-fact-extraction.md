---
type: Plan
title: Phase 4 Event Fact Extraction Implementation Plan
description: Test-first plan for an inactive Phase 4 workflow that extracts evidence-grounded dates, epistemic status, actors, and locations from retained Phase 3 candidates.
tags: [project-knowledge, plan, n8n, supabase, phase-4]
status: completed
---

# Phase 4 Event Fact Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this
> plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking. Do not use subagents unless
> the owner explicitly requests them.

**Goal:** Enrich every retained Phase 3 Event Candidate with evidence-grounded date, epistemic
status, actors, and locations without creating final events or changing the Phase 1-3 baselines.

**Architecture:** An additive Supabase contract exposes one pending row per Phase 3 candidate and
stores one latest Phase 4 result plus append-only attempt history. An inactive manual n8n workflow
processes one candidate at a time, makes one local LM Studio extraction call and one independent
safeguard call, validates evidence deterministically, and writes through Supabase nodes.

**Tech Stack:** Local Supabase/PostgreSQL 17, n8n, local LM Studio OpenAI-compatible API, and n8n
Manual Trigger, Supabase, Code, IF, HTTP Request, and Loop Over Items nodes.

**Spec:** [Phase 4 Event Fact Extraction](../decisions/Phase-4-Event-Fact-Extraction.md)

## Recommended execution model

- Model: `gpt-5.6-terra`
- Reasoning effort: `medium`
- Escalate only a genuinely difficult SQL constraint, n8n item-linking defect, or unexplained retry
  failure to `gpt-5.6-sol` with `high` effort.

## Global constraints

- Do not modify any Phase 1, Phase 2, or Phase 3 row, table contract, workflow, prompt, or baseline.
- Create the inactive workflow **Terra Space - Phase 4 - Extract Event Facts** in n8n folder
  `Terra_Space`. The owner alone starts it manually.
- Process Phase 3 candidates with either `VALID` or `NEEDS_REVIEW` status. Carry Phase 3 status into
  Phase 4 as immutable input context; never use it as a stop condition.
- Process one candidate at a time. Save its result before advancing to the next candidate.
- Use Supabase nodes for normal database reads, creates, and failed-latest updates. Do not use a
  PostgreSQL node for normal workflow persistence.
- Use Code nodes only to expand candidate JSON, prepare requests, parse responses, validate allowed
  values and evidence, and prepare Supabase values.
- Make no cloud AI call. LM Studio remains the only model endpoint.
- Do not add Event Type classification, actor/location normalization, coordinates, duplicate
  detection, final events, Dashboard writes, or UI changes.
- A missing optional fact is valid. Never guess a date, actor, role, location, or location level.
- Retain every usable result. `NEEDS_REVIEW` must keep the complete payload and a specific reason.
- Use `FAILED` only when a technical problem prevents a usable result from being prepared.
- Retry only candidates with no latest result or a latest `FAILED` result. Never automatically
  overwrite a latest `VALID` or `NEEDS_REVIEW` result.
- Apply no migration and run no live candidate until the owner gives separate explicit approval.
- Before any live pilot, record read-only Phase 1-3 row counts and content fingerprints. Confirm
  them again afterwards.

## Exact Phase 4 result contract

Each latest result and processing run stores this factual payload as JSONB:

```json
{
  "event_date": "2026-08-27",
  "event_date_precision": "exact",
  "event_date_evidence_quote": "The agreement was signed on August 27, 2026.",
  "epistemic_status": "confirmed",
  "epistemic_status_evidence_quote": "The two governments signed the agreement.",
  "actors": [
    {
      "name": "Indonesia",
      "role": "participant",
      "evidence_quote": "Indonesia and Australia signed the agreement."
    }
  ],
  "locations": [
    {
      "name": "Jakarta",
      "level": "city_regency",
      "evidence_quote": "The agreement was signed in Jakarta."
    }
  ]
}
```

Allowed values:

- `event_date_precision`: `exact`, `month`, `year`, `unknown`
- `epistemic_status`: `confirmed`, `reported`, `alleged`, `planned`, `denied`, `unknown`
- actor `role`: `source`, `recipient`, `participant`
- location `level`: `country`, `admin1`, `city_regency`, `unknown`
- result `status`: `VALID`, `NEEDS_REVIEW`, `FAILED`
- extraction `status`: `FACTS_FOUND`, `NO_ADDITIONAL_FACTS`, `FAILED`
- safeguard `status`: `ACCEPT`, `REJECT`, `FAILED`, `NOT_RUN`

Null/empty rules:

- An unknown date uses `event_date: null`, `event_date_precision: "unknown"`, and
  `event_date_evidence_quote: null`.
- Actors and locations may be empty arrays.
- `epistemic_status` is always present; use `unknown` when the article does not establish it.
- A valid `NO_ADDITIONAL_FACTS` result may contain a null date, `unknown` epistemic status, and
  empty actor/location arrays. It is not a technical failure.
- Every non-null date and every retained actor/location must have a non-empty evidence quote found
  in the Phase 1 cleaned article after the same conservative normalization used by Phase 3.

---

### Task 1: Freeze the baseline and write the failing database contract test

**Files:**

- Create: `supabase/tests/phase4_event_fact_extraction.sql`
- Read: `supabase/migrations/202608270001_phase3_event_candidate_detection.sql`
- Read: `supabase/migrations/202608270002_phase3_failed_result_retry_queue.sql`

**Interfaces:**

- Consumes: existing Phase 1-3 tables and the Phase 3 candidate JSON contract.
- Produces: an executable rollback-only test defining the required Phase 4 objects and constraints.

- [ ] **Step 1: Record a read-only baseline.**

  Run `SELECT` queries only. Record counts for Phase 1 sources, Phase 2 latest results, Phase 3
  latest results, Phase 3 processing runs, and candidate statuses. Record a deterministic
  fingerprint for each latest table with `md5(string_agg(row_to_json(t)::text, '' order by id))`
  or the table's stable primary key equivalent. Save only the counts and fingerprints in the
  implementation session notes; do not export article text.

- [ ] **Step 2: Write the rollback-only contract test.**

  The test begins with `begin;`, creates temporary Phase 1-3 fixture rows, and ends with
  `rollback;`. It must assert:

  - each Phase 3 candidate becomes one pending Phase 4 row;
  - both Phase 3 `VALID` and `NEEDS_REVIEW` candidates are included;
  - `(phase3_event_candidate_result_id, candidate_id)` is unique in the latest table;
  - a `VALID` or `NEEDS_REVIEW` row requires a complete JSON object;
  - a `NEEDS_REVIEW` row requires a non-empty `review_reason`;
  - a `FAILED` row remains pending for retry while `VALID` and `NEEDS_REVIEW` do not;
  - updating a failed latest row never removes its earlier processing-run row.

  Use this representative valid insert:

  ```sql
  insert into public.terra_space_phase4_event_facts (
    phase3_event_candidate_result_id, phase1_source_id, candidate_id,
    phase3_candidate_status, status, extraction_status, safeguard_status,
    facts, review_reason
  ) values (
    :phase3_result_id, :phase1_source_id, 'c1',
    'VALID', 'VALID', 'FACTS_FOUND', 'ACCEPT',
    jsonb_build_object(
      'event_date', null,
      'event_date_precision', 'unknown',
      'event_date_evidence_quote', null,
      'epistemic_status', 'confirmed',
      'epistemic_status_evidence_quote', 'Officials confirmed the agreement.',
      'actors', jsonb_build_array(),
      'locations', jsonb_build_array()
    ),
    null
  );
  ```

- [ ] **Step 3: Run the test before creating the migration.**

  ```powershell
  Get-Content -Raw .\supabase\tests\phase4_event_fact_extraction.sql |
    docker exec -i supabase_db_local-supabase psql -U postgres -d postgres -v ON_ERROR_STOP=1
  ```

  Expected: failure because `terra_space_phase4_event_facts` does not exist.

- [ ] **Step 4: Commit only the failing contract test.**

  ```powershell
  git add supabase/tests/phase4_event_fact_extraction.sql
  git commit -m "test: define phase 4 event fact contract"
  ```

---

### Task 2: Add the additive Phase 4 Supabase contract

**Files:**

- Create: `supabase/migrations/202608270003_phase4_event_fact_extraction.sql`
- Test: `supabase/tests/phase4_event_fact_extraction.sql`

**Interfaces:**

- Consumes: `terra_space_phase1_sources`, `terra_space_phase2_main_issues`, and
  `terra_space_phase3_event_candidates.candidates`.
- Produces: `terra_space_phase4_event_facts`,
  `terra_space_phase4_event_fact_processing_runs`, and
  `terra_space_phase4_pending_event_candidates`.

- [ ] **Step 1: Confirm the migration version is unused.**

  Check `supabase/migrations/` and local migration history read-only. If `202608270003` already
  exists, stop and choose the next unused timestamp without renaming an applied migration.

- [ ] **Step 2: Implement a narrow JSON validation function.**

  Add `terra_space_phase4_facts_match_status(facts jsonb, result_status text)` as an immutable SQL
  function. It checks the top-level keys and allowed vocabularies, requires actor/location arrays,
  requires complete actor/location objects, and permits null optional facts. It does not attempt
  quote matching; quote matching stays in n8n because it needs the cleaned article text.

- [ ] **Step 3: Create the latest-result table.**

  Include UUID `id`, Phase 3 result ID, Phase 1 source ID, text `candidate_id`, carried Phase 3
  candidate status, Phase 4 result/extraction/safeguard statuses, JSONB `facts`, model and prompt
  versions, raw extraction and safeguard outputs, review/error fields, and timestamps. Add a unique
  constraint on `(phase3_event_candidate_result_id, candidate_id)`, foreign keys with no cascade
  back into Phase 1-3 processing, validation checks, indexes, RLS, an updated-at trigger, and a
  plain-language comment for every table and column.

- [ ] **Step 4: Create the append-only processing-run table.**

  Store the same full payload plus identity `run_id` and unique UUID `submission_key`. Foreign keys
  use `ON DELETE SET NULL` so history remains understandable if an upstream record is removed by a
  separately approved future operation. Do not add an update trigger to the history table.

- [ ] **Step 5: Create the pending-candidate view.**

  Expand `terra_space_phase3_event_candidates.candidates` with `jsonb_array_elements`. Return the
  Phase 1 cleaned article, publication date, Phase 2 Main Issue context, Phase 3 result/status,
  candidate ID/title/description/evidence/status, and existing failed Phase 4 result ID. Include
  candidates with no latest Phase 4 row or latest status `FAILED`; exclude latest `VALID` and
  `NEEDS_REVIEW` rows.

- [ ] **Step 6: Apply only after explicit owner approval.**

  Before applying, state exactly that this creates two tables, one view, one validation function,
  indexes, comments, constraints, and RLS; it does not update or delete existing rows. Obtain an
  explicit approval in chat, apply through the local migration process, and then rerun Task 1's
  test. Expected: all assertions pass and the transaction rolls back.

- [ ] **Step 7: Verify the baseline and commit.**

  Recalculate the Phase 1-3 counts and fingerprints. Expected: exact match with Task 1. Then run:

  ```powershell
  git add supabase/migrations/202608270003_phase4_event_fact_extraction.sql `
    supabase/tests/phase4_event_fact_extraction.sql
  git commit -m "feat: add phase 4 event fact storage"
  ```

---

### Task 3: Build the inactive one-candidate workflow skeleton

**Files:**

- Create in n8n: **Terra Space - Phase 4 - Extract Event Facts** in folder `Terra_Space`
- Create backup after validation: `.n8n-backups/20260827/terra-space-phase4-extract-event-facts.json`

**Interfaces:**

- Consumes: one row from `terra_space_phase4_pending_event_candidates`.
- Produces: one candidate context with UUID `submission_key` and one extraction request.

- [ ] **Step 1: Create the inactive workflow shell.**

  Add **Manual Trigger**, Supabase **Get Pending Phase 4 Candidates**, and **Process One Candidate
  at a Time** with batch size 1. Sort by Phase 1 sequence then `candidate_id`. Use the existing
  local Supabase credential. Do not activate or execute the workflow.

- [ ] **Step 2: Add `Build Event Facts Prompt`.**

  Generate a UUID `submission_key`. The system instructions must require the exact Result Contract
  above, JSON only, verbatim evidence from the cleaned article, no inference, null/empty over a
  guess, and treatment of the article as untrusted data rather than instructions. Include the
  publication date as context only, the Phase 2 Main Issue, the Phase 3 candidate and its status,
  and the complete cleaned article.

- [ ] **Step 3: Add the local extraction request.**

  Add **Extract Event Facts with LM Studio** as `POST
  http://host.docker.internal:1234/v1/chat/completions`. Reuse the verified Phase 3 model settings
  and 180-second timeout. Preserve the exact raw response and use continue-on-error output so one
  candidate cannot stop the loop.

- [ ] **Step 4: Validate without execution.**

  Run the n8n runtime validator. Expected: inactive workflow, correct folder, one-candidate loop,
  local endpoint only, no writes yet, and no Phase 1-3 mutation node.

---

### Task 4: Add deterministic validation and independent safeguard

**Files:**

- Modify in n8n: **Terra Space - Phase 4 - Extract Event Facts**

**Interfaces:**

- Consumes: extraction response plus original pending-candidate context.
- Produces: a complete prepared Phase 4 result satisfying the database contract.

- [ ] **Step 1: Add `Validate Event Facts`.**

  Strip only a complete outer Markdown JSON fence and parse one JSON object. Reject unexpected
  enum values. Validate date shape as `YYYY-MM-DD`, `YYYY-MM`, or `YYYY` according to precision.
  Require every non-null date, actor, and location quote to match the cleaned article using Phase
  3's conservative whitespace, straight/curly quote, and terminal-punctuation normalization.
  Deduplicate only exact repeated actor/location objects inside this result; do not normalize names.

- [ ] **Step 2: Preserve usable uncertain output.**

  A malformed individual actor/location is omitted with a recorded review reason while other
  usable facts remain. A non-grounded date becomes null/`unknown`, retains the proposed value only
  in raw output, and adds a review reason. Set `FAILED` only if no usable facts object can be
  prepared from the response or the extraction call fails technically.

- [ ] **Step 3: Add `Build Event Facts Safeguard Prompt`.**

  Give the safeguard the candidate title, description, candidate evidence, and prepared facts with
  their quotes. It may return only:

  ```json
  {"decision":"ACCEPT","reason":null}
  ```

  or:

  ```json
  {"decision":"REJECT","reason":"The actor role is not supported by its evidence quote."}
  ```

  Tell it not to correct, enrich, normalize, or use outside knowledge.

- [ ] **Step 4: Add the safeguard request and `Prepare Phase 4 Result`.**

  Call the same local endpoint and timeout. A deterministic validation issue or safeguard rejection
  produces `NEEDS_REVIEW` with the complete usable payload and combined concrete reasons. An
  accepted clean result becomes `VALID`. A safeguard technical failure retains the prepared facts
  as `NEEDS_REVIEW`; it does not turn usable extraction into blank `FAILED` output.

- [ ] **Step 5: Run isolated non-writing behavior cases.**

  Test at least: complete accepted facts; no optional facts; relative date that cannot safely be
  resolved; invalid date shape; non-verbatim actor quote; one malformed location among valid
  fields; safeguard rejection; extraction non-JSON; safeguard timeout; and Phase 3
  `NEEDS_REVIEW` input. Confirm complete retention and exact status/reason behavior for each case.

---

### Task 5: Persist latest results, history, and failed retries

**Files:**

- Modify in n8n: **Terra Space - Phase 4 - Extract Event Facts**
- Update backup: `.n8n-backups/20260827/terra-space-phase4-extract-event-facts.json`

**Interfaces:**

- Consumes: one prepared Phase 4 result and optional existing failed-result ID.
- Produces: exactly one latest result per candidate and one new immutable run per attempt.

- [ ] **Step 1: Add separate first-attempt and retry routes.**

  When `existing_phase4_result_id` is null, use Supabase Create for the latest table. When it is
  present, use Supabase Update by that exact ID and only if its carried latest status is `FAILED`.
  Do not implement delete-and-reinsert behavior.

- [ ] **Step 2: Add append-only run persistence.**

  After either latest route, always use Supabase Create for the processing-run table. Map upstream
  IDs, candidate identity/status, complete facts, result statuses, model/prompt versions, raw
  outputs, review/error reasons, `submission_key`, and processing time.

- [ ] **Step 3: Close the candidate loop safely.**

  Both successful writes and retained technical failure rows return to **Process One Candidate at
  a Time**. A persistence error must be surfaced clearly and must not trigger an update to a
  different candidate.

- [ ] **Step 4: Validate the complete inactive workflow.**

  Expected: zero runtime validation errors or warnings; Supabase nodes own normal reads/writes;
  exactly one candidate per iteration; no Phase 1-3 write, final-event write, taxonomy, coordinate,
  duplicate, or Dashboard node; workflow remains inactive in `Terra_Space`.

- [ ] **Step 5: Export a recovery copy and commit it.**

  Export the validated inactive workflow without credentials to the exact backup path. Inspect the
  export for secrets before committing.

  ```powershell
  git add .n8n-backups/20260827/terra-space-phase4-extract-event-facts.json
  git commit -m "feat: add inactive phase 4 event facts workflow"
  ```

---

### Task 6: Run a controlled pilot, then decide whether to process all candidates

**Files:**

- Modify: `project-knowledge/Current-Status.md`
- Modify: `project-knowledge/Project-Knowledge-Log.md`
- Modify: `project-knowledge/Roadmap.md` only after the phase milestone genuinely changes
- Modify: this plan's status and implementation record

**Interfaces:**

- Consumes: owner approval, verified inactive workflow, and pending Phase 4 candidates.
- Produces: measured pilot results and a separate owner decision about the remaining candidates.

- [ ] **Step 1: Select a five-candidate pilot read-only.**

  Choose three Phase 3 `VALID` and two Phase 3 `NEEDS_REVIEW` candidates. Include at least one
  candidate with an explicit date, one with actors, one with a location, and one with missing facts.
  Record candidate IDs only. Do not edit their upstream data.

- [ ] **Step 2: Add a temporary pilot limit without changing eligibility rules.**

  Configure the Supabase read node to return only the five recorded candidate identities. Keep the
  workflow inactive. Validate again and show the exact five IDs to the owner.

- [ ] **Step 3: Request explicit pilot approval.**

  State that the run will create or update at most five Phase 4 latest rows and append five run
  records. It will not modify Phase 1-3. Do not execute until the owner explicitly approves.

- [ ] **Step 4: Evaluate the pilot read-only.**

  Verify row counts, uniqueness, evidence presence, enum/date validity, complete
  `NEEDS_REVIEW` payloads and reasons, retry eligibility for any `FAILED`, and exact Phase 1-3
  baseline counts/fingerprints. Manually compare all five outputs with their cleaned articles.

- [ ] **Step 5: Stop for the owner's decision.**

  Report the five results plainly. Do not remove the pilot limit or process the remaining
  candidates until the owner separately approves the quality and the full run.

- [ ] **Step 6: After full-run approval, restore the normal pending view read and execute once.**

  Revalidate before execution. Afterward, confirm one latest result per eligible candidate, no
  duplicate stable identity, every `VALID` evidence quote grounded, every `NEEDS_REVIEW` result
  complete with a reason, and only technical `FAILED` candidates left pending.

- [ ] **Step 7: Update Project Knowledge and validate it.**

  Record only observed counts, quality findings, retry history, and the next approved boundary.

  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1
  ```

  Expected: zero errors and zero warnings.

## Plan self-review

- **Spec coverage:** Tasks cover additive storage, one-candidate processing, both Phase 3 input
  statuses, exact fact vocabularies, deterministic evidence grounding, independent safeguard,
  full `NEEDS_REVIEW` retention, technical retry, Supabase-node-led persistence, inactive/manual
  operation, pilot gating, and Phase 1-3 immutability checks.
- **Scope control:** Taxonomy, normalization, coordinates, duplicates, final events, Dashboard, UI,
  and baseline changes are explicitly excluded from every implementation task.
- **Safety:** Migration application, five-candidate pilot, and remaining-candidate run each have a
  separate owner approval gate. No destructive database operation is part of this plan.
- **Type consistency:** Field names and allowed values match the approved design and remain the same
  in migration, workflow, validation, persistence, and verification tasks.
- **No placeholders:** The plan contains no unknown field, undecided status, or unspecified live
  action. A migration timestamp collision has an explicit stop-and-select rule.

## Implementation record

### 2026-08-28 - Full Phase 4 completion verified

- After the owner-approved pilot, normal run, and bounded technical retries, Phase 4 has one latest
  result for each of the 109 retained Phase 3 Event Candidates: 17 `VALID` and 92 `NEEDS_REVIEW`.
  There are no `FAILED` rows and the normal pending view is empty. Append-only history contains 136
  processing runs.
- All 536 retained actor/location evidence quotes are found in their linked cleaned article and none
  is truncated. Every `NEEDS_REVIEW` result has a concrete reason. The narrow near-JSON parser
  repair accepted only missing quotes around allowed epistemic-status vocabulary; it does not accept
  arbitrary malformed JSON.
- Phase 1-3 stable fingerprints exactly match their pre-Phase-4 baseline values. The workflow
  remains inactive in `Terra_Space`. Phase 4 excludes taxonomy, normalization, duplicate detection,
  final events, Dashboard writes, and all Phase 1-3 changes.

### 2026-08-27 - Storage and inactive workflow prepared

- Applied additive migrations `202608270003_phase4_event_fact_extraction` and the narrowly scoped
  correction `202608270004_phase4_unknown_date_validation_fix`. They create the two Phase 4 tables,
  one pending-candidate view, indexes, comments, RLS, and factual-payload validation function.
  The correction fixes handling of JSON `null` for an unknown event date; it changes no row.
- The rollback-only SQL contract test passes. It checks latest-result uniqueness, review-reason
  requirements, failed-result retry eligibility, and preserved append-only history.
- Created inactive n8n workflow **Terra Space - Phase 4 - Extract Event Facts**
  (`EqBqTU8NoWmGuCsp`) in folder `Terra_Space`. It has 17 cloned-and-adapted nodes for one-candidate
  processing, local LM Studio extraction and safeguard calls, deterministic evidence validation,
  Supabase latest/history persistence, and failed-result retry routing.
- No Phase 4 result or history row exists yet. The pending view contains all 109 retained Phase 3
  candidates. Phase 1-3 counts and fingerprints are unchanged from the pre-migration baseline.
- Continuation: validate the inactive workflow structure and stored Code-node behavior without
  executing it. Then choose five pilot candidates read-only and request a separate owner approval
  before any live run.

# Navigation

- [Decision](../decisions/Phase-4-Event-Fact-Extraction.md)
- [Phase 3 Event Candidate Detection Plan](2026-08-27-phase-3-event-candidate-detection.md)
- [Project Knowledge](../Project-knowledge-Index.md)
