---
type: Plan
title: Phase 4 Narrow Event Fact Extraction Implementation Plan
description: Test-first plan for separating Phase 4 date, actor, and location extraction while preserving grounded partial results and existing history.
tags: [project-knowledge, plan, n8n, supabase, phase-4, reliability]
status: completed
---

# Phase 4 Narrow Event Fact Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this
> plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking. Do not use subagents unless
> the owner explicitly requests them.

**Goal:** Improve the reliability of one Phase 4 run by separating date/epistemic, actor, and
location extraction and by reviewing actors and locations with their own narrow safeguards.

**Architecture:** The existing inactive Phase 4 n8n workflow remains the operational boundary and
continues to process one Phase 3 candidate at a time. It will make three narrow extraction calls,
apply deterministic validation after each call, review retained actors and locations with separate
safeguards, combine all usable fields, and write through the existing Supabase nodes. The existing
Phase 4 tables and JSON facts contract are reused; no database migration is needed.

**Tech Stack:** Local n8n, local LM Studio OpenAI-compatible API, Supabase/PostgreSQL 17, and n8n
Manual Trigger, Supabase, Code, IF, HTTP Request, and Loop Over Items nodes.

**Spec:** [Phase 4 Event Fact Extraction](../decisions/Phase-4-Event-Fact-Extraction.md)

## Execution checkpoint — 2026-08-31

- The narrow workflow, item-level safeguards, conservative grounded-date preservation, and
  candidate-evidence event boundary are implemented in the inactive workflow.
- Executions `2017` and `2018` processed the same five candidates and matched exactly on all five
  statuses and complete facts payloads.
- Execution `2019` completed the controlled 109-candidate replay with no failed result.
- The final quote audit exposed three normalized near-matches. Exact-substring validation replaced
  normalized matching, and execution `2020` repaired only those three candidates.
- Latest verified state is 109 results (49 `VALID`, 60 `NEEDS_REVIEW`, 0 `FAILED`), 392 history
  rows, and 411/411 retained quotes found exactly in cleaned articles with none truncated.
- Normal empty-queue routing is restored and the workflow validates with 0 errors and 0 warnings.
- The obsolete pass-through pilot-limit node was removed; the normal Supabase queue now connects
  directly to one-candidate processing (27 nodes and 35 valid connections).
- With explicit owner confirmation, the three temporary read-only input views were deleted in
  dependency order. Post-cleanup verification found 0 temporary views, 109 latest results, 392
  history rows, an empty normal queue, and no lost or truncated retained quote. This plan is
  completed.

## Global Constraints

- Do not modify Phase 1, Phase 2, or Phase 3 rows, tables, prompts, workflows, or baselines.
- Modify only the inactive workflow **Terra Space - Phase 4 - Extract Event Facts**
  (`EqBqTU8NoWmGuCsp`) in n8n folder `Terra_Space`.
- Keep the complete Phase 1 cleaned article in every narrow extraction call.
- Keep processing one Phase 3 candidate at a time and save its result before advancing.
- Use Supabase nodes for all normal database reads and writes.
- Make no cloud AI call. LM Studio remains the only model endpoint.
- Reuse `terra_space_phase4_event_facts` and
  `terra_space_phase4_event_fact_processing_runs`; do not add a storage migration. A temporary
  pilot input view is a separate operational change and requires its own explicit approval.
- Preserve all 245 existing processing-history rows and all 109 current latest rows unless the
  owner later approves a bounded pilot update.
- Every retained actor and location must have a non-truncated verbatim quote in the complete
  cleaned article.
- Omit only an unsupported individual actor or location; never erase other usable fields.
- A partial extraction or safeguard problem produces `NEEDS_REVIEW` with a concrete reason.
- Use `FAILED` only when no usable Phase 4 result can be prepared.
- Keep taxonomy, normalization, aliases, country codes, coordinates, geocoding, duplicates, final
  events, Dashboard writes, and UI changes outside this plan.
- Obtain separate owner approval before editing the n8n workflow, preparing a pilot replay input,
  running five candidates, or running the remaining candidates.

## Existing contract decision

