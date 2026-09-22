---
type: Plan
title: Phase 5D Deterministic Duplicate Recommendations Implementation Plan
description: Checkpointed plan for strict possible-duplicate recommendations inside the single inactive Phase 5 workflow.
tags: [project-knowledge, plan, phase-5, deduplication]
status: planned
---

# Phase 5D Deterministic Duplicate Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flag only high-evidence possible duplicate Phase 5 event pairs while retaining every event separately.

**Architecture:** A pure JavaScript matcher reads the 5A-5C baseline and emits an explainable
recommendation for each qualifying unordered pair. Additive Phase 5D tables hold latest
recommendations and append-only runs. One small connected group in the existing Phase 5 n8n workflow
persists the output; a pilot and full run each have separate approval gates.

**Tech Stack:** Node.js test runner, local Supabase PostgreSQL, n8n MCP. No model calls.

**Spec:** [Phase 5D Deterministic Duplicate Recommendations](../decisions/Phase-5D-Deterministic-Duplicate-Recommendations.md)

## Global Constraints

- Keep Phase 5A-5E in one n8n workflow in `Terra_Space`.
- Do not modify or execute Phase 1-4.
- Do not merge, delete, hide, publish, or reclassify events.
- Use only actual exact event dates; never use publication-date timeline references as event dates.
- Compare same-article and cross-article pairs by the same rule.
- Keep the workflow inactive except during separately approved executions.
- Use n8n MCP for every n8n edit, validation, run, and status check.
- Get separate owner approval for migration application, workflow edit, pilot execution, and full run.
- Preserve unrelated dirty-worktree changes; durable documentation lives under `project-knowledge/`.

## Review Focus

- Two separate actions from one article must never be recommended merely because article/date match.
- Two records with unknown event dates must not match because publication dates happen to match.
- A shared country or Event Type without a specific shared subject must not qualify.
- Repeating the same run must not create duplicate latest recommendations or duplicate history keys.
- Empty recommendation output must complete normally and leave all 109 events unchanged.

---

### Task 1: Freeze examples and implement the pure matcher

**Files:** Create `tools/n8n/phase5d-deterministic-duplicates.mjs` and
`tools/tests/phase5d-deterministic-duplicates.test.mjs`.

**Interfaces:** Consumes an array of records with event ID, exact date/precision, title, retained
actor names/roles, and Phase 5C resolved event geographies. Produces an array of stable-order
recommendations with pair IDs, date, rule version, title overlap, matched subject signal, and
reason codes.

**Rule v1 constants:** stopwords `a, an, and, at, by, for, from, in, into, of, on, the, to,
with`; generic bare subjects `authorities, government, officials, people, residents`; explicit
action contrasts `propose/proposes` versus `approve/approves`, and `plan/plans` versus
`implement/implements`. Token overlap is computed after stopword removal. These tiny lists are
versioned with the matcher; expanding them is a separate rule review.

- [ ] Read the 31 current same-date pairs without modifying data. Freeze examples for same action,
  distinct actions from one article, unrelated same-day events, unknown dates, and missing subjects.
- [ ] Write tests for: exact-date gate; ≥3 shared meaningful title tokens and Jaccard ≥0.75;
  exact shared non-generic actor/recipient or approved city/admin-1 ID; country/type-only rejection;
  conflicting action-token rejection; stable unordered pair identity; zero-output behavior.
- [ ] Run `node --test tools/tests/phase5d-deterministic-duplicates.test.mjs` and observe the intended
  failures before implementing the matcher.
- [ ] Implement only the tested pure functions. Use a fixed, versioned stopword/generic-subject/
  action-contrast configuration; no embedding, external call, or inferred fact.
- [ ] Rerun focused and existing Phase 5 tests; record counts and inspect every recommendation
  against the frozen examples before any database write.

### Task 2: Add the Phase 5D storage contract and migration artifact

