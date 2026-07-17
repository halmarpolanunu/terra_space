---
type: Decision
title: Local Supabase Storage Direction
description: Terra Space will plan a migration from its current local SQLite storage to a Supabase instance hosted on the owner's computer.
tags: [project-knowledge, decision, database, supabase, local-first]
status: active
okf_version: "0.1"
---

# Context

Terra Space currently stores its data in a local SQLite database. The owner wants to move that
data to Supabase that they host locally. This changes the storage technology, but does not mean
the app should become a cloud service.

# Decision

Plan a migration to a **locally hosted Supabase** instance. Terra Space, its database, files, and
AI processing must remain on the owner's computer and local network unless the owner explicitly
approves a future change.

The migration will be designed and verified before it changes the running app or the owner's
existing data. SQLite remains the live source of truth until a tested migration, rollback path,
and local backup have been accepted.

# Consequences

- The migration needs a clear mapping from the current tables, relationships, and migrations to
  PostgreSQL/Supabase.
- The app must continue to open and allow non-AI work when LM Studio is offline.
- Attachments remain local files; their database references must remain valid after migration.
- Supabase authentication, public internet exposure, multi-user access, and cloud sync are not
  included merely because Supabase is used.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [North Star](../North-Star.md)
- [Local Supabase Migration Plan](../plans/2026-07-17-local-supabase-migration.md)
