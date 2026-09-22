---
type: Plan
title: Phase 5B Event Type Classification Implementation Plan
description: Test-first plan for adding conservative two-pass Event Type classification, controlled corrective retries, Unclassified results, and database-reviewed proposals to the existing Phase 5 workflow.
tags: [project-knowledge, plan, phase-5, phase-5b, n8n, supabase, taxonomy, lm-studio]
status: planned
---

# Phase 5B Event Type Classification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this
> plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking. Do not use subagents unless
> the owner explicitly requests them.

**Goal:** Add one auditable, conservatively safeguarded Event Type classification to every prepared
Phase 5A event while preserving visible Unclassified results and human authority over taxonomy
changes.

**Architecture:** Additive Supabase reference/latest/history/proposal tables support a two-pass
local classifier and safeguard. The existing inactive Phase 5 workflow gains one 5B group after
5A, processes one event at a time, permits up to two corrective classifier attempts after safeguard
rejection, and never creates an official type automatically.

**Tech Stack:** Local Supabase/PostgreSQL 17, n8n Manual Trigger/Supabase/Code/HTTP Request/IF/Loop
Over Items nodes, LM Studio OpenAI-compatible API, `google/gemma-4-12b-qat`, and Node.js built-in
test runner.

**Spec:** [Phase 5B Event Type Classification](../decisions/Phase-5B-Event-Type-Classification.md)

## Global constraints

- Keep Phase 5A-5E in the one existing n8n workflow **Terra Space - Phase 5 - Generate and Qualify
  Events** (`FAxBx6a9fnXjLfVO`) in folder `Terra_Space`.
- Add only Phase 5B. Do not add Phase 5C, 5D, or 5E placeholders.
- Phase 1-4 and Phase 5A tables, rows, workflows, prompts, statuses, reasons, and facts are read-only.
- Use the 12 approved active Event Types and their approved four-level paths as the starting
  taxonomy.
- The owner may later add, rename, deactivate, or remove unused types. Never silently reclassify an
  existing event after a taxonomy edit.
- Assign at most one primary Event Type to both NORMAL and LIMITED records.
- The classifier receives only the prepared event record and active taxonomy definitions, never
  the complete article or external knowledge.
- Use `google/gemma-4-12b-qat` for both classifier and safeguard with separate prompts.
- Save a type only when the model returns an exact active leaf and the safeguard accepts it.
- An ambiguous or repeatedly rejected result is `UNCLASSIFIED`; never force the nearest type.
- Permit the initial classifier/safeguard attempt plus at most two corrective attempts. Only
  safeguard rejection triggers corrective classification.
- A technical request, parse, or persistence failure is retryable `FAILED`, not Unclassified.
- A new-type proposal is optional, separate per supporting event, and starts as `PENDING_REVIEW`.
- The workflow never groups proposals or creates, activates, maps, rejects, or approves an official
  Event Type automatically.
- Keep the workflow inactive and owner-started.
- Database migration application, workflow edit, pilot execution, full execution, proposal review
  mutation, and any later publication each require a separate explicit owner approval.
- Do not commit changes unless the owner explicitly asks for a commit.

## Files and responsibilities

- Create `supabase/tests/phase5b_event_type_classification.sql`: rollback-only schema, routing,
  retry, proposal, and upstream immutability contract.
- Create `supabase/migrations/20260910161039_phase5b_event_type_classification.sql`: taxonomy
  reference tables, latest classifications, append-only history, proposals, constraints, indexes,
  RLS, comments, and the 5B pending view.
- Create `tools/n8n/phase5b-event-type-classification.mjs`: pure prompt, parser, exact-match,
  safeguard, retry, and finalization functions.
- Create `tools/tests/phase5b-event-type-classification.test.mjs`: focused behavior and
  no-inference tests.
- Modify the existing n8n workflow only after separate approval: add one connected 5B canvas group
  without creating another workflow.