Read-only inspection on 2026-08-31 confirmed that a migration is unnecessary:

- `facts` already stores the final date, epistemic status, actor array, and location array.
- `extraction_raw_output` can store a JSON string with `date_epistemic`, `actors`, and `locations`
  raw responses.
- `safeguard_raw_output` can store a JSON string with separate `actors` and `locations` responses.
- The existing aggregate `safeguard_status` can be `ACCEPT`, `REJECT`, `FAILED`, or `NOT_RUN`.
- Existing prompt-version fields can identify the grouped narrow prompt set.
- Existing `NEEDS_REVIEW` and `FAILED` constraints already support partial-result behavior.

The new grouped raw-output shapes are:

```json
{
  "date_epistemic": "exact raw model response or null",
  "actors": "exact raw model response or null",
  "locations": "exact raw model response or null"
}
```

```json
{
  "actors": "exact raw safeguard response or null",
  "locations": "exact raw safeguard response or null"
}
```

---

### Task 1: Freeze and verify the current baseline

**Files:**

- Read: `supabase/migrations/202608270003_phase4_event_fact_extraction.sql`
- Read: `supabase/tests/phase4_event_fact_extraction.sql`
- Create after workflow-edit approval: `.n8n-backups/20260831/terra-space-phase4-before-narrow-extraction.json`

**Interfaces:**

- Consumes: current Phase 1-4 database state and workflow `EqBqTU8NoWmGuCsp`.
- Produces: counts, stable fingerprints, and an exact workflow backup used by all later tasks.

- [x] **Step 1: Record database counts using a read-only transaction.**

  Query Phase 1 sources, Phase 2 latest results, Phase 3 latest results and candidate count, Phase 4
  latest statuses, Phase 4 processing-run count, and the normal Phase 4 pending count. Expected
  baseline is 29 Phase 1 rows, 29 Phase 2 rows, 29 Phase 3 rows containing 109 candidates, 109
  Phase 4 latest rows, 245 Phase 4 history rows, and an empty normal queue.

- [x] **Step 2: Record stable Phase 1-4 fingerprints.**

  Use stable primary-key ordering and `md5(string_agg(row_to_json(t)::text, ''))`. Do not print or
  export cleaned article text. Keep the fingerprints in the execution notes for comparison after
  each approved live action.

- [x] **Step 3: Export the complete inactive workflow before editing.**

  Save the workflow JSON to the backup path above. Confirm its ID, name, inactive status, and 18
  nodes. Do not activate or execute it.

- [x] **Step 4: Validate the untouched workflow.**

  Run n8n runtime validation. Expected: zero errors. Record warnings separately without changing
  unrelated nodes.

- [x] **Step 5: Stop for explicit workflow-edit approval.**

  State that the next task changes only the inactive n8n workflow, creates no table or migration,
  and executes no candidate. Do not continue until the owner approves that exact action.

---

### Task 2: Replace the combined extractor with three narrow extraction stages

**Files:**

- Modify in n8n: workflow `EqBqTU8NoWmGuCsp`
- Reference backup: `.n8n-backups/20260831/terra-space-phase4-before-narrow-extraction.json`

**Interfaces:**

- Consumes: one item from `Prepare Phase 4 Candidate` containing the complete cleaned article and
  Phase 3 candidate context.
- Produces: `p4_date_epistemic`, `p4_actors`, `p4_locations`, field-specific raw outputs, and a
  shared array `p4_review_reasons`.

- [x] **Step 1: Update immutable attempt metadata.**

  Set `p4_extraction_prompt_version` to `phase4-narrow-extraction-v2` and
  `p4_safeguard_prompt_version` to `phase4-narrow-safeguards-v2`. Keep the model name, submission
  key, candidate identity, and source identity unchanged.

- [x] **Step 2: Add the date-and-epistemic prompt builder.**

  Its output must request only:

  ```json
  {
    "event_date": null,
    "event_date_precision": "unknown",
    "event_date_evidence_quote": null,
    "epistemic_status": "unknown",
    "epistemic_status_evidence_quote": null
  }
  ```

  Allowed date precision remains `exact`, `month`, `year`, or `unknown`; epistemic status remains
  `confirmed`, `reported`, `alleged`, `planned`, `denied`, or `unknown`. The prompt must prohibit
  actors and locations and include the complete cleaned article.

