---
type: Implementation Plan
title: Phase 3 Event Records Implementation Plan
description: Build a new n8n workflow and Supabase storage that turn the latest grounded Phase 2 candidates into automatically finalized or withheld event records.
tags: [project-knowledge, plan, n8n, supabase, event-records]
status: in-progress
---

# Phase 3 Event Records Implementation Plan

**Goal:** Build a separate, testable n8n Phase 3 workflow that converts the latest Phase 2 candidates for one article into final guarded event records.

**Architecture:** `Terra Space - Event Records` reads one Phase 1 UUID, retrieves its latest Phase 2 candidate array, then processes candidates sequentially. Each candidate uses factual enrichment, deterministic field grounding, local coordinate resolution, closed-taxonomy classification, and an independent local-LLM safeguard. The workflow retries the complete candidate pipeline once before saving an exception.

**Tech stack:** n8n Code, HTTP Request, Chat Trigger, and Supabase nodes; local LM Studio OpenAI-compatible endpoint; local Supabase/Postgres; existing GeoNames-based gazetteer asset.

## Global constraints

- Do not modify `terra_space_news_v2`, `terra_space_event_candidates`, or `terra_space_event_candidate_runs`.
- Use `google/gemma-4-12b-qat` for all three local LLM calls.
- All LLM factual fields require field-level exact evidence grounding against `p1_clean_content_text`.
- Coordinates are deterministic local-gazetteer outputs only; the LLM never returns latitude or longitude.
- A type must be an active leaf in `terra_space_event_types`; otherwise use `UNCLASSIFIED` or `FAILED`.
- Each candidate gets at most two complete attempts. A final record appears only when deterministic checks pass and the verifier returns `ACCEPT`.
- Durable project documentation stays under `project-knowledge/`.

---

### Task 1: Create the Phase 3 storage contract and taxonomy source

**Files:**
- Modify: `project-knowledge/decisions/Automated-Final-Event-Record-Pipeline.md` only if implementation reveals a design contradiction.
- Test: Supabase read-only schema and seed queries.

**Produces:**
- `terra_space_event_types` with one active, closed-taxonomy leaf per row.
- `terra_space_event_records` with one row per deterministic candidate key.
- `terra_space_event_record_runs` with one append-only row per attempt.

- [ ] Create `terra_space_event_types` with `event_type_id uuid primary key`, `domain_name`, `category_name`, `subcategory_name`, `event_type_name`, `event_type_description`, `is_active`, timestamps, and a unique `event_type_name`.
- [ ] Seed the twelve active leaf names in [Event Taxonomy Tree and Management](../decisions/Event-Taxonomy-Tree-and-Management.md), including their four-level parent paths.
- [ ] Create `terra_space_event_records` with: `candidate_key text unique`, `p1_news_uuid uuid`, `candidate jsonb`, `event_record jsonb`, `pipeline_outcome` constrained to `FINAL|EXCEPTION`, `taxonomy_status`, nullable `event_type_id`, `safeguard_status`, `attempts_used`, raw outputs, `error_message`, and timestamps.
- [ ] Create `terra_space_event_record_runs` with the candidate identity, `attempt_number`, stage statuses, complete intermediate/final JSON, raw outputs, safeguard decision/reasons, and timestamps.
- [ ] Verify foreign keys point only to Phase 1 and the taxonomy leaf table; verify the existing Phase 1/2 tables are unchanged.

### Task 2: Make the local gazetteer available to the workflow

**Files:**
- Read: `backend/app/data/location-gazetteer.json` and `backend/app/services/locations.py`.
- Test: exact city, admin1, country, and no-match location cases.

**Produces:**
- A workflow-callable resolver returning `{latitude, longitude, coordinate_precision, coordinate_status}` for grounded ISO alpha-3 location objects.

- [ ] Reuse the existing key rules exactly: ISO alpha-3 country required; exact city then admin1 then country; no fuzzy matching.
- [ ] Import the existing local gazetteer into a dedicated Supabase lookup table or expose it through a local-only resolver endpoint reachable from n8n. The chosen path must not send locations to a cloud service.
- [ ] Test `IDN/Jakarta` resolves at city precision, an exact admin1 resolves at admin1 precision, an exact country resolves at country precision, and an unmatched spelling returns `UNRESOLVED` with null coordinates.

### Task 3: Build the first-attempt candidate pipeline

