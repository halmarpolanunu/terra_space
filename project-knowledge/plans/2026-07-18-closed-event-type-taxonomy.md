---
type: Implementation Plan
title: Closed Event Type Taxonomy Implementation Plan
description: Prevent local AI from suggesting event types and keep unmatched extracted events untyped for human review.
tags: [event-types, extraction, lm-studio, terra-sense]
status: in-progress
okf_version: "0.1"
---

# Closed Event Type Taxonomy Implementation Plan

> **For agentic workers:** Use test-first development. This replaces AI event-type suggestion; it does not remove owner-managed Event Types or manual Event Review selection.

**Goal:** AI extraction selects only an active Event Type or leaves it blank.

**Architecture:** Simplify the extraction schema to one optional `existing` type name. The LM Studio prompt permits only exact active names or `null`; persistence accepts only exact active matches and never creates an Event Type from extraction output. Existing events remain untouched.

**Tech Stack:** Python, FastAPI, SQLAlchemy, Pydantic, pytest, Next.js/React, Vitest.

## Global Constraints

- No AI-suggested Event Type or description may be created, saved, or displayed.
- An unmatched event is saved as a draft with `event_type_id = null`.
- Event Review keeps manual selection of an owner-managed active type.
- Existing records and owner-created types are not rewritten automatically.

### Task 1: Close the extraction contract and persistence path

**Files:**
- Modify: `backend/app/schemas/extraction.py`, `backend/app/services/lm_studio.py`, `backend/app/services/extraction.py`
- Modify: `backend/tests/test_lm_studio_extraction.py`, `backend/tests/test_extraction_validation.py`, `backend/tests/test_event_types_actors_api.py`

- [x] Write failing tests that require the LM Studio schema to expose only `event_type.existing`, the prompt to require an exact active type or null, and an extraction payload containing an unknown type to save the event with no type while creating no `EventType` row.
- [x] Run the focused backend suite and confirm it fails for the prior suggestion behavior.
- [x] Remove `suggested` and `suggested_description` from `ExtractedEventType`; change the prompt to say: `Use an exact supplied active event type name only when it fits. Otherwise set existing to null. Never invent, suggest, or describe a new event type.`
- [x] In `persist_extraction`, look up only `event_data.event_type.existing` among active types. Assign a matching active record; otherwise leave `event_type=None`. Do not instantiate `EventType`.
- [x] Update obsolete suggestion tests to assert the new blank-type behavior and run the focused suite until it passes.

### Task 2: Keep manual review clear and remove stale suggestion language

**Files:**
- Modify: `frontend/src/app/event-review/event-card.tsx`, `frontend/src/components/event-type-description.tsx`
- Modify: `frontend/tests/event-card.test.tsx`, `frontend/tests/event-type-description.test.tsx`

- [x] Write failing tests that a draft without a type reads `Not stated`, remains editable, and has no `Suggested` label; the manual picker still lists active types.
- [x] Run focused frontend tests and confirm they fail for the prior suggestion wording.
- [x] Remove suggestion-specific display text and make blank type guidance say that the reviewer should select an active Event Type when appropriate.
- [x] Run focused frontend tests, then the full frontend tests, lint, full backend tests, and production build; all pass.

### Task 3: Verify the owner workflow and record completion

**Files:**
- Modify: `tests/e2e/event-review.spec.ts`, `project-knowledge/Current-Status.md`, `project-knowledge/Project-Knowledge-Log.md`

- [x] Add an E2E scenario whose local LM Studio stub returns `{"event_type":{"existing":null}}`; assert the resulting draft appears in Event Review as untyped, can be manually assigned, and can be approved.
- [ ] Run the focused E2E scenario and confirm no new Event Type is created. It is intentionally deferred because the existing runner resets its Docker database and must first be isolated from owner data.
- [x] Update Current Status and the Project Knowledge Log with verification results, and run `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1`.

## Acceptance checks

- The local AI receives active types but cannot suggest any new one.
- Unknown/unsupported type output creates no taxonomy row and results in a blank draft type.
- The owner can assign an active type during Event Review.
- Existing historical events and Event Types remain intact.

## Navigation

- [Closed Event Type Taxonomy Decision](../decisions/Closed-Event-Type-Taxonomy.md)
- [Project Knowledge](../Project-knowledge-Index.md)