- [x] **Step 3: Add the date-and-epistemic LM Studio request.**

  Reuse the current local endpoint, model, `temperature: 0.1`, `reasoning_effort: none`, retry
  count, timeout, and error-output behavior. A technical or parse failure must continue to the
  actor step with unknown date/epistemic values and a concrete review reason.

- [x] **Step 4: Add deterministic date-and-epistemic validation.**

  Reuse the current exact date-shape and conservative quote-matching rules. Reject `...` and `…`
  before whitespace and punctuation normalization. An invalid date becomes null/unknown. An
  unsupported epistemic quote becomes null while the allowed epistemic value remains visible and
  the result receives a review reason.

- [x] **Step 5: Add the actor-only prompt and request.**

  Request only this shape:

  ```json
  {
    "actors": [
      {
        "name": "name exactly as written",
        "role": "source",
        "evidence_quote": "verbatim quote from the cleaned article"
      }
    ]
  }
  ```

  Roles remain `source`, `recipient`, or `participant`. Include the complete cleaned article and
  candidate context. Explicitly prohibit dates, epistemic classification, locations, aliases,
  normalization, inferred participants, and outside knowledge.

- [x] **Step 6: Add deterministic actor validation.**

  Parse only the documented shape. For each actor, require a non-empty written name, allowed role,
  and non-truncated quote found in the complete cleaned article. Omit only the invalid actor,
  deduplicate identical `{name, role, evidence_quote}` objects, and append one concrete review
  reason per omission category. A technical or parse failure yields an empty actor array and
  continues to location extraction.

- [x] **Step 7: Add the location-only prompt and request.**

  Request only this shape:

  ```json
  {
    "locations": [
      {
        "name": "name exactly as written",
        "level": "country",
        "evidence_quote": "verbatim quote from the cleaned article"
      }
    ]
  }
  ```

  Levels remain `country`, `admin1`, `city_regency`, or `unknown`. Include the complete cleaned
  article and candidate context. Explicitly prohibit actors, dates, normalization, country-code
  conversion, coordinates, geocoding, inferred locations, and outside knowledge.

- [x] **Step 8: Add deterministic location validation.**

  Apply the same item-level behavior used for actors: require an allowed level and a non-truncated
  verbatim quote, omit only the invalid item, retain valid items, deduplicate exact objects, and
  add a concrete review reason. A technical or parse failure yields an empty location array and
  continues to result preparation.

- [x] **Step 9: Validate workflow structure without executing it.**

  Run n8n runtime validation and inspect every connection. Confirm that one candidate cannot reach
  persistence until all three narrow extraction branches have completed and been combined.

---

### Task 3: Add separate item-level actor and location safeguards

**Files:**

- Modify in n8n: workflow `EqBqTU8NoWmGuCsp`

**Interfaces:**

- Consumes: deterministically grounded `p4_actors` and `p4_locations` arrays.
- Produces: reviewed actor/location arrays, raw safeguard responses, narrow safeguard statuses, and
  item-specific review reasons.

- [x] **Step 1: Add an actor safeguard only when actors remain.**

  The safeguard receives the complete cleaned article, candidate title as identity only, and the
  actor array. It must not receive the candidate description or general candidate evidence as
  proof. Require one decision for every zero-based actor index:

  ```json
  {
    "decisions": [
      {"index": 0, "decision": "ACCEPT", "reason": null}
    ]
  }
  ```

- [x] **Step 2: Validate the actor safeguard response deterministically.**

  Require every actor index exactly once, accept only `ACCEPT` or `REJECT`, require a concrete
  reason for rejection, and reject duplicate or unknown indexes. Retain accepted actors and omit
  rejected actors. If the safeguard response is technically unusable, omit the unreviewed actor
  array, preserve its extraction raw output, and add a `NEEDS_REVIEW` reason.

- [x] **Step 3: Add a location safeguard only when locations remain.**

  Use the same indexed-decision contract and isolation rules, replacing actors with locations. The
  safeguard may judge only each location against its own quote in the complete cleaned article.

