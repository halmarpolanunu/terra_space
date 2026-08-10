---
type: Implementation Plan
title: Supabase Cutover and Verification Plan
description: Verify the complete shared Supabase system, preserve rollback material, and request owner approval before activating the new runtime.
tags: [project-knowledge, plan, supabase, cutover, verification]
status: planned
---

# Supabase Cutover and Verification Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove that local Supabase safely serves n8n and Terra Space as one source of truth, then pause for the owner's explicit activation/cutover decision.

**Architecture:** Run a frozen acceptance matrix against the completed schema, inactive workflows, backend, and frontend. Reconcile every test through Phase 1, Phase 2, Phase 3, API, and Dashboard; verify rollback artifacts; then change activation/runtime state only after explicit owner approval.

**Tech Stack:** n8n, local Supabase/PostgreSQL, FastAPI, Next.js, Playwright, PowerShell, Project Knowledge validator.

## Global Constraints

- Prerequisite: all three prior completion gates have passed and their commits are present.
- This plan starts with all four n8n workflows inactive.
- Do not delete legacy Supabase tables or the SQLite archive.
- Do not activate workflows or declare cutover complete without explicit owner confirmation after the evidence report.
- Use normal APIs/workflows for test cleanup; destructive SQL requires separate explicit confirmation.

---

### Task 1: Freeze versions and record the acceptance baseline

**Files:**
- Create: `project-knowledge/plans/evidence/2026-08-10-supabase-cutover/Acceptance-Results.md` with valid OKF frontmatter if durable evidence is needed.

- [ ] Record Git commit, Docker image IDs, Supabase migration list, schema checksum, all four n8n version IDs, validation results, activation states, and SQLite archive checksum.
- [ ] Record zero starting application rows in Phase 1/2/3 mutable tables or identify every retained test row by UUID/title.
- [ ] Confirm PostgreSQL and attachment backups can be listed/read before starting acceptance runs.

### Task 2: Verify pipeline and database traceability

- [ ] Submit one grounded multi-event article through the master editor/test path.
- [ ] Reconcile one `phase1_sources` row and Phase 1 processing run, one Phase 2 latest row plus history, all Phase 3 attempts, and one `phase3_events` row per candidate key.
- [ ] Verify all evidence quotes are exact substrings of `phase1_sources.cleaned_content_text`.
- [ ] Verify `FINAL` rows are published and `EXCEPTION` rows are hidden.
- [ ] Verify unresolved locations remain stored with null coordinates and no candidate disappears.
- [ ] Repeat the same source/candidate processing and prove no duplicate authoritative event and no overwritten human field.

### Task 3: Verify Dashboard authority end to end

- [ ] Open Dashboard and confirm every published event from Task 2 appears immediately in summary, register, filters, timeline, and map/unresolved list as applicable.
- [ ] Edit title, summary, date precision, epistemic status, actor, location, and Event Type on one event; verify `human_modified_at` and exact changed-field names.
- [ ] Rerun Phase 3 for the same candidate and verify all human-edited values remain unchanged while a new audit run is appended.
- [ ] Reject one published event and verify it disappears from all Dashboard views but remains queryable through its detail/review path.
- [ ] Restore it and verify it reappears everywhere.
- [ ] Archive it and verify it is recoverable but excluded from Dashboard.
- [ ] Exercise protected permanent deletion on a disposable manual event and verify its Phase 3 audit history remains intact when applicable.

### Task 4: Verify negative and operational cases

- [ ] Empty source text fails before Phase 1 insertion.
- [ ] An eventless source returns `COMPLETED_NO_CANDIDATE` and creates no Phase 3 rows.
- [ ] Malformed UUIDs fail before database queries in Phase 2 and Phase 3 interactive paths.
- [ ] LM Studio offline leaves Documents, Events, Dashboard, taxonomy, and Settings readable/editable while processing reports unavailable.
- [ ] Stop and restart Terra Space, n8n, and local Supabase; verify all accepted data and attachment references persist.
- [ ] Confirm frontend network traffic remains local and no database credential appears in browser bundles or responses.
- [ ] Run Supabase security/performance advisors and resolve new critical/high findings.

### Task 5: Prove SQLite is no longer live and rollback remains possible

- [ ] Capture the archived SQLite checksum before and after all acceptance runs; values must match.
- [ ] Search runtime configuration, Compose, scripts, and backend startup for active `sqlite:` URLs or `/data/database/terra-space.db` writes. Only explicit legacy rollback documentation/tests may remain.
- [ ] Restore the PostgreSQL backup into an isolated disposable database and reconcile schema plus row counts.
- [ ] Dry-run the documented rollback instructions up to—but not including—changing the live runtime. Confirm the archived SQLite file is readable and the prior Git/workflow versions are identified.

### Task 6: Produce the owner decision report

**Files:**
- Modify: `project-knowledge/Current-Status.md`.
- Modify: `project-knowledge/Project-Knowledge-Log.md`.
- Modify: `project-knowledge/Roadmap.md` only for milestones that passed.
- Modify: the four Supabase plan statuses only when their completion gates pass.

- [ ] Report every acceptance case as pass/fail with execution IDs, source UUIDs, row counts, and test commands.
- [ ] List unresolved warnings separately; do not hide model variability behind workflow success.
- [ ] Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1` and require 0 errors and 0 warnings.
- [ ] Commit the verified cutover evidence while leaving workflows inactive.
- [ ] Ask the owner one direct question: whether to activate `Terra Space - Full News Processing` and switch the application runtime to the verified Supabase configuration.

### Task 7: Apply an approved cutover only after confirmation

- [ ] After explicit approval, create a final pre-cutover PostgreSQL backup and record its checksum.
- [ ] Switch the normal Terra Space runtime environment to the verified Supabase URL.
- [ ] Activate only the master workflow first. Keep phase workflows available internally/manual recovery according to n8n trigger requirements; do not publish unnecessary interactive endpoints.
- [ ] Run one smoke article and one read/edit Dashboard smoke check.
- [ ] If either smoke check fails, deactivate the master and restore the previous runtime configuration using the documented rollback; preserve all diagnostic data.
- [ ] If both pass, record the activation execution, permanent form URL, final version IDs, and next reliability-sampling action.

# Completion gate

The program is complete only after the owner explicitly approves cutover, the master activation and Dashboard smoke checks pass, backups remain restorable, SQLite remains archived, and Project Knowledge accurately records the final live state.

# Navigation

- [Supabase foundation plan](2026-08-10-fresh-supabase-foundation.md)
- [n8n transition plan](2026-08-10-n8n-phase-table-transition.md)
- [Terra Space transition plan](2026-08-10-terra-space-supabase-transition.md)
- [Architecture decision](../decisions/Fresh-Phase-Prefixed-Supabase-Architecture.md)