- Modify `.n8n-backups/20260910/terra-space-phase5-generate-and-qualify-events.json`: credential-free
  recovery export aligned to the accepted inactive workflow.
- Modify Project Knowledge only after observed checkpoints materially change the continuation point.

---

### Task 1: Freeze the 5A and upstream baseline, then write the failing 5B database contract

**Files:**

- Create: `supabase/tests/phase5b_event_type_classification.sql`
- Read: `supabase/migrations/202609100001_phase5a_event_records.sql`
- Read: `supabase/seed/20260810_phase3_reference_data.sql`

**Interfaces:**

- Consumes: the verified 109-record Phase 5A baseline and protected Phase 1-4 tables.
- Produces: a rollback-only executable specification for the additive 5B database contract.

- [x] **Step 1: Record the read-only baseline.**

  Record counts and full-row fingerprints for all eight protected Phase 1-4 latest/history tables
  and both Phase 5A tables. Confirm Phase 5A has 109 latest rows, 109 history rows, 43 NORMAL,
  66 LIMITED, zero FAILED, and zero pending. Hash article-containing rows inside PostgreSQL; do not
  print article text.

- [x] **Step 2: Write the transaction-wrapped contract skeleton.**

  Start with `begin;`, create temporary expected-baseline tables, use only rollback-contained test
  writes, and finish with `rollback;`. The first red assertion requires these missing objects:

  ```sql
  public.terra_space_phase5_event_types
  public.terra_space_phase5_taxonomy_nodes
  public.terra_space_phase5_event_type_classifications
  public.terra_space_phase5_event_type_classification_runs
  public.terra_space_phase5_event_type_proposals
  public.terra_space_phase5_pending_event_type_classifications
  ```

- [x] **Step 3: Add exact contract assertions.**

  The rollback-only test must assert:

  - exactly 12 seeded active Event Types with nonblank descriptions and the stable approved IDs;
  - exactly 33 taxonomy nodes: 3 domains, 6 categories, 12 subcategories, and 12 leaf types;
  - only an active leaf can be assigned;
  - one latest classification per Phase 5A event;
  - `CLASSIFIED` requires an Event Type, `AI_ASSIGNED`, safeguard `ACCEPT`, and a nonblank reason;
  - `UNCLASSIFIED` requires a null Event Type and a nonblank reason;
  - `FAILED` requires a null Event Type and a nonblank technical error;
  - corrective retry count is only 0, 1, or 2;
  - a latest FAILED row remains pending while CLASSIFIED and UNCLASSIFIED rows do not;
  - history retains every completed processing attempt and unique submission key;
  - proposals belong to one supporting event, default to `PENDING_REVIEW`, and cannot impersonate
    an official active type by normalized name;
  - a used Event Type cannot be deleted through foreign-key behavior;
  - Phase 1-4 and Phase 5A counts and fingerprints remain unchanged before rollback.

- [x] **Step 4: Run the test and verify the intended red failure.**

  ```powershell
  Get-Content -Raw .\supabase\tests\phase5b_event_type_classification.sql |
    docker exec -i supabase_db_local-supabase psql -U postgres -d postgres -v ON_ERROR_STOP=1
  ```

  Expected: failure because the first Phase 5B table does not exist. Recalculate the protected
  baseline after the failed run and confirm it is unchanged.

- [x] **Step 5: Stop before creating the migration.**

  Report the recorded baseline and red-test result. Obtain explicit owner approval before Task 2.

---

### Task 2: Create and apply the additive Phase 5B Supabase contract

**Files:**

- Create: `supabase/migrations/20260910161039_phase5b_event_type_classification.sql`
- Create: `supabase/migrations/20260910161832_phase5b_api_hardening.sql`
- Test: `supabase/tests/phase5b_event_type_classification.sql`

**Interfaces:**

- Consumes: the 12 approved stable Event Type IDs, approved tree paths, and prepared Phase 5A rows.
- Produces: authoritative active-type input, latest/history classifications, proposals, and pending
  5B input.