- [x] **Step 4: Validate the location safeguard response deterministically.**

  Retain accepted locations, omit rejected locations individually, and treat an incomplete or
  malformed safeguard response as a field-level review problem rather than a whole-candidate
  failure.

- [x] **Step 5: Derive the existing aggregate safeguard status.**

  Set `ACCEPT` when every applicable narrow safeguard accepts all retained items or when both arrays
  are empty and no safeguard is needed. Set `REJECT` when at least one item is explicitly rejected.
  Set `FAILED` when either required safeguard is technically unusable. Use `NOT_RUN` only when no
  usable extraction result could be prepared.

- [x] **Step 6: Validate the workflow without executing it.**

  Confirm that actor and location safeguard prompts cannot see or modify fields outside their own
  responsibility and that every route rejoins the result-preparation path exactly once.

---

### Task 4: Combine partial results and reuse existing Supabase persistence

**Files:**

- Modify in n8n: workflow `EqBqTU8NoWmGuCsp`
- Test: `supabase/tests/phase4_event_fact_extraction.sql`

**Interfaces:**

- Consumes: validated date/epistemic values, reviewed actor/location arrays, raw outputs, narrow
  statuses, and review reasons.
- Produces: the existing `p4_*` fields consumed by `Save Phase 4 Event Facts` and `Prepare Phase 4
  Processing Run`.

- [x] **Step 1: Build the unchanged `facts` contract.**

  Produce exactly the seven existing top-level keys: `event_date`, `event_date_precision`,
  `event_date_evidence_quote`, `epistemic_status`, `epistemic_status_evidence_quote`, `actors`, and
  `locations`. Do not add internal workflow state to `facts`.

- [x] **Step 2: Serialize grouped raw outputs.**

  Store the three exact extraction responses as one JSON string in `extraction_raw_output` and the
  two exact safeguard responses as one JSON string in `safeguard_raw_output`. Never rewrite model
  text inside those values.

- [x] **Step 3: Derive result status.**

  Use `VALID` only when deterministic checks pass, every applicable safeguard accepts, and there is
  no review reason. Use `NEEDS_REVIEW` whenever any field is omitted, a narrow step fails, a
  safeguard rejects, or a safeguard is unusable. Use `FAILED` only if the workflow cannot construct
  the complete seven-key facts object.

- [x] **Step 4: Derive extraction status.**

  Use `FACTS_FOUND` when the final payload contains a non-null date, at least one actor, or at least
  one location. Otherwise use `NO_ADDITIONAL_FACTS`. Reserve `FAILED` for the whole-result failure
  described above.

- [x] **Step 5: Keep Supabase persistence nodes unchanged where possible.**

  Confirm that the existing create-latest, update-failed-latest, prepare-history, and append-history
  mappings still receive the same field names. Change only a mapping proven incompatible with the
  grouped raw-output strings.

- [x] **Step 6: Run the rollback-only SQL contract test.**

  Run `supabase/tests/phase4_event_fact_extraction.sql` through local PostgreSQL with
  `ON_ERROR_STOP=1`. Expected: all assertions pass and the transaction rolls back. Confirm Phase 4
  counts and fingerprints remain unchanged.

- [x] **Step 7: Validate and back up the adjusted inactive workflow.**

  Run n8n runtime validation. Save the adjusted workflow as
  `.n8n-backups/20260831/terra-space-phase4-narrow-extraction.json`. Confirm the workflow remains
  inactive and remains in `Terra_Space`.

---

### Task 5: Prove narrow behavior without writing data

**Files:**

- Read: `.n8n-backups/20260831/terra-space-phase4-narrow-extraction.json`
- Update after verification: `project-knowledge/Current-Status.md`
- Update after verification: `project-knowledge/Project-Knowledge-Log.md`

**Interfaces:**

- Consumes: stored adjusted workflow configuration and controlled fixture model responses.
- Produces: evidence that partial failures, item omissions, raw-output retention, and routing work
  before any candidate is processed.

- [x] **Step 1: Test date success with empty actors and locations.**

  Use a fixture with a grounded exact date and confirmed status. Expected: date retained, empty
  arrays valid, and no unrelated actor/location fact created.

