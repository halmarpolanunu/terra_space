---
type: Plan
title: Phase 5E Visibility and Qualification Implementation Plan
description: Checkpointed implementation plan for Phase 5E qualification and read-only Terra Space visibility.
tags: [project-knowledge, phase-5, implementation]
status: draft
---

# Phase 5E Visibility and Qualification Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` task by task. The owner requested GPT-5.6 Terra for execution. Stop at every approval gate below. Do not use subagents unless the owner asks for them.

**Goal:** Show every retained Phase 5 event in Terra Space while marking only evidence-grounded, safeguard-accepted records Final.

**Architecture:** Keep the existing Phase 5A record as the event identity. Add a deterministic final qualification to the *same* inactive n8n workflow and expose its result through the existing read-only Supabase bridge. Keep old event data intact and distinguish the two data sources in the UI.

**Tech stack:** Local Supabase/PostgreSQL, n8n MCP, JavaScript/Node tests, FastAPI/SQLAlchemy, Next.js/TypeScript.

**Spec:** [Phase 5E Visibility and Qualification Design](2026-09-22-phase-5e-visibility-qualification-design.md)

## Global constraints

- One Phase 5A–5E workflow in `Terra_Space`; keep it inactive except during a separately approved pilot.
- Phase 1–4 data/workflows are read-only. No automatic merge, invented fact, type activation, or external publishing.
- All Phase 5A records remain visible even when 5B–5E fail. Final status never conceals limitations or reasons.
- No model call in 5E. Latest result is idempotent; attempts remain in append-only history.
- Each migration, workflow edit, pilot, full run, or activation requires separate explicit owner approval.
- Do not commit unrelated dirty-worktree changes.

## Review focus

1. Phase 3 overall `NEEDS_REVIEW` with its own candidate `VALID`/`VERIFIED`/`ACCEPT` can become Final.
2. Candidate-level `REJECT` or unverified quote stays visible but never Final.
3. Phase 4 optional actor/location/date rejection does not by itself block Final; the fact remains omitted.
4. Missing Phase 5B/5C result or `FAILED` result stays visible and not Final.
5. Old events remain accessible while new Phase 5 records appear; list, detail, map, and timeline agree on identity and counts.

## File responsibilities

- `supabase/migrations/202609220001_phase5e_event_qualification.sql`: latest and append-only run tables, constraints, indexes, RLS/read permissions; no older-table mutations.
- `supabase/tests/phase5e_event_qualification.sql`: rollback-contained database contract and idempotency checks.
- `tools/n8n/phase5e-qualify-event.mjs`: pure deterministic qualification function.
- `tools/tests/phase5e-qualify-event.test.mjs`: qualification matrix and failure isolation.
- `tools/prepare-phase5e-workflow.mjs` and workflow contract test: add 5E nodes to existing workflow only.
- `backend/app/services/phase5_events.py`: read-only Phase 5 projection, separate from the old Phase 3 event query.
- `backend/app/api/routes/supabase_bridge.py` and `backend/app/schemas/phase5_event.py`: new GET-only list/detail contract.
- `frontend/src/lib/bridge-api.ts`, `frontend/src/app/events/events-workspace.tsx`, `frontend/src/app/events/event-detail.tsx`, and Dashboard components: render Phase 5 records with explicit source/status; preserve old-event access.

## Task 1 — Prove the qualification rule without writes

**Approval gate:** Code/tests only. No schema or n8n edit.

- [ ] Add failing table-driven tests in `tools/tests/phase5e-qualify-event.test.mjs` for the five Review Focus cases, plus `UNCLASSIFIED` + accepted safeguard, unknown actual date, unresolved geography, and possible duplicate.
- [ ] Run `node --test tools/tests/phase5e-qualify-event.test.mjs`; confirm the missing function fails.
- [ ] Implement `qualifyEvent(input)` in `tools/n8n/phase5e-qualify-event.mjs`. Match `candidate_id` to exactly one object in Phase 3 `candidates`; Final requires that object's `status === 'VALID'`, `quote_validation_status === 'VERIFIED'`, and `safeguard_status === 'ACCEPT'`, Phase 5A/5C `PREPARED`, and Phase 5B `CLASSIFIED` or accepted `UNCLASSIFIED`. `CLASSIFIED` also requires an active assigned type and accepted safeguard. Otherwise return `NOT_FINAL` with stable reason codes; malformed/missing identity is never Final. Preserve all source fields unchanged.
- [ ] Run focused tests and the complete `node --test tools/tests/*.test.mjs` suite. Present the exact expected Final/Not Final counts for the 109 current records using read-only inputs; stop for owner review.

