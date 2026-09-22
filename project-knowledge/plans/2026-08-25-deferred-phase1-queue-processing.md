---
type: Plan
title: Deferred Phase 1 Queue Processing Implementation Plan
description: Test-first plan to separate manual article collection from owner-triggered processing of queued and failed Phase 1 sources.
tags: [project-knowledge, plan, n8n, supabase, phase-1]
status: completed
---

# Deferred Phase 1 Queue Processing Implementation Plan

**Goal:** Let the owner save one article at a time without starting LM Studio, then deliberately
start a separate n8n workflow that processes every `queued` and `failed` Phase 1 source.

**Builds on:** [Separated Manual Intake and Deferred Queue
Processing](../decisions/Separated-Manual-Intake-and-Deferred-Queue-Processing.md) and the active
Phase 1 cleaning safeguard. This plan changes no existing historical source row and does not rebuild
the downstream post-reset pipeline.

## Global constraints

- The active **Terra Space - Input News Manual** workflow remains the one-article form. `Author` is
  optional; other current article fields stay required.
- Intake saves `raw_content_text`, leaves `cleaned_content_text` empty, and sets
  `processing_status = queued`. It must not call LM Studio or create a processing-run row.
- Before creating that source, intake trims the submitted `source_url` and rejects a URL that is
  already saved with `REJECTED_DUPLICATE`; the rejection must not create a source, queue item, or
  processing run.
- The new **Terra Space - Process All Saved Articles** workflow must be created in n8n folder
  `Terra_Space`, remain inactive, and start only when the owner clicks **Execute Workflow** in the
  n8n editor.
- Processing considers only `queued` and `failed` rows. The owner starts only one processor run at a
  time; the workflow fetches those rows through Supabase and loops over one article at a time.
- The existing deterministic cleaner, LM Studio prompt/model, and paragraph-fidelity guard are reused
  unchanged. A cleaner failure changes only that source to `failed`, records a `FAILED` processing
  run, and lets the remaining queue continue.
- A successful cleaner stores the cleaned text, sets `completed`, and records a `SUCCESS` run. Raw
  LM Studio output and any fidelity-guard fallback reason stay in that append-only run record.
- Do not submit synthetic articles to the live intake form. Validation uses isolated SQL checks,
  n8n structural validation, and a review of the first real owner submission.

## Implementation tasks

- [x] **1. Add an atomic queue-claim database function and its isolated SQL checks.**

  Create `supabase/migrations/202608250001_phase1_queue_claim.sql` and
  `supabase/tests/phase1_queue_claim.sql`. The migration adds only
  `public.terra_space_phase1_claim_next_source()`; it changes no saved source data when applied.
  The function uses `FOR UPDATE SKIP LOCKED` to select the oldest `queued` or `failed` source (or a
  `processing` source not updated for 15 minutes), changes that one source to `processing`, clears
  its previous error, and returns the claimed source as JSON. It returns SQL `NULL` when nothing is
  available. Limit execution to the local service roles needed by n8n; public/anonymous callers do
  not receive access. The test runs inside a transaction and rolls back, proving queued/failed
  selection, no duplicate claim, stale-run recovery, and no claim after the queue is empty.

- [x] **2. Create the n8n PostgreSQL credential needed for atomic claims.**

  Create a local `Terra Space Supabase PostgreSQL` credential from the existing local database
  connection, without exposing its password in a workflow or project document. Use it only on the
  new processor's PostgreSQL `Execute Query` node. Verify the credential connection before
  activating the workflow.

- [x] **3. Convert Input News Manual to queue-only intake.**

  Update live workflow `gABPryH3jTe2Ktz5`: make the form's `Author` field optional; normalize an
  empty author to an empty string because the database column is required; validate the other five
  form values; reject an already-saved trimmed source URL before an insert; insert a new source as
  `queued` with a null cleaned value and no processing error; and return a `QUEUED` confirmation.
  Remove the cleaner/LM Studio/run-record path from this workflow.
  Retain its active form path and preserve its internal-input field types as strings.