- [x] **Step 1: Verify that the Phase 5B migration version is unused.**

  Check both `supabase/migrations/` and local `supabase_migrations.schema_migrations`. If the number
  is already used, stop and choose the next unused timestamp; never rename an applied migration.

- [x] **Step 2: Create the Event Type and taxonomy-node tables.**

  Use `terra_space_phase5_event_types` for stable leaf definitions and
  `terra_space_phase5_taxonomy_nodes` for the four-level tree. Preserve the approved IDs from
  `supabase/seed/20260810_phase3_reference_data.sql`. Enforce case-insensitive unique names,
  nonblank descriptions for active types, valid node levels (`domain`, `category`, `subcategory`,
  `event_type`), root-only domains, parent references, and leaf-only Event Type references.

- [x] **Step 3: Seed the exact approved 12 leaves and 33-node tree.**

  Use `insert ... on conflict do nothing` with explicit IDs. The 12 exact leaf names are:

  ```text
  Security Statement / Threat
  Military Mobilization
  Armed Operation / Strike
  Armed Conflict Escalation
  Diplomatic Statement
  Negotiation / Mediation
  Diplomatic Agreement
  Diplomatic Rupture / Coercion
  Economic / Energy Policy Signal
  Sanctions / Trade Restrictions
  Economic / Energy Agreement
  Supply / Energy Infrastructure Disruption
  ```

  Copy approved descriptions and paths; do not generate new wording.

- [x] **Step 4: Create latest and append-only classification tables.**

  Both store the complete 5B snapshot. The latest table has one unique
  `phase5_event_record_id`; the history table uses `run_id bigint generated always as identity`
  and unique `submission_key uuid`. Store nullable Event Type ID/name snapshot, status,
  assignment source, classification reason, safeguard status/reason, retry count, model and prompt
  versions, `attempt_trace jsonb`, error, and processed time.

  Enforce these route rules:

  ```text
  CLASSIFIED   => event_type_id present, assignment_source AI_ASSIGNED,
                  safeguard_status ACCEPT, error null
  UNCLASSIFIED => event_type_id null, assignment_source null, reason present, error null
  FAILED       => event_type_id null, assignment_source null, error present
  ```

- [x] **Step 5: Create the proposal table.**

  Store one proposal per supporting Phase 5A event with name, description, reason,
  `possible_overlap`, `supporting_evidence`, review status, optional mapped Event Type, review
  reason, reviewed time, and audit timestamps. Default to `PENDING_REVIEW`. Constrain review states
  to `PENDING_REVIEW`, `APPROVED`, `MAPPED_TO_EXISTING`, and `REJECTED`; require a mapped active
  type only for `MAPPED_TO_EXISTING`.

- [x] **Step 6: Create the retry-aware pending view.**

  Join prepared Phase 5A rows to the latest 5B result and return every bounded field plus the
  active taxonomy as separate query input. Include a Phase 5A row when no latest 5B result exists
  or its latest status is `FAILED`. Exclude no record merely because its event path is LIMITED.

- [x] **Step 7: Add indexes, updated-at triggers, RLS, and plain-language comments.**

  Index processing time, classification status, Event Type identity, proposal review status, and
  upstream identities. Enable RLS on all five Phase 5B tables without adding anonymous policies.
  Add comments to every table and column. Do not add any Phase 1-4 or Phase 5A update trigger.

- [x] **Step 8: Request explicit approval before applying the migration.**

  State the exact new tables, view, 12 reference rows, 33 taxonomy rows, constraints, indexes,
  triggers, and RLS. State that the migration updates or deletes no Phase 1-5A row.

- [x] **Step 9: Apply only the approved migration and run the contract.**

  After approval, apply/register `20260910161039`, run the rollback-only contract, confirm 109 pending
  5B inputs, zero classification/history/proposal rows, and exact protected fingerprints.

- [x] **Step 10: Stop before transformer implementation.**

  Report the observed schema and contract result. Do not create or call any model node yet.