- [x] **Step 2: Test mixed actor validity.**

  Use two proposed actors: one with a complete verbatim quote and one with a truncated quote.
  Expected: retain only the grounded actor and add a specific review reason.

- [x] **Step 3: Test mixed location safeguard decisions.**

  Use two deterministically grounded locations with one safeguard acceptance and one rejection.
  Expected: retain only the accepted location, preserve the rejection reason, and mark the combined
  result `NEEDS_REVIEW`.

- [x] **Step 4: Test one narrow technical failure.**

  Simulate an actor HTTP or JSON failure with valid date and location outputs. Expected: preserve
  the date and accepted locations, use an empty actor array, and return `NEEDS_REVIEW`, not `FAILED`.

- [x] **Step 5: Test malformed safeguard indexing.**

  Supply duplicate, missing, and out-of-range indexes. Expected: do not silently accept any
  affected array; retain other fields and record a concrete review reason.

- [x] **Step 6: Test raw-output grouping.**

  Parse both stored JSON strings and confirm all five raw responses are present under their exact
  documented keys without content changes.

- [x] **Step 7: Recheck database immutability.**

  Expected: Phase 1-4 counts and fingerprints exactly match Task 1. Update Current Status and the
  Knowledge Log to say the inactive workflow is ready for a pilot, but do not claim live quality
  improvement.

