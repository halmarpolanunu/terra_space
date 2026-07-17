---
type: Implementation Plan
title: Local Supabase Migration Plan
description: Plan the safe migration of Terra Space data from SQLite to Supabase hosted locally by the owner.
tags: [database, supabase, migration, local-first]
status: planned
okf_version: "0.1"
---

# Local Supabase Migration Plan

## Goal

Move Terra Space from its current SQLite database to Supabase running locally, without losing
documents, events, links, settings, or local attachment references.

## Work to plan before implementation

- Inspect the current database schema, migrations, database volume, and all code that reads or writes data.
- Decide the exact local Supabase deployment, backup location, startup procedure, and how the app connects without exposing data to the internet.
- Map every current table and relationship to PostgreSQL, including documents, events, locations, actors, event types, settings, duplicate-review data, and attachment paths.
- Build a one-time migration that copies SQLite data into an empty local Supabase database and reports counts before and after copying.
- Create a rollback procedure: preserve the original SQLite database unchanged until the owner accepts the migrated result.
- Update backend data access in small, testable steps; do not mix this work with unrelated UI or event-detection changes.
- Verify the complete local workflow with a copy of real data: documents, processing, review, approval, Dashboard, Settings, offline LM Studio behavior, restart persistence, and attachments.

## Acceptance checks

- No application data leaves the owner's computer or local network.
- Each migrated table has matching record counts and valid relationships.
- Existing attachments still open from their local paths.
- The owner can return to the preserved SQLite database if a problem is found.

## Navigation

- [Local Supabase Storage Direction](../decisions/Local-Supabase-Storage-Direction.md)
- [North Star](../North-Star.md)
- [Current Status](../Current-Status.md)