- [x] **Step 11: Apply the owner-approved Phase 5B API hardening follow-up.**

  Revoke direct table/view privileges from `anon` and `authenticated` for only the new Phase 5B
  objects, preserve backend/n8n access, and add the proposal `mapped_event_type_id` index identified
  by the Supabase advisor. Do not change Phase 1-5A permissions or data.

- [x] **Step 12: Re-run the contract and advisor review, then stop again.**

  Confirm the strengthened rollback-only contract passes, direct API privileges are absent, the
  missing-index notice is resolved, 109 inputs remain pending, and zero 5B result rows exist.

---

### Task 3: Implement the pure Phase 5B prompt, parser, safeguard, and retry policy

**Files:**

- Create: `tools/n8n/phase5b-event-type-classification.mjs`
- Create: `tools/tests/phase5b-event-type-classification.test.mjs`

**Interfaces:**

- Consumes: one pending 5B event, 12 active type definitions, classifier output, and safeguard
  output.
- Produces: deterministic prompts and one valid CLASSIFIED, UNCLASSIFIED, or FAILED persistence
  payload with an optional PENDING_REVIEW proposal.

- [x] **Step 1: Write failing prompt-boundary tests.**

  Assert that `buildClassifierPrompt(event, activeTypes, feedback)` contains only prepared event
  fields, all exact active type names/descriptions/paths, the optional prior safeguard feedback,
  and explicit no-outside-knowledge/no-forced-match rules. Assert it does not contain full article
  text or another candidate.

- [x] **Step 2: Write failing exact-output parser tests.**

  `parseClassifierOutput(raw, activeTypes, event)` accepts only this shape. The event argument is
  required so proposal evidence can be checked against the prepared event evidence:

  ```json
  {
    "selected_event_type": "Military Mobilization",
    "classification_reason": "The evidence describes a military deployment and readiness action.",
    "new_type_proposal": null
  }
  ```

  `selected_event_type` may be null. Match approved names after trimming surrounding whitespace and
  normalizing letter case, then restore the official stored name. Reject unknown names, blank
  reasons, arrays, extra top-level fields, malformed JSON, and a proposal paired with a selected
  approved type.

- [x] **Step 3: Write failing optional-proposal tests.**

  A proposal is allowed only when `selected_event_type` is null and must contain exactly:

  ```json
  {
    "name": "Proposed name",
    "description": "When this type should be used.",
    "reason": "Why none of the approved definitions fits.",
    "possible_overlap": "Closest approved type and the material difference, or none.",
    "supporting_evidence": "An exact event evidence excerpt."
  }
  ```

  Reject a proposal whose normalized name matches an active type, whose supporting evidence is not
  contained in the prepared event evidence, or whose required field is blank.

- [x] **Step 4: Write failing safeguard tests.**

  `buildSafeguardPrompt(event, activeTypes, parsedClassification)` independently presents the
  evidence, definitions, and proposed result. `parseSafeguardOutput(raw)` accepts only:

  ```json
  {"decision":"ACCEPT","reason":null}
  ```

  or a `REJECT` with a concrete nonblank reason. The safeguard cannot return or substitute an Event
  Type.

- [x] **Step 5: Write failing retry/finalization tests.**

  `applySafeguardDecision(state, decision)` must:

  - finalize accepted exact matches as `CLASSIFIED + AI_ASSIGNED`;
  - finalize accepted null matches as `UNCLASSIFIED`;
  - retain an accepted optional proposal as `PENDING_REVIEW`;
  - request correction at retry counts 0 and 1;
  - finalize `UNCLASSIFIED` when retry count 2 is rejected;
  - discard proposals from rejected attempts;
  - preserve the full three-attempt trace;
  - produce retryable `FAILED` for request/parser errors without inventing a semantic reason.

