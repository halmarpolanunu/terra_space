---
type: Setup Guide
title: Terra Space n8n Portable Setup
description: Import and configure the current inactive Terra Space n8n workflows on another local device.
tags: [project-knowledge, n8n, setup, portability]
status: active
---

# Terra Space n8n Portable Setup

## What is included

The package in tools/n8n/portable contains seven current Terra Space workflows:

1. GDELT DOC scheduled collector
2. Phase 1 manual article input
3. Phase 1 article processing
4. Phase 2 main-issue detection
5. Phase 3 event-candidate detection
6. Phase 4 event-fact extraction
7. Phase 5 event generation and qualification

Every export is credential-free and set to inactive. Importing them does not run the pipeline or
copy any event data.

## On the other device

1. Pull the main branch of this repository.
2. Start the local Supabase instance and apply this repository's migrations before importing the
   workflows. The workflows expect the terra_space schema and its Phase 1–5 tables.
3. Start n8n in Docker.
4. From the repository root, check the package:

       powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\n8n\portable\Test-TerraSpaceN8nPackage.ps1

5. Import all seven inactive workflow copies:

       powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\n8n\portable\Import-TerraSpaceN8nWorkflows.ps1

   If that device runs more than one n8n Docker container, provide its name:

       powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\n8n\portable\Import-TerraSpaceN8nWorkflows.ps1 -N8nContainer "your-n8n-container-name"

6. In n8n, move the seven imported workflows into the Terra_Space folder.
7. Create and connect the device's own credentials:
   - One **Supabase API** credential for every workflow's Supabase nodes. Use the other device's
     local Supabase URL and service-role key.
   - One **HTTP Basic Auth** credential for the controlled replay webhook in Phases 2, 3, and 4,
     if those replay webhooks will be used.
8. Start LM Studio on that device before executing Phases 1–5. Their request nodes use
   http://host.docker.internal:1234/v1/chat/completions from inside the n8n container.
9. Validate each workflow in n8n and leave every workflow inactive until you deliberately decide
   to process data.

## What still needs separate transfer

The workflow package does not include credentials, database rows, workflow executions, attachments,
or LM Studio models. These are local to each device. Use the database backup and restore process
when the other device needs the same existing data, rather than an empty fresh database.

## Related knowledge

- [Current Status](Current-Status.md)
- [Fresh Phase-Prefixed Supabase Architecture](decisions/Fresh-Phase-Prefixed-Supabase-Architecture.md)
- [Terra Space n8n Workflow Folder Placement](decisions/Terra-Space-n8n-Workflow-Folder-Placement.md)
- [Project Knowledge](Project-knowledge-Index.md)
