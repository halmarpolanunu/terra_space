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

The owner approved a sequential full reprocessing pass through the separate workflow. It is now
inactive again.

| Source articles processed | Valid Issues | Valid events | Actor relationships | Notes |
|---:|---:|---:|---:|---|
| 22 of 22 | 9 | 35 | 0 | Thirteen articles were withheld by validation; none met the two evidence-backed endpoint-location requirement, so no arc was stored. |

### Full-pass result

- Every source received exactly one new latest Issue-first run; existing Phase 1 articles and all
  fallback data were only read, never modified.
- The 13 unsuccessful latest runs are explicit pipeline validation diagnostics, not candidates for
  manual Issue or event review. Their prior results are correctly hidden by the valid/latest
  views.
- The verified Issues API returned the 9 valid Issue list items and their event details with HTTP
  200. The standalone Issues screen reads that API successfully.

## Pipeline handoff

- Created the separate, inactive **Terra Space - Issue-first Analysis** workflow
  (`X4pXtWCkHwjydklX`) with 9 nodes. Existing n8n workflows remain inactive and unchanged.
- Its only Issue-first write is the guarded `terra_space_issue_v2_record_run(jsonb)` database
  function. It never writes Issue, event, relationship, endpoint, or location rows directly.
- Structural validation reports **0 errors and 0 warnings**.
- Local LM Studio answered its health request (HTTP 200). It needs
  `reasoning_effort: 'none'` for this extraction workflow; otherwise its default reasoning mode
  consumes the response budget without returning the required JSON.

## Pilot result and fixes

- The owner approved temporary MCP activation for the pilot. Its initial activation error was
  caused by HTTP Request node version `4.5`, unsupported by local n8n `2.32.5`; version `4.4` is
  now used. An unused internal input trigger was also removed because it required unconfigured
  workflow inputs.
- The workflow uses one chat trigger only. Its Code nodes return the per-item result format needed
  by this n8n version. The Phase 1 source is fetched with a read-only `SELECT` through the
  dedicated Issue-first PostgreSQL credential, so the old Supabase credential and old workflows
  were not changed.
- The payload normalizer removes an optional Markdown JSON fence only. It never changes generated
  claims; the guarded recorder still rejects any failed JSON, unsupported Issue, or ungrounded
  evidence.
- The final pilot run `45f9ebe6-2de6-44c9-a153-ebbac99b18dd` succeeded at `2026-08-20 12:06
  Asia/Jakarta`; workflow validation reports 0 errors/0 warnings. The workflow was immediately
  returned to **inactive**.

### OpenSearch package removal, owner-authorized 2026-08-20

- Removed only `/home/node/.n8n/nodes/node_modules/n8n-nodes-opensearch` from the local n8n
  volume, and removed its exact `n8n-nodes-opensearch` registry row from n8n's internal
  `installed_packages` table. A small record of that row and the prior nodes `package.json` were
  saved under n8n's local backups folder before removal.
- Restarted `n8n_local_hp`. It now starts without the prior missing-community-package warning.
- The package warning disappeared. It was not the cause of the remaining workflow error; that
  error was later traced to the unsupported HTTP Request node version. No OpenSearch work remains
  in the Issue-first rollout.
