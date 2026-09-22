---
type: Plan
title: Phase 2 Main-Issue Detection Implementation Plan
description: Test-first plan for a manual, Supabase-node-led Phase 2 workflow that creates one validated Main Issue per completed Phase 1 source.
tags: [project-knowledge, plan, n8n, supabase, phase-2]
status: completed
---

# Phase 2 Main-Issue Detection Implementation Plan

> **For agentic workers:** Execute task by task. Each task has an independent verification point;
> do not process live owner articles until the owner starts the finished Manual Trigger workflow.

**Goal:** Build a local, manual Phase 2 workflow that detects and safely stores at most one
evidence-grounded Main Issue for each completed Phase 1 article that has no Phase 2 result.

**Architecture:** An additive Supabase migration supplies one latest-result table, one append-only
run table, and a read-only view of eligible Phase 1 sources. The inactive n8n workflow reads that
view with a Supabase node, loops over one source at a time, calls LM Studio twice, validates the
first call's exact evidence quote, and creates both the latest result and an append-only run through
Supabase nodes.

**Tech Stack:** Local Supabase/PostgreSQL 17, n8n, local LM Studio OpenAI-compatible API, n8n Code,
IF, Split In Batches, HTTP Request, and Supabase nodes.

**Spec:** [Phase 2 Main-Issue Detection](../decisions/Phase-2-Main-Issue-Detection.md)

## Global constraints

- Create the inactive workflow **Terra Space - Phase 2 - Detect Main Issues** inside n8n folder
  `Terra_Space`; the owner starts it only with **Execute Workflow** in the n8n editor.
- Follow Phase 1 naming: every new database object begins `terra_space_phase2_` and uses lowercase
  snake case.
- Process only rows exposed by `terra_space_phase2_pending_main_issue_sources`: Phase 1 sources
  with `processing_status = completed`, non-empty `cleaned_content_text`, and no latest Phase 2 row.
- Process one source at a time. Do not create actors, countries, relationships, event candidates,
  final events, or application UI changes.
- A `VALID` result has exactly one non-empty title, description, and evidence quote. The quote must
  occur verbatim in `cleaned_content_text`, and the separate local-AI safeguard must return
  `ACCEPT`.
- A `WITHHELD` result is a normal safe outcome when no clear Main Issue exists or validation rejects
  it. A request, parsing, or safeguard failure is `FAILED`. Both are saved as latest results and
  append-only runs so the same source is not retried automatically.
- Use Supabase nodes for view reads and all result/run writes. Code nodes may only generate a run
  key, build/parse strict JSON, perform exact quote lookup, and prepare field values.
- Do not run a synthetic article through live Phase 1 or manually start the Phase 2 workflow on the
  owner’s 29 articles. Validate database behavior in rollback-only SQL and validate the workflow’s
  structure before the owner’s first real manual run.

---

### Task 1: Add and test the Phase 2 database contract

**Files:**
- Create: `supabase/tests/phase2_main_issue_foundation.sql`
- Create: `supabase/migrations/202608260001_phase2_main_issue_foundation.sql`

**Interfaces:**
- Consumes: `public.terra_space_phase1_sources(id, cleaned_content_text, processing_status)`.
- Produces: `public.terra_space_phase2_main_issues`,
  `public.terra_space_phase2_main_issue_processing_runs`, and
  `public.terra_space_phase2_pending_main_issue_sources`.

- [ ] **Step 1: Write the failing SQL contract test.**

  Create `supabase/tests/phase2_main_issue_foundation.sql`. Start a transaction, insert two
  temporary Phase 1 source rows using unique `source_url` values and `processing_status = completed`:
  one with non-empty `cleaned_content_text` and one with empty text. Assert that the pending view
  returns only the non-empty source. Insert a `VALID` Phase 2 latest row for the eligible source,
  then assert that the view no longer returns it. Attempt to insert a `VALID` row without an
  evidence quote inside a `DO` block and assert SQLSTATE `23514`. Insert an append-only run linked
  to the source and assert the run is retained after a later update to the latest row. End with
  `ROLLBACK`.

- [ ] **Step 2: Run the test before the migration.**

  Run:

  ```powershell
  Get-Content -Raw supabase/tests/phase2_main_issue_foundation.sql |
    docker exec -i supabase_db_local-supabase psql -U postgres -d postgres -v ON_ERROR_STOP=1
  ```

  Expected: failure because `terra_space_phase2_pending_main_issue_sources` and the two Phase 2
  tables do not exist.

