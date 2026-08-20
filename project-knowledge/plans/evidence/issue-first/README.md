---
type: Evidence
title: Issue-first n8n Workflow Baseline and Copy Handoff
description: Safe manual procedure for exporting current n8n workflows and creating inactive Issue-first copies when authenticated n8n access is available.
tags: [project-knowledge, evidence, n8n, issue-first, pipeline]
status: active
okf_version: "0.1"
---

# Issue-first n8n Workflow Baseline and Copy Handoff

## Current checkpoint

This repository does not contain n8n workflow exports. Authenticated local n8n access was used on
2026-08-20 to inspect the current workflow metadata, create one separate Issue-first workflow,
and complete one controlled pilot.
The four existing workflows remain unchanged and inactive. Raw exports remain outside Git because
they can contain credential references.

Before anyone changes a copy, an owner with n8n access must export the currently inactive
workflows and save their files outside Git in a new, date-stamped `.n8n-backups/` folder. Record
each workflow's name, ID, export filename, SHA-256 checksum, active state, version ID, and node
count below. Do not place exports in Git because they can contain credential references.

| Workflow | ID | Export file | SHA-256 | Active state | Version ID | Node count |
|---|---|---|---|---|---|---|
| Terra Space - Input News Manual | `gABPryH3jTe2Ktz5` | pending owner export | pending | inactive | n8n backup API reports none | 11 |
| Terra Space - Event Candidates | `pO6m1mpaHz2Ae5ZR` | pending owner export | pending | inactive | n8n backup API reports none | 21 |
| Terra Space - Event Records | `qsbIodzbMPxgQeRg` | pending owner export | pending | inactive | n8n backup API reports none | 31 |
| Terra Space - Full News Processing | `SwXzUU9aHg4NZ9Kx` | pending owner export | pending | inactive | n8n backup API reports none | 9 |

## Issue-first workflow created for the rollout

| Workflow | ID | Active state | Nodes | Validation |
|---|---|---:|---:|---|
| Terra Space - Issue-first Analysis | `X4pXtWCkHwjydklX` | inactive | 9 | valid: 0 errors, 0 warnings |

It accepts one existing Phase 1 source ID through a chat entry point, reads the article using a
read-only PostgreSQL query, makes one local LM Studio request, and sends only one JSON
payload to the guarded `terra_space_issue_v2_record_run(jsonb)` recorder. It has no direct writes
to Issue, event, relationship, or location tables. The local LM Studio health endpoint returned
HTTP 200 on 2026-08-20.

The workflow was temporarily activated for one MCP-controlled pilot, then returned to inactive.
That pilot produced one valid Issue and four valid events. It configured LM Studio with
`reasoning_effort: 'none'`, required for this loaded Gemma model to return JSON instead of using
the whole response budget on internal reasoning.

## Manual copy procedure

1. In n8n, confirm all four current workflows above are inactive.
2. Export each workflow before editing. Compute and record its SHA-256 checksum and metadata in
   this file.
3. Import the exported files as clearly named **Issue-first** copies. Leave all original
   workflows untouched and inactive.
4. In the copied pipeline, produce this payload for the guarded Supabase RPC:

   ```json
   {
     "source_id": "Phase-1-source UUID",
     "main_issue": {
       "label": "article-level main issue",
       "summary": "short summary",
       "evidence_quote": "exact source quote"
     },
     "events": [
       {
         "title": "event title",
         "evidence_quote": "exact source quote",
         "relationships": [
           {
             "source": {
               "name": "source actor",
               "country_iso3": "ISO alpha-3 country code",
               "country_name": "country wording explicitly stated in the article",
               "admin1": "optional explicitly stated province/state",
               "city_regency": "optional explicitly stated city/regency",
               "evidence_quote": "exact source quote"
             },
             "target": {
               "name": "target actor",
               "country_iso3": "ISO alpha-3 country code",
               "country_name": "country wording explicitly stated in the article",
               "admin1": "optional explicitly stated province/state",
               "city_regency": "optional explicitly stated city/regency",
               "evidence_quote": "exact source quote"
             },
             "evidence_quote": "exact relationship quote"
           }
         ]
       }
     ],
     "raw_output": {},
     "model_name": "local model name",
     "prompt_version": "versioned prompt identifier"
   }
   ```

5. Send that JSON only to `terra_space_issue_v2_record_run`. Preserve the unmodified model
   response in `raw_output`, plus the exact model name and prompt version.
6. Validate every copied workflow in n8n. Keep the copies inactive until a separate disposable
   database test and owner review approve activation.

## Open contract decision

The guarded RPC requires each actor name, country wording, and every supplied admin1/city field
to appear in that endpoint's exact evidence quote. Country wording must also match its ISO code
in the checked-in local country reference. It resolves coordinates only through exact matches in the existing local
`terra_space_phase3_location_gazetteer`: city/regency first, then admin1, then country. Never
send model-generated coordinates or a guessed capital. If either endpoint has no exact local
match, the Issue and event remain valid but the relationship is omitted, so no arc is drawn.