- [x] **Step 6: Implement the minimum pure functions.**

  Export these exact interfaces:

  ```javascript
  export function buildClassifierPrompt(event, activeTypes, feedback = null) {}
  export function parseClassifierOutput(raw, activeTypes, event) {}
  export function buildSafeguardPrompt(event, activeTypes, classification) {}
  export function parseSafeguardOutput(raw) {}
  export function applySafeguardDecision(state, decision) {}
  export function prepareTechnicalFailure(event, metadata, error) {}
  ```

  Use strict allowlists and plain JSON parsing. Do not use fuzzy type matching, keyword fallback,
  external APIs, or inferred event facts.

- [x] **Step 7: Run focused tests and the complete JavaScript suite.**

  ```powershell
  node --test .\tools\tests\phase5b-event-type-classification.test.mjs
  node --test .\tools\tests\*.test.mjs
  ```

  Expected: all focused tests and the existing 88 tests pass.

- [x] **Step 8: Stop before changing n8n.**

  Report the exact tested behavior and obtain separate approval for Task 4.

---

### Task 4: Add Phase 5B to the existing inactive Phase 5 workflow

**Files:**

- Modify in n8n: workflow `FAxBx6a9fnXjLfVO`
- Modify: `.n8n-backups/20260910/terra-space-phase5-generate-and-qualify-events.json`

**Interfaces:**

- Consumes: completed 5A records, active taxonomy, and tested pure 5B functions.
- Produces: one latest classification and one append-only run per processed 5B event, plus an
  optional proposal.

- [x] **Step 1: Request explicit approval for the workflow edit.**

  Explain that the edit adds one 5B group to the same inactive workflow, makes no execution, and
  creates no 5C-5E node.

- [x] **Step 2: Add a safe transition from 5A to 5B.**

  Add a deterministic zero-input pass-through so 5B can start when 5A already has no pending rows,
  while preserving normal one-at-a-time 5A processing for future new inputs. Do not create a second
  Manual Trigger or a parallel race between 5A and 5B.

- [x] **Step 3: Add the connected Phase 5B node group.**

  Use this logical topology:

  ```text
  Phase 5A complete
  -> Get Pending Phase 5B Events
  -> Get Active Event Types
  -> Process One Phase 5B Event at a Time
  -> Prepare Classification Attempt
  -> Build Classifier Prompt
  -> Classify Event Type (LM Studio)
  -> Parse Classifier Output
  -> Build Safeguard Prompt
  -> Safeguard Event Type (LM Studio)
  -> Apply Safeguard Decision
     -> accepted/final rejection: persist latest -> append history -> optional proposal -> loop
     -> corrective retry: return to Build Classifier Prompt
     -> technical failure: persist FAILED -> append history -> loop
  ```

- [x] **Step 4: Configure both local model requests.**

  Use `http://host.docker.internal:1234/v1/chat/completions`, model
  `google/gemma-4-12b-qat`, temperature `0.1`, `reasoning_effort: none`, JSON-only prompts, a
  180-second timeout, and node-level retry for transient HTTP transport errors. Join both success
  and error outputs into deterministic parsing/failure handling.

- [x] **Step 5: Install the tested logic without behavioral drift.**

  Adapt only the n8n wrapper around the tested functions. Keep exact type matching, proposal
  validation, safeguard decision rules, retry limit, and failure semantics equivalent to the local
  module.

- [x] **Step 6: Configure idempotent persistence.**

  Create a latest row only when none exists; update only an exact latest FAILED row on retry. Never
  overwrite CLASSIFIED or UNCLASSIFIED automatically. Always append one processing-run snapshot
  after the latest write. Create/update a PENDING_REVIEW proposal only from an accepted final
  Unclassified result; never overwrite a reviewed proposal.

- [x] **Step 7: Validate without executing.**

  Confirm the workflow is inactive, remains in `Terra_Space`, has one Manual Trigger, processes one
  5B event at a time, limits corrective retries to two, contains no external/cloud model, has no
  Phase 1-5A write, and has no 5C-5E, merge, application, final-event, or publication node.

- [x] **Step 8: Update and inspect the credential-free recovery export.**

  Remove credential references from the local JSON backup, confirm it is inactive, and verify its
  node count/topology matches the live workflow.