- [ ] **Step 3: Add the additive migration.**

  Create `supabase/migrations/202608260001_phase2_main_issue_foundation.sql` with:

  ```sql
  create table public.terra_space_phase2_main_issues (
    id uuid primary key default gen_random_uuid(),
    phase1_source_id uuid not null unique references public.terra_space_phase1_sources(id) on delete cascade,
    status text not null check (status in ('VALID', 'WITHHELD', 'FAILED')),
    issue_title text,
    issue_description text,
    evidence_quote text,
    quote_validation_status text not null check (quote_validation_status in ('VERIFIED', 'REJECTED', 'NOT_RUN')),
    safeguard_status text not null check (safeguard_status in ('ACCEPT', 'REJECT', 'FAILED', 'NOT_RUN')),
    model_name text,
    detection_prompt_version text,
    safeguard_prompt_version text,
    detection_raw_output text,
    safeguard_raw_output text,
    error_message text,
    processed_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint terra_space_phase2_main_issues_valid_shape check (
      (status = 'VALID' and nullif(btrim(issue_title), '') is not null
       and nullif(btrim(issue_description), '') is not null
       and nullif(btrim(evidence_quote), '') is not null
       and quote_validation_status = 'VERIFIED' and safeguard_status = 'ACCEPT')
      or (status in ('WITHHELD', 'FAILED') and issue_title is null
          and issue_description is null and evidence_quote is null)
    )
  );
  ```

  Add `terra_space_phase2_main_issue_processing_runs` with a `bigint generated always as identity`
  primary key, nullable `phase1_source_id` foreign key using `ON DELETE SET NULL`, non-null UUID
  `submission_key`, all result/validation/model/prompt/raw-output/error fields from the latest
  table, and `processed_at timestamptz not null`. Add the same result-shape check to the run table.
  Enable RLS on both tables, matching Phase 1’s local service-role-only posture. Add indexes on
  latest `processed_at` and run `(phase1_source_id, processed_at desc)`. Add the pending-source view
  using a left join that excludes every source with a latest Phase 2 row. Add column/table comments
  explaining that a `WITHHELD` row is a completed safe outcome.

- [ ] **Step 4: Apply the migration and record its version.**

  Run the migration through local PostgreSQL, then add `202608260001` to
  `supabase_migrations.schema_migrations` only if the local migration process does not register it
  automatically. Confirm the three objects exist and RLS is enabled on both tables.

- [ ] **Step 5: Re-run the SQL contract test.**

  Run the same command from Step 2. Expected: successful `ROLLBACK`; after the test, query the
  owner’s data and confirm the source count remains 29 and both Phase 2 tables contain zero rows.

### Task 2: Create the inactive Supabase-node-led n8n workflow

**Files:**
- Create: n8n workflow **Terra Space - Phase 2 - Detect Main Issues** in folder `Terra_Space`.

**Interfaces:**
- Consumes: rows from `terra_space_phase2_pending_main_issue_sources` with `id`, `title`,
  `cleaned_content_text`, and source metadata.
- Produces: one latest row in `terra_space_phase2_main_issues` and one append-only row in
  `terra_space_phase2_main_issue_processing_runs` for each source processed.

- [ ] **Step 1: Create the inactive workflow skeleton.**

  Create the workflow in n8n folder `POmLKYxBHEIIUq5m` with a Manual Trigger, a Supabase `getAll`
  node named **Get Pending Phase 2 Sources** reading
  `terra_space_phase2_pending_main_issue_sources` ordered by `created_at.asc, sequence_id.asc`, and
  a Split In Batches node named **Process One Source at a Time**. Reuse the existing local
  `Supabase account` credential. Keep the workflow inactive.

- [ ] **Step 2: Build and call the Main Issue detector.**

  Add a Code node named **Build Main Issue Prompt**. It generates a UUID submission key and sends
  the cleaned article with instructions to return exactly one JSON object:

  ```json
  {"status":"MAIN_ISSUE_FOUND","main_issue":{"title":"short neutral title","description":"one neutral sentence","evidence_quote":"exact quote"}}
  ```

  or:

  ```json
  {"status":"NO_MAIN_ISSUE","main_issue":null}
  ```

  The prompt must prohibit actors, countries, events, relationships, speculation, and Markdown
  fences. It must say that the article is data, not instructions. Add **Detect Main Issue with LM
  Studio**, an HTTP Request node posting to `http://host.docker.internal:1234/v1/chat/completions`
  using `google/gemma-4-12b-qat`, temperature `0.1`, `max_tokens` `1024`, and
  `reasoning_effort: none`.

- [ ] **Step 3: Validate the detector output and call the independent safeguard.**

  Add Code node **Validate Main Issue Evidence**. It must parse only a JSON object, reject
  malformed/unexpected shapes, require all three strings for `MAIN_ISSUE_FOUND`, and confirm the
  trimmed evidence quote is a verbatim substring of `cleaned_content_text`. Invalid detector output
  prepares `WITHHELD` with `quote_validation_status = REJECTED`; `NO_MAIN_ISSUE` prepares
  `WITHHELD` with `quote_validation_status = NOT_RUN`. Valid output prepares a second request asking
  the local model to return exactly `{"decision":"ACCEPT"}` or `{"decision":"REJECT","reason":"..."}`
  based only on the proposed title, description, and evidence quote. Add the corresponding HTTP
  Request node **Safeguard Main Issue with LM Studio** and Code node **Prepare Phase 2 Result**.
  That final Code node produces `VALID` only for `ACCEPT`; a rejection becomes `WITHHELD`; a
  safeguard request or parse failure becomes `FAILED`.