- [x] **4. Build the separate processor in `Terra_Space`.**

  Create inactive workflow **Terra Space - Process All Saved Articles** in folder
  `POmLKYxBHEIIUq5m`. Its form has one submit button and confirms the run after it finishes. Each
  iteration calls the atomic claim function; when it receives a source, it runs the existing
  deterministic cleaner, LM Studio request, prompt, and fidelity guard. Its success branch updates
  the claimed row to `completed` and inserts the existing `SUCCESS` run contract. Its error branch
  captures the error text, updates that source to `failed`, inserts a `FAILED` run, and loops back
  for the next claim. An empty claim ends the run with counts for completed and failed attempts.

- [x] **5. Validate before publishing.**

  Run the new SQL test in a rollback-only transaction, validate both n8n workflows, inspect their
  active definitions to confirm the input workflow has no LM Studio node in its execution path and
  the processor is inside `Terra_Space`, then activate the processor only after all checks report no
  errors or warnings. Do not trigger either live form with made-up content. Record the first real
  owner-triggered run as the live observation.

- [x] **6. Update Project Knowledge and validate it.**

  Mark this plan completed after the implementation and verification are finished. Update Current
  Status and the Project Knowledge Log with the final workflow IDs, activation state, exact safety
  behavior, and verification result. Run `tools/Validate-ProjectKnowledge.ps1` and fix every error
  before handoff.

## Expected owner experience

1. Open **Terra Space - Input News Manual**, submit one article, and receive **Queued**.
2. Later open **Terra Space - Process All Saved Articles** in n8n and click **Execute Workflow**.
3. The workflow cleans all waiting articles. Any that cannot be cleaned become **Failed** and are
   automatically attempted again the next time the owner presses the button.

## Completion record (2026-08-25)

- Installed migration `202608250001_phase1_queue_claim`; its rollback-only SQL test passed after
  proving queued, failed, stale, and empty-queue behavior. Only `service_role` can execute the
  claim function; `anon` and `authenticated` cannot.
- Updated live **Terra Space - Input News Manual** (`gABPryH3jTe2Ktz5`) and created/activated
  **Terra Space - Process All Saved Articles** (`aAVDCkvD02JWkbvJ`) in `Terra_Space`.
- n8n validation returned 0 errors and 0 warnings for both workflows. A real empty-queue form
  submission completed successfully, reached the database claim, and made no source change.
- On 2026-08-26, added the approved submitted-URL duplicate gate to Input News Manual. Live
  execution `1938` used an existing URL and returned `REJECTED_DUPLICATE`; it skipped the save
  node and left the source count at 25.
- On 2026-08-26, the owner simplified the processor for single-run use. The workflow now uses the
  regular Supabase node to fetch `queued` and `failed` sources and a batch-size-one loop to clean
  them one at a time. It no longer invokes the earlier atomic PostgreSQL claim function; that
  existing database function remains unused and no source was processed during the change.
- On 2026-08-26, the owner replaced the processor form with an n8n Manual Trigger. The workflow is
  intentionally inactive because n8n does not permit an active workflow with only a Manual Trigger.
  The owner now starts it in the n8n editor using **Execute Workflow**. Runtime validation reported
  0 errors and 0 warnings; the queued sources remain untouched.
- On 2026-08-26, the first manual processor run exposed a field-name mismatch that passed empty
  article text to the cleaner and incorrectly marked 29 sources completed with blank cleaned text.
  The processor now maps `raw_content_text` to the field used by the pre-cleaner and uses a
  non-empty-cleaned-text gate to send empty results to the failed/retry path. Runtime validation
  passed with 0 errors and 0 warnings. With owner approval, exactly those 29 sources were returned
  to `queued` with null cleaned text; their 29 incorrect run-history records were preserved.

## Navigation

- [Project Knowledge](../Project-knowledge-Index.md)
- [Current Status](../Current-Status.md)
- [Decision](../decisions/Separated-Manual-Intake-and-Deferred-Queue-Processing.md)