- [x] **Step 9: Stop before selecting or running a pilot.**

  Report validation results. No model call or classification row may exist yet.

---

### Task 5: Select and prepare a controlled Phase 5B pilot

**Files:**

- Modify only after owner approval: the existing 5B Supabase read-node filter
- Modify only after observed results: Project Knowledge continuation files

**Interfaces:**

- Consumes: validated inactive 5B workflow and read-only Phase 5A events.
- Produces: an exact owner-reviewed pilot set and expected review questions.

- [x] **Step 1: Select 12 pilot identities read-only.**

  Choose candidates that collectively cover all three domains, NORMAL and LIMITED paths, clear
  type definitions, plausible overlap, no obvious approved match, populated and empty facts, and
  at least one event likely to expose a useful taxonomy proposal. Show sequence, candidate ID,
  Phase 5A ID, title, path, and expected review purpose. Do not pre-label uncertain results as
  ground truth.

  The selected review set is intentionally a set of hypotheses, not pre-assigned ground truth:

  | Seq. | Candidate | Phase 5A ID | Path | Review purpose |
  |---:|---|---|---|---|
  | 48 | c1 | `dd44b687-29dc-4ed9-ac56-1a9d50caed51` | NORMAL | Agreement wording outside the obvious economy/energy boundary |
  | 53 | c1 | `78c508aa-7c72-448c-bdc4-20a3d4d32c7c` | LIMITED | Armed strike with energy-infrastructure overlap and omitted date |
  | 59 | c1 | `669f6951-8e6d-4704-b39d-3b8b7c3a592e` | NORMAL | Economic damage estimate with no actors or locations and possibly no approved match |
  | 60 | c2 | `f3f2bf84-8997-463d-8466-9c426b1f5f90` | LIMITED | Physical energy-infrastructure disruption with sparse facts |
  | 62 | c1 | `86f6a533-56e8-4923-8850-1921b3cf5177` | NORMAL | Clear armed-action candidate with populated facts |
  | 66 | c1 | `b7c6cda3-2b56-4cbc-8004-fef3b33da2fa` | LIMITED | Reduced military exercise at the mobilization boundary |
  | 67 | c1 | `8313c97e-b609-4ee7-b587-59d8ef5123ec` | NORMAL | Trade suspension with populated actors and location |
  | 72 | c1 | `ff335739-2d24-4793-a088-62967904afe6` | LIMITED | Threat/statement boundary with inherited review status |
  | 98 | c1 | `598a0c69-a20a-42ed-972b-f80c0b8506d6` | NORMAL | Planned talks with complete date, actors, and location |
  | 98 | c3 | `46e75e35-a7ee-488a-bed9-74cfc402376c` | NORMAL | Diplomatic closure/coercion candidate |
  | 107 | c1 | `fd62d1ac-5d04-480f-a88f-33003e72b52c` | NORMAL | Ceasefire readiness across statement, negotiation, and agreement boundaries |
  | 115 | c1 | `45124e1d-b824-4e05-be15-5d5aee75da30` | NORMAL | Security/diplomatic statement boundary with empty actor and location arrays |

- [x] **Step 2: Add only a temporary exact-ID pilot filter.**

  Restrict the 5B pending read to those 12 Phase 5A IDs. Do not modify taxonomy eligibility,
  classifier prompts, or retry policy.

- [x] **Step 3: Revalidate and request explicit pilot approval.**

  State that the pilot may make between 24 and 72 local model calls, depending on safeguard
  acceptance, and will create at most 12 latest rows, 12 history rows, and one optional proposal
  per final Unclassified event. It modifies no Phase 1-5A row and publishes nothing.

---

### Task 6: Execute, audit, and accept the controlled Phase 5B pilot

**Files:**

- Modify after observed results: `project-knowledge/Current-Status.md`
- Modify after observed results: `project-knowledge/Project-Knowledge-Log.md`
- Modify after acceptance: this plan's task checkboxes