## Task 2 — Add Phase 5E storage

**Approval gate:** Obtain separate owner approval before creating/applying the migration.

- [ ] Write a rollback-contained SQL contract in `supabase/tests/phase5e_event_qualification.sql`: one latest result per Phase 5A ID, append-only run history, `FINAL`/`NOT_FINAL` only, nonempty reason codes, unique submission key, and no Phase 1–5D fingerprint change. Confirm it fails before the migration.
- [ ] Add the smallest additive migration: `terra_space_phase5_event_qualifications` and `_runs` only; foreign key to Phase 5A, unique latest identity/submission key, append-only run trigger, RLS and appropriate API privilege restrictions. No new generic publication table.
- [ ] After explicit approval, apply via the local Supabase path; rerun SQL contract, inspect tables and protected fingerprints read-only, and stop for review.

## Task 3 — Add 5E to the existing workflow

**Approval gate:** Obtain separate owner approval before any n8n workflow edit.

- [ ] Add a failing workflow-contract test asserting the existing workflow gains only the Phase 5E read/qualify/store branch; the existing 5A–5D nodes and connections remain unchanged and there is no extra workflow, model call, merge, or publish node.
- [ ] Prepare a minimal patch using the established `tools/prepare-phase5d-workflow.mjs` pattern and the pure Task 1 function. Inspect and edit the real workflow through n8n MCP. Keep it inactive.
- [ ] Validate through n8n MCP, run Node tests, compare the before/after workflow structure, and stop for owner review. Do not execute data.

## Task 4 — Show the records in Terra Space

**Approval gate:** Obtain separate owner approval before application/API changes.

- [ ] Add failing backend tests for GET-only Phase 5 list/detail projection: every 5A record appears even with missing later results; Final and Not Final reasons are exposed; actual date and publication-date reference are distinct; old bridge events remain accessible; no write SQL. Test map coordinates only from resolved event geography and Actor Network only from typed actor references.
- [ ] Add `phase5_events.py` with parameterized SELECT-only queries. Add `/api/bridge/phase5-events` and `/api/bridge/phase5-events/{id}` without replacing the old `/api/bridge/events` endpoint. Use distinct response schemas rather than pretending Phase 5 records are old `EventRead` objects.
- [ ] Add frontend tests for a visible limited/unclassified/not-final event, Final event, empty geography, publication-date label, and old-event access. Render a clearly labelled Phase 5 section in Events and use the same Phase 5 read source for its Dashboard map/timeline/list; do not silently combine different sources into one count.
- [ ] Run focused backend/frontend tests, frontend lint/build, and a read-only browser or API check. Stop for owner review.

## Task 5 — Pilot and acceptance

**Approval gate:** Obtain separate owner approval for an exact-ID pilot after identifying the IDs and predicted outcomes. No full run is implied.

- [ ] Select a small pilot spanning Final, not-final core rejection, limited optional rejection, Unclassified, unknown date, and unresolved geography; show identities and expected outcomes first.
- [ ] After approval, execute only the pilot via n8n MCP, deactivate immediately, then verify latest/history rows, visible API output, preserved evidence/reasons, no model calls, no Phase 1–4 changes, and no automatic merge/publish.
- [ ] Stop for owner review. A full baseline run, production readiness, or workflow activation is a later separate decision.

## Handoff

The implementation method is owner-selected: GPT-5.6 Terra executes the tasks after plan approval. The current dirty checkout must be preserved. Update [Current Status](../Current-Status.md) and the [Project Knowledge Log](../Project-Knowledge-Log.md) only when a meaningful checkpoint is complete, then run `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1`.
