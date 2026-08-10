---
type: Evidence
title: n8n Phase-Prefixed Table Transition — Workflow Baselines
description: Rollback pointers and pre-change metadata for the four n8n workflows touched by the n8n Phase-Prefixed Table Transition Implementation Plan.
tags: [project-knowledge, evidence, n8n, supabase]
status: active
okf_version: "0.1"
---

# n8n Phase-Prefixed Table Transition — Workflow Baselines

Task 1 evidence for the
[n8n Phase-Prefixed Table Transition Implementation Plan](../../2026-08-10-n8n-phase-table-transition.md).
The full exported workflow JSON lives outside Git, at `.n8n-backups/20260810/` in the repository
root (git-ignored, since node parameters can carry credential references). This file records where
each backup is and what state it captured, so the plan's checkpoints stay auditable without
committing exported JSON.

## Baseline captured 2026-08-10, before any Task 2+ change

All four workflows were confirmed **inactive** and validated at **0 errors, 0 warnings** immediately
before export. n8n's own workflow-version history reported 0 stored snapshots for all four IDs, so
these exports are the only rollback point.

| Workflow | ID | Nodes | Trigger nodes | `versionId` at export | `versionCounter` | Backup file |
|---|---|---|---|---|---|---|
| Terra Space - Input News Manual | `gABPryH3jTe2Ktz5` | 9 | 2 | `3cd562e2-3f04-4f4e-a6cf-f284dd63802c` | 77 | `.n8n-backups/20260810/gABPryH3jTe2Ktz5_Terra-Space-Input-News-Manual.json` |
| Terra Space - Event Candidates | `pO6m1mpaHz2Ae5ZR` | 21 | 2 | `5d853fdd-4cab-47f8-bfcd-c0079cc56f9c` | 37 | `.n8n-backups/20260810/pO6m1mpaHz2Ae5ZR_Terra-Space-Event-Candidates.json` |
| Terra Space - Event Records | `qsbIodzbMPxgQeRg` | 33 | 3 | `7d124d12-9be0-47c0-98d3-c9d4213a4b83` | 44 | `.n8n-backups/20260810/qsbIodzbMPxgQeRg_Terra-Space-Event-Records.json` |
| Terra Space - Full News Processing | `SwXzUU9aHg4NZ9Kx` | 9 | 1 | `38cb0a40-4711-47d1-aa53-55c87e100432` | 2 | `.n8n-backups/20260810/SwXzUU9aHg4NZ9Kx_Terra-Space-Full-News-Processing.json` |

Each backup file was verified to parse as JSON and to contain the exact node count shown above
before this plan's Task 2 began.

## How to restore from a backup

1. Open the target workflow in the n8n editor.
2. Use n8n's own "Import from File" (or paste the JSON via the API) with the matching file above.
3. Re-run `n8n_validate_workflow` and confirm 0 errors before reactivating anything — these
   workflows must stay inactive throughout this plan regardless of rollback.

## Navigation

- [n8n Phase-Prefixed Table Transition Implementation Plan](../../2026-08-10-n8n-phase-table-transition.md)
- [Project Knowledge](../../../Project-knowledge-Index.md)
