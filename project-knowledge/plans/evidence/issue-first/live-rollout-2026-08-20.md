---
type: Evidence
title: Issue-first live rollout evidence
description: Checkpoint and execution ledger for the owner-approved local rollout.
tags: [project-knowledge, evidence, issue-first, rollout]
status: in-progress
---

# Issue-first live rollout — 2026-08-20

## Pre-rollout checkpoint

- Target: the verified local `supabase_db_local-supabase` PostgreSQL service, database `postgres`.
- Existing Phase 1 sources: **22**.
- Existing Issue-first tables/views: none.
- Issue-first migrations recorded before rollout: none (`202608160001`–`202608160008` all absent).
- Current fallback: `/dashboard` and `/events` are unchanged; no Phase 1–3 data was altered.
- Completed scoped application backup: `data/database-backups/2026-08-20_105757/`.
- Credentials, connection strings, article text, and n8n exports are deliberately not recorded here.

## Migration ledger

| Migration | Applied | Verification |
|---|---:|---|
| `202608160001_issue_first_parallel.sql` | yes | parallel/fallback SQL contract passed |
| `202608160002_issue_first_integrity_upgrade.sql` | yes | forward-upgrade regression passed |
| `202608160003_issue_first_pipeline_contract.sql` | yes | guarded recorder SQL contract passed |
| `202608160004_issue_first_latest_run_views.sql` | yes | latest-run suppression SQL contract passed |
| `202608160005_issue_first_field_grounding.sql` | yes | invented-actor regression passed |
| `202608160006_issue_first_country_reference.sql` | yes | country-pairing regression passed |
| `202608160007_issue_first_country_reference_safety.sql` | yes | Korea/Western Sahara regression passed |
| `202608160008_issue_first_read_projections.sql` | yes | valid-only read projection present |

## Post-migration verification

- All eight migration versions are recorded in the local Supabase migration history.
- Phase 1 source count remains **22**.
- Issue-first runs, visible Issues, visible events, and visible relationships are each **0** before reprocessing.
- Disposable verification: backend schema/upgrade suite **14 passed**; parallel and pipeline SQL contracts passed.

## Reprocessing ledger

Not started. No source article has been reprocessed through the Issue-first path.

## Pipeline handoff

- Created the separate, inactive **Terra Space - Issue-first Analysis** workflow
  (`X4pXtWCkHwjydklX`) with 10 nodes. Existing n8n workflows remain inactive and unchanged.
- Its only Issue-first write is the guarded `terra_space_issue_v2_record_run(jsonb)` database
  function. It never writes Issue, event, relationship, endpoint, or location rows directly.
- Structural validation reported **0 errors**. The five remaining warnings are expected because
  the Code nodes deliberately stop on malformed IDs, missing source text, or invalid model output;
  model/validation failures then become failed diagnostic runs when the recorder is reached.
- Local LM Studio answered its health request (HTTP 200). The n8n API will not remotely test an
  inactive chat-trigger workflow. Keep the workflow inactive; perform the first one-source pilot
  from n8n's manual editor test mode, then inspect the resulting run before any batch action.

## Pilot execution blocker

- The owner approved a temporary activation solely to run the MCP pilot on 2026-08-20.
- `n8n_update_partial_workflow` saved the request but n8n 2.73.0 failed activation internally with
  `Cannot read properties of undefined (reading 'execute')`.
- A fresh metadata read confirms the workflow is still **inactive**. No pilot execution occurred,
  and no Phase 1 or Issue-first analytic data changed.
- Local n8n container logs identify the immediate platform defect: the installed
  `n8n-nodes-opensearch` community package cannot load because `@langchain/classic/agents` is
  missing. The failing package interrupts n8n's workflow-node graph/telemetry code while it saves
  or activates workflows. Repairing or removing that package affects the shared n8n installation
  and therefore requires a separate owner decision.
- Do not work around this by modifying existing workflows or directly writing Issue-first tables.
  Resume only after the local n8n activation defect is corrected or an owner-approved manual test
  path is available.

### OpenSearch package removal, owner-authorized 2026-08-20

- Removed only `/home/node/.n8n/nodes/node_modules/n8n-nodes-opensearch` from the local n8n
  volume, and removed its exact `n8n-nodes-opensearch` registry row from n8n's internal
  `installed_packages` table. A small record of that row and the prior nodes `package.json` were
  saved under n8n's local backups folder before removal.
- Restarted `n8n_local_hp`. It now starts without the prior missing-community-package warning.
- A new MCP activation attempt still fails with the same `reading 'execute'` error. Therefore the
  removed package was not the activation cause. The n8n stack trace places the remaining error in
  its own workflow telemetry node-graph code on n8n 2.32.5, before the Issue-first workflow can
  activate. The workflow is confirmed inactive with **0 executions**; no application or
  Issue-first data changed. Do not upgrade or replace n8n without a separate owner decision.