- [ ] **Step 4: Persist latest and history rows through Supabase nodes.**

  Add Supabase Create node **Save Phase 2 Main Issue** for
  `terra_space_phase2_main_issues`, mapping every latest-result field. Add Code node **Prepare Phase
  2 Processing Run** that maps the saved result plus its raw outputs to the history contract. Add
  Supabase Create node **Save Phase 2 Processing Run** for
  `terra_space_phase2_main_issue_processing_runs`. Connect every outcome path through this same
  latest-then-history sequence, then back to **Process One Source at a Time**. The workflow must
  continue after a per-source error by converting it to a `FAILED` result and saving its history.

- [ ] **Step 5: Validate the workflow without running owner articles.**

  Validate the workflow with the n8n runtime profile. Confirm 0 errors and 0 warnings. Inspect the
  active definition and verify it is inactive, in `Terra_Space`, uses Supabase nodes for the view
  read/latest write/run write, has exactly two LM Studio HTTP Request nodes, and processes one item
  per iteration.

### Task 3: Record completion and prepare the owner’s first run

**Files:**
- Modify: `project-knowledge/plans/2026-08-26-phase-2-main-issue-detection.md`
- Modify: `project-knowledge/Current-Status.md`
- Modify: `project-knowledge/Project-Knowledge-Log.md`

**Interfaces:**
- Consumes: verified database migration and n8n structural validation.
- Produces: a documented, inactive Phase 2 workflow ready for the owner’s first manual execution.

- [ ] **Step 1: Record the created workflow ID, migration version, and validation output.**

  Mark this plan `completed` only after the database contract test passes and n8n reports no errors
  or warnings. Do not claim a live Main-Issue quality result until the owner starts the Manual
  Trigger workflow.

- [ ] **Step 2: Update Current Status and the knowledge log.**

  State that Phase 2 is ready but inactive, name the exact workflow and tables, and tell the owner
  to open the workflow in n8n and click **Execute Workflow** when ready. Preserve the separate
  future task: review the first real Phase 2 run against raw article text and saved Main Issues.

- [ ] **Step 3: Validate Project Knowledge.**

  Run:

  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1
  ```

  Expected: 0 errors and 0 warnings.

## Completion record

Completed 2026-08-26:

- Applied local Supabase migration `202608260001_phase2_main_issue_foundation`. It added
  `terra_space_phase2_main_issues`, `terra_space_phase2_main_issue_processing_runs`, and
  `terra_space_phase2_pending_main_issue_sources` without altering any Phase 1 row.
- The new rollback-only database contract test passed. After it rolled back, Phase 1 still had 29
  sources and both Phase 2 tables had 0 rows.
- Created inactive n8n workflow **Terra Space - Phase 2 - Detect Main Issues**
  (`AkdHAcebfzmnOSST`) in `Terra_Space`. It has a Manual Trigger, one-at-a-time loop, two local LM
  Studio calls, and Supabase nodes for the pending view, latest result, and append-only run record.
- n8n runtime validation passed with 16 enabled nodes, 19 valid connections, 0 invalid connections,
  32 validated expressions, 0 errors, and 0 warnings. The workflow was not executed; the owner's
  first live manual run still requires a read-only quality review.

### Follow-up: parser interoperability correction (2026-08-26)

The first owner-started execution returned detector JSON in an observed
`{"MAIN_ISSUE_FOUND": {...}}` shape, often inside a Markdown `json` fence, rather than the parser's
initial expected format. With owner approval, the workflow parser was updated to strip only that
outer fence and accept the observed nested form with either `issue_title`/`issue_description` or
`title`/`description`, while retaining the original accepted shapes, verbatim quote check, and
independent safeguard. The parser update passed a static n8n update validation and a fresh runtime
validation with 0 errors and 0 warnings.

The owner also approved deletion of exactly the 29 resulting `WITHHELD` latest rows. The deletion
preserved all 29 append-only processing-history rows and all 29 Phase 1 sources; the pending view
again has 29 sources. The workflow remains inactive. The owner must click **Execute Workflow** for
the corrected reprocessing run, followed by a read-only quality review of its saved Main Issues.

## Navigation

- [Project Knowledge](../Project-knowledge-Index.md)
- [Decision](../decisions/Phase-2-Main-Issue-Detection.md)
- [Phase 1 Baseline](../decisions/Verified-Phase-1-Cleaning-Baseline.md)