- [x] **Step 8: Validate Project Knowledge.**

  Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1`.
  Expected: zero errors and zero warnings.

- [x] **Step 9: Stop for five-candidate pilot approval.**

  State exactly which five candidate identities will be replayed, that their latest Phase 4 rows
  will be updated, that five append-only history rows will be added, and that Phase 1-3 will remain
  unchanged. Do not prepare a replay view or execute the workflow before approval.

---

### Task 6: Run and evaluate a separately approved five-candidate pilot

**Files:**

- Modify only if approved: a temporary Phase 4 pilot input view using the next unused migration
  timestamp
- Update after pilot: `project-knowledge/Current-Status.md`
- Update after pilot: `project-knowledge/Project-Knowledge-Log.md`

**Interfaces:**

- Consumes: five owner-approved existing Phase 4 candidate identities.
- Produces: five new append-only attempts, five updated latest results, and a comparison report.

- [x] **Step 1: Select five candidates read-only.**

  Include examples that previously changed actors, changed locations, changed both, retained empty
  arrays, and retained several actors/locations. Present exact candidate identities for approval.

- [x] **Step 2: After approval, expose only those five candidates.**

  Prefer a narrowly named temporary view over changing the normal pending definition. Include each
  existing latest-result ID so the workflow follows the update path. Confirm the input count is
  exactly five before any execution.

- [x] **Step 3: Point the inactive workflow at the five-candidate input.**

  Validate the stored configuration and keep the workflow inactive. The owner starts the manual
  execution.

- [x] **Step 4: Evaluate the completed pilot read-only.**

  Confirm five latest updates and five appended history rows. Check every retained actor/location
  quote against the complete cleaned article, check for truncation, review raw-output grouping,
  list item-level omissions and reasons, and compare output with earlier attempts.

- [x] **Step 5: Confirm Phase 1-3 and non-pilot Phase 4 records are unchanged.**

  Compare fingerprints and candidate identities against Task 1. Stop immediately if anything
  outside the five approved Phase 4 latest rows changed.

- [x] **Step 6: Restore the normal pending view and remove temporary pilot routing only after
  owner approval.**

  Confirm the workflow again reads `terra_space_phase4_pending_event_candidates`, remains inactive,
  and has an empty normal queue. Do not process all 109 candidates automatically.

- [x] **Step 7: Report whether the design improved actor and location quality.**

  Recommend a full controlled replay only if the five cases show correct item retention, clear
  review reasons, no ungrounded quotes, no truncation, and no whole-result loss from one narrow
  failure.

## Plan self-review

- **Spec coverage:** Narrow date/epistemic, actor, and location extraction; complete-article input;
  separate actor/location safeguards; item-level omission; partial-result retention; Supabase-node
  persistence; inactive/manual operation; pilot gating; and Phase 1-3 protection each map to an
  implementation task.
- **Scope control:** The plan adds no taxonomy, normalization, alias matching, coordinates,
  duplicates, final events, Dashboard writes, UI, or repeated-run stabilization.
- **Storage:** Read-only inspection proved the existing schema can retain grouped raw outputs, so
  the plan avoids an unnecessary migration.
- **Safety:** Workflow edit, pilot input preparation, pilot execution, pilot cleanup, and any later
  full replay remain separate approval gates.
- **Type consistency:** The final facts keys and allowed vocabularies stay identical to the current
  database contract; internal narrow-step fields never enter the stored `facts` object.
- **No placeholders:** Every status, prompt version, raw-output key, safeguard response shape,
  failure rule, verification action, and approval boundary is defined.

## Implementation record

### 2026-08-31 - Inactive narrow workflow prepared

- Created an inactive recovery copy named **Terra Space - Phase 4 - Extract Event Facts - Backup
  2026-08-31** (`Ixbz3rFqr2sbuFOs`) in `Terra_Space`. Before editing, its 18 nodes and connections
  exactly matched the original workflow.
- Updated the original inactive workflow (`EqBqTU8NoWmGuCsp`) to 28 nodes. It now has narrow
  date/epistemic, actor-only, and location-only extraction; separate indexed actor and location
  safeguards; item-level omission; partial-result retention; and grouped raw outputs using prompt
  versions `phase4-narrow-extraction-v2` and `phase4-narrow-safeguards-v2`.
- n8n runtime validation reports 0 errors and 0 warnings across 28 enabled nodes, 36 valid
  connections, and 58 validated expressions. Non-writing structural assertions passed for all
  required narrow stages, complete-article context, item-level omission, indexed safeguard
  decisions, grouped raw outputs, partial-review behavior, and inactive status.
- No candidate was executed. Read-only database verification remains 29 Phase 1 sources, 29 Phase
  2 latest results, 29 Phase 3 latest results, 109 Phase 4 latest results (16 `VALID`, 93
  `NEEDS_REVIEW`), 245 Phase 4 history rows, and an empty normal Phase 4 queue.
- Continuation: select five pilot candidates read-only and obtain explicit owner approval before
  creating any pilot input or executing the workflow.

### 2026-08-31 - Five-candidate pilot and partial-safeguard retry

- Added the owner-approved temporary view `terra_space_phase4_narrow_pilot_candidates` containing
  exactly five existing candidate identities and pointed the inactive workflow at it.
- Execution `2011` updated exactly five latest rows and appended five history rows. It exposed two
  incomplete safeguard decision lists: one location array and one actor array were fully omitted,
  while the candidate correctly remained `NEEDS_REVIEW`.
- A regression test against the stored n8n node code reproduced that whole-array loss. The actor
  and location result nodes were then changed to keep valid unique `ACCEPT` decisions and omit only
  missing, invalid, duplicate, or rejected indexes. Eight behavior cases passed after the change;
  runtime validation again reported 0 errors and 0 warnings.
- Execution `2012` appended five more history rows. The two incomplete cases now retain 6 approved
  locations and 10 approved actors respectively, with one missing item omitted from each and a
  concrete review reason. All 34 retained actor/location quotes occur exactly in their complete
  cleaned articles; none is truncated.
- Latest Phase 4 remains 109 rows: 17 `VALID`, 92 `NEEDS_REVIEW`, and 0 `FAILED`. History is now
  255 rows. Four of five dates matched between the two pilot runs; one changed from `2026-08-11`
  to unknown. This blocks a full controlled replay until a minimal date-stability correction is
  designed and validated on the same bounded pilot.
- The workflow remains inactive and still reads the five-candidate pilot view. Restoring the
  normal empty queue and removing the temporary view remain separate owner-approved cleanup.

# Navigation

- [Decision](../decisions/Phase-4-Event-Fact-Extraction.md)
- [Original Phase 4 Implementation Plan](2026-08-27-phase-4-event-fact-extraction.md)
- [Project Knowledge](../Project-knowledge-Index.md)