**Interfaces:**

- Consumes: separate explicit approval for the exact 12-event pilot.
- Produces: manually reviewed classifications and a go/no-go decision for the remaining baseline.

**Owner acceptance:** Accepted on 11 September 2026. Task 7 still requires separate explicit
approval before the pilot filter is removed or any of the remaining 97 records are processed.

- [x] **Step 1: Execute the inactive workflow once and capture the n8n execution ID.**

  Do not activate or publish the workflow. If LM Studio is unavailable, stop with the technical
  failure evidence; do not change model or output data silently.

- [x] **Step 2: Audit every pilot result.**

  For all 12 records, compare title/description/evidence/facts/path to Phase 5A, inspect selected
  definition and classification reason, inspect every safeguard decision, confirm retry counts and
  feedback flow, and review every proposal. Confirm that rejected attempts never leave a selected
  type or proposal in the latest accepted result.

- [x] **Step 3: Verify persistence and immutability.**

  Confirm 12 unique latest identities unless a technical failure is explicitly retryable, one
  history snapshot per processed event attempt, no duplicate submission key, proposal isolation,
  exact active type references, and unchanged Phase 1-5A fingerprints.

- [x] **Step 4: Repair only systemic behavior through a separately reviewed change.**

  If the pilot exposes a prompt/parser/policy defect, stop, write a failing regression test, propose
  the narrow correction, obtain approval if it changes the workflow or data, and rerun only the
  affected pilot identities. Never manually overwrite an AI assignment to make the pilot appear
  successful.

- [x] **Step 5: Stop for production-readiness review.**

  Report each classification, Unclassified result, retry, proposal, failure, and discrepancy. Keep
  the pilot filter installed until the owner accepts the pilot and separately approves the full run.

---

### Task 7: Complete Phase 5B after separate full-run approval

**Files:**

- Modify: existing Phase 5 workflow 5B pending read filter only
- Modify: `.n8n-backups/20260910/terra-space-phase5-generate-and-qualify-events.json`
- Modify: `project-knowledge/Current-Status.md`
- Modify: `project-knowledge/Project-Knowledge-Log.md`
- Modify: `project-knowledge/Roadmap.md` only after the 5B milestone is accepted
- Modify: `project-knowledge/plans/2026-09-10-phase-5b-event-type-classification.md`

**Interfaces:**

- Consumes: accepted pilot and separate owner approval for the exact remaining pending count.
- Produces: a verified complete 5B baseline and a mandatory stop before 5C design.

- [x] **Step 1: Remove only the temporary pilot filter and revalidate.**

  Confirm the workflow remains inactive and report the exact remaining pending count and maximum
  local model-call range.

- [x] **Step 2: Request explicit approval for the remaining run.**

  State the maximum latest/history/proposal writes, that model calls are local, that upstream data
  is read-only, and that no event becomes final or visible in Terra Space yet.