**Files:** Create `supabase/tests/phase5d_duplicate_recommendations.sql` and
`supabase/migrations/202609210001_phase5d_duplicate_recommendations.sql`.

**Interfaces:** The n8n persistence step needs one latest row per unordered pair and append-only
history keyed by stable submission key. Both rows carry pair IDs, exact date, rule version,
explainable signals, `POSSIBLE_DUPLICATE`, and processing time.

- [ ] Write a transaction-wrapped SQL contract that fails while the two Phase 5D tables are absent.
  Include ordered pair uniqueness, valid date/status/score checks, immutable history, retry
  idempotency, service-role access, and Phase 1-5C fingerprint preservation.
- [ ] Run the contract with local `psql -v ON_ERROR_STOP=1` and confirm the expected missing-table
  failure. Do not use the Phase 5C contract's synthetic identity on populated Phase 5C tables.
- [ ] Write an additive migration for `terra_space_phase5_duplicate_recommendations` and
  `terra_space_phase5_duplicate_recommendation_runs`; no existing table is rewritten or deleted.
- [ ] Run the SQL contract inside a rollback transaction after locally staging the migration;
  require zero protected-row changes and zero persistent Phase 5D rows.
- [ ] Stop and request explicit approval before applying this exact migration to live local
  Supabase. After approval, apply via Supabase MCP, rerun read-only schema/advisor checks, and
  confirm both Phase 5D tables are empty.

### Task 3: Add Phase 5D to the existing inactive n8n workflow

**Files:** Modify the credential-free Phase 5 workflow backup under `.n8n-backups/20260910/`;
create `tools/tests/phase5d-workflow-contract.test.mjs` and a focused preparation script under
`tools/`.

**Interfaces:** Consumes Phase 5C completion and current 5A-5C records. Produces Phase 5D
recommendation latest/history writes only. No new workflow or trigger.

- [ ] Write failing workflow-contract tests for: one existing inactive workflow, Phase 5C→5D
  handoff, zero model calls, stable pair ordering, Phase 5D-only writes, zero-output completion,
  and no Phase 5E placeholder.
- [ ] Run the contract and observe the intended missing-5D failure.
- [ ] Prepare the minimal nodes in the existing workflow backup and validate the backup tests.
- [ ] Stop and request explicit approval before using n8n MCP to edit the live workflow.
- [ ] After approval, apply via n8n MCP, validate runtime with zero errors/warnings, verify it
  remains inactive, and verify no Phase 5D data was processed.

### Task 4: Controlled pilot, audit, and full-run gate

**Files:** Update `project-knowledge/Current-Status.md`, `Project-Knowledge-Log.md`, and `Roadmap.md`
only when observed checkpoints change. Keep the exact pilot filter in the workflow backup.

**Interfaces:** Consumes the reviewed Task 1 examples. Produces pilot recommendations and a
decision on readiness for the remaining baseline; it does not start Phase 5E.

- [ ] Choose an exact, small pilot covering at least one high-evidence pair (if one exists), a
  related-but-distinct pair, an unrelated same-day pair, and an unknown-date exclusion. Show IDs,
  expected writes, and zero model calls to the owner.
- [ ] Obtain separate approval to execute the pilot. Temporarily activate the webhook only for
  that run, execute via n8n MCP once, and deactivate immediately even on failure.
- [ ] Audit every pilot pair, exact source signals, history uniqueness, zero upstream changes,
  repeat-run idempotency, and workflow inactivity. Stop for owner review and repairs.
- [ ] Only after explicit pilot acceptance and separate full-run approval, remove the pilot filter,
  process the remaining baseline once, deactivate, audit all results, and stop before Phase 5E.
- [ ] Validate Project Knowledge with `powershell -NoProfile -ExecutionPolicy Bypass -File
  .\tools\Validate-ProjectKnowledge.ps1`; report any warnings.

## Stop condition

Do not treat this plan or the owner's approval of its design as approval to apply the migration,
edit the live workflow, run the pilot, run the full baseline, merge events, or publish events.