**Files:**
- Create: n8n workflow `Terra Space - Event Records`.
- Read/reuse: `Terra Space - Event Candidates` (`pO6m1mpaHz2Ae5ZR`) Chat Trigger, UUID parsing, LM Studio HTTP, and Supabase credential patterns.

**Produces:**
- One inactive workflow that accepts a Phase 1 UUID and processes every latest Phase 2 candidate sequentially.

- [ ] Add a Chat Trigger and reuse the UUID validation message: `Paste one valid Phase 1 article UUID as your chat message.`
- [ ] Read the Phase 1 source and latest `terra_space_event_candidates` row; reject missing articles, no candidates, and ungrounded candidates.
- [ ] Split `event_candidates` into individual items and set `candidate_key` to `${p1_uuid}:${evidence_start}:${evidence_end}`.
- [ ] Build factual-enrichment request JSON. Require source/target actor arrays, date object, locations array, epistemic status, and one evidence quote per populated field.
- [ ] Call LM Studio with timeout 180 seconds, temperature 0.1, JSON-only response, and `onError: continueErrorOutput`.
- [ ] Parse JSON, remove only optional Markdown JSON fences, validate every returned field quote with `source_text.indexOf(quote)`, and preserve null/unknown rather than infer a value.
- [ ] Resolve only grounded locations with the local resolver.
- [ ] Query active taxonomy leaves, build the classification request, call LM Studio, and accept only an exact active leaf ID/name or `UNCLASSIFIED`.
- [ ] Build the safeguard request from the original source, Phase 2 candidate, factual result, taxonomy result, and validation facts; require `{decision: ACCEPT|REJECT, reasons: string[]}`.
- [ ] Write an append-only first-attempt run row before deciding the final/exception outcome.

### Task 4: Add retry, final/latest persistence, and exception behavior

**Files:**
- Modify: n8n workflow `Terra Space - Event Records`.
- Test: accepted first attempt, accepted second attempt, and rejected twice.

**Produces:**
- A maximum-two-attempt, fail-closed finalization rule.

- [ ] Route any failed stage or safeguard rejection into exactly one full repeat of the candidate pipeline with `attempt_number = 2`.
- [ ] After the second attempt, save `FINAL` only when all deterministic checks and the safeguard pass; otherwise save `EXCEPTION`.
- [ ] Upsert `terra_space_event_records` by `candidate_key`, while preserving all attempts in `terra_space_event_record_runs`.
- [ ] Store the failed/rejected stage, raw outputs, verifier reasons, and error message in exception rows.
- [ ] Confirm rerunning the article UUID updates each latest candidate record but never deletes run-history rows.

### Task 5: Validate and run real Phase 3 tests

**Files:**
- Modify: `project-knowledge/Current-Status.md`, `project-knowledge/Project-Knowledge-Log.md`, and the Phase 3 Notion documentation after verified results exist.

**Produces:**
- Validated workflow, observed real output, and durable documentation.

- [ ] Validate the workflow in n8n runtime and strict profiles with zero errors before live testing.
- [ ] Run one known Phase 1 UUID with candidates, then inspect final/latest and run-history rows.
- [ ] Verify every final factual field quote is found exactly in the Phase 1 cleaned text.
- [ ] Verify the chosen Event Type leaf is active or classification is `UNCLASSIFIED`.
- [ ] Verify `FINAL` rows only appear after safeguard `ACCEPT`; verify rejected twice rows are stored as `EXCEPTION` and excluded from the final-result query.
- [ ] Update the continuation point, knowledge log, and Notion page with actual test counts and limitations; run `tools/Validate-ProjectKnowledge.ps1`.

# Self-review

- Coverage: Tasks 1–5 cover storage, local coordinate resolution, all three model calls, field grounding, taxonomy, retry, persistence, test evidence, and documentation.
- Scope: The plan adds a new Phase 3 workflow and tables only; Phase 1 and Phase 2 are read-only inputs.
- Ambiguity resolved: a failure or rejection means a whole second attempt; no candidate receives a third automatic attempt.

# Navigation

- [Automated Final Event Record Pipeline](../decisions/Automated-Final-Event-Record-Pipeline.md)
- [Phase 2 Main-Issue and Event-Candidate Testing Implementation Plan](2026-08-06-phase-2-main-issue-event-candidate-testing-implementation.md)
- [Project Knowledge](../Project-knowledge-Index.md)