- [x] **Step 3: Execute once and verify the complete baseline.**

  Confirm 109 latest Phase 5B identities total unless explicitly retryable FAILED rows remain.
  Verify exact Event Type references, status-route constraints, retry limits, complete history,
  optional proposal isolation, zero automatic taxonomy expansion, and unchanged Phase 1-5A
  fingerprints.

  Execution `2147` attempted all 97 remaining inputs and finished successfully at the workflow
  level. Baseline verification is intentionally incomplete because five records remain retryable
  `FAILED` with the same exact-evidence boundary error.

  Read-only diagnosis found a systemic chain: four failures began with exact-evidence proposals
  that the safeguard rejected because its prompt did not clearly permit proposal review, then a
  corrective classifier attempt paraphrased the evidence; the fifth paraphrased immediately. All
  32 safeguard-rejected Unclassified results exhausted three attempts, and 19 final reasons
  explicitly treated a proposal as forbidden or invalid merely because no active type was selected.
  Stop for owner approval before changing the safeguard prompt or proposal-evidence handling.

  The owner approved the narrow repair. A red-green TDD cycle added deterministic attachment of the
  complete bounded evidence and explicit safeguard review modes. Four Phase 5B Code nodes now use
  classifier/safeguard prompt version `v2`; 123/123 JavaScript tests and live n8n validation pass.
  No execution or database write followed the workflow edit. The pending view directly exposes only
  the 5 FAILED identities. A separate destructive-data approval is required to remove exactly the
  32 rejected latest rows while retaining their history, followed by separate approval to execute
  the resulting exact 37-record queue.

  The owner approved this data step. A guarded transaction confirmed exactly 32 targets, preserved
  history for all 32, and zero linked proposals before deleting only those latest rows. All 159
  history rows and 10 proposals remain. The pending view now exposes exactly 37 inputs: 32 without
  latest rows and 5 FAILED retries. No workflow execution followed the deletion.

  The owner then separately approved execution `2148`. It processed exactly 37 inputs and produced
  the complete 109-row baseline: 56 CLASSIFIED, 53 UNCLASSIFIED, zero FAILED, zero pending, and
  safeguard ACCEPT on all latest results. Verification found 196 unique history rows, 40 isolated
  PENDING_REVIEW proposals, no duplicate identity or submission key, no invalid active-type
  reference, and no protected Phase 1-5A fingerprint change. Stop for owner taxonomy review before
  final acceptance or Phase 5C.

- [x] **Step 4: Review all Unclassified results and proposals directly in the database.**

  Use read-only queries to group counts by selected type, status, path, retry count, and safeguard
  outcome. List every Unclassified event and every PENDING_REVIEW proposal for owner review. Do not
  approve, map, reject, create, activate, or reprocess any proposal without a new explicit owner
  decision.

- [ ] **Step 5: Run final verification.**

  ```powershell
  node --test .\tools\tests\*.test.mjs
  Get-Content -Raw .\supabase\tests\phase5b_event_type_classification.sql |
    docker exec -i supabase_db_local-supabase psql -U postgres -d postgres -v ON_ERROR_STOP=1
  powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1
  ```

  Expected: all tests pass, workflow runtime validation has zero errors and warnings, and Project
  Knowledge validation has zero errors and warnings.

- [ ] **Step 6: Record observed results and stop before Phase 5C.**

  Keep the workflow inactive. Mark Phase 5B complete only after the owner accepts the complete
  baseline. Do not design or implement timeline/geography work in this plan.

## Plan self-review

- **Spec coverage:** Tasks cover the approved 12-type reference data, one primary type, NORMAL and
  LIMITED classification, bounded input, separate classifier and safeguard prompts, two corrective
  attempts, exact active-leaf enforcement, visible Unclassified outcomes, retryable technical
  failure, optional isolated proposals, database review authority, idempotent latest/history
  storage, one shared workflow, pilot/full-run gates, and mandatory stop before 5C.
- **Scope control:** No coordinate, timeline, actor-normalization, duplicate, qualification,
  application visibility, merge, or publication work is included.
- **Type consistency:** `CLASSIFIED`, `UNCLASSIFIED`, `FAILED`, `AI_ASSIGNED`, `ACCEPT`, `REJECT`,
  and the four proposal review states retain one meaning across SQL, JavaScript, n8n, and review.
- **Safety:** Every durable database/workflow/data-run boundary has its own owner approval gate;
  protected upstream fingerprints are checked after migration, pilot, repair, and full run.
- **No placeholders:** Every file, function interface, model setting, output JSON shape, retry limit,
  status route, pilot scope, and verification command is explicit.

# Navigation

- [Phase 5B Event Type Classification](../decisions/Phase-5B-Event-Type-Classification.md)
- [Phase 5 Event Generation and Qualification](../decisions/Phase-5-Conservative-Event-Drafts.md)
- [Phase 5A implementation plan](2026-09-10-phase-5a-prepare-event-records.md)
- [Project Knowledge](../Project-knowledge-Index.md)
